"""Extract registered Kaizen semantic buildings from the accepted concept plate.

The accepted city artwork remains the visual source of truth.  This script cuts
the four semantic landmarks from that plate for interaction-only overlays and
keeps the intact plate as the visible scene. The separately authored close-LOD
plate is registration-checked here; it is never synthesized by enlarging the
site plate.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
import sys

from PIL import Image, ImageChops


sys.dont_write_bytecode = True

ROOT = Path(__file__).resolve().parents[1]
KAIZEN_TEXTURE_ROOT = (
    ROOT
    / "public"
    / "career-world"
    / "layers"
    / "structures"
    / "textures"
    / "ambient"
    / "kaizen-agent"
)
SEMANTIC_TEXTURE_ROOT = (
    ROOT
    / "public"
    / "career-world"
    / "layers"
    / "structures"
    / "textures"
    / "semantic"
    / "kaizen-agent"
)
SEMANTIC_MASK_ROOT = (
    ROOT
    / "scripts"
    / "assets"
    / "kaizen-semantic-masks"
)
MANIFEST_PATH = (
    ROOT
    / "public"
    / "career-world"
    / "layers"
    / "structures"
    / "manifests"
    / "kaizen-semantic-assets-r1.json"
)

CONCEPT_SOURCE = KAIZEN_TEXTURE_ROOT / "kaizen-city-foundation-integrated-r1.png"
HERO_FREE_SOURCE = KAIZEN_TEXTURE_ROOT / "kaizen-city-foundation-r1.png"
BASE_OUTPUT = KAIZEN_TEXTURE_ROOT / "kaizen-city-foundation-concept-base-r1.png"
CLOSE_OUTPUT = (
    KAIZEN_TEXTURE_ROOT / "kaizen-city-foundation-close-authored-r3.png"
)
RECONSTRUCTION_OUTPUT = ROOT / "tmp" / "kaizen-concept-semantic-reconstruction-r1.png"

CONCEPT_PUBLIC_ROOT = "/career-world/layers/structures/textures"
BASE_PUBLIC_PATH = (
    f"{CONCEPT_PUBLIC_ROOT}/ambient/kaizen-agent/"
    "kaizen-city-foundation-concept-base-r1.png"
)
CLOSE_PUBLIC_PATH = (
    f"{CONCEPT_PUBLIC_ROOT}/ambient/kaizen-agent/"
    "kaizen-city-foundation-close-authored-r3.png"
)
SEMANTIC_PUBLIC_ROOT = f"{CONCEPT_PUBLIC_ROOT}/semantic/kaizen-agent"
PLATE_ANCHOR = (0.3125, 0.308)
PLATE_SPAN = (0.1065, 0.1893)
PLATE_ALIGNMENT_Y = 0.91


@dataclass(frozen=True)
class SemanticCut:
    semantic_id: str
    role: str
    filename: str
    mask_filename: str


# These versioned masks are authored against the accepted 1,254px concept
# registration. Each contains the complete landmark and entrance stairs while
# excluding plaza, road, retaining-wall, lamp, foliage, and terrain pixels.
SEMANTIC_CUTS = (
    SemanticCut(
        semantic_id="project-kaizen-agent",
        role="project",
        filename="project-kaizen-agent-concept-r2.png",
        mask_filename="project-kaizen-agent-mask-r2.png",
    ),
    SemanticCut(
        semantic_id="data-contracts",
        role="skill",
        filename="data-contracts-concept-r2.png",
        mask_filename="data-contracts-mask-r2.png",
    ),
    SemanticCut(
        semantic_id="safe-writes",
        role="skill",
        filename="safe-writes-concept-r2.png",
        mask_filename="safe-writes-mask-r2.png",
    ),
    SemanticCut(
        semantic_id="protocol-gateway",
        role="skill",
        filename="protocol-gateway-concept-r2.png",
        mask_filename="protocol-gateway-mask-r2.png",
    ),
)


def _load_mask(size: tuple[int, int], filename: str) -> Image.Image:
    mask_path = SEMANTIC_MASK_ROOT / filename
    if not mask_path.exists():
        raise RuntimeError(f"Authored semantic mask is missing: {mask_path}")
    mask = Image.open(mask_path).convert("L")
    if mask.size != size:
        raise RuntimeError(
            f"Semantic mask {filename} changed registration: "
            f"expected {size}, got {mask.size}.",
        )
    if mask.getbbox() is None:
        raise RuntimeError(f"Semantic mask {filename} is empty.")
    return mask


def _crop_bounds(mask: Image.Image, padding: int = 4) -> tuple[int, int, int, int]:
    bounds = mask.getbbox()
    if bounds is None:
        raise RuntimeError("Semantic mask is empty.")
    left, top, right, bottom = bounds
    return (
        max(0, left - padding),
        max(0, top - padding),
        min(mask.width, right + padding),
        min(mask.height, bottom + padding),
    )


def _interaction_hull(
    alpha: Image.Image,
    threshold: int = 24,
) -> list[list[int]]:
    """Return a compact, asset-derived hit polygon in crop-local pixels."""
    pixels = alpha.load()
    points: set[tuple[int, int]] = set()
    for y in range(alpha.height):
        for x in range(alpha.width):
            if pixels[x, y] < threshold:
                continue
            points.update((
                (x, y),
                (x + 1, y),
                (x, y + 1),
                (x + 1, y + 1),
            ))
    if len(points) < 3:
        raise RuntimeError("Semantic alpha cannot produce an interaction hull.")

    ordered = sorted(points)

    def cross(
        origin: tuple[int, int],
        first: tuple[int, int],
        second: tuple[int, int],
    ) -> int:
        return (
            (first[0] - origin[0]) * (second[1] - origin[1])
            - (first[1] - origin[1]) * (second[0] - origin[0])
        )

    lower: list[tuple[int, int]] = []
    for point in ordered:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], point) <= 0:
            lower.pop()
        lower.append(point)

    upper: list[tuple[int, int]] = []
    for point in reversed(ordered):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], point) <= 0:
            upper.pop()
        upper.append(point)

    hull = lower[:-1] + upper[:-1]
    if len(hull) < 3:
        raise RuntimeError("Semantic alpha produced a degenerate interaction hull.")
    return [[x, y] for x, y in hull]


def _replace_core(
    base: Image.Image,
    hero_free: Image.Image,
    mask: Image.Image,
) -> None:
    replacement_mask = mask.point(lambda value: 255 if value >= 255 else 0)
    base.paste(hero_free, (0, 0), replacement_mask)


def main() -> None:
    concept = Image.open(CONCEPT_SOURCE).convert("RGBA")
    hero_free = Image.open(HERO_FREE_SOURCE).convert("RGBA")
    if concept.size != hero_free.size:
        raise RuntimeError("Kaizen concept and hero-free plates must share dimensions.")

    SEMANTIC_TEXTURE_ROOT.mkdir(parents=True, exist_ok=True)
    BASE_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    RECONSTRUCTION_OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    base = concept.copy()
    manifest_assets: list[dict[str, object]] = []
    rendered_cuts: list[tuple[Image.Image, tuple[int, int]]] = []

    for semantic_cut in SEMANTIC_CUTS:
        mask = _load_mask(concept.size, semantic_cut.mask_filename)
        bounds = _crop_bounds(mask)
        left, top, right, bottom = bounds
        cropped_concept = concept.crop(bounds)
        cropped_mask = mask.crop(bounds)
        cropped_alpha = ImageChops.multiply(cropped_concept.getchannel("A"), cropped_mask)
        cutout = cropped_concept.copy()
        cutout.putalpha(cropped_alpha)
        output_path = SEMANTIC_TEXTURE_ROOT / semantic_cut.filename
        cutout.save(output_path, optimize=True)

        _replace_core(base, hero_free, mask)
        rendered_cuts.append((cutout, (left, top)))
        manifest_assets.append({
            "id": semantic_cut.semantic_id,
            "role": semantic_cut.role,
            "assetPath": f"{SEMANTIC_PUBLIC_ROOT}/{semantic_cut.filename}",
            "cropOrigin": [left, top],
            "sourceDimensions": [right - left, bottom - top],
            "groundAnchor": [0.5, 1.0],
            "grounding": "asset-owned",
            "interactionHull": _interaction_hull(cropped_alpha),
        })

    base.save(BASE_OUTPUT, optimize=True)

    if not CLOSE_OUTPUT.exists():
        raise RuntimeError(
            "The authored close-LOD plate is missing; do not replace it with "
            "a resized site plate.",
        )
    close_plate = Image.open(CLOSE_OUTPUT).convert("RGBA")
    close_dimensions = close_plate.size
    if close_dimensions != concept.size:
        raise RuntimeError(
            "The authored close-LOD plate must preserve the site registration "
            f"grid: expected {concept.size}, got {close_dimensions}.",
        )
    concept_alpha = concept.getchannel("A").point(
        lambda value: 255 if value >= 8 else 0,
    )
    close_alpha = close_plate.getchannel("A").point(
        lambda value: 255 if value >= 8 else 0,
    )
    intersection = ImageChops.multiply(concept_alpha, close_alpha)
    union = ImageChops.lighter(concept_alpha, close_alpha)
    union_count = union.histogram()[255]
    alpha_iou = (
        intersection.histogram()[255] / union_count
        if union_count > 0
        else 1.0
    )
    if alpha_iou < 0.99:
        raise RuntimeError(
            "The authored close-LOD plate changed the registered silhouette: "
            f"alpha IoU {alpha_iou:.6f}.",
        )

    reconstructed = base.copy()
    for cutout, origin in rendered_cuts:
        reconstructed.alpha_composite(cutout, dest=origin)
    reconstructed.save(RECONSTRUCTION_OUTPUT, optimize=True)

    difference = ImageChops.difference(concept, reconstructed)
    if difference.getbbox() is not None:
        extrema = difference.getextrema()
        maximum_delta = max(channel_max for _, channel_max in extrema)
        if maximum_delta > 1:
            raise RuntimeError(
                "Concept reconstruction drifted from the accepted plate: "
                f"maximum channel delta {maximum_delta}."
            )

    manifest = {
        "schemaVersion": 1,
        "id": "career-world/kaizen-semantic-assets@r2",
        "sourcePlate": (
            f"{CONCEPT_PUBLIC_ROOT}/ambient/kaizen-agent/"
            "kaizen-city-foundation-integrated-r1.png"
        ),
        "basePlate": BASE_PUBLIC_PATH,
        "closePlate": CLOSE_PUBLIC_PATH,
        "ownerId": "project-kaizen-agent",
        "plateDimensions": list(concept.size),
        "closePlateDimensions": list(close_dimensions),
        "plateAnchor": list(PLATE_ANCHOR),
        "plateSpan": list(PLATE_SPAN),
        "plateAlignmentY": PLATE_ALIGNMENT_Y,
        "registration": "kaizen-city-foundation@r1",
        "assets": manifest_assets,
    }
    MANIFEST_PATH.write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"Wrote {BASE_OUTPUT.relative_to(ROOT)}")
    print(f"Verified {CLOSE_OUTPUT.relative_to(ROOT)}")
    for asset in manifest_assets:
        print(f"Wrote {asset['assetPath']}")
    print(f"Verified {RECONSTRUCTION_OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
