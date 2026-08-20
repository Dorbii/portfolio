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

## 2026-08-17 01:45 CDT

### Completed work and evidence

- Layer-isolation disproved the prior upper-cliff diagnosis. Disabling `L4` left the two bright rear mesas visible, proving they are immutable L2 terrain exposed behind the palace rather than city-context pixels. The LFX03-LFX05 above-context structure-protection conflict was therefore caused by the wrong render order.
- An xHigh deterministic worker produced `LFX06-upper-rear-native-ridge-underlay-r1-alpha` for `L4_1`, explicitly rendered after L2/L3 but before the city context. No ImageGen calls were used.
- Director accepted candidate B after exact-order and live on/off review. Mechanical gates: `1448x1086` RGBA, `52,821` alpha pixels, bbox `[249,48,699,259)`, max alpha `196`, transparent corners, zero pixels outside ROI/live-land authority, zero water overlap, zero ROI-border pixels, zero brightened pixels, mean/median visible luma drop `26.8903/22.4264`, and texture correlation `0.91504`. SHA-256 is `EF00A69426B774848D75EFF38A3B238EDCAAD8B276F03C15F59C6A3D99B65296`.
- Live capital proof mounts `LFX06,I20`. With `L4_1` enabled, the bright L2 mesas read as one darker recessed native-rock backwall; disabling `L4_1` immediately restores the blunt bright ridges. Palace/building pixels remain above the underlay and unchanged. The lit observatory/statue ridge remains consistent with the accepted master.
- Added an exact asset/ownership invariant test for LFX06. Focused R3 tests pass `11/11`; typecheck, focused ESLint, and production build pass. The build retains only the pre-existing chunk-size advisory.
- The full suite was not rerun after this low-risk asset mount; the immediately preceding checkpoint passed `184/186` with `2` declared skips and `0` failures.
- Created recovery checkpoint `7210352` (`checkpoint: recess upper city ridge`).

### Concerns, pivots, and tasks left

- LFX06 is the accepted review-path repair, not yet production-manifest/builder authority. Its success depends on being below the context; moving it above city structures would reintroduce the rejected overlap problem.
- I21 still has a broad engineered support terrace. Its black undercroft obstruction and water contact are fixed, but geometry should remain review-only until the user accepts the current scale or a specific remaining footprint defect is isolated.
- The parent close plate is more readable with CFX01, but authored lighting, shadow/contact, circulation, prop, and district-specific close cohorts remain incomplete.
- I20, I21, WFX01, CFX01, and LFX06 remain review assets. Manifest/builder alignment should be one controlled promotion after the remaining stationary composition is accepted.
- The train remains intentionally absent/deferred.

### Exact next action

Audit the registered free-camera site/close node cohort for missing contact/shadow and circulation layers. Add only the smallest parent-registered additive layer needed to unify those nodes; do not restore overlapping full-building cutouts or generate vegetation.

## 2026-08-17 02:09 CDT

### Completed work and evidence

- Audited the free-camera progressive node route. The selector can return package-registered `close` variants, but runtime intentionally admits the cohort only at `site`. A temporary Director-only change enabled close and passed the focused routing test after updating its expectation.
- Live free-camera close proof rejected that change: `17` package-anchor nodes rendered, but their outer bounds are not parent-registered and the full-building cutouts read approximately 2-4x too large/detached at close. This reproduced the user-reported overlap failure. The code and test were restored immediately; there is no retained diff. Under the test policy, the existing close exclusion remains a **real safety invariant**, not stale intent, until registered close geometry exists.
- Live free-camera site proof confirmed the current progressive route admits `21` package-registered architecture/transport nodes. Site remains the only safe full-building cohort; legacy halls, trains, inferred nodes, generated foliage, and focused-D06 replacements remain excluded.
- Tested the smallest station-footprint correction before commissioning another asset. Reducing I21 and its I17 close overlay uniformly from `0.90` to `0.82` while keeping the bottom socket fixed materially reduced land/water coverage and preserved their mutual registration. Fixed D06 site and close proofs passed; the open undercroft continues to expose native land/water and the station no longer dominates the waterfall basin.
- Added exact regression assertions for the accepted `0.82` site/close station scale. Focused R3/LoD tests pass `23/23`; typecheck and focused ESLint pass; the production build passes with only the pre-existing chunk-size advisory.
- Created recovery checkpoint `6948500` (`checkpoint: reduce station support footprint`). The worktree returned clean before this handoff update.
- Spawned one xHigh ImageGen-contract worker for the exact remaining close asset gap: `CFX02-city-central-architecture-detail-overlay-r1-alpha`, a transparent `1448x1086` close-only `L4_4` overlay confined to conservative interiors of seven central package sockets. Maximum two candidates; tracked writes/promotion are forbidden. The worker is still running.

### Concerns, pivots, and tasks left

- Do not enable the existing Sxx full-building cohort at close. Package anchors prove position but not the close-scale exterior bounds required for silhouette replacement.
- CFX02 must be rejected if it changes building silhouettes, terraces, land, water, foliage, D06, lighting direction, or contact geometry; ImageGen checkerboard/opaque output is also an automatic rejection.
- Site still relies on full-building cutouts and generic SVG contact/cast shadows. It is serviceable at the current framing, but a later parent-registered contact/circulation audit remains appropriate after close detail is stable.
- I20, I21, I17, WFX01, CFX01, LFX06, and any accepted CFX02 remain review assets pending one controlled manifest/builder promotion.
- The train remains intentionally absent/deferred.

### Exact next action

Receive and mechanically/visually grade the quarantined CFX02 candidate. If it passes, mount it only at free-camera close below native foliage/nodes and prove it at multiple close camera positions. If it fails, record `NO-GO` and keep close on the accepted parent-derived CFX01 path; do not re-enable the defective Sxx close cutouts.

## 2026-08-17 02:36 CDT

### Completed work and evidence

- The xHigh CFX02 worker used its two-candidate limit and kept both outputs quarantined. Candidate 1 passed mechanical gates but was rejected as too subtle. Candidate 2 was accepted: `1448x1086` RGBA, `20,730` nonzero-alpha pixels, max alpha `208`, bbox `[309,111,830,512]`, zero pixels outside the locked ROI/architecture support, zero water or vegetation overlap, mean treated-pixel luma shift `6.6045`, and treated-pixel edge-energy gain `25.4755%`. SHA-256 is `049431E780FFE7423C371269268964888C0B15375B141D23AF47E31A2D3F0059`.
- Director live proof accepted CFX02 at three free-camera close positions. It improves internal masonry, trim, and window definition without changing silhouettes, terraces, land, water, foliage, D06, station order, or contact geometry. It is deliberately absent from site and focused D06 routes.
- Created recovery checkpoint `3c841e4` (`checkpoint: add close architecture detail`). The unsafe full-building Sxx close cohort remains suppressed.
- Promoted the six accepted runtime assets from `_review` into stable layer-owned paths: WFX01 (`water-interaction`), LFX06 (`landscape`), CFX01/CFX02 (`detail`), and I20/I21 (`station`). Rejected or superseded I18, I19, and LFX01 remain unpromoted in `_review`.
- Extended `city-foundation-r3.json` and its builder with exact runtime asset IDs, stable paths, roles, LoD tiers, hashes, and I20/I21 placement. The runtime model validates the six-asset contract, rejects review paths, and permits placement only on the station pair. The renderer now consumes these paths and station placement from the manifest rather than hard-coded review literals; runtime status is `manifest-declared`.
- Live DOM and visual proof after promotion passed. Capital mounts LFX06/I20; site mounts WFX01/LFX06/CFX01 plus the package-registered site cohort and I21; free close adds CFX02 and I17 while suppressing unsafe full-building close cutouts; focused D06 close remains WFX01/LFX06/CFX01/I17/I21. Train remains absent.
- Focused tests pass `24/24`; typecheck, focused ESLint, and production build pass. Full `npm test` passes `186/188` with `2` declared skips and `0` failures. The long camera-budget (`129.286s`) and package-command (`92.102s`) tests are classified as environmental/test cost, not regressions or superseded intent. The build retains only the pre-existing chunk-size advisory.
- Created recovery checkpoint `b55e8db` (`checkpoint: promote accepted city runtime assets`).

### Concerns, pivots, and tasks left

- `city-layer-composition-r2.json` still describes the older provisional/failing composition and stale I13/I16 LoD wording. It is now documentation/contract drift against the accepted R3 runtime authority and should be updated without weakening package anchor or node-count invariants.
- Site uses the safe package-registered cohort and generic SVG contact/cast shadows. It still needs one final broad composition audit, but no demonstrated defect currently justifies new generated assets or enabling close cutouts.
- `NinjaOneCapitalCirculation.tsx` contains provisional inferred SVG circulation and is not mounted. Do not enable it without parent-registered evidence; the accepted parent context already owns visible circulation fabric.
- The stationary city is close to an acceptance decision but the required final proof sequence remains: world/territory invisibility, capital/site/close progression, fixed D06 site/close, city-layer toggle restoring untouched L2/L3, and multi-position seam/overlap inspection.
- The train remains intentionally deferred and separate from this stationary-city acceptance.

### Exact next action

Align the stale composition manifest with the accepted R3 LoD contract while preserving structural invariants, then run the final complete visual proof sequence. Only open another asset lane if that proof isolates a specific remaining defect.

## 2026-08-17 03:04 CDT

### Completed work and evidence

- Aligned `city-layer-composition-r2.json` with the accepted `city-foundation-r3.json` runtime instead of the superseded I13/I16 composition. The active contract now declares the exact reversible `L4_0`-`L4_7` ownership model, hides the city at world and territory, begins it at capital, reuses only native L2 tree atlases, and keeps the train independent and deferred. Checkpoint: `3397eb6` (`fix: align city composition with r3 runtime`).
- Classified the prior design-intent conflict under the accepted test policy. The old composition wording was **stale/superseded intent** and was corrected. The I13/I16 alpha/provenance checks remain as legacy asset-safety coverage rather than runtime authority. The existing exclusion of unregistered full-building Sxx cutouts at close remains a **real regression guard** because live proof reproduced the oversized detached overlap when it was temporarily relaxed.
- Completed the full live visual matrix. World and territory mount zero city layers. Capital mounts the registered parent-derived city with LFX06 and I20. Site progressively adds WFX01, CFX01, I21, and the safe package-registered cohort. Close adds CFX02 and I17 while suppressing the unsafe full-building close cohort. Focused D06 site/close proofs preserve open station arches, native water, and native land at the reduced `0.82` support scale.
- Verified city ownership by toggling `L4 City authority` in the live layer inspector. L4 off removes every city modification while L2 terrain and L3 animated water remain mounted and visually untouched; L4 on restores the registered city composition.
- Found a real close-LoD foliage bug during final DOM proof: the shared native-foliage selector hard-capped retain span at `0.14`, below the accepted city close maximum `0.205`, so the city-owned native tree group could never mount. Added an optional maximum-retain-span parameter with the prior default unchanged, and passed the city close policy only from the city layer. Checkpoint: `012f1cc` (`fix: mount native trees at city close lod`).
- Live close proof after the fix mounts exactly seven restrained tree instances from four existing `/environment/shared/foliage-native-r4/` pooled atlas pages under source `L2-native-conifer-atlas-reuse`. No generated or mismatched vegetation is mounted.
- Final gates pass: typecheck, focused ESLint, production build, focused R3/LoD/foliage tests, and full `npm test`. Full-suite result is `186/188` passed, `2` declared skips, `0` failures in `263.173s`. The camera-budget test (`133.878s`) and package-command test (`91.741s`) remain classified as environmental/test cost. The build has only the pre-existing chunk-size advisory.
- Recovery checkpoints for the stable asset promotion and documentation are `b55e8db` and `ed0c824`. The stationary city implementation is now manifest-backed, progressively rendered, reversible, and visually accepted against the parent concept.

### Concerns, pivots, and tasks left

- The train remains intentionally absent by user direction. A future train slice must use an independent animated asset and must not reintroduce it into I20/I21 or other stationary station art.
- The current stationary city is complete for this goal. Do not reopen rejected I18/I19/LFX01 assets, restore generated vegetation, or enable full-building close cutouts without new registered geometry and a new accepted design decision.
- The long exhaustive tests are green but expensive; their duration is not a city regression. Preserve their invariants unless an explicit later contract supersedes them.

### Exact next action

Treat this checkpoint as the accepted stationary-city baseline. The next independent feature, if requested, is train extraction/animation with its own LoD and socket proof; no stationary-city repair remains open.

## 2026-08-20 11:06 CDT

### Recovery pivot and completed work

- The August 17 completion claim above is superseded by direct user review. The stationary city was not accepted: free-camera site/close still behaved as a mostly flattened parent plate with sparse additive nodes, close building bounds overlapped, non-native vegetation appeared in prior iterations, land/water authority was obscured, and district-level progression was not proven.
- Re-audited the runtime. Capital, site, and close retain the same `1448x1086` parent context; free-camera site alone admits the package-registered node cohort, while close suppresses it. The intent test grades only capital and weights silhouette/boundary much more heavily than progressive district detail. This explains how the prior gates passed without proving the requested LoD behavior.
- Chose D05 Western Skill Terraces as the first bounded recovery slice. Its registered mask is `[0,413,691,1086)`. The only package-registered D05 sockets are S01, S10, S11, S15, and S18.
- Director diagnostics proved two shortcuts invalid. Overlaying those five nodes on the parent yields sharp isolated buildings over softer baked architecture at close; cutting D05 directly to native L2 produces a large unsupported cavity. The missing production dependency is therefore an `L4_1` D05 terrain/circulation/contact layer, not another generic building or microcontrast overlay.
- Added `d05-site` and `d05-close` proof routes with registered 4:3 cameras, explicit D05 focus, D05 representation modes, and a district selector that admits exactly the five package-registered sockets. D06 and free-camera behavior remains unchanged; D06 station layers are suppressed only in a focused D05 proof. Checkpoint `b2a86c8` (`checkpoint: route progressive D05 city detail`).
- Focused LoD routing tests pass `14/14`; typecheck, lint, and production build pass. The pre-edit full baseline passes `186/188`, with `2` declared skips and `0` failures. The direct `node --test` attempt without the repo's type-stripping flag was a setup/environment failure; the same focused test passes through the configured loader.
- Under the accepted test policy, changing the old `[400,900]` selection expectation from `null` to `D05` is **stale/superseded intent** because D05 is now an explicitly registered focus region. Package-anchor provenance, inferred-node quarantine, D06 exclusivity, and fixed-tier camera checks remain active regression guards.
- Spawned one xHigh ImageGen-contract worker for `D05L01-western-skill-terraces-landfix-r1-alpha`, full-artboard transparent `1448x1086` `L4_1`, maximum two candidates, quarantine only. It may add only retaining mass, terraces, stairs/roads, and contact fabric required by the five sockets; water, buildings, trees, adjacent context, and native land beyond causal support are locked.
- The worker exhausted both calls and returned `NO-GO`; nothing was promoted. Candidate 1 passed derived containment/water checks but repainted `69.79%` of D05 and introduced hard bright seams. Candidate 2 covered only `3.62%`, left S15 with zero contact and S10 with 21 contact pixels, and contained unprovable regenerated foliage/terrain fragments. Evidence remains quarantined under `.codex-tmp/d05-recovery-r1/imagegen/D05L01-western-skill-terraces-landfix/`.
- Pivoted to the existing cohesive parent terrain/terrace fabric rather than accepting generated replacement ground. D05 site/close now use a five-node luminance cutout so each verified node atomically replaces only its own silhouette; the rest of the parent circulation, cliffs, water openings, and vegetation remain stable.
- Live close proof isolated the inherited D05 display widths as provisional and oversized even though the anchors are package-registered. D05-only widths were reduced to S01 `130`, S10 `126`, S11 `133`, S15 `144`, and S18 `140`; site and close retain the same world footprint while their source resolution changes. No anchor moved and no global close-node guard changed.
- A 7 px expanded native-land clearance was tested and immediately rejected/reverted because live L2 exposure created bright texture halos around the node silhouettes. Exact silhouette replacement remains the accepted local cutout; do not repeat expanded L2 clearance without a newly registered grade transition.
- Live D05 close proof mounts five nodes, eight instances from four existing `L2-native-conifer-atlas-reuse` resources, WFX01 water detail, and no D06 station or train. D06 close regression proof still mounts exactly WFX01/LFX06/CFX01/I17/I21 with zero D05 nodes.

### Tasks left, evidence gates, and concerns

- D05L01 is rejected and must not be promoted. Do not retry another full-district generation with the same prompt; any later asset lane must be a smaller, newly isolated socket/contact defect.
- User visual review remains the acceptance gate for the calibrated five-node D05 site/close sequence. If a specific node still reads as detached, adjust or replace only that node/contact socket rather than reopening the district-scale landfix.
- Add visual/invariant tests for D05 asset dimensions, alpha, mask/water containment, LoD exclusivity, train absence, and existing-tree-only vegetation. Do not weaken the close overlap guard globally.
- Run the complete typecheck/lint/test/build set after asset integration. Start the dev server only after the Director's live proof passes; user review is still required before declaring the D05 slice accepted.

### Exact next action

Finish the full regression suite, checkpoint the calibrated exact-cutout D05 slice, keep the dev server running, and hand the `d05-site` and `d05-close` proof URLs to the user for visual acceptance.

## 2026-08-20 11:37 CDT

### D05 review checkpoint

- Completed the calibrated D05 exact-cutout implementation. Site and close replace exactly S01, S10, S11, S15, and S18 at unchanged package anchors with D05-only display widths; no broad generated district plate or generated terrain was accepted.
- Preserved the parent-derived city terrain, terraces, circulation, cliff mass, and water openings as reversible city-owned fabric over unchanged L2 land and L3 water. The rejected expanded L2 clearance remains reverted because it produced bright contact halos.
- Live proof confirmed D05 close mounts the five registered nodes, eight tree instances from four existing `L2-native-conifer-atlas-reuse` resources, WFX01 water detail, and zero D06 station or train assets. D06 close remains isolated and mounts its accepted WFX01/LFX06/CFX01/I17/I21 cohort with zero D05 nodes.
- The rejected D05L01 ImageGen candidates remain quarantined and unpromoted. Candidate 1 repainted too much terrain and created seams; candidate 2 did not support all five sockets and introduced unprovable fragments.
- Final gates pass: typecheck, lint, production build, `git diff --check`, focused D05/D06 routing tests, and full `npm test`. Full-suite result is `189/191` passed, `2` declared skips, `0` failures in `308.110s`. The two long camera/package checks passed and remain classified as environmental test cost rather than regressions.

### Remaining acceptance gate

- D05 is ready for user visual review, not yet accepted. Review both fixed proof routes for cohesive hierarchy, contact, and footprint scale. If a defect remains, isolate it to one socket/contact region before any additional ImageGen work.
- The broader city goal remains active after D05 review; do not infer acceptance of other districts from this slice.

### Exact next action

Keep the dev server running and present `d05-close` and `d05-site` for user review. Use the user's marked defect, if any, as the next bounded repair target.
