// The world lattice: what is authored, what is planned, what is unplanned.
//
// One 16 x 9 board. NinjaOne's 20 cells carry the biome each was authored to,
// read from the live plan. Tanium's block is drawn where the budget and the
// standing south-border ruling put it, and is explicitly a PROPOSAL. The other
// three territories are shown only by their registered capital anchors, which
// are still on pre-lattice decimals and will re-derive from their own plans.
//
//   node docs/career-world/session3-tools/draw-world-grid-status.mjs
import fs from "node:fs";
import sharp from "sharp";
sharp.cache(false);

const OUT = "docs/career-world/session3-tools/world-grid-status.png";
const R = "public/career-world/";
const plan = JSON.parse(fs.readFileSync("art-source/career-world/l2-land/ninjaone/plan.json", "utf8"));
const territories = JSON.parse(fs.readFileSync(R + "layers/terrain/authority/manifests/world-territories-r4.json", "utf8")).territories;

const COLS = 16, ROWS = 9, S = 132;
const W = COLS * S, H = ROWS * S + 190;
const NINJA = [3, 1], BLOCK = [5, 4];
const TANIUM = [3, 5];                      // proposal: directly south, same 5 x 4

const BIOME_COLOUR = {
  "bare-plateau": "#5a5650", moor: "#4d5a2e", "dark-forest": "#1f3a2a", "coast-cliff": "#3d4f5c",
  "sound-coast": "#2e5566", quarry: "#6b6250", "mixed-bench": "#4f5a3c", "lush-shelf": "#5f7a2a",
  "magical-gorge": "#4a3566", "purple-field": "#7a2f7a",
};
// plan.biomes is keyed "c,r" in BLOCK-relative cell coordinates
const biomeAt = (c, r) => plan.biomes?.[`${c},${r}`] ?? plan.cellBiomes?.[`${c},${r}`];

const s = [];
s.push(`<rect width="${W}" height="${H}" fill="#101720"/>`);

for (let r = 0; r < ROWS; r += 1) {
  for (let c = 0; c < COLS; c += 1) {
    const x = c * S, y = r * S + 96;
    const inNinja = c >= NINJA[0] && c < NINJA[0] + BLOCK[0] && r >= NINJA[1] && r < NINJA[1] + BLOCK[1];
    const inTanium = c >= TANIUM[0] && c < TANIUM[0] + BLOCK[0] && r >= TANIUM[1] && r < TANIUM[1] + BLOCK[1];
    let fill = "#161d26", stroke = "#26303c", dash = "";
    if (inNinja) {
      const b = biomeAt(c - NINJA[0], r - NINJA[1]);
      fill = BIOME_COLOUR[b] ?? "#3a4450";
      stroke = "#8fe06a";
    } else if (inTanium) {
      fill = "#1b2530"; stroke = "#e0b64a"; dash = ` stroke-dasharray="9 7"`;
    }
    s.push(`<rect x="${x}" y="${y}" width="${S}" height="${S}" fill="${fill}" stroke="${stroke}" stroke-width="${inNinja || inTanium ? 2.5 : 1}"${dash}/>`);
    s.push(`<text x="${x + 7}" y="${y + 18}" fill="#8b98a6" font-family="monospace" font-size="13">${c},${r}</text>`);
    if (inNinja) {
      const b = biomeAt(c - NINJA[0], r - NINJA[1]) ?? "?";
      s.push(`<text x="${x + S / 2}" y="${y + S - 12}" fill="#e9f0f6" font-family="Georgia,serif" font-size="12" text-anchor="middle">${b}</text>`);
    }
    if (inTanium) {
      s.push(`<text x="${x + S / 2}" y="${y + S / 2 + 5}" fill="#7d6a33" font-family="Georgia,serif" font-size="14" text-anchor="middle">biome?</text>`);
    }
  }
}

// NinjaOne's authored shelves
for (const sh of plan.shelves) {
  const x = (NINJA[0] + sh.cell[0] + sh.off[0]) * S;
  const y = (NINJA[1] + sh.cell[1] + sh.off[1]) * S + 96;
  const rad = sh.id === "capital" ? 22 : 15;
  s.push(`<circle cx="${x}" cy="${y}" r="${rad}" fill="#16220f" stroke="#8fe06a" stroke-width="3"/>`);
  s.push(`<text x="${x + rad + 6}" y="${y + 5}" fill="#b7f090" font-family="Georgia,serif" font-size="16">${sh.id}</text>`);
}

// The standing south-border ruling: what NinjaOne's bottom row hands to Tanium.
const SOUTH = { 0: "sound", 1: "sound", 2: "land", 3: "land", 4: "bay" };
const SOUTH_COLOUR = { sound: "#2e5566", land: "#5f7a2a", bay: "#3d6f8c" };
const by = (NINJA[1] + BLOCK[1]) * S + 96;
for (const [rel, kind] of Object.entries(SOUTH)) {
  const x = (NINJA[0] + Number(rel)) * S;
  s.push(`<rect x="${x + 4}" y="${by - 9}" width="${S - 8}" height="18" fill="${SOUTH_COLOUR[kind]}" opacity="0.95"/>`);
  s.push(`<text x="${x + S / 2}" y="${by + 5}" fill="#0f1720" font-family="monospace" font-size="13" font-weight="bold" text-anchor="middle">${kind}</text>`);
}

// The other territories, by registered capital anchor only
for (const t of territories) {
  if (t.id === "ninjaone") continue;
  const a = t.development?.capitalAnchor ?? t.anchor;
  if (!a) continue;
  const x = a[0] * W, y = a[1] * (ROWS * S) + 96;
  const planned = t.id === "tanium";
  s.push(`<circle cx="${x}" cy="${y}" r="11" fill="none" stroke="${planned ? "#e0b64a" : "#7f8c99"}" stroke-width="2.5" stroke-dasharray="5 4"/>`);
  s.push(`<text x="${x + 16}" y="${y + 5}" fill="${planned ? "#e0b64a" : "#93a1af"}" font-family="Georgia,serif" font-size="15">${t.id}</text>`);
}

// header
s.push(`<text x="20" y="38" fill="#f0f5fa" font-family="Georgia,serif" font-size="30">World lattice — 16 x 9 cells of 217 world px (97.7 m)</text>`);
s.push(`<text x="20" y="66" fill="#9db0c2" font-family="monospace" font-size="16">`
  + `SOLID GREEN = 20 cells authored, biome named    DASHED GOLD = Tanium proposed, nothing authored    `
  + `dashed rings = registered capital anchors, still on pre-lattice decimals</text>`);
s.push(`<text x="20" y="86" fill="#9db0c2" font-family="monospace" font-size="16">`
  + `the coloured strip on NinjaOne's south edge is the standing border ruling: what Tanium's top row must meet, column by column</text>`);

// footer
const fy = ROWS * S + 96 + 34;
s.push(`<text x="20" y="${fy}" fill="#c9d4de" font-family="Georgia,serif" font-size="19">`
  + `Budget: NinjaOne 4 projects / 21 regions — took 5 x 4 = 20 cells. Tanium 4 projects / 21 regions — the same block.  `
  + `40 of the ~88 cells the world is scoped for.</text>`);
s.push(`<text x="20" y="${fy + 28}" fill="#e0b64a" font-family="Georgia,serif" font-size="19">`
  + `Missing and only the owner has it: Tanium's four projects. NinjaOne's shelves were Kaizen, Metrics-Service, Vendy and an unnamed construction zone.</text>`);

await sharp(Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${s.join("")}</svg>`))
  .png().toFile(OUT);
console.log(`wrote ${OUT}  ${W} x ${H}`);
console.log(`NinjaOne cols ${NINJA[0]}..${NINJA[0] + BLOCK[0] - 1}, rows ${NINJA[1]}..${NINJA[1] + BLOCK[1] - 1}`);
console.log(`Tanium   cols ${TANIUM[0]}..${TANIUM[0] + BLOCK[0] - 1}, rows ${TANIUM[1]}..${TANIUM[1] + BLOCK[1] - 1}  (proposal)`);
console.log(`plan biome keys present: ${Object.keys(plan.biomes ?? plan.cellBiomes ?? {}).length}`);
