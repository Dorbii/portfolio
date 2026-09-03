// Draw where the capital envelope landed, on the terrain it landed on.
//
// The land-coverage number (0.552 against 0.700) is hard to argue with in
// prose. This renders it: the world relief, the envelope before and after the
// scale reset, and every sea pixel inside the new envelope tinted red.
//
//   node docs/career-world/session3-tools/draw-envelope-coverage.mjs [out.png]
import fs from "node:fs";
import zlib from "node:zlib";

// ------------------------------------------------------------------ png io
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
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return (buf) => {
    let c = -1;
    for (const byte of buf) c = t[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  };
})();
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(CRC(body));
  return Buffer.concat([len, body, crc]);
}
function encodePng(w, h, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit truecolour
  const raw = Buffer.alloc(h * (w * 3 + 1));
  for (let y = 0; y < h; y += 1) {
    raw[y * (w * 3 + 1)] = 0;
    rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ----------------------------------------------------------------- sources
const A = "public/career-world/layers/terrain/authority/";
const relief = decodePng(A + "textures/terrain-relief-r6.png");
const land = decodePng(A + "masks/world-land-mask-r3.png");
const W = land.width, H = land.height;

const BEFORE = { origin: [0.125, 0], span: [0.25, 1 / 3], anchor: [0.295, 0.23827] };
const NEW_SPAN = [0.125, 1 / 6];
// Halving the span fixes the envelope's SIZE. Which point it shrinks toward is
// a separate, unstated choice -- and it is the whole difference between 0.552
// and 0.846. Candidates, all the same size:
const CENTRE = [0.125 + 0.25 / 2, (1 / 3) / 2];
const CANDIDATES = [
  { key: "A", label: "pin top-left origin (applied)", colour: [214, 74, 80],
    origin: [0.125, 0] },
  { key: "B", label: "pin centre", colour: [126, 214, 126],
    origin: [CENTRE[0] - NEW_SPAN[0] / 2, CENTRE[1] - NEW_SPAN[1] / 2] },
  { key: "C", label: "pin bottom-left", colour: [214, 158, 240],
    origin: [0.125, 1 / 3 - NEW_SPAN[1]] },
  { key: "D", label: "pin capitalAnchor where it is", colour: [255, 255, 255],
    origin: [0.295 - NEW_SPAN[0] * (0.295 - 0.125) / 0.25, 0.23827 - NEW_SPAN[1] * 0.23827 / (1 / 3)] },
];
const AFTER = { origin: [0.125, 0], span: NEW_SPAN, anchor: [0.21, 0.119135] };

// --------------------------------------------------------------- compositing
// Sea reads as a flat blue so the coastline is unambiguous; relief supplies the
// land. Everything below is drawn at 2x so the envelope edges are legible.
const SCALE = 2;
const OW = W * SCALE, OH = H * SCALE;
const out = Buffer.alloc(OW * OH * 3);
const isLand = (x, y) => land.pixels[y * W + x] >= 128;

for (let y = 0; y < H; y += 1) {
  for (let x = 0; x < W; x += 1) {
    const r4 = (y * W + x) * 4;
    const a = relief.pixels[r4 + 3] / 255;
    let r, g, b;
    if (isLand(x, y)) {
      r = Math.round(relief.pixels[r4] * a + 26 * (1 - a));
      g = Math.round(relief.pixels[r4 + 1] * a + 42 * (1 - a));
      b = Math.round(relief.pixels[r4 + 2] * a + 58 * (1 - a));
    } else {
      r = 22; g = 46; b = 74;                       // sea
    }
    // Sea inside the NEW envelope is the finding: tint it red.
    const nx = x / W, ny = y / H;
    const inAfter = nx >= AFTER.origin[0] && nx < AFTER.origin[0] + AFTER.span[0]
      && ny >= AFTER.origin[1] && ny < AFTER.origin[1] + AFTER.span[1];
    if (inAfter && !isLand(x, y)) { r = 168; g = 38; b = 44; }
    for (let sy = 0; sy < SCALE; sy += 1) {
      for (let sx = 0; sx < SCALE; sx += 1) {
        const o = ((y * SCALE + sy) * OW + x * SCALE + sx) * 3;
        out[o] = r; out[o + 1] = g; out[o + 2] = b;
      }
    }
  }
}

// ------------------------------------------------------------------ drawing
const px = (x, y, [r, g, b]) => {
  if (x < 0 || y < 0 || x >= OW || y >= OH) return;
  const o = (y * OW + x) * 3;
  out[o] = r; out[o + 1] = g; out[o + 2] = b;
};
function rect(view, colour, thickness) {
  const x0 = Math.round(view.origin[0] * OW), y0 = Math.round(view.origin[1] * OH);
  const x1 = Math.round((view.origin[0] + view.span[0]) * OW);
  const y1 = Math.round((view.origin[1] + view.span[1]) * OH);
  for (let t = 0; t < thickness; t += 1) {
    for (let x = x0; x <= x1; x += 1) { px(x, y0 + t, colour); px(x, y1 - t, colour); }
    for (let y = y0; y <= y1; y += 1) { px(x0 + t, y, colour); px(x1 - t, y, colour); }
  }
}
function cross(p, colour, size) {
  const cx = Math.round(p[0] * OW), cy = Math.round(p[1] * OH);
  for (let d = -size; d <= size; d += 1) {
    for (let t = -1; t <= 1; t += 1) { px(cx + d, cy + t, colour); px(cx + t, cy + d, colour); }
  }
}

const YELLOW = [246, 200, 62];   // before
rect(BEFORE, YELLOW, 4);
cross(BEFORE.anchor, YELLOW, 10);
for (const c of CANDIDATES) rect({ origin: c.origin, span: NEW_SPAN }, c.colour, 4);

// --------------------------------------------------------------- the numbers
function coverage(view) {
  let l = 0, t = 0;
  for (let y = Math.floor(view.origin[1] * H); y < Math.ceil((view.origin[1] + view.span[1]) * H); y += 1) {
    for (let x = Math.floor(view.origin[0] * W); x < Math.ceil((view.origin[0] + view.span[0]) * W); x += 1) {
      l += isLand(x, y) ? 1 : 0; t += 1;
    }
  }
  return l / t;
}
// Crop to the capital's quadrant so the candidates are legible.
const CROP = [0.05, 0, 0.42, 0.42];
const cx0 = Math.round(CROP[0] * OW), cy0 = Math.round(CROP[1] * OH);
const cw = Math.round(CROP[2] * OW), chh = Math.round(CROP[3] * OH);
const crop = Buffer.alloc(cw * chh * 3);
for (let y = 0; y < chh; y += 1) {
  out.copy(crop, y * cw * 3, ((cy0 + y) * OW + cx0) * 3, ((cy0 + y) * OW + cx0 + cw) * 3);
}

const outPath = process.argv[2] ?? "envelope-coverage.png";
fs.writeFileSync(outPath, encodePng(cw, chh, crop));
console.log(`wrote ${outPath}  (${cw} x ${chh})`);
console.log(`  YELLOW  envelope BEFORE the reset  land coverage ${coverage(BEFORE).toFixed(3)}`);
console.log(`  RED FILL  sea inside candidate A - the 44.8% that fails the 0.700 gate
`);
for (const c of CANDIDATES) {
  const cov = coverage({ origin: c.origin, span: NEW_SPAN });
  console.log(
    `  ${c.key}  rgb(${c.colour.join(",")})`.padEnd(26)
    + `${c.label}`.padEnd(34)
    + `origin [${c.origin[0].toFixed(4)}, ${c.origin[1].toFixed(4)}]  `
    + `coverage ${cov.toFixed(3)} ${cov >= 0.7 ? "PASS" : "FAIL"}`,
  );
}
