// Register every territory's authored L2 cells for serving, on the world
// lattice — `step5-register.mjs` generalized over territories (that script
// registered NinjaOne alone and wrote a feed saying the other territories are
// sea until baked).
//
// For each territory with a ledger — ninjaone, tanium, coast — every authored
// cell is sliced out of the STITCHED PYRAMID (site = L0, 2048 px; capital =
// L1, 1024 px) into tiles/l2-<territory>/<id>-{site,capital}.webp, and ONE
// release feed (terrain-stream-runtime-r4.json) carries every territory's
// tiles. Cell bounds come from the lattice: cell (c,r) of a block at [bx,by]
// is [(bx+c)/16, (by+r)/9], span [1/16, 1/9], exact. The coast's block covers
// the island (it is sparse), but only its authored shore cells are registered,
// and no two registered cells may share a lattice cell — checked here.
// NinjaOne's tile ids stay `l2-<id>` (the Kaizen city registration names them
// in its occlusion list); other territories use `l2-<territory>-<id>`.
//
// A cell is re-sliced only when a pyramid tile under it is newer than its
// webps (`--force` re-slices everything). It READS the pyramids; it does not
// touch the solidified authoring pipeline. The runtime's streamTiles.ts must
// list each tiles/l2-<territory>/ prefix it is to serve.
//
//   node docs/career-world/session3-tools/world-register.mjs [--dry] [--force]
//        [--territory ninjaone,tanium,coast]
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
sharp.cache(false);

const DRY = process.argv.includes("--dry");
const FORCE = process.argv.includes("--force");
const listArg = (flag) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--")
    ? process.argv[i + 1].split(",").map((s) => s.trim()).filter(Boolean) : [];
};
const WANTED = listArg("--territory");
const ALL = ["ninjaone", "tanium", "coast"];      // feed order: NinjaOne first (its ids are the old ones)

const A = "public/career-world/layers/terrain/authority/";
const ART = "art-source/career-world/l2-land/";
const FEED = A + "manifests/terrain-stream-runtime-r4.json";
const COLS = 16, ROWS = 9;              // the world lattice
const CELL_SPAN = [1 / COLS, 1 / ROWS];
const TILE = 256, CELL = 2048;

const previous = JSON.parse(fs.readFileSync(FEED, "utf8"));

// the cell at (col,row) of a pyramid at `level`, assembled from its tiles; and
// the newest tile under it, so an unchanged cell is not re-encoded
async function cellImage(pyr, level, col, row) {
  const s = 2 ** level, size = CELL / s, x0 = col * CELL / s, y0 = row * CELL / s;
  const dir = path.join(pyr, `L${level}`), comps = [];
  const ax0 = Math.floor(x0 / TILE) * TILE, ay0 = Math.floor(y0 / TILE) * TILE;
  const ax1 = Math.ceil((x0 + size) / TILE) * TILE, ay1 = Math.ceil((y0 + size) / TILE) * TILE;
  let newest = 0;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".webp")) continue;
    const [tx, ty] = f.replace(".webp", "").split("-").map(Number);
    const px = tx * TILE, py = ty * TILE;
    if (px >= ax1 || py >= ay1 || px + TILE <= ax0 || py + TILE <= ay0) continue;
    const file = path.join(dir, f);
    comps.push({ input: file, left: px - ax0, top: py - ay0 });
    newest = Math.max(newest, fs.statSync(file).mtimeMs);
  }
  if (!comps.length) throw new Error(`${pyr} L${level} has no tiles under cell c${col}-${row}`);
  if (DRY) return { image: null, newest };
  const full = await sharp({
    create: { width: ax1 - ax0, height: ay1 - ay0, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).composite(comps).png().toBuffer();
  return { image: sharp(full).extract({ left: x0 - ax0, top: y0 - ay0, width: size, height: size }), newest };
}

const tiles = [], occupied = new Map(), registered = [], summary = [];
for (const t of ALL) {
  if (WANTED.length && !WANTED.includes(t)) continue;
  const ledgerFile = A + `manifests/terrain-l2-${t}-r1.json`, defFile = ART + `${t}/territory.def.json`;
  if (!fs.existsSync(ledgerFile) || !fs.existsSync(defFile)) { summary.push(`${t}: no ledger or definition yet — not registered`); continue; }
  const ledger = JSON.parse(fs.readFileSync(ledgerFile, "utf8"));
  const def = JSON.parse(fs.readFileSync(defFile, "utf8"));
  const block = def.lattice.block, size = [def.grid.cols, def.grid.rows];
  const pyr = A + `tiles/l2-${t}-r1`, outDir = A + `tiles/l2-${t}`;
  const base = `/career-world/layers/terrain/authority/tiles/l2-${t}/`;
  if (!DRY) fs.mkdirSync(outDir, { recursive: true });
  let sliced = 0, kept = 0;
  for (const id of Object.keys(ledger.cells).sort()) {
    const [col, row] = id.slice(1).split("-").map(Number);
    const world = [block[0] + col, block[1] + row];
    if (world[0] >= COLS || world[1] >= ROWS) throw new Error(`${t} ${id} lies outside the ${COLS} x ${ROWS} lattice`);
    const key = world.join(",");
    if (occupied.has(key)) throw new Error(`${t} ${id} shares lattice cell [${key}] with ${occupied.get(key)}`);
    occupied.set(key, `${t} ${id}`);
    const cap = `${id}-capital.webp`, site = `${id}-site.webp`;
    const capFile = path.join(outDir, cap), siteFile = path.join(outDir, site);
    const l1 = await cellImage(pyr, 1, col, row), l0 = await cellImage(pyr, 0, col, row);
    const stale = FORCE || !fs.existsSync(capFile) || !fs.existsSync(siteFile)
      || fs.statSync(capFile).mtimeMs < l1.newest || fs.statSync(siteFile).mtimeMs < l0.newest;
    if (stale) {
      if (!DRY) {
        await l1.image.webp({ quality: 90, alphaQuality: 100 }).toFile(capFile);
        await l0.image.webp({ quality: 90, alphaQuality: 100 }).toFile(siteFile);
      }
      sliced += 1;
    } else kept += 1;
    tiles.push({
      id: t === "ninjaone" ? `l2-${id}` : `l2-${t}-${id}`,
      minimumTier: "capital",
      sources: {
        capital: { path: base + cap, dimensions: [1024, 1024], decodedBytes: 1024 * 1024 * 4 },
        site: { path: base + site, dimensions: [2048, 2048], decodedBytes: 2048 * 2048 * 4 },
      },
      worldBounds: { origin: [world[0] / COLS, world[1] / ROWS], span: CELL_SPAN },
    });
  }
  registered.push({ t, ledgerFile, ledger, block, size, sparse: Boolean(def.coastCells) });
  summary.push(`${t}: ${Object.keys(ledger.cells).length} cells at block [${block}] (${size[0]} x ${size[1]}${def.coastCells ? ", sparse" : ""}) — ${sliced} ${DRY ? "would be " : ""}sliced, ${kept} unchanged`);
}

const feed = {
  schemaVersion: 1,
  id: previous.id,
  coordinateSpace: "normalized-world-top-left",
  source: registered.map(({ t }) => `career-world/terrain-l2-${t}@r1`).join(" + "),
  note: "The authored L2 land, registered on the world lattice: every territory with a ledger, "
    + "each authored cell sliced from its stitched pyramid (site = L0, capital = L1). "
    + "Cells not yet baked are sea. Written by docs/career-world/session3-tools/world-register.mjs.",
  streaming: previous.streaming,
  tiles,
};
if (!DRY) {
  fs.writeFileSync(FEED, JSON.stringify(feed, null, 2) + "\n");
  for (const { t, ledgerFile, ledger, block, size, sparse } of registered) {
    ledger.registration = {
      status: "registered",
      lattice: { cols: COLS, rows: ROWS, cellWorldPx: 217 },
      block: { origin: block, size },
      worldBounds: { origin: [block[0] / COLS, block[1] / ROWS], span: [size[0] / COLS, size[1] / ROWS] },
      ruling: "owner 2026-09-03: the authored grid is authoritative and expands as needed"
        + (sparse ? "; sparse — only the planned shore cells are baked and registered (owner 2026-09-04: coasts are authored in the sea cells beside the island)" : ""),
      feed: path.basename(FEED),
    };
    fs.writeFileSync(ledgerFile, JSON.stringify(ledger, null, 2) + "\n");
  }
}
for (const line of summary) console.log(line);
console.log(`${DRY ? "WOULD WRITE" : "WROTE"} the release feed: ${tiles.length} tiles (was ${previous.tiles.length})`);
