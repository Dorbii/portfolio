// Candidate-in-context preview: the world's L0 tiles (grey where unauthored or
// where water is cut) with the candidate's KEPT 2048 px placed at its cell.
//   node cand-preview.mjs <id> <col> <row> <concept.png> <outPrefix> <seams e.g. S,E>
import sharp from "sharp"; import fs from "node:fs"; import path from "node:path";
sharp.cache(false);
const TILES = "public/career-world/layers/terrain/authority/tiles/l2-ninjaone-r1/L0", TILE = 256, CELL = 2048, BLEED = 256;
const [id, colS, rowS, concept, outPrefix, seamsS] = process.argv.slice(2);
const col = +colS, row = +rowS, seams = seamsS.split(",");
const PAD = 512, x0 = col * CELL - PAD, y0 = row * CELL - PAD, x1 = (col + 1) * CELL + PAD, y1 = (row + 1) * CELL + PAD, W = x1 - x0, H = y1 - y0;
const comps = [];
for (const f of fs.readdirSync(TILES)) {
  const [tx, ty] = f.replace(".webp", "").split("-").map(Number); const px = tx * TILE, py = ty * TILE;
  if (px >= x1 || py >= y1 || px + TILE <= x0 || py + TILE <= y0) continue;
  comps.push({ input: path.join(TILES, f), left: px - x0, top: py - y0 });
}
if (!process.env.NOOVERLAY) { const kept = await sharp(concept).extract({ left: BLEED, top: BLEED, width: CELL, height: CELL }).png().toBuffer();
comps.push({ input: kept, left: col * CELL - x0, top: row * CELL - y0 }); }
const full = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 70, g: 70, b: 70, alpha: 1 } } }).composite(comps).png().toBuffer();
fs.mkdirSync(path.dirname(outPrefix), { recursive: true });
await sharp(full).resize(Math.round(W / 4), Math.round(H / 4), { kernel: "lanczos3" }).png().toFile(`${outPrefix}-quarter.png`);
for (const s of seams) {
  if (s === "S" || s === "N") {
    const sy = (s === "S" ? (row + 1) * CELL : row * CELL) - y0;
    const band = await sharp(full).extract({ left: PAD, top: sy - 256, width: CELL, height: 512 }).png().toBuffer();
    await sharp(band).extract({ left: 0, top: 0, width: 1024, height: 512 }).png().toFile(`${outPrefix}-seam-${s}-west.png`);
    await sharp(band).extract({ left: 1024, top: 0, width: 1024, height: 512 }).png().toFile(`${outPrefix}-seam-${s}-east.png`);
    await sharp(band).resize(1024, 256, { kernel: "lanczos3" }).png().toFile(`${outPrefix}-seam-${s}-half.png`);
  } else {
    const sx = (s === "E" ? (col + 1) * CELL : col * CELL) - x0;
    const band = await sharp(full).extract({ left: sx - 256, top: PAD, width: 512, height: CELL }).png().toBuffer();
    await sharp(band).extract({ left: 0, top: 0, width: 512, height: 1024 }).png().toFile(`${outPrefix}-seam-${s}-north.png`);
    await sharp(band).extract({ left: 0, top: 1024, width: 512, height: 1024 }).png().toFile(`${outPrefix}-seam-${s}-south.png`);
    await sharp(band).resize(256, 1024, { kernel: "lanczos3" }).png().toFile(`${outPrefix}-seam-${s}-half.png`);
  }
}
console.log("wrote", outPrefix, "window", W, "x", H);
