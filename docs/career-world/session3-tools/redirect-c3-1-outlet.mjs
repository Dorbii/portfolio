// THE POOL'S OUTLET ON T c3-1, REDIRECTED INTO ITS GULLY (owner 2026-09-08, a
// crop of the trunk crossing: "I think the water needs a redirect cause its
// off the water path"). Above the trunk the served tile carried two things:
// a 40-px cut through plain meadow, where the water rendered, and the painted
// stony gully beside it with a 10-px sliver of cut along its floor; they
// merge just below the trunk. This edits the cell's RECORDED SOURCES (the
// land layer and the water mask, 2560-px canvas with the 256-px bleed):
//   CLOSE the meadow cut — alpha back to land, the wet paint under it filled
//   from the meadow beside (pull-push base, the grain of the band to its
//   left), mask cleared;
//   OPEN the gully floor — a 24-px band along its centreline from the pool's
//   edge, through the trunk, into the channel below, alpha 0 with a 2-px
//   feathered edge, mask set.
// Then the documented land-repair path: cell.mjs --restitch, the chain
// overlay for the cell, world-register --only-cells, build:land-mount, the
// inland inventory (path and hash), build:water. Backups of both sources go
// to --backup-dir.
//
//   node docs/career-world/session3-tools/redirect-c3-1-outlet.mjs --backup-dir .codex-tmp/session6/backup [--preview out.jpg]
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
sharp.cache(false);
const arg = (f, d) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : d; };
const BACKUP = arg("--backup-dir"), PREVIEW = arg("--preview");
const DIR = "art-source/career-world/l2-land/tanium/c3-1";
const L2 = `${DIR}/c3-1-l2.png`, WATER = `${DIR}/c3-1-water.png`;
const C = 2560, B = 256;   // canvas and bleed; tile px = canvas px - B
// tile-px geometry from the served tile's alpha runs (2026-09-08)
const CLOSE_FROM = [1440, 758], CLOSE_TO = [1350, 1108], CLOSE_HALF = 24;           // the meadow cut's centreline and reach
const GULLY = [[1520, 752], [1512, 800], [1505, 840], [1498, 880], [1485, 920], [1472, 960], [1455, 1000], [1435, 1040], [1400, 1080], [1370, 1110], [1352, 1132]];
const GULLY_HALF = 12, FEATHER = 2;

if (BACKUP) {
  for (const f of [L2, WATER]) { const d = path.join(BACKUP, "tanium", "c3-1", path.basename(f)); fs.mkdirSync(path.dirname(d), { recursive: true }); fs.copyFileSync(f, d); }
  console.log(`backups in ${BACKUP}`);
}
const land = await sharp(L2).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const mask = await sharp(WATER).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
if (land.info.width !== C || mask.info.width !== C) throw new Error(`expected ${C}-px sources`);
const d = land.data, m = mask.data;
const idx = (tx, ty) => ((ty + B) * C + (tx + B));   // tile px → canvas index
const distToSeg = (x, y, a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], L2v = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L2v));
  return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy);
};

// 1. CLOSE: every transparent pixel within CLOSE_HALF of the meadow cut's centreline becomes land
const hole = [];   // tile-px indices to fill
for (let y = CLOSE_FROM[1] - 30; y <= CLOSE_TO[1] + 30; y += 1) for (let x = CLOSE_TO[0] - 80; x <= CLOSE_FROM[0] + 80; x += 1) {
  if (y < CLOSE_FROM[1] || y > CLOSE_TO[1]) continue;
  if (distToSeg(x, y, CLOSE_FROM, CLOSE_TO) > CLOSE_HALF) continue;
  const o = idx(x, y) * 4;
  if (d[o + 3] >= 250) continue;
  hole.push([x, y]);
}
// the fill: a pull-push base over a box round the hole from the clean meadow, then the grain of the band 60 px to the left
const bx0 = Math.min(...hole.map((p) => p[0])) - 70, bx1 = Math.max(...hole.map((p) => p[0])) + 70;
const by0 = Math.min(...hole.map((p) => p[1])) - 12, by1 = Math.max(...hole.map((p) => p[1])) + 12;
const bw = bx1 - bx0 + 1, bh = by1 - by0 + 1;
const rgb = new Float32Array(bw * bh * 3), known = new Uint8Array(bw * bh);
const inHole = new Uint8Array(bw * bh);
for (const [x, y] of hole) inHole[(y - by0) * bw + (x - bx0)] = 1;
for (let y = 0; y < bh; y += 1) for (let x = 0; x < bw; x += 1) {
  const p = y * bw + x, o = idx(bx0 + x, by0 + y) * 4;
  rgb[p * 3] = d[o]; rgb[p * 3 + 1] = d[o + 1]; rgb[p * 3 + 2] = d[o + 2];
  // known = opaque land that is not the hole and not within 4 px of any transparent pixel (the gully, the pool)
  let clean = d[o + 3] >= 250 && !inHole[p];
  if (clean) for (let j = -4; j <= 4 && clean; j += 1) for (let i = -4; i <= 4; i += 1) { const q = idx(bx0 + x + i, by0 + y + j) * 4; if (d[q + 3] < 250) { clean = false; break; } }
  known[p] = clean ? 1 : 0;
}
// pull-push
{
  const levels = [{ c: rgb, wt: Float32Array.from(known), w: bw, h: bh }];
  while (levels[levels.length - 1].w > 1 || levels[levels.length - 1].h > 1) {
    const L = levels[levels.length - 1], nw = Math.max(1, Math.ceil(L.w / 2)), nh = Math.max(1, Math.ceil(L.h / 2));
    const c = new Float32Array(nw * nh * 3), wt = new Float32Array(nw * nh);
    for (let y = 0; y < nh; y += 1) for (let x = 0; x < nw; x += 1) {
      let sw = 0; const s = [0, 0, 0];
      for (let j = 0; j < 2; j += 1) for (let i = 0; i < 2; i += 1) { const xx = x * 2 + i, yy = y * 2 + j; if (xx >= L.w || yy >= L.h) continue; const p = yy * L.w + xx, k = L.wt[p]; if (k <= 0) continue; sw += k; s[0] += L.c[p * 3] * k; s[1] += L.c[p * 3 + 1] * k; s[2] += L.c[p * 3 + 2] * k; }
      const q = y * nw + x; if (sw > 0) { c[q * 3] = s[0] / sw; c[q * 3 + 1] = s[1] / sw; c[q * 3 + 2] = s[2] / sw; wt[q] = Math.min(1, sw); }
    }
    levels.push({ c, wt, w: nw, h: nh });
  }
  for (let li = levels.length - 2; li >= 0; li -= 1) {
    const F = levels[li], Cc = levels[li + 1];
    for (let y = 0; y < F.h; y += 1) for (let x = 0; x < F.w; x += 1) {
      const p = y * F.w + x, k = F.wt[p]; if (k >= 1) continue;
      const cx = Math.min(Cc.w - 1, Math.max(0, (x + 0.5) / 2 - 0.5)), cy = Math.min(Cc.h - 1, Math.max(0, (y + 0.5) / 2 - 0.5));
      const x0 = Math.floor(cx), y0 = Math.floor(cy), x1 = Math.min(Cc.w - 1, x0 + 1), y1 = Math.min(Cc.h - 1, y0 + 1), tx = cx - x0, ty = cy - y0;
      const s = [0, 0, 0]; let sw = 0;
      for (const [xx, yy, wgt] of [[x0, y0, (1 - tx) * (1 - ty)], [x1, y0, tx * (1 - ty)], [x0, y1, (1 - tx) * ty], [x1, y1, tx * ty]]) { const q = yy * Cc.w + xx, cw = Cc.wt[q] * wgt; if (cw <= 0) continue; sw += cw; s[0] += Cc.c[q * 3] * cw; s[1] += Cc.c[q * 3 + 1] * cw; s[2] += Cc.c[q * 3 + 2] * cw; }
      if (sw <= 0) continue;
      for (let ch = 0; ch < 3; ch += 1) F.c[p * 3 + ch] = F.c[p * 3 + ch] * k + (s[ch] / sw) * (1 - k);
      F.wt[p] = 1;
    }
  }
  for (let it = 0; it < 24; it += 1) {
    const src = Float32Array.from(rgb);
    for (let y = 0; y < bh; y += 1) for (let x = 0; x < bw; x += 1) {
      const p = y * bw + x; if (!inHole[p]) continue;
      const s = [0, 0, 0]; let n = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= bw || yy >= bh) continue; const q = yy * bw + xx; s[0] += src[q * 3]; s[1] += src[q * 3 + 1]; s[2] += src[q * 3 + 2]; n += 1; }
      if (n) for (let ch = 0; ch < 3; ch += 1) rgb[p * 3 + ch] = s[ch] / n;
    }
  }
}
// the grain: the pixel less its 21x21 mean over clean ground, from the band to
// the left (or right) — a window wide enough that the meadow's cobbled pattern
// (10-15 px) survives; a 9x9 window left a smooth strip (first preview)
const R = 10;
const grainAt = (x, y) => {
  const p = y * bw + x; if (x < R || y < R || x >= bw - R || y >= bh - R || !known[p]) return null;
  const s = [0, 0, 0]; let n = 0;
  for (let j = -R; j <= R; j += 1) for (let i = -R; i <= R; i += 1) { const q = (y + j) * bw + x + i; if (!known[q]) continue; const o = idx(bx0 + x + i, by0 + y + j) * 4; s[0] += d[o]; s[1] += d[o + 1]; s[2] += d[o + 2]; n += 1; }
  if (n < 150) return null;
  const o = idx(bx0 + x, by0 + y) * 4;
  return [d[o] - s[0] / n, d[o + 1] - s[1] / n, d[o + 2] - s[2] / n];
};
let closed = 0, grained = 0;
for (const [x, y] of hole) {
  const lx = x - bx0, ly = y - by0, p = ly * bw + lx;
  const g = grainAt(lx - 60, ly) ?? grainAt(lx - 52, ly + 7) ?? grainAt(lx + 60, ly);
  const o = idx(x, y) * 4;
  for (let ch = 0; ch < 3; ch += 1) d[o + ch] = Math.max(0, Math.min(255, Math.round(rgb[p * 3 + ch] + (g ? g[ch] * 0.95 : 0))));
  d[o + 3] = 255;
  m[o] = 0; m[o + 1] = 0; m[o + 2] = 0; m[o + 3] = 0;
  closed += 1; if (g) grained += 1;
}
// 2. OPEN: the gully floor, alpha 0 within GULLY_HALF, feathered over FEATHER beyond; the mask set
let opened = 0;
const xs = GULLY.map((p) => p[0]), ys = GULLY.map((p) => p[1]);
for (let y = Math.min(...ys) - 20; y <= Math.max(...ys) + 20; y += 1) for (let x = Math.min(...xs) - 20; x <= Math.max(...xs) + 20; x += 1) {
  let dist = Infinity;
  for (let s = 1; s < GULLY.length; s += 1) dist = Math.min(dist, distToSeg(x, y, GULLY[s - 1], GULLY[s]));
  if (dist > GULLY_HALF + FEATHER) continue;
  const o = idx(x, y) * 4;
  const a = dist <= GULLY_HALF ? 0 : Math.round(255 * (dist - GULLY_HALF) / FEATHER);
  if (a < d[o + 3]) { d[o + 3] = a; opened += 1; }
  if (dist <= GULLY_HALF) { m[o] = 255; m[o + 1] = 255; m[o + 2] = 255; m[o + 3] = 255; }
}
await sharp(d, { raw: { width: C, height: C, channels: 4 } }).png().toFile(L2);
await sharp(m, { raw: { width: C, height: C, channels: 4 } }).png().toFile(WATER);
console.log(`closed ${closed} px of the meadow cut (${Math.round(100 * grained / Math.max(1, closed))}% with grain), opened ${opened} px of the gully floor; sources rewritten`);
if (PREVIEW) {
  const view = Buffer.alloc(C * C * 3);
  for (let p = 0; p < C * C; p += 1) { const o = p * 4, a = d[o + 3] / 255; view[p * 3] = Math.round(d[o] * a + 60 * (1 - a)); view[p * 3 + 1] = Math.round(d[o + 1] * a + 140 * (1 - a)); view[p * 3 + 2] = Math.round(d[o + 2] * a + 220 * (1 - a)); }
  await sharp(view, { raw: { width: C, height: C, channels: 3 } }).extract({ left: B + 1150, top: B + 650, width: 600, height: 600 }).jpeg({ quality: 90 }).toFile(PREVIEW);
  console.log(`  preview ${PREVIEW}`);
}
