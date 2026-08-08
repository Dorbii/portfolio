import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE_TILE_ROOT = path.join(
  ROOT,
  "art-source/career-world/ninjaone-environment/production-r2/detail-tiles-r2/generated",
);
const RUNTIME_ROOT = path.join(
  ROOT,
  "public/career-world/capitals/ninjaone/environment",
);
const RUNTIME_TILE_ROOT = path.join(RUNTIME_ROOT, "tiles/close-native-r2");
const VOID_MASK_ROOT = path.join(RUNTIME_ROOT, "masks/void-native-r2");
const MANIFEST_PATH = path.join(RUNTIME_ROOT, "manifests/native-detail-r2.json");

const ARTBOARD = Object.freeze([1440, 1080]);
const GRID = Object.freeze([4, 4]);
const TILE_ARTBOARD = Object.freeze([360, 270]);
const TILE_RUNTIME = Object.freeze([1448, 1086]);
const TILE_DECODED_BYTES = TILE_RUNTIME[0] * TILE_RUNTIME[1] * 4;
const TARGET_TILES = Object.freeze([
  Object.freeze([0, 2]),
  Object.freeze([0, 3]),
  Object.freeze([1, 2]),
  Object.freeze([1, 3]),
  Object.freeze([2, 0]),
  Object.freeze([2, 1]),
  Object.freeze([2, 2]),
  Object.freeze([2, 3]),
  Object.freeze([3, 0]),
  Object.freeze([3, 1]),
  Object.freeze([3, 2]),
  Object.freeze([3, 3]),
]);
const VOID_MASK_TILE_IDS = new Set([
  "r0-c2",
  "r0-c3",
  "r1-c2",
  "r1-c3",
]);
const VOID_MASK_CONNECTIVITY = 4;
const VOID_MASK_MAXIMUM_RGB = 16;
const VOID_MASK_LAND_SIDE_FALLOFF_CONNECTIVITY = 8;
const VOID_MASK_LAND_SIDE_FALLOFF_WIDTH_PIXELS = 2;
const VOID_MASK_CONTOUR_ANTIALIASING =
  "tent-3x3-land-occupancy-alpha-downsample-v1";
const VOID_MASK_CONTOUR_KERNEL = Object.freeze([1, 2, 1]);
const VOID_MASK_DISTANCE_ALPHA_CEILINGS = Object.freeze([192, 240]);
const VOID_MASK_MAXIMUM_RENDERED_CHANNEL_DELTA_BY_DISTANCE = Object.freeze([
  12,
  24,
]);
const VOID_MASK_MAXIMUM_RENDERED_OKLAB_DELTA_MILLI_BY_DISTANCE = Object.freeze([
  25,
  50,
]);
const VOID_MASK_MINIMUM_LAND_SIDE_ALPHA = 1;
const VOID_MASK_OPAQUE_AT_MAXIMUM_RGB = 64;
const VOID_MASK_REPRESENTATIVE_OCEAN_RGB = Object.freeze([32, 82, 96]);
const VOID_MASK_LUMINANCE_WEIGHTS_256 = Object.freeze([54, 183, 19]);
const VOID_MASK_REPRESENTATIVE_OCEAN_LUMINANCE_256 =
  VOID_MASK_REPRESENTATIVE_OCEAN_RGB.reduce((total, value, channel) => (
    total + value * VOID_MASK_LUMINANCE_WEIGHTS_256[channel]
  ), 0);
const VOID_MASK_MAXIMUM_COMPOSITE_LUMINANCE_DROP = 4;
const VOID_MASK_ALPHA_RAMP = "distance-graded-rendered-ocean-color-cap-v4";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}

function tileId(row, column) {
  return `r${row}-c${column}`;
}

function tileArtboardBounds(row, column) {
  return Object.freeze({
    origin: Object.freeze([
      column * TILE_ARTBOARD[0],
      row * TILE_ARTBOARD[1],
    ]),
    span: TILE_ARTBOARD,
  });
}

function publicPath(file) {
  return `/${path.relative(path.join(ROOT, "public"), file).replaceAll("\\", "/")}`;
}

function sourcePath(file) {
  return `/${path.relative(ROOT, file).replaceAll("\\", "/")}`;
}

function versionedPublicPath(file, digest) {
  return `${publicPath(file)}?v=${digest.slice(0, 12).toLowerCase()}`;
}

async function writeFileWithRetry(file, bytes) {
  const transientWindowsCodes = new Set(["EACCES", "EBUSY", "EPERM", "UNKNOWN"]);
  for (let attempt = 0; ; attempt += 1) {
    try {
      await writeFile(file, bytes);
      return;
    } catch (error) {
      if (
        attempt >= 7
        || !error
        || typeof error !== "object"
        || !("code" in error)
        || !transientWindowsCodes.has(error.code)
      ) {
        throw error;
      }
      await new Promise((resolve) => {
        setTimeout(resolve, 25 * (attempt + 1));
      });
    }
  }
}

async function writeIfChanged(file, bytes) {
  try {
    const current = await readFile(file);
    if (current.equals(bytes)) {
      return false;
    }
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) {
      throw error;
    }
  }
  await mkdir(path.dirname(file), { recursive: true });
  await writeFileWithRetry(file, bytes);
  return true;
}

async function pruneUnexpectedPngs(directory, expectedNames) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return;
    }
    throw error;
  }
  for (const entry of entries) {
    if (
      entry.isFile()
      && entry.name.endsWith(".png")
      && !expectedNames.has(entry.name)
    ) {
      await unlink(path.join(directory, entry.name));
    }
  }
}

async function loadSourceTile(row, column) {
  const id = tileId(row, column);
  const file = path.join(SOURCE_TILE_ROOT, `${id}-generated-r2.png`);
  const bytes = await readFile(file);
  const metadata = await sharp(bytes).metadata();
  if (
    metadata.format !== "png"
    || metadata.width !== TILE_RUNTIME[0]
    || metadata.height !== TILE_RUNTIME[1]
    || metadata.channels !== 3
    || metadata.hasAlpha !== false
  ) {
    throw new TypeError(
      `${id} must remain an unscaled 1448x1086 RGB PNG without alpha.`,
    );
  }
  const rgb = await sharp(bytes).raw().toBuffer();
  return Object.freeze({
    bytes,
    file,
    rgb,
    sha256: sha256(bytes),
    sourcePath: sourcePath(file),
  });
}

function weightedLuminance256(rgb, offset) {
  return VOID_MASK_LUMINANCE_WEIGHTS_256.reduce((total, weight, channel) => (
    total + rgb[offset + channel] * weight
  ), 0);
}

function renderedCompositeRgb(rgb, offset, alpha) {
  return VOID_MASK_REPRESENTATIVE_OCEAN_RGB.map((oceanValue, channel) => (
    Math.round((
      rgb[offset + channel] * alpha
      + oceanValue * (255 - alpha)
    ) / 255)
  ));
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

const VOID_MASK_REPRESENTATIVE_OCEAN_OKLAB = Object.freeze(
  oklab(VOID_MASK_REPRESENTATIVE_OCEAN_RGB),
);

function renderedFalloffMetrics(rgb, offset, alpha) {
  const compositeRgb = renderedCompositeRgb(rgb, offset, alpha);
  const compositeOklab = oklab(compositeRgb);
  const compositeLuminance256 = compositeRgb.reduce((total, value, channel) => (
    total + value * VOID_MASK_LUMINANCE_WEIGHTS_256[channel]
  ), 0);
  return Object.freeze({
    compositeLuminanceDrop256: Math.max(
      0,
      VOID_MASK_REPRESENTATIVE_OCEAN_LUMINANCE_256 - compositeLuminance256,
    ),
    maximumChannelDelta: Math.max(...compositeRgb.map((value, channel) => (
      Math.abs(value - VOID_MASK_REPRESENTATIVE_OCEAN_RGB[channel])
    ))),
    oklabDeltaMilli: Math.round(Math.hypot(
      ...compositeOklab.map((value, channel) => (
        value - VOID_MASK_REPRESENTATIVE_OCEAN_OKLAB[channel]
      )),
    ) * 1000),
  });
}

function contourCoverageAlpha(edgeConnectedVoid, pixel, width, height) {
  const x = pixel % width;
  const y = Math.floor(pixel / width);
  let weightedLandOccupancy = 0;
  let totalWeight = 0;
  for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
    const sampleY = Math.max(0, Math.min(height - 1, y + offsetY));
    const weightY = VOID_MASK_CONTOUR_KERNEL[offsetY + 1];
    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      const sampleX = Math.max(0, Math.min(width - 1, x + offsetX));
      const weight = weightY * VOID_MASK_CONTOUR_KERNEL[offsetX + 1];
      const neighbor = sampleY * width + sampleX;
      weightedLandOccupancy += weight * Number(!edgeConnectedVoid[neighbor]);
      totalWeight += weight;
    }
  }
  return Math.max(
    VOID_MASK_MINIMUM_LAND_SIDE_ALPHA,
    Math.round(weightedLandOccupancy * 255 / totalWeight),
  );
}

function landSideFalloffAlpha(rgb, offset, distance, contourAlpha) {
  const distanceIndex = distance - 1;
  const maximumRgb = Math.max(rgb[offset], rgb[offset + 1], rgb[offset + 2]);
  const rampSpan = VOID_MASK_OPAQUE_AT_MAXIMUM_RGB - VOID_MASK_MAXIMUM_RGB;
  const rampAlpha = Math.max(0, Math.min(255, Math.round(
    (maximumRgb - VOID_MASK_MAXIMUM_RGB) * 255 / rampSpan,
  )));
  const luminanceDifference = VOID_MASK_REPRESENTATIVE_OCEAN_LUMINANCE_256
    - weightedLuminance256(rgb, offset);
  const luminanceCap = luminanceDifference > 0
    ? Math.max(0, Math.min(255, Math.floor(
      VOID_MASK_MAXIMUM_COMPOSITE_LUMINANCE_DROP * 256 * 255
      / luminanceDifference,
    )))
    : 255;
  let alpha = Math.max(
    VOID_MASK_MINIMUM_LAND_SIDE_ALPHA,
    Math.min(
      rampAlpha,
      luminanceCap,
      contourAlpha,
      VOID_MASK_DISTANCE_ALPHA_CEILINGS[distanceIndex],
    ),
  );
  let metrics = renderedFalloffMetrics(rgb, offset, alpha);
  while (alpha > VOID_MASK_MINIMUM_LAND_SIDE_ALPHA && (
    metrics.compositeLuminanceDrop256
      > VOID_MASK_MAXIMUM_COMPOSITE_LUMINANCE_DROP * 256
    || metrics.maximumChannelDelta
      > VOID_MASK_MAXIMUM_RENDERED_CHANNEL_DELTA_BY_DISTANCE[distanceIndex]
    || metrics.oklabDeltaMilli
      > VOID_MASK_MAXIMUM_RENDERED_OKLAB_DELTA_MILLI_BY_DISTANCE[distanceIndex]
  )) {
    alpha -= 1;
    metrics = renderedFalloffMetrics(rgb, offset, alpha);
  }
  return alpha;
}

function deriveVoidMask(rgb) {
  const [width, height] = TILE_RUNTIME;
  const pixelCount = width * height;
  const nearBlack = new Uint8Array(pixelCount);
  const edgeConnectedVoid = new Uint8Array(pixelCount);
  const queue = new Uint32Array(pixelCount);
  let nearBlackPixels = 0;
  let queueHead = 0;
  let queueTail = 0;

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const offset = pixel * 3;
    nearBlack[pixel] = Number(
      Math.max(rgb[offset], rgb[offset + 1], rgb[offset + 2])
      <= VOID_MASK_MAXIMUM_RGB,
    );
    nearBlackPixels += nearBlack[pixel];
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
  for (
    let distance = 1;
    distance <= VOID_MASK_LAND_SIDE_FALLOFF_WIDTH_PIXELS;
    distance += 1
  ) {
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
  const maximumContourCoverageAlphaByDistance = [0, 0];
  const maximumAlphaByDistance = [0, 0];
  let maximumPartialAlpha = 0;
  let maximumBoundaryCompositeLuminanceDrop256 = 0;
  let maximumPartialCompositeLuminanceDrop256 = 0;
  const maximumRenderedChannelDeltaByDistance = [0, 0];
  const maximumRenderedOklabDeltaMilliByDistance = [0, 0];
  const minimumContourCoverageAlphaByDistance = [255, 255];
  const minimumAlphaByDistance = [255, 255];
  let minimumPartialAlpha = 255;
  let partialPixelsAtOrBelowNearBlackMaximumRgb = 0;
  let transparentFalloffPixels = 0;
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    if (falloffDistance[pixel] === 0) {
      continue;
    }
    const distanceIndex = falloffDistance[pixel] - 1;
    const offset = pixel * 3;
    const maximumRgb = Math.max(
      rgb[offset],
      rgb[offset + 1],
      rgb[offset + 2],
    );
    const contourAlpha = contourCoverageAlpha(
      edgeConnectedVoid,
      pixel,
      width,
      height,
    );
    const falloffAlpha = landSideFalloffAlpha(
      rgb,
      offset,
      falloffDistance[pixel],
      contourAlpha,
    );
    const renderedMetrics = renderedFalloffMetrics(rgb, offset, falloffAlpha);
    boundaryPixels += 1;
    falloffPixelsByDistance[distanceIndex] += 1;
    contourCoveragePixelsByDistance[distanceIndex] += 1;
    partialContourCoveragePixelsByDistance[distanceIndex] += Number(
      contourAlpha < 255,
    );
    boundaryPixelsExceedingCompositeLuminanceDrop += Number(
      renderedMetrics.compositeLuminanceDrop256
        > VOID_MASK_MAXIMUM_COMPOSITE_LUMINANCE_DROP * 256,
    );
    boundaryPixelsExceedingRenderedColorDelta += Number(
      renderedMetrics.maximumChannelDelta
        > VOID_MASK_MAXIMUM_RENDERED_CHANNEL_DELTA_BY_DISTANCE[distanceIndex]
      || renderedMetrics.oklabDeltaMilli
        > VOID_MASK_MAXIMUM_RENDERED_OKLAB_DELTA_MILLI_BY_DISTANCE[distanceIndex],
    );
    maximumBoundaryCompositeLuminanceDrop256 = Math.max(
      maximumBoundaryCompositeLuminanceDrop256,
      renderedMetrics.compositeLuminanceDrop256,
    );
    maximumRenderedChannelDeltaByDistance[distanceIndex] = Math.max(
      maximumRenderedChannelDeltaByDistance[distanceIndex],
      renderedMetrics.maximumChannelDelta,
    );
    maximumRenderedOklabDeltaMilliByDistance[distanceIndex] = Math.max(
      maximumRenderedOklabDeltaMilliByDistance[distanceIndex],
      renderedMetrics.oklabDeltaMilli,
    );
    maximumContourCoverageAlphaByDistance[distanceIndex] = Math.max(
      maximumContourCoverageAlphaByDistance[distanceIndex],
      contourAlpha,
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
      maximumRgb <= VOID_MASK_MAXIMUM_RGB,
    );
    maximumPartialCompositeLuminanceDrop256 = Math.max(
      maximumPartialCompositeLuminanceDrop256,
      renderedMetrics.compositeLuminanceDrop256,
    );
  }

  return Object.freeze({
    alpha,
    boundaryPixels,
    boundaryPixelsExceedingCompositeLuminanceDrop,
    boundaryPixelsExceedingRenderedColorDelta,
    contourCoveragePixelsByDistance: Object.freeze(
      contourCoveragePixelsByDistance,
    ),
    falloffPixels,
    falloffPixelsByDistance: Object.freeze(falloffPixelsByDistance),
    featheredPixels,
    fullyOpaqueBoundaryPixels,
    fullyOpaqueFalloffPixelsByDistance: Object.freeze(
      fullyOpaqueFalloffPixelsByDistance,
    ),
    interiorNearBlackPixels: nearBlackPixels - queueTail,
    maximumContourCoverageAlphaByDistance: Object.freeze(
      maximumContourCoverageAlphaByDistance,
    ),
    maximumAlphaByDistance: Object.freeze(maximumAlphaByDistance),
    maximumBoundaryCompositeLuminanceDrop256,
    maximumPartialAlpha,
    maximumPartialCompositeLuminanceDrop256,
    maximumRenderedChannelDeltaByDistance: Object.freeze(
      maximumRenderedChannelDeltaByDistance,
    ),
    maximumRenderedOklabDeltaMilliByDistance: Object.freeze(
      maximumRenderedOklabDeltaMilliByDistance,
    ),
    minimumContourCoverageAlphaByDistance: Object.freeze(
      minimumContourCoverageAlphaByDistance,
    ),
    minimumAlphaByDistance: Object.freeze(minimumAlphaByDistance),
    minimumPartialAlpha,
    partialPixelsAtOrBelowNearBlackMaximumRgb,
    partialContourCoveragePixelsByDistance: Object.freeze(
      partialContourCoveragePixelsByDistance,
    ),
    transparentFalloffPixels,
    voidPixels: queueTail,
  });
}

async function encodeVoidMask(alpha) {
  return sharp(alpha, {
    raw: {
      channels: 1,
      height: TILE_RUNTIME[1],
      width: TILE_RUNTIME[0],
    },
  })
    .toColourspace("b-w")
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();
}

async function encodeMaskedRuntimeTile(rgb, alpha) {
  const pixelCount = TILE_RUNTIME[0] * TILE_RUNTIME[1];
  const rgba = Buffer.allocUnsafe(pixelCount * 4);
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const rgbOffset = pixel * 3;
    const rgbaOffset = pixel * 4;
    rgba[rgbaOffset] = rgb[rgbOffset];
    rgba[rgbaOffset + 1] = rgb[rgbOffset + 1];
    rgba[rgbaOffset + 2] = rgb[rgbOffset + 2];
    rgba[rgbaOffset + 3] = alpha[pixel];
  }
  return sharp(rgba, {
    raw: {
      channels: 4,
      height: TILE_RUNTIME[1],
      width: TILE_RUNTIME[0],
    },
  })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();
}

async function buildNativeTiles() {
  const expectedTileNames = new Set(TARGET_TILES.map(([row, column]) => (
    `${tileId(row, column)}-close-native-r2.png`
  )));
  const expectedMaskNames = new Set([...VOID_MASK_TILE_IDS].map((id) => (
    `${id}-void-mask-r2.png`
  )));
  await Promise.all([
    pruneUnexpectedPngs(RUNTIME_TILE_ROOT, expectedTileNames),
    pruneUnexpectedPngs(VOID_MASK_ROOT, expectedMaskNames),
  ]);

  const tiles = [];
  const voidMasks = [];
  let changedMasks = 0;
  let changedTiles = 0;
  for (const [row, column] of TARGET_TILES) {
    const id = tileId(row, column);
    const source = await loadSourceTile(row, column);
    const output = path.join(RUNTIME_TILE_ROOT, `${id}-close-native-r2.png`);
    let runtimeBytes = source.bytes;
    let voidMaskId = null;

    if (VOID_MASK_TILE_IDS.has(id)) {
      const derived = deriveVoidMask(source.rgb);
      if (
        derived.voidPixels === 0
        || derived.featheredPixels === 0
        || derived.boundaryPixelsExceedingCompositeLuminanceDrop !== 0
        || derived.boundaryPixelsExceedingRenderedColorDelta !== 0
        || derived.fullyOpaqueBoundaryPixels !== 0
        || derived.fullyOpaqueFalloffPixelsByDistance.some((count) => count !== 0)
        || derived.maximumAlphaByDistance.some((maximumAlpha, index) => (
          maximumAlpha > VOID_MASK_DISTANCE_ALPHA_CEILINGS[index]
        ))
        || derived.maximumRenderedChannelDeltaByDistance.some(
          (maximumDelta, index) => (
            maximumDelta
              > VOID_MASK_MAXIMUM_RENDERED_CHANNEL_DELTA_BY_DISTANCE[index]
          ),
        )
        || derived.maximumRenderedOklabDeltaMilliByDistance.some(
          (maximumDelta, index) => (
            maximumDelta
              > VOID_MASK_MAXIMUM_RENDERED_OKLAB_DELTA_MILLI_BY_DISTANCE[index]
          ),
        )
        || derived.maximumBoundaryCompositeLuminanceDrop256
          > VOID_MASK_MAXIMUM_COMPOSITE_LUMINANCE_DROP * 256
      ) {
        throw new TypeError(`${id} no longer contains the registered C1 source matte.`);
      }
      const maskOutput = path.join(VOID_MASK_ROOT, `${id}-void-mask-r2.png`);
      const maskBytes = await encodeVoidMask(derived.alpha);
      const maskDigest = sha256(maskBytes);
      changedMasks += Number(await writeIfChanged(maskOutput, maskBytes));
      runtimeBytes = await encodeMaskedRuntimeTile(source.rgb, derived.alpha);
      voidMaskId = `${id}-void-mask`;
      voidMasks.push(Object.freeze({
        boundaryPixels: derived.boundaryPixels,
        boundaryPixelsExceedingCompositeLuminanceDrop:
          derived.boundaryPixelsExceedingCompositeLuminanceDrop,
        boundaryPixelsExceedingRenderedColorDelta:
          derived.boundaryPixelsExceedingRenderedColorDelta,
        contourCoveragePixelsByDistance:
          derived.contourCoveragePixelsByDistance,
        dimensions: TILE_RUNTIME,
        falloffPixels: derived.falloffPixels,
        falloffPixelsByDistance: derived.falloffPixelsByDistance,
        featheredPixels: derived.featheredPixels,
        fullyOpaqueBoundaryPixels: derived.fullyOpaqueBoundaryPixels,
        fullyOpaqueFalloffPixelsByDistance:
          derived.fullyOpaqueFalloffPixelsByDistance,
        id: voidMaskId,
        interiorNearBlackPixels: derived.interiorNearBlackPixels,
        maximumAlphaByDistance: derived.maximumAlphaByDistance,
        maximumBoundaryCompositeLuminanceDrop256:
          derived.maximumBoundaryCompositeLuminanceDrop256,
        maximumContourCoverageAlphaByDistance:
          derived.maximumContourCoverageAlphaByDistance,
        maximumPartialAlpha: derived.maximumPartialAlpha,
        maximumPartialCompositeLuminanceDrop256:
          derived.maximumPartialCompositeLuminanceDrop256,
        maximumRenderedChannelDeltaByDistance:
          derived.maximumRenderedChannelDeltaByDistance,
        maximumRenderedOklabDeltaMilliByDistance:
          derived.maximumRenderedOklabDeltaMilliByDistance,
        minimumAlphaByDistance: derived.minimumAlphaByDistance,
        minimumContourCoverageAlphaByDistance:
          derived.minimumContourCoverageAlphaByDistance,
        minimumPartialAlpha: derived.minimumPartialAlpha,
        path: versionedPublicPath(maskOutput, maskDigest),
        partialPixelsAtOrBelowNearBlackMaximumRgb:
          derived.partialPixelsAtOrBelowNearBlackMaximumRgb,
        partialContourCoveragePixelsByDistance:
          derived.partialContourCoveragePixelsByDistance,
        runtimeDecodedBytes: 0,
        runtimeMounted: false,
        sha256: maskDigest,
        sourceCrop: Object.freeze([0, 0, TILE_RUNTIME[0], TILE_RUNTIME[1]]),
        sourceDimensions: TILE_RUNTIME,
        sourcePath: source.sourcePath,
        sourceSha256: source.sha256,
        storageFormat: "png-grayscale-8",
        tileId: id,
        transparentFalloffPixels: derived.transparentFalloffPixels,
        voidPixels: derived.voidPixels,
      }));
    }

    const runtimeDigest = sha256(runtimeBytes);
    changedTiles += Number(await writeIfChanged(output, runtimeBytes));
    tiles.push(Object.freeze({
      artboardBounds: tileArtboardBounds(row, column),
      column,
      decodedBytes: TILE_DECODED_BYTES,
      decodedRgbSha256: sha256(source.rgb),
      dimensions: TILE_RUNTIME,
      id,
      path: versionedPublicPath(output, runtimeDigest),
      row,
      sha256: runtimeDigest,
      sourceCrop: Object.freeze([0, 0, TILE_RUNTIME[0], TILE_RUNTIME[1]]),
      sourceDimensions: TILE_RUNTIME,
      sourcePath: source.sourcePath,
      sourceSha256: source.sha256,
      voidMaskId,
    }));
  }
  return Object.freeze({
    changedMasks,
    changedTiles,
    tiles: Object.freeze(tiles),
    voidMasks: Object.freeze(voidMasks),
  });
}

function nativeDetailRegistration() {
  return Object.freeze({
    artboard: ARTBOARD,
    grid: GRID,
    runtimeTileDimensions: TILE_RUNTIME,
    tileArtboard: TILE_ARTBOARD,
  });
}

function nativeDetailBudgets() {
  return Object.freeze({
    maximumAnimatedNodes: 6,
    maximumDecodedBytes: 32 * 1024 * 1024,
    maximumMountedTerrainTiles: 4,
    maximumMountedVoidMasks: 0,
  });
}

export async function buildNinjaOneEnvironmentStaticTerrain() {
  const {
    changedMasks,
    changedTiles,
    tiles,
    voidMasks,
  } = await buildNativeTiles();
  const manifest = Object.freeze({
    schemaVersion: 1,
    id: "career-world/capitals/ninjaone/native-detail@r2",
    status: "accepted-close-detail",
    registration: nativeDetailRegistration(),
    budgets: nativeDetailBudgets(),
    tiles,
    voidMasks: Object.freeze({
      derivation: Object.freeze({
        alphaRamp: VOID_MASK_ALPHA_RAMP,
        connectivity: VOID_MASK_CONNECTIVITY,
        contourAntialiasing: VOID_MASK_CONTOUR_ANTIALIASING,
        contourKernel: VOID_MASK_CONTOUR_KERNEL,
        distanceAlphaCeilings: VOID_MASK_DISTANCE_ALPHA_CEILINGS,
        landSideFalloffConnectivity: VOID_MASK_LAND_SIDE_FALLOFF_CONNECTIVITY,
        landSideFalloffWidthPixels: VOID_MASK_LAND_SIDE_FALLOFF_WIDTH_PIXELS,
        luminanceWeights256: VOID_MASK_LUMINANCE_WEIGHTS_256,
        maximumCompositeLuminanceDrop:
          VOID_MASK_MAXIMUM_COMPOSITE_LUMINANCE_DROP,
        maximumRenderedChannelDeltaByDistance:
          VOID_MASK_MAXIMUM_RENDERED_CHANNEL_DELTA_BY_DISTANCE,
        maximumRenderedOklabDeltaMilliByDistance:
          VOID_MASK_MAXIMUM_RENDERED_OKLAB_DELTA_MILLI_BY_DISTANCE,
        minimumLandSideAlpha: VOID_MASK_MINIMUM_LAND_SIDE_ALPHA,
        nearBlackMaximumRgb: VOID_MASK_MAXIMUM_RGB,
        opaqueAtMaximumRgb: VOID_MASK_OPAQUE_AT_MAXIMUM_RGB,
        perceptualColorSpace: "oklab-euclidean",
        representativeOceanRgb: VOID_MASK_REPRESENTATIVE_OCEAN_RGB,
        seed: "all-source-edges",
      }),
      integration: "baked-runtime-alpha",
      ownership:
        "source-derived matte provenance; coastline and beach treatment are excluded",
      resources: voidMasks,
    }),
    layers: Object.freeze({
      dynamicShadows: Object.freeze({
        enabled: false,
        ownership: "excluded from terrain MVP",
      }),
    }),
  });
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
  const manifestChanged = await writeIfChanged(MANIFEST_PATH, manifestBytes);
  return Object.freeze({ changedMasks, changedTiles, manifest, manifestChanged });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const unsupportedArguments = process.argv.slice(2).filter((argument) => (
    argument !== "--static-only"
  ));
  if (unsupportedArguments.length > 0) {
    throw new TypeError(`Unsupported native terrain arguments: ${unsupportedArguments.join(", ")}`);
  }
  const result = await buildNinjaOneEnvironmentStaticTerrain();
  console.log(JSON.stringify({
    changedMasks: result.changedMasks,
    changedTiles: result.changedTiles,
    manifest: path.relative(ROOT, MANIFEST_PATH),
    manifestChanged: result.manifestChanged,
    nativeTiles: result.manifest.tiles.length,
    staticOnly: true,
    voidMasks: result.manifest.voidMasks.resources.length,
  }));
}
