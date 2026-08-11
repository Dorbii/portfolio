from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import subprocess
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
LAND_ROOT = ROOT / "public" / "career-world" / "layers" / "territory-landform"
ENVIRONMENT_ROOT = (
    ROOT / "public" / "career-world" / "capitals" / "ninjaone" / "environment"
)
SOURCE_ROOT = (
    ROOT / "art-source" / "career-world" / "ninjaone-environment" / "production-r2"
)
TOPOLOGY_ROOT = SOURCE_ROOT / "topology-r3"

BASELINE_MASK = TOPOLOGY_ROOT / "world-land-mask-r4-baseline.png"
AUTHORED_MASK = TOPOLOGY_ROOT / "world-land-mask-b1-b2-r1.png"
PRODUCTION_MASK = LAND_ROOT / "masks" / "world-land-mask-r4.png"
TOPOLOGY_CONCEPT = TOPOLOGY_ROOT / "ninjaone-b1-topology-concept-r1.png"
COASTLINE_CONCEPT = TOPOLOGY_ROOT / "ninjaone-coastline-repair-source-r1.png"
DETAIL_MASTER = SOURCE_ROOT / "ninjaone-environment-terrain-master-detail-r2.png"
ENVIRONMENT_MANIFEST = ENVIRONMENT_ROOT / "manifests" / "environment-proof-r1.json"
VALIDATION = TOPOLOGY_ROOT / "ninjaone-b1-b2-topology-validation-r1.json"
CONTACT_SHEET = TOPOLOGY_ROOT / "ninjaone-b1-b2-topology-contact-sheet-r1.png"

REGION = (209, 0, 627, 314)
LOCAL_SIZE = (1440, 1080)
B1_BOX = (0, 0, 720, 540)
BASELINE_MASK_SHA256 = "6FD3183BE37361B9AF32DB3CCF79076B2977F73FE1F37643386C9BC7F295EB9A"
BASELINE_DETAIL_SHA256 = "C6E2107C9A1AB425E5103964DC617E4DEE30865DF1EB50528007AF7BDF58BDA9"
EXPECTED_SOURCE_HASHES = {
    TOPOLOGY_CONCEPT.name: "468DF2A029D007EF3F63F385A22E9ED5DBBC86426BD416114A7BBF0E8BFE7AC9",
    COASTLINE_CONCEPT.name: "4E322962FB86D47FF677DBC797A1F5C68E3D1CAE249DADD95C2007B429012304",
}

TIERS = {
    "territory": (720, 540),
    "capital": (1440, 1080),
    "site": (2880, 2160),
    "close": (5760, 4320),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def require_sources() -> None:
    if sha256(BASELINE_MASK) != BASELINE_MASK_SHA256:
        raise RuntimeError("The frozen pre-B1 land mask no longer matches its accepted hash.")
    for name, expected in EXPECTED_SOURCE_HASHES.items():
        path = TOPOLOGY_ROOT / name
        if sha256(path) != expected:
            raise RuntimeError(f"Authored source {name} no longer matches {expected}.")


def close_binary(mask: np.ndarray, radius: int) -> np.ndarray:
    size = radius * 2 + 1
    image = Image.fromarray(mask.astype(np.uint8) * 255, "L")
    image = image.filter(ImageFilter.MaxFilter(size))
    image = image.filter(ImageFilter.MinFilter(size))
    return np.asarray(image) >= 128
def remove_small_components(mask: np.ndarray, minimum: int) -> np.ndarray:
    height, width = mask.shape
    visited = np.zeros(mask.shape, dtype=bool)
    keep = np.zeros(mask.shape, dtype=bool)
    for y in range(height):
        for x in range(width):
            if not mask[y, x] or visited[y, x]:
                continue
            queue: deque[int] = deque([y * width + x])
            visited[y, x] = True
            component: list[int] = []
            while queue:
                index = queue.popleft()
                component.append(index)
                cx, cy = index % width, index // width
                for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
                    if (
                        0 <= nx < width
                        and 0 <= ny < height
                        and mask[ny, nx]
                        and not visited[ny, nx]
                    ):
                        visited[ny, nx] = True
                        queue.append(ny * width + nx)
            if len(component) >= minimum:
                indices = np.asarray(component)
                keep[indices // width, indices % width] = True
    return keep


def fill_holes(mask: np.ndarray) -> np.ndarray:
    height, width = mask.shape
    exterior = np.zeros(mask.shape, dtype=bool)
    queue: deque[int] = deque()

    def enqueue(x: int, y: int) -> None:
        if not mask[y, x] and not exterior[y, x]:
            exterior[y, x] = True
            queue.append(y * width + x)

    for x in range(width):
        enqueue(x, 0)
        enqueue(x, height - 1)
    for y in range(height):
        enqueue(0, y)
        enqueue(width - 1, y)
    while queue:
        index = queue.popleft()
        x, y = index % width, index // width
        if x > 0:
            enqueue(x - 1, y)
        if x + 1 < width:
            enqueue(x + 1, y)
        if y > 0:
            enqueue(x, y - 1)
        if y + 1 < height:
            enqueue(x, y + 1)
    return ~exterior


def generated_land_seed(rgb: np.ndarray) -> np.ndarray:
    data = rgb.astype(np.float32)
    red, green, blue = data[..., 0], data[..., 1], data[..., 2]
    luma = 0.2126 * red + 0.7152 * green + 0.0722 * blue
    warm_score = 0.58 * red + 0.42 * green - blue
    seed = ((luma >= 13.0) & (warm_score >= -1.0)) | (
        (luma >= 43.0) & (warm_score >= -6.0)
    )
    return remove_small_components(seed, minimum=180)


def monotone_outer_envelope(mask: np.ndarray) -> np.ndarray:
    height, width = mask.shape
    rows = np.zeros_like(mask)
    columns = np.zeros_like(mask)
    for y in range(height):
        xs = np.flatnonzero(mask[y])
        if xs.size:
            rows[y, xs[0] :] = True
    for x in range(width):
        ys = np.flatnonzero(mask[:, x])
        if ys.size:
            columns[ys[0] :, x] = True
    return rows & columns


def taper_to_accepted_east(
    proposal: np.ndarray,
    accepted: np.ndarray,
    taper_start: int = 560,
) -> np.ndarray:
    height, width = proposal.shape
    result = proposal.copy()
    for x in range(taper_start, width):
        proposal_ys = np.flatnonzero(proposal[:, x])
        accepted_ys = np.flatnonzero(accepted[:, x])
        if not proposal_ys.size or not accepted_ys.size:
            continue
        progress = (x - taper_start) / max(1, width - 1 - taper_start)
        smooth = progress * progress * (3.0 - 2.0 * progress)
        target_y = round(
            (1.0 - smooth) * int(proposal_ys[0]) + smooth * int(accepted_ys[0])
        )
        result[:target_y, x] = False
    return result | accepted


def local_mask(global_mask: np.ndarray, resample: Image.Resampling) -> np.ndarray:
    image = Image.fromarray(global_mask.astype(np.uint8) * 255, "L")
    return np.asarray(image.crop(REGION).resize(LOCAL_SIZE, resample)) >= 128


def build_final_mask() -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    baseline_image = Image.open(BASELINE_MASK).convert("L")
    baseline = np.asarray(baseline_image) >= 128
    accepted_local = np.asarray(
        baseline_image.crop(REGION).resize(LOCAL_SIZE, Image.Resampling.BICUBIC)
    ) >= 128

    topology_rgb = np.asarray(
        Image.open(TOPOLOGY_CONCEPT).convert("RGB").resize(
            LOCAL_SIZE, Image.Resampling.LANCZOS
        )
    )
    topology_seed = fill_holes(close_binary(generated_land_seed(topology_rgb), 8))
    accepted_b1 = accepted_local[: B1_BOX[3], : B1_BOX[2]]
    b1_seed = topology_seed[: B1_BOX[3], : B1_BOX[2]]
    b1_envelope = close_binary(monotone_outer_envelope(b1_seed), 5)
    b1_candidate = taper_to_accepted_east(
        fill_holes(accepted_b1 | b1_envelope), accepted_b1
    )
    proposal = accepted_local.copy()
    proposal[: B1_BOX[3], : B1_BOX[2]] = b1_candidate

    # The north-central source defect is an axis-aligned alpha cut, not a
    # plausible shore. Replace only that ocean-facing band with a simplified
    # version of the authored coastline silhouette. Opening removes thin RGB
    # segmentation spurs before the rounded transition ring joins the edit
    # back to accepted land.
    coast_rgb = np.asarray(
        Image.open(COASTLINE_CONCEPT).convert("RGB").resize(
            LOCAL_SIZE, Image.Resampling.LANCZOS
        )
    )
    coast_seed = close_binary(generated_land_seed(coast_rgb), 3)
    core_image = Image.new("L", LOCAL_SIZE, 0)
    ImageDraw.Draw(core_image).rounded_rectangle(
        (790, 210, 1320, 520), radius=105, fill=255
    )
    core = (np.asarray(core_image) >= 128) & (np.indices(proposal.shape)[0] < 500)
    proposal[core] = coast_seed[core]
    transition = (
        np.asarray(core_image.filter(ImageFilter.MaxFilter(57))) >= 128
    ) & ~core
    proposal[transition] |= coast_seed[transition]
    proposal = close_binary(proposal, 2)
    # The authored silhouette contains one narrow offshore finger over pixels
    # where the accepted 4x plate has no terrain RGB. Carve a rounded inlet at
    # that exact registration point instead of promoting a geometric black spur.
    coast_void_image = Image.new("L", LOCAL_SIZE, 0)
    ImageDraw.Draw(coast_void_image).ellipse((865, 190, 940, 255), fill=255)
    proposal[np.asarray(coast_void_image) >= 128] = False
    enclosed = fill_holes(proposal) & ~proposal
    large_enclosed = remove_small_components(enclosed, minimum=250)
    proposal |= enclosed & ~large_enclosed

    region_small = Image.fromarray(proposal.astype(np.uint8) * 255, "L").resize(
        (REGION[2] - REGION[0], REGION[3] - REGION[1]),
        Image.Resampling.LANCZOS,
    )
    final = baseline.copy()
    final[REGION[1] : REGION[3], REGION[0] : REGION[2]] = (
        np.asarray(region_small) >= 128
    )
    reconstructed = local_mask(final, Image.Resampling.BICUBIC)
    return baseline, final, accepted_local, reconstructed


def nearest_existing_land(
    accepted: np.ndarray,
    candidate: np.ndarray,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    added = candidate & ~accepted
    height, width = added.shape
    nearest_y = np.full(added.shape, -1, dtype=np.int32)
    nearest_x = np.full(added.shape, -1, dtype=np.int32)
    distance = np.full(added.shape, -1, dtype=np.int32)
    queue: deque[int] = deque()
    for y, x in zip(*np.nonzero(added)):
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < width and 0 <= ny < height and accepted[ny, nx]:
                nearest_y[y, x] = ny
                nearest_x[y, x] = nx
                distance[y, x] = 1
                queue.append(y * width + x)
                break
    while queue:
        index = queue.popleft()
        x, y = index % width, index // width
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if (
                0 <= nx < width
                and 0 <= ny < height
                and added[ny, nx]
                and nearest_y[ny, nx] < 0
            ):
                nearest_y[ny, nx] = nearest_y[y, x]
                nearest_x[ny, nx] = nearest_x[y, x]
                distance[ny, nx] = distance[y, x] + 1
                queue.append(ny * width + nx)
    if np.any(added & (nearest_y < 0)):
        raise RuntimeError("The promoted land contains an addition disconnected from the baseline.")
    return nearest_y, nearest_x, distance


def palette_match(source: np.ndarray, target: np.ndarray, overlap: np.ndarray) -> np.ndarray:
    source_float = source.astype(np.float32)
    target_float = target.astype(np.float32)
    source_mean = source_float[overlap].mean(axis=0)
    source_std = source_float[overlap].std(axis=0)
    target_mean = target_float[overlap].mean(axis=0)
    target_std = target_float[overlap].std(axis=0)
    scale = np.clip(target_std / np.maximum(source_std, 1.0), 0.55, 1.35)
    return np.clip((source_float - source_mean) * scale + target_mean, 0, 255)


def extend_global_sources(baseline: np.ndarray, final: np.ndarray) -> None:
    added = final & ~baseline
    nearest_y, nearest_x, distance = nearest_existing_land(baseline, final)
    dem_path = LAND_ROOT / "sources" / "terrain-dem-authored-r3.png"
    surface_path = LAND_ROOT / "sources" / "world-land-surface-authored-r11.png"
    detail_path = LAND_ROOT / "sources" / "world-land-surface-authored-r11-detail-4x.png"
    dem = np.asarray(Image.open(dem_path).convert("L")).copy()
    surface = np.asarray(Image.open(surface_path).convert("RGB")).copy()
    target_y, target_x = np.nonzero(added)
    source_y = nearest_y[target_y, target_x]
    source_x = nearest_x[target_y, target_x]
    dem[target_y, target_x] = dem[source_y, source_x]
    surface[target_y, target_x] = surface[source_y, source_x]

    region_size = (REGION[2] - REGION[0], REGION[3] - REGION[1])
    production_region = np.asarray(
        Image.open(surface_path).convert("RGB").crop(REGION)
    )
    baseline_region = baseline[REGION[1] : REGION[3], REGION[0] : REGION[2]]
    final_region = final[REGION[1] : REGION[3], REGION[0] : REGION[2]]
    topology = np.asarray(
        Image.open(TOPOLOGY_CONCEPT).convert("RGB").resize(
            region_size, Image.Resampling.LANCZOS
        )
    )
    coast = np.asarray(
        Image.open(COASTLINE_CONCEPT).convert("RGB").resize(
            region_size, Image.Resampling.LANCZOS
        )
    )
    topology_seed = generated_land_seed(topology)
    coast_seed = generated_land_seed(coast)
    topology_matched = palette_match(
        topology, production_region, baseline_region & topology_seed
    )
    coast_matched = palette_match(coast, production_region, baseline_region & coast_seed)
    generated = topology_matched.copy()
    generated_valid = topology_seed.copy()
    coast_select = Image.new("L", region_size, 0)
    ImageDraw.Draw(coast_select).rounded_rectangle(
        (226, 60, 383, 151), radius=31, fill=255
    )
    coast_select_array = np.asarray(coast_select) >= 128
    generated[coast_select_array] = coast_matched[coast_select_array]
    generated_valid[coast_select_array] = coast_seed[coast_select_array]
    # Only promoted land needs a paint continuation. Requiring the generated
    # source to reach every accepted offshore island would conflate unrelated
    # geography and fail even though those islands retain their existing RGB.
    source_target = generated_valid | (final_region & ~baseline_region)
    generated_y, generated_x, _ = nearest_existing_land(generated_valid, source_target)
    missing = final_region & ~generated_valid
    missing_y, missing_x = np.nonzero(missing)
    generated[missing_y, missing_x] = generated[
        generated_y[missing_y, missing_x], generated_x[missing_y, missing_x]
    ]

    generated_world = np.zeros_like(surface, dtype=np.float32)
    generated_world[REGION[1] : REGION[3], REGION[0] : REGION[2]] = generated
    continued = np.asarray(
        Image.fromarray(surface, "RGB").filter(ImageFilter.GaussianBlur(7.0)),
        dtype=np.float32,
    )
    blend = np.clip((distance[target_y, target_x].astype(np.float32) - 1.0) / 12.0, 0, 1)
    blend = (blend * blend * (3.0 - 2.0 * blend)) * 0.78
    extended = (
        continued[target_y, target_x] * (1.0 - blend[:, np.newaxis])
        + generated_world[target_y, target_x] * blend[:, np.newaxis]
    )
    surface[target_y, target_x] = np.round(extended).astype(np.uint8)
    Image.fromarray(dem, "L").save(dem_path)
    Image.fromarray(surface, "RGB").save(surface_path)

    detail = np.asarray(Image.open(detail_path).convert("RGB")).copy()
    resized = np.asarray(
        Image.fromarray(surface, "RGB").resize(
            (detail.shape[1], detail.shape[0]), Image.Resampling.LANCZOS
        )
    )
    for y, x in zip(target_y.tolist(), target_x.tolist()):
        detail[y * 4 : y * 4 + 4, x * 4 : x * 4 + 4] = resized[
            y * 4 : y * 4 + 4, x * 4 : x * 4 + 4
        ]
    Image.fromarray(detail, "RGB").save(detail_path)


def update_dem_manifest() -> None:
    path = LAND_ROOT / "manifests" / "terrain-dem-r4.json"
    manifest = json.loads(path.read_text(encoding="utf-8"))
    shelves = [
        {
            "id": "ninjaone-upper-capital-plateau",
            "center": [0.245, 0.09],
            "targetElevation": 0.48,
            "strength": 0.82,
            "radius": 0.035,
        },
        {
            "id": "ninjaone-northwest-approach",
            "center": [0.173, 0.112],
            "targetElevation": 0.35,
            "strength": 0.78,
            "radius": 0.03,
        },
        {
            "id": "ninjaone-western-route-shelf",
            "center": [0.188, 0.205],
            "targetElevation": 0.31,
            "strength": 0.72,
            "radius": 0.034,
        },
        {
            "id": "ninjaone-eastern-district-shelf",
            "center": [0.295, 0.18],
            "targetElevation": 0.37,
            "strength": 0.7,
            "radius": 0.031,
        },
    ]
    ids = {item["id"] for item in shelves}
    manifest["developmentShelves"] = [
        item for item in manifest["developmentShelves"] if item["id"] not in ids
    ] + shelves
    crown = {
        "id": "ninjaone-northwest-crown",
        "points": [
            [0.155, 0.125],
            [0.177, 0.075],
            [0.215, 0.047],
            [0.265, 0.061],
            [0.303, 0.105],
        ],
        "radius": 0.034,
        "strength": 0.88,
    }
    manifest["mountainRanges"] = [
        item for item in manifest["mountainRanges"] if item["id"] != crown["id"]
    ] + [crown]
    policy = (
        "NinjaOne B1 reserves an upper capital plateau, northwest approach, western "
        "route shelf, and eastern district shelf; its authored B1/B2 shore removes "
        "axis-aligned ocean cuts without moving the central river corridor."
    )
    manifest["policy"] = [item for item in manifest["policy"] if not item.startswith("NinjaOne B1 reserves")]
    manifest["policy"].append(policy)
    path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


def build_global_land() -> None:
    path = ROOT / "scripts" / "build-career-world-assets.py"
    spec = importlib.util.spec_from_file_location("career_world_land_builder", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load {path}.")
    builder = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = builder
    spec.loader.exec_module(builder)
    mask = builder.load_land_mask()
    height, slope = builder.build_terrain_fields(mask)
    builder.build_land_plate(mask, height, slope)


def boundary_axis_runs(mask: np.ndarray) -> dict[str, int]:
    sample = mask[200:550, 750:1350]
    horizontal = sample[:-1, :] ^ sample[1:, :]
    vertical = sample[:, :-1] ^ sample[:, 1:]

    def longest(lines: np.ndarray) -> int:
        best = 0
        for line in lines:
            current = 0
            for value in line:
                current = current + 1 if value else 0
                best = max(best, current)
        return best

    return {
        "horizontal": longest(horizontal),
        "vertical": longest(vertical.T),
    }


def channel_lut(source: np.ndarray, target: np.ndarray, overlap: np.ndarray) -> list[list[int]]:
    source_float = source.astype(np.float32)
    target_float = target.astype(np.float32)
    source_mean = source_float[overlap].mean(axis=0)
    source_std = source_float[overlap].std(axis=0)
    target_mean = target_float[overlap].mean(axis=0)
    target_std = target_float[overlap].std(axis=0)
    scale = np.clip(target_std / np.maximum(source_std, 1.0), 0.62, 1.35)
    return [
        [int(np.clip(round((value - source_mean[c]) * scale[c] + target_mean[c]), 0, 255)) for value in range(256)]
        for c in range(3)
    ]


def matched_pil_source(path: Path, base: Image.Image, overlap: np.ndarray) -> Image.Image:
    source_local_image = Image.open(path).convert("RGB").resize(
        LOCAL_SIZE, Image.Resampling.LANCZOS
    )
    source_local = np.asarray(source_local_image)
    base_local = np.asarray(base.resize(LOCAL_SIZE, Image.Resampling.LANCZOS))
    luts = channel_lut(source_local, base_local, overlap)
    source = Image.open(path).convert("RGB").resize(base.size, Image.Resampling.LANCZOS)
    channels = source.split()
    return Image.merge("RGB", tuple(channel.point(luts[index]) for index, channel in enumerate(channels)))


def patch_detail_master(final: np.ndarray, baseline_local: np.ndarray, final_local: np.ndarray) -> dict:
    current_hash = sha256(DETAIL_MASTER)
    if current_hash != BASELINE_DETAIL_SHA256 and VALIDATION.exists():
        previous = json.loads(VALIDATION.read_text(encoding="utf-8"))
        if current_hash == previous.get("regional", {}).get("detailMasterSha256"):
            return previous["regional"]
    if current_hash != BASELINE_DETAIL_SHA256:
        raise RuntimeError(
            "The NinjaOne detail master is neither the accepted baseline nor this promotion's prior output."
        )

    with Image.open(DETAIL_MASTER) as source_master:
        master = source_master.convert("RGBA")
    base = master.convert("RGB")
    final_image = Image.fromarray(final_local.astype(np.uint8) * 255, "L")
    # The authored regional master already contains full-resolution terrain RGB
    # beneath its former alpha. Generated concepts author topology only; blending
    # their 1x paint into this 4x master visibly softens rocks and trees. Preserve
    # the accepted RGB and fill only genuinely uncovered black land below.
    patched = base

    # Reuse the canonical 4x land alpha rather than enlarging the 1x mask
    # directly. It is generated from that same mask, but preserves the
    # antialiased contour used by the global close-detail layer and prevents
    # 14-pixel stair steps in this denser regional plate.
    detail_alpha_source = LAND_ROOT / "textures" / "terrain-relief-r6-detail-4x.png"
    relief_box = tuple(value * 4 for value in REGION)
    with Image.open(detail_alpha_source) as detail_alpha_image:
        canonical_alpha = detail_alpha_image.getchannel("A").crop(relief_box).resize(
            master.size, Image.Resampling.LANCZOS
        )
    local_height, local_width = LOCAL_SIZE[1], LOCAL_SIZE[0]
    y, x = np.mgrid[0:local_height, 0:local_width]
    edge_distance = np.minimum.reduce(
        (x, local_width - 1 - x, y, local_height - 1 - y)
    ).astype(np.float32)
    support = np.clip(edge_distance / 45.0, 0.0, 1.0)
    support = support * support * (3.0 - 2.0 * support)
    support_image = Image.fromarray(np.round(support * 255).astype(np.uint8), "L").resize(
        master.size, Image.Resampling.BICUBIC
    )
    alpha = ImageChops.multiply(canonical_alpha, support_image)
    output = patched.convert("RGBA")
    output.putalpha(alpha)
    promoted_local = final_local & ~baseline_local

    # Some legacy B2 source tiles stored black ocean RGB beneath the old alpha.
    # If the repaired coastline exposes those pixels, extend the immediately
    # adjacent accepted terrain texture into only the newly exposed component.
    # A global-relief fallback is intentionally not used here: its lower native
    # detail creates visible soft blobs against the accepted 4x rock texture.
    local_rgb = np.asarray(
        output.convert("RGB").resize(LOCAL_SIZE, Image.Resampling.BOX)
    )
    local_alpha = np.asarray(
        output.getchannel("A").resize(LOCAL_SIZE, Image.Resampling.BOX)
    )
    raw_dark_land = (
        (local_alpha >= 128)
        & promoted_local
        & (local_rgb.max(axis=-1) <= 6)
    )
    dark_land = remove_small_components(raw_dark_land, minimum=32)
    initial_raw_dark_pixels = int(raw_dark_land.sum())
    if np.any(dark_land):
        local_rgb = local_rgb.copy()
        valid_land = final_local & ~dark_land & (local_rgb.max(axis=-1) > 6)
        nearest_y, nearest_x, _ = nearest_existing_land(
            valid_land,
            valid_land | dark_land,
        )
        dark_y, dark_x = np.nonzero(dark_land)
        local_rgb[dark_y, dark_x] = local_rgb[
            nearest_y[dark_y, dark_x], nearest_x[dark_y, dark_x]
        ]
        nearest_bright = Image.fromarray(local_rgb, "RGB").resize(
            master.size, Image.Resampling.LANCZOS
        )
        exact_weight = Image.fromarray(
            dark_land.astype(np.uint8) * 255,
            "L",
        ).resize(master.size, Image.Resampling.BICUBIC)
        repaired_rgb = Image.composite(
            nearest_bright,
            output.convert("RGB"),
            exact_weight,
        )
        output = repaired_rgb.convert("RGBA")
        output.putalpha(alpha)
        local_rgb = np.asarray(
            output.convert("RGB").resize(LOCAL_SIZE, Image.Resampling.BOX)
        )
        local_alpha = np.asarray(
            output.getchannel("A").resize(LOCAL_SIZE, Image.Resampling.BOX)
        )
        raw_dark_land = (
            (local_alpha >= 128)
            & promoted_local
            & (local_rgb.max(axis=-1) <= 6)
        )
        dark_land = remove_small_components(raw_dark_land, minimum=32)
    if np.any(dark_land):
        raise RuntimeError(
            f"Regional master contains {int(dark_land.sum())} opaque dark land pixels."
        )

    temporary = DETAIL_MASTER.with_suffix(".next.png")
    output.save(temporary, compress_level=6)
    temporary.replace(DETAIL_MASTER)
    return {
        "detailMasterSha256": sha256(DETAIL_MASTER),
        "detailMasterDimensions": list(master.size),
        "detailAlphaSourceSha256": sha256(detail_alpha_source),
        "capitalNormalizedDarkLandPixels": int(dark_land.sum()),
        "capitalNormalizedPromotedRawDarkPixels": initial_raw_dark_pixels,
        "darkComponentMinimumRepairPixels": 32,
    }


def build_runtime_lods() -> dict[str, dict]:
    subprocess.run(
        ["node", "scripts/assemble-ninjaone-environment-terrain-master-r2.mjs", "--lod-only"],
        cwd=ROOT,
        check=True,
    )
    outputs: dict[str, dict] = {}
    for tier, dimensions in TIERS.items():
        path = ENVIRONMENT_ROOT / "plates" / "geology" / f"ninjaone-environment-geology-{tier}-r2.webp"
        with Image.open(path) as image:
            actual = image.size
        if actual != dimensions:
            raise RuntimeError(f"{tier} geology LOD is {actual}, expected {dimensions}.")
        outputs[tier] = {
            "path": path,
            "sha256": sha256(path),
            "dimensions": list(actual),
        }
    return outputs


def update_environment_manifest(runtime: dict[str, dict]) -> None:
    manifest = json.loads(ENVIRONMENT_MANIFEST.read_text(encoding="utf-8"))
    registration = manifest["registration"]
    registration["gridCells"] = ["B1", "B2", "C1", "C2"]
    registration["continuityBufferCells"] = []
    geology = manifest["layers"]["geology"]
    geology["ownership"] = (
        "one canonical-mask-registered B1 B2 C1 C2 terrain geometry; open water "
        "remains owned by the global water layer"
    )
    geology["sourceSha256"] = sha256(DETAIL_MASTER)
    for tier, item in runtime.items():
        digest = item["sha256"]
        source = geology["sources"][tier]
        source["path"] = source["path"].split("?", 1)[0] + f"?v={digest[:12].lower()}"
        source["sha256"] = digest
        source["dimensions"] = item["dimensions"]
    ENVIRONMENT_MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


def build_contact_sheet(final_local: np.ndarray) -> None:
    master = Image.open(DETAIL_MASTER).convert("RGBA")
    background = Image.new("RGBA", master.size, (4, 12, 16, 255))
    flattened = Image.alpha_composite(background, master).convert("RGB")
    sheet = Image.new("RGB", (1440, 1160), (5, 10, 13))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default(size=22)
    overview = flattened.resize((720, 540), Image.Resampling.LANCZOS)
    sheet.paste(overview, (0, 40))
    draw.text((14, 10), "promoted B1/B2 terrain", fill=(235, 239, 241), font=font)
    northwest = flattened.crop((0, 180, 1900, 1700)).resize((720, 540), Image.Resampling.LANCZOS)
    sheet.paste(northwest, (720, 40))
    draw.text((734, 10), "northwest coast repair", fill=(235, 239, 241), font=font)
    north_coast = flattened.crop((3000, 650, 5200, 1700)).resize((720, 540), Image.Resampling.LANCZOS)
    sheet.paste(north_coast, (0, 620))
    draw.text((14, 590), "north-central coast repair", fill=(235, 239, 241), font=font)
    baseline = local_mask(
        np.asarray(Image.open(BASELINE_MASK).convert("L")) >= 128,
        Image.Resampling.BICUBIC,
    )
    diff = np.zeros((*final_local.shape, 3), dtype=np.uint8)
    diff[baseline & final_local] = (112, 112, 112)
    diff[final_local & ~baseline] = (54, 218, 119)
    diff[baseline & ~final_local] = (235, 77, 75)
    diff_image = Image.fromarray(diff, "RGB").resize((720, 540), Image.Resampling.LANCZOS)
    sheet.paste(diff_image, (720, 620))
    draw.text((734, 590), "canonical diff: green add / red reshape", fill=(235, 239, 241), font=font)
    sheet.save(CONTACT_SHEET)


def main() -> None:
    parser = argparse.ArgumentParser()
    selection = parser.add_mutually_exclusive_group()
    selection.add_argument(
        "--global-only",
        action="store_true",
        help="Promote the canonical mask and global terrain derivatives, but defer regional LODs.",
    )
    selection.add_argument(
        "--regional-only",
        action="store_true",
        help="Reuse the promoted global terrain and rebuild only regional terrain/LOD outputs.",
    )
    arguments = parser.parse_args()
    require_sources()
    baseline, final, baseline_local, final_local = build_final_mask()
    if arguments.regional_only:
        expected_mask = Image.fromarray(final.astype(np.uint8) * 255, "L")
        if np.any(np.asarray(expected_mask) != np.asarray(Image.open(PRODUCTION_MASK).convert("L"))):
            raise RuntimeError("Regional-only build requires the promoted canonical mask.")
    else:
        Image.fromarray(final.astype(np.uint8) * 255, "L").save(AUTHORED_MASK)
        Image.fromarray(final.astype(np.uint8) * 255, "L").save(PRODUCTION_MASK)
        extend_global_sources(baseline, final)
        update_dem_manifest()
        build_global_land()

    before_runs = boundary_axis_runs(baseline_local)
    after_runs = boundary_axis_runs(final_local)
    global_metrics = {
        "baselineMaskSha256": sha256(BASELINE_MASK),
        "promotedMaskSha256": sha256(PRODUCTION_MASK),
        "addedLandPixels": int((final & ~baseline).sum()),
        "removedLandPixels": int((baseline & ~final).sum()),
        "localAddedLandPixels": int((final_local & ~baseline_local).sum()),
        "localRemovedLandPixels": int((baseline_local & ~final_local).sum()),
        "axisAlignedCoastRunBefore": before_runs,
        "axisAlignedCoastRunAfter": after_runs,
        "axisAlignedCoastRunCheckPassed": (
            after_runs["horizontal"] <= 40 and after_runs["vertical"] <= 30
        ),
    }
    result: dict = {"global": global_metrics, "regional": {}, "runtimeLods": {}}
    if not arguments.global_only:
        regional = patch_detail_master(final, baseline_local, final_local)
        runtime = build_runtime_lods()
        update_environment_manifest(runtime)
        build_contact_sheet(final_local)
        result["regional"] = regional
        result["runtimeLods"] = {
            tier: {key: value for key, value in item.items() if key != "path"}
            for tier, item in runtime.items()
        }
    VALIDATION.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))
    if not global_metrics["axisAlignedCoastRunCheckPassed"]:
        raise RuntimeError("The promoted B2 coastline still contains a long axis-aligned cut.")


if __name__ == "__main__":
    main()
