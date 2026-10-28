import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORTFOLIO_ROOT = path.resolve(__dirname, '..');
const FIXTURE_DOCX = path.join(__dirname, 'fixtures/headings_bold_italic.docx');

const CSP_HEADER = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self'; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none';";

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
      if (fs.existsSync(localPath) && fs.statSync(localPath).isDirectory()) {
        localPath = path.join(localPath, 'index.html');
      }

      if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
        const mime = safeUrl.endsWith('.js') ? 'application/javascript'
          : safeUrl.endsWith('.wasm.gz') ? 'application/gzip'
          : safeUrl.endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : safeUrl.endsWith('.png') ? 'image/png'
          : safeUrl.endsWith('.css') ? 'text/css'
          : safeUrl.endsWith('.xml') ? 'application/xml'
          : 'text/html';

        const headers = {
          'Content-Type': mime,
          'Access-Control-Allow-Origin': '*',
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
        };

        if (mime === 'text/html') {
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

  it('1b. Theme toggle displays exactly ONE symbol at a time across routes, updates aria-label dynamically, and has focus outline', async () => {
    const routesToTest = [
      '/',
      '/guides/',
      '/guides/docx-to-latex-offline/',
      '/guides/word-tables-to-latex/',
      '/word-to-latex-converter/',
      '/changelog/',
      '/table-extractor/',
      '/bulkgrab/',
      '/seo-inspector/',
      '/bilexi/',
      '/tab-vault/',
      '/word-to-latex/'
    ];

    for (const route of routesToTest) {
      const testPage = await browserContext.newPage();
      await testPage.goto(`${serverUrl}${route}`, { waitUntil: 'networkidle' });

      // Check toggle exists
      const toggle = testPage.locator('#themeToggle');
      assert.equal(await toggle.count(), 1, `Toggle exists on ${route}`);

      // Helper to count visible SVGs inside toggle
      async function getVisibleSvgCount() {
        return await testPage.evaluate(() => {
          const btn = document.getElementById('themeToggle');
          if (!btn) return 0;
          const svgs = btn.querySelectorAll('svg');
          let visible = 0;
          svgs.forEach(s => {
            const style = window.getComputedStyle(s);
            if (style.display !== 'none' && style.visibility !== 'hidden') {
              visible++;
            }
          });
          return visible;
        });
      }

      // 1. Initial state: exactly 1 icon visible
      const initialVisible = await getVisibleSvgCount();
      assert.equal(initialVisible, 1, `Route ${route} should show exactly 1 theme icon initially`);

      const initialAria = await toggle.getAttribute('aria-label');
      assert.ok(
        initialAria === 'Switch to dark mode' || initialAria === 'Switch to light mode',
        `Route ${route} aria-label should be dynamic, got "${initialAria}"`
      );

      // 2. Toggle theme: click and verify exactly 1 icon visible and inverted aria-label
      await toggle.click();
      const toggledVisible = await getVisibleSvgCount();
      assert.equal(toggledVisible, 1, `Route ${route} should show exactly 1 theme icon after toggle`);

      const toggledAria = await toggle.getAttribute('aria-label');
      assert.notEqual(toggledAria, initialAria, `Route ${route} aria-label should invert after click`);
      assert.ok(
        toggledAria === 'Switch to dark mode' || toggledAria === 'Switch to light mode',
        `Route ${route} new aria-label valid: "${toggledAria}"`
      );

      // 3. Focus state check
      await toggle.focus();
      const hasFocus = await testPage.evaluate(() => document.activeElement && document.activeElement.id === 'themeToggle');
      assert.equal(hasFocus, true, `Route ${route} themeToggle receives keyboard focus`);

      await testPage.close();
    }
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

  it('4b. Product Preview Modal: clicking Preview on all 6 products opens correct modal with loaded images, thumbnail nav, and closes cleanly', async () => {
    const products = [
      { id: 'word-to-latex', name: 'Word to LaTeX', storePrefix: 'https://microsoftedge.microsoft.com/addons/detail/lpehnpdkdiddlppobkcicdondaebijlf' },
      { id: 'table-extractor', name: 'Table Extractor', storePrefix: 'https://microsoftedge.microsoft.com/addons/detail/pekammppimoaikllkhhebocbkbidoboe' },
      { id: 'bulkgrab', name: 'BulkGrab', storePrefix: 'https://microsoftedge.microsoft.com/addons/detail/cphidoikhnjdkeldgelkpddnkojlfccc' },
      { id: 'seo-inspector', name: 'SEO Inspector', storePrefix: 'https://microsoftedge.microsoft.com/addons/detail/jbnjjkfkcmfkjamakndojbkjanijlfmd' },
      { id: 'bilexi', name: 'Bilexi', storePrefix: 'https://microsoftedge.microsoft.com/addons/detail/mheomahlcfddgjlemnolopfbhojfpmpb' },
      { id: 'tab-vault', name: 'Tab Vault', storePrefix: 'https://microsoftedge.microsoft.com/addons/detail/paedfgpjmkmmodbcimbkjkkdlfibfpbc' },
    ];

    for (const prod of products) {
      const previewBtn = page.locator(`[data-preview="${prod.id}"]`);
      assert.equal(await previewBtn.isVisible(), true, `Preview button for ${prod.id} should be visible`);

      await previewBtn.click();
      await page.waitForTimeout(100);

      // Verify modal is active
      const isActive = await page.evaluate(() => document.getElementById('lightboxModal').classList.contains('active'));
      assert.equal(isActive, true, `Modal should open when clicking Preview for ${prod.id}`);

      // Verify title and description are populated from product data without placeholders
      const title = await page.textContent('#previewModalName');
      assert.equal(title, prod.name, `Modal title should match ${prod.name}`);
      assert.notEqual(title, 'Product Name', 'Modal title must not be placeholder text');

      const desc = await page.textContent('#previewModalDesc');
      assert.ok(desc && desc.length > 20, `Modal description should be populated for ${prod.id}`);
      assert.notEqual(desc, 'Product Description', 'Modal description must not be placeholder text');

      const privacyText = await page.textContent('#previewModalPrivacyText');
      assert.ok(privacyText && privacyText.length > 20, `Modal privacy text should be populated for ${prod.id}`);
      assert.notEqual(privacyText, 'Verified Privacy Note', 'Modal privacy note must not be placeholder text');

      // Verify secondary store button is hidden unless product has secondaryInstallUrl
      const secBtnDisplay = await page.evaluate(() => document.getElementById('previewModalFooterSecondary').style.display);
      if (prod.id === 'table-extractor' || prod.id === 'bulkgrab' || prod.id === 'word-to-latex') {
        assert.equal(secBtnDisplay, 'inline-flex', `Secondary store button should be visible for dual-store product ${prod.id}`);
      } else {
        assert.equal(secBtnDisplay, 'none', `Secondary store button should be hidden for single-store product ${prod.id}`);
      }

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
      assert.ok(!imgInfo.src.includes('placeholder-modal.png'), `Screenshot must not be placeholder image for ${prod.id}`);
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

    // 5. Title verification and generator parity
    const homepageTitle = await page.title();
    assert.equal(homepageTitle, 'Browser Extensions & Word to LaTeX — ExtensionGuy', 'Homepage title matches target');
    const generatorContent = fs.readFileSync(path.join(PORTFOLIO_ROOT, 'build_redesign.py'), 'utf-8');
    assert.ok(generatorContent.includes('<title>Browser Extensions &amp; Word to LaTeX — ExtensionGuy</title>'), 'build_redesign.py title matches index.html');

    // 6. JSON-LD Structured Data
    const jsonLdContent = await page.$eval('script[type="application/ld+json"]', (el) => el.textContent);
    assert.ok(jsonLdContent, 'JSON-LD script exists');
    const parsedJsonLd = JSON.parse(jsonLdContent);
    assert.equal(parsedJsonLd['@context'], 'https://schema.org');
    assert.ok(parsedJsonLd['@graph'].some((item) => item['@type'] === 'WebSite'));
    assert.ok(parsedJsonLd['@graph'].some((item) => item['@type'] === 'SoftwareApplication'));

    // Check Bilexi schema in homepage does not contain '100%'
    const bilexiApp = parsedJsonLd['@graph'].find((item) => item['@id'] && item['@id'].includes('bilexi'));
    assert.ok(bilexiApp, 'Bilexi SoftwareApplication exists in homepage schema');
    assert.ok(!bilexiApp.description.includes('100%'), 'Homepage Bilexi description has no 100% absolute claim');
    assert.ok(bilexiApp.description.startsWith('Offline bilingual'), 'Homepage Bilexi description begins with Offline bilingual');

    // Check Bilexi product page JSON-LD description does not contain '100%'
    const bilexiHtml = fs.readFileSync(path.join(PORTFOLIO_ROOT, 'bilexi/index.html'), 'utf-8');
    const bilexiJsonMatch = bilexiHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(bilexiJsonMatch, 'Bilexi page contains JSON-LD block');
    const bilexiProductSchema = JSON.parse(bilexiJsonMatch[1]);
    const bilexiProductApp = bilexiProductSchema['@graph'].find((item) => item['@type'] === 'SoftwareApplication');
    assert.ok(bilexiProductApp, 'Bilexi product page contains SoftwareApplication schema');
    assert.ok(!bilexiProductApp.description.includes('100%'), 'Bilexi product page description has no 100% absolute claim');
    assert.ok(bilexiProductApp.description.startsWith('Offline bilingual'), 'Bilexi product page description begins with Offline bilingual');

    // 7. Sitemap consistency check
    const sitemapXml = fs.readFileSync(path.join(PORTFOLIO_ROOT, 'sitemap.xml'), 'utf-8');
    assert.ok(sitemapXml.includes('<loc>https://extensionguy.me/changelog/</loc>'), 'sitemap.xml includes changelog with trailing slash');
    assert.ok(!sitemapXml.includes('<loc>https://extensionguy.me/changelog</loc>'), 'sitemap.xml does not include non-slash changelog');
    assert.ok(sitemapXml.includes('<loc>https://extensionguy.me/privacy</loc>'), 'sitemap.xml includes privacy without trailing slash');

    // 8. Distinct titles across homepage, online converter, and product page
    const wtlHtml = fs.readFileSync(path.join(PORTFOLIO_ROOT, 'word-to-latex/index.html'), 'utf-8');
    const convHtml = fs.readFileSync(path.join(PORTFOLIO_ROOT, 'word-to-latex-converter/index.html'), 'utf-8');
    const wtlTitleMatch = wtlHtml.match(/<title>(.*?)<\/title>/);
    const convTitleMatch = convHtml.match(/<title>(.*?)<\/title>/);
    assert.ok(wtlTitleMatch && convTitleMatch, 'Both product and converter pages have titles');
    const titles = [homepageTitle, wtlTitleMatch[1], convTitleMatch[1]];
    const uniqueTitles = new Set(titles);
    assert.equal(uniqueTitles.size, 3, 'Homepage, online converter, and Word to LaTeX product have 3 distinct titles');

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

  it('7b. Dedicated landing page /word-to-latex-converter/ passes SEO, Schema, accessibility, and functional conversion', async () => {
    const convPage = await browserContext.newPage();
    convPage.on('console', (msg) => {
      const text = msg.text();
      if (text.toLowerCase().includes('content security policy') || text.toLowerCase().includes('violates')) {
        cspViolations.push(text);
      }
      if (msg.type() === 'error' && !text.includes('ERR_NETWORK_CHANGED')) {
        consoleErrors.push(text);
      }
    });

    await convPage.goto(`${serverUrl}/word-to-latex-converter/`, { waitUntil: 'networkidle' });

    // 1. Title, meta description, and canonical
    const title = await convPage.title();
    assert.ok(title.includes('Convert Word Documents to LaTeX Online'), `Title should match, got: ${title}`);

    const metaDesc = await convPage.$eval('meta[name="description"]', (el) => el.getAttribute('content'));
    assert.ok(metaDesc.length <= 160 && metaDesc.length >= 120, `Meta description should be between 120-160 chars, got ${metaDesc.length}`);

    const canonicalHref = await convPage.$eval('link[rel="canonical"]', (el) => el.getAttribute('href'));
    assert.equal(canonicalHref, 'https://extensionguy.me/word-to-latex-converter/');

    // 2. Structured Data (WebApplication + FAQPage)
    const jsonLdContent = await convPage.$eval('script[type="application/ld+json"]', (el) => el.textContent);
    assert.ok(jsonLdContent, 'JSON-LD script exists');
    const parsedJsonLd = JSON.parse(jsonLdContent);
    const webApp = parsedJsonLd['@graph'].find((item) => item['@type'] === 'WebApplication');
    assert.ok(webApp, 'Has WebApplication structured data');
    assert.equal(webApp.operatingSystem, 'Any', 'WebApplication operatingSystem is Any');
    // Note: G7 mandates zero FAQPage schemas across all pages
    assert.ok(!parsedJsonLd['@graph'].some((item) => item['@type'] === 'FAQPage'), 'Must not have forbidden FAQPage structured data per G7');

    // 3. Functional Conversion on the new page
    const fileInput = await convPage.$('#docxFileInput');
    await fileInput.setInputFiles(FIXTURE_DOCX);

    await convPage.waitForSelector('#converterOutputContainer:not([hidden])', { timeout: 15000 });
    const outputText = await convPage.$eval('#converterOutputArea', (ta) => ta.value);
    assert.ok(outputText.includes('Heading Level 1'), 'Output contains converted heading');
    assert.ok(outputText.includes('\\textbf{Bold Text}'), 'Output contains LaTeX bold tag');

    // 4. Copy and Download actions
    const copyDisabled = await convPage.$eval('#converterCopyBtn', (btn) => btn.disabled);
    const downloadDisabled = await convPage.$eval('#converterDownloadBtn', (btn) => btn.disabled);
    assert.equal(copyDisabled, false, 'Copy button is enabled after conversion');
    assert.equal(downloadDisabled, false, 'Download button is enabled after conversion');

    // 5. Check sample button presence and functioning
    const sampleBtn = convPage.locator('#converterSampleBtn');
    assert.equal(await sampleBtn.count(), 1, 'Sample button exists on /word-to-latex-converter/');
    assert.equal(await sampleBtn.isVisible(), true, 'Sample button is visible on /word-to-latex-converter/');
    assert.equal((await sampleBtn.textContent()).trim(), 'Try with sample .docx');

    // 6. Check sitemap contains /word-to-latex-converter/
    const sitemapContent = fs.readFileSync(path.join(PORTFOLIO_ROOT, 'sitemap.xml'), 'utf-8');
    assert.ok(sitemapContent.includes('https://extensionguy.me/word-to-latex-converter/'), 'sitemap.xml lists word-to-latex-converter');

    await convPage.close();
  });

  it('7c. Guides hub and technical guides load cleanly with HTTP 200, valid single H1, and 3-level breadcrumbs', async () => {
    const guideHrefs = [
      '/guides/',
      '/guides/docx-to-latex-offline/',
      '/guides/word-tables-to-latex/'
    ];

    for (const href of guideHrefs) {
      const guidePage = await browserContext.newPage();
      const response = await guidePage.goto(`${serverUrl}${href}`, { waitUntil: 'networkidle' });
      assert.equal(response.status(), 200, `Guide link ${href} returns HTTP 200`);
      const h1Count = await guidePage.locator('h1').count();
      assert.equal(h1Count, 1, `Guide page ${href} has exactly one H1`);

      if (href !== '/guides/') {
        // Verify 3-level breadcrumb navigation on child guides
        const breadcrumbNav = guidePage.locator('nav[aria-label="Breadcrumb"]');
        assert.equal(await breadcrumbNav.count(), 1, `Breadcrumb nav exists on ${href}`);
        const breadcrumbLinks = breadcrumbNav.locator('a');
        assert.equal(await breadcrumbLinks.count(), 2, `Child guide ${href} has Home and Guides links`);
        const homeLinkText = (await breadcrumbLinks.nth(0).textContent()).trim();
        const guidesLinkText = (await breadcrumbLinks.nth(1).textContent()).trim();
        assert.equal(homeLinkText, 'Home');
        assert.equal(guidesLinkText, 'Guides');
        const guidesLinkHref = await breadcrumbLinks.nth(1).getAttribute('href');
        assert.ok(guidesLinkHref === '../' || guidesLinkHref.includes('/guides'), `Guides link points to hub: ${guidesLinkHref}`);
      } else {
        // Verify Guides Hub cards link to both guides
        const card1 = guidePage.locator('a[href="./docx-to-latex-offline/"]');
        const card2 = guidePage.locator('a[href="./word-tables-to-latex/"]');
        assert.ok(await card1.count() >= 1, 'Guides hub links to docx-to-latex-offline');
        assert.ok(await card2.count() >= 1, 'Guides hub links to word-tables-to-latex');
      }

      await guidePage.close();
    }
  });

  it('7d. Homepage discovers technical guides via navigation and dedicated cards', async () => {
    // 1. Navigation link in header
    const navGuideLink = page.locator('#navLinks a[href="#guides"]');
    assert.equal(await navGuideLink.count(), 1, 'Header navigation contains #guides link');
    assert.equal((await navGuideLink.textContent()).trim(), 'Guides');

    // 2. Footer link
    const footerGuideLink = page.locator('footer a[href="#guides"]');
    assert.equal(await footerGuideLink.count(), 1, 'Footer navigation contains #guides link');

    // 3. Guides section presence and accessibility
    const guidesSection = page.locator('section#guides');
    assert.equal(await guidesSection.count(), 1, '#guides section exists');
    const heading = await page.textContent('#guidesHeading');
    assert.ok(heading.includes('Technical Guides'), 'Section heading contains "Technical Guides"');

    // 4. Guide cards linking to both guide URLs
    const guide1Links = page.locator('#guides a[href="/guides/docx-to-latex-offline/"]');
    const guide2Links = page.locator('#guides a[href="/guides/word-tables-to-latex/"]');
    assert.ok(await guide1Links.count() >= 2, 'DOCX to LaTeX guide has title and CTA links');
    assert.ok(await guide2Links.count() >= 2, 'Word Tables guide has title and CTA links');

    // 5. Section header link to Guides Hub
    const viewAllGuidesLink = page.locator('#guides a[href="/guides/"]');
    assert.equal(await viewAllGuidesLink.count(), 1, 'Technical Guides section contains link to /guides/');
    assert.ok((await viewAllGuidesLink.textContent()).includes('View all guides'), 'Link text includes "View all guides"');
  });

  it('7e. Product pages standard navigation, footers, related extensions, and browser-aware CTAs', async () => {
    const productRoutes = [
      { route: '/table-extractor/', name: 'table-extractor', dualStore: true },
      { route: '/bulkgrab/', name: 'bulkgrab', dualStore: true },
      { route: '/seo-inspector/', name: 'seo-inspector', dualStore: false },
      { route: '/bilexi/', name: 'bilexi', dualStore: false },
      { route: '/tab-vault/', name: 'tab-vault', dualStore: false },
      { route: '/word-to-latex/', name: 'word-to-latex', dualStore: true }
    ];

    for (const prod of productRoutes) {
      const prodPage = await browserContext.newPage();
      const resp = await prodPage.goto(`${serverUrl}${prod.route}`, { waitUntil: 'networkidle' });
      assert.equal(resp.status(), 200, `${prod.route} returned 200`);

      // 1. Navigation Brand and Links
      const brandLink = prodPage.locator('header.navbar a.brand');
      assert.equal(await brandLink.count(), 1, `Brand link exists in header on ${prod.route}`);
      assert.equal(await brandLink.getAttribute('href'), '../', `Brand link points to ../ on ${prod.route}`);

      const requiredNavHrefs = [
        '../#flagship',
        '../#portfolio',
        '../word-to-latex-converter/',
        '../guides/',
        '../#contact',
        '../privacy'
      ];
      for (const nhref of requiredNavHrefs) {
        const link = prodPage.locator(`#navLinks a[href="${nhref}"]`);
        assert.ok(await link.count() >= 1, `Nav link ${nhref} exists on ${prod.route}`);
      }

      // Mobile menu toggle
      const mobileBtn = prodPage.locator('#mobileMenuBtn');
      assert.equal(await mobileBtn.count(), 1, `Mobile menu button exists on ${prod.route}`);
      assert.equal(await mobileBtn.getAttribute('aria-expanded'), 'false', `Mobile menu begins collapsed`);
      await prodPage.setViewportSize({ width: 375, height: 667 });
      await mobileBtn.click();
      assert.equal(await mobileBtn.getAttribute('aria-expanded'), 'true', `Mobile menu expands after click`);
      const navLinksClass = await prodPage.locator('#navLinks').getAttribute('class');
      assert.ok(navLinksClass.includes('open'), `navLinks has open class when expanded on ${prod.route}`);
      await mobileBtn.click();
      assert.equal(await mobileBtn.getAttribute('aria-expanded'), 'false', `Mobile menu collapses after second click`);
      await prodPage.setViewportSize({ width: 1280, height: 800 });

      // 2. Footer Links
      const requiredFooterHrefs = [
        '../',
        '../#portfolio',
        '../word-to-latex-converter/',
        '../guides/',
        '../#contact',
        '../privacy',
        '../changelog/'
      ];
      for (const fhref of requiredFooterHrefs) {
        const link = prodPage.locator(`footer a[href="${fhref}"]`);
        assert.ok(await link.count() >= 1, `Footer link ${fhref} exists on ${prod.route}`);
      }
      const githubLink = prodPage.locator('footer a[href^="https://github.com/"]');
      assert.ok(await githubLink.count() >= 1, `Footer GitHub source link exists on ${prod.route}`);

      // 3. Related Extensions Section
      const relatedSection = prodPage.locator('section[aria-labelledby="relatedHeading"]');
      assert.equal(await relatedSection.count(), 1, `Related extensions section exists on ${prod.route}`);
      const relatedHeading = (await prodPage.locator('#relatedHeading').textContent()).trim();
      assert.equal(relatedHeading, 'More Local-First Extensions', `Related heading is "More Local-First Extensions" on ${prod.route}`);

      // Check cards do not link to self or online converter
      const cardLinks = await relatedSection.locator('h3 a').evaluateAll(nodes => nodes.map(n => n.getAttribute('href')));
      assert.equal(cardLinks.length, 3, `Exactly 3 related extension card links on ${prod.route}`);
      for (const clink of cardLinks) {
        assert.ok(!clink.includes(prod.name), `Related card does not link to self on ${prod.route}: ${clink}`);
        assert.ok(!clink.includes('word-to-latex-converter'), `Related card does not link to converter on ${prod.route}: ${clink}`);
      }

      // 4. Browser-Aware CTAs for table-extractor and bulkgrab
      if (prod.dualStore) {
        const ctaGroups = prodPage.locator('[data-browser-cta-group]');
        assert.ok(await ctaGroups.count() >= 2, `At least 2 dual store CTA groups (hero + bottom) on ${prod.route}`);

        const chromeLinks = prodPage.locator('[data-cta-store="chrome"]');
        const edgeLinks = prodPage.locator('[data-cta-store="edge"]');
        assert.ok(await chromeLinks.count() >= 2, `Chrome store CTAs present on ${prod.route}`);
        assert.ok(await edgeLinks.count() >= 2, `Edge store CTAs present on ${prod.route}`);

        // Verify Chrome store URL
        const chromeHref = await chromeLinks.first().getAttribute('href');
        assert.ok(chromeHref.startsWith('https://chromewebstore.google.com/detail/'), `Chrome href valid on ${prod.route}`);
        // Verify Edge store URL
        const edgeHref = await edgeLinks.first().getAttribute('href');
        assert.ok(edgeHref.startsWith('https://microsoftedge.microsoft.com/addons/detail/'), `Edge href valid on ${prod.route}`);

        // Verify browser CTA adaptation under Chromium: site.js detects Chrome and swaps primary/ghost classes
        const heroGroup = prodPage.locator('[data-browser-cta-group]').first();
        const heroChrome = heroGroup.locator('[data-cta-store="chrome"]');
        const heroEdge = heroGroup.locator('[data-cta-store="edge"]');
        const chromeClass = await heroChrome.getAttribute('class');
        const edgeClass = await heroEdge.getAttribute('class');
        assert.ok(chromeClass.includes('btn-chrome'), `Chrome CTA promoted to btn-chrome on Chromium on ${prod.route}`);
        assert.ok(edgeClass.includes('btn-ghost'), `Edge CTA demoted to btn-ghost on Chromium on ${prod.route}`);
      }

      await prodPage.close();
    }
  });

  it('7f. Browser-aware CTA behavior validates across Edge (Desktop/Android/iOS), Chrome (Desktop/iOS), Fallback (Firefox/Safari), and JS-disabled', async () => {
    const testCases = [
      {
        name: 'Google Chrome Desktop',
        ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        jsEnabled: true,
        expectedPrimary: 'chrome',
        expectedEdgeClass: 'btn-ghost',
        expectedChromeClass: 'btn-chrome'
      },
      {
        name: 'Chrome on iOS (CriOS)',
        ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1',
        jsEnabled: true,
        expectedPrimary: 'chrome',
        expectedEdgeClass: 'btn-ghost',
        expectedChromeClass: 'btn-chrome'
      },
      {
        name: 'Microsoft Edge Desktop (Edg/)',
        ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        jsEnabled: true,
        expectedPrimary: 'edge',
        expectedEdgeClass: 'btn-edge',
        expectedChromeClass: 'btn-ghost'
      },
      {
        name: 'Microsoft Edge on Android (EdgA/)',
        ua: 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 EdgA/120.0.0.0',
        jsEnabled: true,
        expectedPrimary: 'edge',
        expectedEdgeClass: 'btn-edge',
        expectedChromeClass: 'btn-ghost'
      },
      {
        name: 'Microsoft Edge on iOS (EdgiOS/)',
        ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 EdgiOS/120.0.0.0 Mobile/15E148 Safari/605.1.15',
        jsEnabled: true,
        expectedPrimary: 'edge',
        expectedEdgeClass: 'btn-edge',
        expectedChromeClass: 'btn-ghost'
      },
      {
        name: 'Fallback Firefox',
        ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
        jsEnabled: true,
        expectedPrimary: 'edge',
        expectedEdgeClass: 'btn-edge',
        expectedChromeClass: 'btn-ghost'
      },
      {
        name: 'Fallback Safari',
        ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        jsEnabled: true,
        expectedPrimary: 'edge',
        expectedEdgeClass: 'btn-edge',
        expectedChromeClass: 'btn-ghost'
      },
      {
        name: 'JavaScript Disabled (HTML baseline)',
        ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        jsEnabled: false,
        expectedPrimary: 'edge',
        expectedEdgeClass: 'btn-edge',
        expectedChromeClass: 'btn-ghost'
      }
    ];

    for (const tc of testCases) {
      const customContext = await browser.newContext({
        userAgent: tc.ua,
        javaScriptEnabled: tc.jsEnabled
      });
      const customPage = await customContext.newPage();

      for (const route of ['/table-extractor/', '/bulkgrab/', '/word-to-latex/']) {
        await customPage.goto(`${serverUrl}${route}`, { waitUntil: 'networkidle' });

        const heroGroup = customPage.locator('[data-browser-cta-group]').first();
        const chromeBtn = heroGroup.locator('[data-cta-store="chrome"]');
        const edgeBtn = heroGroup.locator('[data-cta-store="edge"]');

        // Both store destinations must exist and have working links
        assert.equal(await chromeBtn.count(), 1, `Chrome store button exists on ${route} under ${tc.name}`);
        assert.equal(await edgeBtn.count(), 1, `Edge store button exists on ${route} under ${tc.name}`);

        const chromeClass = await chromeBtn.getAttribute('class');
        const edgeClass = await edgeBtn.getAttribute('class');

        assert.ok(
          chromeClass.includes(tc.expectedChromeClass),
          `Expected Chrome button on ${route} under ${tc.name} to have ${tc.expectedChromeClass}, got: ${chromeClass}`
        );
        assert.ok(
          edgeClass.includes(tc.expectedEdgeClass),
          `Expected Edge button on ${route} under ${tc.name} to have ${tc.expectedEdgeClass}, got: ${edgeClass}`
        );

        // Verify order in DOM
        const buttons = heroGroup.locator('a[data-cta-store]');
        const firstStore = await buttons.nth(0).getAttribute('data-cta-store');
        assert.equal(firstStore, tc.expectedPrimary, `Expected ${tc.expectedPrimary} button first on ${route} under ${tc.name}`);

        // Verify navbar CTA behavior
        const navCta = customPage.locator('.nav-actions [data-nav-cta]');
        if (await navCta.count() > 0) {
          const navText = (await navCta.textContent()).trim();
          const navHref = await navCta.getAttribute('href');
          if (tc.expectedPrimary === 'chrome') {
            assert.ok(navText.includes('Chrome'), `Nav CTA shows Chrome for ${tc.name} on ${route}`);
            assert.ok(navHref.includes('chromewebstore.google.com'), `Nav CTA links to Chrome Web Store for ${tc.name} on ${route}`);
          } else {
            assert.ok(navText.includes('Edge'), `Nav CTA remains Edge for ${tc.name} on ${route}`);
            assert.ok(navHref.includes('microsoftedge.microsoft.com'), `Nav CTA links to Edge for ${tc.name} on ${route}`);
          }
        }
      }

      await customContext.close();
    }
  });

  it('8. Zero CSP violations or console errors were recorded across entire test run', () => {
    assert.deepEqual(cspViolations, [], `Expected 0 CSP violations, got: ${JSON.stringify(cspViolations)}`);
    assert.deepEqual(consoleErrors, [], `Expected 0 console errors, got: ${JSON.stringify(consoleErrors)}`);
  });
});
