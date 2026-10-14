import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Import Playwright from local package
const { chromium } = await import('playwright');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORTFOLIO_ROOT = path.resolve(__dirname, '..');
const FIXTURE_DOCX = path.join(__dirname, 'fixtures/headings_bold_italic.docx');

let server;
let serverUrl;
let browser;

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

before(async () => {
  // 1. Start static server
  server = http.createServer((req, res) => {
    const safeUrl = new URL(req.url, 'http://localhost').pathname;
    let localPath = path.join(PORTFOLIO_ROOT, safeUrl === '/' ? 'index.html' : safeUrl);

    if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
      const mime = getMimeType(localPath);
      res.writeHead(200, {
        'Content-Type': mime,
        'Access-Control-Allow-Origin': '*',
      });
      fs.createReadStream(localPath).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`404 Not Found: ${safeUrl}`);
    }
  });

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      serverUrl = `http://127.0.0.1:${port}`;
      console.log(`Test static server running at ${serverUrl}`);
      resolve();
    });
  });

  // 2. Launch headless Chromium
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
});

describe('Step 2A: Browser Web Worker Proof of Concept', () => {
  it('1. Web Worker loads pandoc.wasm.gz, decompresses via DecompressionStream, and reports init-ready', async () => {
    const page = await browser.newPage();
    await page.goto(serverUrl);

    const initResult = await page.evaluate(async () => {
      return new Promise((resolve, reject) => {
        const worker = new Worker('/assets/js/converter.worker.js');
        const timeout = setTimeout(() => {
          worker.terminate();
          reject(new Error('Worker init timed out after 30s'));
        }, 30000);

        const stages = [];

        worker.onmessage = (e) => {
          if (e.data.type === 'progress') {
            stages.push(e.data.stage);
          } else if (e.data.type === 'init-ready') {
            clearTimeout(timeout);
            worker.terminate();
            resolve({
              success: e.data.success,
              stages,
              error: e.data.error,
            });
          }
        };

        worker.onerror = (err) => {
          clearTimeout(timeout);
          worker.terminate();
          reject(new Error(`Worker script error: ${err.message}`));
        };

        worker.postMessage({
          id: 'test-init',
          type: 'init',
          wasmUrl: '/assets/wasm/pandoc.wasm.gz',
        });
      });
    });

    assert.equal(initResult.success, true, `Init failed: ${initResult.error}`);
    assert.ok(initResult.stages.includes('downloading'), 'Should report downloading stage');
    assert.ok(initResult.stages.includes('decompressing'), 'Should report decompressing stage');
    assert.ok(initResult.stages.includes('compiling'), 'Should report compiling stage');
    assert.ok(initResult.stages.includes('ready'), 'Should report ready stage');

    await page.close();
  });

  it('2. Web Worker converts rich HTML snippet with formatting and table to clean LaTeX', async () => {
    const page = await browser.newPage();
    await page.goto(serverUrl);

    const result = await page.evaluate(async () => {
      return new Promise((resolve, reject) => {
        const worker = new Worker('/assets/js/converter.worker.js');
        const timeout = setTimeout(() => {
          worker.terminate();
          reject(new Error('Conversion timed out after 30s'));
        }, 30000);

        worker.onmessage = (e) => {
          if (e.data.type === 'result') {
            clearTimeout(timeout);
            worker.terminate();
            resolve(e.data);
          }
        };

        worker.onerror = (err) => {
          clearTimeout(timeout);
          worker.terminate();
          reject(new Error(`Worker error: ${err.message}`));
        };

        // Send HTML conversion with formatting and table
        worker.postMessage({
          id: 'test-html',
          type: 'convert',
          format: 'html',
          content: '<h3>Experimental Results</h3><p>Measurement: <b>Alpha</b> is <i>0.95</i>.</p><table><tr><th>Param</th><th>Value</th></tr><tr><td>Beta</td><td>1.42</td></tr></table>',
          options: {
            wasmUrl: '/assets/wasm/pandoc.wasm.gz',
            mode: 'fragment',
          },
        });
      });
    });

    assert.equal(result.success, true, `Conversion failed: ${result.error}`);
    assert.ok(result.cleanLatex, 'cleanLatex must be non-empty');
    assert.ok(
      result.cleanLatex.includes('\\subsubsection{Experimental Results}') || result.cleanLatex.includes('\\subsection{Experimental Results}'),
      'Must format heading'
    );
    assert.ok(result.cleanLatex.includes('\\textbf{Alpha}'), 'Must format bold');
    assert.ok(result.cleanLatex.includes('\\emph{0.95}') || result.cleanLatex.includes('\\textit{0.95}'), 'Must format italic');
    assert.ok(result.cleanLatex.includes('tabular') || result.cleanLatex.includes('longtable'), 'Must convert table structure');
    assert.ok(!result.cleanLatex.includes('\\tightlist'), 'Must not contain \\tightlist artifact');
    assert.ok(!result.cleanLatex.includes('\\documentclass'), 'Fragment mode must not include \\documentclass');

    await page.close();
  });

  it('3. Web Worker converts real .docx file ArrayBuffer to clean LaTeX', async () => {
    const docxBuffer = fs.readFileSync(FIXTURE_DOCX);
    const base64Docx = docxBuffer.toString('base64');

    const page = await browser.newPage();
    await page.goto(serverUrl);

    const result = await page.evaluate(async (b64) => {
      // Decode base64 to ArrayBuffer
      const binStr = atob(b64);
      const len = binStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binStr.charCodeAt(i);
      }
      const arrayBuffer = bytes.buffer;

      return new Promise((resolve, reject) => {
        const worker = new Worker('/assets/js/converter.worker.js');
        const timeout = setTimeout(() => {
          worker.terminate();
          reject(new Error('DOCX conversion timed out after 30s'));
        }, 30000);

        worker.onmessage = (e) => {
          if (e.data.type === 'result') {
            clearTimeout(timeout);
            worker.terminate();
            resolve(e.data);
          }
        };

        worker.onerror = (err) => {
          clearTimeout(timeout);
          worker.terminate();
          reject(new Error(`Worker error: ${err.message}`));
        };

        worker.postMessage({
          id: 'test-docx',
          type: 'convert',
          format: 'docx',
          content: arrayBuffer,
          filename: 'headings_bold_italic.docx',
          options: {
            wasmUrl: '/assets/wasm/pandoc.wasm.gz',
            mode: 'fragment',
          },
        }, [arrayBuffer]);
      });
    }, base64Docx);

    assert.equal(result.success, true, `DOCX conversion failed: ${result.error}`);
    assert.ok(result.cleanLatex, 'cleanLatex must be non-empty');
    assert.ok(result.cleanLatex.includes('Heading Level 1'), 'Must convert content from DOCX');
    assert.ok(result.cleanLatex.includes('\\textbf{Bold Text}'), 'Must extract bold from DOCX');
    assert.ok(result.cleanLatex.includes('\\emph{Italic Text}'), 'Must extract italic from DOCX');

    await page.close();
  });

  it('4. Document mode toggle produces complete compilable LaTeX document with preamble', async () => {
    const page = await browser.newPage();
    await page.goto(serverUrl);

    const result = await page.evaluate(async () => {
      return new Promise((resolve, reject) => {
        const worker = new Worker('/assets/js/converter.worker.js');
        const timeout = setTimeout(() => {
          worker.terminate();
          reject(new Error('Document mode timed out after 30s'));
        }, 30000);

        worker.onmessage = (e) => {
          if (e.data.type === 'result') {
            clearTimeout(timeout);
            worker.terminate();
            resolve(e.data);
          }
        };

        worker.onerror = (err) => {
          clearTimeout(timeout);
          worker.terminate();
          reject(new Error(`Worker error: ${err.message}`));
        };

        worker.postMessage({
          id: 'test-doc-mode',
          type: 'convert',
          format: 'html',
          content: '<p>Document mode test with an equation: <i>E = mc<sup>2</sup></i></p>',
          options: {
            wasmUrl: '/assets/wasm/pandoc.wasm.gz',
            mode: 'document',
          },
        });
      });
    });

    assert.equal(result.success, true, `Document mode conversion failed: ${result.error}`);
    assert.ok(result.cleanLatex.includes('\\documentclass{article}') || result.cleanLatex.includes('\\documentclass'), 'Must wrap in \\documentclass');
    assert.ok(result.cleanLatex.includes('\\begin{document}'), 'Must include \\begin{document}');
    assert.ok(result.cleanLatex.includes('\\end{document}'), 'Must include \\end{document}');
    assert.ok(result.cleanLatex.includes('\\usepackage{amsmath'), 'Must include amsmath package');

    await page.close();
  });

  it('5. Structured error handling: rejects invalid formats, null content, and corrupted docx without hanging', async () => {
    const page = await browser.newPage();
    await page.goto(serverUrl);

    const testResults = await page.evaluate(async () => {
      const worker = new Worker('/assets/js/converter.worker.js');
      const outcomes = {};

      function send(msg) {
        return new Promise((resolve) => {
          const handler = (e) => {
            if (e.data.id === msg.id && (e.data.type === 'result' || e.data.type === 'init-ready')) {
              worker.removeEventListener('message', handler);
              resolve(e.data);
            }
          };
          worker.addEventListener('message', handler);
          worker.postMessage(msg);
        });
      }

      // Case A: Unsupported format
      outcomes.unsupported = await send({
        id: 'err-unsupported',
        type: 'convert',
        format: 'pdf',
        content: 'hello',
      });

      // Case B: Null content
      outcomes.nullContent = await send({
        id: 'err-null',
        type: 'convert',
        format: 'html',
        content: null,
      });

      // Case C: Corrupted DOCX bytes
      const corruptBytes = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]).buffer;
      outcomes.corruptDocx = await send({
        id: 'err-corrupt',
        type: 'convert',
        format: 'docx',
        content: corruptBytes,
        options: { wasmUrl: '/assets/wasm/pandoc.wasm.gz' },
      });

      worker.terminate();
      return outcomes;
    });

    assert.equal(testResults.unsupported.success, false);
    assert.ok(testResults.unsupported.error.includes('Unsupported conversion format'));

    assert.equal(testResults.nullContent.success, false);
    assert.ok(testResults.nullContent.error.includes('cannot be null'));

    assert.equal(testResults.corruptDocx.success, false);
    assert.ok(testResults.corruptDocx.error, 'Should report a descriptive error for corrupted docx');

    await page.close();
  });

  it('6. Download failure handling: reports structured error on WASM 404 without hanging', async () => {
    const page = await browser.newPage();
    await page.goto(serverUrl);

    const errorResult = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const worker = new Worker('/assets/js/converter.worker.js');
        worker.onmessage = (e) => {
          if (e.data.id === 'err-404') {
            worker.terminate();
            resolve(e.data);
          }
        };
        worker.postMessage({
          id: 'err-404',
          type: 'init',
          wasmUrl: '/assets/wasm/non_existent_file.wasm.gz',
        });
      });
    });

    assert.equal(errorResult.success, false);
    assert.ok(errorResult.error.includes('404') || errorResult.error.includes('Failed to load WASM binary'));

    await page.close();
  });

  it('7. Subpath default URL resolution and rapid consecutive conversions execute in strict queue', async () => {
    const page = await browser.newPage();
    await page.goto(serverUrl);

    const results = await page.evaluate(async () => {
      // Do NOT specify options.wasmUrl — verify default resolution relative to self.location.href works!
      const worker = new Worker('/assets/js/converter.worker.js');
      const responses = [];

      const p1 = new Promise((resolve) => {
        const h = (e) => {
          if (e.data.id === 'rapid-1' && e.data.type === 'result') {
            worker.removeEventListener('message', h);
            resolve(e.data);
          }
        };
        worker.addEventListener('message', h);
      });

      const p2 = new Promise((resolve) => {
        const h = (e) => {
          if (e.data.id === 'rapid-2' && e.data.type === 'result') {
            worker.removeEventListener('message', h);
            resolve(e.data);
          }
        };
        worker.addEventListener('message', h);
      });

      const p3 = new Promise((resolve) => {
        const h = (e) => {
          if (e.data.id === 'rapid-3' && e.data.type === 'result') {
            worker.removeEventListener('message', h);
            resolve(e.data);
          }
        };
        worker.addEventListener('message', h);
      });

      // Post 3 messages simultaneously without waiting
      worker.postMessage({ id: 'rapid-1', type: 'convert', format: 'markdown', content: '# First\n\nOne' });
      worker.postMessage({ id: 'rapid-2', type: 'convert', format: 'markdown', content: '# Second\n\nTwo' });
      worker.postMessage({ id: 'rapid-3', type: 'convert', format: 'markdown', content: '# Third\n\nThree' });

      const all = await Promise.all([p1, p2, p3]);
      worker.terminate();
      return all;
    });

    assert.equal(results.length, 3);
    assert.equal(results[0].id, 'rapid-1');
    assert.equal(results[0].success, true);
    assert.ok(results[0].cleanLatex.includes('First'));

    assert.equal(results[1].id, 'rapid-2');
    assert.equal(results[1].success, true);
    assert.ok(results[1].cleanLatex.includes('Second'));

    assert.equal(results[2].id, 'rapid-3');
    assert.equal(results[2].success, true);
    assert.ok(results[2].cleanLatex.includes('Third'));

    await page.close();
  });
});
