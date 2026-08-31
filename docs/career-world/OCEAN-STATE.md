# Ocean lane — resume here

Last updated 2026-08-30 · branch `codex/career-world-rebuild` · head `e825ce9`.

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

| | ours | C3 | |
|---|---|---|---|
| foam coverage | 7.71% | 9.12% | close |
| p99 luma | 220.9 | 223.4 | matched |
| streak reach | 169.9 | 240.9 | short |
| **elongation** | **14.70** | **52.05** | **far** |
| **fragments / 1k** | **7.33** | **2.71** | **far** |

The two "far" rows are one fact: **the reference's whitewater is a few large
connected masses and ours is many separate streaks.** That is the top open item.

## Open, in the order I would take them

1. **Foam connectivity.** Elongation 14.7 against 52, fragments 7.3 against 2.7.
   Coverage and brightness are right; the masses do not merge. The carve
   (`uFilament`, `uLaceRidge`, `uFoamErodeK`) is the obvious suspect and reducing
   all three did NOT fix it (fragments 11.15 -> 8.36 only), so the fragmentation
   is probably upstream in how injection is distributed, not in the erosion.
2. **Shoreline gaps at site LoD.** Owner-reported 2026-08-30 with a screenshot:
   black voids between water and land, his guess is shore detail owned by another
   layer. Same class as the river gap fixed in `1840e4d`. **Use the magenta
   method below** — it finds these in one frame.
3. **Tone.** p50 and p90 still below C3 after the retarget; not yet re-measured
   since `e825ce9`.
4. **The ocean pins the sun's elevation and a day/night cycle is coming.**
   `oceanSunDirection` in `WaterSurfaceRenderer.ts` takes the world light's
   azimuth and overrides the vertical to a fixed 34 degrees
   (`TUNED_SUN_VERTICAL`), because the specular calibration is tuned to that
   elevation. Costs nothing today — the two differ by about a degree. Under the
   cycle the owner is planning, the land goes to dusk while the sea keeps a
   permanent mid-afternoon sun. Needs doing before that lands.
5. **Inland water nuke-and-boot**, assigned to this lane. Its coverage is
   hand-authored (a river centreline plus ellipse patches) while the terrain's
   water is derived, so the two drift and the drift is invisible until it is a
   hole.
6. **The one-water-authority contract** is agreed in principle and unwritten.

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

### The magenta method — finds any coverage hole in one frame

To find ground that no layer paints, paint the page background and photograph it:

```js
for (const s of ['.career-world__viewport', '.career-world__backdrop', '.career-world'])
  for (const el of document.querySelectorAll(s)) el.style.background = '#ff00ff';
```

Anything magenta is a hole. This found the river gap immediately after a
distance-averaged alpha profile had suggested a 60px translucent band along every
coastline that did not exist — the average was measuring coastline roughness.

### Ablation

To find which term is responsible for a look, zero the others with
`?water.u.<uniform>=<multiplier>` and capture. Note it is a MULTIPLIER, so a
uniform already at 0 cannot be raised this way — that needs a preset change and
an export. Working down to a floor with every named term off, and then adding
groups back one at a time, is what located the gloss haze.

### Tools

| | |
|---|---|
| `src/foam_shape.py` | filament or stipple: coverage, elongation, reach, fragments |
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
