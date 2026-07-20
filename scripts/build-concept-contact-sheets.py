from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw


def build(folder: Path, output_dir: Path) -> Path:
    files = sorted(folder.glob("*.png"))
    if not files:
        raise ValueError(f"no PNG files in {folder}")
    width, height, caption = 480, 320, 44
    columns = 2
    rows = (len(files) + columns - 1) // columns
    sheet = Image.new("RGB", (width * columns, (height + caption) * rows), "#11151a")
    draw = ImageDraw.Draw(sheet)
    for index, path in enumerate(files):
        image = Image.open(path).convert("RGB")
        image.thumbnail((width, height))
        cell_x = (index % columns) * width
        cell_y = (index // columns) * (height + caption)
        x = cell_x + (width - image.width) // 2
        y = cell_y + (height - image.height) // 2
        sheet.paste(image, (x, y))
        draw.text((cell_x + 8, cell_y + height + 9), f"{index + 1:02d} {path.stem}", fill="white")
    output_dir.mkdir(parents=True, exist_ok=True)
    output = output_dir / f"{folder.name}-contact-sheet.png"
    sheet.save(output, optimize=True)
    print(output)
    return output


def main() -> None:
    parser = argparse.ArgumentParser(description="Build Career World tournament contact sheets.")
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("folders", nargs="+", type=Path)
    args = parser.parse_args()
    for folder in args.folders:
        build(folder, args.output_dir)


if __name__ == "__main__":
    main()
