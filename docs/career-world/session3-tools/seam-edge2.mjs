// Hard-edge excess at the seam the stitch ACTUALLY uses (wiggle + 8 px feather):
// the share of the boundary's length where luma steps by more than STEP across it
// (sampled GAP px either side, beyond the feather, smoothed 5 px along it), over
// the same statistic 64 and 128 px inside each cell. A candidate canvas is
// stitched with the pipeline's own weights first.
//   node seam-edge2.mjs <label> <col> <row> <E|S> [candidateCanvas.png [id]]
//   node seam-edge2.mjs --control <id> <col> <row>
//     the port re-stitches an ACCEPTED cell over the world and compares to the tiles
import sharp from "sharp";
import { makeSeam, authoredSet, worldWindow, stitchWindow, CELL_PX, BLEED, GEN_PX } from "./seam-geo.mjs";
sharp.cache(false);
const STEP = 40, GAP = 12, D = 400;
const seam = makeSeam(5, 4), authored = authoredSet();
const argv = process.argv.slice(2);
if (argv[0] === "--control") {
  const [, id, cS, rS] = argv; const col = +cS, row = +rS;
  const x0 = col * CELL_PX - BLEED, y0 = row * CELL_PX - BLEED;
  const { out, world } = await stitchWindow(id, col, row, `art-source/career-world/l2-land/ninjaone/${id}/${id}-l2.png`, x0, y0, GEN_PX, GEN_PX, seam, authored);
  let nFar = 0, far = 0, maxFar = 0, nNear = 0, near = 0, maxNear = 0;
  for (let y = 0; y < GEN_PX; y++) for (let x = 0; x < GEN_PX; x++) {
    const X = x0 + x, Y = y0 + y; const own = seam.owner(X + 0.5, Y + 0.5); if (own !== id) continue;
    const dEdge = Math.min(Math.abs(X - col * CELL_PX), Math.abs(X - (col + 1) * CELL_PX), Math.abs(Y - row * CELL_PX), Math.abs(Y - (row + 1) * CELL_PX));
    const o = (y * GEN_PX + x) * 4; const d = Math.max(Math.abs(out[o] - world[o]), Math.abs(out[o + 1] - world[o + 1]), Math.abs(out[o + 2] - world[o + 2]));
    if (dEdge > 200) { far += d; maxFar = Math.max(maxFar, d); nFar++; } else { near += d; maxNear = Math.max(maxNear, d); nNear++; }
  }
  console.log(`control ${id}: owned pixels >200 px from every edge: mean |diff| ${(far / nFar).toFixed(2)} max ${maxFar}; within 200 px of an edge: mean ${(near / Math.max(1, nNear)).toFixed(2)} max ${maxNear}`);
  process.exit(0);
}
const [label, cS, rS, edge, cand, candId] = argv; const col = +cS, row = +rS;
const sx = edge === "E" ? (col + 1) * CELL_PX : col * CELL_PX, sy = edge === "E" ? row * CELL_PX : (row + 1) * CELL_PX;
const x0 = edge === "E" ? sx - D / 2 : sx, y0 = edge === "E" ? sy : sy - D / 2, w = edge === "E" ? D : CELL_PX, h = edge === "E" ? CELL_PX : D;
let rgba;
if (cand) { const id = candId || `c${col}-${row}`; rgba = (await stitchWindow(id, col, row, cand, x0, y0, w, h, seam, authored)).out; }
else rgba = await worldWindow(x0, y0, w, h);
const L = (x, y) => { const o = (y * w + x) * 4; return 0.2126 * rgba[o] + 0.7152 * rgba[o + 1] + 0.0722 * rgba[o + 2]; };
const along = CELL_PX;
const bpos = (t) => edge === "E" ? sx + seam.vOffset(col + 1, sy + t) - x0 : sy + seam.hOffset(row + 1, sx + t) - y0;
function rate(shift) {
  let n = 0, hit = 0;
  for (let t = 4; t < along - 4; t++) {
    const b = Math.round(bpos(t) + shift); let a = 0, c = 0;
    for (let k = -2; k <= 2; k++) { if (edge === "E") { a += L(b - GAP, t + k); c += L(b + GAP, t + k); } else { a += L(t + k, b - GAP); c += L(t + k, b + GAP); } }
    if (Math.abs(a - c) / 5 > STEP) hit++; n++;
  }
  return hit / n;
}
const at = rate(0); const off = [-128, -64, 64, 128].map(rate); const ctrl = off.reduce((p, q) => p + q, 0) / off.length;
console.log(`${label.padEnd(18)} at seam ${(at * 100).toFixed(1).padStart(5)}%   off seam ${(ctrl * 100).toFixed(1).padStart(5)}% (${off.map((v) => (v * 100).toFixed(1)).join("/")})   excess x${(at / Math.max(ctrl, 1e-6)).toFixed(2)}`);
