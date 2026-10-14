import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ConverterClient } from '../assets/js/converterClient.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORTFOLIO_ROOT = path.resolve(__dirname, '..');
const FIXTURE_DOCX = path.join(__dirname, 'fixtures/headings_bold_italic.docx');

/**
 * Lightweight, synchronous/microtask FakeWorker implementing the Worker message interface
 * for pure Node.js controller unit tests (zero browser overhead, zero WASM decompression).
 */
class FakeWorker {
  constructor() {
    this.listeners = new Map();
    this.isTerminated = false;
    this.sentMessages = [];
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type).add(listener);
  }

  removeEventListener(type, listener) {
    if (this.listeners.has(type)) {
      this.listeners.get(type).delete(listener);
    }
  }

  dispatchEvent(event) {
    if (this.isTerminated) return;
    const handlers = this.listeners.get(event.type);
    if (handlers) {
      for (const h of handlers) {
        h(event);
      }
    }
    if (event.type === 'message' && typeof this.onmessage === 'function') {
      this.onmessage(event);
    }
    if (event.type === 'error' && typeof this.onerror === 'function') {
      this.onerror(event);
    }
  }

  postMessage(data) {
    if (this.isTerminated) return;
    this.sentMessages.push(data);

    // Simulate worker responses asynchronously via queueMicrotask
    queueMicrotask(() => {
      if (this.isTerminated) return;

      if (data.type === 'init') {
        if (data.wasmUrl && data.wasmUrl.includes('simulate_crash')) {
          this.dispatchEvent({
            type: 'error',
            message: 'Simulated worker thread crash during init',
          });
          return;
        }

        if (data.wasmUrl && data.wasmUrl.includes('simulate_hang')) {
          // Do not send init-ready to simulate an in-flight, hanging initialization
          return;
        }

        if (data.wasmUrl && data.wasmUrl.includes('fail_404')) {
          this.dispatchEvent({
            type: 'message',
            data: { id: data.id, type: 'init-ready', success: false, error: 'HTTP 404 Not Found' },
          });
          return;
        }

        // Emit standard initialization progress sequence
        this.dispatchEvent({ type: 'message', data: { type: 'progress', stage: 'downloading', message: 'Fetching...' } });
        this.dispatchEvent({ type: 'message', data: { type: 'progress', stage: 'decompressing', message: 'Decompressing...' } });
        this.dispatchEvent({ type: 'message', data: { type: 'progress', stage: 'compiling', message: 'Compiling...' } });
        this.dispatchEvent({ type: 'message', data: { type: 'progress', stage: 'ready', message: 'Ready' } });
        this.dispatchEvent({ type: 'message', data: { id: data.id, type: 'init-ready', success: true } });
        return;
      }

      if (data.type === 'convert') {
        if (data.content === 'SIMULATE_WORKER_ERROR') {
          this.dispatchEvent({
            type: 'error',
            message: 'Simulated worker thread crash',
          });
          return;
        }

        if (data.content === 'SIMULATE_CONVERT_FAIL') {
          this.dispatchEvent({
            type: 'message',
            data: { id: data.id, type: 'result', success: false, error: 'Pandoc syntax error' },
          });
          return;
        }

        // Normal conversion progression
        this.dispatchEvent({
          type: 'message',
          data: { id: data.id, type: 'progress', stage: 'converting', message: 'Converting...' },
        });
        this.dispatchEvent({
          type: 'message',
          data: { id: data.id, type: 'progress', stage: 'cleaning', message: 'Cleaning...' },
        });

        let cleanLatex = '\\textbf{Converted}';
        if (typeof data.content === 'string') {
          cleanLatex = data.content.includes('#') ? `\\section{${data.content.replace(/^#+\s*/, '')}}` : `\\text{${data.content}}`;
        }

        this.dispatchEvent({
          type: 'message',
          data: {
            id: data.id,
            type: 'result',
            success: true,
            cleanLatex,
            metadata: { mode: data.options?.mode || 'fragment', hasGeometry: false },
          },
        });
      }
    });
  }

  terminate() {
    this.isTerminated = true;
  }
}

describe('Step 5A: Fast Controller Unit Tests (Lightweight Fake Worker)', () => {
  it('1. Pre-warming initializes the engine only once and notifies progress callbacks', async () => {
    let createdCount = 0;
    const client = new ConverterClient({
      workerFactory: () => {
        createdCount++;
        return new FakeWorker();
      },
    });

    const stages = [];
    await client.prewarm((evt) => stages.push(evt.stage));

    const status1 = client.getStatus();

    // Second prewarm should return immediately without creating another worker
    const secondStages = [];
    await client.prewarm((evt) => secondStages.push(evt.stage));

    client.terminate();

    assert.equal(createdCount, 1, 'Only one worker instance was created');
    assert.deepEqual(stages, ['downloading', 'decompressing', 'compiling', 'ready']);
    assert.equal(status1.isInitialized, true);
    assert.deepEqual(secondStages, ['ready'], 'Second prewarm reports ready immediately');
  });

  it('2. Multiple sequential conversions reuse the same worker instance', async () => {
    let createdCount = 0;
    const client = new ConverterClient({
      workerFactory: () => {
        createdCount++;
        return new FakeWorker();
      },
    });

    const r1 = await client.convertDocument({ format: 'html', content: 'Item 1' });
    const r2 = await client.convertDocument({ format: 'html', content: 'Item 2' });
    const r3 = await client.convertDocument({ format: 'html', content: 'Item 3' });

    const status = client.getStatus();
    client.terminate();

    assert.equal(createdCount, 1, 'Reused the exact same worker instance across all 3 conversions');
    assert.ok(r1.cleanLatex.includes('Item 1'));
    assert.ok(r2.cleanLatex.includes('Item 2'));
    assert.ok(r3.cleanLatex.includes('Item 3'));
    assert.equal(status.pendingCount, 0, 'Pending queue empty');
  });

  it('3. Concurrent requests receive correct respective results and progress updates', async () => {
    const client = new ConverterClient({
      workerFactory: () => new FakeWorker(),
    });

    const prog1 = [];
    const prog2 = [];

    const [res1, res2] = await Promise.all([
      client.convertDocument({ format: 'markdown', content: '# Section Alpha' }, (e) => prog1.push(e.stage)),
      client.convertDocument({ format: 'markdown', content: '## Section Beta' }, (e) => prog2.push(e.stage)),
    ]);

    client.terminate();

    assert.notEqual(res1.id, res2.id, 'Distinct request IDs');
    assert.ok(res1.cleanLatex.includes('Section Alpha'));
    assert.ok(res2.cleanLatex.includes('Section Beta'));
    assert.ok(prog1.includes('converting'), 'Request 1 received converting stage');
    assert.ok(prog2.includes('converting'), 'Request 2 received converting stage');
  });

  it('4. Rejects invalid input before dispatch without spawning a worker (Instant)', async () => {
    let workerSpawned = false;
    const client = new ConverterClient({
      workerFactory: () => {
        workerSpawned = true;
        return new FakeWorker();
      },
    });

    await assert.rejects(
      () => client.convertDocument(null),
      /Conversion input must be a valid object/
    );

    await assert.rejects(
      () => client.convertDocument({ format: 'pdf', content: 'data' }),
      /Invalid conversion format/
    );

    await assert.rejects(
      () => client.convertDocument({ format: 'docx', content: new ArrayBuffer(0) }),
      /DOCX document data is empty/
    );

    await assert.rejects(
      () => client.convertDocument({ format: 'markdown', content: 12345 }),
      /MARKDOWN conversion requires string content/
    );

    assert.equal(workerSpawned, false, 'Worker was never spawned for invalid inputs');
    assert.equal(client.getStatus().hasWorker, false);
  });

  it('5. Initialization failure rejects prewarm and pending conversions instead of hanging', async () => {
    const client = new ConverterClient({
      wasmUrl: '/assets/wasm/fail_404.wasm.gz',
      workerFactory: () => new FakeWorker(),
    });

    await assert.rejects(
      () => client.prewarm(),
      /404 Not Found/
    );

    assert.equal(client.getStatus().pendingCount, 0, 'No dangling promises');
    client.terminate();
  });

  it('6. Worker crash rejects pending requests and allows clean recovery', async () => {
    let workerInstances = 0;
    const client = new ConverterClient({
      workerFactory: () => {
        workerInstances++;
        return new FakeWorker();
      },
    });

    // 1. Crash on first request
    await assert.rejects(
      () => client.convertDocument({ format: 'html', content: 'SIMULATE_WORKER_ERROR' }),
      /Converter Worker Error: Simulated worker thread crash/
    );

    assert.equal(client.getStatus().hasWorker, false, 'Crashed worker was terminated');

    // 2. Recovery on next request
    const recoveryRes = await client.convertDocument({ format: 'html', content: 'Recovered Document' });
    assert.ok(recoveryRes.cleanLatex.includes('Recovered Document'), 'Recovered cleanly');
    assert.equal(workerInstances, 2, 'Spoke to a new recovered worker instance');

    client.terminate();
  });

  it('7. (Step 5C Regression) terminate() during active prewarm() promptly rejects promise with bounded timeout', async () => {
    const client = new ConverterClient({
      wasmUrl: '/assets/wasm/simulate_hang.wasm.gz',
      workerFactory: () => new FakeWorker(),
    });

    const prewarmPromise = client.prewarm();

    // Terminate while prewarm is in flight
    client.terminate();

    // Must promptly reject without hanging or exceeding a bounded timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout: prewarm promise hung after terminate()')), 500)
    );

    await assert.rejects(
      () => Promise.race([prewarmPromise, timeoutPromise]),
      /ConverterClient was terminated by caller/
    );

    const status = client.getStatus();
    assert.equal(status.hasWorker, false);
    assert.equal(status.isInitialized, false);
  });

  it('8. (Step 5C Regression) Worker crash during active prewarm() promptly rejects promise with bounded timeout', async () => {
    const client = new ConverterClient({
      wasmUrl: '/assets/wasm/simulate_crash.wasm.gz',
      workerFactory: () => new FakeWorker(),
    });

    const prewarmPromise = client.prewarm();

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout: prewarm promise hung after worker crash')), 500)
    );

    await assert.rejects(
      () => Promise.race([prewarmPromise, timeoutPromise]),
      /Converter Worker Error: Simulated worker thread crash during init/
    );

    const status = client.getStatus();
    assert.equal(status.hasWorker, false);
    assert.equal(status.isInitialized, false);
  });

  it('9. (Step 5C Regression) Concurrent prewarm() callers all settle promptly when terminated', async () => {
    const client = new ConverterClient({
      wasmUrl: '/assets/wasm/simulate_hang.wasm.gz',
      workerFactory: () => new FakeWorker(),
    });

    const p1 = client.prewarm();
    const p2 = client.prewarm();
    const p3 = client.prewarm();

    client.terminate();

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout: concurrent prewarms hung after terminate()')), 500)
    );

    const results = await Promise.allSettled([
      Promise.race([p1, timeoutPromise]),
      Promise.race([p2, timeoutPromise]),
      Promise.race([p3, timeoutPromise]),
    ]);

    assert.equal(results.length, 3);
    for (const res of results) {
      assert.equal(res.status, 'rejected');
      assert.match(res.reason.message, /ConverterClient was terminated by caller/);
    }
  });

  it('10. (Step 5C Regression) Client creates fresh worker and succeeds after prewarm crash', async () => {
    let instances = 0;
    const client = new ConverterClient({
      workerFactory: () => {
        instances++;
        return new FakeWorker();
      },
    });

    // Cause a crash during prewarm
    await assert.rejects(
      () => client.prewarm(undefined, '/assets/wasm/simulate_crash.wasm.gz'),
      /Simulated worker thread crash during init/
    );

    assert.equal(client.getStatus().hasWorker, false);

    // Subsequent operation should cleanly spawn instance #2 and succeed
    const res = await client.convertDocument({ format: 'html', content: 'Fresh Document' });
    assert.ok(res.cleanLatex.includes('Fresh Document'));
    assert.equal(instances, 2, 'Successfully spawned a new healthy worker');

    client.terminate();
  });
});

describe('Step 5A: Real Browser & Worker Integration Test (Playwright E2E)', () => {
  let server;
  let serverUrl;
  let browser;

  before(async () => {
    server = http.createServer((req, res) => {
      const safeUrl = new URL(req.url, 'http://localhost').pathname;
      let localPath = path.join(PORTFOLIO_ROOT, safeUrl === '/' ? 'index.html' : safeUrl);

      if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
        const mime = safeUrl.endsWith('.js') ? 'application/javascript'
          : safeUrl.endsWith('.wasm.gz') ? 'application/gzip'
          : safeUrl.endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : 'text/html';
        res.writeHead(200, { 'Content-Type': mime, 'Access-Control-Allow-Origin': '*' });
        fs.createReadStream(localPath).pipe(res);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end(`404: ${safeUrl}`);
      }
    });

    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        serverUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });

    const { chromium } = await import('playwright');
    browser = await chromium.launch({ headless: true });
  });

  after(async () => {
    if (browser) await browser.close();
    if (server) await new Promise((resolve) => server.close(resolve));
  });

  it('7. Real End-to-End: ConverterClient interacts with real converter.worker.js on actual DOCX fixture', async () => {
    const docxBuf = fs.readFileSync(FIXTURE_DOCX);
    const b64 = docxBuf.toString('base64');

    const page = await browser.newPage();
    await page.goto(serverUrl);

    const result = await page.evaluate(async (b64Data) => {
      const binStr = atob(b64Data);
      const bytes = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
      const ab = bytes.buffer;

      const { ConverterClient } = await import('/assets/js/converterClient.js');
      const client = new ConverterClient();

      const stages = [];
      const res = await client.convertDocument(
        {
          format: 'docx',
          content: ab,
          filename: 'headings_bold_italic.docx',
          options: { mode: 'fragment' },
        },
        (e) => stages.push(e.stage)
      );

      client.terminate();
      return { res, stages };
    }, b64);

    assert.equal(result.res.success, true);
    assert.ok(result.res.cleanLatex.includes('Heading Level 1'));
    assert.ok(result.res.cleanLatex.includes('\\textbf{Bold Text}'));
    assert.ok(result.res.cleanLatex.includes('\\emph{Italic Text}'));
    assert.ok(result.stages.includes('downloading') || result.stages.includes('converting'));

    await page.close();
  });
});
