#!/usr/bin/env bash
# Owner 2026-09-06 06:40: "lets do it that way then but youll need to regen the
# cells with the chain first" — the rune chain leaves the land (it becomes one
# layer over it): the seven chain cells are regenerated with no chain in them,
# forced, one attempt each; and "besides this cell the coast tiles are good"
# (c1-2's early conform left a spike) — c1-2 re-cut with the current shapes
# and stitched on his word. Then serve.
set -u
cd "C:/Users/Steve/Documents/Github/portfolio/.claude/worktrees/land-lod-completion" || exit 1
say() { echo "[$(date -u +%H:%M:%SZ)Z] $*"; }
if [ -e .codex-tmp/authoring/cell.lock ]; then say "lock present — not starting"; exit 1; fi
if node -e 'const d=JSON.parse(require("fs").readFileSync("art-source/career-world/l2-land/tanium/territory.def.json","utf8")); process.exit("runeChain" in d ? 1 : 0)'; then :; else say "the def still carries runeChain — not starting"; exit 1; fi
AUTH=public/career-world/layers/terrain/authority
say "1. c1-2: re-cut with the current shapes, stitched on his word"
cp .codex-tmp/authoring/cells/coast/c1-2/c1-2-water-source-before-band.png .codex-tmp/authoring/cells/coast/c1-2/c1-2-water-source.png 2>/dev/null
node docs/career-world/session3-tools/conform-band.mjs coast c1-2 --preview docs/career-world/session3-tools/coast-rejects/c1-2-conform.jpg --write 2>&1 | grep -E "kept within|written|Error" | head -3
CELL_OWNER_ACCEPT="owner 2026-09-06 06:40, on the served picture: 'besides this cell the coast tiles are good' — c1-2 re-cut (mask only) with the current shore shapes" \
  node tools/world-authoring/cell.mjs --territory coast --cell 1,2 --redo --force --describe-file art-source/career-world/l2-land/coast/briefs/c1-2.md 2>&1 | grep -E "OVERRIDE|accepted, stitched|NOT accepted" | head -3
git add -A -- art-source/career-world/l2-land/coast "$AUTH" docs/career-world/session3-tools/coast-rejects >/dev/null 2>&1
git commit -q -m "Coast c1-2: re-cut with the current shore shapes and stitched on the owner's word" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" >/dev/null 2>&1 && say "c1-2 committed"
say "2. the seven chain cells without the chain: c3-1, c4-1, c5-1, c2-1, c1-1, c6-1, c0-1"
node art-source/career-world/l2-land/tanium/briefs/write-briefs.mjs >/dev/null 2>&1
git add -A -- art-source/career-world/l2-land/tanium/briefs art-source/career-world/l2-land/tanium/territory.def.json art-source/career-world/l2-land/tanium/rune-chain.def.json >/dev/null 2>&1
git commit -q -m "The rune chain leaves the land: route moved to rune-chain.def.json, the seven briefs carry no chain" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" >/dev/null 2>&1
node docs/career-world/session3-tools/bake-tanium.mjs --only c3-1,c4-1,c5-1,c2-1,c1-1,c6-1,c0-1 --force c3-1,c4-1,c5-1,c2-1,c1-1,c6-1,c0-1
say "3. serve"
bash .codex-tmp/session4/serve.sh 2>&1 | tee -a .codex-tmp/session4/serve.log | grep -E "^\[|committed"
say "chain6 done"
