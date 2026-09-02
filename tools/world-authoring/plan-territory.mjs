import sharp from "sharp";
import fs from "node:fs";

// NinjaOne territory plan.
//
// Fine-first means we do NOT draw the island's shape. We allocate a block of
// authoring cells, designate the five settlement shelves and the rail loop that
// serves them, and let the coastline emerge from what the art actually draws
// inside that block.
//
// A cell is an authoring unit: 2048px of kept area, generated at 2560px so a
// 256px bleed overlaps its neighbours. Boundaries interlock with tabs so the
// seam network has no straight lines and no four-way junctions.

// The plan is what every cell derives from, so it lives beside the cell
// sources and is committed (it was gitignored scratch until 2026-09-01).
const OUT = "art-source/career-world/l2-land/ninjaone/";
fs.mkdirSync(OUT, { recursive: true });

const CELL = 2048;              // kept area, px
const BLEED = 256;              // overlap into each neighbour
const ART = 9.45;               // art px per world px
const M = 0.4503;               // metres per world px
const COLS = 5, ROWS = 4;       // 20 cells; budget was ~21

const cellMetres = CELL / ART * M;
console.log(`cell ${CELL}px = ${cellMetres.toFixed(1)} m of ground`);
console.log(`territory ${COLS}x${ROWS} = ${COLS * ROWS} cells = `
  + `${(COLS * cellMetres).toFixed(0)} x ${(ROWS * cellMetres).toFixed(0)} m\n`);

// Settlement shelves, in cell coordinates (col,row) with a sub-cell offset.
// Placed so the loop has to travel and the settlements do not crowd.
const SHELVES = [
  { id: "capital", cell: [2, 1], off: [0.45, 0.55], role: "capital + main station" },
  { id: "kaizen", cell: [4, 0], off: [0.40, 0.60], role: "project city (largest)" },
  { id: "metrics-service", cell: [0, 1], off: [0.55, 0.35], role: "project city" },
  { id: "vendy", cell: [1, 3], off: [0.50, 0.40], role: "project city" },
  { id: "construction", cell: [4, 3], off: [0.45, 0.45],
    role: "construction zone — project not yet named",
    terrain: "cut benches, quarried faces, exposed rock; works-in-progress read from LANDFORM only, no structures" },
];

// The Circle CI loop: a closed double-track circuit leaving the capital,
// calling at each project city, and returning. Waypoints in cell space.
// Terrain must offer theatre along it, not gentle gradients -- it is a fantasy
// railway and may tunnel, span improbably, or run submerged.
const LOOP = [
  [2.45, 1.55], [3.5, 1.2], [4.4, 0.6],       // capital -> kaizen
  [4.7, 1.8], [4.45, 3.45],                    // kaizen -> fourth (east cliff run)
  [3.0, 3.7], [1.5, 3.4],                      // fourth -> vendy (south)
  [0.4, 2.6], [0.55, 1.35],                    // vendy -> metrics (west)
  [1.4, 1.1], [2.45, 1.55],                    // metrics -> capital, closing
];

const FEATURES = [
  { at: [3.5, 1.2], kind: "gorge span", note: "viaduct between capital and kaizen" },
  { at: [4.7, 1.8], kind: "tunnelled headland", note: "line enters the rock" },
  { at: [4.45, 3.45], kind: "cliff run", note: "track on a ledge above the sea" },
  { at: [1.5, 3.4], kind: "water crossing", note: "loop crosses an inlet" },
  { at: [0.4, 2.6], kind: "submerged run", note: "line dives and runs beneath the water on the south-west" },
];

// Biomes (owner-directed 2026-09-01: "set biome areas on the grid so even if
// its a biome transition it can handle it correctly and with appropriate
// assets"). One vocabulary per biome, quoted verbatim into every packet, and
// one biome per cell from the owner-reviewed scenery variance map. The hand
// (brush, projection, flat lighting) is territory-wide and comes from the
// neighbours' paint; the biome sets what is painted and the palette shift.
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
    rock: "tall columnar sea-cliffs, WEATHERED and irregular: columns of uneven height and width, tops broken at different levels, split and leaning columns, collapsed drums lying in talus at the foot, lichen in the joints; the cliff line wanders in plan with bays and buttresses, never a straight run or a square corner, never a regular palisade of identical cylinders; a natural ledge partway up the face; sea stacks offshore",
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
};
// col,row -> biome (owner-reviewed scenery variance map, 2026-09-01)
const CELL_BIOMES = {
  "0,0": "moor", "1,0": "bare-plateau", "2,0": "dark-forest", "3,0": "bare-plateau", "4,0": "lush-shelf",
  "0,1": "lush-shelf", "1,1": "purple-field", "2,1": "lush-shelf", "3,1": "magical-gorge", "4,1": "coast-cliff",
  "0,2": "sound-coast", "1,2": "moor", "2,2": "mixed-bench", "3,2": "dark-forest", "4,2": "coast-cliff",
  "0,3": "sound-coast", "1,3": "lush-shelf", "2,3": "moor", "3,3": "moor", "4,3": "quarry",
};
for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
  const b = CELL_BIOMES[`${c},${r}`];
  if (!b || !BIOMES[b]) throw new Error(`cell ${c},${r} has no valid biome`);
}

const plan = {
  territory: "ninjaone",
  grid: { cols: COLS, rows: ROWS, cells: COLS * ROWS },
  cell: { keptPx: CELL, generatedPx: CELL + BLEED * 2, bleedPx: BLEED,
    groundMetres: +cellMetres.toFixed(1) },
  territoryMetres: [+(COLS * cellMetres).toFixed(0), +(ROWS * cellMetres).toFixed(0)],
  shelves: SHELVES, loop: LOOP, railFeatures: FEATURES,
  biomes: BIOMES, cellBiomes: CELL_BIOMES,
  rules: {
    geology: "columnar basalt, bedded and jointed, talus at cliff bases; plateau-and-gorge — columns are a feature where the biome says so, not the ground everywhere. Columns are WEATHERED and irregular wherever they appear: uneven heights and widths, broken tops, split and leaning columns, collapsed drums in talus, lichen in the joints; never a regular palisade of identical cylinders, never a square corner (owner, 2026-09-01: 'the cliff side is unnatural')",
    vegetation: "conifer in gullies and shelter, thinning on exposed rock; scrub and heather on open ground; crowns 4-7 m; the biome sets the mix",
    water: "coastal cliff and shingle seaward; inland tarns on shelves draining by falls into gorges",
    buildable: "~1/3 occupiable shelf, separated by gorges and broken ground so settlements read distinct",
    rail: "fantasy railway: tunnels, improbable spans and submerged runs permitted; land supplies the drama, not the gradient. The south-west leg runs SUBMERGED, so that coast must open into water the line can dive beneath.",
    lighting: "flat: every rock face the same value whichever way it faces; ambient occlusion only; no directional key, no lit side, no cast shadows",
    southBorder: "OWNER RULING 2026-09-01: NinjaOne and Tanium share BOTH a land and an ocean border. Cells 0,3 and 1,3: the south edge opens into a SOUND (ocean border - the inlet crossing and submerged run live here). Cells 2,3 and 3,3: the south edge is LAND that continues into Tanium territory (land border) - terrain must run to the south edge as solid connecting ground, no coast. Cell 4,3: south-east bay, sea as authored.",
    register: "OWNER RULING 2026-09-01: epic, fantastical, light-toned fantasy register — luminous and hopeful, never grim; scenery varies by biome so wonders read as wonders",
  },
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
  "magical-gorge": "#4a3566", "purple-field": "#7a2f7a",
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
