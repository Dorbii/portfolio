// Where exactly does Kaizen's district leave the authored land, and by how far?
//
// The two remaining content failures both reduce to points standing over
// water. A count does not say whether the fix is a nudge or a redesign, so
// this reports, for every failing point: its world coordinate, the lattice
// cell it stands in, and the distance to the nearest land pixel measured on
// the live mask -- in mask px, world px, and metres at the 0.4503 m/world-px
// scale contract.
//
// It reads the LIVE manifests and the LIVE mask. It writes nothing.
//
//   node docs/career-world/session3-tools/kaizen-coastline-survey.mjs
import fs from "node:fs";
import zlib from "node:zlib";

function decodePng(p) {
  const b = fs.readFileSync(p);
  const w = b.readUInt32BE(16), h = b.readUInt32BE(20), ct = b[25];
  if (ct !== 0) throw new Error(`${p} is colour type ${ct}; the mask must be greyscale (0)`);
  const cs = []; let o = 8;
  while (o < b.length) {
    const l = b.readUInt32BE(o);
    if (b.subarray(o + 4, o + 8).toString("ascii") === "IDAT") cs.push(b.subarray(o + 8, o + 8 + l));
    o += 12 + l;
  }
  const raw = zlib.inflateSync(Buffer.concat(cs));
  const st = w, out = Buffer.alloc(h * st);
  for (let y = 0; y < h; y += 1) {
    const f = raw[y * (st + 1)];
    const ln = raw.subarray(y * (st + 1) + 1, y * (st + 1) + 1 + st);
    for (let x = 0; x < st; x += 1) {
      const a = x >= 1 ? out[y * st + x - 1] : 0;
      const bb = y > 0 ? out[(y - 1) * st + x] : 0;
      const c = x >= 1 && y > 0 ? out[(y - 1) * st + x - 1] : 0;
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

const R = "public/career-world/";
const J = (p) => JSON.parse(fs.readFileSync(R + p, "utf8"));
const land = decodePng(R + "layers/terrain/authority/masks/world-land-mask-r5.png");
const MASK_TO_WORLD = 3472 / land.width;     // 3472 world px across the plane
const M_PER_WORLD_PX = 0.4503;

const px = (p) => [
  Math.min(land.width - 1, Math.floor(p[0] * land.width)),
  Math.min(land.height - 1, Math.floor(p[1] * land.height)),
];
const isLand = (p) => { const [x, y] = px(p); return land.pixels[y * land.width + x] >= 128; };

// Distance to the nearest land pixel, by expanding rings. Bounded: nothing
// interesting is more than a cell away.
function nearestLand(p) {
  const [x0, y0] = px(p);
  for (let r = 1; r <= 120; r += 1) {
    let best = null;
    for (let dy = -r; dy <= r; dy += 1) {
      for (let dx = -r; dx <= r; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = x0 + dx, y = y0 + dy;
        if (x < 0 || y < 0 || x >= land.width || y >= land.height) continue;
        if (land.pixels[y * land.width + x] < 128) continue;
        const d = Math.hypot(dx, dy);
        if (!best || d < best.d) best = { d, dx, dy };
      }
    }
    if (best) return best;
  }
  return null;
}

const cell = (p) => [Math.floor(p[0] * 16), Math.floor(p[1] * 9)];

// ---- every world-registered point the two failing gates walk
const pts = [];
const add = (owner, label, p) => pts.push({ owner, label, p });
for (const t of J("layers/infrastructure/manifests/ninjaone-project-towns-r1.json").towns) {
  const pl = t.townPlan;
  for (const b of pl.blocks ?? []) b.points.forEach((p, j) => add(t.id, `block ${b.id}.${j}`, p));
  for (const s of pl.streets ?? []) s.waypoints.forEach((p, j) => add(t.id, `street ${s.id}.${j}`, p));
  for (const z of pl.plazas ?? []) z.points.forEach((p, j) => add(t.id, `plaza ${z.id}.${j}`, p));
  for (const s of pl.terrainSeams ?? []) s.waypoints.forEach((p, j) => add(t.id, `seam ${s.id}.${j}`, p));
  for (const l of pl.pedestrianLoops ?? []) l.waypoints.forEach((p, j) => add(t.id, `loop ${l.id}.${j}`, p));
  (pl.entrances ?? []).forEach((e) => add(t.id, `entrance ${e.id}`, e.point));
}
J("layers/structures/manifests/skill-structures-r1.json").instances
  .forEach((n) => add("skill-structures", n.id, n.territoryAnchor));

const bad = pts.filter((q) => !isLand(q.p));
console.log(`${bad.length} of ${pts.length} world-registered points stand over water.`);
console.log(`mask ${land.width} x ${land.height}; 1 mask px = ${MASK_TO_WORLD.toFixed(2)} world px = ${(MASK_TO_WORLD * M_PER_WORLD_PX).toFixed(2)} m\n`);

const byOwner = {};
for (const q of bad) (byOwner[q.owner] ??= []).push(q);
for (const [owner, list] of Object.entries(byOwner)) {
  console.log(`${owner}  (${list.length})`);
  let maxM = 0;
  const dirs = {};
  for (const q of list) {
    const n = nearestLand(q.p);
    const m = n ? n.d * MASK_TO_WORLD * M_PER_WORLD_PX : Infinity;
    maxM = Math.max(maxM, m);
    const dir = n ? `${n.dy < 0 ? "N" : n.dy > 0 ? "S" : ""}${n.dx < 0 ? "W" : n.dx > 0 ? "E" : ""}` : "-";
    dirs[dir] = (dirs[dir] ?? 0) + 1;
    const [c, r] = cell(q.p);
    console.log(
      `  ${q.label.padEnd(34)} [${q.p[0].toFixed(5)}, ${q.p[1].toFixed(5)}]  cell [${c},${r}]`
      + `  mask ${String(px(q.p)[0]).padStart(4)},${String(px(q.p)[1]).padStart(3)}`
      + `  land ${n ? n.d.toFixed(1).padStart(5) : "  ---"} px = ${m.toFixed(1).padStart(6)} m  ${dir}`,
    );
  }
  console.log(`  worst ${maxM.toFixed(1)} m from land; nearest-land bearings ${JSON.stringify(dirs)}\n`);
}

// How far would ONE rigid translation have to carry the whole district?
const kai = bad.filter((q) => q.owner !== "skill-structures");
if (kai.length) {
  let mx = 0, my = 0;
  for (const q of kai) {
    const n = nearestLand(q.p);
    if (n) { mx = Math.max(mx, -n.dx); my = Math.max(my, -n.dy); }
  }
  console.log(`A rigid shift that clears every failing town point would be at least`);
  console.log(`  ${Math.max(0, mx)} mask px west, ${Math.max(0, my)} mask px north`);
  console.log(`  = ${(Math.max(0, mx) * MASK_TO_WORLD * M_PER_WORLD_PX).toFixed(0)} m west, ${(Math.max(0, my) * MASK_TO_WORLD * M_PER_WORLD_PX).toFixed(0)} m north`);
}
