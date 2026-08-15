import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const MASTER_SOURCE_PATH = path.join(
  ROOT,
  "art-source/career-world/ninjaone-environment/production-r2/ninjaone-environment-terrain-master-detail-r8.png",
);
const MASTER_SOURCE_ID = "terrain-master-detail-r8";
const MASTER_SOURCE_PUBLIC_PATH =
  "/art-source/career-world/ninjaone-environment/production-r2/ninjaone-environment-terrain-master-detail-r8.png";
const OUTPUT_ROOT = path.join(
  ROOT,
  "public/career-world/capitals/ninjaone/environment/shared/foliage-native-r4",
);
const MANIFEST_PATH = path.join(
  ROOT,
  "public/career-world/capitals/ninjaone/environment/manifests/foliage-native-r4.json",
);
const INLAND_WATER_MANIFEST_PATH = path.join(
  ROOT,
  "public/career-world/capitals/ninjaone/environment/manifests/inland-water-r1.json",
);
const PROOF_ROOT = path.join(
  ROOT,
  ".codex-tmp/gauntlet/ninjaone-mvp-20260807-01/artifacts/foliage-r4/source-composites",
);
const MASTER_SOURCE_DIMENSIONS = Object.freeze([5760, 4320]);
const TERRAIN_TILE_DECODE_DIMENSIONS = Object.freeze([1448, 1086]);
const ARTBOARD = Object.freeze([1440, 1080]);
const GRID = Object.freeze([4, 4]);
const MAXIMUM_DECODED_BYTES = 32 * 1024 * 1024;
const MAXIMUM_TERRAIN_TILES = 4;
const MAXIMUM_SUPPLEMENTAL_NODES = 64;
const MAXIMUM_SELECTED_GROUPS = 32;
const NODES_PER_GROUP = 2;
const MAX_DETAIL_ENTER_SPAN = 0.12;
const MAX_DETAIL_RETAIN_SPAN = 0.14;
const TARGET_MASTER_DIMENSIONS = Object.freeze([2880, 2160]);
const TARGET_CELL_DIMENSIONS = Object.freeze([1440, 1080]);
const TRIM_PADDING = 1;
const NEUTRALIZATION_DILATION = 4;
const ATLAS_WIDTH = 1024;
const ATLAS_PADDING = 1;
const MINIMUM_COMPONENT_PIXELS = 100;

const CELLS = Object.freeze([
  Object.freeze({
    gridCell: "B1",
    maskSourceName: "b1-conifer-occupancy-alpha-imagegen-r5.png",
    neutralizationSourceName: "b1-conifer-neutralization-imagegen-r5.png",
    targetOrigin: Object.freeze([0, 0]),
  }),
  Object.freeze({
    gridCell: "C1",
    maskSourceName: "c1-conifer-occupancy-alpha-imagegen-r5.png",
    neutralizationSourceName: "c1-conifer-neutralization-imagegen-r5.png",
    targetOrigin: Object.freeze([TARGET_CELL_DIMENSIONS[0], 0]),
  }),
  Object.freeze({
    gridCell: "B2",
    maskSourceName: "b2-conifer-occupancy-alpha-imagegen-r5.png",
    neutralizationSourceName: "b2-conifer-neutralization-imagegen-r5.png",
    targetOrigin: Object.freeze([0, TARGET_CELL_DIMENSIONS[1]]),
  }),
  Object.freeze({
    gridCell: "C2",
    maskSourceName: "c2-conifer-occupancy-alpha-imagegen-r5.png",
    neutralizationSourceName: "c2-conifer-neutralization-imagegen-r5.png",
    targetOrigin: Object.freeze([
      TARGET_CELL_DIMENSIONS[0],
      TARGET_CELL_DIMENSIONS[1],
    ]),
  }),
]);

const SUPPLEMENTAL_SOURCES = Object.freeze([
  ...[1, 2, 3].map((variant) => Object.freeze({
    family: "russet-fantasy-tree",
    fileName: `russet-fantasy-tree-${String(variant).padStart(2, "0")}.png`,
    frameDimensions: Object.freeze([72, 104]),
    id: `russet-fantasy-tree-${String(variant).padStart(2, "0")}`,
    species: "russet-fantasy-tree",
  })),
  ...[1, 2].map((variant) => Object.freeze({
    family: "silver-aspen",
    fileName: `silver-aspen-tree-${String(variant).padStart(2, "0")}.png`,
    frameDimensions: Object.freeze([66, 96]),
    id: `silver-aspen-tree-${String(variant).padStart(2, "0")}`,
    species: "silver-aspen",
  })),
  ...[1, 2, 3].map((variant) => Object.freeze({
    family: "alpine-shrub",
    fileName: `alpine-shrub-${String(variant).padStart(2, "0")}.png`,
    frameDimensions: Object.freeze([56, 38]),
    id: `alpine-shrub-${String(variant).padStart(2, "0")}`,
    species: "alpine-shrub",
  })),
  ...[1, 2, 3].map((variant) => Object.freeze({
    family: "wildflower-heather",
    fileName: `wildflower-heather-${String(variant).padStart(2, "0")}.png`,
    frameDimensions: Object.freeze([48, 28]),
    id: `wildflower-heather-${String(variant).padStart(2, "0")}`,
    species: "wildflower-heather",
  })),
]);

const SUPPLEMENTAL_PLACEMENTS = Object.freeze([
  ["russet-fantasy-tree-02", 720, 328, 1],
  ["russet-fantasy-tree-01", 1110, 445, 0.9],
  ["russet-fantasy-tree-03", 286, 845, 0.92],
  ["russet-fantasy-tree-01", 1225, 660, 0.82],
  ["russet-fantasy-tree-02", 585, 735, 0.84],
  ["silver-aspen-tree-02", 635, 500, 0.9],
  ["silver-aspen-tree-02", 1025, 825, 0.88],
  ["silver-aspen-tree-01", 500, 690, 0.78],
  ["silver-aspen-tree-02", 1180, 585, 0.76],
  ["alpine-shrub-01", 690, 565, 0.82],
  ["alpine-shrub-02", 735, 610, 0.76],
  ["alpine-shrub-03", 1015, 555, 0.88],
  ["alpine-shrub-01", 360, 715, 0.74],
  ["alpine-shrub-02", 885, 865, 0.78],
  ["alpine-shrub-03", 1210, 760, 0.8],
  ["wildflower-heather-01", 745, 455, 0.78],
  ["wildflower-heather-02", 1050, 520, 0.72],
  ["wildflower-heather-03", 420, 735, 0.74],
  ["wildflower-heather-01", 705, 590, 0.68],
  ["wildflower-heather-02", 1120, 700, 0.7],
  ["wildflower-heather-03", 320, 895, 0.72],
  ["wildflower-heather-01", 900, 925, 0.66],
  ["wildflower-heather-02", 1260, 835, 0.68],
  ["wildflower-heather-03", 540, 295, 0.64],
].map(([sourceId, anchorX, anchorY, scale], index) => Object.freeze({
  anchor: Object.freeze([anchorX, anchorY]),
  id: `supplemental-foliage-${String(index + 1).padStart(2, "0")}`,
  scale,
  sourceId,
})));

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}

function versionedPublicPath(filePath, digest) {
  return `/${path.relative(path.join(ROOT, "public"), filePath).replaceAll("\\", "/")}?v=${digest.slice(0, 12).toLowerCase()}`;
}

async function writeJsonAtomically(targetPath, value) {
  const temporaryPath = `${targetPath}.next-${process.pid}`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      await rename(temporaryPath, targetPath);
      return;
    } catch (error) {
      if (attempt === 7) {
        await rm(temporaryPath, { force: true });
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 20 * (attempt + 1)));
    }
  }
}

async function writeFileIfChanged(targetPath, bytes) {
  try {
    const existingBytes = await readFile(targetPath);
    if (existingBytes.equals(bytes)) return false;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  await writeFile(targetPath, bytes);
  return true;
}

function alphaMetrics(alpha, width, height, threshold = 192) {
  let alphaSum = 0;
  let boundaryHighAlphaPixels = 0;
  let highAlphaPixels = 0;
  let opaquePixels = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let pixel = 0; pixel < alpha.length; pixel += 1) {
    const value = alpha[pixel];
    alphaSum += value;
    if (value === 0) continue;
    opaquePixels += 1;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    if (value >= threshold) {
      highAlphaPixels += 1;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        boundaryHighAlphaPixels += 1;
      }
    }
  }
  return Object.freeze({
    alphaBounds: Object.freeze([minX, minY, maxX, maxY]),
    alphaSum,
    boundaryHighAlphaPixels,
    highAlphaPixels,
    opaquePixels,
  });
}

function trimForAlpha(alpha, width, height) {
  const { alphaBounds } = alphaMetrics(alpha, width, height, 1);
  const [minX, minY, maxX, maxY] = alphaBounds;
  return Object.freeze({
    left: Math.max(0, minX - TRIM_PADDING),
    top: Math.max(0, minY - TRIM_PADDING),
    width: Math.min(width - 1, maxX + TRIM_PADDING) - Math.max(0, minX - TRIM_PADDING) + 1,
    height: Math.min(height - 1, maxY + TRIM_PADDING) - Math.max(0, minY - TRIM_PADDING) + 1,
  });
}

function cropRaw(source, sourceWidth, trim, channels) {
  const output = Buffer.alloc(trim.width * trim.height * channels);
  for (let y = 0; y < trim.height; y += 1) {
    const sourceStart = ((trim.top + y) * sourceWidth + trim.left) * channels;
    const outputStart = y * trim.width * channels;
    source.copy(
      output,
      outputStart,
      sourceStart,
      sourceStart + trim.width * channels,
    );
  }
  return output;
}

function spriteRgba(rgbSource, alpha) {
  const output = Buffer.alloc(rgbSource.length);
  for (let pixel = 0; pixel < alpha.length; pixel += 1) {
    const offset = pixel * 4;
    output[offset] = rgbSource[offset];
    output[offset + 1] = rgbSource[offset + 1];
    output[offset + 2] = rgbSource[offset + 2];
    output[offset + 3] = alpha[pixel];
  }
  return output;
}

function compositeRgba(base, layer) {
  const output = Buffer.from(base);
  for (let pixel = 0; pixel < base.length / 4; pixel += 1) {
    const offset = pixel * 4;
    const alpha = layer[offset + 3] / 255;
    if (alpha === 0) continue;
    for (let channel = 0; channel < 3; channel += 1) {
      output[offset + channel] = Math.round(
        layer[offset + channel] * alpha
          + base[offset + channel] * (1 - alpha),
      );
    }
    output[offset + 3] = 255;
  }
  return output;
}

function differenceMetrics(first, second, includePixel = () => true) {
  let changedPixels = 0;
  let comparedPixels = 0;
  let maximumChannelDifference = 0;
  let totalChannelDifference = 0;
  for (let pixel = 0; pixel < first.length / 4; pixel += 1) {
    if (!includePixel(pixel)) continue;
    comparedPixels += 1;
    const offset = pixel * 4;
    const difference = Math.max(
      Math.abs(first[offset] - second[offset]),
      Math.abs(first[offset + 1] - second[offset + 1]),
      Math.abs(first[offset + 2] - second[offset + 2]),
      Math.abs(first[offset + 3] - second[offset + 3]),
    );
    if (difference > 0) changedPixels += 1;
    maximumChannelDifference = Math.max(maximumChannelDifference, difference);
    totalChannelDifference += difference;
  }
  return Object.freeze({
    changedPixels,
    comparedPixels,
    maximumChannelDifference,
    meanMaximumChannelDifference: Number((
      comparedPixels === 0 ? 0 : totalChannelDifference / comparedPixels
    ).toFixed(6)),
  });
}

function deterministicMotion(index, gridCell) {
  const seed = [...`${gridCell}:${index}`]
    .reduce((value, character) => (
      (value * 33 + character.charCodeAt(0)) >>> 0
    ), 5381);
  return Object.freeze({
    bendDegrees: Number((0.62 + (seed % 58) / 100).toFixed(2)),
    durationSeconds: Number((6.2 + ((seed >>> 5) % 37) / 10).toFixed(1)),
    lagDegrees: Number((0.035 + ((seed >>> 10) % 61) / 1000).toFixed(3)),
    phaseSeconds: Number((-((seed >>> 15) % 91) / 10).toFixed(1)),
  });
}

function supplementalMotion(species, index) {
  const profiles = {
    "russet-fantasy-tree": [0.58, 0.19, 8.2, 0.05, 94],
    "silver-aspen": [0.5, 0.16, 7.6, 0.045, 95],
    "alpine-shrub": [0.28, 0.1, 6.8, 0.025, 90],
    "wildflower-heather": [0.16, 0.06, 5.8, 0.012, 88],
  };
  const [bend, bendVariance, duration, lag, pivotYPercent] = profiles[species];
  return Object.freeze({
    bendDegrees: Number((bend + (index % 4) * bendVariance / 3).toFixed(2)),
    durationSeconds: Number((duration + (index % 5) * 0.33).toFixed(1)),
    lagDegrees: Number((lag + (index % 3) * 0.008).toFixed(3)),
    phaseSeconds: Number((-(index * 1.37 % 9.5)).toFixed(1)),
    pivotYPercent,
  });
}

function pointInPolygon([x, y], polygon) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const [currentX, currentY] = polygon[index];
    const [previousX, previousY] = polygon[previous];
    if (
      (currentY > y) !== (previousY > y)
      && x < (previousX - currentX) * (y - currentY)
        / (previousY - currentY) + currentX
    ) inside = !inside;
  }
  return inside;
}

function pointToSegmentDistance([x, y], [startX, startY], [endX, endY]) {
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const lengthSquared = deltaX ** 2 + deltaY ** 2;
  const projection = lengthSquared === 0
    ? 0
    : Math.max(0, Math.min(1, ((x - startX) * deltaX + (y - startY) * deltaY) / lengthSquared));
  return Math.hypot(x - (startX + deltaX * projection), y - (startY + deltaY * projection));
}

function pointInsideInlandWater(point, waterManifest) {
  return waterManifest.segments.some((segment) => {
    if (segment.polygon && pointInPolygon(point, segment.polygon)) return true;
    if (!segment.points) return false;
    for (let index = 1; index < segment.points.length; index += 1) {
      if (pointToSegmentDistance(point, segment.points[index - 1], segment.points[index]) <= segment.radius) {
        return true;
      }
    }
    return false;
  });
}

function assertTransparentArtwork(rgba, width, height, label) {
  let alphaPixels = 0;
  let magentaPixels = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const alpha = rgba[offset + 3];
      if ((x === 0 || y === 0 || x === width - 1 || y === height - 1) && alpha !== 0) {
        throw new RangeError(`${label} touches its outer alpha edge.`);
      }
      if (alpha < 16) continue;
      alphaPixels += 1;
      const keyDistance = Math.hypot(
        255 - rgba[offset],
        rgba[offset + 1],
        255 - rgba[offset + 2],
      );
      if (keyDistance <= 70) {
        magentaPixels += 1;
      }
    }
  }
  if (alphaPixels < 32 || magentaPixels > 0) {
    throw new RangeError(`${label} failed alpha or chroma validation.`);
  }
  return alphaPixels;
}

async function loadSupplementalArtwork(expectedOutputNames) {
  const artwork = new Map();
  const sources = [];
  for (const definition of SUPPLEMENTAL_SOURCES) {
    const filePath = path.join(OUTPUT_ROOT, definition.fileName);
    const bytes = await readFile(filePath);
    const metadata = await sharp(bytes).metadata();
    if (!metadata.width || !metadata.height || metadata.format !== "png" || metadata.hasAlpha !== true) {
      throw new RangeError(`${definition.id} is not transparent PNG artwork.`);
    }
    const sourceRgba = await sharp(bytes).ensureAlpha().raw().toBuffer();
    const sourceAlphaPixels = assertTransparentArtwork(
      sourceRgba,
      metadata.width,
      metadata.height,
      definition.id,
    );
    const [frameWidth, frameHeight] = definition.frameDimensions;
    const rgba = await sharp(bytes)
      .trim({
        background: { alpha: 0, b: 0, g: 0, r: 0 },
        threshold: 2,
      })
      .resize(frameWidth - 4, frameHeight - 4, {
        background: { alpha: 0, b: 0, g: 0, r: 0 },
        fit: "contain",
        kernel: "lanczos3",
        position: "bottom",
      })
      .extend({
        background: { alpha: 0, b: 0, g: 0, r: 0 },
        bottom: 2,
        left: 2,
        right: 2,
        top: 2,
      })
      .ensureAlpha()
      .raw()
      .toBuffer();
    assertTransparentArtwork(rgba, frameWidth, frameHeight, `${definition.id} runtime frame`);
    expectedOutputNames.add(definition.fileName);
    artwork.set(definition.id, Object.freeze({
      ...definition,
      rgba,
      sourceAlphaPixels,
    }));
    sources.push(Object.freeze({
      dimensions: Object.freeze([metadata.width, metadata.height]),
      family: definition.family,
      id: definition.id,
      inputRole: "additive-original-foliage-artwork",
      path: versionedPublicPath(filePath, sha256(bytes)),
      provider: "built-in-imagegen",
      sha256: sha256(bytes),
      species: definition.species,
      usage: "build input only; one pooled runtime frame is reused by multiple registered placements",
    }));
  }
  return Object.freeze({ artwork, sources: Object.freeze(sources) });
}

function dilateAlpha(alpha, width, height, radius) {
  const output = Buffer.alloc(alpha.length);
  for (let pixel = 0; pixel < alpha.length; pixel += 1) {
    if (alpha[pixel] !== 255) continue;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    for (let deltaY = -radius; deltaY <= radius; deltaY += 1) {
      const supportY = y + deltaY;
      if (supportY < 0 || supportY >= height) continue;
      const horizontalRadius = Math.floor(Math.sqrt(radius ** 2 - deltaY ** 2));
      for (let deltaX = -horizontalRadius; deltaX <= horizontalRadius; deltaX += 1) {
        const supportX = x + deltaX;
        if (supportX < 0 || supportX >= width) continue;
        output[supportY * width + supportX] = 255;
      }
    }
  }
  return output;
}

function copyCell(target, source, targetWidth, originX, originY, channels) {
  const [cellWidth, cellHeight] = TARGET_CELL_DIMENSIONS;
  for (let y = 0; y < cellHeight; y += 1) {
    const sourceStart = y * cellWidth * channels;
    const targetStart = ((originY + y) * targetWidth + originX) * channels;
    source.copy(
      target,
      targetStart,
      sourceStart,
      sourceStart + cellWidth * channels,
    );
  }
}

function connectedTreeComponents(alpha, width, height) {
  const visited = new Uint8Array(alpha.length);
  const components = [];
  for (let pixel = 0; pixel < alpha.length; pixel += 1) {
    if (visited[pixel] || alpha[pixel] !== 255) continue;
    const queue = [pixel];
    visited[pixel] = 1;
    const pixels = [];
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor];
      const x = current % width;
      const y = Math.floor(current / width);
      pixels.push(current);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      const neighbors = [
        x > 0 ? current - 1 : -1,
        x + 1 < width ? current + 1 : -1,
        y > 0 ? current - width : -1,
        y + 1 < height ? current + width : -1,
      ];
      for (const neighbor of neighbors) {
        if (neighbor < 0 || visited[neighbor] || alpha[neighbor] !== 255) continue;
        visited[neighbor] = 1;
        queue.push(neighbor);
      }
    }
    const componentWidth = maxX - minX + 1;
    const componentHeight = maxY - minY + 1;
    if (
      pixels.length < MINIMUM_COMPONENT_PIXELS
      || componentWidth < 6
      || componentHeight < 16
      || componentWidth / componentHeight > 1.35
    ) continue;
    const componentAlpha = Buffer.alloc(alpha.length);
    for (const selectedPixel of pixels) componentAlpha[selectedPixel] = 255;
    components.push(Object.freeze({
      alpha: componentAlpha,
      bounds: Object.freeze([minX, minY, maxX, maxY]),
      pixels: pixels.length,
    }));
  }
  return Object.freeze(components.sort((left, right) => (
    left.bounds[1] - right.bounds[1]
    || left.bounds[0] - right.bounds[0]
  )));
}

function createAtlasPlacement(entries) {
  const placements = new Map();
  let cursorX = ATLAS_PADDING;
  let cursorY = ATLAS_PADDING;
  let rowHeight = 0;
  const sorted = [...entries].sort((left, right) => (
    right.height - left.height || left.id.localeCompare(right.id)
  ));
  for (const entry of sorted) {
    if (entry.width + ATLAS_PADDING * 2 > ATLAS_WIDTH) {
      throw new RangeError(`${entry.id} is wider than the native foliage atlas.`);
    }
    if (cursorX + entry.width + ATLAS_PADDING > ATLAS_WIDTH) {
      cursorX = ATLAS_PADDING;
      cursorY += rowHeight + ATLAS_PADDING;
      rowHeight = 0;
    }
    placements.set(entry.id, Object.freeze([
      cursorX,
      cursorY,
      entry.width,
      entry.height,
    ]));
    cursorX += entry.width + ATLAS_PADDING;
    rowHeight = Math.max(rowHeight, entry.height);
  }
  const height = Math.ceil((cursorY + rowHeight + ATLAS_PADDING) / 4) * 4;
  if (height <= 0 || height > 4096) {
    throw new RangeError(`Native foliage atlas height ${height} is outside budget.`);
  }
  return Object.freeze({ height, placements });
}

function blitRgba(target, targetWidth, source, sourceWidth, sourceHeight, x, y) {
  for (let row = 0; row < sourceHeight; row += 1) {
    source.copy(
      target,
      ((y + row) * targetWidth + x) * 4,
      row * sourceWidth * 4,
      (row + 1) * sourceWidth * 4,
    );
  }
}

async function build() {
  const [sourceBytes, waterManifestBytes] = await Promise.all([
    readFile(MASTER_SOURCE_PATH),
    readFile(INLAND_WATER_MANIFEST_PATH),
  ]);
  const waterManifest = JSON.parse(waterManifestBytes);
  const sourceMetadata = await sharp(sourceBytes).metadata();
  if (
    sourceMetadata.width !== MASTER_SOURCE_DIMENSIONS[0]
    || sourceMetadata.height !== MASTER_SOURCE_DIMENSIONS[1]
    || sourceMetadata.format !== "png"
    || sourceMetadata.hasAlpha !== true
  ) {
    throw new RangeError(
      `${MASTER_SOURCE_ID} is not the ${MASTER_SOURCE_DIMENSIONS.join("x")} active RGBA master.`,
    );
  }
  await Promise.all([
    mkdir(OUTPUT_ROOT, { recursive: true }),
    mkdir(PROOF_ROOT, { recursive: true }),
  ]);

  const [targetWidth, targetHeight] = TARGET_MASTER_DIMENSIONS;
  const source = await sharp(sourceBytes)
    .resize(targetWidth, targetHeight, { fit: "fill", kernel: "lanczos3" })
    .ensureAlpha()
    .raw()
    .toBuffer();
  const combinedMask = Buffer.alloc(targetWidth * targetHeight);
  const combinedNeutralization = Buffer.from(source);
  const segmentationSources = [];
  const neutralizationSources = [];
  const expectedOutputNames = new Set();

  for (const cell of CELLS) {
    const maskPath = path.join(OUTPUT_ROOT, cell.maskSourceName);
    const neutralizationPath = path.join(
      OUTPUT_ROOT,
      cell.neutralizationSourceName,
    );
    const [maskBytes, neutralizationBytes] = await Promise.all([
      readFile(maskPath),
      readFile(neutralizationPath),
    ]);
    expectedOutputNames.add(cell.maskSourceName);
    expectedOutputNames.add(cell.neutralizationSourceName);
    const [mask, neutralization, maskMetadata, neutralizationMetadata] = await Promise.all([
      sharp(maskBytes)
        .resize(...TARGET_CELL_DIMENSIONS, { fit: "fill", kernel: "lanczos3" })
        .ensureAlpha()
        .raw()
        .toBuffer(),
      sharp(neutralizationBytes)
        .resize(...TARGET_CELL_DIMENSIONS, { fit: "fill", kernel: "lanczos3" })
        .ensureAlpha()
        .raw()
        .toBuffer(),
      sharp(maskBytes).metadata(),
      sharp(neutralizationBytes).metadata(),
    ]);
    const cellAlpha = Buffer.alloc(TARGET_CELL_DIMENSIONS[0] * TARGET_CELL_DIMENSIONS[1]);
    for (let pixel = 0; pixel < cellAlpha.length; pixel += 1) {
      cellAlpha[pixel] = mask[pixel * 4 + 3] >= 64 ? 255 : 0;
    }
    copyCell(
      combinedMask,
      cellAlpha,
      targetWidth,
      cell.targetOrigin[0],
      cell.targetOrigin[1],
      1,
    );
    copyCell(
      combinedNeutralization,
      neutralization,
      targetWidth,
      cell.targetOrigin[0],
      cell.targetOrigin[1],
      4,
    );
    segmentationSources.push(Object.freeze({
      dimensions: Object.freeze([maskMetadata.width, maskMetadata.height]),
      gridCell: cell.gridCell,
      id: `${cell.gridCell.toLowerCase()}-conifer-occupancy-imagegen`,
      inputRole: "existing-conifer-alpha-guidance",
      path: versionedPublicPath(maskPath, sha256(maskBytes)),
      provider: "built-in-imagegen-background-extraction",
      sha256: sha256(maskBytes),
      usage: "alpha only; visible RGB is copied from the active r8 authority plate",
    }));
    neutralizationSources.push(Object.freeze({
      dimensions: Object.freeze([
        neutralizationMetadata.width,
        neutralizationMetadata.height,
      ]),
      gridCell: cell.gridCell,
      id: `${cell.gridCell.toLowerCase()}-conifer-neutralization-imagegen`,
      inputRole: "tree-removed-terrain-rgb-guidance",
      path: versionedPublicPath(neutralizationPath, sha256(neutralizationBytes)),
      provider: "built-in-imagegen-precise-object-edit",
      sha256: sha256(neutralizationBytes),
      usage: "RGB is consumed only beneath accepted conifer masks; every unmasked pixel remains authority RGB",
    }));
  }

  const components = connectedTreeComponents(
    combinedMask,
    targetWidth,
    targetHeight,
  );
  if (components.length < 120) {
    throw new RangeError(`Only ${components.length} registered conifers survived validation.`);
  }
  const groups = [];
  let totalCanopyPixels = 0;
  let atRestChangedPixels = 0;
  for (let index = 0; index < components.length; index += 1) {
    const component = components[index];
    const support = dilateAlpha(
      component.alpha,
      targetWidth,
      targetHeight,
      NEUTRALIZATION_DILATION,
    );
    const trim = trimForAlpha(support, targetWidth, targetHeight);
    const canopyAlpha = cropRaw(component.alpha, targetWidth, trim, 1);
    const supportAlpha = cropRaw(support, targetWidth, trim, 1);
    const sourceCrop = cropRaw(source, targetWidth, trim, 4);
    const neutralizationCrop = cropRaw(
      combinedNeutralization,
      targetWidth,
      trim,
      4,
    );
    for (let pixel = 0; pixel < canopyAlpha.length; pixel += 1) {
      const belongsToOpaqueLandAuthority = sourceCrop[pixel * 4 + 3] === 255;
      if (belongsToOpaqueLandAuthority) continue;
      canopyAlpha[pixel] = 0;
      supportAlpha[pixel] = 0;
    }
    const canopy = spriteRgba(sourceCrop, canopyAlpha);
    const neutralization = Buffer.alloc(sourceCrop.length);
    for (let pixel = 0; pixel < canopyAlpha.length; pixel += 1) {
      const offset = pixel * 4;
      const rgb = canopyAlpha[pixel] === 255 ? neutralizationCrop : sourceCrop;
      neutralization[offset] = rgb[offset];
      neutralization[offset + 1] = rgb[offset + 1];
      neutralization[offset + 2] = rgb[offset + 2];
      neutralization[offset + 3] = supportAlpha[pixel];
    }
    const atRest = compositeRgba(compositeRgba(sourceCrop, neutralization), canopy);
    const atRestDifference = differenceMetrics(sourceCrop, atRest);
    if (atRestDifference.changedPixels !== 0) {
      throw new Error(`Conifer ${index} drifts from the authority plate at rest.`);
    }
    atRestChangedPixels += atRestDifference.changedPixels;
    totalCanopyPixels += component.pixels;
    const centerX = trim.left + trim.width * 0.5;
    const centerY = trim.top + trim.height * 0.5;
    const gridCell = `${centerX < targetWidth * 0.5 ? "B" : "C"}${
      centerY < targetHeight * 0.5 ? "1" : "2"
    }`;
    const id = `${gridCell.toLowerCase()}-native-conifer-${String(index + 1).padStart(3, "0")}`;
    groups.push(Object.freeze({
      artboardBounds: Object.freeze({
        origin: Object.freeze([trim.left / 2, trim.top / 2]),
        span: Object.freeze([trim.width / 2, trim.height / 2]),
      }),
      canopy,
      canopyAlpha,
      checkpoint: id,
      gridCell,
      id,
      motion: deterministicMotion(index, gridCell),
      neutralization,
      sourceTargetRect: Object.freeze([trim.left, trim.top, trim.width, trim.height]),
      spriteHeight: trim.height,
      spriteWidth: trim.width,
    }));
  }

  const supplemental = await loadSupplementalArtwork(expectedOutputNames);
  const supplementalGroups = SUPPLEMENTAL_PLACEMENTS.map((placement, index) => {
    const artwork = supplemental.artwork.get(placement.sourceId);
    if (!artwork) throw new TypeError(`Unknown supplemental source ${placement.sourceId}.`);
    const [frameWidth, frameHeight] = artwork.frameDimensions;
    const targetWidth = Math.max(1, Math.round(frameWidth * placement.scale));
    const targetHeight = Math.max(1, Math.round(frameHeight * placement.scale));
    const targetLeft = Math.round(placement.anchor[0] * 2 - targetWidth * 0.5);
    const targetTop = Math.round(placement.anchor[1] * 2 - targetHeight);
    const sourceTargetRect = Object.freeze([
      targetLeft,
      targetTop,
      targetWidth,
      targetHeight,
    ]);
    if (
      targetLeft < 0
      || targetTop < 0
      || targetLeft + targetWidth > TARGET_MASTER_DIMENSIONS[0]
      || targetTop + targetHeight > TARGET_MASTER_DIMENSIONS[1]
    ) throw new RangeError(`${placement.id} falls outside the terrain registration.`);
    const anchorPixelX = Math.round(placement.anchor[0] * 2);
    const anchorPixelY = Math.round(placement.anchor[1] * 2);
    const anchorAlpha = source[(anchorPixelY * TARGET_MASTER_DIMENSIONS[0] + anchorPixelX) * 4 + 3];
    if (anchorAlpha < 240 || pointInsideInlandWater(placement.anchor, waterManifest)) {
      throw new RangeError(`${placement.id} is not rooted on accepted dry terrain.`);
    }
    const centerX = targetLeft + targetWidth * 0.5;
    const centerY = targetTop + targetHeight * 0.5;
    const gridCell = `${centerX < TARGET_MASTER_DIMENSIONS[0] * 0.5 ? "B" : "C"}${
      centerY < TARGET_MASTER_DIMENSIONS[1] * 0.5 ? "1" : "2"
    }`;
    return Object.freeze({
      artboardBounds: Object.freeze({
        origin: Object.freeze([targetLeft / 2, targetTop / 2]),
        span: Object.freeze([targetWidth / 2, targetHeight / 2]),
      }),
      checkpoint: `${gridCell.toLowerCase()}-${placement.id}`,
      gridCell,
      id: placement.id,
      motion: supplementalMotion(artwork.species, index),
      sourceId: artwork.id,
      sourceTargetRect,
      species: artwork.species,
    });
  });

  const atlasEntries = [
    ...groups.flatMap((group) => [
      Object.freeze({
        height: group.spriteHeight,
        id: `${group.id}:neutralization`,
        rgba: group.neutralization,
        width: group.spriteWidth,
      }),
      Object.freeze({
        height: group.spriteHeight,
        id: `${group.id}:canopy`,
        rgba: group.canopy,
        width: group.spriteWidth,
      }),
    ]),
    ...[...supplemental.artwork.values()].map((artwork) => Object.freeze({
      height: artwork.frameDimensions[1],
      id: `supplemental:${artwork.id}`,
      rgba: artwork.rgba,
      width: artwork.frameDimensions[0],
    })),
  ];
  const atlasPlacement = createAtlasPlacement(atlasEntries);
  const atlas = Buffer.alloc(ATLAS_WIDTH * atlasPlacement.height * 4);
  for (const entry of atlasEntries) {
    const [x, y] = atlasPlacement.placements.get(entry.id);
    blitRgba(atlas, ATLAS_WIDTH, entry.rgba, entry.width, entry.height, x, y);
  }
  const atlasName = "ninjaone-pooled-foliage-atlas-r6.png";
  const atlasPath = path.join(OUTPUT_ROOT, atlasName);
  const atlasBytes = await sharp(atlas, {
    raw: { channels: 4, height: atlasPlacement.height, width: ATLAS_WIDTH },
  }).png({ compressionLevel: 9, palette: false }).toBuffer();
  await writeFileIfChanged(atlasPath, atlasBytes);
  expectedOutputNames.add(atlasName);
  const atlasDigest = sha256(atlasBytes);
  const atlasDecodedBytes = ATLAS_WIDTH * atlasPlacement.height * 4;
  const atlasResource = Object.freeze({
    decodedBytes: atlasDecodedBytes,
    dimensions: Object.freeze([ATLAS_WIDTH, atlasPlacement.height]),
    frameCount: atlasEntries.length,
    id: "pooled-foliage-atlas",
    kind: "pooled-foliage-atlas",
    path: versionedPublicPath(atlasPath, atlasDigest),
    sha256: atlasDigest,
    sourceMasterId: MASTER_SOURCE_ID,
  });
  const nativeInstances = groups.map((group) => Object.freeze({
    animation: "canopy-bend",
    artboardBounds: group.artboardBounds,
    atlasResourceId: atlasResource.id,
    bendDegrees: group.motion.bendDegrees,
    canopyAtlasRect: atlasPlacement.placements.get(`${group.id}:canopy`),
    checkpoint: group.checkpoint,
    composition: "registered-replacement",
    durationSeconds: group.motion.durationSeconds,
    gridCell: group.gridCell,
    id: `${group.id}-instance`,
    lagDegrees: group.motion.lagDegrees,
    neutralizationAtlasRect: atlasPlacement.placements.get(`${group.id}:neutralization`),
    paintedNodeCount: NODES_PER_GROUP,
    phaseSeconds: group.motion.phaseSeconds,
    pivotYPercent: 96,
    sourceMasterId: MASTER_SOURCE_ID,
    species: "native-conifer",
    sourceTargetRect: group.sourceTargetRect,
  }));
  const supplementalInstances = supplementalGroups.map((group) => Object.freeze({
    animation: "canopy-bend",
    artboardBounds: group.artboardBounds,
    atlasResourceId: atlasResource.id,
    bendDegrees: group.motion.bendDegrees,
    canopyAtlasRect: atlasPlacement.placements.get(`supplemental:${group.sourceId}`),
    checkpoint: group.checkpoint,
    composition: "additive",
    durationSeconds: group.motion.durationSeconds,
    gridCell: group.gridCell,
    id: `${group.id}-instance`,
    lagDegrees: group.motion.lagDegrees,
    neutralizationAtlasRect: null,
    paintedNodeCount: 1,
    phaseSeconds: group.motion.phaseSeconds,
    pivotYPercent: group.motion.pivotYPercent,
    sourceMasterId: MASTER_SOURCE_ID,
    species: group.species,
    sourceTargetRect: group.sourceTargetRect,
  }));
  const instances = Object.freeze([...nativeInstances, ...supplementalInstances]);

  for (const existing of await readdir(OUTPUT_ROOT)) {
    if (existing.endsWith(".png") && !expectedOutputNames.has(existing)) {
      await rm(path.join(OUTPUT_ROOT, existing));
    }
  }
  const terrainDecodedBytes = MAXIMUM_TERRAIN_TILES
    * TERRAIN_TILE_DECODE_DIMENSIONS[0]
    * TERRAIN_TILE_DECODE_DIMENSIONS[1]
    * 4;
  const combinedDecodedBytes = terrainDecodedBytes + atlasDecodedBytes;
  const mountedGroups = Math.min(instances.length, MAXIMUM_SELECTED_GROUPS);
  const mountedFoliageNodes = mountedGroups * NODES_PER_GROUP;
  if (
    mountedFoliageNodes > MAXIMUM_SUPPLEMENTAL_NODES
    || combinedDecodedBytes > MAXIMUM_DECODED_BYTES
  ) {
    throw new RangeError(`Foliage violates budget: ${JSON.stringify({
      atlasDecodedBytes,
      combinedDecodedBytes,
      mountedFoliageNodes,
    })}`);
  }
  const manifest = {
    schemaVersion: 5,
    id: "career-world/capitals/ninjaone/foliage@r6",
    status: "active-r8-native-and-additive-foliage",
    sourceMaster: {
      authority: "active-r8-geology-master",
      dimensions: MASTER_SOURCE_DIMENSIONS,
      id: MASTER_SOURCE_ID,
      path: MASTER_SOURCE_PUBLIC_PATH,
      sha256: sha256(sourceBytes),
    },
    segmentationSources,
    neutralizationSources,
    supplementalSources: supplemental.sources,
    eligibility: {
      maxDetailEnterSpan: MAX_DETAIL_ENTER_SPAN,
      maxDetailRetainSpan: MAX_DETAIL_RETAIN_SPAN,
      viewportOverscanRatio: 0.25,
    },
    registration: {
      artboard: ARTBOARD,
      boundingWorldView: {
        origin: [0.125, 0],
        span: [0.25, 1 / 3],
      },
      coveredGridCells: [...new Set(instances.map(({ gridCell }) => gridCell))].sort(),
      grid: GRID,
      masterDimensions: MASTER_SOURCE_DIMENSIONS,
      sourcePixelsPerArtboardUnit: 4,
      runtimeAtlasPixelsPerArtboardUnit: 2,
    },
    ownership: "L2_2 owns registered conifer replacements plus sparse additive fantasy foliage in one pooled atlas and one root-pivoted viewport renderer; existing conifers reproduce active-r8 exactly at rest, while additive placements never erase or replace accepted terrain art",
    quality: {
      atRestChangedPixels,
      minimumRegisteredConifers: 120,
      registeredConifers: nativeInstances.length,
      supplementalInstances: supplementalInstances.length,
      totalCanopyPixels,
      uniqueSupplementalFrames: supplemental.artwork.size,
      visibleRgbAuthority: MASTER_SOURCE_ID,
    },
    budgets: {
      atlasDecodedBytes,
      atlasFrameCount: atlasEntries.length,
      combinedDecodedBytes,
      conservativeDecodedBytes: combinedDecodedBytes,
      foliageDecodedBytes: atlasDecodedBytes,
      futureSupplementalNodeHeadroom: MAXIMUM_SUPPLEMENTAL_NODES - mountedFoliageNodes,
      maximumDecodedBytes: MAXIMUM_DECODED_BYTES,
      maximumSelectedGroups: MAXIMUM_SELECTED_GROUPS,
      maximumSupplementalNodes: MAXIMUM_SUPPLEMENTAL_NODES,
      maximumTerrainTiles: MAXIMUM_TERRAIN_TILES,
      mountedFoliageNodes,
      mountedGroups,
      nodesPerGroup: NODES_PER_GROUP,
      poolGroups: instances.length,
      terrainDecodedBytes,
      uniqueTextureResources: 1,
    },
    resources: [atlasResource],
    instances,
  };
  await mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
  await writeJsonAtomically(MANIFEST_PATH, manifest);
  process.stdout.write(
    `Built ${nativeInstances.length} registered conifers and ${supplementalInstances.length} additive foliage placements in one ${ATLAS_WIDTH}x${atlasPlacement.height} atlas (${mountedFoliageNodes} maximum mounted nodes; ${combinedDecodedBytes} conservative decoded bytes).\n`,
  );
}

await build();
