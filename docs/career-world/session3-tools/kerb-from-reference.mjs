// The kerb element cut from the world's own kerb (the old c3-1's chain band,
// the one the owner accepted) instead of a new generation: the pale stones and
// the dark groove are keyed out of the meadow by colour (stone is pale and
// grey, the groove dark; grass is green or yellow and saturated), a clean
// segment between the rune panels is taken, and its ends are crossfaded so it
// tiles. Writes art-source/career-world/chain/kerb-element-r2.png (+ .json
// with the groove's anchor row) — a second candidate beside the generated r1.
//
//   node docs/career-world/session3-tools/kerb-from-reference.mjs [--band .codex-tmp/chain/c3-1-old-l2.png] [--x0 130] [--x1 1130]
import fs from "node:fs";
import sharp from "sharp";
sharp.cache(false);
const arg = (f, d) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : d; };
const BAND = arg("--band", ".codex-tmp/chain/c3-1-old-l2.png");
const X0 = Number(arg("--x0", 130)), X1 = Number(arg("--x1", 1130));   // a clean stretch of the old c3-1's kerb (meadow, no panels, no river)
const OUT = "art-source/career-world/chain";
const BL = 256, K = 2048;
// the band around the old c3-1's groove: 48.6% at the west edge to 54.1% at the east, ±60 px
const y0 = BL + Math.round(0.486 * K), y1 = BL + Math.round(0.541 * K);
const top = Math.min(y0, y1) - 60, h = Math.abs(y1 - y0) + 120;
const img = await sharp(BAND).extract({ left: BL + X0, top, width: X1 - X0, height: h }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = img.info.width, H = img.info.height, d = img.data;
// straighten: the groove drifts 5.5% over the cell — find the darkest row per column band and shear it level
const grooveAt = [];
for (let x = 0; x < W; x += 32) {
  let best = 0, bl = 999;
  for (let y = 0; y < H; y += 1) { let l = 0; for (let k = 0; k < 32 && x + k < W; k += 1) { const o = (y * W + x + k) * 4; l += 0.2126 * d[o] + 0.7152 * d[o + 1] + 0.0722 * d[o + 2]; } l /= Math.min(32, W - x); if (l < bl) { bl = l; best = y; } }
  grooveAt.push(best);
}
const gMid = grooveAt.reduce((s, v) => s + v, 0) / grooveAt.length;
const sheared = Buffer.alloc(W * H * 4);
for (let x = 0; x < W; x += 1) {
  const g = grooveAt[Math.min(grooveAt.length - 1, Math.floor(x / 32))], dy = Math.round(g - gMid);
  for (let y = 0; y < H; y += 1) { const sy = y + dy; if (sy < 0 || sy >= H) continue; const so = (sy * W + x) * 4, o = (y * W + x) * 4; for (let c = 0; c < 4; c += 1) sheared[o + c] = d[so + c]; }
}
// key: keep stone (pale, unsaturated) and the groove (dark), drop grass and soil
let kept = 0;
for (let p = 0; p < W * H; p += 1) {
  const o = p * 4, r = sheared[o], g = sheared[o + 1], b = sheared[o + 2];
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx ? (mx - mn) / mx : 0, luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const stone = sat < 0.22 && luma > 105, groove = luma < 60 && sat < 0.35;
  const y = Math.floor(p / W), nearGroove = Math.abs(y - gMid) < 30;   // the element is the kerb and its groove only
  const keep = nearGroove && (stone || groove);
  sheared[o + 3] = keep ? 255 : 0;
  if (keep) kept += 1;
}
// close small holes and soften the edge: a 3x3 majority, then a 1-px feather
const a0 = new Uint8Array(W * H); for (let p = 0; p < W * H; p += 1) a0[p] = sheared[p * 4 + 3] ? 1 : 0;
for (let y = 1; y < H - 1; y += 1) for (let x = 1; x < W - 1; x += 1) {
  let c = 0; for (let j = -1; j <= 1; j += 1) for (let i = -1; i <= 1; i += 1) c += a0[(y + j) * W + x + i];
  sheared[(y * W + x) * 4 + 3] = c >= 5 ? 255 : c >= 3 ? 128 : 0;
}
// crop to the solid rows, then crossfade the ends so it tiles
let sTop = H, sBottom = -1; for (let y = 0; y < H; y += 1) { let n = 0; for (let x = 0; x < W; x += 4) if (sheared[(y * W + x) * 4 + 3] > 128) n += 1; if (n > W / 40) { if (y < sTop) sTop = y; sBottom = y; } }
const CH = sBottom - sTop + 1;
const out = Buffer.alloc(W * CH * 4);
for (let y = 0; y < CH; y += 1) for (let x = 0; x < W; x += 1) { const so = ((y + sTop) * W + x) * 4, o = (y * W + x) * 4; for (let c = 0; c < 4; c += 1) out[o + c] = sheared[so + c]; }
const F = 64;
for (let y = 0; y < CH; y += 1) for (let x = 0; x < F; x += 1) {
  const t = x / F, a = (y * W + x) * 4, b = (y * W + W - F + x) * 4;
  for (let c = 0; c < 4; c += 1) { const v = Math.round(out[b + c] * (1 - t) + out[a + c] * t); out[a + c] = v; out[b + c] = v; }
}
fs.mkdirSync(OUT, { recursive: true });
await sharp(out, { raw: { width: W, height: CH, channels: 4 } }).png().toFile(`${OUT}/kerb-element-r2.png`);
fs.writeFileSync(`${OUT}/kerb-element-r2.json`, JSON.stringify({ element: "kerb", width: W, height: CH, anchorRow: Math.round(gMid - sTop), source: `${BAND} x ${X0}-${X1}`, note: "the world's own kerb (old c3-1, commit f9b0a37e), keyed out of its meadow, straightened, tileable" }, null, 1));
console.log(`kerb-element-r2: ${W}x${CH}, groove row ${Math.round(gMid - sTop)}, ${kept} px keyed from the old c3-1's band x ${X0}-${X1}`);
