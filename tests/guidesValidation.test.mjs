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
        assert.equal(breadcrumb.itemListElement.length, 3, `Child guide ${guide.slug} breadcrumb must have 3 levels`);
        assert.equal(breadcrumb.itemListElement[0].name, 'Home');
        assert.equal(breadcrumb.itemListElement[0].item, 'https://extensionguy.me/');
        assert.equal(breadcrumb.itemListElement[1].name, 'Guides');
        assert.equal(breadcrumb.itemListElement[1].item, 'https://extensionguy.me/guides/');
        assert.equal(breadcrumb.itemListElement[2].item, guide.canonical);

        // Strictly forbidden schemas
        assert.ok(!parsed['@graph'].some(item => item['@type'] === 'FAQPage'), 'FAQPage is forbidden');
        assert.ok(!parsed['@graph'].some(item => item.aggregateRating), 'aggregateRating is forbidden');
      });
    });
  }

  describe('Guides Hub: /guides/', () => {
    const hubFile = path.resolve('guides/index.html');
    const content = fs.readFileSync(hubFile, 'utf8');

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
          `Guides Hub contains forbidden marker: "${token}"`
        );
      }
    });

    it('does NOT contain empty heading tags', () => {
      const emptyHeadingRegex = /<h[1-6][^>]*>\s*<\/h[1-6]>/i;
      assert.ok(!emptyHeadingRegex.test(content), 'Guides Hub contains an empty heading tag');
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
        `Found forbidden absolute claim word "${match ? match[0] : ''}" in visible text of Guides Hub`
      );
    });

    it('has valid canonical, OG image, and JSON-LD CollectionPage structured data', () => {
      assert.ok(content.includes('<link rel="canonical" href="https://extensionguy.me/guides/">'), 'Valid canonical href');
      assert.ok(content.includes('<meta property="og:image" content="https://extensionguy.me/assets/og/home-1200x630.png">'), 'Valid og:image href');

      const jsonLdMatch = content.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      assert.ok(jsonLdMatch, 'JSON-LD block exists');
      const parsed = JSON.parse(jsonLdMatch[1]);
      assert.equal(parsed['@context'], 'https://schema.org');
      assert.ok(Array.isArray(parsed['@graph']), '@graph array exists');

      const collection = parsed['@graph'].find(item => item['@type'] === 'CollectionPage');
      assert.ok(collection, 'CollectionPage schema present');
      assert.equal(collection.url, 'https://extensionguy.me/guides/');

      const breadcrumb = parsed['@graph'].find(item => item['@type'] === 'BreadcrumbList');
      assert.ok(breadcrumb, 'BreadcrumbList schema present');
      assert.equal(breadcrumb.itemListElement.length, 2, 'Hub breadcrumb must have 2 levels');
      assert.equal(breadcrumb.itemListElement[0].name, 'Home');
      assert.equal(breadcrumb.itemListElement[0].item, 'https://extensionguy.me/');
      assert.equal(breadcrumb.itemListElement[1].name, 'Guides');
      assert.equal(breadcrumb.itemListElement[1].item, 'https://extensionguy.me/guides/');

      assert.ok(!parsed['@graph'].some(item => item['@type'] === 'FAQPage'), 'FAQPage is forbidden');
      assert.ok(!parsed['@graph'].some(item => item.aggregateRating), 'aggregateRating is forbidden');
    });

    it('links to both technical guides via cards', () => {
      assert.ok(content.includes('href="./docx-to-latex-offline/"'), 'Links to docx-to-latex-offline');
      assert.ok(content.includes('href="./word-tables-to-latex/"'), 'Links to word-tables-to-latex');
    });
  });
});
