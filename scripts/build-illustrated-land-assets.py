"""Build the illustrated Phase 3 land plate without a baked black coast matte."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
LAND_ROOT = ROOT / "public" / "career-world" / "layers" / "territory-landform"
SOURCE = LAND_ROOT / "sources" / "world-land-surface-authored-r8.png"
MASK_SOURCE = LAND_ROOT / "masks" / "world-land-plate-r6-mask.png"
CANONICAL_MASK_OUTPUT = LAND_ROOT / "masks" / "world-land-mask-r2.png"
BASE_OUTPUT = LAND_ROOT / "textures" / "world-land-plate-r10.png"
DETAIL_OUTPUT = LAND_ROOT / "textures" / "world-land-plate-r10-detail-4x.png"
MANIFEST_OUTPUT = LAND_ROOT / "manifests" / "world-land-plate-r10.json"

DETAIL_SCALE = 4
EDGE_DEPTH_PIXELS = 24
EDGE_NEIGHBORHOOD_RADIUS = 10.0
EDGE_LUMINANCE_CEILING = 0.30
EDGE_LUMINANCE_RANGE = 0.24
EDGE_REPAIR_STRENGTH = 0.96
MINIMUM_SHORE_COLOR = np.array([78.0, 74.0, 50.0], dtype=np.float32)
TRANSPARENT_COLOR_BLEED_PIXELS = 4


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def antialiased_alpha(mask: Image.Image) -> np.ndarray:
    land = np.asarray(mask, dtype=np.uint8) >= 128
    alpha = np.array(
        mask.filter(ImageFilter.GaussianBlur(0.72)),
        dtype=np.uint8,
    )
    alpha[land] = np.maximum(alpha[land], 128)
    alpha[~land] = np.minimum(alpha[~land], 127)
    return alpha


def edge_depth(land: np.ndarray) -> np.ndarray:
    depth = np.full(land.shape, EDGE_DEPTH_PIXELS + 1, dtype=np.float32)
    current = Image.fromarray((land * 255).astype(np.uint8), mode="L")
    for step in range(1, EDGE_DEPTH_PIXELS + 1):
        eroded = current.filter(ImageFilter.MinFilter(3))
        current_land = np.asarray(current, dtype=np.uint8) > 0
        eroded_land = np.asarray(eroded, dtype=np.uint8) > 0
        layer = current_land & ~eroded_land & (depth > EDGE_DEPTH_PIXELS)
        depth[layer] = step
        current = eroded
    return depth


def alpha_normalized_neighborhood(
    color: np.ndarray,
    land: np.ndarray,
) -> np.ndarray:
    premultiplied = Image.fromarray(
        np.uint8(np.round(color * land[..., np.newaxis])),
        mode="RGB",
    ).filter(ImageFilter.GaussianBlur(EDGE_NEIGHBORHOOD_RADIUS))
    weight = Image.fromarray(
        (land * 255).astype(np.uint8),
        mode="L",
    ).filter(ImageFilter.GaussianBlur(EDGE_NEIGHBORHOOD_RADIUS))
    weighted_color = np.asarray(premultiplied, dtype=np.float32)
    normalized_weight = np.maximum(
        np.asarray(weight, dtype=np.float32)[..., np.newaxis] / 255.0,
        0.02,
    )
    return np.clip(weighted_color / normalized_weight, 0.0, 255.0)


def remove_black_coast_matte(
    source: Image.Image,
    mask: Image.Image,
) -> Image.Image:
    color = np.asarray(source, dtype=np.float32)
    land = np.asarray(mask, dtype=np.uint8) >= 128
    depth = edge_depth(land)
    edge_weight = np.clip(
        (EDGE_DEPTH_PIXELS + 1.0 - depth) / EDGE_DEPTH_PIXELS,
        0.0,
        1.0,
    )
    luminance = (
        color[..., 0] * 0.2126
        + color[..., 1] * 0.7152
        + color[..., 2] * 0.0722
    ) / 255.0
    darkness = np.clip(
        (EDGE_LUMINANCE_CEILING - luminance) / EDGE_LUMINANCE_RANGE,
        0.0,
        1.0,
    )
    blend = (
        edge_weight
        * (0.78 + darkness * 0.22)
        * EDGE_REPAIR_STRENGTH
    )[..., np.newaxis]
    neighborhood = alpha_normalized_neighborhood(color, land)
    target = np.maximum(neighborhood, MINIMUM_SHORE_COLOR)
    repaired = color * (1.0 - blend) + target * blend
    alpha = antialiased_alpha(mask)
    bleed_size = TRANSPARENT_COLOR_BLEED_PIXELS * 2 + 1
    bleed = np.asarray(
        mask.filter(ImageFilter.MaxFilter(bleed_size)),
        dtype=np.uint8,
    ) > 0
    repaired[~bleed] = 0.0
    repaired[bleed & ~land] = target[bleed & ~land]
    rgba = np.dstack((
        np.uint8(np.clip(np.round(repaired), 0.0, 255.0)),
        alpha,
    ))
    return Image.fromarray(rgba, mode="RGBA")


def resize_premultiplied(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    rgba = np.asarray(image, dtype=np.float32) / 255.0
    alpha = rgba[..., 3]
    premultiplied = rgba[..., :3] * alpha[..., np.newaxis]
    resized_alpha = np.asarray(
        Image.fromarray(alpha, mode="F").resize(size, Image.Resampling.LANCZOS),
        dtype=np.float32,
    )
    resized_premultiplied = np.stack([
        np.asarray(
            Image.fromarray(premultiplied[..., channel], mode="F").resize(
                size,
                Image.Resampling.LANCZOS,
            ),
            dtype=np.float32,
        )
        for channel in range(3)
    ], axis=-1)
    safe_alpha = np.maximum(resized_alpha[..., np.newaxis], 1.0 / 255.0)
    resized_color = np.clip(resized_premultiplied / safe_alpha, 0.0, 1.0)
    resized_color[resized_alpha < (0.5 / 255.0)] = 0.0
    color_image = Image.fromarray(
        np.uint8(np.round(resized_color * 255.0)),
        mode="RGB",
    ).filter(ImageFilter.UnsharpMask(radius=1.6, percent=70, threshold=3))
    output = color_image.convert("RGBA")
    output.putalpha(Image.fromarray(
        np.uint8(np.clip(np.round(resized_alpha * 255.0), 0.0, 255.0)),
        mode="L",
    ))
    return output


def build() -> None:
    source = Image.open(SOURCE).convert("RGB")
    mask = Image.open(MASK_SOURCE).convert("L")
    if source.size != mask.size:
        raise RuntimeError("Illustrated land source and mask dimensions differ.")

    base = remove_black_coast_matte(source, mask)
    detail = resize_premultiplied(
        base,
        (base.width * DETAIL_SCALE, base.height * DETAIL_SCALE),
    )
    BASE_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    CANONICAL_MASK_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    mask.save(CANONICAL_MASK_OUTPUT, optimize=True)
    base.save(BASE_OUTPUT, optimize=True)
    detail.save(DETAIL_OUTPUT, optimize=True)

    manifest = {
        "schemaVersion": 1,
        "id": "career-world/world-land-plate@r10",
        "status": "phase-3-runtime",
        "projection": "orthographic-plan",
        "dimensions": list(base.size),
        "visual": {
            "path": f"../textures/{BASE_OUTPUT.name}",
            "sha256": sha256(BASE_OUTPUT),
            "mode": "RGBA",
        },
        "detailVisual": {
            "path": f"../textures/{DETAIL_OUTPUT.name}",
            "sha256": sha256(DETAIL_OUTPUT),
            "dimensions": list(detail.size),
            "mode": "RGBA",
            "role": "registered territory LOD; not a capital-detail substitute",
        },
        "mask": {
            "path": f"../masks/{CANONICAL_MASK_OUTPUT.name}",
            "sha256": sha256(CANONICAL_MASK_OUTPUT),
            "silhouettePreserved": True,
        },
        "derivation": {
            "source": f"../sources/{SOURCE.name}",
            "sourceSha256": sha256(SOURCE),
            "maskSource": f"../masks/{MASK_SOURCE.name}",
            "maskSourceSha256": sha256(MASK_SOURCE),
            "operation": (
                "replace the baked inner shore matte from an alpha-normalized "
                "local neighborhood, bleed land color into transparent border "
                "texels, and premultiply alpha for the deterministic 4x resize"
            ),
            "edgeDepthPixels": EDGE_DEPTH_PIXELS,
            "alphaPreserved": True,
        },
    }
    MANIFEST_OUTPUT.write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    build()
    print(f"built {BASE_OUTPUT.relative_to(ROOT)}")
    print(f"built {DETAIL_OUTPUT.relative_to(ROOT)}")
