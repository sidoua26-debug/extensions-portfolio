# Browser Extensions Portfolio

A single-page, privacy-first static website showcasing your 5 confirmed published Microsoft Edge Add-ons with Word to LaTeX (Offline) as the flagship featured product.

## 🚀 Published Add-ons Featured

1. **Word to LaTeX (Offline)** (Flagship Hero) — Client-side .docx, table, and image-to-LaTeX converter via Pandoc WASM and Tesseract.
2. **Table Extractor** — HTML table and virtualized data grid (AG Grid, React) exporter to CSV, Excel (XLSX), and JSON.
3. **BulkGrab** — Bulk file downloader and browser-local ZIP bundler.
4. **SEO Inspector** — 9-tab on-page technical SEO diagnostics tool.
5. **Bilexi** — 100% offline bilingual autocorrect for English and French text fields. [Edge Add-on](https://microsoftedge.microsoft.com/addons/detail/mheomahlcfddgjlemnolopfbhojfpmpb)
6. **MailFlow** — In-development Gmail templates & scheduled sending companion (Labs preview).

## 🛠️ Tech Stack & Architecture

- **Format**: 100% static client-side single page (`index.html`) with self-contained assets in `assets/`.
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
