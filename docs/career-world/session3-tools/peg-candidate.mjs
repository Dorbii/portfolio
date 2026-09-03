import sharp from "sharp"; sharp.cache(false);
const f = ".codex-tmp/authoring/cells/c4-2/c4-2-source.png";
const { data, info } = await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, C = info.channels;
console.log("source", W, H, "channels", C);
const water = (x, y) => { const i = (y * W + x) * C; const r = data[i], g = data[i+1], b = data[i+2]; return b > r + 18 && b >= g - 8 && (r + g + b) / 3 < 175; };
const SCALE = 2560 / W;
for (const y of [Math.round(H * 0.85), Math.round(H * 0.9), Math.round(H * 0.95), H - 3]) {
  const runs = []; let s = -1;
  for (let x = 0; x < W; x++) { const v = water(x, y); if (v && s < 0) s = x; if (!v && s >= 0) { if (x - s >= 4) runs.push([s, x - 1]); s = -1; } }
  if (s >= 0 && W - s >= 4) runs.push([s, W - 1]);
  console.log(`row ${y} (${(y / H * 100).toFixed(0)}%):`, runs.map(([a, b]) => { const c = (a + b) / 2; return `x${a}-${b} centre ${c.toFixed(0)} = ${(c / W * 100).toFixed(1)}% -> canvas ${(c * SCALE).toFixed(0)} px (miss vs 498: ${Math.abs(c * SCALE - 498).toFixed(0)} px)`; }).join(" | ") || "no water");
}
