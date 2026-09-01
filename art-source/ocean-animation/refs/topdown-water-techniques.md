# Top-down water techniques — how production games avoid corduroy sea and cloud foam

STATUS: complete (2026-08-31)

HEADLINE: the renderer already contains a correct short-crested wave field (`addSpread`,
`uSpread` = 19-38 deg) and the tonal term `hForm` bypasses it, rebuilding a zero-angular-
bandwidth cosine from the scalar phase `SP`. Corduroy is the exact predicted output of that
model, which is why coherence 0.452 is reproducible to +/-0.001. Separately, a blurred +
advected + noise-modulated + thresholded scalar field is, verbatim, Sea of Thieves' CLOUD
recipe; what stops SoT's foam from being cloud is an artist-authored texture supplying
structure the mask does not have. Details in (b) and (c).

Research target: a near-plan-view painted-map ocean in a top-down GLSL renderer.
Current failure: tone comes from a single cosine of ONE eikonal-solved swell phase field,
plus in-shader secondary + chop plane waves; foam is an advected simulated field,
thresholded and drawn. At the review camera (1666x937): band energy 26.2,
directional coherence 0.452 (reproducible to +/-0.001 across wave phase).
Cloud-like pixels ~1% of water. Water pass budget ~13 ms of a ~33 ms frame.

Prereqs already covered elsewhere (do not repeat): `wave-physics-notes.md`,
`stylized-water-brief.md`.

---

## (a) Per-source notes

### 1. Red Dead Redemption 2 — RAGE water

**Honest headline: there is no public technical account of RDR2's water.** I looked for one
properly and it does not exist. Recording the negative result so nobody spends a second
session hunting it.

What I checked and what it actually says:

- **SIGGRAPH 2019, Advances in Real-Time Rendering** — Rockstar *did* present on RDR2, but
  the talk is Fabian Bauer, "Creating the Atmospheric World of Red Dead Redemption 2: A
  Complete and Integrated Solution" — **sky, cloud, fog, volumetrics, ambient lighting. No
  water.** Verified against the course index:
  https://advances.realtimerendering.com/s2019/index.htm
  (Note for §(c): the one thing Rockstar published about RDR2 is a *cloud* renderer.)
- **imgeself, "Graphics Study: Red Dead Redemption 2"** (RenderDoc teardown), the most
  thorough public frame analysis:
  https://imgeself.github.io/posts/2020-06-19-graphics-study-rdr2/
  Verbatim: *"I won't be covering water rendering in this post because it deserves a special
  blog post."* The follow-up post was never published. The article's **only** water
  statement is: *"Water reflections use screen space reflections combined with the
  environment map that generated at the beginning of the frame."*
- **Digital Foundry** covered RDR2 PC extensively ("Every Setting Explained") but at the
  settings level — Water Refraction Quality / Water Reflection Quality / Water Physics
  Quality as separate sliders with large frame-time cost. This tells you Rockstar spends a
  lot on water and splits refraction, reflection and simulation into separate budgets; it
  tells you nothing about the wave model.
- Everything else returned by search on "RAGE water" is SEO content about GTA VI, including
  claims that RAGE integrates NVIDIA WaveWorks. **UNVERIFIED and probably fabricated** —
  the sources are content-farm blogs (tekingame.com, gta6index.com) with no primary
  citation, restating each other. Do not build on it.

**What can be said with confidence, and it is still useful.**

RDR2's water is overwhelmingly *rivers, lakes, shallows and shorelines* seen from a low,
near-horizontal camera. Its celebrated read comes from (i) reflection dominating tone at
grazing angles, (ii) contact/shoreline foam and flow around obstacles, (iii) refraction and
visible bottom in shallows. **None of those three transfers to a plan-view map camera:**
at near-normal incidence Fresnel reflectance of water is ~2%, so a top-down ocean has
almost no reflection to vary its tone with; there is no grazing-angle compression to
smear the wave field; and offshore there is no bottom to see. This is the structural reason
RDR2 is the *least* transferable of the named sources despite being the best-looking, and
it is worth saying out loud: **the thing carrying RDR2's water is a term this renderer
physically does not have access to.** The corollary matters for §(b) — with reflection off
the table, plan-view tone must be carried by body colour, subsurface path length, foam, and
sparkle, which is exactly the Anno/Wind Waker budget split, not the RDR2 one.

STATUS of this source: exhausted. Do not re-research.

### 2. Sea of Thieves — SIGGRAPH 2018 (read in full, verbatim)

Source: Ang, Catling, Cifariello Ciardi, Kozin, "The Technical Art of Sea of Thieves",
SIGGRAPH '18 Talks, 2 pages. PDF:
https://history.siggraph.org/wp-content/uploads/2022/09/2018-Talks-Ang_The-Technical-Art-of-Sea-of-Thieves.pdf
DOI page: https://dl.acm.org/doi/10.1145/3214745.3214820

The whole ocean section is ~5 paragraphs. Extracted verbatim, because paraphrases of this
talk circulating online add specifics the paper does not contain.

**Ocean base.** "The underlying ocean water simulation is an implementation of the FFT
technique described in [Tessendorf 2001]."

**Colour.** "We blend between a deep water colour and a sub-surface water colour based on a
combination of view angle, sun direction and a wave peak mask. The wave peak mask is
generated from the FFT choppiness vertex offsets. Where the choppiness offset is greater,
this corresponds to wave peaks, which show more sub-surface due to shorter distance
traveled by light through the water."

**Foam.** "Foam is generated at wave peaks using the method described in the reference
paper. It is also added around objects that intersect the water surface within a **camera
centered window** using depth buffer comparisons. We **progressively blur the result of
the foam buffer with feedback** to simulate the foam dispersing and to give us a **softer
mask**, more in keeping with the style of the game. The resulting mask is **blended with
artist-authored textures** to give a more stylized appearance to the foam."

**Sea state.** "Foam generation, dispersion and blending with the artist-authored textures
is modified based on whether the water is **calm, normal or stormy**. Stormy water will
have more foam to give the impression of the churn created by the more violent waves,
whereas calm water will only show foam generation around intersecting objects."

**Specular / underwater.** Area specular via closest-point-on-sphere (Karis 2013) for a big
low-sun reflection; Snell's window when viewed from below.

**Shallow water** (decks, waterfalls, streams) is a *separate* system: GPU surface fluid sim
after Mei et al. 2007, plus depth-buffer projection from the camera into the sim's texture
space so characters occlude/interact.

#### The single most important finding in this document, and it is in this paper

The talk describes SoT's **cloud** system three paragraphs after the foam system, and the
cloud recipe is *almost exactly* what a thresholded, blurred, advected foam field is:

> "The image is then downsampled to a quarter resolution, where the RGB channels undergo a
> Gaussian blur... We sample a distortion map texture to give the clouds a fluffy
> appearance and we blend between low-frequency and high-frequency noise to further give
> the impression of depth... **For very distant clouds we apply an alpha threshold to
> sharpen their edges to give them a more distinct and cartoon-like appearance compared to
> the softer clouds directly overhead.**"

So, from one source, both halves of the diagnosis:
- **Blur-with-feedback + noise blend = the authored recipe for CLOUD.** Rare uses it
  deliberately to make clouds. If your foam pass is a blurred, advected, noise-modulated
  scalar field, you have literally built Rare's cloud shader and pointed it downward.
- **What stops SoT's foam from reading as cloud is the last clause of the foam paragraph:**
  the soft mask is a *WHERE*, and it is multiplied by **artist-authored foam textures**
  that supply the *WHAT*. The renderer here has the soft mask and no authored texture.
- And Rare's own fix for cloud-mush at distance is **alpha thresholding to sharpen edges**
  — i.e. when a soft blob must read as a definite object at small screen size, you harden
  the alpha edge. A top-down map camera is the "very distant" case for every foam patch on
  screen.

#### What the paper does NOT say (do not let secondary sources tell you otherwise)

UNVERIFIED / absent from the paper: number of FFT cascades, FFT resolution, tile size in
world units, wind/direction spreading model, any anti-tiling scheme, foam texture scale or
scroll speed, any performance figure, any LOD scheme, any Gerstner shore waves. The talk
is 2 pages and contains none of it. Community "SoT-style" tutorials (Tardif, 80.lv, Godot
ports) invent their own numbers; those numbers are *their* numbers, not Rare's.

One relevant negative inference: because the base is Tessendorf FFT, SoT's ocean is
short-crested by construction (see §5.1) — Rare never had the corduroy problem to solve,
which is why the paper never mentions it.

### 3. Assassin's Creed III / IV: Black Flag (Ubisoft AnvilNext)

Best public account is fxguide's technical feature on AC3, which quotes Ubisoft's senior
technical director Georges Torres directly and is far more specific than anything written
about AC4:
https://www.fxguide.com/fxfeatured/assassins-creed-iii-the-tech-behind-or-beneath-the-action/
AC4 follow-up (thinner):
https://www.fxguide.com/fxfeatured/5-things-you-need-to-know-about-the-tech-of-assassins-creed-iv-black-flag/
The GDC talk "Assassin's Creed IV: Black Flag — Road to Next-Gen Graphics"
(https://www.gdcvault.com/play/1020397/Assassin-s-Creed-IV-Black) is mostly volumetric fog
and general rendering, not ocean. A gamedev.net thread claiming to link an AC4 ocean talk
returns HTTP 403 — UNVERIFIED, could not open it.

**Wave base — verbatim:** *"The team precomputed two sets of tiling and cycling wave
displacements. These were stored as rgb textures. The water textures were projected from
the camera position, thus distant waves are smaller and closer waves larger."*
Method is Tessendorf-style statistical Fourier synthesis, baked offline to a *looping*
RGB displacement texture set. Two sets — low and high frequency.

**This quote contains the structural insight of the whole document.** AC3's tile repeats
constantly; the tiling is invisible because the texture is **projected from the camera**,
so the same world-space tile lands on screen at a continuously varying pixel size — huge in
the foreground, sub-pixel at the horizon. A perspective sea camera destroys periodicity for
free, through the projective gradient. **A near-plan-view map camera has no projective
gradient at all**: one world tile maps to one constant screen size everywhere, every
repeat is presented at identical scale and identical orientation, and every periodicity in
the field is therefore rendered at full contrast across the entire frame simultaneously.
That is why AC3/SoT/RDR2 never needed an anti-corduroy technique and this renderer does.
The corduroy is not a bug that production solved and we missed; it is a defect the
production camera hides and the map camera cannot.

**Beaufort system — verbatim:** *"For each level, just as the real National Weather Service
does, Ubisoft Singapore defined a set of wave settings: – surface scale – height scale –
choppyness – foam decay"*, interpolated between authored keys (0, 3, 7, 12). Note the
parameter list: four numbers, and one of them is **foam decay** — the sea state directly
drives foam lifetime, matching the existing `uTauFresh`/`uTauPersist` design.

**Foam — verbatim, and this is the actionable one:** *"As the foam is white, three grey
scale maps were placed in each of the R, G and B channels and then a color ramp would
define the mix between the three course, sparse and medium foam maps."* Plus: *"To modulate
the foam an artist needs to only color correct the ramp."*
So AC3's foam is **three authored greyscale foam morphologies** (coarse / sparse / medium)
packed into one RGB texture, mixed by an artist-editable colour ramp. It is not a scalar
field with a threshold. The simulation and the depth tests decide *where*; a ramp over
three drawn textures decides *what it looks like*, and the sea state slides the ramp.

**Coastal foam — verbatim:** *"The resolution is typically 512×512 for the 4km x 4km maps,
this gives a precision of 8 meters roughly."* and *"The team applied a series of image
Gaussian blurs and Perlin noise to expand the foam level."* Coastal foam is an offline
bake from terrain topology, deliberately coarse (8 m/texel) and softened by blur+noise.

**LOD — verbatim:** *"We use two shaders with different LOD 0 transparent – the complete
shader with refraction was costly and was only used in shallow water... The LOD 1 or opaque
version was a simplified water without refraction and transparency."* — blended at roughly
400 m. Two shaders, hard split shallow/deep, no visible pop.

**Wave direction — verbatim, and it is a licence:** *"The only major break from reality is
that the wind direction did not directly drive the waves, since the wind direction needed
to be controlled for game design."* Ubisoft explicitly decoupled wave direction from wind
because gameplay needed control. Precedent for decoupling this renderer's chop/secondary
directions from the primary swell direction for compositional reasons.

**AC4 additions** (fxguide, less specific): support extended to *all* Beaufort levels
rather than only the ones AC3's missions needed; *"a third layer of small waves to bring
out more details"*; better foam shading; ocean made systemic but designer-controllable;
new tech for Caribbean lagoons and *"continuity between different depths of water"*.
The relevant number is **three wave layers** at AC4, up from two at AC3.

**Tiling artefacts:** the AC3 article contains **no discussion whatsoever** of repetition,
tiling artefacts, or concealing the texture repeat. ABSENT, not omitted by me.

**Skull and Bones:** searched, found no published technical talk on its water. UNVERIFIED —
treat any second-hand claim about its ocean tech as unsourced.

### 4. The top-down case — Anno 1800, Cities: Skylines, Civ VI, Tropico

#### Anno 1800 — the only top-down ocean with a real public teardown

Thomas Poulet's frame analysis: https://blog.thomaspoulet.fr/posts/anno-1800-frame-analysis/
(engine devblog: https://www.anno-union.com/devblog-the-anno-engine/)

Verbatim from the analysis:
- FFT ocean on async compute: *"generates the large-wave displacement map and its mipmaps,
  as well as the large-wave surface-gradient map and its mipmaps"* — **512×512**.
- Small waves also **512×512**; *"the small-wave displacement maps are compressed in BC6 and
  split into `XZ` and `Y` components, likely for efficient packing and precision."*
- Shoreline: *"rendered into two 2048×2048 textures containing a displacement plus a
  divergence/foam/pressure-like term, and a separate motion (velocity) map, which is sampled
  during water shading for detail."*
- Water is drawn in the transparent pass; sea is stencil-classified `0x04`.

**The budget ratio is the finding.** Anno gives the *entire open ocean* two 512² maps, and
gives the water *around one island* three 2048² maps — 16× the texels for a tiny fraction of
the area, plus a velocity field used "for detail" during shading. Combined with the measured
fact in `stylized-water-brief.md` that Anno's calm open harbour is **0.05% bright pixels**
and reads as almost pure colour: **Anno's answer to top-down open water is to under-resolve
it deliberately and put every interesting graphic at the coast.** A quiet, low-contrast,
low-detail open sea is not a compromise in this genre, it is the intended composition. If
the open sea is busy enough to have a legible weave, it is already too busy.

Note also: the shoreline sim outputs a **velocity map sampled during shading**. That is the
one place Anno has a direction field, and it is used at the coast, where direction means
something.

#### Cities: Skylines II — Unity HDRP water, and the incommensurate-band trick

CS2's water is a modified Unity HDRP water system. HDRP's own docs are the citable part:
https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.1/manual/water-water-system-simulation.html

- *"A Simulation Band is a specific range of wave frequencies."* HDRP supports **up to three
  bands** (swell, agitation, ripples). River = 2 bands, Pool = 1.
- *"The Patch is the size of the area on which Unity runs the simulation for a particular
  Simulation Band."* Each band has its **own patch size**; displacements are summed and
  **smaller bands are tiled**.
- Local wind → Ripples; distant wind → Swell/Agitation.

**Mechanism worth stealing: incommensurate periods.** Three bands whose patch sizes are not
integer multiples of each other sum to a field whose visible repeat is the least common
multiple of the three, i.e. effectively never within a screen. This is the cheapest
anti-repetition device in the industry and it costs nothing but choosing ugly numbers
(e.g. 500 m / 173 m / 61 m rather than 512 / 128 / 32). It attacks *periodicity*; it does
**not** attack *directionality*, which is why adding a second train at a different scale
(failure #3) improved the striping metric while leaving the sea looking uniform — the metric
was measuring the period, and the eye was seeing the direction.

Crest Ocean System (Bowles, SIGGRAPH 2019 Advances; https://crest.readthedocs.io/) does the
same thing as an LOD cascade: *"Each wave component is rendered into the shape LOD that is
appropriate for the wavelength, to prevent over- or under-sampling"*, LODs *"the same
resolution (256x256 here)"* at *"a different power of 2 scale"*, largest covering ~4 km,
then a combine pass from largest to most detailed. Crest is also the production system that
**exposes directional spread as a first-class artist control**: `Wave Direction Variance`
(range **0-180 degrees**, controlling *"how aligned the waves are to the wind direction"*),
renamed `Wind Turbulence` on the `ShapeFFT` component in current versions — *"There is also
control over how aligned waves are to the wind direction."* A shipped ocean system considers
"how aligned are the waves" a knob the artist must have. This renderer has that knob welded
at zero.

#### Civilization VI, Tropico — no published technology

Searched; there is no technical paper, GDC talk or frame analysis for either game's water.
Anything stated about them is observational only. **UNVERIFIED.** What the measurements in
`stylized-water-brief.md` already establish (Civ VI dusk `#4c597b` mid / `#7d8ba9` shore band
/ `#c1c9e2` sparkle; Northgard's 3-band ramp) is the honest extent of it: these are "board"
oceans — a depth ramp keyed to distance-from-coast, a desaturated shore band, thin white
shore arcs, in-place sparkle, **and no translating swell structure at all**.

#### What all four have in common, and it is the important part

Every successful near-plan-view ocean in shipping games solves the corduroy problem by
**not drawing a wave field in the open sea at all.** Anno under-resolves it; Civ and
Northgard omit it; CS2 inherits HDRP but shows it at a scale where bands blur together. The
detail budget goes to the coast, where foam has a *reason* (bathymetry) and therefore a
non-uniform, land-shaped distribution that can never read as fabric.

This is the strategic option that the five failed attempts never tried: all five added
*more* to the open sea. The genre's own answer is to take away.

### 5. The technique literature — where the actual fixes are

#### 5.1 Tessendorf FFT and DIRECTIONAL SPREADING — the root-cause source

Tessendorf, "Simulating Ocean Water", SIGGRAPH course notes 2001 — the base of SoT, AC3,
Crest, and essentially every production ocean.

The reason an FFT ocean never corduroys is not the FFT. It is that the FFT synthesises a
**two-dimensional** spectrum `S(k) = S(|k|) · D(θ)`, i.e. every wavenumber carries a *fan*
of directions, not one. The directional part is standard Longuet-Higgins et al. (1963)
cos-2s spreading:

    D(θ) ∝ cos^{2s}( (θ − θ_wind) / 2 )

Spreading parameter s, from the USACE CETN-I-28 note
(https://apps.dtic.mil/sti/tr/pdf/ADA591687.pdf) and the ScienceDirect "Directional
Spreading" overview
(https://www.sciencedirect.com/topics/engineering/directional-spreading):
**s ≈ 10 for wind sea, up to s ≈ 70 for long ocean swell**; "a large factor s reflects a
narrow direction spectrum, whereas a low factor s indicates a widely spread spectrum";
spread is strongly frequency-dependent with **minimum spread (maximum s) at the peak
frequency** and broader spread away from the peak. Formulations: constant s, Mitsuyasu
et al. (1975), Hasselmann et al. (1980).

Standard conversion (Longuet-Higgins): rms angular spread `σ_θ ≈ sqrt(2/(s+1))` rad.
- s = 10 (wind sea) → σ_θ ≈ 0.43 rad ≈ **24°**
- s = 70 (swell)    → σ_θ ≈ 0.17 rad ≈ **10°**

**Consequence — the number that names this renderer's defect.** Superposing components over
an angular fan of rms width σ_θ makes the crest a wavepacket in the along-crest direction
too. Writing the field near the mean direction as ∫dθ A(θ) exp(i k(x cosθ + y sinθ)) ≈
exp(ikx) ∫dθ A(θ) exp(i k y θ), the along-crest envelope is the Fourier transform of the
angular distribution, so it decorrelates at `ℓ_crest ≈ 1/(k σ_θ) = λ / (2π σ_θ)`:

| sea | s | σ_θ | along-crest coherence ℓ | visible crest segment |
|---|---|---|---|---|
| wind sea | 10 | 24° | ≈ 0.37 λ | ~1-2 λ |
| mixed | 30 | 14° | ≈ 0.64 λ | ~2-3 λ |
| clean swell | 70 | 10° | ≈ 0.95 λ | ~3-5 λ |

(The σ_θ formula is the standard cos-2s relation; the ℓ = λ/(2πσ_θ) step is my derivation
from the narrow-angle expansion above, not a quoted figure — flagged as such.)

**Real ocean crests are 1-5 wavelengths long. This renderer's crests are infinitely long,**
because tone is a single cosine of a single scalar phase field: one direction per point,
zero angular bandwidth, `σ_θ = 0`, `ℓ_crest = ∞`. Directional coherence 0.452 is not a
tuning problem, it is the exact predicted output of a zero-bandwidth directional spectrum.
Every one of the five failed attempts changed *what is added on top* while leaving the
angular bandwidth at zero. That is why coherence is reproducible to ±0.001: it is a
structural constant of the model, not a statistic of a random field.

Also note the frequency dependence: spread is *narrowest at the peak*. So the correct look
is a fairly coherent long swell **carrying broadly-spread short waves**, not a uniformly
smeared everything. This matches R5 in `wave-physics-notes.md` from the opposite direction.

#### 5.2 Valve / Portal 2 flow maps — Vlachos, SIGGRAPH 2010

Alex Vlachos, "Water Flow in Portal 2", SIGGRAPH 2010 Advances in Real-Time Rendering.
The advances.realtimerendering.com direct PDF link 404s now; a mirror of the slides is at
https://www.scribd.com/document/48121532/siggraph2010-vlachos-waterflow . The clearest
worked implementation (with the full math, and the one I extracted formulas from) is
Catlike Coding's Flow series: https://catlikecoding.com/unity/tutorials/flow/texture-distortion/

The mechanism, verbatim from Catlike:
- distortion: `uv_distorted = uv - flowVector * progress`, `progress = frac(time)`
- **two phases at 0.5 offset**: phase A `progress = frac(time)`, phase B `frac(time + 0.5)`
- **triangle blend weight**: *"The simplest function that matches these criteria is a
  triangle wave, `w(p) = 1 - |1 - 2p|`."* Weights sum to 1, so the phase reset is hidden.
- **flow-map jump** to stop the two phases from being a fixed pair:
  `uvw.xy += (time - progress) * jump`
- **per-pixel time offset to desynchronise the reset**: *"Sample the noise and add it to the
  time before passing it to FlowUVW"*, `time = _Time.y + noise`, noise from the flow map's
  alpha channel — *"spreading the phase transition organically"*.
- derivative maps combine as `normal = normalize(float3(-(dhA.xy + dhB.xy), 1))`

Cost: 2 samples per layer (the two phases) + 1 flow-map sample.

Why it matters here: this is the canonical production answer to *"an animated texture that
must not show its period"*, and its three ingredients — **two phases, triangle crossfade,
per-pixel time jitter** — are precisely the ingredients missing from the failed attempt #1
(hard union of two trains → pixel flicker: no crossfade) and #2 (soft-max → uniform mush:
crossfade but no per-pixel phase jitter, so every pixel resets together and the sea
breathes as one).

#### 5.3 Catlike Coding "Directional Flow" — a grid of independently-rotated tiles

https://catlikecoding.com/unity/tutorials/flow/directional-flow/
The surface is split into a tile grid; **each tile samples flow at its centre and rotates
its UVs so the ripple pattern aligns with that tile's flow**: rotation matrix `[[y, x],
[-x, y]]` from the normalised flow vector, with derivatives rotated by the same matrix
(*"When the surface rotates, so should its curvature"*). Verbatim: *"Each tile has a
uniform flow, so won't suffer from any distortion."*
Four cells blended per pixel with separable triangle weights:

    t  = abs(2 * frac(uv * GridResolution) - 1)
    wA = (1-t.x)*(1-t.y);  wB = t.x*(1-t.y);  wC = (1-t.x)*t.y;  wD = t.x*t.y

Grid visible in speculars → **dual grid offset by a quarter tile**: *"If we offset the
second grid by a quarter tile, then its sharpest regions correspond to the other grid's
blurriest areas, and vice versa."*
**Cost: 4 texture samples/pixel single grid, 8 with dual grid**, plus flow samples.

This is a directly usable "many directions without plaid" construction: the field carries
many local orientations, but only ONE orientation is present at any given point, blended
with partition-of-unity weights. Two superposed trains at equal amplitude give plaid
(failure #4) because both are present *everywhere*; a tile grid gives orientation variety
because each is present *somewhere*.

#### 5.4 Heitz & Neyret stochastic tiling / Mikkelsen hex-tiling — the strongest single tool

- Heitz & Neyret, "High-Performance By-Example Noise using a Histogram-Preserving Blending
  Operator", HPG 2018. https://eheitzresearch.wordpress.com/722-2/ ,
  https://dl.acm.org/doi/10.1145/3233304 ; demos:
  https://unity-grenoble.github.io/website/demo/2020/10/16/demo-histogram-preserving-blend-synthesis.html
- Mikkelsen, "Practical Real-Time Hex-Tiling", JCGT 11(2), 2022 —
  https://jcgt.org/published/0011/03/05/paper-lowres.pdf (read in full)

Construction, verbatim from Mikkelsen: texture space is structured *"on an equilateral-
triangle lattice also famously used in simplex noise by Perlin"*; *"Each vertex in the grid
represents the center of a hexagonal shape, which we refer to as a hex tile... Each such
tile is assigned a random offset when the source texture is sampled. During synthesis the
sampling location represents a barycentric coordinate within a triangle of the lattice.
This coordinate is then used to blend between the three corresponding hex tiles."**Three
samples per pixel.**

Naive blending of the three destroys contrast, which is the *entire* reason a stochastic
tile looks like grey mush — the same mechanism that turned failure #2 into "grey blobs".
Heitz & Neyret fix it with a histogram transform (two extra textures + precompute).
Mikkelsen's cheaper fix, usable inline in any shader:

    ω'_i = δ(x_i) · ω_i^γ  /  Σ_j δ(x_j) · ω_j^γ            (Eq. 1)

with `γ = 7` and, for colour, a luminance-driven `δ_C(x) = (1-β) + β·(0.299,0.587,0.114)·x`,
`β = 0.6` (Eq. 4); plus Perlin's S-curve on the weights before blending,
`g(x) = ½(2x)^k for x<0.5, else 1 - ½(2-2x)^k`, with `k = log_{1/2}(1-r)` and a recommended
**r ∈ [0.65, 0.75]** — *"a compromise between preserving contrast and not making the
hexagonal boundaries noticeable."*
For normal/derivative maps δ_N uses slope steepness, `δ_N(x) = (1-β) + β·sqrt(‖x‖²/(1+‖x‖²))`
(Eq. 3), and blending derivatives is exact because *"The derivative is a linear operator."*
Requires `SampleGrad()` because of the random per-tile offset.

**The clause that matters most to the corduroy problem**, verbatim:
> *"To allow for further flexibility, we have added support for randomized rotation of hex
> tiles. As a note, this feature is only possible with normal maps when histogram
> preservation is disabled. The reason for this is that normals/derivatives represent
> directional data. Thus, when rotating the hex tiles individually, we must rotate each
> sample with respect to its hex tile prior to blending."*
and, on why you want it:
> *"This is a particularly useful feature when there are recognizable elements in the sample
> texture with a distinct orientation. In the middle image where randomized rotation is
> disabled, we see the same pebble appearing at different locations but always with the same
> alignment. In the top image randomized rotation is applied, which alleviates the issue."*

A wave train IS *"a recognizable element with a distinct orientation"*. Per-hex **bounded**
rotation jitter (±σ_θ rather than ±180°) is a discrete stochastic implementation of
directional spreading, with the contrast-preservation problem already solved and published
with tuned constants. This is the single highest-value import in the document.

#### 5.5 Yuksel, Keyser & House — Wave Particles (SIGGRAPH 2007)

https://www.cemyuksel.com/research/waveparticles/ (paper PDF at
https://www.cemyuksel.com/research/waveparticles/waveparticles.pdf)
Waves are represented as a set of *localised particles* each contributing a smooth,
finite-support bump to the height field, propagated and subdivided as they spread; the page
reports GPU timings of 170 fps / 4.8 fps / ~1 fps for its test cases. Detailed shape
function, particle counts and subdivision rules are in the paper — **UNVERIFIED here**, I
did not extract the PDF.

The transferable idea, not the implementation: a wave field made of a *countable number of
discrete, finite-extent events* cannot be periodic and cannot be infinitely long-crested,
because each element has a beginning and an end. It is the formal version of Steve's
standing "few drawn events" direction, and the opposite pole from "one global cosine".

---

## (b) Ranked techniques to break directional uniformity in THIS renderer

### The diagnosis, from reading the shader against the sources

I read `src/shaders/wave.frag` to make these sketches concrete, and found something that
changes the ranking completely.

**The renderer already contains a correct short-crested wave field, and the tonal term
throws it away.**

`addSpread()` (wave.frag:75) builds each component with a genuine wavevector rotation:

    th = S*m*cs + k0*m*sn*dot(px, perpD) + dirBend*m + jitterPhase - w*uTime
    kd = normalize(dir*(kmag*m*cs) + perpD*(k0*m*sn))

and the primary swell is assembled from three such components at `0.00*sp`, `-0.62*sp`,
`+0.72*sp` with `sp = uSpread` — which presets.py ships at **19° / 27° / 38°** across the
sea states. Its own comment states the intent exactly: *"Narrow in SCALE ... but spread in
DIRECTION, which is what breaks crests into finite lengths instead of edge-to-edge bands."*
That is textbook cos-2s directional spreading (§5.1), with correct values, already shipping.
It lands in `acc.h` → `outGeom.x`.

The tone does not use it. At wave.frag:663:

    float hForm = (cos(SP + bend - wF*uTime)
                 + aL*cos(SP*uHarmL + bend*0.55 - wLF*uTime + 1.3)
                 + a3*cos(SP*mF3  + bend*1.7  - wF3*uTime + 2.6)) / (1.0 + aL + a3);

Three cosines, all harmonics of the **same scalar phase field `SP`**, therefore all with
**exactly parallel level sets**, multiplied by `formEnv` (amplitude only — an envelope can
change contrast, never spacing or orientation). The shader says so itself: *"its level sets
are exactly one wavelength apart, everywhere, and the envelope can only change their
CONTRAST, never their spacing. That is the corduroy."* It is emitted as `outFlow.z` and it
is the term the picture and the coherence metric are made of.

So the angular bandwidth of the *rendered tone* is exactly zero, `σ_θ = 0`, and by §5.1
the along-crest coherence length is infinite. **Directional coherence 0.452 reproducible to
±0.001 is not a noisy statistic — it is a structural constant of a zero-bandwidth model**,
which is precisely why no amount of adding things on top has moved it.

This also explains failure #4 exactly. `hFormB = cos(SS + bend*0.6 - wS0*uTime)` is a
*second* train, and the shader's own comment puts it *"40 degrees apart"* from the primary.
Two comparable-amplitude trains 40° apart is not directional spreading — it is a **crossed
sea**, and a crossed sea's interference pattern is a 2-D lattice. Plaid was the correct and
predictable output. Spreading needs **many components inside a narrow fan**, not two across
a wide angle. That distinction is the whole of Longuet-Higgins cos-2s.

---

### B1. Give the tonal term the angular bandwidth the height field already has
**Impact: very high. Effort: very low. Cost: ~0 texture fetches, ~25-40 ALU.**
Source: Tessendorf 2001 / Longuet-Higgins cos-2s (§5.1); corroborated by Crest exposing
`Wave Direction Variance` 0-180° / `Wind Turbulence` as a shipped artist control (§4).

Rebuild `hForm`'s fundamental as a spread fan using the *same* lateral construction
`addSpread` already uses, rather than a single cosine:

    // fan of N components about the primary direction, NARROW IN SCALE, SPREAD IN ANGLE
    // weights from cos^{2s}(dl/2), normalised
    float hForm = 0.0, wsum = 0.0;
    for (i in {-2,-1,0,1,2}) {
        float dl = radians(uSpread * di[i]);      // di = {-1.0,-0.55,0.0,0.62,1.0}, jittered
        float cs = cos(dl), sn = sin(dl);
        float th = SP*cs + k0P*sn*dot(px, perpP) + bend*bw[i] + ph[i] - wF*uTime;
        float wt = pow(cos(dl*0.5), 2.0*sExp);    // sExp ~ 8-16
        hForm += wt*cos(th); wsum += wt;
    }
    hForm /= wsum;

Rules that make this work rather than mottle:
- **All components at the same `m` (same wavelength).** The shader's existing negative
  result — wide scale spread → "lichen mottle" — is about *scale* bandwidth and about
  *spatially varying* phase perturbation (`uDirWander`, `uDirBend`, both correctly shipped
  at 0). A **fixed per-component angular offset is a different operator**: it is a rigid
  rotation of the wavevector, it does not grow with distance from the eikonal origin, and it
  cannot decorrelate the components in the way a spatial bend does. Do not conflate the two;
  the shader's comment currently does.
- Keep `bend` weight small and equal-ish across components, or drop it here entirely — bend
  is the thing the shader proved decorrelates a sum.
- Reuse the existing `uSpread` values (19/27/38) so the tone matches the geometry, which it
  currently does not — the height field is short-crested and the tone drawn over it is not.
- **Then turn `uCrossForm` down or off.** With a proper fan, the 40°-apart second train is
  no longer doing anything the fan does not do better, and it is the plaid generator.

Predicted effect: the fundamental stops being a spike in the 2-D spectrum and becomes a
wedge of angular width ≈ `uSpread`; along-crest coherence becomes ≈ `λ/(2πσ_θ)` (0.4-0.9 λ),
i.e. crest segments of 1-3 λ — the measured morphology of a real sea. Directional coherence
must fall; if it does not, the metric is not measuring what its name says and *that* is the
finding.

### B2. Make the spread frequency-dependent — coherent swell, broadly-spread chop
**Impact: high. Effort: very low. Cost: 0.**
Source: §5.1, USACE CETN-I-28 / ScienceDirect: *"a strong frequency dependence of the
directional spread with a minimum spread (maximum s) occurring around the peak frequency."*

The peak is the *most* directional part of a real sea; everything away from the peak is
broader. So: primary swell keeps `uSpread` ≈ 19-27°; the **secondary and chop should get 2-3×
that**, 45-70°. This is also what R5 of `wave-physics-notes.md` asks for from the whitecap
side (short waves supply most breaking fronts, clustered by the swell's groups). It costs
nothing — a per-band multiplier on `sp` — and it converts the chop from a second set of
parallel lines (a second corduroy at a different angle, which is half of what makes plaid)
into genuine texture. This is the cheapest remaining win after B1.

### B3. Spend less on the open sea
**Impact: high. Effort: negative (it removes work). Cost: none.**
Source: Anno 1800 frame analysis (§4) — 512² for the entire ocean vs 2048²×3 for one
island's shoreline; measured 0.05% bright pixels in calm open harbour.

Every shipping top-down ocean solves this by not drawing an open-sea wave field worth
looking at. `uOpenWaveVis` already exists as exactly this control. Push tonal amplitude
offshore down and move the contrast budget to the coast, where foam is bathymetry-shaped and
therefore structurally incapable of reading as fabric. All five failed attempts added to the
open sea; the genre's answer is to subtract. Do this *alongside* B1, not instead — a quieter
sea with zero angular bandwidth is still a fabric, just a fainter one.

### B4. Incommensurate periods on every periodic term
**Impact: medium. Effort: very low. Cost: 0.**
Source: Unity HDRP water bands (§4) — up to three Simulation Bands, each with its own
**Patch** size, summed, smaller bands tiled; Crest's power-of-2 LOD cascade.

Any two scales related by a small rational ratio beat visibly. `mg2 = uGroupScale * 2.0`
(wave.frag:230) is exactly a 2:1 beat, and the shader already names it: *"TWO COSINES ARE A
BEAT, AND A BEAT IS CORDUROY."* Same for `mF3 = 1.90` and `mg2 * 1.37`. Replace integer and
near-integer ratios with irrational-ish ones (1.87, 2.61, 3.41…) and choose noise/texture
world scales that share no common factor. **Honest limitation: this attacks periodicity, not
directionality.** It is why failure #3 improved the striping metric while the picture got
busier — the metric measures the period and the eye was seeing the angle. Supporting move
only; it will not fix corduroy on its own and must not be sold as if it will.

### B5. Two-phase crossfade with per-pixel time jitter for every advected/animated layer
**Impact: medium-high for the foam pass specifically. Effort: low. Cost: 2 samples/layer.**
Source: Vlachos, "Water Flow in Portal 2", SIGGRAPH 2010; formulas via Catlike Coding (§5.2).

    progress = frac(time + phaseOffset)          // phaseOffset ∈ {0, 0.5}
    w(p)     = 1 - |1 - 2p|                      // triangle, weights sum to 1
    uvw.xy  += (time - progress) * jump          // stop the two phases being a fixed pair
    time     = uTime + noise(px)                 // per-pixel desync of the reset

The last line is the one that matters here and it is the one both failure #1 and #2 lacked.
#1 (hard union) had no crossfade at all — discontinuous choice, and every downstream term
takes a gradient of this field, so it went salt-and-pepper exactly as predicted. #2 (soft
max) had the crossfade but **every pixel transitioned on the same clock**, so the whole sea
breathed in step and read as "uniformed, just busier". Per-pixel time offset from a noise
lookup is the published fix and it is one extra fetch (or free, from a channel you already
sample).

### B6. Hex-tiling with BOUNDED rotation jitter on the detail layer
**Impact: medium-high. Effort: medium. Cost: 3 texture fetches + ~30 ALU per tiled layer.**
Source: Heitz & Neyret HPG 2018; Mikkelsen, JCGT 11(2) 2022 (§5.4) — full constants above.

Apply to the *detail/derivative* layer that perturbs tone (not to the swell itself):
3 samples on the triangle lattice, per-tile random offset, per-tile rotation, blended with

    ω'_i = δ(x_i)·ω_i^γ / Σ_j δ(x_j)·ω_j^γ,   γ = 7,  β = 0.6

then Perlin's S-curve on the weights with `r ∈ [0.65, 0.75]`, `SampleGrad` mandatory.

**Bound the rotation to ±uSpread, not ±180°.** Full random rotation is right for pebbles and
wrong for a sea: it destroys the readable swell direction, which is the thing that makes the
picture read as ocean rather than as noise. Bounded rotation *is* directional spreading,
implemented stochastically per tile, with the contrast-preservation problem already solved
and published with tuned constants — which is exactly what failure #2 was missing.

### B7. Tile-local orientation (Catlike "Directional Flow") — the fallback if B1 is not enough
**Impact: high but expensive. Effort: medium-high. Cost: 4 samples/pixel, 8 with dual grid.**
Source: §5.3.

Grid of tiles, each rotating its UVs to its own local direction, blended with separable
triangle weights `wA=(1-t.x)(1-t.y)` etc.; dual grid offset a quarter tile to hide the grid
in speculars. The principle worth internalising even if the technique is too expensive:
**one orientation present per point, many orientations present across the field.** Plaid
happens when two orientations are present *at the same point*; variety without plaid requires
them to be present at *different* points. In a 13 ms budget at 1.56 Mpx, 4-8 extra fetches is
a real bite (rough order 1-3 ms) — hold this in reserve behind B1/B2/B6.

**Cost caveat:** all timings above are order-of-magnitude estimates from fetch/ALU counts at
1666×937, not measurements. B1-B4 are effectively free (pure ALU, no fetches) and should be
tried first for that reason alone.

---

## (c) The CLOUD failure mode: why top-down foam reads as cloud

### The proof, and it comes from Sea of Thieves' own paper

Rare describes two systems in the same 2-page talk. Set them side by side.

| step | SoT **foam** | SoT **clouds** |
|---|---|---|
| source | mask from FFT peaks + depth intersect | opaque geometry rendered offscreen |
| soften | *"progressively blur the result of the foam buffer with feedback... to give us a softer mask"* | *"downsampled to a quarter resolution, where the RGB channels undergo a Gaussian blur"* |
| break up | — | *"sample a distortion map texture to give the clouds a fluffy appearance"*, *"blend between low-frequency and high-frequency noise"* |
| finish | *"blended with artist-authored textures to give a more stylized appearance"* | *"for very distant clouds we apply an alpha threshold to sharpen their edges"* |

**A blurred, advected, noise-modulated scalar field IS the cloud recipe.** It is not that
foam-built-this-way resembles cloud by accident; it is that Rare shipped this exact pipeline
and called the output clouds. If the foam pass here is "advected simulated field, thresholded
and drawn", it has the first two rows and none of the fourth, so the honest expectation is
cloud. ~1% cloud-like pixels is the pipeline working as designed.

The one thing standing between SoT's foam and SoT's clouds is the last clause of the foam
paragraph: **the soft mask supplies WHERE, and an artist-authored texture supplies WHAT.**
Every other strong source says the same in its own vocabulary:
- **AC3 (§3):** *"three grey scale maps were placed in each of the R, G and B channels and
  then a color ramp would define the mix between the three course, sparse and medium foam
  maps."* Three *drawn morphologies*, selected by a ramp. Sim decides where; drawn art
  decides what.
- **Anno (§4, and `stylized-water-brief.md`):** white reserved for meaning — wakes, surf
  bands, shore arcs — drawn as a bright thin edge plus a wider translucent veil.
- **Wind Waker:** an authored line texture sampled twice, once offset and darkened.

### Why plan view makes it worse than it would be in any other camera

Three cues that normally disambiguate foam from cloud are all absent at near-plan view:
1. **No perspective anchoring.** In a low camera, foam is visibly *clinging to* a crest whose
   silhouette you can read. Top-down there is no silhouette; a light blob on a blue field has
   no attachment, and "cloud over sea" is the reading the eye reaches for by default.
2. **No projective gradient.** Per §3, a perspective camera renders the same patch at wildly
   varying screen sizes; a map camera renders every patch at one scale, so *one* blob size
   and *one* edge softness is presented everywhere — the definition of a texture-less field.
3. **Everything is "very distant".** Rare's own rule is that soft alpha stops reading at
   small screen size and must be **thresholded to sharpen the edge**. On a map camera, every
   foam patch is in that regime, all the time.

### The four properties that make a white blob read as cloud, and the fix for each

1. **A soft alpha ramp wider than a few pixels.** `foamA = sstep(thrF, thrF+uFoamSoft,
   carved)` with a wide `uFoamSoft` is a gradient, and a gradient boundary is the single
   strongest cloud cue. **Fix:** narrow it until the crossing is a *line*, then anti-alias
   with `fwidth` so it is edge-width ~1 px at display scale, not a value ramp. `presets.py`
   already contains this move on one state (`foamSoft 0.130 -> 0.046`, commented *"so the
   threshold crossing is a line rather than..."*) — that is Rare's distant-cloud alpha
   threshold, arrived at independently, and it should be the default everywhere, not one
   state. Source: SoT talk.
2. **No internal structure.** A cloud is uniform inside; foam is lace. **Fix:** multiply by
   the lace/voronoi texture *before* the threshold, so the boundary inherits high-frequency
   structure instead of being a smooth iso-contour of a smooth field. And erode the threshold
   as `persist` decays so patches **die by growing holes**, not by fading out — decay-as-lace
   is the observed morphology (`stylized-water-brief.md` §2/D2).
3. **Isotropy.** Clouds are round. Foam is not: fresh patches elongate *along the crest*,
   residual foam rakes into wind-parallel windrows — two roughly perpendicular anisotropies
   (brief §2). **Fix:** stretch the lace lookup anisotropically, ~3:1 or more, along the
   local crest for fresh and along the flow for persist. A patch with a 3:1 aspect ratio and a
   hard edge cannot be read as a cloud whatever its size.
4. **Single value, neutral white.** **Fix:** the two-value system — a small bright core over a
   larger dim veil, veil 2-3× the core's area (`W_B > W_A`, Scanlon & Ward), and never pure
   white: cream `#f5edda` (Anno) or blue-white `#d1dce0` (canonical), capped ~L 0.85-0.88.
   `cFoamThin`/`cFoamDense`/`cFoamBody` already exist for exactly this; the risk is them
   being close enough in value that the structure disappears.

### Should foam be STROKES rather than a thresholded field?

**Partly, and the split matters.** The unanimous production answer is *field for WHERE, drawn
element for WHAT* — nobody ships either half alone. A pure stroke system throws away the
group/threshold statistics that `wave-physics-notes.md` R1-R6 carefully derived (rarity,
once-per-Tp pulsing, W_A/W_B partition), and those are the things that stop foam reading as
woven fabric. A pure field gives cloud, as shown above.

The recommended shape:
- Keep the advected field as the **density / seeding** authority. Do not discard it.
- Threshold it to produce **seeds**, not silhouettes — then draw each seed as a **finite,
  crest-aligned stroke with hard ends and a lace interior**. Yuksel's wave particles (§5.5)
  is the formal version: a field of discrete finite-support elements cannot be blobby-uniform
  because every element has a beginning and an end.
- The renderer already has the machinery — `hPath` (*"ONE cosine of the solved phase field,
  carrying only the coarse bend"*) drives crest strokes, and `src/stroke_path.py` exists.

**The trap, and it is failure #5.** Strokes become brushed metal the moment they are (a)
dense, (b) long, and (c) aligned to a globally coherent field. The `licMix` line integral was
all three simultaneously — line integral convolution is *designed* to reveal a vector field's
coherent structure, so applying it to a field with one dominant direction visualises that
dominance at maximum contrast. Strokes avoid this only if they are **rare** (bright core
≤ ~8% of open water even at storm, per D6), **short** (1-3 λ, matching the crest-segment
length from §5.1), and aligned to the **local** crest — which only becomes a varying thing
after B1. Note the dependency: **the stroke treatment is not safe until B1 has given the
crest field angular bandwidth.** Do B1 first.

---

## (d) What NOT to try — the five failures, and what the literature says about each

Every one of the five was a reasonable move. Four of them have a named failure mechanism in
the sources, and two have a *published fix* that was simply missing. Recording that so they
are not re-attempted blind, and not written off where they were nearly right.

### 1. Second tonal train, HARD union → pixel flicker
**Why it failed:** `(|B|>|A|) ? B : A` is discontinuous in the *choice*, and the shader
notes correctly that every downstream term takes a gradient or a contour of this field.
**Source:** Vlachos/Catlike (§5.2) — the entire flow-map construction exists because an
animated field's transitions must be a **continuous crossfade with weights summing to 1**
(`w(p) = 1 - |1 - 2p|`). Hard selection between animated layers is a known non-starter.
**Do not retry.** There is no kernel or threshold that rescues a discontinuous selector.

### 2. Same, SOFT-max → "still uniformed just busier", grey blobs returned
**This one was closest, and it failed for a documented, fixable reason.** Heitz & Neyret's
central result is that **linearly blending samples of a stochastic field destroys contrast
and introduces transitional values not present in either input** — that is literally the
grey blobs, and it is the reason they invented histogram-preserving blending in the first
place. Mikkelsen (§5.4) reports the same and gives the cheap fix: **exponentiate the blend
weights (γ = 7), modulate by a per-sample metric δ, and push through an S-curve with
r ∈ [0.65, 0.75]** so the blend behaves like a mask rather than an average.
**Also missing:** per-pixel time desynchronisation (§5.2, `time = uTime + noise`). Without
it every pixel crossfades on one clock and the sea breathes in step — "uniformed, just
busier" is the exact symptom.
**Verdict: do not retry as-is; the soft-max with a contrast-preserving weight operator is a
different experiment and is worth one shot (B6).** Retrying the plain soft-max is not.

### 3. Coarse phase bend on the single train → striping metric improved, picture busier
**Why:** a phase bend changes crest *spacing statistics* while leaving angular bandwidth at
zero, so it moves a metric that measures period and cannot move the thing the eye sees. The
shader's own ablation already documents the cost: *"ANY spatial phase perturbation applied
across many components decorrelates them from each other, and the sum of decorrelated trains
is interference"* — `uDirWander` at 9° put 62% of height variance below 8 px vs 31% at 0°.
`uDirWander` and `uDirBend` are correctly shipped at 0.
**Do not retry.** And note the standing lesson (metrics are not targets): the striping metric
improving while the picture worsened is the metric being wrong for the job, not the change
being subtly right.
**Important distinction that must not be lost:** this negative result is about a *spatially
varying* phase perturbation. B1's fixed per-component angular offsets are a **rigid wavevector
rotation**, do not grow with distance from the eikonal origin, and do not decorrelate the
components. They are not the same operator and this result does not forbid them — `addSpread`
already runs them successfully on the height field at 19-38°.

### 4. Secondary train raised near primary amplitude → literal plaid
**Why:** the two trains are ~40° apart (per the shader's own comment). Two comparable-amplitude
trains at a large angle is a **crossed sea**, and its interference pattern is a 2-D lattice.
Plaid was the correct output of the model.
**Source:** Longuet-Higgins cos-2s spreading (§5.1). Directional variety means **many
components inside a narrow fan (σ_θ ≈ 10-25°) with cos-2s amplitude weights**, not two
components across a wide one. The relationship is not monotonic: adding a *third*, *fourth*,
*fifth* component inside the fan makes it better; adding a second at 40° makes it plaid.
**Do not retry by adjusting the second train's amplitude or angle.** With B1 in place,
turn `uCrossForm` down or off — it is the plaid generator and the fan supersedes it.

### 5. Flow-aligned line integral (`licMix`) → brushed metal
**Why:** LIC is an *scientific visualisation technique whose stated purpose is to reveal a
vector field's coherent structure*. Run over a field with one dominant direction it renders
that dominance at maximum contrast — it is an anti-technique for this problem, and the
kernel length is not the parameter that would save it.
**Do not retry at any kernel length.** Strokes are still available (§c) but only as **rare,
short, locally-aligned finite elements**, which is a different construction and is only safe
after B1 gives the crest field angular bandwidth.

### Two additional don'ts, from the sources rather than from past attempts

- **Do not add more to the open sea.** All five attempts added; every shipping top-down ocean
  (§4) subtracts. Anno gives its entire ocean two 512² maps and 0.05% bright pixels at calm.
  If the open sea is detailed enough for its weave to be legible, it is already too detailed.
- **Do not use unbounded per-tile random rotation** if hex-tiling is adopted (B6). Mikkelsen
  recommends it for pebbles; for a sea it would destroy the readable swell direction, which
  is what makes the image an ocean rather than noise. Bound it to ±`uSpread`.

---

## Sources consulted (URLs)

**Primary, read in full**
1. Ang, Catling, Cifariello Ciardi & Kozin (2018), "The Technical Art of Sea of Thieves",
   SIGGRAPH '18 Talks. https://history.siggraph.org/wp-content/uploads/2022/09/2018-Talks-Ang_The-Technical-Art-of-Sea-of-Thieves.pdf
   — DOI https://dl.acm.org/doi/10.1145/3214745.3214820
2. Mikkelsen (2022), "Practical Real-Time Hex-Tiling", JCGT 11(2).
   https://jcgt.org/published/0011/03/05/paper-lowres.pdf
3. fxguide, "Assassin's Creed III: the tech behind (or beneath) the action" — quotes Georges
   Torres. https://www.fxguide.com/fxfeatured/assassins-creed-iii-the-tech-behind-or-beneath-the-action/
4. Catlike Coding, "Flow — Texture Distortion".
   https://catlikecoding.com/unity/tutorials/flow/texture-distortion/
5. Catlike Coding, "Flow — Directional Flow".
   https://catlikecoding.com/unity/tutorials/flow/directional-flow/
6. Poulet, "Anno 1800 frame analysis". https://blog.thomaspoulet.fr/posts/anno-1800-frame-analysis/

**Primary, consulted**
7. Heitz & Neyret (2018), "High-Performance By-Example Noise using a Histogram-Preserving
   Blending Operator", HPG. https://eheitzresearch.wordpress.com/722-2/ ,
   https://dl.acm.org/doi/10.1145/3233304
8. Vlachos (2010), "Water Flow in Portal 2", SIGGRAPH Advances in Real-Time Rendering.
   Mirror: https://www.scribd.com/document/48121532/siggraph2010-vlachos-waterflow
9. Tessendorf (2001), "Simulating Ocean Water", SIGGRAPH course notes.
10. Longuet-Higgins, Cartwright & Smith (1963) cos-2s spreading, via USACE CETN-I-28
    "Directional Wave Spectra Using Cosine-Squared and Cosine 2s Spreading Functions".
    https://apps.dtic.mil/sti/tr/pdf/ADA591687.pdf
11. ScienceDirect topic page, "Directional Spreading" (s ≈ 10 wind sea → 70 swell; frequency
    dependence). https://www.sciencedirect.com/topics/engineering/directional-spreading
12. Unity HDRP, "Water system simulation" (Simulation Bands, Patch, tiling of smaller bands).
    https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.1/manual/water-water-system-simulation.html
13. Bowles & Zimmermann, "Multi-resolution Ocean Rendering in Crest Ocean System", SIGGRAPH
    2019 Advances. https://advances.realtimerendering.com/s2019/index.htm ;
    docs https://crest.readthedocs.io/en/4.9/user/technical-information.html ,
    https://crest.readthedocs.io/en/stable/user/waves.html
14. Yuksel, Keyser & House (2007), "Wave Particles", SIGGRAPH.
    https://www.cemyuksel.com/research/waveparticles/
15. fxguide, "5 things you need to know about the tech of AC4: Black Flag".
    https://www.fxguide.com/fxfeatured/5-things-you-need-to-know-about-the-tech-of-assassins-creed-iv-black-flag/

**Negative results — checked, contained nothing usable**
16. imgeself, "Graphics Study: Red Dead Redemption 2" — explicitly defers water.
    https://imgeself.github.io/posts/2020-06-19-graphics-study-rdr2/
17. SIGGRAPH 2019 Advances course index — confirms Rockstar's RDR2 talk is atmosphere only.
    https://advances.realtimerendering.com/s2019/index.htm
18. Simon Schreibt, "Black Flag Waterplane" — about hiding water/boat intersection, not waves.
    https://simonschreibt.de/gat/black-flag-waterplane/
19. gamedev.net "AC4 Black Flag Ocean Technology Talk" thread — HTTP 403, UNVERIFIED.
    https://gamedev.net/forums/topic/652966-assassins-creed-iv-black-flag-ocean-technology-talk/
20. GTA VI / "RAGE 9" / NVIDIA WaveWorks claims — content-farm sources with no primary
    citation. Treated as unreliable; not used.

**Repo files read for grounding (not external sources)**
`src/shaders/wave.frag` (addSpread at :75-140, group envelope at :230-260, primary swell at
:280-290, hForm at :654-712, outputs at :6-9), `src/shaders/foam.frag`,
`src/shaders/composite.frag` (foam draw at :1040-1220), `src/presets.py`, `src/ocean_gl.py`.
