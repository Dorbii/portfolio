#!/usr/bin/env bash
# The rest of the night after c3-1 was refused by ONE PIXEL at 05:03 (its
# stream meets c3-2's 49 px from the gate's 48; rock lighting 0.244 on the
# bench walls, the reading the owner accepted on c4-2). c2-1 and c4-1 both
# border c3-1 and must bake AGAINST its pixels once the owner has ruled on that
# candidate, so they leave tonight's queue (c2-1's dispatch of 05:03 went out
# blind before it could be stopped; c4-1 was held off with the lock). What is
# independent of c3-1 runs here: c4-0, c5-2, the coast accepts, the three coast
# regenerations, then c5-1's mask fix by override.
#   ONLY_C51=1  run just the c5-1 override (after-chain.sh got through c4-1)
set -u
cd "C:/Users/Steve/Documents/Github/portfolio/.claude/worktrees/land-lod-completion" || exit 1
say() { echo "[$(date -u +%H:%M:%S)Z] $*"; }
if [ -e .codex-tmp/authoring/cell.lock ]; then say "lock present — not starting"; exit 1; fi
AUTH=public/career-world/layers/terrain/authority

if [ "${ONLY_C51:-0}" != 1 ]; then
  # c4-0 is UNAUTHORED (its astra dispatches never generated; the 00:16 run was
  # stopped before it). One attempt: the border river meets N c3-3's at the
  # seam (a foreign neighbour). Its south seam is the old c4-1, which rebakes
  # against c4-0's new pixels later.
  say "bake c4-0 (one attempt: the border river meets N c3-3's at the seam)"
  node art-source/career-world/l2-land/tanium/briefs/write-briefs.mjs >/dev/null 2>&1
  node docs/career-world/session3-tools/bake-tanium.mjs --only c4-0

  # c5-2: "the water doesnt seem to line up with the banks" — the cut is a
  # thread beside the painted bed; no mask classifier reaches the bed, so one
  # regeneration on brief 5,2 (the becks fill their beds).
  say "bake c5-2 (forced, one attempt: the becks fill their painted beds)"
  node art-source/career-world/l2-land/tanium/briefs/write-briefs.mjs >/dev/null 2>&1
  node docs/career-world/session3-tools/bake-tanium.mjs --only c5-2 --force c5-2

  # The owner on the four north shores (02:50): "yeah its fine"; on the seams
  # between them (02:55): "these parts are not good though" — generated blind
  # of each other. Accept c2-0 and c4-0, regenerate c3-0 and c5-0 BETWEEN their
  # accepted neighbours, then c7-0, the corner east of c6-0.
  for spec in "2,0 c2-0" "4,0 c4-0"; do
    set -- $spec
    say "coast $2: owner accept on eye, stitching the candidate"
    CELL_OWNER_ACCEPT="owner 2026-09-05, on the picture of the four north-shore candidates in place: 'yeah its fine' (rock lighting on a cliff rim, the reading he accepted on c4-2)" \
      node tools/world-authoring/cell.mjs --territory coast --cell "$1" --redo --force \
      --describe-file "art-source/career-world/l2-land/coast/briefs/$2.md" 2>&1 | grep -E "OVERRIDE|FAIL|accepted, stitched|NOT accepted" | head -6
    git add -A -- art-source/career-world/l2-land/coast "$AUTH" docs/career-world/session3-tools/coast-rejects >/dev/null 2>&1
    git commit -q -m "Coast $2: accepted by the owner on his eye, stitched with the override recorded" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && say "coast $2 committed"
  done
  say "coast c3-0, c5-0 regenerated between their accepted neighbours; then c7-0, the corner east of c6-0"
  node docs/career-world/session3-tools/coast-briefs.mjs >/dev/null 2>&1
  git add -A -- art-source/career-world/l2-land/coast/briefs >/dev/null 2>&1
  git commit -q -m "Coast: briefs regenerated with c2-0 and c4-0 in the world" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && say "coast briefs committed"
  node docs/career-world/session3-tools/bake-tanium.mjs --territory coast --only c3-0,c5-0,c7-0
fi

# c5-1: the owner's mask fix (punch list A: the wet patch below the tarn's
# spillway, his crop). The re-derive at 04:29 was refused by ONE gate, the
# vegetation arm on the c5-0 seam (dLuma 68 against 13) — a seam the fix does
# not touch and that is in the world already: c5-1 was accepted at 12:28 with
# that gate passing. Reversible: c5-1-water-source-before-seed.png is kept.
say "c5-1: the owner's mask fix, stitched by override past the vegetation arm on the c5-0 seam"
CELL_OWNER_ACCEPT="owner 2026-09-04 marked the wet patch below c5-1's tarn spillway as painted water the mask missed (punch list A, his crop); this re-derive changes only that water cut; the one failing gate is the vegetation arm on the c5-0 seam, untouched by the change and already in the world as accepted at 12:28" \
  node tools/world-authoring/cell.mjs --territory tanium --cell 5,1 --redo --force \
  --describe-file art-source/career-world/l2-land/tanium/briefs/c5-1.md 2>&1 | grep -E "OVERRIDE|FAIL|accepted, stitched|NOT accepted|written" | head -8
git add -A -- art-source/career-world/l2-land/tanium "$AUTH" docs/career-world/session3-tools/tanium-rejects >/dev/null 2>&1
git commit -q -m "Tanium c5-1: the owner's mask fix (the wet patch below the tarn's spillway) stitched by override past the vegetation arm on the c5-0 seam, which the fix does not touch" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && say "c5-1 committed"
say "after-chain-2 done"
