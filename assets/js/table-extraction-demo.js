/**
 * Table Extraction Playground Interactive Controller
 * ExtensionGuy — /demos/table-extraction/
 *
 * Implements client-side interactive table behaviors:
 * 1. Sorting on dynamic columns with aria-sort updates
 * 2. Real-time text search filtering across table rows
 * 3. Toggling hidden columns and archived rows
 * 4. DOM virtualized table simulation (viewport culling demo)
 * 5. Clean RFC 4180 CSV and TSV preview and clipboard copy
 */

(function () {
  'use strict';

  // --- Utility: Format Table Data as CSV (RFC 4180) ---
  function tableToCsv(tableEl, options) {
    options = options || {};
    var includeHidden = Boolean(options.includeHidden);
    var rows = Array.from(tableEl.querySelectorAll('tr'));
    var csvLines = [];

    // Grid matrix to track spanned cells
    var matrix = [];

    rows.forEach(function (tr, rowIndex) {
      // Check if row is visually hidden and should be excluded
      if (!includeHidden) {
        var style = window.getComputedStyle(tr);
        if (style.display === 'none' || tr.hasAttribute('hidden') || tr.classList.contains('is-hidden-row')) {
          return;
        }
      }

      if (!matrix[rowIndex]) {
        matrix[rowIndex] = [];
      }

      var colIndex = 0;
      var cells = Array.from(tr.children);

      cells.forEach(function (cell) {
        // Skip hidden columns if requested
        if (!includeHidden) {
          var style = window.getComputedStyle(cell);
          if (style.display === 'none' || cell.hasAttribute('hidden') || cell.classList.contains('is-hidden-col')) {
            return;
          }
        }

        // Advance colIndex past any cells occupied by previous rowspans
        while (matrix[rowIndex][colIndex] !== undefined) {
          colIndex++;
        }

        var colspan = parseInt(cell.getAttribute('colspan') || '1', 10);
        var rowspan = parseInt(cell.getAttribute('rowspan') || '1', 10);
        var cellText = (cell.innerText || cell.textContent || '').trim();

        for (var r = 0; r < rowspan; r++) {
          var targetRow = rowIndex + r;
          if (!matrix[targetRow]) {
            matrix[targetRow] = [];
          }
          for (var c = 0; c < colspan; c++) {
            // For spanned positions beyond the origin, keep empty or filled
            matrix[targetRow][colIndex + c] = (r === 0 && c === 0) ? cellText : (options.fillSpans ? cellText : '');
          }
        }

        colIndex += colspan;
      });
    });

    // Convert matrix rows to CSV strings
    matrix.forEach(function (row) {
      if (!row || row.length === 0) return;
      var formattedCells = row.map(function (val) {
        var text = val === undefined ? '' : String(val);
        if (text.includes(',') || text.includes('"') || text.includes('\n') || text.includes('\r')) {
          return '"' + text.replace(/"/g, '""') + '"';
        }
        return text;
      });
      csvLines.push(formattedCells.join(','));
    });

    return csvLines.join('\r\n');
  }

  // --- Feature 1: Export Preview Drawers & Clipboard Copy ---
  function initExportDrawers() {
    var cards = document.querySelectorAll('[data-demo-table-card]');
    cards.forEach(function (card) {
      var table = card.querySelector('table');
      var previewBtn = card.querySelector('[data-action="preview-csv"]');
      var drawer = card.querySelector('[data-preview-drawer]');
      var output = card.querySelector('[data-csv-output]');
      var copyBtn = card.querySelector('[data-action="copy-csv"]');

      if (!table || !previewBtn || !drawer || !output) return;

      function updatePreview() {
        var csv = tableToCsv(table, {
          includeHidden: card.getAttribute('data-show-hidden') === 'true'
        });
        output.textContent = csv;
      }

      previewBtn.addEventListener('click', function () {
        var isExpanded = previewBtn.getAttribute('aria-expanded') === 'true';
        if (isExpanded) {
          previewBtn.setAttribute('aria-expanded', 'false');
          drawer.hidden = true;
        } else {
          previewBtn.setAttribute('aria-expanded', 'true');
          drawer.hidden = false;
          updatePreview();
        }
      });

      if (copyBtn) {
        copyBtn.addEventListener('click', async function () {
          var text = output.textContent || tableToCsv(table);
          try {
            await navigator.clipboard.writeText(text);
            var orig = copyBtn.textContent;
            copyBtn.textContent = 'Copied to Clipboard!';
            copyBtn.classList.add('btn-success');
            setTimeout(function () {
              copyBtn.textContent = orig;
              copyBtn.classList.remove('btn-success');
            }, 2000);
          } catch (err) {
            console.warn('Clipboard write failed:', err);
          }
        });
      }

      card._refreshPreview = function () {
        if (!drawer.hidden) {
          updatePreview();
        }
      };
    });
  }

  // --- Feature 2: Hidden Columns & Rows Toggle ---
  function initHiddenToggle() {
    var card = document.querySelector('[data-demo-card="hidden-elements"]');
    if (!card) return;

    var toggleBtn = card.querySelector('#toggleHiddenElementsBtn');
    var table = card.querySelector('table');
    var statusNote = card.querySelector('#hiddenToggleStatus');

    if (!toggleBtn || !table) return;

    var showHidden = false;

    toggleBtn.addEventListener('click', function () {
      showHidden = !showHidden;
      card.setAttribute('data-show-hidden', String(showHidden));
      toggleBtn.setAttribute('aria-pressed', String(showHidden));

      table.classList.toggle('show-hidden-mode', showHidden);

      if (showHidden) {
        toggleBtn.textContent = 'Hide Hidden Columns & Rows';
        if (statusNote) {
          statusNote.textContent = 'Status: Revealing internal column (Internal SKU ID) and archived row (Legacy Contract 2024).';
        }
      } else {
        toggleBtn.textContent = 'Reveal Hidden Columns & Rows';
        if (statusNote) {
          statusNote.textContent = 'Status: Hiding 1 internal column (CSS display: none) and 1 archived row.';
        }
      }

      if (typeof card._refreshPreview === 'function') {
        card._refreshPreview();
      }
    });
  }

  // --- Feature 3: Dynamic Sortable & Filterable Table ---
  function initSortableAndFilterable() {
    var card = document.querySelector('[data-demo-card="sort-filter"]');
    if (!card) return;

    var table = card.querySelector('table');
    var searchInput = card.querySelector('#filterSearchInput');
    var rowCountEl = card.querySelector('#dynamicRowCount');
    if (!table || !searchInput) return;

    var tbody = table.querySelector('tbody');
    var originalRows = Array.from(tbody.querySelectorAll('tr'));
    var headers = Array.from(table.querySelectorAll('th[data-sortable]'));

    var currentSortCol = null;
    var currentSortDir = 'none';

    function applyFilter() {
      var query = searchInput.value.toLowerCase().trim();
      var visibleCount = 0;

      originalRows.forEach(function (tr) {
        var text = tr.textContent.toLowerCase();
        var matches = !query || text.includes(query);
        tr.style.display = matches ? '' : 'none';
        if (matches) visibleCount++;
      });

      if (rowCountEl) {
        rowCountEl.textContent = visibleCount + ' of ' + originalRows.length + ' rows visible';
      }

      if (typeof card._refreshPreview === 'function') {
        card._refreshPreview();
      }
    }

    searchInput.addEventListener('input', applyFilter);

    headers.forEach(function (th, colIdx) {
      th.style.cursor = 'pointer';
      th.setAttribute('tabindex', '0');
      th.setAttribute('role', 'columnheader');

      function handleSort() {
        var newDir = 'ascending';
        if (currentSortCol === th && currentSortDir === 'ascending') {
          newDir = 'descending';
        } else if (currentSortCol === th && currentSortDir === 'descending') {
          newDir = 'none';
        }

        headers.forEach(function (h) {
          h.setAttribute('aria-sort', 'none');
          var indicator = h.querySelector('.sort-indicator');
          if (indicator) indicator.textContent = '⇅';
        });

        currentSortCol = newDir === 'none' ? null : th;
        currentSortDir = newDir;

        if (newDir !== 'none') {
          th.setAttribute('aria-sort', newDir);
          var indicator = th.querySelector('.sort-indicator');
          if (indicator) indicator.textContent = newDir === 'ascending' ? '▲' : '▼';
        }

        var sortedRows = Array.from(originalRows).sort(function (a, b) {
          if (newDir === 'none') {
            return parseInt(a.getAttribute('data-initial-idx') || '0', 10) -
                   parseInt(b.getAttribute('data-initial-idx') || '0', 10);
          }

          var aVal = (a.children[colIdx] ? a.children[colIdx].textContent : '').trim();
          var bVal = (b.children[colIdx] ? b.children[colIdx].textContent : '').trim();

          var aNum = parseFloat(aVal.replace(/[^0-9.-]+/g, ''));
          var bNum = parseFloat(bVal.replace(/[^0-9.-]+/g, ''));

          var comparison = 0;
          if (!isNaN(aNum) && !isNaN(bNum)) {
            comparison = aNum - bNum;
          } else {
            comparison = aVal.localeCompare(bVal);
          }

          return newDir === 'ascending' ? comparison : -comparison;
        });

        sortedRows.forEach(function (tr) { tbody.appendChild(tr); });
        applyFilter();
      }

      th.addEventListener('click', handleSort);
      th.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleSort();
        }
      });
    });

    originalRows.forEach(function (tr, i) { tr.setAttribute('data-initial-idx', String(i)); });
  }

  // --- Feature 4: Representative Virtualized Table Simulation ---
  function initVirtualizedGrid() {
    var container = document.querySelector('#virtualGridContainer');
    var scrollViewport = document.querySelector('#virtualScrollViewport');
    var spacer = document.querySelector('#virtualSpacer');
    var rowPool = document.querySelector('#virtualRowPool');
    var liveStats = document.querySelector('#virtualGridStats');

    if (!container || !scrollViewport || !spacer || !rowPool) return;

    var TOTAL_RECORDS = 100;
    var ROW_HEIGHT = 40;
    var VIEWPORT_HEIGHT = 240;
    var VISIBLE_COUNT = Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + 2; // 8 buffer rows

    var departments = ['Engineering', 'Finance', 'Design', 'Operations', 'Legal', 'Marketing'];
    var regions = ['EMEA', 'APAC', 'Americas', 'Global'];
    var statuses = ['Active', 'Pending', 'Archived', 'Review'];

    var records = [];
    for (var i = 1; i <= TOTAL_RECORDS; i++) {
      var paddedId = String(i).padStart(4, '0');
      records.push({
        id: 'REC-' + paddedId,
        name: 'Portfolio Asset ' + i,
        department: departments[(i * 3) % departments.length],
        region: regions[(i * 2) % regions.length],
        budget: '$' + ((i * 1370) % 85000 + 5000).toLocaleString(),
        status: statuses[i % statuses.length]
      });
    }

    spacer.style.height = (TOTAL_RECORDS * ROW_HEIGHT) + 'px';

    rowPool.innerHTML = '';
    var poolElements = [];
    for (var j = 0; j < VISIBLE_COUNT; j++) {
      var row = document.createElement('div');
      row.className = 'virtual-row';
      row.setAttribute('role', 'row');
      row.style.height = ROW_HEIGHT + 'px';
      row.innerHTML =
        '<span class="v-cell v-id" role="gridcell"></span>' +
        '<span class="v-cell v-name" role="gridcell"></span>' +
        '<span class="v-cell v-dept" role="gridcell"></span>' +
        '<span class="v-cell v-reg" role="gridcell"></span>' +
        '<span class="v-cell v-budget" role="gridcell"></span>' +
        '<span class="v-cell v-status" role="gridcell"></span>';
      rowPool.appendChild(row);
      poolElements.push(row);
    }

    var lastStartIndex = -1;

    function renderVirtualRows() {
      var scrollTop = scrollViewport.scrollTop;
      var startIndex = Math.max(0, Math.min(TOTAL_RECORDS - VISIBLE_COUNT, Math.floor(scrollTop / ROW_HEIGHT)));

      if (startIndex === lastStartIndex) return;
      lastStartIndex = startIndex;

      var offsetY = startIndex * ROW_HEIGHT;
      rowPool.style.transform = 'translateY(' + offsetY + 'px)';

      for (var k = 0; k < VISIBLE_COUNT; k++) {
        var recordIndex = startIndex + k;
        var el = poolElements[k];
        if (recordIndex < TOTAL_RECORDS) {
          var item = records[recordIndex];
          el.style.display = 'flex';
          el.querySelector('.v-id').textContent = item.id;
          el.querySelector('.v-name').textContent = item.name;
          el.querySelector('.v-dept').textContent = item.department;
          el.querySelector('.v-reg').textContent = item.region;
          el.querySelector('.v-budget').textContent = item.budget;
          var statusEl = el.querySelector('.v-status');
          statusEl.textContent = item.status;
          statusEl.setAttribute('data-status', item.status.toLowerCase());
        } else {
          el.style.display = 'none';
        }
      }

      if (liveStats) {
        liveStats.textContent = 'DOM rows in memory: ' + VISIBLE_COUNT + ' | Total virtual dataset: ' + TOTAL_RECORDS + ' records | Visible records #' + (startIndex + 1) + ' to #' + Math.min(TOTAL_RECORDS, startIndex + VISIBLE_COUNT);
      }
    }

    scrollViewport.addEventListener('scroll', renderVirtualRows, { passive: true });
    renderVirtualRows();
  }

  // --- Bootstrap ---
  function init() {
    initExportDrawers();
    initHiddenToggle();
    initSortableAndFilterable();
    initVirtualizedGrid();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
