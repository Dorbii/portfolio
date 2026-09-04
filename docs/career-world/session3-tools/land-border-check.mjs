// Does NinjaOne's south edge actually deliver the land border it was ruled to?
//
// The owner ruled on 2026-09-01 that NinjaOne and Tanium share BOTH border
// types: a sound under local cells 0,3 and 1,3, solid connecting LAND under
// 2,3 and 3,3 ("terrain must run to the south edge as solid connecting ground,
// no coast"), and a bay at 4,3. Tanium's plan is written against that.
//
// A ruling in a packet is not evidence that the bake obeyed it. This measures
// the LIVE land mask along the shared lattice line, column by column, and says
// how wide the isthmus actually is -- because if that edge is not solid, the
// two territories do not form one island however the plan reads.
//
//   node docs/career-world/session3-tools/land-border-check.mjs
import fs from "node:fs";
import zlib from "node:zlib";

function decodeGrey(p) {
  const b = fs.readFileSync(p);
  const w = b.readUInt32BE(16), h = b.readUInt32BE(20);
  if (b[25] !== 0) throw new Error(`${p} must be greyscale`);
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
const L2 = "art-source/career-world/l2-land/";
const mask = decodeGrey(R + "layers/terrain/authority/masks/world-land-mask-r5.png");
const land = (x, y) => x >= 0 && y >= 0 && x < mask.width && y < mask.height
  && mask.pixels[y * mask.width + x] >= 128;

const nj = JSON.parse(fs.readFileSync(`${L2}ninjaone/territory.def.json`, "utf8"));
const tn = JSON.parse(fs.readFileSync(`${L2}tanium/territory.def.json`, "utf8"));
const COLS = 16, ROWS = 9, M = 0.4503, PLANE = [3472, 1953];

// the lattice row where NinjaOne ends and Tanium begins
const shared = nj.lattice.block[1] + nj.grid.rows;
if (tn.lattice.block[1] !== shared) {
  throw new Error(`the blocks are not adjacent: NinjaOne ends at row ${shared}, Tanium starts at ${tn.lattice.block[1]}`);
}
console.log(`shared lattice line: world row ${shared} (NinjaOne rows ${nj.lattice.block[1]}..${shared - 1}, `
  + `Tanium rows ${shared}..${shared + tn.grid.rows - 1})\n`);

// The ruling, read from NinjaOne's side, in world columns
const RULED = {}; // world col -> what the owner ruled
const kinds = ["sound", "sound", "land", "land", "bay"];
for (let i = 0; i < nj.grid.cols; i += 1) RULED[nj.lattice.block[0] + i] = kinds[i];

// Sample the mask on the last row of pixels inside NinjaOne, at the shared line.
const rowY = Math.floor((shared / ROWS) * mask.height) - 1;
const perWorldPx = PLANE[0] / mask.width;
console.log(`world col   ruled     mask row ${rowY}: land px of ${Math.round(mask.width / COLS)}   metres`);
let isthmus = 0, ruledLandDry = 0, ruledLandTotal = 0;
const strip = [];
for (let c = 0; c < COLS; c += 1) {
  const x0 = Math.floor((c / COLS) * mask.width), x1 = Math.floor(((c + 1) / COLS) * mask.width);
  let n = 0;
  for (let x = x0; x < x1; x += 1) if (land(x, rowY)) n += 1;
  const metres = n * perWorldPx * M;
  strip.push({ c, n, metres, span: x1 - x0 });
  const ruled = RULED[c] ?? (c >= tn.lattice.block[0] && c < tn.lattice.block[0] + tn.grid.cols ? "(no NinjaOne above)" : "");
  if (!ruled && !n) continue;
  console.log(`  ${String(c).padStart(2)}        ${String(ruled).padEnd(20)} ${String(n).padStart(4)} / ${x1 - x0}   ${metres.toFixed(0).padStart(4)} m`);
  if (ruled === "land") { ruledLandTotal += x1 - x0; ruledLandDry += n; }
  isthmus += n;
}

console.log(`\nthe ruled LAND columns are ${ruledLandDry} of ${ruledLandTotal} px solid `
  + `(${(100 * ruledLandDry / Math.max(1, ruledLandTotal)).toFixed(1)}%)`);
console.log(`total land on the shared line: ${isthmus} px = ${(isthmus * perWorldPx * M).toFixed(0)} m`);

// What decides "one island" is CONNECTIVITY, not a percentage. 202 of 208 px
// solid says nothing about whether those pixels are in one piece, and a
// percentage gate set by eye (98% here) fails on six pixels of stream while a
// genuinely severed border at 97% would pass. So: list the runs.
const runs = [];
let run = 0, at = 0;
for (let x = 0; x <= mask.width; x += 1) {
  if (x < mask.width && land(x, rowY)) { if (run === 0) at = x; run += 1; }
  else if (run) { runs.push({ at, len: run }); run = 0; }
}
const col = (x) => (x / mask.width * COLS);
console.log(`\nunbroken land runs along the shared line, west to east:`);
for (const r of runs) {
  console.log(`  ${String(r.len).padStart(4)} px = ${(r.len * perWorldPx * M).toFixed(0).padStart(4)} m   `
    + `world cols ${col(r.at).toFixed(2)}..${col(r.at + r.len).toFixed(2)}`);
}
const gaps = runs.slice(1).map((r, i) => ({
  at: runs[i].at + runs[i].len,
  len: r.at - (runs[i].at + runs[i].len),
}));
if (gaps.length) {
  console.log(`gaps between them:`);
  for (const g of gaps) {
    console.log(`  ${String(g.len).padStart(4)} px = ${(g.len * perWorldPx * M).toFixed(1).padStart(5)} m   `
      + `at world col ${col(g.at).toFixed(2)}`
      + `   ${g.len * perWorldPx * M < 15 ? "-- a watercourse, not a channel" : "-- WIDE ENOUGH TO SEVER"}`);
  }
}

// A land border exists if one unbroken run at least a cell wide sits inside the
// columns the owner ruled as connecting ground.
const CELL_M = (PLANE[0] / COLS) * M;
const ruledCols = Object.entries(RULED).filter(([, k]) => k === "land").map(([c]) => Number(c));
const lo = Math.min(...ruledCols), hi = Math.max(...ruledCols) + 1;
const inside = runs.filter((r) => col(r.at + r.len) > lo && col(r.at) < hi);
const widest = inside.reduce((m, r) => Math.max(m, r.len), 0);
const widestM = widest * perWorldPx * M;
console.log(`\nwidest unbroken run inside the ruled land columns ${lo}..${hi - 1}: `
  + `${widestM.toFixed(0)} m  (one cell is ${CELL_M.toFixed(0)} m)`);

const joined = widestM >= CELL_M;
console.log(`\n${joined ? "PASS" : "FAIL"}  NinjaOne's south edge ${joined ? "carries" : "does NOT carry"} `
  + `a land border at least a cell wide, so the two territories `
  + `${joined ? "join into one island across it" : "do not join"}.`);
console.log(`      Tanium's own art must meet it: rules.northBorder requires solid`);
console.log(`      connecting ground on the same columns, no coast.`);
process.exit(joined ? 0 : 1);
