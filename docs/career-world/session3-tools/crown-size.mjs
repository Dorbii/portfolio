// Conifer crown size measured the SAME way on both sides of a seam: dark
// blue-green blobs (hue 60-170, sat>=.25, value<=.45) in a 400px band, 8-connected
// components of 300..20000 px, median bbox size. Ratio across the line is the
// number; absolute sizes carry the classifier's bias equally on both sides.
import sharp from "sharp"; import fs from "node:fs";
sharp.cache(false);
const GEN = 2560, BLEED = 256, CELL = 2048, BAND = 400;
async function load(p) { const meta = await sharp(p).metadata(); let img = sharp(p); if (meta.width !== GEN) img = img.resize(GEN, GEN, { kernel: "lanczos3" }); return img.ensureAlpha().raw().toBuffer(); }
function conifer(r, g, b) { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx === 0) return false; const s = (mx - mn) / mx, v = mx / 255; if (s < 0.25 || v > 0.45) return false; let h; if (mx === r) h = 60 * (((g - b) / (mx - mn)) % 6); else if (mx === g) h = 60 * ((b - r) / (mx - mn) + 2); else h = 60 * ((r - g) / (mx - mn) + 4); if (h < 0) h += 360; return h >= 60 && h <= 170; }
function measure(buf, edge) {
  // band rectangle in canvas px, inside the kept area
  let x0, y0, w, h;
  if (edge === "N") { x0 = BLEED; y0 = BLEED; w = CELL; h = BAND; }
  else if (edge === "S") { x0 = BLEED; y0 = CELL + BLEED - BAND; w = CELL; h = BAND; }
  else if (edge === "W") { x0 = BLEED; y0 = BLEED; w = BAND; h = CELL; }
  else if (edge === "E") { x0 = CELL + BLEED - BAND; y0 = BLEED; w = BAND; h = CELL; }
  else { x0 = BLEED; y0 = BLEED; w = CELL; h = CELL; } // whole kept
  const m = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = ((y + y0) * GEN + x + x0) * 4; if (buf[i + 3] > 250 && conifer(buf[i], buf[i + 1], buf[i + 2])) m[y * w + x] = 1; }
  const lab = new Int32Array(w * h); let next = 0; const sizes = []; const stack = new Int32Array(w * h);
  for (let s = 0; s < w * h; s++) {
    if (!m[s] || lab[s]) continue; next++; let sp = 0; stack[sp++] = s; lab[s] = next; let area = 0, bx0 = w, bx1 = 0, by0 = h, by1 = 0;
    while (sp) { const p = stack[--sp]; const px = p % w, py = (p - px) / w; area++; if (px < bx0) bx0 = px; if (px > bx1) bx1 = px; if (py < by0) by0 = py; if (py > by1) by1 = py;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const qx = px + dx, qy = py + dy; if (qx < 0 || qy < 0 || qx >= w || qy >= h) continue; const q = qy * w + qx; if (m[q] && !lab[q]) { lab[q] = next; stack[sp++] = q; } } }
    if (area >= 300 && area <= 20000) sizes.push(Math.max(bx1 - bx0 + 1, by1 - by0 + 1));
  }
  sizes.sort((a, b) => a - b);
  const q = (f) => sizes.length ? sizes[Math.min(sizes.length - 1, Math.floor(f * sizes.length))] : NaN;
  return { n: sizes.length, p25: q(0.25), med: q(0.5), p75: q(0.75), cover: (m.reduce((a, b) => a + b, 0) / (w * h) * 100).toFixed(1) };
}
const SRC = "art-source/career-world/l2-land/ninjaone", CAND = ".codex-tmp/authoring/cells", REJ = ".codex-tmp/session3/rejected";
const jobs = [
  ["c3-2 accepted", `${SRC}/c3-2/c3-2-l2.png`, ["N", "W", "S", "all"]],
  ["c3-1 cand3", `${CAND}/c3-1/c3-1-l2.png`, ["S", "N", "all"]],
  ["c3-1 cand2 (rej)", `${REJ}/c3-1-palette/c3-1-l2.png`, ["S", "all"]],
  ["c2-2 cand2", `${CAND}/c2-2/c2-2-l2.png`, ["E", "S", "all"]],
  ["c2-2 cand1 (rej)", `${REJ}/c2-2-palisade/c2-2-source.png`, ["E", "all"]],
  ["c2-3 accepted", `${SRC}/c2-3/c2-3-l2.png`, ["N", "E", "all"]],
  ["c3-3 accepted", `${SRC}/c3-3/c3-3-l2.png`, ["N", "W", "all"]],
  ["c4-2 accepted", `${SRC}/c4-2/c4-2-l2.png`, ["W", "S", "all"]],
  ["c4-3 accepted", `${SRC}/c4-3/c4-3-l2.png`, ["all"]],
  ["seed canon r2", `${SRC}/seed/L2-seed-region-r2.png`, ["all"]],
];
for (const [label, p, eds] of jobs) { if (!fs.existsSync(p)) { console.log("missing", p); continue; } const buf = await load(p);
  for (const e of eds) { const r = measure(buf, e); console.log(`${label.padEnd(20)} ${e.padEnd(4)} n ${String(r.n).padStart(4)}  p25/med/p75 ${r.p25}/${r.med}/${r.p75} px  conifer cover ${r.cover}%`); } }
