// A verbatim port of the pipeline's seam geometry (cell.mjs: edgeSeed, tabProfile,
// cornerJitter, makeSeam) plus its feathered weight mask, so previews and seam
// measurements use the boundary the stitch actually uses. Deterministic from
// coordinates alone; checked against the stitched tiles by seam-edge2.mjs --control.
import sharp from "sharp"; import fs from "node:fs"; import path from "node:path";
export const CELL_PX = 2048, BLEED = 256, GEN_PX = 2560, TILE = 256, TAB_CORNER = 64, TAB_WIGGLE = 64, FEATHER = 8;
export const TAB_REACH = TAB_CORNER + TAB_WIGGLE + FEATHER * 4;
export const TILES = "public/career-world/layers/terrain/authority/tiles/l2-ninjaone-r1/L0";
export const LEDGER = "public/career-world/layers/terrain/authority/manifests/terrain-l2-ninjaone-r1.json";
function edgeSeed(a, b) {
  const [x, y] = a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]) ? [a, b] : [b, a];
  let h = 2166136261;
  for (const v of [x[0], x[1], y[0], y[1]]) { h ^= v + 0x9e3779b9; h = Math.imul(h, 16777619) >>> 0; }
  return h;
}
function tabProfile(seed, length, amplitude) {
  let s = seed >>> 0;
  const rnd = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32;
  const ctrl = Array.from({ length: 5 }, () => (rnd() - 0.5) * 2 * amplitude);
  return (t) => { const f = t * (ctrl.length - 1); const i = Math.min(ctrl.length - 2, Math.floor(f)); let u = f - i; u = u * u * (3 - 2 * u); return ctrl[i] * (1 - u) + ctrl[i + 1] * u; };
}
const smooth01 = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const taper = (t) => smooth01(t / 0.15) * smooth01((1 - t) / 0.15);
function cornerJitter(i, j) {
  let s = edgeSeed([i, j], [i, j]) >>> 0;
  const rnd = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32;
  return [(rnd() - 0.5) * 2 * TAB_CORNER, (rnd() - 0.5) * 2 * TAB_CORNER];
}
export function makeSeam(COLS, ROWS) {
  const jitter = new Map();
  const J = (i, j) => { const k = `${i},${j}`; if (!jitter.has(k)) jitter.set(k, cornerJitter(i, j)); return jitter.get(k); };
  const wiggles = new Map();
  const wiggle = (a, b) => { const k = `${a};${b}`; if (!wiggles.has(k)) wiggles.set(k, tabProfile(edgeSeed(a, b), CELL_PX, TAB_WIGGLE)); return wiggles.get(k); };
  function vOffset(b, y) {
    const rr = Math.min(ROWS - 1, Math.max(0, Math.floor(y / CELL_PX)));
    const t = Math.min(1, Math.max(0, (y - rr * CELL_PX) / CELL_PX));
    const base = J(b, rr)[0] * (1 - smooth01(t)) + J(b, rr + 1)[0] * smooth01(t);
    return base + wiggle([b - 1, rr], [b, rr])(t) * taper(t);
  }
  function hOffset(b, x) {
    const cc = Math.min(COLS - 1, Math.max(0, Math.floor(x / CELL_PX)));
    const t = Math.min(1, Math.max(0, (x - cc * CELL_PX) / CELL_PX));
    const base = J(cc, b)[1] * (1 - smooth01(t)) + J(cc + 1, b)[1] * smooth01(t);
    return base + wiggle([cc, b - 1], [cc, b])(t) * taper(t);
  }
  function owner(x, y) {
    let c = Math.min(COLS - 1, Math.max(0, Math.floor(x / CELL_PX)));
    let r = Math.min(ROWS - 1, Math.max(0, Math.floor(y / CELL_PX)));
    if (c > 0 && x - c * CELL_PX <= TAB_REACH) { if (x < c * CELL_PX + vOffset(c, y)) c -= 1; }
    else if (c + 1 < COLS && (c + 1) * CELL_PX - x <= TAB_REACH) { if (x >= (c + 1) * CELL_PX + vOffset(c + 1, y)) c += 1; }
    if (r > 0 && y - r * CELL_PX <= TAB_REACH) { if (y < r * CELL_PX + hOffset(r, x)) r -= 1; }
    else if (r + 1 < ROWS && (r + 1) * CELL_PX - y <= TAB_REACH) { if (y >= (r + 1) * CELL_PX + hOffset(r + 1, x)) r += 1; }
    return `c${c}-${r}`;
  }
  return { owner, vOffset, hOffset, COLS, ROWS };
}
export function authoredSet() {
  const m = JSON.parse(fs.readFileSync(LEDGER, "utf8"));
  const cells = m.cells || [];
  return new Set(Array.isArray(cells) ? cells.map((c) => c.id || c) : Object.keys(cells));
}
// the world's L0 tiles over a window, RGBA raw
export async function worldWindow(x0, y0, w, h) {
  const comps = [];
  for (const f of fs.readdirSync(TILES)) {
    const [tx, ty] = f.replace(".webp", "").split("-").map(Number); const px = tx * TILE, py = ty * TILE;
    if (px >= x0 + w || py >= y0 + h || px + TILE <= x0 || py + TILE <= y0) continue;
    comps.push({ input: path.join(TILES, f), left: px - x0, top: py - y0 });
  }
  return sharp({ create: { width: w, height: h, channels: 4, background: { r: 70, g: 70, b: 70, alpha: 1 } } }).composite(comps).ensureAlpha().raw().toBuffer();
}
function boxBlur(mask, W, H, R) {
  const w = 2 * R + 1; const tmp = new Float32Array(W * H);
  for (let v = 0; v < H; v++) { let acc = 0; for (let u = -R; u <= R; u++) acc += mask[v * W + Math.min(W - 1, Math.max(0, u))];
    for (let u = 0; u < W; u++) { tmp[v * W + u] = acc / w; const add = Math.min(W - 1, u + R + 1), sub = Math.max(0, u - R); acc += mask[v * W + add] - mask[v * W + sub]; } }
  const dst = new Float32Array(W * H);
  for (let u = 0; u < W; u++) { let acc = 0; for (let v = -R; v <= R; v++) acc += tmp[Math.min(H - 1, Math.max(0, v)) * W + u];
    for (let v = 0; v < H; v++) { dst[v * W + u] = acc / w; const add = Math.min(H - 1, v + R + 1), sub = Math.max(0, v - R); acc += tmp[add * W + u] - tmp[sub * W + u]; } }
  return dst;
}
// the pipeline's stitch of one candidate canvas over the world within a window:
// weight 1 where the seam gives the pixel to the cell (or to unauthored ground),
// 0 where an authored neighbour owns it, then two box passes of half-width 4
export async function stitchWindow(id, col, row, canvasPath, x0, y0, w, h, seam, authored) {
  const world = await worldWindow(x0, y0, w, h);
  const cx0 = col * CELL_PX - BLEED, cy0 = row * CELL_PX - BLEED;
  const canvas = await sharp(canvasPath).resize(GEN_PX, GEN_PX, { kernel: "lanczos3" }).ensureAlpha().raw().toBuffer();
  let mask = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const X = x0 + x, Y = y0 + y; if (X < cx0 || X >= cx0 + GEN_PX || Y < cy0 || Y >= cy0 + GEN_PX) continue;
    const own = seam.owner(X + 0.5, Y + 0.5); mask[y * w + x] = own === id || !authored.has(own) ? 1 : 0;
  }
  mask = boxBlur(boxBlur(mask, w, h, FEATHER / 2), w, h, FEATHER / 2);
  const out = Buffer.from(world);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const X = x0 + x, Y = y0 + y; if (X < cx0 || X >= cx0 + GEN_PX || Y < cy0 || Y >= cy0 + GEN_PX) continue;
    const m = mask[y * w + x]; if (m <= 0) continue;
    const o = (y * w + x) * 4, c = ((Y - cy0) * GEN_PX + (X - cx0)) * 4;
    for (let k = 0; k < 3; k++) out[o + k] = Math.round(m * canvas[c + k] + (1 - m) * world[o + k]);
    out[o + 3] = 255;
  }
  return { out, world, mask };
}
