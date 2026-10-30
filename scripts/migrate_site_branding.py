#!/usr/bin/env python3
"""
scripts/migrate_site_branding.py
Safely migrates all static HTML pages in the Extensions Portfolio to the
canonical Variant 1 (Classic Puzzle Piece) brand logo and updated favicon suite.

Supports:
  --dry-run / --check : validates and reports planned changes without writing.
  --apply             : applies modifications idempotently.
"""

import sys
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

CANONICAL_SVG_32 = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" fill="none">
            <rect width="32" height="32" rx="8" fill="#4f46e5"/>
            <path d="M 8 8 H 24 V 13.5 C 25.5 13.5 27 14.5 27 16 C 27 17.5 25.5 18.5 24 18.5 V 24 H 8 V 18.5 C 9.5 18.5 11 17.5 11 16 C 11 14.5 9.5 13.5 8 13.5 Z" fill="#ffffff"/>
          </svg>"""

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

def get_canonical_favicons(prefix: str) -> str:
    return f"""  <link rel="icon" type="image/svg+xml" href="{prefix}assets/icons/favicon.svg">
  <link rel="icon" type="image/png" sizes="32x32" href="{prefix}assets/icons/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="{prefix}assets/icons/favicon-16x16.png">
  <link rel="apple-touch-icon" sizes="180x180" href="{prefix}assets/icons/apple-touch-icon.png">
  <meta name="theme-color" content="#4f46e5">"""

def migrate_standard_page(content: str, rel_prefix: str, path_str: str) -> str:
    orig = content

    # 1. Favicon links
    old_favicon_pattern = re.compile(
        r'<link rel="icon" type="image/svg\+xml" href="[^"]*favicon\.svg">\s*'
        r'<link rel="icon" type="image/png"[^>]*>\s*'
        r'<link rel="apple-touch-icon"[^>]*>\s*'
        r'<meta name="theme-color" content="[^"]*">',
        re.DOTALL
    )
    new_favicons = get_canonical_favicons(rel_prefix).strip()
    if old_favicon_pattern.search(content):
        content = old_favicon_pattern.sub(new_favicons, content, count=1)

    # 2. Stylesheet version bump
    content = content.replace("styles.css?v=20261030-1", "styles.css?v=20261030-2")

    # 3. Header brand mark (replace 3D cube SVG with canonical 32x32 puzzle piece)
    cube_svg_pattern = re.compile(
        r'<div class="brand-mark" aria-hidden="true">\s*'
        r'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"[^>]*>.*?</svg>\s*'
        r'</div>',
        re.DOTALL
    )
    new_header_mark = f"""<div class="brand-mark" aria-hidden="true">\n          {CANONICAL_SVG_32}\n        </div>"""
    if cube_svg_pattern.search(content):
        content = cube_svg_pattern.sub(new_header_mark, content, count=1)

    # 4. Footer brand mark (replace 2D hexagon SVG with canonical 32x32 puzzle piece)
    hexagon_svg_pattern = re.compile(
        r'<div class="brand-mark" aria-hidden="true">\s*'
        r'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"[^>]*><path d="M21 16V8[^"]*"/></svg>\s*'
        r'</div>',
        re.DOTALL
    )
    new_footer_mark = f"""<div class="brand-mark" aria-hidden="true">\n            {CANONICAL_SVG_32}\n          </div>"""
    if hexagon_svg_pattern.search(content):
        content = hexagon_svg_pattern.sub(new_footer_mark, content, count=1)

    return content

def migrate_404_page(content: str) -> str:
    orig = content
    # Favicons
    old_fav = re.compile(
        r'<link rel="icon" type="image/svg\+xml" href="assets/icons/favicon\.svg">\s*'
        r'<link rel="icon" type="image/png" href="assets/icons/word-to-latex-128\.png">\s*'
        r'<link rel="apple-touch-icon" href="assets/icons/word-to-latex-128\.png">\s*'
        r'<meta name="theme-color" content="#0f172a">',
        re.DOTALL
    )
    content = old_fav.sub(get_canonical_favicons("").strip(), content, count=1)

    # Replace .brand-logo-img with .brand-mark puzzle SVG
    old_brand_img = (
        '<a href="index.html" class="brand-link">\n'
        '      <img src="assets/icons/word-to-latex-128.png" alt="ExtensionGuy Icon" class="brand-logo-img" width="32" height="32">\n'
        '      <span>ExtensionGuy</span>\n'
        '    </a>'
    )
    new_brand = (
        '<a href="index.html" class="brand-link">\n'
        '      <div class="brand-mark" aria-hidden="true">\n'
        '        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" fill="none">\n'
        '          <rect width="32" height="32" rx="8" fill="#4f46e5"/>\n'
        '          <path d="M 8 8 H 24 V 13.5 C 25.5 13.5 27 14.5 27 16 C 27 17.5 25.5 18.5 24 18.5 V 24 H 8 V 18.5 C 9.5 18.5 11 17.5 11 16 C 11 14.5 9.5 13.5 8 13.5 Z" fill="#ffffff"/>\n'
        '        </svg>\n'
        '      </div>\n'
        '      <span>ExtensionGuy</span>\n'
        '    </a>'
    )
    content = content.replace(old_brand_img, new_brand)

    # Add .brand-mark CSS if not present
    if ".brand-mark {" not in content:
        content = content.replace(
            ".brand-link {",
            ".brand-mark {\n"
            "      width: 32px;\n"
            "      height: 32px;\n"
            "      border-radius: 8px;\n"
            "      background: #4f46e5;\n"
            "      display: inline-flex;\n"
            "      align-items: center;\n"
            "      justify-content: center;\n"
            "      box-shadow: 0 2px 6px rgba(79, 70, 229, 0.35);\n"
            "      flex-shrink: 0;\n"
            "    }\n\n    .brand-link {"
        )

    # Footer brand mark
    old_footer = (
        '<div class="footer-note">\n'
        '      No telemetry &middot; Client-side &middot; <a href="/privacy">Privacy Policy</a>\n'
        '    </div>'
    )
    new_footer = (
        '<div class="footer-note">\n'
        '      <div style="display:inline-flex;align-items:center;gap:8px;margin-bottom:8px;">\n'
        '        <div class="brand-mark" aria-hidden="true" style="width:20px;height:20px;border-radius:5px;box-shadow:none;">\n'
        '          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="20" height="20" fill="none">\n'
        '            <rect width="32" height="32" rx="8" fill="#4f46e5"/>\n'
        '            <path d="M 8 8 H 24 V 13.5 C 25.5 13.5 27 14.5 27 16 C 27 17.5 25.5 18.5 24 18.5 V 24 H 8 V 18.5 C 9.5 18.5 11 17.5 11 16 C 11 14.5 9.5 13.5 8 13.5 Z" fill="#ffffff"/>\n'
        '          </svg>\n'
        '        </div>\n'
        '        <strong style="color:var(--text-main);">ExtensionGuy</strong>\n'
        '      </div>\n'
        '      <div>No telemetry &middot; Client-side &middot; <a href="/privacy">Privacy Policy</a></div>\n'
        '    </div>'
    )
    content = content.replace(old_footer, new_footer)

    return content

def migrate_privacy_page(content: str) -> str:
    orig = content
    # Favicons
    old_fav = re.compile(
        r'<link rel="icon" type="image/svg\+xml" href="assets/icons/favicon\.svg">\s*'
        r'<link rel="icon" type="image/png" href="assets/icons/word-to-latex-128\.png">\s*'
        r'<link rel="apple-touch-icon" href="assets/icons/word-to-latex-128\.png">\s*'
        r'<meta name="theme-color" content="#0f172a">',
        re.DOTALL
    )
    content = old_fav.sub(get_canonical_favicons("").strip(), content, count=1)

    # Header brand lockup
    old_back = '    <a href="/" class="nav-back">&larr; Back to Extensions Portfolio</a>'
    new_header_lockup = (
        '    <div class="privacy-header-lockup" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;margin-bottom:32px;">\n'
        '      <a href="/" class="brand" style="display:inline-flex;align-items:center;gap:10px;text-decoration:none;color:var(--text-main);font-weight:700;font-size:1.05rem;">\n'
        '        <div class="brand-mark" aria-hidden="true" style="width:32px;height:32px;border-radius:8px;background:#4f46e5;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(79,70,229,0.35);">\n'
        '          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" fill="none">\n'
        '            <rect width="32" height="32" rx="8" fill="#4f46e5"/>\n'
        '            <path d="M 8 8 H 24 V 13.5 C 25.5 13.5 27 14.5 27 16 C 27 17.5 25.5 18.5 24 18.5 V 24 H 8 V 18.5 C 9.5 18.5 11 17.5 11 16 C 11 14.5 9.5 13.5 8 13.5 Z" fill="#ffffff"/>\n'
        '          </svg>\n'
        '        </div>\n'
        '        <span>ExtensionGuy</span>\n'
        '      </a>\n'
        '      <a href="/" class="nav-back">&larr; Back to Extensions Portfolio</a>\n'
        '    </div>'
    )
    if old_back in content and 'class="privacy-header-lockup"' not in content:
        content = content.replace(old_back, new_header_lockup, 1)

    # Footer brand lockup before </main>
    old_close_main = '    </ul>\n  </main>'
    new_close_main = (
        '    </ul>\n\n'
        '    <footer class="privacy-footer" style="margin-top:48px;padding-top:24px;border-top:1px solid var(--border-page);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;font-size:0.875rem;color:var(--text-tertiary);">\n'
        '      <a href="/" class="brand" style="display:inline-flex;align-items:center;gap:10px;text-decoration:none;color:var(--text-main);font-weight:700;">\n'
        '        <div class="brand-mark" aria-hidden="true" style="width:28px;height:28px;border-radius:6px;background:#4f46e5;display:flex;align-items:center;justify-content:center;">\n'
        '          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="28" height="28" fill="none">\n'
        '            <rect width="32" height="32" rx="8" fill="#4f46e5"/>\n'
        '            <path d="M 8 8 H 24 V 13.5 C 25.5 13.5 27 14.5 27 16 C 27 17.5 25.5 18.5 24 18.5 V 24 H 8 V 18.5 C 9.5 18.5 11 17.5 11 16 C 11 14.5 9.5 13.5 8 13.5 Z" fill="#ffffff"/>\n'
        '          </svg>\n'
        '        </div>\n'
        '        <span>ExtensionGuy</span>\n'
        '      </a>\n'
        '      <span>&copy; 2026 ExtensionGuy &middot; Built local-first with no tracking.</span>\n'
        '    </footer>\n'
        '  </main>'
    )
    if old_close_main in content and 'class="privacy-footer"' not in content:
        content = content.replace(old_close_main, new_close_main, 1)

    return content

def migrate_pdf_tools_styles():
    css_path = REPO_ROOT / "pdf-tools" / "styles.css"
    content = css_path.read_text(encoding="utf-8")
    if ".brand-parent-link" not in content:
        addition = (
            "\n\n/* ExtensionGuy Parent Brand Attribution */\n"
            ".brand-parent-link {\n"
            "  display: inline-flex;\n"
            "  align-items: center;\n"
            "  gap: 8px;\n"
            "  text-decoration: none;\n"
            "  color: var(--text-secondary);\n"
            "  font-size: 0.875rem;\n"
            "  font-weight: 600;\n"
            "  transition: color 0.15s ease;\n"
            "}\n"
            ".brand-parent-link:hover {\n"
            "  color: var(--text-primary);\n"
            "}\n"
            ".brand-parent-mark {\n"
            "  width: 24px;\n"
            "  height: 24px;\n"
            "  border-radius: 6px;\n"
            "  background: #4f46e5;\n"
            "  display: inline-flex;\n"
            "  align-items: center;\n"
            "  justify-content: center;\n"
            "  box-shadow: 0 1px 3px rgba(79, 70, 229, 0.3);\n"
            "}\n"
            ".footer-brand-lockup {\n"
            "  display: flex;\n"
            "  align-items: center;\n"
            "  justify-content: center;\n"
            "  gap: 8px;\n"
            "  margin-bottom: 8px;\n"
            "}\n"
            ".footer-brand-link {\n"
            "  display: inline-flex;\n"
            "  align-items: center;\n"
            "  gap: 6px;\n"
            "  text-decoration: none;\n"
            "  color: inherit;\n"
            "  font-weight: 600;\n"
            "  font-size: 0.85rem;\n"
            "}\n"
        )
        css_path.write_text(content + addition, encoding="utf-8")
        print("Updated pdf-tools/styles.css with brand attribution rules.")

def migrate_pdf_tools_page(content: str) -> str:
    orig = content
    # 1. Favicon links
    old_fav = '<link rel="icon" href="data:," />'
    new_fav = get_canonical_favicons("../").strip()
    if old_fav in content:
        content = content.replace(old_fav, new_fav, 1)

    # 2. Header: Add parent brand link to .header-inner
    old_badge = '<div class="privacy-badge">'
    new_header_addition = (
        '<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">\n'
        '        <a href="/" class="brand-parent-link" title="ExtensionGuy Portfolio">\n'
        '          <div class="brand-parent-mark" aria-hidden="true">\n'
        '            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="24" height="24" fill="none">\n'
        '              <rect width="32" height="32" rx="8" fill="#4f46e5"/>\n'
        '              <path d="M 8 8 H 24 V 13.5 C 25.5 13.5 27 14.5 27 16 C 27 17.5 25.5 18.5 24 18.5 V 24 H 8 V 18.5 C 9.5 18.5 11 17.5 11 16 C 11 14.5 9.5 13.5 8 13.5 Z" fill="#ffffff"/>\n'
        '            </svg>\n'
        '          </div>\n'
        '          <span>ExtensionGuy</span>\n'
        '        </a>\n'
        '        <div class="privacy-badge">'
    )
    if old_badge in content and "brand-parent-link" not in content:
        content = content.replace(old_badge, new_header_addition, 1)
        # Close the wrapper div before </header>
        content = content.replace('</div>\n    </header>', '</div>\n      </div>\n    </header>', 1)

    # 3. Footer: Add footer brand lockup
    old_footer_inner = (
        '    <footer class="app-footer">\n'
        '      <p>\n'
        '        Offline PDF Studio · Fully Client-Side Architecture ·\n'
        '        <a href="./THIRD_PARTY_LICENSES.txt" target="_blank" rel="noopener">Third-Party Notices &amp; Licenses</a>\n'
        '      </p>\n'
        '    </footer>'
    )
    new_footer_inner = (
        '    <footer class="app-footer">\n'
        '      <div class="footer-brand-lockup">\n'
        '        <a href="/" class="footer-brand-link">\n'
        '          <div class="brand-parent-mark" aria-hidden="true" style="width:18px;height:18px;border-radius:4px;">\n'
        '            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="18" height="18" fill="none">\n'
        '              <rect width="32" height="32" rx="8" fill="#4f46e5"/>\n'
        '              <path d="M 8 8 H 24 V 13.5 C 25.5 13.5 27 14.5 27 16 C 27 17.5 25.5 18.5 24 18.5 V 24 H 8 V 18.5 C 9.5 18.5 11 17.5 11 16 C 11 14.5 9.5 13.5 8 13.5 Z" fill="#ffffff"/>\n'
        '            </svg>\n'
        '          </div>\n'
        '          <span>ExtensionGuy</span>\n'
        '        </a>\n'
        '      </div>\n'
        '      <p>\n'
        '        Offline PDF Studio · Fully Client-Side Architecture ·\n'
        '        <a href="./THIRD_PARTY_LICENSES.txt" target="_blank" rel="noopener">Third-Party Notices &amp; Licenses</a>\n'
        '      </p>\n'
        '    </footer>'
    )
    if old_footer_inner in content:
        content = content.replace(old_footer_inner, new_footer_inner, 1)

    return content

def main():
    apply_changes = "--apply" in sys.argv
    check_mode = "--check" in sys.argv or "--dry-run" in sys.argv or not apply_changes

    print("=" * 60)
    print("Site Branding Migration Pass (Variant 1 Puzzle Piece)")
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
