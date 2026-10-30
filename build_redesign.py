# coding: utf-8
"""
Visual Redesign Generator for Extensions Portfolio
Crafted as an editorial-quality, modern, privacy-first software developer portfolio.
"""

import json
from pathlib import Path

# Load published store versions (source of truth)
REPO_ROOT = Path(__file__).resolve().parent
with open(REPO_ROOT / "store-versions.json", "r", encoding="utf-8") as f:
    store_versions = json.load(f)

html = r"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Browser Extensions &amp; Word to LaTeX — ExtensionGuy</title>
  <meta name="description" content="Privacy-first browser extensions for Edge and Chrome: Word-to-LaTeX converter, Tab Vault, Table Extractor, BulkGrab, SEO Inspector, and Bilexi.">

  <link rel="canonical" href="https://extensionguy.me/">
  <link rel="alternate" hreflang="en" href="https://extensionguy.me/">
  <link rel="alternate" hreflang="x-default" href="https://extensionguy.me/">

  <meta property="og:type" content="website">
  <meta property="og:title" content="Word to LaTeX Converter &amp; Privacy-First Browser Extensions — ExtensionGuy">
  <meta property="og:description" content="Privacy-first Microsoft Edge extensions for developers and researchers with browser-local processing and no telemetry SDKs.">
  <meta property="og:url" content="https://extensionguy.me/">
  <meta property="og:image" content="https://extensionguy.me/assets/og/home-1200x630.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Word to LaTeX Converter &amp; Privacy-First Browser Extensions — ExtensionGuy">
  <meta name="twitter:description" content="Privacy-first Microsoft Edge extensions with local-first processing and no data telemetry.">
  <meta name="twitter:image" content="https://extensionguy.me/assets/og/home-1200x630.png">

<link rel="icon" type="image/svg+xml" href="assets/icons/favicon.svg">
  <link rel="icon" type="image/png" href="assets/icons/word-to-latex-128.png">
  <link rel="apple-touch-icon" href="assets/icons/word-to-latex-128.png">
  <meta name="theme-color" content="#0f172a">

  <!-- Preload critical local typography fonts -->
  <link rel="preload" href="assets/fonts/geist-400.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="assets/fonts/geist-600.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="assets/fonts/geist-700.woff2" as="font" type="font/woff2" crossorigin>

  <!-- Self-hosted CSS containing local WOFF2 @font-face rules -->
  <link rel="stylesheet" href="assets/css/styles.css?v=20261029-1">

  <script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://extensionguy.me/#website",
      "url": "https://extensionguy.me/",
      "name": "ExtensionGuy \u2014 Privacy-First Browser Extensions",
      "description": "Privacy-first browser extensions portfolio and in-browser Word-to-LaTeX converter.",
      "inLanguage": "en",
      "publisher": {
        "@type": "Person",
        "@id": "https://extensionguy.me/#author",
        "name": "Sid",
        "url": "https://extensionguy.me/#about",
        "sameAs": [
          "https://github.com/sidoua26-debug"
        ]
      }
    },
    {
      "@type": "Person",
      "@id": "https://extensionguy.me/#author",
      "name": "Sid",
      "jobTitle": "Browser Extension Developer & Software Engineer",
      "url": "https://extensionguy.me/#about",
      "sameAs": [
        "https://github.com/sidoua26-debug"
      ]
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://extensionguy.me/#word-to-latex",
      "name": "Word to LaTeX (Offline)",
      "softwareVersion": "1.0.6",
      "operatingSystem": "Any, with Microsoft Edge",
      "applicationCategory": "BrowserApplication",
      "description": "Converts Microsoft Word (.docx) documents, tables, and math into clean LaTeX: runs fully offline, nothing leaves your device.",
      "downloadUrl": "https://microsoftedge.microsoft.com/addons/detail/word-to-latex-offline/lpehnpdkdiddlppobkcicdondaebijlf",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "author": {
        "@id": "https://extensionguy.me/#author"
      }
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://extensionguy.me/#table-extractor",
      "name": "Table Extractor",
      "softwareVersion": "1.0.1",
      "operatingSystem": "Any, with Microsoft Edge or Google Chrome",
      "applicationCategory": "BrowserApplication",
      "description": "Extracts HTML tables and virtualized AG Grid containers into CSV, Excel (XLSX), and JSON arrays locally in browser memory.",
      "downloadUrl": "https://microsoftedge.microsoft.com/addons/detail/table-extractor-export-h/pekammppimoaikllkhhebocbkbidoboe",
      "author": {
        "@id": "https://extensionguy.me/#author"
      }
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://extensionguy.me/#bulkgrab",
      "name": "BulkGrab",
      "operatingSystem": "Any, with Microsoft Edge or Google Chrome",
      "applicationCategory": "BrowserApplication",
      "description": "Deep-scans webpages for downloadable files, filters by extension, and bundles them into a ZIP archive directly on your device.",
      "downloadUrl": "https://microsoftedge.microsoft.com/addons/detail/bulkgrab-batch-file-dow/cphidoikhnjdkeldgelkpddnkojlfccc",
      "author": {
        "@id": "https://extensionguy.me/#author"
      }
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://extensionguy.me/#seo-inspector",
      "name": "SEO Inspector",
      "operatingSystem": "Any, with Microsoft Edge",
      "applicationCategory": "BrowserApplication",
      "description": "On-page technical SEO diagnostics evaluating headings, meta tags, OpenGraph, JSON-LD schema, and Navigation Timing Web Vitals in 1 click.",
      "downloadUrl": "https://microsoftedge.microsoft.com/addons/detail/seo-inspector-meta-tags/jbnjjkfkcmfkjamakndojbkjanijlfmd",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "author": {
        "@id": "https://extensionguy.me/#author"
      }
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://extensionguy.me/#bilexi",
      "name": "Bilexi",
      "operatingSystem": "Any, with Microsoft Edge",
      "applicationCategory": "BrowserApplication",
      "description": "Offline bilingual English/French autocorrect extension with instant accent restoration, elision repair, and no telemetry.",
      "downloadUrl": "https://microsoftedge.microsoft.com/addons/detail/mheomahlcfddgjlemnolopfbhojfpmpb",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "author": {
        "@id": "https://extensionguy.me/#author"
      }
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://extensionguy.me/#tab-vault",
      "name": "Tab Vault",
      "operatingSystem": "Any, with Microsoft Edge",
      "applicationCategory": "BrowserApplication",
      "description": "Local tab manager and memory saver for Microsoft Edge that suspends inactive tabs, reclaims browser memory, and stores sessions locally on-device.",
      "downloadUrl": "https://microsoftedge.microsoft.com/addons/detail/paedfgpjmkmmodbcimbkjkkdlfibfpbc",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "author": {
        "@id": "https://extensionguy.me/#author"
      }
    }
  ]
}
</script>
</head>
<body id="top">
  <!-- Skip to Content accessible navigation link -->
  <a href="#mainContent" class="skip-to-content">Skip to content</a>

  <!-- ========================================================================
       STICKY NAVIGATION BAR
       ======================================================================== -->
  <header class="navbar" role="banner">
    <div class="container nav-inner">
      <a href="#top" class="brand">
        <div class="brand-mark" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
        </div>
        <span>ExtensionGuy</span>
      </a>

      <nav aria-label="Main Navigation">
        <ul class="nav-links" id="navLinks">
          <li><a href="#flagship" class="nav-link">Flagship</a></li>
          <li><a href="#portfolio" class="nav-link">Products</a></li>
          <li><a href="#live-converter" class="nav-link">Demo</a></li>
          <li><a href="#guides" class="nav-link">Guides</a></li>
          <li><a href="#contact" class="nav-link">Contact</a></li>
          <li><a href="/privacy" class="nav-link">Privacy</a></li>
        </ul>
      </nav>

      <div class="nav-actions">
        <button class="theme-toggle" id="themeToggle" type="button" aria-label="Toggle color theme">
          <svg class="icon-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          <svg class="icon-moon" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        </button>

        <a href="#portfolio" class="btn btn-ghost btn-sm nav-cta-btn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          View 6 Add-ons
        </a>

        <button class="mobile-menu-btn" id="mobileMenuBtn" type="button" aria-label="Open mobile navigation menu" aria-expanded="false" aria-controls="navLinks">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
      </div>
    </div>
  </header>

  <main id="mainContent">

    <!-- ======================================================================
         HERO SECTION: Standout Flagship + Verified Properties
         ====================================================================== -->
    <section class="hero" aria-labelledby="heroHeadline">
      <div class="hero-grid-bg" aria-hidden="true"></div>

      <div class="container hero-content">
        <div class="hero-badge-pill">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Official Microsoft Edge Add-ons Portfolio
        </div>

        <h1 id="heroHeadline" class="hero-title">
          Word to LaTeX Converter &amp; Browser Extensions. <br>Built for Real Work.
        </h1>

        <p class="hero-subtitle">
          Engineered for privacy and daily productivity. Convert Word to LaTeX and autocorrect bilingual text 100% offline; extract tables, batch-download files, and audit on-page SEO locally in your browser with no application telemetry.
        </p>

        <div class="hero-trust-row" role="list">
          <div class="trust-badge" role="listitem">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Published on Edge Add-ons</span>
          </div>
          <div class="trust-badge" role="listitem">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span>No Ads · No Telemetry</span>
          </div>
          <div class="trust-badge" role="listitem">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Open Source on GitHub</span>
          </div>
          <div class="trust-badge" role="listitem">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Local In-Browser Processing</span>
          </div>
        </div>

        <div class="hero-actions" style="display: flex; gap: 14px; justify-content: center; align-items: center; margin-top: 28px; flex-wrap: wrap;">
          <a href="#live-converter" class="btn btn-primary">
            Try Free Converter &rarr;
          </a>
          <a href="#portfolio" class="btn btn-ghost">
            Explore 6 Extensions &darr;
          </a>
        </div>
      </div>

      <!-- Live Client-Side Word to LaTeX Converter -->
      <div class="container">
        <div class="converter-card" id="live-converter">
          <div class="converter-card-header">
            <div>
              <span class="badge badge-w2l">Local Pandoc WASM</span>
              <span class="badge badge-subtle" style="margin-left: 6px;">Local Processing</span>
              <span class="badge badge-edge" style="margin-left: 6px;">Live Demo</span>
            </div>

            <div class="converter-mode-group" role="radiogroup" aria-label="LaTeX Output Mode">
              <button type="button" class="mode-btn active" id="modeFragmentBtn" role="radio" aria-checked="true" title="Generate body snippet without document preamble">
                LaTeX Fragment
              </button>
              <button type="button" class="mode-btn" id="modeDocumentBtn" role="radio" aria-checked="false" title="Generate complete compilable document with preamble">
                Complete Document
              </button>
            </div>
          </div>

          <div class="converter-card-body">
            <div class="drop-zone" id="converterDropZone" tabindex="0" role="region" aria-label="Word document upload dropzone">
              <input type="file" id="docxFileInput" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" style="display: none !important;" aria-label="Select Word document (.docx)">
              <div class="drop-icon" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
              </div>
              <div class="drop-title">Select or drop a Microsoft Word (.docx) document</div>
              <div class="drop-subtitle">Processed locally on your machine via WebAssembly. Press Enter or click to browse.</div>
              <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                <button type="button" class="btn btn-edge btn-sm" id="converterChooseBtn">
                  Choose .docx File
                </button>
                <button type="button" class="btn btn-ghost btn-sm" id="converterSampleBtn">
                  Try with sample .docx
                </button>
              </div>
              <div id="converterFileName" class="file-name-tag" hidden></div>
            </div>

            <div id="converterStatus" class="status-panel" role="status" aria-live="polite">
              <div id="converterStatusDot" class="status-indicator-dot" aria-hidden="true"></div>
              <div id="converterStatusSpinner" class="status-spinner" aria-hidden="true" style="display: none;"></div>
              <div>
                <strong id="converterStatusStage" style="text-transform: capitalize; margin-right: 6px;">Status:</strong>
                <span id="converterStatusMessage">Ready — select or drop a .docx file to convert</span>
              </div>
            </div>

            <div id="converterError" class="error-banner" role="alert" aria-live="assertive" hidden></div>

            <div id="converterOutputContainer" class="output-panel" hidden>
              <div class="output-header">
                <span class="output-title">Clean LaTeX Output</span>
                <div class="output-actions">
                  <button type="button" id="converterCopyBtn" class="btn btn-ghost btn-sm" title="Copy LaTeX snippet to clipboard">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    Copy LaTeX
                  </button>
                  <button type="button" id="converterDownloadBtn" class="btn btn-ghost btn-sm" title="Download as .tex file">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Download .tex
                  </button>
                  <button type="button" id="converterResetBtn" class="btn btn-ghost btn-sm" title="Convert another file">
                    Convert Another
                  </button>
                </div>
              </div>
              <textarea id="converterOutputArea" class="output-textarea" readonly spellcheck="false" aria-label="LaTeX Output"></textarea>
              <div id="converterSuccessCTA" class="post-conversion-banner" hidden>
                <div>
                  <strong class="post-conversion-banner-title">Need conversion directly in your browser toolbar?</strong>
                  <span class="post-conversion-banner-desc">Install Word to LaTeX (Offline) for offline access and clipboard table support.</span>
                </div>
                <div class="post-conversion-banner-actions">
                  <a href="https://chromewebstore.google.com/detail/word-to-latex-offline/appokjanohamffjlecncdegihoelkhco" target="_blank" rel="noopener noreferrer" class="btn btn-chrome btn-sm">Get on Chrome</a>
                  <a href="https://microsoftedge.microsoft.com/addons/detail/word-to-latex-offline/lpehnpdkdiddlppobkcicdondaebijlf" target="_blank" rel="noopener noreferrer" class="btn btn-edge btn-sm">Get on Edge</a>
                  <a href="https://github.com/sidoua26-debug/extensions-portfolio/issues/new?title=Word+to+LaTeX+Conversion+Issue&body=Please+describe+the+problem+and+include+any+relevant+DOCX+structure+details:" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-sm">Report an Issue</a>
                </div>
              </div>
            </div>

            <div class="converter-attribution">
              Conversion engine powered by <a href="https://pandoc.org/" target="_blank" rel="noopener noreferrer">Pandoc</a> 3.10 compiled to WebAssembly (GPL-2.0+).
              View engine license and attribution at <a href="assets/wasm/LICENSE.txt" target="_blank">LICENSE.txt</a>.
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ======================================================================
         FLAGSHIP DEEP DIVE: Word to LaTeX (Offline)
         ====================================================================== -->
    <section class="flagship-section" id="flagship" aria-labelledby="flagshipTitle">
      <div class="container">
        <div class="section-eyebrow">Flagship Deep Dive</div>
        <h2 id="flagshipTitle" class="section-heading">Word to LaTeX (Offline)</h2>
        <p class="section-lead">
          A dedicated browser extension that converts Microsoft Word manuscripts, clipboard tables, and typed math images into compilation-ready LaTeX snippets — directly inside your browser.
        </p>

        <div class="flagship-grid">
          <div class="product-showcase">
            <div class="showcase-toolbar">
              <div class="visual-dots" aria-hidden="true">
                <span class="visual-dot"></span>
                <span class="visual-dot"></span>
                <span class="visual-dot"></span>
              </div>
              <span class="badge badge-w2l">Pandoc WebAssembly</span>
            </div>

            <div class="showcase-tabs-nav" role="tablist" aria-label="Word to LaTeX Interfaces">
              <button class="tab-trigger active" role="tab" aria-selected="true" data-target="panel-w2l-output">LaTeX Output &amp; Copy</button>
              <button class="tab-trigger" role="tab" aria-selected="false" data-target="panel-w2l-upload">DOCX File Upload</button>
              <button class="tab-trigger" role="tab" aria-selected="false" data-target="panel-w2l-paste">Paste Tables</button>
              <button class="tab-trigger" role="tab" aria-selected="false" data-target="panel-w2l-ocr">Image OCR (Experimental)</button>
            </div>

            <div class="showcase-stage">
              <picture>
                <source type="image/avif" srcset="assets/screenshots/w2l-2-output.avif">
                <source type="image/webp" srcset="assets/screenshots/w2l-2-output.webp">
                <img id="panel-w2l-output" class="showcase-img active lightbox-trigger" src="assets/screenshots/w2l-2-output.png" alt="Word to LaTeX output view with instant clipboard sync confirmation" title="Click to enlarge" fetchpriority="high" decoding="async" width="1280" height="800">
              </picture>
              <picture>
                <source type="image/avif" srcset="assets/screenshots/w2l-1-upload.avif">
                <source type="image/webp" srcset="assets/screenshots/w2l-1-upload.webp">
                <img id="panel-w2l-upload" class="showcase-img lightbox-trigger" src="assets/screenshots/w2l-1-upload.png" alt="Word to LaTeX local DOCX file upload view" title="Click to enlarge" loading="lazy" decoding="async" width="1280" height="800">
              </picture>
              <picture>
                <source type="image/avif" srcset="assets/screenshots/w2l-3-paste.avif">
                <source type="image/webp" srcset="assets/screenshots/w2l-3-paste.webp">
                <img id="panel-w2l-paste" class="showcase-img lightbox-trigger" src="assets/screenshots/w2l-3-paste.png" alt="Word to LaTeX pasted table conversion" title="Click to enlarge" loading="lazy" decoding="async" width="1280" height="800">
              </picture>
              <picture>
                <source type="image/avif" srcset="assets/screenshots/w2l-4-image.avif">
                <source type="image/webp" srcset="assets/screenshots/w2l-4-image.webp">
                <img id="panel-w2l-ocr" class="showcase-img lightbox-trigger" src="assets/screenshots/w2l-4-image.png" alt="Word to LaTeX experimental image OCR" title="Click to enlarge" loading="lazy" decoding="async" width="1280" height="800">
              </picture>
            </div>

            <div class="showcase-caption">
              <span>Word to LaTeX Extension Interface</span>
            </div>
          </div>

          <div class="flagship-benefits">
            <div class="flex-wrap-gap-8">
              <span class="badge badge-edge">Published on Edge Add-ons</span>
              <span class="badge badge-subtle">No Special Permissions</span>
              <span class="badge badge-w2l">Published versions: Edge v1.0.6 · Chrome v1.0.6</span>
            </div>

            <div class="benefit-group">
              <div class="benefit-icon-container">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <div>
                <h3 class="benefit-title">Preserves Complex Word Structure</h3>
                <p class="benefit-desc">Extracts headings, bold/italics, nested lists, alignment (center/flushright), page geometry, and tables directly into clean <code>booktabs</code> and <code>longtable</code> syntax.</p>
              </div>
            </div>

            <div class="benefit-group">
              <div class="benefit-icon-container">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>
              </div>
              <div>
                <h3 class="benefit-title">Instant Clipboard Synchronization</h3>
                <p class="benefit-desc">Generates clean body fragments ready to paste directly into Overleaf or TeXstudio. Automatically unwraps <code>\pandocbounded{}</code> and removes <code>\tightlist</code> artifacts.</p>
              </div>
            </div>

            <div class="benefit-group">
              <div class="benefit-icon-container">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              </div>
              <div>
                <h3 class="benefit-title">Offline Image to LaTeX (OCR)</h3>
                <p class="benefit-desc">Built-in Tesseract.js engine (English, French, Math) recognizes typed single-line equations, standard Greek characters, and definite integrals locally.</p>
              </div>
            </div>

            <div class="experimental-notice" role="note">
              <strong>Transparent Scope &amp; Limitations:</strong> Image OCR is experimental and tested against an 80-sample golden evaluation corpus (97.5% compile rate, measuring whether output compiles, not semantic correctness). Radicals (√) are often read as V, matrix grids are unreliable, and handwriting is unsupported. Review OCR output before publication.
            </div>

            <div class="flex-wrap-gap-12-mt-8" style="align-items: center;">
              <a href="https://chromewebstore.google.com/detail/word-to-latex-offline/appokjanohamffjlecncdegihoelkhco" target="_blank" rel="noopener noreferrer" class="btn btn-chrome">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v10l4-4"/><path d="M16 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                Get on Chrome
              </a>
              <a href="https://microsoftedge.microsoft.com/addons/detail/lpehnpdkdiddlppobkcicdondaebijlf" target="_blank" rel="noopener noreferrer" class="btn btn-edge">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v10l4-4"/><path d="M16 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                Get on Edge
              </a>
              <span class="badge badge-subtle">Edge &amp; Chrome</span>
              <a href="/word-to-latex-converter/" class="btn btn-edge btn-converter-tint">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                Try Online Converter
              </a>
              <a href="https://github.com/sidoua26-debug/extensions-portfolio" target="_blank" rel="noopener noreferrer" class="btn btn-ghost">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
                Open source on GitHub
              </a>
            </div>
            <div class="section-footer-privacy"><a href="/privacy#word-to-latex" class="footer-privacy-link">&bull; 100% Offline &amp; No Telemetry Assurance &mdash; Read Privacy Details</a></div>
          </div>
        </div>
      </div>
    </section>

    <!-- ======================================================================
         PORTFOLIO GRID: All 6 Confirmed Published Products
         ====================================================================== -->
    <section class="portfolio-section" id="portfolio" aria-labelledby="portfolioHeading">
      <div class="container">
        <div class="portfolio-header-area">
          <div>
            <div class="section-eyebrow">Extension Portfolio</div>
            <h2 id="portfolioHeading" class="section-heading">Published Edge Add-ons</h2>
            <p class="section-lead">Each tool is designed with a specific workflow purpose and minimal permissions. Word to LaTeX, Bilexi, and Tab Vault run locally or fully offline, while Table Extractor, BulkGrab, and SEO Inspector process your data directly in your browser with no application telemetry.</p>
          </div>
          <div>
            <span class="badge badge-edge">6 Live Add-ons</span>
          </div>
        </div>

        <div class="portfolio-grid">

          <!-- Product 1: Word to LaTeX -->
          <article class="product-card" id="word-to-latex" aria-labelledby="cardTitleW2L">
            <div class="card-header">
              <img class="card-icon-img" src="assets/icons/word-to-latex-128.png" alt="Word to LaTeX icon" loading="lazy" decoding="async" width="128" height="128">
              <div class="card-header-meta">
                <h3 id="cardTitleW2L" class="card-product-name">Word to LaTeX</h3>
                <p class="card-subheading">Offline Document &amp; Math Converter</p>
              </div>
            </div>

            <div class="card-body">
              <div class="card-pill-row">
                <span class="badge badge-w2l">Flagship Project</span>
                <span class="badge badge-subtle">100% Offline WASM</span>
              </div>

              <div class="card-meta-row">
                <a href="/changelog/#word-to-latex" target="_blank" rel="noopener noreferrer" class="card-changelog-link">Changelog</a>
              </div>

              <div class="card-benefit-quote">
                <strong>Main Benefit:</strong> Converts Microsoft Word (.docx), equations, and complex tables into clean LaTeX snippets—100% offline.
              </div>

              <div class="card-screenshot-wrap">
                <picture>
                  <source type="image/avif" srcset="assets/screenshots/w2l-2-output.avif">
                  <source type="image/webp" srcset="assets/screenshots/w2l-2-output.webp">
                  <img class="lightbox-trigger" src="assets/screenshots/w2l-2-output.png" alt="Word to LaTeX output view with instant clipboard sync confirmation" loading="lazy" decoding="async" width="1280" height="800">
                </picture>
              </div>

              <ul class="card-points">
                <li>Preserves headings, lists, tables, and nested formatting</li>
                <li>Instant one-click clipboard sync for Overleaf &amp; TeXstudio</li>
                <li>Browser-local Pandoc WASM without remote uploads</li>
              </ul>
            </div>

            <div class="card-footer">
              <span class="badge badge-subtle">Edge &amp; Chrome</span>
              <div class="card-actions-group">
                <button type="button" class="btn btn-preview btn-sm" data-preview="word-to-latex">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  Preview
                </button>
                <a href="https://chromewebstore.google.com/detail/word-to-latex-offline/appokjanohamffjlecncdegihoelkhco" target="_blank" rel="noopener noreferrer" class="btn btn-chrome btn-sm">Get on Chrome</a>
                <a href="https://microsoftedge.microsoft.com/addons/detail/lpehnpdkdiddlppobkcicdondaebijlf" target="_blank" rel="noopener noreferrer" class="btn btn-edge btn-sm">Get on Edge</a>
                <a href="/word-to-latex/" class="btn btn-ghost btn-sm">Product details</a>
              </div>
            </div>
            <div class="card-version-micro">Published versions: Edge v1.0.6 · Chrome v1.0.6</div>
          </article>

          <!-- Product 2: Table Extractor -->
          <article class="product-card" id="table-extractor" aria-labelledby="cardTitleTable">
            <div class="card-header">
              <img class="card-icon-img" src="assets/icons/table-extractor-300.png" alt="Table Extractor icon" loading="lazy" decoding="async" width="300" height="300">
              <div class="card-header-meta">
                <h3 id="cardTitleTable" class="card-product-name">Table Extractor</h3>
                <p class="card-subheading">HTML &amp; Virtualized Data Grid Exporter</p>
              </div>
            </div>

            <div class="card-body">
              <div class="card-pill-row">
                <span class="badge badge-table">Data &amp; Research</span>
                <span class="badge badge-subtle">CSV · XLSX · JSON</span>
              </div>

              <div class="card-meta-row">
                <span class="card-rating" aria-label="Rated 5.0 out of 5 stars">★★★★★ 5.0 (Edge Add-ons)</span>
                <a href="/changelog/#table-extractor" target="_blank" rel="noopener noreferrer" class="card-changelog-link">Changelog</a>
              </div>

              <div class="card-benefit-quote">
                <strong>Main Benefit:</strong> Effortlessly captures locked tables and virtualized AG Grid containers without manual formatting cleanup.
              </div>

              <div class="card-screenshot-wrap">
                <picture>
                  <source type="image/avif" srcset="assets/screenshots/table-1-detection.avif">
                  <source type="image/webp" srcset="assets/screenshots/table-1-detection.webp">
                  <img class="lightbox-trigger" src="assets/screenshots/table-1-detection.png" alt="Table Extractor detecting HTML tables" loading="lazy" decoding="async" width="1280" height="800">
                </picture>
              </div>

              <ul class="card-points">
                <li>Auto-detects standard &amp; virtualized tables</li>
                <li>UTF-8 BOM encoding for instant Excel opening</li>
                <li>Granular row range &amp; hidden column recovery</li>
              </ul>
            </div>

            <div class="card-footer">
              <span class="badge badge-subtle">Edge &amp; Chrome</span>
              <div class="card-actions-group">
                <button type="button" class="btn btn-preview btn-sm" data-preview="table-extractor">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  Preview
                </button>
                <a href="https://chromewebstore.google.com/detail/fjpbjpmccomonleefghgalfoioekhlhm" target="_blank" rel="noopener noreferrer" class="btn btn-chrome btn-sm">Get on Chrome</a>
                <a href="https://microsoftedge.microsoft.com/addons/detail/pekammppimoaikllkhhebocbkbidoboe" target="_blank" rel="noopener noreferrer" class="btn btn-edge btn-sm">Get on Edge</a>
                <a href="/table-extractor/" class="btn btn-ghost btn-sm">Product details</a>
              </div>
            </div>
            <div class="card-version-micro">Published versions: Edge v1.0.1 · Chrome v1.0.1</div>
          </article>

          <!-- Product 3: BulkGrab -->
          <article class="product-card" id="bulkgrab" aria-labelledby="cardTitleBulk">
            <div class="card-header">
              <img class="card-icon-img" src="assets/icons/bulkgrab-128.png" alt="BulkGrab icon" loading="lazy" decoding="async" width="128" height="128">
              <div class="card-header-meta">
                <h3 id="cardTitleBulk" class="card-product-name">BulkGrab</h3>
                <p class="card-subheading">Batch File Downloader &amp; ZIP Bundler</p>
              </div>
            </div>

            <div class="card-body">
              <div class="card-pill-row">
                <span class="badge badge-edge">File Productivity</span>
                <span class="badge badge-subtle">Local ZIP Archiving</span>
              </div>

              <div class="card-meta-row">
                <span class="card-rating" aria-label="Rated 5.0 out of 5 stars">★★★★★ 5.0 (Edge Add-ons)</span>
                <a href="/changelog/#bulkgrab" target="_blank" rel="noopener noreferrer" class="card-changelog-link">Changelog</a>
              </div>

              <div class="card-benefit-quote">
                <strong>Main Benefit:</strong> Detects and bundles embedded documents and media into an organized ZIP file right inside your browser.
              </div>

              <div class="card-screenshot-wrap">
                <picture>
                  <source type="image/avif" srcset="assets/screenshots/bulkgrab-1-panel.avif">
                  <source type="image/webp" srcset="assets/screenshots/bulkgrab-1-panel.webp">
                  <img class="lightbox-trigger" src="assets/screenshots/bulkgrab-1-panel.png" alt="BulkGrab interactive floating file detection panel" loading="lazy" decoding="async" width="1280" height="800">
                </picture>
              </div>

              <ul class="card-points">
                <li>Smart scan for PDFs, images, archives, media</li>
                <li>Non-intrusive floating in-page selection panel</li>
                <li>Files download directly to your device; no upload to my servers</li>
              </ul>
            </div>

            <div class="card-footer">
              <span class="badge badge-subtle">Edge &amp; Chrome</span>
              <div class="card-actions-group">
                <button type="button" class="btn btn-preview btn-sm" data-preview="bulkgrab">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  Preview
                </button>
                <a href="https://chromewebstore.google.com/detail/lnmmneljpgdefilkokfpmiohjgfjcljn" target="_blank" rel="noopener noreferrer" class="btn btn-chrome btn-sm">Get on Chrome</a>
                <a href="https://microsoftedge.microsoft.com/addons/detail/cphidoikhnjdkeldgelkpddnkojlfccc" target="_blank" rel="noopener noreferrer" class="btn btn-edge btn-sm">Get on Edge</a>
                <a href="/bulkgrab/" class="btn btn-ghost btn-sm">Product details</a>
              </div>
            </div>
            <div class="card-version-micro">Published versions: Edge v1.0.0 · Chrome v1.0.3</div>
          </article>

          <!-- Product 4: SEO Inspector -->
          <article class="product-card" id="seo-inspector" aria-labelledby="cardTitleSEO">
            <div class="card-header">
              <img class="card-icon-img" src="assets/icons/seo-inspector-128.png" alt="SEO Inspector icon" loading="lazy" decoding="async" width="128" height="128">
              <div class="card-header-meta">
                <h3 id="cardTitleSEO" class="card-product-name">SEO Inspector</h3>
                <p class="card-subheading">On-Page Technical Diagnostics</p>
              </div>
            </div>

            <div class="card-body">
              <div class="card-pill-row">
                <span class="badge badge-seo">SEO &amp; Engineering</span>
                <span class="badge badge-subtle">9 Diagnostic Tabs</span>
              </div>

              <div class="card-meta-row">
                <a href="/changelog/#seo-inspector" target="_blank" rel="noopener noreferrer" class="card-changelog-link">Changelog</a>
              </div>

              <div class="card-benefit-quote">
                <strong>Main Benefit:</strong> Instant on-page audit evaluating headings, meta, canonical tags, and Web Vitals in a single click.
              </div>

              <div class="card-screenshot-wrap">
                <picture>
                  <source type="image/avif" srcset="assets/screenshots/seo-1-overview.avif">
                  <source type="image/webp" srcset="assets/screenshots/seo-1-overview.webp">
                  <img class="lightbox-trigger" src="assets/screenshots/seo-1-overview.png" alt="SEO Inspector overview diagnostics tab" loading="lazy" decoding="async" width="1280" height="800">
                </picture>
              </div>

              <ul class="card-points">
                <li>H1-H6 hierarchy visualizer &amp; keyword density</li>
                <li>JSON-LD structured data parser &amp; validator</li>
                <li>Navigation Timing API benchmarks &amp; export</li>
              </ul>
            </div>

            <div class="card-footer">
              <span class="badge badge-edge">Edge Add-on</span>
              <div class="card-actions-group">
                <button type="button" class="btn btn-preview btn-sm" data-preview="seo-inspector">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  Preview
                </button>
                <a href="https://microsoftedge.microsoft.com/addons/detail/jbnjjkfkcmfkjamakndojbkjanijlfmd" target="_blank" rel="noopener noreferrer" class="btn btn-edge btn-sm">Get on Edge</a>
                <a href="/seo-inspector/" class="btn btn-ghost btn-sm">Product details</a>
              </div>
            </div>
            <div class="card-version-micro">Published versions: Edge v1.0.0</div>
          </article>

          <!-- Product 5: Bilexi -->
          <article class="product-card" id="bilexi" aria-labelledby="cardTitleBilexi">
            <div class="card-header">
              <img class="card-icon-img" src="assets/icons/bilexi-128.png" alt="Bilexi icon" loading="lazy" decoding="async" width="128" height="128">
              <div class="card-header-meta">
                <h3 id="cardTitleBilexi" class="card-product-name">Bilexi</h3>
                <p class="card-subheading">Offline Bilingual Autocorrect (EN/FR)</p>
              </div>
            </div>

            <div class="card-body">
              <div class="card-pill-row">
                <span class="badge badge-bilexi">Productivity &amp; Typing</span>
                <span class="badge badge-subtle">100% Offline Engine</span>
              </div>

              <div class="card-meta-row">
                <a href="/changelog/#bilexi" target="_blank" rel="noopener noreferrer" class="card-changelog-link">Changelog</a>
              </div>

              <div class="card-benefit-quote">
                <strong>Main Benefit:</strong> Effortless real-time bilingual autocorrect, French accent restoration, and elision repair directly in your browser.
              </div>

              <div class="card-screenshot-wrap">
                <picture>
                  <source type="image/avif" srcset="assets/screenshots/bilexi-1-hero.avif">
                  <source type="image/webp" srcset="assets/screenshots/bilexi-1-hero.webp">
                  <img class="lightbox-trigger" src="assets/screenshots/bilexi-1-hero.png" alt="Bilexi bilingual autocorrect in browser text field" loading="lazy" decoding="async" width="1280" height="800">
                </picture>
              </div>

              <ul class="card-points">
                <li>Instant accent restoration (ecole &rarr; <span lang="fr">école</span>, deja &rarr; <span lang="fr">déjà</span>)</li>
                <li>Interactive suggestion strip with Alt+2 / Alt+3 hotkeys</li>
                <li>100% offline binary dictionaries &amp; no cloud telemetry</li>
              </ul>
            </div>

            <div class="card-footer">
              <span class="badge badge-edge">Edge Add-on</span>
              <div class="card-actions-group">
                <button type="button" class="btn btn-preview btn-sm" data-preview="bilexi">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  Preview
                </button>
                <a href="https://microsoftedge.microsoft.com/addons/detail/mheomahlcfddgjlemnolopfbhojfpmpb" target="_blank" rel="noopener noreferrer" class="btn btn-edge btn-sm">Get on Edge</a>
                <a href="/bilexi/" class="btn btn-ghost btn-sm">Product details</a>
              </div>
            </div>
            <div class="card-version-micro">Published versions: Edge v0.5.0</div>
          </article>

          <!-- Product 6: Tab Vault -->
          <article class="product-card" id="tab-vault" aria-labelledby="cardTitleTabVault">
            <div class="card-header">
              <img class="card-icon-img" src="assets/icons/tab-vault-128.png" alt="Tab Vault icon" loading="lazy" decoding="async" width="128" height="128">
              <div class="card-header-meta">
                <h3 id="cardTitleTabVault" class="card-product-name">Tab Vault</h3>
                <p class="card-subheading">Local Tab Manager &amp; Memory Saver</p>
              </div>
            </div>

            <div class="card-body">
              <div class="card-pill-row">
                <span class="badge badge-tabvault">Productivity &amp; Tabs</span>
                <span class="badge badge-subtle">Memory Saver</span>
              </div>

              <div class="card-meta-row">
                <a href="/changelog/#tab-vault" target="_blank" rel="noopener noreferrer" class="card-changelog-link">Changelog</a>
              </div>

              <div class="card-benefit-quote">
                <strong>Main Benefit:</strong> Convert clutter into organized, searchable tab groups to reclaim browser memory with no cloud storage.
              </div>

              <div class="card-screenshot-wrap">
                <picture>
                  <source type="image/avif" srcset="assets/screenshots/tab-vault-1-collapse.avif">
                  <source type="image/webp" srcset="assets/screenshots/tab-vault-1-collapse.webp">
                  <img class="lightbox-trigger" src="assets/screenshots/tab-vault-1-collapse.png" alt="Tab Vault dashboard collapsing open tabs into organized groups" loading="lazy" decoding="async" width="1280" height="800">
                </picture>
              </div>

              <ul class="card-points">
                <li>Instant tab suspension reclaiming browser memory</li>
                <li>Searchable vaults, rolling crash-resilient auto-snapshots</li>
                <li>100% on-device local extension storage (chrome.storage.local) &amp; no external telemetry requests</li>
              </ul>
            </div>

            <div class="card-footer">
              <span class="badge badge-edge">Edge Add-on</span>
              <div class="card-actions-group">
                <button type="button" class="btn btn-preview btn-sm" data-preview="tab-vault">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  Preview
                </button>
                <a href="https://microsoftedge.microsoft.com/addons/detail/paedfgpjmkmmodbcimbkjkkdlfibfpbc" target="_blank" rel="noopener noreferrer" class="btn btn-edge btn-sm">Get on Edge</a>
                <a href="/tab-vault/" class="btn btn-ghost btn-sm">Product details</a>
              </div>
            </div>
            <div class="card-version-micro">Published versions: Edge v1.0.0</div>
          </article>
        </div>
        <div class="card-feature-spotlight" style="margin-top: 32px; background: var(--bg-surface); border: 1px solid var(--border-page); border-radius: var(--r-md); padding: clamp(20px, 3vw, 28px); box-shadow: var(--shadow-sm); display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 20px;">
          <div style="max-width: 680px;">
            <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
              <span class="badge badge-w2l">Web Application</span>
              <span class="badge badge-subtle">Client-Side Only</span>
            </div>
            <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 8px; color: var(--text-main);">
              <a href="/pdf-tools/" style="color: inherit; text-decoration: none;">Offline PDF Tools</a>
            </h3>
            <p style="font-size: 0.95rem; color: var(--text-secondary); line-height: 1.6; margin: 0;">
              Merge, split, rotate, compress, and redact PDF files locally in your browser. Operates entirely in browser memory with zero network uploads, zero analytics, and strict Content-Security-Policy enforcement.
            </p>
          </div>
          <div>
            <a href="/pdf-tools/" class="btn btn-edge" style="display: inline-flex; align-items: center; gap: 8px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              Open PDF Tools &rarr;
            </a>
          </div>
        </div>
        <div class="section-footer-privacy"><a href="/privacy" class="footer-privacy-link">&bull; Minimal permissions, no tracking, local processing &mdash; Read Full Privacy Statement</a></div>
      </div>
    </section>

    <!-- ======================================================================
         TECHNICAL GUIDES & DOCUMENTATION
         ====================================================================== -->
    <section class="guides-section" id="guides" aria-labelledby="guidesHeading" style="padding: clamp(48px, 6vw, 80px) 0; border-top: 1px solid var(--border-page); background: var(--bg-surface);">
      <div class="container">
        <div style="display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 20px; margin-bottom: 32px;">
          <div>
            <div class="section-eyebrow">Documentation &amp; Tutorials</div>
            <h2 id="guidesHeading" class="section-heading">Technical Guides</h2>
            <p class="section-lead" style="margin-bottom: 0;">Step-by-step documentation for offline document conversion and tabular data handling.</p>
          </div>
          <div>
            <a href="/guides/" class="btn btn-ghost btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">View all guides &rarr;</a>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px;">
          <!-- Card 1: DOCX to LaTeX Offline -->
          <article style="background: var(--bg-page); border: 1px solid var(--border-page); border-radius: var(--r-md); padding: 24px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: var(--shadow-sm);">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span class="badge badge-subtle">Conversion Guide</span>
                <span style="font-size: 0.8rem; color: var(--text-tertiary);">October 2026</span>
              </div>
              <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 8px; line-height: 1.35;">
                <a href="/guides/docx-to-latex-offline/" style="color: var(--text-main); text-decoration: none;">Convert DOCX to LaTeX Offline</a>
              </h3>
              <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 16px;">
                Compare Pandoc CLI and browser-local options for converting DOCX manuscripts to LaTeX offline. Learn network verification steps and post-conversion checks.
              </p>
            </div>
            <div>
              <a href="/guides/docx-to-latex-offline/" class="btn btn-ghost btn-sm" style="width: 100%; justify-content: center;">Read Guide &rarr;</a>
            </div>
          </article>

          <!-- Card 2: Word Tables to LaTeX -->
          <article style="background: var(--bg-page); border: 1px solid var(--border-page); border-radius: var(--r-md); padding: 24px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: var(--shadow-sm);">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span class="badge badge-subtle">Formatting Guide</span>
                <span style="font-size: 0.8rem; color: var(--text-tertiary);">October 2026</span>
              </div>
              <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 8px; line-height: 1.35;">
                <a href="/guides/word-tables-to-latex/" style="color: var(--text-main); text-decoration: none;">How to Convert Word Tables to LaTeX</a>
              </h3>
              <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 16px;">
                Learn how to convert Word tables to LaTeX cleanly. Master booktabs rules, longtable environments, column alignments, and package dependencies.
              </p>
            </div>
            <div>
              <a href="/guides/word-tables-to-latex/" class="btn btn-ghost btn-sm" style="width: 100%; justify-content: center;">Read Guide &rarr;</a>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- ======================================================================
         ABOUT & PHILOSOPHY
         ====================================================================== -->
    <section class="about-section" id="about" aria-labelledby="aboutHeading">
      <div class="container">
        <div class="about-card">
          <div class="section-eyebrow">Engineering Philosophy</div>
          <h2 id="aboutHeading" class="section-heading">Hi, I'm Sid</h2>

          <p class="about-body-text">
            I build focused browser extensions that do one job well and respect your privacy. I started with Word to LaTeX after losing hours reformatting a manuscript, and I didn't want to upload it to a random website. Word to LaTeX and Bilexi run fully offline; Table Extractor, BulkGrab, and SEO Inspector process all data locally inside your browser and don't send your data to any server. Every extension is designed for daily productivity without bloated tracking, unnecessary permissions, or intrusive account walls.
          </p>

          <div class="about-values-grid">
            <div class="about-value-item">
              <h3 class="about-value-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Private by design
              </h3>
              <p class="about-value-text">
                All heavy compute and file transformations—including Pandoc WebAssembly compilation and table parsing—execute in your local browser sandbox. Your private documents, research manuscripts, and clipboard contents do not leave your device during local conversion.
              </p>
            </div>

            <div class="about-value-item">
              <h3 class="about-value-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Minimal permissions
              </h3>
              <p class="about-value-text">
                Each extension requests only the permissions it needs; they are listed on its store page. No browsing activity monitoring or third-party telemetry SDKs are included.
              </p>
            </div>

            <div class="about-value-item">
              <h3 class="about-value-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
                Open to check
              </h3>
              <p class="about-value-text">
                Transparent, open-source codebases hosted on GitHub. Anyone can inspect the implementation, audit security boundaries, verify dependency manifests, and confirm telemetry-free operation firsthand.
              </p>
            </div>
          </div>

          <div class="about-buttons">
            <a href="mailto:contact@extensionguy.me?subject=Extension%20Request" class="btn btn-edge">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              Request an extension
            </a>
            <a href="https://github.com/sidoua26-debug/extensions-portfolio/issues" target="_blank" rel="noopener noreferrer" class="btn btn-ghost">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Report a bug
            </a>
            <a href="https://github.com/sidoua26-debug" target="_blank" rel="noopener noreferrer" class="btn btn-ghost">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
              GitHub (@sidoua26-debug)
            </a>
            <a href="mailto:contact@extensionguy.me" class="btn btn-ghost">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              contact@extensionguy.me
            </a>
          </div>
          <div class="section-footer-privacy"><a href="/privacy" class="footer-privacy-link">&bull; Committed to user privacy &mdash; Read Our Privacy Policy</a></div>
        </div>
      </div>
    </section>

    <!-- ======================================================================
         FREQUENTLY ASKED QUESTIONS
         ====================================================================== -->
    <section class="faq-section" id="faq" aria-labelledby="faqHeading" style="padding: clamp(32px, 5vw, 64px) 0; border-top: 1px solid var(--border-page); background: var(--bg-surface);">
      <div class="container">
        <div class="faq-container" style="max-width: 820px; margin-inline: auto; text-align: left;">
          <div class="section-eyebrow" style="text-align: center;">Common Questions</div>
          <h2 id="faqHeading" class="section-heading" style="text-align: center; margin-bottom: 24px;">Frequently Asked Questions</h2>
          <div class="faq-grid" style="display: grid; gap: 16px;">
            <div class="faq-item" style="padding: 16px; border: 1px solid var(--border-page); border-radius: var(--r-md); background: var(--bg-surface);">
              <strong style="display: block; font-size: 0.95rem; margin-bottom: 6px; color: var(--text-main);">Why prioritize 100% offline and local-first browser extensions?</strong>
              <p style="font-size: 0.875rem; color: var(--text-secondary); line-height: 1.6; margin: 0;">Most online document and table converters upload your confidential files, sensitive spreadsheets, and unpublished academic manuscripts to third-party cloud servers where they can be logged, scraped, or retained. Our extensions—such as Word to LaTeX and Bilexi—run offline inside your local browser memory using WebAssembly. Your proprietary research and private data remain strictly on your own hardware.</p>
            </div>
            <div class="faq-item" style="padding: 16px; border: 1px solid var(--border-page); border-radius: var(--r-md); background: var(--bg-surface);">
              <strong style="display: block; font-size: 0.95rem; margin-bottom: 6px; color: var(--text-main);">How does client-side WebAssembly conversion work in Word to LaTeX?</strong>
              <p style="font-size: 0.875rem; color: var(--text-secondary); line-height: 1.6; margin: 0;">We compile Pandoc and its necessary Unix utilities directly into a WebAssembly binary. When you load or drop a DOCX manuscript into Word to LaTeX, the extension streams the file into an isolated browser Web Worker thread running the Pandoc WASM runtime. The document structure, equation formatting, and tables are parsed in-memory, returning compilation-ready LaTeX snippets in milliseconds without establishing any outbound network socket connection.</p>
            </div>
            <div class="faq-item" style="padding: 16px; border: 1px solid var(--border-page); border-radius: var(--r-md); background: var(--bg-surface);">
              <strong style="display: block; font-size: 0.95rem; margin-bottom: 6px; color: var(--text-main);">Do Table Extractor, BulkGrab, or SEO Inspector send telemetry to remote servers?</strong>
              <p style="font-size: 0.875rem; color: var(--text-secondary); line-height: 1.6; margin: 0;">No. Table Extractor parses HTML tables and virtualized AG Grid containers directly in browser memory and generates CSV and Excel XLSX files with local UTF-8 BOM encoding. BulkGrab streams file downloads directly from the host website into your browser storage and packages ZIP archives on-device with no intermediary servers. SEO Inspector performs DOM audits and Performance Timing evaluations locally on the client side without telemetry beacons. Optional Pro licensing for Table Extractor and BulkGrab attempts to verify payment IDs via an intermediary proxy when browser permissions allow; under no circumstances are table contents, extracted spreadsheets, downloaded files, or media URLs transmitted to the licensing service, as disclosed in our Privacy Policy.</p>
            </div>
            <div class="faq-item" style="padding: 16px; border: 1px solid var(--border-page); border-radius: var(--r-md); background: var(--bg-surface);">
              <strong style="display: block; font-size: 0.95rem; margin-bottom: 6px; color: var(--text-main);">How are software updates and security patches published?</strong>
              <p style="font-size: 0.875rem; color: var(--text-secondary); line-height: 1.6; margin: 0;">ExtensionGuy tools are distributed through official browser stores. Availability varies by product: Word to LaTeX (Offline), Table Extractor, and BulkGrab have listings on both Microsoft Edge Add-ons and the Chrome Web Store; the other products currently listed on this site are available through Microsoft Edge Add-ons. Each product page links to its official listings. Source code repositories and version changelogs are published publicly on GitHub, enabling developers and researchers to inspect source code and extension manifests independently.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

  </main>

  <!-- ======================================================================
         INSTALLATION GUIDE
         ====================================================================== -->
    <section class="install-section" id="install" aria-labelledby="installHeading">
      <div class="container">
        <div class="section-eyebrow">Installation Guide</div>
        <h2 id="installHeading" class="section-heading">Simple Installation on Microsoft Edge</h2>
        <p class="section-lead">Install directly from the Microsoft Edge Add-ons store in one click, or test unpacked builds via Developer Mode.</p>

        <div class="install-cards-grid">
          <div class="install-step-box">
            <div class="step-badge">1</div>
            <h3 class="step-heading">Open Store Page</h3>
            <p class="step-paragraph">Click "Get on Edge" on any extension above to navigate directly to its official listing on the Microsoft Edge Add-ons store catalog.</p>
          </div>

          <div class="install-step-box">
            <div class="step-badge">2</div>
            <h3 class="step-heading">Click "Get"</h3>
            <p class="step-paragraph">Click the blue <strong>Get</strong> button to install. Microsoft Edge inspects the extension package and clearly prompts you to review the minimal permission scope requested before enabling it.</p>
          </div>

          <div class="install-step-box">
            <div class="step-badge">3</div>
            <h3 class="step-heading">Pin to Toolbar</h3>
            <p class="step-paragraph">Click the puzzle extensions icon in Edge's address bar and toggle the pin icon next to the extension for instant one-click access whenever you work.</p>
          </div>

          <div class="install-step-box">
            <div class="step-badge">4</div>
            <h3 class="step-heading">Developer Unpacked</h3>
            <p class="step-paragraph">For offline testing, security audits, or local verification: clone or download the source repository from GitHub, navigate to <code>edge://extensions</code> in your browser, switch Developer mode on, and choose <strong>Load unpacked</strong>.</p>
          </div>
        </div>
        <div class="section-footer-privacy"><a href="/privacy" class="footer-privacy-link">&bull; Verified store packages &amp; audit guide &mdash; Read Privacy Policy</a></div>
      </div>
    </section>

    <!-- ======================================================================
         LABS / IN ACTIVE DEVELOPMENT (MailFlow)
         ====================================================================== -->
    <section class="labs-section" aria-labelledby="labsHeading">
      <div class="container">
        <h2 id="labsHeading" class="sr-only">Experimental &amp; Upcoming Projects</h2>
        <div class="labs-container-box">
          <div class="labs-info-group">
            <div class="labs-icon-box">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </div>
            <div>
              <div class="coming-soon-meta">
                <h3 class="coming-soon-title">MailFlow</h3>
                <span class="badge badge-mail">In Active Development</span>
              </div>
              <p class="coming-soon-desc">
                Gmail template manager with dynamic variables, compose shortcut auto-expansion, and scheduled sending.
              </p>
            </div>
          </div>

          <div class="labs-action-group">
            <a href="mailto:contact@extensionguy.me?subject=MailFlow%20launch%20notification" class="btn btn-edge btn-sm">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              Notify via email
            </a>
            <span class="badge badge-subtle">Coming Soon to Edge Add-ons</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ======================================================================
         CONTACT & SUPPORT SECTION
         ====================================================================== -->
    <section class="contact-section" id="contact" aria-labelledby="contactHeading">
      <div class="container">
        <div class="contact-card">
          <div class="section-eyebrow">Support &amp; Feedback</div>
          <h2 id="contactHeading" class="section-heading">Contact &amp; Developer Support</h2>
          <p class="section-lead" style="margin-inline: auto;">
            Need help with an extension, found a bug, or have a feature idea? You speak directly with the developer.
          </p>

          <div class="contact-grid">
            <div class="contact-item">
              <div class="contact-item-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                Direct Email Support
              </div>
              <p class="contact-item-desc">For inquiries, enterprise requests, or licensing support.</p>
              <a href="mailto:contact@extensionguy.me" class="contact-item-link">contact@extensionguy.me &rarr;</a>
            </div>

            <div class="contact-item">
              <div class="contact-item-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                GitHub Issue Tracker
              </div>
              <p class="contact-item-desc">File reproducible bug reports, regressions, or feature requests.</p>
              <a href="https://github.com/sidoua26-debug/extensions-portfolio/issues" target="_blank" rel="noopener noreferrer" class="contact-item-link">Open an Issue &rarr;</a>
            </div>

            <div class="contact-item">
              <div class="contact-item-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Privacy &amp; Data Policy
              </div>
              <p class="contact-item-desc">Verified documentation of our local-first, telemetry-free policy.</p>
              <a href="/privacy" class="contact-item-link">Read Privacy Policy &rarr;</a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ========================================================================
       FOOTER
       ======================================================================== -->
  <footer class="footer" role="contentinfo">
    <div class="container footer-inner">
      <div class="footer-left">
        <a href="#top" class="brand">
          <div class="brand-mark" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
          </div>
          <span>ExtensionGuy</span>
        </a>
        <p class="footer-copy">
          &copy; 2026 ExtensionGuy. Published extensions available on Microsoft Edge Add-ons and Chrome Web Store. Built local-first with no tracking.
        </p>
      </div>

      <div class="footer-links">
        <a href="/word-to-latex/" class="footer-link">Word to LaTeX</a>
        <a href="#portfolio" class="footer-link">Products</a>
        <a href="/word-to-latex-converter/" class="footer-link">Online Converter</a>
        <a href="/pdf-tools/" class="footer-link">Offline PDF Tools</a>
        <a href="#guides" class="footer-link">Guides</a>
        <a href="#contact" class="footer-link">Support &amp; Contact</a>
        <a href="/privacy" class="footer-link">Privacy Policy</a>
        <a href="/changelog/" class="footer-link">Changelog</a>
        <a href="https://github.com/sidoua26-debug/extensions-portfolio" target="_blank" rel="noopener noreferrer" class="footer-link">Source Code</a>
      </div>
    </div>
  </footer>

  <!-- ========================================================================
       ACCESSIBLE LIGHTBOX & PRODUCT PREVIEW MODAL
       ======================================================================== -->
    <div class="lightbox-modal" id="lightboxModal" role="dialog" aria-modal="true" aria-label="Interactive Product Preview" aria-describedby="lightboxCaption">
    <div class="lightbox-window">
      <button class="lightbox-close-btn" id="lightboxCloseBtn" type="button">&times;</button>

      <!-- Preview Modal Header -->
      <div class="preview-modal-header" id="previewModalHeader">
        <div class="preview-modal-title-group">
          <div class="preview-modal-badge-row">
            <span class="badge badge-edge" id="previewModalBadge">Extension Preview</span>
            <span class="preview-modal-tagline" id="previewModalTagline">Product Interface Showcase</span>
          </div>
          <h2 class="preview-modal-name" id="previewModalName"></h2>
        </div>
        <div class="preview-modal-actions">
          <a href="#" target="_blank" rel="noopener noreferrer" class="btn btn-edge btn-sm" id="previewModalStoreBtn">Get on Edge</a>
        </div>
      </div>

      <!-- Main Visual Viewport with Nav Arrows -->
      <div class="preview-viewport-wrap">
        <button class="preview-nav-btn prev" id="previewNavPrev" type="button">&lsaquo;</button>
        <img id="lightboxLargeImg" class="lightbox-large-img" src="assets/screenshots/placeholder-modal.png" alt="Enlarged screenshot preview" width="1280" height="800" loading="lazy" decoding="async">
        <button class="preview-nav-btn next" id="previewNavNext" type="button">&rsaquo;</button>
        <p id="lightboxCaption" class="lightbox-caption">Enlarged screenshot preview</p>
      </div>

      <!-- Gallery Thumbnail Navigation Strip -->
      <div class="preview-gallery-strip" id="previewGalleryStrip" role="tablist" aria-label="Screenshot gallery thumbnails">
        <!-- Dynamically rendered thumbnail buttons -->
      </div>

      <!-- Verified Product Capabilities & Privacy Brief -->
      <div class="preview-modal-details" id="previewModalDetails">
        <div class="preview-details-grid">
          <div class="preview-detail-col">
            <h3 class="preview-detail-title">What It Does</h3>
            <p class="preview-detail-desc" id="previewModalDesc"></p>
            <div class="preview-privacy-chip" id="previewModalPrivacy">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span id="previewModalPrivacyText"></span>
            </div>
          </div>
          <div class="preview-detail-col">
            <h3 class="preview-detail-title">Key Capabilities</h3>
            <ul class="preview-feature-list" id="previewModalFeatures"></ul>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="preview-modal-footer">
        <div class="preview-footer-info">
          <span>Verified Browser Store Distribution · No Ads · No Telemetry</span>
        </div>
        <div class="preview-footer-btns" id="previewModalFooterBtns">
          <a href="#" target="_blank" rel="noopener noreferrer" class="btn btn-chrome" id="previewModalFooterSecondary" style="display: none;">Get on Chrome</a>
          <a href="#" target="_blank" rel="noopener noreferrer" class="btn btn-edge" id="previewModalFooterPrimary">Get on Edge</a>
          <button type="button" class="btn btn-ghost" id="previewModalCloseFooter">Close Preview</button>
        </div>
      </div>
    </div>
  </div>

  <!-- ========================================================================
       SCRIPTS: THEMING, TABS, LIGHTBOX, ACCESSIBILITY, DEFERRED FOR PERFORMANCE
       ======================================================================== -->
  <script src="assets/js/site.js?v=20261029-1" defer></script>
  <script type="module" src="assets/js/converterUi.js"></script>
</body>
</html>
"""

# Verification: ensure all expected store versions from store-versions.json appear in html
def get_expected_version_badge(key):
    data = store_versions[key]
    if data.get("is_web_tool"):
        return None
    stores = data["stores"]
    parts = []
    if "edge" in stores:
        parts.append(f"Edge v{stores['edge']['version']}")
    if "chrome" in stores:
        parts.append(f"Chrome v{stores['chrome']['version']}")
    return f"Published versions: {' · '.join(parts)}"

for key in ["word-to-latex", "table-extractor", "bulkgrab", "seo-inspector", "bilexi", "tab-vault"]:
    expected_badge = get_expected_version_badge(key)
    assert expected_badge in html, f"Missing expected badge '{expected_badge}' in html for {key}"

assert "Updated Oct" not in html, "Stale date label 'Updated Oct' still present in html"

with open(REPO_ROOT / "index.html", "w", encoding="utf-8") as f:
    f.write(html)

print("Redesigned index.html successfully created and verified against store-versions.json!")
