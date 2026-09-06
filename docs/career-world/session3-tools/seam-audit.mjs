// Every seam between two AUTHORED cells in the served world, ranked by how
// hard it reads: the all-land tone step (median luma of the 64 px band either
// side of the shared line, at L2 that is 16 px) and the colour step (mean RGB
// distance of the same bands, 0..1). Cross-territory seams included, by world
// lattice position. Reads the stitched pyramids at level 2, alpha kept, so
// only land pixels count (alpha >= 250). Owner 2026-09-05: "lets fix all the
// patchy non-uniformed look" — this says where it is, in numbers, before any
// cell is rebaked.
//
//   node docs/career-world/session3-tools/seam-audit.mjs [--top 20] [--min 12]
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
sharp.cache(false);
const arg = (f, d) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : d; };
const TOP = Number(arg("--top", 20)), MIN = Number(arg("--min", 12));
const ART = "art-source/career-world/l2-land", A = "public/career-world/layers/terrain/authority";
const LEVEL = 2, S = 2 ** LEVEL, CELL = 2048 / S, TILE = 256, BAND = 64 / S;

// each authored cell's kept area at L2, with alpha, from its territory's pyramid
const cells = new Map();   // "wx,wy" -> { t, id, data }
async function cellRaw(t, col, row) {
  const dir = path.join(`${A}/tiles/l2-${t}-r1`, `L${LEVEL}`);
  const x0 = col * CELL, y0 = row * CELL, comps = [];
  const ax0 = Math.floor(x0 / TILE) * TILE, ay0 = Math.floor(y0 / TILE) * TILE;
  const ax1 = Math.ceil((x0 + CELL) / TILE) * TILE, ay1 = Math.ceil((y0 + CELL) / TILE) * TILE;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".webp")) continue;
    const [tx, ty] = f.replace(".webp", "").split("-").map(Number);
    const px = tx * TILE, py = ty * TILE;
    if (px >= ax1 || py >= ay1 || px + TILE <= ax0 || py + TILE <= ay0) continue;
    comps.push({ input: path.join(dir, f), left: px - ax0, top: py - ay0 });
  }
  if (!comps.length) return null;
  const full = await sharp({ create: { width: ax1 - ax0, height: ay1 - ay0, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(comps).raw().toBuffer();
  const W = ax1 - ax0, out = Buffer.alloc(CELL * CELL * 4);
  for (let y = 0; y < CELL; y += 1) full.copy(out, y * CELL * 4, ((y0 - ay0 + y) * W + (x0 - ax0)) * 4, ((y0 - ay0 + y) * W + (x0 - ax0) + CELL) * 4);
  return out;
}
for (const t of ["ninjaone", "tanium", "coast"]) {
  const def = JSON.parse(fs.readFileSync(`${ART}/${t}/territory.def.json`, "utf8")), [bx, by] = def.lattice.block;
  const ledger = JSON.parse(fs.readFileSync(`${A}/manifests/terrain-l2-${t}-r1.json`, "utf8"));
  for (const id of Object.keys(ledger.cells)) {
    const [c, r] = id.slice(1).split("-").map(Number);
    const data = await cellRaw(t, c, r);
    if (data) cells.set(`${bx + c},${by + r}`, { t, id, data });
  }
}

// the band beside one edge: median luma and mean rgb over land pixels
function band(data, edge) {
  const ls = []; let r = 0, g = 0, b = 0, n = 0;
  for (let u = 0; u < CELL; u += 1) for (let v = 0; v < BAND; v += 1) {
    const [x, y] = edge === "E" ? [CELL - 1 - v, u] : edge === "W" ? [v, u] : edge === "S" ? [u, CELL - 1 - v] : [u, v];
    const o = (y * CELL + x) * 4;
    if (data[o + 3] < 250) continue;
    ls.push(0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2]);
    r += data[o]; g += data[o + 1]; b += data[o + 2]; n += 1;
  }
  if (n < BAND * CELL * 0.15) return null;   // less than 15% land in the band: a coast edge, not a tone seam
  ls.sort((p, q) => p - q);
  return { luma: ls[ls.length >> 1], rgb: [r / n, g / n, b / n], n };
}
const seams = [];
for (const [key, a] of cells) {
  const [wx, wy] = key.split(",").map(Number);
  for (const [dx, dy, ea, eb] of [[1, 0, "E", "W"], [0, 1, "S", "N"]]) {
    const b = cells.get(`${wx + dx},${wy + dy}`);
    if (!b) continue;
    const ba = band(a.data, ea), bb = band(b.data, eb);
    if (!ba || !bb) continue;
    const dLuma = Math.abs(ba.luma - bb.luma);
    const dRGB = Math.hypot(...ba.rgb.map((v, i) => v - bb.rgb[i])) / 255;
    seams.push({ a: `${a.t === "ninjaone" ? "N" : a.t === "tanium" ? "T" : "C"} ${a.id}`, b: `${b.t === "ninjaone" ? "N" : b.t === "tanium" ? "T" : "C"} ${b.id}`, dir: dx ? "E|W" : "S|N", dLuma, dRGB, la: ba.luma, lb: bb.luma });
  }
}
// whole-cell tone: the median land luma of the cell, against the mean of its
// authored neighbours — what reads as a PATCH at world zoom is a cell whose
// whole tone differs from the cells around it, not a hard line at the seam
const tone = new Map();
for (const [key, c] of cells) {
  const ls = [];
  for (let i = 0; i < CELL * CELL; i += 1) {
    const o = i * 4;
    if (c.data[o + 3] < 250) continue;
    if (i % 3) continue;
    ls.push(0.2126 * c.data[o] + 0.7152 * c.data[o + 1] + 0.0722 * c.data[o + 2]);
  }
  ls.sort((p, q) => p - q);
  tone.set(key, { c, luma: ls.length ? ls[ls.length >> 1] : null, land: ls.length * 3 / (CELL * CELL) });
}
const patches = [];
for (const [key, t] of tone) {
  if (t.luma === null) continue;
  const [wx, wy] = key.split(",").map(Number);
  const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => tone.get(`${wx + dx},${wy + dy}`)).filter((n) => n && n.luma !== null);
  if (!nb.length) continue;
  const mean = nb.reduce((s, n) => s + n.luma, 0) / nb.length;
  patches.push({ cell: `${t.c.t === "ninjaone" ? "N" : t.c.t === "tanium" ? "T" : "C"} ${t.c.id}`, luma: t.luma, neighbours: mean, dev: t.luma - mean, n: nb.length, land: t.land });
}
patches.sort((p, q) => Math.abs(q.dev) - Math.abs(p.dev));
console.log(`\nWHOLE-CELL TONE against the neighbours' mean (the patches at world zoom):`);
for (const p of patches.slice(0, TOP)) console.log(`  ${p.cell.padEnd(8)} luma ${p.luma.toFixed(0).padStart(4)}  neighbours ${p.neighbours.toFixed(0).padStart(4)} (${p.n})  ${p.dev >= 0 ? "+" : ""}${p.dev.toFixed(1)}  land ${(p.land * 100).toFixed(0)}%`);
fs.writeFileSync(".codex-tmp/session4/tone-audit.json", JSON.stringify(patches, null, 1));
seams.sort((p, q) => q.dLuma - p.dLuma);
console.log(`${cells.size} authored cells, ${seams.length} land seams; limit for a tone step at acceptance is 21 (accepted seams read 2-20, the stark one 24.5)`);
console.log(`\nWORST ${TOP} by tone step (dLuma), with the colour step (dRGB, 0..1):`);
for (const s of seams.slice(0, TOP)) console.log(`  ${s.a.padEnd(8)} | ${s.b.padEnd(8)} ${s.dir}  dLuma ${s.dLuma.toFixed(1).padStart(5)}  (${s.la.toFixed(0)} vs ${s.lb.toFixed(0)})  dRGB ${s.dRGB.toFixed(3)}`);
const over = seams.filter((s) => s.dLuma > MIN);
console.log(`\n${over.length} seams over ${MIN}; ${seams.filter((s) => s.dLuma > 21).length} over the gate's 21.`);
fs.mkdirSync(".codex-tmp/session4", { recursive: true });
fs.writeFileSync(".codex-tmp/session4/seam-audit.json", JSON.stringify(seams, null, 1));
