import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('Content Accuracy & Product Claims Regression Gate', async (t) => {
  await t.test('1. Homepage store availability accuracy', () => {
    const indexPath = path.join(rootDir, 'index.html');
    const buildPath = path.join(rootDir, 'build_redesign.py');
    const indexContent = fs.readFileSync(indexPath, 'utf-8');
    const buildContent = fs.readFileSync(buildPath, 'utf-8');

    // Must NOT claim that all extensions are on both stores without qualification
    assert.ok(
      !indexContent.includes('All extensions are submitted directly to the official Microsoft Edge Add-ons catalog and Chrome Web Store where they undergo store review'),
      'index.html does not claim universal store availability'
    );
    assert.ok(
      !buildContent.includes('All extensions are submitted directly to the official Microsoft Edge Add-ons catalog and Chrome Web Store where they undergo store review'),
      'build_redesign.py does not claim universal store availability'
    );

    // Must explicitly identify that availability varies by product and state specific listings
    assert.ok(
      indexContent.includes('Availability varies by product: Word to LaTeX (Offline), Table Extractor, and BulkGrab have listings on both Microsoft Edge Add-ons and the Chrome Web Store'),
      'index.html clarifies dual-store vs Edge-only distribution'
    );
    assert.ok(
      buildContent.includes('Availability varies by product: Word to LaTeX (Offline), Table Extractor, and BulkGrab have listings on both Microsoft Edge Add-ons and the Chrome Web Store'),
      'build_redesign.py clarifies dual-store vs Edge-only distribution'
    );
  });

  await t.test('2. Local processing vs optional licensing requests', () => {
    const indexPath = path.join(rootDir, 'index.html');
    const privacyPath = path.join(rootDir, 'privacy.html');
    const indexContent = fs.readFileSync(indexPath, 'utf-8');
    const privacyContent = fs.readFileSync(privacyPath, 'utf-8');

    // Both homepage FAQ and privacy.html must clearly distinguish local data from licensing IDs
    const licensingPattern = /under no circumstances are (?:table contents|extracted spreadsheets|downloaded files|media URLs).*?transmitted to the licensing service/i;
    assert.match(indexContent, licensingPattern, 'index.html separates data extraction from licensing requests');
    assert.match(privacyContent, licensingPattern, 'privacy.html separates data extraction from licensing requests');

    // Verify privacy.html documents the exact parameters transmitted (payment_id, product)
    assert.ok(privacyContent.includes('payment_id='), 'privacy.html discloses payment_id query parameter');
    assert.ok(privacyContent.includes('product='), 'privacy.html discloses product identifier');
  });

  await t.test('3. Tab Vault recovery and performance claims', () => {
    const tabVaultPath = path.join(rootDir, 'tab-vault', 'index.html');
    const content = fs.readFileSync(tabVaultPath, 'utf-8');

    // Must NOT contain unsupported absolute claims like 95% or disaster-proof
    assert.ok(!content.includes('95%'), 'Does not contain unverified 95% memory savings claim');
    assert.ok(!content.toLowerCase().includes('disaster-proof'), 'Does not claim disaster-proof recovery');
    assert.ok(!content.includes('can never be accidentally wiped'), 'Does not claim sessions can never be wiped');

    // Must accurately describe actual defense-in-depth mechanisms
    assert.ok(content.includes('rolling snapshots'), 'Mentions verified rolling snapshots');
    assert.ok(content.includes('automated'), 'Mentions automated backups');
    assert.ok(content.includes('Crash-Resilient'), 'Uses calibrated crash-resilient terminology');
  });

  await t.test('4. Bilexi competitor and network claims', () => {
    const bilexiPath = path.join(rootDir, 'bilexi', 'index.html');
    const content = fs.readFileSync(bilexiPath, 'utf-8');

    // Must NOT sweepingly claim that all competitors transmit "every sentence, password entry, and search query"
    assert.ok(
      !content.includes('transmit every sentence, email draft, password entry, and search query'),
      'Does not make unverifiable absolute claims about all competitors'
    );

    // Must accurately characterize local trie dictionary processing
    assert.ok(
      content.includes('compact binary trie dictionaries'),
      'Describes local binary trie dictionary processing'
    );
    assert.ok(
      content.includes('bundled offline dictionaries') || content.includes('Bundled Dictionaries'),
      'Affirms bundled offline dictionaries'
    );
  });

  await t.test('5. Bilexi permissions and automatic content-script architecture accuracy', () => {
    const guidePath = path.join(rootDir, 'guides', 'type-french-accents-on-qwerty-offline', 'index.html');
    const guideContent = fs.readFileSync(guidePath, 'utf-8');

    // Section 9 must accurately distinguish API permissions vs content script match patterns
    assert.ok(
      /API permissions:?\s*<code>storage<\/code>.*<code>activeTab<\/code>/is.test(guideContent),
      'Clarifies storage and activeTab are API permissions'
    );
    assert.ok(
      guideContent.includes('no top-level <code>host_permissions</code>') || guideContent.includes('declares no top-level <code>host_permissions</code>'),
      'Affirms lack of host_permissions'
    );
    assert.ok(
      /injected automatically across matching pages/i.test(guideContent),
      'Accurately explains content script injection mechanism'
    );
  });

  await t.test('6. Homepage and build_redesign.py perfect synchronization', () => {
    const indexPath = path.join(rootDir, 'index.html');
    const buildPath = path.join(rootDir, 'build_redesign.py');
    const indexContent = fs.readFileSync(indexPath, 'utf-8');
    const buildContent = fs.readFileSync(buildPath, 'utf-8');

    assert.ok(
      buildContent.includes(indexContent),
      'index.html is embedded byte-for-byte in build_redesign.py'
    );
  });

  await t.test('7. Published store versions presence across homepage and product pages', () => {
    const storeVersionsPath = path.join(rootDir, 'store-versions.json');
    assert.ok(fs.existsSync(storeVersionsPath), 'store-versions.json exists at repository root');
    const storeVersions = JSON.parse(fs.readFileSync(storeVersionsPath, 'utf-8'));

    const formatBadge = (key) => {
      const data = storeVersions[key];
      if (data.is_web_tool) return null;
      const stores = data.stores;
      const parts = [];
      if (stores.edge) parts.push(`Edge v${stores.edge.version}`);
      if (stores.chrome) parts.push(`Chrome v${stores.chrome.version}`);
      return `Published versions: ${parts.join(' · ')}`;
    };

    const indexPath = path.join(rootDir, 'index.html');
    const indexContent = fs.readFileSync(indexPath, 'utf-8');

    // Homepage checks
    const expectedBadges = {
      'word-to-latex': formatBadge('word-to-latex'),
      'table-extractor': formatBadge('table-extractor'),
      'bulkgrab': formatBadge('bulkgrab'),
      'seo-inspector': formatBadge('seo-inspector'),
      'bilexi': formatBadge('bilexi'),
      'tab-vault': formatBadge('tab-vault')
    };

    for (const [key, badge] of Object.entries(expectedBadges)) {
      assert.ok(
        indexContent.includes(badge),
        `Homepage index.html contains published version badge for ${key}: "${badge}"`
      );
    }

    // Flagship section check
    assert.ok(
      indexContent.includes(`<span class="badge badge-w2l">${expectedBadges['word-to-latex']}</span>`),
      'Homepage flagship section contains published versions badge'
    );

    // Product pages checks
    const productPageDirs = [
      'word-to-latex',
      'table-extractor',
      'bulkgrab',
      'seo-inspector',
      'bilexi',
      'tab-vault'
    ];

    for (const slug of productPageDirs) {
      const pagePath = path.join(rootDir, slug, 'index.html');
      const pageContent = fs.readFileSync(pagePath, 'utf-8');
      const badge = expectedBadges[slug];
      assert.ok(
        pageContent.includes(badge),
        `Product page ${slug}/index.html contains hero published version badge: "${badge}"`
      );
    }
  });

  await t.test('8. Stale dates and unreleased versions are absent', () => {
    const pagesToCheck = [
      'index.html',
      'word-to-latex/index.html',
      'table-extractor/index.html',
      'bulkgrab/index.html',
      'seo-inspector/index.html',
      'bilexi/index.html',
      'tab-vault/index.html',
      'word-to-latex-converter/index.html'
    ];

    for (const pageRel of pagesToCheck) {
      const fullPath = path.join(rootDir, pageRel);
      const content = fs.readFileSync(fullPath, 'utf-8');

      // Assert no "Updated [Month] [Year]" strings
      assert.ok(
        !/Updated\s+[A-Za-z]+\s+\d{4}/i.test(content),
        `${pageRel} must not contain stale date labels like "Updated Oct 2026"`
      );
    }

    // Assert unreleased versions are not displayed in homepage cards or metadata
    const indexContent = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');
    assert.ok(!indexContent.includes('v1.2.0'), 'index.html does not claim unreleased v1.2.0');
    assert.ok(!indexContent.includes('v1.1.2'), 'index.html does not claim unreleased v1.1.2');
    assert.ok(!indexContent.includes('v1.3.1'), 'index.html does not claim unreleased v1.3.1');
    assert.ok(!indexContent.includes('"softwareVersion": "1.0.5"'), 'index.html does not claim stale 1.0.5 in JSON-LD');
    assert.ok(!indexContent.includes('Changelog (v'), 'index.html does not include version in Changelog links');
  });

  await t.test('9. JSON-LD structured data validation on homepage and product pages', () => {
    const pagesToCheck = [
      'index.html',
      'word-to-latex/index.html',
      'table-extractor/index.html',
      'bulkgrab/index.html',
      'seo-inspector/index.html',
      'bilexi/index.html',
      'tab-vault/index.html'
    ];

    const jsonLdRegex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;

    for (const pageRel of pagesToCheck) {
      const fullPath = path.join(rootDir, pageRel);
      const content = fs.readFileSync(fullPath, 'utf-8');
      const matches = [...content.matchAll(jsonLdRegex)];

      assert.ok(matches.length > 0, `${pageRel} contains at least one JSON-LD block`);

      for (const match of matches) {
        let parsed;
        assert.doesNotThrow(() => {
          parsed = JSON.parse(match[1]);
        }, `JSON-LD in ${pageRel} is valid JSON`);

        // Find all SoftwareApplication items
        const apps = [];
        if (parsed['@type'] === 'SoftwareApplication') apps.push(parsed);
        if (Array.isArray(parsed['@graph'])) {
          for (const item of parsed['@graph']) {
            if (item['@type'] === 'SoftwareApplication') apps.push(item);
          }
        }

        for (const app of apps) {
          const name = app.name;
          const ver = app.softwareVersion;

          if (name.includes('Word to LaTeX')) {
            assert.equal(ver, '1.0.6', `${pageRel} Word to LaTeX softwareVersion matches published 1.0.6`);
          } else if (name.includes('Table Extractor')) {
            assert.equal(ver, '1.0.1', `${pageRel} Table Extractor softwareVersion matches published 1.0.1`);
          } else if (name.includes('BulkGrab')) {
            assert.equal(ver, undefined, `${pageRel} BulkGrab omits softwareVersion (different versions across stores)`);
          } else if (name.includes('SEO Inspector')) {
            assert.equal(ver, undefined, `${pageRel} SEO Inspector omits softwareVersion (Edge-only)`);
          } else if (name.includes('Bilexi')) {
            assert.equal(ver, undefined, `${pageRel} Bilexi omits softwareVersion (Edge-only)`);
          } else if (name.includes('Tab Vault')) {
            assert.equal(ver, undefined, `${pageRel} Tab Vault omits softwareVersion (Edge-only)`);
          }
        }
      }
    }
  });
});
