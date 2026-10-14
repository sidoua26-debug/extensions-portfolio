#!/usr/bin/env python3
"""
Deterministic asset preparation script for Pandoc WASM in the extensions portfolio.
Compresses the verified pandoc.wasm binary into assets/wasm/pandoc.wasm.gz (mtime=0 for reproducibility)
and verifies byte-for-byte decompression integrity against the source binary.
"""

import gzip
import hashlib
import os
import sys

PORTFOLIO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEST_DIR = os.path.join(PORTFOLIO_ROOT, "assets/wasm")
DEST_GZ = os.path.join(DEST_DIR, "pandoc.wasm.gz")

# Source WASM location: check env var, then relative workspace sibling, then absolute fallback
SOURCE_WASM = os.environ.get(
    "PANDOC_WASM_SRC",
    os.path.join(PORTFOLIO_ROOT, "../word-to-latex-extension/dist/wasm/pandoc.wasm")
)
if not os.path.exists(SOURCE_WASM):
    fallback = "/home/sid/.gemini/antigravity/scratch/word-to-latex-extension/dist/wasm/pandoc.wasm"
    if os.path.exists(fallback):
        SOURCE_WASM = fallback


def sha256_of_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main():
    if not os.path.exists(SOURCE_WASM):
        print(f"Error: Source WASM not found at {SOURCE_WASM}", file=sys.stderr)
        sys.exit(1)

    os.makedirs(DEST_DIR, exist_ok=True)

    print(f"Reading source WASM: {SOURCE_WASM}")
    with open(SOURCE_WASM, "rb") as f:
        raw_bytes = f.read()

    raw_size = len(raw_bytes)
    raw_hash = sha256_of_bytes(raw_bytes)
    print(f"  Source size: {raw_size:,} bytes ({raw_size / (1024 * 1024):.2f} MiB)")
    print(f"  Source SHA-256: {raw_hash}")

    print(f"Compressing with gzip (level 9, deterministic mtime=0)...")
    # Using mtime=0 ensures deterministic, byte-identical output across runs
    with gzip.GzipFile(DEST_GZ, "wb", compresslevel=9, mtime=0) as f_out:
        f_out.write(raw_bytes)

    gz_size = os.path.getsize(DEST_GZ)
    with open(DEST_GZ, "rb") as f:
        gz_bytes = f.read()
    gz_hash = sha256_of_bytes(gz_bytes)

    print(f"  Compressed size: {gz_size:,} bytes ({gz_size / (1024 * 1024):.2f} MiB)")
    print(f"  Compressed SHA-256: {gz_hash}")
    compression_ratio = (1 - gz_size / raw_size) * 100
    print(f"  Compression savings: {compression_ratio:.1f}%")

    # Cloudflare Pages 25 MiB limit check
    cloudflare_limit = 25 * 1024 * 1024
    if gz_size > cloudflare_limit:
        print(f"ERROR: Compressed file ({gz_size} bytes) exceeds Cloudflare Pages limit ({cloudflare_limit} bytes)!", file=sys.stderr)
        sys.exit(1)
    else:
        print(f"  ✓ Pass: Compressed file is under Cloudflare Pages 25 MiB limit ({gz_size / cloudflare_limit * 100:.1f}% of limit)")

    # Decompression byte-for-byte verification
    print("Verifying byte-for-byte decompression...")
    decompressed_bytes = gzip.decompress(gz_bytes)
    decompressed_hash = sha256_of_bytes(decompressed_bytes)

    if decompressed_hash != raw_hash:
        print(f"ERROR: Decompressed hash mismatch! Expected {raw_hash}, got {decompressed_hash}", file=sys.stderr)
        sys.exit(1)

    if len(decompressed_bytes) != raw_size:
        print(f"ERROR: Decompressed size mismatch! Expected {raw_size}, got {len(decompressed_bytes)}", file=sys.stderr)
        sys.exit(1)

    print("  ✓ Pass: Byte-for-byte match verified! SHA-256 hashes are identical.")


if __name__ == "__main__":
    main()
