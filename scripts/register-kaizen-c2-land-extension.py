"""Register the accepted Kaizen city footprint as land in the C2 shelf.

The city plate owns the visible settlement edge. This script only supplies
terrain beneath that alpha footprint and publishes the matching canonical land
mask so the water renderer and terrain renderer agree at the coast.
"""

from __future__ import annotations

import json
from pathlib import Path
import sys

from PIL import Image, ImageChops, ImageFilter


sys.dont_write_bytecode = True

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_ROOT = ROOT / "public" / "career-world" / "layers"
SEMANTIC_MANIFEST = (
    PUBLIC_ROOT
    / "structures"
    / "manifests"
    / "kaizen-semantic-assets-r1.json"
)
CITY_PLATE = (
    PUBLIC_ROOT
    / "structures"
    / "textures"
    / "ambient"
    / "kaizen-agent"
    / "kaizen-city-foundation-integrated-r1.png"
)
DETAIL_TERRAIN = (
    PUBLIC_ROOT
    / "territory-landform"
    / "textures"
    / "terrain-relief-r6-detail-4x.png"
)
SOURCE_MASK = (
    PUBLIC_ROOT
    / "territory-landform"
    / "masks"
    / "world-land-mask-r3.png"
)
OUTPUT_MASK = (
    PUBLIC_ROOT
    / "territory-landform"
    / "masks"
    / "world-land-mask-r4.png"
)
OUTPUT_EXTENSION = (
    PUBLIC_ROOT
    / "territory-landform"
    / "textures"
    / "kaizen-c2-land-extension-r1.png"
)


def _registered_box(
    size: tuple[int, int],
    origin: tuple[float, float],
    span: tuple[float, float],
) -> tuple[int, int, int, int]:
    width, height = size
    return (
        round(origin[0] * width),
        round(origin[1] * height),
        round((origin[0] + span[0]) * width),
        round((origin[1] + span[1]) * height),
    )


def main() -> None:
    manifest = json.loads(SEMANTIC_MANIFEST.read_text(encoding="utf-8"))
    anchor = tuple(float(value) for value in manifest["plateAnchor"])
    span = tuple(float(value) for value in manifest["plateSpan"])
    alignment_y = float(manifest["plateAlignmentY"])
    origin = (
        anchor[0] - span[0] * 0.5,
        anchor[1] - span[1] * alignment_y,
    )

    city = Image.open(CITY_PLATE).convert("RGBA")
    city_alpha = city.getchannel("A")
    terrain = Image.open(DETAIL_TERRAIN).convert("RGB")
    source_mask = Image.open(SOURCE_MASK).convert("L")

    terrain_box = _registered_box(terrain.size, origin, span)
    mask_box = _registered_box(source_mask.size, origin, span)
    terrain_crop = terrain.crop(terrain_box).resize(
        city.size,
        Image.Resampling.LANCZOS,
    )
    donor_origin = (origin[0], origin[1] + span[1] * 0.22)
    donor_box = _registered_box(terrain.size, donor_origin, span)
    donor_crop = terrain.crop(donor_box).resize(
        city.size,
        Image.Resampling.LANCZOS,
    )
    land_crop = source_mask.crop(mask_box).resize(
        city.size,
        Image.Resampling.BILINEAR,
    )
    filled_terrain = Image.composite(terrain_crop, donor_crop, land_crop)

    footprint = city_alpha.filter(ImageFilter.MaxFilter(31))
    obsolete_water = ImageChops.multiply(
        footprint,
        ImageChops.invert(land_crop),
    )
    extension_alpha = obsolete_water.filter(
        ImageFilter.GaussianBlur(radius=4.5),
    )
    extension_alpha = ImageChops.multiply(extension_alpha, footprint)
    extension = filled_terrain.convert("RGBA")
    extension.putalpha(extension_alpha)
    OUTPUT_EXTENSION.parent.mkdir(parents=True, exist_ok=True)
    extension.save(OUTPUT_EXTENSION, optimize=True)

    registered_alpha = city_alpha.resize(
        (mask_box[2] - mask_box[0], mask_box[3] - mask_box[1]),
        Image.Resampling.BILINEAR,
    ).filter(ImageFilter.MaxFilter(9))
    registered_land = registered_alpha.point(
        lambda value: 255 if value >= 12 else 0,
    )
    output_mask = source_mask.copy()
    existing_crop = output_mask.crop(mask_box)
    output_mask.paste(ImageChops.lighter(existing_crop, registered_land), mask_box)
    OUTPUT_MASK.parent.mkdir(parents=True, exist_ok=True)
    output_mask.save(OUTPUT_MASK, optimize=True)

    print(f"Wrote {OUTPUT_EXTENSION.relative_to(ROOT)}")
    print(f"Wrote {OUTPUT_MASK.relative_to(ROOT)}")
    print(f"Registered origin={origin} span={span}")


if __name__ == "__main__":
    main()
