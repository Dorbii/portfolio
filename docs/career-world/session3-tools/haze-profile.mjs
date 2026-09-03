// Vegetation-median blue/green (the palette gate's dBG basis) as a function of
// distance from a cell edge, so a seam failure can be read as a step (haze
// stops at the line) or a plateau (the whole cell is a different tint).
import sharp from "sharp"; import fs from "node:fs";
sharp.cache(false);
const GEN = 2560, BLEED = 256, CELL = 2048;
async function load(p) {
  if (!fs.existsSync(p)) { console.log("missing", p); return null; }
  const meta = await sharp(p).metadata(); let img = sharp(p);
  if (meta.width !== GEN) img = img.resize(GEN, GEN, { kernel: "lanczos3" });
  return img.ensureAlpha().raw().toBuffer();
}
function band(buf, edge, o0, o1, step = 2) {
  const rs = [], gs = [], bs = [];
  for (let t = 256; t < 2304; t += step) for (let o = o0; o < o1; o += step) {
    let gx, gy;
    if (edge === "N") { gx = t; gy = BLEED + o; } else if (edge === "S") { gx = t; gy = CELL + BLEED - o; }
    else if (edge === "W") { gy = t; gx = BLEED + o; } else { gy = t; gx = CELL + BLEED - o; }
    const i = (gy * GEN + gx) * 4; if (buf[i + 3] < 250) continue;
    const r = buf[i], g = buf[i + 1], b = buf[i + 2];
    if (g > r && g > b && g > 60) { rs.push(r); gs.push(g); bs.push(b); }
  }
  if (rs.length < 500) return null;
  const med = (a) => { a.sort((p, q) => p - q); return a[a.length >> 1]; };
  const r = med(rs), g = med(gs), b = med(bs);
  return { bg: b / g, luma: 0.2126 * r + 0.7152 * g + 0.0722 * b, n: rs.length };
}
const SRC = "art-source/career-world/l2-land/ninjaone", CAND = ".codex-tmp/authoring/cells", REJ = ".codex-tmp/session3/rejected";
const targets = [
  ["c3-2 accepted", `${SRC}/c3-2/c3-2-l2.png`, ["N", "W", "S", "E"]],
  ["c3-1 cand3", `${CAND}/c3-1/c3-1-l2.png`, ["S", "E", "N", "W"]],
  ["c3-1 cand2 (rej)", `${REJ}/c3-1-palette/c3-1-l2.png`, ["S"]],
  ["c2-2 cand2", `${CAND}/c2-2/c2-2-l2.png`, ["E", "S", "N", "W"]],
  ["c2-2 cand1 (rej, src upscaled)", `${REJ}/c2-2-palisade/c2-2-source.png`, ["E", "S"]],
  ["c2-3 accepted", `${SRC}/c2-3/c2-3-l2.png`, ["N"]],
  ["c4-2 accepted", `${SRC}/c4-2/c4-2-l2.png`, ["W"]],
  ["c3-3 accepted", `${SRC}/c3-3/c3-3-l2.png`, ["N"]],
];
const edges = [0, 64, 128, 192, 256, 320, 384, 448, 512, 576, 640, 704];
const fmt = (v) => v == null ? " --  " : v.bg.toFixed(3);
console.log("bands (px from the kept edge): " + edges.slice(0, -1).map((e, i) => `${e}-${edges[i + 1]}`).join("  "));
const store = {};
for (const [label, p, eds] of targets) {
  const buf = await load(p); if (!buf) continue;
  for (const e of eds) {
    const gate = band(buf, e, 16, 178); store[label + "|" + e] = gate;
    const bands = edges.slice(0, -1).map((o, i) => band(buf, e, o, edges[i + 1]));
    const whole = band(buf, e, 0, 2048, 8);
    console.log(`\n${label} | ${e} | gate16..176 ${gate ? `${gate.bg.toFixed(3)}/${gate.luma.toFixed(1)}/n${gate.n}` : "null"} | whole ${fmt(whole)}`);
    console.log(`   b/g : ${bands.map(fmt).join(" ")}`);
    console.log(`   luma: ${bands.map((v) => v == null ? " -- " : v.luma.toFixed(0).padStart(5)).join(" ")}`);
  }
}
const pairs = [["c3-1 cand3|S", "c3-2 accepted|N"], ["c3-1 cand2 (rej)|S", "c3-2 accepted|N"],
  ["c2-2 cand2|E", "c3-2 accepted|W"], ["c2-2 cand1 (rej, src upscaled)|E", "c3-2 accepted|W"],
  ["c2-2 cand2|S", "c2-3 accepted|N"], ["c2-2 cand1 (rej, src upscaled)|S", "c2-3 accepted|N"],
  ["c3-1 cand3|E", "c4-2 accepted|W"], ["c3-2 accepted|S", "c3-3 accepted|N"]];
console.log("");
for (const [a, b] of pairs) {
  const A = store[a], B = store[b];
  console.log(`pair ${a} vs ${b}: ${A && B ? `dBG ${Math.abs(A.bg - B.bg).toFixed(3)} dLuma ${Math.abs(A.luma - B.luma).toFixed(1)} (${A.bg.toFixed(3)} vs ${B.bg.toFixed(3)})` : "skipped (a band had <500 vegetation px)"}`);
}
