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

## 2026-08-16 22:49 CDT

### Completed work and checkpoint

- Live on/off layer inspection disproved the 55-socket rectangle gate: at least one admitted native conifer covered city architecture. This was a real visual defect in the new city foliage work.
- Fixed the shared foliage selector so an optional city admission set is applied before the 32-instance residency budget. Default L2 selection behavior is unchanged.
- Rebuilt city admission against the actual canopy atlas alpha rather than each tree's rectangular bounds. The gate now requires context alpha `>= 0.8`, base vegetation `>= 0.6`, whole-canopy vegetation `>= 0.65`, and structure overlap `<= 0.3`.
- The admitted city cohort fell from 55 sockets to 9. All assets remain the existing L2 native-conifer atlases; no city foliage atlas or generated tree was introduced.
- Inspected center, east cliff, west terraces, and lower-west close cameras. Those views collectively covered all nine admitted sockets. No new architecture occlusion was visible, and the tree density is materially lower than the rejected 55-socket pass.
- Created checkpoint `fa109aa` (`fix: gate city tree reuse by canopy alpha`).

### Evidence and test decision

- R3 builder: pass; transparent fraction `0.25198788193278593`; inland-water coverage `0`.
- Focused foliage, R3 foundation, and city-LoD tests: 27/27 pass.
- Typecheck: pass. Focused ESLint: pass.
- A newly added selector regression fixture initially used the first close-tier camera (`max span 0.1608`), which is outside the existing L2 foliage retain contract (`0.14`) and therefore correctly selected zero trees. The fixture was corrected to the next live close step (`max span 0.1261`); no prior passing test or production threshold was changed.
- Edited large-file anchor: `selectNinjaOneEnvironmentFoliageInstances` in `ninjaOneEnvironmentFoliage.ts`; the optional admission filter was added at the unique candidate-selection site.

### Remaining concerns and tasks

- The alpha/color gate is deterministic but still a proxy for authored sockets. The nine current sockets passed the inspected cameras; a later city-context revision can invalidate their color evidence and must force a rebuild/review.
- The parent city plate is still soft at close. Additive texture, lighting, shadow/contact, circulation/fabric, props, and district overlays remain missing.
- The 0.9 station footprint still needs a cold D06 site/close comparison against the waterfall and water channel before acceptance or a support-base-only xHigh repair.
- LFX01 remains review-only and still appears too subtle to solve the upper rear cliff cut.
- Full `npm test` remains deferred until the next visual batch; the last full-suite baseline predates this foliage correction.

### Exact next action

Run cold D06 site and close proofs with the 0.9 station footprint, compare native water/land exposure at the waterfall, and decide whether registration is sufficient or a support-base-only asset repair is required.

## 2026-08-16 23:22 CDT

### Completed work and evidence

- Cold D06 proofs confirmed that scaling I18 to `0.9` did not repair the solid station undercroft; the support still blocked the waterfall channel and site/close reused one overly detailed station representation at every tier.
- Director-verified and promoted two quarantined xHigh worker outputs into `_review` only:
  - `I20-station-capital-cluster-no-train-r1-alpha.png`: `384x191` RGBA, source alpha byte-identical, `6,475` changed RGB pixels confined to the train/steam ROI, empty continuous rails, SHA-256 `CD4BE5472FC37316F4A87B3EE47C5D8F3AACC27C3AD8C3AA58966DF2FCD995D2`.
  - `I19-station-support-base-narrow-r1-alpha.png`: `1448x1086` RGBA, `31,390` alpha reductions confined to the approved undercroft ROI, zero alpha expansion, zero retained-pixel RGB changes, six opened spans, SHA-256 `5489AA16D0AE7745D44ACC9DA7BD610F48690B52D9C74B32CD774AAD444BF0A7`.
- Repaired runtime LoD routing: capital now mounts lower-resolution I20 at the registered capital socket; site and close mount I19; close alone adds I17. The train remains absent/deferred.
- Live fixed-view evidence:
  - capital DOM assets: `I20` only;
  - D06 site DOM assets: `I19` only, with native water visible through the west spans;
  - D06 close DOM assets: `I19,I17`, with native water visible through the undercroft;
  - D06 site/close foliage count `0` and free-detail cohort count `0`, preserving proof isolation.
- The LFX02 upper-cliff ImageGen lane exhausted 2/2 calls and was rejected: wrong dimensions/mode, opaque checkerboard, reproduced city content or oversized freestanding wall, and ineffective registration. Nothing was promoted.
- Added an invariant test for the I20 -> I19 -> I19+I17 station progression and alpha preservation. Focused R3/LoD tests pass `20/20`; typecheck and focused ESLint pass. The full suite passes `182/184` with `2` declared skips and `0` failures; the production build passes with only the pre-existing chunk-size advisory.
- Test-policy classification: two failed invocations without `--experimental-strip-types` were environmental command errors (`tsx` absent / Node did not strip `.ts`); the supported Node 22 invocation passed all focused tests. No prior test or intent contract changed.

### Concerns, pivots, and tasks left

- I19 is a conservative alpha repair, not a full station redraw. It opens the water path and materially improves the collision, but the platform remains a large engineered terrace. Keep it review-only until broader free-camera checks confirm the station scale and shore contact.
- The failed LFX02 result invalidates the same whole-canvas ImageGen approach for the upper rear cliff. The next attempt must be a materially different, tighter land-fix method or reuse registered native cliff material; do not rerun the failed prompt.
- The parent city plate remains soft at close. Add registered additive texture, lighting, contact/shadow, circulation/fabric, prop, and district cohorts without restoring overlapping full-building cutouts.
- The manifest authority still names I13/I16 while the R3 review renderer mounts I20/I19. If live review accepts these assets, update the representation/asset manifests and production variants together instead of leaving review-path duplication.
- Run free-camera station/water checks before accepting or manifest-promoting I19/I20.

### Exact next action

Inspect the I19 station/water transition in free-camera close views, then either accept the conservative support repair for this checkpoint or keep it quarantined and define a tighter geometry-only revision before manifest promotion.

## 2026-08-16 23:52 CDT

### Completed work and evidence

- Free-camera close inspection rejected I19 as the final site/close representation. Although six spans exposed native water, five large opaque near-black arch interiors remained and read as empty black pockets.
- Layer isolation established ownership: disabling `L4_0` did not remove the pockets, while disabling the whole city layer exposed continuous authoritative L2 land and L3 water beneath them. The remaining defect is therefore I19 alpha, not missing base geography or water art.
- An xHigh worker produced the bounded alpha-only I21 candidate without invoking ImageGen. Director asset checks pass: `1448x1086` RGBA, transparent corners, `7,537` additional alpha reductions across five approved undercroft cavities, zero alpha expansion, zero changes outside the ROI, zero retained-visible RGB changes, SHA-256 `58AD954173F51D210F4696AED7C05F26258941F1B5D1098E3DDEFF38518CDB70`.
- I21 was copied byte-for-byte into `_review` and provisionally routed at site/close. Capital remains I20 and the train remains absent/deferred.
- Runtime QA passed at the exact free-close station camera: the five previously opaque cavities now expose the continuous native rock and river without clipping masonry or introducing a new alpha seam. Remaining dark openings align with structural recesses rather than the rejected black-pocket pattern.
- Fixed proof routing remains exclusive: D06 site mounts `I21`; D06 close mounts `I21,I17`; both suppress L4_6 foliage and free-detail cohorts.
- Focused R3/LoD tests pass `20/20`; typecheck, focused ESLint, and the production build pass. The build retains only the pre-existing chunk-size advisory. The last full-suite result remains the pre-I21 `182/184` pass with `2` declared skips and `0` failures.

### Concerns, pivots, and tasks left

- I21 is accepted as the current review-path site/close representation. It is not yet manifest-promoted into the production asset authority; that remains coupled to the broader station-cohort acceptance pass.
- The upper rear cliff land fix remains unresolved. LFX01 was ineffective and LFX02 failed its generation gates; the next approach must be a tighter native-land/material repair.
- Parent close-detail softness and missing additive texture, lighting, contact/shadow, circulation/fabric, prop, district, and city-water-effect cohorts remain open.

### Exact next action

Checkpoint the accepted I21 review routing, then address the upper rear cliff with a materially tighter native-land repair before adding close-detail cohorts.

## 2026-08-17 00:22 CDT

### Completed work and evidence

- Created checkpoint `606621a` (`checkpoint: open station undercroft at close lod`) after I21 passed the exact free-close and fixed D06 runtime gates. The worktree returned clean.
- An xHigh deterministic native-reuse lane produced LFX03, a translucent `L4_1` grade restricted to `8,523` exposed live-land pixels (`1448x1086` RGBA, bbox `[271,52,656,179]`, max alpha `176`, zero city/water/outside-ROI overlap). Mechanical gates passed.
- Director live capital proof rejected LFX03: it preserved native texture but the two blunt mesas remained visibly unchanged in silhouette. The review mount and copied asset were removed; nothing was committed.
- A materially different LFX04 lane reused one coherent accepted close-native rock crop to form a concave rear backwall. Its own worker verdict was `NO-GO`: although the mass connected both shoulders and stayed inside the ROI, the proof read as two soft rounded rock blobs, retained the bright mesa crests, and did not match the parent pixel treatment. It was never mounted or promoted.
- No ImageGen calls were spent on LFX03/LFX04. Both failures are evidence against grading or warping the soft close-native tile for this defect.

### Concerns, pivots, and tasks left

- The upper rear cliff remains unresolved. The next repair must use crisp parent/master cliff-face pixels or a reversible mask/composition change; do not repeat subtle grading, soft close-native warping, or whole-canvas generation.
- I21/I20 remain accepted review representations, not manifest-promoted production authority.
- Parent close-detail softness and missing additive texture, lighting, contact/shadow, circulation/fabric, prop, district, and localized bridge-water-effect cohorts remain open.
- The train remains intentionally absent/deferred until the stationary city and landscape integration are accepted.

### Exact next action

Define a crisp parent-derived upper-rear cliff face or mask-based silhouette repair, then reject or accept it in the live capital view before any manifest promotion.

## 2026-08-17 00:52 CDT

### Completed work and evidence

- LFX05 tested the remaining safe cliff option: a translucent cavity shade above the context with explicit palace protection. The worker removed the candidate and returned `NO-GO`; a visible-strength mask reached `4,893` conservative tower/dome pixels, while the protected mask remained as subtle as rejected LFX03. No runtime/tracked asset was created.
- The upper rear cliff is now a specific composition blocker: the current flattened parent/context no longer contains a separable rear-land surface. Safe deterministic masking cannot change it; a coherent replacement will require an authored parent-aware patch or a revised source composition.
- An independent xHigh deterministic lane produced `WFX01-city-bridge-water-detail-r1-alpha` for `L4_0`. Candidate B passed after the Director rejected an initial report with 11 bbox-edge pixels and required an in-place correction.
- Final WFX01 metrics: `1448x1086` RGBA, `2,786` nonzero-alpha pixels, max alpha `136`, `8.9203%` of the `31,232` registered water pixels, zero outside-water pixels, zero outside-component pixels, zero component-edge seam pixels, and `100%` within 20 px of transformed I21/current-context support authority. SHA-256 `978BBFF405BE2291E16263C587901DD0ADB1CEB67FB06BC0EE13423FAD88D350`.
- Corrected proof order uses L3 live authority -> existing L4_0 -> WFX01 -> current city context -> I21 at exact artboard placement `(704.15,557.7,704.7x528.3)`. The initial worker proof that retained the master station and placed I21 1:1 was rejected as invalid before promotion.
- Runtime LoD now keeps WFX01 absent at capital, mounts it at `0.68` opacity for site, and promotes it to full authored opacity at close. Live fixed DOM assets are capital `I20`; site `WFX01,I21`; close `WFX01,I17,I21`. The station openings remain exposed and native animated water remains dominant.
- Focused R3/LoD tests pass `21/21`; typecheck passes. Focused ESLint passes for TS/test files; the CSS path is outside the configured ESLint scope and reports one ignored-file warning, not a lint failure.
- The production build passes with only the pre-existing chunk-size advisory.

### Concerns, pivots, and tasks left

- WFX01 remains `_review` pending production-manifest/builder promotion and broader free-camera inspection.
- The upper rear cliff remains unresolved and should not receive another deterministic mask/warp attempt without new source art or a source-composition decision.
- Parent close-detail softness and missing additive texture, lighting, contact/shadow, circulation/fabric, prop, and district cohorts remain open.
- I20/I21 and WFX01 are review-authority assets; manifest alignment remains a controlled later step after visual acceptance.

### Exact next action

Run the production build and broader free-camera water inspection, checkpoint WFX01 if clean, then add a parent-derived close-detail overlay rather than restoring overlapping full-building cutouts.

## 2026-08-17 01:18 CDT

### Completed work and evidence

- An xHigh deterministic worker produced `CFX01-city-close-fabric-detail-r1-alpha` for `L4_4` from the accepted parent/context only. It adds microcontrast/material response rather than new buildings, roads, trees, water, or silhouette.
- Director proof review accepted candidate B: `1448x1086` RGBA, `170,276` nonzero-alpha pixels, `17.472%` context coverage, max alpha `104`, parent-to-treated luma correlation `0.988401`, mean absolute luma shift `3.523`, and average inspected-crop edge-energy gain `21.087%`. SHA-256 is `CB02EBB9B096A5F79D690BA667B218D0ACC33730F69DEF5862EA10333C3008C2`.
- The promoted review asset has zero pixels outside the existing context, zero overlap with registered water, zero D06 overlap, and zero overlap with the worker's dilated foliage guard. Existing L2 tree assets remain the only added city vegetation.
- Runtime LoD mounts CFX01 under `L4_4` at `0.48` opacity for site and full authored opacity for close. It is absent at capital and sits above the parent context but below native foliage, registered detail nodes, I17, and the station. The same registered-detail cutout mask prevents it from leaking through node replacement sockets.
- Live D06 site and close proofs passed. DOM evidence was site `WFX01,CFX01,I21` and close `WFX01,CFX01,I17,I21`; no new station seam, outline halo, tree mismatch, water repaint, or D06 collision was visible.
- Focused CFX/R3 tests, typecheck, focused ESLint, and production build pass. Full `npm test` now passes `184/186` with `2` declared skips and `0` failures. The pre-existing build chunk-size advisory remains unchanged.
- The full-suite runner appeared silent because the existing exhaustive camera-budget test took `134.321s`; this was classified environmental/test cost, not a regression or stale intent. A duplicate runner accidentally started during diagnosis was stopped; the observed runner completed green.
- Created recovery checkpoint `ce22f3d` (`checkpoint: add progressive city fabric detail`).

### Concerns, pivots, and tasks left

- The upper rear cliff remains unresolved. LFX01-LFX05 established that translucent grading, soft native-tile warping, whole-canvas generation, and protected cavity shading cannot safely correct the flattened rear mesas. The next attempt must change source composition or use a tightly authored parent-aware replacement; do not repeat those failed methods.
- The I21 station undercroft now exposes land/water correctly, but the overall engineered support terrace remains visually broad beside the waterfall. It is still a review representation and needs a final footprint decision before manifest promotion.
- CFX01 improves the parent fabric but does not replace the still-missing authored lighting, shadow/contact, circulation, prop, and district-specific close cohorts.
- I20, I21, WFX01, and CFX01 remain review-authority assets. Production manifest/builder alignment should happen only after the remaining landscape and station-footprint decisions are accepted together.
- The train remains intentionally absent/deferred until the stationary city, land, and water composition is accepted.

### Exact next action

Inspect the current source-composition masks for the upper rear city cut and the I21 support footprint. Choose the smallest reversible repair that exposes native L2/L3 authority where it already exists; only commission a new xHigh asset after the exact missing geometry is isolated.
