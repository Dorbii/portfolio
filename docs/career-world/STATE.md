# Career World — current state

**Read this file first.** It is the resume entry point for a new director thread. It is *rewritten* each director tick, never appended — it holds only what is true right now. The permanent record lives in `QA-REVIEW.md` (task queue + verdicts), `AGENT-EXPERIMENTS.md` (run ledger + findings F1–F21), and `NINJAONE-CITY-RESTART-HANDOFF.md` (crash-safe checkpoints). Do not read those three to resume — consult them only when a specific question needs them.

Last updated: 2026-08-24 · branch `codex/career-world-rebuild` · head `7d1d6d5`

## What is live

- **D05 (Western Skill Terraces) is the only rebuilt district.** Bright concept plate mounted at extended shore bounds `[-270,413,691,1300]` through a feathered usable mask; all legacy dusk city art is gated off behind `LEGACY_CITY_ART_VISIBLE=false` (assets retained on disk).
- **Four skill sprites live at their registered anchors** — S01 gopher foundry, S10 Databricks works, S11 whale-crane warehouse, S15 OpenAPI archive — at 3.8–4.9× plate sharpness, mounted after plate + shimmer behind `siteAssetsMounted`. **S18 is deliberately absent**, enforced by a property test.
- **Foliage** is baked into plates plus a derived-mask wind-shimmer layer (4.76% coverage, reduced-motion safe). Per-tree sprites were rejected.
- **Interactive zoom floor is capped at 0.055** (~3× plate magnification) so the camera cannot outrun the art's resolving power. Proof cameras are unaffected.
- Gates at last measurement: full suite 210 pass / 0 fail / 2 skipped (at the shore cutover); focused 59/59 + F20 live screenshot pass (at the sprite mount).

## Blocked on Steve — nothing proceeds on these without a ruling

1. **S18 wheel mill.** Ten candidates (C–L) across six packets have failed on chroma artifacts; the other four sprites passed the same workflow in ≤2 calls each. Lane is suspended. Options: (a) hold — S18 stays plate-rendered, current live state, costs nothing; (b) authorize a bounded deterministic despill along the existing alpha boundary (needs an explicit F17 ruling — it touches generated pixels but cannot reclassify any pixel as background); (c) re-brief without the dominant wheel (contradicts "the wheel is the event loop", not recommended).
2. **Fabric tiling — director recommends STOP permanently.** Three probes agree: seam mismatch is ~10.5% MAD through masonry *and* nature, and near-plate-size tiles return only 1.46–1.72 px/unit because the generator's output cap doesn't scale with tile size. Sprites + the zoom cap are the close-tier answer. Awaiting "agreed" or pushback.
3. **Low priority, parked:** per-tier variants for the two 96 MiB 4× terrain globals (192 of 336 MiB capital static — an L1/L2/LoD policy call); the close-geology 2× experiment (~71 MiB saving, needs visual sign-off); which district regenerates next.

## Settled — do not reopen

- **Plate-carving is terminated.** A monolithic baked plate cannot decompose into per-node LoD.
- **Fabric tiling for the close tier is dead** (T7a/T7b/T7c measured it).
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

## Next action when unblocked

Steve rules on S18 and on the tiling STOP. Then the open lane is the next district's bright re-integration (backdrop must carry registered L3 water), using the proven recipe: compose scaffold → whole-plate generative integration → verify named anchors (F19) → mount → live screenshot.
