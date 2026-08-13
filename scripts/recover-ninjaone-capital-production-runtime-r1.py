from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter


REPO = Path(__file__).resolve().parents[1]
PUBLIC = REPO / "public"
CITY_ROOT = PUBLIC / "career-world/capitals/ninjaone/city-r1"
FABRIC_ROOT = CITY_ROOT / "fabric"
QA_ROOT = CITY_ROOT / "qa"
MANIFEST_PATH = (
    PUBLIC / "career-world/capitals/ninjaone/manifests/city-node-composition-r1.json"
)
LAYOUT_PATH = (
    REPO
    / "art-source/career-world/ninjaone-capital/city-layer-r1/"
    "concept-master-layout-registration-r1.json"
)
TERRAIN_PATH = (
    REPO
    / "art-source/career-world/ninjaone-environment/production-r2/"
    "ninjaone-environment-terrain-master-detail-r2.png"
)
WATER_MANIFEST_PATH = (
    PUBLIC / "career-world/capitals/ninjaone/environment/manifests/inland-water-r1.json"
)
CITY_CIRCULATION_SOURCE_PATH = (
    REPO
    / "art-source/career-world/ninjaone-capital/city-layer-r1/city-fabric/"
    "city-circulation-infill-alpha-r7.png"
)
RAIL_PORTAL_ATLAS_PATH = (
    REPO
    / "art-source/career-world/ninjaone-capital/city-layer-r1/transport/"
    "city-rail-vehicle-portal-atlas-alpha-r1.png"
)
RAIL_SEGMENT_ATLAS_PATH = (
    FABRIC_ROOT / "rail-perspective-segment-atlas-alpha-r1.png"
)
RAIL_TRACK_PATH = FABRIC_ROOT / "city-rail-mountain-route-track-r1.png"
RAIL_SUPPORT_PATH = FABRIC_ROOT / "city-rail-mountain-route-support-r1.png"
RAIL_BED_PATH = FABRIC_ROOT / "city-rail-mountain-route-bed-r1.png"
RAIL_PORTAL_BACK_PATH = FABRIC_ROOT / "city-rail-tunnel-backs-r1.png"
RAIL_PORTAL_FOREGROUND_PATH = FABRIC_ROOT / "city-rail-tunnel-foreground-r1.png"
RAIL_STATION_FOREGROUND_PATH = FABRIC_ROOT / "city-rail-station-platform-track-r1.png"

CITY_CIRCULATION_PATH = FABRIC_ROOT / "city-production-circulation-r1.png"
CITY_TRANSITION_PATH = FABRIC_ROOT / "city-production-transition-detail-r1.png"
CITY_BRIDGES_PATH = FABRIC_ROOT / "city-production-bridges-r3.png"
CITY_BRIDGE_TRANSITION_PATH = (
    FABRIC_ROOT / "city-production-bridge-transition-r2.png"
)
BRIDGE_VALIDATION_PATH = QA_ROOT / "city-production-bridges-r3.validation.json"
BUILDING_SCALE_DATA_PATH = QA_ROOT / "city-building-environment-scale-r1.json"
BUILDING_SCALE_VALIDATION_PATH = (
    QA_ROOT / "city-building-environment-scale-r1.validation.json"
)
QA_PROOF_PATH = QA_ROOT / "city-production-runtime-proof-r1.png"
QA_REFERENCE_PATH = QA_ROOT / "city-production-reference-comparison-r1.png"
VALIDATION_PATH = QA_ROOT / "city-production-runtime-r1.validation.json"
NODE_VALIDATION_PATH = QA_ROOT / "city-node-composition-r1.validation.json"

ARTBOARD = (2571, 1929)
EXPECTED_LAYOUT_ID = (
    "career-world/ninjaone-capital/concept-master-layout-registration@r1"
)
EXPECTED_TERRAIN_SHA256 = (
    "49142b55478362e85a02e14345859089a78bd01b49a3126d84ff1df7cb283b02"
)

# The authored road/terrace fabric is production circulation artwork, not the
# concept plate. Register it compactly and bind independent buildings to its
# actual sockets. This preserves connected paths, retaining walls, stairs, and
# plazas without baking any skill building or terrain into the live layer.
CITY_FABRIC_SCALE = 0.56
CITY_FABRIC_OFFSET = (0.19, 0.12)
CITY_SOURCE_NODE_POSITIONS: dict[str, tuple[float, float]] = {
    "ai-agent-systems": (0.4448, 0.1142),
    "mcp": (0.2693, 0.2680),
    "openapi-swagger": (0.5711, 0.2726),
    "grpc-rest": (0.2003, 0.3748),
    "capability-contracts": (0.4931, 0.3591),
    "tool-generation": (0.4717, 0.2744),
    "typescript": (0.3135, 0.4438),
    "react": (0.7762, 0.5046),
    "tanstack": (0.5525, 0.4199),
    "golang": (0.7977, 0.6041),
    "csharp": (0.1098, 0.4926),
    "python": (0.3384, 0.1980),
    "postgresql": (0.2465, 0.5313),
    "redis": (0.8667, 0.7634),
    "aws": (0.7742, 0.6952),
    "databricks": (0.6637, 0.8297),
    "docker": (0.7597, 0.8821),
    "vmware": (0.5663, 0.8785),
    "macstadium": (0.3695, 0.6796),
}


def fabric_position(position: tuple[float, float]) -> tuple[float, float]:
    return (
        CITY_FABRIC_OFFSET[0] + position[0] * CITY_FABRIC_SCALE,
        CITY_FABRIC_OFFSET[1] + position[1] * CITY_FABRIC_SCALE,
    )


CITY_NODE_POSITIONS = {
    skill_id: fabric_position(position)
    for skill_id, position in CITY_SOURCE_NODE_POSITIONS.items()
}
STATION_SOURCE_POSITION = (0.4213, 0.4788)
STATION_LOCAL_POSITION = fabric_position(STATION_SOURCE_POSITION)

SCALE_CLASS_VISIBLE_HEIGHTS = {
    # The primary node intentionally overhangs its narrow cliff socket. Its
    # opaque authored base hides the unsupported sliver without changing land.
    "citadel": 228,
    "major": 130,
    "standard": 108,
}

RAIL_ROUTE_POINTS: tuple[tuple[float, float], ...] = (
    (0.360, 0.347),
    (0.384, 0.361),
    (0.408, 0.375),
    (0.432, 0.390),
    (0.456, 0.404),
    (0.480, 0.418),
    (0.504, 0.433),
    (0.528, 0.447),
    (0.552, 0.461),
    (0.576, 0.475),
    (0.600, 0.490),
    (0.624, 0.504),
    (0.648, 0.518),
    (0.672, 0.532),
    (0.696, 0.547),
    (0.720, 0.561),
    (0.744, 0.575),
    (0.768, 0.589),
    (0.792, 0.604),
    (0.816, 0.618),
    (0.840, 0.632),
)

# Restore the previously proven continuous south-southeast route at the current
# compact-city registration. Every native-camera piece is precomposed into one
# raster; runtime never rotates or independently scales a segment. There is one
# station through-track, one mountain approach, and one future-network exit.
RAIL_SURFACE_CHAINS: tuple[tuple[dict[str, Any], ...], ...] = (tuple(
    {
        "id": (
            "northwest-mountain-portal-run"
            if index == 0
            else "station-through"
            if index == 3
            else "south-southeast-exit"
            if index == len(RAIL_ROUTE_POINTS) - 1
            else f"continuous-route-{index:02d}"
        ),
        "cell": (1, 1) if 8 <= index <= 11 else (0, 0),
        "conceptCenter": center,
        "displayWidth": 90 if 8 <= index <= 11 else 86,
        "kind": (
            "elevated-straight-nw-se"
            if 8 <= index <= 11
            else "ground-straight-nw-se"
        ),
    }
    for index, center in enumerate(RAIL_ROUTE_POINTS)
),)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def public_url(path: Path) -> str:
    return "/" + str(path.relative_to(PUBLIC)).replace("\\", "/")


def save_png(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f"{path.name}.tmp")
    image.save(temporary, format="PNG", optimize=True)
    temporary.replace(path)


def raster_record(path: Path) -> dict[str, Any]:
    with Image.open(path) as source:
        dimensions = list(source.size)
    if dimensions != list(ARTBOARD):
        raise RuntimeError(f"Wrong production layer dimensions: {path}")
    return {
        "path": public_url(path),
        "sha256": sha256(path),
        "dimensions": dimensions,
    }


def display_width_for_visible_height(
    image_path: Path,
    visible_height: int,
) -> int:
    """Scale by visible art, not the source canvas' transparent padding."""
    with Image.open(image_path) as source:
        image = source.convert("RGBA")
    bounds = image.getchannel("A").point(
        lambda value: 255 if value >= 8 else 0
    ).getbbox()
    if bounds is None:
        raise RuntimeError(f"Expected visible building pixels: {image_path}")
    visible_source_height = bounds[3] - bounds[1]
    return round(visible_height * image.width / visible_source_height)


def pixel(position: tuple[float, float] | list[float]) -> tuple[int, int]:
    return round(position[0] * ARTBOARD[0]), round(position[1] * ARTBOARD[1])


def trim_alpha(image: Image.Image, *, threshold: int = 8) -> Image.Image:
    bounds = image.getchannel("A").point(
        lambda value: 255 if value >= threshold else 0
    ).getbbox()
    if bounds is None:
        raise RuntimeError("Expected a visible component.")
    return image.crop(bounds)


def atlas_component(
    atlas: Image.Image,
    cell: tuple[int, int],
    *,
    cell_size: int = 512,
    inset: int = 8,
) -> Image.Image:
    x, y = cell
    return trim_alpha(
        atlas.crop(
            (
                x * cell_size + inset,
                y * cell_size + inset,
                (x + 1) * cell_size - inset,
                (y + 1) * cell_size - inset,
            )
        )
    )


def bridge_component(
    atlas: Image.Image,
    cell: tuple[int, int],
) -> Image.Image:
    cell_width = atlas.width // 2
    cell_height = atlas.height // 2
    x, y = cell
    return trim_alpha(
        atlas.crop(
            (
                x * cell_width,
                y * cell_height,
                (x + 1) * cell_width,
                (y + 1) * cell_height,
            )
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
    return trim_alpha(atlas.crop((left, top, right, bottom)))


def alpha_overlap_pixels(
    left: Image.Image,
    left_position: tuple[int, int],
    right: Image.Image,
    right_position: tuple[int, int],
    *,
    threshold: int = 16,
) -> int:
    overlap_left = max(left_position[0], right_position[0])
    overlap_top = max(left_position[1], right_position[1])
    overlap_right = min(left_position[0] + left.width, right_position[0] + right.width)
    overlap_bottom = min(left_position[1] + left.height, right_position[1] + right.height)
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
    left_contact = left_alpha.point(lambda value: 255 if value >= threshold else 0)
    right_contact = right_alpha.point(lambda value: 255 if value >= threshold else 0)
    return sum(ImageChops.multiply(left_contact, right_contact).histogram()[1:])


def tone_for_runtime(image: Image.Image, *, brightness: float = 0.78) -> Image.Image:
    alpha = image.getchannel("A")
    rgb = ImageEnhance.Color(image.convert("RGB")).enhance(0.82)
    rgb = ImageEnhance.Contrast(rgb).enhance(0.96)
    rgb = ImageEnhance.Brightness(rgb).enhance(brightness)
    toned = rgb.convert("RGBA")
    toned.putalpha(alpha)
    return toned


def place_centered(
    canvas: Image.Image,
    image: Image.Image,
    position: tuple[float, float] | list[float],
    display_width: int,
    *,
    ground_factor: float = 0.52,
    mirror: bool = False,
) -> tuple[int, int, int, int]:
    source = image.transpose(Image.Transpose.FLIP_LEFT_RIGHT) if mirror else image
    display_height = max(1, round(display_width * source.height / source.width))
    source = source.resize(
        (display_width, display_height),
        Image.Resampling.LANCZOS,
    )
    center = pixel(position)
    left = round(center[0] - display_width / 2)
    top = round(center[1] - display_height * ground_factor)
    canvas.alpha_composite(source, (left, top))
    return left, top, display_width, display_height


def sample_segment_centers(
    start: tuple[float, float],
    end: tuple[float, float],
    *,
    spacing: float,
) -> list[tuple[float, float]]:
    dx = (end[0] - start[0]) * ARTBOARD[0]
    dy = (end[1] - start[1]) * ARTBOARD[1]
    distance = max(1.0, (dx * dx + dy * dy) ** 0.5)
    count = max(1, round(distance / spacing))
    return [
        (
            start[0] + (end[0] - start[0]) * (index + 0.5) / count,
            start[1] + (end[1] - start[1]) * (index + 0.5) / count,
        )
        for index in range(count)
    ]


def isometric_elbow_candidates(
    start: tuple[float, float],
    end: tuple[float, float],
    *,
    screen_slope: float = 0.58,
) -> tuple[tuple[float, float], tuple[float, float]]:
    """Return the two fixed-camera elbows that join isometric road axes.

    The infrastructure atlas is authored for a single camera. Arbitrarily
    rotating its towers and curbs would visibly tilt them, so circulation is
    routed only along the atlas' two mirrored screen-space axes.
    """
    start_x = start[0] * ARTBOARD[0]
    start_y = start[1] * ARTBOARD[1]
    end_x = end[0] * ARTBOARD[0]
    end_y = end[1] * ARTBOARD[1]
    positive_x = (
        end_y - start_y + screen_slope * (start_x + end_x)
    ) / (2 * screen_slope)
    positive_y = start_y + screen_slope * (positive_x - start_x)
    negative_x = (
        start_y - end_y + screen_slope * (start_x + end_x)
    ) / (2 * screen_slope)
    negative_y = start_y - screen_slope * (negative_x - start_x)
    return (
        (positive_x / ARTBOARD[0], positive_y / ARTBOARD[1]),
        (negative_x / ARTBOARD[0], negative_y / ARTBOARD[1]),
    )


def route_water_score(
    start: tuple[float, float],
    elbow: tuple[float, float],
    end: tuple[float, float],
    water_mask: Image.Image,
) -> float:
    score = 0.0
    for coordinate in elbow:
        if coordinate < 0:
            score += abs(coordinate) * 20_000
        elif coordinate > 1:
            score += (coordinate - 1) * 20_000
    for leg_start, leg_end in ((start, elbow), (elbow, end)):
        for sample in sample_segment_centers(leg_start, leg_end, spacing=48):
            x, y = pixel(sample)
            if 0 <= x < ARTBOARD[0] and 0 <= y < ARTBOARD[1]:
                score += 1 if water_mask.getpixel((x, y)) >= 128 else 0
    midpoint = ((start[0] + end[0]) / 2, (start[1] + end[1]) / 2)
    score += abs(elbow[0] - midpoint[0]) + abs(elbow[1] - midpoint[1])
    return score


def build_water_mask() -> Image.Image:
    manifest = json.loads(WATER_MANIFEST_PATH.read_text(encoding="utf-8"))
    if (
        manifest["id"] != "career-world/capitals/ninjaone/inland-water@r1"
        or manifest["status"] != "production-runtime"
    ):
        raise RuntimeError("Unexpected inland-water authority.")
    field_record = manifest["field"]
    ownership_record = manifest["terrainEraseMask"]
    field_path = PUBLIC / field_record["path"].lstrip("/")
    ownership_path = PUBLIC / ownership_record["path"].lstrip("/")
    if sha256(field_path).upper() != field_record["sha256"].upper():
        raise RuntimeError("Water field hash drift.")
    if sha256(ownership_path).upper() != ownership_record["sha256"].upper():
        raise RuntimeError("Water ownership hash drift.")
    with Image.open(field_path) as source:
        field = source.convert("RGBA").getchannel("R")
    with Image.open(ownership_path) as source:
        ownership = source.convert("RGBA").getchannel("R")
    field = field.resize(ownership.size, Image.Resampling.BILINEAR)
    owned = ImageChops.multiply(
        field.point(lambda value: 255 if value >= 128 else 0),
        ownership.point(lambda value: 255 if value >= 8 else 0),
    )
    full = Image.new("L", tuple(field_record["artboardDimensions"]), 0)
    crop = field_record["artboardCrop"]
    full.paste(owned, (crop[0], crop[1]))
    return full.resize(ARTBOARD, Image.Resampling.LANCZOS).point(
        lambda value: 255 if value >= 96 else 0
    )


def sample_smooth_route(
    points: tuple[tuple[float, float], ...],
    *,
    samples_per_span: int = 18,
) -> list[tuple[float, float]]:
    """Sample a Catmull-Rom route in artboard pixel space.

    Interpolation in pixel space matters because the normalized artboard axes
    have different lengths. The curve passes every registered control point
    while preserving a continuous tangent at span boundaries.
    """
    pixel_points = [
        (point[0] * ARTBOARD[0], point[1] * ARTBOARD[1])
        for point in points
    ]
    # Extrapolate the endpoint tangents. Repeating the endpoints creates an
    # artificial zero-length tangent and a sharp first/last sampled turn even
    # when the registered route itself is smooth.
    before_start = (
        2 * pixel_points[0][0] - pixel_points[1][0],
        2 * pixel_points[0][1] - pixel_points[1][1],
    )
    after_end = (
        2 * pixel_points[-1][0] - pixel_points[-2][0],
        2 * pixel_points[-1][1] - pixel_points[-2][1],
    )
    padded = [before_start, *pixel_points, after_end]
    sampled: list[tuple[float, float]] = []
    for span in range(1, len(padded) - 2):
        p0, p1, p2, p3 = padded[span - 1: span + 3]
        for step in range(samples_per_span):
            t = step / samples_per_span
            t2 = t * t
            t3 = t2 * t
            x = 0.5 * (
                2 * p1[0]
                + (-p0[0] + p2[0]) * t
                + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2
                + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3
            )
            y = 0.5 * (
                2 * p1[1]
                + (-p0[1] + p2[1]) * t
                + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2
                + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3
            )
            sampled.append((x / ARTBOARD[0], y / ARTBOARD[1]))
    sampled.append(points[-1])
    return sampled


def offset_route(
    points: list[tuple[float, float]],
    offset_pixels: float,
) -> list[tuple[int, int]]:
    result: list[tuple[int, int]] = []
    for index, point in enumerate(points):
        before = points[max(0, index - 1)]
        after = points[min(len(points) - 1, index + 1)]
        tangent_x = (after[0] - before[0]) * ARTBOARD[0]
        tangent_y = (after[1] - before[1]) * ARTBOARD[1]
        length = max(1.0, (tangent_x * tangent_x + tangent_y * tangent_y) ** 0.5)
        normal_x = -tangent_y / length
        normal_y = tangent_x / length
        center_x, center_y = pixel(point)
        result.append(
            (
                round(center_x + normal_x * offset_pixels),
                round(center_y + normal_y * offset_pixels),
            )
        )
    return result


def build_continuous_rail_layers(
    layout: dict[str, Any],
) -> tuple[Image.Image, Image.Image, Image.Image, Image.Image, Image.Image, Image.Image, dict[str, Any]]:
    """Precompose the authored rail kit into one LOD-stable through-route."""
    sampled = sample_smooth_route(RAIL_ROUTE_POINTS)
    support = Image.new("RGBA", ARTBOARD, (0, 0, 0, 0))
    bed = Image.new("RGBA", ARTBOARD, (0, 0, 0, 0))
    track = Image.new("RGBA", ARTBOARD, (0, 0, 0, 0))
    portal_back = Image.new("RGBA", ARTBOARD, (0, 0, 0, 0))
    portal_foreground = Image.new("RGBA", ARTBOARD, (0, 0, 0, 0))
    station_foreground = Image.new("RGBA", ARTBOARD, (0, 0, 0, 0))

    with Image.open(RAIL_SEGMENT_ATLAS_PATH) as source:
        segment_atlas = source.convert("RGBA")
    ground_alpha = Image.new("L", ARTBOARD, 0)
    elevated_alpha = Image.new("L", ARTBOARD, 0)
    placements: list[dict[str, Any]] = []
    joins: list[dict[str, Any]] = []
    for chain_index, chain in enumerate(RAIL_SURFACE_CHAINS):
        previous: tuple[dict[str, Any], Image.Image, tuple[int, int]] | None = None
        for segment in chain:
            component = tone_for_runtime(
                rail_segment_component(segment_atlas, segment["cell"]),
                brightness=0.84,
            )
            display_width = segment["displayWidth"]
            display_height = round(display_width * component.height / component.width)
            component = component.resize((display_width, display_height), Image.Resampling.LANCZOS)
            center = pixel(segment["conceptCenter"])
            position = (round(center[0] - component.width / 2), round(center[1] - component.height / 2))
            if previous is not None:
                previous_segment, previous_component, previous_position = previous
                overlap = alpha_overlap_pixels(previous_component, previous_position, component, position)
                if overlap <= 0:
                    raise RuntimeError(
                        "Authored rail segments do not physically join: "
                        f"{previous_segment['id']} -> {segment['id']}"
                    )
                joins.append({
                    "from": previous_segment["id"],
                    "to": segment["id"],
                    "alphaOverlapPixels": overlap,
                })
            track.alpha_composite(component, position)
            world_alpha = Image.new("L", ARTBOARD, 0)
            world_alpha.paste(component.getchannel("A"), position)
            if segment["kind"].startswith("elevated-"):
                elevated_alpha = ImageChops.lighter(elevated_alpha, world_alpha)
            else:
                ground_alpha = ImageChops.lighter(ground_alpha, world_alpha)
            placements.append({
                "id": segment["id"],
                "chainIndex": chain_index,
                "sourceCell": list(segment["cell"]),
                "conceptCenter": list(segment["conceptCenter"]),
                "displayWidth": display_width,
                "displayHeight": display_height,
                "kind": segment["kind"],
                "rotationDegrees": 0,
                "placedBounds": [position[0], position[1], position[0] + component.width, position[1] + component.height],
            })
            previous = (segment, component, position)

    # Shadows/contact are silhouettes derived from the authored route, never a
    # second structural deck. This prevents the flat code-drawn ribbon seen at
    # site LOD while retaining terrain contact beneath ground and elevated rail.
    bed_alpha = ground_alpha.filter(ImageFilter.MaxFilter(13)).filter(ImageFilter.GaussianBlur(3.0))
    bed.putalpha(bed_alpha.point(lambda value: round(value * 0.20)))
    ground_shadow = ground_alpha.filter(ImageFilter.GaussianBlur(4.0)).point(lambda value: round(value * 0.14))
    elevated_shadow = elevated_alpha.filter(ImageFilter.GaussianBlur(6.0)).point(lambda value: round(value * 0.30))
    shifted_ground = Image.new("L", ARTBOARD, 0)
    shifted_ground.paste(ground_shadow, (3, 4))
    shifted_elevated = Image.new("L", ARTBOARD, 0)
    shifted_elevated.paste(elevated_shadow, (5, 8))
    support.putalpha(ImageChops.lighter(shifted_ground, shifted_elevated))

    # The source atlas is 1254 square; crop by its actual half-cell bounds.
    # Inset margins prevent neighboring locomotive/platform pixels leaking in.
    with Image.open(RAIL_PORTAL_ATLAS_PATH) as source:
        portal_atlas = source.convert("RGBA")
    split_x = portal_atlas.width // 2
    split_y = portal_atlas.height // 2
    portal_components = {
        "northwest-mountain-portal": trim_alpha(
            portal_atlas.crop((split_x + 8, 0, portal_atlas.width, split_y - 8))
        ),
    }
    portal_positions = {
        "northwest-mountain-portal": RAIL_ROUTE_POINTS[0],
    }
    portal_records: list[dict[str, Any]] = []
    for portal_id, component in portal_components.items():
        portal_position = portal_positions[portal_id]
        target_width = 86
        bounds = place_centered(
            portal_foreground,
            tone_for_runtime(component, brightness=0.76),
            portal_position,
            target_width,
            ground_factor=0.68,
            mirror=False,
        )
        center_x, center_y = pixel(portal_position)
        ImageDraw.Draw(portal_back).ellipse(
            (center_x - 30, center_y - 50, center_x + 30, center_y + 15),
            fill=(2, 7, 8, 252),
        )
        portal_records.append({"id": portal_id, "bounds": list(bounds)})

    # The station foreground owns no extra geometry; it only raises the exact
    # authored route pixels already passing beneath the independent station.
    station_mask = Image.new("L", ARTBOARD, 0)
    station_x, station_y = pixel(STATION_LOCAL_POSITION)
    ImageDraw.Draw(station_mask).ellipse(
        (station_x - 112, station_y - 86, station_x + 96, station_y + 58),
        fill=255,
    )
    station_foreground = Image.composite(track, station_foreground, station_mask)

    tangent_errors: list[float] = []
    # Keep subpixel precision for curvature validation. Integer raster
    # quantization can turn two smooth 4px steps into a false 25-degree kink.
    full_centerline = [
        (point[0] * ARTBOARD[0], point[1] * ARTBOARD[1])
        for point in sampled
    ]
    for before, center, after in zip(full_centerline, full_centerline[1:], full_centerline[2:]):
        a = (center[0] - before[0], center[1] - before[1])
        b = (after[0] - center[0], after[1] - center[1])
        a_len = max(1.0, (a[0] * a[0] + a[1] * a[1]) ** 0.5)
        b_len = max(1.0, (b[0] * b[0] + b[1] * b[1]) ** 0.5)
        cosine = max(-1.0, min(1.0, (a[0] * b[0] + a[1] * b[1]) / (a_len * b_len)))
        tangent_errors.append(__import__("math").degrees(__import__("math").acos(cosine)))
    maximum_turn = max(tangent_errors, default=0.0)
    if maximum_turn > 24:
        raise RuntimeError(f"Rail route contains a train-unsafe local turn: {maximum_turn:.2f} degrees")

    interchange = {
        "id": "ninjaone-south-southeast-intercity-socket-r3",
        "localPosition": {"x": RAIL_ROUTE_POINTS[-1][0], "y": RAIL_ROUTE_POINTS[-1][1]},
        "tangent": {"x": 0.757, "y": 0.653},
        "gaugePixels": 14,
        "travelDirections": ["inbound", "outbound"],
        "connectionStatus": "reserved-for-future-city-network",
    }
    return support, bed, portal_back, track, portal_foreground, station_foreground, {
        "renderMethod": "lod-stable-authored-isometric-through-route-r3",
        "centerlineStatus": "single-continuous-station-to-south-southeast-route-r3",
        "controlPoints": [{"x": x, "y": y} for x, y in RAIL_ROUTE_POINTS],
        "maximumLocalTurnDegrees": round(maximum_turn, 3),
        "minimumCurveRadiusPixels": 150,
        "orphanTrackCount": 0,
        "supportDerivedFromCenterline": True,
        "stationTangentContinuous": True,
        "portalTangentContinuous": True,
        "segmentCount": len(placements),
        "segments": placements,
        "segmentJoins": joins,
        "runtimeScalePolicy": "one-precomposed-artboard-raster-all-visible-tiers",
        "interchangeSocket": interchange,
        "portalRecords": portal_records,
    }


def build_layers(
    layout: dict[str, Any],
    water_mask: Image.Image,
) -> tuple[Image.Image, Image.Image, Image.Image, Image.Image, list[dict[str, Any]]]:
    del layout
    with Image.open(CITY_CIRCULATION_SOURCE_PATH) as source:
        authored_source = source.convert("RGBA")
    registered_size = (
        round(ARTBOARD[0] * CITY_FABRIC_SCALE),
        round(ARTBOARD[1] * CITY_FABRIC_SCALE),
    )
    registered_offset = (
        round(ARTBOARD[0] * CITY_FABRIC_OFFSET[0]),
        round(ARTBOARD[1] * CITY_FABRIC_OFFSET[1]),
    )
    authored = authored_source.resize(registered_size, Image.Resampling.LANCZOS)
    authored_alpha = authored.getchannel("A")
    graded_rgb = ImageEnhance.Contrast(
        ImageEnhance.Brightness(
            ImageEnhance.Color(authored.convert("RGB")).enhance(0.72)
        ).enhance(0.88)
    ).enhance(1.02)
    authored = graded_rgb.convert("RGBA")
    authored.putalpha(authored_alpha)
    registered = Image.new("RGBA", ARTBOARD, (0, 0, 0, 0))
    registered.alpha_composite(authored, registered_offset)

    placement_records: list[dict[str, Any]] = [{
        "id": "compact-authored-city-circulation-r3",
        "role": "connected-production-circulation-authority",
        "sourceRepoPath": str(CITY_CIRCULATION_SOURCE_PATH.relative_to(REPO)).replace("\\", "/"),
        "registeredOffset": list(CITY_FABRIC_OFFSET),
        "registeredScale": CITY_FABRIC_SCALE,
        "containsBakedBuildings": True,
        "bakedBuildingScope": "generic-subordinate-urban-infill-only",
        "containsBakedSkillBuildings": False,
        "containsTerrainPixels": False,
        "currentHydrologyApertured": True,
    }]
    for skill_id, position in CITY_NODE_POSITIONS.items():
        placement_records.append({
            "id": f"{skill_id}-socket",
            "role": "authored-building-destination-socket",
            "localPosition": {"x": position[0], "y": position[1]},
        })
    placement_records.append({
        "id": "intercity-station-socket",
        "role": "authored-station-destination-socket",
        "localPosition": {"x": STATION_LOCAL_POSITION[0], "y": STATION_LOCAL_POSITION[1]},
    })

    # Use alpha-derived terrain-colored contact only; no opaque square pads.
    circulation_alpha = registered.getchannel("A")
    expanded = circulation_alpha.filter(ImageFilter.MaxFilter(25))
    expanded = expanded.filter(ImageFilter.GaussianBlur(5.0))
    edge = ImageChops.subtract(expanded, circulation_alpha)
    # The prior transition layers copied the entire frozen terrain RGB plane
    # behind a translucent edge mask. Browsers still decoded ~23 MB of duplicate
    # full-scene PNG data and the overlapping detail produced visible square/
    # blur patches. A neutral contact shadow supplies the same grounding with a
    # fraction of the payload and never duplicates terrain pixels.
    transition = Image.new("RGBA", ARTBOARD, (7, 11, 10, 0))
    transition.putalpha(edge.point(lambda value: round(value * 0.30)))

    # Current hydrology owns every wet pixel. Dedicated independent bridge
    # layers are the only infrastructure allowed over water.
    hard_water = water_mask.point(lambda value: 255 if value >= 128 else 0)
    dry = ImageChops.invert(hard_water)
    circulation = registered.copy()
    circulation.putalpha(ImageChops.multiply(circulation_alpha, dry))
    transition.putalpha(ImageChops.multiply(transition.getchannel("A"), dry))

    # Bridge structures have their own authored component authority. The old
    # recovery path split arbitrary circulation pixels around water and then
    # overwrote the context-fitted bridge output. That produced the giant,
    # wall-like stickers visible in the live scene. Recovery now consumes the
    # deterministic bridge-builder output and never synthesizes a competing
    # bridge layer.
    bridge_validation = json.loads(BRIDGE_VALIDATION_PATH.read_text(encoding="utf-8"))
    if not bridge_validation.get("passes"):
        raise RuntimeError("Authored production bridge validation is not green.")
    with Image.open(CITY_BRIDGES_PATH) as source:
        bridges = source.convert("RGBA")
    with Image.open(CITY_BRIDGE_TRANSITION_PATH) as source:
        bridge_transition = source.convert("RGBA")
    if bridges.size != ARTBOARD or bridge_transition.size != ARTBOARD:
        raise RuntimeError("Authored bridge layer dimensions drifted.")
    bridge_transition.putalpha(
        ImageChops.multiply(bridge_transition.getchannel("A"), dry)
    )
    return circulation, transition, bridge_transition, bridges, placement_records


def composite_registered_terrain(
    circulation: Image.Image,
    transition: Image.Image,
    bridge_transition: Image.Image,
    bridges: Image.Image,
    manifest: dict[str, Any],
) -> Image.Image:
    with Image.open(TERRAIN_PATH) as source:
        terrain = source.convert("RGBA").resize(ARTBOARD, Image.Resampling.LANCZOS)
    proof = terrain.copy()
    proof.alpha_composite(circulation)
    proof.alpha_composite(transition)
    proof.alpha_composite(bridge_transition)
    proof.alpha_composite(bridges)

    ordered_nodes = sorted(
        manifest["nodes"],
        key=lambda node: node["localPosition"]["y"] + node["zBias"] / ARTBOARD[1],
    )
    for node in ordered_nodes:
        with Image.open(PUBLIC / node["posterPath"].lstrip("/")) as source:
            poster = source.convert("RGBA")
        width = node["displayWidth"]
        height = round(width * poster.height / poster.width)
        poster = poster.resize((width, height), Image.Resampling.LANCZOS)
        anchor = pixel((node["localPosition"]["x"], node["localPosition"]["y"]))
        left = round(anchor[0] - width * node["groundAnchor"][0])
        top = round(anchor[1] - height * node["groundAnchor"][1])
        proof.alpha_composite(poster, (left, top))

    station = manifest["transport"]["station"]
    with Image.open(PUBLIC / station["path"].lstrip("/")) as source:
        station_asset = source.convert("RGBA")
    width = station["displayWidth"]
    height = round(width * station_asset.height / station_asset.width)
    station_asset = station_asset.resize((width, height), Image.Resampling.LANCZOS)
    anchor = pixel((station["localPosition"]["x"], station["localPosition"]["y"]))
    left = round(anchor[0] - width * station["groundAnchor"][0])
    top = round(anchor[1] - height * station["groundAnchor"][1])
    proof.alpha_composite(station_asset, (left, top))
    return proof


def main() -> None:
    if sha256(TERRAIN_PATH) != EXPECTED_TERRAIN_SHA256:
        raise RuntimeError("Frozen terrain authority drift.")
    layout = json.loads(LAYOUT_PATH.read_text(encoding="utf-8"))
    if layout["id"] != EXPECTED_LAYOUT_ID:
        raise RuntimeError("Unexpected registered layout authority.")
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    sockets = {socket["skillId"]: socket for socket in layout["skillSockets"]}
    if set(sockets) != {node["skillId"] for node in manifest["nodes"]}:
        raise RuntimeError("Skill-building socket identity drift.")
    building_scale_data = json.loads(
        BUILDING_SCALE_DATA_PATH.read_text(encoding="utf-8")
    )
    building_scale_validation = json.loads(
        BUILDING_SCALE_VALIDATION_PATH.read_text(encoding="utf-8")
    )
    building_scales = {
        record["skillId"]: record
        for record in building_scale_data["records"]
    }
    if (
        not building_scale_validation["passes"]
        or set(building_scales) != set(sockets)
        or building_scale_data["terrainAuthority"]["sha256"]
            != EXPECTED_TERRAIN_SHA256
    ):
        raise RuntimeError("Building environment-scale audit is not green.")

    water_mask = build_water_mask()
    (
        circulation,
        transition,
        bridge_transition,
        bridges,
        placement_records,
    ) = build_layers(
        layout,
        water_mask,
    )
    save_png(circulation, CITY_CIRCULATION_PATH)
    save_png(transition, CITY_TRANSITION_PATH)
    # These are inputs from the dedicated bridge builder. Do not overwrite
    # them here; save only the layers owned by this recovery pass.

    (
        rail_support,
        rail_bed,
        rail_portal_back,
        rail_track,
        rail_portal_foreground,
        rail_station_foreground,
        rail_recovery,
    ) = build_continuous_rail_layers(layout)
    save_png(rail_support, RAIL_SUPPORT_PATH)
    save_png(rail_bed, RAIL_BED_PATH)
    save_png(rail_portal_back, RAIL_PORTAL_BACK_PATH)
    save_png(rail_track, RAIL_TRACK_PATH)
    save_png(rail_portal_foreground, RAIL_PORTAL_FOREGROUND_PATH)
    save_png(rail_station_foreground, RAIL_STATION_FOREGROUND_PATH)

    for node in manifest["nodes"]:
        scale_record = building_scales[node["skillId"]]
        if node["skillId"] not in CITY_NODE_POSITIONS:
            raise RuntimeError(f"Missing compact city socket for {node['skillId']}.")
        source_position = node.get("sourceFabricPosition")
        terrain_nudge = node.get("terrainNudgePixels", [0, 0])
        node["localPosition"] = {
            "x": CITY_NODE_POSITIONS[node["skillId"]][0],
            "y": CITY_NODE_POSITIONS[node["skillId"]][1],
        }
        node["conceptPosition"] = dict(node["localPosition"])
        node["scaleClass"] = sockets[node["skillId"]]["scaleClass"]
        node["displayWidth"] = scale_record["displayWidth"]
        node["scaleAuthority"] = "individual-building-environment-proportion-r1"
        node["targetVisibleHeight"] = round(
            scale_record["visibleDisplaySize"][1]
        )
        node["scaleAudit"] = {
            "authority": building_scale_data["id"],
            "confidence": scale_record["confidence"],
            "hierarchyRole": scale_record["hierarchyRole"],
            "explicitOutlierException": scale_record["explicitOutlierException"],
        }
        node["terrainTransition"]["version"] = "compact-component-city-transition-r2"
        node["terrainTransition"]["source"] = (
            "infrastructure-transition-atlas-alpha-r2"
        )

    population = manifest["populationScaleCues"]
    for cue in population["cues"]:
        source_position = cue["sourceFabricPosition"]
        cue_position = fabric_position(
            (source_position["x"], source_position["y"])
        )
        cue["localPosition"] = {
            "x": cue_position[0],
            "y": cue_position[1],
        }
        cue["displayHeight"] = cue["sourceDisplayHeight"]
        cue["registration"] = "production-city-circulation-r1"
    population["registration"] = "production-city-circulation-r1"
    population["scaleAuthority"] = (
        "source-species-height-against-independent-building-assets-r2"
    )

    station = manifest["transport"]["station"]
    station["localPosition"] = {
        "x": STATION_LOCAL_POSITION[0],
        "y": STATION_LOCAL_POSITION[1],
    }
    station["displayWidth"] = 250

    rail = manifest["transport"]["rail"]
    rail.update({
        "renderMethod": rail_recovery["renderMethod"],
        "centerlineStatus": rail_recovery["centerlineStatus"],
        "controlPoints": rail_recovery["controlPoints"],
        "segments": rail_recovery["segments"],
        "segmentJoins": rail_recovery["segmentJoins"],
        "supportDerivedFromCenterline": True,
        "stationTangentContinuous": True,
        "portalTangentContinuous": True,
        "orphanTrackCount": 0,
        "minimumCurveRadiusPixels": rail_recovery["minimumCurveRadiusPixels"],
        "maximumLocalTurnDegrees": rail_recovery["maximumLocalTurnDegrees"],
        "interchangeSocket": rail_recovery["interchangeSocket"],
        "throughRoute": True,
        "futureNetworkReady": True,
    })
    for key, path in {
        "supportLayer": RAIL_SUPPORT_PATH,
        "bedLayer": RAIL_BED_PATH,
        "trackLayer": RAIL_TRACK_PATH,
        "portalBackLayer": RAIL_PORTAL_BACK_PATH,
        "portalForegroundLayer": RAIL_PORTAL_FOREGROUND_PATH,
        "stationForegroundLayer": RAIL_STATION_FOREGROUND_PATH,
    }.items():
        rail[key] = raster_record(path)

    city_fabric = manifest["cityFabric"]
    manifest["visualAuthority"] = {
        "goalReference": manifest["visualAuthority"]["goalReference"],
        "registeredTerrainBase": manifest["visualAuthority"]["registeredTerrainBase"],
        "productionCirculation": {
            "sourceRepoPath": str(
                CITY_CIRCULATION_SOURCE_PATH.relative_to(REPO)
            ).replace("\\", "/"),
            "sourceSha256": sha256(CITY_CIRCULATION_SOURCE_PATH),
            "role": "current hydrology-apertured city circulation authority",
            "isConceptReference": False,
            "containsSkillBuildings": False,
            "changesTerrainGeometry": False,
        },
        "requiredHierarchy": manifest["visualAuthority"]["requiredHierarchy"],
    }
    city_fabric["productionCirculation"] = {
        **raster_record(CITY_CIRCULATION_PATH),
        "runtimeVisible": True,
        "containsTerrainPixels": False,
        "containsBakedBuildings": True,
        "bakedBuildingScope": "generic-subordinate-urban-infill-only",
        "containsBakedSkillBuildings": False,
        "containsRailPixels": False,
        "minimumDetailTier": "capital",
        "source": "city-circulation-infill-alpha-r7-current-hydrology-aperture",
        "proceduralPadsOrCorridors": False,
    }
    city_fabric["productionTransitionDetail"] = {
        **raster_record(CITY_TRANSITION_PATH),
        "runtimeVisible": True,
        "containsTerrainPixels": False,
        "containsBakedBuildings": False,
        "containsWaterPixels": False,
        "minimumDetailTier": "capital",
        "source": "alpha-derived-dry-terrain-contact-r1",
    }
    city_fabric["productionBridgeTransition"] = {
        **raster_record(CITY_BRIDGE_TRANSITION_PATH),
        "runtimeVisible": True,
        "containsTerrainPixels": False,
        "containsBakedBuildings": False,
        "containsWaterPixels": False,
        "bridgeCount": 4,
        "minimumDetailTier": "capital",
        "source": "authored-circulation-water-contact-split-r3",
    }
    city_fabric["productionBridges"] = {
        **raster_record(CITY_BRIDGES_PATH),
        "runtimeVisible": True,
        "containsTerrainPixels": False,
        "containsBakedBuildings": False,
        "bridgeCount": "authored-network-crossings",
        "minimumDetailTier": "capital",
        "source": "authored-circulation-water-crossing-split-r3",
    }
    for legacy_key in (
        "activeCirculationSource",
        "connectivity",
        "sourceEvidence",
        "infrastructureAtlas",
        "overviewSettlement",
        "contactLayer",
        "waterTransition",
        "productionForeground",
        "productionSubstrate",
        "productionNodeForeground",
        "replacementModel",
    ):
        city_fabric.pop(legacy_key, None)
    city_fabric["runtimeAuthority"] = {
        "id": "career-world/ninjaone-capital/production-component-runtime@r1",
        "status": "recovery-baseline",
        "layoutReference": layout["id"],
        "layoutReferenceIsRuntimeRaster": False,
        "frozenTerrainGeometryUnchanged": True,
        "productionPixelSources": [
            "city-circulation-infill-alpha-r7-current-hydrology-aperture",
            "alpha-derived-dry-terrain-contact-r1",
            "city-production-bridges-r3",
            "city-production-bridge-transition-r2",
            "independent skill-building assets",
            "independent intercity station",
            "independent rail layers",
        ],
    }

    manifest["status"] = "production-component-recovery-baseline"
    manifest["productionReady"] = False
    manifest["runtimeEligible"] = True
    manifest["terrainBinding"]["status"] = (
        "frozen-terrain-live-water-production-component-recovery"
    )
    manifest["layerOrder"] = [
        "external-terrain",
        "inland-water",
        "production-city-circulation",
        "production-city-transition-detail",
        "production-bridge-transition",
        "registered-bridges",
        "single-centerline-transport-site-close",
        "building-ground-shadows",
        "skill-building-nodes",
        "temporary-population-site-scale-cues",
        "temporary-population-close-detail-cues",
    ]
    manifest["knownBlockers"] = [
        "train vehicle runtime animation remains to be bound to the recovered through-route",
        "close-tier building contact polish remains after recovery acceptance",
        "southeast river-to-lake hydrology extension remains a separate authority revision",
    ]
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    proof = composite_registered_terrain(
        circulation,
        transition,
        bridge_transition,
        bridges,
        manifest,
    )
    save_png(proof, QA_PROOF_PATH)
    with Image.open(
        CITY_ROOT / "references/capital-master-direction-r1.png"
    ) as source:
        reference = source.convert("RGB")
    panel_width = 960
    reference.thumbnail((panel_width, 720), Image.Resampling.LANCZOS)
    proof_panel = proof.convert("RGB")
    proof_panel.thumbnail((panel_width, 720), Image.Resampling.LANCZOS)
    comparison = Image.new(
        "RGB",
        (reference.width + proof_panel.width, max(reference.height, proof_panel.height)),
        (5, 8, 8),
    )
    comparison.paste(reference, (0, 0))
    comparison.paste(proof_panel, (reference.width, 0))
    save_png(comparison.convert("RGBA"), QA_REFERENCE_PATH)

    node_validation = {
        "schemaVersion": 1,
        "status": manifest["status"],
        "runtimeEligible": True,
        "manifestPath": public_url(MANIFEST_PATH),
        "manifestSha256": sha256(MANIFEST_PATH),
        "nodeCount": len(manifest["nodes"]),
        "uniqueSkillIds": len({node["skillId"] for node in manifest["nodes"]}),
        "renderableNodeCount": sum(
            1 for node in manifest["nodes"] if node["assetNodeReady"]
        ),
        "nodeScaleAuthority": "individual-building-environment-proportion-r1",
        "scaleClassControlsDisplayWidth": False,
        "individualScaleAuditPath": public_url(BUILDING_SCALE_DATA_PATH),
        "individualScaleAuditPasses": True,
        "skillDisplayWidthRange": [
            min(node["displayWidth"] for node in manifest["nodes"]),
            max(node["displayWidth"] for node in manifest["nodes"]),
        ],
        "stationDisplayWidth": station["displayWidth"],
        "runtimeLayerCount": 4,
        "legacyRuntimeLayerCount": 0,
    }
    NODE_VALIDATION_PATH.write_text(
        json.dumps(node_validation, indent=2) + "\n",
        encoding="utf-8",
    )

    validation = {
        "schemaVersion": 1,
        "status": manifest["status"],
        "productionReady": False,
        "runtimeEligible": True,
        "manifestPath": public_url(MANIFEST_PATH),
        "layoutReference": layout["id"],
        "layoutReferenceIsRuntimeRaster": False,
        "frozenTerrainSha256": sha256(TERRAIN_PATH),
        "frozenTerrainGeometryUnchanged": True,
        "waterAuthority": json.loads(
            WATER_MANIFEST_PATH.read_text(encoding="utf-8")
        )["authorityId"],
        "skillNodeCount": len(manifest["nodes"]),
        "stationDisplayWidth": station["displayWidth"],
        "railInterchangeSocket": rail["interchangeSocket"],
        "railOrphanTrackCount": rail["orphanTrackCount"],
        "railSupportDerivedFromCenterline": rail["supportDerivedFromCenterline"],
        "skillDisplayWidthRange": [
            min(node["displayWidth"] for node in manifest["nodes"]),
            max(node["displayWidth"] for node in manifest["nodes"]),
        ],
        "runtimeLayers": {
            "circulation": city_fabric["productionCirculation"],
            "transition": city_fabric["productionTransitionDetail"],
            "bridgeTransition": city_fabric["productionBridgeTransition"],
            "bridges": city_fabric["productionBridges"],
        },
        "placementRecords": placement_records,
        "railRecovery": rail_recovery,
        "conceptDerivedRuntimeRasterCount": 0,
        "qaProofPath": public_url(QA_PROOF_PATH),
        "qaProofSha256": sha256(QA_PROOF_PATH),
        "referenceComparisonPath": public_url(QA_REFERENCE_PATH),
        "referenceComparisonSha256": sha256(QA_REFERENCE_PATH),
    }
    VALIDATION_PATH.write_text(
        json.dumps(validation, indent=2) + "\n",
        encoding="utf-8",
    )



if __name__ == "__main__":
    main()
