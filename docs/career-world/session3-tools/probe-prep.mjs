// Probe prep: inspect the c4-2 context window + binding, build the edit mask
// (opaque = preserve the already-painted band, transparent = generate), write previews.
import sharp from "sharp"; import fs from "node:fs";
sharp.cache(false);
const CTX = ".codex-tmp/authoring/cells/c4-2/context";
const OUT = ".codex-tmp/session3/probe"; fs.mkdirSync(OUT, { recursive: true });
const GEN = 2560;
const win = await sharp(`${CTX}/window.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const bind = await sharp(`${CTX}/binding.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
console.log("window", win.info.width, win.info.height, win.info.channels, " binding", bind.info.width, bind.info.height, bind.info.channels);
// alpha / darkness stats per 256-px row band
const W = win.info.width, H = win.info.height, wd = win.data, bd = bind.data;
console.log("band(y)        window painted%   window opaque%   binding dark%");
for (let b = 0; b < H / 256; b++) {
  let painted = 0, opaque = 0, dark = 0, n = 0;
  for (let y = b * 256; y < (b + 1) * 256; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4; n++;
    const a = wd[i + 3], lum = 0.299 * wd[i] + 0.587 * wd[i + 1] + 0.114 * wd[i + 2];
    if (a > 0 && lum > 8) painted++; if (a === 255) opaque++;
    const bl = 0.299 * bd[i] + 0.587 * bd[i + 1] + 0.114 * bd[i + 2]; if (bd[i + 3] > 0 && bl < 128) dark++;
  }
  console.log(`${String(b * 256).padStart(4)}-${String((b + 1) * 256).padStart(4)}   ${(100 * painted / n).toFixed(1).padStart(8)}%   ${(100 * opaque / n).toFixed(1).padStart(8)}%   ${(100 * dark / n).toFixed(1).padStart(8)}%`);
}
// the edit mask: preserve (alpha 255) every painted pixel of the window; generate (alpha 0) elsewhere.
// painted = alpha>0 and not black. Also a second mask that preserves only the BINDING pixels.
const maskA = Buffer.alloc(W * H * 4), maskB = Buffer.alloc(W * H * 4);
let keepA = 0, keepB = 0;
for (let i = 0; i < W * H; i++) {
  const a = wd[i * 4 + 3], lum = 0.299 * wd[i * 4] + 0.587 * wd[i * 4 + 1] + 0.114 * wd[i * 4 + 2];
  const painted = a > 0 && lum > 8;
  const bl = 0.299 * bd[i * 4] + 0.587 * bd[i * 4 + 1] + 0.114 * bd[i * 4 + 2];
  const binding = bd[i * 4 + 3] > 0 && bl < 128;
  maskA[i * 4] = maskA[i * 4 + 1] = maskA[i * 4 + 2] = 255; maskA[i * 4 + 3] = painted ? 255 : 0; if (painted) keepA++;
  maskB[i * 4] = maskB[i * 4 + 1] = maskB[i * 4 + 2] = 255; maskB[i * 4 + 3] = binding ? 255 : 0; if (binding) keepB++;
}
console.log(`mask A (preserve all painted): keeps ${(100 * keepA / (W * H)).toFixed(1)}% of the canvas; mask B (preserve binding only): keeps ${(100 * keepB / (W * H)).toFixed(1)}%`);
await sharp(maskA, { raw: { width: W, height: H, channels: 4 } }).png().toFile(`${OUT}/mask-preserve-painted.png`);
await sharp(maskB, { raw: { width: W, height: H, channels: 4 } }).png().toFile(`${OUT}/mask-preserve-binding.png`);
// the edit target: the window with unpainted area filled mid-grey and made opaque (some editors dislike alpha in the target)
const tgt = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) { const keep = maskA[i * 4 + 3] === 255; tgt[i * 4] = keep ? wd[i * 4] : 96; tgt[i * 4 + 1] = keep ? wd[i * 4 + 1] : 104; tgt[i * 4 + 2] = keep ? wd[i * 4 + 2] : 88; tgt[i * 4 + 3] = 255; }
await sharp(tgt, { raw: { width: W, height: H, channels: 4 } }).png().toFile(`${OUT}/target-window-opaque.png`);
// previews
await sharp(`${CTX}/window.png`).flatten({ background: { r: 255, g: 0, b: 255 } }).resize(640).png().toFile(`${OUT}/preview-window.png`);
await sharp(`${CTX}/binding.png`).flatten({ background: { r: 255, g: 0, b: 255 } }).resize(640).png().toFile(`${OUT}/preview-binding.png`);
await sharp(`${OUT}/mask-preserve-painted.png`).flatten({ background: { r: 255, g: 0, b: 255 } }).resize(320).png().toFile(`${OUT}/preview-maskA.png`);
console.log("wrote", OUT);
