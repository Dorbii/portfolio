from __future__ import annotations

import hashlib
import json
import math
import time
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter


REPO = Path(__file__).resolve().parents[1]
LAYOUT_PATH = (
    REPO
    / "art-source/career-world/ninjaone-capital/city-layer-r1/"
    "concept-master-layout-registration-r1.json"
)
REFERENCE_PATH = (
    REPO
    / "public/career-world/capitals/ninjaone/city-r1/references/"
    "capital-master-direction-r1.png"
)
SELECTED_SOURCE_PATH = (
    REPO
    / "art-source/career-world/ninjaone-capital/city-layer-r1/city-fabric/"
    "city-concept-environment-source-chroma-r1.png"
)
REGIONAL_TERRAIN_PATH = (
    REPO
    / "art-source/career-world/ninjaone-environment/production-r2/"
    "ninjaone-environment-terrain-master-detail-r2.png"
)
FABRIC_ROOT = (
    REPO / "public/career-world/capitals/ninjaone/city-r1/fabric"
)
QA_ROOT = REPO / "public/career-world/capitals/ninjaone/city-r1/qa"
OVERLAY_PATH = FABRIC_ROOT / "city-concept-environment-source-r1.png"
PROOF_PATH = QA_ROOT / "city-concept-environment-substrate-proof-r1.png"
ALPHA_PATH = QA_ROOT / "city-concept-environment-substrate-alpha-r1.png"
VALIDATION_PATH = QA_ROOT / "city-concept-environment-substrate-r1.validation.json"
SELECTED_OVERLAY_PATH = FABRIC_ROOT / "city-selected-environment-source-alpha-r1.png"
SELECTED_PROOF_PATH = QA_ROOT / "city-selected-environment-substrate-proof-r1.png"
SELECTED_ALPHA_PATH = QA_ROOT / "city-selected-environment-substrate-alpha-r1.png"
APERTURED_OVERLAY_PATH = FABRIC_ROOT / "city-selected-environment-apertured-r1.png"
NODE_FOREGROUND_PATH = FABRIC_ROOT / "city-node-transition-foreground-r1.png"
WATER_TRANSITION_PATH = FABRIC_ROOT / "city-water-transition-foreground-r1.png"
CAPITAL_COHERENT_BASE_PATH = FABRIC_ROOT / "city-capital-coherent-base-r1.png"
RAIL_SEGMENT_SOURCE_PATH = (
    REPO
    / "art-source/career-world/ninjaone-capital/city-layer-r1/transport/"
    "rail-perspective-segment-atlas-chroma-r1.png"
)
RAIL_SEGMENT_ALPHA_PATH = FABRIC_ROOT / "rail-perspective-segment-atlas-alpha-r1.png"
RAIL_SUPPORT_PATH = FABRIC_ROOT / "city-rail-mountain-route-support-r1.png"
RAIL_BED_PATH = FABRIC_ROOT / "city-rail-mountain-route-bed-r1.png"
RAIL_PORTAL_BACK_PATH = FABRIC_ROOT / "city-rail-tunnel-backs-r1.png"
RAIL_TRACK_PATH = FABRIC_ROOT / "city-rail-mountain-route-track-r1.png"
RAIL_PORTAL_FOREGROUND_PATH = FABRIC_ROOT / "city-rail-tunnel-foreground-r1.png"
RAIL_STATION_FOREGROUND_PATH = FABRIC_ROOT / "city-rail-station-platform-track-r1.png"
NODE_PROOF_PATH = QA_ROOT / "city-selected-environment-node-scale-proof-r1.png"
NODE_INTEGRATED_PROOF_PATH = (
    QA_ROOT / "city-selected-environment-node-integrated-proof-r1.png"
)
WATER_TRANSITION_PROOF_PATH = (
    QA_ROOT / "city-water-transition-layer-proof-r1.png"
)
CAPITAL_COHERENT_BASE_PROOF_PATH = (
    QA_ROOT / "city-capital-coherent-base-proof-r1.png"
)
RAIL_INTEGRATED_PROOF_PATH = (
    QA_ROOT / "city-selected-environment-rail-integrated-proof-r1.png"
)
RAIL_REGISTRATION_QA_PATH = QA_ROOT / "city-rail-mountain-route-registration-r1.png"
APERTURE_QA_PATH = QA_ROOT / "city-selected-environment-node-apertures-r1.png"
SUMMIT_OWNERSHIP_QA_PATH = QA_ROOT / "city-summit-placeholder-ownership-r1.png"
POPULATION_ROOT = (
    REPO / "public/career-world/capitals/ninjaone/city-r1/population"
)
POPULATION_SITE_LAYER_PATH = (
    POPULATION_ROOT / "temporary-fantasy-population-site-r1.png"
)
POPULATION_CLOSE_LAYER_PATH = (
    POPULATION_ROOT / "temporary-fantasy-population-close-supplement-r1.png"
)
POPULATION_SITE_PROOF_PATH = (
    QA_ROOT / "city-selected-environment-population-site-proof-r1.png"
)
POPULATION_CLOSE_PROOF_PATH = (
    QA_ROOT / "city-selected-environment-population-close-proof-r1.png"
)
POPULATION_CLOSEUP_QA_PATH = (
    QA_ROOT / "city-population-species-scale-closeups-r1.png"
)
CITY_MANIFEST_PATH = (
    REPO
    / "public/career-world/capitals/ninjaone/manifests/"
    "city-node-composition-r1.json"
)
STATION_PATH = (
    REPO
    / "public/career-world/shared-assets/transportation/train/stations/"
    "ninjaone-intercity-station-r2.png"
)
INFRASTRUCTURE_ATLAS_PATH = (
    REPO
    / "art-source/career-world/ninjaone-capital/city-layer-r1/city-fabric/"
    "infrastructure-transition-atlas-alpha-r2.png"
)
BRIDGE_ATLAS_PATH = (
    REPO
    / "art-source/career-world/ninjaone-capital/city-layer-r1/city-fabric/"
    "city-bridge-atlas-alpha-r1.png"
)
BRIDGE_STEEP_PATH = (
    REPO
    / "art-source/career-world/ninjaone-capital/city-layer-r1/city-fabric/"
    "city-bridge-steep-alpha-r1.png"
)
INLAND_WATER_MANIFEST_PATH = (
    REPO
    / "public/career-world/capitals/ninjaone/environment/manifests/"
    "inland-water-r1.json"
)

ARTBOARD = (2571, 1929)
EXPECTED_REFERENCE_SHA256 = (
    "dc94cc3c90eaf3a20976f5eeb4d0622a491782682837eefdce6d97f62c45d308"
)
EXPECTED_REGIONAL_TERRAIN_SHA256 = (
    "49142b55478362e85a02e14345859089a78bd01b49a3126d84ff1df7cb283b02"
)
EXPECTED_SELECTED_SOURCE_SHA256 = (
    "0c94ae6f6bf9aac91a0c8f9a880b54d95bed1d9a6bb340967c162a2ff5d5f5b5"
)
EXPECTED_INFRASTRUCTURE_ATLAS_SHA256 = (
    "f48b2fd0da75cdfb477bf174debac1de3d8a9e838a0906875c4daeed98a8b9bb"
)
EXPECTED_BRIDGE_ATLAS_SHA256 = (
    "dc49fe8d16ec245999b983e48b1e1766052486dad00ef7b2cedddba24c838a62"
)
EXPECTED_BRIDGE_STEEP_SHA256 = (
    "ce104fe8954417334d6de254da7e1c1748b7d9e7ad2426705cca1ffd54b5c67a"
)
EXPECTED_RAIL_SEGMENT_SOURCE_SHA256 = (
    "83ae9b929e8131dc0ea12febede5279a6e12ecd66cfb17213281e91c122c92d8"
)
EXPECTED_RAIL_SEGMENT_ALPHA_SHA256 = (
    "2fa88e2728f3cc8b06bd86fd0520f1a6c2b8c30663bac5872d0eb06269875ed8"
)
# Node and station scale authority lives in city-node-composition-r1.json.
# The manifest already preserves the pre-B1 world-units-per-pixel calibration
# and publishes an individual displayWidth for every building. Coarse layout
# classes remain hierarchy labels only; they must not rescale the artwork.
NODE_SCALE_AUTHORITY = "city-node-manifest-displayWidth"

# The concept plate already paints a complete generic summit citadel. That
# placeholder is much taller and wider than the independent AI / Agent Systems
# node, so the ordinary footprint aperture cannot establish single ownership.
# This source-registration polygon removes only the baked upper building mass;
# the lower retaining wall, stairs, civic loop, foliage, and cliff remain owned
# by the concept plate and its transition foreground.
SUMMIT_PLACEHOLDER_OWNERSHIP_POLYGON: tuple[tuple[float, float], ...] = (
    (0.395, 0.225),
    (0.395, 0.018),
    (0.570, 0.018),
    (0.570, 0.225),
)

# Direction-specific source-camera pieces only. No raster is arbitrarily
# rotated or stretched. The two chains deliberately do not meet: their gap is
# the accepted hidden mountain tunnel between the two registered portals.
RAIL_SURFACE_CHAINS: tuple[tuple[dict[str, Any], ...], ...] = (
    (
        {
            "id": "station-portal-straight",
            "cell": (0, 0),
            "conceptCenter": (0.374, 0.460),
            "displayWidth": 150,
            "kind": "ground-straight-nw-se",
        },
        {
            "id": "station-terminal-curve",
            "cell": (2, 0),
            "conceptCenter": (0.418, 0.508),
            "displayWidth": 146,
            "kind": "ground-curve-nw-sse",
        },
    ),
    (
        {
            "id": "south-portal-curve",
            "cell": (2, 0),
            "conceptCenter": (0.315, 0.560),
            "displayWidth": 146,
            "kind": "ground-curve-nw-sse",
        },
        {
            "id": "south-ravine-viaduct-curve",
            "cell": (2, 1),
            "conceptCenter": (0.348, 0.627),
            "displayWidth": 157,
            "kind": "elevated-curve-sse",
        },
        {
            "id": "south-ravine-viaduct",
            "cell": (1, 1),
            "conceptCenter": (0.392, 0.700),
            "displayWidth": 157,
            "kind": "elevated-straight-nw-se",
        },
        {
            "id": "south-egress-1",
            "cell": (0, 0),
            "conceptCenter": (0.4440, 0.731),
            "displayWidth": 150,
            "kind": "ground-straight-nw-se",
        },
        {
            "id": "south-egress-2",
            "cell": (0, 0),
            "conceptCenter": (0.4915, 0.772),
            "displayWidth": 150,
            "kind": "ground-straight-nw-se",
        },
        {
            "id": "south-egress-3",
            "cell": (0, 0),
            "conceptCenter": (0.5390, 0.813),
            "displayWidth": 150,
            "kind": "ground-straight-nw-se",
        },
        {
            "id": "south-egress-4",
            "cell": (0, 0),
            "conceptCenter": (0.5865, 0.854),
            "displayWidth": 150,
            "kind": "ground-straight-nw-se",
        },
        {
            "id": "south-egress-5",
            "cell": (0, 0),
            "conceptCenter": (0.6340, 0.895),
            "displayWidth": 150,
            "kind": "ground-straight-nw-se",
        },
        {
            "id": "south-egress-6",
            "cell": (0, 0),
            "conceptCenter": (0.6815, 0.936),
            "displayWidth": 150,
            "kind": "ground-straight-nw-se",
        },
        {
            "id": "south-egress-7",
            "cell": (0, 0),
            "conceptCenter": (0.7290, 0.977),
            "displayWidth": 150,
            "kind": "ground-straight-nw-se",
        },
        {
            "id": "south-southeast-exit",
            "cell": (0, 0),
            "conceptCenter": (0.7765, 1.018),
            "displayWidth": 150,
            "kind": "ground-straight-nw-se",
        },
    ),
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def save_png_atomic(image: Image.Image, path: Path) -> None:
    """Replace generated PNGs without truncating a file the dev server reads."""
    temporary = path.with_name(f"{path.stem}.generating{path.suffix}")
    image.save(temporary, optimize=True)
    for attempt in range(8):
        try:
            temporary.replace(path)
            return
        except PermissionError:
            if attempt == 7:
                raise
            time.sleep(0.075 * (attempt + 1))


def pixel(point: list[float] | tuple[float, float]) -> tuple[int, int]:
    return round(point[0] * ARTBOARD[0]), round(point[1] * ARTBOARD[1])


def bridge_endpoints(landmark: dict[str, Any]) -> tuple[tuple[int, int], tuple[int, int]]:
    center = pixel(landmark["conceptPosition"])
    angle = math.radians(landmark["angleDegrees"])
    half_length = round(landmark["halfLengthNormalized"] * ARTBOARD[0])
    delta_x = math.cos(angle) * half_length
    delta_y = math.sin(angle) * half_length
    return (
        (round(center[0] - delta_x), round(center[1] - delta_y)),
        (round(center[0] + delta_x), round(center[1] + delta_y)),
    )


def chroma_key_selected_source(source: Image.Image) -> Image.Image:
    """Key the non-uniform ImageGen magenta and borrow real edge material RGB."""
    rgb = np.asarray(source.convert("RGB"), dtype=np.int16)
    red = rgb[:, :, 0]
    green = rgb[:, :, 1]
    blue = rgb[:, :, 2]
    chroma = np.minimum(red, blue) - green
    imbalance = np.abs(red - blue)
    brightness = (red + blue) / 2.0
    score = chroma - imbalance * 0.35 + (brightness - 120.0) * 0.15
    eligible = (red >= 110) & (blue >= 105) & (chroma >= 30)
    alpha = np.full(red.shape, 255, dtype=np.uint8)
    soft = np.clip((112.0 - score) * 255.0 / 62.0, 0.0, 255.0)
    alpha[eligible] = soft[eligible].astype(np.uint8)

    clean = rgb.astype(np.float32)
    assigned = alpha >= 248
    pending = (alpha > 0) & ~assigned
    height, width = alpha.shape
    for _ in range(10):
        if not pending.any():
            break
        color_sum = np.zeros((height, width, 3), dtype=np.float32)
        sample_count = np.zeros((height, width), dtype=np.float32)
        for delta_y, delta_x in (
            (-1, -1), (-1, 0), (-1, 1),
            (0, -1), (0, 1),
            (1, -1), (1, 0), (1, 1),
        ):
            source_y = slice(max(0, -delta_y), min(height, height - delta_y))
            source_x = slice(max(0, -delta_x), min(width, width - delta_x))
            target_y = slice(max(0, delta_y), min(height, height + delta_y))
            target_x = slice(max(0, delta_x), min(width, width + delta_x))
            neighbor_mask = assigned[source_y, source_x]
            color_sum[target_y, target_x] += (
                clean[source_y, source_x] * neighbor_mask[:, :, None]
            )
            sample_count[target_y, target_x] += neighbor_mask
        fill = pending & (sample_count > 0)
        if not fill.any():
            break
        clean[fill] = color_sum[fill] / sample_count[fill, None]
        assigned[fill] = True
        pending = (alpha > 0) & ~assigned

    clean[alpha == 0] = 0
    result = Image.fromarray(np.clip(clean, 0, 255).astype(np.uint8), "RGB").convert("RGBA")
    result.putalpha(Image.fromarray(alpha, "L"))
    return result


def magenta_key_hue_mask(
    red: np.ndarray,
    green: np.ndarray,
    blue: np.ndarray,
) -> np.ndarray:
    """Catch both the bright key and its dark antialiased plum remnants."""
    return (
        (np.minimum(red, blue) - green >= 4)
        & (np.maximum(red, blue) >= 12)
    )


def decontaminate_magenta_edges(source: Image.Image) -> tuple[Image.Image, int, int]:
    """Replace only keyed-edge magenta RGB while preserving alpha exactly."""
    rgba = np.asarray(source.convert("RGBA"), dtype=np.uint8).copy()
    red = rgba[:, :, 0].astype(np.int16)
    green = rgba[:, :, 1].astype(np.int16)
    blue = rgba[:, :, 2].astype(np.int16)
    alpha = rgba[:, :, 3]
    magenta_rgb = magenta_key_hue_mask(red, green, blue)
    contaminated = (
        magenta_rgb
        & (alpha >= 8)
    )
    contamination_count = int(contaminated.sum())
    if contamination_count == 0:
        rgba[alpha == 0, :3] = 0
        return Image.fromarray(rgba, "RGBA"), 0, 0

    clean = rgba[:, :, :3].astype(np.float32)
    assigned = (alpha >= 32) & ~magenta_rgb
    pending = contaminated.copy()
    height, width = alpha.shape
    for _ in range(32):
        if not pending.any():
            break
        color_sum = np.zeros((height, width, 3), dtype=np.float32)
        sample_count = np.zeros((height, width), dtype=np.float32)
        for delta_y, delta_x in (
            (-1, -1), (-1, 0), (-1, 1),
            (0, -1), (0, 1),
            (1, -1), (1, 0), (1, 1),
        ):
            source_y = slice(max(0, -delta_y), min(height, height - delta_y))
            source_x = slice(max(0, -delta_x), min(width, width - delta_x))
            target_y = slice(max(0, delta_y), min(height, height + delta_y))
            target_x = slice(max(0, delta_x), min(width, width + delta_x))
            neighbor_mask = assigned[source_y, source_x]
            color_sum[target_y, target_x] += (
                clean[source_y, source_x] * neighbor_mask[:, :, None]
            )
            sample_count[target_y, target_x] += neighbor_mask
        fill = pending & (sample_count > 0)
        if not fill.any():
            break
        clean[fill] = color_sum[fill] / sample_count[fill, None]
        assigned[fill] = True
        pending[fill] = False

    removed_unassigned_chroma = int(pending.sum())
    if pending.any():
        alpha[pending] = 0
        clean[pending] = 0
    clean_red = clean[:, :, 0].astype(np.int16)
    clean_green = clean[:, :, 1].astype(np.int16)
    clean_blue = clean[:, :, 2].astype(np.int16)
    residual_chroma = (
        magenta_key_hue_mask(clean_red, clean_green, clean_blue)
        & (alpha >= 8)
    )
    if residual_chroma.any():
        removed_unassigned_chroma += int(residual_chroma.sum())
        alpha[residual_chroma] = 0
        clean[residual_chroma] = 0
    rgba[:, :, :3] = np.clip(clean, 0, 255).astype(np.uint8)
    rgba[alpha == 0, :3] = 0
    return Image.fromarray(rgba, "RGBA"), contamination_count, removed_unassigned_chroma


def magenta_edge_pixel_count(source: Image.Image) -> int:
    rgba = np.asarray(source.convert("RGBA"), dtype=np.uint8)
    red = rgba[:, :, 0].astype(np.int16)
    green = rgba[:, :, 1].astype(np.int16)
    blue = rgba[:, :, 2].astype(np.int16)
    alpha = rgba[:, :, 3]
    return int(
        (
            magenta_key_hue_mask(red, green, blue)
            & (alpha >= 8)
        ).sum()
    )


def decontaminate_plum_silhouette(
    source: Image.Image,
) -> tuple[Image.Image, int, int]:
    """Neutralize dark red-purple key remnants only on the outer silhouette."""
    rgba = np.asarray(source.convert("RGBA"), dtype=np.uint8).copy()
    alpha = rgba[:, :, 3]
    binary = Image.fromarray(
        np.where(alpha >= 8, 255, 0).astype(np.uint8),
        "L",
    )
    eroded = np.asarray(binary.filter(ImageFilter.MinFilter(11)), dtype=np.uint8)
    boundary = (alpha >= 8) & (eroded < 255)
    hsv = np.asarray(source.convert("HSV"), dtype=np.uint8)
    hue = hsv[:, :, 0]
    saturation = hsv[:, :, 1]
    value = hsv[:, :, 2]
    plum = (
        boundary
        & (hue >= 220)
        & (saturation >= 24)
        & (value <= 205)
    )
    plum_before = int(plum.sum())
    if plum_before == 0:
        return Image.fromarray(rgba, "RGBA"), 0, 0

    clean = rgba[:, :, :3].astype(np.float32)
    assigned = (alpha >= 32) & ~plum
    pending = plum.copy()
    height, width = alpha.shape
    for _ in range(16):
        if not pending.any():
            break
        color_sum = np.zeros((height, width, 3), dtype=np.float32)
        sample_count = np.zeros((height, width), dtype=np.float32)
        for delta_y, delta_x in (
            (-1, -1), (-1, 0), (-1, 1),
            (0, -1), (0, 1),
            (1, -1), (1, 0), (1, 1),
        ):
            source_y = slice(max(0, -delta_y), min(height, height - delta_y))
            source_x = slice(max(0, -delta_x), min(width, width - delta_x))
            target_y = slice(max(0, delta_y), min(height, height + delta_y))
            target_x = slice(max(0, delta_x), min(width, width + delta_x))
            neighbor_mask = assigned[source_y, source_x]
            color_sum[target_y, target_x] += (
                clean[source_y, source_x] * neighbor_mask[:, :, None]
            )
            sample_count[target_y, target_x] += neighbor_mask
        fill = pending & (sample_count > 0)
        if not fill.any():
            break
        clean[fill] = color_sum[fill] / sample_count[fill, None]
        assigned[fill] = True
        pending[fill] = False

    unresolved = int(pending.sum())
    if pending.any():
        fallback_neutral = (
            clean[:, :, 0] * 0.299
            + clean[:, :, 1] * 0.587
            + clean[:, :, 2] * 0.114
        )
        clean[pending] = fallback_neutral[pending][:, None]
    probe_rgb = np.clip(clean, 0, 255).astype(np.uint8)
    probe_hsv = np.asarray(
        Image.fromarray(probe_rgb, "RGB").convert("HSV"),
        dtype=np.uint8,
    )
    residual_plum = (
        boundary
        & (alpha >= 8)
        & (probe_hsv[:, :, 0] >= 220)
        & (probe_hsv[:, :, 1] >= 24)
        & (probe_hsv[:, :, 2] <= 205)
    )
    if residual_plum.any():
        neutral = (
            clean[:, :, 0] * 0.299
            + clean[:, :, 1] * 0.587
            + clean[:, :, 2] * 0.114
        )
        clean[residual_plum] = neutral[residual_plum][:, None]
    rgba[:, :, :3] = np.clip(clean, 0, 255).astype(np.uint8)
    rgba[:, :, 3] = alpha
    rgba[alpha == 0, :3] = 0
    return Image.fromarray(rgba, "RGBA"), plum_before, unresolved


def build_city_mask(
    layout: dict[str, Any],
    terrain_alpha: Image.Image,
) -> tuple[Image.Image, Image.Image, Image.Image]:
    core = Image.new("L", ARTBOARD, 0)
    draw = ImageDraw.Draw(core)

    for district in layout["districts"]:
        draw.polygon(
            [pixel(point) for point in district["conceptPolygon"]],
            fill=255,
        )

    station = next(
        landmark
        for landmark in layout["landmarks"]
        if landmark["id"] == "intercity-station"
    )
    station_center = pixel(station["conceptVisualCenter"])
    station_width = round(station["targetVisibleEnvelope"][0] * ARTBOARD[0] * 1.28)
    station_height = round(station["targetVisibleEnvelope"][1] * ARTBOARD[1] * 1.32)
    draw.ellipse(
        (
            station_center[0] - station_width // 2,
            station_center[1] - station_height // 2,
            station_center[0] + station_width // 2,
            station_center[1] + station_height // 2,
        ),
        fill=255,
    )

    # Keep the accepted districts visually continuous at city-detail scale.
    # Do not expand the selected source along the hydrology spine: that earlier
    # shortcut admitted large source-plate fragments into open water. Water
    # crossings have their own registered bridge corridors below.
    draw.line(
        [
            pixel((0.447, 0.210)),
            pixel((0.438, 0.520)),
            pixel((0.675, 0.555)),
            pixel((0.700, 0.835)),
        ],
        fill=255,
        width=150,
        joint="curve",
    )

    core = core.filter(ImageFilter.MaxFilter(41))
    core = core.filter(ImageFilter.GaussianBlur(12))
    land_city = ImageChops.multiply(core, terrain_alpha)

    # Towers, cliff lips, and isometric retaining walls may legitimately
    # overhang the terrain alpha, but only near supported terrain. A bounded
    # dilation preserves those silhouettes without permitting district-wide
    # leakage into the coast.
    terrain_overhang_support = terrain_alpha.filter(ImageFilter.MaxFilter(81))
    supported_selected_city = ImageChops.multiply(core, terrain_overhang_support)

    bridge_mask = Image.new("L", ARTBOARD, 0)
    bridge_draw = ImageDraw.Draw(bridge_mask)
    for landmark in layout["landmarks"]:
        if landmark["kind"] != "bridge":
            continue
        bridge_draw.line(
            bridge_endpoints(landmark),
            fill=255,
            width=74,
        )
    bridge_mask = bridge_mask.filter(ImageFilter.GaussianBlur(7))
    return (
        ImageChops.lighter(land_city, bridge_mask),
        bridge_mask,
        ImageChops.lighter(supported_selected_city, bridge_mask),
    )


def build_registered_inland_water_mask() -> Image.Image:
    manifest = json.loads(INLAND_WATER_MANIFEST_PATH.read_text(encoding="utf-8"))
    if (
        manifest["id"] != "career-world/capitals/ninjaone/inland-water@r1"
        or manifest["status"] != "production-runtime"
    ):
        raise RuntimeError("Unexpected inland-water runtime authority.")

    field_record = manifest["field"]
    ownership_record = manifest["terrainEraseMask"]
    field_path = public_asset_path(field_record["path"])
    ownership_path = public_asset_path(ownership_record["path"])
    if sha256(field_path).upper() != field_record["sha256"].upper():
        raise RuntimeError("Inland-water field hash drift.")
    if sha256(ownership_path).upper() != ownership_record["sha256"].upper():
        raise RuntimeError("Inland-water ownership hash drift.")

    with Image.open(field_path) as source:
        field_red = source.convert("RGBA").getchannel("R")
    with Image.open(ownership_path) as source:
        ownership_red = source.convert("RGBA").getchannel("R")
    ownership_dimensions = tuple(ownership_record["dimensions"])
    if ownership_red.size != ownership_dimensions:
        raise RuntimeError("Inland-water ownership dimensions drift.")
    field_red = field_red.resize(ownership_dimensions, Image.Resampling.BILINEAR)

    field_pixels = np.asarray(field_red, dtype=np.uint8)
    ownership_pixels = np.asarray(ownership_red, dtype=np.uint8)
    owned_water = (
        (field_pixels >= 128)
        & (ownership_pixels >= 8)
    ).astype(np.uint8) * 255
    crop_mask = Image.fromarray(owned_water, "L")

    full_dimensions = tuple(field_record["artboardDimensions"])
    crop = field_record["artboardCrop"]
    if crop[2:] != list(ownership_dimensions):
        raise RuntimeError("Inland-water crop and ownership dimensions disagree.")
    full_mask = Image.new("L", full_dimensions, 0)
    full_mask.paste(crop_mask, (crop[0], crop[1]))
    registered = full_mask.resize(ARTBOARD, Image.Resampling.LANCZOS)
    return registered.point(lambda value: 255 if value >= 96 else 0)


def build_water_transition_layer(
    selected: Image.Image,
    bridge_mask: Image.Image,
    water_mask: Image.Image,
    layout: dict[str, Any],
) -> tuple[Image.Image, dict[str, Any]]:
    water_manifest = json.loads(
        INLAND_WATER_MANIFEST_PATH.read_text(encoding="utf-8")
    )
    hard_water = water_mask.point(lambda value: 255 if value >= 128 else 0)
    hard_bridge = bridge_mask.point(lambda value: 255 if value >= 32 else 0)

    # The selected concept source remains layout evidence only. Even a narrow
    # shoreline crop repaints the frozen production terrain with pixels from a
    # different terrain plate, so this runtime layer may contain only isolated
    # bridge assets. Bank transitions need their own terrain-owned authoring pass.
    shoreline_reach = hard_water.filter(ImageFilter.MaxFilter(35))
    land_shoreline = ImageChops.multiply(
        ImageChops.subtract(shoreline_reach, hard_water),
        ImageChops.invert(hard_bridge),
    )
    transition = Image.new("RGBA", ARTBOARD, (0, 0, 0, 0))

    with Image.open(BRIDGE_ATLAS_PATH) as source:
        bridge_atlas = source.convert("RGBA")
    steep_bridge, _ = load_node_asset(BRIDGE_STEEP_PATH)
    bridge_cells = {
        "upper-water-bridge": (0, 0),
        "station-civic-bridge": (1, 0),
        "lower-works-bridge": (0, 1),
    }
    registered_bridge_visuals = Image.new("L", ARTBOARD, 0)
    bridge_asset_records: list[dict[str, Any]] = []
    for landmark in layout["landmarks"]:
        if landmark["kind"] != "bridge":
            continue
        if landmark["id"] == "central-civic-bridge":
            bridge = steep_bridge.copy()
            source_id = "city-bridge-steep-alpha-r1"
        else:
            bridge = bridge_atlas_component(
                bridge_atlas,
                bridge_cells[landmark["id"]],
            )
            source_id = (
                f"city-bridge-atlas-alpha-r1 cell {bridge_cells[landmark['id']]}"
            )
        bridge_alpha = bridge.getchannel("A")
        bridge_rgb = ImageEnhance.Color(bridge.convert("RGB")).enhance(0.78)
        bridge_rgb = ImageEnhance.Brightness(bridge_rgb).enhance(0.74)
        bridge = bridge_rgb.convert("RGBA")
        bridge.putalpha(bridge_alpha)
        # The generated bridge plates are intentionally compact overlays.  The
        # landmarks describe the complete crossing corridor, not the width of a
        # freestanding building footprint; using the old 2.20 multiplier made
        # every bridge read as a detached city block at runtime.
        display_width = round(
            landmark["halfLengthNormalized"] * ARTBOARD[0] * 1.18
        )
        display_height = round(display_width * bridge.height / bridge.width)
        bridge = bridge.resize(
            (display_width, display_height),
            Image.Resampling.LANCZOS,
        )
        center = pixel(landmark["conceptPosition"])
        top_left = (
            round(center[0] - bridge.width / 2),
            round(center[1] - bridge.height * 0.51),
        )
        transition.alpha_composite(bridge, dest=top_left)
        world_alpha = Image.new("L", ARTBOARD, 0)
        world_alpha.paste(bridge.getchannel("A"), top_left)
        registered_bridge_visuals = ImageChops.lighter(
            registered_bridge_visuals,
            world_alpha.point(lambda value: 255 if value >= 16 else 0),
        )
        bridge_asset_records.append(
            {
                "id": landmark["id"],
                "source": source_id,
                "displayWidth": display_width,
                "topLeft": list(top_left),
            }
        )
    transition_alpha = transition.getchannel("A")

    visible = transition_alpha.point(lambda value: 255 if value >= 16 else 0)
    unregistered_water_overlap = ImageChops.multiply(
        ImageChops.multiply(visible, hard_water),
        ImageChops.invert(registered_bridge_visuals),
    ).histogram()[255]
    if unregistered_water_overlap != 0:
        raise RuntimeError("Water transition leaked outside registered bridge corridors.")

    bridge_records: list[dict[str, Any]] = []
    for landmark in layout["landmarks"]:
        if landmark["kind"] != "bridge":
            continue
        local_corridor = Image.new("L", ARTBOARD, 0)
        ImageDraw.Draw(local_corridor).line(
            bridge_endpoints(landmark),
            fill=255,
            width=74,
        )
        visible_pixels = ImageChops.multiply(visible, local_corridor).histogram()[255]
        over_water_pixels = ImageChops.multiply(
            ImageChops.multiply(visible, local_corridor),
            hard_water,
        ).histogram()[255]
        if visible_pixels < 300 or over_water_pixels < 40:
            raise RuntimeError(
                f"Registered bridge lacks visible above-water structure: {landmark['id']}"
            )
        bridge_records.append(
            {
                "id": landmark["id"],
                "visiblePixels": visible_pixels,
                "overWaterPixels": over_water_pixels,
                "endpoints": [list(point) for point in bridge_endpoints(landmark)],
                "independentAuthoredAsset": True,
            }
        )

    return transition, {
        "authority": water_manifest["authorityId"],
        "bridgeCount": len(bridge_records),
        "bridges": bridge_records,
        "independentBridgeAssetCount": len(bridge_asset_records),
        "independentBridgeAssets": bridge_asset_records,
        "shorelinePixels": 0,
        "terrainPixelsExcluded": True,
        "unregisteredWaterOverlapPixels": unregistered_water_overlap,
        "changesHydrologyAuthority": False,
        "changesTerrainAuthority": False,
    }


def build_capital_coherent_base(
    selected: Image.Image,
    water_mask: Image.Image,
) -> tuple[Image.Image, dict[str, Any]]:
    """Create the bounded visual city/contact base without owning terrain geometry."""
    source_alpha = selected.getchannel("A")
    hard_source = source_alpha.point(lambda value: 255 if value >= 16 else 0)

    # The selected source includes immediate retaining slopes and bank contacts.
    # Keep that transition material, but feather its outer district silhouette so
    # the canonical terrain remains visible outside the city envelope.
    inner = hard_source.filter(ImageFilter.MinFilter(61))
    feather = inner.filter(ImageFilter.GaussianBlur(30))
    coherent_alpha = ImageChops.multiply(source_alpha, feather)

    # Live inland water is a separate owner. It must remain visible through the
    # city base; registered bridge sprites are composited later above the water.
    hard_water = water_mask.point(lambda value: 255 if value >= 128 else 0)
    coherent_alpha = ImageChops.subtract(coherent_alpha, hard_water)

    coherent = selected.copy()
    coherent.putalpha(coherent_alpha)
    coherent_pixels = np.asarray(coherent, dtype=np.uint8).copy()
    coherent_pixels[coherent_pixels[:, :, 3] == 0, :3] = 0
    coherent = Image.fromarray(coherent_pixels, "RGBA")

    visible = coherent_alpha.point(lambda value: 255 if value >= 8 else 0)
    visible_pixels = visible.histogram()[255]
    water_overlap = ImageChops.multiply(visible, hard_water).histogram()[255]
    transparent_rgb = int(np.count_nonzero(
        (coherent_pixels[:, :, 3] == 0)
        & np.any(coherent_pixels[:, :, :3] != 0, axis=2)
    ))
    coverage_ratio = visible_pixels / (ARTBOARD[0] * ARTBOARD[1])
    if water_overlap != 0:
        raise RuntimeError("Capital city base overlaps registered inland water.")
    if coverage_ratio >= 0.28:
        raise RuntimeError("Capital city base exceeds its bounded visual footprint.")
    if transparent_rgb != 0:
        raise RuntimeError("Capital city base retains RGB beneath zero alpha.")

    return coherent, {
        "role": "bounded-city-and-immediate-contact-transition",
        "containsTransitionTerrainPixels": True,
        "containsRegisteredWaterPixels": False,
        "waterOverlapPixels": water_overlap,
        "visiblePixels": visible_pixels,
        "artboardCoverageRatio": round(coverage_ratio, 6),
        "transparentRgbUnderZeroAlpha": transparent_rgb,
        "edgeFeatherPixels": 30,
        "visualOnly": True,
        "affectsLandMask": False,
        "affectsHeight": False,
        "affectsSlope": False,
        "affectsCollision": False,
    }


def build_water_transition_proof(
    terrain: Image.Image,
    apertured: Image.Image,
    water_mask: Image.Image,
    water_transition: Image.Image,
) -> Image.Image:
    proof = terrain.copy()
    proof.alpha_composite(apertured)
    water_preview = Image.new("RGBA", ARTBOARD, (15, 53, 62, 0))
    water_preview.putalpha(
        water_mask.point(lambda value: round(value * 0.86))
    )
    proof.alpha_composite(water_preview)
    proof.alpha_composite(water_transition)
    return proof


def public_asset_path(runtime_path: str) -> Path:
    if not runtime_path.startswith("/career-world/"):
        raise RuntimeError(f"Unexpected runtime asset path: {runtime_path}")
    return REPO / "public" / runtime_path.lstrip("/")


def load_node_asset(path: Path) -> tuple[Image.Image, tuple[int, int, int, int]]:
    with Image.open(path) as source:
        source.seek(0)
        rgba = source.convert("RGBA")
    pixels = np.asarray(rgba, dtype=np.uint8).copy()
    pixels[pixels[:, :, 3] < 8] = 0
    rgba = Image.fromarray(pixels, "RGBA")
    content_mask = rgba.getchannel("A").point(lambda value: 255 if value >= 8 else 0)
    content_box = content_mask.getbbox()
    if content_box is None:
        raise RuntimeError(f"Node asset has no visible content: {path}")
    return rgba.crop(content_box), content_box


def infrastructure_component(
    atlas: Image.Image,
    cell: tuple[int, int],
) -> Image.Image:
    cell_size = 512
    divider_inset = 8
    left = cell[0] * cell_size + divider_inset
    top = cell[1] * cell_size + divider_inset
    right = (cell[0] + 1) * cell_size - divider_inset
    bottom = (cell[1] + 1) * cell_size - divider_inset
    component = atlas.crop((left, top, right, bottom))
    visible_bounds = component.getchannel("A").point(
        lambda value: 255 if value >= 8 else 0
    ).getbbox()
    if visible_bounds is None:
        raise RuntimeError(f"Infrastructure atlas cell {cell} has no visible pixels.")
    padding = 4
    return component.crop(
        (
            max(0, visible_bounds[0] - padding),
            max(0, visible_bounds[1] - padding),
            min(component.width, visible_bounds[2] + padding),
            min(component.height, visible_bounds[3] + padding),
        )
    )


def rail_segment_component(
    atlas: Image.Image,
    cell: tuple[int, int],
) -> Image.Image:
    left = round(cell[0] * atlas.width / 3) + 5
    right = round((cell[0] + 1) * atlas.width / 3) - 5
    top = round(cell[1] * atlas.height / 2) + 5
    bottom = round((cell[1] + 1) * atlas.height / 2) - 5
    component = atlas.crop((left, top, right, bottom))
    visible_bounds = component.getchannel("A").point(
        lambda value: 255 if value >= 8 else 0
    ).getbbox()
    if visible_bounds is None:
        raise RuntimeError(f"Rail segment atlas cell {cell} has no visible pixels.")
    padding = 6
    return component.crop(
        (
            max(0, visible_bounds[0] - padding),
            max(0, visible_bounds[1] - padding),
            min(component.width, visible_bounds[2] + padding),
            min(component.height, visible_bounds[3] + padding),
        )
    )


def alpha_overlap_pixels(
    left: Image.Image,
    left_position: tuple[int, int],
    right: Image.Image,
    right_position: tuple[int, int],
    threshold: int = 16,
) -> int:
    overlap_left = max(left_position[0], right_position[0])
    overlap_top = max(left_position[1], right_position[1])
    overlap_right = min(
        left_position[0] + left.width,
        right_position[0] + right.width,
    )
    overlap_bottom = min(
        left_position[1] + left.height,
        right_position[1] + right.height,
    )
    if overlap_left >= overlap_right or overlap_top >= overlap_bottom:
        return 0
    left_alpha = left.getchannel("A").crop(
        (
            overlap_left - left_position[0],
            overlap_top - left_position[1],
            overlap_right - left_position[0],
            overlap_bottom - left_position[1],
        )
    )
    right_alpha = right.getchannel("A").crop(
        (
            overlap_left - right_position[0],
            overlap_top - right_position[1],
            overlap_right - right_position[0],
            overlap_bottom - right_position[1],
        )
    )
    left_contact = left_alpha.point(
        lambda value: 255 if value >= threshold else 0
    )
    right_contact = right_alpha.point(
        lambda value: 255 if value >= threshold else 0
    )
    return sum(
        ImageChops.multiply(left_contact, right_contact).histogram()[1:]
    )


def count_alpha_in_mask(
    alpha: Image.Image,
    mask: Image.Image,
    threshold: int = 16,
) -> int:
    visible = alpha.point(lambda value: 255 if value >= threshold else 0)
    return sum(ImageChops.multiply(visible, mask).histogram()[1:])


def circular_mask(center: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", ARTBOARD, 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse(
        (
            center[0] - radius,
            center[1] - radius,
            center[0] + radius,
            center[1] + radius,
        ),
        fill=255,
    )
    return mask


def build_rail_portal_layers(
    layout: dict[str, Any],
) -> tuple[Image.Image, Image.Image, list[dict[str, Any]]]:
    with Image.open(INFRASTRUCTURE_ATLAS_PATH) as source:
        infrastructure_atlas = source.convert("RGBA")
    rock_source = infrastructure_component(infrastructure_atlas, (1, 2))
    rock_alpha = rock_source.getchannel("A")
    rock_rgb = ImageEnhance.Color(rock_source.convert("RGB")).enhance(0.72)
    rock_rgb = ImageEnhance.Brightness(rock_rgb).enhance(0.64)
    rock_source = rock_rgb.convert("RGBA")
    rock_source.putalpha(rock_alpha)

    back = Image.new("RGBA", ARTBOARD, (0, 0, 0, 0))
    foreground = Image.new("RGBA", ARTBOARD, (0, 0, 0, 0))
    records: list[dict[str, Any]] = []
    landmark_by_id = {landmark["id"]: landmark for landmark in layout["landmarks"]}
    for portal_id in (
        layout["railTopologyOverride"]["stationPortalId"],
        layout["railTopologyOverride"]["southPortalId"],
    ):
        landmark = landmark_by_id[portal_id]
        center = pixel(landmark["conceptPosition"])
        envelope = landmark["targetVisibleEnvelope"]
        target_width = round(envelope[0] * ARTBOARD[0])
        target_height = round(envelope[1] * ARTBOARD[1])
        scale = min(
            target_width / rock_source.width,
            target_height / rock_source.height,
        )
        rock = rock_source.resize(
            (
                max(1, round(rock_source.width * scale)),
                max(1, round(rock_source.height * scale)),
            ),
            Image.Resampling.LANCZOS,
        )
        top_left = (
            round(center[0] - rock.width / 2),
            round(center[1] - rock.height * 0.48),
        )

        local_outer = Image.new("L", rock.size, 0)
        outer_draw = ImageDraw.Draw(local_outer)
        outer_draw.ellipse(
            (0, 0, rock.width - 1, rock.height - 1),
            fill=255,
        )
        local_opening = Image.new("L", rock.size, 0)
        opening_draw = ImageDraw.Draw(local_opening)
        opening_width = max(26, round(rock.width * 0.42))
        opening_height = max(32, round(rock.height * 0.58))
        opening_left = round((rock.width - opening_width) / 2)
        opening_top = round(rock.height * 0.24)
        opening_right = opening_left + opening_width
        opening_bottom = min(rock.height - 1, opening_top + opening_height)
        opening_draw.ellipse(
            (
                opening_left,
                opening_top,
                opening_right,
                opening_bottom,
            ),
            fill=255,
        )
        local_opening = local_opening.filter(ImageFilter.GaussianBlur(1.2))

        opening_world = Image.new("L", ARTBOARD, 0)
        opening_world.paste(local_opening, top_left)
        darkness = Image.new("RGBA", ARTBOARD, (3, 9, 10, 0))
        darkness.putalpha(opening_world.point(lambda value: round(value * 0.92)))
        back.alpha_composite(darkness)

        rim_mask = ImageChops.subtract(local_outer, local_opening)
        rim_alpha = ImageChops.multiply(rock.getchannel("A"), rim_mask)
        rim_alpha = rim_alpha.point(lambda value: round(value * 0.78))
        rock.putalpha(rim_alpha)
        foreground.alpha_composite(rock, dest=top_left)
        records.append(
            {
                "id": portal_id,
                "conceptPosition": landmark["conceptPosition"],
                "visibleEnvelope": landmark["targetVisibleEnvelope"],
                "placedBounds": [
                    top_left[0],
                    top_left[1],
                    top_left[0] + rock.width,
                    top_left[1] + rock.height,
                ],
                "openingDimensions": [opening_width, opening_height],
                "source": "infrastructure-transition-atlas-rock-foliage-cell",
            }
        )
    return back, foreground, records


def build_registered_rail_layers(
    layout: dict[str, Any],
) -> tuple[
    Image.Image,
    Image.Image,
    Image.Image,
    Image.Image,
    Image.Image,
    dict[str, Any],
]:
    if sha256(RAIL_SEGMENT_SOURCE_PATH) != EXPECTED_RAIL_SEGMENT_SOURCE_SHA256:
        raise RuntimeError("The authored rail segment source atlas has drifted.")
    if sha256(RAIL_SEGMENT_ALPHA_PATH) != EXPECTED_RAIL_SEGMENT_ALPHA_SHA256:
        raise RuntimeError("The alpha-clean authored rail segment atlas has drifted.")
    with Image.open(RAIL_SEGMENT_ALPHA_PATH) as source:
        atlas = source.convert("RGBA")

    support = Image.new("RGBA", ARTBOARD, (0, 0, 0, 0))
    bed = Image.new("RGBA", ARTBOARD, (0, 0, 0, 0))
    track = Image.new("RGBA", ARTBOARD, (0, 0, 0, 0))
    ground_track_alpha = Image.new("L", ARTBOARD, 0)
    elevated_track_alpha = Image.new("L", ARTBOARD, 0)
    joins: list[dict[str, Any]] = []
    placements: list[dict[str, Any]] = []
    segment_count = 0
    for chain_index, chain in enumerate(RAIL_SURFACE_CHAINS):
        previous: tuple[dict[str, Any], Image.Image, tuple[int, int]] | None = None
        for segment in chain:
            component = rail_segment_component(atlas, segment["cell"])
            component_alpha = component.getchannel("A")
            component_rgb = ImageEnhance.Color(component.convert("RGB")).enhance(0.82)
            component_rgb = ImageEnhance.Brightness(component_rgb).enhance(0.84)
            component = component_rgb.convert("RGBA")
            component.putalpha(component_alpha)
            display_width = segment["displayWidth"]
            display_height = round(display_width * component.height / component.width)
            component = component.resize(
                (display_width, display_height),
                Image.Resampling.LANCZOS,
            )
            center = pixel(segment["conceptCenter"])
            position = (
                round(center[0] - component.width / 2),
                round(center[1] - component.height / 2),
            )
            if previous is not None:
                previous_segment, previous_component, previous_position = previous
                overlap = alpha_overlap_pixels(
                    previous_component,
                    previous_position,
                    component,
                    position,
                )
                if overlap <= 0:
                    raise RuntimeError(
                        "Authored rail segments do not physically join: "
                        f"{previous_segment['id']} -> {segment['id']}"
                    )
                joins.append(
                    {
                        "from": previous_segment["id"],
                        "to": segment["id"],
                        "alphaOverlapPixels": overlap,
                        "alphaThreshold": 16,
                    }
                )

            segment_alpha = Image.new("L", ARTBOARD, 0)
            segment_alpha.paste(component.getchannel("A"), position)
            if segment["kind"].startswith("ground-"):
                ground_track_alpha = ImageChops.lighter(
                    ground_track_alpha,
                    segment_alpha,
                )
            else:
                elevated_track_alpha = ImageChops.lighter(
                    elevated_track_alpha,
                    segment_alpha,
                )
            track.alpha_composite(component, dest=position)
            placements.append(
                {
                    "id": segment["id"],
                    "chainIndex": chain_index,
                    "sourceCell": list(segment["cell"]),
                    "conceptCenter": list(segment["conceptCenter"]),
                    "displayWidth": display_width,
                    "displayHeight": display_height,
                    "kind": segment["kind"],
                    "rotationDegrees": 0,
                    "placedBounds": [
                        position[0],
                        position[1],
                        position[0] + component.width,
                        position[1] + component.height,
                    ],
                }
            )
            previous = (segment, component, position)
            segment_count += 1

    # Contacts are derived from the joined route silhouette, not one shadow or
    # ballast patch per atlas cell. That removes the repeated hard rectangles
    # and density bands previously visible at otherwise valid segment joins.
    bed_alpha = ground_track_alpha.filter(ImageFilter.MaxFilter(17))
    bed_alpha = bed_alpha.filter(ImageFilter.GaussianBlur(4.0))
    bed_alpha = bed_alpha.point(lambda value: round(value * 0.24))
    bed.putalpha(bed_alpha)

    ground_shadow = ground_track_alpha.filter(ImageFilter.GaussianBlur(5.0))
    ground_shadow = ground_shadow.point(lambda value: round(value * 0.17))
    elevated_shadow = elevated_track_alpha.filter(ImageFilter.GaussianBlur(6.5))
    elevated_shadow = elevated_shadow.point(lambda value: round(value * 0.42))
    shifted_ground_shadow = Image.new("L", ARTBOARD, 0)
    shifted_ground_shadow.paste(ground_shadow, (4, 4))
    shifted_elevated_shadow = Image.new("L", ARTBOARD, 0)
    shifted_elevated_shadow.paste(elevated_shadow, (6, 9))
    support.putalpha(
        ImageChops.lighter(shifted_ground_shadow, shifted_elevated_shadow)
    )
    portal_back, portal_foreground, portal_records = build_rail_portal_layers(layout)
    track_alpha = track.getchannel("A")
    landmark_by_id = {landmark["id"]: landmark for landmark in layout["landmarks"]}
    station = next(
        landmark for landmark in layout["landmarks"] if landmark["id"] == "intercity-station"
    )
    station_portal = landmark_by_id[layout["railTopologyOverride"]["stationPortalId"]]
    south_portal = landmark_by_id[layout["railTopologyOverride"]["southPortalId"]]
    station_contact = count_alpha_in_mask(
        track_alpha,
        circular_mask(pixel(station["conceptPosition"]), 66),
    )
    station_portal_contact = count_alpha_in_mask(
        track_alpha,
        circular_mask(pixel(station_portal["conceptPosition"]), 60),
    )
    south_portal_contact = count_alpha_in_mask(
        track_alpha,
        circular_mask(pixel(south_portal["conceptPosition"]), 60),
    )

    hidden_tunnel = Image.new("L", ARTBOARD, 0)
    hidden_draw = ImageDraw.Draw(hidden_tunnel)
    station_portal_px = pixel(station_portal["conceptPosition"])
    south_portal_px = pixel(south_portal["conceptPosition"])
    hidden_draw.line(
        (station_portal_px, south_portal_px),
        fill=255,
        width=42,
    )
    endpoint_clearance = Image.new("L", ARTBOARD, 0)
    endpoint_draw = ImageDraw.Draw(endpoint_clearance)
    for endpoint in (station_portal_px, south_portal_px):
        endpoint_draw.ellipse(
            (
                endpoint[0] - 64,
                endpoint[1] - 64,
                endpoint[0] + 64,
                endpoint[1] + 64,
            ),
            fill=255,
        )
    hidden_tunnel = ImageChops.subtract(hidden_tunnel, endpoint_clearance)
    hidden_tunnel_track_pixels = count_alpha_in_mask(track_alpha, hidden_tunnel)

    bottom_exit_mask = Image.new("L", ARTBOARD, 0)
    ImageDraw.Draw(bottom_exit_mask).rectangle(
        (round(ARTBOARD[0] * 0.66), ARTBOARD[1] - 32, ARTBOARD[0] - 1, ARTBOARD[1] - 1),
        fill=255,
    )
    bottom_exit_pixels = count_alpha_in_mask(track_alpha, bottom_exit_mask)
    edge_mask = Image.new("L", ARTBOARD, 0)
    edge_draw = ImageDraw.Draw(edge_mask)
    edge_draw.rectangle((0, 0, ARTBOARD[0] - 1, 15), fill=255)
    edge_draw.rectangle((0, 0, 15, ARTBOARD[1] - 1), fill=255)
    edge_draw.rectangle((ARTBOARD[0] - 16, 0, ARTBOARD[0] - 1, ARTBOARD[1] - 1), fill=255)
    forbidden_edge_pixels = count_alpha_in_mask(track_alpha, edge_mask)

    if station_contact <= 0 or station_portal_contact <= 0 or south_portal_contact <= 0:
        raise RuntimeError("Rail does not visibly contact station and both tunnel portals.")
    if hidden_tunnel_track_pixels != 0:
        raise RuntimeError("Surface rail leaked into the accepted hidden tunnel span.")
    if bottom_exit_pixels <= 0 or forbidden_edge_pixels != 0:
        raise RuntimeError("Rail does not preserve the sole south/southeast exit contract.")
    if any(placement["rotationDegrees"] != 0 for placement in placements):
        raise RuntimeError("Rail source-camera rotation contract failed.")

    return (
        support,
        bed,
        portal_back,
        track,
        portal_foreground,
        {
            "renderMethod": "authored-isometric-segment-chains",
            "segmentCount": segment_count,
            "chainCount": len(RAIL_SURFACE_CHAINS),
            "segments": placements,
            "segmentJoins": joins,
            "stationContactPixels": station_contact,
            "stationPortalContactPixels": station_portal_contact,
            "southPortalContactPixels": south_portal_contact,
            "hiddenTunnelSurfaceTrackPixels": hidden_tunnel_track_pixels,
            "southSoutheastBottomExitPixels": bottom_exit_pixels,
            "forbiddenTopLeftRightEdgePixels": forbidden_edge_pixels,
            "portalRecords": portal_records,
            "westExitAllowed": False,
            "trainBakedIntoRail": False,
            "stationBakedIntoRail": False,
            "changesTerrainAuthority": False,
            "rotationDegrees": 0,
        },
    )


def bridge_atlas_component(
    atlas: Image.Image,
    cell: tuple[int, int],
) -> Image.Image:
    cell_width = atlas.width // 2
    cell_height = atlas.height // 2
    component = atlas.crop(
        (
            cell[0] * cell_width,
            cell[1] * cell_height,
            (cell[0] + 1) * cell_width,
            (cell[1] + 1) * cell_height,
        )
    )
    visible_bounds = component.getchannel("A").point(
        lambda value: 255 if value >= 8 else 0
    ).getbbox()
    if visible_bounds is None:
        raise RuntimeError(f"Bridge atlas cell {cell} has no visible pixels.")
    padding = 6
    return component.crop(
        (
            max(0, visible_bounds[0] - padding),
            max(0, visible_bounds[1] - padding),
            min(component.width, visible_bounds[2] + padding),
            min(component.height, visible_bounds[3] + padding),
        )
    )


def manifest_nodes_by_skill(manifest: dict[str, Any]) -> dict[str, dict[str, Any]]:
    nodes = {node["skillId"]: node for node in manifest["nodes"]}
    if len(nodes) != len(manifest["nodes"]):
        raise RuntimeError("City manifest contains duplicate skill nodes.")
    return nodes


def node_display_width(node: dict[str, Any]) -> int:
    width = int(node["displayWidth"])
    if width <= 0:
        raise RuntimeError(f"Invalid display width for {node['skillId']}: {width}")
    return width


def node_footprint_dimensions(node: dict[str, Any]) -> tuple[float, float]:
    display_width = node_display_width(node)
    footprint = node["footprintFraction"]
    return (
        display_width * float(footprint["width"]),
        display_width * float(footprint["depth"]),
    )


def fit_node_asset(
    source: Image.Image,
    display_width: int,
) -> Image.Image:
    if display_width <= 0:
        raise RuntimeError(f"Asset display width must be positive: {display_width}")
    scale = display_width / source.width
    fitted_size = (
        max(1, round(source.width * scale)),
        max(1, round(source.height * scale)),
    )
    return source.resize(fitted_size, Image.Resampling.LANCZOS)


def place_node_asset(
    asset: Image.Image,
    content_box: tuple[int, int, int, int],
    source_dimensions: tuple[int, int],
    ground_anchor: tuple[float, float],
    concept_position: list[float],
) -> tuple[tuple[int, int], tuple[int, int, int, int]]:
    anchor_source_x = ground_anchor[0] * source_dimensions[0] - content_box[0]
    anchor_source_y = ground_anchor[1] * source_dimensions[1] - content_box[1]
    anchor_x = anchor_source_x * asset.width / max(1, content_box[2] - content_box[0])
    anchor_y = anchor_source_y * asset.height / max(1, content_box[3] - content_box[1])
    target_x, target_y = pixel(concept_position)
    top_left = (
        round(target_x - anchor_x),
        round(target_y - anchor_y),
    )
    bounds = (
        top_left[0],
        top_left[1],
        top_left[0] + asset.width,
        top_left[1] + asset.height,
    )
    if (
        bounds[0] < 0
        or bounds[1] < 0
        or bounds[2] > ARTBOARD[0]
        or bounds[3] > ARTBOARD[1]
    ):
        raise RuntimeError(f"Node asset falls outside the artboard: {bounds}")
    return top_left, bounds


def build_node_aperture_mask(
    layout: dict[str, Any],
    manifest: dict[str, Any],
    terrain_alpha: Image.Image,
) -> tuple[Image.Image, Image.Image]:
    mask = Image.new("L", ARTBOARD, 0)
    draw = ImageDraw.Draw(mask)
    nodes_by_skill = manifest_nodes_by_skill(manifest)
    for socket in layout["skillSockets"]:
        node = nodes_by_skill[socket["skillId"]]
        footprint_width, footprint_depth = node_footprint_dimensions(node)
        center_x, center_y = pixel(socket["conceptPosition"])
        aperture_width = round(footprint_width * 0.86)
        aperture_height = round(footprint_depth * 1.08)
        center_y -= round(footprint_depth * 0.12)
        draw.ellipse(
            (
                center_x - aperture_width // 2,
                center_y - aperture_height // 2,
                center_x + aperture_width // 2,
                center_y + aperture_height // 2,
            ),
            fill=255,
        )

    station = next(
        landmark
        for landmark in layout["landmarks"]
        if landmark["id"] == "intercity-station"
    )
    station_x, station_y = pixel(station["conceptPosition"])
    station_display_width = int(manifest["transport"]["station"]["displayWidth"])
    station_width = round(station_display_width * 0.72)
    station_height = round(station_display_width * 0.18)
    station_y -= round(station_display_width * 0.035)
    draw.ellipse(
        (
            station_x - station_width // 2,
            station_y - station_height // 2,
            station_x + station_width // 2,
            station_y + station_height // 2,
        ),
        fill=255,
    )
    ordinary_mask = mask.filter(ImageFilter.GaussianBlur(9))

    # The summit replacement owns the complete baked placeholder silhouette,
    # not merely the smaller independent node footprint. Keep this mask
    # separate so it can also suppress source-derived foreground fragments and
    # be validated independently from every ordinary socket aperture.
    summit_ownership = Image.new("L", ARTBOARD, 0)
    ImageDraw.Draw(summit_ownership).polygon(
        [pixel(point) for point in SUMMIT_PLACEHOLDER_OWNERSHIP_POLYGON],
        fill=255,
    )
    summit_ownership = summit_ownership.filter(ImageFilter.GaussianBlur(5))
    # Apertures may remove placeholder structures only where frozen terrain can
    # support the replacement. Replacement sprites may still visually overhang
    # that support, but the cut itself must never expose new world-space holes.
    # The explicit summit ownership transfer is the exception: its baked tower
    # silhouette rises above the canonical terrain alpha. Clearing those
    # source pixels reveals the existing sky/void, not a new ground hole.
    ordinary_mask = ImageChops.multiply(ordinary_mask, terrain_alpha)
    return (
        ImageChops.lighter(ordinary_mask, summit_ownership),
        summit_ownership,
    )


def build_node_foreground(
    selected: Image.Image,
    layout: dict[str, Any],
    manifest: dict[str, Any],
    aperture_mask: Image.Image,
    summit_ownership_mask: Image.Image,
    terrain_alpha: Image.Image,
    water_mask: Image.Image,
) -> Image.Image:
    binary_aperture = aperture_mask.point(lambda value: 255 if value >= 64 else 0)
    expanded = binary_aperture.filter(ImageFilter.MaxFilter(31))
    eroded = binary_aperture.filter(ImageFilter.MinFilter(11))
    contact_band = ImageChops.subtract(expanded, eroded)
    lower_gate = Image.new("L", ARTBOARD, 0)
    draw = ImageDraw.Draw(lower_gate)
    nodes_by_skill = manifest_nodes_by_skill(manifest)

    for socket in layout["skillSockets"]:
        node = nodes_by_skill[socket["skillId"]]
        footprint_width, footprint_depth = node_footprint_dimensions(node)
        center_x, center_y = pixel(socket["conceptPosition"])
        half_width = round(footprint_width * 0.58)
        top = center_y - round(footprint_depth * 0.55)
        bottom = center_y + round(footprint_depth * 0.38)
        draw.rectangle(
            (center_x - half_width, top, center_x + half_width, bottom),
            fill=255,
        )

    station = next(
        landmark
        for landmark in layout["landmarks"]
        if landmark["id"] == "intercity-station"
    )
    station_x, station_y = pixel(station["conceptPosition"])
    station_display_width = int(manifest["transport"]["station"]["displayWidth"])
    station_half_width = round(station_display_width * 0.50)
    draw.rectangle(
        (
            station_x - station_half_width,
            station_y - round(station_display_width * 0.12),
            station_x + station_half_width,
            station_y + round(station_display_width * 0.08),
        ),
        fill=255,
    )

    selected_pixels = np.asarray(selected.convert("RGBA"), dtype=np.uint8)
    red = selected_pixels[:, :, 0].astype(np.int16)
    green = selected_pixels[:, :, 1].astype(np.int16)
    blue = selected_pixels[:, :, 2].astype(np.int16)
    luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722
    dark_stone = luminance <= 78
    foliage = (
        (luminance <= 118)
        & (green >= red - 8)
        & (green >= blue - 4)
    )
    material_mask = Image.fromarray(
        ((dark_stone | foliage) * 255).astype(np.uint8),
        "L",
    )
    foreground_mask = ImageChops.multiply(
        ImageChops.multiply(contact_band, lower_gate),
        material_mask,
    )
    # Generic socket contact belongs to land only. Shoreline stone and every
    # above-water bridge pixel are owned by build_water_transition_layer();
    # letting this later foreground pass cross that boundary reintroduced the
    # source plate's rock fragments over the animated river.
    hard_terrain = terrain_alpha.point(lambda value: 255 if value >= 16 else 0)
    hard_water = water_mask.point(lambda value: 255 if value >= 128 else 0)
    land_only = ImageChops.multiply(hard_terrain, ImageChops.invert(hard_water))
    foreground = selected.copy()
    foreground.putalpha(
        ImageChops.multiply(
            ImageChops.multiply(
                ImageChops.multiply(selected.getchannel("A"), foreground_mask),
                ImageChops.invert(summit_ownership_mask),
            ),
            land_only,
        )
    )
    return foreground


def build_summit_transition_foreground(
    terrain: Image.Image,
    summit_ownership_mask: Image.Image,
) -> Image.Image:
    """Retain real summit rock/foliage in front of the independent citadel."""
    terrain_pixels = np.asarray(terrain.convert("RGBA"), dtype=np.uint8)
    red = terrain_pixels[:, :, 0].astype(np.int16)
    green = terrain_pixels[:, :, 1].astype(np.int16)
    blue = terrain_pixels[:, :, 2].astype(np.int16)
    alpha = terrain_pixels[:, :, 3]
    luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722
    dark_rock = luminance <= 80
    foliage = (
        (luminance <= 122)
        & (green >= red - 10)
        & (green >= blue - 5)
    )
    material = Image.fromarray(
        (((dark_rock | foliage) & (alpha >= 16)) * 255).astype(np.uint8),
        "L",
    )
    contact_band = summit_ownership_mask.filter(ImageFilter.MaxFilter(45))
    contact_band = ImageChops.subtract(contact_band, summit_ownership_mask)
    lower_gate = Image.new("L", ARTBOARD, 0)
    ImageDraw.Draw(lower_gate).polygon(
        [
            pixel((0.392, 0.195)),
            pixel((0.570, 0.190)),
            pixel((0.575, 0.310)),
            pixel((0.385, 0.310)),
        ],
        fill=255,
    )
    foreground_alpha = ImageChops.multiply(
        ImageChops.multiply(contact_band, lower_gate),
        material,
    )
    foreground = terrain.copy()
    foreground.putalpha(
        ImageChops.multiply(terrain.getchannel("A"), foreground_alpha)
    )
    return foreground


def validate_summit_placeholder_ownership(
    selected: Image.Image,
    apertured: Image.Image,
    foreground: Image.Image,
    summit_ownership_mask: Image.Image,
) -> dict[str, Any]:
    strict_ownership = summit_ownership_mask.point(
        lambda value: 255 if value >= 254 else 0
    )
    source_alpha = selected.getchannel("A").point(
        lambda value: 255 if value >= 16 else 0
    )
    apertured_alpha = apertured.getchannel("A").point(
        lambda value: 255 if value >= 16 else 0
    )
    foreground_alpha = foreground.getchannel("A").point(
        lambda value: 255 if value >= 16 else 0
    )
    source_owned_pixels = ImageChops.multiply(
        source_alpha,
        strict_ownership,
    ).histogram()[255]
    apertured_residual_pixels = ImageChops.multiply(
        apertured_alpha,
        strict_ownership,
    ).histogram()[255]
    foreground_residual_pixels = ImageChops.multiply(
        foreground_alpha,
        strict_ownership,
    ).histogram()[255]
    if source_owned_pixels < 60_000:
        raise RuntimeError(
            "Summit ownership mask does not cover the baked placeholder mass."
        )
    if apertured_residual_pixels != 0 or foreground_residual_pixels != 0:
        raise RuntimeError(
            "Baked summit placeholder pixels remain after ownership transfer."
        )
    return {
        "skillId": "ai-agent-systems",
        "replacementSlotId": "summit-citadel",
        "source": "selected-city-environment-source-pixels",
        "ownershipPolygon": [list(point) for point in SUMMIT_PLACEHOLDER_OWNERSHIP_POLYGON],
        "sourceOwnedPixels": source_owned_pixels,
        "aperturedResidualPixels": apertured_residual_pixels,
        "foregroundResidualPixels": foreground_residual_pixels,
        "retainedPlateElements": [
            "lower retaining wall",
            "summit approach stairs",
            "civic circulation loop",
            "surrounding foliage and cliff",
        ],
        "passes": True,
    }


def measure_node_transition_coverage(
    layout: dict[str, Any],
    manifest: dict[str, Any],
    selected: Image.Image,
    aperture_mask: Image.Image,
    foreground: Image.Image,
    terrain_alpha: Image.Image,
    summit_ownership_mask: Image.Image,
) -> list[dict[str, Any]]:
    selected_alpha = selected.getchannel("A").point(
        lambda value: 255 if value >= 8 else 0
    )
    aperture_alpha = aperture_mask.point(lambda value: 255 if value >= 64 else 0)
    foreground_alpha = foreground.getchannel("A").point(
        lambda value: 255 if value >= 8 else 0
    )
    hard_terrain = terrain_alpha.point(lambda value: 255 if value >= 16 else 0)
    records: list[dict[str, Any]] = []
    nodes_by_skill = manifest_nodes_by_skill(manifest)
    for socket in layout["skillSockets"]:
        node = nodes_by_skill[socket["skillId"]]
        footprint_width, footprint_depth = node_footprint_dimensions(node)
        center_x, center_y = pixel(socket["conceptPosition"])
        radius_x = round(footprint_width * 0.72)
        radius_y = round(footprint_depth * 0.90)
        local_mask = Image.new("L", ARTBOARD, 0)
        ImageDraw.Draw(local_mask).ellipse(
            (
                center_x - radius_x,
                center_y - radius_y,
                center_x + radius_x,
                center_y + radius_y,
            ),
            fill=255,
        )
        local_mask_pixels = local_mask.histogram()[255]
        local_aperture = ImageChops.multiply(aperture_alpha, local_mask)
        aperture_pixels = local_aperture.histogram()[255]
        raw_off_terrain_aperture = ImageChops.multiply(
            local_aperture,
            ImageChops.invert(hard_terrain),
        )
        authorized_ownership_transfer = Image.new("L", ARTBOARD, 0)
        if socket["skillId"] == "ai-agent-systems":
            authorized_ownership_transfer = ImageChops.multiply(
                raw_off_terrain_aperture,
                summit_ownership_mask.point(
                    lambda value: 255 if value >= 64 else 0
                ),
            )
        off_terrain_aperture_pixels = ImageChops.subtract(
            raw_off_terrain_aperture,
            authorized_ownership_transfer,
        ).histogram()[255]
        authorized_ownership_transfer_pixels = (
            authorized_ownership_transfer.histogram()[255]
        )
        perimeter = local_aperture.filter(ImageFilter.MaxFilter(27))
        perimeter = ImageChops.subtract(perimeter, local_aperture)
        retained_source_perimeter_pixels = ImageChops.multiply(
            ImageChops.multiply(selected_alpha, perimeter),
            local_mask,
        ).histogram()[255]
        foreground_pixels = ImageChops.multiply(
            foreground_alpha,
            local_mask,
        ).histogram()[255]
        foreground_ratio = foreground_pixels / max(1, local_mask_pixels)
        passes = (
            aperture_pixels >= 140
            and off_terrain_aperture_pixels == 0
            and retained_source_perimeter_pixels >= 180
            and foreground_pixels >= 250
            and foreground_ratio >= 0.025
        )
        records.append(
            {
                "skillId": socket["skillId"],
                "localMaskPixels": local_mask_pixels,
                "aperturePixels": aperture_pixels,
                "offTerrainAperturePixels": off_terrain_aperture_pixels,
                "authorizedSummitOwnershipTransferPixels": (
                    authorized_ownership_transfer_pixels
                ),
                "retainedSourcePerimeterPixels": retained_source_perimeter_pixels,
                "foregroundOcclusionPixels": foreground_pixels,
                "foregroundOcclusionCoverageRatio": round(foreground_ratio, 6),
                "passes": passes,
            }
        )
    if not all(record["passes"] for record in records):
        failures = [
            {
                "skillId": record["skillId"],
                "aperturePixels": record["aperturePixels"],
                "offTerrainAperturePixels": record["offTerrainAperturePixels"],
                "retainedSourcePerimeterPixels": record[
                    "retainedSourcePerimeterPixels"
                ],
                "foregroundOcclusionPixels": record["foregroundOcclusionPixels"],
            }
            for record in records
            if not record["passes"]
        ]
        raise RuntimeError(
            "One or more skill nodes lacks a complete transition pair: "
            + json.dumps(failures, separators=(",", ":"))
        )
    return records


def build_node_scale_proof(
    terrain: Image.Image,
    selected: Image.Image,
    aperture_mask: Image.Image,
    layout: dict[str, Any],
    manifest: dict[str, Any],
) -> tuple[
    Image.Image,
    Image.Image,
    list[dict[str, Any]],
    Image.Image,
    list[tuple[int, Image.Image, tuple[int, int]]],
]:
    apertured = selected.copy()
    apertured.putalpha(
        ImageChops.multiply(
            selected.getchannel("A"),
            ImageChops.invert(aperture_mask),
        )
    )

    nodes_by_skill = manifest_nodes_by_skill(manifest)
    expected_skill_ids = {socket["skillId"] for socket in layout["skillSockets"]}
    if set(nodes_by_skill) != expected_skill_ids:
        raise RuntimeError("City manifest and concept skill sockets do not match exactly.")

    placements: list[dict[str, Any]] = []
    render_queue: list[tuple[int, Image.Image, tuple[int, int]]] = []
    for socket in layout["skillSockets"]:
        node = nodes_by_skill[socket["skillId"]]
        render_layer = node["renderLayers"][0]
        asset_path = public_asset_path(render_layer["path"])
        asset_hash = sha256(asset_path)
        if asset_hash != render_layer["sha256"]:
            raise RuntimeError(f"Skill asset hash drift: {socket['skillId']}")
        source_asset, content_box = load_node_asset(asset_path)
        display_width = node_display_width(node)
        fitted = fit_node_asset(
            source_asset,
            display_width,
        )
        top_left, bounds = place_node_asset(
            fitted,
            content_box,
            tuple(render_layer["dimensions"]),
            tuple(node["groundAnchor"]),
            socket["conceptPosition"],
        )
        render_queue.append((bounds[3], fitted, top_left))
        placements.append(
            {
                "skillId": socket["skillId"],
                "scaleClass": socket["scaleClass"],
                "conceptPosition": socket["conceptPosition"],
                "assetPath": render_layer["path"],
                "assetSha256": asset_hash,
                "scaleAuthority": NODE_SCALE_AUTHORITY,
                "manifestDisplayWidth": display_width,
                "displayWidthDeltaPixels": fitted.width - display_width,
                "footprintFraction": node["footprintFraction"],
                "sourceContentBox": list(content_box),
                "placedBounds": list(bounds),
                "visibleDimensions": list(fitted.size),
            }
        )

    station_manifest = manifest["transport"]["station"]
    station_hash = sha256(STATION_PATH)
    if station_hash != station_manifest["sha256"]:
        raise RuntimeError("Independent station asset hash drift.")
    station_source, station_content_box = load_node_asset(STATION_PATH)
    station_display_width = int(station_manifest["displayWidth"])
    station_fitted = fit_node_asset(station_source, station_display_width)
    station_landmark = next(
        landmark
        for landmark in layout["landmarks"]
        if landmark["id"] == "intercity-station"
    )
    station_top_left, station_bounds = place_node_asset(
        station_fitted,
        station_content_box,
        tuple(station_manifest["dimensions"]),
        tuple(station_manifest["groundAnchor"]),
        station_landmark["conceptPosition"],
    )
    render_queue.append((station_bounds[3], station_fitted, station_top_left))

    proof = terrain.copy()
    proof.alpha_composite(apertured)
    for _, asset, top_left in sorted(render_queue, key=lambda entry: entry[0]):
        proof.alpha_composite(asset, dest=top_left)

    placements.append(
        {
            "skillId": None,
            "id": "intercity-station",
            "conceptPosition": station_landmark["conceptPosition"],
            "assetPath": station_manifest["path"],
            "assetSha256": station_hash,
            "scaleAuthority": NODE_SCALE_AUTHORITY,
            "manifestDisplayWidth": station_display_width,
            "displayWidthDeltaPixels": station_fitted.width - station_display_width,
            "sourceContentBox": list(station_content_box),
            "placedBounds": list(station_bounds),
            "visibleDimensions": list(station_fitted.size),
        }
    )
    return apertured, proof, placements, aperture_mask, render_queue


def build_rail_integrated_proof(
    terrain: Image.Image,
    apertured: Image.Image,
    water_mask: Image.Image,
    water_transition: Image.Image,
    rail_support: Image.Image,
    rail_bed: Image.Image,
    rail_portal_back: Image.Image,
    rail_track: Image.Image,
    rail_portal_foreground: Image.Image,
    station_track_foreground: Image.Image,
    render_queue: list[tuple[int, Image.Image, tuple[int, int]]],
    node_foreground: Image.Image,
) -> Image.Image:
    proof = build_water_transition_proof(
        terrain,
        apertured,
        water_mask,
        water_transition,
    )
    proof.alpha_composite(rail_support)
    proof.alpha_composite(rail_bed)
    proof.alpha_composite(rail_portal_back)
    proof.alpha_composite(rail_track)
    proof.alpha_composite(rail_portal_foreground)
    for _, asset, top_left in sorted(render_queue, key=lambda entry: entry[0]):
        proof.alpha_composite(asset, dest=top_left)
    proof.alpha_composite(station_track_foreground)
    proof.alpha_composite(node_foreground)
    return proof


def build_population_scale_proofs(
    base_proof: Image.Image,
    terrain: Image.Image,
    manifest: dict[str, Any],
) -> dict[str, Any]:
    population = manifest["populationScaleCues"]
    site_manifest = population["siteLayer"]
    close_manifest = population["closeDetailLayer"]
    if population["registration"] != "identity-concept-master":
        raise RuntimeError("Population cues are not identity-registered to the concept.")
    if sha256(POPULATION_SITE_LAYER_PATH) != site_manifest["sha256"]:
        raise RuntimeError("Site population layer hash drifted from its manifest.")
    if sha256(POPULATION_CLOSE_LAYER_PATH) != close_manifest["sha256"]:
        raise RuntimeError("Close population layer hash drifted from its manifest.")

    with Image.open(POPULATION_SITE_LAYER_PATH) as source:
        site_layer = source.convert("RGBA")
    with Image.open(POPULATION_CLOSE_LAYER_PATH) as source:
        close_layer = source.convert("RGBA")
    if site_layer.size != ARTBOARD or close_layer.size != ARTBOARD:
        raise RuntimeError("Population layers do not match the registered city artboard.")

    site_pixels = np.asarray(site_layer, dtype=np.uint8)
    close_pixels = np.asarray(close_layer, dtype=np.uint8)
    site_transparent_rgb = int(np.count_nonzero(
        (site_pixels[:, :, 3] == 0)
        & np.any(site_pixels[:, :, :3] != 0, axis=2)
    ))
    close_transparent_rgb = int(np.count_nonzero(
        (close_pixels[:, :, 3] == 0)
        & np.any(close_pixels[:, :, :3] != 0, axis=2)
    ))
    if site_transparent_rgb != 0 or close_transparent_rgb != 0:
        raise RuntimeError("Population layers retain RGB data under zero alpha.")

    site_proof = base_proof.copy()
    site_proof.alpha_composite(site_layer)
    save_png_atomic(site_proof, POPULATION_SITE_PROOF_PATH)
    close_proof = site_proof.copy()
    close_proof.alpha_composite(close_layer)
    save_png_atomic(close_proof, POPULATION_CLOSE_PROOF_PATH)

    cues = population["cues"]
    expected_species = {"dwarf", "elf", "gnome", "human", "orc"}
    site_cues = [cue for cue in cues if cue["minimumDetailTier"] == "site"]
    close_cues = [cue for cue in cues if cue["minimumDetailTier"] == "close"]
    if len(site_cues) != 8 or len(close_cues) != 8:
        raise RuntimeError("Population site/close cue split must remain 8 + 8.")
    if {cue["species"] for cue in site_cues} != expected_species:
        raise RuntimeError("Site population cues do not cover all five species.")
    if {cue["species"] for cue in close_cues} != expected_species:
        raise RuntimeError("Close population supplement does not cover all five species.")

    terrain_alpha = terrain.getchannel("A")
    support_records: list[dict[str, Any]] = []
    for cue in cues:
        concept_position = cue["conceptPosition"]
        if concept_position != cue["localPosition"]:
            raise RuntimeError(f"Population cue moved off concept registration: {cue['id']}")
        anchor = pixel((concept_position["x"], concept_position["y"]))
        support_box = (
            max(0, anchor[0] - 5),
            max(0, anchor[1] - 3),
            min(ARTBOARD[0], anchor[0] + 6),
            min(ARTBOARD[1], anchor[1] + 4),
        )
        support_alpha = max(terrain_alpha.crop(support_box).get_flattened_data())
        if support_alpha < 32:
            raise RuntimeError(
                f"Population cue lacks canonical land support: {cue['id']}"
            )
        support_records.append({
            "id": cue["id"],
            "species": cue["species"],
            "minimumDetailTier": cue["minimumDetailTier"],
            "conceptPosition": concept_position,
            "displayHeight": cue["displayHeight"],
            "terrainSupportAlpha": support_alpha,
        })

    cue_by_id = {cue["id"]: cue for cue in cues}
    closeup_ids = (
        "dwarf-mason",
        "elf-archivist",
        "orc-foundry-artisan",
        "human-station-porter",
        "gnome-courier",
        "elf-citadel-steward",
    )
    tile_size = (620, 480)
    closeup_qa = Image.new(
        "RGBA",
        (tile_size[0] * 3, tile_size[1] * 2),
        (7, 11, 12, 255),
    )
    closeup_draw = ImageDraw.Draw(closeup_qa)
    for index, cue_id in enumerate(closeup_ids):
        cue = cue_by_id[cue_id]
        concept_position = cue["conceptPosition"]
        anchor_x, anchor_y = pixel((concept_position["x"], concept_position["y"]))
        crop_box = (
            max(0, anchor_x - 180),
            max(0, anchor_y - 245),
            min(ARTBOARD[0], anchor_x + 180),
            min(ARTBOARD[1], anchor_y + 55),
        )
        crop = close_proof.crop(crop_box).resize(
            (tile_size[0], tile_size[1]),
            Image.Resampling.LANCZOS,
        )
        tile_x = index % 3 * tile_size[0]
        tile_y = index // 3 * tile_size[1]
        closeup_qa.alpha_composite(crop, dest=(tile_x, tile_y))
        closeup_draw.rectangle(
            (tile_x, tile_y + tile_size[1] - 31, tile_x + tile_size[0], tile_y + tile_size[1]),
            fill=(5, 9, 10, 222),
        )
        closeup_draw.text(
            (tile_x + 12, tile_y + tile_size[1] - 23),
            f"{cue['minimumDetailTier'].upper()} / {cue['species'].upper()} / {cue_id}",
            fill=(235, 226, 197, 255),
        )
    save_png_atomic(closeup_qa, POPULATION_CLOSEUP_QA_PATH)

    return {
        "status": "site-and-close-detail-lod-proof",
        "registration": population["registration"],
        "siteCueCount": len(site_cues),
        "closeSupplementCueCount": len(close_cues),
        "siteSpecies": sorted({cue["species"] for cue in site_cues}),
        "closeSupplementSpecies": sorted({cue["species"] for cue in close_cues}),
        "siteVisibleTiers": ["site", "close"],
        "closeSupplementVisibleTiers": ["close"],
        "hiddenTiers": ["world", "territory", "capital"],
        "affectsTerrain": False,
        "affectsBuildingGeometry": False,
        "siteLayerSha256": sha256(POPULATION_SITE_LAYER_PATH),
        "closeDetailLayerSha256": sha256(POPULATION_CLOSE_LAYER_PATH),
        "siteProofSha256": sha256(POPULATION_SITE_PROOF_PATH),
        "closeProofSha256": sha256(POPULATION_CLOSE_PROOF_PATH),
        "closeupQaSha256": sha256(POPULATION_CLOSEUP_QA_PATH),
        "siteTransparentRgbUnderZeroAlpha": site_transparent_rgb,
        "closeTransparentRgbUnderZeroAlpha": close_transparent_rgb,
        "displayHeightRange": [
            min(cue["displayHeight"] for cue in cues),
            max(cue["displayHeight"] for cue in cues),
        ],
        "terrainSupport": support_records,
    }


def build_station_track_foreground(
    rail_track: Image.Image,
    layout: dict[str, Any],
) -> Image.Image:
    station = next(
        landmark for landmark in layout["landmarks"] if landmark["id"] == "intercity-station"
    )
    center_x, center_y = pixel(station["conceptPosition"])
    platform_mask = Image.new("L", ARTBOARD, 0)
    ImageDraw.Draw(platform_mask).ellipse(
        (
            center_x - 145,
            center_y - 90,
            center_x + 145,
            center_y + 45,
        ),
        fill=255,
    )
    foreground_alpha = ImageChops.multiply(
        rail_track.getchannel("A"),
        platform_mask,
    )
    pixels = np.asarray(rail_track, dtype=np.uint8).copy()
    pixels[:, :, 3] = np.asarray(foreground_alpha, dtype=np.uint8)
    pixels[pixels[:, :, 3] == 0] = 0
    return Image.fromarray(pixels, "RGBA")


def build_rail_registration_qa(
    integrated: Image.Image,
    layout: dict[str, Any],
) -> Image.Image:
    qa = integrated.copy()
    overlay = Image.new("RGBA", ARTBOARD, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    for segment in layout["railSegments"]:
        points = [pixel(point) for point in segment["conceptPoints"]]
        if segment["kind"] == "hidden-tunnel":
            for index in range(len(points) - 1):
                start = points[index]
                end = points[index + 1]
                for dash in range(0, 12, 2):
                    t0 = dash / 12
                    t1 = min(1.0, (dash + 1) / 12)
                    draw.line(
                        (
                            (
                                round(start[0] + (end[0] - start[0]) * t0),
                                round(start[1] + (end[1] - start[1]) * t0),
                            ),
                            (
                                round(start[0] + (end[0] - start[0]) * t1),
                                round(start[1] + (end[1] - start[1]) * t1),
                            ),
                        ),
                        fill=(190, 103, 255, 210),
                        width=4,
                    )
        else:
            draw.line(points, fill=(255, 205, 84, 190), width=3, joint="curve")
        for point in points:
            draw.ellipse(
                (point[0] - 5, point[1] - 5, point[0] + 5, point[1] + 5),
                fill=(255, 232, 148, 220),
            )

    landmark_by_id = {landmark["id"]: landmark for landmark in layout["landmarks"]}
    for portal_id in (
        layout["railTopologyOverride"]["stationPortalId"],
        layout["railTopologyOverride"]["southPortalId"],
    ):
        center = pixel(landmark_by_id[portal_id]["conceptPosition"])
        draw.ellipse(
            (center[0] - 12, center[1] - 12, center[0] + 12, center[1] + 12),
            outline=(91, 207, 231, 255),
            width=3,
        )
    station = landmark_by_id["intercity-station"]
    station_center = pixel(station["conceptPosition"])
    draw.ellipse(
        (
            station_center[0] - 12,
            station_center[1] - 12,
            station_center[0] + 12,
            station_center[1] + 12,
        ),
        outline=(123, 224, 166, 255),
        width=3,
    )
    qa.alpha_composite(overlay)
    return qa


def main() -> None:
    reference_hash = sha256(REFERENCE_PATH)
    terrain_hash = sha256(REGIONAL_TERRAIN_PATH)
    selected_source_hash = sha256(SELECTED_SOURCE_PATH)
    if reference_hash != EXPECTED_REFERENCE_SHA256:
        raise RuntimeError("The accepted concept master has drifted.")
    if terrain_hash != EXPECTED_REGIONAL_TERRAIN_SHA256:
        raise RuntimeError("The frozen regional terrain has drifted.")
    if selected_source_hash != EXPECTED_SELECTED_SOURCE_SHA256:
        raise RuntimeError("The selected city-environment source has drifted.")
    if sha256(BRIDGE_ATLAS_PATH) != EXPECTED_BRIDGE_ATLAS_SHA256:
        raise RuntimeError("The independent city bridge atlas has drifted.")
    if sha256(BRIDGE_STEEP_PATH) != EXPECTED_BRIDGE_STEEP_SHA256:
        raise RuntimeError("The independent steep city bridge has drifted.")

    layout = json.loads(LAYOUT_PATH.read_text(encoding="utf-8"))
    manifest = json.loads(CITY_MANIFEST_PATH.read_text(encoding="utf-8"))
    transform = layout["conceptToCapitalTransform"]
    if transform["offset"] != [0.0, 0.0] or transform["scale"] != [1.0, 1.0]:
        raise RuntimeError("Concept substrate proof requires identity registration.")

    with Image.open(REGIONAL_TERRAIN_PATH) as source:
        terrain = source.convert("RGBA").resize(ARTBOARD, Image.Resampling.LANCZOS)
    with Image.open(REFERENCE_PATH) as source:
        concept = source.convert("RGBA").resize(ARTBOARD, Image.Resampling.LANCZOS)
    with Image.open(SELECTED_SOURCE_PATH) as source:
        selected = chroma_key_selected_source(source).resize(
            ARTBOARD,
            Image.Resampling.LANCZOS,
        )
    city_alpha, bridge_mask, selected_city_mask = build_city_mask(
        layout,
        terrain.getchannel("A"),
    )
    concept.putalpha(city_alpha)
    # The keyed source owns its own silhouette. Terrain alpha remains physics
    # authority, but cannot clip towers, bridge arches, cliff lips, or other
    # legitimate isometric overhangs from this visual-only detail layer.
    selected_alpha = ImageChops.multiply(
        selected.getchannel("A"),
        selected_city_mask,
    )
    selected.putalpha(selected_alpha)
    (
        selected,
        selected_magenta_before,
        selected_unassigned_chroma_removed,
    ) = decontaminate_magenta_edges(selected)
    selected_magenta_after = magenta_edge_pixel_count(selected)
    if selected_magenta_after != 0:
        raise RuntimeError(
            "Selected city-environment source retains visible magenta edge pixels."
        )
    (
        selected,
        selected_plum_boundary_before,
        selected_plum_boundary_pixels_cleared,
    ) = decontaminate_plum_silhouette(selected)
    _, selected_plum_boundary_after, _ = decontaminate_plum_silhouette(selected)
    if selected_plum_boundary_after != 0:
        raise RuntimeError(
            "Selected city-environment source retains unresolved plum silhouette pixels."
        )

    FABRIC_ROOT.mkdir(parents=True, exist_ok=True)
    QA_ROOT.mkdir(parents=True, exist_ok=True)
    save_png_atomic(concept, OVERLAY_PATH)
    save_png_atomic(selected, SELECTED_OVERLAY_PATH)

    proof = terrain.copy()
    proof.alpha_composite(concept)
    save_png_atomic(proof, PROOF_PATH)

    selected_proof = terrain.copy()
    selected_proof.alpha_composite(selected)
    save_png_atomic(selected_proof, SELECTED_PROOF_PATH)

    aperture_mask, summit_ownership_mask = build_node_aperture_mask(
        layout,
        manifest,
        terrain.getchannel("A"),
    )
    (
        apertured,
        node_proof,
        node_placements,
        aperture_mask,
        node_render_queue,
    ) = build_node_scale_proof(
        terrain,
        selected,
        aperture_mask,
        layout,
        manifest,
    )
    save_png_atomic(apertured, APERTURED_OVERLAY_PATH)
    save_png_atomic(node_proof, NODE_PROOF_PATH)

    water_mask = build_registered_inland_water_mask()
    capital_coherent_base, capital_coherent_base_validation = (
        build_capital_coherent_base(selected, water_mask)
    )
    save_png_atomic(capital_coherent_base, CAPITAL_COHERENT_BASE_PATH)
    capital_coherent_base_proof = terrain.copy()
    capital_coherent_base_proof.alpha_composite(capital_coherent_base)
    save_png_atomic(
        capital_coherent_base_proof,
        CAPITAL_COHERENT_BASE_PROOF_PATH,
    )
    water_transition, water_transition_validation = build_water_transition_layer(
        apertured,
        bridge_mask,
        water_mask,
        layout,
    )
    save_png_atomic(water_transition, WATER_TRANSITION_PATH)
    water_transition_proof = build_water_transition_proof(
        terrain,
        apertured,
        water_mask,
        water_transition,
    )
    save_png_atomic(water_transition_proof, WATER_TRANSITION_PROOF_PATH)
    node_foreground = build_node_foreground(
        selected,
        layout,
        manifest,
        aperture_mask,
        summit_ownership_mask,
        terrain.getchannel("A"),
        water_mask,
    )
    node_foreground.alpha_composite(
        build_summit_transition_foreground(terrain, summit_ownership_mask)
    )
    save_png_atomic(node_foreground, NODE_FOREGROUND_PATH)
    summit_ownership = validate_summit_placeholder_ownership(
        selected,
        apertured,
        node_foreground,
        summit_ownership_mask,
    )
    node_transition_coverage = measure_node_transition_coverage(
        layout,
        manifest,
        selected,
        aperture_mask,
        node_foreground,
        terrain.getchannel("A"),
        summit_ownership_mask,
    )
    integrated_node_proof = water_transition_proof.copy()
    for _, asset, top_left in sorted(
        node_render_queue,
        key=lambda entry: entry[0],
    ):
        integrated_node_proof.alpha_composite(asset, dest=top_left)
    integrated_node_proof.alpha_composite(node_foreground)
    save_png_atomic(integrated_node_proof, NODE_INTEGRATED_PROOF_PATH)
    (
        rail_support,
        rail_bed,
        rail_portal_back,
        rail_track,
        rail_portal_foreground,
        rail_validation,
    ) = build_registered_rail_layers(layout)
    save_png_atomic(rail_support, RAIL_SUPPORT_PATH)
    save_png_atomic(rail_bed, RAIL_BED_PATH)
    save_png_atomic(rail_portal_back, RAIL_PORTAL_BACK_PATH)
    save_png_atomic(rail_track, RAIL_TRACK_PATH)
    save_png_atomic(rail_portal_foreground, RAIL_PORTAL_FOREGROUND_PATH)
    station_track_foreground = build_station_track_foreground(rail_track, layout)
    station_track_foreground_pixels = sum(
        1
        for value in station_track_foreground.getchannel("A").get_flattened_data()
        if value >= 16
    )
    if station_track_foreground_pixels <= 0:
        raise RuntimeError("Station platform has no independent foreground track pixels.")
    rail_validation["stationPlatformForegroundPixels"] = (
        station_track_foreground_pixels
    )
    save_png_atomic(station_track_foreground, RAIL_STATION_FOREGROUND_PATH)
    rail_integrated_proof = build_rail_integrated_proof(
        terrain,
        apertured,
        water_mask,
        water_transition,
        rail_support,
        rail_bed,
        rail_portal_back,
        rail_track,
        rail_portal_foreground,
        station_track_foreground,
        node_render_queue,
        node_foreground,
    )
    save_png_atomic(rail_integrated_proof, RAIL_INTEGRATED_PROOF_PATH)
    population_validation = build_population_scale_proofs(
        rail_integrated_proof,
        terrain,
        manifest,
    )
    rail_registration_qa = build_rail_registration_qa(
        rail_integrated_proof,
        layout,
    )
    save_png_atomic(rail_registration_qa, RAIL_REGISTRATION_QA_PATH)
    aperture_qa = terrain.copy()
    aperture_qa.alpha_composite(apertured)
    save_png_atomic(aperture_qa, APERTURE_QA_PATH)

    summit_qa = selected.copy()
    summit_overlay = Image.new("RGBA", ARTBOARD, (0, 0, 0, 0))
    summit_overlay.putalpha(summit_ownership_mask.point(lambda value: value // 2))
    summit_pixels = np.asarray(summit_overlay, dtype=np.uint8).copy()
    summit_pixels[:, :, 0] = 238
    summit_pixels[:, :, 1] = 76
    summit_pixels[:, :, 2] = 54
    summit_overlay = Image.fromarray(summit_pixels, "RGBA")
    summit_qa.alpha_composite(summit_overlay)
    save_png_atomic(summit_qa, SUMMIT_OWNERSHIP_QA_PATH)

    alpha_qa = Image.new("RGBA", ARTBOARD, (28, 34, 42, 255))
    alpha_qa.alpha_composite(concept)
    save_png_atomic(alpha_qa, ALPHA_PATH)

    selected_alpha_qa = Image.new("RGBA", ARTBOARD, (28, 34, 42, 255))
    selected_alpha_qa.alpha_composite(selected)
    save_png_atomic(selected_alpha_qa, SELECTED_ALPHA_PATH)

    alpha = concept.getchannel("A")
    validation = {
        "schemaVersion": 1,
        "status": "concept-substrate-and-node-scale-proof-only",
        "productionReady": False,
        "runtimeEligible": False,
        "terrainBinding": "frozen-regional-terrain",
        "conceptRegistration": transform,
        "referenceSha256": reference_hash,
        "regionalTerrainSha256": terrain_hash,
        "selectedSourceSha256": selected_source_hash,
        "overlaySha256": sha256(OVERLAY_PATH),
        "proofSha256": sha256(PROOF_PATH),
        "selectedOverlaySha256": sha256(SELECTED_OVERLAY_PATH),
        "selectedProofSha256": sha256(SELECTED_PROOF_PATH),
        "aperturedOverlaySha256": sha256(APERTURED_OVERLAY_PATH),
        "apertureQaSha256": sha256(APERTURE_QA_PATH),
        "summitOwnershipQaSha256": sha256(SUMMIT_OWNERSHIP_QA_PATH),
        "nodeScaleProofSha256": sha256(NODE_PROOF_PATH),
        "infrastructureAtlasSha256": sha256(INFRASTRUCTURE_ATLAS_PATH),
        "bridgeAtlasSha256": sha256(BRIDGE_ATLAS_PATH),
        "bridgeSteepSha256": sha256(BRIDGE_STEEP_PATH),
        "waterTransitionSha256": sha256(WATER_TRANSITION_PATH),
        "waterTransitionProofSha256": sha256(WATER_TRANSITION_PROOF_PATH),
        "waterTransition": water_transition_validation,
        "capitalCoherentBaseSha256": sha256(CAPITAL_COHERENT_BASE_PATH),
        "capitalCoherentBaseProofSha256": sha256(
            CAPITAL_COHERENT_BASE_PROOF_PATH
        ),
        "capitalCoherentBase": capital_coherent_base_validation,
        "nodeTransitionForegroundSha256": sha256(NODE_FOREGROUND_PATH),
        "nodeIntegratedProofSha256": sha256(NODE_INTEGRATED_PROOF_PATH),
        "railSegmentSourceSha256": sha256(RAIL_SEGMENT_SOURCE_PATH),
        "railSegmentAlphaSha256": sha256(RAIL_SEGMENT_ALPHA_PATH),
        "railSupportSha256": sha256(RAIL_SUPPORT_PATH),
        "railBedSha256": sha256(RAIL_BED_PATH),
        "railPortalBackSha256": sha256(RAIL_PORTAL_BACK_PATH),
        "railTrackSha256": sha256(RAIL_TRACK_PATH),
        "railPortalForegroundSha256": sha256(RAIL_PORTAL_FOREGROUND_PATH),
        "railStationForegroundSha256": sha256(RAIL_STATION_FOREGROUND_PATH),
        "railIntegratedProofSha256": sha256(RAIL_INTEGRATED_PROOF_PATH),
        "railRegistrationQaSha256": sha256(RAIL_REGISTRATION_QA_PATH),
        "rail": rail_validation,
        "populationScaleCues": population_validation,
        "dimensions": list(ARTBOARD),
        "cornerAlpha": [
            alpha.getpixel((0, 0)),
            alpha.getpixel((ARTBOARD[0] - 1, 0)),
            alpha.getpixel((0, ARTBOARD[1] - 1)),
            alpha.getpixel((ARTBOARD[0] - 1, ARTBOARD[1] - 1)),
        ],
        "nonzeroAlphaPixels": sum(
            1 for value in alpha.get_flattened_data() if value > 0
        ),
        "selectedNonzeroAlphaPixels": sum(
            1 for value in selected_alpha.get_flattened_data() if value > 0
        ),
        "selectedMagentaEdgePixelsBeforeRepair": selected_magenta_before,
        "selectedMagentaEdgePixelsAfterRepair": selected_magenta_after,
        "selectedUnassignedChromaPixelsRemoved": selected_unassigned_chroma_removed,
        "selectedPlumBoundaryPixelsBeforeRepair": selected_plum_boundary_before,
        "selectedPlumBoundaryPixelsCleared": selected_plum_boundary_pixels_cleared,
        "selectedPlumBoundaryPixelsAfterRepair": selected_plum_boundary_after,
        "selectedSilhouetteUsesSourceAlpha": True,
        "terrainAlphaClipsSelectedOverhangs": False,
        "bridgePixelCount": sum(
            1 for value in bridge_mask.get_flattened_data() if value > 0
        ),
        "nodeApertureCount": 20,
        "skillNodeCount": sum(
            1 for placement in node_placements if placement["skillId"] is not None
        ),
        "nodeScaleAuthority": NODE_SCALE_AUTHORITY,
        "scaleClassControlsDisplayWidth": False,
        "allNodeDisplayWidthsMatchManifest": all(
            placement["displayWidthDeltaPixels"] == 0
            for placement in node_placements
        ),
        "skillDisplayWidthRange": [
            min(
                placement["manifestDisplayWidth"]
                for placement in node_placements
                if placement["skillId"] is not None
            ),
            max(
                placement["manifestDisplayWidth"]
                for placement in node_placements
                if placement["skillId"] is not None
            ),
        ],
        "stationDisplayWidth": next(
            placement["manifestDisplayWidth"]
            for placement in node_placements
            if placement["skillId"] is None
        ),
        "stationIsIndependentAsset": True,
        "aperturesCreateOffTerrainHoles": False,
        "aperturePixelCount": sum(
            1 for value in aperture_mask.get_flattened_data() if value > 0
        ),
        "nodeTransitionForegroundPixelCount": sum(
            1
            for value in node_foreground.getchannel("A").get_flattened_data()
            if value > 0
        ),
        "nodeTransitionForegroundSource": "selected-city-environment-source-pixels",
        "nodeTransitionForegroundUnregisteredWaterOverlapPixels": (
            ImageChops.multiply(
                node_foreground.getchannel("A").point(
                    lambda value: 255 if value >= 16 else 0
                ),
                water_mask.point(lambda value: 255 if value >= 128 else 0),
            ).histogram()[255]
        ),
        "allSkillNodesHaveDetailTransitions": all(
            record["passes"] for record in node_transition_coverage
        ),
        "nodeTransitionCoverageGate": {
            "minimumAperturePixels": 140,
            "maximumOffTerrainAperturePixels": 0,
            "minimumRetainedSourcePerimeterPixels": 180,
            "minimumForegroundOcclusionPixels": 250,
            "minimumForegroundOcclusionCoverageRatio": 0.025,
        },
        "nodeTransitionCoverage": node_transition_coverage,
        "nodePlacements": node_placements,
        "summitPlaceholderOwnership": summit_ownership,
        "ownershipStillPending": [
            "moving train runtime binding to independent rail centerline",
            "per-node animated layer and foreground depth registration",
            "animated layer runtime binding",
        ],
        "ownershipDelegated": [],
    }
    if not validation["allNodeDisplayWidthsMatchManifest"]:
        raise RuntimeError("Rendered node widths drift from the city manifest authority.")
    VALIDATION_PATH.write_text(
        json.dumps(validation, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        json.dumps(
            {
                "status": validation["status"],
                "nodeCount": validation["skillNodeCount"],
                "allSkillNodesHaveDetailTransitions": validation[
                    "allSkillNodesHaveDetailTransitions"
                ],
                "railSegmentCount": validation["rail"]["segmentCount"],
                "railChainCount": validation["rail"]["chainCount"],
                "hiddenTunnelSurfaceTrackPixels": validation["rail"][
                    "hiddenTunnelSurfaceTrackPixels"
                ],
                "southSoutheastBottomExitPixels": validation["rail"][
                    "southSoutheastBottomExitPixels"
                ],
                "populationSiteCueCount": validation["populationScaleCues"][
                    "siteCueCount"
                ],
                "populationCloseSupplementCueCount": validation[
                    "populationScaleCues"
                ]["closeSupplementCueCount"],
                "railIntegratedProofSha256": validation[
                    "railIntegratedProofSha256"
                ],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
