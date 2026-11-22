---
name: ahrefs-research
description: Analyze search queries, competitor coverage, and backlink prospects for ExtensionGuy using supplied Ahrefs exports or available tooling. Ships structured gap roadmaps, link-prospect drafts, and guide topics. Scoped to ExtensionGuy's static website, browser extensions, guides, and tools.
metadata:
  author: illyism
  source: https://github.com/Illyism/seo-skills (commit a158c36a1c2c84a44ee7a1ae69c009caf73e1a35)
  adapted_for: ExtensionGuy (https://extensionguy.me)
  version: 1.0.0
  license: MIT
---

# Ahrefs and search research for ExtensionGuy

Ground competitor research and topic discovery in real data. Every analysis produces actionable artifacts: a structured Markdown gap analysis, a prospective link directory, or concrete guide outlines.

> **Data & Evidence Rules:**
> - Missing Ahrefs access or API credentials is an evidence limitation; **never invent numbers, search volumes, or traffic metrics**.
> - Rely on connected tools, user-supplied CSV exports (from Ahrefs or Google Search Console), or local project data.
> - When data is unavailable, explicitly state "Could not verify" or `[NEEDS DATA]` rather than substituting estimated figures.
> - Upstream metric benchmarks and ranking claims are examples requiring independent verification. Do not promise specific rankings or AI citations.

## Step 0: Identify available inputs

```text
Are Ahrefs API tools or environment credentials ($AHREFS_API_KEY) available?
├── Yes → Use API queries with strict row limits (default 50-100 rows).
└── No → CSV and export fallback:
    1. Inspect user-provided CSV exports in `seo/data/ahrefs/` or `reports/`.
    2. Inspect verified Google Search Console query exports.
    3. If no export is provided, formulate clear questions or request exports from the user.
```

## Workflow A: Competitor content and tool gap analysis

**Objective:** Identify topics and tool utilities that competitors address but ExtensionGuy lacks, or opportunities where ExtensionGuy's client-side, on-device privacy model offers a distinct alternative.

1. **Focus on Real Software Utilities:**
   - Filter out platform giants (`reddit.com`, `quora.com`, `wikipedia.org`).
   - Focus on developer tools, browser extensions, file format converters, and PDF utility sites.
2. **Evaluate Opportunity Types:**
   - **New Browser Tool or Demo**: Opportunities matching client-side processing capabilities (e.g. format conversions, client-side redaction).
   - **Technical Guide**: In-depth practitioner tutorials for `guides/` (e.g. offline conversion workflows, LaTeX formatting, browser extension architecture).
   - **Existing Page Refresh**: Enhancing existing ExtensionGuy pages when verified queries show impressions without clicks.
3. **Drafting Guidelines:**
   - Map findings to maintained source files (e.g. `build_redesign.py` templates or `guides/<slug>/index.html`).
   - Do not require third-party presentation tools (e.g. GenPPT); format findings as clear Markdown reports in `reports/` or `seo/`.

## Workflow B: Backlink & directory prospect analysis

**Objective:** Identify relevant, editorial reference opportunities (developer directories, open-source tool collections, tech blogs, and curated resource lists).

1. **Replication & Prospect Classification:**
   - *Developer Resource / Awesome List*: Open-source or developer tool aggregators.
   - *Technical Blog Mention*: Relevant tutorials discussing browser extensions, privacy tools, or document workflows.
   - *Software Directory*: Legitimate review and catalog platforms.
2. **Drafting Policy:**
   - Compile prospect lists as draft files in `seo/` or `reports/`.
   - **Do not purchase paid links or use paid link fulfillment services.**
   - All outreach and directory suggestions remain drafts until the user explicitly requests sending or submission.
3. **Filter Unnatural Links:**
   - Exclude automated link farms, generic PBNs, and low-quality scraper sites.

## Workflow C: Practitioner query and community pain points

**Objective:** Discover real user difficulties from search queries or community threads (e.g. privacy risks of uploading confidential PDFs to cloud tools, formatting bugs in Word-to-LaTeX converters).

1. **Cluster by Technical Need:**
   - Focus on queries seeking offline, private, or free client-side solutions (e.g. "redact pdf without upload", "convert docx to latex offline").
2. **Map to ExtensionGuy Solutions:**
   - Tie each query cluster directly to an existing tool or guide, highlighting verified on-device mechanics.

## Output checklist

- [ ] All reported metrics and competitor claims cite verified files or exports; zero invented numbers.
- [ ] Analysis identifies maintained source files for any proposed additions.
- [ ] No paid link recommendations or external service subscription requirements.
- [ ] Prospect recommendations are structured as reviewable drafts.

---
*Upstream attribution: Adapted from [Illyism/seo-skills](https://github.com/Illyism/seo-skills) (pinned commit `a158c36a1c2c84a44ee7a1ae69c009caf73e1a35`). Distributed under the MIT License.*
