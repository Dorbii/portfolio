// The COAST territory: the sea cells beside the island's placed art, where the
// coasts are authored (owner 2026-09-04: "generate those in the tiles next to
// the placed art ... not replacing those tiles just extending them into the
// neighbor to transition better").
//
// It is a sparse territory: one 9x9 block at lattice [1,0] covering the whole
// island plus a one-cell margin, with only the margin cells planned. The
// planner (plan-territory.mjs) requires a capital shelf, a closed rail loop and
// a biome in every cell, none of which a coast has, so this script writes the
// definition AND the plan directly — copying the WORLD CANON (the biome
// vocabulary and the rules) verbatim from the planner's own Tanium output, so
// nothing in the canon is restated by hand. The island's cells are mirrored
// into cellBiomes at their world positions so a coast cell's transitions name
// the right arriving biome.
//
//   node docs/career-world/session3-tools/coast-plan.mjs
import fs from "node:fs";
const root = "art-source/career-world/l2-land";
const ninja = JSON.parse(fs.readFileSync(`${root}/ninjaone/territory.def.json`, "utf8"));
const tan = JSON.parse(fs.readFileSync(`${root}/tanium/territory.def.json`, "utf8"));
const canon = JSON.parse(fs.readFileSync(`${root}/tanium/plan.json`, "utf8"));

const BLOCK = [1, 0], COLS = 9, ROWS = 9;
const local = (t, c, r) => [t.lattice.block[0] + c - BLOCK[0], t.lattice.block[1] + r - BLOCK[1]];

// the coast cells: [local col, local row, which side of them the island lies, the island cell they extend]
const COAST = [
  ...[0, 1, 2, 3, 4].map((c) => ({ at: local(ninja, c, -1), island: "S", extends: { territory: "ninjaone", id: `c${c}-0` }, shore: "north" })),
  { at: local(ninja, -1, 0), island: "E", extends: { territory: "ninjaone", id: "c0-0" }, shore: "west" },
  { at: local(ninja, -1, 1), island: "E", extends: { territory: "ninjaone", id: "c0-1" }, shore: "west" },
  { at: local(ninja, 5, 0), island: "W", extends: { territory: "ninjaone", id: "c4-0" }, shore: "east" },
  { at: local(tan, -1, 1), island: "E", extends: { territory: "tanium", id: "c0-1" }, shore: "west" },
  // owner 2026-09-04 on the sound edge: N c1-3 "is fine"; N c0-3 "just expand to the side" —
  // the sea cell west of it, which also meets Tanium c0-0 below
  { at: local(ninja, -1, 3), island: "E", extends: { territory: "ninjaone", id: "c0-3" }, shore: "west" },
  // owner 2026-09-05 07:10, a crop of N c0-2's west edge on the night's picture:
  // "this spot needs to be coastal" — its beach and the land strip at its
  // corners run straight into open sea at world (2,3); the bay between them
  // is the only shoreline. The sea cell west of it, between c1-2 and c1-4.
  { at: local(ninja, -1, 2), island: "E", extends: { territory: "ninjaone", id: "c0-2" }, shore: "west" },
  // owner 2026-09-04 on T c3-2's south edge: "expand this one" — the row-8 sea cell below it
  { at: local(tan, 3, 3), island: "N", extends: { territory: "tanium", id: "c3-2" }, shore: "south" },
  // owner 2026-09-05, on the north-shore seams ("these parts are not good"):
  // coast c6-0 landed with its land running to its east edge; the sea cell
  // east of it (world 8,0) carries that shoreline round the corner.
  { at: [7, 0], island: "W", extends: { territory: "coast", id: "c6-0" }, shore: "east" },
];

const cellBiomes = {};
for (const [k, v] of Object.entries(ninja.cellBiomes)) { const [c, r] = k.split(",").map(Number); const [lc, lr] = local(ninja, c, r); cellBiomes[`${lc},${lr}`] = v; }
for (const [k, v] of Object.entries(tan.cellBiomes)) { const [c, r] = k.split(",").map(Number); const [lc, lr] = local(tan, c, r); cellBiomes[`${lc},${lr}`] = v; }
for (const x of COAST) {
  const key = `${x.at[0]},${x.at[1]}`;
  if (cellBiomes[key]) throw new Error(`coast cell ${key} collides with island cell ${cellBiomes[key]}`);
  if (x.at[0] < 0 || x.at[1] < 0 || x.at[0] >= COLS || x.at[1] >= ROWS) throw new Error(`coast cell ${key} outside the block`);
  cellBiomes[key] = "shore";
}

// The shore biome: wild coast in every respect but one — it has no trees of
// its own, so a treeless shore cell passes the crown gate (which accepts zero
// crowns only when the biome's trees text begins with "none"). Coast c2-0 was
// refused at 01:49 on exactly that: "0 m over 0 crowns" against coast-cliff's
// "dark conifers only in gullies".
const SHORE = {
  ...canon.biomes["coast-cliff"],
  name: "Shore",
  trees: "none of its own — only what arrives from the island's paint, continued to the shore and no further",
};

const def = {
  territory: "coast",
  note: "The sea cells beside the big island where its coasts are authored, extending NinjaOne's and Tanium's placed art into the water (owner 2026-09-04). Sparse: only the coast cells are planned; the island's cells are mirrored here from their own definitions so transitions read the right biome, and are never baked under this territory.",
  grid: { cols: COLS, rows: ROWS },
  lattice: { block: BLOCK, note: "9 x 9 on the 16 x 9 world lattice: the island (NinjaOne 5x4 at [3,1], Tanium 7x3 at [2,5]) plus a one-cell margin. Row 8 stays sea (owner 2026-09-03)." },
  coastCells: COAST,
  shelves: [], loop: [], railFeatures: [], sites: [],
  cellBiomes,
  runeChain: null,
  rules: {
    outerEdge: "OWNER RULING 2026-09-04: coasts are authored HERE, in the sea cell beside the island's placed art, never by replacing that art. The island's ground arrives across the shared edge as real pixels and is continued for 15-40 m, then ends at the shore the biome describes; the rest of the cell is open sea. Perspective (owner: 'perspective is important'): this world is a high-oblique 2.5D view from the south-south-east, so a NORTH shore is seen from behind — its cliff face is hidden under its own rim and what shows is the ground ending in a rim of broken column tops with the sea beyond; a SOUTH shore shows its full cliff face; EAST and WEST shores show the faces of their south-facing bays and hide their north-facing ones.",
  },
};
fs.mkdirSync(`${root}/coast/briefs`, { recursive: true });
fs.writeFileSync(`${root}/coast/territory.def.json`, JSON.stringify(def, null, 1));

const plan = {
  territory: "coast",
  grid: { cols: COLS, rows: ROWS, cells: COAST.length },
  cell: canon.cell, territoryMetres: canon.territoryMetres,
  shelves: [], loop: [], railFeatures: [],
  biomes: { ...canon.biomes, shore: SHORE },  // the world canon, verbatim, plus the shore
  cellBiomes,
  sites: [],
  rules: { ...canon.rules, outerEdge: def.rules.outerEdge },
};
delete plan.rules.northBorder;                 // Tanium's ruling, not the coast's
delete plan.rules.railAddendum;
fs.writeFileSync(`${root}/coast/plan.json`, JSON.stringify(plan, null, 1));
console.log(`coast: ${COAST.length} coast cells planned in a ${COLS}x${ROWS} block at [${BLOCK}]; ${Object.keys(cellBiomes).length} biomes (island mirrored)`);
for (const x of COAST) console.log(`  c${x.at[0]}-${x.at[1]}  ${x.shore} shore, extends ${x.extends.territory} ${x.extends.id} (island to the ${x.island})`);
