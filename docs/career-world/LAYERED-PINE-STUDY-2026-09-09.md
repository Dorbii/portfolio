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


## Style-only follow-up

Owner found the movement better but the new tree's style mismatched the repo. The wind and spring model, frequencies, flex values, destination positions and scales were held fixed. New named defect `layered-pine-style-mismatch-r1`, 2 built-in imagegen candidates; no further generation in this style pass.

- Current: `.codex-tmp/qa/layered-pine-study/parts-style-r2.png`, 1254x1254 RGB, SHA-256 `7f2b9c774f599a48905b0c938ca0e1e098f087cec676be8ea30e3ded372e5d0b`; generated original `C:/Users/Steve/.codex/generated_images/01a0868d-0b09-7483-b8e6-199cf211d9e4/exec-6ad60b58-54f5-4c02-aced-e9b97b37eb86.png`.
- Prior style candidate: `parts-style-r1.png`, generated `exec-f430193a-6218-44d5-b0c2-ea055d26317f.png` in that same generated-images directory. It remains available for comparison; not selected for current preview.
- r1 changed the marks but still packed small sprays into the assembled pine. r2 uses fewer broad, hooked forms and dark undersides. This is the candidate's design, not a visual-match verdict.
- Crop margins expanded for leader, upper-left, lower-left and central foliage. Local pivot offsets rebase when a crop origin moves; the atlas-space woody attachment pixel stays identical. All parts fit the final rectangles; source bounding results in `style-r2-inspection.json` (old and final crop results retained separately).
- Viewer now defaults to original repo painting on the left. Uncheck `Repo reference on left` to compare the new tree at rest with its moving version. The actual rest control was checked again: 0 differing bytes. Self-check ground / pivot errors remain 0; scale drift ~1.31e-8. Proof: `style-r2-proof.json`.
- Screenshots: `style-comparison-native.png`, `style-comparison-inspection.png`. Source remains RGB with a display-only background filter; no world promotion or clean-alpha claim. The style still needs Steve's verdict.

<details>
<summary>Exact style-pass prompts</summary>

### Candidate 1

```text
Use case: style-transfer. Named defect: layered-pine-style-mismatch-r1.
Edit IMAGE 1, the 1254x1254 pine-parts atlas. IMAGE 2 is the authoritative STYLE reference, showing the existing dark painted pine in its game landscape.
The current atlas looks too realistic: its individually rendered thin needles, fine texture and wispy branch edges do NOT match the broader, chunky painted needle masses in image 2. Repaint the NINE existing parts to match image 2's visual language. This needs a change in shape language and brushwork, not just a color filter.
STYLE AUTHORITY, image 2: dense dark forest-green evergreen masses; broad overlapping fan-like and spade-like needle clumps; a few decisive olive highlights along the curved upper branch edges; deep muted blue-green/near-black underside shapes; compact, solid silhouette tiers; visibly simplified painterly strategy-game illustration. Paint needles as grouped brush shapes, not many realistic individual needles. The bark should be similarly simplified. Avoid yellow-orange foliage, photorealism, fine fibrous detail, shaggy/fluffy edges, feathery spruce sprays, tiny high-frequency noise, pencil hatching, plastic shine, and blur.
LAYOUT LOCK, image 1: preserve the exact 1254x1254 canvas, all nine parts in the same cells, each part's extents, orientation, scale, woody attachment stem and stem endpoint position. Do not add parts, merge parts, move parts, mirror them, or draw assembled trees. Keep the long bare trunk and the same leader, six left/right boughs, and narrow back-crown piece. The existing animation rig depends on these bounds and attachment positions.
Each left bough still has its attachment stem at its right end; each right bough still attaches at its left end. Build the broad painted needle clumps around those existing branch structures, with solid overlapping dark masses and restrained broad highlights matching image 2. Keep the parts spatially separate.
Background: clean flat white, no checkerboard, no grey pattern, no shadows outside the parts. This RGB comparison atlas will be keyed only in an isolated prototype. No ground, no wall, no text, no labels, no borders.
Priority order: match image 2's painted pine style; preserve image 1's exact part layout and attachment locations; keep all parts complete and separated.
```

### Candidate 2

```text
Style-only correction, candidate 2 of 2 for layered-pine-style-mismatch-r1.
IMAGE 1 is the current parts sheet and the exact LAYOUT authority. IMAGE 2 is the STYLE authority: the large dark pine in the repo landscape.
The assembled current parts still look like many little leafy sprays; the reference tree is made of a small number of large dark sculptural tiers. Match the SIZE OF THE PAINTED FORMS, not merely its colors.
Repaint each of the six side boughs as TWO OR THREE LARGE overlapping fan/wedge forms of evergreen needles, with thick coherent curved upper edges and deep shadow beneath. Each fan should occupy a substantial fraction of its branch. Do not paint rows of individual leaves, little sprays, separated needle blades, fronds, fine hatching or feathery twig detail. In the final game each bough is only about 40-55 pixels wide; tiny marks are the wrong scale. Use very few broad intentional strokes and large continuous dark shapes.
The crown leader should have THREE broad tiers below a pointed top, not many tiny tiers. The narrow back-foliage piece should similarly have just a few broad conifer tiers.
The precise visual language is the pine in IMAGE 2: almost-black blue-green underside masses, dark muted forest green faces, spare olive-gold painted accents on the curved upper lips, firm scalloped / hooked triangular outer profiles, no outlined broadleaf/laurel leaves. No blur. No photographic detail. No glossy material. No furry texture. Treat each bough like a small piece cut from that illustrated reference pine.
Keep IMAGE 1's 1254x1254 canvas, all nine part locations, woody stems and attachment endpoint coordinates, trunk and branch lengths, part orientations and approximate outer bounds EXACT. The animator's rig is already locked. Keep the pieces separate and complete. Bare trunk stays the same slender shape with broad simplified bark painting.
Flat pure white background, no checkerboard or cast shadows. No labels or text. Do not draw assembled trees. Do not change lighting direction. The six boughs must remain six boughs; simplify the painted foliage forms inside them instead of adding components.
```
</details>


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


## Grove comparison

Owner requested a cluster of trees and bushes. [Grove viewer](http://localhost:3220/grove.html) shows seven added layered pines with nine existing shrub/fern clumps, still versus in wind. Bushes are static; their visibility can be toggled. Single-tree comparison remains at :3220/index.html.

- New files: `session3-tools/build-grove-study.mjs`, `session3-tools/grove-study.html`. Run the builder after the layered-pine assets exist; the existing server serves `grove.html`.
- Same style-r2 pine kit and motion parameters, independent tree states with modest spatial gust delays. Tree scales range from 0.75 to 1.10 of the single-tree study. Front-to-back order follows each object's ground foot; contact shade is a static preview layer under the group.
- Bush source: `fern-cluster` from `public/career-world/shared-assets/environment/foliage/foliage-pool-r1.json`, using its declared atlas/crop. These are existing decorative shrub/fern clumps, not newly authored or animated bushes.
- Ground: unchanged crop [730,1110,560,420] from T c3-1 site tile. Existing painted background objects remain visible. The arrangement is illustrative, not a world placement proposal.
- Output under `.codex-tmp/qa/layered-pine-study/`: `grove.html`, `grove-ground.png`, `bush-atlas.png`, `grove-sources.json`, `grove-proof.json`, `grove-comparison.png`, `grove-without-bushes.png`.
- Actual Rest pose comparison is byte-identical. The moving test sample changes 81,745 channel bytes; lower border unchanged, ground-foot draw order valid, pivot precision error ~3e-6 px. Builder lint / source syntax pass. No full application test run or production readiness claim for this isolated composition preview.
