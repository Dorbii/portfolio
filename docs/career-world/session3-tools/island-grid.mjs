// The big island as one picture on the world lattice, every cell boxed and
// labelled by territory, with a margin of open sea around it, for the owner
// to mark up: NinjaOne (5x4 at lattice [3,1]) above Tanium (7x3 at [2,5]).
// Built from the two per-territory mosaics (world-mosaic.mjs at the same
// level, run with --bg <sea>) — the stitched pyramids, so the seams shown are
// the ones the world has.
//
//   node docs/career-world/session3-tools/island-grid.mjs [--level 2] [--margin 1]
//        [--sea 31,96,108] [--dir .codex-tmp/session4/island]
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
sharp.cache(false);
const arg = (f, d) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : d; };
const LEVEL = Number(arg("--level", 2)), DIR = arg("--dir", ".codex-tmp/session4/island");
const MARGIN = Number(arg("--margin", 1));
const SEA = arg("--sea", "31,96,108").split(",").map(Number);
const CELL = 2048 / 2 ** LEVEL;
const terr = [
  { id: "ninjaone", tag: "N", ...JSON.parse(fs.readFileSync("art-source/career-world/l2-land/ninjaone/territory.def.json", "utf8")) },
  { id: "tanium", tag: "T", ...JSON.parse(fs.readFileSync("art-source/career-world/l2-land/tanium/territory.def.json", "utf8")) },
];
// the island's lattice window (world cols 2..8, rows 1..7), plus the margin
const X0 = Math.min(...terr.map((t) => t.lattice.block[0])) - MARGIN, Y0 = Math.min(...terr.map((t) => t.lattice.block[1])) - MARGIN;
const X1 = Math.max(...terr.map((t) => t.lattice.block[0] + t.grid.cols)) + MARGIN, Y1 = Math.max(...terr.map((t) => t.lattice.block[1] + t.grid.rows)) + MARGIN;
if (X0 < 0 || Y0 < 0 || X1 > 16 || Y1 > 9) throw new Error(`window ${X0}..${X1} x ${Y0}..${Y1} leaves the 16 x 9 plane`);
const COLS = X1 - X0, ROWS = Y1 - Y0;
const W = COLS * CELL, H = ROWS * CELL;
const comps = [], svg = [];
const land = new Set();
for (const t of terr) {
  const file = path.join(DIR, `mosaic-${t.id}-L${LEVEL}.png`);
  if (!fs.existsSync(file)) throw new Error(`missing ${file} — run world-mosaic.mjs ${t.id} --level ${LEVEL} --bg ${SEA.join(",")} --out ${file}`);
  const ox = (t.lattice.block[0] - X0) * CELL, oy = (t.lattice.block[1] - Y0) * CELL;
  comps.push({ input: file, left: ox, top: oy });
  const man = JSON.parse(fs.readFileSync(`public/career-world/layers/terrain/authority/manifests/terrain-l2-${t.id}-r1.json`, "utf8"));
  for (let r = 0; r < t.grid.rows; r += 1) for (let c = 0; c < t.grid.cols; c += 1) {
    const id = `c${c}-${r}`, x = ox + c * CELL, y = oy + r * CELL;
    land.add(`${t.lattice.block[0] + c},${t.lattice.block[1] + r}`);
    const authored = Boolean(man.cells[id]);
    svg.push(`<rect x="${x + 0.5}" y="${y + 0.5}" width="${CELL - 1}" height="${CELL - 1}" fill="none" stroke="${authored ? "rgba(255,255,255,0.55)" : "rgba(255,157,92,0.8)"}" stroke-width="1"/>`);
    svg.push(`<rect x="${x + 4}" y="${y + 4}" width="${CELL * 0.30}" height="22" rx="3" fill="rgba(0,0,0,0.6)"/>`);
    svg.push(`<text x="${x + 10}" y="${y + 20}" fill="${authored ? "#ffffff" : "#ff9d5c"}" font-family="monospace" font-size="15" font-weight="bold">${t.tag} ${id}</text>`);
    svg.push(`<text x="${x + CELL - 6}" y="${y + CELL - 8}" fill="rgba(255,255,255,0.55)" font-family="monospace" font-size="12" text-anchor="end">w${t.lattice.block[0] + c},${t.lattice.block[1] + r}</text>`);
  }
  svg.push(`<rect x="${ox + 1.5}" y="${oy + 1.5}" width="${t.grid.cols * CELL - 3}" height="${t.grid.rows * CELL - 3}" fill="none" stroke="${t.tag === "N" ? "#7fb3d0" : "#e0b94f"}" stroke-width="3"/>`);
}
// the sea cells: lattice grid and a quiet label, so the margin reads as world, not padding
for (let r = 0; r < ROWS; r += 1) for (let c = 0; c < COLS; c += 1) {
  const wx = X0 + c, wy = Y0 + r;
  if (land.has(`${wx},${wy}`)) continue;
  const x = c * CELL, y = r * CELL;
  svg.push(`<rect x="${x + 0.5}" y="${y + 0.5}" width="${CELL - 1}" height="${CELL - 1}" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="1" stroke-dasharray="6 6"/>`);
  svg.push(`<text x="${x + CELL - 6}" y="${y + CELL - 8}" fill="rgba(255,255,255,0.45)" font-family="monospace" font-size="12" text-anchor="end">w${wx},${wy} · open sea</text>`);
}
svg.push(`<rect x="8" y="${H - 44}" width="820" height="36" rx="4" fill="rgba(0,0,0,0.65)"/>`);
svg.push(`<text x="18" y="${H - 20}" fill="#ffffff" font-family="monospace" font-size="16">N = NinjaOne (blue border)   T = Tanium (gold)   orange label = not authored (dashed box = refused candidate shown)   dashed sea cells = open water   wX,Y = world lattice cell</text>`);
const out = path.join(DIR, `island-grid-L${LEVEL}.png`);
await sharp({ create: { width: W, height: H, channels: 4, background: { r: SEA[0], g: SEA[1], b: SEA[2], alpha: 255 } } })
  .composite([...comps, { input: Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${svg.join("")}</svg>`), left: 0, top: 0 }])
  .png().toFile(out);
const jpg = out.replace(/\.png$/, ".jpg");
await sharp(out).jpeg({ quality: 88 }).toFile(jpg);
console.log(`wrote ${out} (${W} x ${H}, world cols ${X0}..${X1 - 1}, rows ${Y0}..${Y1 - 1}) and ${jpg} (${(fs.statSync(jpg).size / 1048576).toFixed(1)} MB)`);
