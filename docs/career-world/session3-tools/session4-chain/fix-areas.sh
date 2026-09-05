#!/usr/bin/env bash
# Owner 2026-09-05 16:55, six crops from the equalised live server: "these
# area needs to be fixed". What can be fixed without the two pending
# proposals, in an order that keeps seams consistent:
#   1. T c4-1: its rebake against the accepted c3-1 (refused on vegetation
#      colour 0.230 only) replaces the served c4-1 whose groove dives into the
#      fall — the crop of the plateau with the pond is that cell.
#   2. T c6-2 forced, one attempt, against the NEW c6-1: its bay met c6-1's
#      land along 44 m (the lake cut by a straight line in his crop).
#   3. Coast c7-2, c7-3 (east of N c4-1, c4-2 — the straight cuts into the sea
#      in his east-coast crop), c1-8, c6-8 (row 8): unbaked shore cells that
#      extend authored island cells directly. c7-3 bakes after c7-2 so it sees
#      it if it lands.
#   4. serve.sh: the equalised world rebuilt with every candidate previewed.
set -u
cd "C:/Users/Steve/Documents/Github/portfolio/.claude/worktrees/land-lod-completion" || exit 1
say() { echo "[$(date -u +%H:%M:%S)Z] $*"; }
if [ -e .codex-tmp/authoring/cell.lock ]; then say "lock present — not starting"; exit 1; fi
AUTH=public/career-world/layers/terrain/authority
TB=art-source/career-world/l2-land/tanium/briefs

say "1. c4-1: the rebake against c3-1, stitched on the owner's 'these area needs to be fixed' (his crop is the served c4-1)"
CELL_OWNER_ACCEPT="owner 2026-09-05 16:55, a crop of the served c4-1 (the plateau with the pond) among six 'these area needs to be fixed'; this candidate was baked in chain order against the accepted c3-1 and was refused on vegetation colour 0.230 alone" \
  node tools/world-authoring/cell.mjs --territory tanium --cell 4,1 --redo --force \
  --describe-file "$TB/c4-1.md" 2>&1 | grep -E "OVERRIDE|FAIL|accepted, stitched|NOT accepted" | head -6
git add -A -- art-source/career-world/l2-land/tanium "$AUTH" docs/career-world/session3-tools/tanium-rejects >/dev/null 2>&1
git commit -q -m "Tanium c4-1: the rebake against c3-1 stitched on the owner's 'these area needs to be fixed' (vegetation colour 0.230 was its only refusal)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && say "c4-1 committed"

say "2. c6-2 forced, one attempt, against the new c6-1"
node "$TB/write-briefs.mjs" >/dev/null 2>&1
node docs/career-world/session3-tools/bake-tanium.mjs --only c6-2 --force c6-2

say "3. coast c7-2, c7-3, c1-8, c6-8 — unbaked shore cells beside authored land"
node docs/career-world/session3-tools/coast-briefs.mjs >/dev/null 2>&1
git add -A -- art-source/career-world/l2-land/coast/briefs >/dev/null 2>&1
git commit -q -m "Coast briefs refreshed before wave 2a" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" >/dev/null 2>&1
node docs/career-world/session3-tools/bake-tanium.mjs --territory coast --only c7-2,c7-3,c1-8,c6-8

say "4. serve"
bash .codex-tmp/session4/serve.sh 2>&1 | grep -E "^\[|committed"
say "fix-areas done"
