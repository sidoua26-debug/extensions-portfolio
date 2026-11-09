import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon'
};

function createStaticServer() {
  return http.createServer((req, res) => {
    let reqPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (reqPath.endsWith('/')) {
      reqPath += 'index.html';
    }
    const filePath = path.join(rootDir, reqPath);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Security-Policy': "default-src 'self'; script-src 'self' https://plausible.io; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://plausible.io;"
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

async function main() {
  const server = createStaticServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Test server running at ${baseUrl}`);

  const browser = await chromium.launch({ headless: true });

  try {
    // 1. Desktop Tests on Checker Demo
    console.log('Testing Desktop Viewport (1280x800)...');
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      permissions: ['clipboard-read', 'clipboard-write']
    });
    await desktopContext.route('https://plausible.io/**', route => route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: ''
    }));
    const page = await desktopContext.newPage();
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => consoleErrors.push(err.message));

    await page.goto(`${baseUrl}/demos/overleaf-preamble-checker/`, { waitUntil: 'networkidle' });

    // Assert initial elements
    const statusText = await page.locator('#statusBadge').textContent();
    console.log('Initial status:', statusText);
    if (!statusText.includes('Potential Error')) {
      throw new Error(`Expected potential errors in preset 1, got "${statusText}"`);
    }

    // Capture initial desktop screenshot
    await page.screenshot({ path: path.join(rootDir, 'review-shots/overleaf-checker-desktop.png'), fullPage: true });
    console.log('Saved review-shots/overleaf-checker-desktop.png');

    // Test Preset switching to Academic Table
    await page.selectOption('#presetSelect', 'missing-booktabs');
    await page.waitForTimeout(100);
    const tableStatus = await page.locator('#statusBadge').textContent();
    console.log('After choosing missing-booktabs:', tableStatus);
    const tableIssues = await page.locator('.diag-card-title').allTextContents();
    console.log('Issues listed:', tableIssues);
    if (!tableIssues.some(t => t.includes('booktabs'))) {
      throw new Error('Expected booktabs issue to be diagnosed');
    }

    // Test Clear button
    await page.click('#clearBtn');
    await page.waitForTimeout(100);
    const clearedInput = await page.inputValue('#latexInput');
    if (clearedInput !== '') throw new Error('Expected cleared input');

    // Test Reset button
    await page.click('#resetBtn');
    await page.waitForTimeout(100);
    const resetInput = await page.inputValue('#latexInput');
    if (!resetInput.includes('\\tightlist')) throw new Error('Expected reset to restore preset 1');

    // Test Clean State
    await page.selectOption('#presetSelect', 'clean-standalone');
    await page.waitForTimeout(100);
    const cleanStatus = await page.locator('#statusBadge').textContent();
    console.log('Clean preset status:', cleanStatus);
    if (!cleanStatus.includes('Clean')) throw new Error('Expected clean status');

    // Test Copy Master Preamble button
    await page.click('#copyPreambleBtn');
    await page.waitForTimeout(200);
    const copiedBtnText = await page.locator('#copyPreambleBtn').textContent();
    console.log('Copy button text after click:', copiedBtnText);

    // Check console errors
    console.log('Console errors encountered:', consoleErrors);
    if (consoleErrors.length > 0) {
      throw new Error(`Unexpected console errors: ${JSON.stringify(consoleErrors)}`);
    }

    await page.close();
    await desktopContext.close();

    // 2. Mobile Viewport (375x667)
    console.log('Testing Mobile Viewport (375x667)...');
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 667 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
    });
    await mobileContext.route('https://plausible.io/**', route => route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: ''
    }));
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(`${baseUrl}/demos/overleaf-preamble-checker/`, { waitUntil: 'networkidle' });

    // Verify horizontal overflow
    const overflowReport = await mobilePage.evaluate(() => {
      const docWidth = document.documentElement.clientWidth;
      const overflowing = [];
      document.querySelectorAll('*').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.right > docWidth + 1) {
          overflowing.push({
            tag: el.tagName,
            id: el.id,
            className: el.className,
            text: el.innerText ? el.innerText.substring(0, 30) : '',
            right: rect.right,
            docWidth
          });
        }
      });
      return overflowing;
    });
    console.log('Overflowing elements on mobile:', JSON.stringify(overflowReport, null, 2));
    if (overflowReport.length > 0) {
      throw new Error('Mobile page has horizontal overflow!');
    }

    // Capture mobile screenshot
    await mobilePage.screenshot({ path: path.join(rootDir, 'review-shots/overleaf-checker-mobile.png'), fullPage: true });
    console.log('Saved review-shots/overleaf-checker-mobile.png');

    await mobilePage.close();
    await mobileContext.close();

    // 3. Companion Guide Tests
    console.log('Testing Companion Guide on Desktop & Mobile...');
    const guidePage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await guidePage.goto(`${baseUrl}/guides/fix-pandoc-latex-errors-in-overleaf/`, { waitUntil: 'networkidle' });
    await guidePage.screenshot({ path: path.join(rootDir, 'review-shots/overleaf-guide-desktop.png'), fullPage: true });
    console.log('Saved review-shots/overleaf-guide-desktop.png');
    await guidePage.close();

    const guideMobilePage = await browser.newPage({ viewport: { width: 375, height: 667 } });
    await guideMobilePage.goto(`${baseUrl}/guides/fix-pandoc-latex-errors-in-overleaf/`, { waitUntil: 'networkidle' });
    const guideOverflowReport = await guideMobilePage.evaluate(() => {
      const docWidth = document.documentElement.clientWidth;
      const overflowing = [];
      document.querySelectorAll('*').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.right > docWidth + 1) {
          overflowing.push({
            tag: el.tagName,
            id: el.id,
            className: el.className,
            text: el.innerText ? el.innerText.substring(0, 30) : '',
            right: rect.right,
            docWidth
          });
        }
      });
      return overflowing;
    });
    const guideIsOverflow = await guideMobilePage.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    if (guideIsOverflow) throw new Error('Guide mobile page has document horizontal overflow!');
    if (guideOverflowReport.length > 0) throw new Error('Guide mobile page has horizontal overflow elements!');
    await guideMobilePage.screenshot({ path: path.join(rootDir, 'review-shots/overleaf-guide-mobile.png'), fullPage: true });
    console.log('Saved review-shots/overleaf-guide-mobile.png');
    await guideMobilePage.close();

    console.log('All browser verification tests passed successfully!');
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch(err => {
  console.error('Browser test failed:', err);
  process.exit(1);
});
