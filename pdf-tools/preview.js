/**
 * Contextual PDF Preview Controller for Offline PDF Studio
 * Reuses existing window.pdfjsLib infrastructure. Zero external dependencies.
 */

// Safe helper to obtain pdfjsLib with polling fallback if app.js is evaluating
async function getPdfjs() {
  if (window.pdfjsLib) return window.pdfjsLib;
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 50));
    if (window.pdfjsLib) return window.pdfjsLib;
  }
  return null;
}

// Helper to format bytes
function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

// Range parser for Split tool (e.g. "1-3, 5")
function parsePageRange(rangeStr, maxPages) {
  if (!rangeStr || !rangeStr.trim() || !maxPages) return new Set();
  const pages = new Set();
  const parts = rangeStr.split(/[,;\s]+/);
  for (const part of parts) {
    if (!part) continue;
    if (part.includes("-")) {
      const [startStr, endStr] = part.split("-");
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        const min = Math.max(1, Math.min(start, end));
        const max = Math.min(maxPages, Math.max(start, end));
        for (let p = min; p <= max; p++) pages.add(p);
      }
    } else {
      const p = parseInt(part, 10);
      if (!isNaN(p) && p >= 1 && p <= maxPages) {
        pages.add(p);
      }
    }
  }
  return pages;
}

class SingleDocPreview {
  constructor({
    canvasId, prevBtnId, nextBtnId, counterId, emptyId, stageId, badgeId, defaultEmptyText,
    zoomOutId, zoomInId, zoomValId, zoomFitId, zoomResetId, zoomExpandId, expandTitle
  }) {
    this.canvas = document.getElementById(canvasId);
    this.prevBtn = document.getElementById(prevBtnId);
    this.nextBtn = document.getElementById(nextBtnId);
    this.counter = document.getElementById(counterId);
    this.emptyState = document.getElementById(emptyId);
    this.stage = document.getElementById(stageId);
    this.badge = badgeId ? document.getElementById(badgeId) : null;
    this.defaultEmptyText = defaultEmptyText || this.emptyState?.querySelector("p")?.textContent || "No file selected.";

    // Zoom controls
    this.zoomOutBtn = zoomOutId ? document.getElementById(zoomOutId) : null;
    this.zoomInBtn = zoomInId ? document.getElementById(zoomInId) : null;
    this.zoomValBadge = zoomValId ? document.getElementById(zoomValId) : null;
    this.zoomFitBtn = zoomFitId ? document.getElementById(zoomFitId) : null;
    this.zoomResetBtn = zoomResetId ? document.getElementById(zoomResetId) : null;
    this.zoomExpandBtn = zoomExpandId ? document.getElementById(zoomExpandId) : null;
    this.expandTitle = expandTitle || "Document Preview";

    this.zoomMode = "fit"; // "fit" or numeric 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5
    this.zoomSteps = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5];
    this.currentZoomIndex = 2; // 1.0 (100%)

    this.pdf = null;
    this.loadingTask = null;
    this.currentRenderTask = null;
    this.currentPage = 1;
    this.totalPages = 0;
    this.loadGeneration = 0;
    this.renderGeneration = 0;

    if (this.prevBtn) {
      this.prevBtn.addEventListener("click", () => this.navigate(-1));
    }
    if (this.nextBtn) {
      this.nextBtn.addEventListener("click", () => this.navigate(1));
    }

    // Attach zoom listeners
    this.zoomOutBtn?.addEventListener("click", () => this.zoomStep(-1));
    this.zoomInBtn?.addEventListener("click", () => this.zoomStep(1));
    this.zoomFitBtn?.addEventListener("click", () => this.setZoomMode("fit"));
    this.zoomResetBtn?.addEventListener("click", () => this.setZoomMode(1.0));
    this.zoomExpandBtn?.addEventListener("click", () => this.openExpandModal());

    this.updateZoomUI();
  }

  setEmptyMessage(text) {
    if (!this.emptyState) return;
    const p = this.emptyState.querySelector("p");
    if (p) {
      p.textContent = text;
    }
  }

  updateZoomUI() {
    const hasDoc = Boolean(this.pdf);
    if (this.zoomOutBtn) {
      this.zoomOutBtn.disabled = !hasDoc || (this.zoomMode !== "fit" && this.currentZoomIndex <= 0);
    }
    if (this.zoomInBtn) {
      this.zoomInBtn.disabled = !hasDoc || (this.zoomMode !== "fit" && this.currentZoomIndex >= this.zoomSteps.length - 1);
    }
    if (this.zoomFitBtn) {
      this.zoomFitBtn.disabled = !hasDoc;
      this.zoomFitBtn.classList.toggle("active", this.zoomMode === "fit");
    }
    if (this.zoomResetBtn) {
      this.zoomResetBtn.disabled = !hasDoc;
      this.zoomResetBtn.classList.toggle("active", this.zoomMode === 1.0);
    }
    if (this.zoomExpandBtn) {
      this.zoomExpandBtn.disabled = !hasDoc;
    }
    if (this.zoomValBadge) {
      if (!hasDoc) {
        this.zoomValBadge.textContent = "Fit";
      } else if (this.zoomMode === "fit") {
        this.zoomValBadge.textContent = "Fit";
      } else {
        this.zoomValBadge.textContent = `${Math.round(this.zoomSteps[this.currentZoomIndex] * 100)}%`;
      }
    }
  }

  setZoomMode(mode) {
    if (!this.pdf) return;
    if (mode === "fit") {
      this.zoomMode = "fit";
    } else {
      const target = typeof mode === "number" ? mode : 1.0;
      let closestIdx = 2; // default 1.0
      let minDiff = Infinity;
      this.zoomSteps.forEach((s, idx) => {
        const diff = Math.abs(s - target);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = idx;
        }
      });
      this.currentZoomIndex = closestIdx;
      this.zoomMode = this.zoomSteps[closestIdx];
    }
    this.updateZoomUI();
    this.renderPage(this.currentPage);
  }

  zoomStep(delta) {
    if (!this.pdf) return;
    if (this.zoomMode === "fit") {
      // Transition from fit to closest numeric step
      this.currentZoomIndex = delta > 0 ? 3 : 1; // 1.25 or 0.75
      this.zoomMode = this.zoomSteps[this.currentZoomIndex];
    } else {
      const nextIdx = Math.max(0, Math.min(this.zoomSteps.length - 1, this.currentZoomIndex + delta));
      this.currentZoomIndex = nextIdx;
      this.zoomMode = this.zoomSteps[nextIdx];
    }
    this.updateZoomUI();
    this.renderPage(this.currentPage);
  }

  openExpandModal() {
    if (!this.pdf) return;
    const existing = document.getElementById("active-expand-backdrop");
    if (existing) existing.remove();

    const backdrop = document.createElement("div");
    backdrop.id = "active-expand-backdrop";
    backdrop.className = "preview-expand-backdrop";
    backdrop.setAttribute("role", "dialog");
    backdrop.setAttribute("aria-modal", "true");
    backdrop.setAttribute("aria-label", this.expandTitle);

    backdrop.innerHTML = `
      <div class="preview-expand-modal">
        <div class="preview-expand-header">
          <div class="preview-expand-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
            <span>${this.expandTitle} (Expanded Workspace)</span>
          </div>
          <div style="display:flex; align-items:center; gap: 0.75rem;">
            <div class="preview-zoom-toolbar">
              <button type="button" id="modal-zoom-out" class="preview-zoom-btn" aria-label="Zoom Out">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
              <span id="modal-zoom-val" class="preview-zoom-badge" aria-live="polite">100%</span>
              <button type="button" id="modal-zoom-in" class="preview-zoom-btn" aria-label="Zoom In">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
              <span class="preview-zoom-divider" aria-hidden="true"></span>
              <button type="button" id="modal-zoom-fit" class="preview-zoom-btn">Fit</button>
              <button type="button" id="modal-zoom-reset" class="preview-zoom-btn">100%</button>
            </div>
            <button type="button" class="preview-expand-close-btn" id="modal-expand-close">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              Close (Esc)
            </button>
          </div>
        </div>
        <div class="preview-expand-body">
          <div class="preview-canvas-card" style="box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
            <canvas id="modal-expand-canvas" aria-label="${this.expandTitle} Fullscreen Preview"></canvas>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    const modalCanvas = backdrop.querySelector("#modal-expand-canvas");
    let modalZoom = 1.0;

    const renderModalPage = async () => {
      if (!this.pdf || !modalCanvas) return;
      const page = await this.pdf.getPage(this.currentPage);
      const unscaledViewport = page.getViewport({ scale: 1.0 });
      let scale = modalZoom;
      if (modalZoom === "fit") {
        const bodyEl = backdrop.querySelector(".preview-expand-body");
        const availableW = Math.max(300, (bodyEl?.clientWidth || 900) - 60);
        scale = availableW / unscaledViewport.width;
      }
      const dpr = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: scale * dpr });
      modalCanvas.width = Math.floor(viewport.width);
      modalCanvas.height = Math.floor(viewport.height);
      modalCanvas.style.width = `${Math.floor(unscaledViewport.width * scale)}px`;
      modalCanvas.style.height = `${Math.floor(unscaledViewport.height * scale)}px`;

      const ctx = modalCanvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, modalCanvas.width, modalCanvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
      page.cleanup();

      const badge = backdrop.querySelector("#modal-zoom-val");
      if (badge) {
        badge.textContent = modalZoom === "fit" ? "Fit" : `${Math.round(modalZoom * 100)}%`;
      }
    };

    renderModalPage();

    backdrop.querySelector("#modal-zoom-out")?.addEventListener("click", () => {
      modalZoom = modalZoom === "fit" ? 0.75 : Math.max(0.5, modalZoom - 0.25);
      renderModalPage();
    });
    backdrop.querySelector("#modal-zoom-in")?.addEventListener("click", () => {
      modalZoom = modalZoom === "fit" ? 1.25 : Math.min(2.5, modalZoom + 0.25);
      renderModalPage();
    });
    backdrop.querySelector("#modal-zoom-fit")?.addEventListener("click", () => {
      modalZoom = "fit";
      renderModalPage();
    });
    backdrop.querySelector("#modal-zoom-reset")?.addEventListener("click", () => {
      modalZoom = 1.0;
      renderModalPage();
    });

    const closeModal = () => {
      backdrop.remove();
      document.removeEventListener("keydown", handleKey);
      this.zoomExpandBtn?.focus();
    };

    const handleKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeModal();
      }
    };

    backdrop.querySelector("#modal-expand-close")?.addEventListener("click", closeModal);
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closeModal();
    });
    document.addEventListener("keydown", handleKey);
  }

  async loadBytes(arrayBuffer) {
    const currentGen = ++this.loadGeneration;
    await this.cleanup();

    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      this.setEmptyMessage("Selected file is empty.");
      this.updateZoomUI();
      return;
    }

    const pdfjs = await getPdfjs();
    if (!pdfjs) {
      console.warn("pdfjsLib not ready for preview");
      this.setEmptyMessage("PDF engine initializing, please reselect file.");
      this.updateZoomUI();
      return;
    }

    try {
      this.loadingTask = pdfjs.getDocument({
        data: new Uint8Array(arrayBuffer),
        cMapUrl: new URL("cmaps/", window.location.href).href,
        cMapPacked: true,
        standardFontDataUrl: new URL("standard_fonts/", window.location.href).href
      });

      const loadedPdf = await this.loadingTask.promise;
      if (this.loadGeneration !== currentGen) {
        try { await loadedPdf.destroy(); } catch (e) {}
        return;
      }

      this.pdf = loadedPdf;
      this.totalPages = this.pdf.numPages;
      this.currentPage = 1;

      if (this.emptyState) this.emptyState.hidden = true;
      if (this.stage) this.stage.hidden = false;

      this.updateZoomUI();
      await this.renderPage(1);
    } catch (err) {
      if (this.loadGeneration !== currentGen) return;
      console.warn("Preview load error:", err?.message || err);
      if (this.stage) this.stage.hidden = true;
      if (this.emptyState) {
        this.emptyState.hidden = false;
        if (err?.name === "PasswordException") {
          this.setEmptyMessage("Password-protected PDF (preview unavailable).");
        } else if (err?.name === "InvalidPDFException") {
          this.setEmptyMessage("Corrupt or invalid PDF file.");
        } else {
          this.setEmptyMessage("Unable to render preview for this document.");
        }
      }
      if (this.counter) this.counter.textContent = "Error";
      this.updateZoomUI();
    }
  }

  async renderPage(pageNumber) {
    if (!this.pdf || !this.canvas) return;

    const renderGen = ++this.renderGeneration;

    if (this.currentRenderTask) {
      try {
        this.currentRenderTask.cancel();
      } catch (e) {}
      this.currentRenderTask = null;
    }

    this.currentPage = Math.max(1, Math.min(pageNumber, this.totalPages));

    if (this.counter) {
      this.counter.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
    }
    if (this.prevBtn) {
      this.prevBtn.disabled = this.currentPage <= 1;
    }
    if (this.nextBtn) {
      this.nextBtn.disabled = this.currentPage >= this.totalPages;
    }

    try {
      const page = await this.pdf.getPage(this.currentPage);
      if (this.renderGeneration !== renderGen) {
        page.cleanup();
        return;
      }

      const unscaledViewport = page.getViewport({ scale: 1.0 });
      let scale = 1.0;

      if (this.zoomMode === "fit") {
        const stageWidth = this.stage?.clientWidth > 40 ? this.stage.clientWidth - 24 : 440;
        const targetWidth = Math.max(220, Math.min(stageWidth, 540));
        scale = targetWidth / unscaledViewport.width;
      } else {
        scale = this.zoomSteps[this.currentZoomIndex] || 1.0;
      }

      const dpr = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: scale * dpr });

      this.canvas.width = Math.floor(viewport.width);
      this.canvas.height = Math.floor(viewport.height);
      this.canvas.style.width = `${Math.floor(unscaledViewport.width * scale)}px`;
      this.canvas.style.height = `${Math.floor(unscaledViewport.height * scale)}px`;

      const ctx = this.canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      this.currentRenderTask = page.render({
        canvasContext: ctx,
        viewport
      });

      await this.currentRenderTask.promise;
      page.cleanup();

      if (this.renderGeneration !== renderGen) return;
      this.currentRenderTask = null;

      this.onPageRendered?.(this.currentPage, this.totalPages);
    } catch (err) {
      if (err?.name !== "RenderingCancelledException") {
        console.warn("Preview render exception:", err?.message || err);
      }
    }
  }

  navigate(delta) {
    this.renderPage(this.currentPage + delta);
  }

  async cleanup() {
    this.renderGeneration++;
    if (this.currentRenderTask) {
      try { this.currentRenderTask.cancel(); } catch (e) {}
      this.currentRenderTask = null;
    }
    if (this.pdf) {
      try { await this.pdf.destroy(); } catch (e) {}
      this.pdf = null;
    }
    if (this.loadingTask) {
      try { await this.loadingTask.destroy(); } catch (e) {}
      this.loadingTask = null;
    }
    this.totalPages = 0;
    this.currentPage = 1;
    if (this.canvas) {
      const ctx = this.canvas.getContext("2d");
      ctx?.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.canvas.width = 0;
      this.canvas.height = 0;
      this.canvas.style.width = "0px";
      this.canvas.style.height = "0px";
    }
    if (this.emptyState) {
      this.emptyState.hidden = false;
      this.setEmptyMessage(this.defaultEmptyText);
    }
    if (this.stage) this.stage.hidden = true;
    if (this.counter) this.counter.textContent = "No file";
    if (this.prevBtn) this.prevBtn.disabled = true;
    if (this.nextBtn) this.nextBtn.disabled = true;
    this.updateZoomUI();
  }
}

// Initialize previews on DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
  // 1. Sub-operation navigation for Panel 1 (Merge / Split / Rotate)
  const subNavBtns = Array.from(document.querySelectorAll(".sub-nav-btn"));
  const subFieldsets = [
    document.getElementById("field-merge"),
    document.getElementById("field-split"),
    document.getElementById("field-rotate")
  ];

  function setActiveSubpanel(targetId) {
    subNavBtns.forEach(b => {
      const isTarget = b.getAttribute("data-target") === targetId;
      b.classList.toggle("active", isTarget);
      b.setAttribute("aria-selected", String(isTarget));
      b.tabIndex = isTarget ? 0 : -1;
    });
    subFieldsets.forEach(fs => {
      if (fs) {
        fs.classList.toggle("subpanel-active", fs.id === targetId);
      }
    });
  }

  subNavBtns.forEach((btn, idx) => {
    btn.addEventListener("click", () => {
      setActiveSubpanel(btn.getAttribute("data-target"));
    });
    btn.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") {
        const nextIdx = (idx + 1) % subNavBtns.length;
        subNavBtns[nextIdx].focus();
        setActiveSubpanel(subNavBtns[nextIdx].getAttribute("data-target"));
      } else if (e.key === "ArrowLeft") {
        const prevIdx = (idx - 1 + subNavBtns.length) % subNavBtns.length;
        subNavBtns[prevIdx].focus();
        setActiveSubpanel(subNavBtns[prevIdx].getAttribute("data-target"));
      } else if (e.key === "Home") {
        e.preventDefault();
        subNavBtns[0].focus();
        setActiveSubpanel(subNavBtns[0].getAttribute("data-target"));
      } else if (e.key === "End") {
        e.preventDefault();
        const last = subNavBtns.length - 1;
        subNavBtns[last].focus();
        setActiveSubpanel(subNavBtns[last].getAttribute("data-target"));
      }
    });
  });

  // 2. Split Preview
  const splitPreview = new SingleDocPreview({
    canvasId: "split-preview-canvas",
    prevBtnId: "split-prev-btn",
    nextBtnId: "split-next-btn",
    counterId: "split-page-indicator",
    emptyId: "split-preview-empty",
    stageId: "split-preview-stage",
    zoomOutId: "split-zoom-out",
    zoomInId: "split-zoom-in",
    zoomValId: "split-zoom-val",
    zoomFitId: "split-zoom-fit",
    zoomResetId: "split-zoom-reset",
    zoomExpandId: "split-zoom-expand",
    expandTitle: "Split / Extract Preview"
  });

  const splitPagesInput = document.getElementById("split-pages");
  const splitBadge = document.getElementById("split-range-badge");

  function updateSplitBadge() {
    if (!splitBadge) return;
    if (!splitPreview.pdf) {
      splitBadge.textContent = "Select document to preview range";
      splitBadge.className = "preview-badge badge-neutral";
      return;
    }
    const rangeStr = splitPagesInput ? splitPagesInput.value : "";
    const pagesSet = parsePageRange(rangeStr, splitPreview.totalPages);
    if (!rangeStr.trim()) {
      splitBadge.textContent = "Enter range to preview extraction";
      splitBadge.className = "preview-badge badge-neutral";
    } else if (pagesSet.has(splitPreview.currentPage)) {
      splitBadge.textContent = `✓ Page ${splitPreview.currentPage} included in extract (${pagesSet.size} page(s) total)`;
      splitBadge.className = "preview-badge badge-success";
    } else {
      splitBadge.textContent = `✕ Page ${splitPreview.currentPage} excluded from extract (${pagesSet.size} page(s) total)`;
      splitBadge.className = "preview-badge badge-warning";
    }
  }

  splitPreview.onPageRendered = () => updateSplitBadge();
  splitPagesInput?.addEventListener("input", updateSplitBadge);

  const splitInput = document.getElementById("split-file");
  splitInput?.addEventListener("focus", () => setActiveSubpanel("field-split"));
  splitInput?.addEventListener("change", async (e) => {
    setActiveSubpanel("field-split");
    const file = e.target.files?.[0];
    if (file) {
      try {
        const buffer = await file.arrayBuffer();
        await splitPreview.loadBytes(buffer);
        updateSplitBadge();
      } catch (err) {
        await splitPreview.cleanup();
        updateSplitBadge();
      }
    } else {
      await splitPreview.cleanup();
      updateSplitBadge();
    }
  }, true);

  // 3. Rotate Preview
  const rotatePreview = new SingleDocPreview({
    canvasId: "rotate-preview-canvas",
    prevBtnId: "rotate-prev-btn",
    nextBtnId: "rotate-next-btn",
    counterId: "rotate-page-indicator",
    emptyId: "rotate-preview-empty",
    stageId: "rotate-preview-stage",
    zoomOutId: "rotate-zoom-out",
    zoomInId: "rotate-zoom-in",
    zoomValId: "rotate-zoom-val",
    zoomFitId: "rotate-zoom-fit",
    zoomResetId: "rotate-zoom-reset",
    zoomExpandId: "rotate-zoom-expand",
    expandTitle: "Rotate Preview"
  });

  const rotateSelect = document.getElementById("rotate-degrees");
  const rotateWrapper = document.getElementById("rotate-canvas-wrapper");

  function updateRotationVisual() {
    if (!rotateWrapper) return;
    const val = rotateSelect?.value || "0";
    const deg = val === "reset" ? 0 : parseInt(val, 10) || 0;
    rotateWrapper.style.transform = `rotate(${deg}deg)`;
    rotateWrapper.style.transition = "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)";
  }

  rotateSelect?.addEventListener("change", updateRotationVisual);

  const rotateInput = document.getElementById("rotate-file");
  rotateInput?.addEventListener("focus", () => setActiveSubpanel("field-rotate"));
  rotateInput?.addEventListener("change", async (e) => {
    setActiveSubpanel("field-rotate");
    const file = e.target.files?.[0];
    if (file) {
      try {
        const buffer = await file.arrayBuffer();
        await rotatePreview.loadBytes(buffer);
        updateRotationVisual();
      } catch (err) {
        await rotatePreview.cleanup();
        updateRotationVisual();
      }
    } else {
      await rotatePreview.cleanup();
      updateRotationVisual();
    }
  }, true);

  // 4. Compress Preview
  const compressPreview = new SingleDocPreview({
    canvasId: "compress-preview-canvas",
    prevBtnId: "compress-prev-btn",
    nextBtnId: "compress-next-btn",
    counterId: "compress-page-indicator",
    emptyId: "compress-preview-empty",
    stageId: "compress-preview-stage",
    zoomOutId: "compress-zoom-out",
    zoomInId: "compress-zoom-in",
    zoomValId: "compress-zoom-val",
    zoomFitId: "compress-zoom-fit",
    zoomResetId: "compress-zoom-reset",
    zoomExpandId: "compress-zoom-expand",
    expandTitle: "Compress Document Inspection"
  });

  const compressInput = document.getElementById("compress-file");
  const compressMetaInfo = document.getElementById("compress-file-info");

  compressInput?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (compressMetaInfo) {
        compressMetaInfo.textContent = `${file.name} (${formatFileSize(file.size)})`;
        compressMetaInfo.hidden = false;
      }
      try {
        const buffer = await file.arrayBuffer();
        await compressPreview.loadBytes(buffer);
      } catch (err) {
        await compressPreview.cleanup();
      }
    } else {
      if (compressMetaInfo) compressMetaInfo.hidden = true;
      await compressPreview.cleanup();
    }
  }, true);

  // 5. Metadata Preview
  const metaPreview = new SingleDocPreview({
    canvasId: "meta-preview-canvas",
    prevBtnId: "meta-prev-btn",
    nextBtnId: "meta-next-btn",
    counterId: "meta-page-indicator",
    emptyId: "meta-preview-empty",
    stageId: "meta-preview-stage",
    zoomOutId: "meta-zoom-out",
    zoomInId: "meta-zoom-in",
    zoomValId: "meta-zoom-val",
    zoomFitId: "meta-zoom-fit",
    zoomResetId: "meta-zoom-reset",
    zoomExpandId: "meta-zoom-expand",
    expandTitle: "Document Metadata Preview"
  });

  const metaInput = document.getElementById("meta-file");
  const metaFileInfo = document.getElementById("meta-file-info");
  const metaEmptyTable = document.getElementById("meta-empty-table");

  metaInput?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (metaFileInfo) {
        metaFileInfo.textContent = `${file.name} (${formatFileSize(file.size)})`;
        metaFileInfo.hidden = false;
      }
      if (metaEmptyTable) {
        metaEmptyTable.style.display = "none";
      }
      try {
        const buffer = await file.arrayBuffer();
        await metaPreview.loadBytes(buffer);
      } catch (err) {
        await metaPreview.cleanup();
        if (metaEmptyTable) metaEmptyTable.style.display = "flex";
      }
    } else {
      if (metaFileInfo) metaFileInfo.hidden = true;
      if (metaEmptyTable) metaEmptyTable.style.display = "flex";
      await metaPreview.cleanup();
    }
  }, true);

  // 6. Redaction Safe Zoom & Expand Controller
  // CRITICAL: NEVER apply CSS transform: scale() to #redact-stage, #redact-canvas, or #redact-overlay!
  // fl recalculates scale = Math.min(1.5, stageWidth / pdfWidth) on show(pageNumber).
  // By controlling stage clientWidth via property accessor without changing outer DOM width,
  // we achieve exact 1.0x (100%), 1.25x (125%), and 1.50x (150%) native PDF.js rendering scale
  // while keeping the stage centered when it fits and scrollable horizontally and vertically when enlarged.
  const redactStage = document.getElementById("redact-stage");
  const redactZoomOut = document.getElementById("redact-zoom-out");
  const redactZoomIn = document.getElementById("redact-zoom-in");
  const redactZoomVal = document.getElementById("redact-zoom-val");
  const redactZoomFit = document.getElementById("redact-zoom-fit");
  const redactZoomReset = document.getElementById("redact-zoom-reset");
  const redactZoomExpand = document.getElementById("redact-zoom-expand");
  const redactZoomInspect = document.getElementById("redact-zoom-inspect");
  const redactFileInput = document.getElementById("redact-file");
  const redactPageIndicator = document.getElementById("redact-page");
  const redactPrevBtn = document.getElementById("redact-prev");
  const redactNextBtn = document.getElementById("redact-next");

  let redactZoomState = "fit"; // "fit", 75, 100, 125, 150
  const redactZoomSteps = [75, 100, 125, 150];
  let redactZoomIndex = 1; // 100%
  let redactTargetScale = null; // null for "fit", or 0.75, 1.0, 1.25, 1.5
  let currentDocPtWidth = 612; // default Letter width in points
  let docPageWidths = []; // Per-page widths in points [page1Width, page2Width, ...]
  let currentRedactPageNum = 1;
  let currentRedactFile = null;
  let currentRedactBuffer = null;

  // Intercept clientWidth on redactStage so app.js calculates exact target scale for current page
  const realStageClientWidthGetter = Object.getOwnPropertyDescriptor(Element.prototype, "clientWidth")?.get;
  if (redactStage && realStageClientWidthGetter) {
    Object.defineProperty(redactStage, "clientWidth", {
      get() {
        const realW = realStageClientWidthGetter.call(this);
        if (redactTargetScale === null) {
          // Fit mode: available width inside 1rem padding (16px * 2 = 32px) so zero horizontal overflow
          return Math.max(240, realW - 32);
        }
        // Exact target scale: scale * pagePtWidth for current active page
        const pageIdx = Math.max(0, Math.min(docPageWidths.length - 1, currentRedactPageNum - 1));
        const pagePtWidth = (docPageWidths.length > 0 && docPageWidths[pageIdx]) ? docPageWidths[pageIdx] : currentDocPtWidth;
        return Math.round(pagePtWidth * redactTargetScale);
      },
      configurable: true
    });
  }

  // Intercept page navigation buttons in capture phase so currentRedactPageNum is updated before app.js show()
  redactPrevBtn?.addEventListener("click", () => {
    if (currentRedactPageNum > 1) {
      currentRedactPageNum--;
    }
  }, true);

  redactNextBtn?.addEventListener("click", () => {
    const maxPage = docPageWidths.length > 0 ? docPageWidths.length : 9999;
    if (currentRedactPageNum < maxPage) {
      currentRedactPageNum++;
    }
  }, true);

  // Sync currentRedactPageNum whenever page indicator text changes
  if (redactPageIndicator) {
    const pageObs = new MutationObserver(() => {
      const m = redactPageIndicator.textContent?.match(/Page\s+(\d+)/i);
      if (m) {
        currentRedactPageNum = parseInt(m[1], 10) || 1;
      }
    });
    pageObs.observe(redactPageIndicator, { childList: true, characterData: true, subtree: true });
  }

  async function updateDocPtWidth(buffer) {
    try {
      const pdfjs = await getPdfjs();
      if (!pdfjs || !buffer || buffer.byteLength === 0) return;
      const copy = buffer.slice(0);
      const doc = await pdfjs.getDocument({
        data: new Uint8Array(copy),
        cMapUrl: new URL("cmaps/", window.location.href).href,
        cMapPacked: true,
        standardFontDataUrl: new URL("standard_fonts/", window.location.href).href
      }).promise;
      const widths = [];
      for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        const vp = page.getViewport({ scale: 1.0 });
        if (vp.width && vp.width > 100) {
          widths.push(vp.width);
        } else {
          widths.push(612);
        }
        page.cleanup();
      }
      docPageWidths = widths;
      if (widths.length > 0) {
        currentDocPtWidth = widths[0];
      }
      doc.destroy();
      // If Page 1 width is significantly different from default 612 and non-fit mode is active, trigger re-render
      if (redactTargetScale !== null && widths[0] && Math.abs(widths[0] - 612) > 5) {
        triggerRedactRerender();
      }
    } catch (_) {}
  }

  redactFileInput?.addEventListener("change", async (e) => {
    currentRedactPageNum = 1;
    docPageWidths = [];
    if (e.target.files && e.target.files[0]) {
      currentRedactFile = e.target.files[0];
      try {
        currentRedactBuffer = await e.target.files[0].arrayBuffer();
        updateDocPtWidth(currentRedactBuffer);
      } catch (_) {}
    }
  }, true);

  const redactDropZone = document.querySelector('label[for="redact-file"]');
  redactDropZone?.addEventListener("drop", async (e) => {
    currentRedactPageNum = 1;
    docPageWidths = [];
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
      currentRedactFile = e.dataTransfer.files[0];
      try {
        currentRedactBuffer = await e.dataTransfer.files[0].arrayBuffer();
        updateDocPtWidth(currentRedactBuffer);
      } catch (_) {}
    }
  }, true);

  function triggerRedactRerender() {
    // Calling tab-redact click re-executes kt.show(kt.pageNumber) via app.js
    const tabRedact = document.getElementById("tab-redact");
    if (tabRedact) {
      tabRedact.click();
    }
  }

  function applyRedactZoom(state) {
    if (!redactStage) return;
    redactZoomState = state;

    // 1. Preserve relative scroll positions
    const maxScrollY = redactStage.scrollHeight - redactStage.clientHeight;
    const maxScrollX = redactStage.scrollWidth - redactStage.clientWidth;
    const prevRatioY = maxScrollY > 0 ? redactStage.scrollTop / maxScrollY : 0;
    const prevRatioX = maxScrollX > 0 ? redactStage.scrollLeft / maxScrollX : 0;

    // 2. Set target scale
    if (state === "fit") {
      redactTargetScale = null;
    } else if (state === 75) {
      redactTargetScale = 0.75;
    } else if (state === 100) {
      redactTargetScale = 1.0;
    } else if (state === 125) {
      redactTargetScale = 1.25;
    } else if (state === 150) {
      redactTargetScale = 1.50;
    }

    updateRedactZoomUI();

    // 3. Trigger re-render via app.js
    triggerRedactRerender();

    // 4. Restore scroll positions smoothly after DOM updates
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const newMaxY = redactStage.scrollHeight - redactStage.clientHeight;
        const newMaxX = redactStage.scrollWidth - redactStage.clientWidth;
        if (newMaxY > 0) {
          redactStage.scrollTop = Math.round(prevRatioY * newMaxY);
        }
        if (newMaxX > 0) {
          redactStage.scrollLeft = Math.round(prevRatioX * newMaxX);
        }
      });
    });
  }

  function updateRedactZoomUI() {
    const hasDoc = redactPageIndicator && redactPageIndicator.textContent !== "No file";
    if (redactZoomOut) {
      redactZoomOut.disabled = !hasDoc || (redactZoomState !== "fit" && redactZoomIndex <= 0);
    }
    if (redactZoomIn) {
      redactZoomIn.disabled = !hasDoc || (redactZoomState !== "fit" && redactZoomIndex >= redactZoomSteps.length - 1);
    }
    if (redactZoomFit) {
      redactZoomFit.disabled = !hasDoc;
      redactZoomFit.classList.toggle("active", redactZoomState === "fit");
    }
    if (redactZoomReset) {
      redactZoomReset.disabled = !hasDoc;
      redactZoomReset.classList.toggle("active", redactZoomState === 100);
    }
    if (redactZoomExpand) {
      redactZoomExpand.disabled = !hasDoc;
    }
    if (redactZoomInspect) {
      redactZoomInspect.disabled = !hasDoc;
    }
    if (redactZoomVal) {
      if (!hasDoc) {
        redactZoomVal.textContent = "Fit";
      } else if (redactZoomState === "fit") {
        redactZoomVal.textContent = "Fit";
      } else {
        redactZoomVal.textContent = `${redactZoomSteps[redactZoomIndex]}%`;
      }
    }
  }

  redactZoomOut?.addEventListener("click", () => {
    if (redactZoomState === "fit") {
      redactZoomIndex = 0; // 75%
    } else {
      redactZoomIndex = Math.max(0, redactZoomIndex - 1);
    }
    applyRedactZoom(redactZoomSteps[redactZoomIndex]);
  });

  redactZoomIn?.addEventListener("click", () => {
    if (redactZoomState === "fit") {
      redactZoomIndex = 2; // 125%
    } else {
      redactZoomIndex = Math.min(redactZoomSteps.length - 1, redactZoomIndex + 1);
    }
    applyRedactZoom(redactZoomSteps[redactZoomIndex]);
  });

  redactZoomFit?.addEventListener("click", () => applyRedactZoom("fit"));
  redactZoomReset?.addEventListener("click", () => {
    redactZoomIndex = 1; // 100%
    applyRedactZoom(100);
  });

  // Expand mode for Redact workspace:
  // Dynamically enlarges the redact layout grid to full-width or dedicated expanded modal
  let isRedactExpanded = false;
  function toggleRedactExpand() {
    const card = document.querySelector(".redact-preview-card");
    const grid = document.querySelector(".redact-layout-grid");
    if (!card) return;

    isRedactExpanded = !isRedactExpanded;
    if (isRedactExpanded) {
      card.classList.add("expanded-workspace");
      if (grid) grid.classList.add("preview-expanded");
      redactStage.style.maxHeight = "85vh";
      applyRedactZoom(150); // maximum safe scale
      if (redactZoomExpand) {
        redactZoomExpand.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
        redactZoomExpand.setAttribute("aria-label", "Collapse Redaction Workspace");
      }
    } else {
      card.classList.remove("expanded-workspace");
      if (grid) grid.classList.remove("preview-expanded");
      redactStage.style.maxHeight = "";
      applyRedactZoom("fit");
      if (redactZoomExpand) {
        redactZoomExpand.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`;
        redactZoomExpand.setAttribute("aria-label", "Expand Redaction Workspace");
      }
    }
  }

  redactZoomExpand?.addEventListener("click", toggleRedactExpand);

  // Escape key collapses redact expand mode
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isRedactExpanded) {
      toggleRedactExpand();
    }
  });

  // 6.1 High-Magnification Document Inspection Magnifier (200%-300%)
  // Enables crisp, readable examination of fine print, dense formulas, and citations.
  // Completely separate from fl interactive redaction coordinate state.
  async function openRedactInspectionModal() {
    const pdfjs = await getPdfjs();
    if (!pdfjs) return;

    let buffer = currentRedactBuffer;
    if (!buffer && currentRedactFile) {
      try {
        buffer = await currentRedactFile.arrayBuffer();
      } catch (_) {}
    }
    if (!buffer && redactFileInput?.files?.[0]) {
      try {
        buffer = await redactFileInput.files[0].arrayBuffer();
      } catch (_) {}
    }
    if (!buffer) return;

    let initialPage = 1;
    if (redactPageIndicator) {
      const m = redactPageIndicator.textContent.match(/Page\s+(\d+)/i);
      if (m) initialPage = parseInt(m[1], 10) || 1;
    }

    const existing = document.getElementById("active-inspection-backdrop");
    if (existing) existing.remove();

    const backdrop = document.createElement("div");
    backdrop.id = "active-inspection-backdrop";
    backdrop.className = "inspection-modal-backdrop";
    backdrop.setAttribute("role", "dialog");
    backdrop.setAttribute("aria-modal", "true");
    backdrop.setAttribute("aria-label", "Document Inspection Magnifier");

    backdrop.innerHTML = `
      <div class="inspection-modal">
        <div class="inspection-modal-header">
          <div class="inspection-modal-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            <span>Document Inspection Magnifier</span>
          </div>
          <div class="inspection-modal-actions">
            <button type="button" id="inspect-prev-btn" class="preview-nav-btn" aria-label="Previous Page">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span id="inspect-page-indicator" class="preview-page-indicator" aria-live="polite">Page ${initialPage}</span>
            <button type="button" id="inspect-next-btn" class="preview-nav-btn" aria-label="Next Page">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>

            <span class="preview-zoom-divider" aria-hidden="true"></span>

            <div class="preview-zoom-toolbar" role="toolbar" aria-label="Inspection Magnification">
              <button type="button" id="inspect-zoom-200" class="preview-zoom-btn">200%</button>
              <button type="button" id="inspect-zoom-250" class="preview-zoom-btn active">250%</button>
              <button type="button" id="inspect-zoom-300" class="preview-zoom-btn">300%</button>
            </div>

            <button type="button" class="preview-expand-close-btn" id="inspect-close-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              Close (Esc)
            </button>
          </div>
        </div>

        <div class="inspection-notice-banner">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          <div>
            <strong>Read-Only Text Inspection Magnifier (200%–300%):</strong> Inspect fine print, equations, subscript, citations, and dense scientific text at ultra-sharp resolution. To redact text, close this view and draw blackout boxes in the interactive editor below.
          </div>
        </div>

        <div class="inspection-modal-body">
          <div class="inspection-canvas-card">
            <canvas id="inspect-canvas" aria-label="High-resolution document inspection"></canvas>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    const canvas = backdrop.querySelector("#inspect-canvas");
    const prevBtn = backdrop.querySelector("#inspect-prev-btn");
    const nextBtn = backdrop.querySelector("#inspect-next-btn");
    const indicator = backdrop.querySelector("#inspect-page-indicator");
    const z200Btn = backdrop.querySelector("#inspect-zoom-200");
    const z250Btn = backdrop.querySelector("#inspect-zoom-250");
    const z300Btn = backdrop.querySelector("#inspect-zoom-300");
    const closeBtn = backdrop.querySelector("#inspect-close-btn");

    let currentPage = initialPage;
    let totalPages = 1;
    let inspectScale = 2.5; // 250% default high magnification
    let pdfDoc = null;
    let loadingTask = null;

    function updateNavUI() {
      if (indicator) indicator.textContent = `Page ${currentPage} of ${totalPages}`;
      if (prevBtn) prevBtn.disabled = currentPage <= 1;
      if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
      if (z200Btn) z200Btn.classList.toggle("active", inspectScale === 2.0);
      if (z250Btn) z250Btn.classList.toggle("active", inspectScale === 2.5);
      if (z300Btn) z300Btn.classList.toggle("active", inspectScale === 3.0);
    }

    async function renderPage() {
      if (!pdfDoc || !canvas) return;
      try {
        const page = await pdfDoc.getPage(currentPage);
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const dpr = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: inspectScale * dpr });

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(unscaledViewport.width * inspectScale)}px`;
        canvas.style.height = `${Math.floor(unscaledViewport.height * inspectScale)}px`;

        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({ canvasContext: ctx, viewport }).promise;
        page.cleanup();
      } catch (err) {
        console.warn("Inspection render error:", err);
      }
    }

    function closeModal() {
      try {
        loadingTask?.destroy();
      } catch (_) {}
      backdrop.remove();
      window.removeEventListener("keydown", onKeydown);
      redactZoomInspect?.focus();
    }

    function onKeydown(e) {
      if (e.key === "Escape") {
        closeModal();
      }
    }

    closeBtn?.addEventListener("click", closeModal);
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closeModal();
    });
    window.addEventListener("keydown", onKeydown);

    prevBtn?.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        updateNavUI();
        renderPage();
      }
    });

    nextBtn?.addEventListener("click", () => {
      if (currentPage < totalPages) {
        currentPage++;
        updateNavUI();
        renderPage();
      }
    });

    z200Btn?.addEventListener("click", () => {
      inspectScale = 2.0;
      updateNavUI();
      renderPage();
    });

    z250Btn?.addEventListener("click", () => {
      inspectScale = 2.5;
      updateNavUI();
      renderPage();
    });

    z300Btn?.addEventListener("click", () => {
      inspectScale = 3.0;
      updateNavUI();
      renderPage();
    });

    try {
      loadingTask = pdfjs.getDocument({ data: buffer.slice(0), isEvalSupported: false });
      pdfDoc = await loadingTask.promise;
      totalPages = pdfDoc.numPages;
      if (currentPage > totalPages) currentPage = 1;
      updateNavUI();
      await renderPage();
    } catch (err) {
      console.error("Failed to load inspection PDF:", err);
      closeModal();
    }
  }

  redactZoomInspect?.addEventListener("click", openRedactInspectionModal);

  // Enable controls when file is loaded in redact
  redactFileInput?.addEventListener("change", () => {
    setTimeout(updateRedactZoomUI, 200);
  });
  // Observer on redactPageIndicator to automatically keep buttons in sync
  if (redactPageIndicator) {
    const observer = new MutationObserver(updateRedactZoomUI);
    observer.observe(redactPageIndicator, { childList: true, characterData: true, subtree: true });
  }

  // 7. Merge Drop and Tab Activation
  const mergeInput = document.getElementById("merge-files");
  mergeInput?.addEventListener("focus", () => setActiveSubpanel("field-merge"));
  mergeInput?.addEventListener("change", () => setActiveSubpanel("field-merge"), true);
});
