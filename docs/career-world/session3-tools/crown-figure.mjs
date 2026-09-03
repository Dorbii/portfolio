// The oversized crown against the plan's own rule, drawn to the ground scale.
import sharp from "sharp"; import fs from "node:fs"; import path from "node:path";
sharp.cache(false);
const TILES = "public/career-world/layers/terrain/authority/tiles/l2-ninjaone-r1/L0", TILE = 256;
const OUT = ".codex-tmp/session3/review";
const M = 97.6 / 2048, PX = (m) => Math.round(m / M);
const x0 = 6180, y0 = 5060, w = 760, h = 800;
const ax0 = Math.floor(x0 / TILE) * TILE, ay0 = Math.floor(y0 / TILE) * TILE;
const ax1 = Math.ceil((x0 + w) / TILE) * TILE, ay1 = Math.ceil((y0 + h) / TILE) * TILE;
const comps = [];
for (const f of fs.readdirSync(TILES)) { const [tx, ty] = f.replace(".webp", "").split("-").map(Number); const px = tx * TILE, py = ty * TILE; if (px >= ax1 || py >= ay1 || px + TILE <= ax0 || py + TILE <= ay0) continue; comps.push({ input: path.join(TILES, f), left: px - ax0, top: py - ay0 }); }
const base = await sharp({ create: { width: ax1 - ax0, height: ay1 - ay0, channels: 4, background: { r: 24, g: 28, b: 32, alpha: 1 } } }).composite(comps).png().toBuffer();
const img = await sharp(base).extract({ left: x0 - ax0, top: y0 - ay0, width: w, height: h }).png().toBuffer();

const CROWN = 475;                       // crown tip to foliage base, measured off the 1:1 crop
const BARW = 330, W = w + BARW, H = h + 52, bx = w + 30, top = 130;
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect x="${w}" y="0" width="${BARW}" height="${H}" fill="#141414"/>`;
const bars = [[CROWN, "#ff5a5a", `this crown  ~${(CROWN * M).toFixed(0)} m`, 0], [PX(7), "#7CFC7C", "7 m  plan ceiling", 150], [PX(4), "#4aa8ff", "4 m  plan floor", 250]];
for (const [px, col, lab, dx] of bars) {
  svg += `<rect x="${bx + dx}" y="${top}" width="11" height="${px}" fill="${col}"/>`;
  svg += `<text x="${bx + dx}" y="${top + px + 20}" font-family="Segoe UI, Arial" font-size="15" font-weight="bold" fill="${col}">${lab}</text>`;
}
svg += `<text x="${bx}" y="${top - 30}" font-family="Segoe UI, Arial" font-size="16" fill="#ddd">drawn to the ground scale:</text>`;
svg += `<text x="${bx}" y="${top - 10}" font-family="Segoe UI, Arial" font-size="16" fill="#ddd">97.6 m per cell = 21 px per metre</text>`;
svg += `<text x="6" y="${H - 30}" font-family="Segoe UI, Arial" font-size="19" fill="#fff">3,2 dark forest gorge, 1:1 from the stitched tiles. The plan's rule for this territory is "crowns 4-7 m"; this biome's "wonders" is "none".</text>`;
svg += `<text x="6" y="${H - 9}" font-family="Segoe UI, Arial" font-size="19" fill="#fff">Its neighbours here read 7-9 m. It also carries a trunk and root flare no other tree in the territory has.</text></svg>`;
await sharp({ create: { width: W, height: H, channels: 4, background: { r: 20, g: 20, b: 20, alpha: 1 } } })
  .composite([{ input: img, left: 0, top: 0 }, { input: Buffer.from(svg), left: 0, top: 0 }]).png().toFile(`${OUT}/eye-oversized-crown.png`);
console.log("wrote eye-oversized-crown.png", W, "x", H, "| crown", CROWN, "px =", (CROWN * M).toFixed(1), "m =", (CROWN * M / 7).toFixed(1), "x the ceiling");
