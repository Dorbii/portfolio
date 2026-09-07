#!/usr/bin/env bash
# the three standing elements generated in parallel (one image_gen call each)
cd /c/Users/Steve/Documents/Github/portfolio/.claude/worktrees/land-lod-completion
echo "[$(date -u +%H:%M:%SZ)] standing elements: dispatch"
for w in menhir trilithon henge; do
  ( node docs/career-world/session3-tools/chain-element.mjs $w > .codex-tmp/chain/$w.log 2>&1; echo "[$(date -u +%H:%M:%SZ)] $w exited $?" ) &
done
wait
echo "[$(date -u +%H:%M:%SZ)] standing elements done"
