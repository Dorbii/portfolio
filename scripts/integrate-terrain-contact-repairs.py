from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = (
    ROOT
    / "art-source"
    / "career-world"
    / "ninjaone-environment"
    / "production-r2"
    / "ninjaone-environment-terrain-master-detail-r3.png"
)
DEFAULT_CONTEXTS = (
    ROOT
    / "art-source"
    / "career-world"
    / "ninjaone-environment"
    / "production-r2"
    / "seam-repair-r4"
    / "contexts"
)
DEFAULT_OUTPUT = (
    ROOT
    / "art-source"
    / "career-world"
    / "ninjaone-environment"
    / "production-r2"
    / "ninjaone-environment-terrain-master-detail-r4.png"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def smoothstep(values: np.ndarray) -> np.ndarray:
    clipped = np.clip(values, 0.0, 1.0)
    return clipped * clipped * (3.0 - 2.0 * clipped)


def center_weight(size: int, core: int, feather: int) -> np.ndarray:
    center = (size - 1) / 2.0
    distance = np.abs(np.arange(size, dtype=np.float32) - center)
    half_core = core / 2.0
    return 1.0 - smoothstep((distance - half_core) / float(feather))


def edge_weight(size: int, feather: int) -> np.ndarray:
    distance = np.minimum(
        np.arange(size, dtype=np.float32),
        np.arange(size - 1, -1, -1, dtype=np.float32),
    )
    return smoothstep(distance / float(feather))


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Composite generated contact repairs into a terrain cohort without moving its alpha.",
    )
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--contexts", type=Path, default=DEFAULT_CONTEXTS)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument(
        "--report",
        type=Path,
        help=(
            "Optional report path. The canonical default output writes beside the "
            "retained contexts; diagnostic outputs write beside themselves."
        ),
    )
    parser.add_argument("--core", type=int, default=96)
    parser.add_argument("--feather", type=int, default=96)
    parser.add_argument("--window-feather", type=int, default=96)
    parser.add_argument("--color-field-radius", type=int, default=48)
    parser.add_argument(
        "--mask-mode",
        choices=("centered-feather", "target-hard"),
        default="centered-feather",
        help=(
            "target-hard inserts only the manifest targetBox at full weight. "
            "Use it for edge-constrained forward outpainting."
        ),
    )
    parser.add_argument(
        "--color-field-method",
        choices=(
            "source-low-plus-generated-high",
            "generated-anchored",
            "generated-direct",
        ),
        default="source-low-plus-generated-high",
        help=(
            "Use source-low-plus-generated-high for detail-only repairs, or "
            "generated-anchored when the predecessor's low-frequency field contains "
            "the defect being repaired, or generated-direct for diagnostic use."
        ),
    )
    parser.add_argument(
        "--contact",
        choices=("east", "south"),
        action="append",
        help="Limit integration to one or more contact orientations.",
    )
    parser.add_argument(
        "--anchored-contact",
        choices=("east", "south"),
        action="append",
        help=(
            "Use generated-anchored for the selected contact while retaining the "
            "global color-field method for other contacts."
        ),
    )
    arguments = parser.parse_args()

    source_path = arguments.source.resolve()
    contexts_path = arguments.contexts.resolve()
    output_path = arguments.output.resolve()
    report_path = (
        arguments.report.resolve()
        if arguments.report
        else (
            contexts_path.parent / "integration-report.json"
            if output_path == DEFAULT_OUTPUT.resolve()
            else output_path.with_suffix(".integration-report.json")
        )
    )
    if ROOT not in output_path.parents:
        raise RuntimeError(f"Output must remain inside the repository: {output_path}")
    if ROOT not in report_path.parents:
        raise RuntimeError(f"Report must remain inside the repository: {report_path}")

    manifest = json.loads((contexts_path / "manifest.json").read_text(encoding="utf-8"))
    with Image.open(source_path) as image:
        source = image.convert("RGBA")
    source_array = np.asarray(source).astype(np.float32)
    output_rgb = source_array[:, :, :3].copy()
    applied: list[dict[str, object]] = []

    for record in manifest["contexts"]:
        if arguments.contact and record["contact"] not in arguments.contact:
            continue
        generated_path = contexts_path / "generated" / f"{record['id']}.png"
        if not generated_path.exists():
            continue
        left, top, right, bottom = record["sourceBox"]
        width = right - left
        height = bottom - top
        with Image.open(generated_path) as generated_image:
            generated = generated_image.convert("RGB").resize(
                (width, height),
                Image.Resampling.LANCZOS,
            )
        source_context = Image.fromarray(
            source_array[top:bottom, left:right, :3].astype(np.uint8),
            "RGB",
        )
        source_low = np.asarray(
            source_context.filter(ImageFilter.GaussianBlur(arguments.color_field_radius)),
            dtype=np.float32,
        )
        generated_array = np.asarray(generated).astype(np.float32)
        generated_low = np.asarray(
            generated.filter(ImageFilter.GaussianBlur(arguments.color_field_radius)),
            dtype=np.float32,
        )
        record_method = (
            "generated-anchored"
            if record["contact"] in (arguments.anchored_contact or ())
            else arguments.color_field_method
        )
        if record_method == "source-low-plus-generated-high":
            generated_array = np.clip(
                source_low + (generated_array - generated_low),
                0,
                255,
            )
        elif record_method == "generated-anchored":
            anchor = max(16, min(arguments.window_feather, width // 4, height // 4))
            if record["contact"] == "east":
                start_delta = np.median(
                    source_array[top:bottom, left:left + anchor, :3]
                    - generated_array[:, :anchor, :],
                    axis=(0, 1),
                )
                end_delta = np.median(
                    source_array[top:bottom, right - anchor:right, :3]
                    - generated_array[:, -anchor:, :],
                    axis=(0, 1),
                )
                interpolation = np.linspace(0.0, 1.0, width, dtype=np.float32)
                correction = (
                    start_delta[None, None, :] * (1.0 - interpolation[None, :, None])
                    + end_delta[None, None, :] * interpolation[None, :, None]
                )
            else:
                start_delta = np.median(
                    source_array[top:top + anchor, left:right, :3]
                    - generated_array[:anchor, :, :],
                    axis=(0, 1),
                )
                end_delta = np.median(
                    source_array[bottom - anchor:bottom, left:right, :3]
                    - generated_array[-anchor:, :, :],
                    axis=(0, 1),
                )
                interpolation = np.linspace(0.0, 1.0, height, dtype=np.float32)
                correction = (
                    start_delta[None, None, :] * (1.0 - interpolation[:, None, None])
                    + end_delta[None, None, :] * interpolation[:, None, None]
                )
            generated_array = np.clip(generated_array + correction, 0, 255)
        if arguments.mask_mode == "target-hard":
            if "targetBox" not in record:
                raise RuntimeError("target-hard requires targetBox in every context.")
            target_left, target_top, target_right, target_bottom = record["targetBox"]
            mask = np.zeros((height, width), dtype=np.float32)
            mask[target_top:target_bottom, target_left:target_right] = 1.0
        else:
            along_x = edge_weight(width, arguments.window_feather)
            along_y = edge_weight(height, arguments.window_feather)
            if record["contact"] == "east":
                across = center_weight(width, arguments.core, arguments.feather)
                mask = along_y[:, None] * across[None, :]
            else:
                across = center_weight(height, arguments.core, arguments.feather)
                mask = across[:, None] * along_x[None, :]
        local_alpha = source_array[top:bottom, left:right, 3] / 255.0
        mask *= local_alpha
        local = output_rgb[top:bottom, left:right]
        weight = mask[:, :, None]
        output_rgb[top:bottom, left:right] = (
            local * (1.0 - weight) + generated_array * weight
        )
        applied.append(
            {
                "id": record["id"],
                "generatedPath": str(generated_path.relative_to(ROOT)).replace("\\", "/"),
                "generatedSha256": sha256(generated_path),
                "sourceBox": record["sourceBox"],
                "colorFieldMethod": record_method,
            }
        )

    if not applied:
        raise RuntimeError("No generated contact repairs were registered in the manifest.")
    output_array = np.dstack((
        np.clip(np.round(output_rgb), 0, 255).astype(np.uint8),
        source_array[:, :, 3].astype(np.uint8),
    ))
    output = Image.fromarray(output_array, "RGBA")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temporary = output_path.with_suffix(".next.png")
    output.save(temporary, compress_level=6)
    os.replace(temporary, output_path)

    with Image.open(output_path) as check:
        alpha_equal = np.array_equal(
            np.asarray(check.getchannel("A")),
            source_array[:, :, 3].astype(np.uint8),
        )
    if not alpha_equal:
        raise RuntimeError("Terrain alpha changed during contact integration.")
    report = {
        "source": str(source_path.relative_to(ROOT)).replace("\\", "/"),
        "sourceSha256": sha256(source_path),
        "output": str(output_path.relative_to(ROOT)).replace("\\", "/"),
        "outputSha256": sha256(output_path),
        "dimensions": list(source.size),
        "alphaPreserved": alpha_equal,
        "projectionChanged": False,
        "core": arguments.core,
        "feather": arguments.feather,
        "windowFeather": arguments.window_feather,
        "colorFieldRadius": arguments.color_field_radius,
        "maskMode": arguments.mask_mode,
        "colorFieldMethod": (
            "mixed-by-contact"
            if arguments.anchored_contact
            else arguments.color_field_method
        ),
        "contactMethods": {
            contact: (
                "generated-anchored"
                if contact in (arguments.anchored_contact or ())
                else arguments.color_field_method
            )
            for contact in sorted(set(arguments.contact or ("east", "south")))
        },
        "contacts": sorted(set(arguments.contact or ("east", "south"))),
        "applied": applied,
    }
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
