/**
 * src/converter/client.ts
 *
 * Client-side controller for the Word-to-LaTeX Pandoc Web Worker.
 *
 * Responsibilities:
 * 1. Lazily instantiates and reuses a single Web Worker per controller instance.
 * 2. Correlates concurrent or sequential requests using unique IDs.
 * 3. Routes progress events to the active request and pre-warm listeners.
 * 4. Validates inputs before dispatching to the worker.
 * 5. Handles worker errors, init failures, and termination without leaving dangling promises.
 * 6. Preserves the worker's sequential queueing guarantees.
 */

export type ConversionFormat = 'docx' | 'html' | 'markdown';
export type OutputMode = 'fragment' | 'document';

export interface ConvertOptions {
  mode?: OutputMode;
  approximatePageBreaks?: boolean;
  wasmUrl?: string;
}

export type ProgressStage =
  | 'downloading'
  | 'decompressing'
  | 'compiling'
  | 'ready'
  | 'converting'
  | 'cleaning';

export interface ProgressEvent {
  stage: ProgressStage;
  message: string;
}

export type ProgressCallback = (event: ProgressEvent) => void;

export interface ConversionMetadata {
  mode: OutputMode;
  hasGeometry: boolean;
  docxMetadata?: unknown;
}

export interface ConversionResult {
  id: string;
  success: boolean;
  cleanLatex: string;
  rawLatex?: string;
  error?: string;
  metadata?: ConversionMetadata;
}

export interface ConvertInput {
  format: ConversionFormat;
  content: ArrayBuffer | Uint8Array | string;
  filename?: string;
  options?: ConvertOptions;
}

export interface ClientConfig {
  workerUrl?: string;
  wasmUrl?: string;
  workerFactory?: (url: string) => Worker;
}

interface PendingRequest {
  id: string;
  resolve: (result: ConversionResult) => void;
  reject: (error: Error) => void;
  onProgress?: ProgressCallback;
}

export class ConverterClient {
  private worker: Worker | null = null;
  private readonly workerUrl: string;
  private readonly defaultWasmUrl?: string;
  private readonly workerFactory?: (url: string) => Worker;
  private initPromise: Promise<void> | null = null;
  private initReject: ((error: Error) => void) | null = null;
  private initWorker: Worker | null = null;
  private initHandler: ((e: MessageEvent) => void) | null = null;
  private isInitialized = false;
  private readonly pendingRequests = new Map<string, PendingRequest>();
  private readonly prewarmCallbacks = new Set<ProgressCallback>();
  private requestCounter = 0;

  constructor(config: ClientConfig = {}) {
    this.workerUrl = config.workerUrl || '/assets/js/converter.worker.js';
    this.defaultWasmUrl = config.wasmUrl;
    this.workerFactory = config.workerFactory;
  }

  /**
   * Lazily spawns or returns the active Worker singleton.
   */
  private getOrCreateWorker(): Worker {
    if (!this.worker) {
      if (this.workerFactory) {
        this.worker = this.workerFactory(this.workerUrl);
      } else if (typeof Worker !== 'undefined') {
        this.worker = new Worker(this.workerUrl);
      } else {
        throw new Error('Web Workers are not supported in this environment.');
      }
      this.worker.onmessage = this.handleMessage.bind(this);
      this.worker.onerror = this.handleWorkerError.bind(this);
    }
    return this.worker;
  }

  /**
   * Dispatches an explicit init message to move engine download and compilation
   * earlier in the user lifecycle.
   *
   * Note: Pre-warming does not make the conversion engine instant; it transfers the
   * ~1-second decompression and compilation overhead to an idle period.
   */
  public prewarm(onProgress?: ProgressCallback, customWasmUrl?: string): Promise<void> {
    if (onProgress) {
      this.prewarmCallbacks.add(onProgress);
    }

    if (this.isInitialized) {
      if (onProgress) {
        onProgress({ stage: 'ready', message: 'Engine already initialized' });
        this.prewarmCallbacks.delete(onProgress);
      }
      return Promise.resolve();
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise<void>((resolve, reject) => {
      let worker: Worker;
      try {
        worker = this.getOrCreateWorker();
      } catch (err: any) {
        this.initPromise = null;
        this.prewarmCallbacks.clear();
        reject(err instanceof Error ? err : new Error(String(err)));
        return;
      }

      const initId = `init_${++this.requestCounter}`;

      const cleanupInit = () => {
        if (this.initHandler && worker) {
          try {
            worker.removeEventListener('message', this.initHandler);
          } catch {
            // Ignore
          }
        }
        this.initHandler = null;
        this.initReject = null;
        this.initWorker = null;
      };

      const initHandler = (e: MessageEvent) => {
        if (!e.data || typeof e.data !== 'object') return;
        if (e.data.type === 'init-ready' && e.data.id === initId) {
          cleanupInit();
          if (e.data.success) {
            this.isInitialized = true;
            this.prewarmCallbacks.clear();
            resolve();
          } else {
            this.initPromise = null; // allow subsequent retry
            this.isInitialized = false;
            const error = new Error(e.data.error || 'Engine initialization failed');
            this.prewarmCallbacks.clear();
            // Also reject any queued conversions waiting for init
            this.rejectAllPending(error);
            reject(error);
          }
        }
      };

      this.initHandler = initHandler;
      this.initReject = reject;
      this.initWorker = worker;

      worker.addEventListener('message', initHandler);

      worker.postMessage({
        id: initId,
        type: 'init',
        wasmUrl: customWasmUrl || this.defaultWasmUrl,
      });
    });

    return this.initPromise;
  }

  /**
   * Validates inputs, dispatches the conversion request to the worker, and returns
   * a Promise that resolves when conversion and LaTeX cleanup complete.
   */
  public convertDocument(
    input: ConvertInput,
    onProgress?: ProgressCallback
  ): Promise<ConversionResult> {
    // 1. Strict input validation before touching the worker
    if (!input || typeof input !== 'object') {
      return Promise.reject(new TypeError('Conversion input must be a valid object.'));
    }

    if (!input.format || !['docx', 'html', 'markdown'].includes(input.format)) {
      return Promise.reject(
        new TypeError(
          `Invalid conversion format: "${input.format}". Supported formats are "docx", "html", "markdown".`
        )
      );
    }

    if (input.content === null || input.content === undefined) {
      return Promise.reject(new TypeError('Conversion content cannot be null or undefined.'));
    }

    let payloadContent: ArrayBuffer | string;
    let transferList: Transferable[] = [];

    if (input.format === 'docx') {
      if (input.content instanceof ArrayBuffer) {
        payloadContent = input.content;
      } else if (ArrayBuffer.isView(input.content)) {
        // Extract ArrayBuffer slice from TypedArray
        const view = input.content;
        payloadContent = view.buffer.slice(
          view.byteOffset,
          view.byteOffset + view.byteLength
        ) as ArrayBuffer;
      } else {
        return Promise.reject(
          new TypeError('DOCX conversion requires an ArrayBuffer or TypedArray/ArrayBufferView.')
        );
      }

      if (payloadContent.byteLength === 0) {
        return Promise.reject(new Error('DOCX document data is empty (0 bytes).'));
      }
      transferList = [payloadContent];
    } else {
      // html or markdown
      if (typeof input.content !== 'string') {
        return Promise.reject(
          new TypeError(`${input.format.toUpperCase()} conversion requires string content.`)
        );
      }
      payloadContent = input.content;
    }

    // 2. Dispatch to worker
    let worker: Worker;
    try {
      worker = this.getOrCreateWorker();
    } catch (err: any) {
      return Promise.reject(err instanceof Error ? err : new Error(String(err)));
    }

    const id = `req_${Date.now()}_${++this.requestCounter}`;

    return new Promise<ConversionResult>((resolve, reject) => {
      this.pendingRequests.set(id, {
        id,
        resolve,
        reject,
        onProgress,
      });

      const message = {
        id,
        type: 'convert',
        format: input.format,
        content: payloadContent,
        filename: input.filename || (input.format === 'docx' ? 'document.docx' : undefined),
        options: {
          mode: input.options?.mode || 'fragment',
          approximatePageBreaks: input.options?.approximatePageBreaks,
          wasmUrl: input.options?.wasmUrl || this.defaultWasmUrl,
        },
      };

      worker.postMessage(message, transferList);
    });
  }

  /**
   * Internal message router: correlates worker events with pending requests
   * and dispatches progress updates.
   */
  private handleMessage(event: MessageEvent): void {
    if (this.worker && event.target && event.target !== this.worker) {
      return; // Ignore messages from previous or stale worker instances
    }

    const data = event.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'progress') {
      const stage = data.stage as ProgressStage;
      const message = String(data.message || '');
      const progressEvt: ProgressEvent = { stage, message };

      if (data.id && this.pendingRequests.has(data.id)) {
        // Targeted request progress
        const req = this.pendingRequests.get(data.id)!;
        if (req.onProgress) {
          req.onProgress(progressEvt);
        }
      } else {
        // Global initialization progress (downloading, decompressing, compiling, ready)
        for (const cb of this.prewarmCallbacks) {
          cb(progressEvt);
        }
        // Also inform any active conversion requests awaiting engine initialization
        for (const req of this.pendingRequests.values()) {
          if (req.onProgress) {
            req.onProgress(progressEvt);
          }
        }
      }
      return;
    }

    if (data.type === 'result') {
      const id = data.id;
      const req = this.pendingRequests.get(id);
      if (!req) return; // Stale or unassociated response

      this.pendingRequests.delete(id);

      if (data.success) {
        this.isInitialized = true;
        req.resolve({
          id,
          success: true,
          cleanLatex: data.cleanLatex || '',
          rawLatex: data.rawLatex,
          metadata: data.metadata,
        });
      } else {
        req.reject(new Error(data.error || 'Conversion failed with unspecified error.'));
      }
      return;
    }

    if (data.type === 'init-ready') {
      if (data.success) {
        this.isInitialized = true;
      }
    }
  }

  /**
   * Catches unexpected worker crashes, network errors, or unhandled exceptions.
   */
  private handleWorkerError(event: ErrorEvent): void {
    const errorMsg = event.message || 'Worker thread encountered an unexpected error.';
    const error = new Error(`Converter Worker Error: ${errorMsg}`);

    // Settle active initialization promise if in flight
    if (this.initReject) {
      const reject = this.initReject;
      if (this.initWorker && this.initHandler) {
        try {
          this.initWorker.removeEventListener('message', this.initHandler);
        } catch {
          // Ignore
        }
      }
      this.initReject = null;
      this.initHandler = null;
      this.initWorker = null;
      reject(error);
    }

    // Reset init state so future requests can attempt to recreate a healthy worker
    this.initPromise = null;
    this.isInitialized = false;

    // Fail all pending conversion requests
    this.rejectAllPending(error);

    // Notify prewarm callbacks
    this.prewarmCallbacks.clear();

    // Terminate broken worker instance
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch {
        // Ignore termination error on broken worker
      }
      this.worker = null;
    }
  }

  private rejectAllPending(error: Error): void {
    const requests = Array.from(this.pendingRequests.values());
    this.pendingRequests.clear();
    for (const req of requests) {
      req.reject(error);
    }
  }

  /**
   * Explicitly shuts down the worker and frees resources.
   * Any pending conversions are rejected with a termination error.
   */
  public terminate(): void {
    const terminationError = new Error('ConverterClient was terminated by caller.');

    // Settle active initialization promise if in flight
    if (this.initReject) {
      const reject = this.initReject;
      if (this.initWorker && this.initHandler) {
        try {
          this.initWorker.removeEventListener('message', this.initHandler);
        } catch {
          // Ignore
        }
      }
      this.initReject = null;
      this.initHandler = null;
      this.initWorker = null;
      reject(terminationError);
    }

    this.rejectAllPending(terminationError);
    this.prewarmCallbacks.clear();
    this.initPromise = null;
    this.isInitialized = false;

    if (this.worker) {
      try {
        this.worker.terminate();
      } catch {
        // Ignore
      }
      this.worker = null;
    }
  }

  /**
   * Returns current client status for diagnostics.
   */
  public getStatus(): {
    hasWorker: boolean;
    isInitialized: boolean;
    pendingCount: number;
  } {
    return {
      hasWorker: this.worker !== null,
      isInitialized: this.isInitialized,
      pendingCount: this.pendingRequests.size,
    };
  }
}

// Default export singleton for standard application-wide usage
let defaultClient: ConverterClient | null = null;

export function getConverterClient(config?: ClientConfig): ConverterClient {
  if (!defaultClient) {
    defaultClient = new ConverterClient(config);
  }
  return defaultClient;
}
