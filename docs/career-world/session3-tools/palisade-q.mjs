// Straight-run measure for rock edges: the fraction of strong rock-edge pixels
// that lie on a straight run >= RUN px (orientation held within +-12 deg).
// A regular palisade is made of long straight runs; weathered rock is not.
//   node palisade.mjs <png> [label]
import sharp from "sharp";
sharp.cache(false);
const GEN = 640, BLEED = 64, CELL = 512, RUN = +(process.env.RUN ?? 24), TOL = 12 * Math.PI / 180, MAXWALK = 80, MAG = +(process.env.MAG ?? 20), GAP = 1;
const [file, label] = process.argv.slice(2);
const meta = await sharp(file).metadata(); let img = sharp(file); if (meta.width !== GEN) img = img.resize(GEN, GEN, { kernel: "lanczos3" });
const buf = await img.ensureAlpha().raw().toBuffer();
const L = new Float32Array(GEN * GEN), rock = new Uint8Array(GEN * GEN);
function hsv(r, g, b) { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); const s = mx ? (mx - mn) / mx : 0; let h = 0; if (mx !== mn) { if (mx === r) h = 60 * (((g - b) / (mx - mn)) % 6); else if (mx === g) h = 60 * ((b - r) / (mx - mn) + 2); else h = 60 * ((r - g) / (mx - mn) + 4); if (h < 0) h += 360; } return [h, s, mx / 255]; }
for (let i = 0; i < GEN * GEN; i++) { const r = buf[i * 4], g = buf[i * 4 + 1], b = buf[i * 4 + 2], a = buf[i * 4 + 3]; L[i] = 0.299 * r + 0.587 * g + 0.114 * b; if (a <= 250) continue; const [h, s] = hsv(r, g, b); const veg = h >= 45 && h <= 140 && s >= 0.22, water = h >= 150 && h <= 215 && s >= 0.2; rock[i] = (!veg && !water) ? 1 : 0; }
const mag = new Float32Array(GEN * GEN), th = new Float32Array(GEN * GEN); const strong = new Uint8Array(GEN * GEN);
for (let y = 1; y < GEN - 1; y++) for (let x = 1; x < GEN - 1; x++) { const i = y * GEN + x;
  const gx = (L[i - GEN + 1] + 2 * L[i + 1] + L[i + GEN + 1]) - (L[i - GEN - 1] + 2 * L[i - 1] + L[i + GEN - 1]);
  const gy = (L[i + GEN - 1] + 2 * L[i + GEN] + L[i + GEN + 1]) - (L[i - GEN - 1] + 2 * L[i - GEN] + L[i - GEN + 1]);
  const m = Math.hypot(gx, gy) / 4; mag[i] = m; th[i] = Math.atan2(gy, gx); if (m >= MAG && rock[i]) strong[i] = 1; }
const angDiff = (a, b) => { let d = Math.abs(a - b) % Math.PI; return Math.min(d, Math.PI - d); };
let n = 0, long = 0, sumRun = 0; const hist = new Int32Array(8);
for (let y = BLEED; y < BLEED + CELL; y += 1) for (let x = BLEED; x < BLEED + CELL; x += 1) { const i = y * GEN + x; if (!strong[i]) continue; n++;
  const t = th[i] + Math.PI / 2; const dx = Math.cos(t), dy = Math.sin(t); let run = 1;
  for (const s of [1, -1]) { let gap = 0; for (let k = 1; k <= MAXWALK; k++) { const px = Math.round(x + s * k * dx), py = Math.round(y + s * k * dy); if (px < 1 || py < 1 || px >= GEN - 1 || py >= GEN - 1) break;
      // tolerate 1px wobble across the line
      let ok = false; for (let o = -1; o <= 1 && !ok; o++) { const qx = Math.round(px - o * dy), qy = Math.round(py + o * dx); const j = qy * GEN + qx; if (strong[j] && angDiff(th[j], th[i]) <= TOL) ok = true; }
      if (!ok) { gap++; if (gap > GAP) break; continue; } gap = 0; run++; } }
  sumRun += run; if (run >= RUN) long++; hist[Math.min(7, Math.floor(run / 8))]++; }
console.log(`${(label ?? file).padEnd(26)} strong rock edges ${String(n).padStart(7)}  long-run(>=${RUN}px) ${(100 * long / (n || 1)).toFixed(1).padStart(5)}%  mean run ${(sumRun / (n || 1)).toFixed(1).padStart(5)} px  run hist(8px bins @1/4) ${Array.from(hist).map((v) => (100 * v / (n || 1)).toFixed(0)).join("/")}`);
