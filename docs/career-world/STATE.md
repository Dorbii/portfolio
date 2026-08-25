# Career World — current state

**Read this file first.** It is the resume entry point for a new director thread — rewritten each tick, never appended. Permanent record: `QA-REVIEW.md` (task queue + verdicts), `AGENT-EXPERIMENTS.md` (runs + findings F1–F24), `NINJAONE-CITY-RESTART-HANDOFF.md` (old checkpoints). Do not read those to resume; consult them for specific questions. Never resume from the Career World Console artifact (4.7MB; content duplicated here).

Last updated: 2026-08-25 late night · branch `codex/career-world-rebuild` · head `9754477`

## Where things stand (one paragraph)

**The D05 canon pyramid is LIVE and owner-reviewed.** One canonical district image (`public/career-world/capitals/ninjaone/city-v2/canon/d05-canon-r1.png`, 2619×2417, ~2.7 px/master, 9 stitched tiles, heroes composited from the five signed-off despilled sprites) serves capital/intermediate/close tiers by downsample through registration `d05-anchor-cover-registration-r3.json` + mask r3. The runtime sprite overlay is retired (sprite PNGs remain on disk as canon sources + future animation overlays). Steve flew it, verdict "vibrant and honestly fantastic," and filed 15 review observations now being fixed.

## IN FLIGHT RIGHT NOW — first thing a new thread checks

**T10a-canon-fix-tiles** (sol · high, ≤9 ImageGen calls) was dispatched as a background `codex exec`; a new thread won't get its completion notification. Check `.codex-tmp/qa/T9/canon-fix-tiles-run.log` (tail) and QA-REVIEW.md for `**Codex (T10a-canon-fix-tiles):**`. Its scope: regenerate hero-bearing tiles from sprite-composited scaffolds (fixes the systematic sprites-over-baked-buildings defect — T9b skipped the erase-under step, director spec gap), plus owner paint fixes on their tiles (S10 ground entrance; see-through shore house; dead-end walkway; cutoff chapel — via re-stitch if it's an overlap casualty), plus re-stitch with feather 120→40 master px with a ghost-check at 1.5x stretch. Output: quarantine `d05-canon-r2` + before/after crops per fix under `.codex-tmp/qa/T10a/`.

**T10b (NOT YET DISPATCHED — next action after T10a passes director review):** terra · high, zero ImageGen. Scope: (1) zoom floor `0.055 → 0.0825` in `features/career-world/composition/WorldScene.tsx` (`INTERACTIVE_ART_RESOLVING_MINIMUM_SPAN`) — **owner-ruled**, canon 1:1, comment updated to cite the canon; (2) fix tier-serving thresholds (bug found live: the capital tier serves at close range where the full canon should — element measured 2617 CSS px serving `d05-canon-capital-r1`); (3) shimmer classifier tweak so mossy masonry stops shimmering; (4) remount canon r2 + re-derived tiers. Then director F20 (verify each of Steve's 15 items at the framings he shot), full suite, commit, console tick.

Dispatch form: `codex exec --sandbox workspace-write -c model=gpt-5.6-terra -c model_reasoning_effort=high "$(cat <packet>)" > <log> 2>&1` (sol for generation lanes). Bundled Node for workers (F5): `~/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe`.

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
