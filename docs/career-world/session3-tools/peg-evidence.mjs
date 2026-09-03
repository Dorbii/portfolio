// Decision evidence: candidate c4-2's stream vs the c4-3 peg at the shared edge,
// raw join and a MOCK of the pipeline's footprint bridge extended past 150 px.
// Scratch only - approximates cell.mjs's bridge; touches nothing outside session3.
import sharp from "sharp"; import fs from "node:fs";
sharp.cache(false);
const GEN = 2560, CELL = 2048, BLEED = 256, EDGE = CELL + BLEED; // shared line y in c4-2 gen coords
const OUT = ".codex-tmp/session3/review/peg"; fs.mkdirSync(OUT, { recursive: true });
const srcF = ".codex-tmp/authoring/cells/c4-2/c4-2-source.png";
const mskF = ".codex-tmp/authoring/cells/c4-2/c4-2-water-source.png";
const nbF = "art-source/career-world/l2-land/ninjaone/c4-3/c4-3-l2.png";

const art = await sharp(srcF).resize(GEN, GEN, { kernel: "lanczos3" }).ensureAlpha().raw().toBuffer();
const mraw = await sharp(mskF).resize(GEN, GEN, { kernel: "nearest" }).ensureAlpha().raw().toBuffer();
const bin = new Uint8Array(GEN * GEN);
for (let i = 0; i < GEN * GEN; i++) bin[i] = mraw[i * 4 + 3] >= 128 && mraw[i * 4] >= 128 ? 255 : 0;
const nb = await sharp(nbF).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

// runs along a horizontal line (same rule as the gate: >=20/30 px)
const runsRow = (get, y, min) => { const r = []; let s = -1; for (let x = 0; x <= GEN; x++) { const w = x < GEN && get(x, y); if (w && s < 0) s = x; else if (!w && s >= 0) { if (x - s >= min) r.push({ a: s, b: x, c: (s + x) / 2 }); s = -1; } } return r; };
const mine = runsRow((x, y) => bin[y * GEN + x] > 128, EDGE, 20);
const theirs = runsRow((x, y) => nb.data[((y - CELL) * GEN + x) * 4 + 3] < 128, EDGE, 30); // c4-3 row 256 == world line
console.log("candidate crossings at the shared line:", mine.map(r => `x${r.a}-${r.b} c=${r.c} w=${r.b - r.a}`).join(" | ") || "none");
console.log("c4-3 crossings at the shared line:", theirs.map(r => `x${r.a}-${r.b} c=${r.c} w=${r.b - r.a}`).join(" | ") || "none");
if (!mine.length || !theirs.length) process.exit(0);
const m = mine[0], t = theirs.reduce((p, o) => Math.abs(o.c - m.c) < Math.abs(p.c - m.c) ? o : p);
const d = Math.abs(t.c - m.c);
console.log(`miss d = ${d.toFixed(0)} px  (bridge window 48..150, gate tolerance 48)  -> ${d <= 48 ? "MEETS" : d <= 150 ? "BRIDGED" : "REJECT"}`);

// ---- mock bridge on a copy of the mask (same construction as cell.mjs, no cap on d)
const mock = new Uint8Array(bin);
const smooth01 = x => x * x * (3 - 2 * x);
const getM = (x, y) => (x < 0 || y < 0 || x >= GEN || y >= GEN) ? 0 : mock[y * GEN + x];
const setM = (x, y, v) => { if (x >= 0 && y >= 0 && x < GEN && y < GEN) mock[y * GEN + x] = v; };
const f = (u, v) => [u, EDGE - v];
const runsAt = v => { const r = []; let s = -1; for (let u = 0; u <= GEN; u++) { const [gx, gy] = f(u, v); const w = u < GEN && getM(gx, gy) > 128; if (w && s < 0) s = u; else if (!w && s >= 0) { if (u - s >= 20) r.push({ a: s, b: u, c: (s + u) / 2 }); s = -1; } } return r; };
const N = Math.min(240, Math.max(128, Math.round(2 * d)));
for (const dir of [1, -1]) {
  let cPrev = m.c;
  for (let v = 0; dir > 0 ? v <= N : v >= -BLEED; v += dir) {
    const near = runsAt(v).filter(r => Math.abs(r.c - cPrev) <= 90);
    if (!near.length) break;
    for (const r of near) for (let u = Math.max(0, r.a - 20); u < Math.min(GEN, r.b + 20); u++) { const [gx, gy] = f(u, v); setM(gx, gy, 0); }
    cPrev = near.reduce((p, o) => Math.abs(o.c - cPrev) < Math.abs(p.c - cPrev) ? o : p).c;
  }
}
const myW = m.b - m.a, theirW = t.b - t.a;
for (let v = -BLEED; v <= N; v++) {
  const tt = v <= 0 ? 0 : smooth01(v / N);
  const c = t.c + (m.c - t.c) * tt, hw = Math.max(16, (theirW + (myW - theirW) * tt) / 2);
  for (let u = Math.max(0, Math.round(c - hw)); u <= Math.min(GEN - 1, Math.round(c + hw)); u++) { const [gx, gy] = f(u, v); setM(gx, gy, 255); }
}
console.log(`mock bridge: reroute ${m.c} -> ${t.c} over depth N=${N}`);

// ---- render: window x in [X0,X1), y in [EDGE-500, EDGE+500); top = candidate (mask cut), bottom = c4-3 l2
const X0 = Math.max(0, Math.round(Math.min(m.c, t.c)) - 500), X1 = X0 + 1200, Y0 = EDGE - 500, H = 1000;
const BG = [30, 61, 74, 255];
function render(mask, name, title) {
  const out = Buffer.alloc(1200 * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < 1200; x++) {
    const gx = X0 + x, gy = Y0 + y, o = (y * 1200 + x) * 4;
    let px;
    if (gy < EDGE) { const i = (gy * GEN + gx) * 4; px = mask[gy * GEN + gx] > 128 ? BG : [art[i], art[i + 1], art[i + 2], 255]; }
    else { const ny = gy - CELL, i = (ny * GEN + gx) * 4; px = nb.data[i + 3] < 128 ? BG : [nb.data[i], nb.data[i + 1], nb.data[i + 2], 255]; }
    out[o] = px[0]; out[o + 1] = px[1]; out[o + 2] = px[2]; out[o + 3] = 255;
  }
  // markers: 1px seam line, and 12px ticks at the top margin (green = c4-3 peg, red = candidate crossing)
  for (let x = 0; x < 1200; x++) { const o = ((EDGE - Y0) * 1200 + x) * 4; out[o] = 255; out[o + 1] = 255; out[o + 2] = 255; }
  const tick = (cx, rgb) => { for (let y = 0; y < 14; y++) for (let x = Math.round(cx - X0) - 2; x <= Math.round(cx - X0) + 2; x++) if (x >= 0 && x < 1200) { const o = (y * 1200 + x) * 4; out[o] = rgb[0]; out[o + 1] = rgb[1]; out[o + 2] = rgb[2]; } };
  tick(t.c, [0, 255, 0]); tick(m.c, [255, 40, 40]);
  return sharp(out, { raw: { width: 1200, height: H, channels: 4 } }).png().toFile(`${OUT}/${name}`).then(() => console.log(`  ${OUT}/${name}  ${title}`));
}
await render(bin, "peg-seam-raw.png", "raw join: candidate above the white line, c4-3 below; green tick = c4-3 crossing, red tick = candidate crossing");
await render(mock, "peg-seam-bridge-mock.png", `MOCK footprint bridge d=${d.toFixed(0)}px N=${N} (art untouched, mask rerouted)`);
fs.writeFileSync(`${OUT}/peg-numbers.json`, JSON.stringify({ candidateCrossing: m, neighbourCrossing: t, missPx: d, mockN: N, window: { X0, X1, Y0, H } }, null, 1));
