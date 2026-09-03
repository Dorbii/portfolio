// The step the eye sees: mean luma just either side of the ACTUAL seam curve (10..34 px away),
// per row, versus the same measurement on straight lines inside each cell (no seam there).
// Also done for the horizontal c4-2|c4-3 seam by classifying its pixels the same way.
import sharp from "sharp"; import fs from "node:fs"; import path from "node:path";
sharp.cache(false);
const TILES = "public/career-world/layers/terrain/authority/tiles/l2-ninjaone-r1";
const SRC = "art-source/career-world/l2-land/ninjaone";
const TILE = 256, CELL = 2048, BLEED = 256, GEN = 2560;
async function assemble(x0, y0, x1, y1) {
  const ax0 = Math.floor(x0 / TILE) * TILE, ay0 = Math.floor(y0 / TILE) * TILE;
  const ax1 = Math.ceil(x1 / TILE) * TILE, ay1 = Math.ceil(y1 / TILE) * TILE;
  const dir = path.join(TILES, "L0"), comps = [];
  for (const f of fs.readdirSync(dir)) {
    const [tx, ty] = f.replace(".webp", "").split("-").map(Number);
    const px = tx * TILE, py = ty * TILE;
    if (px >= ax1 || py >= ay1 || px + TILE <= ax0 || py + TILE <= ay0) continue;
    comps.push({ input: path.join(dir, f), left: px - ax0, top: py - ay0 });
  }
  const W = ax1 - ax0, H = ay1 - ay0;
  const full = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(comps).raw().toBuffer();
  const w = x1 - x0, h = y1 - y0, out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) { const s = ((y + y0 - ay0) * W + (x0 - ax0)) * 4; full.copy(out, y * w * 4, s, s + w * 4); }
  const L = new Float32Array(w * h), M = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) { M[i] = out[i * 4 + 3] === 255 ? 1 : 0; L[i] = 0.299 * out[i * 4] + 0.587 * out[i * 4 + 1] + 0.114 * out[i * 4 + 2]; }
  return { data: out, w, h, x0, y0, L, M, lum: (gx, gy) => { const i = (gy - y0) * w + (gx - x0); return M[i] ? L[i] : NaN; } };
}
const srcRaw = async id => sharp(path.join(SRC, id, `${id}-l2.png`)).ensureAlpha().raw().toBuffer();
const px = (buf, gx, gy, org) => { const x = gx - org[0], y = gy - org[1]; if (x < 0 || y < 0 || x >= GEN || y >= GEN) return null; const i = (y * GEN + x) * 4; return [buf[i], buf[i + 1], buf[i + 2], buf[i + 3]]; };
const same = (p, q) => p && q && p[3] === 255 && q[3] === 255 && Math.abs(p[0] - q[0]) <= 2 && Math.abs(p[1] - q[1]) <= 2 && Math.abs(p[2] - q[2]) <= 2;
const meanOf = a => a.reduce((s, v) => s + v, 0) / a.length;
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const wmean = (R, vals) => { const v = vals.filter(x => !Number.isNaN(x)); return v.length >= 12 ? meanOf(v) : NaN; };
// step across a vertical curve x(y): windows [x-34,x-10) and (x+10,x+34]
function stepsV(R, xAt, y0, y1) {
  const out = [];
  for (let gy = y0; gy < y1; gy++) { const xt = xAt(gy); if (xt == null) continue;
    const l = [], r = []; for (let d = 10; d <= 34; d++) { l.push(R.lum(Math.round(xt - d), gy)); r.push(R.lum(Math.round(xt + d), gy)); }
    const a = wmean(R, l), b = wmean(R, r); if (!Number.isNaN(a) && !Number.isNaN(b)) out.push(Math.abs(a - b)); }
  return out;
}
function stepsH(R, yAt, x0, x1) {
  const out = [];
  for (let gx = x0; gx < x1; gx++) { const yt = yAt(gx); if (yt == null) continue;
    const l = [], r = []; for (let d = 10; d <= 34; d++) { l.push(R.lum(gx, Math.round(yt - d))); r.push(R.lum(gx, Math.round(yt + d))); }
    const a = wmean(R, l), b = wmean(R, r); if (!Number.isNaN(a) && !Number.isNaN(b)) out.push(Math.abs(a - b)); }
  return out;
}
const report = (name, s) => console.log(`${name.padEnd(48)} n ${String(s.length).padStart(4)}  mean step ${meanOf(s).toFixed(1)}  median ${pct(s, 0.5).toFixed(1)}  p90 ${pct(s, 0.9).toFixed(1)}`);

// ---- vertical seam c3-3|c4-3: transition curve from the previous run
const trans = JSON.parse(fs.readFileSync(".codex-tmp/session3/review/seam-diag/seam-33-43-transition.json", "utf8"));
const tAt = new Map(trans.map(r => [r.y, 8192 + r.t]));
{
  const R = await assemble(8192 - 1000, 3 * CELL, 8192 + 1000, 4 * CELL);
  report("SEAM c3-3|c4-3, along the measured curve", stepsV(R, gy => tAt.get(gy) ?? null, 3 * CELL, 4 * CELL));
  for (const off of [-800, -600, -400, 400, 600, 800]) report(`  straight line ${off > 0 ? "inside c4-3" : "inside c3-3"} at x=8192${off > 0 ? "+" : ""}${off}`, stepsV(R, () => 8192 + off, 3 * CELL, 4 * CELL));
}
// ---- horizontal seam c4-2|c4-3: classify pixels against both sources to find the curve, then step
{
  const A = await srcRaw("c4-2"), B = await srcRaw("c4-3");
  const OA = [4 * CELL - BLEED, 2 * CELL - BLEED], OB = [4 * CELL - BLEED, 3 * CELL - BLEED];
  const band = await assemble(4 * CELL, 6144 - 192, 5 * CELL, 6144 + 192);
  const yAt = new Map(); const ws = [];
  for (let x = 0; x < band.w; x++) { const gx = band.x0 + x; let lastA = -1, firstB = -1;
    const cls = new Int8Array(band.h);
    for (let y = 0; y < band.h; y++) { const gy = band.y0 + y, i = (y * band.w + x) * 4; const s = [band.data[i], band.data[i + 1], band.data[i + 2], band.data[i + 3]];
      const a = same(s, px(A, gx, gy, OA)), b = same(s, px(B, gx, gy, OB)); cls[y] = a && !b ? 1 : b && !a ? 2 : 0; }
    for (let y = 0; y < band.h; y++) if (cls[y] === 1) lastA = y;
    for (let y = band.h - 1; y >= 0; y--) if (cls[y] === 2) firstB = y;
    if (lastA >= 0 && firstB >= 0 && lastA < firstB) { yAt.set(gx, band.y0 + (lastA + firstB) / 2); ws.push(firstB - lastA - 1); } }
  const offs = [...yAt.values()].map(v => v - 6144);
  console.log(`c4-2|c4-3 seam: ${yAt.size}/${band.w} columns with a clean transition; y offset mean ${meanOf(offs).toFixed(1)} min ${Math.min(...offs)} max ${Math.max(...offs)}; blend width mean ${meanOf(ws).toFixed(1)}`);
  const R = await assemble(4 * CELL, 6144 - 1000, 5 * CELL, 6144 + 1000);
  report("SEAM c4-2|c4-3, along the measured curve", stepsH(R, gx => yAt.get(gx) ?? null, 4 * CELL, 5 * CELL));
  for (const off of [-800, -600, -400, 400, 600, 800]) report(`  straight line ${off > 0 ? "inside c4-3" : "inside c4-2"} at y=6144${off > 0 ? "+" : ""}${off}`, stepsH(R, () => 6144 + off, 4 * CELL, 5 * CELL));
}
