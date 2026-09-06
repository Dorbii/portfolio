// Crop a region of the L1 island composite, in cell units (floats ok), to a JPEG of a given width.
//   node .codex-tmp/session4/region.mjs <x> <y> <w> <h> <out.jpg> [width=1400]
import sharp from "sharp";
sharp.cache(false);
const SRC = ".codex-tmp/session4/island/island-grid-L1.png", CELL = 1024;
const [x, y, w, h] = process.argv.slice(2, 6).map(Number), out = process.argv[6], width = Number(process.argv[7] || 1400);
const left = Math.round(x * CELL), top = Math.round(y * CELL), W = Math.round(w * CELL), H = Math.round(h * CELL);
const buf = await sharp(SRC).extract({ left, top, width: W, height: H }).png().toBuffer();
await sharp(buf).resize(width, Math.round(width * H / W)).jpeg({ quality: 86 }).toFile(out);
console.log(out, `${W}x${H} → ${width}`);
