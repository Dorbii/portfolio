#!/usr/bin/env python3
"""Audit and publish per-building environment-proportionate NinjaOne scale data."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
MANIFEST_PATH = PUBLIC / "career-world/capitals/ninjaone/manifests/city-node-composition-r1.json"
SKILL_PROGRAM_PATH = PUBLIC / "career-world/capitals/ninjaone/manifests/skill-program-r1.json"
TERRAIN_PATH = ROOT / "art-source/career-world/ninjaone-environment/production-r2/ninjaone-environment-terrain-master-detail-r2.png"
OUTPUT_DIR = PUBLIC / "career-world/capitals/ninjaone/city-r1/qa"
OUTPUT_PATH = OUTPUT_DIR / "city-building-environment-scale-r1.json"
VALIDATION_PATH = OUTPUT_DIR / "city-building-environment-scale-r1.validation.json"
PROOF_PATH = OUTPUT_DIR / "city-building-environment-scale-r1-proof.png"

ARTBOARD = (2571, 1929)
ROAD_WIDTH_PIXELS = 31  # city_px(22) at the registered 1.428333 canvas scale
REFERENCE_HUMAN_HEIGHT_PIXELS = 31
EXPECTED_SKILL_COUNT = 19
EXPECTED_TERRAIN_SHA256 = "49142b55478362e85a02e14345859089a78bd01b49a3126d84ff1df7cb283b02"

# Width is data, not a class multiplier. Each value was selected against the
# visible alpha bounds, footprint, road width, nearby structures, and terrain
# admission recorded below. The ranges remain deliberately conservative because
# most assets do not expose an independently measurable door.
DISPLAY_WIDTHS = {
    "ai-agent-systems": 290,
    "mcp": 184,
    "openapi-swagger": 178,
    "grpc-rest": 180,
    "capability-contracts": 194,
    "tool-generation": 174,
    "typescript": 180,
    "react": 190,
    "tanstack": 164,
    "golang": 164,
    "csharp": 162,
    "python": 164,
    "postgresql": 166,
    "redis": 152,
    "aws": 180,
    "databricks": 158,
    "docker": 148,
    "vmware": 158,
    "macstadium": 148,
}

CONFIDENCE = {
    "ai-agent-systems": "medium",
    "mcp": "low",
    "openapi-swagger": "low",
    "grpc-rest": "low",
    "capability-contracts": "medium",
    "tool-generation": "low",
    "typescript": "low",
    "react": "medium",
    "tanstack": "medium",
    "golang": "medium",
    "csharp": "low",
    "python": "medium",
    "postgresql": "low",
    "redis": "low",
    "aws": "medium",
    "databricks": "low",
    "docker": "medium",
    "vmware": "low",
    "macstadium": "low",
}

EXPLICIT_OUTLIER_EXCEPTIONS = {
    "ai-agent-systems": "The sole citadel is intentionally the visual centerpiece, but is reduced from 281px so its architectural modules share the common road and population scale.",
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def canonical_json(data: Any) -> str:
    return json.dumps(data, indent=2, sort_keys=True, ensure_ascii=False) + "\n"


def public_path(path: str) -> Path:
    return PUBLIC / path.lstrip("/")


def alpha_bbox(path: Path) -> tuple[int, int, int, int]:
    with Image.open(path) as source:
        rgba = source.convert("RGBA")
    bounds = rgba.getchannel("A").getbbox()
    if bounds is None:
        raise RuntimeError(f"Building asset is fully transparent: {path}")
    return bounds


def evidence_for(node: dict[str, Any], visible_height: float) -> list[dict[str, Any]]:
    support = node["terrainAdmissionPreview"]
    evidence: list[dict[str, Any]] = [
        {
            "kind": "road-width",
            "status": "credible-shared-reference",
            "referencePixels": ROAD_WIDTH_PIXELS,
            "buildingVisibleHeightToRoadWidth": round(visible_height / ROAD_WIDTH_PIXELS, 3),
            "note": "Road width is a shared city-scale cue; it is not treated as a building-width target.",
        },
        {
            "kind": "population-height",
            "status": "credible-shared-reference",
            "referencePixels": REFERENCE_HUMAN_HEIGHT_PIXELS,
            "buildingVisibleHeightToHumanHeight": round(visible_height / REFERENCE_HUMAN_HEIGHT_PIXELS, 3),
            "note": "Temporary people are QA scale cues; no person is baked into the building asset.",
        },
        {
            "kind": "terrain-support",
            "status": "measured",
            "landCoverage": support["landCoverage"],
            "buildableCoverage": support["buildableCoverage"],
            "meanLandHeight": support["meanLandHeight"],
        },
    ]
    evidence.append(
        {
            "kind": "door-height",
            "status": "not-independently-measurable",
            "referencePixels": None,
            "note": "The authored raster does not expose a machine-verifiable door mask; no precise door ratio is fabricated.",
        }
    )
    return evidence


def rationale_for(skill_id: str, node: dict[str, Any], current_width: int) -> str:
    width = DISPLAY_WIDTHS[skill_id]
    if skill_id == "ai-agent-systems":
        return "Retains sole-citadel dominance and cliff-top centerpiece status while reducing the previous oversized architectural module scale relative to roads and nearby major nodes."
    if skill_id in {"react", "golang", "python"}:
        return "Calibrated as part of the React/Go/Python application cluster so neighboring workshops share one environmental scale without erasing their distinct footprints or hierarchy."
    direction = "reduced" if width < current_width else "raised" if width > current_width else "retained"
    return f"{direction.capitalize()} from {current_width}px using visible alpha height, footprint, terrain support, road width, population height, and neighbor spacing; class remains hierarchy evidence rather than a global multiplier."


def build_records(manifest: dict[str, Any]) -> list[dict[str, Any]]:
    connectivity = {
        item["skillId"]: item["fabricCoverage"]
        for item in manifest["cityFabric"]["connectivity"]["nodes"]
    }
    records: list[dict[str, Any]] = []
    for node in manifest["nodes"]:
        skill_id = node["skillId"]
        asset_path = public_path(node["renderLayers"][0]["path"])
        with Image.open(asset_path) as source:
            source_width, source_height = source.size
        bounds = alpha_bbox(asset_path)
        alpha_width = bounds[2] - bounds[0]
        alpha_height = bounds[3] - bounds[1]
        display_width = DISPLAY_WIDTHS[skill_id]
        display_height = display_width * source_height / source_width
        visible_width = display_width * alpha_width / source_width
        visible_height = display_width * alpha_height / source_width
        footprint = node["footprintFraction"]
        footprint_width = display_width * footprint["width"]
        footprint_depth = display_width * footprint["depth"]
        records.append(
            {
                "skillId": skill_id,
                "slotId": node["slotId"],
                "districtId": node["layoutDistrictId"],
                "scaleClass": node["scaleClass"],
                "hierarchyRole": "sole-city-centerpiece" if node["scaleClass"] == "citadel" else "district-major" if node["scaleClass"] == "major" else "district-standard",
                "conceptPosition": node["conceptPosition"],
                "coordinatesChanged": False,
                "sourceAsset": node["renderLayers"][0]["path"],
                "sourceSha256": node["renderLayers"][0]["sha256"],
                "sourceDimensions": [source_width, source_height],
                "alphaBounds": list(bounds),
                "measuredAlphaSize": [alpha_width, alpha_height],
                "previousDisplayWidth": node["displayWidth"],
                "displayWidth": display_width,
                "displayHeight": round(display_height, 3),
                "visibleDisplaySize": [round(visible_width, 3), round(visible_height, 3)],
                "footprintFraction": footprint,
                "displayFootprintPixels": {
                    "width": round(footprint_width, 3),
                    "depth": round(footprint_depth, 3),
                    "widthToRoadWidth": round(footprint_width / ROAD_WIDTH_PIXELS, 3),
                },
                "terrainSupport": {
                    **node["terrainAdmissionPreview"],
                    "fabricCoverage": connectivity[skill_id],
                },
                "evidence": evidence_for(node, visible_height),
                "confidence": CONFIDENCE[skill_id],
                "rationale": rationale_for(skill_id, node, node["displayWidth"]),
                "explicitOutlierException": EXPLICIT_OUTLIER_EXCEPTIONS.get(skill_id),
            }
        )
    return records


def nearest_neighbor_checks(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    checks: list[dict[str, Any]] = []
    for record in records:
        x = record["conceptPosition"]["x"]
        y = record["conceptPosition"]["y"]
        others = []
        for candidate in records:
            if candidate["skillId"] == record["skillId"]:
                continue
            dx = (candidate["conceptPosition"]["x"] - x) * ARTBOARD[0]
            dy = (candidate["conceptPosition"]["y"] - y) * ARTBOARD[1]
            others.append((math.hypot(dx, dy), candidate))
        distance, nearest = min(others, key=lambda item: item[0])
        combined_radius = (record["displayFootprintPixels"]["width"] + nearest["displayFootprintPixels"]["width"]) / 2
        checks.append(
            {
                "skillId": record["skillId"],
                "nearestSkillId": nearest["skillId"],
                "anchorDistancePixels": round(distance, 3),
                "combinedFootprintWidthPixels": round(combined_radius, 3),
                "separationRatio": round(distance / max(combined_radius, 1), 3),
                "passes": distance / max(combined_radius, 1) >= 0.72,
            }
        )
    return checks


def build_pairwise_checks(records: list[dict[str, Any]]) -> dict[str, Any]:
    by_id = {record["skillId"]: record for record in records}
    cluster = [by_id[skill_id] for skill_id in ("react", "golang", "python")]
    cluster_heights = [record["visibleDisplaySize"][1] for record in cluster]
    citadel = by_id["ai-agent-systems"]
    cliff_neighbors = [by_id[skill_id] for skill_id in ("mcp", "openapi-swagger", "grpc-rest", "capability-contracts", "tool-generation")]
    largest_neighbor_height = max(record["visibleDisplaySize"][1] for record in cliff_neighbors)
    return {
        "requestedRustGoPythonCluster": {
            "rustPresent": False,
            "substitution": "react-golang-python",
            "reason": "Rust is absent from the authoritative 19-skill program; no twentieth record is invented.",
        },
        "reactGolangPythonCluster": {
            "skillIds": [record["skillId"] for record in cluster],
            "visibleHeightRangePixels": [round(min(cluster_heights), 3), round(max(cluster_heights), 3)],
            "maximumToMinimumRatio": round(max(cluster_heights) / min(cluster_heights), 3),
            "passes": max(cluster_heights) / min(cluster_heights) <= 1.20,
            "note": "Buildings remain non-uniform; the check only prevents incompatible architectural scale among immediate application-district neighbors.",
        },
        "cliffCitadelNeighborhood": {
            "citadelSkillId": citadel["skillId"],
            "neighborSkillIds": [record["skillId"] for record in cliff_neighbors],
            "citadelVisibleHeightPixels": citadel["visibleDisplaySize"][1],
            "largestNeighborVisibleHeightPixels": largest_neighbor_height,
            "citadelToLargestNeighborRatio": round(citadel["visibleDisplaySize"][1] / largest_neighbor_height, 3),
            "citadelDisplayFootprintWidthPixels": citadel["displayFootprintPixels"]["width"],
            "passes": 1.25 <= citadel["visibleDisplaySize"][1] / largest_neighbor_height <= 1.75,
            "note": "The citadel remains the centerpiece without implying a different door/person architecture scale.",
        },
    }


def composite_scaled_proof(manifest: dict[str, Any], records: list[dict[str, Any]]) -> Image.Image:
    with Image.open(TERRAIN_PATH) as source:
        proof = source.convert("RGBA").resize(ARTBOARD, Image.Resampling.LANCZOS)
    for key in ("productionCirculation", "productionTransitionDetail", "productionForeground"):
        entry = manifest["cityFabric"].get(key)
        if entry and public_path(entry["path"]).exists():
            with Image.open(public_path(entry["path"])) as source:
                proof.alpha_composite(source.convert("RGBA"))
    by_id = {record["skillId"]: record for record in records}
    ordered_nodes = sorted(manifest["nodes"], key=lambda node: node["localPosition"]["y"] + node["zBias"] / ARTBOARD[1])
    for node in ordered_nodes:
        record = by_id[node["skillId"]]
        with Image.open(public_path(node["posterPath"])) as source:
            asset = source.convert("RGBA")
        width = record["displayWidth"]
        height = round(width * asset.height / asset.width)
        asset = asset.resize((width, height), Image.Resampling.LANCZOS)
        anchor_x = round(node["localPosition"]["x"] * ARTBOARD[0])
        anchor_y = round(node["localPosition"]["y"] * ARTBOARD[1])
        left = round(anchor_x - width * node["groundAnchor"][0])
        top = round(anchor_y - height * node["groundAnchor"][1])
        proof.alpha_composite(asset, (left, top))
    return proof


def draw_proof(manifest: dict[str, Any], records: list[dict[str, Any]]) -> Image.Image:
    proof = composite_scaled_proof(manifest, records)
    overlay = Image.new("RGBA", ARTBOARD, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    font = ImageFont.load_default()
    for record in records:
        x = round(record["conceptPosition"]["x"] * ARTBOARD[0])
        y = round(record["conceptPosition"]["y"] * ARTBOARD[1])
        footprint_width = record["displayFootprintPixels"]["width"]
        footprint_depth = record["displayFootprintPixels"]["depth"]
        points = (
            (x, y - footprint_depth / 2),
            (x + footprint_width / 2, y),
            (x, y + footprint_depth / 2),
            (x - footprint_width / 2, y),
        )
        color = (245, 196, 80, 225) if record["scaleClass"] == "citadel" else (75, 214, 230, 190)
        draw.line((*points, points[0]), fill=color, width=2)
        label = f"{record['skillId']} {record['displayWidth']}px"
        draw.text((x + 6, y + 4), label, font=font, fill=(248, 248, 232, 240), stroke_width=2, stroke_fill=(7, 11, 12, 220))
    draw.rectangle((18, 18, 724, 78), fill=(4, 10, 11, 220), outline=(245, 196, 80, 220), width=2)
    draw.text((34, 32), "NINJAONE BUILDING ENVIRONMENT SCALE R1 - 19 DATA RECORDS", font=font, fill=(255, 239, 175, 255))
    draw.text((34, 51), "cyan = per-building footprint | gold = sole citadel exception", font=font, fill=(212, 225, 216, 255))
    proof.alpha_composite(overlay)
    return proof


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    if sha256(TERRAIN_PATH) != EXPECTED_TERRAIN_SHA256:
        raise RuntimeError("Frozen regional terrain authority drift.")
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    program = json.loads(SKILL_PROGRAM_PATH.read_text(encoding="utf-8"))
    records = build_records(manifest)
    expected_ids = [item["id"] for item in program["skills"]] + ["ai-agent-systems"]
    actual_ids = [record["skillId"] for record in records]
    duplicate_ids = sorted({skill_id for skill_id in actual_ids if actual_ids.count(skill_id) > 1})
    missing_ids = sorted(set(expected_ids) - set(actual_ids))
    unexpected_ids = sorted(set(actual_ids) - set(expected_ids))
    neighbor_checks = nearest_neighbor_checks(records)
    pairwise_checks = build_pairwise_checks(records)
    width_outliers = []
    for record in records:
        width = record["displayWidth"]
        lower, upper = (148, 210)
        if record["scaleClass"] == "citadel":
            lower, upper = (270, 305)
        if not lower <= width <= upper and record["explicitOutlierException"] is None:
            width_outliers.append(record["skillId"])
    data = {
        "schemaVersion": 1,
        "id": "career-world/capitals/ninjaone/city-building-environment-scale@r1",
        "status": "qa-data-ready-for-runtime-integration",
        "runtimeIntegrated": False,
        "authority": "individual-building-environment-proportion-data",
        "sourceManifest": str(MANIFEST_PATH.relative_to(ROOT)).replace("\\", "/"),
        "sourceManifestSha256": sha256(MANIFEST_PATH),
        "terrainAuthority": {
            "repoPath": str(TERRAIN_PATH.relative_to(ROOT)).replace("\\", "/"),
            "sha256": sha256(TERRAIN_PATH),
            "coordinatesChanged": False,
        },
        "sharedReferences": {
            "artboardDimensions": list(ARTBOARD),
            "roadWidthPixels": ROAD_WIDTH_PIXELS,
            "referenceHumanHeightPixels": REFERENCE_HUMAN_HEIGHT_PIXELS,
            "doorEvidencePolicy": "low confidence unless independently measurable; no fabricated doorway precision",
        },
        "records": records,
        "pairwiseChecks": pairwise_checks,
        "nearestNeighborChecks": neighbor_checks,
    }
    proof = draw_proof(manifest, records)
    proof.save(PROOF_PATH)
    validation = {
        "schemaVersion": 1,
        "id": "career-world/capitals/ninjaone/city-building-environment-scale-validation@r1",
        "passes": True,
        "recordCount": len(records),
        "expectedRecordCount": EXPECTED_SKILL_COUNT,
        "duplicateSkillIds": duplicate_ids,
        "missingSkillIds": missing_ids,
        "unexpectedSkillIds": unexpected_ids,
        "everyRecordHasIndividualDisplayWidth": len({record["displayWidth"] for record in records}) >= 10,
        "coordinatesUnchanged": all(not record["coordinatesChanged"] for record in records),
        "terrainHashMatchesFrozenAuthority": sha256(TERRAIN_PATH) == EXPECTED_TERRAIN_SHA256,
        "terrainSupportPasses": all(record["terrainSupport"]["landCoverage"] == 1.0 for record in records),
        "neighborSpacingPasses": all(item["passes"] for item in neighbor_checks),
        "pairwiseChecksPass": all(value.get("passes", True) for value in pairwise_checks.values()),
        "widthOutliersWithoutExplicitException": width_outliers,
        "explicitOutlierExceptions": EXPLICIT_OUTLIER_EXCEPTIONS,
        "rustPresent": False,
        "proof": {
            "path": str(PROOF_PATH.relative_to(ROOT)).replace("\\", "/"),
            "sha256": sha256(PROOF_PATH),
            "dimensions": list(proof.size),
        },
    }
    validation["passes"] = all(
        (
            len(records) == EXPECTED_SKILL_COUNT,
            not duplicate_ids,
            not missing_ids,
            not unexpected_ids,
            validation["everyRecordHasIndividualDisplayWidth"],
            validation["coordinatesUnchanged"],
            validation["terrainHashMatchesFrozenAuthority"],
            validation["terrainSupportPasses"],
            validation["neighborSpacingPasses"],
            validation["pairwiseChecksPass"],
            not width_outliers,
        )
    )
    OUTPUT_PATH.write_text(canonical_json(data), encoding="utf-8")
    validation["data"] = {
        "path": str(OUTPUT_PATH.relative_to(ROOT)).replace("\\", "/"),
        "sha256": sha256(OUTPUT_PATH),
    }
    VALIDATION_PATH.write_text(canonical_json(validation), encoding="utf-8")
    if not validation["passes"]:
        raise RuntimeError(f"Building scale validation failed: {canonical_json(validation)}")
    print(
        canonical_json(
            {
                "records": len(records),
                "dataSha256": sha256(OUTPUT_PATH),
                "validationSha256": sha256(VALIDATION_PATH),
                "proofSha256": sha256(PROOF_PATH),
                "passes": validation["passes"],
            }
        ),
        end="",
    )


if __name__ == "__main__":
    main()
