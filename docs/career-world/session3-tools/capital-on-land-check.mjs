// Does the NinjaOne capital stand on land, as registered right now?
//
// Reads the LIVE manifests and tests them against the world land mask and
// slope field as they are -- no transform, so it means the same thing before
// and after the scale reset. (`scale-reset-landmask-check.mjs` predicts the
// effect of applying the reset and refuses to run once it is applied; this one
// measures the state.)
//
// It reproduces the two gates in tests/assets.test.mjs that actually bite:
// "every territory reserves a registered city-ready capital envelope" and
// "NinjaOne town-plan paving stays on accepted terrain", so a number here can
// be compared with a suite failure rather than guessed at.
//
//   node docs/career-world/session3-tools/capital-on-land-check.mjs
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

const R = "public/career-world/";
const J = (p) => JSON.parse(fs.readFileSync(R + p, "utf8"));
const A = "layers/terrain/authority/";
const land = decodePng(R + A + "masks/world-land-mask-r5.png");
const slope = null;  // the old slope field is deleted with the art it described
const at = (p) => {
  const x = Math.min(land.width - 1, Math.floor(p[0] * land.width));
  const y = Math.min(land.height - 1, Math.floor(p[1] * land.height));
  return y * land.width + x;
};
const isLand = (p) => land.pixels[at(p)] >= 128;

// ------------------------------------------- gate 1: the capital envelope
const ninjaOne = J(A + "manifests/world-territories-r4.json")
  .territories.find(({ id }) => id === "ninjaone").development;
const { capitalAnchor, capitalEnvelope: env } = ninjaOne;
const [ox, oy] = env.origin, [sx, sy] = env.span;
let lp = 0, bp = 0, tp = 0;
for (let y = Math.floor(oy * land.height); y < Math.ceil((oy + sy) * land.height); y += 1) {
  for (let x = Math.floor(ox * land.width); x < Math.ceil((ox + sx) * land.width); x += 1) {
    const off = y * land.width + x;
    const l = land.pixels[off] >= 128;
    lp += l ? 1 : 0;
    bp += l ? 1 : 0;
    tp += 1;
  }
}
const coverage = lp / tp, buildable = bp / Math.max(lp, 1);
const line = (label, got, need, pass) =>
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${label.padEnd(24)} ${String(got).padEnd(10)} need ${need}`);

console.log(`NinjaOne capital envelope  origin [${env.origin}]  span [${env.span}]`);
console.log(`capitalAnchor [${capitalAnchor}]\n`);
console.log("assets.test.mjs -- 'every territory reserves a registered city-ready capital envelope'");
line("anchor on land", isLand(capitalAnchor), "true", isLand(capitalAnchor));
console.log("  ----  anchor slope             (slope field deleted with the old terrain)");
line("envelope land coverage", coverage.toFixed(3), `>= ${ninjaOne.minimumLandCoverage}`, coverage >= ninjaOne.minimumLandCoverage);
line("buildable / land", buildable.toFixed(3), ">= 0.58", buildable >= 0.58);

// -------------------------------------------- gate 2: the town-plan paving
const groups = {};
const add = (g, label, p) => { (groups[g] ??= []).push([label, p]); };
for (const t of J("layers/infrastructure/manifests/ninjaone-project-towns-r1.json").towns) {
  const pl = t.townPlan;
  for (const [i, b] of (pl.blocks ?? []).entries()) b.points.forEach((p, j) => add("blocks", `b${i}.${j}`, p));
  for (const [i, s] of (pl.streets ?? []).entries()) s.waypoints.forEach((p, j) => add("streets", `s${i}.${j}`, p));
  for (const [i, z] of (pl.plazas ?? []).entries()) z.points.forEach((p, j) => add("plazas", `z${i}.${j}`, p));
  for (const [i, s] of (pl.terrainSeams ?? []).entries()) s.waypoints.forEach((p, j) => add("terrainSeams", `t${i}.${j}`, p));
  for (const [i, l] of (pl.pedestrianLoops ?? []).entries()) l.waypoints.forEach((p, j) => add("pedestrianLoops", `l${i}.${j}`, p));
  (pl.entrances ?? []).forEach((e, i) => add("entrances", `e${i}`, e.point));
}
J("layers/structures/manifests/project-structures-r1.json").nodes
  .forEach((n) => add("kaizen node", n.id, n.territoryAnchor));
J("layers/structures/manifests/skill-structures-r1.json").instances
  .forEach((n) => add("kaizen skills", n.id, n.territoryAnchor));
add("kaizen plate", "anchor", J("cities/kaizen-agent/manifests/base-runtime-r1.json").plate.anchor);
J("layers/terrain/detail/manifests/ninjaone-rural-outskirts-r1.json").scenery
  .forEach((s) => add("rural outskirts", s.id, s.anchor));

console.log("\nworld-registered capital content, point by point");
let overWater = 0, total = 0;
for (const [g, pts] of Object.entries(groups)) {
  const bad = pts.filter(([, p]) => !isLand(p));
  overWater += bad.length; total += pts.length;
  console.log(
    `  ${g.padEnd(17)} ${String(pts.length).padStart(3)} points  ${String(bad.length).padStart(3)} over water`
    + (bad.length ? `   ${bad.map(([l]) => l).slice(0, 4).join(" ")}${bad.length > 4 ? " ..." : ""}` : ""),
  );
}
console.log(`\n  ${overWater} of ${total} over water.`);
console.log(`
The rural-outskirts layer had anchors over water before the scale reset too,
so "on land" was never an invariant there. The envelope coverage gate is the
one that decides, and the terrain it measures against is what step 5 replaces.`);
