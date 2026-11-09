/**
 * Overleaf Preamble Checker — Browser-Local Static Analysis Engine & UI Controller
 * ExtensionGuy — /demos/overleaf-preamble-checker/
 *
 * Performs browser-local static analysis on LaTeX source code to detect missing
 * macro definitions, missing required packages, malformed package declarations,
 * and fragment-only structures common in Pandoc output.
 *
 * Advisory static diagnostic tool only; does not execute LaTeX or guarantee compilation.
 */

export const RECOMMENDED_PREAMBLE = `\\documentclass[11pt,a4paper]{article}

% Character encoding & typography
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{lmodern}
\\usepackage{microtype}

% Pandoc compatibility definitions
\\providecommand{\\tightlist}{%
  \\setlength{\\itemsep}{0pt}\\setlength{\\parskip}{0pt}}

% Pandoc 3.2.1+ bounded graphics macro
\\makeatletter
\\newsavebox\\pandoc@box
\\newcommand*\\pandocbounded[1]{%
  \\sbox\\pandoc@box{#1}%
  \\ifdim\\wd\\pandoc@box>\\linewidth
    \\resizebox{\\linewidth}{!}{\\copy\\pandoc@box}%
  \\else
    \\usebox\\pandoc@box
  \\fi
}
\\makeatother

% Essential packages for tables, figures, and math
\\usepackage{graphicx}
\\usepackage{booktabs}
\\usepackage{longtable}
\\usepackage{array}
\\usepackage{calc}
\\usepackage{amsmath,amssymb}
\\usepackage{multirow}
\\usepackage[margin=1in]{geometry}
\\usepackage{hyperref}

\\begin{document}

% Paste your content or manuscript body here

\\end{document}`;

export const PRESETS = [
  {
    id: 'pandoc-fragment',
    title: 'Pandoc CLI Fragment (Missing \\tightlist & \\pandocbounded)',
    description: 'Raw Pandoc markdown-to-LaTeX or docx-to-LaTeX fragment containing bullet lists and scaled figures without preamble support.',
    latex: `% Fragment generated via Pandoc CLI without --standalone
\\section{Methodology}
Here are the core experimental guidelines:

\\begin{itemize}
\\tightlist
\\item Calibrate spectrophotometer at 550nm wavelength.
\\item Maintain ambient chamber temperature at 21 degrees Celsius.
\\item Record absorbance readings at 60-second intervals.
\\end{itemize}

\\begin{figure}[htbp]
\\centering
\\pandocbounded{\\includegraphics[width=0.85\\textwidth]{figures/absorbance_curve.png}}
\\caption{Absorbance trajectory across test replicates.}
\\end{figure}`
  },
  {
    id: 'missing-booktabs',
    title: 'Academic Table (Missing booktabs Rules)',
    description: 'Tabular environment utilizing formal publishing rules (\\toprule, \\midrule, \\bottomrule) without declaring \\usepackage{booktabs}.',
    latex: `\\documentclass{article}
\\begin{document}

\\section{Experimental Summary}
\\begin{table}[htbp]
\\centering
\\begin{tabular}{llr}
\\toprule
Participant ID & Condition & Response Latency (ms) \\\\
\\midrule
P-101 & Control & 412 \\\\
P-102 & Primed & 329 \\\\
P-103 & Primed & 348 \\\\
\\bottomrule
\\end{tabular}
\\caption{Observed participant latencies across experimental cohorts.}
\\end{table}

\\end{document}`
  },
  {
    id: 'missing-longtable',
    title: 'Multi-Page Table (Missing longtable Package)',
    description: 'Extended table spanning across page boundaries with headers and footers, missing \\usepackage{longtable}.',
    latex: `\\documentclass{article}
\\begin{document}

\\section{Full Data Catalog}
\\begin{longtable}[]{@{}lllr@{}}
\\hline
Item Code & Description & Batch Reference & Qty \\\\
\\hline
\\endfirsthead
\\hline
Item Code & Description & Batch Reference & Qty \\\\
\\hline
\\endhead
A-101 & Optical sensor module & BT-2026-X1 & 45 \\\\
B-204 & Power controller unit & BT-2026-P9 & 120 \\\\
C-309 & Calibration bracket & BT-2026-C4 & 30 \\\\
\\hline
\\end{longtable}

\\end{document}`
  },
  {
    id: 'missing-graphics-multirow',
    title: 'Figures & Multirow Cells (Missing graphicx & multirow)',
    description: 'LaTeX document embedding external artwork and merged multi-row table cells without the corresponding packages.',
    latex: `\\documentclass{article}
\\begin{document}

\\section{System Architecture}
\\begin{figure}[ht]
\\centering
\\includegraphics[width=0.75\\linewidth]{diagrams/flowchart.png}
\\caption{Core processing data flow.}
\\end{figure}

\\begin{table}[ht]
\\centering
\\begin{tabular}{|l|l|r|}
\\hline
Category & Model & Units \\\\
\\hline
\\multirow{2}{*}{Sensors} & Type A & 50 \\\\
                         & Type B & 75 \\\\
\\hline
\\end{tabular}
\\end{table}

\\end{document}`
  },
  {
    id: 'malformed-packages',
    title: 'Malformed \\usepackage Declarations',
    description: 'Preamble containing invalid package invocations like empty braces, extra commas, or missing package names.',
    latex: `\\documentclass{article}
\\usepackage{}
\\usepackage{amsmath, , booktabs}
\\usepackage{calc
\\begin{document}

\\section{Introduction}
Document text with malformed preamble package declarations.

\\end{document}`
  },
  {
    id: 'clean-standalone',
    title: 'Clean Standalone Document (0 Diagnostics / Verified)',
    description: 'Complete standalone LaTeX document with all necessary macros, packages, and preamble declarations in place.',
    expectedClean: true,
    latex: `\\documentclass[11pt,a4paper]{article}

\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{graphicx}
\\usepackage{booktabs}
\\usepackage{longtable}
\\usepackage{multirow}
\\usepackage{amsmath}

\\providecommand{\\tightlist}{%
  \\setlength{\\itemsep}{0pt}\\setlength{\\parskip}{0pt}}

\\providecommand{\\pandocbounded}[1]{#1}

\\begin{document}

\\section{Introduction}
This document contains valid package imports and macro declarations.

\\begin{itemize}
\\tightlist
\\item Fully declared list environment.
\\item Compatible with standard Overleaf engines.
\\end{itemize}

\\begin{table}[htbp]
\\centering
\\begin{tabular}{ll}
\\toprule
Metric & Score \\\\
\\midrule
Accuracy & 98.4\\\\
F1 & 0.96 \\\\
\\bottomrule
\\end{tabular}
\\caption{Verified performance table.}
\\end{table}

\\end{document}`
  }
];

/**
 * Strips comments from a line of LaTeX, respecting escaped \%.
 */
function stripLineComment(line) {
  let result = '';
  let escaped = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '\\') {
      escaped = !escaped;
      result += ch;
      continue;
    }
    if (ch === '%' && !escaped) {
      break; // Start of comment
    }
    escaped = false;
    result += ch;
  }
  return result;
}

/**
 * Analyzes raw LaTeX text and returns identified issues, metadata, and suggested fixes.
 *
 * @param {string} latex Raw LaTeX source
 * @returns {object} { issues: Array, isFragment: boolean, packages: Set, definedMacros: Set }
 */
export function analyzeLaTeX(latex) {
  if (typeof latex !== 'string') {
    return { issues: [], isFragment: true, packages: new Set(), definedMacros: new Set() };
  }

  const rawLines = latex.split(/\r?\n/);
  const issues = [];
  const loadedPackages = new Set();
  const definedMacros = new Set();

  let hasDocumentClass = false;
  let hasBeginDoc = false;
  let hasEndDoc = false;

  // Pass 1: Parse packages, definitions, and document structure
  rawLines.forEach((rawLine, idx) => {
    const lineNum = idx + 1;
    const line = stripLineComment(rawLine);

    if (/\\documentclass\b/.test(line)) {
      hasDocumentClass = true;
    }
    if (/\\begin\{document\}/.test(line)) {
      hasBeginDoc = true;
    }
    if (/\\end\{document\}/.test(line)) {
      hasEndDoc = true;
    }

    // Detect Macro Definitions (\providecommand, \newcommand, \def, \renewcommand, \DeclareRobustCommand)
    const macroDefRegex = /\\(?:providecommand|newcommand|renewcommand|DeclareRobustCommand)\*?\{?\\([a-zA-Z]+)\}?|\\def\\([a-zA-Z]+)/g;
    let defMatch;
    while ((defMatch = macroDefRegex.exec(line)) !== null) {
      const name = defMatch[1] || defMatch[2];
      if (name) definedMacros.add(name);
    }

    // Detect Package Imports: \usepackage[...]{pkg1, pkg2}
    // Check for malformed declarations first
    if (/\\usepackage\s*\{/.test(line)) {
      // Empty braces: \usepackage{}
      if (/\\usepackage\s*\{\s*\}/.test(line)) {
        issues.push({
          id: 'malformed-usepackage',
          line: lineNum,
          severity: 'error',
          title: 'Empty \\usepackage{} Declaration',
          description: 'A \\usepackage{} command was declared without specifying any package name.',
          code: rawLine.trim(),
          fix: 'Remove the empty declaration or specify the desired package: \\usepackage{package_name}'
        });
      }

      // Check for unclosed brace on the same line if not multi-line
      if (!line.includes('}')) {
        issues.push({
          id: 'malformed-usepackage',
          line: lineNum,
          severity: 'error',
          title: 'Unclosed \\usepackage{ Brace',
          description: 'A \\usepackage declaration was opened with "{" but never closed with "}".',
          code: rawLine.trim(),
          fix: 'Ensure the package declaration ends with a closing brace: \\usepackage{...}'
        });
      }

      // Check for empty comma entries: \usepackage{a, , b} or \usepackage{a,}
      if (/\\usepackage(?:\[[^\]]*\])?\{[^}]*,\s*,[^}]*\}/.test(line) || /\\usepackage(?:\[[^\]]*\])?\{[^}]*,\s*\}/.test(line)) {
        issues.push({
          id: 'malformed-usepackage',
          line: lineNum,
          severity: 'error',
          title: 'Malformed Comma-Separated \\usepackage Syntax',
          description: 'Package list contains consecutive commas or a trailing comma without a package name.',
          code: rawLine.trim(),
          fix: 'Separate package names with a single comma and omit trailing commas: \\usepackage{pkg1, pkg2}'
        });
      }

      // Extract valid packages
      const pkgDeclRegex = /\\usepackage(?:\[[^\]]*\])?\{([^}]+)\}/g;
      let pkgMatch;
      while ((pkgMatch = pkgDeclRegex.exec(line)) !== null) {
        const pkgList = pkgMatch[1];
        pkgList.split(',').forEach(p => {
          const cleanPkg = p.trim();
          if (cleanPkg) loadedPackages.add(cleanPkg);
        });
      }
    }
  });

  const isFragment = !hasDocumentClass && !hasBeginDoc;

  if (isFragment) {
    issues.push({
      id: 'fragment-without-preamble',
      line: 1,
      severity: 'info',
      title: 'Document Fragment Detected (No \\documentclass or \\begin{document})',
      description: 'Your snippet does not declare a document class or preamble. If you paste this directly as a standalone file in Overleaf, compilation will fail. Paste this fragment inside your existing project\'s \\begin{document} ... \\end{document} body, and place required packages in your project\'s preamble.',
      code: rawLines[0] ? rawLines[0].substring(0, 80) : '',
      fix: 'Use the Recommended Master Preamble below to create a complete document, or paste this fragment into an existing Overleaf paper.'
    });
  }

  // Pass 2: Line-by-line checks for macro calls and environments
  let tightlistFlagged = false;
  let pandocboundedFlagged = false;
  let longtableFlagged = false;
  let booktabsFlagged = false;
  let graphicxFlagged = false;
  let multirowFlagged = false;

  rawLines.forEach((rawLine, idx) => {
    const lineNum = idx + 1;
    const line = stripLineComment(rawLine);
    if (!line.trim()) return;

    // 1. \tightlist
    if (!tightlistFlagged && /\\tightlist\b/.test(line)) {
      // Ignore if line is actually defining \tightlist
      const isDef = /\\(?:providecommand|newcommand|def|renewcommand|DeclareRobustCommand)\*?\{?\\tightlist\b/.test(line);
      if (!isDef && !definedMacros.has('tightlist')) {
        tightlistFlagged = true;
        issues.push({
          id: 'missing-tightlist',
          line: lineNum,
          severity: 'error',
          title: 'Undefined Control Sequence: \\tightlist',
          description: 'Pandoc outputs \\tightlist inside itemize and enumerate lists to compact bullet spacing. Standard LaTeX classes (article, report, book) do not define this command.',
          code: rawLine.trim(),
          fix: '\\providecommand{\\tightlist}{\\setlength{\\itemsep}{0pt}\\setlength{\\parskip}{0pt}}'
        });
      }
    }

    // 2. \pandocbounded
    if (!pandocboundedFlagged && /\\pandocbounded\b/.test(line)) {
      const isDef = /\\(?:providecommand|newcommand|def|renewcommand|DeclareRobustCommand)\*?\{?\\pandocbounded\b/.test(line);
      if (!isDef && !definedMacros.has('pandocbounded')) {
        pandocboundedFlagged = true;
        issues.push({
          id: 'missing-pandocbounded',
          line: lineNum,
          severity: 'error',
          title: 'Undefined Control Sequence: \\pandocbounded',
          description: 'Pandoc 3.2.1+ wraps images in \\pandocbounded{...} to constrain figure dimensions within \\linewidth without stretching smaller assets. Standard Overleaf preambles fail without a definition.',
          code: rawLine.trim(),
          fix: '\\providecommand{\\pandocbounded}[1]{#1}'
        });
      }
    }

    // 3. longtable environment
    if (!longtableFlagged && /\\begin\{longtable\}/.test(line)) {
      if (!loadedPackages.has('longtable')) {
        longtableFlagged = true;
        issues.push({
          id: 'missing-longtable',
          line: lineNum,
          severity: 'error',
          title: 'Missing Package: longtable',
          description: 'The longtable environment is used for multi-page tables. Standard LaTeX does not provide longtable unless the package is explicitly loaded in the preamble.',
          code: rawLine.trim(),
          fix: '\\usepackage{longtable}'
        });
      }
    }

    // 4. booktabs rules (\toprule, \midrule, \bottomrule)
    if (!booktabsFlagged && /\\(toprule|midrule|bottomrule)\b/.test(line)) {
      if (!loadedPackages.has('booktabs')) {
        booktabsFlagged = true;
        issues.push({
          id: 'missing-booktabs',
          line: lineNum,
          severity: 'error',
          title: 'Missing Package: booktabs (\\toprule, \\midrule, \\bottomrule)',
          description: 'Horizontal rules \\toprule, \\midrule, and \\bottomrule require the booktabs package for typographic table dividers.',
          code: rawLine.trim(),
          fix: '\\usepackage{booktabs}'
        });
      }
    }

    // 5. \includegraphics
    if (!graphicxFlagged && /\\includegraphics\b/.test(line)) {
      if (!loadedPackages.has('graphicx')) {
        graphicxFlagged = true;
        issues.push({
          id: 'missing-graphicx',
          line: lineNum,
          severity: 'error',
          title: 'Missing Package: graphicx (\\includegraphics)',
          description: 'Image inclusion commands like \\includegraphics require the graphicx package.',
          code: rawLine.trim(),
          fix: '\\usepackage{graphicx}'
        });
      }
    }

    // 6. \multirow
    if (!multirowFlagged && /\\multirow\b/.test(line)) {
      if (!loadedPackages.has('multirow')) {
        multirowFlagged = true;
        issues.push({
          id: 'missing-multirow',
          line: lineNum,
          severity: 'error',
          title: 'Missing Package: multirow (\\multirow)',
          description: 'Multi-row cell merging in tables requires the multirow package.',
          code: rawLine.trim(),
          fix: '\\usepackage{multirow}'
        });
      }
    }
  });

  return {
    issues,
    isFragment,
    packages: loadedPackages,
    definedMacros
  };
}

/**
 * Browser UI Initializer — Mounts event listeners and controls on DOMContentLoaded.
 */
function initCheckerUI() {
  const textarea = document.getElementById('latexInput');
  const presetSelect = document.getElementById('presetSelect');
  const clearBtn = document.getElementById('clearBtn');
  const resetBtn = document.getElementById('resetBtn');
  const copyPreambleBtn = document.getElementById('copyPreambleBtn');
  const diagnosticsList = document.getElementById('diagnosticsList');
  const statusBadge = document.getElementById('statusBadge');
  const lineCountBadge = document.getElementById('lineCountBadge');
  const recommendedPreambleEl = document.getElementById('recommendedPreamble');

  if (!textarea || !diagnosticsList) return;

  // Initialize recommended preamble display
  if (recommendedPreambleEl) {
    recommendedPreambleEl.textContent = RECOMMENDED_PREAMBLE;
  }

  // Populate Presets in select dropdown
  if (presetSelect && presetSelect.options.length <= 1) {
    presetSelect.innerHTML = '<option value="">-- Choose a Reproducible Sample Case --</option>';
    PRESETS.forEach(preset => {
      const opt = document.createElement('option');
      opt.value = preset.id;
      opt.textContent = preset.title;
      presetSelect.appendChild(opt);
    });
  }

  // Render diagnostics into right panel safely
  function renderDiagnostics(analysis) {
    diagnosticsList.innerHTML = '';

    const issues = analysis.issues;
    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    const infoCount = issues.filter(i => i.severity === 'info').length;

    // Update status badge
    if (statusBadge) {
      if (issues.length === 0) {
        statusBadge.className = 'status-badge status-badge-clean';
        statusBadge.textContent = 'Clean / 0 Issues Detected';
      } else if (errorCount > 0) {
        statusBadge.className = 'status-badge status-badge-error';
        statusBadge.textContent = `${errorCount} Potential Error${errorCount > 1 ? 's' : ''}${warningCount > 0 ? `, ${warningCount} Warning${warningCount > 1 ? 's' : ''}` : ''}`;
      } else {
        statusBadge.className = 'status-badge status-badge-warning';
        statusBadge.textContent = `${issues.length} Notice${issues.length > 1 ? 's' : ''}`;
      }
    }

    if (issues.length === 0) {
      const cleanBox = document.createElement('div');
      cleanBox.className = 'clean-state-box';
      cleanBox.innerHTML = `
        <div class="clean-icon" aria-hidden="true">&#10003;</div>
        <h4 style="margin: 0 0 6px; font-weight: 700; color: #15803d; font-size: 1.05rem;">No Common Preamble Issues Found</h4>
        <p style="margin: 0; font-size: 0.88rem; color: var(--text-secondary); line-height: 1.55;">
          All scanned commands and environments have corresponding package imports or macro definitions. Overleaf compilation remains the final verification step.
        </p>
      `;
      diagnosticsList.appendChild(cleanBox);
      return;
    }

    issues.forEach(issue => {
      const card = document.createElement('div');
      card.className = `diag-card diag-card-${issue.severity}`;

      const header = document.createElement('div');
      header.className = 'diag-card-header';

      const titleWrap = document.createElement('div');
      titleWrap.style.display = 'flex';
      titleWrap.style.alignItems = 'center';
      titleWrap.style.gap = '8px';

      const severityTag = document.createElement('span');
      severityTag.className = `diag-severity-tag diag-severity-${issue.severity}`;
      severityTag.textContent = issue.severity.toUpperCase();

      const title = document.createElement('strong');
      title.className = 'diag-card-title';
      title.textContent = issue.title;

      titleWrap.appendChild(severityTag);
      titleWrap.appendChild(title);

      const lineBadge = document.createElement('span');
      lineBadge.className = 'diag-line-badge';
      lineBadge.textContent = `Line ${issue.line}`;

      header.appendChild(titleWrap);
      header.appendChild(lineBadge);

      const desc = document.createElement('p');
      desc.className = 'diag-desc';
      desc.textContent = issue.description;

      card.appendChild(header);
      card.appendChild(desc);

      if (issue.code) {
        const codePre = document.createElement('pre');
        codePre.className = 'diag-code-pre';
        codePre.textContent = issue.code;
        card.appendChild(codePre);
      }

      if (issue.fix) {
        const fixBox = document.createElement('div');
        fixBox.className = 'diag-fix-box';

        const fixLabel = document.createElement('span');
        fixLabel.style.fontSize = '0.8rem';
        fixLabel.style.fontWeight = '700';
        fixLabel.style.color = 'var(--text-main)';
        fixLabel.textContent = 'Recommended Preamble Addition:';

        const fixActionWrap = document.createElement('div');
        fixActionWrap.style.display = 'flex';
        fixActionWrap.style.alignItems = 'center';
        fixActionWrap.style.justifyContent = 'space-between';
        fixActionWrap.style.flexWrap = 'wrap';
        fixActionWrap.style.gap = '8px';
        fixActionWrap.style.marginTop = '6px';

        const fixCode = document.createElement('code');
        fixCode.className = 'diag-fix-code';
        fixCode.textContent = issue.fix;

        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'btn btn-ghost btn-sm';
        copyBtn.style.padding = '4px 10px';
        copyBtn.style.fontSize = '0.78rem';
        copyBtn.textContent = 'Copy Fix';
        copyBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(issue.fix).then(() => {
            copyBtn.textContent = 'Copied!';
            setTimeout(() => { copyBtn.textContent = 'Copy Fix'; }, 2000);
          }).catch(() => {
            copyBtn.textContent = 'Failed';
          });
        });

        fixActionWrap.appendChild(fixCode);
        fixActionWrap.appendChild(copyBtn);

        fixBox.appendChild(fixLabel);
        fixBox.appendChild(fixActionWrap);
        card.appendChild(fixBox);
      }

      diagnosticsList.appendChild(card);
    });
  }

  // Trigger analysis on input change
  function runDiagnostics() {
    const val = textarea.value;
    const lines = val.split(/\r?\n/).length;
    if (lineCountBadge) {
      lineCountBadge.textContent = `${lines} line${lines === 1 ? '' : 's'}`;
    }
    const analysis = analyzeLaTeX(val);
    renderDiagnostics(analysis);
  }

  textarea.addEventListener('input', runDiagnostics);

  // Preset Selection Event
  if (presetSelect) {
    presetSelect.addEventListener('change', () => {
      const selectedId = presetSelect.value;
      const found = PRESETS.find(p => p.id === selectedId);
      if (found) {
        textarea.value = found.latex;
        runDiagnostics();
      }
    });
  }

  // Clear Action
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      textarea.value = '';
      if (presetSelect) presetSelect.value = '';
      runDiagnostics();
      textarea.focus();
    });
  }

  // Reset Action (Load Preset 1)
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (presetSelect) presetSelect.value = PRESETS[0].id;
      textarea.value = PRESETS[0].latex;
      runDiagnostics();
    });
  }

  // Copy Master Preamble Button
  if (copyPreambleBtn) {
    copyPreambleBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(RECOMMENDED_PREAMBLE).then(() => {
        copyPreambleBtn.textContent = 'Preamble Copied!';
        setTimeout(() => { copyPreambleBtn.textContent = 'Copy Master Preamble'; }, 2500);
      }).catch(() => {
        copyPreambleBtn.textContent = 'Copy Failed';
      });
    });
  }

  // Initial Run with Preset 1
  if (!textarea.value.trim() && PRESETS.length > 0) {
    if (presetSelect) presetSelect.value = PRESETS[0].id;
    textarea.value = PRESETS[0].latex;
  }
  runDiagnostics();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCheckerUI);
  } else {
    initCheckerUI();
  }
}
