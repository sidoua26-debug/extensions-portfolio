import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

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
    const indexPath = path.join(rootDir, 'index.html');
    const indexContent = fs.readFileSync(indexPath, 'utf-8');

    // Must NOT contain unsupported absolute claims like 95% or disaster-proof
    assert.ok(!content.includes('95%'), 'Does not contain unverified 95% memory savings claim');
    assert.ok(!content.toLowerCase().includes('disaster-proof'), 'Does not claim disaster-proof recovery');
    assert.ok(!content.includes('can never be accidentally wiped'), 'Does not claim sessions can never be wiped');
    assert.ok(!content.includes('survive profile loss'), 'Does not claim sessions survive profile loss');
    assert.ok(!content.includes('protect saved tabs against profile corruption'), 'Does not claim protection against profile corruption');

    // Must NOT claim tab suspension (Tab Vault closes tabs, does not suspend)
    assert.ok(!content.toLowerCase().includes('suspending unloaded background tabs'), 'Does not claim suspending background tabs');
    assert.ok(!indexContent.includes('Instant tab suspension'), 'Homepage does not claim tab suspension');
    assert.ok(!indexContent.includes('suspends inactive tabs'), 'Homepage JSON-LD does not claim tab suspension');

    // Must pass the 110-155 character meta description gate
    const metaDescMatch = content.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
    assert.ok(metaDescMatch, 'Tab Vault has meta description');
    const metaDescLength = metaDescMatch[1].length;
    assert.ok(
      metaDescLength >= 110 && metaDescLength <= 155,
      `Tab Vault meta description length (${metaDescLength}) must be between 110 and 155 characters`
    );

    // Must accurately describe actual defense-in-depth mechanisms
    assert.ok(content.includes('rolling snapshots'), 'Mentions verified rolling snapshots');
    assert.ok(content.includes('automated'), 'Mentions automated backups');
    assert.ok(content.includes('Crash-Resilient'), 'Uses calibrated crash-resilient terminology');

    // Privacy policy assertions for Tab Vault
    const privacyPath = path.join(rootDir, 'privacy.html');
    const privacyContent = fs.readFileSync(privacyPath, 'utf-8');
    assert.ok(privacyContent.includes('hasSavedTabs'), 'privacy.html discloses hasSavedTabs sync key');
    assert.ok(privacyContent.includes('lastKnownTabCount'), 'privacy.html discloses lastKnownTabCount sync key');
    assert.ok(privacyContent.includes('lastUpdated'), 'privacy.html discloses lastUpdated sync key');
    assert.ok(privacyContent.includes('chrome.storage.sync'), 'privacy.html discloses chrome.storage.sync');
    assert.ok(privacyContent.includes('unencrypted'), 'privacy.html discloses unencrypted JSON backups');
    assert.ok(!content.includes('zero cloud synchronization'), 'tab-vault/index.html does not claim zero cloud synchronization');
  });

  await t.test('3b. SEO Inspector performance claims accuracy', () => {
    const seoPath = path.join(rootDir, 'seo-inspector', 'index.html');
    const seoContent = fs.readFileSync(seoPath, 'utf-8');
    const indexPath = path.join(rootDir, 'index.html');
    const indexContent = fs.readFileSync(indexPath, 'utf-8');

    // Must NOT claim direct Core Web Vitals measurement or conflate Navigation Timing with Web Vitals
    assert.ok(!seoContent.includes('Navigation Timing Web Vitals'), 'seo-inspector/index.html avoids conflated "Navigation Timing Web Vitals"');
    assert.ok(!indexContent.includes('Navigation Timing Web Vitals'), 'index.html avoids conflated "Navigation Timing Web Vitals"');
    assert.ok(!seoContent.includes('evaluating headings, meta tags, OpenGraph previews, schema, and Web Vitals'), 'seo-inspector avoids unverified "and Web Vitals" claim');
    assert.ok(!indexContent.includes('tags, and Web Vitals in a single click'), 'index.html avoids "and Web Vitals in a single click"');

    // Must accurately describe Navigation Timing & performance metrics
    assert.ok(seoContent.includes('Navigation Timing diagnostics') || seoContent.includes('page timing metrics'), 'Accurately describes navigation timing metrics');
    assert.ok(indexContent.includes('Navigation Timing & performance'), 'Homepage describes Navigation Timing & performance');

    // Privacy policy assertions for SEO Inspector
    const privacyPath = path.join(rootDir, 'privacy.html');
    const privacyContent = fs.readFileSync(privacyPath, 'utf-8');
    const seoPrivSection = privacyContent.slice(privacyContent.indexOf('id="seo-inspector"'), privacyContent.indexOf('id="bilexi"'));
    assert.ok(seoPrivSection.includes('chrome.storage.sync'), 'privacy.html discloses SEO Inspector user preferences via chrome.storage.sync');
    assert.ok(seoPrivSection.includes('chrome.storage.local'), 'privacy.html discloses SEO Inspector local key migration');
    assert.ok(!seoPrivSection.includes('saved locally via <code>chrome.storage.local</code>, remaining on your device'), 'privacy.html avoids obsolete pure-local storage claim for SEO Inspector');
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
      if (stores.edge) parts.push(`Edge&nbsp;v${stores.edge.version}`);
      if (stores.chrome) parts.push(`Chrome&nbsp;v${stores.chrome.version}`);
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
      const cardRegex = new RegExp(`<article[^>]*id="${key}"[\\s\\S]*?<div class="card-version-micro">([^<]+)<\\/div>`);
      const cardMatch = indexContent.match(cardRegex);
      assert.ok(cardMatch, `Card for ${key} must exist and have card-version-micro`);
      assert.equal(
        cardMatch[1].trim(),
        badge,
        `Homepage card for ${key} must display exact badge "${badge}"`
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
      const heroMatch = pageContent.match(/<span class="badge badge-subtle">\s*(Published versions:[^<]+)<\/span>/);
      assert.ok(heroMatch, `Product page ${slug}/index.html must contain hero published version badge`);
      assert.equal(
        heroMatch[1].trim(),
        badge,
        `Product page ${slug}/index.html hero badge must match exact badge "${badge}"`
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
            assert.equal(ver, '1.0.7', `${pageRel} Word to LaTeX softwareVersion matches published 1.0.7`);
          } else if (name.includes('Table Extractor')) {
            assert.equal(ver, '1.0.1', `${pageRel} Table Extractor softwareVersion matches published 1.0.1`);
          } else if (name.includes('BulkGrab')) {
            assert.equal(ver, undefined, `${pageRel} BulkGrab omits softwareVersion (different versions across stores)`);
          } else if (name.includes('SEO Inspector')) {
            if (pageRel === 'seo-inspector/index.html') {
              assert.equal(ver, '1.0.1', `${pageRel} SEO Inspector softwareVersion matches published 1.0.1`);
            } else {
              assert.equal(ver, undefined, `${pageRel} SEO Inspector omits softwareVersion on homepage`);
            }
          } else if (name.includes('Bilexi')) {
            if (pageRel === 'bilexi/index.html') {
              assert.equal(ver, '0.5.1', `${pageRel} Bilexi softwareVersion matches published 0.5.1`);
            } else {
              assert.equal(ver, undefined, `${pageRel} Bilexi omits softwareVersion on homepage`);
            }
          } else if (name.includes('Tab Vault')) {
            if (pageRel === 'tab-vault/index.html') {
              assert.equal(ver, '1.0.0', `${pageRel} Tab Vault softwareVersion matches published 1.0.0`);
            } else {
              assert.equal(ver, undefined, `${pageRel} Tab Vault omits softwareVersion on homepage`);
            }
          }
        }
      }
    }
  });

  await t.test('10. Absence of misleading absolutes in Table Extractor and BulkGrab copy', () => {
    const tePath = path.join(rootDir, 'table-extractor', 'index.html');
    const bgPath = path.join(rootDir, 'bulkgrab', 'index.html');
    const privPath = path.join(rootDir, 'privacy.html');
    const siteJsPath = path.join(rootDir, 'assets', 'js', 'site.js');

    const teContent = fs.readFileSync(tePath, 'utf-8');
    const bgContent = fs.readFileSync(bgPath, 'utf-8');
    const privContent = fs.readFileSync(privPath, 'utf-8');
    const siteJsContent = fs.readFileSync(siteJsPath, 'utf-8');

    // Forbidden unhedged absolutes for BulkGrab
    assert.ok(!bgContent.includes('BulkGrab operates no servers'), 'BulkGrab page avoids absolute "operates no servers"');
    assert.ok(!bgContent.includes('Zero developer logging'), 'BulkGrab page avoids "Zero developer logging"');
    assert.ok(!bgContent.includes('operates no tracking or proxy servers'), 'BulkGrab page avoids unqualified "no tracking or proxy servers"');
    assert.ok(!privContent.includes('BulkGrab operates no servers'), 'privacy.html avoids "BulkGrab operates no servers"');

    // Forbidden unhedged absolutes for Table Extractor
    assert.ok(!teContent.includes('No Server Uploads'), 'Table Extractor avoids absolute heading "No Server Uploads"');
    assert.ok(!teContent.includes('zero user accounts, API keys, or cloud telemetry'), 'Table Extractor FAQ avoids absolute zero telemetry phrase');
    assert.ok(teContent.includes('No account or API key is needed for core features'), 'Table Extractor uses qualified core features phrasing');

    // site.js preview text checks
    assert.ok(!siteJsContent.includes('100% browser-local extraction without sending page content to any server'), 'site.js avoids absolute 100% browser-local claim');
    assert.ok(!siteJsContent.includes('Direct browser downloads with zero intermediary servers'), 'site.js avoids absolute zero intermediary servers claim');
  });

  await t.test('11. Consistency of row/step limits and Free vs Pro tier gating', () => {
    const tePath = path.join(rootDir, 'table-extractor', 'index.html');
    const bgPath = path.join(rootDir, 'bulkgrab', 'index.html');
    const teContent = fs.readFileSync(tePath, 'utf-8');
    const bgContent = fs.readFileSync(bgPath, 'utf-8');

    // Table Extractor limits: default 500 steps, default 5,000 rows, configurable up to 50,000 rows
    assert.ok(teContent.includes('500 scroll steps'), 'Table Extractor discloses 500 step cap');
    assert.ok(teContent.includes('5,000 rows'), 'Table Extractor discloses default 5,000 row limit');
    assert.ok(teContent.includes('50,000 rows'), 'Table Extractor discloses configurable maximum 50,000 row limit');

    // Pro gating disclosures
    assert.ok(teContent.includes('optional Pro upgrade'), 'Table Extractor clearly marks virtualized capture as optional Pro');
    assert.ok(
      bgContent.includes('BulkGrab Free allows up to seven individual file downloads per browser session. BulkGrab Pro removes that session limit and adds ZIP bundling on your device.'),
      'BulkGrab discloses seven individual file downloads per session and Pro ZIP bundling'
    );
  });

  await t.test('12. Step 5B: SEO Inspector version accuracy & regression gate', () => {
    const seoHtmlPath = path.join(rootDir, 'seo-inspector', 'index.html');
    const storeVersionsPath = path.join(rootDir, 'store-versions.json');
    const seoContent = fs.readFileSync(seoHtmlPath, 'utf-8');
    const storeVersions = JSON.parse(fs.readFileSync(storeVersionsPath, 'utf-8'));

    // 1. SEO Inspector version badge matches 1.0.1
    assert.match(
      seoContent,
      /<span class="badge badge-subtle">Published versions:\s*Edge&nbsp;v1\.0\.1<\/span>/,
      'SEO Inspector version badge matches Edge v1.0.1'
    );

    // 2. JSON-LD contains softwareVersion: "1.0.1"
    const jsonLdMatch = seoContent.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(jsonLdMatch, 'JSON-LD block must exist in seo-inspector/index.html');
    const parsedJsonLd = JSON.parse(jsonLdMatch[1]);
    const appNode = (parsedJsonLd['@graph'] || [parsedJsonLd]).find(
      (node) => node['@type'] === 'SoftwareApplication'
    );
    assert.ok(appNode, 'SoftwareApplication node must exist in JSON-LD');
    assert.equal(appNode.softwareVersion, '1.0.1', 'JSON-LD contains softwareVersion: "1.0.1"');
    assert.equal(appNode.name, 'SEO Inspector');
    assert.equal(appNode.operatingSystem, 'Any, with Microsoft Edge');
    assert.equal(appNode.applicationCategory, 'BrowserApplication');
    assert.equal(appNode.downloadUrl, 'https://microsoftedge.microsoft.com/addons/detail/seo-inspector-meta-tags/jbnjjkfkcmfkjamakndojbkjanijlfmd');
    assert.deepEqual(appNode.offers, { '@type': 'Offer', price: '0', priceCurrency: 'USD' });
    assert.deepEqual(appNode.author, { '@type': 'Person', name: 'Sid', url: 'https://extensionguy.me/#about' });

    // 3. store-versions.json records Edge version 1.0.1
    assert.equal(
      storeVersions['seo-inspector']?.stores?.edge?.version,
      '1.0.1',
      'store-versions.json records Edge version 1.0.1'
    );

    // 4. Official Edge installation link is unchanged
    assert.ok(
      seoContent.includes('href="https://microsoftedge.microsoft.com/addons/detail/seo-inspector-meta-tags/jbnjjkfkcmfkjamakndojbkjanijlfmd"'),
      'Official Edge installation link is unchanged'
    );

    // 5. Existing metadata and privacy wording are preserved
    assert.ok(
      seoContent.includes('One-click technical SEO audits evaluating headings, meta tags, OpenGraph previews, schema, and page timing metrics.'),
      'Subhead description is preserved'
    );
    assert.ok(
      seoContent.includes('Built local-first · Privacy by design.'),
      'Privacy design footer badge is preserved'
    );
    assert.ok(
      seoContent.includes('<a href="../privacy" class="nav-link">Privacy</a>'),
      'Nav privacy link is preserved'
    );
    assert.ok(
      seoContent.includes('<a href="../privacy" class="footer-link">Privacy Policy</a>'),
      'Footer privacy link is preserved'
    );

    // 6. No Chrome Web Store availability claim was added for SEO Inspector
    assert.ok(
      !seoContent.includes('Chrome&nbsp;v'),
      'No Chrome version badge was added for SEO Inspector'
    );
    assert.ok(
      !seoContent.includes('Get on Chrome'),
      'No Get on Chrome button was added for SEO Inspector'
    );
    assert.ok(
      !seoContent.includes('chromewebstore.google.com'),
      'No Chrome Web Store download link was added to SEO Inspector page'
    );
    assert.ok(
      seoContent.includes('Official Microsoft Edge Add-on'),
      'Primary badge remains Official Microsoft Edge Add-on'
    );
    assert.equal(
      appNode.operatingSystem,
      'Any, with Microsoft Edge',
      'JSON-LD operatingSystem remains Edge-only'
    );
  });

  await t.test('13. Step 5C: Dual-store landing page clarity for Table Extractor and BulkGrab', () => {
    const tePath = path.join(rootDir, 'table-extractor', 'index.html');
    const bgPath = path.join(rootDir, 'bulkgrab', 'index.html');
    const seoPath = path.join(rootDir, 'seo-inspector', 'index.html');
    const bilexiPath = path.join(rootDir, 'bilexi', 'index.html');
    const tabVaultPath = path.join(rootDir, 'tab-vault', 'index.html');
    const w2lPath = path.join(rootDir, 'word-to-latex', 'index.html');

    const teContent = fs.readFileSync(tePath, 'utf-8');
    const bgContent = fs.readFileSync(bgPath, 'utf-8');
    const seoContent = fs.readFileSync(seoPath, 'utf-8');
    const bilexiContent = fs.readFileSync(bilexiPath, 'utf-8');
    const tabVaultContent = fs.readFileSync(tabVaultPath, 'utf-8');
    const w2lContent = fs.readFileSync(w2lPath, 'utf-8');

    // 1. Both pages display the new badge
    assert.match(
      teContent,
      /<span class="badge badge-edge">Available on Edge & Chrome<\/span>/,
      'Table Extractor hero badge updated to "Available on Edge & Chrome"'
    );
    assert.match(
      bgContent,
      /<span class="badge badge-edge">Available on Edge & Chrome<\/span>/,
      'BulkGrab hero badge updated to "Available on Edge & Chrome"'
    );
    assert.ok(
      !teContent.includes('Official Microsoft Edge Add-on'),
      'Table Extractor no longer contains outdated "Official Microsoft Edge Add-on" badge'
    );
    assert.ok(
      !bgContent.includes('Official Microsoft Edge Add-on'),
      'BulkGrab no longer contains outdated "Official Microsoft Edge Add-on" badge'
    );

    // 2. Both pages retain their official Edge and Chrome installation URLs
    assert.ok(
      teContent.includes('href="https://chromewebstore.google.com/detail/table-extractor-export-h/fjpbjpmccomonleefghgalfoioekhlhm"'),
      'Table Extractor retains official Chrome Web Store download URL'
    );
    assert.ok(
      teContent.includes('href="https://microsoftedge.microsoft.com/addons/detail/table-extractor-export-h/pekammppimoaikllkhhebocbkbidoboe"'),
      'Table Extractor retains official Edge Add-ons download URL'
    );
    assert.ok(
      bgContent.includes('href="https://chromewebstore.google.com/detail/bulkgrab-batch-file-downl/lnmmneljpgdefilkokfpmiohjgfjcljn"'),
      'BulkGrab retains official Chrome Web Store download URL'
    );
    assert.ok(
      bgContent.includes('href="https://microsoftedge.microsoft.com/addons/detail/bulkgrab-batch-file-dow/cphidoikhnjdkeldgelkpddnkojlfccc"'),
      'BulkGrab retains official Edge Add-ons download URL'
    );

    // 3. Table Extractor versions remain Edge 1.0.1 and Chrome 1.0.1
    assert.match(
      teContent,
      /<span class="badge badge-subtle">Published versions:\s*Edge&nbsp;v1\.0\.1 · Chrome&nbsp;v1\.0\.1<\/span>/,
      'Table Extractor displays Edge v1.0.1 · Chrome v1.0.1'
    );

    // 4. BulkGrab versions remain Edge 1.0.0 and Chrome 1.0.3
    assert.match(
      bgContent,
      /<span class="badge badge-subtle">Published versions:\s*Edge&nbsp;v1\.0\.0 · Chrome&nbsp;v1\.0\.3<\/span>/,
      'BulkGrab displays Edge v1.0.0 · Chrome v1.0.3'
    );

    // 5. All other extension pages remain unchanged
    assert.match(
      seoContent,
      /<span class="badge badge-edge">Official Microsoft Edge Add-on<\/span>/,
      'SEO Inspector primary badge remains "Official Microsoft Edge Add-on"'
    );
    assert.match(
      bilexiContent,
      /<span class="badge badge-edge">Official Microsoft Edge Add-on<\/span>/,
      'Bilexi primary badge remains "Official Microsoft Edge Add-on"'
    );
    assert.match(
      tabVaultContent,
      /<span class="badge badge-edge">Official Microsoft Edge Add-on<\/span>/,
      'Tab Vault primary badge remains "Official Microsoft Edge Add-on"'
    );
    assert.match(
      w2lContent,
      /<span class="badge badge-edge">Official Edge &(?:amp;)? Chrome Add-on<\/span>/,
      'Word to LaTeX primary badge remains "Official Edge & Chrome Add-on"'
    );

    // 6. Existing freemium and privacy explanations are preserved
    assert.ok(teContent.includes('500 scroll steps'), 'Table Extractor retains 500 scroll steps disclosure');
    assert.ok(teContent.includes('5,000 rows'), 'Table Extractor retains default 5,000 rows disclosure');
    assert.ok(teContent.includes('optional Pro upgrade'), 'Table Extractor retains optional Pro upgrade disclosure');
    assert.ok(
      bgContent.includes('BulkGrab Free allows up to seven individual file downloads per browser session. BulkGrab Pro removes that session limit and adds ZIP bundling on your device.'),
      'BulkGrab retains seven individual file downloads per session and Pro ZIP bundling disclosure'
    );

    // 7. No false Chrome availability claim is added to other extensions
    for (const [name, content] of [['SEO Inspector', seoContent], ['Bilexi', bilexiContent], ['Tab Vault', tabVaultContent]]) {
      assert.ok(!content.includes('Chrome&nbsp;v'), `${name} has no Chrome version badge`);
      assert.ok(!content.includes('Get on Chrome'), `${name} has no Get on Chrome button`);
      assert.ok(!content.includes('chromewebstore.google.com'), `${name} has no Chrome Web Store link`);
    }
  });

  await t.test('14. Step 5D: Bilexi & Tab Vault hero guide links', () => {
    const bilexiPath = path.join(rootDir, 'bilexi', 'index.html');
    const tabVaultPath = path.join(rootDir, 'tab-vault', 'index.html');
    const seoPath = path.join(rootDir, 'seo-inspector', 'index.html');
    const tePath = path.join(rootDir, 'table-extractor', 'index.html');
    const bgPath = path.join(rootDir, 'bulkgrab', 'index.html');
    const w2lPath = path.join(rootDir, 'word-to-latex', 'index.html');

    const bilexiContent = fs.readFileSync(bilexiPath, 'utf-8');
    const tabVaultContent = fs.readFileSync(tabVaultPath, 'utf-8');
    const seoContent = fs.readFileSync(seoPath, 'utf-8');
    const teContent = fs.readFileSync(tePath, 'utf-8');
    const bgContent = fs.readFileSync(bgPath, 'utf-8');
    const w2lContent = fs.readFileSync(w2lPath, 'utf-8');

    // 1. Bilexi hero secondary CTA points to published French typing guide
    assert.match(
      bilexiContent,
      /<a href="\.\.\/guides\/type-french-accents-on-qwerty-offline\/" class="btn btn-ghost">\s*Read French Typing Guide\s*<\/a>/,
      'Bilexi hero secondary CTA links to French typing guide with class btn btn-ghost'
    );
    // Ensure no target="_blank" on Bilexi hero guide button
    const bilexiHeroCtaMatch = bilexiContent.match(/<a href="\.\.\/guides\/type-french-accents-on-qwerty-offline\/"[^>]*>/);
    assert.ok(bilexiHeroCtaMatch, 'Bilexi hero guide CTA exists');
    assert.ok(!bilexiHeroCtaMatch[0].includes('target="_blank"'), 'Bilexi hero guide CTA uses same-tab navigation');

    // 2. Tab Vault hero secondary CTA points to published tab backup guide
    assert.match(
      tabVaultContent,
      /<a href="\.\.\/guides\/prevent-browser-tab-loss-local-backups\/" class="btn btn-ghost">\s*Read Tab Backup Guide\s*<\/a>/,
      'Tab Vault hero secondary CTA links to tab backup guide with class btn btn-ghost'
    );
    // Ensure no target="_blank" on Tab Vault hero guide button
    const tabVaultHeroCtaMatch = tabVaultContent.match(/<a href="\.\.\/guides\/prevent-browser-tab-loss-local-backups\/"[^>]*>/);
    assert.ok(tabVaultHeroCtaMatch, 'Tab Vault hero guide CTA exists');
    assert.ok(!tabVaultHeroCtaMatch[0].includes('target="_blank"'), 'Tab Vault hero guide CTA uses same-tab navigation');

    // 3. Both relative paths resolve correctly to existing on-disk guides
    const resolvedBilexiGuide = path.resolve(rootDir, 'bilexi', '../guides/type-french-accents-on-qwerty-offline/index.html');
    const resolvedTabVaultGuide = path.resolve(rootDir, 'tab-vault', '../guides/prevent-browser-tab-loss-local-backups/index.html');
    assert.ok(fs.existsSync(resolvedBilexiGuide), 'Resolved Bilexi guide file exists on disk');
    assert.ok(fs.existsSync(resolvedTabVaultGuide), 'Resolved Tab Vault guide file exists on disk');

    // 4. Primary Edge installation buttons remain unchanged
    assert.match(
      bilexiContent,
      /<a href="https:\/\/microsoftedge\.microsoft\.com\/addons\/detail\/mheomahlcfddgjlemnolopfbhojfpmpb" target="_blank" rel="noopener noreferrer" class="btn btn-edge">Get on Edge<\/a>/,
      'Bilexi retains primary Edge install button'
    );
    assert.match(
      tabVaultContent,
      /<a href="https:\/\/microsoftedge\.microsoft\.com\/addons\/detail\/paedfgpjmkmmodbcimbkjkkdlfibfpbc" target="_blank" rel="noopener noreferrer" class="btn btn-edge">Get on Edge<\/a>/,
      'Tab Vault retains primary Edge install button'
    );

    // 5. Product version badges remain unchanged
    assert.match(
      bilexiContent,
      /<span class="badge badge-edge">Official Microsoft Edge Add-on<\/span>/,
      'Bilexi primary badge remains "Official Microsoft Edge Add-on"'
    );
    assert.match(
      bilexiContent,
      /<span class="badge badge-subtle">Published versions:\s*Edge&nbsp;v0\.5\.1<\/span>/,
      'Bilexi version badge remains Edge v0.5.1'
    );
    assert.match(
      tabVaultContent,
      /<span class="badge badge-edge">Official Microsoft Edge Add-on<\/span>/,
      'Tab Vault primary badge remains "Official Microsoft Edge Add-on"'
    );
    assert.match(
      tabVaultContent,
      /<span class="badge badge-subtle">Published versions:\s*Edge&nbsp;v1\.0\.0<\/span>/,
      'Tab Vault version badge remains Edge v1.0.0'
    );

    // 6. Footer portfolio repository links labeled Website source
    assert.ok(
      bilexiContent.includes('<a href="https://github.com/sidoua26-debug/extensions-portfolio" target="_blank" rel="noopener noreferrer" class="footer-link">Website source</a>'),
      'Bilexi footer retains GitHub Website source link'
    );
    assert.ok(
      tabVaultContent.includes('<a href="https://github.com/sidoua26-debug/extensions-portfolio" target="_blank" rel="noopener noreferrer" class="footer-link">Website source</a>'),
      'Tab Vault footer retains GitHub Website source link'
    );
    assert.ok(
      seoContent.includes('<a href="https://github.com/sidoua26-debug/extensions-portfolio" target="_blank" rel="noopener noreferrer" class="footer-link">Website source</a>'),
      'SEO Inspector footer retains GitHub Website source link'
    );
    assert.ok(
      teContent.includes('<a href="https://github.com/sidoua26-debug/extensions-portfolio" target="_blank" rel="noopener noreferrer" class="footer-link">Website source</a>'),
      'Table Extractor footer retains GitHub Website source link'
    );
    assert.ok(
      bgContent.includes('<a href="https://github.com/sidoua26-debug/extensions-portfolio" target="_blank" rel="noopener noreferrer" class="footer-link">Website source</a>'),
      'BulkGrab footer retains GitHub Website source link'
    );
    assert.ok(
      w2lContent.includes('<a href="https://github.com/sidoua26-debug/extensions-portfolio" target="_blank" rel="noopener noreferrer" class="footer-link">Website source</a>'),
      'Word to LaTeX footer retains GitHub Website source link'
    );

    // 7. Product source repository links across all 6 products and homepage flagship
    const indexContent = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');
    assert.match(
      indexContent,
      /<a href="https:\/\/github\.com\/sidoua26-debug\/word-to-latex-extension" target="_blank" rel="noopener noreferrer" class="btn btn-ghost">[\s\S]*?Open source on GitHub[\s\S]*?<\/a>/,
      'Homepage flagship links to word-to-latex-extension repository'
    );
    assert.ok(
      indexContent.includes('<a href="https://github.com/sidoua26-debug/extensions-portfolio" target="_blank" rel="noopener noreferrer" class="footer-link">Website source</a>'),
      'Homepage footer retains GitHub Website source link'
    );
    assert.match(
      w2lContent,
      /<a href="https:\/\/github\.com\/sidoua26-debug\/word-to-latex-extension" target="_blank" rel="noopener noreferrer" class="btn btn-ghost">\s*Source on GitHub\s*<\/a>/,
      'Word to LaTeX links to word-to-latex-extension repository'
    );
    assert.match(
      teContent,
      /<a href="https:\/\/github\.com\/sidoua26-debug\/table-extractor" target="_blank" rel="noopener noreferrer" class="btn btn-ghost">\s*GitHub \(@sidoua26-debug\)\s*<\/a>/,
      'Table Extractor links to table-extractor repository'
    );
    assert.match(
      bgContent,
      /<a href="https:\/\/github\.com\/sidoua26-debug\/bulkgrab" target="_blank" rel="noopener noreferrer" class="btn btn-ghost">\s*GitHub \(@sidoua26-debug\)\s*<\/a>/,
      'BulkGrab links to bulkgrab repository'
    );
    assert.match(
      seoContent,
      /<a href="https:\/\/github\.com\/sidoua26-debug\/seo-inspector-extension" target="_blank" rel="noopener noreferrer" class="btn btn-ghost">\s*GitHub \(@sidoua26-debug\)\s*<\/a>/,
      'SEO Inspector links to seo-inspector-extension repository'
    );
    assert.match(
      bilexiContent,
      /<a href="https:\/\/github\.com\/sidoua26-debug\/bilexi" target="_blank" rel="noopener noreferrer" class="btn btn-ghost">\s*Extension source on GitHub\s*<\/a>/,
      'Bilexi links to bilexi repository'
    );
    assert.ok(
      bilexiContent.includes('Source code and licensing'),
      'Bilexi page contains Source code and licensing heading'
    );
    assert.match(
      bilexiContent,
      /Bilexi[’']s source is public for inspection\. The author reserves rights in the original code; redistribution and incorporation into other products require written permission\. Bundled dictionaries and other third-party materials retain their own licenses\./,
      'Bilexi page contains verified licensing status copy'
    );
    assert.ok(
      bilexiContent.includes('href="https://github.com/sidoua26-debug/bilexi#project-licensing-status"'),
      'Bilexi links to project licensing status section'
    );
    assert.ok(
      bilexiContent.includes('href="https://github.com/sidoua26-debug/bilexi/blob/main/THIRD_PARTY_NOTICES.md"'),
      'Bilexi links to third-party notices'
    );
    assert.match(
      tabVaultContent,
      /<a href="https:\/\/github\.com\/sidoua26-debug\/tab-vault" target="_blank" rel="noopener noreferrer" class="btn btn-ghost">\s*Extension source on GitHub\s*<\/a>/,
      'Tab Vault links to tab-vault repository'
    );

    // 8. Other extension landing page badges remain unchanged
    assert.match(
      teContent,
      /<span class="badge badge-edge">Available on Edge & Chrome<\/span>/,
      'Table Extractor retains Available on Edge & Chrome badge'
    );
    assert.match(
      bgContent,
      /<span class="badge badge-edge">Available on Edge & Chrome<\/span>/,
      'BulkGrab retains Available on Edge & Chrome badge'
    );
    assert.match(
      w2lContent,
      /<span class="badge badge-edge">Official Edge &(?:amp;)? Chrome Add-on<\/span>/,
      'Word to LaTeX retains primary badge'
    );
  });

  await t.test('15. Step 5E: Mobile breadcrumb accessibility on extension landing pages', () => {
    const productSlugs = [
      'word-to-latex',
      'table-extractor',
      'bulkgrab',
      'seo-inspector',
      'bilexi',
      'tab-vault'
    ];

    // 1. All six product pages include the product-breadcrumb class on breadcrumb nav
    for (const slug of productSlugs) {
      const pagePath = path.join(rootDir, slug, 'index.html');
      const content = fs.readFileSync(pagePath, 'utf-8');

      // Verify breadcrumb nav element has product-breadcrumb class
      assert.match(
        content,
        /<nav aria-label="Breadcrumb" class="product-breadcrumb"/,
        `${slug} breadcrumb nav has class="product-breadcrumb"`
      );

      // Verify breadcrumb Home link label and relative destination
      assert.match(
        content,
        /<a href="\.\.\/" style="color: var\(--accent\); text-decoration: underline;">Home<\/a>/,
        `${slug} retains Home link pointing to "../"`
      );

      // Verify JSON-LD BreadcrumbList is intact
      assert.ok(
        content.includes('"@type": "BreadcrumbList"'),
        `${slug} retains BreadcrumbList structured data`
      );
      assert.ok(
        content.includes('"name": "Home"'),
        `${slug} JSON-LD includes Home level`
      );

      // Verify stylesheet link is updated to v=3 for cache-busting
      assert.match(
        content,
        /<link rel="stylesheet" href="\.\.\/assets\/css\/styles\.css\?v=3">/,
        `${slug} links to styles.css?v=3`
      );
    }

    // 2. assets/css/styles.css contains the responsive touch-target rule
    const stylesPath = path.join(rootDir, 'assets', 'css', 'styles.css');
    const stylesContent = fs.readFileSync(stylesPath, 'utf-8');

    assert.ok(
      stylesContent.includes('.product-breadcrumb'),
      'styles.css includes .product-breadcrumb selector'
    );
    assert.ok(
      stylesContent.includes('.product-breadcrumb a'),
      'styles.css includes .product-breadcrumb a selector'
    );
    assert.match(
      stylesContent,
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.product-breadcrumb\s*\{[\s\S]*?min-height:\s*44px/i,
      'styles.css provides min-height: 44px for .product-breadcrumb on mobile & tablet'
    );
    assert.match(
      stylesContent,
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.product-breadcrumb a\s*\{[\s\S]*?min-height:\s*44px[\s\S]*?min-width:\s*44px/i,
      'styles.css provides min-height: 44px and min-width: 44px for .product-breadcrumb a on mobile & tablet'
    );

    // 3. Store buttons, versions, and guide links remain unchanged across products
    const bilexiContent = fs.readFileSync(path.join(rootDir, 'bilexi', 'index.html'), 'utf-8');
    const tabVaultContent = fs.readFileSync(path.join(rootDir, 'tab-vault', 'index.html'), 'utf-8');
    const teContent = fs.readFileSync(path.join(rootDir, 'table-extractor', 'index.html'), 'utf-8');
    const bgContent = fs.readFileSync(path.join(rootDir, 'bulkgrab', 'index.html'), 'utf-8');
    const seoContent = fs.readFileSync(path.join(rootDir, 'seo-inspector', 'index.html'), 'utf-8');
    const w2lContent = fs.readFileSync(path.join(rootDir, 'word-to-latex', 'index.html'), 'utf-8');

    assert.ok(bilexiContent.includes('Read French Typing Guide'), 'Bilexi retains guide link');
    assert.ok(tabVaultContent.includes('Read Tab Backup Guide'), 'Tab Vault retains guide link');
    assert.ok(teContent.includes('Available on Edge & Chrome'), 'Table Extractor retains dual store badge');
    assert.ok(bgContent.includes('Available on Edge & Chrome'), 'BulkGrab retains dual store badge');
    assert.ok(seoContent.includes('Published versions: Edge&nbsp;v1.0.1'), 'SEO Inspector retains Edge v1.0.1');
    assert.ok(w2lContent.includes('word-to-latex-converter'), 'Word to LaTeX retains online converter link');
  });

  await t.test('16. Step 5F: Homepage trust & accuracy messaging', () => {
    const indexPath = path.join(rootDir, 'index.html');
    const generatorPath = path.join(rootDir, 'build_redesign.py');
    const storeVersionsPath = path.join(rootDir, 'store-versions.json');

    const indexContent = fs.readFileSync(indexPath, 'utf-8');
    const generatorContent = fs.readFileSync(generatorPath, 'utf-8');
    const storeVersions = JSON.parse(fs.readFileSync(storeVersionsPath, 'utf-8'));

    // 1. Dynamic store count validation against store-versions.json
    let edgeCount = 0;
    let chromeCount = 0;
    for (const [key, item] of Object.entries(storeVersions)) {
      if (item.stores) {
        if (item.stores.edge) edgeCount++;
        if (item.stores.chrome) chromeCount++;
      }
    }
    assert.equal(edgeCount, 6, 'Exactly 6 extensions available on Edge in store-versions.json');
    assert.equal(chromeCount, 3, 'Exactly 3 extensions available on Chrome in store-versions.json');

    const expectedBadgeText = `All ${edgeCount} on Edge · ${chromeCount} on Chrome`;

    // 2. The new trust messages appear in homepage hero
    assert.match(
      indexContent,
      new RegExp(`<span>${expectedBadgeText}</span>`),
      'Hero trust badge displays dynamic Edge & Chrome availability count'
    );
    assert.match(
      indexContent,
      /<span>No Ads · No Extension Telemetry<\/span>/,
      'Hero trust badge clarifies "No Ads · No Extension Telemetry"'
    );
    assert.match(
      indexContent,
      /<span>Website Code on GitHub<\/span>/,
      'Hero trust badge clarifies "Website Code on GitHub"'
    );
    assert.match(
      indexContent,
      /<span>Local In-Browser Processing<\/span>/,
      'Hero trust badge preserves "Local In-Browser Processing"'
    );

    // 3. Old misleading text is absent from the targeted locations
    const heroTrustRowMatch = indexContent.match(/<div class="hero-trust-row" role="list">([\s\S]*?)<\/div>\s*<div class="hero-actions"/);
    assert.ok(heroTrustRowMatch, 'Hero trust row exists');
    const heroTrustRow = heroTrustRowMatch[1];

    assert.ok(!heroTrustRow.includes('Published on Edge Add-ons'), 'Old "Published on Edge Add-ons" absent from hero');
    assert.ok(!heroTrustRow.includes('<span>No Ads · No Telemetry</span>'), 'Old "No Ads · No Telemetry" absent from hero');
    assert.ok(!heroTrustRow.includes('<span>Open Source on GitHub</span>'), 'Old "Open Source on GitHub" absent from hero');

    // 4. Word-to-LaTeX flagship badge acknowledges both stores
    const flagshipBenefitsMatch = indexContent.match(/<div class="flagship-benefits">([\s\S]*?)<div class="benefit-group">/);
    assert.ok(flagshipBenefitsMatch, 'Flagship benefits section exists');
    const flagshipBenefits = flagshipBenefitsMatch[1];

    assert.match(
      flagshipBenefits,
      /<span class="badge badge-edge">Available on Edge & Chrome<\/span>/,
      'Flagship badge updated to "Available on Edge & Chrome"'
    );
    assert.ok(
      !flagshipBenefits.includes('<span class="badge badge-edge">Published on Edge Add-ons</span>'),
      'Old "Published on Edge Add-ons" absent from flagship badge'
    );
    assert.match(
      flagshipBenefits,
      /<span class="badge badge-w2l">Published versions:\s*Edge&nbsp;v1\.0\.7 · Chrome&nbsp;v1\.0\.7<\/span>/,
      'Flagship retains published version details'
    );

    // 5. Existing browser store installation URLs remain unchanged on homepage
    assert.ok(
      indexContent.includes('lpehnpdkdiddlppobkcicdondaebijlf'),
      'Homepage retains official Word to LaTeX Edge store link'
    );
    assert.ok(
      indexContent.includes('href="https://chromewebstore.google.com/detail/word-to-latex-offline/appokjanohamffjlecncdegihoelkhco"'),
      'Homepage retains official Word to LaTeX Chrome store link'
    );

    // 6. Generator and generated HTML remain synchronized
    assert.match(
      generatorContent,
      new RegExp(`<span>${expectedBadgeText}</span>`),
      'Generator source contains new hero availability badge'
    );
    assert.match(
      generatorContent,
      /<span>No Ads · No Extension Telemetry<\/span>/,
      'Generator source contains updated telemetry badge'
    );
    assert.match(
      generatorContent,
      /<span>Website Code on GitHub<\/span>/,
      'Generator source contains updated open-source badge'
    );
    assert.match(
      generatorContent,
      /<span class="badge badge-edge">Available on Edge & Chrome<\/span>/,
      'Generator source contains updated flagship badge'
    );

    // 7. Plausible integration removed and privacy links are unchanged
    assert.ok(!indexContent.includes('assets/js/plausible-init.js'), 'Plausible init script removed');
    assert.ok(!indexContent.includes('https://plausible.io'), 'Plausible official script removed');
    assert.ok(indexContent.includes('<a href="/privacy" class="nav-link">Privacy</a>'), 'Nav privacy link retained');
    assert.ok(indexContent.includes('<a href="/privacy" class="footer-link">Privacy Policy</a>'), 'Footer privacy link retained');

    // 8. Other sections and pages remain intact
    assert.ok(indexContent.includes('id="live-converter"'), 'Live converter demo section retained');
    assert.ok(indexContent.includes('pdf-tools/'), 'PDF tools reference retained');

    // 9. PDF card and PDF tools privacy copy assertions
    assert.ok(
      indexContent.includes('Merge, split, rotate, compress, and redact PDFs in your browser. Your files are processed on your device.'),
      'Homepage PDF card has updated local processing copy'
    );
    assert.ok(!indexContent.includes('zero analytics'), 'Homepage PDF card avoids "zero analytics" claim');
    assert.ok(
      generatorContent.includes('Merge, split, rotate, compress, and redact PDFs in your browser. Your files are processed on your device.'),
      'Generator has updated local processing copy'
    );
    assert.ok(!generatorContent.includes('zero analytics'), 'Generator avoids "zero analytics" claim');
    assert.ok(
      !indexContent.includes('Transparent, open-source codebases hosted on GitHub'),
      'Homepage index.html removes collective open-source claim'
    );
    assert.ok(
      !generatorContent.includes('Transparent, open-source codebases hosted on GitHub'),
      'Generator removes collective open-source claim'
    );
    assert.match(
      indexContent,
      /Source code is published on GitHub so you can inspect the implementation, review dependencies, and check how each tool handles data\. Reuse rights vary by project; check each repository[’']s licensing status and third-party notices\./,
      'Homepage index.html contains updated licensing disclosure'
    );
    assert.match(
      generatorContent,
      /Source code is published on GitHub so you can inspect the implementation, review dependencies, and check how each tool handles data\. Reuse rights vary by project; check each repository[’']s licensing status and third-party notices\./,
      'Generator contains updated licensing disclosure'
    );

    const pdfToolsPath = path.join(rootDir, 'pdf-tools/index.html');
    const pdfToolsContent = fs.readFileSync(pdfToolsPath, 'utf-8');
    assert.ok(!pdfToolsContent.includes('Air-Gapped Privacy'), 'pdf-tools avoids "Air-Gapped Privacy" claim');
    assert.ok(pdfToolsContent.includes('Local PDF processing'), 'pdf-tools includes "Local PDF processing" feature pill');
    assert.ok(
      pdfToolsContent.includes('PDF files are processed on your device.'),
      'pdf-tools includes file picker privacy notice'
    );
    assert.ok(
      !pdfToolsContent.includes('This website uses Plausible for cookieless website statistics.'),
      'pdf-tools avoids Plausible cookieless statistics disclosure near file picker'
    );
  });

  await t.test('17. Step 7A: Visibility-2B schema accuracy, store URLs, Edge constraints, and internal link', () => {
    // 1. Bilexi and Tab Vault software versions on product pages
    const bilexiPath = path.join(rootDir, 'bilexi', 'index.html');
    const tabVaultPath = path.join(rootDir, 'tab-vault', 'index.html');
    const bilexiJson = JSON.parse(fs.readFileSync(bilexiPath, 'utf-8').match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    const tabVaultJson = JSON.parse(fs.readFileSync(tabVaultPath, 'utf-8').match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);

    const bilexiApp = (bilexiJson['@graph'] || [bilexiJson]).find((n) => n['@type'] === 'SoftwareApplication');
    const tabVaultApp = (tabVaultJson['@graph'] || [tabVaultJson]).find((n) => n['@type'] === 'SoftwareApplication');

    assert.equal(bilexiApp.softwareVersion, '0.5.1', 'bilexi/index.html includes softwareVersion 0.5.1');
    assert.equal(tabVaultApp.softwareVersion, '1.0.0', 'tab-vault/index.html includes softwareVersion 1.0.0');

    // 2. Dual-store URLs for Word to LaTeX, Table Extractor, and BulkGrab
    const dualStorePages = ['word-to-latex/index.html', 'table-extractor/index.html', 'bulkgrab/index.html'];
    for (const rel of dualStorePages) {
      const pageJson = JSON.parse(fs.readFileSync(path.join(rootDir, rel), 'utf-8').match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
      const app = (pageJson['@graph'] || [pageJson]).find((n) => n['@type'] === 'SoftwareApplication');
      assert.ok(Array.isArray(app.downloadUrl), `${rel} downloadUrl is an array`);
      assert.equal(app.downloadUrl.length, 2, `${rel} downloadUrl references exactly 2 store URLs`);
      assert.ok(app.downloadUrl.some((url) => url.includes('microsoftedge.microsoft.com')), `${rel} includes Edge downloadUrl`);
      assert.ok(app.downloadUrl.some((url) => url.includes('chromewebstore.google.com')), `${rel} includes Chrome downloadUrl`);
      assert.equal(app.operatingSystem, 'Any, with Microsoft Edge or Google Chrome', `${rel} operatingSystem reflects both browsers`);
      assert.deepEqual(app.offers, { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, `${rel} offers is free ($0 USD)`);
    }

    // Also verify homepage JSON-LD for dual-store products
    const indexJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8').match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    const indexApps = (indexJson['@graph'] || [indexJson]).filter((n) => n['@type'] === 'SoftwareApplication');
    const w2lHome = indexApps.find((n) => n.name.includes('Word to LaTeX'));
    const teHome = indexApps.find((n) => n.name.includes('Table Extractor'));
    const bgHome = indexApps.find((n) => n.name.includes('BulkGrab'));

    for (const [name, app] of [['Word to LaTeX', w2lHome], ['Table Extractor', teHome], ['BulkGrab', bgHome]]) {
      assert.ok(Array.isArray(app.downloadUrl), `Homepage ${name} downloadUrl is an array`);
      assert.equal(app.downloadUrl.length, 2, `Homepage ${name} downloadUrl references 2 stores`);
      assert.ok(app.downloadUrl.some((url) => url.includes('microsoftedge.microsoft.com')), `Homepage ${name} includes Edge downloadUrl`);
      assert.ok(app.downloadUrl.some((url) => url.includes('chromewebstore.google.com')), `Homepage ${name} includes Chrome downloadUrl`);
      assert.equal(app.operatingSystem, 'Any, with Microsoft Edge or Google Chrome', `Homepage ${name} operatingSystem reflects both browsers`);
      assert.deepEqual(app.offers, { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, `Homepage ${name} offers is free`);
    }

    // 3. Edge-only constraints on SEO Inspector, Bilexi, and Tab Vault
    const edgeOnlyPages = ['seo-inspector/index.html', 'bilexi/index.html', 'tab-vault/index.html'];
    for (const rel of edgeOnlyPages) {
      const pageJson = JSON.parse(fs.readFileSync(path.join(rootDir, rel), 'utf-8').match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
      const app = (pageJson['@graph'] || [pageJson]).find((n) => n['@type'] === 'SoftwareApplication');
      assert.equal(typeof app.downloadUrl, 'string', `${rel} downloadUrl is a single string`);
      assert.ok(app.downloadUrl.startsWith('https://microsoftedge.microsoft.com/'), `${rel} downloadUrl points to Microsoft Edge only`);
      assert.ok(!app.downloadUrl.includes('chromewebstore.google.com'), `${rel} downloadUrl does not reference Chrome`);
      assert.equal(app.operatingSystem, 'Any, with Microsoft Edge', `${rel} operatingSystem is Edge-only`);
    }

    // 4. Contextual guide-to-extension link in word-tables-to-latex
    const guidePath = path.join(rootDir, 'guides', 'word-tables-to-latex', 'index.html');
    const guideContent = fs.readFileSync(guidePath, 'utf-8');
    assert.match(
      guideContent,
      /<a href="\.\.\/\.\.\/word-to-latex\/"[^>]*>Word to LaTeX browser extension<\/a>/,
      'Guide contains contextual link to /word-to-latex/ with descriptive anchor text'
    );

    // 5. Generator reproducibility
    const currentHome = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');
    execSync('python3 build_redesign.py', { cwd: rootDir });
    const regeneratedHome = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');
    assert.equal(currentHome, regeneratedHome, 'Homepage generator is 100% deterministic and reproducible');
  });

  await t.test('18. Step 7C: Product version consistency across homepage, product pages, and store-versions.json', () => {
    const storeVersions = JSON.parse(fs.readFileSync(path.join(rootDir, 'store-versions.json'), 'utf-8'));
    const indexContent = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');

    const extensions = [
      'word-to-latex',
      'table-extractor',
      'bulkgrab',
      'seo-inspector',
      'bilexi',
      'tab-vault'
    ];

    for (const key of extensions) {
      const data = storeVersions[key];
      const stores = data.stores;
      const parts = [];
      if (stores.edge) parts.push(`Edge&nbsp;v${stores.edge.version}`);
      if (stores.chrome) parts.push(`Chrome&nbsp;v${stores.chrome.version}`);
      const expectedBadge = `Published versions: ${parts.join(' · ')}`;

      // 1. Homepage card micro badge matches store-versions.json
      const cardRegex = new RegExp(`<article[^>]*id="${key}"[\\s\\S]*?<div class="card-version-micro">([^<]+)<\\/div>`);
      const cardMatch = indexContent.match(cardRegex);
      assert.ok(cardMatch, `Card for ${key} must exist on homepage`);
      assert.equal(
        cardMatch[1].trim(),
        expectedBadge,
        `Homepage card ${key} version badge matches store-versions.json (${expectedBadge})`
      );

      // 2. Product page hero badge matches store-versions.json
      const pageContent = fs.readFileSync(path.join(rootDir, key, 'index.html'), 'utf-8');
      const heroMatch = pageContent.match(/<span class="badge badge-subtle">\s*(Published versions:[^<]+)<\/span>/);
      assert.ok(heroMatch, `Product page ${key} contains hero version badge`);
      assert.equal(
        heroMatch[1].trim(),
        expectedBadge,
        `Product page ${key} hero badge matches store-versions.json (${expectedBadge})`
      );

      // 3. For single-store or aligned dual-store extensions, verify JSON-LD softwareVersion matches
      const pageJson = JSON.parse(pageContent.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
      const appNode = (pageJson['@graph'] || [pageJson]).find((n) => n['@type'] === 'SoftwareApplication');
      assert.ok(appNode, `SoftwareApplication node exists in ${key}/index.html`);

      if (stores.edge && stores.chrome) {
        if (stores.edge.version === stores.chrome.version) {
          assert.equal(
            appNode.softwareVersion,
            stores.edge.version,
            `${key} aligned version ${stores.edge.version} reflected in product JSON-LD`
          );
        } else {
          // Divergent versions across stores (e.g. BulkGrab: Edge 1.0.0 vs Chrome 1.0.3)
          assert.equal(
            appNode.softwareVersion,
            undefined,
            `${key} divergent store versions correctly omit single softwareVersion`
          );
        }
      } else if (stores.edge) {
        // Edge-only products
        assert.equal(
          appNode.softwareVersion,
          stores.edge.version,
          `${key} Edge version ${stores.edge.version} reflected in product JSON-LD`
        );
      }
    }

    // 4. Verify generator reproducibility
    const homeBefore = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');
    execSync('python3 build_redesign.py', { cwd: rootDir });
    const homeAfter = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');
    assert.equal(homeBefore, homeAfter, 'build_redesign.py produces deterministic output');
  });

  await t.test('19. Step 7D: Changelog release accuracy and store version consistency', () => {
    const changelogPath = path.join(rootDir, 'changelog', 'index.html');
    const changelogContent = fs.readFileSync(changelogPath, 'utf-8');
    const storeVersions = JSON.parse(fs.readFileSync(path.join(rootDir, 'store-versions.json'), 'utf-8'));
    const sitemapContent = fs.readFileSync(path.join(rootDir, 'sitemap.xml'), 'utf-8');

    const extensions = [
      'word-to-latex',
      'table-extractor',
      'bulkgrab',
      'seo-inspector',
      'bilexi',
      'tab-vault'
    ];

    for (const key of extensions) {
      const articleRegex = new RegExp(`<article[^>]*id="${key}"[\\s\\S]*?<\\/article>`);
      const articleMatch = changelogContent.match(articleRegex);
      assert.ok(articleMatch, `Changelog must contain article section for ${key}`);
      const articleHtml = articleMatch[0];

      // Extract all h3 headings within this article
      const headingRegex = /<h3[^>]*>([\s\S]*?)<\/h3>/g;
      let headingMatch;
      while ((headingMatch = headingRegex.exec(articleHtml)) !== null) {
        const headingText = headingMatch[1].trim();

        // Check if heading claims to represent a "Current" store version
        const currentMatch = headingText.match(/v?([0-9.]+)\s*\((?:Current\s*(?:&mdash;|—|-)\s*([^)]+))\)/i);
        if (currentMatch) {
          const claimedVersion = currentMatch[1];
          const storeScope = currentMatch[2].toLowerCase();
          const stores = storeVersions[key].stores;

          const mentionsEdge = storeScope.includes('edge');
          const mentionsChrome = storeScope.includes('chrome');

          if (mentionsEdge && !mentionsChrome) {
            assert.ok(stores.edge, `Changelog claims Edge version for ${key}, stores.edge must exist`);
            assert.equal(
              claimedVersion,
              stores.edge.version,
              `Changelog ${key} Current Edge version (${claimedVersion}) matches store-versions.json (${stores.edge.version})`
            );
          } else if (mentionsChrome && !mentionsEdge) {
            assert.ok(stores.chrome, `Changelog claims Chrome version for ${key}, stores.chrome must exist`);
            assert.equal(
              claimedVersion,
              stores.chrome.version,
              `Changelog ${key} Current Chrome version (${claimedVersion}) matches store-versions.json (${stores.chrome.version})`
            );
          } else if (mentionsEdge && mentionsChrome) {
            assert.ok(stores.edge && stores.chrome, `Changelog claims Edge & Chrome version for ${key}`);
            assert.equal(
              claimedVersion,
              stores.edge.version,
              `Changelog ${key} Current Edge version (${claimedVersion}) matches store-versions.json Edge (${stores.edge.version})`
            );
            assert.equal(
              claimedVersion,
              stores.chrome.version,
              `Changelog ${key} Current Chrome version (${claimedVersion}) matches store-versions.json Chrome (${stores.chrome.version})`
            );
          }
        }
      }
    }

    // Specific regression assertions: older versions in SEO Inspector and Bilexi must not be labeled as "Current"
    const seoArticle = changelogContent.match(/<article[^>]*id="seo-inspector"[\s\S]*?<\/article>/)?.[0] || '';
    assert.ok(
      !seoArticle.includes('v1.0.0 (Current'),
      'SEO Inspector v1.0.0 is not labeled as Current'
    );

    const bilexiArticle = changelogContent.match(/<article[^>]*id="bilexi"[\s\S]*?<\/article>/)?.[0] || '';
    assert.ok(
      !bilexiArticle.includes('v0.5.0 (Current'),
      'Bilexi v0.5.0 is not labeled as Current'
    );

    // Initial release notes are preserved with accurate labeling
    assert.ok(
      seoArticle.includes('v1.0.0 (Initial Release &mdash; Edge)'),
      'SEO Inspector preserves v1.0.0 as Initial Release — Edge'
    );
    assert.ok(
      bilexiArticle.includes('v0.5.0 (Initial Release &mdash; Edge)'),
      'Bilexi preserves v0.5.0 as Initial Release — Edge'
    );

    // SEO Inspector and Bilexi link to their respective product pages for published versions
    assert.match(
      changelogContent,
      /<a href="\.\.\/seo-inspector\/"[^>]*>SEO Inspector product page<\/a>/,
      'SEO Inspector changelog section links to product page for current version details'
    );
    assert.match(
      changelogContent,
      /<a href="\.\.\/bilexi\/"[^>]*>Bilexi product page<\/a>/,
      'Bilexi changelog section links to product page for current version details'
    );

    // Sitemap lastmod for changelog is updated to 2026-11-09 (v1.0.7 release notes)
    assert.match(
      sitemapContent,
      /<loc>https:\/\/extensionguy\.me\/changelog\/<\/loc>\s*<lastmod>2026-11-09<\/lastmod>/,
      'sitemap.xml reflects lastmod 2026-11-09 for changelog'
    );
  });
});
