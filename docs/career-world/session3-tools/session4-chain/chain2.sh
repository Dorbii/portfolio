#!/usr/bin/env bash
# The chain cells again on lock 18n (owner 2026-09-06 01:00: the bright purple
# guide layer over the chain, read for the matching, removed for the final
# render): c2-1, c1-1, c6-1 forced, c1-2 forced — one attempt each; then the
# conform pass and serve. Runs after chain.sh has served and freed the lock.
set -u
cd "C:/Users/Steve/Documents/Github/portfolio/.claude/worktrees/land-lod-completion" || exit 1
say() { echo "[$(date -u +%H:%M:%SZ)Z] $*"; }
if [ -e .codex-tmp/authoring/cell.lock ]; then say "lock present — not starting"; exit 1; fi
if ! grep -q "GUIDE LAYER COMES OFF" tools/world-authoring/cell.mjs; then say "lock 18n is not applied — not starting"; exit 1; fi
say "the chain cells with the purple guide: c2-1, c1-1, c6-1 (forced), c1-2 (forced)"
node docs/career-world/session3-tools/bake-tanium.mjs --only c2-1,c1-1,c6-1,c1-2 --force c6-1,c1-2
say "conform pass"
node docs/career-world/session3-tools/conform-pass.mjs --max 12 2>&1 | tail -8
say "serve"
bash .codex-tmp/session4/serve.sh 2>&1 | tee -a .codex-tmp/session4/serve.log | grep -E "^\[|committed"
say "chain2 done"
