// Whole-territory review at reduced zoom: crown drift and tints across all 20
// cells, plus the quarter-scale picture assembled from the STITCHED tiles.
// Crown classifier is crown-size.mjs's, unchanged, so numbers compare to the
// per-seam ones already in the ledger notes.
//   node .codex-tmp/session3/territory-review.mjs
import sharp from "sharp"; import fs from "node:fs"; import path from "node:path";
sharp.cache(false);

const SRC = "art-source/career-world/l2-land/ninjaone";
const TILES = "public/career-world/layers/terrain/authority/tiles/l2-ninjaone-r1";
const OUT = ".codex-tmp/session3/review"; fs.mkdirSync(OUT, { recursive: true });
const GEN = 2560, BLEED = 256, CELL = 2048, TILE = 256, COLS = 5, ROWS = 4;

const ledger = JSON.parse(fs.readFileSync("public/career-world/layers/terrain/authority/manifests/terrain-l2-ninjaone-r1.json", "utf8"));
const plan = JSON.parse(fs.readFileSync(`${SRC}/plan.json`, "utf8"));

function conifer(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx === 0) return false;
  const s = (mx - mn) / mx, v = mx / 255; if (s < 0.25 || v > 0.45) return false;
  let h; if (mx === r) h = 60 * (((g - b) / (mx - mn)) % 6); else if (mx === g) h = 60 * ((b - r) / (mx - mn) + 2); else h = 60 * ((r - g) / (mx - mn) + 4);
  if (h < 0) h += 360; return h >= 60 && h <= 170;
}
function crowns(buf) {
  const x0 = BLEED, y0 = BLEED, w = CELL, h = CELL;
  const m = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = ((y + y0) * GEN + x + x0) * 4; if (buf[i + 3] > 250 && conifer(buf[i], buf[i + 1], buf[i + 2])) m[y * w + x] = 1; }
  const lab = new Int32Array(w * h); const stack = new Int32Array(w * h); const sizes = []; let next = 0;
  for (let s = 0; s < w * h; s++) {
    if (!m[s] || lab[s]) continue; next++; let sp = 0; stack[sp++] = s; lab[s] = next;
    let area = 0, bx0 = w, bx1 = 0, by0 = h, by1 = 0;
    while (sp) { const p = stack[--sp]; const px = p % w, py = (p - px) / w; area++;
      if (px < bx0) bx0 = px; if (px > bx1) bx1 = px; if (py < by0) by0 = py; if (py > by1) by1 = py;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const qx = px + dx, qy = py + dy; if (qx < 0 || qy < 0 || qx >= w || qy >= h) continue; const q = qy * w + qx; if (m[q] && !lab[q]) { lab[q] = next; stack[sp++] = q; } } }
    if (area >= 300 && area <= 20000) sizes.push(Math.max(bx1 - bx0 + 1, by1 - by0 + 1));
  }
  sizes.sort((a, b) => a - b);
  const q = (f) => sizes.length ? sizes[Math.min(sizes.length - 1, Math.floor(f * sizes.length))] : NaN;
  return { n: sizes.length, p25: q(0.25), med: q(0.5), p75: q(0.75), cover: +(m.reduce((a, b) => a + b, 0) / (w * h) * 100).toFixed(1) };
}
// ground tone of the kept area: median luma and mean chroma of opaque paint.
function tone(buf) {
  const lum = [], as = [], bs = [];
  for (let y = 0; y < CELL; y += 3) for (let x = 0; x < CELL; x += 3) {
    const i = ((y + BLEED) * GEN + x + BLEED) * 4; if (buf[i + 3] <= 250) continue;
    const r = buf[i] / 255, g = buf[i + 1] / 255, b = buf[i + 2] / 255;
    lum.push(0.2126 * buf[i] + 0.7152 * buf[i + 1] + 0.0722 * buf[i + 2]);
    // simple opponent axes: warm-cool and green-magenta, enough to see a cast
    as.push((r - g) * 255); bs.push((0.5 * (r + g) - b) * 255);
  }
  lum.sort((x, y) => x - y); as.sort((x, y) => x - y); bs.sort((x, y) => x - y);
  const md = (arr) => arr.length ? arr[Math.floor(arr.length / 2)] : NaN;
  return { luma: +md(lum).toFixed(1), rg: +md(as).toFixed(1), yb: +md(bs).toFixed(1), n: lum.length };
}

const rows = [];
for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
  const id = `c${c}-${r}`, p = `${SRC}/${id}/${id}-l2.png`;
  if (!fs.existsSync(p)) { console.log("missing", p); continue; }
  const meta = await sharp(p).metadata();
  let img = sharp(p); if (meta.width !== GEN) img = img.resize(GEN, GEN, { kernel: "lanczos3" });
  const buf = await img.ensureAlpha().raw().toBuffer();
  const k = crowns(buf), t = tone(buf);
  const rec = ledger.cells[id] ?? {};
  const gate = (name) => (rec.gates || []).find((g) => g.name === name)?.value;
  const biome = plan.biomes?.[plan.cellBiomes?.[`${c},${r}`]]?.name ?? "";
  rows.push({ id, c, r, biome, ...k, ...t, keylight: gate("key-light asymmetry"), rock: gate("rock lighting"), palette: gate("palette conformance") });
  console.log(`${id}  ${String(biome).padEnd(18)} crowns n${String(k.n).padStart(4)} p25/med/p75 ${k.p25}/${k.med}/${k.p75}px cover ${String(k.cover).padStart(4)}%  luma ${String(t.luma).padStart(5)} rg ${String(t.rg).padStart(6)} yb ${String(t.yb).padStart(6)}  rock ${rec.gates ? gate("rock lighting") : "-"}`);
}
fs.writeFileSync(`${OUT}/territory-metrics.json`, JSON.stringify(rows, null, 1));

// --- the picture: quarter scale (L2), plain and labelled -------------------
const S = CELL / 4, W = COLS * S, H = ROWS * S;
const comps = [];
for (const f of fs.readdirSync(`${TILES}/L2`)) { const [tx, ty] = f.replace(".webp", "").split("-").map(Number); comps.push({ input: path.join(TILES, "L2", f), left: tx * TILE, top: ty * TILE }); }
const base = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 30, g: 34, b: 38, alpha: 1 } } }).composite(comps).png().toBuffer();
await sharp(base).toFile(`${OUT}/territory-quarter-now.png`);

const med = (arr) => { const s = [...arr].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const lumaMed = med(rows.map((x) => x.luma));
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`;
for (const x of rows) {
  const px = x.c * S, py = x.r * S;
  svg += `<rect x="${px + 1}" y="${py + 1}" width="${S - 2}" height="${S - 2}" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="2"/>`;
  svg += `<rect x="${px + 5}" y="${py + 5}" width="228" height="60" fill="rgba(0,0,0,0.6)"/>`;
  svg += `<text x="${px + 12}" y="${py + 25}" font-family="Segoe UI, Arial" font-size="17" font-weight="bold" fill="#fff">${x.c},${x.r} ${x.biome}</text>`;
  const dl = (x.luma - lumaMed).toFixed(0);
  svg += `<text x="${px + 12}" y="${py + 44}" font-family="Segoe UI, Arial" font-size="14" fill="${x.med < 84 ? "#ffb0b0" : "#b8ffb8"}">crown med ${x.med}px (floor 84)</text>`;
  svg += `<text x="${px + 12}" y="${py + 60}" font-family="Segoe UI, Arial" font-size="14" fill="#ddd">luma ${x.luma} (${dl >= 0 ? "+" : ""}${dl} vs territory)</text>`;
}
svg += `</svg>`;
await sharp(base).composite([{ input: Buffer.from(svg), left: 0, top: 0 }]).png().toFile(`${OUT}/territory-quarter-labelled.png`);
console.log("\nwrote", `${OUT}/territory-quarter-now.png`, `${OUT}/territory-quarter-labelled.png`, `${OUT}/territory-metrics.json`);
console.log("crown medians:", rows.map((x) => `${x.c},${x.r}:${x.med}`).join(" "));
console.log("luma medians :", rows.map((x) => `${x.c},${x.r}:${x.luma}`).join(" "));
