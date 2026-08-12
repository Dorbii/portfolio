import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

import {
  NINJAONE_STATION_RIVER_ENVELOPE,
  NINJAONE_STATION_RIVER_PATHS,
  layoutContractSha256,
  sha256,
} from "./lib/ninjaone-station-river-detail-contract.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE_SCALE = 2;
const TILE_COLUMNS = 2;
const TILE_ROWS = 2;
const SOURCE_PROVENANCE =
  "art-source/career-world/ninjaone-capital/station-river-detail-r1/source-provenance-r1.json";
const OUTPUT_ROOT =
  "public/career-world/capitals/ninjaone/city-r1/detail/station-river-r1";
const OUTPUT_MANIFEST =
  "public/career-world/capitals/ninjaone/manifests/station-river-detail-r1.json";
const OUTPUT_PROOF =
  "public/career-world/capitals/ninjaone/city-r1/qa/station-river-detail-proof-r1.webp";
const LEGACY_OUTPUT_PROOF =
  "public/career-world/capitals/ninjaone/city-r1/qa/station-river-detail-proof-r1.png";
const absolute = (relativePath) => path.join(ROOT, relativePath);
const publicPath = (assetPath) => absolute(path.join(
  "public",
  assetPath.replace(/^\//, ""),
));

async function json(relativePath) {
  return JSON.parse(await readFile(absolute(relativePath), "utf8"));
}

function assertHash(bytes, expected, label) {
  const actual = sha256(bytes);
  if (actual !== expected.toLowerCase()) {
    throw new TypeError(`${label} SHA-256 ${actual} does not match ${expected}.`);
  }
}

function mirrorIndex(value, size) {
  const period = size * 2;
  const wrapped = ((value % period) + period) % period;
  return wrapped < size ? wrapped : period - 1 - wrapped;
}

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

async function registeredCrop(assetPath, envelope, outputWidth, outputHeight) {
  return sharp(publicPath(assetPath))
    .extract({
      height: envelope.height,
      left: envelope.left,
      top: envelope.top,
      width: envelope.width,
    })
    .resize(outputWidth, outputHeight, {
      fit: "fill",
      kernel: sharp.kernel.lanczos3,
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
}

async function registeredCropPng(assetPath, envelope, outputWidth, outputHeight) {
  return sharp(publicPath(assetPath))
    .extract({
      height: envelope.height,
      left: envelope.left,
      top: envelope.top,
      width: envelope.width,
    })
    .resize(outputWidth, outputHeight, {
      fit: "fill",
      kernel: sharp.kernel.lanczos3,
    })
    .ensureAlpha()
    .png()
    .toBuffer();
}

async function clippedPlacement(assetPath, displayWidth, anchor, groundAnchor) {
  const metadata = await sharp(publicPath(assetPath)).metadata();
  if (!metadata.width || !metadata.height) {
    throw new TypeError(`${assetPath} has no readable dimensions.`);
  }
  const targetWidth = Math.round(displayWidth * SOURCE_SCALE);
  const targetHeight = Math.round(
    displayWidth * metadata.height / metadata.width * SOURCE_SCALE,
  );
  const left = Math.round(
    (anchor[0] - displayWidth * groundAnchor[0] - envelope.left) * SOURCE_SCALE,
  );
  const top = Math.round(
    (anchor[1] - targetHeight / SOURCE_SCALE * groundAnchor[1] - envelope.top)
      * SOURCE_SCALE,
  );
  const cropLeft = Math.max(0, -left);
  const cropTop = Math.max(0, -top);
  const visibleLeft = Math.max(0, left);
  const visibleTop = Math.max(0, top);
  const visibleWidth = Math.min(targetWidth - cropLeft, outputWidth - visibleLeft);
  const visibleHeight = Math.min(targetHeight - cropTop, outputHeight - visibleTop);
  if (visibleWidth <= 0 || visibleHeight <= 0) return null;
  const input = await sharp(publicPath(assetPath))
    .resize(targetWidth, targetHeight, {
      fit: "fill",
      kernel: sharp.kernel.lanczos3,
    })
    .extract({
      height: visibleHeight,
      left: cropLeft,
      top: cropTop,
      width: visibleWidth,
    })
    .ensureAlpha()
    .png()
    .toBuffer();
  return { input, left: visibleLeft, top: visibleTop };
}

async function terrainProofBase(cityManifest) {
  const terrain = cityManifest.terrainBinding.regionalTerrainMaster;
  const [left, top, right, bottom] = terrain.capitalPixelBounds;
  const artboard = cityManifest.artboard.dimensions;
  const fullRegistered = await sharp(absolute(terrain.repoPath))
    .extract({ height: bottom - top, left, top, width: right - left })
    .resize(artboard[0], artboard[1], {
      fit: "fill",
      kernel: sharp.kernel.lanczos3,
    })
    .modulate({ brightness: 0.72, saturation: 0.88 })
    .ensureAlpha()
    .composite([{
      blend: "over",
      input: {
        create: {
          background: { alpha: 28 / 255, b: 9, g: 9, r: 5 },
          channels: 4,
          height: artboard[1],
          width: artboard[0],
        },
      },
    }])
    .png()
    .toBuffer();
  return sharp(fullRegistered)
    .extract({
      height: envelope.height,
      left: envelope.left,
      top: envelope.top,
      width: envelope.width,
    })
    .resize(outputWidth, outputHeight, {
      fit: "fill",
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer();
}

async function materialBuffers(sourcePath) {
  const dimensions = 1024;
  const material = sharp(absolute(sourcePath))
    .resize(dimensions, dimensions, {
      fit: "cover",
      kernel: sharp.kernel.lanczos3,
      position: "centre",
    })
    .removeAlpha();
  const [detail, low] = await Promise.all([
    material.clone().raw().toBuffer(),
    material.clone().blur(14).raw().toBuffer(),
  ]);
  return { detail, dimensions, low };
}

const [city, water, lock, provenance] = await Promise.all([
  json(NINJAONE_STATION_RIVER_PATHS.cityManifest),
  json(NINJAONE_STATION_RIVER_PATHS.waterManifest),
  json(NINJAONE_STATION_RIVER_PATHS.fixture),
  json(SOURCE_PROVENANCE),
]);

if (layoutContractSha256(city, water) !== lock.layoutContractSha256) {
  throw new TypeError("Station/river layout contract drifted before detail composition.");
}

for (const source of provenance.sources) {
  assertHash(await readFile(absolute(source.path)), source.sha256, source.id);
}
assertHash(
  await readFile(publicPath(lock.geometryLock.path)),
  lock.geometryLock.sha256,
  "geometry lock",
);
assertHash(
  await readFile(publicPath(lock.treatmentMask.path)),
  lock.treatmentMask.sha256,
  "treatment mask",
);

const envelope = NINJAONE_STATION_RIVER_ENVELOPE;
const outputWidth = envelope.width * SOURCE_SCALE;
const outputHeight = envelope.height * SOURCE_SCALE;
const [underlay, contact, treatment, geometry, stone, bank] = await Promise.all([
  registeredCrop(city.cityFabric.underlay.path, envelope, outputWidth, outputHeight),
  registeredCrop(city.cityFabric.contactLayer.path, envelope, outputWidth, outputHeight),
  sharp(publicPath(lock.treatmentMask.path))
    .resize(outputWidth, outputHeight, { fit: "fill", kernel: sharp.kernel.nearest })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true }),
  sharp(publicPath(lock.geometryLock.path))
    .resize(outputWidth, outputHeight, { fit: "fill", kernel: sharp.kernel.nearest })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true }),
  materialBuffers(provenance.sources.find(({ id }) => (
    id === "station-river-cobblestone-material"
  )).path),
  materialBuffers(provenance.sources.find(({ id }) => (
    id === "station-river-wet-bank-material"
  )).path),
]);

const output = Buffer.alloc(outputWidth * outputHeight * 4);
let outputAlphaPixels = 0;
let protectedWaterOverlapPixels = 0;
let outsideTreatmentPixels = 0;
let maximumDetailDelta = 0;
for (let y = 0; y < outputHeight; y += 1) {
  for (let x = 0; x < outputWidth; x += 1) {
    const pixel = y * outputWidth + x;
    const offset = pixel * 4;
    const treatmentAlpha = treatment.data[offset + 3] / 255;
    const fabricWeight = treatment.data[offset] / 255 * treatmentAlpha;
    const bankWeight = treatment.data[offset + 1] / 255 * treatmentAlpha;
    const stationWeight = treatment.data[offset + 2] / 255 * treatmentAlpha;
    const protectedWater = geometry.data[offset] >= 128;
    if (treatmentAlpha <= 0 || protectedWater) continue;

    const stoneX = mirrorIndex(x + 173, stone.dimensions);
    const stoneY = mirrorIndex(y + 317, stone.dimensions);
    const stoneOffset = (stoneY * stone.dimensions + stoneX) * 3;
    const bankX = mirrorIndex(x + 547, bank.dimensions);
    const bankY = mirrorIndex(y + 83, bank.dimensions);
    const bankOffset = (bankY * bank.dimensions + bankX) * 3;
    const base = fabricWeight > 0.04 ? underlay.data : contact.data;
    const coverage = Math.max(
      fabricWeight * (0.56 + stationWeight * 0.12),
      bankWeight * 0.42,
      stationWeight * 0.64,
    );
    if (coverage <= 0) continue;

    for (let channel = 0; channel < 3; channel += 1) {
      const stoneHigh = stone.detail[stoneOffset + channel]
        - stone.low[stoneOffset + channel];
      const bankHigh = bank.detail[bankOffset + channel]
        - bank.low[bankOffset + channel];
      const detail = stoneHigh * (fabricWeight * 0.78 + stationWeight * 0.18)
        + bankHigh * bankWeight * 0.66;
      const baseValue = base[offset + channel];
      output[offset + channel] = clampByte(baseValue + detail);
      maximumDetailDelta = Math.max(maximumDetailDelta, Math.abs(detail * coverage));
    }
    output[offset + 3] = clampByte(coverage * 255);
    if (output[offset + 3] > 0) outputAlphaPixels += 1;
    if (protectedWater && output[offset + 3] > 0) protectedWaterOverlapPixels += 1;
    if (treatmentAlpha <= 0 && output[offset + 3] > 0) outsideTreatmentPixels += 1;
  }
}

if (protectedWaterOverlapPixels !== 0 || outsideTreatmentPixels !== 0) {
  throw new TypeError("Generated detail escaped its deterministic treatment support.");
}

const outputPng = await sharp(output, {
  raw: { channels: 4, height: outputHeight, width: outputWidth },
}).png({ adaptiveFiltering: true, compressionLevel: 9 }).toBuffer();

const tileSourceWidth = outputWidth / TILE_COLUMNS;
const tileSourceHeight = outputHeight / TILE_ROWS;
const tileDisplayWidth = envelope.width / TILE_COLUMNS;
const tileDisplayHeight = envelope.height / TILE_ROWS;
const tiles = [];
await mkdir(absolute(OUTPUT_ROOT), { recursive: true });
await Promise.all(Array.from({ length: TILE_ROWS }, (_, row) => (
  Array.from({ length: TILE_COLUMNS }, (_, column) => rm(absolute(
    `${OUTPUT_ROOT}/station-river-detail-r${row}-c${column}-r1.png`,
  ), { force: true }))
)).flat());
for (let row = 0; row < TILE_ROWS; row += 1) {
  for (let column = 0; column < TILE_COLUMNS; column += 1) {
    const id = `r${row}-c${column}`;
    const relativePath = `${OUTPUT_ROOT}/station-river-detail-${id}-r1.webp`;
    const bytes = await sharp(outputPng)
      .extract({
        height: tileSourceHeight,
        left: column * tileSourceWidth,
        top: row * tileSourceHeight,
        width: tileSourceWidth,
      })
      .webp({ alphaQuality: 100, effort: 6, lossless: true })
      .toBuffer();
    await writeFile(absolute(relativePath), bytes);
    tiles.push({
      decodedBytes: tileSourceWidth * tileSourceHeight * 4,
      displayDimensions: [tileDisplayWidth, tileDisplayHeight],
      encodedBytes: bytes.length,
      id,
      localOrigin: [
        envelope.left + column * tileDisplayWidth,
        envelope.top + row * tileDisplayHeight,
      ],
      path: `/${relativePath.replace(/^public\//, "")}`,
      sha256: sha256(bytes),
      sourceDimensions: [tileSourceWidth, tileSourceHeight],
    });
  }
}

const proofBase = await terrainProofBase(city);
const registeredProofLayers = await Promise.all([
  registeredCropPng(city.cityFabric.contactLayer.path, envelope, outputWidth, outputHeight),
  registeredCropPng(city.cityFabric.underlay.path, envelope, outputWidth, outputHeight),
  registeredCropPng(city.transport.rail.supportLayer.path, envelope, outputWidth, outputHeight),
  registeredCropPng(city.transport.rail.bedLayer.path, envelope, outputWidth, outputHeight),
  registeredCropPng(city.transport.rail.trackLayer.path, envelope, outputWidth, outputHeight),
  registeredCropPng(city.cityFabric.foreground.path, envelope, outputWidth, outputHeight),
  registeredCropPng(
    city.cityFabric.environmentTransitionDetail.path,
    envelope,
    outputWidth,
    outputHeight,
  ),
]);
const station = city.transport.station;
const stationPlacement = await clippedPlacement(
  station.path,
  station.displayWidth,
  [
    station.localPosition.x * city.artboard.dimensions[0],
    station.localPosition.y * city.artboard.dimensions[1],
  ],
  station.groundAnchor,
);
const nodePlacements = (await Promise.all(
  [...city.nodes]
    .filter(({ assetNodeReady }) => assetNodeReady)
    .sort((leftNode, rightNode) => (
      leftNode.localPosition.y + leftNode.zBias
      - rightNode.localPosition.y - rightNode.zBias
    ))
    .map((node) => clippedPlacement(
      node.posterPath,
      node.displayWidth,
      [
        node.localPosition.x * city.artboard.dimensions[0],
        node.localPosition.y * city.artboard.dimensions[1],
      ],
      node.groundAnchor,
    )),
)).filter(Boolean);
const proof = await sharp(proofBase)
  .composite([
    { input: registeredProofLayers[0], blend: "over" },
    { input: registeredProofLayers[1], blend: "over" },
    { input: outputPng, blend: "over" },
    { input: registeredProofLayers[2], blend: "over" },
    { input: registeredProofLayers[3], blend: "over" },
    { input: registeredProofLayers[4], blend: "over" },
    ...(stationPlacement ? [stationPlacement] : []),
    ...nodePlacements,
    { input: registeredProofLayers[5], blend: "over" },
    { input: registeredProofLayers[6], blend: "over" },
  ])
  .webp({ alphaQuality: 100, effort: 6, lossless: true })
  .toBuffer();
await mkdir(path.dirname(absolute(OUTPUT_PROOF)), { recursive: true });
await rm(absolute(LEGACY_OUTPUT_PROOF), { force: true });
await writeFile(absolute(OUTPUT_PROOF), proof);

const manifest = {
  schemaVersion: 1,
  id: "career-world/capitals/ninjaone/station-river-detail@r1",
  status: "bounded-runtime-proof",
  sourceScale: SOURCE_SCALE,
  minimumDetailTier: "site",
  layoutLock: {
    baseCommit: lock.baseCommit,
    fixturePath: `/${NINJAONE_STATION_RIVER_PATHS.fixture}`,
    layoutContractSha256: lock.layoutContractSha256,
  },
  envelope,
  sourceProvenance: {
    path: `/${SOURCE_PROVENANCE}`,
    sha256: sha256(await readFile(absolute(SOURCE_PROVENANCE))),
  },
  geometryLock: lock.geometryLock,
  treatmentMask: lock.treatmentMask,
  tiles,
  proof: {
    path: `/${OUTPUT_PROOF.replace(/^public\//, "")}`,
    sha256: sha256(proof),
  },
  metrics: {
    maximumDetailDelta: Number(maximumDetailDelta.toFixed(3)),
    maximumVisibleDecodedBytes: tiles.reduce((sum, tile) => sum + tile.decodedBytes, 0),
    maximumVisibleEncodedBytes: tiles.reduce((sum, tile) => sum + tile.encodedBytes, 0),
    outputAlphaPixels,
    outsideTreatmentPixels,
    protectedWaterOverlapPixels,
  },
};

await mkdir(path.dirname(absolute(OUTPUT_MANIFEST)), { recursive: true });
await writeFile(absolute(OUTPUT_MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest, null, 2));
