**This cell is ALREADY AUTHORED AND WAS ACCEPTED. You are replacing it to fix
the rock, and nothing else. Keep everything else — it was right.**

Neighbours arrive in the edit target; continue each exactly as it arrives, at
its brightness, across roughly the outer quarter of that side.

## What to fix: the basalt is built, not weathered

Your worker flagged this at the time and the owner's eye agreed.

1. **A block-like plinth.** About 17–43% across from your west edge and 33–51%
   down from your north edge stands a raised platform of columnar basalt whose
   columns are **near-identical cylinders** — the same diameter, the same
   height, tops flush and level with each other, set in tidy rows. It reads as
   cut masonry, an altar. The plan's geology rule forbids exactly this: *"never
   a regular palisade of identical cylinders, never a square corner"*, and the
   owner's words behind it were *"the cliff side is unnatural"*.

2. **The jointed pavement is mechanical.** The hexagonal jointing across the
   plateau runs at one cell size, one value and one orientation, like laid
   cobbles.

3. **The bench terraces run as even parallel bands** of near-constant width
   across the plateau.

**Make the rock weathered everywhere it appears:** uneven column heights and
widths, broken and spalled tops, split and leaning columns, collapsed drums
lying in talus at the feet of faces, lichen in the joints. Vary the joint
pattern's scale and direction across the cell and let it disappear under grass
and scree in places. Benches irregular in width, interrupted, some collapsed
into talus. No square corner anywhere. No two columns identical.

## Keep all of this exactly as it was

- **The crater tarn and its rim** — the cell's feature, accepted as drawn.
- Bare plateau character: pale warm basalt, scree, thin grass, a BRIGHT ground.
- **Flat lighting.** This cell was rejected once for lit bench tops and only
  passed at rock lighting `0.138`. Paint every bench top, every column face and
  every jointed facet ONE FLAT VALUE — the same pale warm grey whichever way it
  faces. Joints as thin dark lines only. No bright top, no dark side, no bevel.
  Only ambient occlusion darkens rock, at the foot of a face and under an
  overhang.
- Conifers thin on the exposed rock, each the same value all round — shape from
  the silhouette and the near-black under it, never from a lit flank.
- Its ground tone as accepted: the seam with its neighbours measured `0.7`, the
  best in the territory. Do not shift this cell's brightness or hue.
- High oblique 2.5D, consistent with the reference. Not top-down.

## Scale, and the report which is now read and gated

Every conifer crown on your 1254 px canvas: **median about 35 px, no crown
wider than 53 px.** `crown.medianMetres` must be inside **1.7–5.2 m** and
`crown.excludedElements` must be **empty**. Do not measure around anything: if
the cell contains a crown outside the band, list it and the cell will be
refused, which is the correct outcome.
