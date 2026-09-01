# Isometric / near-plan-view water deep dive

Date: 2026-08-31. Scope: research only. No shaders, presets, generated files,
exports, server, preview, or commits were made.

## Executive verdict

**Do not choose a new target peak (60, 40, or 15) from this report.** The
requested external-frame measurement could not be performed in this execution
environment, so a numerical target would be fabricated. The only measured
comparison available is the renderer's own ablation: 76 for the current
9-component swell, versus 43 when the open wave field is zeroed. That proves
that the present frame has a strong, harmful narrowband contribution; it does
*not* say what admired isometric water measures.

The more important conclusion is still actionable, but it needs revision. The
latest local ablations still show that persistent foam authored much of the
earlier crosshatch and that a residual soft diagonal survives after foam
reductions. They justify rejecting a global crest grating. They do **not**
justify a body whose typical 9 px local contrast is 6.4 while the adjacent
hand-painted land is 29.9. The same-frame comparison supplied with this task
makes the former "quiet body" recommendation too flat.

The revised target is an aperiodic incident field: enough irregular pigment,
facets, and small material variation for unmarked water to belong to the
illustration, while reserving connected crest lines and the brightest values
for finite events (breaks, wakes, rocks and shore). The 50--220 px spectrum is
still an enforcement guardrail: that added body detail must not make another
global directional peak.

## Measurement status and reference table

`src/spectrum_metric.py` was read before collection. It requires a 768 px
all-water alpha-valid rectangle and reports its largest isolated spectral
peak, angular spread, wavelength spread, and peak wavelength. Its band is
50--220 screen px, so numbers are comparable only at the same image scale;
they are not a general property of a game.

The requested run is blocked by this managed sandbox before the first image
can be collected. These are the exact probes, not a substitute metric:

1. `& "C:\\Users\\Steve\\AppData\\Local\\Programs\\Python\\Python312\\python.exe" --version`
   returned `Program 'python.exe' failed to run: Access is denied`. The file is
   present and readable (`104952` bytes); the failure is execution permission,
   not a claim that Python is missing.
2. `curl.exe -sS -L "https://store.steampowered.com/api/appdetails?appids=916440"`
   returned `curl: (35) schannel: AcquireCredentialsHandle failed:
   SEC_E_NO_CREDENTIALS (0x8009030E)`.
3. `Invoke-WebRequest -UseBasicParsing -Uri
   "https://store.steampowered.com/api/appdetails?appids=916440"` returned
   `The underlying connection was closed: An unexpected error occurred on a
   receive.`

Therefore **no published original was saved, no valid crop/contact sheet
exists, and `spectrum_metric.py` was not run**. The candidate list below is
retained only as an unmeasured source list; none of its cells may tune a
uniform.

| reference / why it was selected | published frame | peak | angdeg | lamspr | wavelength |
| --- | --- | ---: | ---: | ---: | ---: |
| Anno 1800 -- isometric harbour / map-scale sea | [1920x1080 Steam frame](https://steamcdn-a.akamaihd.net/steam/apps/916440/ss_4fc844c6fc6f567e38c0f7063621a9def7f3c966.1920x1080.jpg) | **NOT MEASURED -- fetch blocked** | -- | -- | -- |
| DREDGE -- near-plan-view open-water scene | [published screenshot](https://images.pushsquare.com/screenshots/134084/900x.jpg) | **NOT MEASURED -- fetch blocked** | -- | -- | -- |
| Tropico 6 -- isometric island / ocean context | [published screenshot](https://images.steamusercontent.com/ugc/14081335764199104230/2F4A0695FF5D3FE9615875B4ABF6575334C482D2/?ima=fit&imcolor=%23000000&impolicy=Letterbox&imw=1024&letterbox=false) | **NOT MEASURED -- fetch blocked** | -- | -- | -- |
| Northgard -- near-plan-view coastal settlement | [published frame](https://images.gamewatcherstatic.com/image/file/0/bf/79360/ng4.jpg) | **NOT MEASURED -- fetch blocked** | -- | -- | -- |
| Tunic -- isometric stylized water | [published frame](https://www.gamersyde.com/newsv3/gc_tunic_gameplay-20332.jpg) | **NOT MEASURED -- fetch blocked** | -- | -- | -- |
| Hokusai, *Under the Wave off Kanagawa* -- illustrated convention, not a game | [Met public-domain object record](https://www.metmuseum.org/art/collection/search/45434) | **NOT MEASURED -- fetch blocked** | -- | -- | -- |

Three caveats matter before a rerun. Several candidates may not contain a
valid 768x768 all-water rectangle at native resolution; they should be
rejected, not enlarged or cropped through ships/coasts/UI to make a row.
Hokusai is useful for mark language, not for an open-sea spectrum target: it
deliberately composes a breaker, boats, and mountain. Finally, `lampk` does
**not** survive a scale difference: widening the local band moved the canonical
plates to 343--384 px, a composition/lighting signal rather than a wave size.
`peak` is also not directly comparable across unmatched cameras because its
fixed 50--220 px band samples different world scales. `angdeg` and normalized
`lamspr` are more scale-resilient shape descriptors under uniform resampling,
but still need matched crop content and camera before they can supply a common
acceptance bound.

### What can actually be said about 76

The current 76 is 33 above the renderer's no-open-wave baseline of 43 (1.77x
that baseline). That is sufficient local evidence to reject a full-frame,
same-scale, same-angle luminance pattern. It is **not** evidence that 40, 15,
or any other number is the external target. Until actual crops exist, the only
honest measurable requirement is directional: any proposed open-water change
must move the 50--220 px peak toward the 43 ablation while preserving motion
and event readability in the owner review camera.

## Evidence that does transfer

There are two distinct claims here; do not blend them.

1. **Physical-wave claim.** A wind sea needs directional and wavelength
   spread, not a single infinite train. NVIDIA's water chapter explicitly
   selects directional waves from a range about wind direction and reserves
   finite-origin circular waves for local sources such as a waterfall. That
   supports the existing `addSpread` construction and event-local waves; it
   does not require a visually loud continuous field. [GPU Gems, Effective
   Water Simulation](https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-1-effective-water-simulation-physical-models)

2. **Illustration / map-read claim.** The Met's public-domain Hokusai work is
   a valid counterexample to a spectrum-first art decision: its water is
   carried by a few bounded, high-information forms, not by an even field of
   equally legible crests. That is an observation about the composition, not a
   claim that an 1830s woodblock print supplies a game-rendering algorithm.
   [Met collection record](https://www.metmuseum.org/art/collection/search/45434)

Existing local research points in the same direction, but is not independent
measurement evidence for this table. `stylized-water-brief.md` records Anno
1800 as spending open-water readability mostly on colour while reserving bright
marks for wakes and shoreline; `topdown-water-techniques.md` records that Sea
of Thieves combines its foam mask with artist-authored texture. Those sources
are useful implementation hypotheses, not a substitute for reproducible
external crops.

The physical literature also supports rarity and grouping without demanding an
edge-to-edge stripe: observed breaking concentrates around group apices, and
the local `wave-physics-notes.md` distils this as bursts of roughly one to
three large waves separated by several wavelengths. That is a good *event
placement* prior, not a licence to blanket the frame in phase contours.

## Response to the contrast challenge

**Revision: the body should be quiet in *directional line work*, not quiet in
local incident.** The challenge is persuasive. A city is not a physically
like-for-like water reference, so the sea should not be forced to land's
median local contrast of 29.9. But the same-frame, same-camera comparison does
answer the relevant art question: 6.4 median local contrast and 55.9% of sea
pixels below 8 makes the water a flat panel inside a surface whose land has
29.9 median and only 1.1% below 8. The independent plate figures point the
same way (18.6--31.8% quiet share and p95 52--56, versus 62.8% and p95 25.9
for ours). The older recommendation underweighted this mismatch.

The practical target is provisional rather than a claim about the unmeasured
external population: at the owner-camera 9 px window, give open water a median
local contrast of **14--18**, keep the share below 8 to **30--40%**, and seek a
p95 of roughly **35--45**. That raises incident by about 2--3x without trying
to turn water into the land's equally busy material. It must come from bounded,
varying-size and varying-orientation pigment/facet clusters, with no connected
crest family, no shared screen direction, and no regular spacing.

The 50--220 px spectral condition must **not** move with this body pass. In
the current same-camera ablation, use 43 as the provisional post-crest baseline
and allow at most a 5% margin (peak <=45) until repeated captures establish
measurement variance. In particular, the added incident must not restore a
sharp lobe near the present 106.5 px `lampk`. This is an internal guardrail,
not an external reference target; `lampk` itself is scale-confounded as noted
above.

The last two nights were therefore not wholly misdirected. The 76/25.7-degree
result remains evidence against the full-frame draw field, and `addSpread`
remains a valid height-field repair. But a stronger secondary made plaid,
spatial bending made mottle, and nine components moved peak only from 84 to
76: continuous wave components cannot supply the missing painted incident.
They should place events, while the body carries aperiodic material variation.

## Ranked direction for this renderer

This is a build order, not an instruction to change files in this research
slice.

1. **Build the aperiodic body before another wave family.** Use the existing
   `uGlitter`/patch path in `composite.frag` for small, bounded painted facets
   and pigment variation, not a second directional contour field. Tune it to
   the provisional 14--18 median, 30--40% below-8 range above. It must keep
   the 50--220 px peak at or below the provisional 45 guardrail; if it raises
   that peak or forms a shared direction, it is another grating rather than
   body incident.

2. **Make the continuous swell a placement signal, not a compulsory visible
   mark.** Preserve `addSpread` and the phase/group data in `wave.frag`, keep
   open-water tonal contribution behind `openPaint`, and allow `hPath` line
   work only inside discrete event gates. `lineGate`, `groupEnv`,
   `uEventStroke`, and `uEventTeal` are current evidence that the renderer has
   an event-control seam. Do not introduce an unconditional crest-line floor.

   Prediction: at a fixed 768px water crop from the owner camera, suppressing
   continuous luma should reduce peak from 76 toward the 43 no-open-wave
   baseline. A lone event may create a local spectral lobe; it must not
   recreate one global 106.5px lobe. Record peak, angdeg, lamspr and a crop
   image for several deterministic phases before interpreting the result.

3. **Draw a few group-owned events with finite length and a real zero between
   them.** Start with runs of 1--3 visible crest arcs per active group, not a
   contour on every crest. Use the existing group envelope to leave whole
   groups empty, give each surviving run an endpoint/erosion envelope, and
   carry secondary/chop direction only inside those runs. At the present
   106.5px dominant screen wavelength, a useful first visual budget is roughly
   0.5--1.5 wavelengths (about 50--160px) per run, with groups several
   wavelengths apart. This is an initial design grid derived from the current
   wavelength and grouped-breaker prior, **not a measured external constant**.

   Contrast: use the teal pre-break and foam-white values for the event only;
   the base-body contrast increase must not become a line-art substitute. The
   owner should be able to point to individual events and to incident-rich,
   unmarked water between them.

4. **Spend the strongest treatment where interaction supplies an explanation.**
   Keep large arcs, bright foam, contact shading, wake fans, and broken forms
   at coastline/footprints/ships. This aligns with the current ownership rule
   and with the renderer's event hooks; it is also where dense detail will
   read as cause rather than fabric. Do not use coastline complexity to excuse
   an unreadable all-water crop.

5. **Rerun the reference measurement before setting a population bound.** The
   next environment must save native originals and verified crops/contact sheet
   under its system scratchpad, then run the exact `spectrum_metric.py`
   command. Only that pass can establish a percentile band for
   peak/angdeg/lamspr. The owner remains the visual authority; the metric
   should reject regressions to global corduroy, not select the art.

## What I could not determine

- The requested reference peak, angular width, wavelength spread, and
  wavelength values. No valid reference crop was available to the metric.
- Whether admired isometric water clusters near 60, 40, or 15. There is no
  defensible answer without those measurements.
- Whether the present 106.5px wavelength is too large, too contrasty, or both
  relative to external exemplars. It is demonstrably too coherent in this
  renderer; scale cannot be separated from contrast without the table.
- Any claim about a particular game's internal water implementation beyond its
  cited primary/public material. In particular, do not treat community shader
  recreations or the pre-existing local notes as developer confirmation.

## Reproducible next measurement pass

When image download and a Python environment are available, use this exact
procedure for every candidate:

1. Save the original to the system temp scratchpad; never add it to the repo.
2. Record source URL, native dimensions, and crop `(x, y, 768, 768)`.
3. Reject it unless the rectangle is all water and excludes UI, boats,
   coastlines and shadows from non-water objects.
4. Convert the crop to opaque RGBA without rescaling, then run:

   ```powershell
   cd art-source/ocean-animation
   python src/spectrum_metric.py <temp-crop.png>
   ```

5. Put the output and crop coordinates in the table above. Treat at least
   three independent frames per visual language as a distribution, not one
   magic number.
