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
const PROOF_ROOT = path.join(
  ROOT,
  ".codex-tmp/gauntlet/ninjaone-mvp-20260807-01/artifacts/foliage-r4/source-composites",
);
const MASTER_SOURCE_DIMENSIONS = Object.freeze([5760, 4320]);
const TERRAIN_TILE_DECODE_DIMENSIONS = Object.freeze([1448, 1086]);
const ARTBOARD = Object.freeze([1440, 1080]);
const GRID = Object.freeze([4, 4]);
const MAXIMUM_DECODED_BYTES = 64 * 1024 * 1024;
const MAXIMUM_TERRAIN_TILES = 4;
const MAXIMUM_SUPPLEMENTAL_NODES = 64;
const MAXIMUM_SELECTED_GROUPS = 32;
const NODES_PER_GROUP = 2;
const MAX_DETAIL_ENTER_SPAN = 0.12;
const MAX_DETAIL_RETAIN_SPAN = 0.14;
const TARGET_MASTER_DIMENSIONS = MASTER_SOURCE_DIMENSIONS;
const TARGET_CELL_DIMENSIONS = Object.freeze([2880, 2160]);
const TRIM_PADDING = 1;
const NEUTRALIZATION_DILATION = 4;
const NEUTRALIZATION_REVEAL_EDGE = 4;
const ATLAS_PAGE_GRID = Object.freeze([3, 3]);
const ATLAS_WIDTH_CANDIDATES = Object.freeze([256, 384, 512, 768, 1024]);
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

function trailingRevealAlpha(alpha, width, height, maximumShift) {
  const output = Buffer.alloc(alpha.length);
  for (let pixel = 0; pixel < alpha.length; pixel += 1) {
    if (alpha[pixel] !== 255) continue;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    for (let shift = 1; shift <= maximumShift; shift += 1) {
      if (x - shift < 0 || alpha[y * width + x - shift] !== 255) {
        output[pixel] = 255;
        break;
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

function createAtlasPlacement(entries, atlasWidth) {
  const placements = new Map();
  let cursorX = ATLAS_PADDING;
  let cursorY = ATLAS_PADDING;
  let rowHeight = 0;
  const sorted = [...entries].sort((left, right) => (
    right.height - left.height || left.id.localeCompare(right.id)
  ));
  for (const entry of sorted) {
    if (entry.width + ATLAS_PADDING * 2 > atlasWidth) return null;
    if (cursorX + entry.width + ATLAS_PADDING > atlasWidth) {
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
  if (height <= 0 || height > 4096) return null;
  return Object.freeze({ height, placements, width: atlasWidth });
}

function selectAtlasPlacement(entries) {
  const candidates = ATLAS_WIDTH_CANDIDATES
    .map((width) => createAtlasPlacement(entries, width))
    .filter(Boolean)
    .sort((left, right) => (
      left.width * left.height - right.width * right.height
      || left.height - right.height
      || left.width - right.width
    ));
  if (candidates.length === 0) {
    throw new RangeError("Native foliage page cannot be packed within texture limits.");
  }
  return candidates[0];
}

function atlasPageIdForGroup(group) {
  const center = group.artboardBounds.origin.map(
    (value, axis) => value + group.artboardBounds.span[axis] * 0.5,
  );
  const column = Math.min(
    ATLAS_PAGE_GRID[0] - 1,
    Math.max(0, Math.floor(center[0] / ARTBOARD[0] * ATLAS_PAGE_GRID[0])),
  );
  const row = Math.min(
    ATLAS_PAGE_GRID[1] - 1,
    Math.max(0, Math.floor(center[1] / ARTBOARD[1] * ATLAS_PAGE_GRID[1])),
  );
  return `p${row + 1}-${column + 1}`;
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
  const sourceBytes = await readFile(MASTER_SOURCE_PATH);
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
        .ensureAlpha()
        .raw()
        .toBuffer(),
      sharp(neutralizationBytes)
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
    const revealSupport = dilateAlpha(
      trailingRevealAlpha(
        component.alpha,
        targetWidth,
        targetHeight,
        NEUTRALIZATION_REVEAL_EDGE,
      ),
      targetWidth,
      targetHeight,
      1,
    );
    const trim = trimForAlpha(support, targetWidth, targetHeight);
    const canopyAlpha = cropRaw(component.alpha, targetWidth, trim, 1);
    const supportAlpha = cropRaw(revealSupport, targetWidth, trim, 1);
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
        origin: Object.freeze([trim.left / 4, trim.top / 4]),
        span: Object.freeze([trim.width / 4, trim.height / 4]),
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

  const atlasBundles = new Map();
  const pageIds = [...new Set(groups.map(atlasPageIdForGroup))].sort();
  for (const pageId of pageIds) {
    const nativeGroups = groups.filter((group) => (
      atlasPageIdForGroup(group) === pageId
    ));
    const atlasEntries = nativeGroups.flatMap((group) => [
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
    ]);
    const placement = selectAtlasPlacement(atlasEntries);
    const atlas = Buffer.alloc(placement.width * placement.height * 4);
    for (const entry of atlasEntries) {
      const [x, y] = placement.placements.get(entry.id);
      blitRgba(atlas, placement.width, entry.rgba, entry.width, entry.height, x, y);
    }
    const atlasName = `ninjaone-pooled-foliage-atlas-${pageId}-r8.png`;
    const atlasPath = path.join(OUTPUT_ROOT, atlasName);
    const atlasBytes = await sharp(atlas, {
      raw: { channels: 4, height: placement.height, width: placement.width },
    }).png({ compressionLevel: 9, palette: false }).toBuffer();
    await writeFileIfChanged(atlasPath, atlasBytes);
    expectedOutputNames.add(atlasName);
    const atlasDigest = sha256(atlasBytes);
    atlasBundles.set(pageId, Object.freeze({
      entries: Object.freeze(atlasEntries),
      placement,
      resource: Object.freeze({
        decodedBytes: placement.width * placement.height * 4,
        dimensions: Object.freeze([placement.width, placement.height]),
        frameCount: atlasEntries.length,
        id: `pooled-foliage-atlas-${pageId}`,
        kind: "pooled-foliage-atlas",
        path: versionedPublicPath(atlasPath, atlasDigest),
        sha256: atlasDigest,
        sourceMasterId: MASTER_SOURCE_ID,
      }),
    }));
  }
  const atlasResources = Object.freeze(
    [...atlasBundles.values()].map(({ resource }) => resource),
  );
  const atlasDecodedBytes = atlasResources.reduce(
    (total, resource) => total + resource.decodedBytes,
    0,
  );
  const atlasFrameCount = atlasResources.reduce(
    (total, resource) => total + resource.frameCount,
    0,
  );
  const nativeInstances = groups.map((group) => {
    const bundle = atlasBundles.get(atlasPageIdForGroup(group));
    return Object.freeze({
      animation: "canopy-bend",
      artboardBounds: group.artboardBounds,
      atlasResourceId: bundle.resource.id,
      bendDegrees: group.motion.bendDegrees,
      canopyAtlasRect: bundle.placement.placements.get(`${group.id}:canopy`),
      checkpoint: group.checkpoint,
      composition: "registered-replacement",
      durationSeconds: group.motion.durationSeconds,
      gridCell: group.gridCell,
      id: `${group.id}-instance`,
      lagDegrees: group.motion.lagDegrees,
      neutralizationAtlasRect: bundle.placement.placements.get(`${group.id}:neutralization`),
      paintedNodeCount: NODES_PER_GROUP,
      phaseSeconds: group.motion.phaseSeconds,
      pivotYPercent: 96,
      sourceMasterId: MASTER_SOURCE_ID,
      species: "native-conifer",
      sourceTargetRect: group.sourceTargetRect,
    });
  });
  const instances = Object.freeze(nativeInstances);

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
    status: "active-r8-native-foliage-paged",
    sourceMaster: {
      authority: "active-r8-geology-master",
      dimensions: MASTER_SOURCE_DIMENSIONS,
      id: MASTER_SOURCE_ID,
      path: MASTER_SOURCE_PUBLIC_PATH,
      sha256: sha256(sourceBytes),
    },
    segmentationSources,
    neutralizationSources,
    supplementalSources: [],
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
      runtimeAtlasPageGrid: ATLAS_PAGE_GRID,
      sourcePixelsPerArtboardUnit: 4,
      runtimeAtlasPixelsPerArtboardUnit: 4,
    },
    ownership: "L2_2 owns registered native-conifer replacements in nine spatially paged atlases and one root-pivoted viewport renderer; existing conifers reproduce active-r8 exactly at rest",
    quality: {
      atRestChangedPixels,
      minimumRegisteredConifers: 120,
      registeredConifers: nativeInstances.length,
      supplementalInstances: 0,
      totalCanopyPixels,
      uniqueSupplementalFrames: 0,
      visibleRgbAuthority: MASTER_SOURCE_ID,
    },
    budgets: {
      atlasDecodedBytes,
      atlasFrameCount,
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
      uniqueTextureResources: atlasResources.length,
    },
    resources: atlasResources,
    instances,
  };
  await mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
  await writeJsonAtomically(MANIFEST_PATH, manifest);
  process.stdout.write(
    `Built ${nativeInstances.length} registered conifers in ${atlasResources.length} spatial pages (${mountedFoliageNodes} maximum mounted nodes; ${combinedDecodedBytes} conservative decoded bytes).\n`,
  );
}

await build();
