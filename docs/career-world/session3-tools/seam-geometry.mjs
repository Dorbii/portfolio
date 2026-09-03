// Was the seam jittered, and how wide is the blend? Measured from the LIVE tiles:
// every stitched pixel in the c3-3|c4-3 band is classified as c3-3-source, c4-3-source,
// blended (matches neither), or water. Writes a source-map overlay for eyes.
import sharp from "sharp"; import fs from "node:fs"; import path from "node:path";
sharp.cache(false);
const TILES = "public/career-world/layers/terrain/authority/tiles/l2-ninjaone-r1";
const SRC = "art-source/career-world/l2-land/ninjaone";
const TILE = 256, CELL = 2048, BLEED = 256, GEN = 2560;
const OUT = ".codex-tmp/session3/review/seam-diag"; fs.mkdirSync(OUT, { recursive: true });

async function assemble(x0, y0, x1, y1) {
  const ax0 = Math.floor(x0 / TILE) * TILE, ay0 = Math.floor(y0 / TILE) * TILE;
  const ax1 = Math.ceil(x1 / TILE) * TILE, ay1 = Math.ceil(y1 / TILE) * TILE;
  const dir = path.join(TILES, "L0"), comps = [];
  for (const f of fs.readdirSync(dir)) {
    const [tx, ty] = f.replace(".webp", "").split("-").map(Number);
    const px = tx * TILE, py = ty * TILE;
    if (px >= ax1 || py >= ay1 || px + TILE <= ax0 || py + TILE <= ay0) continue;
    comps.push({ input: path.join(dir, f), left: px - ax0, top: py - ay0 });
  }
  const W = ax1 - ax0, H = ay1 - ay0;
  const full = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(comps).raw().toBuffer();
  const w = x1 - x0, h = y1 - y0, out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    const s = ((y + y0 - ay0) * W + (x0 - ax0)) * 4;
    full.copy(out, y * w * 4, s, s + w * 4);
  }
  return { data: out, w, h, x0, y0 };
}
const srcRaw = async (id) => sharp(path.join(SRC, id, `${id}-l2.png`)).ensureAlpha().raw().toBuffer();
const ORG = { "c3-3": [3 * CELL - BLEED, 3 * CELL - BLEED], "c4-3": [4 * CELL - BLEED, 3 * CELL - BLEED] };
const px = (buf, gx, gy, org) => {
  const x = gx - org[0], y = gy - org[1];
  if (x < 0 || y < 0 || x >= GEN || y >= GEN) return null;
  const i = (y * GEN + x) * 4; return [buf[i], buf[i + 1], buf[i + 2], buf[i + 3]];
};
const same = (p, q) => p && q && p[3] === 255 && q[3] === 255
  && Math.abs(p[0] - q[0]) <= 2 && Math.abs(p[1] - q[1]) <= 2 && Math.abs(p[2] - q[2]) <= 2;

const A = await srcRaw("c3-3"), B = await srcRaw("c4-3");
const SEAM = 4 * CELL;
const band = await assemble(SEAM - 192, 3 * CELL, SEAM + 192, 4 * CELL);
const rows = [], map = Buffer.alloc(band.w * band.h * 4);
let counts = [0, 0, 0, 0, 0];
for (let y = 0; y < band.h; y++) {
  const gy = band.y0 + y, cls = new Int8Array(band.w);
  for (let x = 0; x < band.w; x++) {
    const gx = band.x0 + x, i = (y * band.w + x) * 4;
    const s = [band.data[i], band.data[i + 1], band.data[i + 2], band.data[i + 3]];
    const a = same(s, px(A, gx, gy, ORG["c3-3"])), b = same(s, px(B, gx, gy, ORG["c4-3"]));
    cls[x] = a && !b ? 1 : b && !a ? 2 : a && b ? 3 : s[3] < 255 ? 4 : 0;
    counts[cls[x]]++;
    const L = Math.round(0.299 * s[0] + 0.587 * s[1] + 0.114 * s[2]);
    const tint = cls[x] === 1 ? [255, 70, 70] : cls[x] === 2 ? [70, 130, 255] : cls[x] === 3 ? [255, 255, 0] : cls[x] === 4 ? [0, 0, 0] : [255, 255, 255];
    map[i] = Math.round(0.4 * L + 0.6 * tint[0]); map[i + 1] = Math.round(0.4 * L + 0.6 * tint[1]); map[i + 2] = Math.round(0.4 * L + 0.6 * tint[2]); map[i + 3] = 255;
  }
  let lastA = -1, firstB = -1;
  for (let x = 0; x < band.w; x++) if (cls[x] === 1) lastA = x;
  for (let x = band.w - 1; x >= 0; x--) if (cls[x] === 2) firstB = x;
  if (lastA >= 0 && firstB >= 0 && lastA < firstB) rows.push({ y: gy, t: (lastA + firstB) / 2 + band.x0 - SEAM, w: firstB - lastA - 1 });
}
const tot = counts.reduce((a, b) => a + b, 0);
console.log(`band ${band.w}x${band.h} around x=${SEAM}: c3-3-source ${(100 * counts[1] / tot).toFixed(1)}%  c4-3-source ${(100 * counts[2] / tot).toFixed(1)}%  blended(neither) ${(100 * counts[0] / tot).toFixed(1)}%  both ${(100 * counts[3] / tot).toFixed(2)}%  water ${(100 * counts[4] / tot).toFixed(1)}%`);
const ts = rows.map(r => r.t), ws = rows.map(r => r.w);
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const std = a => { const m = mean(a); return Math.sqrt(mean(a.map(v => (v - m) ** 2))); };
console.log(`rows with a clean A->B transition: ${rows.length}/${band.h}`);
console.log(`transition x relative to the cell line: mean ${mean(ts).toFixed(1)}  std ${std(ts).toFixed(1)}  min ${Math.min(...ts)}  max ${Math.max(...ts)}  (a straight seam would be ~0 with std ~0; the tab wiggle is specified as +-64 tapered, corner jitter 64)`);
console.log(`blend width between the last pure c3-3 pixel and the first pure c4-3 pixel: mean ${mean(ws).toFixed(1)}  min ${Math.min(...ws)}  max ${Math.max(...ws)}  (spec: 8 px feather)`);
console.log("transition x sampled every 128 rows (world y: x offset / blend width):");
console.log("  " + rows.filter((r, i) => i % 128 === 0).map(r => `${r.y}: ${r.t.toFixed(0)}/${r.w}`).join("  "));
// overlay: plain crop | source map, side by side, 1:1 and at 1/2
const pair = await sharp({ create: { width: band.w * 2 + 8, height: band.h, channels: 4, background: { r: 24, g: 24, b: 24, alpha: 1 } } })
  .composite([
    { input: await sharp(band.data, { raw: { width: band.w, height: band.h, channels: 4 } }).flatten({ background: { r: 30, g: 61, b: 74 } }).png().toBuffer(), left: 0, top: 0 },
    { input: await sharp(map, { raw: { width: band.w, height: band.h, channels: 4 } }).png().toBuffer(), left: band.w + 8, top: 0 },
  ]).png().toBuffer();
await sharp(pair).toFile(path.join(OUT, "seam-33-43-sourcemap-1to1.png"));
await sharp(pair).resize(Math.round((band.w * 2 + 8) / 2)).png().toFile(path.join(OUT, "seam-33-43-sourcemap-half.png"));
fs.writeFileSync(path.join(OUT, "seam-33-43-transition.json"), JSON.stringify(rows));
console.log(`wrote ${OUT}/seam-33-43-sourcemap-{1to1,half}.png  (left: the seam band as stitched; right: red = pure c3-3 pixels, blue = pure c4-3 pixels, white = blended, black = water)`);
