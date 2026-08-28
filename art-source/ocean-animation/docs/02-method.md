# Method

## Environment inventory (checked, not assumed)

| tool | present | used for |
|------|---------|----------|
| Python 3.12.10 | yes | everything |
| NVIDIA RTX 3080 Ti | yes | headless OpenGL 3.3 core, float32 render targets confirmed by probe |
| moderngl 5.12 | installed | the renderer |
| ffmpeg 8.1.1 (x264, libwebp, gif) | yes | encoding |
| Blender 5.1 | yes | **not used** — see below |
| numpy / scipy / Pillow / matplotlib | yes | analysis, plates, QA |
| image-to-video / video-generation model | **none available** | — |

No authenticated image-to-video or video-generation tool is reachable from this
environment, so the water is generated procedurally. Nothing was purchased.

**Blender was available and deliberately not used.** The shot is a fixed
near-plan camera over a *painted* water plane with no horizon and no visible 3-D
structure in the water beyond surface relief. A 3-D renderer would have to have
its camera matched to an illustration, and its shading fought back into a
painterly palette. A screen-space height field with real wave mechanics behind it
is both the more faithful model and the more controllable one — and it renders in
about 1.7 ms per simulation step, which is what made a long visual-review loop
affordable.

## Staged gates

The work is organised so that each layer can fail *on its own terms* before the
next is switched on. Composites are seductive: foam, shallow colour and a painted
plate will happily disguise broken wave geometry.

**Stage 1 — open ocean.** `src/stage1_gate.py` renders with `flat_ocean=True`:
constant depth, analytic plane-wave phase, water everywhere, and every non-geometry
contribution disabled (no foam, no spray, no shallow teal, no crest highlight, no
plate, no vignette). Nothing in the frame but travelling wave geometry and light.

It then measures two different things with two different correct expectations:

* **Crest-phase transport, spectrally.** The dominant Fourier mode's complex phase
  is tracked over 96 samples; `d(phi)/dt = -omega` exactly, and `c = omega/|k|`.
  This is the unambiguous answer to "do crests travel".
* **Feature coherence, by 2-D tracking.** A band-passed patch is followed by
  normalised cross-correlation with sub-pixel refinement. A band-passed patch is a
  *group* feature, so it is judged against the band `[c/2, c]`, not against `c`.

| clip | crest speed / theory | error | backward steps |
|------|---------------------|-------|----------------|
| Calm swell | 53.52 / 55.45 px/s | 3.47 % | 0 / 239 |
| Windy rolling surf | 45.71 / 46.09 px/s | 0.84 % | 0 / 239 |
| Heavy crashing surf | 56.75 / 60.15 px/s | 5.66 % | 0 / 239 |

**Stage 2+ — coast, foam, spray, integration**, each re-checked against the
reference crops and finally against `src/validate.py` on the delivered file.

### Scope: the gate measures the PRIMARY train

It does not search for the dominant spectral peak. The primary train's wavenumber
is known analytically, so the gate evaluates the phase of *that* mode over a narrow
window around it -- wide enough that directional spread and phase jitter do not
fall outside it, narrow enough that nothing else falls inside.

This matters because the sea is deliberately broadband. When a long swell was added
to match the source plate's spectrum, a peak-searching gate began finding the *long*
train and comparing its angular frequency against the *primary* train's theory,
which fails for a sea that is behaving correctly. That was a scope error in the
measurement, not a defect in the water -- and it would have forced the sea to stay
narrowband, which is the thing that made it read as regular bands.

Narrowing the window does not weaken the gate, and that is checked rather than
assumed: with the primary amplitude zeroed it still fails (30.6 % speed error),
while at full long-swell strength all three states pass at 1.94 / 3.83 / 4.51 %
against theory with 0 backward steps in 299.

### What the Stage-1 gate actually caught

It was added late, after a critique that the work risked optimising toward
*looking like the reference* rather than *behaving like water*. It immediately
justified itself. With every downstream layer stripped, the bare ocean was
**denim**: uniformly spaced parallel bands running edge to edge, with no wave
groups — which is precisely the failure mode the brief forbids, and it had been
invisible under foam and the depth ramp. Three real defects followed:

1. **No directional spread.** One direction per family produces infinitely long
   parallel crests. Real seas carry a directional spectrum, and interference
   between neighbouring directions is what makes crests *short*. Fixed by five
   primary components spanning ±spread degrees, with the lateral phase term
   rotating each wave vector while preserving `|k|` (and therefore its frequency).
2. **Wave "sets" were a global `sin(t)`** — the entire sea rose and fell together.
   A set is a *spatial* group that travels at group velocity. Modelling the
   envelope as a slow modulation of the same phase field, `S*mg - (omega*mg/2)t`,
   makes it travel at `c/2` automatically.
3. **Surface height was normalised by the sum of amplitudes.** Adding components
   then shrank the tonal range — going from 3 to 10 components visibly flattened
   the sea without changing the water. Fixed by normalising by the spectral RMS.

The gate also caught a *narrowing* attempt that made things worse: pulling the
harmonics closer together (m = 1.47) created a strong beat whose envelope
displaced the crest by up to 232 % of a wavelength. A sweep across six harmonic
configurations, scored by the tracker, selected **m = (1, 1.78, 3.05),
a = (1, 0.30, 0.12)** — satellites far apart in `k` (short beat) and weak.

## Physics-level defects found and fixed during the loop

Every one of these was a formulation error, not a look tweak:

| # | Defect | Why it was wrong |
|---|--------|------------------|
| 1 | Foam injected as `max(fresh, per_step_increment)` | an increment cannot accumulate; foam was capped at 0.2 forever, so shore interaction scored 0/5 |
| 2 | Material coordinates updated as `M = M + (px - back)` | a material coordinate is *carried*, `M(x,t+dt) = M(x-u dt, t)`; the extra offset decorrelated neighbours into per-pixel noise |
| 3 | Specular evaluated on the raw height gradient | it read every chop wavelet and turned the sea into hard stipple; isolated by ablation, fixed with a 7-tap smoothed normal |
| 4 | `steepMax` used the **uncapped** per-component `a·k` | short chop dominated it, saturating the whitecap test so the whole sea went white |
| 5 | `Hloc = 2·Σ\|aᵢ\|` | overstates wave height ~25 % versus `Hs = 4σ`; pushed breaking into genuinely deep water during big sets |
| 6 | No steepness ceiling | components reached `a·k ≈ 0.9`, physically impossible (waves break well before 0.44) |
| 7 | Whitecap thresholds set above the achievable slope | whitecaps could never fire at all in open water |
| 8 | Dither applied to the whole frame | it perturbed land pixels by ±1 LSB, breaking pixel stability; now gated on water/spray coverage |
| 9 | x264's default 250-frame GOP | the second keyframe reconstructed the static land a fraction of an LSB differently and that offset persisted; fixed with one IDR per loop |
| 10 | x264 psy-rd left on | it trades fidelity for perceived "energy", and next to high-motion whitewater that pushed static land pixels to 10 LSB against a 5 LSB codec noise floor; disabled, with CRF tightened to 11 |

Two of these were defects in the **measurement**, not the render, and are worth
listing separately because both initially produced false alarms:

* Phase correlation reported **0 px** of crest travel on a field that visibly
  travelled — spectral whitening let noise dominate. Replaced with direct NCC on
  band-passed residuals.
* The validator **zoomed** the 1075×1463 mask onto the 1074×1462 video, shifting
  the coastline by up to a pixel and dragging real water into the "protected land"
  set. That fabricated a land-stability failure. Masks are now cropped, not zoomed.

## The pre-break lifecycle

A shoaling wave is not a sine surface that suddenly acquires foam. It has four
stages, and the renderer draws them in order:

1. **hollow** — the trough ahead of the wave drops and darkens
2. **rising face** — the shoreward flank stands up and *thins*, so light comes
   through it and it goes translucent teal rather than being lit from above
3. **lip** — a constant-width bright contour that narrows as the wave stands up,
   with a dark stroke one contour level down the same face, which is
   geometrically the hollow directly under an overhanging lip
4. **collapse** — whitewater, painted last, so it covers the lip exactly where
   foam actually exists

The clock is a **break phase** exported from the wave pass. It has to be built
from smooth inputs: derived from the local `Hloc`, it inherits the ray-focus
caustics in the shoaling map and the ±79 % swing of the group envelope, and the
narrow threshold binarises the result into a blotchy switch (measured p50 0.00 /
p95 1.00 straight across the 35–75 px band, exactly where it should have been
mid-ramp). Built from the deep-water swell height and the depth — both smooth,
with the set envelope retained so the surf band still breathes in and out with
the sets instead of tracing a constant-width outline around the coast — it ramps
properly: p50 0.00 at 60–90 px, 0.07 at 40–60, 0.69 at 25–40, 1.00 at 14–25.

Broad tonal structure (troughs, the rising face, the lip) reads a **swell-only
height** normalised by the swell's own RMS, not the full band. Keying it on the
full band makes the shading follow the chop, and that is mottling rather than
volume.

Whitewater is additionally gated on the break phase, so a wave cannot foam before
it has stood up.

## Where foam is allowed to be

Foam coverage is thresholded with a **depth-dependent** threshold and rendered
with **graded** rather than binary solidity. Both matter, and the reason is that
the white slabs this project chased for two rounds were a rendering decision, not
a simulation one: measured offshore, `breaking` p95 is 0.032 and `whitecap` p95
is 0.000, while the persistent field sits at ~0.2 — thin drifting residue. A flat
threshold of 0.24 promoted all of it, and a hard solidify step then made every
surviving pixel paper-white.

Measured foam as a fraction of water, and by depth band:

| clip | all water | 45–65 px | 65–90 px |
|------|-----------|----------|----------|
| Calm swell | 2.1 % | 0.00 % | 0.00 % |
| Windy rolling surf | 6.0 % | 0.00 % | 0.00 % |
| Heavy crashing surf | 8.3 % | 0.05 % | 0.00 % |

## Seamless looping

The wave field is made exactly periodic by quantising every component's angular
frequency to an integer multiple of `2π/T_loop`. Every time-scrolled noise lookup
is quantised the same way (`loopScroll`), so the tileable texture wraps a whole
number of tiles per loop. Foam and spray decay exponentially, so after a warm-up
of 9–12 s they are functions only of the last few seconds of an exactly periodic
field — and therefore periodic too. Measured first-to-last discontinuity, relative
to a typical adjacent-frame difference: **calm 1.27, windy 1.10, heavy 1.05**
(1.0 would be a perfect seam).

## Bathymetry scale

Open sea depth is **105 px** with a **230 px** shelf e-folding length. The first
version used 58 px / 112 px, which was a real error: 58 px is barely twice the
heavy state's significant wave height, so `H/d` exceeded the breaking index
hundreds of pixels offshore and waves "broke" in open water, accumulating into
white slabs. Deep water must be deep *relative to its waves* -- linear theory
calls water deep at `d > lambda/2`, and the heavy swell is 170 px long.

Breaking is additionally gated at `d_break = H/gamma`, which scales with wave
height. A fixed depth gate was tried first and collapsed the energy separation
between the windy and heavy states to 11.0 % vs 10.8 % foam -- the same sea.

## Physical scale

The painting's ocean is not to architectural scale — its wave texture is much
smaller relative to the buildings than real water would be. Rather than force
physical units, the solver works in picture units with `G = 130 px/s²` chosen for
readable crest speed. Everything downstream (dispersion, shoaling, group velocity,
breaking index) is internally consistent in those units.
