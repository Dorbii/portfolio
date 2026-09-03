// The authored L2 grid, drawn at true post-reset size over the territory the
// world layout scopes for it.
//
// The areas agree almost exactly -- NinjaOne's land is 20.3 regions against a
// 21 budget, and the grid is 19.8. The SHAPES do not: the segmented territory
// is wide and short, the authored grid is compact and taller than the whole
// territory bounding box. That is the thing to look at.
//
//   node docs/career-world/session3-tools/draw-grid-vs-territory.mjs [out.png]
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
  return { width: w, height: h, channels: ch, pixels: out };
}
const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) { let c = n; for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
  return (buf) => { let c = -1; for (const b of buf) c = t[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; };
})();
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(CRC(body));
  return Buffer.concat([len, body, crc]);
};
function encodePng(w, h, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc(h * (w * 3 + 1));
  for (let y = 0; y < h; y += 1) { raw[y * (w * 3 + 1)] = 0; rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0)),
  ]);
}

const A = "public/career-world/layers/terrain/authority/";
const relief = decodePng(A + "textures/terrain-relief-r6.png");
const land = decodePng(A + "masks/world-land-mask-r3.png");
const W = land.width, H = land.height;
const svg = fs.readFileSync(A + "masks/territory-segmentation-r4.svg", "utf8");

function pathPoints(d) {
  const pts = []; let x = 0, y = 0;
  const re = /([MHVLZmhvlz])\s*(-?[\d.]+)?\s*(-?[\d.]+)?/g; let m;
  while ((m = re.exec(d)) !== null) {
    const [, cmd, a, b] = m;
    if (cmd === "M" || cmd === "L") { x = Number(a); y = Number(b); pts.push([x, y]); }
    else if (cmd === "H") { x = Number(a); pts.push([x, y]); }
    else if (cmd === "V") { y = Number(a); pts.push([x, y]); }
  }
  return pts;
}
function fill(pts) {
  const mask = new Uint8Array(W * H);
  for (let y = 0; y < H; y += 1) {
    const yc = y + 0.5, xs = [];
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i, i += 1) {
      const [x1, y1] = pts[j], [x2, y2] = pts[i];
      if ((y1 > yc) !== (y2 > yc)) xs.push(x1 + (yc - y1) / (y2 - y1) * (x2 - x1));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = Math.max(0, Math.ceil(xs[k] - 0.5)); x < Math.min(W, Math.ceil(xs[k + 1] - 0.5)); x += 1) mask[y * W + x] = 1;
    }
  }
  return mask;
}
const paths = new Map();
for (const m of svg.matchAll(/<path id="territory-([a-z-]+)"[^>]*?d="([^"]+)"/g)) paths.set(m[1], pathPoints(m[2]));
const nj = fill(paths.get("ninjaone"));
const isLand = (i) => land.pixels[i] >= 128;

// centroid of NinjaOne's land: a neutral starting point for the grid
let sx = 0, sy = 0, n = 0;
for (let y = 0; y < H; y += 1) {
  for (let x = 0; x < W; x += 1) { const i = y * W + x; if (nj[i] && isLand(i)) { sx += x; sy += y; n += 1; } }
}
const centroid = [sx / n / W, sy / n / H];

const M = 0.4503, PLANE_M = [3344 * M, 1882 * M], CELL_M = 97.6;
const GRID = [5 * CELL_M / PLANE_M[0], 4 * CELL_M / PLANE_M[1]];
const gridOrigin = [centroid[0] - GRID[0] / 2, centroid[1] - GRID[1] / 2];

// ---------------------------------------------------------------- composite
const S = 2, OW = W * S, OH = H * S;
const out = Buffer.alloc(OW * OH * 3);
for (let y = 0; y < H; y += 1) {
  for (let x = 0; x < W; x += 1) {
    const i = y * W + x, r4 = i * 4, a = relief.pixels[r4 + 3] / 255;
    let r, g, b;
    if (isLand(i)) {
      r = Math.round(relief.pixels[r4] * a + 26 * (1 - a));
      g = Math.round(relief.pixels[r4 + 1] * a + 42 * (1 - a));
      b = Math.round(relief.pixels[r4 + 2] * a + 58 * (1 - a));
      if (nj[i]) { r = Math.round(r * 0.72 + 113 * 0.28); g = Math.round(g * 0.72 + 183 * 0.28); b = Math.round(b * 0.72 + 211 * 0.28); }
    } else { r = 22; g = 46; b = 74; }
    for (let sy2 = 0; sy2 < S; sy2 += 1) {
      for (let sx2 = 0; sx2 < S; sx2 += 1) {
        const o = ((y * S + sy2) * OW + x * S + sx2) * 3;
        out[o] = r; out[o + 1] = g; out[o + 2] = b;
      }
    }
  }
}
const px = (x, y, [r, g, b]) => {
  if (x < 0 || y < 0 || x >= OW || y >= OH) return;
  const o = (y * OW + x) * 3; out[o] = r; out[o + 1] = g; out[o + 2] = b;
};
const line = (x0, y0, x1, y1, c, t = 2) => {
  if (x0 === x1) { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y += 1) for (let k = 0; k < t; k += 1) px(x0 + k, y, c); }
  else { for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x += 1) for (let k = 0; k < t; k += 1) px(x, y0 + k, c); }
};
const WHITE = [255, 255, 255], AMBER = [246, 200, 62], DOT = [40, 40, 40];

// the grid, with its 5 x 4 cells
const gx = (c) => Math.round((gridOrigin[0] + c / 5 * GRID[0]) * OW);
const gy = (r) => Math.round((gridOrigin[1] + r / 4 * GRID[1]) * OH);
for (let c = 0; c <= 5; c += 1) line(gx(c), gy(0), gx(c), gy(4), c === 0 || c === 5 ? WHITE : [200, 200, 200], c === 0 || c === 5 ? 4 : 2);
for (let r = 0; r <= 4; r += 1) line(gx(0), gy(r), gx(5), gy(r), r === 0 || r === 4 ? WHITE : [200, 200, 200], r === 0 || r === 4 ? 4 : 2);

// the shelves the plan declares, at their cell offsets
const SHELVES = [
  ["capital", 2, 1, 0.45, 0.55, AMBER, 14],
  ["kaizen", 4, 0, 0.4, 0.6, [126, 214, 126], 11],
  ["metrics-service", 0, 1, 0.55, 0.35, [126, 214, 126], 9],
  ["vendy", 1, 3, 0.5, 0.4, [126, 214, 126], 9],
  ["construction", 4, 3, 0.45, 0.45, [214, 158, 240], 9],
];
for (const [, c, r, ox, oy, colour, size] of SHELVES) {
  const cx = Math.round((gridOrigin[0] + (c + ox) / 5 * GRID[0]) * OW);
  const cy = Math.round((gridOrigin[1] + (r + oy) / 4 * GRID[1]) * OH);
  for (let dy = -size; dy <= size; dy += 1) {
    for (let dx = -size; dx <= size; dx += 1) {
      if (dx * dx + dy * dy <= size * size) px(cx + dx, cy + dy, dx * dx + dy * dy > (size - 3) * (size - 3) ? colour : DOT);
    }
  }
}

const outPath = process.argv[2] ?? "grid-vs-territory.png";
fs.writeFileSync(outPath, encodePng(OW, OH, out));
console.log(`wrote ${outPath}  (${OW} x ${OH})`);
console.log(`  BLUE TINT  ninjaone territory as segmented today  20.3 regions (budget 21)`);
console.log(`  WHITE      the authored 5 x 4 grid at true size   19.8 regions`);
console.log(`  dots       plan shelves: capital (amber), project cities, construction`);
console.log(`  grid centred on ninjaone's land centroid [${centroid.map((v) => v.toFixed(4)).join(", ")}]`);
console.log(`  grid origin would be [${gridOrigin.map((v) => v.toFixed(4)).join(", ")}]`);
