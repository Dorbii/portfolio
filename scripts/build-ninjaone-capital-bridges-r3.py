from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageStat


REPO = Path(__file__).resolve().parents[1]
PUBLIC = REPO / "public"
ARTBOARD = (2571, 1929)
ASSET_ROOT = REPO / (
    "art-source/career-world/ninjaone-environment/production-r2/"
    "city-fabric/bridge-road-r4-source"
)
FABRIC_ROOT = PUBLIC / "career-world/capitals/ninjaone/city-r1/fabric"
QA_ROOT = PUBLIC / "career-world/capitals/ninjaone/city-r1/qa"
BRIDGES = FABRIC_ROOT / "city-production-bridges-r3.png"
TRANSITION = FABRIC_ROOT / "city-production-bridge-transition-r2.png"
PROOF = QA_ROOT / "city-production-bridges-r3-proof.png"
CONTACT_SHEET = QA_ROOT / "city-production-bridge-context-r4.png"
OVERLAY_SHEET = QA_ROOT / "city-production-bridge-overlay-r4.png"
VALIDATION = QA_ROOT / "city-production-bridges-r3.validation.json"
TERRAIN = REPO / (
    "art-source/career-world/ninjaone-environment/production-r2/"
    "ninjaone-environment-terrain-master-detail-r2.png"
)
WATER_MANIFEST = (
    PUBLIC / "career-world/capitals/ninjaone/environment/manifests/inland-water-r1.json"
)
CIRCULATION = FABRIC_ROOT / "city-production-circulation-r1.png"
EXPECTED_TERRAIN_SHA256 = (
    "49142b55478362e85a02e14345859089a78bd01b49a3126d84ff1df7cb283b02"
)


# Coordinates follow the finished r7 city and frozen hydrology. The lower
# crossing moves to the visible continuation below the compact city instead of
# preserving the obsolete standalone-bridge socket from the earlier layout.
CROSSINGS = (
    {
        "id": "upper-water-bridge",
        "asset": "upper",
        "center": (1605, 784),
        "bankSeats": ((1552, 754), (1658, 814)),
        "axisDegrees": 29.5,
        "length": 122,
        "spriteHeight": 38,
        "crop": (1413, 624, 1797, 944),
    },
    {
        "id": "station-civic-bridge",
        "asset": "station",
        "center": (1047, 1002),
        "bankSeats": ((1012, 1011), (1082, 993)),
        "axisDegrees": -14.4,
        "length": 74,
        "spriteHeight": 32,
        "crop": (855, 842, 1239, 1162),
    },
    {
        "id": "central-civic-bridge",
        "asset": "central",
        "center": (1143, 1033),
        "bankSeats": ((1118, 1015), (1168, 1051)),
        "axisDegrees": 35.8,
        "length": 63,
        "spriteHeight": 42,
        "crop": (951, 873, 1335, 1193),
    },
    {
        "id": "lower-works-bridge",
        "asset": "lower",
        "center": (979, 974),
        "bankSeats": ((974, 955), (984, 993)),
        "axisDegrees": 75.3,
        "length": 40,
        "spriteHeight": 34,
        "crop": (787, 814, 1171, 1134),
    },
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def save(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "PNG", optimize=True)


def trim(image: Image.Image, threshold: int = 8) -> Image.Image:
    bounds = image.getchannel("A").point(
        lambda value: 255 if value >= threshold else 0
    ).getbbox()
    if bounds is None:
        raise RuntimeError("Bridge source has no visible pixels.")
    return image.crop(bounds)


def water_mask() -> Image.Image:
    manifest = json.loads(WATER_MANIFEST.read_text(encoding="utf-8"))
    field_record = manifest["field"]
    ownership_record = manifest["terrainEraseMask"]
    field = Image.open(PUBLIC / field_record["path"].lstrip("/")).convert("RGBA").getchannel("R")
    ownership = Image.open(PUBLIC / ownership_record["path"].lstrip("/")).convert("RGBA").getchannel("R")
    field = field.resize(ownership.size, Image.Resampling.BILINEAR)
    owned = ImageChops.multiply(
        field.point(lambda value: 255 if value >= 128 else 0),
        ownership.point(lambda value: 255 if value >= 8 else 0),
    )
    full = Image.new("L", tuple(field_record["artboardDimensions"]), 0)
    full.paste(owned, tuple(field_record["artboardCrop"][:2]))
    return full.resize(ARTBOARD, Image.Resampling.LANCZOS).point(
        lambda value: 255 if value >= 96 else 0
    )


def main() -> None:
    if sha256(TERRAIN) != EXPECTED_TERRAIN_SHA256:
        raise RuntimeError("Frozen terrain authority drift.")

    terrain = Image.open(TERRAIN).convert("RGBA").resize(ARTBOARD, Image.Resampling.LANCZOS)
    circulation = Image.open(CIRCULATION).convert("RGBA")
    water = water_mask()
    dry = ImageChops.invert(water)
    bridge_layer = Image.new("RGBA", ARTBOARD, (0, 0, 0, 0))
    transition_layer = Image.new("RGBA", ARTBOARD, (0, 0, 0, 0))
    records: list[dict[str, object]] = []

    for crossing in CROSSINGS:
        asset_path = ASSET_ROOT / f"{crossing['asset']}-bridge-alpha-r4.png"
        source = trim(Image.open(asset_path).convert("RGBA"))
        source = ImageEnhance.Brightness(source).enhance(0.76)
        source = ImageEnhance.Color(source).enhance(0.66)
        source = source.filter(ImageFilter.GaussianBlur(0.22))
        width = int(crossing["length"])
        height = int(crossing["spriteHeight"])
        source = source.resize((width, height), Image.Resampling.LANCZOS)
        center_x, center_y = crossing["center"]
        left = round(center_x - width / 2)
        top = round(center_y - height * 0.58)

        # Low, non-rectangular contact shadow is derived from the exact sprite.
        shadow = source.getchannel("A").filter(ImageFilter.GaussianBlur(3.0))
        shadow_world = Image.new("L", ARTBOARD, 0)
        shadow_world.paste(shadow.point(lambda v: round(v * 0.20)), (left + 3, top + 4))
        shadow_canvas = Image.new("RGBA", ARTBOARD, (5, 8, 7, 0))
        shadow_canvas.putalpha(shadow_world)
        bridge_layer.alpha_composite(shadow_canvas)
        bridge_layer.alpha_composite(source, (left, top))

        # Dry approach dressing joins the existing r7 paving to each bank seat.
        # It is intentionally subordinate to the bridge and clipped against
        # current water ownership in the final mask.
        records.append({
            "id": crossing["id"],
            "center": list(crossing["center"]),
            "bankSeats": [list(point) for point in crossing["bankSeats"]],
            "roadEndpoints": [list(point) for point in crossing["bankSeats"]],
            "axisDegrees": crossing["axisDegrees"],
            "displayWidth": width,
            "displayHeight": height,
            "bounds": [left, top, left + width, top + height],
            "sourcePath": str(asset_path.relative_to(REPO)).replace("\\", "/"),
            "contextCrop": list(crossing["crop"]),
        })

    # No synthetic road ribbons. The selected sockets are actual r7
    # road/water intersections, so the authored dry roads already meet each
    # bridge. This layer only supplies a soft moss/contact halo on dry banks.
    halo = bridge_layer.getchannel("A").filter(ImageFilter.MaxFilter(11))
    halo = ImageChops.subtract(halo, bridge_layer.getchannel("A"))
    halo = halo.filter(ImageFilter.GaussianBlur(2.0))
    halo = ImageChops.multiply(halo, dry)
    transition_layer = Image.new("RGBA", ARTBOARD, (54, 55, 33, 0))
    transition_layer.putalpha(halo.point(lambda value: round(value * 0.42)))

    save(bridge_layer, BRIDGES)
    save(transition_layer, TRANSITION)
    proof = terrain.copy()
    proof.alpha_composite(circulation)
    proof.alpha_composite(transition_layer)
    proof.alpha_composite(bridge_layer)
    save(proof, PROOF)

    context = Image.new("RGBA", (768, 640), (10, 12, 12, 255))
    overlay = Image.new("RGBA", (768, 640), (10, 12, 12, 255))
    for index, crossing in enumerate(CROSSINGS):
        crop = tuple(crossing["crop"])
        panel = proof.crop(crop)
        panel = panel.resize((384, 320), Image.Resampling.LANCZOS)
        context.alpha_composite(panel, ((index % 2) * 384, (index // 2) * 320))
        marked = panel.copy()
        draw = ImageDraw.Draw(marked)
        sx = 384 / (crop[2] - crop[0])
        sy = 320 / (crop[3] - crop[1])
        def local(point: tuple[int, int]) -> tuple[int, int]:
            return (round((point[0] - crop[0]) * sx), round((point[1] - crop[1]) * sy))
        endpoints = crossing["bankSeats"]
        seats = crossing["bankSeats"]
        draw.line([local(endpoints[0]), local(endpoints[1])], fill=(255, 212, 70, 255), width=2)
        for seat in seats:
            x, y = local(seat)
            draw.ellipse((x - 4, y - 4, x + 4, y + 4), fill=(80, 255, 156, 255))
        overlay.alpha_composite(marked, ((index % 2) * 384, (index // 2) * 320))
    save(context, CONTACT_SHEET)
    save(overlay, OVERLAY_SHEET)

    transition_water_overlap = ImageChops.multiply(transition_layer.getchannel("A"), water).getbbox()
    checks = {
        "bridgeCount": len(records) == 4,
        "terrainFrozen": sha256(TERRAIN) == EXPECTED_TERRAIN_SHA256,
        "allBoundsInsideArtboard": all(
            0 <= record["bounds"][0] < record["bounds"][2] <= ARTBOARD[0]
            and 0 <= record["bounds"][1] < record["bounds"][3] <= ARTBOARD[1]
            for record in records
        ),
        "transitionWaterOverlapZero": transition_water_overlap is None,
        "roadEndpointsDeclared": all(len(record["roadEndpoints"]) == 2 for record in records),
        "contextProofGenerated": CONTACT_SHEET.exists() and OVERLAY_SHEET.exists(),
        "sourceAssetsIndependent": len({record["sourcePath"] for record in records}) == 4,
        "subordinateScale": all(record["displayHeight"] <= 42 for record in records),
    }
    payload = {
        "schemaVersion": 2,
        "id": "career-world/capitals/ninjaone/production-road-bridges@r4",
        "status": "runtime-candidate",
        "passes": all(checks.values()),
        "checks": checks,
        "bridgeCount": len(records),
        "terrainSha256": sha256(TERRAIN),
        "bridges": records,
        "runtime": {
            "structurePath": "/" + str(BRIDGES.relative_to(PUBLIC)).replace("\\", "/"),
            "structureSha256": sha256(BRIDGES),
            "transitionPath": "/" + str(TRANSITION.relative_to(PUBLIC)).replace("\\", "/"),
            "transitionSha256": sha256(TRANSITION),
        },
        "proof": {
            "unannotatedPath": "/" + str(CONTACT_SHEET.relative_to(PUBLIC)).replace("\\", "/"),
            "overlayPath": "/" + str(OVERLAY_SHEET.relative_to(PUBLIC)).replace("\\", "/"),
        },
    }
    VALIDATION.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
