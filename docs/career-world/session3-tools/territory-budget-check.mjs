// Does the authored L2 grid fit the territory the world layout scopes for it?
//
// The world is scoped: `world-land-layout-r1.json` declares 3 landmasses and
// `world-territories-r4.json` 5 territories, and the segmentation SVG cuts the
// land between them. So where NinjaOne's 20 authored cells go is NOT a free
// choice -- it is wherever NinjaOne's territory is. This measures whether the
// grid fits, in the post-reset plane.
//
// The segmentation paths are axis-aligned staircases (M then H/V runs), which
// is why they can be parsed and filled here without an SVG renderer.
//
//   node docs/career-world/session3-tools/territory-budget-check.mjs
import fs from "node:fs";
import zlib from "node:zlib";

function decodePng(p) {
  const b = fs.readFileSync(p);
  const w = b.readUInt32BE(16), h = b.readUInt32BE(20), ct = b[25];
  const ch = ct === 6 ? 4 : ct === 2 ? 3 : 1;
  const cs = []; let o = 8;
  while (o < b.length) {
    const l = b.readUInt32BE(o);
    if (b.subarray(o + 4, o + 8).toString("ascii") === "IDAT") cs.push(b.subarray(o + 8, o + 8 + l));
    o += 12 + l;
  }
  const raw = zlib.inflateSync(Buffer.concat(cs));
  const st = w * ch, out = Buffer.alloc(h * st);
  for (let y = 0; y < h; y += 1) {
    const f = raw[y * (st + 1)];
    const ln = raw.subarray(y * (st + 1) + 1, y * (st + 1) + 1 + st);
    for (let x = 0; x < st; x += 1) {
      const a = x >= ch ? out[y * st + x - ch] : 0;
      const bb = y > 0 ? out[(y - 1) * st + x] : 0;
      const c = x >= ch && y > 0 ? out[(y - 1) * st + x - ch] : 0;
      let v = ln[x];
      if (f === 1) v += a; else if (f === 2) v += bb; else if (f === 3) v += (a + bb) >> 1;
      else if (f === 4) {
        const pp = a + bb - c, pa = Math.abs(pp - a), pb = Math.abs(pp - bb), pc = Math.abs(pp - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? bb : c;
      }
      out[y * st + x] = v & 0xff;
    }
  }
  return { width: w, height: h, pixels: out };
}

const A = "public/career-world/layers/terrain/authority/";
const land = decodePng(A + "masks/world-land-mask-r3.png");
const W = land.width, H = land.height;
const svg = fs.readFileSync(A + "masks/territory-segmentation-r4.svg", "utf8");

// ------------------------------------------------- parse the staircase paths
function pathPoints(d) {
  const pts = [];
  let x = 0, y = 0;
  const re = /([MHVLZmhvlz])\s*(-?[\d.]+)?\s*(-?[\d.]+)?/g;
  let m;
  while ((m = re.exec(d)) !== null) {
    const [, cmd, a, b] = m;
    if (cmd === "M" || cmd === "L") { x = Number(a); y = Number(b); pts.push([x, y]); }
    else if (cmd === "H") { x = Number(a); pts.push([x, y]); }
    else if (cmd === "V") { y = Number(a); pts.push([x, y]); }
  }
  return pts;
}
const territories = new Map();
for (const m of svg.matchAll(/<path id="territory-([a-z-]+)"[^>]*?d="([^"]+)"/g)) {
  territories.set(m[1], pathPoints(m[2]));
}

// even-odd scanline fill, evaluated per pixel centre
function fill(pts) {
  const mask = new Uint8Array(W * H);
  for (let y = 0; y < H; y += 1) {
    const yc = y + 0.5;
    const xs = [];
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i, i += 1) {
      const [x1, y1] = pts[j], [x2, y2] = pts[i];
      if ((y1 > yc) !== (y2 > yc)) xs.push(x1 + (yc - y1) / (y2 - y1) * (x2 - x1));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = Math.max(0, Math.ceil(xs[k] - 0.5)); x < Math.min(W, Math.ceil(xs[k + 1] - 0.5)); x += 1) {
        mask[y * W + x] = 1;
      }
    }
  }
  return mask;
}

// ------------------------------------------------------------------ measure
const M_PER_PX_NEW = 0.4503;                 // pinned
const PLANE_NEW = [3344, 1882];
const PLANE_M = PLANE_NEW.map((v) => v * M_PER_PX_NEW);
const REGION_M = 218 * M_PER_PX_NEW;
const REGION_A = REGION_M * REGION_M;
const isLand = (i) => land.pixels[i] >= 128;

console.log(`plane ${PLANE_NEW.join(" x ")} px = ${PLANE_M.map((v) => v.toFixed(0)).join(" x ")} m`);
console.log(`region ${REGION_M.toFixed(1)} m\n`);
console.log("territory".padEnd(22) + "land %plane  regions  bbox x        bbox y");

const budgets = { ninjaone: 21, tanium: 21 };
const rows = [];
for (const [id, pts] of territories) {
  const mask = fill(pts);
  let n = 0, x0 = 1, x1 = 0, y0 = 1, y1 = 0;
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const i = y * W + x;
      if (!mask[i] || !isLand(i)) continue;
      n += 1;
      const nx = x / W, ny = y / H;
      if (nx < x0) x0 = nx; if (nx > x1) x1 = nx;
      if (ny < y0) y0 = ny; if (ny > y1) y1 = ny;
    }
  }
  const frac = n / (W * H);
  const regions = frac * PLANE_M[0] * PLANE_M[1] / REGION_A;
  rows.push({ id, frac, regions, x0, x1, y0, y1 });
  console.log(
    id.padEnd(22)
    + `${(frac * 100).toFixed(1).padStart(5)}%`
    + `${regions.toFixed(1).padStart(9)}`
    + `  ${x0.toFixed(3)}-${x1.toFixed(3)}`
    + `  ${y0.toFixed(3)}-${y1.toFixed(3)}`
    + (budgets[id] ? `   budget ${budgets[id]}` : ""),
  );
}
const total = rows.reduce((a, r) => a + r.regions, 0);
console.log(`${"TOTAL".padEnd(22)}${(rows.reduce((a, r) => a + r.frac, 0) * 100).toFixed(1).padStart(5)}%${total.toFixed(1).padStart(9)}   (STATE: ~88 to author)`);

// ------------------------------------------------------- the grid against it
const CELL_M = 97.6;
const GRID_M = [5 * CELL_M, 4 * CELL_M];
const GRID_FRAC = [GRID_M[0] / PLANE_M[0], GRID_M[1] / PLANE_M[1]];
const n1 = rows.find((r) => r.id === "ninjaone");
console.log(`\nL2 grid  5 x 4 cells  ${GRID_M.join(" x ")} m  = ${GRID_FRAC.map((v) => v.toFixed(4)).join(" x ")} of the plane`);
console.log(`         ${(GRID_M[0] * GRID_M[1] / REGION_A).toFixed(1)} regions of RECTANGLE (it carries its own sea, so not all land)`);
if (n1) {
  console.log(`\nninjaone territory bbox  ${(n1.x1 - n1.x0).toFixed(4)} x ${(n1.y1 - n1.y0).toFixed(4)} of the plane`);
  console.log(`                         ${((n1.x1 - n1.x0) * PLANE_M[0]).toFixed(0)} x ${((n1.y1 - n1.y0) * PLANE_M[1]).toFixed(0)} m`);
  console.log(`grid vs bbox             ${(GRID_FRAC[0] / (n1.x1 - n1.x0) * 100).toFixed(0)}% of its width, ${(GRID_FRAC[1] / (n1.y1 - n1.y0) * 100).toFixed(0)}% of its height`);
  console.log(`\nninjaone LAND is ${n1.regions.toFixed(1)} regions against a 21-region budget;`);
  console.log(`the grid rectangle is ${(GRID_M[0] * GRID_M[1] / REGION_A).toFixed(1)} regions including its own water.`);
}
