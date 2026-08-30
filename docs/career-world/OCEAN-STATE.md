# Ocean lane — current state

Last updated: 2026-08-30 · branch `codex/career-world-rebuild` · this is the ocean
program's own resume thread. `STATE.md` is the city/director thread and calls this
"a separate lane"; read that one for city work, this one for water.

Standing ruling: **the ocean layer owns all water.** Contributors own WHERE water
is; this layer owns HOW it looks. Inland water was moved under it by owner
direction and is marked for nuke-and-boot. City-painted water is removed once the
ocean earns the style; shore crash/swash stays city-owned where the city is
present.

## The generated-shader rule

`features/career-world/layers/ocean/rendering/shaders/generated/**` and
`layers/ocean/model/generated/**` are written by
`art-source/ocean-animation/src/export_web.py`. **Never edit them.** Tune offline,
re-export, and then VERIFY THE GENERATED ARTEFACT — an export that dies on a
missing `sub()` anchor leaves the previous shader in place, and a whole afternoon
went into comparing a change against itself because of it.

## Landed this arc

- **The foam buffers were dead.** Widening them to RGBA32F silently made every
  `texture(texPrev, ...)` return black, because `OES_texture_float_linear` was
  never requested and a 32F target with LINEAR filtering is an incomplete
  texture. `foam.fresh` sat at exactly `inj * dt`, and 30s of settle read the
  same as 4s. This is why every injection, lifetime, threshold and suppression
  sweep moved the picture by nothing. After the fix, on a matched box: fresh
  0.0060 -> 0.0820 (offline 0.0847), above 0.1 0.91% -> 27.2% (offline 24.9%),
  whitewater coverage 1.38% -> 3.41% (offline 5.44%). `9b6f0b7`
- **Spray fired nowhere.** The live layer has no room for the baked impact field
  so `impactSite` reconstructs it, and the reconstruction crossed the gate on
  0.048% of the shore band against the baked field's 10.41%. Two structural
  errors: the score SCALED the site instead of SELECTING it, and the lattice cell
  copied the offline site SPACING (90) when the offline places its sites ALONG
  the coast and this lattice is two-dimensional. Cell 28 plus a smoothstep gate:
  10.99%. `c9795e7`
- **The gap on the shore was the river, not the sea.** `c1-north-river` hands the
  estuary to the ocean over its last 200 units, and the ocean does not take it --
  `build_plates` keeps one connected component and the river is dammed at its
  mouth in r4, so the ocean field calls that ground land. Ground the terrain
  calls water and no layer paints: 0.389% of the inland window -> zero. `1840e4d`

## The "not water" arc (2026-08-30)

The owner's words: *"a solid mass of blue moving with static white on top ...
0 reflection or shadow work is being conveyed."* Three things landed, and the
order they were ruled out matters more than any of them.

Ruled OUT with captures, each of which I had believed:

- **Directional spread.** Ours measures anisotropy 1.73-2.28 against the
  project's own reference plates at 2.47-3.78: we are LESS directional than the
  target. The reference is MORE striped than ours and still reads as water, so
  the corduroy is not the sin. `aniso.py` is the measurement -- angle, because
  it is scale-free where a wavelength in pixels is not.
- **The foam pass.** Strip it and the mottle stays.
- **The reflection terms as a group.** Zero gloss, spec, sheen and sky together
  and the mottle stays.

The granularity is in the BODY SHADING: with everything drawn zeroed, the bare
body still carried 39.3 of the full picture's 54.2. And bisecting THAT on open
water found the floor -- every named term off -- was the best-looking water of
the set. The style stack was not missing; it was doing the damage.

- **The gloss lobe was haze.** Isolated, gloss alone made the grey-white cloud
  blobs: p90 luma 111.5 against a floor of 77.5, in soft patches 50-100 px
  across. composite.frag already says "broad is haze, tight is a highlight" and
  34 is broad. 340 with double gain turns the clouds into discrete glints. `62c8090`
- **fresnelP had the wrong sign.** `1 - pow(Ns.z, p)` is monotonically
  INCREASING in p, so raising it to 13 to escape an older bug made it less
  selective: flat water at Ns.z 0.94 evaluated to 0.55, mixing sky in at half
  strength everywhere. 1.6 gives flat 0.09 against a tilted face 0.30. `62c8090`
- **The crest stroke was being shredded.** `crestLine = contourLine(hPath, ...) *
  (0.10 + 0.90 * facing)` and facing came off `geom.yz`, the macro gradient --
  swell PLUS chop -- so a smooth contour was multiplied by a chop-frequency
  number. Turning uCrestGain up 3x made more speckle, not more line, which is
  what a shredded stroke does. This file already carried the correction, applied
  to the shore stages and never to facing itself. `4922a86`
- **uShadeSmooth was a screen length.** Fixed 5 px at every zoom: 5 tuned px in
  the frame it was tuned in, 1.7 at the capital approach, ~35 at world. Same bug
  uShadowStep already carried a comment about. `12fa748`

**The remaining blocker is the foam pass.** With foam off, the crest strokes now
draw as long continuous lines. With foam on, its granularity covers them and
raising the crest gain only brightens the grain. So foam SHAPE -- the thing
`foam_shape.py` has measured at elongation 15.5 against the reference's 33.3 --
is now the single thing between here and the reference look, not one item on a
list.

## Open

- **Foam SHAPE still short.** Elongation 15.5 against the offline's 33.3, streak
  reach 135 tuned px against 398. Coverage and brightness match; shape does not,
  and shape is what reads as paint. `foam_shape.py` is the discriminator.
- **The corduroy.** At territory zoom the sea shows strong regular diagonal
  banding — the "fabric" the owner keeps naming. Not yet attributed.
- **Two specks at the river mouth** where r4 calls the ground land, the ocean
  calls it land, and the land art is transparent anyway. A land-plate hole, not
  a water one.
- **Inland water nuke-and-boot**, assigned here by the owner. Its coverage is
  hand-authored (a centreline plus ellipse patches) while the terrain's water is
  derived, so the two drift and the drift is invisible until it is a hole.
- **The one-water-authority contract** is agreed in principle and unwritten.

## Measuring this layer

Never trust one frame: the surf pulses with wave sets, and the same config read
1.36% and 0.73% twenty minutes apart. `scripts/measure-ocean-motion.mjs` captures
over many frames and reports spread. Never trust a null result from a capture
shorter than the slowest time constant in the buffer. And never compare the
offline against the live without putting them on the same camera box — the
capture helper puts the target world point at a viewport FRACTION, not the
centre, and an offset of a third of a frame once read as 80% water against 46%.

Offline/live probes: `art-source/ocean-animation/src/foam_probe.py` (the offline
buffers in the live probe's format), `impact_compare.py` (baked vs reconstructed
impact field), `foam_shape.py` (filament or stipple), and `?water.probe=1` with
`scripts/capture-ocean-comparison.mjs --probe 1` for the live side.

**To find a coverage hole, paint the backdrop.** Set
`.career-world__viewport` / `.career-world__backdrop` to `#ff00ff` in the page and
look: anything magenta is ground no layer paints. A distance-averaged alpha
profile across the coast suggested a 60px translucent band and there was none —
the average was measuring coastline roughness. The magenta showed the truth in
one frame.
