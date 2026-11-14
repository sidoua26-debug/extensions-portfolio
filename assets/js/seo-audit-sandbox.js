/**
 * Interactive SEO Audit Sandbox Controller
 * ExtensionGuy — /demos/seo-audit-sandbox/
 *
 * Provides live DOM and metadata mutations to test in-browser SEO inspection:
 * 1. Missing H1 heading
 * 2. Skipped heading levels (H2 -> H5)
 * 3. Mismatched canonical tag (protocol, path, or domain differing from preferred URL)
 * 4. Incomplete Open Graph metadata (missing og:image / og:description)
 * 5. Malformed JSON-LD syntax (RFC 8259 syntax errors like trailing commas)
 * 6. Multiple H1 headings on a single document
 * 7. Client-side DOM mutations (tags injected dynamically after initial HTML)
 *
 * Initial state is clean, crawlable, and valid.
 * Reset button restores all initial DOM and head elements.
 */

(function () {
  'use strict';

  // --- Snapshot Initial State ---
  var originalCanonicalHref = 'https://extensionguy.me/demos/seo-audit-sandbox/';
  var originalOgImageContent = 'https://extensionguy.me/assets/og/seo-inspector-1200x630.png?v=2';
  var originalOgDescContent = 'Interactive debugging sandbox for technical SEO: test missing H1s, skipped heading levels, canonical mismatches, and malformed JSON-LD in a live browser.';

  // State flags
  var state = {
    missingH1: false,
    skippedHeadings: false,
    mismatchedCanonical: false,
    missingOg: false,
    malformedJsonLd: false,
    multipleH1: false,
    clientMutation: false
  };

  // --- Scenario 1: Missing H1 ---
  function applyMissingH1(active) {
    var h1Wrapper = document.getElementById('mainH1Wrapper');
    if (!h1Wrapper) return;

    if (active) {
      h1Wrapper.innerHTML = '<div class="faux-h1-heading" role="presentation" style="font-size: clamp(2rem, 4.5vw, 2.75rem); font-weight: 800; letter-spacing: -0.03em; line-height: 1.18; color: var(--text-main); margin-bottom: 14px;">Interactive Technical SEO Debugging Sandbox (Styled &lt;div&gt; - Not an H1)</div>';
    } else {
      h1Wrapper.innerHTML = '<h1 style="font-size: clamp(2rem, 4.5vw, 2.75rem); font-weight: 800; letter-spacing: -0.03em; margin-bottom: 14px; line-height: 1.18; color: var(--text-main);">Interactive Technical SEO Debugging Sandbox</h1>';
    }
  }

  // --- Scenario 2: Skipped Heading Levels ---
  function applySkippedHeadings(active) {
    var skippedContainer = document.getElementById('skippedHeadingTarget');
    if (!skippedContainer) return;

    if (active) {
      skippedContainer.innerHTML = '<h5 class="defect-highlight" style="font-size: 1rem; font-weight: 700; color: #b45309; margin: 12px 0 6px;">[Defect Active] &lt;h5&gt; Sub-Topic Jumping Directly from &lt;h2&gt;</h5><p style="font-size: 0.86rem; color: var(--text-secondary); margin: 0 0 10px;">This element is an &lt;h5&gt; placed directly inside an &lt;h2&gt; section, skipping &lt;h3&gt; and &lt;h4&gt; levels.</p>';
    } else {
      skippedContainer.innerHTML = '<h3 style="font-size: 1.1rem; font-weight: 700; color: var(--text-main); margin: 12px 0 6px;">&lt;h3&gt; Sequential Section Heading</h3><p style="font-size: 0.86rem; color: var(--text-secondary); margin: 0 0 10px;">Valid logical progression: parent &lt;h2&gt; followed properly by child &lt;h3&gt;.</p>';
    }
  }

  // --- Scenario 3: Mismatched Canonical ---
  function applyMismatchedCanonical(active) {
    var canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) return;

    if (active) {
      // Deliberately set HTTP non-slash URL differing from this demo's preferred HTTPS canonical
      canonical.setAttribute('href', 'http://extensionguy.me/demos/seo-audit-sandbox');
    } else {
      canonical.setAttribute('href', originalCanonicalHref);
    }
  }

  // --- Scenario 4: Missing Open Graph Metadata ---
  function applyMissingOg(active) {
    var head = document.head;
    var ogImage = document.querySelector('meta[property="og:image"]');
    var ogDesc = document.querySelector('meta[property="og:description"]');

    if (active) {
      if (ogImage) ogImage.remove();
      if (ogDesc) ogDesc.remove();
    } else {
      if (!document.querySelector('meta[property="og:image"]')) {
        var newImg = document.createElement('meta');
        newImg.setAttribute('property', 'og:image');
        newImg.setAttribute('content', originalOgImageContent);
        head.appendChild(newImg);
      }
      if (!document.querySelector('meta[property="og:description"]')) {
        var newDesc = document.createElement('meta');
        newDesc.setAttribute('property', 'og:description');
        newDesc.setAttribute('content', originalOgDescContent);
        head.appendChild(newDesc);
      }
    }
  }

  // --- Scenario 5: Malformed JSON-LD Syntax ---
  function applyMalformedJsonLd(active) {
    var existing = document.getElementById('defectMalformedJsonLd');

    if (active) {
      if (!existing) {
        var script = document.createElement('script');
        script.type = 'application/ld+json';
        script.id = 'defectMalformedJsonLd';
        // Intentionally malformed JSON: trailing comma after last property and unquoted key
        script.text = '{\n  "@context": "https://schema.org",\n  "@type": "WebApplication",\n  "name": "Defective JSON-LD Demo",\n  invalid_unquoted_key: true,\n  "trailingComma": "error",\n}';
        document.head.appendChild(script);
      }
    } else {
      if (existing) existing.remove();
    }
  }

  // --- Scenario 6: Multiple H1 Headings ---
  function applyMultipleH1(active) {
    var existing = document.getElementById('injectedSecondH1');

    if (active) {
      if (!existing) {
        var h1 = document.createElement('h1');
        h1.id = 'injectedSecondH1';
        h1.className = 'defect-highlight';
        h1.style.cssText = 'font-size: 1.5rem; font-weight: 800; color: #b45309; padding: 12px; background: var(--bg-muted); border: 2px dashed #f59e0b; border-radius: var(--r-md); margin: 16px 0;';
        h1.textContent = '[Defect Active] Second Top-Level <h1> Heading Injected Into Document Body';
        var mountPoint = document.getElementById('multipleH1Mount');
        if (mountPoint) mountPoint.appendChild(h1);
      }
    } else {
      if (existing) existing.remove();
    }
  }

  // --- Scenario 7: Client-Side DOM Mutation ---
  function applyClientMutation(active) {
    var existing = document.getElementById('clientDomMutationMount');
    if (!existing) return;

    if (active) {
      existing.innerHTML = '<div class="client-rendered-banner" style="padding: 14px 18px; background: var(--tint-seo-subtle); border: 1px solid var(--tint-seo-border); border-radius: var(--r-md); margin-top: 10px;"><strong style="color: var(--tint-seo); display: block; margin-bottom: 4px;">⚡ Client-Side Rendered Section (Dynamic Hydration)</strong><span style="font-size: 0.88rem; color: var(--text-secondary);">This element and its inner headings were created by JavaScript. View Source shows initial HTML, whereas in-browser inspection reads the live session DOM. Remember that Google performs its own crawling and rendering.</span><h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-main); margin-top: 8px;">Client-Injected &lt;h4&gt; Subheading</h4></div>';
    } else {
      existing.innerHTML = '<span style="font-size: 0.86rem; color: var(--text-tertiary); font-style: italic;">No client-side mutations active. HTML reflects initial static server output.</span>';
    }
  }

  // --- Live DOM Audit Readout Inspector ---
  function updateLiveAuditReadout() {
    var readoutEl = document.getElementById('liveAuditStatusBox');
    if (!readoutEl) return;

    // 1. H1 Count
    var h1s = document.querySelectorAll('h1');
    var h1Count = h1s.length;

    // 2. Headings hierarchy
    var headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    var hasLevelSkip = false;
    for (var i = 1; i < headings.length; i++) {
      var prevLevel = parseInt(headings[i - 1].tagName.substring(1), 10);
      var currLevel = parseInt(headings[i].tagName.substring(1), 10);
      if (currLevel > prevLevel + 1) {
        hasLevelSkip = true;
        break;
      }
    }

    // 3. Canonical Check
    var canonical = document.querySelector('link[rel="canonical"]');
    var canonicalHref = canonical ? canonical.getAttribute('href') : 'Missing';
    var isCanonicalValid = canonicalHref === originalCanonicalHref;

    // 4. Open Graph tags
    var ogImage = document.querySelector('meta[property="og:image"]');
    var ogDesc = document.querySelector('meta[property="og:description"]');
    var ogTitle = document.querySelector('meta[property="og:title"]');
    var ogValid = Boolean(ogImage && ogDesc && ogTitle);

    // 5. JSON-LD validity
    var jsonLdScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    var validJsonLdCount = 0;
    var syntaxErrorCount = 0;

    jsonLdScripts.forEach(function (s) {
      try {
        JSON.parse(s.text || s.textContent);
        validJsonLdCount++;
      } catch (e) {
        syntaxErrorCount++;
      }
    });

    // Render HTML
    readoutEl.innerHTML =
      '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; font-size: 0.84rem;">' +
        '<div class="audit-item" style="padding: 10px; background: var(--bg-surface); border: 1px solid var(--border-page); border-radius: var(--r-sm);">' +
          '<div style="font-weight: 600; color: var(--text-tertiary); margin-bottom: 2px;">Document H1 Count</div>' +
          '<div style="font-size: 1.1rem; font-weight: 700; color: ' + (h1Count === 1 ? 'var(--tint-seo)' : '#b45309') + ';">' +
            h1Count + (h1Count === 1 ? ' (Healthy: Exactly 1)' : (h1Count === 0 ? ' (Error: 0 detected)' : ' (Warning: Multiple H1s)')) +
          '</div>' +
        '</div>' +
        '<div class="audit-item" style="padding: 10px; background: var(--bg-surface); border: 1px solid var(--border-page); border-radius: var(--r-sm);">' +
          '<div style="font-weight: 600; color: var(--text-tertiary); margin-bottom: 2px;">Heading Hierarchy</div>' +
          '<div style="font-size: 1.1rem; font-weight: 700; color: ' + (!hasLevelSkip ? 'var(--tint-seo)' : '#b45309') + ';">' +
            (!hasLevelSkip ? 'Sequential (No Skips)' : 'Level Skip Detected') +
          '</div>' +
        '</div>' +
        '<div class="audit-item" style="padding: 10px; background: var(--bg-surface); border: 1px solid var(--border-page); border-radius: var(--r-sm);">' +
          '<div style="font-weight: 600; color: var(--text-tertiary); margin-bottom: 2px;">Canonical URL</div>' +
          '<div style="font-size: 0.85rem; font-family: var(--font-mono); font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: ' + (isCanonicalValid ? 'var(--tint-seo)' : '#b45309') + ';" title="' + canonicalHref + '">' +
            (isCanonicalValid ? 'Preferred HTTPS Canonical' : 'Differs from Preferred URL') +
          '</div>' +
        '</div>' +
        '<div class="audit-item" style="padding: 10px; background: var(--bg-surface); border: 1px solid var(--border-page); border-radius: var(--r-sm);">' +
          '<div style="font-weight: 600; color: var(--text-tertiary); margin-bottom: 2px;">Open Graph Metadata</div>' +
          '<div style="font-size: 1.1rem; font-weight: 700; color: ' + (ogValid ? 'var(--tint-seo)' : '#b45309') + ';">' +
            (ogValid ? 'Complete (Image & Desc)' : 'Incomplete / Missing') +
          '</div>' +
        '</div>' +
        '<div class="audit-item" style="padding: 10px; background: var(--bg-surface); border: 1px solid var(--border-page); border-radius: var(--r-sm);">' +
          '<div style="font-weight: 600; color: var(--text-tertiary); margin-bottom: 2px;">JSON-LD Syntax</div>' +
          '<div style="font-size: 1.1rem; font-weight: 700; color: ' + (syntaxErrorCount === 0 ? 'var(--tint-seo)' : '#dc2626') + ';">' +
            validJsonLdCount + ' Valid' + (syntaxErrorCount > 0 ? ' (' + syntaxErrorCount + ' Syntax Error!)' : '') +
          '</div>' +
        '</div>' +
      '</div>';
  }

  // --- Reset All Scenarios ---
  function resetAll() {
    state.missingH1 = false;
    state.skippedHeadings = false;
    state.mismatchedCanonical = false;
    state.missingOg = false;
    state.malformedJsonLd = false;
    state.multipleH1 = false;
    state.clientMutation = false;

    applyMissingH1(false);
    applySkippedHeadings(false);
    applyMismatchedCanonical(false);
    applyMissingOg(false);
    applyMalformedJsonLd(false);
    applyMultipleH1(false);
    applyClientMutation(false);

    // Update all toggle buttons
    var buttons = document.querySelectorAll('[data-scenario-toggle]');
    buttons.forEach(function (btn) {
      btn.setAttribute('aria-pressed', 'false');
      var label = btn.querySelector('.toggle-label');
      if (label) label.textContent = 'Enable Defect';
      btn.classList.remove('btn-active-defect');
    });

    var statusTags = document.querySelectorAll('[data-scenario-status]');
    statusTags.forEach(function (tag) {
      tag.className = 'badge badge-subtle';
      tag.textContent = 'Healthy (Baseline)';
    });

    updateLiveAuditReadout();
  }

  // --- Initialize Event Listeners ---
  function initControls() {
    var scenarios = [
      { id: 'missing-h1', flag: 'missingH1', apply: applyMissingH1 },
      { id: 'skipped-headings', flag: 'skippedHeadings', apply: applySkippedHeadings },
      { id: 'mismatched-canonical', flag: 'mismatchedCanonical', apply: applyMismatchedCanonical },
      { id: 'missing-og', flag: 'missingOg', apply: applyMissingOg },
      { id: 'malformed-jsonld', flag: 'malformedJsonLd', apply: applyMalformedJsonLd },
      { id: 'multiple-h1', flag: 'multipleH1', apply: applyMultipleH1 },
      { id: 'client-mutation', flag: 'clientMutation', apply: applyClientMutation }
    ];

    scenarios.forEach(function (sc) {
      var btn = document.querySelector('[data-scenario-toggle="' + sc.id + '"]');
      var statusTag = document.querySelector('[data-scenario-status="' + sc.id + '"]');
      if (!btn) return;

      btn.addEventListener('click', function () {
        var current = state[sc.flag];
        var next = !current;
        state[sc.flag] = next;

        btn.setAttribute('aria-pressed', String(next));
        var label = btn.querySelector('.toggle-label');

        if (next) {
          if (label) label.textContent = 'Restore Healthy State';
          btn.classList.add('btn-active-defect');
          if (statusTag) {
            statusTag.className = 'badge badge-audit';
            statusTag.textContent = 'Defect Active';
          }
        } else {
          if (label) label.textContent = 'Enable Defect';
          btn.classList.remove('btn-active-defect');
          if (statusTag) {
            statusTag.className = 'badge badge-subtle';
            statusTag.textContent = 'Healthy (Baseline)';
          }
        }

        sc.apply(next);
        updateLiveAuditReadout();
      });
    });

    var resetBtn = document.getElementById('resetAllScenariosBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        resetAll();
        var orig = resetBtn.textContent;
        resetBtn.textContent = 'Reset Complete!';
        setTimeout(function () {
          resetBtn.textContent = orig;
        }, 1500);
      });
    }

    updateLiveAuditReadout();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initControls);
  } else {
    initControls();
  }
})();
