# ExtensionGuy Constitution

## Core Principles

### I. Static & Lightweight Architecture
The ExtensionGuy platform is a high-performance static website deployed on Cloudflare Pages.
- Preserve existing vanilla HTML, CSS, and modern JavaScript architecture without introducing unnecessary frameworks, dependencies, or build complexity.
- Respect Python-generated pages and source-of-truth generators (specifically `build_redesign.py`). Never edit generated outputs directly without maintaining full generator parity.
- Keep the runtime environment lightweight and free of speculative abstractions.

### II. Privacy & Data Protection
User trust and factual data protection govern all tools and browser extensions.
- Zero application telemetry or usage tracking in published browser extensions.
- Zero advertising trackers, user profiling, session replay tools, or unauthorized personal-data collection across all web properties.
- Cookieless aggregate website analytics via Plausible Analytics are permitted exclusively on the website, provided they are explicitly disclosed in `/privacy`.
- Local document processing must be preserved: document conversion (e.g. Word-to-LaTeX, PDF tools) and text analysis run client-side in the browser via WebAssembly/Web Workers without remote document transmission.
- Existing Content Security Policy (CSP) and local security controls must be strictly maintained.
- Never make fabricated offline, privacy, product-support, or open-source claims.

### III. Product Truth & Marketplace Accuracy
All product descriptions, availability statements, and licensing terms must strictly mirror verified reality.
- Preserve official published version numbers matching browser store listings.
- Maintain accurate browser marketplace availability: never claim Chrome Web Store availability for extensions that are exclusive to Microsoft Edge Add-ons.
- Ensure extension permissions, capabilities, and store descriptions are factually accurate.
- Do not imply or state that all portfolio extensions are open-source.
- Respect and maintain existing optional paid Pro licensing models and commercial tiers.

### IV. Development Quality & Verification Gates
Quality and stability are enforced through systematic testing before code review.
- Every feature requires explicit, verifiable acceptance criteria prior to implementation.
- Every bug fix requires reproduction verification and regression test coverage.
- Mandatory test execution: run and pass existing automated test suites (`npm test`) before proposing approval.
- Multi-surface verification: validate desktop viewports, mobile responsiveness, WCAG AA accessibility/contrast, and target browser behavior (Edge / Chrome / Chromium).
- Preserve existing features, user flows, and converter behaviors unless an approved specification explicitly mandates modifications.

### V. Git Isolation & Deployment Safety
Strict controls protect worktree state and production integrity.
- Mandatory worktree isolation: all speculative changes, adoptions, or new features must execute in dedicated candidate worktrees (e.g., `candidate-*`).
- Protect uncommitted changes and unmerged work in parent worktrees; never stash, reset, clean, or force-push.
- Zero autonomous commits, pushes, or deployments: no agent may commit code, push branches, or trigger production deployments without explicit owner instruction.
- Dual-target verification: independent validation across GitHub repository state and Cloudflare Pages production deployments.

### VI. Multi-Agent Review Loop & Governance
Spec Kit must integrate seamlessly with the existing human and multi-agent supervisory loop:
1. **Requirements Definition**: ChatGPT (or Project Owner) defines requirements, acceptance criteria, and constraints.
2. **Investigation & Specification**: Antigravity researches codebase reality and produces formal specifications.
3. **Specification Review**: ChatGPT (or Project Owner) reviews, clarifies, and approves specifications.
4. **Controlled Implementation**: Antigravity implements changes in an isolated candidate worktree only after explicit approval.
5. **Quality Verification**: Automated test suites and multi-surface checks are executed.
6. **Implementation Review**: ChatGPT (or Project Owner) conducts final code and artifact review.
7. **Approved Deployment**: Owner approves and authorizes production release.

*Spec Kit provides structured artifacts (`spec.md`, `plan.md`, `tasks.md`, `constitution.md`) to empower this workflow, never to bypass owner review or authority.*

## Governance

This Constitution supersedes informal conventions and governs all development, maintenance, and agent interactions within the ExtensionGuy repository. Any amendment to this Constitution requires formal documentation, impact assessment, and explicit owner ratification.

**Version**: 1.1.0-draft | **Status**: Draft (Pending Owner Ratification) | **Ratified**: Pending | **Last Amended**: 2026-11-05
