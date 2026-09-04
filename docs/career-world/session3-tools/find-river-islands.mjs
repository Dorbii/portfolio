// Find land left standing inside a watercourse.
//
// Owner on c0-1: "the river needs to cut out this tiny part. No regen please
// cause it looks good." So this is a MASK fix, not a rebake: find the land
// enclosed by water in the delivered water mask, add it, and re-derive.
//
// The pipeline already fills speckle holes up to 64 px during mask completion;
// anything bigger survives as an island in the river. This reports every one so
// the fix is aimed rather than guessed.
//
//   node docs/career-world/session3-tools/find-river-islands.mjs <territory> <cell>
import fs from "node:fs";
import sharp from "sharp";
sharp.cache(false);

const T = process.argv[2] || "tanium";
const ID = process.argv[3] || "c0-1";
const SRC = `art-source/career-world/l2-land/${T}/${ID}/${ID}-water.png`;
if (!fs.existsSync(SRC)) { console.error(`no water mask at ${SRC}`); process.exit(1); }

// The mask is white RGB with the shape in ALPHA. Reading any other channel
// gives a solid 255 and says the whole canvas is water.
const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
const wet = (i) => data[i * 4 + 3] >= 128;

// flood the DRY region from the canvas border: anything dry it cannot reach is
// enclosed by water
const seen = new Uint8Array(W * H);
const stack = [];
for (let x = 0; x < W; x += 1) { stack.push(x, x + (H - 1) * W); }
for (let y = 0; y < H; y += 1) { stack.push(y * W, y * W + W - 1); }
while (stack.length) {
  const i = stack.pop();
  if (seen[i] || wet(i)) continue;
  seen[i] = 1;
  const x = i % W, y = (i / W) | 0;
  if (x > 0) stack.push(i - 1);
  if (x < W - 1) stack.push(i + 1);
  if (y > 0) stack.push(i - W);
  if (y < H - 1) stack.push(i + W);
}

// what is left dry and unseen is an island
const island = new Uint8Array(W * H);
const found = [];
for (let i = 0; i < W * H; i += 1) {
  if (wet(i) || seen[i] || island[i]) continue;
  const q = [i]; const cells = [];
  island[i] = 1;
  while (q.length) {
    const j = q.pop(); cells.push(j);
    const x = j % W, y = (j / W) | 0;
    for (const k of [x > 0 ? j - 1 : -1, x < W - 1 ? j + 1 : -1, y > 0 ? j - W : -1, y < H - 1 ? j + W : -1]) {
      if (k >= 0 && !island[k] && !wet(k) && !seen[k]) { island[k] = 1; q.push(k); }
    }
  }
  const xs = cells.map((j) => j % W), ys = cells.map((j) => (j / W) | 0);
  found.push({ n: cells.length, x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys), cells });
}

const KEPT = 2048, bleed = Math.round((W - KEPT) / 2);
const M = 0.4503, ART = 9.45;                        // metres per art px
found.sort((a, b) => b.n - a.n);
console.log(`${ID}: ${found.length} patch(es) of land enclosed by water\n`);
for (const f of found) {
  const m2 = f.n * (M / ART) ** 2;
  console.log(`  ${String(f.n).padStart(7)} px  ${m2.toFixed(1).padStart(7)} m²   `
    + `kept-area x ${f.x0 - bleed}..${f.x1 - bleed}, y ${f.y0 - bleed}..${f.y1 - bleed}`
    + `${f.n <= 64 ? "   (the pipeline fills these already)" : ""}`);
}
if (!found.length) console.log("  none — nothing is standing in the water");

if (process.argv.includes("--fill")) {
  const min = Number(process.argv[process.argv.indexOf("--fill") + 1] ?? 0);
  const out = Buffer.from(data);
  let filled = 0, patches = 0;
  for (const f of found) {
    if (f.n < min) continue;
    patches += 1;
    for (const j of f.cells) { out[j * 4 + 3] = 255; filled += 1; }
  }
  const dest = SRC.replace(/\.png$/, "");
  fs.copyFileSync(SRC, `${dest}-before-island-fill.png`);
  await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toFile(SRC);
  console.log(`\nfilled ${patches} patch(es), ${filled} px, into ${SRC}`);
  console.log(`the original is kept at ${dest}-before-island-fill.png`);
  console.log(`now: node tools/world-authoring/cell.mjs --territory ${T} --cell ${ID.slice(1).replace("-", ",")} --redo --force --describe-file art-source/career-world/l2-land/${T}/briefs/${ID}.md`);
}
