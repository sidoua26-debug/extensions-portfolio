# Brand SSOT: ExtensionGuy (https://extensionguy.me)

Last updated: 2026-11-22  
Source repository: `sidoua26-debug/extensions-portfolio`

## Portfolio Overview

ExtensionGuy publishes browser extensions and browser-based client-side web tools.

### Maintained Browser Extensions
Derived from `store-versions.json`:

1. **Word to LaTeX (Offline)** (`/word-to-latex/`)
   - Microsoft Edge Add-ons: v1.0.7
   - Chrome Web Store: v1.0.7
   - Scope: Offline document & math conversion via bundled WebAssembly.
2. **Table Extractor** (`/table-extractor/`)
   - Microsoft Edge Add-ons: v1.0.1
   - Chrome Web Store: v1.0.1
   - Scope: HTML table detection and export to CSV/Excel.
3. **BulkGrab** (`/bulkgrab/`)
   - Microsoft Edge Add-ons: v1.0.0
   - Chrome Web Store: v1.0.3
   - Scope: Multi-tab and batch resource downloader.
4. **SEO Inspector** (`/seo-inspector/`)
   - Microsoft Edge Add-ons: v1.0.1
   - Chrome Web Store: Not listed
   - Scope: On-page SEO tag, JSON-LD schema, and heading inspector.
5. **Bilexi** (`/bilexi/`)
   - Microsoft Edge Add-ons: v0.5.1
   - Chrome Web Store: Not listed
   - Scope: Bilingual autocorrect for French accents on QWERTY keyboards.
6. **Tab Vault** (`/tab-vault/`)
   - Microsoft Edge Add-ons: v1.0.0
   - Chrome Web Store: Not listed
   - Scope: Local session saver and tab backup manager.

### Maintained Browser Web Tools

1. **Word to LaTeX Converter Online** (`/word-to-latex-converter/`)
   - Technology: Client-side Pandoc 3.10 WebAssembly (`pandoc-wasm`) executed in a dedicated Web Worker (`assets/js/converter.worker.js`).
   - Image Delivery: Automatically packages a ZIP archive containing the root `.tex` document and extracted `media/` images using `fflate` when DOCX documents contain embedded images. Text-only documents download directly as `.tex`.
   - Clipboard: "Copy LaTeX" copies generated markup to clipboard; images are not copied to clipboard and must be downloaded in the archive.
2. **Client-Side PDF Redaction Tool / Offline PDF Studio** (`/pdf-tools/`)
   - Technology: Client-side canvas redaction and PDF reconstruction using `pdf-lib` and `pdfjs-dist`.

---

## Technical Architecture & Verification Boundaries

1. **Local Processing vs Remote Services**:
   - The web converter runs locally in browser WebAssembly memory.
   - Preamble/package fixes and third-party compilation (e.g. Overleaf, TeXstudio) occur outside ExtensionGuy.
2. **LaTeX Generation vs Compilation**:
   - The tool generates LaTeX markup; it does **not** compile LaTeX into PDF.
   - Compiling generated LaTeX to PDF requires an external TeX distribution or cloud service (e.g. Overleaf). Compilation to PDF is **not guaranteed** and requires user review.
3. **Verification Status Conventions**:
   - `production-verified`: Checked against live `https://extensionguy.me` with recorded test evidence.
   - `merged`: Verified locally and deployed to origin `pages.dev`.
   - `[UNVERIFIED]`: Unmeasured claims (e.g. arbitrary file size ceilings, external network isolation without Playwright egress traces).
