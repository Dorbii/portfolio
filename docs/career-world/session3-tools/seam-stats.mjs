// Do the two sides of a seam differ more than two adjacent bands INSIDE one cell do?
// Bands 16..176 px either side of a line (the palette gate's bands), measured on the
// live tiles: luma, saturation, vegetation blue/green median, gradient energy, and
// high-frequency detail. Controls: the same measurement on lines 600 px inside a cell.
import sharp from "sharp"; import fs from "node:fs"; import path from "node:path";
sharp.cache(false);
const TILES = "public/career-world/layers/terrain/authority/tiles/l2-ninjaone-r1";
const TILE = 256, CELL = 2048;
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
  // luma + opaque mask + integral images for a masked 9x9 box mean
  const L = new Float32Array(w * h), M = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) { M[i] = out[i * 4 + 3] === 255 ? 1 : 0; L[i] = M[i] ? 0.299 * out[i * 4] + 0.587 * out[i * 4 + 1] + 0.114 * out[i * 4 + 2] : 0; }
  const IL = new Float64Array((w + 1) * (h + 1)), IM = new Float64Array((w + 1) * (h + 1));
  for (let y = 1; y <= h; y++) for (let x = 1; x <= w; x++) {
    const i = (y - 1) * w + (x - 1), k = y * (w + 1) + x;
    IL[k] = L[i] + IL[k - 1] + IL[k - (w + 1)] - IL[k - (w + 2)];
    IM[k] = M[i] + IM[k - 1] + IM[k - (w + 1)] - IM[k - (w + 2)];
  }
  const boxMean = (x, y, r) => {
    const x0 = Math.max(0, x - r), y0 = Math.max(0, y - r), x1 = Math.min(w, x + r + 1), y1 = Math.min(h, y + r + 1);
    const sum = (I) => I[y1 * (w + 1) + x1] - I[y0 * (w + 1) + x1] - I[y1 * (w + 1) + x0] + I[y0 * (w + 1) + x0];
    const n = sum(IM); return n ? sum(IL) / n : 0;
  };
  return { data: out, w, h, x0, y0, L, M, boxMean };
}
function stats(R, bx0, by0, bx1, by1) {
  let n = 0, sl = 0, ss = 0, sg = 0, ng = 0, shf = 0, shf2 = 0; const hist = new Int32Array(2001);
  for (let gy = by0; gy < by1; gy++) for (let gx = bx0; gx < bx1; gx++) {
    const x = gx - R.x0, y = gy - R.y0, i = y * R.w + x; if (!R.M[i]) continue;
    const r = R.data[i * 4], g = R.data[i * 4 + 1], b = R.data[i * 4 + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx ? (mx - mn) / mx : 0;
    n++; sl += R.L[i]; ss += sat;
    if (g >= r && g >= b && sat > 0.15) hist[Math.min(2000, Math.round(1000 * b / Math.max(1, g)))]++;
    if (x + 1 < R.w && y + 1 < R.h && R.M[i + 1] && R.M[i + R.w]) { sg += Math.abs(R.L[i + 1] - R.L[i]) + Math.abs(R.L[i + R.w] - R.L[i]); ng++; }
    const hf = R.L[i] - R.boxMean(x, y, 4); shf += hf; shf2 += hf * hf;
  }
  let c = 0, tot = hist.reduce((a, v) => a + v, 0), med = 0; for (let k = 0; k <= 2000; k++) { c += hist[k]; if (c >= tot / 2) { med = k / 1000; break; } }
  return { n, luma: sl / n, sat: ss / n, bg: med, grad: sg / ng, hf: Math.sqrt(shf2 / n - (shf / n) ** 2) };
}
const fmt = s => `luma ${s.luma.toFixed(1)}  sat ${s.sat.toFixed(3)}  vegB/G ${s.bg.toFixed(3)}  grad ${s.grad.toFixed(2)}  hf ${s.hf.toFixed(2)}`;
const diff = (a, b) => ({ luma: Math.abs(a.luma - b.luma), sat: Math.abs(a.sat - b.sat), bg: Math.abs(a.bg - b.bg), grad: Math.abs(a.grad - b.grad), hf: Math.abs(a.hf - b.hf) });
const fmtD = d => `dLuma ${d.luma.toFixed(1)}  dSat ${d.sat.toFixed(3)}  dBG ${d.bg.toFixed(3)}  dGrad ${d.grad.toFixed(2)}  dHF ${d.hf.toFixed(2)}`;
const IN = 16, OUTB = 176;
const results = [];
// vertical lines: the c3-3|c4-3 seam at x=8192 and controls 600 px inside each cell
{
  const R = await assemble(8192 - 600 - OUTB, 3 * CELL, 8192 + 600 + OUTB, 4 * CELL);
  for (const [name, X] of [["SEAM c3-3|c4-3 (x=8192)", 8192], ["control inside c3-3 (x=7592)", 7592], ["control inside c4-3 (x=8792)", 8792]]) {
    const l = stats(R, X - OUTB, 3 * CELL, X - IN, 4 * CELL), r = stats(R, X + IN, 3 * CELL, X + OUTB, 4 * CELL);
    results.push({ name, l, r, d: diff(l, r) });
  }
}
// horizontal lines: the c4-2|c4-3 seam at y=6144 and controls 600 px inside each cell
{
  const R = await assemble(4 * CELL, 6144 - 600 - OUTB, 5 * CELL, 6144 + 600 + OUTB);
  for (const [name, Y] of [["SEAM c4-2|c4-3 (y=6144)", 6144], ["control inside c4-2 (y=5544)", 5544], ["control inside c4-3 (y=6744)", 6744]]) {
    const a = stats(R, 4 * CELL, Y - OUTB, 5 * CELL, Y - IN), b = stats(R, 4 * CELL, Y + IN, 5 * CELL, Y + OUTB);
    results.push({ name, l: a, r: b, d: diff(a, b) });
  }
}
for (const x of results) { console.log(x.name); console.log(`   side A: ${fmt(x.l)}`); console.log(`   side B: ${fmt(x.r)}`); console.log(`   diff:   ${fmtD(x.d)}`); }
fs.writeFileSync(".codex-tmp/session3/review/seam-diag/seam-stats.json", JSON.stringify(results, null, 1));
