"""Build the clean Phase 3 coast field and baked land plate."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent / "lib"))
from world_mask_fields import distance_from_feature, exterior_falloff  # noqa: E402


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public" / "career-world" / "layers"
LAND_ROOT = PUBLIC / "territory-landform"
WATER_ROOT = PUBLIC / "water-surface"
WORLD_LIGHT_MANIFEST = (
    PUBLIC / "world-backdrop" / "manifests" / "world-light-r1.json"
)
LAND_SOURCE = (
    LAND_ROOT / "sources" / "world-land-surface-authored-r8.png"
)
LAND_ALPHA_SOURCE = LAND_ROOT / "sources" / "world-land-plate-r6.png"
LAND_OUTPUT = LAND_ROOT / "textures" / "world-land-plate-r8.png"
LAND_DETAIL_OUTPUT = (
    LAND_ROOT / "textures" / "world-land-plate-r8-detail-4x.png"
)
LAND_MASK = LAND_ROOT / "masks" / "world-land-plate-r6-mask.png"
LAND_MANIFEST = LAND_ROOT / "manifests" / "world-land-plate-r8.json"
COAST_OUTPUT = WATER_ROOT / "fields" / "coast-geometry-r1.png"
COAST_DETAIL_OUTPUT = WATER_ROOT / "fields" / "coast-geometry-r1-4x.png"
COAST_MANIFEST = WATER_ROOT / "manifests" / "coast-geometry-r1.json"
WATER_REGIONS_MANIFEST = WATER_ROOT / "manifests" / "water-regions-r1.json"
WATER_REGION_OUTPUT = WATER_ROOT / "fields" / "water-region-field-r1.png"
WATER_REGION_MANIFEST = (
    WATER_ROOT / "manifests" / "water-region-field-r1.json"
)
WATER_WORLD_SOURCE = (
    WATER_ROOT
    / "sources"
    / "water-surface-world-authored-r1.png"
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
COAST_SUBSTRATE_BLUR_PIXELS = 24.0
LAND_EDGE_COLOR = np.array([25.0, 42.0, 40.0], dtype=np.float32)
WORLD_EDGE_CLEANUP_PIXELS = 9.0
WORLD_INTERIOR_SAMPLE_PIXELS = 9.0
WORLD_CONTACT_PIXELS = 1.65
WORLD_CONTACT_MAX_MIX = 0.24
DETAIL_SCALE = 4
DETAIL_CONTACT_MAX_MIX = 0.22
DETAIL_SHARPEN_RADIUS = 2.2
DETAIL_SHARPEN_PERCENT = 175
DETAIL_SHARPEN_THRESHOLD = 2
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


def world_light_direction() -> list[float]:
    data = json.loads(WORLD_LIGHT_MANIFEST.read_text(encoding="utf-8"))
    direction = data.get("direction")
    if (
        not isinstance(direction, list)
        or len(direction) != 3
        or not all(isinstance(value, (int, float)) for value in direction)
    ):
        raise RuntimeError("World light manifest has an invalid direction.")
    return [float(value) for value in direction]


def coast_substrate_array(mask: Image.Image) -> np.ndarray:
    """Carry authored land value beneath the water-side shelf."""

    land = np.asarray(mask.convert("L"), dtype=np.uint8) >= 128
    authored = np.asarray(Image.open(LAND_SOURCE).convert("RGB"), dtype=np.float32)
    if authored.shape[:2] != land.shape:
        raise RuntimeError("Authored land and coast mask dimensions differ.")

    luminance = (
        authored[..., 0] * 0.2126
        + authored[..., 1] * 0.7152
        + authored[..., 2] * 0.0722
    )
    weighted = Image.fromarray(
        np.round(np.where(land, luminance, 0.0)).astype(np.uint8),
        mode="L",
    ).filter(ImageFilter.GaussianBlur(radius=COAST_SUBSTRATE_BLUR_PIXELS))
    coverage = Image.fromarray(
        np.where(land, 255, 0).astype(np.uint8),
        mode="L",
    ).filter(ImageFilter.GaussianBlur(radius=COAST_SUBSTRATE_BLUR_PIXELS))

    weighted_array = np.asarray(weighted, dtype=np.float32)
    coverage_array = np.asarray(coverage, dtype=np.float32) / 255.0
    substrate = np.full(land.shape, 128.0, dtype=np.float32)
    nearby = coverage_array > (1.0 / 255.0)
    substrate[nearby] = weighted_array[nearby] / coverage_array[nearby]
    # The water shader only reads substrate outside the land mask. Keeping the
    # hidden land interior constant avoids shipping authored surface noise in
    # a channel that cannot affect the rendered coastline.
    substrate[land] = 128.0
    return np.round(np.clip(substrate, 0.0, 255.0)).astype(np.uint8)


def coast_geometry_array(
    mask: Image.Image,
    substrate: np.ndarray,
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
    if substrate.shape != land.shape:
        raise RuntimeError("Coast substrate and mask dimensions differ.")
    return np.stack((land, shelf, contact, substrate), axis=-1)


def build_coast_geometry(mask: Image.Image) -> None:
    substrate = coast_substrate_array(mask)
    packed = coast_geometry_array(mask, substrate)
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
        np.asarray(
            Image.fromarray(substrate, mode="L").resize(
                detail_mask.size,
                Image.Resampling.LANCZOS,
            ),
            dtype=np.uint8,
        ),
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
            "a": (
                "authored land luminance continued beneath the exterior shelf"
            ),
        },
        "source": {
            "path": "../../territory-landform/masks/world-land-plate-r6-mask.png",
            "sha256": sha256(LAND_MASK),
        },
        "policy": [
            "The land mask owns geography.",
            "Every shoreline uses this same deterministic derivation.",
            "The packed substrate value joins land material to shallow water.",
            "The runtime derives shore normals from the shelf gradient.",
            "Sparse authored crash accents belong to actors-effects in Phase 7.",
        ],
    })


def build_water_region_field(mask: Image.Image) -> None:
    """Rasterize authored hydrology regions into the world coordinate space."""

    data = json.loads(WATER_REGIONS_MANIFEST.read_text(encoding="utf-8"))
    field = np.zeros((mask.height, mask.width), dtype=np.uint8)

    for region in data.get("regions", []):
        polygon = region.get("polygon")
        if not isinstance(polygon, list) or len(polygon) < 3:
            raise RuntimeError(f"Water region {region.get('id')} has no polygon.")
        points = [
            (
                float(point[0]) * (mask.width - 1),
                float(point[1]) * (mask.height - 1),
            )
            for point in polygon
        ]
        region_mask = Image.new("L", mask.size, 0)
        ImageDraw.Draw(region_mask).polygon(points, fill=255)
        transition = float(region.get("transitionPixels", 0))
        if transition > 0:
            region_mask = region_mask.filter(
                ImageFilter.GaussianBlur(radius=transition * 0.5),
            )
        field = np.maximum(field, np.asarray(region_mask, dtype=np.uint8))

    land = np.asarray(mask.convert("L"), dtype=np.uint8) >= 128
    field[land] = 0
    WATER_REGION_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(field, mode="L").save(
        WATER_REGION_OUTPUT,
        format="PNG",
        optimize=True,
        compress_level=9,
    )
    write_json(WATER_REGION_MANIFEST, {
        "schemaVersion": 1,
        "id": "career-world/water-region-field@r1",
        "status": "phase-3-runtime",
        "coordinateSpace": "normalized-world-top-left",
        "dimensions": [mask.width, mask.height],
        "texture": {
            "path": "../fields/water-region-field-r1.png",
            "sha256": sha256(WATER_REGION_OUTPUT),
            "mode": "L",
        },
        "sources": {
            "landMask": {
                "path": (
                    "../../territory-landform/masks/"
                    "world-land-plate-r6-mask.png"
                ),
                "sha256": sha256(LAND_MASK),
            },
            "regions": {
                "path": "water-regions-r1.json",
                "sha256": sha256(WATER_REGIONS_MANIFEST),
            },
        },
        "channels": {
            "r": (
                "sheltered-water influence; zero is default open ocean"
            ),
            "g": "decoded image copy; not semantic data",
            "b": "decoded image copy; not semantic data",
            "a": "decoded image alpha; not semantic data",
        },
        "generation": {
            "script": "scripts/build-career-world-assets.py",
            "landClipped": True,
        },
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


def extend_interior_color(
    color: np.ndarray,
    distance_to_water: np.ndarray,
    visible_land: np.ndarray,
) -> np.ndarray:
    """Carry real interior color to the coast without creating a blurred halo."""

    interior = color.copy()
    valid = visible_land & (
        distance_to_water >= WORLD_INTERIOR_SAMPLE_PIXELS
    )
    height, width = visible_land.shape
    steps = int(np.ceil(WORLD_INTERIOR_SAMPLE_PIXELS)) + 2

    for _ in range(steps):
        sums = np.zeros_like(interior, dtype=np.float32)
        counts = np.zeros((height, width), dtype=np.float32)
        for delta_y, delta_x in (
            (-1, -1), (-1, 0), (-1, 1),
            (0, -1), (0, 1),
            (1, -1), (1, 0), (1, 1),
        ):
            source_y = slice(max(0, -delta_y), height - max(0, delta_y))
            source_x = slice(max(0, -delta_x), width - max(0, delta_x))
            target_y = slice(max(0, delta_y), height - max(0, -delta_y))
            target_x = slice(max(0, delta_x), width - max(0, -delta_x))
            neighbor_valid = valid[source_y, source_x]
            sums[target_y, target_x] += (
                interior[source_y, source_x]
                * neighbor_valid[..., np.newaxis]
            )
            counts[target_y, target_x] += neighbor_valid

        targets = visible_land & ~valid & (counts > 0)
        if not np.any(targets):
            break
        interior[targets] = sums[targets] / counts[targets, np.newaxis]
        valid[targets] = True

    missing = visible_land & ~valid
    if np.any(missing):
        source_is_visible = color.mean(axis=-1) >= 20.0
        fallback = np.median(color[valid], axis=0)
        interior[missing & ~source_is_visible] = fallback
    return interior


def clean_land_edge(
    source_color: np.ndarray,
    distance_to_water: np.ndarray,
    visible_land: np.ndarray,
) -> np.ndarray:
    interior = extend_interior_color(
        source_color,
        distance_to_water,
        visible_land,
    )
    cleanup = np.clip(
        (
            WORLD_EDGE_CLEANUP_PIXELS
            - distance_to_water
        ) / max(WORLD_EDGE_CLEANUP_PIXELS - 1.0, 0.001),
        0.0,
        1.0,
    )
    cleanup = np.where(visible_land, cleanup, 0.0)[..., np.newaxis]
    return source_color * (1.0 - cleanup) + interior * cleanup


def add_world_contact_edge(
    color: np.ndarray,
    distance_to_water: np.ndarray,
    visible_land: np.ndarray,
) -> np.ndarray:
    contact = np.clip(
        (
            WORLD_CONTACT_PIXELS
            - distance_to_water
        ) / max(WORLD_CONTACT_PIXELS - 1.0, 0.001),
        0.0,
        1.0,
    )
    contact = np.where(
        visible_land,
        contact * WORLD_CONTACT_MAX_MIX,
        0.0,
    )[..., np.newaxis]
    return color * (1.0 - contact) + LAND_EDGE_COLOR * contact


def add_detail_contact_edge(source: Image.Image) -> Image.Image:
    rgba = np.asarray(source.convert("RGBA"), dtype=np.uint8)
    land = rgba[..., 3] >= 8
    eroded = np.asarray(
        Image.fromarray(
            np.where(land, 255, 0).astype(np.uint8),
            mode="L",
        ).filter(ImageFilter.MinFilter(size=3)),
        dtype=np.uint8,
    ) >= 128
    boundary = land & ~eroded
    mix = np.where(boundary, DETAIL_CONTACT_MAX_MIX, 0.0)[..., np.newaxis]
    color = (
        rgba[..., :3].astype(np.float32) * (1.0 - mix)
        + LAND_EDGE_COLOR * mix
    )
    result = rgba.copy()
    result[..., :3] = np.round(np.clip(color, 0.0, 255.0)).astype(np.uint8)
    return Image.fromarray(result, mode="RGBA")


def build_land_plate(mask: Image.Image) -> None:
    authored = np.asarray(
        Image.open(LAND_SOURCE).convert("RGB"),
        dtype=np.uint8,
    )
    accepted = np.asarray(
        Image.open(LAND_ALPHA_SOURCE).convert("RGBA"),
        dtype=np.uint8,
    )
    if authored.shape[:2] != accepted.shape[:2]:
        raise RuntimeError(
            "Authored land surface does not match the accepted world registration."
        )
    alpha = accepted[..., 3].copy()
    source = np.concatenate((authored, alpha[..., np.newaxis]), axis=-1)
    visible_land = alpha >= 8
    water_feature = Image.fromarray(
        np.where(visible_land, 0, 255).astype(np.uint8),
        mode="L",
    )
    distance_to_water = distance_from_feature(water_feature)
    cleaned_color = clean_land_edge(
        source[..., :3].astype(np.float32),
        distance_to_water,
        visible_land,
    )
    world_color = add_world_contact_edge(
        cleaned_color,
        distance_to_water,
        visible_land,
    )
    output = source.copy()
    output[..., :3] = np.round(world_color).astype(np.uint8)
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

    detail_source = Image.fromarray(
        np.concatenate(
            (
                np.round(cleaned_color).astype(np.uint8),
                alpha[..., np.newaxis],
            ),
            axis=-1,
        ),
        mode="RGBA",
    )
    detail = resize_rgba_premultiplied(
        detail_source,
        (
            mask.width * DETAIL_SCALE,
            mask.height * DETAIL_SCALE,
        ),
    )
    detail_alpha = detail.getchannel("A")
    detail = detail.convert("RGB").filter(ImageFilter.UnsharpMask(
        radius=DETAIL_SHARPEN_RADIUS,
        percent=DETAIL_SHARPEN_PERCENT,
        threshold=DETAIL_SHARPEN_THRESHOLD,
    ))
    detail.putalpha(detail_alpha)
    detail = add_detail_contact_edge(detail)
    detail.save(
        LAND_DETAIL_OUTPUT,
        format="PNG",
        optimize=True,
        compress_level=9,
    )

    write_json(LAND_MANIFEST, {
        "schemaVersion": 1,
        "id": "career-world/world-land-plate@r8",
        "status": "phase-3-runtime",
        "projection": "orthographic-plan",
        "dimensions": [mask.width, mask.height],
        "visual": {
            "path": "../textures/world-land-plate-r8.png",
            "sha256": sha256(LAND_OUTPUT),
            "mode": "RGBA",
        },
        "detailVisual": {
            "path": "../textures/world-land-plate-r8-detail-4x.png",
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
            "source": "../sources/world-land-surface-authored-r8.png",
            "sourceSha256": sha256(LAND_SOURCE),
            "operation": (
                "apply the accepted r6 alpha registration to the authored "
                "Phase 3 surface, bake a restrained inner contact value, "
                "replace world-scale coast ink with a thinner territory "
                "contact edge, premultiply alpha while resampling, and "
                "restore line acuity after the deterministic 4x resize"
            ),
            "alphaPreserved": True,
            "alphaSource": "../sources/world-land-plate-r6.png",
            "alphaSourceSha256": sha256(LAND_ALPHA_SOURCE),
            "worldLightDirection": world_light_direction(),
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
            "source": "../sources/water-surface-world-authored-r1.png",
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
        LAND_ALPHA_SOURCE,
        LAND_OUTPUT,
        LAND_DETAIL_OUTPUT,
        LAND_MASK,
        LAND_MANIFEST,
        COAST_OUTPUT,
        COAST_DETAIL_OUTPUT,
        COAST_MANIFEST,
        WATER_REGIONS_MANIFEST,
        WATER_REGION_OUTPUT,
        WATER_REGION_MANIFEST,
        WATER_WORLD_SOURCE,
        WATER_WORLD_OUTPUT,
        WATER_WORLD_MANIFEST,
        WORLD_LIGHT_MANIFEST,
    ]
    missing = [str(path.relative_to(ROOT)) for path in required if not path.exists()]
    if missing:
        raise RuntimeError(f"Missing generated assets: {', '.join(missing)}")

    land = Image.open(LAND_OUTPUT).convert("RGBA")
    source = Image.open(LAND_SOURCE).convert("RGB")
    alpha_source = Image.open(LAND_ALPHA_SOURCE).convert("RGBA")
    coast = Image.open(COAST_OUTPUT).convert("RGBA")
    coast_detail = Image.open(COAST_DETAIL_OUTPUT).convert("RGBA")
    water_regions = Image.open(WATER_REGION_OUTPUT).convert("L")
    mask = Image.open(LAND_MASK).convert("L")
    if land.size != source.size or land.size != coast.size or land.size != mask.size:
        raise RuntimeError("Land, mask, and coast assets do not share dimensions.")
    if coast_detail.size != (
        mask.width * DETAIL_SCALE,
        mask.height * DETAIL_SCALE,
    ):
        raise RuntimeError("Detail coast field does not match the 4x world plane.")
    if water_regions.size != mask.size:
        raise RuntimeError("Water region field does not match the world plane.")
    if land.getchannel("A").tobytes() != alpha_source.getchannel("A").tobytes():
        raise RuntimeError("Generated land alpha differs from accepted r6 alpha.")
    land_array = np.asarray(mask, dtype=np.uint8) >= 128
    region_array = np.asarray(water_regions, dtype=np.uint8)
    if np.any(region_array[land_array] != 0):
        raise RuntimeError("Water region field overlaps accepted land.")

    land_manifest = json.loads(LAND_MANIFEST.read_text(encoding="utf-8"))
    coast_manifest = json.loads(COAST_MANIFEST.read_text(encoding="utf-8"))
    region_manifest = json.loads(
        WATER_REGION_MANIFEST.read_text(encoding="utf-8"),
    )
    water_manifest = json.loads(
        WATER_WORLD_MANIFEST.read_text(encoding="utf-8"),
    )
    if land_manifest["visual"]["sha256"] != sha256(LAND_OUTPUT):
        raise RuntimeError("Land manifest hash does not match the generated plate.")
    if coast_manifest["texture"]["sha256"] != sha256(COAST_OUTPUT):
        raise RuntimeError("Coast manifest hash does not match the generated field.")
    if coast_manifest["detailTexture"]["sha256"] != sha256(COAST_DETAIL_OUTPUT):
        raise RuntimeError("Detail coast manifest hash does not match its field.")
    if region_manifest["texture"]["sha256"] != sha256(WATER_REGION_OUTPUT):
        raise RuntimeError("Water region manifest hash does not match its field.")
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
        build_water_region_field(mask)
        build_land_plate(mask)
        build_water_world_albedo()
    verify()
    print(f"verified {LAND_OUTPUT.relative_to(ROOT)}")
    print(f"verified {COAST_OUTPUT.relative_to(ROOT)}")
    print(f"verified {WATER_REGION_OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
