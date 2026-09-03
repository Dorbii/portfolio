// Lighting check for seed candidates: the gate's key-light moment (all gradients >= 12) plus the
// hue-isolated strong-edge moment inside rock only, which is what caught the round-1 lit side.
//   node seed-light.mjs <file...>     (controls are always printed first)
import sharp from "sharp";
sharp.cache(false);
const GEN = 2560;
const hsv = (r, g, b) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) { if (mx === r) h = 60 * (((g - b) / d) % 6); else if (mx === g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4); } if (h < 0) h += 360; return [h, mx ? d / mx : 0]; };
async function check(file, label) {
  const { data, info } = await sharp(file).resize(GEN, GEN, { kernel: "lanczos3" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, L = p => 0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2];
  const rock = new Uint8Array(W * H); let nr = 0;
  for (let i = 0; i < W * H; i++) { const [h, s] = hsv(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]); const veg = h >= 45 && h <= 140 && s >= 0.22, water = h >= 150 && h <= 215 && s >= 0.2; if (!veg && !water && data[i * 4 + 3] >= 250) { rock[i] = 1; nr++; } }
  let gsx = 0, gsy = 0, gsm = 0; const R = { 40: { x: 0, y: 0, m: 0, n: 0 }, 80: { x: 0, y: 0, m: 0, n: 0 } };
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const j = y * W + x, i = j * 4; if (data[i + 3] < 250) continue;
    const gx = L(i + 4) - L(i - 4), gy = L(i + W * 4) - L(i - W * 4), mag = Math.hypot(gx, gy);
    if (mag >= 12) { gsx += gx; gsy += gy; gsm += mag; }
    if (rock[j] && rock[j - 1] && rock[j + 1] && rock[j - W] && rock[j + W]) for (const t of [40, 80]) if (mag >= t) { const a = R[t]; a.x += gx; a.y += gy; a.m += mag; a.n++; }
  }
  const gate = gsm ? Math.hypot(gsx, gsy) / gsm : 0;
  const rk = t => { const a = R[t]; const m = a.m ? Math.hypot(a.x, a.y) / a.m : 0; let d = Math.atan2(a.y, a.x) * 180 / Math.PI; if (d < 0) d += 360; return `${m.toFixed(3)} @${d.toFixed(0)}° (n ${(a.n / 1000) | 0}k)`; };
  console.log(`${label.padEnd(28)} gate ${gate.toFixed(4)} ${gate < 0.011 ? "PASS" : "FAIL"}   rock ${(100 * nr / (W * H)).toFixed(0)}%   rock-only >=40: ${rk(40).padEnd(24)} >=80: ${rk(80)}`);
}
console.log("gate = first circular moment of all luminance gradients >= 12 (threshold 0.011). rock-only = same moment inside non-vegetation, non-water pixels at strong edges; a stable direction with a rising moment is a lit side. Accepted quarry: ~0.03 / ~0.07. Round-1 candidates: 0.18-0.27 @ ~50°.");
await check("art-source/career-world/l2-land/ninjaone/c4-3/c4-3-source.png", "control c4-3 accepted");
await check("art-source/career-world/l2-land/ninjaone/seed/L2-seed-region-r1-source.png", "control r1 canon");
for (const f of process.argv.slice(2)) await check(f, f.split(/[\\/]/).pop().replace(".png", ""));
