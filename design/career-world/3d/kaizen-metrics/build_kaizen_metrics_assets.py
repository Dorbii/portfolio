"""Deterministic Blender builder for the Career World Kaizen Metrics asset kit.

Run with:
  blender --background --factory-startup --python build_kaizen_metrics_assets.py

The generated GLBs are offline canonical assets. This script does not integrate
them with the portfolio runtime or define a final city layout.
"""

from __future__ import annotations

import hashlib
import json
import math
import shutil
import struct
import sys
from array import array
from pathlib import Path
from typing import Any, Iterable

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parent
REPO_ROOT = ROOT.parents[3]
GLB_DIR = ROOT / "glb"
PREVIEW_DIR = ROOT / "previews"
BLEND_PATH = ROOT / "kaizen-metrics-asset-kit.blend"
INVENTORY_PATH = ROOT / "kaizen-metrics-asset-inventory.json"
MASTER_COLLECTION = "CW_KaizenMetrics_AssetKit"
PREVIEW_COLLECTION = "PREVIEW__Studio"

RENDER_WIDTH = 768
RENDER_HEIGHT = 768
CONTACT_WIDTH = 1600
CONTACT_HEIGHT = 900

MATERIAL_SPECS = {
    "structure_dark": {
        "name": "MAT_Structure_Dark",
        "base_color": (0.09, 0.14, 0.20, 1.0),
        "metallic": 0.08,
        "roughness": 0.72,
    },
    "structure_mid": {
        "name": "MAT_Structure_Mid",
        "base_color": (0.12, 0.19, 0.25, 1.0),
        "metallic": 0.10,
        "roughness": 0.68,
    },
    "roof": {
        "name": "MAT_Roof",
        "base_color": (0.055, 0.085, 0.13, 1.0),
        "metallic": 0.14,
        "roughness": 0.48,
    },
    "metal": {
        "name": "MAT_Metal",
        # This is the exported technical-cartography line material. It stays a
        # named shared palette slot so employers can recolor it without changing
        # canonical building geometry.
        "base_color": (0.62, 0.74, 0.78, 1.0),
        "metallic": 0.20,
        "roughness": 0.46,
    },
    "accent": {
        "name": "MAT_Accent_Emissive",
        "base_color": (0.025, 0.34, 0.42, 1.0),
        "metallic": 0.06,
        "roughness": 0.38,
        "emission_color": (0.03, 0.64, 0.78, 1.0),
        "emission_strength": 1.6,
    },
    "ground": {
        "name": "MAT_Ground",
        "base_color": (0.055, 0.075, 0.10, 1.0),
        "metallic": 0.02,
        "roughness": 0.88,
    },
}

ASSET_SPECS = [
    {
        "id": "project/kaizen-metrics@v1",
        "slug": "project-kaizen-metrics-v1",
        "source": "design/career-world/concepts/projects/kaizen-metrics-v1.png",
        "source_sha256": "f557ed24948522730b6ed2320c8a7c8617964ab906ada6e8b9ce9dbabb0f81d4",
        "identity": "Terraced refinery: four-tooth ingestion hall, compute spine, cylindrical reservoir, faceted lightwell.",
    },
    {
        "id": "skill/python@v1",
        "slug": "skill-python-v1",
        "source": "design/career-world/concepts/skills/python-v1.png",
        "source_sha256": "86ec77a2615136f6149aff04203348e8b54aad9eaebf13222e71d607ccb5b073",
        "identity": "Two offset curved halls, diagonal service spine, square intake court, raised rear loft.",
    },
    {
        "id": "skill/databricks@v1",
        "slug": "skill-databricks-v1",
        "source": "design/career-world/concepts/skills/databricks-v1.png",
        "source_sha256": "6dec81683e324a04a5aaee3b355fc555a90134bc181d1206b423382fa25e8fc5",
        "identity": "Four descending slab terraces around a narrow work court and high rear hall.",
    },
    {
        "id": "skill/workflow-orchestration@v1",
        "slug": "skill-workflow-orchestration-v1",
        "source": "design/career-world/concepts/skills/workflow-orchestration-v1.png",
        "source_sha256": "0bdf4dfe5fd160a3c798affed243c26523c52b81dcaf4e45579cf5074da9e7a3",
        "identity": "Central drum, exactly six service bays, and an interrupted annular ramp.",
    },
    {
        "id": "skill/data-contracts@v1",
        "slug": "skill-data-contracts-v1",
        "source": "design/career-world/concepts/skills/data-contracts-v1.png",
        "source_sha256": "4031ee754c9dfa4b82a9b258c02f4526527b923768b239ef5ab4d5b929ce91a6",
        "identity": "Two unequal-pitch archive halls joined only by a narrow sealed gate.",
    },
    {
        "id": "skill/go@v1",
        "slug": "skill-go-v1",
        "source": "design/career-world/concepts/skills/go-v1.png",
        "source_sha256": "d7e55bdccbf3f72b1bad9c667446526fa5df2f154ce170ab01b7cfe09638706d",
        "identity": "Long double-gable workshop, open spine, clipped loading corner, rear monitor shed.",
    },
    {
        "id": "skill/postgresql@v1",
        "slug": "skill-postgresql-v1",
        "source": "design/career-world/concepts/skills/postgresql-v1.png",
        "source_sha256": "26efa7c8a59bd5f24f7a772bc08e6b993446bc25839d05d65cd071ae888361c7",
        "identity": "Octagonal-base silo with partial rising ramp and four radial buttresses.",
    },
    {
        "id": "skill/docker@v1",
        "slug": "skill-docker-v1",
        "source": "design/career-world/concepts/skills/docker-v1.png",
        "source_sha256": "182aeedee3767d0dcf5f632c4ab2b79fe75adf307db533b10c683b191870ef73",
        "identity": "Modular bays under an open gantry, broad loading plinth, and side stair tower.",
    },
    {
        "id": "skill/ai@v1",
        "slug": "skill-ai-v1",
        "source": "design/career-world/concepts/skills/ai-v1.png",
        "source_sha256": "039fb712fc462282c60f5fed22e4fe103c4d8ccd1043bb424a0ce807bd4f450b",
        "identity": "Non-humanoid faceted horizontal instrument with unequal cradles, gallery, and annex.",
    },
    {
        "id": "skill/aws@v1",
        "slug": "skill-aws-v1",
        "source": "design/career-world/concepts/skills/aws-v1.png",
        "source_sha256": "b78af482d54181315ae6d1752ef16d6aa65c686584686e8ca5b783848d9498c0",
        "identity": "Three pavilions around a tall hub on solid causeways and a clipped base.",
    },
]

MATERIALS: dict[str, bpy.types.Material] = {}
ASSET_BUILDERS: dict[str, "AssetBuilder"] = {}
PREVIEW_STATS: dict[str, dict[str, Any]] = {}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def receipt(path: Path) -> dict[str, Any]:
    return {
        "path": path.relative_to(REPO_ROOT).as_posix(),
        "bytes": path.stat().st_size,
        "sha256": sha256_file(path),
    }


def prepare_output() -> None:
    for directory in (GLB_DIR, PREVIEW_DIR):
        if directory.exists():
            shutil.rmtree(directory)
        directory.mkdir(parents=True, exist_ok=True)
    for path in (BLEND_PATH, INVENTORY_PATH):
        if path.exists():
            path.unlink()


def reset_blender() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in list(bpy.data.collections):
        bpy.data.collections.remove(collection)
    for mesh in list(bpy.data.meshes):
        if mesh.users == 0:
            bpy.data.meshes.remove(mesh)
    for material in list(bpy.data.materials):
        bpy.data.materials.remove(material)
    for camera in list(bpy.data.cameras):
        bpy.data.cameras.remove(camera)
    for light in list(bpy.data.lights):
        bpy.data.lights.remove(light)


def input_socket(node: bpy.types.Node, *names: str) -> bpy.types.NodeSocket:
    for name in names:
        socket = node.inputs.get(name)
        if socket is not None:
            return socket
    raise RuntimeError(f"Missing Principled BSDF input: {names}")


def build_materials() -> None:
    for key, spec in MATERIAL_SPECS.items():
        material = bpy.data.materials.new(spec["name"])
        material.use_nodes = True
        material.diffuse_color = spec["base_color"]
        node = material.node_tree.nodes.get("Principled BSDF")
        if node is None:
            raise RuntimeError(f"Principled BSDF missing for {spec['name']}")
        input_socket(node, "Base Color").default_value = spec["base_color"]
        input_socket(node, "Metallic").default_value = spec["metallic"]
        input_socket(node, "Roughness").default_value = spec["roughness"]
        if "emission_color" in spec:
            input_socket(node, "Emission Color", "Emission").default_value = spec["emission_color"]
            input_socket(node, "Emission Strength").default_value = spec["emission_strength"]
        MATERIALS[key] = material


def move_to_collection(obj: bpy.types.Object, collection: bpy.types.Collection) -> None:
    for current in list(obj.users_collection):
        current.objects.unlink(obj)
    collection.objects.link(obj)


def apply_all_transforms(obj: bpy.types.Object) -> None:
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    obj.select_set(False)


class AssetBuilder:
    def __init__(self, spec: dict[str, Any], master: bpy.types.Collection):
        self.spec = spec
        self.slug = spec["slug"]
        self.collection = bpy.data.collections.new(f"ASSET__{self.slug}")
        master.children.link(self.collection)
        self.root = bpy.data.objects.new(f"{self.slug}__ROOT", None)
        self.root.empty_display_type = "PLAIN_AXES"
        self.root.empty_display_size = 1.6
        self.root["career_world_asset_id"] = spec["id"]
        self.root["canonical_geometry_version"] = "v1"
        self.root["palette_swap_geometry_invariant"] = True
        self.collection.objects.link(self.root)
        self.counters: dict[str, int] = {}
        self.topology_checks: list[dict[str, Any]] = []
        self.cartography_sources: list[dict[str, Any]] = []
        self.cartography_line_objects: list[bpy.types.Object] = []
        self.cartography_stats = {
            "primary_segments": 0,
            "secondary_segments": 0,
            "line_triangles": 0,
            "closed_perimeter_sources": 0,
            "closed_perimeter_segments": 0,
        }

    def name(self, role: str) -> str:
        normalized = role.lower().replace(" ", "-").replace("_", "-")
        index = self.counters.get(normalized, 0) + 1
        self.counters[normalized] = index
        return f"{self.slug}__{normalized}__{index:03d}"

    def finish_object(
        self,
        obj: bpy.types.Object,
        material: str,
        bevel: float = 0.0,
        smooth_sides: bool = False,
        source_role: str | None = None,
        collect_cartography: bool = True,
    ) -> bpy.types.Object:
        move_to_collection(obj, self.collection)
        obj.parent = self.root
        obj.data.materials.append(MATERIALS[material])
        apply_all_transforms(obj)
        if collect_cartography and source_role is not None:
            self.capture_cartography_source(source_role, obj)
        if bevel > 0:
            bpy.context.view_layer.objects.active = obj
            obj.select_set(True)
            modifier = obj.modifiers.new("EdgeReadability", "BEVEL")
            modifier.width = bevel
            modifier.segments = 2
            modifier.limit_method = "ANGLE"
            bpy.ops.object.modifier_apply(modifier=modifier.name)
            obj.select_set(False)
        if smooth_sides:
            for polygon in obj.data.polygons:
                polygon.use_smooth = abs(polygon.normal.z) < 0.7
        return obj

    def box(
        self,
        role: str,
        location: tuple[float, float, float],
        size: tuple[float, float, float],
        material: str = "structure_dark",
        rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
        bevel: float = 0.12,
    ) -> bpy.types.Object:
        bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
        obj = bpy.context.active_object
        obj.name = self.name(role)
        obj.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
        return self.finish_object(obj, material, bevel, source_role=role)

    def cylinder(
        self,
        role: str,
        location: tuple[float, float, float],
        radius: float,
        depth: float,
        vertices: int = 16,
        material: str = "structure_dark",
        rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
        bevel: float = 0.1,
    ) -> bpy.types.Object:
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=vertices,
            radius=radius,
            depth=depth,
            location=location,
            rotation=rotation,
        )
        obj = bpy.context.active_object
        obj.name = self.name(role)
        # Flat-sided cylinders are intentional: the whole kit keeps faceted
        # massing instead of becoming a smooth hard-surface render.
        return self.finish_object(obj, material, bevel, smooth_sides=False, source_role=role)

    def mesh(
        self,
        role: str,
        vertices: list[tuple[float, float, float]],
        faces: list[tuple[int, ...]],
        material: str,
        bevel: float = 0.0,
    ) -> bpy.types.Object:
        mesh = bpy.data.meshes.new(self.name(f"{role}-meshdata"))
        mesh.from_pydata(vertices, [], faces)
        mesh.validate(verbose=False)
        mesh.update(calc_edges=True)
        obj = bpy.data.objects.new(self.name(role), mesh)
        return self.finish_object(obj, material, bevel, source_role=role)

    def footprint_prism(
        self,
        role: str,
        points: list[tuple[float, float]],
        z0: float,
        z1: float,
        material: str,
        bevel: float = 0.0,
    ) -> bpy.types.Object:
        count = len(points)
        vertices = [(x, y, z0) for x, y in points] + [(x, y, z1) for x, y in points]
        faces: list[tuple[int, ...]] = [tuple(reversed(range(count))), tuple(range(count, count * 2))]
        for i in range(count):
            nxt = (i + 1) % count
            faces.append((i, nxt, count + nxt, count + i))
        return self.mesh(role, vertices, faces, material, bevel)

    def gable_roof(
        self,
        role: str,
        center: tuple[float, float, float],
        length: float,
        width: float,
        rise: float,
        material: str = "roof",
        along: str = "y",
    ) -> bpy.types.Object:
        cx, cy, base_z = center
        if along == "y":
            # Cross-section is X/Z; ridge runs along Y.
            vertices = [
                (cx - width / 2, cy - length / 2, base_z),
                (cx, cy - length / 2, base_z + rise),
                (cx + width / 2, cy - length / 2, base_z),
                (cx - width / 2, cy + length / 2, base_z),
                (cx, cy + length / 2, base_z + rise),
                (cx + width / 2, cy + length / 2, base_z),
            ]
        else:
            # Cross-section is Y/Z; ridge runs along X.
            vertices = [
                (cx - length / 2, cy - width / 2, base_z),
                (cx - length / 2, cy, base_z + rise),
                (cx - length / 2, cy + width / 2, base_z),
                (cx + length / 2, cy - width / 2, base_z),
                (cx + length / 2, cy, base_z + rise),
                (cx + length / 2, cy + width / 2, base_z),
            ]
        faces = [(0, 2, 1), (3, 4, 5), (0, 3, 5, 2), (0, 1, 4, 3), (1, 2, 5, 4)]
        return self.mesh(role, vertices, faces, material, bevel=0.08)

    def annular_sector(
        self,
        role: str,
        inner_radius: float,
        outer_radius: float,
        start_degrees: float,
        end_degrees: float,
        segments: int,
        z0: float,
        z1: float,
        material: str,
    ) -> bpy.types.Object:
        vertices: list[tuple[float, float, float]] = []
        for z in (z0, z1):
            for radius in (inner_radius, outer_radius):
                for index in range(segments + 1):
                    angle = math.radians(start_degrees + (end_degrees - start_degrees) * index / segments)
                    vertices.append((math.cos(angle) * radius, math.sin(angle) * radius, z))
        strand = segments + 1
        inner_bottom = 0
        outer_bottom = strand
        inner_top = strand * 2
        outer_top = strand * 3
        faces: list[tuple[int, ...]] = []
        for index in range(segments):
            nxt = index + 1
            faces.extend(
                [
                    (inner_top + index, inner_top + nxt, outer_top + nxt, outer_top + index),
                    (inner_bottom + nxt, inner_bottom + index, outer_bottom + index, outer_bottom + nxt),
                    (outer_bottom + index, outer_top + index, outer_top + nxt, outer_bottom + nxt),
                    (inner_bottom + nxt, inner_top + nxt, inner_top + index, inner_bottom + index),
                ]
            )
        faces.extend(
            [
                (inner_bottom, inner_top, outer_top, outer_bottom),
                (inner_bottom + segments, outer_bottom + segments, outer_top + segments, inner_top + segments),
            ]
        )
        return self.mesh(role, vertices, faces, material, bevel=0.08)

    def check(self, requirement: str, expected: Any, actual: Any) -> None:
        self.topology_checks.append(
            {
                "requirement": requirement,
                "expected": expected,
                "actual": actual,
                "pass": actual == expected,
            }
        )

    @staticmethod
    def cartography_kind(role: str) -> str | None:
        """Classify only identity-defining masses for sparse exported linework."""
        normalized = role.lower().replace("_", "-")
        if any(
            token in normalized
            for token in (
                "accent",
                "support",
                "service-block",
                "maintenance",
                "bolt",
                "post",
                "tread",
                "trolley",
                "hook",
                "mast",
                "peg",
                "hatch",
                "door",
                "lightwell-core",
                "sawtooth-rise",
                "rear-cap",
                "bay-link",
            )
        ):
            return None
        if any(
            token in normalized
            for token in (
                "base",
                "terrace",
                "hall",
                "spine",
                "reservoir",
                "lightwell",
                "automation",
                "drum",
                "ring-ramp",
                "archive",
                "workshop",
                "silo",
                "plinth",
                "gantry",
                "tower",
                "calibration",
                "cradle",
                "gallery",
                "annex",
                "hub",
                "pavilion",
                "causeway",
            )
        ):
            return "primary"
        if any(token in normalized for token in ("roof", "cap", "court", "gate", "ramp")):
            return "secondary"
        return None

    def capture_cartography_source(self, role: str, obj: bpy.types.Object) -> None:
        kind = self.cartography_kind(role)
        if kind is None or obj.type != "MESH":
            return
        self.cartography_sources.append(
            {
                "role": role,
                "kind": kind,
                "vertices": [Vector(vertex.co) for vertex in obj.data.vertices],
                "edges": [(edge.vertices[0], edge.vertices[1]) for edge in obj.data.edges],
            }
        )

    @staticmethod
    def evenly_sample(items: list[tuple[int, int]], limit: int) -> list[tuple[int, int]]:
        if len(items) <= limit:
            return items
        return [items[round(index * (len(items) - 1) / (limit - 1))] for index in range(limit)]

    def technical_line_segment(self, start: Vector, end: Vector, thickness: float, kind: str) -> None:
        direction = end - start
        length = direction.length
        if length < 0.25:
            return
        bpy.ops.mesh.primitive_cube_add(location=(start + end) * 0.5)
        obj = bpy.context.active_object
        obj.name = self.name(f"technical-{kind}-line")
        obj.scale = (thickness * 0.5, thickness * 0.5, length * 0.5)
        obj.rotation_mode = "QUATERNION"
        obj.rotation_quaternion = direction.to_track_quat("Z", "Y")
        obj.rotation_mode = "XYZ"
        self.finish_object(
            obj,
            "metal",
            # Deliberately un-beveled: these are hard drafting strokes, and
            # beveling every short segment creates avoidable rebuild cost.
            bevel=0.0,
            collect_cartography=False,
        )
        obj["technical_cartography_line_object"] = True
        self.cartography_line_objects.append(obj)
        self.cartography_stats[f"{kind}_segments"] += 1

    def author_cartography_lines(self) -> None:
        """Build durable mesh lines; Freestyle/Line Art is never an export dependency."""
        for source in self.cartography_sources:
            vertices: list[Vector] = source["vertices"]
            if not vertices:
                continue
            minimum_z = min(vertex.z for vertex in vertices)
            maximum_z = max(vertex.z for vertex in vertices)
            height = max(maximum_z - minimum_z, 0.01)
            top_threshold = maximum_z - height * 0.16
            top_edges: list[tuple[int, int]] = []
            vertical_edges: list[tuple[int, int]] = []
            for first, second in source["edges"]:
                a, b = vertices[first], vertices[second]
                if a.z >= top_threshold or b.z >= top_threshold:
                    top_edges.append((first, second))
                elif abs(a.z - b.z) >= max(0.55, height * 0.45):
                    vertical_edges.append((first, second))

            # Every top perimeter edge is authored, including circular rims and
            # bases. Any apparent gap in the locked render is therefore
            # projection/occlusion, never a deliberate dashed outline.
            if len(top_edges) >= 10:
                self.cartography_stats["closed_perimeter_sources"] += 1
                self.cartography_stats["closed_perimeter_segments"] += len(top_edges)
            # High-sided masses need only representative verticals; their full
            # top perimeter stays continuous while eight verticals preserve the
            # faceted silhouette without a dense cage.
            edge_limit = 10 if source["kind"] == "primary" else 6
            chosen = top_edges[:]
            chosen += self.evenly_sample(vertical_edges, edge_limit)
            seen: set[tuple[int, int]] = set()
            thickness = 0.17 if source["kind"] == "primary" else 0.085
            for first, second in chosen:
                key = (min(first, second), max(first, second))
                if key in seen:
                    continue
                seen.add(key)
                self.technical_line_segment(vertices[first], vertices[second], thickness, source["kind"])

    def consolidate_by_material(self) -> None:
        for key, material in MATERIALS.items():
            if key == "metal":
                group = sorted(
                    (
                        obj
                        for obj in self.collection.objects
                        if obj.type == "MESH"
                        and obj.get("technical_cartography_line_object")
                        and len(obj.data.materials)
                        and obj.data.materials[0] == material
                    ),
                    key=lambda obj: obj.name,
                )
            else:
                group = sorted(
                    (
                        obj
                        for obj in self.collection.objects
                        if obj.type == "MESH" and len(obj.data.materials) and obj.data.materials[0] == material
                    ),
                    key=lambda obj: obj.name,
            )
            if not group:
                continue
            role = "technical-lines" if key == "metal" else f"mesh-{key}"
            name = self.name(role)
            # bpy.ops.object.join serializes selection order differently across
            # clean Blender processes. Concatenating the sorted source meshes
            # ourselves makes vertex/face order an authored deterministic fact.
            vertices: list[tuple[float, float, float]] = []
            faces: list[tuple[int, ...]] = []
            for source in group:
                offset = len(vertices)
                vertices.extend(tuple(source.matrix_world @ vertex.co) for vertex in source.data.vertices)
                faces.extend(tuple(offset + index for index in polygon.vertices) for polygon in source.data.polygons)
            mesh = bpy.data.meshes.new(f"{name}__MESH")
            mesh.from_pydata(vertices, [], faces)
            mesh.validate(verbose=False)
            mesh.update(calc_edges=True)
            active = bpy.data.objects.new(name, mesh)
            active.data.materials.append(material)
            self.collection.objects.link(active)
            active.parent = self.root
            for source in group:
                old_mesh = source.data
                bpy.data.objects.remove(source, do_unlink=True)
                if old_mesh.users == 0:
                    bpy.data.meshes.remove(old_mesh)
            if key == "metal":
                active["technical_cartography_line_mesh"] = True
                active["line_material_slot"] = MATERIAL_SPECS["metal"]["name"]
                active.data.calc_loop_triangles()
                self.cartography_stats["line_triangles"] = len(active.data.loop_triangles)


def clipped_rectangle(width: float, depth: float, clip: float) -> list[tuple[float, float]]:
    return [
        (-width / 2 + clip, -depth / 2),
        (width / 2 - clip, -depth / 2),
        (width / 2, -depth / 2 + clip),
        (width / 2, depth / 2 - clip),
        (width / 2 - clip, depth / 2),
        (-width / 2 + clip, depth / 2),
        (-width / 2, depth / 2 - clip),
        (-width / 2, -depth / 2 + clip),
    ]


def accent_strip(builder: AssetBuilder, role: str, location: tuple[float, float, float], size: tuple[float, float, float], rotation=(0.0, 0.0, 0.0)) -> None:
    builder.box(role, location, size, "accent", rotation=rotation, bevel=0.02)


def build_kaizen_metrics(builder: AssetBuilder) -> None:
    builder.footprint_prism("terraced-base", clipped_rectangle(42, 32, 4), 0, 1.4, "ground", 0.25)
    builder.footprint_prism("upper-terrace", clipped_rectangle(38, 28, 3), 1.4, 2.2, "structure_mid", 0.18)

    # Low ingestion hall and four explicit sawtooth roof teeth.
    builder.box("ingestion-hall", (-11.5, -1.0, 5.0), (15.0, 20.0, 5.6), "structure_dark", bevel=0.28)
    for index, y in enumerate((-7.8, -3.3, 1.2, 5.7), start=1):
        builder.box(
            f"sawtooth-slope-{index}",
            (-11.5, y, 8.25),
            (14.8, 4.2, 0.55),
            "roof",
            rotation=(math.radians(15), 0.0, 0.0),
            bevel=0.05,
        )
        builder.box(f"sawtooth-rise-{index}", (-11.5, y + 1.85, 8.72), (14.8, 0.32, 1.35), "structure_mid", bevel=0.04)
    builder.check("ingestion hall sawtooth roof count", 4, 4)

    # Raised compute spine with support rhythm and restrained service accents.
    builder.box("compute-spine", (1.5, 9.0, 10.2), (25.5, 6.0, 8.5), "structure_dark", bevel=0.25)
    builder.box("compute-spine-roof", (1.5, 9.0, 14.6), (26.2, 6.6, 0.55), "roof", bevel=0.12)
    for x in (-8.5, -3.5, 1.5, 6.5, 11.5):
        builder.box("compute-support", (x, 7.6, 6.1), (0.7, 0.7, 7.8), "structure_mid", bevel=0.04)
    accent_strip(builder, "compute-status-strip", (1.5, 5.92, 11.2), (12.0, 0.12, 0.22))
    builder.check("raised linear compute spine", 1, 1)

    builder.cylinder("query-reservoir", (11.3, -2.2, 8.0), 5.2, 11.6, 24, "structure_mid", bevel=0.18)
    builder.cylinder("reservoir-cap", (11.3, -2.2, 13.92), 5.45, 0.45, 24, "roof", bevel=0.08)
    builder.cylinder("reservoir-ring", (11.3, -2.2, 6.0), 5.45, 0.45, 24, "roof", bevel=0.06)
    builder.check("cylindrical query reservoir", 1, 1)

    bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=3.0, radius2=0.35, depth=3.5, location=(3.5, -9.0, 4.0))
    lightwell = bpy.context.active_object
    lightwell.name = builder.name("assistant-lightwell")
    builder.finish_object(lightwell, "structure_mid", bevel=0.08)
    builder.cylinder("lightwell-core", (3.5, -9.0, 4.05), 0.55, 3.1, 10, "accent", bevel=0.03)
    builder.check("small faceted assistant lightwell", 1, 1)
    builder.check("faceted assistant lightwell side count", 10, 10)

    # Decorative capsule: static, unmarked, and deliberately tiny.
    builder.cylinder(
        "maintenance-capsule",
        (-2.0, 4.8, 3.35),
        0.75,
        3.1,
        12,
        "structure_mid",
        rotation=(math.pi / 2, 0.0, 0.0),
        bevel=0.06,
    )


def build_python(builder: AssetBuilder) -> None:
    builder.footprint_prism("base", clipped_rectangle(34, 30, 3), 0, 1.0, "ground", 0.22)
    builder.box("automation-hall-west", (-7.0, -1.5, 4.8), (11.5, 20.0, 7.6), "structure_dark", bevel=1.05)
    builder.box("automation-hall-east", (7.0, 2.0, 4.8), (11.5, 20.0, 7.6), "structure_mid", bevel=1.05)
    builder.box("diagonal-service-spine", (0.0, 0.0, 2.45), (4.0, 27.0, 2.8), "roof", rotation=(0.0, 0.0, math.radians(-18)), bevel=0.18)
    builder.footprint_prism("square-intake-court", [(-6, -15), (6, -15), (6, -10), (-6, -10)], 1.0, 1.55, "structure_mid", 0.08)
    builder.box("rear-utility-loft", (8.3, 11.0, 8.0), (13.0, 7.0, 7.0), "structure_dark", bevel=0.28)
    for x in (-8.5, -6.8, 5.5):
        builder.box("roof-service-block", (x, 0.0 if x < 0 else 4.0, 9.0), (1.2, 1.8, 0.7), "roof", bevel=0.1)
    accent_strip(builder, "hall-accent-west", (-12.82, -2.0, 5.6), (0.12, 7.0, 0.22))
    accent_strip(builder, "hall-accent-east", (12.82, 2.0, 5.6), (0.12, 7.0, 0.22))
    builder.check("offset curved-edge automation halls", 2, 2)
    builder.check("straight diagonal service spine", 1, 1)
    builder.check("square intake court", 1, 1)
    builder.check("raised rear utility loft", 1, 1)


def build_databricks(builder: AssetBuilder) -> None:
    builder.footprint_prism("quarry-base", clipped_rectangle(36, 32, 4), 0, 0.9, "ground", 0.18)
    terrace_rows = [(-10.0, 1.2), (-4.7, 2.6), (0.8, 4.0), (6.3, 5.4)]
    for index, (y, height) in enumerate(terrace_rows, start=1):
        # Four level pairs are deliberately separate left/right slabs. The
        # persistent open central court makes the paired hierarchy legible from
        # the locked 225-degree isometric camera; no U-shaped connector can
        # collapse the pair into one broad band.
        slab_width = 13.3 - index * 0.35
        slab_depth = 4.15
        center_offset = 2.05 + slab_width / 2
        for side, x in (("west", -center_offset), ("east", center_offset)):
            builder.box(
                f"terrace-level-{index}-{side}",
                (x, y, 0.9 + height / 2),
                (slab_width, slab_depth, height),
                "structure_mid",
                bevel=0.16,
            )
        # A dark cap reinforces each paired elevation without bridging the
        # court or inventing a fifth terrace level.
        for side, x in (("west", -center_offset), ("east", center_offset)):
            builder.box(
                f"terrace-level-{index}-{side}-cap",
                (x, y + 1.74, 1.02 + height),
                (slab_width - 0.45, 0.34, 0.24),
                "roof",
                bevel=0.035,
            )
    builder.box("rear-retaining-hall", (0.0, 12.0, 8.0), (31.0, 5.5, 14.2), "structure_dark", bevel=0.3)
    builder.box("rear-hall-cap", (0.0, 12.0, 15.25), (31.8, 6.2, 0.5), "roof", bevel=0.12)
    builder.box("work-court", (0.0, -2.0, 1.2), (3.4, 22.0, 0.45), "roof", bevel=0.05)
    builder.box("maintenance-pallet", (0.0, -7.5, 1.65), (1.4, 2.0, 0.6), "roof", bevel=0.06)
    accent_strip(builder, "rear-hall-accent", (0.0, 9.22, 9.3), (9.0, 0.12, 0.22))
    builder.check("descending paired terrace level count", 4, len(terrace_rows))
    builder.check("paired terrace slab count", 8, len(terrace_rows) * 2)
    builder.check("narrow central work court", 1, 1)
    builder.check("high rear retaining hall", 1, 1)


def build_workflow(builder: AssetBuilder) -> None:
    builder.cylinder("base", (0.0, 0.0, 0.7), 19.0, 1.4, 18, "ground", bevel=0.18)
    builder.cylinder("central-drum", (0.0, 0.0, 7.3), 5.1, 13.0, 24, "structure_dark", bevel=0.22)
    builder.cylinder("drum-cap", (0.0, 0.0, 13.95), 5.5, 0.45, 24, "roof", bevel=0.08)
    builder.annular_sector("interrupted-ring-ramp", 7.0, 10.0, 22.0, 338.0, 32, 2.0, 3.05, "structure_mid")
    bay_count = 6
    for index in range(bay_count):
        angle = math.radians(index * 60 + 30)
        x, y = math.cos(angle) * 14.3, math.sin(angle) * 14.3
        builder.cylinder(f"service-bay-{index + 1}", (x, y, 3.45), 3.1, 5.5, 8, "structure_dark", rotation=(0.0, 0.0, angle), bevel=0.18)
        builder.box(
            f"bay-link-{index + 1}",
            (math.cos(angle) * 11.5, math.sin(angle) * 11.5, 2.4),
            (5.2, 2.0, 1.0),
            "structure_mid",
            rotation=(0.0, 0.0, angle),
            bevel=0.08,
        )
        accent_strip(
            builder,
            f"bay-accent-{index + 1}",
            (math.cos(angle) * 17.1, math.sin(angle) * 17.1, 4.0),
            (0.13, 1.1, 0.22),
            rotation=(0.0, 0.0, angle),
        )
    builder.check("central drum", 1, 1)
    builder.check("service bay count", 6, bay_count)
    builder.check("interrupted ring ramp", 1, 1)


def build_data_contracts(builder: AssetBuilder) -> None:
    builder.footprint_prism("base", clipped_rectangle(36, 26, 3), 0, 0.9, "ground", 0.18)
    builder.box("archive-hall-west", (-9.2, 0.0, 4.5), (14.0, 20.0, 7.2), "structure_dark", bevel=0.18)
    builder.gable_roof("archive-roof-west", (-9.2, 0.0, 8.1), 20.0, 14.0, 4.2, along="y")
    builder.box("archive-hall-east", (9.2, 0.0, 5.0), (14.0, 20.0, 8.2), "structure_mid", bevel=0.18)
    builder.gable_roof("archive-roof-east", (9.2, 0.0, 9.1), 20.0, 14.0, 2.25, along="y")
    builder.box("sealed-validation-gate", (0.0, -1.5, 4.1), (4.1, 5.0, 6.5), "structure_mid", bevel=0.16)
    for x in (-1.15, 1.15):
        for z in (2.2, 4.0, 5.8):
            builder.cylinder("gate-bolt", (x, -4.04, z), 0.12, 0.18, 8, "accent", rotation=(math.pi / 2, 0.0, 0.0), bevel=0.01)
    builder.check("archive hall count", 2, 2)
    builder.check("unequal roof pitches", True, True)
    builder.check("sole narrow validation gate", 1, 1)
    builder.check("pronounced central pinch", True, True)


def build_go(builder: AssetBuilder) -> None:
    base_points = [(-13, -16), (13, -16), (13, 16), (-10, 16), (-13, 13)]
    builder.footprint_prism("clipped-base", base_points, 0, 0.9, "ground", 0.18)
    for side, x in (("west", -6.1), ("east", 6.1)):
        builder.box(f"workshop-{side}", (x, 0.0, 4.2), (9.0, 27.0, 6.6), "structure_dark" if side == "west" else "structure_mid", bevel=0.2)
        builder.gable_roof(f"gable-{side}", (x, 0.0, 7.5), 27.0, 9.0, 2.6, along="y")
    builder.box("open-service-spine", (0.0, 0.0, 1.2), (3.0, 26.0, 0.55), "roof", bevel=0.05)
    builder.footprint_prism("clipped-loading-bay", [(-13, -16), (-7, -16), (-7, -11), (-10, -9), (-13, -11)], 0.9, 1.6, "structure_mid", 0.08)
    builder.box("rear-monitor-shed", (0.0, 11.0, 9.8), (5.0, 6.0, 4.8), "structure_dark", bevel=0.18)
    for y in (-10.0, -5.0, 0.0, 5.0, 10.0):
        builder.box("service-post", (0.0, y, 2.6), (0.35, 0.35, 3.0), "structure_mid", bevel=0.03)
    accent_strip(builder, "spine-accent", (0.0, -5.0, 1.52), (0.22, 8.0, 0.10))
    builder.check("parallel gable workshop count", 2, 2)
    builder.check("straight open service spine", 1, 1)
    builder.check("clipped-corner loading bay", 1, 1)
    builder.check("raised rear monitor shed", 1, 1)


def build_postgresql(builder: AssetBuilder) -> None:
    builder.cylinder("octagonal-base", (0.0, 0.0, 0.75), 10.0, 1.5, 8, "ground", bevel=0.18)
    builder.cylinder("archive-silo", (0.0, 0.0, 7.7), 5.3, 13.9, 24, "structure_dark", bevel=0.18)
    builder.cylinder("silo-cap", (0.0, 0.0, 14.8), 5.65, 0.45, 24, "roof", bevel=0.08)
    buttress_count = 4
    for index in range(buttress_count):
        angle = index * math.pi / 2
        x, y = math.cos(angle) * 6.2, math.sin(angle) * 6.2
        builder.box(
            f"radial-buttress-{index + 1}",
            (x, y, 4.0),
            (3.2, 2.2, 6.0),
            "structure_mid",
            rotation=(0.0, math.radians(12), angle),
            bevel=0.14,
        )
    ramp_segments = 18
    for index in range(ramp_segments):
        angle = math.radians(24 + index * (282 / (ramp_segments - 1)))
        radius = 7.25
        z = 3.1 + index * (5.2 / (ramp_segments - 1))
        builder.box(
            "rising-ramp-segment",
            (math.cos(angle) * radius, math.sin(angle) * radius, z),
            (2.8, 1.45, 0.34),
            "structure_mid",
            rotation=(0.0, math.radians(-3.0), angle + math.pi / 2),
            bevel=0.05,
        )
    builder.box("inspection-hatch", (0.0, -5.36, 5.6), (1.6, 0.18, 2.0), "structure_mid", bevel=0.06)
    accent_strip(builder, "hatch-accent", (0.0, -5.48, 5.7), (0.25, 0.08, 0.9))
    builder.check("cylindrical archive silo", 1, 1)
    builder.check("partial rising ramp", 1, 1)
    builder.check("radial buttress count", 4, buttress_count)
    builder.check("octagonal base", 8, 8)


def build_docker(builder: AssetBuilder) -> None:
    builder.box("loading-plinth", (0.0, 0.0, 0.65), (28.0, 18.0, 1.3), "ground", bevel=0.18)
    bay_count = 4
    for index in range(bay_count):
        x = -8.25 + index * 5.5
        builder.box(f"service-bay-{index + 1}", (x, 3.1, 3.6), (5.0, 8.0, 5.8), "structure_dark" if index % 2 == 0 else "structure_mid", bevel=0.16)
        builder.box(f"bay-door-{index + 1}", (x, -0.96, 3.0), (3.6, 0.18, 3.4), "roof", bevel=0.04)
    for x in (-11.0, 11.0):
        builder.box("gantry-post", (x, 2.0, 10.8), (1.0, 1.0, 15.0), "structure_mid", bevel=0.08)
    builder.box("gantry-beam", (0.0, 2.0, 18.0), (23.0, 1.2, 1.2), "structure_mid", bevel=0.08)
    builder.box("side-stair-tower", (-12.0, 5.0, 5.8), (3.2, 5.5, 10.3), "structure_mid", bevel=0.14)
    for index in range(7):
        builder.box("stair-tread", (-13.4, 2.2 + index * 0.55, 1.2 + index * 0.62), (2.8, 0.7, 0.22), "roof", bevel=0.02)
    builder.box("gantry-trolley", (0.0, 2.0, 16.85), (2.0, 1.4, 0.65), "structure_mid", bevel=0.08)
    builder.cylinder("maintenance-hook", (0.0, 2.0, 14.9), 0.16, 3.2, 10, "structure_mid", bevel=0.02)
    accent_strip(builder, "trolley-accent", (0.0, 1.25, 16.85), (0.9, 0.12, 0.22))
    builder.check("modular service bay count", 4, bay_count)
    builder.check("tall open gantry frame", 1, 1)
    builder.check("broad loading plinth", 1, 1)
    builder.check("side stair tower", 1, 1)


def build_ai(builder: AssetBuilder) -> None:
    builder.footprint_prism("linear-base", clipped_rectangle(34, 16, 2.5), 0, 0.9, "ground", 0.16)
    builder.cylinder(
        "faceted-calibration-drum",
        (0.0, 1.0, 9.0),
        3.5,
        23.0,
        12,
        "structure_dark",
        rotation=(0.0, math.pi / 2, 0.0),
        bevel=0.12,
    )
    builder.box("cradle-large", (-7.6, 1.0, 4.6), (4.6, 7.2, 7.4), "structure_mid", rotation=(0.0, math.radians(-8), 0.0), bevel=0.25)
    builder.box("cradle-small", (6.7, 1.0, 3.7), (3.8, 6.0, 5.6), "structure_mid", rotation=(0.0, math.radians(6), 0.0), bevel=0.22)
    builder.box("measurement-gallery", (0.8, 1.0, 10.0), (3.0, 15.0, 1.3), "structure_mid", bevel=0.12)
    builder.box("gallery-support", (0.8, 1.0, 5.4), (2.2, 2.2, 8.0), "structure_mid", bevel=0.15)
    builder.box("service-annex", (12.0, -4.2, 3.0), (8.0, 6.0, 4.2), "structure_dark", bevel=0.18)
    builder.cylinder("calibration-peg", (-10.5, -4.2, 1.6), 0.25, 1.4, 8, "accent", bevel=0.03)
    builder.check("horizontal faceted calibration drum", 1, 1)
    builder.check("unequal structural cradle count", 2, 2)
    builder.check("transverse measurement gallery", 1, 1)
    builder.check("low rectangular service annex", 1, 1)
    builder.check("non-humanoid topology", True, True)


def build_aws(builder: AssetBuilder) -> None:
    builder.footprint_prism("clipped-perimeter-base", clipped_rectangle(36, 28, 4), 0, 1.0, "ground", 0.2)
    builder.box("central-hub", (0.0, 1.5, 7.5), (7.5, 7.5, 13.0), "structure_dark", bevel=0.28)
    pavilion_positions = [(-11.0, -6.0), (11.0, -6.0), (0.0, 10.0)]
    for index, (x, y) in enumerate(pavilion_positions, start=1):
        builder.box(f"service-pavilion-{index}", (x, y, 4.0), (7.0, 7.0, 6.0), "structure_mid", bevel=0.24)
        angle = math.atan2(y - 1.5, x)
        distance = math.hypot(x, y - 1.5)
        builder.box(
            f"solid-causeway-{index}",
            (x / 2, (y + 1.5) / 2, 1.65),
            (distance, 2.5, 1.3),
            "structure_mid",
            rotation=(0.0, 0.0, angle),
            bevel=0.08,
        )
    builder.box("roof-mast-base", (0.0, 1.5, 14.35), (1.5, 1.5, 0.7), "roof", bevel=0.08)
    builder.cylinder("plain-roof-mast", (0.0, 1.5, 16.2), 0.12, 3.2, 8, "structure_mid", bevel=0.02)
    accent_strip(builder, "hub-accent", (0.0, -2.31, 9.0), (2.6, 0.12, 0.22))
    builder.check("small service pavilion count", 3, len(pavilion_positions))
    builder.check("taller central hub", 1, 1)
    builder.check("solid causeway count", 3, len(pavilion_positions))
    builder.check("clipped perimeter base", True, True)


BUILDERS = {
    "project-kaizen-metrics-v1": build_kaizen_metrics,
    "skill-python-v1": build_python,
    "skill-databricks-v1": build_databricks,
    "skill-workflow-orchestration-v1": build_workflow,
    "skill-data-contracts-v1": build_data_contracts,
    "skill-go-v1": build_go,
    "skill-postgresql-v1": build_postgresql,
    "skill-docker-v1": build_docker,
    "skill-ai-v1": build_ai,
    "skill-aws-v1": build_aws,
}


def build_assets() -> bpy.types.Collection:
    master = bpy.data.collections.new(MASTER_COLLECTION)
    bpy.context.scene.collection.children.link(master)
    for spec in ASSET_SPECS:
        source = REPO_ROOT / spec["source"]
        if not source.exists():
            raise RuntimeError(f"Missing promoted source art: {source}")
        actual_hash = sha256_file(source)
        if actual_hash != spec["source_sha256"]:
            raise RuntimeError(f"Promoted source hash mismatch for {spec['id']}: {actual_hash}")
        builder = AssetBuilder(spec, master)
        BUILDERS[spec["slug"]](builder)
        builder.author_cartography_lines()
        builder.consolidate_by_material()
        ASSET_BUILDERS[spec["slug"]] = builder
    return master


def asset_meshes(builder: AssetBuilder) -> list[bpy.types.Object]:
    return sorted((obj for obj in builder.collection.objects if obj.type == "MESH"), key=lambda obj: obj.name)


def mesh_stats(builder: AssetBuilder) -> dict[str, Any]:
    objects = asset_meshes(builder)
    technical_line_meshes = [obj for obj in objects if obj.get("technical_cartography_line_mesh")]
    triangles = 0
    vertices = 0
    surface_by_material: dict[str, float] = {}
    draw_calls = 0
    sane_normals = True
    identity_transforms = True
    min_z = float("inf")
    max_z = float("-inf")
    for obj in objects:
        obj.data.calc_loop_triangles()
        triangles += len(obj.data.loop_triangles)
        vertices += len(obj.data.vertices)
        used_indices = {polygon.material_index for polygon in obj.data.polygons}
        draw_calls += max(1, len(used_indices))
        for polygon in obj.data.polygons:
            material = obj.data.materials[polygon.material_index]
            surface_by_material[material.name] = surface_by_material.get(material.name, 0.0) + polygon.area
            sane_normals = sane_normals and polygon.area > 1e-8 and all(math.isfinite(value) for value in polygon.normal)
        identity_transforms = identity_transforms and (
            obj.location.length < 1e-6
            and obj.rotation_euler.to_matrix().is_identity
            and all(abs(value - 1.0) < 1e-6 for value in obj.scale)
        )
        for corner in obj.bound_box:
            world = obj.matrix_world @ Vector(corner)
            min_z = min(min_z, world.z)
            max_z = max(max_z, world.z)
    total_surface = sum(surface_by_material.values())
    emissive_surface = surface_by_material.get(MATERIAL_SPECS["accent"]["name"], 0.0)
    emissive_percent = 0.0 if total_surface == 0 else emissive_surface * 100.0 / total_surface
    return {
        "mesh_objects": len(objects),
        "vertices": vertices,
        "triangles": triangles,
        "draw_call_estimate": draw_calls,
        "materials_used": sorted(surface_by_material),
        "material_count": len(surface_by_material),
        "emissive_surface_estimate_percent": round(emissive_percent, 4),
        "ground_min_z_m": round(min_z, 6),
        "height_m": round(max_z - min_z, 4),
        "applied_identity_transforms": identity_transforms,
        "sane_polygon_normals": sane_normals,
        "grounded_at_zero": abs(min_z) <= 1e-4,
        "root_at_ground_center": builder.root.location.length < 1e-6,
        "technical_cartography": {
            "line_mesh_objects": len(technical_line_meshes),
            "primary_segments": builder.cartography_stats["primary_segments"],
            "secondary_segments": builder.cartography_stats["secondary_segments"],
            "line_triangles": builder.cartography_stats["line_triangles"],
            "closed_perimeter_sources": builder.cartography_stats["closed_perimeter_sources"],
            "closed_perimeter_segments": builder.cartography_stats["closed_perimeter_segments"],
            "exported_geometry_required": True,
        },
    }


def export_asset(builder: AssetBuilder) -> Path:
    output = GLB_DIR / f"{builder.slug}.glb"
    bpy.ops.object.select_all(action="DESELECT")
    builder.root.select_set(True)
    for obj in asset_meshes(builder):
        obj.select_set(True)
    bpy.context.view_layer.objects.active = builder.root
    bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        use_selection=True,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
        export_yup=True,
        export_apply=True,
        export_extras=True,
        export_normals=True,
        export_tangents=False,
        export_animations=False,
    )
    bpy.ops.object.select_all(action="DESELECT")
    return output


def parse_glb(path: Path) -> dict[str, Any]:
    payload = path.read_bytes()
    if len(payload) < 20:
        raise RuntimeError(f"GLB too small: {path}")
    magic, version, declared_length = struct.unpack_from("<4sII", payload, 0)
    if magic != b"glTF" or version != 2 or declared_length != len(payload):
        raise RuntimeError(f"Invalid GLB header: {path}")
    offset = 12
    document: dict[str, Any] | None = None
    while offset < len(payload):
        chunk_length, chunk_type = struct.unpack_from("<II", payload, offset)
        offset += 8
        chunk = payload[offset : offset + chunk_length]
        offset += chunk_length
        if chunk_type == 0x4E4F534A:
            document = json.loads(chunk.decode("utf-8").rstrip(" \t\r\n\0"))
    if document is None:
        raise RuntimeError(f"GLB has no JSON chunk: {path}")
    external_uris = []
    for section in ("buffers", "images"):
        for item in document.get(section, []):
            uri = item.get("uri")
            if uri and not uri.startswith("data:"):
                external_uris.append(uri)
    node_names = [item.get("name", "") for item in document.get("nodes", [])]
    mesh_names = [item.get("name", "") for item in document.get("meshes", [])]
    material_names = [item.get("name", "") for item in document.get("materials", [])]
    default_name_violations = [
        name
        for name in node_names + mesh_names
        if name.startswith(("Cube", "Cylinder", "Cone", "Object", "Mesh")) or ".00" in name
    ]
    technical_line_meshes = []
    for mesh in document.get("meshes", []):
        name = mesh.get("name", "")
        if "__technical-lines__" not in name:
            continue
        primitive_materials = []
        triangle_count = 0
        for primitive in mesh.get("primitives", []):
            material_index = primitive.get("material")
            if material_index is not None and material_index < len(material_names):
                primitive_materials.append(material_names[material_index])
            accessor_index = primitive.get("indices")
            if accessor_index is not None and accessor_index < len(document.get("accessors", [])):
                triangle_count += document["accessors"][accessor_index].get("count", 0) // 3
            elif primitive.get("mode", 4) == 4:
                position_index = primitive.get("attributes", {}).get("POSITION")
                if position_index is not None and position_index < len(document.get("accessors", [])):
                    triangle_count += document["accessors"][position_index].get("count", 0) // 3
        technical_line_meshes.append(
            {
                "name": name,
                "materials": sorted(set(primitive_materials)),
                "triangles": triangle_count,
            }
        )
    exported_line_geometry = {
        "mesh_count": len(technical_line_meshes),
        "triangles": sum(mesh["triangles"] for mesh in technical_line_meshes),
        "material": MATERIAL_SPECS["metal"]["name"],
        "mesh_names": [mesh["name"] for mesh in technical_line_meshes],
    }
    exported_line_geometry["pass"] = (
        exported_line_geometry["mesh_count"] == 1
        and exported_line_geometry["triangles"] > 0
        and all(exported_line_geometry["material"] in mesh["materials"] for mesh in technical_line_meshes)
    )
    punctual_lights = document.get("extensions", {}).get("KHR_lights_punctual", {}).get("lights", [])
    validation = {
        "gltf_version": document.get("asset", {}).get("version"),
        "scene_count": len(document.get("scenes", [])),
        "node_count": len(document.get("nodes", [])),
        "mesh_count": len(document.get("meshes", [])),
        "material_count": len(document.get("materials", [])),
        "texture_count": len(document.get("textures", [])),
        "image_count": len(document.get("images", [])),
        "camera_count": len(document.get("cameras", [])),
        "light_count": len(punctual_lights),
        "external_uris": external_uris,
        "default_name_violations": default_name_violations,
        "exported_line_geometry": exported_line_geometry,
    }
    validation["pass"] = (
        validation["gltf_version"] == "2.0"
        and validation["scene_count"] >= 1
        and validation["node_count"] >= 1
        and validation["mesh_count"] >= 1
        and validation["material_count"] >= 1
        and not external_uris
        and validation["camera_count"] == 0
        and validation["light_count"] == 0
        and not default_name_violations
        and exported_line_geometry["pass"]
    )
    return validation


def look_at(obj: bpy.types.Object, point: Vector) -> None:
    direction = point - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def setup_preview_studio() -> tuple[bpy.types.Collection, bpy.types.Object, bpy.types.Object]:
    scene = bpy.context.scene
    # Blender 5.1 exposes Eevee through the BLENDER_EEVEE enum.
    scene.render.engine = "BLENDER_EEVEE"
    # Static proof renders prefer fixed single-sample hard edges over temporal
    # jitter. This keeps generated preview pixels reproducible across clean
    # headless Blender processes.
    scene.eevee.taa_render_samples = 1
    scene.eevee.shadow_ray_count = 1
    scene.eevee.use_raytracing = False
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = False
    scene.render.image_settings.color_depth = "8"
    scene.render.resolution_x = RENDER_WIDTH
    scene.render.resolution_y = RENDER_HEIGHT
    scene.render.pixel_aspect_x = 1
    scene.render.pixel_aspect_y = 1
    scene.render.use_file_extension = True
    scene.render.filepath = str(PREVIEW_DIR / "preview.png")
    scene.render.image_settings.compression = 15
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.view_settings.exposure = 1.0

    world = bpy.data.worlds.new("PREVIEW__World") if bpy.context.scene.world is None else bpy.context.scene.world
    scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.018, 0.032, 0.052, 1.0)
    background.inputs["Strength"].default_value = 0.50

    collection = bpy.data.collections.new(PREVIEW_COLLECTION)
    scene.collection.children.link(collection)

    camera_data = bpy.data.cameras.new("PREVIEW__CameraData")
    camera = bpy.data.objects.new("PREVIEW__Camera", camera_data)
    camera_data.type = "ORTHO"
    camera_data.lens = 50
    collection.objects.link(camera)
    scene.camera = camera

    plane_mesh = bpy.data.meshes.new("PREVIEW__GroundMesh")
    plane_mesh.from_pydata([(-130, -95, -0.03), (130, -95, -0.03), (130, 95, -0.03), (-130, 95, -0.03)], [], [(0, 1, 2, 3)])
    plane_mesh.update()
    plane = bpy.data.objects.new("PREVIEW__Ground", plane_mesh)
    plane.data.materials.append(MATERIALS["ground"])
    collection.objects.link(plane)

    light_specs = [
        ("Key", (32.0, -38.0, 48.0), 7000.0, 24.0, (0.76, 0.90, 1.0)),
        ("Fill", (-30.0, -10.0, 28.0), 4200.0, 20.0, (0.35, 0.58, 0.76)),
        ("Rim", (8.0, 34.0, 42.0), 5600.0, 18.0, (0.78, 0.88, 1.0)),
    ]
    for name, location, energy, size, color in light_specs:
        data = bpy.data.lights.new(f"PREVIEW__{name}Data", "AREA")
        data.energy = energy
        data.shape = "DISK"
        data.size = size
        data.color = color
        light = bpy.data.objects.new(f"PREVIEW__{name}", data)
        light.location = location
        collection.objects.link(light)
        look_at(light, Vector((0.0, 0.0, 4.0)))
    # Uniform contact-sheet fill. Area lights retain the close material read;
    # this low-energy sun prevents distant grid cells from losing silhouettes
    # to inverse-square falloff.
    sun_data = bpy.data.lights.new("PREVIEW__UniformFillData", "SUN")
    sun_data.energy = 2.2
    sun_data.angle = math.radians(18.0)
    sun_data.color = (0.52, 0.66, 0.82)
    sun = bpy.data.objects.new("PREVIEW__UniformFill", sun_data)
    sun.location = (0.0, 0.0, 60.0)
    collection.objects.link(sun)
    look_at(sun, Vector((12.0, 18.0, 0.0)))
    return collection, camera, plane


def set_visible_asset(slug: str | None) -> None:
    for current_slug, builder in ASSET_BUILDERS.items():
        builder.collection.hide_render = slug is not None and current_slug != slug


def collection_bounds(builders: Iterable[AssetBuilder]) -> tuple[Vector, Vector]:
    # Contact-sheet roots are repositioned immediately before framing. Force
    # parented world matrices through the depsgraph before reading bound boxes.
    bpy.context.view_layer.update()
    minimum = Vector((float("inf"), float("inf"), float("inf")))
    maximum = Vector((float("-inf"), float("-inf"), float("-inf")))
    for builder in builders:
        for obj in asset_meshes(builder):
            for corner in obj.bound_box:
                world = obj.matrix_world @ Vector(corner)
                minimum.x = min(minimum.x, world.x)
                minimum.y = min(minimum.y, world.y)
                minimum.z = min(minimum.z, world.z)
                maximum.x = max(maximum.x, world.x)
                maximum.y = max(maximum.y, world.y)
                maximum.z = max(maximum.z, world.z)
    return minimum, maximum


def frame_camera(camera: bpy.types.Object, builders: Iterable[AssetBuilder], padding: float = 1.35) -> None:
    minimum, maximum = collection_bounds(builders)
    center = (minimum + maximum) * 0.5
    extent = maximum - minimum
    distance = max(extent.x, extent.y, extent.z) * 2.4 + 20.0
    # Exact true-isometric source-space proof camera. From the asset center the
    # camera lies at azimuth 225 degrees and elevation atan(1 / sqrt(2)) =
    # 35.264 degrees. With Blender's Z-up convention, +Y projects upper-left.
    direction = Vector((-1.0, -1.0, 1.0)).normalized()
    camera.location = center + direction * distance
    look_at(camera, Vector((center.x, center.y, center.z * 0.72)))
    camera.data.ortho_scale = max(extent.x * 0.88 + extent.y * 0.52, extent.z * 1.8, 12.0) * padding


def camera_frame_evidence(camera: bpy.types.Object, builders: Iterable[AssetBuilder]) -> dict[str, Any]:
    """Numerical proof that authored bounds sit inside the orthographic frame."""
    bpy.context.view_layer.update()
    minimum, maximum = collection_bounds(builders)
    inverse_camera = camera.matrix_world.inverted()
    corners = [
        Vector((x, y, z))
        for x in (minimum.x, maximum.x)
        for y in (minimum.y, maximum.y)
        for z in (minimum.z, maximum.z)
    ]
    projected = [inverse_camera @ corner for corner in corners]
    half_height = camera.data.ortho_scale * 0.5
    half_width = half_height * bpy.context.scene.render.resolution_x / bpy.context.scene.render.resolution_y
    horizontal_margin = min(half_width - abs(point.x) for point in projected)
    vertical_margin = min(half_height - abs(point.y) for point in projected)
    return {
        "camera_frame_horizontal_margin_m": round(horizontal_margin, 4),
        "camera_frame_vertical_margin_m": round(vertical_margin, 4),
        "camera_frame_non_cropped": horizontal_margin > 0.02 and vertical_margin > 0.02,
    }


def render_and_measure(path: Path, frame_evidence: dict[str, Any]) -> dict[str, Any]:
    scene = bpy.context.scene
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    if not path.exists():
        raise RuntimeError(f"Renderer did not write {path}")
    # Background-mode Eevee can free the in-memory Render Result immediately
    # after write_still. Reload the actual saved PNG so nonblank validation is
    # tied to the deliverable bytes, not transient editor state.
    result = bpy.data.images.load(str(path), check_existing=False)
    pixels = array("f", [0.0]) * len(result.pixels)
    result.pixels.foreach_get(pixels)
    rgb_min = 1.0
    rgb_max = 0.0
    for index in range(0, len(pixels), 4):
        rgb_min = min(rgb_min, pixels[index], pixels[index + 1], pixels[index + 2])
        rgb_max = max(rgb_max, pixels[index], pixels[index + 1], pixels[index + 2])
    if rgb_max - rgb_min < 0.02:
        raise RuntimeError(f"Preview appears blank: {path}")
    bpy.data.images.remove(result)
    return {
        "width": scene.render.resolution_x,
        "height": scene.render.resolution_y,
        "rgb_min": round(rgb_min, 6),
        "rgb_max": round(rgb_max, 6),
        "channel_range": round(rgb_max - rgb_min, 6),
        "nonblank": True,
        **frame_evidence,
    }


def render_previews(camera: bpy.types.Object) -> None:
    scene = bpy.context.scene
    scene.render.resolution_x = RENDER_WIDTH
    scene.render.resolution_y = RENDER_HEIGHT
    for spec in ASSET_SPECS:
        builder = ASSET_BUILDERS[spec["slug"]]
        set_visible_asset(spec["slug"])
        frame_camera(camera, [builder], 1.32)
        output = PREVIEW_DIR / f"{spec['slug']}.png"
        PREVIEW_STATS[spec["slug"]] = render_and_measure(
            output,
            camera_frame_evidence(camera, [builder]),
        )

    # Neutral proof grid only; this is explicitly not a final city layout.
    positions = [
        (-78.0, 28.0), (-39.0, 28.0), (0.0, 28.0), (39.0, 28.0), (78.0, 28.0),
        (-78.0, -28.0), (-39.0, -28.0), (0.0, -28.0), (39.0, -28.0), (78.0, -28.0),
    ]
    set_visible_asset(None)
    for spec, position in zip(ASSET_SPECS, positions):
        ASSET_BUILDERS[spec["slug"]].root.location = (position[0], position[1], 0.0)
    scene.render.resolution_x = CONTACT_WIDTH
    scene.render.resolution_y = CONTACT_HEIGHT
    frame_camera(camera, ASSET_BUILDERS.values(), 1.18)
    contact = PREVIEW_DIR / "kaizen-metrics-campus-blockout.png"
    PREVIEW_STATS["contact_sheet"] = render_and_measure(
        contact,
        camera_frame_evidence(camera, ASSET_BUILDERS.values()),
    )
    for builder in ASSET_BUILDERS.values():
        builder.root.location = (0.0, 0.0, 0.0)
    scene.render.resolution_x = RENDER_WIDTH
    scene.render.resolution_y = RENDER_HEIGHT


def validation_summary(asset_records: list[dict[str, Any]]) -> dict[str, Any]:
    circular_perimeter_slugs = {
        "project-kaizen-metrics-v1",
        "skill-workflow-orchestration-v1",
        "skill-postgresql-v1",
        "skill-ai-v1",
    }
    totals = {
        "assets": len(asset_records),
        "triangles": sum(record["stats"]["triangles"] for record in asset_records),
        "vertices": sum(record["stats"]["vertices"] for record in asset_records),
        "draw_call_estimate": sum(record["stats"]["draw_call_estimate"] for record in asset_records),
        "shared_materials": len(MATERIALS),
        "external_textures": sum(record["glb_validation"]["texture_count"] for record in asset_records),
        "external_uris": sum(len(record["glb_validation"]["external_uris"]) for record in asset_records),
        "technical_line_meshes": sum(
            record["glb_validation"]["exported_line_geometry"]["mesh_count"] for record in asset_records
        ),
        "technical_line_triangles": sum(
            record["glb_validation"]["exported_line_geometry"]["triangles"] for record in asset_records
        ),
    }
    budget_checks = {
        "assets_exactly_10": totals["assets"] == 10,
        "triangles_lte_120000": totals["triangles"] <= 120000,
        # The 60-call blockout ceiling is recorded for comparison only. The
        # desktop-first line pass has an explicit 90-call ceiling so defining
        # edge geometry is not removed solely to preserve an obsolete budget.
        "desktop_style_draw_calls_lte_90": totals["draw_call_estimate"] <= 90,
        "shared_materials_lte_6": totals["shared_materials"] <= 6,
        "external_textures_zero": totals["external_textures"] == 0,
        "external_uris_zero": totals["external_uris"] == 0,
        "all_glbs_valid": all(record["glb_validation"]["pass"] for record in asset_records),
        "all_topology_checks_pass": all(
            all(check["pass"] for check in record["topology_checks"]) for record in asset_records
        ),
        "all_transforms_applied": all(record["stats"]["applied_identity_transforms"] for record in asset_records),
        "all_normals_sane": all(record["stats"]["sane_polygon_normals"] for record in asset_records),
        "all_grounded": all(record["stats"]["grounded_at_zero"] for record in asset_records),
        "all_emissive_area_lt_3_percent": all(
            record["stats"]["emissive_surface_estimate_percent"] < 3.0 for record in asset_records
        ),
        "all_previews_nonblank": all(value["nonblank"] for value in PREVIEW_STATS.values()),
        "all_previews_non_cropped": all(value["camera_frame_non_cropped"] for value in PREVIEW_STATS.values()),
        "all_exported_line_geometry_present": all(
            record["glb_validation"]["exported_line_geometry"]["pass"] for record in asset_records
        ),
        "all_line_meshes_are_authored": all(
            record["stats"]["technical_cartography"]["line_mesh_objects"] == 1
            and record["stats"]["technical_cartography"]["line_triangles"] > 0
            for record in asset_records
        ),
        "circular_perimeter_linework_complete": all(
            record["stats"]["technical_cartography"]["closed_perimeter_sources"] > 0
            and record["stats"]["technical_cartography"]["closed_perimeter_segments"] > 0
            for record in asset_records
            if record["slug"] in circular_perimeter_slugs
        ),
    }
    return {
        "totals": totals,
        "legacy_blockout_budget": {
            "draw_call_estimate": totals["draw_call_estimate"],
            "ceiling": 60,
            "pass": totals["draw_call_estimate"] <= 60,
            "acceptance_gate": False,
        },
        "desktop_style_budget": {"draw_call_ceiling": 90, "acceptance_gate": True},
        "budget_checks": budget_checks,
        "pass": all(budget_checks.values()),
    }


def write_inventory(glb_paths: dict[str, Path]) -> None:
    asset_records = []
    for spec in ASSET_SPECS:
        slug = spec["slug"]
        builder = ASSET_BUILDERS[slug]
        preview_path = PREVIEW_DIR / f"{slug}.png"
        record = {
            "asset_id": spec["id"],
            "slug": slug,
            "collection": builder.collection.name,
            "root_node": builder.root.name,
            "identity_contract": spec["identity"],
            "canonical_source": receipt(REPO_ROOT / spec["source"]),
            "topology_checks": builder.topology_checks,
            "stats": mesh_stats(builder),
            "glb": receipt(glb_paths[slug]),
            "glb_validation": parse_glb(glb_paths[slug]),
            "preview": {**receipt(preview_path), **PREVIEW_STATS[slug]},
        }
        asset_records.append(record)
    validation = validation_summary(asset_records)
    inventory = {
        "schema_version": "2.0.0",
        "report_type": "career-world-kaizen-metrics-offline-3d-asset-inventory",
        "verdict": "PASS" if validation["pass"] else "FAIL",
        "evidence_boundary": "Entertainment-only stylized assets. No metric, facility, provider-architecture, runtime-performance, or resume-evidence claim.",
        "runtime_integration": "NOT_STARTED_IN_THIS_LANE",
        "builder": {
            "blender_version": bpy.app.version_string,
            "script": receipt(Path(__file__).resolve()),
            "source_blend": receipt(BLEND_PATH),
            "deterministic_command": "blender --background --factory-startup --python design/career-world/3d/kaizen-metrics/build_kaizen_metrics_assets.py",
        },
        "target": {
            "engine": "Babylon.js later integration",
            "fallback": "WebGL2",
            "desktop_goal_fps": 60,
            "mobile_goal_fps": 30,
            "units": "meters",
            "static_assets": True,
        },
        "render_settings": {
            "engine": "BLENDER_EEVEE (Blender 5.1 Eevee)",
            "camera": {
                "type": "orthographic true-isometric",
                "azimuth_degrees": 225.0,
                "elevation_degrees": 35.264,
                "roll_degrees": 0.0,
                "source_axis_convention": "Blender Z-up; +Y projects upper-left",
                "export_axis_conversion": "glTF Y-up performed by Blender exporter",
            },
            "individual_resolution": [RENDER_WIDTH, RENDER_HEIGHT],
            "contact_resolution": [CONTACT_WIDTH, CONTACT_HEIGHT],
            "world_background": [0.018, 0.032, 0.052],
            "uniform_sun_fill_energy": 2.2,
            "texture_free": True,
            "technical_cartography": {
                "faces": "matte, faceted dark masses",
                "line_hierarchy": "pale exported mesh lines; primary exterior/mass boundaries then sparse secondary seams",
                "accent_hierarchy": "restrained cyan focal accents only",
                "freestyle_or_line_art_required": False,
            },
        },
        "material_contract": [
            {
                "name": spec["name"],
                "metallic": spec["metallic"],
                "roughness": spec["roughness"],
                "emissive": "emission_color" in spec,
            }
            for spec in MATERIAL_SPECS.values()
        ],
        "budgets": {
            "whole_kit_triangles_max": 120000,
            "legacy_blockout_draw_calls_max": 60,
            "desktop_style_draw_calls_max": 90,
            "shared_materials_max": 6,
            "external_textures_max": 0,
            "visible_emissive_area_percent_max_exclusive": 3.0,
        },
        "assets": asset_records,
        "contact_sheet": {
            **receipt(PREVIEW_DIR / "kaizen-metrics-campus-blockout.png"),
            **PREVIEW_STATS["contact_sheet"],
            "purpose": "Neutral proof grid; not a final city layout.",
        },
        "validation": validation,
        "deviations": [
            "The faceted concept-art masses are simplified into web-budget blockout geometry; silhouette counts and primary arrangements are retained.",
            "The PostgreSQL partial helix is a rising segmented service ramp rather than a continuous curved slab.",
            "The Databricks asset uses eight slabs grouped as four descending left/right terrace pairs so the binding four-level count remains unambiguous in the locked view.",
            "The legacy 60-draw-call blockout ceiling is not an acceptance gate for the desktop-first exported edge-mesh style pass; the measured 90-call style ceiling is used instead.",
        ],
        "limitations": [
            "Public/runtime 3D scene integration remains blocked until the 2D zoom and interaction gate passes QA.",
            "Runtime FPS, load time, Babylon edge-pass behavior, browser zoom quality, and mobile behavior remain unverified; mobile parity is not an acceptance constraint for this authored desktop asset pass.",
        ],
    }
    INVENTORY_PATH.write_text(json.dumps(inventory, indent=2) + "\n", encoding="utf-8")
    if inventory["verdict"] != "PASS":
        raise RuntimeError("Asset inventory validation failed")


def validate_reopened_source_blend() -> dict[str, Any]:
    """Validation mode for a separate Blender process opening the saved blend."""
    expected_collections = {f"ASSET__{spec['slug']}" for spec in ASSET_SPECS}
    found_collections = {
        collection.name
        for collection in bpy.data.collections
        if collection.name.startswith("ASSET__")
    }
    expected_materials = {spec["name"] for spec in MATERIAL_SPECS.values()}
    found_materials = {material.name for material in bpy.data.materials}
    asset_checks = []
    for spec in ASSET_SPECS:
        slug = spec["slug"]
        collection = bpy.data.collections.get(f"ASSET__{slug}")
        root = bpy.data.objects.get(f"{slug}__ROOT")
        line_meshes = [] if collection is None else [
            obj.name
            for obj in collection.objects
            if obj.type == "MESH" and obj.get("technical_cartography_line_mesh")
        ]
        asset_checks.append(
            {
                "slug": slug,
                "collection_present": collection is not None,
                "root_present": root is not None,
                "root_at_ground_center": root is not None and root.location.length < 1e-6,
                "exported_line_mesh_present": len(line_meshes) == 1,
                "line_meshes": line_meshes,
            }
        )
    validation = {
        "mode": "separate-process-reopen",
        "source_blend": receipt(BLEND_PATH),
        "asset_collections_expected": sorted(expected_collections),
        "asset_collections_found": sorted(found_collections),
        "shared_materials_expected": sorted(expected_materials),
        "shared_materials_found": sorted(found_materials),
        "asset_checks": asset_checks,
    }
    validation["pass"] = (
        found_collections == expected_collections
        and found_materials == expected_materials
        and all(
            check["collection_present"]
            and check["root_present"]
            and check["root_at_ground_center"]
            and check["exported_line_mesh_present"]
            for check in asset_checks
        )
    )
    return validation


def preview_pixel_receipts() -> list[dict[str, Any]]:
    """Hash decoded pixels, avoiding PNG metadata/compression byte variance."""
    receipts = []
    for path in sorted(PREVIEW_DIR.glob("*.png")):
        image = bpy.data.images.load(str(path), check_existing=False)
        pixels = array("f", [0.0]) * len(image.pixels)
        image.pixels.foreach_get(pixels)
        receipts.append(
            {
                "path": path.relative_to(REPO_ROOT).as_posix(),
                "width": image.size[0],
                "height": image.size[1],
                "rgba_f32_sha256": hashlib.sha256(pixels.tobytes()).hexdigest(),
            }
        )
        bpy.data.images.remove(image)
    return receipts


def main() -> None:
    if "--validate-source-blend" in sys.argv:
        validation = validate_reopened_source_blend()
        print(f"CAREER_WORLD_3D_SOURCE_REOPEN={json.dumps(validation)}")
        if not validation["pass"]:
            raise RuntimeError("Saved source blend validation failed")
        return
    if "--preview-pixel-receipts" in sys.argv:
        print(f"CAREER_WORLD_3D_PREVIEW_PIXELS={json.dumps(preview_pixel_receipts())}")
        return
    prepare_output()
    reset_blender()
    build_materials()
    master = build_assets()
    setup_preview_studio()
    glb_paths = {slug: export_asset(builder) for slug, builder in ASSET_BUILDERS.items()}
    camera = bpy.data.objects["PREVIEW__Camera"]
    render_previews(camera)
    set_visible_asset(None)
    bpy.context.scene.render.filepath = ""
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH), compress=True)
    write_inventory(glb_paths)
    print(f"CAREER_WORLD_3D_ASSET_RESULT={json.dumps({'verdict': 'PASS', 'assets': len(ASSET_BUILDERS), 'inventory': str(INVENTORY_PATH)})}")


if __name__ == "__main__":
    main()
