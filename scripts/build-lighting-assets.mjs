import fs from "node:fs/promises";
import sharp from "sharp";

const size = 512;
const pixels = Buffer.alloc(size * size * 3);
const hash = (x, y) => {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + 9137;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
function noise(x, y, grid) {
  const ix = Math.floor(x), iy = Math.floor(y);
  let u = x - ix, v = y - iy; u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v);
  const at = (a, b) => hash((a + grid) % grid, (b + grid) % grid);
  return (at(ix, iy) * (1 - u) + at(ix + 1, iy) * u) * (1 - v)
    + (at(ix, iy + 1) * (1 - u) + at(ix + 1, iy + 1) * u) * v;
}
for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
  let n = 0;
  for (const [grid, weight] of [[2, 0.57], [4, 0.26], [8, 0.12], [16, 0.05]]) n += noise(x / size * grid, y / size * grid, grid) * weight;
  let t = Math.max(0, Math.min(1, (n - 0.32) / 0.36)); t = t * t * (3 - 2 * t);
  const value = Math.round(255 * (0.45 + 0.55 * t));
  pixels.fill(value, (y * size + x) * 3, (y * size + x) * 3 + 3);
}
const dir = "public/career-world/layers/lighting";
await fs.mkdir(dir, { recursive: true });
const tile = await sharp(pixels, { raw: { width: size, height: size, channels: 3 } }).png().toBuffer();
await fs.writeFile(`${dir}/cloud-shadow-r1.png`, tile);
const overlays = [];
for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) overlays.push({ input: tile, left: x * size, top: y * size });
await sharp({ create: { width: size * 3, height: size * 3, channels: 3, background: "white" } }).composite(overlays).png().toFile(`${dir}/cloud-shadow-repeat-r1.png`);
console.log("Built the common cloud shadow and its byte-identical land repeats. No land or water art changed.");
