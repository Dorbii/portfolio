// Owner-format strips (66 x 553 at quarter zoom, i.e. 264 x 2212 art px, the seam
// vertical down the middle) cut from the REAL stitched world at accepted seams,
// side by side with labels, so a seam defect can be compared across the programme.
//   node strip-gallery.mjs <out.png> <label:col:row:edge> ...   (edge E = seam with col+1; S = seam with row+1, rotated)
import sharp from "sharp"; import fs from "node:fs"; import path from "node:path";
sharp.cache(false);
const TILES = "public/career-world/layers/terrain/authority/tiles/l2-ninjaone-r1/L0", TILE = 256, CELL = 2048;
const [out, ...specs] = process.argv.slice(2);
async function window(x0, y0, w, h) {
  const comps = [];
  for (const f of fs.readdirSync(TILES)) { const [tx, ty] = f.replace(".webp", "").split("-").map(Number); const px = tx * TILE, py = ty * TILE;
    if (px >= x0 + w || py >= y0 + h || px + TILE <= x0 || py + TILE <= y0) continue; comps.push({ input: path.join(TILES, f), left: px - x0, top: py - y0 }); }
  return sharp({ create: { width: w, height: h, channels: 4, background: { r: 70, g: 70, b: 70, alpha: 1 } } }).composite(comps).png().toBuffer();
}
const strips = [];
for (const spec of specs) {
  const [label, c, r, edge] = spec.split(":"); const col = +c, row = +r;
  let buf;
  if (edge === "E") { const sx = (col + 1) * CELL; buf = await window(sx - 132, row * CELL - 82, 264, 2212); }
  else { const sy = (row + 1) * CELL; const b = await window(col * CELL - 82, sy - 132, 2212, 264); buf = await sharp(b).rotate(90).png().toBuffer(); }
  const small = await sharp(buf).resize(66, 553, { kernel: "lanczos3" }).png().toBuffer();
  const svg = Buffer.from(`<svg width="66" height="16"><rect width="66" height="16" fill="black"/><text x="2" y="12" font-size="10" fill="white" font-family="sans-serif">${label}</text></svg>`);
  strips.push(await sharp({ create: { width: 66, height: 569, channels: 4, background: "#000" } }).composite([{ input: small, top: 16, left: 0 }, { input: svg, top: 0, left: 0 }]).png().toBuffer());
}
const W = strips.length * 74 - 8;
await sharp({ create: { width: W, height: 569, channels: 4, background: "#202020" } }).composite(strips.map((s, i) => ({ input: s, left: i * 74, top: 0 }))).png().toFile(out);
console.log("wrote", out, strips.length, "strips");
