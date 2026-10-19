/**
 * assets/js/site.js
 *
 * Core interactive behaviors for ExtensionGuy portfolio:
 * 1. Theme management (System Detection + Explicit Toggle + localStorage)
 * 2. Mobile navigation menu
 * 3. Flagship showcase tab switcher
 * 4. Interactive Product Preview & Accessible Screenshot Lightbox
 */

// 1. Theme Management (System Detection + Explicit Toggle + localStorage)
(function initTheming() {
  const root = document.documentElement;
  const toggle = document.getElementById('themeToggle');
  const saved = localStorage.getItem('theme');
  if (saved) {
    root.setAttribute('data-theme', saved);
  }

  if (toggle) {
    toggle.addEventListener('click', () => {
      const current = root.getAttribute('data-theme');
      const isDark = current === 'dark' || (!current && window.matchMedia('(prefers-color-scheme: dark)').matches);
      const next = isDark ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
    });
  }
})();

// 2. Mobile Menu Handling
(function initMobileNav() {
  const btn = document.getElementById('mobileMenuBtn');
  const menu = document.getElementById('navLinks');

  if (btn && menu) {
    btn.addEventListener('click', () => {
      const isOpen = menu.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(isOpen));
    });

    menu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        menu.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      });
    });
  }
})();

// 3. Flagship Showcase Tab Switcher (with keyboard arrow support)
(function initShowcaseTabs() {
  const tabs = Array.from(document.querySelectorAll('.tab-trigger'));
  const panels = Array.from(document.querySelectorAll('.showcase-img'));

  function selectTab(index) {
    tabs.forEach((t, i) => {
      const active = i === index;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', String(active));
    });
    panels.forEach((p, i) => {
      p.classList.toggle('active', i === index);
    });
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(index));
    tab.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const next = (index + 1) % tabs.length;
        selectTab(next);
        tabs[next].focus();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prev = (index - 1 + tabs.length) % tabs.length;
        selectTab(prev);
        tabs[prev].focus();
      }
    });
  });
})();

// 4. Interactive Product Preview & Accessible Screenshot Lightbox
(function initProductPreviewModal() {
  const modal = document.getElementById('lightboxModal');
  if (!modal) return;
  const modalImg = document.getElementById('lightboxLargeImg');
  const closeBtn = document.getElementById('lightboxCloseBtn');
  const caption = document.getElementById('lightboxCaption');
  const triggers = document.querySelectorAll('.lightbox-trigger');
  const previewBtns = document.querySelectorAll('.btn-preview');

  const modalName = document.getElementById('previewModalName');
  const modalTagline = document.getElementById('previewModalTagline');
  const modalBadge = document.getElementById('previewModalBadge');
  const modalDesc = document.getElementById('previewModalDesc');
  const modalPrivacy = document.getElementById('previewModalPrivacyText');
  const modalFeatures = document.getElementById('previewModalFeatures');
  const modalGallery = document.getElementById('previewGalleryStrip');
  const modalStoreBtn = document.getElementById('previewModalStoreBtn');
  const modalFooterPrimary = document.getElementById('previewModalFooterPrimary');
  const modalFooterSecondary = document.getElementById('previewModalFooterSecondary');
  const modalFooterClose = document.getElementById('previewModalCloseFooter');
  const prevBtn = document.getElementById('previewNavPrev');
  const nextBtn = document.getElementById('previewNavNext');

  // Ground-truth product catalog with real verified screenshots & capabilities
  const PRODUCT_PREVIEWS = {
    'word-to-latex': {
      name: 'Word to LaTeX',
      badge: 'Flagship · 100% Offline WASM',
      tagline: 'Offline Document & Math Converter',
      description: 'Converts Microsoft Word (.docx) documents, complex equations, and tables into clean LaTeX snippets or complete compilable documents entirely inside your browser using Pandoc compiled to WebAssembly.',
      privacyNote: '100% Offline Engine: Pandoc WebAssembly runs locally in a dedicated Web Worker. Zero files or data ever leave your device.',
      installUrl: 'https://microsoftedge.microsoft.com/addons/detail/lpehnpdkdiddlppobkcicdondaebijlf',
      installLabel: 'Get on Edge',
      screenshots: [
        { src: 'assets/screenshots/w2l-2-output.png', label: 'LaTeX Output', caption: 'Instant compilation-ready LaTeX output with one-click clipboard sync confirmation' },
        { src: 'assets/screenshots/w2l-1-upload.png', label: 'DOCX Dropzone', caption: 'Word to LaTeX local DOCX file upload view with instant client-side parsing' },
        { src: 'assets/screenshots/w2l-3-paste.png', label: 'Table Paste', caption: 'Word to LaTeX pasted table conversion preserving clean booktabs formatting' },
        { src: 'assets/screenshots/w2l-4-image.png', label: 'Image OCR', caption: 'Word to LaTeX experimental offline math image OCR powered by local Tesseract.js' },
      ],
      features: [
        'Preserves headings, bold/italics, nested lists, and table alignment',
        'Transforms tables into clean booktabs and longtable environments',
        'Outputs complete compilable LaTeX documents or inline body fragments',
        'Runs 100% air-gapped on your device with zero remote telemetry'
      ]
    },
    'table-extractor': {
      name: 'Table Extractor',
      badge: 'Data & Research · CSV / XLSX / JSON',
      tagline: 'HTML & Virtualized Data Grid Exporter',
      description: 'Instantly detects and extracts tabular data from any webpage, including virtualized AG Grid, handsontable, and complex HTML tables, into beautifully formatted Excel spreadsheets, CSVs, or JSON arrays.',
      privacyNote: 'Client-Side Processing: Table DOM parsing and spreadsheet generation happen entirely in browser memory. No data sent to any server.',
      installUrl: 'https://microsoftedge.microsoft.com/addons/detail/pekammppimoaikllkhhebocbkbidoboe',
      installLabel: 'Get on Edge',
      secondaryInstallUrl: 'https://chromewebstore.google.com/detail/fjpbjpmccomonleefghgalfoioekhlhm?utm_source=item-share-cb',
      secondaryInstallLabel: 'Get on Chrome',
      screenshots: [
        { src: 'assets/screenshots/table-1-detection.png', label: 'Table Detection', caption: 'Table Extractor detecting HTML tables with live row and column metrics' },
        { src: 'assets/screenshots/table-2-virtualized.png', label: 'Virtualized Grid', caption: 'Virtualized data grid capture scrolling through high-volume tables' },
        { src: 'assets/screenshots/table-3-pro.png', label: 'Excel & CSV Export', caption: 'Multi-format export supporting Excel (XLSX), CSV with UTF-8 BOM, and JSON' },
        { src: 'assets/screenshots/table-4-options.png', label: 'Data Cleansing', caption: 'Granular column selection, header remapping, and data cleansing options' },
      ],
      features: [
        'Auto-detects standard HTML tables and dynamic virtualized data grids',
        'UTF-8 with BOM encoding guarantees instant, seamless Microsoft Excel opening',
        'Custom row range selection and hidden column recovery',
        '100% browser-local extraction without sending page content to any server'
      ]
    },
    'bulkgrab': {
      name: 'BulkGrab',
      badge: 'File Productivity · Local ZIP Bundler',
      tagline: 'Batch File Downloader & Local Archiver',
      description: 'Deep-scans webpages for downloadable files, documents (PDF, DOCX), archives, images, and media. Filter by extension, select files in a non-intrusive floating panel, and download them individually or bundled into a single ZIP archive on-device.',
      privacyNote: 'Direct Downloads Only: Files download directly to your device; on-device ZIP packaging via JSZip with zero cloud uploads.',
      installUrl: 'https://microsoftedge.microsoft.com/addons/detail/cphidoikhnjdkeldgelkpddnkojlfccc',
      installLabel: 'Get on Edge',
      secondaryInstallUrl: 'https://chromewebstore.google.com/detail/lnmmneljpgdefilkokfpmiohjgfjcljn?utm_source=item-share-cb',
      secondaryInstallLabel: 'Get on Chrome',
      screenshots: [
        { src: 'assets/screenshots/bulkgrab-1-panel.png', label: 'In-Page Panel', caption: 'BulkGrab interactive floating file detection panel' },
        { src: 'assets/screenshots/bulkgrab-2-popup.png', label: 'Smart Filters', caption: 'Smart category filters isolating PDFs, documents, media, and archives' },
        { src: 'assets/screenshots/bulkgrab-3-options.png', label: 'ZIP Packaging', caption: 'Client-side ZIP packaging bundling multi-file batches on-device' },
      ],
      features: [
        'Smart scan for PDFs, images, archives, and media across complex sites',
        'Shadow DOM isolated in-page panel that never interferes with host site CSS',
        'Client-side ZIP packaging bundling multi-file batches on-device',
        'Direct browser downloads with zero intermediary servers'
      ]
    },
    'seo-inspector': {
      name: 'SEO Inspector',
      badge: 'SEO & Engineering · 9 Diagnostic Tabs',
      tagline: 'On-Page Technical SEO Diagnostics',
      description: 'Comprehensive technical SEO inspection tool providing instant audits of document heading hierarchy, meta tags, Open Graph cards, canonical validation, hreflang links, JSON-LD structured data, and W3C Navigation Timing benchmarks in a single click.',
      privacyNote: '100% Local Inspection: Evaluates active tab DOM and performance APIs in memory without logging browsing history or calling remote APIs.',
      installUrl: 'https://microsoftedge.microsoft.com/addons/detail/jbnjjkfkcmfkjamakndojbkjanijlfmd',
      installLabel: 'Get on Edge',
      screenshots: [
        { src: 'assets/screenshots/seo-1-overview.png', label: 'Overview Tab', caption: 'SEO Inspector overview diagnostics tab' },
        { src: 'assets/screenshots/seo-2-content.png', label: 'Headings & Content', caption: 'Visual H1-H6 heading hierarchy outline and content density analysis' },
        { src: 'assets/screenshots/seo-3-links.png', label: 'Links & Images', caption: 'Comprehensive link inspection detecting broken, insecure, or missing tags' },
        { src: 'assets/screenshots/seo-4-schema.png', label: 'JSON-LD Schema', caption: 'Interactive JSON-LD structured data parser and Schema.org validator' },
        { src: 'assets/screenshots/seo-5-issues.png', label: 'Issue Tracker', caption: 'Actionable technical issue tracker and one-click diagnostics report export' },
      ],
      features: [
        'Visual H1-H6 outline detector catching skipping heading levels',
        'JSON-LD Schema validator parsing nested entities on active tab',
        'Core Web Vitals and Navigation Timing API performance breakdown',
        'Private in-browser analysis with zero analytics trackers'
      ]
    },
    'bilexi': {
      name: 'Bilexi',
      badge: 'Typing & Language · 100% Offline Engine',
      tagline: 'Offline Bilingual Autocorrect (EN/FR)',
      description: 'Real-time bilingual autocorrect for English and French text inputs. Automatically restores missing French accents, repairs elisions and contractions, and provides an interactive keyboard-driven suggestion strip with sub-0.2ms latency—completely offline.',
      privacyNote: '100% Offline Engine: Operates on bundled binary dictionaries with zero remote host permissions. Keystrokes are processed purely in-memory.',
      installUrl: 'https://microsoftedge.microsoft.com/addons/detail/mheomahlcfddgjlemnolopfbhojfpmpb',
      installLabel: 'Get on Edge',
      screenshots: [
        { src: 'assets/screenshots/bilexi-1-hero.png', label: 'Accent Restoration', caption: 'Bilexi bilingual autocorrect in browser text field' },
        { src: 'assets/screenshots/bilexi-2-suggestions.png', label: 'Suggestion Strip', caption: 'Interactive suggestion strip with Alt+2 / Alt+3 hotkey selection' },
        { src: 'assets/screenshots/bilexi-3-privacy.png', label: 'Offline Architecture', caption: '100% offline binary dictionaries with zero remote host permissions' },
        { src: 'assets/screenshots/bilexi-4-customization.png', label: 'Custom Dictionary', caption: 'Personal vocabulary and custom dictionary rules stored in chrome.storage.local' },
        { src: 'assets/screenshots/bilexi-5-compatibility.png', label: 'Web Compatibility', caption: 'Broad web compatibility across standard inputs, textareas, and contenteditables' },
      ],
      features: [
        'Instant French accent restoration (ecole → école, deja → déjà)',
        'Automated elision and contraction repair (cest → c\'est, dont → don\'t)',
        'Keyboard-accessible suggestion strip and floating undo chip',
        '100% offline binary dictionaries with zero host permissions or network calls'
      ]
    }
  };

  let currentProductKey = 'word-to-latex';
  let currentScreenshotIndex = 0;
  let lastActiveElement = null;

  function renderGallery(prod, activeIdx) {
    if (!modalGallery) return;
    modalGallery.innerHTML = '';
    prod.screenshots.forEach((s, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `gallery-thumb-btn ${idx === activeIdx ? 'active' : ''}`;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', String(idx === activeIdx));
      btn.setAttribute('aria-label', `View screenshot ${idx + 1}: ${s.label}`);
      btn.innerHTML = `<span class="thumb-num">${idx + 1}</span><span class="thumb-title">${s.label}</span>`;
      btn.addEventListener('click', () => {
        setScreenshot(idx);
      });
      modalGallery.appendChild(btn);
    });
  }

  function setScreenshot(index) {
    if (!currentProductKey || !PRODUCT_PREVIEWS[currentProductKey]) return;
    const prod = PRODUCT_PREVIEWS[currentProductKey];
    const total = prod.screenshots ? prod.screenshots.length : 0;
    if (total === 0) return;
    // Circular navigation: wrap around seamlessly
    if (index < 0) index = total - 1;
    if (index >= total) index = 0;
    currentScreenshotIndex = index;

    const shot = prod.screenshots[index];
    if (modalImg) {
      modalImg.src = shot.src;
      modalImg.alt = shot.caption;
    }
    if (caption) {
      caption.textContent = shot.caption;
    }

    // Update active thumb
    if (modalGallery) {
      const thumbs = modalGallery.querySelectorAll('.gallery-thumb-btn');
      thumbs.forEach((t, i) => {
        const isActive = i === index;
        t.classList.toggle('active', isActive);
        t.setAttribute('aria-selected', String(isActive));
      });
    }
  }

  function openPreview(prodKey, initialImgSrc, initialAlt) {
    lastActiveElement = document.activeElement;
    currentProductKey = (prodKey && PRODUCT_PREVIEWS[prodKey]) ? prodKey : 'word-to-latex';
    const prod = PRODUCT_PREVIEWS[currentProductKey];

    if (modalName) modalName.textContent = prod.name;
    if (modalTagline) modalTagline.textContent = prod.tagline;
    if (modalBadge) modalBadge.textContent = prod.badge;
    if (modalDesc) modalDesc.textContent = prod.description;
    if (modalPrivacy) modalPrivacy.textContent = prod.privacyNote;

    if (modalStoreBtn) {
      modalStoreBtn.href = prod.installUrl;
      modalStoreBtn.textContent = prod.installLabel || 'Get on Edge';
    }
    if (modalFooterPrimary) {
      modalFooterPrimary.href = prod.installUrl;
      modalFooterPrimary.textContent = prod.installLabel || 'Get on Edge';
    }

    if (modalFooterSecondary) {
      if (prod.secondaryInstallUrl) {
        modalFooterSecondary.style.display = 'inline-flex';
        modalFooterSecondary.href = prod.secondaryInstallUrl;
        modalFooterSecondary.textContent = prod.secondaryInstallLabel || 'Get on Chrome';
      } else {
        modalFooterSecondary.style.display = 'none';
      }
    }

    if (modalFeatures) {
      modalFeatures.innerHTML = '';
      prod.features.forEach(f => {
        const li = document.createElement('li');
        li.textContent = f;
        modalFeatures.appendChild(li);
      });
    }

    // Determine initial screenshot
    let initialIdx = 0;
    if (initialImgSrc) {
      const foundIdx = prod.screenshots.findIndex(s => s.src === initialImgSrc || initialImgSrc.endsWith(s.src));
      if (foundIdx >= 0) initialIdx = foundIdx;
    }

    renderGallery(prod, initialIdx);
    setScreenshot(initialIdx);

    // If caller passed explicit trigger image src/alt, preserve them exactly for test seams
    if (initialImgSrc && modalImg) {
      modalImg.src = initialImgSrc;
      if (initialAlt) {
        modalImg.alt = initialAlt;
        if (caption) caption.textContent = initialAlt;
      }
    }

    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
    if (closeBtn) {
      closeBtn.focus();
    }
  }

  function closeModal() {
    if (!modal || !modal.classList.contains('active')) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
    if (lastActiveElement && typeof lastActiveElement.focus === 'function') {
      lastActiveElement.focus();
    }
  }

  // Handle direct "Preview" buttons on product cards
  previewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const prodKey = btn.getAttribute('data-preview');
      openPreview(prodKey);
    });
  });

  // Handle screenshot clicks (.lightbox-trigger)
  triggers.forEach(img => {
    if (!img.hasAttribute('tabindex')) {
      img.setAttribute('tabindex', '0');
      img.setAttribute('role', 'button');
      img.setAttribute('aria-label', `Enlarge screenshot: ${img.getAttribute('alt') || 'preview'}`);
    }

    function handleTrigger() {
      const card = img.closest('.product-card');
      const prodKey = card ? card.id : 'word-to-latex';
      const src = img.getAttribute('src') || img.src;
      const alt = img.getAttribute('alt') || 'Enlarged screenshot preview';
      openPreview(prodKey, src, alt);
    }

    img.addEventListener('click', handleTrigger);
    img.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleTrigger();
      }
    });
  });

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (modalFooterClose) modalFooterClose.addEventListener('click', closeModal);

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      setScreenshot(currentScreenshotIndex - 1);
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      setScreenshot(currentScreenshotIndex + 1);
    });
  }

  // Close on backdrop click (clicking outside the lightbox window)
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal || !e.target.closest('.lightbox-window')) {
        closeModal();
      }
    });
  }

  // Keyboard handlers: Escape to close, Arrow keys to navigate, Tab to trap focus
  document.addEventListener('keydown', (e) => {
    if (!modal || !modal.classList.contains('active')) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setScreenshot(currentScreenshotIndex + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setScreenshot(currentScreenshotIndex - 1);
    } else if (e.key === 'Tab') {
      const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first || !modal.contains(document.activeElement)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last || !modal.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  });
})();
