import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const DEMOS_HUB_HTML = path.join(rootDir, 'demos/index.html');
const BULK_DEMO_HTML = path.join(rootDir, 'demos/bulk-download/index.html');
const BULK_DEMO_JS = path.join(rootDir, 'assets/js/bulk-download-demo.js');
const PDF_GUIDE_HTML = path.join(rootDir, 'guides/download-multiple-pdfs/index.html');
const BULKGRAB_PROD_HTML = path.join(rootDir, 'bulkgrab/index.html');
const GUIDES_HUB_HTML = path.join(rootDir, 'guides/index.html');
const SITEMAP_PATH = path.join(rootDir, 'sitemap.xml');
const INDEX_HTML = path.join(rootDir, 'index.html');
const SAMPLES_DIR = path.join(rootDir, 'assets/samples/bulk-download');

const FORBIDDEN_WORDS_REGEX = /\b(zero|never|always|100%|completely|entirely|permanent|guarantee|unlimited|nothing|no one)\b/i;

function stripCodeAndScripts(content) {
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<pre\b[^<]*(?:(?!<\/pre>)<[^<]*)*<\/pre>/gi, '')
    .replace(/<code\b[^<]*(?:(?!<\/code>)<[^<]*)*<\/code>/gi, '')
    .replace(/<[^>]+>/g, ' ');
}

describe('Bulk Download Playground & Demos Hub Validation', () => {
  describe('1. Sample Test Assets on Disk', () => {
    const requiredFiles = [
      { name: 'sample-quarterly-report.pdf', type: 'pdf' },
      { name: 'sample-technical-whitepaper.pdf', type: 'pdf' },
      { name: 'sample-product-datasheet.pdf', type: 'pdf' },
      { name: 'sample-compliance-summary.pdf', type: 'pdf' },
      { name: 'sample-analytics-chart.png', type: 'png' },
      { name: 'sample-workflow-diagram.png', type: 'png' },
      { name: 'sample-architecture-render.jpg', type: 'jpg' },
      { name: 'sample-interface-mockup.jpg', type: 'jpg' },
      { name: 'sample-metrics-export.csv', type: 'csv' },
      { name: 'sample-inventory-data.csv', type: 'csv' },
      { name: 'sample-release-notes.txt', type: 'txt' },
      { name: 'sample-checksum-manifest.txt', type: 'txt' },
    ];

    it('all 12 sample files exist and are non-empty', () => {
      assert.ok(fs.existsSync(SAMPLES_DIR), 'Sample directory must exist');
      for (const item of requiredFiles) {
        const filePath = path.join(SAMPLES_DIR, item.name);
        assert.ok(fs.existsSync(filePath), `Sample ${item.name} must exist`);
        const stat = fs.statSync(filePath);
        assert.ok(stat.size > 50, `Sample ${item.name} size (${stat.size}B) must be > 50B`);
      }
    });

    it('sample files have valid magic headers and encoding', () => {
      // PDF check
      const pdfBuffer = fs.readFileSync(path.join(SAMPLES_DIR, 'sample-quarterly-report.pdf'));
      assert.equal(pdfBuffer.subarray(0, 5).toString('ascii'), '%PDF-', 'PDF magic header match');

      // PNG check
      const pngBuffer = fs.readFileSync(path.join(SAMPLES_DIR, 'sample-analytics-chart.png'));
      assert.equal(pngBuffer[0], 0x89, 'PNG magic byte 0');
      assert.equal(pngBuffer.subarray(1, 4).toString('ascii'), 'PNG', 'PNG signature');

      // JPG check
      const jpgBuffer = fs.readFileSync(path.join(SAMPLES_DIR, 'sample-architecture-render.jpg'));
      assert.equal(jpgBuffer[0], 0xff, 'JPG SOI marker byte 0');
      assert.equal(jpgBuffer[1], 0xd8, 'JPG SOI marker byte 1');

      // CSV check
      const csvContent = fs.readFileSync(path.join(SAMPLES_DIR, 'sample-metrics-export.csv'), 'utf8');
      assert.ok(csvContent.includes(','), 'CSV contains comma delimiter');
      assert.ok(csvContent.split('\n').length >= 3, 'CSV has multiple lines');

      // TXT check
      const txtContent = fs.readFileSync(path.join(SAMPLES_DIR, 'sample-release-notes.txt'), 'utf8');
      assert.ok(txtContent.length > 50, 'TXT content length > 50');
    });
  });

  describe('2. Interactive Demos Hub (/demos/)', () => {
    let content;
    it('file exists on disk and is readable', () => {
      assert.ok(fs.existsSync(DEMOS_HUB_HTML), 'demos/index.html must exist');
      content = fs.readFileSync(DEMOS_HUB_HTML, 'utf8');
    });

    it('has valid metadata, canonical link, and 110-155 character description', () => {
      assert.ok(content.includes('<link rel="canonical" href="https://extensionguy.me/demos/">'), 'Canonical URL');
      const descMatch = content.match(/<meta name="description" content="([^"]+)">/);
      assert.ok(descMatch, 'meta description exists');
      const desc = descMatch[1];
      assert.ok(desc.length >= 110 && desc.length <= 155, `Meta description (${desc.length} chars) in [110, 155]`);
    });

    it('features all 4 interactive demo cards', () => {
      assert.ok(content.includes('href="./table-extraction/"'), 'Links to table extraction demo');
      assert.ok(content.includes('href="./seo-audit-sandbox/"'), 'Links to seo audit sandbox');
      assert.ok(content.includes('href="./overleaf-preamble-checker/"'), 'Links to overleaf checker');
      assert.ok(content.includes('href="./bulk-download/"'), 'Links to bulk download playground');
    });

    it('contains valid JSON-LD CollectionPage and BreadcrumbList schemas', () => {
      const match = content.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      assert.ok(match, 'JSON-LD block present');
      const parsed = JSON.parse(match[1]);
      assert.equal(parsed['@context'], 'https://schema.org');
      assert.ok(Array.isArray(parsed['@graph']), '@graph array present');

      const coll = parsed['@graph'].find(item => item['@type'] === 'CollectionPage');
      assert.ok(coll, 'CollectionPage schema exists');
      assert.equal(coll.url, 'https://extensionguy.me/demos/');

      const breadcrumb = parsed['@graph'].find(item => item['@type'] === 'BreadcrumbList');
      assert.ok(breadcrumb, 'BreadcrumbList schema exists');
      assert.equal(breadcrumb.itemListElement.length, 2, 'Breadcrumbs has 2 levels');
    });

    it('does NOT contain forbidden words, placeholders, or empty headings', () => {
      const textOnly = stripCodeAndScripts(content);
      const forbiddenMatch = textOnly.match(FORBIDDEN_WORDS_REGEX);
      assert.equal(forbiddenMatch, null, `Found forbidden claim word: ${forbiddenMatch ? forbiddenMatch[0] : ''}`);
      assert.ok(!/<h[1-6][^>]*>\s*<\/h[1-6]>/i.test(content), 'No empty headings');
      assert.ok(!content.includes('TODO') && !content.includes('FIXME'), 'No placeholders');
    });
  });

  describe('3. Bulk Download Test Playground (/demos/bulk-download/)', () => {
    let content;
    it('files exist on disk', () => {
      assert.ok(fs.existsSync(BULK_DEMO_HTML), 'demos/bulk-download/index.html must exist');
      assert.ok(fs.existsSync(BULK_DEMO_JS), 'assets/js/bulk-download-demo.js must exist');
      content = fs.readFileSync(BULK_DEMO_HTML, 'utf8');
    });

    it('has valid metadata, canonical link, and 110-155 character description', () => {
      assert.ok(content.includes('<link rel="canonical" href="https://extensionguy.me/demos/bulk-download/">'), 'Canonical URL');
      const descMatch = content.match(/<meta name="description" content="([^"]+)">/);
      assert.ok(descMatch, 'meta description exists');
      const desc = descMatch[1];
      assert.ok(desc.length >= 110 && desc.length <= 155, `Meta description (${desc.length} chars) in [110, 155]`);
    });

    it('.file-meta uses var(--text-secondary) for WCAG AA contrast compliance (U2)', () => {
      assert.ok(content.includes('color: var(--text-secondary);'), '.file-meta must use var(--text-secondary)');
      assert.ok(!content.includes('.file-meta {\n      font-size: 0.8rem;\n      color: var(--text-tertiary);\n    }'), 'Must not use var(--text-tertiary)');
    });

    it('contains all required sample resource testing sections', () => {
      // PDF documents
      assert.ok(content.includes('sample-quarterly-report.pdf'), 'PDF sample 1 present');
      assert.ok(content.includes('sample-technical-whitepaper.pdf'), 'PDF sample 2 present');
      assert.ok(content.includes('sample-product-datasheet.pdf'), 'PDF sample 3 present');
      assert.ok(content.includes('sample-compliance-summary.pdf'), 'PDF sample 4 present');

      // Images
      assert.ok(content.includes('sample-analytics-chart.png'), 'PNG sample 1 present');
      assert.ok(content.includes('sample-workflow-diagram.png'), 'PNG sample 2 present');
      assert.ok(content.includes('sample-architecture-render.jpg'), 'JPG sample 1 present');
      assert.ok(content.includes('sample-interface-mockup.jpg'), 'JPG sample 2 present');

      // CSV & TXT
      assert.ok(content.includes('sample-metrics-export.csv'), 'CSV sample 1 present');
      assert.ok(content.includes('sample-inventory-data.csv'), 'CSV sample 2 present');
      assert.ok(content.includes('sample-release-notes.txt'), 'TXT sample 1 present');
      assert.ok(content.includes('sample-checksum-manifest.txt'), 'TXT sample 2 present');

      // Dynamic DOM injection interactive sandbox
      assert.ok(content.includes('id="dynamicLinksContainer"'), 'Dynamic container exists');
      assert.ok(content.includes('id="revealDynamicBtn"'), 'Load dynamic assets button exists');
      assert.ok(content.includes('id="resetDynamicBtn"'), 'Reset dynamic assets button exists');
      assert.ok(content.includes('id="dynamicStatus"'), 'Dynamic status element exists');
    });

    it('links to official store listings and companion guide', () => {
      assert.ok(content.includes('https://microsoftedge.microsoft.com/addons/detail/bulkgrab-batch-file-dow/cphidoikhnjdkeldgelkpddnkojlfccc'), 'Edge Store link');
      assert.ok(content.includes('https://chromewebstore.google.com/detail/bulkgrab-batch-file-downl/lnmmneljpgdefilkokfpmiohjgfjcljn'), 'Chrome Web Store link');
      assert.ok(content.includes('href="../../guides/download-multiple-pdfs/"'), 'Links to companion PDF guide');
    });

    it('contains valid WebApplication and 3-tier BreadcrumbList JSON-LD schemas', () => {
      const match = content.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      assert.ok(match, 'JSON-LD block present');
      const parsed = JSON.parse(match[1]);
      assert.equal(parsed['@context'], 'https://schema.org');
      assert.ok(Array.isArray(parsed['@graph']), '@graph array present');

      const app = parsed['@graph'].find(item => item['@type'] === 'WebApplication');
      assert.ok(app, 'WebApplication schema exists');
      assert.equal(app.url, 'https://extensionguy.me/demos/bulk-download/');

      const breadcrumb = parsed['@graph'].find(item => item['@type'] === 'BreadcrumbList');
      assert.ok(breadcrumb, 'BreadcrumbList schema exists');
      assert.equal(breadcrumb.itemListElement.length, 3, 'Breadcrumbs has 3 levels');
      assert.equal(breadcrumb.itemListElement[0].item, 'https://extensionguy.me/');
      assert.equal(breadcrumb.itemListElement[1].item, 'https://extensionguy.me/demos/');
      assert.equal(breadcrumb.itemListElement[2].item, 'https://extensionguy.me/demos/bulk-download/');
    });

    it('does NOT contain forbidden words, placeholders, or empty headings', () => {
      const textOnly = stripCodeAndScripts(content);
      const forbiddenMatch = textOnly.match(FORBIDDEN_WORDS_REGEX);
      assert.equal(forbiddenMatch, null, `Found forbidden claim word: ${forbiddenMatch ? forbiddenMatch[0] : ''}`);
      assert.ok(!/<h[1-6][^>]*>\s*<\/h[1-6]>/i.test(content), 'No empty headings');
      assert.ok(!content.includes('TODO') && !content.includes('FIXME'), 'No placeholders');
    });
  });

  describe('4. Companion Technical Guide (/guides/download-multiple-pdfs/)', () => {
    let content;
    it('file exists on disk and is readable', () => {
      assert.ok(fs.existsSync(PDF_GUIDE_HTML), 'guides/download-multiple-pdfs/index.html must exist');
      content = fs.readFileSync(PDF_GUIDE_HTML, 'utf8');
    });

    it('covers all required technical sections accurately', () => {
      assert.ok(content.includes('1. Why Manual PDF Downloading is Tedious'), 'Section 1');
      assert.ok(content.includes('2. How Websites Expose Downloadable PDF Links'), 'Section 2');
      assert.ok(content.includes('3. How Browser Extensions Discover Links'), 'Section 3');
      assert.ok(content.includes('4. Filtering Extensions and MIME Types'), 'Section 4');
      assert.ok(content.includes('5. Browser Download Restrictions'), 'Section 5');
      assert.ok(content.includes('6. Handling Duplicate Filenames and Sanitization'), 'Section 6');
      assert.ok(content.includes('7. Privacy Considerations'), 'Section 7');
      assert.ok(content.includes('8. Testing the Workflow in our Interactive Playground'), 'Section 8');
      assert.ok(content.includes('Primary Documentation References'), 'Section 9');
    });

    it('links to Bulk Download Playground and BulkGrab product page', () => {
      assert.ok(content.includes('href="../../demos/bulk-download/"'), 'Links to bulk download playground');
      assert.ok(content.includes('href="../../bulkgrab/"'), 'Links to bulkgrab product page');
    });
  });

  describe('5. Cross-Site Integration & Navigation Consistency', () => {
    it('sitemap.xml has at least 26 canonical URLs including new pages', () => {
      assert.ok(fs.existsSync(SITEMAP_PATH), 'sitemap.xml must exist');
      const sitemap = fs.readFileSync(SITEMAP_PATH, 'utf8');
      const locMatches = sitemap.match(/<loc>([^<]+)<\/loc>/g) || [];
      assert.ok(locMatches.length >= 26, `Sitemap must contain at least 26 URLs, found ${locMatches.length}`);
      assert.ok(sitemap.includes('<loc>https://extensionguy.me/demos/</loc>'), 'Sitemap has /demos/');
      assert.ok(sitemap.includes('<loc>https://extensionguy.me/demos/bulk-download/</loc>'), 'Sitemap has /demos/bulk-download/');
      assert.ok(sitemap.includes('<loc>https://extensionguy.me/guides/download-multiple-pdfs/</loc>'), 'Sitemap has /guides/download-multiple-pdfs/');
    });

    it('bulkgrab/index.html has playground banner and guide card', () => {
      const bgContent = fs.readFileSync(BULKGRAB_PROD_HTML, 'utf8');
      assert.ok(bgContent.includes('href="../demos/bulk-download/"'), 'Banner links to playground');
      assert.ok(bgContent.includes('href="../guides/download-multiple-pdfs/"'), 'Card links to companion guide');
    });

    it('guides/index.html links to download-multiple-pdfs guide', () => {
      const gContent = fs.readFileSync(GUIDES_HUB_HTML, 'utf8');
      assert.ok(gContent.includes('href="./download-multiple-pdfs/"'), 'Guides hub has card 9');
    });

    it('homepage index.html contains /demos/ navigation and footer links while preserving seams', () => {
      const indexContent = fs.readFileSync(INDEX_HTML, 'utf8');
      assert.ok(indexContent.includes('href="/demos/"'), 'Homepage links to /demos/');
      assert.ok(indexContent.includes('href="#live-converter"'), 'Homepage preserves live-converter test seam');
      assert.ok(indexContent.includes('href="#guides"'), 'Homepage preserves guides test seam');
    });
  });

  describe('6. Sample Data Integrity & Synthetic Labeling (VISIBILITY-12B)', () => {
    it('sample-metrics-export.csv contains no "VERIFIED" claims, no <50ms claims, and is labeled SYNTHETIC_DEMO', () => {
      const csvPath = path.join(SAMPLES_DIR, 'sample-metrics-export.csv');
      const content = fs.readFileSync(csvPath, 'utf8');
      assert.ok(!/VERIFIED/i.test(content), 'Must not contain VERIFIED claims');
      assert.ok(content.includes('SYNTHETIC_DEMO'), 'Must have SYNTHETIC_DEMO classification');

      const lines = content.trim().split('\n');
      const header = lines[0].split(',');
      const latencyIdx = header.indexOf('illustrative_latency_ms');
      assert.ok(latencyIdx >= 0, 'illustrative_latency_ms column exists');

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        const val = parseFloat(cols[latencyIdx]);
        assert.ok(!Number.isNaN(val), `Row ${i} latency must be numeric`);
        assert.ok(val >= 50, `Row ${i} latency (${val}ms) must not claim <50ms overhead`);
      }
    });

    it('sample-inventory-data.csv contains actual disk byte sizes and genuine SHA-256 hashes for all 10 assets', () => {
      const csvPath = path.join(SAMPLES_DIR, 'sample-inventory-data.csv');
      const content = fs.readFileSync(csvPath, 'utf8');
      assert.ok(!content.includes('sample-inventory-data.csv'), 'Non-self-referential: must not contain itself');
      assert.ok(!content.includes('sample-checksum-manifest.txt'), 'Must not list manifest');

      const lines = content.trim().split('\n');
      const header = lines[0].split(',');
      assert.deepEqual(header, ['sample_id', 'filename', 'media_type', 'byte_size', 'sha256_checksum', 'data_classification']);

      const rows = lines.slice(1);
      assert.equal(rows.length, 10, 'Must list exactly 10 media and data assets');

      for (const row of rows) {
        const [, filename, , bytesStr, expectedHash, classification] = row.split(',');
        assert.equal(classification, 'SYNTHETIC_DEMO', `${filename} marked as SYNTHETIC_DEMO`);

        const filePath = path.join(SAMPLES_DIR, filename);
        assert.ok(fs.existsSync(filePath), `File ${filename} must exist`);

        const actualSize = fs.statSync(filePath).size;
        assert.equal(actualSize, Number(bytesStr), `File ${filename} actual size (${actualSize}) must match CSV (${bytesStr})`);

        const fileBuffer = fs.readFileSync(filePath);
        const actualHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        assert.equal(actualHash, expectedHash, `File ${filename} actual SHA-256 must match CSV hash`);
      }
    });

    it('sample-checksum-manifest.txt contains genuine SHA-256 checksums for all 11 other files and is non-self-referential', () => {
      const manifestPath = path.join(SAMPLES_DIR, 'sample-checksum-manifest.txt');
      const content = fs.readFileSync(manifestPath, 'utf8');

      const checksumLines = content
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#'));

      assert.equal(checksumLines.length, 11, 'Manifest must have exactly 11 checksum lines');

      for (const line of checksumLines) {
        const match = line.match(/^([a-f0-9]{64})\s+(.+)$/);
        assert.ok(match, `Line must match sha256sum format: ${line}`);
        const [, expectedHash, filename] = match;

        assert.notEqual(filename, 'sample-checksum-manifest.txt', 'Non-self-referential: manifest must not list itself');

        const filePath = path.join(SAMPLES_DIR, filename);
        assert.ok(fs.existsSync(filePath), `Target file ${filename} must exist on disk`);

        const actualHash = crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
        assert.equal(actualHash, expectedHash, `Checksum for ${filename} must match manifest`);
      }
    });

    it('sample image formats represent exactly 2 PNG and 2 JPEG images', () => {
      const png1 = fs.readFileSync(path.join(SAMPLES_DIR, 'sample-analytics-chart.png'));
      const png2 = fs.readFileSync(path.join(SAMPLES_DIR, 'sample-workflow-diagram.png'));
      const jpg1 = fs.readFileSync(path.join(SAMPLES_DIR, 'sample-architecture-render.jpg'));
      const jpg2 = fs.readFileSync(path.join(SAMPLES_DIR, 'sample-interface-mockup.jpg'));

      assert.equal(png1.subarray(1, 4).toString('ascii'), 'PNG', 'First image is PNG');
      assert.equal(png2.subarray(1, 4).toString('ascii'), 'PNG', 'Second image is PNG');
      assert.equal(jpg1[0], 0xff, 'Third image is JPEG');
      assert.equal(jpg1[1], 0xd8, 'Third image is JPEG');
      assert.equal(jpg2[0], 0xff, 'Fourth image is JPEG');
      assert.equal(jpg2[1], 0xd8, 'Fourth image is JPEG');

      const bulkDemoHtml = fs.readFileSync(BULK_DEMO_HTML, 'utf8');
      assert.ok(bulkDemoHtml.includes('4 Files · 2 PNG, 2 JPEG'), 'Demo page specifies 2 PNG, 2 JPEG');
    });

    it('sample PDFs are all labeled with synthetic demonstration headers', () => {
      const pdfFiles = [
        'sample-quarterly-report.pdf',
        'sample-technical-whitepaper.pdf',
        'sample-product-datasheet.pdf',
        'sample-compliance-summary.pdf',
      ];

      for (const file of pdfFiles) {
        const text = fs.readFileSync(path.join(SAMPLES_DIR, file), 'utf8');
        assert.ok(text.includes('Synthetic Demonstration'), `${file} must include Synthetic Demonstration`);
      }
    });

    it('claims accurately distinguish BulkGrab Free (seven downloads) and Pro ($9.99 USD) and cross-origin context', () => {
      const demoHtml = fs.readFileSync(BULK_DEMO_HTML, 'utf8');
      assert.ok(
        demoHtml.includes('BulkGrab Free allows up to seven individual file downloads per browser session. BulkGrab Pro removes that session limit and adds ZIP bundling on your device.'),
        'Demo states BulkGrab Free seven downloads limit and Pro ZIP bundling'
      );
      assert.ok(demoHtml.includes('$9.99 USD'), 'Demo states Pro tier price');
      assert.ok(demoHtml.includes('NOWPayments'), 'Demo states NOWPayments');
      assert.ok(demoHtml.includes('same-origin fixtures'), 'Demo clarifies same-origin vs cross-origin');

      const guideHtml = fs.readFileSync(PDF_GUIDE_HTML, 'utf8');
      assert.ok(
        guideHtml.includes('BulkGrab Free allows up to seven individual file downloads per browser session. BulkGrab Pro removes that session limit and adds ZIP bundling on your device.'),
        'Guide states BulkGrab Free seven downloads limit and Pro ZIP bundling'
      );
      assert.ok(guideHtml.includes('same-origin fixtures'), 'Guide clarifies same-origin fixtures');
    });
  });
});
