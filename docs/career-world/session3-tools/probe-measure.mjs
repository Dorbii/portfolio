// Measure an outpaint probe result against its target:
//  1. preservation of the given band (correlation + MAD, per 64-row sub-band)
//  2. the join at the mask boundary (local luma step across y=2048 vs lines inside each region)
//  3. stream continuity across the boundary (water-coloured runs per row, calibrated on the known stream)
//  4. crops for eyes
//   node probe-measure.mjs <result.png> [tag]
import sharp from "sharp"; import fs from "node:fs";
sharp.cache(false);
const GEN = 2560, OUT = ".codex-tmp/session3/probe";
const file = process.argv[2], tag = process.argv[3] ?? "probe";
const meta = await sharp(file).metadata(); console.log(`result ${meta.width}x${meta.height} ${meta.format}`);
const res = await sharp(file).resize(GEN, GEN, { fit: "fill", kernel: "lanczos3" }).removeAlpha().raw().toBuffer();
const tgt = await sharp(`${OUT}/target-c4-2.png`).removeAlpha().raw().toBuffer();
const L = buf => { const o = new Float32Array(GEN * GEN); for (let i = 0; i < GEN * GEN; i++) o[i] = 0.299 * buf[i * 3] + 0.587 * buf[i * 3 + 1] + 0.114 * buf[i * 3 + 2]; return o; };
const Lr = L(res), Lt = L(tgt);
const pearson = (a, b) => { const n = a.length; let ma = 0, mb = 0; for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; } ma /= n; mb /= n; let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < n; i++) { const da = a[i] - ma, db = b[i] - mb; sab += da * db; saa += da * da; sbb += db * db; } return sab / Math.sqrt(saa * sbb); };
const region = (arr, x0, y0, w, h) => { const o = new Float32Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) o[y * w + x] = arr[(y0 + y) * GEN + x0 + x]; return o; };
const mad = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; };
console.log("1. preservation of the given band (y 2048..2560), result vs target:");
{
  const a = region(Lr, 0, 2048, GEN, 512), b = region(Lt, 0, 2048, GEN, 512);
  console.log(`   whole band: r ${pearson(a, b).toFixed(3)}  MAD luma ${mad(a, b).toFixed(1)}`);
  for (let y0 = 2048; y0 < 2560; y0 += 64) { const a = region(Lr, 0, y0, GEN, 64), b = region(Lt, 0, y0, GEN, 64); console.log(`   rows ${y0}-${y0 + 64}: r ${pearson(a, b).toFixed(3)}  MAD ${mad(a, b).toFixed(1)}`); }
  const a2 = region(Lr, 0, 0, GEN, 2048), b2 = region(Lt, 0, 0, GEN, 2048);
  console.log(`   (control: generated area vs the grey fill it replaced: r ${pearson(a2, b2).toFixed(3)})`);
}
console.log("2. join at the mask boundary: local luma step across a horizontal line (windows 10..34 px either side), per column:");
const stepsH = (arr, yl) => { const out = []; for (let x = 0; x < GEN; x++) { let a = 0, b = 0; for (let d = 10; d <= 34; d++) { a += arr[(yl - d) * GEN + x]; b += arr[(yl + d) * GEN + x]; } out.push(Math.abs(a - b) / 25); } return out; };
const meanOf = a => a.reduce((s, v) => s + v, 0) / a.length, pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(p * (s.length - 1))]; };
for (const [name, yl] of [["BOUNDARY y=2048 (generated above, preserved below)", 2048], ["inside generated y=1024", 1024], ["inside generated y=1536", 1536], ["inside generated y=1900", 1900], ["inside preserved y=2200", 2200], ["inside preserved y=2400", 2400]]) {
  const s = stepsH(Lr, yl); console.log(`   ${name.padEnd(52)} mean ${meanOf(s).toFixed(1)}  median ${pct(s, 0.5).toFixed(1)}  p90 ${pct(s, 0.9).toFixed(1)}`);
}
console.log("3. stream continuity: water-coloured runs per row (colour calibrated on the quarry stream at the boundary):");
{
  // calibrate on the quarry's ACTUAL stream pixels (its water mask, canvas rows 0..40 = target rows 2048..2088)
  const wm = await sharp("art-source/career-world/l2-land/ninjaone/c4-3/c4-3-water.png").ensureAlpha().raw().toBuffer();
  let n = 0, mr = 0, mg = 0, mb = 0;
  for (let y = 2048; y < 2088; y++) for (let x = 400; x < 900; x++) { const wi = ((y - 2048) * GEN + x) * 4; if (wm[wi + 3] > 200 && wm[wi] > 128) { const i = (y * GEN + x) * 3; mr += tgt[i]; mg += tgt[i + 1]; mb += tgt[i + 2]; n++; } }
  if (n) { mr /= n; mg /= n; mb /= n; } console.log(`   calibrated stream colour ~ rgb(${mr.toFixed(0)},${mg.toFixed(0)},${mb.toFixed(0)}) from ${n} masked px`);
  const isWater = (buf, x, y) => { const i = (y * GEN + x) * 3; const r = buf[i], g = buf[i + 1], b = buf[i + 2]; return Math.abs(r - mr) + Math.abs(g - mg) + Math.abs(b - mb) < 75 && b >= r; };
  for (const y of [2400, 2200, 2060, 2040, 2030, 2000, 1900, 1700, 1400, 1000, 600]) {
    const runs = []; let s = -1;
    for (let x = 0; x <= GEN; x++) { const w = x < GEN && isWater(res, x, y); if (w && s < 0) s = x; if (!w && s >= 0) { if (x - s >= 8) runs.push([s, x - 1]); s = -1; } }
    console.log(`   row ${String(y).padStart(4)} (${y >= 2048 ? "preserved" : "generated"}): ${runs.map(([a, b]) => `x${a}-${b}(c${((a + b) / 2).toFixed(0)})`).join(" ") || "none"}`);
  }
}
console.log("4. crops:");
const big = await sharp(file).resize(GEN, GEN, { fit: "fill", kernel: "lanczos3" }).png().toBuffer();
await sharp(big).extract({ left: 0, top: 1800, width: GEN, height: 500 }).resize(1280).png().toFile(`${OUT}/${tag}-join-band-half.png`);
await sharp(big).extract({ left: 350, top: 1750, width: 700, height: 600 }).png().toFile(`${OUT}/${tag}-join-stream-1to1.png`);
await sharp(big).resize(1024).png().toFile(`${OUT}/${tag}-full-quarter.png`);
console.log(`   ${OUT}/${tag}-{join-band-half,join-stream-1to1,full-quarter}.png`);
