# Implementation Plan: 001-product-galleries

**Branch**: `candidate-visuals-galleries` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)

## Summary
Modernize all six ExtensionGuy product pages with fully responsive, accessible, zero-dependency screenshot galleries displaying all 31 verified store screenshots, while eliminating the legacy "95% Memory" claim in `tab-vault-1-collapse.png` (and variants).

## Technical Context
- **Language/Stack**: HTML5, Modern CSS (Custom Properties), Vanilla JavaScript (ES2022+), Python 3.10+ (build script), Node.js (test runner)
- **Primary Dependencies**: Zero runtime external dependencies; ImageMagick CLI (`magick`) for offline image optimization (WebP, AVIF)
- **Testing**: Node.js test runner (`node:test`), Playwright E2E (`@playwright/test`)
- **Constraints**: 
  - Strictly candidate worktree (`/home/sid/projects/extensionguy/worktrees/candidate-visuals-galleries`)
  - Strict Content Security Policy (`script-src 'self'`)
  - Aspect ratio 16:10, dimensions 1280x800 for all screenshots
  - No Cumulative Layout Shift (CLS)

## Implementation Phases

### Phase 1: Asset Preparation & Remediation
1. Replace `assets/screenshots/tab-vault-1-collapse.png` with `/home/sid/projects/tab-vault/main/dist/screenshots/store-screenshot-1-hero-collapse.png`
2. Synchronize `tab-vault-2-recovery.png` and `tab-vault-3-search.png` with their `dist/screenshots/` counterparts
3. Copy missing store screenshots:
   - Word to LaTeX #5 (`5-privacy-air-gapped.png`) -> `w2l-5-privacy.png`
   - Table Extractor #5 (`05-privacy-first.png`) -> `table-5-privacy.png`
   - BulkGrab #4 (`04_client_side_zip.png`) -> `bulkgrab-4-zip.png`
   - BulkGrab #5 (`05_privacy_web3_licensing.png`) -> `bulkgrab-5-privacy.png`
4. Generate `.webp` and `.avif` for all updated/new PNG files using ImageMagick
5. Verify 31 PNGs, 31 WebPs, 31 AVIFs exist (93 total files) and verify absence of "95% Memory" strings

### Phase 2: Design & CSS Implementation
1. Add `.product-gallery` styles in `assets/css/styles.css`:
   - Aspect ratio 16:10 with explicit width/height
   - Large primary viewport with border, radius, shadow
   - Previous and next overlay buttons (chevron icons)
   - Interactive zoom indicator button on main picture
   - Caption banner with `aria-live="polite"`
   - Scrollable thumbnail rail with sequence badges, title chips, and active indicator
   - Lightbox modal dialog styling with focus ring, close button, and enlarged image presentation
   - Responsive adjustments for mobile viewports (< 768px, < 480px)

### Phase 3: JavaScript Gallery Controller & Metadata
1. Update `assets/js/site.js`:
   - Update metadata array `E` with all 31 screenshots and accurate captions
   - Implement `initProductGallery()`:
     - Active slide index state
     - Thumbnail tab selection with `aria-selected`
     - Picture update (`<source srcset="...">` and `<img>`)
     - Keyboard navigation (Left/Right arrows, Enter/Space)
     - Touch swipe detection (`touchstart`, `touchend`)
     - Lightbox dialog integration (`showModal()`, focus trapping, Escape handling)
   - Initialize automatically on DOMContentLoaded if `.product-gallery` is present

### Phase 4: Product Pages Markup Modernization
1. Update HTML on all six product pages:
   - `word-to-latex/index.html` (5 screenshots)
   - `table-extractor/index.html` (5 screenshots)
   - `bulkgrab/index.html` (5 screenshots)
   - `seo-inspector/index.html` (5 screenshots)
   - `bilexi/index.html` (5 screenshots)
   - `tab-vault/index.html` (6 screenshots)
2. Ensure consistent structure, semantic tags, and lightbox modal markup on each page

### Phase 5: Build Script & Homepage Parity
1. Update `build_redesign.py` with updated screenshot lists and captions
2. Run `python3 build_redesign.py` to regenerate `index.html`
3. Verify homepage preview modal correctly reflects the updated assets and Tab Vault remediation

### Phase 6: Automated Verification & Review
1. Run existing test suite (`npm test`)
2. Add automated tests for:
   - All 31 screenshot file presence and non-zero size across PNG, WebP, AVIF
   - Absence of "95% Memory" or "95% RAM" claim across all files
   - Product gallery DOM elements, ARIA attributes, and scripts
   - Playwright end-to-end tests for gallery interactions (next/prev, thumbnail click, modal open/close, swipe)
