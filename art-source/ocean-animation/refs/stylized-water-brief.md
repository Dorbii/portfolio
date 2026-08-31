# Stylized top-down ocean: visual-language brief

Compiled 2026-08-31. Companion to `refs/wave-physics-notes.md` (physics of WHERE/WHEN white
appears). This brief is the other half: WHAT the water is made of visually — the devices that
make acclaimed stylized/painted oceans "feel real, convey the concept" instead of "simulating
real", with parameters for the GLSL renderer (`src/shaders/wave.frag` / `foam.frag`).

**The diagnosis in one paragraph.** Every reference below that *feels* right — Anno, Sea of
Thieves, Wind Waker, the canonical plates in `refs/canonical/` — is built as a **graphic system**:
a short, saturated, hue-locked color ramp; foam as a *drawn connected lace* with two value levels;
translucency faked as a teal flash at crests; and whiteness spent almost entirely on *events*.
Photoreal footage (including the Shutterstock clip, measured below) reads grey and even because
real overcast light desaturates everything and real foam is a dim, uniform residue field. A
renderer that chases the footage inherits the grey. The stylized targets keep the *structure* of
the real thing (lace topology, group-clustered events, translation of crests) and replace its
*optics* (saturation up, foam brightened and simplified into two values, contrast protected).
That is the difference between "simulates real" and "feels real."

Method note: hex values marked *(sampled)* were pixel-sampled by me from the cited still via
canvas/GetPixel (cluster means over the water region, not single pixels). SoT day/Northgard
samples came from ~474 px search thumbnails (JPEG-soft but hue-faithful); Anno, Civ VI, Wind
Waker, the Shutterstock clip, and the canonical plates were sampled at full resolution. Coverage
percentages = fraction of water-region pixels above a luminance threshold (stated per case).

---

## (a) Per-source notes

### 1. The Shutterstock clip (Steve's reference)
https://www.shutterstock.com/video/clip-15753598-realistic-3d-animation-stormy-ocean-waves-extending
"Realistic 3D animation of stormy ocean waves extending to horizon with a cloudy sky. (Seamless
loop)" — Reun Media, 2016, 10 s HD loop, keywords include storm, hurricane, whitecaps, foam,
raging, rolling, crashing.

What the preview shows (observed at t≈0 s / 5.2 s / 7.2 s): camera elevated maybe 15–25° above
the surface looking to a hazy horizon; short-crested wind chop, crest lines 10–20 per screen
height, translating steadily as a field; scattered spilling whitecaps that flash on crest tops
and collapse into short dim streaks; flat overcast light, zero sun glint.

Measured *(sampled at 384×216)*: mean water `#2d3f50`; troughs `#0f0e19`–`#1a2635`; mid faces
`#3c4d63`; far water `#42586a`; horizon haze `#ada7a7`; brightest foam only `#bbc0c5` — a
grey-white, nowhere near paper white. Coverage in the water region: L>150 ≈ **0.9%**, L>110 ≈
**7.7%**, L>85 ≈ **15.6%**.

Read: even this "stormy" clip is ~99% not-bright-white; the storm impression is carried by a
*dense mid-tone foam residue network* plus short-crest chop. Two things to take, one to reject:
- TAKE: the two-tier foam population (tiny bright fraction + broad dim veil), and crests that
  visibly *translate* as a field.
- TAKE: whitecaps as brief events on crest tops that leave decaying streaks.
- REJECT: the palette. Overcast-photoreal grey (`#2d3f50` mean, foam `#bbc0c5`) is exactly the
  "simulates real" look. The stylized targets below keep the structure and re-light it.

### 2. Aerial storm-foam morphology (the lace-network photos)
- Foam streak imagery/discussion: https://www.researchgate.net/figure/Ocean-surface-foam-streaks-observed-on-photographic-images-of-the-sea-surface-in-a_fig8_258662680
- Langmuir circulation / windrows: https://www.sciencedirect.com/topics/earth-and-planetary-sciences/langmuir-circulation
- Whitecap overview: https://www.surfertoday.com/environment/what-are-whitecaps

The aerial "white lace over saturated teal/navy" pattern decomposes into three drawable layers:
1. **Fresh crest patches** — bright, compact, elongated along the crest (cross-wind).
2. **Residual veils** — the same patches seconds later: dimmer, spread, increasingly hole-y
   (lace is literally decay: a solid patch developing holes as bubbles pop outward-in).
3. **Windrow streaks** — foam raked into long wind-parallel lanes by Langmuir rolls; these give
   the connected network its directional grain, perpendicular to the crest-aligned fresh patches.
Aerated turquoise appears as a *halo around and downstream of events* — bubbles driven under and
resurfacing — never as a global tint. Researchers themselves can't always tell fresh whitecaps
from old streaks from the air (Ross & Cardone 1974, via surfertoday) — i.e. the two populations
form one continuous visual system: bright cores dissolving into a persistent dim network with
90°-crossed directionality (fresh = along crests, streaks = along wind).

### 3. Sea of Thieves (Rare) — the stylized-but-alive benchmark
- SIGGRAPH '18 talk paper (read in full): https://history.siggraph.org/wp-content/uploads/2022/09/2018-Talks-Ang_The-Technical-Art-of-Sea-of-Thieves.pdf (DOI page: https://dl.acm.org/doi/10.1145/3214745.3214820)
- GDC art talk: https://gdcvault.com/play/1025015/Visual-Adventures-on-Sea-of ; video mirror https://www.youtube.com/watch?v=y9BOz2dFZzs
- SoT-inspired walkthrough with numbers (Alex Tardif): https://alextardif.com/Water.html
- SoT-inspired Unity build: https://80.lv/articles/creating-a-3d-water-shader-in-unity-inspired-by-sea-of-thieves

From the paper, verbatim mechanics:
- FFT (Tessendorf) waves. **Water color = blend(deep color, sub-surface color)** driven by view
  angle + sun direction + a **wave-peak mask built from the FFT choppiness offsets** — where
  horizontal pinch is strongest (crests), light path is shortest, so the surface flips toward the
  bright sub-surface color. This is THE SoT device: the emerald flash lives on crests only.
- **Foam**: generated at peaks (Tessendorf) + around intersecting objects (depth compare);
  the foam buffer is **progressively blurred with feedback** to model dispersal and soften the
  mask; the result is **blended with artist-authored textures** "to give a more stylized
  appearance". So the lace is *authored*, applied through a simulated mask.
- Foam generation/dispersion/texture-blend all **change per sea state** (calm / normal / stormy):
  stormy = churn foam everywhere; calm = object foam only. Coverage is a *state variable*.
- Area specular (closest-point-on-sphere) for big low-sun highlights; Snell's window below.

Measured from a daytime rough-sea still *(sampled, 474 px thumbnail)*: deep `#21474d`, mid
`#486368`, crest/subsurface teal `#1b4d54`→`#5e7876`, foam `#d4dcd8`, bright-foam coverage
**8.5%** at rough-but-not-storm. The signature: **hue stays in the green-teal family (H≈180)
from deep to crest** — SoT never goes navy; saturation and lightness move, hue barely does.
Storm state (from talk + wiki, not sampled): light greys out, sea goes grey-green, foam churn
rises sharply — value contrast collapses on purpose to make storm feel hostile.

Tardif's numbers (his SoT-ish demo, useful as a starting grid): Gerstner steepness 1.79 shared,
wavelengths 3.75/4.1, amplitudes 0.85/0.52, speeds 1.21/1.03; surface color (0.465,0.797,0.991)
≈ `#77cbfd`, refraction color (0.003,0.599,0.812) ≈ `#0199cf`; foam mask = heightFactor(start
0.8, fade 0.4) × pow(waveAngleFactor, **80**) × noise, contact foam pow 3, **foam brightness
×4.0**; specular deliberately broken into sparkle with 3 noise samples (roughness 0.08).
Community recreations converge on: 4 noise/normal layers (2 large + 2 small), scrolled in
**opposite directions, small-scale slower than large**, and depth-exponential color lerp.

### 4. Anno 1800 (Ubisoft Mainz) — the painted-map gold standard
- Frame analysis (Thomas Poulet): https://blog.thomaspoulet.fr/posts/anno-1800-frame-analysis/
- Engine devblog: https://www.anno-union.com/devblog-the-anno-engine/
- Concept-art context: https://www.artstation.com/artwork/e09rNw (Jan Goszyk),
  https://www.artstation.com/artwork/EagAkK (Damian Bonczyk)

Pipeline facts (frame analysis): FFT ocean on async compute — large + small wave
displacement/gradient maps at 512²; **plus a local 2048² shoreline simulation around each island
producing displacement + a divergence/foam/pressure term + a velocity map**; shader-generated
shoreline waves (a quality toggle). So: global FFT for open sea, *dedicated authored-feeling
foam sim where water meets land* — the shoreline is where Anno spends its budget.

Measured, tropical harbor still *(sampled full-res, Steam ss_9756…)*: deep harbor `#143954` /
`#17405e`; mid `#2b515e` / `#345969`; shallow green-teal `#3c6464` / `#426f6c`; **aerated bright
turquoise `#5ea3bb` → `#62b7e0`** (top-saturation cluster); foam `#ded8ca`. Bright-white pixels
≈ **0.05%** of the frame — at calm, Anno's sea is almost entirely *color*, no white.
Measured, Enbesa harbor still *(sampled full-res, ss_a6c2…)*: deep `#1c2a33` / `#233a4c`; wake
veil mid-tone `#90938a`; bright foam mean **`#f5edda` — warm cream, not white**; ~3.7% bright in
the busy harbor band.

What carries Anno's read:
- **Foam is warm** (cream `#f5edda`/`#ded8ca` over cool navy) — instant "painted" feel.
- **White is reserved for meaning**: ship wakes (a translucent fan veil with lace holes,
  hanging *behind* the ship and decaying, not riding the water), shoreline surf bands
  (double-line: bright edge + soft inner veil), and nothing else. Open water is clean dark color
  with fine specular sparkle.
- **Depth is painted as a value ramp** into turquoise over shoals — the aerated turquoise is a
  *depth* color there, which doubles as an event color when churned.
- Wave shape is almost invisible offshore; the sea reads ~90% color + foam graphics, ~10%
  geometry. On a top-down map this is the correct budget split.

### 5. The Legend of Zelda: Wind Waker — the purest map-read ocean
- Analysis (Nathan Gordon): https://medium.com/@gordonnl/the-ocean-170fdfd659f1
- No-texture recreation w/ palette: https://godotshaders.com/shader/wind-waker-water-no-textures-needed/
- Voronoi recreation tutorial (Daniel Ilett): https://danielilett.com/2020-04-05-tut5-3-urp-stylised-water/
- Shadertoy 2D recreation: https://www.shadertoy.com/view/3tKBDz

Measured, original-era screenshot *(sampled)*: the entire sea is **one flat saturated cobalt
`#0861de`** — no depth ramp, no value gradient — with foam-lace lines `#deebf4` edged `#bdf5ff`,
covering ≈ **5%** of the surface as drifting open rings/arcs. Godot recreation's palette (tuned
to the 2002 game): water `#0a61e0`, second water tone `#0a59c7`, foam `#d0f5f6` — confirms the
sample almost exactly. Construction (Gordon + recreations agree):
- One tiling **white-line lace mask**; sampled **twice** — once as white, once **offset (~0.1
  UV) and tinted darker blue** as a drop-shadow copy. Two samples = the lace pops off the field.
- UV-space **compound-sine distortion** wobbles the lookup (the lace shimmies without moving);
  the whole texture additionally **slides slowly in one direction** for travel.
- Recreation params that reproduce the feel: tile ~5×, distortion_speed ~2.0, wave (vertex bob)
  speed ~1.5; Ilett: voronoi cell edges as the lace, second sample offset (0.1, 0.1), depth-
  intersection step at 0.5 for shore foam.
Lesson: with a strong enough graphic (saturated flat field + two-value lace + gentle shimmer +
slow slide), an ocean reads perfectly with ZERO simulation. This is the floor to build up from,
not the ceiling.

### 6. Map waters: Civilization VI, Northgard
- Civ VI fan-art water workflow: https://80.lv/articles/001agt-002mrs-civilization-vi-fan-art-substance-designer-workflow
- Civ VI still measured *(sampled full-res, Steam ss_36c6…, dusk lighting)*: mid `#4c597b`,
  shore band `#7d8ba9`, sparkle `#c1c9e2`. Daytime Civ VI (not sampled; well known) runs a
  banded turquoise→navy ramp per hex-distance from coast.
- Northgard still measured *(sampled thumbnail)*: deep `#1a2631`, mid `#38536e`, shallow band
  `#79a0b5`, foam `#ccdacd`.

Both are the "board" register: 3-band depth ramp keyed to distance-from-coast, a light
desaturated shore band, thin white shore arcs that pulse toward land, and in-place sparkle
shimmer. No translating swell at all. Useful as the *bottom* register of the style scale —
the renderer's calm state can borrow the cleanliness (banded ramp + shore arcs + sparkle),
while storm borrows from SoT/Anno/canonical plates.

### 7. Moana (Disney) — stylized-real hybrid
- SIGGRAPH 2017 "The Ocean and Water Pipeline of Disney's Moana": https://dl.acm.org/doi/10.1145/3084363.3085067 (overview: https://history.siggraph.org/learning/the-ocean-and-water-pipeline-of-disneys-moana/)
- Production notes: https://blog.disneygeek.com/2016/11/21/moana-preview-water-a-technical-visual-effects-challenge/ , https://www.autodesk.com/design-make/articles/moana-animation
Explicit doctrine: not photorealism but an **"idealized look… like a vivid memory"** — i.e.
push saturation and simplify detail beyond the plausible, keep physical *behavior*. Water split
into zones by narrative distance (general ocean = formulaic rules; near-boat = bespoke rules).
Transferable: treat the ocean as **layers with different realism budgets** — background water
can be almost graphic, event water (breaks, wakes) gets the simulation fidelity.

### 8. Technical-artist foam/water recipes (the common tricks)
- Foam rendering approaches survey: https://80.lv/articles/breakdown-back-approaches-to-realtime-foam-rendering
- Voronoi water: https://80.lv/articles/how-to-set-up-voronoi-based-water-shader-in-unity , https://kevinbr.artstation.com/projects/9edDLW
- Harry Alisavakis stylized water (shader code): https://halisavakis.com/my-take-on-shaders-stylized-water-shader/
- Nimue UE5 stylized water: https://80.lv/articles/how-to-build-stylized-water-shader-design-implementation-for-nimue
- Alex Ameye URP tutorial: https://ameye.dev/notes/stylized-water-shader/ ; Alisavakis portfolio: https://halisavakis.com/portfolio/water-shaders/

Recurring devices across all of them:
- **Foam texture = voronoi cell edges** (F2−F1 or inverted cell distance): instant bubble-lace;
  layered at 2 scales for size variety; poisson-disc variants for even bubble fields; photo-based
  alternative = cropped foam photos → tiling mask + multiple scales blended.
- **Two-sample offset** (bright + dark copy shifted ~0.1 UV) for lace depth (WW, Ilett).
- **3-zone depth ramp**: `saturate((sceneDepth − surfDepth)/threshold)` per zone
  (intersection / main / deep-fog), lerped — Alisavakis publishes this exact form.
- **Shore foam pulse**: `sin((shoreDist − t·speed) · 8π)` masked by a noise texture and stepped —
  animated concentric arcs marching to shore (Alisavakis).
- **Opposite-direction dual scrolling** of noise/normal layers at unequal speeds.
- **Sparkle = noise-broken specular** (3 noise samples multiplied into the highlight; Tardif).
- **Caustic layer** = voronoi, duplicated 2–3×, rotated, blended (Nimue) — scrolled slowly.
- **Foam brighter than physical**: brightness multiplier ~4× (Tardif), because foam must win
  against sky reflection at every exposure.

### 9. The canonical plates (`refs/canonical/`) measured with the same ruler
Ocean strip only (left 40–55% of frame), stride-4 sampling, L>0.72 = "bright foam":

| plate | state (crossref) | bright foam % | foam color | shadow-foam (veil) | deep | mid | saturated teal |
|---|---|---|---|---|---|---|---|
| S | selected source | **8.4%** | `#d1dce0` | `#82a0af` (10.0%) | `#112939` | `#1f4d68` | `#487b94` |
| C7 | heavy_peak_storm | **18.6%** | `#d4d4d2` | `#93a0a4` | `#122830` | `#2c4e5a` | — |
| C2 | windy_churning_whitewater | 11.4% | `#d7dcde` | `#8b9ea6` | `#142627` | `#335255` | `#617f7b` |
| C6 | windy_approaching_breakers | 12.3% | `#d9dddb` | `#8da2a4` | `#192a24` | `#335654` | `#6c8874` |

Structure of the plates' foam (visual read of S/C7): fine connected filaments ~1–2 px wide at
plate resolution forming closed nets around 5–30 px dark cells; filaments thicken into solid
slabs only at breaker impacts; offshore, the net stretches into direction-grained streaks; and
*everywhere* the bright net sits on the darker `#8ba0aa`-family veil — the two-value system.
These plates are cliff-surf close-ups, so their coverage is the SURF-ZONE number; the offshore
band of S alone is much sparser (matches the physics-notes budget of 3–10% total offshore).

---

## (b) What carries the read — the shared devices, with GLSL starting values

Every strong stylized ocean above uses most of these eight. Ordered by leverage.

**D1. Two-value foam: bright lace core over a half-tone veil.**
Every measured source (clip 0.9% bright / 15.6% dim; canonical S 8.4% bright / 10% veil at
`#82a0af`; Anno wake `#f5edda` core / `#90938a` veil) — no good ocean has single-value foam.
GLSL: render foam buffer's fresh and persist channels differently:
`col = mix(col, veilColor, sat(persist)·0.45); col = mix(col, foamWhite, sat(fresh + persist²·0.3));`
with `veilColor ≈ mix(midWater, foamWhite, 0.45)` ≈ `#8fa3ac`. The veil is allowed 2–3× the
area of the core (Scanlon & Ward's W_B > W_A, and it is what makes coverage read without glare).

**D2. Foam is a drawn lace texture, not a scalar mask.**
SoT: sim mask *blended with artist-authored textures*; WW: authored line texture; tutorials:
voronoi edges. The mask says WHERE, the texture says WHAT. GLSL: modulate the foam value by a
tiling lace lookup at 2 octaves — `lace = tex(uv·s1 + drift) · 0.65 + tex(uv·s2 + drift·1.7) · 0.35`
(or procedural: `1 − sstep(0.0, w, F2−F1)` voronoi edges, edge width w ≈ 0.06–0.12 of cell size,
domain-warped by curl noise ~0.15 amplitude). Target morphology at map zoom: vein width ≈ 1/10
to 1/20 of cell diameter; cells 6–15 px (fine octave) and 25–60 px (coarse) on screen. Erode the
texture threshold as persist decays so *patches die by growing holes* (lace = decay made visible),
not by uniform fade-out.

**D3. Subsurface teal flash at crests (before and around any foam).**
SoT's core device (peak mask from choppiness → sub-surface color). It makes water read
translucent and alive even at zero foam, and it pre-announces breaking. GLSL:
`peakMask = sstep(t0, t1, crestSteepness or hn); col = mix(col, uAeratedTeal, peakMask · k)`
with k ≈ 0.35–0.6, and pushed harder in the 1–2 s after a foam-injection event at that pixel
(aerated halo: bubbles resurfacing). Aerated teal at heavy storm ≈ `#3e8c8f`; tropical/shallow
variant ≈ `#5ea3bb`–`#62b7e0` (Anno-sampled).

**D4. A short hue-locked ramp; storm = darker + MORE saturated, never grey.**
SoT holds hue ≈ 180 deep-to-crest; WW holds one hue flat; Anno navy→green-teal over depth.
The Shutterstock clip greys out (mean `#2d3f50`, S≈0.28) — that is precisely the "simulated"
look. GLSL: author 4 stops (deep / mid / aerated / foam) per sea state and lerp by a *painted*
control (depth + peak mask + event halo), not by physical Fresnel alone; at the heavy state
drop deep-stop lightness ~20% and RAISE mid/aerated saturation ~15% relative to calm. Keep hue
drift across the whole ramp ≤ ~25°.

**D5. Foam temperature is a choice — never pure #FFFFFF.**
Anno: cream `#f5edda` on cool navy (painted warmth, best "concept-art" smell); SoT/WW/canonical:
cool blue-white `#d1dce0`–`#deebf4`. Both work; pure white works nowhere (even the clip's
brightest is `#bbc0c5`). Also brighten foam ~2–4× over its physical share (Tardif's ×4) so it
wins at map scale, and cap near `L ≈ 0.85–0.88`.

**D6. Whiteness is event-currency with a coverage budget (legibility overshoot over physics).**
Physics budget (wave-physics-notes R1): storm total 3–10%. Stylized refs at their heaviest run
hotter *in the event zones*: canonical C7 surf strip 18.6% bright + veil; SoT rough day 8.5%;
but Anno calm harbor 0.05% and WW calm 5% *decorative*. The rule all share: bright core stays
< ~8% of open water even at storm (surf/impact zones may spike locally to 20–40%); the veil
carries the rest; calm ≈ 0 except meaningful events (wakes, shore). This is R1/R2 of the physics
notes with an art override: +50–100% on the physics numbers is acceptable FOR THE VEIL ONLY;
the bright core keeps the physical rarity (that's what keeps storm from reading as noise).

**D7. Motion is split three ways: crests translate, lace shimmers, foam lags and decays.**
- Crest/wave phase: translates at c (already correct via phase advection).
- Lace texture: does NOT translate at c. WW: slow uniform slide (~0.02–0.05 UV/s) + sine
  shimmer-in-place (distortion amplitude ~0.01–0.02 UV, ~0.3–0.6 Hz); SoT: foam buffer
  feedback-blurs in place while the surface moves under it. GLSL: advect foam/lace UVs at
  **0.15–0.3 × the phase speed** (stage-B foam is left behind by the waves — this lag is what
  makes wakes hang behind Anno's ships), plus a small counter-scrolled second octave.
- Sparkle: shimmers strictly in place, twinkle 2–4 Hz, 1–2% of pixels, `#c8e6ee`-ish, from
  noise-broken specular (3 multiplied noise samples), never translating.
- Event pulses: injection recurs ~once per Tp inside a group (physics notes R4); shore-foam
  arcs march at the shoreline with `sin((d − t·v)·8π)` (Alisavakis) — period ~2–4 s reads calm,
  ~1 s reads agitated.

**D8. Zone budgets: spend simulation where the camera cares (Moana's zoning, Anno's shoreline sim).**
Anno runs a dedicated 2048² foam/velocity sim *only around islands*; Moana split ocean into
realism zones. For the top-down renderer: open water = D1–D7 graphics driven by the cheap group
statistics (physics notes R2–R5); shore/landmass fringe and ship wakes get the authored
double-line + veil-fan treatment (bright edge `foamWhite`, 2–4 px; inner veil 3–6× wider at
`veilColor`; holes growing with age). Contrast between busy fringe and clean open water IS the
composition — do not let open-water chop compete with it.

---

## (c) Palette tables

### Working palette for the renderer at HEAVY STORM (synthesized: canonical plates anchored,
Anno/SoT-corrected; cool-foam variant to match `refs/canonical/`)

| role | hex | source anchor |
|---|---|---|
| deep water (troughs, open sea) | `#0F2733` | canonical S/C7 deep `#112939`/`#122830`, Anno Enbesa `#1c2a33` |
| mid water (faces, general field) | `#255062` | canonical S mid `#1f4d68` pulled toward C7 `#2c4e5a` |
| saturated crest teal (peak-mask flash) | `#2E7D84` | SoT crest `#1b4d54`→`#5e7876`, canonical teal `#487b94` |
| aerated turquoise (event halos, churn) | `#3E8C8F` | C2/C6 teal `#617f7b` saturated +15%; tropical alt `#5EA3BB` (Anno) |
| foam veil / shadow foam | `#8FA3AC` | canonical `#82a0af`/`#93a0a4`, Anno wake `#90938a` |
| foam white (lace core, fresh) | `#D6DEE2` | canonical `#d1dce0`/`#d4d4d2`; warm alt `#F0E8D8` (Anno `#f5edda`) |
| sparkle / glint | `#C8E6EE` | Civ sparkle `#c1c9e2`, WW lace fringe `#bdf5ff`, desaturated |

Ratios at heavy storm (open water, from D6): deep+mid ≈ 75–85% of pixels, crest teal ≈ 8–12%,
aerated halos ≈ 3–5%, veil ≈ 5–8%, bright lace ≤ 5–8%, sparkle ≤ 2%.

### Measured per-source values (all *(sampled)*, provenance in section a)

| source / state | deep | mid | aerated teal / shallow | foam white | bright-foam coverage |
|---|---|---|---|---|---|
| Canonical S (target) | `#112939` | `#1f4d68` | `#487b94` | `#d1dce0` (+veil `#82a0af`) | 8.4% (strip incl. surf) |
| Canonical C7 heavy storm | `#122830` | `#2c4e5a` | — | `#d4d4d2` (+veil `#93a0a4`) | 18.6% (surf strip) |
| Anno 1800 tropical calm | `#143954` | `#2b515e` | `#5ea3bb`→`#62b7e0` | `#ded8ca` | 0.05% |
| Anno 1800 Enbesa harbor | `#1c2a33` | `#233a4c` | — | `#f5edda` (veil `#90938a`) | ~3.7% (busy band) |
| Sea of Thieves day, rough | `#21474d` | `#486368` | `#1b4d54`–`#5e7876` | `#d4dcd8` | 8.5% |
| Wind Waker (in-game sea) | `#0861de` (flat) | — | `#6bb4c5` (promo shallows) | `#deebf4` edge `#bdf5ff` | ~5% (calm, decorative) |
| Civ VI (dusk still) | — | `#4c597b` | shore band `#7d8ba9` | sparkle `#c1c9e2` | — |
| Northgard | `#1a2631` | `#38536e` | `#79a0b5` | `#ccdacd` | — |
| Shutterstock clip 15753598 | `#0f0e19`–`#1a2635` | `#3c4d63` (mean `#2d3f50`) | — (grey: `#42586a` far) | `#bbc0c5` max | 0.9% (L>150); 15.6% dim |

Caveats: SoT day + Northgard rows from 474 px JPEG thumbnails (hue reliable, fine detail soft);
Civ VI row is a dusk-lit still — daytime Civ coast is a turquoise→navy hex-banded ramp not
captured here; SoT storm state not sampled (no clean still found) — direction from the SIGGRAPH
paper: grey-green shift, foam churn up, contrast down. Timberborn was checked but the still
found had too little open water to sample honestly; dropped.

---

## Cross-walk to the physics notes

The two documents agree and divide cleanly: `wave-physics-notes.md` fixes the *statistics*
(where/when/how much white: R1–R8); this brief fixes the *rendering of each white pixel and
every colored one* (D1–D8). The one deliberate conflict: D6 permits the persistent VEIL channel
to overshoot the physical W_B budget by up to ~2× at the heavy state for map-scale legibility —
bright-core (W_A-like) rarity stays physical. If a QA metric is added per R1, measure the two
channels separately and hold only the bright core to the physics numbers.
