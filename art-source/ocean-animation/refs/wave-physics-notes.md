# Wave groups and whitecapping: physics notes for the stylized ocean renderer

Compiled 2026-08-30. Purpose: replace the "woven fabric" whitecap failure (every crest
breaks a little, everywhere, always) with physically grounded rules: breaking is RARE,
CLUMPED at group scale, and INTERMITTENT at ~the peak period. Sections 1-4 are the
literature with equations; section 5 translates each result into renderer rules keyed to
the uniforms in `art-source/ocean-animation/src/shaders/wave.frag` / `foam.frag`.

Notation used throughout:
- `m_n = ∫ f^n S(f) df` — spectral moments of the elevation spectrum S(f).
- `Hs = 4√m0` — significant wave height. `fp, kp, cp, Tp` — peak frequency, wavenumber,
  phase speed, period. Deep water: `cp = g/ωp`, `cg = cp/2`.
- `U10` — 10 m wind speed (m/s). `u*` — friction velocity.

---

## 1. Wave group statistics

### 1.1 Envelope theory of a narrow-banded sea — Longuet-Higgins (1984)

Longuet-Higgins, M.S. (1984), "Statistical properties of wave groups in a random sea
state", *Phil. Trans. R. Soc. Lond. A* 312, 219-250.
https://royalsocietypublishing.org/doi/10.1098/rsta.1984.0061

A Gaussian sea `η(t)` with narrow spectrum is `η = R(t) cos(ω̄t + φ(t))` with slowly
varying envelope R. With `ρ = R/√m0` the envelope is Rayleigh:

    p(ρ) = ρ exp(−ρ²/2),      P(ρ > ρ*) = exp(−ρ*²/2)

Spectral width parameter (controls how fast the envelope wobbles):

    ν = ( m0 m2 / m1² − 1 )^{1/2}

Rice level-crossing statistics of the envelope give the two classic group results.
Mean number of consecutive waves whose envelope exceeds level ρ* (a "high run", i.e.
the visible group of big waves):

    H̄(ρ*) = 1 / ( √(2π) · ν · ρ* )

Mean number of waves from one group to the next (total group repetition length):

    Ḡ(ρ*) = H̄(ρ*) · exp(ρ*²/2)

Numbers (ρ* = 1, i.e. envelope above its rms):

| sea | ν | waves in high run H̄ | waves between groups Ḡ |
|---|---|---|---|
| swell | 0.15 | 2.7 | 4.4 |
| mixed | 0.25 | 1.6 | 2.6 |
| wind sea | 0.40 | 1.0 | 1.6 |

For a higher threshold (ρ* = 1.5, the waves that matter for breaking) with ν = 0.25:
H̄ = 1.1 waves, Ḡ = 3.3·... = 3.28 → a *burst of one or two big waves every handful of
waves*, and the burst count drops as exp(−ρ*²/2): rarity is exponential in the square
of the envelope level. Group envelope travels at `cg = cp/2` (deep water) — already
correct in wave.frag (`wg = w0*mg*0.5`).

### 1.2 Benjamin-Feir index — group formation by modulational instability

Janssen, P.A.E.M. (2003), "Nonlinear four-wave interactions and freak waves",
*J. Phys. Oceanogr.* 33, 863-884.
https://journals.ametsoc.org/view/journals/phoc/33/4/1520-0485_2003_33_863_nfiafw_2.0.co_2.xml
(overview PDF: http://www.soest.hawaii.edu/PubServices/2005pdfs/Janssen.pdf)

    BFI = ε √2 / (Δω/ω̄) ,   ε = k̄ √m0  (characteristic steepness),
                              Δω/ω̄ = relative spectral bandwidth

(equivalently `BFI₀ = 4 a0 k / (Δk/k)` in the narrow-band deep-water form). BFI > 1:
the wave field is modulationally unstable — energy self-focuses into groups, envelope
peaks grow beyond linear Rayleigh statistics, kurtosis rises, group contrast deepens.
BFI < 1: groups stay at their linear (Rayleigh) contrast. Consequence: *steeper and
narrower-banded seas have deeper, more intense groups* — group depth is a function of
sea state, not a constant.

### 1.3 Where in the group do waves break?

Holthuijsen, L.H. & Herbers, T.H.C. (1986), "Statistics of breaking waves observed as
whitecaps in the open sea", *J. Phys. Oceanogr.* 16, 290-297.
https://journals.ametsoc.org/view/journals/phoc/16/2/1520-0485_1986_016_0290_sobwoa_2_0_co_2.xml

Buoy + visual whitecap observations, open sea:
- Breaking occurs preferentially near the **central apex of the wave-group envelope**.
- **Two-thirds of all breaking waves occurred in one-third of the wave groups.**
  Breaking is not spread over all groups: most groups produce nothing; a minority of
  strong groups produce most of the whitecaps.

---

## 2. Breaking onset / probability criteria

### 2.1 Threshold + quadratic law — Banner, Babanin & Young (2000)

Banner, M.L., Babanin, A.V. & Young, I.R. (2000), "Breaking probability for dominant
waves on the sea surface", *J. Phys. Oceanogr.* 30, 3145-3160.
https://journals.ametsoc.org/view/journals/phoc/30/12/1520-0485_2000_030_3145_bpfdwo_2.0.co_2.xml

Breaking probability of dominant waves, `bT` = fraction of dominant-wave crests passing
a fixed point that are breaking (Lake Washington, Black Sea, Southern Ocean; wavelengths
3-300 m, U10 = 5-20 m/s). Parameterized purely by the **significant peak steepness**

    ε_p = (1/2) Hp kp        (Hp = 4√(m0 of the peak band))

    bT = 22 · (ε_p − 0.055)^{2.01}      for ε_p > 0.055,  else bT = 0

- **Hard threshold: ε_p ≈ 0.055.** Below it, negligible breaking was observed at all.
- Above it, quadratic growth. Values: ε_p = 0.08 → bT ≈ 1.3%; 0.10 → 4.4%; 0.12 →
  9.2%; 0.14 → 15.7%. Even in heavy seas *only ~5-15% of dominant crests are breaking*.
- The quadratic-above-threshold form is attributed by the authors to **wave-group
  modulation of breaking onset**: the local steepness a crest attains riding through a
  group envelope is what pushes it over.

Finite-depth follow-up: Babanin, Young & Banner (2001), *J. Geophys. Res.* 106,
11659-11676. https://ui.adsabs.harvard.edu/abs/2001JGR...10611659B/abstract
Same threshold-quadratic structure with a depth-modified steepness.

### 2.2 Breaking strength b(S) — Romero, Melville & Kleiss (2012); Deike et al.

Romero, L., Melville, W.K. & Kleiss, J.M. (2012), "Spectral energy dissipation of
wind-generated waves", *J. Phys. Oceanogr.* 42, 1421-1444 (b(S) scaling); confirmed by
DNS in Deike, Popinet & Melville (2015/2016, JFM), e.g.
https://airsea.ucsd.edu/wp-content/uploads/sites/10/2019/06/2016_Deike_Melville_Popinet-Journal_of_Fluid_Mechanics_vol_801.pdf

    b(S) = 0.4 · (S − 0.08)^{5/2}       S = local slope at breaking

b is the non-dimensional breaking strength in the Duncan-Phillips dissipation per unit
crest length `ε_l = b ρ c⁵ / g`. b spans ~10⁻⁴ to ~10⁻² in the field (recent LES/field
range b ≈ 0.004-0.015: https://arxiv.org/html/2503.03009v1). Same shape again: **hard
slope threshold (S₀ ≈ 0.08) then steep power growth (5/2)**. Weak breakers vastly
outnumber strong ones, but strong ones dominate the whiteness produced.

### 2.3 Spectral saturation threshold — Banner, Gemmrich & Farmer (2002)

Banner, Gemmrich & Farmer (2002), "Multiscale measurements of ocean wave breaking
probability", *J. Phys. Oceanogr.* 32, 3364-3375. Breaking probability at each scale
correlates with the *saturation* (band-integrated steepness) of that band above a
common threshold — the BBY structure holds per-scale, not just at the peak.

---

## 3. Phillips' Λ(c) framework — how much of the sea is white

### 3.1 Definition and moments — Phillips (1985)

Phillips, O.M. (1985), "Spectral and statistical properties of the equilibrium range in
wind-generated gravity waves", *J. Fluid Mech.* 156, 505-531.
https://doi.org/10.1017/S0022112085001148

`Λ(c) dc` = average total **length of breaking crest per unit sea-surface area** whose
front advances at speed in (c, c+dc). Units of Λ(c): s/m² (length/area per speed bin).
Its moments give every whitecap quantity at once:

    L_tot          = ∫ Λ(c) dc              total breaking-front length per unit area [1/m]
    R              = ∫ c Λ(c) dc            fraction of surface swept by breakers per unit time [1/s]
    whitecap W     = (2π γ / g) ∫ c² Λ(c) dc   (active breaking duration τ_b = γ T = 2πγc/g)
    momentum flux  ∝ (ρ/g) ∫ c⁴ Λ(c) dc
    dissipation E  = (b ρ / g) ∫ c⁵ Λ(c) dc

γ ≈ 0.56: the active phase of a breaker lasts ~half its wave period (value used in Wu,
Popinet & Deike 2023, below). Phillips' equilibrium-range prediction:

    Λ(c) ∝ g u*³ c⁻⁶

### 3.2 What Λ(c) actually looks like — observations and simulation

- Kleiss & Melville (2010), "Observations of wave breaking kinematics in fetch-limited
  seas", *J. Phys. Oceanogr.* 40, 2575-2604.
  https://airsea.ucsd.edu/wp-content/uploads/sites/10/2019/06/2010_Kleiss_Melville-Journal_of_Physical_Oceanography_vol_40.pdf
  Airborne imagery, Gulf of Tehuantepec: Λ(c) is NOT monotonic — it **peaks at slow
  breaker speeds (roughly 2-5 m/s, well below cp; c/cp ~ 0.2-0.5)** and rolls off
  toward c⁻⁶ at larger c.
- Sutherland & Melville (2013), "Field measurements and scaling of ocean surface
  wave-breaking statistics", *Geophys. Res. Lett.* 40, 3074-3079.
  https://doi.org/10.1002/grl.50584 — same shape including micro-breakers.
- Irisov & Voronovich (2016), "Phillips' Lambda function: data summary and physical
  model", *Geophys. Res. Lett.* 43. https://agupubs.onlinelibrary.wiley.com/doi/10.1002/2015GL067352
  Data compilation: near-universal shape, peak below cp, steep large-c tail.
- Wu, J., Popinet, S. & Deike, L. (2023), "Breaking wave field statistics with a
  multi-layer model", *J. Fluid Mech.* 968, A12.
  https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/breaking-wave-field-statistics-with-a-multilayer-model/6EB6EB167FFD3B11850A4BF7DAFE055E
  Λ(c) ∝ c⁻⁶ holds up to ~0.9 cp for steep seas; collapse
  `Λ̂ = Λ cp³ g⁻¹ σ⁻² ≈ 800 (c/(σ cp))⁻⁶` with σ = rms slope. **No breaking at all for
  rms slope σ = 0.072; breaking turns on around σ ≈ 0.098-0.114.** W computed from the
  c² moment (formula above) reproduces field whitecap data, ~10-15% at U10 = 15 m/s
  (high end of field scatter). Directional spreading barely changes Λ(c) once steep.

Key readings for the renderer: (a) the *number* of breaking fronts is dominated by
short/slow waves, not the dominant swell — dominant-wave breakers are the rare, big
events; (b) total breaking length per unit area is a steep function of overall
steepness with a genuine on/off threshold; (c) whitecap coverage is literally the c²
moment of a sparse set of line segments — white is line-born, area comes from
persistence (`W = length·(c·τ_b)`), which the foam pass already implements.

---

## 4. Whitecap coverage, foam decay, clustering in time

### 4.1 W(U10) empirics — Monahan & O'Muircheartaigh (1980)

Monahan, E.C. & O'Muircheartaigh, I. (1980), "Optimal power-law description of oceanic
whitecap coverage dependence on wind speed", *J. Phys. Oceanogr.* 10, 2094-2099.
https://journals.ametsoc.org/view/journals/phoc/10/12/1520-0485_1980_010_2094_opldoo_2_0_co_2.xml

    W = 3.84×10⁻⁶ · U10^{3.41}        (W = fraction, U10 in m/s)

| U10 (m/s) | 5 | 8 | 10 | 12 | 15 | 20 |
|---|---|---|---|---|---|---|
| W (total, %) | 0.09 | 0.46 | 1.0 | 1.9 | 3.9 | 10.5 |

Even a full gale is ~90% *not white*. Later fits scatter by a factor of a few either
way (wind history, fetch, temperature — Callaghan et al. 2008,
https://agupubs.onlinelibrary.wiley.com/doi/10.1029/2008GL036165), but the cubic-plus
steepness of W(U10) and the ~1% at 10 m/s anchor are robust.

### 4.2 Active vs residual foam — stage A / stage B

- Stage A = active whitecap: the bright crest patch during active breaking. Lifetime ≈
  breaking duration ≈ γT ≈ 0.5 Tp (γ = 0.56, §3.1).
- Stage B = maturing/residual foam: the decaying patch left behind, spread by the
  bubble plume surfacing.
- Scanlon, B. & Ward, B. (2016), "The influence of environmental parameters on active
  and maturing oceanic whitecaps", *J. Geophys. Res. Oceans* 121.
  https://agupubs.onlinelibrary.wiley.com/doi/10.1002/2015JC011230
  **W_A dominates only at low winds; with increasing wind, W_B rapidly becomes the
  majority of total coverage** (persistence accumulates). So at heavy sea state, most
  visible white is *decaying patches downstream of past events*, not active crests;
  W_A is several-fold smaller than W_total.

### 4.3 Foam decay time constants

- Callaghan, A.H., Deane, G.B., Stokes, M.D. & Ward, B. (2012), "Observed variation in
  the decay time of oceanic whitecap foam", *J. Geophys. Res.* 117, C09015.
  https://agupubs.onlinelibrary.wiley.com/doi/10.1029/2012JC008147
  Exponential-ish decay of individual foam patches; **decay times 0.2-10.4 s — a
  factor of ~50 spread — increasing with the scale (breaking speed / max foam area) of
  the event.** Classic single value: Monahan & Zietlow (1969) e-folding **3.85 s**.
- Callaghan et al. (2013), "Two regimes of laboratory whitecap foam decay", *J. Phys.
  Oceanogr.* 43, 1114-1126. https://journals.ametsoc.org/view/journals/phoc/43/6/jpo-d-12-0148.1.xml
  Clean water: exponential throughout. Surfactant-stabilized: exponential then linear,
  patches surviving to **tens of seconds** — the long tail that builds W_B.

### 4.4 Groupiness and intermittency of whitecaps in time — Malila et al. (2022)

Malila, M.P. et al. (2022), "On the groupiness and intermittency of oceanic
whitecaps", *J. Geophys. Res. Oceans* 127, e2021JC017938.
https://agupubs.onlinelibrary.wiley.com/doi/10.1029/2021JC017938

Fixed-camera whitecap time series, North Sea + North Pacific:
- **Total whitecap coverage W is enhanced 2-3× during dominant-group passage** vs
  quiescent stretches; **active coverage W_A is enhanced ~5×**.
- Mean interval between breaking-driven crossings, normalized by peak period:
  **τ/Tp ≈ 0.88-1.01 for W_A** (active breaking recurs about once per peak period
  while a group is passing) and **τ/Tp ≈ 1.54-1.93 for W** (the foam patches breathe
  at ~2 Tp).
- Frequency spectra of W(t) decay as a power law with slope **n ≈ 2.0-2.2** —
  intermittent, bursty clustering, not white noise and not a constant. Long-wave
  (group) modulation is identified as the dominant mechanism controlling breaking
  intermittency.

Related recurrence result (lab, nonlinear groups): breaking within a group recurs at
the group's own rhythm as successive crests climb through the envelope apex (crests
move at c, envelope at c/2, so a crest passes the apex once, and a new crest arrives
at the apex roughly once per wave period — consistent with Malila's τ ≈ Tp for W_A and
with Holthuijsen & Herbers' apex preference).

---

## 5. Translation to the renderer

The failure mode restated in this framework: the current whitecap term
`sstep(uWhitecapSteep, 1.75·uWhitecapSteep, |∇h|)` is a *soft ramp with no dead zone*
applied to a field whose values sit mostly inside the ramp, so every crest emits a
little white everywhere — i.e. Λ(c) is being modeled as dense and uniform when it is a
sparse set of segments; and nothing enforces exp(−ρ²/2) rarity in space or a once-per-Tp
pulse in time.

### R1 — Coverage budget (Monahan; Scanlon & Ward). Acceptance numbers, not style.
Fraction of open-water pixels that are white:
- fresh/active channel (stage A): **calm ≈ 0.0%, moderate ~0.1-0.3%, heavy ~0.5-1%.**
- total incl. persistent (stage B): calm ≈ 0%, moderate ~1%, heavy **3-6%** (storm 10%).
At heavy state the persistent channel should carry ~3-5× the area of the fresh one
(W_B > W_A at high wind). Measure both masked to open water, as QA metrics.

### R2 — Threshold-quadratic gate, not a soft ramp (BBY2000; Romero b(S); Wu σ-threshold).
Every empirical law has the same shape: `max(x − x₀, 0)^p`, p ≈ 2-2.5, with a genuine
zero below x₀. Replace the whitecap sstep with

    excess = max(steepProxy·groupGate − x₀, 0);   whitecap ∝ excess²  (clamped)

and set x₀ so that at the CALM state the excess is zero *everywhere* (BBY: ε_p below
0.055 → no whitecaps at all) and at the heavy state only the top few percent of the
crest-steepness distribution pass. Concrete calibration: histogram |∇h| on crest
pixels at the heavy state and put x₀ at the ~90-95th percentile, so the pass fraction
matches bT ≈ 5-10% (BBY at ε_p ≈ 0.10-0.12). Two independent checks agree on that
number: (a) BBY bT directly; (b) coverage arithmetic — active stripe fraction
f = W_A·λp/w_stripe; with W_A = 0.3%, λp = 180 px, stripe width 6 px → f = 9%.
**So: ≤ ~10% of total crest length white at the heaviest state; 0% when calm.**

### R3 — Group gating with exponential rarity (LH84; HH86; Malila).
The gate must ride the group envelope with high contrast. `groupEnv` swings ±(0.66+0.44)
·uGroupDepth about 1. Derivation of the gate exponent from Malila's 5× W_A enhancement:
if env varies ~[0.7, 1.3] then (1.3/0.7)^n = 5 → **n ≈ 2.6**. I.e. `groupGate =
pow(max(groupEnv,0), ~2.6)` feeding the threshold gate of R2 — and because R2 has a hard
zero, weak groups produce *nothing*, matching HH86's "2/3 of breaking in 1/3 of groups".
Do NOT implement rarity as a multiplicative dimmer on all groups equally (that
reproduces the fabric); the threshold must let whole groups fail. LH84 gives the
spacing sanity check: big-wave bursts of ~1-3 waves recurring every ~3-8 waves
(ν 0.2-0.4), i.e. group patches ~1-3 λp long along-swell, spaced 3-8 λp. The existing
two-scale beat (mg1, mg2=2·mg1) produces spacing in this range; the missing part is
contrast (uGroupDepth or the gate exponent) plus the hard threshold.

### R4 — Temporal gate: breaking recurs once per Tp inside a group (Malila; §4.4).
Within an active group patch, active whitecap should PULSE: event duration ≈ γTp ≈
0.5-0.6 Tp (γ = 0.56), recurrence ≈ 1.0 Tp while the group passes, silence otherwise.
The phase machinery gives this for free if the gate is (crest phase near apex) ×
(group gate): crests move at c through an envelope moving at c/2, so a given point of
the envelope apex is visited by a fresh crest once per ~Tp. Practically: gate injection
on `crestness · groupGate` where crestness is tight around the crest top (already
`sstep(0.42,0.90,hn)`); the once-per-Tp rhythm then emerges from phase advection —
verify in QA that a fixed heavy-sea probe pixel shows foam-injection bursts at ~Tp,
and that the W(t) power spectrum of a patch has a ~f⁻² tail (Malila), not a flat line.

### R5 — Which waves whitecap: mostly the shorter trains, inside dominant groups (Λ(c)).
Λ(c) peaks at c/cp ≈ 0.2-0.5: most breaking fronts are on waves shorter/slower than
the dominant swell, but they break *where the dominant group has steepened the sea*
(saturation gating, §2.3). Renderer rule: let the secondary train and chop contribute
most of the whitecap events (they already dominate |∇h|), but ONLY under the
primary-swell group gate — short-wave whitecaps sprinkled inside dominant-group
patches. Primary-crest breakers should be the rarest and biggest events (c⁻⁶ tail →
event count falls ~two orders of magnitude from chop scale to swell scale). This kills
the "one diagonal" read: whitecap segments inherit the secondary/chop directions,
while their spatial clustering inherits the primary group pattern.

### R6 — Foam lifetimes (Callaghan 2012/2013; Monahan-Zietlow; Scanlon & Ward).
- `uTauFresh` (stage A brightness): ~breaking duration, **0.5-1 · Tp** of the rendered
  swell (real-world 1-4 s for chop-scale, 3.85 s classic). Short: fresh white is a flash.
- `uTauPersist` (stage B): **3-8 · Tp** (tens of seconds real-world), and ideally
  scaled by event strength — Callaghan: τ grows with event size, factor ~50 across the
  population. A cheap proxy: persist longer where injection was stronger
  (`tauP *= (1 + kτ·injStrength)`), so big group events leave long-lived patches and
  small chop events barely smear. The existing deep-water tauP cut (×0.18) fights R1's
  W_B > W_A requirement — offshore foam should die by NOT BEING REINJECTED (rarity via
  R2/R3), not by triple-killing persistence; with rare injection the ice-floe
  accumulation the cuts were written against cannot happen.

### R7 — Sea-state scaling of group contrast (BFI, Janssen 2003).
Group depth is not a constant: BFI = steepness/bandwidth. Calm, broad-band state →
BFI < 1 → shallow groups (uGroupDepth low) and, via R2's threshold, zero whitecaps.
Heavy, narrower swell → BFI ≳ 1 → deep groups, and the same threshold now passes the
group apices. Wiring uGroupDepth (and/or the R3 exponent) to the sea-state slider
makes rarity collapse gracefully toward calm instead of needing a separate fade.

### R8 — What NOT to do (negative results from the literature mapped to past bugs).
- No breaking below threshold is not "low breaking": BBY saw *negligible* breaking for
  ε_p < 0.055 and Wu et al. saw *none* at σ = 0.072. A calm sea with a faint whitecap
  weave is wrong physics, not subtle art.
- Uniform per-crest whitecapping contradicts Λ(c)'s sparseness: L_tot is a set of
  isolated segments; W comes from segments × persistence sweep (W = 2πγ/g ∫c²Λdc),
  which is exactly injection-line × advected-decay — the foam.frag architecture is
  right; the injection statistics are what's wrong.
- Independent-noise patch gates give Poisson speckle, not groups: the clustering data
  (HH86 1/3-of-groups; Malila 2-5× group enhancement, f⁻² spectrum) say the gate must
  be the *wave group envelope itself* raised to a power with a hard floor, so white
  arrives in convoys that build, peak, and vanish over a few Tp.

---

## Source list

1. Phillips (1985) *JFM* 156 — Λ(c) framework, moments, c⁻⁶. https://doi.org/10.1017/S0022112085001148
2. Longuet-Higgins (1984) *Phil. Trans. R. Soc. A* 312 — envelope/group statistics. https://royalsocietypublishing.org/doi/10.1098/rsta.1984.0061
3. Banner, Babanin & Young (2000) *JPO* 30 — bT = 22(ε_p−0.055)^2.01. https://journals.ametsoc.org/view/journals/phoc/30/12/1520-0485_2000_030_3145_bpfdwo_2.0.co_2.xml
4. Babanin, Young & Banner (2001) *JGR* 106 — finite-depth version. https://ui.adsabs.harvard.edu/abs/2001JGR...10611659B/abstract
5. Holthuijsen & Herbers (1986) *JPO* 16 — breaking at group apex; 2/3-in-1/3. https://journals.ametsoc.org/view/journals/phoc/16/2/1520-0485_1986_016_0290_sobwoa_2_0_co_2.xml
6. Monahan & O'Muircheartaigh (1980) *JPO* 10 — W = 3.84e-6·U10^3.41. https://journals.ametsoc.org/view/journals/phoc/10/12/1520-0485_1980_010_2094_opldoo_2_0_co_2.xml
7. Callaghan et al. (2008) *GRL* — W scatter, wind history. https://agupubs.onlinelibrary.wiley.com/doi/10.1029/2008GL036165
8. Callaghan et al. (2012) *JGR* 117 — foam decay 0.2-10.4 s, scale-dependent. https://agupubs.onlinelibrary.wiley.com/doi/10.1029/2012JC008147
9. Callaghan et al. (2013) *JPO* 43 — two foam-decay regimes. https://journals.ametsoc.org/view/journals/phoc/43/6/jpo-d-12-0148.1.xml
10. Scanlon & Ward (2016) *JGR Oceans* 121 — W_A vs W_B partition. https://agupubs.onlinelibrary.wiley.com/doi/10.1002/2015JC011230
11. Malila et al. (2022) *JGR Oceans* 127 — whitecap groupiness/intermittency numbers. https://agupubs.onlinelibrary.wiley.com/doi/10.1029/2021JC017938
12. Kleiss & Melville (2010) *JPO* 40 — Λ(c) observations, slow-c peak. https://airsea.ucsd.edu/wp-content/uploads/sites/10/2019/06/2010_Kleiss_Melville-Journal_of_Physical_Oceanography_vol_40.pdf
13. Sutherland & Melville (2013) *GRL* 40 — Λ(c) incl. micro-breakers. https://doi.org/10.1002/grl.50584
14. Irisov & Voronovich (2016) *GRL* 43 — Λ(c) data summary/universal shape. https://agupubs.onlinelibrary.wiley.com/doi/10.1002/2015GL067352
15. Romero, Melville & Kleiss (2012) *JPO* 42 — b = 0.4(S−0.08)^{5/2}. https://doi.org/10.1175/JPO-D-11-072.1
16. Deike, Melville & Popinet (2016) *JFM* 801 — b(S) DNS confirmation. https://airsea.ucsd.edu/wp-content/uploads/sites/10/2019/06/2016_Deike_Melville_Popinet-Journal_of_Fluid_Mechanics_vol_801.pdf
17. Wu, Popinet & Deike (2023) *JFM* 968 A12 — Λ(c) c⁻⁶ collapse, σ threshold, W = 2πγ/g ∫c²Λdc, γ=0.56. https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/breaking-wave-field-statistics-with-a-multilayer-model/6EB6EB167FFD3B11850A4BF7DAFE055E
18. Janssen (2003) *JPO* 33 — BFI, modulational instability. https://journals.ametsoc.org/view/journals/phoc/33/4/1520-0485_2003_33_863_nfiafw_2.0.co_2.xml
19. Banner, Gemmrich & Farmer (2002) *JPO* 32 — per-scale saturation threshold. https://doi.org/10.1175/1520-0485(2002)032<3364:MMOOWB>2.0.CO;2
20. Review context: turbulence/dissipation from breaking (2025 preprint, b range 0.004-0.015). https://arxiv.org/html/2503.03009v1

Caveat on precision: items 3, 15, 17's equations were verified against multiple
secondary sources; LH84's group formulas (§1.1) are the standard narrow-band envelope
results as presented in LH84 — the run-length expressions are exact to O(ν).
