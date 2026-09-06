#!/usr/bin/env bash
# The served world, rebuilt from the authored pyramids — the standard sequence
# after any cell lands (owner 2026-09-05: "Both. Equalise now, then rebake only
# what still reads wrong after that"):
#   1. tone-harmonise.mjs   — one luma gain per authored cell, solved across every
#                             seam (strength 0.6, cap ±30%), written to the tracked
#                             table art-source/career-world/tone-gains-r1.json
#   2. world-register.mjs --tone <table> — every cell re-sliced with the gain
#                             field; the pyramids untouched; ledgers registered
#   3. mount-candidates.mjs — every candidate previewed, taking its neighbours' gain
#   4. build:land-mount, build:water — the Codex lane's mount and water fields
#   5. commit
# Never while a cell is being stitched: registration rewrites the ledgers.
set -u
cd "C:/Users/Steve/Documents/Github/portfolio/.claude/worktrees/land-lod-completion" || exit 1
say() { echo "[$(date -u +%H:%M:%S)Z] $*"; }
if [ -e .codex-tmp/authoring/cell.lock ]; then say "lock present — a cell is being stitched; not serving"; exit 1; fi
STRENGTH="${STRENGTH:-0.6}"
TABLE=art-source/career-world/tone-gains-r1.json
say "1. tone gains (strength $STRENGTH)"
node docs/career-world/session3-tools/tone-harmonise.mjs --strength "$STRENGTH" --cap 0.3 --lambda 0.35 --out .codex-tmp/session4/island/tone-before-after.jpg 2>&1 | head -2
cp .codex-tmp/session4/tone-gains.json "$TABLE"
say "1b. the chain layer (the kerb and the nodes laid along the route, masked by the land)"
node docs/career-world/session3-tools/build-chain-layer.mjs 2>&1 | tail -8
say "2. register with the gain field"
node docs/career-world/session3-tools/world-register.mjs --tone "$TABLE" --chain art-source/career-world/chain/cells 2>&1 | tail -4
say "3. candidate previews"
node docs/career-world/session3-tools/mount-candidates.mjs --tone "$TABLE" 2>&1 | tail -2
say "4. land mount and water fields"
npm run build:land-mount 2>&1 | tail -1
npm run build:water 2>&1 | tail -1
say "5. commit"
git add -A -- public/career-world/layers/terrain/authority public/career-world/layers/water art-source/career-world/land-mount-r1.json "$TABLE" >/dev/null 2>&1
git commit -q -m "Served world: exposure equalised at serve time (strength $STRENGTH), every candidate previewed, mount and water fields rebuilt" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && say "served world committed"
say "serve done"
