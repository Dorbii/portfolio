// Is the key-light gate measuring lighting, or the water cut?
//
// The gate sums luminance gradients over opaque pixels and divides by the sum
// of magnitudes: a baked sun pushes every gradient one way, while a landform
// ridge gives +/- pairs that cancel. That reasoning is sound, but the gradient
// is read from NEIGHBOURS without checking their alpha:
//
//   const gx = L(i + 4) - L(i - 4);
//
// Water is CUT from the l2 layer, so a land pixel beside a coast differences
// against transparent black. Every such pixel points into the hole, and around
// a coastline they all point the same way — inland — with no compensating
// reverse edge anywhere in the cell. That is exactly the signature the gate
// reads as a sun.
//
// This recomputes the gate's own number two ways on the same pixels:
//   as-is        exactly as the gate does it
//   alpha-safe   identical, except a pixel is skipped unless all four gradient
//                neighbours are opaque too
//
// If the difference is large on coastal cells and small on inland ones, the
// gate is measuring the water cut. If both numbers agree, it is measuring
// light and the refusals were correct.
//
//   node docs/career-world/session3-tools/keylight-probe.mjs
import fs from "node:fs";
import sharp from "sharp";
sharp.cache(false);

async function moments(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const L = (p) => 0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2];
  const A = (p) => data[p + 3];

  let asx = 0, asy = 0, asm = 0;          // as the gate does it
  let ssx = 0, ssy = 0, ssm = 0, skipped = 0;   // alpha-safe
  let opaque = 0;
  for (let y = 1; y < H - 1; y += 1) {
    for (let x = 1; x < W - 1; x += 1) {
      const i = (y * W + x) * 4;
      if (data[i + 3] < 250) continue;
      opaque += 1;
      const gx = L(i + 4) - L(i - 4), gy = L(i + W * 4) - L(i - W * 4);
      const mag = Math.hypot(gx, gy);
      if (mag < 12) continue;
      asx += gx; asy += gy; asm += mag;
      const clean = A(i + 4) >= 250 && A(i - 4) >= 250
        && A(i + W * 4) >= 250 && A(i - W * 4) >= 250;
      if (!clean) { skipped += 1; continue; }
      ssx += gx; ssy += gy; ssm += mag;
    }
  }
  const asIs = asm ? Math.hypot(asx, asy) / asm : 0;
  const safe = ssm ? Math.hypot(ssx, ssy) / ssm : 0;
  return { asIs, safe, skipped, opaque, waterFrac: 1 - opaque / (W * H) };
}

const LIMIT = 0.011;
const rows = [];
const add = async (label, file, note) => {
  if (!fs.existsSync(file)) { console.log(`  (missing ${file})`); return; }
  const m = await moments(file);
  rows.push({ label, note, ...m });
};

// Tanium: the one accepted cell and the three the gate refused
await add("tanium c3-0", "art-source/career-world/l2-land/tanium/c3-0/c3-0-l2.png", "ACCEPTED, inland");
for (const id of ["c4-0", "c2-0", "c1-0"]) {
  await add(`tanium ${id}`, `.codex-tmp/authoring/cells/tanium/${id}/${id}-l2.png`, "REFUSED");
}
// NinjaOne: cells the owner accepted, coastal and inland, as the calibration set
const NJ = "art-source/career-world/l2-land/ninjaone";
const njPlan = JSON.parse(fs.readFileSync(`${NJ}/plan.json`, "utf8"));
for (const key of Object.keys(njPlan.cellBiomes)) {
  const [c, r] = key.split(",");
  await add(`ninjaone c${c}-${r}`, `${NJ}/c${c}-${r}/c${c}-${r}-l2.png`, njPlan.cellBiomes[key]);
}

console.log(`\nkey-light asymmetry, limit ${LIMIT}\n`);
console.log(`${"cell".padEnd(18)}${"note".padEnd(15)}${"water%".padStart(7)}`
  + `${"as-is".padStart(9)}${"alpha-safe".padStart(12)}${"drop".padStart(8)}   verdict`);
for (const r of rows) {
  const drop = r.asIs ? (1 - r.safe / r.asIs) : 0;
  const v = `${r.asIs < LIMIT ? "pass" : "FAIL"} -> ${r.safe < LIMIT ? "pass" : "FAIL"}`;
  console.log(`${r.label.padEnd(18)}${String(r.note).slice(0, 14).padEnd(15)}`
    + `${(r.waterFrac * 100).toFixed(1).padStart(7)}`
    + `${r.asIs.toFixed(4).padStart(9)}${r.safe.toFixed(4).padStart(12)}`
    + `${(drop * 100).toFixed(0).padStart(7)}%   ${v}`);
}

const flips = rows.filter((r) => r.asIs >= LIMIT && r.safe < LIMIT);
const njRows = rows.filter((r) => r.label.startsWith("ninjaone"));
const njMoved = njRows.filter((r) => r.asIs >= LIMIT !== (r.safe >= LIMIT));
console.log(`\n${flips.length} cell(s) refused by the gate pass once the water cut is excluded:`);
for (const r of flips) console.log(`  ${r.label}  ${r.asIs.toFixed(4)} -> ${r.safe.toFixed(4)}  (${(r.waterFrac * 100).toFixed(0)}% water)`);
console.log(`${njMoved.length} of ${njRows.length} accepted NinjaOne cells change verdict — if that is 0, the`);
console.log(`alpha-safe reading agrees with the owner's eye everywhere it was already tested.`);
