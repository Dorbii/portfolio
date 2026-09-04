// The measurement the second opinion asked for: does the key-light gate's
// mag >= 12 cutoff CREATE the downward bias by dropping soft opposing
// gradients? For each image, signed sum(gy) and sum(gx) are reported for the
// retained gradients (mag >= 12, what the gate sums) and the dropped ones
// (mag < 12), per pixel-luma band, all divided by the retained gradient mass so
// the retained numbers add up to the gate's own gy/mag. Alpha-safe throughout.
//
//   node docs/career-world/session3-tools/keylight-threshold.mjs <png> [<png>...]
import fs from "node:fs";
import sharp from "sharp";
sharp.cache(false);
for (const file of process.argv.slice(2)) {
  if (!fs.existsSync(file)) { console.log(`\n(missing ${file})`); continue; }
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const L = (p) => 0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2];
  const A = (p) => data[p + 3];
  const names = ["L<40", "L40-70", "L70-100", "L100-140", "L>=140"];
  const mk = () => ({ gx: 0, gy: 0, m: 0, n: 0 });
  const kept = names.map(mk), drop = names.map(mk);
  let keptMass = 0;
  for (let y = 1; y < H - 1; y += 1) for (let x = 1; x < W - 1; x += 1) {
    const i = (y * W + x) * 4;
    if (A(i) < 250 || A(i + 4) < 250 || A(i - 4) < 250 || A(i + W * 4) < 250 || A(i - W * 4) < 250) continue;
    const gx = L(i + 4) - L(i - 4), gy = L(i + W * 4) - L(i - W * 4), mag = Math.hypot(gx, gy);
    if (mag === 0) continue;
    const l = L(i), q = l < 40 ? 0 : l < 70 ? 1 : l < 100 ? 2 : l < 140 ? 3 : 4;
    const b = mag >= 12 ? kept[q] : drop[q];
    b.gx += gx; b.gy += gy; b.m += mag; b.n += 1;
    if (mag >= 12) keptMass += mag;
  }
  const f = (v) => (v / keptMass * 1000).toFixed(2).padStart(7);
  const totK = kept.reduce((a, b) => a + b.gy, 0), totD = drop.reduce((a, b) => a + b.gy, 0);
  console.log(`\n${file}`);
  console.log(`  gate reads gy/mag = ${(totK / keptMass).toFixed(4)} (x1000: ${f(totK)}); the DROPPED gradients (mag<12) sum to gy ${f(totD)} x1000 on the same denominator; both together ${f(totK + totD)}`);
  console.log(`  band        retained gy   dropped gy   | retained gx   dropped gx   | share of retained mass   dropped px per retained px`);
  names.forEach((nm, q) => console.log(`  ${nm.padEnd(10)} ${f(kept[q].gy)}      ${f(drop[q].gy)}      | ${f(kept[q].gx)}      ${f(drop[q].gx)}      |   ${(100 * kept[q].m / keptMass).toFixed(0).padStart(3)}%                      ${(kept[q].n ? drop[q].n / kept[q].n : 0).toFixed(1)}`));
}
