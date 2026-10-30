#!/usr/bin/env python3
"""
scripts/update_og_images.py
Regenerates all 11 Open Graph / Twitter card PNGs under assets/og/
to embed the canonical Variant 1 (Classic Puzzle Piece) brand mark.

SAFETY GUARD:
  This script modifies existing production card PNGs in-place by reading,
  clearing specific pixel bounding boxes, and pasting the brand icon.
  Because in-place image mutation is destructive and irreversible without git,
  this script will refuse to run unless the '--force' flag is explicitly passed:
      python3 scripts/update_og_images.py --force
"""

import os
import sys
from pathlib import Path
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent
OG_DIR = REPO_ROOT / "assets/og"
EVIDENCE_DIR = REPO_ROOT / "reports/brand-logo-evidence"
EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)

# Load canonical 24x24 mark
V24_PATH = REPO_ROOT / "reports/logo-options/variant-01-classic-24px.png"
if not V24_PATH.exists():
    raise FileNotFoundError(f"Missing {V24_PATH}")

logo_mark = Image.open(V24_PATH).convert("RGBA")
BG_COLOR = (15, 23, 42) # Slate 900 #0f172a

GUIDE_CARDS = {
    "guide-docx-to-latex-offline-1200x630.png",
    "guide-word-tables-to-latex-1200x630.png"
}

def process_cards():
    og_files = sorted([f for f in os.listdir(OG_DIR) if f.endswith(".png")])
    print(f"Processing {len(og_files)} Open Graph cards...")

    for fname in og_files:
        card_path = OG_DIR / fname
        im = Image.open(card_path).convert("RGB")
        assert im.size == (1200, 630), f"Invalid dimensions for {fname}: {im.size}"

        if fname in GUIDE_CARDS:
            # 1. The two guide cards have 'ExtensionGuy' at x=80..254 without an icon.
            # Crop the wordmark from x=78..260, y=525..565
            wordmark_crop = im.crop((78, 525, 260, 565))
            # Clear region x=75..300, y=525..565 with BG_COLOR
            for y in range(525, 565):
                for x in range(75, 300):
                    im.putpixel((x, y), BG_COLOR)
            # Paste wordmark shifted to start at x=108
            im.paste(wordmark_crop, (108, 525))
            # Paste logo mark at x=74, y=532
            im.paste(logo_mark, (74, 532), logo_mark)
        else:
            # 2. Standard 9 cards have a cyan bullet at x=80..93.
            # Clear the bullet area (x=70..102, y=525..560)
            for y in range(525, 560):
                for x in range(70, 102):
                    im.putpixel((x, y), BG_COLOR)
            # Paste logo mark at x=74, y=532
            im.paste(logo_mark, (74, 532), logo_mark)

        im.save(card_path, "PNG", optimize=True)
        print(f"  [UPDATED] {fname} (1200x630 RGB)")

def create_contact_sheet():
    og_files = sorted([f for f in os.listdir(OG_DIR) if f.endswith(".png")])
    # Create 4 columns, 3 rows contact sheet
    # Scaled down to 300x157.5 each (margin 12px)
    thumb_w, thumb_h = 300, 158
    margin = 16
    cols = 3
    rows = 4 # for 11 cards
    sheet_w = cols * thumb_w + (cols + 1) * margin
    sheet_h = rows * thumb_h + (rows + 1) * margin

    sheet = Image.new("RGB", (sheet_w, sheet_h), (8, 12, 20))

    for idx, fname in enumerate(og_files):
        c = idx % cols
        r = idx // cols
        x = margin + c * (thumb_w + margin)
        y = margin + r * (thumb_h + margin)
        im = Image.open(OG_DIR / fname)
        thumb = im.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        sheet.paste(thumb, (x, y))

    sheet_out = EVIDENCE_DIR / "og-contact-sheet.png"
    sheet.save(sheet_out, "PNG", optimize=True)
    print(f"Contact sheet saved to {sheet_out}")

if __name__ == "__main__":
    if "--force" not in sys.argv:
        print("ERROR: scripts/update_og_images.py performs destructive in-place image modifications.")
        print("To proceed, you must pass the '--force' flag:")
        print("    python3 scripts/update_og_images.py --force")
        sys.exit(1)

    process_cards()
    create_contact_sheet()
