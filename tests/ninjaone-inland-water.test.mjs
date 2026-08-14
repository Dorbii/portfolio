import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

import {
  NINJAONE_INLAND_HABITAT_ASSETS,
  NINJAONE_INLAND_HABITAT_PLACEMENTS,
} from "../features/career-world/layers/inland-water/habitat-detail/model.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

function runtimeAssetFile(publicPath) {
  return path.join(root, "public", publicPath.replace(/^\//, ""));
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1;
    index < polygon.length;
    previous = index, index += 1) {
    const [x, y] = polygon[index];
    const [previousX, previousY] = polygon[previous];
    const crosses = (y > point[1]) !== (previousY > point[1])
      && point[0] < (
        (previousX - x) * (point[1] - y) / (previousY - y) + x
      );
    if (crosses) inside = !inside;
  }
  return inside;
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
  assert.deepEqual(
    authority.terrainErasePatches.map(({ id }) => id),
    [
      "b2-channel-split-frozen-land-cleanup",
      "c2-gorge-frozen-land-cleanup-head",
      "c2-gorge-frozen-land-cleanup-upstream",
      "c2-gorge-frozen-land-cleanup-a",
      "c2-gorge-frozen-land-cleanup-b",
      "c2-gorge-frozen-land-cleanup-c",
      "c2-gorge-frozen-land-cleanup-downstream",
    ],
    "L3 owns only the reviewed terrain cleanup patches",
  );
  assert.deepEqual(
    authority.obstacles,
    [],
    "the removed B2 split-rock obstacle and synthetic wake must stay absent",
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

test("inland effects preserve terrain ownership and break up cascade spray", async () => {
  const shader = await readFile(path.join(
    root,
    "features/career-world/layers/inland-water/rendering/shaders/inland-water.ts",
  ), "utf8");

  assert.doesNotMatch(shader, /bankBand|bankAlpha|authoredBank/);
  assert.match(shader, /float baseAlpha = waterAlpha/);
  assert.match(shader, /float fall = smoothstep\(0\.62, 0\.84, fallVelocity\) \* fallSupport/);
  assert.match(shader, /float impactSpray = impactCore[\s\S]*?\* eventBreakup/);
  assert.match(shader, /1\.0 - waterCoverage \* 0\.72/);
  assert.match(shader, /max\(baseAlpha, mist \* 0\.15\)/);
  assert.match(shader, /float bankShadow =/);
  assert.match(shader, /float flowCurl = abs/);
  assert.match(shader, /float impactRingCoordinate = fract/);
  assert.match(shader, /float fallRibbonCoverage = smoothstep/);
  assert.match(shader, /float impactChannelGate = smoothstep/);
  assert.match(shader, /float impactBankGate = 1\.0 - smoothstep/);
  assert.match(shader, /float tarnAuthority =/);
  assert.match(shader, /1\.0 - tarnAuthority \* 0\.96/);
  assert.match(shader, /float northHandoff = smoothstep/);
  assert.match(shader, /inField \* northHandoff \* southHandoff/);
  assert.match(shader, /float wetBankApron = smoothstep/);
  assert.match(
    shader,
    /if \([\s\S]*?inField < 0\.5[\s\S]*?wetBankApron < 0\.001[\s\S]*?discard/,
  );
  assert.doesNotMatch(shader, /broadWaveTrain|crossingWaveTrain|\bsin\(/);
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

test("inland habitat separates submerged bed detail from bank contact detail", async () => {
  const [scene, canvas, renderer] = await Promise.all([
    readFile(path.join(
      root,
      "features/career-world/composition/WorldScene.tsx",
    ), "utf8"),
    readFile(path.join(
      root,
      "features/career-world/layers/inland-water/habitat-detail/NinjaOneInlandHabitatCanvas.tsx",
    ), "utf8"),
    readFile(path.join(
      root,
      "features/career-world/layers/inland-water/habitat-detail/NinjaOneInlandHabitatRenderer.ts",
    ), "utf8"),
  ]);

  assert.match(
    scene,
    /<NinjaOneInlandWaterCanvas[\s\S]*?<NinjaOneInlandHabitatCanvas/,
  );
  assert.match(canvas, /data-authority-layer="L3_4"/);
  assert.match(canvas, /data-placement-model="deterministic-habitat-clusters-r2"/);
  assert.match(canvas, /data-shadow-pass="depth-and-lod-aware-bed-contact-r2"/);
  assert.match(renderer, /NINJAONE_INLAND_TERRAIN_ERASE_MASK/);
  assert.match(renderer, /destination-in/);
  assert.match(renderer, /bankPlacements/);
  assert.match(renderer, /isBankContactAsset/);
  assert.match(renderer, /DETAIL_TIER_DEPTH/);
  assert.match(renderer, /visiblePropCount/);
  assert.match(renderer, /brightness\(0\) saturate\(0\) blur/);
  assert.doesNotMatch(renderer, /context\.ellipse/);

  assert.deepEqual(
    Object.keys(NINJAONE_INLAND_HABITAT_ASSETS).sort(),
    [
      "bank-reed-tuft",
      "submerged-grass-clump",
      "submerged-woody-cover",
    ],
  );
  assert.equal(new Set(
    NINJAONE_INLAND_HABITAT_PLACEMENTS.map(({ id }) => id),
  ).size, NINJAONE_INLAND_HABITAT_PLACEMENTS.length);
  assert.equal(NINJAONE_INLAND_HABITAT_PLACEMENTS.length, 27);
  assert.equal(NINJAONE_INLAND_HABITAT_PLACEMENTS.filter(
    ({ id }) => id.startsWith("pond-"),
  ).length, 12);
  assert.equal(
    NINJAONE_INLAND_HABITAT_PLACEMENTS.some(
      ({ id }) => id === "pond-branch-center",
    ),
    false,
  );
  for (const placement of NINJAONE_INLAND_HABITAT_PLACEMENTS) {
    assert.ok(NINJAONE_INLAND_HABITAT_ASSETS[placement.assetId]);
    assert.ok(placement.localPosition[0] >= 0 && placement.localPosition[0] <= 1440);
    assert.ok(placement.localPosition[1] >= 0 && placement.localPosition[1] <= 1080);
    assert.ok(placement.screenWidthCapPx >= 16 && placement.screenWidthCapPx <= 48);
  }
});

test("production inland-habitat sprites are compact verified alpha derivatives", async () => {
  const expectedHashes = {
    "submerged-woody-cover": "f80412edb783203fa275cbf144caa28219011cd1d6b05295ebc641c122b51b0b",
    "bank-reed-tuft": "9aae13b2b3c280dcde92055af76e44a906c67126fcdf341bdf1566cfc02e7424",
    "submerged-grass-clump": "3a397f55c3f46aaf4310a1f3b00eafec95f95763125b6a624d485b626a8c6271",
  };

  const spriteDirectory = path.join(
    root,
    "public/career-world/layers/inland-water/habitat-detail/sprites",
  );
  assert.deepEqual(
    (await readdir(spriteDirectory)).sort(),
    Object.values(NINJAONE_INLAND_HABITAT_ASSETS)
      .map(({ path: publicPath }) => path.basename(publicPath))
      .sort(),
    "production habitat sprite directory must not contain unreachable assets",
  );

  for (const [assetId, asset] of Object.entries(NINJAONE_INLAND_HABITAT_ASSETS)) {
    const bytes = await readFile(runtimeAssetFile(asset.path));
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      expectedHashes[assetId],
    );
    const { data, info } = await sharp(bytes)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    assert.deepEqual(
      [info.width, info.height, info.channels],
      [...asset.dimensions, 4],
    );
    const cornerAlpha = [
      data[3],
      data[(info.width - 1) * 4 + 3],
      data[(info.height - 1) * info.width * 4 + 3],
      data[(info.width * info.height - 1) * 4 + 3],
    ];
    assert.deepEqual(cornerAlpha, [0, 0, 0, 0]);
  }
});

test("pond habitat stays inside the registered B2 tarn authority", async () => {
  const manifest = await readJson(
    "public/career-world/capitals/ninjaone/environment/manifests/inland-water-r1.json",
  );
  const tarn = manifest.segments.find(({ id }) => id === "b2-tarn");
  assert.ok(tarn);
  for (const placement of NINJAONE_INLAND_HABITAT_PLACEMENTS.filter(
    ({ id }) => id.startsWith("pond-"),
  )) {
    assert.equal(
      pointInPolygon(placement.localPosition, tarn.polygon),
      true,
      `${placement.id} must stay inside the B2 tarn authority`,
    );
  }
});
