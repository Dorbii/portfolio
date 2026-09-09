# Foliage continuation — 2026-09-09

- Worktree: `C:/Users/Steve/Documents/Github/portfolio/.claude/worktrees/foliage-detail-work-9e2113`; branch `claude/foliage-animation-88bcad`, recovered implementation commit `18cdcc27`.
- Claude's final user feedback: “they are a little too subtle for the movement. Had to really look for it”. Claude then raised amplitude from 0.05 to 0.08 and adjusted the shared gust in `TreeSprites.tsx` and `treeSpritesWebGl.ts`. The latest tuning had no recorded owner verdict.
- Current manifest lists only `l2-tanium/c3-1`: 76 tree sprites in a 2048 × 481 atlas. The new tree-atlas ImageGen demonstration from the other checkout is unrelated and was not used.
- Recovered preview: `http://localhost:3000/`, started from this worktree. At the end of recovery the visible Codex browser is parked on the crossing in T c3-1. Navigating to the URL afresh starts at world view.
- Evidence directory: `.codex-tmp/qa/foliage-resume-2026-09-09/`.
- `site-t0.png`, `site-t1.png`: same camera, different times; the tree-crown sample [775,195,850,290] changes in 2,337 of 7,125 pixels by more than 3 channel values; ground sample [1060,385,1140,440] has zero delta over 4,400 pixels. This checks motion, not visual quality. See `frame-difference.json`.
- `world.png` / `world.json`: tree pass reports idle at world zoom. The sprite counters retain their last draw values while idle; do not interpret them as current draws.
- `site-after-return.png` / `live-after.json`: after returning, 76 sprites / one set / zero failures / animating / full guard. Browser warning/error log query returned none. The reported ~6 ms `frameMs` is the animation loop interval EMA, not measured renderer cost.
- Baseline: `npm.cmd run verify` passed typecheck and lint (warnings), then stopped at tests: 130 pass / 4 fail / 1 skipped. `npm.cmd run build` separately passed. Full logs: `baseline-verify.log`, `baseline-build.log`.
- The four failures match Claude's recorded baseline: territory capital envelope, town-plan paving, territory resegmentation focus, and Kaizen topography. They were not repaired as part of foliage recovery.
- Next: owner reviews the third motion tuning in the open preview. If approved, continue the existing `docs/career-world/session3-tools/tree-sprites.mjs` rollout to remaining served cells and verify each generated set, painter order, at-rest reconstruction, paging/residency and browser motion. If rejected, tune the requested aspect on this cell first.
- Dense stands remain outside the single-tree rollout; the previous world census attributed about 79% of crown pixels to stands. That historical census was not rerun during recovery.
- This recovery changed documentation only. No main merge, runtime or asset promotion, terrain/water/camera edits, or new art generation occurred.

## Branch-motion candidate after owner feedback

The third whole-tree tuning was rejected because it still did not read as a tree in wind. The next candidate adds hierarchical motion to the same 76-sprite trial; it does not promote a world rollout.

- `tree-branch-rig.mjs` finds protrusions on each side of the source crown mask. Up to four joint heights per side are written by `tree-sprites.mjs`. The current cell has 252 joints over 73 trees, with no invented branches on the other three.
- `treeSpritesWebGl.ts` uses a 12 × 24 mesh. Branch tiers rotate about the trunk with a lagged response and smaller needle-cluster flutter; central trunk and basal weights pin the attachment. Trunk amplitude remains 0.08. This is approximate skeletal motion of painted clusters; individual needles and branch occlusion are not reconstructed.
- `?trees.branches=0` disables branch detail for comparison; default is 1. Existing amplitude/speed tuning remains. No new product UI controls.
- `treeMotionGuard.ts` retains slowdown/stop behavior and adds recovery from half rate after sustained headroom. Deterministic clock tests cover slowdown, recovery, stop/retry and hidden-page timing.
- Generator run only for `tanium:c3-1`. All original tree records, source art, served atlas images and registration values are unchanged; only `branches` data was added to its JSON. The world manifest still lists one cell. Twenty-five stands, 58% of this cell's classified crown pixels, remain static.
- `branch-gpu-proof.json`: 76 sprites loaded, 0 load failures / GL errors. At rest branch-off/on has 0 changed pixels. At the same moving-frame time, articulation changes 14,121 pixels in the 1024 × 1024 probe; all 76 sampled feet are unchanged. Different times change 36,284 pixels. These are mechanical checks, not visual acceptance.
- Initial GPU probe imported a stale pre-HMR module and measured no branch contribution; a versioned import corrected the probe. Long animation-frame stress probes exceeded both 3 s and 20 s CDP deadlines and were abandoned; reload cancelled them. Guard recovery has deterministic unit coverage, not a claimed successful browser stress test.
- Reduced-motion emulation reported `reduced` and was removed. Final browser reports articulated / animating / full guard / 76 sprites / 0 load failures, no warnings or errors. `frameMs` is an interval EMA, not GPU cost. No performance benchmark or worldwide budget claim.
- Final gates: `final-verify.log` records typecheck PASS, lint 0 errors / 33 pre-existing warnings, tests 132 pass / 4 same baseline fail / 1 skipped. `final-build.log` records build PASS. The three focused foliage tests pass.
- Screenshot claims and paths are in QA-REVIEW.md. Live preview is parked at the crossing. Final visual judgment and expansion beyond this cell remain with Steve.

Technique reference: separating main-tree motion from branch/leaf detail follows [NVIDIA GPU Gems 3, vegetation animation](https://developer.nvidia.com/gpugems/gpugems3/part-iii-rendering/chapter-16-vegetation-procedural-animation-and-shading-crysis). The silhouette-derived 2D rig is this prototype's approximation, not a result demonstrated by that source.
