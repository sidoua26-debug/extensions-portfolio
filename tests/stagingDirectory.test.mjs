import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const STAGE_SCRIPT = path.join(ROOT, 'scripts/stage_pages.py');
const FIXTURE_DOCX = path.join(__dirname, 'fixtures/headings_bold_italic.docx');
const FIXTURE_PDF = path.join(__dirname, 'fixtures/sample.pdf');

function sha256File(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.woff2': 'font/woff2',
  '.wasm.gz': 'application/gzip',
  '.xml': 'application/xml; charset=utf-8',
};

function startStaticServer(rootDir) {
  const server = http.createServer((req, res) => {
    const safeUrl = new URL(req.url, 'http://localhost').pathname;
    let localPath = path.join(rootDir, safeUrl === '/' ? 'index.html' : safeUrl);
    if (fs.existsSync(localPath) && fs.statSync(localPath).isDirectory()) {
      localPath = path.join(localPath, 'index.html');
    }

    if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
      let ext = path.extname(localPath).toLowerCase();
      if (localPath.endsWith('.wasm.gz')) ext = '.wasm.gz';
      const mime = mimeTypes[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': mime,
        'Access-Control-Allow-Origin': '*',
        'X-Content-Type-Options': 'nosniff',
      });
      fs.createReadStream(localPath).pipe(res);
    } else {
      const notFoundPath = path.join(rootDir, '404.html');
      if (fs.existsSync(notFoundPath)) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        fs.createReadStream(notFoundPath).pipe(res);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end(`404 Not Found: ${safeUrl}`);
      }
    }
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

describe('Cloudflare Pages Public Directory Staging (dist/)', () => {
  let staticServer;
  let serverUrl;
  let browser;

  before(async () => {
    // Ensure staging runs
    execFileSync('python3', [STAGE_SCRIPT], { cwd: ROOT, stdio: 'pipe' });

    // Start local server hosting dist/
    const srv = await startStaticServer(DIST);
    staticServer = srv.server;
    serverUrl = srv.url;

    // Launch Playwright browser
    const { chromium } = await import('playwright');
    browser = await chromium.launch({ headless: true });
  });

  after(async () => {
    if (browser) await browser.close();
    if (staticServer) await new Promise((resolve) => staticServer.close(resolve));
  });

  it('1. staging script exists and runs cleanly to produce dist/', () => {
    assert.ok(fs.existsSync(STAGE_SCRIPT), 'scripts/stage_pages.py must exist');
    assert.ok(fs.existsSync(DIST), 'dist/ directory must exist after staging');
    assert.ok(fs.statSync(DIST).isDirectory(), 'dist/ must be a directory');
  });

  it('2. all 27 sitemap.xml URLs map to actual staged HTML files in dist/', () => {
    const sitemapPath = path.join(ROOT, 'sitemap.xml');
    assert.ok(fs.existsSync(sitemapPath), 'sitemap.xml must exist in root');
    const sitemapXml = fs.readFileSync(sitemapPath, 'utf-8');

    const locRegex = /<loc>(https:\/\/extensionguy\.me[^<]*)<\/loc>/g;
    const urls = [];
    let match;
    while ((match = locRegex.exec(sitemapXml)) !== null) {
      urls.push(match[1]);
    }

    assert.equal(urls.length, 27, `Expected exactly 27 URLs in sitemap.xml, found ${urls.length}`);

    for (const url of urls) {
      const pathname = new URL(url).pathname;
      let stagedFile;
      if (pathname === '/') {
        stagedFile = path.join(DIST, 'index.html');
      } else if (pathname.endsWith('/')) {
        stagedFile = path.join(DIST, pathname, 'index.html');
      } else {
        // e.g. /privacy -> privacy.html
        stagedFile = path.join(DIST, `${pathname}.html`);
        if (!fs.existsSync(stagedFile)) {
          stagedFile = path.join(DIST, pathname);
        }
      }

      assert.ok(
        fs.existsSync(stagedFile),
        `Sitemap URL ${url} (${pathname}) must resolve to staged file at ${stagedFile}`
      );
      const stat = fs.statSync(stagedFile);
      assert.ok(stat.isFile(), `${stagedFile} must be a regular file`);
      assert.ok(stat.size > 0, `${stagedFile} must not be empty (size: ${stat.size})`);
    }
  });

  it('3. critical public files and assets match source byte-for-byte in dist/', () => {
    const criticalFiles = [
      'index.html',
      '404.html',
      'privacy.html',
      'favicon.ico',
      'robots.txt',
      'sitemap.xml',
      '_headers',
      'assets/wasm/pandoc.wasm.gz',
      'assets/wasm/LICENSE.txt',
      'assets/wasm/pandoc-3.10-corresponding-source.tar.gz',
      'assets/samples/sample-manuscript.docx',
      'assets/js/site.js',
      'assets/js/converterUi.js',
      'assets/js/converterClient.js',
      'assets/js/converter.worker.js',
      'assets/css/styles.css',
      'pdf-tools/app.js',
      'pdf-tools/worker.js',
      'pdf-tools/preview.js',
    ];

    for (const relPath of criticalFiles) {
      const srcFile = path.join(ROOT, relPath);
      const distFile = path.join(DIST, relPath);

      assert.ok(fs.existsSync(srcFile), `Source file ${relPath} must exist in root`);
      assert.ok(fs.existsSync(distFile), `Staged file ${relPath} must exist in dist/`);

      const srcHash = sha256File(srcFile);
      const distHash = sha256File(distFile);
      assert.equal(
        distHash,
        srcHash,
        `Checksum mismatch for ${relPath}: staged ${distHash} vs source ${srcHash}`
      );
    }
  });

  it('4. private, source, test, and development files are strictly absent from dist/', () => {
    const forbiddenPaths = [
      '.agents',
      '.git',
      '.github',
      '.specify',
      '.wrangler',
      '__pycache__',
      'node_modules',
      'reports',
      'review-shots',
      'scripts',
      'seo-audit',
      'specs',
      'src',
      'test-results',
      'tests',
      'package.json',
      'package-lock.json',
      'store-versions.json',
      'build_redesign.py',
      'README.md',
      'CHANGELOG.md',
      'CONTRIBUTING.md',
      'PRE_DEPLOYMENT_AUDIT.md',
      'ANTIGRAVITY_EXECUTION_REPORT.md',
    ];

    for (const relPath of forbiddenPaths) {
      const forbidden = path.join(DIST, relPath);
      assert.ok(
        !fs.existsSync(forbidden),
        `Forbidden file or directory ${relPath} must NOT exist in dist/`
      );
    }

    // Ensure no root audit screenshots exist in dist root
    const distRootEntries = fs.readdirSync(DIST);
    for (const entry of distRootEntries) {
      if (entry.startsWith('audit-') && entry.endsWith('.png')) {
        assert.fail(`Root audit screenshot leaked into dist/: ${entry}`);
      }
      if (entry.startsWith('final-') && entry.endsWith('.png')) {
        assert.fail(`Root audit screenshot leaked into dist/: ${entry}`);
      }
      if (entry.startsWith('test-') && entry.endsWith('.png')) {
        assert.fail(`Root test screenshot leaked into dist/: ${entry}`);
      }
    }
  });

  it('5. staging is idempotent and output directory is clean', () => {
    // Re-run staging a second time
    execFileSync('python3', [STAGE_SCRIPT], { cwd: ROOT, stdio: 'pipe' });

    assert.ok(fs.existsSync(DIST), 'dist/ directory must exist after second staging');
    assert.ok(!fs.existsSync(path.join(ROOT, '.pages-dist-backup')), 'Backup directory must be cleaned up');
  });

  it('6. smoke check: Word-to-LaTeX converter executes in staged dist/ with Pandoc WASM', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${serverUrl}/word-to-latex-converter/`);

    const fileInput = await page.$('#docxFileInput');
    assert.ok(fileInput, 'File input #docxFileInput must exist on converter page');
    await fileInput.setInputFiles(FIXTURE_DOCX);

    await page.waitForSelector('#converterOutputContainer:not([hidden])', { timeout: 20000 });
    const outputText = await page.$eval('#converterOutputArea', (el) => el.value);

    assert.ok(outputText.includes('Heading Level 1'), 'Output must contain heading');
    assert.ok(outputText.includes('\\textbf{Bold Text}'), 'Output must contain bold formatting');
    assert.ok(outputText.includes('\\emph{Italic Text}'), 'Output must contain italic formatting');

    await context.close();
  });

  it('7. smoke check: Offline PDF Studio loads and renders preview in staged dist/', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${serverUrl}/pdf-tools/`);

    await page.click('#subtab-split');
    const splitFileInput = page.locator('#split-file');
    await splitFileInput.setInputFiles(FIXTURE_PDF);

    await page.waitForFunction(() => {
      const ind = document.getElementById('split-page-indicator')?.textContent ?? '';
      return ind.includes('Page 1 of 3');
    }, { timeout: 15000 });

    const indicatorText = await page.locator('#split-page-indicator').textContent();
    assert.ok(indicatorText.includes('Page 1 of 3'), `Page indicator rendered: ${indicatorText}`);

    await context.close();
  });

  it('8. smoke check: 404 page is returned for nonexistent route in staged dist/', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const response = await page.goto(`${serverUrl}/nonexistent-test-route-404`);
    assert.equal(response.status(), 404, 'Response status must be 404');
    const pageTitle = await page.title();
    assert.ok(
      pageTitle.toLowerCase().includes('not found') || pageTitle.includes('404'),
      `Page title must indicate 404/Not Found, got: ${pageTitle}`
    );

    await context.close();
  });
});
