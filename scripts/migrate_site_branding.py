#!/usr/bin/env python3
"""
scripts/migrate_site_branding.py
Safely migrates all static HTML pages in the Extensions Portfolio to the
canonical Variant 1 (Classic Puzzle Piece) brand logo and updated favicon suite.

Single Source of Truth:
  Imports BRAND_MARK_SVG directly from build_redesign.py to guarantee 100%
  identical mark rendering and proportions across all pages.

Supports:
  --dry-run / --check : validates and reports planned changes without writing.
  --apply             : applies modifications idempotently.
"""

import sys
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

# Import canonical SVG from generator (SINGLE SOURCE OF TRUTH)
from build_redesign import BRAND_MARK_SVG

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

def get_canonical_favicons(prefix: str, is_pdf_tools: bool = False) -> str:
    ico_href = "../favicon.ico?v=20261030" if is_pdf_tools else "/favicon.ico?v=20261030"
    return f"""  <link rel="icon" href="{ico_href}" sizes="32x32">
  <link rel="icon" type="image/svg+xml" href="{prefix}assets/icons/favicon.svg?v=20261030">
  <link rel="icon" type="image/png" sizes="32x32" href="{prefix}assets/icons/favicon-32x32.png?v=20261030">
  <link rel="icon" type="image/png" sizes="16x16" href="{prefix}assets/icons/favicon-16x16.png?v=20261030">
  <link rel="apple-touch-icon" sizes="180x180" href="{prefix}assets/icons/apple-touch-icon.png?v=20261030">
  <meta name="theme-color" content="#0f172a">"""

def replace_favicons(content: str, prefix: str, is_pdf_tools: bool = False) -> str:
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

def update_social_images(content: str) -> str:
    content = re.sub(
        r'(<meta property="og:image" content="https://extensionguy\.me/assets/og/[^"?]+)(?:\?v=[^"]*)?(">)',
        r'\1?v=20261030\2',
        content
    )
    content = re.sub(
        r'(<meta name="twitter:image" content="https://extensionguy\.me/assets/og/[^"?]+)(?:\?v=[^"]*)?(">)',
        r'\1?v=20261030\2',
        content
    )
    return content

def update_styles_version(content: str) -> str:
    content = re.sub(r'styles\.css\?v=20261030-[12]', 'styles.css?v=20261030-3', content)
    content = re.sub(r'href="\./styles\.css(?:\?v=[^"]*)?"', 'href="./styles.css?v=20261030-1"', content)
    return content

def migrate_standard_page(content: str, rel_prefix: str, path_str: str) -> str:
    # 1. Favicons
    content = replace_favicons(content, rel_prefix, is_pdf_tools=False)

    # 2. Stylesheet version bump
    content = update_styles_version(content)

    # 3. Social images
    content = update_social_images(content)

    # 4. Header brand mark
    # Replace any previous brand-mark SVG with canonical BRAND_MARK_SVG
    header_pattern = re.compile(
        r'(<header[^>]*>.*?<div class="brand-mark" aria-hidden="true">\s*)'
        r'<svg[^>]*>.*?</svg>(\s*</div>)',
        re.DOTALL
    )
    if header_pattern.search(content):
        content = header_pattern.sub(rf'\1{BRAND_MARK_SVG}\2', content, count=1)

    # 5. Footer brand mark
    footer_pattern = re.compile(
        r'(<footer[^>]*>.*?<div class="brand-mark" aria-hidden="true">\s*)'
        r'<svg[^>]*>.*?</svg>(\s*</div>)',
        re.DOTALL
    )
    if footer_pattern.search(content):
        content = footer_pattern.sub(rf'\1{BRAND_MARK_SVG}\2', content, count=1)

    return content

def migrate_404_page(content: str) -> str:
    # Favicons
    content = replace_favicons(content, "", is_pdf_tools=False)

    # Update .brand-mark CSS rule to single tile (background: none, 8px radius, shadow)
    css_target = re.compile(
        r'\.brand-mark\s*\{[^}]*\}',
        re.DOTALL
    )
    new_css = (
        ".brand-mark {\n"
        "      width: 32px;\n"
        "      height: 32px;\n"
        "      border-radius: 8px;\n"
        "      background: none;\n"
        "      display: inline-flex;\n"
        "      align-items: center;\n"
        "      justify-content: center;\n"
        "      box-shadow: 0 2px 6px #4f46e559;\n"
        "      flex-shrink: 0;\n"
        "    }"
    )
    if css_target.search(content):
        content = css_target.sub(new_css, content, count=1)

    # Header brand mark
    old_header_mark = re.compile(
        r'(<a href="index\.html" class="brand-link">\s*<div class="brand-mark" aria-hidden="true">\s*)'
        r'<svg[^>]*>.*?</svg>(\s*</div>\s*<span>ExtensionGuy</span>\s*</a>)',
        re.DOTALL
    )
    if old_header_mark.search(content):
        content = old_header_mark.sub(rf'\1{BRAND_MARK_SVG}\2', content, count=1)

    # Footer brand mark: remove 20px style and use canonical 32x32 BRAND_MARK_SVG
    old_footer_mark = re.compile(
        r'<div class="brand-mark" aria-hidden="true"[^>]*>\s*'
        r'<svg[^>]*>.*?</svg>\s*</div>',
        re.DOTALL
    )
    new_footer_mark = f'<div class="brand-mark" aria-hidden="true">\n          {BRAND_MARK_SVG}\n        </div>'
    # Look specifically inside .footer-note
    footer_note_pattern = re.compile(
        r'(<div class="footer-note">\s*<div[^>]*>\s*)'
        r'<div class="brand-mark" aria-hidden="true"[^>]*>\s*<svg[^>]*>.*?</svg>\s*</div>'
        r'(\s*<strong[^>]*>ExtensionGuy</strong>)',
        re.DOTALL
    )
    if footer_note_pattern.search(content):
        content = footer_note_pattern.sub(rf'\1{new_footer_mark}\2', content, count=1)

    return content

def migrate_privacy_page(content: str) -> str:
    # Favicons
    content = replace_favicons(content, "", is_pdf_tools=False)

    # Social images
    content = update_social_images(content)

    # Header brand lockup
    header_pattern = re.compile(
        r'(<div class="privacy-header-lockup"[^>]*>.*?<div class="brand-mark" aria-hidden="true")[^>]*>(\s*)'
        r'<svg[^>]*>.*?</svg>(\s*</div>)',
        re.DOTALL
    )
    header_style = ' style="width:32px;height:32px;border-radius:8px;background:none;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px #4f46e559;"'
    if header_pattern.search(content):
        content = header_pattern.sub(rf'\1{header_style}>\2{BRAND_MARK_SVG}\3', content, count=1)

    # Footer brand lockup
    footer_pattern = re.compile(
        r'(<footer class="privacy-footer"[^>]*>.*?<div class="brand-mark" aria-hidden="true")[^>]*>(\s*)'
        r'<svg[^>]*>.*?</svg>(\s*</div>)',
        re.DOTALL
    )
    footer_style = ' style="width:32px;height:32px;border-radius:8px;background:none;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px #4f46e559;"'
    if footer_pattern.search(content):
        content = footer_pattern.sub(rf'\1{footer_style}>\2{BRAND_MARK_SVG}\3', content, count=1)

    return content

def migrate_pdf_tools_styles():
    css_path = REPO_ROOT / "pdf-tools" / "styles.css"
    content = css_path.read_text(encoding="utf-8")

    # Ensure .brand-mark and .brand-parent-mark use 32x32, background: none, border-radius: 8px
    if ".brand-parent-mark" in content:
        content = re.sub(
            r'(\.brand-mark,\s*)?\.brand-parent-mark\s*\{[^}]*\}',
            ".brand-mark,\n.brand-parent-mark {\n  width: 32px;\n  height: 32px;\n  border-radius: 8px;\n  background: none;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  box-shadow: 0 2px 6px #4f46e559;\n}",
            content,
            count=1
        )
        css_path.write_text(content, encoding="utf-8")

def migrate_pdf_tools_page(content: str) -> str:
    # 1. Favicon links
    content = replace_favicons(content, "../", is_pdf_tools=True)

    # 2. Stylesheet version
    content = update_styles_version(content)

    # 3. Header parent brand mark
    header_pattern = re.compile(
        r'(<a href="/" class="brand-parent-link"[^>]*>\s*<div class="brand-parent-mark" aria-hidden="true"[^>]*>\s*)'
        r'<svg[^>]*>.*?</svg>(\s*</div>\s*<span>ExtensionGuy</span>\s*</a>)',
        re.DOTALL
    )
    if header_pattern.search(content):
        content = header_pattern.sub(rf'\1{BRAND_MARK_SVG}\2', content, count=1)

    # 4. Footer brand lockup: remove inline style 18px and use canonical BRAND_MARK_SVG
    footer_pattern = re.compile(
        r'(<div class="footer-brand-lockup">\s*<a href="/" class="footer-brand-link">\s*<div class="brand-parent-mark" aria-hidden="true")[^>]*>(\s*)'
        r'<svg[^>]*>.*?</svg>(\s*</div>\s*<span>ExtensionGuy</span>\s*</a>\s*</div>)',
        re.DOTALL
    )
    if footer_pattern.search(content):
        content = footer_pattern.sub(rf'\1>\2{BRAND_MARK_SVG}\3', content, count=1)

    return content

def main():
    apply_changes = "--apply" in sys.argv
    check_mode = "--check" in sys.argv or "--dry-run" in sys.argv or not apply_changes

    print("=" * 60)
    print("Site Branding Migration Pass (Variant 1 Puzzle Piece - Unified)")
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
            print(f"[CHANGE] {rel_path} requires brand/favicon migration")
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
            print(f"[CHANGE] 404.html requires brand/favicon migration")
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
            print(f"[CHANGE] privacy.html requires brand/favicon migration")
            if apply_changes:
                f_priv.write_text(migrated_priv, encoding="utf-8")
                print(f"  -> Applied changes to privacy.html")
        else:
            print(f"[CLEAN] privacy.html already conforms")

    # 4. pdf-tools/index.html
    f_pdf = REPO_ROOT / "pdf-tools" / "index.html"
    total_files += 1
    if f_pdf.exists():
        if apply_changes:
            migrate_pdf_tools_styles()
        content_pdf = f_pdf.read_text(encoding="utf-8")
        migrated_pdf = migrate_pdf_tools_page(content_pdf)
        if migrated_pdf != content_pdf:
            modified_files += 1
            print(f"[CHANGE] pdf-tools/index.html requires brand/favicon migration")
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
