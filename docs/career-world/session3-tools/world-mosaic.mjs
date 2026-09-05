// A territory as one continuous image, from the stitched pyramid.
//
// Generic over territories, and replaces tanium-mosaic.mjs. Accepted cells come
// from the PYRAMID, not their raw generations: the stitch cuts a content-aware
// boundary through both paints and feathers it, so the pyramid is the seam the
// world actually has. Cells with no authored art are drawn from a refused
// candidate where one exists, outlined so it is never taken for authored ground.
//
//   node docs/career-world/session3-tools/world-mosaic.mjs <territory>
//        [--level N] [--highlight c1-2,c2-2] [--out PATH]
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
sharp.cache(false);

const arg = (f, d) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : d; };
const T = process.argv[2];
if (!T || T.startsWith("--")) {
  console.error("\n  usage: node docs/career-world/session3-tools/world-mosaic.mjs <territory> [--level N] [--highlight c1-2,c2-2]\n");
  process.exit(1);
}
const LEVEL = Number(arg("--level", 2));
// --bg r,g,b  the backdrop behind the art (cut water shows it); default the
// review navy, or a sea tone when the picture is meant to read as a map
const BG = arg("--bg", "13,22,32").split(",").map(Number);
const HIGHLIGHT = new Set((arg("--highlight", "") || "").split(",").filter(Boolean));
const OUT = arg("--out", `docs/career-world/session3-tools/${T}-mosaic.png`);
const SNAP = ".codex-tmp/reject-snapshot";

const A = "public/career-world/layers/terrain/authority";
const MAN = `${A}/manifests/terrain-l2-${T}-r1.json`;
if (!fs.existsSync(MAN)) { console.error(`no manifest for ${T} at ${MAN}`); process.exit(1); }
const man = JSON.parse(fs.readFileSync(MAN, "utf8"));
const def = JSON.parse(fs.readFileSync(`art-source/career-world/l2-land/${T}/territory.def.json`, "utf8"));
const authored = Object.keys(man.cells);
// A sparse territory (the coast) plans only some of its block's cells; the
// rest are the island's, mirrored into cellBiomes, and are drawn by their own
// territories — here they stay backdrop.
const planned = def.coastCells ? new Set(def.coastCells.map((x) => `c${x.at[0]}-${x.at[1]}`)) : null;
// Where an unauthored cell's last candidate is: the working folder holds it in
// full until the next dispatch clears it; the snapshot folder keeps copies by
// territory; the unscoped snapshots are Tanium's from before the coast existed
// (a coast c2-0 must never wear Tanium's c2-0).
const candidateFor = (id) => {
  const live = `.codex-tmp/authoring/cells/${T}/${id}/${id}-l2.png`;
  if (fs.existsSync(live)) return live;
  const scoped = `${SNAP}/${T}/${id}.png`;
  if (fs.existsSync(scoped)) return scoped;
  const legacy = `${SNAP}/${id}.png`;
  return T === "tanium" && fs.existsSync(legacy) ? legacy : null;
};
const COLS = def.grid.cols, ROWS = def.grid.rows;
const CELL_PX = man.contract.keptPx, TILE = man.contract.tilePx;

const S = 2 ** LEVEL;
const W = Math.ceil(COLS * CELL_PX / S), H = Math.ceil(ROWS * CELL_PX / S);
const cellPx = CELL_PX / S;

const comps = [], svg = [];
const dir = path.join(`${A}/tiles/l2-${T}-r1`, `L${LEVEL}`);
let tiles = 0;
if (fs.existsSync(dir)) {
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".webp")) continue;
    const [tx, ty] = f.replace(".webp", "").split("-").map(Number);
    comps.push({ input: path.join(dir, f), left: tx * TILE, top: ty * TILE });
    tiles += 1;
  }
}

const gate = (id, name) => {
  const g = (man.cells[id]?.gates || []).find((x) => x.name === name);
  return g ? String(g.value) : null;
};

let refused = 0;
for (let r = 0; r < ROWS; r += 1) {
  for (let c = 0; c < COLS; c += 1) {
    const id = `c${c}-${r}`;
    const x = Math.round(c * cellPx), y = Math.round(r * cellPx), w = Math.round(cellPx);
    if (planned && !planned.has(id)) continue;
    if (!authored.includes(id)) {
      const src = candidateFor(id);
      if (src) {
        const m = await sharp(src).metadata();
        const bleed = Math.round((m.width - CELL_PX) / 2);
        comps.push({ input: await sharp(src).extract({ left: bleed, top: bleed, width: CELL_PX, height: CELL_PX })
          .resize(w, w).png().toBuffer(), left: x, top: y });
        refused += 1;
        svg.push(`<rect x="${x + 1}" y="${y + 1}" width="${w - 2}" height="${w - 2}" fill="none" stroke="#ff9d5c" stroke-width="2" stroke-dasharray="10 8"/>`);
        svg.push(`<text x="${x + 8}" y="${y + 22}" fill="#ff9d5c" font-family="monospace" font-size="15">${id} refused</text>`);
      } else if (!planned) {
        // a planned shore cell with no candidate yet stays sea (the island
        // picture labels it); a block territory's hole is drawn as a hole
        svg.push(`<rect x="${x}" y="${y}" width="${w}" height="${w}" fill="#141d27"/>`);
        svg.push(`<text x="${x + w / 2}" y="${y + w / 2}" fill="#5c6874" font-family="monospace" font-size="${Math.round(w / 14)}" text-anchor="middle">${id}</text>`);
      }
      continue;
    }
    if (HIGHLIGHT.has(id)) {
      const rl = gate(id, "rock lighting");
      svg.push(`<rect x="${x + 2}" y="${y + 2}" width="${w - 4}" height="${w - 4}" fill="none" stroke="#ff4d4d" stroke-width="4"/>`);
      svg.push(`<rect x="${x + 6}" y="${y + 6}" width="${Math.min(w - 12, 470)}" height="34" fill="#0b1219" opacity="0.85"/>`);
      svg.push(`<text x="${x + 14}" y="${y + 30}" fill="#ff6b6b" font-family="monospace" font-size="19">${id}  rock lighting ${rl ?? "?"}</text>`);
    }
  }
}

await sharp({ create: { width: W, height: H, channels: 4, background: { r: BG[0], g: BG[1], b: BG[2], alpha: 255 } } })
  .composite([...comps, { input: Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${svg.join("")}</svg>`), left: 0, top: 0 }])
  .png().toFile(OUT);

const st = await sharp(OUT).stats();
const mean = st.channels.slice(0, 3).reduce((a, c) => a + c.mean, 0) / 3;
console.log(`wrote ${OUT}  ${W} x ${H}  (${T}, level ${LEVEL}, 1/${S})`);
console.log(`  ${tiles} stitched tiles, ${refused} refused candidates, ${HIGHLIGHT.size} highlighted`);
console.log(`  mean luminance ${mean.toFixed(1)} ${mean > 25 ? "(art present)" : "(BLANK)"}`);
