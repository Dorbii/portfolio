// Where the water-fringe gate's pixels are: replicates the 6px/48px cross-shaped
// ring search and the blue-leaning classifier, tallies per 320px block, draws red.
import sharp from "sharp";
sharp.cache(false);
const GEN = 2560; const [dir, id, out] = process.argv.slice(2);
const l2 = await sharp(`${dir}/${id}-l2.png`).ensureAlpha().raw().toBuffer();
const wm = await sharp(`${dir}/${id}-water.png`).ensureAlpha().raw().toBuffer();
const water = new Uint8Array(GEN * GEN);
for (let i = 0; i < GEN * GEN; i++) water[i] = (wm[i * 4 + 3] > 128 && wm[i * 4] > 128) ? 1 : 0;
const S = GEN + 1, rp = new Int32Array(GEN * S), cp = new Int32Array(GEN * S);
for (let y = 0; y < GEN; y++) { let s = 0; for (let x = 0; x < GEN; x++) { s += water[y * GEN + x]; rp[y * S + x + 1] = s; } }
for (let x = 0; x < GEN; x++) { let s = 0; for (let y = 0; y < GEN; y++) { s += water[y * GEN + x]; cp[x * S + y + 1] = s; } }
const near = (x, y, d) => {
  const xa = Math.max(0, x - d), xb = Math.min(GEN - 1, x + d);
  if (rp[y * S + xb + 1] - rp[y * S + xa] > 0) return true;
  const ya = Math.max(0, y - d), yb = Math.min(GEN - 1, y + d);
  return cp[x * S + yb + 1] - cp[x * S + ya] > 0;
};
const isF = (i) => { const r = l2[i * 4], g = l2[i * 4 + 1], b = l2[i * 4 + 2]; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); const sat = mx ? (mx - mn) / mx : 0; return mx > 40 && sat > 0.25 && b > r && b >= g; };
let n6 = 0, f6 = 0, n48 = 0, f48 = 0; const grid = new Int32Array(64); const over = Buffer.alloc(GEN * GEN * 4);
const mark = (x, y) => { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= GEN || yy >= GEN) continue; const o = (yy * GEN + xx) * 4; over[o] = 255; over[o + 1] = 0; over[o + 2] = 0; over[o + 3] = 255; } };
for (let y = 1; y < GEN - 1; y++) for (let x = 1; x < GEN - 1; x++) {
  const i = y * GEN + x; if (water[i] || l2[i * 4 + 3] <= 250) continue;
  if (!near(x, y, 48)) continue; const in6 = near(x, y, 6); const f = isF(i);
  n48++; if (f) f48++; if (in6) { n6++; if (f) f6++; }
  if (f) { grid[Math.min(7, Math.floor(y / 320)) * 8 + Math.min(7, Math.floor(x / 320))]++; mark(x, y); }
}
console.log(`${id}: ring6 ${(100 * f6 / n6).toFixed(2)}% (${f6}/${n6})   ring48 ${(100 * f48 / n48).toFixed(2)}% (${f48}/${n48})`);
console.log("fringe pixels per 320px block, rows top->bottom (kept area is the inner 6.4 x 6.4 blocks; the outer 0.8-block rim is bleed):");
for (let gy = 0; gy < 8; gy++) console.log("  " + Array.from(grid.slice(gy * 8, gy * 8 + 8)).map((v) => String(v).padStart(7)).join(""));
const concept = await sharp(`${dir}/${id}-concept.png`).ensureAlpha().raw().toBuffer(); for (let i = 0; i < GEN * GEN; i++) if (over[i * 4 + 3]) { concept[i * 4] = 255; concept[i * 4 + 1] = 0; concept[i * 4 + 2] = 0; }

await sharp(concept, { raw: { width: GEN, height: GEN, channels: 4 } }).resize(1280, 1280, { kernel: "lanczos3" }).png().toFile(out);
console.log("wrote", out);
