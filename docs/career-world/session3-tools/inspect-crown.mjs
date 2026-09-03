// Inspect the suite's scratch world around the crown control: which pixels are
// not opaque, what c2-2's recorded source holds there, and the cell's gates.
import sharp from "sharp"; import fs from "node:fs"; import path from "node:path";
sharp.cache(false);
const OUT = process.env.CROWN_OUT || ".codex-tmp/dir-stitch/test-world", CELL = 2048, BLEED = 256, TILE = 256;
const m = JSON.parse(fs.readFileSync(path.join(OUT, "manifest.json"), "utf8"));
for (const id of ["c1-2", "c2-2"]) { const c = m.cells[id]; console.log(id, c ? `authored ${c.authoredAt}; gates: ${c.gates.map((g) => `${g.name}=${g.pass ? "PASS" : "FAIL"}`).join(", ")}` : "NOT in the ledger"); }
const yMid = 2 * CELL + 1024;
const bind = await sharp(path.join(OUT, "work", "c2-2", "context", "binding.png")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const wx0 = 2 * CELL - BLEED, wy0 = 2 * CELL - BLEED, W = bind.info.width, v = yMid - wy0;
let bx = -1; for (let u = 0; u < W; u++) if (bind.data[(v * W + u) * 4] === 255) { bx = wx0 + u; break; }
console.log("geometric boundary at yMid:", bx, "(nominal 4096)");
// the stitched tiles around the crown
let gap = 0, minX = 1e9, maxX = -1, minY = 1e9, maxY = -1, dark = 0, n = 0;
const tiles = new Map();
async function px(x, y) { const k = `${x >> 8},${y >> 8}`; if (!tiles.has(k)) { const f = path.join(OUT, "tiles", "L0", `${x >> 8}-${y >> 8}.webp`); tiles.set(k, fs.existsSync(f) ? await sharp(f).ensureAlpha().raw().toBuffer() : null); } const d = tiles.get(k); if (!d) return null; const o = ((y & 255) * TILE + (x & 255)) * 4; return [d[o], d[o + 1], d[o + 2], d[o + 3]]; }
let missingTile = 0;
for (let y = yMid - 70; y <= yMid + 70; y++) for (let x = bx - 70; x <= bx + 70; x++) {
  if (Math.hypot(x - bx, y - yMid) >= 58) continue; n++;
  const p = await px(x, y); if (!p) { missingTile++; continue; }
  if (p[3] !== 255) { gap++; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  if (p[0] < 45 && p[1] < 45 && p[2] < 45) dark++;
}
console.log(`crown interior ${n} px: ${gap} not opaque (bbox x ${minX}..${maxX}, y ${minY}..${maxY}), ${dark} crown-dark, ${missingTile} on missing tiles`);
for (const [x, y] of [[bx - 40, yMid], [bx - 10, yMid], [bx, yMid], [bx + 10, yMid], [bx + 40, yMid], [bx + 100, yMid], [bx - 100, yMid]]) console.log(`  world (${x},${y}) =`, await px(x, y));
// c2-2's recorded source at the crown
const src = path.join(OUT, "sources", "c2-2", "c2-2-l2.png");
if (fs.existsSync(src)) { const s = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); const sx0 = 2 * CELL - BLEED, sy0 = 2 * CELL - BLEED;
  for (const [x, y] of [[bx - 40, yMid], [bx, yMid], [bx + 40, yMid]]) { const o = ((y - sy0) * s.info.width + (x - sx0)) * 4; console.log(`  c2-2 l2 at (${x},${y}) =`, [s.data[o], s.data[o + 1], s.data[o + 2], s.data[o + 3]]); } }
else console.log("no recorded source for c2-2");
