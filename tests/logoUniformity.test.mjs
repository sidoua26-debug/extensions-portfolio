import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const ALL_18_PAGES = [
  'index.html',
  '404.html',
  'privacy.html',
  'pdf-tools/index.html',
  'word-to-latex/index.html',
  'table-extractor/index.html',
  'bulkgrab/index.html',
  'seo-inspector/index.html',
  'bilexi/index.html',
  'tab-vault/index.html',
  'word-to-latex-converter/index.html',
  'changelog/index.html',
  'guides/index.html',
  'guides/docx-to-latex-offline/index.html',
  'guides/export-virtualized-tables-to-excel/index.html',
  'guides/prevent-browser-tab-loss-local-backups/index.html',
  'guides/type-french-accents-on-qwerty-offline/index.html',
  'guides/word-tables-to-latex/index.html',
];

const OLD_VARIANT1_SNIPPET = 'M 8 8 H 24 V 13.5 C 25.5 13.5 27 14.5 27 16';
const CUBE_SVG_MARKER = '20.73 6.96';
const HEXAGON_SVG_MARKER = 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z';

test('Logo Uniformity & Brand Consistency Suite', async (t) => {
  await t.test('1. Every static page contains the new logo icons and two-tone Manrope wordmark', () => {
    for (const relPath of ALL_18_PAGES) {
      const fullPath = path.join(rootDir, relPath);
      assert.ok(fs.existsSync(fullPath), `Page exists: ${relPath}`);
      const content = fs.readFileSync(fullPath, 'utf-8');

      // Check logo-icon.svg presence
      assert.ok(
        content.includes('logo-icon.svg'),
        `${relPath} must reference logo-icon.svg`
      );
      assert.ok(
        content.includes('logo-icon-dark.svg'),
        `${relPath} must reference logo-icon-dark.svg`
      );

      // Check two-tone wordmark spans and classes
      assert.ok(
        content.includes('class="wordmark-ext"'),
        `${relPath} must include .wordmark-ext span`
      );
      assert.ok(
        content.includes('class="wordmark-guy"'),
        `${relPath} must include .wordmark-guy span`
      );
      assert.ok(
        content.includes('Extension') && content.includes('Guy'),
        `${relPath} must have Extension and Guy wordmark text`
      );

      // Check Manrope font preloads
      assert.ok(
        content.includes('manrope-500.woff2'),
        `${relPath} must preload manrope-500.woff2`
      );
      assert.ok(
        content.includes('manrope-800.woff2'),
        `${relPath} must preload manrope-800.woff2`
      );
    }
  });

  await t.test('2. Zero pages contain legacy 3D isometric cube, 2D hexagon, or old Variant 1 brand SVGs', () => {
    for (const relPath of ALL_18_PAGES) {
      const fullPath = path.join(rootDir, relPath);
      const content = fs.readFileSync(fullPath, 'utf-8');
      assert.ok(
        !content.includes(CUBE_SVG_MARKER),
        `${relPath} must not contain legacy 3D isometric cube SVG`
      );
      assert.ok(
        !content.includes(HEXAGON_SVG_MARKER),
        `${relPath} must not contain legacy 2D hexagon footer SVG`
      );
      assert.ok(
        !content.includes(OLD_VARIANT1_SNIPPET),
        `${relPath} must not contain legacy Variant 1 puzzle piece SVG path`
      );
    }
  });

  await t.test('3. Special pages maintain site brand without breaking tool-specific identity', () => {
    // 404.html: Preserves brand-link and uses canonical logo-icon.svg
    const content404 = fs.readFileSync(path.join(rootDir, '404.html'), 'utf-8');
    assert.ok(!content404.includes('class="brand-logo-img"'), '404.html must not use product icon as site brand');
    assert.ok(content404.includes('class="brand-link"'), '404.html preserves brand link navigation');
    assert.ok(content404.includes('logo-icon.svg'), '404.html uses canonical logo-icon.svg');

    // privacy.html: Header and footer lockups present
    const contentPriv = fs.readFileSync(path.join(rootDir, 'privacy.html'), 'utf-8');
    assert.ok(contentPriv.includes('class="privacy-header-lockup"'), 'privacy.html includes header brand lockup');
    assert.ok(contentPriv.includes('class="privacy-footer"'), 'privacy.html includes footer brand lockup');

    // pdf-tools/index.html: Preserves .brand-icon document icon and integrates ExtensionGuy attribution
    const contentPdf = fs.readFileSync(path.join(rootDir, 'pdf-tools/index.html'), 'utf-8');
    assert.ok(contentPdf.includes('class="brand-icon"'), 'pdf-tools preserves Offline PDF Studio document icon');
    assert.ok(contentPdf.includes('class="brand-parent-link"'), 'pdf-tools integrates parent brand attribution link');
    assert.ok(contentPdf.includes('class="footer-brand-lockup"'), 'pdf-tools integrates footer brand lockup');
  });

  await t.test('4. Generator template build_redesign.py enforces canonical branding', () => {
    const buildPath = path.join(rootDir, 'build_redesign.py');
    const buildContent = fs.readFileSync(buildPath, 'utf-8');
    assert.ok(buildContent.includes('BRAND_MARK_HTML ='), 'build_redesign.py defines BRAND_MARK_HTML constant');
    assert.ok(buildContent.includes('BRAND_WORDMARK_HTML ='), 'build_redesign.py defines BRAND_WORDMARK_HTML constant');
    assert.ok(buildContent.includes('logo-icon.svg'), 'build_redesign.py references logo-icon.svg');
    assert.ok(buildContent.includes('logo-icon-dark.svg'), 'build_redesign.py references logo-icon-dark.svg');
    assert.ok(!buildContent.includes(OLD_VARIANT1_SNIPPET), 'build_redesign.py does not contain old Variant 1 puzzle snippet');
  });

  await t.test('5. Brand SVG assets contain the privacy keyhole and correct brand colors', () => {
    const lightSvg = fs.readFileSync(path.join(rootDir, 'assets/icons/logo-icon.svg'), 'utf-8');
    assert.ok(lightSvg.includes('cx="76" cy="62" r="5"'), 'logo-icon.svg contains keyhole circle');
    assert.ok(lightSvg.includes('d="M73.5 64H78.5L80 76H72Z"'), 'logo-icon.svg contains keyhole slot');
    assert.ok(lightSvg.includes('#3B33C4'), 'logo-icon.svg contains brand indigo #3B33C4');

    const darkSvg = fs.readFileSync(path.join(rootDir, 'assets/icons/logo-icon-dark.svg'), 'utf-8');
    assert.ok(darkSvg.includes('cx="76" cy="62" r="5"'), 'logo-icon-dark.svg contains keyhole circle');
    assert.ok(darkSvg.includes('#B4B0FF'), 'logo-icon-dark.svg contains dark accent #B4B0FF');
    assert.ok(darkSvg.includes('#14123A'), 'logo-icon-dark.svg contains dark navy #14123A');

    const faviconSvg = fs.readFileSync(path.join(rootDir, 'assets/icons/favicon.svg'), 'utf-8');
    assert.ok(faviconSvg.includes('#3B33C4'), 'favicon.svg contains brand indigo #3B33C4');
    assert.ok(faviconSvg.includes('r="5"'), 'favicon.svg contains keyhole');
  });

  await t.test('6. Rendered logo icon and two-tone wordmark measurements and theme switching', async () => {
    const http = await import('node:http');
    const { chromium } = await import('playwright');

    const CSP_HEADER = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' blob: data:; connect-src 'self' blob: data:; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'none';";

    const server = http.createServer((req, res) => {
      const safeUrl = new URL(req.url, 'http://localhost').pathname;
      let localPath = path.join(rootDir, safeUrl === '/' ? 'index.html' : safeUrl);
      if (fs.existsSync(localPath) && fs.statSync(localPath).isDirectory()) {
        localPath = path.join(localPath, 'index.html');
      }
      if (!fs.existsSync(localPath) && fs.existsSync(localPath + '.html')) {
        localPath = localPath + '.html';
      }
      if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
        const mime = safeUrl.endsWith('.js') ? 'application/javascript'
          : safeUrl.endsWith('.png') ? 'image/png'
          : safeUrl.endsWith('.svg') ? 'image/svg+xml'
          : safeUrl.endsWith('.ico') ? 'image/x-icon'
          : safeUrl.endsWith('.woff2') ? 'font/woff2'
          : safeUrl.endsWith('.css') ? 'text/css'
          : 'text/html';
        res.writeHead(200, { 'Content-Type': mime, 'Content-Security-Policy': CSP_HEADER });
        return fs.createReadStream(localPath).pipe(res);
      }
      res.writeHead(404);
      res.end('Not found');
    });

    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

    const keyRoutes = [
      { name: 'homepage', path: '/' },
      { name: 'word-to-latex', path: '/word-to-latex/' },
      { name: 'guides/word-tables-to-latex', path: '/guides/word-tables-to-latex/' },
      { name: '404', path: '/404.html' },
      { name: 'privacy', path: '/privacy' },
      { name: 'pdf-tools', path: '/pdf-tools/' },
    ];

    try {
      for (const route of keyRoutes) {
        await page.goto(baseUrl + route.path, { waitUntil: 'domcontentloaded' });

        const headerMark = page.locator('.navbar .brand-mark, .brand-link .brand-mark, .privacy-header-lockup .brand-mark, .brand-parent-link .brand-parent-mark').first();
        const lightImg = headerMark.locator('.brand-icon-light');

        // Verify light logo image exists and renders with height 28
        const imgBox = await lightImg.evaluate(el => {
          const r = el.getBoundingClientRect();
          return { w: Math.round(r.width), h: Math.round(r.height), complete: el.complete, naturalWidth: el.naturalWidth };
        });
        assert.equal(imgBox.h, 28, `${route.name} brand icon height is 28px`);
        assert.ok(imgBox.w >= 30 && imgBox.w <= 36, `${route.name} brand icon width is ~34px, got ${imgBox.w}`);
        assert.ok(imgBox.complete && imgBox.naturalWidth > 0, `${route.name} light brand icon loaded cleanly`);

        // Verify two-tone wordmark in light mode
        const wordmarkExt = page.locator('.wordmark-ext').first();
        const wordmarkGuy = page.locator('.wordmark-guy').first();

        const extColorLight = await wordmarkExt.evaluate(el => getComputedStyle(el).color);
        const guyColorLight = await wordmarkGuy.evaluate(el => getComputedStyle(el).color);

        // #3B33C4 is rgb(59, 51, 196), #14123A is rgb(20, 18, 58)
        assert.equal(extColorLight, 'rgb(59, 51, 196)', `${route.name} light mode Extension color is #3B33C4`);
        assert.equal(guyColorLight, 'rgb(20, 18, 58)', `${route.name} light mode Guy color is #14123A`);

        // Toggle dark mode and verify dark colors
        await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
        const extColorDark = await wordmarkExt.evaluate(el => getComputedStyle(el).color);
        const guyColorDark = await wordmarkGuy.evaluate(el => getComputedStyle(el).color);

        // #B4B0FF is rgb(180, 176, 255), #FFFFFF is rgb(255, 255, 255)
        assert.equal(extColorDark, 'rgb(180, 176, 255)', `${route.name} dark mode Extension color is #B4B0FF`);
        assert.equal(guyColorDark, 'rgb(255, 255, 255)', `${route.name} dark mode Guy color is #FFFFFF`);

        // Reset theme attribute
        await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));
      }
    } finally {
      await browser.close();
      server.close();
    }
  });
});
