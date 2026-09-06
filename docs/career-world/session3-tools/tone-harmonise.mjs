// Exposure equalisation across the served island, previewed — never applied
// to the authored art. Each authored cell gets one luma gain g so that
// neighbours agree across every seam (least squares over all seams, a
// regulariser pulling every gain toward 1, gains capped), and the gain is
// applied as a SMOOTH field — bilinear between cell centres — so no seam gets
// a step. Land pixels only; water cuts keep their alpha. Owner 2026-09-05:
// "lets fix all the patchy non-uniformed look". Some of the quilt is biome
// (a dark forest beside a lush shelf must stay darker): the regulariser and
// the cap decide how far a cell is pulled; --strength scales the result.
//
//   node docs/career-world/session3-tools/tone-harmonise.mjs [--strength 0.6] [--cap 0.3] [--lambda 0.35]
//        [--out .codex-tmp/session4/island/tone-before-after.jpg]
// Writes the gain table to .codex-tmp/session4/tone-gains.json — the input a
// serve-time pass (world-register.mjs) would apply if the owner says yes.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
sharp.cache(false);
const arg = (f, d) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : d; };
const STRENGTH = Number(arg("--strength", 0.6)), CAP = Number(arg("--cap", 0.3)), LAMBDA = Number(arg("--lambda", 0.35));
const OUT = arg("--out", ".codex-tmp/session4/island/tone-before-after.jpg");
const ART = "art-source/career-world/l2-land", A = "public/career-world/layers/terrain/authority";
const LEVEL = 2, S = 2 ** LEVEL, CELL = 2048 / S, TILE = 256;
const SEA = { r: 31, g: 96, b: 108 };

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
  const full = await sharp({ create: { width: ax1 - ax0, height: ay1 - ay0, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(comps).raw().toBuffer();
  const W = ax1 - ax0, out = Buffer.alloc(CELL * CELL * 4);
  for (let y = 0; y < CELL; y += 1) full.copy(out, y * CELL * 4, ((y0 - ay0 + y) * W + (x0 - ax0)) * 4, ((y0 - ay0 + y) * W + (x0 - ax0) + CELL) * 4);
  return out;
}

// 1. every authored cell at L2, its median land luma
const cells = new Map();
for (const t of ["ninjaone", "tanium", "coast"]) {
  const def = JSON.parse(fs.readFileSync(`${ART}/${t}/territory.def.json`, "utf8")), [bx, by] = def.lattice.block;
  const ledger = JSON.parse(fs.readFileSync(`${A}/manifests/terrain-l2-${t}-r1.json`, "utf8"));
  for (const id of Object.keys(ledger.cells)) {
    const [c, r] = id.slice(1).split("-").map(Number);
    const data = await cellRaw(t, c, r);
    if (!data) continue;
    const ls = [];
    for (let i = 0; i < CELL * CELL; i += 3) { const o = i * 4; if (data[o + 3] >= 250) ls.push(0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2]); }
    ls.sort((p, q) => p - q);
    if (!ls.length) continue;
    cells.set(`${bx + c},${by + r}`, { t, id, wx: bx + c, wy: by + r, data, luma: ls[ls.length >> 1] });
  }
}

// 2. the gains: minimise sum over seams (g_a L_a - g_b L_b)^2 + lambda * sum (g_c - 1)^2
//    with L normalised to the island's mean, by Gauss-Seidel; then capped and scaled by --strength
const meanL = [...cells.values()].reduce((s, c) => s + c.luma, 0) / cells.size;
for (const c of cells.values()) { c.L = c.luma / meanL; c.g = 1; c.nb = []; }
for (const c of cells.values()) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = cells.get(`${c.wx + dx},${c.wy + dy}`); if (n) c.nb.push(n); }
for (let it = 0; it < 200; it += 1) {
  for (const c of cells.values()) {
    if (!c.nb.length) continue;
    let num = LAMBDA, den = LAMBDA;
    for (const n of c.nb) { num += c.L * n.L * n.g; den += c.L * c.L; }
    c.g = num / den;
  }
}
for (const c of cells.values()) {
  const capped = Math.min(1 + CAP, Math.max(1 - CAP, c.g));
  c.gain = 1 + (capped - 1) * STRENGTH;
}
// 2b. the seam feather (2026-09-05 20:40; reviewer rows 21, 31-33 and the
//     forest seams: a step the whole-cell gains leave at the line): per cell
//     and per authored edge, the mean RGB of the 64-px land band on each side
//     of the shared line with the gains applied. The serve-time pass moves
//     each side's band toward the two bands' mean within 12 m of the seam,
//     fading to nothing further in — colour as well as luma, land only.
const BAND = 64 / S;
const bandMean = (data, edge) => {
  const sum = [0, 0, 0]; let n = 0;
  for (let u = 0; u < CELL; u += 1) for (let v = 0; v < BAND; v += 1) {
    const x = edge === "W" ? v : edge === "E" ? CELL - 1 - v : u, y = edge === "N" ? v : edge === "S" ? CELL - 1 - v : u;
    const o = (y * CELL + x) * 4;
    if (data[o + 3] < 250) continue;
    sum[0] += data[o]; sum[1] += data[o + 1]; sum[2] += data[o + 2]; n += 1;
  }
  return n >= BAND * CELL * 0.15 ? sum.map((s) => s / n) : null;   // under 15% land: a coast edge, not a tone seam
};
const OPP = { N: "S", S: "N", E: "W", W: "E" }, DIR = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
for (const c of cells.values()) {
  c.edges = {};
  for (const e of ["N", "S", "E", "W"]) {
    const n = cells.get(`${c.wx + DIR[e][0]},${c.wy + DIR[e][1]}`);
    if (!n) continue;
    const mine = bandMean(c.data, e), theirs = bandMean(n.data, OPP[e]);
    if (!mine || !theirs) continue;
    // at the shared line the bilinear gain field gives BOTH sides the mean of
    // the two cells' gains, so that is the gain the bands are seen under; a
    // per-cell gain here would invent a step the field does not leave (T
    // c1-2|c2-2: raw bands 121 and 126, cell gains 1.15 and 0.84)
    const gAvg = (c.gain + n.gain) / 2;
    c.edges[e] = { mine: mine.map((v) => +(v * gAvg).toFixed(1)), theirs: theirs.map((v) => +(v * gAvg).toFixed(1)) };
  }
}
const table = [...cells.values()].map((c) => ({ territory: c.t, id: c.id, world: [c.wx, c.wy], luma: +c.luma.toFixed(1), gain: +c.gain.toFixed(4), edges: c.edges }))
  .sort((p, q) => Math.abs(q.gain - 1) - Math.abs(p.gain - 1));
fs.mkdirSync(".codex-tmp/session4/island", { recursive: true });
fs.writeFileSync(".codex-tmp/session4/tone-gains.json", JSON.stringify({ strength: STRENGTH, cap: CAP, lambda: LAMBDA, meanLuma: +meanL.toFixed(1), cells: table }, null, 1));
console.log(`${cells.size} cells, island mean land luma ${meanL.toFixed(1)}; strength ${STRENGTH}, cap ±${CAP}, lambda ${LAMBDA}`);
console.log(`largest gains:`);
for (const c of table.slice(0, 14)) console.log(`  ${(c.territory === "ninjaone" ? "N" : c.territory === "tanium" ? "T" : "C")} ${c.id.padEnd(5)} luma ${String(c.luma).padStart(5)}  gain ${c.gain >= 1 ? "+" : ""}${((c.gain - 1) * 100).toFixed(1)}%`);

// 3. before | after, the island window (world cols 1..9, rows 0..8) with the gain field bilinear between cell centres
const X0 = 1, Y0 = 0, COLS = 9, ROWS = 9, W = COLS * CELL, H = ROWS * CELL;
const gainAt = (wx, wy) => cells.get(`${wx},${wy}`)?.gain;
const paint = (harmonise) => {
  const img = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i += 1) { img[i * 4] = SEA.r; img[i * 4 + 1] = SEA.g; img[i * 4 + 2] = SEA.b; img[i * 4 + 3] = 255; }
  for (const c of cells.values()) {
    const ox = (c.wx - X0) * CELL, oy = (c.wy - Y0) * CELL;
    if (ox < 0 || oy < 0 || ox + CELL > W || oy + CELL > H) continue;
    for (let y = 0; y < CELL; y += 1) for (let x = 0; x < CELL; x += 1) {
      const si = (y * CELL + x) * 4, a = c.data[si + 3] / 255;
      if (a <= 0) continue;
      let g = 1;
      if (harmonise) {
        // bilinear between the centres of this cell and the three nearest, missing neighbours take this cell's gain
        const fx = (x + 0.5) / CELL - 0.5, fy = (y + 0.5) / CELL - 0.5;
        const sx = fx < 0 ? -1 : 1, sy = fy < 0 ? -1 : 1, tx = Math.abs(fx), ty = Math.abs(fy);
        const g00 = c.gain, g10 = gainAt(c.wx + sx, c.wy) ?? g00, g01 = gainAt(c.wx, c.wy + sy) ?? g00, g11 = gainAt(c.wx + sx, c.wy + sy) ?? g00;
        g = g00 * (1 - tx) * (1 - ty) + g10 * tx * (1 - ty) + g01 * (1 - tx) * ty + g11 * tx * ty;
      }
      const di = ((oy + y) * W + ox + x) * 4;
      for (let k = 0; k < 3; k += 1) { const v = Math.min(255, c.data[si + k] * g); img[di + k] = Math.round(v * a + img[di + k] * (1 - a)); }
    }
  }
  return img;
};
const before = paint(false), after = paint(true);
const half = 1400, pad = 20;
const [b, a2] = await Promise.all([before, after].map((buf) => sharp(buf, { raw: { width: W, height: H, channels: 4 } }).resize(half, half).png().toBuffer()));
const label = (t, x) => Buffer.from(`<svg width="${half * 2 + pad * 3}" height="${half + 60}"><rect x="${x}" y="${half + 16}" width="${half}" height="36" rx="4" fill="rgba(0,0,0,0.65)"/><text x="${x + half / 2}" y="${half + 41}" fill="#fff" font-family="monospace" font-size="22" text-anchor="middle">${t}</text></svg>`);
await sharp({ create: { width: half * 2 + pad * 3, height: half + 60, channels: 4, background: { r: 10, g: 14, b: 18, alpha: 255 } } })
  .composite([
    { input: b, left: pad, top: 0 }, { input: a2, left: pad * 2 + half, top: 0 },
    { input: label("BEFORE — the served island as it is", pad), left: 0, top: 0 },
    { input: label(`AFTER — exposure equalised at serve time (strength ${STRENGTH}, cap ±${Math.round(CAP * 100)}%)`, pad * 2 + half), left: 0, top: 0 },
  ]).jpeg({ quality: 86 }).toFile(OUT);
console.log(`wrote ${OUT}`);
