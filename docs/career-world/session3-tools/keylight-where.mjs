// Where does a cell's key-light first moment come from? Replicates the gate's
// sum over opaque pixels (mag >= 12), then attributes the global vector to
// 8x8 blocks and to pixel-luma bands by projecting each part onto the global
// direction. Parts sum to the alpha-safe moment.
import fs from "node:fs";
import sharp from "sharp";
sharp.cache(false);
const NB = 8;
for (const file of process.argv.slice(2)) {
  if (!fs.existsSync(file)) { console.log(`\n(missing ${file})`); continue; }
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, bw = Math.ceil(W / NB), bh = Math.ceil(H / NB);
  const L = (p) => 0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2];
  const A = (p) => data[p + 3];
  const mk = () => ({ sx: 0, sy: 0, sm: 0, n: 0 });
  const blocks = Array.from({ length: NB * NB }, mk);
  const bands = Array.from({ length: 5 }, mk); // pixel luma <40, <70, <100, <140, else
  let asx = 0, asy = 0, asm = 0, ssx = 0, ssy = 0, ssm = 0, opaque = 0;
  for (let y = 1; y < H - 1; y += 1) for (let x = 1; x < W - 1; x += 1) {
    const i = (y * W + x) * 4; if (data[i + 3] < 250) continue; opaque += 1;
    const gx = L(i + 4) - L(i - 4), gy = L(i + W * 4) - L(i - W * 4), mag = Math.hypot(gx, gy);
    if (mag < 12) continue;
    asx += gx; asy += gy; asm += mag;
    if (!(A(i + 4) >= 250 && A(i - 4) >= 250 && A(i + W * 4) >= 250 && A(i - W * 4) >= 250)) continue;
    ssx += gx; ssy += gy; ssm += mag;
    const b = blocks[Math.floor(y / bh) * NB + Math.floor(x / bw)]; b.sx += gx; b.sy += gy; b.sm += mag; b.n += 1;
    const l = L(i), q = l < 40 ? 0 : l < 70 ? 1 : l < 100 ? 2 : l < 140 ? 3 : 4;
    const k = bands[q]; k.sx += gx; k.sy += gy; k.sm += mag; k.n += 1;
  }
  const asIs = asm ? Math.hypot(asx, asy) / asm : 0, safe = ssm ? Math.hypot(ssx, ssy) / ssm : 0;
  const ux = ssx / Math.hypot(ssx, ssy), uy = ssy / Math.hypot(ssx, ssy);
  const deg = (Math.atan2(ssy, ssx) * 180 / Math.PI).toFixed(0);
  console.log(`\n${file}`);
  console.log(`  as-is ${asIs.toFixed(4)}   alpha-safe ${safe.toFixed(4)}   net direction ${deg} deg (0=east, 90=down/south)   gx/mag ${(ssx / ssm).toFixed(4)}  gy/mag ${(ssy / ssm).toFixed(4)}   water ${(100 * (1 - opaque / (W * H))).toFixed(1)}%`);
  console.log(`  by pixel luma band (contribution to moment x1000 / share of gradient mass / local moment):`);
  const names = ["<40", "40-70", "70-100", "100-140", ">=140"];
  bands.forEach((k, q) => console.log(`    L${names[q].padEnd(8)} contrib ${((k.sx * ux + k.sy * uy) / ssm * 1000).toFixed(1).padStart(6)}   mass ${(k.sm / ssm * 100).toFixed(0).padStart(3)}%   local ${(k.sm ? Math.hypot(k.sx, k.sy) / k.sm : 0).toFixed(4)}   dir ${(Math.atan2(k.sy, k.sx) * 180 / Math.PI).toFixed(0)}`));
  console.log(`  8x8 blocks, contribution to the global moment x1000 (sum = ${(safe * 1000).toFixed(1)}), row = north..south:`);
  for (let r = 0; r < NB; r += 1) {
    let line = "    ";
    for (let c = 0; c < NB; c += 1) { const b = blocks[r * NB + c]; line += ((b.sx * ux + b.sy * uy) / ssm * 1000).toFixed(1).padStart(6); }
    console.log(line);
  }
  console.log(`  8x8 blocks, LOCAL moment x1000 (each block on its own):`);
  for (let r = 0; r < NB; r += 1) {
    let line = "    ";
    for (let c = 0; c < NB; c += 1) { const b = blocks[r * NB + c]; line += (b.sm ? Math.hypot(b.sx, b.sy) / b.sm * 1000 : 0).toFixed(0).padStart(6); }
    console.log(line);
  }
}
