// Dev-only runtime feed for the L2 land pyramid (owner OK 2026-09-02: "test the LoD").
// Writes, for every authored cell, a capital-tier image (the cell at L3, 256 px) and a
// site-tier image (the cell at L1, 1024 px) as webp under tiles/l2-ninjaone-dev/, and a
// stream manifest in the runtime's r4 schema with the cell's world bounds under a dev
// placement at the intended registration density (9.45 art px per world-plate px).
// Nothing here touches the solidified pipeline or its outputs; it READS the pyramid.
import sharp from "sharp"; import fs from "node:fs"; import path from "node:path";
sharp.cache(false);
const PYR = "public/career-world/layers/terrain/authority/tiles/l2-ninjaone-r1";
const OUT_DIR = "public/career-world/layers/terrain/authority/tiles/l2-ninjaone-dev";
const OUT_MANIFEST = "public/career-world/layers/terrain/authority/manifests/terrain-stream-runtime-l2dev.json";
const ledger = JSON.parse(fs.readFileSync("public/career-world/layers/terrain/authority/manifests/terrain-l2-ninjaone-r1.json", "utf8"));
const r4 = JSON.parse(fs.readFileSync("public/career-world/layers/terrain/authority/manifests/terrain-stream-runtime-r4.json", "utf8"));
const TILE = 256, CELL = 2048;
// world plate (normalized 0..1 over 6688 x 3764 plate px); dev placement inside NinjaOne's focus view
const PLATE = [6688, 3764], ART_PER_PLATE = ledger.contract.artPxPerWorldPx;   // 9.45
const cellSpan = [CELL / ART_PER_PLATE / PLATE[0], CELL / ART_PER_PLATE / PLATE[1]];
const ORIGIN = [0.38, 0.22];   // top-left of cell 0,0 in normalized world space (dev only) - outside the capital envelope (0.125-0.375 x 0-0.333), whose city and environment plates draw over the terrain canvas
fs.mkdirSync(OUT_DIR, { recursive: true });
async function cellImage(level, col, row) {   // the cell's kept 2048 art px at this level
  const s = 2 ** level, size = CELL / s, x0 = col * CELL / s, y0 = row * CELL / s;
  const dir = path.join(PYR, `L${level}`), comps = [];
  const ax0 = Math.floor(x0 / TILE) * TILE, ay0 = Math.floor(y0 / TILE) * TILE, ax1 = Math.ceil((x0 + size) / TILE) * TILE, ay1 = Math.ceil((y0 + size) / TILE) * TILE;
  for (const f of fs.readdirSync(dir)) { const [tx, ty] = f.replace(".webp", "").split("-").map(Number); const px = tx * TILE, py = ty * TILE;
    if (px >= ax1 || py >= ay1 || px + TILE <= ax0 || py + TILE <= ay0) continue; comps.push({ input: path.join(dir, f), left: px - ax0, top: py - ay0 }); }
  const full = await sharp({ create: { width: ax1 - ax0, height: ay1 - ay0, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(comps).png().toBuffer();
  return sharp(full).extract({ left: x0 - ax0, top: y0 - ay0, width: size, height: size });
}
const tiles = [];
for (const id of Object.keys(ledger.cells).sort()) {
  const [col, row] = id.slice(1).split("-").map(Number);
  const cap = `${id}-capital.webp`, site = `${id}-site.webp`;
  await (await cellImage(3, col, row)).webp({ quality: 90, alphaQuality: 100 }).toFile(path.join(OUT_DIR, cap));
  await (await cellImage(1, col, row)).webp({ quality: 90, alphaQuality: 100 }).toFile(path.join(OUT_DIR, site));
  const base = "/career-world/layers/terrain/authority/tiles/l2-ninjaone-dev/";
  tiles.push({ id: `l2dev-${id}`, minimumTier: "capital",
    sources: { capital: { path: base + cap, dimensions: [256, 256], decodedBytes: 256 * 256 * 4 },
               site: { path: base + site, dimensions: [1024, 1024], decodedBytes: 1024 * 1024 * 4 } },
    worldBounds: { origin: [ORIGIN[0] + col * cellSpan[0], ORIGIN[1] + row * cellSpan[1]], span: cellSpan } });
  console.log(id, "written");
}
const manifest = { schemaVersion: 1, id: "career-world/terrain-stream-runtime@r4", coordinateSpace: "normalized-world-top-left",
  devNote: "DEV ONLY - the L2 land pyramid (l2-ninjaone-r1) fed to the stream renderer at a dev placement; not a registration",
  streaming: r4.streaming, tiles };
fs.writeFileSync(OUT_MANIFEST, JSON.stringify(manifest, null, 2));
console.log("manifest:", OUT_MANIFEST, tiles.length, "cells; cell span", cellSpan.map((v) => v.toFixed(4)).join(" x "), "; territory spans", (5 * cellSpan[0]).toFixed(3), "x", (4 * cellSpan[1]).toFixed(3));
