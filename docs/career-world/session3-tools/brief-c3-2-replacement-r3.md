**Attempt 3. This brief is NUMBERS, not adjectives. My previous two briefs
described this cell's character in words and you reasonably followed them into
a global darkening; the words were the problem. Ignore character language and
hit the four edge numbers below.**

## What you have already got right — change none of it

- **The oversized conifer is gone** and its site is ordinary dense stand with
  basalt outcrops: no clearing, no stump, no stone ring, no smaller special
  tree. Correct both times. Do it again.
- **Crown scale and your report.** Median `2.55 m` over 40 crowns, maximum 42
  source px, `excludedElements` empty, method saying *"all visibly larger
  conifers were included"*. Exactly right. Same again.
- **The north edge blue is SOLVED.** You brought the vegetation blue/green
  ratio at the c3-1 seam from `0.750` to `0.500` against the neighbour's
  `0.492` — a difference of `0.008` where the limit is `0.20`. Keep that.
  Do not put the grey-blue haze back into the conifers at any edge.
- Water: 4 crossings met, fringe `0% / 0%`, mask clean. Rock lighting `0.079`,
  key light `0.003`. All well inside.

## The one thing to fix: the whole cell is too dark, at every edge

Attempt 2 came out **12 to 16 luma darker than this cell's own accepted version
at all four edges.** That broke the south seam and nearly broke the east. The
gate compares the median luminance of ALL LAND in a band along each shared
edge, limit `21`.

| your edge | the neighbour's band | this cell's ACCEPTED version | attempt 2 | **your target** |
|---|---|---|---|---|
| NORTH (c3-1 magical gorge) | `57.5` | `64.6` | `52.7` | **60–68** |
| SOUTH (c3-3 heather moor) | `96.6` | `89.4` | `73.2` — **FAILED at 23.4** | **86–94** |
| WEST (c2-2 bench country) | `55.8` | `68.5` | `54.5` | **64–72** |
| EAST (c4-2 wild coast) | `104.7` | `100.2` | `87.2` | **96–104** |

Those targets are the accepted version's own edge readings, which passed all
four comfortably. **Brighten the outer band of every edge back to them — about
`+9` north, `+17` south, `+12` west, `+12` east from where attempt 2 sat.**

**Where the darkness belongs.** This biome is the darkest green in the
territory, and that is TRUE OF ITS CORE — the gorge, its walls, and the stands
in the cell's middle. It is not true of the outer quarter of any edge. Your
south quarter is open heather moor at luma ~90 and your east quarter is pale
basalt coast at ~100; those are bright grounds and they must arrive bright, as
they do in the edit target. Do not carry the gorge's value outward, and do not
apply any overall darkening, level or curve to the whole frame.

## Everything else, unchanged

Four authored neighbours arrive in the edit target: WEST bench country, EAST
wild coast, NORTH the magical gorge, SOUTH heather moor. Continue each exactly
as it arrives, at its brightness, across roughly the outer quarter of that side.
The dark forest gorge is the cell's core only.

Keep: ONE gorge through the core with ROUNDED moss-covered walls (no columns,
no caps, no slab faces) and wet talus of rounded boulders; ONE gorge stream
with falls and shaded pools, meeting the same crossings at your authored edges;
dense conifer stands on mossy ground in the core, near-black under the stands
**there**; the flat grey-blue haze in the gorge bottom only, thinning as the
ground rises out of it and never reaching a cell edge; flat lighting — every
rock face one value whichever way it faces, ambient occlusion only, no
directional key, no lit side, no cast shadows, and every conifer the same value
all round; high oblique 2.5D, not top-down.

## Report

Alongside the required `crown` object, add the four edge medians you achieved
so the check is yours before it is mine:

    "edgeBands": { "N": <median all-land luma>, "S": <...>, "W": <...>, "E": <...> }

Measure them in a band 16–176 px inside each edge of your kept area, over every
opaque land pixel, exactly as the table above is measured.
