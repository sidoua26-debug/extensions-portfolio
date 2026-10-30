#!/usr/bin/env python3
"""
scripts/migrate_site_branding.py
Migrates all static HTML pages in the Extensions Portfolio to the
new ExtensionGuy logo, two-tone wordmark, self-hosted Manrope typography,
and updated favicon/OG image suite.

Supports:
  --dry-run / --check : validates and reports planned changes without writing.
  --apply             : applies modifications idempotently.
"""

import sys
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

STANDARD_PAGES = [
    # Product pages (depth 1)
    ("word-to-latex/index.html", "../"),
    ("table-extractor/index.html", "../"),
    ("bulkgrab/index.html", "../"),
    ("seo-inspector/index.html", "../"),
    ("bilexi/index.html", "../"),
    ("tab-vault/index.html", "../"),
    # Other root & utility (depth 1)
    ("word-to-latex-converter/index.html", "../"),
    ("changelog/index.html", "../"),
    ("guides/index.html", "../"),
    # Guides (depth 2)
    ("guides/docx-to-latex-offline/index.html", "../../"),
    ("guides/export-virtualized-tables-to-excel/index.html", "../../"),
    ("guides/prevent-browser-tab-loss-local-backups/index.html", "../../"),
    ("guides/type-french-accents-on-qwerty-offline/index.html", "../../"),
    ("guides/word-tables-to-latex/index.html", "../../"),
]

PAGE_OG_MAP = {
    "index.html": "home-1200x630.png",
    "word-to-latex/index.html": "word-to-latex-1200x630.png",
    "table-extractor/index.html": "table-extractor-1200x630.png",
    "bulkgrab/index.html": "bulkgrab-1200x630.png",
    "seo-inspector/index.html": "seo-inspector-1200x630.png",
    "bilexi/index.html": "bilexi-1200x630.png",
    "tab-vault/index.html": "tab-vault-1200x630.png",
    "word-to-latex-converter/index.html": "word-to-latex-converter-1200x630.png",
    "changelog/index.html": "home-1200x630.png",
    "guides/index.html": "home-1200x630.png",
    "guides/docx-to-latex-offline/index.html": "guide-docx-to-latex-offline-1200x630.png",
    "guides/word-tables-to-latex/index.html": "guide-word-tables-to-latex-1200x630.png",
    "guides/export-virtualized-tables-to-excel/index.html": "home-1200x630.png",
    "guides/prevent-browser-tab-loss-local-backups/index.html": "home-1200x630.png",
    "guides/type-french-accents-on-qwerty-offline/index.html": "home-1200x630.png",
    "privacy.html": "privacy-1200x630.png",
}

def get_canonical_favicons(prefix: str, is_pdf_tools: bool = False) -> str:
    ico_href = "../favicon.ico?v=2" if is_pdf_tools else "/favicon.ico?v=2"
    return f"""  <link rel="icon" type="image/svg+xml" href="{prefix}assets/icons/favicon.svg?v=2">
  <link rel="icon" type="image/png" sizes="48x48" href="{prefix}assets/icons/favicon-48.png?v=2">
  <link rel="icon" type="image/png" sizes="32x32" href="{prefix}assets/icons/favicon-32.png?v=2">
  <link rel="icon" type="image/png" sizes="16x16" href="{prefix}assets/icons/favicon-16.png?v=2">
  <link rel="icon" href="{ico_href}" sizes="any">
  <link rel="apple-touch-icon" sizes="180x180" href="{prefix}assets/icons/apple-touch-icon.png?v=2">
  <meta name="theme-color" content="#0f172a">"""

def replace_favicons(content: str, prefix: str, is_pdf_tools: bool = False) -> str:
    if 'href="assets/icons/favicon.svg?v=2"' in content or 'href="../assets/icons/favicon.svg?v=2"' in content or 'href="../../assets/icons/favicon.svg?v=2"' in content:
        return content
    pattern = re.compile(
        r'(?:  <link rel="icon"[^>]*>\s*)+'
        r'(?:  <link rel="apple-touch-icon"[^>]*>\s*)'
        r'  <meta name="theme-color"[^>]*>',
        re.DOTALL
    )
    new_favs = get_canonical_favicons(prefix, is_pdf_tools)
    if pattern.search(content):
        return pattern.sub(new_favs, content, count=1)
    return content

def update_social_images(content: str, rel_path: str) -> str:
    og_file = PAGE_OG_MAP.get(rel_path)
    if not og_file:
        return content
    og_url = f"https://extensionguy.me/assets/og/{og_file}?v=2"
    content = re.sub(
        r'<meta property="og:image" content="https://extensionguy\.me/assets/og/[^"]+">',
        f'<meta property="og:image" content="{og_url}">',
        content
    )
    if 'property="og:image:width"' not in content and 'property="og:image"' in content:
        content = re.sub(
            rf'(<meta property="og:image" content="{re.escape(og_url)}">)',
            r'\1\n  <meta property="og:image:width" content="1200">\n  <meta property="og:image:height" content="630">',
            content
        )
    content = re.sub(
        r'<meta name="twitter:image" content="https://extensionguy\.me/assets/og/[^"]+">',
        f'<meta name="twitter:image" content="{og_url}">',
        content
    )
    return content

def update_styles_version(content: str) -> str:
    content = re.sub(r'styles\.css(?:\?v=[^"]*)?', 'styles.css?v=2', content)
    return content

def add_font_preloads(content: str, prefix: str) -> str:
    if "manrope-500.woff2" not in content:
        preloads = (
            f'  <link rel="preload" href="{prefix}assets/fonts/manrope-500.woff2" as="font" type="font/woff2" crossorigin>\n'
            f'  <link rel="preload" href="{prefix}assets/fonts/manrope-800.woff2" as="font" type="font/woff2" crossorigin>\n'
        )
        if "<!-- Preload critical local typography fonts -->\n" in content:
            content = content.replace(
                "<!-- Preload critical local typography fonts -->\n",
                f"<!-- Preload critical local typography fonts -->\n{preloads}"
            )
        elif '<link rel="stylesheet"' in content:
            content = re.sub(r'(  <link rel="stylesheet")', f'{preloads}\\1', content, count=1)
        elif '<style>' in content:
            content = re.sub(r'(\s*<style>)', f'\n{preloads}\\1', content, count=1)
    return content

def get_brand_mark_html(prefix: str) -> str:
    return (
        f'<div class="brand-mark" aria-hidden="true">\n'
        f'          <img src="{prefix}assets/icons/logo-icon.svg" alt="ExtensionGuy" class="brand-icon brand-icon-light" width="34" height="28">\n'
        f'          <img src="{prefix}assets/icons/logo-icon-dark.svg" alt="ExtensionGuy" class="brand-icon brand-icon-dark" width="34" height="28">\n'
        f'        </div>'
    )

def get_wordmark_html(include_style: bool = True) -> str:
    if include_style:
        return '<span class="brand-text"><span class="wordmark-ext" style="font-weight:800;color:var(--wordmark-extension,#3B33C4)">Extension</span><span class="wordmark-guy" style="font-weight:500;color:var(--wordmark-guy,#14123A)">Guy</span></span>'
    return '<span class="brand-text"><span class="wordmark-ext">Extension</span><span class="wordmark-guy">Guy</span></span>'

def migrate_standard_page(content: str, rel_prefix: str, path_str: str) -> str:
    content = replace_favicons(content, rel_prefix, is_pdf_tools=False)
    content = update_styles_version(content)
    content = update_social_images(content, path_str)
    content = add_font_preloads(content, rel_prefix)

    # 4. Header brand lockup
    header_pattern = re.compile(
        r'(<header[^>]*>.*?<a[^>]*class="brand"[^>]*>\s*)'
        r'<div class="brand-mark" aria-hidden="true">.*?</div>\s*(?:<span>ExtensionGuy</span>|<span class="brand-text">.*?</span>)'
        r'(\s*</a>)',
        re.DOTALL
    )
    if header_pattern.search(content):
        mark = get_brand_mark_html(rel_prefix)
        word = get_wordmark_html()
        content = header_pattern.sub(rf'\1{mark}\n        {word}\2', content, count=1)

    # 5. Footer brand lockup
    footer_pattern = re.compile(
        r'(<footer[^>]*>.*?<a[^>]*class="brand"[^>]*>\s*)'
        r'<div class="brand-mark" aria-hidden="true">.*?</div>\s*(?:<span>ExtensionGuy</span>|<span class="brand-text">.*?</span>)'
        r'(\s*</a>)',
        re.DOTALL
    )
    if footer_pattern.search(content):
        mark = get_brand_mark_html(rel_prefix)
        word = get_wordmark_html()
        content = footer_pattern.sub(rf'\1{mark}\n          {word}\2', content, count=1)

    return content

def migrate_404_page(content: str) -> str:
    content = replace_favicons(content, "", is_pdf_tools=False)
    content = add_font_preloads(content, "")

    # Inject Manrope @font-face & styles into <style> if not present
    if "font-family: 'Manrope'" not in content:
        manrope_css = """
    @font-face {
      font-family: 'Manrope';
      font-style: normal;
      font-weight: 500;
      font-display: swap;
      src: url('assets/fonts/manrope-500.woff2') format('woff2');
    }
    @font-face {
      font-family: 'Manrope';
      font-style: normal;
      font-weight: 800;
      font-display: swap;
      src: url('assets/fonts/manrope-800.woff2') format('woff2');
    }
"""
        content = content.replace("  <style>\n", f"  <style>{manrope_css}")

    if "--wordmark-extension" not in content:
        content = content.replace(
            "    :root {\n",
            "    :root {\n      --wordmark-extension: #3B33C4;\n      --wordmark-guy: #14123A;\n"
        )
        content = content.replace(
            "      html:not([data-theme=\"light\"]) {\n",
            "      html:not([data-theme=\"light\"]) {\n        --wordmark-extension: #B4B0FF;\n        --wordmark-guy: #FFFFFF;\n"
        )

    # Add .brand-icon and .brand-text rules
    if ".brand-icon" not in content:
        brand_css = """
    .brand-mark {
      background: none;
      border-radius: 0;
      box-shadow: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .brand-icon {
      display: block;
      height: 28px;
      width: auto;
    }
    .brand-icon-dark { display: none; }
    .brand-icon-light { display: block; }
    html[data-theme="dark"] .brand-icon-light { display: none; }
    html[data-theme="dark"] .brand-icon-dark { display: block; }
    @media (prefers-color-scheme: dark) {
      html:not([data-theme="light"]) .brand-icon-light { display: none; }
      html:not([data-theme="light"]) .brand-icon-dark { display: block; }
    }
    .brand-text {
      display: inline-flex;
      align-items: baseline;
      font-family: 'Manrope', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      letter-spacing: -0.02em;
    }
    .wordmark-ext {
      font-weight: 800;
      color: var(--wordmark-extension, #3B33C4);
    }
    .wordmark-guy {
      font-weight: 500;
      color: var(--wordmark-guy, #14123A);
    }
"""
        content = content.replace("    .brand-mark {\n", f"{brand_css}    .brand-mark-old {{\n")

    # Header brand lockup
    header_404 = re.compile(
        r'(<a href="index\.html" class="brand-link">\s*)'
        r'<div class="brand-mark" aria-hidden="true">\s*<svg[^>]*>.*?</svg>\s*</div>\s*<span>ExtensionGuy</span>'
        r'(\s*</a>)',
        re.DOTALL
    )
    if header_404.search(content):
        mark = get_brand_mark_html("")
        word = get_wordmark_html()
        content = header_404.sub(rf'\1{mark}\n      {word}\2', content, count=1)

    # Footer
    footer_404 = re.compile(
        r'(<div class="footer-note">\s*<div[^>]*>\s*)'
        r'<div class="brand-mark" aria-hidden="true"[^>]*>\s*<svg[^>]*>.*?</svg>\s*</div>\s*'
        r'<strong[^>]*>ExtensionGuy</strong>',
        re.DOTALL
    )
    if footer_404.search(content):
        mark = get_brand_mark_html("")
        word = get_wordmark_html()
        content = footer_404.sub(rf'\1{mark}\n        {word}', content, count=1)

    return content

def migrate_privacy_page(content: str) -> str:
    content = replace_favicons(content, "", is_pdf_tools=False)
    content = update_social_images(content, "privacy.html")
    content = add_font_preloads(content, "")

    # Inject Manrope @font-face & styles into <style> if not present
    if "font-family: 'Manrope'" not in content:
        manrope_css = """
    @font-face {
      font-family: 'Manrope';
      font-style: normal;
      font-weight: 500;
      font-display: swap;
      src: url('assets/fonts/manrope-500.woff2') format('woff2');
    }
    @font-face {
      font-family: 'Manrope';
      font-style: normal;
      font-weight: 800;
      font-display: swap;
      src: url('assets/fonts/manrope-800.woff2') format('woff2');
    }
"""
        content = content.replace("  <style>\n", f"  <style>{manrope_css}")

    if "--wordmark-extension" not in content:
        content = content.replace(
            "    :root {\n",
            "    :root {\n      --wordmark-extension: #3B33C4;\n      --wordmark-guy: #14123A;\n"
        )
        content = content.replace(
            "      html:not([data-theme=\"light\"]) {\n",
            "      html:not([data-theme=\"light\"]) {\n        --wordmark-extension: #B4B0FF;\n        --wordmark-guy: #FFFFFF;\n"
        )

    if ".brand-icon" not in content:
        brand_css = """
    .brand-mark {
      background: none;
      border-radius: 0;
      box-shadow: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .brand-icon {
      display: block;
      height: 28px;
      width: auto;
    }
    .brand-icon-dark { display: none; }
    .brand-icon-light { display: block; }
    html[data-theme="dark"] .brand-icon-light { display: none; }
    html[data-theme="dark"] .brand-icon-dark { display: block; }
    @media (prefers-color-scheme: dark) {
      html:not([data-theme="light"]) .brand-icon-light { display: none; }
      html:not([data-theme="light"]) .brand-icon-dark { display: block; }
    }
    .brand-text {
      display: inline-flex;
      align-items: baseline;
      font-family: 'Manrope', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      letter-spacing: -0.02em;
    }
    .wordmark-ext {
      font-weight: 800;
      color: var(--wordmark-extension, #3B33C4);
    }
    .wordmark-guy {
      font-weight: 500;
      color: var(--wordmark-guy, #14123A);
    }
"""
        content = content.replace("  </style>", f"{brand_css}  </style>")

    # Header brand lockup
    header_priv = re.compile(
        r'(<div class="privacy-header-lockup"[^>]*>\s*<a[^>]*class="brand"[^>]*>\s*)'
        r'<div class="brand-mark" aria-hidden="true"[^>]*>.*?</div>\s*(?:<span>ExtensionGuy</span>|<span class="brand-text">.*?</span>)'
        r'(\s*</a>)',
        re.DOTALL
    )
    if header_priv.search(content):
        mark = get_brand_mark_html("")
        word = get_wordmark_html()
        content = header_priv.sub(rf'\1{mark}\n        {word}\2', content, count=1)

    # Footer brand lockup
    footer_priv = re.compile(
        r'(<footer class="privacy-footer"[^>]*>\s*<a[^>]*class="brand"[^>]*>\s*)'
        r'<div class="brand-mark" aria-hidden="true"[^>]*>.*?</div>\s*(?:<span>ExtensionGuy</span>|<span class="brand-text">.*?</span>)'
        r'(\s*</a>)',
        re.DOTALL
    )
    if footer_priv.search(content):
        mark = get_brand_mark_html("")
        word = get_wordmark_html()
        content = footer_priv.sub(rf'\1{mark}\n        {word}\2', content, count=1)

    return content

def migrate_pdf_tools_page(content: str) -> str:
    content = replace_favicons(content, "../", is_pdf_tools=True)
    content = update_styles_version(content)
    content = add_font_preloads(content, "../")

    # Header parent brand mark
    header_pdf = re.compile(
        r'(<a href="/" class="brand-parent-link"[^>]*>\s*)'
        r'(?:<span class="brand-by-label">.*?</span>\s*)?'
        r'(?:<div class="brand-mark"[^>]*>.*?</div>|<div class="brand-parent-mark"[^>]*>.*?</div>)\s*'
        r'(?:<span>ExtensionGuy</span>|<span class="brand-text">.*?</span>)'
        r'(\s*</a>)',
        re.DOTALL
    )
    if header_pdf.search(content):
        mark = (
            f'<span class="brand-by-label">by</span>\n'
            f'          <div class="brand-mark" aria-hidden="true"><img src="../assets/icons/logo-icon.svg" alt="" class="brand-icon brand-icon-light" width="34" height="28"><img src="../assets/icons/logo-icon-dark.svg" alt="" class="brand-icon brand-icon-dark" width="34" height="28"></div>'
        )
        word = get_wordmark_html(include_style=False)
        content = header_pdf.sub(rf'\1{mark}\n          {word}\2', content, count=1)

    # Footer brand lockup
    footer_pdf = re.compile(
        r'(<div class="footer-brand-lockup">\s*<a href="/" class="footer-brand-link">\s*)'
        r'(?:<div class="brand-mark"[^>]*>.*?</div>|<div class="brand-parent-mark"[^>]*>.*?</div>)\s*'
        r'(?:<span>ExtensionGuy</span>|<span class="brand-text">.*?</span>)'
        r'(\s*</a>\s*</div>)',
        re.DOTALL
    )
    if footer_pdf.search(content):
        mark = (
            f'<div class="brand-mark" aria-hidden="true"><img src="../assets/icons/logo-icon.svg" alt="" class="brand-icon brand-icon-light" width="34" height="28"><img src="../assets/icons/logo-icon-dark.svg" alt="" class="brand-icon brand-icon-dark" width="34" height="28"></div>'
        )
        word = get_wordmark_html(include_style=False)
        content = footer_pdf.sub(rf'\1{mark}\n          {word}\2', content, count=1)

    return content

def main():
    apply_changes = "--apply" in sys.argv
    check_mode = "--check" in sys.argv or "--dry-run" in sys.argv or not apply_changes

    print("=" * 60)
    print("Site Branding Migration Pass (New Logo & Manrope Two-Tone Wordmark)")
    print(f"Mode: {'APPLY' if apply_changes else 'CHECK (DRY-RUN)'}")
    print("=" * 60)

    total_files = 0
    modified_files = 0

    # 1. Standard pages (14 pages)
    for rel_path, prefix in STANDARD_PAGES:
        file_path = REPO_ROOT / rel_path
        total_files += 1
        if not file_path.exists():
            print(f"[MISSING] {rel_path}")
            continue

        content = file_path.read_text(encoding="utf-8")
        migrated = migrate_standard_page(content, prefix, rel_path)
        if migrated != content:
            modified_files += 1
            print(f"[CHANGE] {rel_path} requires brand migration")
            if apply_changes:
                file_path.write_text(migrated, encoding="utf-8")
                print(f"  -> Applied changes to {rel_path}")
        else:
            print(f"[CLEAN] {rel_path} already conforms")

    # 2. 404.html
    f_404 = REPO_ROOT / "404.html"
    total_files += 1
    if f_404.exists():
        content_404 = f_404.read_text(encoding="utf-8")
        migrated_404 = migrate_404_page(content_404)
        if migrated_404 != content_404:
            modified_files += 1
            print(f"[CHANGE] 404.html requires brand migration")
            if apply_changes:
                f_404.write_text(migrated_404, encoding="utf-8")
                print(f"  -> Applied changes to 404.html")
        else:
            print(f"[CLEAN] 404.html already conforms")

    # 3. privacy.html
    f_priv = REPO_ROOT / "privacy.html"
    total_files += 1
    if f_priv.exists():
        content_priv = f_priv.read_text(encoding="utf-8")
        migrated_priv = migrate_privacy_page(content_priv)
        if migrated_priv != content_priv:
            modified_files += 1
            print(f"[CHANGE] privacy.html requires brand migration")
            if apply_changes:
                f_priv.write_text(migrated_priv, encoding="utf-8")
                print(f"  -> Applied changes to privacy.html")
        else:
            print(f"[CLEAN] privacy.html already conforms")

    # 4. pdf-tools/index.html
    f_pdf = REPO_ROOT / "pdf-tools" / "index.html"
    total_files += 1
    if f_pdf.exists():
        content_pdf = f_pdf.read_text(encoding="utf-8")
        migrated_pdf = migrate_pdf_tools_page(content_pdf)
        if migrated_pdf != content_pdf:
            modified_files += 1
            print(f"[CHANGE] pdf-tools/index.html requires brand migration")
            if apply_changes:
                f_pdf.write_text(migrated_pdf, encoding="utf-8")
                print(f"  -> Applied changes to pdf-tools/index.html")
        else:
            print(f"[CLEAN] pdf-tools/index.html already conforms")

    print("-" * 60)
    print(f"Scanned {total_files} pages. {modified_files} need updates.")
    if check_mode and modified_files > 0:
        print("Dry-run complete. Run with --apply to execute changes.")
        if "--check" in sys.argv:
            sys.exit(1)
    elif apply_changes:
        print("All changes successfully applied.")
    else:
        print("All pages strictly conform to canonical branding.")

if __name__ == "__main__":
    main()
