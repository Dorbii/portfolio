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
  node tools/world-authoring/cell.mjs --territory coast --cell "$cell" --redo --force --describe-file "art-source/career-world/l2-land/coast/briefs/$id.md" 2>&1 | grep -E "FAIL|accepted, stitched|NOT accepted" | head -6
  git add -A -- art-source/career-world/l2-land/coast "$AUTH" docs/career-world/session3-tools/coast-rejects >/dev/null 2>&1
  git commit -q -m "Coast $id: shore conformed (mask only) after the served picture — $([ "$id" = c1-8 ] && echo "the mirrored stack grid cut" || echo "the sliver bars gone")" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" >/dev/null 2>&1 && say "$id committed"
done
say "serve"
bash .codex-tmp/session4/serve.sh 2>&1 | tee -a .codex-tmp/session4/serve.log | grep -E "^\[|committed"
say "chain3 done"
