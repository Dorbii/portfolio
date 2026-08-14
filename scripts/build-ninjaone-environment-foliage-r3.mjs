import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE_ROOT = path.join(
  ROOT,
  "art-source/career-world/ninjaone-environment/production-r2/detail-tiles-r2/generated",
);
const OUTPUT_ROOT = path.join(
  ROOT,
  "public/career-world/capitals/ninjaone/environment/shared/foliage-native-r3",
);
const MANIFEST_PATH = path.join(
  ROOT,
  "public/career-world/capitals/ninjaone/environment/manifests/foliage-native-r3.json",
);
const PROOF_ROOT = path.join(
  ROOT,
  ".codex-tmp/gauntlet/ninjaone-mvp-20260807-01/artifacts/foliage-r3/source-composites",
);
const NATIVE_TILE_DIMENSIONS = Object.freeze([1448, 1086]);
const ARTBOARD = Object.freeze([1440, 1080]);
const GRID = Object.freeze([4, 4]);
const TILE_ARTBOARD = Object.freeze([360, 270]);
const MAXIMUM_DECODED_BYTES = 32 * 1024 * 1024;
const MAXIMUM_TERRAIN_TILES = 4;
const MAXIMUM_SUPPLEMENTAL_NODES = 6;
const MAXIMUM_SELECTED_GROUPS = 2;
const NODES_PER_GROUP = 2;
const MAX_DETAIL_ENTER_SPAN = 0.075;
const MAX_DETAIL_RETAIN_SPAN = 0.09;
const TRIM_PADDING = 12;

const NATIVE_TILE_IDS = Object.freeze([
  "r0-c2",
  "r0-c3",
  "r1-c2",
  "r1-c3",
  "r2-c0",
  "r2-c1",
  "r2-c2",
  "r2-c3",
  "r3-c0",
  "r3-c1",
  "r3-c2",
  "r3-c3",
]);

const GROUPS = Object.freeze([
  Object.freeze({
    bendDegrees: 0.36,
    checkpoint: "c2-trail-conifer-native",
    crop: Object.freeze([1090, 750, 270, 300]),
    durationSeconds: 6.2,
    id: "c2-trail-conifer-native",
    lagDegrees: 0.075,
    canopyPolygon: Object.freeze([
      [110, 18], [92, 41], [75, 61], [60, 84], [49, 108], [39, 137],
      [38, 164], [52, 185], [75, 204], [107, 202], [137, 199], [158, 180],
      [168, 153], [166, 126], [155, 101], [145, 78], [132, 57], [120, 36],
    ].map(Object.freeze)),
    minimumLeafPixels: 7_000,
    motionProtectionMargin: 2,
    neutralizationDilation: 0,
    neutralizationSourceName: "c2-trail-conifer-native-neutralization-source-imagegen-r3.png",
    phaseSeconds: -0.8,
    segmentation: "native-conifer-needle-color-local-contrast",
    protectedShapes: Object.freeze([
      Object.freeze({ height: 70, id: "trunk", kind: "rect", width: 14, x: 103, y: 158 }),
      Object.freeze({ height: 132, id: "rock", kind: "ellipse", width: 133, x: 137, y: 153 }),
      Object.freeze({ height: 300, id: "trail", kind: "rect", width: 36, x: 0, y: 0 }),
    ]),
    sourceTileId: "r2-c2",
  }),
  Object.freeze({
    bendDegrees: 0.29,
    checkpoint: "c2-stream-canopy-native",
    crop: Object.freeze([1140, 80, 280, 300]),
    durationSeconds: 7.05,
    id: "c2-stream-canopy-native",
    lagDegrees: 0.052,
    canopyPolygon: Object.freeze([
      [104, 47], [78, 55], [55, 67], [36, 82], [22, 104], [15, 129],
      [27, 148], [50, 151], [42, 169], [66, 179], [94, 172], [120, 178],
      [145, 170], [169, 160], [190, 145], [195, 123], [187, 101], [170, 82],
      [145, 67], [124, 54],
    ].map(Object.freeze)),
    minimumLeafPixels: 9_000,
    motionProtectionMargin: 2,
    neutralizationDilation: 0,
    neutralizationSourceName: "c2-stream-canopy-native-neutralization-source-imagegen-r3.png",
    phaseSeconds: -2.35,
    segmentation: "native-yellow-leaf-chroma-hard-alpha",
    protectedShapes: Object.freeze([
      Object.freeze({ height: 95, id: "trunk", kind: "rect", width: 14, x: 98, y: 145 }),
      Object.freeze({ height: 92, id: "stream", kind: "rect", width: 280, x: 0, y: 208 }),
      Object.freeze({ height: 190, id: "neighbor-tree", kind: "rect", width: 78, x: 202, y: 54 }),
    ]),
    sourceTileId: "r3-c2",
  }),
]);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}

function sourcePath(id) {
  return path.join(SOURCE_ROOT, `${id}-generated-r2.png`);
}

function publicSourcePath(id) {
  return `/art-source/career-world/ninjaone-environment/production-r2/detail-tiles-r2/generated/${id}-generated-r2.png`;
}

function versionedPublicPath(filePath, digest) {
  return `/${path.relative(path.join(ROOT, "public"), filePath).replaceAll("\\", "/")}?v=${digest.slice(0, 12).toLowerCase()}`;
}

function protectedShapeContains(shape, x, y, margin = 0) {
  if (shape.kind === "ellipse") {
    const normalizedX = (x - (shape.x + shape.width / 2))
      / (shape.width / 2 + margin);
    const normalizedY = (y - (shape.y + shape.height / 2))
      / (shape.height / 2 + margin);
    return normalizedX ** 2 + normalizedY ** 2 <= 1;
  }
  return x >= shape.x - margin
    && x < shape.x + shape.width + margin
    && y >= shape.y - margin
    && y < shape.y + shape.height + margin;
}

function polygonContains(points, x, y) {
  let inside = false;
  for (
    let current = 0, previous = points.length - 1;
    current < points.length;
    previous = current, current += 1
  ) {
    const [currentX, currentY] = points[current];
    const [previousX, previousY] = points[previous];
    if (
      (currentY > y) !== (previousY > y)
      && x < (previousX - currentX) * (y - currentY)
        / (previousY - currentY) + currentX
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function localMeanLuminance(source, width, height, x, y, radius = 3) {
  let samples = 0;
  let sum = 0;
  for (let deltaY = -radius; deltaY <= radius; deltaY += 1) {
    const sourceY = y + deltaY;
    if (sourceY < 0 || sourceY >= height) continue;
    for (let deltaX = -radius; deltaX <= radius; deltaX += 1) {
      const sourceX = x + deltaX;
      if (
        sourceX < 0
        || sourceX >= width
        || (deltaX === 0 && deltaY === 0)
      ) continue;
      const offset = (sourceY * width + sourceX) * 4;
      sum += source[offset] * 0.2126
        + source[offset + 1] * 0.7152
        + source[offset + 2] * 0.0722;
      samples += 1;
    }
  }
  return samples === 0 ? 0 : sum / samples;
}

function semanticCanopyAlpha(source, width, height, definition) {
  const output = Buffer.alloc(width * height);
  for (let pixel = 0; pixel < output.length; pixel += 1) {
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    const protectedPixel = definition.protectedShapes.some((shape) => (
      protectedShapeContains(shape, x, y, definition.motionProtectionMargin)
    ));
    if (
      protectedPixel
      || !polygonContains(definition.canopyPolygon, x, y)
    ) continue;
    const offset = pixel * 4;
    const red = source[offset];
    const green = source[offset + 1];
    const blue = source[offset + 2];
    const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
    if (definition.segmentation === "native-conifer-needle-color-local-contrast") {
      const localContrast = localMeanLuminance(source, width, height, x, y)
        - luminance;
      if (
        luminance <= 105
        && green >= blue - 6
        && green >= red - 22
        && localContrast >= -4
      ) output[pixel] = 255;
      continue;
    }
    const yellowExcess = (red + green) * 0.5 - blue;
    if (
      yellowExcess >= 17
      && green - blue >= 9
      && red - blue >= 3
      && luminance >= 28
    ) output[pixel] = 255;
  }
  return output;
}

function neutralizationSupportAlpha(width, height, definition) {
  const output = Buffer.alloc(width * height);
  for (let pixel = 0; pixel < output.length; pixel += 1) {
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    const protectedPixel = definition.protectedShapes.some((shape) => (
      protectedShapeContains(shape, x, y, definition.motionProtectionMargin)
    ));
    if (
      !protectedPixel
      && polygonContains(definition.canopyPolygon, x, y)
    ) output[pixel] = 255;
  }
  return output;
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

function largestConnectedComponent(alpha, width, height, threshold = 192) {
  const visited = new Uint8Array(alpha.length);
  let selected = 0;
  let largest = 0;
  for (let pixel = 0; pixel < alpha.length; pixel += 1) {
    if (alpha[pixel] < threshold) continue;
    selected += 1;
    if (visited[pixel]) continue;
    const queue = [pixel];
    visited[pixel] = 1;
    let size = 0;
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor];
      size += 1;
      const x = current % width;
      const y = Math.floor(current / width);
      const neighbors = [
        x > 0 ? current - 1 : -1,
        x + 1 < width ? current + 1 : -1,
        y > 0 ? current - width : -1,
        y + 1 < height ? current + width : -1,
      ];
      for (const neighbor of neighbors) {
        if (neighbor < 0 || visited[neighbor] || alpha[neighbor] < threshold) continue;
        visited[neighbor] = 1;
        queue.push(neighbor);
      }
    }
    largest = Math.max(largest, size);
  }
  return Object.freeze({
    largest,
    ratio: selected === 0 ? 0 : largest / selected,
    selected,
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

function transformRgba(
  source,
  width,
  height,
  angleDegrees,
  skewDegrees,
  pivotX,
  pivotY,
) {
  const output = Buffer.alloc(source.length);
  const angle = angleDegrees * Math.PI / 180;
  const skew = Math.tan(skewDegrees * Math.PI / 180);
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const matrixA = cosine;
  const matrixB = cosine * skew - sine;
  const matrixC = sine;
  const matrixD = sine * skew + cosine;
  const determinant = matrixA * matrixD - matrixB * matrixC;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const translatedX = x - pivotX;
      const translatedY = y - pivotY;
      const sourceX = (
        matrixD * translatedX - matrixB * translatedY
      ) / determinant + pivotX;
      const sourceY = (
        -matrixC * translatedX + matrixA * translatedY
      ) / determinant + pivotY;
      const sourceLeft = Math.floor(sourceX);
      const sourceTop = Math.floor(sourceY);
      const fractionX = sourceX - sourceLeft;
      const fractionY = sourceY - sourceTop;
      const outputOffset = (y * width + x) * 4;
      for (let channel = 0; channel < 4; channel += 1) {
        let value = 0;
        for (let deltaY = 0; deltaY <= 1; deltaY += 1) {
          for (let deltaX = 0; deltaX <= 1; deltaX += 1) {
            const sampleX = sourceLeft + deltaX;
            const sampleY = sourceTop + deltaY;
            if (
              sampleX < 0
              || sampleX >= width
              || sampleY < 0
              || sampleY >= height
            ) continue;
            const weight = (deltaX ? fractionX : 1 - fractionX)
              * (deltaY ? fractionY : 1 - fractionY);
            value += source[(sampleY * width + sampleX) * 4 + channel]
              * weight;
          }
        }
        output[outputOffset + channel] = Math.round(value);
      }
    }
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

function maskRegistrationOverlay(source, canopy, neutralization) {
  const overlay = Buffer.alloc(source.length);
  for (let pixel = 0; pixel < canopy.length; pixel += 1) {
    const offset = pixel * 4;
    const canopyAlpha = canopy[pixel];
    const ringAlpha = Math.max(0, neutralization[pixel] - canopyAlpha);
    if (ringAlpha > 0) {
      overlay[offset] = 0;
      overlay[offset + 1] = 220;
      overlay[offset + 2] = 255;
      overlay[offset + 3] = Math.min(180, ringAlpha);
    }
    if (canopyAlpha > 0) {
      overlay[offset] = 255;
      overlay[offset + 1] = 0;
      overlay[offset + 2] = 190;
      overlay[offset + 3] = Math.min(180, canopyAlpha);
    }
  }
  return compositeRgba(source, overlay);
}

function registeredNeutralizationUnderlay(
  source,
  edited,
  canopyAlpha,
  supportAlpha,
) {
  const output = Buffer.alloc(source.length);
  let nativeGapPixels = 0;
  for (let pixel = 0; pixel < canopyAlpha.length; pixel += 1) {
    const offset = pixel * 4;
    const neutralizedLeafPixel = canopyAlpha[pixel] === 255;
    const rgbSource = neutralizedLeafPixel ? edited : source;
    output[offset] = rgbSource[offset];
    output[offset + 1] = rgbSource[offset + 1];
    output[offset + 2] = rgbSource[offset + 2];
    output[offset + 3] = supportAlpha[pixel];
    if (supportAlpha[pixel] === 255 && !neutralizedLeafPixel) {
      nativeGapPixels += 1;
    }
  }
  return Object.freeze({ nativeGapPixels, output });
}

function neutralizedDifference(source, inpainted, canopyAlpha, threshold = 192) {
  let changed = 0;
  let selected = 0;
  for (let pixel = 0; pixel < canopyAlpha.length; pixel += 1) {
    if (canopyAlpha[pixel] < threshold) continue;
    selected += 1;
    const offset = pixel * 4;
    const difference = Math.max(
      Math.abs(source[offset] - inpainted[offset]),
      Math.abs(source[offset + 1] - inpainted[offset + 1]),
      Math.abs(source[offset + 2] - inpainted[offset + 2]),
    );
    if (difference >= 4) changed += 1;
  }
  return Object.freeze({
    changed,
    ratio: selected === 0 ? 0 : changed / selected,
    selected,
  });
}

function registeredArtboardBounds(tileId, sourceCrop) {
  const row = Number(tileId.slice(1, 2));
  const column = Number(tileId.slice(4));
  return Object.freeze({
    origin: Object.freeze([
      column * TILE_ARTBOARD[0]
        + sourceCrop[0] / NATIVE_TILE_DIMENSIONS[0] * TILE_ARTBOARD[0],
      row * TILE_ARTBOARD[1]
        + sourceCrop[1] / NATIVE_TILE_DIMENSIONS[1] * TILE_ARTBOARD[1],
    ]),
    span: Object.freeze([
      sourceCrop[2] / NATIVE_TILE_DIMENSIONS[0] * TILE_ARTBOARD[0],
      sourceCrop[3] / NATIVE_TILE_DIMENSIONS[1] * TILE_ARTBOARD[1],
    ]),
  });
}

async function build() {
  const sourceTiles = new Map();
  const sourceCollection = [];
  for (const id of NATIVE_TILE_IDS) {
    const filePath = sourcePath(id);
    const bytes = await readFile(filePath);
    const metadata = await sharp(bytes).metadata();
    if (
      metadata.width !== NATIVE_TILE_DIMENSIONS[0]
      || metadata.height !== NATIVE_TILE_DIMENSIONS[1]
      || metadata.format !== "png"
    ) {
      throw new RangeError(`${id} is not a ${NATIVE_TILE_DIMENSIONS.join("x")} native PNG.`);
    }
    sourceTiles.set(id, bytes);
    sourceCollection.push(Object.freeze({
      dimensions: NATIVE_TILE_DIMENSIONS,
      id,
      path: publicSourcePath(id),
      sha256: sha256(bytes),
    }));
  }

  await Promise.all([
    mkdir(OUTPUT_ROOT, { recursive: true }),
    mkdir(PROOF_ROOT, { recursive: true }),
  ]);
  const resources = [];
  const instances = [];
  const neutralizationSources = [];
  const separationEvidence = [];
  const expectedOutputNames = new Set();
  let foliageDecodedBytes = 0;

  for (const definition of GROUPS) {
    const sourceBytes = sourceTiles.get(definition.sourceTileId);
    const [left, top, width, height] = definition.crop;
    const neutralizationSourcePath = path.join(
      OUTPUT_ROOT,
      definition.neutralizationSourceName,
    );
    const neutralizationSourceBytes = await readFile(neutralizationSourcePath);
    expectedOutputNames.add(definition.neutralizationSourceName);
    const [source, neutralizationEdit] = await Promise.all([
      sharp(sourceBytes)
        .extract({ left, top, width, height })
        .ensureAlpha()
        .raw()
        .toBuffer(),
      sharp(neutralizationSourceBytes)
        .resize(width, height, { fit: "fill", kernel: "lanczos3" })
        .ensureAlpha()
        .raw()
        .toBuffer(),
    ]);
    const canopyMask = semanticCanopyAlpha(
      source,
      width,
      height,
      definition,
    );
    const neutralAlpha = neutralizationSupportAlpha(
      width,
      height,
      definition,
    );
    for (let pixel = 0; pixel < canopyMask.length; pixel += 1) {
      if (
        (canopyMask[pixel] !== 0 && canopyMask[pixel] !== 255)
        || (neutralAlpha[pixel] !== 0 && neutralAlpha[pixel] !== 255)
      ) {
        throw new Error(`${definition.id} alpha masks must be binary.`);
      }
      if (canopyMask[pixel] === 255 && neutralAlpha[pixel] !== 255) {
        throw new Error(`${definition.id} neutralization does not cover its canopy core.`);
      }
    }
    const canopyConnection = largestConnectedComponent(canopyMask, width, height);
    const canopyMetrics = alphaMetrics(canopyMask, width, height);
    const [canopyLeft, canopyTop, canopyRight, canopyBottom] = canopyMetrics.alphaBounds;
    if (
      canopyMetrics.highAlphaPixels < definition.minimumLeafPixels
      || canopyRight - canopyLeft < 90
      || canopyBottom - canopyTop < 125
    ) {
      throw new Error(`${definition.id} is not a full-crown native leaf mask (${canopyMetrics.highAlphaPixels} / ${canopyMetrics.alphaBounds.join(",")}).`);
    }
    const underlay = registeredNeutralizationUnderlay(
      source,
      neutralizationEdit,
      canopyMask,
      neutralAlpha,
    );
    const neutralized = neutralizedDifference(
      source,
      underlay.output,
      canopyMask,
    );
    if (neutralized.ratio < 0.82) {
      throw new Error(`${definition.id} leaves too much of the baked canopy duplicate unchanged.`);
    }
    const canopyFullRgba = spriteRgba(source, canopyMask);
    const neutralizedComposite = compositeRgba(source, underlay.output);
    const atRestComposite = compositeRgba(
      neutralizedComposite,
      canopyFullRgba,
    );
    const trim = trimForAlpha(neutralAlpha, width, height);
    const pivotX = trim.left + trim.width * 0.5;
    const pivotY = trim.top + trim.height * 0.96;
    const forcedStartComposite = compositeRgba(
      neutralizedComposite,
      transformRgba(
        canopyFullRgba,
        width,
        height,
        -definition.bendDegrees * 0.52,
        -definition.lagDegrees * 0.55,
        pivotX,
        pivotY,
      ),
    );
    const forcedPeakComposite = compositeRgba(
      neutralizedComposite,
      transformRgba(
        canopyFullRgba,
        width,
        height,
        definition.bendDegrees,
        definition.lagDegrees,
        pivotX,
        pivotY,
      ),
    );
    const outsideNeutralization = differenceMetrics(
      source,
      atRestComposite,
      (pixel) => neutralAlpha[pixel] === 0,
    );
    const nativeGapDifference = differenceMetrics(
      source,
      underlay.output,
      (pixel) => neutralAlpha[pixel] === 255 && canopyMask[pixel] === 0,
    );
    const atRestDifference = differenceMetrics(source, atRestComposite);
    const protectedRects = definition.protectedShapes;
    const protectedDifference = differenceMetrics(
      source,
      atRestComposite,
      (pixel) => {
        const x = pixel % width;
        const y = Math.floor(pixel / width);
        return protectedRects.some((shape) => (
          protectedShapeContains(shape, x, y)
        ));
      },
    );
    const forcedProtectedDifference = differenceMetrics(
      forcedStartComposite,
      forcedPeakComposite,
      (pixel) => {
        const x = pixel % width;
        const y = Math.floor(pixel / width);
        return protectedRects.some((shape) => (
          protectedShapeContains(shape, x, y)
        ));
      },
    );
    if (
      outsideNeutralization.changedPixels !== 0
      || nativeGapDifference.changedPixels !== 0
      || protectedDifference.changedPixels !== 0
      || atRestDifference.changedPixels !== 0
      || forcedProtectedDifference.changedPixels !== 0
    ) {
      throw new Error(`${definition.id} changes a native gap, protected pixel, or at-rest source pixel.`);
    }
    const proofOutputs = [
      ["native-source", source],
      ["neutralized-underlay-composite", neutralizedComposite],
      ["at-rest-composite", atRestComposite],
      ["forced-start-composite", forcedStartComposite],
      ["forced-peak-composite", forcedPeakComposite],
      ["mask-registration", maskRegistrationOverlay(
        source,
        canopyMask,
        neutralAlpha,
      )],
    ];
    await Promise.all(proofOutputs.map(([suffix, rgba]) => (
      sharp(rgba, { raw: { channels: 4, height, width } })
        .png({ compressionLevel: 9, palette: false })
        .toFile(path.join(PROOF_ROOT, `${definition.id}-${suffix}.png`))
    )));
    separationEvidence.push(Object.freeze({
      atRestDifference,
      canopyHighAlphaPixels: canopyMetrics.highAlphaPixels,
      canopyLargestConnectedComponentRatio: Number(canopyConnection.ratio.toFixed(6)),
      forcedProtectedDifference,
      forcedStartPeakDifference: differenceMetrics(
        forcedStartComposite,
        forcedPeakComposite,
      ),
      id: definition.id,
      maskDerivation: definition.segmentation,
      maskRegistrationArtifact: `.codex-tmp/gauntlet/ninjaone-mvp-20260807-01/artifacts/foliage-r3/source-composites/${definition.id}-mask-registration.png`,
      nativeGapDifference,
      nativeGapPixels: underlay.nativeGapPixels,
      neutralizationDilationPixels: definition.neutralizationDilation,
      neutralizedCanopyDifferenceRatio: Number(neutralized.ratio.toFixed(6)),
      outsideNeutralizationDifference: outsideNeutralization,
      protectedDifference,
    }));
    const registeredSourceCrop = Object.freeze([
      left + trim.left,
      top + trim.top,
      trim.width,
      trim.height,
    ]);
    const trimmedCanopyAlpha = cropRaw(canopyMask, width, trim, 1);
    const trimmedNeutralAlpha = cropRaw(neutralAlpha, width, trim, 1);
    const canopyRgba = cropRaw(spriteRgba(source, canopyMask), width, trim, 4);
    const neutralRgba = cropRaw(underlay.output, width, trim, 4);
    const outputs = [
      Object.freeze({
        alpha: trimmedNeutralAlpha,
        id: `${definition.id}-neutralization`,
        kind: "neutralization-underlay",
        rgba: neutralRgba,
      }),
      Object.freeze({
        alpha: trimmedCanopyAlpha,
        id: `${definition.id}-canopy`,
        kind: "coherent-canopy",
        rgba: canopyRgba,
      }),
    ];
    const groupResources = new Map();
    for (const output of outputs) {
      const outputName = `${output.id}-r3.png`;
      expectedOutputNames.add(outputName);
      const outputPath = path.join(OUTPUT_ROOT, outputName);
      const outputBytes = await sharp(output.rgba, {
        raw: { channels: 4, height: trim.height, width: trim.width },
      }).png({ compressionLevel: 9, palette: false }).toBuffer();
      await writeFile(outputPath, outputBytes);
      const digest = sha256(outputBytes);
      const metrics = alphaMetrics(output.alpha, trim.width, trim.height);
      const connection = largestConnectedComponent(output.alpha, trim.width, trim.height);
      const decodedBytes = trim.width * trim.height * 4;
      foliageDecodedBytes += decodedBytes;
      const resource = Object.freeze({
        alphaBounds: metrics.alphaBounds,
        alphaCoverage: Number((metrics.highAlphaPixels / (trim.width * trim.height)).toFixed(6)),
        alphaSum: metrics.alphaSum,
        boundaryHighAlphaPixels: metrics.boundaryHighAlphaPixels,
        decodedBytes,
        dimensions: Object.freeze([trim.width, trim.height]),
        highAlphaPixels: metrics.highAlphaPixels,
        id: output.id,
        kind: output.kind,
        largestConnectedComponentPixels: connection.largest,
        largestConnectedComponentRatio: Number(connection.ratio.toFixed(6)),
        neutralizedCanopyDifferenceRatio: output.kind === "neutralization-underlay"
          ? Number(neutralized.ratio.toFixed(6))
          : undefined,
        opaquePixels: metrics.opaquePixels,
        path: versionedPublicPath(outputPath, digest),
        sha256: digest,
        sourceCrop: registeredSourceCrop,
        sourceTileId: definition.sourceTileId,
      });
      resources.push(resource);
      groupResources.set(output.kind, resource);
    }
    const canopyResource = groupResources.get("coherent-canopy");
    const neutralizationResource = groupResources.get("neutralization-underlay");
    neutralizationSources.push(Object.freeze({
      dimensions: Object.freeze([width, height]),
      id: `${definition.id}-neutralization-source-imagegen`,
      inputRole: "neutralization-rgb-only",
      path: versionedPublicPath(
        neutralizationSourcePath,
        sha256(neutralizationSourceBytes),
      ),
      provider: "built-in-imagegen-precise-object-edit",
      sha256: sha256(neutralizationSourceBytes),
      usage: "rgb is consumed only beneath source-derived opaque leaf pixels; native RGB is retained in every registered crown gap",
    }));
    const protectedSourceRects = definition.protectedShapes.map((shape) => Object.freeze({
      id: shape.id,
      kind: shape.kind,
      rect: Object.freeze([
        left + shape.x,
        top + shape.y,
        shape.width,
        shape.height,
      ]),
    }));
    instances.push(Object.freeze({
      animation: "canopy-bend",
      artboardBounds: registeredArtboardBounds(definition.sourceTileId, registeredSourceCrop),
      bendDegrees: definition.bendDegrees,
      canopyResourceId: canopyResource.id,
      checkpoint: definition.checkpoint,
      durationSeconds: definition.durationSeconds,
      gridCell: "C2",
      id: `${definition.id}-instance`,
      lagDegrees: definition.lagDegrees,
      neutralizationResourceId: neutralizationResource.id,
      phaseSeconds: definition.phaseSeconds,
      pivotYPercent: 96,
      protectedSourceRects,
      sourceTileId: definition.sourceTileId,
    }));
  }

  for (const existing of await readdir(OUTPUT_ROOT)) {
    if (existing.endsWith(".png") && !expectedOutputNames.has(existing)) {
      await rm(path.join(OUTPUT_ROOT, existing));
    }
  }

  const terrainDecodedBytes = MAXIMUM_TERRAIN_TILES
    * NATIVE_TILE_DIMENSIONS[0]
    * NATIVE_TILE_DIMENSIONS[1]
    * 4;
  const fixedC2DecodedBytes = terrainDecodedBytes + foliageDecodedBytes;
  const combinedDecodedBytes = fixedC2DecodedBytes;
  const mountedFoliageNodes = instances.length * NODES_PER_GROUP;
  if (
    instances.length > MAXIMUM_SELECTED_GROUPS
    || mountedFoliageNodes > MAXIMUM_SUPPLEMENTAL_NODES
    || combinedDecodedBytes > MAXIMUM_DECODED_BYTES
  ) {
    throw new RangeError("Foliage violates the registered node or decoded union budget.");
  }

  const manifest = {
    schemaVersion: 2,
    id: "career-world/capitals/ninjaone/foliage-native@r3",
    status: "coherent-native-canopy-with-neutralization",
    sourceCollection: {
      authority: "twelve-original-native-generated-r2-pngs",
      forbiddenSources: [
        "ninjaone-environment-terrain-master-detail-r2.png",
        "runtime-close-quilt-r3",
        "browser-screenshots",
      ],
      tiles: sourceCollection,
    },
    neutralizationSources,
    separationEvidence,
    eligibility: {
      maxDetailEnterSpan: MAX_DETAIL_ENTER_SPAN,
      maxDetailRetainSpan: MAX_DETAIL_RETAIN_SPAN,
    },
    registration: {
      artboard: ARTBOARD,
      boundingWorldView: {
        origin: [0.125, 0],
        span: [0.25, 1 / 3],
      },
      grid: GRID,
      gridCell: {
        artboardBounds: {
          origin: [720, 540],
          span: [720, 540],
        },
        id: "C2",
        worldBounds: {
          origin: [0.25, 1 / 6],
          span: [0.125, 1 / 6],
        },
      },
      nativeTileDimensions: NATIVE_TILE_DIMENSIONS,
      tileArtboard: TILE_ARTBOARD,
    },
    ownership: "the static underlay changes RGB only beneath source-derived opaque leaf pixels and reproduces exact native RGB in genuine crown gaps; the animated canopy excludes protected trunk, rock, trail, stream, and neighbor-tree shapes",
    budgets: {
      combinedDecodedBytes,
      fixedC2DecodedBytes,
      foliageDecodedBytes,
      futureSupplementalNodeHeadroom: MAXIMUM_SUPPLEMENTAL_NODES - mountedFoliageNodes,
      maximumDecodedBytes: MAXIMUM_DECODED_BYTES,
      maximumSelectedGroups: MAXIMUM_SELECTED_GROUPS,
      maximumSupplementalNodes: MAXIMUM_SUPPLEMENTAL_NODES,
      maximumTerrainTiles: MAXIMUM_TERRAIN_TILES,
      mountedFoliageNodes,
      mountedGroups: instances.length,
      nodesPerGroup: NODES_PER_GROUP,
      terrainDecodedBytes,
    },
    resources,
    instances,
  };
  await mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  process.stdout.write(
    `Built ${instances.length} coherent canopy groups (${mountedFoliageNodes} foliage nodes; ${combinedDecodedBytes} conservative decoded bytes).\n`,
  );
}

await build();
