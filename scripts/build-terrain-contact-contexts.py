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
    parser.add_argument(
        "--outpaint-mode",
        choices=("center-band", "forward-band"),
        default="center-band",
        help=(
            "center-band repairs both sides of a contact; forward-band preserves "
            "the source-side edge and generates only into the neighboring cell."
        ),
    )
    parser.add_argument(
        "--contact",
        choices=("east", "south"),
        action="append",
        help="Contact to extract. Repeat to select both; defaults to both.",
    )
    parser.add_argument(
        "--continuous-contact",
        choices=("east", "south"),
        action="append",
        help=(
            "Emit one complete rectangular context for the selected contact "
            "instead of overlapping square windows."
        ),
    )
    parser.add_argument(
        "--continuous-offset",
        type=int,
        default=0,
        help="Offset along a continuous contact before extracting its context.",
    )
    parser.add_argument(
        "--continuous-length",
        type=int,
        help=(
            "Optional length along a continuous contact. Defaults to the full "
            "contact after --continuous-offset."
        ),
    )
    arguments = parser.parse_args()

    source_path = arguments.source.resolve()
    output_path = arguments.output.resolve()
    if ROOT not in output_path.parents:
        raise RuntimeError(f"Output must remain inside the repository: {output_path}")
    if arguments.window <= 0 or arguments.overlap < 0:
        raise RuntimeError("Window must be positive and overlap cannot be negative.")
    if not 0 < arguments.outpaint_band <= arguments.window:
        raise RuntimeError("Outpaint band must be positive and no wider than the window.")
    if arguments.continuous_offset < 0:
        raise RuntimeError("Continuous contact offset cannot be negative.")
    if arguments.continuous_length is not None and arguments.continuous_length <= 0:
        raise RuntimeError("Continuous contact length must be positive when provided.")
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
    selected_contacts = set(arguments.contact or ("east", "south"))

    def continuous_span(contact_length: int) -> tuple[int, int]:
        start = arguments.continuous_offset
        if start >= contact_length:
            raise RuntimeError("Continuous contact offset is outside the contact.")
        length = arguments.continuous_length or (contact_length - start)
        end = start + length
        if end > contact_length:
            raise RuntimeError("Continuous contact span exceeds the contact length.")
        return start, end

    def write_context(name: str, box: tuple[int, int, int, int], contact: str) -> None:
        path = output_path / f"{name}.png"
        context = source.crop(box)
        context.save(path, compress_level=6)
        outpaint = context.copy()
        alpha = outpaint.getchannel("A")
        if contact == "east":
            center = context.width // 2
            if arguments.outpaint_mode == "forward-band":
                target_box = (center, 0, center + arguments.outpaint_band, context.height)
            else:
                half_band = arguments.outpaint_band // 2
                target_box = (
                    center - half_band,
                    0,
                    center + half_band,
                    context.height,
                )
        else:
            center = context.height // 2
            if arguments.outpaint_mode == "forward-band":
                target_box = (0, center, context.width, center + arguments.outpaint_band)
            else:
                half_band = arguments.outpaint_band // 2
                target_box = (
                    0,
                    center - half_band,
                    context.width,
                    center + half_band,
                )
        if target_box[2] > context.width or target_box[3] > context.height:
            raise RuntimeError("Outpaint target exceeds the extracted context.")
        alpha.paste(0, target_box)
        outpaint.putalpha(alpha)
        outpaint_path = output_path / f"{name}-outpaint.png"
        outpaint.save(outpaint_path, compress_level=6)
        records.append(
            {
                "id": name,
                "contact": contact,
                "sourceBox": list(box),
                "dimensions": [box[2] - box[0], box[3] - box[1]],
                "targetBox": list(target_box),
                "path": str(path.relative_to(ROOT)).replace("\\", "/"),
                "outpaintPath": str(outpaint_path.relative_to(ROOT)).replace("\\", "/"),
            }
        )

    if "east" in selected_contacts and column + 1 < arguments.columns:
        seam_x = (column + 1) * cell_width
        start_y = row * cell_height
        if "east" in (arguments.continuous_contact or ()):
            span_start, span_end = continuous_span(cell_height)
            write_context(
                "east-full",
                (
                    seam_x - arguments.window // 2,
                    start_y + span_start,
                    seam_x + arguments.window // 2,
                    start_y + span_end,
                ),
                "east",
            )
        else:
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

    if "south" in selected_contacts and row + 1 < arguments.rows:
        seam_y = (row + 1) * cell_height
        start_x = column * cell_width
        if "south" in (arguments.continuous_contact or ()):
            span_start, span_end = continuous_span(cell_width)
            write_context(
                "south-full",
                (
                    start_x + span_start,
                    seam_y - arguments.window // 2,
                    start_x + span_end,
                    seam_y + arguments.window // 2,
                ),
                "south",
            )
        else:
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
        "outpaintMode": arguments.outpaint_mode,
        "selectedContacts": sorted(selected_contacts),
        "continuousContacts": sorted(set(arguments.continuous_contact or ())),
        "continuousOffset": arguments.continuous_offset,
        "continuousLength": arguments.continuous_length,
        "projectionChanged": False,
        "contexts": records,
    }
    manifest_path = output_path / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
