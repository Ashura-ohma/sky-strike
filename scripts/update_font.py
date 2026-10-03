"""Build the bundled UI font entirely offline from a local, full Noto font.

Usage:
    python3 scripts/update_font.py /path/to/NotoSansCJKsc-Regular.otf

Requires fontTools. This utility reads project copy locally and makes no network
requests. Supply the licensed full font yourself; the output keeps the existing
asset filename so offline APK paths and asset verification remain stable.
"""
from __future__ import annotations

import argparse
from pathlib import Path
import tempfile

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "android/app/src/main/assets"
OUTPUT = ASSETS / "vendor/noto-sc-subset.ttf"
EXTRA_SYMBOLS = "·×—•…→○★☆✓✦、。，：；"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("font_path", type=Path, help="Local full Noto CJK font (.otf/.ttf); never a URL")
    args = parser.parse_args()
    source = args.font_path.expanduser().resolve(strict=True)
    if not source.is_file() or source == OUTPUT.resolve():
        parser.error("Supply a local full font file, different from the generated subset")

    text = "".join(
        path.read_text(encoding="utf-8")
        for path in sorted(ASSETS.iterdir())
        if path.suffix in {".mjs", ".html", ".css"}
    )
    # Include printable ASCII, all UI symbols present in sources, and CJK text.
    requested = set(range(0x20, 0x7F)) | {ord(char) for char in text + EXTRA_SYMBOLS if ord(char) > 127}
    chinese = {code for code in requested if 0x3400 <= code <= 0x9FFF}
    with TTFont(source, recalcTimestamp=False) as font:
        source_cmap = font.getBestCmap() or {}
        missing_chinese = chinese - source_cmap.keys()
        if missing_chinese:
            raise ValueError("Source font misses required Chinese characters: " + "".join(map(chr, sorted(missing_chinese))))
        missing_symbols = requested - source_cmap.keys()
        supported = requested & source_cmap.keys()
        options = subset.Options()
        options.layout_features = ["*"]
        options.notdef_glyph = True
        options.notdef_outline = True
        options.recalc_timestamp = False
        subsetter = subset.Subsetter(options=options)
        subsetter.populate(unicodes=supported)
        subsetter.subset(font)
        font.flavor = None
        # Keep the historical .ttf path. CFF-based inputs remain OpenType OTTO,
        # explicitly advertised by the @font-face format('opentype') hint.
        with tempfile.NamedTemporaryFile(dir=OUTPUT.parent, suffix=".font", delete=False) as temporary:
            temp_path = Path(temporary.name)
        try:
            font.save(temp_path)
            with TTFont(temp_path) as check:
                cmap = check.getBestCmap() or {}
                if supported - cmap.keys():
                    raise ValueError("Generated subset lost requested glyphs")
            temp_path.replace(OUTPUT)
        finally:
            temp_path.unlink(missing_ok=True)

    print(f"Offline subset saved: {len(chinese)} Chinese characters, {len(supported)} code points, {OUTPUT.stat().st_size} bytes")
    if missing_symbols:
        print("Optional symbols rendered by system fallback: " + ", ".join(f"U+{code:04X}" for code in sorted(missing_symbols)))


if __name__ == "__main__":
    main()
