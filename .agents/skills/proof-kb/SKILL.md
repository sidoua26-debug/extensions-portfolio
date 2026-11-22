---
name: proof-kb
description: Build and maintain an atomic First-Hand Proof Knowledge Base (seo/kb/) inside the ExtensionGuy repository, draft or upgrade pages with Consensus + Proof Card architecture, and propagate new benchmarks or facts across every matching page via route-fact. Scoped to ExtensionGuy's static website, browser extensions, guides, and tools.
metadata:
  author: illyism
  source: https://github.com/Illyism/seo-skills (commit a158c36a1c2c84a44ee7a1ae69c009caf73e1a35)
  adapted_for: ExtensionGuy (https://extensionguy.me)
  version: 1.0.1
  license: MIT
---

# First-hand proof knowledge base (`seo/kb/`) for ExtensionGuy

Verifiable first-hand technical receipts—such as concrete benchmark numbers, measured client-side privacy boundaries, test counts, and exact feature specifications—differentiate technical guides and product pages from generic AI-generated content.

1. **Open with concrete first-hand receipts** (exact WASM bundle sizes, in-browser conversion benchmarks, test counts, or local execution proof).
2. **Stack verifiable proof categories** across guides and product pages.
3. **Preserve privacy-first guarantees**: ExtensionGuy tools and extensions operate on-device without remote document uploads. Proof points should verify and highlight these on-device boundaries.

Store verifiable facts in `seo/kb/` and wire those atomic proof files into product pages, guides (`guides/`), demos (`demos/`), and tools (`pdf-tools/`, `word-to-latex-converter/`). Never invent specs, performance numbers, or user metrics.

> **Note on Upstream Claims:** Upstream references to guaranteed top-3 rankings or automated AI citations are examples, not guarantees.

## Workflow routing decision tree

Walk this tree on every invocation:

```
Does `seo/kb/brand-ssot.md` exist?
├── No -> Workflow 1: `init`, then continue down this tree
└── Yes
    ├── Did the repository just ship a benchmark, product release, or tool feature?
    │   └── Yes -> Workflow 4: `route-fact`
    ├── Does the user request a site-wide proof gap audit?
    │   └── Yes -> Workflow 2: `audit-gaps` across guides and tool pages in `seo/kb/pages-index.md`
    └── Is the user drafting or upgrading a specific page or guide?
        ├── Fewer than 4 proof categories in `seo/kb/proof/` match this page's topic?
        │   └── Yes -> Workflow 2: `audit-gaps`, then Workflow 3
        └── 4 or more -> Workflow 3: `draft` / `upgrade`
```

## The 5 categories of first-hand proof

Technical guides, comparison pages, or tool documentation should cite verifiable receipts across these categories:

| Category | Location | ExtensionGuy Context |
| --- | --- | --- |
| **1. Benchmarks and controlled tests** | `seo/kb/proof/benchmarks/` | Real measured timings (e.g. Word-to-LaTeX pandoc WASM conversion time, PDF redaction canvas latency, bundle size compression deltas). |
| **2. Privacy and architectural proofs** | `seo/kb/proof/privacy/` | On-device processing receipts (e.g. zero remote network requests during PDF redaction, local Web Worker execution, memory-only conversions). |
| **3. Real screenshots and captures** | `seo/kb/proof/visuals/` | Actual browser captures of extension popups, tool UIs, or terminal test traces. Never AI-generated mockups. |
| **4. Feature and format boundaries** | `seo/kb/proof/boundaries/` | Verified limits (e.g. PDF 25 MB / 200-page client limits, supported DOCX image formats, supported table markup). |
| **5. Practitioner edge cases and failure notes** | `seo/kb/proof/workflows/` | Exact failure modes and resolutions (e.g. font substitution in PDF canvas rendering, LaTeX math syntax edge cases). |

## Workflow 1: `init` (scaffold `seo/kb/`)

Inspect `package.json`, `build_redesign.py`, store listings in `store-versions.json`, maintained guides in `guides/`, browser tool implementations in `src/`, and test fixtures in `tests/`. Then create these files. Each proof file names its verifiable source in frontmatter:

### 1. `seo/kb/brand-ssot.md` (single source of truth)

Exact extension capabilities, version numbers, permissions, and what tools do NOT do. Derive product inventory from maintained repository sources (`store-versions.json` and `build_redesign.py`). Write only facts found in code, tests, or confirmed by the user; mark anything else `[UNVERIFIED]`.

```markdown
# Brand SSOT: ExtensionGuy (https://extensionguy.me)
Last verified: 2026-11-22

## Portfolio Overview
- Developer portfolio of privacy-focused browser extensions and web tools.
- Maintained browser extensions:
  1. Word to LaTeX (Offline) (/word-to-latex/)
  2. Table Extractor (/table-extractor/)
  3. BulkGrab (/bulkgrab/)
  4. SEO Inspector (/seo-inspector/)
  5. Bilexi (/bilexi/)
  6. Tab Vault (/tab-vault/)
- Maintained browser tools:
  1. Word-to-LaTeX Converter (/word-to-latex-converter/)
  2. Client-Side PDF Redaction Tool (/pdf-tools/)

## Technical Architecture & Privacy Boundaries
- 100% Client-side execution: Files processed entirely in the user's browser via WebAssembly/Web Workers.
- Zero server uploads: No document data, images, or extracted text transmitted to external servers.
- Offline support: Tools function without an internet connection once assets are cached.
```

### 2. `seo/kb/proof/{benchmarks,privacy,boundaries,workflows}/<id>.md`

One file per verifiable fact or test result.

#### Proof card schema and lifecycle rules:
- **Do not pre-mark proof cards as verified.**
- Every proof card must record:
  1. `evidence_source`: Exact test script, fixture, or benchmark output file.
  2. `commit`: Full git commit SHA where evidence was captured.
  3. `date`: ISO date of test execution.
  4. `status`: Current lifecycle state (`proposed`, `tested on a candidate`, `merged`, or `production-verified`).
- **Privacy and Network Claims**: Source code inspection alone (e.g. noting the absence of `fetch()` calls in code) must **not** be presented as a measured network or privacy test. To record a privacy or offline proof card, the test must execute a measured browser network trace (such as Playwright network interception verifying 0 remote egress requests during active file processing) and cite that test execution in `evidence_source`.

Example proof card template:

```markdown
---
id: proof-converter-image-zip-delivery
category: boundaries
date: 2026-11-21
commit: 72f35a770bb79501abbc3792c79e0eb22947f823
status: tested on a candidate # [proposed | tested on a candidate | merged | production-verified]
topics: [word-to-latex, wasm, images, packaging]
evidence_source: tests/converterUi.test.mjs
verification_command: node --test tests/converterUi.test.mjs
---

# In-Browser Word-to-LaTeX Embedded Image ZIP Packaging

## Verified Mechanics
- pandoc-wasm extracts embedded media into memory via `'extract-media': ''`.
- fflate packages .tex and referenced media/ files into a .zip archive inside a Web Worker.
- In-browser conversion: the Web Worker generates LaTeX and packages ZIP archive entirely in the browser without server upload.
```

### 3. `seo/kb/competitors/claims-to-beat.md`

Competitor claims paired with ExtensionGuy's privacy-first, on-device advantages (e.g. local browser redaction vs cloud PDF tools requiring document uploads). If competitor data is unverified or external tools are unavailable, mark `[NEEDS VERIFICATION]` rather than inventing numbers.

### 4. `seo/kb/pages-index.md`

Mapping of maintained guides (verified against `sitemap.xml`), tool pages, and product pages to their proof IDs.

## Workflow 2: `audit-gaps` (fill proof gaps without inventing)

Never invent benchmarks, user counts, latency numbers, or security guarantees.

### Step 1: Inspect local repository evidence
Check local test fixtures, Playwright test runs, source code implementations, and commit logs. Remember that network/privacy assertions require actual runtime traces, not code reading alone.

### Step 2: Formulate focused questions if needed
If a critical technical fact is missing (e.g. maximum tested document size or specific browser support limit), note it in `seo/kb/open-questions.md` or ask the user a concise question. Do not connect external transcription services or require paid subscriptions.

## Workflow 3: `draft` / `upgrade` (Consensus + Proof Card architecture)

Structure technical sections around consensus definitions and first-hand proof:

1. **`[CONSENSUS]`**: Factual explanations, definitions, or standard procedures.
2. **`[PROOF]`**: Verifiable on-device mechanics, measured benchmarks, or explicit limitations from `seo/kb/proof/`.

### Source-of-Truth Enforcement
- When modifying website pages or guides, identify whether the page is statically authored (e.g. standalone guide in `guides/<slug>/index.html`) or generated by `build_redesign.py`.
- Always edit the maintained source and regenerate outputs (`python3 build_redesign.py`) where applicable.

## Workflow 4: `route-fact` (multi-page propagation)

When a tool feature, version number, or verified limit changes:
1. Update `seo/kb/brand-ssot.md` or create a new proof file in `seo/kb/proof/`.
2. Grep for previous numbers or claims across `guides/`, `demos/`, and tool pages.
3. Update dependent pages at their source, keeping descriptions natural to each page's context.
4. Regenerate affected static pages if produced by build scripts.

## Verification checklist

- [ ] `seo/kb/brand-ssot.md` and `seo/kb/pages-index.md` exist and reflect verified code/test facts.
- [ ] Product inventory includes Word to LaTeX (Offline) alongside all maintained extensions and tools.
- [ ] Proof cards record evidence source, commit/date, and explicit status (`proposed`, `tested on a candidate`, `merged`, or `production-verified`).
- [ ] No proof cards pre-marked as verified without recorded execution evidence.
- [ ] Privacy/offline claims cite measured network traces, not source code inspection alone.
- [ ] LaTeX generation mechanics are described accurately (Web Worker generates LaTeX, not compiles).
- [ ] Edits respect repository source-of-truth rules (maintained sources edited; build outputs regenerated).

---
*Upstream attribution: Adapted from [Illyism/seo-skills](https://github.com/Illyism/seo-skills) (pinned commit `a158c36a1c2c84a44ee7a1ae69c009caf73e1a35`). Distributed under the MIT License.*
