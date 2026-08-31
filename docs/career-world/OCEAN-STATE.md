# Ocean lane — resume here

Last updated 2026-08-30 (night) · branch `codex/career-world-rebuild` · head `1067416`.

**World scale**: WORLD_LAMBDA stays 12 world px, deliberately. The city
thread's S2 audit puts the terrain-implied scale at 6.8–35.2 m per world px, so
a 12 px swell is 82–422 m — inside the physical range for ocean swell. The
world raster is NOT metric under the district scale (0.13 m/unit); do not mix
them. Coast authority is `world-land-mask-r4` (frozen; T70's D05 extension is
the one deliberate city modification, encoded in the bake mask).

This is the water program's own thread. `STATE.md` is the city/director thread
and calls this "a separate lane": read that one for city work, this one for
water. Do not resume ocean work from `STATE.md`.

---

## What this lane is doing

Replace all water logic and assets in `features/career-world/layers/ocean/` with
the offline renderer in `art-source/ocean-animation/`. The owner has granted full
water authority over it.

**The ocean layer owns all water.** Contributors own WHERE water is; this layer
owns HOW it looks. Inland water was moved under it by owner direction and is
marked for nuke-and-boot. City-painted water is removed once the ocean earns the
style; shore crash/swash stays city-owned where the city is present.

## Two rules that will cost you a day each if you miss them

**1. The generated files are generated.**
`features/career-world/layers/ocean/rendering/shaders/generated/**` and
`layers/ocean/model/generated/**` are written by
`art-source/ocean-animation/src/export_web.py`. Never edit them. Tune in
`presets.py` / `shaders/*.frag` / `export_web.py`, then:

```bash
cd art-source/ocean-animation/src && python export_web.py
```

`export_web.py` must be run from `src/`, and every other command from the repo
root — the Bash tool's cwd persists between calls and this bit me repeatedly.
**Then verify the generated artefact.** An export that dies on a missing `sub()`
anchor leaves the previous shader in place, and an afternoon went into comparing
a change against itself.

**2. Match the reference plate for the SEA STATE.**
`art-source/ocean-animation/refs/canonical/crossref.json` labels the eight plates.
The live state is `heavy_crashing_surf` (`OCEAN_BAKED_STATE`), so the targets are
**C3** (heavy_localized_cliff_impacts) and **C7** (heavy_peak_storm_surf).

I matched **C5** all day. C5 is `long_period_parallel_swell` and is the darkest,
flattest, least foamy plate in the set. Measured water-only:

| plate | coverage | elongation | reach | fragments/1k | p50 | p90 |
|---|---|---|---|---|---|---|
| C3 heavy cliff | 9.12% | 52.05 | 240.9 | 2.71 | 66.0 | 181.5 |
| C7 peak storm | 11.93% | 78.89 | 303.0 | 2.35 | 70.1 | 159.1 |
| C2 windy churn | 7.61% | 52.92 | 320.4 | 3.62 | 69.6 | 165.8 |
| **C5 (wrong)** | 1.84% | 12.41 | 134.8 | 14.26 | 38.0 | 87.1 |

Matching C5 pulled the work steadily away from the target for hours: `126d491`
cut foam coverage from 7.35% to 1.63% to reach C5's 1.84%, when 7.35% was close
to right. The owner kept saying the sea was not alive enough and was correct
every time. `e825ce9` reverses it.

---

## Where it stands (open sea, water-masked, against C3)

The connectivity table that stood here is retired: `b594ee8` found that the
offline renderer never set `uInjPatch` / `uInjPatchScale` / `uInjCrestRun`
(GL default 0 — gate open, recruit off, patch noise dividing by zero), so
offline and live rendered **different foam physics**, and the gate's threshold
was tuned against the renderer where it did nothing. With the fix in, the match
scene at live physics measures coverage 9.46% / elongation 46.3 / fragments
4.03 against C3's 9.12 / 52.05 / 2.71 — and the picture was STILL a corduroy
sea, which is the second finding: **foam_shape is satisfiable by a weave.**
Long parallel diagonal bands score as high elongation and low fragmentation.
Do not chase its numbers without looking; `field_stats.py` reads the fields.

What the weave actually was, established by ablation (all foam injection
zeroed, weave still present): the unconditional crest stroke floor
(`crestLineFloor` 0.30) hatching every crest of two parallel trains, plus a
whitecap field passing its slope threshold on 19% of deep-water pixels every
frame, which 5.5 s of persistence integrated into a carpet — fresh foam above
the render threshold on over half the deep sea. The sea had lost its zero.
`b594ee8` retunes: whitecapSteep 0.24→0.30, injPatch 0.50→0.85 (the group
envelope runs p50 1.00 / p99 1.65 deep, so 0.85 keys inside its real
variation), injPatchScale 420→640, injWhitecap 2.12→4.5, crestLineFloor
0.30→0.05. Live before/after at the identical camera: the stripe weave breaks
into dark water between distinct white masses; tone p50 56.9 vs C3's 55.8.

## THE DIRECTION (owner, 2026-08-31) — do not drift from this

Judge the water as a PhD would judge it, in two halves:

**Physics realism** is how the water BEHAVES — how it flows, breaks, carries
foam, meets the shore. The owner grants this half is broadly working.

**Style realism** is a match to THIS WORLD'S ART, not to photographs. A thing
is "real" here if it looks like it was painted by the hand that painted the
land. This is the half that has been failing, and it outranks every
photographic reference: *"it needs to feel real, not be real."* The eight
canonical plates are diagnostics at most. The reference-plate convergence
program is RETIRED — do not resurrect it (see [[ocean-feel-not-simulate]]).

The synthesis the owner named, and the one that finally moved things:
**PAINTED NOISE.** Noise decides WHERE things are; paint decides what is
DRAWN. Nothing may be rendered as a continuous per-pixel gradient — tone
quantises into flat steps and every boundary gets a drawn edge, because an
illustration defines a form with an edge and a gradient defines nothing.
Quantise SMOOTH fields only: quantising an already-noisy tone gives fractal
level sets, which is noise wearing a costume, and the owner spots it.

### The ocean lane owns everything at or below the waterline

Agreed with the owner 2026-08-31, and the reason is ownership hygiene: every
black void this lane has fixed was two layers each assuming the other paints
a pixel. The rule:

- OCEAN owns: the sea, the seabed and anything submerged (rocks, kelp,
  aquatic life), the wet-sand band, and water's REACTION to structures
  (foam on a piling's upstream side, diffraction arcs, wakes).
- LAND layers own everything above the waterline.
- Straddling assets (dock, pier) stay land-owned but must publish a
  FOOTPRINT the ocean consumes. Never two owners for one pixel.

Submerged assets should be LOW fidelity on purpose: contrast attenuates
exponentially with depth, so a sharp underwater rock reads as wrong.

### Build order for the coastal program

1. **The seabed seen through the water** (in flight, `seabedMix`): the one
   perceptual channel never used — you read a liquid by seeing INTO it. The
   ocean draws its own bottom rather than making the surface translucent,
   because the terrain paints nothing below the waterline (that is what the
   black voids were).
2. **Seabed detail** — submerged rocks and sand patches; procedural first.
3. **Structure interaction** — needs the footprint contract above.
4. **Aquatic life** — sparse, slow, low contrast.

### Open, carried forward

- Speckle in deep water: granular at its SOURCE (the foam field), so the fix
  is painting foam where it is BORN, not where it is drawn.
- The crest field is still a small sum of near-plane waves — a lattice by
  construction. Crossing the trains (40 deg) bought real irregularity; the
  rest needs a true spectrum, which costs frame time (the water pass already
  runs 13.0 ms of a ~33 ms frame at 3282x1846). Architectural, not tuning.
- Owed to the terrain thread: re-derive the merged bake mask and re-bake.
  `world-land-mask-r4` changed (1,358 px water->land near D05); 79 of those
  fall outside T70's bbox and are water in our bake input. Target list:
  `.codex-tmp/qa/COASTFIX/targets2.json`.

## REVIEW THE WATER ONLY AT THE CAPITAL COAST

The capital is the only stretch of this world with finished land art, so it is
the only camera where the sea can be judged against the style it has to belong
to (owner, 2026-08-31). Reviewed anywhere else the sea is compared to generic
terrain -- which is how it came to be tuned LOUDER than the world it lives in.

    node scripts/capture-ocean-comparison.mjs --out <p>         --span 0.20 --origin 0.045,0.129 --settle 22
    python art-source/ocean-animation/src/style_match.py <p>

THAT IS THE ANCHOR CAMERA -- the owner's own review framing, given
2026-08-31: open sea across the left third, the coast running down the
middle, the cathedral, ziggurat and works to the right. `--origin` pans to an
exact camera by dragging, because the anchor trick can approach a framing but
never reproduce one, and a review camera that drifts is not a review camera.
`--view NinjaOne` still exists (it clicks the nav button) but lands the city
on the LEFT with unfinished terrain filling the right, which is a worse frame
for judging water.

`--view NinjaOne` clicks the nav button and waits for the fly-to, which is a
fixed camera (origin 0.125,0 span 0.25) -- reproducible in a way --span is
not. `style_match.py` splits the frame into land and sea with the coast
authority and compares them AS PICTURES. The land numbers are the target:

| | capital ART | sea, 2026-08-31 start | sea now |
|---|---|---|---|
| 1-2 px energy | 7.01 | 10.62 | 7.49 |
| 4-8 px | 7.19 | 12.39 | 8.16 |
| 16-32 px | 5.63 | 10.88 | 7.01 |
| local contrast | 17.71 | 30.76 | 20.03 |
| saturation | 0.492 | 0.397 | 0.499 |
| edge coherence | 0.554 | 0.504 | 0.542 |

## THE FIRST RULE OF THIS LANE: you cannot see a change in a capture

Two captures of the SAME build differ by wave phase -- the sea is at a
different moment -- so before/after images are unreadable by eye and by image
difference alike. A whole day was spent showing the owner "before/after" pairs
whose only real difference was phase, and his "they keep looking identical"
was the correct read of them.

Use the phase-invariant metrics instead, on canvas-only captures (alpha > 250
masks to water the page actually shows):

    python src/weave_metric.py <captures>   # coh, hf, foam%  -- fine texture
    python src/band_metric.py  <captures>   # band energy     -- 15-60 px bands

Measured noise floor between two identical builds: coh 0.3628 vs 0.3618, hf
25.64 vs 25.53. Anything smaller than that is not a result. Always capture the
ablation and its baseline in the same session, and ALWAYS from the repo root
(the Bash cwd persists; a relative --out silently writes into a nested tree,
which swallowed a whole ablation batch).

## The capital-tier crosshatch — SOLVED (2026-08-31 late)

Measured with the above, at the capital camera, one term at a time:

| ablation | hf | band | verdict |
|---|---|---|---|
| baseline | 25.6 | 31.8 | the fabric |
| six tone painters off | 25.7 | 31.1 | **nothing** |
| crest strokes off | 25.7 | -- | **nothing** |
| sky + gloss + specular off | -- | 26.0 | ~nothing |
| wave field off (`?water.openWave=0`) | -- | 23.0 | ~nothing |
| foam line-work off | 16.4 | 26.8 | **large** |
| ALL foam injection off | 8.7 | 14.2 | **the author** |
| foam lifetime x0.12 | 14.7 | 20.5 | **the mechanism** |

The fabric was FOAM, entirely -- and not because too much was injected
(injection out there is a swash ribbon over 1% of the water) but because
seven seconds of persistence carried and held it until it covered the sea.
Two gates fix it, both riding resolvability: foam FILAMENT marks (wisps,
lace lines, streaks, chop marks) now fade on their own stricter gate --
`line` still passed them at 0.61 where a wave is 28 px -- and foam LIFETIME
drops to 0.12x when a breaker is unresolvable, so foam dies about as fast as
it is born and only the coast ribbon survives. At the capital camera: hf
25.6 -> 15.4, foam coverage 7.7% -> 2.9%, band 31.8 -> 24.3, with the site
tier unchanged (foam 12.4%).

Retracted along the way, both from bad masking -- measure the asset, and
check what your mask actually selects: "the world bake's depth tops out at 18
tuned px" (it reaches 105, exactly as offline) and "36% of the sea is shelf"
(it is 3.2%; the depth PNG's alpha is nonzero over land, so the mask was
selecting the whole frame). A third: scaling `uAmpP` cannot ablate the wave
field, because hn is normalised by its own RMS -- wave.frag says so directly.

Still open at the capital tier: a soft low-contrast diagonal banding (band
energy 24 of an original 32) that survives every ablation above. It is the
next thing, and it is NOT foam.

## The capital-tier crosshatch — earlier bisection, superseded

The owner sees a woven dash-grid at capital/territory zooms. Established with
the validated instruments above, in order:

- NOT stale serving (a second dev server on :3001 WAS stale and was killed,
  but :3000 reproduces the hatch).
- NOT the fine wave trains: uSecVis/uChopVis (runtime, exported) fade the
  secondary/chop by their own screen wavelength — verified at span 0.20.
- NOT breaking or whitecapping: uBreakVis gates both (probe reads them ~zero
  at span 0.42) — breakers consolidate into the ungated swash ribbon.
- LARGELY FOAM, but not only: zeroing injBreak+injWhitecap+injShore live
  removes the fat ribbon and masses; a pale dash-grid persists.
- The residual grid also survives sky/gloss/glitter/ripple/fineGloss zeroed
  on top of no-injection.
- `water.bare=1` kills the dash grid (so it IS drawn-layer content, findable
  by stacking the floor and adding groups back) and exposes the uBare leak
  (white foam scribbles in bare mode).

Next session: stack ONE floor capture (bare + all injections zeroed), then
add drawn groups back one at a time at span 0.42. The dash-grid's author is
inside the drawn layers and now has nowhere to hide. Fix the uBare foam leak
in the same pass. The shoreVis ribbon window in foam.frag was retuned against
a depth-units misreading — re-derive it from the probe's actual depthPx
distribution before trusting it.

## Open — the owner's direction, and the order I would take it

**The direction (owner, 2026-08-30 night), in his words: "it needs to feel
real, not be real."** And: "I want waves and crashes, dynamic and variant, but
it doesn't need the same simulated requirements — it just needs to convey the
concept." He pointed at the rocky-cove concept art as the water that "always
looks better even though it may be less realistic": crisp painted FACETS,
sparkle on saturated blue, discrete drawn shapes. The reference plates are
hereby demoted: their statistics are diagnostics at most, never acceptance
tests. Feel is the acceptance test, and the owner's eye is the instrument.
This retires the entire plate-convergence program this lane spent its first
sessions on — do not resurrect it.

The concrete composition this implies, partly landed tonight:
- flat dark pigment between events (`openPaint`, landed `ef3a988`),
- a HANDFUL of drawn wave events, not a statistical density (landed `873b687`
  — whitecapSteep 1.95, chosen by a live ladder against his eye, 1.5x the
  plate-calibrated value),
- **still to build: the facet-sparkle base** — the cove concept reads as water
  through crisp glinting facets at a readable scale, and the composite already
  owns glitter machinery (uGlitter / glintRaw / patchG at composite.frag's
  specular block) that could carry it at a coarser, painted scale,
- **still to build: drawn crash events** — big breakers as deliberate shapes
  with the existing stroke/alongVary machinery, bolder and rarer.

1. **DONE (`ef3a988`): the open sea is paint.** The banding lived in the base
   colour painters, below every gain — composite.frag now gates them all with
   ONE factor, `openPaint`: full strength at events and the surf zone, floored
   at `openPaint=0.25` (heavy state) on the open sea. Other states keep 1.0.
   Tune the floor, never re-scatter the painters. Live proof:
   `diagnostics/codexref/paint_live.png`.
2. **Foam threads, not blobs.** `1067416` made whitecapping rare and
   group-clustered (the fabric-density is broken), but C3's open-water foam is
   thin curving THREADS and ours fattens into blobs; as drawn shapes the
   events should read as strokes. The filament machinery contours the PRIMARY
   path; the injection contour likely needs to follow the local steepest train
   inside an event. Side-by-side: `diagnostics/codexref/phys2_vs_c3.png`.
3. **The speckle dust.** A fine white grain rides the whole sea and reads as
   noise at every zoom — the opposite of drawn. Single-uniform live ablations
   are null inside frame variance; whatever it is, find it by the floor
   method, offline where renders are deterministic.
4. **The coastal surf ribbon is uniformly solid** (interior wants lace), and
   **foam whites clip** (p99 255 vs the plate's 242). Small, after the above.

**Closed 2026-08-30 (night):** the shoreline gaps. `c2bc8b4` — the bake input
mask was missing ~30k px of authority water (whole lakes) and build_plates
culled disconnected water besides; codex measured 115,128 unpainted px at nine
coastal cameras, and after the re-bake the same scan reads ZERO. Lakes render
as still water via the focus=0 flag (see the commit for the three traps:
LINEAR-filtered focus bleeding into rims, self-normalised hn drawing phantom
swell at any amplitude, the one-sided coverage ramp that kills the coastline
outline). The whitecap-statistics pass also landed (`1067416`,
threshold-quadratic + group gating; literature in refs/wave-physics-notes.md).
5. **The ocean pins the sun's elevation and a day/night cycle is coming.**
   `oceanSunDirection` in `WaterSurfaceRenderer.ts` takes the world light's
   azimuth and overrides the vertical to a fixed 34 degrees
   (`TUNED_SUN_VERTICAL`), because the specular calibration is tuned to that
   elevation. Costs nothing today — the two differ by about a degree. Under the
   cycle the owner is planning, the land goes to dusk while the sea keeps a
   permanent mid-afternoon sun. Needs doing before that lands.
6. **Inland water nuke-and-boot**, assigned to this lane. Its coverage is
   hand-authored (a river centreline plus ellipse patches) while the terrain's
   water is derived, so the two drift and the drift is invisible until it is a
   hole.
7. **The one-water-authority contract** is agreed in principle and unwritten.

## Rejected — do not retry without new information

- **`licMix`, the flow-aligned line integral** (`758ae02`). Looks like an obvious
  win: the base preset offers 0.85, every state overrides it to 0 with no reason
  recorded, and composite.frag says it is "what makes foam form continuous
  streaks instead of disconnected patches". It marches along the flow direction,
  which is globally similar, so it combs the WHOLE sea into parallel strokes.
  Live it read as brushed metal.
- **Longer foam persistence.** Up to 8x moved streak reach 19.9 -> 21.4 -> 17.5.
  In deep water the flow is ORBITAL: foam oscillates in place, so a longer life
  leaves it sitting there longer, not travelling further.
- **Removing fine relief.** The reference's high-frequency energy is 30.5 against
  our 25.5 — the plates are MORE detailed than we are. Ours is detailed in the
  wrong way, not over-detailed.

## How to measure this layer without fooling yourself

Every one of these cost real time today.

- **Read the camera the app actually settled on.** `--span` is a request, not a
  promise: the app clamps, and every capture at the open-sea camera lands at
  **0.0825** whatever you ask for. The frame is written at CSS scale, so
  **zc is about 0.85** screen px per tuned px there, not the 2.86 I was passing
  to `foam_shape.py`. That made every foam number look 3.4x worse than it was and
  nearly buried a fix that had worked. The value is in the `.camera.json` written
  beside the image — read it and compute zc.
- **Mask both sides to the same thing.** The reference plates are ~40% cliff and
  trees. Comparing their whole-frame percentiles against an open-sea capture
  invented a contrast deficit that did not exist, and a commit was made on it and
  retracted (`d3bb39f`).
- **`foam_shape.py` applies `--zc-b` to every image after the first.** A
  three-image call silently rescales the reference. Use the two-image form.
- **Never trust one frame.** The surf pulses with wave sets; the same config read
  1.36% and 0.73% twenty minutes apart. `scripts/measure-ocean-motion.mjs`
  captures over many frames and reports spread.
- **A null result needs a long settle.** Foam and spray are integrated; use
  `--settle 22` or more. A null from a short capture is not evidence.
- **The metric is not the target.** Several times a number moved the right way
  while the picture did not, and once the picture improved while the number got
  worse (removing the gloss haze narrowed the luma histogram, because grey cloud
  over everything widens one). Always look.
- **A canvas-only capture is two-thirds invisible.** The water shader writes
  colour over the WHOLE frame and puts coverage in alpha (foam_shape.py's
  docstring says so, and it masks correctly). Any ad-hoc statistic on a
  canvas-only capture that does not zero alpha < 250 is measuring water the
  page never shows — an hour late on 2026-08-30 went into a "shallow-shelf
  camouflage mottle" that was 68% painted-over land.
- **The camera json's origin is the top-left CORNER of the world window**, not
  the centre. Verified by correlating a capture's alpha against the world water
  mask: corner 99.3%, centre 54.4%. Get this wrong and every field crop reads
  the wrong sea.
- **Offline/live uniform parity is not automatic.** ocean_gl.py binds its
  uniforms by hand and export_web.py binds them independently; a uniform bound
  in one and not the other fails SILENTLY (GL defaults to 0). The patch gate
  ran only live for its whole life. After adding any uniform, grep BOTH
  binding sites — or run one A/B (offline `state_frame.py` against a live
  capture at the match camera) before trusting an offline sweep.
- **Single live captures differ by ~±1 in any texture statistic** frame to
  frame (wave sets). Seven single-uniform live ablations on 2026-08-30 read as
  null inside that noise; the all-terms-off floor capture is what actually
  answered the question. Ablate to the floor, not one knob at a time.

### The magenta method — finds any coverage hole in one frame

To find ground that no layer paints, paint the page background and photograph it:

```js
for (const s of ['.career-world__viewport', '.career-world__backdrop', '.career-world'])
  for (const el of document.querySelectorAll(s)) el.style.background = '#ff00ff';
```

Anything magenta is a hole. This found the river gap immediately after a
distance-averaged alpha profile had suggested a 60px translucent band along every
coastline that did not exist — the average was measuring coastline roughness.

### Ablation — read this whole section, the mechanism has classes

`?water.u.<uniform>=<multiplier>` multiplies PRESET-DRIVEN uniforms only (the
~170 that come from oceanStates.ts). It does NOT touch RUNTIME uniforms —
uOpacity, uOpenWaveVis, uSecVis, uChopVis, uBreakVis, uZc, and the rest of
RUNTIME_UNIFORMS in WaterSurfaceRenderer.ts — those overrides are silently
ignored, and half a night (2026-08-31) went into "null results" that were the
mechanism, not the water. Before trusting any null, prove the override bites:
`water.u.uExposure=0.25` visibly darkens the sea in one capture. It is a
MULTIPLIER, so a uniform already at 0 cannot be raised — that needs an export.

Other validated instruments, all confirmed working 2026-08-31:
- `water.bare=1` — the built-in floor: strips drawn layers to geometry+base.
  KNOWN LEAK: thin white foam scribbles survive bare (some bright term is
  missing its (1-uBare) gate — find and fix it while bisecting).
- `?water.probe=1` + capture `--probe 1` — per-channel field stats off the
  GPU. This is what proved breaking/whitecap were truly gated while foam kept
  arriving (the injShore floor), and it beats any amount of theorising.
- `?layers=1` + capture `--hide L1_2` etc. — layer-inspector hides; L1_1
  "Ocean motion" off shows the water's static frame.
- Two dev servers on one tree serve stale module graphs: `netstat` for 3000
  AND 3001 before believing any "nothing changed".

### Tools

| | |
|---|---|
| `src/foam_shape.py` | filament or stipple: coverage, elongation, reach, fragments — satisfiable by a weave, see above |
| `src/state_frame.py` | one settled frame of any preset+overrides in a scene, water-masked alpha; the offline iteration loop |
| `src/field_stats.py` | wave-pass field stats over deep water: is whitecap an event field or a texture |
| `src/aniso.py` | directional spectrum; scale-free, so plates and captures compare directly |
| `src/foam_probe.py` | the offline buffers in the live probe's format |
| `src/impact_compare.py` | baked vs reconstructed impact field |
| `scripts/capture-ocean-comparison.mjs` | live capture; `--probe 1` with `?water.probe=1` |
| `scripts/measure-ocean-motion.mjs` | multi-frame motion with spread |

Offline scenes live in `art-source/ocean-animation/scenes/`; `match` is built on
the live camera's actual box (46.28% water against the live 46.4%) and is the one
to use for offline/live comparison.

---

## What landed 2026-08-30

Read the commit messages — they carry the measurements and the retractions.

| | |
|---|---|
| `c9795e7` | spray fired nowhere: the analytic impact reconstruction crossed its gate on 0.048% of the shore band against the baked field's 10.41%. The score scaled the site instead of selecting it, and the lattice cell copied the offline site spacing when the offline places sites ALONG the coast |
| `1840e4d` | the reported shore gap was the river: `c1-north-river`'s oceanHandoff ceded the estuary to the ocean, and the ocean's field calls that ground land. Terrain water no layer paints: 0.389% -> zero |
| `12fa748` | `uShadeSmooth`, the shading band-limit radius, was a screen length at every zoom — 5 tuned px offline, 1.7 at the capital, ~35 at world |
| `62c8090` | the gloss lobe at 34 is haze by composite.frag's own definition, and made the grey-white cloud the owner called "static white on top". 340 with double gain. `fresnelP` had the opposite sign error: `1 - pow(Ns.z, p)` increases in p, so raising it to 13 made the sky term fire at 0.55 on flat water |
| `4922a86` | the crest stroke was a clean contour multiplied by `facing`, built from the macro gradient (swell PLUS chop), which shredded it. This file already carried that fix for the shore stages and never applied it to `facing` itself |
| `5155147` | foam was born as dots on a line, because a smooth crest contour was multiplied by the granular whitecap field. A wave breaks along a stretch of its crest, so a trigger now recruits along the tangent |
| `52613fb` | whitecapping is patchy; every crest broke evenly along its whole length, which is a weave. `injPatch` gates injection on two noise scales times the wave-group envelope |
| `e825ce9` | **the reference retarget** — see above. Also `foamVeil` 0.26 -> 0.99: offshore whitecaps rendered at a quarter opacity, which is why the open sea was grey mush |
| `b594ee8` | **the offline renderer never ran the patch gate** (three uniforms unbound since they were written), foam_shape shown satisfiable by a weave, the foam carpet found and drained, the crest stroke floor cut — see "Where it stands" |

Retracted along the way and worth reading for the reasoning: `d3bb39f` (the
tonal range was never narrow), `758ae02` (licMix), `a50062b` (a regex edit that
hit the wrong sea state — there are three, and the first in the file is calm).

## The through-line

Four separate bugs this session were the same mistake: **detail shaded in
per-pixel rather than drawn on**. The gloss lobe, the chop lambert, the crest
`facing`, and the foam injection each took a clean field and multiplied it by a
noisy one. composite.frag says it directly — "the detail is DRAWN on top rather
than shaded in, which is the one thing that has worked all session" — and the
codebase keeps re-learning it. If something reads as texture rather than as
water, look for a smooth thing being multiplied by a granular thing before you
look anywhere else.
