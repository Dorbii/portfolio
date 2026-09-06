#!/usr/bin/env bash
# waits for chain6 to end (its last two cells die on the held lock, its serve refuses), then releases the hold so chain7's waiter starts chain7
cd "C:/Users/Steve/Documents/Github/portfolio/.claude/worktrees/land-lod-completion" || exit 1
for i in $(seq 1 240); do
  if grep -q "chain6 done" .codex-tmp/session4/chain6.log 2>/dev/null; then
    rm -f .codex-tmp/authoring/cell.lock/hold; rmdir .codex-tmp/authoring/cell.lock 2>/dev/null
    echo "[$(date -u +%H:%M:%SZ)Z] chain6 ended; hold released ($(ls -d .codex-tmp/authoring/cell.lock 2>/dev/null || echo 'lock free'))"
    exit 0
  fi
  sleep 10
done
echo "hold-release: gave up after 40 min"
