"""Build camera-streamed close-detail tiles from the registered land plate.

This authoring step is intentionally independent from the full Career World
asset build so close-detail iteration cannot regenerate the locked water
assets. The output is a fixed grid in normalized world coordinates; runtime
code decides which tiles are resident from the shared camera.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
LAND_ROOT = ROOT / "public" / "career-world" / "layers" / "territory-landform"
SOURCE = LAND_ROOT / "textures" / "terrain-relief-r6-detail-4x.png"
HEIGHT_FIELD = LAND_ROOT / "fields" / "terrain-height-r4.png"
SLOPE_FIELD = LAND_ROOT / "fields" / "terrain-slope-r4.png"
LOWLAND_MATERIAL = LAND_ROOT / "materials" / "close-ground-r1.png"
ROCK_MATERIAL = LAND_ROOT / "materials" / "close-rock-r1.png"
OUTPUT_ROOT = LAND_ROOT / "tiles" / "stream-r1"
MANIFEST = LAND_ROOT / "manifests" / "terrain-stream-tiles-r1.json"
AUTHORED_MOUNTAIN_REFERENCES = {
    (2, 3): (
        LAND_ROOT
        / "sources"
        / "close-mountain-reference-2-3-r1.png"
    ),
    (2, 4): (
        LAND_ROOT
        / "sources"
        / "close-mountain-reference-2-4-r1.png"
    ),
    (3, 3): (
        LAND_ROOT
        / "sources"
        / "close-mountain-reference-3-3-r1.png"
    ),
    (3, 4): (
        LAND_ROOT
        / "sources"
        / "close-mountain-reference-3-4-r1.png"
    ),
    (6, 3): (
        LAND_ROOT
        / "sources"
        / "close-mountain-reference-r1.png"
    ),
    (6, 4): (
        LAND_ROOT
        / "sources"
        / "close-mountain-reference-6-4-r1.png"
    ),
}
GRID_COLUMNS = 12
GRID_ROWS = 8
OUTPUT_SCALE = 5
SOURCE_GUTTER = 12
MINIMUM_ALPHA = 8
# Authored cells return to the globally sampled sharp base near tile bounds.
# The 128-pixel contact occupies less than five percent of a typical tile and
# blends two detailed sources; it never filters or softens either RGB image.
AUTHORED_CONTACT_PIXELS = 128
WORLD_LIGHT = np.asarray([-0.42, -0.36, 0.83], dtype=np.float32)
NOISE_SPECS = (
    ("broad", 178, 0x71A3),
    ("medium", 52, 0xA19D),
    ("fine", 15, 0xD37A),
)


def smooth_unit(values: np.ndarray) -> np.ndarray:
    clipped = np.clip(values, 0.0, 1.0)
    return clipped * clipped * (3.0 - 2.0 * clipped)


def blur_float_field(values: np.ndarray, passes: int = 1) -> np.ndarray:
    """Apply a small separable-style blur without requantizing the field."""

    blurred = values.astype(np.float32, copy=True)
    for _ in range(passes):
        padded = np.pad(blurred, ((1, 1), (1, 1)), mode="edge")
        blurred = (
            padded[:-2, :-2]
            + padded[:-2, 2:]
            + padded[2:, :-2]
            + padded[2:, 2:]
            + (
                padded[:-2, 1:-1]
                + padded[1:-1, :-2]
                + padded[1:-1, 2:]
                + padded[2:, 1:-1]
            )
            * 2.0
            + padded[1:-1, 1:-1] * 4.0
        ) / 16.0
    return blurred


def build_noise_lattice(
    output_size: tuple[int, int],
    cell_size: int,
    seed: int,
) -> Image.Image:
    """Create one deterministic world-space value-noise lattice."""

    width, height = output_size
    generator = np.random.default_rng(seed)
    lattice = generator.integers(
        0,
        256,
        size=(
            math.ceil(height / cell_size) + 4,
            math.ceil(width / cell_size) + 4,
        ),
        dtype=np.uint8,
    )
    return Image.fromarray(lattice, mode="L")


def sample_noise(
    lattice: Image.Image,
    cell_size: int,
    output_bounds: tuple[int, int, int, int],
) -> np.ndarray:
    """Sample a global noise lattice without resetting at tile boundaries."""

    x0, y0, x1, y1 = output_bounds
    width = x1 - x0
    height = y1 - y0
    sampled = lattice.transform(
        (width, height),
        Image.Transform.EXTENT,
        (
            x0 / cell_size + 1,
            y0 / cell_size + 1,
            x1 / cell_size + 1,
            y1 / cell_size + 1,
        ),
        resample=Image.Resampling.BICUBIC,
    )
    return np.asarray(sampled, dtype=np.float32) / 255.0


def build_material_field(path: Path) -> tuple[np.ndarray, np.ndarray]:
    """Return a full close material plus its fixed palette reference."""

    material = Image.open(path).convert("RGB")
    color = np.asarray(material, dtype=np.float32)
    palette_mean = color.mean(axis=(0, 1))
    return color, palette_mean


def sample_mirrored_detail(
    detail: np.ndarray,
    output_bounds: tuple[int, int, int, int],
    offset: tuple[int, int],
) -> np.ndarray:
    """Sample a material field with reflection-safe periodic boundaries."""

    x0, y0, x1, y1 = output_bounds
    height, width = detail.shape[:2]
    period_x = (width - 1) * 2
    period_y = (height - 1) * 2
    x_raw = (
        np.arange(x0 + offset[0], x1 + offset[0], dtype=np.int64)
        % period_x
    )
    y_raw = (
        np.arange(y0 + offset[1], y1 + offset[1], dtype=np.int64)
        % period_y
    )
    x_indices = np.where(x_raw < width, x_raw, period_x - x_raw)
    y_indices = np.where(y_raw < height, y_raw, period_y - y_raw)
    return detail[np.ix_(y_indices, x_indices)]


def sample_registered_field(
    field: Image.Image,
    source_size: tuple[int, int],
    source_bounds: tuple[int, int, int, int],
    output_size: tuple[int, int],
) -> np.ndarray:
    """Sample a normalized field in the same registered world coordinates."""

    source_width, source_height = source_size
    x0, y0, x1, y1 = source_bounds
    # Transform in floating-point mode. Transforming an 8-bit `L` image first
    # requantizes every interpolated sample and turns gentle slopes into visible
    # contour terraces once close-tier normals amplify them.
    sampled = field.convert("F").transform(
        output_size,
        Image.Transform.EXTENT,
        (
            x0 / source_width * field.width,
            y0 / source_height * field.height,
            x1 / source_width * field.width,
            y1 / source_height * field.height,
        ),
        resample=Image.Resampling.BICUBIC,
    )
    return np.asarray(sampled, dtype=np.float32) / 255.0


def add_close_terrain_detail(
    enlarged: Image.Image,
    source_size: tuple[int, int],
    source_bounds: tuple[int, int, int, int],
    output_bounds: tuple[int, int, int, int],
    height_field: Image.Image,
    slope_field: Image.Image,
    noise_lattices: dict[str, tuple[Image.Image, int]],
    lowland_material: tuple[np.ndarray, np.ndarray],
    rock_material: tuple[np.ndarray, np.ndarray],
) -> Image.Image:
    """Re-light registered terrain at output resolution.

    The source plate remains authoritative for geography and broad color. Its
    baked relief is too low-resolution for the site camera, so close tiles
    reconstruct normals from the registered height field plus restrained,
    world-space sub-relief. Material references contribute surface character,
    never macro geography.
    """

    rgba = np.asarray(enlarged, dtype=np.uint8)
    original = rgba[..., :3].astype(np.float32)
    alpha = rgba[..., 3].copy()
    output_size = (enlarged.width, enlarged.height)
    height = sample_registered_field(
        height_field,
        source_size,
        source_bounds,
        output_size,
    )
    slope = sample_registered_field(
        slope_field,
        source_size,
        source_bounds,
        output_size,
    )
    broad = sample_noise(*noise_lattices["broad"], output_bounds) - 0.5
    medium = sample_noise(*noise_lattices["medium"], output_bounds) - 0.5
    fine = sample_noise(*noise_lattices["fine"], output_bounds) - 0.5

    steep = smooth_unit((slope - 0.07) / 0.48)
    highland = smooth_unit((height - 0.16) / 0.66)
    land_coverage = alpha.astype(np.float32) / 255.0

    # The macro plate owns geography, biome color, and large-scale lighting.
    # Close materials supply actual surface information rather than a sharpen
    # filter over an enlarged, blurry plate.
    albedo = original

    lowland_color = sample_mirrored_detail(
        lowland_material[0],
        output_bounds,
        (0, 0),
    )
    rock_color = sample_mirrored_detail(
        rock_material[0],
        output_bounds,
        (463, 271),
    )
    rock_weight = np.clip(
        smooth_unit((slope - 0.09) / 0.4) * 0.76
        + highland * 0.24,
        0.0,
        1.0,
    )
    rock_mix = rock_weight[..., np.newaxis]
    material = (
        lowland_color * (1.0 - rock_mix)
        + rock_color * rock_mix
    )
    material_mean = (
        lowland_material[1] * (1.0 - rock_mix)
        + rock_material[1] * rock_mix
    )
    palette_scale = np.clip(
        (albedo + 12.0) / (material_mean + 12.0),
        0.60,
        1.65,
    )
    matched_material = material * palette_scale
    color = matched_material * 0.88 + albedo * 0.12

    # Calculate macro normals at the canonical field's own sample density, then
    # resample the vectors. Differentiating the 8-bit field after a 20x resize
    # exposes its source pixel lattice as false terraces and cross-hatching.
    source_width, source_height = source_size
    bounds_width = source_bounds[2] - source_bounds[0]
    bounds_height = source_bounds[3] - source_bounds[1]
    macro_size = (
        max(2, round(bounds_width / source_width * height_field.width)),
        max(2, round(bounds_height / source_height * height_field.height)),
    )
    macro_height = sample_registered_field(
        height_field,
        source_size,
        source_bounds,
        macro_size,
    )
    macro_slope = sample_registered_field(
        slope_field,
        source_size,
        source_bounds,
        macro_size,
    )
    macro_steep = smooth_unit((macro_slope - 0.07) / 0.48)
    macro_gradient_y, macro_gradient_x = np.gradient(macro_height)
    macro_strength = 15.5 + macro_steep * 7.5
    macro_normal_x = -macro_gradient_x * macro_strength
    macro_normal_y = -macro_gradient_y * macro_strength

    def resize_float(values: np.ndarray) -> np.ndarray:
        image = Image.fromarray(values.astype(np.float32), mode="F")
        return np.asarray(
            image.resize(output_size, Image.Resampling.BICUBIC),
            dtype=np.float32,
        )

    # Continuous world-space value noise supplies only the sub-pixel surface
    # normal; it does not redefine height, ridges, or coast geometry.
    detail_surface = broad * 0.4 + medium * 0.16 + fine * 0.025
    detail_gradient_y, detail_gradient_x = np.gradient(detail_surface)
    detail_strength = 10.0 + steep * 8.0
    normal_x = (
        resize_float(macro_normal_x)
        - detail_gradient_x * detail_strength
    )
    normal_y = (
        resize_float(macro_normal_y)
        - detail_gradient_y * detail_strength
    )
    normal_z = np.ones_like(normal_x)
    normal_length = np.sqrt(
        normal_x * normal_x
        + normal_y * normal_y
        + normal_z * normal_z,
    )
    illumination = (
        normal_x * WORLD_LIGHT[0]
        + normal_y * WORLD_LIGHT[1]
        + normal_z * WORLD_LIGHT[2]
    ) / normal_length
    lighting_delta = np.clip(
        illumination - WORLD_LIGHT[2],
        -0.42,
        0.32,
    )
    lighting_gain = 0.7 + steep * 0.22
    color *= (
        1.0 + lighting_delta * lighting_gain
    )[..., np.newaxis]

    # Shallow macro curvature adds contact depth to ridges and valleys without
    # reintroducing the canonical field's quantization grid.
    macro_neighborhood = blur_float_field(macro_height, passes=2)
    curvature = resize_float(
        np.clip(macro_height - macro_neighborhood, -0.055, 0.055),
    )
    color *= (
        1.0 + curvature * (1.2 + steep * 1.8)
    )[..., np.newaxis]

    # A slope-gated illustrated accent keeps the terrain in the same authored
    # line language as the ocean without outlining every patch of ground.
    edge_strength = np.hypot(normal_x, normal_y)
    ink = smooth_unit((edge_strength - 0.08) / 0.72)
    ink *= 0.012 + steep * 0.055
    color *= (1.0 - ink)[..., np.newaxis]

    coverage = land_coverage[..., np.newaxis]
    color = original * (1.0 - coverage) + color * coverage
    output = np.concatenate(
        (
            np.clip(np.round(color), 0, 255).astype(np.uint8),
            alpha[..., np.newaxis],
        ),
        axis=-1,
    )
    return Image.fromarray(output, mode="RGBA")


def apply_authored_mountain_reference(
    terrain: Image.Image,
    reference_path: Path,
) -> Image.Image:
    """Apply one registered close-art plate with a narrow tile contact."""

    base_rgba = np.asarray(terrain, dtype=np.uint8)
    base_rgb = base_rgba[..., :3].astype(np.float32)
    alpha = base_rgba[..., 3].copy()
    output_size = terrain.size
    reference_image = Image.open(reference_path).convert("RGB").resize(
        output_size,
        Image.Resampling.LANCZOS,
    )
    reference_rgb = np.asarray(reference_image, dtype=np.float32)

    land_coverage = alpha.astype(np.float32) / 255.0
    y_indices, x_indices = np.indices((terrain.height, terrain.width))
    edge_distance = np.minimum.reduce((
        x_indices,
        terrain.width - 1 - x_indices,
        y_indices,
        terrain.height - 1 - y_indices,
    )).astype(np.float32)
    contact = smooth_unit(edge_distance / AUTHORED_CONTACT_PIXELS)
    mountain_support = land_coverage * contact

    # Match palette statistics without adding the registered raster's broad
    # low-detail shapes back onto the authored terrain.
    statistics_mask = mountain_support > 0.5
    if np.any(statistics_mask):
        base_samples = base_rgb[statistics_mask]
        reference_samples = reference_rgb[statistics_mask]
        base_mean = base_samples.mean(axis=0)
        reference_mean = reference_samples.mean(axis=0)
        base_std = np.maximum(base_samples.std(axis=0), 1.0)
        reference_std = np.maximum(reference_samples.std(axis=0), 1.0)
        contrast = np.clip(base_std / reference_std, 0.78, 1.18)
        normalized_reference = (
            (reference_rgb - reference_mean) * contrast + base_mean
        )
    else:
        normalized_reference = reference_rgb
    normalized_reference = np.clip(normalized_reference, 0.0, 255.0)
    blend = (mountain_support * 0.98)[..., np.newaxis]
    color = base_rgb * (1.0 - blend) + normalized_reference * blend
    output = np.concatenate(
        (
            np.clip(np.round(color), 0, 255).astype(np.uint8),
            alpha[..., np.newaxis],
        ),
        axis=-1,
    )
    output[output[..., 3] == 0, :3] = 0
    return Image.fromarray(output, mode="RGBA")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(f"{path.suffix}.tmp")
    temporary.write_text(
        json.dumps(payload, indent=2) + "\n",
        encoding="utf-8",
    )
    temporary.replace(path)


def build_tile(
    source: Image.Image,
    bounds: tuple[int, int, int, int],
    height_field: Image.Image,
    slope_field: Image.Image,
    noise_lattices: dict[str, tuple[Image.Image, int]],
    lowland_material: tuple[np.ndarray, np.ndarray],
    rock_material: tuple[np.ndarray, np.ndarray],
) -> Image.Image:
    x0, y0, x1, y1 = bounds
    expanded = (
        max(0, x0 - SOURCE_GUTTER),
        max(0, y0 - SOURCE_GUTTER),
        min(source.width, x1 + SOURCE_GUTTER),
        min(source.height, y1 + SOURCE_GUTTER),
    )
    crop = source.crop(expanded)
    enlarged = crop.resize(
        (
            crop.width * OUTPUT_SCALE,
            crop.height * OUTPUT_SCALE,
        ),
        Image.Resampling.LANCZOS,
    )
    enlarged = add_close_terrain_detail(
        enlarged,
        source.size,
        expanded,
        (
            expanded[0] * OUTPUT_SCALE,
            expanded[1] * OUTPUT_SCALE,
            expanded[2] * OUTPUT_SCALE,
            expanded[3] * OUTPUT_SCALE,
        ),
        height_field,
        slope_field,
        noise_lattices,
        lowland_material,
        rock_material,
    )
    left = (x0 - expanded[0]) * OUTPUT_SCALE
    top = (y0 - expanded[1]) * OUTPUT_SCALE
    return enlarged.crop((
        left,
        top,
        left + (x1 - x0) * OUTPUT_SCALE,
        top + (y1 - y0) * OUTPUT_SCALE,
    ))


def parse_tile(value: str) -> tuple[int, int]:
    try:
        column_text, row_text = value.split(",", maxsplit=1)
        column = int(column_text)
        row = int(row_text)
    except (TypeError, ValueError) as error:
        raise argparse.ArgumentTypeError(
            "tile must be formatted as COLUMN,ROW",
        ) from error
    if not 0 <= column < GRID_COLUMNS or not 0 <= row < GRID_ROWS:
        raise argparse.ArgumentTypeError("tile is outside the configured grid")
    return column, row


def parse_shard(value: str) -> tuple[int, int]:
    try:
        index_text, count_text = value.split("/", maxsplit=1)
        index = int(index_text)
        count = int(count_text)
    except (TypeError, ValueError) as error:
        raise argparse.ArgumentTypeError(
            "shard must be formatted as INDEX/COUNT",
        ) from error
    if count < 1 or not 0 <= index < count:
        raise argparse.ArgumentTypeError("shard index must be within its count")
    return index, count


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--tile",
        type=parse_tile,
        help=(
            "Build one COLUMN,ROW tile for visual iteration without "
            "rewriting the manifest."
        ),
    )
    parser.add_argument(
        "--shard",
        type=parse_shard,
        help=(
            "Build one zero-based INDEX/COUNT shard without rewriting the "
            "manifest."
        ),
    )
    return parser.parse_args()


def main() -> None:
    options = arguments()
    source = Image.open(SOURCE).convert("RGBA")
    # The canonical field is an 8-bit Phase 3 artifact. A small source-space
    # reconstruction blur removes quantization steps before the site build
    # calculates high-gain normals; detail is then restored from continuous,
    # world-space sub-relief below.
    height_field = Image.open(HEIGHT_FIELD).convert("L").filter(
        ImageFilter.GaussianBlur(radius=1.35),
    )
    slope_field = Image.open(SLOPE_FIELD).convert("L")
    output_world_size = (
        source.width * OUTPUT_SCALE,
        source.height * OUTPUT_SCALE,
    )
    noise_lattices = {
        name: (
            build_noise_lattice(output_world_size, cell_size, seed),
            cell_size,
        )
        for name, cell_size, seed in NOISE_SPECS
    }
    lowland_material = build_material_field(LOWLAND_MATERIAL)
    rock_material = build_material_field(ROCK_MATERIAL)
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    tiles: list[dict[str, object]] = []
    total_candidates = GRID_COLUMNS * GRID_ROWS
    processed_candidates = 0
    completed_tiles = 0

    for row in range(GRID_ROWS):
        y0 = math.floor(row * source.height / GRID_ROWS)
        y1 = (
            source.height
            if row == GRID_ROWS - 1
            else math.floor((row + 1) * source.height / GRID_ROWS)
        )
        for column in range(GRID_COLUMNS):
            processed_candidates += 1
            x0 = math.floor(column * source.width / GRID_COLUMNS)
            x1 = (
                source.width
                if column == GRID_COLUMNS - 1
                else math.floor((column + 1) * source.width / GRID_COLUMNS)
            )
            if options.tile and options.tile != (column, row):
                continue
            if options.shard:
                shard_index, shard_count = options.shard
                if (processed_candidates - 1) % shard_count != shard_index:
                    continue
            source_crop = source.crop((x0, y0, x1, y1))
            alpha = np.asarray(source_crop.getchannel("A"), dtype=np.uint8)
            if int(alpha.max()) < MINIMUM_ALPHA:
                continue

            completed_tiles += 1
            print(
                f"[cell {processed_candidates:02d}/{total_candidates}; "
                f"tile {completed_tiles:02d}] building close-{column}-{row}",
                flush=True,
            )
            tile = build_tile(
                source,
                (x0, y0, x1, y1),
                height_field,
                slope_field,
                noise_lattices,
                lowland_material,
                rock_material,
            )
            mountain_reference = AUTHORED_MOUNTAIN_REFERENCES.get(
                (column, row)
            )
            if mountain_reference:
                tile = apply_authored_mountain_reference(
                    tile,
                    mountain_reference,
                )
            tile_id = f"close-{column}-{row}"
            revision_suffix = "-semantic-r2"
            file_name = f"{tile_id}{revision_suffix}.webp"
            output = OUTPUT_ROOT / file_name
            temporary = output.with_suffix(".tmp.webp")
            tile.save(
                temporary,
                format="WEBP",
                quality=93,
                method=4,
                exact=True,
            )
            temporary.replace(output)
            print(
                f"[cell {processed_candidates:02d}/{total_candidates}; "
                f"tile {completed_tiles:02d}] wrote {file_name}",
                flush=True,
            )
            tiles.append({
                "id": tile_id,
                "path": (
                    "/career-world/layers/territory-landform/"
                    f"tiles/stream-r1/{file_name}"
                ),
                "minimumTier": "capital",
                "dimensions": [tile.width, tile.height],
                "worldBounds": {
                    "origin": [
                        x0 / source.width,
                        y0 / source.height,
                    ],
                    "span": [
                        (x1 - x0) / source.width,
                        (y1 - y0) / source.height,
                    ],
                },
                "sourceCropPixels": {
                    "origin": [x0, y0],
                    "size": [x1 - x0, y1 - y0],
                },
                "sourceAlphaPolicy": "preserve-exactly",
                "sha256": sha256(output),
            })

    if options.tile or options.shard:
        print(
            "Built selected streamed land tiles without rewriting the manifest."
        )
        return

    write_json(MANIFEST, {
        "schemaVersion": 1,
        "id": "career-world/terrain-stream-tiles@r1",
        "status": "phase-6-close-detail-foundation",
        "coordinateSpace": "normalized-world-top-left",
        "sourceDetailPath": (
            "/career-world/layers/territory-landform/"
            "textures/terrain-relief-r6-detail-4x.png"
        ),
        "sourceDimensions": [source.width, source.height],
        "grid": {
            "columns": GRID_COLUMNS,
            "rows": GRID_ROWS,
            "outputScale": OUTPUT_SCALE,
        },
        "streaming": {
            "prefetchPadding": 0.035,
            "retentionPadding": 0.075,
            "maximumResidentTiles": 12,
        },
        "tiles": tiles,
        "policy": [
            (
                "Tiles preserve the registered world projection and exact "
                "normalized bounds."
            ),
            (
                "Runtime residency is limited to the camera plus a bounded "
                "prefetch ring."
            ),
            (
                "The close tier adds world-registered slope-aware micro relief "
                "without replacing geography, shoreline, or the locked water "
                "layer."
            ),
            (
                "Capital site tiles may overlay locally authored terrain but "
                "must preserve the canonical land alpha."
            ),
        ],
    })
    print(
        f"Built {len(tiles)} streamed land tiles from "
        f"{source.width}x{source.height} source."
    )


if __name__ == "__main__":
    main()
