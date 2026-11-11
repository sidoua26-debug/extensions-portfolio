"""Stage the static website for Cloudflare Pages using Python's standard library."""

import fcntl
from pathlib import Path
import shutil
from tempfile import TemporaryDirectory


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "dist"
BACKUP = ROOT / ".pages-dist-backup"
LOCK = ROOT / ".pages-stage.lock"

PUBLIC_FILES = (
    "index.html",
    "404.html",
    "privacy.html",
    "favicon.ico",
    "robots.txt",
    "sitemap.xml",
    "_headers",
)
PUBLIC_DIRECTORIES = (
    "assets",
    "bilexi",
    "bulkgrab",
    "changelog",
    "demos",
    "guides",
    "pdf-tools",
    "seo-inspector",
    "tab-vault",
    "table-extractor",
    "word-to-latex",
    "word-to-latex-converter",
)
OPTIONAL_FILES = ("_redirects", ".well-known/security.txt")


def copy_public_file(name: str, destination: Path) -> None:
    source = ROOT / name
    if not source.is_file() or source.is_symlink() or source.resolve() != source:
        raise RuntimeError(f"Expected a regular public file: {name}")
    target = destination / name
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)


def stage_pages() -> None:
    if LOCK.is_symlink():
        raise RuntimeError("The staging lock must not be a symbolic link")
    with LOCK.open("a") as lock:
        # Serialize builds sharing this checkout, including output promotion.
        fcntl.flock(lock, fcntl.LOCK_EX)
        for directory in (OUTPUT, BACKUP):
            if directory.is_symlink() or (directory.exists() and not directory.is_dir()):
                raise RuntimeError(f"Expected a real build directory: {directory.name}")

        # Recover an interrupted promotion before preparing another build.
        if BACKUP.exists():
            if OUTPUT.exists():
                shutil.rmtree(BACKUP)
            else:
                BACKUP.rename(OUTPUT)

        with TemporaryDirectory(prefix=".pages-stage-", dir=ROOT) as temporary:
            staged = Path(temporary) / "dist"
            staged.mkdir()
            for name in PUBLIC_FILES:
                copy_public_file(name, staged)
            for name in OPTIONAL_FILES:
                if (ROOT / name).exists() or (ROOT / name).is_symlink():
                    copy_public_file(name, staged)
            for name in PUBLIC_DIRECTORIES:
                source = ROOT / name
                if not source.is_dir() or source.is_symlink():
                    raise RuntimeError(f"Expected a public directory: {name}")
                for entry in source.rglob("*"):
                    if entry.is_symlink():
                        raise RuntimeError(f"Symbolic link in public directory: {entry}")
                shutil.copytree(
                    source,
                    staged / name,
                    ignore=shutil.ignore_patterns(".*", "node_modules", "__pycache__"),
                )

            if OUTPUT.exists():
                OUTPUT.rename(BACKUP)
            try:
                staged.rename(OUTPUT)
            except OSError:
                if BACKUP.exists():
                    BACKUP.rename(OUTPUT)
                raise

        if BACKUP.exists():
            shutil.rmtree(BACKUP)


if __name__ == "__main__":
    stage_pages()
