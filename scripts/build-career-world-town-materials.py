from pathlib import Path
import argparse

from PIL import Image


def build_periodic_tile(source_path: Path, output_path: Path) -> None:
    with Image.open(source_path) as source_image:
        source = source_image.convert("RGB")
        square_size = min(source.size)
        left = (source.width - square_size) // 2
        top = (source.height - square_size) // 2
        quarter = source.crop(
            (left, top, left + square_size, top + square_size),
        ).resize((512, 512), Image.Resampling.LANCZOS)

    top_half = Image.new("RGB", (1024, 512))
    top_half.paste(quarter, (0, 0))
    top_half.paste(
        quarter.transpose(Image.Transpose.FLIP_LEFT_RIGHT),
        (512, 0),
    )

    tile = Image.new("RGB", (1024, 1024))
    tile.paste(top_half, (0, 0))
    tile.paste(
        top_half.transpose(Image.Transpose.FLIP_TOP_BOTTOM),
        (0, 512),
    )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    tile.save(output_path, "WEBP", lossless=True, method=6)


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Build deterministic edge-matched Career World town material tiles."
        ),
    )
    parser.add_argument("--ground-source", required=True, type=Path)
    parser.add_argument("--road-source", required=True, type=Path)
    parser.add_argument("--output-directory", required=True, type=Path)
    args = parser.parse_args()

    build_periodic_tile(
        args.ground_source,
        args.output_directory / "town-ground-r1.webp",
    )
    build_periodic_tile(
        args.road_source,
        args.output_directory / "town-road-r1.webp",
    )


if __name__ == "__main__":
    main()
