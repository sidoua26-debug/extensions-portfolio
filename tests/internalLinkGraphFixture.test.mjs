import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseAnchorsFromHtml,
  resolveHref,
  getPageBaseUrl,
  buildLinkGraph,
  norm
} from '../.agents/skills/internal-linking/scripts/internal-link-graph.mjs';

test('internal-link-graph fixture verification', async (t) => {
  const siteOrigin = 'https://extensionguy.me';

  await t.test('1. Resolves relative link against page actual URL', () => {
    // Page is at /guides/docx-to-latex-offline/
    const pageUrl = getPageBaseUrl('/guides/docx-to-latex-offline', siteOrigin);
    assert.equal(pageUrl, 'https://extensionguy.me/guides/docx-to-latex-offline/');

    // Relative link to sibling guide
    const resolvedSibling = resolveHref('../word-tables-to-latex/', pageUrl, siteOrigin);
    assert.equal(resolvedSibling, '/guides/word-tables-to-latex');

    // Relative link to root-level product target
    const resolvedProduct = resolveHref('../../word-to-latex/', pageUrl, siteOrigin);
    assert.equal(resolvedProduct, '/word-to-latex');
  });

  await t.test('2. Resolves same-origin absolute internal link and root-relative link', () => {
    const pageUrl = getPageBaseUrl('/', siteOrigin);

    const resolvedAbs = resolveHref('https://extensionguy.me/pdf-tools/', pageUrl, siteOrigin);
    assert.equal(resolvedAbs, '/pdf-tools');

    const resolvedRootRel = resolveHref('/word-to-latex-converter/', pageUrl, siteOrigin);
    assert.equal(resolvedRootRel, '/word-to-latex-converter');
  });

  await t.test('3. Ignores external links, mailto, and fragments', () => {
    const pageUrl = getPageBaseUrl('/guides/docx-to-latex-offline', siteOrigin);

    assert.equal(resolveHref('https://github.com/sidoua26-debug/extensions-portfolio', pageUrl, siteOrigin), null);
    assert.equal(resolveHref('https://example.com/external', pageUrl, siteOrigin), null);
    assert.equal(resolveHref('#section-heading', pageUrl, siteOrigin), null);
    assert.equal(resolveHref('mailto:press@example.com', pageUrl, siteOrigin), null);
    assert.equal(resolveHref('javascript:void(0)', pageUrl, siteOrigin), null);
  });

  await t.test('4. Distinguishes navigation-only links from content links and ignores canonical link tags', () => {
    const pageUrl = getPageBaseUrl('/guides/docx-to-latex-offline', siteOrigin);

    const fixtureHtml = `
<!DOCTYPE html>
<html>
<head>
  <!-- Must not count <link> tags -->
  <link rel="canonical" href="https://extensionguy.me/canonical-should-be-ignored">
  <link rel="stylesheet" href="/assets/style.css">
</head>
<body>
  <header class="navbar">
    <nav aria-label="Main Navigation">
      <a href="/word-to-latex/" class="nav-link">Word to LaTeX Extension</a>
      <a href="https://github.com/external" class="nav-link">GitHub External</a>
    </nav>
  </header>
  <main>
    <article>
      <p>Here is content pointing to <a href="../../word-to-latex-converter/">Word to LaTeX Converter</a>.</p>
      <p>And relative link to <a href="../word-tables-to-latex/">Tables Guide</a>.</p>
    </article>
  </main>
  <footer class="footer">
    <div class="footer-links">
      <a href="/pdf-tools/">Offline PDF Tools</a>
    </div>
  </footer>
</body>
</html>
`;

    const result = parseAnchorsFromHtml(fixtureHtml, pageUrl, siteOrigin);

    // Canonical link tag must not be counted
    assert.ok(!result.totalLinks.includes('/canonical-should-be-ignored'));

    // Nav link (/word-to-latex) must be in navFooterLinks and totalLinks, but NOT in contentLinks
    assert.ok(result.navFooterLinks.includes('/word-to-latex'));
    assert.ok(result.totalLinks.includes('/word-to-latex'));
    assert.ok(!result.contentLinks.includes('/word-to-latex'));

    // Footer link (/pdf-tools) must be in navFooterLinks and totalLinks, but NOT in contentLinks
    assert.ok(result.navFooterLinks.includes('/pdf-tools'));
    assert.ok(result.totalLinks.includes('/pdf-tools'));
    assert.ok(!result.contentLinks.includes('/pdf-tools'));

    // Content links must be in contentLinks and totalLinks, but NOT in navFooterLinks
    assert.ok(result.contentLinks.includes('/word-to-latex-converter'));
    assert.ok(result.totalLinks.includes('/word-to-latex-converter'));
    assert.ok(!result.navFooterLinks.includes('/word-to-latex-converter'));

    assert.ok(result.contentLinks.includes('/guides/word-tables-to-latex'));
    assert.ok(result.totalLinks.includes('/guides/word-tables-to-latex'));
    assert.ok(!result.navFooterLinks.includes('/guides/word-tables-to-latex'));
  });

  await t.test('5. Reserves orphan for zero links and underlinked for < threshold', () => {
    const files = [
      'index.html',
      'pageA.html',
      'pageB.html',
      'orphanPage.html',
    ];

    const mockContent = {
      'index.html': `<header><nav><a href="/pageA">Page A</a></nav></header><main><a href="/pageB">Page B</a></main>`,
      'pageA.html': `<main><p>No links here</p></main>`,
      'pageB.html': `<main><a href="/pageA">Link back to A</a></main>`,
      'orphanPage.html': `<main><p>Isolated page</p></main>`,
    };

    const graph = buildLinkGraph(files, (f) => mockContent[f], {
      siteOrigin,
      underlinkedThreshold: 3,
    });

    // orphanPage has 0 inbound links
    assert.ok(graph.summary.orphanPages.includes('/orphanPage'));

    // pageA has 2 inbound links (from index nav and pageB content) -> underlinked (< 3), NOT orphan
    assert.ok(!graph.summary.orphanPages.includes('/pageA'));
    assert.ok(graph.summary.underlinkedPages.includes('/pageA'));
  });
});
