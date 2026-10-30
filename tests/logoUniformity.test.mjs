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

const CANONICAL_PATH_SNIPPET = 'M 8 8 H 24 V 13.5 C 25.5 13.5 27 14.5 27 16 C 27 17.5 25.5 18.5 24 18.5 V 24 H 8 V 18.5 C 9.5 18.5 11 17.5 11 16 C 11 14.5 9.5 13.5 8 13.5 Z';
const CUBE_SVG_MARKER = '20.73 6.96';
const HEXAGON_SVG_MARKER = 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z';

test('Logo Uniformity & Brand Consistency Suite', async (t) => {
  await t.test('1. Every static page contains the canonical Variant 1 puzzle piece SVG', () => {
    for (const relPath of ALL_18_PAGES) {
      const fullPath = path.join(rootDir, relPath);
      assert.ok(fs.existsSync(fullPath), `Page exists: ${relPath}`);
      const content = fs.readFileSync(fullPath, 'utf-8');
      assert.ok(
        content.includes(CANONICAL_PATH_SNIPPET),
        `${relPath} must contain canonical puzzle piece SVG path`
      );
      assert.ok(
        content.includes('fill="#4f46e5"') || content.includes('fill=\'#4f46e5\''),
        `${relPath} must use flat indigo #4f46e5 tile fill`
      );
    }
  });

  await t.test('2. Zero pages contain legacy 3D isometric cube or 2D hexagon brand SVGs', () => {
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
    }
  });

  await t.test('3. Special pages maintain site brand without breaking tool-specific identity', () => {
    // 404.html: No longer references word-to-latex-128.png as site brand logo
    const content404 = fs.readFileSync(path.join(rootDir, '404.html'), 'utf-8');
    assert.ok(
      !content404.includes('class="brand-logo-img"'),
      '404.html must not use product icon as site brand'
    );
    assert.ok(
      content404.includes('class="brand-link"'),
      '404.html preserves brand link navigation'
    );
    assert.ok(
      content404.includes(CANONICAL_PATH_SNIPPET),
      '404.html uses canonical puzzle mark'
    );

    // privacy.html: Header and footer lockups present
    const contentPriv = fs.readFileSync(path.join(rootDir, 'privacy.html'), 'utf-8');
    assert.ok(
      contentPriv.includes('class="privacy-header-lockup"'),
      'privacy.html includes header brand lockup'
    );
    assert.ok(
      contentPriv.includes('class="privacy-footer"'),
      'privacy.html includes footer brand lockup'
    );

    // pdf-tools/index.html: Preserves .brand-icon document icon and integrates ExtensionGuy attribution
    const contentPdf = fs.readFileSync(path.join(rootDir, 'pdf-tools/index.html'), 'utf-8');
    assert.ok(
      contentPdf.includes('class="brand-icon"'),
      'pdf-tools preserves Offline PDF Studio document icon'
    );
    assert.ok(
      contentPdf.includes('class="brand-parent-link"'),
      'pdf-tools integrates parent brand attribution link'
    );
    assert.ok(
      contentPdf.includes('class="footer-brand-lockup"'),
      'pdf-tools integrates footer brand lockup'
    );
  });

  await t.test('4. Generator template build_redesign.py enforces canonical branding', () => {
    const buildPath = path.join(rootDir, 'build_redesign.py');
    const buildContent = fs.readFileSync(buildPath, 'utf-8');
    assert.ok(
      buildContent.includes('BRAND_MARK_SVG ='),
      'build_redesign.py defines BRAND_MARK_SVG constant'
    );
    assert.ok(
      buildContent.includes('BRAND_MARK_HTML ='),
      'build_redesign.py defines BRAND_MARK_HTML constant'
    );
    assert.ok(
      buildContent.includes(CANONICAL_PATH_SNIPPET),
      'build_redesign.py embeds canonical puzzle piece path'
    );
  });

  await t.test('5. Rendered glyph and tile measurements are strictly equal across all 6 key routes', async () => {
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
        const footerMark = page.locator('footer .brand-mark, .footer-note .brand-mark, .privacy-footer .brand-mark, .footer-brand-lockup .brand-parent-mark').first();

        const hRect = await headerMark.locator('rect').evaluate(el => { const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; });
        const hPath = await headerMark.locator('path').evaluate(el => { const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; });

        const fRect = await footerMark.locator('rect').evaluate(el => { const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; });
        const fPath = await footerMark.locator('path').evaluate(el => { const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; });

        // Assert 32x32 tile and 19x16 glyph across all headers
        assert.equal(hRect.w, 32, `${route.name} header tile width is 32`);
        assert.equal(hRect.h, 32, `${route.name} header tile height is 32`);
        assert.equal(hPath.w, 19, `${route.name} header glyph path width is 19`);
        assert.equal(hPath.h, 16, `${route.name} header glyph path height is 16`);

        // Assert 32x32 tile and 19x16 glyph across all footers
        assert.equal(fRect.w, 32, `${route.name} footer tile width is 32`);
        assert.equal(fRect.h, 32, `${route.name} footer tile height is 32`);
        assert.equal(fPath.w, 19, `${route.name} footer glyph path width is 19`);
        assert.equal(fPath.h, 16, `${route.name} footer glyph path height is 16`);
      }
    } finally {
      await browser.close();
      server.close();
    }
  });
});
