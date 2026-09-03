// A crown measurement that survives what broke the old one.
//
// The old statistic was a colour window + connected components + a 20000 px
// cap: in dense cells the stand and the mossy ground fused into one component,
// the cap threw it away, and the median came from scraps.
//
// This one:
//   1. mask = LOCALLY DARK and green — a crown is dark against its own ground,
//      which moss and heather are not, so ground drops out on its own merits;
//   2. size by maximal inscribed disks on the distance transform, not by
//      component bounding boxes, so touching crowns in a stand keep their own
//      radius instead of merging into one blob;
//   3. no cap — the largest crown is exactly what has to be catchable.
// Reported in metres against the plan's own rule.
//   node .codex-tmp/session3/crown-measure.mjs [cellId ...]
import sharp from "sharp"; import fs from "node:fs";
sharp.cache(false);
const SRC = "art-source/career-world/l2-land/ninjaone", OUT = ".codex-tmp/session3/review";
const GEN = 2560, BLEED = 256, CELL = 2048;
const SS = 2;                                   // 2:1 working scale — 4 m is still 42 px
const M_PER_PX = (97.6 / 2048) * SS;            // metres per working pixel
const DARK = 26;                                // luma below local ground to count as canopy
const BGR = 120;                                // local-ground radius, working px (~11 m)
const FLOOR_R = 6;                              // ignore inscribed disks under this radius

const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
function greenish(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx === 0) return false;
  if ((mx - mn) / mx < 0.12) return false;
  let h; if (mx === r) h = 60 * (((g - b) / (mx - mn)) % 6); else if (mx === g) h = 60 * ((b - r) / (mx - mn) + 2); else h = 60 * ((r - g) / (mx - mn) + 4);
  if (h < 0) h += 360; return h >= 55 && h <= 185;
}
// exact squared EDT (Felzenszwalb & Huttenlocher), one pass per axis
function edt1d(f, n, d, v, z) {
  let k = 0; v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
    k++; v[k] = q; z[k] = s; z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; const dq = q - v[k]; d[q] = dq * dq + f[v[k]]; }
}
function edt(mask, W, H) {
  const INF = 1e12, f = new Float64Array(Math.max(W, H)), d = new Float64Array(Math.max(W, H));
  const v = new Int32Array(Math.max(W, H)), z = new Float64Array(Math.max(W, H) + 1);
  const g = new Float64Array(W * H);
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) f[y] = mask[y * W + x] ? INF : 0;
    edt1d(f, H, d, v, z);
    for (let y = 0; y < H; y++) g[y * W + x] = d[y];
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) f[x] = g[y * W + x];
    edt1d(f, W, d, v, z);
    for (let x = 0; x < W; x++) g[y * W + x] = d[x];
  }
  return g;                                     // squared distance
}
// separable max filter — the local ground level a crown must be dark against
function maxFilter(src, W, H, r) {
  const tmp = new Float32Array(W * H), out = new Float32Array(W * H);
  for (let y = 0; y < H; y++) { const o = y * W;
    for (let x = 0; x < W; x++) { let m = 0; const a = Math.max(0, x - r), b = Math.min(W - 1, x + r);
      for (let i = a; i <= b; i++) { const v2 = src[o + i]; if (v2 > m) m = v2; } tmp[o + x] = m; } }
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) { let m = 0; const a = Math.max(0, y - r), b = Math.min(H - 1, y + r);
      for (let i = a; i <= b; i++) { const v2 = tmp[i * W + x]; if (v2 > m) m = v2; } out[y * W + x] = m; } }
  return out;
}
const want = process.argv.slice(2);
const metrics = JSON.parse(fs.readFileSync(`${OUT}/territory-metrics.json`, "utf8"));
const rows = [];
for (const m of metrics) {
  if (want.length && !want.includes(m.id)) continue;
  const p = `${SRC}/${m.id}/${m.id}-l2.png`;
  const meta = await sharp(p).metadata();
  let img = sharp(p); if (meta.width !== GEN) img = img.resize(GEN, GEN, { kernel: "lanczos3" });
  const full = await img.ensureAlpha().raw().toBuffer();
  const W = CELL / SS, H = CELL / SS;
  const lum = new Float32Array(W * H), grn = new Uint8Array(W * H), op = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = ((y * SS + BLEED) * GEN + x * SS + BLEED) * 4, o = y * W + x;
    if (full[i + 3] <= 250) { lum[o] = 0; continue; }
    op[o] = 1; lum[o] = luma(full[i], full[i + 1], full[i + 2]);
    grn[o] = greenish(full[i], full[i + 1], full[i + 2]) ? 1 : 0;
  }
  const ground = maxFilter(lum, W, H, BGR);
  const mask = new Uint8Array(W * H);
  let maskN = 0;
  for (let o = 0; o < W * H; o++) if (op[o] && grn[o] && ground[o] - lum[o] >= DARK) { mask[o] = 1; maskN++; }
  const d2 = edt(mask, W, H);
  // maximal inscribed disks: take the deepest point, claim its disk, repeat
  const idx = [];
  for (let o = 0; o < W * H; o++) if (d2[o] >= FLOOR_R * FLOOR_R) idx.push(o);
  idx.sort((a, b) => d2[b] - d2[a]);
  const taken = new Uint8Array(W * H); const radii = []; const disks = [];
  for (const o of idx) {
    if (taken[o]) continue;
    const r = Math.sqrt(d2[o]); radii.push(r);
    disks.push({ r, wx: m.c * CELL + (o % W) * SS, wy: m.r * CELL + ((o - (o % W)) / W) * SS });
    const ox = o % W, oy = (o - ox) / W, R = Math.ceil(r);
    for (let dy = -R; dy <= R; dy++) { const yy = oy + dy; if (yy < 0 || yy >= H) continue;
      for (let dx = -R; dx <= R; dx++) { const xx = ox + dx; if (xx < 0 || xx >= W) continue;
        if (dx * dx + dy * dy <= r * r) taken[yy * W + xx] = 1; } }
  }
  radii.sort((a, b) => a - b);
  const q = (f) => radii.length ? radii[Math.min(radii.length - 1, Math.floor(f * radii.length))] : NaN;
  const dm = (r) => +(2 * r * M_PER_PX).toFixed(2);         // inscribed diameter in metres
  const rec = { id: m.id, biome: m.biome, n: radii.length, coverPct: +(maskN / (W * H) * 100).toFixed(1),
    medianM: dm(q(0.5)), p90M: dm(q(0.9)), maxM: dm(radii[radii.length - 1] ?? NaN),
    maxOverMedian: +((radii[radii.length - 1] ?? NaN) / (q(0.5) || 1)).toFixed(2), oldMed: m.med };
  disks.sort((a, b) => b.r - a.r);
  rec.top = disks.slice(0, 3).map((d) => `${(2 * d.r * M_PER_PX).toFixed(1)}m @ [${d.wx},${d.wy}]`);
  rows.push(rec);
  console.log(`${rec.id} ${String(rec.biome).padEnd(22)} n${String(rec.n).padStart(5)} cover ${String(rec.coverPct).padStart(5)}%  median ${String(rec.medianM).padStart(5)} m  p90 ${String(rec.p90M).padStart(5)} m  MAX ${String(rec.maxM).padStart(6)} m  (max/med ${rec.maxOverMedian})   old px-median ${rec.oldMed}`);
  console.log(`      biggest three: ${rec.top.join("  |  ")}`);
}
if (!want.length) fs.writeFileSync(`${OUT}/crown-measure.json`, JSON.stringify(rows, null, 1));
const maxes = rows.map((r) => r.maxM).sort((a, b) => a - b);
console.log(`\nmax inscribed crown across the cells: ${maxes.join(", ")}`);
