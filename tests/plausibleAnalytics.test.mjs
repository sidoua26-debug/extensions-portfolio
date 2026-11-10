import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

function getSitemapPages() {
  const sitemapXml = fs.readFileSync(path.join(ROOT_DIR, 'sitemap.xml'), 'utf8');
  const locs = [...sitemapXml.matchAll(/<loc>https:\/\/extensionguy\.me\/([^<]*)<\/loc>/g)].map(m => m[1]);
  return locs.map(loc => {
    if (!loc) return 'index.html';
    if (loc === 'privacy') return 'privacy.html';
    return loc.endsWith('/') ? `${loc}index.html` : `${loc}/index.html`;
  });
}

describe('Plausible Privacy-First Analytics Integration Removal', () => {

  it('1. Local initialization script has been removed', () => {
    const initPath = path.join(ROOT_DIR, 'assets/js/plausible-init.js');
    assert.ok(!fs.existsSync(initPath), 'assets/js/plausible-init.js must not exist');
  });

  it('2. All sitemap pages contain zero Plausible scripts or integration', () => {
    const pages = getSitemapPages();
    assert.ok(pages.length >= 17, `Expected at least 17 sitemap pages, found ${pages.length}`);

    for (const pageRel of pages) {
      const pagePath = path.join(ROOT_DIR, pageRel);
      assert.ok(fs.existsSync(pagePath), `Page file ${pageRel} must exist`);
      const html = fs.readFileSync(pagePath, 'utf8');

      assert.ok(!html.includes('https://plausible.io'), `${pageRel} must not contain plausible.io`);
      assert.ok(!html.includes('plausible-init.js'), `${pageRel} must not contain plausible-init.js`);
      assert.ok(!html.includes('plausible'), `${pageRel} must not contain plausible references`);
    }
  });

  it('3. 404 error page contains zero Plausible scripts or integration', () => {
    const pagePath = path.join(ROOT_DIR, '404.html');
    const html = fs.readFileSync(pagePath, 'utf8');

    assert.ok(!html.includes('https://plausible.io'), '404.html must not contain plausible.io');
    assert.ok(!html.includes('plausible-init.js'), '404.html must not contain plausible-init.js');
    assert.ok(!html.includes('plausible'), '404.html must not contain plausible references');
  });

  it('4. build_redesign.py generator and index.html contain zero Plausible references', () => {
    const generatorPath = path.join(ROOT_DIR, 'build_redesign.py');
    const generatorContent = fs.readFileSync(generatorPath, 'utf8');

    assert.ok(!generatorContent.includes('plausible.io'), 'build_redesign.py must not reference plausible.io');
    assert.ok(!generatorContent.includes('plausible-init.js'), 'build_redesign.py must not reference plausible-init.js');

    const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
    assert.ok(!indexHtml.includes('plausible.io'), 'index.html must not reference plausible.io');
    assert.ok(!indexHtml.includes('plausible-init.js'), 'index.html must not reference plausible-init.js');
  });

  it('5. _headers Content-Security-Policy and pdf-tools meta CSP do not permit Plausible origins', () => {
    const headersPath = path.join(ROOT_DIR, '_headers');
    const headersContent = fs.readFileSync(headersPath, 'utf8');

    const cspMatch = headersContent.match(/Content-Security-Policy:\s*([^\r\n]+)/);
    assert.ok(cspMatch, '_headers must define Content-Security-Policy');
    const csp = cspMatch[1];

    // Verify script-src
    const scriptSrcMatch = csp.match(/script-src\s+([^;]+);/);
    assert.ok(scriptSrcMatch, 'CSP must contain script-src');
    const scriptSrc = scriptSrcMatch[1];
    assert.ok(scriptSrc.includes("'self'"), "script-src must include 'self'");
    assert.ok(!scriptSrc.includes('plausible.io'), "script-src must NOT contain plausible.io");
    assert.ok(!scriptSrc.includes("'unsafe-inline'"), "script-src must NOT contain 'unsafe-inline'");

    // Verify connect-src
    const connectSrcMatch = csp.match(/connect-src\s+([^;]+);/);
    assert.ok(connectSrcMatch, 'CSP must contain connect-src');
    const connectSrc = connectSrcMatch[1];
    assert.ok(connectSrc.includes("'self'"), "connect-src must include 'self'");
    assert.ok(!connectSrc.includes('plausible.io'), "connect-src must NOT contain plausible.io");

    // Verify plausible-init.js caching rule is removed
    assert.ok(!headersContent.includes('/assets/js/plausible-init.js'), '_headers must not contain rule for plausible-init.js');

    // Verify pdf-tools/index.html meta Content-Security-Policy parity
    const pdfHtml = fs.readFileSync(path.join(ROOT_DIR, 'pdf-tools/index.html'), 'utf8');
    const pdfCspMatch = pdfHtml.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i);
    assert.ok(pdfCspMatch, 'pdf-tools/index.html must define meta Content-Security-Policy');
    const pdfCsp = pdfCspMatch[1];
    assert.ok(!pdfCsp.includes('plausible.io'), 'pdf-tools meta CSP must not include plausible.io');
    const pdfScriptSrcMatch = pdfCsp.match(/script-src\s+([^;]+);/);
    assert.ok(pdfScriptSrcMatch, 'pdf-tools meta CSP must define script-src');
    assert.ok(!pdfScriptSrcMatch[1].includes("'unsafe-inline'"), 'pdf-tools meta script-src must not include unsafe-inline');
  });

  it('6. Privacy Policy accurately details zero analytics, cloudflare hosting logs, and local device processing', () => {
    const privacyPath = path.join(ROOT_DIR, 'privacy.html');
    const privacyHtml = fs.readFileSync(privacyPath, 'utf8');

    // Section 2 disclosures: zero Plausible
    assert.ok(!privacyHtml.includes('Plausible'), 'privacy.html must not mention Plausible');
    assert.ok(!privacyHtml.includes('plausible.io'), 'privacy.html must not mention plausible.io');

    // Cloudflare hosting logs
    assert.ok(privacyHtml.includes('Hosting and Infrastructure Server Logs'), 'privacy.html discloses hosting logs');
    assert.ok(privacyHtml.includes('Cloudflare Pages'), 'privacy.html discloses Cloudflare Pages hosting');
    assert.ok(privacyHtml.includes('Cloudflare Privacy Policy') || privacyHtml.includes('https://www.cloudflare.com/privacypolicy/'), 'privacy.html links Cloudflare Privacy Policy');

    // Local device processing
    assert.ok(privacyHtml.includes('fonts and processing assets are self-hosted'), 'privacy.html states fonts and processing assets are self-hosted');
    assert.ok(privacyHtml.includes('PDF files are processed on your device'), 'privacy.html retains PDF on-device processing statement');
    assert.ok(privacyHtml.includes('no documents or files are transmitted to external servers'), 'privacy.html confirms documents are not transmitted externally');
  });

  it('7. Product functionality and browser store links remain unaltered', () => {
    const seoHtml = fs.readFileSync(path.join(ROOT_DIR, 'seo-inspector/index.html'), 'utf8');
    assert.ok(seoHtml.includes('https://microsoftedge.microsoft.com/addons/detail/seo-inspector-meta-tags/jbnjjkfkcmfkjamakndojbkjanijlfmd'), 'SEO Inspector Edge Add-on link preserved');

    const w2lHtml = fs.readFileSync(path.join(ROOT_DIR, 'word-to-latex/index.html'), 'utf8');
    assert.ok(w2lHtml.includes('microsoftedge.microsoft.com'), 'Word to LaTeX Edge Add-on link preserved');

    const tableHtml = fs.readFileSync(path.join(ROOT_DIR, 'table-extractor/index.html'), 'utf8');
    assert.ok(tableHtml.includes('microsoftedge.microsoft.com'), 'Table Extractor Edge Add-on link preserved');
  });
});
