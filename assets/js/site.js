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
  const triggers = document.querySelectorAll('.lightbox-trigger');

  if (modal && modalImg && closeBtn) {
    triggers.forEach(img => {
      img.addEventListener('click', () => {
        modalImg.src = img.src;
        modalImg.alt = img.alt || 'Enlarged screenshot preview';
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        closeBtn.focus();
      });
    });

    function closeModal() {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        closeModal();
      }
    });
  }
})();
