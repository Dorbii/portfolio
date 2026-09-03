// "Is one cell tinted?" answered the way the eye asks it: blur the texture out
// of the stitched picture at the reading zoom and look at what is left. A cell
// cast shows as a RECTANGLE on the 512 px grid; landscape shows as blobs that
// cross the grid lines. Three panels: field, field + grid, and the field with
// its own mean removed and contrast pushed (so a weak cast is still visible).
//   node .codex-tmp/session3/tone-field.mjs
import sharp from "sharp"; import fs from "node:fs"; import path from "node:path";
sharp.cache(false);
const TILES = "public/career-world/layers/terrain/authority/tiles/l2-ninjaone-r1";
const OUT = ".codex-tmp/session3/review"; fs.mkdirSync(OUT, { recursive: true });
const TILE = 256, COLS = 5, ROWS = 4, S = 512, W = COLS * S, H = ROWS * S;

const comps = [];
for (const f of fs.readdirSync(`${TILES}/L2`)) { const [tx, ty] = f.replace(".webp", "").split("-").map(Number); comps.push({ input: path.join(TILES, "L2", f), left: tx * TILE, top: ty * TILE }); }
const flat = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 30, g: 34, b: 38, alpha: 1 } } }).composite(comps).png().toBuffer();
const field = await sharp(flat).blur(28).png().toBuffer();          // texture gone, cell-scale tone kept
await sharp(field).png().toFile(`${OUT}/tone-field.png`);

// contrast-pushed version: subtract the picture's own broad tone, x4 the rest
const { data, info } = await sharp(field).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const broad = await sharp(flat).blur(160).ensureAlpha().raw().toBuffer();
const amp = Buffer.alloc(data.length);
for (let i = 0; i < data.length; i += 4) {
  for (let k = 0; k < 3; k++) amp[i + k] = Math.max(0, Math.min(255, 128 + (data[i + k] - broad[i + k]) * 4));
  amp[i + 3] = data[i + 3];
}
await sharp(amp, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(`${OUT}/tone-field-amplified.png`);

let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`;
for (let c = 1; c < COLS; c++) svg += `<line x1="${c * S}" y1="0" x2="${c * S}" y2="${H}" stroke="#ff2fd0" stroke-width="3"/>`;
for (let r = 1; r < ROWS; r++) svg += `<line x1="0" y1="${r * S}" x2="${W}" y2="${r * S}" stroke="#ff2fd0" stroke-width="3"/>`;
svg += `</svg>`;
const grid = Buffer.from(svg);
await sharp(field).composite([{ input: grid }]).png().toFile(`${OUT}/tone-field-grid.png`);
await sharp(amp, { raw: { width: info.width, height: info.height, channels: 4 } }).composite([{ input: grid }]).png().toFile(`${OUT}/tone-field-amplified-grid.png`);
console.log("wrote tone-field{,-grid,-amplified,-amplified-grid}.png", W, "x", H);
