// The NinjaOne/Tanium join, on the authored art.
//
// Draws the bottom of NinjaOne's block and the empty ground below it where
// Tanium will go, with the shared lattice line marked and every unbroken run
// of land along it measured. The point is to see whether the two territories
// actually meet as one island or only claim to in the plan.
//
//   node docs/career-world/session3-tools/draw-land-border.mjs
import fs from "node:fs";
import zlib from "node:zlib";
import sharp from "sharp";
sharp.cache(false);

const R = "public/career-world/";
const L2 = "art-source/career-world/l2-land/";
const OUT = "docs/career-world/session3-tools/land-border.png";

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
const mask = decodeGrey(R + "layers/terrain/authority/masks/world-land-mask-r5.png");
const nj = JSON.parse(fs.readFileSync(`${L2}ninjaone/territory.def.json`, "utf8"));
const tn = JSON.parse(fs.readFileSync(`${L2}tanium/territory.def.json`, "utf8"));

const COLS = 16, ROWS = 9, M = 0.4503, PLANE = [3472, 1953];
const SHARED = nj.lattice.block[1] + nj.grid.rows;
const perWorldPx = PLANE[0] / mask.width;

// runs along the shared line
const rowY = Math.floor((SHARED / ROWS) * mask.height) - 1;
const runs = [];
let run = 0, at = 0;
for (let x = 0; x <= mask.width; x += 1) {
  if (x < mask.width && mask.pixels[rowY * mask.width + x] >= 128) { if (run === 0) at = x; run += 1; }
  else if (run) { runs.push({ at, len: run }); run = 0; }
}

// view: cols 1.6 .. 9.4, rows 2.6 .. 6.4 of the lattice
const view = [1.6 / COLS, 2.6 / ROWS, 9.4 / COLS, 6.4 / ROWS];
const PLATE = R + "layers/terrain/authority/textures/world-land-detail-4x-r1.png";
const meta = await sharp(PLATE).metadata();
const sx = Math.round(view[0] * meta.width), sy = Math.round(view[1] * meta.height);
const sw = Math.round((view[2] - view[0]) * meta.width), sh = Math.round((view[3] - view[1]) * meta.height);
const SCALE = 1.5, W = Math.round(sw * SCALE), H = Math.round(sh * SCALE);
const X = (u) => ((u - view[0]) / (view[2] - view[0])) * W;
const Y = (v) => ((v - view[1]) / (view[3] - view[1])) * H;
const XC = (c) => X(c / COLS), YR = (r) => Y(r / ROWS);

const s = [];
for (let c = 0; c <= COLS; c += 1) {
  const x = XC(c);
  if (x >= -2 && x <= W + 2) s.push(`<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#7d8a95" stroke-width="1.2" opacity="0.5"/>`);
}
for (let r = 0; r <= ROWS; r += 1) {
  const y = YR(r);
  if (y >= -2 && y <= H + 2) s.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#7d8a95" stroke-width="1.2" opacity="0.5"/>`);
}
// the two blocks
const rect = (bx, by, bw, bh, col, dash) =>
  `<rect x="${XC(bx)}" y="${YR(by)}" width="${XC(bx + bw) - XC(bx)}" height="${YR(by + bh) - YR(by)}" `
  + `fill="none" stroke="${col}" stroke-width="3"${dash}/>`;
s.push(rect(nj.lattice.block[0], nj.lattice.block[1], nj.grid.cols, nj.grid.rows, "#8fe06a", ""));
s.push(rect(tn.lattice.block[0], tn.lattice.block[1], tn.grid.cols, tn.grid.rows, "#e0b64a", ` stroke-dasharray="10 7"`));

// the runs, drawn on the shared line
const yLine = YR(SHARED);
for (const r of runs) {
  const x0 = X(r.at / mask.width), x1 = X((r.at + r.len) / mask.width);
  if (x1 < 0 || x0 > W) continue;
  const m = r.len * perWorldPx * M;
  s.push(`<rect x="${x0}" y="${yLine - 7}" width="${x1 - x0}" height="14" fill="#5f7a2a" stroke="#b7f090" stroke-width="2"/>`);
  if (m > 40) s.push(`<text x="${(x0 + x1) / 2}" y="${yLine - 14}" fill="#cdf0a8" font-family="Georgia,serif" font-size="19" text-anchor="middle">${m.toFixed(0)} m</text>`);
}
// the gaps
for (let i = 1; i < runs.length; i += 1) {
  const gAt = runs[i - 1].at + runs[i - 1].len, gLen = runs[i].at - gAt;
  const x0 = X(gAt / mask.width), x1 = X((gAt + gLen) / mask.width);
  if (x1 < 0 || x0 > W) continue;
  const m = gLen * perWorldPx * M;
  s.push(`<circle cx="${(x0 + x1) / 2}" cy="${yLine}" r="16" fill="none" stroke="#6ec8ff" stroke-width="2.5"/>`);
  s.push(`<text x="${(x0 + x1) / 2}" y="${yLine + 44}" fill="#8fd4ff" font-family="Georgia,serif" font-size="17" text-anchor="middle">${m.toFixed(1)} m beck</text>`);
}
// the sound and the bay
const water = [
  { from: 1.6, to: runs[0] ? runs[0].at / mask.width * COLS : 4.4, label: "THE SOUND — ocean border, opens west" },
  { from: runs.length ? (runs[runs.length - 1].at + runs[runs.length - 1].len) / mask.width * COLS : 7.4, to: 9.4, label: "THE BAY — opens east" },
];
for (const w of water) {
  const x0 = XC(w.from), x1 = XC(w.to);
  s.push(`<rect x="${x0}" y="${yLine - 5}" width="${x1 - x0}" height="10" fill="#2e5566" stroke="#6ec8ff" stroke-width="1.5" opacity="0.9"/>`);
  s.push(`<text x="${(x0 + x1) / 2}" y="${yLine - 16}" fill="#8fd4ff" font-family="Georgia,serif" font-size="17" text-anchor="middle">${w.label}</text>`);
}

const total = runs.reduce((n, r) => n + r.len, 0) * perWorldPx * M;
const widest = Math.max(...runs.map((r) => r.len)) * perWorldPx * M;
s.push(`<rect x="0" y="0" width="${W}" height="96" fill="#0b1219" opacity="0.86"/>`);
s.push(`<text x="18" y="36" fill="#f0f5fa" font-family="Georgia,serif" font-size="27">The NinjaOne / Tanium join, measured on the authored art</text>`);
s.push(`<text x="18" y="66" fill="#b7f090" font-family="monospace" font-size="17">`
  + `${total.toFixed(0)} m of connecting ground on the shared line, widest unbroken run ${widest.toFixed(0)} m (a cell is 98 m)</text>`);
s.push(`<text x="18" y="88" fill="#9db0c2" font-family="monospace" font-size="17">`
  + `solid green = NinjaOne, authored    dashed gold = Tanium, planned    the empty ground below the line is where Tanium goes</text>`);

const art = await sharp(PLATE).extract({ left: sx, top: sy, width: sw, height: sh })
  .resize(W, H, { kernel: "lanczos3" }).png().toBuffer();
await sharp({ create: { width: W, height: H, channels: 4, background: { r: 13, g: 27, b: 38, alpha: 255 } } })
  .composite([
    { input: art, left: 0, top: 0 },
    { input: Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${s.join("")}</svg>`), left: 0, top: 0 },
  ]).png().toFile(OUT);
console.log(`wrote ${OUT}  ${W} x ${H}`);
console.log(`  ${runs.length} runs, ${total.toFixed(0)} m total, widest ${widest.toFixed(0)} m`);
