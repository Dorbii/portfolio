// Hard-edge excess at a seam: the share of seam length where luma steps across the
// line by more than STEP (after a 5-px smoothing along the line), divided by the
// same statistic measured OFF the line (64 and 128 px inside each cell) — the
// texture's own hard-edge rate as the control. 1.0 = the seam is as busy as the
// paint; well above 1 = features cut at the line.
//   node seam-edge.mjs <label> <col> <row> <E|S> [candidateCanvas.png]
import sharp from "sharp"; import fs from "node:fs"; import path from "node:path";
sharp.cache(false);
const TILES = "public/career-world/layers/terrain/authority/tiles/l2-ninjaone-r1/L0", TILE = 256, CELL = 2048, BLEED = 256, STEP = 40, GAP = 3;
const [label, cS, rS, edge, cand] = process.argv.slice(2); const col = +cS, row = +rS;
const W = 2048, D = 400; // window: along the seam 2048 px, across it +-200
const sx = edge === "E" ? (col + 1) * CELL : col * CELL, sy = edge === "E" ? row * CELL : (row + 1) * CELL;
const x0 = edge === "E" ? sx - D / 2 : sx, y0 = edge === "E" ? sy : sy - D / 2, w = edge === "E" ? D : W, h = edge === "E" ? W : D;
const comps = [];
for (const f of fs.readdirSync(TILES)) { const [tx, ty] = f.replace(".webp", "").split("-").map(Number); const px = tx * TILE, py = ty * TILE;
  if (px >= x0 + w || py >= y0 + h || px + TILE <= x0 || py + TILE <= y0) continue; comps.push({ input: path.join(TILES, f), left: px - x0, top: py - y0 }); }
if (cand) { const kept = await sharp(cand).extract({ left: BLEED, top: BLEED, width: CELL, height: CELL }).png().toBuffer(); comps.push({ input: kept, left: col * CELL - x0, top: row * CELL - y0 }); }
let buf = await sharp({ create: { width: w, height: h, channels: 4, background: { r: 70, g: 70, b: 70, alpha: 1 } } }).composite(comps).png().toBuffer();
if (edge === "S") buf = await sharp(buf).rotate(90).png().toBuffer(); // now the seam runs vertically at x = D/2 (rotation maps y->x)
const raw = await sharp(buf).greyscale().raw().toBuffer(); const RW = edge === "E" ? w : h, RH = edge === "E" ? h : w;
const L = (x, y) => raw[y * RW + x];
function rate(xc) { let n = 0, hit = 0; for (let y = 4; y < RH - 4; y++) { let a = 0, b = 0; for (let k = -2; k <= 2; k++) { a += L(xc - GAP, y + k); b += L(xc + GAP, y + k); } if (Math.abs(a - b) / 5 > STEP) hit++; n++; } return hit / n; }
const at = rate(D / 2); const off = [-128, -64, 64, 128].map((d) => rate(D / 2 + d)); const ctrl = off.reduce((p, q) => p + q, 0) / off.length;
console.log(`${label.padEnd(18)} at line ${(at * 100).toFixed(1).padStart(5)}%   off line ${(ctrl * 100).toFixed(1).padStart(5)}% (${off.map((v) => (v * 100).toFixed(1)).join("/")})   excess x${(at / Math.max(ctrl, 1e-6)).toFixed(2)}`);
