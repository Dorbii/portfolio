// PROTOTYPE (scratch, not the pipeline): a content-aware seam for one vertical
// seam — the minimum-error boundary cut of image quilting (Efros & Freeman 2001).
// Both paints cover the whole +-256 px band (each cell's canvas carries a 256 px
// bleed past its edge), so the boundary can run wherever the two paints agree
// best — open ground — instead of the fixed jittered wiggle, which cuts whatever
// feature happens to straddle it.
//   node mincut-seam.mjs <leftId> <leftCanvas> <rightId> <rightCanvas> <colRight> <row> <outPrefix>
import sharp from "sharp"; import fs from "node:fs"; import path from "node:path";
import { makeSeam, worldWindow, CELL_PX, BLEED, GEN_PX, FEATHER } from "./seam-geo.mjs";
sharp.cache(false);
const [leftId, leftCanvas, rightId, rightCanvas, cS, rS, outPrefix] = process.argv.slice(2);
const colR = +cS, row = +rS, colL = colR - 1;
const HALF = 128, LAMBDA = 2;                      // band half-width, lateral-step penalty (luma units)
const seam = makeSeam(5, 4);
const sx = colR * CELL_PX, ry0 = row * CELL_PX;
const load = async (p) => sharp(p).resize(GEN_PX, GEN_PX, { kernel: "lanczos3" }).ensureAlpha().raw().toBuffer();
const A = await load(leftCanvas), B = await load(rightCanvas);
const ax0 = colL * CELL_PX - BLEED, ay0 = ry0 - BLEED, bx0 = colR * CELL_PX - BLEED, by0 = ry0 - BLEED;
const pa = (x, y) => ((y - ay0) * GEN_PX + (x - ax0)) * 4, pb = (x, y) => ((y - by0) * GEN_PX + (x - bx0)) * 4;
const cost = (x, y) => { const a = pa(x, y), b = pb(x, y); let s = 0; for (let k = 0; k < 3; k++) { const d = A[a + k] - B[b + k]; s += d * d; } return Math.sqrt(s / 3); };
// ---- dynamic programme down the seam: state = x offset in the band -------------
const K = 2 * HALF + 1, N = CELL_PX;
const dp = new Float64Array(K * N).fill(Infinity), from = new Int16Array(K * N);
const k0 = Math.round(seam.vOffset(colR, ry0 + 0.5)) + HALF, k1 = Math.round(seam.vOffset(colR, ry0 + N - 0.5)) + HALF;
dp[k0] = cost(sx - HALF + k0, ry0);
for (let y = 1; y < N; y++) for (let k = 0; k < K; k++) {
  let best = Infinity, bk = -1;
  for (let d = -1; d <= 1; d++) { const kk = k + d; if (kk < 0 || kk >= K) continue; const v = dp[(y - 1) * K + kk] + (d ? LAMBDA : 0); if (v < best) { best = v; bk = kk; } }
  if (bk < 0) continue; dp[y * K + k] = best + cost(sx - HALF + k, ry0 + y); from[y * K + k] = bk;
}
const pathK = new Int16Array(N); pathK[N - 1] = k1;
for (let y = N - 1; y > 0; y--) pathK[y - 1] = from[y * K + pathK[y]];
const bx = (y) => sx - HALF + pathK[y];                              // boundary x per row: right cell owns x >= bx
// ---- how much paint disagreement each boundary walks through -------------------
const mean = (f) => { let s = 0; for (let y = 0; y < N; y++) s += f(y); return s / N; };
const cMin = mean((y) => cost(bx(y), ry0 + y));
const cGeo = mean((y) => cost(Math.round(sx + seam.vOffset(colR, ry0 + y + 0.5)), ry0 + y));
const cStraight = mean((y) => cost(sx, ry0 + y));
let wander = 0, maxOff = 0; for (let y = 0; y < N; y++) { const o = Math.abs(bx(y) - sx); wander += o; maxOff = Math.max(maxOff, o); }
console.log(`${leftId}|${rightId}: mean paint disagreement along the boundary — straight ${cStraight.toFixed(1)}, geometric wiggle ${cGeo.toFixed(1)}, min-cut ${cMin.toFixed(1)} (luma-ish units); the cut sits on average ${(wander / N).toFixed(0)} px off the nominal line, at most ${maxOff}`);
// ---- render the band with the min-cut boundary, 8 px feather, over the world ----
const wx0 = sx - 256, wy0 = ry0 - 82, WW = 512, WH = N + 164;
const world = await worldWindow(wx0, wy0, WW, WH);
let mask = new Float32Array(WW * WH), inBand = new Uint8Array(WW * WH);
for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) {
  const X = wx0 + x, Y = wy0 + y; if (Y < ry0 || Y >= ry0 + N) continue;
  const own = seam.owner(X + 0.5, Y + 0.5); if (own !== leftId && own !== rightId) continue;   // a north/south neighbour's tab keeps the world
  inBand[y * WW + x] = 1; mask[y * WW + x] = X >= bx(Y - ry0) ? 1 : 0;
}
function blur(m, W, H, R) { const w = 2 * R + 1, t = new Float32Array(W * H), d = new Float32Array(W * H);
  for (let v = 0; v < H; v++) for (let u = 0; u < W; u++) { let s = 0; for (let k = -R; k <= R; k++) s += m[v * W + Math.min(W - 1, Math.max(0, u + k))]; t[v * W + u] = s / w; }
  for (let u = 0; u < W; u++) for (let v = 0; v < H; v++) { let s = 0; for (let k = -R; k <= R; k++) s += t[Math.min(H - 1, Math.max(0, v + k)) * W + u]; d[v * W + u] = s / w; }
  return d; }
mask = blur(blur(mask, WW, WH, FEATHER / 2), WW, WH, FEATHER / 2);
const out = Buffer.from(world);
for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) {
  if (!inBand[y * WW + x]) continue; const X = wx0 + x, Y = wy0 + y, m = mask[y * WW + x], o = (y * WW + x) * 4, a = pa(X, Y), b = pb(X, Y);
  for (let k = 0; k < 3; k++) out[o + k] = Math.round(m * B[b + k] + (1 - m) * A[a + k]); out[o + 3] = 255;
}
fs.mkdirSync(path.dirname(outPrefix), { recursive: true });
const img = sharp(out, { raw: { width: WW, height: WH, channels: 4 } });
await img.clone().extract({ left: 256 - 132, top: 0, width: 264, height: 2212 }).resize(66, 553, { kernel: "lanczos3" }).png().toFile(`${outPrefix}-strip.png`);
await img.clone().extract({ left: 0, top: 82, width: 512, height: 1024 }).png().toFile(`${outPrefix}-north.png`);
await img.clone().extract({ left: 0, top: 82 + 1024, width: 512, height: 1024 }).png().toFile(`${outPrefix}-south.png`);
fs.writeFileSync(`${outPrefix}-path.json`, JSON.stringify({ sx, ry0, bx: Array.from(pathK).map((k) => sx - HALF + k) }));
console.log("wrote", outPrefix, "strip / north / south");
