---
name: directory-submissions
description: Prepare structured product manifests and curated submission drafts for ExtensionGuy browser extensions and tools across software review sites, developer tool catalogs, and open-source directories. Produces reviewable manifests and drafts. Scoped to ExtensionGuy's static website, browser extensions, guides, and tools.
metadata:
  author: illyism
  source: https://github.com/Illyism/seo-skills (commit a158c36a1c2c84a44ee7a1ae69c009caf73e1a35)
  adapted_for: ExtensionGuy (https://extensionguy.me)
  version: 1.0.0
  license: MIT
---

# Directory and catalog submissions for ExtensionGuy

Prepare structured metadata, factual tool descriptions, and curated submission candidate lists for ExtensionGuy's browser extensions and web tools across software catalogs, developer directories, and Awesome lists.

> **Operational Guidelines for ExtensionGuy:**
> - **Drafts & Preparation Only**: Prepare structured manifests (`submission-manifest.json`) and submission logs (`submissions-log.json`) for user review. **Do not autonomously submit forms, create external accounts, or open third-party PRs without explicit user authorization.**
> - **Zero Paid Submissions**: Focus solely on free, legitimate developer directories, software review sites, and curated GitHub lists. Never use paid submission fast-tracks, sponsored listings, or LinkDR checkouts.
> - **Product Hunt Status**: All ExtensionGuy extensions and tools are already launched on Product Hunt; do not schedule or duplicate Product Hunt launch workflows.
> - **Privacy-First Framing**: Highlight that ExtensionGuy extensions and browser tools operate client-side without remote tracking or server-side file uploads.
> - **No False Guarantees**: Directory listings and domain rating metrics are third-party indicators, not guaranteed ranking factors.

## Step 1: Prepare product manifest (`submission-manifest.json`)

Construct a factual, complete manifest in the project root or `seo/` containing accurate product metadata:

```json
{
  "product": {
    "name": "ExtensionGuy Tools & Extensions",
    "domain": "extensionguy.me",
    "url": "https://extensionguy.me",
    "privacy_url": "https://extensionguy.me/privacy.html",
    "github_repo": "https://github.com/sidoua26-debug/extensions-portfolio"
  },
  "extensions": [
    {
      "name": "Bilexi",
      "slug": "bilexi",
      "url": "https://extensionguy.me/bilexi/",
      "tagline": "Context-aware French autocorrect extension",
      "category": "Browser Extension / Productivity"
    },
    {
      "name": "BulkGrab",
      "slug": "bulkgrab",
      "url": "https://extensionguy.me/bulkgrab/",
      "tagline": "Fast, selective media downloader extension",
      "category": "Browser Extension / Media Tools"
    },
    {
      "name": "TabVault",
      "slug": "tab-vault",
      "url": "https://extensionguy.me/tab-vault/",
      "tagline": "Lightweight browser tab manager and session backup",
      "category": "Browser Extension / Tabs"
    }
  ],
  "browser_tools": [
    {
      "name": "Client-Side PDF Redaction Tool",
      "url": "https://extensionguy.me/pdf-tools/",
      "tagline": "Private, in-browser PDF text and area redaction without file uploads",
      "pricing": "Free / 100% Client-Side"
    },
    {
      "name": "Word-to-LaTeX Converter",
      "url": "https://extensionguy.me/word-to-latex-converter/",
      "tagline": "Convert DOCX to clean LaTeX and download accompanying images in-browser",
      "pricing": "Free / Client-Side WebAssembly"
    }
  ]
}
```

## Step 2: Target directory evaluation

Select legitimate, free developer directories and tool catalogs:

1. **Software & Alternative Directories:**
   - **AlternativeTo** (`https://alternativeto.net`): Excellent for browser extensions and privacy-focused software alternatives.
   - **SaaSHub** (`https://www.saashub.com`): Free developer tool profiles.
   - **LibHunt / Awesome Lists**: Curated GitHub developer lists covering Chrome extensions and document conversion utilities.
2. **Privacy & Offline Utility Roundups:**
   - Privacy-focused tool lists looking for zero-tracking, client-side browser alternatives.

## Step 3: Rules for submission preparation

1. **Strictly Free Tiers**: Only prepare submissions for free, non-sponsored directory categories. If a directory requires payment or subscription, mark as `skipped_paid_only`.
2. **Contact Hygiene**: Use public product contact details (`press@extensionguy.me` or `https://extensionguy.me/privacy.html`). Never submit personal phone numbers or private addresses.
3. **Factual Copy**: Eliminate all marketing buzzwords, em dashes, or superlative claims. Focus strictly on supported formats, permissions, and verified on-device capabilities.
4. **Structured Record Keeping**: Keep a local `seo/submissions-log.json` to record evaluated directories, status, and candidate copy:

```json
{
  "name": "AlternativeTo",
  "url": "https://alternativeto.net",
  "submissionUrl": "https://alternativeto.net/manage-item/",
  "status": "ready_for_review",
  "preparedDate": "2026-11-22",
  "toolTarget": "Client-Side PDF Redaction Tool",
  "notes": "Free listing for offline, client-side PDF redaction alternative"
}
```

## Verification checklist

- [ ] Manifest and logs cite real, maintained ExtensionGuy URLs and verified features.
- [ ] No paid submission options or LinkDR references.
- [ ] No duplicate Product Hunt launch steps.
- [ ] Directory actions remain in draft status pending explicit user instruction.

---
*Upstream attribution: Adapted from [Illyism/seo-skills](https://github.com/Illyism/seo-skills) (pinned commit `a158c36a1c2c84a44ee7a1ae69c009caf73e1a35`). Distributed under the MIT License.*
