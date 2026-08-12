from __future__ import annotations

import importlib.util
import json
import math
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont


REPO = Path(__file__).resolve().parents[1]
BUILDER_PATH = REPO / "scripts/build-ninjaone-capital-city-nodes-r1.py"
LAYOUT_PATH = (
    REPO
    / "art-source/career-world/ninjaone-capital/city-layer-r1/"
    "concept-master-layout-registration-r1.json"
)
OUTPUT_PATH = (
    REPO
    / "public/career-world/capitals/ninjaone/city-r1/qa/"
    "city-master-layout-registration-r1.png"
)
VALIDATION_PATH = OUTPUT_PATH.with_suffix(".validation.json")
COMPARISON_PATH = OUTPUT_PATH.with_name("city-master-layout-reference-comparison-r1.png")
REFERENCE_TRACE_PATH = OUTPUT_PATH.with_name(
    "city-master-layout-reference-trace-r1.png"
)
HYDROLOGY_MANIFEST_PATH = (
    REPO
    / "public/career-world/capitals/ninjaone/environment/manifests/"
    "inland-water-r1.json"
)


def load_city_builder() -> Any:
    spec = importlib.util.spec_from_file_location("ninjaone_city_builder", BUILDER_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError("Unable to load the NinjaOne city builder.")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def font(size: int, semibold: bool = False) -> ImageFont.FreeTypeFont:
    name = "seguisb.ttf" if semibold else "segoeui.ttf"
    return ImageFont.truetype(str(Path("C:/Windows/Fonts") / name), size)


def draw_dashed_path(
    draw: ImageDraw.ImageDraw,
    points: list[tuple[int, int]],
    *,
    fill: tuple[int, int, int, int],
    width: int,
    dash: int = 18,
    gap: int = 12,
) -> None:
    for start, end in zip(points, points[1:]):
        dx = end[0] - start[0]
        dy = end[1] - start[1]
        length = math.hypot(dx, dy)
        if length <= 0:
            continue
        for offset in range(0, round(length), dash + gap):
            stop = min(offset + dash, length)
            draw.line(
                (
                    round(start[0] + dx * offset / length),
                    round(start[1] + dy * offset / length),
                    round(start[0] + dx * stop / length),
                    round(start[1] + dy * stop / length),
                ),
                fill=fill,
                width=width,
            )


def prepare_registered_hydrology_mask(city: Any) -> Image.Image:
    manifest = json.loads(HYDROLOGY_MANIFEST_PATH.read_text(encoding="utf-8"))
    field_path = REPO / "public" / manifest["field"]["path"].lstrip("/")
    with Image.open(field_path) as source:
        signed_distance = source.convert("RGBA").getchannel("R")
    crop_left, crop_top, crop_width, crop_height = manifest["field"]["artboardCrop"]
    artboard_width, artboard_height = manifest["registration"]["artboard"]
    crop_box = (
        round(crop_left / artboard_width * city.ARTBOARD[0]),
        round(crop_top / artboard_height * city.ARTBOARD[1]),
        round((crop_left + crop_width) / artboard_width * city.ARTBOARD[0]),
        round((crop_top + crop_height) / artboard_height * city.ARTBOARD[1]),
    )
    coverage = signed_distance.point(lambda value: 255 if value >= 128 else 0)
    coverage = coverage.resize(
        (max(1, crop_box[2] - crop_box[0]), max(1, crop_box[3] - crop_box[1])),
        Image.Resampling.NEAREST,
    )
    mask = Image.new("L", city.ARTBOARD, 0)
    mask.paste(coverage, crop_box[:2])
    return mask


def main() -> None:
    city = load_city_builder()
    layout = json.loads(LAYOUT_PATH.read_text(encoding="utf-8"))
    offset_x, offset_y = layout["conceptToCapitalTransform"]["offset"]
    scale_x, scale_y = layout["conceptToCapitalTransform"]["scale"]

    def local(point: list[float]) -> tuple[float, float]:
        return offset_x + point[0] * scale_x, offset_y + point[1] * scale_y

    def pixel(point: list[float]) -> tuple[int, int]:
        x, y = local(point)
        return round(x * city.ARTBOARD[0]), round(y * city.ARTBOARD[1])

    canvas = city.prepare_registered_terrain()
    canvas.alpha_composite(Image.new("RGBA", city.ARTBOARD, (3, 7, 8, 70)))
    annotations = Image.new("RGBA", city.ARTBOARD, (0, 0, 0, 0))
    draw = ImageDraw.Draw(annotations, "RGBA")

    district_colors = {
        "knowledge-api-citadel": (155, 116, 178, 32),
        "application-core": (104, 164, 120, 32),
        "infrastructure-works": (91, 145, 178, 32),
    }
    for district in layout["districts"]:
        points = [pixel(point) for point in district["conceptPolygon"]]
        color = district_colors[district["id"]]
        draw.polygon(points, fill=color, outline=(*color[:3], 218), width=5)
        label_x = sum(point[0] for point in points) // len(points)
        label_y = min(point[1] for point in points) + 28
        draw.text(
            (label_x, label_y),
            district["label"].upper(),
            anchor="mm",
            fill=(235, 232, 211, 238),
            font=font(15, True),
            stroke_width=3,
            stroke_fill=(3, 7, 8, 235),
        )

    for civic_space in layout["reservedCivicSpaces"]:
        center = pixel(civic_space["conceptPosition"])
        width = round(civic_space["envelope"][0] * city.ARTBOARD[0])
        height = round(civic_space["envelope"][1] * city.ARTBOARD[1])
        draw.ellipse(
            (
                center[0] - width // 2,
                center[1] - height // 2,
                center[0] + width // 2,
                center[1] + height // 2,
            ),
            fill=(225, 217, 186, 20),
            outline=(225, 217, 186, 205),
            width=4,
        )
        draw.text(
            center,
            civic_space["id"].replace("-", " ").upper(),
            anchor="mm",
            fill=(236, 231, 211, 238),
            font=font(11, True),
            stroke_width=3,
            stroke_fill=(3, 7, 8, 238),
        )

    canvas.alpha_composite(annotations)
    concept_annotations = annotations.copy()

    hydrology_mask = prepare_registered_hydrology_mask(city)
    hydrology_tint = Image.new("RGBA", city.ARTBOARD, (49, 171, 221, 0))
    hydrology_tint.putalpha(hydrology_mask.point(lambda value: round(value * 0.58)))
    canvas.alpha_composite(hydrology_tint)
    annotations = Image.new("RGBA", city.ARTBOARD, (0, 0, 0, 0))
    draw = ImageDraw.Draw(annotations, "RGBA")

    for rail_segment in layout["railSegments"]:
        rail_points = [pixel(point) for point in rail_segment["conceptPoints"]]
        if rail_segment["kind"] == "hidden-tunnel":
            draw_dashed_path(
                draw,
                rail_points,
                fill=(129, 189, 164, 238),
                width=7,
            )
        else:
            draw.line(
                rail_points,
                fill=(17, 20, 18, 224),
                width=18,
                joint="curve",
            )
            draw.line(
                rail_points,
                fill=(214, 170, 74, 238),
                width=5,
                joint="curve",
            )

    landmark_by_id = {item["id"]: item for item in layout["landmarks"]}
    bridge_records: list[dict[str, Any]] = []
    for landmark in layout["landmarks"]:
        center = pixel(landmark["conceptPosition"])
        if landmark["kind"] == "bridge":
            angle = math.radians(landmark["angleDegrees"])
            half_length = round(
                landmark["halfLengthNormalized"] * city.ARTBOARD[0]
            )
            dx = math.cos(angle) * half_length
            dy = math.sin(angle) * half_length
            endpoints = (
                (round(center[0] - dx), round(center[1] - dy)),
                (round(center[0] + dx), round(center[1] + dy)),
            )
            draw.line(
                (*endpoints[0], *endpoints[1]),
                fill=(238, 219, 151, 255),
                width=15,
            )
            draw.ellipse(
                (center[0] - 10, center[1] - 10, center[0] + 10, center[1] + 10),
                fill=(6, 12, 13, 235),
                outline=(238, 219, 151, 255),
                width=3,
            )
            endpoint_water_fractions: list[float] = []
            for endpoint_x, endpoint_y in endpoints:
                patch = hydrology_mask.crop(
                    (
                        endpoint_x - 7,
                        endpoint_y - 7,
                        endpoint_x + 8,
                        endpoint_y + 8,
                    )
                )
                histogram = patch.histogram()
                endpoint_water_fractions.append(
                    round(sum(histogram[64:]) / sum(histogram), 6)
                )
            line_water_samples = 0
            for step in range(-half_length, half_length + 1):
                sample_x = round(center[0] + math.cos(angle) * step)
                sample_y = round(center[1] + math.sin(angle) * step)
                line_water_samples += (
                    hydrology_mask.getpixel((sample_x, sample_y)) >= 64
                )
            center_water = hydrology_mask.getpixel(center) >= 64
            bridge_passes = (
                center_water
                and max(endpoint_water_fractions) <= 0.08
                and line_water_samples >= 3
            )
            bridge_records.append(
                {
                    "id": landmark["id"],
                    "center": list(center),
                    "endpoints": [list(endpoint) for endpoint in endpoints],
                    "centerWater": center_water,
                    "endpointWaterFractions": endpoint_water_fractions,
                    "lineWaterSamples": line_water_samples,
                    "passes": bridge_passes,
                }
            )
        else:
            visual_center = pixel(
                landmark.get("conceptVisualCenter", landmark["conceptPosition"])
            )
            envelope_width = round(
                landmark["targetVisibleEnvelope"][0] * city.ARTBOARD[0]
            )
            envelope_height = round(
                landmark["targetVisibleEnvelope"][1] * city.ARTBOARD[1]
            )
            if landmark["kind"] == "station":
                color = (231, 179, 72, 245)
            elif landmark["kind"] == "tunnel-portal":
                color = (129, 189, 164, 245)
            else:
                color = (189, 132, 220, 245)
            draw.rounded_rectangle(
                (
                    visual_center[0] - envelope_width // 2,
                    visual_center[1] - envelope_height // 2,
                    visual_center[0] + envelope_width // 2,
                    visual_center[1] + envelope_height // 2,
                ),
                radius=18,
                fill=(*color[:3], 18),
                outline=color,
                width=6,
            )
            draw.line(
                (*visual_center, *center),
                fill=(*color[:3], 220),
                width=3,
            )
            draw.ellipse(
                (center[0] - 7, center[1] - 7, center[0] + 7, center[1] + 7),
                fill=color,
            )
        draw.text(
            (center[0], center[1] - 54),
            landmark["id"].replace("-", " ").upper(),
            anchor="mm",
            fill=(244, 235, 205, 245),
            font=font(12, True),
            stroke_width=3,
            stroke_fill=(3, 7, 8, 238),
        )

    source_nodes = {node["skillId"]: node for node in city.NODES}
    with Image.open(city.LAND_MASK_PATH) as source:
        land = source.convert("L")
    with Image.open(city.SLOPE_PATH) as source:
        slope = source.convert("L")
    with Image.open(city.HEIGHT_PATH) as source:
        height = source.convert("L")

    admission_failures: list[str] = []
    socket_records: list[dict[str, Any]] = []
    scale_envelopes = {
        "citadel": (0.180, 0.230),
        "major": (0.085, 0.105),
        "standard": (0.070, 0.085),
    }
    for index, socket in enumerate(layout["skillSockets"], start=1):
        source_node = source_nodes[socket["skillId"]]
        local_x, local_y = local(socket["conceptPosition"])
        proof_node = dict(source_node)
        proof_node["localPosition"] = [local_x, local_y]
        metrics = city.terrain_footprint_metrics(proof_node, land, slope, height)
        accepted = metrics["landCoverage"] >= 1 and metrics["buildableCoverage"] >= 0.8
        if not accepted:
            admission_failures.append(socket["skillId"])
        center = (round(local_x * city.ARTBOARD[0]), round(local_y * city.ARTBOARD[1]))
        envelope_x, envelope_y = scale_envelopes[socket["scaleClass"]]
        radius_x = round(envelope_x * city.ARTBOARD[0] * 0.5)
        radius_y = round(envelope_y * city.ARTBOARD[1] * 0.5)
        color = (246, 198, 84, 245) if accepted else (255, 75, 53, 250)
        draw.ellipse(
            (
                center[0] - radius_x,
                center[1] - radius_y,
                center[0] + radius_x,
                center[1] + radius_y,
            ),
            fill=(*color[:3], 14),
            outline=color,
            width=4,
        )
        draw.text(
            center,
            f"{index:02d} {socket['skillId']}",
            anchor="mm",
            fill=(248, 241, 218, 255),
            font=font(11, True),
            stroke_width=3,
            stroke_fill=(3, 7, 8, 242),
        )
        socket_records.append(
            {
                "skillId": socket["skillId"],
                "localPosition": [round(local_x, 6), round(local_y, 6)],
                "scaleClass": socket["scaleClass"],
                "terrainAdmission": metrics,
                "passes": accepted,
            }
        )

    draw.rounded_rectangle((24, 22, 1010, 112), radius=14, fill=(5, 10, 11, 232))
    draw.text(
        (44, 38),
        "NINJAONE CAPITAL - CONCEPT MASTER SPATIAL REGISTRATION R1",
        fill=(238, 228, 195, 255),
        font=font(23, True),
    )
    draw.text(
        (44, 74),
        "identity-registered proof: concept-scale envelopes, 4 physical bridges, SSE rail, 19 skill sockets",
        fill=(170, 184, 178, 255),
        font=font(14),
    )
    canvas.alpha_composite(annotations)
    concept_annotations.alpha_composite(annotations)
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(OUTPUT_PATH, optimize=True)
    reference_native = Image.open(city.REFERENCE_PATH).convert("RGBA")
    reference_trace = concept_annotations.resize(
        reference_native.size,
        Image.Resampling.LANCZOS,
    )
    reference_annotated = reference_native.copy()
    reference_annotated.alpha_composite(reference_trace)
    reference_annotated.save(REFERENCE_TRACE_PATH, optimize=True)
    reference = reference_native.convert("RGB").resize(
        (900, 675),
        Image.Resampling.LANCZOS,
    )
    traced_reference = reference_annotated.convert("RGB").resize(
        (900, 675),
        Image.Resampling.LANCZOS,
    )
    proof_background = Image.new("RGBA", city.ARTBOARD, (3, 7, 8, 255))
    proof_background.alpha_composite(canvas)
    proof = proof_background.convert("RGB").resize(
        (900, 675), Image.Resampling.LANCZOS
    )
    comparison = Image.new("RGB", (2700, 750), (3, 7, 8))
    comparison.paste(reference, (0, 75))
    comparison.paste(traced_reference, (900, 75))
    comparison.paste(proof, (1800, 75))
    comparison_draw = ImageDraw.Draw(comparison)
    comparison_draw.text(
        (24, 24),
        "CONCEPT MASTER",
        fill=(238, 228, 195),
        font=font(23, True),
    )
    comparison_draw.text(
        (924, 24),
        "CONCEPT MASTER + SPATIAL TRACE",
        fill=(238, 228, 195),
        font=font(23, True),
    )
    comparison_draw.text(
        (1824, 24),
        "FROZEN-TERRAIN SPATIAL REGISTRATION",
        fill=(238, 228, 195),
        font=font(23, True),
    )
    comparison.save(COMPARISON_PATH, optimize=True)
    validation = {
        "schemaVersion": 1,
        "status": "layout-proof-only",
        "layoutPath": str(LAYOUT_PATH.relative_to(REPO)).replace("\\", "/"),
        "previewPath": str(OUTPUT_PATH.relative_to(REPO)).replace("\\", "/"),
        "comparisonPath": str(COMPARISON_PATH.relative_to(REPO)).replace("\\", "/"),
        "referenceTracePath": str(REFERENCE_TRACE_PATH.relative_to(REPO)).replace("\\", "/"),
        "skillSocketCount": len(socket_records),
        "bridgeCount": sum(item["kind"] == "bridge" for item in layout["landmarks"]),
        "bridgeFailures": [
            record["id"] for record in bridge_records if not record["passes"]
        ],
        "bridges": bridge_records,
        "stationCount": sum(item["kind"] == "station" for item in layout["landmarks"]),
        "citadelCount": sum(item["kind"] == "citadel" for item in layout["landmarks"]),
        "tunnelPortalCount": sum(
            item["kind"] == "tunnel-portal" for item in layout["landmarks"]
        ),
        "reservedCivicSpaceCount": len(layout["reservedCivicSpaces"]),
        "conceptRegistration": layout["conceptToCapitalTransform"],
        "railTopologyOverride": layout["railTopologyOverride"],
        "railSegments": [
            {"id": segment["id"], "kind": segment["kind"]}
            for segment in layout["railSegments"]
        ],
        "railExitDirection": layout["railTopologyOverride"]["exitEdge"],
        "terrainAdmissionFailures": admission_failures,
        "sockets": socket_records,
        "productionReady": False,
        "runtimeEligible": False
    }
    VALIDATION_PATH.write_text(json.dumps(validation, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(validation, indent=2))


if __name__ == "__main__":
    main()
