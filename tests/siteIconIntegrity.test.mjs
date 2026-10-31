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

const PAGES_WITH_SOCIAL_CARDS = [
  'index.html',
  'privacy.html',
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

const OG_11_CARDS = [
  'bilexi-1200x630.png',
  'bulkgrab-1200x630.png',
  'guide-docx-to-latex-offline-1200x630.png',
  'guide-word-tables-to-latex-1200x630.png',
  'home-1200x630.png',
  'privacy-1200x630.png',
  'seo-inspector-1200x630.png',
  'tab-vault-1200x630.png',
  'table-extractor-1200x630.png',
  'word-to-latex-1200x630.png',
  'word-to-latex-converter-1200x630.png',
];

function readPngMetadata(filePath) {
  const buf = fs.readFileSync(filePath);
  assert.equal(buf.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'Valid PNG signature');
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const bitDepth = buf[24];
  const colorType = buf[25]; // 2 = Truecolor RGB (no alpha), 6 = Truecolor with alpha RGBA
  return { width, height, bitDepth, colorType };
}

test('Site Icon Integrity & Social Assets Gate', async (t) => {
  await t.test('1. Dedicated brand favicon and application icon assets exist with exact specs', () => {
    // 1a. favicon.svg
    const svgPath = path.join(rootDir, 'assets/icons/favicon.svg');
    assert.ok(fs.existsSync(svgPath), 'favicon.svg exists');
    const svgContent = fs.readFileSync(svgPath, 'utf-8');
    assert.ok(svgContent.includes('viewBox="0 0 128 128"'), 'favicon.svg has 128x128 viewBox');
    assert.ok(svgContent.includes('#3B33C4'), 'favicon.svg has flat indigo #3B33C4');
    assert.ok(svgContent.includes('r="5"'), 'favicon.svg has keyhole glyph');

    // 1b. Root favicon.ico and assets/icons/favicon.ico
    const rootIcoPath = path.join(rootDir, 'favicon.ico');
    assert.ok(fs.existsSync(rootIcoPath), 'Root favicon.ico exists');
    assert.ok(fs.statSync(rootIcoPath).size > 500, 'Root favicon.ico has valid multi-resolution data');

    const icoPath = path.join(rootDir, 'assets/icons/favicon.ico');
    assert.ok(fs.existsSync(icoPath), 'assets/icons/favicon.ico exists');
    assert.ok(fs.statSync(icoPath).size > 500, 'assets/icons/favicon.ico has multi-resolution layers');

    // 1c. favicon-16.png and alias favicon-16x16.png
    const png16Path = path.join(rootDir, 'assets/icons/favicon-16.png');
    assert.ok(fs.existsSync(png16Path), 'favicon-16.png exists');
    const meta16 = readPngMetadata(png16Path);
    assert.equal(meta16.width, 16);
    assert.equal(meta16.height, 16);

    // 1d. favicon-32.png and alias favicon-32x32.png
    const png32Path = path.join(rootDir, 'assets/icons/favicon-32.png');
    assert.ok(fs.existsSync(png32Path), 'favicon-32.png exists');
    const meta32 = readPngMetadata(png32Path);
    assert.equal(meta32.width, 32);
    assert.equal(meta32.height, 32);

    // 1d-2. favicon-96.png and alias favicon-96x96.png (Google Search recommended high-res favicon)
    const png96Path = path.join(rootDir, 'assets/icons/favicon-96.png');
    assert.ok(fs.existsSync(png96Path), 'favicon-96.png exists');
    const meta96 = readPngMetadata(png96Path);
    assert.equal(meta96.width, 96);
    assert.equal(meta96.height, 96);
    const png96AliasPath = path.join(rootDir, 'assets/icons/favicon-96x96.png');
    assert.ok(fs.existsSync(png96AliasPath), 'favicon-96x96.png alias exists');

    // 1e. apple-touch-icon.png (180x180, mode RGB, no alpha channel)
    const touchPath = path.join(rootDir, 'assets/icons/apple-touch-icon.png');
    assert.ok(fs.existsSync(touchPath), 'apple-touch-icon.png exists');
    const touchMeta = readPngMetadata(touchPath);
    assert.equal(touchMeta.width, 180, 'apple-touch-icon width is 180');
    assert.equal(touchMeta.height, 180, 'apple-touch-icon height is 180');
    assert.equal(touchMeta.colorType, 2, 'apple-touch-icon is Truecolor RGB with NO alpha channel');
  });

  await t.test('2. Extension store product icons remain preserved and untouched', () => {
    const storeIcons = [
      'assets/icons/bilexi-128.png',
      'assets/icons/bulkgrab-128.png',
      'assets/icons/table-extractor-128.png',
      'assets/icons/table-extractor-300.png',
      'assets/icons/word-to-latex-128.png',
      'assets/icons/word-to-latex-300.png',
      'assets/icons/tab-vault-128.png',
      'assets/icons/seo-inspector-128.png',
    ];
    for (const iconRel of storeIcons) {
      const fullPath = path.join(rootDir, iconRel);
      assert.ok(fs.existsSync(fullPath), `Store icon exists: ${iconRel}`);
      assert.ok(fs.statSync(fullPath).size > 1000, `Store icon valid: ${iconRel}`);
    }
  });

  await t.test('3. All 18 pages have unified favicons, root favicon.ico link, and reverted theme-color', () => {
    for (const relPath of ALL_18_PAGES) {
      const fullPath = path.join(rootDir, relPath);
      const content = fs.readFileSync(fullPath, 'utf-8');

      // Check forbidden product icon favicon usage
      const hasGenericProductFavicon = /<link\s+rel="icon"[^>]*word-to-latex-128\.png/.test(content);
      assert.ok(
        !hasGenericProductFavicon,
        `${relPath} must not use word-to-latex-128.png as site favicon`
      );

      const hasGenericProductTouchIcon = /<link\s+rel="apple-touch-icon"[^>]*word-to-latex-128\.png/.test(content);
      assert.ok(
        !hasGenericProductTouchIcon,
        `${relPath} must not use word-to-latex-128.png as apple-touch-icon`
      );

      // Verify first preferred Google-compatible favicon is 96x96 PNG
      const firstIconMatch = content.match(/<link\s+rel="icon"[^>]+>/);
      assert.ok(
        firstIconMatch && firstIconMatch[0].includes('favicon-96.png') && firstIconMatch[0].includes('sizes="96x96"'),
        `${relPath} has 96x96 PNG as first preferred favicon declaration`
      );
      assert.ok(
        content.includes('favicon.svg?v=2'),
        `${relPath} references versioned favicon.svg?v=2`
      );
      assert.ok(
        content.includes('favicon-32.png?v=2') || content.includes('favicon-32x32.png?v=2'),
        `${relPath} references versioned favicon 32px`
      );
      assert.ok(
        content.includes('favicon-16.png?v=2') || content.includes('favicon-16x16.png?v=2'),
        `${relPath} references versioned favicon 16px`
      );
      assert.ok(
        content.includes('apple-touch-icon.png?v=2'),
        `${relPath} references versioned apple-touch-icon.png?v=2`
      );

      // Verify root favicon.ico link
      assert.ok(
        content.includes('favicon.ico?v=2'),
        `${relPath} references root favicon.ico?v=2`
      );

      // Verify reverted theme color #0f172a
      assert.ok(
        content.includes('<meta name="theme-color" content="#0f172a">'),
        `${relPath} has reverted theme-color #0f172a`
      );
    }
  });

  await t.test('4. All 11 Open Graph cards are exactly 1200x630 and exist on disk', () => {
    for (const ogName of OG_11_CARDS) {
      const fullPath = path.join(rootDir, 'assets/og', ogName);
      assert.ok(fs.existsSync(fullPath), `OG card exists: ${ogName}`);
      const dims = readPngMetadata(fullPath);
      assert.equal(dims.width, 1200, `${ogName} has 1200 width`);
      assert.equal(dims.height, 630, `${ogName} has 630 height`);
    }
  });

  await t.test('5. All 16 pages with social cards have version-busted og:image and twitter:image', () => {
    for (const relPath of PAGES_WITH_SOCIAL_CARDS) {
      const fullPath = path.join(rootDir, relPath);
      const content = fs.readFileSync(fullPath, 'utf-8');

      // og:image
      const ogMatch = content.match(/<meta\s+property="og:image"\s+content="([^"]+)">/);
      assert.ok(ogMatch, `${relPath} has og:image tag`);
      assert.ok(
        ogMatch[1].endsWith('.png?v=2'),
        `${relPath} og:image URL must end with .png?v=2: ${ogMatch[1]}`
      );

      // twitter:image
      const twMatch = content.match(/<meta\s+name="twitter:image"\s+content="([^"]+)">/);
      assert.ok(twMatch, `${relPath} has twitter:image tag`);
      assert.ok(
        twMatch[1].endsWith('.png?v=2'),
        `${relPath} twitter:image URL must end with .png?v=2: ${twMatch[1]}`
      );
    }
  });
});
