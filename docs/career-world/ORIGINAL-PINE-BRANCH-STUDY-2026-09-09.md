# Original-pixel pine branch study

Owner authorized this after rejecting the generated replacement kit and grove. It is a one-tree source-preserving experiment, not accepted animation or a world rollout.

## Review and reproduce

- [Live comparison](http://localhost:3230/): original painting left, original branch layers in wind right. Controls: wind strength, pause/rest, 1x/2x inspection, branch contours, and hidden fill.
- Build: `node docs/career-world/session3-tools/build-original-pine-branches.mjs`.
- Serve: `python -m http.server 3230 --bind 127.0.0.1 --directory .codex-tmp/qa/original-pine-branches`.
- Authored data: `session3-tools/original-pine-branches.json`; viewer: `session3-tools/original-pine-branches.html`.

## What is preserved

Source is the existing T c3-1 site tile, crop [120,680,220,240]. Five hand-drawn outer-bough contours intersect the original crown's two-pixel-expanded mask; a separate hand-defined trunk region stays fixed and draws in front of attachments. Overlapping selections receive one owner, so visible source pixels are not duplicated between moving layers.

The 1,424 selected pixels are copied unchanged into actual transparent PNG layers. No new tree art, palette change, ImageGen call, global warp or lighting animation. The actual rest composite is built from the modified underpainting, five branch images, and fixed trunk image; it does not switch to the original image as an angle-zero shortcut.

## Hidden fill and limits

Only the privately selected area in the trial underpainting changes. Inside the hand-defined canopy body, 925 pixels use nearest uncut original-canopy donors; 1,210 possible donor pixels exclude the cut's three-pixel fringe and trunk. The other 499 pixels use the existing source tree's ground patch. All pixels outside the selection stay unchanged.

This hidden fill is a local reconstruction, not recovered occluded artwork. It can show sampling boundaries if exposed too far; limited source resolution, contour accuracy, matte fringes, and attachment seams remain visual review risks. The viewer exposes the fill deliberately. Only five branch groups animate; the rest of the original foliage stays still.

## Verification

- Builder recomposes the layer buffers and checks all four channels: rest differences 0, changed source-layer bytes 0, changed underpainting bytes outside the selection 0.
- Browser recomposes the actual PNGs: rest differences 0. The real Rest pose button also returns two identical canvases.
- Three-second sample: protected ground band unchanged, pivot error 0, scale error 0, 4,401 changed channel bytes. These are mechanics, not naturalness scores.
- Builder lint and builder/embedded-script syntax pass. Controls and native/2x views inspected. No full application suite rerun because production runtime, manifests and served art are unchanged.
- Evidence root: `.codex-tmp/qa/original-pine-branches/`. `branches.json` contains branch origins, pivots, pixel counts and builder proof. `browser-proof.json` and `final-proof.json` record browser results.
- Screenshots: `comparison-native.png`, `comparison-inspection.png`, `selected-branches.png`, `hidden-fill.png`. `reference-grid.png` is only a magnified authoring aid, not changed source art.

Next: owner judges the motion and revealed edges while the painting's rest identity is preserved. No wider mask extraction or integration is authorized by the proof itself.
