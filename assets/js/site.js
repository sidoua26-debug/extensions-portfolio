/**
 * assets/js/site.js
 *
 * Core interactive behaviors for the extensions portfolio:
 * 1. Theme management (System Detection + Explicit Toggle + localStorage)
 * 2. Mobile navigation menu
 * 3. Flagship showcase tab switcher
 * 4. Accessible modal lightbox
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

// 4. Accessible Lightbox
(function initLightbox() {
  const modal = document.getElementById('lightboxModal');
  const modalImg = document.getElementById('lightboxLargeImg');
  const closeBtn = document.getElementById('lightboxCloseBtn');
  const caption = document.getElementById('lightboxCaption');
  const triggers = document.querySelectorAll('.lightbox-trigger');

  if (modal && modalImg && closeBtn) {
    let lastActiveElement = null;

    function openModal(img) {
      lastActiveElement = document.activeElement;
      const fullSrc = img.getAttribute('src') || img.src;
      const fullAlt = img.getAttribute('alt') || 'Enlarged screenshot preview';
      modalImg.src = fullSrc;
      modalImg.alt = fullAlt;
      if (caption) {
        caption.textContent = fullAlt;
      }
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      closeBtn.focus();
    }

    function closeModal() {
      if (!modal.classList.contains('active')) return;
      modal.classList.remove('active');
      document.body.style.overflow = '';
      if (lastActiveElement && typeof lastActiveElement.focus === 'function') {
        lastActiveElement.focus();
      }
    }

    triggers.forEach(img => {
      // Allow keyboard activation if the trigger is focusable
      if (!img.hasAttribute('tabindex')) {
        img.setAttribute('tabindex', '0');
        img.setAttribute('role', 'button');
        img.setAttribute('aria-label', `Enlarge screenshot: ${img.getAttribute('alt') || 'preview'}`);
      }
      img.addEventListener('click', () => openModal(img));
      img.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal(img);
        }
      });
    });

    closeBtn.addEventListener('click', closeModal);

    // Close on backdrop click (clicking outside the lightbox window)
    modal.addEventListener('click', (e) => {
      if (e.target === modal || !e.target.closest('.lightbox-window')) {
        closeModal();
      }
    });

    // Keyboard handlers: Escape to close, Tab to trap focus
    document.addEventListener('keydown', (e) => {
      if (!modal.classList.contains('active')) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        closeModal();
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
  }
})();
