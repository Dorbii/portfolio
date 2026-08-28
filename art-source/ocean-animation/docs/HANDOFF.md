# Handoff

Everything a fresh session needs. Read this before changing anything.

`docs/03-iteration-log.md` is the full narrative (1100 lines); this is the distillate.

---

## 1. What this is, and where it stands

Three seamless-looping ocean animations over one fixed painted plate — a 2.5D
oblique cliffside settlement — each holding a single sea state for its whole
duration. A GPU height-field renderer (moderngl / GLSL, headless OpenGL 3.3),
no 3-D scene, no image morphing. The land plate is returned untouched wherever
the water mask is zero.

**All three pass every objective check, and all three Stage-1 gates pass.**

| clip | foam % of water | water luma | crest travel | loop seam | land Δ |
|------|-----------------|------------|--------------|-----------|--------|
| calm_swell | 6.3 % | 0.326 | 11.2 ± 1.2, ncc 0.92 | 1.25 | 4 |
| windy_rolling_surf | 10.7 % | 0.372 | 14.6 ± 3.4, ncc 0.92 | 1.14 | 4 |
| heavy_crashing_surf | 10.0 % | 0.352 | 11.3 ± 0.0, ncc 0.93 | 1.23 | 5 |

Land delta is against a codec noise floor of 5 measured on a static clip;
renderer-level delta vs the plate is exactly **0**.

Stage-1 (bare wave field, no coast/foam/shading): crest phase speed within
1.6–4.5 % of theory, **0 backward steps in 299** for all three.

**Status: physically sound, stylistically not there.** The owner's assessment is
that the physics is the good part and the remaining gap is style — specifically a
"mottled / painted" read versus the concept art's crisp flowing water. An agentic
review scored an earlier version 7–7.5/10 and confirmed the causal sequence now
reads (swell → lip → impact → whitewater → residue).

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

## 10. If picking this up cold

1. `python render.py all` then `validate.py` on each — confirm the baseline still
   passes before changing anything.
2. Run `grid_compare.py` and `nofoam_test.py` to see the current gap.
3. Read §5 before proposing anything; roughly half the obvious ideas are in it.
4. Change one thing, measure with the relevant script, **and look at the picture**.
   Every metric here has been wrong at least once.
