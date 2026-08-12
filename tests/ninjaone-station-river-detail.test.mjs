import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

import {
  NINJAONE_STATION_RIVER_BASE_COMMIT,
  NINJAONE_STATION_RIVER_ENVELOPE,
  NINJAONE_STATION_RIVER_PATHS,
  layoutContractSha256,
  sha256,
} from "../scripts/lib/ninjaone-station-river-detail-contract.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const absolute = (relativePath) => path.join(root, relativePath);
const publicPath = (assetPath) => absolute(path.join("public", assetPath.replace(/^\//, "")));

async function json(relativePath) {
  return JSON.parse(await readFile(absolute(relativePath), "utf8"));
}

async function alphaSha256(assetPath, dimensions) {
  const { data, info } = await sharp(publicPath(assetPath))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  assert.deepEqual([info.width, info.height], dimensions);
  const alpha = Buffer.alloc(info.width * info.height);
  for (let pixel = 0; pixel < alpha.length; pixel += 1) {
    alpha[pixel] = data[pixel * 4 + 3];
  }
  return sha256(alpha);
}

test("station and river detail lock freezes the accepted city layout contract", async () => {
  const [city, water, lock] = await Promise.all([
    json(NINJAONE_STATION_RIVER_PATHS.cityManifest),
    json(NINJAONE_STATION_RIVER_PATHS.waterManifest),
    json(NINJAONE_STATION_RIVER_PATHS.fixture),
  ]);
  assert.equal(lock.baseCommit, NINJAONE_STATION_RIVER_BASE_COMMIT);
  assert.deepEqual(lock.envelope, NINJAONE_STATION_RIVER_ENVELOPE);
  assert.equal(lock.layoutContractSha256, layoutContractSha256(city, water));
});

test("station and river detail lock freezes every registered source alpha", async () => {
  const [city, lock] = await Promise.all([
    json(NINJAONE_STATION_RIVER_PATHS.cityManifest),
    json(NINJAONE_STATION_RIVER_PATHS.fixture),
  ]);
  const dimensions = city.artboard.dimensions;
  const sources = {
    contact: city.cityFabric.contactLayer.path,
    foreground: city.cityFabric.foreground.path,
    railBed: city.transport.rail.bedLayer.path,
    railSupport: city.transport.rail.supportLayer.path,
    railTrack: city.transport.rail.trackLayer.path,
    underlay: city.cityFabric.underlay.path,
  };
  for (const [id, assetPath] of Object.entries(sources)) {
    assert.equal(
      await alphaSha256(assetPath, dimensions),
      lock.rasterAlphaSha256[id],
      `${id} alpha registration drifted`,
    );
  }
});

test("station and river semantic lock and treatment mask remain immutable", async () => {
  const lock = await json(NINJAONE_STATION_RIVER_PATHS.fixture);
  for (const asset of [lock.geometryLock, lock.treatmentMask]) {
    const bytes = await readFile(publicPath(asset.path));
    assert.equal(sha256(bytes), asset.sha256);
    const metadata = await sharp(bytes).metadata();
    assert.deepEqual(
      [metadata.width, metadata.height],
      [lock.envelope.width, lock.envelope.height],
    );
  }

  const { data, info } = await sharp(publicPath(lock.treatmentMask.path))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let supported = 0;
  for (let pixel = 0; pixel < info.width * info.height; pixel += 1) {
    if (data[pixel * 4 + 3] > 0) supported += 1;
  }
  assert.equal(supported, lock.metrics.treatmentPixels);
  assert.ok(lock.metrics.protectedWaterPixels > 0);
  assert.ok(lock.metrics.treatmentPixels > 100_000);
});
