// Locate the owner's cropped strip inside candidate images by normalised
// cross-correlation on luma, coarse-to-fine, over a few scales.
//   node strip-match.mjs <strip.png> <image.png> [<image.png> ...]
import sharp from "sharp";
sharp.cache(false);
async function gray(p, scale) { const m = await sharp(p).metadata(); const w = Math.max(1, Math.round(m.width * scale)), h = Math.max(1, Math.round(m.height * scale)); const b = await sharp(p).resize(w, h, { kernel: "lanczos3" }).greyscale().raw().toBuffer(); return { w, h, d: b }; }
function ncc(T, I, x0, y0) { let st = 0, si = 0, stt = 0, sii = 0, sti = 0, n = T.w * T.h; for (let y = 0; y < T.h; y++) for (let x = 0; x < T.w; x++) { const t = T.d[y * T.w + x], i = I.d[(y0 + y) * I.w + x0 + x]; st += t; si += i; stt += t * t; sii += i * i; sti += t * i; } const vt = stt - st * st / n, vi = sii - si * si / n; if (vt <= 0 || vi <= 0) return -1; return (sti - st * si / n) / Math.sqrt(vt * vi); }
function search(T, I, xa, xb, ya, yb, step) { let best = { r: -2 }; for (let y = Math.max(0, ya); y <= Math.min(I.h - T.h, yb); y += step) for (let x = Math.max(0, xa); x <= Math.min(I.w - T.w, xb); x += step) { const r = ncc(T, I, x, y); if (r > best.r) best = { r, x, y }; } return best; }
const [strip, ...images] = process.argv.slice(2);
for (const img of images) for (const s of [0.5, 0.75, 1, 1.5, 2]) {
  // strip stays at its own size scaled by 1/s relative to the image at scale 1 => scale the image by s and the strip by 1
  const coarse = 0.25; const T = await gray(strip, coarse), I = await gray(img, s * coarse);
  if (T.w > I.w || T.h > I.h) { console.log(img, "scale", s, "strip larger than image"); continue; }
  const b = search(T, I, 0, I.w, 0, I.h, 1);
  const Tf = await gray(strip, 1), If = await gray(img, s); const f = search(Tf, If, b.x * 4 - 8, b.x * 4 + 8, b.y * 4 - 8, b.y * 4 + 8, 1);
  console.log(`${img} scale ${s}: r=${f.r.toFixed(3)} at (${f.x},${f.y}) in the image scaled to ${If.w}x${If.h} -> original (${Math.round(f.x / s)},${Math.round(f.y / s)}) size ${Math.round(Tf.w / s)}x${Math.round(Tf.h / s)}`);
}
