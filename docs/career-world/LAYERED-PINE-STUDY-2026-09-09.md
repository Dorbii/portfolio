# Layered pine motion study

Owner authorized the layered-branch experiment after rejecting flattened-sprite deformation and fixed-silhouette relighting. This is a new art candidate and an isolated viewer, not an accepted tree replacement or world rollout.

- Viewer: [localhost:3220](http://localhost:3220/), static and animated versions of the same assembled asset. Native/2x view, wind strength, pause, rest pose, and attachment markers.
- Tracked implementation: `session3-tools/layered-pine-study.html`; builder `session3-tools/build-layered-pine-study.mjs`.
- Run builder from the worktree, then `python -m http.server 3220 --bind 127.0.0.1 --directory .codex-tmp/qa/layered-pine-study`.
- Output/evidence root: `.codex-tmp/qa/layered-pine-study/`. The source images remain in quarantine.

## Source art and spend

Built-in imagegen used, 2 calls of the 2-candidate budget. Named kit entry: `layered-pine-motion-proof-r1`. Both outputs are 1254x1254 **RGB**, despite requested transparency. They are not alpha assets.

- Used in viewer: `parts-r1.png`, copied from `C:/Users/Steve/.codex/generated_images/01a0868d-0b09-7483-b8e6-199cf211d9e4/exec-7b8a6808-e158-4e02-8b2c-565be3272784.png`.
- Unused correction: `parts-r2.png`, from `exec-027b99a3-04eb-4263-be4b-0ec6cb729536.png` in that same generated-images directory. It also retained a painted background.
- Exact prompts: `prompt-r1.txt` and `prompt-r2.txt` in the output/evidence root. Dimensions, modes and SHA-256 values: `asset-inspection.json`.
- The renderer filters the neutral, bright background while drawing the source atlas. Source PNG bytes remain unchanged. This is a motion-proof workaround, not production alpha preparation. No third generation was issued. Clean alpha, edge inspection and owner art review remain prerequisites to any asset promotion.

## Construction and verification

The sheet contains a bare trunk, crown leader, six side boughs and a central foliage piece. Side boughs and leader use fixed woody attachment pivots and uniform scale. Static central back/front layers cover overlaps; the trunk remains fixed. Seven independent damped spring responses follow one varying wind pressure. The pieces rotate rigidly: no texture warp, animated relighting, or scale animation.

The viewer reuses the existing original pine's ground patch inside its local comparison. The crown classifier's foot at crop x88 is offset from the visible trunk; the new asset was shifted to crop x108, y199 by visual inspection. This correction belongs only to the prototype, not world registration.

- After priming scaled-atlas drawing, static and zero-angle composites are byte-identical. Initial draw differed from subsequent identical draws; repeated-draw sampling established the settled baseline. The browser's underlying first-draw cause was not established.
- At the three-second mechanical sample: 16,500 changed channel bytes, zero changed bytes in the protected bottom/ground band, zero pivot drift, scale error about 1.31e-8 (floating-point transform precision). These establish mechanics, not visual naturalness.
- Rest-pose control checked in browser; attachment markers and native/2x views inspected. Final source is syntax-checked; builder lint passes. No full app suite rerun: runtime code, world manifests, and served-world images are unchanged.
- Evidence: `final-proof.json`, `comparison-native.png`, `comparison-inspection.png`. The pre-placement-correction control result is retained separately as `rest-control-proof.json`.

Next: Steve judges the layered motion, separately from the new art's style. No acceptance, production readiness, or coverage/rollout claim.

<details>
<summary>Exact built-in imagegen prompts</summary>

### Kit generation

```text
Create a NEW square game-art PARTS ATLAS, not an edited or assembled version of the reference picture.
Input reference: style and palette ONLY. Match the dark olive evergreen needles, warm grey-brown bark, painterly 2.5D fantasy strategy-game art, oblique view, and upper-left light of the pine in this reference. Do not copy the ground, stone wall, or image layout.
Named kit entry: layered-pine-motion-proof-r1. This is a new generic experimental pine, not replacement artwork for a named existing tree.
Deliver ONE 1536x1536 PNG, genuinely transparent background, a clean 3 by 3 grid of NINE separate pieces in equal square cells. Each piece has generous transparent margins and never touches any other piece. NO cell borders, NO numbers, NO labels, NO checkerboard painted into the image. All parts from the same pine, with the same scale of needles and brushwork. Include natural partially hidden surfaces so pieces can overlap while rotating without exposing unpainted gaps.
Cell positions, reading order:
1 top-left: a complete slender tapered bare pine trunk, upright, bark texture, a few short branch stubs, no needles, compact root flare at bottom; entirely visible.
2 top-middle: the pointed top leader of a pine, a small pointed evergreen crown tuft with short bare brown stem at its bottom centre; entirely visible.
3 top-right: one upper-left bough. Short bare attachment stem at its RIGHT end, needles fan LEFT and slightly down, pointed drooping outer sprays.
4 middle-left: one upper-right bough. Short bare attachment stem at its LEFT end, needles fan RIGHT and slightly down.
5 middle-middle: one middle-left bough, fuller than the upper bough, bare stem at RIGHT, dense evergreen sprays spread LEFT and slightly down.
6 middle-right: one middle-right bough, fuller, bare stem at LEFT, dense sprays spread RIGHT and slightly down.
7 bottom-left: one broad lower-left bough, bare stem at RIGHT, layered needle sprays extend LEFT and down.
8 bottom-middle: one broad lower-right bough, bare stem at LEFT, layered needle sprays extend RIGHT and down.
9 bottom-right: a compact narrow central BACK foliage tuft, vertically oriented, to sit behind the trunk and cover gaps between overlapping bough bases. Dense shaded olive-green needles, no roots, no ground.
Paint each bough as a complete small rigid branch with coherent needle clusters and an explicit visible woody attachment. Side boughs should be mostly horizontal with gently drooping outer tips. Their attachment stem stays at the same height near the upper-middle of their cell. Consistent clear alpha between individual needle tips, believable brushwork, varied natural edges. This is an articulated sprite puppet kit: do not draw complete trees inside the bough cells. No cast ground shadows, no backdrop, no environmental props, no text.
```

### Background correction attempt

```text
Use case: background-extraction.
Edit the supplied pine parts atlas ONLY to remove the background. The grey-and-white checkerboard in this input is unwanted PAINTED PIXELS, not transparency.
Return a genuinely transparent RGBA PNG: alpha exactly zero everywhere outside the nine wooden/needle objects, including every gap between the needle tips. Do not replace the checkerboard with white, black, green, or another painted checkerboard.
Preserve the exact existing nine parts, their positions, dimensions, colors, lighting, branch shapes, brushwork, and attachment stems. No repainting, no relighting, no extra branches, no assembled trees. Keep the entire 1254x1254 atlas canvas. This is a game sprite sheet which must composite directly over terrain; real alpha is mandatory.
```
</details>
