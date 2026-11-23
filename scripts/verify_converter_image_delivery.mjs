import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { unzipSync } from 'fflate';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const TARGET_URL = process.env.TARGET_URL || 'https://extensionguy.me';
const FIXTURE_IMAGE_DOCX = path.join(REPO_ROOT, 'tests/fixtures/document_with_image.docx');
const FIXTURE_TEXT_DOCX = path.join(REPO_ROOT, 'tests/fixtures/headings_bold_italic.docx');

const EXPECTED_IMAGE_SHA256 = 'd629e573597835e57202aab346c9db69829b2a9723e116b15c24b68c9ec50de7';
const EXPECTED_IMAGE_SIZE = 1853;

async function safeGoto(page, url, options = {}) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await page.goto(url, { waitUntil: 'networkidle', timeout: 30000, ...options });
    } catch (err) {
      if (attempt < 3 && (err.message.includes('ERR_NETWORK_CHANGED') || err.message.includes('ERR_CONNECTION'))) {
        console.log(`Navigation retry ${attempt} for ${url} after network blip...`);
        await new Promise(r => setTimeout(r, 1500));
        continue;
      }
      throw err;
    }
  }
}

async function run() {
  console.log(`Starting verification against: ${TARGET_URL}`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  // Test on word-to-latex-converter page
  const converterUrl = `${TARGET_URL}/word-to-latex-converter/`;
  console.log(`Navigating to ${converterUrl}...`);
  const resp = await safeGoto(page, converterUrl);
  assert.equal(resp.status(), 200, `Page response should be 200, got ${resp.status()}`);

  // 1. Upload document_with_image.docx
  console.log('Uploading document_with_image.docx...');
  const fileInput = await page.$('#docxFileInput');
  assert.ok(fileInput, '#docxFileInput should exist');
  await fileInput.setInputFiles(FIXTURE_IMAGE_DOCX);

  console.log('Waiting for conversion completion (timeout 300s)...');
  await page.waitForSelector('#converterOutputContainer:not([hidden])', { timeout: 300000 });
  const outputText = await page.$eval('#converterOutputArea', (el) => el.value);

  console.log('Verifying output LaTeX references...');
  assert.ok(outputText.includes('\\includegraphics'), 'LaTeX output should contain \\includegraphics');
  assert.ok(outputText.includes('media/image1.png'), 'LaTeX output should reference media/image1.png');

  // Verify download button says Download .zip
  const downloadText = await page.$eval('#converterDownloadBtn', (btn) => btn.textContent);
  assert.ok(downloadText.includes('Download .zip'), `Download button should say Download .zip, got: ${downloadText}`);

  // Download ZIP
  console.log('Downloading ZIP...');
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    page.click('#converterDownloadBtn'),
  ]);

  const filename = download.suggestedFilename();
  console.log(`Downloaded filename: ${filename}`);
  assert.equal(filename, 'document_with_image.zip', 'Suggested filename should be document_with_image.zip');

  const tmpZip = path.join(os.tmpdir(), `preview_test_${Date.now()}.zip`);
  await download.saveAs(tmpZip);
  const zipBytes = fs.readFileSync(tmpZip);
  fs.unlinkSync(tmpZip);

  // Unzip and inspect
  console.log(`Unzipping archive (${zipBytes.length} bytes)...`);
  const unzipped = unzipSync(new Uint8Array(zipBytes));
  const entries = Object.keys(unzipped);
  console.log('Archive entries:', entries);

  // Verification points:
  assert.ok(entries.includes('document_with_image.tex'), 'document_with_image.tex must be at the archive root');
  const texContent = new TextDecoder().decode(unzipped['document_with_image.tex']);
  console.log('Tex content image reference snippet:', texContent.match(/\\includegraphics.*?\{.*?\}/)?.[0] || 'not found');
  assert.ok(/\\includegraphics(?:\[.*?\])?\{media\/image1\.png\}/.test(texContent), 'Tex file must reference media/image1.png');

  // - Its image reference resolves to the exact ZIP entry.
  assert.ok(entries.includes('media/image1.png'), 'Archive must contain media/image1.png entry matching LaTeX reference');

  // - The embedded image contains the expected bytes.
  const imgBytes = unzipped['media/image1.png'];
  assert.equal(imgBytes.length, EXPECTED_IMAGE_SIZE, `Image bytes should be ${EXPECTED_IMAGE_SIZE}, got ${imgBytes.length}`);
  const imgSha256 = crypto.createHash('sha256').update(imgBytes).digest('hex');
  console.log(`Image SHA256: ${imgSha256}`);
  assert.equal(imgSha256, EXPECTED_IMAGE_SHA256, `Image SHA256 should match expected ${EXPECTED_IMAGE_SHA256}`);

  console.log('✓ Step 1 verified successfully: ZIP contains root .tex and exact image bytes.');

  // 2. Switch to text-only DOCX in the same browser session
  console.log('\nStep 2: Switching to text-only DOCX fixture in the same session...');
  await fileInput.setInputFiles(FIXTURE_TEXT_DOCX);

  await page.waitForSelector('#converterOutputContainer:not([hidden])', { timeout: 60000 });
  const textOutput = await page.$eval('#converterOutputArea', (el) => el.value);

  assert.ok(!textOutput.includes('media/'), 'Text-only output should not reference media/');
  assert.ok(!textOutput.includes('\\includegraphics'), 'Text-only output should not contain \\includegraphics');
  assert.ok(textOutput.includes('Heading Level 1'), 'Text-only output should contain headings');

  const textDownloadText = await page.$eval('#converterDownloadBtn', (btn) => btn.textContent);
  console.log(`Download button text: ${textDownloadText}`);
  assert.ok(textDownloadText.includes('Download .tex'), `Download button should say Download .tex, got: ${textDownloadText}`);

  const [downloadTextDoc] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    page.click('#converterDownloadBtn'),
  ]);

  const textFilename = downloadTextDoc.suggestedFilename();
  console.log(`Downloaded text filename: ${textFilename}`);
  assert.equal(textFilename, 'headings_bold_italic.tex', 'Suggested filename should be headings_bold_italic.tex');

  const tmpTex = path.join(os.tmpdir(), `preview_text_${Date.now()}.tex`);
  await downloadTextDoc.saveAs(tmpTex);
  const downloadedTexContent = fs.readFileSync(tmpTex, 'utf-8');
  fs.unlinkSync(tmpTex);

  assert.ok(downloadedTexContent.includes('Heading Level 1'), 'Downloaded .tex contains heading');
  assert.ok(!downloadedTexContent.includes('media/'), 'Downloaded .tex contains no media references');
  console.log('✓ Step 2 verified successfully: Switching restored plain .tex with zero stale image content.');

  // 3. Confirm development paths return 404
  console.log('\nChecking development paths return HTTP 404...');
  const devPaths = [
    '/.agents/SEO_SKILLS.md',
    '/src/converter/worker.ts',
    '/package.json',
    '/tests/converterUi.test.mjs',
  ];
  for (const p of devPaths) {
    const r = await safeGoto(page, `${TARGET_URL}${p}`);
    assert.equal(r.status(), 404, `Dev path ${p} must return 404, got ${r.status()}`);
    console.log(`Path ${p} -> HTTP ${r.status()}`);
  }
  console.log('✓ Development paths are strictly absent and return 404.');

  await context.close();
  await browser.close();
  console.log('\nAll checks passed successfully!');
}

run().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
