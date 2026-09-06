#!/usr/bin/env bash
# The two chain cells the hold skipped (2026-09-06 16:45, so the world could be
# served for the ocean thread): c6-1 and c0-1 regenerated plain, forced, one
# attempt each; then serve.
set -u
cd "C:/Users/Steve/Documents/Github/portfolio/.claude/worktrees/land-lod-completion" || exit 1
say() { echo "[$(date -u +%H:%M:%SZ)Z] $*"; }
if [ -e .codex-tmp/authoring/cell.lock ]; then say "lock present — not starting"; exit 1; fi
say "c6-1 and c0-1 plain (forced)"
node docs/career-world/session3-tools/bake-tanium.mjs --only c6-1,c0-1 --force c6-1,c0-1
say "serve"
bash .codex-tmp/session4/serve.sh 2>&1 | tee -a .codex-tmp/session4/serve.log | grep -E "^\[|committed"
say "chain8 done"
