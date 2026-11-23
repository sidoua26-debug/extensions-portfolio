---
id: proof-converter-image-zip-delivery
category: boundaries
date: 2026-11-22
commit: 464a9b8be8f27c42fc4f7ad8302d6fa170b5322b
status: production-verified
topics: [word-to-latex, wasm, images, packaging, zip]
evidence_source: tests/fixtures/document_with_image.docx
execution_receipt: seo/kb/evidence/proof-converter-image-zip-delivery.txt
verifier_script: scripts/verify_converter_image_delivery.mjs
verification_command: TARGET_URL=https://extensionguy.me node scripts/verify_converter_image_delivery.mjs
---

# In-Browser Word-to-LaTeX Embedded Image ZIP Packaging

## Verified Mechanics

1. **Extraction in Web Worker**:
   - `src/converter/pandocCore.ts` configures `pandoc-wasm` with `'extract-media': ''`.
   - Media entries are extracted into in-memory buffers in the Web Worker (`assets/js/converter.worker.js`).
   - Media paths are validated segment-by-segment: path traversal (`..`), empty/relative paths (`.`), absolute paths (`/`, `\`), and drive-prefixed paths (`C:`) are rejected with explicit conversion errors; legitimate filenames with multi-dots (such as `diagram..png`) are preserved.
   - LaTeX `\includegraphics` references remain strictly synchronized with normalized ZIP entry paths.

2. **ZIP Packaging**:
   - `fflate` packages the root `.tex` file and `media/` folder into an uncompressed or deflated ZIP archive in worker memory.
   - The `.tex` file entry is derived safely at the root level via `getSafeTexEntryName()`, preventing collisions with media keys and falling back to `document.tex` when needed.
   - The website converter UI dynamically detects when `mediaEntries` exist:
     - When images are present: the download button updates to `Download .zip` and suggests `<document_name>.zip`.
     - When no images are present (text-only): the download button renders `Download .tex` and suggests `<document_name>.tex`.
     - Switching between image-bearing and text-only documents in the same session dynamically restores `.tex` download without stale image artifacts.

3. **Measured Evidence (Live Production on `https://extensionguy.me`)**:
   - **Tested URL**: `https://extensionguy.me/word-to-latex-converter/`
   - **Tested Commit**: `464a9b8be8f27c42fc4f7ad8302d6fa170b5322b`
   - **Test Date**: `2026-11-22`
   - **Output Mode Scope**: The verifier used the default UI output mode. The run did not record the selected mode or separately exercise both output modes.
   - **Fixture Scope**:
     - Image fixture: `tests/fixtures/document_with_image.docx`
     - Text-only fixture: `tests/fixtures/headings_bold_italic.docx`
   - **Automated Verifier**: `scripts/verify_converter_image_delivery.mjs`
   - **Execution Receipt**: `seo/kb/evidence/proof-converter-image-zip-delivery.txt`
   - **Downloaded Archive**: `document_with_image.zip` (2,546 bytes).
   - **Archive Contents**:
     - `document_with_image.tex` at root.
     - `media/image1.png` matching `\includegraphics[width=3in,height=1.5in]{media/image1.png}` in the `.tex` file.
   - **Extracted Image Properties**:
     - Size: exactly 1,853 bytes.
     - SHA-256 Checksum: `d629e573597835e57202aab346c9db69829b2a9723e116b15c24b68c9ec50de7` (exact match to input fixture).
   - **Session Reversion**: Switching to `tests/fixtures/headings_bold_italic.docx` in the same session downloaded `headings_bold_italic.tex` with zero image references and zero media entries.

## Known Limitations & Boundaries

1. **LaTeX Compilation Remains Unverified**:
   - The converter generates clean LaTeX source code; it does not compile LaTeX into PDF.
   - PDF compilation depends on the user's local TeX engine or Overleaf environment. Manual preamble adjustments (such as adding `\usepackage{graphicx}` or template adjustments) may be required.
   - Compilation is not guaranteed.

2. **Clipboard Copy Scope**:
   - The converter's "Copy LaTeX" button copies generated LaTeX markup text only to the clipboard and does not copy binary images. Extracted images are delivered via the downloaded ZIP archive.

3. **Privacy & Offline Claims Status**:
   - Client-side execution in Web Worker memory is verified.
   - Automated zero-egress network isolation during conversion is marked `[UNVERIFIED - pending dedicated Playwright egress network trace measurement]`.
