/**
 * Bulk Download Playground — Client-Side Script
 * ExtensionGuy — /demos/bulk-download/
 *
 * Provides safe, interactive DOM link injection for testing extension file discovery
 * and dynamic mutation observers. Does not trigger automatic downloads.
 */

export const DYNAMIC_SAMPLES = [
  {
    id: 'dyn-pdf-1',
    name: 'Dynamic Compliance Summary (PDF)',
    href: '../../assets/samples/bulk-download/sample-compliance-summary.pdf',
    filename: 'sample-compliance-summary.pdf',
    type: 'PDF Document (Synthetic Demo)',
    size: '1.1 KB'
  },
  {
    id: 'dyn-img-1',
    name: 'Dynamic Architecture Render (JPG)',
    href: '../../assets/samples/bulk-download/sample-architecture-render.jpg',
    filename: 'sample-architecture-render.jpg',
    type: 'JPEG Image (Synthetic Demo)',
    size: '15.5 KB'
  },
  {
    id: 'dyn-csv-1',
    name: 'Dynamic Inventory Audit (CSV)',
    href: '../../assets/samples/bulk-download/sample-inventory-data.csv',
    filename: 'sample-inventory-data.csv',
    type: 'CSV Dataset (Actual Hashes)',
    size: '1.4 KB'
  },
  {
    id: 'dyn-txt-1',
    name: 'Dynamic Checksum Manifest (TXT)',
    href: '../../assets/samples/bulk-download/sample-checksum-manifest.txt',
    filename: 'sample-checksum-manifest.txt',
    type: 'Plaintext (Genuine SHA-256)',
    size: '1.3 KB'
  }
];

export function initBulkDownloadDemo() {
  const revealBtn = document.getElementById('revealDynamicBtn');
  const resetBtn = document.getElementById('resetDynamicBtn');
  const dynamicContainer = document.getElementById('dynamicLinksContainer');
  const dynamicStatus = document.getElementById('dynamicStatus');

  if (!revealBtn || !dynamicContainer) return;

  function renderDynamicLinks() {
    dynamicContainer.innerHTML = '';

    DYNAMIC_SAMPLES.forEach(sample => {
      const card = document.createElement('div');
      card.className = 'sample-file-card dynamic-inserted';
      card.setAttribute('data-file-type', sample.type);

      const infoWrap = document.createElement('div');
      infoWrap.className = 'file-info-wrap';

      const title = document.createElement('strong');
      title.className = 'file-name';
      title.textContent = sample.name;

      const meta = document.createElement('span');
      meta.className = 'file-meta';
      meta.textContent = `${sample.type} · ${sample.size}`;

      infoWrap.appendChild(title);
      infoWrap.appendChild(meta);

      const downloadLink = document.createElement('a');
      downloadLink.href = sample.href;
      downloadLink.download = sample.filename;
      downloadLink.className = 'btn btn-ghost btn-sm';
      downloadLink.textContent = 'Direct Link';
      downloadLink.setAttribute('aria-label', `Download ${sample.filename}`);

      card.appendChild(infoWrap);
      card.appendChild(downloadLink);

      dynamicContainer.appendChild(card);
    });

    if (dynamicStatus) {
      dynamicStatus.textContent = `${DYNAMIC_SAMPLES.length} dynamic download links inserted into DOM`;
      dynamicStatus.className = 'status-msg status-active';
    }

    revealBtn.disabled = true;
    if (resetBtn) resetBtn.disabled = false;
  }

  function resetDynamicLinks() {
    dynamicContainer.innerHTML = '';
    if (dynamicStatus) {
      dynamicStatus.textContent = 'No dynamic links loaded. Click above to inject DOM elements.';
      dynamicStatus.className = 'status-msg status-muted';
    }
    revealBtn.disabled = false;
    if (resetBtn) resetBtn.disabled = true;
  }

  revealBtn.addEventListener('click', renderDynamicLinks);
  if (resetBtn) resetBtn.addEventListener('click', resetDynamicLinks);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBulkDownloadDemo);
  } else {
    initBulkDownloadDemo();
  }
}
