# Feature Specification: 001-product-galleries

**Feature Branch**: `candidate-visuals-galleries`  
**Created**: 2026-11-05  
**Status**: Ready for Implementation  
**Spec**: Product Screenshot Galleries & Outdated Artwork Remediation

## Executive Summary
Modernize all six ExtensionGuy product pages (`/word-to-latex/`, `/table-extractor/`, `/bulkgrab/`, `/seo-inspector/`, `/bilexi/`, `/tab-vault/`) by:
1. Eliminating the unsupported "Save 95% Memory" / "95% Memory Freed" claim embedded in `tab-vault-1-collapse.png` (and WebP/AVIF variants) by replacing it with verified store artwork ("Declutter 50+ Tabs in One Click. Reclaim Memory.").
2. Implementing an accessible, responsive, dependency-free product screenshot gallery for all 31 verified store screenshots across the 6 product pages.
3. Providing keyboard navigation, touch swipe support, ARIA semantics, and an accessible lightbox modal.
4. Ensuring 100% platform accuracy and zero regressions across existing tests and CSP.

## User Scenarios & Testing

### User Story 1 - Tab Vault Unsupported Claim Remediation (Priority: P1)
As a visitor or reviewer, I must see only verified, accurate claims about Tab Vault without any legacy "95% RAM / Memory" claim in text, markup, or raster images.

- **Acceptance Scenario 1.1**:
  **Given** the Tab Vault product page or homepage preview modal,  
  **When** `tab-vault-1-collapse` is rendered (PNG, WebP, AVIF),  
  **Then** the image displays "Declutter 50+ Tabs in One Click. Reclaim Memory." with "Memory Reclaimed: Converts tabs to lists", and no instance of "Save 95% Memory" or "95% Memory Freed" exists.
- **Acceptance Scenario 1.2**:
  **Given** SEO Inspector's overview screenshot,  
  **When** inspected,  
  **Then** the "94/100 Instant Health Score" is preserved as an SEO audit score and verified distinct from any RAM metric.

### User Story 2 - Interactive Product Galleries on All 6 Pages (Priority: P1)
As a visitor viewing any product page, I want to explore high-resolution screenshots of the extension's key features with clear, factual captions.

- **Acceptance Scenario 2.1**:
  **Given** any of the 6 product pages,  
  **When** the page loads,  
  **Then** the first screenshot is displayed in a 1280x800 responsive container with a readable factual caption, previous/next controls, and a complete row of thumbnail tabs.
- **Acceptance Scenario 2.2**:
  **Given** a product gallery,  
  **When** a user clicks a thumbnail or uses Arrow keys,  
  **Then** the main viewport switches smoothly to the selected screenshot (with `<picture>` providing AVIF, WebP, PNG fallbacks) and updates the caption (`aria-live="polite"`).

### User Story 3 - Accessible Lightbox Modal (Priority: P2)
As a user desiring a detailed view, I want to click or press Enter on the primary screenshot to open a full-resolution lightbox modal.

- **Acceptance Scenario 3.1**:
  **Given** the product gallery main image,  
  **When** clicked or activated with Enter/Space,  
  **Then** an accessible dialog modal opens showing the enlarged image and caption, trapping focus.
- **Acceptance Scenario 3.2**:
  **Given** the open lightbox modal,  
  **When** Escape is pressed, or the Close button or backdrop is clicked,  
  **Then** the modal closes and focus is restored to the trigger element.

### User Story 4 - Mobile Touch & Responsive Experience (Priority: P2)
As a mobile user, I want the gallery to fit my screen without horizontal overflow and support swipe gestures.

- **Acceptance Scenario 4.1**:
  **Given** a mobile viewport (e.g. 375px width),  
  **When** swiping left or right on the main gallery image,  
  **Then** the gallery navigates to the next or previous screenshot accordingly.

## Requirements

### Functional Requirements
- **FR-001**: Replace `assets/screenshots/tab-vault-1-collapse.png` and regenerate `.webp` and `.avif` using `/home/sid/projects/tab-vault/main/dist/screenshots/store-screenshot-1-hero-collapse.png`.
- **FR-002**: Stage all missing screenshot assets into `assets/screenshots/` (with PNG, WebP, AVIF formats) for a total of 31 complete triplets (93 image files total).
- **FR-003**: Implement gallery component in pure vanilla CSS (`assets/css/styles.css`) and vanilla JS (`assets/js/site.js`). No third-party scripts or CSS frameworks.
- **FR-004**: Replace static solitary hero pictures on all 6 product pages with accessible `.product-gallery` markup.
- **FR-005**: All images must declare explicit `width="1280" height="800"` to prevent Cumulative Layout Shift (CLS).
- **FR-006**: Support keyboard navigation: Left/Right arrows cycle images, Enter/Space opens modal, Escape closes modal, Tab remains trapped in modal while open.
- **FR-007**: Support touch swipe gestures on mobile devices.
- **FR-008**: Synchronize `build_redesign.py` metadata and ensure homepage modal preview uses identical verified assets and captions.
- **FR-009**: Preserve strict platform accuracy: Word to LaTeX, Table Extractor, BulkGrab = Chrome & Edge; SEO Inspector, Bilexi, Tab Vault = Edge-only.
- **FR-010**: Comply with Content Security Policy (`script-src 'self'`).

## Success Criteria
- **SC-001**: 0 occurrences of "95% Memory" or "95% RAM" anywhere in assets, code, or output.
- **SC-002**: All 31 store screenshots render seamlessly with AVIF, WebP, and PNG sources.
- **SC-003**: 100% automated test pass rate across unit, integration, CSP, content accuracy, and gallery interaction tests.
- **SC-004**: Zero layout shift and zero console errors.
