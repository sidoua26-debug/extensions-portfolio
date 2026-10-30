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
});
