import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const reviewShotsDir = path.join(rootDir, 'review-shots');

if (!fs.existsSync(reviewShotsDir)) {
  fs.mkdirSync(reviewShotsDir, { recursive: true });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.pdf': 'application/pdf',
  '.csv': 'text/csv; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon'
};

function createStaticServer() {
  return http.createServer((req, res) => {
    let reqPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (reqPath.endsWith('/')) {
      reqPath += 'index.html';
    }
    const filePath = path.join(rootDir, reqPath);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self'; connect-src 'self';"
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

async function verifyNoMobileOverflow(page, pageName) {
  const isOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });

  const overflowingElements = await page.evaluate(() => {
    const docWidth = document.documentElement.clientWidth;
    const items = [];
    document.querySelectorAll('*').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.right > docWidth + 1) {
        items.push({
          tag: el.tagName,
          id: el.id,
          className: typeof el.className === 'string' ? el.className : '',
          text: el.innerText ? el.innerText.substring(0, 30) : '',
          right: rect.right,
          docWidth
        });
      }
    });
    return items;
  });

  if (isOverflow || overflowingElements.length > 0) {
    throw new Error(`Mobile overflow detected on ${pageName}! Document scrollWidth > clientWidth: ${isOverflow}. Elements: ${JSON.stringify(overflowingElements, null, 2)}`);
  }
}

async function main() {
  const server = createStaticServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Test server running at ${baseUrl}`);

  const browser = await chromium.launch({ headless: true });

  try {
    // -------------------------------------------------------------
    // 1. Demos Hub (/demos/)
    // -------------------------------------------------------------
    console.log('\n--- 1. Testing Interactive Demos Hub (/demos/) ---');
    const hubDesktop = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const hubErrors = [];
    hubDesktop.on('console', msg => { if (msg.type() === 'error') hubErrors.push(msg.text()); });
    hubDesktop.on('pageerror', err => hubErrors.push(err.message));

    await hubDesktop.goto(`${baseUrl}/demos/`, { waitUntil: 'networkidle' });
    const hubTitle = await hubDesktop.title();
    console.log(`Demos Hub Title: "${hubTitle}"`);

    const demoCardsCount = await hubDesktop.locator('.demo-card').count();
    console.log(`Demos Hub Demo Cards count: ${demoCardsCount}`);
    if (demoCardsCount !== 4) {
      throw new Error(`Expected exactly 4 demo cards on Demos Hub, found ${demoCardsCount}`);
    }

    await hubDesktop.screenshot({ path: path.join(reviewShotsDir, 'demos-hub-desktop.png'), fullPage: true });
    console.log('Saved review-shots/demos-hub-desktop.png');
    if (hubErrors.length > 0) throw new Error(`Console errors on Demos Hub desktop: ${JSON.stringify(hubErrors)}`);
    await hubDesktop.close();

    // Demos Hub Mobile
    const hubMobile = await browser.newPage({
      viewport: { width: 375, height: 667 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
    });
    await hubMobile.goto(`${baseUrl}/demos/`, { waitUntil: 'networkidle' });
    await verifyNoMobileOverflow(hubMobile, '/demos/');
    await hubMobile.screenshot({ path: path.join(reviewShotsDir, 'demos-hub-mobile.png'), fullPage: true });
    console.log('Saved review-shots/demos-hub-mobile.png (0 mobile overflow verified)');
    await hubMobile.close();

    // -------------------------------------------------------------
    // 2. Bulk Download Playground (/demos/bulk-download/)
    // -------------------------------------------------------------
    console.log('\n--- 2. Testing Bulk Download Playground (/demos/bulk-download/) ---');
    const demoDesktop = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const demoErrors = [];
    demoDesktop.on('console', msg => { if (msg.type() === 'error') demoErrors.push(msg.text()); });
    demoDesktop.on('pageerror', err => demoErrors.push(err.message));

    await demoDesktop.goto(`${baseUrl}/demos/bulk-download/`, { waitUntil: 'networkidle' });
    const demoPageTitle = await demoDesktop.title();
    console.log(`Playground Title: "${demoPageTitle}"`);

    // Verify static samples
    const staticFiles = await demoDesktop.locator('.sample-file-card:not(.dynamic-inserted), .image-sample-card').count();
    console.log(`Static sample file cards count: ${staticFiles}`);
    if (staticFiles !== 12) {
      throw new Error(`Expected exactly 12 sample files, found ${staticFiles}`);
    }

    // Verify dynamic injection interaction
    const dynamicContainerBefore = await demoDesktop.locator('#dynamicLinksContainer .sample-file-card').count();
    console.log(`Dynamic cards before click: ${dynamicContainerBefore}`);
    if (dynamicContainerBefore !== 0) {
      throw new Error(`Expected 0 dynamic cards initially, found ${dynamicContainerBefore}`);
    }

    // Click reveal button
    await demoDesktop.click('#revealDynamicBtn');
    await demoDesktop.waitForTimeout(100);

    const dynamicContainerAfter = await demoDesktop.locator('#dynamicLinksContainer .sample-file-card').count();
    console.log(`Dynamic cards after reveal: ${dynamicContainerAfter}`);
    if (dynamicContainerAfter !== 4) {
      throw new Error(`Expected 4 dynamically injected cards, found ${dynamicContainerAfter}`);
    }

    const resetDisabled = await demoDesktop.locator('#resetDynamicBtn').getAttribute('disabled');
    if (resetDisabled !== null) {
      throw new Error('Reset button should be enabled after dynamic links are revealed');
    }

    // Click reset button
    await demoDesktop.click('#resetDynamicBtn');
    await demoDesktop.waitForTimeout(100);

    const dynamicContainerReset = await demoDesktop.locator('#dynamicLinksContainer .sample-file-card').count();
    console.log(`Dynamic cards after reset: ${dynamicContainerReset}`);
    if (dynamicContainerReset !== 0) {
      throw new Error(`Expected 0 dynamic cards after reset, found ${dynamicContainerReset}`);
    }

    await demoDesktop.screenshot({ path: path.join(reviewShotsDir, 'bulk-download-demo-desktop.png'), fullPage: true });
    console.log('Saved review-shots/bulk-download-demo-desktop.png');
    if (demoErrors.length > 0) throw new Error(`Console errors on Bulk Download Demo desktop: ${JSON.stringify(demoErrors)}`);
    await demoDesktop.close();

    // Bulk Download Mobile
    const demoMobile = await browser.newPage({
      viewport: { width: 375, height: 667 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
    });
    await demoMobile.goto(`${baseUrl}/demos/bulk-download/`, { waitUntil: 'networkidle' });
    await verifyNoMobileOverflow(demoMobile, '/demos/bulk-download/');
    await demoMobile.screenshot({ path: path.join(reviewShotsDir, 'bulk-download-demo-mobile.png'), fullPage: true });
    console.log('Saved review-shots/bulk-download-demo-mobile.png (0 mobile overflow verified)');
    await demoMobile.close();

    // -------------------------------------------------------------
    // 3. Technical Companion Guide (/guides/download-multiple-pdfs/)
    // -------------------------------------------------------------
    console.log('\n--- 3. Testing Technical Companion Guide (/guides/download-multiple-pdfs/) ---');
    const guideDesktop = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const guideErrors = [];
    guideDesktop.on('console', msg => { if (msg.type() === 'error') guideErrors.push(msg.text()); });
    guideDesktop.on('pageerror', err => guideErrors.push(err.message));

    await guideDesktop.goto(`${baseUrl}/guides/download-multiple-pdfs/`, { waitUntil: 'networkidle' });
    const guideTitle = await guideDesktop.title();
    console.log(`Guide Title: "${guideTitle}"`);

    await guideDesktop.screenshot({ path: path.join(reviewShotsDir, 'pdf-guide-desktop.png'), fullPage: true });
    console.log('Saved review-shots/pdf-guide-desktop.png');
    if (guideErrors.length > 0) throw new Error(`Console errors on Guide desktop: ${JSON.stringify(guideErrors)}`);
    await guideDesktop.close();

    // Companion Guide Mobile
    const guideMobile = await browser.newPage({
      viewport: { width: 375, height: 667 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
    });
    await guideMobile.goto(`${baseUrl}/guides/download-multiple-pdfs/`, { waitUntil: 'networkidle' });
    await verifyNoMobileOverflow(guideMobile, '/guides/download-multiple-pdfs/');
    await guideMobile.screenshot({ path: path.join(reviewShotsDir, 'pdf-guide-mobile.png'), fullPage: true });
    console.log('Saved review-shots/pdf-guide-mobile.png (0 mobile overflow verified)');
    await guideMobile.close();

    console.log('\n>>> ALL BROWSER & OVERFLOW VERIFICATIONS PASSED WITH ZERO CONSOLE ERRORS! <<<');
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch(err => {
  console.error('Browser verification failed:', err);
  process.exit(1);
});
