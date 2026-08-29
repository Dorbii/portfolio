# Handoff

Everything a fresh session needs. Read this before changing anything.

`docs/03-iteration-log.md` is the full narrative; this is the distillate.
Sections 1 and 1A are current. Sections 2–11 predate 2026-08-28 and remain
accurate about the offline renderer, but read 1A first — several of their
conclusions were superseded that day.

---

## 1. Where this stands (2026-08-28)

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

**Not done, in dependency order:**

1. **Framebuffers in `WaterSurfaceRenderer.ts`.** It is a single stateless
   `drawArrays` today with no render targets at all, so foam persistence and
   material coordinates have nowhere to live. The only genuinely new plumbing;
   everything else is translation.
2. **Translate `wave.frag` + `composite.frag` to WebGL2**, sampling the two
   textures instead of solving, with the world/screen parameter split applied.
3. **Weather scalar** over the one fixed phase field, replacing three switchable
   presets (see below).

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
