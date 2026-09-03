**Attempt 2. You fixed the inlet and you hit every edge number. ONE gate
failed: the shoreline rock is lit. Change only that.**

## Settled — reproduce all of it

- **The inlet is right.** It is water continuously from the north edge to the
  south edge and opens into the sound; the sandy trench and the cobble kerb are
  gone. Water continuity passed on 4 crossings, water cut clear `0 px`, fringe
  `0% / 0%`, mask clean with no growth needed. Land coverage `64%` — the water
  took the area it should. Do the same again.
- **Your edge bands were on target and the seam gate passed** (tone worst
  `17.9` against a limit of `21`, no vegetated seams). You reported
  **N `87.1`, W `98.2`, E `83.1`** — hold those, they are correct. Do not
  lighten or darken the frame.
- **Crown scale passed**: median `3.43 m` over 40 crowns, `excludedElements`
  empty. Same again.
- Key light `0.0054`, gradient ratio `1.297`. Fine.

## The one failure: rock lighting `0.25`, limit `0.16`

The gate measures the directional concentration of strong (>=80) luminance
gradients **inside rock only**. A consistent lit side measures `0.18-0.27`;
accepted cells in this territory measure `0.04-0.14`; **this cell's own
accepted version measured `0.088`.** You returned `0.25` — the top of the
"lit side" range.

**What is doing it:** the boulders and shingle you drew along the new
waterline each have a **pale facet on the upper left and a darker facet on the
lower right**, the same way up on every stone, all the way down both banks.
That is a directional key light. There are hundreds of these new stones, which
is why this reads far louder than in the accepted version — the same habit was
present there but on too little rock to measure.

**Paint every stone ONE FLAT VALUE.** The same wet grey whichever way a facet
turns: no bright top, no dark side, no bevel, no rim light, no specular
highlight on wet rock. A stone's form comes from its silhouette and from
ambient occlusion only.

**Ambient occlusion is wanted and is not the problem:** darken the contact
where a stone meets the ground, the crevices between stones, and under
overhangs. That is non-directional — it darkens the same way on every side.
The test is simple: if a viewer can tell which way the light is coming from,
it is wrong.

This applies to **all** rock in the cell, not just the shoreline: the shelf
outcrops, the scattered boulders on the moor, and the wet rock at the
waterline.

## Everything else, unchanged

- Settlement shelf character: buildable open ground, the conifer stands where
  they are, heather and scrub between.
- **The biome's own water survives alongside the inlet:** a stream through the
  shelf, and a pool. Keep both, classified `stream` and `lake`; the inlet stays
  `coast`.
- The water mask covers the water's **ENTIRE painted extent** — open water,
  wash and ripple at the shore, reflections, wet rock between shore stones. No
  polyline, no interior holes.
- The channel crosses your **north edge** and must meet the neighbour's water
  exactly where it arrives in the edit target.
- Conifers: each the same value all round, shape from the silhouette and the
  near-black beneath, never from a lit flank.
- High oblique 2.5D, consistent with the reference. Not top-down.

## Report

Same as before: the `crown` object with `medianMetres` inside **1.7–5.2 m** and
`excludedElements` **empty**, plus

    "edgeBands": { "N": <median all-land luma>, "W": <...>, "E": <...> }

and this time also state the rock-lighting first moment you measured, so you
have checked it before I do:

    "rockLighting": { "firstMoment": <number>, "strongEdgeSamples": <number> }

Measure it over strong (>=80) luminance gradients inside rock only. It must
come in **under `0.16`**, and the accepted version of this cell managed
`0.088`.
