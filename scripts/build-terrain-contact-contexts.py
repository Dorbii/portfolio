from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = (
    ROOT
    / "art-source"
    / "career-world"
    / "ninjaone-environment"
    / "production-r2"
    / "ninjaone-environment-terrain-master-detail-r3.png"
)
DEFAULT_OUTPUT = (
    ROOT
    / "art-source"
    / "career-world"
    / "ninjaone-environment"
    / "production-r2"
    / "seam-repair-r4"
    / "contexts"
)


def centered_starts(length: int, window: int, stride: int) -> list[int]:
    if window > length:
        raise RuntimeError("The contact window cannot exceed the contact length.")
    starts = list(range(0, max(1, length - window + 1), stride))
    final_start = length - window
    if not starts or starts[-1] != final_start:
        starts.append(final_start)
    return starts


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Extract projection-preserving windows across selected contacts in a "
            "regular terrain cohort."
        ),
    )
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--rows", type=int, default=2)
    parser.add_argument("--columns", type=int, default=2)
    parser.add_argument("--target-row", type=int, default=0)
    parser.add_argument("--target-column", type=int, default=0)
    parser.add_argument("--window", type=int, default=1024)
    parser.add_argument("--overlap", type=int, default=256)
    parser.add_argument("--outpaint-band", type=int, default=256)
    arguments = parser.parse_args()

    source_path = arguments.source.resolve()
    output_path = arguments.output.resolve()
    if ROOT not in output_path.parents:
        raise RuntimeError(f"Output must remain inside the repository: {output_path}")
    if arguments.window <= 0 or arguments.overlap < 0:
        raise RuntimeError("Window must be positive and overlap cannot be negative.")
    stride = arguments.window - arguments.overlap
    if stride <= 0:
        raise RuntimeError("Overlap must be smaller than the window.")

    with Image.open(source_path) as image:
        source = image.convert("RGBA")
    if source.width % arguments.columns or source.height % arguments.rows:
        raise RuntimeError("Source dimensions must divide evenly into the cohort layout.")

    cell_width = source.width // arguments.columns
    cell_height = source.height // arguments.rows
    column = arguments.target_column
    row = arguments.target_row
    if not 0 <= column < arguments.columns or not 0 <= row < arguments.rows:
        raise RuntimeError("Target cell is outside the cohort layout.")

    output_path.mkdir(parents=True, exist_ok=True)
    records: list[dict[str, object]] = []

    def write_context(name: str, box: tuple[int, int, int, int], contact: str) -> None:
        path = output_path / f"{name}.png"
        context = source.crop(box)
        context.save(path, compress_level=6)
        outpaint = context.copy()
        alpha = outpaint.getchannel("A")
        center = arguments.window // 2
        half_band = arguments.outpaint_band // 2
        if contact == "east":
            alpha.paste(0, (center - half_band, 0, center + half_band, arguments.window))
        else:
            alpha.paste(0, (0, center - half_band, arguments.window, center + half_band))
        outpaint.putalpha(alpha)
        outpaint_path = output_path / f"{name}-outpaint.png"
        outpaint.save(outpaint_path, compress_level=6)
        records.append(
            {
                "id": name,
                "contact": contact,
                "sourceBox": list(box),
                "dimensions": [box[2] - box[0], box[3] - box[1]],
                "path": str(path.relative_to(ROOT)).replace("\\", "/"),
                "outpaintPath": str(outpaint_path.relative_to(ROOT)).replace("\\", "/"),
            }
        )

    if column + 1 < arguments.columns:
        seam_x = (column + 1) * cell_width
        start_y = row * cell_height
        for index, offset in enumerate(
            centered_starts(cell_height, arguments.window, stride),
        ):
            top = start_y + offset
            box = (
                seam_x - arguments.window // 2,
                top,
                seam_x + arguments.window // 2,
                top + arguments.window,
            )
            write_context(f"east-{index:02d}", box, "east")

    if row + 1 < arguments.rows:
        seam_y = (row + 1) * cell_height
        start_x = column * cell_width
        for index, offset in enumerate(
            centered_starts(cell_width, arguments.window, stride),
        ):
            left = start_x + offset
            box = (
                left,
                seam_y - arguments.window // 2,
                left + arguments.window,
                seam_y + arguments.window // 2,
            )
            write_context(f"south-{index:02d}", box, "south")

    manifest = {
        "source": str(source_path.relative_to(ROOT)).replace("\\", "/"),
        "cohortLayout": [arguments.columns, arguments.rows],
        "targetCell": [column, row],
        "targetDimensions": [cell_width, cell_height],
        "window": arguments.window,
        "overlap": arguments.overlap,
        "outpaintBand": arguments.outpaint_band,
        "projectionChanged": False,
        "contexts": records,
    }
    manifest_path = output_path / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
