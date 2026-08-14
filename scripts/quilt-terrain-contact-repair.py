from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest().upper()


def gradient_magnitude(image: np.ndarray) -> np.ndarray:
    gray = np.mean(image, axis=2)
    dx = np.zeros_like(gray)
    dy = np.zeros_like(gray)
    dx[:, 1:-1] = np.abs(gray[:, 2:] - gray[:, :-2]) * 0.5
    dy[1:-1, :] = np.abs(gray[2:, :] - gray[:-2, :]) * 0.5
    return dx + dy


def feature_protection(image: np.ndarray, radius: int) -> np.ndarray:
    """Dilate only the strongest local contours into a semantic no-cut field."""
    edge = gradient_magnitude(image)
    low = float(np.percentile(edge, 88.0))
    high = max(low + 1.0, float(np.percentile(edge, 99.0)))
    strong = np.clip((edge - low) / (high - low), 0.0, 1.0)
    if radius <= 0:
        return strong
    size = radius * 2 + 1
    protected = Image.fromarray(np.round(strong * 255).astype(np.uint8), "L").filter(
        ImageFilter.MaxFilter(size),
    )
    return np.asarray(protected, dtype=np.float32) / 255.0


def minimum_horizontal_cut(
    cost: np.ndarray,
    start: int,
    end: int,
    max_step: int,
    smoothness: float,
) -> np.ndarray:
    region = cost[start:end]
    height, width = region.shape
    if height <= 0:
        raise RuntimeError("Cut band is empty.")
    previous = region[:, 0].astype(np.float64)
    backtrack = np.zeros((width, height), dtype=np.int16)
    offsets = np.arange(-max_step, max_step + 1, dtype=np.int16)
    for x in range(1, width):
        current = np.full(height, np.inf, dtype=np.float64)
        for y in range(height):
            candidates = y + offsets
            valid = (candidates >= 0) & (candidates < height)
            candidate_rows = candidates[valid]
            candidate_costs = previous[candidate_rows] + (
                np.abs(candidate_rows - y) * smoothness
            )
            selected = int(np.argmin(candidate_costs))
            current[y] = region[y, x] + candidate_costs[selected]
            backtrack[x, y] = candidate_rows[selected]
        previous = current
    rows = np.empty(width, dtype=np.int32)
    rows[-1] = int(np.argmin(previous))
    for x in range(width - 1, 0, -1):
        rows[x - 1] = backtrack[x, rows[x]]
    return rows + start


def two_sided_channel_anchor(
    source: np.ndarray,
    generated: np.ndarray,
    anchor: int,
) -> np.ndarray:
    start_delta = np.median(
        source[:anchor] - generated[:anchor],
        axis=(0, 1),
    )
    end_delta = np.median(
        source[-anchor:] - generated[-anchor:],
        axis=(0, 1),
    )
    interpolation = np.linspace(0.0, 1.0, source.shape[0], dtype=np.float32)
    correction = (
        start_delta[None, None, :] * (1.0 - interpolation[:, None, None])
        + end_delta[None, None, :] * interpolation[:, None, None]
    )
    return np.clip(generated + correction, 0, 255)


def smooth_columns(values: np.ndarray, radius: int) -> np.ndarray:
    if radius <= 0:
        return values
    padded = np.pad(values, ((radius, radius), (0, 0)), mode="edge")
    cumulative = np.vstack(
        (
            np.zeros((1, values.shape[1]), dtype=np.float64),
            np.cumsum(padded, axis=0, dtype=np.float64),
        )
    )
    width = radius * 2 + 1
    return (cumulative[width:] - cumulative[:-width]) / float(width)


def locally_anchor_between_cuts(
    source: np.ndarray,
    generated: np.ndarray,
    entry: np.ndarray,
    leave: np.ndarray,
    radius: int,
    sample_radius: int,
) -> np.ndarray:
    """Match the inserted field to both semantic cuts without mixing imagery.

    The generated geometry remains intact. Only a smooth, per-column RGB
    correction is interpolated between the source color fields immediately
    outside the two cuts.
    """
    height, width, _ = source.shape
    columns = np.arange(width, dtype=np.int32)
    top_delta = np.zeros((width, 3), dtype=np.float64)
    bottom_delta = np.zeros((width, 3), dtype=np.float64)
    for offset in range(-sample_radius, sample_radius + 1):
        top_rows = np.clip(entry + offset, 0, height - 1)
        bottom_rows = np.clip(leave + offset, 0, height - 1)
        top_delta += source[top_rows, columns] - generated[top_rows, columns]
        bottom_delta += source[bottom_rows, columns] - generated[bottom_rows, columns]
    samples = float(sample_radius * 2 + 1)
    top_delta = smooth_columns(top_delta / samples, radius)
    bottom_delta = smooth_columns(bottom_delta / samples, radius)

    rows = np.arange(height, dtype=np.float64)[:, None]
    span = np.maximum(1.0, (leave - entry).astype(np.float64))[None, :]
    progress = np.clip((rows - entry[None, :]) / span, 0.0, 1.0)
    correction = (
        top_delta[None, :, :] * (1.0 - progress[:, :, None])
        + bottom_delta[None, :, :] * progress[:, :, None]
    )
    return np.clip(generated + correction, 0, 255)


def frequency_match_between_cuts(
    source: np.ndarray,
    generated: np.ndarray,
    entry: np.ndarray,
    leave: np.ndarray,
    radius: float,
    detail_gain: float,
    column_radius: int,
) -> np.ndarray:
    """Keep generated structure but replace its illumination/material field."""
    if radius <= 0:
        return generated
    source_low = np.asarray(
        Image.fromarray(np.round(source).astype(np.uint8), "RGB").filter(
            ImageFilter.GaussianBlur(radius),
        ),
        dtype=np.float32,
    )
    generated_low = np.asarray(
        Image.fromarray(np.round(generated).astype(np.uint8), "RGB").filter(
            ImageFilter.GaussianBlur(radius),
        ),
        dtype=np.float32,
    )
    height, width, _ = source.shape
    columns = np.arange(width, dtype=np.int32)
    top_low = smooth_columns(source_low[entry, columns], column_radius)
    bottom_low = smooth_columns(source_low[leave, columns], column_radius)
    rows = np.arange(height, dtype=np.float64)[:, None]
    span = np.maximum(1.0, (leave - entry).astype(np.float64))[None, :]
    progress = np.clip((rows - entry[None, :]) / span, 0.0, 1.0)
    target_low = (
        top_low[None, :, :] * (1.0 - progress[:, :, None])
        + bottom_low[None, :, :] * progress[:, :, None]
    )
    detail = generated - generated_low
    return np.clip(target_low + detail * detail_gain, 0, 255)


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Insert a generated terrain contact repair with minimum-error hard cuts "
            "instead of rectangular masks or alpha fades."
        ),
    )
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--contexts", type=Path, required=True)
    parser.add_argument("--context-id", required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--entry-band", nargs=2, type=int, required=True)
    parser.add_argument("--leave-band", nargs=2, type=int, required=True)
    parser.add_argument("--exit-band", nargs=2, type=int, required=True)
    parser.add_argument("--anchor", type=int, default=96)
    parser.add_argument("--max-step", type=int, default=2)
    parser.add_argument("--smoothness", type=float, default=4.0)
    parser.add_argument("--edge-penalty", type=float, default=0.35)
    parser.add_argument("--feature-penalty", type=float, default=0.0)
    parser.add_argument("--feature-radius", type=int, default=0)
    parser.add_argument("--boundary-anchor-radius", type=int, default=24)
    parser.add_argument("--boundary-sample-radius", type=int, default=3)
    parser.add_argument("--local-frequency-radius", type=float, default=0.0)
    parser.add_argument("--detail-gain", type=float, default=1.0)
    arguments = parser.parse_args()

    source_path = arguments.source.resolve()
    contexts_path = arguments.contexts.resolve()
    output_path = arguments.output.resolve()
    report_path = arguments.report.resolve()
    for path in (source_path, contexts_path, output_path, report_path):
        if path != ROOT and ROOT not in path.parents:
            raise RuntimeError(f"Path must remain inside the repository: {path}")

    manifest = json.loads((contexts_path / "manifest.json").read_text(encoding="utf-8"))
    matches = [record for record in manifest["contexts"] if record["id"] == arguments.context_id]
    if len(matches) != 1:
        raise RuntimeError("Context id must resolve to exactly one manifest record.")
    record = matches[0]
    generated_path = contexts_path / "generated" / f"{arguments.context_id}.png"
    if not generated_path.exists():
        raise RuntimeError(f"Generated context is missing: {generated_path}")

    with Image.open(source_path) as image:
        source_image = image.convert("RGBA")
    source_array = np.asarray(source_image).copy()
    left, top, right, bottom = record["sourceBox"]
    source_context = source_array[top:bottom, left:right, :3].astype(np.float32)
    with Image.open(generated_path) as image:
        generated = np.asarray(
            image.convert("RGB").resize(
                (right - left, bottom - top),
                Image.Resampling.LANCZOS,
            ),
            dtype=np.float32,
        )

    if record["contact"] == "east":
        source_oriented = np.transpose(source_context, (1, 0, 2))
        generated_oriented = np.transpose(generated, (1, 0, 2))
        alpha_oriented = np.transpose(source_array[top:bottom, left:right, 3], (1, 0))
    elif record["contact"] == "south":
        source_oriented = source_context
        generated_oriented = generated
        alpha_oriented = source_array[top:bottom, left:right, 3]
    else:
        raise RuntimeError(f"Unsupported contact orientation: {record['contact']}")

    anchor = max(1, min(arguments.anchor, source_oriented.shape[0] // 4))
    generated_oriented = two_sided_channel_anchor(
        source_oriented,
        generated_oriented,
        anchor,
    )
    difference = np.mean(
        np.abs(source_oriented - generated_oriented),
        axis=2,
    )
    cost = difference + arguments.edge_penalty * (
        gradient_magnitude(source_oriented) + gradient_magnitude(generated_oriented)
    )
    if arguments.feature_penalty > 0:
        cost += arguments.feature_penalty * (
            feature_protection(source_oriented, arguments.feature_radius)
            + feature_protection(generated_oriented, arguments.feature_radius)
        )
    entry = minimum_horizontal_cut(
        cost,
        arguments.entry_band[0],
        arguments.entry_band[1],
        arguments.max_step,
        arguments.smoothness,
    )
    leave = minimum_horizontal_cut(
        cost,
        arguments.leave_band[0],
        arguments.leave_band[1],
        arguments.max_step,
        arguments.smoothness,
    )
    if np.any(leave <= entry):
        raise RuntimeError("Leave cut must remain beyond the entry cut.")

    exit_cut = minimum_horizontal_cut(
        cost.T,
        arguments.exit_band[0],
        arguments.exit_band[1],
        arguments.max_step,
        arguments.smoothness,
    )
    generated_oriented = locally_anchor_between_cuts(
        source_oriented,
        generated_oriented,
        entry,
        leave,
        arguments.boundary_anchor_radius,
        arguments.boundary_sample_radius,
    )
    generated_oriented = frequency_match_between_cuts(
        source_oriented,
        generated_oriented,
        entry,
        leave,
        arguments.local_frequency_radius,
        arguments.detail_gain,
        arguments.boundary_anchor_radius,
    )
    across, along = cost.shape
    rows = np.arange(across, dtype=np.int32)[:, None]
    columns = np.arange(along, dtype=np.int32)[None, :]
    patch_mask = (
        (rows > entry[None, :])
        & (rows < leave[None, :])
        & (columns <= exit_cut[:, None])
        & (alpha_oriented > 0)
    )
    quilted = source_oriented.copy()
    quilted[patch_mask] = generated_oriented[patch_mask]

    if record["contact"] == "east":
        quilted = np.transpose(quilted, (1, 0, 2))
    output_array = source_array.copy()
    output_array[top:bottom, left:right, :3] = np.clip(
        np.round(quilted),
        0,
        255,
    ).astype(np.uint8)
    output = Image.fromarray(output_array, "RGBA")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temporary = output_path.with_suffix(".next.png")
    output.save(temporary, compress_level=6)
    os.replace(temporary, output_path)

    with Image.open(output_path) as check:
        alpha_preserved = np.array_equal(
            np.asarray(check.getchannel("A")),
            source_array[:, :, 3],
        )
    if not alpha_preserved:
        raise RuntimeError("Terrain alpha changed during quilt integration.")
    report = {
        "source": str(source_path.relative_to(ROOT)).replace("\\", "/"),
        "sourceSha256": sha256(source_path),
        "output": str(output_path.relative_to(ROOT)).replace("\\", "/"),
        "outputSha256": sha256(output_path),
        "generated": str(generated_path.relative_to(ROOT)).replace("\\", "/"),
        "generatedSha256": sha256(generated_path),
        "contextId": arguments.context_id,
        "contact": record["contact"],
        "sourceBox": record["sourceBox"],
        "entryBand": arguments.entry_band,
        "leaveBand": arguments.leave_band,
        "exitBand": arguments.exit_band,
        "boundaryAnchorRadius": arguments.boundary_anchor_radius,
        "boundarySampleRadius": arguments.boundary_sample_radius,
        "localFrequencyRadius": arguments.local_frequency_radius,
        "detailGain": arguments.detail_gain,
        "anchor": arguments.anchor,
        "edgePenalty": arguments.edge_penalty,
        "featurePenalty": arguments.feature_penalty,
        "featureRadius": arguments.feature_radius,
        "maxStep": arguments.max_step,
        "smoothness": arguments.smoothness,
        "maskMode": "minimum-error-hard-cut",
        "changedPixels": int(np.count_nonzero(patch_mask)),
        "alphaPreserved": alpha_preserved,
        "projectionChanged": False,
    }
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
