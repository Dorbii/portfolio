// Look at what is separable around the known defect before choosing a detector.
// Four panels over the same crop: paint, hue-vegetation mask, locally-dark
// mask, and the distance transform of the hue mask.
import sharp from "sharp"; import fs from "node:fs"; import path from "node:path";
sharp.cache(false);
const TILES = "public/career-world/layers/terrain/authority/tiles/l2-ninjaone-r1/L0", TILE = 256;
const OUT = ".codex-tmp/session3/review";
const x0 = 6180, y0 = 5060, W = 760, H = 800;
const ax0 = Math.floor(x0 / TILE) * TILE, ay0 = Math.floor(y0 / TILE) * TILE;
const ax1 = Math.ceil((x0 + W) / TILE) * TILE, ay1 = Math.ceil((y0 + H) / TILE) * TILE;
const comps = [];
for (const f of fs.readdirSync(TILES)) { const [tx, ty] = f.replace(".webp", "").split("-").map(Number); const px = tx * TILE, py = ty * TILE; if (px >= ax1 || py >= ay1 || px + TILE <= ax0 || py + TILE <= ay0) continue; comps.push({ input: path.join(TILES, f), left: px - ax0, top: py - ay0 }); }
const base = await sharp({ create: { width: ax1 - ax0, height: ay1 - ay0, channels: 4, background: { r: 24, g: 28, b: 32, alpha: 1 } } }).composite(comps).png().toBuffer();
const { data } = await sharp(base).extract({ left: x0 - ax0, top: y0 - ay0, width: W, height: H }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const lum = new Float32Array(W * H), hueVeg = new Uint8Array(W * H);
for (let o = 0; o < W * H; o++) {
  const i = o * 4, r = data[i], g = data[i + 1], b = data[i + 2];
  lum[o] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  if (mx && (mx - mn) / mx >= 0.12) {
    let h; if (mx === r) h = 60 * (((g - b) / (mx - mn)) % 6); else if (mx === g) h = 60 * ((b - r) / (mx - mn) + 2); else h = 60 * ((r - g) / (mx - mn) + 4);
    if (h < 0) h += 360; if (h >= 55 && h <= 185) hueVeg[o] = 1;
  }
}
function maxFilter(src, r) {
  const t = new Float32Array(W * H), o2 = new Float32Array(W * H);
  for (let y = 0; y < H; y++) { const o = y * W; for (let x = 0; x < W; x++) { let m = 0; for (let i = Math.max(0, x - r); i <= Math.min(W - 1, x + r); i++) if (src[o + i] > m) m = src[o + i]; t[o + x] = m; } }
  for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) { let m = 0; for (let i = Math.max(0, y - r); i <= Math.min(H - 1, y + r); i++) { const v = t[i * W + x]; if (v > m) m = v; } o2[y * W + x] = m; }
  return o2;
}
const ground = maxFilter(lum, 240);
const dark = new Uint8Array(W * H);
for (let o = 0; o < W * H; o++) if (hueVeg[o] && ground[o] - lum[o] >= 26) dark[o] = 1;
// chamfer distance transform of the hue mask, just to see the shape
const d = new Float32Array(W * H).fill(1e9);
for (let o = 0; o < W * H; o++) if (!hueVeg[o]) d[o] = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const o = y * W + x; if (!hueVeg[o]) continue;
  let m = d[o]; if (x) m = Math.min(m, d[o - 1] + 1); if (y) m = Math.min(m, d[o - W] + 1);
  if (x && y) m = Math.min(m, d[o - W - 1] + 1.414); if (x < W - 1 && y) m = Math.min(m, d[o - W + 1] + 1.414); d[o] = m; }
for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const o = y * W + x; if (!hueVeg[o]) continue;
  let m = d[o]; if (x < W - 1) m = Math.min(m, d[o + 1] + 1); if (y < H - 1) m = Math.min(m, d[o + W] + 1);
  if (x < W - 1 && y < H - 1) m = Math.min(m, d[o + W + 1] + 1.414); if (x && y < H - 1) m = Math.min(m, d[o + W - 1] + 1.414); d[o] = m; }
let dmax = 0; for (let o = 0; o < W * H; o++) if (d[o] < 1e8 && d[o] > dmax) dmax = d[o];
const mk = (fn) => { const buf = Buffer.alloc(W * H * 4); for (let o = 0; o < W * H; o++) { const [r, g, b] = fn(o); const i = o * 4; buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = 255; } return sharp(buf, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer(); };
const pHue = await mk((o) => hueVeg[o] ? [255, 0, 220] : [18, 18, 18]);
const pDark = await mk((o) => dark[o] ? [80, 255, 120] : [18, 18, 18]);
const pDt = await mk((o) => { if (!hueVeg[o]) return [18, 18, 18]; const t = Math.min(1, d[o] / dmax); return [Math.round(255 * t), Math.round(80 + 120 * t), Math.round(255 * (1 - t))]; });
const PAD = 6, LBL = 26, SW = 4 * (W + PAD) + PAD, SH = PAD + LBL + H + PAD + 30;
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SW}" height="${SH}">`;
const labs = ["paint", "hue vegetation mask", "locally-dark mask (what the detector used)", `distance transform of the hue mask (max ${dmax.toFixed(0)} px)`];
for (let i = 0; i < 4; i++) svg += `<text x="${PAD + i * (W + PAD)}" y="${PAD + 18}" font-family="Segoe UI, Arial" font-size="16" font-weight="bold" fill="#fff">${labs[i]}</text>`;
svg += `<text x="${PAD}" y="${SH - 9}" font-family="Segoe UI, Arial" font-size="17" fill="#fff">3,2 around the oversized crown. The tree is LIGHTER than the forest behind it, so the locally-dark test cannot see it.</text></svg>`;
const orig = await sharp(data, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
await sharp({ create: { width: SW, height: SH, channels: 4, background: { r: 17, g: 17, b: 17, alpha: 1 } } })
  .composite([{ input: orig, left: PAD, top: PAD + LBL }, { input: pHue, left: PAD + (W + PAD), top: PAD + LBL },
    { input: pDark, left: PAD + 2 * (W + PAD), top: PAD + LBL }, { input: pDt, left: PAD + 3 * (W + PAD), top: PAD + LBL },
    { input: Buffer.from(svg), left: 0, top: 0 }]).png().toFile(`${OUT}/mask-look.png`);
console.log("wrote mask-look.png", SW, "x", SH, "| hue mask cover", (hueVeg.reduce((a, b) => a + b, 0) / (W * H) * 100).toFixed(1) + "%", "| dark mask cover", (dark.reduce((a, b) => a + b, 0) / (W * H) * 100).toFixed(1) + "%", "| DT max", dmax.toFixed(1), "px");
