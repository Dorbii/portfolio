// 1:1 crop straight from the stitched L0 tiles: node crop-tiles.mjs x0 y0 w h out.png [scale]
import sharp from "sharp"; import fs from "node:fs"; import path from "node:path";
sharp.cache(false);
const TILES = "public/career-world/layers/terrain/authority/tiles/l2-ninjaone-r1/L0", TILE = 256;
const [x0, y0, w, h] = process.argv.slice(2, 6).map(Number); const out = process.argv[6]; const scale = +(process.argv[7] ?? 1);
const x1 = x0 + w, y1 = y0 + h, comps = [];
for (const f of fs.readdirSync(TILES)) { const [tx, ty] = f.replace(".webp", "").split("-").map(Number); const px = tx * TILE, py = ty * TILE; if (px >= x1 || py >= y1 || px + TILE <= x0 || py + TILE <= y0) continue; comps.push({ input: path.join(TILES, f), left: px - x0, top: py - y0 }); }
let img = sharp({ create: { width: w, height: h, channels: 4, background: { r: 70, g: 70, b: 70, alpha: 1 } } }).composite(comps).png();
if (scale !== 1) { const b = await img.toBuffer(); img = sharp(b).resize(Math.round(w * scale), Math.round(h * scale), { kernel: "lanczos3" }).png(); }
await img.toFile(out); console.log("wrote", out, w, "x", h, "@", scale);
