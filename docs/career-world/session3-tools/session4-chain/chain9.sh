#!/usr/bin/env bash
# Owner 2026-09-06 17:25 (his clock): "the center tiles that had the old
# attempt at the chain still need regen cause now it just has conflicting
# chains with the overlay" — the plain regens of the chain cells that the
# gates refused (tone / vegetation colour, the calibration he overrides by eye)
# are stitched on his words: the land carries no chain; the layer does. Then serve.
set -u
cd "C:/Users/Steve/Documents/Github/portfolio/.claude/worktrees/land-lod-completion" || exit 1
say() { echo "[$(date -u +%H:%M:%SZ)Z] $*"; }
if [ -e .codex-tmp/authoring/cell.lock ]; then say "lock present — not starting"; exit 1; fi
AUTH=public/career-world/layers/terrain/authority
for id in c3-1 c5-1 c2-1 c1-1 c6-1 c0-1; do
  cell="${id#c}"; cell="${cell/-/,}"
  src=".codex-tmp/authoring/cells/tanium/$id/$id-source.png"
  if [ ! -f "$src" ]; then say "$id: no plain attempt in the working folder — skipped"; continue; fi
  # skip a cell whose plain attempt already landed (its layer is newer than the candidate)
  if [ "art-source/career-world/l2-land/tanium/$id/$id-l2.png" -nt ".codex-tmp/authoring/cells/tanium/$id/$id-l2.png" ]; then say "$id: the plain regen already landed — skipped"; continue; fi
  say "$id: the plain regen stitched on his word"
  CELL_OWNER_ACCEPT="owner 2026-09-06 17:25, on the served world: 'the center tiles that had the old attempt at the chain still need regen cause now it just has conflicting chains with the overlay' — the plain regen goes in; the chain is the layer" \
    node tools/world-authoring/cell.mjs --territory tanium --cell "$cell" --redo --force --describe-file "art-source/career-world/l2-land/tanium/briefs/$id.md" 2>&1 | grep -E "OVERRIDE|accepted, stitched|NOT accepted" | head -3
  git add -A -- art-source/career-world/l2-land/tanium "$AUTH" docs/career-world/session3-tools/tanium-rejects >/dev/null 2>&1
  git commit -q -m "Tanium $id: the plain regen stitched on the owner's word (no chain in the land; the chain is the layer)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" >/dev/null 2>&1 && say "$id committed"
done
say "serve"
bash .codex-tmp/session4/serve.sh 2>&1 | tee -a .codex-tmp/session4/serve.log | grep -E "^\[|committed"
say "chain9 done"
