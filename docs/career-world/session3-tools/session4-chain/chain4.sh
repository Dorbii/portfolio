#!/usr/bin/env bash
# Owner 2026-09-06 02:50 (eight rulings on the served picture and the sheet):
#   "C1-1, 2-1, 1-2 are all good"           → stitched on his eye
#   "C6-8 remove the right land mass the left is good" → the right mass cut in
#                                              the mask, stitched on his eye
#   "remove c2-8s gen no need for it"        → the candidate deleted, the cell
#                                              out of the plan (27 shore cells)
#   "C4-1 still not lining up the chain"     → a third forced attempt: the chain
#                                              rendered as the neighbours render it
#   "c0-5 needs regen", "c4-8 needs to fix the coast", "C1-3 shoulda just been a
#   bit of land to finish the neighbor coast" → chain5.sh, after his 18i-c word
#   then serve
set -u
cd "C:/Users/Steve/Documents/Github/portfolio/.claude/worktrees/land-lod-completion" || exit 1
say() { echo "[$(date -u +%H:%M:%SZ)Z] $*"; }
if [ -e .codex-tmp/authoring/cell.lock ]; then say "lock present — not starting"; exit 1; fi
AUTH=public/career-world/layers/terrain/authority
say "1. the forest cells on his eye"
for id in c1-1 c2-1 c1-2; do
  cell="${id#c}"; cell="${cell/-/,}"
  CELL_OWNER_ACCEPT="owner 2026-09-06 02:50, on the candidates sheet: 'C1-1, 2-1, 1-2 are all good'" \
    node tools/world-authoring/cell.mjs --territory tanium --cell "$cell" --redo --force --describe-file "art-source/career-world/l2-land/tanium/briefs/$id.md" 2>&1 | grep -E "OVERRIDE|accepted, stitched|NOT accepted" | head -3
  git add -A -- art-source/career-world/l2-land/tanium "$AUTH" docs/career-world/session3-tools/tanium-rejects >/dev/null 2>&1
  git commit -q -m "Tanium $id: stitched on the owner's eye ('C1-1, 2-1, 1-2 are all good')" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" >/dev/null 2>&1 && say "$id committed"
done
say "2. c6-8: the right land mass cut, the left stitched on his eye"
CELL_OWNER_ACCEPT="owner 2026-09-06 02:50, on the sheet: 'C6-8 remove the right land mass the left is good' — everything east of 45% of the cell made wet in the mask" \
  node tools/world-authoring/cell.mjs --territory coast --cell 6,8 --redo --force --describe-file art-source/career-world/l2-land/coast/briefs/c6-8.md 2>&1 | grep -E "OVERRIDE|accepted, stitched|NOT accepted" | head -3
git add -A -- art-source/career-world/l2-land/coast "$AUTH" docs/career-world/session3-tools/coast-rejects >/dev/null 2>&1
git commit -q -m "Coast c6-8: the right land mass cut (mask only), the left stitched on the owner's eye" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" >/dev/null 2>&1 && say "c6-8 committed"
say "3. c2-8: the candidate removed ('remove c2-8s gen no need for it'); the cell is out of the plan"
mkdir -p .codex-tmp/rejected/coast/c2-8-removed-2026-09-06 && mv .codex-tmp/authoring/cells/coast/c2-8/c2-8-l2.png .codex-tmp/rejected/coast/c2-8-removed-2026-09-06/ 2>/dev/null
rm -f "$AUTH/tiles/l2-review/coast-c2-8-site.webp"
git add -A -- docs/career-world/session3-tools/coast-plan.mjs docs/career-world/session3-tools/coast-briefs.mjs art-source/career-world/l2-land/coast/territory.def.json art-source/career-world/l2-land/coast/plan.json art-source/career-world/l2-land/coast/briefs art-source/career-world/l2-land/tanium/briefs >/dev/null 2>&1
git commit -q -m "Owner 02:50: c2-8 out of the coast plan (27 shore cells), its candidate removed; c1-3, c4-8, c0-5 carry his words; c4-1's third ruling in its brief" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" >/dev/null 2>&1 && say "plan and briefs committed"
say "4. T c4-1, third attempt (forced): the chain rendered as the neighbours render it"
node docs/career-world/session3-tools/bake-tanium.mjs --only c4-1 --force c4-1
say "5. serve"
bash .codex-tmp/session4/serve.sh 2>&1 | tee -a .codex-tmp/session4/serve.log | grep -E "^\[|committed"
say "chain4 done"
