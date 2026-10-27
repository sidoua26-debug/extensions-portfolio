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
  },
  {
    slug: 'export-virtualized-tables-to-excel',
    file: 'guides/export-virtualized-tables-to-excel/index.html',
    canonical: 'https://extensionguy.me/guides/export-virtualized-tables-to-excel/',
    ogImage: 'https://extensionguy.me/assets/og/home-1200x630.png'
  },
  {
    slug: 'prevent-browser-tab-loss-local-backups',
    file: 'guides/prevent-browser-tab-loss-local-backups/index.html',
    canonical: 'https://extensionguy.me/guides/prevent-browser-tab-loss-local-backups/',
    ogImage: 'https://extensionguy.me/assets/og/home-1200x630.png'
  },
  {
    slug: 'type-french-accents-on-qwerty-offline',
    file: 'guides/type-french-accents-on-qwerty-offline/index.html',
    canonical: 'https://extensionguy.me/guides/type-french-accents-on-qwerty-offline/',
    ogImage: 'https://extensionguy.me/assets/og/home-1200x630.png'
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

    it('links to all technical guides via cards', () => {
      assert.ok(content.includes('href="./docx-to-latex-offline/"'), 'Links to docx-to-latex-offline');
      assert.ok(content.includes('href="./word-tables-to-latex/"'), 'Links to word-tables-to-latex');
      assert.ok(content.includes('href="./export-virtualized-tables-to-excel/"'), 'Links to export-virtualized-tables-to-excel');
      assert.ok(content.includes('href="./prevent-browser-tab-loss-local-backups/"'), 'Links to prevent-browser-tab-loss-local-backups');
      assert.ok(content.includes('href="./type-french-accents-on-qwerty-offline/"'), 'Links to type-french-accents-on-qwerty-offline');
    });
  });

  describe('Guide 5 Technical Accuracy Safeguards: type-french-accents-on-qwerty-offline', () => {
    const guideFile = path.resolve('guides/type-french-accents-on-qwerty-offline/index.html');
    const content = fs.readFileSync(guideFile, 'utf8');

    it('contains verified linguistic examples', () => {
      assert.ok(content.includes('ecole'), 'Mentions ecole');
      assert.ok(content.includes('école'), 'Mentions école');
      assert.ok(content.includes('deja'), 'Mentions deja');
      assert.ok(content.includes('déjà'), 'Mentions déjà');
      assert.ok(content.includes('jai'), 'Mentions jai');
      assert.ok(content.includes("j’ai"), 'Mentions j’ai');
      assert.ok(content.includes('cest'), 'Mentions cest');
      assert.ok(content.includes("c’est"), 'Mentions c’est');
      assert.ok(content.includes('daccord'), 'Mentions daccord');
      assert.ok(content.includes("d’accord"), 'Mentions d’accord');
      assert.ok(content.includes('lecole'), 'Mentions lecole');
      assert.ok(content.includes("l’école"), 'Mentions l’école');
      assert.ok(content.includes('bknjour'), 'Mentions bknjour');
      assert.ok(content.includes('bonjour'), 'Mentions bonjour');
      assert.ok(content.includes('frnace'), 'Mentions frnace');
      assert.ok(content.includes('france'), 'Mentions france');
    });

    it('cites authoritative primary references', () => {
      assert.ok(content.includes('https://www.unicode.org/reports/tr15/'), 'Links to Unicode TR15');
      assert.ok(content.includes('https://github.com/wolfgarbe/SymSpell'), 'Links to SymSpell');
      assert.ok(content.includes('https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions'), 'Links to Chrome extension permissions');
      assert.ok(content.includes('https://www.w3.org/TR/input-events-2/'), 'Links to W3C Input Events');
    });

    it('distinguishes static code inspection from runtime network testing', () => {
      assert.ok(
        content.includes('Static Source Inspection') || content.includes('Static Code Inspection'),
        'Includes static inspection section'
      );
      assert.ok(content.includes('Note on Verification'), 'Includes verification distinction note');
    });

    it('accurately distinguishes API permissions, host_permissions, and content_scripts matching in Section 9', () => {
      const section9Match = content.match(/<!-- Section 9 -->([\s\S]*?)<!-- Section 10 -->/);
      assert.ok(section9Match, 'Section 9 must be present');
      const section9 = section9Match[1];

      // 1. Identifies storage and activeTab as API permissions
      assert.ok(
        /API permissions:?\s*<code>storage<\/code>.*<code>activeTab<\/code>/is.test(section9),
        'Identifies storage and activeTab as API permissions'
      );

      // 2. Clarifies no top-level host_permissions declared
      assert.ok(
        /no top-level <code>host_permissions<\/code>/i.test(section9),
        'Explains lack of top-level host_permissions'
      );

      // 3. Specifies http/https content script match patterns
      assert.ok(
        section9.includes('<code>http://*/*</code>') && section9.includes('<code>https://*/*</code>'),
        'Specifies http/https match patterns for content scripts'
      );

      // 4. Injected automatically across matching pages
      assert.ok(
        /injected automatically across matching pages/i.test(section9),
        'Explains automatic content script injection'
      );

      // 5. Does not depend on activeTab / popup
      assert.ok(
        /rather than through <code>activeTab<\/code> invocations/i.test(section9),
        'Clarifies activeTab is not the injection mechanism'
      );

      // 6. Confirms broad site injection with field filtering boundaries
      assert.ok(
        /inject widely across matching websites/i.test(section9),
        'Acknowledges broad site injection'
      );
      assert.ok(
        /safety filters/i.test(section9),
        'Explains field eligibility boundaries'
      );
    });
  });
});
