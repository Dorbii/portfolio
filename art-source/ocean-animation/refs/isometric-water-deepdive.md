# Isometric / near-plan-view water deep dive

Date: 2026-08-31. Scope: research only. No shaders, presets, generated files,
exports, server, preview, or Git state were changed.

## Executive verdict

**Do not choose a new target peak (60, 40, or 15) from this report.** The
requested external-frame measurement could not be performed in this execution
environment, so a numerical target would be fabricated. The only measured
comparison available is the renderer's own ablation: 76 for the current
9-component swell, versus 43 when the open wave field is zeroed. That proves
that the present frame has a strong, harmful narrowband contribution; it does
*not* say what admired isometric water measures.

The more important conclusion is still actionable. The latest local ablations
already weaken the packet's premise: at capital tier, persistent foam authored
most of the earlier crosshatch, and a residual soft diagonal survives after
foam reductions. The current state file has therefore correctly moved the
open sea toward dark pigment between rare events. That is the direction to
continue. Spectrum work remains a guardrail against a global grating, not the
visual language to make the viewer admire.

This is not a recommendation to make the sea dead. It is a recommendation to
spend high contrast on finite, meaningful events (breaks, wakes, rocks and
shore) and let the rest carry low-contrast painted body colour and sparse
facets. A global animated contour for every swell crest is the wrong unit of
detail for this camera.

## Measurement status and reference table

`src/spectrum_metric.py` was read before collection. It requires a 768 px
all-water alpha-valid rectangle and reports its largest isolated spectral
peak, angular spread, wavelength spread, and peak wavelength. Its band is
50--220 screen px, so numbers are comparable only at the same image scale;
they are not a general property of a game.

Collection was blocked by three independent environment constraints:

1. PowerShell/Node outbound image requests fail with `Unable to connect to the
   remote server` / `fetch failed`.
2. The available browser explicitly denied access to the image host. No
   alternate browser, raw-CDP, or indirect bypass was attempted.
3. `python` is absent; the available launcher has no interpreter. A bundled
   Blender interpreter has NumPy but not Pillow, which the requested script
   imports.

Therefore **no published image was saved, cropped, or passed to
`spectrum_metric.py`**. The candidate list below records sources found by web
search, not measurements. `UNVERIFIED` means precisely that: do not use the
row to tune a uniform.

| reference / why it was selected | published frame | peak | angdeg | lamspr | wavelength |
| --- | --- | ---: | ---: | ---: | ---: |
| Anno 1800 -- isometric harbour / map-scale sea | [1920x1080 Steam frame](https://steamcdn-a.akamaihd.net/steam/apps/916440/ss_4fc844c6fc6f567e38c0f7063621a9def7f3c966.1920x1080.jpg) | **UNVERIFIED** | **UNVERIFIED** | **UNVERIFIED** | **UNVERIFIED** |
| DREDGE -- near-plan-view open-water scene | [published screenshot](https://images.pushsquare.com/screenshots/134084/900x.jpg) | **UNVERIFIED** | **UNVERIFIED** | **UNVERIFIED** | **UNVERIFIED** |
| Tropico 6 -- isometric island / ocean context | [published screenshot](https://images.steamusercontent.com/ugc/14081335764199104230/2F4A0695FF5D3FE9615875B4ABF6575334C482D2/?ima=fit&imcolor=%23000000&impolicy=Letterbox&imw=1024&letterbox=false) | **UNVERIFIED** | **UNVERIFIED** | **UNVERIFIED** | **UNVERIFIED** |
| Northgard -- near-plan-view coastal settlement | [published frame](https://images.gamewatcherstatic.com/image/file/0/bf/79360/ng4.jpg) | **UNVERIFIED** | **UNVERIFIED** | **UNVERIFIED** | **UNVERIFIED** |
| Tunic -- isometric stylized water | [published frame](https://www.gamersyde.com/newsv3/gc_tunic_gameplay-20332.jpg) | **UNVERIFIED** | **UNVERIFIED** | **UNVERIFIED** | **UNVERIFIED** |
| Hokusai, *Under the Wave off Kanagawa* -- illustrated convention, not a game | [Met public-domain object record](https://www.metmuseum.org/art/collection/search/45434) | **UNVERIFIED** | **UNVERIFIED** | **UNVERIFIED** | **UNVERIFIED** |

Two caveats matter before a rerun. Several candidates may not contain a valid
768x768 all-water rectangle at native resolution; they should be rejected,
not enlarged or cropped through ships/coasts/UI to make a row. Second, the
Hokusai image is useful for mark language, not for an open-sea spectrum target:
it deliberately composes a breaker, boats, and mountain.

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

## Answer to the challenge question

**Commitment: this is primarily a visual-language problem, with a spectrum
failure as its enforcement test.**

The last two nights were not wholly misdirected: the 76/25.7-degree result is
real evidence against the present full-frame draw field, and `addSpread` is
the correct physical repair for the height field. But continuing to tune its
component count, fan width, or secondary amplitude is now low-value. The
packet's own failed trials establish why: a stronger secondary made plaid;
spatial bending made mottle; nine components only moved peak 84 to 76.
Those are all attempts to make a continuous global field look like a set of
drawn events. They cannot reliably do that.

At this viewing angle, an infinite crest family appears as a screen-space
graphic. Repeated 106.5 px stripes dominate regardless of whether their phase
is physically plausible. The right question is not "how do I hide more wave
components in every pixel?" It is "which pixels deserve to declare a wave?"

The answer should be:

- **quiet body:** large, dark, stepped pigment and low-contrast facet/sparkle
  variation, with no mandatory crest line;
- **finite open-water events:** short arcs/threads selected by groups and
  breaking state, with endpoints and gaps; and
- **interaction events:** richer, larger, and brighter marks only at shore,
  rocks, structures, wakes, and the few large offshore breaks.

This leaves the eikonal/Gerstner field in charge of timing, flow and where an
event is plausible. It stops asking that field to paint the whole ocean.

## Ranked direction for this renderer

This is a build order, not an instruction to change files in this research
slice.

1. **Make the continuous swell a placement signal, not a compulsory visible
   mark.** Preserve `addSpread` and the phase/group data in `wave.frag`, but
   keep the open-water tonal contribution behind the existing `openPaint`
   floor and allow `hPath` to emit visible line work only inside discrete
   event gates. The current `lineGate`, `groupEnv`, `uEventStroke` and
   `uEventTeal` already identify the seam where that policy belongs. Do not
   restore an unconditional `crestLineFloor`; it is explicitly documented as
   hatching.

   Prediction: at a fixed 768px water crop from the owner camera, suppressing
   the continuous luma contribution should materially reduce peak from 76
   toward the 43 no-open-wave baseline. A lone event may create a local
   spectral lobe; it must not recreate one global 106.5px lobe. Record peak,
   angdeg, lamspr and a crop image for several deterministic phases before
   interpreting the result.

2. **Draw a few group-owned events with finite length and a real zero between
   them.** Start with runs of 1--3 visible crest arcs per active group, not a
   contour on every crest. Use the existing group envelope to leave whole
   groups empty, give each surviving run an endpoint/erosion envelope, and
   carry secondary/chop direction only inside those runs. At the present
   106.5px dominant screen wavelength, a useful first visual budget is roughly
   0.5--1.5 wavelengths (about 50--160px) per run, with groups several
   wavelengths apart. This is an initial design grid derived from the current
   wavelength and grouped-breaker prior, **not a measured external constant**.

   Contrast: use the teal pre-break and foam-white values for the event only;
   do not raise the base-sea contrast to make it visible. The owner should be
   able to point to individual events and to unmarked water between them.

3. **Build the facet-sparkle base before adding more wave families.** The
   renderer already exposes `uGlitter` and a patch gate in `composite.frag`.
   Use it for small, bounded painted facets that flicker/shimmer in clusters,
   not for a second directional contour field. Facets should vary in size and
   orientation locally and remain lower contrast than event foam. Their job is
   to make the quiet body read as liquid at capital and territory scale without
   creating a new 50--220px directional peak.

   Prediction: a successful facet pass can raise small-scale local edge
   richness while leaving the swell-band peak no higher than the post-step-1
   baseline. If it raises the same dominant peak, it is another grating.

4. **Spend the strongest treatment where interaction supplies an explanation.**
   Keep large arcs, bright foam, contact shading, wake fans, and broken forms
   at coastline/footprints/ships. This aligns with the current ownership rule
   and with the renderer's event hooks; it is also where dense detail will
   read as cause rather than fabric. Do not use coastline complexity to excuse
   an unreadable all-water crop.

5. **Rerun this research before setting numeric acceptance bounds.** Collect
   native-resolution frames, retain the original plus crop coordinates in the
   system scratchpad, reject frames without a genuine 768px water box, then
   run the exact `spectrum_metric.py` command. Only then choose a percentile
   band for peak/angdeg/lamspr. The owner remains the visual authority; the
   metric should reject regressions to global corduroy, not select the art.

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
