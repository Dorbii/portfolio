// Where NinjaOne's authored block sits in a world made of cells.
//
// Owner ruling 2026-09-03: the AUTHORED GRID is authoritative. The
// segmentation and coastline are re-derived from it, not the reverse, and the
// grid expands as more territory is authored. So the world stops being an
// irregular painting that rectangles must fit into, and becomes a lattice of
// 97.6 m cells that territories are cut from.
//
// This draws the lattice over the current plane, with NinjaOne's 5 x 4 block
// at a proposed cell position, so the placement can be argued with by eye.
//
//   node docs/career-world/session3-tools/draw-lattice-placement.mjs [out.png] [col] [row]
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

const M = 0.4503, CELL_M = 97.6;
const PLANE_M = [3344 * M, 1882 * M];
const CELL = [CELL_M / PLANE_M[0], CELL_M / PLANE_M[1]];   // one cell, as a fraction
const COLS = PLANE_M[0] / CELL_M, ROWS = PLANE_M[1] / CELL_M;

const BLOCK_COL = Number(process.argv[3] ?? 3);
const BLOCK_ROW = Number(process.argv[4] ?? 1);

const S = 2, OW = W * S, OH = H * S;
const out = Buffer.alloc(OW * OH * 3);
for (let y = 0; y < H; y += 1) {
  for (let x = 0; x < W; x += 1) {
    const i = y * W + x, r4 = i * 4, a = relief.pixels[r4 + 3] / 255;
    let r, g, b;
    if (land.pixels[i] >= 128) {
      // the old art, desaturated: it is scenery here, not authority
      const L = Math.round((relief.pixels[r4] * 0.3 + relief.pixels[r4 + 1] * 0.6 + relief.pixels[r4 + 2] * 0.1) * a + 40 * (1 - a));
      r = Math.round(L * 0.85); g = Math.round(L * 0.88); b = Math.round(L * 0.78);
    } else { r = 20; g = 40; b = 64; }
    for (let sy = 0; sy < S; sy += 1) for (let sx = 0; sx < S; sx += 1) {
      const o = ((y * S + sy) * OW + x * S + sx) * 3; out[o] = r; out[o + 1] = g; out[o + 2] = b;
    }
  }
}
const px = (x, y, [r, g, b], alpha = 1) => {
  if (x < 0 || y < 0 || x >= OW || y >= OH) return;
  const o = (y * OW + x) * 3;
  out[o] = Math.round(out[o] * (1 - alpha) + r * alpha);
  out[o + 1] = Math.round(out[o + 1] * (1 - alpha) + g * alpha);
  out[o + 2] = Math.round(out[o + 2] * (1 - alpha) + b * alpha);
};
const vline = (x, y0, y1, c, t, a = 1) => { for (let y = y0; y <= y1; y += 1) for (let k = 0; k < t; k += 1) px(x + k, y, c, a); };
const hline = (y, x0, x1, c, t, a = 1) => { for (let x = x0; x <= x1; x += 1) for (let k = 0; k < t; k += 1) px(x, y + k, c, a); };

// the world lattice
const FAINT = [150, 170, 190];
for (let c = 0; c <= Math.ceil(COLS); c += 1) vline(Math.round(c * CELL[0] * OW), 0, OH - 1, FAINT, 1, 0.30);
for (let r = 0; r <= Math.ceil(ROWS); r += 1) hline(Math.round(r * CELL[1] * OH), 0, OW - 1, FAINT, 1, 0.30);

// NinjaOne's authored block
const bx = (c) => Math.round((BLOCK_COL + c) * CELL[0] * OW);
const by = (r) => Math.round((BLOCK_ROW + r) * CELL[1] * OH);
for (let c = 0; c <= 5; c += 1) vline(bx(c), by(0), by(4), c === 0 || c === 5 ? [255, 255, 255] : [210, 220, 230], c === 0 || c === 5 ? 5 : 2);
for (let r = 0; r <= 4; r += 1) hline(by(r), bx(0), bx(5), r === 0 || r === 4 ? [255, 255, 255] : [210, 220, 230], r === 0 || r === 4 ? 5 : 2);

// the edges the plan declares, drawn in the colour of what they open onto
const SEA = [86, 190, 232], LANDB = [140, 220, 130];
hline(by(4), bx(0), bx(2), SEA, 9);        // 0,3 + 1,3 south -> sound
hline(by(4), bx(2), bx(4), LANDB, 9);      // 2,3 + 3,3 south -> land border into Tanium
hline(by(4), bx(4), bx(5), SEA, 9);        // 4,3 south-east bay
vline(bx(0), by(2), by(4), SEA, 9);        // 0,2 + 0,3 sound-coast, west
vline(bx(5) - 8, by(1), by(3), SEA, 9);    // 4,1 + 4,2 coast-cliff, east

const SHELVES = [
  [2, 1, 0.45, 0.55, [246, 200, 62], 16],
  [4, 0, 0.4, 0.6, [126, 214, 126], 12],
  [0, 1, 0.55, 0.35, [126, 214, 126], 10],
  [1, 3, 0.5, 0.4, [126, 214, 126], 10],
  [4, 3, 0.45, 0.45, [214, 158, 240], 10],
];
for (const [c, r, ox, oy, colour, size] of SHELVES) {
  const cx = Math.round((BLOCK_COL + c + ox) * CELL[0] * OW);
  const cy = Math.round((BLOCK_ROW + r + oy) * CELL[1] * OH);
  for (let dy = -size; dy <= size; dy += 1) for (let dx = -size; dx <= size; dx += 1) {
    const d = dx * dx + dy * dy;
    if (d <= size * size) px(cx + dx, cy + dy, d > (size - 4) * (size - 4) ? colour : [30, 30, 30]);
  }
}

const outPath = process.argv[2] ?? "lattice-placement.png";
fs.writeFileSync(outPath, encodePng(OW, OH, out));
console.log(`wrote ${outPath}`);
console.log(`plane ${PLANE_M.map((v) => v.toFixed(0)).join(" x ")} m = ${COLS.toFixed(2)} x ${ROWS.toFixed(2)} cells  <- not integer`);
console.log(`NinjaOne block placed at cell [${BLOCK_COL}, ${BLOCK_ROW}], 5 x 4`);
console.log(`  world origin -> [${(BLOCK_COL * CELL[0]).toFixed(4)}, ${(BLOCK_ROW * CELL[1]).toFixed(4)}]`);
console.log(`  capital shelf -> [${((BLOCK_COL + 2.45) * CELL[0]).toFixed(4)}, ${((BLOCK_ROW + 1.55) * CELL[1]).toFixed(4)}]`);
console.log(`edges: BLUE = sea per plan.json, GREEN = land border into Tanium`);
console.log(`the old art is desaturated: it is scenery here, not authority`);
