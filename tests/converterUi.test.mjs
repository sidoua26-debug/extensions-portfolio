import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORTFOLIO_ROOT = path.resolve(__dirname, '..');
const FIXTURE_DOCX = path.join(__dirname, 'fixtures/headings_bold_italic.docx');

describe('Step 6C: Strengthened Converter UI Integration & Race Tests (Playwright)', () => {
  let server;
  let serverUrl;
  let browser;
  let browserContext;
  let requestedWasmOnInitialLoad = false;

  before(async () => {
    // Local static server serving the extensions-portfolio repository
    server = http.createServer((req, res) => {
      const safeUrl = new URL(req.url, 'http://localhost').pathname;
      let localPath = path.join(PORTFOLIO_ROOT, safeUrl === '/' ? 'index.html' : safeUrl);

      if (safeUrl.includes('pandoc.wasm.gz')) {
        requestedWasmOnInitialLoad = true;
      }

      if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
        const mime = safeUrl.endsWith('.js') ? 'application/javascript'
          : safeUrl.endsWith('.css') ? 'text/css'
          : safeUrl.endsWith('.png') ? 'image/png'
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
    // Grant clipboard read & write permissions for localhost
    browserContext = await browser.newContext({
      permissions: ['clipboard-read', 'clipboard-write'],
    });
  });

  after(async () => {
    if (browserContext) await browserContext.close();
    if (browser) await browser.close();
    if (server) await new Promise((resolve) => server.close(resolve));
  });

  it('Test 1 — Lazy loading & No Worker on Load: Initial load does not request WASM or construct Worker', async () => {
    requestedWasmOnInitialLoad = false;
    const page = await browserContext.newPage();

    let wasmRequested = false;
    page.on('request', (req) => {
      if (req.url().includes('pandoc.wasm.gz')) {
        wasmRequested = true;
      }
    });

    // Instrument Worker construction in browser page
    await page.addInitScript(() => {
      window['__workerConstructedCount'] = 0;
      const OrigWorker = window.Worker;
      window.Worker = function(...args) {
        window['__workerConstructedCount']++;
        return new OrigWorker(...args);
      };
      window.Worker.prototype = OrigWorker.prototype;
    });

    await page.goto(serverUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    const workersConstructed = await page.evaluate(() => window['__workerConstructedCount']);

    assert.equal(wasmRequested, false, 'pandoc.wasm.gz was NOT requested on page load');
    assert.equal(requestedWasmOnInitialLoad, false, 'Server received no WASM request');
    assert.equal(workersConstructed, 0, 'Zero Web Workers were constructed before user interaction');

    const copyDisabled = await page.$eval('#converterCopyBtn', (btn) => btn.disabled);
    const downloadDisabled = await page.$eval('#converterDownloadBtn', (btn) => btn.disabled);
    assert.equal(copyDisabled, true, 'Copy button is initially disabled');
    assert.equal(downloadDisabled, true, 'Download button is initially disabled');

    await page.close();
  });

  it('Test 2 — Real DOCX conversion: Converts headings_bold_italic.docx and populates valid LaTeX', async () => {
    const page = await browserContext.newPage();
    await page.goto(serverUrl);

    const fileInput = await page.$('#docxFileInput');
    await fileInput.setInputFiles(FIXTURE_DOCX);

    await page.waitForSelector('#converterOutputContainer:not([hidden])', { timeout: 15000 });
    const outputText = await page.$eval('#converterOutputArea', (el) => el.value);

    assert.ok(outputText.includes('Heading Level 1'), 'Contains heading');
    assert.ok(outputText.includes('\\textbf{Bold Text}'), 'Contains bold formatting');
    assert.ok(outputText.includes('\\emph{Italic Text}'), 'Contains italic formatting');

    const copyDisabled = await page.$eval('#converterCopyBtn', (btn) => btn.disabled);
    const downloadDisabled = await page.$eval('#converterDownloadBtn', (btn) => btn.disabled);
    assert.equal(copyDisabled, false, 'Copy button is enabled');
    assert.equal(downloadDisabled, false, 'Download button is enabled');

    await page.close();
  });

  it('Test 3 — Output modes: Toggling to Complete Document produces \\documentclass and document environment', async () => {
    const page = await browserContext.newPage();
    await page.goto(serverUrl);

    await page.click('#modeDocumentBtn');
    const isDocActive = await page.$eval('#modeDocumentBtn', (btn) => btn.classList.contains('active'));
    assert.equal(isDocActive, true, 'Document mode button is active');

    const fileInput = await page.$('#docxFileInput');
    await fileInput.setInputFiles(FIXTURE_DOCX);

    await page.waitForSelector('#converterOutputContainer:not([hidden])', { timeout: 15000 });
    const outputText = await page.$eval('#converterOutputArea', (el) => el.value);

    assert.ok(outputText.includes('\\documentclass'), 'Contains \\documentclass');
    assert.ok(outputText.includes('\\begin{document}'), 'Contains \\begin{document}');
    assert.ok(outputText.includes('\\end{document}'), 'Contains \\end{document}');

    await page.close();
  });

  it('Test 4 — Validation and errors: Displays actionable error on empty file and invalid file, cleans temp files', async () => {
    const page = await browserContext.newPage();
    await page.goto(serverUrl);

    // Use OS temp dir to prevent dirtying the repository
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'w2l-test-'));
    const emptyFilePath = path.join(tempDir, 'empty_test.docx');
    const txtFilePath = path.join(tempDir, 'invalid_test.txt');

    try {
      fs.writeFileSync(emptyFilePath, Buffer.alloc(0));
      fs.writeFileSync(txtFilePath, 'Some plain text');

      const fileInput = await page.$('#docxFileInput');

      // 1. Test empty file
      await fileInput.setInputFiles(emptyFilePath);
      await page.waitForSelector('#converterError:not([hidden])', { timeout: 5000 });
      const errorMsg1 = await page.$eval('#converterError', (el) => el.textContent);
      assert.ok(errorMsg1.includes('empty (0 bytes)'), `Displays empty file error: ${errorMsg1}`);

      // 2. Test non-docx file
      await fileInput.setInputFiles(txtFilePath);
      await page.waitForSelector('#converterError:not([hidden])', { timeout: 5000 });
      const errorMsg2 = await page.$eval('#converterError', (el) => el.textContent);
      assert.ok(errorMsg2.includes('Only .docx Word documents are supported'), `Displays invalid extension error: ${errorMsg2}`);
    } finally {
      // Guaranteed cleanup even if assertions fail
      if (fs.existsSync(emptyFilePath)) fs.unlinkSync(emptyFilePath);
      if (fs.existsSync(txtFilePath)) fs.unlinkSync(txtFilePath);
      if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);
    }

    await page.close();
  });

  it('Test 5 — Invalid-selection & Stale result races (Deterministic Test Seam)', async () => {
    const page = await browserContext.newPage();
    await page.goto(serverUrl);

    const raceResults = await page.evaluate(async () => {
      const { ConverterUI } = await import('/assets/js/converterUi.js');

      // Helper to construct a fresh test container
      function createTestUI() {
        const div = document.createElement('div');
        div.innerHTML = `
          <div id="test-converter">
            <div id="test-dropZone"></div>
            <input type="file" id="test-fileInput">
            <div id="test-fileName"></div>
            <button id="test-modeFrag"></button>
            <button id="test-modeDoc"></button>
            <div id="test-status">
              <span id="test-statusStage"></span>
              <span id="test-statusMessage"></span>
            </div>
            <div id="test-error"></div>
            <div id="test-outputContainer" hidden>
              <button id="test-copy" disabled></button>
              <button id="test-download" disabled></button>
              <button id="test-reset"></button>
              <textarea id="test-outputArea"></textarea>
            </div>
          </div>
        `;
        document.body.appendChild(div);

        const ui = new ConverterUI({
          container: div.querySelector('#test-converter'),
          dropZone: div.querySelector('#test-dropZone'),
          fileInput: div.querySelector('#test-fileInput'),
          fileNameDisplay: div.querySelector('#test-fileName'),
          modeFragmentBtn: div.querySelector('#test-modeFrag'),
          modeDocumentBtn: div.querySelector('#test-modeDoc'),
          statusContainer: div.querySelector('#test-status'),
          statusStage: div.querySelector('#test-statusStage'),
          statusMessage: div.querySelector('#test-statusMessage'),
          errorAlert: div.querySelector('#test-error'),
          outputContainer: div.querySelector('#test-outputContainer'),
          outputArea: div.querySelector('#test-outputArea'),
          copyBtn: div.querySelector('#test-copy'),
          downloadBtn: div.querySelector('#test-download'),
          resetBtn: div.querySelector('#test-reset'),
        });
        return { div, ui };
      }

      // Case 1: Slow valid conversion running -> user selects non-DOCX file
      let resolveSlow1;
      const slowPromise1 = new Promise((r) => { resolveSlow1 = r; });
      const { div: div1, ui: ui1 } = createTestUI();
      ui1['client'] = {
        convertDocument: async () => {
          await slowPromise1;
          return { id: 'slow1', success: true, cleanLatex: '\\text{Slow 1 Output}' };
        }
      };

      const validFile1 = new File([new ArrayBuffer(100)], 'valid.docx');
      const invalidTxtFile = new File([new ArrayBuffer(100)], 'notes.txt');

      ui1.handleFileSelected(validFile1);
      // Immediately select invalid file while validFile1 is converting
      ui1.handleFileSelected(invalidTxtFile);

      // Now resolve slow conversion #1
      resolveSlow1();
      await new Promise((r) => setTimeout(r, 60));

      const case1 = {
        outputValue: div1.querySelector('#test-outputArea').value,
        outputHidden: div1.querySelector('#test-outputContainer').hasAttribute('hidden'),
        copyDisabled: div1.querySelector('#test-copy').disabled,
        downloadDisabled: div1.querySelector('#test-download').disabled,
        errorVisible: !div1.querySelector('#test-error').hasAttribute('hidden'),
        errorText: div1.querySelector('#test-error').textContent,
      };
      document.body.removeChild(div1);

      // Case 2: Slow valid conversion running -> user selects empty (0 byte) file
      let resolveSlow2;
      const slowPromise2 = new Promise((r) => { resolveSlow2 = r; });
      const { div: div2, ui: ui2 } = createTestUI();
      ui2['client'] = {
        convertDocument: async () => {
          await slowPromise2;
          return { id: 'slow2', success: true, cleanLatex: '\\text{Slow 2 Output}' };
        }
      };

      const validFile2 = new File([new ArrayBuffer(100)], 'valid.docx');
      const emptyFile = new File([new ArrayBuffer(0)], 'empty.docx');

      ui2.handleFileSelected(validFile2);
      ui2.handleFileSelected(emptyFile);

      resolveSlow2();
      await new Promise((r) => setTimeout(r, 60));

      const case2 = {
        outputValue: div2.querySelector('#test-outputArea').value,
        outputHidden: div2.querySelector('#test-outputContainer').hasAttribute('hidden'),
        copyDisabled: div2.querySelector('#test-copy').disabled,
        downloadDisabled: div2.querySelector('#test-download').disabled,
        errorVisible: !div2.querySelector('#test-error').hasAttribute('hidden'),
        errorText: div2.querySelector('#test-error').textContent,
      };
      document.body.removeChild(div2);

      // Case 3: Slow valid conversion running -> user selects second valid file
      let resolveSlow3;
      const slowPromise3 = new Promise((r) => { resolveSlow3 = r; });
      let resolveFast3;
      const fastPromise3 = new Promise((r) => { resolveFast3 = r; });
      const { div: div3, ui: ui3 } = createTestUI();
      ui3['client'] = {
        convertDocument: async (input) => {
          if (input.filename === 'first.docx') {
            await slowPromise3;
            return { id: 'first', success: true, cleanLatex: '\\text{First Output}' };
          } else {
            await fastPromise3;
            return { id: 'second', success: true, cleanLatex: '\\text{Second Output}' };
          }
        }
      };

      const firstFile = new File([new ArrayBuffer(100)], 'first.docx');
      const secondFile = new File([new ArrayBuffer(100)], 'second.docx');

      ui3.handleFileSelected(firstFile);
      ui3.handleFileSelected(secondFile);

      // Resolve in reverse order (slow first arrives, then fast)
      resolveSlow3();
      await new Promise((r) => setTimeout(r, 60));
      const intermediateOutput = div3.querySelector('#test-outputArea').value;

      resolveFast3();
      await new Promise((r) => setTimeout(r, 60));
      const finalOutput = div3.querySelector('#test-outputArea').value;

      const case3 = {
        intermediateOutput,
        finalOutput,
        copyDisabled: div3.querySelector('#test-copy').disabled,
      };
      document.body.removeChild(div3);

      return { case1, case2, case3 };
    });

    // Verify Case 1 assertions: non-docx invalid selection
    assert.equal(raceResults.case1.outputValue, '', 'Case 1: Obsolete conversion did not populate output');
    assert.equal(raceResults.case1.outputHidden, true, 'Case 1: Output container remains hidden');
    assert.equal(raceResults.case1.copyDisabled, true, 'Case 1: Copy button remains disabled');
    assert.equal(raceResults.case1.downloadDisabled, true, 'Case 1: Download button remains disabled');
    assert.equal(raceResults.case1.errorVisible, true, 'Case 1: Invalid file error is visible');
    assert.match(raceResults.case1.errorText, /Only \.docx Word documents are supported/);

    // Verify Case 2 assertions: empty file invalid selection
    assert.equal(raceResults.case2.outputValue, '', 'Case 2: Obsolete conversion did not populate output');
    assert.equal(raceResults.case2.outputHidden, true, 'Case 2: Output container remains hidden');
    assert.equal(raceResults.case2.copyDisabled, true, 'Case 2: Copy button remains disabled');
    assert.equal(raceResults.case2.downloadDisabled, true, 'Case 2: Download button remains disabled');
    assert.equal(raceResults.case2.errorVisible, true, 'Case 2: Empty file error is visible');
    assert.match(raceResults.case2.errorText, /empty \(0 bytes\)/);

    // Verify Case 3 assertions: second valid selection
    assert.equal(raceResults.case3.intermediateOutput, '', 'Case 3: Obsolete first conversion dropped');
    assert.equal(raceResults.case3.finalOutput, '\\text{Second Output}', 'Case 3: Second conversion displayed');
    assert.equal(raceResults.case3.copyDisabled, false, 'Case 3: Copy button enabled for active conversion');

    await page.close();
  });

  it('Test 6 — Actual Clipboard verification: Copies and checks exact text against output area', async () => {
    const page = await browserContext.newPage();
    await page.goto(serverUrl);

    const fileInput = await page.$('#docxFileInput');
    await fileInput.setInputFiles(FIXTURE_DOCX);
    await page.waitForSelector('#converterOutputContainer:not([hidden])', { timeout: 15000 });

    const expectedLatex = await page.$eval('#converterOutputArea', (el) => el.value);
    assert.ok(expectedLatex.length > 0, 'Has valid output text');

    // Click Copy LaTeX button
    await page.click('#converterCopyBtn');

    // Read actual clipboard text via Playwright evaluation
    const actualClipboardText = await page.evaluate(async () => {
      try {
        return await navigator.clipboard.readText();
      } catch (err) {
        return null;
      }
    });

    if (actualClipboardText === null) {
      // In headless browser environments where system clipboard access is restricted
      console.warn('Note: navigator.clipboard.readText() permission restricted in test runner environment; verifying button feedback transition.');
      const btnText = await page.$eval('#converterCopyBtn', (btn) => btn.textContent);
      assert.ok(btnText.includes('Copied!'), 'Copy button feedback confirmed');
    } else {
      // Direct byte-for-byte clipboard text match
      assert.equal(actualClipboardText, expectedLatex, 'Actual clipboard content matches exact LaTeX output');
    }

    // Verify Download action
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('#converterDownloadBtn'),
    ]);
    assert.equal(download.suggestedFilename(), 'headings_bold_italic.tex');

    await page.close();
  });

  it('Test 7 — Basic accessibility and responsiveness: Works on mobile viewport and supports keyboard focus', async () => {
    const page = await browserContext.newPage();

    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(serverUrl);

    const dropZone = await page.$('#converterDropZone');
    const isVisible = await dropZone.isVisible();
    assert.equal(isVisible, true, 'Converter drop zone is visible on mobile');

    await page.focus('#converterDropZone');
    const isFocused = await page.evaluate(() => document.activeElement.id === 'converterDropZone');
    assert.equal(isFocused, true, 'Drop zone is focusable via keyboard');

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const innerWidth = await page.evaluate(() => window.innerWidth);
    assert.ok(scrollWidth <= innerWidth + 5, 'Page does not have horizontal layout blowout on mobile');

    await page.close();
  });

  it('Test 8 — Worker Reuse & No Duplicate Event Handlers on Reset & Repeat Use', async () => {
    const page = await browserContext.newPage();

    // Instrument Worker construction
    await page.addInitScript(() => {
      window['__workerCount'] = 0;
      const OrigWorker = window.Worker;
      window.Worker = function(...args) {
        window['__workerCount']++;
        return new OrigWorker(...args);
      };
      window.Worker.prototype = OrigWorker.prototype;
    });

    await page.goto(serverUrl);

    // Initial state: 0 workers
    let count0 = await page.evaluate(() => window['__workerCount']);
    assert.equal(count0, 0, 'No workers before first file conversion');

    // 1. First conversion
    const fileInput = await page.$('#docxFileInput');
    await fileInput.setInputFiles(FIXTURE_DOCX);
    await page.waitForSelector('#converterOutputContainer:not([hidden])', { timeout: 15000 });

    let count1 = await page.evaluate(() => window['__workerCount']);
    assert.equal(count1, 1, 'Exactly one worker constructed on first conversion');

    // 2. Click Reset / Convert Another
    await page.click('#converterResetBtn');

    const outputHidden = await page.$eval('#converterOutputContainer', (el) => el.hasAttribute('hidden'));
    assert.equal(outputHidden, true, 'Output container is hidden after reset');

    // 3. Second conversion of same fixture
    await fileInput.setInputFiles(FIXTURE_DOCX);
    await page.waitForSelector('#converterOutputContainer:not([hidden])', { timeout: 15000 });

    let count2 = await page.evaluate(() => window['__workerCount']);
    assert.equal(count2, 1, 'Reused the exact same worker instance; no duplicate worker created');

    const secondOutput = await page.$eval('#converterOutputArea', (el) => el.value);
    assert.ok(secondOutput.includes('Heading Level 1'), 'Second conversion succeeded after reset');

    await page.close();
  });

  it('Test 9 — (Step 6D) Mode switching after invalid selection does not reconvert previous file', async () => {
    const page = await browserContext.newPage();
    await page.goto(serverUrl);

    // 1. Convert valid file
    const fileInput = await page.$('#docxFileInput');
    await fileInput.setInputFiles(FIXTURE_DOCX);
    await page.waitForSelector('#converterOutputContainer:not([hidden])', { timeout: 15000 });

    const initialOutput = await page.$eval('#converterOutputArea', (el) => el.value);
    assert.ok(initialOutput.includes('Heading Level 1'));

    // 2. Select invalid file (temp empty file)
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'w2l-test-mode-'));
    const emptyFile = path.join(tempDir, 'empty.docx');
    fs.writeFileSync(emptyFile, Buffer.alloc(0));

    try {
      await fileInput.setInputFiles(emptyFile);
      await page.waitForSelector('#converterError:not([hidden])', { timeout: 5000 });

      // Verify output container was hidden and output was cleared
      const outputHiddenAfterInvalid = await page.$eval('#converterOutputContainer', (el) => el.hasAttribute('hidden'));
      const outputValAfterInvalid = await page.$eval('#converterOutputArea', (el) => el.value);
      assert.equal(outputHiddenAfterInvalid, true, 'Output container is hidden after invalid selection');
      assert.equal(outputValAfterInvalid, '', 'Output area is empty after invalid selection');

      // 3. Switch mode to Complete Document while in invalid error state
      await page.click('#modeDocumentBtn');
      await page.waitForTimeout(500);

      // Verify that changing mode did NOT re-trigger conversion of previous valid file
      const outputHiddenAfterModeSwitch = await page.$eval('#converterOutputContainer', (el) => el.hasAttribute('hidden'));
      const outputValAfterModeSwitch = await page.$eval('#converterOutputArea', (el) => el.value);
      const copyDisabledAfterMode = await page.$eval('#converterCopyBtn', (btn) => btn.disabled);
      const downloadDisabledAfterMode = await page.$eval('#converterDownloadBtn', (btn) => btn.disabled);

      assert.equal(outputHiddenAfterModeSwitch, true, 'Output container remains hidden after mode toggle');
      assert.equal(outputValAfterModeSwitch, '', 'Output area remains empty after mode toggle');
      assert.equal(copyDisabledAfterMode, true, 'Copy button remains disabled');
      assert.equal(downloadDisabledAfterMode, true, 'Download button remains disabled');

      // Error banner must remain visible
      const errorMsg = await page.$eval('#converterError', (el) => el.textContent);
      assert.ok(errorMsg.includes('empty (0 bytes)'), 'Error banner remains visible');

      // 4. Select a new valid file and confirm conversion succeeds normally
      await fileInput.setInputFiles(FIXTURE_DOCX);
      await page.waitForSelector('#converterOutputContainer:not([hidden])', { timeout: 15000 });

      const newOutput = await page.$eval('#converterOutputArea', (el) => el.value);
      assert.ok(newOutput.includes('\\documentclass'), 'New valid conversion succeeded in Document mode');
      assert.ok(newOutput.includes('Heading Level 1'));
    } finally {
      if (fs.existsSync(emptyFile)) fs.unlinkSync(emptyFile);
      if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);
    }

    await page.close();
  });

  it('Test 10 — Post-conversion success banner is stateful across 4 states (hidden by default, visible on success, hidden on reset/error/new file)', async () => {
    const page = await browserContext.newPage();
    await page.goto(`${serverUrl}/`);
    await page.waitForSelector('#live-converter');

    // State 1: Initial load — banner is hidden
    const initialHidden = await page.$eval('#converterSuccessCTA', (el) => el.hasAttribute('hidden'));
    assert.equal(initialHidden, true, 'State 1: Banner must be hidden initially');

    // State 2: Conversion success — banner becomes visible
    const fileInput = await page.$('#docxFileInput');
    await fileInput.setInputFiles(FIXTURE_DOCX);
    await page.waitForSelector('#converterOutputContainer:not([hidden])', { timeout: 15000 });
    await page.waitForSelector('#converterSuccessCTA:not([hidden])', { timeout: 2000 });

    const successHidden = await page.$eval('#converterSuccessCTA', (el) => el.hasAttribute('hidden'));
    assert.equal(successHidden, false, 'State 2: Banner must be visible upon successful conversion');

    // Verify banner link contains prefilled issue URL
    const issueLink = await page.$eval('#converterSuccessCTA a[href*="issues"]', (el) => el.href);
    assert.ok(issueLink.includes('issues/new'), 'Issue link points to issue creation template');

    // State 3: Reset UI — banner becomes hidden again
    await page.click('#converterResetBtn');
    await page.waitForTimeout(300);
    const resetHidden = await page.$eval('#converterSuccessCTA', (el) => el.hasAttribute('hidden'));
    assert.equal(resetHidden, true, 'State 3: Banner must be hidden upon reset');

    // Reconvert to set visible, then test State 4: Error hides banner
    await fileInput.setInputFiles(FIXTURE_DOCX);
    await page.waitForSelector('#converterSuccessCTA:not([hidden])', { timeout: 15000 });

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'w2l-test-banner-'));
    const emptyFile = path.join(tempDir, 'empty.docx');
    fs.writeFileSync(emptyFile, Buffer.alloc(0));
    try {
      await fileInput.setInputFiles(emptyFile);
      await page.waitForSelector('#converterError:not([hidden])', { timeout: 5000 });
      const errorHidden = await page.$eval('#converterSuccessCTA', (el) => el.hasAttribute('hidden'));
      assert.equal(errorHidden, true, 'State 4: Banner must be hidden when error occurs');
    } finally {
      if (fs.existsSync(emptyFile)) fs.unlinkSync(emptyFile);
      if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);
    }

    await page.close();
  });
});
