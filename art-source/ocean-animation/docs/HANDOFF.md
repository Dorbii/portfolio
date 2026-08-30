# Handoff

Everything a fresh session needs. Read this before changing anything.

`docs/03-iteration-log.md` is the full narrative; this is the distillate.
Sections 1, 1A and 1B are current — **read 1B first**, it is the live layer's
present state and carries the list of hypotheses already eliminated. Sections
2–11 predate 2026-08-28 and remain accurate about the offline renderer, but
several of their conclusions were superseded that day.

---

## 1. Where this stands (2026-08-29)

Two things exist now:

1. **The offline renderer** — three seamless-looping sea states over a fixed
   painted plate. All three pass Stage-1 and every objective check.
2. **A replacement of the live portfolio water layer**, in progress. The owner's
   direction: replace ALL water logic and assets in
   `features/career-world/layers/ocean/` with this work. Not augment — replace.

### The port, precisely

Commits: `d028d44` `7c94913` `42cbf52` `6bf0972` `8f189a5` `5ec78e1`.

**Done.** The world wave field is solved and encoded as two web textures,
1.61 MB replacing 22.57 MB of painted water assets:

| texture | R | G | B | A |
|---|---|---|---|---|
| `ocean-phase-r1.png` | residual phase hi byte | residual phase lo byte | wavenumber | depth |
| `ocean-flow-r1.png` | wave dir x | wave dir y | shore distance | water mask |

Shader reconstruction is one line:

```glsl
float S = (hi * 256.0 + lo) / 65535.0 * 1007.9864 - 89.3782
        + 1.263546 * dot(worldPx, vec2(0.508849, 0.860856));
```

Regenerate with `python bake_world.py && python encode_world.py`. Both outputs
are gitignored (large, reproducible). The bake is valid because **the owner
confirms the coast SHAPE is canon**; the world's placeholder colours and texture
are not.

**The port is DONE and live.** Commits `b6f0a8e` `9eb3b81` `541799e`.

Four passes a frame -- wave, foam, spray, composite -- in
`features/career-world/layers/ocean/`. The shaders and the preset table are
GENERATED from `src/shaders/` and `src/presets.py` by `src/export_web.py`; do not
edit anything under `rendering/shaders/generated/` or `model/generated/`. Tune
offline, where a frame can be measured in numpy, and re-run the export. Every
substitution in that script asserts its anchor matched exactly once, so an
offline edit that moves an anchor breaks the export rather than quietly emitting
a shader that compiles and renders the wrong thing.

Assets: 2.69 MB of solved fields replaced 40.3 MB of painted plates, which are
deleted along with their builders and their T30-T33 gate scripts.

### The three decisions the port turns on

**Units: tuned plate pixels.** Everything is evaluated in the units the presets
were tuned in, fixed to the world and independent of the camera, so a wave keeps
its wavelength, steepness and depth at every zoom -- and so does every
hard-coded length in the offline shaders, including the ones nobody wrote down
as a parameter. Screen pixels were tried on paper first and are worse: they put
the camera factor on the breaking criterion and the surf-zone width, where
getting one wrong changes the physics rather than the styling. `uZc` (screen px
per tuned px) appears in exactly two small tables in the renderer, both drawing
rather than physics.

**Noise is screen-anchored, waves are world-anchored.** The same split, applied
inside `noiseAt` rather than at the call sites. A scale of 640 was 38% of the
tuned plate and is 1.7% of a world, so at the wide shot the tileable texture
repeated sixty times across the viewport and drew a diamond lattice.

**`uOpenWaveVis` is the resolvability lever.** At the wide shot the swell is
three screen pixels crest to crest, and shading, whitecapping and drawing each
one puts a light/dark pair on every wave in the sea. Attenuating the height
field after the RMS normalisation -- where scaling survives -- is the one place
that reaches tone, breaking, foam and stroke together. The shore keeps its surf
at any altitude. It is 1.0 offline and nothing there changes.

### Two bugs that cost hours; do not reintroduce them

- **Screen uv is bottom-left; the world fields are image-space, top row first.**
  The missing flip mirrored the entire ocean -- a coastline that nearly fits and
  does not. Verified with a magenta-over-land-art overlay, which is the check to
  repeat if registration is ever in doubt.
- **`texPrev` had no sampler unit**, so it defaulted to unit 0 and the foam pass
  advected the phase texture as its own history. The renderer now refuses to
  start if any uniform the compiler kept is written by nobody, and
  `tests/water-uniform-contract.test.mjs` checks the same invariant without a
  GPU. That check found this within a minute of existing.

### Measuring the live layer

`?water.capture` turns on `preserveDrawingBuffer`, which is what makes the
rendered water readable from the page -- without it `drawImage` returns
transparent and the only way to judge the layer is to look at a screenshot.
`?water.bare` strips every drawn layer, leaving geometry and base colour, which
is how the woven-fabric cause was isolated. Looking is exactly what kept being
wrong about this water; keep measuring.

### Open

- **Art direction at map scale.** The wide shot is a dark ocean with a shelf
  band and large-scale weather (luma p10-p90 spans 18 of 255, up from 10). The
  bathymetry shelf is ~10 screen px at world zoom, which is narrow for a map:
  widening it is a bake parameter (`OCEAN_SHELF`), and it trades against
  refraction, since a shelf wide enough to read as colour is also wide enough to
  bend every wave around the whole island.
- **The surf line rings the whole coast** at roughly even weight. It should
  favour windward shores and break into runs -- the same fault the offline work
  fixed once already, arriving again because the wide shot re-exposes it.
- **Fine-detail coherence** remains 0.285 against the plate's 0.583 (see 1A).

### Five findings only the real world coast could surface

None were visible on the tuned plate. Each would have been baked in wrong by
porting straight from it.

- **Authoritative masks beat inference.** Segmenting the world coast from colour
  gave 43.2 % water against a true 47 % — it called ~4 % of real water *land*,
  and land zeroes the shoreline distance there, which is the false-shoal defect
  `build_plates.py`'s own docstring warns about. `OCEAN_WATER_MASK` takes the
  live layer's authority instead. Verified the only water then dropped is 3.8 %
  across six disconnected inland lakes, which the ocean layer should not own.
- **World- vs screen-anchored parameters.** `PX_SCALED` treats every length
  alike, which is right for a magnification study and wrong for a camera. A wave
  is a physical object and scales with the camera; a drawn stroke is a mark on
  the picture and wants ~3–4 px at every zoom. Split into `WORLD_SCALED` /
  `SCREEN_FIXED` with `at_camera()`. Invisible at one zoom, wrong across 25.
- **Only the primary swell can be a baked asset.** At world resolution primary is
  4.74 px (4.7 samples/wave), secondary 2.61 px, chop 0.96 px. The latter two are
  sub-pixel and must be generated in screen space — which is also the only zoom
  where they should be visible. The LoD split falls out of the numbers.
- **Scale.** The swell is ~5 world px. At the closest camera (span 0.04, ~24×)
  that reads near 120 screen px; at world zoom 4.8 px, correctly fine texture. It
  also keeps the sea in deep water almost everywhere, so waves stay straight
  offshore and refract only at the coast.
- **Palette: REJECTED direction, recorded.** The world's old authored water
  measures luma p50 0.151 / sat p50 0.184 against our 0.166–0.431 / 0.689–0.854,
  and re-anchoring to it looked far better against the placeholder world art. The
  owner's call: that asset is being replaced, so it has no authority over what
  replaces it. **The palette tuned in this session stands unchanged.**
  `worldpalette.py` is kept, marked rejected, unused.

### Weather: do not rotate the presets

The three presets use different wave *families* — different directions and
periods — so they are different eikonal solves. They cannot be crossfaded; the
phase field would tear and crests would break and re-form. Rotation means a hard
cut.

Instead: **one baked phase field, one continuous weather scalar** driving only
the energy parameters (amplitude, steepness, foam injection, whitecap threshold,
spray, colour depth). Those interpolate cleanly because they are numbers on a
fixed geometry. The cost is that swell direction becomes fixed per coastline,
which is physically fine — real swell direction changes over hours — and is what
makes the bake viable at all. It is also what makes a rare hero wave possible
later: the same scalar spiking, not a fourth preset.

---

## 1A. What changed on 2026-08-28

The day's work was almost entirely one complaint: the water read
"grainy / mottled / like fabric" rather than liquid. **It was found and fixed.**

### The mottle was the specular lobe

Isolated by ablation, and the chain matters because each step looked like an
answer:

- `slope 0` → smooth. So it is a shading term.
- every drawn layer stripped → still mottled.
- chop family removed → still mottled.
- each specular term zeroed *individually* → still mottled.
- **gloss + spec + sheen zeroed together → smooth.**

Gloss runs `pow(dot(N,H), 114)` against a normal built from the *full-frequency*
gradient. At that exponent any pixel-scale wobble flips the highlight fully on or
off — the 4–8 px blocky mottle. Fixed by giving the specular normals a
band-limited gradient (`shadeSmooth` 5 px) and widening the lobe 52 → 34.

This retroactively explains three earlier failures: sharpening amplified it
(noise), denoising removed it *and* our only fine content (that content was the
blob edges), and supersampling halved the fine-band energy for the same reason.

### Other fixes that landed

- **Crest stroke from a single-train path field.** Contouring the summed height
  is contouring a beat, whose level sets break wherever components cancel —
  2.18× the boundary-per-unit-stroke of a clean band, against 1.46× for one
  train. That is the cauliflower edge.
- **`dirWander` removed.** Spatial phase perturbation across many components
  decorrelates them: 62 % of the height field's variance below 8 px, against 31 %
  at zero. The additive-bend replacement was no better (50 % / 68 %).
- **Group velocity.** Loop quantisation floored every envelope frequency, so all
  six ran at 1.2–3.4× crest speed instead of 0.5×, and both envelopes in each
  state landed on the *same* forced frequency so they could not beat. Groups
  outran the waves instead of sliding back through them, so crests never got born
  or died — invisible in a still, obvious in motion. Groups were also 960–1576 px
  wide against ~450 px of visible water.
- **Offshore foam was gated four times over** — `whitecapSteep` above what the
  slope field reaches, `deepFade`, `tauP`, `foamDeepThr`. Each alone zeroes the
  result, so sweeping any one produced byte-identical output across a 17× range.
  Whitecapping is now gated on slope and front face rather than slope AND crest
  height, which were uncorrelated (−0.008) and whose product ran 7× below either.
- **Stokes drift tapered with depth.** Applied flat it was 28 px/s of onshore
  transport in deep water, carrying foam 435 px into the coast per loop.
- **Colour keyed to wave height** — troughs deepen, crests go teal.
- **Energy ordering restored.** Verification caught `heavy` reading *less*
  energetic than `windy`, from my own ratio-scaling of `injWhitecap`.

### The remaining gap, precisely

Fine-detail coherence: neighbouring-pixel correlation of the high-frequency
residual is **0.285 against the plate's 0.583**. Everything else sits at
0.78–0.94 of the plate. At 4× magnification the plate is smooth water crossed by
hair-thin bright filaments; ours is chunky 4–8 px blobs.

Three experiments, all negative, which together narrow it:

- **Stamped capsule marks** (`markGain 0`, machinery kept). Closes the spectral
  gap — fine-band energy 0.45 → 0.89, the only thing that has ever moved it — but
  reads as hatching when dense and floating debris when sparse, with no usable
  setting between. A connected branching network is not a population of
  independent shapes; that is topological, not tuning.
- **Curl shear** (`curlGain 0`). Divergence-free and correct, but foam lives
  6.4 s here while real filaments are folded over minutes. Shear cannot make a
  filament from a blob in that time. Cutting the diffusion so shear could act
  made the foam field *worse*, 0.543 → 0.328.
- **Filamentary injection along the crest contour** (`injFilament 0`). Thinness
  moves toward the plate (0.919 → 0.819 against 0.788) with coverage landing on
  it, but coherence dips and it reads noisier. Closest of the three; worth
  another pass.

**Supersampling ruled out aliasing**: rendering at 2× and averaging down *halved*
the fine-band energy, so our fine energy is the hard edges of chunky blobs, not
sub-pixel detail. `supersample.py` keeps the harness.

### Measurement discipline — the important part

**Instruments disagreed with the owner's eye repeatedly, and the eye was right
every time.** Statistics that matched while the picture was obviously wrong: mean
luma (exactly), high-frequency energy (0.0855 vs 0.0843), foam fragmentation
(8613 pieces vs 8678), local contrast, glint density.

Statistics that *inverted* — said we were better when we were worse:

- spectral peakiness said the plate was more regular than us (137 vs 101)
- orientation spread said we were less parallel (0.733 vs 0.574)
- a coastal-foam coverage number said we were under when we were over

All for the same reason: our fine content is noise, and noise skews every texture
statistic in whichever direction that statistic happens to look.

**Only two measures never disagreed with the eye:**

- **lag-1 correlation** of the fine detail (ours 0.285, plate 0.583)
- **the local-contrast map** (`busy_map.py`), looked at rather than reduced

Use those two. Treat any other aggregate texture statistic as untrusted until it
has been changed deliberately in both directions with the picture checked.

### New tools from this day

| script | what it is for |
|---|---|
| `busy_map.py` | local-contrast map + busy share by distance from shore + block-to-block variation |
| `bake_world.py` | solve the world wave field; reports which families are resolvable |
| `encode_world.py` | pack the solved field into the two web textures, with round-trip check |
| `worldcoast.py` | render a crop of the real world coast at a camera scale |
| `supersample.py` | render at 2× and average down |
| `look.py` | quick still of a state (crop + full frame) |
| `crest_source.py`, `path_field.py`, `stroke_path.py` | which field a stroke should be contoured from |

---

## 1B. 2026-08-29 session: the "reads as paint" investigation

**Status: the live sea still reads as paint rather than water at all three zoom
tiers. Three real bugs were found and fixed; none of them was the cause. The
next step is a like-for-like scene (below).**

Commits: `08c0b86` `0d02e8e` `7bf7f3c`.

### Fixed

- **The primary train shoaled on the wrong wavenumber.** The phase texture
  carries `|grad S|` from the eikonal solve. That is the right k for the wave's
  GEOMETRY and the wrong one for its AMPLITUDE: where rays cross, the phase
  gradient collapses while the water is still the depth it always was, so
  Green's law answered a 2.6x-too-small k with a 43% amplitude deficit -- on the
  focus caustics, where the biggest waves are. `shoalAmp` takes the depth-solved
  `dispersionK` now, as the secondary and chop always did. 8.18% off the offline
  field -> 0.63%.
- **The palette darkening is gone**, at the owner's direction ("the one for the
  mvp was perfect"). It had been calibrated on captures of a sea that had never
  run. luma 62.4 -> 75.8 against the plate's 95.5.
- **Bake constants were in scene pixels, not tuned pixels.** `ray_focus` smoothed
  with `gaussian_filter(div, 9.0)` -- 9 px meant 0.08 of a wavelength on the
  plate and 0.75 on the world. focus MULTIPLIES the primary amplitude and swings
  5.2x, so the sea was modulated by amplitude blobs the size of its own waves at
  every zoom. Five more constants in `impact_sites` had it too, and its site
  COUNT is a density (54 -> 519). `precompute._px()` converts them now; on the
  plate the factor is exactly 1.

### Ruled out, with numbers -- do not re-investigate without new evidence

| hypothesis | measurement that killed it |
|---|---|
| the LoD fade table | every gain is 1.0 from `region` inward; `?water.raw` confirms (white 0.69% vs 0.64%) |
| the picture is blurred | live carries MORE fine spectral energy than offline (1.0% vs 0.3% in the 2.5-6 px band) |
| noise mipmapping differs | offline builds mipmaps too, anisotropy 8 |
| the noise textures differ | byte-identical; both breaking gates evaluate to the same mean |
| bake resolution costs the shading | `\|grad h\|` matches: mean 0.3064 vs 0.3075, p95 0.81 vs 0.87 |
| weather default 0.34 vs baked 0.5 | matching it moves luma by 1.7 |
| the painted-plate blend | `uPlateInfluence` and `uPlateTint` are 0.0 in all three presets |
| `facing` is broken | it reads `acc.g`, the wave-surface gradient -- the front face of each wave, not the coast's aspect. It was never supposed to vary windward vs lee |
| foam reprojection blurs it | the live layer steps 30/s against the offline's 48, so it blurs LESS |
| the deep-water amplitude normaliser | the 55th-percentile divisor measures 0.9995 -- it really is the identity |

### Where it actually stands

Depth-matched (same sdf bands), weather-matched, at the tuned wave scale:

| band | offline z=1 luma/sd/white | live luma/sd/white |
|---|---|---|
| surf 0-60 | 132.8 / 67.2 / 30.2% | 89.5 / 43.5 / 5.7% |
| shelf 60-230 | 82.3 / 38.4 / 4.4% | 78.6 / 30.2 / 1.6% |
| deep >230 | 89.8 / 43.1 / 6.4% | 76.7 / 28.4 / 1.1% |

Average brightness is close. RANGE is not: contrast uniformly ~1.4x low at every
depth, whitecaps 3-6x low, driven by 4-9x less of the sea breaking.

**The one quantity that can differ invisibly is `acc.energy`.** `hn` is
normalised by `sigma = sqrt(energy*0.5)`, so the height field and its gradient
can match the offline exactly while `Hloc`, `breakDepth` and the breaking gate
all collapse. Live `hn` p95 is 0.6875 against 0.7725 -- 11% lower, which
compounds hard through `crestness`'s threshold and `shallowGate`'s.

That 11% CANNOT currently be attributed, because `worldcoast` is a different
scene with different bathymetry, and 8-11% is exactly what two different
coastlines would give. Every comparison in this section inherits that caveat.

### The next step: a like-for-like scene

Build a scene that IS the live camera's region -- crop the world art and masks to
it, upsample so one scene pixel is one tuned pixel, OVERWRITE the derived masks
with the world's own (so mask inference cannot add its own error, per the
false-shoal warning in `build_plates.py`), then solve all three families at
1666x937. Compare against a live capture at the same camera. Every remaining
difference is then the port, with nowhere left to hide.

### Instruments built this session -- use these before looking

- `?water.raw` bypasses the LoD fade table. It is the only part of the live layer
  no offline render can vouch for, because it is not the offline renderer's.
  Check anything blamed on the fades here first.
- `?water.probe` reads the wave pass's own channels off the GPU -- `breaking`,
  `whitecap`, the crest path, `|grad h|`, the foam buffer. None of them reach the
  composite, so NO screenshot can show them. `src/wc_probe.py` prints the
  offline's same numbers.
- `scripts/capture-ocean-comparison.mjs` captures the live layer with the
  simulation actually running, and refuses to write a frame that never stepped.
  `--span` and `--anchor` frame it; the anchor is a world uv the zoom holds fixed.
- `src/world_ref.py` renders the offline one PIXEL REGISTERED against a
  whole-world capture. `src/wc_bare.py` is offline geometry with foam and spray
  off, to pair with `?water.bare`. `src/negative_compare.py` does the difference
  and the per-depth-band statistics.

### Two traps this session walked into

- **`bake_world.py` and `encode_world.py` both read `WORLD_LAMBDA`.** Setting it
  for one and not the other writes textures at one scale and a manifest claiming
  another. It is silent: the pixels are right and every length derived from them
  is wrong. Run them with the same environment.
- **A tolerance that cannot fail is not a test.** `verify_port.py` gated two
  [0,1] mask fields on `max <= 1.01` and `max <= 0.60`. The shore band reported
  PASS while sitting at 90% of its own magnitude from the reference. Masks are
  judged on the mean now.

### A frame error in the bake, not the port

`build_plates.py` writes the shore band with the plate's constants (-13..+46) in
whatever pixels its scene uses. On `scenes/world` those are world px, so the
baked band is 9.6x wider than the wave-relative width it was tuned at -- which is
why an offline render of the whole world rings every coast in a white halo.
**That render is therefore not a valid target; `worldcoast` at z=1 is**, because
scene px are tuned px there. The live layer applies the constants in tuned px,
which is the frame they mean something in.

---

## 1C. 2026-08-29 evening: four defects that were in the picture all along

Commit: `085a185`. Owner report: *"Still seeing coastline boundary issues along
with the paint look still being here, a lack of depth that light reflection and
shadows provide and I see very little variance/wave animations with the wave
crashing back into the ocean or against the coast."*

Four of those complaints landed on real bugs. None of them was in the shading.

### The shoreline distance field had no zero in it

`build_plates.py` wrote `where(water, d_water, -d_land)` from two Euclidean
distance transforms. A water pixel's distance to the nearest LAND pixel is at
least 1, and a land pixel's to the nearest WATER pixel is at least 1, so the
field jumped -1 to +1 with a two-pixel dead band between. **There was not one
pixel in the entire world where `|sdf| < 1`** -- verified directly on the .npy:
`|sdf|<1: 0`, smallest positive exactly `1.0`, largest negative exactly `-1.0`,
values quantised to the EDT lattice (1, sqrt2, 2, sqrt5).

The water's own coverage is `smoothstep(-0.6, 0.6, sdf)` in WORLD pixels. That
alpha ramp could therefore never take an intermediate value at a texel centre,
and at the closest camera one world pixel is twelve screen pixels. What it drew
is the blocky coastline the owner reported three times: a hard edge following the
pixel lattice, with square corners, that the painted land underneath does not
have.

Fixed by a half-pixel shift (which puts the crossing between the two centres,
where the boundary is) plus sub-pixel placement from the gradient of a lightly
smoothed coverage, blended over 1.5 px so the far field stays exactly the EDT
that the shelf and the surf-zone widths were measured against. **Water coverage
unchanged to five decimal places; no point of the coast moves more than 1.03 px;
axis-alignment of the boundary normal 0.077 -> 0.038.** Chain to re-run:
`build_plates` -> clear `scenes/world/work/` -> `bake_world` -> `encode_world`
-> `export_web`. The solve caches on families, not on the coastline, so a stale
`work/` silently bakes the old coast.

### The foam material coordinates were half floats

They are stored as OFFSETS already (`mat - px`, with `backPx` handling the
reprojection) because the absolute values reach five figures. But the offset
itself grows for as long as a parcel of foam survives, and half-float spacing
grows with magnitude: 1 unit at 1024, 2 at 2048, 4 at 4096 -- against lace and
mark strokes a fraction of a tuned pixel wide, which are CONTOURED from those
coordinates. Past roughly a thousand tuned pixels of drift the contour quantises
onto an axis-aligned lattice and the foam accumulating inside each cell saturates
it. **What that draws is a grey rectangular slab with square corners lying on
open water, and it grows the longer the page is left open.** That is the owner's
"random white lines that seem wrong".

A/B at one camera: at 14 s a faint rectangle outline, at 45 s a solid slab, and
at 45 s with RGBA32F it is completely absent. The fix existed behind
`?water.foam32` and shipped OFF, because the capture that judged it ran fourteen
seconds and the offsets had not grown yet. **Any measurement of an INTEGRATED
field needs a settle long enough for that integration to reach steady state, and
"long enough" for a material coordinate is not the same as for foam density.**
Now the default; `?water.mat16` restores the old buffers. Spray got it too --
same scheme, and it is no longer switched off. Costs 20 bytes per viewport pixel.

### The cast shadow marched a fixed number of SCREEN pixels

`uShadowStep` was excluded from `TUNED_TO_SCREEN` on the reasoning that it is
"already written against uRes" -- which is the reason it BELONGS there.
`uReliefLift` and `uDiffuse` are written against uRes too, and that is exactly
what makes them tuned lengths consumed as screen offsets. The test is not how the
value is spelt in the shader, it is whether the thing being measured is a mark on
the picture or a distance in the water. Unconverted, the three taps reached 0.14
of a wavelength at the camera it was tuned at, **0.44 at the territory approach
-- the far side of the same wave, so it shades the crest instead of the trough --
and 1.7 wavelengths at world zoom.** A shadow sampled in antiphase does not
weaken, it inverts, and it inverts at the swell's own spacing.

### Coastal ambience defaulted off

`DEFAULT_ENVIRONMENT_LAYER_VISIBILITY.L1_2 = false`, and L1_2 owns "wet shoreline
contact, swash, breakers, and foam". The flag predates there being a spray pass
to switch on; the pass runs every frame either way and only `uSprayGain` was
zeroed. The default view was a sea that stopped at the rock instead of meeting
it. Now on.

### Also

`uCrossTrain` was gated on `boldCrest`, which is zero for every camera wider than
about span 0.13 -- the whole world and territory range. The shader that draws the
cross train says its purpose is to make stroke SPACING irregular, because one
regular grid is corduroy and two interleaved are not. The anti-corduroy term was
switched off exactly where the corduroy shows. Now gated on `line` alone.
Measured on its own: orientation concentration 0.159 -> 0.148, i.e. real but
small. And `sunXY` now comes from `uLightDirection` rather than a second spelling
of the offline sun; they agree to one degree today, so that is correctness
against a future light change, not a fix.

### Ruled out this session, with numbers

- **Opening the LoD gates** (`?water.raw` at territory, after the above landed):
  orientation 0.230 -> 0.209, and the picture reads as MORE ribbed, not less --
  the crest-line floor returns and draws a stroke down every crest. The gate is
  doing its job. Do not open `uCrestLineFloor`, `uGlossGain` or `uSheen`.
- **Weather.** The live default is 0.34 on a calm->heavy scale and the reference
  clip is `heavy_crashing_surf`, i.e. 1.0. Sweeping 0.34 -> 0.70 -> 1.00 moves
  luma sd 23.15 -> 24.57 -> 24.99, whitewater 0.41% -> 0.49% -> 0.51%, and
  orientation not at all. The three frames are visually the same sea. **This is
  the PINNED list working as designed** -- everything that shapes a crest is
  fixed to the baked state, so weather moves amplitudes and thresholds only.
- **Un-pinning `uSpread`.** It is safe to un-pin: the spread is an analytic
  angular offset on the shared solved phase (`th = S*m*cos(dl) + k0*m*sin(dl) *
  dot(px, perp)`), continuous in `dl`, needing no re-solve and tearing nothing --
  so its place in PINNED is an over-application of the rule. But 27 deg -> 38 deg
  at weather 1.0 moves orientation 0.237 -> 0.225 and nothing else. Reverted: not
  worth weakening a documented invariant for a 5% number.
- **The sdf decode order.** `flowAt` hardware-bilinears the ENCODED signed-sqrt
  and squares afterwards, which is not the same as interpolating the decoded
  distance -- the argument `phaseAt` already makes for the phase, never made for
  its sibling. Real, and small: rms 0.19 world px within `|sdf|<1`, max 0.30,
  `waterSoft` differing by more than 0.05 on 0.99% of pixels, coverage identical.
  **It is NOT the blocky coast**; the missing zero crossing was.

### What is still open

The sea reads as long parallel diagonal bands at every zoom. That survives all
six changes above, the LoD gates being opened, the full weather range and a 41%
wider directional spread. It is therefore not in the drawing and not in the
tuning -- it is the height field. Seven components on ONE solved phase field
sharing one direction family is a narrowband sea, and a narrowband sea is regular
by construction. `wave.frag`'s own regional-energy comment says the same thing
from the other side (block sd of luma 0.067 against the plate's 0.120), and
`uRegionTone` sits at 0.16, roughly half what closing that gap would need.

Two candidates, neither tested: raise the regional field's authority (one
uniform, but it is tuned offline and has to be re-exported), or give the primary
train more than seven directions. The scale-resolved deficit is unchanged from
1B: 300 / 700 / 1500 tuned px at 9.7 / 3.4 / 0.4 against the plate's
19.2 / 13.5 / 4.6.

---

## 1D. The projection, and what an ocean actually looks like from a map

The owner, looking at the world tier: *"This view doesnt seem to be 2.5D this
high up so just a birds eye view i guess?"* He is right, and the world's own
manifests say so:

| Layer | Manifest | Projection |
|---|---|---|
| Terrain relief | `terrain-relief-r6.json` | `orthographic-plan` — nadir |
| World land layout | `world-land-layout-r1.json` | `orthographic-plan` — nadir |
| Structures (capital / project / skill) | `capital-structures-r1.json` and siblings | `orthographic-high-oblique`, `pitchDegreesFromHorizontal: 72` = **18 off nadir** |
| Town fabric | `town-fabric-r1.json` | `high-oblique-orthographic` |
| **Water** | `oceanStates.ts` | **`uViewTilt` 34 off nadir, at every zoom** |

So the GROUND is plan view everywhere, and the things STANDING on it are drawn
eighteen degrees off vertical from the territory tier down. The water was lit for
thirty-four at every camera -- measured off the offline plate, which is its own
scene with its own camera, and then applied to a map. Wrong by 34 degrees at the
world tier and by 16 at the capital, where buildings standing in the water
disagree with the water they stand in.

`composite.frag` argues the case against itself: *"This is a 2.5D view, not a
plan view... A straight-down view vector puts every highlight on the wrong
facets."* True at the capital. At the world tier it is the exact inverse of the
truth, and `liftPx = uReliefLift * sin(vt)` rides on the same number -- crests
were standing up-screen on a map that has no up-screen.

`uViewTilt` now walks the tier ramps every other layer already reads
(`worldToTerritory`, `territoryToCapital`): nadir at the world, the land art's
own 18 by the capital. `tests/architecture.test.mjs` holds the constant against
`capital-structures-r1.json` so the two cannot drift.

### What the references say is visible at world zoom

Researched because two attempts to fix the wide shot by intuition both made it
worse -- see the reverted floor above, and the whitecap population before it.

- **Individual waves are not visible.** Nothing in the satellite-imagery
  literature resolves them. What is documented is colour, glint, whitecaps and
  large-scale structure. Drawing waves there is not a simplification of reality,
  it is a different picture.
- **Whitecaps are 1-4% coverage and far sub-pixel.** Monahan and O'Muircheartaigh
  (1980): W = 2.95e-6 * U10^3.52, so about 1% at 10 m/s and 4% at 15 m/s. They
  average into a slight brightening and desaturation. They are never discrete
  flecks, which is precisely why drawing them as cells read as snow.
- **The visible structure is STIRRED, not mottled.** Eddies and fronts "stretch
  and fold patches" into "narrow swirling bands", "wisps and spirals", at tens to
  hundreds of km. Our `rE` field is isotropic value noise, which is the wrong
  SHAPE, not the wrong amplitude. `uCurlGain` already exists and ships at 0 --
  rejected at close zoom, where divergence-free curl shear moved neighbour
  coherence 0.281 to 0.293 and nothing else. At the wide shot it is not a
  refinement of the texture; it is the texture.
- **Glint at nadir cannot be sharp.** Cox and Munk: mean square sea-surface slope
  reaches (tan 6 degrees)^2 at 14 m/s. With the sun near 56 degrees elevation and
  the view straight down, the half-vector sits ~28 degrees off vertical and
  almost no facet is steep enough to return it. Glint from directly above is a
  broad dim wash, not glitter -- so the specular WEIGHTS tuned at 34 degrees do
  not transfer, and re-tuning them at the new angle is part of this work rather
  than a follow-up.
- Open water runs near-black in the deep sea to turquoise over shallows. Ours
  sits at rgb (25, 84, 130): bright, and strongly blue-dominant, for open ocean.

### A target that was not one

Section 1C and the reverted floor quote "the tuned plate downsampled to world
zoom" at luma sd 38.4 and 6.6% bright pixels. **Do not use those numbers.** The
plate is a close-up cliff scene, so most of that contrast is surf against rock,
not open ocean. It is the right IDEA -- stand back from the tuned sea and measure
what survives -- and the wrong scene to do it on. A wide-shot target needs a
tuned OPEN-WATER plate, which does not exist yet.

---

## 1E. The tuned sea does not survive being stood back from

The question behind two failed attempts at the wide shot -- a whitecap population
and an open-wave floor -- was never asked directly: **does the tuned treatment,
seen from the world camera, look like an ocean or like corduroy?** If it looks
like an ocean the LoD fade is too aggressive; if it looks like corduroy the fade
is right and the wide shot needs a different treatment, not a quieter one.

`src/wide_target.py` answers it by construction rather than by opinion.
`lfl_build.py` crops the world art and its authoritative mask to a camera and
magnifies until one scene pixel is one TUNED pixel. Render that, downsample by
the live camera's own `zc`, and the result is what the live layer would show at
that camera **if it rendered at 1/zc supersampling** -- no fade, no port, no
aliasing. Any difference from a live capture is the fade; any difference from a
sea is the treatment.

Built on 150x84 world px of the north coast, 80% open water, at
`heavy_crashing_surf` -- the state the owner keeps comparing against:

```
python lfl_build.py wideopen 0.08971 0.4791 0.1594 heavy_crashing_surf
python wide_target.py wideopen_heavy_crashing_surf 0.1061
   1440x807 tuned px  ->  152x85 at zc 0.1061
   open water   rgb (50, 91, 116)  luma 81.2 sd 37.35  bright>150  6.82%  orient 0.212
   surf zone    rgb (91,128, 145)  luma 118.9 sd 55.42  bright>150 29.44%  orient 0.067
```

**It is corduroy.** Diagonal streaks across the whole open sea, orientation
coherence 0.212 against 0.067 in the surf zone -- three times more directional in
open water than where the waves are actually breaking, which is the signature
exactly backwards from a real sea. And 6.8% of open-water pixels read bright,
where Monahan puts whitecap coverage at 1-4% even at fifteen metres a second;
those are drawn crest lines, not caps.

So the answer is settled, and it is the second one:

- **The LoD fade is correct.** Suppressing the swell at the wide shot is not an
  over-correction, it is the only thing standing between the world map and the
  picture above. The floor attempt reproduced this exactly, which is why it drew
  a contour map.
- **There is no dial setting that turns this treatment into a map ocean.** It is
  a close-up treatment. Standing back from it does not simplify it; it turns its
  crest strokes into a weave.
- **The current wide shot -- flat blue mottle -- is closer to right than anything
  tried since.** It is under-developed, not mis-developed, and what it is missing
  is what the references list for that altitude: stirred structure rather than
  isotropic mottle, whiteness at the physical 1-4% rather than 0.12%, and a
  deeper less blue-dominant open-water palette (live sits at rgb (25, 84, 130)
  against (50, 91, 116) here, and real deep sea is darker than both).

The wide shot is therefore a SEPARATE TREATMENT sharing the same fields, not a
level of detail of the close one, and the territory tier is the crossfade between
two pictures rather than one picture with a dial on it.

---

## 1F. The wide shot's problem is ALIASING, not detail

The owner, on being shown that the wide-shot target was derived by downsampling
the close treatment: *"if youre just downsampling from close detail shouldnt we
work the other way close detail to world view?"* He is right, and following it
found both the real deficit and the real mechanism.

### Every still statistic said our water and the reference are the same

Orientation coherence versus scale, on the world bake's open water and on the
reference clip, both at `heavy_crashing_surf`:

```
factor      world bake      MVP plate
1.00          0.102           0.128
0.50          0.200           0.219
0.25          0.322           0.333
0.106         0.316           0.442
0.05          0.302           0.530
```

Both get MORE directional the further back you stand -- so the coherence was
always there and the fine detail was hiding it, exactly as the owner said. But
**the plate is more of a grating at map scale than we are**, and it carries less
contrast (luma sd 30 against 37). On both of my metrics the thing he approves of
scores worse than the thing he is complaining about. **Coherence at map scale is
not the defect, and neither is contrast.** Two more measurements that do not
discriminate; see section 6.

### Motion does discriminate, and by a factor of four

Mean |dLuma| per half second over water, the statistic from
`scripts/measure-ocean-motion.mjs` and `src/wide_motion.py`:

```
                          full density   at the world camera   kept
  heavy_crashing_surf.mp4     30.7              24.4            80%
  live layer                  28.5 (capital)     6.4            22%
```

At the density it was tuned at, our water matches the reference almost exactly.
Downsample 9.4x and the reference barely loses any movement while we lose
four fifths of ours. Averaging destroys motion that lives in fine detail and
preserves motion that lives at large scales, so **the reference sea moves at
large scales and ours moves in its texture.** That is the "static pattern with a
shimmer on it" the owner has been describing since the beginning, in a number.

Offline, on `wideopen` (150x84 world px, 80% open water), open water only:

```
  openWaveVis 0 (as shipped)    2.27      the fade costs 91% of the sea's motion
  openWaveVis 1 (no fade)      25.23      against 24.4 for the reference
```

### The decoupling: right diagnosis, and it still failed

`openVis` scaled the height AND its gradient. Slope is height times wavenumber,
so it lives an octave up: at twelve screen pixels a wave you can still see the
swell as broad light and dark, and you cannot see its facets. So the height was
left alone and only `acc.g` faded -- which also closes the trap that killed the
previous attempt, since `acc.g` sets `totalSteep`, `totalSteep` sets `whitecap`,
and `whitecap` is a term in the composite's `lineGate`. No slope, no whitecap, no
strokes.

It worked on every number and on the offline picture. Open-water motion 2.27 ->
8.71, live world 6.36 -> **19.36** against the reference's 24.4, and the offline
render at the world camera had no arcs at all: broad tonal swell, white confined
to the coast. The territory configuration that broke the last attempt was clean
too.

**And the live world view came back as dense diagonal corduroy.** Worse than
before the change.

### Why, and it is the finding

The offline picture is a 1440x807 render averaged down to 152x85. **It is
supersampled 9.4x. The live layer is not.** `wide_target.py`'s own docstring says
so -- "what the live layer would show at that camera IF it rendered at 1/zc
supersampling" -- and it was then used as though it predicted the live frame. It
does not. It predicts the live frame's *content*; the live frame also has all the
ALIASING that the supersample removes.

So the wide shot's problem was never that the swell is wrong to show. It is that
the swell is being POINT-SAMPLED at twelve screen pixels a wave, and everything
finer than that -- the secondary train at 6.9, the chop at 2.5, every harmonic
above m=1 -- folds back into the frame as a regular weave. Fading the whole field
to zero removes the aliasing, and takes the motion with it. That is the trade the
current LoD makes, and it is a crude stand-in for the operation actually wanted:

**Band-limit the field, do not switch it off.** `addSpread` already takes each
component's wavenumber multiplier `m`, so each component's screen wavelength is
`lamP * zc / m` and each can be attenuated on ITS OWN resolvability rather than
all of them on the primary's. The chop and the high harmonics fade first, the
long swell survives longest, and what is left at the wide shot is smooth moving
tone -- which is both what a correct mip chain would give and what the ocean
references describe. It is also the one construction consistent with every
measurement above: it keeps the large-scale motion (the deficit) and removes the
sub-pixel content (the aliasing).

Reverted rather than tuned around, per the criterion stated before the attempt.
Kept: `src/wide_motion.py`, and `OCEAN_OPEN_WAVE_VIS` in `ocean_gl.py`, which is
the only way to render what the wide shot actually shows.

---

## 2. Running it

```bash
cd src
python reproduce.py                    # everything, from references to validation
python render.py all                   # the three clips + webp + gif + sheets
python validate.py ../outputs/heavy_crashing_surf.mp4 --preset heavy_crashing_surf
python stage1_gate.py heavy_crashing_surf
```

Other workspaces, both driven by `OCEAN_ROOT` (no forking):

```bash
python closeup.py build && python closeup.py render all    # 2.4x magnified study
python newscene.py init  harbour ../path/to/plate.png      # an unrelated plate
python newscene.py render harbour heavy_crashing_surf
```

**The shipping world.** Nothing drove this end to end and it had to be
reconstructed from `build_dense_world.py`, which builds a DENSER copy rather than
the one that ships. Anything touching the coastline, the bathymetry or the solve
needs all five steps, in order:

```bash
cd src
export OCEAN_ROOT=../scenes/world PYTHONPATH=. OCEAN_CALM_REFS=
export OCEAN_WATER_MASK=../scenes/world/city_coast_water_mask_r1.png
export OCEAN_G=13.537503 OCEAN_DEPTH=10.934099 OCEAN_SHELF=23.951140
python build_plates.py                 # masks, shoreline SDF, bathymetry
rm -rf ../scenes/world/work            # THE SOLVE CACHE KEYS ON FAMILIES, NOT
                                       # ON THE COASTLINE -- a stale work/ will
                                       # print "cached" and bake the old coast
OCEAN_WORLD_SCENE=world WORLD_LAMBDA=12 python bake_world.py
OCEAN_WORLD_SCENE=world python encode_world.py
OCEAN_WORLD_SCENE=world python export_web.py
```

`OCEAN_G` is `WORLD_LAMBDA * 2pi / T^2` for `T = 2.36`, and `bake_world` derives
it again itself; it is set here only because `build_plates` runs first and needs
the same value. Re-encoding changes the two field PNGs, so
`tests/assets.test.mjs` checkpoint hashes have to be updated in the same commit.
Editing only the offline SHADERS or the presets needs `export_web.py` alone.

---

## 3. Architecture

```
refs/canonical/   S, C1..C8 — stable IDs (the supplied manifests contradicted each other)
masks/            water mask, shoreline SDF, bathymetry, clean water plate, vignette
src/wavefield.py  eikonal solve: |grad S| = k(x), k from omega^2 = g k tanh(k d)
src/precompute.py shoaling amplitude, ray focus, 54 impact sites, tileable noise
src/shaders/      quad.vert, wave.frag, foam.frag, spray.frag, composite.frag
src/presets.py    the three sea states — art direction only
outputs/          deliverables      closeup/, scenes/   study workspaces
```

**Passes per frame:** wave (MRT: geometry / flow / swell) → foam (ping-pong,
persistent) → spray (ping-pong) → composite.

**Key invariants — do not break these:**

* `S` is solved once per wave family; `theta = S - omega t` therefore *must*
  travel. Shoaling, refraction, diffraction and focusing are consequences, not
  decorations.
* Height is normalised by **spectral RMS**, not the sum of amplitudes.
* Per-component steepness is capped at `MAX_STEEP = 0.26`.
* Every angular frequency is quantised to an integer multiple of `2*pi/T_loop`,
  and every time-scrolled noise lookup uses `loopScroll`. This is what makes the
  loop seamless — **any new time-varying term must respect it**.
* Dither is gated on water coverage so land stays bit-identical.
* x264: one IDR per loop, `aq-mode=0`, `psy-rd=0`, CRF 11.

**Shading fields available in the composite** (worth knowing before adding more):

| field | what it is | use it for |
|---|---|---|
| `hn`, `gr` | full-band height and gradient | chop-scale detail |
| `hnS`, `grS` | swell-only (interference of spread components) | broad tone |
| `hForm` (`flow4.z`) | **clean** two-train form, no spread/jitter | anything drawing a wave's SHAPE |
| `bphase` (`texSwell.w`) | break phase, 0 offshore → 1 at collapse | the pre-break lifecycle |
| `depth`, `water`, `shoreZ` | from the plate | gating |

`hnS` is an *interference pattern* and has no shape to draw — keying shape terms
on it produces mottling. That is what `hForm` exists for.

---

## 4. The verification system

This is the most valuable asset here. Each of these turned a subjective complaint
into a number, and several have **calibrated reference values** so a result can be
interpreted without re-deriving it.

| script | measures | reference value |
|---|---|---|
| `stage1_gate.py` | crest phase transport on the bare wave field | error < ~8 %, 0 backward steps |
| `validate.py` | land stability, crest travel, foam persistence, loop, fps | see §1 |
| `plate_match.py` | value range, saturation, foam opacity vs the plate | plate: L p05 0.130 / p50 0.283 / p99 0.960, sat 0.646, foam luma 0.851/0.979 |
| `grid_compare.py` | **cell-by-cell**, incl. orientation coherence | see calibration below |
| `local_contrast.py` | tonal range *inside* a wave-sized window, by shore distance | plate: surf 0.152, mid 0.093, open 0.060 |
| `blue_noise.py` | high-frequency energy in water *away from* foam | plate 0.0420 (2 px), 0.0231 (pixel) |
| `foam_structure.py` | foam run-length along/across, surf-zone openness | plate: 6.9 px, ratio 0.97, 74.4 % open |
| `foam_shape.py` | blob area / elongation by second moments | library: 61–71 px², elong 2.4–2.6 |
| `nofoam_test.py` | **acceptance test**: white removed, is a wave still readable? | qualitative |
| `coherence_ablate.py` | which layer adds isotropic vs aligned structure | — |
| `prebreak_probe.py` | the lifecycle in isolation + raw drivers | — |
| `debug_fields.py`, `slab_dump.py` | internal buffers side by side with the composite | — |

**Coherence calibration** (orientation alignment, from the structure tensor):

```
white noise                0.242
smoothed isotropic noise   0.391   <-- our water sits here (0.393)
anisotropic noise 8:1      0.901
perfect sine grating       1.000
source plate               0.574
```

**Current grid ratios (ours ÷ plate):** mean 1.05, std 0.83, sat 0.95,
grain 0.97, fine 0.89, wave 0.88, **coherence 0.69**.

Everything is within 0.83–1.12 except coherence.

---

## 5. Negative results — do not repeat these

Each of these was tried, measured, and made the render **worse**. They are listed
because several are individually plausible and would otherwise be retried.

1. **Optimising foam `perimeter/sqrt(area)`** → hard dotty speckle. That statistic
   is maximised by stipple. Not a usable target.
2. **Optimising orientation coherence** (via line integral convolution) → the sea
   read as combed diagonal scratches. Coherence went 0.393 → 0.470 and every other
   statistic stayed in range. Laying an aligned modulation *over* isotropic content
   buys the number, not the look. **Left in the shader behind `licTone` / `licMix`,
   both zero.**
3. **2× supersampled eikonal solve** → no measurable benefit; the error here is
   not O(h)-dominated. Reverted to `SS = 1`.
4. **A fixed breaking-depth limit** → collapsed the energy separation, windy and
   heavy landing at 11.0 % and 10.8 % foam. Must scale as `d_break = H/gamma`.
5. **Wide directional spread** (52°) plus 16° of direction wander → the wave field
   lost its crests entirely and became mottling. 38° / 9° is the usable range.
6. **Strong foam erosion** (`foamErodeK` 4–6) → confetti. It goes from solid blobs
   straight to confetti without passing through the continuous streaks the
   reference actually shows.
7. **Sub-pixel octaves** in the lace ladder (`laceScale` 14 → fourth octave at
   1.2 px) → static, and foam that flips frame to frame. The ladder is now floored
   so no octave goes below 4 px.
8. **A `pow(·, 90)` gloss lobe** on a noise-derived normal → single-pixel
   highlights; it carried a third of all isolated speck energy. Small facets need a
   *broad* lobe.
9. **Adding surface texture to fix a "grainy" read** → wrong direction entirely.
   Per-cell, our pixel grain already matches the plate at 0.97×; the grainy read
   comes from having *less structure* at the same grain level. Roughly ten rounds
   were spent on this before it was measured.

---

## 6. Measurements that were wrong (a recurring class)

Six times, the measurement rather than the render was the thing at fault. Suspect
the metric when it disagrees with the picture.

* Phase correlation reported **0 px** crest travel on a visibly travelling field
  (spectral whitening let noise dominate) → replaced with NCC on band-passed
  residuals.
* The validator **zoomed** rather than cropped a mask, shifting the coastline and
  fabricating a land-stability failure.
* A 1-D profile crest tracker broke as soon as directional spread existed.
* A 256 px FFT window quantised `k` badly enough to report a 21 % speed error on a
  correct field.
* High-frequency roughness measured at σ=3 px on the *wave field* looked alarming;
  it was the wave itself. Shoaled swell reaches ~90 px wavelength, which genuinely
  has gradient at 3 px.
* Temporal correlation of a texture is maximised by a texture that **does not
  move** — it is a guard against boiling, never a target.
* The Stage-1 gate searched for the *dominant* spectral peak, so once a long swell
  was added it compared one train's omega against another train's theory. It now
  measures the primary train's own mode over a narrow window. **Verified still to
  have teeth**: with the primary amplitude zeroed it fails at 30.6 % error.

---

## 7. The open problem, precisely

> **SUPERSEDED 2026-08-28.** This section names orientation coherence as the
> open problem. That was one symptom of the specular-lobe mottle, which is now
> fixed (see 1A). The open problem is narrower: fine-detail coherence 0.285
> against the plate 0.583, i.e. we do not make hair-thin filaments. Three
> approaches have been tried and recorded as negative results.

The render reads as painted/mottled; the concept art reads as flowing water.
Measured, the difference is **not** brightness, saturation, hue, spectrum in any
band, foam coverage, foam connectivity, foam run length, edge sharpness, pixel
grain, or local contrast — all of those now match within ~10 %.

It **is** orientation coherence: 0.393 against the plate's 0.574, where smoothed
isotropic noise scores 0.391. Our water is statistically indistinguishable from
isotropic noise in its orientation structure.

Ablation shows no single layer is responsible (0.377 all-on, 0.369–0.380 with any
one of foam, detail waves, fine relief, chop marks, hue variation or posterise
removed) because the isotropic content is spread across all of them. The largest
single source is the **foam mask, which is a threshold of a scalar field** — and
thresholding a field yields blobs however anisotropic the field is (taking the
carve field from 6:1 to 20:1 moved coherence by 0.000).

**What that points at:** rebuild foam as *strokes traced along the flow and crest
lines*, so the mask itself is made of curves rather than having curves laid over
it. Line integral convolution is the right machinery and is already in the shader,
verified at 0.29 → 0.90 coherence in isolation on this renderer's own flow field.
It failed as a *modulation*; it has not been tried as the *mask*.

Do not simply turn `licTone` back up. See negative result #2.

---

## 8. Constraints

**Frozen** by the agentic review, and the freeze is good discipline — this project
has repeatedly destroyed good behaviour while improving something else:

> wave propagation direction · large-set timing · wave spacing · land/compositing ·
> overall palette · crest breakup shapes · shoreline timing

**Working preferences (owner):**

* Blunt, evidence-backed pushback; never soften into agreement.
* Verify each layer in isolation before enabling the next — composites hide
  defects. This is why `stage1_gate.py` and the `bare`/`flat_ocean` switches exist.
* It is a **game/art style goal, not a physics engine**. Physics keeps the motion
  honest; it must not gate the look. The detail-wave and fine-relief layers sit
  deliberately *outside* the height field for exactly this reason — they ignore the
  steepness cap and the RMS normalisation, and cannot affect breaking, the loop or
  the gates.
* The plate is a **2.5D oblique view, not top-down**. This invalidated an
  assumption baked in for many rounds (`V = vec3(0,0,1)`), and the Fresnel term had
  to be re-derived — `pow(1 - Ns.z, p)` evaluates to ~0.00005 here.

---

## 9. Portfolio integration

> **SUPERSEDED 2026-08-28.** This section predates looking at the live layer.
> It is not "a model swap": the live renderer has no framebuffers and no phase
> field, and the world is a map with a 25x zoom range rather than a plate. See
> section 1 for the actual port state and remaining work.

The owner owns this work and has asked for it to replace the ocean, river and all
water in `features/career-world/`. Another agent works the rest of that repo.

**Survey result: the existing layer is better prepared than expected.**
`features/career-world/layers/ocean/` is already a live WebGL renderer with
world-space camera uniforms (`u_cameraOrigin`, `u_cameraSpan`, `u_zoom`), a coast
geometry field at two LoD tiers, and a `defineLayerDetailContract`. The world-space,
live-shader, LoD-aware architecture already exists — there is no plumbing to build,
and an earlier concern about LoD popping was misplaced.

Port, in order of increasing difficulty:

1. **Shading** — ports almost directly; the uniform contract already has slots
   (`u_foamPatternStrength`, `u_windrowDensity`, `u_whitecapDensity`,
   `u_laceFoamIntensity`, `u_swellShadow`, `u_microRelief`, `u_sparkle`).
2. **Wave phase** — bake `S` per family as a world-space texture; the layer already
   loads `u_macroHeight` / `u_microHeight` fields of the same kind.
3. **Foam** — the only stateful part, and the one place the two models disagree.
   Coastlines are fixed once set (confirmed by the owner), so the phase field, SDF
   and bathymetry can all be baked per coastline and stay valid.

Nothing under `features/` has been touched yet.

---

## 10. What is and is not in git

Committed: `src/`, `docs/`, `refs/canonical/` (the resolved stable IDs — the two
supplied packs labelled the same images contradictorily), `requirements.txt`, and
the small JSON that scripts read back.

**Not** committed, and not on disk after cleanup either — all of it regenerates:

| gone | rebuild with |
|---|---|
| `work/` (solver + precompute cache) | any run; automatic |
| `masks/` | `python build_plates.py` |
| `outputs/`, `contactsheets/` | `python render.py all` |
| `closeup/` | `python closeup.py build && python closeup.py render all` |
| `scenes/` | `python newscene.py init <name> <plate>` |
| `previews/`, `diagnostics/*.png` | the relevant probe script |

The iteration log cites diagnostic images (`diagnostics/ablation.png`,
`stage1_*.png`, and others) as evidence. Those paths are **not tracked** — the
findings are written out in text with their numbers, and the images regenerate.
Do not treat a missing image as a broken reference.

## 11. If picking this up cold

1. `python render.py all` then `validate.py` on each — confirm the baseline still
   passes before changing anything.
2. Run `grid_compare.py` and `nofoam_test.py` to see the current gap.
3. Read §5 before proposing anything; roughly half the obvious ideas are in it.
4. Change one thing, measure with the relevant script, **and look at the picture**.
   Every metric here has been wrong at least once.
