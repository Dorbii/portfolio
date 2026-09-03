// Lock-change 5b prototype: grow a delivered water mask into CONTIGUOUS pixels
// the fringe classifier calls water, up to REACH px, fill holes, then re-run the
// gate's 6/48 px ring replica on the grown mask. Reports before/after.
//   node mask-grow.mjs <dir> <id> [reach=48] [outMapPng]
import sharp from "sharp";
sharp.cache(false);
const GEN = 2560; const [dir, id, reachS, out] = process.argv.slice(2); const REACH = +(reachS ?? 48);
const l2 = await sharp(`${dir}/${id}-l2.png`).ensureAlpha().raw().toBuffer();
const wm = await sharp(`${dir}/${id}-water.png`).ensureAlpha().raw().toBuffer();
const N = GEN * GEN, water = new Uint8Array(N);
for (let i = 0; i < N; i++) water[i] = (wm[i * 4 + 3] > 128 && wm[i * 4] > 128) ? 1 : 0;
const isF = (i) => { const r = l2[i * 4], g = l2[i * 4 + 1], b = l2[i * 4 + 2]; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); const sat = mx ? (mx - mn) / mx : 0; return mx > 40 && sat > 0.25 && b > r && b >= g; };
function rings(mask) {
  const S = GEN + 1, rp = new Int32Array(GEN * S), cp = new Int32Array(GEN * S);
  for (let y = 0; y < GEN; y++) { let s = 0; for (let x = 0; x < GEN; x++) { s += mask[y * GEN + x]; rp[y * S + x + 1] = s; } }
  for (let x = 0; x < GEN; x++) { let s = 0; for (let y = 0; y < GEN; y++) { s += mask[y * GEN + x]; cp[x * S + y + 1] = s; } }
  const near = (x, y, d) => { const xa = Math.max(0, x - d), xb = Math.min(GEN - 1, x + d); if (rp[y * S + xb + 1] - rp[y * S + xa] > 0) return true; const ya = Math.max(0, y - d), yb = Math.min(GEN - 1, y + d); return cp[x * S + yb + 1] - cp[x * S + ya] > 0; };
  let n6 = 0, f6 = 0, n48 = 0, f48 = 0;
  for (let y = 1; y < GEN - 1; y++) for (let x = 1; x < GEN - 1; x++) { const i = y * GEN + x; if (mask[i] || l2[i * 4 + 3] <= 250) continue; if (!near(x, y, 48)) continue; const f = isF(i); n48++; if (f) f48++; if (near(x, y, 6)) { n6++; if (f) f6++; } }
  return { r6: 100 * f6 / (n6 || 1), r48: 100 * f48 / (n48 || 1) };
}
const before = rings(water);
// growth: BFS from mask pixels into land pixels that are classifier-positive, bounded by REACH steps (8-connected)
const grown = Uint8Array.from(water); const dist = new Int32Array(N).fill(-1);
let q = []; for (let i = 0; i < N; i++) if (water[i]) { dist[i] = 0; }
for (let y = 0; y < GEN; y++) for (let x = 0; x < GEN; x++) { const i = y * GEN + x; if (!water[i]) continue; // boundary seeds only
  let edge = false; for (let dy = -1; dy <= 1 && !edge; dy++) for (let dx = -1; dx <= 1 && !edge; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= GEN || yy >= GEN) continue; if (!water[yy * GEN + xx]) edge = true; }
  if (edge) q.push(i); }
let added = 0, addedOpaque = 0;
while (q.length) { const nq = []; for (const p of q) { const px = p % GEN, py = (p - px) / GEN, d = dist[p];
    if (d >= REACH) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = px + dx, yy = py + dy; if (xx < 0 || yy < 0 || xx >= GEN || yy >= GEN) continue; const j = yy * GEN + xx; if (dist[j] >= 0) continue;
      // grow only through opaque land that reads as water paint; alpha<=250 land (the cut feather) is taken as well
      if (!(l2[j * 4 + 3] <= 250 || isF(j))) continue; dist[j] = d + 1; grown[j] = 1; added++; if (l2[j * 4 + 3] > 250) addedOpaque++; nq.push(j); } }
  q = nq; }
// hole fill: anything not reachable from the border through non-mask pixels becomes mask
const reach = new Uint8Array(N); let stack = [];
for (let x = 0; x < GEN; x++) { stack.push(x, (GEN - 1) * GEN + x); } for (let y = 0; y < GEN; y++) { stack.push(y * GEN, y * GEN + GEN - 1); }
for (const s of stack) if (!grown[s]) reach[s] = 1;
let st = stack.filter((s) => !grown[s]);
while (st.length) { const p = st.pop(); const px = p % GEN, py = (p - px) / GEN; const nb = [p - 1, p + 1, p - GEN, p + GEN]; if (px === 0) nb[0] = -1; if (px === GEN - 1) nb[1] = -1; if (py === 0) nb[2] = -1; if (py === GEN - 1) nb[3] = -1;
  for (const j of nb) { if (j < 0 || j >= N || reach[j] || grown[j]) continue; reach[j] = 1; st.push(j); } }
let holes = 0; for (let i = 0; i < N; i++) if (!grown[i] && !reach[i]) { grown[i] = 1; holes++; }
const after = rings(grown);
const maskN = water.reduce((a, b) => a + b, 0);
console.log(`${id}: mask ${maskN} px; grown +${added} px of which OPAQUE land ${addedOpaque} (${(100 * addedOpaque / maskN).toFixed(2)}% of the mask; the rest is the cut feather), holes filled ${holes}; ring6 ${before.r6.toFixed(2)}% -> ${after.r6.toFixed(2)}%; ring48 ${before.r48.toFixed(2)}% -> ${after.r48.toFixed(2)}%`);
if (out) { const c = await sharp(`${dir}/${id}-concept.png`).ensureAlpha().raw().toBuffer();
  for (let i = 0; i < N; i++) { if (grown[i] && !water[i]) { c[i * 4] = 255; c[i * 4 + 1] = 40; c[i * 4 + 2] = 40; } else if (water[i]) { c[i * 4 + 2] = Math.min(255, c[i * 4 + 2] + 60); } }
  await sharp(c, { raw: { width: GEN, height: GEN, channels: 4 } }).resize(1280, 1280, { kernel: "lanczos3" }).png().toFile(out); console.log("wrote", out); }
