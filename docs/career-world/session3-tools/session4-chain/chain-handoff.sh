#!/usr/bin/env bash
# Hands the world from the chain of 01:24 (after-run.sh) to after-chain.sh,
# reordering one step without touching the running script: Tanium c1-1 must
# bake AFTER c1-2 is stitched (the gorge river arrives across that seam), but
# the chain bakes it last, before after-chain.sh can stitch c1-2. So: the
# moment the coast run's last cell ends, take the authoring lock so the chain's
# c1-1 dispatch dies at once ("another cell run holds the lock" — cell.mjs
# registers its lock-removing exit handler only after it owns the lock, so a
# dying dispatch leaves ours alone); when the chain has said its piece,
# release the lock and run after-chain.sh, which bakes c1-1 in its right
# place. If the race is lost (the chain's c1-1 dispatch gets the lock first),
# nothing is held, that attempt is c1-1's one attempt (C11_DONE=1), and
# after-chain.sh runs after it — the old order, no damage.
set -u
cd "C:/Users/Steve/Documents/Github/portfolio/.claude/worktrees/land-lod-completion" || exit 1
say() { echo "[$(date -u +%H:%M:%S)Z] $*"; }
COAST=.codex-tmp/bake-coast.log
TAN=.codex-tmp/bake-tanium.log
LOCK=.codex-tmp/authoring/cell.lock
tan0=$(wc -l < "$TAN")
held=0
c11=0
deadline=$(( $(date +%s) + 5 * 3600 ))
say "waiting for the coast run's last cell (11/11 c4-8) or the chain's c1-1 dispatch (tanium log from line $((tan0 + 1)))"
while true; do
  if awk '/--- 11\/11/{f=1} f && /ACCEPTED in|FAILED after/{found=1} END{exit !found}' "$COAST"; then
    if mkdir "$LOCK" 2>/dev/null; then
      held=1; say "coast run ended; lock taken before the chain's c1-1 dispatch"
    else
      c11=1; say "coast run ended; the lock was already taken (the chain's c1-1 is baking) — waiting for it"
    fi
    break
  fi
  if tail -n +"$((tan0 + 1))" "$TAN" | grep -q -- "--- 1/1  c1-1"; then
    c11=1; say "the chain's c1-1 dispatch got there first — that is its one attempt; waiting for it to end"
    break
  fi
  if [ "$(date +%s)" -gt "$deadline" ]; then say "five hours and no coast end or c1-1 dispatch — giving up; look at the chain"; exit 1; fi
  sleep 0.3
done
# phase 2: the chain's c1-1 run ends (a fast death on the lock, or a real attempt), then the chain says "chain done" and exits
until tail -n +"$((tan0 + 1))" "$TAN" | grep -q "=== done"; do
  if [ "$(date +%s)" -gt "$deadline" ]; then say "no '=== done' from the chain's c1-1 run — giving up; look at the chain"; [ "$held" = 1 ] && rmdir "$LOCK"; exit 1; fi
  sleep 2
done
sleep 5
if [ "$held" = 1 ]; then
  if tail -n +"$((tan0 + 1))" "$TAN" | grep -q "ACCEPTED in\|FAILED after [1-9]"; then
    c11=1; say "the chain's c1-1 run did real work despite the lock — treating it as the attempt"
  fi
  rmdir "$LOCK" && say "lock released"
fi
if [ -e "$LOCK" ]; then say "lock still present after the chain — not starting after-chain.sh"; exit 1; fi
say "starting after-chain.sh (C11_DONE=$c11)"
C11_DONE=$c11 bash .codex-tmp/session4/after-chain.sh
say "handoff done"
