// Reduced-zoom review, part 2: the two named watch items made visible.
//   crown drift -> the tree-densest 512 window of each cell, cropped 1:1 from
//                  the STITCHED tiles, labelled with the measured median.
//   tints       -> each cell's median ground colour as a flat field, so a
//                  cast that the eye reads as "one cell is off" is separable
//                  from the picture's own variety.
//   node .codex-tmp/session3/territory-crops.mjs
import sharp from "sharp"; import fs from "node:fs"; import path from "node:path";
sharp.cache(false);
const SRC = "art-source/career-world/l2-land/ninjaone";
const TILES = "public/career-world/layers/terrain/authority/tiles/l2-ninjaone-r1";
const OUT = ".codex-tmp/session3/review"; fs.mkdirSync(OUT, { recursive: true });
const GEN = 2560, BLEED = 256, CELL = 2048, TILE = 256, WIN = 512;
const metrics = JSON.parse(fs.readFileSync(`${OUT}/territory-metrics.json`, "utf8"));

function conifer(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx === 0) return false;
  const s = (mx - mn) / mx, v = mx / 255; if (s < 0.25 || v > 0.45) return false;
  let h; if (mx === r) h = 60 * (((g - b) / (mx - mn)) % 6); else if (mx === g) h = 60 * ((b - r) / (mx - mn) + 2); else h = 60 * ((r - g) / (mx - mn) + 4);
  if (h < 0) h += 360; return h >= 60 && h <= 170;
}
async function assembleL0(x0, y0, w, h) {
  const ax0 = Math.floor(x0 / TILE) * TILE, ay0 = Math.floor(y0 / TILE) * TILE;
  const ax1 = Math.ceil((x0 + w) / TILE) * TILE, ay1 = Math.ceil((y0 + h) / TILE) * TILE;
  const comps = [];
  for (const f of fs.readdirSync(`${TILES}/L0`)) {
    const [tx, ty] = f.replace(".webp", "").split("-").map(Number);
    const px = tx * TILE, py = ty * TILE;
    if (px >= ax1 || py >= ay1 || px + TILE <= ax0 || py + TILE <= ay0) continue;
    comps.push({ input: path.join(TILES, "L0", f), left: px - ax0, top: py - ay0 });
  }
  const buf = await sharp({ create: { width: ax1 - ax0, height: ay1 - ay0, channels: 4, background: { r: 24, g: 28, b: 32, alpha: 1 } } }).composite(comps).png().toBuffer();
  return sharp(buf).extract({ left: x0 - ax0, top: y0 - ay0, width: w, height: h });
}
// densest conifer window inside the kept area, from the cell source
async function bestWindow(id) {
  const p = `${SRC}/${id}/${id}-l2.png`;
  const meta = await sharp(p).metadata();
  let img = sharp(p); if (meta.width !== GEN) img = img.resize(GEN, GEN, { kernel: "lanczos3" });
  const buf = await img.ensureAlpha().raw().toBuffer();
  let best = { n: -1, x: 0, y: 0 };
  for (let y = 0; y + WIN <= CELL; y += 128) for (let x = 0; x + WIN <= CELL; x += 128) {
    let n = 0;
    for (let yy = y; yy < y + WIN; yy += 4) for (let xx = x; xx < x + WIN; xx += 4) {
      const i = ((yy + BLEED) * GEN + xx + BLEED) * 4;
      if (buf[i + 3] > 250 && conifer(buf[i], buf[i + 1], buf[i + 2])) n++;
    }
    if (n > best.n) best = { n, x, y };
  }
  return best;
}
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

// ---- crown drift sheet: every cell, ordered by measured median -------------
const order = [...metrics].sort((a, b) => a.med - b.med);
const COLS = 5, ROWS = 4, PAD = 8, LBL = 34;
const sheetW = COLS * (WIN + PAD) + PAD, sheetH = ROWS * (WIN + LBL + PAD) + PAD + 46;
const comps = []; let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${sheetW}" height="${sheetH}">`;
for (let i = 0; i < order.length; i++) {
  const m = order[i], gx = i % COLS, gy = Math.floor(i / COLS);
  const w = await bestWindow(m.id);
  const crop = await assembleL0(m.c * CELL + w.x, m.r * CELL + w.y, WIN, WIN);
  const px = PAD + gx * (WIN + PAD), py = PAD + gy * (WIN + LBL + PAD);
  comps.push({ input: await crop.png().toBuffer(), left: px, top: py + LBL });
  const flag = m.med < 84;
  svg += `<text x="${px + 4}" y="${py + 15}" font-family="Segoe UI, Arial" font-size="15" font-weight="bold" fill="#fff">${m.c},${m.r} ${esc(m.biome)}</text>`;
  svg += `<text x="${px + 4}" y="${py + 30}" font-family="Segoe UI, Arial" font-size="14" fill="${flag ? "#ff9a9a" : "#9dff9d"}">crown median ${m.med}px  (p25 ${m.p25} / p75 ${m.p75}, n ${m.n})</text>`;
  console.log(`${m.id} window ${w.x},${w.y}`);
}
svg += `<text x="${PAD}" y="${sheetH - 16}" font-family="Segoe UI, Arial" font-size="19" fill="#fff">Crown drift across the territory — the tree-densest 512px window of every cell, 1:1 from the stitched tiles, ordered smallest median crown to largest (46px to 112px). Red = under the 84px floor.</text></svg>`;
await sharp({ create: { width: sheetW, height: sheetH, channels: 4, background: { r: 17, g: 17, b: 17, alpha: 1 } } })
  .composite([...comps, { input: Buffer.from(svg), left: 0, top: 0 }]).png().toFile(`${OUT}/territory-crown-drift.png`);
console.log("wrote", `${OUT}/territory-crown-drift.png`);

// ---- tint field ------------------------------------------------------------
const S = 220, TW = COLS * S, TH = ROWS * S + 40;
let tsvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TW}" height="${TH}"><rect width="${TW}" height="${TH}" fill="#111"/>`;
const lumas = metrics.map((m) => m.luma).sort((a, b) => a - b), lmed = lumas[Math.floor(lumas.length / 2)];
for (const m of metrics) {
  // reconstruct an approximate median RGB from luma and the two opponent medians
  const yb = m.yb, rg = m.rg;
  let b = m.luma - yb * 0.75, r = b + yb * 0.9 + rg * 0.6, g = r - rg;
  const cl = (v) => Math.max(0, Math.min(255, Math.round(v)));
  const px = m.c * S, py = m.r * S, d = (m.luma - lmed).toFixed(0);
  tsvg += `<rect x="${px}" y="${py}" width="${S}" height="${S}" fill="rgb(${cl(r)},${cl(g)},${cl(b)})"/>`;
  tsvg += `<rect x="${px + 6}" y="${py + 6}" width="${S - 12}" height="52" fill="rgba(0,0,0,0.55)"/>`;
  tsvg += `<text x="${px + 12}" y="${py + 26}" font-family="Segoe UI, Arial" font-size="15" font-weight="bold" fill="#fff">${m.c},${m.r} ${esc(m.biome).slice(0, 20)}</text>`;
  tsvg += `<text x="${px + 12}" y="${py + 46}" font-family="Segoe UI, Arial" font-size="14" fill="${Math.abs(d) >= 15 ? "#ffcf8f" : "#cfcfcf"}">luma ${m.luma}  ${d >= 0 ? "+" : ""}${d}</text>`;
}
tsvg += `<text x="8" y="${TH - 14}" font-family="Segoe UI, Arial" font-size="17" fill="#fff">Median ground colour per cell (opaque paint only), laid out as the territory. Territory median luma ${lmed}; amber = 15+ away.</text></svg>`;
await sharp(Buffer.from(tsvg)).png().toFile(`${OUT}/territory-tint-field.png`);
console.log("wrote", `${OUT}/territory-tint-field.png`);
