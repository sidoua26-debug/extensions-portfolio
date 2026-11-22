# Installed SEO Skills for ExtensionGuy

This document records the installation, configuration, and local adaptations of selected SEO skills for the ExtensionGuy repository.

## Upstream Provenance

- **Repository**: [https://github.com/Illyism/seo-skills](https://github.com/Illyism/seo-skills)
- **Pinned Commit**: `a158c36a1c2c84a44ee7a1ae69c009caf73e1a35`
- **License**: MIT © [Ilias Ism](https://il.ly)
- **Installation Date**: 2026-11-22

---

## Installed Skills & Local Directories

| Upstream Path | Local Installed Path | Scope / Description |
| --- | --- | --- |
| `seo/proof-kb` | `.agents/skills/proof-kb` | Atomic First-Hand Proof Knowledge Base (`seo/kb/`), consensus + proof card architecture, and multi-page fact routing. |
| `seo/blitz-seo` | `.agents/skills/blitz-seo` | Focused 30-day SEO sprint concentrating search-intent alignment, internal links, and on-page proof on a single priority page. |
| `seo/ahrefs-research` | `.agents/skills/ahrefs-research` | Competitor gap analysis, link target replication, and topic mining using supplied exports and connected tooling. |
| `seo/internal-linking` | `.agents/skills/internal-linking` | Internal link architecture and topical equity routing from informational guides to tools and extension pages. Includes adapted `scripts/internal-link-graph.mjs`. |
| `content/unslop-seo` | `.agents/skills/unslop-seo` | Editorial de-slopping, direct-answer structuring (first 40 words), and fact grounding for guides and tool documentation. |
| `seo/honest-link-outreach` | `.agents/skills/honest-link-outreach` | Contextual, honest outreach batch generation for relevant technical guides and resource pages. Produces review drafts only. |
| `seo/directory-submissions` | `.agents/skills/directory-submissions` | Structured product manifest (`submission-manifest.json`) and curated submission candidates for software review sites and developer catalogs. |

---

## Maintained Product Inventory & Verified Sitemap URLs

Derived from repository source of truth (`store-versions.json`, `build_redesign.py`, and `sitemap.xml`):

### 1. Maintained Browser Extensions
- **Word to LaTeX (Offline)**: `/word-to-latex/` (Chrome, Edge: 1.0.7)
- **Table Extractor**: `/table-extractor/` (Chrome, Edge: 1.0.1)
- **BulkGrab**: `/bulkgrab/` (Chrome 1.0.3, Edge 1.0.0)
- **SEO Inspector**: `/seo-inspector/` (Edge: 1.0.1)
- **Bilexi**: `/bilexi/` (Edge: 0.5.1)
- **Tab Vault**: `/tab-vault/` (Edge: 1.0.0)

### 2. Maintained Web Tools
- **Word-to-LaTeX Converter**: `/word-to-latex-converter/` (in-browser WASM converter)
- **Client-Side PDF Redaction Tool**: `/pdf-tools/` (in-browser visual redaction tool)

### 3. Verified Technical Guides & Demos
- Guides: `/guides/redact-pdf-without-uploading/`, `/guides/docx-to-latex-offline/`, `/guides/word-tables-to-latex/`, `/guides/type-french-accents-on-qwerty-offline/`, `/guides/prevent-browser-tab-loss-local-backups/`, `/guides/export-virtualized-tables-to-excel/`, `/guides/html-table-to-excel/`, `/guides/audit-json-ld-and-headings-in-browser/`, `/guides/fix-pandoc-latex-errors-in-overleaf/`, `/guides/download-multiple-pdfs/`
- Demos: `/demos/`, `/demos/table-extraction/`, `/demos/bulk-download/`, `/demos/seo-audit-sandbox/`, `/demos/overleaf-preamble-checker/`

---

## Local Adaptations & Constraints

All seven skills were adapted from the upstream repository to align strictly with ExtensionGuy's technical architecture, operational guidelines, and ethical guardrails:

1. **ExtensionGuy Portfolio Scoping**:
   - Scoped to ExtensionGuy's static website, browser extensions (including *Word to LaTeX (Offline)*), guides (`guides/`), interactive demos (`demos/`), and client-side browser tools (`/pdf-tools/`, `/word-to-latex-converter/`).
   - Nonexistent routes removed from all examples and references.

2. **Factual Integrity & Proof Card Lifecycle**:
   - Unsourced contact details (such as `press@extensionguy.me`) are replaced with explicit placeholders (`[CONTACT_EMAIL_PLACEHOLDER]`).
   - Example proof cards are **never pre-marked as verified**.
   - Each proof card requires identification of its `evidence_source`, commit SHA, date, and lifecycle status (`proposed`, `tested on a candidate`, `merged`, or `production-verified`).
   - **Source inspection alone must not be presented as a measured network or privacy test.** Privacy and offline claims must be backed by an executed runtime network trace.
   - LaTeX generation is described accurately: the Web Worker generates LaTeX (not compiles).

3. **Ground Truth & Data Limitations**:
   - Use existing connected tools and user-supplied exports (e.g. Google Search Console or Ahrefs CSV exports).
   - Missing Ahrefs API access remains an explicit evidence limitation; **invented numbers, search volumes, or traffic metrics are strictly prohibited**.
   - Gaps are explicitly marked `[NEEDS DATA]` or `Could not verify`.

4. **Zero Paid Links & No Sponsored Placement**:
   - Completely stripped all instructions, links, and workflows related to paid link purchasing, LinkDR checkout, sponsored directory fast-tracks, or paying editorial update fees.
   - All link and directory opportunities rely strictly on genuine editorial utility and organic relevance.

5. **No External Service Subscriptions**:
   - Removed all requirements to connect third-party paid services or MCP endpoints (e.g. AI SEO Tracker, Scribiz, GenPPT). No new subscriptions, credentials, or third-party MCP servers required.

6. **No Speculative Ranking or Citation Guarantees**:
   - Upstream ranking metrics, traffic claims, and directory domain ratings are treated as historical examples requiring independent verification.
   - The agent does not promise specific search engine rankings or automated AI citations.

7. **Draft-Only Mode for Outreach and Submissions**:
   - Outreach and directory workflows produce structured drafts and candidate prospect lists for human review.
   - The agent never autonomously sends emails, submits web forms, creates external accounts, or opens third-party PRs without explicit user authorization.

8. **Product Hunt State**:
   - Acknowledged that ExtensionGuy products are already launched on Product Hunt; duplicate launch preparation and scheduling steps were omitted.

9. **Repository Source-of-Truth Enforcement**:
   - ExtensionGuy's core website is generated via `build_redesign.py`. Modifications to site templates or navigation must update `build_redesign.py` and run `python3 build_redesign.py` to regenerate output. Standalone guides in `guides/<slug>/index.html` are edited directly.

10. **Adapted Internal Link Graph Script**:
    - Script at `.agents/skills/internal-linking/scripts/internal-link-graph.mjs`:
      - Resolves relative links, root-relative links, and same-origin absolute URLs against each page's actual URL.
      - Counts `<a href>` elements only, ignoring `<link rel="canonical">` or stylesheets.
      - Includes `/word-to-latex/` and all maintained products in its scanned targets.
      - Separates content links from header/nav/footer links, while reporting total inbound links.
      - Strictly defines **orphan** as having zero inbound links (`totalInbound === 0`).
      - Labels pages with inbound links below the threshold as **underlinked**.
    - Verified via narrow fixture test in `tests/internalLinkGraphFixture.test.mjs`.

11. **Attribution & Licensing**:
    - Retained upstream attribution and MIT copyright notices (Ilias Ism / Illyism) in all installed skills.
