# Inland water — current-coast revision r8

Owner scope (2026-09-07): “the ocean we can call done for now.” This pass addresses inland waterfall alignment, remaining painted-water cutouts, and river/pond beds and bank transitions. Ocean code/assets remain at 46e75848; final visual acceptance belongs to Steve.

Current mount: **67 cells** (63 authored, four existing previews), **108 features**: 38 stream routes, 29 pools, 41 falls/cascades. There are 39 mapped falls plus the two bespoke gorge segments. The 26 deferred annotations were reconciled against current art: 23 restored/repositioned, three retired with their old definitions and source provenance retained. Three source-visible features were added: the limestone inlet, lower-shelf inlet, and west headwater step. No deferred annotations remain.

## Changes

- Mapped falls now trace 32 points through the source water aperture. Each point has a measured perpendicular width; motion follows the curved profile. Opaque rocks and bridges occlude the sheet. Removed the rectangular cloned-rock backing used by mapped falls.
- Alpha-only repairs cut 117,973 painted-water pixels across 20 authored cells, plus 4,351 pixels of neutral-white baked waterfall in NinjaOne c4-3. Decoded authored RGB is unchanged and alpha never increases. The latter footprint is recorded as a reviewed polygon. Water masks, affected pyramids, 29 served cell snapshots, land mount, water fields and atlas were regenerated using the existing tone/chain data. Protected authoring tools were not edited.
- Sand, irregular clustered cobbles, shallow bank depth, wet contact shading and the existing resident substrate texture replace the regularly dotted bed. No new texture allocation. Inland annotations fill their connected water body up to the established marine handoff, avoiding material stripes and crescent-shaped marine patches at channel/pool edges. Unannotated marine inlets remain outside this fill.
- Main gorge shader strings are unchanged. Purple-brook field pixels are unchanged. Gorge water pixels and flow bytes are unchanged; 4,885 dry-side distance pixels at the cell south edge legitimately change with neighboring water cutouts. Source-bound legacy cells are excluded from inferred body completion.

## Review

Open http://localhost:4180/?view=water and use **Inland review** to select a feature. L3_4 toggles the bed; L3_1 and L3_2 independently control motion and effects. Current revision: inland-profiles-bed-r8. Camera, registration, shared LoD and ocean modules/assets were not changed.

Runtime evidence is under `.codex-tmp/qa/inland-r8/`: raised-shelf-final, forest-lower-final, broad-drop-final, fern-pond-final, headwater-step-final, fern-bench-final, quarry-fall-final and bridge-fall-final PNGs with camera/runtime JSON. World and territory captures record reverse transitions. Source trace images cover all 39 mapped falls. Owner crops and source mechanics are retained in `inland-r8-reference/`.

Visual limits: the bed color, waterfall brightness and spray scale still require owner review. The source retains real canopy/rock/bridge interruptions and existing authored seams. A small number of upstream profile samples remain opaque at those interruptions; the runtime respects them. No exhaustive context-loss or lower-end GPU acceptance was performed. One wider dry-land shader cull was rejected because it changed translucent-land compositing; only the already-transparent inland portion of the ocean detail overlay is skipped. Do not cite the rejected trial as final performance proof.

## Verification

Typecheck, lint (zero errors / 30 existing warnings), production build, field provenance, and protected authoring checks pass. Final focused water/inland/profile/mount suite: 40/40. Full suite: 124 pass, four unchanged baseline failures, one skipped. The four failures concern capital-envelope coverage, NinjaOne paving, territory resegmentation, and Kaizen topography. `npm run verify` therefore remains red at the existing test failures; the production build was run separately.

## Inventory

| Cell | Streams | Pools | Falls |
|---|---:|---:|---:|
| l2-c0-0 | 1 | 2 | 0 |
| l2-c0-1 | 1 | 1 | 1 |
| l2-c0-2 | 1 | 1 | 0 |
| l2-c0-3 | 1 | 0 | 1 |
| l2-c1-0 | 0 | 1 | 0 |
| l2-c1-1 | 1 | 0 | 0 |
| l2-c1-2 | 1 | 4 | 0 |
| l2-c1-3 | 1 | 0 | 1 |
| l2-c2-0 | 1 | 2 | 2 |
| l2-c2-1 | 1 | 2 | 1 |
| l2-c2-2 | 1 | 3 | 1 |
| l2-c2-3 | 1 | 0 | 0 |
| l2-c3-0 | 1 | 2 | 2 |
| l2-c3-1 | 1 | 0 | 2 |
| l2-c3-2 | 1 | 1 | 2 |
| l2-c3-3 | 1 | 0 | 1 |
| l2-c4-0 | 1 | 1 | 1 |
| l2-c4-1 | 1 | 0 | 0 |
| l2-c4-2 | 1 | 0 | 1 |
| l2-c4-3 | 1 | 1 | 1 |
| l2-tanium-c0-0 | 0 | 0 | 0 |
| l2-tanium-c0-1 | 1 | 0 | 1 |
| l2-tanium-c0-2 | 0 | 0 | 0 |
| l2-tanium-c1-0 | 0 | 0 | 0 |
| l2-tanium-c1-2 | 1 | 0 | 1 |
| l2-tanium-c2-0 | 0 | 0 | 0 |
| l2-tanium-c2-2 | 1 | 1 | 3 |
| l2-tanium-c3-0 | 1 | 0 | 3 |
| l2-tanium-c3-2 | 3 | 0 | 7 |
| l2-tanium-c4-1 | 1 | 1 | 0 |
| l2-tanium-c4-2 | 2 | 1 | 6 |
| l2-tanium-c5-0 | 0 | 0 | 0 |
| l2-tanium-c5-1 | 1 | 1 | 0 |
| l2-tanium-c5-2 | 2 | 0 | 0 |
| l2-tanium-c6-0 | 0 | 0 | 0 |
| l2-tanium-c6-1 | 0 | 0 | 0 |
| l2-tanium-c6-2 | 2 | 1 | 3 |
| l2-tanium-c1-1 | 1 | 0 | 0 |
| l2-tanium-c2-1 | 0 | 0 | 0 |
| l2-tanium-c3-1 | 1 | 1 | 0 |
| l2-tanium-c4-0 | 1 | 1 | 0 |
| l2-coast-c2-0 | 0 | 0 | 0 |
| l2-coast-c4-0 | 1 | 1 | 0 |
| l2-coast-c5-0 | 0 | 0 | 0 |
| l2-coast-c6-0 | 0 | 0 | 0 |
| l2-coast-c0-6 | 0 | 0 | 0 |
| l2-coast-c0-7 | 0 | 0 | 0 |
| l2-coast-c1-0 | 0 | 0 | 0 |
| l2-coast-c1-1 | 0 | 0 | 0 |
| l2-coast-c1-2 | 0 | 0 | 0 |
| l2-coast-c1-8 | 0 | 0 | 0 |
| l2-coast-c3-0 | 0 | 0 | 0 |
| l2-coast-c5-8 | 0 | 0 | 0 |
| l2-coast-c6-8 | 0 | 0 | 0 |
| l2-coast-c7-0 | 0 | 0 | 0 |
| l2-coast-c7-1 | 0 | 0 | 0 |
| l2-coast-c7-2 | 0 | 0 | 0 |
| l2-coast-c7-3 | 0 | 0 | 0 |
| l2-coast-c7-4 | 0 | 0 | 0 |
| l2-coast-c7-8 | 0 | 0 | 0 |
| l2-coast-c8-5 | 0 | 0 | 0 |
| l2-coast-c8-6 | 0 | 0 | 0 |
| l2-coast-c8-7 | 0 | 0 | 0 |
| l2-review-coast-c1-4 | 0 | 0 | 0 |
| l2-review-coast-c1-3 | 0 | 0 | 0 |
| l2-review-coast-c4-8 | 0 | 0 | 0 |
| l2-review-coast-c0-5 | 0 | 0 | 0 |

## Rebuild and provenance

`npm run build:water` regenerates fields and atlas. `npm run check:water` verifies their source hashes. Land repairs use the unchanged `tools/world-authoring/cell.mjs --restitch`, followed by `world-register.mjs --only-cells` for the affected cells with the existing tone/chain arguments, then `npm run build:land-mount`. Do not recalculate tone or promote previews as part of a water repair.

Field input: `4b9702a6a0ad78412a896920bf14fffe6ddbe383f7629c01a5393a240af1f1f6`. Atlas: `/career-world/layers/water/inland/fall-context-f8311518d228fe77.webp`.
