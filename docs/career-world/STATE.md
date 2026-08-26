# Career World — current state

**Read this file first.** It is the resume entry point for a new director thread — rewritten each tick, never appended. Permanent record: `QA-REVIEW.md` (task queue + verdicts — tonight's records run T12→T23-r4 and are the authoritative detail), `AGENT-EXPERIMENTS.md` (findings F1–F30), console artifact (tick #44c; needs a tick at next milestone — update chip + Overview + Evidence, never just one tab; owner crops ≤1200px legible). Never resume from the console artifact.

Last updated: 2026-08-26 late · branch `codex/career-world-rebuild` · head after docs checkpoint (parent `83944f3` = canon r4 mount) · director handoff before context compaction.

## Where things stand (one paragraph)

**Canon r4 is MOUNTED, owner-accepted, and committed (`83944f3`)** — the D05 re-tile from naturalized plate B with both owner patches (facade→gate, S15 overhang), all gates green, F20 flown ("this overall looks so good"). Since then the night has been two parallel tracks: (A) the WATER PROGRAM — seven ocean-layer rounds + four coastal-composite rounds converging on a validated architecture (owner's first "cool" at T23-r3); (B) the D06 MEASURED RUN — concept locked, five heroes banked, plate saga resolved to "the locked concept IS the plate, patch its rails/paths in place."

## IN FLIGHT RIGHT NOW — first thing a new thread checks

**Post-handoff correction (QA-REVIEW record on file):** the original dispatches of BOTH lanes below stalled at startup (codex blocked reading piped stdin — logs frozen at 39 bytes for hours; the handoff wrongly called them "in flight"). Both were killed and re-dispatched with `</dev/null` stdin redirect as harness-tracked background tasks (T23-r4 = `b2juadfya`, T22-r3 = `bjl6z1vdw`) and verified live (logs growing). Dispatch-liveness check is now mandatory: a lane is not "in flight" until the log grows past the codex banner.

1. **T23-r5-webgl-pass** (water; log `.codex-tmp/qa/T23/coastal-water-r5-run.log`; task `bt6qzs542`; packet `.codex-tmp/qa/T23/packet-coastal-water-r5-webgl.md`; record head `**Codex (T23-r5-webgl-pass):**`). **r4 was director-REJECTED live** (QA record `**Director (T23-r4 live verification):**`): real-browser perf ~630x over budget at capital tier (1262ms avg, 154/154 tiles), pan breaks viewport culling, and the offline perf gate was gameable (176x176 toy viewport — director packet error; in-browser measurement now the binding form of every perf gate). LOAD-BEARING: at ~0.7fps nothing can read as moving — the owner's "waves dont move" is at least partly a perf symptom; travel must be re-judged at a true 15fps. r5 scope: Stage 1 port the composite to a WebGL fragment pass (fields as static textures, phases in-shader, 15fps cap, corruption-safe present, dials/reduced-motion preserved); Stage 2 MEASURED travel re-assessment at rate (frame-sequence displacement report) + tuning; Stage 3 (only if still sub-legible) traveling overlay waves. Perf gate rewritten: full-canon worst case offline (no crops) + director in-browser verification at capital, site, AND post-pan views, eyes + numbers BEFORE the owner. r4 did prove live: corruption band gone, effects present, no non-water regressions.
2. **T22-r3 COMPLETE — AWAITING OWNER RE-READ.** Worker patched all 4 censused sites (3 rail + 1 pedestrian; 5/8 ImageGen calls, 1 F17 discard/retry at D03); director review PASSED with eyes + the axis-coherence gate's first live application (max route delta 1.1741° ≤ ±2°); records `**Codex (T22-r3-rail-patches):**` + `**Director (T22-r3 review):**`. Fixed concept: `.codex-tmp/quarantine/city-v2/T22-d06-plate/r3/concept-b-rail-fixed-r1.png` (SHA-256 `3eda0b84...`). Owner sheets delivered in chat. ON OWNER OK → fixed concept becomes the D06 plate: naturalize → registration → tiling (T9b/T13 recipe, all recalibrated gates) → sprites composite at canon stage. Measured run: 22 ImageGen calls total.

## Working tree (UNCOMMITTED trials a new thread must not clobber)

- Docs are committed (this checkpoint). Everything below is intentionally uncommitted trial state; git HEAD holds pristine originals; revert = `git checkout -- <path>`.
- **Ocean runtime** (`features/career-world/layers/ocean/**`): r4b contract-safe material-first shader + r6 variance-preserving blend & motion (bands 14/22/38, waveStrength .9, water-only motionSpeed via profiles `natural-ocean@r2` 1.24→r6 default 1.8) + r5 dual-scale material blend + URL dials. Uniform-contract test added (`tests/water-uniform-contract.test.mjs`).
- **Theme** (`features/career-world/shared/theme.ts`): water palette retuned bright (body `#1a4d6e`, swell `#2f6f96`, highlight `#c8e1f0`...) — bright-island ruling authorizes; land/interface untouched.
- **Live ocean textures** (`public/career-world/layers/ocean/surface-motion/textures/`): T18-r5 VERBATIM candidates (world `5dd94113...`, reference `b31fce1b...` — outpainted painted-water field, 1 ImageGen call). Pristine originals in git HEAD; intermediate backups: `.codex-tmp/qa/T15/live-ab-originals/` (pristine), `T18/live-before-t18...`, `T18/r3/live-before-r3/`, `T18/r4/live-before-r4/`, `T18/r5/live-before-r5/`. Full-layer snapshot `.codex-tmp/backups/ocean-layer-pre-rework-2026-08-26/`.
- **City water effects** (T23 r3): canon-res (2621×2419) composite canvas + deterministic derived fields (sparkle/foam/crest masks, stroke-direction, shore SDF, phase fields) via `scripts/build-ninjaone-d05-canon-water-effects-r4.mjs`; dials `water-effects.sparkle|foam|crest|relight|cycling`.
- **T24 water tuning panel**: F2 on `enableDevelopmentTools` routes (`?view=terrain` etc.), 8+ sliders, live-apply, Copy URL. Owner uses it; treat as keeper pending commit.
- Pre-existing untracked: `public/.../city-r3/_review/*`, `scripts/build-ninjaone-city-grammar-r2.mjs` — preserve.
- KNOWN pre-existing red: 2 repo tests fail on ocean texture hashes while trials are live (expected); QA-REVIEW line ~520 trailing whitespace blocks file-wide `git diff --check` (cosmetic).

## Owner rulings tonight (all verbatim-recorded in QA-REVIEW — binding)

- **Bright island**: entire main island/NinjaOne territory adopts canon r4's vibrant fantasy register; moody reserved for future islands. Water block of theme unfrozen; land/interface not.
- **Water quality bar**: the concept/canon painted water IS the target ("city masked water detail is the goal"); concept still = the literal base; charm WINS over realism (references govern structure, concept governs look).
- **Coastal-first**: animate the canon's own water in place; expand outward only after it works.
- **Layer-derivation + bake sequencing**: live derived composite is the PRODUCTION system (auto-tracks shore changes via mount-time re-derivation — shimmer precedent); bake ONLY against frozen art as end-game topper (per-district after canon final; island-wide after terrain pass), with a mandated research-first step (the "AAA delta-flipbook" framing was director synthesis, not documented shipped practice — epistemics correction on record).
- **Pivot pre-commitment (amended)**: no ground-up live redesigns; iterate craft within the validated composite; overlay-waves r5 is the sanctioned escalation for wave travel.
- **Open-ocean plan of record**: NOT pre-baked; procedural layer modified to match (graded palette done; far-field calm + broad swells + zoom-constant glint = r7 scope in QA-REVIEW), demoted to deep-sea supporting player.
- **D06**: concept B locked ("the top wins after the rail fixes"); owner does NOT love it — satisficing economics ("the others were worse... good enough"): patch-in-place beats regeneration because regen keeps charging a defect tax (r2's perspective drift + rail misalignment — owner-caught, director-missed). "Fix the paths and the rails and this concept is fine imo."
- **D06 identity**: capital's central train-station hub, trains to each project city; heroes = station + train (+S07/S08/S14); master draft not binding; ALL heroes/skill/project/capital buildings planned ANIMATED (sprite overlay invariant everywhere).
- **Terrain overview**: deferred to post-territories (districts supply its language); guard: cheap reversible grade mid-production only if reviews get ambiguous.
- **Roadmap**: cement D05 → D06 measured run → remaining capital districts (shore/docks brief owed by owner) → project cities; ocean register settles now; baked-art ceiling insight → FUTURE DISTRICTS' water authored cycling-friendly at generation (brief line item from D06 onward).

## D06 measured run status

Concept: T20 (3 calls, gate-miscalibration hard stop, F23-audited: train-width floor + concept-stage seam gate now advisory) → owner locked B. Heroes T21/T21b: S-STATION A, S07 A, S08 B, S14 A banked + provisionally approved ("fine with these", final acceptance at composed layout); trains EXPRESS-C + HAULER-D both clean (opaque-glazing correction after 2 F17 discards — pink-through-glass class); owner picks train at layout review; EXPRESS-C is the default composite, HAULER-D deterministic swap. Plate: T22 r1 REJECTED (legacy grammar was composition authority — DIRECTOR PACKET ERROR; rule: **concept-lock with master departure ⇒ the concept IS the composition authority**); r2 composition-faithful but lost to the concept itself (perspective/alignment defect tax); r3 patch lane in flight. ImageGen so far: T20 3 + T21 7 + T21b 3 + T22 4 = 17 calls; interventions/reconvenes logged in ledgers (`.codex-tmp/qa/T19/measured-run-baseline.json` + per-lane ledgers).

## Gates added/recalibrated tonight (all F23-audited, in QA-REVIEW detail)

F27 baseline-calibrated gates (coast); structural-vs-terrain drift; 240px chroma feather stitch; composition-authority rule; composition-fidelity per-region checklist (+ perspective consistency + rail alignment); AXIS COHERENCE (world-parallel ⇒ screen-parallel ±2°); uniform-contract test; effect VISIBILITY PROOF (A/B on/off delta floor + motion pair) + CORRUPTION SCAN; perf budget as binding gate; wave-travel legibility; rail continuity + pedestrian circulation (stairs connect or don't exist); owner-crop legibility ≤1200px; director live-verifies before owner looks.

## On completion sequences

- **Water**: r4 lands → director verify (perf numbers + wave travel + eyes) → owner flies → if legible+cheap: coastal proof DONE; expand = D06's coast inherits at its mount; r7 far-field ocean round when prioritized. If wave travel short → r5 overlay waves.
- **D06**: r3 patches land → director axis/continuity review → owner re-read → fixed concept = plate → naturalize/registration/tiling lanes (F26 sole authority, all gates) → canon → owner review → mount (mask from ITS coast per water sequencing rule — layer owns nothing painted).
- **Then**: measured-run comparison writeup vs D05 baseline; remaining districts; console tick.

## Standing debts & parked

Shore/docks creative brief (owner). Shimmer tuning ladder (owner: concept accepted, "needs tweaks"; coverage 21.75%). Ocean far-field r7. Water-effects panel + trials → commit path once owner blesses water. 96 MiB terrain-global variants. Ocean life sub-layer (fish/boats — out of scope for now). Animation grammar phase (train + wheel + all heroes). Findings-ledger essay.

## Rules that bite (unchanged + tonight's additions)

Only Steve accepts (F10); two strikes → reframe; F17 discard-don't-repair (patches are owner-authorized exceptions with byte-identical-outside guarantees); F20 live look before "mounted"; F21 eyes gate metrics; F22 scale; F23 retroactive gate audits; F24 record acceptance framing honestly + log owner AND director misses (tonight: director missed S15 dome, r2 perspective drift, "AAA pattern" over-attribution — all logged); F25 uniform re-tiles + per-defect checklists; F26 one image authority; F27 calibrate gates against the accepted baseline. Dispatch form (AMENDED — stdin redirect mandatory): `codex exec --sandbox workspace-write -c model=gpt-5.6-{sol|terra} -c model_reasoning_effort=high "$(cat <packet>)" < /dev/null > <log> 2>&1` (sol=generation, terra=deterministic/runtime); after dispatch, verify the log grew past the codex banner before calling the lane in-flight. Bundled Node (F5): `~/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe`. Hot-swaps always backup-first; effect lanes ship visibility proofs; director verifies live before the owner is asked to look.
