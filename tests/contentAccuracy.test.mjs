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
});
