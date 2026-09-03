// The reframe: stop briefing the edge that failed and then breaking another.
// For a cell, report EVERY shared edge at once - the neighbour's facing band,
// the ACCEPTED version of this cell (which passed all four), and a candidate -
// using cell.mjs's own vegBand and toneBand, so the numbers are the gate's.
//   node .codex-tmp/session3/edge-envelope.mjs <cellId> [candidate-l2.png]
import sharp from "sharp"; import fs from "node:fs";
sharp.cache(false);
const SRC = "art-source/career-world/l2-land/ninjaone";
const GEN = 2560, BLEED = 256, CELL = 2048;
const OPP = { N: "S", S: "N", E: "W", W: "E" };
const bandPx = (edge, t, o) => edge === "N" ? [t, BLEED + o]
  : edge === "S" ? [t, CELL + BLEED - o]
  : edge === "W" ? [BLEED + o, t] : [CELL + BLEED - o, t];
const med = (a) => { a.sort((p, q) => p - q); return a[a.length >> 1]; };
function bands(buf, edge) {
  const rs = [], gs = [], bs = [], ls = [];
  for (let t = 256; t < 2304; t += 2) for (let o = 16; o <= 176; o += 2) {
    const [gx, gy] = bandPx(edge, t, o);
    const i = (gy * GEN + gx) * 4;
    if (buf[i + 3] < 250) continue;
    const [r, g, b] = [buf[i], buf[i + 1], buf[i + 2]];
    ls.push(0.2126 * r + 0.7152 * g + 0.0722 * b);
    if (g > r && g > b && g > 60) { rs.push(r); gs.push(g); bs.push(b); }
  }
  const veg = rs.length >= 500 ? (() => { const r = med(rs), g = med(gs), b = med(bs); return { r, g, b, bg: b / g, luma: 0.2126 * r + 0.7152 * g + 0.0722 * b }; })() : null;
  const tone = ls.length >= 500 ? { luma: med(ls), n: ls.length } : null;
  return { veg, tone };
}
const load = async (p) => { if (!fs.existsSync(p)) return null; const m = await sharp(p).metadata(); let im = sharp(p); if (m.width !== GEN) im = im.resize(GEN, GEN, { kernel: "lanczos3" }); return im.ensureAlpha().raw().toBuffer(); };
const id = process.argv[2], candPath = process.argv[3];
const [, c, r] = id.match(/^c(\d)-(\d)$/).map(Number);
const NB = { N: [c, r - 1], S: [c, r + 1], W: [c - 1, r], E: [c + 1, r] };
const accepted = await load(`${SRC}/${id}/${id}-l2.png`);
const cand = candPath ? await load(candPath) : null;
console.log(`${id}: every shared edge at once. Gate limits: tone dLuma 21, veg dBG 0.20, veg dLuma 13.\n`);
console.log("edge  neighbour   | neighbour tone / veg B,G,B_ratio | ACCEPTED c3-2 tone (dTone) veg_ratio (dBG) | CANDIDATE tone (dTone) veg_ratio (dBG)");
for (const [edge, [nc, nr]] of Object.entries(NB)) {
  if (nc < 0 || nr < 0 || nc > 4 || nr > 3) { console.log(`${edge}     — territory edge`); continue; }
  const nid = `c${nc}-${nr}`;
  const nbuf = await load(`${SRC}/${nid}/${nid}-l2.png`);
  if (!nbuf) { console.log(`${edge}     ${nid} not authored`); continue; }
  const nb = bands(nbuf, OPP[edge]), ac = bands(accepted, edge), ca = cand ? bands(cand, edge) : null;
  const f = (x) => x == null ? "  —  " : x.toFixed(1).padStart(5);
  const g3 = (x) => x == null ? " —   " : x.toFixed(3);
  const dt = (a, b) => (a?.tone && b?.tone) ? Math.abs(a.tone.luma - b.tone.luma).toFixed(1).padStart(5) : "  —  ";
  const dbg = (a, b) => (a?.veg && b?.veg) ? Math.abs(a.veg.bg - b.veg.bg).toFixed(3) : " —   ";
  const flagT = (v) => v !== "  —  " && +v > 21 ? " FAIL" : "";
  const flagB = (v) => v !== " —   " && +v > 0.20 ? " FAIL" : "";
  const dtA = dt(ac, nb), dtC = dt(ca, nb), dbA = dbg(ac, nb), dbC = dbg(ca, nb);
  console.log(`${edge}     ${nid.padEnd(9)} | tone ${f(nb.tone?.luma)}  veg ${nb.veg ? `${nb.veg.r},${nb.veg.g},${nb.veg.b} ${g3(nb.veg.bg)}` : "under 500 samples"}`);
  console.log(`        accepted  | tone ${f(ac.tone?.luma)}  d ${dtA}${flagT(dtA)}   veg ${g3(ac.veg?.bg)}  d ${dbA}${flagB(dbA)}`);
  if (ca) console.log(`        candidate | tone ${f(ca.tone?.luma)}  d ${dtC}${flagT(dtC)}   veg ${g3(ca.veg?.bg)}  d ${dbC}${flagB(dbC)}`);
}
