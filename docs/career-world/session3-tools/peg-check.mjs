import sharp from "sharp"; sharp.cache(false);
const f = "art-source/career-world/l2-land/ninjaone/c4-3/c4-3-water.png";
const meta = await sharp(f).metadata();
console.log("mask meta", meta.width, meta.height, meta.channels, meta.hasAlpha);
const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const on = (x, y) => { const i = (y * W + x) * 4; return data[i + 3] >= 128 && data[i] >= 128; };
for (const y of [0, 64, 128, 192, 255, 256, 257, 320, 512]) {
  const runs = []; let s = -1;
  for (let x = 0; x < W; x++) { const v = on(x, y); if (v && s < 0) s = x; if (!v && s >= 0) { runs.push([s, x - 1]); s = -1; } }
  if (s >= 0) runs.push([s, W - 1]);
  console.log(`row ${y}:`, runs.map(([a, b]) => `x${a}-${b} centre ${((a + b) / 2).toFixed(0)} (${(((a + b) / 2) / 2560 * 100).toFixed(1)}% of canvas) width ${b - a + 1}`).join(" | ") || "no water");
}
// alpha histogram sanity: how much partial alpha (feather) exists
let full = 0, part = 0, none = 0;
for (let i = 3; i < data.length; i += 4) { if (data[i] === 255) full++; else if (data[i] === 0) none++; else part++; }
console.log("alpha: full", full, "partial", part, "none", none);
