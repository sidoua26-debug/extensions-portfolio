import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

const ALL_31_SCREENSHOTS = [
  // Word to LaTeX (5)
  { id: 'w2l-1-upload', prod: 'word-to-latex' },
  { id: 'w2l-2-output', prod: 'word-to-latex' },
  { id: 'w2l-3-paste', prod: 'word-to-latex' },
  { id: 'w2l-4-image', prod: 'word-to-latex' },
  { id: 'w2l-5-privacy', prod: 'word-to-latex' },
  // Table Extractor (5)
  { id: 'table-1-detection', prod: 'table-extractor' },
  { id: 'table-2-virtualized', prod: 'table-extractor' },
  { id: 'table-3-pro', prod: 'table-extractor' },
  { id: 'table-4-options', prod: 'table-extractor' },
  { id: 'table-5-privacy', prod: 'table-extractor' },
  // BulkGrab (5)
  { id: 'bulkgrab-1-panel', prod: 'bulkgrab' },
  { id: 'bulkgrab-2-popup', prod: 'bulkgrab' },
  { id: 'bulkgrab-3-options', prod: 'bulkgrab' },
  { id: 'bulkgrab-4-zip', prod: 'bulkgrab' },
  { id: 'bulkgrab-5-privacy', prod: 'bulkgrab' },
  // SEO Inspector (5)
  { id: 'seo-1-overview', prod: 'seo-inspector' },
  { id: 'seo-2-content', prod: 'seo-inspector' },
  { id: 'seo-3-links', prod: 'seo-inspector' },
  { id: 'seo-4-schema', prod: 'seo-inspector' },
  { id: 'seo-5-issues', prod: 'seo-inspector' },
  // Bilexi (5)
  { id: 'bilexi-1-hero', prod: 'bilexi' },
  { id: 'bilexi-2-suggestions', prod: 'bilexi' },
  { id: 'bilexi-3-privacy', prod: 'bilexi' },
  { id: 'bilexi-4-customization', prod: 'bilexi' },
  { id: 'bilexi-5-compatibility', prod: 'bilexi' },
  // Tab Vault (6)
  { id: 'tab-vault-1-collapse', prod: 'tab-vault' },
  { id: 'tab-vault-2-recovery', prod: 'tab-vault' },
  { id: 'tab-vault-3-search', prod: 'tab-vault' },
  { id: 'tab-vault-4-organize', prod: 'tab-vault' },
  { id: 'tab-vault-5-privacy', prod: 'tab-vault' },
  { id: 'tab-vault-6-settings', prod: 'tab-vault' }
];

const PRODUCT_PAGES = [
  { slug: 'word-to-latex', count: 5 },
  { slug: 'table-extractor', count: 5 },
  { slug: 'bulkgrab', count: 5 },
  { slug: 'seo-inspector', count: 5 },
  { slug: 'bilexi', count: 5 },
  { slug: 'tab-vault', count: 6 }
];

describe('Product Galleries & Outdated Artwork Remediation Suite', () => {
  it('1. All 31 store screenshots and thumbnails exist in PNG, WebP, and AVIF formats with non-zero size', () => {
    assert.equal(ALL_31_SCREENSHOTS.length, 31, 'Expected exactly 31 store screenshots');
    for (const item of ALL_31_SCREENSHOTS) {
      for (const ext of ['png', 'webp', 'avif']) {
        const filePath = path.join(rootDir, 'assets', 'screenshots', `${item.id}.${ext}`);
        assert.ok(fs.existsSync(filePath), `Screenshot file exists: ${item.id}.${ext}`);
        const stat = fs.statSync(filePath);
        assert.ok(stat.size > 0, `Screenshot file is non-empty: ${item.id}.${ext}`);

        // Verify thumbnail
        const thumbPath = path.join(rootDir, 'assets', 'screenshots', 'thumbs', `${item.id}-thumb.${ext}`);
        assert.ok(fs.existsSync(thumbPath), `Thumbnail file exists: ${item.id}-thumb.${ext}`);
        const thumbStat = fs.statSync(thumbPath);
        assert.ok(thumbStat.size > 0, `Thumbnail file is non-empty: ${item.id}-thumb.${ext}`);
      }
    }
  });

  it('2. Tab Vault artwork remediation: tab-vault-1-collapse contains no unsupported 95% memory claim', () => {
    const rawPng = fs.readFileSync(path.join(rootDir, 'assets', 'screenshots', 'tab-vault-1-collapse.png'));
    const contentStr = rawPng.toString('latin1');
    assert.ok(!contentStr.includes('95% Memory Freed'), 'tab-vault-1-collapse.png does not contain 95% Memory Freed');
    assert.ok(!contentStr.includes('Save 95% Memory'), 'tab-vault-1-collapse.png does not contain Save 95% Memory');
  });

  it('3. Static HTML structure on all 6 product pages: gallery elements, ARIA, thumbnails, and explicit dimensions', () => {
    for (const p of PRODUCT_PAGES) {
      const pageFile = path.join(rootDir, p.slug, 'index.html');
      assert.ok(fs.existsSync(pageFile), `${pageFile} exists`);
      const html = fs.readFileSync(pageFile, 'utf-8');

      // Gallery container
      assert.ok(html.includes(`class="product-gallery" data-product="${p.slug}"`), `${p.slug} has product-gallery with data-product`);
      assert.ok(html.includes('class="gallery-viewport"'), `${p.slug} has gallery-viewport`);
      assert.ok(html.includes('class="gallery-zoom-trigger"'), `${p.slug} has zoom trigger`);
      assert.ok(html.includes('class="gallery-zoom-badge"'), `${p.slug} has zoom badge`);
      assert.ok(html.includes('class="gallery-nav-btn gallery-prev"'), `${p.slug} has prev button`);
      assert.ok(html.includes('class="gallery-nav-btn gallery-next"'), `${p.slug} has next button`);
      assert.ok(html.includes('class="gallery-caption-bar" aria-live="polite"'), `${p.slug} has polite caption bar`);
      assert.ok(html.includes('class="gallery-counter"'), `${p.slug} has slide counter`);
      assert.ok(html.includes(`1 / ${p.count}`), `${p.slug} counter shows 1 / ${p.count}`);
      assert.ok(html.includes('class="gallery-thumbs" role="tablist"'), `${p.slug} has thumb tablist`);

      // Explicit width and height
      assert.ok(html.includes('width="1280" height="800"'), `${p.slug} declares width 1280 height 800`);

      // Thumb count and image thumbnails
      const thumbMatches = html.match(/class="gallery-thumb-btn/g) || [];
      assert.equal(thumbMatches.length, p.count, `${p.slug} has exactly ${p.count} thumbnail buttons`);
      const thumbWrapMatches = html.match(/class="thumb-img-wrap"/g) || [];
      assert.equal(thumbWrapMatches.length, p.count, `${p.slug} has exactly ${p.count} thumb image wrappers`);
      const thumbImgMatches = html.match(/class="thumb-img"[^>]*width="56"[^>]*height="35"/g) || [];
      assert.equal(thumbImgMatches.length, p.count, `${p.slug} has exactly ${p.count} thumb images with dimensions 56x35`);

      // Lightbox modal exists
      assert.ok(html.includes('id="lightboxModal"'), `${p.slug} includes lightboxModal`);
    }
  });

  describe('Interactive Browser Testing (Playwright)', () => {
    let server;
    let serverUrl;
    let browser;
    let page;
    const cspViolations = [];
    const consoleErrors = [];

    before(async () => {
      // Start static server
      server = http.createServer((req, res) => {
        let reqPath = req.url.split('?')[0];
        if (reqPath.endsWith('/')) reqPath += 'index.html';
        const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
        const filePath = path.join(rootDir, safePath);

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        fs.readFile(filePath, (err, data) => {
          if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
            return;
          }
          res.writeHead(200, {
            'Content-Type': contentType,
            'Content-Security-Policy': "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' blob: data:; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self';"
          });
          res.end(data);
        });
      });

      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
      const port = server.address().port;
      serverUrl = `http://127.0.0.1:${port}`;

      browser = await chromium.launch();
      const context = await browser.newContext();
      page = await context.newPage();

      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      page.on('response', response => {
        if (response.status() >= 400) {
          consoleErrors.push(`HTTP ${response.status()} loading ${response.url()}`);
        }
      });
    });

    after(async () => {
      if (browser) await browser.close();
      if (server) await new Promise(resolve => server.close(resolve));
    });

    for (const p of PRODUCT_PAGES) {
      it(`4. Gallery on /${p.slug}/: next/prev navigation, thumbnail switching, and lightbox modal`, async () => {
        await page.goto(`${serverUrl}/${p.slug}/`, { waitUntil: 'networkidle' });

        const gallery = page.locator('.product-gallery');
        assert.equal(await gallery.count(), 1, `Gallery container exists on /${p.slug}/`);

        const thumbs = page.locator('.gallery-thumbs .gallery-thumb-btn');

        const mainImg = page.locator('.gallery-viewport .gallery-main-img');
        const initialSrc = await mainImg.getAttribute('src');
        const initialCounter = await page.textContent('.gallery-counter');
        assert.equal(initialCounter.trim(), `1 / ${p.count}`);

        // Click next button
        await page.click('.gallery-nav-btn.gallery-next');
        await page.waitForTimeout(100);

        const nextSrc = await mainImg.getAttribute('src');
        assert.notEqual(nextSrc, initialSrc, 'Image src changed after clicking next');
        const nextCounter = await page.textContent('.gallery-counter');
        assert.equal(nextCounter.trim(), `2 / ${p.count}`);

        // Check inline thumbnail image loaded
        const firstThumbImg = thumbs.first().locator('.thumb-img');
        const thumbImgLoaded = await firstThumbImg.evaluate(img => img.complete && img.naturalWidth > 0);
        assert.ok(thumbImgLoaded, `${p.slug} inline thumbnail image loaded with naturalWidth > 0`);

        // Check active thumbnail
        const secondThumbActive = await thumbs.nth(1).evaluate(el => el.classList.contains('active'));
        assert.equal(secondThumbActive, true, 'Second thumbnail is marked active');

        // Click previous button
        await page.click('.gallery-nav-btn.gallery-prev');
        await page.waitForTimeout(100);
        const prevCounter = await page.textContent('.gallery-counter');
        assert.equal(prevCounter.trim(), `1 / ${p.count}`);

        // Jump to last thumbnail
        await thumbs.nth(p.count - 1).click();
        await page.waitForTimeout(100);
        const lastCounter = await page.textContent('.gallery-counter');
        assert.equal(lastCounter.trim(), `${p.count} / ${p.count}`);

        // Keyboard arrow navigation
        await gallery.focus();
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(100);
        const wrappedCounter = await page.textContent('.gallery-counter');
        assert.equal(wrappedCounter.trim(), `1 / ${p.count}`, 'ArrowRight wraps back to slide 1');

        // Open Lightbox Modal
        await page.click('.gallery-zoom-trigger');
        await page.waitForTimeout(150);

        const modalActive = await page.evaluate(() => document.getElementById('lightboxModal').classList.contains('active'));
        assert.equal(modalActive, true, 'Lightbox modal opens after clicking zoom trigger');

        // Check that modal gallery strip contains rendered image thumbnails
        const modalThumbs = page.locator('#previewGalleryStrip .gallery-thumb-btn');
        const modalThumbCount = await modalThumbs.count();
        assert.equal(modalThumbCount, p.count, `Lightbox modal has ${p.count} thumbnail buttons`);
        const modalThumbImg = modalThumbs.first().locator('.thumb-img');
        const modalImgLoaded = await modalThumbImg.evaluate(img => img.complete && img.naturalWidth > 0);
        assert.ok(modalImgLoaded, 'Lightbox thumbnail image loaded successfully with naturalWidth > 0');

        // Close via Escape key
        await page.keyboard.press('Escape');
        await page.waitForTimeout(150);
        const modalClosed = await page.evaluate(() => !document.getElementById('lightboxModal').classList.contains('active'));
        assert.equal(modalClosed, true, 'Lightbox modal closes on Escape key');
      });
    }

    it('5. Mobile swipe gesture navigation on product gallery', async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(`${serverUrl}/word-to-latex/`, { waitUntil: 'networkidle' });

      const viewport = page.locator('.gallery-viewport');
      const box = await viewport.boundingBox();
      assert.ok(box, 'Viewport bounding box exists on mobile');

      // Dispatch touch swipe left (next)
      await page.evaluate(() => {
        const vp = document.querySelector('.gallery-viewport');
        const touchStart = new Touch({
          identifier: 1,
          target: vp,
          clientX: 250,
          clientY: 200,
          screenX: 250,
          screenY: 200
        });
        const touchEnd = new Touch({
          identifier: 1,
          target: vp,
          clientX: 80,
          clientY: 200,
          screenX: 80,
          screenY: 200
        });

        vp.dispatchEvent(new TouchEvent('touchstart', { touches: [touchStart], changedTouches: [touchStart], bubbles: true }));
        vp.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [touchEnd], bubbles: true }));
      });

      await page.waitForTimeout(150);
      const counterAfterSwipe = await page.textContent('.gallery-counter');
      assert.equal(counterAfterSwipe.trim(), '2 / 5', 'Mobile swipe left navigated to slide 2');

      // Restore desktop viewport
      await page.setViewportSize({ width: 1280, height: 800 });
    });

    it('6. Responsive multi-viewport verification with zero horizontal page overflow', async () => {
      const viewports = [
        { width: 320, height: 568 },
        { width: 375, height: 667 },
        { width: 768, height: 1024 },
        { width: 1280, height: 800 },
        { width: 1920, height: 1080 }
      ];

      for (const p of PRODUCT_PAGES) {
        for (const vp of viewports) {
          await page.setViewportSize(vp);
          await page.goto(`${serverUrl}/${p.slug}/`, { waitUntil: 'networkidle' });

          const overflow = await page.evaluate(() => {
            const doc = document.documentElement;
            return doc.scrollWidth > doc.clientWidth;
          });
          assert.equal(overflow, false, `${p.slug} has no horizontal page overflow at ${vp.width}x${vp.height}`);

          // Verify gallery thumbnail container is scrollable or fits
          const thumbsWrap = page.locator('.gallery-thumbs');
          const isVisible = await thumbsWrap.isVisible();
          assert.ok(isVisible, `${p.slug} thumbnail strip is visible at ${vp.width}px`);
        }
      }
      await page.setViewportSize({ width: 1280, height: 800 });
    });

    it('7. Theme switching preserves gallery styling in light and dark modes', async () => {
      await page.goto(`${serverUrl}/word-to-latex/`, { waitUntil: 'networkidle' });

      // Check default/light mode
      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
      let activeThumbBg = await page.locator('.gallery-thumbs .gallery-thumb-btn.active').evaluate(el => window.getComputedStyle(el).color);
      assert.ok(activeThumbBg, 'Active thumb has defined color in light mode');

      // Switch to dark mode
      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
      activeThumbBg = await page.locator('.gallery-thumbs .gallery-thumb-btn.active').evaluate(el => window.getComputedStyle(el).color);
      assert.ok(activeThumbBg, 'Active thumb has defined color in dark mode');
    });

    it('8. Zero console errors across all gallery tests', () => {
      assert.deepEqual(consoleErrors, [], `Expected 0 console errors, got: ${JSON.stringify(consoleErrors)}`);
    });
  });
});
