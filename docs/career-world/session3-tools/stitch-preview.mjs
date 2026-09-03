// Faithful candidate preview: the candidate stitched over the world with the
// pipeline's own seam (corner jitter + wiggle + 8 px feather) instead of a straight
// hard edge. Writes the quarter view, each authored seam as an owner-format strip
// (66 x 553 = 264 x 2212 art px, the seam down the middle), and 1:1 seam bands.
//   node stitch-preview.mjs <id> <col> <row> <canvas.png> <outPrefix> <seams e.g. W,S,E>
import sharp from "sharp"; import fs from "node:fs"; import path from "node:path";
import { makeSeam, authoredSet, stitchWindow, CELL_PX } from "./seam-geo.mjs";
sharp.cache(false);
const [id, cS, rS, canvas, outPrefix, seamsS] = process.argv.slice(2); const col = +cS, row = +rS;
const seam = makeSeam(5, 4), authored = authoredSet();
const PAD = 512, x0 = col * CELL_PX - PAD, y0 = row * CELL_PX - PAD, W = CELL_PX + 2 * PAD, H = W;
const { out } = await stitchWindow(id, col, row, canvas, x0, y0, W, H, seam, authored);
fs.mkdirSync(path.dirname(outPrefix), { recursive: true });
const full = sharp(out, { raw: { width: W, height: H, channels: 4 } });
await full.clone().resize(W / 4, H / 4, { kernel: "lanczos3" }).png().toFile(`${outPrefix}-quarter.png`);
for (const s of seamsS.split(",")) {
  // strip: 264 px across the seam, 2212 px along it (82 px past each corner)
  let strip;
  if (s === "W" || s === "E") {
    const sx = (s === "W" ? col * CELL_PX : (col + 1) * CELL_PX) - x0;
    strip = await full.clone().extract({ left: sx - 132, top: PAD - 82, width: 264, height: 2212 }).png().toBuffer();
    const band = await full.clone().extract({ left: sx - 256, top: PAD, width: 512, height: CELL_PX }).png().toBuffer();
    await sharp(band).extract({ left: 0, top: 0, width: 512, height: 1024 }).png().toFile(`${outPrefix}-seam-${s}-north.png`);
    await sharp(band).extract({ left: 0, top: 1024, width: 512, height: 1024 }).png().toFile(`${outPrefix}-seam-${s}-south.png`);
  } else {
    const sy = (s === "N" ? row * CELL_PX : (row + 1) * CELL_PX) - y0;
    const b = await full.clone().extract({ left: PAD - 82, top: sy - 132, width: 2212, height: 264 }).png().toBuffer();
    strip = await sharp(b).rotate(90).png().toBuffer();
    const band = await full.clone().extract({ left: PAD, top: sy - 256, width: CELL_PX, height: 512 }).png().toBuffer();
    await sharp(band).extract({ left: 0, top: 0, width: 1024, height: 512 }).png().toFile(`${outPrefix}-seam-${s}-west.png`);
    await sharp(band).extract({ left: 1024, top: 0, width: 1024, height: 512 }).png().toFile(`${outPrefix}-seam-${s}-east.png`);
  }
  await sharp(strip).resize(66, 553, { kernel: "lanczos3" }).png().toFile(`${outPrefix}-strip-${s}.png`);
}
console.log("wrote", outPrefix, "faithful stitch, seams", seamsS);
