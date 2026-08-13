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
LAND_ROOT = PUBLIC / "terrain" / "authority"
OCEAN_AUTHORITY_ROOT = PUBLIC / "ocean" / "authority"
OCEAN_MOTION_ROOT = PUBLIC / "ocean" / "surface-motion"
WORLD_LIGHT_MANIFEST = (
    PUBLIC / "world-backdrop" / "manifests" / "world-light-r1.json"
)
LAND_MASK = LAND_ROOT / "masks" / "world-land-mask-r4.png"
TERRAIN_DEM_SOURCE = (
    LAND_ROOT / "sources" / "terrain-dem-authored-r3.png"
)
AUTHORED_LAND_SOURCE = (
    LAND_ROOT / "sources" / "world-land-surface-authored-r11.png"
)
AUTHORED_LAND_DETAIL_SOURCE = (
    LAND_ROOT
    / "sources"
    / "world-land-surface-authored-r11-detail-4x.png"
)
TERRAIN_DEM_MANIFEST = (
    LAND_ROOT / "manifests" / "terrain-dem-r4.json"
)
TERRAIN_HEIGHT = LAND_ROOT / "fields" / "terrain-height-r4.png"
TERRAIN_SLOPE = LAND_ROOT / "fields" / "terrain-slope-r4.png"
LAND_OUTPUT = LAND_ROOT / "textures" / "terrain-relief-r6.png"
LAND_DETAIL_OUTPUT = (
    LAND_ROOT / "textures" / "terrain-relief-r6-detail-4x.png"
)
TERRAIN_CONTOURS = (
    LAND_ROOT / "overlays" / "terrain-contours-r4-detail-4x.png"
)
LAND_MANIFEST = LAND_ROOT / "manifests" / "terrain-relief-r6.json"
COAST_OUTPUT = OCEAN_AUTHORITY_ROOT / "fields" / "coast-geometry-r5.png"
COAST_DETAIL_OUTPUT = OCEAN_AUTHORITY_ROOT / "fields" / "coast-geometry-r5-4x.png"
COAST_MANIFEST = OCEAN_AUTHORITY_ROOT / "manifests" / "coast-geometry-r5.json"
COAST_MATERIAL_OUTPUT = (
    OCEAN_AUTHORITY_ROOT / "fields" / "coast-material-field-r6.png"
)
COAST_MATERIAL_MANIFEST = (
    OCEAN_AUTHORITY_ROOT / "manifests" / "coast-material-field-r6.json"
)
WATER_REGIONS_MANIFEST = OCEAN_AUTHORITY_ROOT / "manifests" / "water-regions-r1.json"
WATER_WORLD_SOURCE = (
    OCEAN_MOTION_ROOT
    / "sources"
    / "water-surface-world-authored-r1.png"
)
WATER_WORLD_OUTPUT = (
    OCEAN_MOTION_ROOT
    / "textures"
    / "water-surface-world-lod-r2-3840x2160.png"
)
WATER_WORLD_MANIFEST = (
    OCEAN_MOTION_ROOT / "manifests" / "water-surface-world-lod-r2.json"
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
TERRAIN_CONTOUR_LEVELS = 12
INLAND_FERTILITY_WIDTH_PIXELS = 108.0
INLAND_FERTILITY_COLOR = (54.0, 110.0, 40.0)
INLAND_FERTILITY_STRENGTH = 0.52
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


def polyline_weight(
    width: int,
    height: int,
    points: list[list[float]],
    radius: float,
) -> np.ndarray:
    """Return an aspect-correct soft field around one authored polyline."""

    if len(points) < 2 or radius <= 0:
        raise RuntimeError("Mountain ranges require two points and a radius.")
    y, x = np.mgrid[0:height, 0:width]
    aspect = width / height
    sample_x = x.astype(np.float32) / max(width - 1, 1) * aspect
    sample_y = y.astype(np.float32) / max(height - 1, 1)
    distance_squared = np.full((height, width), np.inf, dtype=np.float32)
    authored = np.asarray(points, dtype=np.float32)
    authored[:, 0] *= aspect
    for start, end in zip(authored[:-1], authored[1:]):
        segment = end - start
        length_squared = float(np.dot(segment, segment))
        if length_squared <= 0:
            raise RuntimeError("Mountain range points must not repeat.")
        projection = np.clip(
            (
                (sample_x - start[0]) * segment[0]
                + (sample_y - start[1]) * segment[1]
            ) / length_squared,
            0.0,
            1.0,
        )
        nearest_x = start[0] + projection * segment[0]
        nearest_y = start[1] + projection * segment[1]
        candidate = (
            (sample_x - nearest_x) ** 2
            + (sample_y - nearest_y) ** 2
        )
        distance_squared = np.minimum(distance_squared, candidate)
    return np.exp(-0.5 * distance_squared / (radius * radius)).astype(
        np.float32,
    )


def mountain_range_field(width: int, height: int) -> np.ndarray:
    """Compile the declared mountain belts into one world-space field."""

    authoring = json.loads(TERRAIN_DEM_MANIFEST.read_text(encoding="utf-8"))
    ranges = authoring.get("mountainRanges", [])
    if not ranges:
        raise RuntimeError("Terrain authoring must declare mountain ranges.")
    field = np.zeros((height, width), dtype=np.float32)
    for mountain_range in ranges:
        weight = polyline_weight(
            width,
            height,
            mountain_range["points"],
            float(mountain_range["radius"]),
        )
        field = np.maximum(
            field,
            weight * float(mountain_range["strength"]),
        )
    return np.clip(field, 0.0, 1.0)


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

    # The painted DEM contains narrow summit traces, but those traces alone
    # read as veins when the world is viewed at map scale. The authored range
    # corridors establish the broad elevation mass first; the DEM then keeps
    # the irregular peaks and valleys within that mass.
    range_field = mountain_range_field(mask.width, mask.height)
    range_shoulders = smooth_unit((range_field - 0.04) / 0.70)
    range_core = smooth_unit((range_field - 0.25) / 0.65)
    range_elevation = range_shoulders * (0.24 + range_core * 0.54)
    height = np.maximum(height, range_elevation * land)

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
        "id": "career-world/coast-geometry@r5",
        "status": "phase-3-runtime",
        "coordinateSpace": "normalized-world-top-left",
        "dimensions": [mask.width, mask.height],
        "texture": {
            "path": "../fields/coast-geometry-r5.png",
            "sha256": sha256(COAST_OUTPUT),
            "mode": "RGBA",
        },
        "detailTexture": {
            "path": "../fields/coast-geometry-r5-4x.png",
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
            "path": "../../../terrain/authority/masks/world-land-mask-r4.png",
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


def coast_material_arrays(
    height: np.ndarray,
    slope: np.ndarray,
    land: np.ndarray,
    *,
    sample_scale: float = 1.0,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Return the one shared beach, cliff, rock, and substrate classification."""

    # The literal edge of a DEM trends toward sea level even when a mountain
    # reaches the coast. Inspect the near-coast approach as well as the edge
    # pixel so real cliff fronts do not collapse into a uniform beach rim.
    approach_radius = 7.0 * sample_scale
    approach_height = np.asarray(
        Image.fromarray(
            np.round(np.clip(height, 0.0, 1.0) * 255.0).astype(np.uint8),
            mode="L",
        ).filter(ImageFilter.GaussianBlur(approach_radius)),
        dtype=np.float32,
    ) / 255.0
    approach_slope = np.asarray(
        Image.fromarray(
            np.round(np.clip(slope, 0.0, 1.0) * 255.0).astype(np.uint8),
            mode="L",
        ).filter(ImageFilter.GaussianBlur(approach_radius)),
        dtype=np.float32,
    ) / 255.0
    classification_height = np.maximum(height, approach_height * 1.12)
    classification_slope = np.maximum(slope, approach_slope * 1.18)

    coast_height, coverage = continued_land_field(
        classification_height,
        land,
        SHELF_WIDTH_PIXELS * 0.9 * sample_scale,
    )
    coast_slope, _ = continued_land_field(
        classification_slope,
        land,
        SHELF_WIDTH_PIXELS * 0.9 * sample_scale,
    )
    substrate_height, _ = continued_land_field(
        height,
        land,
        SHELF_WIDTH_PIXELS * 0.9 * sample_scale,
    )
    support = smooth_unit(np.clip(coverage * 3.2, 0.0, 1.0))
    cliff_signal = coast_height * 0.72 + coast_slope * 0.58
    cliff = smooth_unit((cliff_signal - 0.34) / 0.42) * support
    beach = (
        smooth_unit((0.58 - coast_height) / 0.42)
        * smooth_unit((0.62 - coast_slope) / 0.5)
        * (1.0 - cliff)
        * support
    )
    rock = np.clip(support - beach - cliff, 0.0, 1.0)
    profile = substrate_height * support
    return beach, cliff, rock, profile


def build_coast_material_field(
    mask: Image.Image,
    height: np.ndarray,
    slope: np.ndarray,
) -> None:
    """Derive beach, rock, and cliff response from terrain topology."""

    land = np.asarray(mask.convert("L"), dtype=np.uint8) >= 128
    beach, cliff, _, profile = coast_material_arrays(height, slope, land)

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
        "id": "career-world/coast-material-field@r6",
        "status": "phase-3-runtime",
        "coordinateSpace": "normalized-world-top-left",
        "dimensions": [mask.width, mask.height],
        "texture": {
            "path": "../fields/coast-material-field-r6.png",
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
                "path": "../../../terrain/authority/fields/terrain-height-r4.png",
                "sha256": sha256(TERRAIN_HEIGHT),
            },
            "slope": {
                "path": "../../../terrain/authority/fields/terrain-slope-r4.png",
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


def rasterize_water_regions(mask: Image.Image) -> np.ndarray:
    """Rasterize authored hydrology regions into world-space RGB channels."""

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
    return field


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


def detail_micro_relief(width: int, height: int) -> np.ndarray:
    """Generate sub-world terrain relief for the territory plate only."""

    generator = np.random.default_rng(0xD37A11)
    grid = generator.integers(
        0,
        256,
        size=(max(24, height // 18), max(24, width // 18)),
        dtype=np.uint8,
    )
    noise = Image.fromarray(grid, mode="L").resize(
        (width, height),
        Image.Resampling.BICUBIC,
    )
    broad = noise.filter(ImageFilter.GaussianBlur(radius=9.0))
    return (
        np.asarray(noise, dtype=np.float32)
        - np.asarray(broad, dtype=np.float32)
    ) / 255.0


def build_inland_fertility_field(mask: Image.Image) -> np.ndarray:
    """Return a broad land-side moisture halo around classified inland water."""

    regions = rasterize_water_regions(mask)
    inland_water = np.any(regions >= 128, axis=-1)
    if not np.any(inland_water):
        return np.zeros((mask.height, mask.width), dtype=np.float32)
    distance = distance_from_feature(
        Image.fromarray(
            np.where(inland_water, 255, 0).astype(np.uint8),
            mode="L",
        ),
    ).astype(np.float32)
    land = np.asarray(mask.convert("L"), dtype=np.uint8) >= 128
    normalized = np.clip(
        1.0 - distance / INLAND_FERTILITY_WIDTH_PIXELS,
        0.0,
        1.0,
    )
    return np.where(land, smooth_unit(normalized), 0.0).astype(np.float32)


def render_terrain_material(
    height: np.ndarray,
    slope: np.ndarray,
    inland_fertility: np.ndarray,
    *,
    sample_scale: float,
) -> np.ndarray:
    """Scale one authored land material and add only LOD-local detail."""

    image_height, image_width = height.shape
    source_path = (
        AUTHORED_LAND_DETAIL_SOURCE
        if sample_scale > 1.0
        else AUTHORED_LAND_SOURCE
    )
    source = Image.open(source_path).convert("RGB")
    if source.size != (image_width, image_height):
        source = source.resize(
            (image_width, image_height),
            Image.Resampling.LANCZOS,
        )
    color = np.asarray(source, dtype=np.float32)

    # Inland water supports a restrained fertile halo without replacing the
    # authored material. This is a material tint, not a second texture style.
    fertile = np.asarray(INLAND_FERTILITY_COLOR, dtype=np.float32)
    fertility = (
        inland_fertility
        * smooth_unit((0.72 - height) / 0.5)
        * smooth_unit((0.78 - slope) / 0.55)
        * INLAND_FERTILITY_STRENGTH
    )
    color = (
        color * (1.0 - fertility[..., np.newaxis])
        + fertile[np.newaxis, np.newaxis, :] * fertility[..., np.newaxis]
    )

    # The territory plate receives new, world-registered micro relief instead
    # of merely enlarging the world pixels. Macro forms remain authored once.
    if sample_scale > 1.0:
        micro = detail_micro_relief(image_width, image_height)
        micro_gain = 3.5 + smooth_unit((slope - 0.08) / 0.66) * 3.0
        color += (micro * micro_gain)[..., np.newaxis]
    return np.clip(color, 0.0, 255.0).astype(np.float32)


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
    alpha = antialiased_land_alpha(mask)
    inland_fertility = build_inland_fertility_field(mask)
    base_material = render_terrain_material(
        height,
        slope,
        inland_fertility,
        sample_scale=1.0,
    )
    base_color = np.round(base_material).astype(np.uint8)
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
    detail_fertility = np.asarray(
        Image.fromarray(
            np.round(inland_fertility * 255.0).astype(np.uint8),
            mode="L",
        ).resize(detail_size, Image.Resampling.BICUBIC),
        dtype=np.float32,
    ) / 255.0
    micro_relief = detail_micro_relief(*detail_size)
    micro_strength = (
        0.018
        + smooth_unit((detail_slope - 0.08) / 0.58) * 0.032
    )
    detail_render_height = np.clip(
        detail_height + micro_relief * micro_strength * detail_land,
        0.0,
        1.0,
    )
    detail_material = render_terrain_material(
        detail_render_height,
        detail_slope,
        detail_fertility,
        sample_scale=DETAIL_SCALE,
    )
    detail_color = np.round(detail_material).astype(np.uint8)
    detail_color = np.asarray(
        Image.fromarray(detail_color, mode="RGB").filter(
            ImageFilter.UnsharpMask(
                radius=1.25,
                percent=112,
                threshold=2,
            ),
        ),
        dtype=np.uint8,
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
        "id": "career-world/terrain-relief@r6",
        "status": "phase-3-runtime",
        "projection": "orthographic-plan",
        "dimensions": [mask.width, mask.height],
        "visual": {
            "path": "../textures/terrain-relief-r6.png",
            "sha256": sha256(LAND_OUTPUT),
            "mode": "RGBA",
        },
        "detailVisual": {
            "path": "../textures/terrain-relief-r6-detail-4x.png",
            "sha256": sha256(LAND_DETAIL_OUTPUT),
            "dimensions": [
                mask.width * DETAIL_SCALE,
                mask.height * DETAIL_SCALE,
            ],
            "mode": "RGBA",
            "role": (
                "authored macro relief plus registered territory-only micro "
                "relief; no later-layer environment or structure decoration"
            ),
        },
        "topologyQa": {
            "path": "../overlays/terrain-contours-r4-detail-4x.png",
            "sha256": sha256(TERRAIN_CONTOURS),
            "dimensions": [
                mask.width * DETAIL_SCALE,
                mask.height * DETAIL_SCALE,
            ],
            "mode": "RGBA",
        },
        "mask": {
            "path": "../masks/world-land-mask-r4.png",
            "sha256": sha256(LAND_MASK),
        },
        "fields": {
            "height": {
                "path": "../fields/terrain-height-r4.png",
                "sha256": sha256(TERRAIN_HEIGHT),
                "mode": "L",
            },
            "slope": {
                "path": "../fields/terrain-slope-r4.png",
                "sha256": sha256(TERRAIN_SLOPE),
                "mode": "L",
            },
        },
        "derivation": {
            "source": "../sources/terrain-dem-authored-r3.png",
            "sourceSha256": sha256(TERRAIN_DEM_SOURCE),
            "authoredSurfaceSource": (
                "../sources/world-land-surface-authored-r11.png"
            ),
            "authoredSurfaceSourceSha256": sha256(AUTHORED_LAND_SOURCE),
            "authoredSurfaceDetailSource": (
                "../sources/world-land-surface-authored-r11-detail-4x.png"
            ),
            "authoredSurfaceDetailSourceSha256": sha256(
                AUTHORED_LAND_DETAIL_SOURCE
            ),
            "authoring": "terrain-dem-r4.json",
            "authoringSha256": sha256(TERRAIN_DEM_MANIFEST),
            "operation": (
                "mask one authored land-and-coast material with canonical "
                "geography; preserve five future development shelves in the "
                "separate topology field; add registered territory-only micro "
                "relief; publish topology QA and coast response derivatives"
            ),
            "worldLightDirection": world_light_direction(),
            "authoredSurfaceTexture": True,
            "materialRecipe": (
                "single authored bas-relief surface with connected mountain "
                "massifs, foothills, plains, and terrain-specific beach, rock "
                "shelf, and cliff stretches; hydrology-derived inland fertility "
                "tint; no pasted line-art pass and no structure marks"
            ),
            "inlandFertilityWidthPixels": INLAND_FERTILITY_WIDTH_PIXELS,
            "inlandFertilityColor": list(INLAND_FERTILITY_COLOR),
            "inlandFertilityStrength": INLAND_FERTILITY_STRENGTH,
            "detailPolicy": (
                "world and territory plates share one authored macro material; "
                "the territory plate adds deterministic registered micro relief"
            ),
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
        AUTHORED_LAND_SOURCE,
        TERRAIN_DEM_MANIFEST,
        TERRAIN_HEIGHT,
        TERRAIN_SLOPE,
        LAND_OUTPUT,
        LAND_DETAIL_OUTPUT,
        TERRAIN_CONTOURS,
        LAND_MANIFEST,
        COAST_OUTPUT,
        COAST_DETAIL_OUTPUT,
        COAST_MANIFEST,
        COAST_MATERIAL_OUTPUT,
        COAST_MATERIAL_MANIFEST,
        WATER_REGIONS_MANIFEST,
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
    terrain_contours = Image.open(TERRAIN_CONTOURS).convert("RGBA")
    terrain_height = Image.open(TERRAIN_HEIGHT).convert("L")
    terrain_slope = Image.open(TERRAIN_SLOPE).convert("L")
    coast = Image.open(COAST_OUTPUT).convert("RGBA")
    coast_detail = Image.open(COAST_DETAIL_OUTPUT).convert("RGBA")
    coast_material = Image.open(COAST_MATERIAL_OUTPUT).convert("RGB")
    mask = Image.open(LAND_MASK).convert("L")
    if (
        land.size != coast.size
        or land.size != mask.size
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
    land_alpha = np.asarray(
        land.getchannel("A").point(
            lambda value: 255 if value >= 128 else 0,
        ),
        dtype=np.uint8,
    ) >= 128
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
    land_manifest = json.loads(LAND_MANIFEST.read_text(encoding="utf-8"))
    coast_manifest = json.loads(COAST_MANIFEST.read_text(encoding="utf-8"))
    coast_material_manifest = json.loads(
        COAST_MATERIAL_MANIFEST.read_text(encoding="utf-8"),
    )
    water_manifest = json.loads(
        WATER_WORLD_MANIFEST.read_text(encoding="utf-8"),
    )
    if land_manifest["visual"]["sha256"] != sha256(LAND_OUTPUT):
        raise RuntimeError("Land manifest hash does not match the generated plate.")
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
        or land_manifest["derivation"]["authoredSurfaceSourceSha256"]
        != sha256(AUTHORED_LAND_SOURCE)
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
    parser.add_argument(
        "--water-derivatives-only",
        action="store_true",
        help=(
            "Regenerate only mask-owned coast geometry, coast material, and "
            "water-region fields from the existing terrain height/slope "
            "fields. This does not rewrite accepted land artwork."
        ),
    )
    args = parser.parse_args()
    selected_modes = sum((
        bool(args.check),
        bool(args.land_only),
        bool(args.water_derivatives_only),
    ))
    if selected_modes > 1:
        parser.error(
            "--check, --land-only, and --water-derivatives-only are mutually "
            "exclusive.",
        )
    if args.water_derivatives_only and args.refresh_locked_water:
        parser.error(
            "--water-derivatives-only cannot refresh the locked water albedo.",
        )
    if args.check and args.refresh_locked_water:
        parser.error("--check and --refresh-locked-water are mutually exclusive.")
    if args.land_only and args.refresh_locked_water:
        parser.error(
            "--land-only and --refresh-locked-water are mutually exclusive.",
        )
    if args.water_derivatives_only:
        mask = load_land_mask()
        height_image = Image.open(TERRAIN_HEIGHT).convert("L")
        slope_image = Image.open(TERRAIN_SLOPE).convert("L")
        if height_image.size != mask.size or slope_image.size != mask.size:
            raise RuntimeError(
                "Existing terrain fields do not match the canonical land mask.",
            )
        height = np.asarray(height_image, dtype=np.float32) / 255.0
        slope = np.asarray(slope_image, dtype=np.float32) / 255.0
        build_coast_geometry(mask)
        build_coast_material_field(mask, height, slope)
    elif not args.check:
        mask = load_land_mask()
        height, slope = build_terrain_fields(mask)
        build_land_plate(mask, height, slope)
        if not args.land_only:
            build_coast_geometry(mask)
            build_coast_material_field(mask, height, slope)
            if args.refresh_locked_water:
                build_water_world_albedo()
    verify()
    print(f"verified {LAND_OUTPUT.relative_to(ROOT)}")
    print(f"verified {COAST_OUTPUT.relative_to(ROOT)}")
    print(f"verified {COAST_MATERIAL_OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
