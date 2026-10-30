import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORTFOLIO_ROOT = path.resolve(__dirname, '..');
const EVIDENCE_DIR = path.join(PORTFOLIO_ROOT, 'reports/brand-logo-evidence');
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

const CSP_HEADER = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' blob: data:; connect-src 'self' blob: data:; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'none';";

const PAGES = [
  { slug: 'home', path: '/' },
  { slug: '404', path: '/404.html' },
  { slug: 'privacy', path: '/privacy' },
  { slug: 'pdf-tools', path: '/pdf-tools/' },
  { slug: 'word-to-latex', path: '/word-to-latex/' },
  { slug: 'table-extractor', path: '/table-extractor/' },
  { slug: 'bulkgrab', path: '/bulkgrab/' },
  { slug: 'seo-inspector', path: '/seo-inspector/' },
  { slug: 'bilexi', path: '/bilexi/' },
  { slug: 'tab-vault', path: '/tab-vault/' },
  { slug: 'word-to-latex-converter', path: '/word-to-latex-converter/' },
  { slug: 'changelog', path: '/changelog/' },
  { slug: 'guides-hub', path: '/guides/' },
  { slug: 'guide-docx-to-latex', path: '/guides/docx-to-latex-offline/' },
  { slug: 'guide-excel-tables', path: '/guides/export-virtualized-tables-to-excel/' },
  { slug: 'guide-tab-backups', path: '/guides/prevent-browser-tab-loss-local-backups/' },
  { slug: 'guide-french-accents', path: '/guides/type-french-accents-on-qwerty-offline/' },
  { slug: 'guide-word-tables', path: '/guides/word-tables-to-latex/' },
];

async function run() {
  const server = http.createServer((req, res) => {
    const safeUrl = new URL(req.url, 'http://localhost').pathname;
    let localPath = path.join(PORTFOLIO_ROOT, safeUrl === '/' ? 'index.html' : safeUrl);
    if (fs.existsSync(localPath) && fs.statSync(localPath).isDirectory()) {
      localPath = path.join(localPath, 'index.html');
    }
    if (!fs.existsSync(localPath) && fs.existsSync(localPath + '.html')) {
      localPath = localPath + '.html';
    }

    if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
      const mime = safeUrl.endsWith('.js') ? 'application/javascript'
        : safeUrl.endsWith('.wasm.gz') ? 'application/gzip'
        : safeUrl.endsWith('.png') ? 'image/png'
        : safeUrl.endsWith('.svg') ? 'image/svg+xml'
        : safeUrl.endsWith('.ico') ? 'image/x-icon'
        : safeUrl.endsWith('.css') ? 'text/css'
        : 'text/html';

      res.writeHead(200, {
        'Content-Type': mime,
        'Content-Security-Policy': CSP_HEADER,
      });
      return fs.createReadStream(localPath).pipe(res);
    }
    res.writeHead(404);
    res.end('Not found');
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Server listening on ${baseUrl}`);

  const browser = await chromium.launch({ headless: true });
  const manifestRows = [];

  const VIEWPORTS = [
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'mobile', width: 390, height: 844 }
  ];

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2
    });
    const page = await context.newPage();

    for (const p of PAGES) {
      await page.goto(baseUrl + p.path, { waitUntil: 'networkidle' });

      // Check horizontal overflow
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      if (overflow) {
        console.warn(`WARNING: Horizontal overflow detected on ${p.slug} at ${vp.name}!`);
      }

      // 1. Light mode header
      const headerElem = await page.$('header.navbar, header.app-header, .error-card, .privacy-header-lockup, .brand-link, .brand');
      if (headerElem) {
        const fname = `${p.slug}-${vp.name}-light-header.png`;
        await headerElem.screenshot({ path: path.join(EVIDENCE_DIR, fname) });
        manifestRows.push({ page: p.slug, viewport: vp.name, theme: 'Light', target: 'Header', file: fname });
      }

      // 2. Light mode footer
      const footerElem = await page.$('footer.footer, footer.app-footer, .footer-note, .privacy-footer');
      if (footerElem) {
        const fname = `${p.slug}-${vp.name}-light-footer.png`;
        await footerElem.screenshot({ path: path.join(EVIDENCE_DIR, fname) });
        manifestRows.push({ page: p.slug, viewport: vp.name, theme: 'Light', target: 'Footer', file: fname });
      }

      // Switch to Dark mode
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(50);

      // 3. Dark mode header
      if (headerElem) {
        const fname = `${p.slug}-${vp.name}-dark-header.png`;
        await headerElem.screenshot({ path: path.join(EVIDENCE_DIR, fname) });
        manifestRows.push({ page: p.slug, viewport: vp.name, theme: 'Dark', target: 'Header', file: fname });
      }

      // 4. Dark mode footer
      if (footerElem) {
        const fname = `${p.slug}-${vp.name}-dark-footer.png`;
        await footerElem.screenshot({ path: path.join(EVIDENCE_DIR, fname) });
        manifestRows.push({ page: p.slug, viewport: vp.name, theme: 'Dark', target: 'Footer', file: fname });
      }

      // Full page screenshot for representative key pages
      if (['home', 'privacy', '404', 'pdf-tools', 'word-to-latex'].includes(p.slug)) {
        const fullFname = `${p.slug}-${vp.name}-full.png`;
        await page.screenshot({ path: path.join(EVIDENCE_DIR, fullFname), fullPage: true });
        manifestRows.push({ page: p.slug, viewport: vp.name, theme: 'Dark (Full)', target: 'Full Page', file: fullFname });
      }

      console.log(`Captured evidence for: ${p.slug} (${vp.name})`);
    }
    await context.close();
  }

  await browser.close();
  server.close();

  // Write screenshot manifest
  let manifestMd = `# Brand Logo Implementation — Screenshot Evidence Manifest\n\n`;
  manifestMd += `**Directory:** \`reports/brand-logo-evidence/\`  \n`;
  manifestMd += `**Total Evidence Screenshots:** ${manifestRows.length}  \n`;
  manifestMd += `**Verification Date:** October 30, 2026  \n\n`;
  manifestMd += `| Page / Route | Viewport | Theme | Component Target | Output Filename |\n`;
  manifestMd += `| :--- | :--- | :--- | :--- | :--- |\n`;

  for (const row of manifestRows) {
    manifestMd += `| \`${row.page}\` | ${row.viewport} | ${row.theme} | ${row.target} | \`${row.file}\` |\n`;
  }

  fs.writeFileSync(path.join(EVIDENCE_DIR, 'SCREENSHOT-MANIFEST.md'), manifestMd, 'utf-8');
  console.log(`Evidence manifest generated with ${manifestRows.length} screenshots.`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
