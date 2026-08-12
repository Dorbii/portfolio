import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

function runtimeAssetFile(publicPath) {
  return path.join(root, "public", publicPath.replace(/^\//, ""));
}

test("B2 authority retains the terrain-supported two-stage waterfall", async () => {
  const authority = await readJson(
    "art-source/career-world/ninjaone-environment/production-r2/inland-water-r1/ninjaone-inland-water-authority-r1.json",
  );
  const b2Phases = authority.segments
    .filter(({ id }) => [
      "b2-upper-fall",
      "b2-middle-pool",
      "b2-lower-fall",
    ].includes(id))
    .map(({ id, kind }) => [id, kind]);

  assert.deepEqual(b2Phases, [
    ["b2-upper-fall", "fall"],
    ["b2-middle-pool", "rapid"],
    ["b2-lower-fall", "fall"],
  ]);
  assert.deepEqual(
    authority.cascades
      .filter(({ id }) => id.startsWith("b2-"))
      .map(({ id, impact }) => [id, impact]),
    [
      ["b2-upper-drop", [656, 665]],
      ["b2-lower-drop", [658, 699]],
    ],
  );
});

test("inland ownership texture localizes waterfall impact energy", async () => {
  const [authority, manifest] = await Promise.all([
    readJson(
      "art-source/career-world/ninjaone-environment/production-r2/inland-water-r1/ninjaone-inland-water-authority-r1.json",
    ),
    readJson(
      "public/career-world/capitals/ninjaone/environment/manifests/inland-water-r1.json",
    ),
  ]);
  const impactDescription = manifest.terrainEraseMask.channels.b;
  assert.match(impactDescription, /cascade impact energy/i);
  assert.equal(manifest.metrics.maximumCascadeImpact, 1);
  assert.ok(manifest.metrics.cascadeImpactPixels > 5_000);
  assert.ok(
    manifest.metrics.cascadeImpactPixels < manifest.metrics.occupiedPixels,
    "impact support must stay localized instead of washing across the river",
  );

  const { data, info } = await sharp(
    runtimeAssetFile(manifest.terrainEraseMask.path),
  ).raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual(
    [info.width, info.height, info.channels],
    [...manifest.terrainEraseMask.dimensions, 4],
  );

  let positiveImpactPixels = 0;
  let maximumImpact = 0;
  for (let pixel = 0; pixel < info.width * info.height; pixel += 1) {
    const impact = data[pixel * info.channels + 2];
    maximumImpact = Math.max(maximumImpact, impact);
    if (impact > 0) positiveImpactPixels += 1;
  }
  assert.equal(maximumImpact, 255);
  assert.ok(positiveImpactPixels > 1_000);
  assert.ok(
    positiveImpactPixels < info.width * info.height * 0.02,
    "impact support must not revert to a constant full-mask channel",
  );

  const [cropX, cropY] = manifest.terrainEraseMask.artboardCrop;
  for (const cascade of authority.cascades) {
    const centerX = Math.round(cascade.impact[0] - cropX);
    const centerY = Math.round(cascade.impact[1] - cropY);
    let localMaximum = 0;
    for (let y = centerY - 12; y <= centerY + 12; y += 1) {
      for (let x = centerX - 12; x <= centerX + 12; x += 1) {
        const impact = data[(y * info.width + x) * info.channels + 2];
        localMaximum = Math.max(localMaximum, impact);
      }
    }
    assert.ok(
      localMaximum >= 200,
      `${cascade.id} must retain a high-energy impact core`,
    );
  }
});

test("non-water field pixels encode neutral flow", async () => {
  const manifest = await readJson(
    "public/career-world/capitals/ninjaone/environment/manifests/inland-water-r1.json",
  );
  const { data, info } = await sharp(
    runtimeAssetFile(manifest.field.path),
  ).raw().toBuffer({ resolveWithObject: true });

  let nonWaterPixels = 0;
  let nonNeutralFlowPixels = 0;
  for (let pixel = 0; pixel < info.width * info.height; pixel += 1) {
    const offset = pixel * info.channels;
    if (data[offset] >= 128) continue;
    nonWaterPixels += 1;
    if (data[offset + 1] !== 128 || data[offset + 2] !== 128) {
      nonNeutralFlowPixels += 1;
    }
  }

  assert.ok(nonWaterPixels > 4_000_000);
  assert.equal(
    nonNeutralFlowPixels,
    0,
    "land and mist support texels must not decode as high-speed water",
  );
});
