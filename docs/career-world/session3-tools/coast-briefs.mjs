// Briefs for the coast territory's cells — each one continues a named island
// cell's ground for a short way and ends it at the shore, with the rest open
// sea, written with the perspective rule for its shore and the measured water
// arriving across the shared edge (read from the island cell's land layer the
// way the continuity gate reads it: band of 8 px, wet below 128, runs of 30).
//
//   node docs/career-world/session3-tools/coast-briefs.mjs
import fs from "node:fs";
import sharp from "sharp";
sharp.cache(false);
const root = "art-source/career-world/l2-land";
const def = JSON.parse(fs.readFileSync(`${root}/coast/territory.def.json`, "utf8"));
const canon = JSON.parse(fs.readFileSync(`${root}/tanium/plan.json`, "utf8")).biomes;
const OPP = { S: "north", N: "south", E: "west", W: "east" };      // island side -> the shared edge's name on the coast cell
const KEPT = 2048;

async function arrivals(x) {
  // water on the island cell's edge that faces the coast cell
  const f = `${root}/${x.extends.territory}/${x.extends.id}/${x.extends.id}-l2.png`;
  if (!fs.existsSync(f)) return [];
  const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, bleed = Math.round((W - KEPT) / 2);
  const edge = { S: "top", N: "bottom", E: "left", W: "right" }[x.island];   // the island cell's edge that touches the coast cell
  const along = edge === "top" || edge === "bottom";
  const line = edge === "bottom" || edge === "right" ? bleed + KEPT : bleed;
  const runs = []; let start = null;
  for (let i = 0; i < KEPT; i += 1) {
    let mn = 255;
    for (let d = -8; d <= 8; d += 1) {
      const [px, py] = along ? [bleed + i, line + d] : [line + d, bleed + i];
      if (px < 0 || py < 0 || px >= W || py >= W) continue;
      mn = Math.min(mn, data[(py * W + px) * 4 + 3]);
    }
    const wet = mn < 128;
    if (wet && start === null) start = i;
    if (!wet && start !== null) { runs.push([start, i - 1]); start = null; }
  }
  if (start !== null) runs.push([start, KEPT - 1]);
  return runs.filter(([a, b]) => b - a + 1 >= 30).map(([a, b]) => ({ pct: Math.round((a + b) / 2 / KEPT * 100), m: Math.round((b - a) / KEPT * 97.6) }));
}

const PERSPECTIVE = {
  north: `**Perspective.** This is the island's NORTH shore, and the world is seen from
the south-south-east, so this shore is seen from BEHIND: no cliff face shows.
What shows is the ground running to a rim of broken column tops, the rim
itself as a thin band of pale rock, and the sea beyond it. Do not draw a
cliff face looking at the viewer here — that would be a cliff facing south.`,
  south: `**Perspective.** This is a SOUTH shore seen from the south-south-east: the
cliff faces the viewer and its columns show full height, talus at the foot,
surf at the base.`,
  west: `**Perspective.** This is the island's WEST shore seen from the south-south-east:
the faces of its south-looking bays show their columns; faces that look north
are hidden behind their own rim. The shoreline runs roughly north-south, so
draw it as a wandering edge of column tops with the sea to the west.`,
  east: `**Perspective.** This is the island's EAST shore seen from the south-south-east:
the faces of its south-looking bays show their columns; north-looking faces
hide. The shoreline runs roughly north-south with the sea to the east.`,
};

const LIGHTING = `

---

**This world has no sun.** Flat ambient light only: every rock face, column,
bank and tussock the SAME VALUE on every side. No lit side, no shaded side, no
cast or contact shadows, nothing that says which way light comes from. Depth
comes from ambient occlusion in crevices, never from a key light.

**Match the neighbour brightness**, not only its colour. Where authored paint
reaches into this cell, if its ground is darker or paler than you would paint
it, the neighbour is right.`;

// per-cell notes from the owner's review of refused candidates
const NOTES = {
  "c3-0": `**Distance, hard.** The plateau ends between 15 and 40 m north of the south
edge — never more. From 40 m on, everything is sea. The previous candidate
carried the plateau nearly the whole cell as a blank slab; that is wrong.`,
  // owner 2026-09-05: "this spot needs to be coastal" — N c0-2's west edge;
  // then his outline of the fill area (07:30): the first candidate built
  // headlands over two thirds of the seam and closed the bay
  "c1-3": `**Two small headlands and an open bay — hard.** The island's ground reaches
your EAST edge in two places only: a strip about 2 m long at the very top of
the edge, and the sandy beach in the bottom 10 m. Everything between — 88 m
of the edge — is the bay's OPEN WATER, and it stays open water at the seam
and runs straight out west into the sea. Carry each strip out as a LOW
headland no wider at the seam than it arrives (2 m at the top, 10 m at the
bottom), 15-40 m long, tapering to broken column tops and a shingle foot.
The first candidate put columns across a third of the bay at each end; that
is wrong. No rock and no beach anywhere across the bay's mouth.`,
  // owner 2026-09-05 07:30 (the same outline): the bay mouth at N c0-1's west
  // edge is open water, not the cliff the first candidate painted over it
  "c1-2": `**The bay's mouth is open water — hard.** N c0-1's bay arrives across your
EAST edge 53 m wide, centred 73% of the way down: at the seam it is OPEN
WATER, and it runs out west into the sea with nothing across its mouth — no
rock, no beach, no stack in the gap. The island's ground arrives only ABOVE
the bay (the upper 45% of the edge): carry that out as a headland 15-40 m
long, ending in broken column tops, with the bay's water lapping its south
foot. The first candidate painted cliff across the mouth; that is wrong.`,
  // owner 2026-09-05 07:30: "C7-0 thought needs a regen" — the first
  // candidate met c6-0's sea and ended its four inlets at the seam
  "c7-0": `**Four inlets, open — hard.** c6-0's coast reaches your WEST edge as sea in
the top 22% and then FOUR inlets at 33%, 55%, 72% and 91% of the way down.
Each inlet is OPEN WATER at the seam and continues into this cell as a cove
that opens to the sea; the land between the inlets continues 15-40 m as low
headlands and ends. The first candidate met only the sea and walled off the
inlets; that is wrong. Your south edge meets the shore cell below (c7-1):
carry the shoreline down to it, not across it.`,
  // owner 2026-09-05 07:30, crop 1: the fill line from c0-6's corner up to
  // T c0-0's west edge
  "c0-5": `**A headland down to c0-6.** T c0-0's cliffs arrive across the bottom 15% of
your EAST edge (the rest of that edge is T c0-0's own sea). Carry them west
15-40 m as one headland of columns that turns south and runs down to your
SOUTH edge, where the shore cell c0-6 continues it — the owner drew this fill
as one line from c0-6's north-west corner up to T c0-0's edge. Everything
north and west of that line is open sea.`,
  // owner 2026-09-05 07:30, crop 3: the diagonal fill from c1-1's corner to
  // c2-0's corner — the north-west corner of the island
  "c1-0": `**The corner, on a diagonal.** c2-0's plateau arrives across most of your
EAST edge (86% of it, from 14% down), and the shore cell c1-1 lies to your
SOUTH with its land at its north edge. The owner drew the coast here as one
straight diagonal from your south-west corner to your north-east corner:
land south-east of that line, continuing c2-0's ground and c1-1's, ending
in a rim of broken column tops along the diagonal; open sea north-west of
it. This is the island's north-west corner: the north-facing part of the rim
is seen from behind (no face), the west-facing part shows its columns.`,
  // owner 2026-09-05 07:30, crop 4: one convex bulge across c8-5 and c8-6
  "c8-5": `**A rounded bulge.** T c6-0's ground arrives over the lower 40% of your WEST
edge (from 63% down) and touches it in two small spots higher up. The owner
drew the fill as ONE convex bulge of land starting 60% of the way down T
c6-0's edge, swelling 15-40 m east into this cell, and coming back to T
c6-1's cliff at the top of the cell below (c8-6). So: a rounded headland,
widest at your south edge, its rim of broken column tops facing east and
south; open sea north of it and east of it.`,
  "c8-6": `**The bulge closes; then the chain's end.** The rounded headland from c8-5
above comes down across your NORTH edge and closes back onto T c6-1's cliff,
which arrives across the top 19% of your WEST edge. Below that, T c6-1's
cliff face runs down the seam: continue it as a sea cliff with talus at its
foot and, 20-40 m out, the stack the rune chain's last line cuts across —
c6-1 is the chain's seaward end. Open sea east and south.`,
  "c8-4": `**The corner north-east of T c6-0.** The shore cell c7-4 lies to your WEST
and c8-5 to your SOUTH; T c6-0's north-east corner touches your south-west
corner. Carry their shorelines round this corner as one line — a low rim of
column tops turning from north-facing to east-facing — and leave the rest
open sea.`,
};

let n = 0;
for (const x of def.coastCells) {
  const id = `c${x.at[0]}-${x.at[1]}`;
  const islandBiomeId = JSON.parse(fs.readFileSync(`${root}/${x.extends.territory}/territory.def.json`, "utf8")).cellBiomes[x.extends.id.slice(1).replace("-", ",")];
  // a coast cell can extend another coast cell (the corner beyond c6-0): its
  // biome lives in the coast plan, not the canon
  if (!canon[islandBiomeId] && fs.existsSync(`${root}/coast/plan.json`)) {
    const cb = JSON.parse(fs.readFileSync(`${root}/coast/plan.json`, "utf8")).biomes;
    if (cb[islandBiomeId]) canon[islandBiomeId] = cb[islandBiomeId];
  }
  const islandBiome = canon[islandBiomeId]?.name || islandBiomeId;
  const sideName = { S: "SOUTH", N: "NORTH", E: "EAST", W: "WEST" }[x.island];
  const seaSides = ["NORTH", "SOUTH", "EAST", "WEST"].filter((s) => s !== sideName);
  const water = await arrivals(x);
  const waterText = water.length
    ? `\n\n**Water arriving across the ${sideName} edge**, measured off the island's art:\n${water.map((w) => `- at **${w.pct}% along that edge**, about ${w.m} m wide — meet it and let it reach the sea`).join("\n")}`
    : "";
  const owner = x.extends.territory === "ninjaone" ? "NinjaOne's" : x.extends.territory === "tanium" ? "Tanium's" : "the coast's own";
  const brief = `THE ${x.shore.toUpperCase()} SHORE beside ${owner} ${x.extends.id} (${islandBiome}).

The island lies to the ${sideName}. Its ground — ${canon[islandBiomeId]?.ground || islandBiomeId} —
arrives across your ${sideName} edge as real paint. **Continue it exactly as it
arrives** for 15-40 m into this cell, the distance varying along the edge so
the shoreline wanders, and end it at the shore: weathered columnar basalt,
columns of uneven height, tops broken at different levels, collapsed drums in
talus at the foot, a shingle cove or two where the ground comes down low. Beyond
the shore, the rest of this cell is OPEN SEA: surf and wash at the rock, one or
two small stacks or skerries close in, nothing else.

${PERSPECTIVE[x.shore]}

No meadow, no flowers, no structures. Dark conifers only where they arrive
from the island. Carry land only across the ${sideName} edge; the ${seaSides.join(", ")} edges are sea.${waterText}`;
  fs.writeFileSync(`${root}/coast/briefs/${id}.md`, brief + (NOTES[id] ? `\n\n${NOTES[id]}` : "") + LIGHTING + "\n");
  n += 1;
  console.log(`  ${id}: ${x.shore} shore beside ${x.extends.territory} ${x.extends.id} (${islandBiomeId}), ${water.length} water arrival(s)`);
}
console.log(`wrote ${n} coast briefs`);
