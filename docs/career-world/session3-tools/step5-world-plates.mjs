// Step 5C: build the world and territory plates from the authored land.
//
// The coarse tiers draw a single registered raster, not the stream tiles, so
// deleting the old relief without replacing it leaves the zoomed-out world
// empty. This composites the L2 pyramid into new plates that are transparent
// everywhere nothing is authored -- which is the honest picture of a world
// with one territory built.
//
// Plate sizes are lattice multiples so the block lands on integer pixels:
//   world     1664 x 936   = 16 x 9 cells at 104 px    (block at 312, 104)
//   territory 6656 x 3744  = 16 x 9 cells at 416 px    (block at 1248, 416)
// Both are marginally smaller than the plates they replace, so the decode
// budget does not grow.
//
//   node docs/career-world/session3-tools/step5-world-plates.mjs [--dry]
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
sharp.cache(false);

const DRY = process.argv.includes("--dry");
const A = "public/career-world/layers/terrain/authority/";
const PYR = A + "tiles/l2-ninjaone-r1";
const TILE = 256;
const COLS = 16, ROWS = 9;
const BLOCK = [3, 1], SIZE = [5, 4];

// Assemble one pyramid level into a single image, cropped to the real art.
async function level(levelIndex, artWidth, artHeight) {
  const dir = path.join(PYR, `L${levelIndex}`);
  const comps = fs.readdirSync(dir).map((f) => {
    const [tx, ty] = f.replace(".webp", "").split("-").map(Number);
    return { input: path.join(dir, f), left: tx * TILE, top: ty * TILE };
  });
  const w = Math.ceil(artWidth / TILE) * TILE, h = Math.ceil(artHeight / TILE) * TILE;
  const full = await sharp({
    create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).composite(comps).png().toBuffer();
  return sharp(full).extract({ left: 0, top: 0, width: artWidth, height: artHeight });
}

async function plate(cellPx, levelIndex, artW, artH, outPath, label) {
  const planeW = COLS * cellPx, planeH = ROWS * cellPx;
  const left = BLOCK[0] * cellPx, top = BLOCK[1] * cellPx;
  const w = SIZE[0] * cellPx, h = SIZE[1] * cellPx;
  const land = await (await level(levelIndex, artW, artH))
    .resize(w, h, { kernel: "lanczos3", fit: "fill" }).png().toBuffer();
  const out = await sharp({
    create: { width: planeW, height: planeH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).composite([{ input: land, left, top }]).png().toBuffer();
  if (!DRY) fs.writeFileSync(outPath, out);
  const stats = await sharp(out).stats();
  const opaque = stats.channels[3].mean / 255;
  console.log(`${label.padEnd(10)} ${planeW} x ${planeH}  cell ${cellPx} px  block at (${left}, ${top}) ${w} x ${h}`);
  console.log(`           land covers ${(opaque * 100).toFixed(1)}% of the plane by alpha  -> ${outPath}`);
  return out;
}

const worldPng = await plate(104, 4, 640, 512, A + "textures/world-land-r1.png", "world");
await plate(416, 2, 2560, 2048, A + "textures/world-land-detail-4x-r1.png", "territory");

// The mask is the plate's own alpha, thresholded the way every consumer reads
// it (>= 128 is land). Deriving it from the plate is what keeps the two from
// disagreeing, which is one of the reds the old pair carried.
const { data, info } = await sharp(worldPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const mask = Buffer.alloc(info.width * info.height);
let landPx = 0;
for (let i = 0; i < mask.length; i += 1) {
  const a = data[i * info.channels + 3] >= 128 ? 255 : 0;
  mask[i] = a;
  landPx += a ? 1 : 0;
}
if (!DRY) {
  await sharp(mask, { raw: { width: info.width, height: info.height, channels: 1 } })
    .png().toFile(A + "masks/world-land-mask-r5.png");
}
const M = 0.4503, PLANE_M = [3472 * M, 1953 * M], REGION_A = (218 * M) ** 2;
const frac = landPx / mask.length;
console.log(`\nmask       ${info.width} x ${info.height}  land ${(frac * 100).toFixed(1)}% of the plane`);
console.log(`           = ${(frac * PLANE_M[0] * PLANE_M[1] / REGION_A).toFixed(1)} regions authored`);
console.log(`           (ninjaone budget 21; the world is scoped for ~88 across 5 territories)`);
console.log(`\n${DRY ? "nothing written" : "written"}`);
