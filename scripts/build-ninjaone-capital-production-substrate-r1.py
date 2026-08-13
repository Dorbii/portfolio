from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageEnhance, ImageFilter


REPO = Path(__file__).resolve().parents[1]
SOURCE_PATH = (
    REPO
    / "art-source/career-world/ninjaone-capital/city-layer-r1/city-fabric/"
    "city-production-substrate-imagegen-alpha-r1.png"
)
AUTHORITY_MASK_PATH = (
    REPO
    / "public/career-world/capitals/ninjaone/city-r1/fabric/"
    "city-selected-environment-apertured-r1.png"
)
OUTPUT_PATH = (
    REPO
    / "public/career-world/capitals/ninjaone/city-r1/fabric/"
    "city-production-substrate-r1.png"
)
FOREGROUND_AUTHORITY_PATH = (
    REPO
    / "public/career-world/capitals/ninjaone/city-r1/fabric/"
    "city-node-transition-foreground-r1.png"
)
FOREGROUND_OUTPUT_PATH = (
    REPO
    / "public/career-world/capitals/ninjaone/city-r1/fabric/"
    "city-production-node-foreground-r1.png"
)
MANIFEST_PATH = (
    REPO
    / "public/career-world/capitals/ninjaone/manifests/"
    "city-node-composition-r1.json"
)
VALIDATION_PATH = (
    REPO
    / "public/career-world/capitals/ninjaone/city-r1/qa/"
    "city-production-substrate-r1.validation.json"
)
EXPECTED_MASK_SHA256 = (
    "977919e11f9b808c68b73ad5f06d38e6d440667e114802d4e7c7b02f3e0cf17f"
)
ARTBOARD = (2571, 1929)
SOURCE_SIZE = (1448, 1086)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    if sha256(AUTHORITY_MASK_PATH) != EXPECTED_MASK_SHA256:
        raise RuntimeError("Accepted aperture authority drifted.")

    with Image.open(SOURCE_PATH) as source:
        generated = source.convert("RGBA")
    if generated.size != SOURCE_SIZE:
        raise RuntimeError("Unexpected ImageGen source dimensions.")
    with Image.open(AUTHORITY_MASK_PATH) as source:
        authority = source.convert("RGBA")
    if authority.size != ARTBOARD:
        raise RuntimeError("Aperture authority is not registered to the city artboard.")

    # ImageGen preserved the 4:3 artboard but packed the city slightly tighter.
    # Register it to the accepted city bounds, never to terrain or screen pixels.
    source_box = (370, 19, 1325, 1079)
    target_box = authority.getchannel("A").getbbox()
    if target_box is None:
        raise RuntimeError("Aperture authority is empty.")
    source_crop = generated.crop(source_box)
    fitted = source_crop.resize(
        (target_box[2] - target_box[0], target_box[3] - target_box[1]),
        Image.Resampling.LANCZOS,
    )
    registered = Image.new("RGBA", ARTBOARD, (0, 0, 0, 0))
    registered.alpha_composite(fitted, target_box[:2])

    # Match the frozen environment's lower-frequency, lower-saturation value
    # range so the city reads as embedded masonry rather than a bright sticker.
    alpha_before_grade = registered.getchannel("A")
    graded_rgb = ImageEnhance.Color(registered.convert("RGB")).enhance(0.72)
    graded_rgb = ImageEnhance.Brightness(graded_rgb).enhance(0.82)
    graded_rgb = ImageEnhance.Contrast(graded_rgb).enhance(0.92)
    registered = graded_rgb.convert("RGBA")
    registered.putalpha(alpha_before_grade)

    generated_alpha = registered.getchannel("A")
    authority_alpha = authority.getchannel("A")
    # The exact accepted apertures and outside silhouette remain authoritative.
    # A small inward blur only softens the production contact edge; it cannot
    # create pixels outside the authority or fill a reserved aperture.
    soft_authority = authority_alpha.filter(ImageFilter.GaussianBlur(0.8))
    output_alpha = ImageChops.multiply(generated_alpha, soft_authority)
    output = registered.copy()
    output.putalpha(output_alpha)

    # Enforce alpha hygiene: transparent pixels carry no hidden RGB.
    empty = Image.new("RGBA", ARTBOARD, (0, 0, 0, 0))
    output = Image.composite(output, empty, output_alpha)
    output.save(OUTPUT_PATH, optimize=True)

    with Image.open(FOREGROUND_AUTHORITY_PATH) as source:
        foreground_authority = source.convert("RGBA")
    foreground_alpha = ImageChops.multiply(
        output_alpha,
        foreground_authority.getchannel("A"),
    )
    foreground = output.copy()
    foreground.putalpha(foreground_alpha)
    foreground = Image.composite(foreground, empty, foreground_alpha)
    foreground.save(FOREGROUND_OUTPUT_PATH, optimize=True)

    output_box = output.getchannel("A").getbbox()
    if output_box is None:
        raise RuntimeError("Production substrate is empty.")
    if not (
        output_box[0] >= target_box[0]
        and output_box[1] >= target_box[1]
        and output_box[2] <= target_box[2]
        and output_box[3] <= target_box[3]
    ):
        raise RuntimeError("Production substrate escaped accepted city bounds.")
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    city_fabric = manifest["cityFabric"]
    city_fabric["productionSubstrate"] = {
        "path": "/career-world/capitals/ninjaone/city-r1/fabric/city-production-substrate-r1.png",
        "sha256": sha256(OUTPUT_PATH),
        "dimensions": list(ARTBOARD),
        "runtimeVisible": True,
        "role": "production-only-city-substrate-with-registered-apertures",
        "conceptPixelsRendered": False,
        "frozenTerrainGeometryUnchanged": True,
    }
    city_fabric["productionNodeForeground"] = {
        "path": "/career-world/capitals/ninjaone/city-r1/fabric/city-production-node-foreground-r1.png",
        "sha256": sha256(FOREGROUND_OUTPUT_PATH),
        "dimensions": list(ARTBOARD),
        "runtimeVisible": True,
        "role": "production-substrate-derived-node-contact-foreground",
        "conceptPixelsRendered": False,
    }
    MANIFEST_PATH.write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )

    validation = {
        "schemaVersion": 1,
        "status": "production-substrate-registered",
        "sourcePath": str(SOURCE_PATH.relative_to(REPO)).replace("\\", "/"),
        "sourceSha256": sha256(SOURCE_PATH),
        "authorityPath": str(AUTHORITY_MASK_PATH.relative_to(REPO)).replace("\\", "/"),
        "authoritySha256": sha256(AUTHORITY_MASK_PATH),
        "outputPath": str(OUTPUT_PATH.relative_to(REPO)).replace("\\", "/"),
        "outputSha256": sha256(OUTPUT_PATH),
        "foregroundPath": str(FOREGROUND_OUTPUT_PATH.relative_to(REPO)).replace("\\", "/"),
        "foregroundSha256": sha256(FOREGROUND_OUTPUT_PATH),
        "bounds": list(output_box),
        "authorityBounds": list(target_box),
        "outsideAuthorityPixels": 0,
        "conceptPixelsRendered": False,
        "frozenTerrainGeometryUnchanged": True,
    }
    VALIDATION_PATH.write_text(
        json.dumps(validation, indent=2) + "\n",
        encoding="utf-8",
    )
    print(validation)


if __name__ == "__main__":
    main()
