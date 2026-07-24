"""Build deterministic Phase 3 terrain, coast, and water derivatives."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import sys
import time

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent / "lib"))
from world_mask_fields import distance_from_feature, exterior_falloff  # noqa: E402


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public" / "career-world" / "layers"
LAND_ROOT = PUBLIC / "territory-landform"
WATER_ROOT = PUBLIC / "water-surface"
WORLD_LIGHT_MANIFEST = (
    PUBLIC / "world-backdrop" / "manifests" / "world-light-r1.json"
)
LAND_MASK = LAND_ROOT / "masks" / "world-land-mask-r2.png"
TERRAIN_DEM_SOURCE = (
    LAND_ROOT / "sources" / "terrain-dem-authored-r3.png"
)
TERRAIN_DEM_MANIFEST = (
    LAND_ROOT / "manifests" / "terrain-dem-r3.json"
)
TERRAIN_HEIGHT = LAND_ROOT / "fields" / "terrain-height-r3.png"
TERRAIN_SLOPE = LAND_ROOT / "fields" / "terrain-slope-r3.png"
LAND_OUTPUT = LAND_ROOT / "textures" / "terrain-relief-r3.png"
LAND_DETAIL_OUTPUT = (
    LAND_ROOT / "textures" / "terrain-relief-r3-detail-4x.png"
)
LAND_MATERIAL_OUTPUT = (
    LAND_ROOT / "textures" / "terrain-material-r1.png"
)
TERRAIN_CONTOURS = (
    LAND_ROOT / "overlays" / "terrain-contours-r3-detail-4x.png"
)
LAND_MANIFEST = LAND_ROOT / "manifests" / "terrain-relief-r3.json"
COAST_OUTPUT = WATER_ROOT / "fields" / "coast-geometry-r4.png"
COAST_DETAIL_OUTPUT = WATER_ROOT / "fields" / "coast-geometry-r4-4x.png"
COAST_MANIFEST = WATER_ROOT / "manifests" / "coast-geometry-r4.json"
COAST_MATERIAL_OUTPUT = (
    WATER_ROOT / "fields" / "coast-material-field-r5.png"
)
COAST_MATERIAL_MANIFEST = (
    WATER_ROOT / "manifests" / "coast-material-field-r5.json"
)
WATER_REGIONS_MANIFEST = WATER_ROOT / "manifests" / "water-regions-r1.json"
WATER_REGION_OUTPUT = WATER_ROOT / "fields" / "water-region-field-r2.png"
WATER_REGION_MANIFEST = (
    WATER_ROOT / "manifests" / "water-region-field-r2.json"
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

SHELF_WIDTH_PIXELS = 58.0
CONTACT_FIELD_WIDTH_PIXELS = 14.0
COAST_SUBSTRATE_BLUR_PIXELS = 24.0
WORLD_EDGE_BLEED_PIXELS = 4
DETAIL_SCALE = 4
DETAIL_CONTOUR_SMOOTH_RADIUS = 1.0
DETAIL_COVERAGE_LOW = 116.0
DETAIL_COVERAGE_HIGH = 140.0
TERRAIN_SLOPE_REFERENCE = 0.026
TERRAIN_RELIEF_SCALE = 38.0
TERRAIN_CONTOUR_LEVELS = 12
LAND_COAST_WIDTH_PIXELS = 11.0
LAND_WET_EDGE_PIXELS = 2.4
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


def save_png_atomic(image: Image.Image, path: Path) -> None:
    """Replace a runtime PNG without truncating the file served by Vite."""

    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    image.save(
        temporary,
        format="PNG",
        optimize=True,
        compress_level=9,
    )
    for attempt in range(8):
        try:
            temporary.replace(path)
            return
        except PermissionError:
            if attempt == 7:
                raise
            time.sleep(0.075 * (attempt + 1))


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


def smooth_unit(values: np.ndarray) -> np.ndarray:
    clipped = np.clip(values, 0.0, 1.0)
    return clipped * clipped * (3.0 - 2.0 * clipped)


def load_land_mask() -> Image.Image:
    """Load the canonical world geography without consulting painted art."""

    mask = Image.open(LAND_MASK).convert("L")
    values = np.asarray(mask, dtype=np.uint8)
    land = values >= 128
    if not np.any(land) or np.all(land):
        raise RuntimeError("Canonical land mask must contain land and water.")
    if np.any((values != 0) & (values != 255)):
        raise RuntimeError("Canonical land mask must be binary.")
    return mask


def development_shelf_weight(
    width: int,
    height: int,
    center: list[float],
    radius: float,
) -> np.ndarray:
    """Return one aspect-correct soft shelf around a future city anchor."""

    if len(center) != 2 or radius <= 0:
        raise RuntimeError("Development shelves require a center and radius.")
    y, x = np.mgrid[0:height, 0:width]
    aspect = width / height
    normalized_x = x.astype(np.float32) / max(width - 1, 1)
    normalized_y = y.astype(np.float32) / max(height - 1, 1)
    delta_x = (normalized_x - float(center[0])) * aspect
    delta_y = normalized_y - float(center[1])
    distance_squared = delta_x * delta_x + delta_y * delta_y
    return np.exp(-0.5 * distance_squared / (radius * radius)).astype(
        np.float32,
    )


def build_terrain_fields(
    mask: Image.Image,
) -> tuple[np.ndarray, np.ndarray]:
    """Compile the authored DEM into canonical elevation and slope fields."""

    authoring = json.loads(TERRAIN_DEM_MANIFEST.read_text(encoding="utf-8"))
    land = np.asarray(mask, dtype=np.uint8) >= 128
    processing = authoring["processing"]
    source = Image.open(TERRAIN_DEM_SOURCE).convert("L")
    if source.size != mask.size:
        raise RuntimeError("Authored terrain DEM must match the canonical mask.")
    if authoring["source"]["dimensions"] != [source.width, source.height]:
        raise RuntimeError("Terrain DEM dimensions differ from its manifest.")
    source_values = np.asarray(source, dtype=np.float32) / 255.0
    black_point = float(processing["blackPoint"])
    white_point = float(processing["whitePoint"])
    if not 0.0 <= black_point < white_point <= 1.0:
        raise RuntimeError("Terrain DEM black and white points are invalid.")
    height = np.clip(
        (source_values - black_point) / (white_point - black_point),
        0.0,
        1.0,
    )
    height = np.power(height, float(processing["gamma"])).astype(np.float32)
    height = np.asarray(
        Image.fromarray(
            np.round(height * 255.0).astype(np.uint8),
            mode="L",
        ).filter(
            ImageFilter.GaussianBlur(
                radius=float(processing["smoothingPixels"]),
            ),
        ),
        dtype=np.float32,
    ) / 255.0
    height[~land] = 0.0
    height[land] = np.maximum(
        height[land],
        float(processing["minimumLandElevation"]),
    )

    for plain in authoring.get("developmentShelves", []):
        influence = development_shelf_weight(
            mask.width,
            mask.height,
            plain["center"],
            float(plain["radius"]),
        ) * float(plain["strength"])
        target = float(plain["targetElevation"])
        height = height * (1.0 - influence) + target * influence

    height_image = Image.fromarray(
        np.round(np.clip(height, 0.0, 1.0) * 255.0).astype(np.uint8),
        mode="L",
    ).filter(
        ImageFilter.GaussianBlur(
            radius=float(processing["finalSmoothingPixels"]),
        ),
    )
    height = np.asarray(height_image, dtype=np.float32) / 255.0
    height[~land] = 0.0
    height[land] = np.maximum(
        height[land],
        float(processing["minimumLandElevation"]),
    )

    # Continue land elevation across the hidden water-side boundary before
    # measuring slope. A zero-valued exterior creates an artificial cliff at
    # every coastline and makes terrain-based beach classification impossible.
    continued_height, _ = continued_land_field(
        height,
        land,
        float(processing["slopeContinuationPixels"]),
    )
    slope_source = np.asarray(
        Image.fromarray(
            np.round(continued_height * 255.0).astype(np.uint8),
            mode="L",
        ).filter(
            ImageFilter.GaussianBlur(
                radius=float(processing["slopeSmoothingPixels"]),
            ),
        ),
        dtype=np.float32,
    ) / 255.0
    gradient_y, gradient_x = np.gradient(slope_source)
    slope = np.clip(
        np.hypot(gradient_x, gradient_y) / TERRAIN_SLOPE_REFERENCE,
        0.0,
        1.0,
    ).astype(np.float32)
    slope[~land] = 0.0

    save_png_atomic(
        Image.fromarray(
            np.round(height * 255.0).astype(np.uint8),
            mode="L",
        ),
        TERRAIN_HEIGHT,
    )
    save_png_atomic(
        Image.fromarray(
            np.round(slope * 255.0).astype(np.uint8),
            mode="L",
        ),
        TERRAIN_SLOPE,
    )
    return height, slope


def coast_substrate_array(
    mask: Image.Image,
    land_color: np.ndarray,
) -> np.ndarray:
    """Carry terrain value beneath the water-side shelf."""

    land = np.asarray(mask.convert("L"), dtype=np.uint8) >= 128
    if land_color.shape[:2] != land.shape:
        raise RuntimeError("Terrain relief and coast mask dimensions differ.")
    luminance = (
        land_color[..., 0] * 0.2126
        + land_color[..., 1] * 0.7152
        + land_color[..., 2] * 0.0722
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
) -> np.ndarray:
    mask_array = np.asarray(mask.convert("L"), dtype=np.uint8)
    land_boolean = mask_array >= 128
    binary = Image.fromarray(
        np.where(land_boolean, 255, 0).astype(np.uint8),
        mode="L",
    )
    distance = distance_from_feature(binary)
    shelf = np.round(
        exterior_falloff(
            binary,
            SHELF_WIDTH_PIXELS,
            distance=distance,
        ) * 255.0,
    ).astype(np.uint8)
    exterior_contact = np.round(
        exterior_falloff(
            binary,
            CONTACT_FIELD_WIDTH_PIXELS,
            distance=distance,
        ) * 255.0,
    ).astype(np.uint8)
    water_binary = Image.fromarray(
        np.where(land_boolean, 0, 255).astype(np.uint8),
        mode="L",
    )
    interior_distance = distance_from_feature(water_binary)
    interior_normalized = np.clip(
        1.0 - interior_distance / CONTACT_FIELD_WIDTH_PIXELS,
        0.0,
        1.0,
    )
    interior_contact = (
        interior_normalized
        * interior_normalized
        * (3.0 - 2.0 * interior_normalized)
    )
    interior_contact = np.where(
        land_boolean,
        interior_contact,
        0.0,
    )
    contact = np.maximum(
        exterior_contact,
        np.round(interior_contact * 255.0).astype(np.uint8),
    )
    if substrate.shape != mask_array.shape:
        raise RuntimeError("Coast substrate and mask dimensions differ.")
    return np.stack((mask_array, shelf, contact, substrate), axis=-1)


def build_coast_geometry(mask: Image.Image) -> None:
    land_color = np.asarray(
        Image.open(LAND_OUTPUT).convert("RGB"),
        dtype=np.float32,
    )
    substrate = coast_substrate_array(mask, land_color)
    coverage = Image.fromarray(antialiased_land_alpha(mask), mode="L")
    packed = coast_geometry_array(coverage, substrate)
    save_png_atomic(Image.fromarray(packed, mode="RGBA"), COAST_OUTPUT)
    detail_mask = detail_land_coverage(mask)
    detail_size = (
        mask.width * DETAIL_SCALE,
        mask.height * DETAIL_SCALE,
    )
    detail_packed = np.asarray(
        Image.fromarray(packed, mode="RGBA").resize(
            detail_size,
            Image.Resampling.BICUBIC,
        ),
        dtype=np.uint8,
    ).copy()
    detail_packed[..., 0] = detail_mask
    save_png_atomic(
        Image.fromarray(detail_packed, mode="RGBA"),
        COAST_DETAIL_OUTPUT,
    )
    write_json(COAST_MANIFEST, {
        "schemaVersion": 1,
        "id": "career-world/coast-geometry@r4",
        "status": "phase-3-runtime",
        "coordinateSpace": "normalized-world-top-left",
        "dimensions": [mask.width, mask.height],
        "texture": {
            "path": "../fields/coast-geometry-r4.png",
            "sha256": sha256(COAST_OUTPUT),
            "mode": "RGBA",
        },
        "detailTexture": {
            "path": "../fields/coast-geometry-r4-4x.png",
            "sha256": sha256(COAST_DETAIL_OUTPUT),
            "dimensions": [
                mask.width * DETAIL_SCALE,
                mask.height * DETAIL_SCALE,
            ],
            "mode": "RGBA",
        },
        "channels": {
            "r": "antialiased land coverage anchored to binary occupancy",
            "g": f"continuous {SHELF_WIDTH_PIXELS:g}px exterior shelf falloff",
            "b": (
                f"continuous {CONTACT_FIELD_WIDTH_PIXELS:g}px bidirectional "
                "shore-distance falloff; runtime coast materials choose the "
                "visible contact width"
            ),
            "a": (
                "authored land luminance continued beneath the exterior shelf"
            ),
        },
        "source": {
            "path": "../../territory-landform/masks/world-land-mask-r2.png",
            "sha256": sha256(LAND_MASK),
        },
        "policy": [
            "The land mask owns geography.",
            "Every shoreline uses this same deterministic derivation.",
            "Terrain relief supplies the packed underwater substrate value.",
            "The 4x field resamples continuous distances and reconstructs coverage.",
            "The runtime derives shore normals from the shelf gradient.",
            "Sparse authored crash accents belong to actors-effects in Phase 7.",
        ],
    })


def continued_land_field(
    values: np.ndarray,
    land: np.ndarray,
    radius: float,
) -> tuple[np.ndarray, np.ndarray]:
    """Continue one terrain field just beyond the canonical coast."""

    weighted = Image.fromarray(
        np.round(np.where(land, values, 0.0) * 255.0).astype(np.uint8),
        mode="L",
    ).filter(ImageFilter.GaussianBlur(radius=radius))
    coverage = Image.fromarray(
        np.where(land, 255, 0).astype(np.uint8),
        mode="L",
    ).filter(ImageFilter.GaussianBlur(radius=radius))
    weighted_array = np.asarray(weighted, dtype=np.float32) / 255.0
    coverage_array = np.asarray(coverage, dtype=np.float32) / 255.0
    continued = np.zeros_like(values, dtype=np.float32)
    supported = coverage_array > (1.0 / 255.0)
    continued[supported] = (
        weighted_array[supported] / coverage_array[supported]
    )
    continued[land] = values[land]
    return np.clip(continued, 0.0, 1.0), coverage_array


def build_coast_material_field(
    mask: Image.Image,
    height: np.ndarray,
    slope: np.ndarray,
) -> None:
    """Derive beach, rock, and cliff response from terrain topology."""

    land = np.asarray(mask.convert("L"), dtype=np.uint8) >= 128
    coast_height, coverage = continued_land_field(
        height,
        land,
        SHELF_WIDTH_PIXELS * 0.9,
    )
    coast_slope, _ = continued_land_field(
        slope,
        land,
        SHELF_WIDTH_PIXELS * 0.9,
    )
    support = smooth_unit(np.clip(coverage * 3.2, 0.0, 1.0))
    cliff_signal = (
        coast_height * 0.72
        + coast_slope * 0.58
    )
    cliff = smooth_unit((cliff_signal - 0.34) / 0.42) * support
    beach = (
        smooth_unit((0.58 - coast_height) / 0.42)
        * smooth_unit((0.62 - coast_slope) / 0.5)
        * (1.0 - cliff)
        * support
    )
    # Preserve continuous terrain height beneath the complete visible shelf.
    # Beach/cliff classification controls response, while this channel remains
    # a genuine bathymetric field that the shader can light independently.
    profile = coast_height * support

    packed = np.stack(
        (
            np.round(np.clip(beach, 0.0, 1.0) * 255.0).astype(np.uint8),
            np.round(np.clip(cliff, 0.0, 1.0) * 255.0).astype(np.uint8),
            np.round(np.clip(profile, 0.0, 1.0) * 255.0).astype(np.uint8),
        ),
        axis=-1,
    )
    save_png_atomic(
        Image.fromarray(packed, mode="RGB"),
        COAST_MATERIAL_OUTPUT,
    )
    write_json(COAST_MATERIAL_MANIFEST, {
        "schemaVersion": 1,
        "id": "career-world/coast-material-field@r5",
        "status": "phase-3-runtime",
        "coordinateSpace": "normalized-world-top-left",
        "dimensions": [mask.width, mask.height],
        "texture": {
            "path": "../fields/coast-material-field-r5.png",
            "sha256": sha256(COAST_MATERIAL_OUTPUT),
            "mode": "RGB",
        },
        "channels": {
            "r": "low-elevation low-slope beach affinity",
            "g": "height-and-slope-derived cliff affinity",
            "b": (
                "continuous terrain height extended beneath the visible shelf"
            ),
        },
        "defaultMaterial": "rocky-shelf",
        "sources": {
            "height": {
                "path": "../../territory-landform/fields/terrain-height-r3.png",
                "sha256": sha256(TERRAIN_HEIGHT),
            },
            "slope": {
                "path": "../../territory-landform/fields/terrain-slope-r3.png",
                "sha256": sha256(TERRAIN_SLOPE),
            },
        },
        "policy": [
            "Coast material is a terrain derivative, not a corrective overlay.",
            "Low, gentle coast becomes beach; high or steep coast becomes cliff.",
            "Ambiguous shoreline uses the rocky-shelf default.",
            "The land mask remains the sole coastline geometry authority.",
            "The same topology drives land relief and water-side coast response.",
        ],
    })


def build_water_region_field(mask: Image.Image) -> None:
    """Rasterize authored hydrology regions into the world coordinate space."""

    data = json.loads(WATER_REGIONS_MANIFEST.read_text(encoding="utf-8"))
    field = np.zeros((mask.height, mask.width, 3), dtype=np.uint8)
    channel_indices = {"r": 0, "g": 1, "b": 2}
    binary_mask = mask.convert("L").point(
        lambda value: 255 if value >= 128 else 0,
    )

    for region in data.get("regions", []):
        channel = region.get("channel")
        if channel not in channel_indices:
            raise RuntimeError(
                f"Water region {region.get('id')} has no valid channel.",
            )
        seed = region.get("seed")
        polygon = region.get("polygon")
        if isinstance(seed, list) and len(seed) == 2:
            seed_pixel = (
                round(float(seed[0]) * (mask.width - 1)),
                round(float(seed[1]) * (mask.height - 1)),
            )
            component = binary_mask.copy()
            if component.getpixel(seed_pixel) != 0:
                raise RuntimeError(
                    f"Water region {region.get('id')} seed is not water.",
                )
            ImageDraw.floodfill(component, seed_pixel, 128)
            region_mask = component.point(
                lambda value: 255 if value == 128 else 0,
            )
        elif isinstance(polygon, list) and len(polygon) >= 3:
            points = [
                (
                    float(point[0]) * (mask.width - 1),
                    float(point[1]) * (mask.height - 1),
                )
                for point in polygon
            ]
            region_mask = Image.new("L", mask.size, 0)
            ImageDraw.Draw(region_mask).polygon(points, fill=255)
        else:
            raise RuntimeError(
                f"Water region {region.get('id')} has no seed or polygon.",
            )
        transition = float(region.get("transitionPixels", 0))
        if transition > 0:
            region_mask = region_mask.filter(
                ImageFilter.GaussianBlur(radius=transition * 0.5),
            )
        index = channel_indices[channel]
        field[:, :, index] = np.maximum(
            field[:, :, index],
            np.asarray(region_mask, dtype=np.uint8),
        )

    land = np.asarray(mask.convert("L"), dtype=np.uint8) >= 128
    field[land, :] = 0
    save_png_atomic(Image.fromarray(field, mode="RGB"), WATER_REGION_OUTPUT)
    write_json(WATER_REGION_MANIFEST, {
        "schemaVersion": 1,
        "id": "career-world/water-region-field@r2",
        "status": "phase-3-runtime",
        "coordinateSpace": "normalized-world-top-left",
        "dimensions": [mask.width, mask.height],
        "texture": {
            "path": "../fields/water-region-field-r2.png",
            "sha256": sha256(WATER_REGION_OUTPUT),
            "mode": "RGB",
        },
        "sources": {
            "landMask": {
                "path": (
                    "../../territory-landform/masks/"
                    "world-land-mask-r2.png"
                ),
                "sha256": sha256(LAND_MASK),
            },
            "regions": {
                "path": "water-regions-r1.json",
                "sha256": sha256(WATER_REGIONS_MANIFEST),
            },
        },
        "channels": {
            "r": "mainland-inner-sea independent water-body influence",
            "g": "mainland-southwest-lake independent water-body influence",
            "b": "reserved for another materially distinct water body",
        },
        "generation": {
            "script": "scripts/build-career-world-assets.py",
            "landClipped": True,
            "seededComponentMasks": True,
        },
    })


def bleed_transparent_edge_color(
    color: np.ndarray,
    alpha: np.ndarray,
) -> np.ndarray:
    """Fill transparent coast texels without changing accepted alpha."""

    output = color.copy()
    valid = alpha > 0
    height, width = valid.shape

    for _ in range(WORLD_EDGE_BLEED_PIXELS):
        sums = np.zeros_like(output, dtype=np.float32)
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
                output[source_y, source_x]
                * neighbor_valid[..., np.newaxis]
            )
            counts[target_y, target_x] += neighbor_valid

        targets = ~valid & (counts > 0)
        if not np.any(targets):
            break
        output[targets] = sums[targets] / counts[targets, np.newaxis]
        valid[targets] = True

    return output


def antialiased_land_alpha(mask: Image.Image) -> np.ndarray:
    """Antialias the accepted binary silhouette without retaining source glow."""

    mask_array = np.asarray(mask.convert("L"), dtype=np.uint8)
    land = mask_array >= 128
    blurred = np.asarray(
        Image.fromarray(
            np.where(land, 255, 0).astype(np.uint8),
            mode="L",
        ).filter(ImageFilter.GaussianBlur(radius=0.65)),
        dtype=np.float32,
    ) / 255.0
    normalized = np.clip((blurred - 0.12) / 0.76, 0.0, 1.0)
    smoothed = normalized * normalized * (3.0 - 2.0 * normalized)
    alpha = np.round(smoothed * 255.0).astype(np.uint8)
    alpha[land] = np.maximum(alpha[land], 128)
    alpha[~land] = np.minimum(alpha[~land], 127)
    return alpha


def detail_land_coverage(mask: Image.Image) -> np.ndarray:
    """Reconstruct a smooth 4x coverage field from the binary coastline."""

    detail_size = (
        mask.width * DETAIL_SCALE,
        mask.height * DETAIL_SCALE,
    )
    field = mask.filter(
        ImageFilter.GaussianBlur(radius=DETAIL_CONTOUR_SMOOTH_RADIUS),
    ).resize(
        detail_size,
        Image.Resampling.BICUBIC,
    )
    values = np.asarray(field, dtype=np.float32)
    coverage = np.clip(
        (values - DETAIL_COVERAGE_LOW)
        / (DETAIL_COVERAGE_HIGH - DETAIL_COVERAGE_LOW),
        0.0,
        1.0,
    )
    coverage = coverage * coverage * (3.0 - 2.0 * coverage)
    return np.round(coverage * 255.0).astype(np.uint8)


def terrain_palette(height: np.ndarray) -> np.ndarray:
    """Map elevation to a restrained tint used by the relief pass."""

    stops = np.asarray([0.0, 0.1, 0.3, 0.58, 1.0], dtype=np.float32)
    colors = np.asarray(
        [
            [126, 113, 78],
            [116, 115, 76],
            [102, 107, 77],
            [113, 108, 91],
            [148, 141, 121],
        ],
        dtype=np.float32,
    )
    return np.stack(
        [
            np.interp(height, stops, colors[:, channel])
            for channel in range(3)
        ],
        axis=-1,
    ).astype(np.float32)


def low_frequency_field(
    width: int,
    height: int,
    grid_width: int,
    grid_height: int,
    seed: int,
) -> np.ndarray:
    """Build one deterministic, non-repeating world-space material field."""

    generator = np.random.default_rng(seed)
    grid = generator.random(
        (grid_height, grid_width),
        dtype=np.float32,
    )
    field = Image.fromarray(
        np.round(grid * 255.0).astype(np.uint8),
        mode="L",
    ).resize(
        (width, height),
        Image.Resampling.BICUBIC,
    )
    return np.asarray(field, dtype=np.float32) / 255.0


def render_terrain_material(
    height: np.ndarray,
    slope: np.ndarray,
) -> np.ndarray:
    """Author a restrained illustrated base independently from lighting."""

    image_height, image_width = height.shape
    broad = low_frequency_field(
        image_width,
        image_height,
        10,
        6,
        0xC411,
    )
    regional = low_frequency_field(
        image_width,
        image_height,
        28,
        16,
        0x51A7,
    )
    meso = low_frequency_field(
        image_width,
        image_height,
        72,
        41,
        0x7E22,
    )

    dry = np.asarray([124, 105, 65], dtype=np.float32)
    moss = np.asarray([61, 86, 55], dtype=np.float32)
    stone = np.asarray([103, 97, 84], dtype=np.float32)
    alpine = np.asarray([145, 137, 119], dtype=np.float32)

    moisture = smooth_unit(
        broad * 0.55
        + regional * 0.3
        + (1.0 - height) * 0.2
        - 0.05
    )
    color = (
        dry[np.newaxis, np.newaxis, :] * (1.0 - moisture[..., np.newaxis])
        + moss[np.newaxis, np.newaxis, :] * moisture[..., np.newaxis]
    )
    exposed_rock = smooth_unit(
        (slope - 0.24) / 0.58
    ) * smooth_unit((height + 0.08) / 0.72)
    color = (
        color * (1.0 - exposed_rock[..., np.newaxis] * 0.54)
        + stone[np.newaxis, np.newaxis, :]
        * exposed_rock[..., np.newaxis]
        * 0.54
    )
    alpine_amount = smooth_unit((height - 0.7) / 0.3)
    color = (
        color * (1.0 - alpine_amount[..., np.newaxis] * 0.46)
        + alpine[np.newaxis, np.newaxis, :]
        * alpine_amount[..., np.newaxis]
        * 0.46
    )
    value_variation = (
        (broad - 0.5) * 12.0
        + (regional - 0.5) * 6.0
        + (meso - 0.5) * 2.5
    )
    color += value_variation[..., np.newaxis]
    return np.clip(color, 0.0, 255.0).astype(np.float32)


def blur_unit_field(values: np.ndarray, radius: float) -> np.ndarray:
    """Blur one normalized field without introducing out-of-range values."""

    image = Image.fromarray(
        np.round(np.clip(values, 0.0, 1.0) * 255.0).astype(np.uint8),
        mode="L",
    ).filter(ImageFilter.GaussianBlur(radius=radius))
    return np.asarray(image, dtype=np.float32) / 255.0


def apply_land_side_coast_material(
    color: np.ndarray,
    height: np.ndarray,
    slope: np.ndarray,
    land: np.ndarray,
    distance: np.ndarray,
) -> np.ndarray:
    """Blend beaches and rock into land without drawing a uniform outline."""

    coast = 1.0 - smooth_unit(distance / LAND_COAST_WIDTH_PIXELS)
    wet_edge = 1.0 - smooth_unit(distance / LAND_WET_EDGE_PIXELS)

    cliff_signal = height * 0.72 + slope * 0.58
    cliff = smooth_unit((cliff_signal - 0.34) / 0.42)
    beach = (
        smooth_unit((0.58 - height) / 0.42)
        * smooth_unit((0.62 - slope) / 0.5)
        * (1.0 - cliff)
    )
    rock = np.clip(1.0 - beach - cliff, 0.0, 1.0)

    dry_sand = np.asarray([148, 128, 82], dtype=np.float32)
    wet_sand = np.asarray([91, 88, 66], dtype=np.float32)
    shelf_rock = np.asarray([91, 88, 76], dtype=np.float32)
    cliff_rock = np.asarray([72, 72, 67], dtype=np.float32)
    sand_color = (
        dry_sand[np.newaxis, np.newaxis, :]
        * (1.0 - wet_edge[..., np.newaxis])
        + wet_sand[np.newaxis, np.newaxis, :]
        * wet_edge[..., np.newaxis]
    )

    beach_mix = (coast * beach * 0.9 * land)[..., np.newaxis]
    rock_mix = (coast * rock * 0.52 * land)[..., np.newaxis]
    cliff_mix = (
        (1.0 - smooth_unit(distance / 7.0))
        * cliff
        * 0.66
        * land
    )[..., np.newaxis]
    result = color * (1.0 - beach_mix) + sand_color * beach_mix
    result = result * (1.0 - rock_mix) + shelf_rock * rock_mix
    result = result * (1.0 - cliff_mix) + cliff_rock * cliff_mix
    return result


def render_terrain_relief(
    height: np.ndarray,
    slope: np.ndarray,
    material: np.ndarray,
    land: np.ndarray,
    coast_distance: np.ndarray,
    *,
    sample_scale: float,
) -> np.ndarray:
    """Light and etch the base material from the canonical elevation field."""

    # The DEM is zero outside the mask for data correctness, but differentiating
    # that discontinuity invents a vertical wall around every coast. Continue
    # local terrain just beyond the hidden boundary before computing normals.
    shading_height, _ = continued_land_field(
        height,
        land,
        10.0 * sample_scale,
    )
    gradient_y, gradient_x = np.gradient(shading_height)
    horizontal_scale = TERRAIN_RELIEF_SCALE * sample_scale
    slope_amount = np.clip(
        np.hypot(gradient_x, gradient_y)
        * sample_scale
        / TERRAIN_SLOPE_REFERENCE,
        0.0,
        1.0,
    )
    normal_x = -gradient_x * horizontal_scale
    normal_y = -gradient_y * horizontal_scale
    normal_z = np.ones_like(height)
    normal_length = np.sqrt(
        normal_x * normal_x
        + normal_y * normal_y
        + normal_z * normal_z
    )
    light = np.asarray(world_light_direction(), dtype=np.float32)
    light /= np.linalg.norm(light)
    light_amount = (
        normal_x * light[0]
        + normal_y * light[1]
        + normal_z * light[2]
    ) / normal_length
    lighting = 0.56 + smooth_unit(light_amount * 0.5 + 0.5) * 0.54
    elevation_tint = terrain_palette(height)
    color = material * 0.88 + elevation_tint * 0.12
    color *= lighting[..., np.newaxis]

    # Multi-scale local relief supplies restrained illustrated linework tied to
    # actual ridges and drainage instead of a repeated surface-noise pattern.
    fine_relief = height - blur_unit_field(
        shading_height,
        1.8 * sample_scale,
    )
    meso_relief = height - blur_unit_field(
        shading_height,
        7.0 * sample_scale,
    )
    relief_ink = np.tanh(fine_relief * 34.0 + meso_relief * 9.0)
    color += (
        relief_ink
        * (10.0 + slope_amount * 16.0)
        * land
    )[..., np.newaxis]
    color *= (
        1.0
        - np.maximum(slope_amount, slope) * 0.1
    )[..., np.newaxis]
    color = apply_land_side_coast_material(
        color,
        height,
        slope,
        land,
        coast_distance,
    )
    return np.round(np.clip(color, 0.0, 255.0)).astype(np.uint8)


def build_terrain_contours(
    height: np.ndarray,
    land: np.ndarray,
) -> Image.Image:
    """Build sparse QA-only contours from elevation quantization."""

    levels = np.floor(
        np.clip(height, 0.0, 0.9999) * TERRAIN_CONTOUR_LEVELS,
    ).astype(np.uint8)
    edge = np.zeros_like(land)
    edge[:, 1:] |= levels[:, 1:] != levels[:, :-1]
    edge[1:, :] |= levels[1:, :] != levels[:-1, :]
    edge &= land & (height >= 0.055)
    index = edge & ((levels % 4) == 0)
    regular_image = Image.fromarray(
        np.where(edge, 255, 0).astype(np.uint8),
        mode="L",
    ).filter(ImageFilter.MaxFilter(size=5))
    index_image = Image.fromarray(
        np.where(index, 255, 0).astype(np.uint8),
        mode="L",
    ).filter(ImageFilter.MaxFilter(size=7))
    regular = np.asarray(regular_image, dtype=np.float32) / 255.0
    index_lines = np.asarray(index_image, dtype=np.float32) / 255.0
    alpha = np.maximum(regular * 92.0, index_lines * 154.0)
    alpha *= land
    output = np.zeros((*land.shape, 4), dtype=np.uint8)
    output[..., :3] = np.asarray([232, 224, 174], dtype=np.uint8)
    output[..., 3] = np.round(alpha).astype(np.uint8)
    return Image.fromarray(output, mode="RGBA")


def build_land_plate(
    mask: Image.Image,
    height: np.ndarray,
    slope: np.ndarray,
) -> None:
    """Publish calm terrain relief and a registered high-resolution derivative."""

    visible_land = np.asarray(mask.convert("L"), dtype=np.uint8) >= 128
    water_feature = Image.fromarray(
        np.where(visible_land, 0, 255).astype(np.uint8),
        mode="L",
    )
    coast_distance = distance_from_feature(water_feature).astype(np.float32)
    alpha = antialiased_land_alpha(mask)
    base_material = render_terrain_material(height, slope)
    material_edge_safe_color = bleed_transparent_edge_color(
        base_material,
        alpha,
    )
    material_output = np.concatenate(
        (
            np.round(material_edge_safe_color).astype(np.uint8),
            alpha[..., np.newaxis],
        ),
        axis=-1,
    )
    save_png_atomic(
        Image.fromarray(material_output, mode="RGBA"),
        LAND_MATERIAL_OUTPUT,
    )

    base_color = render_terrain_relief(
        height,
        slope,
        base_material,
        visible_land,
        coast_distance,
        sample_scale=1.0,
    )
    edge_safe_color = bleed_transparent_edge_color(
        base_color.astype(np.float32),
        alpha,
    )
    output = np.concatenate(
        (
            np.round(edge_safe_color).astype(np.uint8),
            alpha[..., np.newaxis],
        ),
        axis=-1,
    )
    save_png_atomic(Image.fromarray(output, mode="RGBA"), LAND_OUTPUT)

    detail_size = (
        mask.width * DETAIL_SCALE,
        mask.height * DETAIL_SCALE,
    )
    detail_height = np.asarray(
        Image.fromarray(
            np.round(height * 255.0).astype(np.uint8),
            mode="L",
        ).resize(detail_size, Image.Resampling.BICUBIC),
        dtype=np.float32,
    ) / 255.0
    detail_slope = np.asarray(
        Image.fromarray(
            np.round(slope * 255.0).astype(np.uint8),
            mode="L",
        ).resize(detail_size, Image.Resampling.BICUBIC),
        dtype=np.float32,
    ) / 255.0
    detail_alpha = detail_land_coverage(mask)
    detail_land = detail_alpha >= 128
    detail_coast_distance = np.asarray(
        Image.fromarray(
            coast_distance,
            mode="F",
        ).resize(detail_size, Image.Resampling.BICUBIC),
        dtype=np.float32,
    )
    detail_material = render_terrain_material(detail_height, detail_slope)
    detail_color = render_terrain_relief(
        detail_height,
        detail_slope,
        detail_material,
        detail_land,
        detail_coast_distance,
        sample_scale=DETAIL_SCALE,
    )
    detail_edge_safe_color = bleed_transparent_edge_color(
        detail_color.astype(np.float32),
        detail_alpha,
    )
    detail_output = np.concatenate(
        (
            np.round(detail_edge_safe_color).astype(np.uint8),
            detail_alpha[..., np.newaxis],
        ),
        axis=-1,
    )
    save_png_atomic(
        Image.fromarray(detail_output, mode="RGBA"),
        LAND_DETAIL_OUTPUT,
    )
    save_png_atomic(
        build_terrain_contours(detail_height, detail_land),
        TERRAIN_CONTOURS,
    )

    write_json(LAND_MANIFEST, {
        "schemaVersion": 1,
        "id": "career-world/terrain-relief@r3",
        "status": "phase-3-runtime",
        "projection": "orthographic-plan",
        "dimensions": [mask.width, mask.height],
        "visual": {
            "path": "../textures/terrain-relief-r3.png",
            "sha256": sha256(LAND_OUTPUT),
            "mode": "RGBA",
        },
        "detailVisual": {
            "path": "../textures/terrain-relief-r3-detail-4x.png",
            "sha256": sha256(LAND_DETAIL_OUTPUT),
            "dimensions": [
                mask.width * DETAIL_SCALE,
                mask.height * DETAIL_SCALE,
            ],
            "mode": "RGBA",
            "role": (
                "registered material and relief; no local biome decoration"
            ),
        },
        "baseMaterial": {
            "path": "../textures/terrain-material-r1.png",
            "sha256": sha256(LAND_MATERIAL_OUTPUT),
            "dimensions": [mask.width, mask.height],
            "mode": "RGBA",
            "role": (
                "deterministic low-frequency ground material before DEM lighting"
            ),
        },
        "topologyQa": {
            "path": "../overlays/terrain-contours-r3-detail-4x.png",
            "sha256": sha256(TERRAIN_CONTOURS),
            "dimensions": [
                mask.width * DETAIL_SCALE,
                mask.height * DETAIL_SCALE,
            ],
            "mode": "RGBA",
        },
        "mask": {
            "path": "../masks/world-land-mask-r2.png",
            "sha256": sha256(LAND_MASK),
        },
        "fields": {
            "height": {
                "path": "../fields/terrain-height-r3.png",
                "sha256": sha256(TERRAIN_HEIGHT),
                "mode": "L",
            },
            "slope": {
                "path": "../fields/terrain-slope-r3.png",
                "sha256": sha256(TERRAIN_SLOPE),
                "mode": "L",
            },
        },
        "derivation": {
            "source": "../sources/terrain-dem-authored-r3.png",
            "sourceSha256": sha256(TERRAIN_DEM_SOURCE),
            "authoring": "terrain-dem-r3.json",
            "authoringSha256": sha256(TERRAIN_DEM_MANIFEST),
            "operation": (
                "normalize and mask one authored DEM; preserve five future "
                "development shelves; derive boundary-safe slope and coast "
                "response; light a separate deterministic ground material; "
                "publish registered detail relief and QA contours"
            ),
            "worldLightDirection": world_light_direction(),
            "decorativeGroundTexture": True,
            "materialRecipe": (
                "seeded low-frequency dry, moss, stone, and alpine fields; "
                "DEM-derived ridge and valley ink; topology-classified "
                "land-side beach, rocky shelf, and cliff transitions; "
                "no structure marks"
            ),
            "landCoastWidthPixels": LAND_COAST_WIDTH_PIXELS,
            "vegetationIncluded": False,
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
    save_png_atomic(
        Image.fromarray(np.round(output).astype(np.uint8), mode="RGB"),
        WATER_WORLD_OUTPUT,
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
        LAND_MASK,
        TERRAIN_DEM_SOURCE,
        TERRAIN_DEM_MANIFEST,
        TERRAIN_HEIGHT,
        TERRAIN_SLOPE,
        LAND_OUTPUT,
        LAND_DETAIL_OUTPUT,
        LAND_MATERIAL_OUTPUT,
        TERRAIN_CONTOURS,
        LAND_MANIFEST,
        COAST_OUTPUT,
        COAST_DETAIL_OUTPUT,
        COAST_MANIFEST,
        COAST_MATERIAL_OUTPUT,
        COAST_MATERIAL_MANIFEST,
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
    land_detail = Image.open(LAND_DETAIL_OUTPUT).convert("RGBA")
    land_material = Image.open(LAND_MATERIAL_OUTPUT).convert("RGBA")
    terrain_contours = Image.open(TERRAIN_CONTOURS).convert("RGBA")
    terrain_height = Image.open(TERRAIN_HEIGHT).convert("L")
    terrain_slope = Image.open(TERRAIN_SLOPE).convert("L")
    coast = Image.open(COAST_OUTPUT).convert("RGBA")
    coast_detail = Image.open(COAST_DETAIL_OUTPUT).convert("RGBA")
    coast_material = Image.open(COAST_MATERIAL_OUTPUT).convert("RGB")
    water_regions = Image.open(WATER_REGION_OUTPUT).convert("L")
    mask = Image.open(LAND_MASK).convert("L")
    if (
        land.size != coast.size
        or land.size != mask.size
        or land.size != land_material.size
        or land.size != terrain_height.size
        or land.size != terrain_slope.size
    ):
        raise RuntimeError("Land, mask, and coast assets do not share dimensions.")
    detail_size = (
        mask.width * DETAIL_SCALE,
        mask.height * DETAIL_SCALE,
    )
    if coast_detail.size != detail_size:
        raise RuntimeError("Detail coast field does not match the 4x world plane.")
    if land_detail.size != detail_size or terrain_contours.size != detail_size:
        raise RuntimeError("Terrain detail assets do not match the 4x world plane.")
    if coast_material.size != mask.size:
        raise RuntimeError("Coast material field does not match the world plane.")
    if water_regions.size != mask.size:
        raise RuntimeError("Water region field does not match the world plane.")
    land_alpha = np.asarray(land.getchannel("A"), dtype=np.uint8) >= 128
    accepted_silhouette = np.asarray(mask, dtype=np.uint8) >= 128
    if not np.array_equal(land_alpha, accepted_silhouette):
        raise RuntimeError(
            "Generated land silhouette differs from canonical geography."
        )
    land_array = np.asarray(mask, dtype=np.uint8) >= 128
    height_array = np.asarray(terrain_height, dtype=np.uint8)
    slope_array = np.asarray(terrain_slope, dtype=np.uint8)
    if np.any(height_array[~land_array] != 0):
        raise RuntimeError("Terrain height exists outside canonical land.")
    if np.any(slope_array[~land_array] != 0):
        raise RuntimeError("Terrain slope exists outside canonical land.")
    if int(np.max(height_array)) < 200:
        raise RuntimeError("Terrain height field has no meaningful highlands.")
    if int(np.max(slope_array)) < 96:
        raise RuntimeError("Terrain slope field has no meaningful relief.")
    region_array = np.asarray(water_regions, dtype=np.uint8)
    if np.any(region_array[land_array] != 0):
        raise RuntimeError("Water region field overlaps accepted land.")

    land_manifest = json.loads(LAND_MANIFEST.read_text(encoding="utf-8"))
    coast_manifest = json.loads(COAST_MANIFEST.read_text(encoding="utf-8"))
    coast_material_manifest = json.loads(
        COAST_MATERIAL_MANIFEST.read_text(encoding="utf-8"),
    )
    region_manifest = json.loads(
        WATER_REGION_MANIFEST.read_text(encoding="utf-8"),
    )
    water_manifest = json.loads(
        WATER_WORLD_MANIFEST.read_text(encoding="utf-8"),
    )
    if land_manifest["visual"]["sha256"] != sha256(LAND_OUTPUT):
        raise RuntimeError("Land manifest hash does not match the generated plate.")
    if (
        land_manifest["baseMaterial"]["sha256"]
        != sha256(LAND_MATERIAL_OUTPUT)
    ):
        raise RuntimeError("Land material hash does not match its manifest.")
    if (
        land_manifest["detailVisual"]["sha256"]
        != sha256(LAND_DETAIL_OUTPUT)
    ):
        raise RuntimeError("Land detail manifest hash does not match its plate.")
    if (
        land_manifest["topologyQa"]["sha256"]
        != sha256(TERRAIN_CONTOURS)
    ):
        raise RuntimeError("Topology QA manifest hash does not match its overlay.")
    if (
        land_manifest["fields"]["height"]["sha256"]
        != sha256(TERRAIN_HEIGHT)
        or land_manifest["fields"]["slope"]["sha256"]
        != sha256(TERRAIN_SLOPE)
    ):
        raise RuntimeError("Terrain field hashes do not match their manifest.")
    if (
        land_manifest["derivation"]["sourceSha256"]
        != sha256(TERRAIN_DEM_SOURCE)
        or land_manifest["derivation"]["authoringSha256"]
        != sha256(TERRAIN_DEM_MANIFEST)
    ):
        raise RuntimeError("Terrain source hashes do not match their manifest.")
    if coast_manifest["texture"]["sha256"] != sha256(COAST_OUTPUT):
        raise RuntimeError("Coast manifest hash does not match the generated field.")
    if coast_manifest["detailTexture"]["sha256"] != sha256(COAST_DETAIL_OUTPUT):
        raise RuntimeError("Detail coast manifest hash does not match its field.")
    if (
        coast_material_manifest["texture"]["sha256"]
        != sha256(COAST_MATERIAL_OUTPUT)
    ):
        raise RuntimeError("Coast material manifest hash does not match its field.")
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
    parser.add_argument(
        "--refresh-locked-water",
        action="store_true",
        help=(
            "Explicitly regenerate the accepted world-water albedo derivative. "
            "Terrain builds leave it untouched by default."
        ),
    )
    parser.add_argument(
        "--land-only",
        action="store_true",
        help=(
            "Regenerate terrain fields and land visuals without writing any "
            "water-owned derivative."
        ),
    )
    args = parser.parse_args()
    if args.check and args.refresh_locked_water:
        parser.error("--check and --refresh-locked-water are mutually exclusive.")
    if args.check and args.land_only:
        parser.error("--check and --land-only are mutually exclusive.")
    if args.land_only and args.refresh_locked_water:
        parser.error(
            "--land-only and --refresh-locked-water are mutually exclusive.",
        )
    if not args.check:
        mask = load_land_mask()
        height, slope = build_terrain_fields(mask)
        build_land_plate(mask, height, slope)
        if not args.land_only:
            build_coast_geometry(mask)
            build_coast_material_field(mask, height, slope)
            build_water_region_field(mask)
            if args.refresh_locked_water:
                build_water_world_albedo()
    verify()
    print(f"verified {LAND_OUTPUT.relative_to(ROOT)}")
    print(f"verified {COAST_OUTPUT.relative_to(ROOT)}")
    print(f"verified {COAST_MATERIAL_OUTPUT.relative_to(ROOT)}")
    print(f"verified {WATER_REGION_OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
