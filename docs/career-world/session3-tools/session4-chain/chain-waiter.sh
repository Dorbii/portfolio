#!/usr/bin/env bash
# waits for misses.sh to finish (its log ends with "misses done"), then runs chain.sh; gives up after 5 h
cd "C:/Users/Steve/Documents/Github/portfolio/.claude/worktrees/land-lod-completion" || exit 1
for i in $(seq 1 600); do
  if grep -q "misses done" .codex-tmp/session4/misses.log 2>/dev/null && [ ! -e .codex-tmp/authoring/cell.lock ]; then
    echo "[$(date -u +%H:%M:%SZ)Z] misses done and the lock is free — starting chain.sh"
    bash .codex-tmp/session4/chain.sh 2>&1 | tee .codex-tmp/session4/chain.log
    exit 0
  fi
  sleep 30
done
echo "[$(date -u +%H:%M:%SZ)Z] chain-waiter: gave up after 5 h"
