// Territory grid status: the whole 5x4 grid from the L3 tiles (1/8 scale) with
// grid lines, cell ids, biome names, shelves, and DONE marks from the ledger.
import sharp from "sharp"; import fs from "node:fs"; import path from "node:path";
sharp.cache(false);
const TILES = "public/career-world/layers/terrain/authority/tiles/l2-ninjaone-r1/L3", TILE = 256;
const plan = JSON.parse(fs.readFileSync("art-source/career-world/l2-land/ninjaone/plan.json", "utf8"));
const ledger = JSON.parse(fs.readFileSync("public/career-world/layers/terrain/authority/manifests/terrain-l2-ninjaone-r1.json", "utf8"));
const COLS = 5, ROWS = 4, S = 256;               // one cell = 2048 world px = 256 px at L3
const W = COLS * S, H = ROWS * S;
const comps = [];
if (fs.existsSync(TILES)) for (const f of fs.readdirSync(TILES)) { const [tx, ty] = f.replace(".webp", "").split("-").map(Number); comps.push({ input: path.join(TILES, f), left: tx * TILE, top: ty * TILE }); }
const base = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 58, g: 58, b: 58, alpha: 1 } } }).composite(comps).png().toBuffer();
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H + 40}">`;
svg += `<rect x="0" y="${H}" width="${W}" height="40" fill="#111"/>`;
for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
  const id = `c${c}-${r}`, done = !!ledger.cells?.[id]; const biome = plan.biomes?.[plan.cellBiomes?.[`${c},${r}`]]?.name ?? "";
  const shelf = (plan.shelves || []).find((s) => s.cell[0] === c && s.cell[1] === r);
  const x = c * S, y = r * S;
  svg += `<rect x="${x + 1}" y="${y + 1}" width="${S - 2}" height="${S - 2}" fill="none" stroke="${done ? "#7CFC7C" : "#ff5555"}" stroke-width="3"/>`;
  svg += `<rect x="${x + 4}" y="${y + 4}" width="${S - 8}" height="46" fill="rgba(0,0,0,0.55)"/>`;
  svg += `<text x="${x + 10}" y="${y + 24}" font-family="Segoe UI, Arial" font-size="18" font-weight="bold" fill="${done ? "#7CFC7C" : "#ff8080"}">${c},${r} ${done ? "DONE" : "not yet"}</text>`;
  svg += `<text x="${x + 10}" y="${y + 44}" font-family="Segoe UI, Arial" font-size="14" fill="#fff">${esc(biome)}${shelf ? " · shelf: " + esc(shelf.id) : ""}</text>`;
  if (done) { const g = ledger.cells[id].stitch?.order; svg += `<text x="${x + S - 12}" y="${y + S - 10}" text-anchor="end" font-family="Segoe UI, Arial" font-size="14" fill="#7CFC7C">#${g}</text>`; }
}
const doneN = Object.keys(ledger.cells || {}).length;
svg += `<text x="10" y="${H + 27}" font-family="Segoe UI, Arial" font-size="18" fill="#fff">NinjaOne territory, ${doneN} of ${COLS * ROWS} cells authored (green = stitched, red = not yet; # = stitch order; grey inside a cell = cut water or unauthored). Canon r2, ${new Date().toISOString().slice(0, 10)}</text></svg>`;
await sharp(base).extend({ bottom: 40, background: { r: 17, g: 17, b: 17, alpha: 1 } }).composite([{ input: Buffer.from(svg), left: 0, top: 0 }]).png().toFile(".codex-tmp/session3/review/territory-grid-status.png");
console.log("done cells:", Object.keys(ledger.cells).sort().join(" "), "->", doneN, "/", COLS * ROWS);
