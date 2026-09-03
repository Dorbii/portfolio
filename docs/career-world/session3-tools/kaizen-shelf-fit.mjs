// Where does Kaizen belong on the plan, and does the district fit there?
//
// `plan-territory.mjs` draws a shelf as a CIRCLE CENTRED on `cell + off`, so
// `off` marks a shelf centre. Step 5E aligned the district by a single anchor
// point that sat near its SOUTH edge, which pushed the whole district ~16 m
// north, out of the top of the cell the plan gives it.
//
// This re-derives the placement by the rule the plan itself draws with --
// district bounding-box centre onto the shelf centre -- and then sweeps a
// neighbourhood around that against the live land mask, so the offset that
// ships is measured rather than asserted.
//
//   node docs/career-world/session3-tools/kaizen-shelf-fit.mjs [--json]
import fs from "node:fs";
import zlib from "node:zlib";

function decodePng(p) {
  const b = fs.readFileSync(p);
  const w = b.readUInt32BE(16), h = b.readUInt32BE(20), ct = b[25];
  if (ct !== 0) throw new Error(`${p} is colour type ${ct}; the mask must be greyscale`);
  const cs = []; let o = 8;
  while (o < b.length) {
    const l = b.readUInt32BE(o);
    if (b.subarray(o + 4, o + 8).toString("ascii") === "IDAT") cs.push(b.subarray(o + 8, o + 8 + l));
    o += 12 + l;
  }
  const raw = zlib.inflateSync(Buffer.concat(cs));
  const out = Buffer.alloc(h * w);
  for (let y = 0; y < h; y += 1) {
    const f = raw[y * (w + 1)];
    const ln = raw.subarray(y * (w + 1) + 1, y * (w + 1) + 1 + w);
    for (let x = 0; x < w; x += 1) {
      const a = x >= 1 ? out[y * w + x - 1] : 0;
      const bb = y > 0 ? out[(y - 1) * w + x] : 0;
      const c = x >= 1 && y > 0 ? out[(y - 1) * w + x - 1] : 0;
      let v = ln[x];
      if (f === 1) v += a; else if (f === 2) v += bb; else if (f === 3) v += (a + bb) >> 1;
      else if (f === 4) {
        const pp = a + bb - c, pa = Math.abs(pp - a), pb = Math.abs(pp - bb), pc = Math.abs(pp - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? bb : c;
      }
      out[y * w + x] = v & 0xff;
    }
  }
  return { width: w, height: h, pixels: out };
}

const R = "public/career-world/";
const J = (p) => JSON.parse(fs.readFileSync(R + p, "utf8"));
const land = decodePng(R + "layers/terrain/authority/masks/world-land-mask-r5.png");
const isLand = (p) => {
  const x = Math.floor(p[0] * land.width), y = Math.floor(p[1] * land.height);
  if (x < 0 || y < 0 || x >= land.width || y >= land.height) return false;
  return land.pixels[y * land.width + x] >= 128;
};

// -------- every point that moves with Kaizen
const town = J("layers/infrastructure/manifests/ninjaone-project-towns-r1.json");
const outskirts = J("layers/terrain/detail/manifests/ninjaone-rural-outskirts-r1.json");
const skills = J("layers/structures/manifests/skill-structures-r1.json");
const townPts = [], fringePts = [], skillPts = [];
for (const t of town.towns) {
  const pl = t.townPlan;
  for (const b of pl.blocks ?? []) townPts.push(...b.points);
  for (const s of pl.streets ?? []) townPts.push(...s.waypoints);
  for (const z of pl.plazas ?? []) townPts.push(...z.points);
  for (const s of pl.terrainSeams ?? []) townPts.push(...s.waypoints);
  for (const l of pl.pedestrianLoops ?? []) townPts.push(...l.waypoints);
  for (const e of pl.entrances ?? []) townPts.push(e.point);
}
for (const s of [...outskirts.scenery, ...(outskirts.easterEggSlots ?? [])]) fringePts.push(s.anchor);
for (const n of skills.instances) skillPts.push(n.territoryAnchor);

const xs = townPts.map((p) => p[0]), ys = townPts.map((p) => p[1]);
const bbox = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
const centre = [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2];

// -------- where the plan puts the shelf centre
const plan = JSON.parse(fs.readFileSync("art-source/career-world/l2-land/ninjaone/plan.json", "utf8"));
const shelf = plan.shelves.find((s) => s.id === "kaizen");
const BLOCK = [3, 1], COLS = 16, ROWS = 9;
const CX = BLOCK[0] + shelf.cell[0], CY = BLOCK[1] + shelf.cell[1];
const SHELF = [(CX + shelf.off[0]) / COLS, (CY + shelf.off[1]) / ROWS];
const CELL = [CX / COLS, CY / ROWS, (CX + 1) / COLS, (CY + 1) / ROWS];
const D0 = [SHELF[0] - centre[0], SHELF[1] - centre[1]];

const M = 0.4503, PW = [3472, 1953];
const metres = (d) => [d[0] * PW[0] * M, d[1] * PW[1] * M];
console.log(`district bbox   x ${bbox[0].toFixed(5)} .. ${bbox[2].toFixed(5)}   y ${bbox[1].toFixed(5)} .. ${bbox[3].toFixed(5)}`);
console.log(`         size   ${((bbox[2] - bbox[0]) * PW[0] * M).toFixed(0)} x ${((bbox[3] - bbox[1]) * PW[1] * M).toFixed(0)} m`);
console.log(`       centre   [${centre[0].toFixed(5)}, ${centre[1].toFixed(5)}]`);
console.log(`plan shelf      cell [${CX},${CY}] off [${shelf.off}]  ->  [${SHELF[0].toFixed(5)}, ${SHELF[1].toFixed(5)}]`);
console.log(`  that cell     x ${CELL[0].toFixed(5)} .. ${CELL[2].toFixed(5)}   y ${CELL[1].toFixed(5)} .. ${CELL[3].toFixed(5)}`
  + `  (${((CELL[2] - CELL[0]) * PW[0] * M).toFixed(0)} x ${((CELL[3] - CELL[1]) * PW[1] * M).toFixed(0)} m)`);
console.log(`centre-align D  [${D0[0].toFixed(6)}, ${D0[1].toFixed(6)}]  = ${metres(D0).map((v) => v.toFixed(1)).join(" , ")} m\n`);

// -------- sweep a neighbourhood; count what stays dry
const STEP = 1 / land.width / 2;                        // half a mask pixel
const RANGE = 24;
const score = (d) => {
  let wet = 0;
  for (const p of townPts) if (!isLand([p[0] + d[0], p[1] + d[1]])) wet += 1;
  for (const p of skillPts) if (!isLand([p[0] + d[0], p[1] + d[1]])) wet += 1;
  return wet;
};
let best = null;
const rows = [];
for (let iy = -RANGE; iy <= RANGE; iy += 1) {
  for (let ix = -RANGE; ix <= RANGE; ix += 1) {
    const d = [D0[0] + ix * STEP, D0[1] + iy * STEP];
    const wet = score(d);
    const move = Math.hypot(ix, iy);
    rows.push({ ix, iy, wet, move });
    if (!best || wet < best.wet || (wet === best.wet && move < best.move)) best = { ix, iy, wet, move, d };
  }
}
console.log(`sweep  +-${RANGE} half-mask-px about the centre alignment (${(STEP * PW[0] * M).toFixed(2)} m per step)`);
console.log(`  at the plain centre alignment      ${score(D0)} of ${townPts.length + skillPts.length} points wet`);
console.log(`  best in the sweep                  ${best.wet} wet, ${best.move.toFixed(1)} steps off centre`);
console.log(`  best delta   [${best.d[0].toFixed(6)}, ${best.d[1].toFixed(6)}]  = ${metres(best.d).map((v) => v.toFixed(1)).join(" , ")} m`);
const dry = rows.filter((r) => r.wet === 0);
console.log(`  ${dry.length} of ${rows.length} sweep positions put every point on land`);
if (dry.length) {
  const bx = dry.map((r) => r.ix), byy = dry.map((r) => r.iy);
  console.log(`    that region spans ix ${Math.min(...bx)}..${Math.max(...bx)}, iy ${Math.min(...byy)}..${Math.max(...byy)}`
    + `  = ${((Math.max(...bx) - Math.min(...bx)) * STEP * PW[0] * M).toFixed(1)} x ${((Math.max(...byy) - Math.min(...byy)) * STEP * PW[1] * M).toFixed(1)} m of slack`);
}

// -------- what the chosen delta does to the cell fit and the fringe
const D = best.d;
const nb = [bbox[0] + D[0], bbox[1] + D[1], bbox[2] + D[0], bbox[3] + D[1]];
console.log(`\nwith the chosen delta:`);
console.log(`  district bbox  x ${nb[0].toFixed(5)} .. ${nb[2].toFixed(5)}   y ${nb[1].toFixed(5)} .. ${nb[3].toFixed(5)}`);
const inCell = nb[0] >= CELL[0] && nb[2] <= CELL[2] && nb[1] >= CELL[1] && nb[3] <= CELL[3];
console.log(`  inside plan cell [${CX},${CY}]?  ${inCell}`
  + (inCell ? "" : `   overhang  N ${Math.max(0, (CELL[1] - nb[1]) * PW[1] * M).toFixed(1)}  S ${Math.max(0, (nb[3] - CELL[3]) * PW[1] * M).toFixed(1)}`
    + `  W ${Math.max(0, (CELL[0] - nb[0]) * PW[0] * M).toFixed(1)}  E ${Math.max(0, (nb[2] - CELL[2]) * PW[0] * M).toFixed(1)} m`));
const fringeWet = fringePts.filter((p) => !isLand([p[0] + D[0], p[1] + D[1]])).length;
console.log(`  rural fringe   ${fringeWet} of ${fringePts.length} anchors over water (was ${fringePts.filter((p) => !isLand(p)).length})`);
if (process.argv.includes("--json")) {
  fs.writeFileSync("docs/career-world/session3-tools/kaizen-shelf-fit.json", JSON.stringify({ delta: D, wet: best.wet }, null, 2) + "\n");
}
