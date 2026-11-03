import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORTFOLIO_ROOT = path.resolve(__dirname, '..');

describe('Step 4B: Internal Link Anchor Optimization & Clarity Test', () => {
  const indexHtml = fs.readFileSync(path.join(PORTFOLIO_ROOT, 'index.html'), 'utf8');
  const buildRedesign = fs.readFileSync(path.join(PORTFOLIO_ROOT, 'build_redesign.py'), 'utf8');

  it('1. Homepage Product 1 card uses clear "Extension details" anchor', () => {
    assert.ok(
      indexHtml.includes('<a href="/word-to-latex/" class="btn btn-ghost btn-sm">Extension details</a>'),
      'Homepage Product 1 card must link to /word-to-latex/ with "Extension details" anchor'
    );
    assert.ok(
      !indexHtml.includes('<a href="/word-to-latex/" class="btn btn-ghost btn-sm">Product details</a>'),
      'Ambiguous "Product details" anchor must be eliminated for Word to LaTeX card'
    );
  });

  it('2. Homepage footer clearly differentiates "Word to LaTeX Extension" from "Online Converter"', () => {
    assert.ok(
      indexHtml.includes('<a href="/word-to-latex/" class="footer-link">Word to LaTeX Extension</a>'),
      'Homepage footer must explicitly label Word to LaTeX as Extension'
    );
    assert.ok(
      indexHtml.includes('<a href="/word-to-latex-converter/" class="footer-link">Online Converter</a>'),
      'Homepage footer must keep Online Converter link intact'
    );
  });

  it('3. build_redesign.py generator source maintains exact parity', () => {
    assert.ok(
      buildRedesign.includes('<a href="/word-to-latex/" class="btn btn-ghost btn-sm">Extension details</a>'),
      'build_redesign.py must generate "Extension details" anchor'
    );
    assert.ok(
      buildRedesign.includes('<a href="/word-to-latex/" class="footer-link">Word to LaTeX Extension</a>'),
      'build_redesign.py must generate "Word to LaTeX Extension" footer link'
    );
  });
});
