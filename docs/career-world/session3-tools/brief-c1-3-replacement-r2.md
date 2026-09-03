**This cell is ALREADY AUTHORED AND WAS ACCEPTED. You are replacing it to fix
ONE thing: the inlet runs dry. Everything else about it was right — keep it,
including its brightness. Read the edge numbers at the bottom before you start.**

## The defect

A channel enters from your north as **dark open water** in a steep-sided cut.
About halfway down it stops being water and becomes a **pale sandy trench with
a kerb of set cobbles** and a thin trickle in the middle, and it stays dry all
the way to the south edge. It reads as a made footpath. Water also cannot flow
downhill into dryness, so it is wrong as terrain, not just as colour.

**This cell is required to supply water there.** Your own packet lists, under
*Rail features this cell must supply*: **"water crossing — loop crosses an
inlet"**. And the plan's `southBorder` ruling says of cells 0,3 and 1,3: *"the
south edge opens into a SOUND (ocean border - the inlet crossing and submerged
run live here)"*. A dry gully cannot be crossed by a line, and cannot be dived
beneath.

**Make that channel water, continuously, from where it enters your north edge
to your south edge, and open it into the sound.** A **drowned inlet**: dark
still water widening as it descends, the sound reaching up into the land. Wet
rock and shingle at the waterline. No sandy floor, no kerb of set cobbles,
nothing that reads as a path or a track.

## Keep — do not touch

- The settlement shelf character: buildable open ground, the conifer stands
  where they are, heather and scrub between.
- **The biome's own water: a stream through the shelf, and a pool.** These are
  separate from the inlet and must both survive.
- **Its ground tone and brightness exactly as accepted.** This is a bright,
  warm cell; it was reviewed against its neighbours and passed that way. **Do
  not correct, cool, darken or brighten it, and do not apply any overall level,
  curve or grade to the frame.** A previous replacement of another cell failed
  twice for exactly that.
- Flat lighting: every rock face one value whichever way it faces, ambient
  occlusion only, no directional key, no lit side, no cast shadows. Every
  conifer the same value all round.
- High oblique 2.5D, consistent with the reference. Not top-down.

## Water discipline — this is where two previous cells were rejected

- The water mask must cover the water's **ENTIRE painted extent**: open water,
  the wash and ripple at the shore, reflections, wet rock between shore stones.
  Both rejections in this programme were masks that stopped at the "open water"
  and left the painted edge zone behind as land.
- **Not a polyline.** A thin traced line leaves painted water beside the cut
  and fails the fringe rings.
- No interior holes; a smooth boundary at your resolution.
- The channel crosses your **north edge**: it must arrive exactly where the
  neighbour's water arrives in the edit target and continue it.
- Classify the inlet as **coast** — it is the sound reaching inland — and keep
  the shelf stream classified as `stream` and the pool as `lake`.

## The edge numbers — hit these, they are measured from what was accepted

The gate compares the median luminance of ALL LAND in a band along each shared
edge; the limit is a difference of `21`. These are this cell's own accepted
readings, which passed:

| your edge | the neighbour's band | this cell, as accepted | **your target** |
|---|---|---|---|
| NORTH (c1-2 heather moor) | `69.4` | `84.4` (difference `15.0`) | **80–88 — the tight one, do not brighten** |
| WEST (c0-3 sound coast) | `101.0` | `94.6` (difference `6.3`) | **92–98** |
| EAST (c2-3 heather moor) | `78.9` | `79.9` (difference `1.0`) | **77–83** |
| SOUTH | territory edge — opens into the SOUND | — | open water at the edge |

The north edge is already two thirds of the way to its limit, so any lightening
of your northern band will fail the cell. Aim to leave all three as they are.

## Scale, and the report which is read and gated

Every conifer crown on your 1254 px canvas: **median about 35 px, no crown
wider than 53 px** — this cell was accepted at `2.891 m`. In your report:
`crown.medianMetres` inside **1.7–5.2 m**, `crown.excludedElements` **empty**.

If this cell contains a crown outside that band because a **declared site**
requires it, name that site in `crown.excludedElements` — the plan declares no
sites for this cell, so the array should be empty. Do not exclude anything
undeclared to bring the median inside the band.

Also report the three edge medians you achieved, so the check is yours before
it is mine:

    "edgeBands": { "N": <median all-land luma>, "W": <...>, "E": <...> }

Measure them in a band 16–176 px inside each edge of your kept area, over every
opaque land pixel.
