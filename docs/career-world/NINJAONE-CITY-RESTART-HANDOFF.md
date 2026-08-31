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

## 2026-08-20 11:58 CDT

### Remaining-district audit and D02 implementation

- Kept D05 frozen while mechanically auditing the six parent-locked district masks against the 19 package-registered skill anchors. D02 is the smallest remaining district: bbox `[1080,120,1448,456)`, `100,825` mask pixels, one skill anchor (S13) plus registered ridge infrastructure I02. D03 is materially larger (`274,204` pixels/four skill sockets), D04 crosses the central water system (`150,485` pixels/three skill sockets), and D01 is the highest-risk crown (`435,501` pixels/six skill sockets). D05 and D06 remain the completed review slices.
- A deterministic exact-cutout proof using the existing close S13 and I02 assets passed visual preflight without new art. It reads as one nested ridge compound, keeps the parent cliff/trees/water intact, and does not require the prohibited D02 district plate. Proof: `.codex-tmp/district-audit-r1/D02-existing-nodes-exact-cutout-proof-2x.png`.
- Added `d02-site` and `d02-close` proof routes, explicit D02 selection and representation modes, and a registered two-socket selector. D02 uses unchanged package anchors and widths: S13 `180`, I02 `115`.
- D02 site/close now cut exactly the two source-alpha silhouettes from the parent context and render the corresponding site/close assets. Focused D02 excludes D06 station/close overlays, retains native L2-derived foliage, and leaves L2 land/L3 water untouched.
- The first D02 site camera width (`800`) resolved as close. This was classified as a **real regression** because the declared proof tier disagreed with the central LoD policy; the implementation was corrected to the existing `1080` site width rather than weakening the test. D02 close remains `560` and uses a registered asset-footprint vertical framing within the district selection region.
- Live D02 site proof mounts exactly S13/I02 plus WFX01/LFX06, with a two-node context mask and no train. Live D02 close mounts the same two nodes, three instances from existing native-tree resources, and no D06 station assets. D05 regression proof remains five nodes/eight native trees/four resources; D06 remains WFX01/LFX06/CFX01/I17/I21 with zero D02/D05 nodes.
- Focused routing tests pass `17/17`; typecheck, lint, production build, and `git diff --check` pass. Full `npm test` passes `191/193`, with `2` declared skips and `0` failures in `276.369s`. The camera sweep (`138.481s`) and package verifier (`98.927s`) passed and remain classified as environmental test cost.

### Remaining acceptance gates

- Do not call D02 accepted until the full suite passes and the user reviews its site/close progression. If S13/I02 contact or hierarchy is rejected, isolate that registered pair rather than generating or exposing the full district plate.
- D03 is the next likely district only after D02/D05 feedback; its four-socket eastern-industrial group needs the same deterministic cutout preflight before implementation.

### Exact next action

Checkpoint D02 and preserve both D05 and D02 proof routes for user comparison.

## 2026-08-20 12:23 CDT

### D03 Eastern Industry review checkpoint

- Deterministically preflighted D03 against its registered mask bbox `[763,252,1448,881)` and the authoritative inland-water mask. The district uses only the four existing registered skill sockets: S07 PostgreSQL, S08 Redis, S09 AWS, and S12 VMware. No ImageGen lane was opened because the existing site/close assets were sufficient.
- Rejected the inherited display widths during preflight. S09 `235`, S12 `190`, S08 `155`, and S07 `180` produced material collisions; S12 alone repainted `3,016` registered-water pixels and S07 overlapped earlier nodes by `4,369` pixels. The water-safe D03-only widths are S09 `176`, S12 `106`, S08 `116`, and S07 `135`.
- Added `d03-site` and `d03-close` proof routes, explicit D03 selection and representation modes, and an exact four-socket selector. Both tiers keep the same world footprint while promoting higher-resolution close sources. The parent context is removed only beneath the four calibrated source-alpha silhouettes; the district plate, inferred nodes, generated vegetation, D06 station, and train remain excluded.
- Added invariant coverage proving the exact D03 cohort and display widths, tier/district exclusivity, deterministic proof cameras, inferred-node quarantine, and zero registered inland-water overlap at alpha threshold `16` for all four rendered silhouettes.
- The first direct Sharp load of a Windows `file:` URL failed. This was classified as a **test-harness setup failure**, not a design or runtime regression; the test now passes source bytes to Sharp without weakening the asserted image invariant.
- The prior selection assertion that `[1056.5,700]` returned `null` was classified as **stale/superseded intent** because that coordinate is inside the newly explicit D03 registered bbox. It now resolves to D03. Package provenance, district exclusivity, water preservation, train absence, and inferred-node quarantine remain active regression guards.
- Live D03 site and close proofs mount exactly S09/S12/S08/S07 plus the accepted WFX01/LFX06 sublayers and no D06/train assets. Close mounts six tree instances from three existing `L2-native-conifer-atlas-reuse` resources. Native land and the inland water passages remain visible between the calibrated structures.
- Regression proof preserved the prior slices: D05 remains five nodes/eight native trees, D02 remains S13/I02 with three native trees, and D06 remains WFX01/LFX06/CFX01/I17/I21 with zero D02/D03/D05 nodes.
- Final gates pass: typecheck, lint, production build, `git diff --check`, focused routing tests, and full `npm test`. Full-suite result is `194/196` passed, `2` declared skips, `0` failures in `270.819s`. The exhaustive camera sweep and package-command verifier both passed; their duration remains test cost rather than a regression.

### Remaining acceptance gates

- D03 is ready for user visual review, not yet accepted. Review site and close for scale hierarchy, water clearance, silhouette contact, and whether the four-node eastern-industrial cluster reads as a cohesive district rather than independent cutouts.
- D02 and D05 remain reviewable and unchanged. D04 is the next bounded candidate only after current visual feedback; it crosses the central water system and needs a separate deterministic preflight. D01 remains last because its crown mask is the largest and highest-risk.
- The broader city goal remains active. Do not promote the rejected D05 landfix candidates or reopen a generated district plate without a newly isolated defect and Director contract.

### Exact next action

Checkpoint D03, keep the dev server running, and present `d03-close` and `d03-site` beside the preserved D02/D05 proof routes for user review.

## 2026-08-20 13:05 CDT

### D04 Central Lake Terraces recovery checkpoint

- Mechanically audited D04 against the registered mask and live land/water authority. Its exact mask bbox is `[210,480,965,851)` with `150,485` mask pixels; `30,363` of those pixels are registered inland water. The only D04-owned skill sockets are S02 TypeScript `[397,521]`, S04 TanStack `[250,506]`, and S14 gRPC `[794,731]`. S06 is inside the broad bbox but is D01-owned and remains excluded.
- Rejected the D04 district plate because it would cover all `30,363` registered-water pixels. The parent context already preserves the intentional lake and channels, so no broad D04 terrain/landfix plate is justified. D04 remains an exact node-cutout slice over the existing parent fabric and unchanged L2/L3 authorities.
- Deterministic preflight proved inherited widths unsafe: S02/S04/S14 rendered `4,095` registered-water overlap pixels at widths `95/165/175`; uniform shrinking still left `2,332` overlap pixels at 65%. Calibrated provisional widths are S02 `95`, S04 `107`, and S14 `114`. S02/S04 fit the parent hierarchy; S14 remains defective because its opaque hall closes the lower channel.
- Added uncommitted `d04-site` and `d04-close` routes, D04 selection/representation modes, exact three-node luminance cutouts, proof cameras, and focused renderer routing. D04 keeps the adjacent D06 station visible as context because the D04/D06 masks have zero ownership overlap; other progressive districts remain isolated.
- Fast gates pass: typecheck and the focused LoD routing suite (`22/22`, zero failures). Live D04 site/close proof confirms the camera, native water exposure, and S02/S04 placement are correct; the only blocking visual defect is S14. Live D02/D03/D05/D06 regression checks preserved their exact prior node cohorts and compositions.
- Opened one xHigh ImageGen-contract lane for a versioned S14 twin-tower water gateway, `1318x1193` RGBA transparent, fixed socket/perspective/light/camera, two candidates maximum, quarantine only. Candidate 1 materially improves the shape but the worker correctly returned NO-GO under the original zero-water-overlap gate (`1,462` overlap pixels).
- Classified that zero-overlap gate as **stale/superseded test intent**: it prohibits any bridge deck or support from crossing water and contradicts the accepted L4 water-detail-under-bridges architecture. The replacement gate allows only a narrow elevated deck and bank-adjacent supports while requiring at least 80% of the central undercroft water to remain unobscured, zero deep-channel supports, bounded total overlap, and no terrain/water/environment repaint. The xHigh worker is re-evaluating candidate 1 and may spend the one remaining generation slot only for a materially narrower/lower candidate.

### Tasks left and evidence gates

- Do not promote S14 candidate 1 merely because it looks better. It must pass the amended obstruction/contact gates, Director alpha/dimensions/lighting/perspective inspection, exact runtime placement at both D04 site and close, and regression proof for D02/D03/D05/D06.
- If a candidate passes, promote it as a versioned sibling source and make the asset builder select that S14 source deterministically; do not overwrite the original or create a duplicate runtime asset ID. Rebuild all declared LoD derivatives and the manifest, then add durable bridge-aware water invariants.
- If both candidates fail, keep the D04 routing scaffold uncommitted or checkpoint it explicitly as incomplete; do not expose D04 as review-ready with the old broad S14 hall.
- After integration, run typecheck, lint, production build, focused routing/asset tests, `git diff --check`, and the full test suite under the accepted regression-classification policy. Keep the train absent and use only existing native-tree resources.

### Exact next action

Receive and independently audit the amended S14 worker result. Promote only a passing versioned gateway, rebuild the manifest/derivatives, then complete live D04 site/close and prior-district regression proof before committing or presenting the review URL.

## 2026-08-20 13:31 CDT

### D04 result and D02 foliage correction

- Both xHigh S14 gateway candidates are rejected and remain quarantined. Candidate 2 was the better result and opened the central water visually, but still failed the bridge-aware contract with 25 central overlap pixels below the legal deck, `29.98%` tight-bbox water overlap versus the `22%` cap, and opening top `y=849` versus `<=811`. No generated gateway was promoted.
- A separate xHigh deterministic alpha-only repair also returned `NO-GO`. A conforming repair confined below source `y=811` leaves 10 central registered-water pixels after the exact 114 px Lanczos resample; clearing them requires changing 2,426 immutable bridge-deck alpha pixels. It created no candidate and made no tracked writes. D04 therefore remains an uncommitted/incomplete scaffold using the old S14 source and is not review-ready.
- Live D04 proof exposed an unrelated scaffold error: the D06 station node was mounted in the D04 camera merely because ownership masks did not overlap. It visibly intruded from the lower-right. D04 now suppresses the high-resolution D06 station like every other focused district and retains only the baked neighboring context. Focused routing tests remain `22/22` green.
- User review of D02 close identified a real LoD mismatch: S13/I02 were promoted while most ridge conifers remained baked into the 1448x1086 parent, making the foliage visibly blurrier than the architecture.
- Added a D02-only native-foliage registration using 12 existing L2 conifer nodes at their existing artboard positions matched to the baked ridge foliage. No tree texture, generated tree, random scatter, custom atlas, or site-tier vegetation was added. The general nine-tree admission set remains unchanged for other districts.
- D02 close now mounts 15 tree nodes total from two existing `/environment/shared/foliage-native-r4/` atlas resources; D02 site mounts zero added trees. D03 close remains six trees/three resources and D05 close remains eight/four, proving district isolation. Live proof shows the added D02 canopies sit over the baked ridge tree positions without floating over the dojo silhouette.
- Fast gates pass after the foliage change: typecheck and the combined R3 foundation/LoD suites (`34/34`, zero failures).

### Tasks left and next evidence gates

- D02 tree registration is live for user visual review. If density or a specific canopy is rejected, adjust only the D02 district instance list; do not change shared atlas art or global foliage selection.
- Do not promote either S14 generated candidate or the hypothetical alpha repair. D04 requires a materially different registered source/placement contract, not another relaxation of failed gates.
- The current mixed worktree includes the incomplete D04 scaffold and the D02 foliage correction. Preserve this handoff before any selective checkpoint; do not commit D04 as review-ready.
- After the next accepted visual state, run lint, production build, `git diff --check`, and the full test suite before a checkpoint commit.

### Exact next action

Take user feedback on the live D02 close foliage registration. If accepted, checkpoint the D02 foliage change separately from the incomplete D04 scaffold, then choose either a new D04 socket/asset contract or proceed to the remaining D01 crown audit.

## 2026-08-20 14:00 CDT

### D01 Crown progression and systemic L4 ordering repair

- Audited D01 against its registered crown mask bbox `[0,0,1011,536)` and six package anchors: S19 `[495,212]`, S17 `[662,236]`, S16 `[765,330]`, S05 `[539,462]`, S03 `[348,300]`, and S06 `[706,481]`. The inherited widths caused `1,107` node-overlap pixels and expanded `22,985` pixels outside the parent context silhouette, so they were rejected.
- Selected a deterministic 60% calibrated cohort using existing site/close sources only: S19 `138`, S17 `111`, S16 `114`, S05 `96`, S03 `105`, S06 `108`. The six alpha silhouettes are mutually disjoint. Runtime D01 architecture is clipped to the existing R3 parent-context alpha, producing zero silhouette expansion into the surrounding ocean. No ImageGen lane or new art asset was needed.
- Added explicit `d01-site` and `d01-close` proof routes, D01 representation modes, six precise socket-selection rectangles, fixed proof cameras, exact cohort admission, exports, and app query routing. D01 remains absent from world/territory and promotes only at site/close.
- The first live D01 proof was rejected even though its static alpha gates passed: a large dark crown block remained. Investigation found two runtime composition defects. First, node cutout masks used source RGB luminance instead of a uniform black alpha silhouette, so dark stone could leave baked pixels beneath the replacement. Added an SVG color-matrix mask filter that forces all opaque mask pixels to black while preserving source alpha.
- More importantly, progressive L4_3 nodes were rendered below L4_0/L4_1 and the parent context. The accepted LFX06 ridge underlay therefore painted over the replacement crown. This was the causal live defect. Progressive D01/D02/D03/D04/D05 node groups now render after L4_0, L4_1, and the cutout parent context, while native close foliage remains above them. A durable order test requires LFX06 below context and every progressive L4_3 cohort above both.
- Live D01 close now matches the deterministic exact-cutout proof: the dark block is gone, the six sharper structures remain inside the existing crown silhouette, native land/water remain visible, D06 station and train are absent, and no district plate is mounted. D01 site retains the same world sockets while using site sources and wider framing.
- Live regression inspection covered D02, D03, and D05 after the shared ordering repair. D02 retains its newly registered native L2 tree nodes; D03 retains its water-safe four-node cohort; D05 retains its five-node cohort. None showed the D01 ridge-underlay occlusion.
- Final gates pass: typecheck, lint, production build, `git diff --check`, combined city-focused suites (`37/37`, zero failures), and the full repository suite. Full-suite result is `199/201` passed, `2` declared skips, `0` failures in `276.909s`; the exhaustive camera/foliage sweep and deterministic package-command verifier both passed.

### Evidence concerns and remaining work

- D01 is implementation-complete but still awaits user visual acceptance. The proof is not evidence that every remaining free-camera close view is polished; it only validates the fixed D01 route and the shared layer-order invariant.
- D02 tree registration is live but not user-accepted. If the density is rejected, change only its district instance list.
- D04 remains explicitly incomplete. Both generated S14 gateways and the deterministic alpha-repair path are NO-GO; do not promote them or present D04 as review-ready.
- The mixed worktree contains review-ready D01/D02 changes plus the incomplete D04 route scaffold. Do not label the whole tree complete. Checkpoint with a message that preserves the D04 limitation.

### Exact next action

Finish the full suite, inspect D01 site/close once more after the build, then checkpoint the current state and return the browser to `d01-close` for user review. The next design slice after feedback is either a materially different D04 gateway/socket contract or a user-marked defect in D01/D02.

## 2026-08-20 14:29 CDT

### D04 dry-fabric recovery checkpoint

- Rejected a third attempt to reinterpret or relax the failed S14 gateway. The accepted repair is materially different: preserve the cohesive baked S14 bridge/gateway in the parent context and promote only the two conforming dry-fabric sockets, S02 TypeScript at width `95` and S04 TanStack at width `107`, for D04 site/close.
- Mechanical preflight proved that clipping those two nodes only to the city context was insufficient: their source silhouettes still crossed `1,168` accepted live-water pixels (`1,176` before context clipping). The previously packaged narrow interaction mask was not the correct authority for this gate because it marks `31,232` hard-water pixels while the accepted live inland-water authority marks `93,030`.
- Added a versioned runtime control mask copied byte-for-byte from `art-source/.../live-inland-water-authority-mask-r1.png`. The xHigh asset worker produced one quarantine candidate and returned GO; Director verification confirmed source, quarantine, and promoted runtime files are all `1448x1086` 8-bit grayscale with SHA-256 `62DAE097BF95F53D086EF5C2DD6B4957E22F3A173C80BAC35400620ADDD66BC3` and zero byte/pixel differences.
- Both the D04 parent cutout and the promoted S02/S04 nodes are now clipped to the inverse accepted-water authority and the existing city-context alpha. This prevents progressive architecture from removing or repainting the lake/channel while leaving the baked S14 gateway and its connective fabric intact. The rejected S14 ImageGen and alpha-repair candidates remain quarantined and unmounted.
- Repaired the R3 builder before running it: the prior builder would have erased the accepted D02 `districtInstances` native-tree registration. The builder now deterministically emits the 12 D02 L2-conifer instance IDs, so rebuilds preserve the user-requested native tree-node replacement rather than restoring blurry baked-only foliage.
- Live D04 site/close proof shows the parent lake/channel exposed, S02/S04 replacing only their dry silhouettes, no rectangular district plate, no promoted S14 asset, no D06 station, and no train. Live regression proof preserved D01, D02, D03, D05, and train-free D06; D02 still mounts its registered native conifers after the rebuild.
- The first direct focused-test invocation omitted `--experimental-strip-types` and failed to load `.ts` imports. Classified as a **test invocation/setup error**; the repository command with its declared loader passed without changing an assertion.
- Final gates pass: typecheck, lint, production build, `git diff --check`, focused R3/LoD suites (`39/39`), and the full repository suite. Full-suite result is `201/203` passed, `2` declared skips, `0` failures in `335.520s`. The exhaustive camera/foliage sweep and deterministic package-command verifier both passed.

### Remaining acceptance and whole-city work

- D04 is ready for user visual review, not yet user-accepted. Review the fixed `d04-site` and `d04-close` routes for whether the preserved baked S14 gateway reads coherently beside the sharper S02/S04 nodes and whether any water-edge seam remains objectionable.
- D01/D02/D03/D05 remain reviewable; this checkpoint does not claim user acceptance of those districts. The broader free-camera city pass and any user-marked district defects remain active after D04 review.
- Keep every rejected S14 candidate unpromoted. If the user rejects the baked S14 result, the next repair must start from a newly isolated gateway asset/socket contract, not a broader water-mask relaxation.

### Exact next action

Commit this D04 recovery checkpoint, keep the development server running on `http://localhost:3000`, and leave the in-app browser on `d04-close` for user review. Use the user's marked visual defect as the next bounded repair target.

## 2026-08-20 14:47 CDT

### Normal free-camera LoD authority repair

- Fixed the systemic LoD defect hidden by fixed district proof routes. `WorldScene` previously passed `null` as the selected district for every normal camera, so site/close wheel zoom never promoted D01-D06 nodes unless a forced proof URL was active. This contradicted the accepted land-like contract that more registered detail renders as the camera closes.
- Superseded the test named `district focus requires explicit selection instead of viewport coincidence`. Classified it as **stale/superseded design intent** under the accepted test policy: the user explicitly requires camera-driven progressive rendering, not click-gated detail. World/territory/capital invariants remain unchanged; only site/close use the registered district beneath the camera center.
- Normal runtime proof now exercises the real interaction path rather than fixed proof URLs. Starting from world: NinjaOne destination enters capital; two zoom-in keys enter site with D01; another enters close; panning switches the active representation through D01, D03, D04, D02, and D06 based on registered camera-center ownership.
- Verified runtime attributes for representative states: D01 site `span=0.1764,0.2352`, `mode=d01-site-composite`; D01 close `span=0.148176,0.197568`, `mode=d01-close-composite`; D03 close, D04 close, D02 close, and D06 close each resolved to their corresponding district composite without a click.
- Live D02 normal-camera proof mounts only S13/I02 plus its accepted native L2 tree-node cohort. Live D06 normal-camera proof mounts the train-free open-undercroft station. World remains marker-only and the NinjaOne capital view remains the cohesive parent composition.
- Gates pass: typecheck, lint, production build, `git diff --check`, and combined focused city suites (`40/40`, zero failures). The full repository suite was already green immediately before this bounded two-file authority change and remains due after the next integrated visual correction.

### Evidence concerns and next repair

- The free-camera routing defect is fixed and live-proven, but the whole-city goal remains active. The strongest remaining visible issue is still D06: at close range its station/support mass dominates the local landscape and the lower water outlet reads as a rectangular cut. Do not infer station acceptance from successful routing.
- First test a smaller registered I21/I17 runtime scale against the existing context cutout, water, and contact geometry. If shrinking exposes an unacceptable hole or cannot correct the support mass, restore the placement and open a new exact high/xHigh asset contract; do not casually regenerate the full station.

### Exact next action

Checkpoint the free-camera LoD fix, then run a reversible D06 station-scale/contact proof. Promote a placement change only if live site/close views improve water clearance without exposing the D06 context cutout or breaking the fixed station socket.

## 2026-08-20 15:02 CDT

### D02 native foliage pipeline correction

- User review correctly rejected the apparent D02 tree replacement. The runtime claimed 15 mounted L2 trees, but the city-specific renderer bypassed the established L2 node structure: it painted only raw canopy atlas frames, without the registered neutralization underlay or the animated WebGL canopy pass. That left the blurred baked canopy underneath and created the reported contrast mismatch.
- Audited every D02 registration against the exact R4 atlas alpha. Four registered IDs (`020`, `024`, `029`, and `037`) had zero-alpha canopy and neutralization frames and therefore could never paint a tree despite being counted as mounted. Removed those false registrations and added valid baked-position instances `055` and `064`. The D02-specific registration is now 10 valid sockets; the close proof selects 13 valid native trees after the general admitted cohort is included.
- Reused the actual shared L2 foliage group implementation rather than maintaining a city-only approximation. D02 close now paints each registered neutralization underlay, then replaces it with the same native canopy nodes through the existing WebGL2 renderer. Live runtime evidence reports `13` groups, `13` neutralization underlays, `webgl2-ready`, and animation running. Site/capital still add no close-tree cohort.
- Added a durable regression gate that opens every D02 canopy and neutralization atlas frame and rejects a registered frame with zero nontransparent pixels. This prevents a manifest count from being treated as visual evidence again.
- The unrelated D06 `0.72` station-scale experiment was never built or accepted and was restored to the committed `0.82` placement before rebuilding the foliage authority. D06 remains the next unresolved visual repair; this D02 checkpoint does not claim station progress.
- Gates pass: R3 builder, typecheck, focused R3/LoD suites (`40/40`), lint, production build, `git diff --check`, and the full repository suite with zero failures. The live development server remains on `http://localhost:3000` with `d02-close` open for review.

### Remaining work

- D02 is materially closer and now uses the correct tree-node architecture, but user visual acceptance remains required. Any remaining blurry tree is baked parent context without a valid registered R4 replacement socket; do not claim it was converted merely from the group count.
- Resume the bounded D06 support-width/water-contact repair only after this foliage checkpoint. First use reversible placement evidence; if geometry itself remains defective, issue a new exact high/xHigh asset packet under the ImageGen worker contract.

## 2026-08-20 15:22 CDT

### D06 station footprint and river-margin repair

- Compared the committed I21/I17 site/close placement at `0.82` against controlled `0.76` and `0.72` runtime scales without changing asset alpha, perspective, lighting, camera, socket center, or the train-free source. The `0.82` station remained visibly dominant beside the waterfall; `0.76` reduced the issue but still crowded the channel. Selected `0.72` from live site and close proof.
- The registered station width changes from about `642px` to `564px` on the 1448 artboard. It remains within 10% of the `610px` capital-LoD footprint, so this is a bounded representation correction rather than arbitrary shrinkage.
- Mechanical proof against the byte-exact progressive water authority shows opaque station-on-water overlap falls from `3,173` pixels at `0.82` to `1,758` at `0.72`. Added a regression gate requiring no more than `1,800` opaque registered-water pixels and enforcing the 10% capital/site-close footprint tolerance.
- Live D06 site/close proof shows materially more native terrain and channel around the support, less scale conflict with the waterfall, aligned I17/I21 runtime scale, and the train still deferred. No new asset, ImageGen call, subagent lane, alpha edit, or context-mask relaxation was used.
- Gates pass for the exact checkpoint state: R3 builder, typecheck, focused R3/LoD suites (`40/40`), lint, production build, `git diff --check`, and the retained full repository suite with process exit `0`.

### Remaining visual acceptance

- D02 native foliage and D06 support footprint are ready for user review, not user-accepted. The full city goal remains active until the user accepts the integrated normal-camera result or marks the next defect.
- If the D06 support still reads too wide after this bounded scale correction, placement has reached its useful limit. The next step is a new high/xHigh asset packet targeting only the I21 lower support/undercroft silhouette; do not shrink the whole station further or broaden the water mask.

### Added goal item from user review (do not pivot before I22 verdict)

- Preserve the land-first treatment visible around D06 as the target pattern for another close district shown in user screenshot `codex-clipboard-139dfabe-2646-4a53-b26e-be6112b9c2fc.png`: keep the promoted architecture node, but stop relying on the baked district terrain and baked trees merely to make the node read.
- Repair that district after the current D06 support lane by exposing the authoritative native land wherever no city-specific incline, contact mass, or feature is required; replace any needed close foliage with the existing registered L2 tree-node pipeline rather than adding more baked/generated trees; add only a reversible city-owned landscape/contact transition where the building cannot ground directly to native land.
- Acceptance requires the node to read as built into the same land layer, not floating over a blurred duplicate city/forest plate. Do not remove the architecture node, alter L2/L3 authority, or start this repair before the I22 D06 worker verdict.

## Crash-safe checkpoint — 2026-08-20 16:00 CDT

### D06 I22 support trim verdict

- The xHigh I22 worker returned **NO-GO** without creating a candidate or spending an ImageGen call. Director inspection confirmed the result.
- Current whole-station opaque overlap with the accepted water authority is 1,758 pixels. Deleting every opaque pixel in the complete permitted lower-undercroft envelope—an intentionally invalid maximum-removal diagnostic—removes only 173 pixels and leaves 1,585 protected overlap pixels, still 585 above the proposed `<=1,000` gate.
- The proof classifies most counted overlap on protected roofs, towers, tracks, platforms, and upper fabric rather than on the lower support shelf. Therefore `<=1,000 whole-station water overlap` is a superseded repair metric, not a valid undercroft invariant. Do not promote I22 and do not silently widen the edit envelope.
- Evidence: `.codex-tmp/city-restart-r1/imagegen/I22-D06-narrow-support/worker-report.md`, `metrics.json`, and `proof-NO-GO-water-overlap-classification-2x.png`.
- Preserve the accepted D06 `0.72` placement checkpoint. A future D06 support repair must gate the editable support/contact ROI directly instead of using whole-station water overlap.

### D03 land-first repair now active

- Live proof positively identifies the user's logged example as D03 eastern industry: S09 AWS industrial at `[1118,550]`, with S07/S08/S12 as the other promoted L4_3 nodes.
- Root cause: the prior D03 context cutout removed baked city context only under the four node silhouettes. Blurred baked cliffs, vegetation, and duplicate district fabric remained above L2 everywhere else.
- A reproducible D03 context-exclusion authority entry and runtime mask path are implemented as a tracer. The first broad registered-district mask proves native land/water exposure but is **not accepted**: it removes too much connective architecture and exposes the district polygon.
- Sixteen existing L2 tree registrations were added for D03 from the native foliage atlas; the live D03 close tracer mounts 20 admitted/shared groups total, uses the shared neutralization-underlay plus WebGL canopy pipeline, reports `webgl2-ready`, and animates. No generated/city-specific tree art is used.
- Focused R3/LoD tests remain 40/40 green and TypeScript typecheck is green. Existing passing D03 silhouette and water invariants were preserved; no prior test was removed.
- Required xHigh asset lane `/root/d03_land_first_mask` is active with a strict quarantine-only packet for a D03 context-extraction mask that retains useful roads/buildings while removing baked terrain/forest. Maximum two candidates; Director promotion and runtime proof remain pending.

### Current worktree and next action

- Uncommitted tracer edits: builder, foundation manifest/model, D03 runtime mask consumption, shared native foliage registration, and focused tests; one new generated runtime mask exists under `public/.../authority/` but is not yet accepted.
- Dev server remains healthy at `http://localhost:3000/` and must stay running.
- Next action: wait for the D03M01 worker, independently verify its gates and visual proofs, promote only a conforming BEST candidate, rebuild the manifest, then inspect fixed D03 site/close and normal free-camera transitions before committing.

## Crash-safe checkpoint — 2026-08-20 16:35 CDT

### D03M01 runtime rejection and diagnosis pivot

- The first xHigh D03 worker returned two deterministic context-retention masks with passing static gates. Candidate 1 retained `38.47%` of D03 context and Candidate 2 retained `26.66%`; no ImageGen call was used. Director runtime proof rejected **both** candidates.
- In the actual SVG renderer, each retained source region became a large blurry oval or road-shaped island over authoritative native land. Candidate 2 reduced the number of islands but preserved the same defect. This disproves the context-threshold/extraction approach; changing the threshold again is not a valid next attempt.
- Authoritative live evidence is saved at `.codex-tmp/city-restart-r1/imagegen/D03-land-first-context-extraction/director-runtime-stable-baseline.png` and `director-runtime-candidate2-reject.png`. The worker's proof-only scaling of 2880x2160 and 1440x1080 references to the 1448x1086 artboard was insufficient to predict real runtime registration.
- The live renderer was restored to the stable pre-mask D03 cutout while the replacement lane runs. The accepted D03 native foliage work remains: 16 D03-specific existing L2 registrations, 20 admitted/shared groups in the close tracer, shared neutralization underlays, animated WebGL canopy nodes, and no generated city tree art.

### Replacement layer split now active

- New xHigh lane `/root/d03_land_first_layer_split` is producing at most two quarantine-only bundles. Each bundle has a continuous full-D03 exclusion mask (`D03M02-city-full-context-exclusion-r1`) plus a separate narrow transparent L4_1 road/platform/retaining/contact overlay (`D03L01-city-contact-road-transition-r1-alpha`).
- The exclusion mask must have no internal retention islands. The contact overlay may preserve only source-derived connective fabric near S07, S08, S09, and S12; it must contain no baked terrain, cliffs, water, forests, tree filler, or architecture-node pixels. Existing L2/L3 land and water remain authoritative.
- The worker received both failed live captures as negative references and may not claim static proof as runtime acceptance. Director acceptance still requires real D03 site and close inspection plus normal-camera transition proof.

### Worktree/evidence concern and exact recovery action

- The untracked accepted-source path currently contains rejected Candidate 1 while the untracked public path contains rejected Candidate 2 from the controlled live comparison; the generated manifest still names Candidate 1. Runtime no longer mounts either file, but source/public/manifest hashes are temporarily inconsistent. Do not build, test, stage, or commit this state as a valid authority.
- Preserve the uncommitted D03 native-tree code and tests. When the new bundle returns, independently verify it, wire it temporarily into the actual renderer, and reject it if any blurry island, district polygon seam, floating node, broad land cover, or duplicate foliage remains.
- Only after a live-accepted bundle exists: promote both assets, make builder/source/public/manifest hashes consistent, mount the contact overlay on L4_1 for D03 site/close only, run builder + focused tests + typecheck + lint + production build + diff check + full suite, then checkpoint and leave the development server on the review-ready D03 view.

## Crash-safe checkpoint — 2026-08-20 17:27 CDT

### Continuous land reveal is live-proven; deterministic contact extraction is closed

- The xHigh D03 layer-split worker finalized **NO-GO** after two deterministic bundles and zero ImageGen calls. Its continuous exclusion mask `D03M02` independently passes: 1448x1086 8-bit grayscale, SHA-256 `260A5FE73EBE31035B8AE4E73A6F6294486AEB47D06F130837C7A009FFC29A45`, 93.92% hard-white D03 coverage, one component, no holes, 7px feather, and zero outside-support pixels.
- Director wired D03M02 into the real SVG renderer using a linear inverse-luminance mask. Live D03 close proof at `.codex-tmp/city-restart-r1/imagegen/D03-land-first-layer-split/director-runtime-M02-mask-only.png` removes the old blurry D03 terrain/forest plate and retained islands while exposing authoritative native land/water. D03M02 is provisionally accepted for the integrated bundle; outer-boundary polish remains subject to the final contact-layer view.
- Both deterministic contact overlays are rejected. Candidate 1 passed numeric gates but left the four nodes floating. Candidate 2 either retained baked façade fragments or became fragmented/sub-threshold after conservative removal. Do not promote either overlay or repeat source-threshold extraction.

### Purpose-authored D03L02 contact lane

- New xHigh lane `/root/d03_ground_contact_imagegen` targets only `D03L02-city-grounded-contact-platforms-r1-alpha`: four localized L4_1 industrial/civic contact platforms under S07/S08/S09/S12, site + close only. It cannot alter water, foliage, land, node assets, non-D03 pixels, or add terrain/buildings/trees.
- ImageGen budget is exhausted at 2/2 calls. Call 1 regenerated the full city and was rejected before extraction. Call 2 produced the correct object class—four low slate/bronze contact platforms—but as RGB with a baked near-white checkerboard. The worker recovered a quarantined RGBA source and is allowed only deterministic matte cleanup, isolation, registration, and validation now.
- Working candidates fit the intended footprint (`5.62%` and `6.60%` of D03), remain inside the four fixed ROIs, and have zero hard-water, outside-support, and registered-foliage overlap. They are not yet accepted or promoted.
- Director proof exposed a packet error: requiring zero alpha under each node silhouette carved crescent holes out of platforms and made them look pasted beside buildings. The corrected invariant allows each L4_1 platform to underlap its own immutable L4_3 node only at/below the locked ground line, because the platform renders first and is occluded by the untouched node. Above-ground, other-node, water, and foliage intrusion remain hard-zero.

### Current worktree and exact continuation

- Runtime currently contains the provisional D03M02 inverse-mask wiring and an untracked public mask copy for live proof; no contact overlay is mounted. The browser is therefore an intermediate mask-only state and must not be presented as ready.
- Preserve the D03 native-tree registration/test work and the provisional D03M02 evidence. Wait for the amended D03L02 worker verdict, independently inspect alpha/halo/perspective and the four socket crops, then mount only a conforming candidate beneath the nodes for actual site + close proof.
- If matte recovery leaves a white halo, platform geometry reads as four pasted slabs, or runtime grounding remains weak, reject D03L02 and restore the stable baseline rather than relaxing water/foliage/ROI gates. If it passes, promote D03M02 + D03L02, reconcile builder/manifests/source/public hashes, update durable order/containment tests, run the full gate stack, commit, and leave the dev server on D03 close for user review.

## Crash-safe checkpoint — 2026-08-20 18:01 CDT

### User correction: native foliage is necessary but not sufficient

- The user rejected the current D03 site composition as sticker-like. This is a real visual integration failure, not a foliage-selection failure: D03M02 exposes the authoritative native land and the D03 runtime uses 16 registered existing L2 tree nodes, but the isolated architecture nodes lack the city-owned paths, steps, retaining edges, drainage detail, and contact shadow that previously joined them to the district.
- Preserve D03M02 and the native L2 tree-node replacement. Do not restore the baked D03 terrain/forest plate and do not generate more trees. D03L02 remains a valid shallow contact underlay but is insufficient by itself.
- A new xHigh quarantine-only asset lane `/root/d03_terrain_integration_detail` targets `D03L03-city-terrain-integration-detail-r1-alpha` on L4_2, between the L4_1 contacts and immutable L4_3 buildings. The exact 1448x1086 overlay may add only sparse paths, ramps/steps, thin retaining edges, drainage/curb hints, and soft lower-right contact shadow. It must preserve native land by transparency and remain zero on hard water and registered foliage.

### Promotion and gate state

- D03M02 and D03L02 now have source/public promotion copies and manifest-driven runtime wiring. The builder validates continuous D03 reveal, D03 support, live-parent land ownership, hard-water exclusion, transparent corners, and a 2–8% contact footprint; its focused test pair passes 14/14.
- The first builder run exposed a validation-definition mismatch: 28 contact pixels touched antialiased water-mask fringe values, while the worker contract defined hard water. The durable gate now uses `>223`; the candidate has zero pixels there and still has zero pixels outside registered parent land. This is classified as setup/validator alignment, not a stale design test or relaxed water-ownership decision.
- Current runtime is still not review-ready because the missing D03L03 transition layer is the user-visible defect. Next action: inspect the worker's candidate against actual site and close runtime, reject any broad terrain patch/generated foliage/architecture/halo, then promote only a live-proven asset, add manifest/order/containment tests, run the full gate stack, checkpoint, and leave the dev server on D03 close.

## Crash-safe checkpoint — 2026-08-20 18:30 CDT

### D03 land-first + native-foliage composition is Director-accepted

- The xHigh D03L03 worker used the full two-call ImageGen allowance. Candidate 1 is accepted; Candidate 2 is rejected as too broad and gray. The accepted 1448x1086 RGBA overlay SHA is `E4E975372FF6EE116B50A922AFC79F7852FAD892C737CA4FC5E9E0995C9AB3E7`.
- Director independently verified 7,252 positive-alpha pixels (2.645% of D03), maximum alpha 220, transparent corners, no pale matte, and zero pixels outside D03, outside registered parent land (`L < 64`), or on hard water (`L >= 240`). Worker registration also reports zero overlap with dilated active native-foliage occupancy and disallowed node geometry; durable tests reconstruct the active foliage occupancy and confirm zero D03L03 overlap.
- The live stack is now D03M02 inverse exclusion -> D03L02 L4_1 contact at `0.40` site / `0.44` close -> D03L03 L4_2 paths/steps/retaining detail -> immutable S07/S08/S09/S12 L4_3 nodes -> shared L2 native foliage reuse. D03L03 adds no trees, terrain plate, water, or building volume.
- Live site and close proof passed after softening the older contact layer. Evidence: `.codex-tmp/city-restart-r1/imagegen/D03-terrain-integration-detail/director-runtime-d03-site-contact040-stable.png` and `director-runtime-d03-close-contact044-stable.png`. The paths visibly taper into native terrain, the large S09 building no longer relies on a broad dark pad, water remains visible, and the existing shared tree nodes remain above the hardscape.
- Normal-camera world proof still shows only the NinjaOne marker at world LoD; the city plate does not leak outside its detail scope. Evidence: `.codex-tmp/city-restart-r1/imagegen/D03-terrain-integration-detail/director-runtime-normal-camera.png`.

### Gate/checkpoint state

- R3 builder, TypeScript typecheck, ESLint, focused R3/LoD tests (14/14), production build, and `git diff --check` pass. The full single-concurrency repository suite also finished green: 205 tests, 203 passed, 2 intentionally skipped, 0 failed.
- The builder/manifest now declare D03M02, D03L02, and D03L03 with explicit L4_1/L4_2 reversible ownership, source/public hashes, LoD tiers, coverage bounds, and land/water containment. Runtime uses only manifest-declared production paths.
- Next exact action: run the final status/hash/diff audit, commit the coherent D03 unit, and leave the live browser on fixed D03 close for user review.

## Crash-safe checkpoint — 2026-08-20 18:57 CDT

### D03 committed; six-district audit reopened D05

- D03 is committed at `21b2036` (`checkpoint: integrate D03 with native land and foliage`). Its full gate stack remains green: builder, typecheck, lint, focused tests, production build, full suite (`203/205` pass with two declared skips), and diff check.
- A fresh live site/close audit was captured for D01-D06 under `.codex-tmp/city-restart-r1/district-audit-20260820/`, including `district-site-close-contact-sheet.png`. D03 is the current integration reference. D01 is the worst broader overlap case, but D05 remains the active slice because it is explicitly named in the persistent goal and is not visually accepted.
- D05 close still shows five sharp progressive nodes over wider baked versions of the same socket architecture. The exact-alpha cutout test therefore protects a stale design intent: it removes only the replacement PNG alpha while duplicate domes/facades remain immediately adjacent. This is a real visual regression against cohesive node replacement, not a reason to restore the prohibited D05 plate.
- The correction is bounded to localized parent-context exclusion around S15 `[285,677]/144`, S10 `[187,834]/126`, S01 `[490,878]/130`, S18 `[530,971]/140`, and S11 `[603,971]/133`. Node assets, anchors, widths, L2 land, L3 water, and all non-D05 context remain locked.
- The existing D05 close camera selects eight shared native-tree groups; six are on-screen D05 registrations admitted by the existing baked-vegetation overlap analysis. Preserve that sparse existing-tree cohort during socket cleanup. Do not add generic tree filler merely to hide seams.

### Active D05M01 asset lane

- xHigh worker `/root/d05_socket_context_exclusion` is producing at most two quarantine-only deterministic `1448x1086` grayscale candidates for `D05M01-western-skill-socket-context-exclusion-r1`. The mask must be white-retain/black-exclude, remain inside the 307,396-pixel D05 authority, stay within 36 artboard pixels of the five locked transformed node silhouettes, and exclude only 2-12% of D05.
- First broad attempts failed the hard-exclusion and boundary-gradient gates and were revised rather than accepted. Current Candidate 1 numerically passes: 0 outside-D05 pixels, 10.016% hard exclusion, maximum silhouette distance 7.81px, 8px feather, nonzero p99/max gradient 32, and four localized support components. It is **not accepted yet**; worker visual/component QA and Director live D05 site/close proof remain required.
- If D05M01 removes the duplicate baked structures but exposes raw land holes or leaves nodes floating, do not widen it into a district plate. Isolate a new D05 L4_1/L4_2 contact/transition dependency and issue a separate strict asset contract. Runtime proof, promotion, tests, handoff, and commit remain Director-owned.

## Crash-safe checkpoint — 2026-08-20 19:46 CDT

### D05 socket-only cutout rejected; full land-first reveal in progress

- The completed `D05M01-western-skill-socket-context-exclusion-r1` is valid as a localized prerequisite mask (`1448x1086`, 10.3752% hard D05 exclusion, zero outside-D05 pixels, 8px feather), but Director live proof rejects it as the final composition. It leaves roughly 90% of the baked D05 parent fabric and foliage visible, so the five sharp replacement nodes still read as stickers over a blurred plate.
- The completed `D05L02-western-skill-ground-integration-r1-alpha` remains a quarantined asset-level PASS: SHA-256 `bf56f85f373eef3356fcae11d5d3f658db278eb868b7251a46029ed43bb80167`, `1448x1086` RGBA, 2.29053% D05 footprint, max alpha 220, exactly five socket-contact components, and zero hard-water/foliage/outside-land/outside-D05/upper-node overlap. It is not promoted because the parent-removal contract is changing.
- Live D05 close proof verified eight existing `L2` native conifer instances from the accepted shared foliage atlas. Preserve this cohort; do not add a separate urban tree vocabulary. The next mask must remove baked D05 foliage so these registered tree nodes become the visible foliage layer.
- The pale/black vertical strip at the old D05 close left edge was a camera framing defect, not an alpha seam. `D05_PROOF_LOCAL_BOUNDS` now offsets the proof framing 135 artboard pixels inward while leaving selection ownership and every world/node coordinate unchanged. Live proof confirms the artboard-edge strip is gone.
- Reusing the generic `CFX01` full-city close-fabric overlay in D05 was tested and rejected because it introduced bright/green contact halos. The temporary reuse block was removed. Any further integration detail must be D05-local and city-owned.
- xHigh worker `/root/d05_socket_context_exclusion` is now building `D05M02-western-skill-full-context-exclusion-r1` in quarantine, using the accepted D03 authority convention: black outside/corners, hard white inside D05, 7-8px inward feather, then runtime inversion. Target is 85-99% D05 exclusion with zero nonzero pixels outside the exact D05 authority. Maximum two deterministic candidates, zero ImageGen calls, no tracked writes.
- Next exact action: verify D05M02 metrics, wire it into review runtime with the inverse filter, capture D05 site/close with current D05L02 and the eight native trees, then classify any exposed-land grounding gap before issuing a separate D05L03 detail contract. Do not promote D05M01 or D05L02 until this live proof is visually accepted.

## Crash-safe checkpoint — 2026-08-20 20:18 CDT

### D05 full reveal accepted as the correct base; transition proof pending

- `D05M02-western-skill-full-context-exclusion-r1` is the selected full-D05 exclusion authority in quarantine. SHA-256 is `f24b8e7ea8c2a9658fc55e0880aa8d102b6d7909c9621ebb15b5f949e032b929`; it is `1448x1086` single-channel grayscale, owns exactly the 307,396-pixel D05 authority, has zero positive pixels outside it, 97.131388% hard-white coverage, one component/no holes, and direct H/V mask deltas no greater than 32. Corners are `0/0/255/0`; bottom-left is intentionally white because the accepted D05 authority reaches that artboard corner.
- The public `_review` D05M02 copy was replaced after a race with the corrected quarantine hash and now matches `f24b8e...`. Runtime uses the same inverse-luminance convention as accepted D03M02. Live site/close proof confirms the baked D05 architecture/foliage plate is removed and authoritative native L2 land/L3 water show through. The resulting broad bare terrain is expected until the city-owned transition layer is mounted.
- `D05L02-western-skill-ground-integration-r1-alpha` remains the selected L4_1 contact asset in quarantine/review, SHA-256 `bf56f85f373eef3356fcae11d5d3f658db278eb868b7251a46029ed43bb80167`. It has five localized contacts, 2.29053% D05 coverage, and zero hard-water, foliage, upper-node, or ownership leakage.
- xHigh lane `/root/d05_ground_integration` is finishing `D05L03-western-skill-terrain-integration-detail-r1-alpha`. Its first and only current ImageGen candidate is objectively green before final visual proof: 8,605 nonzero pixels (2.79932% of D05), max alpha 220, zero D05/land/water/registered-foliage/upper-node leakage, largest component 1.314916% of D05, one nearby component for every socket, 44-89px branches, and a connected S01/S18/S11 route. No second generation call will be used unless the exact-order proof fails visually.

### Native-tree and close-bleed findings

- D05-native-tree derivation is a documented NO-GO for additional registrations, not a failure of the native-tree direction. Of 38 L2 instances intersecting D05, only `b1-native-conifer-059-instance`, `b2-native-conifer-133-instance`, `b2-native-conifer-148-instance`, and `b2-native-conifer-159-instance` pass all accepted foliage/base/structure thresholds; all four are already global. Additional qualified IDs are zero, so promoting a D05 registration manifest would be a runtime no-op. Keep the current shared native-tree cohort and do not add filler.
- User requested an explicit full -> territory -> capital -> site -> close LoD truth audit plus performance and close-detail asset-bleed inspection before review. Their black screenshot regions are confirmed to be outside the fixed 4:3 world viewport and are out of scope; do not treat them as camera/world-plane bleed.
- The broad dark block beneath S09 is not baked into the S09 PNG and is not D03L02/D03L03. Repository evidence points to the generic procedural `CityNodeShadow`: L4_2/L4_3 nodes receive a blurred contact ellipse plus a cast-shadow quadrilateral. For D03/D05, which now have authored L4_1/L4_2 grounding layers, these generic shadows duplicate contact treatment and can read as rectangular bleed at close LoD. Verify isolated runtime layers, then suppress procedural shadows only for the repaired districts rather than globally degrading unrepaired districts.

### Exact continuation

- Wait for the final D05L03 proof/report; independently inspect it, mount it after D05L02 and before D05 nodes, and capture D05 site/close. Reject any broad pad, checker/matte halo, generated foliage, architecture, water overlap, or route that replaces native terrain.
- Run the five-tier LoD/performance/bleed audit. Verify the fixed 4:3 viewport rather than page background, isolate city child layers at close, and record DOM/resource/performance counters. If D03/D05 procedural shadows are confirmed as the dark blocks, remove them only where authored grounding is present and add a durable ordering/absence test.
- After Director live acceptance, promote D05M02/D05L02/D05L03 to source/public authority, add builder/manifest/model/runtime declarations and accepted full-reveal tests, classify the old D05 socket-only test as stale/superseded intent while preserving district containment/LoD invariants, run the full gate stack, commit the coherent checkpoint, and leave the dev server on the review-ready D05 close view.

## Crash-safe checkpoint — 2026-08-20 21:08 CDT

### D05 is promoted and live-proven as a land-first district

- D05M02, D05L02, and D05L03 are now in tracked art-source and production paths; runtime references only manifest-declared production URLs. Selected hashes are D05M02 `f24b8e7ea8c2a9658fc55e0880aa8d102b6d7909c9621ebb15b5f949e032b929`, D05L02 `bf56f85f373eef3356fcae11d5d3f658db278eb868b7251a46029ed43bb80167`, and D05L03 `985585a7c94d2710cc126caa23945d3c4dde1612f933a5c07115d12f499e3db5`. The D05L03 worker used one of two allowed ImageGen calls and the Director mounted it at `0.54` site / `0.62` close after stronger opacity proved too dark.
- Live D05 site and close show the authoritative native land and water through the full D05 parent-context exclusion. Five immutable L4_3 architecture nodes sit over separate, sparse L4_1 contacts/routes; baked D05 architecture and baked D05 foliage are absent. The existing close foliage renderer remains the accepted shared L2 system: eight selected instances across four native atlas resources, WebGL2 ready. No D05-specific tree atlas or new generated foliage was added because the evidence lane found zero additional valid registrations.
- The broad close-detail dark rectangles were the generic procedural `CityNodeShadow`, not baked node pixels. D03 and D05 now suppress that fallback because both districts have authored grounding; unrepaired districts retain it. Live D05 reports zero generic node shadows.

### Ownership, LoD, test, and performance evidence

- A real layer-ownership bug was fixed. D03L03 and D05L03 are L4_1 landscape integrations, not L4_2 transportation. D03/D05 context exclusion and grounding now depend only on L4_1; architecture nodes depend only on L4_3. Turning L4_3 off leaves native land plus city-owned grounding; turning the parent L4 city layer off removes all city sublayers and restores untouched L2/L3.
- Full camera truth is verified: world and territory mount no city artwork; capital mounts the capital context cohort; D05 site adds the five registered nodes and L4_1 integration; D05 close adds the shared native-foliage renderer. Normal wheel progression reaches capital -> site -> close and close continues to the configured minimum span. The black regions in user screenshots are outside the fixed viewport and are intentionally ignored.
- The old D05 socket-only cutout intent and old D03 atomic-detail assertion were classified as stale/superseded design intent. Both were replaced with tests for full native-land reveal, independent L4_1/L4_3 visibility, exact district containment, water/foliage exclusion, asset ordering, and absence of the prohibited broad procedural shadow. Focused foundation + LoD tests pass `42/42`.
- Steady site and close rendering hold approximately `16.7 ms` frames. Cold capital -> site produced one measured `125 ms` long task. Cold site -> close produced one measured approximately `568 ms` long task while the native-foliage WebGL resources initialized, after which frames returned to `16.7 ms`. Treat the one-time close-entry hitch as a real remaining performance concern; current profiler markers under-report foliage decoded residency, while DOM/runtime evidence shows eight instances / four atlases.

### Exact continuation

- Final verification is green: R3 builder, typecheck, lint, focused foundation/LoD tests (`42/42`), full single-concurrency repository suite, production build, and `git diff --check`. Source/public D05 hashes match byte-for-byte. The production build retains its existing large-chunk advisory; this did not fail the build and is separate from the measured close-entry hitch.
- Stage only the tracked D05 unit plus its production/source assets and tests, commit the checkpoint, keep the port-3000 dev server alive, and leave the in-app browser on the fixed D05 close URL for user review. Obsolete untracked `_review` D05 copies are evidence only and must remain unstaged.
- Do not claim the overall six-district city goal complete. D05 is the review-ready vertical slice; D01/D02/D04/D06 still need the same land-first, water-safe, independent-layer audit, and the cold close-entry hitch remains open.

## Crash-safe checkpoint — 2026-08-20 21:57 CDT

### D01 parent-context diagnosis is live-proven

- D01 is the next repair slice because its site/close view rendered six sharp L4_3 crown nodes over six blurry baked counterparts plus baked city forest/terraces. This is the same stale atomic-silhouette replacement failure already corrected in D03 and D05.
- `D01M02-crown-full-context-exclusion-r1` is accepted for mask fitness and copied only to the untracked review path. Quarantine/public-review SHA-256 is `58cba9b60d03ff592566bec9338d4a7e93fa23465c505fd3163f1574f371d4c1`; the 1448x1086 one-channel mask owns exactly the 435,501-pixel D01 authority, has 96.639043% hard-white coverage, zero positive pixels outside D01, one component/no holes, and direct H/V gradients no greater than 32.
- Director wired the review mask behind a split `d01DistrictLandscapeVisible` / `d01DistrictArchitectureVisible` contract and restarted the stale development process. Live D01 site/close now removes the baked D01 city/forest plate and reveals the accepted native mountainous L2 land while retaining the six immutable node sockets and the parent-alpha skyline clip.
- The live result is intentionally **not review-ready**: full reveal proves the six buildings float without city-owned contacts, stairs, retaining lips, or narrow circulation. Do not restore the baked D01 plate or widen the nodes to hide that gap.

### Native foliage and active asset lane

- A full existing-tree audit is a documented NO-GO for additional D01 registrations under unchanged evidence thresholds: 179 L2 instances scanned, 28 intersect D01 canopy alpha, zero pass all alpha/base-vegetation/vegetation/structure gates. The sole near-miss (`c1-native-conifer-057-instance`) fails structure at `0.31067961165 > 0.30`. Current D01 site selects zero native instances; close selects four instances across two resources (6,572,032 decoded bytes). Preserve the current shared close cohort and do not invent filler trees.
- xHigh worker `/root/d01_crown_grounding` is the only active ImageGen lane. It targets `D01L02-crown-grounding-and-circulation-r1-alpha` on reversible L4_1: six localized contacts plus restrained stairs/retaining/drainage/narrow paths, with zero buildings, foliage, water, broad plateau, outside-D01, or outside-live-land coverage. Maximum two calls/candidates; quarantine only; Director runtime acceptance remains required.
- The prior live server was stale despite serving HTTP 200 and still rendered the old node-shaped D01 cutout. Director verified the mismatch from the actual SVG mask, stopped the exact port-3000 owner, and restarted the dev server from the current checkout. The refreshed DOM now references the D01M02 review mask and live imagery matches the expected native-land reveal.

### Exact continuation

- Wait for D01L02, independently inspect alpha, perspective, contact geometry, foliage/water containment, and exact-order proofs. Promote only a conforming candidate to the review runtime beneath the six L4_3 nodes; then suppress D01 generic procedural shadows because authored grounding replaces that fallback.
- Capture real D01 site/close proof. If grounding remains sparse or sticker-like, issue a separate D01-local terrain-integration-detail asset only after identifying the exact missing connective fabric; do not reuse the old broad D01/D07 plates or generate trees.
- After live acceptance, promote D01M02/D01L02 (and a proven D01L03 only if necessary), add builder/manifest/model declarations, replace the stale atomic-silhouette test while preserving socket/width/skyline/containment/LoD invariants, run the full gate stack, and commit a coherent D01 checkpoint. Continue with D02/D04/D06; the overall city goal remains active.

## Crash-safe checkpoint — 2026-08-20 22:59 CDT

### D01 grounding is live-accepted; production integration is active

- `D01L02-crown-grounding-and-circulation-r1-alpha` is frozen at SHA-256 `a3568ec9b6cd2e751a21dfef290705b1502573831764a03317ecb14ffc74eb34`. It is a `1448x1086` RGBA L4_1 asset with 5.374% registered-D01-land coverage, max alpha 220, zero hard-water/foliage/upper-node/outside-D01 leakage, six socket contacts, and 7-16px circulation arms. The xHigh worker used one of two allowed ImageGen calls and did not promote it.
- Director rejected the worker's first runtime proof because the `2880x2160` live base and `1448x1086` assets were composed without registration. The worker rebuilt the proof at the exact `1448x1086` runtime registration; its independent verifier then passed with zero failed gates. The frozen asset was copied to `_review`, its hash was rechecked byte-for-byte, and the real application was captured at fixed D01 site and close URLs.
- Live D01 site/close now mounts the full D01 exclusion, D01L02 beneath the six immutable L4_3 architecture nodes, and zero generic procedural node shadows. The broad baked city forest/terraces and duplicate architecture are absent. Native L2 terrain remains visible; the close tier progressively adds four existing shared-foliage instances through the WebGL2 native foliage renderer, while site adds none. No new or generated trees were added.
- Pixel ownership disproved an apparent bleed concern: WFX01 has zero nontransparent pixels inside D01, while all 52,821 LFX06 pixels are inside the accepted D01 mask and provide the already-approved rear-ridge grade. Their DOM presence is therefore not cross-district visual bleed. D01 site/close contain no D03 or D05 runtime assets.
- The live result is accepted for production integration without a D01L03 generation lane. D01L02 supplies restrained contacts/routes while the native land remains dominant; further broad fabric would work against the user's land-first direction.

### Exact continuation

- Promote D01M02 and frozen D01L02 to tracked art-source/public authority and landscape paths. Add D01 to the builder manifest, model runtime contract, renderer production paths, and tests using the same reversible full-reveal contract as D03/D05.
- Classify only the old D01 atomic parent-silhouette assertion as stale/superseded intent. Preserve the six socket IDs, widths, skyline clip, disjoint-node, district containment, L2/L3 ownership, progressive site/close routing, and absence of generic node shadows.
- Run builder, focused tests, typecheck, lint, production build, full suite, and diff check; capture production D01 site/close again; stage only the coherent D01 unit and commit it. D02/D04/D06 and the full-to-close performance/bleed audit remain open, so the overall goal stays active.

## Crash-safe checkpoint — 2026-08-20 23:17 CDT

### D01 production contract and gates are green

- D01M02 and D01L02 are promoted to tracked art-source/public paths with byte-identical hashes `58cba9b...` and `a3568ec...`. The R3 builder now validates D01 district containment, 95-99% hard parent reveal, 2-6% L4_1 grounding coverage, alpha/corner limits, registered-land ownership, and zero hard-water overlap before publishing them through the production manifest.
- Runtime now consumes only manifest-declared production URLs. Fresh application proof reports zero `/_review/` image references, six D01 L4_3 node IDs, D01L02 on L4_1, zero generic shadows, zero foliage instances at site, and four existing WebGL2 native-foliage instances at close.
- Test classification is recorded and applied: the former assertion that D01 must atomically replace only six parent silhouettes was **stale/superseded design intent** because the accepted land-first decision now removes the full baked D01 district context. The replacement test preserves the real invariants: six calibrated/disjoint sockets, parent skyline clip, independent L4_1/L4_3 visibility and ordering, exact D01 containment, no water repaint, native-land reveal, progressive site/close routing, and no broad procedural shadow. The generic alpha-silhouette mask invariant remains protected for unrepaired atomic-detail districts.
- Gate evidence is green: deterministic R3 builder; focused city contract tests `43/43`; typecheck; lint; full repository suite `205/207` passed with two declared skips and zero failures; production build; source/public hash equality; and `git diff --check`. The existing build chunk-size advisory remains non-fatal and unchanged.

### Exact continuation

- Stage and commit only the D01 production unit; leave all `_review` files untracked. Then audit D02 and D04 against the same full-reveal/native-land decision before requesting any new asset. D06 station/water/undercroft cleanup remains after those dry districts.
- The dev server remains on port 3000. Do not declare the overall city complete until D02/D04/D06, full-to-close LoD truth, close asset bleed, cold-entry performance, and final whole-city visual review all pass.

## Crash-safe checkpoint — 2026-08-20 23:30 CDT

### D02/D04 diagnosis is live-proven; repair assets are active

- D01 is committed as `52ab955 checkpoint: integrate D01 with native land`. The worktree contains only obsolete untracked `_review` evidence copies; no tracked production changes are currently pending.
- Fixed runtime captures prove D02 and D04 have the same remaining failure class: sharp independent nodes sit over blurry baked district architecture, cliffs, and forest. D02 site mounts S13/I02; close adds 13 existing native-foliage instances. D04 site mounts S04/S02; close adds eight existing native-foliage instances. The existing trees do not solve the mismatch because the baked plate remains underneath them.
- D02 and D04 now have separate high/xHigh lanes for full-context exclusion masks, land-owned grounding, existing-tree evidence, and D04's missing independent S14 gateway. The gateway lane is a materially different compact concept-scale approach: twin portal supports, a slim elevated deck, transparent undercroft, and narrow bank contacts. It does not repair or reuse the previously rejected broad S14 candidate.
- The D02 mask worker found a Director packet contradiction, not an art blocker. I02's socket center lies below the exact D02 authority, so requiring a hard-white 73px neighborhood there violated exact containment. The 95-99% hard-white threshold also conflicted with a 7-8-step inward feather capped at 36 alpha units per pixel. The amended contract preserves exact D02 geometry, ignores unsupported anchor pixels, requires only support-intersecting node/contact coverage, retains the smooth inward feather, and accepts the authority's achievable 90-94% hard-white range.
- User confirmed black regions outside the fixed world viewport are out of scope. Do not spend repair effort on them or classify them as world-plane bleed.

### Exact continuation

- Wait for the D02/D04 masks, D02 grounding, D02 foliage audit, and compact S14 gateway. Independently verify dimensions, alpha, district/land/water ownership, perspective, contact geometry, and proofs before copying anything to `_review`.
- Mount D02 full reveal plus grounding beneath S13/I02, retain architecture/transport ownership independently, suppress its generic shadow only after authored grounding is present, and capture fixed site/close proof. Generate no additional D02 foliage unless the evidence lane identifies actually qualified existing instances.
- Mount D04 full reveal plus S04/S02/S14 and inspect the exact missing L4_1 land and L4_0 water-contact fabric. Only then issue narrowly scoped grounding/water-detail asset packets. Preserve authoritative L2 land and L3 water, and keep S14 support out of the deep channel.
- D06 remains next, followed by full-to-close LoD truth, cold-entry performance, close-detail bleed, and whole-city visual acceptance. Keep port 3000 alive and do not claim the overall goal complete.

## Crash-safe checkpoint — 2026-08-21 00:16 CDT

### D02 is production-integrated; D04 is in live review assembly

- D02M02 and D02L02 are promoted to tracked art-source/public authority and landscape paths with hashes `d392f4c...` and `7f2ac0a...`. The R3 builder validates D02's exact parent exclusion, 90-94% hard reveal, 2-6% registered-land contact footprint, alpha/corner limits, zero hard-water/unowned-land overlap, and the accepted bounded I02 contact extension.
- D02's I02 anchor is 41.11px outside the old D02 mask; that was the root of repeated impossible contact gates. The accepted correction keeps the context mask exact, allows only a 35.903px city-owned L4_1 contact extension inside I02's own footprint and registered land, and changes no other candidate pixels. Live D02 site/close reports production-only paths, D02L02 on L4_1, S13 on L4_3, I02 on L4_2, zero procedural shadows, zero site foliage, and 12 shared native-tree instances at close.
- The D02 foliage audit found no defensible new placements. One legacy registration, `c1-native-conifer-054-instance`, had zero D02 canopy overlap and was removed. The remaining close cohort continues to use the existing shared R4 land-tree atlases; no filler or generated trees were added.
- D02's former atomic-two-silhouette assertion is classified stale/superseded design intent. The replacement preserves both calibrated sockets and their independent L4_2/L4_3 ownership while requiring full native-land reveal, L4_1 grounding below nodes, water/land containment, progressive site/close routing, and no procedural shadow. Focused foundation/LoD tests pass `44/44`; typecheck and lint pass.
- D04M02 live review cleanly removes the baked central-lake plate and reveals native cliffs/water. The compact S14 gateway review candidate is independently mounted at `[794,731]`, width114, with a fully transparent undercroft, 11px runtime deck, zero deep-channel obstruction, and two bank-local supports. Candidate 2 was rejected for baked checker; candidate 1 passed the Director-amended bridge-aware 28% overlap cap at 25.576% while retaining every stricter water/opening gate.
- D04W02 is mounted in review on L4_0: 97 low-alpha pixels, max alpha79, entirely within D04 registered water and 20px of S14 support/deck proximity. It adds only support ripples/under-deck water contact. The D04L02 xHigh grounding lane is still active for S04/S02 contacts and S14 bank approaches; two ImageGen calls/candidates are exhausted and deterministic cleanup/verification is underway.

### Exact continuation

- Wait for D04L02 final. Reject checker residue, broad pads, generated trees/buildings, water overlap, excessive S14 approaches, or anything outside registered land/authorized socket extensions. Mount below S04/S02/S14 and capture fixed D04 site/close.
- If D04 live proof passes, promote D04M02/D04L02/D04W02/S14 to production R3 manifest paths, make S14 placement manifest-driven, suppress D04 procedural shadows only after authored grounding exists, replace only stale baked-S14/atomic-cutout tests, run the complete gate stack, and commit D02+D04 together because their renderer/test changes currently share files.
- Then repair D06 station/undercroft/water integration with the train still absent. Finish with full-to-close LoD, performance, close asset-bleed, and whole-city visual audits before opening the dev server for user review.

## Crash-safe checkpoint — 2026-08-21 00:47 CDT

### D02 and D04 are production-integrated and live-proven

- D02 remains production-only after correcting its L4_1 render order: the parent context is now cut out first, D02L02 is composited above the revealed native land, and S13/I02 render above that. A durable test now requires `context < D02L02 < nodes`. Fresh D02 site/close capture reports zero review paths, zero procedural shadows, no site foliage, and 12 existing R4 native-tree instances at close.
- D04M02, D04L02, D04W02, and the compact S14 gateway are promoted to tracked source/public paths with hashes `4c75a7ef...`, `30d4865d...`, `7eeab3c4...`, and `9bf76fc0...`. Runtime now consumes manifest-declared production paths only and declares S14 placement at anchor `[794,731]`, width `114`.
- D04 live site/close preserves the native central cliffs, lake, and channel. S04/S02 receive only sparse L4_1 contact fabric; S14 remains an independent L4_3 gateway with an open undercroft; D04W02 adds 97 low-alpha water-contact pixels on L4_0. Generic procedural node shadows are suppressed because authored grounding is present. Close adds eight existing WebGL2 native-tree nodes; no new/generated foliage was introduced.
- Test-policy classification: the prior D04 atomic/baked-S14 intent is stale and superseded by the accepted land-first, independent-layer decision. Preserved invariants now include the two dry sockets, exact mask containment, 90-94% hard reveal, live-land/water ownership, authored layer order, manifest placement, S14 deep-channel clearance, progressive site/close routing, no review-path bleed, and no duplicate procedural shadows.
- Gates are green: deterministic R3 builder, focused foundation/LoD tests `45/45`, typecheck, lint, and `git diff --check`. Fresh production runtime proof reports zero `/_review/` references at D02/D04 site and close. The dev server was restarted on port 3000 after a Windows file-handle issue; the builder now skips byte-identical outputs, and the prior manifest was backed up under `.codex-tmp/city-restart-r1/backups/` before its exact replacement.

### Exact continuation

- Run the full repository test suite and production build, stage only the D02/D04 production unit plus shared renderer/model/builder/tests/handoff, and commit the checkpoint. Leave obsolete `_review` evidence files unstaged.
- Repair and re-audit D06 with the train absent: verify I20/I21/I17 ownership and scale progression, open undercroft, support width, water-under-bridge detail, land reveal, and close overlap/bleed. Generate a new asset only if a specific defect remains after current assets/layers are isolated.
- Finish the required world -> territory -> capital -> site -> close truth pass, cold-entry performance measurement, close-detail asset-bleed isolation, and whole-city comparison. Only then tell the user the port-3000 view is ready for final review; black page regions outside the fixed viewport remain explicitly out of scope.

## Crash-safe checkpoint — 2026-08-21 01:48 CDT

### D06 ownership and progressive LoD are technically proven

- I17 was briefly moved toward manifest ownership to eliminate the old public-path bypass, but the asset itself bakes conifers into masonry, stairs, and undercroft edges. The strict xHigh tree-removal lane exhausted two calls and returned NO-GO: candidate 1 creates architectural holes; candidate 2 redraws masonry, retains foliage, and adds matte seams. The Director rejected both and removed I17 from renderer, manifest, builder, model, and LoD contract. No I17 candidate was promoted.
- The refreshed LoD harness now passes the accepted sequence without that defective plate: world and territory mount no city artwork; capital mounts only the capital context cohort; D06 site mounts WFX01/LFX06/CFX01/I21; D06 close retains those layers and progressively adds six existing native-tree nodes. No legacy node-ID assertions or territory-level city plate remain in the harness.
- Layer-isolation proof is clean: L4_0 removes only WFX01; L4_1 removes only LFX06; L4_2 removes I21; L4_4 removes CFX01; L4_6 removes the six native-tree nodes; disabling parent L4 removes every city modification and restores the untouched land/water composition. Runtime proof reports zero `_review` asset references.
- The flat blue terminal below the station is confirmed L3 inland-water geometry, not L4 city bleed. The xHigh D06L02 transition lane returned NO-GO: two compliant city-owned overlays could soften the neck but could not conceal the terminal while tapering to zero at the 1448x1086 city artboard boundary. Nothing was promoted. The smallest credible correction requires explicit authority to modify the L3 endpoint or extend the city transition socket beyond the current artboard; do not silently alter base water.

### Remaining D06 acceptance and performance work

- I17 is intentionally omitted. Close detail now adds only the six accepted native-tree nodes over the train-free/open-undercroft station representation. A replacement civic overlay remains future work only if a specific close-detail deficit is demonstrated and a new asset can preserve the overall parent art without baked foliage.
- The temporary diagnostic that disabled close native foliage has been reverted. That experiment did not reduce the approximately `1.0-1.4 s` full-page close-load long task, so the shared native-tree renderer is not the demonstrated bottleneck. Steady rendering remains approximately `16.7 ms`; the final representative performance capture must be rerun with foliage enabled and the accepted I17 decision applied. Treat full-page cold close initialization as a material residual concern, not a steady-frame failure.
- Port 3000 remains live. Next: rerun LoD sequence, layer isolation, representative performance, focused tests, typecheck, lint, build, full single-concurrency suite, and final whole-city visual comparison; then commit the D06 checkpoint. Black page regions outside the fixed viewport remain explicitly out of scope.

## Crash-safe checkpoint — 2026-08-21 02:13 CDT

### D06 and the whole-city verification pass are review-ready

- Final runtime proof passes the full world -> territory -> capital -> D06 site -> D06 close sequence. The captures report no city at world/territory; `LFX06/I20` at capital; `WFX01/LFX06/CFX01/I21` at site and close; and exactly six existing native-tree instances added only at close. Every view fills the fixed `1448x1086` viewport and references zero `_review` paths.
- Final close layer isolation is exact: L4_0 removes WFX01, L4_1 removes LFX06, L4_2 removes I21, L4_4 removes CFX01, L4_6 removes the six native trees, and parent L4 removes the city entirely to expose untouched native land/water. The rejected I17 and D06L02 assets are absent from runtime.
- Final performance evidence separates steady rendering from startup cost. Site and close steady samples hold approximately `16.7 ms` p50/p95 with zero frames over `25 ms`. Full-page close initialization still shows a `957 ms` cold and `675 ms` warm long task, with approximately `5.5 s` readiness. The foliage-disabled control did not improve that cost, so removing the correct native-tree LoD is not a supported optimization. Record this as remaining startup debt, not a steady-frame or layer-bleed failure.
- Gate stack is green: deterministic R3 builder, focused foundation/LoD tests `45/45`, typecheck, lint, production build, full single-concurrency repository suite `207/209` passed with two declared skips and zero failures, and `git diff --check`. The existing build chunk-size advisory remains non-fatal. The temporary untracked production I17 copy was removed and remains recoverable from its source asset; obsolete `_review` evidence files remain intentionally unstaged.

### Exact continuation

- Stage and commit only the four tracked D06/final-audit files: renderer, LoD capture harness, foundation test, and this handoff. Keep port 3000 alive and hand the fixed D06 close URL to Steve for review.
- Do not claim the L3 stream terminal is repaired; it is a documented ownership-bound residual requiring explicit base-water or beyond-artboard socket authority. Do not reintroduce I17 unless a new tree-free asset independently passes architecture, alpha, placement, seam, and runtime LoD gates.

## Crash-safe checkpoint — 2026-08-21 02:42 CDT

### Final residual repairs are active under explicit city-sublayer ownership

- The previously documented lower-stream blocker was narrowed to an authority mismatch rather than an immutable base-water requirement. Steve explicitly said the black region below the fixed world viewport is out of scope, so `D06W03` may use a narrow city-owned L4_0 component that remains nonzero at artboard row 1085 and visually exits the viewport. L3 remains byte-untouched. The xHigh worker is proving two deterministic, parent-water-derived candidates only inside D06 ROI `x=920..1070, y=980..1085`; both initial registered-base proofs replace the flat blue cap with a continuous channel. Candidate 1 is the current visual preference, but neither is accepted until in-frame alpha gradients, D06 ownership, I21 non-overlap, and exact runtime site/close proofs pass.
- I17 remains rejected and absent. A materially different xHigh `I22` lane creates a new tree-free close-only civic U-ring rather than editing the baked-foliage plate. The contracted asset is `1536x1024` RGBA, rendered on L4_4 behind I21 and before L4_6 native foliage at anchor `[1054,1086]`, base size `[846,564]`, scale `0.72`. It may contain only sparse terraces, stairs, open arches, lamps, walkways, and small civic buildings; no trees, terrain, water, train, steam, broad plate, or duplicate station. Two ImageGen calls are exhausted. The raw geometry is on brief, but both calls baked checker/matte into RGB; deterministic alpha salvage is still under gate, and the lane must return NO-GO if checker removal changes geometry or leaves seams.
- Port 3000 remains live and returns HTTP 200. The committed baseline remains `cd0ede8 checkpoint: finalize NinjaOne city LoD audit`; the only working-tree change is this handoff plus the intentionally preserved untracked `_review` evidence files.

### Exact continuation

- Wait for frozen D06W03 and I22 worker reports. Independently inspect dimensions, alpha, transparent corners, checker decontamination, perspective, lighting, contact geometry, D06/water ownership, I21 dominance, native-land exposure, and exact site/close proofs. Reject rather than relax a failed asset gate.
- Promote only accepted candidates to versioned art-source/public paths, declare them in the deterministic builder/manifest/model, render D06W03 on L4_0 at site/close and I22 on L4_4 at close only, and add invariant tests. Keep I17 and the train absent.
- Rerun the full world-to-close LoD sequence, close layer isolation, cold/warm initialization and steady-frame measurements, focused tests, typecheck, lint, production build, full single-concurrency suite, source/public hash checks, and `git diff --check`. Capture the final live D06 site/close comparison before committing and telling Steve the review URL is ready.

## Crash-safe checkpoint — 2026-08-21 05:04 CDT

### Interactive LoD and performance repair is live-proven

- The user-reported territory -> capital -> site -> close progression was a real runtime defect, not only an art complaint. The city, geology, and native-foliage cohorts were entering on tier boundaries as binary swaps; the same wheel event could decode the `38.8 MB` geology source, city nodes, and native foliage. Cold evidence before repair measured a roughly `113 ms` site long task / `133.6 ms` maximum frame and a `558-901 ms` close long task / `567-885 ms` maximum frame.
- Interactive site/close thresholds now follow the centralized world-detail policy (`site <= .10`, `close <= .075`, camera floor `.04`). Fixed proof cameras remain independent and force their requested tier. City art stays absent at world/territory; capital remains the parent context; registered district detail begins preloading before site and crossfades through the semantic `capitalToSite` / `siteToClose` weights instead of replacing the city in one frame.
- The authored geology sources now remain registered to one artboard and crossfade with the same semantic weights. Readiness stays true across registered capital/site/close source changes, preventing the redundant global `38.8 MB` land plate from remounting; an actual decode failure still drops readiness and restores the fallback. A shared retained image-decode cache predecodes geology, registered site/close nodes, water detail, and the predicted native-tree atlas cohort before they become visible.
- District parent exclusions now fade from the capital context while native L2 land appears underneath. Site and close node variants are temporarily co-mounted only during their transition and are opacity-complementary; they do not both remain fully visible. L4_1 grounding/integration, L4_0 support water detail, L4_4 fabric/architecture detail, and L4_6 native foliage use the same progress values. Fixed close proofs admit their registered native-tree cohorts even when the proof crop is wider than the interactive close threshold.
- Final cold DPR1 `1448x1086` interactive evidence is `.codex-tmp/city-lod-performance/final-progressive-profile-r3.json`. Assets begin decoding at zoom 7 (`6.09 MB`, max frame `16.9 ms`) and zoom 10 (`20.03 MB`, max frame `66.8 ms`) before the formal site tier. Zoom 10 records one `51 ms` long task; site activation is `50.1 ms` max with no long task; site -> close blend is `66.6 ms` max with no long task; close activation and steady close are `16.8-17.1 ms`, p95 approximately `16.8 ms`, zero new resources, and zero long tasks. This removes the demonstrated half-second-plus close stall. The zoom-10 long task and roughly `67 ms` preload/blend frames remain bounded residual costs, not perfect performance.

### Visual result, test policy, and remaining art debt

- The new zoom captures prove a continuous render progression: `zoom-10-capital.png` is a partial district reveal, `zoom-12-site.png` completes site detail, `zoom-13-site.png` blends toward close, and `zoom-14-close.png` resolves the close cohort. The large district no longer appears in a single binary frame. The layer inspector continues to show L2 land, L3 water, and L4 city as independent owners.
- The D03 art is **not yet a final cohesion pass**. At close, the surviving left-side parent city is softer and denser than the sharp native terrain/right-side atomic nodes; several nodes still read as placed assets and native trees can cross their foreground. The LoD mechanism no longer causes that mismatch, but the existing D03 city-owned contact/fabric and node art still need a separate, evidence-scoped polish pass. Do not hide it by restoring baked terrain/foliage or broadening the parent plate.
- Test classification followed the accepted policy. The initial raw `node --test` failure was environmental because the repository requires `--experimental-strip-types`. Old regexes that required detail to mount only after `tier === site/close`, and the geology assertion that explicitly prohibited semantic crossfade, were stale/superseded intent. They were replaced with invariants for semantic weights, preloading, complementary node opacity, district exclusion progress, exact land/water ownership, node ordering, native-tree reuse, and fixed-proof behavior. Asset/mask/hash/containment tests were retained unchanged.
- Verification is green: targeted architecture/structures/LoD/foundation/environment tests `86/86`; full single-concurrency repository suite `207/209` passed with two declared skips and zero failures; typecheck clean; lint clean; production build green with the existing non-fatal large-chunk advisory; `git diff --check` clean.
- Fixed close ownership inspection is also clean. D03 mounts only WFX01/LFX06/D03L02/D03L03 plus S09/S12/S08/S07; D05 mounts only WFX01/LFX06/D05L02/D05L03 plus S15/S10/S01/S18/S11. Both report site group opacity `0`, close group opacity `1`, zero procedural node shadows, and zero `/_review/` references. The duplicate asset IDs in DOM telemetry are the intentionally retained zero-opacity site group plus the visible close group, not visual layer bleed.

### Exact continuation

- Checkpoint only the tracked runtime/test/handoff files. Leave all obsolete untracked `_review` evidence copies unstaged.
- Keep the port-3000 development server alive. Present D03 close for user review because it exposes both the repaired progressive LoD and the remaining art-integration mismatch. Do not claim the overall city goal complete; this checkpoint repairs the LoD/performance mechanism, while D03 cohesion and the previously rejected D06 endpoint/civic-overlay lanes remain open.

## Crash-safe checkpoint — 2026-08-21 06:01 CDT

### D05 diagnosis is isolated; terrace-mass asset is still under gate

- The progressive LoD/preload/performance repair is committed as `c731df3 checkpoint: smooth NinjaOne city LoD and preload assets`. The tracked worktree was clean before this handoff; only the intentionally preserved untracked `_review` evidence assets remain. Port 3000 is still live.
- Fixed D05 close proof shows correct ownership but incomplete art integration. D05 mounts only its own L4_1 layers plus S15/S10/S01/S18/S11 and eight existing shared native-tree atlas instances. The city parent is removed progressively and native L2 land remains authoritative. There is no D03 node bleed, no generated foliage, and no need to add more trees.
- The remaining defect is specific: the five sharp close nodes terminate too cleanly against the steep diagonal native rock. Existing `D05L02` and `D05L03` are valid but cover only sparse contact lips and thin route lines; they cannot supply the missing rock-cut benches, retaining faces, steps, or downslope mass that make the sockets look embedded. The accepted master and old D05 plate both show that immediate terrace rhythm, but the old plate remains reference-only because it bakes buildings, terrain, and foliage together.
- High worker `/root/d05l04_terrace_mass` is producing one quarantined `1448x1086` transparent L4_1 overlay, `D05L04-western-skill-terrace-mass-r1-alpha`, beneath the five immutable nodes. It is restricted to immediate socket ROIs, registered D05 land, zero water/foliage/building/train coverage, 4-10% D05 footprint, and 3-5 connected terrace components. One of two ImageGen calls and one of two candidates are currently used.
- Candidate 1 is not frozen or accepted. It presently passes format, transparent corners, alpha cap, containment, land/water/foliage ownership, 9.69% coverage, alpha-gradient, pale-matte, four-component topology, minimum component size, per-socket proximity, and 18-60px downslope depth. Its sole remaining numeric failure is S01 contact width at 9.3% versus the locked 45-80% band. Exact site/close runtime proofs have not yet been built, so sticker-read improvement remains unverified.

### Exact continuation

- Wait for the worker's frozen result; do not relax S01 contact, use the second generation call without evidence, or promote an isolated candidate. Independently inspect the saved RGBA, alpha/corners, perspective, lighting, contact geometry, seams, and exact site/close before/after proofs.
- If and only if the asset materially reduces the sticker read, package a tight lossless runtime crop so a full-frame RGBA texture does not add roughly 6.3 MB decoded at site/close. Declare it through the deterministic builder/manifest/model, render after D05L03 and before D05 nodes, add ownership/order/LoD tests, and remeasure the progressive performance profile.
- Capture fixed D05 site/close plus the full interactive world-to-close sequence, verify the eight existing native-tree nodes and zero cross-district bleed, run focused/full gates, update this handoff, and checkpoint the coherent D05 unit. Reject the asset if runtime proof remains plate-like or merely replaces one sticker edge with another.

## Crash-safe checkpoint — 2026-08-21 06:51 CDT

### D05 terrace mass is production-integrated and review-ready

- The Director accepted High worker candidate 1 after saved-PNG and exact-order proof review. The tracked authoring asset is `D05L04-western-skill-terrace-mass-r1-alpha.png`, `1448x1086` RGBA, SHA-256 `b69771147295cfcde77a85d6b30514b71236e193e52d013cd5978646fc21836c`. It uses 9.995576% of D05, has four connected terrace/contact bodies, max alpha 218, transparent corners, and zero pixels outside D05, registered land, the five socket ROIs, or on registered water/native foliage.
- Runtime packages only the exact nontransparent crop `x=122..645`, `y=646..1009`: `524x364`, placement `[122,646]`, decoded size `762,944` bytes, SHA-256 `0715639fbe348cb60639037319a0813c8d77f2d4a53ca170ae92f6a5164e7359`. Independent raw-pixel comparison against the authoring extract reports zero differences. This avoids adding a roughly 6.3 MB full-frame decode at site/close.
- D05L04 is manifest-owned L4_1, site/close only, rendered after D05L02/D05L03 and before S15/S10/S01/S18/S11. It adds the missing rock-cut benches, retaining faces, and downslope mass without restoring the baked D05 plate, generating foliage, repainting L2 land, or touching L3 water. Live fixed site/close proof shows native terrain remains dominant and the five nodes no longer terminate as clean stickers against the diagonal slope.
- Close proof mounts the existing eight R4 native-conifer instances only; site mounts none. No new tree image was generated, no baked city foliage was restored, no D03 nodes appear in the D05 cohort, procedural shadows remain absent, and runtime reports zero `/_review/` references. The transient duplicate D05 node IDs are opacity-complementary site/close groups during crossfade, not visual bleed.
- The interactive D05 profile is `.codex-tmp/city-lod-performance/d05-final/interactive-r1.json`. Capital preload at zoom 7 mounts the D05 cohort plus D05L04 at `7,201,946` decoded bytes with a `16.9 ms` maximum frame. Zoom 10 preloads the close cohort at `20,175,873` decoded bytes and peaks at `50.1 ms` with no long task. Site is `50.0 ms`, site-to-close blend `33.4 ms`, and zoom 14-17 close is `16.8-16.9 ms` p95/max with no new resources or long tasks. D05L04 introduces no measured performance regression; this does not erase the separately documented whole-city startup debt.
- Test-policy classification: an initial focused failure was a real implementation regression caused by inserting D05 assertions into the D03 test block. Only the misplaced D05 lines were removed and re-anchored in the D05 block; no invariant was weakened. Final gates are green: focused foundation/LoD `45/45`; full repository `207/209` passed with two declared skips and zero failures; typecheck, lint, deterministic R3 builder, production build, source/public pixel/hash proof, and `git diff --check` all pass. The existing large-chunk build advisory remains non-fatal.

### Exact continuation

- Commit only the D05 authoring/runtime asset, deterministic builder/manifest/model/renderer contracts, D05 foundation/LoD tests, and this handoff. Leave every obsolete untracked `_review` file unstaged.
- Keep port 3000 alive and leave the fixed D05 close URL open for Steve. This is the review boundary for the D05 vertical slice, not completion of the whole city goal.
- After D05 review, continue the separate D03 cohesion pass and the rejected D06 endpoint/civic-overlay residuals. Do not reintroduce broad baked terrain/foliage plates, I17, or the train.

## Crash-safe checkpoint — 2026-08-21 07:21 CDT

### Objective and authority

- The active goal remains a cohesive node-based NinjaOne capital with progressive LoD, authoritative L2 land/L3 water, reversible city-owned sublayers, existing native tree assets, and no train. The fixed black page area outside the world viewport remains out of scope.
- Commit `5e7553a checkpoint: ground D05 with progressive terrace mass` is the latest accepted tracked checkpoint. The worktree is clean apart from intentionally preserved untracked `public/career-world/capitals/ninjaone/city-r3/_review/*` evidence files and this handoff update.

### Current D03 state and decisions

- Live D03 site/close inspection confirms the remaining defect is grounding mass, not LoD routing or missing city-tree nodes. `D03M02` removes the baked parent plate; D03 mounts `D03L02`, `D03L03`, S09/S08/S07/S12, shared whole-city support layers, and the existing native-tree reuse cohort. A corrected live query reports 20 unique `[data-environment-foliage-instance]` conifer nodes at close from the shared L2 foliage atlas; the earlier zero used a nonexistent selector.
- Existing `D03L02` and `D03L03` remain accepted but sparse. Their small pads/routes do not make the four sharp close nodes read as embedded in the softer native terrain or visually integrate with the correctly reused tree nodes. Do not restore the old baked D03 plate or invent additional tree nodes without source evidence.
- High ImageGen worker `/root/d03l04_retaining_mass` is producing `D03L04-eastern-industry-retaining-circulation-mass-r1-alpha` as a transparent L4_1 layer below the four immutable nodes. The locked output is 1448x1086 RGBA, restricted to D03 registered land and four socket ROIs, with zero water/foliage/foreign-node coverage and a 4-8% D03 footprint.
- Safe boundary: one of two successful ImageGen calls is used; zero candidate PNGs are accepted. The raw 1536x1024 RGB hardscape kit has usable isometric geometry/palette but baked pale checker and somewhat rock-heavy forms. It is not a candidate. Deterministic matte recovery, registration, authority clipping, alpha feather, saved-PNG validation, and exact site/close proof are still pending. No authority contradiction or tracked/runtime/public/art-source write exists.

### Verification and residual risk

- `git status --short` at 07:20 shows only the preserved untracked `_review` files before this handoff edit; `git log -3 --oneline` reports `5e7553a`, `c731df3`, `cd0ede8`.
- Port 3000 returned HTTP 200 at 07:21 and is intentionally retained for review.
- D05 remains green at its committed checkpoint: focused tests 45/45, full suite 207/209 with two declared skips, typecheck/lint/builder/build/diff checks green, and no measured D05 performance regression. No D03L04 gate has passed yet.
- The main residual risk is replacing one sticker edge with a broad generated plate. Reject D03L04 if native land stops dominating, alpha recovery leaves checker/halo, contacts miss any socket, or exact close proof remains asset-like.

### Open work and next action

- First, wait for the frozen D03L04 worker result and independently inspect its saved RGBA, dimensions/corners/hash, ownership masks, contact geometry, perspective/lighting, seams, and exact site/close comparisons. Do not promote a raw or isolated candidate.
- If D03L04 passes, package only its tight lossless crop, render after D03L03 and before S09/S08/S07/S12, add ownership/order/LoD tests, run the deterministic builder and focused/full gates, and profile zoom 10 through close for asset bleed and frame cost.
- After the D03 slice is checkpointed or rejected, reassess the separate D06 stream endpoint and civic-overlay residuals. Keep I17, I22, D06L02/D06W03, broad baked plates, and the train out unless new evidence satisfies their existing rejection gates.

## Crash-safe checkpoint — 2026-08-21 08:34 CDT

### D03 retaining mass and foliage/performance repair are integrated

- High worker candidate `D03L04-eastern-industry-retaining-circulation-mass-r1-alpha` was corrected after the worker's first proof omitted the neutralization half of the runtime tree composite. The frozen `1448x1086` RGBA authoring asset is SHA-256 `0f06fc17ea7c4291d440f0f0f54652ff33368d739c6334c4b0066cb59825bcc5`; its saved-PNG verifier passes 25/25 gates, selected-close-foliage overlap is zero, max H/V alpha delta is 40, and only three collided pixels plus one adjacent feather pixel changed from the superseded candidate.
- The deterministic builder packages D03L04 as a tight `367x266` runtime crop at `[847,521]`, after D03L03 and before S09/S12/S08/S07. The source/public extraction is lossless, the corrected builder run passes, and focused foundation/LoD tests pass 45/45 under the required `--experimental-strip-types` invocation. A raw `node --test` failure was an invocation/setup error because Node did not strip TypeScript; it was not a product regression or stale design assertion.
- Director live proof accepts a restrained D03 grounding balance with D03L02 opacity reduced from the prior dark pad treatment to `site=.12`, `close=.14`; native L2 terrain remains dominant while D03L04 supplies the deeper retaining mass. Fixed close has one close node cohort, 20 registered city-fallback tree instances, and zero `/_review/` asset bleed.
- Profiling proved the foliage/performance problem: interactive free camera simultaneously rendered the authoritative L2 tree cohort and the city L4_6 reuse cohort. Measured ID overlap was 15 duplicated IDs at zoom 10, 15 at zoom 12, 13 at zoom 14, and 8/8 city-visible IDs at steady close. This was a real runtime regression, not accepted LoD intent; it explained both the harsh/dark doubled trees and a foliage decode/mount spike.
- `WorldScene` now requests the city-native foliage fallback only for isolated city proofs or when authoritative L2_2 foliage is disabled. Normal free camera neither mounts nor preloads the duplicate L4_6 cohort; the fixed D03 close proof still renders all 20 registered fallback instances because its base proof cohort is intentionally empty. Live fixed proof reports one close node group, zero site node groups, zero city/base tree overlap, and zero `/_review/` bleed.
- Hidden zero-opacity site/close node groups no longer remain mounted, and close/geology/foliage preloads share a bounded decode queue with concurrency 2. The accepted cold profile is `.codex-tmp/city-lod-performance/d03-final/after-foliage-dedup-r1.json`. At zoom 10 it improves from `20,028,184` bytes / `66.7 ms` / 28 images to `15,960,471` bytes / `16.8 ms` / 19 images. Site-to-close blend remains bounded at `50.1 ms`; steady close is `16.9 ms` maximum, approximately `16.8 ms` p95, 17 images versus 24 before, and zero long tasks. Concurrency 1 was worse and remains rejected.
- Final gates are green: focused foundation/LoD tests `46/46`; full repository `208/210` passed with two declared skips and zero failures; typecheck, lint, deterministic R3 builder, production build, and `git diff --check` pass. The existing non-fatal large-chunk build advisory is unchanged. Test classification preserved the accepted policy: the foliage duplication was a real regression, the raw TypeScript test invocation failure was environmental/setup, and no accepted asset/hash/ownership invariant was weakened.

### Exact continuation

- Stage only the D03 authoring/runtime assets and relevant builder/model/renderer/performance/test/handoff files, then create the user-authorized checkpoint commit. Preserve every untracked `_review` file and all quarantined worker evidence.
- Keep port 3000 alive and leave the fixed D03 close proof open for review. This checkpoint repairs the demonstrated LoD/performance/tree-duplication defect and advances D03 cohesion; it does not complete the entire city.
- After the checkpoint, return to the separate D06 endpoint and civic-overlay residuals. Keep I17, I22, D06L02/D06W03, broad baked plates, and the train absent unless new evidence clears their existing rejection gates.

## Crash-safe checkpoint — 2026-08-21 09:07 CDT

### D03 is checkpointed; D06 station support is the active repair

- Commit `ac92640 checkpoint: integrate D03 and dedupe city foliage` is the accepted tracked baseline. Its full gates remain green: focused tests `46/46`, repository suite `208/210` with two declared skips and zero failures, typecheck, lint, deterministic builder, production build, and diff check. The port-3000 development server remains the review authority.
- A fresh fixed D06 audit reports the correct ownership and progressive cohort: site and close mount only `WFX01`, `LFX06`, `CFX01`, and train-free/open-undercroft `I21`; close additionally mounts six existing native-tree fallback instances. `I17` and `I22` remain rejected and absent, the train remains absent, and no `/_review/` path bleeds into runtime.
- The remaining in-scope D06 defect is not the out-of-viewport L3 stream terminal. The exact current `I21` placement is `[774.62,663.36]` at `563.76x422.64`, and its lower retaining/undercroft curtain still occupies too much of the native waterfall passage at both site and close. The protected upper halls, roofs, rails, deck, stairs, lamps, piers, and socket are visually correct; only the lower support alpha should shrink.
- xHigh worker `/root/i23_station_support_trim` is executing a locked two-candidate/two-generation maximum for `I23-station-site-close-water-safe-support-r1-alpha`. Output is quarantine-only. The edit is alpha-only inside two exact source-coordinate polygons, forbids alpha expansion, requires byte-identical RGBA outside the ROI and byte-identical retained RGB, protects all upper/deck/rail architecture, targets a 12-28% support-alpha reduction and at least an 8% reduction in registered hard-water overlap, and must visibly widen the native waterfall passage without floating the station or exposing a seam.
- The worker has not returned a candidate yet. No tracked/runtime/art-source asset has been changed for D06. Director acceptance still requires independent saved-PNG, alpha, ROI, protected-feature, water-overlap, exact placement, site/close, LoD, and performance proof. Failed gates will not be relaxed.
- `git status --short` at this checkpoint contains only the intentionally preserved untracked `_review` evidence assets plus an untracked `pnpm-lock.yaml`; the lockfile was not created or modified by the current D06 lane and will remain unstaged unless separately justified.

### Exact continuation

- Wait for the frozen I23 worker result. Reject it if it changes retained RGB, expands alpha, alters protected station geometry, leaves the waterfall passage materially unchanged, floats the platform, or introduces matte/checker/seam residue.
- If and only if I23 passes, promote a byte-exact versioned authoring asset and deterministic tight runtime crop, replace I21 only at site/close while preserving its socket, add manifest/model/builder/render-order and station-progression tests, and capture fresh fixed D06 site/close proofs.
- Rerun the full world -> territory -> capital -> site -> close truth sequence, close-layer isolation, resource/decoded-byte and frame-time profile, review-path bleed checks, focused and repository gate stacks, then checkpoint the D06 unit. Do not reintroduce I17, I22, the rejected endpoint overlays, broad baked terrain/foliage, or the train.

## Crash-safe checkpoint — 2026-08-21 09:45 CDT

### I23 is rejected; the D06 hypothesis has changed

- The alpha-only `I23-station-site-close-water-safe-support-r1-alpha` lane is complete and NO-GO. Candidate A reduced the lower-support footprint 16.7619% but registered hard-water overlap only `1758 -> 1702` (3.1854%). Candidate B reduced the footprint 23.8722% and overlap `1758 -> 1617` (8.0205%), while preserving exact dimensions/RGBA, transparent corners, zero outside-ROI diff, zero alpha expansion, zero retained-RGB diff, zero protected-feature diff, and zero new water overlap.
- Candidate B passed its numeric overlap threshold but failed the binding exact site/close visual gate: the broad lower masonry curtain and waterfall pinch remained essentially unchanged. Earlier versions also exposed rectangular/checker-like alpha bites rather than coherent arch interiors. The Director rejected both. Two ImageGen guidance calls were also rejected (full-scene checker/redraw and an unregistered white viaduct on black matte); no generated pixels survived and nothing was promoted.
- This failure invalidates the prior assumption that the defect can be repaired by selectively lowering I21 alpha. The remaining defect is the support geometry itself. Continuing to threshold the same wall would only optimize metrics or float the platform.

### Active materially different I24 lane

- Fresh xHigh worker `/root/i24_station_undercroft_redesign` owns a new quarantined asset identity: `I24-station-cliff-registered-undercroft-r1-alpha`, still L4_2 at D06 site/close and still at the locked I21 socket `[1056.5,1086]`, base size `[783,587]`, scale `.72`.
- The upper station, halls/roofs, rear civic architecture, rails/track centerlines/endpoints, platform top/deck, stairs, people, lamps, balustrades, kiosks, rail nose, upper arch rings, deck attachment, and D06 rail mask are immutable. Outside the two lower-support polygons, RGBA must remain byte-identical; alpha expansion remains forbidden.
- Unlike I23, I24 may redraw RGB and reduce alpha inside the lower-support ROI only. The target is a narrower cliff-registered undercroft with coherent curved openings and continuous slim pier cores, showing authoritative native L2/L3 through the supports without painting new terrain or water.
- Rejection thresholds are deliberately material: 25-45% lower-support footprint reduction; registered hard-water overlap `<=1350` from baseline `1758`; at least 20 rendered pixels of continuous passage gain at the tight affected waterfall span; at least four coherent curved openings; continuous deck attachment and grounded pier contact; no rectangular bites, speckle, floating slab, seam, checker/matte, or subtle exact-proof result. Maximum remains two successful ImageGen calls and two candidate identities; worker cannot promote or edit production.

### Exact continuation

- Wait for I24 safe-boundary/final evidence, then independently inspect saved pixels and exact runtime proofs. Reject any candidate that merely passes overlap metrics or changes the protected station.
- If I24 passes, promote a byte-exact versioned source and a deterministic tight runtime asset, replace I21 only for site/close, preserve the socket/LoD order, add feature/ownership/hash/placement/water-passage tests, and verify runtime at fixed site/close before profiling.
- If I24 also returns NO-GO, stop asset regeneration for this defect and reassess station representation/scale or a split deck-plus-support node architecture from current accepted components. Do not repeat the same mask/redraw approach.

## Crash-safe checkpoint — 2026-08-21 10:15 CDT

### I24 passed independent live review and is being integrated

- The original I24 total-overlap gate was corrected before generation because it was mathematically impossible inside the locked edit polygons: even deleting every editable alpha pixel could only move total registered-water overlap from `1758` to `1557`, not `<=1350`. The binding gate was narrowed to the actual editable lower-support/water intersection (`201` pixels), requiring at least 75% removal, unchanged non-target overlap, zero new overlap, and a visibly wider continuous passage. This is an authority correction, not a relaxed visual acceptance gate.
- xHigh worker candidate A was rejected for detached/speckled masonry. Candidate B is frozen at SHA-256 `7344259d23a979bc697073c71fde2cb94eaa6fa60da9b10dfd3604780ad9ad85`, `1448x1086` RGBA with transparent corners. It reduces editable lower-support coverage 28.9035%, clears targetable water `201 -> 28` (86.0697%), adds at least 30 rendered pixels of continuous passage, preserves all RGBA outside the two redesign polygons, does not expand alpha, preserves retained RGB and the rail mask, and creates no new water overlap.
- Director verification independently reproduced exact dimensions/hash, zero outside-ROI diff, zero alpha expansion, zero retained-RGB diff, zero rail-mask diff, zero new water overlap, and total opaque registered-water overlap `1758 -> 1585`. A reversible file-level live test replaced I21 only long enough to reload fixed D06 site/close, capture evidence, and then restored I21 byte-for-byte to SHA `58ad954173f51d210f4696aed7c05f26258941f1b5d1098e3ddeff38518cdb70`.
- The live gate passed: I24 materially opens the waterfall-side undercroft at both site and close, preserves the station deck/rails/upper architecture, retains grounded cliff contact, and lets native L2/L3 show through without a floating platform. Live evidence is in `.codex-tmp/city-restart-r1/director-audit/I24/live-swap/i24-live-{site,close}.png`.
- The exact reviewed binary has been copied to versioned authoring/runtime paths but is not yet checkpointed. The deterministic builder, runtime manifest/model, D06 renderer, and station invariant test now route site/close through I24; I21 remains only as a comparison authority and cannot mount. The updated test preserves placement, zero alpha expansion, exact outside-ROI/rail/retained-RGB invariants, material support removal, and opaque registered-water overlap `<=1600`.
- Deterministic R3 rebuild and the focused station test pass. Full typecheck/lint/foundation/LoD/repository/build/performance/bleed gates and final fixed proof are still pending, so the D06 unit is not complete or committed.

### Exact continuation

- Run the full gate stack and classify any new red test under the accepted test policy; do not delete or skip a prior invariant. Then reload the actual I24 runtime path and capture fixed D06 site/close plus the full territory-to-close truth sequence.
- Profile decoded bytes, mounted image count, frame time, and close `/_review/` bleed. I24 is a full-frame texture and must not be accepted if it creates a material regression; package a lossless tight crop only if measurement justifies changing the placement contract.
- If all gates and runtime proofs remain green, stage only the versioned I24 authoring/runtime binary, deterministic builder/manifest/model/renderer/test changes, and this handoff. Preserve all `_review` files unstaged, checkpoint the D06 unit, keep port 3000 live, and present the fixed review URL without claiming the whole-city goal complete until the final requirement audit passes.

## Crash-safe checkpoint — 2026-08-21 11:06 CDT

### D06 I24 is green; the audit stops further local repair

- The exact I24 authoring/runtime binaries are byte-identical at SHA-256 `7344259d23a979bc697073c71fde2cb94eaa6fa60da9b10dfd3604780ad9ad85`. The deterministic manifest declares `I24` as L4_2 site/close at the unchanged `[1056.5,1086]`, `[783,587]`, `.72` socket. I21 remains in public only as the immutable comparison authority and is absent from the runtime contract and renderer.
- Gates are green: deterministic R3 builder; station test; focused foundation/LoD `46/46`; full repository `208/210` with two declared skips and zero failures; typecheck; lint; production build; and `git diff --check`. The only build advisory is the pre-existing large-chunk warning. Test-policy classification: the prior exact I21 alpha-reduction assertion was stale/superseded intent; it was replaced with stronger I24 ownership/geometry invariants rather than removed. No passing unrelated test was weakened.
- Fixed proof truth is exact. `world` and `territory` mount no city assets. `capital` mounts only `LFX06` and train-free `I20`. D06 site mounts `WFX01`, `LFX06`, `CFX01`, and `I24`. D06 close mounts the same four plus six existing native-tree fallback instances because fixed city proofs intentionally omit the authoritative L2 tree cohort. I17, I21, the train, and every `/_review/` path are absent at runtime.
- Interactive free-camera D06 site/close also mounts exactly `WFX01`, `LFX06`, `CFX01`, and `I24`, with I21/I17 absent and zero review-path bleed. It mounts zero L4_6 fallback trees because the authoritative L2 foliage layer is active. Steady D06 site/close measures approximately `16.9-17.0 ms` maximum frame time with no long task after resources are warm.
- Performance is not globally accepted. The four D06 full-frame RGBA assets each decode to `6,290,112` bytes, totaling `25,160,448` decoded bytes before terrain/water/foliage. I24 does not regress this relative to the same-size I21 and its encoded file is smaller (`1,595,094` bytes), but the D06 cohort is still materially over-heavy. The interactive capital-to-site sweep also reproduced a one-time `170 ms` long task / `183.6 ms` maximum frame while preload nodes entered, followed by a D03 site transition of `13,297,956` newly decoded bytes and `33.5 ms` maximum frame. The later D06 site/close steps were smooth because their resources were already warm; this is evidence of unresolved preload/decode cost, not a clean whole-city performance pass.
- Visual LoD truth is improved but not complete. World/territory correctly hide the city; capital presents the cohesive parent composition and I20; capital-to-site materially promotes I24. Site-to-close currently scales the same I24 station and adds fixed-proof native trees only. There is no accepted close architectural overlay because I17 and I22 failed foliage/alpha/registration gates. That remaining gap requires a deliberately authored D06 close representation, not another alpha mask or opportunistic detail layer.
- Evidence is under `.codex-tmp/city-restart-r1/director-audit/I24/`: fixed `world`, `territory`, `capital`, `d06-site`, and `d06-close` captures; actual I24 site/close captures; interactive close; independent verifier; and the reversible live-swap proof. The audit verdict is therefore **checkpoint I24, but do not declare the city goal complete**.

### Exact continuation

- Commit this green I24 unit only. Preserve all untracked `_review` assets and all quarantined evidence. Leave the fixed D06 close URL open on port 3000 for Steve.
- Do not start more ImageGen or local district repair from this checkpoint. The next decision is a bounded two-part slice: (1) package WFX01/LFX06/CFX01/I24 as lossless tight crops and reprofile cold capital-to-close; (2) author one true D06 close architectural representation under a new exact asset contract, or explicitly accept I24 as the terminal station detail. That decision belongs after review, not inside the current audit.
- After that bounded slice, run one final requirement-by-requirement whole-city audit against the master. The remaining city-wide visual gap should be recorded as source reauthoring if close cohorts still merely scale existing art; do not hide it with more overlays or claim concept parity without live evidence.

## Crash-safe checkpoint — 2026-08-21 12:23 CDT

### V2 T1 grammar candidate is ready for director review

- Closed-lane crop packaging was verified and committed separately as `ca6ebde`; no further I-series/LFX/CFX/D01-D06 repair work was opened.
- T1 adds deterministic `scripts/build-ninjaone-city-grammar-r1.mjs` and `public/career-world/capitals/ninjaone/city-v2/grammar/ninjaone-city-grammar-r1.json`; runtime, L1-L3, camera, and LoD files are unchanged.
- Mechanical output: one connected 31-edge road/stairs/bridge graph, 45 mask-contained building footprints in four size classes, a 12x9 density map, 18 terrace bands, and five material palette families.
- Debug evidence is `.codex-tmp/qa/T1/ninjaone-city-grammar-r1-{graph,footprints}.png`; both are 1448x1086 RGBA overlays. `npm run check:ninjaone-city-grammar` reproduces JSON and PNGs byte-for-byte.
- Visual fidelity is unclaimed and awaits director overlay review in `QA-REVIEW.md`. Do not begin T2 before that review; after T1 passes review, the desktop lane retires in favor of director-dispatched headless runs.

## Crash-safe checkpoint — 2026-08-21 T3c-r3

- Rebuilt D05 composer proof without altering L1–L3: registered L2 terrain r6 detail crop plus the registered L3 water mask/surface replaces the baked-master underlay.
- Occupancy priority named > large > standard > compact rejects overlap above 15% of candidate bounds: 8/32 buildings survive; 20 props have zero overlap with surviving building bounds.
- The r2 pink/red region was the registered red-brick S10 sprite visually doubled against the baked master; r3 has one full-opacity S10 on the clean underlay. Low-alpha magenta edge residue is also suppressed.
- Evidence: `.codex-tmp/qa/T3/t3c-r3/{d05-composed-graded-r3,d05-composed-capital-scale-r3,d05-composed-vs-master-r3,d05-composed-over-clean-terrain-r3}.png` and `d05-placements-r3.json`.
- Bundled-Node build/check and scoped ESLint pass; no commit, runtime, camera, LoD, or frozen-layer change.
- Next action: director reviews the clean-terrain proof and decides whether the 3/5 named-anchor occupancy conflict requires grammar/layout revision before a final candidate.

## Crash-safe checkpoint — 2026-08-21 T3c-r4b

- Composer emits only `.codex-tmp/qa/T3/t3c-r4b/` evidence: five PNG proofs plus `d05-placements-r4b.json`; no runtime, frozen-layer, kit, ImageGen, or commit change.
- Current source already uses Sharp destination-space `resize`; the reported source-row rounded-destination loop is not present in this checkout.
- Replaced r4's existence-only opaque-pixel assertion with a per-placed-building mapped-opaque-source solidity gate of >=0.98; all 19 pass, named S18/S01/S15/S10/S11 are 0.999912/0.999909/0.999910/0.999857/0.999899.
- Bundled Node syntax/build/check and `git diff --check` pass. Next action: director visually reviews r4b proofs, including S10, against the scanline report; visual conformity remains unverified.

## Crash-safe checkpoint — 2026-08-24 T8a2 skill-sprite continuation

- Quarantine-only continuation used 4/4 ImageGen calls (3 scheduled + 1 reserve); 12 total across T8a/T8a2. No generated pixel was repaired.
- S10-B is the only new valid selection: Section 7 `0` matte px, F12 `0` clusters, F16 `625850/625850`, no visible plume/effect, limiting scale `6.0936 px/master`.
- S11-C preserves identity and has no plume but is discarded for exactly `1` visible matte pixel; F12/F16 otherwise pass.
- S18-D is an octagonal-wheel F17 discard; reserve S18-E remains many-segmented rather than a simple hexagon and is also discarded before processing. Budget exhausted.
- Aggregate remains `3/5`: S01-A, S10-B, S15-A pass mechanical gates; S11 and S18 remain blocked. S15 elaboration remains owner-review-only.
- Proof: `.codex-tmp/quarantine/city-v2/T8a-skill-sprites/comparisons/skill-sprites-contact-sheet-r1.png`; exact records/discards/hue evidence are in `proof-manifest.json` and `REPORT.md`.
- Next action: director reviews S10-B visually; any further S11/S18 generation requires new authorization.

## Crash-safe checkpoint — 2026-08-24 T8a3 skill-sprites final

- Uniform selected-run chroma key now uses Manhattan connected-fringe radius `2` (`+1` from prior default), recorded in every provenance record; no generated pixels were repaired.
- Unchanged raw S11-C passes Section 7 `0` matte px, F12 `0` clusters, and F16 `750026/750026`; crane lines and whale counterweight cable remain continuous.
- S18-F used the one scheduled corrective call; reserve unused. First-gate read: one left-flank wheel, exactly six straight outer rim segments and six vertices, on a long low asymmetric rustic working mill.
- S18-F passes Section 7 `0` matte px, F12 `0` clusters, F16 `535320/535320`, no visible plume, and limiting scale `4.7703 px/master`.
- Aggregate mechanical status is `5/5`; visual selection remains for director/owner review, and S15's prior elaboration flag remains open.
- Proof: `.codex-tmp/qa/T8a3/skill-sprites-contact-sheet-r1.png`; exact prompts, hashes, gates, and 13-call history are in the T8a quarantine `REPORT.md` / `proof-manifest.json`.
- No promotion, runtime, `public/`, frozen-layer, camera, LoD, or commit change; next action is director/owner visual review of the five final quarantine selections.

## Crash-safe checkpoint — 2026-08-24 T8a4 S18 reference-authority regeneration

- Owner-rejected S18-F was not repaired; both fresh calls used the registered S18 plate crop as the sole image authority.
- S18-G passed materials/massing/wheel prominence but was discarded before processing for an eight-segment outer wheel boundary.
- Reserve S18-H restores the stone-dominant grey masonry, slate/glass working halls, limited timber accents, and plate-prominent flank wheel; its outer rim has six straight segments and six vertices.
- H passes Section 7 `0` matte px, F12 `0` clusters, F16 `615636/615636` with `0` oscillation, no visible effect, and limiting scale `5.8062 px/master`.
- Budget exhausted at `2/2`; no repair, promotion, runtime, `public/`, frozen-layer, camera, LoD, or commit change.
- Proof: `.codex-tmp/qa/T8a4-s18/skill-sprites-contact-sheet-r1.png`; exact prompts, hashes, attempts, and 15-call history are in the T8a quarantine `REPORT.md` / `proof-manifest.json`.
- Next action: director/owner visual review of S18-H; worker mechanical pass is not visual acceptance.

## Crash-safe checkpoint — 2026-08-24 T8a5 S18 Node final

- Owner-directed round-wheel/Node-hub final used the plate crop as complete authority; animation provenance records “the wheel is the event loop — it turns forever.”
- S18-I passed reference/material/massing, round-rim/hex-hub/confined-green, and automated radius-2/F12/F16/effect/scale metrics.
- Direct keyed-output inspection exposed saturated magenta fringe slivers inside I's wheel assembly; I was discarded without repair and retained only as invalid quarantine evidence.
- Reserve S18-J failed gate 1 before processing: monumental castle/tower drift, centered-showpiece wheel, and loss of the long low asymmetric mill-hall massing.
- Budget exhausted at `2/2`; `proof-manifest.json` status is `failed`; no valid final S18 sprite was produced.
- Proof: `.codex-tmp/qa/T8a5-s18/skill-sprites-contact-sheet-r1.png`; exact prompts, hashes, attempts, and 17-call history are in the T8a quarantine `REPORT.md` / `proof-manifest.json`.
- No repair, promotion, runtime, `public/`, frozen-layer, camera, LoD, or commit change.
- Next action: owner/director must authorize another bounded generation packet or a pipeline reframe.

## Crash-safe checkpoint — 2026-08-24 T8a6 enclosed-chroma-key

- BLOCKED: two uniform v3 enclosure predicates changed protected S01/S11/S15 outputs; both were rejected and v2 PNG hashes restored exactly.
- The component reframe still left visible magenta wheel-spoke slivers in I at 2x; Section 7/F12/F16/scale are false-negative for this defect.
- Proof: `.codex-tmp/quarantine/city-v2/T8a-skill-sprites/comparisons/s18-i-wheel-assembly-v3-2x.png`; raw I remains untouched.
- No v3 promotion, repair, ImageGen, runtime, `public/`, frozen-layer, camera, LoD, or commit change.
- Next action: new bounded S18 generation budget; no third deterministic-key tuning without director reframe.

## Crash-safe checkpoint — 2026-08-26 T13d chroma restitch

- T13d rebuilt quarantine canon r4 from the same nine banked tiles: 40px detail/luma smoothstep plus uniform 240px YCbCr chroma smoothstep across all 12 internal seams; five despilled sprites recomposited and tiers re-derived.
- Full suite PASS: all seams <=6% (max L 3.1731%, S 5.2608%); circulation 7+16/16; ghosts 3/3; seating 16/16; vegetation 9/9; S15/four-hero fringes; coast 879/887 = 99.0981%.
- T13c canon and both tiers remain byte-identical `-t13c-40px` backups; active r4 remains quarantined, not mounted.
- Evidence: `.codex-tmp/qa/T13/full-canon-preview.png`, `border-strips-all-internal.png`, and `tile-03-tile-04-chroma-wide-before-after-2x.png`; ledgers at `.codex-tmp/quarantine/city-v2/T13-canon-r4/`.
- No ImageGen, runtime, public, frozen layer, camera, LoD, test, commit, or mounted-canon change.
- Next action: director review of the refreshed owner package before any promotion/mount authorization.

## Crash-safe checkpoint — 2026-08-27 T27d frequency-separated ocean r4

- Offline sigma-28 low/residual pairs reconstruct r2 water within one 8-bit code value; runtime grades low only and re-adds the residual before near-tier gain.
- Default broad relight/trough bands measure -69.244 px/s in the 8-frame CPU mirror; residual edge floor 1.2313, stamps 1.1092, tonal distance to city water 5.8537 -> 3.5629.
- Evidence and deterministic reports: `.codex-tmp/qa/T27/r4/`; backup SHA ledger: `.codex-tmp/backups/T27d-ocean-painted-style-r4-delta-2026-08-27/`.
- Bundled-node typecheck, scoped lint, 40 focused tests, deterministic checks, and direct Vinext build pass; host has no live GL proof.
- Next action: director live-verifies default/extreme dials, streaming, reduced motion, and <=2/6ms before owner review; no commit.

## Crash-safe checkpoint — 2026-08-27 T30 overlay removal and tier calm

- Backup-first T30 makes `city-water.opacity` default zero; full-canon alpha now separates painted carrier from SDF-limited shore-crash effects.
- World/territory field weights are `.18/.32`; speed is `.012/.035`, with higher far-field frequency. Capital/site formulas remain r4 inputs.
- CPU 2s visible-change: world `0`, territory `.0056`, capital `.9385`, site `.8297`; block scan found zero long axis-aligned runs at opacity `.5`.
- Evidence: `.codex-tmp/qa/T30/`; deterministic check `verify-t30-overlay-removal-and-tier-calm.mjs --check` passes; backup SHA ledger under `.codex-tmp/backups/T30-overlay-removal-and-tier-calm-2026-08-27/`.
- Typecheck, scoped lint, 46 focused tests, r4/r6b checks, and build pass; full lint only has 2 pre-existing grammar warnings; known mutable-ocean full-suite failures persist.
- Next action: director live-verifies ready/not-fallback, all tiers, opacity 0/.5/1 coast crops, streaming, reduced motion, and <=2/6ms; browser permission prevented worker live capture. No commit.

## Crash-safe checkpoint — 2026-08-27 T31b bounded chaos

- Backup-first ocean runtime trial adds residual-coordinate march, seeded regional gusts, direction/speed/phase variation, competing swells, and clamped rare crest events; world/territory chaos remains zero.
- Evidence `.codex-tmp/qa/T31/b/`: city-variance ratio `.4671 -> .9085`, residual edge `1.0562 >= .995`, spectral-flatness `1.70x` T31, cross-region correlation `.0546`, deterministic event schedule, and tracked march `5.784–6.107px/s`.
- Deterministic T31b/T31/T30/T27d/r6b checks, focused `15/15`, bundled typecheck/scoped lint, and Vinext build pass; full suite `215` pass / two known dirty-ocean hash failures.
- No ImageGen, commit, public/canon, city, frozen-layer, camera, or LoD change. Next action: director live review at owner zoom, including the explicit tame/regular question and `<=2/6ms` check.

## Crash-safe checkpoint — 2026-08-27 T33c streak source and loop

- Backup `.codex-tmp/backups/T33c-streak-source-2026-08-27/`; source fix keeps r4 material and residual march registered in world UVs, removing zoom-time scale/fract retiling.
- World/reference r2 and r4 low/residual source pairs are byte-identical; mips already use `generateMipmap` + trilinear minification. The live source is treatment alignment, not a reference-only PNG or missing mips.
- Controller ignores equivalent camera/detail publications and applies a 30fps cadence, eliminating the rAF cancel/settle loop starvation path.
- Evidence `.codex-tmp/qa/T33/c/`: 16-cell isolation matrix, scan report, and `owner-sheet-1200.png`; deterministic gates T27d-T33 plus r5/r6/r6b pass, focused water/uniform 15/15, typecheck/lint/build pass.
- Open risk: localhost browser permission blocked the mandatory clean-load and territory-return >=30s timing sets and human GL streak check; full suite still fails the two pre-existing dirty-ocean hash/checkpoint tests. No commit.
- Next action: director executes the stated steady-state protocol; require `frameIntervalP95Ms` 26.67-40ms and inspect both source paths before releasing owner flyovers.

## Crash-safe checkpoint - 2026-08-27 T36 boundary painting

- T35's reported x=1056.5 boundary was D06's internal tile seam; the real masked district join is `[665,781.521631029339,691,1086]`.
- Full-length census: three spans, all one contiguous complex gorge/cliff/forest site; no clean simple/water span and no transport crossing.
- One built-in ImageGen call banked (`1/8`); deterministic strip `[585,781.521631029339,780,1086]` mounted into both canon pyramids.
- D05/D06 close changed `117,582/135,738` pixels; outside strip, protected structures, and classified water all changed `0` pixels.
- D05/D06 usable masks re-derived for opaque painted ownership; D05 foliage shimmer locally re-derived; water classifiers unchanged.
- Shared border maximums: luminance `0.0724%`, saturation `0.1761%`; deterministic T36 and dual-composer checks pass.
- Evidence `.codex-tmp/qa/T36/`; lineage `.codex-tmp/quarantine/city-v2/T36-boundary-painting/`.
- Focused tests are baseline `60/61` (unchanged concurrent ocean `u_siteLod` failure); typecheck/scoped lint and Vinext build pass; no commit.
- Director passed all three full-res segments; owner then flagged cross-boundary crane ambiguity. T37 is separately dispatched to remove the D06 station crane; T36 itself remains uncommitted.

## Crash-safe checkpoint - 2026-08-27 T37 station crane removal

- Owner ruled the D06 station crane removed; D05's accepted crane and hanging ball remain byte-identical.
- One built-in ImageGen call banked (`1/3`); silhouette-bounded close change is `[71,72,331,441]`, `82,971` pixels, with `0` changes outside the recorded site.
- Census updated `18 -> 16`: `TOWER-01` and `FABRIC-10` are `OWNER-RULED`, not gate failures; registration/provenance hashes agree.
- Close/site/capital re-derived; usable and painted-water masks re-derived with `0` changed samples; route and six static sprites are byte-identical.
- Patch-border maxima are luminance `0.0317%`, saturation `0.0404%`; T37 `--check` and dual-composer pass.
- Evidence `.codex-tmp/qa/T37/`; lineage `.codex-tmp/quarantine/city-v2/T37-remove-station-crane/`; no commit.
- Focused tests remain baseline `60/61` on the concurrent ocean-only `u_siteLod` failure; typecheck and lint (`0` errors, two unchanged warnings) pass.
- Next: director reviews the full T36 join and T37 owner sheet, then Steve decides the visual verdict.

## Crash-safe checkpoint - 2026-08-27 T40 terrain transition interim

- Owner guard interim only: full terrain pass or capital-apron extension remains an OPEN OWNER DECISION.
- r8 runtime geology stays byte-identical; sparse per-tier overlays plus a 176px contact mask provide the reversible edge treatment.
- River exit uses one ImageGen call and resolves into a rocky gorge/sink; bottom-blue samples `5,454 -> 1`.
- Exact support mask proves `0` r8->r9 RGB changes outside scope and identical source alpha; patch borders `0% <=6%`.
- Close overlay is `2,666,930` bytes versus unchanged `8,505,426`-byte base; edge ImageGen spend `0/2`.
- Evidence `.codex-tmp/qa/T40/`; lineage `.codex-tmp/quarantine/terrain/T40-terrain-transition-interim/`.
- T40 `--check`, D05 + isolated D06 composers, typecheck, focused `16/16`, lint, and build pass; live browser proof blocked by local-access denial.
- Concurrent T42 temporarily mutated the D06 masks, then restored usable `de2cfd...` and painted-water `55fb4d...`; T40 writes neither and the final dual composer passes.
- No commit. Next: director live owner-zoom boundary review, then Steve decides interim-only versus capital apron.

## Crash-safe checkpoint - 2026-08-27 T44 D03 north-district concepts

- Grammar resolves the north-of-D06 socket as D03 Eastern Industry: 483 touching boundary pixels; D01/D02 are 260/340px away.
- Four quarantine concepts are ready with no selection: A foundry terraces, B powerworks, C guild arcades, D industrial conservatory.
- Full-rulebook terrain defenses and same-frame D06 context are recorded in `.codex-tmp/qa/T44/OWNER-REVIEW.md` and `candidate-gates.json`.
- Strict final masks report 0 outside-D03 changes and 0 registered-water changes for all four; no D03 rail, mover, or cross-join reaching object was retained.
- ImageGen spend is 5/5: four scheduled calls plus one targeted C boundary retry; measured ledger `.codex-tmp/qa/T44/measured-run-ledger.json`.
- Review evidence: four <=1200px owner sheets, four terrain overlays, and `adjacency-sheet-d03-with-d06.png`; owner locks the winner.
- Quarantine only: no public/runtime/mounted/frozen-layer/camera/LoD/ocean change. This worker made no commit; concurrent checkpoint `a401340` captured only the QA record after the lane. Plate/tile/mount work remains queued behind the river lane and owner lock.

## Crash-safe checkpoint - 2026-08-27 T42b layered river

- T42 option 2 is mounted: deterministic terrain-with-river base plus byte-exact station/viaduct overlay with binary true-arch apertures.
- Registered outputs: `public/.../city-v2/canon/d06-canon-terrain-base-r10.png` and `public/.../city-v2/overlays/d06-station-viaduct-overlay-{r10,mask-r10,registration-r10}`.
- T41/r8 owns the course through the arches; the final south stretch crossfades to T40/r9's narrowing gorge/sink.
- Composite gates: `0` overlay-owned byte changes, `0` unauthorized deltas, `2,941` water-through-aperture pixels, route/six statics byte-identical.
- F03 candidate mounted only in terrain-owned pixels; F08 reopens `510` detailed-north samples and leaves `0` ghost-risk samples.
- Evidence `.codex-tmp/qa/T42b/`; owner sheet <=1200px; Chrome and Edge CDP both closed before navigation, so live proof is unverified.
- T42b `--check`, isolated/dual composers, typecheck, lint, focused `48/48`, and build pass; full suite `222/226` with two known dirty-ocean failures and two skips.
- Historical T39/T40 content-hash checks reject the intentional successor D06 bytes; T42b check + dual composer are the current-state gates.
- ImageGen `0/8`; no commit; no L1-L3 authority, camera, LoD, ocean-runtime, D05, route, or static edit.
- Next: director reviews T42b evidence, then Steve gives the visual verdict before any commit.

## Crash-safe checkpoint - 2026-08-27 T42c course-restoration block

- Backup-first T42c candidate was mechanically built from the exact T41 pre-D06 composite; ImageGen `0/2`.
- Binding owner-zoom three-way sheet `.codex-tmp/qa/T42/c/owner-zoom-baseline-t42b-t42c-sheet.png` FAILS: course is still not traceable from north entry to T40 exit.
- Candidate mechanics: overlay opaque changes `0`; restored core `7,947`; newly visible-water mask samples `535`; north-entry crop exposed source-mask misclassification.
- Candidate was rejected and every mounted D06 derivative restored byte-identically to T42b, including terrain base, close/site/capital, masks, registrations/provenance, and overlay bytes/mask.
- Evidence `.codex-tmp/qa/T42/c/`; backup and candidate builder `.codex-tmp/quarantine/city-v2/T42c-course-restoration/` and `scripts/build-t42c-course-restoration.mjs`.
- T42b `--check` and dual composer remain current-state gates; no commit or frozen-layer/runtime/D05/route/static change.
- Next: director supplies/reviews a native, human-legible baseline course-support mask; only then one deterministic restore under unchanged overlay ownership.

## Crash-safe checkpoint - 2026-08-28 T47 city ocean removal candidate

- Quarantine-only, backup-first D05 aperture candidate; no mounted/public/runtime/ocean/D06/camera/LoD write and no commit.
- r5 water-safe mask `b1cf1c6a...46776fe`: unique west-edge open-ocean component `204,465` px `[0,0,453,1205]`; retained lake/inland `5,875` px.
- r4 usable-mask feather authority retained unchanged: `b2ef8399...f2bbce`; candidate changes alpha only, no RGB bytes.
- Candidate hashes close/site/capital: `fd5f8baf...196d62` / `b138ad68...47484c` / `b812fb4a...665693`; full audit `.codex-tmp/qa/T47/hash-audit.json`.
- Evidence: `.codex-tmp/qa/T47/d05-west-coast-before-after-owner-sheet.png` (registered-art proxy; ocean visible through the aperture, shore material retained).
- Builder + `--check` and bundled-node typecheck pass. Focused run: 59 pass, one planned dirty-ocean `u_siteLod` assertion failure; no T47-owned red gate.
- Next: director inspects candidate bytes/sheet at owner coast framing; any promotion remains a separate serialized mount lane.

## Crash-safe checkpoint - 2026-08-28 T47b blue pass candidate

- Quarantined r2 uses r1-derived blue statistics in a 36px selection band (39px including the 3px alpha feather); RGB remains byte-identical and only the edge ring is fractional.
- Residual/out-of-band/inland scans are zero; blue non-water alpha changes are zero. Ocean and L1-off-black owner sheets: `.codex-tmp/qa/T47/b/`.
- Builder, check, candidate tiers/masks/provenance/registration, and hash audit: `.codex-tmp/quarantine/city-v2/T47b-blue-pass/`; no mounted/public/runtime/ocean/D06/transition writes or commit.
- Gates: deterministic build/check (26 outputs) and bundled-node typecheck pass; focused run 62 pass / 1 pre-existing dirty-ocean `u_siteLod` assertion failure.
- Next: director visual review only; promotion remains serialized and is not authorized by this record.

## T58e face-extent-and-recut (quarantine-only)

- Measured face end `x1310` (raw ambiguous transition `x1289-1310`); r2 geometry keeps E1/E2 only, with a 24px east solid abutment.
- T58d re-cut restores 15,300 changed pixels outside the 26,018px r2 scope; outside scope is byte-identical to mounted terrain (0px).
- Content: 0.0461% blue, 0 morphology masonry; all protections 0; detail register 114.8% vs requested 90-110 band (reported, not tuned).
- Evidence `.codex-tmp/qa/T58/e/`; candidate `.codex-tmp/quarantine/city-v2/T58e-face-extent-and-recut/`; build/check, 42 focused tests, and typecheck pass.
- Next: director reviews the extent overlay, aligned sheet, and out-of-band detail register; no mount or T59 restart is authorized.

### T69-spandrel-byte-transfer — quarantine-only
- Replaced T67's 821px nearest-neighbour smear with a 457px zero-dilation A4 main-crossing byte transfer; restored 364 over-dilated pixels byte-identically from T63.
- Evidence: `.codex-tmp/qa/T69/{patch-before-after-6x,course-continuity-trace-6x,source-rect-in-situ-6x,e2-crown-6x,both-openings-6x,e1-crown-6x}.png`; builder/report in `.codex-tmp/quarantine/city-v2/T69-spandrel-byte-transfer/`.
- Gates: apertures 0 opaque / 0px deviation; water 0; ZNCC 0.389762; straight run 5px; focused 67/1 baseline red only, typecheck PASS. Next: director visual review; no mount.

## W1 world resegmentation — STOP

- Candidate geography has zero unclaimed/doubly-claimed land and proof under `.codex-tmp/qa/TERRITORY/W1/`, but was not promoted.
- Blocker: moving ACE/Independent requires relocating terrain-owned site raster placements; their alpha/source-crop contract fails without regenerating forbidden terrain rasters. DEM also has frozen `ace-development-shelf` at ACE's old coordinate.
- All W1 production/test files restored; typecheck PASS, lint 0/1 inherited, focused baseline 71/2 inherited. Next: owner must authorize an exception for the two terrain-site rasters and ACE DEM shelf, or narrow W1 to segmentation-only without moving capital/site placements.

## W1 world resegmentation — owner-authorized follow-up

- Owner authorization removed the former raster/DEM blocker: mounted the five-region SVG, moved Independent to the smallest island and ACE to the medium island, and centered Column’s focus on its retained medium-island capital.
- Regenerated only Independent/ACE placeholder site tiles from registered relief/material inputs; moved only Independent/ACE DEM shelves/ridge; D05 registration/canon remain byte-identical to the W1 backup, and the land mask plus frozen L1–L3 files were not written.
- Proof `.codex-tmp/qa/TERRITORY/W1/{before-final,after-final}-segmentation-over-relief.png`, final report `after-final-segmentation-report.json`; island coverage is unique (`0/0` unclaimed/doubly claimed).
- Gates: bundled-node typecheck PASS; lint remains `0 errors / 1` inherited warning; focused W1 terrain/structure/city-adjacent suite `46/46` PASS. No commit. Next: director visual review of the labelled overlays and owner allocation.
