#!/usr/bin/env bash
# The chain run — after the owner's word on lock 18m (the rune chain's floor
# drawn into the edit target) and after misses.sh has released the lock:
#   T c4-1 forced (his no-go: the pale block and the chain's step; the brief
#          carries his ruling and the overpass), then c2-1 and c1-1 against
#          c3-1/c4-1 with the floor drawn, then c6-1 forced (the chain's end:
#          the new c6-1 has no groove at all — reviewer row 9), then c1-2
#          forced (the forest's seams, his "needs a cleaner transition");
#   coast c0-5 (T c0-0's cliffs into the sea; never attempted) and c8-4 if
#          land arrives; then the conform pass and serve.
set -u
cd "C:/Users/Steve/Documents/Github/portfolio/.claude/worktrees/land-lod-completion" || exit 1
say() { echo "[$(date -u +%H:%M:%SZ)Z] $*"; }
if [ -e .codex-tmp/authoring/cell.lock ]; then say "lock present — not starting"; exit 1; fi
if ! grep -q "chain pre-fill\|CHAIN PRE-FILL" tools/world-authoring/cell.mjs; then say "lock 18m is not applied — not starting"; exit 1; fi
AUTH=public/career-world/layers/terrain/authority
node art-source/career-world/l2-land/tanium/briefs/write-briefs.mjs >/dev/null 2>&1
git add -A -- art-source/career-world/l2-land/tanium/briefs >/dev/null 2>&1
git commit -q -m "Briefs refreshed before the chain run" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" >/dev/null 2>&1
say "the chain in order: c4-1 (forced), c2-1, c1-1, c6-1 (forced), c1-2 (forced)"
node docs/career-world/session3-tools/bake-tanium.mjs --only c4-1,c2-1,c1-1,c6-1,c1-2 --force c4-1,c6-1,c1-2
say "coast c0-5 (T c0-0's cliffs into the sea)"
node docs/career-world/session3-tools/coast-briefs.mjs >/dev/null 2>&1
git add -A -- art-source/career-world/l2-land/coast/briefs >/dev/null 2>&1
git commit -q -m "Coast briefs refreshed before c0-5" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" >/dev/null 2>&1
node docs/career-world/session3-tools/bake-tanium.mjs --territory coast --only c0-5
say "conform pass"
node docs/career-world/session3-tools/conform-pass.mjs --max 12 2>&1 | tail -12
say "serve"
bash .codex-tmp/session4/serve.sh 2>&1 | grep -E "^\[|committed"
say "chain run done"
