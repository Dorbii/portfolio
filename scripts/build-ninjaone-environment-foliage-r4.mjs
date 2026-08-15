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
const MAXIMUM_DECODED_BYTES = 32 * 1024 * 1024;
const MAXIMUM_TERRAIN_TILES = 4;
const MAXIMUM_SUPPLEMENTAL_NODES = 6;
const MAXIMUM_SELECTED_GROUPS = 3;
const NODES_PER_GROUP = 2;
const MAX_DETAIL_ENTER_SPAN = 0.12;
const MAX_DETAIL_RETAIN_SPAN = 0.14;
const TRIM_PADDING = 12;

const GROUPS = Object.freeze([
  Object.freeze({
    bendDegrees: 1.15,
    checkpoint: "b1-ridge-west-conifer-native",
    crop: Object.freeze([2180, 1100, 340, 440]),
    durationSeconds: 6.2,
    id: "b1-ridge-west-conifer-native",
    lagDegrees: 0.09,
    minimumLeafPixels: 13_000,
    neutralizationDilation: 12,
    neutralizationSourceName: "ridge-west-neutralization-source-imagegen-r4.png",
    segmentationSourceName: "ridge-west-tree-alpha-imagegen-r4.png",
    phaseSeconds: -0.8,
    segmentation: "native-r8-tree-alpha-chroma-neutralization-difference",
  }),
  Object.freeze({
    bendDegrees: 0.92,
    checkpoint: "b1-ridge-south-conifer-native",
    crop: Object.freeze([2360, 1280, 360, 480]),
    durationSeconds: 7.05,
    id: "b1-ridge-south-conifer-native",
    lagDegrees: 0.075,
    minimumLeafPixels: 16_000,
    neutralizationDilation: 12,
    neutralizationSourceName: "ridge-south-neutralization-source-imagegen-r4.png",
    segmentationSourceName: "ridge-south-tree-alpha-imagegen-r4.png",
    phaseSeconds: -2.35,
    segmentation: "native-r8-tree-alpha-chroma-neutralization-difference",
  }),
  Object.freeze({
    bendDegrees: 1.08,
    checkpoint: "b1-ridge-central-conifer-native",
    crop: Object.freeze([2600, 1320, 320, 500]),
    durationSeconds: 5.65,
    id: "b1-ridge-central-conifer-native",
    lagDegrees: 0.085,
    minimumLeafPixels: 14_000,
    neutralizationDilation: 12,
    neutralizationSourceName: "ridge-central-neutralization-source-imagegen-r4.png",
    segmentationSourceName: "ridge-central-tree-alpha-imagegen-r4.png",
    phaseSeconds: -1.45,
    segmentation: "native-r8-tree-alpha-chroma-neutralization-difference",
  }),
  Object.freeze({
    bendDegrees: 1.0,
    checkpoint: "c1-ridge-east-conifer-native",
    crop: Object.freeze([3260, 1100, 340, 460]),
    durationSeconds: 6.7,
    id: "c1-ridge-east-conifer-native",
    lagDegrees: 0.08,
    minimumLeafPixels: 7_500,
    neutralizationDilation: 8,
    neutralizationSourceName: "ridge-east-neutralization-source-imagegen-r4.png",
    segmentationSourceName: "ridge-east-tree-alpha-imagegen-r4.png",
    phaseSeconds: -3.15,
    segmentation: "native-r8-tree-alpha-chroma-neutralization-difference",
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

function registeredSegmentationAlpha(
  segmentation,
  source,
  neutralizationEdit,
  width,
  height,
) {
  const output = Buffer.alloc(width * height);
  for (let pixel = 0; pixel < output.length; pixel += 1) {
    if (segmentation[pixel * 4 + 3] < 64) continue;
    const offset = pixel * 4;
    const red = source[offset];
    const green = source[offset + 1];
    const blue = source[offset + 2];
    const neutralizedDifference = Math.max(
      Math.abs(red - neutralizationEdit[offset]),
      Math.abs(green - neutralizationEdit[offset + 1]),
      Math.abs(blue - neutralizationEdit[offset + 2]),
    );
    const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
    const needleChroma = green - blue >= 6 && red - blue >= 4;
    const deepNeedleShadow = luminance <= 68
      && green >= blue - 2
      && red >= blue - 10;
    if (
      neutralizedDifference >= 6
      && (needleChroma || deepNeedleShadow)
    ) output[pixel] = 255;
  }
  return output;
}

function neutralizationSupportAlpha(canopyAlpha, width, height, definition) {
  const output = Buffer.alloc(width * height);
  const radius = definition.neutralizationDilation;
  for (let pixel = 0; pixel < canopyAlpha.length; pixel += 1) {
    if (canopyAlpha[pixel] !== 255) continue;
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

function registeredArtboardBounds(sourceCrop) {
  return Object.freeze({
    origin: Object.freeze([
      sourceCrop[0] / MASTER_SOURCE_DIMENSIONS[0] * ARTBOARD[0],
      sourceCrop[1] / MASTER_SOURCE_DIMENSIONS[1] * ARTBOARD[1],
    ]),
    span: Object.freeze([
      sourceCrop[2] / MASTER_SOURCE_DIMENSIONS[0] * ARTBOARD[0],
      sourceCrop[3] / MASTER_SOURCE_DIMENSIONS[1] * ARTBOARD[1],
    ]),
  });
}

function registeredGridCell(artboardBounds) {
  const centerX = artboardBounds.origin[0] + artboardBounds.span[0] * 0.5;
  const centerY = artboardBounds.origin[1] + artboardBounds.span[1] * 0.5;
  return `${centerX < ARTBOARD[0] * 0.5 ? "B" : "C"}${
    centerY < ARTBOARD[1] * 0.5 ? "1" : "2"
  }`;
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
  const resources = [];
  const instances = [];
  const neutralizationSources = [];
  const segmentationSources = [];
  const separationEvidence = [];
  const expectedOutputNames = new Set();
  let foliageDecodedBytes = 0;

  for (const definition of GROUPS) {
    const [left, top, width, height] = definition.crop;
    const neutralizationSourcePath = path.join(
      OUTPUT_ROOT,
      definition.neutralizationSourceName,
    );
    const segmentationSourcePath = path.join(
      OUTPUT_ROOT,
      definition.segmentationSourceName,
    );
    const [neutralizationSourceBytes, segmentationSourceBytes] = await Promise.all([
      readFile(neutralizationSourcePath),
      readFile(segmentationSourcePath),
    ]);
    expectedOutputNames.add(definition.neutralizationSourceName);
    expectedOutputNames.add(definition.segmentationSourceName);
    const [source, neutralizationEdit, segmentationEdit] = await Promise.all([
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
      sharp(segmentationSourceBytes)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true }),
    ]);
    if (
      segmentationEdit.info.width !== width
      || segmentationEdit.info.height !== height
    ) {
      throw new RangeError(`${definition.id} segmentation is not exactly ${width}x${height}.`);
    }
    const canopyMask = registeredSegmentationAlpha(
      segmentationEdit.data,
      source,
      neutralizationEdit,
      width,
      height,
    );
    const neutralAlpha = neutralizationSupportAlpha(
      canopyMask,
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
    const protectedDifference = differenceMetrics(
      source,
      atRestComposite,
      () => false,
    );
    const forcedProtectedDifference = differenceMetrics(
      forcedStartComposite,
      forcedPeakComposite,
      () => false,
    );
    if (
      outsideNeutralization.changedPixels !== 0
      || nativeGapDifference.changedPixels !== 0
      || protectedDifference.changedPixels !== 0
      || atRestDifference.changedPixels !== 0
      || forcedProtectedDifference.changedPixels !== 0
    ) {
      throw new Error(`${definition.id} changes a native gap, protected pixel, or at-rest source pixel: ${JSON.stringify({
        atRestDifference,
        forcedProtectedDifference,
        nativeGapDifference,
        outsideNeutralization,
        protectedDifference,
      })}`);
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
      maskRegistrationArtifact: `.codex-tmp/gauntlet/ninjaone-mvp-20260807-01/artifacts/foliage-r4/source-composites/${definition.id}-mask-registration.png`,
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
      const outputName = `${output.id}-r4.png`;
      expectedOutputNames.add(outputName);
      const outputPath = path.join(OUTPUT_ROOT, outputName);
      const outputBytes = await sharp(output.rgba, {
        raw: { channels: 4, height: trim.height, width: trim.width },
      }).png({ compressionLevel: 9, palette: false }).toBuffer();
      await writeFileIfChanged(outputPath, outputBytes);
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
        sourceMasterId: MASTER_SOURCE_ID,
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
    segmentationSources.push(Object.freeze({
      dimensions: Object.freeze([width, height]),
      id: `${definition.id}-tree-alpha-imagegen`,
      inputRole: "tree-only-alpha-guidance",
      path: versionedPublicPath(
        segmentationSourcePath,
        sha256(segmentationSourceBytes),
      ),
      provider: "built-in-imagegen-precise-object-segmentation",
      sha256: sha256(segmentationSourceBytes),
      usage: "alpha only; runtime RGB is copied byte-for-byte from the active r8 terrain master",
    }));
    const protectedSourceRects = Object.freeze([]);
    const artboardBounds = registeredArtboardBounds(registeredSourceCrop);
    instances.push(Object.freeze({
      animation: "canopy-bend",
      artboardBounds,
      bendDegrees: definition.bendDegrees,
      canopyResourceId: canopyResource.id,
      checkpoint: definition.checkpoint,
      durationSeconds: definition.durationSeconds,
      gridCell: registeredGridCell(artboardBounds),
      id: `${definition.id}-instance`,
      lagDegrees: definition.lagDegrees,
      neutralizationResourceId: neutralizationResource.id,
      phaseSeconds: definition.phaseSeconds,
      pivotYPercent: 96,
      protectedSourceRects,
      sourceMasterId: MASTER_SOURCE_ID,
    }));
  }

  for (const existing of await readdir(OUTPUT_ROOT)) {
    if (existing.endsWith(".png") && !expectedOutputNames.has(existing)) {
      await rm(path.join(OUTPUT_ROOT, existing));
    }
  }

  const terrainDecodedBytes = MAXIMUM_TERRAIN_TILES
    * TERRAIN_TILE_DECODE_DIMENSIONS[0]
    * TERRAIN_TILE_DECODE_DIMENSIONS[1]
    * 4;
  const conservativeDecodedBytes = terrainDecodedBytes + foliageDecodedBytes;
  const combinedDecodedBytes = conservativeDecodedBytes;
  const mountedGroups = Math.min(instances.length, MAXIMUM_SELECTED_GROUPS);
  const mountedFoliageNodes = mountedGroups * NODES_PER_GROUP;
  if (
    mountedFoliageNodes > MAXIMUM_SUPPLEMENTAL_NODES
    || combinedDecodedBytes > MAXIMUM_DECODED_BYTES
  ) {
    throw new RangeError("Foliage violates the registered node or decoded union budget.");
  }

  const manifest = {
    schemaVersion: 3,
    id: "career-world/capitals/ninjaone/foliage-native@r4",
    status: "active-master-native-canopy-with-neutralization",
    sourceMaster: {
      authority: "active-r8-geology-master",
      dimensions: MASTER_SOURCE_DIMENSIONS,
      id: MASTER_SOURCE_ID,
      path: MASTER_SOURCE_PUBLIC_PATH,
      sha256: sha256(sourceBytes),
    },
    neutralizationSources,
    segmentationSources,
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
      coveredGridCells: [...new Set(instances.map(({ gridCell }) => gridCell))].sort(),
      grid: GRID,
      masterDimensions: MASTER_SOURCE_DIMENSIONS,
      sourcePixelsPerArtboardUnit: 4,
    },
    ownership: "the static underlay changes RGB only beneath source-derived opaque tree pixels and reproduces exact native RGB in genuine crown gaps; the animated canopy requires both imagegen tree alpha and active-r8 conifer chroma plus neutralization difference",
    budgets: {
      combinedDecodedBytes,
      conservativeDecodedBytes,
      foliageDecodedBytes,
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
    },
    resources,
    instances,
  };
  await mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
  await writeJsonAtomically(MANIFEST_PATH, manifest);
  process.stdout.write(
    `Built ${instances.length} coherent canopy groups (${mountedFoliageNodes} foliage nodes; ${combinedDecodedBytes} conservative decoded bytes).\n`,
  );
}

await build();
