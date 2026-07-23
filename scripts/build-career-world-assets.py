"""Build the clean Phase 3 coast field and baked land plate."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import sys

import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent / "lib"))
from world_mask_fields import distance_from_feature, exterior_falloff  # noqa: E402


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public" / "career-world" / "layers"
LAND_ROOT = PUBLIC / "territory-landform"
WATER_ROOT = PUBLIC / "water-surface"
LAND_SOURCE = LAND_ROOT / "textures" / "world-land-plate-r6.png"
LAND_OUTPUT = LAND_ROOT / "textures" / "world-land-plate-r7.png"
LAND_DETAIL_OUTPUT = (
    LAND_ROOT / "textures" / "world-land-plate-r7-detail-4x.png"
)
LAND_MASK = LAND_ROOT / "masks" / "world-land-plate-r6-mask.png"
LAND_MANIFEST = LAND_ROOT / "manifests" / "world-land-plate-r7.json"
COAST_OUTPUT = WATER_ROOT / "fields" / "coast-geometry-r1.png"
COAST_DETAIL_OUTPUT = WATER_ROOT / "fields" / "coast-geometry-r1-4x.png"
COAST_MANIFEST = WATER_ROOT / "manifests" / "coast-geometry-r1.json"
WATER_WORLD_SOURCE = (
    WATER_ROOT
    / "textures"
    / "water-surface-world-lod-r1-3840x2160.png"
)
WATER_WORLD_OUTPUT = (
    WATER_ROOT
    / "textures"
    / "water-surface-world-lod-r2-3840x2160.png"
)
WATER_WORLD_MANIFEST = (
    WATER_ROOT / "manifests" / "water-surface-world-lod-r2.json"
)

SHELF_WIDTH_PIXELS = 42.0
CONTACT_WIDTH_PIXELS = 2.8
LAND_EDGE_WIDTH_PIXELS = 3.5
LAND_EDGE_COLOR = np.array([25.0, 42.0, 40.0], dtype=np.float32)
LAND_EDGE_MAX_MIX = 0.17
DETAIL_SCALE = 4
WATER_SEAM_HALF_WIDTH = 116
WATER_SEAM_SAMPLE_OFFSET = 148


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def coast_geometry_array(
    mask: Image.Image,
    *,
    scale: float = 1.0,
) -> np.ndarray:
    mask_array = np.asarray(mask.convert("L"), dtype=np.uint8)
    land = np.where(mask_array >= 128, 255, 0).astype(np.uint8)
    binary = Image.fromarray(land, mode="L")
    distance = distance_from_feature(binary)
    shelf = np.round(
        exterior_falloff(
            binary,
            SHELF_WIDTH_PIXELS * scale,
            distance=distance,
        ) * 255.0,
    ).astype(np.uint8)
    contact = np.round(
        exterior_falloff(
            binary,
            CONTACT_WIDTH_PIXELS * scale,
            distance=distance,
        ) * 255.0,
    ).astype(np.uint8)
    reserved = np.full_like(land, 255)
    return np.stack((land, shelf, contact, reserved), axis=-1)


def build_coast_geometry(mask: Image.Image) -> None:
    packed = coast_geometry_array(mask)
    COAST_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(packed, mode="RGBA").save(
        COAST_OUTPUT,
        format="PNG",
        optimize=True,
        compress_level=9,
    )
    detail_mask = mask.resize(
        (
            mask.width * DETAIL_SCALE,
            mask.height * DETAIL_SCALE,
        ),
        Image.Resampling.NEAREST,
    )
    detail_packed = coast_geometry_array(
        detail_mask,
        scale=DETAIL_SCALE,
    )
    Image.fromarray(detail_packed, mode="RGBA").save(
        COAST_DETAIL_OUTPUT,
        format="PNG",
        optimize=True,
        compress_level=9,
    )
    write_json(COAST_MANIFEST, {
        "schemaVersion": 1,
        "id": "career-world/coast-geometry@r1",
        "status": "phase-3-runtime",
        "coordinateSpace": "normalized-world-top-left",
        "dimensions": [mask.width, mask.height],
        "texture": {
            "path": "../fields/coast-geometry-r1.png",
            "sha256": sha256(COAST_OUTPUT),
            "mode": "RGBA",
        },
        "detailTexture": {
            "path": "../fields/coast-geometry-r1-4x.png",
            "sha256": sha256(COAST_DETAIL_OUTPUT),
            "dimensions": [
                mask.width * DETAIL_SCALE,
                mask.height * DETAIL_SCALE,
            ],
            "mode": "RGBA",
        },
        "channels": {
            "r": "binary land occupancy",
            "g": f"continuous {SHELF_WIDTH_PIXELS:g}px exterior shelf falloff",
            "b": f"continuous {CONTACT_WIDTH_PIXELS:g}px exterior contact falloff",
            "a": "reserved",
        },
        "source": {
            "path": "../../territory-landform/masks/world-land-plate-r6-mask.png",
            "sha256": sha256(LAND_MASK),
        },
        "policy": [
            "The land mask owns geography.",
            "Every shoreline uses this same deterministic derivation.",
            "The runtime derives shore normals from the shelf gradient.",
            "Sparse authored crash accents belong to actors-effects in Phase 7.",
        ],
    })


def resize_rgba_premultiplied(
    source: Image.Image,
    size: tuple[int, int],
) -> Image.Image:
    """Resize transparent art without pulling black RGB into the silhouette."""

    rgba = np.asarray(source.convert("RGBA"), dtype=np.float32)
    alpha = rgba[..., 3] / 255.0
    premultiplied = rgba[..., :3] * alpha[..., np.newaxis]
    resized_channels = [
        np.asarray(
            Image.fromarray(channel, mode="F").resize(
                size,
                Image.Resampling.LANCZOS,
            ),
            dtype=np.float32,
        )
        for channel in (
            premultiplied[..., 0],
            premultiplied[..., 1],
            premultiplied[..., 2],
            rgba[..., 3],
        )
    ]
    resized = np.stack(resized_channels, axis=-1)
    resized_alpha = np.clip(resized[..., 3], 0.0, 255.0)
    alpha_fraction = resized_alpha / 255.0
    visible = alpha_fraction > (1.0 / 255.0)
    color = np.zeros_like(resized[..., :3])
    color[visible] = (
        resized[..., :3][visible]
        / alpha_fraction[visible, np.newaxis]
    )
    output = np.concatenate(
        (
            np.clip(color, 0.0, 255.0),
            resized_alpha[..., np.newaxis],
        ),
        axis=-1,
    )
    return Image.fromarray(np.round(output).astype(np.uint8), mode="RGBA")


def build_land_plate(mask: Image.Image) -> None:
    source = np.asarray(Image.open(LAND_SOURCE).convert("RGBA"), dtype=np.uint8)
    alpha = source[..., 3].copy()
    visible_land = alpha >= 8
    water_feature = Image.fromarray(
        np.where(visible_land, 0, 255).astype(np.uint8),
        mode="L",
    )
    distance_to_water = distance_from_feature(water_feature)
    normalized = np.clip(
        1.0 - distance_to_water / LAND_EDGE_WIDTH_PIXELS,
        0.0,
        1.0,
    )
    smooth = normalized * normalized * (3.0 - 2.0 * normalized)
    edge_mix = np.where(
        visible_land,
        smooth * LAND_EDGE_MAX_MIX,
        0.0,
    )[..., np.newaxis]
    output = source.copy()
    output[..., :3] = np.round(
        source[..., :3].astype(np.float32) * (1.0 - edge_mix)
        + LAND_EDGE_COLOR * edge_mix,
    ).astype(np.uint8)
    output[..., 3] = alpha
    LAND_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(output, mode="RGBA").save(
        LAND_OUTPUT,
        format="PNG",
        optimize=True,
        compress_level=9,
    )

    if not np.array_equal(
        np.asarray(Image.open(LAND_OUTPUT).convert("RGBA"))[..., 3],
        alpha,
    ):
        raise RuntimeError("Baked land output changed the accepted alpha channel.")

    detail = resize_rgba_premultiplied(
        Image.open(LAND_OUTPUT).convert("RGBA"),
        (
            mask.width * DETAIL_SCALE,
            mask.height * DETAIL_SCALE,
        ),
    )
    detail.save(
        LAND_DETAIL_OUTPUT,
        format="PNG",
        optimize=True,
        compress_level=9,
    )

    write_json(LAND_MANIFEST, {
        "schemaVersion": 1,
        "id": "career-world/world-land-plate@r7",
        "status": "phase-3-runtime",
        "projection": "orthographic-plan",
        "dimensions": [mask.width, mask.height],
        "visual": {
            "path": "../textures/world-land-plate-r7.png",
            "sha256": sha256(LAND_OUTPUT),
            "mode": "RGBA",
        },
        "detailVisual": {
            "path": "../textures/world-land-plate-r7-detail-4x.png",
            "sha256": sha256(LAND_DETAIL_OUTPUT),
            "dimensions": [
                mask.width * DETAIL_SCALE,
                mask.height * DETAIL_SCALE,
            ],
            "mode": "RGBA",
            "role": "registered territory LOD; not a capital-detail substitute",
        },
        "mask": {
            "path": "../masks/world-land-plate-r6-mask.png",
            "sha256": sha256(LAND_MASK),
            "unchangedFrom": "career-world/world-land-plate@r6",
        },
        "derivation": {
            "source": "world-land-plate-r6.png",
            "sourceSha256": sha256(LAND_SOURCE),
            "operation": (
                "bake a restrained inner contact value into RGB, preserve "
                "alpha, and premultiply alpha while resampling the territory LOD"
            ),
            "alphaPreserved": True,
            "worldLightDirection": [-0.42, -0.36, 0.83],
        },
    })


def build_water_world_albedo() -> None:
    """Remove the authored center stitch from the low-frequency albedo only."""

    source_image = Image.open(WATER_WORLD_SOURCE).convert("RGB")
    source = np.asarray(source_image, dtype=np.float32)
    low_frequency = np.asarray(
        source_image.filter(ImageFilter.GaussianBlur(radius=24.0)),
        dtype=np.float32,
    )
    center = source_image.width // 2
    start = center - WATER_SEAM_HALF_WIDTH
    end = center + WATER_SEAM_HALF_WIDTH
    left_sample = low_frequency[
        :,
        center - WATER_SEAM_SAMPLE_OFFSET,
        :,
    ]
    right_sample = low_frequency[
        :,
        center + WATER_SEAM_SAMPLE_OFFSET,
        :,
    ]
    width = end - start
    t = np.linspace(0.0, 1.0, width, dtype=np.float32)
    t = t * t * (3.0 - 2.0 * t)
    target = (
        left_sample[:, np.newaxis, :] * (1.0 - t[np.newaxis, :, np.newaxis])
        + right_sample[:, np.newaxis, :] * t[np.newaxis, :, np.newaxis]
    )
    correction = target - low_frequency[:, start:end, :]
    edge_fade = np.sin(np.linspace(0.0, np.pi, width, dtype=np.float32))
    output = source.copy()
    output[:, start:end, :] = np.clip(
        source[:, start:end, :]
        + correction * edge_fade[np.newaxis, :, np.newaxis],
        0.0,
        255.0,
    )
    Image.fromarray(np.round(output).astype(np.uint8), mode="RGB").save(
        WATER_WORLD_OUTPUT,
        format="PNG",
        optimize=True,
        compress_level=9,
    )
    write_json(WATER_WORLD_MANIFEST, {
        "schemaVersion": 1,
        "id": "career-world/water-surface-world-lod@r2",
        "status": "phase-3-runtime",
        "coordinateSpace": "normalized-world-top-left",
        "dimensions": [source_image.width, source_image.height],
        "texture": {
            "path": "../textures/water-surface-world-lod-r2-3840x2160.png",
            "sha256": sha256(WATER_WORLD_OUTPUT),
            "mode": "RGB",
        },
        "derivation": {
            "source": "water-surface-world-lod-r1-3840x2160.png",
            "sourceSha256": sha256(WATER_WORLD_SOURCE),
            "operation": (
                "replace only center-band low-frequency discontinuity while "
                "preserving authored high-frequency linework"
            ),
            "centerX": center,
            "halfWidth": WATER_SEAM_HALF_WIDTH,
        },
    })


def verify() -> None:
    required = [
        LAND_SOURCE,
        LAND_OUTPUT,
        LAND_DETAIL_OUTPUT,
        LAND_MASK,
        LAND_MANIFEST,
        COAST_OUTPUT,
        COAST_DETAIL_OUTPUT,
        COAST_MANIFEST,
        WATER_WORLD_SOURCE,
        WATER_WORLD_OUTPUT,
        WATER_WORLD_MANIFEST,
    ]
    missing = [str(path.relative_to(ROOT)) for path in required if not path.exists()]
    if missing:
        raise RuntimeError(f"Missing generated assets: {', '.join(missing)}")

    land = Image.open(LAND_OUTPUT).convert("RGBA")
    source = Image.open(LAND_SOURCE).convert("RGBA")
    coast = Image.open(COAST_OUTPUT).convert("RGBA")
    coast_detail = Image.open(COAST_DETAIL_OUTPUT).convert("RGBA")
    mask = Image.open(LAND_MASK).convert("L")
    if land.size != source.size or land.size != coast.size or land.size != mask.size:
        raise RuntimeError("Land, mask, and coast assets do not share dimensions.")
    if coast_detail.size != (
        mask.width * DETAIL_SCALE,
        mask.height * DETAIL_SCALE,
    ):
        raise RuntimeError("Detail coast field does not match the 4x world plane.")
    if land.getchannel("A").tobytes() != source.getchannel("A").tobytes():
        raise RuntimeError("Generated land alpha differs from accepted r6 alpha.")

    land_manifest = json.loads(LAND_MANIFEST.read_text(encoding="utf-8"))
    coast_manifest = json.loads(COAST_MANIFEST.read_text(encoding="utf-8"))
    water_manifest = json.loads(
        WATER_WORLD_MANIFEST.read_text(encoding="utf-8"),
    )
    if land_manifest["visual"]["sha256"] != sha256(LAND_OUTPUT):
        raise RuntimeError("Land manifest hash does not match the generated plate.")
    if coast_manifest["texture"]["sha256"] != sha256(COAST_OUTPUT):
        raise RuntimeError("Coast manifest hash does not match the generated field.")
    if coast_manifest["detailTexture"]["sha256"] != sha256(COAST_DETAIL_OUTPUT):
        raise RuntimeError("Detail coast manifest hash does not match its field.")
    if water_manifest["texture"]["sha256"] != sha256(WATER_WORLD_OUTPUT):
        raise RuntimeError("Water manifest hash does not match repaired albedo.")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--check",
        action="store_true",
        help="Verify existing outputs without regenerating them.",
    )
    args = parser.parse_args()
    if not args.check:
        mask = Image.open(LAND_MASK).convert("L")
        build_coast_geometry(mask)
        build_land_plate(mask)
        build_water_world_albedo()
    verify()
    print(f"verified {LAND_OUTPUT.relative_to(ROOT)}")
    print(f"verified {COAST_OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
