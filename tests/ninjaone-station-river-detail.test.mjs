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
import {
  NINJAONE_STATION_RIVER_DETAIL_MAXIMUM_VISIBLE_DECODED_BYTES,
  NINJAONE_STATION_RIVER_DETAIL_TILES,
  ninjaOneCapitalVisibleStationRiverDetailTiles,
} from "../features/career-world/development/model/ninjaOneStationRiverDetail.ts";

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

const detailManifestPath =
  "public/career-world/capitals/ninjaone/manifests/station-river-detail-r1.json";
const sourceProvenancePath =
  "art-source/career-world/ninjaone-capital/station-river-detail-r1/source-provenance-r1.json";

function cameraForLocalRect(left, top, width, height) {
  return {
    origin: [
      0.125 + left / 2571 * 0.25,
      top / 1929 * (1 / 3),
    ],
    span: [
      width / 2571 * 0.25,
      height / 1929 * (1 / 3),
    ],
  };
}

test("station and river detail remains quarantined after the active city layout changes", async () => {
  const [city, water, lock, detailManifest, renderer] = await Promise.all([
    json(NINJAONE_STATION_RIVER_PATHS.cityManifest),
    json(NINJAONE_STATION_RIVER_PATHS.waterManifest),
    json(NINJAONE_STATION_RIVER_PATHS.fixture),
    json(detailManifestPath),
    readFile(absolute(
      "features/career-world/development/NinjaOneCapitalMvp.tsx",
    ), "utf8"),
  ]);
  assert.equal(lock.baseCommit, NINJAONE_STATION_RIVER_BASE_COMMIT);
  assert.deepEqual(lock.envelope, NINJAONE_STATION_RIVER_ENVELOPE);
  assert.equal(detailManifest.layoutLock.layoutContractSha256, lock.layoutContractSha256);
  assert.notEqual(lock.layoutContractSha256, layoutContractSha256(city, water));
  assert.doesNotMatch(renderer, /NinjaOneStationRiverDetail/);
});

test("station and river archive freezes every source alpha from its accepted layout", async () => {
  const lock = await json(NINJAONE_STATION_RIVER_PATHS.fixture);
  const dimensions = [2571, 1929];
  const sources = {
    contact: "/career-world/capitals/ninjaone/city-r1/fabric/city-terrain-contact-r3.png",
    foreground: "/career-world/capitals/ninjaone/city-r1/fabric/city-fabric-foreground-r3.png",
    railBed: "/career-world/capitals/ninjaone/city-r1/fabric/territory-rail-southbound-bed-r1.png",
    railSupport: "/career-world/capitals/ninjaone/city-r1/fabric/territory-rail-southbound-support-r1.png",
    railTrack: "/career-world/capitals/ninjaone/city-r1/fabric/territory-rail-southbound-track-r1.png",
    underlay: "/career-world/capitals/ninjaone/city-r1/fabric/city-fabric-underlay-r3.png",
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

test("station and river generated materials are provenance-tracked texture sources only", async () => {
  const [manifest, provenance, provenanceBytes] = await Promise.all([
    json(detailManifestPath),
    json(sourceProvenancePath),
    readFile(absolute(sourceProvenancePath)),
  ]);
  assert.equal(provenance.generationMode, "built-in-imagegen");
  assert.equal(provenance.reference.role, "style-and-palette-reference-only");
  assert.equal(manifest.sourceProvenance.sha256, sha256(provenanceBytes));
  assert.equal(provenance.sources.length, 2);
  for (const source of provenance.sources) {
    const bytes = await readFile(absolute(source.path));
    assert.equal(sha256(bytes), source.sha256, source.id);
    const metadata = await sharp(bytes).metadata();
    assert.ok(metadata.width >= 1024, source.id);
    assert.ok(metadata.height >= 1024, source.id);
    assert.match(source.prompt, /material texture only/i);
    assert.match(source.prompt, /not a layout reference/i);
    assert.match(source.prompt, /no buildings/i);
    assert.match(source.prompt, /no people/i);
  }
});

test("station and river detail tiles preserve the geometry lock pixel-for-pixel", async () => {
  const [manifest, lock] = await Promise.all([
    json(detailManifestPath),
    json(NINJAONE_STATION_RIVER_PATHS.fixture),
  ]);
  assert.equal(manifest.layoutLock.layoutContractSha256, lock.layoutContractSha256);
  assert.equal(manifest.metrics.outsideTreatmentPixels, 0);
  assert.equal(manifest.metrics.protectedWaterOverlapPixels, 0);
  assert.ok(manifest.metrics.maximumDetailDelta >= 8);
  assert.ok(manifest.metrics.maximumDetailDelta <= 96);
  assert.equal(manifest.tiles.length, 4);
  assert.equal(new Set(manifest.tiles.map(({ id }) => id)).size, 4);
  assert.ok(manifest.metrics.maximumVisibleDecodedBytes <= 24_000_000);
  assert.ok(manifest.metrics.maximumVisibleEncodedBytes <= 5_500_000);
  assert.equal(
    manifest.metrics.maximumVisibleDecodedBytes,
    NINJAONE_STATION_RIVER_DETAIL_MAXIMUM_VISIBLE_DECODED_BYTES,
  );

  const outputWidth = lock.envelope.width * manifest.sourceScale;
  const outputHeight = lock.envelope.height * manifest.sourceScale;
  const tileInputs = [];
  for (const tile of manifest.tiles) {
    const bytes = await readFile(publicPath(tile.path));
    assert.equal(sha256(bytes), tile.sha256, tile.id);
    assert.equal(bytes.length, tile.encodedBytes, tile.id);
    assert.match(tile.path, /\.webp$/, tile.id);
    const metadata = await sharp(bytes).metadata();
    assert.deepEqual([metadata.width, metadata.height], tile.sourceDimensions, tile.id);
    assert.equal(
      tile.decodedBytes,
      tile.sourceDimensions[0] * tile.sourceDimensions[1] * 4,
      tile.id,
    );
    tileInputs.push({
      input: bytes,
      left: (tile.localOrigin[0] - lock.envelope.left) * manifest.sourceScale,
      top: (tile.localOrigin[1] - lock.envelope.top) * manifest.sourceScale,
    });
  }

  const [{ data: detail }, { data: treatment }, { data: geometry }] = await Promise.all([
    sharp({
      create: {
        background: { alpha: 0, b: 0, g: 0, r: 0 },
        channels: 4,
        height: outputHeight,
        width: outputWidth,
      },
    }).composite(tileInputs).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(publicPath(lock.treatmentMask.path))
      .resize(outputWidth, outputHeight, { kernel: sharp.kernel.nearest })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true }),
    sharp(publicPath(lock.geometryLock.path))
      .resize(outputWidth, outputHeight, { kernel: sharp.kernel.nearest })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true }),
  ]);
  let visiblePixels = 0;
  for (let offset = 0; offset < detail.length; offset += 4) {
    if (detail[offset + 3] === 0) continue;
    visiblePixels += 1;
    assert.ok(treatment[offset + 3] > 0, `detail escaped treatment at pixel ${offset / 4}`);
    assert.ok(geometry[offset] < 128, `detail overlapped water at pixel ${offset / 4}`);
  }
  assert.equal(visiblePixels, manifest.metrics.outputAlphaPixels);

  const proofBytes = await readFile(publicPath(manifest.proof.path));
  assert.equal(sha256(proofBytes), manifest.proof.sha256);
  assert.match(manifest.proof.path, /\.webp$/);
  const proofMetadata = await sharp(proofBytes).metadata();
  assert.deepEqual([proofMetadata.width, proofMetadata.height], [outputWidth, outputHeight]);
});

test("station and river detail tiles are camera-culled and absent outside detailed tiers", () => {
  assert.equal(NINJAONE_STATION_RIVER_DETAIL_TILES.length, 4);
  const stationCamera = cameraForLocalRect(820, 650, 300, 300);
  assert.deepEqual(
    ninjaOneCapitalVisibleStationRiverDetailTiles(stationCamera, "site")
      .map(({ id }) => id),
    ["r0-c0"],
  );
  assert.deepEqual(
    ninjaOneCapitalVisibleStationRiverDetailTiles(
      cameraForLocalRect(50, 50, 240, 240),
      "site",
    ),
    [],
  );
  assert.deepEqual(
    ninjaOneCapitalVisibleStationRiverDetailTiles(stationCamera, "territory"),
    [],
  );
});
