import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PDFDocument } from 'pdf-lib';
import { parsePageRanges, normalizePageSelection, validatePageSelection } from '../pdf-tools/pageRanges.js';
import { extractPagesText } from './pdfTestUtils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORTFOLIO_ROOT = path.resolve(__dirname, '..');
const FIXTURE_SAMPLE = path.join(__dirname, 'fixtures/sample.pdf');
const FIXTURE_SECRET = path.join(__dirname, 'fixtures/secret.pdf');
const FIXTURE_CORRUPT = path.join(__dirname, 'fixtures/corrupt.pdf');

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.png': 'image/png',
  '.txt': 'text/plain',
  '.pdf': 'application/pdf',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml'
};

function startStaticServer(rootDir) {
  const server = http.createServer((req, res) => {
    const safeUrl = new URL(req.url, 'http://localhost').pathname;
    let localPath = path.join(rootDir, safeUrl === '/' ? 'index.html' : safeUrl);
    if (fs.existsSync(localPath) && fs.statSync(localPath).isDirectory()) {
      localPath = path.join(localPath, 'index.html');
    }

    if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
      const ext = path.extname(localPath).toLowerCase();
      const mime = mimeTypes[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': mime,
        'Access-Control-Allow-Origin': '*',
        'X-Content-Type-Options': 'nosniff'
      });
      fs.createReadStream(localPath).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`404 Not Found: ${safeUrl}`);
    }
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

describe('Audit Finding F1: Strict Page Selection Contract & Parity', () => {
  describe('1. Unit Tests: Strict Selection Contract in pageRanges.js', () => {
    it('accepts valid singleton expressions', () => {
      assert.deepEqual(parsePageRanges('2', 3), [2]);
      assert.deepEqual(parsePageRanges('1', 3), [1]);
      assert.deepEqual(parsePageRanges('3', 3), [3]);
    });

    it('accepts valid comma lists', () => {
      assert.deepEqual(parsePageRanges('1,3', 3), [1, 3]);
      assert.deepEqual(parsePageRanges('3,1', 3), [1, 3]);
      assert.deepEqual(parsePageRanges('2,2', 3), [2]);
    });

    it('accepts valid inclusive ranges', () => {
      assert.deepEqual(parsePageRanges('1-3', 3), [1, 2, 3]);
      assert.deepEqual(parsePageRanges('2-3', 3), [2, 3]);
      assert.deepEqual(parsePageRanges('1-1', 3), [1]);
    });

    it('accepts open-ended suffix and prefix ranges', () => {
      assert.deepEqual(parsePageRanges('2-', 3), [2, 3]);
      assert.deepEqual(parsePageRanges('-2', 3), [1, 2]);
      assert.deepEqual(parsePageRanges('-1', 3), [1]);
      assert.deepEqual(parsePageRanges('1-', 3), [1, 2, 3]);
      assert.deepEqual(parsePageRanges('-3', 3), [1, 2, 3]);
    });

    it('accepts wildcard expression "*"', () => {
      assert.deepEqual(parsePageRanges('*', 3), [1, 2, 3]);
      assert.deepEqual(parsePageRanges(' * ', 5), [1, 2, 3, 4, 5]);
    });

    it('tolerates whitespace around delimiters and tokens', () => {
      assert.deepEqual(parsePageRanges('  1  ,   3  ', 3), [1, 3]);
      assert.deepEqual(parsePageRanges(' 1 - 2 , 3 ', 3), [1, 2, 3]);
      assert.deepEqual(parsePageRanges(' 2 - ', 3), [2, 3]);
    });

    it('deduplicates and sorts pages ascending', () => {
      assert.deepEqual(parsePageRanges('3, 1, 2, 1-3', 3), [1, 2, 3]);
      assert.deepEqual(parsePageRanges('2-, 1', 3), [1, 2, 3]);
    });

    it('rejects malformed numbers and non-integers', () => {
      assert.throws(() => parsePageRanges('2abc', 3), { name: 'PdfCoreError', code: 'INVALID_PAGE_RANGE' });
      assert.throws(() => parsePageRanges('1.5', 3), { name: 'PdfCoreError', code: 'INVALID_PAGE_RANGE' });
      assert.throws(() => parsePageRanges('1e2', 3), { name: 'PdfCoreError', code: 'INVALID_PAGE_RANGE' });
      assert.throws(() => parsePageRanges('0x2', 3), { name: 'PdfCoreError', code: 'INVALID_PAGE_RANGE' });
      assert.throws(() => parsePageRanges('0', 3), { name: 'PdfCoreError', code: 'INVALID_PAGE_RANGE' });
      assert.throws(() => parsePageRanges('-0', 3), { name: 'PdfCoreError', code: 'INVALID_PAGE_RANGE' });
      assert.throws(() => parsePageRanges('1--2', 3), { name: 'PdfCoreError', code: 'INVALID_PAGE_RANGE' });
      assert.throws(() => parsePageRanges('--1', 3), { name: 'PdfCoreError', code: 'INVALID_PAGE_RANGE' });
    });

    it('rejects out-of-bounds page numbers', () => {
      assert.throws(() => parsePageRanges('4', 3), { name: 'PdfCoreError', code: 'INVALID_PAGE_RANGE' });
      assert.throws(() => parsePageRanges('1-4', 3), { name: 'PdfCoreError', code: 'INVALID_PAGE_RANGE' });
      assert.throws(() => parsePageRanges('0-2', 3), { name: 'PdfCoreError', code: 'INVALID_PAGE_RANGE' });
      assert.throws(() => parsePageRanges('4-', 3), { name: 'PdfCoreError', code: 'INVALID_PAGE_RANGE' });
      assert.throws(() => parsePageRanges('-4', 3), { name: 'PdfCoreError', code: 'INVALID_PAGE_RANGE' });
    });

    it('rejects invalid range syntax', () => {
      assert.throws(() => parsePageRanges('1-2-3', 3), { name: 'PdfCoreError', code: 'INVALID_PAGE_RANGE' });
      assert.throws(() => parsePageRanges('3-1', 3), { name: 'PdfCoreError', code: 'INVALID_PAGE_RANGE' });
      assert.throws(() => parsePageRanges('-', 3), { name: 'PdfCoreError', code: 'INVALID_PAGE_RANGE' });
    });

    it('rejects invalid delimiter syntax and whitespace separated tokens', () => {
      assert.throws(() => parsePageRanges('1,,3', 3), { name: 'PdfCoreError', code: 'INVALID_PAGE_RANGE' });
      assert.throws(() => parsePageRanges('1,', 3), { name: 'PdfCoreError', code: 'INVALID_PAGE_RANGE' });
      assert.throws(() => parsePageRanges(',1', 3), { name: 'PdfCoreError', code: 'INVALID_PAGE_RANGE' });
      assert.throws(() => parsePageRanges('1;3', 3), { name: 'PdfCoreError', code: 'INVALID_PAGE_RANGE' });
      assert.throws(() => parsePageRanges('1 3', 3), { name: 'PdfCoreError', code: 'INVALID_PAGE_RANGE' });
      assert.throws(() => parsePageRanges('', 3), { name: 'PdfCoreError', code: 'INVALID_PAGE_RANGE' });
      assert.throws(() => parsePageRanges('   ', 3), { name: 'PdfCoreError', code: 'INVALID_PAGE_RANGE' });
    });

    it('normalizes array selections strictly in normalizePageSelection', () => {
      assert.deepEqual(normalizePageSelection([1, 3], 3), [1, 3]);
      assert.deepEqual(normalizePageSelection(['1', '3'], 3), [1, 3]);
      assert.deepEqual(normalizePageSelection([2, 1], 3), [1, 2]);
      assert.throws(() => normalizePageSelection([], 3), { name: 'PdfCoreError', code: 'INVALID_PAGE_SELECTION' });
      assert.throws(() => normalizePageSelection([0], 3), { name: 'PdfCoreError', code: 'INVALID_PAGE_SELECTION' });
      assert.throws(() => normalizePageSelection([4], 3), { name: 'PdfCoreError', code: 'INVALID_PAGE_SELECTION' });
      assert.throws(() => normalizePageSelection([1.5], 3), { name: 'PdfCoreError', code: 'INVALID_PAGE_SELECTION' });
      assert.throws(() => normalizePageSelection(['abc'], 3), { name: 'PdfCoreError', code: 'INVALID_PAGE_SELECTION' });
    });

    it('validatePageSelection provides consistent result objects', () => {
      const valid = validatePageSelection('1, 3', 3);
      assert.equal(valid.valid, true);
      assert.deepEqual(valid.pages, [1, 3]);
      assert.ok(valid.pageSet.has(1));
      assert.ok(valid.pageSet.has(3));
      assert.ok(!valid.pageSet.has(2));

      const invalid = validatePageSelection('2abc', 3);
      assert.equal(invalid.valid, false);
      assert.equal(invalid.code, 'INVALID_PAGE_RANGE');
      assert.ok(typeof invalid.error === 'string');
    });
  });

  describe('2. Browser UI, Worker Boundary, and Workflow Verification (Playwright)', () => {
    let server;
    let serverUrl;
    let browser;
    let page;
    const pageErrors = [];

    before(async () => {
      const s = await startStaticServer(PORTFOLIO_ROOT);
      server = s.server;
      serverUrl = s.url;

      const { chromium } = await import('playwright');
      browser = await chromium.launch({ headless: true });
      page = await browser.newPage();
      page.on('pageerror', (err) => {
        pageErrors.push(err);
      });
      await page.goto(`${serverUrl}/pdf-tools/`, { waitUntil: 'networkidle' });
    });

    after(async () => {
      if (browser) await browser.close();
      if (server) await new Promise((r) => server.close(r));
    });

    it('starts with neutral unloaded badges, programmatic error associations, and disabled action buttons', async () => {
      // Split subpanel
      await page.click('#subtab-split');
      assert.equal(await page.locator('#split-run').isDisabled(), true);
      const splitBadgeText = await page.locator('#split-range-badge').textContent();
      assert.ok(splitBadgeText.includes('Select document to preview range') || splitBadgeText.includes('Enter range to preview extraction'));
      const splitBadgeClass = await page.locator('#split-range-badge').getAttribute('class');
      assert.ok(splitBadgeClass.includes('badge-neutral'));
      assert.equal(await page.locator('#split-pages').getAttribute('aria-describedby'), 'split-range-badge');
      assert.equal(await page.locator('#split-pages').getAttribute('aria-invalid'), 'false');

      // Rotate subpanel
      await page.click('#subtab-rotate');
      assert.equal(await page.locator('#rotate-run').isDisabled(), true);
      const rotateBadgeText = await page.locator('#rotate-range-badge').textContent();
      assert.ok(rotateBadgeText.includes('Enter pages to rotate (* for all)'));
      const rotateBadgeClass = await page.locator('#rotate-range-badge').getAttribute('class');
      assert.ok(rotateBadgeClass.includes('badge-neutral'));
      assert.equal(await page.locator('#rotate-pages').getAttribute('aria-describedby'), 'rotate-range-badge');
      assert.equal(await page.locator('#rotate-pages').getAttribute('aria-invalid'), 'false');
    });

    it('Split: valid selection "1,3" enables button, shows success badge, and downloads exact 2-page PDF', async () => {
      await page.click('#subtab-split');
      await page.locator('#split-file').setInputFiles(FIXTURE_SAMPLE);

      // Wait for preview load
      await page.waitForFunction(() => {
        const ind = document.getElementById('split-page-indicator')?.textContent ?? '';
        return ind.includes('Page 1 of 3');
      });

      // Enter valid selection "1,3"
      await page.fill('#split-pages', '1,3');

      // Verify badge and aria-invalid
      await page.waitForFunction(() => {
        const badge = document.getElementById('split-range-badge');
        return badge && badge.classList.contains('badge-success') && badge.textContent.includes('included in extract (2 page(s) total)');
      });
      assert.equal(await page.locator('#split-pages').getAttribute('aria-invalid'), 'false');
      assert.equal(await page.locator('#split-run').isEnabled(), true);

      // Trigger export and download
      const downloadPromise = page.waitForEvent('download');
      await page.click('#split-run');
      const download = await downloadPromise;
      const downloadStream = await download.createReadStream();
      const chunks = [];
      for await (const chunk of downloadStream) chunks.push(chunk);
      const downloadedBytes = Buffer.concat(chunks);

      // Inspect downloaded PDF with PDFDocument
      const pdfDoc = await PDFDocument.load(downloadedBytes);
      assert.equal(pdfDoc.getPageCount(), 2, 'Output PDF must have exactly 2 pages');

      // Verify text extraction: Page 1 and 3 present, Page 2 absent
      const extracted = await extractPagesText(downloadedBytes, [1, 2]);
      assert.ok(extracted[1].includes('Fixture Page 1 Portrait'), 'Page 1 text must match original page 1');
      assert.ok(extracted[2].includes('Fixture Page 3 Square'), 'Page 2 text must match original page 3');
      assert.ok(!extracted[1].includes('Fixture Page 2 Landscape'));
      assert.ok(!extracted[2].includes('Fixture Page 2 Landscape'));
    });

    it('Split: malformed selections show badge error, aria-invalid="true", disable button, and fire zero download events', async () => {
      await page.click('#subtab-split');

      let downloadEventFired = false;
      const onDownload = () => { downloadEventFired = true; };
      page.on('download', onDownload);

      const invalidInputs = ['2abc', '1.5', '1-2-3', '4', '-', '1,,3', '3-1', '0'];
      for (const bad of invalidInputs) {
        await page.fill('#split-pages', bad);
        await page.waitForFunction(() => {
          const badge = document.getElementById('split-range-badge');
          return badge && badge.classList.contains('badge-error') && badge.textContent.includes('Invalid page selection');
        });
        assert.equal(await page.locator('#split-run').isDisabled(), true, `Button must be disabled for ${bad}`);
        assert.equal(await page.locator('#split-pages').getAttribute('aria-invalid'), 'true', `aria-invalid must be true for ${bad}`);

        // Substantiate "no download" claim with download-event observation
        downloadEventFired = false;
        await page.evaluate(() => document.getElementById('split-run').click());
        await page.waitForTimeout(100);
        assert.equal(downloadEventFired, false, `No download event must fire for ${bad}`);
      }

      page.off('download', onDownload);
    });

    it('Split: open-ended selection "2-" extracts pages 2 and 3', async () => {
      await page.click('#subtab-split');
      await page.fill('#split-pages', '2-');

      await page.waitForFunction(() => {
        const badge = document.getElementById('split-range-badge');
        return badge && badge.textContent.includes('2 page(s) total');
      });
      assert.equal(await page.locator('#split-run').isEnabled(), true);

      const downloadPromise = page.waitForEvent('download');
      await page.click('#split-run');
      const download = await downloadPromise;
      const downloadStream = await download.createReadStream();
      const chunks = [];
      for await (const chunk of downloadStream) chunks.push(chunk);
      const downloadedBytes = Buffer.concat(chunks);

      const pdfDoc = await PDFDocument.load(downloadedBytes);
      assert.equal(pdfDoc.getPageCount(), 2, 'Output PDF must have exactly 2 pages');

      const extracted = await extractPagesText(downloadedBytes, [1, 2]);
      assert.ok(extracted[1].includes('Fixture Page 2 Landscape'));
      assert.ok(extracted[2].includes('Fixture Page 3 Square'));
    });

    it('Split: handles valid -> invalid -> valid state transitions cleanly and clears error state', async () => {
      await page.click('#subtab-split');

      // Valid "1-2"
      await page.fill('#split-pages', '1-2');
      await page.waitForFunction(() => document.getElementById('split-run').disabled === false);
      let badgeClass = await page.locator('#split-range-badge').getAttribute('class');
      assert.ok(badgeClass.includes('badge-success') || badgeClass.includes('badge-warning'));
      assert.equal(await page.locator('#split-pages').getAttribute('aria-invalid'), 'false');

      // Invalid "1-2-3"
      await page.fill('#split-pages', '1-2-3');
      await page.waitForFunction(() => document.getElementById('split-run').disabled === true);
      badgeClass = await page.locator('#split-range-badge').getAttribute('class');
      assert.ok(badgeClass.includes('badge-error'));
      assert.equal(await page.locator('#split-pages').getAttribute('aria-invalid'), 'true');

      // Corrected to valid "2"
      await page.fill('#split-pages', '2');
      await page.waitForFunction(() => document.getElementById('split-run').disabled === false);
      badgeClass = await page.locator('#split-range-badge').getAttribute('class');
      assert.ok(!badgeClass.includes('badge-error'));
      assert.equal(await page.locator('#split-pages').getAttribute('aria-invalid'), 'false');
    });

    it('Split: replacing a three-page file with a shorter file invalidates an out-of-range selection', async () => {
      await page.click('#subtab-split');
      // Load 3-page file
      await page.locator('#split-file').setInputFiles(FIXTURE_SAMPLE);
      await page.waitForFunction(() => {
        const ind = document.getElementById('split-page-indicator')?.textContent ?? '';
        return ind.includes('Page 1 of 3');
      });

      // Page 3 is valid on 3-page file
      await page.fill('#split-pages', '3');
      await page.waitForFunction(() => document.getElementById('split-run').disabled === false);
      assert.equal(await page.locator('#split-pages').getAttribute('aria-invalid'), 'false');

      // Now replace file with 2-page secret.pdf
      await page.locator('#split-file').setInputFiles(FIXTURE_SECRET);
      await page.waitForFunction(() => {
        const ind = document.getElementById('split-page-indicator')?.textContent ?? '';
        return ind.includes('Page 1 of 2');
      });

      // Selection "3" must now be recognized as out-of-range (> 2)
      await page.waitForFunction(() => {
        const badge = document.getElementById('split-range-badge');
        return badge && badge.classList.contains('badge-error') && badge.textContent.includes('Invalid page selection');
      });
      assert.equal(await page.locator('#split-run').isDisabled(), true);
      assert.equal(await page.locator('#split-pages').getAttribute('aria-invalid'), 'true');

      // Correcting selection to "2" restores validity
      await page.fill('#split-pages', '2');
      await page.waitForFunction(() => document.getElementById('split-run').disabled === false);
      assert.equal(await page.locator('#split-pages').getAttribute('aria-invalid'), 'false');
    });

    it('Split: clearing a file updates validity to neutral and disables button', async () => {
      await page.click('#subtab-split');
      await page.locator('#split-file').setInputFiles(FIXTURE_SAMPLE);
      await page.waitForFunction(() => document.getElementById('split-run').disabled === false);

      // Clear input files
      await page.locator('#split-file').setInputFiles([]);
      await page.waitForFunction(() => document.getElementById('split-run').disabled === true);

      const splitBadgeText = await page.locator('#split-range-badge').textContent();
      assert.ok(splitBadgeText.includes('Select document to preview range') || splitBadgeText.includes('Enter range to preview extraction'));
      const splitBadgeClass = await page.locator('#split-range-badge').getAttribute('class');
      assert.ok(splitBadgeClass.includes('badge-neutral'));
      assert.equal(await page.locator('#split-pages').getAttribute('aria-invalid'), 'false');
    });

    it('Rotate: default "*" shows all pages included, enables button, and rotates preview', async () => {
      await page.click('#subtab-rotate');
      await page.locator('#rotate-file').setInputFiles(FIXTURE_SAMPLE);

      await page.waitForFunction(() => {
        const ind = document.getElementById('rotate-page-indicator')?.textContent ?? '';
        return ind.includes('Page 1 of 3');
      });

      // Default "*"
      await page.waitForFunction(() => {
        const badge = document.getElementById('rotate-range-badge');
        return badge && badge.classList.contains('badge-success') && badge.textContent.includes('included in rotation (3 page(s) total)');
      });
      assert.equal(await page.locator('#rotate-run').isEnabled(), true);
      assert.equal(await page.locator('#rotate-pages').getAttribute('aria-invalid'), 'false');

      // Wrapper visual transform should be rotated 90deg (since select default is 90)
      const transform = await page.evaluate(() => document.getElementById('rotate-canvas-wrapper').style.transform);
      assert.equal(transform, 'rotate(90deg)');
    });

    it('Rotate: malformed inputs ("2abc", "-") show badge error, aria-invalid="true", disable button, and reset transform', async () => {
      await page.click('#subtab-rotate');

      let downloadEventFired = false;
      const onDownload = () => { downloadEventFired = true; };
      page.on('download', onDownload);

      // Bad input "2abc"
      await page.fill('#rotate-pages', '2abc');
      await page.waitForFunction(() => {
        const badge = document.getElementById('rotate-range-badge');
        return badge && badge.classList.contains('badge-error') && badge.textContent.includes('Invalid page selection');
      });
      assert.equal(await page.locator('#rotate-run').isDisabled(), true);
      assert.equal(await page.locator('#rotate-pages').getAttribute('aria-invalid'), 'true');
      let transform = await page.evaluate(() => document.getElementById('rotate-canvas-wrapper').style.transform);
      assert.equal(transform, 'rotate(0deg)');

      // Download observation
      downloadEventFired = false;
      await page.evaluate(() => document.getElementById('rotate-run').click());
      await page.waitForTimeout(100);
      assert.equal(downloadEventFired, false, 'No download event must fire on malformed rotate selection');

      // Bad input "-"
      await page.fill('#rotate-pages', '-');
      await page.waitForFunction(() => {
        const badge = document.getElementById('rotate-range-badge');
        return badge && badge.classList.contains('badge-error');
      });
      assert.equal(await page.locator('#rotate-run').isDisabled(), true);
      assert.equal(await page.locator('#rotate-pages').getAttribute('aria-invalid'), 'true');
      transform = await page.evaluate(() => document.getElementById('rotate-canvas-wrapper').style.transform);
      assert.equal(transform, 'rotate(0deg)');

      page.off('download', onDownload);
    });

    it('Rotate: targeted page rotation ("2", 90°) rotates only page 2 and preserves other pages', async () => {
      await page.click('#subtab-rotate');
      await page.selectOption('#rotate-degrees', '90');
      await page.fill('#rotate-pages', '2');

      // Page 1 should be excluded
      await page.waitForFunction(() => {
        const badge = document.getElementById('rotate-range-badge');
        return badge && badge.classList.contains('badge-warning') && badge.textContent.includes('excluded from rotation (1 page(s) total)');
      });
      assert.equal(await page.locator('#rotate-pages').getAttribute('aria-invalid'), 'false');
      let transform = await page.evaluate(() => document.getElementById('rotate-canvas-wrapper').style.transform);
      assert.equal(transform, 'rotate(0deg)');
      assert.equal(await page.locator('#rotate-run').isEnabled(), true);

      // Navigate to Page 2
      await page.click('#rotate-next-btn');
      await page.waitForFunction(() => {
        const ind = document.getElementById('rotate-page-indicator')?.textContent ?? '';
        return ind.includes('Page 2 of 3');
      });

      // Page 2 should be included
      await page.waitForFunction(() => {
        const badge = document.getElementById('rotate-range-badge');
        return badge && badge.classList.contains('badge-success') && badge.textContent.includes('included in rotation (1 page(s) total)');
      });
      transform = await page.evaluate(() => document.getElementById('rotate-canvas-wrapper').style.transform);
      assert.equal(transform, 'rotate(90deg)');

      // Run rotation and download
      const downloadPromise = page.waitForEvent('download');
      await page.click('#rotate-run');
      const download = await downloadPromise;
      const downloadStream = await download.createReadStream();
      const chunks = [];
      for await (const chunk of downloadStream) chunks.push(chunk);
      const downloadedBytes = Buffer.concat(chunks);

      const pdfDoc = await PDFDocument.load(downloadedBytes);
      assert.equal(pdfDoc.getPageCount(), 3, 'Output PDF must have 3 pages');

      const page1 = pdfDoc.getPage(0);
      const page2 = pdfDoc.getPage(1);
      const page3 = pdfDoc.getPage(2);

      assert.equal(page1.getRotation().angle, 0, 'Page 1 must not be rotated');
      assert.equal(page2.getRotation().angle, 180, 'Page 2 had 90deg original + 90deg relative = 180deg');
      assert.equal(page3.getRotation().angle, 0, 'Page 3 must not be rotated');
    });

    it('Worker boundary: built worker authoritatively rejects malformed split/rotate requests when UI validation is bypassed', async () => {
      const fixtureBytes = Array.from(fs.readFileSync(FIXTURE_SAMPLE));

      // Bypassed Split request with "2abc"
      const splitResult = await page.evaluate(async (rawBytes) => {
        const buf = new Uint8Array(rawBytes).buffer;
        try {
          await window.__pdfStudio.controller.request('split', { file: buf, selection: '2abc' }, { transfer: [buf] });
          return { error: null };
        } catch (err) {
          return { error: { name: err.name, code: err.code, message: err.message } };
        }
      }, fixtureBytes);

      assert.ok(splitResult.error, 'Worker must reject malformed split request');
      assert.equal(splitResult.error.code, 'INVALID_PAGE_RANGE');

      // Bypassed Rotate request with "2abc"
      const rotateResult = await page.evaluate(async (rawBytes) => {
        const buf = new Uint8Array(rawBytes).buffer;
        try {
          const reqs = [{ pages: '2abc', degrees: 90, relative: true }];
          await window.__pdfStudio.controller.request('rotate', { file: buf, requests: reqs }, { transfer: [buf] });
          return { error: null };
        } catch (err) {
          return { error: { name: err.name, code: err.code, message: err.message } };
        }
      }, fixtureBytes);

      assert.ok(rotateResult.error, 'Worker must reject malformed rotate request');
      assert.equal(rotateResult.error.code, 'INVALID_PAGE_RANGE');
    });

    it('Smoke check: Merge operation combines files into single PDF', async () => {
      await page.click('#subtab-merge');
      await page.locator('#merge-files').setInputFiles([FIXTURE_SAMPLE, FIXTURE_SAMPLE]);

      await page.waitForFunction(() => document.getElementById('merge-run').disabled === false);

      const downloadPromise = page.waitForEvent('download');
      await page.click('#merge-run');
      const download = await downloadPromise;
      const downloadStream = await download.createReadStream();
      const chunks = [];
      for await (const chunk of downloadStream) chunks.push(chunk);
      const downloadedBytes = Buffer.concat(chunks);

      const pdfDoc = await PDFDocument.load(downloadedBytes);
      assert.equal(pdfDoc.getPageCount(), 6, 'Merged PDF must have 3+3=6 pages');
    });

    it('Smoke check: Metadata sanitize clears document metadata', async () => {
      await page.click('#tab-metadata');
      await page.locator('#meta-file').setInputFiles(FIXTURE_SAMPLE);

      await page.waitForFunction(() => document.getElementById('meta-run').disabled === false);

      const downloadPromise = page.waitForEvent('download');
      await page.click('#meta-run');
      const download = await downloadPromise;
      const downloadStream = await download.createReadStream();
      const chunks = [];
      for await (const chunk of downloadStream) chunks.push(chunk);
      const downloadedBytes = Buffer.concat(chunks);

      const pdfDoc = await PDFDocument.load(downloadedBytes);
      assert.ok(!pdfDoc.getTitle(), 'Title must be sanitized');
      assert.ok(!pdfDoc.getAuthor(), 'Author must be sanitized');
    });

    it('Smoke check: Redaction draws box and generates rasterized PDF without leaks', async () => {
      await page.click('#tab-redact');
      await page.locator('#redact-file').setInputFiles(FIXTURE_SECRET);

      await page.waitForFunction(() => {
        const text = document.getElementById('redact-page')?.textContent ?? '';
        return text.includes('Page 1 of 2');
      });

      await page.fill('#box-x', '50');
      await page.fill('#box-y', '300');
      await page.fill('#box-w', '200');
      await page.fill('#box-h', '50');
      await page.click('#redact-add-box');

      await page.waitForSelector('#redact-boxes li');

      const downloadPromise = page.waitForEvent('download');
      await page.click('#redact-run');
      const download = await downloadPromise;
      const downloadStream = await download.createReadStream();
      const chunks = [];
      for await (const chunk of downloadStream) chunks.push(chunk);
      const downloadedBytes = Buffer.concat(chunks);

      assert.ok(downloadedBytes.length > 500, 'Downloaded redaction PDF must be non-empty');
      assert.equal(downloadedBytes.slice(0, 5).toString('ascii'), '%PDF-', 'Downloaded file must be a valid PDF');

      // Verify that secret token was permanently destroyed on page 1
      const extracted = await extractPagesText(downloadedBytes, [1, 2]);
      assert.ok(!extracted[1].includes('CONFIDENTIAL_SECRET_TOKEN'), 'Secret token must be destroyed from page 1');
      assert.ok(extracted[2].includes('Second page safe text'), 'Page 2 unredacted text must survive');
    });

    it('Metadata: handles null callback cleanly when clearing input or on invalid PDF', async () => {
      const initialErrorCount = pageErrors.length;
      await page.click('#tab-metadata');

      // 1. Load valid file
      await page.locator('#meta-file').setInputFiles(FIXTURE_SAMPLE);
      await page.waitForFunction(() => document.getElementById('meta-run').disabled === false);
      const rowCountBefore = await page.locator('#meta-table tbody tr').count();
      assert.ok(rowCountBefore > 0, 'Metadata table must show entries for valid PDF');
      assert.equal(await page.locator('#meta-table').isVisible(), true);
      assert.equal(await page.locator('#meta-run').isEnabled(), true);

      // 2. Clear input
      await page.locator('#meta-file').setInputFiles([]);
      await page.waitForFunction(() => document.getElementById('meta-run').disabled === true);
      assert.equal(await page.locator('#meta-run').isDisabled(), true, 'Export button must be disabled when cleared');
      assert.equal(await page.locator('#meta-table').isHidden(), true, 'Metadata table must be hidden when cleared');
      assert.equal(pageErrors.length, initialErrorCount, 'Zero unhandled page errors when clearing file');

      // 3. Upload invalid PDF
      await page.locator('#meta-file').setInputFiles(FIXTURE_CORRUPT);
      await page.waitForFunction(() => {
        const status = document.getElementById('status')?.textContent ?? '';
        return status.includes('could not be read as a PDF') || status.toLowerCase().includes('invalid');
      });
      const statusText = await page.locator('#status').textContent();
      assert.ok(statusText.includes('could not be read as a PDF'), `Actionable error displayed: ${statusText}`);
      assert.equal(await page.locator('#meta-run').isDisabled(), true, 'Export button must remain disabled on invalid PDF');
      assert.equal(await page.locator('#meta-table').isHidden(), true, 'Metadata table must remain hidden on invalid PDF');
      assert.equal(pageErrors.length, initialErrorCount, 'Zero unhandled page errors on invalid PDF');

      // 4. Correct with valid PDF
      await page.locator('#meta-file').setInputFiles(FIXTURE_SAMPLE);
      await page.waitForFunction(() => document.getElementById('meta-run').disabled === false);
      assert.equal(await page.locator('#meta-run').isEnabled(), true, 'Export button must re-enable on valid PDF');
      assert.equal(await page.locator('#meta-table').isVisible(), true, 'Metadata table must be visible again');
      assert.equal(pageErrors.length, initialErrorCount, 'Zero unhandled page errors throughout metadata lifecycle');
    });

    it('Split: pending operation locking, delayed request control, and validity recomputation', async () => {
      await page.click('#tab-merge');
      await page.click('#subtab-split');
      await page.locator('#split-file').setInputFiles(FIXTURE_SAMPLE);
      await page.locator('#split-pages').fill('1,3');
      await page.waitForFunction(() => document.getElementById('split-run').disabled === false);

      // Install request delay hook on controller.request
      await page.evaluate(() => {
        const orig = window.__pdfStudio.controller.request.bind(window.__pdfStudio.controller);
        window.__delayedSplitRequests = [];
        window.__pdfStudio.controller.request = (action, payload, options) => {
          if (action === 'split') {
            return new Promise((resolve, reject) => {
              window.__delayedSplitRequests.push(() => orig(action, payload, options).then(resolve, reject));
            });
          }
          return orig(action, payload, options);
        };
      });

      let downloadCount = 0;
      const downloadHandler = () => { downloadCount++; };
      page.on('download', downloadHandler);

      try {
        // 1. Start valid split with "1,3": export disables and becomes busy
        await page.click('#split-run');
        assert.equal(await page.locator('#split-run').isDisabled(), true, 'Button must disable immediately when busy');
        assert.equal(await page.locator('#split-run').getAttribute('aria-busy'), 'true');

        // 2. While pending, change selection to valid "2": export CANNOT enable
        await page.locator('#split-pages').fill('2');
        assert.equal(await page.locator('#split-run').isDisabled(), true, 'Changing to another valid selection cannot enable button while busy');

        // 3. While pending, change selection to invalid "2abc": export remains disabled, aria-invalid becomes true
        await page.locator('#split-pages').fill('2abc');
        assert.equal(await page.locator('#split-run').isDisabled(), true, 'Button remains disabled on invalid input');
        assert.equal(await page.locator('#split-pages').getAttribute('aria-invalid'), 'true');
        assert.ok((await page.locator('#split-range-badge').getAttribute('class')).includes('badge-error'));

        // 4. Release the original delayed request
        await page.evaluate(() => {
          const req = window.__delayedSplitRequests.shift();
          if (req) req();
        });

        // Wait for original download to complete
        await page.waitForFunction(() => document.getElementById('split-run').getAttribute('aria-busy') === null);
        assert.equal(downloadCount, 1, 'Only one download occurred from original user action');

        // 5. After completion, button MUST REMAIN DISABLED because current selection is "2abc"
        assert.equal(await page.locator('#split-run').isDisabled(), true, 'Button must remain disabled after completion when input is invalid');
        assert.equal(await page.locator('#split-pages').getAttribute('aria-invalid'), 'true');
        assert.ok((await page.locator('#split-range-badge').getAttribute('class')).includes('badge-error'));

        // 6. Correcting input after completion restores normal export
        await page.locator('#split-pages').fill('1');
        assert.equal(await page.locator('#split-run').isEnabled(), true, 'Correcting input after completion restores export button');
        assert.equal(await page.locator('#split-pages').getAttribute('aria-invalid'), 'false');
        assert.ok((await page.locator('#split-range-badge').getAttribute('class')).includes('badge-success'));
      } finally {
        page.off('download', downloadHandler);
        await page.evaluate(() => {
          delete window.__delayedSplitRequests;
        });
      }
    });

    it('Split & Rotate: empty selections remain strictly invalid and keep export disabled', async () => {
      await page.click('#tab-merge');
      await page.click('#subtab-split');
      await page.locator('#split-file').setInputFiles(FIXTURE_SAMPLE);
      await page.locator('#split-pages').fill('   ');
      assert.equal(await page.locator('#split-run').isDisabled(), true, 'Empty split-pages must be disabled');

      await page.click('#subtab-rotate');
      await page.locator('#rotate-file').setInputFiles(FIXTURE_SAMPLE);
      await page.locator('#rotate-pages').fill('   ');
      assert.equal(await page.locator('#rotate-run').isDisabled(), true, 'Empty rotate-pages must be disabled');
    });
  });
});
