# Ocean / inland continuation — 2026-09-06

## Latest owner revision — r7

Owner still rarely saw aquatic life after two density passes. The revision changes visibility, keeping the r6 population, size ranges and trajectories. Near-surface animals are no longer excluded over seabed deeper than 22 m. Swimming depth is now 0.45–1.15 m, capped by local depth; resolved small fish retain coverage sooner; flank/ray contrast is stronger and unresolved stripe detail is filtered. Land, water fields, reefs, wave behavior and shared camera/LoD are unchanged. Renderer revision: `ocean-life-visibility-r7`.

Evidence is under `.codex-tmp/qa/life-readability-r7/`. At water time 45, the shared registered 802 x 512 overlap of isolated captures contains 255 -> 702 pixels with alpha >10; alpha-weighted coverage is 108.05 -> 284.62 pixels. This is mechanical visibility evidence, not visual acceptance. Viewport handling shifted the camera by about 108 px, so the comparison uses registered overlap rather than claiming identical full frames. The mis-scaled page captures from viewport setup are not visual proof. `aquatic-motion.webp` is a verified 20-frame, 633 x 356 lossless capture of normal motion; `motion.json` records identical cameras over 9.433 simulated seconds. The browser is restored to normal motion with temporary viewport overrides cleared.

Live GPU readback confirms the deep-bottom gate is absent and GL error is zero. Typecheck/build and 41 focused tests pass; full suite remains 120 pass / 4 existing failures / 1 skipped. Current field provenance still passes. Review moving schools at normal coastal zoom before further density or size changes.

## Previous owner revision — r6

Owner requested remaining painted-water cutouts and more aquatic life. Eight source cells were repaired: six authored cells plus coast preview c1-4 and c4-8 (the first new screenshot). Candidate repairs are tracked under `art-source/career-world/water/cutout-sources/`; candidate status is unchanged. Source RGB is preserved; only alpha decreases. Gorge mist detected by the color heuristic was retained, with all NinjaOne land changes from that trial restored.

The large basin in the second screenshot was already a land cutout. A too-wide sea-clearance heuristic rendered it as a river. Rocky marine inlets now use a smaller clearance, while the established broad-sea handoff protects explicit river/fall annotations. Registered feature-point comparison finds no unintended inland-to-ocean changes. Increased aquatic school occupancy, density and group size; creature scale and motion profiles are unchanged. Current renderer revision: `ocean-cutouts-life-r6`.

Final field input: `16b7fcde51419c352b66d2fd18e3c0994af215e5060bbf3296af80af77baf4e9`. All 67 mounted cells and 82 inland features remain represented, with 33 mapped falls and 26 deferred annotations. Source mechanics: `water-polish-reference/cutout-verification-r6.json`. Runtime proof: `.codex-tmp/qa/water-cuts-r6/`. Focused 41/41, typecheck/build, current-field and protected-tool checks pass; full suite 120 pass / 4 existing failures / 1 skipped.

Cut repairs use `water-cut-pass.mjs --backup-dir` and the existing restitch pipeline. Preview repairs use `mount-candidates.mjs --recorded --tone art-source/career-world/tone-gains-r1.json`; this verifies recorded source hashes and preserves other review assets. Do not blindly run the land lane's serve shell script: it changes working directory and recalculates tone/chain data. This pass preserved the existing tone table and restored six unrelated Tanium served cells after the broad export. Below is the prior r5 checkpoint and its history.

## Objective

Continue in `C:/Users/Steve/.codex/worktrees/ocean-inland-polish/portfolio`, branch `codex/ocean-inland-polish`: fit water to the completed coast, polish the ocean, then finish inland mapping and visuals. Owner's six reference crops are preserved in `water-polish-reference/owner-1.png` through `owner-6.png` (first three: unwanted wave texture; last three: coastal opportunities).

## Source authority

- Direct owner request in this task authorizes ocean/inland changes. Preserve the land artwork, registration, camera and shared lighting contracts.
- Local main was `32594a99`; fetched origin/main was older (`018c64fb`). The committed current coast was on `codex/land-lod-completion` at `9ebf0350`, not yet on main.
- Integration commit `0330d76f` branches from main and merges that land commit. Main and both source worktrees were not rewritten. Nothing pushed.
- The land merge also carried different shared LoD timing values. The final water checkpoint retains main's frozen camera/world/LoD files; those timing changes are excluded from this water lane.
- `WATER-REFACTOR.md` documents the water implementation on main. The August `OCEAN-STATE.md` refers to the superseded renderer, not the current `layers/water` implementation.

## Current state

- The exact land mount from the land commit contains 67 cells: 45 earlier cells plus 22 new coastal cells. Four coastal snapshots retain their existing candidate status; this task does not promote them.
- Current water fields and fall atlas are rebuilt from that mount. Field input: `d7a8989738199ef9a86484804ae1a747642542f6052455fe732a95f3d6ff5f15`.
- Nineteen earlier cells have changed water masks. Within conservative feature/context bounds, 26 annotations on 14 cells are affected. Their complete definitions and previous source hashes remain in `inland-island-r1.json` under `pendingReview`, excluded from active fields and fall draws. No obsolete path is silently rebound to changed art.
- 78 inventory features plus four existing brook/gorge annotations remain active; 33 other falls use the refreshed shared atlas. New coastal cells have alpha-derived water but no invented inland annotations. Audit: `water-polish-reference/coast-integration-audit.json`.
- Ocean candidate `ocean-coast-polish-r5b`: smaller shoals, deep-bodied reef fish, slender ribbon fish, and rays; seeded sizes, fin/tail motion, and continuous slow/cruising/bursting speed profiles. Subpixel creatures fade rather than enlarge.
- Three water-owned reef color/depth provinces: west coves, east shelf, and southern shelf. They reuse the existing coral artwork, marine masks, and water optics, with turquoise/violet/gold pigment. They add no texture allocation or rendering pass. Existing coral motifs still repeat.
- The ordinary whitecap field was retaining foam and punching thresholded high-frequency holes into its coverage. Shorter history, smooth density variation and weaker residual coverage replace that mottled trail. Large-event wake density also decreases as it spreads. Calm-water surf edges now stay ordered.
- Raw-hashed water inputs are pinned to LF in `.gitattributes`; CRLF conversion caused false source-hash failures during checkout.

## Decisions

- **Implemented:** integrate committed current coast, retain main's newer water/inland modules, rebuild water coverage from mounted alpha, preserve affected inland work for remapping, produce an ocean review candidate.
- **Pending visual review:** coastline contact, reef intensity and placement, creature scale/density/body readability, and foam appearance in motion. Only Steve determines visual acceptance.
- **Deferred until ocean review:** remap the 26 affected inland annotations, inspect the 22 new cells for real inland features, then finish inland flow/falls and continuity. This is not a completed inland mapping claim.

## Verification

Evidence directory: `.codex-tmp/qa/ocean-inland-polish/`.

- Integration: focused water/events/inland/mount 39/39; typecheck and production build pass. Full suite 118 pass / 4 fail / 1 skipped. Remaining failures: Tanium capital envelope and focus, Kaizen paving coverage, Kaizen topography dimensions. Lint: zero errors, 30 warnings.
- Live GPU program inspected: revision `ocean-coast-polish-r5b`, updated whitecap expression present, GL error 0. Northwest, eastern and southern coastal views reached `ready` with zero pending field tiles.
- `west-reef.png`, `east-lagoon.png`, `south-shelf-final.png`: rendered regional candidates. JSON sidecars record camera/runtime state where present. Earlier `south-shelf.png` exposed mottled patches with **zero active large-wave events**, falsifying the initial event-only diagnosis.
- `life-isolated-0.png` through `life-isolated-5.png` and `life-motion.json`: six samples across 5.894 simulated seconds. First four share 1373 x 772 dimensions and show changing creature coverage; last two resized to 1388 x 781 and must not be used for registered image differences against the first four. All reef/coast/life contributors off yielded zero nontransparent overlay pixels. All toggles restored.
- These checks prove mechanics and a running candidate, not final visual quality. Lower-end performance, exhaustive island-wide close views, and a full lifecycle/context-loss matrix remain unverified for this pass.
- Pre-final captures used the land branch's imported LoD timings; `world-final.png` and `review-final.png` are refreshed with the final, main-preserving LoD policy. Water code and terrain image bytes are the same; intermediate land detail admission may differ.
- The old `capture-ocean-comparison.mjs` assumes superseded telemetry/selectors and failed before capture. Current proof used the app browser and its supported CDP capability; do not treat that script's failure as a renderer failure.

## Open work

1. Review the ocean candidate against the owner crops, especially the foam in motion and tiny-creature readability alongside the land.
2. Refine any rejected coastal regions or reef/body motifs in bounded water-only changes; preserve the current screenshots for comparison.
3. After the ocean direction is settled, remap pending inland features and survey the new coastal cells. Restore each deferred annotation only against current source geometry.

## Next action

Open the local preview at `http://localhost:4180/?view=water` while the owned preview server is running (`npm run dev -- --port 4180` from this worktree). Start the ocean review at west camera origin `[0.129,0.252]`, span approximately `0.075`, then east `[0.516,0.231]` and south `[0.418,0.914]`. The current task's browser tab retains normal ocean/layer settings.
