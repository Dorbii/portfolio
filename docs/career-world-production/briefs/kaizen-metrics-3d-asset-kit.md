# Kaizen Metrics 3D Asset Kit

Status: offline asset-authoring contract  
Scope: one project landmark plus nine canonical reusable skill buildings  
Runtime status: asset production is authorized; public scene integration remains blocked on the 2D zoom/interaction gate.

## Intent and evidence boundary

This kit turns the approved Career World concept art into static, stylized architectural blockouts for later Babylon.js import. The visuals are entertainment. They may communicate recognisable shape language and contain tiny maintenance-detail easter eggs, but they must not imply performance metrics, real facilities, a literal provider architecture, employer infrastructure, private details, or resume evidence. Resume and project drawers remain the factual authority.

The promoted PNGs are identity and art-direction references, not coordinate truth. The deterministic Blender script owns the 3D topology. Each skill is authored once as one canonical GLB; later city theming must recolor or instance that same GLB rather than creating employer-specific geometry copies.

## Target and platform contract

- Subject: static Kaizen Metrics campus asset kit; no final city layout or interaction.
- Viewing distance: normal city view with optional closer project inspection; silhouettes must read before facade detail.
- Camera proof: exact true-isometric orthographic view at azimuth 225 degrees, elevation 35.264 degrees above horizontal, roll 0; Blender source is Z-up and +Y must project upper-left. Every asset must be grounded and fully framed. The glTF exporter performs the later Y-up axis conversion; proof renders remain in Blender's Z-up source convention.
- Runtime target for later integration: Babylon.js, WebGL2 fallback, 60 fps desktop and 30 fps mobile goal.
- Units: one Blender unit equals one meter.
- Axis/export: glTF 2.0 binary GLB; Blender Z-up source; exporter performs glTF axis conversion.
- Transform contract: ground-center origin and pivot, no unapplied object transforms, positive scale, no negative or mirrored transforms.
- Shading: clean normals, Auto Smooth by Angle where useful, small bevels reserved for silhouette/highlight readability.
- Motion: none. No armatures, shape keys, physics, animation clips, runtime simulation, or interactive state is authored in this lane.

## Whole-kit budgets

| Metric | Budget | Interpretation |
| --- | ---: | --- |
| Normal-view triangles | <= 120,000 | Sum of exported mesh triangles across all ten independent GLBs. |
| Legacy blockout draw calls | <= 60 | Retained as a comparison receipt only; it is not the style-pass acceptance gate. |
| Desktop style draw calls | <= 90 | Intentional exported edge meshes are allowed when they materially preserve the line hierarchy. |
| Shared materials | <= 6 | One shared palette across the source blend and exports. |
| External textures | 0 | This pass is texture-free. All appearance uses glTF PBR factors. |
| Emissive visible area | < 3% | Restrained accent strips/windows only, never a neon wash. |

Per-asset targets are deliberately below the whole-kit ceiling: project landmark <= 24,000 triangles and each skill <= 11,000 triangles. These are ceilings, not quality targets. Extra geometry is justified only by silhouette, count, or readable structural form.

## Material contract

Use no more than these six deterministic shared materials:

1. `MAT_Structure_Dark`: matte charcoal structure, metallic 0.08, roughness 0.72.
2. `MAT_Structure_Mid`: secondary slate, metallic 0.10, roughness 0.60.
3. `MAT_Roof`: darker roof/working surface, metallic 0.14, roughness 0.48.
4. `MAT_Metal`: restrained structural metal, metallic 0.72, roughness 0.34.
5. `MAT_Accent_Emissive`: cool cyan accent, low-strength emissive, roughness 0.38.
6. `MAT_Ground`: neutral dark base/plinth, metallic 0.02, roughness 0.88.

No logos, text, brand marks, decals, pseudo-text, image textures, provider icons, glass, chrome, clear coat, transmission, or unsupported glTF extensions. Later scene lighting may add an environment map; it is not baked into these assets.

## Technical-cartography stylization contract

This recovered lane authors and proves the desktop-first technical-cartography treatment directly in the GLBs and Eevee proofs without changing canonical massing:

- keep matte, faceted solid faces with differentiated roughness and restrained cyan emissive occupying less than 3% of visible area;
- add a pale structural/hard-edge line layer for identity-defining seams and interior construction lines: exterior silhouettes should read first, primary mass boundaries second, and sparse maintenance seams third;
- use the exact 225-degree azimuth, 35.264-degree elevation, roll-0 orthographic composition for canonical proof, while allowing the later interactive camera to zoom without changing asset identity;
- swap employer palettes through material parameters on identical instanced skill geometry; never export city-specific skill mesh duplicates;
- keep runtime line thickness screen-stable across zoom/LOD transitions;
- treat Blender Freestyle or Line Art as preview-only evidence because those strokes do not transfer through glTF;
- author intentional exported edge meshes for exterior silhouette/mass boundaries and important interior structural lines; the GLB must not rely on Freestyle or Line Art for any defining edge;
- target desktop visual fidelity first. Intentional exported line geometry is allowed to exceed this blockout's 60-draw-call ceiling when it materially recreates the illustrated wire-map style; measure the new style-pass ceiling rather than deleting defining lines to preserve the old number;
- retain a future functional lower-cost fallback, but do not let mobile parity water down the authored desktop line hierarchy;
- measure the added edge-mesh primitives against the desktop asset-kit draw-call ceiling; runtime edge-pass, WebGL2, and frame-time evidence remain a later integration concern.

The cyan hierarchy is strict: one focal strip or lightwell may mark the project/asset's primary operational mass; smaller cyan marks may punctuate a maintenance attachment; all other edge language is pale neutral structural linework. Cyan is never used to outline the whole asset, imitate a logo, encode a metric, or replace the pale construction layer.

No runtime code or final stylization implementation is authorized in this asset lane. `PASS` is permitted only when the exported line mesh receipt and visually inspected technical-cartography previews demonstrate the authored line hierarchy; `BLOCKOUT_PASS` is insufficient.

## Canonical asset and topology contract

| Canonical ID | Stable GLB slug | Required identity-defining topology | Permitted tiny easter egg |
| --- | --- | --- | --- |
| `project/kaizen-metrics@v1` | `project-kaizen-metrics-v1.glb` | Shared terraced base; low ingestion hall with four sawtooth roof teeth; raised linear compute spine; one cylindrical query reservoir; one small faceted assistant lightwell. | One static maintenance capsule beside the spine, with no gauge or value. |
| `skill/python@v1` | `skill-python-v1.glb` | Two offset curved-edge automation halls; one straight diagonal service spine; one square intake court; one raised rear utility loft. | Three tiny roof service blocks as a structural nod; no snake or code mark. |
| `skill/databricks@v1` | `skill-databricks-v1.glb` | Four staggered descending slab terraces; narrow central work court; one high rear retaining hall. | One small maintenance pallet in the court; no brick-stack emblem. |
| `skill/workflow-orchestration@v1` | `skill-workflow-orchestration-v1.glb` | Circular conductor rotunda; tall central drum; exactly six staggered low service bays; one visibly interrupted ring ramp. | None beyond ordinary service seams. |
| `skill/data-contracts@v1` | `skill-data-contracts-v1.glb` | Two archive halls with visibly unequal roof pitches; only one narrow sealed validation gate; pronounced central pinch. | Paired bolt rows on the gate, with no document/code glyph. |
| `skill/go@v1` | `skill-go-v1.glb` | Long low double-gable workshop around a straight open service spine; one clipped-corner loading bay; short raised rear monitor shed. | Small evenly spaced service posts; no gopher or speed motif. |
| `skill/postgresql@v1` | `skill-postgresql-v1.glb` | Stout cylindrical silo; partial helical/rising service ramp; four radial buttresses; compact octagonal base. | One inspection hatch with no database/elephant mark. |
| `skill/docker@v1` | `skill-docker-v1.glb` | Modular rectangular service bays; tall open gantry frame; broad loading plinth; one side stair tower. | Tiny unmarked suspended maintenance hook; no whale/container labels. |
| `skill/ai@v1` | `skill-ai-v1.glb` | One long horizontal faceted calibration drum; two unequal structural cradles; one narrow transverse measurement gallery; low rectangular service annex; linear asymmetric footprint. | One calibration peg; strictly non-humanoid and non-agentic. |
| `skill/aws@v1` | `skill-aws-v1.glb` | Three small service pavilions around one taller hub; broad solid ground-level causeways; clipped perimeter base. | One plain roof mast; no cloud, smile, service icon, or provider mark. |

Counts in this table are binding. Detail may be simplified, but the required primary masses, their relative arrangement, and the explicit counts may not drift.

## Deterministic naming and collection contract

- Source blend: `kaizen-metrics-asset-kit.blend`.
- Build script: `build_kaizen_metrics_assets.py`.
- Root source collection: `CW_KaizenMetrics_AssetKit`.
- One collection per asset: `ASSET__<stable_slug>`.
- Mesh object names: `<stable_slug>__<role>__NNN`, zero-padded and deterministic.
- Shared materials retain the exact names defined above.
- Camera and light objects use `PREVIEW__` prefixes and are excluded from GLB exports.
- Every asset has a ground-center empty named `<stable_slug>__ROOT`; exported meshes are direct children of it.
- Individual GLBs contain only the selected asset collection and its canonical shared materials.

## Output contract

All generated output stays under `design/career-world/3d/kaizen-metrics/`:

- `build_kaizen_metrics_assets.py`: deterministic authoring/export/render pipeline.
- `kaizen-metrics-asset-kit.blend`: source with named collections and shared materials.
- `glb/*.glb`: ten independently loadable canonical assets.
- `previews/*.png`: ten 768 x 768 orthographic/isometric proof renders.
- `previews/kaizen-metrics-campus-blockout.png`: neutral contact-sheet/campus blockout proof if generation succeeds.
- `kaizen-metrics-asset-inventory.json`: machine-readable receipts, source links, topology checks, mesh/material statistics, export validation, and render settings.

Generated files must not be copied into `public/` and must not be imported by product runtime code in this lane.

## Validation and acceptance

The lane may report `PASS` only when all of the following are true:

1. The deterministic script rebuilds from a clean generated-output state and exits successfully in Blender 5.1.2 headless mode.
2. The source blend reopens headlessly and contains the ten named asset collections and at most six shared materials.
3. All ten GLBs parse, contain at least one scene, node, mesh, and material, reference no external texture or buffer URI, and include the named exported technical-line mesh using the pale shared line material.
4. Each asset is grounded, has a ground-center root, has applied transforms and sane normals, and retains its binding topology/count checklist.
5. Whole-kit triangle, desktop-style draw-call, material, and external-texture budgets are recorded and pass; the legacy 60-call receipt is reported but is not an acceptance gate.
6. All preview PNGs are 768 x 768, nonblank, consistently framed at the exact true-isometric camera, and visually inspected for non-black/non-cropped technical-cartography line hierarchy.
7. The machine-readable inventory contains exact byte and SHA-256 receipts for source inputs and generated outputs, plus two clean rebuild receipts that compare deterministic output hashes.

Successful asset export does not prove Babylon integration, runtime performance, camera behavior, zoom quality, mobile behavior, or final city composition. Those claims require later production-path integration and browser evidence after the 2D gate.
