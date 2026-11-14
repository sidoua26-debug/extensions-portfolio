import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const SANDBOX_HTML_PATH = path.join(rootDir, 'demos/seo-audit-sandbox/index.html');
const SANDBOX_JS_PATH = path.join(rootDir, 'assets/js/seo-audit-sandbox.js');
const GUIDE_HTML_PATH = path.join(rootDir, 'guides/audit-json-ld-and-headings-in-browser/index.html');
const SEO_INSPECTOR_HTML_PATH = path.join(rootDir, 'seo-inspector/index.html');
const GUIDES_HUB_PATH = path.join(rootDir, 'guides/index.html');
const SITEMAP_PATH = path.join(rootDir, 'sitemap.xml');

const FORBIDDEN_WORDS_REGEX = /\b(zero|never|always|100%|completely|entirely|permanent|guarantee|unlimited|nothing|no one)\b/i;

function stripCodeAndScripts(content) {
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<pre\b[^<]*(?:(?!<\/pre>)<[^<]*)*<\/pre>/gi, '')
    .replace(/<code\b[^<]*(?:(?!<\/code>)<[^<]*)*<\/code>/gi, '')
    .replace(/<[^>]+>/g, ' ');
}

describe('SEO Audit Sandbox & Companion Guide Validation', () => {
  it('1. Required files exist on disk', () => {
    assert.ok(fs.existsSync(SANDBOX_HTML_PATH), 'demos/seo-audit-sandbox/index.html must exist');
    assert.ok(fs.existsSync(SANDBOX_JS_PATH), 'assets/js/seo-audit-sandbox.js must exist');
    assert.ok(fs.existsSync(GUIDE_HTML_PATH), 'guides/audit-json-ld-and-headings-in-browser/index.html must exist');
  });

  describe('2. Interactive SEO Audit Sandbox (/demos/seo-audit-sandbox/)', () => {
    const html = fs.readFileSync(SANDBOX_HTML_PATH, 'utf8');

    it('has valid canonical URL, meta description (110-155 chars), and title', () => {
      assert.ok(
        html.includes('<link rel="canonical" href="https://extensionguy.me/demos/seo-audit-sandbox/">'),
        'Sandbox canonical link must point to self'
      );

      const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/);
      assert.ok(titleMatch, 'Title must exist');
      assert.ok(titleMatch[1].includes('SEO') && titleMatch[1].includes('Sandbox'), 'Title describes sandbox');

      const descMatch = html.match(/<meta name="description" content="([^"]+)">/);
      assert.ok(descMatch, 'Meta description must exist');
      const desc = descMatch[1].trim();
      assert.ok(
        desc.length >= 110 && desc.length <= 155,
        `Sandbox meta description (${desc.length} chars) out of range [110, 155]: "${desc}"`
      );
    });

    it('contains zero forbidden claim words in visible prose', () => {
      const textOnly = stripCodeAndScripts(html);
      const match = textOnly.match(FORBIDDEN_WORDS_REGEX);
      assert.equal(match, null, `Forbidden word "${match ? match[0] : ''}" found in sandbox prose`);
    });

    it('promotes official Edge Add-on and does NOT advertise a Chrome version', () => {
      assert.ok(
        html.includes('https://microsoftedge.microsoft.com/addons/detail/seo-inspector-meta-tags/jbnjjkfkcmfkjamakndojbkjanijlfmd'),
        'Must link to official Microsoft Edge Add-ons listing'
      );
      assert.ok(!html.includes('chromewebstore.google.com/detail/seo-inspector'), 'Must NOT advertise Chrome SEO Inspector');
    });

    it('declares all 7 required scenarios, interactive controls, and reset button', () => {
      const requiredScenarios = [
        'missing-h1',
        'skipped-headings',
        'mismatched-canonical',
        'missing-og',
        'malformed-jsonld',
        'multiple-h1',
        'client-mutation'
      ];

      for (const scenario of requiredScenarios) {
        assert.ok(
          html.includes(`data-scenario-id="${scenario}"`),
          `Scenario card "${scenario}" must exist`
        );
        assert.ok(
          html.includes(`data-scenario-toggle="${scenario}"`),
          `Toggle button for "${scenario}" must exist`
        );
      }

      assert.ok(
        html.includes('data-sandbox-action="reset"'),
        'Reset all button must exist with data-sandbox-action="reset"'
      );
      assert.ok(
        html.includes('id="liveAuditStatusBox"'),
        'Live monitor readout container must exist'
      );
    });

    it('CSP compliant: loads external JS without inline executable script', () => {
      assert.ok(
        html.includes('<script src="../../assets/js/seo-audit-sandbox.js" defer></script>'),
        'External sandbox JS script tag required'
      );
      // Ensure no inline executable script tags other than application/ld+json
      const nonLdScripts = [...html.matchAll(/<script(?![^>]*type=["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/gi)];
      for (const match of nonLdScripts) {
        assert.equal(
          match[1].trim(),
          '',
          `Inline executable script found (violates CSP): ${match[0].slice(0, 100)}`
        );
      }
    });

    it('contains valid JSON-LD WebApplication and BreadcrumbList schemas', () => {
      const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      assert.ok(jsonLdMatch, 'JSON-LD block must exist');
      const parsed = JSON.parse(jsonLdMatch[1]);
      assert.equal(parsed['@context'], 'https://schema.org');
      assert.ok(Array.isArray(parsed['@graph']), '@graph array exists');

      const webApp = parsed['@graph'].find(item => item['@type'] === 'WebApplication');
      assert.ok(webApp, 'WebApplication schema present');
      assert.equal(webApp.url, 'https://extensionguy.me/demos/seo-audit-sandbox/');

      const breadcrumb = parsed['@graph'].find(item => item['@type'] === 'BreadcrumbList');
      assert.ok(breadcrumb, 'BreadcrumbList schema present');
      assert.equal(breadcrumb.itemListElement.length, 3, 'BreadcrumbList must have 3 levels');
      assert.equal(breadcrumb.itemListElement[0].name, 'Home');
      assert.equal(breadcrumb.itemListElement[1].name, 'Guides');
      assert.equal(breadcrumb.itemListElement[2].item, 'https://extensionguy.me/demos/seo-audit-sandbox/');
    });

    it('teaches accurate canonical concepts in Scenario 3 and rendering boundaries in Scenario 7', () => {
      assert.ok(
        html.includes('Slash and non-slash paths can be separate URLs, and either convention can be valid'),
        'Scenario 3 must teach that either slash convention can be valid'
      );
      assert.ok(
        html.includes('Google decides which canonical to use'),
        'Scenario 3 must state that Google decides which canonical to use'
      );
      assert.ok(
        html.includes('Google performs its own crawling and rendering'),
        'Scenario 7 must clarify that Google performs its own crawling and rendering'
      );
      assert.ok(
        html.includes('Google Search Console URL Inspection provides Google-specific evidence'),
        'Scenario 7 must reference Google Search Console URL Inspection'
      );
    });
  });

  describe('3. Companion Technical Guide (/guides/audit-json-ld-and-headings-in-browser/)', () => {
    const html = fs.readFileSync(GUIDE_HTML_PATH, 'utf8');

    it('has required title and meta description (110-155 chars)', () => {
      const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/);
      assert.ok(titleMatch, 'Title tag must exist');
      assert.ok(
        titleMatch[1].includes('How to Debug Headings, JSON-LD, and Canonical Tags in a Live Browser'),
        'Title must contain required copy'
      );

      const descMatch = html.match(/<meta name="description" content="([^"]+)">/);
      assert.ok(descMatch, 'Meta description must exist');
      const desc = descMatch[1].trim();
      assert.ok(
        desc.length >= 110 && desc.length <= 155,
        `Guide meta description (${desc.length} chars) out of range [110, 155]: "${desc}"`
      );
    });

    it('contains zero forbidden claim words in visible prose', () => {
      const textOnly = stripCodeAndScripts(html);
      const match = textOnly.match(FORBIDDEN_WORDS_REGEX);
      assert.equal(match, null, `Forbidden word "${match ? match[0] : ''}" found in guide prose`);
    });

    it('covers all 9 required structured sections', () => {
      const requiredSections = [
        'Why Rendered DOM Differs from Initial HTML',
        'Inspecting Client-Rendered Content',
        'Common JSON-LD Syntax Problems',
        'Canonical URL Pitfalls',
        'Missing vs Incomplete Social Metadata',
        'Testing Localhost and Authenticated Dashboards',
        'How to Interpret SEO Inspector Findings',
        'What Browser-Side Inspection Cannot Prove',
        'Primary References'
      ];

      for (const section of requiredSections) {
        assert.ok(
          html.includes(section),
          `Guide must contain section: "${section}"`
        );
      }
    });

    it('contains clear disclaimers on what in-browser inspection cannot prove', () => {
      assert.ok(html.includes('Indexing Status'), 'Mentions indexing status limits');
      assert.ok(html.includes('Server-Side Redirect'), 'Mentions server-side redirect limits');
      assert.ok(html.includes('Crawl Budget'), 'Mentions crawl budget limits');
      assert.ok(html.includes('Robots.txt'), 'Mentions robots.txt server enforcement limits');
      assert.ok(html.includes('Googlebot Rendering and Canonical Selection'), 'Mentions Googlebot rendering and canonical selection limits');
    });

    it('cites authoritative primary references', () => {
      assert.ok(html.includes('https://www.w3.org/TR/html52/sections.html#headings-and-sections'), 'Cites W3C HTML5');
      assert.ok(html.includes('https://schema.org/docs/documents.html'), 'Cites Schema.org');
      assert.ok(html.includes('https://ogp.me/'), 'Cites Open Graph');
      assert.ok(html.includes('https://www.rfc-editor.org/rfc/rfc6596.html'), 'Cites RFC 6596');
      assert.ok(html.includes('https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data'), 'Cites Google Search Central');
      assert.ok(html.includes('https://developers.google.com/search/blog/2010/04/to-slash-or-not-to-slash'), 'Cites Google Blog To Slash or Not to Slash');
      assert.ok(html.includes('https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls'), 'Cites Google Canonical URL Consolidation');
      assert.ok(html.includes('https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics'), 'Cites Google JavaScript SEO Basics');
      assert.ok(html.includes('https://support.google.com/webmasters/answer/9012289'), 'Cites Google URL Inspection Tool Help');
    });

    it('links to SEO Inspector on Microsoft Edge and does NOT advertise Chrome', () => {
      assert.ok(
        html.includes('https://microsoftedge.microsoft.com/addons/detail/seo-inspector-meta-tags/jbnjjkfkcmfkjamakndojbkjanijlfmd'),
        'Must link to Microsoft Edge Add-ons listing'
      );
      assert.ok(!html.includes('chromewebstore.google.com/detail/seo-inspector'), 'Must NOT advertise Chrome SEO Inspector');
    });

    it('links directly to the interactive sandbox', () => {
      assert.ok(
        html.includes('../../demos/seo-audit-sandbox/'),
        'Must link to /demos/seo-audit-sandbox/'
      );
    });
  });

  describe('4. Site Integration & Bidirectional Cross-Linking', () => {
    it('Guides hub (/guides/index.html) lists the new guide', () => {
      const hubHtml = fs.readFileSync(GUIDES_HUB_PATH, 'utf8');
      assert.ok(
        hubHtml.includes('href="./audit-json-ld-and-headings-in-browser/"'),
        'Guides hub must link to new guide'
      );
    });

    it('SEO Inspector product page (/seo-inspector/index.html) has banner and guide card', () => {
      const productHtml = fs.readFileSync(SEO_INSPECTOR_HTML_PATH, 'utf8');
      assert.ok(
        productHtml.includes('href="../demos/seo-audit-sandbox/"'),
        'Product page must link to sandbox'
      );
      assert.ok(
        productHtml.includes('href="../guides/audit-json-ld-and-headings-in-browser/"'),
        'Product page must link to guide'
      );
      assert.ok(
        productHtml.includes('Try the Interactive SEO Audit Sandbox'),
        'Prominent banner headline must exist'
      );
    });

    it('sitemap.xml contains entries for both new URLs', () => {
      const sitemap = fs.readFileSync(SITEMAP_PATH, 'utf8');
      assert.ok(
        sitemap.includes('<loc>https://extensionguy.me/demos/seo-audit-sandbox/</loc>'),
        'sitemap.xml must include sandbox URL'
      );
      assert.ok(
        sitemap.includes('<loc>https://extensionguy.me/guides/audit-json-ld-and-headings-in-browser/</loc>'),
        'sitemap.xml must include guide URL'
      );
    });
  });
});
