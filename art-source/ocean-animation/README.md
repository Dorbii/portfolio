# Coastal Ocean Animation

> **Picking this up cold? Read [`docs/HANDOFF.md`](docs/HANDOFF.md) first.**
> It carries the current state, the calibrated diagnostics, the negative
> results worth not repeating, and the one open problem stated precisely.

Three finished ocean animations over one fixed painted plate — a high-oblique
isometric cliffside settlement — each holding a single sea state for its whole
duration.

| clip | duration | loop | file |
|------|----------|------|------|
| Calm swell | 13.5 s | seamless | `outputs/calm_swell.mp4` |
| Windy rolling surf | 15.0 s | seamless | `outputs/windy_rolling_surf.mp4` |
| Heavy crashing surf | 17.0 s | seamless | `outputs/heavy_crashing_surf.mp4` |

Each also ships as an animated `.webp` and a `_preview.gif`.

The land is **not** animated, warped, morphed or interpolated. The selected source
image is sampled once per pixel and returned untouched wherever the water mask is
zero; `src/validate.py` proves this by comparing rendered frames against the plate
and reporting a maximum channel delta of **0**.

## Reproduce everything

```bash
python -m pip install -r requirements.txt
cd src && python reproduce.py
```

That single command rebuilds the reference analysis, the masks and plates, the
wave fields, all three clips, every contact sheet, and the full validation report.

Individual stages:

```bash
cd src
python analyze_refs.py                 # measure the reference library
python build_plates.py                 # masks, shoreline SDF, bathymetry, clean plate
python stage1_gate.py calm_swell       # Stage-1 open-ocean gate (no coast, no foam)
python render.py all                   # final MP4 + WebP + GIF + contact sheets
python validate.py ../outputs/calm_swell.mp4 --preset calm_swell
```

## How it works

A GPU height-field renderer (moderngl / GLSL, headless OpenGL 3.3). No 3-D scene,
no image morphing. The scene is a near-plan view of a water plane, so the water is
modelled as a screen-space surface with real wave mechanics behind it.

**Wave phase comes from a solved field, not a painted effect.** For a train of
fixed angular frequency the phase function obeys the eikonal equation
`|grad S| = k(x)`, with `k` from the linear dispersion relation
`omega^2 = g k tanh(k d)` on bathymetry derived from the scene's own shoreline
signed-distance field. Solving that once per wave family gives, as consequences
rather than decorations:

* **shoaling** — `k` rises as depth falls, so crests bunch toward the coast
* **refraction** — `grad S` turns toward the shore normal, so crests go shore-parallel
* **diffraction** — min-arrival propagation wraps waves around stacks and headlands
* **focusing** — rays converge on protruding rock, so headlands are hit hardest

`theta = S(x) - omega t` is then guaranteed to travel: level sets of `S - omega t`
move at `omega/|grad S|` along `grad S`.

On top of that:

* **directional spread** — five primary components spanning ±spread degrees, which
  is what makes crests short instead of edge-to-edge bands
* **travelling wave sets** — the group envelope is a slow modulation of the *same*
  phase field, so it travels at the group velocity `c/2` for free
* **amplitude** — Green's law from group velocity, times ray convergence
* **breaking** — significant height `Hs = 4 sigma` against local depth
* **whitecapping** — total surface slope, at roughly the 98th percentile of the
  deep-water slope distribution
* **foam** — a persistent ping-pong field: injected by breaking, advected by the
  surface flow, carried on material coordinates so its lace pattern stretches with
  the current, eroded as it ages, then faded. Never re-noised per frame.
* **pre-break volume** — a shoaling wave is drawn as a lifecycle, not as foam on
  a sine surface: the hollow ahead of it darkens, the shoreward face rises and
  goes translucent teal as light passes through the thinning water, a lip sharpens
  along the crest with its own shadow under it, and only then does whitewater
  collapse over the top. The clock is a break phase built from the deep-water
  swell height and the depth, and whitewater is gated on it, so a wave cannot foam
  before it has stood up.
* **spray** — triggered only at 54 precomputed impact sites scored by coastline
  exposure and convexity, so bursts happen at *places* and at different times

## Another scene

Nothing in the renderer is specific to this view. The water mask, shoreline SDF
and bathymetry are derived from the plate; the wave phase, shoaling, refraction,
ray focus and impact sites are derived from that bathymetry; the presets are art
direction. A new plate is:

```bash
cd src
python newscene.py init  harbour ../path/to/plate.png
python newscene.py render harbour heavy_crashing_surf
```

Three things genuinely need per-scene attention, and `newscene.py` documents why:
the **physical scale** (`OCEAN_G`, and open-sea depth must be deep relative to the
waves or they break in open water), the **wave direction** in the preset, and the
**water mask** -- water-coloured pixels misread as land zero the shoreline
distance, which makes a false shoal, which makes surf in open sea.

`src/closeup.py` is the same mechanism used for a magnified study: it points the
pipeline at a cropped, resampled workspace and scales the physical constants, so a
zoom is a change of units rather than a different sea.

## Layout

```
refs/canonical/        S, C1..C8 -- stable IDs (the supplied manifests disagreed)
masks/                 land plate, water mask, shore SDF, bathymetry, clean plate
src/                   analysis, plate building, wave solve, shaders, renderer, QA
src/shaders/           quad.vert, wave.frag, foam.frag, spray.frag, composite.frag
outputs/               the deliverables
contactsheets/         reference sheet + per-clip final sheets
diagnostics/           every measurement and visual check made along the way
docs/                  reference analysis, method, iteration log and scorecards
```

## Verification

`src/stage1_gate.py` is the open-ocean gate: constant depth, plane-wave phase, no
coast, no foam, no spray, no shallow colour, no plate. It tracks one crest across
300 frames and measures crest-phase transport spectrally.

Other diagnostics kept because each of them settled a question the picture alone
could not:

| script | answers |
|--------|---------|
| `src/look_probe.py` | how our stills score against a supplied reference in one fixed window |
| `src/ablate_terms.py` | which composite term is responsible for a look, measured water-only |
| `src/depth_profile.py` | *where* the brightness and the foam actually are, by depth band |
| `src/prebreak_probe.py` | the pre-break lifecycle in isolation, plus the raw swell height and break phase |
| `src/foam_shape.py` | foam blob area and elongation against the library, by second moments rather than perimeter |
| `src/wave_transect.py` | the pre-break profile along the direction of travel: hollow, teal face, lip, collapse, in order |
| `src/closeup.py` | the whole pipeline at 2.4x on a cropped workspace, where fine detail can fail on its own terms |
| `src/plate_match.py` | render vs the source plate's own water: value range, saturation, foam opacity |
| `src/foam_structure.py` | foam run-length along/across the waves and how open the surf zone is |
| `src/local_contrast.py` | tonal range INSIDE a wave-sized window, by distance from shore -- the measure that separated "looks like waves" from "looks like texture" when every global statistic already matched |
| `src/grid_compare.py` | cell-by-cell comparison against a reference, including **orientation coherence** -- the streaky-vs-mottled measure, and the only one that tracks the actual complaint |
| `src/coherence_ablate.py` | which layer, if any, is adding isotropic rather than aligned structure |
| `src/nofoam_test.py` | the acceptance test: with every white pixel removed, can a wave still be read as about to break? |
| `src/blue_noise.py` | high-frequency energy in the water AWAY from foam -- the plate's surface is smoother than ours by two thirds, and surface noise is what reads as paint |
| `src/struct_sweep.py` | structure, hue variety and isolated-speck share for parameter sweeps |

`src/validate.py` checks the delivered MP4 for land pixel stability (against a
codec noise floor measured on a static clip), frame integrity, crest travel, foam
persistence, loop continuity and frame rate.

Current results, all three passing every check:

| clip | foam % of water | water luma | crest travel | loop seam |
|------|-----------------|------------|--------------|-----------|
| Calm swell | 2.8 % | 0.220 | 10.8 ± 1.2 px/s, ncc 0.95 | 1.43 |
| Windy rolling surf | 6.8 % | 0.256 | 19.9 ± 5.6 px/s, ncc 0.95 | 1.22 |
| Heavy crashing surf | 9.0 % | 0.257 | 18.2 ± 5.0 px/s, ncc 0.94 | 1.22 |

Stage-1 crest phase transport, measured on the bare wave field: 53.52 / 45.71 /
56.75 px/s against theory, 0 backward steps in 299 for all three.
