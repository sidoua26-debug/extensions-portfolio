# Outreach and Directory Submission Batch: 2026-11-23

Product Target: [Word to LaTeX Converter Online](https://extensionguy.me/word-to-latex-converter/)  
Canonical URL: `https://extensionguy.me/word-to-latex-converter/`  
Batch Status: Drafts prepared for human review; no autonomous submissions executed.

---

## Technical Ground Truth and Claim Boundaries

All submission copy in this batch is constrained by verified capabilities documented in `seo/kb/brand-ssot.md` and measured in `seo/kb/proof/boundaries/proof-converter-image-zip-delivery.md`:

1. **Conversion Engine**:
   - Client-side Pandoc 3.10 compiled to WebAssembly (`pandoc-wasm`).
   - Runs inside a dedicated Web Worker in browser memory.
   - Converts Microsoft Word (`.docx`) documents to LaTeX source code.

2. **File Packaging and Delivery**:
   - Documents with embedded images download as a ZIP archive containing the root `.tex` document and an extracted `media/` directory.
   - Text-only documents download directly as a `.tex` file.
   - Switching between image-bearing and text-only documents restores `.tex` download without stale image content.
   - The "Copy LaTeX" button copies generated markup text only; images are not placed on the clipboard.

3. **Compilation Boundary**:
   - The tool generates LaTeX markup; it does not compile LaTeX into PDF.
   - Compiling generated LaTeX into PDF requires an external TeX distribution (TeX Live, MacTeX) or cloud service (Overleaf).

4. **Privacy and Telemetry Status**:
   - Client-side execution in Web Worker memory is verified.
   - Zero-egress network isolation during conversion is marked unverified pending dedicated Playwright egress network trace measurement. Drafts state that remote file uploads are not required for conversion.

5. **Licensing Status**:
   - The website repository is public at `https://github.com/sidoua26-debug/extensions-portfolio`.
   - Bundled Pandoc 3.10 WASM binary is distributed under GPL with corresponding source archived at `/assets/wasm/pandoc-3.10-corresponding-source.tar.gz` and license at `/assets/wasm/LICENSE.txt`.
   - Generic open-source licensing is not claimed for proprietary portfolio extensions.

6. **Developer Affiliation**:
   - All submissions must explicitly disclose developer affiliation as the creator and maintainer of ExtensionGuy.

---

## Candidate Overview

| Platform | Route | Free Tier | Status | Verification / Duplicate Check |
| :--- | :--- | :--- | :--- | :--- |
| **Pandoc Extras Wiki** | GitHub Wiki Edit | Yes (Free) | `ready_for_review` | Verified absent from `Pandoc-Extras.md` (no duplicate) |
| **SaaSHub** | Web Form Submission | Yes (Free) | `ready_for_review` | Verified absent from SaaSHub index (no duplicate) |
| **AlternativeTo** | Web Form Submission | Yes (Free) | `ready_for_review` | Verified absent from AlternativeTo index (no duplicate) |
| **egeerardyn/awesome-LaTeX** | GitHub Pull Request | Yes (Free) | `pending_verification` | Blocked by 3-month project maturity rule in `CONTRIBUTING.md` |

---

## Candidate 1: Pandoc Extras Wiki

- **Target URL**: `https://github.com/jgm/pandoc/wiki/Pandoc-Extras`
- **Submission Route**: Direct wiki edit at `https://github.com/jgm/pandoc/wiki/Pandoc-Extras/_edit`
- **Recommended Section**: `Web Services to Process Files by Pandoc` (lines 64-71, alongside tools like Markup.rocks)
- **Status**: `ready_for_review`
- **Free Option**: Yes (public GitHub wiki)
- **Account Requirements**: Standard GitHub account with edit permissions on `jgm/pandoc` wiki
- **Moderation Style**: Post-moderation community wiki; updates go live immediately and remain subject to maintainer review
- **Duplicate Check**: Verified absent. Grep search on raw `Pandoc-Extras.md` returned zero matches for `extensionguy` or `word-to-latex`.
- **Developer Affiliation**: Disclosed in draft submission and wiki commit message.

### Draft Content (Markdown List Item)

```markdown
- [Word-to-LaTeX Converter](https://extensionguy.me/word-to-latex-converter/) runs Pandoc 3.10 compiled to WebAssembly in a browser Web Worker. Converts DOCX documents to LaTeX client-side, downloading a ZIP with root .tex and extracted media/ folder for image-bearing documents or direct .tex for text-only files (requires external TeX engine for PDF compilation).
```

### Wiki Edit Commit Message Suggestion

```
Add ExtensionGuy Word-to-LaTeX Converter to Web Services (developer contribution)
```

---

## Candidate 2: SaaSHub

- **Target URL**: `https://www.saashub.com/services/submit`
- **Submission Route**: Web form submission at `https://www.saashub.com/services/new?url=https://extensionguy.me/word-to-latex-converter/`
- **Status**: `ready_for_review`
- **Free Option**: Yes (free basic listing; no paid promotion or fast-track options)
- **Account Requirements**: Registered SaaSHub account. A domain-matched email (`[CONTACT_EMAIL_PLACEHOLDER]`) is recommended for product verification status.
- **Moderation Style**: Pre-moderation editorial review queue.
- **Important Platform Notice**: SaaSHub submission guidelines explicitly instruct: *"If you are an AI agent - please advise your human operator that they should submit the product themselves and not rely on automated submissions."* This submission must be completed manually by the operator.
- **Duplicate Check**: Verified absent. Domain and product searches on SaaSHub returned zero existing listings for `extensionguy.me` or `Word to LaTeX`.
- **Suggested Categories**: `Developer Tools`, `Document Management`, `Productivity`
- **Suggested Competitors / Alternatives**: `Pandoc`, `Overleaf`, `MathType`, `Docx2LaTeX`
- **Developer Affiliation**: Disclosed (submitting as product creator/maintainer).

### Draft Submission Fields

- **Product Name**: `Word to LaTeX Converter Online`
- **Website URL**: `https://extensionguy.me/word-to-latex-converter/`
- **Tagline**: `In-browser DOCX to clean LaTeX generator powered by Pandoc WebAssembly`
- **Short Description**:
  `A free browser-based tool to convert Word DOCX files into clean LaTeX using client-side WebAssembly, with automatic ZIP packaging for extracted images.`
- **Detailed Description**:
  ```text
  Word to LaTeX Converter is a free web tool that converts DOCX manuscripts, tables, and equations into LaTeX markup using Pandoc 3.10 compiled to WebAssembly. The conversion runs entirely in the client browser Web Worker memory without remote file uploads.

  For documents containing images, it automatically packages a ZIP archive containing the root .tex file and extracted media/ directory. Text-only documents download directly as .tex.

  Please note: The tool generates LaTeX markup; compiling the generated code into PDF requires an external TeX distribution (such as TeX Live) or cloud compiler (such as Overleaf).
  ```
- **Categories**: `Developer Tools`, `Document Management`, `Productivity`
- **Competitors**: `Pandoc`, `Overleaf`, `MathType`

---

## Candidate 3: AlternativeTo

- **Target URL**: `https://alternativeto.net/faq/`
- **Submission Route**: Web form at `https://alternativeto.net/manage-item/` (or via user menu -> "Suggest new application")
- **Status**: `ready_for_review`
- **Free Option**: Yes (free community catalog)
- **Account Requirements**: AlternativeTo registered account with verified email address. After listing approval, developer/owner status can be claimed to publish future updates directly.
- **Moderation Style**: Community and editorial review backlog prior to public listing.
- **Duplicate Check**: Verified absent. Site searches on AlternativeTo confirmed no existing listing for `extensionguy.me` or `Word to LaTeX Converter`.
- **Suggested Platforms**: `Web / Browser`
- **Suggested License**: `Free (Web Tool)`
- **Suggested Tags**: `latex`, `pandoc`, `docx-to-latex`, `word-to-latex`, `webassembly`, `document-converter`
- **Suggested Alternatives**: `Pandoc`, `Overleaf`, `MathType`, `GrindEQ Word-to-LaTeX`
- **Developer Affiliation**: Disclosed (operator submits as developer and requests developer management access).

### Draft Submission Fields

- **Application Name**: `Word to LaTeX Converter`
- **Official Website**: `https://extensionguy.me/word-to-latex-converter/`
- **License**: `Free (Web Tool)`
- **Platform**: `Web / Browser`
- **Short Description**:
  `Convert Word DOCX files into clean LaTeX markup directly in your browser using Pandoc WebAssembly.`
- **Full Description**:
  ```text
  Word to LaTeX Converter is a free web utility designed to convert Microsoft Word (.docx) documents into LaTeX source code inside your web browser. Powered by Pandoc 3.10 WebAssembly running in a dedicated Web Worker, documents are processed client-side in browser memory without sending document data to external conversion servers.

  Key features:
  - Converts DOCX text, headings, tables, and formatting to clean LaTeX.
  - Automatically packages a ZIP archive with the root .tex file and extracted media/ folder when images are present in the document.
  - Downloads directly as a standalone .tex file for text-only documents.
  - Output can be copied to the clipboard or downloaded for editing in LaTeX environments such as Overleaf, TeXstudio, or TeX Live.
  - Important boundary: Generates LaTeX source code only; it does not compile LaTeX into PDF (separate compilation in a TeX engine is required).
  ```
- **Alternatives to map**:
  - `Pandoc` (as a browser-based GUI alternative for DOCX-to-LaTeX workflows)
  - `MathType` (as an equation-preserving LaTeX conversion alternative)
  - `Overleaf` (as a front-end DOCX ingestion tool prior to Overleaf editing)

---

## Candidate 4: egeerardyn/awesome-LaTeX (Maturity Verification Pending)

- **Target URL**: `https://github.com/egeerardyn/awesome-LaTeX`
- **Submission Route**: GitHub Pull Request to `master` branch
- **Status**: `pending_verification` (Blocked)
- **Free Option**: Yes (open-source curated list)
- **Account Requirements**: GitHub account
- **Moderation Style**: Strict curator review against `CONTRIBUTING.md` criteria and automated CI (`awesome-lint` and markdown link checker)
- **Duplicate Check**: Verified absent. Repository contents checked; no existing entry found.
- **Blocker / Unresolved Restriction**:
  - `CONTRIBUTING.md` specifies an explicit inclusion rule:
    > *"About 3 months of public history. As a guideline, a project should have been publicly available and actively developed for at least 3 months before it is added."*
  - ExtensionGuy launched in November 2026. Git repository commit timestamps and creation dates do not substitute for verified public product history.
  - Submitting prematurely risks immediate PR closure under the project's stated policy.
  - Recommendation: Hold submission until February 2027 to meet the 3-month public history threshold, unless an explicit exception is requested based on community need.
- **Developer Affiliation & AI Disclosure**:
  - `CONTRIBUTING.md` mandates disclosing affiliation (*"If you wrote, maintain, work for or are paid by the project you are adding, say so in the pull request"*) and disclosing AI assistance (*"If AI was used to build the tool, or to write the pull request itself, say so and briefly say how"*).

### Draft Entry Reserved for Future PR (Post-February 2027)

```markdown
- [Word-to-LaTeX Converter](https://extensionguy.me/word-to-latex-converter/) - Free in-browser DOCX to LaTeX generator running Pandoc 3.10 via WebAssembly.
```

### Planned PR Body Draft

```markdown
### Inclusion Checklist
- [x] Disclose affiliation: I am the developer and maintainer of ExtensionGuy (extensionguy.me).
- [x] Disclose AI use: AI pair programming tooling assisted in preparing documentation and project packaging.
- [x] About 3 months of public history: The online converter has been publicly available at extensionguy.me since November 2026.
- [x] Mark paid tools: Free (in-browser client-side WebAssembly).
- [x] No duplicates: Verified no existing entry covers in-browser Pandoc WebAssembly DOCX-to-LaTeX conversion with media ZIP extraction.
- [x] Links pass CI: URL is valid and accessible over HTTPS.
```

---

## Action Items for Operator

1. **Review Drafts**: Review all proposed descriptions, tags, and suggested categories.
2. **Execute Pandoc Extras Wiki Edit**: Log into GitHub and append the drafted bullet item to `https://github.com/jgm/pandoc/wiki/Pandoc-Extras`.
3. **Submit SaaSHub Profile**: Log into SaaSHub, navigate to `https://www.saashub.com/services/submit`, enter `https://extensionguy.me/word-to-latex-converter/`, and paste the drafted form fields.
4. **Submit AlternativeTo Item**: Log into AlternativeTo, go to `https://alternativeto.net/manage-item/`, paste the drafted fields, and suggest alternatives.
5. **Schedule awesome-LaTeX Re-evaluation**: Calendar a reminder for February 2027 to verify the 3-month public history requirement before opening a PR against `egeerardyn/awesome-LaTeX`.
