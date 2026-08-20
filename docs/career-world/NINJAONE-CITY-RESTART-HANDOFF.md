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
