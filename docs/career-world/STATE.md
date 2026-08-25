# Career World — current state

**Read this file first.** It is the resume entry point for a new director thread. It is *rewritten* each director tick, never appended — it holds only what is true right now. The permanent record lives in `QA-REVIEW.md` (task queue + verdicts), `AGENT-EXPERIMENTS.md` (run ledger + findings F1–F21), and `NINJAONE-CITY-RESTART-HANDOFF.md` (crash-safe checkpoints). Do not read those three to resume — consult them only when a specific question needs them.

Last updated: 2026-08-24 · branch `codex/career-world-rebuild` · head `7d1d6d5`

## What is live

- **D05 (Western Skill Terraces) is the only rebuilt district.** Bright concept plate mounted at extended shore bounds `[-270,413,691,1300]` through a feathered usable mask; all legacy dusk city art is gated off behind `LEGACY_CITY_ART_VISIBLE=false` (assets retained on disk).
- **All five skill sprites live at their registered anchors** — S01, S10, S11, S15, and S18 (accepted 2026-08-24 after despill; the S18 saga is closed: solidity brief + boundary despill is the recipe for openwork silhouettes). Sprites scale from the F19 registration bboxes (plate-truth) and cover their painted counterparts exactly.
- **OWNER DESIGN INTENT (Steve, 2026-08-25, explicit): "I wanted everything to be crisp."** Uniform detail across the whole scene at every tier; the crisp-sprites-over-soft-plate behavior was never the goal and is retired with the crossfade. Judge all future district work against uniform crispness, not hero-vs-fabric contrast.
- **ADOPTED STRATEGY (Steve, 2026-08-25): downsample-from-canon.** Recorded in AGENTS.md ("Canon-pyramid amendment"). One canonical artwork per subject; every zoom tier is a deterministic downsample of one authored max-res district image (Maps semantics — zoom never swaps content). Driven by Steve's zoom-morph complaint: plate and sprite were independent renditions of the same buildings, and the fabric had no high-res tier at all.
- **Current state (2026-08-25 evening, head `b9c73f3`):** anchor-and-cover plate B is MOUNTED as the D05 composition authority (owner-accepted with a recorded coast-refinement debt — docks/shore dressing return in a later pass); all five despilled sprites sit exactly on their painted counterparts (one-authority rule: sprite mounts derive from the mounted plate's registration, property-guarded); mask r3 has the registered-water coast cut + 48 master px inland feather (edge property recalibrated to eye scale). Suite 211/0/2 at head.
- **T9a probe PASSED both eye gates (drift p90 0.000, 2.73 px/master, seam invisible at 2x) → OWNER GO on the pyramid.** T9b full canon authoring is RUNNING: ~9-tile grid over the district, probe recipe verbatim, despilled sprites composited in as canonical hero renditions, tier derivation by downsample; cap 14 calls. Next after it reports: owner canon review → T9c mount (runtime serves the pyramid, sprite overlay retires until the animation pass) → zoom-floor recalibration question to Steve (frozen camera policy).
- **Standing debts:** coast refinement (owner ask, post-pyramid); bright-district-vs-dark-world register reconciliation (world-level, env art frozen L2, Steve's call).
- **Foliage** is baked into plates plus a derived-mask wind-shimmer layer (4.76% coverage, reduced-motion safe). Per-tree sprites were rejected.
- **Interactive zoom floor is capped at 0.055** (~3× plate magnification) so the camera cannot outrun the art's resolving power. Proof cameras are unaffected.
- Gates: full suite **211 pass / 0 fail / 2 skipped verified at head `f0d4780`** (2026-08-24); focused 59/59 + F20 live screenshot pass at the sprite mount. Console artifact is at tick #40, current with this state.

## Blocked on Steve — nothing proceeds on these without a ruling

1. **S18 wheel mill.** Ten candidates (C–L) across six packets have failed on chroma artifacts; the other four sprites passed the same workflow in ≤2 calls each. Lane is suspended. Options: (a) hold — S18 stays plate-rendered, current live state, costs nothing; (b) authorize a bounded deterministic despill along the existing alpha boundary (needs an explicit F17 ruling — it touches generated pixels but cannot reclassify any pixel as background); (c) re-brief without the dominant wheel (contradicts "the wheel is the event loop", not recommended).
2. **Low priority, parked:** per-tier variants for the two 96 MiB 4× terrain globals (192 of 336 MiB capital static — an L1/L2/LoD policy call); the close-geology 2× experiment (~71 MiB saving, needs visual sign-off); which district regenerates next.

## Settled — do not reopen

- **Plate-carving is terminated.** A monolithic baked plate cannot decompose into per-node LoD.
- **Fabric tiling for the close tier is dead** (T7a/T7b/T7c measured it; Steve ruled "agreed for now" 2026-08-24 — reopening starts from those measurements).
- **Chroma-key extension for enclosed pockets is permanently closed** (T8a6: every uniform predicate regressed accepted sprites).
- **Per-tree sprite foliage is rejected** — it re-risks the r5 "stickered" read.
- **Register is bright and inviting, not moody.** The master plate is authority for forms and vocabulary, not for its dark value floor.
- **L1–L3 (ocean, terrain, inland water) plus camera and LoD are frozen.** No agent touches them; changes need Steve.

## Standing rules that bite most often

- Only Steve accepts work. Workers never commit (F10) — the director verifies gates and commits.
- Two same-shaped failures → propose a pipeline change, never a third patch.
- Discard-don't-repair for generation outputs (F17, owner policy).
- Every mount lane ends with a live-render screenshot before "mounted" is reported (F20) — no property test substitutes for eyes on geometric composition.
- Mechanical gates are for mechanics only; visual acceptance is human-only. The chroma metric suite (Section 7 / F12) does **not** see fringe defects — three false negatives so far (F21).
- Future district backdrops must carry the registered L3 water; masks cut to it.

## Dispatch form

```
codex exec --sandbox workspace-write -c model=gpt-5.6-sol -c model_reasoning_effort=high "$(cat <packet>)" > <log> 2>&1
```

Tiers: `gpt-5.6-sol` for generation/judgement lanes, `gpt-5.6-terra` for mechanical lanes. Workers must call Node through the bundled runtime — `~/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe` — because the sandbox denies the system Node (F5). Packets go in `.codex-tmp/qa/<T#>/packet-*.md`, logs beside them.

## Future phases (owner-endorsed 2026-08-25, queued behind the canon pyramid)

- **Animation grammar.** After D05's zoom/fidelity lands: deterministic effects layers (the shimmer pattern) giving each skill building motion derived from its technology's semantics — S18's recorded brief "the wheel is the event loop — it turns forever" is the template; whale crane lowers containers (Docker), gopher foundry chimneys puff on staggered concurrent schedules (goroutines). Steve: "this is exactly what I'm excited for as well, we should iterate on this at that time."
- **Findings-ledger essay.** Distill F1–F23 into an argued piece on directing generative agent pipelines, written from the agent side of the interface — Steve endorsed it, noting the gap: many humans prescribe agent best practices, few agents report what actually works. Quiet-moment work, costs only tokens.

## Next action when unblocked

Steve rules on S18 and on the tiling STOP. Then the open lane is the next district's bright re-integration (backdrop must carry registered L3 water), using the proven recipe: compose scaffold → whole-plate generative integration → verify named anchors (F19) → mount → live screenshot.
