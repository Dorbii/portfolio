# Career World — current state

**Read this file first.** It is the resume entry point for a new director thread — rewritten each tick, never appended. Permanent record: `QA-REVIEW.md` (task queue + verdicts), `AGENT-EXPERIMENTS.md` (runs + findings F1–F24), `NINJAONE-CITY-RESTART-HANDOFF.md` (old checkpoints). Do not read those to resume; consult them for specific questions. Never resume from the Career World Console artifact (4.7MB; content duplicated here).

Last updated: 2026-08-25 late night · branch `codex/career-world-rebuild` · head `9754477`

## Where things stand (one paragraph)

**The D05 canon pyramid is LIVE and owner-reviewed.** One canonical district image (`public/career-world/capitals/ninjaone/city-v2/canon/d05-canon-r1.png`, 2619×2417, ~2.7 px/master, 9 stitched tiles, heroes composited from the five signed-off despilled sprites) serves capital/intermediate/close tiers by downsample through registration `d05-anchor-cover-registration-r3.json` + mask r3. The runtime sprite overlay is retired (sprite PNGs remain on disk as canon sources + future animation overlays). Steve flew it, verdict "vibrant and honestly fantastic," and filed 15 review observations now being fixed.

## IN FLIGHT RIGHT NOW — first thing a new thread checks

**T12a-r2-true-coast IN FLIGHT** (sol · high, 2 calls, owner-approved) — background `codex exec`; a new thread gets NO completion ping: check `.codex-tmp/qa/T12/plate-naturalize-r2-run.log` (tail) and QA-REVIEW.md for `**Codex (T12a-r2-true-coast):**`. It regenerates the naturalized D05 base plate with the REGISTERED coast composited into the scaffold (T12a's only failure was coastline — 39%/35% raw — because the scaffold showed B's approximate coast; everything else passed twice: seating 16/16, entrances 16/16, scale, register, vegetation). Gate targets: raw conformity ≥60% AND material water-on-land ≤10% by the direction-split method (12px normal sampling — director's script pattern is in this session's QA record; T12a-A measured 16.4% material / 53.5% mask-cuttable).

**On T12a-r2 completion, the new thread's sequence:**
1. Director review checklist: (a) **Steve's flagged dome-roof defect** — he cropped a blue dome with a melted rib/eave junction on the T12a candidate; check the same dome at 2x on r2 FIRST; (b) coast numbers vs targets; (c) seating/entrance/register spot-checks. Send Steve the package (side-by-sides, coast overlay, seating crops).
2. On Steve's OK → dispatch **PHASE 2: full uniform re-tile** (sol, ~12 calls: 9 scheduled + 3 retries): plain crops of the naturalized plate as sole per-tile image authority (F26 — no exemplar images, text briefs only), EXACT T9b recipe, then hero composite from the despilled sprites, stitch at 40px feather, tier derivation, gates: register continuity at borders (≤6% luminance), vegetation floor vs T9b r1 tiles, seating checklist, ghost checks at 1.5x, traced-eye circulation (the classifier gate is BROKEN on canon palettes — never trust its numbers, use the drawn-network overlay + eyes).
3. Owner review of canon r4 → mount lane swaps the three canon files + provenance (zoom floor and resolution-aware tier serving are ALREADY live from T10b, commit `da61047`) → F20, full suite, commit, console tick.
4. If T12a-r2 fails coast again → STOP, reconvene with Steve; do not iterate silently.

**Dead ends a new thread must not reopen:** individual tile re-rolls on canon r2/r3 (three strikes, F25/F26); the T9b-era canon r2/r3 quarantines are evidence only. Canon r1 stays mounted until r4 fully passes.

Historical (superseded) in-flight records below: Context: the first T11 pass failed honestly at 14/14 — its four multi-reference tiles drifted (→ **F26: one image authority per call; exemplars/style go in TEXT**), causing the broken borders/orphans/ghost bands; its five single-authority tiles were clean and are banked. The continuation retries tiles 03/06/07/08 with the enriched scaffold as sole image reference, re-stitches with the banked five, and re-runs the full stitched gate suite (circulation, borders, ghosts, exemplar eye pass). Output quarantines as `d05-canon-r3` FINAL under `.codex-tmp/quarantine/city-v2/T11-canon-r3/` with artifacts in `.codex-tmp/qa/T11r2/`.

Original T11 record (first pass, failed): Context: T10a's canon r2 (six locally-briefed tile re-rolls) FAILED Steve's round-2 review — five circulation orphans + malformed structures + his "drifting towards a stickered look" diagnosis → F25 logged (piecemeal re-rolls erode cohesion; network properties need conditioning + gates) → owner approved the reframe: **full uniform re-tile from an enriched scaffold** (B + composited sprites + the circulation network DRAWN IN — extracted via the T1-r3 classifier, extended to every hero entrance and doorstep), all ~9 tiles from one source, new circulation-continuity gate on the stitched whole, owner's walled-compound regions banked as composition exemplars, owner's paint-defect list as discard criteria. Output: quarantine `d05-canon-r3` + artifacts under `.codex-tmp/qa/T11/`. Canon r2 is DEAD — do not mount it.

**T10b mount lane (NOT YET DISPATCHED — fires only after canon r3 passes BOTH director checklist-eyes and Steve's review):** terra · high, zero ImageGen. Scope: (1) zoom floor `0.055 → 0.0825` in `features/career-world/composition/WorldScene.tsx` (`INTERACTIVE_ART_RESOLVING_MINIMUM_SPAN`) — **owner-ruled**, canon 1:1, comment updated to cite the canon; (2) fix tier-serving thresholds (bug found live: the capital tier serves at close range where the full canon should — element measured 2617 CSS px serving `d05-canon-capital-r1`); (3) shimmer classifier tweak so mossy masonry stops shimmering; (4) mount **canon r3** (NOT r1's files beyond what stays, NEVER r2) + its re-derived tiers. Then director F20 with per-defect checklists (F25 corollary — trace circulation explicitly, verify each of Steve's round-1 AND round-2 items at the framings he shot), full suite, commit, console tick. Owner package for the r3 review must include the circulation overlay traced on the finished canon.

Dispatch form: `codex exec --sandbox workspace-write -c model=gpt-5.6-terra -c model_reasoning_effort=high "$(cat <packet>)" > <log> 2>&1` (sol for generation lanes). Bundled Node for workers (F5): `~/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe`.

## Standing spend direction (Steve, 2026-08-26)

"I'd rather get this MVP right so we can reduce future errors since we will have ironed out the pipeline/workflow." Quality-first on D05 as the pipeline proving ground: the director may authorize bounded generation budgets without per-call asks when the lane serves ironing out the recipe; spend is still reported honestly per lane, F17 discard discipline and hard per-packet caps stay, and approach-level pivots still come to Steve. The deliverable is the *repeatable pipeline*, not just the district.

## Owner rulings tonight (all recorded in QA-REVIEW)

- Canon accepted ("the seams are pretty flawless") → mounted.
- Zoom floor SET at canon 1:1 (0.0825) after being shown both experiences live (hot-swapped tier in-browser). Deep-soft zone given up; optional future "core ring" (~10–14 calls, city core at ~5.5 px/master) buys deeper zoom back if wanted — demand-driven, not scheduled.
- Full review scope confirmed: every logged defect gets worked ("even this version has defects").
- Review keepers for future district packets: organic building placement (the headland cottage), shimmer effect quality, vibrant register.

## Review disposition (Steve's 15 observations)

- Sprites-over-baked-buildings ×3, S10 entrance, shore house hole, walkway dead-end, cutoff chapel, ghosting → **T10a (in flight)**.
- Max-zoom blur, tier mis-serving, shimmer-on-masonry → **T10b (queued)**.
- Shore quality → **shore polish pass, separately scheduled, needs Steve's creative brief (docks — he liked the old dock look; canon brought some back)**.
- Crane arm fading at district boundary → parked; next district's regeneration covers it.

## Standing debts & parked

Shore/docks pass (owner ask). Bright-district-vs-dark-world register reconciliation (world-level; env art frozen L2; Steve's call). 96 MiB 4x terrain-global per-tier variants. Which district regenerates second (the pipeline-payoff measurement — recipe now proven end-to-end: grammar → scale-gated anchor-and-cover → canon tiles → pyramid mount). Owner-endorsed future phases: animation grammar ("the wheel is the event loop"), findings-ledger essay (agent-side perspective; Steve's vault is open for research — see memory).

## Settled — do not reopen

Plate-carving dead. Runtime fabric tiling dead (canon *authoring* tiles are the correct home for that mechanism). Chroma key-extension dead (despill is the fix; F21 eye gate mandatory). Per-tree foliage dead. One canonical artwork per subject; tiers only by downsample (AGENTS.md Canon-pyramid amendment). One anchor authority per mounted plate. L1–L3 + camera/LoD frozen (zoom-floor change tonight is owner-authorized).

## Rules that bite

Only Steve accepts; workers never commit (F10); two strikes → reframe; F17 discard-don't-repair; F20 live screenshot before "mounted"; F21 metrics can't see fringe/visual defects — eyes gate; F22 scale gates on generation; F23 gate corrections audit retroactively; F24 deliver the experience being accepted, record acceptance framing, log owner misses at full fidelity (Steve explicitly wants blunt callouts).
