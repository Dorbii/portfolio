// Session-3 review assembler for the three authored cells (c4-2, c3-3, c4-3).
// Reads stitched L2 tiles only (never sources); writes PNG proofs to OUT.
//   node .codex-tmp/session3/review.mjs [tag]
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
sharp.cache(false);

const TILES = "public/career-world/layers/terrain/authority/tiles/l2-ninjaone-r1";
const TILE = 256, CELL = 2048;
const tag = process.argv[2] ?? "now";
const OUT = `.codex-tmp/session3/review/${tag}`;
fs.mkdirSync(OUT, { recursive: true });

// assemble a window [x0,x1)x[y0,y1) in LEVEL-space pixels over a backdrop
async function assemble(level, x0, y0, x1, y1, bg = { r: 0, g: 0, b: 0, alpha: 1 }) {
  const ax0 = Math.floor(x0 / TILE) * TILE, ay0 = Math.floor(y0 / TILE) * TILE;
  const ax1 = Math.ceil(x1 / TILE) * TILE, ay1 = Math.ceil(y1 / TILE) * TILE;
  const dir = path.join(TILES, `L${level}`);
  const comps = [];
  for (const f of fs.readdirSync(dir)) {
    const [tx, ty] = f.replace(".webp", "").split("-").map(Number);
    const px = tx * TILE, py = ty * TILE;
    if (px >= ax1 || py >= ay1 || px + TILE <= ax0 || py + TILE <= ay0) continue;
    comps.push({ input: path.join(dir, f), left: px - ax0, top: py - ay0 });
  }
  let img = sharp({ create: { width: ax1 - ax0, height: ay1 - ay0, channels: 4, background: bg } });
  if (comps.length) img = img.composite(comps);
  const buf = await img.png().toBuffer();
  return sharp(buf).extract({ left: x0 - ax0, top: y0 - ay0, width: x1 - x0, height: y1 - y0 });
}
const save = async (img, name) => { const p = path.join(OUT, name); await img.png().toFile(p); console.log("  " + p); };

// --- the three-cell region: cols 3..4, rows 2..3 at L0 = [6144,10240)x[4096,8192)
const RX0 = 3 * CELL, RY0 = 2 * CELL, RX1 = 5 * CELL, RY1 = 4 * CELL;

console.log("mounted (three-cell region, L0 assembled, shown at 1/2 and 1/4):");
{
  const full = await assemble(0, RX0, RY0, RX1, RY1);
  const buf = await full.png().toBuffer();
  await save(sharp(buf).resize(2048, 2048, { kernel: "lanczos3" }), "mounted-half.png");
  await save(sharp(buf).resize(1024, 1024, { kernel: "lanczos3" }), "mounted-quarter.png");
}
console.log("reduced-zoom views straight from the pyramid (what the coarse tiers actually hold):");
await save(await assemble(2, RX0 / 4, RY0 / 4, RX1 / 4, RY1 / 4), "pyramid-L2.png");
await save(await assemble(3, RX0 / 8, RY0 / 8, RX1 / 8, RY1 / 8), "pyramid-L3.png");
await save(await assemble(4, 0, 0, 5 * CELL / 16, 4 * CELL / 16), "pyramid-L4-territory.png");
console.log("hole hunt (L1 over magenta - anything magenta inside land is unmasked transparency):");
await save(await assemble(1, RX0 / 2, RY0 / 2, RX1 / 2, RY1 / 2, { r: 255, g: 0, b: 255, alpha: 1 }), "holes-L1-magenta.png");

// --- seams at 1:1. Vertical seam c3-3|c4-3 at x=8192, y in [6144,8192).
console.log("seam c3-3|c4-3 (vertical, x=8192) 1:1 windows, seam at the horizontal centre:");
const SX = 4 * CELL, SY = 3 * CELL;
for (const [i, y] of [[0, SY], [1, SY + 640], [2, SY + 1280]]) {
  await save(await assemble(0, SX - 384, y, SX + 384, y + 768), `seam-33-43-1to1-${i}.png`);
}
console.log("seam c4-2|c4-3 (horizontal, y=6144) 1:1 windows, seam at the vertical centre:");
for (const [i, x] of [[0, SX], [1, SX + 640], [2, SX + 1280]]) {
  await save(await assemble(0, x, SY - 384, x + 768, SY + 384), `seam-42-43-1to1-${i}.png`);
}
console.log("three-way corner at (8192,6144) 1:1 and the unauthored c3-2 pocket:");
await save(await assemble(0, SX - 512, SY - 512, SX + 512, SY + 512), "corner-1to1.png");
console.log("seam bands reduced (L1 = 1/2, L2 = 1/4):");
await save(await assemble(1, (SX - 512) / 2, SY / 2, (SX + 512) / 2, (SY + CELL) / 2), "seam-33-43-band-L1.png");
await save(await assemble(2, (SX - 512) / 4, SY / 4, (SX + 512) / 4, (SY + CELL) / 4), "seam-33-43-band-L2.png");
await save(await assemble(1, SX / 2, (SY - 512) / 2, (SX + CELL) / 2, (SY + 512) / 2), "seam-42-43-band-L1.png");
await save(await assemble(2, SX / 4, (SY - 512) / 4, (SX + CELL) / 4, (SY + 512) / 4), "seam-42-43-band-L2.png");
console.log("done");
