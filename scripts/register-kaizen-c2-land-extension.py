"""Register the accepted Kaizen city footprint into the C2 mainland.

The canonical land mask owns the resulting shelf. Terrain, coastline, and
water derivatives are rebuilt from that one boundary; no local terrain tile is
layered over the world plane.
"""

from __future__ import annotations

import json
from collections import deque
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
AUTHORED_SURFACE_SOURCE = (
    PUBLIC_ROOT
    / "territory-landform"
    / "sources"
    / "world-land-surface-authored-r9.png"
)
OUTPUT_AUTHORED_SURFACE = (
    PUBLIC_ROOT
    / "territory-landform"
    / "sources"
    / "world-land-surface-authored-r11.png"
)
OUTPUT_AUTHORED_SURFACE_DETAIL = (
    PUBLIC_ROOT
    / "territory-landform"
    / "sources"
    / "world-land-surface-authored-r11-detail-4x.png"
)
DETAIL_SCALE = 4
LAND_THRESHOLD = 128
CITY_ALPHA_THRESHOLD = 12
REGISTRATION_PADDING = (48, 48, 48, 48)
SHELF_CLOSING_KERNEL = 33
SHELF_ENVELOPE_KERNEL = 65
MATERIAL_BLEND_KERNEL = 25
MATERIAL_BLEND_RADIUS = 6.0
# Clone the actual C2 foothill material immediately southwest of the promoted
# shelf. The prior separately authored patch imitated this terrain at a lower
# spatial frequency, so it remained visibly soft at close LOD even after the
# native-detail route was added.
MATERIAL_DONOR_ORIGIN = (280, 205)


def _threshold(image: Image.Image, threshold: int) -> Image.Image:
    return image.point(lambda value: 255 if value >= threshold else 0)


def _fill_enclosed_water(binary_land: Image.Image) -> Image.Image:
    """Fill only water pockets that cannot reach the crop boundary."""

    width, height = binary_land.size
    pixels = bytearray(binary_land.tobytes())
    outside_water = bytearray(width * height)
    frontier: deque[int] = deque()

    def register_if_water(x: int, y: int) -> None:
        index = y * width + x
        if pixels[index] < LAND_THRESHOLD and not outside_water[index]:
            outside_water[index] = 1
            frontier.append(index)

    for x in range(width):
        register_if_water(x, 0)
        register_if_water(x, height - 1)
    for y in range(1, height - 1):
        register_if_water(0, y)
        register_if_water(width - 1, y)

    while frontier:
        index = frontier.popleft()
        x = index % width
        y = index // width
        if x > 0:
            register_if_water(x - 1, y)
        if x + 1 < width:
            register_if_water(x + 1, y)
        if y > 0:
            register_if_water(x, y - 1)
        if y + 1 < height:
            register_if_water(x, y + 1)

    for index, value in enumerate(pixels):
        if value < LAND_THRESHOLD and not outside_water[index]:
            pixels[index] = 255
    return Image.frombytes("L", binary_land.size, bytes(pixels))


def _author_contiguous_peninsula(
    existing_land: Image.Image,
    city_alpha: Image.Image,
) -> Image.Image:
    """Fill one broad C2 mainland shelf instead of tracing city pixels."""

    existing_binary = _threshold(existing_land, LAND_THRESHOLD)
    required_land = _threshold(city_alpha, CITY_ALPHA_THRESHOLD)
    required_guard = required_land.filter(ImageFilter.MaxFilter(7))
    shelf_envelope = required_land.filter(
        ImageFilter.MaxFilter(SHELF_ENVELOPE_KERNEL),
    )

    # Close the gap between the accepted mainland and the city footprint as
    # one terrain mass. Building-shaped dilation left narrow lobes and tiny
    # promoted fragments at the old shoreline; closing the combined land mass
    # produces the intended broad shelf and lets the terrain compiler reuse the
    # authored neighboring material underneath it.
    authored_shelf = ImageChops.lighter(existing_binary, required_guard)
    authored_shelf = authored_shelf.filter(
        ImageFilter.MaxFilter(SHELF_CLOSING_KERNEL),
    )
    authored_shelf = authored_shelf.filter(
        ImageFilter.MinFilter(SHELF_CLOSING_KERNEL),
    )
    authored_shelf = _fill_enclosed_water(authored_shelf)
    authored_shelf = _threshold(
        authored_shelf.filter(ImageFilter.GaussianBlur(radius=2.75)),
        88,
    )
    authored_shelf = ImageChops.multiply(authored_shelf, shelf_envelope)
    authored_shelf = ImageChops.lighter(authored_shelf, required_guard)
    return ImageChops.lighter(existing_binary, authored_shelf)


def _author_matching_land_material(
    source: Image.Image,
    base_land: Image.Image,
    composite_land: Image.Image,
) -> tuple[Image.Image, Image.Image]:
    """Clone neighboring C2 terrain into the promoted mainland shelf."""

    base_binary = _threshold(base_land, LAND_THRESHOLD)
    composite_binary = _threshold(composite_land, LAND_THRESHOLD)
    promoted_land = ImageChops.multiply(
        composite_binary,
        ImageChops.invert(base_binary),
    )
    blend_support = promoted_land.filter(
        ImageFilter.MaxFilter(MATERIAL_BLEND_KERNEL),
    )
    feather = blend_support.filter(
        ImageFilter.GaussianBlur(radius=MATERIAL_BLEND_RADIUS),
    )
    opaque_core = promoted_land.filter(ImageFilter.MaxFilter(5))
    blend_mask = ImageChops.lighter(feather, opaque_core)
    # Keep the complete Gaussian falloff inside the authored crop. Cropping to
    # blend_support cuts the feather at its rectangular bounds, which is
    # invisible at world scale but becomes a hard seam in the native 4x LOD.
    patch_box = blend_mask.getbbox()
    if patch_box is None:
        raise RuntimeError("The C2 terrain correction has no registered support.")
    expected_size = (
        patch_box[2] - patch_box[0],
        patch_box[3] - patch_box[1],
    )
    donor_box = (
        MATERIAL_DONOR_ORIGIN[0],
        MATERIAL_DONOR_ORIGIN[1],
        MATERIAL_DONOR_ORIGIN[0] + expected_size[0],
        MATERIAL_DONOR_ORIGIN[1] + expected_size[1],
    )
    if donor_box[2] > source.width or donor_box[3] > source.height:
        raise RuntimeError(
            "The C2 terrain donor no longer fits inside the authored source: "
            f"donor={donor_box}, source={source.size}."
        )
    authored_patch = source.crop(donor_box)

    output = source.copy()
    source_crop = source.crop(patch_box)
    local_blend = blend_mask.crop(patch_box)
    output.paste(
        Image.composite(authored_patch, source_crop, local_blend),
        patch_box,
    )

    detail_size = (
        source.width * DETAIL_SCALE,
        source.height * DETAIL_SCALE,
    )
    detail_patch_box = tuple(value * DETAIL_SCALE for value in patch_box)
    expected_detail_size = (
        expected_size[0] * DETAIL_SCALE,
        expected_size[1] * DETAIL_SCALE,
    )
    detail_output = source.resize(detail_size, Image.Resampling.LANCZOS)
    detail_donor_box = tuple(value * DETAIL_SCALE for value in donor_box)
    authored_detail_patch = detail_output.crop(detail_donor_box)
    if authored_detail_patch.size != expected_detail_size:
        raise RuntimeError(
            "The native C2 terrain donor no longer matches the promoted "
            f"support: expected {expected_detail_size}, got "
            f"{authored_detail_patch.size}."
        )
    detail_source_crop = detail_output.crop(detail_patch_box)
    detail_blend = local_blend.resize(
        expected_detail_size,
        Image.Resampling.LANCZOS,
    )
    detail_output.paste(
        Image.composite(
            authored_detail_patch,
            detail_source_crop,
            detail_blend,
        ),
        detail_patch_box,
    )
    return output, detail_output


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


def _padded_box(
    box: tuple[int, int, int, int],
    size: tuple[int, int],
    padding: tuple[int, int, int, int],
) -> tuple[int, int, int, int]:
    left, top, right, bottom = box
    pad_left, pad_top, pad_right, pad_bottom = padding
    return (
        max(0, left - pad_left),
        max(0, top - pad_top),
        min(size[0], right + pad_right),
        min(size[1], bottom + pad_bottom),
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
    source_mask = Image.open(SOURCE_MASK).convert("L")
    authored_surface = Image.open(AUTHORED_SURFACE_SOURCE).convert("RGB")

    city_box = _registered_box(source_mask.size, origin, span)
    registration_box = _padded_box(
        city_box,
        source_mask.size,
        REGISTRATION_PADDING,
    )
    city_registration = city_alpha.resize(
        (city_box[2] - city_box[0], city_box[3] - city_box[1]),
        Image.Resampling.BILINEAR,
    )
    registered_alpha = Image.new(
        "L",
        (
            registration_box[2] - registration_box[0],
            registration_box[3] - registration_box[1],
        ),
        0,
    )
    registered_alpha.paste(
        city_registration,
        (
            city_box[0] - registration_box[0],
            city_box[1] - registration_box[1],
        ),
    )
    existing_crop = source_mask.crop(registration_box)
    authored_land = _author_contiguous_peninsula(
        existing_crop,
        registered_alpha,
    )
    output_mask = source_mask.copy()
    output_mask.paste(authored_land, registration_box)
    OUTPUT_MASK.parent.mkdir(parents=True, exist_ok=True)
    output_mask.save(OUTPUT_MASK, optimize=True)

    matching_surface, matching_detail_surface = _author_matching_land_material(
        authored_surface,
        source_mask,
        output_mask,
    )
    OUTPUT_AUTHORED_SURFACE.parent.mkdir(parents=True, exist_ok=True)
    matching_surface.save(OUTPUT_AUTHORED_SURFACE, optimize=True)
    matching_detail_surface.save(
        OUTPUT_AUTHORED_SURFACE_DETAIL,
        optimize=True,
    )

    print(f"Wrote {OUTPUT_MASK.relative_to(ROOT)}")
    print(f"Wrote {OUTPUT_AUTHORED_SURFACE.relative_to(ROOT)}")
    print(f"Wrote {OUTPUT_AUTHORED_SURFACE_DETAIL.relative_to(ROOT)}")
    print(
        "Registered "
        f"origin={origin} span={span} mainland_box={registration_box}"
    )


if __name__ == "__main__":
    main()
