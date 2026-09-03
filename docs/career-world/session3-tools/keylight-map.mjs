// Where the key light lives: per-block mean luma (a tonal ramp shows here) and
// per-block first circular moment of luminance gradients >= 12 with direction
// (the gate's measure, localised). Land pixels only (alpha > 250).
import sharp from "sharp";
sharp.cache(false);
const GEN = 2560, BLEED = 256, CELL = 2048, NB = 8, BS = CELL / NB;
const [file, label] = process.argv.slice(2);
const meta = await sharp(file).metadata(); let img = sharp(file); if (meta.width !== GEN) img = img.resize(GEN, GEN, { kernel: "lanczos3" });
const d = await img.ensureAlpha().raw().toBuffer();
const L = new Float32Array(GEN * GEN); for (let i = 0; i < GEN * GEN; i++) L[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
const lum = Array.from({ length: NB * NB }, () => [0, 0]), mx = new Float64Array(NB * NB), my = new Float64Array(NB * NB), mm = new Float64Array(NB * NB);
let gx0 = 0, gy0 = 0, gm0 = 0;
for (let y = BLEED + 1; y < BLEED + CELL - 1; y++) for (let x = BLEED + 1; x < BLEED + CELL - 1; x++) { const i = y * GEN + x; if (d[i * 4 + 3] <= 250) continue;
  const b = Math.floor((y - BLEED) / BS) * NB + Math.floor((x - BLEED) / BS); lum[b][0] += L[i]; lum[b][1]++;
  const gx = L[i + 1] - L[i - 1], gy = L[i + GEN] - L[i - GEN], m = Math.hypot(gx, gy); if (m < 12) continue;
  mx[b] += gx; my[b] += gy; mm[b] += m; gx0 += gx; gy0 += gy; gm0 += m; }
const deg = (x, y) => ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
console.log(`${label ?? file}: global moment ${(Math.hypot(gx0, gy0) / gm0).toFixed(4)} toward ${deg(gx0, gy0).toFixed(0)} deg (0=brighter to the east, 90=brighter to the south)`);
console.log("block mean luma (rows top->bottom):"); for (let r = 0; r < NB; r++) console.log("  " + Array.from({ length: NB }, (_, c) => (lum[r * NB + c][0] / (lum[r * NB + c][1] || 1)).toFixed(0).padStart(5)).join(""));
console.log("block moment x1000 / direction:"); for (let r = 0; r < NB; r++) console.log("  " + Array.from({ length: NB }, (_, c) => { const b = r * NB + c; const m = mm[b] ? Math.hypot(mx[b], my[b]) / mm[b] : 0; return `${(1000 * m).toFixed(0).padStart(3)}@${deg(mx[b], my[b]).toFixed(0).padStart(3)}`; }).join(" "));
