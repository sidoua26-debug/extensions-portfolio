import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const CHECKER_HTML_PATH = path.join(rootDir, 'demos/overleaf-preamble-checker/index.html');
const CHECKER_JS_PATH = path.join(rootDir, 'assets/js/overleaf-preamble-checker.js');
const GUIDE_HTML_PATH = path.join(rootDir, 'guides/fix-pandoc-latex-errors-in-overleaf/index.html');
const W2L_PRODUCT_PATH = path.join(rootDir, 'word-to-latex/index.html');
const CONVERTER_PATH = path.join(rootDir, 'word-to-latex-converter/index.html');
const GUIDES_HUB_PATH = path.join(rootDir, 'guides/index.html');
const SITEMAP_PATH = path.join(rootDir, 'sitemap.xml');

const FORBIDDEN_WORDS_REGEX = /\b(zero|never|always|100%|completely|entirely|permanent|guarantee|unlimited|nothing|no one)\b/i;

function stripCodeAndScripts(content) {
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<pre\b[^<]*(?:(?!<\/pre>)<[^<]*)*<\/pre>/gi, '')
    .replace(/<code\b[^<]*(?:(?!<\/code>)<[^<]*)*<\/code>/gi, '')
    .replace(/<[^>]+>/g, ' ');
}

describe('Overleaf Preamble Checker & Companion Guide Validation', () => {
  it('1. Required files exist on disk', () => {
    assert.ok(fs.existsSync(CHECKER_HTML_PATH), 'demos/overleaf-preamble-checker/index.html must exist');
    assert.ok(fs.existsSync(CHECKER_JS_PATH), 'assets/js/overleaf-preamble-checker.js must exist');
    assert.ok(fs.existsSync(GUIDE_HTML_PATH), 'guides/fix-pandoc-latex-errors-in-overleaf/index.html must exist');
  });

  describe('2. Diagnostic Engine Unit & Logic Tests', async () => {
    // Dynamic import of the diagnostic engine module
    let engine;
    try {
      engine = await import('../assets/js/overleaf-preamble-checker.js');
    } catch {
      // Will be evaluated once the file exists
    }

    it('engine exports analyzeLaTeX, PRESETS, and RECOMMENDED_PREAMBLE', () => {
      assert.ok(engine, 'Engine module must load successfully');
      assert.equal(typeof engine.analyzeLaTeX, 'function', 'analyzeLaTeX must be a function');
      assert.ok(Array.isArray(engine.PRESETS), 'PRESETS must be an array');
      assert.ok(engine.PRESETS.length >= 5, 'Must provide at least 5 presets');
      assert.ok(typeof engine.RECOMMENDED_PREAMBLE === 'string', 'RECOMMENDED_PREAMBLE must be exported string');
    });

    it('detects missing \\tightlist and suppresses when defined', () => {
      assert.ok(engine, 'Engine must exist');
      const missing = engine.analyzeLaTeX('\\begin{itemize}\n\\tightlist\n\\item First\n\\end{itemize}');
      assert.ok(missing.issues.some(i => i.id === 'missing-tightlist'), 'Flags missing \\tightlist');

      const withDef = engine.analyzeLaTeX('\\providecommand{\\tightlist}{\\setlength{\\itemsep}{0pt}}\n\\tightlist\n\\item First');
      assert.ok(!withDef.issues.some(i => i.id === 'missing-tightlist'), 'Suppresses warning when \\providecommand{\\tightlist} exists');

      const withNewCmd = engine.analyzeLaTeX('\\newcommand{\\tightlist}{}\n\\tightlist');
      assert.ok(!withNewCmd.issues.some(i => i.id === 'missing-tightlist'), 'Suppresses warning when \\newcommand{\\tightlist} exists');

      const withDefCmd = engine.analyzeLaTeX('\\def\\tightlist{}\n\\tightlist');
      assert.ok(!withDefCmd.issues.some(i => i.id === 'missing-tightlist'), 'Suppresses warning when \\def\\tightlist exists');
    });

    it('detects missing \\pandocbounded and suppresses across all supported definition forms', () => {
      assert.ok(engine, 'Engine must exist');
      const missing = engine.analyzeLaTeX('\\pandocbounded{\\includegraphics{chart.png}}');
      assert.ok(missing.issues.some(i => i.id === 'missing-pandocbounded'), 'Flags missing \\pandocbounded');

      const definitionForms = [
        '\\providecommand{\\pandocbounded}[1]{#1}',
        '\\newcommand{\\pandocbounded}[1]{#1}',
        '\\newcommand*{\\pandocbounded}[1]{#1}',
        '\\renewcommand{\\pandocbounded}[1]{#1}',
        '\\renewcommand*{\\pandocbounded}[1]{#1}',
        '\\def\\pandocbounded#1{#1}',
        '\\DeclareRobustCommand{\\pandocbounded}[1]{#1}',
        '\\DeclareRobustCommand*{\\pandocbounded}[1]{#1}'
      ];

      for (const def of definitionForms) {
        const withDef = engine.analyzeLaTeX(`${def}\n\\pandocbounded{\\includegraphics{chart.png}}`);
        assert.ok(
          !withDef.issues.some(i => i.id === 'missing-pandocbounded'),
          `Suppresses missing-pandocbounded when defined via: ${def}`
        );
      }
    });

    it('suppresses \\tightlist across all supported definition forms', () => {
      assert.ok(engine, 'Engine must exist');
      const definitionForms = [
        '\\providecommand{\\tightlist}{\\setlength{\\itemsep}{0pt}}',
        '\\newcommand{\\tightlist}{}',
        '\\newcommand*{\\tightlist}{}',
        '\\renewcommand{\\tightlist}{}',
        '\\renewcommand*{\\tightlist}{}',
        '\\def\\tightlist{}',
        '\\DeclareRobustCommand{\\tightlist}{}',
        '\\DeclareRobustCommand*{\\tightlist}{}'
      ];

      for (const def of definitionForms) {
        const withDef = engine.analyzeLaTeX(`${def}\n\\begin{itemize}\n\\tightlist\n\\item Item\n\\end{itemize}`);
        assert.ok(
          !withDef.issues.some(i => i.id === 'missing-tightlist'),
          `Suppresses missing-tightlist when defined via: ${def}`
        );
      }
    });

    it('detects missing longtable package and handles comma-separated lists', () => {
      assert.ok(engine, 'Engine must exist');
      const missing = engine.analyzeLaTeX('\\begin{longtable}{ll}\nData\n\\end{longtable}');
      assert.ok(missing.issues.some(i => i.id === 'missing-longtable'), 'Flags missing longtable');

      const withSingle = engine.analyzeLaTeX('\\usepackage{longtable}\n\\begin{longtable}{ll}\nData\n\\end{longtable}');
      assert.ok(!withSingle.issues.some(i => i.id === 'missing-longtable'), 'Suppresses with \\usepackage{longtable}');

      const withComma = engine.analyzeLaTeX('\\usepackage{booktabs, longtable, graphicx}\n\\begin{longtable}{ll}\nData\n\\end{longtable}');
      assert.ok(!withComma.issues.some(i => i.id === 'missing-longtable'), 'Suppresses with comma-separated package list');
    });

    it('detects missing booktabs rules and suppresses when booktabs is loaded', () => {
      assert.ok(engine, 'Engine must exist');
      const missing = engine.analyzeLaTeX('\\begin{tabular}{cc}\n\\toprule\nA & B \\\\\n\\midrule\n1 & 2 \\\\\n\\bottomrule\n\\end{tabular}');
      assert.ok(missing.issues.some(i => i.id === 'missing-booktabs'), 'Flags missing booktabs');

      const withPkg = engine.analyzeLaTeX('\\usepackage{booktabs}\n\\toprule');
      assert.ok(!withPkg.issues.some(i => i.id === 'missing-booktabs'), 'Suppresses with \\usepackage{booktabs}');
    });

    it('detects missing graphicx and multirow packages', () => {
      assert.ok(engine, 'Engine must exist');
      const missing = engine.analyzeLaTeX('\\includegraphics[width=0.8\\textwidth]{fig.png}\n\\multirow{2}{*}{Header}');
      assert.ok(missing.issues.some(i => i.id === 'missing-graphicx'), 'Flags missing graphicx');
      assert.ok(missing.issues.some(i => i.id === 'missing-multirow'), 'Flags missing multirow');

      const withPkgs = engine.analyzeLaTeX('\\usepackage{graphicx}\n\\usepackage{multirow}\n\\includegraphics{fig.png}\n\\multirow{2}{*}{Header}');
      assert.ok(!withPkgs.issues.some(i => i.id === 'missing-graphicx'), 'Suppresses graphicx');
      assert.ok(!withPkgs.issues.some(i => i.id === 'missing-multirow'), 'Suppresses multirow');
    });

    it('detects malformed \\usepackage declarations', () => {
      assert.ok(engine, 'Engine must exist');
      const emptyBraces = engine.analyzeLaTeX('\\usepackage{}\n\\documentclass{article}\n\\begin{document}\nHi\n\\end{document}');
      assert.ok(emptyBraces.issues.some(i => i.id === 'malformed-usepackage'), 'Flags empty \\usepackage{}');

      const unclosed = engine.analyzeLaTeX('\\usepackage{amsmath\n\\begin{document}\nHi\n\\end{document}');
      assert.ok(unclosed.issues.some(i => i.id === 'malformed-usepackage'), 'Flags unclosed \\usepackage{');
    });

    it('correctly distinguishes fragment-only input from complete documents', () => {
      assert.ok(engine, 'Engine must exist');
      const fragment = engine.analyzeLaTeX('\\section{Intro}\nText without documentclass or begin document.');
      assert.equal(fragment.isFragment, true, 'Flags fragment-only input');
      assert.ok(fragment.issues.some(i => i.id === 'fragment-without-preamble'), 'Issues include fragment advice');

      const complete = engine.analyzeLaTeX('\\documentclass{article}\n\\begin{document}\n\\section{Intro}\nText\n\\end{document}');
      assert.equal(complete.isFragment, false, 'Identifies complete document');
      assert.ok(!complete.issues.some(i => i.id === 'fragment-without-preamble'), 'Does not flag fragment on complete doc');
    });

    it('ignores TeX comments starting with % and preserves escaped \\%', () => {
      assert.ok(engine, 'Engine must exist');
      const commentedOut = engine.analyzeLaTeX('% \\tightlist\n% \\begin{longtable}\n\\documentclass{article}\n\\begin{document}\nRegular text with 50\\% discount\n\\end{document}');
      assert.ok(!commentedOut.issues.some(i => i.id === 'missing-tightlist'), 'Ignores commented-out \\tightlist');
      assert.ok(!commentedOut.issues.some(i => i.id === 'missing-longtable'), 'Ignores commented-out longtable');
    });

    it('verifies that all presets produce expected, deterministic diagnostics', () => {
      assert.ok(engine, 'Engine must exist');
      for (const preset of engine.PRESETS) {
        assert.ok(preset.id, 'Preset must have id');
        assert.ok(preset.title, 'Preset must have title');
        assert.ok(preset.latex, 'Preset must have latex snippet');
        const res = engine.analyzeLaTeX(preset.latex);
        assert.ok(Array.isArray(res.issues), `Preset ${preset.id} must return issues array`);
        if (preset.expectedClean) {
          assert.equal(res.issues.length, 0, `Clean preset ${preset.id} must yield 0 issues`);
        } else {
          assert.ok(res.issues.length > 0, `Error preset ${preset.id} must yield issues`);
        }
      }
    });

    it('enforces comment protection: definitions and packages inside comments do not suppress errors', () => {
      assert.ok(engine, 'Engine must exist');
      // Definition in comment must not suppress
      const commentedDef = engine.analyzeLaTeX('% \\providecommand{\\pandocbounded}[1]{#1}\n\\pandocbounded{\\includegraphics{fig.png}}');
      assert.ok(commentedDef.issues.some(i => i.id === 'missing-pandocbounded'), 'Commented definition must not suppress missing-pandocbounded');

      // Package in comment must not suppress
      const commentedPkg = engine.analyzeLaTeX('% \\usepackage{booktabs}\n\\toprule');
      assert.ok(commentedPkg.issues.some(i => i.id === 'missing-booktabs'), 'Commented \\usepackage must not suppress missing-booktabs');

      // Escaped % followed by macro call on same line is NOT a comment and must be detected
      const escapedPercent = engine.analyzeLaTeX('Text with 50\\% discount and \\pandocbounded{\\includegraphics{fig.png}}');
      assert.ok(escapedPercent.issues.some(i => i.id === 'missing-pandocbounded'), 'Macro after escaped \\% must be detected');
    });

    it('distinguishes missing preamble context (fragment) from confirmed missing package errors', () => {
      assert.ok(engine, 'Engine must exist');
      // Fragment: missing preamble AND missing package
      const fragment = engine.analyzeLaTeX('\\begin{longtable}{ll}\nA & B \\\\\n\\end{longtable}');
      assert.equal(fragment.isFragment, true, 'Flags fragment without preamble');
      assert.ok(fragment.issues.some(i => i.id === 'fragment-without-preamble'), 'Includes fragment-without-preamble advisory');
      assert.ok(fragment.issues.some(i => i.id === 'missing-longtable'), 'Also detects specific missing-longtable package');

      // Standalone with missing package: has preamble context, but lacks package
      const standalone = engine.analyzeLaTeX('\\documentclass{article}\n\\begin{document}\n\\begin{longtable}{ll}\nA & B \\\\\n\\end{longtable}\n\\end{document}');
      assert.equal(standalone.isFragment, false, 'Identifies standalone document');
      assert.ok(!standalone.issues.some(i => i.id === 'fragment-without-preamble'), 'Does not flag fragment-without-preamble on standalone');
      assert.ok(standalone.issues.some(i => i.id === 'missing-longtable'), 'Still detects missing-longtable on standalone');
    });

    it('provides valid, well-formed LaTeX in all suggested fixes with balanced braces', () => {
      assert.ok(engine, 'Engine must exist');
      const testCases = [
        '\\tightlist',
        '\\pandocbounded{\\includegraphics{fig.png}}',
        '\\begin{longtable}{l} X \\end{longtable}',
        '\\toprule',
        '\\includegraphics{fig.png}',
        '\\multirow{2}{*}{Test}',
        '\\usepackage{}',
        '\\usepackage{a, , b}'
      ];

      for (const snippet of testCases) {
        const res = engine.analyzeLaTeX(snippet);
        for (const issue of res.issues) {
          if (issue.fix) {
            assert.ok(typeof issue.fix === 'string' && issue.fix.length > 0, `Issue ${issue.id} fix must be non-empty string`);
            // LaTeX fixes should start with \ (command) or descriptive instruction
            assert.ok(
              issue.fix.startsWith('\\') || issue.fix.startsWith('Remove') || issue.fix.startsWith('Ensure') || issue.fix.startsWith('Separate') || issue.fix.startsWith('Use'),
              `Issue ${issue.id} fix has unexpected format: ${issue.fix}`
            );
            // Verify brace balance if fix contains TeX commands
            if (issue.fix.includes('{')) {
              const openBraces = (issue.fix.match(/\{/g) || []).length;
              const closeBraces = (issue.fix.match(/\}/g) || []).length;
              assert.equal(openBraces, closeBraces, `Braces must be balanced in fix for issue ${issue.id}: "${issue.fix}"`);
            }
          }
        }
      }
    });

    it('guarantees XSS safety: user input containing HTML tags is escaped and rendered safely', () => {
      assert.ok(engine, 'Engine must exist');
      const maliciousInput = '\\section{<script>alert("xss")</script>}\n<img src=x onerror=alert(1)>\n\\pandocbounded{\\includegraphics{test.png}}';
      const res = engine.analyzeLaTeX(maliciousInput);
      assert.ok(res.issues.length > 0, 'Processes input safely without crashing');

      // Audit JS file to verify all dynamic issue fields use textContent rather than innerHTML
      const jsCode = fs.readFileSync(CHECKER_JS_PATH, 'utf8');
      assert.ok(!jsCode.includes('innerHTML = issue.'), 'Must never assign issue property directly to innerHTML');
      assert.ok(!jsCode.includes('innerHTML += issue.'), 'Must never append issue property directly to innerHTML');
      assert.ok(jsCode.includes('.textContent = issue.title'), 'Uses textContent for issue title');
      assert.ok(jsCode.includes('.textContent = issue.description'), 'Uses textContent for issue description');
      assert.ok(jsCode.includes('.textContent = issue.fix'), 'Uses textContent for issue fix code');
      assert.ok(jsCode.includes('.textContent = issue.code'), 'Uses textContent for issue code snippet');
    });

    it('validates UI presets integrity and recommended master preamble completeness', () => {
      assert.ok(engine, 'Engine must exist');
      // RECOMMENDED_PREAMBLE must compile clean with 0 issues
      const preambleAnalysis = engine.analyzeLaTeX(engine.RECOMMENDED_PREAMBLE);
      assert.equal(preambleAnalysis.issues.length, 0, 'RECOMMENDED_PREAMBLE must produce 0 issues');
      assert.equal(preambleAnalysis.isFragment, false, 'RECOMMENDED_PREAMBLE is a complete standalone document');

      // Check required packages in RECOMMENDED_PREAMBLE
      for (const requiredPkg of ['graphicx', 'booktabs', 'longtable', 'multirow', 'amsmath', 'hyperref']) {
        assert.ok(
          preambleAnalysis.packages.has(requiredPkg),
          `RECOMMENDED_PREAMBLE must load package: ${requiredPkg}`
        );
      }

      // Check defined macros in RECOMMENDED_PREAMBLE
      assert.ok(preambleAnalysis.definedMacros.has('tightlist'), 'RECOMMENDED_PREAMBLE must define tightlist');
      assert.ok(preambleAnalysis.definedMacros.has('pandocbounded'), 'RECOMMENDED_PREAMBLE must define pandocbounded');
    });
  });

  describe('3. Interactive Checker UI (/demos/overleaf-preamble-checker/)', () => {
    let html = '';
    try {
      html = fs.readFileSync(CHECKER_HTML_PATH, 'utf8');
    } catch {
      // will be read once created
    }

    it('has valid canonical URL, meta description (110-155 chars), and title', () => {
      assert.ok(
        html.includes('<link rel="canonical" href="https://extensionguy.me/demos/overleaf-preamble-checker/">'),
        'Checker canonical link must point to self'
      );

      const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/);
      assert.ok(titleMatch, 'Title must exist');
      assert.ok(titleMatch[1].includes('Overleaf') && titleMatch[1].includes('Checker'), 'Title describes checker');

      const descMatch = html.match(/<meta name="description" content="([^"]+)">/);
      assert.ok(descMatch, 'Meta description must exist');
      const desc = descMatch[1].trim();
      assert.ok(
        desc.length >= 110 && desc.length <= 155,
        `Checker meta description (${desc.length} chars) out of range [110, 155]: "${desc}"`
      );
    });

    it('contains zero forbidden claim words in visible prose', () => {
      const textOnly = stripCodeAndScripts(html);
      const match = textOnly.match(FORBIDDEN_WORDS_REGEX);
      assert.equal(match, null, `Forbidden word "${match ? match[0] : ''}" found in checker prose`);
    });

    it('promotes official store extensions and in-browser Word-to-LaTeX converter', () => {
      assert.ok(
        html.includes('https://microsoftedge.microsoft.com/addons/detail/word-to-latex-offline/lpehnpdkdiddlppobkcicdondaebijlf'),
        'Must link to Edge Add-on'
      );
      assert.ok(
        html.includes('https://chromewebstore.google.com/detail/word-to-latex-offline/appokjanohamffjlecncdegihoelkhco'),
        'Must link to Chrome Web Store'
      );
      assert.ok(
        html.includes('../../word-to-latex-converter/'),
        'Must cross-link to online converter'
      );
    });

    it('contains required UI elements: textarea, preset selector, reset button, and diagnostics panel', () => {
      assert.ok(html.includes('id="latexInput"'), 'Must contain textarea #latexInput');
      assert.ok(html.includes('id="presetSelect"'), 'Must contain preset dropdown #presetSelect');
      assert.ok(html.includes('id="clearBtn"'), 'Must contain clear button #clearBtn');
      assert.ok(html.includes('id="resetBtn"'), 'Must contain reset button #resetBtn');
      assert.ok(html.includes('id="diagnosticsList"'), 'Must contain diagnostics container #diagnosticsList');
      assert.ok(html.includes('id="recommendedPreamble"'), 'Must contain recommended preamble block #recommendedPreamble');
      assert.ok(html.includes('id="copyPreambleBtn"'), 'Must contain copy preamble button');
    });

    it('CSP compliant: loads external JS without inline executable script', () => {
      assert.ok(
        html.includes('<script src="../../assets/js/overleaf-preamble-checker.js" type="module" defer></script>') ||
        html.includes('<script src="../../assets/js/overleaf-preamble-checker.js" defer></script>'),
        'Must load external checker JS script'
      );
      const inlineScripts = html.match(/<script(?![^>]*type=["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/gi) || [];
      const nonExternal = inlineScripts.filter(tag => !tag.includes('src='));
      assert.equal(nonExternal.length, 0, 'No inline executable scripts allowed under strict CSP');
    });

    it('contains valid JSON-LD WebApplication and BreadcrumbList schemas', () => {
      const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      assert.ok(jsonLdMatch, 'JSON-LD block must exist');
      const parsed = JSON.parse(jsonLdMatch[1]);
      assert.equal(parsed['@context'], 'https://schema.org');
      assert.ok(Array.isArray(parsed['@graph']), '@graph array exists');

      const app = parsed['@graph'].find(item => item['@type'] === 'WebApplication');
      assert.ok(app, 'WebApplication schema present');
      assert.equal(app.url, 'https://extensionguy.me/demos/overleaf-preamble-checker/');

      const breadcrumb = parsed['@graph'].find(item => item['@type'] === 'BreadcrumbList');
      assert.ok(breadcrumb, 'BreadcrumbList schema present');
      assert.equal(breadcrumb.itemListElement.length, 3, 'Must have 3 breadcrumb levels');
      assert.equal(breadcrumb.itemListElement[0].item, 'https://extensionguy.me/');
      assert.equal(breadcrumb.itemListElement[1].name, 'Demos');
      assert.equal(breadcrumb.itemListElement[2].item, 'https://extensionguy.me/demos/overleaf-preamble-checker/');
    });
  });

  describe('3b. Companion Technical Guide (/guides/fix-pandoc-latex-errors-in-overleaf/)', () => {
    let html = '';
    try {
      html = fs.readFileSync(GUIDE_HTML_PATH, 'utf8');
    } catch {
      // will be read once created
    }

    it('has required title and meta description (110-155 chars)', () => {
      assert.ok(
        html.includes('How to Fix Common Pandoc LaTeX Errors in Overleaf'),
        'H1/Title must match exact required phrasing'
      );
      assert.ok(
        html.includes('<link rel="canonical" href="https://extensionguy.me/guides/fix-pandoc-latex-errors-in-overleaf/">'),
        'Canonical link must point to self'
      );

      const descMatch = html.match(/<meta name="description" content="([^"]+)">/);
      assert.ok(descMatch, 'Meta description must exist');
      const desc = descMatch[1].trim();
      assert.ok(
        desc.length >= 110 && desc.length <= 155,
        `Guide meta description (${desc.length} chars) out of range [110, 155]: "${desc}"`
      );
    });

    it('contains zero forbidden claim words in visible prose', () => {
      const textOnly = stripCodeAndScripts(html);
      const match = textOnly.match(FORBIDDEN_WORDS_REGEX);
      assert.equal(match, null, `Forbidden word "${match ? match[0] : ''}" found in guide prose`);
    });

    it('covers all required technical topics and structured sections', () => {
      assert.ok(html.includes('\\tightlist'), 'Discusses \\tightlist');
      assert.ok(html.includes('\\pandocbounded'), 'Discusses \\pandocbounded');
      assert.ok(html.includes('booktabs'), 'Discusses booktabs');
      assert.ok(html.includes('longtable'), 'Discusses longtable');
      assert.ok(html.includes('graphicx'), 'Discusses graphicx');
      assert.ok(html.includes('multirow'), 'Discusses multirow');
      assert.ok(html.includes('Fragment') || html.includes('fragment'), 'Covers fragment vs standalone');
      assert.ok(html.includes('Overleaf'), 'Discusses Overleaf workflows');
    });

    it('contains clear disclaimers on what in-browser inspection cannot prove', () => {
      assert.ok(
        html.includes('advisory') || html.includes('cannot guarantee') || html.includes('not a full LaTeX compiler'),
        'Must contain clear disclaimer about static checker limits'
      );
    });

    it('cites authoritative primary references', () => {
      assert.ok(html.includes('https://pandoc.org/MANUAL.html'), 'Cites Pandoc manual');
      assert.ok(html.includes('https://docs.overleaf.com/'), 'Cites Overleaf documentation');
    });

    it('links directly to the interactive preamble checker and converter', () => {
      assert.ok(
        html.includes('../../demos/overleaf-preamble-checker/'),
        'Must link to interactive checker demo'
      );
      assert.ok(
        html.includes('../../word-to-latex-converter/'),
        'Must link to online Word-to-LaTeX converter'
      );
    });
  });

  describe('4. Site Integration & Cross-Linking', () => {
    it('Guides hub (/guides/index.html) lists Card 8 for the new guide', () => {
      const hubHtml = fs.readFileSync(GUIDES_HUB_PATH, 'utf8');
      assert.ok(
        hubHtml.includes('./fix-pandoc-latex-errors-in-overleaf/'),
        'Guides hub must link to fix-pandoc-latex-errors-in-overleaf'
      );
      assert.ok(
        hubHtml.includes('How to Fix Common Pandoc LaTeX Errors in Overleaf'),
        'Guides hub must display title'
      );
    });

    it('Word to LaTeX product page (/word-to-latex/) links to checker demo and guide', () => {
      const w2lHtml = fs.readFileSync(W2L_PRODUCT_PATH, 'utf8');
      assert.ok(
        w2lHtml.includes('../demos/overleaf-preamble-checker/'),
        'Product page must link to preamble checker demo'
      );
      assert.ok(
        w2lHtml.includes('../guides/fix-pandoc-latex-errors-in-overleaf/'),
        'Product page must link to companion guide'
      );
    });

    it('Word to LaTeX converter page (/word-to-latex-converter/) links to checker demo and guide', () => {
      const convHtml = fs.readFileSync(CONVERTER_PATH, 'utf8');
      assert.ok(
        convHtml.includes('../demos/overleaf-preamble-checker/'),
        'Converter page must link to preamble checker demo'
      );
      assert.ok(
        convHtml.includes('../guides/fix-pandoc-latex-errors-in-overleaf/'),
        'Converter page must link to companion guide'
      );
    });

    it('sitemap.xml contains exactly 23 canonical URLs including both new URLs', () => {
      const sitemap = fs.readFileSync(SITEMAP_PATH, 'utf8');
      const locMatches = sitemap.match(/<loc>https:\/\/extensionguy\.me\/[^<]*<\/loc>/g) || [];
      assert.equal(locMatches.length, 23, `sitemap.xml must have exactly 23 URLs, found ${locMatches.length}`);
      assert.ok(
        sitemap.includes('<loc>https://extensionguy.me/demos/overleaf-preamble-checker/</loc>'),
        'sitemap.xml must include demos/overleaf-preamble-checker/'
      );
      assert.ok(
        sitemap.includes('<loc>https://extensionguy.me/guides/fix-pandoc-latex-errors-in-overleaf/</loc>'),
        'sitemap.xml must include guides/fix-pandoc-latex-errors-in-overleaf/'
      );
    });
  });
});
