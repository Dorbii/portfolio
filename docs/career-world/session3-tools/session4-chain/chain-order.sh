#!/usr/bin/env bash
# The rune chain in proper order (owner 2026-09-05 11:50, on the live server,
# looking at c3-1's candidate: "for the chain now we say this cell is good and
# then do it in proper order so the chain lines up"):
#   1. c3-1 stitched on his word (refused by one pixel + rock 0.244).
#   2. c4-1 forced, against c3-1's real pixels (its groove must meet c3-1's;
#      c4-0 above is still a candidate and bakes against c4-1 later).
#   3. c2-1, one attempt, against c3-1 (east), c2-0, c2-2.
#   4. c1-1, one attempt, between c0-1 and c2-1 with c1-0 and c1-2 in place —
#      every neighbour authored for the first time.
# Then the served world is rebuilt: register, mount (with every current
# candidate previewed — the land lane owns the mount), water fields.
set -u
cd "C:/Users/Steve/Documents/Github/portfolio/.claude/worktrees/land-lod-completion" || exit 1
say() { echo "[$(date -u +%H:%M:%S)Z] $*"; }
if [ -e .codex-tmp/authoring/cell.lock ]; then say "lock present — not starting"; exit 1; fi
AUTH=public/career-world/layers/terrain/authority
BRIEFS=art-source/career-world/l2-land/tanium/briefs

say "c3-1: owner accept on eye, stitching the candidate"
CELL_OWNER_ACCEPT="owner 2026-09-05 11:50, on the live server, c3-1's candidate in full: 'for the chain now we say this cell is good and then do it in proper order so the chain lines up' (refused by one pixel on the c3-2 stream and rock lighting 0.244)" \
  node tools/world-authoring/cell.mjs --territory tanium --cell 3,1 --redo --force \
  --describe-file "$BRIEFS/c3-1.md" 2>&1 | grep -E "OVERRIDE|FAIL|accepted, stitched|NOT accepted" | head -6
git add -A -- art-source/career-world/l2-land/tanium "$AUTH" docs/career-world/session3-tools/tanium-rejects >/dev/null 2>&1
git commit -q -m "Tanium c3-1: accepted by the owner on the live server ('for the chain now we say this cell is good'), stitched with the override recorded" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && say "c3-1 committed"

for spec in "c4-1 --force c4-1" "c2-1" "c1-1"; do
  set -- $spec
  say "bake $1 in chain order ($*)"
  node "$BRIEFS/write-briefs.mjs" >/dev/null 2>&1
  node docs/career-world/session3-tools/bake-tanium.mjs --only "$@"
done

say "rebuild the served world: register, candidates, mount, water"
node docs/career-world/session3-tools/world-register.mjs 2>&1 | tail -2
if [ -f docs/career-world/session3-tools/mount-candidates.mjs ]; then
  node docs/career-world/session3-tools/mount-candidates.mjs 2>&1 | tail -3
else
  say "(no mount-candidates.mjs yet — the mount keeps its recorded candidates)"
fi
npm run build:land-mount 2>&1 | tail -1
npm run build:water 2>&1 | tail -1
git add -A -- "$AUTH" public/career-world/layers/water art-source/career-world/land-mount-r1.json docs/career-world/session3-tools >/dev/null 2>&1
git commit -q -m "Served world rebuilt after the chain order: registration, candidate previews, land mount, water fields" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && say "served world committed"
say "chain-order done"
