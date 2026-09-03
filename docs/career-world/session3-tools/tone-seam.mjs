// Tonal step at a seam on ALL opaque land pixels (not vegetation only): medians of
// luma and of two chroma axes (r-g, b-g) in the 16..176 px band inside each cell's
// edge, and the difference across the line. Calibration across accepted seams.
import sharp from "sharp"; import fs from "node:fs";
sharp.cache(false);
const GEN = 2560, BLEED = 256, CELL = 2048, SRC = "art-source/career-world/l2-land/ninjaone";
const cache = new Map();
async function load(p) { if (cache.has(p)) return cache.get(p); if (!fs.existsSync(p)) return null; const m = await sharp(p).metadata(); let i = sharp(p); if (m.width !== GEN) i = i.resize(GEN, GEN, { kernel: "lanczos3" }); const b = await i.ensureAlpha().raw().toBuffer(); cache.set(p, b); return b; }
function band(buf, edge, o0 = 16, o1 = 178) {
  const L = [], RG = [], BG = [];
  for (let t = 256; t < 2304; t += 2) for (let o = o0; o < o1; o += 2) {
    let gx, gy; if (edge === "N") { gx = t; gy = BLEED + o; } else if (edge === "S") { gx = t; gy = CELL + BLEED - o; } else if (edge === "W") { gy = t; gx = BLEED + o; } else { gy = t; gx = CELL + BLEED - o; }
    const i = (gy * GEN + gx) * 4; if (buf[i + 3] < 250) continue; const r = buf[i], g = buf[i + 1], b = buf[i + 2];
    L.push(0.2126 * r + 0.7152 * g + 0.0722 * b); RG.push(r - g); BG.push(b - g);
  }
  if (L.length < 500) return null; const med = (a) => { a.sort((p, q) => p - q); return a[a.length >> 1]; };
  return { luma: med(L), rg: med(RG), bg: med(BG), n: L.length };
}
const pairs = [
  ["4,1 S", `${SRC}/c4-1/c4-1-l2.png`, "S", "4,2 N", `${SRC}/c4-2/c4-2-l2.png`, "N"],
  ["1,3 stitched N", `${SRC}/c1-3/c1-3-l2.png`, "N", "1,2 S", `${SRC}/c1-2/c1-2-l2.png`, "S"],
  ["1,3 stitched E", `${SRC}/c1-3/c1-3-l2.png`, "E", "2,3 W", `${SRC}/c2-3/c2-3-l2.png`, "W"],
  ["1,2 E", `${SRC}/c1-2/c1-2-l2.png`, "E", "2,2 W", `${SRC}/c2-2/c2-2-l2.png`, "W"],
  ["2,2 E", `${SRC}/c2-2/c2-2-l2.png`, "E", "3,2 W", `${SRC}/c3-2/c3-2-l2.png`, "W"],
  ["2,2 S", `${SRC}/c2-2/c2-2-l2.png`, "S", "2,3 N", `${SRC}/c2-3/c2-3-l2.png`, "N"],
  ["2,3 E", `${SRC}/c2-3/c2-3-l2.png`, "E", "3,3 W", `${SRC}/c3-3/c3-3-l2.png`, "W"],
  ["3,3 E", `${SRC}/c3-3/c3-3-l2.png`, "E", "4,3 W", `${SRC}/c4-3/c4-3-l2.png`, "W"],
  ["3,2 S", `${SRC}/c3-2/c3-2-l2.png`, "S", "3,3 N", `${SRC}/c3-3/c3-3-l2.png`, "N"],
  ["3,1 S", `${SRC}/c3-1/c3-1-l2.png`, "S", "3,2 N", `${SRC}/c3-2/c3-2-l2.png`, "N"],
  ["2,1 S", `${SRC}/c2-1/c2-1-l2.png`, "S", "2,2 N", `${SRC}/c2-2/c2-2-l2.png`, "N"],
  ["2,1 E", `${SRC}/c2-1/c2-1-l2.png`, "E", "3,1 W", `${SRC}/c3-1/c3-1-l2.png`, "W"],
  ["4,2 S", `${SRC}/c4-2/c4-2-l2.png`, "S", "4,3 N", `${SRC}/c4-3/c4-3-l2.png`, "N"],
  ["3,2 E", `${SRC}/c3-2/c3-2-l2.png`, "E", "4,2 W", `${SRC}/c4-2/c4-2-l2.png`, "W"],
];
console.log("seam                     dLuma   d(r-g)  d(b-g)   | A luma rg bg | B luma rg bg");
for (const [la, pa, ea, lb, pb, eb] of pairs) {
  const A = await load(pa), B = await load(pb); if (!A || !B) { console.log(la, "missing"); continue; }
  const a = band(A, ea), b = band(B, eb); if (!a || !b) { console.log(`${la} vs ${lb}: a band had <500 land px`); continue; }
  console.log(`${(la + " vs " + lb).padEnd(24)} ${Math.abs(a.luma - b.luma).toFixed(1).padStart(5)}   ${Math.abs(a.rg - b.rg).toFixed(1).padStart(5)}   ${Math.abs(a.bg - b.bg).toFixed(1).padStart(5)}   | ${a.luma.toFixed(0)} ${a.rg.toFixed(0)} ${a.bg.toFixed(0)} | ${b.luma.toFixed(0)} ${b.rg.toFixed(0)} ${b.bg.toFixed(0)}`);
}
