#!/usr/bin/env bash
# Cleanup after chain2 (2026-09-06 01:45): two faults of my own tools seen on
# the served picture — c1-8's grid of mirrored sea stacks (the 18i-b sea patch
# carried a stack; the model kept the tiled sea) and c0-5's bars of land (a
# sliver stretch given the full limit; conform-band now caps depth by width).
#   1. c1-8 (authored): the shore conform trims everything beyond the limit —
#      the stack grid stands in rows the neighbour delivers as sea — then
#      --redo --force re-gates and stitches
#   2. c0-5 (candidate): re-conformed with the width cap, redo
#   3. serve
set -u
cd "C:/Users/Steve/Documents/Github/portfolio/.claude/worktrees/land-lod-completion" || exit 1
say() { echo "[$(date -u +%H:%M:%SZ)Z] $*"; }
if [ -e .codex-tmp/authoring/cell.lock ]; then say "lock present — not starting"; exit 1; fi
AUTH=public/career-world/layers/terrain/authority
for id in c1-8 c0-5; do
  cell="${id#c}"; cell="${cell/-/,}"
  say "$id: shore conform (mask only), then redo"
  node docs/career-world/session3-tools/conform-band.mjs coast "$id" --preview "docs/career-world/session3-tools/coast-rejects/$id-conform.jpg" --write 2>&1 | grep -E "kept within|written|Error" | head -3
  # c1-8 keeps no land at all once the grid is cut (T c0-2's ground meets it
  # over 0.9 m and the candidate painted nothing there), which the coverage
  # gate refuses — it goes in on the owner's word instead
  if [ "$id" = c1-8 ]; then
    CELL_OWNER_ACCEPT="owner 2026-09-06 02:00, on the served picture of c1-8's grid of mirrored sea stacks: 'Not sure what this is but it shouldnt be here' — the stacks cut (mask only); the cell is open sea"       node tools/world-authoring/cell.mjs --territory coast --cell "$cell" --redo --force --describe-file "art-source/career-world/l2-land/coast/briefs/$id.md" 2>&1 | grep -E "OVERRIDE|FAIL|accepted, stitched|NOT accepted" | head -6
  else
    node tools/world-authoring/cell.mjs --territory coast --cell "$cell" --redo --force --describe-file "art-source/career-world/l2-land/coast/briefs/$id.md" 2>&1 | grep -E "FAIL|accepted, stitched|NOT accepted" | head -6
  fi
  git add -A -- art-source/career-world/l2-land/coast "$AUTH" docs/career-world/session3-tools/coast-rejects >/dev/null 2>&1
  git commit -q -m "Coast $id: shore conformed (mask only) after the served picture — $([ "$id" = c1-8 ] && echo "the mirrored stack grid cut" || echo "the sliver bars gone")" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" >/dev/null 2>&1 && say "$id committed"
done
# owner 2026-09-06 02:00 on the served c4-1: "c4-1 needs those to match" — the
# groove hid under the top bench's wall and the wall read as the chain; one
# more forced attempt with the purple guide and the visibility ruling in its brief
say "T c4-1 again (forced): the groove visible edge to edge"
node art-source/career-world/l2-land/tanium/briefs/write-briefs.mjs >/dev/null 2>&1
git add -A -- art-source/career-world/l2-land/tanium/briefs >/dev/null 2>&1
git commit -q -m "Briefs refreshed before c4-1's second attempt" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" >/dev/null 2>&1
node docs/career-world/session3-tools/bake-tanium.mjs --only c4-1 --force c4-1
say "serve"
bash .codex-tmp/session4/serve.sh 2>&1 | tee -a .codex-tmp/session4/serve.log | grep -E "^\[|committed"
say "chain3 done"
