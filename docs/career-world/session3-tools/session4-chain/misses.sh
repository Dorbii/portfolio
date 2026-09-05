#!/usr/bin/env bash
# The misses, one attempt each, on the pipeline with locks 18h and 18i (owner
# 2026-09-05 17:10: "sure go for it"): the cell across the border is seen,
# and a shore cell's target carries the island's sea. Order keeps seams
# consistent — each cell bakes with authored land on the side that matters:
#   c4-0   (18h) — N c3-3's beck across the border, the old c4-1 below it
#   c7-4   — N c4-3's sea across most of the edge; c7-3 above it if it landed
#   c8-7   — T c6-2's sea, 92% of the edge
#   c1-2   — N c0-1's bay; c1-1 above it is still a candidate
#   c4-8   — T c3-2's five falls
#   c7-0   — c6-0's four inlets; c7-1 below it is still a candidate
#   c1-3   — N c0-2's bay, after c1-2 so it sees it if it landed
# Then serve.
set -u
cd "C:/Users/Steve/Documents/Github/portfolio/.claude/worktrees/land-lod-completion" || exit 1
say() { echo "[$(date -u +%H:%M:%S)Z] $*"; }
if [ -e .codex-tmp/authoring/cell.lock ]; then say "lock present — not starting"; exit 1; fi
AUTH=public/career-world/layers/terrain/authority

# owner 2026-09-05 17:20 on c8-5's candidate, the only fault named: "the 3rd is
# cut off at the bottom" — the cut is c8-6's empty slot; c8-5 goes in so c8-6
# can bake beneath it
say "c8-5: owner's eye ('the 3rd is cut off at the bottom' — the cut is c8-6), stitching"
CELL_OWNER_ACCEPT="owner 2026-09-05 17:20, on the candidate's view with its neighbours: 'the 3rd is cut off at the bottom' — the only fault named is c8-6's empty slot beneath it; five crowns at 5.6 m was the gate" \
  node tools/world-authoring/cell.mjs --territory coast --cell 8,5 --redo --force \
  --describe-file art-source/career-world/l2-land/coast/briefs/c8-5.md 2>&1 | grep -E "OVERRIDE|FAIL|accepted, stitched|NOT accepted" | head -6
git add -A -- art-source/career-world/l2-land/coast "$AUTH" docs/career-world/session3-tools/coast-rejects >/dev/null 2>&1
git commit -q -m "Coast c8-5: the owner's bulge, stitched on his eye ('cut off at the bottom' — c8-6 follows)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && say "c8-5 committed"

say "c4-0 with the border seen (18h); then c2-1 with the chain as a groove, not a wall"
node art-source/career-world/l2-land/tanium/briefs/write-briefs.mjs >/dev/null 2>&1
node docs/career-world/session3-tools/bake-tanium.mjs --only c4-0
node art-source/career-world/l2-land/tanium/briefs/write-briefs.mjs >/dev/null 2>&1
node docs/career-world/session3-tools/bake-tanium.mjs --only c2-1

say "the coast misses with the sea painted in (18i), then c7-8's send-back and c8-6 beneath c8-5"
node docs/career-world/session3-tools/coast-briefs.mjs >/dev/null 2>&1
git add -A -- art-source/career-world/l2-land/coast/briefs art-source/career-world/l2-land/tanium/briefs >/dev/null 2>&1
git commit -q -m "Briefs refreshed before the misses run" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" >/dev/null 2>&1
node docs/career-world/session3-tools/bake-tanium.mjs --territory coast --only c7-4,c8-7,c1-2,c4-8,c7-0,c1-3,c7-8,c8-6
say "serve"
bash .codex-tmp/session4/serve.sh 2>&1 | grep -E "^\[|committed"
say "misses done"
