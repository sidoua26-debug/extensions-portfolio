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
        } else if (safeUrl === '/assets/js/site.js' || safeUrl === '/assets/css/styles.css') {
          headers['Cache-Control'] = 'no-cache, must-revalidate';
        } else if (safeUrl.startsWith('/assets/js/')) {
          headers['Cache-Control'] = 'public, max-age=3600, must-revalidate';
        } else if (safeUrl.startsWith('/assets/css/')) {
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
      if (msg.type() === 'error' && !text.includes('ERR_NETWORK_CHANGED')) {
        consoleErrors.push(text);
      }
    });

    page.on('pageerror', (err) => {
      if (!err.message.includes('ERR_NETWORK_CHANGED')) {
        consoleErrors.push(err.message);
      }
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

    // Select first tab back to restore active panel
    await tabs.nth(0).click();
    assert.equal(cspViolations.length, 0, 'No CSP violations during tab switching');
  });

  it('4. Accessible lightbox opens screenshot, sets full-size src & alt, traps focus, and closes with Escape & backdrop', async () => {
    const trigger = page.locator('.lightbox-trigger.active, .showcase-img.active.lightbox-trigger, .lightbox-trigger').first();
    const triggerSrc = await trigger.getAttribute('src');
    const triggerAlt = await trigger.getAttribute('alt');

    await trigger.click();

    // 1. Modal is active
    const isModalActive = await page.evaluate(() => document.getElementById('lightboxModal').classList.contains('active'));
    assert.equal(isModalActive, true, 'Modal should be active after clicking screenshot');

    // 2. Full-size image and real alt are displayed
    const modalImgSrc = await page.getAttribute('#lightboxLargeImg', 'src');
    const modalImgAlt = await page.getAttribute('#lightboxLargeImg', 'alt');
    const captionText = await page.textContent('#lightboxCaption');

    assert.equal(modalImgSrc, triggerSrc, 'Modal img src matches clicked screenshot');
    assert.equal(modalImgAlt, triggerAlt, 'Modal img alt matches clicked screenshot');
    assert.equal(captionText, triggerAlt, 'Modal caption text matches real alt text');

    // 3. Focus is trapped inside modal (close button focused)
    const isCloseBtnFocused = await page.evaluate(() => document.activeElement === document.getElementById('lightboxCloseBtn'));
    assert.equal(isCloseBtnFocused, true, 'Close button should receive focus on open');

    // 4. Escape closes modal
    await page.keyboard.press('Escape');
    const isModalClosed = await page.evaluate(() => document.getElementById('lightboxModal').classList.contains('active'));
    assert.equal(isModalClosed, false, 'Modal should be closed after Escape key');

    // 5. Re-open and verify backdrop click closes modal
    await trigger.click();
    assert.equal(await page.evaluate(() => document.getElementById('lightboxModal').classList.contains('active')), true);
    // Click on modal background (outside window)
    await page.click('#lightboxModal', { position: { x: 10, y: 10 } });
    assert.equal(await page.evaluate(() => document.getElementById('lightboxModal').classList.contains('active')), false, 'Modal should close on backdrop click');

    assert.equal(cspViolations.length, 0, 'No CSP violations during lightbox interaction');
  });

  it('4b. Product Preview Modal: clicking Preview on all 5 products opens correct modal with loaded images, thumbnail nav, and closes cleanly', async () => {
    const products = [
      { id: 'word-to-latex', name: 'Word to LaTeX', storePrefix: 'https://microsoftedge.microsoft.com/addons/detail/lpehnpdkdiddlppobkcicdondaebijlf' },
      { id: 'table-extractor', name: 'Table Extractor', storePrefix: 'https://microsoftedge.microsoft.com/addons/detail/pekammppimoaikllkhhebocbkbidoboe' },
      { id: 'bulkgrab', name: 'BulkGrab', storePrefix: 'https://microsoftedge.microsoft.com/addons/detail/cphidoikhnjdkeldgelkpddnkojlfccc' },
      { id: 'seo-inspector', name: 'SEO Inspector', storePrefix: 'https://microsoftedge.microsoft.com/addons/detail/jbnjjkfkcmfkjamakndojbkjanijlfmd' },
      { id: 'bilexi', name: 'Bilexi', storePrefix: 'https://microsoftedge.microsoft.com/addons/detail/mheomahlcfddgjlemnolopfbhojfpmpb' },
    ];

    for (const prod of products) {
      const previewBtn = page.locator(`[data-preview="${prod.id}"]`);
      assert.equal(await previewBtn.isVisible(), true, `Preview button for ${prod.id} should be visible`);

      await previewBtn.click();
      await page.waitForTimeout(100);

      // Verify modal is active
      const isActive = await page.evaluate(() => document.getElementById('lightboxModal').classList.contains('active'));
      assert.equal(isActive, true, `Modal should open when clicking Preview for ${prod.id}`);

      // Verify title matches
      const title = await page.textContent('#previewModalName');
      assert.equal(title, prod.name, `Modal title should match ${prod.name}`);

      // Verify main screenshot image is loaded
      const imgInfo = await page.evaluate(() => {
        const img = document.getElementById('lightboxLargeImg');
        return {
          src: img ? img.src : null,
          complete: img ? img.complete : false,
          naturalWidth: img ? img.naturalWidth : 0,
          naturalHeight: img ? img.naturalHeight : 0,
        };
      });
      assert.ok(imgInfo.src && imgInfo.src.length > 0, `Screenshot src should be non-empty for ${prod.id}`);
      assert.equal(imgInfo.complete, true, `Screenshot should be complete for ${prod.id}`);
      assert.ok(imgInfo.naturalWidth > 0, `Screenshot naturalWidth should be > 0 for ${prod.id}`);

      // Verify store action link
      const storeBtnHref = await page.getAttribute('#previewModalStoreBtn', 'href');
      assert.ok(storeBtnHref.startsWith(prod.storePrefix), `Store button href should match ${prod.id}`);

      // Test gallery thumbnail switching
      const thumbs = page.locator('#previewGalleryStrip .gallery-thumb-btn');
      const thumbCount = await thumbs.count();
      assert.ok(thumbCount >= 3, `Expected at least 3 thumbnails for ${prod.id}, got ${thumbCount}`);

      if (thumbCount > 1) {
        // Click second thumbnail
        await thumbs.nth(1).click();
        await page.waitForTimeout(100);
        const secondImgSrc = await page.getAttribute('#lightboxLargeImg', 'src');
        assert.notEqual(secondImgSrc, imgInfo.src, `Screenshot src should change after clicking thumbnail 2 for ${prod.id}`);

        // Test nav buttons
        await page.click('#previewNavNext');
        await page.waitForTimeout(100);
        await page.click('#previewNavPrev');
        await page.waitForTimeout(100);
      }

      // Close modal using close button
      await page.click('#lightboxCloseBtn');
      await page.waitForTimeout(100);
      const isClosed = await page.evaluate(() => !document.getElementById('lightboxModal').classList.contains('active'));
      assert.equal(isClosed, true, `Modal should close for ${prod.id}`);
    }

    // Verify mobile viewport interaction
    await page.setViewportSize({ width: 390, height: 844 });
    const bilexiBtn = page.locator('[data-preview="bilexi"]');
    await bilexiBtn.click();
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => document.getElementById('lightboxModal').classList.contains('active')), true);

    // Test footer close button on mobile
    await page.click('#previewModalCloseFooter');
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => !document.getElementById('lightboxModal').classList.contains('active')), true);

    // Restore desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    assert.equal(cspViolations.length, 0, 'No CSP violations during complete product preview testing');
  });

  it('5. Live Word-to-LaTeX Converter is positioned above the fold with calm Ready status and hidden file inputs', async () => {
    // 1. Positioned in the hero above the fold
    const converterBox = await page.locator('#live-converter').boundingBox();
    assert.ok(converterBox, 'Live converter element exists on page');
    assert.ok(converterBox.y < 700, `Expected converter Y position above fold (<700), got ${converterBox.y}`);

    // 2. Calm Ready status on load (no spinning circle, solid green dot, informative text)
    const statusStage = await page.textContent('#converterStatusStage');
    const statusMsg = await page.textContent('#converterStatusMessage');
    assert.ok(statusStage.includes('Ready'), `Status stage should be Ready, got: "${statusStage}"`);
    assert.ok(statusMsg.includes('Select or drop a .docx file'), `Status message should prompt for file, got: "${statusMsg}"`);

    const dotVisible = await page.locator('#converterStatusDot').isVisible();
    assert.equal(dotVisible, true, 'Calm status dot is visible');

    const spinnerVisible = await page.locator('#converterStatusSpinner').isVisible();
    assert.equal(spinnerVisible, false, 'Status spinner is hidden on initial load');

    // 3. Raw file input and empty file name tag are hidden
    const fileInputHidden = await page.evaluate(() => {
      const el = document.getElementById('docxFileInput');
      return el && window.getComputedStyle(el).display === 'none';
    });
    assert.equal(fileInputHidden, true, 'docxFileInput has display: none');

    const fileNameHidden = await page.evaluate(() => {
      const el = document.getElementById('converterFileName');
      return el && window.getComputedStyle(el).display === 'none';
    });
    assert.equal(fileNameHidden, true, 'converterFileName tag has display: none');
  });

  it('6. Web Worker and Pandoc WebAssembly instantiate and convert DOCX under strict CSP', async () => {
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

  it('7. Technical SEO verification: 0 broken images, explicit dimensions, <=160 char meta, canonical, hreflang, JSON-LD, 0 insecure links, >15% text ratio', async () => {
    // 1. All images load successfully with naturalWidth > 0 and complete == true
    const imageStatus = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs.map((img, i) => ({
        index: i,
        src: img.getAttribute('src'),
        alt: img.getAttribute('alt'),
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        hasWidthAttr: img.hasAttribute('width'),
        hasHeightAttr: img.hasAttribute('height'),
        widthAttr: img.getAttribute('width'),
        heightAttr: img.getAttribute('height'),
      }));
    });

    assert.ok(imageStatus.length > 0, 'Page contains img elements');
    for (const info of imageStatus) {
      assert.ok(info.src && info.src.trim().length > 0, `Image ${info.index} must have non-empty src`);
      assert.ok(typeof info.alt === 'string' && info.alt.trim().length > 0, `Image ${info.index} (${info.src}) must have non-empty alt text`);
      assert.ok(info.complete, `Image ${info.index} (${info.src}) should be complete`);
      assert.ok(info.naturalWidth > 0, `Image ${info.index} (${info.src}) should have naturalWidth > 0, got ${info.naturalWidth}`);
      assert.ok(info.naturalHeight > 0, `Image ${info.index} (${info.src}) should have naturalHeight > 0, got ${info.naturalHeight}`);
      assert.ok(info.hasWidthAttr, `Image ${info.index} (${info.src}) must have width attribute`);
      assert.ok(info.hasHeightAttr, `Image ${info.index} (${info.src}) must have height attribute`);
    }

    // 2. Meta description is under 160 characters (between 135 and 155)
    const metaDesc = await page.$eval('meta[name="description"]', (el) => el.getAttribute('content'));
    assert.ok(metaDesc, 'Meta description exists');
    assert.ok(metaDesc.length <= 160, `Meta description should be <= 160 chars, got ${metaDesc.length}`);
    assert.ok(metaDesc.length >= 135, `Meta description should be >= 135 chars, got ${metaDesc.length}`);
    assert.ok(metaDesc.toLowerCase().includes('edge'), 'Meta description mentions Edge');
    assert.ok(metaDesc.toLowerCase().includes('word-to-latex'), 'Meta description mentions Word-to-LaTeX');

    // 3. Canonical and hreflang tags
    const canonicalHref = await page.$eval('link[rel="canonical"]', (el) => el.getAttribute('href'));
    assert.equal(canonicalHref, 'https://extensionguy.me/');

    const hreflangEn = await page.$eval('link[rel="alternate"][hreflang="en"]', (el) => el.getAttribute('href'));
    assert.equal(hreflangEn, 'https://extensionguy.me/');

    const hreflangDefault = await page.$eval('link[rel="alternate"][hreflang="x-default"]', (el) => el.getAttribute('href'));
    assert.equal(hreflangDefault, 'https://extensionguy.me/');

    // 4. Zero insecure http:// links
    const insecureLinks = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('a[href], link[href], script[src], img[src]'));
      return elements
        .map((el) => el.getAttribute('href') || el.getAttribute('src'))
        .filter((val) => val && val.startsWith('http://') && !val.includes('localhost') && !val.includes('127.0.0.1'));
    });
    assert.deepEqual(insecureLinks, [], 'Zero insecure http:// links in DOM');

    // 5. JSON-LD Structured Data
    const jsonLdContent = await page.$eval('script[type="application/ld+json"]', (el) => el.textContent);
    assert.ok(jsonLdContent, 'JSON-LD script exists');
    const parsedJsonLd = JSON.parse(jsonLdContent);
    assert.equal(parsedJsonLd['@context'], 'https://schema.org');
    assert.ok(parsedJsonLd['@graph'].some((item) => item['@type'] === 'WebSite'));
    assert.ok(parsedJsonLd['@graph'].some((item) => item['@type'] === 'SoftwareApplication'));

    // 6. Text-to-HTML code ratio > 15% and H1 spacing
    const h1Text = await page.evaluate(() => document.getElementById('heroHeadline').innerHTML);
    assert.ok(h1Text.includes('. <br>') || h1Text.includes('. <br'), 'H1 has a space before <br>');

    const ratioInfo = await page.evaluate(() => {
      const html = document.documentElement.outerHTML;
      // Strip script tags
      const withoutScripts = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      const textOnly = withoutScripts.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      return {
        htmlLength: html.length,
        textLength: textOnly.length,
        ratio: (textOnly.length / html.length) * 100,
      };
    });
    assert.ok(ratioInfo.ratio > 15, `Text-to-HTML ratio should exceed 15%, got ${ratioInfo.ratio.toFixed(2)}%`);
  });

  it('8. Zero CSP violations or console errors were recorded across entire test run', () => {
    assert.deepEqual(cspViolations, [], `Expected 0 CSP violations, got: ${JSON.stringify(cspViolations)}`);
    assert.deepEqual(consoleErrors, [], `Expected 0 console errors, got: ${JSON.stringify(consoleErrors)}`);
  });
});
