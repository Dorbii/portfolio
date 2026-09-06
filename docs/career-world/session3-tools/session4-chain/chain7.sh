#!/usr/bin/env bash
# Owner 2026-09-06 17:05, three crops of the live coast: c1-2's spike ("was
# this spot fixed and just not mounted?") and c7-8's straight column wall on
# the c6-8 seam and its rubble-strewn south shore ("same for these 2 spots").
# Both cells are authored; both get the shore conform again with an OPENING
# of 6 m (every protrusion and sliver thinner than that goes) — c7-8 now also
# sees the authored c6-8 on its west — and are stitched on his word. Then serve.
set -u
cd "C:/Users/Steve/Documents/Github/portfolio/.claude/worktrees/land-lod-completion" || exit 1
say() { echo "[$(date -u +%H:%M:%SZ)Z] $*"; }
if [ -e .codex-tmp/authoring/cell.lock ]; then say "lock present — not starting"; exit 1; fi
AUTH=public/career-world/layers/terrain/authority
for spec in "1,2 c1-2 'was this spot fixed and just not mounted?' — the spike of land with a column at its tip" "7,8 c7-8 'same for these 2 spots' — the straight column wall on the c6-8 seam and the rubble along the south shore"; do
  set -- $spec; cell="$1"; id="$2"; shift 2; words="$*"
  say "$id: shore conform with a 6 m opening (mask only), then redo on his word"
  cp ".codex-tmp/authoring/cells/coast/$id/$id-water-source-before-band.png" ".codex-tmp/authoring/cells/coast/$id/$id-water-source.png" 2>/dev/null
  node docs/career-world/session3-tools/conform-band.mjs coast "$id" --open 6 --preview "docs/career-world/session3-tools/coast-rejects/$id-conform.jpg" --write 2>&1 | grep -E "opening|kept within|written|Error" | head -4
  CELL_OWNER_ACCEPT="owner 2026-09-06 17:05, on the live coast: $words — re-cut (mask only) with the current shore shapes and a 6 m opening" \
    node tools/world-authoring/cell.mjs --territory coast --cell "$cell" --redo --force --describe-file "art-source/career-world/l2-land/coast/briefs/$id.md" 2>&1 | grep -E "OVERRIDE|accepted, stitched|NOT accepted" | head -3
  git add -A -- art-source/career-world/l2-land/coast "$AUTH" docs/career-world/session3-tools/coast-rejects >/dev/null 2>&1
  git commit -q -m "Coast $id: re-cut with a 6 m opening and stitched on the owner's word ($words)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" >/dev/null 2>&1 && say "$id committed"
done
say "serve"
bash .codex-tmp/session4/serve.sh 2>&1 | tee -a .codex-tmp/session4/serve.log | grep -E "^\[|committed"
say "chain7 done"
