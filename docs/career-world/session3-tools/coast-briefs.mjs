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
  const brief = `THE ${x.shore.toUpperCase()} SHORE beside ${x.extends.territory === "ninjaone" ? "NinjaOne" : "Tanium"}'s ${x.extends.id} (${islandBiome}).

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
