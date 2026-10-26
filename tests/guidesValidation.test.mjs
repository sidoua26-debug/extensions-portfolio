import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

const GUIDES = [
  {
    slug: 'docx-to-latex-offline',
    file: 'guides/docx-to-latex-offline/index.html',
    canonical: 'https://extensionguy.me/guides/docx-to-latex-offline/',
    ogImage: 'https://extensionguy.me/assets/og/guide-docx-to-latex-offline-1200x630.png'
  },
  {
    slug: 'word-tables-to-latex',
    file: 'guides/word-tables-to-latex/index.html',
    canonical: 'https://extensionguy.me/guides/word-tables-to-latex/',
    ogImage: 'https://extensionguy.me/assets/og/guide-word-tables-to-latex-1200x630.png'
  }
];

describe('Guides Validation & Quality Gate', () => {
  const activeGuides = GUIDES.filter(g => fs.existsSync(path.resolve(g.file)));
  assert.ok(activeGuides.length > 0, 'At least one guide must exist');

  for (const guide of activeGuides) {
    describe(`Guide: ${guide.slug}`, () => {
      const htmlPath = path.resolve(guide.file);
      const content = fs.readFileSync(htmlPath, 'utf8');

      it('does NOT contain forbidden placeholders or unfinished text markers', () => {
        const forbidden = [
          'TODO',
          'TODO-EVIDENCE',
          'Insert a verified',
          'should contain',
          'placeholder',
          '[PASTE',
          'FIXME'
        ];
        for (const token of forbidden) {
          assert.ok(
            !content.includes(token),
            `Guide ${guide.slug} contains forbidden marker: "${token}"`
          );
        }
      });

      it('does NOT contain empty heading tags', () => {
        const emptyHeadingRegex = /<h[1-6][^>]*>\s*<\/h[1-6]>/i;
        assert.ok(!emptyHeadingRegex.test(content), `Guide ${guide.slug} contains an empty heading tag`);
      });

      it('strictly passes the 110-155 character meta description gate', () => {
        const match = content.match(/<meta name="description" content="([^"]+)">/);
        assert.ok(match, 'meta description tag exists');
        const desc = match[1];
        assert.ok(
          desc.length >= 110 && desc.length <= 155,
          `Meta description length ${desc.length} outside [110, 155] range: "${desc}"`
        );
      });

      it('does NOT contain absolute claim words (audit regex)', () => {
        // Strip script and code blocks to avoid flagging code syntax
        const textOnly = content
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<pre\b[^<]*(?:(?!<\/pre>)<[^<]*)*<\/pre>/gi, '')
          .replace(/<code\b[^<]*(?:(?!<\/code>)<[^<]*)*<\/code>/gi, '')
          .replace(/<[^>]+>/g, ' ');

        const absoluteRegex = /\b(zero|never|always|100%|completely|entirely|permanent|guarantee|unlimited|nothing|no one)\b/i;
        const match = textOnly.match(absoluteRegex);
        assert.equal(
          match,
          null,
          `Found forbidden absolute claim word "${match ? match[0] : ''}" in visible text of ${guide.slug}`
        );
      });

      it('has valid canonical, OG image, and JSON-LD structured data', () => {
        assert.ok(content.includes(`<link rel="canonical" href="${guide.canonical}">`), 'Valid canonical href');
        assert.ok(content.includes(`<meta property="og:image" content="${guide.ogImage}">`), 'Valid og:image href');

        const jsonLdMatch = content.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
        assert.ok(jsonLdMatch, 'JSON-LD block exists');
        const parsed = JSON.parse(jsonLdMatch[1]);
        assert.equal(parsed['@context'], 'https://schema.org');
        assert.ok(Array.isArray(parsed['@graph']), '@graph array exists');

        const article = parsed['@graph'].find(item => item['@type'] === 'TechArticle');
        assert.ok(article, 'TechArticle schema present');
        assert.ok(article.headline, 'Article headline exists');
        assert.ok(article.datePublished, 'datePublished exists');

        const breadcrumb = parsed['@graph'].find(item => item['@type'] === 'BreadcrumbList');
        assert.ok(breadcrumb, 'BreadcrumbList schema present');

        // Strictly forbidden schemas
        assert.ok(!parsed['@graph'].some(item => item['@type'] === 'FAQPage'), 'FAQPage is forbidden');
        assert.ok(!parsed['@graph'].some(item => item.aggregateRating), 'aggregateRating is forbidden');
      });
    });
  }
});
