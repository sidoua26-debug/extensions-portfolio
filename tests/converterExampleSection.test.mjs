import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORTFOLIO_ROOT = path.resolve(__dirname, '..');
const CONVERTER_HTML_PATH = path.join(PORTFOLIO_ROOT, 'word-to-latex-converter/index.html');

describe('Step 4C: Converter Real Conversion Example Section Test', () => {
  const html = fs.readFileSync(CONVERTER_HTML_PATH, 'utf8');

  it('1. Example section exists in static HTML with accessible heading and backlink', () => {
    assert.ok(html.includes('id="conversionExample"'), 'Must contain #conversionExample container');
    assert.ok(
      html.includes('Word to LaTeX Conversion Example'),
      'Must contain heading "Word to LaTeX Conversion Example"'
    );
    assert.ok(
      html.includes('See how a Word document is transformed into LaTeX using our in-browser Pandoc converter.'),
      'Must contain approved introductory text'
    );
    assert.ok(
      html.includes('href="#converterTool"'),
      'Must contain backlink pointing to #converterTool'
    );
  });

  it('2. Word content representation and real LaTeX output are present', () => {
    // Word document content representation
    assert.ok(html.includes('Document Structure and Typographic Elements'));
    assert.ok(html.includes('1. Structural Overview'));
    assert.ok(html.includes('2. Multilingual Character Encoding'));
    assert.ok(html.includes('3. Structured Data and Formats'));
    assert.ok(html.includes('4. Mathematical Notation'));

    // Real generated LaTeX output in <pre><code>
    assert.ok(html.includes('% Required packages (add to your preamble):'));
    assert.ok(html.includes('% \\usepackage{booktabs}'));
    assert.ok(html.includes('\\textbf{bold typographic emphasis}'));
    assert.ok(html.includes('\\emph{italicised text runs}'));
    assert.ok(html.includes('{\\def\\LTcaptype{none}'));
    assert.ok(html.includes('\\begin{longtable}[]{@{}lll@{}}'));
    assert.ok(html.includes('\\(E\\  = \\ mc^{2}\\)'));
  });

  it('3. HTML entities are safely escaped in code blocks', () => {
    // Verify &amp; is escaped inside pre/code
    assert.ok(html.includes('\\textbf{Element} &amp; \\textbf{Style} &amp; \\textbf{Alignment} \\\\'));
    // Ensure raw unescaped & does not appear within table rows in code
    assert.ok(!html.includes('<code>% Required packages\n\\textbf{Element} & \\textbf{Style}'));
  });

  it('4. Feature explanations and honest conversion boundaries are disclosed', () => {
    assert.ok(html.includes('Demonstrated Engine Features'));
    assert.ok(html.includes('Honest Conversion Notes &amp; Scope'));
    assert.ok(html.includes('The example above is generated in <em>LaTeX Fragment</em> mode'));
    assert.ok(html.includes('Preamble Dependencies:'));
    assert.ok(html.includes('Conversion Boundaries:'));

    // Extract the Demonstrated Engine Features section
    const featuresMatch = html.match(/<strong[^>]*>Demonstrated Engine Features<\/strong>[\s\S]*?<\/ul>/);
    assert.ok(featuresMatch, 'Must find Demonstrated Engine Features list');
    const featuresList = featuresMatch[0];

    // Verify table rules claim in features list
    assert.ok(
      featuresList.includes('with <code>\\toprule</code> and <code>\\bottomrule</code> rules'),
      'Must accurately describe demonstrated booktabs rules in features list'
    );
    assert.ok(
      !featuresList.includes('\\midrule'),
      'Must NOT falsely claim \\midrule in the example explanation'
    );

    // Verify heading limitation disclosure
    assert.ok(
      html.includes('This lightweight sample DOCX lacks Word style definitions, so its headings appear as plain text rather than LaTeX section commands. Results depend on the source document\'s structure.'),
      'Must disclose the heading-limitation note for the sample DOCX'
    );
  });

  it('5. Converter controls remain untouched and Plausible analytics removed', () => {
    assert.ok(html.includes('id="converterDropZone"'));
    assert.ok(html.includes('id="converterSampleBtn"'));
    assert.ok(html.includes('id="converterOutputContainer"'));
    assert.ok(!html.includes('assets/js/plausible-init.js'));
    assert.ok(!html.includes('https://plausible.io'));
  });
});
