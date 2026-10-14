/**
 * Web Worker entry point for client-side Word-to-LaTeX conversion via Pandoc WebAssembly.
 * Runs completely isolated from the main thread, decompressing pandoc.wasm.gz on demand
 * and executing conversions without blocking the UI.
 *
 * NOTE: Initial engine load requires fetching the compressed WASM binary (~15.2 MB) once.
 * Subsequent conversions operate entirely inside memory on the local machine.
 */

// @ts-ignore
import { createPandocInstance } from 'pandoc-wasm/src/core.js';
import {
  runPandocConvert,
  PandocInstance,
  ConvertInput,
  lastDocxPreprocessMetadata,
} from './pandocCore.ts';
import {
  cleanupLatex,
  wrapCompleteDocument,
} from './cleanup.ts';

let pandocInstancePromise: Promise<PandocInstance> | null = null;
let conversionQueue: Promise<void> = Promise.resolve();

export interface InitMessage {
  id: string;
  type: 'init';
  wasmUrl?: string;
}

export interface ConvertMessage {
  id: string;
  type: 'convert';
  format: 'html' | 'markdown' | 'docx';
  content: string | ArrayBuffer;
  filename?: string;
  options?: {
    mode?: 'fragment' | 'document';
    approximatePageBreaks?: boolean;
    wasmUrl?: string;
  };
}

export type WorkerInMessage = InitMessage | ConvertMessage;

/**
 * Resolves default WASM binary URL relative to this worker script's deployed location.
 * When served at https://example.com/subpath/assets/js/converter.worker.js,
 * this resolves to https://example.com/subpath/assets/wasm/pandoc.wasm.gz, ensuring
 * seamless portability under subpath deployments (e.g. GitHub Pages or Cloudflare subpaths).
 */
function getDefaultWasmUrl(): string {
  try {
    if (typeof self !== 'undefined' && self.location && self.location.href) {
      return new URL('../wasm/pandoc.wasm.gz', self.location.href).href;
    }
  } catch {
    // Fallback if self.location is not a valid URL
  }
  return 'assets/wasm/pandoc.wasm.gz';
}

async function getPandocInstance(customWasmUrl?: string): Promise<PandocInstance> {
  const wasmUrl = customWasmUrl || getDefaultWasmUrl();

  if (!pandocInstancePromise) {
    pandocInstancePromise = (async () => {
      try {
        postMessage({ type: 'progress', stage: 'downloading', message: 'Fetching Pandoc WASM engine...' });

        const response = await fetch(wasmUrl);
        if (!response.ok) {
          throw new Error(`Failed to load WASM binary from ${wasmUrl}: HTTP ${response.status} ${response.statusText}`);
        }

        let wasmBuffer: ArrayBuffer;
        // If the URL ends with .gz or response indicates gzip, decompress using native DecompressionStream
        const isGzip = wasmUrl.endsWith('.gz') || response.headers.get('content-type') === 'application/gzip';
        if (isGzip) {
          postMessage({ type: 'progress', stage: 'decompressing', message: 'Decompressing WebAssembly engine...' });
          if (typeof DecompressionStream === 'undefined') {
            throw new Error('DecompressionStream is not supported in this browser. Please use a modern browser.');
          }
          const ds = new DecompressionStream('gzip');
          const decompressedStream = response.body!.pipeThrough(ds);
          wasmBuffer = await new Response(decompressedStream).arrayBuffer();
        } else {
          wasmBuffer = await response.arrayBuffer();
        }

        postMessage({ type: 'progress', stage: 'compiling', message: 'Instantiating WebAssembly runtime...' });
        const instance = await createPandocInstance(wasmBuffer);
        postMessage({ type: 'progress', stage: 'ready', message: 'Pandoc WebAssembly engine ready' });
        return instance as PandocInstance;
      } catch (err) {
        pandocInstancePromise = null; // Allow retry on failure
        throw err;
      }
    })();
  }
  return pandocInstancePromise;
}

self.onmessage = (event: MessageEvent<WorkerInMessage>) => {
  const data = event.data;
  if (!data || !data.type) return;

  const id = data.id || 'anonymous';

  if (data.type === 'init') {
    getPandocInstance(data.wasmUrl)
      .then(() => {
        postMessage({ id, type: 'init-ready', success: true });
      })
      .catch((err: any) => {
        postMessage({ id, type: 'init-ready', success: false, error: err?.message || String(err) });
      });
    return;
  }

  if (data.type === 'convert') {
    // Validate inputs immediately
    if (!data.format || !['docx', 'html', 'markdown'].includes(data.format)) {
      postMessage({
        id,
        type: 'result',
        success: false,
        error: `Unsupported conversion format: "${data.format}". Supported formats: docx, html, markdown.`,
      });
      return;
    }

    if (data.content === null || data.content === undefined) {
      postMessage({
        id,
        type: 'result',
        success: false,
        error: 'Conversion input content cannot be null or undefined.',
      });
      return;
    }

    // Queue conversions sequentially to guarantee memory safety in the WASI instance
    conversionQueue = conversionQueue
      .then(async () => {
        try {
          const pandoc = await getPandocInstance(data.options?.wasmUrl);

          postMessage({ id, type: 'progress', stage: 'converting', message: 'Running Pandoc conversion...' });

          let convertInput: ConvertInput;
          if (data.format === 'docx') {
            const bytes = data.content instanceof ArrayBuffer ? data.content : (data.content as any).buffer;
            if (!bytes || !(bytes instanceof ArrayBuffer)) {
              throw new Error('Invalid DOCX data: content must be an ArrayBuffer or ArrayBufferView.');
            }
            convertInput = {
              format: 'docx',
              bytes,
              filename: data.filename || 'document.docx',
              options: {
                approximatePageBreaks: data.options?.approximatePageBreaks,
              },
            };
          } else {
            convertInput = {
              format: data.format,
              text: typeof data.content === 'string' ? data.content : new TextDecoder().decode(data.content),
            };
          }

          const rawLatex = await runPandocConvert(pandoc, convertInput);

          postMessage({ id, type: 'progress', stage: 'cleaning', message: 'Applying LaTeX quality pipeline...' });
          const cleanLatex = cleanupLatex(rawLatex);

          const mode = data.options?.mode || 'fragment';
          const geometry = lastDocxPreprocessMetadata?.geometry;
          const finalLatex = mode === 'document' ? wrapCompleteDocument(cleanLatex, { geometry }) : cleanLatex;

          postMessage({
            id,
            type: 'result',
            success: true,
            rawLatex,
            cleanLatex: finalLatex,
            metadata: {
              mode,
              hasGeometry: Boolean(geometry),
              docxMetadata: lastDocxPreprocessMetadata,
            },
          });
        } catch (err: any) {
          postMessage({
            id,
            type: 'result',
            success: false,
            error: err?.message || String(err),
          });
        }
      })
      .catch((err: any) => {
        postMessage({
          id,
          type: 'result',
          success: false,
          error: `Queue processing error: ${err?.message || String(err)}`,
        });
      });
  }
};
