// The same ground at every pyramid level, native pixels, so the reduction's look
// and the seams at reduced zoom can be judged by eye. Three sheets:
//   A. the whole 7-cell block at L3, L4, L5, L6 (native)
//   B. one seam-crossing window (the 3,3|4,3 seam by the quarry) at L0, L1, L2, L3 (native)
//   B2. the same window with L1..L3 stretched back to 512 px (nearest), i.e. what a viewer draws
import sharp from "sharp"; import fs from "node:fs"; import path from "node:path";
sharp.cache(false);
const ROOT = "public/career-world/layers/terrain/authority/tiles/l2-ninjaone-r1", TILE = 256;
async function assemble(level, x0, y0, w, h) {   // window in LEVEL pixels
  const dir = path.join(ROOT, `L${level}`), comps = [];
  const ax0 = Math.floor(x0 / TILE) * TILE, ay0 = Math.floor(y0 / TILE) * TILE;
  const ax1 = Math.ceil((x0 + w) / TILE) * TILE, ay1 = Math.ceil((y0 + h) / TILE) * TILE;
  for (const f of fs.readdirSync(dir)) {
    const [tx, ty] = f.replace(".webp", "").split("-").map(Number); const px = tx * TILE, py = ty * TILE;
    if (px >= ax1 || py >= ay1 || px + TILE <= ax0 || py + TILE <= ay0) continue;
    comps.push({ input: path.join(dir, f), left: px - ax0, top: py - ay0 });
  }
  const full = await sharp({ create: { width: ax1 - ax0, height: ay1 - ay0, channels: 4, background: { r: 58, g: 58, b: 58, alpha: 1 } } }).composite(comps).png().toBuffer();
  return sharp(full).extract({ left: x0 - ax0, top: y0 - ay0, width: w, height: h }).png().toBuffer();
}
const label = (w, text) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="26"><rect width="${w}" height="26" fill="#111"/><text x="6" y="18" font-family="Segoe UI, Arial" font-size="13" fill="#fff">${text}</text></svg>`);
async function strip(panels, out) {
  const H = Math.max(...panels.map((p) => p.h)) + 26; let x = 0; const comps = [];
  for (const p of panels) { comps.push({ input: label(p.w, p.text), left: x, top: 0 }); comps.push({ input: p.buf, left: x, top: 26 }); x += p.w + 12; }
  await sharp({ create: { width: x, height: H, channels: 4, background: { r: 20, g: 20, b: 20, alpha: 1 } } }).composite(comps).png().toFile(out);
  console.log("wrote", out, x, "x", H);
}
// A: block cols 2-4, rows 1-3 => world x 4096..10240, y 2048..8192 (6144 px at L0)
const A = [];
for (const L of [3, 4, 5, 6]) {
  const s = 2 ** L, w = 6144 / s, h = 6144 / s;
  A.push({ buf: await assemble(L, 4096 / s, 2048 / s, w, h), w, h, text: `L${L} 1/${s} (${w}px = 3 cells)` });
}
await strip(A, ".codex-tmp/session3/review/pyramid-A-block-L3-L6.png");
// B: seam window at the 3,3|4,3 line: world x 7936..8448 (seam at 8192), y 6400..6912
const B = [];
for (const L of [0, 1, 2, 3]) {
  const s = 2 ** L, w = 512 / s, h = 512 / s;
  B.push({ buf: await assemble(L, 7936 / s, 6400 / s, w, h), w, h, text: `L${L} 1/${s} (${w}px)` });
}
await strip(B, ".codex-tmp/session3/review/pyramid-B-seam-L0-L3.png");
const B2 = [{ buf: B[0].buf, w: 512, h: 512, text: "L0 native, seam 3,3|4,3 down the centre" }];
for (let i = 1; i < 4; i++) {
  const up = await sharp(B[i].buf).resize(512, 512, { kernel: "nearest" }).png().toBuffer();
  B2.push({ buf: up, w: 512, h: 512, text: `L${i} stretched x${2 ** i} (nearest)` });
}
await strip(B2, ".codex-tmp/session3/review/pyramid-B2-seam-stretched.png");
