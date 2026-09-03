// Crop any world-pixel rect out of the stitched L0 tiles, at 1:1 and at the
// capital reading zoom (1/8), so an eye observation can be checked where it was
// made and where the art actually lives.
//   node .codex-tmp/session3/crop-world.mjs <x> <y> <w> <h> <name>
import sharp from "sharp"; import fs from "node:fs"; import path from "node:path";
sharp.cache(false);
const TILES = "public/career-world/layers/terrain/authority/tiles/l2-ninjaone-r1/L0", TILE = 256;
const OUT = ".codex-tmp/session3/review"; fs.mkdirSync(OUT, { recursive: true });
const [x0, y0, w, h, name] = [+process.argv[2], +process.argv[3], +process.argv[4], +process.argv[5], process.argv[6]];
const ax0 = Math.floor(x0 / TILE) * TILE, ay0 = Math.floor(y0 / TILE) * TILE;
const ax1 = Math.ceil((x0 + w) / TILE) * TILE, ay1 = Math.ceil((y0 + h) / TILE) * TILE;
const comps = [];
for (const f of fs.readdirSync(TILES)) {
  const [tx, ty] = f.replace(".webp", "").split("-").map(Number); const px = tx * TILE, py = ty * TILE;
  if (px >= ax1 || py >= ay1 || px + TILE <= ax0 || py + TILE <= ay0) continue;
  comps.push({ input: path.join(TILES, f), left: px - ax0, top: py - ay0 });
}
const base = await sharp({ create: { width: ax1 - ax0, height: ay1 - ay0, channels: 4, background: { r: 24, g: 28, b: 32, alpha: 1 } } }).composite(comps).png().toBuffer();
const cut = sharp(base).extract({ left: x0 - ax0, top: y0 - ay0, width: w, height: h });
await cut.clone().png().toFile(`${OUT}/${name}-1to1.png`);
await cut.clone().resize(Math.round(w / 8), Math.round(h / 8), { kernel: "lanczos3" }).png().toFile(`${OUT}/${name}-capital.png`);
console.log(`wrote ${OUT}/${name}-1to1.png (${w}x${h}) and ${name}-capital.png (${Math.round(w / 8)}x${Math.round(h / 8)})`);
