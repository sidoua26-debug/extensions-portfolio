import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

const SITEMAP_PAGES = [
  'index.html',
  'word-to-latex/index.html',
  'word-to-latex-converter/index.html',
  'pdf-tools/index.html',
  'table-extractor/index.html',
  'bulkgrab/index.html',
  'seo-inspector/index.html',
  'bilexi/index.html',
  'tab-vault/index.html',
  'privacy.html',
  'changelog/index.html',
  'guides/index.html',
  'guides/docx-to-latex-offline/index.html',
  'guides/word-tables-to-latex/index.html',
  'guides/export-virtualized-tables-to-excel/index.html',
  'guides/prevent-browser-tab-loss-local-backups/index.html',
  'guides/type-french-accents-on-qwerty-offline/index.html'
];

const OFFICIAL_SCRIPT_URL = 'https://plausible.io/js/pa-Uu6xph5PEciiqhKs8UXgI.js';

describe('Plausible Privacy-First Analytics Integration', () => {

  it('1. Local initialization script exists, is valid JS, and initializes window.plausible correctly', async () => {
    const initPath = path.join(ROOT_DIR, 'assets/js/plausible-init.js');
    assert.ok(fs.existsSync(initPath), 'assets/js/plausible-init.js must exist');
    const initCode = fs.readFileSync(initPath, 'utf8');

    // Simulate in an isolated browser-like global scope
    const context = {};
    context.window = context;
    const { runInNewContext } = await import('node:vm');
    runInNewContext(initCode, context);

    assert.equal(typeof context.plausible, 'function', 'window.plausible must be a function');
    assert.equal(typeof context.plausible.init, 'function', 'plausible.init must be a function');
    assert.ok(context.plausible.o, 'plausible.o must be initialized');

    // Test queueing behavior before remote script loads
    context.plausible('testEvent', { props: { key: 'value' } });
    assert.equal(context.plausible.q.length, 1);
    assert.equal(context.plausible.q[0][0], 'testEvent');
  });

  it('2. All 17 sitemap pages include Plausible init and official script exactly once in correct load order', () => {
    for (const pageRel of SITEMAP_PAGES) {
      const pagePath = path.join(ROOT_DIR, pageRel);
      assert.ok(fs.existsSync(pagePath), `Page file ${pageRel} must exist`);
      const html = fs.readFileSync(pagePath, 'utf8');

      // Check official script
      const officialMatches = html.match(/https:\/\/plausible\.io\/js\/pa-Uu6xph5PEciiqhKs8UXgI\.js/g) || [];
      assert.equal(officialMatches.length, 1, `${pageRel} must contain official Plausible script exactly once`);

      // Check local init script
      const initMatches = html.match(/plausible-init\.js/g) || [];
      assert.equal(initMatches.length, 1, `${pageRel} must contain plausible-init.js exactly once`);

      // Check load order: init must come BEFORE official script
      const initIdx = html.indexOf('plausible-init.js');
      const officialIdx = html.indexOf(OFFICIAL_SCRIPT_URL);
      assert.ok(initIdx > 0 && officialIdx > 0, `${pageRel} must have both scripts in HTML`);
      assert.ok(initIdx < officialIdx, `${pageRel} plausible-init.js must load before official Plausible script`);

      // Check script tag attributes
      const scriptTagMatch = html.match(/<script[^>]+src="https:\/\/plausible\.io\/js\/pa-Uu6xph5PEciiqhKs8UXgI\.js"[^>]*>/);
      assert.ok(scriptTagMatch, `${pageRel} must contain valid <script> tag for Plausible`);
      assert.ok(scriptTagMatch[0].includes('async'), `${pageRel} Plausible script must have async attribute`);

      // Verify no inline Plausible scripts were added to the page
      assert.ok(!html.includes('plausible.init()'), `${pageRel} must not contain inline plausible.init()`);
    }
  });

  it('3. 404 error page also includes Plausible tracking and correct load order', () => {
    const pagePath = path.join(ROOT_DIR, '404.html');
    const html = fs.readFileSync(pagePath, 'utf8');

    const officialMatches = html.match(/https:\/\/plausible\.io\/js\/pa-Uu6xph5PEciiqhKs8UXgI\.js/g) || [];
    assert.equal(officialMatches.length, 1, '404.html must contain official Plausible script exactly once');

    const initMatches = html.match(/plausible-init\.js/g) || [];
    assert.equal(initMatches.length, 1, '404.html must contain plausible-init.js exactly once');

    const initIdx = html.indexOf('plausible-init.js');
    const officialIdx = html.indexOf(OFFICIAL_SCRIPT_URL);
    assert.ok(initIdx < officialIdx, '404.html plausible-init.js must load before official Plausible script');
  });

  it('4. build_redesign.py generator contains Plausible integration and generates index.html parity', () => {
    const generatorPath = path.join(ROOT_DIR, 'build_redesign.py');
    const generatorContent = fs.readFileSync(generatorPath, 'utf8');

    assert.ok(generatorContent.includes(OFFICIAL_SCRIPT_URL), 'build_redesign.py must reference official script URL');
    assert.ok(generatorContent.includes('assets/js/plausible-init.js'), 'build_redesign.py must reference plausible-init.js');

    const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
    assert.ok(indexHtml.includes(OFFICIAL_SCRIPT_URL), 'index.html must reference official script URL');
    assert.ok(indexHtml.includes('assets/js/plausible-init.js'), 'index.html must reference plausible-init.js');
  });

  it('5. _headers Content-Security-Policy permits Plausible origin with narrow scope', () => {
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
    assert.ok(scriptSrc.includes('https://plausible.io'), "script-src must include https://plausible.io");
    assert.ok(!scriptSrc.includes("'unsafe-inline'"), "script-src must NOT contain 'unsafe-inline'");

    // Verify connect-src
    const connectSrcMatch = csp.match(/connect-src\s+([^;]+);/);
    assert.ok(connectSrcMatch, 'CSP must contain connect-src');
    const connectSrc = connectSrcMatch[1];
    assert.ok(connectSrc.includes("'self'"), "connect-src must include 'self'");
    assert.ok(connectSrc.includes('https://plausible.io'), "connect-src must include https://plausible.io");

    // Verify plausible-init.js caching rule exists
    assert.ok(headersContent.includes('/assets/js/plausible-init.js'), '_headers must include rule for plausible-init.js');

    // Verify pdf-tools/index.html meta Content-Security-Policy parity
    const pdfHtml = fs.readFileSync(path.join(ROOT_DIR, 'pdf-tools/index.html'), 'utf8');
    const pdfCspMatch = pdfHtml.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i);
    assert.ok(pdfCspMatch, 'pdf-tools/index.html must define meta Content-Security-Policy');
    const pdfCsp = pdfCspMatch[1];
    assert.ok(pdfCsp.includes("script-src 'self' 'wasm-unsafe-eval' https://plausible.io;"), 'pdf-tools meta CSP must include https://plausible.io in script-src');
    assert.ok(pdfCsp.includes("connect-src 'self' https://plausible.io;"), 'pdf-tools meta CSP must include https://plausible.io in connect-src');
    const pdfScriptSrcMatch = pdfCsp.match(/script-src\s+([^;]+);/);
    assert.ok(pdfScriptSrcMatch, 'pdf-tools meta CSP must define script-src');
    assert.ok(!pdfScriptSrcMatch[1].includes("'unsafe-inline'"), 'pdf-tools meta script-src must not include unsafe-inline');
  });

  it('6. Privacy Policy accurately details cookieless analytics, no PII, extension telemetry, and blocking rights', () => {
    const privacyPath = path.join(ROOT_DIR, 'privacy.html');
    const privacyHtml = fs.readFileSync(privacyPath, 'utf8');

    // Section 2 disclosures
    assert.ok(privacyHtml.includes('Plausible Analytics'), 'privacy.html must mention Plausible Analytics');
    assert.ok(privacyHtml.includes('measure website visits and related usage statistics'), 'privacy.html must state Plausible measures visits and usage statistics');
    assert.ok(privacyHtml.includes('analytics cookies or persistent cross-site identifiers'), 'privacy.html must confirm no cookies or persistent cross-site identifiers');
    assert.ok(privacyHtml.includes('IP and User-Agent information may be processed transiently'), 'privacy.html must disclose transient IP/User-Agent processing');
    assert.ok(privacyHtml.includes('raw IP and User-Agent values are not stored by Plausible'), 'privacy.html must confirm raw IP/User-Agent not stored');
    assert.ok(privacyHtml.includes('website page paths, referrers, and basic device information'), 'privacy.html must disclose page paths, referrers, device info');
    assert.ok(privacyHtml.includes('do not deploy Google Analytics or advertising trackers'), 'privacy.html must state no GA or advertising trackers');
    assert.ok(privacyHtml.includes('Browser extension telemetry remains completely disabled'), 'privacy.html must confirm extension telemetry remains disabled');
    assert.ok(privacyHtml.includes('uploaded filenames'), 'privacy.html must confirm uploaded filenames not sent');
    assert.ok(privacyHtml.includes('payment identifiers'), 'privacy.html must explain payment identifiers are not sent');
    assert.ok(privacyHtml.includes('block Plausible using standard adblockers'), 'privacy.html must inform visitors they may block Plausible');
    assert.ok(!privacyHtml.includes('We do not deploy Google Analytics, advertising tracking pixels, marketing cookies, session replay tools, or cross-site fingerprinting scripts. Cloudflare Pages may inject an optional Web Analytics beacon into delivered pages; however, the Site\'s Content Security Policy blocks this third-party script from executing in the browser. Consequently, this beacon does not collect client-side pageview or performance measurements'), 'Outdated statement claiming no analytics must be replaced');
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
