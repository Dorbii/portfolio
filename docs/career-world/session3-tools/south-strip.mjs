// The tint question at the reading zoom: does the row 2|3 boundary read as a
// line? Three full-width strips through three horizontal boundaries, identical
// treatment, so the suspect one is judged against two ordinary ones.
//   node .codex-tmp/session3/south-strip.mjs
import sharp from "sharp"; import fs from "node:fs"; import path from "node:path";
sharp.cache(false);
const TILES = "public/career-world/layers/terrain/authority/tiles/l2-ninjaone-r1";
const OUT = ".codex-tmp/session3/review"; fs.mkdirSync(OUT, { recursive: true });
const TILE = 256, COLS = 5, ROWS = 4, S = 512, W = COLS * S, H = ROWS * S;
const HALF = 192;                                    // quarter-scale px either side

const comps = [];
for (const f of fs.readdirSync(`${TILES}/L2`)) { const [tx, ty] = f.replace(".webp", "").split("-").map(Number); comps.push({ input: path.join(TILES, "L2", f), left: tx * TILE, top: ty * TILE }); }
const flat = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 30, g: 34, b: 38, alpha: 1 } } }).composite(comps).png().toBuffer();

const BOUNDS = [[1, "row 0 | row 1"], [2, "row 1 | row 2"], [3, "row 2 | row 3  — the suspect: rows 0-2 average luma 81-85, row 3 averages 98"]];
const LBL = 30, PAD = 10, sheetH = PAD + BOUNDS.length * (2 * HALF + LBL + PAD) + 46;
const panels = []; let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${sheetH}">`;
for (let i = 0; i < BOUNDS.length; i++) {
  const [r, label] = BOUNDS[i], y = r * S;
  const strip = await sharp(flat).extract({ left: 0, top: y - HALF, width: W, height: 2 * HALF }).png().toBuffer();
  const py = PAD + i * (2 * HALF + LBL + PAD) + LBL;
  panels.push({ input: strip, left: 0, top: py });
  svg += `<text x="6" y="${py - 9}" font-family="Segoe UI, Arial" font-size="19" font-weight="bold" fill="#fff">${label}</text>`;
  // the boundary itself, ticked at the edges only so the paint is not covered
  for (const x of [0, W - 44]) svg += `<rect x="${x}" y="${py + HALF - 2}" width="44" height="4" fill="#ff2fd0"/>`;
  for (let c = 1; c < COLS; c++) svg += `<rect x="${c * S - 2}" y="${py + HALF - 14}" width="4" height="28" fill="#ff2fd0"/>`;
}
svg += `<text x="6" y="${sheetH - 16}" font-family="Segoe UI, Arial" font-size="19" fill="#fff">Full territory width across three horizontal cell boundaries, quarter scale. The boundary runs exactly between the magenta ticks; the vertical ticks are the cell corners. Nothing else is drawn on the paint.</text></svg>`;
await sharp({ create: { width: W, height: sheetH, channels: 4, background: { r: 17, g: 17, b: 17, alpha: 1 } } })
  .composite([...panels, { input: Buffer.from(svg), left: 0, top: 0 }]).png().toFile(`${OUT}/south-strips.png`);
console.log("wrote", `${OUT}/south-strips.png`, W, "x", sheetH);
