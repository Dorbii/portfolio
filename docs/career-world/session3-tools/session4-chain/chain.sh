#!/usr/bin/env bash
# The chain run, on the owner's word (2026-09-05 21:40: "18m is fine the line
# sjust need to connect"; "Tc4-0 looks fine, c3-0 fine, c0-6 needs work and or
# needs to finish the coast in the cells above and below it, C1-4 almost but
# needs to finish the coast or expand to do so"). Runs after misses.sh has
# released the lock:
#   1. his accepts stitched: T c4-0, C c3-0, C c0-6 (the coast above and below
#      it is finished in step 3)
#   2. the chain in order with the floor drawn (18m): c4-1 forced (his no-go),
#      c2-1, c1-1, c6-1 forced (no chain at all), c1-2 forced (the dark seam)
#   3. the coast: c0-5 above c0-6 (T c0-0's cliffs), c0-7 below it (new in the
#      plan), c1-4 again (finish the coast between c1-3 and T c0-0)
#   4. conform pass, serve
set -u
cd "C:/Users/Steve/Documents/Github/portfolio/.claude/worktrees/land-lod-completion" || exit 1
say() { echo "[$(date -u +%H:%M:%SZ)Z] $*"; }
if [ -e .codex-tmp/authoring/cell.lock ]; then say "lock present — not starting"; exit 1; fi
if ! grep -q "CHAIN PRE-FILL" tools/world-authoring/cell.mjs; then say "lock 18m is not applied — not starting"; exit 1; fi
AUTH=public/career-world/layers/terrain/authority

say "1. the owner's accepts"
CELL_OWNER_ACCEPT="owner 2026-09-05 21:40, on the candidate's 3x3 view: 'Tc4-0 looks fine' (refused only on vegetation colour across the territory border; the border river met)" \
  node tools/world-authoring/cell.mjs --territory tanium --cell 4,0 --redo --force --describe-file art-source/career-world/l2-land/tanium/briefs/c4-0.md 2>&1 | grep -E "OVERRIDE|FAIL|accepted, stitched|NOT accepted" | head -4
git add -A -- art-source/career-world/l2-land/tanium "$AUTH" docs/career-world/session3-tools/tanium-rejects >/dev/null 2>&1
git commit -q -m "Tanium c4-0: stitched on the owner's eye ('Tc4-0 looks fine')" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" >/dev/null 2>&1 && say "c4-0 committed"
for spec in "3,0 c3-0 c3-0 fine (refused on a sea run split by a skerry, which lock 18k reads as one run)" "0,6 c0-6 c0-6 needs work and or needs to finish the coast in the cells above and below it — taken as: keep it, and finish the coast in c0-5 above and c0-7 below"; do
  set -- $spec; cell="$1"; id="$2"; shift 2; words="$*"
  CELL_OWNER_ACCEPT="owner 2026-09-05 21:40, on the candidate's 3x3 view: '$words'" \
    node tools/world-authoring/cell.mjs --territory coast --cell "$cell" --redo --force --describe-file "art-source/career-world/l2-land/coast/briefs/$id.md" 2>&1 | grep -E "OVERRIDE|FAIL|accepted, stitched|NOT accepted" | head -4
  git add -A -- art-source/career-world/l2-land/coast "$AUTH" docs/career-world/session3-tools/coast-rejects >/dev/null 2>&1
  git commit -q -m "Coast $id: stitched on the owner's eye ($words)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" >/dev/null 2>&1 && say "coast $id committed"
done

say "2. the chain in order: c4-1 (forced), c2-1, c1-1, c6-1 (forced), c1-2 (forced)"
node art-source/career-world/l2-land/tanium/briefs/write-briefs.mjs >/dev/null 2>&1
git add -A -- art-source/career-world/l2-land/tanium/briefs >/dev/null 2>&1
git commit -q -m "Briefs refreshed before the chain run" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" >/dev/null 2>&1
node docs/career-world/session3-tools/bake-tanium.mjs --only c4-1,c2-1,c1-1,c6-1,c1-2 --force c4-1,c6-1,c1-2

say "3. the coast: c0-5, c0-7, c1-4"
node docs/career-world/session3-tools/coast-briefs.mjs >/dev/null 2>&1
git add -A -- art-source/career-world/l2-land/coast/briefs >/dev/null 2>&1
git commit -q -m "Coast briefs refreshed before c0-5, c0-7, c1-4" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" >/dev/null 2>&1
node docs/career-world/session3-tools/bake-tanium.mjs --territory coast --only c0-5,c0-7,c1-4

say "4. conform pass, then serve"
node docs/career-world/session3-tools/conform-pass.mjs --max 12 2>&1 | tail -12
bash .codex-tmp/session4/serve.sh 2>&1 | grep -E "^\[|committed"
say "chain run done"
