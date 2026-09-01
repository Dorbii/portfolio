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

const OUT = ".codex-tmp/territory/";
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

const plan = {
  territory: "ninjaone",
  grid: { cols: COLS, rows: ROWS, cells: COLS * ROWS },
  cell: { keptPx: CELL, generatedPx: CELL + BLEED * 2, bleedPx: BLEED,
    groundMetres: +cellMetres.toFixed(1) },
  territoryMetres: [+(COLS * cellMetres).toFixed(0), +(ROWS * cellMetres).toFixed(0)],
  shelves: SHELVES, loop: LOOP, railFeatures: FEATURES,
  rules: {
    geology: "columnar basalt, bedded and jointed, talus at cliff bases; plateau-and-gorge",
    vegetation: "conifer in gullies and shelter, thinning on exposed rock; scrub and heather on open ground; crowns 4-7 m",
    water: "coastal cliff and shingle seaward; inland tarns on shelves draining by falls into gorges",
    buildable: "~1/3 occupiable shelf, separated by gorges and broken ground so settlements read distinct",
    rail: "fantasy railway: tunnels, improbable spans and submerged runs permitted; land supplies the drama, not the gradient. The south-west leg runs SUBMERGED, so that coast must open into water the line can dive beneath.",
    lighting: "form shading and ambient occlusion only; no directional key, no cast shadows",
  },
};
fs.writeFileSync(OUT + "ninjaone-plan.json", JSON.stringify(plan, null, 1));

// review render
const S = 240;                    // px per cell in the review image
const W = COLS * S, H = ROWS * S;
const svg = [];
svg.push(`<rect width="${W}" height="${H}" fill="#141821"/>`);
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    svg.push(`<rect x="${c * S}" y="${r * S}" width="${S}" height="${S}" `
      + `fill="none" stroke="#2f3946" stroke-width="2"/>`);
    svg.push(`<text x="${c * S + 8}" y="${r * S + 20}" fill="#4a5666" `
      + `font-family="monospace" font-size="14">${c},${r}</text>`);
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
  .png().toFile(OUT + "ninjaone-plan.png");

console.log("shelves:");
for (const s of SHELVES) console.log(`  ${s.id.padEnd(17)} cell ${s.cell.join(",")}  ${s.role}`);
console.log("\nrail features around the loop:");
for (const f of FEATURES) console.log(`  ${f.kind.padEnd(20)} ${f.note}`);
console.log(`\nplan -> ${OUT}ninjaone-plan.json`);
console.log(`review -> ${OUT}ninjaone-plan.png`);
