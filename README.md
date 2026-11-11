# ExtensionGuy — Browser Extensions & Web Tools

Official portfolio and documentation repository for **ExtensionGuy** ([extensionguy.me](https://extensionguy.me/)), featuring privacy-first browser extensions for Microsoft Edge and Google Chrome alongside client-side web utilities and technical guides.

## 🔗 Quick Links

- **Official Website**: [https://extensionguy.me/](https://extensionguy.me/)
- **Online Word to LaTeX Converter**: [https://extensionguy.me/word-to-latex-converter/](https://extensionguy.me/word-to-latex-converter/)
- **Word to LaTeX (Offline) Extension**: [https://extensionguy.me/word-to-latex/](https://extensionguy.me/word-to-latex/)
- **Technical Guide — Offline DOCX Conversion**: [https://extensionguy.me/guides/docx-to-latex-offline/](https://extensionguy.me/guides/docx-to-latex-offline/)
- **Technical Guide — Word Tables to LaTeX**: [https://extensionguy.me/guides/word-tables-to-latex/](https://extensionguy.me/guides/word-tables-to-latex/)

---

## 🚀 Published Browser Extensions

1. **Word to LaTeX (Offline)** (Flagship) — Client-side `.docx` and table converter powered locally by Pandoc WebAssembly, with experimental local math-image OCR. [Edge Add-on](https://microsoftedge.microsoft.com/addons/detail/word-to-latex-offline/lpehnpdkdiddlppobkcicdondaebijlf) · [Chrome Web Store](https://chromewebstore.google.com/detail/word-to-latex-offline/appokjanohamffjlecncdegihoelkhco)
2. **Table Extractor** — HTML table and virtualized data grid (AG Grid, scroll-loaded containers) exporter to CSV, Excel (XLSX), and JSON. [Edge Add-on](https://microsoftedge.microsoft.com/addons/detail/table-extractor-export-h/pekammppimoaikllkhhebocbkbidoboe) · [Chrome Web Store](https://chromewebstore.google.com/detail/table-extractor-export-h/fjpbjpmccomonleefghgalfoioekhlhm)
3. **BulkGrab** — Bulk file downloader and browser-local ZIP bundler. [Edge Add-on](https://microsoftedge.microsoft.com/addons/detail/bulkgrab-batch-file-dow/cphidoikhnjdkeldgelkpddnkojlfccc) · [Chrome Web Store](https://chromewebstore.google.com/detail/bulkgrab-batch-file-downl/lnmmneljpgdefilkokfpmiohjgfjcljn)
4. **SEO Inspector** — 9-tab on-page technical SEO diagnostics evaluating headings, meta tags, OpenGraph, JSON-LD schema, and Navigation Timing. [Edge Add-on](https://microsoftedge.microsoft.com/addons/detail/seo-inspector-meta-tags/jbnjjkfkcmfkjamakndojbkjanijlfmd)
5. **Bilexi** — 100% offline bilingual autocorrect for English and French text fields with accent restoration and elision repair. [Edge Add-on](https://microsoftedge.microsoft.com/addons/detail/mheomahlcfddgjlemnolopfbhojfpmpb)
6. **Tab Vault** — Local tab manager and browser memory saver with disaster-recovery snapshots. [Edge Add-on](https://microsoftedge.microsoft.com/addons/detail/paedfgpjmkmmodbcimbkjkkdlfibfpbc)

---

## 🌐 Companion Client-Side Web Tools

- **Online Word to LaTeX Converter** ([/word-to-latex-converter/](https://extensionguy.me/word-to-latex-converter/)) — Zero-install browser converter running Pandoc WebAssembly in a sandboxed Web Worker for `.docx` files and tables (distinct from the browser extension; does not include OCR). Processes documents locally in browser memory without remote file transmission. Supports LaTeX Fragment and Complete Document output modes with step-by-step Overleaf project workflows.
- **Offline PDF Tools** ([/pdf-tools/](https://extensionguy.me/pdf-tools/)) — Client-side PDF utility suite (merge, split, rotate, redact, compress, and metadata sanitization) powered locally by `pdf-lib` and `PDF.js`. See the [practical guide to redacting a PDF without uploading it](https://extensionguy.me/guides/redact-pdf-without-uploading/).

---

## 🛠️ Architecture & Privacy Design

- **Static Architecture**: Hosted on Cloudflare Pages as static HTML, CSS, and client-side JavaScript.
- **Client-Side Document Conversion**: Document conversion runs entirely inside browser WebAssembly (Pandoc 3.10) in an isolated Web Worker thread. Word documents are never uploaded to ExtensionGuy servers.
- **Website Privacy**: The website does not embed visitor analytics or advertising trackers. Document conversion and PDF processing happen on your device. Cloudflare provides hosting, delivery and security. The [privacy policy](https://extensionguy.me/privacy#website) describes its infrastructure processing.
- **Zero Framework Bloat**: Pure CSS architecture with custom design tokens for light and dark themes, using Google Fonts `Geist`, `Manrope`, and `JetBrains Mono`.

---

## 💻 Local Preview

To preview the website locally, run any static HTTP server from the repository root:

```bash
# Using Python 3
python3 -m http.server 8080

# Or using Node.js
npx serve .
```

Then open `http://localhost:8080` in your browser.

---

## 🌐 Production Deployment

The production website is continuously deployed to **Cloudflare Pages** from the `main` branch:
- **Production URL**: [https://extensionguy.me/](https://extensionguy.me/)
- **Hosting Provider**: Cloudflare Pages
- **Build Command**: None (Static directory publish)
- **Output Directory**: `.` (Repository root)

---

## 🧪 Automated Testing

### Unit & Integration Suite
Run the full local test suite (313 tests):
```bash
npm test
```

### BrowserStack Automated Smoke Test
Automated smoke test executing against a real Android device (Google Pixel 8, Android 14, Chrome) via BrowserStack Automate's native Playwright `_android.connect` bridge.

Trigger via GitHub Actions:
1. Open **Actions** → **BrowserStack Smoke Test**
2. Select **Run workflow**
3. Select `main` (after this PR is merged)
4. Keep the production target and verified Pixel 8 / Android 14 defaults

Or trigger via the GitHub CLI:
```bash
gh workflow run browserstack-smoke.yml --ref main
```

**Target & Scope**:
- The smoke test defaults to the live deployed production site (`https://extensionguy.me`). A green run verifies deployed site health, converter functionality, and production store destinations; it does **not** validate unmerged website changes unless `target_url` is explicitly specified for a preview deployment.

**Version & CI Environment**:
- Playwright 1.62.0 is the tested Android configuration for this workflow.
- In CI (`.github/workflows/browserstack-smoke.yml`), the workflow installs `playwright@1.62.0` via `npm install --no-save` specifically for this smoke execution step.
- The repository's normal dependency declared in `package.json` remains Playwright 1.63.0, which powers the full local unit and integration test suite (`npm test`).
