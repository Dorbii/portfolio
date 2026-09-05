import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

sharp.cache(false);
sharp.concurrency(4);
const SIZE = 4096, CORE = SIZE - 1;
const FLOOR_PERIOD = 256, DETAIL_PERIOD = 288;
const FLOOR_SOURCE = "public/career-world/layers/water/ocean/seabed/seabed-albedo-r1.png";
const DETAIL_SOURCE = "public/career-world/layers/water/ocean/details/ocean-details-r1.png";
const LABEL_SOURCE = "public/career-world/layers/water/ocean/details/ocean-detail-labels-r1.png";
const LAYOUT_SOURCE = "public/career-world/layers/water/ocean/details/ocean-detail-layout-r1.json";
const FLOOR_OUT = "public/career-world/layers/water/ocean/seabed/seabed-varied-r1.webp";
const DETAIL_OUT = "public/career-world/layers/water/ocean/details/ocean-details-scattered-r1.webp";
const MANIFEST_OUT = "public/career-world/layers/water/ocean/layout-textures-r1.json";
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const smooth = (value) => value * value * (3 - 2 * value);
const rngFor = (initial) => {
  let state = initial >>> 0;
  return () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
};
const sourceFiles = [FLOOR_SOURCE, DETAIL_SOURCE, LABEL_SOURCE, LAYOUT_SOURCE];
const sourceBytes = new Map(await Promise.all(sourceFiles.map(async (file) => [file, await fs.readFile(file)])));
const sourceHashes = Object.fromEntries(sourceFiles.map((file) => [file, sha(sourceBytes.get(file))]));

const { data: floorSource, info: floorInfo } = await sharp(sourceBytes.get(FLOOR_SOURCE)).raw().toBuffer({ resolveWithObject: true });
if (floorInfo.channels !== 3) throw new Error("Floor source must be RGB.");
const floorRng = rngFor(0x2560f10a), floorCells = 8;
const floorSites = Array.from({ length: floorCells * floorCells }, (_, index) => {
  const gx = index % floorCells, gy = Math.floor(index / floorCells);
  return { x: (gx + 0.5 + (floorRng() - 0.5) * 0.38) / floorCells,
    y: (gy + 0.5 + (floorRng() - 0.5) * 0.38) / floorCells,
    ox: 0.5 + (floorRng() - 0.5) * 0.10, oy: 0.5 + (floorRng() - 0.5) * 0.10,
    turn: Math.floor(floorRng() * 4), mirror: floorRng() < 0.5 };
});
const sourcePixel = (site, dx, dy, channel) => {
  let px = dx * (FLOOR_PERIOD / 64), py = dy * (FLOOR_PERIOD / 64);
  if (site.mirror) px = -px;
  for (let turn = 0; turn < site.turn; turn++) [px, py] = [-py, px];
  const x = clamp((site.ox + px) * (floorInfo.width - 1), 0, floorInfo.width - 1);
  const y = clamp((site.oy + py) * (floorInfo.height - 1), 0, floorInfo.height - 1);
  const x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(x0 + 1, floorInfo.width - 1), y1 = Math.min(y0 + 1, floorInfo.height - 1);
  const tx = x - x0, ty = y - y0;
  const at = (sx, sy) => floorSource[(sy * floorInfo.width + sx) * 3 + channel];
  return (at(x0, y0) * (1 - tx) + at(x1, y0) * tx) * (1 - ty) + (at(x0, y1) * (1 - tx) + at(x1, y1) * tx) * ty;
};
const floor = Buffer.alloc(SIZE * SIZE * 3);
for (let y = 0; y < SIZE; y++) {
  const v = y / CORE, cellY = Math.floor(v * floorCells) % floorCells;
  for (let x = 0; x < SIZE; x++) {
    const u = x / CORE, cellX = Math.floor(u * floorCells) % floorCells;
    let nearest, second, d1 = Infinity, d2 = Infinity, dx1 = 0, dy1 = 0, dx2 = 0, dy2 = 0;
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const gx = (cellX + ox + floorCells) % floorCells, gy = (cellY + oy + floorCells) % floorCells;
      const site = floorSites[gy * floorCells + gx];
      let dx = u - site.x, dy = v - site.y;
      dx -= Math.round(dx); dy -= Math.round(dy);
      const distance = dx * dx + dy * dy;
      if (distance < d1) { second = nearest; d2 = d1; dx2 = dx1; dy2 = dy1; nearest = site; d1 = distance; dx1 = dx; dy1 = dy; }
      else if (distance < d2) { second = site; d2 = distance; dx2 = dx; dy2 = dy; }
    }
    const edgeDistance = Math.sqrt(d2) - Math.sqrt(d1);
    const blend = 0.5 + 0.5 * smooth(clamp(edgeDistance / 0.012, 0, 1));
    const offset = (y * SIZE + x) * 3;
    for (let channel = 0; channel < 3; channel++)
      floor[offset + channel] = Math.round(sourcePixel(second, dx2, dy2, channel) * (1 - blend) + sourcePixel(nearest, dx1, dy1, channel) * blend);
  }
  if (y % 512 === 0) console.log(`floor ${y}/${SIZE}`);
}
await fs.mkdir(path.dirname(FLOOR_OUT), { recursive: true });
await sharp(floor, { raw: { width: SIZE, height: SIZE, channels: 3 } }).webp({ quality: 96, effort: 4 }).toFile(FLOOR_OUT);

const detailLayout = JSON.parse(sourceBytes.get(LAYOUT_SOURCE).toString("utf8"));
if (detailLayout.sourceHash !== sourceHashes[DETAIL_SOURCE]) throw new Error("Detail layout is stale against its source atlas.");
const { data: detailSource, info: detailInfo } = await sharp(sourceBytes.get(DETAIL_SOURCE)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { data: labelSource, info: labelInfo } = await sharp(sourceBytes.get(LABEL_SOURCE)).raw().toBuffer({ resolveWithObject: true });
if (detailInfo.width !== labelInfo.width || detailInfo.height !== labelInfo.height || labelInfo.channels !== 3) throw new Error("Detail labels do not match the RGBA atlas.");
const spritePixels = new Map();
for (const sprite of detailLayout.sprites) {
  const [left, top, width, height] = sprite.rect, pixels = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const sourceOffset = ((top + y) * detailInfo.width + left + x), targetOffset = (y * width + x) * 4;
    if (labelSource[sourceOffset * 3] !== sprite.id) continue;
    detailSource.copy(pixels, targetOffset, sourceOffset * 4, sourceOffset * 4 + 4);
  }
  spritePixels.set(sprite.id, { pixels, width, height });
}
const detailRng = rngFor(0x2880c0a1), siteCount = 24, spacing = CORE / siteCount;
const placements = [];
for (let gy = 0; gy < siteCount; gy++) for (let gx = 0; gx < siteCount; gx++) {
  const wave = Math.sin((gx + 0.7 * gy) * Math.PI / 6) * 0.12 + Math.cos((gy - 0.35 * gx) * Math.PI / 8) * 0.07;
  const admission = clamp(0.78 + wave, 0.56, 0.96);
  if (detailRng() > admission) continue;
  const sprite = detailLayout.sprites[Math.floor(detailRng() * detailLayout.sprites.length)];
  placements.push({ sprite, x: (gx + 0.5 + (detailRng() - 0.5) * 0.72) * spacing,
    y: (gy + 0.5 + (detailRng() - 0.5) * 0.72) * spacing,
    scale: 0.65 + detailRng() * 0.60, angle: (detailRng() - 0.5) * 16, mirror: detailRng() < 0.5 });
}
const overlays = [];
const baseScale = (CORE / DETAIL_PERIOD) / (detailInfo.width / 64);
for (let index = 0; index < placements.length; index++) {
  const placement = placements[index], source = spritePixels.get(placement.sprite.id);
  const width = Math.max(1, Math.round(source.width * baseScale * placement.scale));
  const height = Math.max(1, Math.round(source.height * baseScale * placement.scale));
  let pipeline = sharp(source.pixels, { raw: { width: source.width, height: source.height, channels: 4 } }).resize(width, height, { kernel: "lanczos3" });
  if (placement.mirror) pipeline = pipeline.flop();
  const transformed = await pipeline.rotate(placement.angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer({ resolveWithObject: true });
  const left = Math.round(placement.x - transformed.info.width / 2), top = Math.round(placement.y - transformed.info.height / 2);
  for (const wrapY of [-CORE, 0, CORE]) for (const wrapX of [-CORE, 0, CORE]) {
    const px = left + wrapX, py = top + wrapY;
    if (px < CORE && py < CORE && px + transformed.info.width > 0 && py + transformed.info.height > 0)
      overlays.push({ input: transformed.data, left: px, top: py });
  }
  if (index % 64 === 0) console.log(`details ${index}/${placements.length}`);
}
const coreDetail = await sharp({ create: { width: CORE, height: CORE, channels: 4, background: "#00000000" } })
  .composite(overlays).raw().toBuffer();
const detail = Buffer.alloc(SIZE * SIZE * 4);
for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
  const sourceOffset = ((y % CORE) * CORE + (x % CORE)) * 4;
  coreDetail.copy(detail, (y * SIZE + x) * 4, sourceOffset, sourceOffset + 4);
}
await fs.mkdir(path.dirname(DETAIL_OUT), { recursive: true });
await sharp(detail, { raw: { width: SIZE, height: SIZE, channels: 4 } })
  .webp({ quality: 96, alphaQuality: 100, effort: 4 }).toFile(DETAIL_OUT);

for (const file of sourceFiles) if (sha(await fs.readFile(file)) !== sourceHashes[file]) throw new Error(`Source changed during layout build: ${file}`);
const floorBytes = await fs.readFile(FLOOR_OUT), detailBytes = await fs.readFile(DETAIL_OUT);
const manifest = { version: 1, sources: Object.fromEntries(sourceFiles.map((file) => [file, sourceHashes[file]])),
  outputs: { floor: { path: "/career-world/layers/water/ocean/seabed/seabed-varied-r1.webp", dimensions: [SIZE, SIZE], metrePeriod: FLOOR_PERIOD, sha256: sha(floorBytes) },
    details: { path: "/career-world/layers/water/ocean/details/ocean-details-scattered-r1.webp", dimensions: [SIZE, SIZE], metrePeriod: DETAIL_PERIOD, sha256: sha(detailBytes) } },
  layout: { floorCells: [floorCells, floorCells], detailPotentialSites: siteCount * siteCount, detailPlacements: placements.length,
    detailScaleRange: [0.65, 1.25], detailRotationDegrees: [-8, 8], floorSeed: "0x2560f10a", detailSeed: "0x2880c0a1" } };
await fs.writeFile(MANIFEST_OUT, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest));
