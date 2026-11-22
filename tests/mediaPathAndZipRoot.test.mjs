import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  validateMediaKey,
  getSafeTexEntryName,
  runPandocConvert,
} from '../src/converter/pandocCore.ts';

describe('Media Path Validation and Safe ZIP .tex Entry Handling', () => {
  describe('validateMediaKey()', () => {
    it('preserves valid relative media paths', () => {
      assert.equal(validateMediaKey('media/image1.png'), 'media/image1.png');
      assert.equal(validateMediaKey('assets/images/photo.jpg'), 'assets/images/photo.jpg');
    });

    it('preserves legitimate filenames with multiple dots such as diagram..png', () => {
      assert.equal(validateMediaKey('diagram..png'), 'diagram..png');
      assert.equal(validateMediaKey('media/diagram..png'), 'media/diagram..png');
      assert.equal(validateMediaKey('media/figure...final..png'), 'media/figure...final..png');
    });

    it('normalizes Windows backslashes to forward slashes', () => {
      assert.equal(validateMediaKey('media\\image1.png'), 'media/image1.png');
      assert.equal(validateMediaKey('sub\\folder\\diagram..png'), 'sub/folder/diagram..png');
    });

    it('rejects directory traversal attempts with explicit conversion error', () => {
      assert.throws(
        () => validateMediaKey('../secret.png'),
        /Invalid media entry path.*directory traversal/i
      );
      assert.throws(
        () => validateMediaKey('media/../../secret.png'),
        /Invalid media entry path.*directory traversal/i
      );
      assert.throws(
        () => validateMediaKey('media/..'),
        /Invalid media entry path.*directory traversal/i
      );
    });

    it('rejects absolute paths with explicit conversion error', () => {
      assert.throws(
        () => validateMediaKey('/etc/passwd'),
        /Invalid media entry path.*absolute paths/i
      );
      assert.throws(
        () => validateMediaKey('/media/image1.png'),
        /Invalid media entry path.*absolute paths/i
      );
      assert.throws(
        () => validateMediaKey('\\Windows\\System32\\calc.exe'),
        /Invalid media entry path.*absolute paths/i
      );
    });

    it('rejects drive-prefixed paths with explicit conversion error', () => {
      assert.throws(
        () => validateMediaKey('C:\\media\\image1.png'),
        /Invalid media entry path.*drive-prefixed/i
      );
      assert.throws(
        () => validateMediaKey('C:/media/image1.png'),
        /Invalid media entry path.*drive-prefixed/i
      );
      assert.throws(
        () => validateMediaKey('d:image1.png'),
        /Invalid media entry path.*drive-prefixed/i
      );
    });

    it('rejects empty paths or invalid segments', () => {
      assert.throws(() => validateMediaKey(''), /Invalid media entry path.*empty/i);
      assert.throws(() => validateMediaKey('   '), /Invalid media entry path.*empty/i);
      assert.throws(() => validateMediaKey('media//image.png'), /Invalid media entry path.*invalid path segment/i);
      assert.throws(() => validateMediaKey('./media/image.png'), /Invalid media entry path.*invalid path segment/i);
    });
  });

  describe('getSafeTexEntryName()', () => {
    it('derives a clean .tex filename from document name', () => {
      assert.equal(getSafeTexEntryName('my_paper.docx'), 'my_paper.tex');
      assert.equal(getSafeTexEntryName('Thesis-Draft.docx'), 'Thesis-Draft.tex');
    });

    it('keeps the .tex file at the ZIP root regardless of path in uploaded name', () => {
      assert.equal(getSafeTexEntryName('path/to/my_paper.docx'), 'my_paper.tex');
      assert.equal(getSafeTexEntryName('C:\\Users\\User\\Documents\\Thesis.docx'), 'Thesis.tex');
      assert.equal(getSafeTexEntryName('../../sneaky.docx'), 'sneaky.tex');
    });

    it('uses sensible fallback "document.tex" when basename is empty or invalid', () => {
      assert.equal(getSafeTexEntryName(''), 'document.tex');
      assert.equal(getSafeTexEntryName(undefined), 'document.tex');
      assert.equal(getSafeTexEntryName('.docx'), 'document.tex');
      assert.equal(getSafeTexEntryName('.'), 'document.tex');
      assert.equal(getSafeTexEntryName('..'), 'document.tex');
      assert.equal(getSafeTexEntryName('   .docx'), 'document.tex');
    });

    it('prevents collisions with media entries at ZIP root', () => {
      const mediaFiles = {
        'document.tex': new Uint8Array([1, 2, 3]),
      };
      assert.equal(getSafeTexEntryName('document.docx', mediaFiles), 'document_1.tex');

      const mediaFiles2 = {
        'paper.tex': new Uint8Array([1]),
        'paper_1.tex': new Uint8Array([2]),
      };
      assert.equal(getSafeTexEntryName('paper.docx', mediaFiles2), 'paper_2.tex');
    });

    it('does not trigger collision for media files in subdirectories', () => {
      const mediaFiles = {
        'media/document.tex': new Uint8Array([1, 2, 3]),
        'media/image1.png': new Uint8Array([4, 5, 6]),
      };
      assert.equal(getSafeTexEntryName('document.docx', mediaFiles), 'document.tex');
    });
  });

  describe('runPandocConvert() media validation integration', () => {
    it('surfaces explicit conversion error when pandoc outputs invalid media path', async () => {
      const mockPandoc = {
        convert: async () => ({
          stdout: '\\includegraphics{../traversal.png}',
          stderr: '',
          warnings: [],
          files: {},
          mediaFiles: {
            '../traversal.png': new Blob([new Uint8Array([1, 2, 3])]),
          },
        }),
      };

      await assert.rejects(
        async () => {
          await runPandocConvert(mockPandoc, { format: 'docx', bytes: new ArrayBuffer(0) });
        },
        /Invalid media entry path "\.\.\/traversal\.png": directory traversal is not allowed/
      );
    });

    it('preserves diagram..png and keeps mediaFiles entries', async () => {
      const mockPandoc = {
        convert: async () => ({
          stdout: '\\includegraphics{media/diagram..png}',
          stderr: '',
          warnings: [],
          files: {},
          mediaFiles: {
            'media/diagram..png': new Blob([new Uint8Array([10, 20, 30])]),
          },
        }),
      };

      const result = await runPandocConvert(mockPandoc, { format: 'docx', bytes: new ArrayBuffer(0) });
      assert.equal(result.stdout, '\\includegraphics{media/diagram..png}');
      assert.ok('media/diagram..png' in result.mediaFiles);
      assert.deepEqual(Array.from(result.mediaFiles['media/diagram..png']), [10, 20, 30]);
    });

    it('keeps LaTeX references consistent with normalized ZIP entry paths', async () => {
      const mockPandoc = {
        convert: async () => ({
          stdout: '\\includegraphics{media\\diagram..png}',
          stderr: '',
          warnings: [],
          files: {},
          mediaFiles: {
            'media\\diagram..png': new Blob([new Uint8Array([40, 50])]),
          },
        }),
      };

      const result = await runPandocConvert(mockPandoc, { format: 'docx', bytes: new ArrayBuffer(0) });
      // LaTeX reference should be normalized to match ZIP entry key
      assert.equal(result.stdout, '\\includegraphics{media/diagram..png}');
      assert.ok('media/diagram..png' in result.mediaFiles);
    });
  });
});
