import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

import {
  NINJAONE_STATION_RIVER_BASE_COMMIT,
  NINJAONE_STATION_RIVER_ENVELOPE,
  NINJAONE_STATION_RIVER_LOCK_REVISION,
  NINJAONE_STATION_RIVER_PATHS,
  layoutContractSha256,
  sha256,
} from "./lib/ninjaone-station-river-detail-contract.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const shouldRefresh = process.argv.includes("--refresh-layout-lock");

if (!shouldRefresh) {
  throw new TypeError(
    "Layout locks are immutable by default. Pass --refresh-layout-lock for an explicit baseline update.",
  );
}

const absolute = (relativePath) => path.join(ROOT, relativePath);
const city = JSON.parse(await readFile(absolute(
  NINJAONE_STATION_RIVER_PATHS.cityManifest,
), "utf8"));
const water = JSON.parse(await readFile(absolute(
  NINJAONE_STATION_RIVER_PATHS.waterManifest,
), "utf8"));
const [artboardWidth, artboardHeight] = city.artboard.dimensions;
const envelope = NINJAONE_STATION_RIVER_ENVELOPE;

const rasterPaths = {
  contact: city.cityFabric.contactLayer.path,
  foreground: city.cityFabric.foreground.path,
  railBed: city.transport.rail.bedLayer.path,
  railSupport: city.transport.rail.supportLayer.path,
  railTrack: city.transport.rail.trackLayer.path,
  underlay: city.cityFabric.underlay.path,
};

function publicPath(assetPath) {
  return absolute(path.join("public", assetPath.replace(/^\//, "")));
}

async function rgba(assetPath) {
  const result = await sharp(publicPath(assetPath))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (result.info.width !== artboardWidth || result.info.height !== artboardHeight) {
    throw new TypeError(`${assetPath} is not registered to the city artboard.`);
  }
  return result.data;
}

const [underlay, contact, foreground, railSupport, railBed, railTrack, waterField] =
  await Promise.all([
    rgba(rasterPaths.underlay),
    rgba(rasterPaths.contact),
    rgba(rasterPaths.foreground),
    rgba(rasterPaths.railSupport),
    rgba(rasterPaths.railBed),
    rgba(rasterPaths.railTrack),
    sharp(publicPath(water.field.path)).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);

const alphaSha = (buffer) => {
  const alpha = Buffer.alloc(artboardWidth * artboardHeight);
  for (let pixel = 0; pixel < alpha.length; pixel += 1) {
    alpha[pixel] = buffer[pixel * 4 + 3];
  }
  return sha256(alpha);
};

const geometry = Buffer.alloc(envelope.width * envelope.height * 4);
const treatment = Buffer.alloc(envelope.width * envelope.height * 4);
const waterCrop = water.field.artboardCrop;
const waterScale = water.field.artboardScale;
const waterArtboard = water.registration.artboard;
const stationX = city.transport.station.localPosition.x * artboardWidth;
const stationY = city.transport.station.localPosition.y * artboardHeight;
const stationRadiusX = city.transport.station.displayWidth * 0.72;
const stationRadiusY = city.transport.station.displayWidth * 0.26;

function sampleWater(cityX, cityY) {
  const artboardX = (cityX + 0.5) / artboardWidth * waterArtboard[0];
  const artboardY = (cityY + 0.5) / artboardHeight * waterArtboard[1];
  const fieldX = Math.floor((artboardX - waterCrop[0]) * waterScale);
  const fieldY = Math.floor((artboardY - waterCrop[1]) * waterScale);
  if (
    fieldX < 0
    || fieldY < 0
    || fieldX >= waterField.info.width
    || fieldY >= waterField.info.height
  ) {
    return { alpha: 32, distance: 0 };
  }
  const offset = (fieldY * waterField.info.width + fieldX) * 4;
  return {
    alpha: waterField.data[offset + 3],
    distance: waterField.data[offset],
  };
}

const smoothstep = (value) => value * value * (3 - 2 * value);
let treatmentPixels = 0;
let protectedWaterPixels = 0;
for (let localY = 0; localY < envelope.height; localY += 1) {
  for (let localX = 0; localX < envelope.width; localX += 1) {
    const x = envelope.left + localX;
    const y = envelope.top + localY;
    const sourcePixel = y * artboardWidth + x;
    const sourceOffset = sourcePixel * 4;
    const targetPixel = localY * envelope.width + localX;
    const targetOffset = targetPixel * 4;
    const waterSample = sampleWater(x, y);
    const isWater = waterSample.distance >= 128 && waterSample.alpha >= 60;
    const fabric = underlay[sourceOffset + 3] >= 24;
    const rail = Math.max(
      railSupport[sourceOffset + 3],
      railBed[sourceOffset + 3],
      railTrack[sourceOffset + 3],
    ) >= 16;
    const station = (
      ((x - stationX) / stationRadiusX) ** 2
      + ((y - stationY) / stationRadiusY) ** 2
    ) <= 1;
    const nearLandBank = !isWater
      && waterSample.alpha >= 60
      && waterSample.distance >= 54
      && waterSample.distance < 128;
    const cityContact = contact[sourceOffset + 3] >= 18
      || foreground[sourceOffset + 3] >= 24;

    geometry[targetOffset] = isWater ? 255 : 0;
    geometry[targetOffset + 1] = fabric ? 255 : 0;
    geometry[targetOffset + 2] = rail || station ? 255 : 0;
    geometry[targetOffset + 3] = 255;
    if (isWater) protectedWaterPixels += 1;

    const edgeDistance = Math.min(
      localX,
      localY,
      envelope.width - 1 - localX,
      envelope.height - 1 - localY,
    );
    const feather = smoothstep(Math.max(0, Math.min(1, edgeDistance / 48)));
    const allowed = !isWater && (fabric || nearLandBank || (station && cityContact));
    treatment[targetOffset] = fabric && !isWater ? 255 : 0;
    treatment[targetOffset + 1] = nearLandBank ? 255 : 0;
    treatment[targetOffset + 2] = station && cityContact && !isWater ? 255 : 0;
    const treatmentAlpha = allowed ? Math.round(feather * 255) : 0;
    treatment[targetOffset + 3] = treatmentAlpha;
    if (treatmentAlpha > 0) treatmentPixels += 1;
  }
}

const geometryPng = await sharp(geometry, {
  raw: { channels: 4, height: envelope.height, width: envelope.width },
}).png({ adaptiveFiltering: false, compressionLevel: 9 }).toBuffer();
const treatmentPng = await sharp(treatment, {
  raw: { channels: 4, height: envelope.height, width: envelope.width },
}).png({ adaptiveFiltering: false, compressionLevel: 9 }).toBuffer();

await Promise.all([
  mkdir(path.dirname(absolute(NINJAONE_STATION_RIVER_PATHS.fixture)), { recursive: true }),
  mkdir(path.dirname(absolute(NINJAONE_STATION_RIVER_PATHS.geometryLock)), { recursive: true }),
  mkdir(path.dirname(absolute(NINJAONE_STATION_RIVER_PATHS.treatmentMask)), { recursive: true }),
]);
await Promise.all([
  writeFile(absolute(NINJAONE_STATION_RIVER_PATHS.geometryLock), geometryPng),
  writeFile(absolute(NINJAONE_STATION_RIVER_PATHS.treatmentMask), treatmentPng),
]);

const fixture = {
  schemaVersion: 1,
  id: `career-world/capitals/ninjaone/station-river-layout-lock@${NINJAONE_STATION_RIVER_LOCK_REVISION}`,
  baseCommit: NINJAONE_STATION_RIVER_BASE_COMMIT,
  envelope,
  layoutContractSha256: layoutContractSha256(city, water),
  rasterAlphaSha256: {
    contact: alphaSha(contact),
    foreground: alphaSha(foreground),
    railBed: alphaSha(railBed),
    railSupport: alphaSha(railSupport),
    railTrack: alphaSha(railTrack),
    underlay: alphaSha(underlay),
  },
  geometryLock: {
    path: `/${NINJAONE_STATION_RIVER_PATHS.geometryLock.replace(/^public\//, "")}`,
    sha256: sha256(geometryPng),
  },
  treatmentMask: {
    path: `/${NINJAONE_STATION_RIVER_PATHS.treatmentMask.replace(/^public\//, "")}`,
    sha256: sha256(treatmentPng),
  },
  metrics: {
    protectedWaterPixels,
    treatmentPixels,
  },
};
await writeFile(
  absolute(NINJAONE_STATION_RIVER_PATHS.fixture),
  `${JSON.stringify(fixture, null, 2)}\n`,
);

console.log(JSON.stringify(fixture, null, 2));
