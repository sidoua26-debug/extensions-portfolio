/**
 * src/converter/ui.ts
 *
 * Browser UI controller for the Live Word-to-LaTeX Converter in the extensions portfolio.
 *
 * Responsibilities:
 * 1. Lazily instantiates and reuses a singleton ConverterClient without pre-fetching WASM on load.
 * 2. Implements a monotonically increasing generation token to discard stale results and progress events
 *    if the user chooses a replacement file while conversion is in progress.
 * 3. Manages drag-and-drop, accessible file picking, and input validation (.docx, empty files).
 * 4. Renders live status/progress stages directly from actual worker progress events.
 * 5. Provides accessible copy and download actions for clean LaTeX output.
 * 6. Handles mode selection (fragment vs. document).
 */

import { ConverterClient, OutputMode, ProgressEvent, ConversionResult } from './client.ts';

export interface ConverterUIElements {
  container: HTMLElement;
  dropZone: HTMLElement;
  fileInput: HTMLInputElement;
  fileNameDisplay: HTMLElement;
  modeFragmentBtn: HTMLButtonElement;
  modeDocumentBtn: HTMLButtonElement;
  statusContainer: HTMLElement;
  statusStage: HTMLElement;
  statusMessage: HTMLElement;
  errorAlert: HTMLElement;
  outputContainer: HTMLElement;
  outputArea: HTMLTextAreaElement;
  copyBtn: HTMLButtonElement;
  downloadBtn: HTMLButtonElement;
  resetBtn: HTMLButtonElement;
}

export class ConverterUI {
  private client: ConverterClient | null = null;
  private currentMode: OutputMode = 'fragment';
  private activeGeneration = 0;
  private currentResult: ConversionResult | null = null;
  private currentFile: File | null = null;
  private objectUrl: string | null = null;

  constructor(private readonly elements: ConverterUIElements) {
    this.bindEvents();
    this.updateModeUI();
    this.resetUI();
  }

  /**
   * Lazily gets or initializes the single ConverterClient instance.
   * Path resolution uses import.meta.url so it automatically adapts to
   * domain roots ('/') and subpath deployments ('/extensions-portfolio/').
   */
  private getClient(): ConverterClient {
    if (!this.client) {
      const workerUrl = new URL('./converter.worker.js', import.meta.url).href;
      const wasmUrl = new URL('../wasm/pandoc.wasm.gz', import.meta.url).href;
      this.client = new ConverterClient({ workerUrl, wasmUrl });
    }
    return this.client;
  }

  private bindEvents(): void {
    const { dropZone, fileInput, modeFragmentBtn, modeDocumentBtn, copyBtn, downloadBtn, resetBtn } = this.elements;

    // 1. File input change
    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files.length > 0) {
        this.handleFileSelected(fileInput.files[0]);
      }
    });

    // 2. Drag & Drop handling
    ['dragenter', 'dragover'].forEach((eventName) => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('drag-active');
      });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-active');
      });
    });

    dropZone.addEventListener('drop', (e: DragEvent) => {
      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length > 0) {
        this.handleFileSelected(dt.files[0]);
      }
    });

    // Click on dropzone opens native file picker
    dropZone.addEventListener('click', (e) => {
      if (e.target !== fileInput) {
        fileInput.click();
      }
    });

    // Keyboard trigger on dropzone (Enter or Space)
    dropZone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
      }
    });

    // 3. Mode Toggles
    modeFragmentBtn.addEventListener('click', () => this.setMode('fragment'));
    modeDocumentBtn.addEventListener('click', () => this.setMode('document'));

    // 4. Action buttons
    copyBtn.addEventListener('click', () => this.handleCopy());
    downloadBtn.addEventListener('click', () => this.handleDownload());
    resetBtn.addEventListener('click', () => this.resetUI());
  }

  private setMode(mode: OutputMode): void {
    if (this.currentMode === mode) return;
    this.currentMode = mode;
    this.updateModeUI();

    // If we have an existing file, reconvert with new mode
    if (this.currentFile) {
      this.convertSelectedFile(this.currentFile);
    }
  }

  private updateModeUI(): void {
    const isFragment = this.currentMode === 'fragment';
    this.elements.modeFragmentBtn.classList.toggle('active', isFragment);
    this.elements.modeFragmentBtn.setAttribute('aria-checked', String(isFragment));
    this.elements.modeDocumentBtn.classList.toggle('active', !isFragment);
    this.elements.modeDocumentBtn.setAttribute('aria-checked', String(!isFragment));
  }

  public handleFileSelected(file: File): void {
    // 1. Immediately advance generation token to invalidate any running conversions
    const generation = ++this.activeGeneration;

    // 2. Clear previous conversion state, output, and status immediately
    this.currentResult = null;
    this.currentFile = null;
    this.revokeObjectUrl();
    this.hideStatus();
    this.clearError();

    this.elements.outputArea.value = '';
    this.elements.outputContainer.setAttribute('hidden', '');
    this.elements.copyBtn.disabled = true;
    this.elements.downloadBtn.disabled = true;
    this.elements.fileNameDisplay.textContent = '';
    this.elements.fileNameDisplay.setAttribute('hidden', '');

    // 3. File validation: Empty file (0 bytes)
    if (!file || file.size === 0) {
      this.showError('Selected file is empty (0 bytes). Please choose a valid Word document.');
      this.elements.fileInput.value = '';
      return;
    }

    // 4. File validation: Filename extension check (.docx)
    const fileName = file.name || '';
    if (!fileName.toLowerCase().endsWith('.docx')) {
      this.showError(`Unsupported file format "${fileName}". Only .docx Word documents are supported.`);
      this.elements.fileInput.value = '';
      return;
    }

    this.currentFile = file;
    this.elements.fileNameDisplay.textContent = `${file.name} (${this.formatFileSize(file.size)})`;
    this.elements.fileNameDisplay.removeAttribute('hidden');

    this.convertSelectedFile(file, generation);
  }

  private async convertSelectedFile(file: File, generation = ++this.activeGeneration): Promise<void> {
    // Invalidate previous output immediately to eliminate stale results
    this.currentResult = null;
    this.elements.outputArea.value = '';
    this.elements.outputContainer.setAttribute('hidden', '');
    this.elements.copyBtn.disabled = true;
    this.elements.downloadBtn.disabled = true;

    // Show status indicator
    this.elements.statusContainer.removeAttribute('hidden');
    this.updateStatus('reading', `Reading ${file.name}...`);
    this.clearError();

    let arrayBuffer: ArrayBuffer;
    try {
      arrayBuffer = await file.arrayBuffer();
    } catch (err: any) {
      if (generation !== this.activeGeneration) return;
      this.hideStatus();
      this.showError(`Failed to read file: ${err?.message || String(err)}`);
      return;
    }

    if (generation !== this.activeGeneration) return;

    const client = this.getClient();

    try {
      const result = await client.convertDocument(
        {
          format: 'docx',
          content: arrayBuffer,
          filename: file.name,
          options: {
            mode: this.currentMode,
          },
        },
        (progress: ProgressEvent) => {
          if (generation === this.activeGeneration) {
            this.handleProgress(progress);
          }
        }
      );

      if (generation !== this.activeGeneration) return;

      this.currentResult = result;
      this.hideStatus();

      this.elements.outputArea.value = result.cleanLatex;
      this.elements.outputContainer.removeAttribute('hidden');
      this.elements.copyBtn.disabled = false;
      this.elements.downloadBtn.disabled = false;

      this.elements.outputArea.focus({ preventScroll: true });
    } catch (err: any) {
      if (generation !== this.activeGeneration) return;
      this.hideStatus();
      const message = err?.message || 'Conversion failed with an unspecified error.';
      this.showError(message);
    }
  }

  private handleProgress(progress: ProgressEvent): void {
    const stageNames: Record<string, string> = {
      downloading: 'Downloading Pandoc WASM (15.2 MB)...',
      decompressing: 'Decompressing WebAssembly Engine...',
      compiling: 'Compiling WebAssembly Runtime...',
      ready: 'Engine Ready',
      converting: 'Converting Document...',
      cleaning: 'Cleaning LaTeX Output...',
    };

    const stageLabel = stageNames[progress.stage] || progress.stage;
    this.updateStatus(progress.stage, progress.message ? `${stageLabel} — ${progress.message}` : stageLabel);
  }

  private updateStatus(stage: string, message: string): void {
    this.elements.statusStage.textContent = stage;
    this.elements.statusMessage.textContent = message;
  }

  private hideStatus(): void {
    this.elements.statusContainer.setAttribute('hidden', '');
  }

  private showError(message: string): void {
    this.elements.errorAlert.textContent = message;
    this.elements.errorAlert.removeAttribute('hidden');
  }

  private clearError(): void {
    this.elements.errorAlert.textContent = '';
    this.elements.errorAlert.setAttribute('hidden', '');
  }

  public resetUI(): void {
    this.activeGeneration++;
    this.currentResult = null;
    this.currentFile = null;
    this.revokeObjectUrl();

    this.elements.fileInput.value = '';
    this.elements.fileNameDisplay.textContent = '';
    this.elements.fileNameDisplay.setAttribute('hidden', '');
    this.elements.outputArea.value = '';
    this.elements.outputContainer.setAttribute('hidden', '');
    this.elements.copyBtn.disabled = true;
    this.elements.downloadBtn.disabled = true;
    this.hideStatus();
    this.clearError();
  }

  private async handleCopy(): Promise<void> {
    if (!this.currentResult || !this.currentResult.cleanLatex) return;

    const copyBtn = this.elements.copyBtn;
    const originalText = copyBtn.textContent;

    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(this.currentResult.cleanLatex);
      } else {
        this.elements.outputArea.select();
        document.execCommand('copy');
      }

      copyBtn.textContent = '✓ Copied!';
      copyBtn.classList.add('btn-success');
      setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.classList.remove('btn-success');
      }, 2000);
    } catch (err: any) {
      this.showError('Unable to copy to clipboard automatically. Please select text manually.');
    }
  }

  private handleDownload(): void {
    if (!this.currentResult || !this.currentResult.cleanLatex) return;

    this.revokeObjectUrl();

    const baseName = this.currentFile?.name ? this.currentFile.name.replace(/\.[^/.]+$/, '') : 'document';
    const downloadFilename = `${baseName}.tex`;

    const blob = new Blob([this.currentResult.cleanLatex], { type: 'text/x-tex;charset=utf-8' });
    this.objectUrl = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = this.objectUrl;
    a.download = downloadFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => this.revokeObjectUrl(), 10000);
  }

  private revokeObjectUrl(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

export function initConverterUI(): ConverterUI | null {
  const container = document.getElementById('live-converter');
  const dropZone = document.getElementById('converterDropZone');
  const fileInput = document.getElementById('docxFileInput') as HTMLInputElement;
  const fileNameDisplay = document.getElementById('converterFileName');
  const modeFragmentBtn = document.getElementById('modeFragmentBtn') as HTMLButtonElement;
  const modeDocumentBtn = document.getElementById('modeDocumentBtn') as HTMLButtonElement;
  const statusContainer = document.getElementById('converterStatus');
  const statusStage = document.getElementById('converterStatusStage');
  const statusMessage = document.getElementById('converterStatusMessage');
  const errorAlert = document.getElementById('converterError');
  const outputContainer = document.getElementById('converterOutputContainer');
  const outputArea = document.getElementById('converterOutputArea') as HTMLTextAreaElement;
  const copyBtn = document.getElementById('converterCopyBtn') as HTMLButtonElement;
  const downloadBtn = document.getElementById('converterDownloadBtn') as HTMLButtonElement;
  const resetBtn = document.getElementById('converterResetBtn') as HTMLButtonElement;

  if (
    !container ||
    !dropZone ||
    !fileInput ||
    !fileNameDisplay ||
    !modeFragmentBtn ||
    !modeDocumentBtn ||
    !statusContainer ||
    !statusStage ||
    !statusMessage ||
    !errorAlert ||
    !outputContainer ||
    !outputArea ||
    !copyBtn ||
    !downloadBtn ||
    !resetBtn
  ) {
    return null;
  }

  return new ConverterUI({
    container,
    dropZone,
    fileInput,
    fileNameDisplay,
    modeFragmentBtn,
    modeDocumentBtn,
    statusContainer,
    statusStage,
    statusMessage,
    errorAlert,
    outputContainer,
    outputArea,
    copyBtn,
    downloadBtn,
    resetBtn,
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initConverterUI());
  } else {
    initConverterUI();
  }
}
