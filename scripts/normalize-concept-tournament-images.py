from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageChops, ImageOps


CANVAS = (1536, 1024)
BACKGROUND = (10, 12, 15)


def is_exact_rgb_grayscale(image: Image.Image) -> bool:
    if image.mode != "RGB" or image.size != CANVAS:
        return False
    red, green, blue = image.split()
    return ImageChops.difference(red, green).getbbox() is None and ImageChops.difference(red, blue).getbbox() is None


def normalize(path: Path) -> None:
    image = Image.open(path)
    if is_exact_rgb_grayscale(image):
        print(f"{path} already-normalized")
        return
    image = image.convert("RGB")
    image = ImageOps.grayscale(image).convert("RGB")
    if image.size != CANVAS:
        image.thumbnail(CANVAS, Image.Resampling.LANCZOS)
        canvas = Image.new("RGB", CANVAS, BACKGROUND)
        canvas.paste(
            image,
            ((CANVAS[0] - image.width) // 2, (CANVAS[1] - image.height) // 2),
        )
        image = canvas
    image.save(path, optimize=True, compress_level=9)
    print(f"{path} {image.width}x{image.height}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Normalize Career World tournament PNGs to exact grayscale on the standard canvas."
    )
    parser.add_argument("folders", nargs="+", type=Path)
    args = parser.parse_args()

    for folder in args.folders:
        if not folder.is_dir():
            raise SystemExit(f"not a directory: {folder}")
        for path in sorted(folder.glob("*.png")):
            normalize(path)


if __name__ == "__main__":
    main()
