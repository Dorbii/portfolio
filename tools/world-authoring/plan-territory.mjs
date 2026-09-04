import sharp from "sharp";
import fs from "node:fs";

// Territory plan — generic over territories.
//
//   node tools/world-authoring/plan-territory.mjs <territory-id>
//
// Fine-first means we do NOT draw an island's shape. We allocate a block of
// authoring cells on the world lattice, designate the settlement shelves and
// the rail loop that serves them, and let the coastline emerge from what the
// art actually draws inside that block.
//
// A cell is an authoring unit: 2048px of kept area, generated at 2560px so a
// 256px bleed overlaps its neighbours. Boundaries interlock with tabs so the
// seam network has no straight lines and no four-way junctions.
//
// WHAT LIVES WHERE (owner 2026-09-03: "we gotta make this workflow re-usable
// since it worked for the ninja territory"). This script holds the WORLD
// CANON — the constants, the biome vocabulary, the geology/vegetation/water/
// buildable/rail/lighting/register rules, and the checks. It is the part the
// lock exists to protect, and it is identical for every territory.
//
// A territory's CONTENT — how many cells, where the block sits on the lattice,
// the shelves, the loop, the rail features, the per-cell biomes, the interior
// sites, and any territory-specific rule — lives in a data file beside the
// plan it produces:
//
//   art-source/career-world/l2-land/<id>/territory.def.json
//
// That is the one input only a human can supply, so there is deliberately no
// default and no way to run without it.

const TERRITORY = process.argv[2];
if (!TERRITORY || TERRITORY.startsWith("-")) {
  console.error(`
  usage: node tools/world-authoring/plan-territory.mjs <territory-id>

  Reads art-source/career-world/l2-land/<territory-id>/territory.def.json
  and writes plan.json and plan-review.png beside it.
`);
  process.exit(1);
}

const OUT = `art-source/career-world/l2-land/${TERRITORY}/`;
const DEF = OUT + "territory.def.json";
if (!fs.existsSync(DEF)) {
  console.error(`\n  no territory definition at ${DEF}\n`
    + `  A territory's cells, shelves, loop and biomes are content. Write that file first.\n`);
  process.exit(1);
}
const def = JSON.parse(fs.readFileSync(DEF, "utf8"));
if (def.territory !== TERRITORY) {
  throw new Error(`${DEF} says territory "${def.territory}" but was asked for "${TERRITORY}"`);
}
fs.mkdirSync(OUT, { recursive: true });

const CELL = 2048;              // kept area, px
const BLEED = 256;              // overlap into each neighbour
const ART = 9.45;               // art px per world px
const M = 0.4503;               // metres per world px
const COLS = def.grid.cols, ROWS = def.grid.rows;

// The world plane is 16 x 9 lattice cells of 217 world px. A territory block is
// placed on that lattice, and must fit inside it.
const PLANE_COLS = 16, PLANE_ROWS = 9;
const BLOCK = def.lattice.block;

const cellMetres = CELL / ART * M;
console.log(`territory ${TERRITORY}`);
console.log(`cell ${CELL}px = ${cellMetres.toFixed(1)} m of ground`);
console.log(`territory ${COLS}x${ROWS} = ${COLS * ROWS} cells = `
  + `${(COLS * cellMetres).toFixed(0)} x ${(ROWS * cellMetres).toFixed(0)} m`);
console.log(`block at lattice cell [${BLOCK}] .. [${BLOCK[0] + COLS - 1}, ${BLOCK[1] + ROWS - 1}]\n`);

// Settlement shelves, in cell coordinates (col,row) with a sub-cell offset.
// An `off` is the shelf's CENTRE — this script draws it as a circle centred
// there, and anything registering content onto a shelf must centre it the same
// way. (A session was lost to aligning a district by a point on its south edge
// instead, which carried it 32 m off the shelf.)
const SHELVES = def.shelves;

// The rail loop: a closed circuit leaving the capital, calling at each project
// city, and returning. Waypoints in cell space. Terrain must offer theatre
// along it, not gentle gradients.
const LOOP = def.loop;
const FEATURES = def.railFeatures;

// Biomes (owner-directed 2026-09-01: "set biome areas on the grid so even if
// its a biome transition it can handle it correctly and with appropriate
// assets"). One vocabulary per biome, quoted verbatim into every packet, and
// one biome per cell. The hand (brush, projection, flat lighting) is
// world-wide and comes from the neighbours' paint; the biome sets what is
// painted and the palette shift.
const BIOMES = {
  "bare-plateau": { name: "Bare plateau",
    ground: "bare pale basalt benches with hexagonal-jointed tops, scree fans, thin wind-scoured grass only in cracks; no meadow",
    rock: "pale warm basalt, stepped benches and low column walls, talus at every foot",
    trees: "none on the open plateau; a few dark conifers in gullies",
    water: "tarns lying in bare rock; thin tall falls off the bench edges",
    palette: "pale warm greys and creams, cool teal water, sparse grey-green",
    wonders: "none" },
  "moor": { name: "Heather moor",
    ground: "open heather-and-grass moor, wind-scoured, boulders and scrub; heather sparse and subdued, never a carpet",
    rock: "low basalt outcrops and boulder fields, an occasional column wall",
    trees: "dark conifers only in gullies and hollows",
    water: "becks in shallow gullies, small pools",
    palette: "olive and gold-green, dull violet accents, grey rock",
    wonders: "none" },
  "dark-forest": { name: "Dark forest gorge",
    ground: "dense dark conifer stands on mossy ground, little open ground, flat haze in the gorge",
    rock: "mossy basalt gorge walls, wet talus",
    trees: "dense dark conifers, the darkest green in the territory",
    water: "a gorge stream with falls, pools in shade",
    palette: "deep greens, near-black under the stands, grey-blue haze",
    wonders: "none" },
  "coast-cliff": { name: "Wild coast",
    ground: "bare basalt benches and talus above sea-cliffs, thin grass, shingle coves; no meadow",
    rock: "tall columnar sea-cliffs, WEATHERED and irregular: columns of uneven height and width, tops broken at different levels, split and leaning columns, collapsed drums lying in talus at the foot, lichen in the joints; the cliff line wanders in plan with bays and buttresses, never a straight run or a square corner, never a regular palisade of identical cylinders (this is ordinary coast, where regularity would be an accident — the linked-colonnade biome is the deliberate exception and says so); a natural ledge partway up the face; sea stacks offshore",
    trees: "dark conifers only in gullies",
    water: "the sea on the seaward edge with surf and wash; an occasional tarn on a shelf",
    palette: "pale grey rock, teal to deep-blue sea, sparse green",
    wonders: "none" },
  "sound-coast": { name: "Sound coast",
    ground: "bare rock diving into the sound, shingle, thin grass",
    rock: "low basalt slabs and ledges running on under the water",
    trees: "none near the shore",
    water: "the sound (sea) on the seaward edge, clear shallows over slabs",
    palette: "grey slabs, turquoise shallows to deep teal",
    wonders: "none" },
  "quarry": { name: "Construction quarry",
    ground: "cut benches, quarried faces, spoil fans, a levelled floor; works read from landform only",
    rock: "fresh pale cut rock and column walls",
    trees: "a few dark conifers on the rim and in the drainage gully",
    water: "a flooded pit, the drainage stream, the sea where coastal",
    palette: "pale cut rock, dust, a thin green rim",
    wonders: "none" },
  "mixed-bench": { name: "Bench country",
    ground: "stepped benches and terraces, scree, moor on the flats",
    rock: "column walls between benches, talus",
    trees: "conifer stands on the sheltered benches",
    water: "becks stepping down the benches",
    palette: "moor palette with pale rock",
    wonders: "none" },
  "lush-shelf": { name: "Settlement shelf",
    ground: "the richest ground in its neighbourhood: meadow green warmed with gold, glades, flowers allowed here",
    rock: "low outcrops and natural terraces that a settlement could sit on",
    trees: "orchard-like conifer stands with open glades",
    water: "a stream through the shelf, a pool",
    palette: "luminous gold-green, warm rock",
    wonders: "none" },
  "magical-gorge": { name: "Magical gorge (moment)",
    ground: "a deep gorge with flat mist; the ground around it is moor",
    rock: "column walls; rock fragments floating above the gorge trailing roots and moss",
    trees: "dark conifers",
    water: "a great fall into faintly glowing water",
    palette: "moor palette plus violet crystal glow and luminous teal",
    wonders: "floating rock fragments with crystals; self-luminous crystal outcrops that cast no light; faintly glowing water at the fall" },
  "purple-field": { name: "The purple field (unique)",
    ground: "a saturated magenta-violet carpet of grass and low bloom on magenta soil filling the whole cell; tufts of pale lavender-blue grass; clumps of gold, orange, red and pale-blue flowering shrubs",
    rock: "a crystal-crowned knoll rising from the field; low outcrops",
    trees: "pink-blossom broadleaf trees standing in the field; dark conifers only at the edges",
    water: "a beck through the field",
    palette: "saturated magenta-violet ground, high-key and bright, purple as the base and the other hues as accents",
    wonders: "the crystal knoll; nothing floating" },
  "linked-colonnade": { name: "The linked colonnade (unique)",
    ground: "a narrow cliff-top bench of thin grass and bare rock running the length of the cell, deliberately plain and quiet: the colonnade is the only event here and nothing else competes with it",
    rock: "THE ONE PLACE IN THIS WORLD WITH DELIBERATE ORDER, and it must be drawn as order — the geology rule's ban on a regular palisade governs regularity that arrives by accident, and this is asked for. Basalt columns that ALL LEAN THE SAME WAY, each touching the next at the top, joined into one unbroken arcade that runs the whole length of the cliff, leaves the land at the shore and continues as a line of linked sea stacks out past the edge of the authored world. Caught mid-topple, as though a single wave passed through the rock and stayed. Every column the same height and girth as its neighbours: none larger, none singled out, NOTHING STANDING AT THE MIDDLE — the chain has no centre and that must be visible. You can walk under the arcade. Do not weather this back into an irregular cliff; the ordinary cliffs elsewhere are what make it read",
    trees: "none on the bench; a few dark conifers in the gullies behind it",
    water: "the sea below the arcade, surf breaking between the stacks and through the arches",
    palette: "pale warm basalt against deep teal sea; the arcade reads by the gaps between its columns, not by shading",
    wonders: "the colonnade itself — an unbroken chain of equal columns, each joined only to the next, all leaning one way, running on past the horizon" },
};

// col,row -> biome, from the territory definition
const CELL_BIOMES = def.cellBiomes;

// Interior sites (owner, 2026-09-01: "populate with small settlements or misc
// attractions/areas just to make it feel alive and not like a barren/
// uninhabited area"). L2 offers the GROUND for each; the structures layer
// builds on it later — the same split as the settlement shelves, at village
// scale. Terrain descriptions only; nothing is drawn on them.
const SITES = def.sites;

// ---- checks. A territory that fails any of these is not authorable.
if (!(COLS > 0 && ROWS > 0)) throw new Error("grid must have positive cols and rows");
if (BLOCK[0] < 0 || BLOCK[1] < 0
  || BLOCK[0] + COLS > PLANE_COLS || BLOCK[1] + ROWS > PLANE_ROWS) {
  throw new Error(`block [${BLOCK}] + ${COLS}x${ROWS} does not fit the `
    + `${PLANE_COLS}x${PLANE_ROWS} plane`);
}
for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
  const b = CELL_BIOMES[`${c},${r}`];
  if (!b || !BIOMES[b]) throw new Error(`cell ${c},${r} has no valid biome`);
}
if (Object.keys(CELL_BIOMES).length !== COLS * ROWS) {
  throw new Error(`cellBiomes has ${Object.keys(CELL_BIOMES).length} entries for ${COLS * ROWS} cells`);
}
const inGrid = ([c, r]) => c >= 0 && r >= 0 && c <= COLS && r <= ROWS;
for (const s of SITES) {
  if (!CELL_BIOMES[`${s.cell[0]},${s.cell[1]}`]) throw new Error(`site ${s.id} is outside the grid`);
}
for (const s of SHELVES) {
  if (!CELL_BIOMES[`${s.cell[0]},${s.cell[1]}`]) throw new Error(`shelf ${s.id} is outside the grid`);
  if (!(s.off[0] >= 0 && s.off[0] <= 1 && s.off[1] >= 0 && s.off[1] <= 1)) {
    throw new Error(`shelf ${s.id} has an off outside the cell`);
  }
}
for (const [i, p] of LOOP.entries()) {
  if (!inGrid(p)) throw new Error(`loop waypoint ${i} [${p}] is outside the grid`);
}
for (const f of FEATURES) {
  if (!inGrid(f.at)) throw new Error(`rail feature "${f.kind}" is outside the grid`);
}
if (LOOP.length > 1) {
  const a = LOOP[0], z = LOOP[LOOP.length - 1];
  if (a[0] !== z[0] || a[1] !== z[1]) throw new Error("the rail loop must close on its first waypoint");
}
if (!SHELVES.some((s) => s.id === "capital")) throw new Error("a territory needs a capital shelf");

// World canon. Identical for every territory; a territory may add to `rail`
// through railAddendum and may supply its own border rules.
const RULES_CANON = {
    geology: "columnar basalt, bedded and jointed, talus at cliff bases; plateau-and-gorge — columns are a feature where the biome says so, not the ground everywhere. Columns are WEATHERED and irregular wherever they appear: uneven heights and widths, broken tops, split and leaning columns, collapsed drums in talus, lichen in the joints; never a regular palisade of identical cylinders, never a square corner (owner, 2026-09-01: 'the cliff side is unnatural'). THAT BAN IS ON REGULARITY THAT ARRIVES BY DEFAULT, NOT ON ORDER THAT IS ASKED FOR (owner, 2026-09-03: 'thats only true if unintentional'). Where a biome or a site explicitly calls for regular, ordered or repeating columns, that order is the whole point: draw it exactly as specified and do not weather it back into an irregular cliff. The rule above governs everything that was not asked for, which is almost all of the world — that is what makes the exceptions read as wonders.",
    vegetation: "conifer in gullies and shelter, thinning on exposed rock; scrub and heather on open ground; crowns 4-7 m; the biome sets the mix",
    water: "coastal cliff and shingle seaward; inland tarns on shelves draining by falls into gorges",
    buildable: "~1/3 occupiable shelf, separated by gorges and broken ground so settlements read distinct",
    rail: "fantasy railway: tunnels, improbable spans and submerged runs permitted; land supplies the drama, not the gradient.",
    lighting: "flat: every rock face the same value whichever way it faces; ambient occlusion only; no directional key, no lit side, no cast shadows",
    register: "OWNER RULING 2026-09-01: epic, fantastical, light-toned fantasy register — luminous and hopeful, never grim; scenery varies by biome so wonders read as wonders",
};

// Fixed order so a rule always appears in the same place in every plan.
const RULE_ORDER = ["geology", "vegetation", "water", "buildable", "rail",
  "lighting", "northBorder", "southBorder", "eastBorder", "westBorder", "register"];
const rules = {};
{
  const merged = { ...RULES_CANON };
  if (def.rules?.railAddendum) merged.rail = `${RULES_CANON.rail} ${def.rules.railAddendum}`;
  for (const [k, v] of Object.entries(def.rules ?? {})) {
    if (k === "railAddendum") continue;
    merged[k] = v;
  }
  for (const k of RULE_ORDER) if (merged[k] !== undefined) rules[k] = merged[k];
  for (const k of Object.keys(merged)) {
    if (!(k in rules)) throw new Error(`rule "${k}" is not in RULE_ORDER; add it in the right place`);
  }
}

const plan = {
  territory: TERRITORY,
  grid: { cols: COLS, rows: ROWS, cells: COLS * ROWS },
  cell: { keptPx: CELL, generatedPx: CELL + BLEED * 2, bleedPx: BLEED,
    groundMetres: +cellMetres.toFixed(1) },
  territoryMetres: [+(COLS * cellMetres).toFixed(0), +(ROWS * cellMetres).toFixed(0)],
  shelves: SHELVES, loop: LOOP, railFeatures: FEATURES,
  biomes: BIOMES, cellBiomes: CELL_BIOMES, sites: SITES,
  rules,
};
fs.writeFileSync(OUT + "plan.json", JSON.stringify(plan, null, 1));

// review render
const S = 240;                    // px per cell in the review image
const W = COLS * S, H = ROWS * S;
const svg = [];
svg.push(`<rect width="${W}" height="${H}" fill="#141821"/>`);
const BIOME_COLOUR = {
  "bare-plateau": "#5a5650", "moor": "#4d5a2e", "dark-forest": "#1f3a2a", "coast-cliff": "#3d4f5c",
  "sound-coast": "#2e5566", "quarry": "#6b6250", "mixed-bench": "#4f5a3c", "lush-shelf": "#5f7a2a",
  "magical-gorge": "#4a3566", "purple-field": "#7a2f7a", "linked-colonnade": "#8d8b80",
};
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const bid = CELL_BIOMES[`${c},${r}`];
    svg.push(`<rect x="${c * S}" y="${r * S}" width="${S}" height="${S}" `
      + `fill="${BIOME_COLOUR[bid] || "#141821"}" stroke="#2f3946" stroke-width="2"/>`);
    svg.push(`<text x="${c * S + 8}" y="${r * S + 20}" fill="#c9d2dc" `
      + `font-family="monospace" font-size="14">${c},${r}</text>`);
    svg.push(`<text x="${c * S + 8}" y="${r * S + S - 12}" fill="#e6ecf2" `
      + `font-family="Georgia,serif" font-size="14">${bid}</text>`);
  }
}
const P = ([c, r]) => [c * S, r * S];
svg.push(`<polyline points="${LOOP.map((p) => P(p).join(",")).join(" ")}" `
  + `fill="none" stroke="#e0b64a" stroke-width="5" stroke-linejoin="round"/>`);
for (const f of FEATURES) {
  const [x, y] = P(f.at);
  svg.push(`<circle cx="${x}" cy="${y}" r="9" fill="none" stroke="#6ec8ff" stroke-width="3"/>`);
  svg.push(`<text x="${x + 14}" y="${y + 4}" fill="#8fd4ff" font-family="Georgia,serif" font-size="15">${f.kind}</text>`);
}
for (const s of SHELVES) {
  const [x, y] = P([s.cell[0] + s.off[0], s.cell[1] + s.off[1]]);
  const rad = s.id === "capital" ? 26 : 17;
  svg.push(`<circle cx="${x}" cy="${y}" r="${rad}" fill="#1d2a1d" stroke="#8fe06a" stroke-width="3"/>`);
  svg.push(`<text x="${x + rad + 6}" y="${y + 5}" fill="#b7f090" font-family="Georgia,serif" font-size="17">${s.id}</text>`);
}
await sharp(Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${svg.join("")}</svg>`))
  .png().toFile(OUT + "plan-review.png");

console.log("shelves:");
for (const s of SHELVES) console.log(`  ${s.id.padEnd(17)} cell ${s.cell.join(",")}  ${s.role}`);
console.log("\nrail features around the loop:");
for (const f of FEATURES) console.log(`  ${f.kind.padEnd(20)} ${f.note}`);
console.log("\nbiomes by row:");
for (let r = 0; r < ROWS; r++) console.log(`  row ${r}: ` + Array.from({ length: COLS }, (_, c) => CELL_BIOMES[`${c},${r}`].padEnd(14)).join(" "));
console.log(`\nplan -> ${OUT}plan.json`);
console.log(`review -> ${OUT}plan-review.png`);
