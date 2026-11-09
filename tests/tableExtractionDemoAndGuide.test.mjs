import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('Table Extraction Playground & Companion Guide Suite (VISIBILITY-10)', () => {
  const demoPath = path.join(rootDir, 'demos/table-extraction/index.html');
  const guidePath = path.join(rootDir, 'guides/html-table-to-excel/index.html');
  const demoJsPath = path.join(rootDir, 'assets/js/table-extraction-demo.js');

  it('1. Core deliverables exist on disk with valid file size', () => {
    assert.ok(fs.existsSync(demoPath), 'demos/table-extraction/index.html must exist');
    assert.ok(fs.statSync(demoPath).size > 5000, 'demos/table-extraction/index.html has non-trivial content');

    assert.ok(fs.existsSync(guidePath), 'guides/html-table-to-excel/index.html must exist');
    assert.ok(fs.statSync(guidePath).size > 5000, 'guides/html-table-to-excel/index.html has non-trivial content');

    assert.ok(fs.existsSync(demoJsPath), 'assets/js/table-extraction-demo.js must exist');
    assert.ok(fs.statSync(demoJsPath).size > 1000, 'assets/js/table-extraction-demo.js has non-trivial content');
  });

  describe('Playground: /demos/table-extraction/', () => {
    const html = fs.readFileSync(demoPath, 'utf8');

    it('has valid SEO metadata and canonical tags', () => {
      assert.ok(html.includes('<link rel="canonical" href="https://extensionguy.me/demos/table-extraction/">'));
      assert.ok(html.includes('<meta property="og:url" content="https://extensionguy.me/demos/table-extraction/">'));
      assert.ok(html.includes('<meta property="og:image" content="https://extensionguy.me/assets/og/table-extractor-1200x630.png?v=2">'));

      const descMatch = html.match(/<meta name="description" content="([^"]+)">/);
      assert.ok(descMatch, 'meta description exists');
      assert.ok(descMatch[1].length >= 80 && descMatch[1].length <= 160);
    });

    it('has valid JSON-LD WebApplication and BreadcrumbList structured data', () => {
      const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      assert.ok(match, 'JSON-LD block exists');
      const parsed = JSON.parse(match[1]);
      assert.equal(parsed['@context'], 'https://schema.org');
      assert.ok(Array.isArray(parsed['@graph']));

      const app = parsed['@graph'].find(item => item['@type'] === 'WebApplication');
      assert.ok(app, 'WebApplication schema exists');
      assert.equal(app.url, 'https://extensionguy.me/demos/table-extraction/');

      const breadcrumbs = parsed['@graph'].find(item => item['@type'] === 'BreadcrumbList');
      assert.ok(breadcrumbs, 'BreadcrumbList schema exists');
      assert.equal(breadcrumbs.itemListElement.length, 3);
      assert.equal(breadcrumbs.itemListElement[0].item, 'https://extensionguy.me/');
      assert.equal(breadcrumbs.itemListElement[1].item, 'https://extensionguy.me/guides/');
      assert.equal(breadcrumbs.itemListElement[2].item, 'https://extensionguy.me/demos/table-extraction/');
    });

    it('contains all 5 table demonstration scenarios with required interactive selectors', () => {
      // 1. Standard
      assert.ok(html.includes('data-demo-card="standard"'), 'Standard table card exists');

      // 2. Merged
      assert.ok(html.includes('data-demo-card="merged-cells"'), 'Merged cells card exists');
      assert.ok(html.includes('colspan='), 'colspan used in merged table');
      assert.ok(html.includes('rowspan='), 'rowspan used in merged table');

      // 3. Hidden elements
      assert.ok(html.includes('data-demo-card="hidden-elements"'), 'Hidden elements card exists');
      assert.ok(html.includes('id="toggleHiddenElementsBtn"'), 'Hidden toggle button exists');
      assert.ok(html.includes('class="hidden-col"'), 'Hidden column class exists');
      assert.ok(html.includes('class="hidden-row"'), 'Hidden row class exists');

      // 4. Dynamic Sort / Filter
      assert.ok(html.includes('data-demo-card="sort-filter"'), 'Sort & filter card exists');
      assert.ok(html.includes('id="filterSearchInput"'), 'Filter search input exists');
      assert.ok(html.includes('data-sortable'), 'data-sortable attribute exists on headers');
      assert.ok(html.includes('id="dynamicRowCount"'), 'Dynamic row count container exists');

      // 5. Virtualized Grid
      assert.ok(html.includes('id="virtualGridContainer"'), 'Virtualized grid card exists');
      assert.ok(html.includes('id="virtualScrollViewport"'), 'Virtual scroll viewport exists');
      assert.ok(html.includes('id="virtualSpacer"'), 'Virtual spacer element exists');
      assert.ok(html.includes('id="virtualRowPool"'), 'Virtual row pool container exists');
      assert.ok(html.includes('id="virtualGridStats"'), 'Virtual grid stats element exists');
    });

    it('contains clear official store installation links for Table Extractor', () => {
      assert.ok(html.includes('https://chromewebstore.google.com/detail/table-extractor-export-h/fjpbjpmccomonleefghgalfoioekhlhm'));
      assert.ok(html.includes('https://microsoftedge.microsoft.com/addons/detail/table-extractor-export-h/pekammppimoaikllkhhebocbkbidoboe'));
    });

    it('preserves CSP compliance: no inline executable scripts', () => {
      const scripts = html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/gi) || [];
      for (const scriptTag of scripts) {
        if (scriptTag.includes('application/ld+json')) continue;
        const srcMatch = scriptTag.match(/src="([^"]+)"/);
        assert.ok(srcMatch, `Executable script must have src attribute: ${scriptTag}`);
      }
      assert.ok(html.includes('assets/js/table-extraction-demo.js'), 'Loads external demo script');
    });
  });

  describe('Companion Guide: /guides/html-table-to-excel/', () => {
    const html = fs.readFileSync(guidePath, 'utf8');

    it('has valid SEO metadata and canonical tags', () => {
      assert.ok(html.includes('<link rel="canonical" href="https://extensionguy.me/guides/html-table-to-excel/">'));
      assert.ok(html.includes('<meta property="og:url" content="https://extensionguy.me/guides/html-table-to-excel/">'));
      assert.ok(html.includes('<meta property="og:image" content="https://extensionguy.me/assets/og/home-1200x630.png?v=2">'));

      const descMatch = html.match(/<meta name="description" content="([^"]+)">/);
      assert.ok(descMatch, 'meta description exists');
      const descLen = descMatch[1].length;
      assert.ok(descLen >= 110 && descLen <= 155, `Meta description length ${descLen} must be within [110, 155]`);
    });

    it('has valid JSON-LD TechArticle and BreadcrumbList structured data', () => {
      const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      assert.ok(match, 'JSON-LD block exists');
      const parsed = JSON.parse(match[1]);
      assert.equal(parsed['@context'], 'https://schema.org');
      assert.ok(Array.isArray(parsed['@graph']));

      const article = parsed['@graph'].find(item => item['@type'] === 'TechArticle');
      assert.ok(article, 'TechArticle schema exists');
      assert.equal(article['@id'], 'https://extensionguy.me/guides/html-table-to-excel/#article');
      assert.ok(article.headline);
      assert.ok(article.datePublished);

      const breadcrumbs = parsed['@graph'].find(item => item['@type'] === 'BreadcrumbList');
      assert.ok(breadcrumbs, 'BreadcrumbList schema exists');
      assert.equal(breadcrumbs.itemListElement.length, 3);
      assert.equal(breadcrumbs.itemListElement[0].item, 'https://extensionguy.me/');
      assert.equal(breadcrumbs.itemListElement[1].item, 'https://extensionguy.me/guides/');
      assert.equal(breadcrumbs.itemListElement[2].item, 'https://extensionguy.me/guides/html-table-to-excel/');
    });

    it('contains all required technical sections and topics', () => {
      assert.ok(html.includes('id="html-table-structure"'), 'HTML Table Architecture section present');
      assert.ok(html.includes('id="why-copy-paste-fails"'), 'Why Copy-Paste Fails section present');
      assert.ok(html.includes('id="csv-versus-xlsx"'), 'CSV vs XLSX section present');
      assert.ok(html.includes('id="encoding-and-utf8-bom"'), 'Encoding & UTF-8 BOM section present');
      assert.ok(html.includes('id="dynamic-and-filtered-tables"'), 'Dynamic & Filtered Tables section present');
      assert.ok(html.includes('id="virtualized-grid-boundaries"'), 'DOM Virtualization section present');
      assert.ok(html.includes('id="interactive-playground-patterns"'), 'Interactive Playground section present');
      assert.ok(html.includes('id="table-extractor-mechanics"'), 'Table Extractor Verification section present');
      assert.ok(html.includes('id="standards-and-references"'), 'Standards & References section present');

      // Key technical concepts covered
      assert.ok(html.includes('colspan'), 'Discusses colspan');
      assert.ok(html.includes('rowspan'), 'Discusses rowspan');
      assert.ok(html.includes('RFC 4180'), 'Cites RFC 4180');
      assert.ok(html.includes('U+FEFF'), 'Discusses Unicode BOM U+FEFF');
      assert.ok(html.includes('mojibake'), 'Explains mojibake character corruption');
    });

    it('does NOT contain forbidden absolute claims in visible text', () => {
      const textOnly = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<pre\b[^<]*(?:(?!<\/pre>)<[^<]*)*<\/pre>/gi, '')
        .replace(/<code\b[^<]*(?:(?!<\/code>)<[^<]*)*<\/code>/gi, '')
        .replace(/<[^>]+>/g, ' ');

      const absoluteRegex = /\b(zero|never|always|100%|completely|entirely|permanent|guarantee|unlimited|nothing|no one)\b/i;
      const match = textOnly.match(absoluteRegex);
      assert.equal(match, null, `Forbidden claim word found: ${match ? match[0] : ''}`);
    });
  });

  describe('Cross-Linking & Sitemap Navigation', () => {
    it('demo page cross-links to companion guide, product page, and virtualized guide', () => {
      const demoHtml = fs.readFileSync(demoPath, 'utf8');
      assert.ok(demoHtml.includes('href="../../guides/html-table-to-excel/"'));
      assert.ok(demoHtml.includes('href="../../table-extractor/"'));
      assert.ok(demoHtml.includes('href="../../guides/export-virtualized-tables-to-excel/"'));
    });

    it('companion guide cross-links to demo playground, product page, and virtualized guide', () => {
      const guideHtml = fs.readFileSync(guidePath, 'utf8');
      assert.ok(guideHtml.includes('href="../../demos/table-extraction/"'));
      assert.ok(guideHtml.includes('href="../../table-extractor/"'));
      assert.ok(guideHtml.includes('href="../export-virtualized-tables-to-excel/"'));
    });

    it('guides hub /guides/ links to new companion guide via card', () => {
      const hubHtml = fs.readFileSync(path.join(rootDir, 'guides/index.html'), 'utf8');
      assert.ok(hubHtml.includes('href="./html-table-to-excel/"'));
    });

    it('product page /table-extractor/ links to demo playground and companion guide', () => {
      const productHtml = fs.readFileSync(path.join(rootDir, 'table-extractor/index.html'), 'utf8');
      assert.ok(productHtml.includes('href="../demos/table-extraction/"'));
      assert.ok(productHtml.includes('href="../guides/html-table-to-excel/"'));
    });

    it('sitemap.xml registers both new URLs while preserving existing 17 canonical URLs', () => {
      const sitemap = fs.readFileSync(path.join(rootDir, 'sitemap.xml'), 'utf8');
      assert.ok(sitemap.includes('<loc>https://extensionguy.me/demos/table-extraction/</loc>'));
      assert.ok(sitemap.includes('<loc>https://extensionguy.me/guides/html-table-to-excel/</loc>'));

      // Ensure key existing URLs remain untouched
      const expectedExisting = [
        'https://extensionguy.me/',
        'https://extensionguy.me/word-to-latex/',
        'https://extensionguy.me/word-to-latex-converter/',
        'https://extensionguy.me/pdf-tools/',
        'https://extensionguy.me/table-extractor/',
        'https://extensionguy.me/bulkgrab/',
        'https://extensionguy.me/seo-inspector/',
        'https://extensionguy.me/bilexi/',
        'https://extensionguy.me/tab-vault/',
        'https://extensionguy.me/privacy',
        'https://extensionguy.me/changelog/',
        'https://extensionguy.me/guides/',
        'https://extensionguy.me/guides/docx-to-latex-offline/',
        'https://extensionguy.me/guides/word-tables-to-latex/',
        'https://extensionguy.me/guides/export-virtualized-tables-to-excel/',
        'https://extensionguy.me/guides/prevent-browser-tab-loss-local-backups/',
        'https://extensionguy.me/guides/type-french-accents-on-qwerty-offline/'
      ];

      for (const url of expectedExisting) {
        assert.ok(sitemap.includes(`<loc>${url}</loc>`), `Preserved existing URL: ${url}`);
      }
    });
  });
});
