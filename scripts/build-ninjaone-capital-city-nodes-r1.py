from __future__ import annotations

import hashlib
import json
import math
from collections import deque
from pathlib import Path
from typing import Any

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont


REPO = Path(__file__).resolve().parents[1]
PUBLIC = REPO / "public"
CITY_ROOT = PUBLIC / "career-world/capitals/ninjaone/city-r1"
BUILDING_ROOT = CITY_ROOT / "skill-buildings"
POSTER_ROOT = CITY_ROOT / "posters"
REFERENCE_ROOT = CITY_ROOT / "references"
QA_ROOT = CITY_ROOT / "qa"
FABRIC_ROOT = CITY_ROOT / "fabric"
POPULATION_ROOT = CITY_ROOT / "population"
MANIFEST_PATH = (
    PUBLIC
    / "career-world/capitals/ninjaone/manifests/city-node-composition-r1.json"
)
VALIDATION_PATH = QA_ROOT / "city-node-composition-r1.validation.json"
PREVIEW_PATH = QA_ROOT / "city-node-composition-preview-r3.png"
OVERLAY_PATH = QA_ROOT / "city-node-placement-overlay-r1.png"
COMPARISON_PATH = QA_ROOT / "city-node-reference-comparison-r1.png"
TERRAIN_ADMISSION_OVERLAY_PATH = QA_ROOT / "city-node-terrain-admission-overlay-r1.png"
CITY_FABRIC_PREVIEW_PATH = QA_ROOT / "city-fabric-replacement-slots-r1.png"
CITY_FABRIC_UNDERLAY_PATH = FABRIC_ROOT / "city-fabric-underlay-r3.png"
CITY_FABRIC_FOREGROUND_PATH = FABRIC_ROOT / "city-fabric-foreground-r3.png"
CITY_FABRIC_CONTACT_PATH = FABRIC_ROOT / "city-terrain-contact-r3.png"
CITY_ENVIRONMENT_DETAIL_PATH = FABRIC_ROOT / "city-environment-transition-detail-r3.png"
CITY_FABRIC_CONNECTIVITY_QA_PATH = QA_ROOT / "city-fabric-connectivity-r3.png"
CITY_OVERVIEW_PATH = FABRIC_ROOT / "city-settlement-overview-r2.png"
CITY_OVERVIEW_PREVIEW_PATH = QA_ROOT / "city-settlement-overview-preview-r2.png"
CITY_RAIL_SUPPORT_PATH = FABRIC_ROOT / "territory-rail-southbound-support-r1.png"
CITY_RAIL_BED_PATH = FABRIC_ROOT / "territory-rail-southbound-bed-r1.png"
CITY_RAIL_TRACK_PATH = FABRIC_ROOT / "territory-rail-southbound-track-r1.png"
CITY_RAIL_SEGMENT_ALPHA_PATH = FABRIC_ROOT / "rail-perspective-segment-atlas-alpha-r1.png"
POPULATION_ATLAS_PATH = POPULATION_ROOT / "temporary-fantasy-citizens-atlas-alpha-r1.png"
POPULATION_LAYER_PATH = POPULATION_ROOT / "temporary-fantasy-population-scale-cues-r1.png"
POPULATION_SITE_LAYER_PATH = POPULATION_ROOT / "temporary-fantasy-population-site-r1.png"
POPULATION_CLOSE_LAYER_PATH = (
    POPULATION_ROOT / "temporary-fantasy-population-close-supplement-r1.png"
)
GO_OPAQUE_BASE_PATH = BUILDING_ROOT / "golang-layers/golang-building-static-clean-r2.png"
GO_ALPHA_BASE_PATH = BUILDING_ROOT / "golang-layers/golang-building-static-alpha-r3.png"
GO_ALPHA_POSTER_PATH = POSTER_ROOT / "golang-poster-alpha-r3.png"
GO_ALPHA_QA_PATH = QA_ROOT / "golang-static-alpha-backgrounds-r3.png"
EXPECTED_GO_OPAQUE_BASE_SHA256 = (
    "afb3de7530580b4d19eb6b20d776cd660b26a4962955096cb80b47b342cfeacd"
)

# Preserve the pre-B1 world-units-per-pixel scale after widening the capital
# registration from 0.175 x 0.233333 to 0.25 x 0.333333 of the world plane.
ARTBOARD = (2571, 1929)
PRE_B1_ARTBOARD = (1800, 1350)
# The regional composition uses the larger B1/B2/C1/C2 canvas while preserving
# the pre-B1 world-units-per-pixel calibration. Individual buildings remain
# independent nodes; territory view uses a separately authored sparse LOD.
CITY_VISUAL_SCALE = ARTBOARD[0] / PRE_B1_ARTBOARD[0]
CITY_NODE_SOURCE_SCALE = 0.60
CITY_NODE_DISPLAY_SCALE = CITY_NODE_SOURCE_SCALE * CITY_VISUAL_SCALE
CITY_FABRIC_SCALE = 0.78
CITY_FABRIC_OFFSET = (0.08, 0.08)
STATION_DISPLAY_WIDTH = round(240 * CITY_VISUAL_SCALE)
STATION_SOURCE_LOCAL_POSITION = (0.4004, 0.4849)
STATION_GROUND_ANCHOR = (0.5, 0.85)
SOUTHBOUND_RAIL_STATION_LOCAL_POSITION = (
    CITY_FABRIC_OFFSET[0] + STATION_SOURCE_LOCAL_POSITION[0] * CITY_FABRIC_SCALE,
    CITY_FABRIC_OFFSET[1] + STATION_SOURCE_LOCAL_POSITION[1] * CITY_FABRIC_SCALE,
)
SOUTHBOUND_RAIL_STATION_TRACK_LOCAL_POSITION = (
    SOUTHBOUND_RAIL_STATION_LOCAL_POSITION[0],
    SOUTHBOUND_RAIL_STATION_LOCAL_POSITION[1] - 0.050,
)
SOUTHBOUND_RAIL_GATEWAY_SOURCE_POSITION = (0.4153, 0.8206)
SOUTHBOUND_RAIL_GATEWAY_LOCAL_POSITION = (
    CITY_FABRIC_OFFSET[0]
    + SOUTHBOUND_RAIL_GATEWAY_SOURCE_POSITION[0] * CITY_FABRIC_SCALE,
    CITY_FABRIC_OFFSET[1]
    + SOUTHBOUND_RAIL_GATEWAY_SOURCE_POSITION[1] * CITY_FABRIC_SCALE,
)
SOUTHBOUND_RAIL_EXIT_CONTROL_POINTS = (
    SOUTHBOUND_RAIL_STATION_TRACK_LOCAL_POSITION,
    (0.434, 0.456),
    (0.467, 0.523),
    (0.511, 0.596),
    (0.563, 0.627),
    (0.658, 0.709),
    (0.753, 0.791),
    (0.848, 0.873),
    (0.943, 0.955),
    (1.020, 1.025),
)
REFERENCE_PATH = REFERENCE_ROOT / "capital-master-direction-r1.png"
CITY_FABRIC_SOURCE_PATH = (
    REPO
    / "art-source/career-world/ninjaone-capital/city-layer-r1/city-fabric/"
    "city-support-fabric-components-alpha-r1.png"
)
CITY_CIRCULATION_SOURCE_PATH = (
    REPO
    / "art-source/career-world/ninjaone-capital/city-layer-r1/city-fabric/"
    "city-circulation-fabric-alpha-r3.png"
)
INFRASTRUCTURE_ATLAS_PATH = (
    REPO
    / "art-source/career-world/ninjaone-capital/city-layer-r1/city-fabric/"
    "infrastructure-transition-atlas-alpha-r2.png"
)
RAIL_SEGMENT_ATLAS_PATH = (
    REPO
    / "art-source/career-world/ninjaone-capital/city-layer-r1/transport/"
    "rail-perspective-segment-atlas-chroma-r1.png"
)
POPULATION_SOURCE_PATH = (
    REPO
    / "art-source/career-world/ninjaone-capital/city-layer-r1/population/"
    "temporary-fantasy-citizens-checker-source-r1.png"
)
LAND_MASK_PATH = (
    PUBLIC
    / "career-world/layers/territory-landform/masks/world-land-mask-r4.png"
)
HEIGHT_PATH = (
    PUBLIC
    / "career-world/layers/territory-landform/fields/terrain-height-r4.png"
)
SLOPE_PATH = (
    PUBLIC
    / "career-world/layers/territory-landform/fields/terrain-slope-r4.png"
)
RELIEF_PATH = (
    PUBLIC
    / "career-world/layers/territory-landform/textures/terrain-relief-r6-detail-4x.png"
)
REGIONAL_TERRAIN_PATH = (
    REPO
    / "art-source/career-world/ninjaone-environment/production-r2/"
    "ninjaone-environment-terrain-master-detail-r2.png"
)
HYDROLOGY_MANIFEST_PATH = (
    PUBLIC
    / "career-world/capitals/ninjaone/environment/manifests/inland-water-r1.json"
)
STATION_PATH = (
    PUBLIC
    / "career-world/shared-assets/transportation/train/stations/"
    "ninjaone-intercity-station-r2.png"
)

EXPECTED_LAND_MASK_SHA256 = (
    "8801722b801b2ecabd048dc71ac99ff7f0c566e69e06a50d9c4e41706dd7003a"
)
EXPECTED_HEIGHT_SHA256 = (
    "8cb7d6480a707c33e220a55611af8557c3fc9440f0c347cf9a786adcb1f41e3f"
)
EXPECTED_SLOPE_SHA256 = (
    "c248599daeb10e5c8d71dc15ef2cc65d3b90a8f77165ab0cfda5c770676e6134"
)
EXPECTED_RELIEF_SHA256 = (
    "6bab5e350840a7f832d19add140fd49a7523b12ffc06899f343064d3de07f32b"
)
EXPECTED_REGIONAL_TERRAIN_SHA256 = (
    "49142b55478362e85a02e14345859089a78bd01b49a3126d84ff1df7cb283b02"
)
EXPECTED_REFERENCE_SHA256 = (
    "dc94cc3c90eaf3a20976f5eeb4d0622a491782682837eefdce6d97f62c45d308"
)
EXPECTED_STATION_SHA256 = (
    "9ba92ef5132c4953f0477274fdaa89552ee2c10f0c41d5a49cc7b7195525ab8e"
)
EXPECTED_CITY_FABRIC_SOURCE_SHA256 = (
    "789b9b393857df248546fec423753513d2be80ca3fd689cb9dd8c300b53dddf0"
)
EXPECTED_CITY_CIRCULATION_SOURCE_SHA256 = (
    "180cd52b09a95ade8630e10a6f7dff94a66cf1122ee0264b2d02d4876a79a632"
)
EXPECTED_INFRASTRUCTURE_ATLAS_SHA256 = (
    "f48b2fd0da75cdfb477bf174debac1de3d8a9e838a0906875c4daeed98a8b9bb"
)
EXPECTED_RAIL_SEGMENT_ATLAS_SHA256 = (
    "83ae9b929e8131dc0ea12febede5279a6e12ecd66cfb17213281e91c122c92d8"
)
EXPECTED_POPULATION_SOURCE_SHA256 = (
    "827bdfb3f5ff04000df913d642f59273092172f9ed603fe2f4e2dbeb5d70bdb4"
)

REGIONAL_WORLD_ORIGIN = (0.125, 0.0)
REGIONAL_WORLD_SPAN = (0.25, 0.3333333333333333)
REGIONAL_DIMENSIONS = (5760, 4320)
CAPITAL_WORLD_ORIGIN = REGIONAL_WORLD_ORIGIN
CAPITAL_WORLD_SPAN = REGIONAL_WORLD_SPAN
CAPITAL_REGIONAL_PIXEL_BOUNDS = (0, 0, *REGIONAL_DIMENSIONS)
LAND_THRESHOLD = 128
BUILDABLE_SLOPE_THRESHOLD = 112


def city_px(value: float, *, minimum: int = 1) -> int:
    return max(minimum, round(value * CITY_VISUAL_SCALE))


def city_odd_px(value: float, *, minimum: int = 3) -> int:
    scaled = city_px(value, minimum=minimum)
    return scaled if scaled % 2 == 1 else scaled + 1


def fabric_local_position(position: tuple[float, float]) -> tuple[float, float]:
    return (
        CITY_FABRIC_OFFSET[0] + position[0] * CITY_FABRIC_SCALE,
        CITY_FABRIC_OFFSET[1] + position[1] * CITY_FABRIC_SCALE,
    )


def fabric_local_envelope(envelope: dict[str, float]) -> dict[str, float]:
    return {
        "x": CITY_FABRIC_OFFSET[0] + envelope["x"] * CITY_FABRIC_SCALE,
        "y": CITY_FABRIC_OFFSET[1] + envelope["y"] * CITY_FABRIC_SCALE,
        "width": envelope["width"] * CITY_FABRIC_SCALE,
        "height": envelope["height"] * CITY_FABRIC_SCALE,
    }


STATION_LOCAL_POSITION = fabric_local_position(STATION_SOURCE_LOCAL_POSITION)

# Modular authored infrastructure. The connected urban substrate owns the
# district continuity; these pieces provide camera-authored paving, stairs,
# bridges, plazas, and rocky seams without reintroducing a monolithic plate.
# Atlas cells: straight, curve / stairs, bridge / plaza, rocky seam.
CITY_INFRASTRUCTURE_PLACEMENTS: tuple[dict[str, Any], ...] = (
    {"id": "summit-plaza", "cell": (0, 2), "sourceFabricPosition": (0.465, 0.154), "displayWidth": 118},
    {"id": "upper-west-stairs", "cell": (0, 1), "sourceFabricPosition": (0.318, 0.241), "displayWidth": 112},
    {"id": "west-river-bridge", "cell": (1, 1), "sourceFabricPosition": (0.350, 0.487), "displayWidth": 184, "mirror": True},
    {"id": "station-threshold", "cell": (0, 2), "sourceFabricPosition": (0.404, 0.507), "displayWidth": 106, "mirror": True},
    {"id": "east-civic-curve", "cell": (1, 0), "sourceFabricPosition": (0.645, 0.445), "displayWidth": 154},
    {"id": "east-market-plaza", "cell": (0, 2), "sourceFabricPosition": (0.761, 0.634), "displayWidth": 96},
    {"id": "central-river-bridge", "cell": (1, 1), "sourceFabricPosition": (0.455, 0.684), "displayWidth": 164},
    {"id": "lower-works-curve", "cell": (1, 0), "sourceFabricPosition": (0.680, 0.752), "displayWidth": 158, "mirror": True},
    {"id": "rail-gateway-stairs", "cell": (0, 1), "sourceFabricPosition": (0.415, 0.817), "displayWidth": 108, "mirror": True},
    {"id": "west-cliff-seam", "cell": (1, 2), "sourceFabricPosition": (0.176, 0.493), "displayWidth": 138},
    {"id": "east-cliff-seam", "cell": (1, 2), "sourceFabricPosition": (0.825, 0.705), "displayWidth": 146, "mirror": True},
)

CITY_INFRASTRUCTURE_CORRIDORS: tuple[tuple[tuple[float, float], ...], ...] = (
    ((0.465, 0.154), (0.405, 0.333), (0.400, 0.485)),
    ((0.400, 0.485), (0.322, 0.452), (0.182, 0.348), (0.137, 0.474)),
    ((0.137, 0.474), (0.184, 0.638), (0.255, 0.674), (0.321, 0.788), (0.415, 0.821)),
    ((0.400, 0.485), (0.511, 0.358), (0.593, 0.285), (0.683, 0.407)),
    ((0.400, 0.485), (0.681, 0.560), (0.810, 0.494), (0.840, 0.585), (0.899, 0.713)),
    ((0.400, 0.485), (0.533, 0.702), (0.628, 0.660), (0.671, 0.801), (0.741, 0.897)),
)

# Authored direction-specific isometric pieces. No piece is arbitrarily rotated:
# the two straights, two curves, and two viaducts retain their source camera.
# The station owns the northern terminus because no connected territory exists
# to its west. The curve/viaduct sequence carries the only intercity line out
# through the south-southeast capital boundary.
RAIL_SEGMENT_CHAIN: tuple[dict[str, Any], ...] = (
    {"id": "station-through", "cell": (0, 0), "localCenter": (0.3900, 0.408), "displayWidth": 105, "kind": "ground-straight-nw-se"},
    {"id": "station-exit-curve", "cell": (2, 0), "localCenter": (0.434, 0.456), "displayWidth": 102, "kind": "ground-curve-nw-sse"},
    {"id": "ravine-viaduct-curve", "cell": (2, 1), "localCenter": (0.467, 0.523), "displayWidth": 110, "kind": "elevated-curve-sse"},
    {"id": "south-viaduct", "cell": (1, 1), "localCenter": (0.511, 0.596), "displayWidth": 110, "kind": "elevated-straight-nw-se"},
    {"id": "gateway-run-1", "cell": (0, 0), "localCenter": (0.5630, 0.627), "displayWidth": 105, "kind": "ground-straight-nw-se"},
    {"id": "gateway-run-2", "cell": (0, 0), "localCenter": (0.6105, 0.668), "displayWidth": 105, "kind": "ground-straight-nw-se"},
    {"id": "south-approach-1", "cell": (0, 0), "localCenter": (0.6580, 0.709), "displayWidth": 105, "kind": "ground-straight-nw-se"},
    {"id": "south-approach-2", "cell": (0, 0), "localCenter": (0.7055, 0.750), "displayWidth": 105, "kind": "ground-straight-nw-se"},
    {"id": "south-approach-3", "cell": (0, 0), "localCenter": (0.7530, 0.791), "displayWidth": 105, "kind": "ground-straight-nw-se"},
    {"id": "south-approach-4", "cell": (0, 0), "localCenter": (0.8005, 0.832), "displayWidth": 105, "kind": "ground-straight-nw-se"},
    {"id": "south-approach-5", "cell": (0, 0), "localCenter": (0.8480, 0.873), "displayWidth": 105, "kind": "ground-straight-nw-se"},
    {"id": "south-approach-6", "cell": (0, 0), "localCenter": (0.8955, 0.914), "displayWidth": 105, "kind": "ground-straight-nw-se"},
    {"id": "south-approach-7", "cell": (0, 0), "localCenter": (0.9430, 0.955), "displayWidth": 105, "kind": "ground-straight-nw-se"},
    {"id": "south-southeast-exit", "cell": (0, 0), "localCenter": (0.9905, 0.996), "displayWidth": 105, "kind": "ground-straight-nw-se"},
)

POPULATION_CUES: tuple[dict[str, Any], ...] = (
    {"id": "dwarf-mason", "species": "dwarf", "cell": (0, 0), "sourceFabricPosition": (0.505, 0.335), "displayHeight": 18, "minimumDetailTier": "site"},
    {"id": "gnome-rail-engineer", "species": "gnome", "cell": (1, 0), "sourceFabricPosition": (0.408, 0.535), "displayHeight": 16, "minimumDetailTier": "site"},
    {"id": "elf-archivist", "species": "elf", "cell": (2, 0), "sourceFabricPosition": (0.590, 0.445), "displayHeight": 23, "minimumDetailTier": "site"},
    {"id": "orc-foundry-artisan", "species": "orc", "cell": (3, 0), "sourceFabricPosition": (0.665, 0.686), "displayHeight": 25, "minimumDetailTier": "site"},
    {"id": "human-station-porter", "species": "human", "cell": (0, 1), "sourceFabricPosition": (0.442, 0.552), "displayHeight": 22, "minimumDetailTier": "site"},
    {"id": "dwarf-surveyor", "species": "dwarf", "cell": (1, 1), "sourceFabricPosition": (0.575, 0.705), "displayHeight": 19, "minimumDetailTier": "site"},
    {"id": "elf-ranger", "species": "elf", "cell": (2, 1), "sourceFabricPosition": (0.392, 0.292), "displayHeight": 23, "minimumDetailTier": "site"},
    {"id": "gnome-courier", "species": "gnome", "cell": (3, 1), "sourceFabricPosition": (0.706, 0.603), "displayHeight": 15, "minimumDetailTier": "site"},
    {"id": "human-market-vendor", "species": "human", "cell": (0, 1), "sourceFabricPosition": (0.748, 0.612), "displayHeight": 21, "minimumDetailTier": "close", "mirror": True},
    {"id": "orc-freight-handler", "species": "orc", "cell": (3, 0), "sourceFabricPosition": (0.468, 0.575), "displayHeight": 25, "minimumDetailTier": "close", "mirror": True},
    {"id": "dwarf-bridgewright", "species": "dwarf", "cell": (0, 0), "sourceFabricPosition": (0.535, 0.646), "displayHeight": 18, "minimumDetailTier": "close", "mirror": True},
    {"id": "gnome-signalkeeper", "species": "gnome", "cell": (1, 0), "sourceFabricPosition": (0.380, 0.505), "displayHeight": 16, "minimumDetailTier": "close", "mirror": True},
    {"id": "elf-citadel-steward", "species": "elf", "cell": (2, 0), "sourceFabricPosition": (0.460, 0.235), "displayHeight": 23, "minimumDetailTier": "close", "mirror": True},
    {"id": "human-overlook-visitor", "species": "human", "cell": (0, 1), "sourceFabricPosition": (0.410, 0.245), "displayHeight": 22, "minimumDetailTier": "close"},
    {"id": "orc-rail-mason", "species": "orc", "cell": (3, 0), "sourceFabricPosition": (0.405, 0.675), "displayHeight": 25, "minimumDetailTier": "close"},
    {"id": "dwarf-service-engineer", "species": "dwarf", "cell": (1, 1), "sourceFabricPosition": (0.620, 0.820), "displayHeight": 19, "minimumDetailTier": "close", "mirror": True},
)

# These are authored paving sockets in the concept-derived city-support fabric.
# The retained walls, paths, bridges, foliage, station context, small support
# buildings, and civic plazas are city fabric; only these 19 generic building
# footprints are replaced by skill-building nodes.
CITY_REPLACEMENT_SLOTS: dict[str, dict[str, Any]] = {
    "ai-agent-systems": {
        "slotId": "summit-citadel",
        "localPosition": (0.4646, 0.1337),
        "displayScale": 1.30,
        "terrainNudgePixels": (-13, 14),
    },
    "mcp": {"slotId": "upper-west-gatehouse", "localPosition": (0.2591, 0.2723), "terrainNudgePixels": (7, 1)},
    "openapi-swagger": {"slotId": "upper-east-archive", "localPosition": (0.5930, 0.2852)},
    "grpc-rest": {"slotId": "upper-west-bridgehouse", "localPosition": (0.1816, 0.3480)},
    "capability-contracts": {"slotId": "upper-central-court", "localPosition": (0.5110, 0.3584)},
    "tool-generation": {"slotId": "upper-east-workshop", "localPosition": (0.6828, 0.4071), "terrainNudgePixels": (-27, 20)},
    "typescript": {"slotId": "middle-west-press", "localPosition": (0.3222, 0.4517)},
    "react": {"slotId": "middle-east-observatory", "localPosition": (0.8103, 0.4935)},
    "tanstack": {"slotId": "middle-east-cache-yard", "localPosition": (0.6810, 0.5603)},
    "golang": {"slotId": "middle-east-forge", "localPosition": (0.8398, 0.5846)},
    "csharp": {"slotId": "middle-west-foundry", "localPosition": (0.1835, 0.6384)},
    "python": {"slotId": "middle-central-alembic", "localPosition": (0.6280, 0.6601)},
    "postgresql": {"slotId": "middle-west-cistern", "localPosition": (0.2550, 0.6741)},
    "redis": {
        "slotId": "middle-east-storehouse",
        "localPosition": (0.8988, 0.7134),
        "terrainNudgePixels": (-160, -35),
    },
    "aws": {"slotId": "lower-east-skyworks", "localPosition": (0.8298, 0.7708)},
    "databricks": {"slotId": "lower-central-masonry", "localPosition": (0.6706, 0.8006), "terrainNudgePixels": (6, -34)},
    "docker": {"slotId": "lower-east-dockworks", "localPosition": (0.7671, 0.8196)},
    "vmware": {"slotId": "lower-central-migration-yard", "localPosition": (0.6124, 0.8749)},
    "macstadium": {"slotId": "lower-east-orchard-cloister", "localPosition": (0.7414, 0.8967)},
}

CITY_RETAINED_SUPPORT_SLOTS: tuple[dict[str, Any], ...] = (
    {"slotId": "upper-west-civic-overlook", "sourceFabricPosition": (0.3105, 0.1797), "localPosition": fabric_local_position((0.3105, 0.1797)), "role": "retained-populated-civic-plaza"},
    {"slotId": "intercity-station", "sourceFabricPosition": STATION_SOURCE_LOCAL_POSITION, "localPosition": STATION_LOCAL_POSITION, "role": "independent-station"},
    {"slotId": "west-river-plaza", "sourceFabricPosition": (0.1372, 0.4735), "localPosition": fabric_local_position((0.1372, 0.4735)), "role": "retained-plaza"},
    {"slotId": "east-market-square", "sourceFabricPosition": (0.7613, 0.6344), "localPosition": fabric_local_position((0.7613, 0.6344)), "role": "retained-plaza"},
    {"slotId": "central-viaduct-yard", "sourceFabricPosition": (0.5334, 0.7024), "localPosition": fabric_local_position((0.5334, 0.7024)), "role": "retained-support-architecture"},
    {"slotId": "lower-west-rail-court", "sourceFabricPosition": (0.1904, 0.7382), "localPosition": fabric_local_position((0.1904, 0.7382)), "role": "retained-plaza"},
    {"slotId": "lower-west-service-court", "sourceFabricPosition": (0.3214, 0.7875), "localPosition": fabric_local_position((0.3214, 0.7875)), "role": "retained-support-architecture"},
    {"slotId": "southbound-rail-gateway", "sourceFabricPosition": (0.4153, 0.8206), "localPosition": fabric_local_position((0.4153, 0.8206)), "role": "independent-territory-rail-gateway"},
)

DISTRICTS: tuple[dict[str, Any], ...] = (
    {
        "id": "knowledge-api-citadel",
        "label": "Knowledge and API Citadel",
        "primaryGridCell": "B1",
        "gridCells": ["B1", "C1"],
        "elevationBand": 2,
        "localEnvelope": {"x": 0.27, "y": 0.10, "width": 0.37, "height": 0.31},
        "color": "#8b789b",
    },
    {
        "id": "application-core",
        "label": "Application Development Core",
        "primaryGridCell": "C2",
        "gridCells": ["C1", "C2"],
        "elevationBand": 1,
        "localEnvelope": {"x": 0.50, "y": 0.34, "width": 0.42, "height": 0.34},
        "color": "#78916f",
    },
    {
        "id": "infrastructure-works",
        "label": "Infrastructure and Data Works",
        "primaryGridCell": "B2",
        "gridCells": ["B2", "C2"],
        "elevationBand": 0,
        "localEnvelope": {"x": 0.52, "y": 0.66, "width": 0.42, "height": 0.28},
        "color": "#718897",
    },
)


def node(
    slot: str,
    label: str,
    district: str,
    position: tuple[float, float],
    elevation: int,
    width: int,
    footprint: tuple[float, float],
    revision: str | None,
    state: str,
    filename: str | None,
    expected_hash: str | None,
    frames: int,
    duration_ms: int,
    *,
    z_bias: int = 0,
    provisional: bool = False,
) -> dict[str, Any]:
    replacement_slot = CITY_REPLACEMENT_SLOTS[slot]
    replacement_source_position = replacement_slot["localPosition"]
    registered_position = fabric_local_position(replacement_source_position)
    terrain_nudge = replacement_slot.get("terrainNudgePixels", (0, 0))
    slot_display_scale = replacement_slot.get("displayScale", 1.0)
    replacement_position = (
        registered_position[0] + terrain_nudge[0] / ARTBOARD[0],
        registered_position[1] + terrain_nudge[1] / ARTBOARD[1],
    )
    return {
        "slotId": f"skill-{slot}",
        "replacementSlotId": replacement_slot["slotId"],
        "sourceFabricPosition": [
            replacement_source_position[0], replacement_source_position[1]
        ],
        "terrainNudgePixels": [terrain_nudge[0], terrain_nudge[1]],
        "skillId": slot,
        "label": label,
        "layoutDistrictId": district,
        "localPosition": [replacement_position[0], replacement_position[1]],
        "supersededPlanningPosition": [position[0], position[1]],
        "elevationBand": elevation,
        "displayWidth": round(
            width * CITY_NODE_DISPLAY_SCALE * slot_display_scale
        ),
        "slotDisplayScale": slot_display_scale,
        "unscaledDisplayWidth": width,
        "footprintFraction": [footprint[0], footprint[1]],
        "revision": revision,
        "productionState": state,
        "filename": filename,
        "expectedHash": expected_hash,
        "frameCount": frames,
        "durationMs": duration_ms,
        "zBias": z_bias,
        "provisionalSkill": provisional,
    }


NODES: tuple[dict[str, Any], ...] = (
    node(
        "ai-agent-systems", "AI / Agent Systems", "knowledge-api-citadel",
        (0.47, 0.205), 2, 205, (0.82, 0.30), None, "provisional-static",
        "ai-agent-systems-static.png",
        "74bd0fc8e1d8bfd69f16c744be02f8027361bf98910cdf4bb37ab2dd980d56d5",
        1, 100, provisional=True,
    ),
    node(
        "mcp", "MCP", "knowledge-api-citadel", (0.315, 0.28), 2, 155,
        (0.80, 0.28), "r4", "selected", "mcp-r4.png",
        "68f55b3297a2f65705694f4687dd8f6ec45af95ba89c5d59074daf075064b79a",
        210, 21000,
    ),
    node(
        "openapi-swagger", "OpenAPI / Swagger", "knowledge-api-citadel",
        (0.49, 0.28), 2, 165, (0.78, 0.28), "r2", "selected",
        "openapi-swagger-r2.png",
        "9a79f4f01c20128a8018bafcde5139d4c44fe7ce738808c9252b0cb12f663653",
        186, 18600,
    ),
    node(
        "grpc-rest", "gRPC / REST", "knowledge-api-citadel", (0.30, 0.34),
        2, 175, (0.80, 0.28), "r4", "review", "grpc-rest-r4.png",
        "5a54484b1580b774d5e2fc6e00e10bccb90e057c6e7a38a8c2e744d39627d5eb",
        192, 19200,
    ),
    node(
        "capability-contracts", "Capability Contracts", "knowledge-api-citadel",
        (0.58, 0.35), 2, 165, (0.78, 0.28), "r6", "review",
        "capability-contracts-r6.png",
        "796b583b714338c3167f1f0f3e58bfdd960a41a9b710c6df6dcef1f3d0b84fbe",
        157, 15700,
    ),
    node(
        "tool-generation", "Tool Generation", "knowledge-api-citadel",
        (0.43, 0.39), 2, 175, (0.80, 0.28), None, "animation-pending",
        "tool-generation-static.png",
        "fc2a2d6672413a80b97e8911737433d123fa0eca5608c0ee609f3760369e346a",
        1, 100,
    ),
    node(
        "typescript", "TypeScript", "application-core", (0.59, 0.45), 1,
        165, (0.78, 0.28), "r7", "selected", "typescript-r7.png",
        "1cac0682a5b62d96bf4c1bb969bcd2591d5a83c8b15087fa05b4f3f07a33b6df",
        112, 11200,
    ),
    node(
        "react", "React", "application-core", (0.70, 0.47), 1, 190,
        (0.82, 0.30), None, "animation-pending", "react-static.png",
        "b5d7f0bd17b89d81fcdbba9ea97f5b9a2aad4850f91cf3ff43e21fcf54f9cafb",
        1, 100,
    ),
    node(
        "tanstack", "TanStack", "application-core", (0.81, 0.51), 1,
        190, (0.82, 0.30), None, "animation-pending", "tanstack-static.png",
        "5455fe5d7038d8b39ef9c60a74a0a480c661af1d21156eacf83e0a9c27685967",
        1, 100,
    ),
    node(
        "golang", "Go (Golang)", "application-core", (0.53, 0.56), 1,
        190, (0.86, 0.32), "production-r2", "selected", None,
        None, 100, 10000,
    ),
    node(
        "csharp", "C#", "application-core", (0.65, 0.56), 1, 165,
        (0.78, 0.28), "r2", "selected", "csharp-r2.png",
        "94af1b69b5cd271680f709494cf5acb7a14f386944ad2077449ad22b606ab6e8",
        128, 12800,
    ),
    node(
        "python", "Python", "application-core", (0.78, 0.61), 1, 170,
        (0.78, 0.28), "r2", "selected", "python-r2.png",
        "42194a2974542d5b1e3788d57f12442135fa9cc28613385e1688c7426283574e",
        128, 12800,
    ),
    node(
        "postgresql", "PostgreSQL", "application-core", (0.56, 0.67), 1,
        180, (0.82, 0.30), "r4", "selected", "postgresql-r4.png",
        "85ec84e26668ce55d0d8006b34c553af273449786d713d1e58d5f542621f8389",
        160, 16000,
    ),
    node(
        "redis", "Redis", "application-core", (0.70, 0.69), 1, 145,
        (0.72, 0.26), "r2", "selected", "redis-r2.png",
        "c12ada9ea632d64bf56e02c4437639890024c84f84060b8675780e75c3dc98b5",
        160, 16000, z_bias=4,
    ),
    node(
        "aws", "AWS", "infrastructure-works", (0.61, 0.75), 0, 185,
        (0.82, 0.30), "r1", "review", "aws-r1.png",
        "1ce7edbeb339a61499d1e61debb36396b2044e998a8aae9204a54ab1a6c674d5",
        170, 17000,
    ),
    node(
        "databricks", "Databricks", "infrastructure-works", (0.70, 0.77),
        0, 190, (0.84, 0.30), "r3", "review", "databricks-r3.png",
        "a8362591df59a2ca52d4946f4b6ab8f457b1ddfd18080aeccfd86b2fe3c378eb",
        180, 18000, z_bias=2,
    ),
    node(
        "docker", "Docker", "infrastructure-works", (0.83, 0.80), 0, 185,
        (0.84, 0.30), "r4", "selected", "docker-r4.png",
        "18aff84b4489a126ff056fe488c0b42a34e78cce5e011e7b50591fb1fdad9a0a",
        169, 16900,
    ),
    node(
        "vmware", "VMware", "infrastructure-works", (0.68, 0.845), 0,
        190, (0.84, 0.30), "r2", "selected", "vmware-r2.png",
        "dafe3455b2c1c9cd7b66f7a9bbada2cfdc1ddd2df9c2db47f8148020706dd2ba",
        116, 11600,
    ),
    node(
        "macstadium", "MacStadium", "infrastructure-works", (0.78, 0.90),
        0, 195, (0.86, 0.32), "r3", "independent-go-metadata-pending",
        "macstadium-r3.png",
        "cb9c3b3c416af0847a0d8f66a802a5119b6e1563746ba26f0f2cb6ea0eda521b",
        160, 16000,
    ),
)

GO_LAYERS: tuple[dict[str, Any], ...] = (
    {
        "id": "static-base",
        "file": "golang-building-static-alpha-r3.png",
        "generatedFrom": "golang-building-static-clean-r2.png",
    },
    {
        "id": "architectural-signal",
        "file": "golang-architectural-signal-r2.webp",
        "sha256": "ba79c365d3c7795b57da951e0e0bedf28e33fc5ae9404977b99ed72bfbed94e9",
    },
    {
        "id": "roof-semaphore",
        "file": "golang-roof-channel-semaphore-r2.webp",
        "sha256": "1ee48e620fc0d3c9f958a85bf2df2c9111e0a749b381331b5a95a8dade70e5a5",
    },
    {
        "id": "forge-pressure",
        "file": "golang-forge-pressure-r2.webp",
        "sha256": "e961804cd9c449b3f9f2b2acd100e6a241698d4a5655d28b57d57880dad3fd06",
    },
    {
        "id": "hoist-transfer",
        "file": "golang-hoist-transfer-r2.webp",
        "sha256": "3c5232a255de6e523185dc0f069b797d072b8650b47bcfd39737336de1bcc5f2",
    },
    {
        "id": "courier-dispatch",
        "file": "golang-courier-dispatch-r2.webp",
        "sha256": "809303417000cf0f850e47b44d794897e0b755a1896c98a9d92c64d6949bbf9d",
    },
    {
        "id": "courier-exhaust",
        "file": "golang-courier-exhaust-r2.webp",
        "sha256": "b338ce7ce0e188b8922b06395303323b10036e6260100b3b94bd41c7f19a9b9a",
    },
    {
        "id": "yard-worker",
        "file": "golang-yard-worker-r2.webp",
        "sha256": "9424ba7c0f996418284741398f60574dccfbeb2067541b1e45554f023952122c",
    },
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def public_url(path: Path) -> str:
    return "/" + path.relative_to(PUBLIC).as_posix()


def inspect_image(path: Path) -> dict[str, Any]:
    with Image.open(path) as image:
        mode = image.mode
        frame_count = int(getattr(image, "n_frames", 1))
        durations: list[int] = []
        maximum_corner_alpha = 0
        size = list(image.size)
        for index in range(frame_count):
            image.seek(index)
            rgba = image.convert("RGBA")
            alpha = rgba.getchannel("A")
            width, height = rgba.size
            maximum_corner_alpha = max(
                maximum_corner_alpha,
                alpha.getpixel((0, 0)),
                alpha.getpixel((width - 1, 0)),
                alpha.getpixel((0, height - 1)),
                alpha.getpixel((width - 1, height - 1)),
            )
            durations.append(max(1, int(image.info.get("duration", 100) or 100)))
    return {
        "dimensions": size,
        "frameCount": frame_count,
        "durationMs": sum(durations),
        "maximumCornerAlpha": maximum_corner_alpha,
        "mode": mode,
    }


def transparent_rgb_under_zero_alpha(path: Path) -> int:
    with Image.open(path) as image:
        rgba = image.convert("RGBA")
        return sum(
            1
            for red, green, blue, alpha in rgba.get_flattened_data()
            if alpha == 0 and (red != 0 or green != 0 or blue != 0)
        )


def alpha_bounds(path: Path, threshold: int = 8) -> tuple[int, int, int, int] | None:
    with Image.open(path) as image:
        image.seek(0)
        alpha = image.convert("RGBA").getchannel("A")
        return alpha.point(lambda value: 255 if value >= threshold else 0).getbbox()


def build_golang_alpha_base() -> dict[str, Any]:
    if sha256(GO_OPAQUE_BASE_PATH) != EXPECTED_GO_OPAQUE_BASE_SHA256:
        raise RuntimeError("The accepted Go opaque base drifted before alpha recovery.")

    source = Image.open(GO_OPAQUE_BASE_PATH).convert("RGB")
    width, height = source.size
    pixels = source.load()
    background_rgb = (8, 11, 13)
    distance_limit_squared = 20 * 20

    background_eligible = bytearray(width * height)
    for y in range(height):
        row_offset = y * width
        for x in range(width):
            red, green, blue = pixels[x, y]
            color_distance_squared = (
                (red - background_rgb[0]) ** 2
                + (green - background_rgb[1]) ** 2
                + (blue - background_rgb[2]) ** 2
            )
            if color_distance_squared <= distance_limit_squared and max(
                red,
                green,
                blue,
            ) <= 38:
                background_eligible[row_offset + x] = 1

    exterior = bytearray(width * height)
    queue: deque[int] = deque()

    def enqueue_if_background(index: int) -> None:
        if background_eligible[index] and not exterior[index]:
            exterior[index] = 1
            queue.append(index)

    for x in range(width):
        enqueue_if_background(x)
        enqueue_if_background((height - 1) * width + x)
    for y in range(height):
        enqueue_if_background(y * width)
        enqueue_if_background(y * width + width - 1)

    while queue:
        index = queue.popleft()
        x = index % width
        y = index // width
        if x > 0:
            enqueue_if_background(index - 1)
        if x + 1 < width:
            enqueue_if_background(index + 1)
        if y > 0:
            enqueue_if_background(index - width)
        if y + 1 < height:
            enqueue_if_background(index + width)

    matte = Image.new("L", source.size)
    matte.putdata([0 if value else 255 for value in exterior])
    matte = matte.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))
    binary_matte = matte.point(lambda value: 255 if value >= 128 else 0)
    binary_pixels = binary_matte.load()

    # Fill dark architectural interiors, but preserve exterior-connected gaps
    # between the crane, trees, rails, and cliff silhouette.
    outside_holes = bytearray(width * height)
    queue.clear()

    def enqueue_if_open(index: int, x: int, y: int) -> None:
        if binary_pixels[x, y] == 0 and not outside_holes[index]:
            outside_holes[index] = 1
            queue.append(index)

    for x in range(width):
        enqueue_if_open(x, x, 0)
        enqueue_if_open((height - 1) * width + x, x, height - 1)
    for y in range(height):
        enqueue_if_open(y * width, 0, y)
        enqueue_if_open(y * width + width - 1, width - 1, y)

    while queue:
        index = queue.popleft()
        x = index % width
        y = index // width
        if x > 0:
            enqueue_if_open(index - 1, x - 1, y)
        if x + 1 < width:
            enqueue_if_open(index + 1, x + 1, y)
        if y > 0:
            enqueue_if_open(index - width, x, y - 1)
        if y + 1 < height:
            enqueue_if_open(index + width, x, y + 1)

    solid_matte = Image.new("L", source.size)
    solid_matte.putdata(
        [0 if outside_holes[index] else 255 for index in range(width * height)]
    )
    alpha = solid_matte.filter(ImageFilter.GaussianBlur(0.75))
    alpha_values = list(alpha.getdata())
    source_values = list(source.getdata())
    recovered = Image.new("RGBA", source.size)
    recovered.putdata(
        [
            (red, green, blue, alpha_value)
            if alpha_value > 0
            else (0, 0, 0, 0)
            for (red, green, blue), alpha_value in zip(
                source_values,
                alpha_values,
                strict=True,
            )
        ]
    )

    GO_ALPHA_BASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    POSTER_ROOT.mkdir(parents=True, exist_ok=True)
    recovered.save(GO_ALPHA_BASE_PATH, optimize=True)
    recovered.save(GO_ALPHA_POSTER_PATH, optimize=True)

    qa_panels: list[Image.Image] = []
    for background in (
        (0, 0, 0, 255),
        (28, 34, 42, 255),
        (128, 128, 128, 255),
        (244, 244, 236, 255),
    ):
        panel = Image.new("RGBA", source.size, background)
        panel.alpha_composite(recovered)
        qa_panels.append(
            panel.convert("RGB").resize((320, 334), Image.Resampling.LANCZOS)
        )
    qa = Image.new("RGB", (640, 668))
    for panel, position in zip(
        qa_panels,
        ((0, 0), (320, 0), (0, 334), (320, 334)),
        strict=True,
    ):
        qa.paste(panel, position)
    qa.save(GO_ALPHA_QA_PATH, optimize=True)

    inspection = inspect_image(GO_ALPHA_BASE_PATH)
    inspection["path"] = public_url(GO_ALPHA_BASE_PATH)
    inspection["sha256"] = sha256(GO_ALPHA_BASE_PATH)
    inspection["sourcePath"] = public_url(GO_OPAQUE_BASE_PATH)
    inspection["sourceSha256"] = EXPECTED_GO_OPAQUE_BASE_SHA256
    inspection["transparentRgbUnderZeroAlpha"] = transparent_rgb_under_zero_alpha(
        GO_ALPHA_BASE_PATH
    )
    inspection["alphaBoundingBox"] = list(alpha.getbbox() or ())
    inspection["qaPath"] = public_url(GO_ALPHA_QA_PATH)
    inspection["qaSha256"] = sha256(GO_ALPHA_QA_PATH)
    return inspection


def poster_for(node_record: dict[str, Any]) -> Path:
    if node_record["skillId"] == "golang":
        return GO_ALPHA_POSTER_PATH
    return POSTER_ROOT / f"{node_record['skillId']}-poster.png"


def node_anchor(node_record: dict[str, Any]) -> tuple[float, float]:
    position = node_record["localPosition"]
    if isinstance(position, dict):
        return (
            position["x"] * ARTBOARD[0],
            position["y"] * ARTBOARD[1],
        )
    return (
        position[0] * ARTBOARD[0],
        position[1] * ARTBOARD[1],
    )


def node_footprint(node_record: dict[str, Any]) -> tuple[float, float]:
    footprint = node_record["footprintFraction"]
    if isinstance(footprint, dict):
        return footprint["width"], footprint["depth"]
    return footprint[0], footprint[1]


def terrain_transition_geometry(node_record: dict[str, Any]) -> dict[str, Any]:
    anchor_x, anchor_y = node_anchor(node_record)
    footprint_width_fraction, footprint_depth_fraction = node_footprint(node_record)
    footprint_width = node_record["displayWidth"] * footprint_width_fraction
    footprint_depth = node_record["displayWidth"] * footprint_depth_fraction
    seed = int(hashlib.sha256(node_record["skillId"].encode("utf-8")).hexdigest()[:8], 16)

    underlay_rx = max(12.0, footprint_width * 0.72)
    underlay_ry = max(7.0, footprint_depth * 0.94)
    underlay_points: list[list[float]] = []
    for index in range(16):
        angle = math.tau * index / 16
        nibble = (seed >> ((index * 4) % 28)) & 0xF
        radial_jitter = 0.9 + nibble / 100
        underlay_points.append([
            round(anchor_x + math.cos(angle) * underlay_rx * radial_jitter, 2),
            round(anchor_y + math.sin(angle) * underlay_ry * radial_jitter, 2),
        ])

    foreground_rx = max(10.0, footprint_width * 0.58)
    foreground_ry = max(6.0, footprint_depth * 0.78)
    foreground_points: list[list[float]] = []
    for index in range(9):
        progress = index / 8
        signed_jitter = (((seed >> ((index * 3) % 24)) & 0x7) - 3) / 3
        foreground_points.append([
            round(anchor_x - foreground_rx + foreground_rx * 2 * progress, 2),
            round(
                anchor_y
                - footprint_depth * 0.16
                + signed_jitter * max(1.4, footprint_depth * 0.12),
                2,
            ),
        ])
    foreground_points.extend([
        [round(anchor_x + foreground_rx, 2), round(anchor_y + foreground_ry * 0.42, 2)],
        [round(anchor_x + foreground_rx * 0.58, 2), round(anchor_y + foreground_ry * 0.78, 2)],
        [round(anchor_x, 2), round(anchor_y + foreground_ry * 0.92, 2)],
        [round(anchor_x - foreground_rx * 0.6, 2), round(anchor_y + foreground_ry * 0.76, 2)],
        [round(anchor_x - foreground_rx, 2), round(anchor_y + foreground_ry * 0.4, 2)],
    ])
    return {
        "version": "registered-city-fabric-transition-r1",
        "source": "concept-derived-city-fabric-not-natural-terrain",
        "underlayPoints": underlay_points,
        "foregroundPoints": foreground_points,
    }


def footprint_overlap(
    left: dict[str, Any], right: dict[str, Any]
) -> float:
    left_x, left_y = node_anchor(left)
    right_x, right_y = node_anchor(right)
    left_rx = left["displayWidth"] * left["footprintFraction"][0] * 0.5
    right_rx = right["displayWidth"] * right["footprintFraction"][0] * 0.5
    left_ry = left["displayWidth"] * left["footprintFraction"][1] * 0.5
    right_ry = right["displayWidth"] * right["footprintFraction"][1] * 0.5
    normalized = math.sqrt(
        ((left_x - right_x) / max(1.0, left_rx + right_rx)) ** 2
        + ((left_y - right_y) / max(1.0, left_ry + right_ry)) ** 2
    )
    return max(0.0, 1.0 - normalized)


def font(size: int, semibold: bool = False) -> ImageFont.FreeTypeFont:
    name = "seguisb.ttf" if semibold else "segoeui.ttf"
    return ImageFont.truetype(str(Path("C:/Windows/Fonts") / name), size)


def prepare_registered_terrain() -> Image.Image:
    with Image.open(REGIONAL_TERRAIN_PATH) as source:
        terrain = source.convert("RGBA").crop(CAPITAL_REGIONAL_PIXEL_BOUNDS)
    terrain = terrain.resize(ARTBOARD, Image.Resampling.LANCZOS)
    terrain_rgb = ImageEnhance.Color(terrain.convert("RGB")).enhance(0.88)
    terrain_rgb = ImageEnhance.Brightness(terrain_rgb).enhance(0.72)
    terrain = terrain_rgb.convert("RGBA")
    terrain.alpha_composite(Image.new("RGBA", ARTBOARD, (5, 9, 9, 28)))
    return terrain


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
        lambda channel: 255 if channel >= 8 else 0
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


def prepare_registered_land_mask() -> Image.Image:
    with Image.open(LAND_MASK_PATH) as source:
        land = source.convert("L")
    field_width, field_height = land.size
    crop = (
        round(CAPITAL_WORLD_ORIGIN[0] * field_width),
        round(CAPITAL_WORLD_ORIGIN[1] * field_height),
        round((CAPITAL_WORLD_ORIGIN[0] + CAPITAL_WORLD_SPAN[0]) * field_width),
        round((CAPITAL_WORLD_ORIGIN[1] + CAPITAL_WORLD_SPAN[1]) * field_height),
    )
    return land.crop(crop).resize(ARTBOARD, Image.Resampling.LANCZOS).point(
        lambda value: 255 if value >= LAND_THRESHOLD else 0
    )


def build_urban_substrate_masks(
    manifest_nodes: list[dict[str, Any]],
) -> tuple[Image.Image, Image.Image, Image.Image]:
    """Build one connected settlement graph without inventing terrain geometry."""
    road_mask = Image.new("L", ARTBOARD, 0)
    road_draw = ImageDraw.Draw(road_mask)
    sampled_corridor_pixels: list[tuple[float, float]] = []
    road_width = city_px(22)
    for source_corridor in CITY_INFRASTRUCTURE_CORRIDORS:
        local_corridor = tuple(
            fabric_local_position(point) for point in source_corridor
        )
        corridor_path = catmull_rom_path(local_corridor, samples_per_segment=32)
        corridor_pixels = [
            (point[0] * ARTBOARD[0], point[1] * ARTBOARD[1])
            for point in corridor_path
        ]
        sampled_corridor_pixels.extend(corridor_pixels)
        road_draw.line(
            corridor_pixels,
            fill=255,
            width=road_width,
            joint="curve",
        )

    courtyard_mask = Image.new("L", ARTBOARD, 0)
    courtyard_draw = ImageDraw.Draw(courtyard_mask)
    connector_width = city_px(16)
    for record in manifest_nodes:
        anchor_x, anchor_y = node_anchor(record)
        footprint_width, footprint_depth = node_footprint(record)
        courtyard_width = max(
            city_px(46),
            record["displayWidth"] * footprint_width * 1.26,
        )
        courtyard_depth = max(
            city_px(18),
            record["displayWidth"] * footprint_depth * 1.46,
        )
        courtyard_center_y = anchor_y - courtyard_depth * 0.08
        courtyard_draw.ellipse(
            (
                anchor_x - courtyard_width * 0.5,
                courtyard_center_y - courtyard_depth * 0.5,
                anchor_x + courtyard_width * 0.5,
                courtyard_center_y + courtyard_depth * 0.5,
            ),
            fill=255,
        )
        nearest_corridor = min(
            sampled_corridor_pixels,
            key=lambda point: (point[0] - anchor_x) ** 2 + (point[1] - anchor_y) ** 2,
        )
        road_draw.line(
            ((anchor_x, anchor_y), nearest_corridor),
            fill=255,
            width=connector_width,
        )

    station_anchor = (
        STATION_LOCAL_POSITION[0] * ARTBOARD[0],
        STATION_LOCAL_POSITION[1] * ARTBOARD[1],
    )
    station_court_width = STATION_DISPLAY_WIDTH * 0.82
    station_court_depth = city_px(44)
    courtyard_draw.ellipse(
        (
            station_anchor[0] - station_court_width * 0.5,
            station_anchor[1] - station_court_depth * 0.56,
            station_anchor[0] + station_court_width * 0.5,
            station_anchor[1] + station_court_depth * 0.44,
        ),
        fill=255,
    )
    nearest_station_corridor = min(
        sampled_corridor_pixels,
        key=lambda point: (
            (point[0] - station_anchor[0]) ** 2
            + (point[1] - station_anchor[1]) ** 2
        ),
    )
    road_draw.line(
        (station_anchor, nearest_station_corridor),
        fill=255,
        width=connector_width,
    )

    for support in CITY_RETAINED_SUPPORT_SLOTS:
        if support["slotId"] in {"intercity-station", "southbound-rail-gateway"}:
            continue
        local_x, local_y = support["localPosition"]
        anchor = (local_x * ARTBOARD[0], local_y * ARTBOARD[1])
        nearest_corridor = min(
            sampled_corridor_pixels,
            key=lambda point: (
                (point[0] - anchor[0]) ** 2 + (point[1] - anchor[1]) ** 2
            ),
        )
        road_draw.line(
            (anchor, nearest_corridor),
            fill=255,
            width=connector_width,
        )

    road_mask = road_mask.filter(
        ImageFilter.GaussianBlur(1.1 * CITY_VISUAL_SCALE)
    )
    courtyard_mask = courtyard_mask.filter(
        ImageFilter.GaussianBlur(1.1 * CITY_VISUAL_SCALE)
    )
    substrate_mask = ImageChops.lighter(road_mask, courtyard_mask)
    substrate_mask = substrate_mask.filter(ImageFilter.MaxFilter(city_odd_px(7)))
    substrate_mask = substrate_mask.filter(
        ImageFilter.GaussianBlur(1.6 * CITY_VISUAL_SCALE)
    )
    land_mask = prepare_registered_land_mask()
    substrate_mask = ImageChops.multiply(substrate_mask, land_mask)
    road_mask = ImageChops.multiply(road_mask, land_mask)
    courtyard_mask = ImageChops.multiply(courtyard_mask, land_mask)
    return substrate_mask, road_mask, courtyard_mask


def prepare_city_fabric(
    manifest_nodes: list[dict[str, Any]],
) -> tuple[Image.Image, Image.Image, Image.Image, Image.Image]:
    """Register the concept-led connected city circulation artwork."""
    del manifest_nodes  # Node placement remains independent of the underlay art.
    with Image.open(CITY_CIRCULATION_SOURCE_PATH) as source:
        source_rgba = source.convert("RGBA")
    registered_size = (
        round(ARTBOARD[0] * CITY_FABRIC_SCALE),
        round(ARTBOARD[1] * CITY_FABRIC_SCALE),
    )
    registered_offset = (
        round(ARTBOARD[0] * CITY_FABRIC_OFFSET[0]),
        round(ARTBOARD[1] * CITY_FABRIC_OFFSET[1]),
    )
    registered_source = source_rgba.resize(
        registered_size,
        Image.Resampling.LANCZOS,
    )
    registered = Image.new("RGBA", ARTBOARD, (0, 0, 0, 0))
    registered.alpha_composite(registered_source, registered_offset)

    # Preserve the authored masonry and foliage while lowering saturation and
    # value slightly so the independent skill buildings remain the focal layer.
    alpha = registered.getchannel("A")
    graded = ImageEnhance.Color(registered.convert("RGB")).enhance(0.60)
    graded = ImageEnhance.Brightness(graded).enhance(0.80)
    graded = ImageEnhance.Contrast(graded).enhance(1.03).convert("RGBA")
    eroded_alpha = alpha.filter(ImageFilter.MinFilter(city_odd_px(9)))
    inward_edge = ImageChops.subtract(alpha, eroded_alpha)
    softened_alpha = ImageChops.subtract(
        alpha,
        inward_edge.point(lambda value: round(value * 0.42)),
    )
    graded.putalpha(softened_alpha)

    # The source already owns roads, stairs, bridges, retaining walls, plazas,
    # foliage seams, and varied courtyards. Its alpha is therefore the sole
    # visual substrate authority; no procedural circles or corridor tubes are
    # allowed back into the composition.
    substrate_mask = softened_alpha.copy()
    road_mask = softened_alpha.point(lambda value: 255 if value >= 96 else 0)
    courtyard_mask = softened_alpha.point(lambda value: 255 if value >= 176 else 0)
    return graded, substrate_mask, road_mask, courtyard_mask


def build_city_fabric_layers(
    manifest_nodes: list[dict[str, Any]],
) -> tuple[Image.Image, Image.Image, Image.Image, Image.Image]:
    FABRIC_ROOT.mkdir(parents=True, exist_ok=True)
    fabric, substrate_mask, road_mask, courtyard_mask = prepare_city_fabric(
        manifest_nodes
    )
    fabric.save(CITY_FABRIC_UNDERLAY_PATH, optimize=True)

    fabric_alpha = fabric.getchannel("A")
    expanded = substrate_mask.filter(ImageFilter.MaxFilter(city_odd_px(31)))
    expanded = expanded.filter(
        ImageFilter.GaussianBlur(7 * CITY_VISUAL_SCALE)
    )
    contact_alpha = ImageChops.subtract(expanded, substrate_mask)
    contact_alpha = contact_alpha.point(lambda value: round(value * 0.34))
    contact_rgb = ImageEnhance.Color(prepare_registered_terrain().convert("RGB")).enhance(
        0.64
    )
    contact_rgb = ImageEnhance.Brightness(contact_rgb).enhance(0.70)
    contact = contact_rgb.convert("RGBA")
    contact.putalpha(contact_alpha)
    contact.save(CITY_FABRIC_CONTACT_PATH, optimize=True)

    foreground_mask = Image.new("L", ARTBOARD, 0)
    foreground_draw = ImageDraw.Draw(foreground_mask)
    for record in manifest_nodes:
        if not record["assetNodeReady"]:
            continue
        points = [
            tuple(point)
            for point in record["terrainTransition"]["foregroundPoints"]
        ]
        foreground_draw.polygon(points, fill=255)
    foreground_mask = foreground_mask.filter(
        ImageFilter.GaussianBlur(0.65 * CITY_VISUAL_SCALE)
    )
    foreground_alpha = ImageChops.multiply(fabric_alpha, foreground_mask)
    foreground = fabric.copy()
    foreground.putalpha(foreground_alpha)
    foreground.save(CITY_FABRIC_FOREGROUND_PATH, optimize=True)

    # Texture-only edge detail is allowed to overlap the frozen terrain and
    # node bases, but it never modifies the land/height/slope authorities.
    eroded_alpha = fabric_alpha.filter(ImageFilter.MinFilter(city_odd_px(41)))
    edge_band = ImageChops.subtract(fabric_alpha, eroded_alpha)
    hue, saturation, value = fabric.convert("HSV").split()
    natural_color = ImageChops.lighter(
        ImageChops.multiply(
            saturation.point(lambda channel: 255 if channel >= 42 else 0),
            value.point(lambda channel: 255 if channel <= 148 else 0),
        ),
        value.point(lambda channel: 255 if channel <= 88 else 0),
    )
    detail_alpha = ImageChops.multiply(edge_band, natural_color)
    protected_assets = Image.new("L", ARTBOARD, 0)
    protected_draw = ImageDraw.Draw(protected_assets)
    for record in manifest_nodes:
        if not record["assetNodeReady"]:
            continue
        anchor_x, anchor_y = node_anchor(record)
        width = record["displayWidth"]
        height = width * record["sourceDimensions"][1] / record["sourceDimensions"][0]
        ground_anchor = record["groundAnchor"]
        protection_pad = city_px(4)
        left = anchor_x - width * ground_anchor[0] - protection_pad
        top = anchor_y - height * ground_anchor[1] - protection_pad
        protected_draw.rectangle(
            (
                left,
                top,
                left + width + protection_pad * 2,
                top + height + protection_pad * 2,
            ),
            fill=255,
        )
    with Image.open(STATION_PATH) as station_source:
        station_width, station_height = station_source.size
    station_render_height = STATION_DISPLAY_WIDTH * station_height / station_width
    station_anchor_x = STATION_LOCAL_POSITION[0] * ARTBOARD[0]
    station_anchor_y = STATION_LOCAL_POSITION[1] * ARTBOARD[1]
    station_protection_pad = city_px(5)
    station_left = (
        station_anchor_x - STATION_DISPLAY_WIDTH * STATION_GROUND_ANCHOR[0] - station_protection_pad
    )
    station_top = (
        station_anchor_y - station_render_height * STATION_GROUND_ANCHOR[1] - station_protection_pad
    )
    protected_draw.rectangle(
        (
            station_left,
            station_top,
            station_left + STATION_DISPLAY_WIDTH + station_protection_pad * 2,
            station_top + station_render_height + station_protection_pad * 2,
        ),
        fill=255,
    )
    protected_assets = protected_assets.filter(
        ImageFilter.GaussianBlur(1.25 * CITY_VISUAL_SCALE)
    )
    detail_alpha = ImageChops.multiply(
        detail_alpha,
        ImageChops.invert(protected_assets),
    )
    detail = fabric.copy()
    detail.putalpha(detail_alpha)
    detail.save(CITY_ENVIRONMENT_DETAIL_PATH, optimize=True)
    return contact, fabric, foreground, detail


def catmull_rom_path(
    control_points: tuple[tuple[float, float], ...],
    samples_per_segment: int = 28,
) -> list[tuple[float, float]]:
    points: list[tuple[float, float]] = []
    for segment in range(len(control_points) - 1):
        p0 = control_points[max(0, segment - 1)]
        p1 = control_points[segment]
        p2 = control_points[segment + 1]
        p3 = control_points[min(len(control_points) - 1, segment + 2)]
        for sample in range(samples_per_segment):
            t = sample / samples_per_segment
            t2 = t * t
            t3 = t2 * t
            points.append(
                (
                    0.5
                    * (
                        2 * p1[0]
                        + (-p0[0] + p2[0]) * t
                        + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2
                        + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3
                    ),
                    0.5
                    * (
                        2 * p1[1]
                        + (-p0[1] + p2[1]) * t
                        + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2
                        + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3
                    ),
                )
            )
    points.append(control_points[-1])
    return points


def evenly_spaced_path(
    points: list[tuple[float, float]], spacing: float
) -> list[tuple[float, float]]:
    if not points:
        return []
    result = [points[0]]
    carried = 0.0
    previous = points[0]
    for current in points[1:]:
        segment_start = previous
        segment_dx = current[0] - segment_start[0]
        segment_dy = current[1] - segment_start[1]
        segment_length = math.hypot(segment_dx, segment_dy)
        while segment_length > 1e-9 and carried + segment_length >= spacing:
            distance = spacing - carried
            ratio = distance / segment_length
            segment_start = (
                segment_start[0] + segment_dx * ratio,
                segment_start[1] + segment_dy * ratio,
            )
            result.append(segment_start)
            segment_dx = current[0] - segment_start[0]
            segment_dy = current[1] - segment_start[1]
            segment_length = math.hypot(segment_dx, segment_dy)
            carried = 0.0
        carried += segment_length
        previous = current
    return result


def offset_path(
    points: list[tuple[float, float]], offset: float
) -> list[tuple[float, float]]:
    result: list[tuple[float, float]] = []
    for index, point in enumerate(points):
        before = points[max(0, index - 1)]
        after = points[min(len(points) - 1, index + 1)]
        tangent_x = after[0] - before[0]
        tangent_y = after[1] - before[1]
        tangent_length = max(1e-9, math.hypot(tangent_x, tangent_y))
        result.append(
            (
                point[0] - tangent_y / tangent_length * offset,
                point[1] + tangent_x / tangent_length * offset,
            )
        )
    return result


def magenta_keyed_rgba(source: Image.Image) -> Image.Image:
    """Key ImageGen chroma while decontaminating only partial-alpha edges."""
    rgb = source.convert("RGB")
    key_color = rgb.getpixel((0, 0))
    difference = ImageChops.difference(
        rgb,
        Image.new("RGB", rgb.size, key_color),
    )
    red_delta, green_delta, blue_delta = difference.split()
    maximum_delta = ImageChops.lighter(
        ImageChops.lighter(red_delta, green_delta),
        blue_delta,
    )
    alpha = maximum_delta.point(
        lambda value: 0 if value <= 28 else 255 if value >= 72 else round((value - 28) * 255 / 44)
    )

    hue, saturation, _ = rgb.convert("HSV").split()
    magenta_hue = hue.point(
        lambda value: 255 if 184 <= value <= 235 else 0
    )
    chroma_saturation = saturation.point(
        lambda value: 255 if value >= 52 else 0
    )
    chroma_edge = ImageChops.multiply(magenta_hue, chroma_saturation).filter(
        ImageFilter.MaxFilter(3)
    )
    alpha = ImageChops.subtract(alpha, chroma_edge)

    red, green, blue = rgb.split()
    magenta_excess = ImageChops.subtract(ImageChops.darker(red, blue), green)
    partial_edge = ImageChops.invert(alpha)
    spill = ImageChops.multiply(magenta_excess, partial_edge)
    clean_rgb = Image.merge(
        "RGB",
        (
            ImageChops.subtract(red, spill),
            green,
            ImageChops.subtract(blue, spill),
        ),
    )
    nonzero_alpha = alpha.point(lambda value: 255 if value > 0 else 0)
    clean_rgb = Image.composite(
        clean_rgb,
        Image.new("RGB", rgb.size, (0, 0, 0)),
        nonzero_alpha,
    )
    keyed = clean_rgb.convert("RGBA")
    keyed.putalpha(alpha)
    return keyed


def rail_segment_component(
    atlas: Image.Image,
    cell: tuple[int, int],
) -> Image.Image:
    left = round(cell[0] * atlas.width / 3) + 5
    right = round((cell[0] + 1) * atlas.width / 3) - 5
    top = round(cell[1] * atlas.height / 2) + 5
    bottom = round((cell[1] + 1) * atlas.height / 2) - 5
    component = atlas.crop((left, top, right, bottom))
    bounds = component.getchannel("A").point(
        lambda value: 255 if value >= 8 else 0
    ).getbbox()
    if bounds is None:
        raise RuntimeError(f"Rail segment atlas cell {cell} has no visible pixels.")
    padding = 6
    return component.crop(
        (
            max(0, bounds[0] - padding),
            max(0, bounds[1] - padding),
            min(component.width, bounds[2] + padding),
            min(component.height, bounds[3] + padding),
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
    overlap = ImageChops.multiply(left_contact, right_contact)
    return sum(overlap.histogram()[1:])


def build_southbound_territory_rail() -> tuple[
    Image.Image,
    Image.Image,
    Image.Image,
    list[dict[str, Any]],
]:
    with Image.open(RAIL_SEGMENT_ATLAS_PATH) as source:
        atlas = magenta_keyed_rgba(source)
    atlas.save(CITY_RAIL_SEGMENT_ALPHA_PATH, optimize=True)

    track = Image.new("RGBA", ARTBOARD, (0, 0, 0, 0))
    segment_records: list[tuple[dict[str, Any], Image.Image, tuple[int, int]]] = []
    segment_joins: list[dict[str, Any]] = []
    for segment in RAIL_SEGMENT_CHAIN:
        component = rail_segment_component(atlas, segment["cell"])
        alpha = component.getchannel("A")
        graded = ImageEnhance.Color(component.convert("RGB")).enhance(0.82)
        graded = ImageEnhance.Brightness(graded).enhance(0.84).convert("RGBA")
        graded.putalpha(alpha)
        display_width = city_px(segment["displayWidth"])
        display_height = round(display_width * graded.height / graded.width)
        graded = graded.resize(
            (display_width, display_height),
            Image.Resampling.LANCZOS,
        )
        center = (
            segment["localCenter"][0] * ARTBOARD[0],
            segment["localCenter"][1] * ARTBOARD[1],
        )
        position = (
            round(center[0] - display_width * 0.5),
            round(center[1] - display_height * 0.5),
        )
        if segment_records:
            previous_segment, previous_sprite, previous_position = segment_records[-1]
            overlap_pixels = alpha_overlap_pixels(
                previous_sprite,
                previous_position,
                graded,
                position,
            )
            if overlap_pixels <= 0:
                raise RuntimeError(
                    "Authored rail segments do not physically join: "
                    f"{previous_segment['id']} -> {segment['id']}"
                )
            segment_joins.append(
                {
                    "from": previous_segment["id"],
                    "to": segment["id"],
                    "alphaOverlapPixels": overlap_pixels,
                    "alphaThreshold": 16,
                }
            )
        track.alpha_composite(graded, position)
        segment_records.append((segment, graded, position))

    # These layers blend the authored component silhouettes into frozen terrain;
    # they never invent screen-space rails, ties, gauge, or route geometry.
    track_alpha = track.getchannel("A")
    bed_alpha = track_alpha.filter(ImageFilter.MaxFilter(city_odd_px(13)))
    bed_alpha = bed_alpha.filter(ImageFilter.GaussianBlur(3.2 * CITY_VISUAL_SCALE))
    bed_alpha = bed_alpha.point(lambda value: round(value * 0.32))
    bed = Image.new("RGBA", ARTBOARD, (31, 30, 24, 0))
    bed.putalpha(bed_alpha)

    support = Image.new("RGBA", ARTBOARD, (0, 0, 0, 0))
    for segment, sprite, position in segment_records:
        shadow_alpha = sprite.getchannel("A").filter(
            ImageFilter.GaussianBlur(4.5 * CITY_VISUAL_SCALE)
        )
        strength = 0.46 if segment["kind"].startswith("elevated-") else 0.22
        shadow_alpha = shadow_alpha.point(lambda value, amount=strength: round(value * amount))
        shadow = Image.new("RGBA", sprite.size, (2, 5, 6, 0))
        shadow.putalpha(shadow_alpha)
        support.alpha_composite(
            shadow,
            (
                position[0] + city_px(5),
                position[1] + city_px(8 if strength > 0.4 else 4),
            ),
        )

    # The route intentionally continues beyond the southeast artboard edge.
    # Keep the compositing contract clean without shortening or compressing the
    # final authored segment: only the four literal corner pixels are cleared.
    for layer in (support, bed, track):
        alpha = layer.getchannel("A")
        for corner in (
            (0, 0),
            (layer.width - 1, 0),
            (0, layer.height - 1),
            (layer.width - 1, layer.height - 1),
        ):
            alpha.putpixel(corner, 0)
        layer.putalpha(alpha)

    support.save(CITY_RAIL_SUPPORT_PATH, optimize=True)
    bed.save(CITY_RAIL_BED_PATH, optimize=True)
    track.save(CITY_RAIL_TRACK_PATH, optimize=True)
    return support, bed, track, segment_joins


def build_population_scale_cues() -> tuple[
    list[dict[str, Any]],
    Image.Image,
    Image.Image,
    Image.Image,
]:
    POPULATION_ROOT.mkdir(parents=True, exist_ok=True)
    with Image.open(POPULATION_SOURCE_PATH) as source_image:
        source = source_image.convert("RGB")
    _, saturation, value = source.convert("HSV").split()
    neutral = saturation.point(lambda channel: 255 if channel <= 22 else 0)
    bright = value.point(lambda channel: 255 if channel >= 200 else 0)
    background_candidate = ImageChops.multiply(neutral, bright)
    reachable_background = background_candidate.copy()
    for seed in (
        (0, 0),
        (source.width - 1, 0),
        (0, source.height - 1),
        (source.width - 1, source.height - 1),
    ):
        ImageDraw.floodfill(reachable_background, seed, 128, thresh=0)
    background = reachable_background.point(
        lambda channel: 255 if channel == 128 else 0
    )
    foreground = ImageChops.invert(background)
    clean_rgb = Image.composite(
        source,
        Image.new("RGB", source.size, (0, 0, 0)),
        foreground,
    )
    atlas = clean_rgb.convert("RGBA")
    atlas.putalpha(foreground)
    atlas.save(POPULATION_ATLAS_PATH, optimize=True)

    cell_width = source.width // 4
    cell_height = source.height // 2
    layers = {
        "site": Image.new("RGBA", ARTBOARD, (0, 0, 0, 0)),
        "close": Image.new("RGBA", ARTBOARD, (0, 0, 0, 0)),
    }
    shadows = {
        "site": Image.new("RGBA", ARTBOARD, (0, 0, 0, 0)),
        "close": Image.new("RGBA", ARTBOARD, (0, 0, 0, 0)),
    }
    shadow_draws = {
        tier: ImageDraw.Draw(shadow, "RGBA")
        for tier, shadow in shadows.items()
    }
    sprite_records: list[dict[str, Any]] = []
    placements: list[
        tuple[dict[str, Any], Image.Image, tuple[float, float], str]
    ] = []
    for cue in POPULATION_CUES:
        cell_x, cell_y = cue["cell"]
        cell = atlas.crop(
            (
                cell_x * cell_width,
                cell_y * cell_height,
                (cell_x + 1) * cell_width,
                (cell_y + 1) * cell_height,
            )
        )
        visible_bounds = cell.getchannel("A").point(
            lambda channel: 255 if channel >= 8 else 0
        ).getbbox()
        if visible_bounds is None:
            raise RuntimeError(f"Population cue {cue['id']} has no visible pixels.")
        padding = 6
        crop_bounds = (
            max(0, visible_bounds[0] - padding),
            max(0, visible_bounds[1] - padding),
            min(cell.width, visible_bounds[2] + padding),
            min(cell.height, visible_bounds[3] + padding),
        )
        sprite = cell.crop(crop_bounds)
        if cue.get("mirror", False):
            sprite = sprite.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        sprite_path = POPULATION_ROOT / f"temporary-{cue['id']}-r1.png"
        sprite.save(sprite_path, optimize=True)
        # The accepted concept master is identity-registered to the frozen
        # regional terrain. Population cues therefore use those coordinates
        # directly; the rejected 0.78 fabric transform must not move them.
        local_position = cue["sourceFabricPosition"]
        minimum_detail_tier = cue["minimumDetailTier"]
        if minimum_detail_tier not in layers:
            raise RuntimeError(
                f"Unsupported population detail tier: {minimum_detail_tier}"
            )
        source_display_height = cue["displayHeight"]
        display_height = city_px(source_display_height)
        display_width = max(1, round(display_height * sprite.width / sprite.height))
        rendered = sprite.resize(
            (display_width, display_height), Image.Resampling.LANCZOS
        )
        anchor = (
            local_position[0] * ARTBOARD[0],
            local_position[1] * ARTBOARD[1],
        )
        placements.append((cue, rendered, anchor, minimum_detail_tier))
        shadow_draws[minimum_detail_tier].ellipse(
            (
                anchor[0] - display_width * 0.48,
                anchor[1] - city_px(2),
                anchor[0] + display_width * 0.48,
                anchor[1] + city_px(3),
            ),
            fill=(3, 7, 7, 100),
        )
        sprite_records.append(
            {
                "id": cue["id"],
                "species": cue["species"],
                "temporaryScaleCue": True,
                "sourceFabricPosition": {
                    "x": cue["sourceFabricPosition"][0],
                    "y": cue["sourceFabricPosition"][1],
                },
                "conceptPosition": {
                    "x": local_position[0],
                    "y": local_position[1],
                },
                "localPosition": {"x": local_position[0], "y": local_position[1]},
                "registration": "identity-concept-master",
                "minimumDetailTier": minimum_detail_tier,
                "sourceDisplayHeight": source_display_height,
                "displayHeight": display_height,
                "mirrored": cue.get("mirror", False),
                "path": public_url(sprite_path),
                "sha256": sha256(sprite_path),
                "dimensions": list(sprite.size),
            }
        )
    for tier, layer in layers.items():
        layer.alpha_composite(
            shadows[tier].filter(
                ImageFilter.GaussianBlur(1.2 * CITY_VISUAL_SCALE)
            )
        )
        for _, rendered, anchor, placement_tier in sorted(
            placements,
            key=lambda item: item[2][1],
        ):
            if placement_tier != tier:
                continue
            layer.alpha_composite(
                rendered,
                (
                    round(anchor[0] - rendered.width * 0.5),
                    round(anchor[1] - rendered.height),
                ),
            )
    site_layer = layers["site"]
    close_layer = layers["close"]
    combined_layer = site_layer.copy()
    combined_layer.alpha_composite(close_layer)
    site_layer.save(POPULATION_SITE_LAYER_PATH, optimize=True)
    close_layer.save(POPULATION_CLOSE_LAYER_PATH, optimize=True)
    combined_layer.save(POPULATION_LAYER_PATH, optimize=True)
    return sprite_records, site_layer, close_layer, combined_layer


def terrain_footprint_metrics(
    node_record: dict[str, Any],
    land: Image.Image,
    slope: Image.Image,
    height: Image.Image,
) -> dict[str, Any]:
    local_position = node_record["localPosition"]
    footprint = node_record["footprintFraction"]
    local_x = local_position["x"] if isinstance(local_position, dict) else local_position[0]
    local_y = local_position["y"] if isinstance(local_position, dict) else local_position[1]
    footprint_width = footprint["width"] if isinstance(footprint, dict) else footprint[0]
    footprint_depth = footprint["depth"] if isinstance(footprint, dict) else footprint[1]
    center_world_x = CAPITAL_WORLD_ORIGIN[0] + local_x * CAPITAL_WORLD_SPAN[0]
    center_world_y = CAPITAL_WORLD_ORIGIN[1] + local_y * CAPITAL_WORLD_SPAN[1]
    radius_world_x = (
        node_record["displayWidth"] * footprint_width * 0.5
        / ARTBOARD[0] * CAPITAL_WORLD_SPAN[0]
    )
    radius_world_y = (
        node_record["displayWidth"] * footprint_depth * 0.5
        / ARTBOARD[1] * CAPITAL_WORLD_SPAN[1]
    )
    field_width, field_height = land.size
    left = max(0, math.floor((center_world_x - radius_world_x) * field_width))
    right = min(field_width, math.ceil((center_world_x + radius_world_x) * field_width))
    top = max(0, math.floor((center_world_y - radius_world_y) * field_height))
    bottom = min(field_height, math.ceil((center_world_y + radius_world_y) * field_height))
    sample_count = 0
    land_count = 0
    buildable_count = 0
    height_total = 0
    for field_y in range(top, bottom):
        world_y = (field_y + 0.5) / field_height
        normalized_y = (world_y - center_world_y) / max(radius_world_y, 1e-9)
        for field_x in range(left, right):
            world_x = (field_x + 0.5) / field_width
            normalized_x = (world_x - center_world_x) / max(radius_world_x, 1e-9)
            if normalized_x * normalized_x + normalized_y * normalized_y > 1:
                continue
            sample_count += 1
            is_land = land.getpixel((field_x, field_y)) >= LAND_THRESHOLD
            if is_land:
                land_count += 1
                height_total += height.getpixel((field_x, field_y))
                if slope.getpixel((field_x, field_y)) <= BUILDABLE_SLOPE_THRESHOLD:
                    buildable_count += 1
    return {
        "sampleCount": sample_count,
        "landCoverage": round(land_count / max(1, sample_count), 6),
        "buildableCoverage": round(buildable_count / max(1, sample_count), 6),
        "meanLandHeight": round(height_total / max(1, land_count), 3),
        "landThreshold": LAND_THRESHOLD,
        "buildableSlopeThreshold": BUILDABLE_SLOPE_THRESHOLD,
    }


def place_asset(
    canvas: Image.Image,
    asset_path: Path,
    anchor: tuple[float, float],
    display_width: int,
    ground_anchor: tuple[float, float],
) -> None:
    with Image.open(asset_path) as image:
        image.seek(0)
        rgba = image.convert("RGBA")
    display_height = round(display_width * rgba.height / rgba.width)
    rgba = rgba.resize((display_width, display_height), Image.Resampling.LANCZOS)
    x = round(anchor[0] - display_width * ground_anchor[0])
    y = round(anchor[1] - display_height * ground_anchor[1])
    canvas.alpha_composite(rgba, (x, y))


def draw_node_preview(
    canvas: Image.Image,
    manifest_nodes: list[dict[str, Any]],
    *,
    show_assets: bool,
    show_footprints: bool,
    show_labels: bool,
    foreground_source: Image.Image | None = None,
) -> list[str]:
    state_colors = {
        "selected": (198, 155, 73, 230),
        "selected-alpha-blocked": (218, 100, 70, 235),
        "review": (76, 159, 201, 230),
        "independent-go-metadata-pending": (198, 155, 73, 230),
        "animation-pending": (194, 91, 72, 230),
        "provisional-static": (194, 91, 72, 230),
    }
    ordered_records = sorted(
        manifest_nodes,
        key=lambda item: node_anchor(item)[1] + item["zBias"],
    )

    contact_layer = Image.new("RGBA", ARTBOARD, (0, 0, 0, 0))
    contact_draw = ImageDraw.Draw(contact_layer, "RGBA")
    for record in ordered_records:
        anchor = node_anchor(record)
        width = record["displayWidth"]
        footprint_fraction = node_footprint(record)
        footprint_width = width * footprint_fraction[0]
        footprint_depth = width * footprint_fraction[1]
        if show_footprints:
            contact_draw.ellipse(
                (
                    anchor[0] - footprint_width * 0.5,
                    anchor[1] - footprint_depth * 0.5,
                    anchor[0] + footprint_width * 0.5,
                    anchor[1] + footprint_depth * 0.5,
                ),
                fill=(8, 12, 12, 105),
                outline=state_colors[record["productionState"]],
                width=3,
            )
        elif record["assetNodeReady"]:
            contact_draw.ellipse(
                (
                    anchor[0] - footprint_width * 0.38,
                    anchor[1] - footprint_depth * 0.28,
                    anchor[0] + footprint_width * 0.38,
                    anchor[1] + footprint_depth * 0.28,
                ),
                fill=(3, 7, 7, 58),
            )
    if not show_footprints:
        contact_layer = contact_layer.filter(
            ImageFilter.GaussianBlur(7 * CITY_VISUAL_SCALE)
        )
    canvas.alpha_composite(contact_layer)

    rendered_skill_ids: list[str] = []
    if show_assets:
        for record in ordered_records:
            if not record["assetNodeReady"]:
                continue
            place_asset(
                canvas,
                poster_for(record),
                node_anchor(record),
                record["displayWidth"],
                tuple(record["groundAnchor"]),
            )
            rendered_skill_ids.append(record["skillId"])
        if foreground_source is not None:
            canvas.alpha_composite(foreground_source)

    if not show_labels:
        return rendered_skill_ids
    draw = ImageDraw.Draw(canvas, "RGBA")
    for record in ordered_records:
        anchor = node_anchor(record)
        footprint_depth = record["displayWidth"] * node_footprint(record)[1]
        label = record["label"]
        label_box = draw.textbbox((0, 0), label, font=font(14, True))
        label_width = label_box[2] - label_box[0]
        label_y = anchor[1] + max(16, footprint_depth * 0.55)
        draw.rounded_rectangle(
            (
                anchor[0] - label_width / 2 - 7,
                label_y - 2,
                anchor[0] + label_width / 2 + 7,
                label_y + 20,
            ),
            radius=5,
            fill=(5, 9, 10, 210),
        )
        draw.text(
            (anchor[0], label_y + 8),
            label,
            anchor="mm",
            fill=(238, 233, 215, 255),
            font=font(14, True),
        )
    return rendered_skill_ids


def with_opacity(source: Image.Image, factor: float) -> Image.Image:
    result = source.copy()
    result.putalpha(result.getchannel("A").point(lambda value: round(value * factor)))
    return result


def build_settlement_overview(
    manifest_nodes: list[dict[str, Any]],
    city_contact: Image.Image,
    city_underlay: Image.Image,
    city_environment_detail: Image.Image,
    rail_support: Image.Image,
    rail_bed: Image.Image,
    rail_track: Image.Image,
) -> tuple[Image.Image, list[str]]:
    """Create the territory LOD without flattening terrain into the city asset."""
    overview = Image.new("RGBA", ARTBOARD, (0, 0, 0, 0))
    overview.alpha_composite(with_opacity(city_contact, 0.62))
    overview.alpha_composite(with_opacity(city_underlay, 0.86))
    overview.alpha_composite(with_opacity(rail_support, 0.52))
    overview.alpha_composite(with_opacity(rail_bed, 0.62))
    overview.alpha_composite(with_opacity(rail_track, 0.74))
    overview.alpha_composite(with_opacity(city_environment_detail, 0.86))

    station_anchor = (
        STATION_LOCAL_POSITION[0] * ARTBOARD[0],
        STATION_LOCAL_POSITION[1] * ARTBOARD[1],
    )
    place_asset(
        overview,
        STATION_PATH,
        station_anchor,
        round(STATION_DISPLAY_WIDTH * 0.76),
        STATION_GROUND_ANCHOR,
    )

    ordered_records = sorted(
        (record for record in manifest_nodes if record["assetNodeReady"]),
        key=lambda item: node_anchor(item)[1] + item["zBias"],
    )
    contact_layer = Image.new("RGBA", ARTBOARD, (0, 0, 0, 0))
    contact_draw = ImageDraw.Draw(contact_layer, "RGBA")
    rendered_skill_ids: list[str] = []
    for record in ordered_records:
        anchor = node_anchor(record)
        overview_width = round(
            record["displayWidth"]
            * (0.62 if record["skillId"] == "ai-agent-systems" else 0.50)
        )
        footprint = node_footprint(record)
        contact_draw.ellipse(
            (
                anchor[0] - overview_width * footprint[0] * 0.28,
                anchor[1] - overview_width * footprint[1] * 0.20,
                anchor[0] + overview_width * footprint[0] * 0.28,
                anchor[1] + overview_width * footprint[1] * 0.20,
            ),
            fill=(3, 7, 7, 42),
        )
    overview.alpha_composite(
        contact_layer.filter(ImageFilter.GaussianBlur(4 * CITY_VISUAL_SCALE))
    )
    for record in ordered_records:
        overview_width = round(
            record["displayWidth"]
            * (0.62 if record["skillId"] == "ai-agent-systems" else 0.50)
        )
        place_asset(
            overview,
            poster_for(record),
            node_anchor(record),
            overview_width,
            tuple(record["groundAnchor"]),
        )
        rendered_skill_ids.append(record["skillId"])
    overview.save(CITY_OVERVIEW_PATH, optimize=True)
    return overview, rendered_skill_ids


def build_settlement_overview_preview(overview: Image.Image) -> None:
    canvas = prepare_registered_terrain()
    canvas.alpha_composite(overview)
    draw = ImageDraw.Draw(canvas, "RGBA")
    draw.rounded_rectangle((28, 25, 770, 106), radius=14, fill=(5, 10, 11, 224))
    draw.text(
        (48, 41),
        "NINJAONE CAPITAL - TERRITORY SETTLEMENT LOD R2",
        fill=(238, 228, 195, 255),
        font=font(24, True),
    )
    draw.text(
        (48, 73),
        "sparse districts on frozen terrain - no monolithic city plate",
        fill=(170, 184, 178, 255),
        font=font(14),
    )
    canvas.save(CITY_OVERVIEW_PREVIEW_PATH, optimize=True)


def build_preview(
    manifest_nodes: list[dict[str, Any]],
    city_contact: Image.Image,
    city_underlay: Image.Image,
    city_foreground: Image.Image,
    city_environment_detail: Image.Image,
    rail_support: Image.Image,
    rail_bed: Image.Image,
    rail_track: Image.Image,
    population_layer: Image.Image,
) -> list[str]:
    canvas = prepare_registered_terrain()
    canvas.alpha_composite(city_contact)
    canvas.alpha_composite(city_underlay)
    canvas.alpha_composite(rail_support)
    canvas.alpha_composite(rail_bed)
    canvas.alpha_composite(rail_track)
    draw = ImageDraw.Draw(canvas, "RGBA")

    station_anchor = (
        STATION_LOCAL_POSITION[0] * ARTBOARD[0],
        STATION_LOCAL_POSITION[1] * ARTBOARD[1],
    )
    station_width = STATION_DISPLAY_WIDTH
    station_contact = Image.new("RGBA", ARTBOARD, (0, 0, 0, 0))
    station_contact_draw = ImageDraw.Draw(station_contact, "RGBA")
    station_contact_draw.ellipse(
        (
            station_anchor[0] - city_px(126),
            station_anchor[1] - city_px(17),
            station_anchor[0] + city_px(126),
            station_anchor[1] + city_px(17),
        ),
        fill=(3, 7, 7, 82),
    )
    canvas.alpha_composite(
        station_contact.filter(ImageFilter.GaussianBlur(10 * CITY_VISUAL_SCALE))
    )
    place_asset(canvas, STATION_PATH, station_anchor, station_width, STATION_GROUND_ANCHOR)
    rendered_skill_ids = draw_node_preview(
        canvas,
        manifest_nodes,
        show_assets=True,
        show_footprints=False,
        show_labels=False,
        foreground_source=city_foreground,
    )
    canvas.alpha_composite(city_environment_detail)
    canvas.alpha_composite(population_layer)

    draw.rounded_rectangle((28, 25, 770, 106), radius=14, fill=(5, 10, 11, 224))
    draw.text(
        (48, 41),
        "NINJAONE CAPITAL - CONCEPT-LED CITY FABRIC R3",
        fill=(238, 228, 195, 255),
        font=font(24, True),
    )
    draw.text(
        (48, 73),
        "modular civic paths + independent skill-building nodes",
        fill=(170, 184, 178, 255),
        font=font(14),
    )
    canvas.save(PREVIEW_PATH, optimize=True)
    return rendered_skill_ids


def build_overlay(
    manifest_nodes: list[dict[str, Any]],
    city_contact: Image.Image,
    city_underlay: Image.Image,
    city_environment_detail: Image.Image,
    rail_support: Image.Image,
    rail_bed: Image.Image,
    rail_track: Image.Image,
    population_layer: Image.Image,
) -> None:
    canvas = prepare_registered_terrain()
    canvas.alpha_composite(city_contact)
    canvas.alpha_composite(city_underlay)
    canvas.alpha_composite(rail_support)
    canvas.alpha_composite(rail_bed)
    canvas.alpha_composite(rail_track)
    canvas.alpha_composite(city_environment_detail)
    canvas.alpha_composite(population_layer)
    draw = ImageDraw.Draw(canvas, "RGBA")
    draw.rectangle((0, 0, *ARTBOARD), fill=(6, 10, 11, 126))
    for district in DISTRICTS:
        envelope = fabric_local_envelope(district["localEnvelope"])
        box = (
            envelope["x"] * ARTBOARD[0],
            envelope["y"] * ARTBOARD[1],
            (envelope["x"] + envelope["width"]) * ARTBOARD[0],
            (envelope["y"] + envelope["height"]) * ARTBOARD[1],
        )
        draw.rounded_rectangle(box, radius=45, outline=(220, 215, 188, 120), width=3)
        draw.text(
            (box[0] + 14, box[1] + 12),
            f"{district['label']} - E{district['elevationBand']} - {district['primaryGridCell']}",
            fill=(235, 230, 205, 230),
            font=font(15, True),
        )
    draw_node_preview(
        canvas,
        manifest_nodes,
        show_assets=False,
        show_footprints=True,
        show_labels=True,
    )
    draw.text(
        (30, 1305),
        "Footprints are local planning geometry only. Final land/slope/hydrology admission remains blocked.",
        fill=(238, 221, 190, 255),
        font=font(16, True),
    )
    canvas.save(OVERLAY_PATH, optimize=True)


def build_city_fabric_slot_preview(
    manifest_nodes: list[dict[str, Any]],
    city_contact: Image.Image,
    city_underlay: Image.Image,
    city_environment_detail: Image.Image,
    rail_support: Image.Image,
    rail_bed: Image.Image,
    rail_track: Image.Image,
    population_layer: Image.Image,
) -> None:
    canvas = prepare_registered_terrain()
    canvas.alpha_composite(city_contact)
    canvas.alpha_composite(city_underlay)
    canvas.alpha_composite(rail_support)
    canvas.alpha_composite(rail_bed)
    canvas.alpha_composite(rail_track)
    canvas.alpha_composite(city_environment_detail)
    canvas.alpha_composite(population_layer)
    draw = ImageDraw.Draw(canvas, "RGBA")
    draw.rounded_rectangle((24, 22, 788, 108), radius=14, fill=(5, 10, 11, 224))
    draw.text(
        (44, 39),
        "CONCEPT CITY - 19 GENERIC BUILDING REPLACEMENTS",
        fill=(238, 228, 195, 255),
        font=font(22, True),
    )
    draw.text(
        (44, 72),
        "gold = skill building socket | blue = retained civic/support fabric",
        fill=(170, 184, 178, 255),
        font=font(14),
    )

    for record in manifest_nodes:
        anchor = node_anchor(record)
        footprint_width, footprint_depth = node_footprint(record)
        radius_x = record["displayWidth"] * footprint_width * 0.57
        radius_y = max(15, record["displayWidth"] * footprint_depth * 0.72)
        draw.ellipse(
            (
                anchor[0] - radius_x,
                anchor[1] - radius_y,
                anchor[0] + radius_x,
                anchor[1] + radius_y,
            ),
            fill=(185, 139, 50, 44),
            outline=(241, 201, 104, 245),
            width=3,
        )
        draw.text(
            (anchor[0], anchor[1]),
            record["label"],
            anchor="mm",
            fill=(247, 239, 213, 255),
            font=font(11, True),
            stroke_width=3,
            stroke_fill=(4, 8, 9, 235),
        )

    for support in CITY_RETAINED_SUPPORT_SLOTS:
        position = support["localPosition"]
        anchor = (position[0] * ARTBOARD[0], position[1] * ARTBOARD[1])
        draw.ellipse(
            (anchor[0] - 54, anchor[1] - 22, anchor[0] + 54, anchor[1] + 22),
            fill=(65, 132, 161, 38),
            outline=(105, 197, 224, 235),
            width=3,
        )
        draw.text(
            (anchor[0], anchor[1]),
            support["slotId"].replace("-", " ").upper(),
            anchor="mm",
            fill=(213, 240, 247, 255),
            font=font(10, True),
            stroke_width=3,
            stroke_fill=(4, 8, 9, 235),
        )
    canvas.save(CITY_FABRIC_PREVIEW_PATH, optimize=True)


def build_city_fabric_connectivity_qa(
    manifest_nodes: list[dict[str, Any]],
    city_underlay: Image.Image,
) -> dict[str, Any]:
    alpha = city_underlay.getchannel("A")
    binary = alpha.point(lambda value: 255 if value >= 32 else 0)
    downsampled = binary.resize(
        (max(1, ARTBOARD[0] // 4), max(1, ARTBOARD[1] // 4)),
        Image.Resampling.NEAREST,
    )
    downsampled_histogram = downsampled.histogram()
    visible_downsampled_pixels = downsampled_histogram[255]
    first_visible = downsampled.tobytes().find(b"\xff")
    if first_visible < 0:
        raise RuntimeError("The active city fabric has no visible pixels.")
    component = downsampled.copy()
    seed = (
        first_visible % downsampled.width,
        first_visible // downsampled.width,
    )
    ImageDraw.floodfill(component, seed, 128, thresh=0)
    primary_component_pixels = component.histogram()[128]
    primary_component_ratio = (
        primary_component_pixels / visible_downsampled_pixels
        if visible_downsampled_pixels
        else 0.0
    )

    node_records: list[dict[str, Any]] = []
    canvas = prepare_registered_terrain()
    canvas.alpha_composite(city_underlay)
    draw = ImageDraw.Draw(canvas, "RGBA")
    for record in manifest_nodes:
        anchor = node_anchor(record)
        footprint_width, footprint_depth = node_footprint(record)
        radius_x = max(6, record["displayWidth"] * footprint_width * 0.5)
        radius_y = max(6, record["displayWidth"] * footprint_depth * 0.5)
        footprint_mask = Image.new("L", ARTBOARD, 0)
        footprint_draw = ImageDraw.Draw(footprint_mask)
        box = (
            anchor[0] - radius_x,
            anchor[1] - radius_y,
            anchor[0] + radius_x,
            anchor[1] + radius_y,
        )
        footprint_draw.ellipse(box, fill=255)
        footprint_pixels = footprint_mask.histogram()[255]
        contact_pixels = ImageChops.multiply(binary, footprint_mask).histogram()[255]
        coverage = contact_pixels / footprint_pixels if footprint_pixels else 0.0
        passed = coverage >= 0.55
        color = (93, 220, 143, 245) if passed else (255, 86, 63, 245)
        draw.ellipse(box, outline=color, width=4)
        draw.text(
            (anchor[0], anchor[1] + radius_y + 12),
            f"{record['label']} {coverage:.0%}",
            anchor="mm",
            fill=color,
            font=font(12, True),
            stroke_width=3,
            stroke_fill=(3, 7, 7, 238),
        )
        node_records.append(
            {
                "skillId": record["skillId"],
                "fabricCoverage": round(coverage, 6),
                "passes": passed,
            }
        )
    draw.rounded_rectangle((24, 22, 820, 104), radius=14, fill=(5, 10, 11, 224))
    draw.text(
        (44, 39),
        "CONNECTED CITY FABRIC - 19 NODE CONTACT GATE",
        fill=(238, 228, 195, 255),
        font=font(21, True),
    )
    draw.text(
        (44, 70),
        f"green >=55% footprint contact | primary fabric component {primary_component_ratio:.2%}",
        fill=(170, 184, 178, 255),
        font=font(14),
    )
    canvas.save(CITY_FABRIC_CONNECTIVITY_QA_PATH, optimize=True)
    return {
        "primaryComponentRatio": round(primary_component_ratio, 6),
        "minimumNodeFabricCoverage": min(
            node["fabricCoverage"] for node in node_records
        ),
        "allNodesPass": all(node["passes"] for node in node_records),
        "nodes": node_records,
    }


def build_terrain_admission_overlay(manifest_nodes: list[dict[str, Any]]) -> None:
    canvas = prepare_registered_terrain()
    with Image.open(LAND_MASK_PATH) as source:
        land = source.convert("L")
    with Image.open(SLOPE_PATH) as source:
        slope = source.convert("L")
    field_width, field_height = land.size
    crop = (
        round(CAPITAL_WORLD_ORIGIN[0] * field_width),
        round(CAPITAL_WORLD_ORIGIN[1] * field_height),
        round((CAPITAL_WORLD_ORIGIN[0] + CAPITAL_WORLD_SPAN[0]) * field_width),
        round((CAPITAL_WORLD_ORIGIN[1] + CAPITAL_WORLD_SPAN[1]) * field_height),
    )
    land = land.crop(crop).resize(ARTBOARD, Image.Resampling.NEAREST)
    slope = slope.crop(crop).resize(ARTBOARD, Image.Resampling.NEAREST)
    land_mask = land.point(lambda value: 255 if value >= LAND_THRESHOLD else 0)
    buildable_slope = slope.point(
        lambda value: 255 if value <= BUILDABLE_SLOPE_THRESHOLD else 0
    )
    buildable = ImageChops.multiply(land_mask, buildable_slope)
    non_land = land_mask.point(lambda value: 255 - value)
    steep_land = ImageChops.subtract(land_mask, buildable)
    tint = Image.new("RGBA", ARTBOARD, (42, 123, 72, 42))
    tint.paste((190, 63, 37, 112), mask=steep_land)
    tint.paste((35, 86, 160, 126), mask=non_land)
    canvas.alpha_composite(tint)
    draw = ImageDraw.Draw(canvas, "RGBA")
    for record in manifest_nodes:
        anchor = node_anchor(record)
        footprint = node_footprint(record)
        width = record["displayWidth"] * footprint[0]
        depth = record["displayWidth"] * footprint[1]
        admission = record["terrainAdmissionPreview"]
        accepted = (
            admission["landCoverage"] >= 1
            and admission["buildableCoverage"] >= 0.8
        )
        color = (224, 205, 127, 235) if accepted else (255, 92, 58, 245)
        draw.ellipse(
            (
                anchor[0] - width * 0.5,
                anchor[1] - depth * 0.5,
                anchor[0] + width * 0.5,
                anchor[1] + depth * 0.5,
            ),
            fill=(4, 8, 8, 90),
            outline=color,
            width=3,
        )
        draw.text(
            (anchor[0], anchor[1] + depth * 0.6 + 8),
            f"{record['label']}  L{admission['landCoverage']:.0%} / S{admission['buildableCoverage']:.0%}",
            anchor="mm",
            fill=color,
            font=font(13, True),
            stroke_fill=(3, 7, 7, 230),
            stroke_width=3,
        )
    draw.rounded_rectangle((24, 22, 718, 91), radius=12, fill=(4, 9, 10, 224))
    draw.text(
        (42, 36),
        "FROZEN TERRAIN ADMISSION - GOLD PASS / RED FAIL",
        fill=(238, 229, 199, 255),
        font=font(20, True),
    )
    draw.text(
        (42, 65),
        "green tint buildable - red steep - blue non-land - hydrology clearance still pending",
        fill=(178, 191, 184, 255),
        font=font(13),
    )
    canvas.save(TERRAIN_ADMISSION_OVERLAY_PATH, optimize=True)


def build_comparison() -> None:
    reference = Image.open(REFERENCE_PATH).convert("RGB").resize(
        (900, 675), Image.Resampling.LANCZOS
    )
    preview = Image.open(PREVIEW_PATH).convert("RGB").resize(
        (900, 675), Image.Resampling.LANCZOS
    )
    canvas = Image.new("RGB", (1800, 750), (8, 13, 15))
    canvas.paste(reference, (0, 75))
    canvas.paste(preview, (900, 75))
    draw = ImageDraw.Draw(canvas)
    draw.text(
        (24, 22),
        "TARGET HIERARCHY - OLD INTEGRATED RENDER (REFERENCE ONLY)",
        fill=(235, 225, 194),
        font=font(20, True),
    )
    draw.text(
        (924, 22),
        "NEW BUILDING NODES - FROZEN REGIONAL TERRAIN",
        fill=(235, 225, 194),
        font=font(20, True),
    )
    draw.text(
        (924, 49),
        "generic city masses are replaced by independent skill assets",
        fill=(165, 181, 177),
        font=font(14),
    )
    canvas.save(COMPARISON_PATH, optimize=True)


def main() -> None:
    QA_ROOT.mkdir(parents=True, exist_ok=True)
    FABRIC_ROOT.mkdir(parents=True, exist_ok=True)
    global_authority_hashes = {
        "landMask": sha256(LAND_MASK_PATH),
        "height": sha256(HEIGHT_PATH),
        "slope": sha256(SLOPE_PATH),
        "relief": sha256(RELIEF_PATH),
    }
    expected_global_hashes = {
        "landMask": EXPECTED_LAND_MASK_SHA256,
        "height": EXPECTED_HEIGHT_SHA256,
        "slope": EXPECTED_SLOPE_SHA256,
        "relief": EXPECTED_RELIEF_SHA256,
    }
    global_authority_mismatches = [
        key
        for key, current_hash in global_authority_hashes.items()
        if current_hash != expected_global_hashes[key]
    ]
    if global_authority_mismatches:
        raise RuntimeError(
            "Frozen global land authorities have drifted: "
            f"{global_authority_mismatches}"
        )
    regional_terrain_hash = sha256(REGIONAL_TERRAIN_PATH)
    if regional_terrain_hash != EXPECTED_REGIONAL_TERRAIN_SHA256:
        raise RuntimeError("The frozen regional terrain master has drifted.")
    if sha256(REFERENCE_PATH) != EXPECTED_REFERENCE_SHA256:
        raise RuntimeError("The selected old integrated render reference has drifted.")
    if sha256(STATION_PATH) != EXPECTED_STATION_SHA256:
        raise RuntimeError("The independent train station resource has drifted.")
    city_fabric_source_hash = sha256(CITY_FABRIC_SOURCE_PATH)
    if city_fabric_source_hash != EXPECTED_CITY_FABRIC_SOURCE_SHA256:
        raise RuntimeError("The concept-derived city fabric source has drifted.")
    city_circulation_source_hash = sha256(CITY_CIRCULATION_SOURCE_PATH)
    if city_circulation_source_hash != EXPECTED_CITY_CIRCULATION_SOURCE_SHA256:
        raise RuntimeError("The concept-led city circulation source has drifted.")
    infrastructure_atlas_hash = sha256(INFRASTRUCTURE_ATLAS_PATH)
    if infrastructure_atlas_hash != EXPECTED_INFRASTRUCTURE_ATLAS_SHA256:
        raise RuntimeError("The modular infrastructure atlas has drifted.")
    rail_segment_atlas_hash = sha256(RAIL_SEGMENT_ATLAS_PATH)
    if rail_segment_atlas_hash != EXPECTED_RAIL_SEGMENT_ATLAS_SHA256:
        raise RuntimeError("The authored isometric rail segment atlas has drifted.")
    population_source_hash = sha256(POPULATION_SOURCE_PATH)
    if population_source_hash != EXPECTED_POPULATION_SOURCE_SHA256:
        raise RuntimeError("The temporary fantasy population source has drifted.")
    golang_alpha_inspection = build_golang_alpha_base()
    if (
        golang_alpha_inspection["maximumCornerAlpha"] > 1
        or golang_alpha_inspection["transparentRgbUnderZeroAlpha"] != 0
    ):
        raise RuntimeError("The recovered Go static base failed alpha hygiene.")

    manifest_nodes: list[dict[str, Any]] = []
    asset_hash_mismatches: list[str] = []
    alpha_blockers: list[str] = []
    with Image.open(LAND_MASK_PATH) as image:
        land_field = image.convert("L").copy()
    with Image.open(SLOPE_PATH) as image:
        slope_field = image.convert("L").copy()
    with Image.open(HEIGHT_PATH) as image:
        height_field = image.convert("L").copy()

    for source_node in NODES:
        record = dict(source_node)
        record["localPosition"] = {
            "x": source_node["localPosition"][0],
            "y": source_node["localPosition"][1],
        }
        record["footprintFraction"] = {
            "width": source_node["footprintFraction"][0],
            "depth": source_node["footprintFraction"][1],
        }
        record["posterPath"] = public_url(poster_for(source_node))
        record["posterSha256"] = sha256(poster_for(source_node))

        if source_node["skillId"] == "golang":
            render_layers: list[dict[str, Any]] = []
            for layer in GO_LAYERS:
                layer_path = BUILDING_ROOT / "golang-layers" / layer["file"]
                layer_hash = sha256(layer_path)
                expected_hash = layer.get("sha256")
                if expected_hash is not None and layer_hash != expected_hash:
                    asset_hash_mismatches.append(f"golang/{layer['id']}")
                inspection = inspect_image(layer_path)
                layer_record = {
                    "id": layer["id"],
                    "path": public_url(layer_path),
                    "sha256": layer_hash,
                    **inspection,
                }
                if "generatedFrom" in layer:
                    layer_record["generatedFrom"] = {
                        "path": public_url(GO_OPAQUE_BASE_PATH),
                        "sha256": EXPECTED_GO_OPAQUE_BASE_SHA256,
                        "method": "deterministic-edge-connected-presentation-matte-extraction",
                    }
                render_layers.append(layer_record)
            base = render_layers[0]
            record["sourceDimensions"] = base["dimensions"]
            record["groundAnchor"] = [0.5, 1.0]
            record["renderMode"] = "semantic-layers"
            record["renderLayers"] = render_layers
            record["assetNodeReady"] = base["maximumCornerAlpha"] <= 1
            record["integrationBlockers"] = []
            record["alphaRecovery"] = golang_alpha_inspection
            if not record["assetNodeReady"]:
                alpha_blockers.append("golang")
        else:
            asset_path = BUILDING_ROOT / source_node["filename"]
            asset_hash = sha256(asset_path)
            if asset_hash != source_node["expectedHash"]:
                asset_hash_mismatches.append(source_node["skillId"])
            inspection = inspect_image(asset_path)
            bounds = alpha_bounds(asset_path)
            if bounds is None:
                raise RuntimeError(f"{source_node['skillId']} has no visible alpha.")
            ground_anchor = [
                round(((bounds[0] + bounds[2]) * 0.5) / inspection["dimensions"][0], 6),
                round(bounds[3] / inspection["dimensions"][1], 6),
            ]
            record["sourceDimensions"] = inspection["dimensions"]
            record["groundAnchor"] = ground_anchor
            record["renderMode"] = (
                "static" if source_node["frameCount"] == 1 else "animated-master"
            )
            record["renderLayers"] = [
                {
                    "id": "building-master",
                    "path": public_url(asset_path),
                    "sha256": asset_hash,
                    **inspection,
                }
            ]
            record["assetNodeReady"] = inspection["maximumCornerAlpha"] <= 1
            record["integrationBlockers"] = []
            if not record["assetNodeReady"]:
                alpha_blockers.append(source_node["skillId"])

        record.pop("filename", None)
        record.pop("expectedHash", None)
        record["terrainAdmissionPreview"] = terrain_footprint_metrics(
            record,
            land_field,
            slope_field,
            height_field,
        )
        record["terrainTransition"] = terrain_transition_geometry(record)
        manifest_nodes.append(record)

    terrain_admission_failures = [
        {
            "skillId": record["skillId"],
            **record["terrainAdmissionPreview"],
        }
        for record in manifest_nodes
        if record["terrainAdmissionPreview"]["landCoverage"] < 1
        or record["terrainAdmissionPreview"]["buildableCoverage"] < 0.8
    ]

    overlaps: list[dict[str, Any]] = []
    normalized_nodes = []
    for record in manifest_nodes:
        normalized = dict(record)
        normalized["localPosition"] = [
            record["localPosition"]["x"],
            record["localPosition"]["y"],
        ]
        normalized["footprintFraction"] = [
            record["footprintFraction"]["width"],
            record["footprintFraction"]["depth"],
        ]
        normalized_nodes.append(normalized)
    for index, left in enumerate(normalized_nodes):
        for right in normalized_nodes[index + 1:]:
            overlap = footprint_overlap(left, right)
            if overlap > 0:
                overlaps.append(
                    {
                        "left": left["skillId"],
                        "right": right["skillId"],
                        "normalizedOverlap": round(overlap, 6),
                    }
                )

    (
        city_contact,
        city_underlay,
        city_foreground,
        city_environment_detail,
    ) = build_city_fabric_layers(manifest_nodes)
    city_fabric_connectivity = build_city_fabric_connectivity_qa(
        manifest_nodes,
        city_underlay,
    )
    if (
        city_fabric_connectivity["primaryComponentRatio"] < 0.99
        or not city_fabric_connectivity["allNodesPass"]
    ):
        raise RuntimeError(
            "The active city fabric failed connected-component or node-contact QA."
        )
    (
        rail_support,
        rail_bed,
        rail_track,
        rail_segment_joins,
    ) = build_southbound_territory_rail()
    settlement_overview, territory_rendered_skill_ids = build_settlement_overview(
        manifest_nodes,
        city_contact,
        city_underlay,
        city_environment_detail,
        rail_support,
        rail_bed,
        rail_track,
    )
    (
        population_records,
        population_site_layer,
        population_close_layer,
        population_layer,
    ) = build_population_scale_cues()
    city_fabric_source_inspection = inspect_image(CITY_FABRIC_SOURCE_PATH)
    city_circulation_source_inspection = inspect_image(CITY_CIRCULATION_SOURCE_PATH)
    infrastructure_atlas_inspection = inspect_image(INFRASTRUCTURE_ATLAS_PATH)
    rail_segment_source_inspection = inspect_image(RAIL_SEGMENT_ATLAS_PATH)
    rail_segment_alpha_inspection = inspect_image(CITY_RAIL_SEGMENT_ALPHA_PATH)
    rail_segment_alpha_inspection["transparentRgbUnderZeroAlpha"] = (
        transparent_rgb_under_zero_alpha(CITY_RAIL_SEGMENT_ALPHA_PATH)
    )
    station_inspection = inspect_image(STATION_PATH)
    manifest = {
        "schemaVersion": 1,
        "id": "career-world/capitals/ninjaone/city-node-composition@r1",
        "status": "integration-preview",
        "productionReady": False,
        "runtimeEligible": False,
        "artboard": {
            "coordinateSpace": "capital-local-registered-plate-pixels",
            "dimensions": list(ARTBOARD),
            "worldOrigin": list(CAPITAL_WORLD_ORIGIN),
            "worldSpan": list(CAPITAL_WORLD_SPAN),
            "visualScaleCalibration": {
                "preB1Dimensions": list(PRE_B1_ARTBOARD),
                "expandedCanvasScale": round(CITY_VISUAL_SCALE, 6),
                "nodeSourceScale": CITY_NODE_SOURCE_SCALE,
                "effectiveNodeScale": round(CITY_NODE_DISPLAY_SCALE, 6),
                "purpose": "retain concept-socket and population scale after B1 expansion",
                "changesTerrainGeometry": False,
            },
        },
        "visualAuthority": {
            "goalReference": {
                "path": public_url(REFERENCE_PATH),
                "sha256": sha256(REFERENCE_PATH),
                "role": "hierarchy-and-integration-reference-only",
                "bakedBuildingsAreNotRuntimeAssets": True,
            },
            "registeredTerrainBase": {
                "repoPath": str(REGIONAL_TERRAIN_PATH.relative_to(REPO)).replace("\\", "/"),
                "sha256": regional_terrain_hash,
                "capitalPixelBounds": list(CAPITAL_REGIONAL_PIXEL_BOUNDS),
                "role": "frozen-regional-placement-and-contact-authority",
            },
            "conceptDerivedCityFabric": {
                "sourceRepoPath": str(CITY_FABRIC_SOURCE_PATH.relative_to(REPO)).replace("\\", "/"),
                "sourceSha256": city_fabric_source_hash,
                "role": "rejected monolithic plate retained only as provenance and layout evidence",
                "isCityDesignAuthority": False,
                "designAuthority": public_url(REFERENCE_PATH),
                "oldTerraceCityAssetsUsed": False,
            },
            "conceptLedCityCirculation": {
                "sourceRepoPath": str(CITY_CIRCULATION_SOURCE_PATH.relative_to(REPO)).replace("\\", "/"),
                "sourceSha256": city_circulation_source_hash,
                "dimensions": city_circulation_source_inspection["dimensions"],
                "role": "connected-city-circulation-and-terrain-transition-design-authority",
                "containsBuildings": False,
                "containsStation": False,
                "containsTrainOrTrack": False,
                "changesTerrainGeometry": False,
            },
            "modularInfrastructureAtlas": {
                "sourceRepoPath": str(INFRASTRUCTURE_ATLAS_PATH.relative_to(REPO)).replace("\\", "/"),
                "sourceSha256": infrastructure_atlas_hash,
                "dimensions": infrastructure_atlas_inspection["dimensions"],
                "role": "independent paths stairs bridges plazas and terrain-transition seams",
                "isFullCityPlate": False,
                "placementCount": len(CITY_INFRASTRUCTURE_PLACEMENTS),
            },
            "requiredHierarchy": [
                "mountain citadel",
                "station and territory-rail hinge",
                "river-separated connected districts",
                "lower infrastructure works",
                "terrain, retaining, foliage, and contact seams",
            ],
        },
        "terrainBinding": {
            "status": "blocked-pending-final-hydrology",
            "canonicalLandMask": {
                "path": public_url(LAND_MASK_PATH),
                "sha256": global_authority_hashes["landMask"],
                "contentHashStatus": "frozen-global-authority",
                "rule": "every non-land pixel is hard no-structure space",
            },
            "heightField": {
                "path": public_url(HEIGHT_PATH),
                "sha256": global_authority_hashes["height"],
                "contentHashStatus": "frozen-global-authority",
            },
            "slopeField": {
                "path": public_url(SLOPE_PATH),
                "sha256": global_authority_hashes["slope"],
                "contentHashStatus": "frozen-global-authority",
                "rule": "no structures on bright high-slope cliff bands",
            },
            "globalVisualBase": {
                "path": public_url(RELIEF_PATH),
                "sha256": global_authority_hashes["relief"],
                "contentHashStatus": "frozen-global-authority",
            },
            "hydrology": {
                "manifestPath": public_url(HYDROLOGY_MANIFEST_PATH),
                "currentBranchSha256": sha256(HYDROLOGY_MANIFEST_PATH),
                "authorityId": "career-world/capitals/ninjaone/inland-water-authority@r1",
                "fieldPath": "/career-world/layers/water-surface/fields/ninjaone-inland-water-field-r1.png",
                "fieldContentHashesFrozen": True,
                "numericShorelineSetbackVerified": False,
                "rule": "remain visibly clear of registered water channels; do not invent a numeric buffer",
            },
            "regionalTerrainMaster": {
                "status": "frozen-regional-authority",
                "repoPath": str(REGIONAL_TERRAIN_PATH.relative_to(REPO)).replace("\\", "/"),
                "sha256": regional_terrain_hash,
                "capitalPixelBounds": list(CAPITAL_REGIONAL_PIXEL_BOUNDS),
            },
            "gridRegistration": {
                "regionalOrigin": [0.125, 0.0],
                "regionalSpan": [0.25, 0.3333333333333333],
                "regionalDimensions": [5760, 4320],
                "cells": {
                    "B1": {"pixelBounds": [0, 0, 2880, 2160], "worldOrigin": [0.125, 0.0], "worldSpan": [0.125, 0.16666666666666666]},
                    "B2": {"pixelBounds": [2880, 0, 5760, 2160], "worldOrigin": [0.25, 0.0], "worldSpan": [0.125, 0.16666666666666666]},
                    "C1": {"pixelBounds": [0, 2160, 2880, 4320], "worldOrigin": [0.125, 0.16666666666666666], "worldSpan": [0.125, 0.16666666666666666]},
                    "C2": {"pixelBounds": [2880, 2160, 5760, 4320], "worldOrigin": [0.25, 0.16666666666666666], "worldSpan": [0.125, 0.16666666666666666]},
                },
            },
        },
        "layerOrder": [
            "external-terrain",
            "territory-settlement-overview",
            "city-terrain-contact",
            "streets-retaining-and-support-fabric",
            "territory-rail-supports",
            "territory-rail-bed",
            "territory-track",
            "station-rear-and-platforms",
            "building-ground-shadows",
            "skill-building-nodes",
            "city-fabric-transition-foreground",
            "moving-train",
            "station-and-terrain-foreground-occluders",
            "city-foliage-and-contact-details",
            "temporary-population-site-scale-cues",
            "temporary-population-close-detail-cues",
        ],
        "districts": [
            {
                **{
                    key: value
                    for key, value in district.items()
                    if key not in {"color", "localEnvelope"}
                },
                "sourceFabricEnvelope": district["localEnvelope"],
                "localEnvelope": fabric_local_envelope(district["localEnvelope"]),
            }
            for district in DISTRICTS
        ],
        "transport": {
            "station": {
                "id": "ninjaone-intercity-station-r2",
                "path": public_url(STATION_PATH),
                "sha256": sha256(STATION_PATH),
                "dimensions": station_inspection["dimensions"],
                "localPosition": {"x": STATION_LOCAL_POSITION[0], "y": STATION_LOCAL_POSITION[1]},
                "displayWidth": STATION_DISPLAY_WIDTH,
                "groundAnchor": list(STATION_GROUND_ANCHOR),
                "independentAsset": True,
                "ownsTrack": False,
                "ownsTrain": False,
            },
            "rail": {
                "owner": "territory-transport-layer",
                "renderMethod": "authored-isometric-segment-chain",
                "screenSpaceRibbonForbidden": True,
                "centerlineStatus": "authored-station-to-south-southeast-exit-r3",
                "stationLocalPosition": {
                    "x": SOUTHBOUND_RAIL_STATION_LOCAL_POSITION[0],
                    "y": SOUTHBOUND_RAIL_STATION_LOCAL_POSITION[1],
                },
                "stationTrackCenterLocalPosition": {
                    "x": SOUTHBOUND_RAIL_STATION_TRACK_LOCAL_POSITION[0],
                    "y": SOUTHBOUND_RAIL_STATION_TRACK_LOCAL_POSITION[1],
                },
                "sourceGatewayPosition": {
                    "x": SOUTHBOUND_RAIL_GATEWAY_SOURCE_POSITION[0],
                    "y": SOUTHBOUND_RAIL_GATEWAY_SOURCE_POSITION[1],
                },
                "gatewayLocalPosition": {
                    "x": SOUTHBOUND_RAIL_GATEWAY_LOCAL_POSITION[0],
                    "y": SOUTHBOUND_RAIL_GATEWAY_LOCAL_POSITION[1],
                },
                "controlPoints": [
                    {"x": point[0], "y": point[1]}
                    for point in SOUTHBOUND_RAIL_EXIT_CONTROL_POINTS
                ],
                "exitDirection": "south-southeast",
                "entryDirection": "station-terminal",
                "offCapitalEntry": False,
                "offCapitalEndpoint": True,
                "terminatesAtBuilding": False,
                "segmentAtlas": {
                    "sourceRepoPath": str(RAIL_SEGMENT_ATLAS_PATH.relative_to(REPO)).replace("\\", "/"),
                    "sourceSha256": rail_segment_atlas_hash,
                    "sourceDimensions": rail_segment_source_inspection["dimensions"],
                    "alphaPath": public_url(CITY_RAIL_SEGMENT_ALPHA_PATH),
                    "alphaSha256": sha256(CITY_RAIL_SEGMENT_ALPHA_PATH),
                    "alphaDimensions": rail_segment_alpha_inspection["dimensions"],
                    "cameraConstraint": "direction-specific-source-isometric-no-arbitrary-rotation",
                },
                "segments": [
                    {
                        "id": segment["id"],
                        "sourceCell": list(segment["cell"]),
                        "localCenter": {
                            "x": segment["localCenter"][0],
                            "y": segment["localCenter"][1],
                        },
                        "displayWidth": city_px(segment["displayWidth"]),
                        "kind": segment["kind"],
                        "rotationDegrees": 0,
                    }
                    for segment in RAIL_SEGMENT_CHAIN
                ],
                "segmentJoins": rail_segment_joins,
                "scaleReference": {
                    "qaOnly": True,
                    "populationRuntimeTiers": ["site", "close"],
                    "territoryOverviewPopulationVisible": False,
                    "humanHeightPixels": city_px(22),
                    "dwarfHeightPixels": city_px(18),
                    "elfHeightPixels": city_px(23),
                    "trackEnvelopeTargetPixels": [city_px(11), city_px(14)],
                    "viaductClearanceTargetHumanHeights": [3, 5],
                },
                "supportLayer": {
                    "path": public_url(CITY_RAIL_SUPPORT_PATH),
                    "sha256": sha256(CITY_RAIL_SUPPORT_PATH),
                    "dimensions": list(rail_support.size),
                },
                "bedLayer": {
                    "path": public_url(CITY_RAIL_BED_PATH),
                    "sha256": sha256(CITY_RAIL_BED_PATH),
                    "dimensions": list(rail_bed.size),
                },
                "trackLayer": {
                    "path": public_url(CITY_RAIL_TRACK_PATH),
                    "sha256": sha256(CITY_RAIL_TRACK_PATH),
                    "dimensions": list(rail_track.size),
                },
                "mustEnterAndExitCapital": True,
                "cityOnlyLoopForbidden": True,
            },
            "train": {
                "owner": "moving-vehicle-layer",
                "assetStatus": "production-loop-not-yet-recovered",
                "path": None,
                "independentAsset": True,
                "bakedIntoStation": False,
                "bakedIntoCityPlate": False,
            },
        },
        "cityFabric": {
            "activeCirculationSource": {
                "repoPath": str(CITY_CIRCULATION_SOURCE_PATH.relative_to(REPO)).replace("\\", "/"),
                "sha256": city_circulation_source_hash,
                "dimensions": city_circulation_source_inspection["dimensions"],
                "runtimeUsage": "registered-independent-visual-underlay",
                "proceduralPadsOrCorridors": False,
            },
            "connectivity": city_fabric_connectivity,
            "sourceEvidence": {
                "repoPath": str(CITY_FABRIC_SOURCE_PATH.relative_to(REPO)).replace("\\", "/"),
                "sha256": city_fabric_source_hash,
                "dimensions": city_fabric_source_inspection["dimensions"],
                "maximumCornerAlpha": city_fabric_source_inspection["maximumCornerAlpha"],
                "runtimeUsage": "none-rejected-monolithic-plate",
            },
            "infrastructureAtlas": {
                "repoPath": str(INFRASTRUCTURE_ATLAS_PATH.relative_to(REPO)).replace("\\", "/"),
                "sha256": infrastructure_atlas_hash,
                "dimensions": infrastructure_atlas_inspection["dimensions"],
                "placementIds": [
                    placement["id"] for placement in CITY_INFRASTRUCTURE_PLACEMENTS
                ],
            },
            "overviewSettlement": {
                "path": public_url(CITY_OVERVIEW_PATH),
                "sha256": sha256(CITY_OVERVIEW_PATH),
                "dimensions": list(settlement_overview.size),
                "lod": "territory-only",
                "containsTerrainPixels": False,
                "containsPopulation": False,
            },
            "contactLayer": {
                "path": public_url(CITY_FABRIC_CONTACT_PATH),
                "sha256": sha256(CITY_FABRIC_CONTACT_PATH),
                "dimensions": list(city_contact.size),
            },
            "underlay": {
                "path": public_url(CITY_FABRIC_UNDERLAY_PATH),
                "sha256": sha256(CITY_FABRIC_UNDERLAY_PATH),
                "dimensions": list(city_underlay.size),
            },
            "foreground": {
                "path": public_url(CITY_FABRIC_FOREGROUND_PATH),
                "sha256": sha256(CITY_FABRIC_FOREGROUND_PATH),
                "dimensions": list(city_foreground.size),
            },
            "environmentTransitionDetail": {
                "path": public_url(CITY_ENVIRONMENT_DETAIL_PATH),
                "sha256": sha256(CITY_ENVIRONMENT_DETAIL_PATH),
                "dimensions": list(city_environment_detail.size),
                "visualOnly": True,
                "affectsLandMask": False,
                "affectsHeight": False,
                "affectsSlope": False,
                "affectsCollision": False,
                "allowedFeatures": [
                    "cliff-face rock and moss",
                    "foliage and contact occlusion",
                    "retaining facias and drainage",
                    "bridge decks piers arches and rail-bed dressing where topology already supports them",
                ],
            },
            "replacementModel": {
                "replacedGenericBuildingCount": len(CITY_REPLACEMENT_SLOTS),
                "replacementSlotIds": [
                    record["replacementSlotId"] for record in manifest_nodes
                ],
                "retainedSupportSlots": list(CITY_RETAINED_SUPPORT_SLOTS),
                "rule": "independent skill buildings sit on sparse modular civic infrastructure; the rejected monolithic plate is never rendered",
            },
        },
        "populationScaleCues": {
            "status": "temporary-swappable-art-direction-layer",
            "role": "diegetic species-scale reference for city and building proportion",
            "affectsTerrain": False,
            "affectsBuildingGeometry": False,
            "source": {
                "repoPath": str(POPULATION_SOURCE_PATH.relative_to(REPO)).replace("\\", "/"),
                "sha256": population_source_hash,
                "generatedBackgroundWasCheckerboard": True,
            },
            "alphaAtlas": {
                "path": public_url(POPULATION_ATLAS_PATH),
                "sha256": sha256(POPULATION_ATLAS_PATH),
                "dimensions": inspect_image(POPULATION_ATLAS_PATH)["dimensions"],
            },
            "compositedLayer": {
                "path": public_url(POPULATION_LAYER_PATH),
                "sha256": sha256(POPULATION_LAYER_PATH),
                "dimensions": list(population_layer.size),
            },
            "siteLayer": {
                "path": public_url(POPULATION_SITE_LAYER_PATH),
                "sha256": sha256(POPULATION_SITE_LAYER_PATH),
                "dimensions": list(population_site_layer.size),
                "minimumDetailTier": "site",
                "cueCount": sum(
                    1
                    for record in population_records
                    if record["minimumDetailTier"] == "site"
                ),
            },
            "closeDetailLayer": {
                "path": public_url(POPULATION_CLOSE_LAYER_PATH),
                "sha256": sha256(POPULATION_CLOSE_LAYER_PATH),
                "dimensions": list(population_close_layer.size),
                "minimumDetailTier": "close",
                "cueCount": sum(
                    1
                    for record in population_records
                    if record["minimumDetailTier"] == "close"
                ),
            },
            "visibilityPolicy": {
                "world": [],
                "territory": [],
                "capital": [],
                "site": ["siteLayer"],
                "close": ["siteLayer", "closeDetailLayer"],
            },
            "registration": "identity-concept-master",
            "cues": population_records,
            "speciesScalePolicy": "building proportions may read as human elf dwarf gnome or orc scale without changing canonical terrain",
        },
        "nodes": manifest_nodes,
        "knownBlockers": [
            "B2/C1/C2 hydrology field hashes are pending; B1 use remains canonical-land-gated",
            "React, TanStack, and Tool Generation still need accepted animation loops",
            "AI / Agent Systems is provisional and still needs an accepted animation loop",
            "train production loop is not present",
        ],
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    detailed_rendered_skill_ids = build_preview(
        manifest_nodes,
        city_contact,
        city_underlay,
        city_foreground,
        city_environment_detail,
        rail_support,
        rail_bed,
        rail_track,
        population_layer,
    )
    build_settlement_overview_preview(settlement_overview)
    build_overlay(
        manifest_nodes,
        city_contact,
        city_underlay,
        city_environment_detail,
        rail_support,
        rail_bed,
        rail_track,
        population_layer,
    )
    build_city_fabric_slot_preview(
        manifest_nodes,
        city_contact,
        city_underlay,
        city_environment_detail,
        rail_support,
        rail_bed,
        rail_track,
        population_layer,
    )
    build_terrain_admission_overlay(manifest_nodes)
    build_comparison()

    rail_layer_paths = {
        "support": CITY_RAIL_SUPPORT_PATH,
        "bed": CITY_RAIL_BED_PATH,
        "track": CITY_RAIL_TRACK_PATH,
    }
    rail_layer_inspections = {
        layer_id: {
            **inspect_image(path),
            "path": public_url(path),
            "sha256": sha256(path),
        }
        for layer_id, path in rail_layer_paths.items()
    }
    city_layer_paths = {
        "overviewSettlement": CITY_OVERVIEW_PATH,
        "terrainContact": CITY_FABRIC_CONTACT_PATH,
        "underlay": CITY_FABRIC_UNDERLAY_PATH,
        "foreground": CITY_FABRIC_FOREGROUND_PATH,
        "environmentTransitionDetail": CITY_ENVIRONMENT_DETAIL_PATH,
    }
    city_layer_inspections = {
        layer_id: {
            **inspect_image(path),
            "path": public_url(path),
            "sha256": sha256(path),
        }
        for layer_id, path in city_layer_paths.items()
    }
    population_atlas_inspection = inspect_image(POPULATION_ATLAS_PATH)
    population_site_layer_inspection = inspect_image(POPULATION_SITE_LAYER_PATH)
    population_close_layer_inspection = inspect_image(POPULATION_CLOSE_LAYER_PATH)
    population_layer_inspection = inspect_image(POPULATION_LAYER_PATH)
    rail_gateway = manifest["transport"]["rail"]["gatewayLocalPosition"]
    rail_gateway_matches_node = any(
        math.hypot(
            record["localPosition"]["x"] - rail_gateway["x"],
            record["localPosition"]["y"] - rail_gateway["y"],
        ) < 1e-6
        for record in manifest_nodes
    )
    qa_paths = {
        "preview": PREVIEW_PATH,
        "territoryOverviewPreview": CITY_OVERVIEW_PREVIEW_PATH,
        "placementOverlay": OVERLAY_PATH,
        "referenceComparison": COMPARISON_PATH,
        "terrainAdmissionOverlay": TERRAIN_ADMISSION_OVERLAY_PATH,
        "cityFabricReplacementSlots": CITY_FABRIC_PREVIEW_PATH,
        "cityFabricConnectivity": CITY_FABRIC_CONNECTIVITY_QA_PATH,
        "golangAlphaBackgrounds": GO_ALPHA_QA_PATH,
    }
    expected_skill_ids = {record["skillId"] for record in manifest_nodes}
    detailed_rendered_skill_id_set = set(detailed_rendered_skill_ids)
    territory_rendered_skill_id_set = set(territory_rendered_skill_ids)
    visibly_placed_skill_ids = sorted(
        detailed_rendered_skill_id_set & territory_rendered_skill_id_set
    )

    validation = {
        "schemaVersion": 1,
        "manifest": public_url(MANIFEST_PATH),
        "manifestSha256": sha256(MANIFEST_PATH),
        "nodeCount": len(manifest_nodes),
        "districtCount": len(DISTRICTS),
        "animatedMasterCount": sum(
            record["renderMode"] == "animated-master" for record in manifest_nodes
        ),
        "semanticLayerNodeCount": sum(
            record["renderMode"] == "semantic-layers" for record in manifest_nodes
        ),
        "staticNodeCount": sum(
            record["renderMode"] == "static" for record in manifest_nodes
        ),
        "assetNodeReadyCount": sum(record["assetNodeReady"] for record in manifest_nodes),
        "visiblyPlacedNodeCount": len(visibly_placed_skill_ids),
        "visiblyPlacedSkillIds": visibly_placed_skill_ids,
        "detailedRenderedSkillIds": detailed_rendered_skill_ids,
        "territoryRenderedSkillIds": territory_rendered_skill_ids,
        "alphaBlockers": alpha_blockers,
        "golangAlphaRecovery": golang_alpha_inspection,
        "assetHashMismatches": asset_hash_mismatches,
        "footprintOverlaps": overlaps,
        "globalAuthorityHashMismatches": global_authority_mismatches,
        "regionalTerrainHashMatch": regional_terrain_hash == EXPECTED_REGIONAL_TERRAIN_SHA256,
        "terrainAdmissionFailures": terrain_admission_failures,
        "referenceHashMatch": sha256(REFERENCE_PATH) == EXPECTED_REFERENCE_SHA256,
        "stationHashMatch": sha256(STATION_PATH) == EXPECTED_STATION_SHA256,
        "cityFabricSourceHashMatch": (
            city_fabric_source_hash == EXPECTED_CITY_FABRIC_SOURCE_SHA256
        ),
        "cityCirculationSourceHashMatch": (
            city_circulation_source_hash == EXPECTED_CITY_CIRCULATION_SOURCE_SHA256
        ),
        "infrastructureAtlasHashMatch": (
            infrastructure_atlas_hash == EXPECTED_INFRASTRUCTURE_ATLAS_SHA256
        ),
        "railSegmentAtlasHashMatch": (
            rail_segment_atlas_hash == EXPECTED_RAIL_SEGMENT_ATLAS_SHA256
        ),
        "infrastructurePlacementCount": len(CITY_INFRASTRUCTURE_PLACEMENTS),
        "cityFabricConnectivity": city_fabric_connectivity,
        "replacementSlotCount": len(CITY_REPLACEMENT_SLOTS),
        "retainedSupportSlotCount": len(CITY_RETAINED_SUPPORT_SLOTS),
        "trainAndStationIndependent": (
            manifest["transport"]["station"]["ownsTrain"] is False
            and manifest["transport"]["station"]["ownsTrack"] is False
            and manifest["transport"]["train"]["bakedIntoCityPlate"] is False
        ),
        "railExit": {
            "renderMethod": manifest["transport"]["rail"]["renderMethod"],
            "screenSpaceRibbonForbidden": manifest["transport"]["rail"]["screenSpaceRibbonForbidden"],
            "segmentCount": len(manifest["transport"]["rail"]["segments"]),
            "segmentJoinCount": len(manifest["transport"]["rail"]["segmentJoins"]),
            "minimumConsecutiveJoinOverlapPixels": min(
                join["alphaOverlapPixels"]
                for join in manifest["transport"]["rail"]["segmentJoins"]
            ),
            "scaleReference": manifest["transport"]["rail"]["scaleReference"],
            "segmentAtlas": rail_segment_alpha_inspection,
            "direction": manifest["transport"]["rail"]["exitDirection"],
            "entryDirection": manifest["transport"]["rail"]["entryDirection"],
            "offCapitalEntry": manifest["transport"]["rail"]["offCapitalEntry"],
            "offCapitalEndpoint": manifest["transport"]["rail"]["offCapitalEndpoint"],
            "terminatesAtBuilding": manifest["transport"]["rail"]["terminatesAtBuilding"],
            "gatewayMatchesBuildingNode": rail_gateway_matches_node,
            "lastControlPoint": manifest["transport"]["rail"]["controlPoints"][-1],
            "firstControlPoint": manifest["transport"]["rail"]["controlPoints"][0],
            "stationLocalPosition": manifest["transport"]["rail"]["stationLocalPosition"],
            "stationTrackCenterLocalPosition": manifest["transport"]["rail"]["stationTrackCenterLocalPosition"],
            "minimumStationControlPointDistance": min(
                math.hypot(
                    point["x"] - manifest["transport"]["rail"]["stationTrackCenterLocalPosition"]["x"],
                    point["y"] - manifest["transport"]["rail"]["stationTrackCenterLocalPosition"]["y"],
                )
                for point in manifest["transport"]["rail"]["controlPoints"]
            ),
            "layers": rail_layer_inspections,
        },
        "cityFabricLayers": city_layer_inspections,
        "populationScaleCues": {
            "cueCount": len(population_records),
            "siteCueCount": sum(
                record["minimumDetailTier"] == "site"
                for record in population_records
            ),
            "closeSupplementCueCount": sum(
                record["minimumDetailTier"] == "close"
                for record in population_records
            ),
            "species": sorted({record["species"] for record in population_records}),
            "siteSpecies": sorted({
                record["species"]
                for record in population_records
                if record["minimumDetailTier"] == "site"
            }),
            "closeSupplementSpecies": sorted({
                record["species"]
                for record in population_records
                if record["minimumDetailTier"] == "close"
            }),
            "identityConceptRegistration": all(
                record["registration"] == "identity-concept-master"
                and record["conceptPosition"] == record["localPosition"]
                for record in population_records
            ),
            "sourceHashMatch": population_source_hash == EXPECTED_POPULATION_SOURCE_SHA256,
            "alphaAtlas": {
                **population_atlas_inspection,
                "path": public_url(POPULATION_ATLAS_PATH),
                "sha256": sha256(POPULATION_ATLAS_PATH),
                "transparentRgbUnderZeroAlpha": transparent_rgb_under_zero_alpha(
                    POPULATION_ATLAS_PATH
                ),
            },
            "compositedLayer": {
                **population_layer_inspection,
                "path": public_url(POPULATION_LAYER_PATH),
                "sha256": sha256(POPULATION_LAYER_PATH),
                "transparentRgbUnderZeroAlpha": transparent_rgb_under_zero_alpha(
                    POPULATION_LAYER_PATH
                ),
            },
            "siteLayer": {
                **population_site_layer_inspection,
                "path": public_url(POPULATION_SITE_LAYER_PATH),
                "sha256": sha256(POPULATION_SITE_LAYER_PATH),
                "transparentRgbUnderZeroAlpha": transparent_rgb_under_zero_alpha(
                    POPULATION_SITE_LAYER_PATH
                ),
            },
            "closeDetailLayer": {
                **population_close_layer_inspection,
                "path": public_url(POPULATION_CLOSE_LAYER_PATH),
                "sha256": sha256(POPULATION_CLOSE_LAYER_PATH),
                "transparentRgbUnderZeroAlpha": transparent_rgb_under_zero_alpha(
                    POPULATION_CLOSE_LAYER_PATH
                ),
            },
        },
        "terrainBindingBlocked": manifest["terrainBinding"]["status"].startswith("blocked"),
        **{
            qa_id: {
                "path": public_url(path),
                "sha256": sha256(path),
                "dimensions": inspect_image(path)["dimensions"],
            }
            for qa_id, path in qa_paths.items()
        },
        "productionReady": False,
        "runtimeEligible": False,
    }
    VALIDATION_PATH.write_text(
        json.dumps(validation, indent=2) + "\n", encoding="utf-8"
    )

    if len(manifest_nodes) != 19:
        raise RuntimeError("Expected 19 stable skill-building slots.")
    if len(CITY_REPLACEMENT_SLOTS) != 19:
        raise RuntimeError("Expected exactly 19 generic-building replacement slots.")
    if len({record["skillId"] for record in manifest_nodes}) != 19:
        raise RuntimeError("Skill IDs are not unique.")
    if asset_hash_mismatches:
        raise RuntimeError(f"Asset hash mismatches: {asset_hash_mismatches}")
    if validation["infrastructureAtlasHashMatch"] is not True:
        raise RuntimeError("The modular infrastructure atlas drifted.")
    if validation["railSegmentAtlasHashMatch"] is not True:
        raise RuntimeError("The authored isometric rail segment atlas drifted.")
    if alpha_blockers:
        raise RuntimeError(f"Unexpected alpha blockers: {alpha_blockers}")
    if validation["assetNodeReadyCount"] != 19:
        raise RuntimeError(
            f"Expected all 19 skill assets ready; got {validation['assetNodeReadyCount']}."
        )
    if (
        detailed_rendered_skill_id_set != expected_skill_ids
        or territory_rendered_skill_id_set != expected_skill_ids
    ):
        raise RuntimeError(
            "Detailed and territory previews must each render all 19 skill buildings."
        )
    if validation["globalAuthorityHashMismatches"]:
        raise RuntimeError("A frozen global land authority drifted.")
    if not validation["regionalTerrainHashMatch"]:
        raise RuntimeError("The frozen regional terrain authority drifted.")
    if overlaps:
        raise RuntimeError(f"Planning footprints overlap: {overlaps}")
    if terrain_admission_failures:
        raise RuntimeError(f"Terrain admission failures: {terrain_admission_failures}")
    if not validation["trainAndStationIndependent"]:
        raise RuntimeError("Train/station layer independence failed.")
    if (
        validation["railExit"]["direction"] != "south-southeast"
        or validation["railExit"]["entryDirection"] != "station-terminal"
        or validation["railExit"]["offCapitalEntry"] is not False
        or validation["railExit"]["offCapitalEndpoint"] is not True
        or validation["railExit"]["terminatesAtBuilding"] is not False
        or validation["railExit"]["gatewayMatchesBuildingNode"] is not False
        or validation["railExit"]["lastControlPoint"]["y"] <= 1
    ):
        raise RuntimeError("Territory rail does not leave the capital independently.")
    if validation["railExit"]["minimumStationControlPointDistance"] > 0.02:
        raise RuntimeError("Territory rail does not pass through the station.")
    if (
        validation["railExit"]["renderMethod"] != "authored-isometric-segment-chain"
        or validation["railExit"]["screenSpaceRibbonForbidden"] is not True
        or validation["railExit"]["segmentCount"] != len(RAIL_SEGMENT_CHAIN)
        or validation["railExit"]["segmentJoinCount"] != len(RAIL_SEGMENT_CHAIN) - 1
        or validation["railExit"]["minimumConsecutiveJoinOverlapPixels"] <= 0
        or any(segment["rotationDegrees"] != 0 for segment in manifest["transport"]["rail"]["segments"])
        or validation["railExit"]["segmentAtlas"]["mode"] != "RGBA"
        or validation["railExit"]["segmentAtlas"]["maximumCornerAlpha"] != 0
        or validation["railExit"]["segmentAtlas"]["transparentRgbUnderZeroAlpha"] != 0
    ):
        raise RuntimeError("Perspective-correct authored rail segment contract failed.")
    if any(
        inspection["dimensions"] != list(ARTBOARD)
        or inspection["maximumCornerAlpha"] != 0
        for inspection in rail_layer_inspections.values()
    ):
        raise RuntimeError("Territory rail layer registration or alpha drifted.")
    if any(
        inspection["dimensions"] != list(ARTBOARD)
        for inspection in city_layer_inspections.values()
    ):
        raise RuntimeError("City fabric layer registration drifted.")
    if city_layer_inspections["overviewSettlement"]["maximumCornerAlpha"] != 0:
        raise RuntimeError("Territory settlement overview owns opaque corner pixels.")
    if (
        validation["populationScaleCues"]["cueCount"] != len(POPULATION_CUES)
        or validation["populationScaleCues"]["siteCueCount"] != 8
        or validation["populationScaleCues"]["closeSupplementCueCount"] != 8
        or validation["populationScaleCues"]["species"]
        != ["dwarf", "elf", "gnome", "human", "orc"]
        or validation["populationScaleCues"]["siteSpecies"]
        != ["dwarf", "elf", "gnome", "human", "orc"]
        or validation["populationScaleCues"]["closeSupplementSpecies"]
        != ["dwarf", "elf", "gnome", "human", "orc"]
        or validation["populationScaleCues"]["identityConceptRegistration"] is not True
        or validation["populationScaleCues"]["sourceHashMatch"] is not True
        or validation["populationScaleCues"]["alphaAtlas"]["mode"] != "RGBA"
        or validation["populationScaleCues"]["alphaAtlas"]["maximumCornerAlpha"] != 0
        or validation["populationScaleCues"]["alphaAtlas"]["transparentRgbUnderZeroAlpha"] != 0
        or validation["populationScaleCues"]["compositedLayer"]["mode"] != "RGBA"
        or validation["populationScaleCues"]["compositedLayer"]["maximumCornerAlpha"] != 0
        or validation["populationScaleCues"]["compositedLayer"]["transparentRgbUnderZeroAlpha"] != 0
        or validation["populationScaleCues"]["siteLayer"]["mode"] != "RGBA"
        or validation["populationScaleCues"]["siteLayer"]["maximumCornerAlpha"] != 0
        or validation["populationScaleCues"]["siteLayer"]["transparentRgbUnderZeroAlpha"] != 0
        or validation["populationScaleCues"]["closeDetailLayer"]["mode"] != "RGBA"
        or validation["populationScaleCues"]["closeDetailLayer"]["maximumCornerAlpha"] != 0
        or validation["populationScaleCues"]["closeDetailLayer"]["transparentRgbUnderZeroAlpha"] != 0
    ):
        raise RuntimeError("Temporary fantasy population alpha or scale-cue contract failed.")
    if validation["preview"]["dimensions"] != list(ARTBOARD):
        raise RuntimeError("Preview dimensions drifted.")

    print(json.dumps(validation, indent=2))


if __name__ == "__main__":
    main()
