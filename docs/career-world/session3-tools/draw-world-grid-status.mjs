// The world lattice: every planned territory, drawn from its own definition.
//
// Reads art-source/career-world/l2-land/<id>/territory.def.json for every
// territory that has one, so this picture cannot drift from what the pipeline
// would actually author. A territory whose cells are baked is drawn solid; one
// that is only planned is drawn dashed. Territories with no definition appear
// only as their registered capital anchors, which are still pre-lattice.
//
//   node docs/career-world/session3-tools/draw-world-grid-status.mjs
import fs from "node:fs";
import sharp from "sharp";
sharp.cache(false);

const OUT = "docs/career-world/session3-tools/world-grid-status.png";
const R = "public/career-world/";
const L2 = "art-source/career-world/l2-land/";
const territories = JSON.parse(fs.readFileSync(R + "layers/terrain/authority/manifests/world-territories-r4.json", "utf8")).territories;

const defs = fs.readdirSync(L2, { withFileTypes: true })
  .filter((d) => d.isDirectory() && fs.existsSync(`${L2}${d.name}/territory.def.json`))
  .map((d) => ({
    ...JSON.parse(fs.readFileSync(`${L2}${d.name}/territory.def.json`, "utf8")),
    baked: fs.existsSync(`${R}layers/terrain/authority/manifests/terrain-l2-${d.name}-r1.json`),
  }));

const COLS = 16, ROWS = 9, S = 132, TOP = 100;
const W = COLS * S, H = ROWS * S + TOP + 96;
const BIOME_COLOUR = {
  "bare-plateau": "#5a5650", moor: "#4d5a2e", "dark-forest": "#1f3a2a", "coast-cliff": "#3d4f5c",
  "sound-coast": "#2e5566", quarry: "#6b6250", "mixed-bench": "#4f5a3c", "lush-shelf": "#5f7a2a",
  "magical-gorge": "#4a3566", "purple-field": "#7a2f7a",
};
const s = [];
s.push(`<rect width="${W}" height="${H}" fill="#101720"/>`);

// empty lattice first
for (let r = 0; r < ROWS; r += 1) {
  for (let c = 0; c < COLS; c += 1) {
    s.push(`<rect x="${c * S}" y="${r * S + TOP}" width="${S}" height="${S}" fill="#161d26" stroke="#26303c" stroke-width="1"/>`);
    s.push(`<text x="${c * S + 7}" y="${r * S + TOP + 17}" fill="#7e8b98" font-family="monospace" font-size="12">${c},${r}</text>`);
  }
}

// each planned territory
for (const def of defs) {
  const [bx, by] = def.lattice.block;
  const edge = def.baked ? "#8fe06a" : "#e0b64a";
  const dash = def.baked ? "" : ` stroke-dasharray="10 7"`;
  for (let r = 0; r < def.grid.rows; r += 1) {
    for (let c = 0; c < def.grid.cols; c += 1) {
      const b = def.cellBiomes[`${c},${r}`];
      const x = (bx + c) * S, y = (by + r) * S + TOP;
      s.push(`<rect x="${x}" y="${y}" width="${S}" height="${S}" fill="${BIOME_COLOUR[b] ?? "#3a4450"}" `
        + `stroke="${edge}" stroke-width="2.5"${dash} opacity="${def.baked ? 1 : 0.88}"/>`);
      s.push(`<text x="${x + 7}" y="${y + 17}" fill="#c2ccd6" font-family="monospace" font-size="12">${bx + c},${by + r}</text>`);
      s.push(`<text x="${x + S / 2}" y="${y + S - 10}" fill="#eef3f8" font-family="Georgia,serif" font-size="12" text-anchor="middle">${b}</text>`);
    }
  }
  const P = ([c, r]) => [(bx + c) * S, (by + r) * S + TOP];
  s.push(`<polyline points="${def.loop.map((p) => P(p).join(",")).join(" ")}" fill="none" `
    + `stroke="#f0c85a" stroke-width="4" stroke-linejoin="round" opacity="0.9"/>`);
  for (const f of def.railFeatures) {
    const [x, y] = P(f.at);
    s.push(`<circle cx="${x}" cy="${y}" r="7" fill="none" stroke="#6ec8ff" stroke-width="2.5"/>`);
    s.push(`<text x="${x + 11}" y="${y + 4}" fill="#8fd4ff" font-family="Georgia,serif" font-size="12">${f.kind}</text>`);
  }
  for (const sh of def.shelves) {
    const [x, y] = P([sh.cell[0] + sh.off[0], sh.cell[1] + sh.off[1]]);
    const rad = sh.id === "capital" ? 20 : 14;
    s.push(`<circle cx="${x}" cy="${y}" r="${rad}" fill="#16220f" stroke="#8fe06a" stroke-width="3"/>`);
    s.push(`<text x="${x + rad + 5}" y="${y + 5}" fill="#b7f090" font-family="Georgia,serif" font-size="15">${sh.id}</text>`);
  }
  // Above the block if that row is free, inside it otherwise -- the label sat
  // on NinjaOne's bottom row when Tanium was added directly beneath it.
  const above = by === 0 || defs.some((o) => o !== def
    && by === o.lattice.block[1] + o.grid.rows
    && bx < o.lattice.block[0] + o.grid.cols && o.lattice.block[0] < bx + def.grid.cols);
  const label = `${def.territory.toUpperCase()} — ${def.grid.cols} x ${def.grid.rows} = `
    + `${def.grid.cols * def.grid.rows} cells${def.baked ? " — AUTHORED" : " — PLANNED, nothing baked"}`;
  const lx = bx * S + 8, ly = by * S + TOP + (above ? 44 : -10);
  s.push(`<rect x="${lx - 6}" y="${ly - 22}" width="${label.length * 11 + 16}" height="30" fill="#0b1219" opacity="0.86"/>`);
  s.push(`<text x="${lx}" y="${ly}" fill="${edge}" font-family="Georgia,serif" font-size="21">${label}</text>`);
}

// the shared border, drawn from NinjaOne's ruling
const nj = defs.find((d) => d.territory === "ninjaone");
const tn = defs.find((d) => d.territory === "tanium");
if (nj && tn) {
  const KIND = { 0: "sound", 1: "sound", 2: "land", 3: "land", 4: "bay" };
  const C = { sound: "#2e5566", land: "#5f7a2a", bay: "#3d6f8c" };
  const y = (nj.lattice.block[1] + nj.grid.rows) * S + TOP;
  for (const [rel, kind] of Object.entries(KIND)) {
    const x = (nj.lattice.block[0] + Number(rel)) * S;
    s.push(`<rect x="${x + 3}" y="${y - 8}" width="${S - 6}" height="16" fill="${C[kind]}" stroke="#0d1620" stroke-width="1"/>`);
    s.push(`<text x="${x + S / 2}" y="${y + 5}" fill="#0d1620" font-family="monospace" font-size="12" font-weight="bold" text-anchor="middle">${kind}</text>`);
  }
}

// territories with no definition yet
for (const t of territories) {
  if (defs.some((d) => d.territory === t.id)) continue;
  const a = t.development?.capitalAnchor ?? t.anchor;
  if (!a) continue;
  const x = a[0] * W, y = a[1] * (ROWS * S) + TOP;
  s.push(`<circle cx="${x}" cy="${y}" r="11" fill="none" stroke="#7f8c99" stroke-width="2.5" stroke-dasharray="5 4"/>`);
  s.push(`<text x="${x + 16}" y="${y + 5}" fill="#93a1af" font-family="Georgia,serif" font-size="15">${t.id} — no plan</text>`);
}

s.push(`<text x="20" y="40" fill="#f0f5fa" font-family="Georgia,serif" font-size="30">World lattice — 16 x 9 cells of 217 world px (97.7 m)</text>`);
s.push(`<text x="20" y="70" fill="#9db0c2" font-family="monospace" font-size="16">`
  + `every block, biome, shelf and rail loop below is read from its territory.def.json, so this cannot drift from what the pipeline would author</text>`);
s.push(`<text x="20" y="90" fill="#9db0c2" font-family="monospace" font-size="16">`
  + `solid green = baked    dashed gold = planned only    blue rings = rail features    the strip on the shared edge is the owner's border ruling</text>`);

const fy = ROWS * S + TOP + 40;
const total = defs.reduce((n, d) => n + d.grid.cols * d.grid.rows, 0);
s.push(`<text x="20" y="${fy}" fill="#c9d4de" font-family="Georgia,serif" font-size="19">`
  + `${total} cells planned of the ~88 the world is scoped for. Sea on all four sides of the landmass: row 0 above, row 8 below, cols 0-1 west, cols 9-15 east.</text>`);
s.push(`<text x="20" y="${fy + 28}" fill="#93a1af" font-family="Georgia,serif" font-size="19">`
  + `Column, ACE and Independent have no plan yet — shown only by their registered capital anchors, which are pre-lattice and will re-derive.</text>`);

await sharp(Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${s.join("")}</svg>`))
  .png().toFile(OUT);
console.log(`wrote ${OUT}  ${W} x ${H}`);
for (const d of defs) {
  console.log(`  ${d.territory.padEnd(10)} block [${d.lattice.block}]  ${d.grid.cols}x${d.grid.rows}`
    + ` = ${d.grid.cols * d.grid.rows} cells  ${d.baked ? "authored" : "planned"}`);
}
