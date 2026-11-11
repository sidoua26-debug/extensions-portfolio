/**
 * BrowserStack Automated Smoke Test for ExtensionGuy
 * Target: Deployed production website (https://extensionguy.me/)
 * Platform: Real Android device (Chrome) via BrowserStack Playwright CDP endpoint
 */

import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const TARGET_URL = (process.env.TARGET_URL || 'https://extensionguy.me').replace(/\/+$/, '');
const ARTIFACTS_DIR = path.resolve(process.env.ARTIFACTS_DIR || 'artifacts/browserstack-smoke');

const BROWSERSTACK_USERNAME = process.env.BROWSERSTACK_USERNAME;
const BROWSERSTACK_ACCESS_KEY = process.env.BROWSERSTACK_ACCESS_KEY;
const DEVICE_NAME = process.env.BROWSERSTACK_DEVICE || 'Google Pixel 8';
const OS_VERSION = process.env.BROWSERSTACK_OS_VERSION || '14.0';
const BUILD_NAME = process.env.BROWSERSTACK_BUILD_NAME || `extensionguy-smoke-${new Date().toISOString().slice(0, 10)}`;

fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

async function run() {
  const summary = {
    targetUrl: TARGET_URL,
    device: DEVICE_NAME,
    osVersion: OS_VERSION,
    browser: 'Chrome (Mobile)',
    timestamp: new Date().toISOString(),
    status: 'pending',
    sessionId: null,
    dashboardUrl: null,
    checks: {},
    screenshots: []
  };

  // If credentials are missing, handle cleanly without failing unauthenticated runs
  if (!BROWSERSTACK_USERNAME || !BROWSERSTACK_ACCESS_KEY) {
    console.log('[SKIP] BROWSERSTACK_USERNAME or BROWSERSTACK_ACCESS_KEY is not defined.');
    console.log('Skipping remote BrowserStack execution. Configure repository secrets to enable.');
    summary.status = 'skipped';
    summary.reason = 'Missing BrowserStack credentials';
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
    return;
  }

  const capabilities = {
    browserName: 'chrome',
    deviceName: DEVICE_NAME,
    osVersion: OS_VERSION,
    realMobile: 'true',
    name: `ExtensionGuy Smoke Test (${DEVICE_NAME})`,
    build: BUILD_NAME,
    'browserstack.username': BROWSERSTACK_USERNAME,
    'browserstack.accessKey': BROWSERSTACK_ACCESS_KEY,
  };

  const wsEndpoint = `wss://cdp.browserstack.com/playwright?caps=${encodeURIComponent(JSON.stringify(capabilities))}`;

  console.log(`Connecting to BrowserStack on real Android device: ${DEVICE_NAME} (Android ${OS_VERSION})...`);
  const browser = await chromium.connect(wsEndpoint);
  let page;

  try {
    const context = await browser.newContext({
      viewport: null, // use native device screen size
    });
    page = await context.newPage();

    // Retrieve BrowserStack session details
    try {
      const rawDetails = await page.evaluate(_ => {}, `browserstack_executor: ${JSON.stringify({ action: 'getSessionDetails' })}`);
      const details = typeof rawDetails === 'string' ? JSON.parse(rawDetails) : (rawDetails || {});
      summary.sessionId = details.hashed_id || details.session_id || null;
      summary.dashboardUrl = details.public_url || details.browser_url || null;
      console.log(`BrowserStack Session ID: ${summary.sessionId || 'allocated'}`);
      if (summary.dashboardUrl) {
        console.log(`BrowserStack Dashboard: ${summary.dashboardUrl}`);
      }
    } catch (err) {
      console.warn('Could not read session details via executor:', err.message);
    }

    // -------------------------------------------------------------
    // Check 1: Homepage
    // -------------------------------------------------------------
    console.log(`\n[Check 1] Inspecting Homepage at ${TARGET_URL}/`);
    await page.goto(`${TARGET_URL}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });

    const title = await page.title();
    assert.match(title, /ExtensionGuy/i, `Expected title to contain ExtensionGuy, got: "${title}"`);
    console.log(`  ✔ Title verified: "${title}"`);

    const h1Visible = await page.locator('h1').first().isVisible();
    assert.ok(h1Visible, 'Main heading h1 is visible');
    const h1Text = (await page.locator('h1').first().textContent()).trim();
    console.log(`  ✔ Main heading visible: "${h1Text}"`);

    // Mobile Navigation
    const mobileMenuBtn = page.locator('#mobileMenuBtn');
    if (await mobileMenuBtn.isVisible()) {
      console.log('  Testing mobile menu toggle...');
      await mobileMenuBtn.click();
      await page.waitForTimeout(400);

      const navExpanded = await mobileMenuBtn.getAttribute('aria-expanded');
      assert.equal(navExpanded, 'true', 'Mobile menu expands on click');

      const navLinks = page.locator('#navLinks a');
      const navCount = await navLinks.count();
      assert.ok(navCount >= 3, `Expected at least 3 nav links, found ${navCount}`);
      console.log(`  ✔ Mobile navigation open with ${navCount} usable links`);

      // Close menu
      await mobileMenuBtn.click();
      await page.waitForTimeout(300);
    } else {
      console.log('  Note: Desktop view active; mobile toggle hidden');
    }

    // Sample DOCX conversion
    console.log('  Testing sample DOCX conversion...');
    const sampleBtn = page.locator('#converterSampleBtn');
    await sampleBtn.scrollIntoViewIfNeeded();
    await sampleBtn.click();

    // Wait for conversion completion
    const outputContainer = page.locator('#converterOutputContainer:not([hidden])');
    await outputContainer.waitFor({ state: 'visible', timeout: 50000 });

    const outputText = await page.locator('#converterOutputArea').inputValue();
    assert.ok(outputText.length > 50, 'LaTeX output is non-empty');
    assert.ok(
      outputText.includes('\\begin{longtable}') || outputText.includes('Document Structure') || outputText.includes('\\textbf{'),
      'LaTeX output contains expected sample manuscript structure'
    );
    console.log(`  ✔ Sample DOCX converted successfully (${outputText.length} chars output)`);

    const shot1 = path.join(ARTIFACTS_DIR, '01-homepage-sample-converted.png');
    await page.screenshot({ path: shot1, fullPage: false });
    summary.screenshots.push('01-homepage-sample-converted.png');

    // Convert Another / Reset state restoration
    console.log('  Testing "Convert Another" reset...');
    const resetBtn = page.locator('#converterResetBtn');
    await resetBtn.click();
    await page.waitForTimeout(400);

    const isOutputHidden = await page.locator('#converterOutputContainer').getAttribute('hidden');
    assert.ok(isOutputHidden !== null, 'Output container is hidden after reset');
    assert.ok(await sampleBtn.isVisible(), 'Sample button is visible after reset');
    console.log('  ✔ Convert Another resets UI to initial converter state');
    summary.checks.homepage = 'passed';

    // -------------------------------------------------------------
    // Check 2: PDF Studio (/pdf-tools/)
    // -------------------------------------------------------------
    console.log(`\n[Check 2] Inspecting PDF Studio at ${TARGET_URL}/pdf-tools/`);
    await page.goto(`${TARGET_URL}/pdf-tools/`, { waitUntil: 'domcontentloaded', timeout: 45000 });

    const pdfTitle = await page.title();
    assert.match(pdfTitle, /PDF/i, `Expected PDF in title, got: "${pdfTitle}"`);

    // Tool navigation tabs
    const tablist = page.locator('[role="tablist"]');
    assert.ok(await tablist.isVisible(), 'Tool navigation tablist is visible');
    const tabs = page.locator('.tab-btn[role="tab"]');
    const tabCount = await tabs.count();
    assert.ok(tabCount >= 3, `Expected at least 3 PDF tool tabs, found ${tabCount}`);

    // Click Redaction tab to verify operability
    const redactTab = page.locator('#tab-redact');
    if (await redactTab.isVisible()) {
      await redactTab.click();
      await page.waitForTimeout(300);
      const isRedactSelected = await redactTab.getAttribute('aria-selected');
      assert.equal(isRedactSelected, 'true', 'Redaction tab activates on click');
      console.log(`  ✔ PDF tool navigation visible and operable (${tabCount} tabs)`);
    }

    // On-device processing notice
    const privacyNotice = page.locator('.privacy-badge, .feature-pills');
    assert.ok(await privacyNotice.first().isVisible(), 'On-device privacy notice is visible');
    const noticeText = (await privacyNotice.first().textContent()).trim();
    assert.match(noticeText, /local|zero/i, `Privacy badge contains local notice: "${noticeText}"`);
    console.log(`  ✔ On-device notice present: "${noticeText.replace(/\s+/g, ' ')}"`);

    // No document-level horizontal overflow
    const pdfOverflow = await page.evaluate(() => {
      const docW = document.documentElement.scrollWidth;
      const winW = window.innerWidth;
      return { scrollWidth: docW, innerWidth: winW, overflows: docW > winW + 2 };
    });
    assert.equal(pdfOverflow.overflows, false, `PDF Studio horizontal overflow detected: scrollWidth=${pdfOverflow.scrollWidth}, innerWidth=${pdfOverflow.innerWidth}`);
    console.log(`  ✔ No horizontal overflow (scrollWidth=${pdfOverflow.scrollWidth} <= innerWidth=${pdfOverflow.innerWidth})`);

    const shot2 = path.join(ARTIFACTS_DIR, '02-pdf-tools.png');
    await page.screenshot({ path: shot2, fullPage: false });
    summary.screenshots.push('02-pdf-tools.png');
    summary.checks.pdfTools = 'passed';

    // -------------------------------------------------------------
    // Check 3: Table Extractor (/table-extractor/)
    // -------------------------------------------------------------
    console.log(`\n[Check 3] Inspecting Table Extractor at ${TARGET_URL}/table-extractor/`);
    await page.goto(`${TARGET_URL}/table-extractor/`, { waitUntil: 'domcontentloaded', timeout: 45000 });

    const tableTitle = await page.title();
    assert.match(tableTitle, /Table Extractor/i, `Expected Table Extractor in title, got: "${tableTitle}"`);

    // Existing install CTAs
    const chromeCta = page.locator('a[href*="chromewebstore.google.com"]').first();
    const edgeCta = page.locator('a[href*="microsoftedge.microsoft.com"]').first();

    assert.ok(await chromeCta.isVisible(), 'Chrome store CTA is visible');
    assert.ok(await edgeCta.isVisible(), 'Edge store CTA is visible');

    const chromeHref = await chromeCta.getAttribute('href');
    const edgeHref = await edgeCta.getAttribute('href');
    assert.match(chromeHref, /fjpbjpmccomonleefghgalfoioekhlhm/, `Chrome CTA points to official store extension ID: ${chromeHref}`);
    assert.match(edgeHref, /pekammppimoaikllkhhebocbkbidoboe/, `Edge CTA points to official store addon ID: ${edgeHref}`);
    console.log('  ✔ Install CTAs have valid production store destinations');

    // No document-level horizontal overflow
    const tableOverflow = await page.evaluate(() => {
      const docW = document.documentElement.scrollWidth;
      const winW = window.innerWidth;
      return { scrollWidth: docW, innerWidth: winW, overflows: docW > winW + 2 };
    });
    assert.equal(tableOverflow.overflows, false, `Table Extractor horizontal overflow detected: scrollWidth=${tableOverflow.scrollWidth}, innerWidth=${tableOverflow.innerWidth}`);
    console.log(`  ✔ No horizontal overflow (scrollWidth=${tableOverflow.scrollWidth} <= innerWidth=${tableOverflow.innerWidth})`);

    const shot3 = path.join(ARTIFACTS_DIR, '03-table-extractor.png');
    await page.screenshot({ path: shot3, fullPage: false });
    summary.screenshots.push('03-table-extractor.png');
    summary.checks.tableExtractor = 'passed';

    // Mark BrowserStack session passed
    try {
      await page.evaluate(_ => {}, `browserstack_executor: ${JSON.stringify({
        action: 'setSessionStatus',
        arguments: {
          status: 'passed',
          reason: 'All Android Chrome smoke checks passed (Homepage, PDF Studio, Table Extractor)'
        }
      })}`);
    } catch (_) {}

    summary.status = 'passed';
    console.log('\n✔ All BrowserStack Android smoke tests PASSED successfully.');
  } catch (error) {
    summary.status = 'failed';
    summary.error = error.message;
    console.error('\n✖ Smoke test failed:', error.message);

    if (page) {
      try {
        const failureShot = path.join(ARTIFACTS_DIR, '00-failure.png');
        await page.screenshot({ path: failureShot, fullPage: false });
        summary.screenshots.push('00-failure.png');

        await page.evaluate(_ => {}, `browserstack_executor: ${JSON.stringify({
          action: 'setSessionStatus',
          arguments: {
            status: 'failed',
            reason: error.message.slice(0, 250)
          }
        })}`);
      } catch (_) {}
    }
    throw error;
  } finally {
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
    if (browser) {
      await browser.close();
      console.log('BrowserStack remote session cleanly closed.');
    }
  }
}

run().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
