# NinjaOne Capital City Restart Handoff

This is the crash-safe continuation ledger for the active city restart. Append a checkpoint at least every 30 minutes while the goal is active. Each entry must record completed work, remaining work, evidence, concerns, rejected approaches, pivots, checkpoint state, and the exact next action.

## 2026-08-16 22:16 CDT

### Goal and locked decisions

- Rebuild the NinjaOne capital as progressive node-based LoD while preserving immutable land/water authorities and reversible city-owned L4 sublayers.
- World and territory are preload-only for the city plate. The first visible city foundation is capital detail; site and close add registered detail.
- Reuse registered L2 native conifer assets. Do not use the old city foliage atlas or generate replacement trees.
- Train is deferred. The station base must remain train-free until terrain, water, and close-detail registration are accepted.
- Any ImageGen work requires a Director-defined defect, a High/xHigh worker contract, at most two candidates, quarantine-only worker output, and Director runtime verification before promotion.
- Prior tests are classified as regression, stale/superseded intent, or flaky/environmental before modification.

### Completed in this restart

- Replaced the prior city runtime with an R3 registered foundation and reversible L4_0-L4_7 ownership structure.
- Restored ordinary free-camera zoom to the shared camera path and removed D06-specific wheel interception. Live progression reached capital -> site -> close and the prior close minimum span.
- Hid the city plate at world/territory; live territory proof reported no city layer.
- Preserved global water by clearing registered water from the city context and retaining city-owned L4_0 interaction only.
- Classified and removed the false central shadow-pocket water component while retaining the real central river/lake and station/lower channel.
- Replaced the baked-train station review base with quarantined train-free I18. Source alpha is byte-identical; only the train/steam patch changed.
- Added the I17 close civic overlay behind/with the station base.
- Fixed focused D06 routing: free-camera building cohorts now remain out of fixed D06 proofs.
- Quarantined the defective free-camera close whole-building cohort. It produced floating, overlapping full-building cutouts; site remains the only tier using that cohort until close-specific detail sockets are proven.
- Generated and independently validated rear-cliff candidate LFX01 candidate 02. It remains Director-review only, not production-promoted.
- Mounted a close-only city foliage overlay that references the registered L2 native-conifer atlases. A first wholesale pass was rejected because terrain sockets intersected architecture; the builder now admits only sockets whose context rectangle and lower contact band are already vegetation-dominant.
- Reduced the I18 station base and I17 close overlay together to a reversible 0.9 runtime review scale around their original bottom anchors. This exposes more native land and water beside the waterfall without changing asset pixels.

### Current evidence

- Focused gates after D06 suppression, close-cohort quarantine, foliage gating, and station scaling: 28/28 tests pass.
- Typecheck: pass.
- Focused ESLint: pass.
- Live free-camera sequence after the repair: spans `0.1961` capital, `0.1538` site, `0.1206` close, `0.0946` close; focus remained `none`.
- Live close screenshot after cohort quarantine shows no floating/overlapping promoted buildings. It falls back to the cohesive parent context and is visibly soft, confirming close now needs additive texture/tree/fabric detail rather than full-building replacement.
- Native foliage admission manifest contains 55 globally admitted registered L2 instances. In the inspected free-close camera, six of 32 camera candidates passed the context/contact gate; the ungated 32-tree pass was visually rejected for architecture collisions.
- Focused D06 close runtime proof contains zero free-camera detail groups and zero city tree overlays. The 0.9 station socket exposes more waterfall/terrain and remains rail-aligned in the inspected full-frame proof; user acceptance is still pending.
- LFX01 review asset: 1448x1086 RGBA; SHA-256 `FC66B4944519EA99F83290EC7E2514ACF69241456D8018E57C126A5B50DE604B`; alpha bbox `[199,131]-[821,320]`; 96.337% transparent; no alpha outside the allowed ROI; zero chroma-green pixels; all corners transparent. Alpha is hard-edged, so live seam acceptance remains required.
- I18 train-free review asset: 1448x1086 RGBA; SHA-256 `CDB3DEA3D7271698E846EED6A53CAC9DD670B22FBF1112CDAE511216F7FE23D7`; source alpha preserved; changed-pixel bbox `[684,470]-[1179,844]`.

### Test-policy decisions

- `ENVIRONMENT_LAYER_DEFINITIONS.length === 19` was stale after explicit acceptance of parent L4 plus L4_0-L4_7; corrected to 20 while preserving uniqueness and parent invariants.
- The semantic-zoom test still named `resolveDetailState`; the implementation intentionally moved to the city-aware centralized resolver. The test was updated to require exactly one `resolveNinjaOneCapitalDetailState` call, and an unnecessary second diagnostic resolution was removed from runtime.
- The wheel test expected the old local name `camera`; the repaired path intentionally composes from `publishedCamera`. The invariant remains: one normalized candidate is queued, no camera-ref burst accumulation, and no district interception.

### Rejected approaches and pivots

- Rejected procedural SVG rear cliff: it created a large dark dome and did not match the parent art.
- Rejected retaining the full-building close cohort: correct alpha replacement did not solve its scale/contact/overlap failure.
- Rejected treating the false water shadow pocket as real hydrology; its exact connected-component signature is now fail-closed in the builder.
- Do not solve tree mismatch with newly generated city vegetation. Reuse the L2 r4 conifer atlases and prove their registered sockets over the city context.
- Do not regenerate the station support base until its approved I16/I18 socket and alpha geometry are verified live; current concern may be registration/scale before artwork.

### Remaining work, priority order

1. Finish and mount the close-only L2 native-conifer reuse overlay under L4_6, clipped to the city context; run typecheck, focused tests/lint, and live close inspection for building occlusion and duplicate/darkened trees.
2. Inspect D06 site and close cold after the focus fix; prove unrelated building nodes are absent.
3. Verify the train-free I18 station at its registered socket against the waterfall and global water. Decide whether a smaller support footprint or a new xHigh asset-repair worker is actually required.
4. Review LFX01 in live capital/site/close/D06 views. Promote only if it closes the upper rear cut without a ridge seam, water obstruction, or new land mass; otherwise remove it.
5. Replace the quarantined close full-building cohort with additive close layers: registered native trees, texture/lighting/shadow/contact, circulation/fabric, props, and district-specific overlays. Do not re-enable full-building cutouts without exact replacement registration.
6. Audit existing close art and inferred fabric/circulation assets. Quarantine anything without a proven parent-space socket.
7. Run the R3 builder, typecheck, lint, focused city/architecture tests, full `npm test`, and build. Record exact counts and classify every new failure under the accepted test policy.
8. Create a narrow checkpoint commit containing only the city restart files, tests, review assets, and this ledger. Do not stage unrelated dirty-worktree changes.

### Current concerns

- The parent city context remains blurry at close after correctly quarantining the overlapping building cohort; this is an honest gap, not acceptance.
- The station support base appears too broad beside the waterfall in user evidence. Exact mount geometry must be proven before ImageGen.
- The deterministic foliage color/contact gate removes demonstrated building collisions, but thresholds are only a proxy for authored sockets. Additional camera coverage is required before treating all 55 admitted instances as accepted.
- LFX01 has no partial-alpha pixels. Even with correct perspective and ROI, hard boundary seams may be visible at runtime.
- LFX01 remains too subtle at the actual capital view and does not fully resolve the flat upper city cut. Do not promote it without a materially better live result.
- The worktree contains extensive prior/user edits and deletions. A checkpoint must use an explicit path list.

### Exact next action

Create a narrow green checkpoint commit, then inspect free close across additional camera positions and decide whether the 0.9 station socket is sufficient or a support-base-only xHigh repair asset is required.

## 2026-08-16 22:30 CDT

### Checkpoint state

- Created work-in-progress recovery checkpoint `8156b47` (`checkpoint: preserve NinjaOne city restart`) on `codex/career-world-rebuild`.
- Scope: 488 explicitly staged Career World city-restart files; 9,549 insertions and 18,842 deletions. This includes the intentional legacy city-package replacement, R2/R3 city assets, runtime, tests, scripts, review assets, and this ledger.
- Pre-commit evidence: no unstaged tracked files, no untracked non-ignored files, and `git diff --cached --check` passed.
- This checkpoint is a backup only. It does not promote I18 or LFX01 from review, accept all 55 foliage sockets, accept the 0.9 station scale, or declare the city complete.

### Tasks completed since the prior checkpoint

- Committed the verified restart state so the current node/LoD repair is recoverable after a crash.
- Preserved the latest focused gate evidence: R3 builder, typecheck, focused ESLint, 28/28 focused tests, and production build passed before the checkpoint.

### Tasks left and concerns

- Inspect free-close foliage from additional camera positions; the vegetation/contact gate is still only a proxy for authored socket approval.
- Decide whether the 0.9 station footprint is sufficient beside the waterfall. If it is still too broad, define a support-base-only xHigh ImageGen contract instead of regenerating the whole station.
- Remove or replace LFX01 if wider live review confirms that it does not close the upper rear land cut.
- Add close detail as registered texture, lighting, shadow, contact, circulation/fabric, props, and district overlays; do not restore overlapping full-building cutouts.
- Run the full test suite after the next visual batch and classify any failures under the accepted test policy.

### Exact next action

Inspect the free-close native-foliage overlay across additional camera positions, then make the station-support decision using the registered 0.9 runtime proof.
