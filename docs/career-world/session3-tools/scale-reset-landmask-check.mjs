// Does the re-derived capital still stand on land?
//
// The scale reset moves every NinjaOne capital point toward the envelope
// origin (p' = o + (p - o)/2) while the world land mask -- a plane-wide raster
// addressed by FRACTION -- does not move at all. So the capital lands on
// different mask pixels than it does today. `tests/assets.test.mjs` asserts
// town entrances sit on land ("leaves the world plane"), and that guard fails
// closed, so this has to be answered BEFORE the apply, not discovered by it.
//
//   node docs/career-world/session3-tools/scale-reset-landmask-check.mjs
import fs from "node:fs";
import zlib from "node:zlib";

function decodePng(p) {
  const buffer = fs.readFileSync(p);
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const bitDepth = buffer[24];
  const colorType = buffer[25];
  if (bitDepth !== 8) throw new Error(`${p}: bit depth ${bitDepth}`);
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const chunks = [];
  let offset = 8;
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    if (type === "IDAT") chunks.push(buffer.subarray(offset + 8, offset + 8 + length));
    offset += 12 + length;
  }
  const raw = zlib.inflateSync(Buffer.concat(chunks));
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    for (let x = 0; x < stride; x += 1) {
      const a = x >= channels ? out[y * stride + x - channels] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= channels && y > 0 ? out[(y - 1) * stride + x - channels] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const pp = a + b - c;
        const pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[y * stride + x] = v & 0xff;
    }
  }
  return { width, height, channels, data: out };
}

const ENV_O = [0.125, 0];
const rederive = (p) => [ENV_O[0] + (p[0] - ENV_O[0]) * 0.5, ENV_O[1] + (p[1] - ENV_O[1]) * 0.5];

const R = "public/career-world/";
const J = (p) => JSON.parse(fs.readFileSync(R + p, "utf8"));

// This script reads the LIVE manifests and applies the transform to what it
// finds, so it only means anything BEFORE the apply. Run after, it transforms
// already-transformed values and reports a second halving as if it were the
// first -- which it did once, claiming 21 regressions where the real answer
// was 4. Refuse rather than mislead.
{
  const span = J("layers/terrain/authority/manifests/world-territories-r4.json")
    .territories.find(({ id }) => id === "ninjaone").development.capitalEnvelope.span;
  if (Math.abs(span[0] - 0.25) > 1e-9) {
    console.error(
      `The scale reset is already applied (ninjaone capitalEnvelope.span is`
      + ` [${span}], not [0.25, 1/3]).\n`
      + `This script predicts the effect of applying it, so there is nothing`
      + ` left for it to predict.\n`
      + `To ask whether the capital stands on land NOW, test the manifest`
      + ` positions as they are, without the transform.`,
    );
    process.exit(2);
  }
}

// Every NinjaOne capital point the inventory re-derives.
const points = [];
const push = (label, p) => points.push([label, p]);
const kz = J("cities/kaizen-agent/manifests/base-runtime-r1.json");
push("kaizen plate anchor", kz.plate.anchor);
// the plate's four corners, since the plate is what actually occupies ground
const po = [kz.plate.anchor[0] - kz.plate.span[0] * 0.5,
  kz.plate.anchor[1] - kz.plate.span[1] * kz.plate.alignmentY];
for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
  push(`kaizen plate corner ${dx}${dy}`, [po[0] + dx * kz.plate.span[0], po[1] + dy * kz.plate.span[1]]);
}
for (const n of J("layers/structures/manifests/project-structures-r1.json").nodes) {
  if (n.id === "project-kaizen-agent") push(`node ${n.id}`, n.territoryAnchor);
}
for (const i of J("layers/structures/manifests/skill-structures-r1.json").instances) {
  push(`skill ${i.id}`, i.territoryAnchor);
}
for (const t of J("layers/terrain/authority/manifests/terrain-dem-r4.json").developmentShelves) {
  if (t.id.startsWith("ninjaone-") && t.id !== "ninjaone-development-basin") push(`shelf ${t.id}`, t.center);
}
for (const t of J("layers/infrastructure/manifests/ninjaone-project-towns-r1.json").towns) {
  for (const [i, e] of (t.townPlan?.entrances ?? []).entries()) push(`${t.id} entrance ${i}`, e.point);
}
for (const s of J("layers/terrain/detail/manifests/ninjaone-rural-outskirts-r1.json").scenery) {
  push(`outskirts ${s.id}`, s.anchor);
}
const st = J("layers/terrain/authority/manifests/terrain-site-tiles-r2.json").tiles
  .find((t) => t.id.startsWith("project-kaizen"));
for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
  push(`kaizen site tile corner ${dx}${dy}`,
    [st.worldBounds.origin[0] + dx * st.worldBounds.span[0],
      st.worldBounds.origin[1] + dy * st.worldBounds.span[1]]);
}

for (const maskName of ["world-land-mask-r3.png", "world-land-mask-r4.png"]) {
  const mask = decodePng(R + "layers/terrain/authority/masks/" + maskName);
  const isLand = ([x, y]) => {
    const px = Math.floor(x * mask.width);
    const py = Math.floor(y * mask.height);
    if (px < 0 || py < 0 || px >= mask.width || py >= mask.height) return null;
    const i = (py * mask.width + px) * mask.channels;
    // land mask: opaque / bright = land. Use alpha when present, else luma.
    return mask.channels === 4 ? mask.data[i + 3] > 127 : mask.data[i] > 127;
  };

  console.log(`\n== ${maskName}  (${mask.width}x${mask.height}, ${mask.channels}ch) ==`);
  let bothLand = 0, wasLandNowNot = 0, offPlane = 0, neither = 0;
  const regressions = [];
  for (const [label, p] of points) {
    const before = isLand(p);
    const q = rederive(p);
    const after = isLand(q);
    if (after === null) { offPlane += 1; regressions.push([label, p, q, "OFF PLANE"]); continue; }
    if (before && after) bothLand += 1;
    else if (before && !after) { wasLandNowNot += 1; regressions.push([label, p, q, "land -> water"]); }
    else { neither += 1; if (!before) console.log(`    ALREADY water today: ${label} [${p.map((v)=>v.toFixed(4))}]`); }
  }
  console.log(`  points checked      ${points.length}`);
  console.log(`  land before+after   ${bothLand}`);
  console.log(`  land -> water       ${wasLandNowNot}`);
  console.log(`  off plane after     ${offPlane}`);
  console.log(`  not land before     ${neither}`);
  if (regressions.length) {
    console.log(`  REGRESSIONS:`);
    for (const [label, p, q, why] of regressions.slice(0, 14)) {
      console.log(`    ${why.padEnd(13)} ${label}`);
      console.log(`      [${p.map((v) => v.toFixed(4))}] -> [${q.map((v) => v.toFixed(4))}]`);
    }
    if (regressions.length > 14) console.log(`    ... ${regressions.length - 14} more`);
  } else {
    console.log(`  no regressions - every re-derived point stands where it stood.`);
  }
}
