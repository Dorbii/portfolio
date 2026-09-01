# Task: measure reference water, and answer a challenge to your own conclusion

This continues your deep dive, which is at
`art-source/ocean-animation/refs/isometric-water-deepdive.md`. Read it first —
it is your own prior work. Worktree:
`C:\Users\Steve\Documents\Github\portfolio\.claude\worktrees\ocean-lane`.

## Part 0 — the two things that blocked you last time are fixed

1. **Network is enabled** for this run. Outbound image fetches work. Verified
   from this machine: `curl` on a Steam CDN screenshot returned HTTP 200 and
   674 KB.
2. **Python exists**, it was just not on your PATH. Use the full path:
   `C:\Users\Steve\AppData\Local\Programs\Python\Python312\python.exe`
   It has NumPy, Pillow and SciPy. Verify with `--version` before concluding
   anything is missing, and if a fetch or an interpreter still fails, report
   the exact command and error rather than substituting a guess.

Steam's public API gives clean screenshot lists without scraping:
`https://store.steampowered.com/api/appdetails?appids=<id>` → `data.screenshots[].path_full`.
Useful ids: Anno 1800 916440, Tropico 6 492720, Northgard 466560, DREDGE
1562430, Cities Skylines 255710, Civilization VI 289070, Age of Empires IV
1466860, Transport Fever 2 1066780, Windbound 1052010, Humankind 1124300.

## Part 1 — the measurement pass you could not run

Do exactly what your own report's section 5 specified.

- Save originals AND crops under the system temp scratchpad, never in the repo.
- A row requires a genuine all-water rectangle of at least 768x768 at native
  resolution: no coastline, no ship, no UI, no sky. If a frame has no such
  rectangle, REJECT it and say so. Do not enlarge, do not crop through
  furniture to manufacture a row.
- **Prove each crop is water.** Save every accepted crop, and assemble a single
  contact sheet of all accepted crops so a human can see at a glance that
  nothing is a forest or a roof. A number from an unverified crop is worse than
  no number, and this lane has already lost a night to measuring a city and
  calling it the sea.
- Run `src/spectrum_metric.py` on each accepted crop from
  `art-source/ocean-animation`. Read its docstring; `--lam=lo,hi` sets the
  band. Report peak / angdeg / lamspr / lampk.
- Also report, per crop, the local-contrast pair I describe in Part 2 so the
  two are comparable: median local contrast (9 px window) and the share of
  pixels below 8.

Then state what the reference population actually looks like, with the spread,
and say plainly whether our 75 sits inside it or outside it.

**A caution you must respect.** These are different cameras at different
scales. `lampk` is NOT comparable across images of different scale — I already
made that error tonight, and widening the band moved every one of our own
canonical plates to 343-384 px, which is composition and lighting, not waves.
Say explicitly which of your numbers survive a scale difference and which do
not.

## Part 2 — a challenge to your conclusion, with evidence

Your report commits to: quiet body, low-contrast painted pigment, "do not raise
the base-sea contrast to make it visible", detail spent on finite events and
interactions.

I agree with the event half. I think the "quiet body" half is wrong, and here
is the measurement. Local contrast is the sd of luma in a 9 px window.

Our canonical reference plates, versus our sea:

    plates   quiet share 18.6-31.8%   p95 local contrast 52-56
    ours     quiet share 62.8%        p95 local contrast 25.9

And the same-frame test, which has no scale confound at all — sea pixels
versus the hand-painted land art in the SAME capture at the SAME camera, HUD
excluded:

    sea        median local contrast  6.4    55.9% of pixels below 8
    land art   median local contrast 29.9     1.1% of pixels below 8

The sea's typical pixel is 4.7x flatter than the illustration it sits inside,
and over half of it is featureless while the land is 99% textured. My reading:
the fabric is not that the sea has too much structure, it is that it has too
little of everything else, so the single periodic modulation present is the
only thing the eye can hold. Going quieter would make it read more like a flat
panel with stripes on it.

Do not simply concede. Either:
- defend "quiet body" against these numbers — e.g. argue the land comparison is
  invalid because a city is inherently high-frequency, and show what the right
  comparison would be; or
- revise, and say what the body should carry instead, at what contrast, and how
  it stays APERIODIC so it does not become another grating.

Your own item 3 (facet-sparkle base) already gestures at this. If your revised
position is "the body needs more incident, but aperiodic and unmarked by
crests", say so and give it numbers: what median local contrast should the sea
carry to sit in this illustration, and what must NOT move (the 50-220 px peak).

## Deliverable
Update `art-source/ocean-animation/refs/isometric-water-deepdive.md` in place:
replace the UNVERIFIED table with measured rows, add a "Response to the
contrast challenge" section, and revise your ranked direction if the evidence
changes it. Keep your honesty about what remains unmeasured.

## HARD CONSTRAINTS
Unchanged: do NOT run `export_web.py`, do NOT edit shaders, presets, or any
generated file, do NOT commit, do NOT start a dev server or drive a browser
preview (Claude Desktop 1.40609 has an MSIX bug where the in-app preview kills
the GPU process). Research only — I implement.
