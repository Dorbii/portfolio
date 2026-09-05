#!/usr/bin/env bash
# c3-1 was refused by one pixel at 05:03 and after-chain.sh dispatched c2-1
# blind of it before that could be stopped (a process kill was not permitted).
# c4-1 is next in after-chain.sh and borders c3-1 too. So: the moment c2-1's
# run ends, take the authoring lock; every remaining step of after-chain.sh
# dies on it within seconds; when the handoff says it is done, release the
# lock and run after-chain-2.sh (the steps that do not depend on c3-1). If
# c4-1's dispatch wins the race, after-chain.sh simply runs on (all its later
# steps are wanted) and only the c5-1 override remains for after-chain-2.sh.
set -u
cd "C:/Users/Steve/Documents/Github/portfolio/.claude/worktrees/land-lod-completion" || exit 1
say() { echo "[$(date -u +%H:%M:%S)Z] $*"; }
TAN=.codex-tmp/bake-tanium.log
HAND=.codex-tmp/session4/chain-handoff.log
LOCK=.codex-tmp/authoring/cell.lock
tan0=$(wc -l < "$TAN")
hand0=$(wc -l < "$HAND")
held=0
deadline=$(( $(date +%s) + 4 * 3600 ))
say "waiting for c2-1's verdict (tanium log from line $((tan0 + 1)))"
until tail -n +"$((tan0 + 1))" "$TAN" | grep -qE "ACCEPTED in|FAILED after"; do
  if [ "$(date +%s)" -gt "$deadline" ]; then say "no verdict from c2-1 in four hours — giving up; look at the chain"; exit 1; fi
  sleep 0.3
done
if mkdir "$LOCK" 2>/dev/null; then
  held=1; say "c2-1 ended; lock taken — after-chain.sh's remaining steps die on it"
else
  say "c2-1 ended but c4-1's dispatch got the lock first — after-chain.sh runs on; only c5-1 remains for after-chain-2"
fi
until tail -n +"$((hand0 + 1))" "$HAND" | grep -q "handoff done"; do
  if [ "$(date +%s)" -gt "$deadline" ]; then say "no 'handoff done' — giving up"; [ "$held" = 1 ] && rmdir "$LOCK"; exit 1; fi
  sleep 2
done
sleep 3
if [ "$held" = 1 ]; then rmdir "$LOCK" && say "lock released"; fi
if [ -e "$LOCK" ]; then say "lock still present — not starting after-chain-2.sh"; exit 1; fi
if [ "$held" = 1 ]; then
  say "starting after-chain-2.sh (c4-0, c5-2, the coast, c5-1)"
  bash .codex-tmp/session4/after-chain-2.sh
else
  say "starting after-chain-2.sh for c5-1 only"
  ONLY_C51=1 bash .codex-tmp/session4/after-chain-2.sh
fi
say "hold done"
