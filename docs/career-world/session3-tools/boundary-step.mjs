// Whole-territory review, the measurement the eye asked for: does the tone
// STEP at a cell boundary, or drift across it? A cast that drifts is landscape;
// a cast that steps on the grid line is a seam the reader will see.
// Works on the quarter-scale stitched picture (the reading zoom), not sources.
//   node .codex-tmp/session3/boundary-step.mjs
import sharp from "sharp"; import fs from "node:fs"; import path from "node:path";
sharp.cache(false);
const TILES = "public/career-world/layers/terrain/authority/tiles/l2-ninjaone-r1";
const OUT = ".codex-tmp/session3/review"; fs.mkdirSync(OUT, { recursive: true });
const TILE = 256, COLS = 5, ROWS = 4, S = 512;      // L2 = 1/4 scale: cell = 512 px
const W = COLS * S, H = ROWS * S;
const BAND = 24;                                     // px either side to average
const GAP = 8;                                       // skip the blend band itself

const comps = [];
for (const f of fs.readdirSync(`${TILES}/L2`)) { const [tx, ty] = f.replace(".webp", "").split("-").map(Number); comps.push({ input: path.join(TILES, "L2", f), left: tx * TILE, top: ty * TILE }); }
const png = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(comps).png().toBuffer();
const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const at = (x, y) => { const i = (y * info.width + x) * 4; return data[i + 3] > 250 ? [data[i], data[i + 1], data[i + 2]] : null; };
const luma = (p) => 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2];
const yb = (p) => (0.5 * (p[0] / 255 + p[1] / 255) - p[2] / 255) * 255;
const rg = (p) => (p[0] / 255 - p[1] / 255) * 255;
const med = (a) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

// A boundary reads if the step ACROSS it is large compared with the step the
// same picture makes over the same distance just inside each cell (the control).
function sample(fixed, from, to, vertical, side) {
  const L = [], Y = [], R = [];
  for (let t = from; t < to; t++) {
    for (let d = GAP; d < GAP + BAND; d++) {
      const off = side * d;
      const x = vertical ? fixed + off : t, y = vertical ? t : fixed + off;
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const p = at(x, y); if (!p) continue;
      L.push(luma(p)); Y.push(yb(p)); R.push(rg(p));
    }
  }
  return { n: L.length, luma: med(L), yb: med(Y), rg: med(R) };
}
const rows = [];
for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
  if (c + 1 < COLS) {                                  // vertical boundary c|c+1
    const x = (c + 1) * S, y0 = r * S, y1 = (r + 1) * S;
    const a = sample(x, y0, y1, true, -1), b = sample(x, y0, y1, true, +1);
    // control: the same-width step taken wholly inside each cell
    const ca = sample(x - 3 * BAND, y0, y1, true, -1), cb = sample(x + 3 * BAND, y0, y1, true, +1);
    rows.push({ kind: "V", id: `${c},${r}|${c + 1},${r}`, n: Math.min(a.n, b.n),
      dLuma: +(b.luma - a.luma).toFixed(1), dYb: +(b.yb - a.yb).toFixed(1), dRg: +(b.rg - a.rg).toFixed(1),
      ctrlLuma: +Math.max(Math.abs(a.luma - ca.luma), Math.abs(b.luma - cb.luma)).toFixed(1) });
  }
  if (r + 1 < ROWS) {                                  // horizontal boundary r|r+1
    const y = (r + 1) * S, x0 = c * S, x1 = (c + 1) * S;
    const a = sample(y, x0, x1, false, -1), b = sample(y, x0, x1, false, +1);
    const ca = sample(y - 3 * BAND, x0, x1, false, -1), cb = sample(y + 3 * BAND, x0, x1, false, +1);
    rows.push({ kind: "H", id: `${c},${r}|${c},${r + 1}`, n: Math.min(a.n, b.n),
      dLuma: +(b.luma - a.luma).toFixed(1), dYb: +(b.yb - a.yb).toFixed(1), dRg: +(b.rg - a.rg).toFixed(1),
      ctrlLuma: +Math.max(Math.abs(a.luma - ca.luma), Math.abs(b.luma - cb.luma)).toFixed(1) });
  }
}
rows.sort((p, q) => Math.abs(q.dLuma) - Math.abs(p.dLuma));
fs.writeFileSync(`${OUT}/boundary-steps.json`, JSON.stringify(rows, null, 1));
console.log("boundary   n      dLuma   dYb    dRg   | control dLuma (same distance, inside)");
for (const x of rows) console.log(`${x.kind} ${x.id.padEnd(12)} ${String(x.n).padStart(6)} ${String(x.dLuma).padStart(6)} ${String(x.dYb).padStart(6)} ${String(x.dRg).padStart(6)}   |  ${x.ctrlLuma}`);
const abs = rows.filter((x) => x.n > 2000).map((x) => Math.abs(x.dLuma)).sort((a, b) => a - b);
const ctl = rows.filter((x) => x.n > 2000).map((x) => x.ctrlLuma).sort((a, b) => a - b);
console.log(`\nboundary |dLuma| median ${abs[Math.floor(abs.length / 2)]}  max ${abs[abs.length - 1]}`);
console.log(`control  |dLuma| median ${ctl[Math.floor(ctl.length / 2)]}  max ${ctl[ctl.length - 1]}`);
