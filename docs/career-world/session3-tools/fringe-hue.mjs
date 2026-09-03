// The fringe rings (6/48 px) with two classifiers: the gate's blue-leaning test
// (mx>40, sat>.25, b>r, b>=g) and a hue-limited one (same, plus hue 150..225),
// on the DELIVERED mask (water-source upscaled and binarised), so the growth is
// not in the way. Shows whether violet ground is what the gate calls water.
import sharp from "sharp"; sharp.cache(false);
const GEN = 2560; const [dir, id, label] = process.argv.slice(2);
const src = await sharp(`${dir}/${id}-source.png`).ensureAlpha().resize(GEN, GEN, { kernel: "lanczos3" }).raw().toBuffer();
const wm = await sharp(`${dir}/${id}-water-source.png`).ensureAlpha().resize(GEN, GEN, { kernel: "lanczos3" }).raw().toBuffer();
const N = GEN * GEN, water = new Uint8Array(N); for (let i = 0; i < N; i++) water[i] = (wm[i*4+3] > 128 && wm[i*4] > 128) ? 1 : 0;
const S = GEN + 1, rp = new Int32Array(GEN * S), cp = new Int32Array(GEN * S);
for (let y = 0; y < GEN; y++) { let s = 0; for (let x = 0; x < GEN; x++) { s += water[y*GEN+x]; rp[y*S+x+1] = s; } }
for (let x = 0; x < GEN; x++) { let s = 0; for (let y = 0; y < GEN; y++) { s += water[y*GEN+x]; cp[x*S+y+1] = s; } }
const near = (x, y, d) => { const xa = Math.max(0, x-d), xb = Math.min(GEN-1, x+d); if (rp[y*S+xb+1]-rp[y*S+xa] > 0) return true; const ya = Math.max(0, y-d), yb = Math.min(GEN-1, y+d); return cp[x*S+yb+1]-cp[x*S+ya] > 0; };
const hue = (r, g, b) => { const mx = Math.max(r,g,b), mn = Math.min(r,g,b); if (mx === mn) return 0; let h; if (mx === r) h = 60*(((g-b)/(mx-mn))%6); else if (mx === g) h = 60*((b-r)/(mx-mn)+2); else h = 60*((r-g)/(mx-mn)+4); return h < 0 ? h+360 : h; };
const blue = (i) => { const r = src[i*4], g = src[i*4+1], b = src[i*4+2]; const mx = Math.max(r,g,b), mn = Math.min(r,g,b); const sat = mx ? (mx-mn)/mx : 0; return mx > 40 && sat > 0.25 && b > r && b >= g; };
const blueHue = (i) => { if (!blue(i)) return false; const h = hue(src[i*4], src[i*4+1], src[i*4+2]); return h >= 150 && h <= 225; };
let n6 = 0, n48 = 0, f6 = 0, f48 = 0, h6 = 0, h48 = 0; const hist = new Int32Array(12);
for (let y = 1; y < GEN-1; y++) for (let x = 1; x < GEN-1; x++) { const i = y*GEN+x; if (water[i]) continue; if (!near(x, y, 48)) continue; const b = blue(i), h = blueHue(i); n48++; if (b) { f48++; hist[Math.min(11, Math.floor(hue(src[i*4], src[i*4+1], src[i*4+2]) / 30))]++; } if (h) h48++; if (near(x, y, 6)) { n6++; if (b) f6++; if (h) h6++; } }
console.log(`${label}: gate classifier ring6 ${(100*f6/n6).toFixed(2)}% ring48 ${(100*f48/n48).toFixed(2)}%  |  hue-limited (150-225) ring6 ${(100*h6/n6).toFixed(2)}% ring48 ${(100*h48/n48).toFixed(2)}%  | flagged px by hue bin (30deg): ${Array.from(hist).map((v, k) => v ? `${k*30}-${k*30+30}:${v}` : "").filter(Boolean).join(" ")}`);
