#!/usr/bin/env bash
# When coast wave 1 (c7-4, c8-5, c8-7, c2-8, c5-8, c7-8; 07:51) ends: refresh
# the briefs — each refused cell's brief then carries the edge map AND the
# measured faults of the candidate it just made — and give every refused cell
# of the wave ONE retry on it. The first three baked before the edge map
# existed (c7-4, c8-5) or before the measured note did (c8-7), so this is the
# pipeline fix's real attempt, not a second roll of the same dice.
set -u
cd "C:/Users/Steve/Documents/Github/portfolio/.claude/worktrees/land-lod-completion" || exit 1
say() { echo "[$(date -u +%H:%M:%S)Z] $*"; }
LOG=.codex-tmp/bake-coast.log
start=$(grep -n "bake coast: 6 cells" "$LOG" | tail -1 | cut -d: -f1)
[ -z "$start" ] && { say "no wave-1 start line in $LOG"; exit 1; }
say "waiting for wave 1 to end (coast log from line $start)"
deadline=$(( $(date +%s) + 3 * 3600 ))
until tail -n +"$start" "$LOG" | grep -q "=== done"; do
  if [ "$(date +%s)" -gt "$deadline" ]; then say "wave 1 not done in three hours — giving up"; exit 1; fi
  sleep 20
done
accepted=$(tail -n +"$start" "$LOG" | grep -E "^\[[0-9:]+\]   ok  *c[0-9]+-[0-9]+ " | awk '{print $3}' | paste -sd, -)
# only a cell refused on WATER CONTINUITY gets the retry — that is the fault
# the corrected brief addresses. A cell refused on rock lighting or crowns
# with its seam matched (c2-8 at 08:38) goes to the owner's eye instead.
refused=""
for c in $(tail -n +"$start" "$LOG" | grep -E "^\[[0-9:]+\]   FAIL  *c[0-9]+-[0-9]+ " | awk '{print $3}'); do
  verdict=$(tail -n +"$start" "$LOG" | awk -v c="$c" '$0 ~ "--- [0-9]+/6  "c" " {f=1} f && /FAILED after|ACCEPTED in/ {print; exit}')
  if echo "$verdict" | grep -q "water continuity"; then refused="${refused:+$refused,}$c"; else say "$c: refused without a continuity fault — to the owner's eye, no retry"; fi
done
say "wave 1 done — accepted: ${accepted:-none}; retrying: ${refused:-none}"
[ -z "$refused" ] && { say "nothing to retry"; exit 0; }
sleep 5
if [ -e .codex-tmp/authoring/cell.lock ]; then say "lock present — not starting"; exit 1; fi
node docs/career-world/session3-tools/coast-briefs.mjs >/dev/null 2>&1
git add -A -- art-source/career-world/l2-land/coast/briefs >/dev/null 2>&1
git commit -q -m "Coast briefs: wave-1 retries carry the measured faults of their first candidates" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && say "briefs committed"
say "retry on the corrected briefs: $refused"
node docs/career-world/session3-tools/bake-tanium.mjs --territory coast --only "$refused"
say "after-wave1 done"
