# Iteration log

Every pass rendered, produced a contact sheet and/or reference-matched crops, was
inspected, scored, and had its failure modes written down before the renderer was
changed. Diagnostics for each pass are in `diagnostics/`.

Windy rolling surf was used as the tuning subject because it sits between the
other two states; calm and heavy were then brought to their own targets and all
three were re-reviewed after every change to shared code.

## Scores 0–5

| pass | crest travel | temporal coherence | shore interaction | foam persistence | land stability | concept style | no fabric |
|------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 1 baseline | 2 | 4 | **0** | **0** | 5 | 1 | 4 |
| 3 foam sheets, darker palette | 3 | 4 | 3 | 3 | 5 | 2 | 5 |
| 6 smoothed specular normal | 4 | 5 | 3 | 3 | 5 | 3 | 5 |
| 9 foam balance | 4 | 5 | 4 | 4 | 5 | 4 | 5 |
| S1 Stage-1 gate added | 4 | 5 | 4 | 4 | 5 | 4 | 5 |
| S3 spread + groups + RMS | **5** | **5** | **5** | **5** | **5** | **4** | **5** |

## Pass 1 — baseline

Everything switched on at once. Scored 0/5 on both shore interaction and foam
persistence, and the numbers said why: foam coverage was 0.1 % of water and
`fresh` was pinned at 0.20 no matter how long the sim ran.

Failure modes recorded:

1. Foam injection used `max(fresh, per_step_increment)`. An increment cannot
   accumulate. **This was the dominant failure** and it also disguised the state
   of everything downstream.
2. Fine ripple was polluting the macro height gradient, so a sharp specular lobe
   produced per-pixel glint — the "engraved" look.
3. No turquoise anywhere; the depth ramp treated almost the whole band as deep.
4. Water flat and light: `hn` was being renormalised in the composite by
   `h/(|h|+3)`, which saturates and destroys tonal range.

## Pass 2–3 — foam accumulates, steepness capped

Saturating accumulation (`fresh += (1-fresh)·(1-exp(-inj·dt))`) took foam from
0.1 % to 17.2 % coverage. A per-component ceiling of `a·k ≤ 0.26` was added after
finding components reaching 0.9. Foam was restructured from "sheet × ridge"
(which produced dust) to "sheet, eroded by an advected lace field" (which produces
connected filigree, matching the C6/C4 reference language).

## Pass 4 — the measurement was wrong, not the render

The motion metric reported **0 px** of crest travel on a field that visibly
travelled. Phase correlation whitens the spectrum, and noise dominated. Replaced
with direct normalised cross-correlation on band-passed residuals, which then
reported a consistent 21.6 ± 2.0 px/s at bearing 48° with NCC 0.96 — matching the
visual strip. Recorded here because the first instinct was to go looking for a
renderer bug that did not exist.

## Pass 5 — material coordinates

Foam was grainy at 1:1 even though the foam *field* was smooth — proved by dumping
the internal buffers side by side with the composite. The advection was
`M = M(back) + (px - back)`. A material coordinate is *carried*, not offset:
`M(x, t+dt) = M(x - u·dt, t)`. The extra term accumulated a per-step drift that
decorrelated neighbouring pixels, so the lace lookup became per-pixel noise.

## Pass 6 — ablation, not guesswork

Grain persisted. Rather than guess again, eight variants were rendered with
individual shading terms disabled (`diagnostics/ablation.png`). The `spec=0
glitter=0` tile was dramatically clean: **the specular lobe alone was responsible
for nearly all the stipple**, because it read the raw gradient including chop.
Fixed with a 7-tap smoothed normal used only for the specular and sheen, keeping
the sharp gradient for a low-weight detail term.

## Pass 7–9 — shore, lace, balance

Flow-aligned anisotropic lace sampling (compressed along the current, stretched
across it) so foam streaks the way C4's backwash does. The shallow teal band was
broken up by noise and wave state after the uniform-width version read as an
*outline drawn around the land* — one of the named failure modes. Whitecapping was
found to be impossible: its threshold sat above the achievable slope, so it had
never fired at all.

## Stage 1 — the gate that changed the model

Added after a critique that the work risked optimising toward *looking like the
reference* instead of *behaving like water*, and that everything was being solved
at once. The gate strips the coast, foam, spray, shallow colour and the plate, and
judges the bare ocean alone.

It paid for itself immediately. **The bare ocean was denim** — uniformly spaced
parallel bands running edge to edge with no wave groups, exactly the forbidden
look, completely hidden under foam in the composite. See
`diagnostics/stage1_*.png`.

Three model-level defects followed, all fixed:

1. **No directional spread** → five primary components spanning ±spread degrees,
   with a lateral phase term that rotates each wave vector while preserving `|k|`.
   This is what makes crests short instead of infinite.
2. **Wave sets were a global `sin(t)`** — the whole sea breathing together. Sets
   are spatial groups; modelling the envelope as a slow modulation of the same
   phase field makes it travel at group velocity `c/2` automatically.
3. **Height normalised by the sum of amplitudes**, so adding components flattened
   the sea. Changed to spectral RMS.

A harmonic sweep scored by the crest tracker rejected an intuitive "narrower is
better" change: pulling harmonics to m = 1.47 created a beat that displaced the
crest by 232 % of a wavelength. The selected configuration
**m = (1, 1.78, 3.05), a = (1, 0.30, 0.12)** gave 0 backward steps in 239.

The gate itself needed two fixes before it could be trusted: a 1-D profile tracker
broke as soon as directional spread existed (a single line no longer shows a clean
crest sequence), and a 256 px FFT window quantised `k` so badly at λ ≈ 150 px that
it reported a 21 % speed error on a correct field. Now: 2-D feature tracking with
sub-pixel refinement, plus a 512 px window with sub-bin centroid refinement.

## Final state

All three clips pass every objective check in `src/validate.py`, and their
measured foam fraction and water luma land on the corresponding references:
calm 3.7 % / 0.246 (C8 is 3.7 % / 0.253), windy 14.1 % / 0.396 (the source plate
is 14.3 % / 0.379), heavy 24.1 % / 0.428 (C7 is 23.9 % / 0.431).

**Known remaining weakness.** Heavy's offshore whitecap foam can accumulate into
fairly solid masses rather than streaky whitewater. Reference C7 does show large
accumulated foam at peak storm, so it is defensible, but the shapes are the least
convincing part of the three clips. Ageing foam faster (shorter `tauFresh`) and
deepening the lace erosion improved it; more would need a proper foam advection
with divergence, not just a decay field.

## Round L — "it looks like clouds, and the stylized line art detail is lost"

Direct feedback after the first delivery. Two distinct problems, and chasing them
turned up the deepest bug in the project.

### The line-art half

Foam was being rendered as an **area coverage field**, thresholded into filled
regions. The reference art draws foam as **thin curvilinear strokes**. Filled
soft-edged regions are, definitionally, clouds.

Added a `contourLine()` primitive: a constant-width stroke through a scalar
field, width normalised by the screen-space gradient (`dFdx`/`dFdy`) so the line
is a fixed number of pixels wide wherever it runs rather than fat where the field
is flat. Two users of it:

* **crest strokes** — one bold line per wave on the shoreward face, riding the
  phase field, gated on `breaking + whitecap` so lines appear where waves are
  actually doing something. A line on every crest everywhere is hatching.
* **lace strokes** — two contour levels of the advected foam material field, so
  the tangled shore net is drawn and stretches with the current.

Also added a **wave-body cast shadow**: sampling the height a few pixels toward
the sun and darkening where it stands higher. Without it the render read as foam
*on* water rather than waves *with* foam on them.

### A dead end worth recording

Style statistics said foam blobs were ~2x the reference median area with ~25%
less perimeter per unit area. Optimising `perimeter/sqrt(area)` made the render
**much worse** — hard dotty speckle everywhere, the "cellular-noise dots" failure
this project set out to avoid. That metric rewards stippling. It is not a usable
optimisation target, and the finding is left as a comment in `composite.frag` so
it is not re-attempted.

The follow-up attempt was also instructive: reference foam blobs measure ~20:1
elongated (complexity 8.3–9.6 against 3.54 for a disc), so they are thin sinuous
*filaments*, not patches. Eroding a sheet with a smooth field makes round holes
and round blobs — which is why finer perforation *lowered* edge complexity.

### The cloud half — and the real bug

A dozen shading-level changes moved the mottling almost not at all. Isolating by
ablation and then dumping the internal fields showed why: in a crop where foam
coverage was ~0 and breaking was ~0, `|grad S|` — the wave field's own gradient —
was already chaotic noise at 5–15 px.

Measured directly on the solved phase field:

```
|grad S| p50   0.0700 /px      (should equal k)
k        p50   0.0574 /px
S roughness    0.0303 rad rms  (S minus its own 3-px blur)
-> noise / signal in the gradient: 0.53x
```

**Half of the surface gradient was numerical roughness from the Godunov eikonal
sweeps.** Every normal-based term — diffuse, specular, sheen — reads that
gradient, so every one of them was shading mid-frequency solver noise. That is
precisely "soft cloudy mottling with no coherent structure", and no shading
change could ever have removed it because the noise was upstream of all of them.

Two fixes:

1. **Wavelength-scaled smoothing of the phase.** The key insight is that `S` is a
   monotone phase *ramp* — the wave lives in `cos(S)`, not in variation of `S` —
   and a symmetric kernel returns a ramp unchanged. So the smoothing can be far
   stronger than intuition suggests, removing solver fluctuation without touching
   the wave. Sigma tapers with local wavelength so shallow refraction detail
   survives. Roughness 0.0303 -> 0.0180 rad (0.53x -> 0.31x).
2. **Supersampled solve.** First-order Godunov on a 5-point stencil carries O(h)
   error, worst for diagonal propagation — and this swell runs at 62 degrees.
   Solving at 2x resolution and averaging down halves the discretisation error
   and averages four samples of what remains, while retaining all the physics.

### Round R — the white "ice floes"

Large solid white shapes floating in open water, most visible in the heavy state.
Four hypotheses were tried and all were wrong before the field dump settled it:

1. offshore whitecap foam accumulating — gated by depth, no change
2. spray — `sprayGain=0` left them untouched
3. backwash transporting shore foam out to sea — confined to the swash zone, no change
4. the crest/lace strokes — turning them off left the shapes intact

Dumping `breaking`, `cover`, `fresh`, `spray` and `depth` together in the region
answered it in one look: **`breaking` was firing at full strength in water 30-88 px
deep.** Two separate causes, both real:

* **False shoals.** 28 blobs (844 px) of dark vignetted water and painted foam had
  been misclassified as land. A false land blob zeroes the shoreline SDF, so the
  bathymetry goes shallow, so waves "break" and generate foam and spray in the
  middle of the sea. Colour separates them cleanly — every genuine rock in this
  plate has *negative* blueness, the misreads had positive blueness and cyanness —
  with a second rule for bright painted foam far offshore.
* **The scene's ocean was not deep relative to its waves.** Open sea depth was
  58 px against a heavy-state `Hs` of ~30 px, so `H/d` exceeded the breaking index
  hundreds of pixels offshore. Deepened to 105 px (with the shelf lengthened to
  230 px so the surf zone keeps its width), and the heavy state's amplitude
  reduced — heavy now reads as heavy through foam density and impact at the
  shore rather than through raw wave height, which is also what the references do.

Breaking is now additionally depth-limited by `d_break = H/gamma`, scaled with
wave height rather than a fixed depth. A fixed limit was tried first and collapsed
the energy separation: heavy and windy landed at 10.8% and 11.0% foam, effectively
the same sea state.

## Round C — the Codex clip as an art-direction reference

A second agent's `heavy_crashing_surf` was supplied as a **visual reference
only**: no frames were sampled, morphed, composited or flow-matched from it, and
the wave field, timing, families, spread, groups, jitter and land locking are all
unchanged. What was borrowed is four measurable behaviours.

Measured first, in the same offshore window in both clips
(`diagnostics/codexref/`):

| | Codex ref | ours, before |
|---|---|---|
| foam fraction | 0.8 % | 16–20 % |
| luma p50 | 0.191 | 0.268–0.304 |
| luma p75 | 0.279 | 0.534–0.615 |
| saturation | 0.686 | 0.472–0.500 |
| blue − red | 0.189 | 0.108–0.113 |

Our *darks* were already darker than the reference (p05 0.09 vs 0.145). The
problem was never the black point: it was that half the sea sat above 0.27 and a
quarter above 0.53, and that the water was grey rather than blue.

### The white slabs were a rendering decision, not a simulation one

Dumping the internal fields in the region where the slabs float settled it in one
look. In water deeper than 45 px the simulation is nearly clean — `breaking` p95
0.032, `whitecap` p95 0.000, persistent foam p95 0.198 — yet the composite was
painting hard-edged opaque white there. The coverage threshold was a flat 0.24
and every pixel that crossed it was then pushed through a solidify step. A soft
0.2-coverage residue was being promoted to foam and then made paper-white.

Two changes: the threshold now scales with depth (offshore it is multiplied by
`foamDeepThr`, so drifting residue never crosses), and solidity is graded rather
than binary — whitewater still being fed in the surf zone is opaque, ageing
residue is a veil. Foam over all water: heavy 20.5 % → 8.3 %, windy 13.2 % →
6.0 %, calm 3.7 % → 2.1 %, and below 45 px depth it is now 0.05 % or less.

### Pre-break wave volume

The brief for this round was explicit: *a dark trough, a rising teal face, a
sharpening lip, then actual collapse into whitewater.* None of that existed —
foam was being painted straight onto a sine surface, which is why the result read
as foam ON water rather than waves WITH foam on them.

The wave pass now exports two extra channels: a **swell-only height** normalised
by the swell's own RMS, and a **break phase**. Broad tonal structure is driven by
the swell height rather than the full band, because keying it on the full band
makes the shading follow the chop — that is mottling, not volume. The four stages
are drawn in order, with the foam block painting last so the collapse covers the
lip exactly where whitewater actually exists.

Whitewater also starts later (`ready` moved from 0.62·γ to 0.98·γ) and is gated
on the break phase, so a wave cannot foam before it has stood up.

### Three measurement-led corrections inside this round

1. **The break phase started far too early.** Open-sea `gamma = H/d` here runs
   0.24–0.42 against `uBreakGamma` 0.66, and the first ramp opened at 0.26·γ — so
   the *entire sea* sat at phase ≈ 0.5 and the lip stroke and translucent face
   were being drawn on every offshore crest. Water-only high-frequency roughness
   went 0.018 → 0.067 rms because of it.
2. **Then it was too noisy.** Rebuilt from the local `Hloc`, the phase inherited
   the ray-focus caustics in the shoaling map *and* the ±79 % swing of the group
   envelope, and the ramp binarised: p50 0.00 / p95 1.00 straight across the
   35–75 px band, exactly where it should have been mid-ramp. It is now built
   from the deep-water swell height and the depth, both smooth, with the set
   envelope left in so the band still breathes in and out instead of being a
   constant-width outline traced around the coast. Measured after: p50 0.00 at
   60–90 px, 0.07 at 40–60, 0.69 at 25–40, 1.00 at 14–25.
3. **The offshore grey wash was the specular and the sheen**, not foam. Ablation:
   deep-water luma p95 falls 0.329 → 0.172 with both disabled, while removing
   foam entirely changes it by nothing. But the water then sits *below* the
   reference's own dark-water luminance, so the lift was moved into the palette —
   which is blue and even — instead of a warm achromatic highlight that streaks
   along every crest. Specular gain roughly halved, `shininess` 24 → 13.

### A metric that had to be discarded

High-frequency roughness measured as `L − blur(L, 3px)` looked alarming on the
swell height (0.092 rms, barely below the full band's 0.100). It is not noise:
shoaled swell here runs down to ~90 px wavelength, and a 90 px sinusoid *has* a
gradient at 3 px scale. The metric is only meaningful on fields that are supposed
to be flat at that scale. It was giving a false alarm on a correct field, which
is the third time in this project a measurement rather than the render was the
thing that was wrong.

### Palette

The reference's own dark water measures RGB (16, 49, 73) — a saturated mid-navy,
not near-black. Ours measured (16, 39, 52): right luminance, wrong hue. All three
palettes were rebuilt around that, and the foam whites were pulled off pure white.

### Two things that had to be re-checked after the round

**Crest propagation is bit-for-bit unchanged.** The delivered-file tracker
reported slower crest travel (calm 12.4 → 10.8, windy 22.3 → 19.8, heavy 22.4 →
18.6 px/s) which looked like a regression. It is not: the Stage-1 gate, which
measures crest phase transport spectrally on the bare wave field with no shading
at all, returns exactly the same numbers as before — 53.52 / 45.71 / 56.75 px/s
against theory, 0 backward steps in 299. Nothing in the wave pass moved; the
tracker follows band-passed luminance features, and with the foam largely gone it
now locks onto the water itself, which carries more of the group signature.

**Energy separation had to be restored.** The first pass of this round landed
windy at 7.3 % foam and heavy at 8.0 % — effectively the same sea state, the same
failure the fixed breaking-depth limit caused earlier. The cause was my own
tuning rather than the model: heavy had been given both a higher coverage
threshold (0.30 vs 0.23) *and* a stronger offshore multiplier (3.2 vs 2.6) than
windy, so the state with more breaking energy was being suppressed harder. After
correcting it the three states run 2.8 / 5.9 / 9.0 % — a separation ratio of
1.53, matching the 1.55 of the previous delivery at roughly half the absolute
foam.

## Round P — foam shape

The remaining complaint after Round C was that the whitewater read as soft
cotton-wool masses rather than painted surf. Measured against the library with
**second-moment elongation and blob area** — deliberately not `perimeter/sqrt(area)`,
which is maximised by stipple and already shredded this render once:

| | median blob area | median elongation | coverage |
|---|---|---|---|
| library C2 / C3 / C7 | 61 / 68 / 71 px² | 2.41 / 2.57 / 2.60 | 0.081 / 0.092 / 0.121 |
| ours, before | 188 px² | 2.10 | 0.103 |

Five variants of the erosion, the lace anisotropy and the foam diffusion moved
*nothing* — blob area 188.5 → 188.0 for a 3× change in diffusion. That ruled out
the whole shading half of the pipeline and pointed at the coverage field itself.

The mechanism: `injBreak` was large enough that `fresh` pinned at 1.0 across the
whole swash band within a fifth of a second. Saturated foam is never "old", so
`old01` collapsed to 0, so the lace erosion barely touched it — the surf zone came
out as one solid ribbon by construction. The fix is two-sided: erode fresh foam
properly (`foamBaseErode` 0.18 → 0.62, since real whitewater is aerated from the
moment it forms) and then raise injection to put the coverage back. Blob area
landed at 76–123 px² with coverage 0.122, matching C7.

One further cause of the ribbon: the run-up wash forced `breaking` to a uniform
0.85 along the *entire* coastline. The main breaking term already carries a
large-scale patch field for exactly this reason; the swash now gets the same
treatment, floored so it never disappears outright.

Final foam as a fraction of water: **calm 3.4 %, windy 6.1 %, heavy 11.0 %** —
calm matching library C5 (3.4 %) exactly, and a 1 : 2.4 : 4.4 separation across
the three states.

## Round Q — "a mass of liquid, not paint"

Feedback with two photographs of real coastal water attached. What the photos have
that the render did not: the whole surface is laced with fine light streaks well
outside any surf zone, the blue runs a much wider range from near-black troughs to
bright cerulean faces, and the whitewater is aerated — you can see water *through*
it — rather than being a flat white fill.

Three additions, all preset-controlled:

1. **Surface streak lines.** Constant-width contour strokes on a strongly
   flow-aligned noise, drifting with the swell, gated on the rising shoreward face
   and broken into large patches. Drawn as *lines*, never as a wash.
2. **A wider face lift.** The colour step toward mid/shallow on a rising swell was
   at 0.21 effective gain; it is now a preset (`faceLift`, 0.30–0.38), which opens
   the blue-to-cyan range without touching the trough end.
3. **Foam aeration.** Alpha is modulated by the same field that carves the foam
   outline, and the boundary is left genuinely translucent instead of cut. This is
   what stops whitewater reading as a paint fill.

### The bug this round

The first attempt washed the entire sea pale — the exact grey haze removed two
rounds earlier. Cause: the streak alpha was multiplied by `amp`, which is the
**sum of component amplitudes** (of order 12 for the heavy state) and not a 0–1
weight. That scaled a set of thin lines by an order of magnitude. Removing it, and
dropping from two mid-level contours to one high-level contour with a patch mask,
brought the streaks back to being drawing rather than fog.

Aeration also lowers measured foam whiteness, because a translucent mass over dark
water no longer passes a luminance test for "foam". Rather than remove it, the
injection rate was raised to compensate — the goal is a translucent mass of
liquid, not a smaller flat one. The higher base erosion from Round P meant that
even at `injBreak` 55 the coverage field no longer collapsed back into slabs
(blob area stayed 81–200 px² throughout the sweep), so there was headroom to do it.

## Round R — the concept boards, and a closeup that could fail on its own terms

Three things came from the reference boards and the accompanying notes.

### Fine chop is not foam

The boards carry dense fine white chop right across the open sea. That had been
removed along with the offshore whitewater, which was wrong: the two are different
things and must not be built the same way. Offshore *mass* is foam and has to go;
offshore *marks* are chop crests and belong. They are drawn stateless -- they exist
only where the full-band surface is locally at a crest and die with it -- so
nothing can accumulate into slabs, which is the failure that made persistent foam
unusable out there.

They are gated to the upper half of the swell, because the boards are explicit
that troughs stay dark and glassy; ungated they cover the sea evenly and flatten
exactly the tonal structure the troughs exist to provide.

### The gate that had never been gating

"Uniform white crest density" traced to a one-line bug. The spatial irregularity
applied to `breaking` was `sstep(0.18, 0.62, patch * 0.75 + 0.45)`; the argument
ranges 0.45–1.20 against a ramp that saturates at 0.62, so the gate sat at 1.0
across 80 % of the patch field and never fell below 0.67. It had been doing
essentially nothing since it was written. Replaced with a ramp over the field's
actual range, plus a second much larger-scale field that takes whole stretches of
coast quiet, and the same treatment for the run-up wash -- which had been a flat
0.85 along the entire coastline, and was the reason coastal foam read as one
continuous ribbon.

Offshore whitewater fell from 13.0 % to 4.8 % of water for the heavy state, a 63 %
reduction, with the requested target being 50–70 %.

### The closeup study

`src/closeup.py` runs the whole pipeline against a cropped, resampled workspace at
2.4x. A zoom is treated as a change of units, not a different sea: the plate region
and *every* reference are cropped identically (the calm-reference agreement is what
removes false shoals, and it only survives if they stay registered), `OCEAN_G`,
`OCEAN_DEPTH` and `OCEAN_SHELF` scale with the zoom, and every preset key carrying
a length or a speed scales with it via `presets.PX_SCALED`. Periods are left alone:
with omega fixed and k -> k/z the dispersion relation gives g -> g*z, so wavelength
and phase speed both scale by z, which is exactly a magnification.

It justified itself on the first render. At 2.4x the new chop crests were plainly a
field of **dots** -- the cellular-noise failure this project set out to avoid --
because they were a threshold of a height field, and thresholding fills every local
maximum. At 1:1 that had been invisible. Rebuilt as constant-width contours, the
same way every other mark in this renderer is drawn.

That is the argument for the closeup existing at all: it is a view where a defect
in the fine detail can fail on its own terms rather than being averaged away.

## Round S — measured against the source plate

The comparison target moved to the **source plate itself**, which is the art the
animation has to sit inside. `src/plate_match.py` scores a render against it over
the water mask.

| | source plate | ours, before |
|---|---|---|
| foam luma p50 / p95 | 0.851 / 0.979 | 0.756 / 0.811 |
| water L p75 / p99 | 0.436 / 0.960 | 0.293 / 0.787 |
| saturation (water) | 0.646 | 0.769 |
| foam % of water | 9.5 | 4.7 |

The useful surprise: ours was **more** saturated than the plate. "Vibrance" was
never saturation — the plate's foam is genuinely near-white and opaque, and ours
was a grey veil that never got bright, which flattens the whole image however
saturated the water underneath is. The aeration from Round Q had been multiplying
foam alpha everywhere. It now varies the foam instead of dimming it: the dense
core stays opaque, and aeration acts at the boundary and where the carve field has
eaten in, where thin foam also takes on the water colour rather than just going
dim.

### Why it read as "an animated painting"

Two causes, both structural rather than cosmetic.

**The marks were sliding, not being carried.** Streaks and lace were sampled on a
screen-space scroll, so they translated across the water as a rigid layer. They
are now sampled on the foam material coordinate, so they stretch where the flow
accelerates and shear where it turns. The material memory was also raised from
1.5 s to 4.5 s: at 1.5 s the coordinate is continually reset toward screen space,
which locks the pattern partly to the frame.

**There was no relief at wavelet scale.** The plate's water is corrugated at
roughly 8–30 px with a lit and a shadowed side on every wavelet, and that is what
makes it read as a surface rather than a painted band. Modulating the existing
spectrum's shading did nothing measurable — a sweep of that term from 0 to 0.95
moved every statistic by less than 0.01 — because the field has almost no energy
at that scale.

It is supplied as a **shading-only relief layer**: two flow-aligned octaves
sampled on the material coordinate, contributing a normal for diffuse and a tight
gloss lobe, and never entering the height field. That constraint is what makes it
safe — significant height, breaking, whitecapping, the loop and the crest tracker
are all untouched by construction.

### Gloss, sky and shadow

- **Gloss** got its own exponent rather than sharing the diffuse one. A broad lobe
  spread over every swell face is the grey wash that had to be removed two rounds
  earlier; a highlight is the opposite, a tight lobe concentrating into small
  bright glints on the facets. Same energy, opposite read.
- **Colour variance** comes mostly from sky reflection, not from the body colour:
  a Fresnel term on the swell normal, small on flat water and rising sharply on
  tilted crest faces, which is where the references go pale and cool while the
  hollows stay deep.
- **Shadow** deepened, and its target darkened below the abyss colour.

### A metric that had to be refused

The fine relief layer tripled the adjacent-frame delta, so its temporal
coherence was measured directly: one-frame correlation of the high-passed water.
Sampled on the foam material coordinate it read 0.749 against a 0.896 baseline --
genuine boiling, because that coordinate is hard-reset wherever whitewater forms
(0.78 per substep at the heavy state's injection rate). Right for foam, which has
no history to carry; wrong for a continuous shading layer.

Moving it to a loop-exact scroll recovered 0.808, and then the metric started
lying. Every further "improvement" it rewarded -- slower scroll, stiller axes --
was a step toward a texture that does not move at all, which is the worst possible
result artistically and would score 0.90. The metric measures how much the texture
moves, not whether it boils.

Settled by looking instead: four consecutive frames at 1:1 show the relief
translating coherently as a unit with the foam evolving smoothly over it. The
correlation figure is kept as a guard against a regression into boiling, not as a
target. This is the fourth time in this project that a measurement rather than the
render was the thing that was wrong.

## Round T — why the numbers kept saying "close"

Direct question, and a fair one: the render kept scoring close to the source plate
while looking obviously different. The answer is that every metric in use was
**first order** -- luma percentiles, mean saturation, foam fraction, blob area.
Two images with identical histograms can look nothing alike, and these did.

Two new metrics, neither of which a histogram can fake:

`src/foam_structure.py` -- mean white run-length along and across the wave
direction, and the fraction of the surf zone left open. `src/struct_sweep.py`
adds patch-to-patch **hue** variety and an isolated-speck share.

They answered immediately, and both answers were surprising:

| | source plate | ours, before |
|---|---|---|
| foam run length | 6.9 px | 16.2 px |
| foam run ratio along/across | 0.97 | 1.01 |
| surf zone left open | 74.4 % | 64.8 % |
| hue variety (blue-red patch SD) | 0.060 | 0.028 |
| isolated-speck share | 40.8 % | 60.3 % |
| mean high-frequency feature | 4.3 px | 2.4 px |

The run *ratio* matched all along, so the long-assumed "20:1 filaments" reading was
wrong -- the plate's foam is isotropic. The difference was **scale**: our features
were 2.3x too coarse. Meanwhile luminance and saturation variety already matched
the plate and **hue** variety was half of it: every patch of our sea was the same
blue, which is what makes a sea read as one flat treatment applied everywhere.

### Foam erosion had never been able to bite

At surf-zone coverage (~0.85) the subtractive erosion needed `carve > 1.31` to
bring foam under threshold, and `carve` is capped at 1. So `foamA` was pinned at
1.0 across the entire surf zone regardless of what the erosion field did, and
making the erosion field finer changed nothing at all. Multiplicative erosion bites
at every coverage; run length went 16.2 px to 7.2 px against the plate's 6.9, and
the open fraction 64.8 % to 78.6 % against 74.4 %.

### The static, and the check that caught it

Pushing the erosion far enough to break the sheet made all three clips **fail**
foam persistence -- 0.5 s correlation 0.30 against a 0.35 floor. The cause was a
fixed-ratio octave ladder in the erosion field: at `laceScale` 14 its fourth octave
lands at **1.2 px**, which is pixel noise. Thresholding foam against pixel noise
produces isolated single-pixel specks that flip frame to frame -- static, and
exactly what reads wrong beside painted land. The ladder is now floored so no
octave can go below 4 px.

A second speck source was a `pow(., 90)` gloss lobe on a noise-derived normal,
which lands its highlights on single pixels; it carried a third of all isolated
high-frequency energy. Small facets need a broad lobe, not a sharp one.

### The real difference, in the end

Neither more detail nor less detail was the answer. The source plate is mostly
**smooth** -- large areas of near-flat blue with detail concentrated in relatively
few places -- while every layer here had been applied evenly across the whole sea.
The quiet areas are as much a part of the look as the busy ones. Relief, chop
crests and streaks now ride a shared large-scale calm field, so most of the water
is left alone.

## Round U — it was the spectrum, not the shading

After many rounds of foam and shading work the note was still "more like paint",
and "the waves lack weight and power -- more fabric displacement than a large body
of water". A spatial power spectrum of the open-water window settled it:

| wavelength band | source plate | ours |
|---|---|---|
| 200-600 px | **19.2 %** | **3.1 %** |
| 100-200 px | 27.7 % | **48.0 %** |
| 60-100 px | 11.0 % | 10.9 % |
| 35-60 px | 8.7 % | 6.3 % |
| 4-10 px | 16.4 % | 13.4 % |

The plate's spectrum is broad and fairly flat. Ours was **narrowband**, with half
its energy in a single 100-200 px band and essentially nothing above 200 px. A
narrowband sea is regular by construction: it makes repeating bands rather than a
population of separate wave forms, and it undulates evenly, which is exactly what
"fabric displacement" describes. No amount of foam or shading work can fix a
spectrum, and several rounds were spent trying.

**Long swell.** Added as a sub-harmonic of the primary train (m < 1), so it needs
no second phase solve: `S*m` stretches the same solved field and `w = w0*sqrt(m)`
keeps it on the dispersion relation, where a longer wave is correctly *faster*
(`c = c0/sqrt(m)`).

It has to be accumulated **before** the swell-height capture. A long wave has a
small gradient by construction -- the same amplitude spread over a longer
distance -- so it contributes almost nothing through the surface normal; it reads
as broad *tone*, and the broad tonal terms are driven by that captured height.
Added after it, it was worth 2 % of spectral energy; moved before it, 16 %.

**Bounded by the gate, not by taste.** At the amplitude that best matched the
plate's spectrum, the long swell became the *dominant* train and Stage-1 failed --
it measures the dominant spectral mode against the primary train's theory, so a
bimodal sea makes that measurement meaningless. The amplitude is set to the
largest value at which the primary stays dominant and the gate stays valid
(errors 2.34 / 3.34 / 1.75 % against theory, 0 backward steps in 299). Windy
needed a lower weight than the others: its primary train is shorter, so the same
sub-harmonic sits closer to it in wavenumber and competes for the peak.

A sweep loop also left `ampL` at a failing value while I was testing crest
sharpening, and I briefly concluded the sharpening was the cause. It was not.

## The body under the surface

Noted from the reference: *in real water you see the mass beneath the top layer
being drawn up into the wave.* A height field shades only the skin -- there is
nothing underneath it -- which is the other half of why it reads as displaced
fabric rather than as a volume.

Added as a sub-layer: darker and greener, strongest on the rising face where the
body is drawn up, and sampled on a coordinate that **lags** the surface. The
parallax between a fast skin and a slow body is what actually reads as depth; a
sub-layer moving in lockstep with the surface would just be another tint.

## Round V — the sky reflection had never been switched on

"None of these have that glossy water reflective look." Evaluating the term
rather than adjusting it:

```
|grad h|   Ns.z    (1-Ns.z)^3.2   x skyMix
   0.10   0.982      0.000002     0.000001
   0.20   0.935      0.000161     0.000048
   0.35   0.833      0.003275     0.000983
```

The sky-reflection term was producing **0.000048** on typical wave slopes. It had
been contributing nothing at all since it was added.

The cause is the Fresnel form. `pow(1 - Ns.z, p)` is written for a view that looks
across a surface, where `Ns.z` sweeps toward 0 at grazing angles. This is a
near-plan view: looking almost straight down, `Ns.z` sits around 0.94 even on a
well-tilted wave face, so `1 - Ns.z` is about 0.06 and any power of it vanishes.
Taking the power of `Ns.z` instead -- `1 - Ns.z^p` -- keeps the same shape, flat
water reflecting little and tilted faces reflecting a lot, across the range of
slopes this geometry actually produces: 0.19 to 0.89 rather than 0.000002 to 0.003.

Switched on at the strength that looked right by intuition it blew 7.7 % of the
water out to pure white. Set against the plate instead, the render now sits closer
to it than at any previous point:

| | source plate | ours |
|---|---|---|
| luma p05 / p50 | 0.130 / 0.283 | 0.137 / 0.287 |
| luma p99 | 0.960 | 0.947 |
| saturation | 0.646 | 0.660 |
| blue - red | 0.269 | 0.284 |
| clipped to white | 0.12 % | 0.02 % |

The painterly tone quantisation was also cut back (posterize 0.18 to 0.07, 22
bands): flat quantised regions were a deliberate device to stop the water reading
as photographic mottling, and with real structure in the surface they had started
working against it -- they are a large part of what "oil painty" describes.

## Round W — it is a 2.5D view, not a plan view

The single most consequential correction in the project, and it invalidates an
assumption baked in from the first round: the plate is an oblique 2.5D view, drawn
the way the land art is drawn, not a near-plan view looking straight down. Several
comments in the shader said "near-plan view" and one parameterisation was chosen
specifically on that basis.

Three things follow.

**The view vector was wrong.** `V = vec3(0, 0, 1)` is a plan-view camera. Every
specular and gloss term is evaluated against the half-vector `normalize(L + V)`, so
with the wrong `V` the highlights land on the facets a top-down camera would see
rather than the ones this camera does -- which is a direct cause of the surface
reading flat. `V` is now built from a view tilt (34 degrees from vertical).

Correcting it revealed something the plan-view assumption had been hiding: with the
right geometry the gloss stopped contributing to the mid-tone at all, and the
water's median luminance fell from 0.286 to 0.224. The gloss had been acting as a
broad wash carrying the mid-tone rather than as a highlight. Restoring the mid-tone
by raising the gloss just clipped 2-4 % of the water to white, and raising exposure
clipped 5-10 % -- because the foam is already near white and a global multiply
lifts it too. The mid-tone belongs in the water's own colour, so the palettes were
lifted about 20 % instead, which put saturation at 0.644 against the plate's 0.646.

**Waves have vertical extent on screen.** Seen obliquely, a crest stands above the
water plane and therefore rides up-screen from its plan position by its own height.
The drawn crest strokes now sample the surface at that lifted position, so the foam
line sits on the visible face of the wave instead of on its plan-view location.
Without it the line work has no perspective and reads as a pattern printed on a
flat sheet.

**The reference palette is a depth cue, not decoration.** In an oblique view the
colour zones are how the surface communicates its shape: dark trough, mid body,
teal rising face where light comes through thin water, white crest -- four zones
per wave. Every one of those terms existed but blended into a single tint; they are
now separated.

## Round W2 — wave origins

"Can we use random or fractal generation... set various origin spawn points for
waves." Right idea, and it does not need extra phase solves: the lateral term in
`addSpread` is already a wavevector rotation, so making its angle vary slowly
across the scene rotates the local wave vector, which is what a second origin would
do. The variation has to be slow compared with the wavelength for the
slowly-varying-direction approximation to hold, hence a 900 px scale.

Overdone it destroys the sea. At 16 degrees of wander with 52 degrees of spread the
field lost its crests entirely and became mottling -- worse than the regularity it
was meant to fix. Settled at 9 degrees of wander with 38 degrees of spread, which
breaks the parallel-crest look while keeping the wave direction readable.

## Round X — why the statistics kept saying "close"

Direct challenge: the render kept scoring close to the plate while looking nothing
like it. That is now measured rather than argued, and the challenge was right.

Against the plate, over the water mask: foam 11.6 % vs 11.3 %, luma 0.343 vs 0.353,
saturation 0.656 vs 0.655, blue-minus-red 0.261 vs 0.271. Within a few percent on
every global statistic. Edge sharpness at foam boundaries 1.656 vs 1.554 -- ours is
*sharper*. Clean, detail-free windows 9.3 % vs 10.0 %.

The reason all of that can hold while the images differ is that every one of those
is a **first-order statistic**: a distribution, a spectrum, a run length. None of
them measures whether the image contains recognisable wave *forms*.

`src/local_contrast.py` measures the thing that did separate them: how much tonal
range exists INSIDE a wave-sized (24 px) window.

| zone | source plate | ours |
|------|--------------|------|
| surf (0-90 px) | 0.152 | 0.139 |
| mid (90-260 px) | 0.093 | **0.055** |
| open sea (260 px+) | 0.060 | **0.036** |

The surf zone was within 8 %. The deficit was entirely offshore, at 40-45 %: the
whole tonal range was present *globally* but spread across the frame rather than
repeated *within each wave*. That is exactly the difference between reading as
objects and reading as texture, and it explains why more foam, sharper edges and a
broader spectrum never fixed it -- none of them put range inside a wave.

### Three structural ceilings found while trying to close it

1. **The diffuse term shades the gradient, and offshore waves are long.** At
   170-530 px, a 24 px window sees almost no gradient change. Widening the diffuse
   response to +-85 % moved open-water contrast by 0.0005.
2. **`MAX_STEEP` caps each component's gradient at 0.26.** Past that, more chop
   amplitude adds height but no shading, so the effect saturates: ampC from 0.56
   to 3.2 bought 0.036 -> 0.041.
3. **`hn` is normalised by the spectral RMS**, so adding chop energy raises the
   divisor and proportionally flattens everything else.

Together those put an architectural ceiling on how much small-scale tonal structure
this renderer can produce -- which is the honest answer to "what is preventing it",
and it is not a parameter value.

**Where that points.** The steepness cap and the RMS normalisation are both correct
for the *height field*: they are what keep the physics honest and the Stage-1 gate
passing. Neither is required of a *shading* layer. The fix is to decouple the two --
a small-wave shading term that is neither steepness-capped nor RMS-normalised, which
is what the fine-relief layer already is, currently gated by the calm field and set
low. Raising it is a much smaller change than it sounds, and it is the next thing
to try rather than another pass over foam.

## Round Y — the surface should be SMOOTH

Repeated feedback that it still read as paint, after every global statistic already
matched the plate. Two measurements, in sequence, found the reason -- and it was
the opposite of what the previous ten rounds had been doing.

**First**, `src/local_contrast.py`: how much tonal range exists inside a wave-sized
window. The plate had 0.093 in mid water and 0.060 offshore; the render had 0.055
and 0.036. Range existed globally but not *within* each wave, which is the
difference between reading as objects and reading as texture.

Closing that by adding small-wave shading worked numerically -- mid went 0.055 to
0.094 against the plate's 0.093 -- and the image looked *worse*.

**Second**, `src/blue_noise.py`: high-frequency energy in the water AWAY from foam,
which is the surface the eye actually reads as "water" or "paint".

| | blue-water hi-freq rms | p90 |
|---|---|---|
| source plate | 0.0420 | 0.0629 |
| ours | 0.0692 | 0.1085 |

**The plate's water surface is smoother than ours by two thirds.** Its structure
comes from a few strong features -- foam lines, wave silhouettes -- sitting on
clean water. Every round that added surface texture was moving away from it while
the statistics said otherwise.

Ablation put it on one layer: with the small-wave shading disabled the figure was
0.0411 against the plate's 0.0420, an exact match, and no other layer moved it by
more than 0.001. That layer had bought its local contrast as **noise**. Its octave
ladder ran down to 9 px, and a 9 px component is not a small wave. Widened to
96/69/50/36 px with a gentler slope, blue-water noise returns to 0.0413.

### What the two measurements together actually say

Local contrast and surface smoothness trade against each other in this renderer,
and the plate has both. That is only possible if its local contrast comes from
something other than surface texture -- which it does: **sharp foam features
distributed through smooth water**. The plate carries 9.9 % of its energy at
10-20 px and 16.4 % at 4-10 px against our 8.3 % and 11.5 %, and that difference is
foam detail, not surface relief.

So the remaining work is not more texture, and not more foam *mass* -- it is finer,
sparser, sharper foam *features* on water that is left smooth between them. Every
attempt to reach it through the surface has now been measured and ruled out.

## Round Z — the acceptance test, and the field the shading should have been reading

An agentic review put the render at 7-7.5/10, said the causal sequence now reads
(swell -> lip -> impact -> whitewater -> residue), and froze wave propagation,
set timing, spacing, land, palette, crest breakup and shoreline timing. Four
things to change: pre-break wave-face volume, crest lighting, foam ageing, and
small-scale surface variation.

It also supplied an acceptance test worth more than the rest of the review:

> If you temporarily removed all white foam, I should still be able to say,
> "that wave is about to break."

`src/nofoam_test.py` makes that runnable -- foam, spray, lace, crest strokes and
lip all disabled, leaving only the blue structure. Run against the render as it
stood, the answer was an unambiguous no: a near-uniform teal field with no
readable wave anywhere. The whitewater was carrying all the information.

### What the test forced out

Strengthening the pre-break terms did almost nothing, which meant they were not
the problem. Dumping their inputs showed why in one look: **`hnSwell`, the field
every one of those terms reads, is mottled noise** -- no coherent wave structure
at all. It is the sum of directionally-spread components, i.e. an *interference
pattern*, and an interference pattern has no shape to draw. Every term keyed on
it -- hollow, face gradient, lip, rim, and the broad trough shading -- could only
ever produce mottling, however hard it was driven.

The fix is a separate **wave form** field, exported in the flow buffer's spare
channel (`acc.amp` was read by the composite but never used): the same swell
reduced to its two dominant trains with no spread and no jitter, Gerstner-sharpened
the same way. Identical wavelength, direction and timing -- everything the review
froze -- but readable as a shape.

One more input had to follow it. The facing term was still derived from the swell
*gradient*, which carries the same speckle, so multiplying every shape term by a
speckled facing put the noise straight back into terms that had just been given a
clean field. It is now a difference of the form field sampled 7 px ahead along the
propagation direction: the surface falling shoreward, which is what "facing"
means.

With both changes the no-white view shows clear diagonal wave bands -- dark
troughs alternating with lit faces, running parallel to the coast. The test moved
for the first time.

### The other three items

* **Crest lighting** -- a directional rim: a narrowing bright contour on the
  sunward shoulder of a standing wave, before anything breaks.
* **Foam ageing** -- three deliberately distinct stages instead of one blend:
  fresh impact foam bright white, turbulent foam blue-white, old backwash thinner
  and darker. Persistence cut about 20 % (`tauPersist` 4.6/6.2/6.8 -> 3.7/5.0/5.5),
  the 15-25 % the review asked for rather than the 50-70 % the earlier one did.
* **Small-scale variation** -- the last detail component now crosses the swell
  direction instead of running with it, so the background stops reading as
  uniformly angled brush strokes.

### The traced annotation

The single most useful piece of direction in the project: the reference art with
the wave lines drawn over it in red, by eye, with a mouse. Not accurate -- it was
not meant to be -- but it showed exactly what the eye picks out, which no metric
here had been able to.

What it shows is **variance**. Short curved strokes, varying lengths, hooking and
bending, no two alike, at differing angles, and a hierarchy: a few long ones at a
glance, more and shorter on closer inspection.

The clean form field introduced above had the opposite defect from the noise it
replaced -- perfectly parallel, equally spaced, all one length. Three additions,
all to the drawn form only and none to the height field:

* **bend** -- slow spatial phase, so crests curve rather than running straight.
  Set at 2.2 rad it scrambled them back into mottling; 0.70 curves without
  destroying the line.
* **groups** -- the envelope waxes and wanes ALONG each crest, so a crest reads as
  a run of separate strokes of different lengths rather than one continuous line.
* **a third, finer train** -- two trains can only draw one scale of line, and the
  reference clearly has two.

The lesson worth keeping is about the direction, not the parameters: a rough trace
by hand communicated a structural property in one image that a dozen statistical
measures had entirely failed to capture. Every metric in this project matched the
plate while the render still looked wrong; the red marks explained why in seconds.

## Round AA — orientation coherence, and why every energy metric was blind

Suggestion from the owner: grid both images and compare cell by cell rather than
whole-image. It worked immediately, and it is the method that should have been
used from the start. `src/grid_compare.py`.

Per-cell, against the plate:

| | mean | std | sat | grain 1px | fine 4px | wave 16px | **coherence** |
|---|---|---|---|---|---|---|---|
| reference | 0.311 | 0.131 | 0.643 | 0.0294 | 0.0581 | 0.0789 | **0.574** |
| ours | 0.327 | 0.108 | 0.613 | 0.0287 | 0.0517 | 0.0695 | **0.393** |
| ratio | 1.05 | 0.83 | 0.95 | 0.97 | 0.89 | 0.88 | **0.68** |

Two findings, and the second is the important one.

**Grain was never the problem.** Ours matches the reference's pixel-scale grain at
0.97x. The "grainy" read comes from having 12 % *less* wave-scale structure at the
same grain level -- grain that would be invisible against strong forms becomes the
dominant thing the eye sees when the forms are weak. Ten rounds were spent adding
and removing texture on the assumption that grain was excessive. It was not.

**Orientation coherence is the measurement that was missing.** From the structure
tensor: how aligned local structure is. Aligned streaks approach 1, isotropic
speckle approaches 0. It is the single largest disagreement in the project -- every
other ratio sits between 0.83 and 1.12, coherence is 0.68 -- and crucially it is
**independent of energy**. At one cell the reference and the render carry nearly
identical wave energy (0.0749 vs 0.0722) and completely different coherence (0.745
vs 0.356). That is precisely "streaky versus mottled", and no energy statistic can
see it, which is why matching every one of them never helped.

### What it is not

Ablation found no single layer responsible: 0.377 with everything on, 0.369-0.380
with any one of foam, the detail waves, the fine relief, the chop marks, the hue
variation or the posterise removed. Nor is it the carve field's anisotropy --
taking it from 6:1 to 20:1 moved coherence by 0.000. Narrowing the wave field's
directional spread from 38 to 14 degrees and removing the direction wander moved
it from 0.377 to 0.421, real but far short of 0.566, and cutting the secondary and
chop trains made it *worse*.

### What it is

Foam here is a **threshold of a scalar field**, and thresholding a field yields
blobs however anisotropic that field is. The reference's coherence comes from foam
being **drawn along curves**. The only terms in this renderer that produce
genuinely aligned structure are the contour strokes, and they carry a small
fraction of the visual weight next to the thresholded foam mask and the shading
fields.

So the next step is not a parameter: it is to render foam as **strokes traced along
the crest and flow lines** rather than as a thresholded coverage field. Coherence
now gives an objective test of whether that worked, which is the first time this
project has had a measurement that tracks the actual complaint.

## Round AB — line integral convolution, and four stacked bugs

With coherence identified as the measurement that tracks the complaint, the fix
follows from what coherence *is*: a threshold of a field yields blobs however
anisotropic the field, but an **integral along a curve** is aligned with that curve
by construction. Line integral convolution -- average a noise field along the
streamline through each pixel -- is the standard way to produce that.

**Verified before trusting it.** A reference implementation in numpy, on this
renderer's own flow field, takes noise from coherence 0.293 to **0.897**. So the
technique works here; any failure would be in the integration, not the idea. That
check is the only reason the next part was diagnosable at all.

The shader version moved measured coherence by 0.001, four times in a row, for four
separate reasons -- each of which looked like "the technique doesn't help":

1. **Noise sampled at the material coordinate.** The material coordinate advects
   *with* the flow, so along a streamline it changes at exactly the rate that
   decorrelates the noise. The integral was averaging uncorrelated values, which is
   the precise opposite of what a line integral does.
2. **Noise scale far too coarse.** Fed 90 px noise over a 45 px path it averaged
   barely two features. The reference implementation averaged ~25.
3. **`noiseAt` cannot deliver fine noise at all.** It divides position by the scale
   and samples a *tileable, mipmapped* texture; asking for 3 px features tiles that
   texture ~470 times across the frame and hardware mip selection collapses it to a
   constant. The integral was integrating a flat field. Replaced with a hash-based
   value noise, which is what classic LIC uses anyway.
4. **No contrast stretch.** An integral over 2N samples reduces variance by 2N: at
   28 steps the raw output sits within +-0.04 of 0.5 and modulates the image by a
   few percent. Classic LIC contrast-stretches for exactly this reason.

With all four fixed, coherence moves from 0.378 to 0.520 at the same setting, and
to 0.574 -- the plate's own value -- at a higher one.

### The trade that remains

At the setting where coherence matches, wave-scale energy overshoots by 33 % and
the streaks read as hard regular corduroy. At the setting where all energy
statistics match within a few percent, coherence falls back to 0.76 of the
reference and it reads mottled again. The transition between the two is sharp,
because our streaks are *uniform* in strength while the reference's vary --
some strong, some barely present, over different lengths. Modulating streak
strength at a large scale widens the usable band (coherence 0.81, energies within
5-18 %) but does not close it.

The reason is visible in the earlier ablation: no single layer dominates coherence,
because the *isotropic* content is spread across all of them, and the largest
single contributor is the foam mask -- still a threshold of a scalar field. Adding
aligned structure on top cannot fix content that is isotropic underneath. The next
step is to remove the isotropic source rather than add more aligned terms: render
foam as strokes traced along the flow, so the mask itself is built from curves.

Coherence now gives an objective test for that, and its calibration is known --
white noise 0.24, smoothed isotropic noise 0.39, 8:1 anisotropic noise 0.90, a
perfect grating 1.00, this plate 0.57. Before this round the render sat at 0.393,
which is to say it was statistically indistinguishable from isotropic noise.

### Integrating it without breaking what worked

Turning the line integral on broke three checks in sequence, each for a physical
reason rather than a tuning one, and each worth recording:

* **Crest travel collapsed** on the calm state, 11.2 to 3.6 px/s. The streak field
  was scrolled at a fixed 9 px/s while the swell runs near 60, so the streaks
  became the dominant moving feature and the tracker followed them. A sliding
  layer -- the same failure this renderer had already fixed twice.
* **Bearings reversed** (321 deg against a swell at 55 deg): the scroll offset is
  added to the sample position, which moves the pattern the other way.
* **The loop seam blew out** (ratio 2.86 and worse against 1.0 for perfect).
  `loopScroll` quantises its scroll so that a *tileable* field wraps exactly once
  per loop, and a hash has no period at all. The lattice is now wrapped so the
  hash has the periodicity loopScroll already assumes.
* **Foam persistence failed** on the two lighter states. Scrolled at the swell's
  *phase* speed the field moved 27 px in half a second, further than its own
  feature size, so it decorrelated and took the foam mask it modulates with it.
  Surface texture is carried by the current, not by the phase: at 13 px/s, which
  is the right order for Stokes drift here, windy and heavy pass.

Calm keeps the line integral disabled. Its foam is sparse enough that the
modulation flips a meaningful share of it across the threshold, and a calm sea
genuinely has little surface streaking, so the metric and the art direction agree.

### Reverted: coherence is not a safe optimisation target either

The line integral did what it was built to do -- coherence 0.393 to 0.470 against
the reference's 0.574, every other statistic inside 5-19 % -- and the picture got
**much worse**. The sea reads as combed diagonal scratches.

That makes coherence the second metric in this project that must not be optimised
toward, after `perimeter/sqrt(area)`. The difference between them is worth stating
precisely, because coherence is still a *true* measurement: it genuinely separates
the reference from this render, and the earlier finding stands that our water is
statistically indistinguishable from isotropic noise in its orientation structure.
What it cannot do is act as a target, because raising it by laying an aligned
modulation *over* isotropic content buys the number without buying the look -- the
underlying content stays isotropic and now has stripes on top of it.

The line integral is left in the shader behind `licTone` and `licMix`, both zero,
so the result is reproducible rather than lost. If foam is ever rebuilt as strokes
traced along the flow -- which is what the measurement actually points at -- this
is the machinery to do it with, applied to the mask itself rather than as a
modulation over it.
