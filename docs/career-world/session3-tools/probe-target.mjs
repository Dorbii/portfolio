// Build the outpaint probe inputs for c4-2: a 2560x2560 edit target whose bottom 512 px carry the
// neighbours' real CONCEPT paint (c4-3 kept + bleed, c3-3 at the corner) and whose remaining area is
// neutral grey; plus the API mask (opaque = preserve that band, transparent = generate).
import sharp from "sharp"; import fs from "node:fs";
sharp.cache(false);
const SRC = "art-source/career-world/l2-land/ninjaone", OUT = ".codex-tmp/session3/probe";
const GEN = 2560, CELL = 2048, BLEED = 256;
const raw = async id => sharp(`${SRC}/${id}/${id}-concept.png`).removeAlpha().raw().toBuffer();
const c43 = await raw("c4-3"), c33 = await raw("c3-3");
const ORG42 = [4 * CELL - BLEED, 2 * CELL - BLEED], ORG43 = [4 * CELL - BLEED, 3 * CELL - BLEED], ORG33 = [3 * CELL - BLEED, 3 * CELL - BLEED];
const inCanvas = (wx, wy, org) => wx >= org[0] && wx < org[0] + GEN && wy >= org[1] && wy < org[1] + GEN;
const tgt = Buffer.alloc(GEN * GEN * 4), mask = Buffer.alloc(GEN * GEN * 4);
let kept = 0;
for (let y = 0; y < GEN; y++) for (let x = 0; x < GEN; x++) {
  const wx = ORG42[0] + x, wy = ORG42[1] + y, i = (y * GEN + x) * 4;
  let src = null, sx = 0, sy = 0;
  if (wy >= 3 * CELL - BLEED) {
    const col = Math.floor(wx / CELL), row = Math.floor(wy / CELL);
    const cands = (col === 3 && row === 3) ? [[c33, ORG33], [c43, ORG43]] : [[c43, ORG43], [c33, ORG33]];
    for (const [b, org] of cands) if (inCanvas(wx, wy, org)) { src = b; sx = wx - org[0]; sy = wy - org[1]; break; }
  }
  mask[i] = mask[i + 1] = mask[i + 2] = 255;
  if (src) { const j = (sy * GEN + sx) * 3; tgt[i] = src[j]; tgt[i + 1] = src[j + 1]; tgt[i + 2] = src[j + 2]; tgt[i + 3] = 255; mask[i + 3] = 255; kept++; }
  else { tgt[i] = 96; tgt[i + 1] = 104; tgt[i + 2] = 88; tgt[i + 3] = 255; mask[i + 3] = 0; }
}
await sharp(tgt, { raw: { width: GEN, height: GEN, channels: 4 } }).png().toFile(`${OUT}/target-c4-2.png`);
await sharp(mask, { raw: { width: GEN, height: GEN, channels: 4 } }).png().toFile(`${OUT}/mask-c4-2.png`);
await sharp(`${OUT}/target-c4-2.png`).resize(640).png().toFile(`${OUT}/preview-target.png`);
await sharp(`${OUT}/mask-c4-2.png`).flatten({ background: { r: 255, g: 0, b: 255 } }).resize(320).png().toFile(`${OUT}/preview-mask.png`);
console.log(`target ${GEN}x${GEN}: preserved (real neighbour paint) ${(100 * kept / (GEN * GEN)).toFixed(1)}% = bottom ${kept / GEN} rows; generate ${(100 - 100 * kept / (GEN * GEN)).toFixed(1)}%`);
// where the quarry's stream meets the preserve/generate boundary (canvas y=2048 = c4-3 canvas row 0)
let runs = [], s = -1; const y = 2048;
for (let x = 0; x <= GEN; x++) { const i = (y * GEN + x) * 4; const r = tgt[i], g = tgt[i + 1], b = tgt[i + 2];
  const water = x < GEN && b > r + 12 && b >= g - 6 && (r + g + b) / 3 < 150;
  if (water && s < 0) s = x; if (!water && s >= 0) { if (x - s >= 6) runs.push([s, x - 1]); s = -1; } }
console.log("blue-leaning runs on the boundary row (candidate stream position for the model to continue):", runs.map(([a, b]) => `x${a}-${b}`).join(" ") || "none by this heuristic (check the crop)");
await sharp(`${OUT}/target-c4-2.png`).extract({ left: 400, top: 1900, width: 600, height: 500 }).png().toFile(`${OUT}/preview-target-streamcorner.png`);
console.log("wrote target-c4-2.png, mask-c4-2.png, previews");
