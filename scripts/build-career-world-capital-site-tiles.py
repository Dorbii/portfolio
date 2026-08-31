"""Build bounded terrain-owned ground transitions for capitals and town sites.

Structure sprites and town fabric stay independent from the landform. These
tiles provide only the flattened, material-matched ground contact beneath each
site. Their alpha is always a subset of the registered land plate, so they
cannot cover the locked water layer or silently redraw geography.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
PUBLIC_ROOT = ROOT / "public" / "career-world" / "layers"
LAND_ROOT = PUBLIC_ROOT / "terrain" / "authority"
STRUCTURE_ROOT = PUBLIC_ROOT / "structures"
SOURCE = LAND_ROOT / "textures" / "terrain-relief-r6-detail-4x.png"
LOWLAND_MATERIAL = LAND_ROOT / "materials" / "close-ground-r1.png"
ROCK_MATERIAL = LAND_ROOT / "materials" / "close-rock-r1.png"
TERRITORIES = LAND_ROOT / "manifests" / "world-territories-r4.json"
STRUCTURES = STRUCTURE_ROOT / "manifests" / "capital-structures-r1.json"
PROJECTS = STRUCTURE_ROOT / "manifests" / "project-structures-r1.json"
MANIFEST = LAND_ROOT / "manifests" / "terrain-site-tiles-r2.json"

OUTPUT_SIZE = 1254
GENERATED_CROP_SIZE = 300
NINJAONE_SITE_SOURCE_CROPS = {
    "project-kaizen-agent": (1428, 601, 1648, 821),
}


def smooth_unit(values: np.ndarray) -> np.ndarray:
    clipped = np.clip(values, 0.0, 1.0)
    return clipped * clipped * (3.0 - 2.0 * clipped)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def write_json(path: Path, payload: object) -> None:
    temporary = path.with_suffix(f"{path.suffix}.tmp")
    temporary.write_text(
        json.dumps(payload, indent=2) + "\n",
        encoding="utf-8",
    )
    temporary.replace(path)


def centered_crop(
    anchor: tuple[float, float],
    crop_size: int,
    source_size: tuple[int, int],
) -> tuple[int, int, int, int]:
    source_width, source_height = source_size
    center_x = round(anchor[0] * source_width)
    center_y = round(anchor[1] * source_height)
    left = min(
        max(0, center_x - crop_size // 2),
        source_width - crop_size,
    )
    top = min(
        max(0, center_y - crop_size // 2),
        source_height - crop_size,
    )
    return left, top, left + crop_size, top + crop_size


def support_field(
    texture: Image.Image,
    center: tuple[float, float],
    radius: tuple[float, float],
) -> np.ndarray:
    width, height = texture.size
    x = (np.arange(width, dtype=np.float32) + 0.5) / width
    y = (np.arange(height, dtype=np.float32) + 0.5) / height
    distance = np.hypot(
        (x[np.newaxis, :] - center[0]) / radius[0],
        (y[:, np.newaxis] - center[1]) / radius[1],
    )
    irregularity = np.asarray(
        texture.convert("L").filter(ImageFilter.GaussianBlur(radius=46.0)),
        dtype=np.float32,
    )
    irregularity = (irregularity - irregularity.mean()) / 255.0
    return distance + irregularity * 0.11


def build_generated_site(
    registered_source: Image.Image,
    source_bounds: tuple[int, int, int, int],
    lowland: Image.Image,
    rock: Image.Image,
) -> Image.Image:
    terrain = registered_source.crop(source_bounds).resize(
        (OUTPUT_SIZE, OUTPUT_SIZE),
        Image.Resampling.LANCZOS,
    )
    terrain_pixels = np.asarray(terrain, dtype=np.uint8)
    base = terrain_pixels[..., :3].astype(np.float32)
    source_alpha = terrain_pixels[..., 3].astype(np.float32)

    lowland_rgb = np.asarray(
        lowland.resize((OUTPUT_SIZE, OUTPUT_SIZE), Image.Resampling.LANCZOS),
        dtype=np.float32,
    )
    rock_rgb = np.asarray(
        rock.resize((OUTPUT_SIZE, OUTPUT_SIZE), Image.Resampling.LANCZOS),
        dtype=np.float32,
    )
    material = lowland_rgb * 0.58 + rock_rgb * 0.42
    visible = source_alpha > 24
    base_samples = base[visible]
    material_samples = material.reshape(-1, 3)
    base_mean = base_samples.mean(axis=0)
    base_std = np.maximum(base_samples.std(axis=0), 1.0)
    material_mean = material_samples.mean(axis=0)
    material_std = np.maximum(material_samples.std(axis=0), 1.0)
    contrast = np.clip(base_std / material_std, 0.82, 1.16)
    foundation = (
        (material - material_mean) * contrast + base_mean
    )
    foundation *= np.asarray([0.96, 0.94, 0.90], dtype=np.float32)

    distance = support_field(
        lowland,
        center=(0.50, 0.52),
        radius=(0.45, 0.34),
    )
    contact = 1.0 - smooth_unit((distance - 0.38) / 0.20)
    color = foundation
    alpha = np.minimum(source_alpha, contact * 255.0)

    output = np.concatenate(
        (
            np.clip(np.round(color), 0, 255).astype(np.uint8),
            np.clip(np.round(alpha), 0, 255)
            .astype(np.uint8)[..., np.newaxis],
        ),
        axis=-1,
    )
    output[output[..., 3] == 0, :3] = 0
    return Image.fromarray(output, mode="RGBA")


def main() -> None:
    registered_source = Image.open(SOURCE).convert("RGBA")
    lowland = Image.open(LOWLAND_MATERIAL).convert("RGB")
    rock = Image.open(ROCK_MATERIAL).convert("RGB")
    territories = json.loads(TERRITORIES.read_text(encoding="utf-8"))
    structures = json.loads(STRUCTURES.read_text(encoding="utf-8"))
    projects = json.loads(PROJECTS.read_text(encoding="utf-8"))
    territory_by_id = {
        territory["id"]: territory
        for territory in territories["territories"]
    }
    tiles: list[dict[str, object]] = []

    output_root = LAND_ROOT / "tiles"
    output_root.mkdir(parents=True, exist_ok=True)

    for capital in structures["nodes"]:
        territory_id = capital["territoryId"]
        territory = territory_by_id[territory_id]
        anchor = tuple(territory["development"]["capitalAnchor"])
        bounds = (
            NINJAONE_SITE_SOURCE_CROPS[capital["id"]]
            if territory_id == "ninjaone"
            else centered_crop(anchor, GENERATED_CROP_SIZE, registered_source.size)
        )

        if territory_id == "ninjaone":
            image = build_generated_site(
                registered_source,
                bounds,
                lowland,
                rock,
            )
            revision = "r4"
            authored_source_path = None
        else:
            image = build_generated_site(
                registered_source,
                bounds,
                lowland,
                rock,
            )
            revision = "r3" if territory_id == "independent" else "r1"
            authored_source_path = None

        file_name = f"{territory_id}-capital-site-{revision}.png"
        output = output_root / file_name
        temporary = output.with_suffix(".tmp.png")
        image.save(temporary, format="PNG", optimize=True)
        temporary.replace(output)

        left, top, right, bottom = bounds
        tile = {
            "id": f"{territory_id}-capital-site",
            "territoryId": territory_id,
            "ownerKind": "capital",
            "ownerId": capital["id"],
            "minimumTier": "site",
            "path": (
                "/career-world/layers/terrain/authority/tiles/"
                f"{file_name}"
            ),
            "dimensions": [image.width, image.height],
            "worldBounds": {
                "origin": [
                    left / registered_source.width,
                    top / registered_source.height,
                ],
                "span": [
                    (right - left) / registered_source.width,
                    (bottom - top) / registered_source.height,
                ],
            },
            "sourceCropPixels": {
                "origin": [left, top],
                "size": [right - left, bottom - top],
            },
            "sourceAlphaPolicy": "bounded-subset",
            "sha256": sha256(output),
        }
        if authored_source_path:
            tile["authoredSourcePath"] = authored_source_path
        tiles.append(tile)
        print(f"Built {output.relative_to(ROOT)} ({tile['sha256']}).")

    for project in projects["nodes"]:
        bounds = NINJAONE_SITE_SOURCE_CROPS[project["id"]]
        image = build_generated_site(
            registered_source,
            bounds,
            lowland,
            rock,
        )
        project_slug = project["id"].removeprefix("project-")
        file_name = f"ninjaone-{project_slug}-site-r2.png"
        output = output_root / file_name
        temporary = output.with_suffix(".tmp.png")
        image.save(temporary, format="PNG", optimize=True)
        temporary.replace(output)
        left, top, right, bottom = bounds
        tile = {
            "id": f"{project['id']}-site",
            "territoryId": "ninjaone",
            "ownerKind": "project",
            "ownerId": project["id"],
            "minimumTier": "site",
            "path": (
                "/career-world/layers/terrain/authority/tiles/"
                f"{file_name}"
            ),
            "dimensions": [image.width, image.height],
            "worldBounds": {
                "origin": [
                    left / registered_source.width,
                    top / registered_source.height,
                ],
                "span": [
                    (right - left) / registered_source.width,
                    (bottom - top) / registered_source.height,
                ],
            },
            "sourceCropPixels": {
                "origin": [left, top],
                "size": [right - left, bottom - top],
            },
            "sourceAlphaPolicy": "bounded-subset",
            "sha256": sha256(output),
        }
        tiles.append(tile)
        print(f"Built {output.relative_to(ROOT)} ({tile['sha256']}).")

    write_json(MANIFEST, {
        "schemaVersion": 2,
        "id": "career-world/terrain-site-tiles@r2",
        "status": "phase-6-structure-sites",
        "coordinateSpace": "normalized-world-top-left",
        "sourceDetailPath": (
            "/career-world/layers/terrain/authority/"
            "textures/terrain-relief-r6-detail-4x.png"
        ),
        "sourceDimensions": list(registered_source.size),
        "tiles": tiles,
        "policy": [
            (
                "Every capital and registered project district owns one "
                "bounded terrain-owned ground transition."
            ),
            (
                "Wide-area close terrain is camera-streamed; local site "
                "overlays contain only material-matched foundation contact."
            ),
            (
                "Every site alpha is a subset of the registered land alpha "
                "and cannot cover the locked water layer."
            ),
            (
                "Static shore geometry and material remain land-owned; "
                "persistent swash and wet-edge motion remain water-owned."
            ),
            (
                "Ground-only material contacts support structures without "
                "redrawing geography or defining infrastructure."
            ),
            (
                "NinjaOne project contacts are distributed across territory-"
                "owned anchors rather than compressed inside the capital "
                "envelope."
            ),
            (
                "Vegetation, actors, labels, and transient effects remain "
                "in their later owning phases."
            ),
        ],
    })


if __name__ == "__main__":
    main()
