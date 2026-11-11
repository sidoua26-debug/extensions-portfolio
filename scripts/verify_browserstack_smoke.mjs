/**
 * BrowserStack Automated Smoke Test for ExtensionGuy
 * Target: Deployed production website (https://extensionguy.me/)
 * Platform: Real Android device (Chrome) via BrowserStack Playwright _android endpoint
 * Reference:
 *   - https://www.browserstack.com/docs/automate/playwright/playwright-android/nodejs
 *   - https://github.com/browserstack/node-js-playwright-browserstack/blob/playwright-legacy/fixture.js
 */

import { _android } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const TARGET_URL = (process.env.TARGET_URL || 'https://extensionguy.me').replace(/\/+$/, '');
const ARTIFACTS_DIR = path.resolve(process.env.ARTIFACTS_DIR || 'artifacts/browserstack-smoke');

const BROWSERSTACK_USERNAME = process.env.BROWSERSTACK_USERNAME;
const BROWSERSTACK_ACCESS_KEY = process.env.BROWSERSTACK_ACCESS_KEY;
const DEVICE_NAME = process.env.BROWSERSTACK_DEVICE || 'Google Pixel 8';
const OS_VERSION = process.env.BROWSERSTACK_OS_VERSION || '14.0';
const BUILD_NAME = process.env.BROWSERSTACK_BUILD_NAME || `extensionguy-smoke-${new Date().toISOString().slice(0, 10)}`;

const CONNECT_TIMEOUT_MS = 60_000;  // Explicit 60s connection timeout
const ACTION_TIMEOUT_MS = 35_000;   // Bounded navigation / action timeout
const OVERALL_TIMEOUT_MS = 600_000; // 10 minutes total execution deadline

fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

function sanitize(text) {
  if (typeof text !== 'string') text = String(text ?? '');
  if (BROWSERSTACK_ACCESS_KEY) {
    text = text.replaceAll(BROWSERSTACK_ACCESS_KEY, '***');
  }
  if (BROWSERSTACK_USERNAME) {
    text = text.replaceAll(BROWSERSTACK_USERNAME, '***');
  }
  return text.replace(/wss:\/\/[^\s"']+/g, 'wss://cdp.browserstack.com/playwright?caps=[REDACTED]');
}

async function run() {
  // Resolve actual imported Playwright packages without fallback invention
  const playwrightPkgPath = require.resolve('playwright/package.json');
  const playwrightPkg = JSON.parse(fs.readFileSync(playwrightPkgPath, 'utf8'));
  const playwrightVersion = playwrightPkg.version;
  const playwrightLocation = path.dirname(playwrightPkgPath);

  const playwrightCorePkgPath = require.resolve('playwright-core/package.json', { paths: [playwrightLocation] });
  const playwrightCorePkg = JSON.parse(fs.readFileSync(playwrightCorePkgPath, 'utf8'));
  const playwrightCoreVersion = playwrightCorePkg.version;
  const playwrightCoreLocation = path.dirname(playwrightCorePkgPath);

  const summary = {
    targetUrl: TARGET_URL,
    timestamp: new Date().toISOString(),
    status: 'pending',
    stage: 'initialization',
    runtime: {
      nodeVersion: process.version,
      playwrightVersion,
      playwrightLocation,
      playwrightCoreVersion,
      playwrightCoreLocation,
      configuredDevice: DEVICE_NAME,
      configuredOsVersion: OS_VERSION,
      clientPlaywrightVersion: playwrightVersion,
      hasExplicitRemoteVersion: false,
    },
    sessionId: null,
    dashboardUrl: null,
    deviceInfo: null,
    viewport: null,
    checks: {
      homepage: 'not_executed',
      pdfTools: 'not_executed',
      tableExtractor: 'not_executed',
    },
    screenshots: [],
    error: null,
  };

  // Step 1: Check credentials
  if (!BROWSERSTACK_USERNAME || !BROWSERSTACK_ACCESS_KEY) {
    console.log('[SKIP] BROWSERSTACK_USERNAME or BROWSERSTACK_ACCESS_KEY is not defined.');
    console.log('Skipping remote BrowserStack execution. Configure repository secrets to enable.');
    summary.status = 'skipped';
    summary.stage = 'missing_credentials';
    summary.reason = 'Missing BrowserStack credentials';
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
    return;
  }

  // Capabilities: align with BrowserStack Android documentation and legacy fixture
  // Rely on client-based version selection using exact installed client version
  const capabilities = {
    browserName: 'chrome',
    deviceName: DEVICE_NAME,
    osVersion: OS_VERSION,
    realMobile: 'true',
    name: `ExtensionGuy Smoke Test (${DEVICE_NAME})`,
    build: BUILD_NAME,
    'browserstack.username': BROWSERSTACK_USERNAME,
    'browserstack.accessKey': BROWSERSTACK_ACCESS_KEY,
    'client.playwrightVersion': playwrightVersion,
  };

  const hasExplicitRemote = Boolean(capabilities['browserstack.playwrightVersion']);
  summary.runtime.hasExplicitRemoteVersion = hasExplicitRemote;

  // Concise, credential-free diagnostics immediately before connection
  console.log('--- Runtime & Playwright Diagnostics ---');
  console.log(`Node version: ${process.version}`);
  console.log(`Playwright: ${playwrightVersion} (${playwrightLocation})`);
  console.log(`Playwright-core: ${playwrightCoreVersion} (${playwrightCoreLocation})`);
  console.log(`Target Android device: ${DEVICE_NAME} (Android ${OS_VERSION})`);
  console.log(`client.playwrightVersion: ${capabilities['client.playwrightVersion']}`);
  console.log(`browserstack.playwrightVersion explicitly supplied: ${hasExplicitRemote}`);
  console.log('----------------------------------------');

  const wsEndpoint = `wss://cdp.browserstack.com/playwright?caps=${encodeURIComponent(JSON.stringify(capabilities))}`;

  let device = null;
  let context = null;
  let page = null;
  let overallTimer = null;

  try {
    // Overall deadline watchdog
    const timeoutPromise = new Promise((_, reject) => {
      overallTimer = setTimeout(() => {
        reject(new Error(`Overall smoke test deadline (${OVERALL_TIMEOUT_MS / 1000}s) exceeded`));
      }, OVERALL_TIMEOUT_MS);
    });

    const executionPromise = (async () => {
      // Step 2: Establish connection to Android device
      summary.stage = 'connection';
      console.log(`[Phase 1] Connecting to BrowserStack Android device: ${DEVICE_NAME} (Android ${OS_VERSION})...`);

      try {
        device = await _android.connect(wsEndpoint, { timeout: CONNECT_TIMEOUT_MS });
      } catch (connErr) {
        const msg = sanitize(connErr.message);
        if (/version not supported/i.test(msg) || /unsupported|invalid capability|not found/i.test(msg)) {
          summary.status = 'unsupported_configuration';
        } else {
          summary.status = 'connection_failed';
        }
        summary.stage = 'connection';
        throw new Error(`Device connection failed: ${msg}`);
      }

      console.log('  ✔ Connected to Android device bridge.');

      // Step 3: Launch Chrome browser on Android device
      summary.stage = 'browser_launch';
      try {
        await device.shell('am force-stop com.android.chrome');
      } catch (shellErr) {
        console.warn('  Notice: Could not force-stop Chrome (non-fatal):', shellErr.message);
      }

      context = await device.launchBrowser();
      page = await context.newPage();
      page.setDefaultTimeout(ACTION_TIMEOUT_MS);
      page.setDefaultNavigationTimeout(ACTION_TIMEOUT_MS);

      // Record device & session metadata
      try {
        const rawDetails = await page.evaluate(_ => {}, `browserstack_executor: ${JSON.stringify({ action: 'getSessionDetails' })}`);
        const details = typeof rawDetails === 'string' ? JSON.parse(rawDetails) : (rawDetails || {});
        summary.sessionId = details.hashed_id || details.session_id || null;
        summary.dashboardUrl = details.public_url || details.browser_url || null;
        if (summary.sessionId) console.log(`  BrowserStack Session ID: ${summary.sessionId}`);
        if (summary.dashboardUrl) console.log(`  BrowserStack Dashboard: ${summary.dashboardUrl}`);
      } catch (err) {
        console.warn('  Could not read session details via executor:', err.message);
      }

      try {
        summary.deviceInfo = {
          model: typeof device.model === 'function' ? await device.model() : DEVICE_NAME,
          serial: typeof device.serial === 'function' ? await device.serial() : null,
          configuredDevice: DEVICE_NAME,
          configuredOsVersion: OS_VERSION,
        };
      } catch (_) {}

      // Measure viewport
      await page.goto(`${TARGET_URL}/`, { waitUntil: 'domcontentloaded', timeout: ACTION_TIMEOUT_MS });
      summary.viewport = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
        userAgent: navigator.userAgent
      }));
      console.log(`  ✔ Real device session active: ${summary.deviceInfo?.model || DEVICE_NAME}, Viewport: ${summary.viewport.innerWidth}x${summary.viewport.innerHeight}`);

      // -------------------------------------------------------------
      // Step 4: Website Smoke Checks
      // -------------------------------------------------------------
      summary.stage = 'website_assertions';

      // Check 1: Homepage
      console.log(`\n[Check 1] Inspecting Homepage at ${TARGET_URL}/`);
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

        await mobileMenuBtn.click();
        await page.waitForTimeout(300);
      } else {
        console.log('  Note: Desktop viewport active; mobile toggle hidden');
      }

      // Sample DOCX conversion
      console.log('  Testing sample DOCX conversion...');
      const sampleBtn = page.locator('#converterSampleBtn');
      await sampleBtn.scrollIntoViewIfNeeded();
      await sampleBtn.click();

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
      await page.goto(`${TARGET_URL}/pdf-tools/`, { waitUntil: 'domcontentloaded', timeout: ACTION_TIMEOUT_MS });

      const pdfTitle = await page.title();
      assert.match(pdfTitle, /PDF/i, `Expected PDF in title, got: "${pdfTitle}"`);

      const tablist = page.locator('[role="tablist"]').first();
      assert.ok(await tablist.isVisible(), 'Tool navigation tablist is visible');
      const tabs = page.locator('.tab-btn[role="tab"]');
      const tabCount = await tabs.count();
      assert.ok(tabCount >= 3, `Expected at least 3 PDF tool tabs, found ${tabCount}`);

      const redactTab = page.locator('#tab-redact');
      if (await redactTab.isVisible()) {
        await redactTab.click();
        await page.waitForTimeout(300);
        const isRedactSelected = await redactTab.getAttribute('aria-selected');
        assert.equal(isRedactSelected, 'true', 'Redaction tab activates on click');
        console.log(`  ✔ PDF tool navigation visible and operable (${tabCount} tabs)`);
      }

      const privacyNotice = page.locator('.privacy-badge, .feature-pills');
      assert.ok(await privacyNotice.first().isVisible(), 'On-device privacy notice is visible');
      const noticeText = (await privacyNotice.first().textContent()).trim();
      assert.match(noticeText, /local|zero/i, `Privacy badge contains local notice: "${noticeText}"`);
      console.log(`  ✔ On-device notice present: "${noticeText.replace(/\s+/g, ' ')}"`);

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
      await page.goto(`${TARGET_URL}/table-extractor/`, { waitUntil: 'domcontentloaded', timeout: ACTION_TIMEOUT_MS });

      const tableTitle = await page.title();
      assert.match(tableTitle, /Table Extractor/i, `Expected Table Extractor in title, got: "${tableTitle}"`);

      // Store CTAs inside body CTA group
      const chromeCta = page.locator('[data-browser-cta-group] [data-cta-store="chrome"]').first();
      const edgeCta = page.locator('[data-browser-cta-group] [data-cta-store="edge"]').first();

      assert.ok(await chromeCta.isVisible(), 'Chrome store CTA is visible');
      assert.ok(await edgeCta.isVisible(), 'Edge store CTA is visible');

      const chromeHref = await chromeCta.getAttribute('href');
      const edgeHref = await edgeCta.getAttribute('href');
      assert.match(chromeHref, /fjpbjpmccomonleefghgalfoioekhlhm/, `Chrome CTA points to official store extension ID: ${chromeHref}`);
      assert.match(edgeHref, /pekammppimoaikllkhhebocbkbidoboe/, `Edge CTA points to official store addon ID: ${edgeHref}`);
      console.log('  ✔ Install CTAs have valid production store destinations');

      // Verify browser-aware navigation CTA dynamic update on Chrome
      const navCta = page.locator('[data-nav-cta="table-extractor"]');
      if (await navCta.count() > 0) {
        const navHref = await navCta.getAttribute('href');
        assert.match(navHref, /fjpbjpmccomonleefghgalfoioekhlhm/, `Nav CTA dynamically updated for Chrome: ${navHref}`);
        console.log('  ✔ Browser-aware nav CTA dynamically resolved to Chrome store');
      }

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
      summary.stage = 'complete';
      console.log('\n✔ All BrowserStack Android smoke tests PASSED successfully.');
    })();

    await Promise.race([executionPromise, timeoutPromise]);
  } catch (error) {
    if (summary.status === 'pending') {
      summary.status = summary.stage === 'website_assertions' ? 'assertion_failed' : 'failed';
    }
    summary.error = sanitize(error.message);
    console.error('\n✖ Smoke test failed in stage "' + summary.stage + '":', summary.error);

    if (page) {
      try {
        const failureShot = path.join(ARTIFACTS_DIR, '00-failure.png');
        await page.screenshot({ path: failureShot, fullPage: false });
        summary.screenshots.push('00-failure.png');

        await page.evaluate(_ => {}, `browserstack_executor: ${JSON.stringify({
          action: 'setSessionStatus',
          arguments: {
            status: 'failed',
            reason: summary.error.slice(0, 250)
          }
        })}`);
      } catch (_) {}
    }
    throw error;
  } finally {
    if (overallTimer) clearTimeout(overallTimer);

    // Bounded cleanup operations (max 5s each)
    if (page) {
      await Promise.race([page.close(), new Promise(r => setTimeout(r, 5000))]).catch(() => {});
    }
    if (context) {
      await Promise.race([context.close(), new Promise(r => setTimeout(r, 5000))]).catch(() => {});
    }
    if (device) {
      await Promise.race([device.close(), new Promise(r => setTimeout(r, 5000))]).catch(() => {});
      console.log('BrowserStack remote Android device connection cleanly closed.');
    }

    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
  }
}

run().catch((err) => {
  console.error('Fatal execution error:', sanitize(err.message));
  process.exit(1);
});
