# Contributing & Developer Guide

## Overview
This repository contains the browser extensions portfolio website along with an in-browser Word-to-LaTeX converter powered by Pandoc WebAssembly (GPL-2.0+). The site is statically hosted with zero remote document-processing backends or analytics.

## Prerequisites
- **Node.js**: Version 20.x or later (ESM support and native `node:test` runner).
- **npm**: Version 9.x or later.

## Setup & Dependency Installation
Dependencies are strictly local and declared in `package.json`:

```bash
npm ci
```

### Playwright Browser Installation
If testing in a fresh environment where Playwright Chromium binaries are not yet cached, install the browser binary:

```bash
npx playwright install chromium
```

## Rebuilding Assets
To rebuild the converter Web Worker and client bundles:

```bash
npm run build
```

This runs `scripts/build_worker.mjs` using `esbuild` and produces:
- `assets/js/converter.worker.js` (Web Worker IIFE bundle including `pandoc-wasm`, `@bjorn3/browser_wasi_shim`, `fflate`, and LaTeX cleanup pipeline).
- `assets/js/converterClient.js` (Client-side Promise-based controller singleton).
- `assets/js/converterUi.js` (DOM interaction controller for `index.html`).

## Running Tests
To run the complete automated test suite (including asset verification, Web Worker proof of concept, controller unit tests, and Playwright browser integration tests):

```bash
npm test
```

## Static Hosting & WASM Loading Discipline
- The website is statically hosted.
- The 15.2 MiB compressed WebAssembly engine (`assets/wasm/pandoc.wasm.gz`) is **lazy-loaded**; it is never requested on initial page load and is fetched only when a visitor explicitly selects a document to convert.
- The first conversion requires an internet connection to download the WebAssembly engine asset unless it is already available through the browser's HTTP cache. Subsequent conversions can reuse the initialized engine while the current page session remains active. Offline availability after a page reload or on a future visit is not guaranteed because the application does not currently implement a service worker or persistent application-managed cache.

## Cloudflare Pages Headers & Cache Policy
When deployed on Cloudflare Pages, root-level `_headers` defines conservative caching rules:
- `/` and `/index.html`: `Cache-Control: no-cache, must-revalidate` to ensure freshness validation on HTML updates.
- `/assets/js/*`: `Cache-Control: public, max-age=3600, must-revalidate` (1-hour cache lifetime for stable, non-fingerprinted JavaScript bundles).
- `/assets/wasm/pandoc.wasm.gz`: `Cache-Control: public, max-age=3600, must-revalidate` (1-hour cache lifetime for the compressed WASM engine).
- Site-wide security headers: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Content-Security-Policy` restricting scripts to `'self' 'wasm-unsafe-eval'` (zero inline scripts, zero `eval()`).
- Note: Production headers are enforced by Cloudflare Pages at the edge and must be verified against actual deployed responses.
