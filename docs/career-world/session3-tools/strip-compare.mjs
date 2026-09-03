// Interleave two strip galleries (same seam order) as before/after pairs.
//   node strip-compare.mjs <before.png> <after.png> <out.png>
import sharp from "sharp";
sharp.cache(false);
const [before, after, out] = process.argv.slice(2);
const STRIDE = 74, H = 569;
const mb = await sharp(before).metadata(), ma = await sharp(after).metadata();
const n = Math.round((mb.width + 8) / STRIDE);
if (Math.round((ma.width + 8) / STRIDE) !== n) throw new Error("galleries differ in strip count");
const comps = [];
for (let i = 0; i < n; i++) {
  const b = await sharp(before).extract({ left: i * STRIDE, top: 0, width: 66, height: H }).png().toBuffer();
  const a = await sharp(after).extract({ left: i * STRIDE, top: 0, width: 66, height: H }).png().toBuffer();
  const tagB = Buffer.from(`<svg width="66" height="12"><rect width="66" height="12" fill="#444"/><text x="2" y="10" font-size="9" fill="#ddd" font-family="sans-serif">before</text></svg>`);
  const tagA = Buffer.from(`<svg width="66" height="12"><rect width="66" height="12" fill="#264"/><text x="2" y="10" font-size="9" fill="#dfd" font-family="sans-serif">after</text></svg>`);
  comps.push({ input: b, left: i * (2 * STRIDE + 12), top: 12 }, { input: tagB, left: i * (2 * STRIDE + 12), top: 0 });
  comps.push({ input: a, left: i * (2 * STRIDE + 12) + STRIDE, top: 12 }, { input: tagA, left: i * (2 * STRIDE + 12) + STRIDE, top: 0 });
}
const W = n * (2 * STRIDE + 12) - 12 - 8;
await sharp({ create: { width: W, height: H + 12, channels: 4, background: "#202020" } }).composite(comps).png().toFile(out);
console.log("wrote", out, n, "pairs");
