import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORTFOLIO_ROOT = path.resolve(__dirname, '..');
const CONVERTER_HTML_PATH = path.join(PORTFOLIO_ROOT, 'word-to-latex-converter/index.html');

describe('Step 4D: Overleaf Workflow Section Test', () => {
  const html = fs.readFileSync(CONVERTER_HTML_PATH, 'utf8');

  // Helper to isolate the #overleafWorkflow section HTML
  const workflowMatch = html.match(/<section id="overleafWorkflow"[\s\S]*?<\/section>/);
  assert.ok(workflowMatch, 'Must find #overleafWorkflow section');
  const workflowHtml = workflowMatch[0];

  it('1. Overleaf workflow section exists in static HTML with accessible heading and backlink', () => {
    assert.ok(workflowHtml.includes('id="overleafWorkflowHeading"'));
    assert.ok(
      workflowHtml.includes('How to Convert Word to LaTeX for Overleaf'),
      'Must contain heading "How to Convert Word to LaTeX for Overleaf"'
    );
    assert.ok(
      workflowHtml.includes('Convert your Word document locally in your browser, then copy or import the generated LaTeX into your Overleaf project.'),
      'Must contain approved introductory text'
    );
    assert.ok(
      workflowHtml.includes('href="#converterTool"'),
      'Must contain backlink pointing to #converterTool'
    );
  });

  it('2. All four workflow steps appear in logical order inside #overleafWorkflow', () => {
    const step1Idx = workflowHtml.indexOf('Choose your Word document');
    const step2Idx = workflowHtml.indexOf('Select your output mode');
    const step3Idx = workflowHtml.indexOf('Copy or download LaTeX');
    const step4Idx = workflowHtml.indexOf('Use the result in Overleaf');

    assert.ok(step1Idx > 0, 'Step 1 must exist');
    assert.ok(step2Idx > step1Idx, 'Step 2 must follow Step 1');
    assert.ok(step3Idx > step2Idx, 'Step 3 must follow Step 2');
    assert.ok(step4Idx > step3Idx, 'Step 4 must follow Step 3');
  });

  it('3. Accurate Fragment mode insertion location and preamble guidance inside #overleafWorkflow', () => {
    assert.ok(
      workflowHtml.includes('between <code>\\begin{document}</code> and <code>\\end{document}</code>'),
      'Must specify pasting fragment between \\begin{document} and \\end{document}'
    );
    assert.ok(
      workflowHtml.includes('(do not replace the entire file)'),
      'Must caution against replacing the entire file with a fragment'
    );
    assert.ok(
      workflowHtml.includes('Place required <code>\\usepackage</code> declarations in your preamble before <code>\\begin{document}</code>'),
      'Must instruct placing required packages in preamble before \\begin{document}'
    );
  });

  it('4. Accurate Complete Document output description and Overleaf project settings inside #overleafWorkflow', () => {
    assert.ok(
      workflowHtml.includes('\\documentclass[11pt,a4paper]{article}'),
      'Must accurately describe verified complete document class'
    );
    assert.ok(
      workflowHtml.includes('Upload feature'),
      'Must reference Overleaf Upload feature'
    );
    assert.ok(
      workflowHtml.includes('Main document'),
      'Must reference setting the Main document in Overleaf project settings'
    );
    assert.ok(
      workflowHtml.includes('or copy its contents into <code>main.tex</code> in a new blank project'),
      'Must mention copying into main.tex of a new blank project as an alternative'
    );
  });

  it('5. Contextual Overleaf documentation links are present with safe attributes', () => {
    assert.ok(
      workflowHtml.includes('https://docs.overleaf.com/managing-projects-and-files/adding-files-to-a-project/uploading-files-to-a-project'),
      'Must link to official Overleaf file upload documentation'
    );
    assert.ok(
      workflowHtml.includes('https://docs.overleaf.com/getting-started/recompiling-your-project/the-main-document'),
      'Must link to official Overleaf main document documentation'
    );
    assert.ok(
      workflowHtml.includes('target="_blank" rel="noopener noreferrer"'),
      'External documentation links must have safe target and rel attributes'
    );
  });

  it('6. Realistic compilation expectations and accurate privacy boundary inside #overleafWorkflow', () => {
    assert.ok(
      workflowHtml.includes('Recompile to PDF in Overleaf and check equations, table borders, and document formatting.'),
      'Must recommend compiling and reviewing equations, tables, and layout'
    );
    assert.ok(
      workflowHtml.includes('Manual preamble adjustments may be required depending on your packages and template.'),
      'Must honestly note that manual preamble adjustments may be required without guaranteeing compilation'
    );
    assert.ok(
      workflowHtml.includes('Conversion runs locally in your browser via WebAssembly without sending your Word document to ExtensionGuy servers.'),
      'Must state client-side conversion without server transmission'
    );
    assert.ok(
      workflowHtml.includes('If you subsequently paste or upload the generated code into Overleaf, that content is processed by Overleaf under their separate third-party terms and cloud privacy policy.'),
      'Must explicitly distinguish Overleaf cloud processing from ExtensionGuy'
    );
  });

  it('7. Existing conversion example and converter controls remain completely untouched', () => {
    assert.ok(html.includes('id="conversionExample"'), 'Conversion example section must remain intact');
    assert.ok(html.includes('id="converterDropZone"'), 'Dropzone must remain intact');
    assert.ok(html.includes('id="modeFragmentBtn"'), 'Mode fragment button must remain intact');
    assert.ok(html.includes('id="modeDocumentBtn"'), 'Mode document button must remain intact');
    assert.ok(html.includes('id="converterOutputContainer"'), 'Output container must remain intact');
    assert.ok(html.includes('% \\usepackage{booktabs}'), 'Step 4C example snippet must remain intact');
  });
});
