#!/usr/bin/env bash
cd "C:/Users/Steve/Documents/Github/portfolio/.claude/worktrees/land-lod-completion" || exit 1
for i in $(seq 1 600); do
  if grep -q "chain run done" .codex-tmp/session4/chain.log 2>/dev/null && [ ! -e .codex-tmp/authoring/cell.lock ]; then
    echo "[$(date -u +%H:%M:%SZ)Z] chain.sh done and the lock is free — starting chain2.sh"
    bash .codex-tmp/session4/chain2.sh 2>&1 | tee .codex-tmp/session4/chain2.log
    exit 0
  fi
  sleep 30
done
echo "chain2-waiter: gave up after 5 h"
