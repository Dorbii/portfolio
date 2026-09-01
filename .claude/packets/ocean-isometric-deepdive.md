# Task: how 2.5D / isometric games draw open water without it reading as fabric

You are researching for an illustrated, near-plan-view fantasy world map with a
hand-painted city on an island. Repo worktree:
`C:\Users\Steve\Documents\Github\portfolio\.claude\worktrees\ocean-lane`.

## The standing art direction (violating this makes your answer useless)
The water must FEEL real, not BE simulation-correct. This is concept art, not a
solver. A few well-drawn events beat a physically complete field. The owner has
said repeatedly that concept art "always looks better even though it may be less
realistic".

## The defect, stated precisely
The open sea reads as FABRIC — corduroy, denim, woven cloth — not as water. The
owner and a second viewer have both called it out repeatedly, at multiple zooms.

It is NOT the foam (fixed tonight: the foam was drawing cumulus and now doesn't),
NOT the tone, NOT gloss, NOT sky reflection, NOT the posterize/paint pass, NOT
open-water relief. All five ablated on the live build, all five null.

It IS the swell. Measured on the live frame with an FFT of a water-only crop:

    build                     peak   angular width   peak wavelength
    groups off                 147       19.1 deg        106.5 px
    before tonight              84       22.3 deg        106.5 px
    now (9-component swell)     76       25.7 deg        106.5 px
    open wave field zeroed      43       34.4 deg        (no fabric visible,
                                                          but the sea is dead)

"peak" is peak power over median power in the 50-220 px band — i.e. how much the
spectrum is ONE wavelength in ONE direction. 106.5 px is exactly the stripe
spacing measured off the frame.

## THE QUESTION I MOST NEED ANSWERED
**What does this number look like for isometric/top-down games and illustrated
maps whose water people admire?** Nobody has ever measured the target. Go get it:

1. Collect real reference frames — screenshots, promotional stills, video frames
   — of water from 2.5D isometric and near-plan-view games and art. Save them
   under the system temp scratchpad, NOT in the repo.
2. Crop an ALL-WATER rectangle of at least 768x768 from each (no coastline, no
   boats, no UI).
3. Run `python src/spectrum_metric.py <crop.png>` from
   `art-source/ocean-animation` on each. It masks on alpha>250, and an opaque
   RGB crop converted to RGBA passes wholly, so plain crops work. Read the
   docstring first — it explains what each number means.
4. Report a TABLE of peak / angular width / wavelength-spread per reference.

That table is the single most valuable thing you can produce. It tells us
whether we are aiming at peak 60, 40 or 15, and whether admired isometric water
is broadband texture or narrowband-but-something-else.

Sources worth covering (not exhaustive, use judgement):
- Isometric/2.5D RPG and strategy: Diablo II and IV, Baldur's Gate 3, Divinity
  Original Sin 2, Pillars of Eternity, Age of Empires IV, Northgard, Frostpunk,
  Transport Fever, Tropico, Anno 1800, Civilization VI, Humankind, Old World.
- Illustrated cartography: hand-painted fantasy maps, historical portolan and
  woodcut sea conventions, Studio Ghibli and other animation water seen from
  above.
- Any published technical talk on water for a fixed-tilt camera.

## THE SECOND QUESTION — challenge the premise
I have been trying to fix a SPECTRUM. It is entirely possible that is the wrong
frame, and I want you to argue the other side if the references support it:

- At a near-plan view, do admired references even DRAW a continuous wave field
  in open water? Or do they use a quiet, mostly flat sea and spend all the
  detail at coastlines, wakes and events?
- Do they draw waves as DISCRETE STROKES (finite arcs, drawn marks, sprites)
  rather than as a continuous periodic field? If so, how are those distributed,
  how long are they, and what stops them tiling?
- Is the answer colour-and-value blocking rather than geometry — large calm
  areas, a few darker bands, and detail only where something interacts?
- Is our 106.5 px swell simply TOO LARGE or TOO CONTRASTY for this camera?

Answer with evidence from the references, not from first principles.

## Our architecture, so your recommendations are implementable
- `art-source/ocean-animation/src/shaders/wave.frag` — an eikonal-solved phase
  field baked to textures; families primary/secondary/chop summed as Gerstner
  components via `addSpread` (real wavevector rotations); RMS-normalised height
  `hn`. Tone `hForm` and crest-line field `hPath` are built from the same phase.
- `foam.frag` — advected foam with material coordinates; `composite.frag` — the
  painted look: posterize/paint pass, drawn crest lines, wisps, seabed.
- `presets.py` holds all art parameters; `export_web.py` GENERATES the live
  shaders from these sources. Read `docs/career-world/OCEAN-STATE.md` first —
  it carries the methodology and the recorded failures.

## APPROACHES ALREADY TRIED AND FAILED — do not re-propose them
1. second tonal train, hard union — pixel flicker;
2. same, smooth soft-max — "still uniformed just busier";
3. spatially-varying phase bend — busier, mottled;
4. secondary train raised to near-primary amplitude — literal plaid (two
   comparable trains 40 deg apart is a crossed sea, and its interference is a
   lattice);
5. flow-aligned line integral (licMix) — combed the sea into brushed metal;
6. directional fan on the TONE — real but small: band energy -4%, orientation
   unmoved;
7. denser 9-component swell — peak 84 -> 76, and pushing it LOUDER made it
   worse (104), because components near the dominant angle reinforce the peak.

## HARD CONSTRAINTS
1. Do NOT run `export_web.py`, do NOT edit shaders or presets, do NOT commit.
   This is a research task; I will implement.
2. Do NOT start a dev server or drive a browser preview. Claude Desktop 1.40609
   has an MSIX bug where the in-app preview kills the GPU process; captures are
   my job, not yours.
3. Keep downloaded media in the system temp scratchpad, never in the repo.

## Deliverable
Write `art-source/ocean-animation/refs/isometric-water-deepdive.md`:
1. The measured reference table (peak / angdeg / lamspr / wavelength), with what
   each source is and a link. Mark anything you could not verify as UNVERIFIED.
2. What the numbers say the target is, and how far our 76 is from it.
3. Your answer to the challenge question: spectrum, or a different visual
   language entirely? Commit to a position and defend it.
4. A ranked, implementable direction for THIS renderer — what to build, at what
   scale and contrast, and what measurable prediction it makes on the metric.
5. An honest "what I could not determine" section.

Be blunt and be willing to tell me the last two nights of work were aimed at the
wrong thing. That is a more useful answer than a tuning knob.
