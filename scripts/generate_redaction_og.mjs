/**
 * scripts/generate_redaction_og.mjs
 *
 * Generates the dedicated 1200x630 OpenGraph and Twitter card image for
 * the local PDF redaction guide (/guides/redact-pdf-without-uploading/).
 *
 * Requirements:
 * - Uses Playwright to render local typography and SVG brand mark.
 * - Produces exact 1200x630 PNG asset under assets/og/.
 *
 * Usage:
 *   node scripts/generate_redaction_og.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const OUTPUT_PATH = path.join(REPO_ROOT, 'assets/og/guide-redact-pdf-without-uploading-1200x630.png');

const manrope800Path = path.join(REPO_ROOT, 'assets/fonts/manrope-800.woff2');
const manrope500Path = path.join(REPO_ROOT, 'assets/fonts/manrope-500.woff2');

if (!fs.existsSync(manrope800Path) || !fs.existsSync(manrope500Path)) {
  throw new Error('Required font assets missing under assets/fonts/');
}

const manrope800Base64 = fs.readFileSync(manrope800Path).toString('base64');
const manrope500Base64 = fs.readFileSync(manrope500Path).toString('base64');

const cardHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    @font-face {
      font-family: 'Manrope';
      font-weight: 800;
      font-style: normal;
      src: url('data:font/woff2;base64,${manrope800Base64}') format('woff2');
    }
    @font-face {
      font-family: 'Manrope';
      font-weight: 500;
      font-style: normal;
      src: url('data:font/woff2;base64,${manrope500Base64}') format('woff2');
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      width: 1200px;
      height: 630px;
      overflow: hidden;
      background-color: #0f172a;
      font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;
      position: relative;
      color: #ffffff;
      -webkit-font-smoothing: antialiased;
    }

    /* Ambient atmospheric glow matching ExtensionGuy brand cards */
    .glow {
      position: absolute;
      top: -80px;
      right: 0px;
      width: 700px;
      height: 600px;
      background: radial-gradient(circle at 65% 40%, rgba(56, 189, 248, 0.16) 0%, rgba(79, 70, 229, 0.14) 40%, rgba(15, 23, 42, 0) 72%);
      pointer-events: none;
    }

    .container {
      width: 1200px;
      height: 630px;
      padding: 68px 80px 42px 80px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      z-index: 2;
    }

    .main-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 36px;
      margin-top: 10px;
    }

    .left-column {
      flex: 1;
      max-width: 680px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 6px 18px;
      border-radius: 9999px;
      border: 1px solid rgba(56, 189, 248, 0.4);
      background: rgba(56, 189, 248, 0.08);
      color: #38bdf8;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin-bottom: 24px;
    }

    h1 {
      font-size: 52px;
      font-weight: 800;
      line-height: 1.15;
      letter-spacing: -0.025em;
      color: #ffffff;
      margin-bottom: 20px;
    }

    p.subtitle {
      font-size: 24px;
      font-weight: 500;
      line-height: 1.45;
      color: #cbd5e1;
      max-width: 620px;
    }

    /* Right column: Synthetic redacted document card */
    .right-column {
      width: 320px;
      flex-shrink: 0;
    }

    .doc-card {
      width: 320px;
      background: #1e293b;
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 14px;
      padding: 22px 24px;
      box-shadow: 0 25px 45px -12px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.06);
      position: relative;
    }

    .doc-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.15);
    }

    .doc-pill {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.06em;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.12);
      padding: 4px 9px;
      border-radius: 4px;
    }

    .doc-meta {
      font-size: 12px;
      color: #94a3b8;
      font-weight: 500;
    }

    .doc-body {
      display: flex;
      flex-direction: column;
      gap: 13px;
    }

    .doc-line {
      height: 9px;
      border-radius: 4px;
      background: #334155;
    }

    .doc-line.w-full { width: 100%; }
    .doc-line.w-85 { width: 85%; }
    .doc-line.w-70 { width: 70%; }
    .doc-line.w-55 { width: 55%; }

    .line-with-redaction {
      display: flex;
      align-items: center;
      gap: 10px;
      height: 22px;
    }

    /* Redaction blackout box styling */
    .redaction-box {
      background: #020617;
      border: 1px solid #38bdf8;
      border-radius: 3px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      box-shadow: 0 0 10px rgba(56, 189, 248, 0.25);
    }

    .redaction-box::after {
      content: '';
      position: absolute;
      width: 5px;
      height: 5px;
      background: #38bdf8;
      border-radius: 1px;
      top: -2px;
      right: -2px;
    }

    .doc-footer-tag {
      margin-top: 18px;
      padding-top: 12px;
      border-top: 1px solid rgba(148, 163, 184, 0.12);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      color: #94a3b8;
      font-weight: 500;
    }

    .status-dot {
      display: inline-block;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      margin-right: 6px;
    }

    /* Divider */
    .divider {
      width: 1040px;
      height: 1px;
      background: #222b3e;
      margin-bottom: 22px;
    }

    /* Footer */
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 1040px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-mark {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      background: #4f46e5;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .brand-mark svg {
      width: 14px;
      height: 14px;
      fill: #ffffff;
    }

    .brand-text {
      font-size: 20px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.01em;
    }

    .footer-category {
      font-size: 16px;
      font-weight: 500;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="glow"></div>
  <div class="container">
    <div class="main-content">
      <div class="left-column">
        <div class="badge">Technical Guide</div>
        <h1>Redact PDFs<br>without uploading</h1>
        <p class="subtitle">A practical guide to local PDF redaction</p>
      </div>

      <div class="right-column">
        <div class="doc-card">
          <div class="doc-header">
            <span class="doc-pill">PDF PREVIEW</span>
            <span class="doc-meta">Page 1 of 2</span>
          </div>
          <div class="doc-body">
            <div class="doc-line w-full"></div>
            <div class="line-with-redaction">
              <div class="doc-line" style="width: 45px;"></div>
              <div class="redaction-box" style="width: 130px;"></div>
              <div class="doc-line" style="width: 55px;"></div>
            </div>
            <div class="doc-line w-70"></div>
            <div class="line-with-redaction">
              <div class="redaction-box" style="width: 155px;"></div>
              <div class="doc-line" style="width: 75px;"></div>
            </div>
            <div class="doc-line w-85"></div>
            <div class="doc-line w-55"></div>
          </div>
          <div class="doc-footer-tag">
            <span><span class="status-dot"></span>In-browser memory</span>
            <span>Local Engine</span>
          </div>
        </div>
      </div>
    </div>

    <div>
      <div class="divider"></div>
      <div class="footer">
        <div class="brand">
          <div class="brand-mark">
            <svg viewBox="0 0 32 32">
              <path d="M 8 8 H 24 V 13.5 C 25.5 13.5 27 14.5 27 16 C 27 17.5 25.5 18.5 24 18.5 V 24 H 8 V 18.5 C 9.5 18.5 11 17.5 11 16 C 11 14.5 9.5 13.5 8 13.5 Z"/>
            </svg>
          </div>
          <span class="brand-text">extensionguy.me</span>
        </div>
        <div class="footer-category">ExtensionGuy · Technical Guides</div>
      </div>
    </div>
  </div>
</body>
</html>`;

export async function generateOgCard() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1200, height: 630 },
      deviceScaleFactor: 1
    });

    await page.setContent(cardHtml, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);

    await page.screenshot({
      path: OUTPUT_PATH,
      clip: { x: 0, y: 0, width: 1200, height: 630 }
    });

    const fileBuf = fs.readFileSync(OUTPUT_PATH);
    const hash = crypto.createHash('sha256').update(fileBuf).digest('hex');
    console.log(`Successfully generated: ${path.relative(REPO_ROOT, OUTPUT_PATH)}`);
    console.log(`Dimensions: 1200x630, Size: ${fileBuf.length} bytes, SHA-256: ${hash}`);
    return hash;
  } finally {
    await browser.close();
  }
}

// Execute directly if run as a CLI script
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateOgCard().catch(err => {
    console.error('Failed to generate Open Graph card:', err);
    process.exit(1);
  });
}
