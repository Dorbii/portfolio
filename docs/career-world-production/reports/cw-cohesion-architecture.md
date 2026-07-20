# CW Cohesion Architecture Audit

Run ID: `cw-cohesion-20260717`  
Lane ID: `ARCH-2`  
Mode: read-only application audit; this report is the only lane write

## Summary

The implementation is not too divergent to salvage. The camera math, registry identity, optimized runtime-art resolver, and project/evidence state can remain. The smallest credible migration is to replace the render-time world-versus-district branch with one canonical scene-data query:

```text
fixed world registry + fixed node layout
        -> camera viewport + zoom detail tier
        -> visible render set
        -> one camera-transformed world layer
```

Focus must stop deciding which geography exists. It should only select/highlight a node, open evidence, and optionally choose a camera target. The terrain plate must remain fully visible. All five employer territories share one world coordinate plane: NinjaOne, Tanium, and Independent on the mainland; ACE Hardware and Column Technologies on separate islands.

The latest user direction also supersedes two older implementation assumptions:

1. The previous employer anchors and world-map spacing are editable. Preserve topology and art quality, not the current coordinates.
2. Node identity and simulation state remain persistent, but offscreen DOM nodes may be culled. The anti-drift guarantee is stable IDs, coordinates, routes, and assets across zoom, not permanent mounting of every node.

## Root cause

### 1. The renderer swaps scenes instead of revealing one scene

`features/career-world/components/world-scene.tsx` renders a dedicated overview city-pad tree only when `lod === "world"` (lines 499-543), then replaces it with a different district tree only when `lod !== "world"` (lines 545-601). That district tree is scoped to `activeEmployerId` via `scenePlacementsByEmployer` (lines 210-218). The result is exactly the reported failure: the map overview disappears and one employer's assets are dumped over a faded copy of the world plate.

The overview and detail trees even instantiate the same capital art through different component paths: `.career-world-city-pad` at overview and `ArtInstance` at city/project depth. They are not one continuous node.

### 2. URL focus incorrectly locks level of detail

`semanticLodForFocus` in `features/career-world/rendering/world-camera.ts` (lines 96-103) returns `city` whenever an employer is focused and `project` whenever a project is focused, regardless of zoom. Therefore `?employer=independent` cannot zoom back to an all-employer overview. The current `nearestEmployer` fallback in `world-scene.tsx` (lines 68-77 and 210-212) also selects an entire district merely because the camera crossed a zoom threshold.

Detail tier must be a function of zoom only. Focus may change emphasis, not membership in the world.

### 3. There is no viewport culling

At non-world LOD, every capital, project, and skill placement for the active employer is mounted (`world-scene.tsx` lines 428-434 and 585-599), even when far outside the viewport. There is no world-space visible rectangle, overscan window, or node-bounds intersection test.

### 4. Terrain and nodes are not using an exact shared pixel-to-world transform

The runtime terrain art is `1360 x 940`, while the canonical stage is `1600 x 900`. `world-scene.tsx` stretches its element to the stage but uses `objectFit: "contain"` (lines 486-496). The visible map therefore occupies a centered sub-rectangle of the coordinate plane, while node anchors use the full `1600 x 900` coordinate system. Current anchors can only be approximate.

The replacement world plate should be authored/composited to the exact canonical world bounds. Do not rely on CSS `object-fit` to establish coordinate truth.

### 5. Visual scale is hard-coded by broad category, not authored footprint

`ScenePlacement.scale` is populated in `scene-composition.ts` (lines 120-145) but never applied by `ArtInstance`. Instead, all capitals use `132 x 96`, all projects `104 x 90`, and all skills `76 x 68` (`world-scene.tsx` lines 103-110). The promoted art has materially different aspect ratios and silhouettes. Category-wide boxes flatten those differences and cause inconsistent apparent scale/detail.

### 6. Layout has no zone or collision contract

`scene-composition.ts` stores radial offsets around each employer anchor, but nodes have no authored footprint, local zone bounds, minimum detail tier, label tier, or collision envelope. Several skill rings extend roughly 200-250 world units from the employer origin, which is larger than the usable area of the lower islands. Nothing validates that a node remains on its territory.

### 7. The background is deliberately faded at detail depth

`career-world.css` reduces the world layer to `0.46` at city LOD and `0.2` at project LOD (lines 979-985). This makes the fixed geography read as a temporary backdrop instead of the persistent world. Baseline composition should keep terrain opaque; selected-node emphasis should dim only unrelated nodes, not replace the map.

### 8. Palette identifiers are not type-safe

`Employer.palette` is declared as `string`. ACE uses `"ace"` and Column uses `"column"` in `world-registry.ts` (lines 106-112), but the canonical palette keys are `"ace-hardware"` and `"column-technologies"` in `geometry/palettes.ts` (lines 14-22 and 61-80). This has been dormant because raster art bypasses palette application; it will break a zone-mask/tint implementation.

### 9. Removing the top-left panel currently removes the accessible map

`CareerWorld` mounts `WorldHitTargets` in `.career-world-navigation-region` (lines 91-98), while `WorldScene` is `aria-hidden="true"` and its map buttons use `tabIndex={-1}`. Removing only the visual panel would leave no keyboard or screen-reader navigation. The map buttons must become the semantic controls, or the same controls must remain in a non-dialog, visually hidden navigation surface.

### 10. Motion is already present before baseline approval

`.career-world-route-overlay path` runs `cw-art-route` continuously (`career-world.css` lines 1048-1063 and 1168-1169). This conflicts with the explicit instruction to defer animation until composition is correct. Remove/disable route animation during the baseline pass; keep static authored roads in the terrain.

## Proposed data types

Keep evidence identity in `world-registry.ts`. Make the scene layout the single spatial authority.

```ts
type WorldRect = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

type DetailTier = "world" | "territory" | "district" | "close";

type WorldZone = Readonly<{
  id: EmployerId;
  topology: "mainland" | "island";
  origin: WorldPoint;
  bounds: WorldRect;
  paletteId: CareerWorldPaletteId;
  // Optional exact 1600x900 mask aligned to WORLD_BOUNDS.
  terrainMaskAsset?: string;
}>;

type SceneNode = Readonly<{
  id: string;
  assetId: CareerAssetId;
  kind: "capital" | "project" | "skill" | "ambient";
  employerId: EmployerId | null;
  projectId: CareerProjectId | null;
  localPosition: WorldPoint;
  worldPosition: WorldPoint;
  footprint: WorldRect;
  anchor: "bottom-center" | "center";
  zOrder: number;
  minDetail: DetailTier;
  labelDetail: DetailTier;
  paletteId: CareerWorldPaletteId | "ambient-neutral";
  interactive: boolean;
}>;

type WorldSceneDefinition = Readonly<{
  bounds: WorldRect;
  terrainAssetId: "world/career-world@v1";
  zones: readonly WorldZone[];
  nodes: readonly SceneNode[];
  routes: readonly RouteDefinition[];
}>;
```

`worldPosition` may be derived once from `zone.origin + localPosition`; it must not be recomputed from zoom or focus. Use one explicit layout record keyed by instance ID. Do not keep a second set of component-local offsets.

Reserve, but do not render or animate yet, the future route/simulation boundary:

```ts
type RouteDefinition = Readonly<{
  id: string;
  points: readonly WorldPoint[];
  closed: boolean;
}>;

type ActorState = Readonly<{
  id: string;
  routeId: string;
  startedAtMs: number;
  speedWorldUnitsPerSecond: number;
  phase: number;
  minDetail: DetailTier;
}>;
```

An actor's position should be derived from `startedAtMs`, speed, phase, and route length. Offscreen actors need no DOM node and no per-frame state mutation. When an actor enters the render query, its current position is derived from time and it appears in the correct place.

## Coordinate, camera, LOD, and culling algorithm

### Coordinate contract

1. Freeze one exact world canvas, initially `1600 x 900` world units.
2. Produce the final terrain derivative at exactly `1600 x 900`; use no runtime `object-fit` mapping.
3. Freeze five `WorldZone` origins after the edited terrain map is accepted.
4. Store project/skill/ambient positions in employer-local coordinates and derive immutable world coordinates once.
5. Preserve one asset ID, anchor mode, footprint, and world coordinate at every zoom.

### Camera

The existing camera transform is valid:

```text
screen = viewportCenter + (world - cameraCenter) * cameraZoom
```

Keep `constrainWorldCamera`, pointer-anchored zoom, and the imperative transform during interaction. Focus does not alter the transform algorithm.

### LOD

Use a pure zoom-only function. Initial thresholds can retain the current numeric boundaries while adding a later close tier:

```ts
detailForZoom(zoom): DetailTier {
  if (zoom >= 4.8) return "close";
  if (zoom >= 3.2) return "district";
  if (zoom >= 1.7) return "territory";
  return "world";
}
```

Baseline visibility:

| Tier | Required nodes |
|---|---|
| `world` | terrain, all five capitals/city silhouettes, employer labels |
| `territory` | all above plus project landmarks in the viewport, primary roads/plazas |
| `district` | all above plus skill buildings and project labels in the viewport |
| `close` | same nodes; only labels/fine overlays change for now |

No animation should be added in this pass.

### Viewport query

For the internal `1600 x 900` stage:

```ts
const visible = {
  left: camera.center.x - 800 / camera.zoom,
  right: camera.center.x + 800 / camera.zoom,
  top: camera.center.y - 450 / camera.zoom,
  bottom: camera.center.y + 450 / camera.zoom,
};
```

Expand it by an overscan measured in screen pixels converted to world units, for example `160 / camera.zoom`. Render a node when:

1. the current detail tier is at least `node.minDetail`; and
2. the node footprint intersects the expanded visible rectangle.

The current scene has only 58 nodes, so a linear `nodes.filter(...)` is simpler and safer than a quadtree. Introduce a spatial index only after measured density requires it.

The camera currently updates the React state only when dragging/wheeling settles. Preserve that fast path with a culling window:

1. Build the render set from a rectangle expanded by roughly one additional viewport.
2. During pointer movement, update only the camera-layer transform.
3. Recompute the render set when the live viewport exits that expanded window, crosses a detail threshold, or interaction settles.

This avoids React work on every pointer event without exposing empty edges during a long pan.

### Focus and clicks

- Clicking a capital sets employer focus and may animate the camera to its existing world coordinate.
- Clicking a project sets project focus and opens eligible evidence over the unchanged map.
- Focus changes selection/relationship emphasis only.
- Zooming back out always restores the complete world render set, even if the URL still identifies an employer or project.
- Reset clears focus and restores the full-world camera.

## Exact files and symbols to change

### Required

1. `features/career-world/model/scene-composition.ts`
   - Replace bare `OffsetTuple` arrays with typed `WorldZone` and `SceneNode` layout records.
   - Add footprints, anchor modes, detail thresholds, z-order, and typed palette IDs.
   - Export all-scene queries; do not make `scenePlacementsByEmployer` the renderer's membership gate.
2. `features/career-world/model/world-registry.ts`
   - Type `Employer.palette` as `CareerWorldPaletteId`.
   - Correct ACE/Column palette IDs.
   - Replace the frozen old employer anchors only after the edited exact-size map is accepted.
   - Remove or clearly deprecate the partial NinjaOne-only `localPosition/worldPosition` layout duplication; one module must own spatial truth.
3. `features/career-world/rendering/world-camera.ts`
   - Replace `semanticLodForFocus` with zoom-only `detailForZoom`.
   - Add pure `worldViewportRect`, `expandRect`, `rectsIntersect`, and `visibleSceneNodes` helpers.
4. `features/career-world/components/world-scene.tsx`
   - Remove `nearestEmployer`, `activePlacements`, the overview-only `.career-world-city-pad` tree, and the non-world-only district branch.
   - Always render the terrain and one queried node collection.
   - Use node footprint/aspect instead of category-wide fixed envelopes.
   - Keep the same asset/coordinate when focus or detail changes.
   - Remove route animation/rendering for this baseline.
   - Make visible employer/project buttons semantic if the overlay navigation is removed.
5. `features/career-world/hooks/use-career-world-state.ts`
   - Keep URL focus and camera override separate.
   - Ensure focus never feeds node visibility/LOD.
   - Decide explicitly whether project click preserves camera or targets the project; either choice must not change layout.
6. `features/career-world/components/career-world.tsx`
   - Remove the visible `.career-world-navigation-region` / `WorldHitTargets` panel.
   - Preserve keyboard and screen-reader operation through native scene buttons or a visually hidden, non-dialog semantic mirror.
7. `features/career-world/styles/career-world.css`
   - Remove navigation-panel layout.
   - Remove LOD-driven world opacity fading and current route animation.
   - Add zone/palette variables and node-anchor/footprint styling.
   - Do not use CSS layout to reposition nodes by focus.
8. `public/career-world/art/world/career-world.webp`
   - Replace with the accepted exact-world-bounds terrain derivative after art review.
9. `public/career-world/art/runtime-art-manifest.json`
   - Update the world receipt/dimensions/source role and any neutral/tint derivative metadata.
10. `tests/career-world.test.mjs`
    - Replace source-regex assertions that require separate overview/district trees and a visible navigation panel.
    - Replace old anchor snapshots only when the new map is accepted.

### Optional cleanup after the baseline

- `features/career-world/components/world-hit-targets.tsx` may be deleted if scene buttons become accessible. Otherwise reduce it to a visually hidden semantic mirror.
- Preserve the old procedural geometry modules as historical/non-runtime sources unless a separate cleanup task is authorized.

## Migration order

1. **Freeze the edited terrain canvas.** Approve one exact `1600 x 900` map with the required mainland/island topology and five usable territory bounds. Record the new zone origins. Do not guess coordinates from the old `1360 x 940` plate.
2. **Freeze the spatial schema.** Land `WorldZone`, `SceneNode`, footprint, detail, and palette types. Convert every existing instance to exactly one node record.
3. **Add pure camera/query tests.** Prove zoom-only detail, world-rect math, overscan intersection, topology, uniqueness, and bounds before changing JSX.
4. **Unify the renderer.** Replace both conditional trees with one terrain plus one visible-node collection. Keep existing camera gesture code.
5. **Remove the visible selector panel.** Promote the scene controls to native accessible buttons or retain a visually hidden semantic mirror.
6. **Normalize palette treatment.** Convert promoted runtime sprites to neutral/grayscale bases if required, preserve alpha/luminance, and apply the employer palette consistently through one bounded mask/tint path. Do not recolor architecture differently per zoom.
7. **Visual scale/collision pass.** Tune authored footprints and local coordinates against the accepted territory bounds. Validate labels separately from building collision.
8. **Baseline QA.** Verify full overview, all five employer territories, zoom continuity, pan bounds, clicks, project drawer, culling, payload, memory, keyboard, and reduced motion. Only then reopen animation work.

## Tests to add or replace

### Pure unit contracts

- `detailForZoom` returns the same tier for identical zoom regardless employer/project focus.
- Zooming from detail to world tier returns all five capital nodes even when URL focus remains.
- Every instance ID maps to exactly one `SceneNode` and one world coordinate.
- NinjaOne/Tanium/Independent zone topology is `mainland`; ACE/Column is `island`.
- Every node footprint lies within both world bounds and its employer zone bounds, unless explicitly marked as water/route ambient.
- Every employer-skill pair remains unique and resolves to the same canonical skill asset ID across employers.
- All node palette IDs resolve to `CAREER_WORLD_PALETTES`.
- `worldViewportRect` and `rectsIntersect` cover edges, zoom limits, and overscan.
- Offscreen nodes are absent from the render set while their registry/layout records remain unchanged.
- Focus, LOD queries, and culling do not mutate registry or scene-layout snapshots.
- Terrain runtime dimensions equal `WORLD_BOUNDS` exactly.

### Render/source contracts

- `WorldScene` has one node render loop and no mutually exclusive overview/district scene trees.
- Terrain is always mounted and has no LOD opacity reduction.
- At world tier, server/client markup includes all five capital controls.
- At territory tier, visible projects from more than one employer may coexist when the viewport intersects both zones.
- No visible top-left navigation/dialog panel remains.
- Visible city/project nodes are native interactive controls with accessible names, or equivalent hidden controls exist.
- No route animation is active in baseline mode.

### Browser proof

- Start at `?employer=independent`; zoom fully out; capture all five cities on the mainland-plus-two-island map.
- Click each city, zoom in/out repeatedly, and compare node world-coordinate data before/after.
- Pan across a mainland zone boundary at territory zoom and prove both adjacent cities/projects coexist while in view.
- Pan from mainland to each island without layout substitution or blank terrain.
- Cross every detail threshold under a stationary cursor and prove no node shifts.
- Long-pan beyond one viewport while holding the pointer and verify the overscan/culling window never exposes an empty edge.
- Record mounted-node counts at world, territory, and district tiers; confirm offscreen nodes are culled.
- Open/close an evidence drawer and prove camera, coordinates, and render-set membership are unchanged outside occlusion.
- Keyboard-reach visible capitals/projects after the selector panel is removed.

## Risks and blockers

### Blocker before coordinate implementation

The final world terrain derivative and its exact territory/pad positions are not yet frozen. The current runtime plate cannot be treated as exact coordinate truth because its natural dimensions differ from the stage and the user has now authorized map reshaping. Code can land the schema/query helpers in parallel, but final node coordinates must wait for the accepted exact-size terrain composition.

### Material risks

1. **Two spatial authorities remain.** `world-registry.ts` contains partial NinjaOne positions while `scene-composition.ts` contains offsets for all 58 nodes. Leaving both writable will recreate drift. Choose one spatial authority.
2. **Culling pops during imperative pan.** A render set computed only on interaction end can expose missing nodes during a long drag. Use a large culling window and refresh only when the live viewport exits it.
3. **Runtime palette masks can become a GPU tax.** Grayscale filters, blend modes, and masks add compositing layers. Measure the chosen treatment with the actual maximum visible node count. If costly, precompute neutral and employer-tinted derivatives at build time.
4. **Transparent trim is not a footprint.** Runtime alpha bounds describe pixels, not ground contact or collision. Author explicit world footprints/anchor points per asset.
5. **Removing the selector can regress accessibility.** The current scene is intentionally hidden from assistive technology. Accessibility must move with the interaction, not be deleted with the visible panel.
6. **Old tests enforce the failed architecture.** Assertions around `semanticLodForFocus`, mutually exclusive scene branches, old anchors, and the visible navigation overlay will need deliberate replacement, not superficial updates.
7. **Focus-derived drawers currently couple map focus and summary state.** The current behavior works for evidence opening, but future click-to-focus without immediate drawer may require a separate `summaryProjectId`. Do not expand this unless the baseline interaction demonstrates the need.

## Files inspected

- `features/career-world/components/career-world.tsx`
- `features/career-world/components/world-hit-targets.tsx`
- `features/career-world/components/world-scene.tsx`
- `features/career-world/hooks/use-career-world-state.ts`
- `features/career-world/model/scene-composition.ts`
- `features/career-world/model/world-registry.ts`
- `features/career-world/rendering/runtime-art.ts`
- `features/career-world/rendering/world-camera.ts`
- `features/career-world/geometry/palettes.ts`
- `features/career-world/styles/career-world.css`
- `tests/career-world.test.mjs`
- `public/career-world/art/runtime-art-manifest.json`
- `public/career-world/art/world/career-world.webp`
- `design/career-world/concepts/tracer/world-career-world-v1.png`
- `design/career-world/README.md`
- `docs/career-world-asset-map.md`
- `docs/career-world-production/architecture.md`
- `docs/career-world-production/briefs/tech-world-composition.md`
- `docs/career-world-production/queue.yaml`
- `docs/career-world-production/run-ledger.json`

## Files changed

- `docs/career-world-production/reports/cw-cohesion-architecture.md` only

