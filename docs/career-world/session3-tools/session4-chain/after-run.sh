#!/usr/bin/env bash
# The chain that follows the run of 00:16 (c4-2, c1-2, c2-1, c3-1, c6-2, c4-0),
# in the order the owner's markup asks for. Launch only when that run has
# ended (its task notification) and the lock is free. Each step commits.
set -u
cd "C:/Users/Steve/Documents/Github/portfolio/.claude/worktrees/land-lod-completion" || exit 1
say() { echo "[$(date +%H:%M:%S)] $*"; }
if [ -e .codex-tmp/authoring/cell.lock ]; then say "lock present — not starting"; exit 1; fi

# 0. c4-2: the owner accepted the refused candidate on his eye (shown in place
#    and at its east seam): "yeah its fine". Stitched past the gates with his
#    words recorded in the manifest (lock 18g). No regeneration.
say "c4-2: owner override, stitching the accepted candidate"
CELL_OWNER_ACCEPT="owner 2026-09-04, on the picture of the candidate in place and its east seam beside c5-2: 'yeah its fine'" \
  node tools/world-authoring/cell.mjs --territory tanium --cell 4,2 --redo --force \
  --describe-file art-source/career-world/l2-land/tanium/briefs/c4-2.md 2>&1 | grep -E "OVERRIDE|owner:|FAIL|accepted, stitched|NOT accepted" | head -8
git add -A -- art-source/career-world/l2-land/tanium/c4-2 public/career-world/layers/terrain/authority >/dev/null 2>&1
git commit -q -m "Tanium c4-2: accepted by the owner on his eye, stitched past rock lighting and the east-seam colour (override recorded)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && say "c4-2 committed"

# 1. the four mask fixes from the owner's markup: re-derive, no regeneration
for cell in "0,1 c0-1" "2,2 c2-2" "3,2 c3-2" "5,1 c5-1"; do
  set -- $cell
  say "redo $2 (mask fix, no regeneration)"
  node tools/world-authoring/cell.mjs --territory tanium --cell "$1" --redo --force \
    --describe-file "art-source/career-world/l2-land/tanium/briefs/$2.md" 2>&1 | grep -E "FAIL|accepted, stitched|NOT accepted|written" | head -6
done
git add -A -- art-source/career-world/l2-land/tanium public/career-world/layers/terrain/authority docs/career-world/session3-tools/tanium-rejects >/dev/null 2>&1
git commit -q -m "Mask fixes from the owner's markup: c0-1, c2-2, c3-2, c5-1 re-derived with the painted water they missed (seeded fills, no regeneration)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && say "mask fixes committed"

# 2. c6-1 (the chain's seaward end replaces the colonnade) and c4-1 (the groove
#    leaves the west edge), forced, through the review loop, on gpt-5.6-sol
say "bake c6-1 (forced, one attempt; c4-1 waits for the owner: rebake or good enough)"
node docs/career-world/session3-tools/bake-tanium.mjs --only c6-1 --force c6-1

# 3. the coast: the shore cells beside the island, one attempt each (owner 2026-09-05: refusals go to his picture, no burnt cycles)
say "bake the coast territory"
node docs/career-world/session3-tools/bake-tanium.mjs --territory coast \
  --only c2-0,c3-0,c4-0,c5-0,c6-0,c1-1,c1-2,c1-4,c7-1,c0-6,c4-8

# (c5-2 and c4-1 wait for the owner: rebake or good enough — owner 2026-09-05, "several that I ruled good enough")
# 5. c1-1: the owner said "regen this one" - through the loop; the key-light gate is unchanged
say "bake c1-1 (one attempt)"
node docs/career-world/session3-tools/bake-tanium.mjs --only c1-1

say "chain done"
