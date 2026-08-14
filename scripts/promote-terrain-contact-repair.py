from __future__ import annotations

import hashlib
import json
import os
import argparse
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = (
    ROOT
    / "art-source"
    / "career-world"
    / "ninjaone-environment"
    / "production-r2"
    / "ninjaone-environment-terrain-master-detail-r4.png"
)
OUTPUT_ROOT = (
    ROOT
    / "public"
    / "career-world"
    / "capitals"
    / "ninjaone"
    / "environment"
    / "plates"
    / "geology"
)
MANIFEST = (
    ROOT
    / "public"
    / "career-world"
    / "capitals"
    / "ninjaone"
    / "environment"
    / "manifests"
    / "environment-proof-r1.json"
)
INTEGRATION_REPORT = (
    ROOT
    / "art-source"
    / "career-world"
    / "ninjaone-environment"
    / "production-r2"
    / "seam-repair-r4"
    / "integration-report.json"
)
TIERS = {
    "territory": (720, 540),
    "capital": (1440, 1080),
    "site": (2880, 2160),
    "close": (5760, 4320),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def replace(source: Path, target: Path) -> None:
    os.replace(source, target)


def repair_c1_c2_lod_contact(image: Image.Image) -> Image.Image:
    repaired = image.convert("RGBA")
    pixels = repaired.load()
    width, height = repaired.size
    contact_y = height // 2
    for x in range(width // 2, width):
        current = pixels[x, contact_y]
        lower_near = pixels[x, contact_y + 1]
        lower_far = pixels[x, contact_y + 2]
        if current[3] == 0 or lower_near[3] == 0 or lower_far[3] == 0:
            continue
        corrected_channels = []
        for channel in range(3):
            extrapolated = max(
                0,
                min(255, lower_near[channel] * 2 - lower_far[channel]),
            )
            corrected_channels.append(round(current[channel] * 0.35 + extrapolated * 0.65))
        pixels[x, contact_y] = (*corrected_channels, current[3])
    return repaired


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Promote a verified terrain contact repair into one LOD cohort.",
    )
    parser.add_argument("--source", type=Path, default=SOURCE)
    parser.add_argument("--report", type=Path, default=INTEGRATION_REPORT)
    parser.add_argument("--revision", type=int, default=4)
    arguments = parser.parse_args()

    source_path = arguments.source.resolve()
    report_path = arguments.report.resolve()
    revision = arguments.revision
    if ROOT not in source_path.parents or ROOT not in report_path.parents:
        raise RuntimeError("Source and report must remain inside the repository.")
    if revision <= 0:
        raise RuntimeError("Revision must be positive.")

    report = json.loads(report_path.read_text(encoding="utf-8"))
    expected_output = str(source_path.relative_to(ROOT)).replace("\\", "/")
    if report.get("output") != expected_output:
        raise RuntimeError("Integration report does not describe the promoted source.")
    if report.get("outputSha256") != sha256(source_path):
        raise RuntimeError("Promoted source does not match the integration report hash.")
    if report.get("alphaPreserved") is not True:
        raise RuntimeError("Promotion requires byte-identical terrain alpha.")
    if report.get("projectionChanged") is not False:
        raise RuntimeError("Promotion refuses a terrain repair with projection drift.")

    with Image.open(source_path) as source_image:
        source = source_image.convert("RGBA")
    outputs: dict[str, dict[str, object]] = {}
    for tier, dimensions in TIERS.items():
        target = OUTPUT_ROOT / f"ninjaone-environment-geology-{tier}-r{revision}.webp"
        resized = source.resize(dimensions, Image.Resampling.LANCZOS)
        if "C1-C2" in report.get("contactIds", ()):
            resized = repair_c1_c2_lod_contact(resized)
        temporary = target.with_suffix(".next.webp")
        resized.save(temporary, "WEBP", quality=90, method=6, exact=True)
        replace(temporary, target)
        digest = sha256(target)
        outputs[tier] = {
            "path": f"/career-world/capitals/ninjaone/environment/plates/geology/{target.name}?v={digest[:12].lower()}",
            "dimensions": list(dimensions),
            "sha256": digest,
        }

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    geology = manifest["layers"]["geology"]
    geology["ownership"] = report.get("ownership") or (
        "canonical-mask-registered B1 B2 C1 C2 regional detail; semantic contact "
        "repairs use neighbor-context outpainting while preserving canonical alpha "
        "and geography; open water remains owned by the global water layer"
    )
    geology["sourcePath"] = (
        f"/{str(source_path.relative_to(ROOT)).replace(chr(92), '/')}"
    )
    geology["sourceSha256"] = sha256(source_path)
    geology["sources"] = outputs
    geology["contactRepair"] = {
        "method": report.get(
            "method",
            "neighbor-context-outpaint-narrow-band-composite",
        ),
        "reportPath": (
            f"/{str(report_path.relative_to(ROOT)).replace(chr(92), '/')}"
        ),
        "alphaPreserved": True,
        "projectionChanged": False,
        "contacts": report.get("contactIds") or [
            contact
            for contact, orientation in (("B1-B2", "east"), ("B1-C1", "south"))
            if orientation in report.get("contacts", ("east", "south"))
        ],
        "core": report["core"],
        "feather": report["feather"],
        "windowFeather": report["windowFeather"],
        "colorFieldRadius": report["colorFieldRadius"],
        "colorFieldMethod": report["colorFieldMethod"],
        "contactMethods": report.get("contactMethods"),
    }
    temporary_manifest = MANIFEST.with_suffix(".next.json")
    temporary_manifest.write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )
    replace(temporary_manifest, MANIFEST)
    print(json.dumps({"sourceSha256": sha256(source_path), "outputs": outputs}, indent=2))


if __name__ == "__main__":
    main()
