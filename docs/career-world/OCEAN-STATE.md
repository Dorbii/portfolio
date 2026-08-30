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
