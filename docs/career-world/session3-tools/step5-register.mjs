// Step 5B: register the 20 authored cells in the world, on the lattice.
//
// This is the step the L2 ledger has been waiting for -- its registration has
// read "territory-local; world placement pending the world-scale-reset
// re-derivation" since the cells were baked.
//
// It follows `l2dev-manifest.mjs`, which proved the slicing, and differs in
// the two ways that make it a registration rather than a dev placement:
//
//   * cell bounds come from the LATTICE, not from a fraction of the territory
//     plate -- cell (c,r) of the block at [3,1] is [(3+c)/16, (1+r)/9], span
//     [1/16, 1/9]. Every number exact.
//   * it writes the RELEASE feed, terrain-stream-runtime-r4.json, so the
//     runtime serves the authored land instead of stream-r3.
//
// It READS the pyramid; it does not touch the solidified authoring pipeline.
//
//   node docs/career-world/session3-tools/step5-register.mjs [--dry]
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
sharp.cache(false);

const DRY = process.argv.includes("--dry");
const A = "public/career-world/layers/terrain/authority/";
const PYR = A + "tiles/l2-ninjaone-r1";
const OUT_DIR = A + "tiles/l2-ninjaone";
const FEED = A + "manifests/terrain-stream-runtime-r4.json";
const LEDGER = A + "manifests/terrain-l2-ninjaone-r1.json";

const ledger = JSON.parse(fs.readFileSync(LEDGER, "utf8"));
const previous = JSON.parse(fs.readFileSync(FEED, "utf8"));

const COLS = 16, ROWS = 9;              // the world lattice
const BLOCK = [3, 1];                   // owner placement
const CELL_SPAN = [1 / COLS, 1 / ROWS];
const TILE = 256, CELL = 2048;

async function cellImage(level, col, row) {
  const s = 2 ** level, size = CELL / s, x0 = col * CELL / s, y0 = row * CELL / s;
  const dir = path.join(PYR, `L${level}`), comps = [];
  const ax0 = Math.floor(x0 / TILE) * TILE, ay0 = Math.floor(y0 / TILE) * TILE;
  const ax1 = Math.ceil((x0 + size) / TILE) * TILE, ay1 = Math.ceil((y0 + size) / TILE) * TILE;
  for (const f of fs.readdirSync(dir)) {
    const [tx, ty] = f.replace(".webp", "").split("-").map(Number);
    const px = tx * TILE, py = ty * TILE;
    if (px >= ax1 || py >= ay1 || px + TILE <= ax0 || py + TILE <= ay0) continue;
    comps.push({ input: path.join(dir, f), left: px - ax0, top: py - ay0 });
  }
  const full = await sharp({
    create: { width: ax1 - ax0, height: ay1 - ay0, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).composite(comps).png().toBuffer();
  return sharp(full).extract({ left: x0 - ax0, top: y0 - ay0, width: size, height: size });
}

const base = "/career-world/layers/terrain/authority/tiles/l2-ninjaone/";
const tiles = [];
if (!DRY) fs.mkdirSync(OUT_DIR, { recursive: true });
for (const id of Object.keys(ledger.cells).sort()) {
  const [col, row] = id.slice(1).split("-").map(Number);
  const cap = `${id}-capital.webp`, site = `${id}-site.webp`;
  if (!DRY) {
    await (await cellImage(3, col, row)).webp({ quality: 90, alphaQuality: 100 }).toFile(path.join(OUT_DIR, cap));
    await (await cellImage(1, col, row)).webp({ quality: 90, alphaQuality: 100 }).toFile(path.join(OUT_DIR, site));
  }
  tiles.push({
    id: `l2-${id}`,
    minimumTier: "capital",
    sources: {
      capital: { path: base + cap, dimensions: [256, 256], decodedBytes: 256 * 256 * 4 },
      site: { path: base + site, dimensions: [1024, 1024], decodedBytes: 1024 * 1024 * 4 },
    },
    worldBounds: {
      origin: [(BLOCK[0] + col) / COLS, (BLOCK[1] + row) / ROWS],
      span: CELL_SPAN,
    },
  });
  console.log(`${id}  ->  cell [${BLOCK[0] + col}, ${BLOCK[1] + row}]  origin [${(BLOCK[0] + col)}/${COLS}, ${(BLOCK[1] + row)}/${ROWS}]`);
}

const feed = {
  schemaVersion: 1,
  id: previous.id,
  coordinateSpace: "normalized-world-top-left",
  source: "career-world/terrain-l2-ninjaone@r1",
  note: "The authored L2 land, registered on the world lattice. Territories other "
    + "than ninjaone have no authored ground yet; they are sea until their cells are baked.",
  streaming: previous.streaming,
  tiles,
};
if (!DRY) {
  fs.writeFileSync(FEED, JSON.stringify(feed, null, 2) + "\n");
  const led = JSON.parse(fs.readFileSync(LEDGER, "utf8"));
  led.registration = {
    status: "registered",
    lattice: { cols: COLS, rows: ROWS, cellWorldPx: 217 },
    block: { origin: BLOCK, size: [5, 4] },
    worldBounds: { origin: [BLOCK[0] / COLS, BLOCK[1] / ROWS], span: [5 / COLS, 4 / ROWS] },
    ruling: "owner 2026-09-03: the authored grid is authoritative and expands as needed",
  };
  fs.writeFileSync(LEDGER, JSON.stringify(led, null, 2) + "\n");
}

console.log(`\n${DRY ? "WOULD WRITE" : "WROTE"} ${tiles.length} cells to ${OUT_DIR}`);
console.log(`${DRY ? "WOULD POINT" : "POINTED"} the release feed at the authored land`);
console.log(`  was ${previous.tiles.length} tiles, all sourced from stream-r3`);
console.log(`  now ${tiles.length} tiles from l2-ninjaone-r1`);
console.log(`block  cell [${BLOCK}] .. [${BLOCK[0] + 5}, ${BLOCK[1] + 4}]`);
console.log(`       world [${BLOCK[0] / COLS}, ${BLOCK[1] / ROWS}] span [${5 / COLS}, ${4 / ROWS}]`);
