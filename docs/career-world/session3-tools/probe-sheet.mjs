// One labelled sheet for the owner: the probe-2 outpaint stitched against the quarry vs the current
// world at the same crop, plus the full probe-2 result and the target it was given.
import sharp from "sharp"; import fs from "node:fs";
sharp.cache(false);
const P = ".codex-tmp/session3/probe";
const label = (w, text) => Buffer.from(`<svg width="${w}" height="34"><rect width="100%" height="100%" fill="#1e1e1e"/><text x="8" y="23" font-family="Segoe UI, Arial, sans-serif" font-size="17" fill="#eee">${text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text></svg>`);
async function panel(file, text, height) {
  const img = await sharp(file).resize(null, height, { kernel: "lanczos3" }).png().toBuffer();
  const m = await sharp(img).metadata();
  return { buf: await sharp({ create: { width: m.width, height: height + 34, channels: 4, background: { r: 30, g: 30, b: 30, alpha: 1 } } }).composite([{ input: label(m.width, text), left: 0, top: 0 }, { input: img, left: 0, top: 34 }]).png().toBuffer(), w: m.width, h: height + 34 };
}
const H = 600;
const panels = [
  await panel(`${P}/builtin2-stitch-stream-CURRENT-1to1.png`, "CURRENT world at the c4-2|c4-3 seam, 1:1 (old c4-2 above the ownership curve, quarry below)", H),
  await panel(`${P}/builtin2-stitch-stream-1to1.png`, "PROBE 2 stitched the same way, 1:1 (edit-mode outpaint above, quarry below; peg x=498 at the seam)", H),
  await panel(`${P}/preview-target.png`, "what the model was given: neighbours' paint in the bottom 20%, grey to paint", H),
  await panel(`${P}/result-c4-2-builtin-edit-2.png`, "probe 2 raw output, 1254 square (built-in image_gen EDIT mode, framing pinned in the prompt)", H),
];
const gap = 12, W = panels.reduce((s, p) => s + p.w, 0) + gap * (panels.length - 1) + 16, HH = H + 34 + 60;
const comps = []; let x = 8;
for (const p of panels) { comps.push({ input: p.buf, left: x, top: 52 }); x += p.w + gap; }
const title = Buffer.from(`<svg width="${W}" height="44"><text x="8" y="30" font-family="Segoe UI, Arial, sans-serif" font-size="20" fill="#eee">probe sheet - built-in edit mode as the cell outpainter: seam step along the real ownership curve 20.2 (interior 15.6-22.7) vs current world 26.2; band fidelity r 0.74 vs 0.00 today; stream lands inside the 48 px gate</text></svg>`);
await sharp({ create: { width: W, height: HH, channels: 4, background: { r: 30, g: 30, b: 30, alpha: 1 } } }).composite([{ input: title, left: 0, top: 4 }, ...comps]).png().toFile(`${P}/probe-sheet.png`);
const m = await sharp(`${P}/probe-sheet.png`).metadata();
console.log(`${P}/probe-sheet.png  ${m.width}x${m.height}  ${(fs.statSync(`${P}/probe-sheet.png`).size / 1024).toFixed(0)} KB`);
