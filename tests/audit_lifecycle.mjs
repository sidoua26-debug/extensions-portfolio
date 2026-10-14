import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORTFOLIO_ROOT = path.resolve(__dirname, '..');
const FIXTURE_DOCX = path.join(__dirname, 'fixtures/headings_bold_italic.docx');

const { chromium } = await import('playwright');

function getMimeType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html';
  if (filePath.endsWith('.js')) return 'application/javascript';
  if (filePath.endsWith('.wasm.gz')) return 'application/gzip';
  if (filePath.endsWith('.wasm')) return 'application/wasm';
  if (filePath.endsWith('.css')) return 'text/css';
  if (filePath.endsWith('.png')) return 'image/png';
  if (filePath.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return 'application/octet-stream';
}

async function runAudit() {
  console.log('=== Step 4: First-Load Performance, Caching & Worker Lifecycle Audit ===\n');

  let wasmRequests = 0;
  let customHeader = 'public, max-age=3600';
  let simulateCorruptWasm = false;
  let simulateWasm404 = false;

  // 1. Static HTTP Server with request logging
  const server = http.createServer((req, res) => {
    const safeUrl = new URL(req.url, 'http://localhost').pathname;

    if (safeUrl.includes('pandoc.wasm.gz')) {
      wasmRequests++;
      if (simulateWasm404) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
        return;
      }
      if (simulateCorruptWasm) {
        res.writeHead(200, {
          'Content-Type': 'application/gzip',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(Buffer.from('not a valid gzip or wasm stream'));
        return;
      }
    }

    let localPath = path.join(PORTFOLIO_ROOT, safeUrl === '/' ? 'index.html' : safeUrl);
    if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
      const mime = getMimeType(localPath);
      const headers = {
        'Content-Type': mime,
        'Access-Control-Allow-Origin': '*',
      };
      if (safeUrl.includes('.wasm.gz')) {
        headers['Cache-Control'] = customHeader;
      }
      res.writeHead(200, headers);
      fs.createReadStream(localPath).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`404: ${safeUrl}`);
    }
  });

  const serverUrl = await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve(`http://127.0.0.1:${server.address().port}`);
    });
  });

  console.log(`Test server running at ${serverUrl}`);

  const docxBuffer = fs.readFileSync(FIXTURE_DOCX);
  const base64Docx = docxBuffer.toString('base64');

  const report = {};

  // Case 1: First initialization with fresh browser profile
  {
    console.log('\n--- Case 1: First initialization with fresh browser profile ---');
    wasmRequests = 0;
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-profile-1-'));
    const context = await chromium.launchPersistentContext(tempDir, { headless: true });
    const page = await context.newPage();
    await page.goto(serverUrl);

    const timing = await page.evaluate(async (b64) => {
      const binStr = atob(b64);
      const bytes = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
      const ab = bytes.buffer;

      const t0 = performance.now();
      let tWorkerCreated = 0;
      let tDownloading = 0;
      let tDecompressing = 0;
      let tCompiling = 0;
      let tReady = 0;
      let tConverting = 0;
      let tDone = 0;

      const worker = new Worker('/assets/js/converter.worker.js');
      tWorkerCreated = performance.now();

      return new Promise((resolve, reject) => {
        worker.onmessage = (e) => {
          const now = performance.now();
          if (e.data.type === 'progress') {
            if (e.data.stage === 'downloading') tDownloading = now;
            else if (e.data.stage === 'decompressing') tDecompressing = now;
            else if (e.data.stage === 'compiling') tCompiling = now;
            else if (e.data.stage === 'ready') tReady = now;
            else if (e.data.stage === 'converting') tConverting = now;
          } else if (e.data.type === 'result') {
            tDone = now;
            worker.terminate();
            resolve({
              totalMs: tDone - t0,
              workerCreationMs: tWorkerCreated - t0,
              downloadWaitMs: tDecompressing > 0 ? tDecompressing - tDownloading : 0,
              decompressMs: tCompiling > 0 ? tCompiling - tDecompressing : 0,
              compileMs: tReady > 0 ? tReady - tCompiling : 0,
              convertMs: tDone - tConverting,
              success: e.data.success,
            });
          }
        };
        worker.onerror = (err) => reject(new Error(err.message));

        worker.postMessage({
          id: 'case-1',
          type: 'convert',
          format: 'docx',
          content: ab,
          filename: 'doc.docx',
          options: { wasmUrl: '/assets/wasm/pandoc.wasm.gz', mode: 'fragment' }
        }, [ab]);
      });
    }, base64Docx);

    await context.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
    report.case1 = { ...timing, wasmRequests };
    console.log('Result Case 1:', report.case1);
  }

  // Case 2: A second conversion in the same session (Worker Reused vs Worker Re-created)
  {
    console.log('\n--- Case 2: Second conversion in same session ---');
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-profile-2-'));
    const context = await chromium.launchPersistentContext(tempDir, { headless: true });
    const page = await context.newPage();
    await page.goto(serverUrl);

    // 2A: Reusing same worker instance
    const reuseTiming = await page.evaluate(async (b64) => {
      const binStr = atob(b64);
      const makeAb = () => {
        const bytes = new Uint8Array(binStr.length);
        for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
        return bytes.buffer;
      };

      const worker = new Worker('/assets/js/converter.worker.js');

      const runOnce = (id) => new Promise((resolve, reject) => {
        const ab = makeAb();
        const start = performance.now();
        const handler = (e) => {
          if (e.data.type === 'result' && e.data.id === id) {
            worker.removeEventListener('message', handler);
            resolve({
              durationMs: performance.now() - start,
              success: e.data.success,
            });
          }
        };
        worker.addEventListener('message', handler);
        worker.addEventListener('error', (err) => reject(new Error(err.message)));
        worker.postMessage({
          id,
          type: 'convert',
          format: 'docx',
          content: ab,
          filename: 'doc.docx',
          options: { wasmUrl: '/assets/wasm/pandoc.wasm.gz', mode: 'fragment' }
        }, [ab]);
      });

      const first = await runOnce('c2-first');
      const second = await runOnce('c2-second');
      const third = await runOnce('c2-third');

      worker.terminate();
      return { first, second, third };
    }, base64Docx);

    // 2B: Terminating worker and creating new worker (No worker reuse)
    const terminateTiming = await page.evaluate(async (b64) => {
      const binStr = atob(b64);
      const makeAb = () => {
        const bytes = new Uint8Array(binStr.length);
        for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
        return bytes.buffer;
      };

      const runWithNewWorker = (id) => new Promise((resolve, reject) => {
        const ab = makeAb();
        const start = performance.now();
        const worker = new Worker('/assets/js/converter.worker.js');
        worker.onmessage = (e) => {
          if (e.data.type === 'result') {
            const dur = performance.now() - start;
            worker.terminate();
            resolve({ durationMs: dur, success: e.data.success });
          }
        };
        worker.onerror = (err) => {
          worker.terminate();
          reject(new Error(err.message));
        };
        worker.postMessage({
          id,
          type: 'convert',
          format: 'docx',
          content: ab,
          filename: 'doc.docx',
          options: { wasmUrl: '/assets/wasm/pandoc.wasm.gz', mode: 'fragment' }
        }, [ab]);
      });

      const run1 = await runWithNewWorker('t-first');
      const run2 = await runWithNewWorker('t-second');
      return { run1, run2 };
    }, base64Docx);

    await context.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
    report.case2 = { reuseTiming, terminateTiming };
    console.log('Result Case 2 (Reused Worker):', reuseTiming);
    console.log('Result Case 2 (Terminated & Re-created Worker):', terminateTiming);
  }

  // Case 3: Repeat visit with browser cache retained
  {
    console.log('\n--- Case 3: Repeat visit with browser cache retained ---');
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-profile-3-'));
    const context = await chromium.launchPersistentContext(tempDir, { headless: true });

    // Visit 1
    wasmRequests = 0;
    const page1 = await context.newPage();
    await page1.goto(serverUrl);
    const visit1 = await page1.evaluate(async (b64) => {
      const binStr = atob(b64);
      const bytes = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
      const ab = bytes.buffer;
      const start = performance.now();
      return new Promise((resolve) => {
        const worker = new Worker('/assets/js/converter.worker.js');
        worker.onmessage = (e) => {
          if (e.data.type === 'result') {
            worker.terminate();
            resolve({ durationMs: performance.now() - start, success: e.data.success });
          }
        };
        worker.postMessage({
          id: 'v1',
          type: 'convert',
          format: 'docx',
          content: ab,
          options: { wasmUrl: '/assets/wasm/pandoc.wasm.gz' }
        }, [ab]);
      });
    }, base64Docx);
    const visit1Requests = wasmRequests;
    await page1.close();

    // Visit 2 (new tab / page in same persistent browser context)
    wasmRequests = 0;
    const page2 = await context.newPage();
    await page2.goto(serverUrl);
    const visit2 = await page2.evaluate(async (b64) => {
      const binStr = atob(b64);
      const bytes = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
      const ab = bytes.buffer;
      const start = performance.now();
      return new Promise((resolve) => {
        const worker = new Worker('/assets/js/converter.worker.js');
        worker.onmessage = (e) => {
          if (e.data.type === 'result') {
            worker.terminate();
            resolve({ durationMs: performance.now() - start, success: e.data.success });
          }
        };
        worker.postMessage({
          id: 'v2',
          type: 'convert',
          format: 'docx',
          content: ab,
          options: { wasmUrl: '/assets/wasm/pandoc.wasm.gz' }
        }, [ab]);
      });
    }, base64Docx);
    const visit2Requests = wasmRequests;
    await page2.close();

    await context.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
    report.case3 = { visit1, visit1Requests, visit2, visit2Requests };
    console.log('Result Case 3:', report.case3);
  }

  // Case 4: Repeat visit with browser cache disabled
  {
    console.log('\n--- Case 4: Repeat visit with browser cache disabled ---');
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-profile-4-'));
    const context = await chromium.launchPersistentContext(tempDir, { headless: true });
    const page = await context.newPage();
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await page.goto(serverUrl);

    wasmRequests = 0;
    const noCacheTiming = await page.evaluate(async (b64) => {
      const binStr = atob(b64);
      const bytes = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
      const ab = bytes.buffer;
      const start = performance.now();
      return new Promise((resolve) => {
        const worker = new Worker('/assets/js/converter.worker.js');
        worker.onmessage = (e) => {
          if (e.data.type === 'result') {
            worker.terminate();
            resolve({ durationMs: performance.now() - start, success: e.data.success });
          }
        };
        worker.postMessage({
          id: 'no-cache',
          type: 'convert',
          format: 'docx',
          content: ab,
          options: { wasmUrl: '/assets/wasm/pandoc.wasm.gz' }
        }, [ab]);
      });
    }, base64Docx);

    await context.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
    report.case4 = { ...noCacheTiming, wasmRequests };
    console.log('Result Case 4:', report.case4);
  }

  // Case 5: WASM download failure (404)
  {
    console.log('\n--- Case 5: WASM download failure (404) ---');
    simulateWasm404 = true;
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(serverUrl);

    const fail404 = await page.evaluate(async () => {
      const start = performance.now();
      return new Promise((resolve) => {
        const worker = new Worker('/assets/js/converter.worker.js');
        worker.onmessage = (e) => {
          if (e.data.type === 'result' || e.data.type === 'init-ready') {
            worker.terminate();
            resolve({ durationMs: performance.now() - start, data: e.data });
          }
        };
        worker.onerror = (err) => {
          worker.terminate();
          resolve({ durationMs: performance.now() - start, error: err.message });
        };
        worker.postMessage({
          id: 'fail-404',
          type: 'convert',
          format: 'docx',
          content: new ArrayBuffer(10),
          options: { wasmUrl: '/assets/wasm/pandoc.wasm.gz' }
        });
      });
    });

    simulateWasm404 = false;
    await browser.close();
    report.case5 = fail404;
    console.log('Result Case 5:', report.case5);
  }

  // Case 6: WASM initialization failure (corrupted stream)
  {
    console.log('\n--- Case 6: WASM initialization failure (corrupted stream) ---');
    simulateCorruptWasm = true;
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(serverUrl);

    const failCorrupt = await page.evaluate(async () => {
      const start = performance.now();
      return new Promise((resolve) => {
        const worker = new Worker('/assets/js/converter.worker.js');
        worker.onmessage = (e) => {
          if (e.data.type === 'result' || e.data.type === 'init-ready') {
            worker.terminate();
            resolve({ durationMs: performance.now() - start, data: e.data });
          }
        };
        worker.onerror = (err) => {
          worker.terminate();
          resolve({ durationMs: performance.now() - start, error: err.message });
        };
        worker.postMessage({
          id: 'fail-corrupt',
          type: 'convert',
          format: 'docx',
          content: new ArrayBuffer(10),
          options: { wasmUrl: '/assets/wasm/pandoc.wasm.gz' }
        });
      });
    });

    simulateCorruptWasm = false;
    await browser.close();
    report.case6 = failCorrupt;
    console.log('Result Case 6:', report.case6);
  }

  // Case 7: Conversion failure after successful initialization
  {
    console.log('\n--- Case 7: Conversion failure after successful initialization ---');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(serverUrl);

    const failConversion = await page.evaluate(async () => {
      const worker = new Worker('/assets/js/converter.worker.js');
      // 1. Initialize first
      await new Promise((resolve) => {
        worker.onmessage = (e) => {
          if (e.data.type === 'init-ready') resolve();
        };
        worker.postMessage({ id: 'init', type: 'init', wasmUrl: '/assets/wasm/pandoc.wasm.gz' });
      });

      // 2. Send bad payload (corrupted docx content)
      const start = performance.now();
      return new Promise((resolve) => {
        worker.onmessage = (e) => {
          if (e.data.type === 'result') {
            const dur = performance.now() - start;
            worker.terminate();
            resolve({ durationMs: dur, data: e.data });
          }
        };
        worker.postMessage({
          id: 'fail-bad-docx',
          type: 'convert',
          format: 'docx',
          content: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer,
          filename: 'corrupt.docx',
        });
      });
    });

    await browser.close();
    report.case7 = failConversion;
    console.log('Result Case 7:', report.case7);
  }

  // Save audit measurements
  fs.writeFileSync(path.join(__dirname, 'audit_lifecycle_results.json'), JSON.stringify(report, null, 2));

  await new Promise((resolve) => server.close(resolve));
  console.log('\n=== Audit Complete. Results saved to tests/audit_lifecycle_results.json ===');
}

runAudit().catch(console.error);
