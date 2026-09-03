#!/usr/bin/env bash
# Carry lock change 9 through the accepted world: --restitch every accepted cell,
# one at a time (the pipeline's lock dir refuses concurrency), in ledger order.
# Deterministic from the sources; no bake. Log per cell, then a summary.
set -u
cd "$(dirname "$0")/../.."
LOG=.codex-tmp/session3/restitch-world.log
: > "$LOG"
CELLS=$(node -e 'const m=require("./public/career-world/layers/terrain/authority/manifests/terrain-l2-ninjaone-r1.json");console.log(Object.entries(m.cells).sort((a,b)=>a[1].stitch.order-b[1].stitch.order).map(([id])=>id.slice(1).replace("-",",")).join(" "))')
echo "restitch order: $CELLS" | tee -a "$LOG"
for c in $CELLS; do
  echo "=== $c $(date -Iseconds) ===" | tee -a "$LOG"
  node tools/world-authoring/cell.mjs --cell "$c" --restitch >> "$LOG" 2>&1
  code=$?
  grep -E "total .* written" "$LOG" | tail -1 | sed "s/^/  $c: /"
  if [ $code -ne 0 ]; then echo "  $c FAILED exit=$code" | tee -a "$LOG"; fi
done
echo "done $(date -Iseconds)" | tee -a "$LOG"
