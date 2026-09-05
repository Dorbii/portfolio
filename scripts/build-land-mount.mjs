import fs from "node:fs/promises";
import sharp from "sharp";
import crypto from "node:crypto";

const root = "public/career-world/layers/terrain/authority";
const releasePath = `${root}/manifests/terrain-stream-runtime-r4.json`;
const releaseBytes = await fs.readFile(releasePath);
const release = JSON.parse(releaseBytes);
const mount = JSON.parse(await fs.readFile("art-source/career-world/land-mount-r1.json", "utf8"));
const hash = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const tiles = [...release.tiles], candidates = [];
for (const cell of mount.cells) {
  const ledger = JSON.parse(await fs.readFile(`${root}/manifests/terrain-l2-${cell.territory}-r1.json`, "utf8"));
  if (release.tiles.some((tile) => tile.sources.site.path.includes(`/l2-${cell.territory}/${cell.id}-site.`))) continue;
  const canonical = await fs.readFile(`public${cell.canonicalPath}`);
  if (hash(canonical) !== cell.canonicalSha256) throw new Error(`Candidate snapshot changed: ${cell.id}`);
  const [, x, y] = /^c(\d+)-(\d+)$/.exec(cell.id);
  const { lattice, block } = ledger.registration;
  const capitalPath = cell.canonicalPath.replace("-site.webp", "-capital.webp");
  await sharp(canonical).resize(1024, 1024).webp({ quality: 95, alphaQuality: 100 }).toFile(`public${capitalPath}`);
  const tile = { id: `l2-review-${cell.territory}-${cell.id}`, minimumTier: "capital", status: "review-candidate",
    sources: { capital: { path: capitalPath, dimensions: [1024, 1024], decodedBytes: 1024 * 1024 * 4 },
      site: { path: cell.canonicalPath, dimensions: [2048, 2048], decodedBytes: 2048 * 2048 * 4 } },
    worldBounds: { origin: [(block.origin[0] + Number(x)) / lattice.cols, (block.origin[1] + Number(y)) / lattice.rows],
      span: [1 / lattice.cols, 1 / lattice.rows] } };
  tiles.push(tile); candidates.push({ id: tile.id, sourceSha256: cell.sourceSha256, canonicalSha256: cell.canonicalSha256 });
}
const inputHash = hash(Buffer.from(JSON.stringify({ release: hash(releaseBytes), candidates })));
const manifest = { ...release, source: `${release.source} + owner-requested candidate mounts`,
  note: "Local land mount. Candidate entries are preview snapshots, not authoring acceptance. Registered art/pyramid files remain unchanged.",
  baseReleaseHash: hash(releaseBytes), inputHash, candidates, tiles };
await fs.writeFile(`${root}/manifests/terrain-local-mount-r1.json`, JSON.stringify(manifest, null, 2) + "\n");
const width = 6656, height = 3744, overlays = [];
for (const tile of tiles) {
  const { origin, span } = tile.worldBounds;
  const left = Math.round(origin[0] * width), top = Math.round(origin[1] * height);
  const w = Math.round((origin[0] + span[0]) * width) - left, h = Math.round((origin[1] + span[1]) * height) - top;
  overlays.push({ input: await sharp(`public${tile.sources.site.path}`).resize(w, h).png().toBuffer(), left, top });
}
const detail = await sharp({ create: { width, height, channels: 4, background: "#00000000" } }).composite(overlays).png().toBuffer();
await fs.writeFile(`${root}/textures/world-land-detail-4x-r1.png`, detail);
const world = await sharp(detail).resize(1664, 936).png().toBuffer();
await fs.writeFile(`${root}/textures/world-land-r1.png`, world);
const mask = await sharp(world).extractChannel(3).threshold(128).toColourspace("b-w").png().toBuffer();
await fs.writeFile(`${root}/masks/world-land-mask-r5.png`, mask);
await fs.writeFile(`${root}/manifests/terrain-overviews-r1.json`, JSON.stringify({ source: "terrain-local-mount-r1.json", inputHash,
  world: { path: `/career-world/layers/terrain/authority/textures/world-land-r1.png?v=${inputHash.slice(0, 16)}`, dimensions: [1664, 936], sha256: hash(world) },
  territory: { path: `/career-world/layers/terrain/authority/textures/world-land-detail-4x-r1.png?v=${inputHash.slice(0, 16)}`, dimensions: [width, height], sha256: hash(detail) },
  mask: { path: "/career-world/layers/terrain/authority/masks/world-land-mask-r5.png", sha256: hash(mask) },
}, null, 2) + "\n");
console.log(`Mounted ${release.tiles.length} published cells + ${candidates.length} candidate snapshots; both overview levels derived.`);
