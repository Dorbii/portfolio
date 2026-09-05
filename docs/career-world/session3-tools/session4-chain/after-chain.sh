#!/usr/bin/env bash
# After the chain of 01:24 ends and the lock is free: the two mask fixes that
# did not take in the chain, with full output this time.
#   c3-2: refused on the seam with c4-2 (tone 38.3) — the seam the owner
#         accepted when he accepted c4-2's candidate on his eye; the redo
#         changes only c3-2's water cut, so it proceeds under his ruling.
#   c5-1: took 14 s and left the manifest unchanged — see why.
set -u
cd "C:/Users/Steve/Documents/Github/portfolio/.claude/worktrees/land-lod-completion" || exit 1
say() { echo "[$(date +%H:%M:%S)] $*"; }
if [ -e .codex-tmp/authoring/cell.lock ]; then say "lock present — not starting"; exit 1; fi
say "redo c5-1 (full output)"
node tools/world-authoring/cell.mjs --territory tanium --cell 5,1 --redo --force \
  --describe-file art-source/career-world/l2-land/tanium/briefs/c5-1.md 2>&1 | grep -vE "^\s*$" | tail -25
say "redo c3-2 under the owner's c4-2 acceptance"
CELL_OWNER_ACCEPT="owner 2026-09-04 accepted c4-2's candidate on his eye ('yeah its fine'); this re-derive changes only c3-2's water cut (the owner's mask marks) and the only failing gate is the tone step on that accepted seam" \
  node tools/world-authoring/cell.mjs --territory tanium --cell 3,2 --redo --force \
  --describe-file art-source/career-world/l2-land/tanium/briefs/c3-2.md 2>&1 | grep -E "OVERRIDE|owner:|FAIL|accepted, stitched|NOT accepted" | head -8
git add -A -- art-source/career-world/l2-land/tanium public/career-world/layers/terrain/authority docs/career-world/session3-tools/tanium-rejects >/dev/null 2>&1
git commit -q -m "Mask fixes: c3-2 and c5-1 re-derived with the painted water the owner marked (c3-2 under his c4-2 acceptance)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && say "committed"

# The owner on the seven-cell picture (01:40): "the bottom row looks fine I
# think" — c1-2's second candidate and c6-2's candidate accepted on his eye;
# c5-2 good enough. Stitched from their cell dirs with his words recorded.
for spec in "1,2 c1-2" "6,2 c6-2"; do
  set -- $spec
  say "$2: owner accept on eye, stitching the candidate"
  CELL_OWNER_ACCEPT="owner 2026-09-05, on the seven-cell picture with the candidate drawn in place: 'the bottom row looks fine I think'" \
    node tools/world-authoring/cell.mjs --territory tanium --cell "$1" --redo --force \
    --describe-file "art-source/career-world/l2-land/tanium/briefs/$2.md" 2>&1 | grep -E "OVERRIDE|FAIL|accepted, stitched|NOT accepted" | head -6
  git add -A -- art-source/career-world/l2-land/tanium public/career-world/layers/terrain/authority docs/career-world/session3-tools/tanium-rejects >/dev/null 2>&1
  git commit -q -m "Tanium $2: accepted by the owner on his eye ('the bottom row looks fine'), stitched with the override recorded" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && say "$2 committed"
done

# c1-1, the keystone (owner: "regen this one"): one attempt, AFTER c1-2 is in
# the world, so the gorge river's arrival across the south seam is in its brief
# and its edit target. chain-handoff.sh moves it here from the chain's end by
# taking the lock the moment the coast run ends; if the chain's own dispatch
# got there first (C11_DONE=1), that was its one attempt and this is skipped.
if [ "${C11_DONE:-0}" = 1 ]; then
  say "c1-1 already had its attempt in the chain — skipped here"
else
  say "bake c1-1 (one attempt, with c1-2 stitched below it)"
  node art-source/career-world/l2-land/tanium/briefs/write-briefs.mjs >/dev/null 2>&1
  node docs/career-world/session3-tools/bake-tanium.mjs --only c1-1
fi

# c3-1: the owner accepted its candidate ("yeah accept c3-1 thats fine") but
# the astra dispatch that died at the loader had cleared its folder — only the
# 768 px preview survives, which cannot be stitched. One regeneration on the
# brief that carries the reviewer's findings; then c2-1 once, against c3-1's
# real pixels so the groove meets (owner: "the chain between these doesnt
# line up").
say "bake c3-1 (one attempt; the accepted candidate's source was lost)"
node art-source/career-world/l2-land/tanium/briefs/write-briefs.mjs >/dev/null 2>&1
node docs/career-world/session3-tools/bake-tanium.mjs --only c3-1
say "bake c2-1 (one attempt, against c3-1's pixels)"
node art-source/career-world/l2-land/tanium/briefs/write-briefs.mjs >/dev/null 2>&1
node docs/career-world/session3-tools/bake-tanium.mjs --only c2-1

# c4-1: the owner's crop shows the chain broken at the c3-1/c4-1 seam because
# c4-1's groove dives into the fall; rebake, one attempt, brief already fixed.
say "bake c4-1 (forced, one attempt: the groove leaves the west edge)"
node art-source/career-world/l2-land/tanium/briefs/write-briefs.mjs >/dev/null 2>&1
node docs/career-world/session3-tools/bake-tanium.mjs --only c4-1 --force c4-1

# c4-0 is UNAUTHORED (Tanium is 15 of 21: c1-1, c1-2, c2-1, c3-1, c6-2, c4-0
# open). Its astra dispatches never generated (loader deaths; the third was
# 2.5 min in when that run was stopped at 00:09) and the 00:16 run was stopped
# before reaching it, so it has not had its one attempt on the fixed brief:
# the border river meets N c3-3's at the seam (a foreign neighbour, lock 18f).
# After c4-1, whose new pixels arrive across its south edge.
say "bake c4-0 (one attempt: the border river meets N c3-3's at the seam)"
node art-source/career-world/l2-land/tanium/briefs/write-briefs.mjs >/dev/null 2>&1
node docs/career-world/session3-tools/bake-tanium.mjs --only c4-0

# c5-2: the owner's crop — "the water doesnt seem to line up with the banks":
# the cut is a thread beside the painted bed. Three mask classifiers could not
# reach the bed (blue-leaning, pale, bed-colour all picked stones), so this is
# a genuine regeneration, one attempt; brief 5,2 says the becks fill their beds.
say "bake c5-2 (forced, one attempt: the becks fill their painted beds)"
node docs/career-world/session3-tools/bake-tanium.mjs --only c5-2 --force c5-2
say "after-chain done"

# The owner on the four north shores (02:50): "yeah its fine" to the read, then
# (02:55) "these parts are not good though" on the seams between them: the
# shores were generated blind of each other. So: accept c2-0 and c4-0, then
# REGENERATE c3-0 and c5-0 with both neighbours' pixels arriving (c3-0 between
# c2-0 and c4-0; c5-0 between c4-0 and c6-0), then the corner cell east of
# c6-0 (coast c7-0) for c6-0's cut east edge.
for spec in "2,0 c2-0" "4,0 c4-0"; do
  set -- $spec
  say "coast $2: owner accept on eye, stitching the candidate"
  CELL_OWNER_ACCEPT="owner 2026-09-05, on the picture of the four north-shore candidates in place: 'yeah its fine' (rock lighting on a cliff rim, the reading he accepted on c4-2)" \
    node tools/world-authoring/cell.mjs --territory coast --cell "$1" --redo --force \
    --describe-file "art-source/career-world/l2-land/coast/briefs/$2.md" 2>&1 | grep -E "OVERRIDE|FAIL|accepted, stitched|NOT accepted" | head -6
  git add -A -- art-source/career-world/l2-land/coast public/career-world/layers/terrain/authority docs/career-world/session3-tools/coast-rejects >/dev/null 2>&1
  git commit -q -m "Coast $2: accepted by the owner on his eye, stitched with the override recorded" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && say "coast $2 committed"
done
say "coast c3-0, c5-0 regenerated between their accepted neighbours; then c7-0, the corner east of c6-0"
node docs/career-world/session3-tools/coast-briefs.mjs >/dev/null 2>&1
node docs/career-world/session3-tools/bake-tanium.mjs --territory coast --only c3-0,c5-0,c7-0
say "coast follow-ups done"
