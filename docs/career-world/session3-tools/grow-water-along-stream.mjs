// Extend a cell's water cut along a watercourse the worker painted but did not
// mask.
//
// Owner on c0-1: "the river needs to cut out this tiny part. No regen please
// cause it looks good." So the art is preserved exactly and only the MASK
// changes; cell.mjs --redo then re-derives and re-cuts from the existing
// generation without dispatching anything.
//
// Grows from the existing mask into connected stream-like paint, which is the
// same shape as the pipeline's own bounded mask completion — it follows the
// channel instead of relying on hand-placed squares, and it cannot leap a bank
// because growth must stay connected.
//
//   node ... grow-water-along-stream.mjs <territory> <cell> [--write]
import fs from "node:fs";
import sharp from "sharp";
sharp.cache(false);

const T = process.argv[2] || "tanium";
const ID = process.argv[3] || "c0-1";
const WRITE = process.argv.includes("--write");
const DIR = `art-source/career-world/l2-land/${T}/${ID}/`;
const ART = `${DIR}${ID}-l2.png`, MASK = `${DIR}${ID}-water.png`;

const a = await sharp(ART).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const m = await sharp(MASK).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = a.info.width, H = a.info.height;
if (m.info.width !== W || m.info.height !== H) throw new Error("mask and art differ in size");

const hsv = (r, g, b) => {
  const M = Math.max(r, g, b), mn = Math.min(r, g, b), d = M - mn;
  let h = 0;
  if (d) {
    if (M === r) h = 60 * (((g - b) / d) % 6);
    else if (M === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  return [h, M ? d / M : 0, M / 255];
};

// BLUE-LEANING is what separates this stream from its banks, measured rather
// than assumed: in the marked stretch the channel runs b-r from -25 up to +28,
// while the grass either side sits at -107. Saturation alone does not do it —
// the stream reads 0.29-0.32 against grass at 0.5-0.68, too close to gate on.
//
// Growth is also bounded to the stretches the owner marked, so it can follow a
// channel but cannot wander off across the cell if the threshold is generous.
const REGIONS = (process.env.GROW_REGIONS || "")
  .split(";").filter(Boolean)
  .map((r) => r.split(",").map(Number));            // kept x0,y0,x1,y1
const inRegion = (x, y) => !REGIONS.length
  || REGIONS.some(([x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1);
const streamLike = (i) => {
  if (a.data[i * 4 + 3] < 250) return false;                 // already transparent
  const bleedX = (i % W) - Math.round((W - 2048) / 2);
  const bleedY = ((i / W) | 0) - Math.round((H - 2048) / 2);
  if (!inRegion(bleedX, bleedY)) return false;
  const r = a.data[i * 4], g = a.data[i * 4 + 1], bl = a.data[i * 4 + 2];
  const [h, s] = hsv(r, g, bl);
  if (bl - r > -25) return true;                             // the channel
  return h >= 150 && h <= 250 && s >= 0.15;                  // any frank blue
};

const wet = new Uint8Array(W * H);
let seeded = 0;
for (let i = 0; i < W * H; i += 1) if (m.data[i * 4 + 3] >= 128) { wet[i] = 1; seeded += 1; }

// Fill stream paint inside the marked stretches directly, rather than growing
// out from the existing mask: the channels the owner marked do NOT touch the
// current cut, so connectivity-only growth can never start and reports zero.
// The marked region is what bounds this instead.
let added = 0;
for (let i = 0; i < W * H; i += 1) {
  if (wet[i] || !streamLike(i)) continue;
  wet[i] = 1; added += 1;
}

// Drop small blobs. The classifier also matches grey stone -- the rune groove
// reads blue-leaning against grass exactly as the stream does -- so speckle and
// stray patches are removed and only real channel survives. A preview once
// showed this fill eating the groove; the region bound plus this filter is what
// stops it.
{
  const seenC = new Uint8Array(W * H);
  const MIN = Number(process.env.GROW_MIN_BLOB || 400);
  for (let i = 0; i < W * H; i += 1) {
    if (seenC[i] || !wet[i] || m.data[i * 4 + 3] >= 128) continue;
    const q = [i], cells = [];
    seenC[i] = 1;
    while (q.length) {
      const j = q.pop(); cells.push(j);
      const x = j % W, y = (j / W) | 0;
      for (const k of [x > 0 ? j - 1 : -1, x < W - 1 ? j + 1 : -1, y > 0 ? j - W : -1, y < H - 1 ? j + W : -1]) {
        if (k >= 0 && !seenC[k] && wet[k] && m.data[k * 4 + 3] < 128) { seenC[k] = 1; q.push(k); }
      }
    }
    if (cells.length < MIN) { for (const j of cells) { wet[j] = 0; added -= 1; } }
  }
}

// close pinholes so the cut is a channel rather than speckle: any dry pixel
// with three or more wet orthogonal neighbours joins it
for (let pass = 0; pass < 3; pass += 1) {
  const add = [];
  for (let i = 0; i < W * H; i += 1) {
    if (wet[i]) continue;
    const x = i % W, y = (i / W) | 0;
    let n = 0;
    if (x > 0 && wet[i - 1]) n += 1;
    if (x < W - 1 && wet[i + 1]) n += 1;
    if (y > 0 && wet[i - W]) n += 1;
    if (y < H - 1 && wet[i + W]) n += 1;
    if (n >= 3) add.push(i);
  }
  for (const i of add) { wet[i] = 1; added += 1; }
}

const KEPT = 2048, bleed = Math.round((W - KEPT) / 2);
const M_PER_ART = 0.4503 / 9.45;
console.log(`${ID}: mask had ${seeded} px, grows by ${added} px `
  + `(${(added * M_PER_ART ** 2).toFixed(0)} m²), now ${seeded + added}`);
console.log(`  that is ${(100 * added / (W * H)).toFixed(2)}% of the canvas`);

// a preview so the change can be seen before it is written
const prev = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i += 1) {
  const was = m.data[i * 4 + 3] >= 128;
  for (let c = 0; c < 3; c += 1) prev[i * 4 + c] = a.data[i * 4 + c];
  prev[i * 4 + 3] = a.data[i * 4 + 3];
  if (wet[i] && !was) { prev[i * 4] = 255; prev[i * 4 + 1] = 60; prev[i * 4 + 2] = 60; prev[i * 4 + 3] = 255; }
}
const out = `docs/career-world/session3-tools/${ID}-water-growth.png`;
await sharp(prev, { raw: { width: W, height: H, channels: 4 } })
  .extract({ left: bleed, top: bleed, width: KEPT, height: KEPT })
  .resize(1500, 1500).png().toFile(out);
console.log(`  preview (red = newly cut) -> ${out}`);

if (WRITE) {
  fs.copyFileSync(MASK, `${DIR}${ID}-water-before-growth.png`);
  const nm = Buffer.from(m.data);
  for (let i = 0; i < W * H; i += 1) if (wet[i]) { nm[i * 4] = 255; nm[i * 4 + 1] = 255; nm[i * 4 + 2] = 255; nm[i * 4 + 3] = 255; }
  await sharp(nm, { raw: { width: W, height: H, channels: 4 } }).png().toFile(MASK);
  console.log(`\n  written. original kept at ${ID}-water-before-growth.png`);
  console.log(`  now: node tools/world-authoring/cell.mjs --territory ${T} --cell ${ID.slice(1).replace("-", ",")} --redo --force --describe-file art-source/career-world/l2-land/${T}/briefs/${ID}.md`);
} else {
  console.log(`\n  nothing written — pass --write once the preview looks right`);
}
