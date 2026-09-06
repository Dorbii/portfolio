#!/usr/bin/env bash
# The coast regens on the owner's words (2026-09-06 02:50: "c0-5 needs regen",
# "c4-8 needs to fix the coast", "C1-3 shoulda just been a bit of land to
# finish the neighbor coast"), one attempt each, after his word on 18i-c (the
# sea patch must be sea in the paint) so the tiled sea cannot carry a stack;
# then the conform pass and serve. Runs when chain4 is done and the lock is free.
set -u
cd "C:/Users/Steve/Documents/Github/portfolio/.claude/worktrees/land-lod-completion" || exit 1
say() { echo "[$(date -u +%H:%M:%SZ)Z] $*"; }
if [ -e .codex-tmp/authoring/cell.lock ]; then say "lock present — not starting"; exit 1; fi
say "coast regens: c0-5, c1-3, c4-8"
node docs/career-world/session3-tools/coast-briefs.mjs >/dev/null 2>&1
git add -A -- art-source/career-world/l2-land/coast/briefs >/dev/null 2>&1
git commit -q -m "Coast briefs refreshed before the regens" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" >/dev/null 2>&1
node docs/career-world/session3-tools/bake-tanium.mjs --territory coast --only c0-5,c1-3,c4-8
say "conform pass"
node docs/career-world/session3-tools/conform-pass.mjs --max 12 2>&1 | tail -8
say "serve"
bash .codex-tmp/session4/serve.sh 2>&1 | tee -a .codex-tmp/session4/serve.log | grep -E "^\[|committed"
say "chain5 done"
