# Browser Extensions Portfolio

A multi-page, privacy-first static website showcasing 6 confirmed published browser extensions across Microsoft Edge Add-ons and the Chrome Web Store, alongside client-side web tools, with Word to LaTeX (Offline) as the flagship featured product.

## 🚀 Published Extensions Featured

1. **Word to LaTeX (Offline)** (Flagship Hero) — Client-side .docx, table, and image-to-LaTeX converter via Pandoc WASM and Tesseract. [Edge Add-on](https://microsoftedge.microsoft.com/addons/detail/word-to-latex-offline/lpehnpdkdiddlppobkcicdondaebijlf) · [Chrome Web Store](https://chromewebstore.google.com/detail/word-to-latex-offline/appokjanohamffjlecncdegihoelkhco)
2. **Table Extractor** — HTML table and virtualized data grid (AG Grid, scroll-loaded containers) exporter to CSV, Excel (XLSX), and JSON. [Edge Add-on](https://microsoftedge.microsoft.com/addons/detail/table-extractor-export-h/pekammppimoaikllkhhebocbkbidoboe) · [Chrome Web Store](https://chromewebstore.google.com/detail/table-extractor-export-h/fjpbjpmccomonleefghgalfoioekhlhm)
3. **BulkGrab** — Bulk file downloader and browser-local ZIP bundler. [Edge Add-on](https://microsoftedge.microsoft.com/addons/detail/bulkgrab-batch-file-dow/cphidoikhnjdkeldgelkpddnkojlfccc) · [Chrome Web Store](https://chromewebstore.google.com/detail/bulkgrab-batch-file-downl/lnmmneljpgdefilkokfpmiohjgfjcljn)
4. **SEO Inspector** — 9-tab on-page technical SEO diagnostics tool. [Edge Add-on](https://microsoftedge.microsoft.com/addons/detail/seo-inspector-meta-tags/jbnjjkfkcmfkjamakndojbkjanijlfmd)
5. **Bilexi** — 100% offline bilingual autocorrect for English and French text fields. [Edge Add-on](https://microsoftedge.microsoft.com/addons/detail/mheomahlcfddgjlemnolopfbhojfpmpb)
6. **Tab Vault** — Local tab manager and browser memory saver with disaster-recovery snapshots. [Edge Add-on](https://microsoftedge.microsoft.com/addons/detail/paedfgpjmkmmodbcimbkjkkdlfibfpbc)

## 🌐 Companion Client-Side Web Tools

- **Offline PDF Tools** (`/pdf-tools/`) — 100% client-side PDF utility suite (merge, split, rotate, redact, compress, and metadata sanitization) powered locally by `pdf-lib` and `PDF.js`.
- **Online Word to LaTeX Converter** (`/word-to-latex-converter/`) — Standalone client-side web converter running Pandoc WebAssembly in an isolated Web Worker.

## 🛠️ Tech Stack & Architecture

- **Format**: 100% static client-side architecture with dedicated product showcases, companion web tools, and technical guides alongside the homepage.
- **Styling**: Pure CSS with design tokens for dark and light modes (WCAG AA contrast).
- **Typography**: Google Fonts `Geist` (UI) and `JetBrains Mono` (Code/LaTeX previews).
- **Zero Dependencies**: No frameworks, no external runtime packages, no backend required.

## 💻 Local Preview

Run any local static server:
```bash
# Python
cd /home/sid/.gemini/antigravity/scratch/extensions-portfolio
python3 -m http.server 8080

# Or Node.js
npx serve .
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

## 🌐 Free Deployment Options

### GitHub Pages (Recommended)
1. Push this folder to a GitHub repository under your account (e.g. `sidoua26-debug/extensions-portfolio`).
2. Go to **Settings** → **Pages** → Source: **Deploy from a branch** (`main` / root).
3. The site will be live at `https://sidoua26-debug.github.io/extensions-portfolio/`.

### Netlify / Cloudflare Pages / Vercel
- Simply drag and drop the `extensions-portfolio` directory or connect the Git repository with blank build command and publish directory set to `.`.
