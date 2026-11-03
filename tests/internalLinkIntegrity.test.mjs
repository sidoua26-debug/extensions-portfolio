import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export const CANONICAL_ORIGIN = 'https://extensionguy.me';

// Authoritative tracked deployable files from git tracking
export function getTrackedFiles() {
  try {
    const stdout = execSync('git ls-files', { cwd: rootDir, encoding: 'utf8' });
    const all = stdout.trim().split('\n').map(s => s.trim()).filter(Boolean);
    const html = all.filter(f => f.endsWith('.html'));
    return {
      all: new Set(all),
      html: new Set(html)
    };
  } catch {
    // Fallback if git is unavailable
  }
  const fallbackHtml = [
    'index.html',
    '404.html',
    'privacy.html',
    'pdf-tools/index.html',
    'word-to-latex/index.html',
    'word-to-latex-converter/index.html',
    'table-extractor/index.html',
    'bulkgrab/index.html',
    'seo-inspector/index.html',
    'bilexi/index.html',
    'tab-vault/index.html',
    'changelog/index.html',
    'guides/index.html',
    'guides/docx-to-latex-offline/index.html',
    'guides/word-tables-to-latex/index.html',
    'guides/export-virtualized-tables-to-excel/index.html',
    'guides/prevent-browser-tab-loss-local-backups/index.html',
    'guides/type-french-accents-on-qwerty-offline/index.html'
  ];
  return {
    all: new Set(fallbackHtml),
    html: new Set(fallbackHtml)
  };
}

const trackedFiles = getTrackedFiles();
export const trackedAllFiles = trackedFiles.all;
export const trackedHtmlFiles = trackedFiles.html;

export function resolveInternalRoute(sourceFile, href, origin = CANONICAL_ORIGIN) {
  if (!href || typeof href !== 'string') return null;
  const trimmed = href.trim();
  if (!trimmed || trimmed === '#' || trimmed.startsWith('#')) return null;

  let pathname = '';
  let isSameOrigin = false;

  // Check if href is an absolute URL with scheme or protocol-relative
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) || trimmed.startsWith('//')) {
    try {
      const parsed = new URL(trimmed, origin);
      // Ignore mailto, tel, javascript, etc.
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return null;
      }
      // Check hostname matches our origin hostname
      const expectedHost = new URL(origin).hostname;
      if (parsed.hostname !== expectedHost) {
        return null; // External domain
      }
      isSameOrigin = true;
      pathname = parsed.pathname;
    } catch {
      return null;
    }
  } else {
    // Relative or root-relative URL: strip query string and hash
    const clean = trimmed.split('#')[0].split('?')[0].trim();
    if (!clean || clean.startsWith('#')) return null;

    if (clean.startsWith('/')) {
      pathname = path.posix.normalize(clean);
    } else {
      const sourceDir = path.posix.dirname('/' + sourceFile);
      pathname = path.posix.normalize(path.posix.join(sourceDir, clean));
    }
    isSameOrigin = true;
  }

  if (!isSameOrigin || !pathname) return null;

  // Normalize pathname with leading slash
  pathname = path.posix.normalize(pathname);
  if (!pathname.startsWith('/')) {
    pathname = '/' + pathname;
  }

  return pathname;
}

export function isRouteValid(resolvedRoute, tracked = { all: trackedAllFiles, html: trackedHtmlFiles }) {
  if (!resolvedRoute || !resolvedRoute.startsWith('/')) return false;
  const route = resolvedRoute.replace(/^\//, '');
  const ext = path.posix.extname(route).toLowerCase();

  // If the path targets a static asset (e.g. .txt, .svg, .png, .pdf, .wasm),
  // validate directly against tracked assets rather than misclassifying as an HTML route.
  if (ext && ext !== '.html') {
    return tracked.all.has(route);
  }

  // Root route
  if (route === '' || route === '/') {
    return tracked.html.has('index.html');
  }

  // Cloudflare clean routes for standalone files
  if (route === 'privacy' || route === 'privacy/' || route === 'privacy.html') {
    return tracked.html.has('privacy.html');
  }
  if (route === '404' || route === '404.html') {
    return tracked.html.has('404.html');
  }

  // Directory routes with trailing slash
  if (route.endsWith('/')) {
    return tracked.html.has(route + 'index.html');
  }

  // Directory routes without trailing slash or direct html files
  if (tracked.html.has(route + '/index.html')) return true;
  if (tracked.html.has(route + '.html')) return true;
  if (tracked.html.has(route)) return true;

  return false;
}

export function validateHtmlLinks(sourceFile, htmlContent, tracked = { all: trackedAllFiles, html: trackedHtmlFiles }) {
  const linkRegex = /<a\b[^>]*\bhref=[\x27\x22]([^\x27\x22]+)[\x27\x22]/gi;
  const brokenLinks = [];
  const validLinks = [];
  let match;

  while ((match = linkRegex.exec(htmlContent)) !== null) {
    const rawHref = match[1];
    const resolved = resolveInternalRoute(sourceFile, rawHref);
    if (resolved === null) continue; // External, mailto, anchor

    const valid = isRouteValid(resolved, tracked);
    if (!valid) {
      brokenLinks.push({ rawHref, resolved });
    } else {
      validLinks.push({ rawHref, resolved });
    }
  }

  return {
    valid: brokenLinks.length === 0,
    brokenLinks,
    validLinks
  };
}

describe('Internal Link Integrity & Validation Suite', () => {
  describe('Unit Tests: Route Resolution & Same-Origin Handling', () => {
    it('resolves relative directory routes across various depths', () => {
      assert.equal(resolveInternalRoute('index.html', './word-to-latex/'), '/word-to-latex/');
      assert.equal(resolveInternalRoute('seo-inspector/index.html', '../table-extractor/'), '/table-extractor/');
      assert.equal(resolveInternalRoute('guides/docx-to-latex-offline/index.html', '../../word-to-latex/'), '/word-to-latex/');
      assert.equal(resolveInternalRoute('guides/docx-to-latex-offline/index.html', '../word-tables-to-latex/'), '/guides/word-tables-to-latex/');
    });

    it('resolves Cloudflare clean route /privacy from different depths', () => {
      assert.equal(resolveInternalRoute('index.html', './privacy'), '/privacy');
      assert.equal(resolveInternalRoute('seo-inspector/index.html', '../privacy'), '/privacy');
      assert.equal(resolveInternalRoute('guides/docx-to-latex-offline/index.html', '../../privacy'), '/privacy');
    });

    it('correctly handles absolute same-origin URLs on https://extensionguy.me/', () => {
      assert.equal(
        resolveInternalRoute('index.html', 'https://extensionguy.me/word-to-latex/'),
        '/word-to-latex/'
      );
      assert.equal(
        resolveInternalRoute('index.html', 'https://extensionguy.me/privacy'),
        '/privacy'
      );
      assert.equal(
        resolveInternalRoute('seo-inspector/index.html', 'https://extensionguy.me/table-extractor/?ref=seo#features'),
        '/table-extractor/'
      );
      assert.equal(
        resolveInternalRoute('index.html', 'https://extensionguy.me/'),
        '/'
      );
    });

    it('validates both valid and invalid absolute same-origin links', () => {
      const validAbs = resolveInternalRoute('index.html', 'https://extensionguy.me/word-to-latex/');
      assert.equal(isRouteValid(validAbs), true, 'Valid absolute same-origin link must pass');

      const invalidAbs = resolveInternalRoute('index.html', 'https://extensionguy.me/nonexistent-test-page/');
      assert.equal(isRouteValid(invalidAbs), false, 'Nonexistent absolute same-origin link must fail');
    });

    it('validates local static assets without misclassifying as nonexistent HTML routes', () => {
      const validAsset = resolveInternalRoute('word-to-latex/index.html', '../assets/wasm/LICENSE.txt');
      assert.equal(validAsset, '/assets/wasm/LICENSE.txt');
      assert.equal(isRouteValid(validAsset), true, 'Tracked static asset must be valid');

      const validAbsAsset = resolveInternalRoute('index.html', 'https://extensionguy.me/assets/wasm/LICENSE.txt');
      assert.equal(validAbsAsset, '/assets/wasm/LICENSE.txt');
      assert.equal(isRouteValid(validAbsAsset), true, 'Tracked absolute static asset must be valid');

      const missingAsset = resolveInternalRoute('index.html', '/assets/nonexistent-image.png');
      assert.equal(missingAsset, '/assets/nonexistent-image.png');
      assert.equal(isRouteValid(missingAsset), false, 'Nonexistent static asset must fail');
    });

    it('ignores external URLs, anchors, mailto, tel, and javascript links', () => {
      assert.equal(resolveInternalRoute('index.html', 'https://microsoftedge.microsoft.com/addons/'), null);
      assert.equal(resolveInternalRoute('index.html', 'https://github.com/sidoua26-debug/extensions-portfolio'), null);
      assert.equal(resolveInternalRoute('index.html', 'mailto:contact@extensionguy.me'), null);
      assert.equal(resolveInternalRoute('index.html', 'tel:+1234567890'), null);
      assert.equal(resolveInternalRoute('index.html', 'javascript:void(0)'), null);
      assert.equal(resolveInternalRoute('index.html', '#faq'), null);
    });

    it('verifies that an untracked route fails and passes when tracked in a synthetic set', () => {
      const syntheticRoute = '/guides/synthetic-upcoming-feature/';
      const syntheticFile = 'guides/synthetic-upcoming-feature/index.html';

      // 1. Untracked: fails validation
      const untrackedSet = {
        all: new Set(['index.html']),
        html: new Set(['index.html'])
      };
      assert.equal(
        isRouteValid(syntheticRoute, untrackedSet),
        false,
        'Link to untracked route must fail'
      );

      // 2. Identical link passes when its destination is included in a synthetic tracked-file set
      const trackedSet = {
        all: new Set(['index.html', syntheticFile]),
        html: new Set(['index.html', syntheticFile])
      };
      assert.equal(
        isRouteValid(syntheticRoute, trackedSet),
        true,
        'Identical link must pass when destination is included in tracked deployment set'
      );
    });
  });

  describe('Synthetic Broken-Link Fixture Negative Test', () => {
    it('proves that the complete validation mechanism reports failure on broken HTML fixtures', () => {
      const syntheticHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head><title>Synthetic Test Fixture</title></head>
        <body>
          <main>
            <a href="/word-to-latex/">Valid Link 1</a>
            <a href="https://extensionguy.me/privacy">Valid Link 2</a>
            <a href="https://github.com/sidoua26-debug">Ignored External Link</a>
            <a href="/guides/synthetic-untracked-route/">Broken Link: Untracked Route</a>
            <a href="/nonexistent-fixture-route-404/">Broken Link: Nonexistent Route</a>
            <a href="https://extensionguy.me/broken-same-origin-url/">Broken Link: Bad Same Origin</a>
            <a href="/assets/missing-asset.png">Broken Link: Missing Static Asset</a>
          </main>
        </body>
        </html>
      `;

      const result = validateHtmlLinks('test/synthetic-fixture.html', syntheticHtml);

      assert.equal(result.valid, false, 'Complete validation mechanism must report failure');
      assert.equal(result.brokenLinks.length, 4, 'Must catch exactly the 4 broken links');
      assert.equal(result.validLinks.length, 2, 'Must recognize the 2 valid links');

      const brokenResolved = result.brokenLinks.map(b => b.resolved);
      assert.ok(brokenResolved.includes('/guides/synthetic-untracked-route/'));
      assert.ok(brokenResolved.includes('/nonexistent-fixture-route-404/'));
      assert.ok(brokenResolved.includes('/broken-same-origin-url/'));
      assert.ok(brokenResolved.includes('/assets/missing-asset.png'));
    });
  });

  describe('Tracked Deployable Pages Link Integrity Gate', () => {
    assert.ok(trackedHtmlFiles.size >= 18, `Expected at least 18 tracked HTML files, got ${trackedHtmlFiles.size}`);

    for (const file of trackedHtmlFiles) {
      it(`page "${file}" contains zero broken or unpublished internal links`, () => {
        const filePath = path.join(rootDir, file);
        assert.ok(fs.existsSync(filePath), `Tracked file must exist: ${file}`);
        const html = fs.readFileSync(filePath, 'utf8');

        const result = validateHtmlLinks(file, html);

        assert.equal(
          result.brokenLinks.length,
          0,
          `Found ${result.brokenLinks.length} broken/unpublished link(s) in ${file}: ${JSON.stringify(result.brokenLinks)}`
        );
      });
    }
  });
});
