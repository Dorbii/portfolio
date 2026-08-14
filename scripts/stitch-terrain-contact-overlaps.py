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
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def relative(path: Path) -> str:
    return str(path.relative_to(ROOT)).replace("\\", "/")


def gradient_magnitude(image: np.ndarray) -> np.ndarray:
    gray = np.mean(image, axis=2)
    dx = np.zeros_like(gray)
    dy = np.zeros_like(gray)
    dx[:, 1:-1] = np.abs(gray[:, 2:] - gray[:, :-2]) * 0.5
    dy[1:-1, :] = np.abs(gray[2:, :] - gray[:-2, :]) * 0.5
    return dx + dy


def feature_protection(image: np.ndarray, radius: int) -> np.ndarray:
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


def minimum_vertical_cut(
    cost: np.ndarray,
    max_step: int,
    smoothness: float,
) -> np.ndarray:
    """Return one overlap column per image row.

    The dynamic program penalizes visible pixel disagreement and high-frequency
    terrain structure, so the cut prefers grass and scree over trees or rocks.
    """
    transposed = cost.T
    height, width = transposed.shape
    previous = transposed[:, 0].astype(np.float64)
    backtrack = np.zeros((width, height), dtype=np.int16)
    offsets = np.arange(-max_step, max_step + 1, dtype=np.int16)
    for x in range(1, width):
        current = np.full(height, np.inf, dtype=np.float64)
        for y in range(height):
            candidates = y + offsets
            candidates = candidates[(candidates >= 0) & (candidates < height)]
            candidate_costs = previous[candidates] + (
                np.abs(candidates - y) * smoothness
            )
            selected = int(np.argmin(candidate_costs))
            current[y] = transposed[y, x] + candidate_costs[selected]
            backtrack[x, y] = candidates[selected]
        previous = current
    columns = np.empty(width, dtype=np.int32)
    columns[-1] = int(np.argmin(previous))
    for x in range(width - 1, 0, -1):
        columns[x - 1] = backtrack[x, columns[x]]
    return columns


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Stitch two full-size terrain repair candidates through a measured "
            "minimum-error overlap without feathering or changing alpha."
        ),
    )
    parser.add_argument("--left", type=Path, required=True)
    parser.add_argument("--right", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--overlap", nargs=2, type=int, required=True)
    parser.add_argument("--edge-penalty", type=float, default=12.0)
    parser.add_argument("--feature-penalty", type=float, default=0.0)
    parser.add_argument("--feature-radius", type=int, default=0)
    parser.add_argument("--max-step", type=int, default=2)
    parser.add_argument("--smoothness", type=float, default=8.0)
    arguments = parser.parse_args()

    left_path = arguments.left.resolve()
    right_path = arguments.right.resolve()
    output_path = arguments.output.resolve()
    report_path = arguments.report.resolve()
    for path in (left_path, right_path, output_path, report_path):
        if ROOT not in path.parents:
            raise RuntimeError("All inputs and outputs must remain inside the repository.")

    with Image.open(left_path) as image:
        left = np.asarray(image.convert("RGBA")).copy()
    with Image.open(right_path) as image:
        right = np.asarray(image.convert("RGBA")).copy()
    if left.shape != right.shape:
        raise RuntimeError("Terrain candidates have different dimensions.")
    if not np.array_equal(left[:, :, 3], right[:, :, 3]):
        raise RuntimeError("Terrain candidates do not share byte-identical alpha.")

    start, end = arguments.overlap
    if start < 0 or end > left.shape[1] or start >= end:
        raise RuntimeError("Invalid overlap columns.")
    left_overlap = left[:, start:end, :3].astype(np.float32)
    right_overlap = right[:, start:end, :3].astype(np.float32)
    difference = np.mean(np.abs(left_overlap - right_overlap), axis=2)
    cost = difference + arguments.edge_penalty * (
        gradient_magnitude(left_overlap) + gradient_magnitude(right_overlap)
    )
    if arguments.feature_penalty > 0:
        cost += arguments.feature_penalty * (
            feature_protection(left_overlap, arguments.feature_radius)
            + feature_protection(right_overlap, arguments.feature_radius)
        )
    seam = minimum_vertical_cut(
        cost,
        arguments.max_step,
        arguments.smoothness,
    ) + start

    output = left.copy()
    for row, column in enumerate(seam):
        output[row, column:] = right[row, column:]
    if not np.array_equal(output[:, :, 3], left[:, :, 3]):
        raise RuntimeError("Terrain alpha changed during overlap stitching.")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    temporary = output_path.with_suffix(".next.png")
    Image.fromarray(output, "RGBA").save(temporary, compress_level=6)
    os.replace(temporary, output_path)

    report = {
        "left": relative(left_path),
        "leftSha256": sha256(left_path),
        "right": relative(right_path),
        "rightSha256": sha256(right_path),
        "output": relative(output_path),
        "outputSha256": sha256(output_path),
        "overlap": [start, end],
        "edgePenalty": arguments.edge_penalty,
        "featurePenalty": arguments.feature_penalty,
        "featureRadius": arguments.feature_radius,
        "maxStep": arguments.max_step,
        "smoothness": arguments.smoothness,
        "seamColumnRange": [int(np.min(seam)), int(np.max(seam))],
        "alphaPreserved": True,
        "projectionChanged": False,
        "maskMode": "minimum-error-hard-cut",
    }
    report_path.parent.mkdir(parents=True, exist_ok=True)
    temporary_report = report_path.with_suffix(".next.json")
    temporary_report.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary_report, report_path)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
