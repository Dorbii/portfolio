// Simulate the stitch for a probe result: the result (upscaled to 2560 as cell.mjs would) owns
// everything ABOVE the real c4-2|c4-3 ownership curve, the quarry's concept paint owns everything
// below. Then measure the local luma step ALONG that curve (the number that decides whether the
// seam reads), against interior lines, and write crops with x ticks for eyes.
//   node probe-stitch-sim.mjs <result.png> <tag>
import sharp from "sharp"; import fs from "node:fs"; import path from "node:path";
sharp.cache(false);
const TILES = "public/career-world/layers/terrain/authority/tiles/l2-ninjaone-r1";
const SRC = "art-source/career-world/l2-land/ninjaone", OUT = ".codex-tmp/session3/probe";
const TILE = 256, CELL = 2048, BLEED = 256, GEN = 2560;
const [file, tag = "sim"] = process.argv.slice(2);
// ---- 1. recover the ownership curve y(x) of the live c4-2|c4-3 seam from the tiles (pixel provenance)
async function assemble(x0, y0, x1, y1) {
  const ax0 = Math.floor(x0 / TILE) * TILE, ay0 = Math.floor(y0 / TILE) * TILE, ax1 = Math.ceil(x1 / TILE) * TILE, ay1 = Math.ceil(y1 / TILE) * TILE;
  const dir = path.join(TILES, "L0"), comps = [];
  for (const f of fs.readdirSync(dir)) { const [tx, ty] = f.replace(".webp", "").split("-").map(Number); const px = tx * TILE, py = ty * TILE;
    if (px >= ax1 || py >= ay1 || px + TILE <= ax0 || py + TILE <= ay0) continue; comps.push({ input: path.join(dir, f), left: px - ax0, top: py - ay0 }); }
  const W = ax1 - ax0, H = ay1 - ay0;
  const full = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(comps).raw().toBuffer();
  const w = x1 - x0, h = y1 - y0, out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) { const s = ((y + y0 - ay0) * W + (x0 - ax0)) * 4; full.copy(out, y * w * 4, s, s + w * 4); }
  return { data: out, w, h, x0, y0 };
}
const l2 = async id => sharp(path.join(SRC, id, `${id}-l2.png`)).ensureAlpha().raw().toBuffer();
const OA = [4 * CELL - BLEED, 2 * CELL - BLEED], OB = [4 * CELL - BLEED, 3 * CELL - BLEED];
const px = (buf, gx, gy, org) => { const x = gx - org[0], y = gy - org[1]; if (x < 0 || y < 0 || x >= GEN || y >= GEN) return null; const i = (y * GEN + x) * 4; return [buf[i], buf[i + 1], buf[i + 2], buf[i + 3]]; };
const same = (p, q) => p && q && p[3] === 255 && q[3] === 255 && Math.abs(p[0] - q[0]) <= 2 && Math.abs(p[1] - q[1]) <= 2 && Math.abs(p[2] - q[2]) <= 2;
const A = await l2("c4-2"), B = await l2("c4-3");
const band = await assemble(4 * CELL, 6144 - 256, 5 * CELL, 6144 + 256);
const curve = new Float32Array(CELL).fill(NaN);
for (let x = 0; x < band.w; x++) { const gx = band.x0 + x; let lastA = -1, firstB = -1; const cls = new Int8Array(band.h);
  for (let y = 0; y < band.h; y++) { const gy = band.y0 + y, i = (y * band.w + x) * 4; const s = [band.data[i], band.data[i + 1], band.data[i + 2], band.data[i + 3]];
    const a = same(s, px(A, gx, gy, OA)), b = same(s, px(B, gx, gy, OB)); cls[y] = a && !b ? 1 : b && !a ? 2 : 0; }
  for (let y = 0; y < band.h; y++) if (cls[y] === 1) lastA = y; for (let y = band.h - 1; y >= 0; y--) if (cls[y] === 2) firstB = y;
  if (lastA >= 0 && firstB >= 0 && lastA < firstB) curve[x] = band.y0 + (lastA + firstB) / 2; }
// fill gaps (water columns) by nearest neighbour
for (let x = 0; x < CELL; x++) if (Number.isNaN(curve[x])) { let l = x - 1; while (l >= 0 && Number.isNaN(curve[l])) l--; let r = x + 1; while (r < CELL && Number.isNaN(curve[r])) r++; curve[x] = l >= 0 ? curve[l] : curve[r]; }
console.log(`ownership curve recovered: y offset from the lattice line mean ${(curve.reduce((s, v) => s + v, 0) / CELL - 6144).toFixed(1)}`);
// ---- 2. build the simulated stitch in c4-2 canvas space (2560 wide x rows 1536..2560 -> world y 5376..6400)
const res = await sharp(file).resize(GEN, GEN, { kernel: "lanczos3" }).removeAlpha().raw().toBuffer();
const c43 = await sharp(path.join(SRC, "c4-3", "c4-3-concept.png")).removeAlpha().raw().toBuffer();
const c42old = await sharp(path.join(SRC, "c4-2", "c4-2-concept.png")).removeAlpha().raw().toBuffer();
const Y0 = 1536, HH = 1024, sim = Buffer.alloc(GEN * HH * 3), cur = Buffer.alloc(GEN * HH * 3);
for (let y = 0; y < HH; y++) for (let x = 0; x < GEN; x++) {
  const cy = Y0 + y, wx = OA[0] + x, wy = OA[1] + cy;            // canvas -> world
  const inCol = x >= BLEED && x < BLEED + CELL;                    // inside c4-2's kept columns
  const owner = inCol ? (wy < curve[x - BLEED] ? "new" : "c43") : (wy < 6144 ? "new" : "c43");
  const o = (y * GEN + x) * 3;
  const bx = wx - OB[0], by = wy - OB[1];
  const hasB = bx >= 0 && by >= 0 && bx < GEN && by < GEN;
  const pick = (src, sx, sy) => { const i = (sy * GEN + sx) * 3; return [src[i], src[i + 1], src[i + 2]]; };
  const [r1, g1, b1] = owner === "c43" && hasB ? pick(c43, bx, by) : pick(res, x, cy);
  sim[o] = r1; sim[o + 1] = g1; sim[o + 2] = b1;
  const [r2, g2, b2] = owner === "c43" && hasB ? pick(c43, bx, by) : pick(c42old, x, cy);
  cur[o] = r2; cur[o + 1] = g2; cur[o + 2] = b2;
}
const L = buf => { const o = new Float32Array(GEN * HH); for (let i = 0; i < GEN * HH; i++) o[i] = 0.299 * buf[i * 3] + 0.587 * buf[i * 3 + 1] + 0.114 * buf[i * 3 + 2]; return o; };
const Ls = L(sim), Lc = L(cur);
const meanOf = a => a.reduce((s, v) => s + v, 0) / a.length, pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(p * (s.length - 1))]; };
const stepAlong = (Larr, yOf) => { const out = []; for (let x = BLEED; x < BLEED + CELL; x++) { const yl = Math.round(yOf(x)) - OA[1] - Y0; if (yl - 34 < 0 || yl + 34 >= HH) continue; let a = 0, b = 0; for (let d = 10; d <= 34; d++) { a += Larr[(yl - d) * GEN + x]; b += Larr[(yl + d) * GEN + x]; } out.push(Math.abs(a - b) / 25); } return out; };
const rep = (name, s) => s.length && console.log(`   ${name.padEnd(58)} mean ${meanOf(s).toFixed(1)}  median ${pct(s, 0.5).toFixed(1)}  p90 ${pct(s, 0.9).toFixed(1)}`);
console.log("local luma step along the c4-2|c4-3 ownership curve (the stitched seam), windows 10..34 px either side:");
rep("SIMULATED stitch: probe result above, quarry below", stepAlong(Ls, x => curve[x - BLEED]));
rep("CURRENT world: old c4-2 above, quarry below (same measure)", stepAlong(Lc, x => curve[x - BLEED]));
for (const off of [-500, -300]) rep(`  interior control in the probe result at curve${off}`, stepAlong(Ls, x => curve[x - BLEED] + off));
for (const off of [300, 500]) rep(`  interior control in the quarry at curve+${off}`, stepAlong(Ls, x => curve[x - BLEED] + off));
// ---- 3. crops with x ticks every 100 canvas px (tick labels are canvas x; the peg is x=498 at the shared line)
const tick = async (buf, w, h, x0) => { const svg = `<svg width="${w}" height="${h}">${Array.from({ length: Math.floor(w / 100) + 1 }, (_, i) => { const X = i * 100; return `<line x1="${X}" y1="0" x2="${X}" y2="${h}" stroke="rgba(255,255,0,0.35)" stroke-width="1"/><text x="${X + 2}" y="14" font-family="Arial" font-size="12" fill="#ff0">${x0 + X}</text>`; }).join("")}</svg>`; return sharp(buf).composite([{ input: Buffer.from(svg), left: 0, top: 0 }]).png().toBuffer(); };
const simPng = await sharp(sim, { raw: { width: GEN, height: HH, channels: 3 } }).png().toBuffer();
const crop = await sharp(simPng).extract({ left: 300, top: 1900 - Y0, width: 700, height: 600 }).png().toBuffer();
fs.writeFileSync(`${OUT}/${tag}-stitch-stream-1to1.png`, await tick(crop, 700, 600, 300));
const half = await sharp(simPng).extract({ left: 0, top: 0, width: GEN, height: HH }).resize(1280).png().toBuffer();
fs.writeFileSync(`${OUT}/${tag}-stitch-band-half.png`, half);
const curPng = await sharp(cur, { raw: { width: GEN, height: HH, channels: 3 } }).png().toBuffer();
const cropCur = await sharp(curPng).extract({ left: 300, top: 1900 - Y0, width: 700, height: 600 }).png().toBuffer();
fs.writeFileSync(`${OUT}/${tag}-stitch-stream-CURRENT-1to1.png`, await tick(cropCur, 700, 600, 300));
console.log(`crops: ${OUT}/${tag}-stitch-{stream-1to1,band-half,stream-CURRENT-1to1}.png (the seam runs near canvas y 2304 = crop row ~468 in the 1:1 crops)`);
