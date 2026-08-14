from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = (
    ROOT
    / "art-source"
    / "career-world"
    / "ninjaone-environment"
    / "production-r2"
    / "ninjaone-environment-terrain-master-detail-r7.png"
)
OUTPUT = SOURCE.with_name("ninjaone-environment-terrain-master-detail-r8.png")
REPORT = SOURCE.parent / "seam-repair-r8" / "integration-report.json"

EXPECTED_SOURCE_SHA256 = (
    "C2DE4A7C711F1512E021B388495E8B4F59058EF81B1D94ABC16B2C36EFDF1670"
)
EXPECTED_DIMENSIONS = (5760, 4320)
CONTACT_Y = 2160
CONTACT_X_RANGE = (2880, 5760)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def channel_extrapolation(near: int, far: int) -> int:
    return max(0, min(255, near * 2 - far))


def adjacent_row_mae(
    pixels: Image.PixelAccess,
    first_y: int,
    second_y: int,
) -> float:
    total = 0
    samples = 0
    for x in range(*CONTACT_X_RANGE):
        first = pixels[x, first_y]
        second = pixels[x, second_y]
        if first[3] == 0 and second[3] == 0:
            continue
        for channel in range(3):
            total += abs(first[channel] - second[channel])
            samples += 1
    return total / samples


def main() -> None:
    if sha256(SOURCE) != EXPECTED_SOURCE_SHA256:
        raise RuntimeError("The r7 terrain authority changed; refusing a stale r8 repair.")

    with Image.open(SOURCE) as source_image:
        source = source_image.convert("RGBA")
    if source.size != EXPECTED_DIMENSIONS:
        raise RuntimeError("The r7 terrain authority dimensions changed.")

    original_bytes = source.tobytes()
    original_alpha = source.getchannel("A").tobytes()
    before_pixels = source.load()
    before_contact_mae = adjacent_row_mae(
        before_pixels,
        CONTACT_Y - 1,
        CONTACT_Y,
    )
    nearby_maes = [
        adjacent_row_mae(before_pixels, y, y + 1)
        for y in range(CONTACT_Y - 12, CONTACT_Y + 12)
        if y not in (CONTACT_Y - 1, CONTACT_Y)
    ]
    nearby_maes.sort()
    nearby_median_mae = nearby_maes[len(nearby_maes) // 2]

    repaired = source.copy()
    repaired_pixels = repaired.load()
    changed_pixels = 0
    for x in range(*CONTACT_X_RANGE):
        current = before_pixels[x, CONTACT_Y]
        lower_near = before_pixels[x, CONTACT_Y + 1]
        lower_far = before_pixels[x, CONTACT_Y + 2]
        if current[3] == 0 or lower_near[3] == 0 or lower_far[3] == 0:
            continue
        replacement = (
            channel_extrapolation(lower_near[0], lower_far[0]),
            channel_extrapolation(lower_near[1], lower_far[1]),
            channel_extrapolation(lower_near[2], lower_far[2]),
            current[3],
        )
        if replacement != current:
            repaired_pixels[x, CONTACT_Y] = replacement
            changed_pixels += 1

    if repaired.getchannel("A").tobytes() != original_alpha:
        raise RuntimeError("The r8 repair changed terrain alpha.")

    repaired_bytes = repaired.tobytes()
    changed_byte_offsets = [
        offset
        for offset, (before, after) in enumerate(zip(original_bytes, repaired_bytes))
        if before != after
    ]
    minimum_allowed = (CONTACT_Y * EXPECTED_DIMENSIONS[0] + CONTACT_X_RANGE[0]) * 4
    maximum_allowed = (CONTACT_Y * EXPECTED_DIMENSIONS[0] + CONTACT_X_RANGE[1]) * 4
    if any(
        offset < minimum_allowed
        or offset >= maximum_allowed
        or offset % 4 == 3
        for offset in changed_byte_offsets
    ):
        raise RuntimeError("The r8 repair escaped its one-row RGB fence.")

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    temporary_output = OUTPUT.with_suffix(".next.png")
    repaired.save(temporary_output, "PNG", optimize=True, compress_level=9)
    os.replace(temporary_output, OUTPUT)

    after_contact_mae = adjacent_row_mae(
        repaired_pixels,
        CONTACT_Y - 1,
        CONTACT_Y,
    )
    report = {
        "source": str(SOURCE.relative_to(ROOT)).replace("\\", "/"),
        "sourceSha256": EXPECTED_SOURCE_SHA256,
        "output": str(OUTPUT.relative_to(ROOT)).replace("\\", "/"),
        "outputSha256": sha256(OUTPUT),
        "dimensions": list(EXPECTED_DIMENSIONS),
        "alphaPreserved": True,
        "projectionChanged": False,
        "method": "deterministic-source-and-lod-contact-row-repair",
        "ownership": (
            "canonical-mask-registered B1 B2 C1 C2 regional detail; retained r7 "
            "neighbor-context repairs plus deterministic C1-C2 source and LOD "
            "contact correction preserve canonical alpha and geography; registered "
            "inland-water erase authority removes frozen channel residue"
        ),
        "core": 1,
        "feather": 0,
        "windowFeather": 0,
        "colorFieldRadius": 0,
        "colorFieldMethod": "one-row lower-neighbor gradient extrapolation",
        "contactMethods": {
            "south": "retained r7 feature-protected hard cuts",
            "east": "retained r7 generated-anchored contact",
            "C1-C2": "one-row lower-neighbor gradient extrapolation",
        },
        "contacts": ["south", "east", "C1-C2"],
        "contactIds": ["B1-B2", "B1-C1", "C1-C2"],
        "lodContactRepair": "apply a bounded 65-percent lower-neighbor gradient correction after each LOD resize",
        "repairFence": {
            "x": list(CONTACT_X_RANGE),
            "y": [CONTACT_Y, CONTACT_Y + 1],
            "channels": "RGB only where current and two lower source pixels are opaque",
        },
        "changedPixels": changed_pixels,
        "changedBytes": len(changed_byte_offsets),
        "qa": {
            "beforeAdjacentRowMae": round(before_contact_mae, 6),
            "afterAdjacentRowMae": round(after_contact_mae, 6),
            "nearbyMedianAdjacentRowMae": round(nearby_median_mae, 6),
        },
    }
    temporary_report = REPORT.with_suffix(".next.json")
    temporary_report.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    os.replace(temporary_report, REPORT)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
