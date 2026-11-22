/**
 * pandocCore.ts — Core conversion logic and type contracts.
 * Framework-agnostic and free of direct package exports/DOM dependencies.
 */

export interface PandocInstance {
  convert: (
    options: Record<string, unknown>,
    stdin: string | null,
    files: Record<string, Blob | string>
  ) => Promise<{
    stdout: string;
    stderr: string;
    warnings: unknown[];
    files: Record<string, Blob>;
    mediaFiles: Record<string, Blob>;
  }>;
  query: (options: Record<string, unknown>) => Promise<unknown>;
  pandoc: (args_str: string, inData: unknown, resources: unknown[]) => Promise<unknown>;
}

import {
  preprocessDocx,
  type DocxPreprocessOptions,
  type DocxPreprocessMetadata,
} from './docxPreprocess.ts';

export type { DocxPreprocessOptions, DocxPreprocessMetadata };

export let lastDocxPreprocessMetadata: DocxPreprocessMetadata | null = null;

export type ConvertInput =
  | { format: 'docx'; bytes: ArrayBuffer; filename?: string; options?: DocxPreprocessOptions }
  | { format: 'html' | 'markdown'; text: string };

export interface PandocConvertResult {
  stdout: string;
  mediaFiles: Record<string, Uint8Array>;
}

/**
 * Executes conversion given an initialized pandoc instance.
 */
export async function runPandocConvert(
  pandoc: Pick<PandocInstance, 'convert'>,
  input: ConvertInput
): Promise<PandocConvertResult> {
  let result;

  if (input.format === 'docx') {
    const filename = input.filename || `input_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.docx`;
    const arrayBuffer = input.bytes instanceof ArrayBuffer
      ? input.bytes
      : (input.bytes as any).buffer
        ? (input.bytes as any).buffer.slice(
            (input.bytes as any).byteOffset || 0,
            ((input.bytes as any).byteOffset || 0) + ((input.bytes as any).byteLength || 0)
          )
        : input.bytes;

    const preprocessed = preprocessDocx(arrayBuffer, input.options);
    lastDocxPreprocessMetadata = preprocessed.metadata;

    const blob = new Blob([preprocessed.bytes], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    result = await pandoc.convert(
      {
        from: 'docx',
        to: 'latex',
        wrap: 'none',
        'extract-media': '',
        'input-files': [filename],
      },
      null,
      { [filename]: blob }
    );
  } else {
    // format is 'html' or 'markdown'
    // Disable native_spans and native_divs to prevent Pandoc from generating
    // redundant \foreignlanguage wrappers and nested grouping braces for Word styling spans
    const fromFormat = input.format === 'html'
      ? 'html-native_spans-native_divs'
      : 'markdown-native_spans-native_divs';

    result = await pandoc.convert(
      {
        from: fromFormat,
        to: 'latex',
        wrap: 'none',
      },
      input.text,
      {}
    );
  }

  if (result.stderr) {
    console.warn('[pandoc-wasm stderr]', result.stderr);
  }

  // Check if conversion succeeded
  if (!result.stdout && result.stderr) {
    throw new Error(`Pandoc error: ${result.stderr}`);
  }

  let stdout = result.stdout;
  const mediaFiles: Record<string, Uint8Array> = {};
  if (result.mediaFiles) {
    for (const [rawKey, fileBlob] of Object.entries(result.mediaFiles)) {
      const cleanKey = validateMediaKey(rawKey);
      if (rawKey !== cleanKey && stdout && stdout.includes(rawKey)) {
        stdout = stdout.split(rawKey).join(cleanKey);
      }
      const buffer = await fileBlob.arrayBuffer();
      mediaFiles[cleanKey] = new Uint8Array(buffer);
    }
  }

  return {
    stdout,
    mediaFiles,
  };
}

/**
 * Validates and normalizes an embedded media path extracted from a document.
 * Ensures the entry is a safe relative path within the package.
 *
 * Rules:
 * - Reject non-string, empty, or whitespace-only paths.
 * - Reject drive-prefixed paths (e.g., C:image.png, D:\media\img.png).
 * - Reject absolute paths (starting with / or \).
 * - Validate actual path segments: reject directory traversal ('..') and empty or current-dir segments ('.').
 * - Preserve legitimate filenames containing multiple dots (e.g., diagram..png).
 * - Return the normalized path using forward slashes.
 */
export function validateMediaKey(rawKey: string): string {
  if (typeof rawKey !== 'string' || !rawKey.trim()) {
    throw new Error(`Invalid media entry path "${rawKey}": path cannot be empty.`);
  }

  // Reject drive-prefixed paths (e.g. C:, D:\, c:foo)
  if (/^[a-zA-Z]:/.test(rawKey)) {
    throw new Error(`Invalid media entry path "${rawKey}": drive-prefixed paths are not allowed.`);
  }

  // Reject absolute paths
  if (rawKey.startsWith('/') || rawKey.startsWith('\\')) {
    throw new Error(`Invalid media entry path "${rawKey}": absolute paths are not allowed.`);
  }

  const cleanKey = rawKey.replace(/\\/g, '/');
  const segments = cleanKey.split('/');

  for (const seg of segments) {
    if (seg === '..') {
      throw new Error(`Invalid media entry path "${rawKey}": directory traversal is not allowed.`);
    }
    if (seg === '.' || seg === '') {
      throw new Error(`Invalid media entry path "${rawKey}": invalid path segment "${seg}".`);
    }
  }

  return cleanKey;
}

/**
 * Derives a safe .tex entry filename for the packaged ZIP archive.
 *
 * Requirements:
 * - Kept at the ZIP root (no directory components, slashes, or traversal).
 * - Fall back to 'document.tex' if basename is empty, whitespace, or invalid.
 * - Disallow path traversal ('..') or navigation ('.').
 * - Prevent collisions with media entries (e.g. if media contains document.tex).
 */
export function getSafeTexEntryName(
  filename?: string,
  mediaFiles?: Record<string, unknown>
): string {
  // Extract basename only, stripping any directory structure
  const rawBase = (filename || '').split(/[/\\]/).pop() || '';
  // Strip extension
  let safeBase = rawBase.replace(/\.[^/.]+$/, '').trim();

  // Strip illegal filesystem / archive characters
  safeBase = safeBase.replace(/[/\\?%*:|"<>]/g, '_').trim();

  // Sensible fallback if empty, whitespace, or navigation dots
  if (!safeBase || safeBase === '.' || safeBase === '..') {
    safeBase = 'document';
  }

  // Prevent collision with media entries
  let texName = `${safeBase}.tex`;
  let counter = 1;
  while (mediaFiles && Object.prototype.hasOwnProperty.call(mediaFiles, texName)) {
    texName = `${safeBase}_${counter}.tex`;
    counter++;
  }

  return texName;
}

