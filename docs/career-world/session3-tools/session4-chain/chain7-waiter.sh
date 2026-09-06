#!/usr/bin/env bash
cd "C:/Users/Steve/Documents/Github/portfolio/.claude/worktrees/land-lod-completion" || exit 1
for i in $(seq 1 600); do
  if grep -q "chain6 done" .codex-tmp/session4/chain6.log 2>/dev/null && [ ! -e .codex-tmp/authoring/cell.lock ]; then
    echo "[$(date -u +%H:%M:%SZ)Z] chain6 done and the lock is free — starting chain7.sh"
    bash .codex-tmp/session4/chain7.sh 2>&1 | tee .codex-tmp/session4/chain7.log
    exit 0
  fi
  sleep 30
done
echo "chain7-waiter: gave up after 5 h"
