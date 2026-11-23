# Outreach and Directory Submission Batch: 2026-11-23

Product Target: [Word to LaTeX Converter Online](https://extensionguy.me/word-to-latex-converter/)  
Canonical URL: `https://extensionguy.me/word-to-latex-converter/`  
Batch Status: Drafts prepared for human review; all external listings remain in draft.

---

## Technical Ground Truth and Claim Boundaries

All submission copy in this batch is constrained by verified capabilities documented in `seo/kb/brand-ssot.md` and measured in `seo/kb/proof/boundaries/proof-converter-image-zip-delivery.md`:

1. **Base Product Description**:
   "I maintain ExtensionGuy. The converter uses Pandoc WebAssembly in your browser to turn DOCX files into LaTeX. Documents with embedded images download as a ZIP containing the .tex file and media/ folder. Text-only documents download as .tex. Compile the result separately."

2. **Output Modes Distinction**:
   - **Complete Document Mode**: Generates a standalone LaTeX document including preamble and document environment, ready for immediate compilation or direct project creation.
   - **Fragment Mode**: Generates body markup only, intended to be inserted into an existing document while retaining that project's main document and preamble.

3. **Packaging and Delivery**:
   - Documents with embedded images download as a ZIP archive containing the root `.tex` document and an extracted `media/` folder.
   - Text-only documents download directly as a `.tex` file.
   - The "Copy LaTeX" button copies generated markup text only; images are not copied to the clipboard.

4. **Compilation Boundary**:
   - Generates clean LaTeX markup only; it does not compile LaTeX into PDF.
   - Compiling the generated LaTeX into PDF requires an external TeX distribution (e.g. TeX Live) or cloud compiler (e.g. Overleaf). Overleaf is described as a place to compile the output, not a direct Word-to-LaTeX converter.

5. **Pricing and Licensing**:
   - Pricing: Recorded as **Free**.
   - Software License: The website software license is marked **[UNVERIFIED]**. Bundled Pandoc 3.10 WebAssembly source is archived for GPL compliance at `/assets/wasm/pandoc-3.10-corresponding-source.tar.gz`.

6. **Network Processing**:
   - Files are processed client-side in browser Web Worker memory using WebAssembly without requiring server uploads. Unmeasured network guarantees are excluded.

7. **Competitor Comparison**:
   - Direct comparisons are restricted to products that perform Word-to-LaTeX conversion.
   - [GrindEQ Word-to-LaTeX](https://latextoword.com/word-to-latex/) is a direct Word-to-LaTeX comparison.
   - Other converters include Pandoc CLI and Docx2LaTeX.
   - Overleaf is categorized as a place to compile the output.

---

## Candidate Overview

| Platform | Route | Free Option | Status | Search Result (Date: 2026-11-23) |
| :--- | :--- | :--- | :--- | :--- |
| **Pandoc Extras Wiki** | GitHub Wiki Edit | Yes (Free) | `ready_for_review` | "no matching entry found" (Search terms: `extensionguy`, `word-to-latex`, `word to latex`) |
| **SaaSHub** | Official Submission Page | Yes (Free) | `ready_for_review` | "no matching entry found" (Search terms: `extensionguy.me`, `Word to LaTeX`) |
| **AlternativeTo** | Suggest New Application | Yes (Free) | `ready_for_review` | "no matching entry found" (Search terms: `extensionguy.me`, `Word to LaTeX Converter`) |
| **egeerardyn/awesome-LaTeX** | GitHub Pull Request | Yes (Free) | `pending_verification` | "no matching entry found" (Search terms: `extensionguy.me`, `Word to LaTeX Converter`) |

---

## Candidate 1: Pandoc Extras Wiki

- **Target URL**: `https://github.com/jgm/pandoc/wiki/Pandoc-Extras`
- **Submission Route**: Direct wiki edit at `https://github.com/jgm/pandoc/wiki/Pandoc-Extras/_edit`
- **Recommended Section**: `Web Services to Process Files by Pandoc` (lines 64-71)
- **Status**: `ready_for_review`
- **Pricing**: Free
- **Account Requirements**: Standard GitHub account. Wiki edit permissions for external accounts are marked **[UNVERIFIED]** until tested directly.
- **Moderation Style**: Post-moderation community wiki maintained by Pandoc project
- **Directory Search Result**:
  - Result: "no matching entry found"
  - Search Terms: `extensionguy`, `word-to-latex`, `word to latex`
  - Date: `2026-11-23`
  - Evidence URL: `https://raw.githubusercontent.com/wiki/jgm/pandoc/Pandoc-Extras.md`
- **Developer Affiliation**: Disclosed in draft submission.

### Draft Content (Markdown List Item)

```markdown
- [Word-to-LaTeX Converter](https://extensionguy.me/word-to-latex-converter/) - I maintain ExtensionGuy. The converter uses Pandoc WebAssembly in your browser to turn DOCX files into LaTeX. Documents with embedded images download as a ZIP containing the .tex file and media/ folder. Text-only documents download as .tex. Compile the result separately. Supports Complete Document and Fragment modes.
```

### Wiki Edit Commit Message Suggestion

```
Add ExtensionGuy Word-to-LaTeX Converter to Web Services (developer contribution)
```

---

## Candidate 2: SaaSHub

- **Target URL**: `https://www.saashub.com/services/submit`
- **Submission Route**: SaaSHub official submission page (`https://www.saashub.com/services/submit`)
- **Status**: `ready_for_review`
- **Pricing**: Free (free basic profile listing)
- **Account Requirements**: Registered SaaSHub account. A domain-matched email (`[CONTACT_EMAIL_PLACEHOLDER]`) is recommended for product verification status.
- **Moderation Style**: Pre-moderation editorial review queue.
- **Platform Guideline**: Human operator must submit the form. Automated submissions by AI agents are prohibited.
- **Directory Search Result**:
  - Result: "no matching entry found"
  - Search Terms: `site:saashub.com "extensionguy.me" OR "Word to LaTeX"`
  - Date: `2026-11-23`
  - Evidence URL: `https://www.saashub.com/search?q=Word+to+LaTeX`
- **Suggested Categories**: `Developer Tools`, `Document Management`, `Productivity`
- **Direct Competitors**:
  - `GrindEQ Word-to-LaTeX` (`https://latextoword.com/word-to-latex/` - direct Word-to-LaTeX comparison)
  - `Pandoc` (command-line document converter)
  - `Docx2LaTeX`
- **Role of Overleaf**: Described as a place to compile the output, not as a direct Word-to-LaTeX conversion competitor.
- **Developer Affiliation**: Disclosed (submitting as developer and maintainer).

### Draft Submission Fields

- **Product Name**: `Word to LaTeX Converter Online`
- **Website URL**: `https://extensionguy.me/word-to-latex-converter/`
- **Pricing**: `Free`
- **Tagline**: `In-browser DOCX to clean LaTeX generator powered by Pandoc WebAssembly`
- **Short Description**:
  `I maintain ExtensionGuy. The converter uses Pandoc WebAssembly in your browser to turn DOCX files into LaTeX, with media ZIP packaging. Compile the result separately.`
- **Detailed Description**:
  ```text
  I maintain ExtensionGuy. The converter uses Pandoc WebAssembly in your browser to turn DOCX files into LaTeX. Documents with embedded images download as a ZIP containing the .tex file and media/ folder. Text-only documents download as .tex. Compile the result separately.

  The tool supports Complete Document mode for standalone documents with full preamble, and Fragment mode for pasting body markup into existing LaTeX projects. Overleaf is recommended as a place to compile the output. Files are processed client-side in browser memory without requiring server uploads.
  ```
- **Categories**: `Developer Tools`, `Document Management`, `Productivity`
- **Competitors**: `GrindEQ Word-to-LaTeX`, `Pandoc`, `Docx2LaTeX`

---

## Candidate 3: AlternativeTo

- **Target URL**: `https://alternativeto.net/faq/`
- **Submission Route**: AlternativeTo documented "Suggest new application" route (`https://alternativeto.net/manage-item/` or profile menu -> "Suggest new application")
- **Status**: `ready_for_review`
- **Pricing**: Free (Free Web Tool)
- **Website Software License**: Marked **[UNVERIFIED]**.
- **Account Requirements**: Registered account with verified email. Developer ownership claim can be requested post-approval.
- **Moderation Style**: Community moderation queue prior to public listing.
- **Directory Search Result**:
  - Result: "no matching entry found"
  - Search Terms: `site:alternativeto.net "extensionguy.me" OR "Word to LaTeX Converter"`
  - Date: `2026-11-23`
  - Evidence URL: `https://alternativeto.net/browse/search/?q=Word+to+LaTeX`
- **Suggested Platforms**: `Web / Browser`
- **Suggested License**: `Free (Web Tool)`
- **Suggested Tags**: `latex`, `pandoc`, `docx-to-latex`, `word-to-latex`, `webassembly`, `document-converter`
- **Direct Alternatives**:
  - `GrindEQ Word-to-LaTeX` (`https://latextoword.com/word-to-latex/` - direct Word-to-LaTeX comparison)
  - `Pandoc` (command-line document converter)
- **Role of Overleaf**: Noted as a place to compile the output rather than a direct Word-to-LaTeX converter.
- **Developer Affiliation**: Disclosed (submitting as developer and maintainer).

### Draft Submission Fields

- **Application Name**: `Word to LaTeX Converter`
- **Official Website**: `https://extensionguy.me/word-to-latex-converter/`
- **Pricing / License**: `Free` / `Free (Web Tool)`
- **Software License**: `[UNVERIFIED]`
- **Platform**: `Web / Browser`
- **Short Description**:
  `In-browser DOCX to LaTeX converter using Pandoc WebAssembly with image ZIP packaging.`
- **Full Description**:
  ```text
  I maintain ExtensionGuy. The converter uses Pandoc WebAssembly in your browser to turn DOCX files into LaTeX. Documents with embedded images download as a ZIP containing the .tex file and media/ folder. Text-only documents download as .tex. Compile the result separately.

  Key details:
  - Complete Document mode generates a standalone LaTeX document with preamble, document environment, and structure ready for compilation.
  - Fragment mode generates body markup intended to be pasted into an existing LaTeX document, preserving that project's main document and preamble.
  - Direct comparison: Performs Word-to-LaTeX conversion similar to GrindEQ Word-to-LaTeX, operating client-side via Pandoc WebAssembly.
  - External compilation: The tool generates LaTeX markup; compile the output in an external environment such as TeX Live or Overleaf (Overleaf serves as a place to compile the output).
  - Processing: Runs in client browser Web Worker memory without requiring server uploads. Unmeasured network guarantees are excluded.
  ```
- **Alternatives to map**:
  - `GrindEQ Word-to-LaTeX` (direct Word-to-LaTeX converter)
  - `Pandoc` (underlying document conversion engine)

---

## Candidate 4: egeerardyn/awesome-LaTeX (Maturity Verification Pending)

- **Target URL**: `https://github.com/egeerardyn/awesome-LaTeX`
- **Submission Route**: GitHub Pull Request to `master` branch
- **Status**: `pending_verification` (Held)
- **Pricing**: Free
- **Account Requirements**: GitHub account
- **Moderation Style**: Curator review against `CONTRIBUTING.md` criteria and automated CI (`awesome-lint` and markdown link checker)
- **Directory Search Result**:
  - Result: "no matching entry found"
  - Search Terms: `extensionguy.me`, `Word to LaTeX Converter`
  - Date: `2026-11-23`
  - Evidence URL: `https://raw.githubusercontent.com/egeerardyn/awesome-LaTeX/master/README.md`
- **Reason Pending Verification**:
  - `CONTRIBUTING.md` requires approximately 3 months of public history and active development before submission.
  - Repository creation dates or git commit timestamps alone do not establish public product history.
- **Evidence Required to Establish Eligibility**:
  - Independent documentation of at least 3 months of continuous public availability and active development (such as third-party web archive snapshots, verifiable public launch announcements, or timestamped release records).
  - Passing automated CI checks (`awesome-lint` and markdown link checker).
- **Developer Affiliation & AI Disclosure**:
  - Disclosed in pull request draft.

### Draft Entry Reserved for Future PR

```markdown
- [Word-to-LaTeX Converter](https://extensionguy.me/word-to-latex-converter/) - I maintain ExtensionGuy. The converter uses Pandoc WebAssembly in your browser to turn DOCX files into LaTeX. Documents with embedded images download as a ZIP containing the .tex file and media/ folder. Text-only documents download as .tex. Compile the result separately.
```

### Unchecked PR Template Checklist

```markdown
### Inclusion Checklist
- [ ] Disclose affiliation: I maintain ExtensionGuy (extensionguy.me).
- [ ] Disclose AI use: AI pair programming tooling assisted in preparing documentation and project packaging.
- [ ] About 3 months of public history: Requires independent evidence of 3 months public availability (held pending verification).
- [ ] Mark paid tools: Free (in-browser client-side WebAssembly).
- [ ] No duplicates: Verified no matching entry found in list.
- [ ] Links pass CI: Requires passing awesome-lint and link checker in CI.
```

---

## Action Items for Operator

1. **Review Drafts**: Verify consistency of base wording, Free pricing, and Complete Document / Fragment mode descriptions.
2. **Execute Pandoc Extras Wiki Edit**: Log into GitHub and append the drafted bullet item to `https://github.com/jgm/pandoc/wiki/Pandoc-Extras` if edit permissions permit.
3. **Submit SaaSHub Profile**: Log into SaaSHub, navigate to official submission page `https://www.saashub.com/services/submit`, enter `https://extensionguy.me/word-to-latex-converter/`, and paste the drafted form fields.
4. **Submit AlternativeTo Item**: Log into AlternativeTo, follow the documented "Suggest new application" route (`https://alternativeto.net/manage-item/`), paste the drafted fields, and suggest GrindEQ Word-to-LaTeX as direct alternative.
5. **Monitor awesome-LaTeX Eligibility**: Gather independent public availability evidence before opening a PR against `egeerardyn/awesome-LaTeX`.
