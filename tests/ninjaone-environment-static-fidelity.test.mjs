import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestRelativePath =
  "public/career-world/capitals/ninjaone/environment/manifests/native-detail-r2.json";
const sourcePrefix =
  "/art-source/career-world/ninjaone-environment/production-r2/detail-tiles-r2/generated/";
const targetIds = Object.freeze([
  "r0-c2", "r0-c3", "r1-c2", "r1-c3",
  "r2-c0", "r2-c1", "r2-c2", "r2-c3",
  "r3-c0", "r3-c1", "r3-c2", "r3-c3",
]);
const voidMaskTileIds = Object.freeze([
  "r0-c2", "r0-c3", "r1-c2", "r1-c3",
]);
const runtimeDimensions = Object.freeze([1448, 1086]);
const decodedTileBytes = runtimeDimensions[0] * runtimeDimensions[1] * 4;
const representativeOceanRgb = Object.freeze([32, 82, 96]);
const luminanceWeights256 = Object.freeze([54, 183, 19]);
const representativeOceanLuminance256 = representativeOceanRgb.reduce(
  (total, value, channel) => total + value * luminanceWeights256[channel],
  0,
);
const contourKernel = Object.freeze([1, 2, 1]);
const distanceAlphaCeilings = Object.freeze([192, 240]);
const renderedChannelDeltaLimitsByDistance = Object.freeze([12, 24]);
const renderedOklabDeltaMilliLimitsByDistance = Object.freeze([25, 50]);
const interiorShadowGuards = Object.freeze([
  Object.freeze({
    at: Object.freeze([260, 790]),
    id: "r0-c2",
    name: "inland-boulder-crevice-shadow",
    rgb: Object.freeze([11, 13, 11]),
  }),
  Object.freeze({
    at: Object.freeze([112, 50]),
    id: "r0-c3",
    name: "northwest-land-rock-shadow",
    rgb: Object.freeze([12, 10, 6]),
  }),
  Object.freeze({
    at: Object.freeze([413, 50]),
    id: "r1-c2",
    name: "upper-cliff-rock-shadow",
    rgb: Object.freeze([11, 13, 12]),
  }),
  Object.freeze({
    at: Object.freeze([280, 368]),
    id: "r1-c3",
    name: "inland-ridge-crevice-shadow",
    rgb: Object.freeze([0, 0, 0]),
  }),
]);

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

function assetFile(publicPath) {
  return path.join(
    root,
    "public",
    publicPath.split("?", 1)[0].replace(/^\//, ""),
  );
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}

function weightedLuminance256(rgb) {
  return rgb.reduce((total, value, channel) => (
    total + value * luminanceWeights256[channel]
  ), 0);
}

function compositeAgainstRepresentativeOcean(rgb, alpha) {
  return rgb.map((value, channel) => Math.round((
    value * alpha + representativeOceanRgb[channel] * (255 - alpha)
  ) / 255));
}

function srgbChannelToLinear(value) {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function oklab(rgb) {
  const [red, green, blue] = rgb.map(srgbChannelToLinear);
  const lightnessRoot = Math.cbrt(
    0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue,
  );
  const mediumRoot = Math.cbrt(
    0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue,
  );
  const shortRoot = Math.cbrt(
    0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue,
  );
  return [
    0.2104542553 * lightnessRoot
      + 0.793617785 * mediumRoot
      - 0.0040720468 * shortRoot,
    1.9779984951 * lightnessRoot
      - 2.428592205 * mediumRoot
      + 0.4505937099 * shortRoot,
    0.0259040371 * lightnessRoot
      + 0.7827717662 * mediumRoot
      - 0.808675766 * shortRoot,
  ];
}

const representativeOceanOklab = Object.freeze(oklab(representativeOceanRgb));

function renderedFalloffMetrics(rgb, alpha) {
  const compositeRgb = compositeAgainstRepresentativeOcean(rgb, alpha);
  const compositeOklab = oklab(compositeRgb);
  return {
    compositeLuminanceDrop256: Math.max(
      0,
      representativeOceanLuminance256 - weightedLuminance256(compositeRgb),
    ),
    maximumChannelDelta: Math.max(...compositeRgb.map((value, channel) => (
      Math.abs(value - representativeOceanRgb[channel])
    ))),
    oklabDeltaMilli: Math.round(Math.hypot(
      ...compositeOklab.map((value, channel) => (
        value - representativeOceanOklab[channel]
      )),
    ) * 1000),
  };
}

function contourCoverageAlpha(edgeConnectedVoid, pixel, width, height) {
  const x = pixel % width;
  const y = Math.floor(pixel / width);
  let weightedLandOccupancy = 0;
  let totalWeight = 0;
  for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
    const sampleY = Math.max(0, Math.min(height - 1, y + offsetY));
    const weightY = contourKernel[offsetY + 1];
    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      const sampleX = Math.max(0, Math.min(width - 1, x + offsetX));
      const weight = weightY * contourKernel[offsetX + 1];
      const neighbor = sampleY * width + sampleX;
      weightedLandOccupancy += weight * Number(!edgeConnectedVoid[neighbor]);
      totalWeight += weight;
    }
  }
  return Math.max(1, Math.round(weightedLandOccupancy * 255 / totalWeight));
}

function expectedLandSideAlpha(rgb, distance, contourAlpha) {
  const distanceIndex = distance - 1;
  const maximumRgb = Math.max(...rgb);
  const rampAlpha = Math.max(0, Math.min(255, Math.round(
    (maximumRgb - 16) * 255 / (64 - 16),
  )));
  const luminanceDifference = representativeOceanLuminance256
    - weightedLuminance256(rgb);
  const luminanceCap = luminanceDifference > 0
    ? Math.max(0, Math.min(255, Math.floor(
      4 * 256 * 255 / luminanceDifference,
    )))
    : 255;
  let alpha = Math.max(1, Math.min(
    rampAlpha,
    luminanceCap,
    contourAlpha,
    distanceAlphaCeilings[distanceIndex],
  ));
  let metrics = renderedFalloffMetrics(rgb, alpha);
  while (alpha > 1 && (
    metrics.compositeLuminanceDrop256 > 4 * 256
    || metrics.maximumChannelDelta
      > renderedChannelDeltaLimitsByDistance[distanceIndex]
    || metrics.oklabDeltaMilli
      > renderedOklabDeltaMilliLimitsByDistance[distanceIndex]
  )) {
    alpha -= 1;
    metrics = renderedFalloffMetrics(rgb, alpha);
  }
  return alpha;
}

function deriveExpectedMask(rgb, width, height) {
  const pixelCount = width * height;
  const nearBlack = new Uint8Array(pixelCount);
  const edgeConnectedVoid = new Uint8Array(pixelCount);
  const queue = new Uint32Array(pixelCount);
  let nearBlackPixels = 0;
  let queueHead = 0;
  let queueTail = 0;

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const offset = pixel * 3;
    const isNearBlack = Math.max(
      rgb[offset],
      rgb[offset + 1],
      rgb[offset + 2],
    ) <= 16;
    nearBlack[pixel] = Number(isNearBlack);
    nearBlackPixels += Number(isNearBlack);
  }

  function push(pixel) {
    if (nearBlack[pixel] && !edgeConnectedVoid[pixel]) {
      edgeConnectedVoid[pixel] = 1;
      queue[queueTail] = pixel;
      queueTail += 1;
    }
  }

  for (let x = 0; x < width; x += 1) {
    push(x);
    push((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    push(y * width);
    push(y * width + width - 1);
  }
  while (queueHead < queueTail) {
    const pixel = queue[queueHead];
    queueHead += 1;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    if (x > 0) push(pixel - 1);
    if (x + 1 < width) push(pixel + 1);
    if (y > 0) push(pixel - width);
    if (y + 1 < height) push(pixel + width);
  }

  const alpha = Buffer.alloc(pixelCount, 255);
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    if (edgeConnectedVoid[pixel]) {
      alpha[pixel] = 0;
    }
  }
  const falloffDistance = new Uint8Array(pixelCount);
  for (let distance = 1; distance <= 2; distance += 1) {
    for (let pixel = 0; pixel < pixelCount; pixel += 1) {
      if (edgeConnectedVoid[pixel] || falloffDistance[pixel] !== 0) {
        continue;
      }
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      let touchesPreviousRing = false;
      for (
        let offsetY = -1;
        offsetY <= 1 && !touchesPreviousRing;
        offsetY += 1
      ) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (offsetX === 0 && offsetY === 0) {
            continue;
          }
          const neighborX = x + offsetX;
          const neighborY = y + offsetY;
          if (
            neighborX < 0
            || neighborX >= width
            || neighborY < 0
            || neighborY >= height
          ) {
            continue;
          }
          const neighbor = neighborY * width + neighborX;
          if (
            (distance === 1 && edgeConnectedVoid[neighbor])
            || (distance > 1 && falloffDistance[neighbor] === distance - 1)
          ) {
            touchesPreviousRing = true;
            break;
          }
        }
      }
      if (touchesPreviousRing) {
        falloffDistance[pixel] = distance;
      }
    }
  }
  let boundaryPixels = 0;
  let boundaryPixelsExceedingCompositeLuminanceDrop = 0;
  let boundaryPixelsExceedingRenderedColorDelta = 0;
  let falloffPixels = 0;
  const falloffPixelsByDistance = [0, 0];
  const contourCoveragePixelsByDistance = [0, 0];
  const partialContourCoveragePixelsByDistance = [0, 0];
  let featheredPixels = 0;
  let fullyOpaqueBoundaryPixels = 0;
  const fullyOpaqueFalloffPixelsByDistance = [0, 0];
  const maximumAlphaByDistance = [0, 0];
  let maximumBoundaryCompositeLuminanceDrop256 = 0;
  const maximumContourCoverageAlphaByDistance = [0, 0];
  let maximumPartialAlpha = 0;
  let maximumPartialCompositeLuminanceDrop256 = 0;
  const maximumRenderedChannelDeltaByDistance = [0, 0];
  const maximumRenderedOklabDeltaMilliByDistance = [0, 0];
  const minimumAlphaByDistance = [255, 255];
  const minimumContourCoverageAlphaByDistance = [255, 255];
  let minimumPartialAlpha = 255;
  let partialPixelsAtOrBelowNearBlackMaximumRgb = 0;
  let transparentFalloffPixels = 0;
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    if (falloffDistance[pixel] === 0) {
      continue;
    }
    const distance = falloffDistance[pixel];
    const distanceIndex = distance - 1;
    const offset = pixel * 3;
    const sourceRgb = [rgb[offset], rgb[offset + 1], rgb[offset + 2]];
    const contourAlpha = contourCoverageAlpha(
      edgeConnectedVoid,
      pixel,
      width,
      height,
    );
    const falloffAlpha = expectedLandSideAlpha(
      sourceRgb,
      distance,
      contourAlpha,
    );
    const renderedMetrics = renderedFalloffMetrics(sourceRgb, falloffAlpha);
    const compositeDrop = renderedMetrics.compositeLuminanceDrop256;
    boundaryPixels += 1;
    falloffPixelsByDistance[distanceIndex] += 1;
    contourCoveragePixelsByDistance[distanceIndex] += 1;
    partialContourCoveragePixelsByDistance[distanceIndex] += Number(
      contourAlpha < 255,
    );
    boundaryPixelsExceedingCompositeLuminanceDrop += Number(
      compositeDrop > 4 * 256,
    );
    boundaryPixelsExceedingRenderedColorDelta += Number(
      renderedMetrics.maximumChannelDelta
        > renderedChannelDeltaLimitsByDistance[distanceIndex]
      || renderedMetrics.oklabDeltaMilli
        > renderedOklabDeltaMilliLimitsByDistance[distanceIndex],
    );
    maximumBoundaryCompositeLuminanceDrop256 = Math.max(
      maximumBoundaryCompositeLuminanceDrop256,
      compositeDrop,
    );
    maximumContourCoverageAlphaByDistance[distanceIndex] = Math.max(
      maximumContourCoverageAlphaByDistance[distanceIndex],
      contourAlpha,
    );
    maximumRenderedChannelDeltaByDistance[distanceIndex] = Math.max(
      maximumRenderedChannelDeltaByDistance[distanceIndex],
      renderedMetrics.maximumChannelDelta,
    );
    maximumRenderedOklabDeltaMilliByDistance[distanceIndex] = Math.max(
      maximumRenderedOklabDeltaMilliByDistance[distanceIndex],
      renderedMetrics.oklabDeltaMilli,
    );
    maximumAlphaByDistance[distanceIndex] = Math.max(
      maximumAlphaByDistance[distanceIndex],
      falloffAlpha,
    );
    minimumAlphaByDistance[distanceIndex] = Math.min(
      minimumAlphaByDistance[distanceIndex],
      falloffAlpha,
    );
    minimumContourCoverageAlphaByDistance[distanceIndex] = Math.min(
      minimumContourCoverageAlphaByDistance[distanceIndex],
      contourAlpha,
    );
    alpha[pixel] = falloffAlpha;
    if (falloffAlpha === 255) {
      fullyOpaqueBoundaryPixels += 1;
      fullyOpaqueFalloffPixelsByDistance[distanceIndex] += 1;
      continue;
    }
    falloffPixels += 1;
    if (falloffAlpha === 0) {
      transparentFalloffPixels += 1;
      continue;
    }
    featheredPixels += 1;
    maximumPartialAlpha = Math.max(maximumPartialAlpha, falloffAlpha);
    minimumPartialAlpha = Math.min(minimumPartialAlpha, falloffAlpha);
    partialPixelsAtOrBelowNearBlackMaximumRgb += Number(
      Math.max(...sourceRgb) <= 16,
    );
    maximumPartialCompositeLuminanceDrop256 = Math.max(
      maximumPartialCompositeLuminanceDrop256,
      compositeDrop,
    );
  }
  return {
    alpha,
    boundaryPixels,
    boundaryPixelsExceedingCompositeLuminanceDrop,
    boundaryPixelsExceedingRenderedColorDelta,
    contourCoveragePixelsByDistance,
    edgeConnectedVoid,
    falloffDistance,
    falloffPixels,
    falloffPixelsByDistance,
    featheredPixels,
    fullyOpaqueBoundaryPixels,
    fullyOpaqueFalloffPixelsByDistance,
    interiorNearBlackPixels: nearBlackPixels - queueTail,
    maximumAlphaByDistance,
    maximumBoundaryCompositeLuminanceDrop256,
    maximumContourCoverageAlphaByDistance,
    maximumPartialAlpha,
    maximumPartialCompositeLuminanceDrop256,
    maximumRenderedChannelDeltaByDistance,
    maximumRenderedOklabDeltaMilliByDistance,
    minimumAlphaByDistance,
    minimumContourCoverageAlphaByDistance,
    minimumPartialAlpha,
    partialPixelsAtOrBelowNearBlackMaximumRgb,
    partialContourCoveragePixelsByDistance,
    transparentFalloffPixels,
    voidPixels: queueTail,
  };
}

test("native terrain preserves every authoritative source RGB byte", async (t) => {
  const manifest = await readJson(manifestRelativePath);
  assert.deepEqual(manifest.tiles.map(({ id }) => id), targetIds);
  assert.deepEqual(manifest.registration, {
    artboard: [1440, 1080],
    grid: [4, 4],
    runtimeTileDimensions: runtimeDimensions,
    tileArtboard: [360, 270],
  });
  assert.deepEqual(manifest.voidMasks.derivation, {
    alphaRamp: "distance-graded-rendered-ocean-color-cap-v4",
    connectivity: 4,
    contourAntialiasing: "tent-3x3-land-occupancy-alpha-downsample-v1",
    contourKernel,
    distanceAlphaCeilings,
    landSideFalloffConnectivity: 8,
    landSideFalloffWidthPixels: 2,
    luminanceWeights256,
    maximumCompositeLuminanceDrop: 4,
    maximumRenderedChannelDeltaByDistance:
      renderedChannelDeltaLimitsByDistance,
    maximumRenderedOklabDeltaMilliByDistance:
      renderedOklabDeltaMilliLimitsByDistance,
    minimumLandSideAlpha: 1,
    nearBlackMaximumRgb: 16,
    opaqueAtMaximumRgb: 64,
    perceptualColorSpace: "oklab-euclidean",
    representativeOceanRgb,
    seed: "all-source-edges",
  });
  assert.equal(manifest.voidMasks.integration, "baked-runtime-alpha");
  assert.deepEqual(
    manifest.voidMasks.resources.map(({ tileId }) => tileId),
    voidMaskTileIds,
  );

  const metrics = [];
  for (const tile of manifest.tiles) {
    const expectedSourcePath = `${sourcePrefix}${tile.id}-generated-r2.png`;
    const sourceFile = path.join(root, expectedSourcePath.slice(1));
    const runtimeFile = assetFile(tile.path);
    const [sourceBytes, runtimeBytes] = await Promise.all([
      readFile(sourceFile),
      readFile(runtimeFile),
    ]);
    const [sourceMetadata, runtimeMetadata, sourceRaw, runtimeRaw] =
      await Promise.all([
        sharp(sourceBytes).metadata(),
        sharp(runtimeBytes).metadata(),
        sharp(sourceBytes).raw().toBuffer(),
        sharp(runtimeBytes).ensureAlpha().raw().toBuffer(),
      ]);

    assert.deepEqual(
      [sourceMetadata.width, sourceMetadata.height, sourceMetadata.channels],
      [1448, 1086, 3],
    );
    assert.equal(sourceMetadata.hasAlpha, false);
    assert.deepEqual(
      [runtimeMetadata.width, runtimeMetadata.height],
      runtimeDimensions,
    );
    assert.equal(tile.sourcePath, expectedSourcePath);
    assert.deepEqual(tile.sourceDimensions, runtimeDimensions);
    assert.deepEqual(tile.sourceCrop, [0, 0, 1448, 1086]);
    assert.equal(tile.sourceSha256, sha256(sourceBytes));
    assert.equal(tile.sha256, sha256(runtimeBytes));
    assert.equal(tile.decodedBytes, decodedTileBytes);
    assert.equal(tile.decodedRgbSha256, sha256(sourceRaw));
    assert.deepEqual(tile.artboardBounds, {
      origin: [tile.column * 360, tile.row * 270],
      span: [360, 270],
    });

    let changedRgbPixels = 0;
    let changedVisibleRgbPixels = 0;
    let opaquePixels = 0;
    let partialPixels = 0;
    let transparentPixels = 0;
    for (let pixel = 0; pixel < 1448 * 1086; pixel += 1) {
      const sourceOffset = pixel * 3;
      const runtimeOffset = pixel * 4;
      const alpha = runtimeRaw[runtimeOffset + 3];
      const rgbChanged = sourceRaw[sourceOffset] !== runtimeRaw[runtimeOffset]
        || sourceRaw[sourceOffset + 1] !== runtimeRaw[runtimeOffset + 1]
        || sourceRaw[sourceOffset + 2] !== runtimeRaw[runtimeOffset + 2];
      changedRgbPixels += Number(rgbChanged);
      changedVisibleRgbPixels += Number(rgbChanged && alpha > 0);
      opaquePixels += Number(alpha === 255);
      partialPixels += Number(alpha > 0 && alpha < 255);
      transparentPixels += Number(alpha === 0);
    }
    assert.equal(changedRgbPixels, 0, `${tile.id} changed source RGB`);
    assert.equal(
      changedVisibleRgbPixels,
      0,
      `${tile.id} changed non-void source RGB`,
    );

    const mask = manifest.voidMasks.resources.find(
      ({ id }) => id === tile.voidMaskId,
    );
    if (!mask) {
      assert.equal(tile.voidMaskId, null);
      assert.equal(runtimeMetadata.channels, 3);
      assert.equal(runtimeMetadata.hasAlpha, false);
      assert.equal(runtimeBytes.equals(sourceBytes), true);
      assert.equal(opaquePixels, 1448 * 1086);
      assert.equal(partialPixels, 0);
      assert.equal(transparentPixels, 0);
    } else {
      const maskFile = assetFile(mask.path);
      const [maskBytes, maskMetadata, maskRaw] = await Promise.all([
        readFile(maskFile),
        sharp(maskFile).metadata(),
        sharp(maskFile).toColourspace("b-w").raw().toBuffer(),
      ]);
      const expectedMask = deriveExpectedMask(sourceRaw, 1448, 1086);
      assert.equal(runtimeMetadata.channels, 4);
      assert.equal(runtimeMetadata.hasAlpha, true);
      assert.deepEqual(
        [maskMetadata.width, maskMetadata.height, maskMetadata.channels],
        [1448, 1086, 1],
      );
      assert.equal(mask.sha256, sha256(maskBytes));
      assert.equal(Buffer.compare(maskRaw, expectedMask.alpha), 0);
      for (const field of [
        "boundaryPixels",
        "boundaryPixelsExceedingCompositeLuminanceDrop",
        "boundaryPixelsExceedingRenderedColorDelta",
        "falloffPixels",
        "featheredPixels",
        "fullyOpaqueBoundaryPixels",
        "interiorNearBlackPixels",
        "maximumBoundaryCompositeLuminanceDrop256",
        "maximumPartialAlpha",
        "maximumPartialCompositeLuminanceDrop256",
        "minimumPartialAlpha",
        "partialPixelsAtOrBelowNearBlackMaximumRgb",
        "transparentFalloffPixels",
        "voidPixels",
      ]) {
        assert.equal(mask[field], expectedMask[field], `${tile.id} ${field}`);
      }
      for (const field of [
        "contourCoveragePixelsByDistance",
        "falloffPixelsByDistance",
        "fullyOpaqueFalloffPixelsByDistance",
        "maximumAlphaByDistance",
        "maximumContourCoverageAlphaByDistance",
        "maximumRenderedChannelDeltaByDistance",
        "maximumRenderedOklabDeltaMilliByDistance",
        "minimumAlphaByDistance",
        "minimumContourCoverageAlphaByDistance",
        "partialContourCoveragePixelsByDistance",
      ]) {
        assert.deepEqual(mask[field], expectedMask[field], `${tile.id} ${field}`);
      }
      assert.equal(
        mask.boundaryPixels,
        mask.falloffPixels + mask.fullyOpaqueBoundaryPixels,
      );
      assert.equal(
        mask.falloffPixels,
        mask.featheredPixels + mask.transparentFalloffPixels,
      );
      assert.ok(
        expectedMask.interiorNearBlackPixels > 0,
        `${tile.id} lacks an interior-dark global-threshold guard`,
      );
      assert.equal(mask.boundaryPixelsExceedingCompositeLuminanceDrop, 0);
      assert.equal(mask.boundaryPixelsExceedingRenderedColorDelta, 0);
      assert.equal(mask.fullyOpaqueBoundaryPixels, 0);
      assert.deepEqual(mask.fullyOpaqueFalloffPixelsByDistance, [0, 0]);
      assert.deepEqual(
        mask.contourCoveragePixelsByDistance,
        mask.falloffPixelsByDistance,
      );
      assert.ok(mask.partialContourCoveragePixelsByDistance[0] > 0);
      assert.ok(mask.maximumAlphaByDistance.every((alpha, index) => (
        alpha <= distanceAlphaCeilings[index]
      )));
      assert.ok(mask.maximumRenderedChannelDeltaByDistance.every((delta, index) => (
        delta <= renderedChannelDeltaLimitsByDistance[index]
      )));
      assert.ok(mask.maximumRenderedOklabDeltaMilliByDistance.every(
        (delta, index) => delta <= renderedOklabDeltaMilliLimitsByDistance[index],
      ));
      assert.ok(mask.maximumBoundaryCompositeLuminanceDrop256 <= 4 * 256);
      assert.ok(mask.minimumPartialAlpha > 0);
      assert.ok(mask.maximumPartialAlpha < 255);
      assert.ok(mask.minimumPartialAlpha < mask.maximumPartialAlpha);
      assert.ok(mask.maximumPartialCompositeLuminanceDrop256 <= 4 * 256);
      const partialAlphas = new Set();
      for (let pixel = 0; pixel < maskRaw.length; pixel += 1) {
        assert.equal(runtimeRaw[pixel * 4 + 3], maskRaw[pixel]);
        if (maskRaw[pixel] > 0 && maskRaw[pixel] < 255) {
          partialAlphas.add(maskRaw[pixel]);
        }
      }
      assert.ok(
        partialAlphas.size > 1,
        `${tile.id} retained a fixed-alpha one-pixel fringe`,
      );
      for (const guard of interiorShadowGuards.filter(({ id }) => id === tile.id)) {
        const [x, y] = guard.at;
        const pixel = y * 1448 + x;
        const sourceOffset = pixel * 3;
        const runtimeOffset = pixel * 4;
        assert.deepEqual(
          [...sourceRaw.subarray(sourceOffset, sourceOffset + 3)],
          guard.rgb,
          `${guard.name} source coordinate changed`,
        );
        assert.equal(maskRaw[pixel], 255, `${guard.name} was erased by connectivity`);
        assert.deepEqual(
          [...runtimeRaw.subarray(runtimeOffset, runtimeOffset + 4)],
          [...guard.rgb, 255],
          `${guard.name} is not fully visible in the runtime cache`,
        );
      }
      assert.equal(
        transparentPixels,
        mask.voidPixels + mask.transparentFalloffPixels,
      );
      assert.equal(partialPixels, mask.featheredPixels);
    }
    metrics.push({
      byteExactSourceCopy: runtimeBytes.equals(sourceBytes),
      changedRgbPixels,
      changedVisibleRgbPixels,
      id: tile.id,
      runtimeSha256: tile.sha256,
      sourceSha256: tile.sourceSha256,
      voidMaskId: tile.voidMaskId,
    });
  }
  t.diagnostic(`STATIC_R4_EXACTNESS ${JSON.stringify(metrics)}`);
});

test("C1 contour matte caps every rendered boundary pixel and preserves rock shadows", async (t) => {
  const manifest = await readJson(manifestRelativePath);
  let aggregateAlpha128AtOrBelow12 = 0;
  let aggregateAlpha128AtOrBelow16 = 0;
  let aggregateBoundaryPixelsExceedingCompositeLuminanceDrop = 0;
  let aggregateBoundaryPixelsExceedingRenderedColorDelta = 0;
  let aggregateFullyOpaqueFalloffPixels = 0;
  const perTile = [];

  for (const id of voidMaskTileIds) {
    const tile = manifest.tiles.find((candidate) => candidate.id === id);
    const sourceFile = path.join(root, tile.sourcePath.slice(1));
    const runtimeFile = assetFile(tile.path);
    const [sourceRaw, runtimeRaw] = await Promise.all([
      sharp(sourceFile).raw().toBuffer(),
      sharp(runtimeFile).ensureAlpha().raw().toBuffer(),
    ]);
    const expectedMask = deriveExpectedMask(sourceRaw, 1448, 1086);
    let alpha128AtOrBelow12 = 0;
    let alpha128AtOrBelow16 = 0;
    let boundaryPixels = 0;
    let boundaryPixelsExceedingCompositeLuminanceDrop = 0;
    let boundaryPixelsExceedingRenderedColorDelta = 0;
    let darkPartialPixels = 0;
    let darkPartialPixelsAboveMinimumAlpha = 0;
    const fullyOpaqueFalloffPixelsByDistance = [0, 0];
    let maximumBoundaryCompositeLuminanceDrop256 = 0;
    const observedMaximumRenderedChannelDeltaByDistance = [0, 0];
    const observedMaximumRenderedOklabDeltaMilliByDistance = [0, 0];
    for (let pixel = 0; pixel < 1448 * 1086; pixel += 1) {
      const sourceOffset = pixel * 3;
      const runtimeOffset = pixel * 4;
      const sourceRgb = [...sourceRaw.subarray(sourceOffset, sourceOffset + 3)];
      const alpha = runtimeRaw[runtimeOffset + 3];
      const maximumRgb = Math.max(...sourceRgb);
      if (alpha > 0 && alpha < 255 && maximumRgb <= 16) {
        darkPartialPixels += 1;
        darkPartialPixelsAboveMinimumAlpha += Number(alpha > 1);
      }
      if (alpha === 128) {
        alpha128AtOrBelow12 += Number(maximumRgb <= 12);
        alpha128AtOrBelow16 += Number(maximumRgb <= 16);
      }
      if (expectedMask.falloffDistance[pixel] === 0) {
        continue;
      }
      const distanceIndex = expectedMask.falloffDistance[pixel] - 1;
      const contourAlpha = contourCoverageAlpha(
        expectedMask.edgeConnectedVoid,
        pixel,
        1448,
        1086,
      );
      boundaryPixels += 1;
      assert.ok(alpha > 0, `${id} expanded the source-connected void topology`);
      assert.ok(
        alpha <= contourAlpha,
        `${id} bypassed contour occupancy at pixel ${pixel}`,
      );
      assert.ok(
        alpha <= distanceAlphaCeilings[distanceIndex],
        `${id} bypassed the distance alpha ceiling at pixel ${pixel}`,
      );
      const renderedMetrics = renderedFalloffMetrics(sourceRgb, alpha);
      const compositeDrop = renderedMetrics.compositeLuminanceDrop256;
      boundaryPixelsExceedingCompositeLuminanceDrop += Number(
        compositeDrop > 4 * 256,
      );
      boundaryPixelsExceedingRenderedColorDelta += Number(
        renderedMetrics.maximumChannelDelta
          > renderedChannelDeltaLimitsByDistance[distanceIndex]
        || renderedMetrics.oklabDeltaMilli
          > renderedOklabDeltaMilliLimitsByDistance[distanceIndex],
      );
      fullyOpaqueFalloffPixelsByDistance[distanceIndex] += Number(alpha === 255);
      maximumBoundaryCompositeLuminanceDrop256 = Math.max(
        maximumBoundaryCompositeLuminanceDrop256,
        compositeDrop,
      );
      observedMaximumRenderedChannelDeltaByDistance[distanceIndex] = Math.max(
        observedMaximumRenderedChannelDeltaByDistance[distanceIndex],
        renderedMetrics.maximumChannelDelta,
      );
      observedMaximumRenderedOklabDeltaMilliByDistance[distanceIndex] = Math.max(
        observedMaximumRenderedOklabDeltaMilliByDistance[distanceIndex],
        renderedMetrics.oklabDeltaMilli,
      );
    }
    assert.equal(boundaryPixels, expectedMask.boundaryPixels);
    assert.equal(boundaryPixelsExceedingCompositeLuminanceDrop, 0);
    assert.equal(boundaryPixelsExceedingRenderedColorDelta, 0);
    assert.deepEqual(fullyOpaqueFalloffPixelsByDistance, [0, 0]);
    assert.equal(darkPartialPixelsAboveMinimumAlpha, 0);
    assert.equal(alpha128AtOrBelow12, 0, `${id} retains the old <=12 alpha128 fringe`);
    assert.equal(alpha128AtOrBelow16, 0, `${id} retains the old <=16 alpha128 fringe`);
    assert.ok(maximumBoundaryCompositeLuminanceDrop256 <= 4 * 256);
    aggregateAlpha128AtOrBelow12 += alpha128AtOrBelow12;
    aggregateAlpha128AtOrBelow16 += alpha128AtOrBelow16;
    aggregateBoundaryPixelsExceedingCompositeLuminanceDrop +=
      boundaryPixelsExceedingCompositeLuminanceDrop;
    aggregateBoundaryPixelsExceedingRenderedColorDelta +=
      boundaryPixelsExceedingRenderedColorDelta;
    aggregateFullyOpaqueFalloffPixels += fullyOpaqueFalloffPixelsByDistance
      .reduce((total, count) => total + count, 0);
    perTile.push({
      alpha128AtOrBelow12,
      alpha128AtOrBelow16,
      boundaryPixels,
      boundaryPixelsExceedingCompositeLuminanceDrop,
      boundaryPixelsExceedingRenderedColorDelta,
      darkPartialPixels,
      darkPartialPixelsAboveMinimumAlpha,
      fullyOpaqueFalloffPixelsByDistance,
      id,
      maximumBoundaryCompositeLuminanceDrop256,
      observedMaximumRenderedChannelDeltaByDistance,
      observedMaximumRenderedOklabDeltaMilliByDistance,
    });
  }

  assert.equal(aggregateAlpha128AtOrBelow12, 0);
  assert.equal(aggregateAlpha128AtOrBelow16, 0);
  assert.equal(aggregateBoundaryPixelsExceedingCompositeLuminanceDrop, 0);
  assert.equal(aggregateBoundaryPixelsExceedingRenderedColorDelta, 0);
  assert.equal(aggregateFullyOpaqueFalloffPixels, 0);

  const citedTile = manifest.tiles.find(({ id }) => id === "r1-c2");
  const citedRuntime = await sharp(assetFile(citedTile.path))
    .ensureAlpha()
    .raw()
    .toBuffer();
  const pixelAt = (x, y) => {
    const offset = (y * 1448 + x) * 4;
    return [...citedRuntime.subarray(offset, offset + 4)];
  };
  assert.deepEqual(pixelAt(575, 100), [11, 12, 11, 0]);
  assert.deepEqual(pixelAt(574, 100), [14, 16, 15, 0]);
  assert.deepEqual(pixelAt(576, 100), [6, 8, 7, 0]);
  assert.deepEqual(pixelAt(575, 101), [17, 18, 17, 11]);
  assert.deepEqual(
    compositeAgainstRepresentativeOcean(pixelAt(575, 100).slice(0, 3), 0),
    representativeOceanRgb,
  );

  const criticTile = manifest.tiles.find(({ id }) => id === "r1-c3");
  const criticRuntime = await sharp(assetFile(criticTile.path))
    .ensureAlpha()
    .raw()
    .toBuffer();
  const criticOffset = (832 * 1448 + 1399) * 4;
  const criticPixel = [
    ...criticRuntime.subarray(criticOffset, criticOffset + 4),
  ];
  assert.deepEqual(criticPixel, [73, 68, 54, 148]);
  assert.deepEqual(
    compositeAgainstRepresentativeOcean(criticPixel.slice(0, 3), criticPixel[3]),
    [56, 74, 72],
  );
  const criticMetrics = renderedFalloffMetrics(
    criticPixel.slice(0, 3),
    criticPixel[3],
  );
  assert.ok(criticMetrics.maximumChannelDelta <= 24);
  assert.ok(criticMetrics.oklabDeltaMilli <= 50);

  const citedCrop = await sharp(assetFile(citedTile.path))
    .extract({ left: 527, top: 52, width: 96, height: 96 })
    .ensureAlpha()
    .raw()
    .toBuffer();
  let citedCropDarkPartialPixels = 0;
  let citedCropDarkPartialPixelsAboveMinimumAlpha = 0;
  let citedCropMaximumPartialCompositeLuminanceDrop256 = 0;
  for (let offset = 0; offset < citedCrop.length; offset += 4) {
    const rgb = [...citedCrop.subarray(offset, offset + 3)];
    const alpha = citedCrop[offset + 3];
    if (alpha > 0 && alpha < 255) {
      const isDark = Math.max(...rgb) <= 16;
      citedCropDarkPartialPixels += Number(isDark);
      citedCropDarkPartialPixelsAboveMinimumAlpha += Number(isDark && alpha > 1);
      citedCropMaximumPartialCompositeLuminanceDrop256 = Math.max(
        citedCropMaximumPartialCompositeLuminanceDrop256,
        representativeOceanLuminance256
          - weightedLuminance256(compositeAgainstRepresentativeOcean(rgb, alpha)),
      );
    }
  }
  assert.equal(citedCropDarkPartialPixelsAboveMinimumAlpha, 0);
  assert.ok(citedCropMaximumPartialCompositeLuminanceDrop256 <= 4 * 256);
  t.diagnostic(`STATIC_R4_FRINGE ${JSON.stringify({
    citedCrop: [527, 52, 96, 96],
    citedCropDarkPartialPixels,
    citedCropDarkPartialPixelsAboveMinimumAlpha,
    citedCropMaximumPartialCompositeLuminanceDrop256,
    oldAlpha128AtOrBelow12: 10_555,
    oldAlpha128AtOrBelow16: 13_778,
    oldAlpha128BoundaryPixels: 18_242,
    oldFullyOpaqueNominalFalloffPixels: 4_518,
    currentFullyOpaqueNominalFalloffPixels: aggregateFullyOpaqueFalloffPixels,
    criticPixel: {
      at: [1399, 832],
      compositeRgb: [56, 74, 72],
      rgba: criticPixel,
      renderedMetrics: criticMetrics,
      tileId: "r1-c3",
    },
    perTile,
  })}`);
});

test("native generator is tracked, source-bound, and idempotent", async () => {
  const [packageJson, builder] = await Promise.all([
    readJson("package.json"),
    readFile(
      path.join(root, "scripts/build-ninjaone-environment-native-detail.mjs"),
      "utf8",
    ),
  ]);
  assert.equal(
    packageJson.scripts["build:environment-native"],
    "node scripts/build-ninjaone-environment-native-detail.mjs --static-only",
  );
  assert.match(builder, /detail-tiles-r2\/generated/);
  assert.match(builder, /deriveVoidMask/);
  assert.match(builder, /contourCoverageAlpha/);
  assert.match(builder, /renderedFalloffMetrics/);
  assert.match(builder, /oklab/);
  assert.match(builder, /encodeMaskedRuntimeTile/);
  assert.match(builder, /buildNinjaOneEnvironmentStaticTerrain/);
  assert.doesNotMatch(
    builder,
    /terrain-master-detail-r2|detail-tiles-r3|resize\s*\(|extract\s*\(|sharpen|harmoni/i,
  );
  assert.doesNotMatch(
    builder,
    /Math\.random|Date\.now|process\.stdin|readline|prompt\(/,
  );

  const sourceHashesBefore = new Map();
  for (const id of targetIds) {
    const file = path.join(
      root,
      `${sourcePrefix.slice(1)}${id}-generated-r2.png`,
    );
    sourceHashesBefore.set(id, sha256(await readFile(file)));
  }
  for (let pass = 0; pass < 2; pass += 1) {
    const result = spawnSync(
      process.execPath,
      ["scripts/build-ninjaone-environment-native-detail.mjs", "--static-only"],
      { cwd: root, encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout.trim());
    assert.equal(output.changedMasks, 0);
    assert.equal(output.changedTiles, 0);
    assert.equal(output.manifestChanged, false);
    assert.equal(output.nativeTiles, 12);
    assert.equal(output.voidMasks, 4);
  }
  for (const id of targetIds) {
    const file = path.join(
      root,
      `${sourcePrefix.slice(1)}${id}-generated-r2.png`,
    );
    assert.equal(sha256(await readFile(file)), sourceHashesBefore.get(id));
  }
});

test("native registration and baked masks remain inside the decoded budget", async (t) => {
  const manifest = await readJson(manifestRelativePath);
  assert.deepEqual(manifest.layers, {
    dynamicShadows: {
      enabled: false,
      ownership: "excluded from terrain MVP",
    },
  });
  assert.equal(manifest.budgets.maximumMountedTerrainTiles, 4);
  assert.equal(manifest.budgets.maximumMountedVoidMasks, 0);
  assert.ok(manifest.tiles.every(({ decodedBytes }) => (
    decodedBytes === decodedTileBytes
  )));
  assert.ok(manifest.voidMasks.resources.every((mask) => (
    mask.runtimeMounted === false && mask.runtimeDecodedBytes === 0
  )));
  const worstCaseDecodedBytes = manifest.budgets.maximumMountedTerrainTiles
    * decodedTileBytes;
  assert.ok(worstCaseDecodedBytes <= manifest.budgets.maximumDecodedBytes);
  assert.equal(worstCaseDecodedBytes, 25_160_448);
  t.diagnostic(`STATIC_R2_RESIDENCY ${JSON.stringify({
    maximumDecodedBytes: manifest.budgets.maximumDecodedBytes,
    maximumMountedTerrainTiles: manifest.budgets.maximumMountedTerrainTiles,
    maximumMountedVoidMasks: manifest.budgets.maximumMountedVoidMasks,
    worstCaseDecodedBytes,
  })}`);
});
