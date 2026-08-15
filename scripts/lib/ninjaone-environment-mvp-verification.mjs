import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

export const NINJAONE_MVP_NATIVE_SOURCE_PREFIX =
  "/art-source/career-world/ninjaone-environment/production-r2/detail-tiles-r2/generated/";
export const NINJAONE_MVP_CAPTURE_PRODUCER_PATH =
  "scripts/capture-ninjaone-environment-mvp.mjs";
export const NINJAONE_MVP_VERIFICATION_LIBRARY_PATH =
  "scripts/lib/ninjaone-environment-mvp-verification.mjs";
export const NINJAONE_MVP_FOLIAGE_ISOLATION_PRODUCER_ID =
  "ninjaone-environment-foliage-isolation-browser-capture-r2";
export const NINJAONE_MVP_FOLIAGE_ISOLATION_BINDING_PATHS = Object.freeze([
  NINJAONE_MVP_CAPTURE_PRODUCER_PATH,
  NINJAONE_MVP_VERIFICATION_LIBRARY_PATH,
  "app/page.tsx",
  "features/career-world/shared/camera.ts",
  "features/career-world/shared/lod/policy.ts",
  "features/career-world/composition/WorldScene.tsx",
  "features/career-world/layers/terrain/components/NinjaOneEnvironmentProof.tsx",
  "features/career-world/layers/terrain/components/NinjaOneEnvironmentGeology.tsx",
  "features/career-world/layers/terrain/detail/components/NinjaOneEnvironmentNativeDetail.tsx",
  "features/career-world/layers/terrain/detail/components/NinjaOneEnvironmentFoliage.tsx",
  "features/career-world/layers/terrain/detail/components/NinjaOneEnvironmentFoliageCanvas.tsx",
  "features/career-world/layers/terrain/detail/components/ninjaOneEnvironmentFoliageWebGl.ts",
  "features/career-world/layers/terrain/detail/model/ninjaOneEnvironmentFoliage.ts",
  "features/career-world/layers/terrain/detail/model/useNinjaOneEnvironmentFoliageResidency.ts",
  "features/career-world/layers/terrain/model/ninjaOneEnvironmentProof.ts",
  "features/career-world/styles/career-world.css",
  "scripts/build-ninjaone-environment-foliage-r4.mjs",
  "public/career-world/capitals/ninjaone/environment/manifests/foliage-native-r4.json",
  "public/career-world/capitals/ninjaone/environment/shared/foliage-native-r4/b1-conifer-neutralization-imagegen-r5.png",
  "public/career-world/capitals/ninjaone/environment/shared/foliage-native-r4/b1-conifer-occupancy-alpha-imagegen-r5.png",
  "public/career-world/capitals/ninjaone/environment/shared/foliage-native-r4/b2-conifer-neutralization-imagegen-r5.png",
  "public/career-world/capitals/ninjaone/environment/shared/foliage-native-r4/b2-conifer-occupancy-alpha-imagegen-r5.png",
  "public/career-world/capitals/ninjaone/environment/shared/foliage-native-r4/c1-conifer-neutralization-imagegen-r5.png",
  "public/career-world/capitals/ninjaone/environment/shared/foliage-native-r4/c1-conifer-occupancy-alpha-imagegen-r5.png",
  "public/career-world/capitals/ninjaone/environment/shared/foliage-native-r4/c2-conifer-neutralization-imagegen-r5.png",
  "public/career-world/capitals/ninjaone/environment/shared/foliage-native-r4/c2-conifer-occupancy-alpha-imagegen-r5.png",
  "public/career-world/capitals/ninjaone/environment/shared/foliage-native-r4/ninjaone-pooled-foliage-atlas-r6.png",
  "public/career-world/capitals/ninjaone/environment/shared/foliage-native-r4/russet-fantasy-tree-01.png",
  "public/career-world/capitals/ninjaone/environment/shared/foliage-native-r4/russet-fantasy-tree-02.png",
  "public/career-world/capitals/ninjaone/environment/shared/foliage-native-r4/russet-fantasy-tree-03.png",
  "public/career-world/capitals/ninjaone/environment/shared/foliage-native-r4/silver-aspen-tree-01.png",
  "public/career-world/capitals/ninjaone/environment/shared/foliage-native-r4/silver-aspen-tree-02.png",
  "public/career-world/capitals/ninjaone/environment/shared/foliage-native-r4/alpine-shrub-01.png",
  "public/career-world/capitals/ninjaone/environment/shared/foliage-native-r4/alpine-shrub-02.png",
  "public/career-world/capitals/ninjaone/environment/shared/foliage-native-r4/alpine-shrub-03.png",
  "public/career-world/capitals/ninjaone/environment/shared/foliage-native-r4/wildflower-heather-01.png",
  "public/career-world/capitals/ninjaone/environment/shared/foliage-native-r4/wildflower-heather-02.png",
  "public/career-world/capitals/ninjaone/environment/shared/foliage-native-r4/wildflower-heather-03.png",
  "art-source/career-world/ninjaone-environment/production-r2/ninjaone-environment-terrain-master-detail-r8.png",
]);
export const NINJAONE_MVP_BANNED_FIDELITY_SOURCES = Object.freeze([
  "ninjaone-environment-terrain-master-detail-r2.png",
  "runtime-close-quilt-r3.png",
]);
export const NINJAONE_MVP_LIMITS = Object.freeze({
  maximumDecodedBytes: 32 * 1024 * 1024,
  maximumSupplementalNodes: 64,
  maximumTerrainTiles: 4,
});
export const NINJAONE_MVP_CLOSE_ASSET_PRELOAD_MAXIMUM_CAMERA_SPAN = 0.075;
export const NINJAONE_MVP_NATIVE_RELEASE_MAXIMUM_CAMERA_SPAN = 0.0875;
export const NINJAONE_MVP_FIXED_CAMERAS = Object.freeze({
  B2: Object.freeze({
    center: Object.freeze([0.1875, 0.25]),
    origin: Object.freeze([0.1675, 0.23]),
    span: Object.freeze([0.04, 0.04]),
  }),
  C1: Object.freeze({
    center: Object.freeze([0.3125, 1 / 12]),
    origin: Object.freeze([0.2925, 1 / 12 - 0.02]),
    span: Object.freeze([0.04, 0.04]),
  }),
  C2: Object.freeze({
    center: Object.freeze([0.3125, 0.25]),
    origin: Object.freeze([0.2925, 0.23]),
    span: Object.freeze([0.04, 0.04]),
  }),
});
export const NINJAONE_MVP_CHECKPOINT_REFERENCES = Object.freeze({
  B2: ".codex-tmp/gauntlet/ninjaone-mvp-20260807-01/proof/native-b2-direct-quilt.png",
  C1: ".codex-tmp/gauntlet/ninjaone-mvp-20260807-01/proof/native-c1-direct-quilt.png",
  C2: ".codex-tmp/gauntlet/ninjaone-mvp-20260807-01/proof/native-c2-direct-quilt.png",
});
export const NINJAONE_MVP_LOD_SEQUENCE = Object.freeze([
  Object.freeze({ id: "site", span: 0.09 }),
  Object.freeze({ id: "preload-enter", span: 0.074 }),
  Object.freeze({ id: "close", span: 0.04 }),
  Object.freeze({ id: "reverse-hysteresis", span: 0.08 }),
  Object.freeze({ id: "released", span: 0.09 }),
]);
export const NINJAONE_MVP_RESIDENCY_VISUAL_ISOLATION = Object.freeze({
  animation: "paused",
  coast: "required-presentation-preserved",
  foliage: "visibility:hidden!important",
  hud: "display:none!important",
  interface: "display:none!important",
  seam: "required-presentation-preserved",
  water: "visibility:hidden!important",
});
export const NINJAONE_MVP_FOLIAGE_CAMERA = Object.freeze({
  center: Object.freeze([0.25, 0.125]),
  origin: Object.freeze([0.2125, 0.0875]),
  span: Object.freeze([0.075, 0.075]),
});
const ENVIRONMENT_ORIGIN = Object.freeze([0.125, 0]);
const ENVIRONMENT_SPAN = Object.freeze([0.25, 1 / 3]);
const ARTBOARD = Object.freeze([1440, 1080]);
const TILE_DIMENSIONS = Object.freeze([1448, 1086]);
const ALPHA_PRESENT = 16;
const FRAME_DIFF_THRESHOLD = 6;
const MAX_MOTION_MASK_COVERAGE = 0.25;
const NATIVE_BUDGET_SWEEP_SPANS = Object.freeze([
  0.04, 0.05, 0.055, 0.06, 0.061, 0.074, 0.075, 0.08, 0.0875, 0.09,
]);

function foliageArtboardView(camera) {
  return {
    origin: camera.origin.map((value, index) => (
      (value - ENVIRONMENT_ORIGIN[index]) / ENVIRONMENT_SPAN[index] * ARTBOARD[index]
    )),
    span: camera.span.map((value, index) => (
      value / ENVIRONMENT_SPAN[index] * ARTBOARD[index]
    )),
  };
}

function rectanglesIntersect(first, second) {
  return first.origin[0] < second.origin[0] + second.span[0]
    && first.origin[0] + first.span[0] > second.origin[0]
    && first.origin[1] < second.origin[1] + second.span[1]
    && first.origin[1] + first.span[1] > second.origin[1];
}

function selectManifestFoliageInstances(camera, manifest) {
  const view = foliageArtboardView(camera);
  const ratio = manifest?.eligibility?.viewportOverscanRatio ?? 0;
  const admissionView = {
    origin: view.origin.map((value, index) => value - view.span[index] * ratio),
    span: view.span.map((value) => value * (1 + ratio * 2)),
  };
  const center = view.origin.map((value, index) => value + view.span[index] * 0.5);
  const distance = (instance) => instance.artboardBounds.origin.reduce(
    (total, value, index) => {
      const instanceCenter = value + instance.artboardBounds.span[index] * 0.5;
      return total + (center[index] - instanceCenter) ** 2;
    },
    0,
  );
  return (manifest?.instances ?? [])
    .filter((instance) => rectanglesIntersect(admissionView, instance.artboardBounds))
    .sort((left, right) => distance(left) - distance(right))
    .slice(0, manifest?.budgets?.maximumSelectedGroups ?? 0);
}

function round(value, digits = 4) {
  if (!Number.isFinite(value)) return null;
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function stripQuery(value) {
  return value.split("?", 1)[0];
}

export function resolveRepoAsset(root, sourcePath) {
  const clean = stripQuery(sourcePath).replace(/^\//, "");
  return sourcePath.startsWith("/career-world/")
    ? path.join(root, "public", clean)
    : path.join(root, clean);
}

async function readRgba(file, extract) {
  let pipeline = sharp(file, { failOn: "error" });
  if (extract) pipeline = pipeline.extract(extract);
  return pipeline.toColourspace("srgb").ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
}

async function readDecodedRgba(file) {
  return sharp(file, { failOn: "error" }).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
}

async function fileSha256(file) {
  return createHash("sha256").update(await readFile(file)).digest("hex").toUpperCase();
}

export async function createNinjaOneEnvironmentFoliageIsolationBindings(root) {
  const relativeFiles = [...new Set([
    ...NINJAONE_MVP_FOLIAGE_ISOLATION_BINDING_PATHS,
  ])].sort();
  const files = Object.freeze(Object.fromEntries(await Promise.all(
    relativeFiles.map(async (relativeFile) => [
      relativeFile,
      await fileSha256(path.resolve(root, relativeFile)),
    ]),
  )));
  const css = (await readFile(path.resolve(
    root,
    "features/career-world/styles/career-world.css",
  ), "utf8")).replaceAll("\r\n", "\n");
  const start = css.indexOf(
    ".ninjaone-environment-native-detail__canopy-neutralization",
  );
  const end = css.indexOf(
    "\n\n.ninjaone-environment-proof__hud",
    start,
  );
  if (start < 0 || end < 0) throw new Error("Frozen foliage CSS block is missing.");
  const cssBlock = css.slice(start, end);
  const cssBlockSha256 = createHash("sha256")
    .update(cssBlock)
    .digest("hex")
    .toUpperCase();
  const aggregateSha256 = createHash("sha256")
    .update(Object.entries(files).map(([relativeFile, hash]) => (
      `${relativeFile}\0${hash}\n`
    )).join(""))
    .update(`foliage-css-block\0${cssBlockSha256}\n`)
    .digest("hex")
    .toUpperCase();
  return Object.freeze({
    aggregateSha256,
    cssBlock: Object.freeze({
      bytes: Buffer.byteLength(cssBlock, "utf8"),
      normalizedLineEndings: "LF",
      sha256: cssBlockSha256,
    }),
    files,
  });
}

function decodedRgbSha256(image) {
  const rgb = Buffer.alloc(image.info.width * image.info.height * 3);
  for (let source = 0, target = 0; source < image.data.length; source += 4, target += 3) {
    rgb[target] = image.data[source];
    rgb[target + 1] = image.data[source + 1];
    rgb[target + 2] = image.data[source + 2];
  }
  return createHash("sha256").update(rgb).digest("hex").toUpperCase();
}

function luma(red, green, blue) {
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function histogramMedian(histogram, count) {
  if (count === 0) return null;
  const target = Math.floor((count - 1) / 2);
  let seen = 0;
  for (let value = 0; value < histogram.length; value += 1) {
    seen += histogram[value];
    if (seen > target) return value;
  }
  return 255;
}

function detailEnergy(data, width, height) {
  let energy = 0;
  let samples = 0;
  for (let y = 0; y < height - 1; y += 2) {
    for (let x = 0; x < width - 1; x += 2) {
      const index = (y * width + x) * 4;
      const right = index + 4;
      const down = index + width * 4;
      if (
        data[index + 3] < ALPHA_PRESENT
        || data[right + 3] < ALPHA_PRESENT
        || data[down + 3] < ALPHA_PRESENT
      ) continue;
      const centerLuma = luma(data[index], data[index + 1], data[index + 2]);
      energy += Math.abs(
        luma(data[right], data[right + 1], data[right + 2]) - centerLuma,
      );
      energy += Math.abs(
        luma(data[down], data[down + 1], data[down + 2]) - centerLuma,
      );
      samples += 2;
    }
  }
  return samples === 0 ? 0 : energy / samples;
}

function auditTilePixels(candidate, reference) {
  const candidateData = candidate.data;
  const referenceData = reference.data;
  if (
    candidate.info.width !== reference.info.width
    || candidate.info.height !== reference.info.height
    || candidateData.length !== referenceData.length
  ) throw new Error("Candidate and native-original reference dimensions differ.");

  const candidateHistograms = Array.from({ length: 4 }, () => new Uint32Array(256));
  const referenceHistograms = Array.from({ length: 4 }, () => new Uint32Array(256));
  let alphaMismatchPixels = 0;
  let commonOpaquePixels = 0;
  let exactPixels = 0;
  const totalPixels = candidate.info.width * candidate.info.height;
  for (let index = 0; index < candidateData.length; index += 4) {
    const candidatePresent = candidateData[index + 3] >= ALPHA_PRESENT;
    const referencePresent = referenceData[index + 3] >= ALPHA_PRESENT;
    if (candidatePresent !== referencePresent) alphaMismatchPixels += 1;
    if (
      candidateData[index] === referenceData[index]
      && candidateData[index + 1] === referenceData[index + 1]
      && candidateData[index + 2] === referenceData[index + 2]
      && candidateData[index + 3] === referenceData[index + 3]
    ) exactPixels += 1;
    if (!candidatePresent || !referencePresent) continue;
    commonOpaquePixels += 1;
    for (let channel = 0; channel < 3; channel += 1) {
      candidateHistograms[channel][candidateData[index + channel]] += 1;
      referenceHistograms[channel][referenceData[index + channel]] += 1;
    }
    candidateHistograms[3][Math.round(luma(
      candidateData[index], candidateData[index + 1], candidateData[index + 2],
    ))] += 1;
    referenceHistograms[3][Math.round(luma(
      referenceData[index], referenceData[index + 1], referenceData[index + 2],
    ))] += 1;
  }

  const candidateMedians = candidateHistograms.map((histogram) => (
    histogramMedian(histogram, commonOpaquePixels)
  ));
  const referenceMedians = referenceHistograms.map((histogram) => (
    histogramMedian(histogram, commonOpaquePixels)
  ));
  const channelDeltas = candidateMedians.slice(0, 3).map((value, index) => (
    value === null || referenceMedians[index] === null
      ? null
      : Math.abs(value - referenceMedians[index])
  ));
  const luminanceDeltaPct = candidateMedians[3] === null
    || referenceMedians[3] === null
    ? null
    : Math.abs(candidateMedians[3] - referenceMedians[3])
      / Math.max(1, referenceMedians[3]) * 100;
  const candidateEnergy = detailEnergy(
    candidateData, candidate.info.width, candidate.info.height,
  );
  const referenceEnergy = detailEnergy(
    referenceData, reference.info.width, reference.info.height,
  );
  const energyRatio = referenceEnergy === 0
    ? candidateEnergy === 0 ? 1 : null
    : candidateEnergy / referenceEnergy;
  const alphaMismatchPct = alphaMismatchPixels / totalPixels * 100;
  const geometryPass = alphaMismatchPct <= 1;
  const palettePass = commonOpaquePixels > 0
    ? luminanceDeltaPct <= 5
      && channelDeltas.every((value) => value <= 12)
    : geometryPass;
  const detailPass = energyRatio !== null && energyRatio >= 0.85;
  return Object.freeze({
    alphaMismatchPixels,
    alphaMismatchPct: round(alphaMismatchPct),
    candidateDetailEnergy: round(candidateEnergy),
    candidateMedian: Object.freeze({
      blue: candidateMedians[2],
      green: candidateMedians[1],
      luminance: candidateMedians[3],
      red: candidateMedians[0],
    }),
    channelMedianDelta: Object.freeze({
      blue: channelDeltas[2],
      green: channelDeltas[1],
      red: channelDeltas[0],
    }),
    commonOpaquePixels,
    detailEnergyRatio: round(energyRatio),
    detailPass,
    exactPixelPct: round(exactPixels / totalPixels * 100),
    geometryPass,
    luminanceMedianDeltaPct: round(luminanceDeltaPct),
    palettePass,
    pass: geometryPass && palettePass && detailPass,
    referenceDetailEnergy: round(referenceEnergy),
    referenceMedian: Object.freeze({
      blue: referenceMedians[2],
      green: referenceMedians[1],
      luminance: referenceMedians[3],
      red: referenceMedians[0],
    }),
    totalPixels,
  });
}

function pixelDifference(first, firstIndex, second, secondIndex) {
  return (
    Math.abs(first[firstIndex] - second[secondIndex])
    + Math.abs(first[firstIndex + 1] - second[secondIndex + 1])
    + Math.abs(first[firstIndex + 2] - second[secondIndex + 2])
    + Math.abs(first[firstIndex + 3] - second[secondIndex + 3])
  ) / 4;
}

function median(values) {
  if (values.length === 0) return 0;
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2
    ? ordered[middle]
    : (ordered[middle - 1] + ordered[middle]) / 2;
}

function seamMetric(first, second, orientation) {
  const width = first.info.width;
  const height = first.info.height;
  if (width !== second.info.width || height !== second.info.height) {
    throw new Error("Seam tiles must share dimensions.");
  }
  const axisLength = orientation === "vertical" ? height : width;
  const boundaryDifferences = [];
  const controls = [];
  const differenceAt = (leftOffset, rightOffset, axis) => {
    if (orientation === "vertical") {
      const firstIndex = (axis * width + leftOffset) * 4;
      const secondIndex = (axis * width + rightOffset) * 4;
      return pixelDifference(first.data, firstIndex, second.data, secondIndex);
    }
    const firstIndex = (leftOffset * width + axis) * 4;
    const secondIndex = (rightOffset * width + axis) * 4;
    return pixelDifference(first.data, firstIndex, second.data, secondIndex);
  };
  for (let axis = 0; axis < axisLength; axis += 1) {
    boundaryDifferences.push(differenceAt(
      orientation === "vertical" ? width - 1 : height - 1,
      0,
      axis,
    ));
  }
  for (let offset = 1; offset <= 8; offset += 1) {
    let firstTotal = 0;
    let secondTotal = 0;
    for (let axis = 0; axis < axisLength; axis += 1) {
      if (orientation === "vertical") {
        const firstA = (axis * width + width - offset - 1) * 4;
        const firstB = firstA + 4;
        const secondA = (axis * width + offset - 1) * 4;
        const secondB = secondA + 4;
        firstTotal += pixelDifference(first.data, firstA, first.data, firstB);
        secondTotal += pixelDifference(second.data, secondA, second.data, secondB);
      } else {
        const firstA = ((height - offset - 1) * width + axis) * 4;
        const firstB = firstA + width * 4;
        const secondA = ((offset - 1) * width + axis) * 4;
        const secondB = secondA + width * 4;
        firstTotal += pixelDifference(first.data, firstA, first.data, firstB);
        secondTotal += pixelDifference(second.data, secondA, second.data, secondB);
      }
    }
    controls.push(firstTotal / axisLength, secondTotal / axisLength);
  }
  const boundaryMean = boundaryDifferences.reduce(
    (total, value) => total + value, 0,
  ) / axisLength;
  const controlMedian = median(controls);
  const ratio = controlMedian === 0
    ? boundaryMean === 0 ? 1 : Number.POSITIVE_INFINITY
    : boundaryMean / controlMedian;
  let longestHighContrastRun = 0;
  let currentRun = 0;
  for (const value of boundaryDifferences) {
    if (value >= 48) {
      currentRun += 1;
      longestHighContrastRun = Math.max(longestHighContrastRun, currentRun);
    } else currentRun = 0;
  }
  return Object.freeze({
    boundaryMean: round(boundaryMean),
    controlMedian: round(controlMedian),
    discontinuityRatio: round(ratio),
    longestHighContrastRun,
    pass: ratio <= 1.15 && longestHighContrastRun <= 48,
  });
}

function rawRegion(image, { height, left, top, width }) {
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const sourceStart = ((top + y) * image.info.width + left) * 4;
    const targetStart = y * width * 4;
    image.data.copy(data, targetStart, sourceStart, sourceStart + width * 4);
  }
  return Object.freeze({ data, info: Object.freeze({ height, width }) });
}

function overlaySeamMetric(image, orientation, seamPixel) {
  if (!Number.isSafeInteger(seamPixel) || seamPixel <= 0) return null;
  if (orientation === "vertical" && image.info.width === seamPixel * 2) {
    return seamMetric(
      rawRegion(image, {
        height: image.info.height, left: 0, top: 0, width: seamPixel,
      }),
      rawRegion(image, {
        height: image.info.height, left: seamPixel, top: 0, width: seamPixel,
      }),
      orientation,
    );
  }
  if (orientation === "horizontal" && image.info.height === seamPixel * 2) {
    return seamMetric(
      rawRegion(image, {
        height: seamPixel, left: 0, top: 0, width: image.info.width,
      }),
      rawRegion(image, {
        height: seamPixel, left: 0, top: seamPixel, width: image.info.width,
      }),
      orientation,
    );
  }
  return null;
}

export async function auditNativeStaticFidelity({ manifest, root }) {
  const tileMetrics = [];
  const candidateImages = new Map();
  const provenanceFailures = [];
  const expectedTileIds = [
    "r0-c2", "r0-c3", "r1-c2", "r1-c3",
    "r2-c0", "r2-c1", "r2-c2", "r2-c3",
    "r3-c0", "r3-c1", "r3-c2", "r3-c3",
  ];
  if (
    manifest?.schemaVersion !== 1
    || manifest?.id !== "career-world/capitals/ninjaone/native-detail@r2"
    || manifest?.registration?.artboard?.join(",") !== ARTBOARD.join(",")
    || manifest?.registration?.runtimeTileDimensions?.join(",")
      !== TILE_DIMENSIONS.join(",")
    || manifest?.registration?.tileArtboard?.join(",") !== "360,270"
    || manifest?.budgets?.maximumAnimatedNodes
      !== NINJAONE_MVP_LIMITS.maximumSupplementalNodes
    || manifest?.budgets?.maximumDecodedBytes
      !== NINJAONE_MVP_LIMITS.maximumDecodedBytes
    || manifest?.budgets?.maximumMountedTerrainTiles
      !== NINJAONE_MVP_LIMITS.maximumTerrainTiles
    || manifest?.budgets?.maximumMountedVoidMasks !== 0
    || manifest?.tiles?.map(({ id }) => id).join(",") !== expectedTileIds.join(",")
    || manifest?.voidMasks?.derivation?.alphaRamp
      !== "distance-graded-rendered-ocean-color-cap-v4"
    || manifest?.voidMasks?.derivation?.connectivity !== 4
    || manifest?.voidMasks?.derivation?.contourAntialiasing
      !== "tent-3x3-land-occupancy-alpha-downsample-v1"
    || manifest?.voidMasks?.derivation?.contourKernel?.join(",") !== "1,2,1"
    || manifest?.voidMasks?.derivation?.distanceAlphaCeilings?.join(",")
      !== "192,240"
    || manifest?.voidMasks?.derivation?.landSideFalloffConnectivity !== 8
    || manifest?.voidMasks?.derivation?.landSideFalloffWidthPixels !== 2
    || manifest?.voidMasks?.derivation?.luminanceWeights256?.join(",")
      !== "54,183,19"
    || manifest?.voidMasks?.derivation?.maximumCompositeLuminanceDrop !== 4
    || manifest?.voidMasks?.derivation?.maximumRenderedChannelDeltaByDistance
      ?.join(",") !== "12,24"
    || manifest?.voidMasks?.derivation?.maximumRenderedOklabDeltaMilliByDistance
      ?.join(",") !== "25,50"
    || manifest?.voidMasks?.derivation?.nearBlackMaximumRgb !== 16
    || manifest?.voidMasks?.derivation?.opaqueAtMaximumRgb !== 64
    || manifest?.voidMasks?.derivation?.minimumLandSideAlpha !== 1
    || manifest?.voidMasks?.derivation?.representativeOceanRgb?.join(",")
      !== "32,82,96"
    || manifest?.voidMasks?.derivation?.seed !== "all-source-edges"
  ) provenanceFailures.push("manifest_contract");
  const maskById = new Map(
    (manifest?.voidMasks?.resources ?? []).map((resource) => [resource.id, resource]),
  );
  for (const tile of manifest.tiles) {
    const expectedSourcePath = `${NINJAONE_MVP_NATIVE_SOURCE_PREFIX}${tile.id}-generated-r2.png`;
    const expectedCrop = [0, 0, ...TILE_DIMENSIONS];
    const sourcePath = resolveRepoAsset(root, tile.sourcePath);
    const candidatePath = resolveRepoAsset(root, tile.path);
    const [source, candidate, sourceSha256, candidateSha256] = await Promise.all([
      readDecodedRgba(sourcePath),
      readDecodedRgba(candidatePath),
      fileSha256(sourcePath),
      fileSha256(candidatePath),
    ]);
    const expectedReference = {
      data: Buffer.from(source.data),
      info: source.info,
    };
    const maskResource = tile.voidMaskId ? maskById.get(tile.voidMaskId) : null;
    let maskSha256 = null;
    if (maskResource) {
      const maskPath = resolveRepoAsset(root, maskResource.path);
      const [mask, maskHash] = await Promise.all([
        sharp(maskPath, { failOn: "error" }).raw().toBuffer({ resolveWithObject: true }),
        fileSha256(maskPath),
      ]);
      maskSha256 = maskHash;
      if (
        mask.info.width !== TILE_DIMENSIONS[0]
        || mask.info.height !== TILE_DIMENSIONS[1]
      ) provenanceFailures.push(`${tile.id}:mask_dimensions`);
      for (let pixel = 0; pixel < source.info.width * source.info.height; pixel += 1) {
        expectedReference.data[pixel * 4 + 3] = mask.data[pixel * mask.info.channels];
      }
    }
    if (
      tile.sourcePath !== expectedSourcePath
      || NINJAONE_MVP_BANNED_FIDELITY_SOURCES.some((name) => (
        tile.sourcePath.includes(name)
      ))
      || tile.sourceDimensions.join(",") !== TILE_DIMENSIONS.join(",")
      || tile.sourceCrop?.join(",") !== expectedCrop.join(",")
      || tile.dimensions?.join(",") !== TILE_DIMENSIONS.join(",")
      || tile.artboardBounds?.origin?.join(",")
        !== `${tile.column * 360},${tile.row * 270}`
      || tile.artboardBounds?.span?.join(",") !== "360,270"
      || tile.id !== `r${tile.row}-c${tile.column}`
      || tile.decodedBytes !== TILE_DIMENSIONS[0] * TILE_DIMENSIONS[1] * 4
      || sourceSha256 !== tile.sourceSha256
      || candidateSha256 !== tile.sha256
      || decodedRgbSha256(candidate) !== tile.decodedRgbSha256
      || Boolean(maskResource) !== Boolean(tile.voidMaskId)
      || (maskResource && (
        maskResource.tileId !== tile.id
        || maskResource.sourcePath !== tile.sourcePath
        || maskResource.sourceSha256 !== tile.sourceSha256
        || maskResource.runtimeMounted !== false
        || maskResource.runtimeDecodedBytes !== 0
        || maskResource.storageFormat !== "png-grayscale-8"
        || maskResource.boundaryPixelsExceedingCompositeLuminanceDrop !== 0
        || maskResource.boundaryPixelsExceedingRenderedColorDelta !== 0
        || maskResource.contourCoveragePixelsByDistance?.join(",")
          !== maskResource.falloffPixelsByDistance?.join(",")
        || maskResource.falloffPixels !== maskResource.featheredPixels
        || maskResource.boundaryPixels !== maskResource.falloffPixels
          + maskResource.fullyOpaqueBoundaryPixels
        || maskResource.falloffPixelsByDistance?.reduce((sum, count) => sum + count, 0)
          !== maskResource.falloffPixels
        || maskResource.fullyOpaqueFalloffPixelsByDistance?.join(",") !== "0,0"
        || maskResource.maximumAlphaByDistance?.some((alpha, index) => (
          alpha > manifest.voidMasks.derivation.distanceAlphaCeilings[index]
        ))
        || maskResource.maximumContourCoverageAlphaByDistance?.some((alpha) => (
          alpha < 1 || alpha > 255
        ))
        || maskResource.minimumAlphaByDistance?.some((alpha) => alpha < 1)
        || maskResource.minimumContourCoverageAlphaByDistance?.some((alpha) => (
          alpha < 1 || alpha > 255
        ))
        || maskResource.partialContourCoveragePixelsByDistance?.some((count, index) => (
          count < 0 || count > maskResource.contourCoveragePixelsByDistance[index]
        ))
        || maskResource.maximumRenderedChannelDeltaByDistance?.some((delta, index) => (
          delta > manifest.voidMasks.derivation.maximumRenderedChannelDeltaByDistance[index]
        ))
        || maskResource.maximumRenderedOklabDeltaMilliByDistance?.some((delta, index) => (
          delta > manifest.voidMasks.derivation
            .maximumRenderedOklabDeltaMilliByDistance[index]
        ))
        || maskResource.minimumPartialAlpha
          !== manifest.voidMasks.derivation.minimumLandSideAlpha
        || maskResource.maximumPartialAlpha >= 255
        || maskResource.transparentFalloffPixels !== 0
        || maskResource.maximumBoundaryCompositeLuminanceDrop256
          > manifest.voidMasks.derivation.maximumCompositeLuminanceDrop * 256
        || maskResource.maximumPartialCompositeLuminanceDrop256
          > manifest.voidMasks.derivation.maximumCompositeLuminanceDrop * 256
        || maskSha256 !== maskResource.sha256
      ))
      || (!maskResource && candidateSha256 !== sourceSha256)
    ) provenanceFailures.push(tile.id);
    candidateImages.set(tile.id, candidate);
    tileMetrics.push(Object.freeze({
      id: tile.id,
      sourcePath: tile.sourcePath,
      voidMaskId: tile.voidMaskId,
      ...auditTilePixels(candidate, expectedReference),
    }));
  }

  const tileByPosition = new Map(
    manifest.tiles.map((tile) => [`${tile.row}:${tile.column}`, tile]),
  );
  const seamMetrics = [];
  for (const tile of manifest.tiles) {
    for (const [orientation, neighbor] of [
      ["vertical", tileByPosition.get(`${tile.row}:${tile.column + 1}`)],
      ["horizontal", tileByPosition.get(`${tile.row + 1}:${tile.column}`)],
    ]) {
      if (!neighbor) continue;
      seamMetrics.push(Object.freeze({
        first: tile.id,
        orientation,
        second: neighbor.id,
        ...seamMetric(
          candidateImages.get(tile.id), candidateImages.get(neighbor.id), orientation,
        ),
      }));
    }
  }

  const c1Ids = new Set(["r0-c2", "r0-c3", "r1-c2", "r1-c3"]);
  const c1Tiles = tileMetrics.filter(({ id }) => c1Ids.has(id));
  const seamGate = Object.freeze({
    coastTransitionRequired: Object.freeze(
      seamMetrics.filter((metric) => (
        !metric.pass && c1Ids.has(metric.first) && c1Ids.has(metric.second)
      )),
    ),
    nonCoastFailures: Object.freeze(
      seamMetrics.filter((metric) => (
        !metric.pass && !(c1Ids.has(metric.first) && c1Ids.has(metric.second))
      )),
    ),
    pass: seamMetrics.every((metric) => (
      metric.pass || (c1Ids.has(metric.first) && c1Ids.has(metric.second))
    )),
  });
  const c1VoidMask = Object.freeze({
    integration: manifest?.voidMasks?.integration,
    maskCount: maskById.size,
    maximumMountedMasks: manifest?.budgets?.maximumMountedVoidMasks,
    pass: manifest?.voidMasks?.integration === "baked-runtime-alpha"
      && manifest?.budgets?.maximumMountedVoidMasks === 0
      && maskById.size === c1Ids.size
      && c1Tiles.every(({ exactPixelPct, voidMaskId }) => (
        exactPixelPct === 100 && typeof voidMaskId === "string"
      )),
    tileIds: Object.freeze([...c1Ids]),
  });
  const pass = provenanceFailures.length === 0
    && tileMetrics.every((metric) => metric.pass)
    && c1VoidMask.pass
    && seamGate.pass;
  return Object.freeze({
    c1VoidMask,
    pass,
    provenance: Object.freeze({
      bannedSources: NINJAONE_MVP_BANNED_FIDELITY_SOURCES,
      failures: Object.freeze(provenanceFailures),
      nativeSourcePrefix: NINJAONE_MVP_NATIVE_SOURCE_PREFIX,
      pass: provenanceFailures.length === 0,
    }),
    seamGate,
    seams: Object.freeze(seamMetrics),
    tiles: Object.freeze(tileMetrics),
  });
}

function alphaBoundaryRun(image) {
  const { data, info: { height, width } } = image;
  const boundary = new Uint8Array(width * height);
  const present = (x, y) => (
    x >= 0 && x < width && y >= 0 && y < height
    && data[(y * width + x) * 4 + 3] >= ALPHA_PRESENT
  );
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!present(x, y)) continue;
      if (
        !present(x - 1, y) || !present(x + 1, y)
        || !present(x, y - 1) || !present(x, y + 1)
      ) boundary[y * width + x] = 1;
    }
  }
  let longest = 0;
  for (let y = 0; y < height; y += 1) {
    let run = 0;
    for (let x = 0; x < width; x += 1) {
      run = boundary[y * width + x] ? run + 1 : 0;
      longest = Math.max(longest, run);
    }
  }
  for (let x = 0; x < width; x += 1) {
    let run = 0;
    for (let y = 0; y < height; y += 1) {
      run = boundary[y * width + x] ? run + 1 : 0;
      longest = Math.max(longest, run);
    }
  }
  return longest;
}

function compositeRgbaOver(foreground, background) {
  if (
    foreground.info.width !== background.info.width
    || foreground.info.height !== background.info.height
  ) throw new TypeError("Overlay comparison dimensions do not match.");
  const data = Buffer.alloc(foreground.data.length);
  for (let index = 0; index < data.length; index += 4) {
    const foregroundAlpha = foreground.data[index + 3];
    const backgroundAlpha = background.data[index + 3];
    const inverseForegroundAlpha = 255 - foregroundAlpha;
    const outputAlphaNumerator = foregroundAlpha * 255
      + backgroundAlpha * inverseForegroundAlpha;
    for (let channel = 0; channel < 3; channel += 1) {
      data[index + channel] = outputAlphaNumerator === 0
        ? 0
        : Math.round((
            foreground.data[index + channel] * foregroundAlpha * 255
            + background.data[index + channel] * backgroundAlpha
              * inverseForegroundAlpha
          ) / outputAlphaNumerator);
    }
    data[index + 3] = Math.round(outputAlphaNumerator / 255);
  }
  return Object.freeze({ data, info: foreground.info });
}

export async function auditIntegrationOverlays({ manifests, root }) {
  const resourceMetrics = [];
  for (const manifest of manifests) {
    for (const resource of manifest.resources ?? []) {
      const overlayPath = resolveRepoAsset(root, resource.path);
      const candidate = await readRgba(overlayPath);
      const sourcePaths = resource.sourcePaths
        ?? (resource.sourcePath ? [resource.sourcePath] : []);
      const sourceStrips = Array.isArray(resource.sourceStrips)
        ? resource.sourceStrips
        : [];
      const sourceHashChecks = await Promise.all(sourcePaths.map(async (sourcePath) => {
        const strip = sourceStrips.find((candidateStrip) => (
          candidateStrip.sourcePath === sourcePath
          && typeof candidateStrip.sourceSha256 === "string"
        ));
        if (!strip) return false;
        try {
          return await fileSha256(resolveRepoAsset(root, sourcePath))
            === strip.sourceSha256;
        } catch {
          return false;
        }
      }));
      const sourceCropPass = sourceStrips.length >= sourcePaths.length
        && sourceStrips.every(({ crop, sourcePath, sourceSha256 }) => (
          sourcePaths.includes(sourcePath)
          && typeof sourceSha256 === "string"
          && Array.isArray(crop)
          && crop.length === 4
          && crop.every(Number.isSafeInteger)
          && crop[0] >= 0
          && crop[1] >= 0
          && crop[2] > 0
          && crop[3] > 0
          && crop[0] + crop[2] <= resource.sourceDimensions?.[0]
          && crop[1] + crop[3] <= resource.sourceDimensions?.[1]
        ));
      const provenancePass = sourcePaths.length > 0
        && sourcePaths.every((sourcePath) => (
          sourcePath.startsWith(NINJAONE_MVP_NATIVE_SOURCE_PREFIX)
          && !NINJAONE_MVP_BANNED_FIDELITY_SOURCES.some((name) => (
            sourcePath.includes(name)
          ))
        ))
        && sourceHashChecks.every(Boolean)
        && sourceCropPass;
      const comparisonEvidence = resource.nativeOriginalComparison;
      let fidelity = null;
      let composedCandidate = null;
      if (
        comparisonEvidence?.referencePath
        && Array.isArray(comparisonEvidence.referenceCrop)
      ) {
        const [left, top, width, height] = comparisonEvidence.referenceCrop;
        const reference = await readRgba(
          resolveRepoAsset(root, comparisonEvidence.referencePath),
          { height, left, top, width },
        );
        composedCandidate = compositeRgbaOver(candidate, reference);
        fidelity = auditTilePixels(composedCandidate, reference);
      }
      const [resourceShaPass, comparisonShaPass] = await Promise.all([
        fileSha256(overlayPath).then(
          (hash) => hash === resource.sha256,
          () => false,
        ),
        comparisonEvidence?.referencePath
          ? fileSha256(resolveRepoAsset(root, comparisonEvidence.referencePath)).then(
              (hash) => hash === comparisonEvidence.referenceSha256,
              () => false,
            )
          : Promise.resolve(false),
      ]);
      const longestAlphaBoundaryRun = alphaBoundaryRun(candidate);
      const minimumDimension = Math.min(candidate.info.width, candidate.info.height);
      const nativeSeamManifest = manifest.id
        === "career-world/capitals/ninjaone/seam-integration@r2";
      const explicitlyTypedNativeSeam = nativeSeamManifest
        && resource.integrationType === "native-original-seam-integration";
      const narrowNativeSeamPass = explicitlyTypedNativeSeam
        && resource.minimumWidthPixels === 14
        && minimumDimension === 14;
      const minimumDimensionPass = minimumDimension >= 64 || narrowNativeSeamPass;
      const crossAxis = resource.orientation === "vertical"
        ? 0
        : resource.orientation === "horizontal"
          ? 1
          : null;
      const registeredCoordinate = Number.isFinite(resource.seamCoordinate)
        ? resource.seamCoordinate / 4
        : Number.NaN;
      const bounds = resource.artboardBounds;
      const seamRegistrationPass = !nativeSeamManifest || (
        crossAxis !== null
        && Number.isFinite(registeredCoordinate)
        && Array.isArray(bounds?.origin)
        && Array.isArray(bounds?.span)
        && bounds.origin.length === 2
        && bounds.span.length === 2
        && bounds.origin.every(Number.isFinite)
        && bounds.span.every((value) => Number.isFinite(value) && value > 0)
        && bounds.origin[crossAxis] <= registeredCoordinate
        && bounds.origin[crossAxis] + bounds.span[crossAxis] >= registeredCoordinate
      );
      const postSeamMetric = nativeSeamManifest
        ? overlaySeamMetric(
            composedCandidate ?? candidate,
            resource.orientation,
            resource.nativeSeamPixel,
          )
        : null;
      const topologyPass = !nativeSeamManifest || postSeamMetric?.pass === true;
      const registrationPass = candidate.info.width === resource.dimensions?.[0]
        && candidate.info.height === resource.dimensions?.[1]
        && resource.decodedBytes === candidate.info.width * candidate.info.height * 4
        && minimumDimensionPass
        && seamRegistrationPass;
      resourceMetrics.push(Object.freeze({
        comparisonEvidencePresent: fidelity !== null,
        detailEnergyRatio: fidelity?.detailEnergyRatio ?? null,
        detailPass: fidelity?.detailPass ?? false,
        fidelitySurface: composedCandidate
          ? "source-over-native-context"
          : "missing-native-context",
        id: resource.id,
        longestAlphaBoundaryRun,
        luminanceMedianDeltaPct: fidelity?.luminanceMedianDeltaPct ?? null,
        manifestId: manifest.id,
        minimumDimension,
        minimumDimensionPolicy: narrowNativeSeamPass
          ? "typed-native-seam-exact-14"
          : "generic-minimum-64",
        palettePass: fidelity?.palettePass ?? false,
        postSeamMetric,
        pass: registrationPass
          && provenancePass
          && resourceShaPass
          && comparisonShaPass
          && fidelity?.detailPass === true
          && fidelity?.palettePass === true
          && longestAlphaBoundaryRun <= 48
          && topologyPass,
        provenancePass,
        registrationPass,
        resourceShaPass,
        rgbMedianDelta: fidelity?.channelMedianDelta ?? null,
        topologyPass,
      }));
    }
  }
  return Object.freeze({
    pass: resourceMetrics.every(({ pass }) => pass),
    resources: Object.freeze(resourceMetrics),
  });
}

export function auditNativeSeamCoverage({
  manifests,
  nativeManifest,
  seamMetrics,
}) {
  const tileById = new Map(
    nativeManifest.tiles.map((tile) => [tile.id, tile]),
  );
  const overlayResources = manifests.flatMap((manifest) => (
    manifest.resources ?? []
  ));
  const defects = [];
  for (const seam of seamMetrics.filter(({ pass }) => !pass)) {
    const first = tileById.get(seam.first);
    const second = tileById.get(seam.second);
    if (!first || !second) continue;
    const coordinate = seam.orientation === "vertical"
      ? Math.max(first.artboardBounds.origin[0], second.artboardBounds.origin[0])
      : Math.max(first.artboardBounds.origin[1], second.artboardBounds.origin[1]);
    const crossAxis = seam.orientation === "vertical" ? 0 : 1;
    const alongAxis = crossAxis === 0 ? 1 : 0;
    const segmentStart = Math.max(
      first.artboardBounds.origin[alongAxis],
      second.artboardBounds.origin[alongAxis],
    );
    const segmentEnd = Math.min(
      first.artboardBounds.origin[alongAxis] + first.artboardBounds.span[alongAxis],
      second.artboardBounds.origin[alongAxis] + second.artboardBounds.span[alongAxis],
    );
    const repairResources = overlayResources.filter((resource) => {
      const bounds = resource.artboardBounds;
      if (
        !bounds
        || resource.orientation !== seam.orientation
        || !Number.isFinite(resource.seamCoordinate)
      ) return false;
      const registeredCoordinate = resource.seamCoordinate / 4;
      return Math.abs(registeredCoordinate - coordinate) <= 1e-9
        && bounds.origin[crossAxis] <= coordinate
        && bounds.origin[crossAxis] + bounds.span[crossAxis] >= coordinate
        && bounds.origin[alongAxis] <= segmentStart
        && bounds.origin[alongAxis] + bounds.span[alongAxis] >= segmentEnd;
    });
    defects.push(Object.freeze({
      coordinate,
      first: seam.first,
      orientation: seam.orientation,
      pass: repairResources.length > 0,
      repairResourceIds: Object.freeze(
        repairResources.map(({ id }) => id).sort(),
      ),
      second: seam.second,
      segment: Object.freeze([segmentStart, segmentEnd]),
      sourceDiscontinuityRatio: seam.discontinuityRatio,
    }));
  }
  return Object.freeze({
    defects: Object.freeze(defects),
    pass: defects.length > 0 && defects.every(({ pass }) => pass),
  });
}

function sameCamera(actual, expected) {
  return ["origin", "span"].every((field) => (
    Array.isArray(actual?.[field])
    && actual[field].length === 2
    && actual[field].every((value, index) => (
      Math.abs(value - expected[field][index]) <= 1e-9
    ))
  ));
}

async function imageFrameStats(file) {
  const { data, info } = await sharp(file).removeAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  let count = 0;
  let greenDominant = 0;
  let sum = 0;
  let sumSquares = 0;
  for (let index = 0; index < data.length; index += 3 * 16) {
    const value = luma(data[index], data[index + 1], data[index + 2]);
    sum += value;
    sumSquares += value * value;
    count += 1;
    if (
      data[index + 1] > 48
      && data[index + 1] > data[index] * 1.2
      && data[index + 1] > data[index + 2] * 1.2
    ) greenDominant += 1;
  }
  const mean = sum / count;
  const standardDeviation = Math.sqrt(Math.max(0, sumSquares / count - mean ** 2));
  return Object.freeze({
    flatGreen: standardDeviation < 8 && greenDominant / count > 0.8,
    height: info.height,
    luminanceMean: round(mean),
    luminanceStandardDeviation: round(standardDeviation),
    pass: standardDeviation >= 3
      && !(standardDeviation < 8 && greenDominant / count > 0.8),
    sampledGreenDominantPct: round(greenDominant / count * 100),
    width: info.width,
  });
}

export function createNinjaOneEnvironmentMvpResourceCatalog({
  nativeManifest,
  supplementalManifests = [],
}) {
  const catalog = {};
  const add = (resource, kind, metadata = {}) => {
    const dimensions = resource?.dimensions;
    const decodedBytesValue = resource?.decodedBytes
      ?? (Array.isArray(dimensions) && dimensions.length === 2
        ? dimensions[0] * dimensions[1] * 4
        : Number.NaN);
    if (
      typeof resource?.id !== "string"
      || resource.id.length === 0
      || !Number.isSafeInteger(decodedBytesValue)
      || decodedBytesValue <= 0
      || catalog[resource.id]
    ) {
      throw new TypeError(`Invalid or duplicate ${kind} resource ${resource?.id ?? "unknown"}.`);
    }
    catalog[resource.id] = Object.freeze({
      ...(resource.artboardBounds ? { artboardBounds: resource.artboardBounds } : {}),
      decodedBytes: decodedBytesValue,
      id: resource.id,
      kind,
      ...(typeof resource.path === "string" ? { path: resource.path } : {}),
      paintedNodeCount: kind === "supplemental"
        ? resourcePaintedNodeCount(resource)
        : 1,
      ...(typeof resource.sha256 === "string" ? { sha256: resource.sha256 } : {}),
      ...metadata,
    });
  };
  for (const tile of nativeManifest?.tiles ?? []) add(tile, "terrain");
  for (const manifest of supplementalManifests) {
    const boundsByResourceId = new Map();
    const groupByResourceId = new Map();
    for (const instance of manifest?.instances ?? []) {
      const resourceIds = Array.isArray(instance.resourceIds)
        ? instance.resourceIds
        : instance.neutralizationResourceId && instance.canopyResourceId
          ? [instance.neutralizationResourceId, instance.canopyResourceId]
          : [instance.resourceId];
      for (const resourceId of resourceIds) {
        if (resourceId) {
          boundsByResourceId.set(resourceId, instance.artboardBounds);
          groupByResourceId.set(resourceId, instance.id);
        }
      }
    }
    const optionalGroup = Number.isFinite(
      manifest?.eligibility?.maxDetailRetainSpan,
    );
    const requiredPresentationKind = optionalGroup
      ? null
      : typeof manifest?.id === "string" && manifest.id.includes("seam-integration")
        ? "seam"
        : typeof manifest?.id === "string" && manifest.id.includes("coast-transition")
          ? "coast"
          : null;
    for (const resource of manifest?.resources ?? []) {
      add({
        ...resource,
        artboardBounds: resource.artboardBounds
          ?? boundsByResourceId.get(resource.id),
      }, "supplemental", {
        admissionPriority: optionalGroup ? "optional-group" : "required",
        groupId: groupByResourceId.get(resource.id) ?? resource.id,
        ...(requiredPresentationKind ? { requiredPresentationKind } : {}),
        ...(optionalGroup
          ? { maximumCameraSpan: manifest.eligibility.maxDetailRetainSpan }
          : {}),
      });
    }
  }
  return Object.freeze(catalog);
}

function sameStringSet(first, second) {
  return first.length === second.length
    && [...first].sort().every((value, index) => value === [...second].sort()[index]);
}

function resourcePaintedNodeCount(resource) {
  const tonalNodes = resource?.tonalTransition?.paintedNodeCount ?? 0;
  const count = resource?.paintedNodeCount ?? 1 + tonalNodes;
  if (!Number.isSafeInteger(count) || count <= 0) {
    throw new TypeError(`Resource ${resource?.id ?? "unknown"} has invalid painted nodes.`);
  }
  return count;
}

function resolveEvidencePath(evidenceDirectory, value) {
  return path.isAbsolute(value) ? value : path.resolve(evidenceDirectory, value);
}

async function registeredMaskedDifference(firstPath, secondPath, maskPath) {
  const [first, second, mask] = await Promise.all([
    readRgba(firstPath),
    readRgba(secondPath),
    readRgba(maskPath),
  ]);
  const dimensions = [first, second, mask].map(({ info }) => (
    `${info.width}x${info.height}`
  ));
  if (new Set(dimensions).size !== 1) {
    throw new Error("Registered masked-difference dimensions do not match.");
  }
  let changedInsideMask = 0;
  let changedOutsideMask = 0;
  let changedPixels = 0;
  let maskPixels = 0;
  for (let index = 0; index < first.data.length; index += 4) {
    const insideMask = mask.data[index + 3] >= ALPHA_PRESENT;
    if (insideMask) maskPixels += 1;
    const difference = (
      Math.abs(first.data[index] - second.data[index])
      + Math.abs(first.data[index + 1] - second.data[index + 1])
      + Math.abs(first.data[index + 2] - second.data[index + 2])
    ) / 3;
    if (difference < FRAME_DIFF_THRESHOLD) continue;
    changedPixels += 1;
    if (insideMask) changedInsideMask += 1;
    else changedOutsideMask += 1;
  }
  const totalPixels = first.info.width * first.info.height;
  const confinement = changedPixels === 0 ? 0 : changedInsideMask / changedPixels;
  return Object.freeze({
    changedInsideMask,
    changedOutsideMask,
    changedPixelPct: round(changedPixels / totalPixels * 100),
    changedPixels,
    confinementPct: round(confinement * 100),
    height: first.info.height,
    maskCoveragePct: round(maskPixels / totalPixels * 100),
    maskPixels,
    pass: changedPixels >= Math.max(256, Math.ceil(totalPixels * 0.001))
      && confinement >= 0.99
      && maskPixels > 0
      && maskPixels / totalPixels <= MAX_MOTION_MASK_COVERAGE,
    totalPixels,
    width: first.info.width,
  });
}

export async function auditFoliageIsolationEvidence({
  evidence,
  evidencePath,
  foliageManifest,
  referenceRoot = path.dirname(evidencePath),
}) {
  const failures = [];
  const evidenceDirectory = path.dirname(evidencePath);
  const expectedViewport = Object.freeze({ height: 900, width: 1440 });
  let producerUrl = null;
  try {
    producerUrl = new URL(evidence?.producer?.url);
  } catch {
    // Producer contract below reports the malformed URL.
  }
  if (
    evidence?.schemaVersion !== 1
    || evidence?.producer?.id !== NINJAONE_MVP_FOLIAGE_ISOLATION_PRODUCER_ID
    || evidence?.producer?.automation !== "browser-dom-screenshot"
    || evidence?.producer?.mode !== "foliage-isolation"
    || evidence?.producer?.scriptPath !== NINJAONE_MVP_CAPTURE_PRODUCER_PATH
    || evidence?.producer?.viewport?.width !== expectedViewport.width
    || evidence?.producer?.viewport?.height !== expectedViewport.height
    || !producerUrl
    || producerUrl.protocol !== "http:"
    || !new Set(["localhost", "127.0.0.1", "[::1]"]).has(producerUrl.hostname)
    || producerUrl.pathname !== "/"
    || producerUrl.searchParams.get("view") !== "ninjaone-capital-mvp"
    || !Number.isFinite(Date.parse(evidence?.producer?.capturedAt ?? ""))
  ) failures.push("foliage_isolation.producer_contract");
  try {
    const [scriptSha256, bindings] = await Promise.all([
      fileSha256(path.resolve(referenceRoot, NINJAONE_MVP_CAPTURE_PRODUCER_PATH)),
      createNinjaOneEnvironmentFoliageIsolationBindings(referenceRoot),
    ]);
    if (evidence?.producer?.scriptSha256 !== scriptSha256) {
      failures.push("foliage_isolation.producer_sha");
    }
    if (
      evidence?.bindings?.aggregateSha256 !== bindings.aggregateSha256
      || !sameStringSet(
        Object.keys(evidence?.bindings?.files ?? {}),
        Object.keys(bindings.files),
      )
      || evidence?.bindings?.cssBlock?.sha256 !== bindings.cssBlock.sha256
      || evidence?.bindings?.cssBlock?.bytes !== bindings.cssBlock.bytes
    ) failures.push("foliage_isolation.binding_contract");
    for (const [relativeFile, expectedSha256] of Object.entries(bindings.files)) {
      if (evidence?.bindings?.files?.[relativeFile] !== expectedSha256) {
        failures.push(`foliage_isolation.binding_sha.${relativeFile}`);
      }
    }
  } catch {
    failures.push("foliage_isolation.binding_unreadable");
  }
  if (!Array.isArray(evidence?.consoleErrors) || evidence.consoleErrors.length > 0) {
    failures.push("foliage_isolation.console_errors");
  }
  if (!Array.isArray(evidence?.networkErrors) || evidence.networkErrors.length > 0) {
    failures.push("foliage_isolation.network_errors");
  }

  const proof = evidence?.foliageProof;
  const expectedCamera = NINJAONE_MVP_FOLIAGE_CAMERA;
  if (!sameCamera(proof?.fixedCamera, expectedCamera)) {
    failures.push("foliage_isolation.camera_not_fixed_B1");
  }
  if (
    proof?.clip?.x !== 0
    || proof?.clip?.y !== 0
    || proof?.clip?.width !== expectedViewport.width
    || proof?.clip?.height !== expectedViewport.height
    || proof?.clip?.scale !== 1
  ) failures.push("foliage_isolation.full_viewport_missing");
  if (
    proof?.isolation?.cameraPreserved !== true
    || proof?.isolation?.terrain !== "preserved"
    || !proof?.isolation?.hud?.includes("header/footer visibility:hidden")
    || proof?.isolation?.water !== "visibility:hidden!important"
    || proof?.isolation?.seams !== "native additive layer contains zero seam nodes"
  ) failures.push("foliage_isolation.state_not_explicit");

  const expectedInstances = selectManifestFoliageInstances(expectedCamera, foliageManifest);
  const selectedInstanceIds = new Set(expectedInstances.map(({ id }) => id));
  const expectedInstanceIds = (proof?.rectangles ?? [])
    .map(({ id }) => id)
    .sort();
  if (
    expectedInstanceIds.length === 0
    || new Set(expectedInstanceIds).size !== expectedInstanceIds.length
    || expectedInstanceIds.some((id) => !selectedInstanceIds.has(id))
  ) failures.push("foliage_isolation.rectangle_registration");
  const expectedResourceIds = [...new Set(expectedInstances.map(
    ({ atlasResourceId }) => atlasResourceId,
  ))].sort();
  const foliageResourceMap = new Map(
    (foliageManifest?.resources ?? []).map((resource) => [resource.id, resource]),
  );
  const expectedFoliageBytes = expectedResourceIds.reduce(
    (total, id) => total + (foliageResourceMap.get(id)?.decodedBytes ?? 0),
    0,
  );
  const poolFoliageBytes = (foliageManifest?.resources ?? [])
    .reduce((total, resource) => total + resource.decodedBytes, 0);
  const runtime = proof?.runtime;
  if (
    expectedInstances.length === 0
    || expectedInstances.length > foliageManifest?.budgets?.maximumSelectedGroups
    || expectedResourceIds.length !== foliageManifest?.budgets?.uniqueTextureResources
    || poolFoliageBytes !== foliageManifest?.budgets?.foliageDecodedBytes
    || runtime?.nativeRenderMode !== "additive-only"
    || runtime?.terrainNodeCount !== 0
    || runtime?.seamNodeCount !== 0
    || runtime?.geologyNodeCount !== 1
    || !/^\/career-world\/capitals\/ninjaone\/environment\/plates\/geology\/ninjaone-environment-geology-close-r8\.webp\?v=[a-f0-9]+$/u.test(
      runtime?.geologySource ?? "",
    )
    || runtime?.foliageState !== "ready"
    || runtime?.foliageVisible !== true
    || runtime?.foliageInstanceCount !== expectedInstances.length
    || runtime?.foliageCanvasInstanceCount !== expectedInstances.length
    || runtime?.foliageMountedNodeCount !== expectedResourceIds.length
    || runtime?.foliageSelectedNodeCount !== expectedResourceIds.length
    || runtime?.foliageSelectedDecodedBytes !== expectedFoliageBytes
    || runtime?.foliageRenderer !== "webgl2-ready"
    || runtime?.foliageAnimationRunning !== true
    || !Number.isSafeInteger(runtime?.foliageCanvasWidth)
    || runtime.foliageCanvasWidth <= 0
    || !Number.isSafeInteger(runtime?.foliageCanvasHeight)
    || runtime.foliageCanvasHeight <= 0
    || !sameStringSet(runtime?.foliageMountedResourceIds ?? [], expectedResourceIds)
    || !sameStringSet(runtime?.foliageSelectedResourceIds ?? [], expectedResourceIds)
    || runtime?.legacyFoliageNodeCount !== 0
    || !Number.isSafeInteger(runtime?.cohortEpoch)
    || runtime.cohortEpoch < 1
    || typeof runtime?.cohortKey !== "string"
    || runtime.cohortKey.length === 0
  ) failures.push("foliage_isolation.runtime_contract");

  const normalFramePaths = Array.isArray(proof?.normalFrames)
    ? proof.normalFrames.map((value) => resolveEvidencePath(evidenceDirectory, value))
    : [];
  const forcedStates = Array.isArray(proof?.forcedStates) ? proof.forcedStates : [];
  const forcedFramePaths = forcedStates.map(({ imagePath }) => (
    resolveEvidencePath(evidenceDirectory, imagePath)
  ));
  const framePaths = [...normalFramePaths, ...forcedFramePaths];
  if (normalFramePaths.length !== 3 || forcedFramePaths.length !== 2) {
    failures.push("foliage_isolation.frame_sequence");
  }
  for (const [index, framePath] of framePaths.entries()) {
    try {
      const frame = await imageFrameStats(framePath);
      if (
        frame.width !== expectedViewport.width
        || frame.height !== expectedViewport.height
        || !frame.pass
      ) failures.push(`foliage_isolation.frame.${index}`);
    } catch {
      failures.push(`foliage_isolation.frame_unreadable.${index}`);
    }
  }
  const maskPath = proof?.maskPath
    ? resolveEvidencePath(evidenceDirectory, proof.maskPath)
    : null;
  let normalDifference = null;
  let forcedDifference = null;
  if (maskPath && normalFramePaths.length === 3 && forcedFramePaths.length === 2) {
    try {
      [normalDifference, forcedDifference] = await Promise.all([
        registeredMaskedDifference(
          normalFramePaths[0], normalFramePaths[2], maskPath,
        ),
        registeredMaskedDifference(
          forcedFramePaths[0], forcedFramePaths[1], maskPath,
        ),
      ]);
      for (const [id, metric, declared] of [
        ["normal", normalDifference, proof.normalMotionDiff],
        ["forced", forcedDifference, proof.forcedDiff],
      ]) {
        if (
          !metric.pass
          || metric.changedPixels !== declared?.changedPixels
          || metric.changedInsideMask !== declared?.changedInsideMask
          || metric.changedOutsideMask !== declared?.changedOutsideMask
          || metric.totalPixels !== declared?.totalPixels
        ) failures.push(`foliage_isolation.${id}_difference`);
      }
    } catch {
      failures.push("foliage_isolation.registered_difference_unreadable");
    }
  } else failures.push("foliage_isolation.mask_or_frames_missing");

  if (!Array.isArray(proof?.normalStates) || proof.normalStates.length !== 3) {
    failures.push("foliage_isolation.normal_state_sequence");
  } else {
    for (const [index, state] of proof.normalStates.entries()) {
      if (
        state?.renderer !== "webgl2-ready"
        || state?.animationRunning !== true
        || state?.captureTimeSeconds !== null
        || state?.instanceCount !== expectedInstances.length
        || state?.width !== runtime?.foliageCanvasWidth
        || state?.height !== runtime?.foliageCanvasHeight
      ) failures.push(`foliage_isolation.normal_state.${index}`);
    }
  }
  if (
    forcedStates.length !== 2
    || !sameStringSet(
      forcedStates.map(({ timeSeconds }) => String(timeSeconds)),
      ["0", "2.37"],
    )
  ) failures.push("foliage_isolation.forced_state_sequence");
  for (const state of forcedStates) {
    const renderer = state.rendererState;
    if (
      renderer?.renderer !== "webgl2-ready"
      || renderer?.animationRunning !== true
      || renderer?.captureTimeSeconds !== state.timeSeconds
      || renderer?.instanceCount !== expectedInstances.length
      || renderer?.width !== runtime?.foliageCanvasWidth
      || renderer?.height !== runtime?.foliageCanvasHeight
    ) failures.push(`foliage_isolation.forced_${state.timeSeconds}`);
  }

  const expectedFrameIds = [
    ...normalFramePaths.map((framePath) => path.basename(framePath, ".png")),
    ...forcedFramePaths.map((framePath) => path.basename(framePath, ".png")),
  ];
  const crops = Array.isArray(proof?.crops) ? proof.crops : [];
  const expectedCropKeys = expectedFrameIds.flatMap((frameId) => (
    expectedInstanceIds.map((groupId) => `${frameId}:${groupId}`)
  ));
  const actualCropKeys = crops.map(({ frameId, groupId }) => `${frameId}:${groupId}`);
  if (!sameStringSet(actualCropKeys, expectedCropKeys)) {
    failures.push("foliage_isolation.crop_registration");
  }
  for (const [index, crop] of crops.entries()) {
    const bounds = crop?.bounds;
    if (
      crop?.resampling !== "none-native-screenshot-pixels"
      || !bounds
      || ![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isSafeInteger)
      || bounds.x < 0
      || bounds.y < 0
      || bounds.width <= 0
      || bounds.height <= 0
      || bounds.x + bounds.width > expectedViewport.width
      || bounds.y + bounds.height > expectedViewport.height
    ) {
      failures.push(`foliage_isolation.crop_bounds.${index}`);
      continue;
    }
    try {
      const metadata = await sharp(
        resolveEvidencePath(evidenceDirectory, crop.imagePath),
      ).metadata();
      if (metadata.width !== bounds.width || metadata.height !== bounds.height) {
        failures.push(`foliage_isolation.crop_dimensions.${index}`);
      }
    } catch {
      failures.push(`foliage_isolation.crop_unreadable.${index}`);
    }
  }
  return Object.freeze({
    failures: Object.freeze([...new Set(failures)]),
    forcedDifference,
    normalDifference,
    pass: failures.length === 0,
  });
}

export async function auditFoliageIsolationSceneCrops({
  companion,
  companionPath,
  evidencePath,
  referenceRoot = path.dirname(companionPath),
}) {
  const failures = [];
  const companionDirectory = path.dirname(companionPath);
  const expectedClip = Object.freeze({ height: 193, left: 209, top: 112, width: 265 });
  const expectedFrameIds = [
    "normal-1", "normal-2", "normal-3", "forced-000", "forced-2370",
  ];
  const extractionScriptPath = "scripts/extract-ninjaone-foliage-isolation-crops.mjs";
  if (
    companion?.schemaVersion !== 1
    || companion?.producer?.id !== "ninjaone-foliage-isolation-scene-crop-r1"
    || companion?.producer?.scriptPath !== extractionScriptPath
    || !sameCamera(companion?.fixedCamera, NINJAONE_MVP_FOLIAGE_CAMERA)
  ) failures.push("foliage_scene_crops.contract");
  try {
    if (
      companion?.producer?.scriptSha256
        !== await fileSha256(path.resolve(referenceRoot, extractionScriptPath))
    ) failures.push("foliage_scene_crops.producer_sha");
  } catch {
    failures.push("foliage_scene_crops.producer_unreadable");
  }
  const declaredEvidencePath = companion?.evidencePath
    ? resolveEvidencePath(companionDirectory, companion.evidencePath)
    : null;
  try {
    if (
      !declaredEvidencePath
      || path.normalize(declaredEvidencePath) !== path.normalize(evidencePath)
      || companion?.evidenceSha256 !== await fileSha256(evidencePath)
    ) failures.push("foliage_scene_crops.evidence_binding");
  } catch {
    failures.push("foliage_scene_crops.evidence_unreadable");
  }
  const crops = Array.isArray(companion?.crops) ? companion.crops : [];
  if (
    crops.length !== expectedFrameIds.length
    || !sameStringSet(crops.map(({ frameId }) => frameId), expectedFrameIds)
  ) failures.push("foliage_scene_crops.sequence");
  for (const crop of crops) {
    const outputPath = crop?.imagePath
      ? resolveEvidencePath(companionDirectory, crop.imagePath)
      : null;
    const sourcePath = crop?.sourceImagePath
      ? resolveEvidencePath(companionDirectory, crop.sourceImagePath)
      : null;
    if (
      JSON.stringify(crop?.clip) !== JSON.stringify(expectedClip)
      || crop?.resampling !== "none-native-screenshot-pixels"
      || !outputPath
      || !sourcePath
    ) {
      failures.push(`foliage_scene_crops.${crop?.frameId ?? "unknown"}.registration`);
      continue;
    }
    try {
      const [outputSha256, sourceSha256, output, expected] = await Promise.all([
        fileSha256(outputPath),
        fileSha256(sourcePath),
        sharp(outputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
        sharp(sourcePath).extract(expectedClip).ensureAlpha().raw()
          .toBuffer({ resolveWithObject: true }),
      ]);
      if (
        outputSha256 !== crop.imageSha256
        || sourceSha256 !== crop.sourceImageSha256
        || output.info.width !== expectedClip.width
        || output.info.height !== expectedClip.height
        || expected.info.width !== expectedClip.width
        || expected.info.height !== expectedClip.height
        || !output.data.equals(expected.data)
      ) failures.push(`foliage_scene_crops.${crop.frameId}.pixel_exactness`);
    } catch {
      failures.push(`foliage_scene_crops.${crop?.frameId ?? "unknown"}.unreadable`);
    }
  }
  return Object.freeze({
    failures: Object.freeze([...new Set(failures)]),
    pass: failures.length === 0,
  });
}

function artboardCamera(camera) {
  return {
    origin: camera.origin.map((value, index) => (
      (value - ENVIRONMENT_ORIGIN[index]) / ENVIRONMENT_SPAN[index] * ARTBOARD[index]
    )),
    span: camera.span.map((value, index) => (
      value / ENVIRONMENT_SPAN[index] * ARTBOARD[index]
    )),
  };
}

function intersects(first, second) {
  return first.origin[0] < second.origin[0] + second.span[0]
    && first.origin[0] + first.span[0] > second.origin[0]
    && first.origin[1] < second.origin[1] + second.span[1]
    && first.origin[1] + first.span[1] > second.origin[1];
}

function distanceFromCamera(view, bounds) {
  const center = view.origin.map((value, index) => value + view.span[index] / 2);
  const itemCenter = bounds.origin.map((value, index) => value + bounds.span[index] / 2);
  return (center[0] - itemCenter[0]) ** 2 + (center[1] - itemCenter[1]) ** 2;
}

export function auditCameraDecodedBudgets({
  coastInstances = [],
  foliageInstances = [],
  foliageMaximumSpan = Number.POSITIVE_INFINITY,
  nativeManifest,
  seamInstances = [],
}) {
  if (
    typeof foliageMaximumSpan !== "number"
    || Number.isNaN(foliageMaximumSpan)
    || foliageMaximumSpan <= 0
  ) throw new TypeError("Foliage maximum span must be a positive number.");
  const cameras = [];
  const cameraKeys = new Set();
  const addCamera = (id, camera) => {
    const key = [...camera.origin, ...camera.span]
      .map((value) => value.toPrecision(15))
      .join("|");
    if (cameraKeys.has(key)) return;
    cameraKeys.add(key);
    cameras.push({ camera, id });
  };
  for (const [id, checkpoint] of Object.entries(NINJAONE_MVP_FIXED_CAMERAS)) {
    addCamera(`checkpoint-${id}`, checkpoint);
  }
  for (let x = 0.16; x <= 0.36; x += 0.00625) {
    for (let y = 0.04; y <= 0.3; y += 0.00625) {
      for (const span of NATIVE_BUDGET_SWEEP_SPANS) {
        addCamera(`sweep-${round(x, 5)}-${round(y, 5)}-${span}`, {
            origin: [x - span / 2, y - span / 2],
            span: [span, span],
        });
      }
    }
  }
  const selectionBounds = [
    ...(nativeManifest?.tiles ?? []),
    ...coastInstances,
    ...seamInstances,
    ...foliageInstances,
  ].map(({ artboardBounds }) => artboardBounds).filter(Boolean);
  const boundaryOrigins = (axis, viewSpan) => {
    const events = new Set([-viewSpan, ARTBOARD[axis]]);
    for (const bounds of selectionBounds) {
      events.add(bounds.origin[axis] - viewSpan);
      events.add(bounds.origin[axis] + bounds.span[axis]);
    }
    const ordered = [...events].sort((left, right) => left - right);
    const origins = new Set(ordered);
    for (let index = 1; index < ordered.length; index += 1) {
      origins.add((ordered[index - 1] + ordered[index]) / 2);
    }
    return [...origins].filter((origin) => (
      origin < ARTBOARD[axis] && origin + viewSpan > 0
    ));
  };
  for (const span of NATIVE_BUDGET_SWEEP_SPANS) {
    const viewSpan = ARTBOARD.map((size, axis) => (
      span / ENVIRONMENT_SPAN[axis] * size
    ));
    const xOrigins = boundaryOrigins(0, viewSpan[0]);
    const yOrigins = boundaryOrigins(1, viewSpan[1]);
    for (let xIndex = 0; xIndex < xOrigins.length; xIndex += 1) {
      for (let yIndex = 0; yIndex < yOrigins.length; yIndex += 1) {
        addCamera(`boundary-${span}-${xIndex}-${yIndex}`, {
          origin: [
            ENVIRONMENT_ORIGIN[0]
              + xOrigins[xIndex] / ARTBOARD[0] * ENVIRONMENT_SPAN[0],
            ENVIRONMENT_ORIGIN[1]
              + yOrigins[yIndex] / ARTBOARD[1] * ENVIRONMENT_SPAN[1],
          ],
          span: [span, span],
        });
      }
    }
  }

  let maximum = null;
  let tightestCoastAdmission = null;
  const checkpointSamples = [];
  const demandModeCounts = {
    "fresh-or-retained": 0,
    "retained-only": 0,
    released: 0,
  };
  const maximumByDemandMode = {};
  const violations = [];
  for (const { camera, id } of cameras) {
    const view = artboardCamera(camera);
    const visibleTerrain = nativeManifest.tiles
      .filter((tile) => intersects(view, tile.artboardBounds))
      .sort((left, right) => (
        distanceFromCamera(view, left.artboardBounds)
        - distanceFromCamera(view, right.artboardBounds)
        || left.id.localeCompare(right.id)
      ));
    const maximumCameraSpan = Math.max(...camera.span);
    const nativeDemandMode = maximumCameraSpan
      <= NINJAONE_MVP_CLOSE_ASSET_PRELOAD_MAXIMUM_CAMERA_SPAN
      ? "fresh-or-retained"
      : maximumCameraSpan <= NINJAONE_MVP_NATIVE_RELEASE_MAXIMUM_CAMERA_SPAN
        ? "retained-only"
        : "released";
    const nativeVisible = nativeDemandMode !== "released"
      && visibleTerrain.length > 0
      && visibleTerrain.length <= NINJAONE_MVP_LIMITS.maximumTerrainTiles;
    const terrain = nativeVisible ? visibleTerrain : [];
    const eligibleFoliageInstances = maximumCameraSpan <= foliageMaximumSpan
      ? foliageInstances
      : [];
    const orderedCoastSupplements = nativeVisible
      ? coastInstances
        .filter((instance) => intersects(view, instance.artboardBounds))
        .sort((left, right) => (
          distanceFromCamera(view, left.artboardBounds)
          - distanceFromCamera(view, right.artboardBounds)
          || left.id.localeCompare(right.id)
        ))
      : [];
    const orderedSeamSupplements = nativeVisible
      ? seamInstances
        .filter((instance) => intersects(view, instance.artboardBounds))
        .sort((left, right) => (
          distanceFromCamera(view, left.artboardBounds)
          - distanceFromCamera(view, right.artboardBounds)
          || left.id.localeCompare(right.id)
        ))
      : [];
    const orderedRequiredSupplements = [
      ...orderedCoastSupplements,
      ...orderedSeamSupplements,
    ];
    const orderedFoliageSupplements = nativeVisible
      ? eligibleFoliageInstances
        .filter((instance) => intersects(view, instance.artboardBounds))
        .sort((left, right) => (
          distanceFromCamera(view, left.artboardBounds)
          - distanceFromCamera(view, right.artboardBounds)
          || left.id.localeCompare(right.id)
        ))
      : [];
    const nodesFor = (instances) => instances.flatMap((instance) => {
      const resources = instance.resources ?? [instance.resource];
      if (Number.isInteger(instance.paintedNodeCount)) {
        return Array.from({ length: instance.paintedNodeCount }, (_, paintedIndex) => ({
          id: `${instance.id}:shared:${resources[0].id}:${paintedIndex}`,
          resource: resources[paintedIndex % resources.length],
        }));
      }
      return resources.flatMap((resource, resourceIndex) => (
        Array.from({ length: resourcePaintedNodeCount(resource) }, (_, paintedIndex) => ({
          id: `${instance.id}:${resourceIndex}:${resource.id}:${paintedIndex}`,
          resource,
        }))
      ));
    });
    const requiredSupplementalNodes = nodesFor(orderedRequiredSupplements);
    const coastSupplementalNodes = nodesFor(orderedCoastSupplements);
    const seamSupplementalNodes = nodesFor(orderedSeamSupplements);
    const uniqueResources = new Map(requiredSupplementalNodes.map(({ resource }) => (
      [resource.id, resource]
    )));
    const terrainBytes = terrain.reduce(
      (total, tile) => total + tile.dimensions[0] * tile.dimensions[1] * 4, 0,
    );
    const requiredSupplementalBytes = [...uniqueResources.values()].reduce(
      (total, resource) => total + (
        resource.decodedBytes ?? resource.dimensions[0] * resource.dimensions[1] * 4
      ), 0,
    );
    const seamResources = new Map(seamSupplementalNodes.map(({ resource }) => (
      [resource.id, resource]
    )));
    const seamDecodedBytes = [...seamResources.values()].reduce(
      (total, resource) => total + (
        resource.decodedBytes ?? resource.dimensions[0] * resource.dimensions[1] * 4
      ),
      0,
    );
    if (coastSupplementalNodes.length > 0) {
      const preCoastDecodedBytes = terrainBytes + seamDecodedBytes;
      const coastAdmission = Object.freeze({
        camera,
        coastNodeCount: coastSupplementalNodes.length,
        id,
        maximumCoastDecodedBytes:
          NINJAONE_MVP_LIMITS.maximumDecodedBytes - preCoastDecodedBytes,
        preCoastDecodedBytes,
        remainingSupplementalNodeSlotsAfterSelectedCoast:
          NINJAONE_MVP_LIMITS.maximumSupplementalNodes
            - seamSupplementalNodes.length - coastSupplementalNodes.length,
        seamDecodedBytes,
        seamResourceIds: Object.freeze(
          [...seamResources.keys()].sort(),
        ),
        terrainTileCount: terrain.length,
      });
      if (
        !tightestCoastAdmission
        || coastAdmission.maximumCoastDecodedBytes
          < tightestCoastAdmission.maximumCoastDecodedBytes
      ) tightestCoastAdmission = coastAdmission;
    }
    let decodedBytes = terrainBytes + requiredSupplementalBytes;
    let supplementalNodeCount = requiredSupplementalNodes.length;
    const admittedFoliageSupplements = [];
    for (const instance of orderedFoliageSupplements) {
      const groupNodes = nodesFor([instance]);
      const newResources = [...new Map(groupNodes
        .map(({ resource }) => [resource.id, resource]))
        .values()]
        .filter((resource) => !uniqueResources.has(resource.id));
      const incrementalBytes = newResources.reduce((total, resource) => total + (
        resource.decodedBytes ?? resource.dimensions[0] * resource.dimensions[1] * 4
      ), 0);
      if (
        supplementalNodeCount + groupNodes.length
          > NINJAONE_MVP_LIMITS.maximumSupplementalNodes
        || decodedBytes + incrementalBytes > NINJAONE_MVP_LIMITS.maximumDecodedBytes
      ) break;
      admittedFoliageSupplements.push(instance);
      supplementalNodeCount += groupNodes.length;
      decodedBytes += incrementalBytes;
      for (const resource of newResources) uniqueResources.set(resource.id, resource);
    }
    const supplementalBytes = [...uniqueResources.values()].reduce(
      (total, resource) => total + (
        resource.decodedBytes ?? resource.dimensions[0] * resource.dimensions[1] * 4
      ), 0,
    );
    const nativeApplicationOwnedDecodedBytes = terrainBytes + supplementalBytes;
    const sample = Object.freeze({
      camera,
      decodedBytes: nativeApplicationOwnedDecodedBytes,
      foliageGroupCount: admittedFoliageSupplements.length,
      fullyCovered: visibleTerrain.length <= NINJAONE_MVP_LIMITS.maximumTerrainTiles,
      id,
      nativeDemandMode,
      nativeVisible,
      nativeApplicationOwnedDecodedBytes,
      requiredDecodedBytes:
        terrainBytes + requiredSupplementalBytes,
      requiredSupplementalNodeCount: requiredSupplementalNodes.length,
      resourceIds: Object.freeze([...uniqueResources.values()].map(({ id }) => id).sort()),
      supplementalNodeCount,
      terrainTileCount: terrain.length,
    });
    demandModeCounts[nativeDemandMode] += 1;
    if (
      !maximumByDemandMode[nativeDemandMode]
      || sample.decodedBytes > maximumByDemandMode[nativeDemandMode].decodedBytes
    ) maximumByDemandMode[nativeDemandMode] = sample;
    if (!maximum || sample.decodedBytes > maximum.decodedBytes) maximum = sample;
    if (id.startsWith("checkpoint-")) checkpointSamples.push(sample);
    if (
      sample.decodedBytes > NINJAONE_MVP_LIMITS.maximumDecodedBytes
      || sample.requiredDecodedBytes > NINJAONE_MVP_LIMITS.maximumDecodedBytes
      || sample.terrainTileCount > NINJAONE_MVP_LIMITS.maximumTerrainTiles
      || sample.supplementalNodeCount > NINJAONE_MVP_LIMITS.maximumSupplementalNodes
      || sample.requiredSupplementalNodeCount
        > NINJAONE_MVP_LIMITS.maximumSupplementalNodes
    ) violations.push(sample);
  }
  return Object.freeze({
    checkpoints: Object.freeze(checkpointSamples),
    coastAdmission: tightestCoastAdmission,
    demandModeCounts: Object.freeze(demandModeCounts),
    maximum,
    maximumByDemandMode: Object.freeze(maximumByDemandMode),
    pass: violations.length === 0,
    sampleCount: cameras.length,
    violations: Object.freeze(violations),
  });
}
