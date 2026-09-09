# Original foliage: static Blender source study

Owner authorized original assets using the external packs as broad references,
then explicitly approved a small offline 3D-to-2D test after clarifying that the
portfolio remains 2D. Scope: one pine and four mushrooms in one cluster. No
animation, purchased assets, copied textures/meshes, or ImageGen calls.

Review: <http://localhost:3250/>. The new assets are added on open ground beside
existing painted trees; no existing tree was replaced. Only Steve can decide
visual acceptance. The live world remains unchanged.

## Source and output

- Authoring: `session3-tools/build-original-foliage-blender.py` creates actual
  branch meshes and woody attachment empties, a tapered trunk, roots, and
  original mushroom cap/stem geometry with procedural matte materials.
- Assembly: `session3-tools/compose-original-foliage-study.py` uses Pillow to
  place the transparent renders and separate local contact shading over the
  untouched source crop. No color grade, blur, or source repaint.
- Viewer: `session3-tools/original-foliage-study.html`, native comparison plus
  a nearest-neighbor 2x inspection and links to the full tile, alpha PNGs, and
  editable Blender source.
- Quarantine: `.codex-tmp/qa/original-foliage-blender/` contains
  `original-foliage.blend`, `pine.png`, `mushrooms.png`, `render-manifest.json`,
  `verification.json`, all composites, and browser screenshots. `r1/` retains
  the first dense-canopy candidate and its source script/Blender file.
- Source ground: `public/career-world/layers/terrain/authority/tiles/l2-tanium/c3-1-site.webp`,
  crop [80,640,620,460]. Pine ground foot [420,211] and mushrooms [490,210] in
  that crop; these are experimental placements, not world registrations.

## Authoring decisions and limitations

Blender 5.1.2 / Cycles CPU, 32 samples with denoising, Standard display transform,
768x768 RGBA renders. Orthographic camera at 72 degrees elevation, SSE bearing
157.5 degrees; this is an offline interpretation of the kit contract, not a
measured reconstruction of the painted source's projection. The live 2D camera
and shared LoD contract were not edited. The light JSON supplies direction,
color, ambient color and intensity; direction is mapped from screen axes into
the offline camera basis. A documented 2x key energy multiplier exposes the
material test. This is not a claim of physically identical world illumination.

The first candidate was overly dense and dark. The one art revision reduces
tiers and sprays, adjusts the source material highlights, and sculpts the pine
for its fixed sprite view (depth scale .38 along the viewing bearing, height
scale 1.18). This retains real branch geometry but makes a view-specific source,
not a general-purpose 3D tree. Mushroom caps had reversed normals in the initial
construction; corrected before the retained comparison. The revised cluster
sits fully on the open ground rather than against the terrace edge.

Codex's visual assessment: the pine remains too crisp and regular beside the
painted conifers; the mushroom stems are difficult to read at this high angle.
The test does not establish a style match. Do not expand the kit or start motion
on the assumption that mechanical completion proves art quality. Obtain owner
feedback on the visible comparison; do not keep applying the same style fix.

## Verification and reproduction

Both Python sources parse; Blender renders and saves successfully. Both RGBA
images contain fully transparent and opaque pixels, with non-clipped alpha
bounds. The compositor verified unchanged source SHA-256 and zero changed
pixels outside its placement overlay (10,641 changed pixels inside). Browser
loaded all three comparison/detail images, no horizontal overflow, and the
native disclosure control opened. These are mechanical checks only.

Browser evidence:

- `comparison-browser.png`: unchanged terrain and added specimens at native
  image size, beside original painted foliage.
- `detail-browser.png`: enlarged inspection visible through the actual viewer.
- `browser-proof.json`: image loading, disclosure state and layout diagnostics.

No full app suite was rerun for this isolated offline art/HTML experiment; no
production source, manifest, or served-world asset changed. Blender emitted
non-fatal Blender-6 deprecation warnings for `use_nodes` under 5.1.2.

Run from this worktree in PowerShell:

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.1/blender.exe' --background --factory-startup --python docs/career-world/session3-tools/build-original-foliage-blender.py
python docs/career-world/session3-tools/compose-original-foliage-study.py
python -m http.server 3250 --bind 127.0.0.1 --directory .codex-tmp/qa/original-foliage-blender
```
