**This cell is ALREADY AUTHORED AND WAS ACCEPTED. You are replacing it to
remove ONE element. Everything else about it was right — keep it.**

Four authored neighbours arrive in the edit target: WEST the bench country
(open olive benches and grass), EAST the wild coast (pale warm basalt terraces,
a BRIGHT ground), NORTH the magical gorge (deep greens, a grey-blue basin
haze), SOUTH heather moor. Continue all four exactly as they arrive, at their
brightness, each across roughly the outer quarter of that side. The dark forest
gorge is the cell's core.

## The one thing to remove

**In your WEST QUARTER, a little below the middle** — about 11–25% across from
your west edge and 53–78% down from your north edge — the previous version put
a **single enormous conifer**: roughly three times the height of every other
tree in the cell, fully rendered with a visible TRUNK and ROOT FLARE that no
other tree in this territory has, standing at the centre of a curving ring of
stones on a rock terrace.

It measures ~22 m tall and ~15 m across. Nothing briefed it: this biome's
`wonders` is **"none"**. It reads as a hero asset dropped into a background
plate.

**Replace it with ordinary ground.** That patch becomes what surrounds it —
dense dark conifer stands of NORMAL size on mossy ground, the gorge's own
character running through unbroken. Do not leave a bare ring, a clearing, a
stump, a shrine or a gap where it stood, and do not put a smaller special tree
there. There should be nothing at that spot a viewer would look twice at.

## Scale — this is now gated, and it is the reason for this whole run

Every conifer crown on your 1254 px canvas: **median about 35 px, and NO crown
wider than 53 px.** The previous version's rogue tree was ~159 px. Match the
crowns arriving from your neighbours in the edit target — they are the canon.

## Keep all of this exactly as it was

- ONE gorge running through the core: ROUNDED moss-covered rock walls, no
  columns, no caps, no slab faces; wet talus of rounded boulders.
- ONE gorge stream with falls and pools in shade, and the stream crossings
  where they meet your authored edges — they must still be met.
- Dense dark conifer stands on mossy ground, **the darkest green in the
  territory**, near-black under the stands, little open ground.
- The flat grey-blue haze lying in the gorge bottom, thinning as the ground
  rises out of it.
- Flat lighting: every rock face the same value whichever way it faces,
  ambient occlusion only, no directional key, no lit side, no cast shadows.
  Every conifer the same value all round — its shape from its silhouette and
  the near-black under it, never from a lit flank.
- High oblique 2.5D, consistent with the reference. Not top-down.

## The report is read and gated now, not filed

`crown.medianMetres` must be inside **1.7–5.2 m** and `crown.excludedElements`
must be **empty**.

**Do not measure around anything.** The previous version's report stated its
median was taken "excluding the giant-tree site" — that disclosure is exactly
how the rogue tree reached the world, because nothing read the report. If this
cell ends up containing a crown outside the band, put it in `excludedElements`
and the cell will be refused. That is the correct outcome. A cell with no
out-of-scale element has an empty array and passes.
