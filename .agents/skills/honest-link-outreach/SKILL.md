---
name: honest-link-outreach
description: Generate a vetted backlink outreach batch (`seo/outreach-batch-YYYY-MM-DD.md`) with a SEND/CUT prospect table, ranking target URLs, and structurally varied plain-text email drafts for ExtensionGuy browser tools and extensions. Produces drafts for user review only. Scoped to ExtensionGuy's static website, browser extensions, guides, and tools.
metadata:
  author: illyism
  source: https://github.com/Illyism/seo-skills (commit a158c36a1c2c84a44ee7a1ae69c009caf73e1a35)
  adapted_for: ExtensionGuy (https://extensionguy.me)
  version: 1.0.0
  license: MIT
---

# Honest link outreach for ExtensionGuy

Generate curated, honest outreach batches to suggest ExtensionGuy tools, extensions, and guides to authors of relevant technical articles, developer roundups, and privacy resource pages.

> **Operational & Ethical Constraints:**
> - **Drafts Only**: Outreach workflows produce draft prospect lists and email copy in `seo/outreach-batch-YYYY-MM-DD.md` for human review. **Never send emails or initiate contact without explicit user request.**
> - **Zero Paid Links**: No paid placements, editorial fees, or LinkDR checkouts. Pitches must rely strictly on genuine utility (e.g. suggesting a free client-side tool as an offline, privacy-safe alternative).
> - **Privacy-First Focus**: Highlight ExtensionGuy's on-device processing advantage when relevant (e.g. users do not need to upload sensitive documents to third-party servers).
> - **Product Hunt Status**: All ExtensionGuy products are already launched on Product Hunt; avoid duplicate launch outreach.

## Rule 1: Target specific, relevant editorial pages

Never pitch a generic homepage. Target pages where an ExtensionGuy tool or guide directly answers the reader's problem:
- Articles on PDF security or privacy → `/pdf-tools/` or `/guides/redact-pdf-without-uploading/`
- Guides on converting Word documents to LaTeX or Overleaf → `/word-to-latex-converter/`
- Browser productivity & developer roundups → `/word-to-latex/`, `/table-extractor/`, `/bulkgrab/`, `/seo-inspector/`, `/bilexi/`, or `/tab-vault/`

### Qualification criteria

| Signal | Verdict | Rationale |
| --- | --- | --- |
| Ranking technical guide or tutorial on an adjacent topic | **SEND** | Page provides an editorial context where a free tool or guide adds genuine value. |
| Open-source resource list or developer tool roundup | **SEND** | Curators actively maintain and update recommended utilities. |
| Generic corporate site with only login or pricing pages | **CUT** | No relevant editorial context exists for a natural link. |
| Stretched or forced topical connection | **CUT** | Out-of-context suggestions harm reputation and are ignored. |

## Rule 2: Honest, direct ask

State the exact tool and the specific section where it fits. Never use manipulative or flattery-heavy templates.

- *Direct & Factual:* State what the tool does in one sentence, why it is relevant to their specific section, and note that it is free, requires no sign-up, and processes files entirely in the user's browser.
- *No Em Dashes or Buzzwords:* Keep communication concise, conversational, and direct.

## Rule 3: Structural variety across batches

Spam filters and editors recognize identical templates. When drafting 3-5 email prospects, vary the structure:
- **Subject styles**: Short lowercase slug (`your /blog/pdf-redaction guide`), direct question (`quick addition for your latex conversion tools?`), or specific section note.
- **Openings**: Direct reference to a point in their guide vs. immediate 1-line tool description.
- **Sign-offs**: Plain, respectful sign-off.

## Procedure

1. **Review Local Context:** Read ExtensionGuy tool pages (`pdf-tools/`, `word-to-latex-converter/`) and extension pages (`bilexi/`, `tab-vault/`, etc.) to confirm exact supported features and limits.
2. **Qualify Prospects:** Filter candidates based on actual editorial relevance and ranking evidence.
3. **Draft Plain-Text Pitches:** Write 3-5 sentence plain-text drafts in `seo/outreach-batch-YYYY-MM-DD.md`.
4. **Handoff for User Approval:** Present the batch table and drafts to the user for review.

## Output Format (`seo/outreach-batch-YYYY-MM-DD.md`)

```markdown
# Backlink outreach batch (YYYY-MM-DD)

**Project:** ExtensionGuy (https://extensionguy.me)
**Prospects Evaluated:** X (Y SEND / Z CUT)
**Status:** DRAFT (pending user review; no emails sent)

## 1. Prospect Qualification Table

| Target Domain | Target URL | ExtensionGuy Tool | Target Section | Verdict | Rationale |
| --- | --- | --- | --- | --- | --- |
| `exampletech.dev` | `https://exampletech.dev/guides/pdf-security` | PDF Redaction Tool | "Redacting sensitive data" | **SEND** | Discusses privacy concerns; free offline browser tool is a direct fit. |

## 2. Email Drafts (for User Review)

### Prospect 1: exampletech.dev
- **Target URL:** https://exampletech.dev/guides/pdf-security
- **Recipient:** [Editor name / public editorial contact]

Subject: offline PDF redaction alternative for your privacy guide

Hi [Name],

Read your guide on PDF privacy and redaction techniques at /guides/pdf-security.

We built a free, client-side PDF redaction tool (https://extensionguy.me/pdf-tools/) that lets users black out sensitive text and areas directly in the browser using HTML5 Canvas without uploading documents to any server.

Would you be open to mentioning it in your offline tools section as a private option that requires no account or cloud upload?

Best,
[Name]
```

## Checklist before saving batch

- [ ] All prospects target an existing, relevant content URL.
- [ ] No paid links, sponsored placement requests, or LinkDR checkouts.
- [ ] Pitches accurately state on-device, client-side functionality.
- [ ] Zero em dashes or AI fluff.
- [ ] Clear disclaimer that all drafts are strictly for human review prior to sending.

---
*Upstream attribution: Adapted from [Illyism/seo-skills](https://github.com/Illyism/seo-skills) (pinned commit `a158c36a1c2c84a44ee7a1ae69c009caf73e1a35`). Distributed under the MIT License.*
