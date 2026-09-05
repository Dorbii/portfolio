# Water refactor against the authored land pyramid

## Current task and authority

Owner authorized 2026-09-04: review and replace ocean/inland water as needed to fit the new land art and pyramid, including removing the previous water implementation. Preserve the layer approach. Water should have ocean and inland sublayers. Multiple weather conditions are required. **Lighting, time of day, and uniform shadow control belong to the separate planned lighting layer. Water consumes that layer's inputs.**

Worktree: `C:/Users/Steve/.codex/worktrees/water-pyramid-refactor/portfolio`, branch `codex/water-pyramid-refactor`, based on land `ea6f260d65d33cb4f88c25ef4406da5e0fa3fbc6`. The August 31 `ocean/lane` at `4124aef6` is historical research, not a registration authority. No newer water branch was found in the local refs; September 3 land commits changed scale and inland registration.

Do not modify the new terrain artwork, its pyramid, `tools/world-authoring`, world registration, or camera to make water fit. Other land work continues in its own worktree. Do not push. Only Steve accepts visual results.

Owner expanded scope during implementation: may create the lighting layer now, provided it covers land and water, with a directory and separate land/water subdirectories. Implement one shared lighting state, land and water adapters, and coordinated cloud shadows. Exact cliff/tree cast shadows remain dependent on authoritative height/occluder data that the new land art does not currently supply. Never label uniform tint or cloud shadows as terrain-cast shadows.

Owner clarification: neutral land is intentional. Treat it as the lighting input contract. Any additional normal/height/occluder maps belong to lighting-owned assets, not a rebake of the land artwork. The current lighting implementation supplies common daylight/ambient and cloud shadows; it does not yet claim cliff/tree cast-shadow reconstruction.

Owner further clarified object shadows: lighting owns shadows cast by objects as well. Reuse the same foliage/detail masks and instance mapping planned for animation. Shared object data should own silhouette, placement, ground pivot, and height/shadow profile; the animation system supplies the current pose; lighting consumes them to project shadows onto land and water. Reusable object masks are shared inputs, while lighting owns derived shadow outputs. **Full 3D reconstruction is not a prerequisite for 2.5D drop shadows.** As of the inspected land branch `d18a3137`, old atlases exist but a current per-object mask/instance map was not found. Do not invent a separate lighting-only tree placement registry.

Owner confirmed the mapping does not exist yet and asked for it to be made. Owner then specified **land owns animation**, since these are land assets. Therefore land owns the new masks, placements, pivots, and current poses; lighting is a read-only consumer for shadow production. Author the new mapping from current neutral art in this isolated worktree without rewriting land RGB or its pyramid. Do not implement a second foliage oscillator in lighting or water.

**Latest scope steering:** Owner said not to do everything now; focus on the ocean/inland work and the lighting needed to aid it. Defer foliage animation and the full object-mask/shadow rollout. No segmentation dependencies were installed and no tree mapping was fabricated. Keep the agreed land-owned mask/pose and lighting-owned shadow contract for that later work.

**Visual goal clarified:** Ocean is intended as a wow factor: realistic detail and motion that can hold up beside the land, with measured performance. The sparse-mark prototype is too flat. Next bounded pass: eliminate repeated full material shading across field ancestors, evaluate two small world-anchored spectral wave cascades, and derive optical reflection/transmission and foam from the surface. Lighting still owns the environment and sun. Coast distance supplies an explicitly approximate visual depth; it is not surveyed bathymetry or a hydraulic solver. No land/camera redesign or foliage expansion.

Owner feedback on first spectrum preview: stronger shoreline crashes, visibly varied open-ocean wave sizes, and creative fantasy detail are welcome. Keep coherent wave motion as the base; add larger swells, more pronounced breaking sets and spreading whitewash, with restrained blue-green emission in aerated crests. This is a review candidate, not final visual approval.

**Latest sequencing:** Owner approved focusing on ocean before inland water, and then explicitly parked further coastline tuning until the complete island is available to avoid rework. Current work focuses on open-water shape, mixed wave scales, motion, foam and performance. Inland masks/flow scaffolding remain in place but their visual polish is pending. Do not treat the current waterfall strips as a finished inland result.

Pre-spectrum GPU baseline: RTX 3080 Ti / ANGLE D3D11, 120 timer samples, p50 1.363 ms / p95 1.368 ms at camera origin (0.0815641, 0.0792288), span (0.4685861, 0.4685861). Whole-scene/browser cost is separate. Evidence in `.codex-tmp/qa/water-r1/before-spectral.json`. A resize-observer dev overlay appeared during screenshot capture; that image is diagnostic, not visual-quality evidence.

## Verified baseline

- Typecheck and production build pass.
- ESLint: 0 errors, 17 existing warnings.
- Main suite: 97 pass, 7 fail, 1 skipped. Full output: `.codex-tmp/water-refactor/baseline-tests.log`.
- Existing failures: Tanium capital coverage; Kaizen paving over water; obsolete coast field references deleted `world-land-mask-r4.png`; Tanium focus on unserved land; ocean profile test expects weather < .5 while the profile is 1; plan byte reproduction; Kaizen slope dimensions.
- The plan tests modified plans in this isolated checkout. Their two changes were restored immediately; no authoring inputs are to be changed by this work.
- Baseline preview server: port 4178, process started through exec session 24879. Browser tab 1 is the baseline review.

## Findings and retained lessons

1. `layers/inland-water/rendering/NinjaOneInlandWaterRenderer.ts` fixes a 1440x1080 artboard, a 1728x2736 field, a crop, and one district rectangle. Updating the rectangle did not update the water features to the new authored ground.
2. The ocean has four GPU passes (wave/foam/spray/composite), generated shader presets, a separate offline implementation, and old baked geography. The late ocean branch records repeated cloudy/cloth-like results despite extensive tuning, plus offline/live uniform mismatches.
3. `oceanSunDirection` changes the supplied light's elevation. That contradicts the owner's lighting ownership clarification and cannot be carried forward.
4. `shared/layers.ts` and CSS place ready ocean above terrain to solve old mask disagreement. The new terrain already has water alpha cutouts. A water surface below land gives a complete background without repainting cliffs; any over-bank spray must be a distinct water effect with bounded coverage.
5. The authored cell `*-water.json` files name classes in prose but do not supply positioned flow vectors, water heights, or fall geometry. They cannot truthfully be treated as a hydraulic simulation input. Water coverage can derive from rendered land alpha; local flow/fall semantics need explicit water-owned annotations and visible review.
6. Prior visual lessons: keep large periodic tonal modulation restrained; spend contrast on local causes (shore impacts, flow, falls); distinguish shape from lighting; verify against actual land at fixed cameras and several times. Metrics diagnose mechanics; they do not select the art.

## Design to implement

- One `layers/water` owner, with ocean and inland material/motion sublayers, shared lifecycle, geometry inputs, and lighting consumption.
- Read current served terrain registrations and alpha when building water fields. No independent traced coastline and no old district masks. New water outputs live under water-owned assets.
- Preserve world coordinates and phase through camera movement and resolution changes. The water's field levels are derived from one field source; zoom removes unresolved fine detail without changing the water body.
- Ocean: physically related wavelength/phase speed, restrained broad shading, local shore response, sparse readable crest/foam events. Inland: sheltered pools and directional surface flow; fall/rapid features are local, explicit annotations. Avoid broad advection of the land or an entire painted water image.
- Weather changes energy, roughness, and foam continuously, with calm/moderate/storm review cases. It does not select a private sun, shadow direction, exposure, or clock of day.
- Consume the existing shared `WorldLight` direction, color, ambient color and intensity directly. The future lighting layer can supply new values without rebuilding water or changing its phase. No water-specific day/night system or cast-shadow authority.
- Keep runtime code small enough to inspect: pure state/field-selection helpers, renderer, lifecycle wrapper, and separate ocean/inland shader material functions. Use existing WebGL2 and Sharp; no new rendering engine dependency.
- Build a concrete integrated candidate and inspect it before deciding which old assets/code to retire. Historical work remains recoverable in Git and the ocean branch.

## Reference basis

- GPU Gems, Mark Finch/Cyan Worlds, [Effective Water Simulation from Physical Models](https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-1-effective-water-simulation-physical-models): separate broad shape from surface detail; tie wavelength, speed, and steepness together.
- Valve/Alex Vlachos, [Water Flow in Portal 2](https://cdn.akamai.steamstatic.com/apps/valve/2010/siggraph2010_vlachos_waterflow.pdf): artist-directed flow and phase-blended surface detail. Use the mechanism, not the photographic material style.
- Naughty Dog, [Water Technology of Uncharted](https://www.gdcvault.com/play/1015517/Water-Technology-of): varied water behavior within a coherent system.
- Christopher Horvath, [EncinoWaves](https://github.com/blackencino/EncinoWaves): primary implementation accompanying empirical directional wave spectra research. Current runtime uses its own compact Phillips spectrum implementation, not copied library code or a new engine dependency.
- [Crest Water renderer documentation](https://docs.crest.waveharmonic.com/Components/System/WaterRenderer.html): independent wave-resolution budgets, material-only displacement on a quad, and depth inputs for shoreline effects. Current visual depth remains an explicitly approximate distance-based input.
- Existing ocean research already compared DREDGE and found that matching the land's contrast was a bad objective. The newest land art itself is the palette/composition reference.

## Validation and delivery

1. Establish coast/river/pool/fall coverage on the new registered land; show a geometry debug view before claiming valid flow.
2. Inspect world, territory, coast-close, river, pool and fall views, with camera coordinates recorded; compare more than one moment in time.
3. Inspect calm/moderate/storm and independently supplied light directions/intensities. Lighting probes are test inputs, not a new water-owned lighting controller.
4. Check reverse zoom and pan, resize, reduced motion, hidden/resume, context loss/fallback, stale asynchronous loads and disposal.
5. Test field derivation/alignment and motion/state invariants against synthetic inputs. Replace only tests whose old water contract this task explicitly supersedes; document that classification.
6. Run typecheck, scoped lint, focused water tests, full suite and build. Report inherited failures separately; retain the baseline logs.
7. Deliver an inspectable preview, screenshots, changed-file summary and open visual limitations. A generated candidate or green gate is never called owner-accepted.

## Progress

- Review, source audit, baseline and isolated worktree complete.
- First integrated candidate is running at port 4178. New code is entirely in `layers/water` with ocean/inland material modules. Field builder outputs only water-owned assets. No land art or pyramid data changed.
- Shared integration: `WorldScene` mounts the new owner; interface type import moved; CSS places water below land. Removed the legacy water erasure hook from `TerritoryLandform` so it renders only its own alpha. This is an isolation fix, not terrain authoring.
- First surface attempt repaired geography but exposed diagonal periodic shading. That shading was rejected and replaced with sparse finite crest events. Current visuals are still a candidate, not owner-accepted.
- Flow field classification: closed water defaults to pool behaviour; sea-connected narrow channels use an outlet potential. Source-hash-bound brook/fall annotations now supply motion for the purple clearing and great gorge. These change no coverage and require visual review.
- New fields form a six-level derived pyramid. A field-input fingerprint and versioned tile paths prevent stale mixed generations; the manifest publishes last. Budget selection falls back a level if ancestors plus detail exceed the admission limit.
- Lighting owner added under `layers/lighting`, with `land` and `water` adapters. Daylight, dusk, night and cloud shadows use one state. Neutral clear daylight preserves the existing land RGB gain. Land alpha is retained by arithmetic multiplication, not source-over shadow blending.
- Old ocean/inland runtime directories retired; historical offline sources/assets remain recoverable for reference. The new inspector has Water -> Ocean/Inland plus Shared lighting -> Land/Water.
- Final focused tests: 30 pass (water, lighting, ownership, registry). Full suite: 95 pass / 5 inherited failures / 1 skipped. Typecheck and production build pass. Lint: 0 errors / 15 existing warnings. Logs under `.codex-tmp/water-refactor/`.
- The structure-light source assertion was classified superseded by the owner's new shared lighting layer. It now compares JSX bindings structurally so all target layers must consume the same dynamic light, without requiring the old constant's spelling.
- Ocean now uses two 128-square spectral bands (192 m and 31 m domains), four longer non-harmonic swells, choppy horizontal displacement, crest-compression foam with drift/decay, spectral mip filtering, Fresnel/GGX reflection and shallow-water transmission. The lighting adapter owns incident light and sky radiance. Tiny foam emission is a fantasy material response.
- Field shading changed from overlapping full-material draws to a bounded texture array and page table: 64 slots, 16 MiB for field storage, one final full-screen material pass. Two spectral cascades add 32 small passes when their clock/weather changes, no repeated solve during static camera/lighting updates.
- Independent GPU verification compares the spatial FFT result with direct Fourier sums at three points per band; observed maximum height error under 0.000014 m at the recorded probe. This verifies the transform, not visual quality.
- Owner-identified continuous coastal rim was split into localized sets and wash. Provisional served-grid cuts suppress surf without changing signed distance or land alpha. Bathymetry tint remains independent of that surf permission to avoid introducing seams. Further coast work is now parked at the owner's request.
- Fixed-camera evidence: `.codex-tmp/qa/water-r1/open-water-motion.mp4` (5.04 simulated seconds, 54 sampled frames) and `open-water-coastal/motion-report.json`. Water sample mean channel difference 3.795; land sample 0 changed channels. These are motion/registration observations only.
- Runtime proof complete for this candidate: reduced motion froze both clocks; zoom crossed field levels 0 -> 1 -> 0 without advancing paused phase; context loss reported fallback then recovered at the same time; Day/Night kept the same camera and phase; restored normal motion afterward. No graphics errors or console warnings at the final QA check. See `reduced-motion.json`, `context-recovery.json`, `zoom.json`, `calm.json`, `storm.json`, `night.json`, `resumed.json` in the QA directory.
- Final live user-preview sample: water GPU p50 3.013 ms / p95 4.054 ms over 120 samples, RTX 3080 Ti / ANGLE D3D11, 900 x 506 backing canvas, moderate weather, open-ocean camera. This is water-only GPU time, not whole-scene FPS. It is not directly comparable with the earlier larger-view baseline. Lower-end devices remain unmeasured. The live program exposes both displacement-map uniforms and reports GL error 0.
- Sol completed only the bounded allocation-cleanup lane. Root reviewed its changes and reran the integrated focused suite. Failed main-renderer construction and shader compilation now release prior allocations; successful rendering and analytical fallback retain their behavior.
- Removed unused legacy water CSS and the obsolete inland build command. Superseded water-field versions were moved out of public assets into `.codex-tmp/water-refactor/retired-fields/`, with current manifests and both live consumers verified first. No terrain art, pyramid, registration, camera or protected authoring files changed. No commit/push.
- Ocean remains a visual review candidate. Further coast work is parked until the island is complete. Inland visual polish, foliage masks/animation, and object-shadow projection remain separate future work. Browser visibility/hidden-tab behavior and lower-end hardware need additional runtime coverage; reduced motion and context recovery were exercised here.

## Tool migration

Use `npm run build:water`, `npm run check:water`, `npm run test:water`, and `npm run build:lighting` for this implementation. Historical `scripts/build-ninjaone-inland-water-r1.mjs`, `capture-ocean-comparison.mjs`, `measure-ocean-motion.mjs` and old offline ocean sources describe the retired renderer; they are retained as reference and are not validation tools for this pass. The old inland npm build entry was removed. Do not regenerate terrain through those historical scripts.

## Current checkpoint — 2026-09-05 (supersedes earlier progress counts)

Claude's land branch was fast-forward merged through `9809f6d6`. The 41 published cells were retained. Owner-authorized local snapshots of Tanium c1-1, c2-1, c3-1 and c4-0 bring the preview mount to 45 cells; these are review candidates, not changes to Claude's acceptance ledgers. `art-source/career-world/land-mount-r1.json` records original source paths and hashes. `npm run build:land-mount` derives both overview resolutions and the binary world mask from this same mount. The release manifest is unchanged. Protected world-authoring files remain intact.

The owner explicitly authorized merging and mounting land in this water lane. This supersedes the old frozen-layer restriction for this integration. No further coastline artwork was generated or authored here. Candidate cells retain their visible art differences; no grade or blur was added to conceal them.

Water fields and marine shelf geography now derive from the 45-cell mount (input hash `fead354dde7df7c7dbda074242ee2e38b03735abc22601df44f81395893d5c97`). The seabed remains ocean-owned below land. An independently toggleable ocean-details canvas composites above land but uses the marine mask and the same water optics and lighting. Inland polish, foliage mapping/animation, and projected object shadows remain deferred.

The floor and coral source artwork was preserved while its layout changed. `npm run build:ocean-layout` deterministically produces two 4096-square textures: a 256 m floor quilt and a 288 m detail layout containing 455 placements from 37 labelled colonies. Runtime uses simple texture sampling; labels and sprite extraction are build-time inputs. Placement is world-anchored. Repetition is reduced, not eliminated; finite motifs and local quilt blending remain visible. Neutral local normals are placeholders, not recovered microgeometry. Source provenance and exact generation prompts are under `art-source/career-world/water/`.

The two layout textures cost approximately 171 MiB decoded with mipmaps, in addition to the 16 MiB field array, geography, simulation targets, canvases and land. This is a material memory tradeoff. Earlier r1 GPU measurements do not describe this heavier detail pass. Lower-end devices remain unmeasured.

Large event waves now affect the main water surface normal/foam. The rejected detached wave sheet is removed; the event overlay draws spray only. Current event captures show changing crests and foam, but some bright foam patches remain coarse. Fantasy-scale impact polish is still a visual review item.

During runtime verification ANGLE reported a dynamic pixel executable compilation failure. Shader-source readback then proved the preview retained removed shader code despite page reloads. Restarting the owned preview server and reloading loaded the final baked-layout shader; current render state is ready. Do not attribute every failed trial solely to scatter complexity because stale preview code confounded those trials.

Validation: current focused suite 40/40; water derived-input check and protected-pipeline check pass. Final typecheck and production build pass. Latest full suite: 105 pass, 5 inherited failures, 1 skipped (Tanium envelope/focus, Kaizen paving/field dimensions, NinjaOne plan regeneration). The new overview/mask mismatch was a real integration regression and was corrected by deriving the mask from mounted overview alpha; its existing test was retained. Full-suite plan-file side effects were restored. Logs: `.codex-tmp/merge-claude/focused-current.log`, `full-verified.log`, and `build-baked-final.log`.

Current visual evidence is under `.codex-tmp/qa/water-r2/`: `mounted-world-final.png` shows all four formerly blank central cells at world scale; `tanium-filled-territory.png` records the closer overview; `seabed-varied-final.png` shows the baked layout through water; `event-cycle/` records 56 frames from water time 24.367 to 41.949 with event state. These are inspection evidence, not owner acceptance. Preview remains on port 4178. No commit or push was made.

## Coast integration, shelf variation and aquatic life — r3

Owner asked to tackle varied shelf opacity/depth, varied waves, water effects above land, and aquatic life. Changes are confined to water modules plus the shared layer registry and WaterLayer mount wiring; no additional land art, registration, mask or lighting authority was changed.

- `ocean/seabed/material.ts` varies broad shelf provinces (3–86 m transition widths), nearshore depth and slope while retaining the derived coastline distance. `ocean/material.ts` adds broad clarity variation and slower traveling wave-energy groups. These are artistic bathymetry/clarity proxies, not surveyed seabed or a fluid solver.
- `ocean/coast/material.ts` adds advancing/receding lace, wet contact and small spindrift above land. It reuses the existing water-owned z4 canvas; separate ballistic event spray remains at z5. Coverage is bounded to 1.7 m around the signed shore, marine-gated and under the Coastal ambience toggle. Wet darkening is a material effect, not an object shadow. Accurate tall-cliff spray/occlusion needs future height inputs.
- `ocean/life/material.ts` adds bounded schools and occasional ray silhouettes. Their analytic motion uses the shared ocean clock. They enter underwater shading before attenuation/reflections/foam, are marine/depth gated, and small fish fade when unresolved. L1_5 Aquatic life is independently toggleable. These are procedural silhouettes, not authored creature sprites or ecological simulation. Rare bespoke fantasy species remain future art work.
- Reef coverage now has broader empty habitat gaps. Floor depth remains available even with floor artwork hidden, so toggling seabed/reef art does not remove aquatic-life depth inputs.
- No extra fullscreen pass or texture allocation was added for r3. Existing 4096-square layout texture memory costs still apply. Performance on lower-end hardware is unverified.

Validation: 40 focused checks pass, typecheck/build pass, scoped lint has zero errors and one inherited unused-priority warning. Latest full run: 106 pass / 4 inherited failures / 1 skipped; the plan regeneration test passed on this run (prior checkpoint had five failures). Remaining failures concern capital envelopes, paving, territory ownership/focus and Kaizen topography. Existing test semantics for disabling the overlay were updated because it now has three independently owned contributors; base-pass restoration, all-off clearing and depth retention remain covered. Authoring-plan side effects from the full run were restored.

Browser evidence: `.codex-tmp/qa/water-r3/coast-final.png`, `contact-isolated.png`, `life-isolated.png`, and `coast-life-motion.mp4` (29 sampled frames across 9.908 simulated seconds). The isolated life capture contained 995 pixels with alpha above 10 at that camera; turning off all overlay contributors produced zero nontransparent pixels. The contact-only image shows coverage confined to narrow shoreline segments. Initial GLSL compile failure from the reserved identifier `patch` was corrected before these captures. These observations do not constitute owner visual acceptance. Keep default Coastal / Day 13 and normal motion for delivery.

## Ocean checkpoint r4 — prior to inland work

Owner requested more noticeable aquatic motion/coast contact and a commit before inland work. The live ocean clock was advancing; low readability came from slow travel, seabed-depth attenuation and double-applied creature coverage. Schools/rays now travel roughly twice as fast, have stronger tail/fin motion and dorsal/flank contrast, and swim at a separate 1.1–2.7 m depth (capped by local depth). Underwater contributors compose with straight alpha once, before shared surface optics. Coast contact now reaches farther and stays brighter for more of each localized set, bounded within 2.3 m of the shore. No land artwork changed.

Evidence: `.codex-tmp/qa/water-r4/motion/` has 31 fixed-camera frames across 9.718 simulated seconds with clock records; `life-isolated.png` shows the current ray/school silhouettes. Normal daylight/Coastal settings retained. Source readback reports `ocean-life-readability-r4`, ready and GL error 0. Creatures remain procedural and sparse; they are intended for close views, not constant world-view activity.

Checkpoint gates: focused water/events/lighting 30/30; full suite 105 pass / 5 inherited failures / 1 skipped (plan regeneration is intermittent across these runs); typecheck/build pass; full lint zero errors / 20 warnings. Protected authoring pipeline and current field inputs pass. Full-test plan-file side effects restored. Unreferenced intermediate field generations and the unused procedural seabed draft were preserved under `.codex-tmp/water-refactor/` rather than included as served artifacts. Owner requested local commit; no push authorized.

## Inland work started after checkpoint 30af7d7d

The ocean/lighting/45-cell mount checkpoint was committed as `30af7d7d`; the worktree was clean before this separate inland pass. No push. The first inland change replaces tightly periodic ripple bands with advected irregular flow normals, restrained pooled-water ripples, stationary mineral-bottom depth shading, and broken waterfall aeration. A first muddy palette was revised toward cooler water with stronger channel highlights after browser inspection. Existing water coverage and source-bound flow annotations are unchanged.

Initial browser views: `.codex-tmp/qa/inland-r1/brook.png` and `gorge.png` show the first iteration, not the revised final palette. The gorge shows that landing pools still need purpose-built impact foam, and the island needs a wider flow/fall mapping review. This is started work, not an inland completion claim. Existing flow metadata explicitly identifies the purple brook and two gorge falls; unannotated water still relies on the derived pool/channel heuristic. No new land, ocean or shared-light changes were made in this inland pass.

Inland-only gates: 25 water/lighting tests pass; typecheck, scoped lint and production build pass. The ocean checkpoint's full-suite result remains 105 pass / 5 inherited failures / 1 skip. Inland changes are uncommitted for review.

## Regional inland substrate and waterfall revision

Owner requested fantasy color aligned with each region while retaining transparent water and a bed in rivers/ponds, then explicitly corrected the purple clearing to BLUE water with PURPLE HIGHLIGHTS. That correction is binding: do not return the whole brook to purple.

`inland/palettes.ts` defines water-owned meadow, amethyst-highlight, crystal, limestone and forest palettes, blended over current terrain-cell registrations without changing them. The amethyst region uses blue sand/transmission with violet stones. `inland/bed.ts` supplies stationary, irregularly placed mineral pebbles and sand, refracted through surface normals, attenuated with depth and lit using the shared lighting adapter. This is a procedural visual substrate, not generated texture art or surveyed bathymetry. Palette transitions feather across neighboring cells; no abrupt region swap or land repaint.

`inland/falls.ts` derives its two current impact locations from the field manifest's source-bound fall endpoints. A dedicated advected curtain replaces the long solid strands; the terminal curtain dissolves into churn, with broken outward ripples. Coverage remains existing inland water only. The current flow annotation set is still limited; unannotated falls elsewhere need mapping and the existing authored alpha limits how far spray can extend. No accurate cliff height or occlusion reconstruction is claimed.

Evidence: `.codex-tmp/qa/inland-regional-r1/blue-brook.png` shows the blue clearing water against purple land; `gorge-first.png` records the initial curtain/impact pass before the subsequent terminal-opacity correction. Final motion proof is recorded in the same directory. The initial full-purple palette and terminal opaque bulb were revised following owner feedback and rendered inspection. These are candidates, not owner acceptance.

Gates: 27 focused inland/water/lighting tests pass; typecheck/scoped lint/production build pass. Full suite 107 pass / 5 inherited failures / 1 skipped. Palette registrations and fall-endpoint contracts have build-time tests. Plan-file side effects were restored. Changes remain uncommitted after ocean checkpoint `30af7d7d`; no push.

Waterfall follow-up: opacity-only revisions left the broad terminal footprint. An L3-off browser check exposed the complete pool opening. The final curtain is now constrained to the source-bound path segments (1.4–3.0 m feathered envelope); the landing-pool churn is separate. This is a material envelope, not a change to land/water coverage. Earlier `gorge-first.png` and motion captures precede this correction; `gorge-path-final.png` records the final view.

## Airborne inland spray and continuous fall coordinates

Owner requested more spray and a more realistic fall. Added `inland/spray.ts`, a bounded 256-particle pass per visible mapped fall: rising/outward ballistic droplets, drifting low-opacity mist and finer spray along the curtain. It reuses the existing water-events canvas and WebGL context above land; there is no additional full-screen canvas/context. The program/VAO/lighting adapter remain inland-owned. It consumes shared world lighting/cloud shadows and the inland clock, obeys L3 visibility/effects/reduced-motion lifecycle, culls out-of-view emitters and has disposal coverage. This is approximate ballistic spray, not cliff collision or volumetric scattering.

Close inspection exposed horizontal curtain seams from world-position dot products against changing flow vectors. `inland/falls.ts` now derives continuous arc length from the source-bound path segments; curtain textures use across-path/along-path coordinates independently of quantized field direction. The terminal segment fades to zero at its foot so clamped curtain coordinates cannot stamp vertical streaks into the landing pool. Pool churn/ripples and airborne particles remain separate. New tests check segment continuity, terminal identity, spray visibility/culling and resource disposal.

Final focused checks 29/29; full suite 109 pass / 5 inherited failures / 1 skipped; typecheck/scoped lint/build pass. No land or ocean material edits in this slice. The ocean checkpoint remains 30af7d7d and inland work is uncommitted. Current evidence is under `.codex-tmp/qa/inland-spray-r1/`; earlier regional captures predate this spray/coordinate correction. No owner visual acceptance claimed.

- Close-view follow-up: fall texture coordinates now use accumulated segment length; terminal shading stops at the actual path foot. This removes phase resets at direction changes and constant-coordinate streaks beyond the endpoint. Landing foam receives rotated, warped sampling to break the square noise lattice seen at close scale.
- Browser lifecycle proof under `.codex-tmp/qa/inland-spray-r1/`: event-context loss/restoration returned to two inland spray draws, reduced motion held the inland clock at 107.004, and normal motion resumed. The pre-final-foam sequence covers 31 frames from 107.004 to 116.805. Final review capture follows the foam adjustment.

## Main gorge waterfall rebuilt as geometry (owner approved)

The fixed-opening material approach was rejected by the owner; this slice replaces only the main gorge fall. `inland/gorge/model.ts` derives the existing feeder/lip/landing anchors and a projected ballistic trajectory. `gorge/shader.ts` renders a curved lip, a continuous sheet with six narrower separating ribbons (64 strips each), and its own impact/plume pass. Texture travel uses flight time, so detail stretches/accelerates down the fall. The lower cascade remains the prior implementation for comparison.

The canonical land tile contains a transparent waterfall opening, so reducing water opacity previously revealed flat blue water rather than cliff depth. A water-owned backing pass samples the adjacent right-hand rock face from that same tile, clipped by the tile's original alpha to the opening. It is a reviewable material reconstruction, not recovered geometry or a change to the land file. This adds one 2048-square sampled texture (approximately 21.3 MiB with mipmaps), one shader program and three bounded draws to the existing effects context. No additional canvas/context is created. Main-fall old curtain/impact shading is disabled; its pool retains inland surface optics. Existing airborne droplets/mist render after the new sheets.

First candidate was too faint; the second exposed overly regular strands. The final review candidate uses a broader translucent body and narrower ribbons whose width, lateral position and coverage vary through flight. The geometry model, anchors and layer boundaries remain the same. Prior source and the owner's rejected screenshot are preserved under `.codex-tmp/qa/gorge-rebuild-r1/before/`.

Gates: 31 focused water/inland/lighting tests pass; typecheck/scoped lint/build pass; full suite 111 pass / 5 inherited failures / 1 skipped. Tests cover source-backed readiness/disposal and increasing sheet travel speed between fixed anchors. Water input hashes and protected authoring pipeline remain current, and the terrain diff is empty for this slice. Inland changes remain uncommitted after ocean checkpoint 30af7d7d; no push or owner visual acceptance is claimed.

## Pool outflow, depth and distant detail

Owner requested leakage/ripples from the pool, a darker lower/deeper portion, and less harsh rendering when zoomed out. `inland/gorge/pool.ts` adds a water-owned basin-depth proxy, expanding surface-normal ripples and restrained foam traces along the existing route to the lower-cascade lip. Both pool/outlet anchors come from the current mapped fall features; no new bank openings are created. The lower terminal basin also receives extra depth. Increased depth changes attenuation instead of multiplying the whole scene by a dark tint. The main waterfall geometry is unchanged.

The first outflow trace was too solid on inspection and was reduced to intermittent finer traces. At distance, narrow ribbons fade as their world width becomes unresolved, and spray opacity accounts for projected particle area rather than making subpixel droplets artificially bright. The broad sheet and low-frequency mist remain; land art is not blurred or altered.

Gates: focused water/inland/lighting 31/31, full 111 pass / 5 inherited failures / 1 skipped, typecheck/scoped lint/build pass. These changes are still part of the uncommitted inland review. Final close/wide motion evidence is under `.codex-tmp/qa/gorge-pool-r1/`.

## Targeted main-sheet material correction

Owner approved reducing the main fall's lined/streaky appearance while retaining its curved lip, placement and pool. Only `inland/gorge/shader.ts` changed for this visual slice: a shared across-sheet material coordinate replaces repeated per-ribbon highlights/normals; the broad sheet remains connected and the narrow contributors fade into localized breakup toward the lower drop. Geometry calculations, basin/outlet treatment and land assets are unchanged. Prior shader preserved at `.codex-tmp/qa/gorge-sheet-r1/before-shader.ts`.

Evidence: `.codex-tmp/qa/gorge-sheet-r1/close.png`, `wide.png`, and `motion/` (22 frames across 6.893 simulated seconds). Focused 31/31; full 111 pass / 5 inherited failures / 1 skipped; typecheck/scoped lint/build pass. Changes remain uncommitted. Visual review remains with owner.

## Owner revision: lighter upper fall, side spills, no lower landing

Owner clarified that the lower cascade falls into the gorge and must not show a foam landing. The lower fall now has `hasLanding: false`: no endpoint foam/rings or rising impact particles; only along-curtain particles remain. Its material darkens progressively into the gorge. This supersedes retaining the lower fall as an untouched comparison. The upper sheet/pool are lighter while retaining the current geometry, depth variation and ripples.

Four small spill strips locate the upper pool's existing side edges using the canonical tile alpha, arc downward over the sides and fade out without inventing new land openings or impacts. They use shared lighting on the same water-owned effects canvas and fade at distance. No land pixels/assets were authored or changed. Mechanical gates: focused 31/31; full 111 pass / 5 inherited failures / 1 skipped; typecheck/scoped lint/build pass.

Evidence: `.codex-tmp/qa/gorge-spill-r1/both-falls.png`, `motion/` (20 frames, 6.234 simulated seconds), and `final-runtime.json` (both GL errors 0; normal motion active). Changes remain uncommitted for owner visual review.

## Island-wide inland pass — current state

The owner's request to cover all inland water is implemented for every currently mounted land cell. The inventory covers 45 cells and 108 reviewable features: 37 stream routes, 30 pool regions and 41 waterfall/cascade segments. This includes 39 newly mapped falls; the reviewed gorge pair and purple-brook paths retain their original field bytes. The detailed current inventory and source limits are in INLAND-WATER-REVIEW.md.

New authoring data: `art-source/career-world/water/inland-island-r1.json`, with canonical-source hashes, normalized paths, pool regions and fall anchors. `build:water` now derives the fields and shared mapped-fall atlas. The generic fall renderer reuses the gorge sheet material with per-location anchors, measured water widths, scaled spray and view/size culling; the bespoke gorge renderer remains intact. One versioned 2048x2560 atlas supports the other falls (about 26.7 MiB with mipmaps). Rivers use bounded two-phase advection rather than global dot-product phase changes at bends. L3_4 now controls the actually implemented inland sand/stone bed independently.

Every feature was framed in the browser and contact sheets were inspected. A c4-1 coastal cove incorrectly inferred from discarded-bleed notes was removed from the pool inventory. A later wide audit exposed circular inland-material patches at sea outlets; the final generator preserves prior open-ocean flow classifications. `geography-proof-delivery.json` records zero shoreline-channel changes across all 341 tiles, zero changes to original ocean pixels, zero inland changes since the full visual audit, and zero field-byte changes in the reviewed purple/gorge cells. Source art seams/occluded gaps, including the author-flagged Tanium quarry edge handoffs, remain unaltered.

Verification: 43 focused tests pass; full suite 116 pass / 5 inherited failures / 1 skipped; typecheck and production build pass; full lint 0 errors / 20 inherited warnings. All 108 final feature captures initialized ready without recorded render errors. Context loss/restoration returned both fall renderers to ready at the same paused clock; bed/effects independence was checked; normal motion and Coastal defaults were restored. Latest native GL readbacks were zero for both contexts. Lower-end performance is unmeasured.

Evidence: `.codex-tmp/qa/inland-island-r1/final/runtime/` (108 feature views), `geography-proof-delivery.json`, `final/recovery.json`, `final/terraces-delivery.png`, `final/delivery-motion/` (45 frames, 6.211 simulated seconds), and `final/delivery-runtime.json`. Intermediate untracked field builds/unversioned atlas were archived under `retired-builds/` after the live final revision was confirmed. No tracked checkpoint assets were deleted. All inland work remains uncommitted after ocean checkpoint 30af7d7d; no push or visual acceptance claim.

## Owner checkpoint request

Owner stopped the proposed cutout/arching correction and requested committing the current inland work and merging it into local main. No cutout or waterfall-path correction was applied in that interrupted follow-up. The current visual candidate, inventory, known source-art limitations and five inherited full-suite failures are preserved for this checkpoint. No push was requested.
