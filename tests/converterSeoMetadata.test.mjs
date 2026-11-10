import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORTFOLIO_ROOT = path.resolve(__dirname, '..');
const CONVERTER_HTML_PATH = path.join(PORTFOLIO_ROOT, 'word-to-latex-converter/index.html');

describe('Step 4A: Converter SEO Metadata & Content Regression Test', () => {
  const html = fs.readFileSync(CONVERTER_HTML_PATH, 'utf8');

  it('1. Title and meta description match approved Step 4A specifications', () => {
    const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/);
    assert.ok(titleMatch, '<title> tag must exist');
    assert.equal(
      titleMatch[1].trim(),
      'Word to LaTeX Converter (DOCX) | Free Online Tool',
      'Title must match exact approved Step 4A copy'
    );

    const descMatches = [...html.matchAll(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']\s*\/?>/gi)];
    assert.equal(descMatches.length, 1, 'Exactly one meta description tag must exist');
    assert.equal(
      descMatches[0][1].trim(),
      'Convert Word (.docx) documents to LaTeX with Pandoc WebAssembly in your browser. No document uploads. Try a sample, then copy or download the .tex output.',
      'Meta description must match exact approved Step 4A copy'
    );
  });

  it('2. Open Graph and Twitter metadata align with updated title and description', () => {
    const ogTitle = html.match(/<meta\s+property=["']og:title["']\s+content=["']([\s\S]*?)["']\s*\/?>/i);
    assert.ok(ogTitle, 'og:title must exist');
    assert.equal(ogTitle[1].trim(), 'Word to LaTeX Converter (DOCX) | Free Online Tool');

    const ogDesc = html.match(/<meta\s+property=["']og:description["']\s+content=["']([\s\S]*?)["']\s*\/?>/i);
    assert.ok(ogDesc, 'og:description must exist');
    assert.equal(
      ogDesc[1].trim(),
      'Convert Word (.docx) documents to LaTeX with Pandoc WebAssembly in your browser. No document uploads. Try a sample, then copy or download the .tex output.'
    );

    const twitterTitle = html.match(/<meta\s+name=["']twitter:title["']\s+content=["']([\s\S]*?)["']\s*\/?>/i);
    assert.ok(twitterTitle, 'twitter:title must exist');
    assert.equal(twitterTitle[1].trim(), 'Word to LaTeX Converter (DOCX) | Free Online Tool');

    const twitterDesc = html.match(/<meta\s+name=["']twitter:description["']\s+content=["']([\s\S]*?)["']\s*\/?>/i);
    assert.ok(twitterDesc, 'twitter:description must exist');
    assert.equal(
      twitterDesc[1].trim(),
      'Convert Word (.docx) documents to LaTeX with Pandoc WebAssembly in your browser. No document uploads. Try a sample, then copy or download the .tex output.'
    );
  });

  it('3. Canonical URL and H1 remain intact', () => {
    const canonicalMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["']([\s\S]*?)["']\s*\/?>/i);
    assert.ok(canonicalMatch, 'Canonical link must exist');
    assert.equal(canonicalMatch[1].trim(), 'https://extensionguy.me/word-to-latex-converter/');

    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    assert.ok(h1Match, 'H1 tag must exist');
    assert.ok(
      h1Match[1].includes('Convert Word Documents to LaTeX Online'),
      'H1 heading must remain unchanged'
    );
  });

  it('4. Structured data retains WebApplication and BreadcrumbList without FAQPage', () => {
    const jsonLdMatch = html.match(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/i);
    assert.ok(jsonLdMatch, 'JSON-LD block must exist');

    const parsed = JSON.parse(jsonLdMatch[1]);
    const graph = parsed['@graph'];
    assert.ok(Array.isArray(graph), '@graph must be an array');

    const webApp = graph.find((node) => node['@type'] === 'WebApplication');
    assert.ok(webApp, 'WebApplication node must exist');
    assert.equal(webApp.name, 'Online Word to LaTeX Converter');

    const breadcrumbs = graph.find((node) => node['@type'] === 'BreadcrumbList');
    assert.ok(breadcrumbs, 'BreadcrumbList node must exist');

    const hasFaq = graph.some((node) => node['@type'] === 'FAQPage');
    assert.ok(!hasFaq, 'Must NOT contain FAQPage schema per Google 2026 deprecation');
  });

  it('5. Shared assurance copy clarifies analytics without claiming zero telemetry', () => {
    assert.ok(
      html.includes('No remote document transmission, no tracking cookies, no ads, and no document contents included in analytics.'),
      'Shared assurance statement must be accurately updated'
    );
    assert.ok(
      !html.includes('No remote document transmission, no tracking cookies, no ads, no telemetry.'),
      'Outdated "no telemetry" blanket phrase must be eliminated from converter page'
    );
  });

  it('6. Plausible analytics integration is removed', () => {
    assert.ok(
      !html.includes('assets/js/plausible-init.js'),
      'Plausible local initializer script must not be present'
    );
    assert.ok(
      !html.includes('https://plausible.io'),
      'Plausible async script tag must not be present'
    );
  });
});
