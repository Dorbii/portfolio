// Tanium as one continuous image, so the seams and transitions can be judged.
//
// Accepted cells are drawn from the STITCHED PYRAMID, not from their raw
// generations: the stitch cuts a content-aware boundary through both paints and
// feathers it, so the pyramid is what the seam actually looks like. Butting the
// raw 2560 px generations together would show a join the world does not have.
//
// Refused candidates are dropped into their slots from the raw generation,
// because they were never stitched — that difference is the point, and they are
// outlined so it is never mistaken for authored ground.
//
//   node docs/career-world/session3-tools/tanium-mosaic.mjs [--level N]
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
sharp.cache(false);

const T = "tanium";
const OUT = `docs/career-world/session3-tools/${T}-mosaic.png`;
const SNAP = ".codex-tmp/reject-snapshot";
const A = "public/career-world/layers/terrain/authority";
const MAN = `${A}/manifests/terrain-l2-${T}-r1.json`;
const TILES = `${A}/tiles/l2-${T}-r1`;

const def = JSON.parse(fs.readFileSync(`art-source/career-world/l2-land/${T}/territory.def.json`, "utf8"));
const man = JSON.parse(fs.readFileSync(MAN, "utf8"));
const authored = Object.keys(man.cells);
const COLS = def.grid.cols, ROWS = def.grid.rows;
const CELL_PX = man.contract.keptPx, TILE = man.contract.tilePx;

const li = process.argv.indexOf("--level");
const LEVEL = li >= 0 ? Number(process.argv[li + 1]) : 2;      // /4 by default
const S = 2 ** LEVEL;
const W = Math.ceil(COLS * CELL_PX / S), H = Math.ceil(ROWS * CELL_PX / S);
const cellPx = CELL_PX / S;

// ---- the stitched pyramid, tile by tile
const dir = path.join(TILES, `L${LEVEL}`);
const comps = [];
let tiles = 0;
if (fs.existsSync(dir)) {
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".webp")) continue;
    const [tx, ty] = f.replace(".webp", "").split("-").map(Number);
    comps.push({ input: path.join(dir, f), left: tx * TILE, top: ty * TILE });
    tiles += 1;
  }
}

// ---- refused candidates, kept area only, into their slots
const svg = [];
const refused = [];
for (let r = 0; r < ROWS; r += 1) {
  for (let c = 0; c < COLS; c += 1) {
    const id = `c${c}-${r}`;
    if (authored.includes(id)) continue;
    const x = Math.round(c * cellPx), y = Math.round(r * cellPx);
    const src = `${SNAP}/${id}.png`;
    if (!fs.existsSync(src)) {
      svg.push(`<rect x="${x}" y="${y}" width="${Math.round(cellPx)}" height="${Math.round(cellPx)}" fill="#141d27"/>`);
      svg.push(`<text x="${x + cellPx / 2}" y="${y + cellPx / 2}" fill="#5c6874" font-family="monospace" font-size="${Math.round(cellPx / 14)}" text-anchor="middle">${id} not generated</text>`);
      continue;
    }
    const m = await sharp(src).metadata();
    const bleed = Math.round((m.width - CELL_PX) / 2);          // 2560 -> keep the centre 2048
    comps.push({
      input: await sharp(src)
        .extract({ left: bleed, top: bleed, width: CELL_PX, height: CELL_PX })
        .resize(Math.round(cellPx), Math.round(cellPx)).png().toBuffer(),
      left: x, top: y,
    });
    refused.push(id);
    svg.push(`<rect x="${x + 1}" y="${y + 1}" width="${Math.round(cellPx) - 2}" height="${Math.round(cellPx) - 2}" `
      + `fill="none" stroke="#ff9d5c" stroke-width="2" stroke-dasharray="10 8"/>`);
    svg.push(`<text x="${x + 8}" y="${y + 22}" fill="#ff9d5c" font-family="monospace" font-size="15">${id} refused</text>`);
  }
}

await sharp({ create: { width: W, height: H, channels: 4, background: { r: 13, g: 22, b: 32, alpha: 255 } } })
  .composite([...comps, { input: Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${svg.join("")}</svg>`), left: 0, top: 0 }])
  .png().toFile(OUT);

const stats = await sharp(OUT).stats();
const mean = stats.channels.slice(0, 3).reduce((a, c) => a + c.mean, 0) / 3;
console.log(`wrote ${OUT}  ${W} x ${H}  (level ${LEVEL}, 1/${S})`);
console.log(`  ${tiles} stitched tiles + ${refused.length} refused candidates dropped in`);
console.log(`  mean luminance ${mean.toFixed(1)} ${mean > 25 ? "(art present)" : "(BLANK)"}`);
console.log(`  refused, outlined: ${refused.join(" ")}`);
