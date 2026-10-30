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

function readPngDimensions(filePath) {
  const buf = fs.readFileSync(filePath);
  // PNG signature: 8 bytes, IHDR chunk at byte 12..24
  // Width: bytes 16..20, Height: bytes 20..24 (big-endian 32-bit int)
  assert.equal(buf.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'Valid PNG signature');
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

test('Site Icon Integrity & Social Assets Gate', async (t) => {
  await t.test('1. Dedicated brand favicon and application icon assets exist with exact specs', () => {
    // 1a. favicon.svg
    const svgPath = path.join(rootDir, 'assets/icons/favicon.svg');
    assert.ok(fs.existsSync(svgPath), 'favicon.svg exists');
    const svgContent = fs.readFileSync(svgPath, 'utf-8');
    assert.ok(svgContent.includes('viewBox="0 0 32 32"'), 'favicon.svg has 32x32 viewBox');
    assert.ok(svgContent.includes('#4f46e5'), 'favicon.svg has flat indigo #4f46e5');
    assert.ok(/M\s*8\s*8\s*H\s*24/.test(svgContent), 'favicon.svg has canonical puzzle glyph');

    // 1b. favicon.ico
    const icoPath = path.join(rootDir, 'assets/icons/favicon.ico');
    assert.ok(fs.existsSync(icoPath), 'favicon.ico exists');
    assert.ok(fs.statSync(icoPath).size > 500, 'favicon.ico has multi-resolution layers');

    // 1c. favicon-16x16.png
    const png16Path = path.join(rootDir, 'assets/icons/favicon-16x16.png');
    assert.ok(fs.existsSync(png16Path), 'favicon-16x16.png exists');
    assert.deepEqual(readPngDimensions(png16Path), { width: 16, height: 16 });

    // 1d. favicon-32x32.png
    const png32Path = path.join(rootDir, 'assets/icons/favicon-32x32.png');
    assert.ok(fs.existsSync(png32Path), 'favicon-32x32.png exists');
    assert.deepEqual(readPngDimensions(png32Path), { width: 32, height: 32 });

    // 1e. apple-touch-icon.png
    const touchPath = path.join(rootDir, 'assets/icons/apple-touch-icon.png');
    assert.ok(fs.existsSync(touchPath), 'apple-touch-icon.png exists');
    assert.deepEqual(readPngDimensions(touchPath), { width: 180, height: 180 });
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

  await t.test('3. No HTML page references product extension icons as generic site icons', () => {
    for (const relPath of ALL_18_PAGES) {
      const fullPath = path.join(rootDir, relPath);
      const content = fs.readFileSync(fullPath, 'utf-8');

      // Check favicon tags
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

      // Verify canonical favicon presence
      assert.ok(
        content.includes('favicon.svg'),
        `${relPath} references favicon.svg`
      );
      assert.ok(
        content.includes('apple-touch-icon.png'),
        `${relPath} references dedicated apple-touch-icon.png`
      );
    }
  });

  await t.test('4. All 11 Open Graph cards are exactly 1200x630 and exist on disk', () => {
    for (const ogName of OG_11_CARDS) {
      const fullPath = path.join(rootDir, 'assets/og', ogName);
      assert.ok(fs.existsSync(fullPath), `OG card exists: ${ogName}`);
      const dims = readPngDimensions(fullPath);
      assert.deepEqual(dims, { width: 1200, height: 630 }, `${ogName} has 1200x630 dimensions`);
    }
  });
});
