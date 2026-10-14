import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORTFOLIO_ROOT = path.resolve(__dirname, '..');
const FIXTURE_DOCX = path.join(__dirname, 'fixtures/headings_bold_italic.docx');

const CSP_HEADER = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self'; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none';";

describe('Step 7E: Site Interactions & Strict CSP Verification (Playwright)', () => {
  let server;
  let serverUrl;
  let browser;
  let browserContext;
  let page;
  const cspViolations = [];
  const consoleErrors = [];

  before(async () => {
    // 1. Static server injecting the exact Cloudflare Pages _headers rules
    server = http.createServer((req, res) => {
      const safeUrl = new URL(req.url, 'http://localhost').pathname;
      let localPath = path.join(PORTFOLIO_ROOT, safeUrl === '/' ? 'index.html' : safeUrl);

      if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
        const mime = safeUrl.endsWith('.js') ? 'application/javascript'
          : safeUrl.endsWith('.wasm.gz') ? 'application/gzip'
          : safeUrl.endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : safeUrl.endsWith('.png') ? 'image/png'
          : safeUrl.endsWith('.css') ? 'text/css'
          : 'text/html';

        const headers = {
          'Content-Type': mime,
          'Access-Control-Allow-Origin': '*',
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
        };

        if (safeUrl === '/' || safeUrl === '/index.html') {
          headers['Content-Security-Policy'] = CSP_HEADER;
          headers['Cache-Control'] = 'no-cache, must-revalidate';
        } else if (safeUrl.startsWith('/assets/js/')) {
          headers['Cache-Control'] = 'public, max-age=3600, must-revalidate';
        } else if (safeUrl === '/assets/wasm/pandoc.wasm.gz') {
          headers['Cache-Control'] = 'public, max-age=3600, must-revalidate';
        }

        res.writeHead(200, headers);
        fs.createReadStream(localPath).pipe(res);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end(`404: ${safeUrl}`);
      }
    });

    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        serverUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });

    const { chromium } = await import('playwright');
    browser = await chromium.launch({ headless: true });
    browserContext = await browser.newContext({
      permissions: ['clipboard-read', 'clipboard-write'],
    });

    page = await browserContext.newPage();

    page.on('console', (msg) => {
      const text = msg.text();
      if (text.toLowerCase().includes('content security policy') || text.toLowerCase().includes('violates')) {
        cspViolations.push(text);
      }
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });

    page.on('pageerror', (err) => {
      consoleErrors.push(err.message);
    });

    await page.goto(serverUrl, { waitUntil: 'networkidle' });
  });

  after(async () => {
    if (browserContext) await browserContext.close();
    if (browser) await browser.close();
    if (server) await new Promise((resolve) => server.close(resolve));
  });

  it('1. Theme toggle switches data-theme attribute and updates localStorage without CSP errors', async () => {
    const initialTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    await page.click('#themeToggle');
    const firstToggle = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    assert.ok(firstToggle === 'dark' || firstToggle === 'light');
    assert.notEqual(firstToggle, initialTheme);

    // Click again to toggle back
    await page.click('#themeToggle');
    const secondToggle = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    assert.notEqual(secondToggle, firstToggle);
    const storedTheme = await page.evaluate(() => localStorage.getItem('theme'));
    assert.equal(storedTheme, secondToggle);
    assert.equal(cspViolations.length, 0, 'No CSP violations during theme toggling');
  });

  it('2. Mobile menu button toggles nav menu visibility and aria-expanded', async () => {
    await page.setViewportSize({ width: 375, height: 667 });
    const isExpandedBefore = await page.getAttribute('#mobileMenuBtn', 'aria-expanded');
    assert.equal(isExpandedBefore, 'false');

    await page.click('#mobileMenuBtn');
    const isExpandedAfter = await page.getAttribute('#mobileMenuBtn', 'aria-expanded');
    const hasOpenClass = await page.evaluate(() => document.getElementById('navLinks').classList.contains('open'));

    assert.equal(isExpandedAfter, 'true');
    assert.equal(hasOpenClass, true);

    // Clicking a nav link closes the menu
    await page.click('#navLinks a[href="#live-converter"]');
    const isExpandedClosed = await page.getAttribute('#mobileMenuBtn', 'aria-expanded');
    assert.equal(isExpandedClosed, 'false');
    assert.equal(cspViolations.length, 0, 'No CSP violations during mobile navigation');

    // Restore desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  it('3. Showcase tab switcher toggles active preview panels and responds to keyboard arrow keys', async () => {
    const tabs = page.locator('.tab-trigger');
    const tabCount = await tabs.count();
    assert.ok(tabCount >= 2, 'Should have at least 2 showcase tabs');

    // Click second tab
    await tabs.nth(1).click();
    const tab1Active = await tabs.nth(1).getAttribute('aria-selected');
    assert.equal(tab1Active, 'true');

    // Arrow Right key navigates to third tab
    await tabs.nth(1).press('ArrowRight');
    const tab2Active = await tabs.nth(2).getAttribute('aria-selected');
    assert.equal(tab2Active, 'true');
    assert.equal(cspViolations.length, 0, 'No CSP violations during tab switching');
  });

  it('4. Accessible lightbox opens screenshot and closes with Escape key', async () => {
    const trigger = page.locator('.lightbox-trigger').first();
    await trigger.click();

    const isModalActive = await page.evaluate(() => document.getElementById('lightboxModal').classList.contains('active'));
    assert.equal(isModalActive, true, 'Modal should be active after clicking screenshot');

    await page.keyboard.press('Escape');
    const isModalClosed = await page.evaluate(() => document.getElementById('lightboxModal').classList.contains('active'));
    assert.equal(isModalClosed, false, 'Modal should be closed after Escape key');
    assert.equal(cspViolations.length, 0, 'No CSP violations during lightbox interaction');
  });

  it('5. Web Worker and Pandoc WebAssembly instantiate and convert DOCX under strict CSP', async () => {
    const fileInput = page.locator('#docxFileInput');
    await fileInput.setInputFiles(FIXTURE_DOCX);

    // Wait for conversion completion
    await page.waitForFunction(() => {
      const el = document.getElementById('converterOutputArea');
      return el && el.value.length > 50;
    }, { timeout: 30000 });

    const latex = await page.inputValue('#converterOutputArea');
    assert.ok(latex.includes('Heading Level 1'), 'Output contains converted heading');
    assert.equal(cspViolations.length, 0, 'Zero CSP violations occurred during WASM instantiation & conversion');
  });

  it('6. Zero CSP violations or console errors were recorded across entire test run', () => {
    assert.deepEqual(cspViolations, [], `Expected 0 CSP violations, got: ${JSON.stringify(cspViolations)}`);
    assert.deepEqual(consoleErrors, [], `Expected 0 console errors, got: ${JSON.stringify(consoleErrors)}`);
  });
});
