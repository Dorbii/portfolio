import { createHash } from "node:crypto";
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

export const NINJAONE_MVP_NATIVE_SOURCE_PREFIX =
  "/art-source/career-world/ninjaone-environment/production-r2/detail-tiles-r2/generated/";
export const NINJAONE_MVP_CAPTURE_PRODUCER_ID =
  "ninjaone-environment-browser-capture-r1";
export const NINJAONE_MVP_CAPTURE_PRODUCER_PATH =
  "scripts/capture-ninjaone-environment-mvp.mjs";
export const NINJAONE_MVP_VERIFICATION_LIBRARY_PATH =
  "scripts/lib/ninjaone-environment-mvp-verification.mjs";
export const NINJAONE_MVP_FOLIAGE_ISOLATION_PRODUCER_ID =
  "ninjaone-environment-foliage-isolation-browser-capture-r1";
export const NINJAONE_MVP_FOLIAGE_ISOLATION_BINDING_PATHS = Object.freeze([
  NINJAONE_MVP_CAPTURE_PRODUCER_PATH,
  NINJAONE_MVP_VERIFICATION_LIBRARY_PATH,
  "app/page.tsx",
  "features/career-world/shared/camera.ts",
  "features/career-world/shared/lod/policy.ts",
  "features/career-world/composition/WorldScene.tsx",
  "features/career-world/development/NinjaOneEnvironmentProof.tsx",
  "features/career-world/development/NinjaOneEnvironmentNativeDetail.tsx",
  "features/career-world/development/NinjaOneEnvironmentFoliage.tsx",
  "features/career-world/development/model/ninjaOneEnvironmentFoliage.ts",
  "features/career-world/styles/career-world.css",
  "scripts/build-ninjaone-environment-foliage-r3.mjs",
  "public/career-world/capitals/ninjaone/environment/manifests/foliage-native-r3.json",
  "public/career-world/capitals/ninjaone/environment/shared/foliage-native-r3/c2-trail-conifer-native-neutralization-r3.png",
  "public/career-world/capitals/ninjaone/environment/shared/foliage-native-r3/c2-trail-conifer-native-canopy-r3.png",
  "public/career-world/capitals/ninjaone/environment/shared/foliage-native-r3/c2-stream-canopy-native-neutralization-r3.png",
  "public/career-world/capitals/ninjaone/environment/shared/foliage-native-r3/c2-stream-canopy-native-canopy-r3.png",
  "art-source/career-world/ninjaone-environment/production-r2/detail-tiles-r2/generated/r2-c2-generated-r2.png",
  "art-source/career-world/ninjaone-environment/production-r2/detail-tiles-r2/generated/r2-c3-generated-r2.png",
  "art-source/career-world/ninjaone-environment/production-r2/detail-tiles-r2/generated/r3-c2-generated-r2.png",
  "art-source/career-world/ninjaone-environment/production-r2/detail-tiles-r2/generated/r3-c3-generated-r2.png",
  "public/career-world/capitals/ninjaone/environment/tiles/close-native-r2/r2-c2-close-native-r2.png",
  "public/career-world/capitals/ninjaone/environment/tiles/close-native-r2/r2-c3-close-native-r2.png",
  "public/career-world/capitals/ninjaone/environment/tiles/close-native-r2/r3-c2-close-native-r2.png",
  "public/career-world/capitals/ninjaone/environment/tiles/close-native-r2/r3-c3-close-native-r2.png",
]);
export const NINJAONE_MVP_CAPTURE_BINDING_PATHS = Object.freeze([
  NINJAONE_MVP_CAPTURE_PRODUCER_PATH,
  NINJAONE_MVP_VERIFICATION_LIBRARY_PATH,
  "public/career-world/capitals/ninjaone/environment/manifests/native-detail-r2.json",
  "public/career-world/capitals/ninjaone/environment/manifests/foliage-native-r3.json",
  "features/career-world/development/model/ninjaOneEnvironmentNativeDetail.ts",
  "features/career-world/development/model/ninjaOneEnvironmentFoliage.ts",
  "features/career-world/development/model/ninjaOneEnvironmentResidency.ts",
  "features/career-world/development/NinjaOneEnvironmentNativeDetail.tsx",
  "features/career-world/development/NinjaOneEnvironmentFoliage.tsx",
  "features/career-world/development/NinjaOneEnvironmentProof.tsx",
  "features/career-world/shared/camera.ts",
  "features/career-world/shared/lod/policy.ts",
  "features/career-world/composition/WorldScene.tsx",
  "app/page.tsx",
  "public/career-world/capitals/ninjaone/environment/manifests/hydrology-native-r2.json",
  "features/career-world/layers/water-surface/components/WaterSurfaceCanvas.tsx",
  "features/career-world/layers/water-surface/rendering/WaterSurfaceRenderer.ts",
  "features/career-world/layers/water-surface/rendering/hydrology-runtime.ts",
  "features/career-world/styles/career-world.css",
  "features/career-world/development/NinjaOneEnvironmentCoastTransition.tsx",
  "features/career-world/development/NinjaOneEnvironmentSeamIntegration.tsx",
  "features/career-world/development/model/ninjaOneEnvironmentCoastTransition.ts",
  "features/career-world/development/model/ninjaOneEnvironmentSeamIntegration.ts",
  "public/career-world/capitals/ninjaone/environment/manifests/coast-transition-native-r2.json",
  "public/career-world/capitals/ninjaone/environment/manifests/seam-integration-native-r2.json",
  "scripts/build-ninjaone-environment-seam-integration-r2.mjs",
]);
export const NINJAONE_MVP_CAPTURE_BINDING_DIRECTORIES = Object.freeze([
  "art-source/career-world/ninjaone-environment/production-r2/detail-tiles-r2/generated",
  "features/career-world/layers/water-surface",
  "public/career-world/capitals/ninjaone/environment/masks/void-native-r2",
  "public/career-world/layers/water-surface",
  "public/career-world/capitals/ninjaone/environment/shared/foliage-native-r3",
  "public/career-world/capitals/ninjaone/environment/shared/coast-transition-native-r2",
  "public/career-world/capitals/ninjaone/environment/shared/seam-integration-native-r2",
  "public/career-world/capitals/ninjaone/environment/tiles/close-native-r2",
]);
export const NINJAONE_MVP_BANNED_FIDELITY_SOURCES = Object.freeze([
  "ninjaone-environment-terrain-master-detail-r2.png",
  "runtime-close-quilt-r3.png",
]);
export const NINJAONE_MVP_LIMITS = Object.freeze({
  maximumDecodedBytes: 32 * 1024 * 1024,
  maximumSupplementalNodes: 6,
  maximumTerrainTiles: 4,
});
export const NINJAONE_MVP_CLOSE_ASSET_PRELOAD_MAXIMUM_CAMERA_SPAN = 0.075;
export const NINJAONE_MVP_HYDROLOGY_MAXIMUM_CAMERA_SPAN =
  NINJAONE_MVP_CLOSE_ASSET_PRELOAD_MAXIMUM_CAMERA_SPAN;
export const NINJAONE_MVP_NATIVE_RELEASE_MAXIMUM_CAMERA_SPAN = 0.0875;
export const NINJAONE_MVP_WATER_TEXTURE_LIMITS = Object.freeze({
  budgetBytes: 288 * 1024 * 1024,
  constructorSharedBytes: 80_595_245,
  detailCoastDimensions: Object.freeze([6688, 3764]),
  detailWithoutHydrologyBytes: 250_700_205,
  directionalAlbedoDimensions: Object.freeze([3840, 2160]),
  foregroundWaterMode: "registered-overlay",
  hydrologyBudgetOwner: "native-application-union",
  initialSharedBytes: 80_595_245,
  replacedWorldCoastBytes: 8_391_211,
  steadyDetailBytes: 250_700_205,
  transientPeakBytes: 259_091_416,
});
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
export const NINJAONE_MVP_HYDROLOGY_BOUNDARY_TRANSITION = Object.freeze({
  fromCamera: Object.freeze({
    origin: Object.freeze([0.18, 0.1]),
    span: Object.freeze([0.074, 0.074]),
  }),
  fromRegionIds: Object.freeze(["B2", "C1"]),
  id: "hydrology-regional-boundary-b2-c1-to-b2",
  toCamera: Object.freeze({
    origin: Object.freeze([0.176, 0.12966666666666665]),
    span: Object.freeze([0.074, 0.074]),
  }),
  toRegionIds: Object.freeze(["B2"]),
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
  wildlife: "display:none!important",
});
export const NINJAONE_MVP_HYDROLOGY_OCCLUSION_ISOLATION = Object.freeze({
  foliage: "visibility:hidden!important",
  hud: "display:none!important",
  registeredForegroundWater: "visible-then-hidden",
  seamAndCoast: "visibility:hidden!important",
  terrain: "preserved",
  wildlife: "display:none!important",
});
export const NINJAONE_MVP_HYDROLOGY_FEATURE_ISOLATION = Object.freeze({
  composition: "terrain-supplements-and-registered-water-visible",
  hud: "display:none!important",
  nonWaterAnimation: "paused",
  wildlife: "display:none!important",
});
export const NINJAONE_MVP_HYDROLOGY_BOUNDARY_ISOLATION = Object.freeze({
  composition: "terrain-supplements-and-water-visible",
  hud: "display:none!important",
  nonWaterAnimation: "paused",
  wildlife: "display:none!important",
});
export const NINJAONE_MVP_HYDROLOGY_FEATURE_CAPTURES = Object.freeze([
  Object.freeze({
    camera: Object.freeze({
      origin: Object.freeze([0.21785, 0.18062]),
      span: Object.freeze([0.04, 0.04]),
    }),
    expectedTerrainTileCount: 2,
    id: "hydrology-B2-tarn",
    requiredStyleCounts: Object.freeze({
      obstacleWake: 543,
      whitewater: 2_219,
    }),
  }),
  Object.freeze({
    camera: Object.freeze({
      origin: Object.freeze([0.23694, 0.2337]),
      span: Object.freeze([0.04, 0.04]),
    }),
    expectedTerrainTileCount: 2,
    id: "hydrology-C2-rapid",
    requiredStyleCounts: Object.freeze({
      cascadeStage: 202,
      mist: 114,
      whitewater: 1_992,
    }),
  }),
]);

const ENVIRONMENT_ORIGIN = Object.freeze([0.125, 0]);
const ENVIRONMENT_SPAN = Object.freeze([0.25, 1 / 3]);
const ARTBOARD = Object.freeze([1440, 1080]);
const TILE_DIMENSIONS = Object.freeze([1448, 1086]);
const ALPHA_PRESENT = 16;
const FRAME_DIFF_THRESHOLD = 6;
const MAX_MOTION_MASK_COVERAGE = 0.25;
const MIN_FLOW_CORRELATION = 0.05;
const HYDROLOGY_SCREEN_MASK_DILATION_PIXELS = 0;
const NATIVE_BUDGET_SWEEP_SPANS = Object.freeze([
  0.04, 0.05, 0.055, 0.06, 0.061, 0.074, 0.075, 0.08, 0.0875, 0.09,
]);
const HYDROLOGY_AUXILIARY_CHANNELS = Object.freeze([
  "whitewater",
  "obstacleWake",
  "mist",
  "cascadeStage",
]);

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

export async function deriveNinjaOneHydrologyMotionContract({
  camera,
  clip,
  fieldTier = "detail",
  fieldResourceIds,
  manifest,
  root,
}) {
  const tier = manifest?.regionalFields?.tiers?.[fieldTier];
  const regions = manifest?.regionalFields?.regions;
  if (
    manifest?.schemaVersion !== 4
    || !tier
    || !Array.isArray(tier.fullFieldDimensions)
    || tier.fullFieldDimensions.length !== 2
    || !Array.isArray(tier.resources)
    || !Array.isArray(regions)
    || !camera?.origin
    || !camera?.span
    || !Number.isSafeInteger(clip?.width)
    || !Number.isSafeInteger(clip?.height)
  ) throw new TypeError("Hydrology motion contract inputs are invalid.");
  const intersectsWorldBounds = ({ origin, span }) => (
    camera.origin[0] < origin[0] + span[0]
    && camera.origin[0] + camera.span[0] > origin[0]
    && camera.origin[1] < origin[1] + span[1]
    && camera.origin[1] + camera.span[1] > origin[1]
  );
  const overlapArea = ({ origin, span }) => {
    const overlapWidth = Math.max(
      0,
      Math.min(camera.origin[0] + camera.span[0], origin[0] + span[0])
        - Math.max(camera.origin[0], origin[0]),
    );
    const overlapHeight = Math.max(
      0,
      Math.min(camera.origin[1] + camera.span[1], origin[1] + span[1])
        - Math.max(camera.origin[1], origin[1]),
    );
    return overlapWidth * overlapHeight;
  };
  const maximumMountedRegions = manifest.regionalFields.cohortPolicy.maximumMountedRegions;
  const intersectingRegions = regions.filter(({ worldBounds }) => (
    worldBounds && intersectsWorldBounds(worldBounds)
  ));
  const selectedRegionIds = fieldResourceIds === undefined
    ? intersectingRegions
      .map(({ id, worldBounds }) => ({ id, overlapArea: overlapArea(worldBounds) }))
      .sort((left, right) => (
        right.overlapArea - left.overlapArea || left.id.localeCompare(right.id)
      ))
      .slice(0, maximumMountedRegions)
      .map(({ id }) => id)
      .sort()
    : [...new Set(fieldResourceIds.map((resourceId) => {
      const resource = tier.resources.find(({ id }) => id === resourceId);
      if (!resource) throw new Error(`Unknown mounted hydrology resource ${resourceId}.`);
      return resource.regionId;
    }))].sort();
  const selectedResources = selectedRegionIds.map((regionId) => {
    const matches = tier.resources.filter((resource) => (
      resource.regionId === regionId
    ));
    if (matches.length !== 1) {
      throw new Error(`${fieldTier} hydrology region ${regionId} is not unique.`);
    }
    return matches[0];
  });
  if (
    selectedResources.length === 0
    || selectedResources.length
      > maximumMountedRegions
  ) throw new Error("Hydrology camera has an invalid regional cohort.");
  if (
    fieldResourceIds !== undefined
    && (
      !Array.isArray(fieldResourceIds)
      || fieldResourceIds.some((id) => typeof id !== "string")
      || !sameStringSet(
        fieldResourceIds,
        selectedResources.map(({ id }) => id),
      )
    )
  ) throw new Error("Mounted hydrology resources do not match the camera cohort.");
  const decodedResources = await Promise.all(selectedResources.map(async (resource) => {
    const image = await readDecodedRgba(resolveRepoAsset(root, resource.path));
    const expectedBytes = resource.dimensions[0] * resource.dimensions[1] * 4;
    const actualSha256 = await fileSha256(resolveRepoAsset(root, resource.path));
    if (
      image.info.width !== resource.dimensions[0]
      || image.info.height !== resource.dimensions[1]
      || resource.decodedBytes !== expectedBytes
      || actualSha256 !== resource.sha256
      || !Array.isArray(resource.fieldDimensions)
      || resource.fieldDimensions.length !== 2
      || image.info.width !== resource.fieldDimensions[0] * 2
      || image.info.height !== resource.fieldDimensions[1]
      || !Array.isArray(resource.sourceBounds)
      || resource.sourceBounds.length !== 4
      || resource.sourceBounds[2] - resource.sourceBounds[0] !== resource.fieldDimensions[0]
      || resource.sourceBounds[3] - resource.sourceBounds[1] !== resource.fieldDimensions[1]
    ) throw new Error(`${resource.id} does not match its regional manifest contract.`);
    return { image, resource };
  }));
  const [fieldWidth, fieldHeight] = tier.fullFieldDimensions;
  const worldOrigin = manifest.registration.worldOrigin;
  const worldSpan = manifest.registration.worldSpan;
  const left = Math.max(0, Math.floor(
    (camera.origin[0] - worldOrigin[0]) / worldSpan[0] * fieldWidth,
  ));
  const right = Math.min(fieldWidth, Math.ceil(
    (camera.origin[0] + camera.span[0] - worldOrigin[0])
      / worldSpan[0] * fieldWidth,
  ));
  const top = Math.max(0, Math.floor(
    (camera.origin[1] - worldOrigin[1]) / worldSpan[1] * fieldHeight,
  ));
  const bottom = Math.min(fieldHeight, Math.ceil(
    (camera.origin[1] + camera.span[1] - worldOrigin[1])
      / worldSpan[1] * fieldHeight,
  ));
  const width = right - left;
  const height = bottom - top;
  if (width <= 0 || height <= 0) throw new Error("Hydrology camera misses the field.");
  const directionalMask = Buffer.alloc(width * height * 4);
  const fullMask = Buffer.alloc(width * height * 4);
  let coveragePixels = 0;
  let directionalPixels = 0;
  let fieldFlowX = 0;
  let fieldFlowY = 0;
  const styleCounts = {};
  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      const decoded = decodedResources.find(({ resource }) => (
        x >= resource.sourceBounds[0]
        && x < resource.sourceBounds[2]
        && y >= resource.sourceBounds[1]
        && y < resource.sourceBounds[3]
      ));
      if (!decoded) continue;
      const sourceX = x - decoded.resource.sourceBounds[0];
      const sourceY = y - decoded.resource.sourceBounds[1];
      const source = (sourceY * decoded.image.info.width + sourceX) * 4;
      if (decoded.image.data[source] === 0) continue;
      coveragePixels += 1;
      const auxiliary = source + decoded.resource.fieldDimensions[0] * 4;
      HYDROLOGY_AUXILIARY_CHANNELS.forEach((name, channel) => {
        if (decoded.image.data[auxiliary + channel] > 0) {
          styleCounts[name] = (styleCounts[name] ?? 0) + 1;
        }
      });
      const target = ((y - top) * width + x - left) * 4;
      fullMask.fill(255, target, target + 4);
      const flowX = (decoded.image.data[source + 1] - 128) / 127;
      const flowY = (decoded.image.data[source + 2] - 128) / 127;
      const flowLength = Math.hypot(flowX, flowY);
      if (flowLength <= 0.1) continue;
      directionalPixels += 1;
      fieldFlowX += flowX / flowLength;
      fieldFlowY += flowY / flowLength;
      directionalMask.fill(255, target, target + 4);
    }
  }
  if (directionalPixels === 0) throw new Error("Hydrology capture has no directional pixels.");
  fieldFlowX /= directionalPixels;
  fieldFlowY /= directionalPixels;
  const screenX = fieldFlowX * clip.width / width;
  const screenY = fieldFlowY * clip.height / height;
  const screenLength = Math.hypot(screenX, screenY);
  const renderMask = (data) => {
    let pipeline = sharp(data, {
      raw: { channels: 4, height, width },
    }).resize(clip.width, clip.height, {
      fit: "fill",
      kernel: "nearest",
    });
    if (HYDROLOGY_SCREEN_MASK_DILATION_PIXELS > 0) {
      pipeline = pipeline.dilate(HYDROLOGY_SCREEN_MASK_DILATION_PIXELS);
    }
    return pipeline.png().toBuffer();
  };
  const [fullMaskPng, maskPng] = await Promise.all([
    renderMask(fullMask),
    renderMask(directionalMask),
  ]);
  return Object.freeze({
    coveragePixels,
    directionalPixels,
    fieldFlowVector: Object.freeze([fieldFlowX, fieldFlowY]),
    fieldPath: selectedResources.length === 1 ? selectedResources[0].path : null,
    fieldDecodedBytes: selectedResources.reduce(
      (total, resource) => total + resource.decodedBytes,
      0,
    ),
    fieldPaths: Object.freeze(selectedResources.map(({ path: value }) => value)),
    fieldResourceIds: Object.freeze(selectedResources.map(({ id }) => id)),
    fieldSha256: selectedResources.length === 1 ? selectedResources[0].sha256 : null,
    fieldSha256s: Object.freeze(selectedResources.map(({ sha256 }) => sha256)),
    fieldTier,
    flowVector: Object.freeze([screenX / screenLength, screenY / screenLength]),
    fullMaskPng,
    fullMaskSha256:
      createHash("sha256").update(fullMaskPng).digest("hex").toUpperCase(),
    maskPng,
    maskSha256: createHash("sha256").update(maskPng).digest("hex").toUpperCase(),
    screenMaskDilationPixels: HYDROLOGY_SCREEN_MASK_DILATION_PIXELS,
    sourceBounds: Object.freeze({ bottom, left, right, top }),
    styleCounts: Object.freeze(styleCounts),
  });
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

async function listBindingFiles(root, relativeDirectory) {
  const absoluteDirectory = path.resolve(root, relativeDirectory);
  const entries = await readdir(absoluteDirectory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const relativeEntry = `${relativeDirectory}/${entry.name}`.replaceAll("\\", "/");
    if (entry.isDirectory()) {
      files.push(...await listBindingFiles(root, relativeEntry));
    } else if (entry.isFile()) {
      files.push(relativeEntry);
    }
  }
  return files;
}

export async function createNinjaOneEnvironmentCaptureBindings(root) {
  const directoryFiles = (await Promise.all(
    NINJAONE_MVP_CAPTURE_BINDING_DIRECTORIES.map((directory) => (
      listBindingFiles(root, directory)
    )),
  )).flat();
  const relativeFiles = [...new Set([
    ...NINJAONE_MVP_CAPTURE_BINDING_PATHS,
    ...directoryFiles,
  ])].sort();
  const bindings = Object.freeze(Object.fromEntries(await Promise.all(
    relativeFiles.map(async (relativeFile) => [
      relativeFile,
      await fileSha256(path.resolve(root, relativeFile)),
    ]),
  )));
  const aggregateSha256 = createHash("sha256")
    .update(relativeFiles.map((relativeFile) => (
      `${relativeFile}\0${bindings[relativeFile]}\n`
    )).join(""))
    .digest("hex")
    .toUpperCase();
  return Object.freeze({ aggregateSha256, files: bindings });
}

export async function createNinjaOneEnvironmentFoliageIsolationBindings(root) {
  const runtimeBindings = await createNinjaOneEnvironmentCaptureBindings(root);
  const relativeFiles = [...new Set([
    ...Object.keys(runtimeBindings.files),
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
    "\n\n@keyframes ninjaone-environment-foliage-breeze",
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

function mipTextureBytes([width, height]) {
  return Math.ceil(width * height * 4 * 4 / 3);
}

export async function auditHydrologyRuntimeBudget({ manifest, root = process.cwd() }) {
  const directionalAlbedoBytes = mipTextureBytes(
    NINJAONE_MVP_WATER_TEXTURE_LIMITS.directionalAlbedoDimensions,
  );
  const detailCoastBytes = mipTextureBytes(
    NINJAONE_MVP_WATER_TEXTURE_LIMITS.detailCoastDimensions,
  );
  const transientPeakBytes = NINJAONE_MVP_WATER_TEXTURE_LIMITS.initialSharedBytes
    + directionalAlbedoBytes
    + detailCoastBytes;
  const steadyDetailBytes = transientPeakBytes
    - NINJAONE_MVP_WATER_TEXTURE_LIMITS.replacedWorldCoastBytes;
  const regionalFields = manifest?.regionalFields;
  const nativeUnion = manifest?.admission?.nativeApplicationOwnedUnion;
  const regionContracts = Array.isArray(regionalFields?.regions)
    ? regionalFields.regions
    : [];
  const cohortSets = new Map();
  for (const span of NATIVE_BUDGET_SWEEP_SPANS.filter((value) => (
    value <= NINJAONE_MVP_HYDROLOGY_MAXIMUM_CAMERA_SPAN
  ))) {
    const axisOrigins = (axis) => {
      const boundaries = regionContracts.flatMap(({ worldBounds }) => [
        worldBounds.origin[axis] - span,
        worldBounds.origin[axis] + worldBounds.span[axis],
      ]).sort((left, right) => left - right);
      return [...new Set([
        ...boundaries,
        ...boundaries.slice(1).map((value, index) => (
          (boundaries[index] + value) * 0.5
        )),
      ])];
    };
    for (const x of axisOrigins(0)) {
      for (const y of axisOrigins(1)) {
        const camera = { origin: [x, y], span: [span, span] };
        const maximumMountedRegions =
          regionalFields?.cohortPolicy?.maximumMountedRegions ?? 0;
        const ids = regionContracts.map(({ id, worldBounds }) => {
          const overlapWidth = Math.max(0, Math.min(
            camera.origin[0] + span,
            worldBounds.origin[0] + worldBounds.span[0],
          ) - Math.max(camera.origin[0], worldBounds.origin[0]));
          const overlapHeight = Math.max(0, Math.min(
            camera.origin[1] + span,
            worldBounds.origin[1] + worldBounds.span[1],
          ) - Math.max(camera.origin[1], worldBounds.origin[1]));
          return { id, overlapArea: overlapWidth * overlapHeight };
        }).filter(({ overlapArea }) => overlapArea > 0)
          .sort((left, right) => (
            right.overlapArea - left.overlapArea || left.id.localeCompare(right.id)
          ))
          .slice(0, maximumMountedRegions)
          .map(({ id }) => id)
          .sort();
        cohortSets.set(ids.join("+"), ids);
      }
    }
  }
  const expectedRegions = ["B2", "C1", "C2"];
  const tierAudits = {};
  for (const tierId of ["detail", "fallback"]) {
    const tier = regionalFields?.tiers?.[tierId];
    const resources = Array.isArray(tier?.resources) ? tier.resources : [];
    const resourceAudits = await Promise.all(resources.map(async (resource) => {
      const dimensions = resource?.dimensions ?? [];
      const fieldDimensions = resource?.fieldDimensions ?? [];
      const sourceBounds = resource?.sourceBounds ?? [];
      const decodedBytes = dimensions.length === 2
        ? dimensions[0] * dimensions[1] * 4
        : 0;
      const sha256 = typeof resource?.path === "string"
        ? await fileSha256(resolveRepoAsset(root, resource.path)).catch(() => null)
        : null;
      const pass = resource?.tier === tierId
        && expectedRegions.includes(resource?.regionId)
        && decodedBytes > 0
        && resource?.decodedBytes === decodedBytes
        && fieldDimensions.length === 2
        && dimensions[0] === fieldDimensions[0] * 2
        && dimensions[1] === fieldDimensions[1]
        && sourceBounds.length === 4
        && sourceBounds[2] - sourceBounds[0] === fieldDimensions[0]
        && sourceBounds[3] - sourceBounds[1] === fieldDimensions[1]
        && resource?.sha256 === sha256
        && new RegExp(
          `^/career-world/layers/water-surface/fields/ninjaone-hydrology-(b2|c1|c2)-${tierId}-r4\\.png\\?v=[a-f\\d]{12}$`,
        ).test(resource?.path ?? "")
        && !/hydrology-flow(?:-fallback)?-r2/.test(resource?.path ?? "");
      return Object.freeze({
        decodedBytes,
        id: resource?.id,
        pass,
        regionId: resource?.regionId,
        sha256,
      });
    }));
    const bytesByRegion = new Map(resources.map((resource) => [
      resource.regionId,
      resource.decodedBytes,
    ]));
    const maximumCohortDecodedBytes = Math.max(0, ...[...cohortSets.values()].map((ids) => (
      ids.reduce((total, id) => total + (bytesByRegion.get(id) ?? 0), 0)
    )));
    const decodedBytes = resources.reduce(
      (total, resource) => total + (resource.decodedBytes ?? 0),
      0,
    );
    tierAudits[tierId] = Object.freeze({
      decodedBytes,
      maximumCohortDecodedBytes,
      pass: resources.length === expectedRegions.length
        && sameStringSet(resources.map(({ regionId }) => regionId), expectedRegions)
        && resourceAudits.every(({ pass: resourcePass }) => resourcePass)
        && tier?.decodedBytes === decodedBytes
        && nativeUnion?.tiers?.[tierId]?.maximumCohortDecodedBytes
          === maximumCohortDecodedBytes,
      resources: Object.freeze(resourceAudits),
    });
  }
  const sourceManifestSha256 = manifest?.source?.path
    ? await fileSha256(resolveRepoAsset(root, manifest.source.path)).catch(() => null)
    : null;
  const sharedPool = manifest?.admission?.sharedWaterTexturePool;
  const authority = nativeUnion?.authority;
  const authorityConstituents = Array.isArray(authority?.constituents)
    ? authority.constituents
    : [];
  const authorityConstituentPasses = await Promise.all(
    authorityConstituents.map(async (constituent) => (
      typeof constituent?.path === "string"
      && typeof constituent?.sha256 === "string"
      && constituent.sha256
        === await fileSha256(resolveRepoAsset(root, constituent.path)).catch(() => null)
    )),
  );
  const fallbackWorstCohort = nativeUnion?.eventBounds?.fallbackWorstCohort;
  const fallbackBytesByRegion = new Map(
    (regionalFields?.tiers?.fallback?.resources ?? []).map((resource) => [
      resource.regionId,
      resource.decodedBytes,
    ]),
  );
  const fallbackWorstRegionIds = fallbackWorstCohort?.regionIds ?? [];
  const fallbackWorstCohortPass = fallbackWorstRegionIds.length > 0
    && fallbackWorstRegionIds.length
      <= (regionalFields?.cohortPolicy?.maximumMountedRegions ?? 0)
    && new Set(fallbackWorstRegionIds).size === fallbackWorstRegionIds.length
    && fallbackWorstRegionIds.every((id) => expectedRegions.includes(id))
    && fallbackWorstRegionIds.reduce(
      (total, id) => total + (fallbackBytesByRegion.get(id) ?? 0),
      0,
    ) === fallbackWorstCohort?.decodedBytes
    && fallbackWorstCohort?.decodedBytes
      === tierAudits.fallback.maximumCohortDecodedBytes;
  const pass = manifest?.schemaVersion === 4
    && manifest?.id === "career-world/capitals/ninjaone/hydrology-native@r2"
    && manifest?.field === undefined
    && manifest?.fallbackField === undefined
    && regionalFields?.cohortPolicy?.atomic === true
    && regionalFields?.cohortPolicy?.mixedTierAllowed === false
    && regionalFields?.cohortPolicy?.maximumMountedRegions === 2
    && regionalFields?.cohortPolicy?.sampling
      === "global-coordinate manual bilinear texelFetch with virtual-zero exterior"
    && sameStringSet(regionalFields?.cohortPolicy?.tierOrder ?? [], ["detail", "fallback"])
    && sameStringSet(regionContracts.map(({ id }) => id), expectedRegions)
    && tierAudits.detail.pass
    && tierAudits.fallback.pass
    && nativeUnion?.maximumDecodedBytes === NINJAONE_MVP_LIMITS.maximumDecodedBytes
    && fallbackWorstCohortPass
    && manifest?.source?.authority === "registered-terrain-master"
    && manifest?.source?.dimensions?.[0] === 5760
    && manifest?.source?.dimensions?.[1] === 4320
    && manifest?.source?.sha256 === sourceManifestSha256
    && authorityConstituents.length > 0
    && authorityConstituentPasses.every(Boolean)
    && /(?:provisional|frozen)/i.test(authority?.status ?? "")
    && sharedPool?.maximumDecodedBytes
      === NINJAONE_MVP_WATER_TEXTURE_LIMITS.budgetBytes
    && sharedPool?.steadyDecodedBytes
      === NINJAONE_MVP_WATER_TEXTURE_LIMITS.steadyDetailBytes
    && sharedPool?.transientPeakDecodedBytes
      === NINJAONE_MVP_WATER_TEXTURE_LIMITS.transientPeakBytes
    && sharedPool?.hydrologyDecodedBytes === 0
    && sharedPool?.ownership === "excludes-native-hydrology"
    && transientPeakBytes === NINJAONE_MVP_WATER_TEXTURE_LIMITS.transientPeakBytes
    && steadyDetailBytes === NINJAONE_MVP_WATER_TEXTURE_LIMITS.steadyDetailBytes
    && transientPeakBytes <= NINJAONE_MVP_WATER_TEXTURE_LIMITS.budgetBytes
    && steadyDetailBytes <= NINJAONE_MVP_WATER_TEXTURE_LIMITS.budgetBytes;
  return Object.freeze({
    budgetBytes: NINJAONE_MVP_WATER_TEXTURE_LIMITS.budgetBytes,
    detailCoastBytes,
    directionalAlbedoBytes,
    headroomBytes:
      NINJAONE_MVP_WATER_TEXTURE_LIMITS.budgetBytes - transientPeakBytes,
    initialSharedBytes: NINJAONE_MVP_WATER_TEXTURE_LIMITS.initialSharedBytes,
    maximumFallbackCohortDecodedBytes:
      tierAudits.fallback.maximumCohortDecodedBytes,
    pass,
    sourceManifestSha256,
    steadyDetailBytes,
    tiers: Object.freeze(tierAudits),
    transientPeakBytes,
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

export function ninjaOneHydrologyShouldBeResident(camera) {
  if (!sameCamera(camera, camera)) return false;
  if (
    camera.span.some((value) => !Number.isFinite(value) || value <= 0)
    || camera.origin.some((value) => !Number.isFinite(value))
    || Math.max(...camera.span) > NINJAONE_MVP_HYDROLOGY_MAXIMUM_CAMERA_SPAN
  ) return false;
  return intersects(camera, {
    origin: ENVIRONMENT_ORIGIN,
    span: ENVIRONMENT_SPAN,
  });
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
  hydrologyManifest,
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
  const hydrologyRegionBounds = new Map(
    (hydrologyManifest?.regionalFields?.regions ?? []).map(({ id, worldBounds }) => (
      [id, worldBounds]
    )),
  );
  for (const [tier, contract] of Object.entries(
    hydrologyManifest?.regionalFields?.tiers ?? {},
  )) {
    for (const resource of contract?.resources ?? []) {
      add(resource, "hydrology", {
        regionId: resource.regionId,
        sourceBounds: resource.sourceBounds,
        tier,
        worldBounds: hydrologyRegionBounds.get(resource.regionId),
      });
    }
  }
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

function uniqueStringArray(value, failures, label) {
  if (
    !Array.isArray(value)
    || value.some((entry) => typeof entry !== "string" || entry.length === 0)
  ) {
    failures.push(`${label}_missing`);
    return [];
  }
  if (new Set(value).size !== value.length) failures.push(`${label}_duplicate`);
  return value;
}

function sameStringSet(first, second) {
  return first.length === second.length
    && [...first].sort().every((value, index) => value === [...second].sort()[index]);
}

function sameStringRecord(actual, expected) {
  if (!actual || typeof actual !== "object" || Array.isArray(actual)) return false;
  const actualEntries = Object.entries(actual).sort(([left], [right]) => (
    left.localeCompare(right)
  ));
  const expectedEntries = Object.entries(expected).sort(([left], [right]) => (
    left.localeCompare(right)
  ));
  return actualEntries.length === expectedEntries.length
    && actualEntries.every(([key, value], index) => (
      key === expectedEntries[index][0] && value === expectedEntries[index][1]
    ));
}

function resourcePaintedNodeCount(resource) {
  const tonalNodes = resource?.tonalTransition?.paintedNodeCount ?? 0;
  const count = resource?.paintedNodeCount ?? 1 + tonalNodes;
  if (!Number.isSafeInteger(count) || count <= 0) {
    throw new TypeError(`Resource ${resource?.id ?? "unknown"} has invalid painted nodes.`);
  }
  return count;
}

function catalogBytes(resourceIds, resourceCatalog, failures, label, kind) {
  let total = 0;
  for (const id of new Set(resourceIds)) {
    const resource = resourceCatalog?.[id];
    if (!resource || (kind && resource.kind !== kind)) {
      failures.push(`${label}.unknown_resource.${id}`);
      continue;
    }
    total += resource.decodedBytes;
  }
  return total;
}

function expectedTerrainResourceIds(camera, resourceCatalog) {
  if (!camera || !Array.isArray(camera.origin) || !Array.isArray(camera.span)) return [];
  const view = artboardCamera(camera);
  const center = [
    view.origin[0] + view.span[0] * 0.5,
    view.origin[1] + view.span[1] * 0.5,
  ];
  const selected = Object.values(resourceCatalog ?? {})
    .filter((resource) => (
      resource.kind === "terrain"
      && resource.artboardBounds
      && intersects(view, resource.artboardBounds)
    ))
    .sort((left, right) => {
      const distance = (resource) => {
        const bounds = resource.artboardBounds;
        return (
          center[0] - (bounds.origin[0] + bounds.span[0] * 0.5)
        ) ** 2 + (
          center[1] - (bounds.origin[1] + bounds.span[1] * 0.5)
        ) ** 2;
      };
      return distance(left) - distance(right) || left.id.localeCompare(right.id);
    });
  return selected.length <= NINJAONE_MVP_LIMITS.maximumTerrainTiles
    ? selected.map(({ id }) => id)
    : [];
}

function expectedSupplementalResourceIds(
  camera,
  resourceCatalog,
  {
    hydrologyDecodedBytes = 0,
    terrainDecodedBytes = 0,
  } = {},
) {
  if (!camera || !Array.isArray(camera.origin) || !Array.isArray(camera.span)) return [];
  const view = artboardCamera(camera);
  const candidates = Object.values(resourceCatalog ?? {})
    .filter((resource) => (
      resource.kind === "supplemental"
      && resource.artboardBounds
      && (
        !Number.isFinite(resource.maximumCameraSpan)
        || Math.max(...camera.span) <= resource.maximumCameraSpan
      )
      && intersects(view, resource.artboardBounds)
    ));
  const byDistance = (left, right) => (
      distanceFromCamera(view, left.artboardBounds)
      - distanceFromCamera(view, right.artboardBounds)
      || left.id.localeCompare(right.id)
  );
  const required = candidates
    .filter(({ admissionPriority }) => admissionPriority !== "optional-group")
    .sort(byDistance);
  const selected = [...required];
  let decodedBytes = terrainDecodedBytes + hydrologyDecodedBytes
    + required.reduce((total, resource) => total + resource.decodedBytes, 0);
  let nodeCount = required.reduce(
    (total, resource) => total + resource.paintedNodeCount,
    0,
  );
  const optionalGroups = new Map();
  for (const resource of candidates.filter(
    ({ admissionPriority }) => admissionPriority === "optional-group",
  )) {
    const group = optionalGroups.get(resource.groupId) ?? [];
    group.push(resource);
    optionalGroups.set(resource.groupId, group);
  }
  const orderedGroups = [...optionalGroups.entries()]
    .map(([id, resources]) => ({ id, resources: resources.sort(byDistance) }))
    .sort((left, right) => (
      byDistance(left.resources[0], right.resources[0])
      || left.id.localeCompare(right.id)
    ));
  for (const group of orderedGroups) {
    const groupBytes = group.resources.reduce(
      (total, resource) => total + resource.decodedBytes,
      0,
    );
    const groupNodes = group.resources.reduce(
      (total, resource) => total + resource.paintedNodeCount,
      0,
    );
    if (
      nodeCount + groupNodes
        > NINJAONE_MVP_LIMITS.maximumSupplementalNodes
      || decodedBytes + groupBytes > NINJAONE_MVP_LIMITS.maximumDecodedBytes
    ) break;
    selected.push(...group.resources);
    nodeCount += groupNodes;
    decodedBytes += groupBytes;
  }
  return selected.map(({ id }) => id);
}

function expectedRequiredSupplementalResourceIds(camera, resourceCatalog) {
  return expectedSupplementalResourceIds(camera, resourceCatalog).filter((id) => (
    resourceCatalog?.[id]?.admissionPriority === "required"
  ));
}

function expectedHydrologyRegionIds(camera, resourceCatalog) {
  if (!camera || !Array.isArray(camera.origin) || !Array.isArray(camera.span)) return [];
  const regions = new Map();
  for (const resource of Object.values(resourceCatalog ?? {})) {
    if (resource.kind !== "hydrology" || !resource.worldBounds) continue;
    regions.set(resource.regionId, resource.worldBounds);
  }
  return [...regions.entries()].map(([id, bounds]) => {
    const overlapWidth = Math.max(0, Math.min(
      camera.origin[0] + camera.span[0],
      bounds.origin[0] + bounds.span[0],
    ) - Math.max(camera.origin[0], bounds.origin[0]));
    const overlapHeight = Math.max(0, Math.min(
      camera.origin[1] + camera.span[1],
      bounds.origin[1] + bounds.span[1],
    ) - Math.max(camera.origin[1], bounds.origin[1]));
    return { id, overlapArea: overlapWidth * overlapHeight };
  }).filter(({ overlapArea }) => overlapArea > 0)
    .sort((left, right) => (
      right.overlapArea - left.overlapArea || left.id.localeCompare(right.id)
    ))
    .slice(0, 2)
    .map(({ id }) => id)
    .sort();
}

function regionalHydrologyResources(resourceCatalog, regionIds, tier) {
  return regionIds.map((regionId) => {
    const matches = Object.values(resourceCatalog ?? {}).filter((resource) => (
      resource.kind === "hydrology"
      && resource.regionId === regionId
      && resource.tier === tier
    ));
    return matches.length === 1 ? matches[0] : null;
  });
}

function expectedRegionalHydrologyPlan({
  camera,
  currentResourceIds,
  presentationReady,
  reservedDecodedBytes,
  resourceCatalog,
}) {
  const regionIds = expectedHydrologyRegionIds(camera, resourceCatalog);
  if (
    !presentationReady
    || regionIds.length === 0
    || regionIds.length > 2
    || !Number.isSafeInteger(reservedDecodedBytes)
    || reservedDecodedBytes < 0
  ) return Object.freeze({
    decodedBytes: 0,
    regionIds: Object.freeze(regionIds),
    resourceIds: Object.freeze([]),
    resourcePaths: Object.freeze([]),
    steadyBytes: reservedDecodedBytes,
    tier: "none",
    transitionBytes: reservedDecodedBytes,
  });
  const currentResources = currentResourceIds.map((id) => resourceCatalog?.[id])
    .filter((resource) => resource?.kind === "hydrology");
  const currentBytes = currentResources.reduce(
    (total, resource) => total + resource.decodedBytes,
    0,
  );
  for (const tier of ["detail", "fallback"]) {
    const resources = regionalHydrologyResources(resourceCatalog, regionIds, tier);
    if (resources.some((resource) => resource === null)) continue;
    const identities = new Set(currentResources.map(({ path: value, sha256 }) => (
      `${value}\t${sha256}`
    )));
    const decodedBytes = resources.reduce(
      (total, resource) => total + resource.decodedBytes,
      0,
    );
    const incomingBytes = resources.reduce((total, resource) => (
      total + (identities.has(`${resource.path}\t${resource.sha256}`)
        ? 0
        : resource.decodedBytes)
    ), 0);
    const steadyBytes = reservedDecodedBytes + decodedBytes;
    const transitionBytes = reservedDecodedBytes + currentBytes + incomingBytes;
    if (
      Math.max(steadyBytes, transitionBytes)
        <= NINJAONE_MVP_LIMITS.maximumDecodedBytes
    ) return Object.freeze({
      decodedBytes,
      regionIds: Object.freeze(regionIds),
      resourceIds: Object.freeze(resources.map(({ id }) => id)),
      resourcePaths: Object.freeze(resources.map(({ path: value }) => value)),
      steadyBytes,
      tier,
      transitionBytes,
    });
  }
  return Object.freeze({
    decodedBytes: 0,
    regionIds: Object.freeze(regionIds),
    resourceIds: Object.freeze([]),
    resourcePaths: Object.freeze([]),
    steadyBytes: reservedDecodedBytes,
    tier: "none",
    transitionBytes: reservedDecodedBytes + currentBytes,
  });
}

function validateNativeHydrologyAdmissionResources(
  records,
  failures,
  label,
  resourceCatalog,
) {
  if (!Array.isArray(records)) {
    failures.push(`${label}.missing`);
    return [];
  }
  const ids = [];
  const identities = [];
  for (const record of records) {
    const catalogResource = resourceCatalog?.[record?.id];
    if (
      !catalogResource
      || !new Set(["terrain", "supplemental"]).has(catalogResource.kind)
      || record.path !== catalogResource.path
      || record.sha256 !== catalogResource.sha256
      || record.decodedBytes !== catalogResource.decodedBytes
      || record.nodeCount !== catalogResource.paintedNodeCount
      || !new Set(["incoming", "mounted", "retiring"]).has(record.phase)
    ) {
      failures.push(`${label}.invalid.${record?.id ?? "unknown"}`);
      continue;
    }
    ids.push(record.id);
    identities.push(`${record.path}\t${record.sha256}`);
  }
  if (new Set(ids).size !== ids.length || new Set(identities).size !== identities.length) {
    failures.push(`${label}.duplicate`);
  }
  return ids;
}

function expectedRequiredPresentationKeys(resourceIds, resourceCatalog) {
  const groups = new Map();
  for (const id of resourceIds) {
    const resource = resourceCatalog?.[id];
    const kind = resource?.requiredPresentationKind;
    if (
      !new Set(["coast", "seam"]).has(kind)
      || typeof resource?.path !== "string"
      || !/^[a-f\d]{64}$/i.test(resource?.sha256 ?? "")
    ) return [];
    const identities = groups.get(kind) ?? [];
    identities.push({ path: resource.path, sha256: resource.sha256.toUpperCase() });
    groups.set(kind, identities);
  }
  return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right))
    .map(([kind, identities]) => `${kind}:${JSON.stringify(identities.sort((left, right) => (
      left.path.localeCompare(right.path) || left.sha256.localeCompare(right.sha256)
    )))}`);
}

function expectedRequiredChildContracts(resourceIds, resourceCatalog) {
  const groups = new Map();
  for (const id of resourceIds) {
    const resource = resourceCatalog?.[id];
    const kind = resource?.requiredPresentationKind;
    if (!new Set(["coast", "seam"]).has(kind)) return [];
    const resources = groups.get(kind) ?? [];
    resources.push(resource);
    groups.set(kind, resources);
  }
  return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right))
    .map(([kind, resources]) => Object.freeze({
      decodedBytes: resources.reduce((total, resource) => total + resource.decodedBytes, 0),
      key: resources.map(({ path: resourcePath, sha256 }) => (
        `${resourcePath}#sha256=${sha256}`
      )).sort().join("|"),
      kind,
      nodeCount: resources.reduce(
        (total, resource) => total + resource.paintedNodeCount,
        0,
      ),
      resourceIds: resources.map(({ id }) => id),
    }));
}

function validateRuntimeSample(
  sample,
  failures,
  label,
  resourceCatalog,
  camera,
  { allowOptionalPostPromotionPending = false } = {},
) {
  const requiredIntegers = [
    "applicationOwnedDecodedBytes", "cohortEpoch", "nativeDecodedUnionBytes",
    "foliageMountedDecodedBytes", "foliageMountedImageNodeCount",
    "foliageResidencyEpoch", "foliageSelectedDecodedBytes",
    "foliageSelectedImageNodeCount",
    "requiredCohortEpoch", "requiredDecodedBytes", "requiredNodeCount",
    "supplementalNodeCount",
    "terrainApplicationOwnedDecodedBytes", "terrainMountedDecodedBytes",
    "terrainRetiringDecodedBytes", "terrainTileCount",
    "waterTextureBudgetBytes", "waterTextureBytes", "waterTransientPeakBytes",
    "waterHydrologyAssetBytes", "waterHydrologyNativeUnionMaximumBytes",
    "waterHydrologyNativeUnionPlannedBytes",
    "waterHydrologyNativeUnionReservedBytes", "waterSharedTextureBytes",
    "waterSharedTransientPeakBytes",
  ];
  for (const field of requiredIntegers) {
    if (!Number.isSafeInteger(sample?.[field]) || sample[field] < 0) {
      failures.push(`${label}.${field}_invalid`);
    }
  }
  for (const field of [
    "lowerDetailAvailable", "nativeDemand", "nativeVisible", "noVisibleGap",
    "foliageVisible",
    "requiredNoVisibleGap", "requiredPreloadActive", "requiredReady",
    "supplementalVisible", "waterHydrologyRequested",
  ]) {
    if (typeof sample?.[field] !== "boolean") failures.push(`${label}.${field}_missing`);
  }
  if (!sample?.noVisibleGap) failures.push(`${label}.visible_gap`);
  if (!sample?.nativeVisible && !sample?.lowerDetailAvailable) {
    failures.push(`${label}.lower_detail_missing`);
  }
  if (!new Set(["active", "evicting"]).has(sample?.cohortPhase)) {
    failures.push(`${label}.cohort_phase_invalid`);
  }
  if (!new Set(["budget-blocked", "error", "idle", "loading", "ready"])
    .has(sample?.nativeState)) {
    failures.push(`${label}.native_state_invalid`);
  }
  if (!new Set(["budget-blocked", "error", "idle", "loading", "ready"])
    .has(sample?.requiredState)) {
    failures.push(`${label}.required_state_invalid`);
  }
  if (!new Set(["budget-blocked", "idle", "loading", "ready"])
    .has(sample?.terrainState)) {
    failures.push(`${label}.terrain_state_invalid`);
  }
  if (
    typeof sample?.requiredCohortKey !== "string"
    || sample.requiredCohortKey.length === 0
  ) failures.push(`${label}.required_cohort_key_invalid`);
  if (!sample?.requiredNoVisibleGap) failures.push(`${label}.required_visible_gap`);
  if (!new Set(["world", "territory", "site", "close"]).has(sample?.lodTier)) {
    failures.push(`${label}.lod_tier_invalid`);
  }
  if (!new Set(["error", "idle", "loading", "ready"])
    .has(sample?.supplementalState)) {
    failures.push(`${label}.supplemental_state_invalid`);
  }
  if (!new Set(["error", "idle", "loading", "ready"])
    .has(sample?.foliageState)) {
    failures.push(`${label}.foliage_state_invalid`);
  }
  if (!new Set(["error", "idle", "incoming", "mounted"])
    .has(sample?.foliageResidencyPhase)) {
    failures.push(`${label}.foliage_residency_phase_invalid`);
  }

  const nodes = Array.isArray(sample?.mountedNodes) ? sample.mountedNodes : [];
  if (!Array.isArray(sample?.mountedNodes)) failures.push(`${label}.mounted_nodes_missing`);
  const nodeIds = [];
  const mountedResourceIdsFromNodes = [];
  let terrainNodeCount = 0;
  let supplementalNodeCount = 0;
  for (const node of nodes) {
    if (
      typeof node?.nodeId !== "string"
      || node.nodeId.length === 0
      || typeof node?.resourceId !== "string"
    ) {
      failures.push(`${label}.mounted_node_invalid`);
      continue;
    }
    nodeIds.push(node.nodeId);
    mountedResourceIdsFromNodes.push(node.resourceId);
    const resource = resourceCatalog?.[node.resourceId];
    if (!resource || resource.kind !== node.kind) {
      failures.push(`${label}.mounted_node_catalog_mismatch.${node.nodeId}`);
    }
    if (node.kind === "terrain") terrainNodeCount += 1;
    else if (node.kind === "supplemental") supplementalNodeCount += 1;
    else failures.push(`${label}.mounted_node_kind.${node.nodeId}`);
  }
  if (new Set(nodeIds).size !== nodeIds.length) failures.push(`${label}.duplicate_dom_node`);
  if (terrainNodeCount !== sample?.terrainTileCount) {
    failures.push(`${label}.terrain_count_not_dom_derived`);
  }
  if (supplementalNodeCount !== sample?.supplementalNodeCount) {
    failures.push(`${label}.supplemental_count_not_dom_derived`);
  }
  if (terrainNodeCount > NINJAONE_MVP_LIMITS.maximumTerrainTiles) {
    failures.push(`${label}.terrain_tile_budget`);
  }
  if (supplementalNodeCount > NINJAONE_MVP_LIMITS.maximumSupplementalNodes) {
    failures.push(`${label}.supplemental_node_budget`);
  }

  const mountedResourceIds = uniqueStringArray(
    sample?.mountedResourceIds, failures, `${label}.mounted_resource_ids`,
  );
  const applicationOwnedResourceIds = uniqueStringArray(
    sample?.applicationOwnedResourceIds,
    failures,
    `${label}.application_owned_resource_ids`,
  );
  const retiringResourceIds = uniqueStringArray(
    sample?.retiringResourceIds, failures, `${label}.retiring_resource_ids`,
  );
  const selectedSupplementalResourceIds = uniqueStringArray(
    sample?.selectedSupplementalResourceIds,
    failures,
    `${label}.selected_supplemental_resource_ids`,
  );
  const foliageMountedResourceIds = uniqueStringArray(
    sample?.foliageMountedResourceIds,
    failures,
    `${label}.foliage_mounted_resource_ids`,
  );
  const foliageSelectedResourceIds = uniqueStringArray(
    sample?.foliageSelectedResourceIds,
    failures,
    `${label}.foliage_selected_resource_ids`,
  );
  const requiredFailedKeys = uniqueStringArray(
    sample?.requiredFailedKeys, failures, `${label}.required_failed_keys`,
  );
  const requiredReadyKeys = uniqueStringArray(
    sample?.requiredReadyKeys, failures, `${label}.required_ready_keys`,
  );
  const requiredResourceIds = uniqueStringArray(
    sample?.requiredResourceIds, failures, `${label}.required_resource_ids`,
  );
  const requiredResourceKeys = uniqueStringArray(
    sample?.requiredResourceKeys, failures, `${label}.required_resource_keys`,
  );
  const currentAdmissionResourceIds = validateNativeHydrologyAdmissionResources(
    sample?.nativeHydrologyAdmissionCurrentResources,
    failures,
    `${label}.native_hydrology_admission_current_resources`,
    resourceCatalog,
  );
  const targetAdmissionResourceIds = validateNativeHydrologyAdmissionResources(
    sample?.nativeHydrologyAdmissionTargetResources,
    failures,
    `${label}.native_hydrology_admission_target_resources`,
    resourceCatalog,
  );
  const derivedMountedResourceIds = [...new Set(mountedResourceIdsFromNodes)].sort();
  if (!sameStringSet(mountedResourceIds, derivedMountedResourceIds)) {
    failures.push(`${label}.mounted_resource_ids_not_dom_derived`);
  }
  if (!mountedResourceIds.every((id) => applicationOwnedResourceIds.includes(id))) {
    failures.push(`${label}.mounted_resource_not_application_owned`);
  }
  if (!retiringResourceIds.every((id) => applicationOwnedResourceIds.includes(id))) {
    failures.push(`${label}.retiring_resource_not_application_owned`);
  }
  const expectedApplicationOwnedIds = [...new Set([
    ...mountedResourceIds,
    ...retiringResourceIds,
    ...selectedSupplementalResourceIds,
  ])];
  if (!sameStringSet(applicationOwnedResourceIds, expectedApplicationOwnedIds)) {
    failures.push(`${label}.application_owned_union_mismatch`);
  }
  if (!sameStringSet(currentAdmissionResourceIds, applicationOwnedResourceIds)) {
    failures.push(`${label}.native_hydrology_admission_current_union_mismatch`);
  }
  const selectedOptionalFoliageIds = selectedSupplementalResourceIds.filter((id) => (
    resourceCatalog?.[id]?.admissionPriority === "optional-group"
  ));
  const mountedOptionalFoliageIds = mountedResourceIds.filter((id) => (
    resourceCatalog?.[id]?.admissionPriority === "optional-group"
  ));
  const expectedFoliageSelectedBytes = catalogBytes(
    foliageSelectedResourceIds,
    resourceCatalog,
    failures,
    `${label}.foliage_selected`,
    "supplemental",
  );
  const expectedFoliageMountedBytes = catalogBytes(
    foliageMountedResourceIds,
    resourceCatalog,
    failures,
    `${label}.foliage_mounted`,
    "supplemental",
  );
  const expectedFoliageMountedNodeCount = nodes.filter(({ resourceId }) => (
    resourceCatalog?.[resourceId]?.admissionPriority === "optional-group"
  )).length;
  const foliageDomShouldBeMounted = foliageSelectedResourceIds.length > 0
    && new Set(["loading", "ready"]).has(sample?.foliageState);
  const expectedFoliageDomResourceIds = foliageDomShouldBeMounted
    ? foliageSelectedResourceIds
    : [];
  const expectedFoliageVisible = sample?.foliageState === "ready"
    && foliageSelectedResourceIds.length > 0;
  if (
    !sameStringSet(
      selectedOptionalFoliageIds,
      sample?.foliageState === "error" ? [] : foliageSelectedResourceIds,
    )
    || !sameStringSet(foliageMountedResourceIds, mountedOptionalFoliageIds)
    || !sameStringSet(foliageMountedResourceIds, expectedFoliageDomResourceIds)
    || sample?.foliageSelectedDecodedBytes !== expectedFoliageSelectedBytes
    || sample?.foliageMountedDecodedBytes !== expectedFoliageMountedBytes
    || sample?.foliageSelectedImageNodeCount !== foliageSelectedResourceIds.length
    || sample?.foliageMountedImageNodeCount !== expectedFoliageMountedNodeCount
    || sample?.foliageMountedImageNodeCount !== expectedFoliageDomResourceIds.length
    || sample?.foliageVisible !== expectedFoliageVisible
  ) failures.push(`${label}.foliage_dom_residency_mismatch`);
  const expectedFoliagePhase = foliageSelectedResourceIds.length === 0
    ? "idle"
    : sample?.foliageState === "error"
      ? "error"
      : sameStringSet(mountedOptionalFoliageIds, foliageSelectedResourceIds)
      && sample?.foliageState === "ready"
      && sample?.foliageVisible === true
      ? "mounted"
      : "incoming";
  if (
    sample?.foliageResidencyEpoch !== sample?.requiredCohortEpoch
    || sample?.foliageResidencyCohortKey !== foliageSelectedResourceIds.map((id) => {
      const resource = resourceCatalog?.[id];
      return `${id}\t${resource?.path}#sha256=${resource?.sha256}`;
    }).sort().join("\n")
    || sample?.foliageResidencyPhase !== expectedFoliagePhase
  ) failures.push(`${label}.foliage_parent_residency_mismatch`);
  for (const record of sample?.nativeHydrologyAdmissionCurrentResources ?? []) {
    const expectedPhase = resourceCatalog?.[record.id]?.admissionPriority === "optional-group"
      ? sample?.foliageResidencyPhase === "mounted" ? "mounted" : "incoming"
      : retiringResourceIds.includes(record.id)
      ? "retiring"
      : mountedResourceIds.includes(record.id)
        ? "mounted"
        : selectedSupplementalResourceIds.includes(record.id)
          ? "incoming"
          : null;
    if (record.phase !== expectedPhase) {
      failures.push(`${label}.native_hydrology_admission_current_phase.${record.id}`);
    }
  }
  if ((sample?.nativeHydrologyAdmissionTargetResources ?? []).some(
    ({ phase }) => phase !== "incoming",
  )) failures.push(`${label}.native_hydrology_admission_target_phase`);
  const applicationOwnedDecodedBytes = catalogBytes(
    applicationOwnedResourceIds, resourceCatalog, failures, label,
  );
  if (sample?.applicationOwnedDecodedBytes !== applicationOwnedDecodedBytes) {
    failures.push(`${label}.application_owned_bytes_not_resource_union`);
  }
  if (applicationOwnedDecodedBytes > NINJAONE_MVP_LIMITS.maximumDecodedBytes) {
    failures.push(`${label}.application_owned_decoded_byte_budget`);
  }
  const mountedTerrainIds = mountedResourceIds.filter(
    (id) => resourceCatalog?.[id]?.kind === "terrain",
  );
  const retiringTerrainIds = retiringResourceIds.filter(
    (id) => resourceCatalog?.[id]?.kind === "terrain",
  );
  const applicationOwnedTerrainIds = applicationOwnedResourceIds.filter(
    (id) => resourceCatalog?.[id]?.kind === "terrain",
  );
  const mountedTerrainBytes = catalogBytes(
    mountedTerrainIds, resourceCatalog, failures, label, "terrain",
  );
  const retiringTerrainBytes = catalogBytes(
    retiringTerrainIds, resourceCatalog, failures, label, "terrain",
  );
  const applicationOwnedTerrainBytes = catalogBytes(
    applicationOwnedTerrainIds, resourceCatalog, failures, label, "terrain",
  );
  if (sample?.terrainMountedDecodedBytes !== mountedTerrainBytes) {
    failures.push(`${label}.terrain_mounted_bytes_mismatch`);
  }
  if (sample?.terrainRetiringDecodedBytes !== retiringTerrainBytes) {
    failures.push(`${label}.terrain_retiring_bytes_mismatch`);
  }
  if (
    sample?.terrainApplicationOwnedDecodedBytes
      !== applicationOwnedTerrainBytes
  ) failures.push(`${label}.terrain_application_owned_bytes_mismatch`);
  if (sample?.cohortPhase === "evicting" && nodes.length !== 0) {
    failures.push(`${label}.nodes_mounted_during_eviction`);
  }
  if (sample?.cohortPhase === "active" && retiringResourceIds.length !== 0) {
    failures.push(`${label}.retiring_resources_during_active_cohort`);
  }
  const expectedTerrainIds = sample?.nativeDemand
    ? expectedTerrainResourceIds(camera, resourceCatalog)
    : [];
  if (
    sample?.cohortPhase === "active"
    && !sameStringSet(mountedTerrainIds, expectedTerrainIds)
  ) failures.push(`${label}.wrong_terrain_cohort`);
  const mountedSupplementalIds = mountedResourceIds.filter(
    (id) => resourceCatalog?.[id]?.kind === "supplemental",
  );
  const requiredPreloadExpected = sample?.nativeDemand === true
    && sample?.cohortPhase === "active"
    && expectedTerrainIds.length > 0;
  const expectedRequiredIds = requiredPreloadExpected
    ? expectedRequiredSupplementalResourceIds(camera, resourceCatalog)
    : [];
  const expectedRequiredKeys = expectedRequiredPresentationKeys(
    expectedRequiredIds,
    resourceCatalog,
  );
  const expectedRequiredBytes = catalogBytes(
    expectedRequiredIds, resourceCatalog, failures, `${label}.required`, "supplemental",
  );
  const expectedRequiredNodeCount = expectedRequiredIds.reduce(
    (total, id) => total + (resourceCatalog?.[id]?.paintedNodeCount ?? 0),
    0,
  );
  const mountedRequiredIds = mountedSupplementalIds.filter((id) => (
    resourceCatalog?.[id]?.admissionPriority === "required"
  ));
  const mountedRequiredNodeCount = nodes.filter(({ resourceId }) => (
    resourceCatalog?.[resourceId]?.admissionPriority === "required"
  )).length;
  if (sample?.requiredPreloadActive !== requiredPreloadExpected) {
    failures.push(`${label}.required_preload_admission_mismatch`);
  }
  if (!sameStringSet(requiredResourceIds, expectedRequiredIds)) {
    failures.push(`${label}.wrong_required_resource_cohort`);
  }
  if (!sameStringSet(requiredResourceKeys, expectedRequiredKeys)) {
    failures.push(`${label}.wrong_required_identity_cohort`);
  }
  if (
    requiredResourceKeys.some((key) => (
      !sample?.requiredCohortKey?.includes(`required:${key}`)
    ))
  ) failures.push(`${label}.required_cohort_identity_mismatch`);
  if (sample?.requiredDecodedBytes !== expectedRequiredBytes) {
    failures.push(`${label}.required_decoded_bytes_mismatch`);
  }
  if (sample?.requiredNodeCount !== expectedRequiredNodeCount) {
    failures.push(`${label}.required_node_count_mismatch`);
  }
  if (
    requiredReadyKeys.some((key) => !requiredResourceKeys.includes(key))
    || requiredFailedKeys.some((key) => !requiredResourceKeys.includes(key))
    || requiredReadyKeys.some((key) => requiredFailedKeys.includes(key))
  ) failures.push(`${label}.required_readiness_identity_mismatch`);
  const expectedRequiredReady = requiredResourceKeys.every((key) => (
    requiredReadyKeys.includes(key)
  )) && requiredFailedKeys.length === 0;
  if (sample?.requiredReady !== expectedRequiredReady) {
    failures.push(`${label}.required_ready_mismatch`);
  }
  if (!sameStringSet(mountedRequiredIds, expectedRequiredIds)) {
    failures.push(`${label}.required_dom_cohort_mismatch`);
  }
  if (mountedRequiredNodeCount !== expectedRequiredNodeCount) {
    failures.push(`${label}.required_dom_node_count_mismatch`);
  }
  if (
    sample?.nativeVisible
    && (
      !expectedRequiredReady
      || sample?.requiredState !== "ready"
      || !sameStringSet(requiredReadyKeys, requiredResourceKeys)
    )
  ) failures.push(`${label}.required_cohort_not_ready_at_promotion`);
  const requiredChildren = Array.isArray(sample?.requiredChildren)
    ? sample.requiredChildren
    : [];
  if (!Array.isArray(sample?.requiredChildren)) {
    failures.push(`${label}.required_children_missing`);
  }
  const expectedRequiredChildren = expectedRequiredChildContracts(
    expectedRequiredIds,
    resourceCatalog,
  );
  if (new Set(requiredChildren.map(({ kind }) => kind)).size !== requiredChildren.length) {
    failures.push(`${label}.required_child_kind_duplicate`);
  }
  for (const expectedChild of expectedRequiredChildren) {
    const child = requiredChildren.find(({ kind }) => kind === expectedChild.kind);
    const parentRequiredKey = expectedRequiredKeys.find((key) => (
      key.startsWith(`${expectedChild.kind}:`)
    ));
    if (!child) {
      failures.push(`${label}.required_child_missing.${expectedChild.kind}`);
      continue;
    }
    for (const field of [
      "epoch", "hiddenPaintedFrames", "mountedNodeCount", "svgLoadedCount",
    ]) {
      if (!Number.isSafeInteger(child[field]) || child[field] < 0) {
        failures.push(`${label}.required_child.${expectedChild.kind}.${field}_invalid`);
      }
    }
    const childSelectedIds = uniqueStringArray(
      child.selectedResourceIds,
      failures,
      `${label}.required_child.${expectedChild.kind}.selected_ids`,
    );
    const childMountedIds = uniqueStringArray(
      child.mountedResourceIds,
      failures,
      `${label}.required_child.${expectedChild.kind}.mounted_ids`,
    );
    if (
      child.key !== expectedChild.key
      || child.epoch !== sample?.requiredCohortEpoch
      || !sameStringSet(childSelectedIds, expectedChild.resourceIds)
      || !sameStringSet(childMountedIds, expectedChild.resourceIds)
      || child.mountedNodeCount !== expectedChild.nodeCount
    ) failures.push(`${label}.required_child_identity.${expectedChild.kind}`);
    if (!new Set(["error", "idle", "loading", "ready"]).has(child.state)) {
      failures.push(`${label}.required_child_state.${expectedChild.kind}`);
    }
    if (
      child.state === "ready"
      && (
        child.svgLoadedCount !== expectedChild.resourceIds.length
        || child.hiddenPaintedFrames < 2
      )
    ) failures.push(`${label}.required_child_detached_ready.${expectedChild.kind}`);
    if (
      (child.state === "ready") !== requiredReadyKeys.includes(parentRequiredKey)
    ) failures.push(`${label}.required_child_parent_readiness.${expectedChild.kind}`);
    if (child.visible && !sample?.nativeVisible) {
      failures.push(`${label}.required_child_visible_before_parent.${expectedChild.kind}`);
    }
    if (
      sample?.nativeVisible
      && (child.state !== "ready" || child.visible !== true)
    ) failures.push(`${label}.required_child_not_visible_at_promotion.${expectedChild.kind}`);
  }
  for (const child of requiredChildren) {
    if (expectedRequiredChildren.some(({ kind }) => kind === child.kind)) continue;
    if (
      child.visible !== false
      || child.state !== "idle"
      || (child.selectedResourceIds?.length ?? -1) !== 0
      || (child.mountedResourceIds?.length ?? -1) !== 0
    ) failures.push(`${label}.unexpected_required_child.${child.kind ?? "unknown"}`);
  }
  const expectedSupplementalIds = sample?.nativeVisible
    ? expectedSupplementalResourceIds(camera, resourceCatalog, {
        terrainDecodedBytes: applicationOwnedTerrainBytes,
      })
    : expectedRequiredIds;
  const expectedTargetRequiredIds = sample?.nativeDemand
    && expectedTerrainIds.length > 0
    ? expectedRequiredSupplementalResourceIds(camera, resourceCatalog)
    : [];
  const expectedTargetSupplementalIds = sample?.nativeVisible
    ? expectedSupplementalResourceIds(camera, resourceCatalog, {
        terrainDecodedBytes: catalogBytes(
          expectedTerrainIds,
          resourceCatalog,
          failures,
          `${label}.target_terrain`,
          "terrain",
        ),
      })
    : expectedTargetRequiredIds;
  if (!sameStringSet(
    targetAdmissionResourceIds,
    [...expectedTerrainIds, ...expectedTargetSupplementalIds],
  )) failures.push(`${label}.native_hydrology_admission_target_union_mismatch`);
  const targetAdmissionDecodedBytes = catalogBytes(
    targetAdmissionResourceIds,
    resourceCatalog,
    failures,
    `${label}.native_hydrology_admission_target`,
  );
  if (
    !Number.isSafeInteger(sample?.nativeHydrologyAdmissionEpoch)
    || sample.nativeHydrologyAdmissionEpoch < 0
    || sample?.nativeHydrologyAdmissionPresentationReady !== sample?.nativeVisible
    || sample?.nativeHydrologyAdmissionCurrentDecodedBytes
      !== applicationOwnedDecodedBytes
    || sample?.nativeHydrologyAdmissionTargetDecodedBytes
      !== targetAdmissionDecodedBytes
    || sample?.nativeHydrologyAdmissionReservedDecodedBytes
      !== Math.max(applicationOwnedDecodedBytes, targetAdmissionDecodedBytes)
  ) failures.push(`${label}.native_hydrology_admission_accounting_mismatch`);
  const expectedSupplementalNodeCount = expectedSupplementalIds.reduce(
    (total, id) => total + (resourceCatalog?.[id]?.paintedNodeCount ?? 0),
    0,
  );
  if (!sameStringSet(selectedSupplementalResourceIds, expectedSupplementalIds)) {
    failures.push(`${label}.wrong_selected_supplemental_cohort`);
  }
  if (
    sample?.supplementalVisible
    && sample?.supplementalNodeCount !== expectedSupplementalNodeCount
  ) failures.push(`${label}.supplemental_painted_node_count_mismatch`);
  if (
    sample?.supplementalVisible
    && !sameStringSet(mountedSupplementalIds, expectedSupplementalIds)
  ) {
    failures.push(`${label}.wrong_supplemental_cohort`);
  }
  if (
    sample?.nativeVisible
    && expectedSupplementalIds.length > 0
    && !allowOptionalPostPromotionPending
    && (sample?.supplementalState !== "ready" || sample?.supplementalVisible !== true)
  ) failures.push(`${label}.supplemental_ready_cohort_missing`);
  if (sample?.supplementalVisible && sample?.supplementalState !== "ready") {
    failures.push(`${label}.supplemental_visible_before_ready`);
  }
  if (sample?.nativeVisible && sample?.nativeState !== "ready") {
    failures.push(`${label}.visible_before_ready`);
  }
  if (
    (sample?.lodTier === "world" || sample?.lodTier === "territory")
    && nodes.length !== 0
  ) failures.push(`${label}.native_sources_at_low_lod`);
  if (
    sample?.waterTextureBudgetBytes !== NINJAONE_MVP_WATER_TEXTURE_LIMITS.budgetBytes
    || sample?.waterSharedTextureBytes > sample?.waterTextureBudgetBytes
    || sample?.waterSharedTransientPeakBytes < sample?.waterSharedTextureBytes
    || sample?.waterSharedTransientPeakBytes > sample?.waterTextureBudgetBytes
    || sample?.waterTextureBytes !== sample?.waterSharedTextureBytes
    || sample?.waterTransientPeakBytes !== sample?.waterSharedTransientPeakBytes
  ) failures.push(`${label}.water_texture_budget`);
  if (sample?.waterRenderState !== "ready") {
    failures.push(`${label}.water_render_state_not_ready`);
  }
  if (
    sample?.waterForegroundMode
      !== NINJAONE_MVP_WATER_TEXTURE_LIMITS.foregroundWaterMode
    || sample?.waterHydrologyBudgetOwner
      !== NINJAONE_MVP_WATER_TEXTURE_LIMITS.hydrologyBudgetOwner
    || sample?.waterHydrologyNativeUnionMaximumBytes
      !== NINJAONE_MVP_LIMITS.maximumDecodedBytes
  ) failures.push(`${label}.water_native_union_contract`);
  if (!new Set(["base", "loading", "ready", "fallback", "constrained"])
    .has(sample?.waterDetailState)) {
    failures.push(`${label}.water_detail_state_invalid`);
  }
  if (
    !new Set([
      "constrained", "disabled", "fallback", "idle", "loading", "ready", "transitioning",
    ])
      .has(sample?.waterHydrologyAssetState)
    || !new Set(["detail", "fallback", "none"])
      .has(sample?.waterHydrologyAssetTier)
  ) failures.push(`${label}.water_hydrology_state_invalid`);
  if (
    !new Set(["fading-in", "fading-out", "stable", "zero"])
      .has(sample?.waterHydrologyTransitionState)
    || !Number.isFinite(sample?.waterHydrologyTransitionOpacity)
    || sample.waterHydrologyTransitionOpacity < 0
    || sample.waterHydrologyTransitionOpacity > 1
    || (
      sample.waterHydrologyTransitionState === "stable"
      && sample.waterHydrologyTransitionOpacity !== 1
    )
    || (
      sample.waterHydrologyTransitionState === "zero"
      && sample.waterHydrologyTransitionOpacity !== 0
    )
  ) failures.push(`${label}.water_hydrology_transition_state_invalid`);
  const waterHydrologyAssetRegionIds = uniqueStringArray(
    sample?.waterHydrologyAssetRegionIds,
    failures,
    `${label}.water_hydrology_asset_region_ids`,
  );
  const waterHydrologyAssetResourceIds = uniqueStringArray(
    sample?.waterHydrologyAssetResourceIds,
    failures,
    `${label}.water_hydrology_asset_resource_ids`,
  );
  const waterHydrologyAssetResourcePaths = uniqueStringArray(
    sample?.waterHydrologyAssetResourcePaths,
    failures,
    `${label}.water_hydrology_asset_resource_paths`,
  );
  const waterHydrologyRequestedRegionIds = uniqueStringArray(
    sample?.waterHydrologyRequestedRegionIds,
    failures,
    `${label}.water_hydrology_requested_region_ids`,
  );
  const waterHydrologyRequestedResourceIds = uniqueStringArray(
    sample?.waterHydrologyRequestedResourceIds,
    failures,
    `${label}.water_hydrology_requested_resource_ids`,
  );
  const waterHydrologyRequestedResourcePaths = uniqueStringArray(
    sample?.waterHydrologyRequestedResourcePaths,
    failures,
    `${label}.water_hydrology_requested_resource_paths`,
  );
  const actualHydrologyResources = waterHydrologyAssetResourceIds.map(
    (id) => resourceCatalog?.[id],
  );
  if (
    actualHydrologyResources.some((resource) => resource?.kind !== "hydrology")
    || actualHydrologyResources.some((resource, index) => (
      resource.path !== waterHydrologyAssetResourcePaths[index]
      || resource.regionId !== waterHydrologyAssetRegionIds[index]
      || resource.tier !== sample?.waterHydrologyAssetTier
    ))
    || waterHydrologyAssetResourceIds.length > 2
    || waterHydrologyAssetResourceIds.length
      !== sample?.waterHydrologySamplerSlotCount
  ) failures.push(`${label}.water_hydrology_mounted_cohort_invalid`);
  const requestedHydrologyResources = waterHydrologyRequestedResourceIds.map(
    (id) => resourceCatalog?.[id],
  );
  if (
    requestedHydrologyResources.some((resource) => resource?.kind !== "hydrology")
    || requestedHydrologyResources.some((resource, index) => (
      resource.path !== waterHydrologyRequestedResourcePaths[index]
      || resource.regionId !== waterHydrologyRequestedRegionIds[index]
      || resource.tier !== sample?.waterHydrologyRequestedTier
    ))
    || waterHydrologyRequestedResourceIds.length > 2
  ) failures.push(`${label}.water_hydrology_requested_cohort_invalid`);
  const actualHydrologyBytes = actualHydrologyResources.reduce(
    (total, resource) => total + (resource?.decodedBytes ?? 0),
    0,
  );
  const expectedHydrologyPlan = expectedRegionalHydrologyPlan({
    camera,
    currentResourceIds: waterHydrologyAssetResourceIds,
    presentationReady: sample?.nativeHydrologyAdmissionPresentationReady === true,
    reservedDecodedBytes: sample?.nativeHydrologyAdmissionReservedDecodedBytes,
    resourceCatalog,
  });
  const expectedHydrologyResident = ninjaOneHydrologyShouldBeResident(camera)
    && expectedHydrologyPlan.regionIds.length > 0
    && sample?.nativeHydrologyAdmissionPresentationReady === true;
  const optionalHydrologyPending = allowOptionalPostPromotionPending
    && expectedHydrologyResident
    && waterHydrologyAssetResourceIds.length === 0
    && sample?.waterHydrologyAssetTier === "none"
    && ["idle", "loading"].includes(sample?.waterHydrologyAssetState);
  if (
    !optionalHydrologyPending
    && sample?.waterHydrologyRequested !== expectedHydrologyResident
  ) {
    failures.push(`${label}.water_hydrology_request_mismatch`);
  }
  if (
    expectedHydrologyResident
    && sample?.waterHydrologyRequested
    && (
      sample?.waterHydrologyRequestedTier !== expectedHydrologyPlan.tier
      || !sameStringSet(
        waterHydrologyRequestedRegionIds,
        expectedHydrologyPlan.regionIds,
      )
      || !sameStringSet(
        waterHydrologyRequestedResourceIds,
        expectedHydrologyPlan.resourceIds,
      )
      || !sameStringSet(
        waterHydrologyRequestedResourcePaths,
        expectedHydrologyPlan.resourcePaths,
      )
    )
  ) failures.push(`${label}.water_hydrology_requested_plan_mismatch`);
  if (
    sample?.waterHydrologyAssetState === "ready"
    || sample?.waterHydrologyAssetState === "fallback"
  ) {
    if (
      sample.waterHydrologyAssetTier !== expectedHydrologyPlan.tier
      || !sameStringSet(
        waterHydrologyAssetResourceIds,
        expectedHydrologyPlan.resourceIds,
      )
      || !sameStringSet(
        waterHydrologyAssetResourcePaths,
        expectedHydrologyPlan.resourcePaths,
      )
    ) failures.push(`${label}.water_hydrology_mounted_plan_mismatch`);
  }
  if (sample?.waterHydrologyAssetBytes !== actualHydrologyBytes) {
    failures.push(`${label}.water_hydrology_bytes_mismatch`);
  }
  if (
    sample?.waterHydrologyAssetResourcePath
      !== (waterHydrologyAssetResourcePaths.length === 1
        ? waterHydrologyAssetResourcePaths[0]
        : null)
  ) failures.push(`${label}.water_hydrology_singular_path_mismatch`);
  const waterHasNativeAdmission = expectedHydrologyResident
    || waterHydrologyAssetResourceIds.length > 0
    || waterHydrologyRequestedResourceIds.length > 0;
  if (
    sample?.waterHydrologyNativeAdmissionEpoch
      !== (waterHasNativeAdmission ? sample?.nativeHydrologyAdmissionEpoch : -1)
    || sample?.waterHydrologyNativeUnionReservedBytes
      !== (waterHasNativeAdmission
        ? sample?.nativeHydrologyAdmissionReservedDecodedBytes
        : 0)
    || sample?.waterHydrologyNativeUnionCurrentBytes
      !== (waterHasNativeAdmission
        ? applicationOwnedDecodedBytes + actualHydrologyBytes
        : actualHydrologyBytes)
  ) failures.push(`${label}.water_hydrology_admission_snapshot_mismatch`);
  const expectedPlannedNativeUnionBytes = expectedHydrologyResident
    && sample?.waterHydrologyRequested
    ? expectedHydrologyPlan.transitionBytes
    : 0;
  if (
    sample?.waterHydrologyNativeUnionPlannedBytes
      !== expectedPlannedNativeUnionBytes
  ) failures.push(`${label}.water_hydrology_planned_union_mismatch`);
  if (
    sample?.waterHydrologyNativeUnionTransitionPeakBytes
      < Math.max(
        sample?.waterHydrologyNativeUnionCurrentBytes ?? 0,
        sample?.waterHydrologyNativeUnionPlannedBytes ?? 0,
      )
    || sample?.waterHydrologyNativeUnionTransitionPeakBytes
      > NINJAONE_MVP_LIMITS.maximumDecodedBytes
  ) failures.push(`${label}.water_hydrology_transition_peak_invalid`);
  if (sample?.waterHydrologyAssetTier === "detail") {
    if (sample?.waterHydrologyAssetState !== "ready") {
      failures.push(`${label}.water_hydrology_detail_not_ready`);
    }
  } else if (sample?.waterHydrologyAssetTier === "fallback") {
    if (sample?.waterHydrologyAssetState !== "fallback") {
      failures.push(`${label}.water_hydrology_fallback_state`);
    }
  } else if (sample?.waterHydrologyAssetTier === "none") {
    if (!["constrained", "disabled", "idle", "loading"].includes(
      sample?.waterHydrologyAssetState,
    )) failures.push(`${label}.water_hydrology_none_state`);
    if (waterHydrologyAssetResourceIds.length !== 0) {
      failures.push(`${label}.water_hydrology_idle_resource_path`);
    }
  }
  const nativeHydrologyDecodedBytes = applicationOwnedDecodedBytes
    + actualHydrologyBytes;
  if (sample?.nativeDecodedUnionBytes !== nativeHydrologyDecodedBytes) {
    failures.push(`${label}.native_hydrology_union_not_dom_derived`);
  }
  if (nativeHydrologyDecodedBytes > NINJAONE_MVP_LIMITS.maximumDecodedBytes) {
    failures.push(`${label}.native_hydrology_decoded_byte_budget`);
  }
  if (sample?.waterDetailState === "base") {
    if (
      sample?.lodTier !== "world"
      || sample?.waterHydrologyAssetTier !== "none"
      || sample?.waterSharedTextureBytes
        !== NINJAONE_MVP_WATER_TEXTURE_LIMITS.constructorSharedBytes
      || sample?.waterSharedTransientPeakBytes
        !== NINJAONE_MVP_WATER_TEXTURE_LIMITS.constructorSharedBytes
    ) failures.push(`${label}.water_base_bytes_mismatch`);
  } else if (sample?.waterDetailState === "ready") {
    if (
      sample?.waterSharedTextureBytes
        !== NINJAONE_MVP_WATER_TEXTURE_LIMITS.detailWithoutHydrologyBytes
    ) {
      failures.push(`${label}.water_ready_bytes_mismatch`);
    }
    if (
      sample?.waterSharedTransientPeakBytes
        !== NINJAONE_MVP_WATER_TEXTURE_LIMITS.transientPeakBytes
    ) failures.push(`${label}.water_ready_transient_peak_mismatch`);
    if (
      expectedHydrologyResident
      && !optionalHydrologyPending
      && !["detail", "fallback"].includes(sample?.waterHydrologyAssetTier)
    ) failures.push(`${label}.water_requested_hydrology_missing`);
    if (
      !expectedHydrologyResident
      && sample?.waterHydrologyAssetTier !== "none"
    ) failures.push(`${label}.water_hydrology_outside_admission`);
  } else if (sample?.waterDetailState === "loading") {
    failures.push(`${label}.water_detail_unsettled`);
  }
  if (
    sample?.waterDetailState === "fallback"
    || sample?.waterDetailState === "constrained"
  ) {
    failures.push(`${label}.water_detail_fallback`);
  }
}

export function auditNinjaOneEnvironmentRuntimeSample({
  allowOptionalPostPromotionPending = false,
  camera,
  resourceCatalog,
  sample,
}) {
  const failures = [];
  validateRuntimeSample(
    sample,
    failures,
    "runtime_sample",
    resourceCatalog,
    camera,
    { allowOptionalPostPromotionPending },
  );
  return Object.freeze({
    failures: Object.freeze([...new Set(failures)]),
    pass: failures.length === 0,
  });
}

export function auditNinjaOneEnvironmentHydrologyBoundaryTransition({
  capture,
  resourceCatalog,
}) {
  const failures = [];
  const contract = NINJAONE_MVP_HYDROLOGY_BOUNDARY_TRANSITION;
  const label = "hydrology_boundary";
  const expectedFromTerrainIds = expectedTerrainResourceIds(
    contract.fromCamera,
    resourceCatalog,
  );
  const expectedToTerrainIds = expectedTerrainResourceIds(
    contract.toCamera,
    resourceCatalog,
  );
  const expectedFromRegionIds = expectedHydrologyRegionIds(
    contract.fromCamera,
    resourceCatalog,
  );
  const expectedToRegionIds = expectedHydrologyRegionIds(
    contract.toCamera,
    resourceCatalog,
  );
  const expectsNativeTerrain = expectedFromTerrainIds.length > 0;
  if (
    capture?.id !== contract.id
    || !sameCamera(capture?.fromCamera, contract.fromCamera)
    || !sameCamera(capture?.toCamera, contract.toCamera)
    || !sameStringRecord(capture?.isolation, NINJAONE_MVP_HYDROLOGY_BOUNDARY_ISOLATION)
  ) failures.push(`${label}.contract_mismatch`);
  if (
    !sameStringSet(expectedFromTerrainIds, expectedToTerrainIds)
  ) failures.push(`${label}.camera_terrain_cohort_mismatch`);
  if (
    !sameStringSet(expectedFromRegionIds, contract.fromRegionIds)
    || !sameStringSet(expectedToRegionIds, contract.toRegionIds)
  ) failures.push(`${label}.camera_region_contract_mismatch`);

  const samples = Array.isArray(capture?.samples) ? capture.samples : [];
  if (samples.length < 3) failures.push(`${label}.samples_missing`);
  const stableRequiredResourceIds = samples[0]?.runtime?.requiredResourceIds ?? [];
  const stableRequiredCohortKey = samples[0]?.runtime?.requiredCohortKey;
  const stableRequiredCohortEpoch = samples[0]?.runtime?.requiredCohortEpoch;
  let previousElapsedMs = -1;
  let maximumNativeUnionBytes = 0;
  const transitionStates = [];
  for (const [index, sample] of samples.entries()) {
    const runtime = sample?.runtime;
    const state = runtime?.waterHydrologyTransitionState;
    const opacity = runtime?.waterHydrologyTransitionOpacity;
    const expectedTerrainIds = expectedTerrainResourceIds(sample?.camera, resourceCatalog);
    const mountedTerrainIds = Array.isArray(runtime?.mountedNodes)
      ? runtime.mountedNodes.filter(({ kind }) => kind === "terrain")
        .map(({ resourceId }) => resourceId)
      : [];
    if (
      !Number.isSafeInteger(sample?.elapsedMs)
      || sample.elapsedMs < previousElapsedMs
    ) failures.push(`${label}.sample_${index}.time_invalid`);
    previousElapsedMs = sample?.elapsedMs ?? previousElapsedMs;
    if (
      !Array.isArray(sample?.camera?.origin)
      || !Array.isArray(sample?.camera?.span)
      || sample.camera.span.some((value) => Math.abs(value - 0.074) > 1e-8)
      || sample.camera.origin[0] < Math.min(
        contract.fromCamera.origin[0],
        contract.toCamera.origin[0],
      ) - 1e-8
      || sample.camera.origin[0] > Math.max(
        contract.fromCamera.origin[0],
        contract.toCamera.origin[0],
      ) + 1e-8
      || sample.camera.origin[1] < Math.min(
        contract.fromCamera.origin[1],
        contract.toCamera.origin[1],
      ) - 1e-8
      || sample.camera.origin[1] > Math.max(
        contract.fromCamera.origin[1],
        contract.toCamera.origin[1],
      ) + 1e-8
    ) failures.push(`${label}.sample_${index}.camera_escape`);
    if (
      !sameStringSet(expectedTerrainIds, expectedFromTerrainIds)
      || !sameStringSet(mountedTerrainIds, expectedFromTerrainIds)
      || runtime?.terrainTileCount !== expectedFromTerrainIds.length
      || runtime?.nativeVisible !== expectsNativeTerrain
      || (
        expectsNativeTerrain
          ? runtime?.nativeState !== "ready"
          : !new Set(["idle", undefined]).has(runtime?.nativeState)
      )
      || runtime?.cohortPhase !== "active"
      || runtime?.noVisibleGap !== true
      || runtime?.waterRenderState !== "ready"
    ) failures.push(`${label}.sample_${index}.terrain_loss`);
    if (
      runtime?.requiredReady !== true
      || runtime?.requiredState !== "ready"
      || runtime?.requiredNoVisibleGap !== true
      || runtime?.requiredCohortKey !== stableRequiredCohortKey
      || runtime?.requiredCohortEpoch !== stableRequiredCohortEpoch
      || !sameStringSet(
        runtime?.requiredResourceIds ?? [],
        stableRequiredResourceIds,
      )
    ) failures.push(`${label}.sample_${index}.required_cohort_changed`);
    if (
      !Number.isSafeInteger(runtime?.lowerWaterSurfaceCount)
      || !Number.isSafeInteger(runtime?.lowerWaterVisibleCount)
      || runtime.lowerWaterVisibleCount < 1
      || runtime.lowerWaterVisibleCount > runtime.lowerWaterSurfaceCount
    ) failures.push(`${label}.sample_${index}.lower_water_flash`);
    if (
      !new Set(["fading-in", "fading-out", "stable", "zero"]).has(state)
      || !Number.isFinite(opacity)
      || opacity < 0
      || opacity > 1
      || (state === "stable" && opacity !== 1)
      || (state === "zero" && opacity !== 0)
    ) failures.push(`${label}.sample_${index}.transition_state_invalid`);
    transitionStates.push(state);

    const regionIds = uniqueStringArray(
      runtime?.waterHydrologyAssetRegionIds,
      failures,
      `${label}.sample_${index}.mounted_regions`,
    );
    const resourceIds = uniqueStringArray(
      runtime?.waterHydrologyAssetResourceIds,
      failures,
      `${label}.sample_${index}.mounted_resources`,
    );
    const resourcePaths = uniqueStringArray(
      runtime?.waterHydrologyAssetResourcePaths,
      failures,
      `${label}.sample_${index}.mounted_paths`,
    );
    const resources = resourceIds.map((id) => resourceCatalog?.[id]);
    if (
      resourceIds.length > 2
      || resourceIds.length !== regionIds.length
      || resourceIds.length !== resourcePaths.length
      || resources.some((resource, resourceIndex) => (
        resource?.kind !== "hydrology"
        || resource.path !== resourcePaths[resourceIndex]
        || resource.regionId !== regionIds[resourceIndex]
        || resource.tier !== runtime?.waterHydrologyAssetTier
      ))
      || resources.reduce(
        (total, resource) => total + (resource?.decodedBytes ?? 0),
        0,
      ) !== runtime?.waterHydrologyAssetBytes
      || runtime?.waterHydrologySamplerSlotCount !== resourceIds.length
      || (
        resourceIds.length === 0
        && !new Set(["none", undefined]).has(runtime?.waterHydrologyAssetTier)
      )
      || (
        resourceIds.length > 0
        && !new Set(["detail", "fallback"]).has(runtime?.waterHydrologyAssetTier)
      )
    ) failures.push(`${label}.sample_${index}.mounted_cohort_invalid`);
    const allowedRegionIds = new Set([
      ...contract.fromRegionIds,
      ...contract.toRegionIds,
    ]);
    if (regionIds.some((id) => !allowedRegionIds.has(id))) {
      failures.push(`${label}.sample_${index}.wrong_region`);
    }
    if (resourceIds.length === 0 && state !== "zero") {
      failures.push(`${label}.sample_${index}.unexplained_empty_cohort`);
    }
    if (
      !Number.isSafeInteger(runtime?.applicationOwnedDecodedBytes)
      || !Number.isSafeInteger(runtime?.nativeDecodedUnionBytes)
      || runtime.nativeDecodedUnionBytes
        !== runtime.applicationOwnedDecodedBytes + runtime.waterHydrologyAssetBytes
      || runtime.nativeDecodedUnionBytes > NINJAONE_MVP_LIMITS.maximumDecodedBytes
    ) failures.push(`${label}.sample_${index}.native_union_invalid`);
    maximumNativeUnionBytes = Math.max(
      maximumNativeUnionBytes,
      runtime?.nativeDecodedUnionBytes ?? Number.POSITIVE_INFINITY,
    );
  }

  const first = samples[0];
  const last = samples.at(-1);
  if (
    !sameCamera(first?.camera, contract.fromCamera)
    || !sameStringSet(
      first?.runtime?.waterHydrologyAssetRegionIds ?? [],
      contract.fromRegionIds,
    )
    || first?.runtime?.waterHydrologyTransitionState !== "stable"
    || first?.runtime?.waterHydrologyTransitionOpacity !== 1
  ) failures.push(`${label}.stable_start_missing`);
  if (
    !sameCamera(last?.camera, contract.toCamera)
    || !sameStringSet(
      last?.runtime?.waterHydrologyAssetRegionIds ?? [],
      contract.toRegionIds,
    )
    || last?.runtime?.waterHydrologyTransitionState !== "stable"
    || last?.runtime?.waterHydrologyTransitionOpacity !== 1
  ) failures.push(`${label}.stable_end_missing`);

  const transitionTriggered = transitionStates.some((state) => state !== "stable");
  if (capture?.transitionTriggered !== transitionTriggered) {
    failures.push(`${label}.trigger_flag_mismatch`);
  }
  if (!transitionTriggered) failures.push(`${label}.raf_transition_missing`);
  const requiredStates = new Set(["fading-out", "zero", "fading-in"]);
  for (const state of requiredStates) {
    if (!transitionStates.includes(state)) failures.push(`${label}.${state}_missing`);
  }
  if (transitionTriggered) {
    let stage = 0;
    const fadingOut = [];
    const fadingIn = [];
    for (const [index, sample] of samples.entries()) {
      const state = sample.runtime?.waterHydrologyTransitionState;
      const opacity = sample.runtime?.waterHydrologyTransitionOpacity;
      if (state === "stable") {
        if (stage > 0 && stage < 3) failures.push(`${label}.sample_${index}.phase_order`);
        if (stage === 3) stage = 4;
      } else if (state === "fading-out") {
        if (stage > 1) failures.push(`${label}.sample_${index}.phase_order`);
        stage = 1;
        fadingOut.push(opacity);
      } else if (state === "zero") {
        if (stage < 1 || stage > 2) failures.push(`${label}.sample_${index}.phase_order`);
        stage = 2;
      } else if (state === "fading-in") {
        if (stage < 1 || stage > 3) failures.push(`${label}.sample_${index}.phase_order`);
        stage = 3;
        fadingIn.push(opacity);
      }
    }
    if (stage !== 4) failures.push(`${label}.transition_not_settled`);
    if (fadingOut.some((value, index) => index > 0 && value > fadingOut[index - 1])) {
      failures.push(`${label}.fade_out_not_monotonic`);
    }
    if (!fadingOut.some((value) => value > 0 && value < 1)) {
      failures.push(`${label}.fade_out_intermediate_missing`);
    }
    if (fadingIn.some((value, index) => index > 0 && value < fadingIn[index - 1])) {
      failures.push(`${label}.fade_in_not_monotonic`);
    }
    if (!fadingIn.some((value) => value > 0 && value < 1)) {
      failures.push(`${label}.fade_in_intermediate_missing`);
    }
  }

  const frames = Array.isArray(capture?.frames) ? capture.frames : [];
  const expectedFrameIds = ["stable-before", "stable-after"];
  const frameIds = frames.map(({ id }) => id);
  if (
    expectedFrameIds.some((id) => !frameIds.includes(id))
    || new Set(frameIds).size !== frameIds.length
  ) {
    failures.push(`${label}.phase_frames_missing`);
  }
  for (const frame of frames) {
    const expectedState = frame.id.startsWith("stable-") ? "stable" : frame.id;
    if (
      frame.captureSynchronization
        !== "runtime-state-before-and-after-cdp-screenshot"
      || frame.runtime?.waterHydrologyTransitionState !== expectedState
      || frame.runtimeAfter?.waterHydrologyTransitionState !== expectedState
      || frame.runtime?.nativeVisible !== expectsNativeTerrain
      || frame.runtimeAfter?.nativeVisible !== expectsNativeTerrain
      || frame.runtime?.lowerWaterVisibleCount < 1
      || frame.runtimeAfter?.lowerWaterVisibleCount < 1
    ) failures.push(`${label}.frame_${frame.id}.synchronization_invalid`);
  }
  const alphaFrames = Array.isArray(capture?.alphaFrames) ? capture.alphaFrames : [];
  const expectedAlphaIds = ["fading-out", "zero", "fading-in"];
  if (!sameStringSet(alphaFrames.map(({ id }) => id), expectedAlphaIds)) {
    failures.push(`${label}.alpha_phase_frames_missing`);
  }
  for (const frame of alphaFrames) {
    const expectedState = frame.id.startsWith("stable-") ? "stable" : frame.id;
    if (
      frame.alphaBasis !== "regional-minus-zero-baseline"
      || frame.state !== expectedState
      || !Number.isFinite(frame.opacity)
      || frame.opacity < 0
      || frame.opacity > 1
      || (
        new Set(["fading-in", "fading-out"]).has(frame.state)
        && !(frame.opacity > 0 && frame.opacity < 1)
      )
      || (frame.state === "zero" && frame.opacity !== 0)
      || !samples.some((sample) => (
        sample.runtime?.waterHydrologyTransitionState === frame.state
        && sample.runtime?.waterHydrologyTransitionOpacity === frame.opacity
        && sameCamera(sample.camera, frame.camera)
        && sameStringSet(
          frame.fieldResourceIds ?? [],
          (sample.runtime?.waterHydrologyAssetResourceIds ?? []).length > 0
            ? sample.runtime.waterHydrologyAssetResourceIds
            : sample.runtime?.waterHydrologyRequestedResourceIds ?? [],
        )
        && frame.fieldTier === (
          (sample.runtime?.waterHydrologyAssetResourceIds ?? []).length > 0
            ? sample.runtime?.waterHydrologyAssetTier
            : sample.runtime?.waterHydrologyRequestedTier
        )
      ))
    ) failures.push(`${label}.alpha_${frame.id}.state_mismatch`);
  }
  return Object.freeze({
    failures: Object.freeze([...new Set(failures)]),
    maximumNativeUnionBytes,
    pass: failures.length === 0,
    sampleCount: samples.length,
    transitionStates: Object.freeze(transitionStates),
    transitionTriggered,
  });
}

function resolveEvidencePath(evidenceDirectory, value) {
  return path.isAbsolute(value) ? value : path.resolve(evidenceDirectory, value);
}

function validCaptureClip(clip, viewport) {
  return clip
    && viewport
    && Number.isSafeInteger(clip.x)
    && Number.isSafeInteger(clip.y)
    && Number.isSafeInteger(clip.width)
    && Number.isSafeInteger(clip.height)
    && clip.scale === 1
    && clip.x >= 0
    && clip.y >= 0
    && clip.width > 0
    && clip.height > 0
    && clip.x + clip.width <= viewport.width
    && clip.y + clip.height <= viewport.height;
}

function frameMatchesClip(frame, clip) {
  return frame.width === clip.width && frame.height === clip.height;
}

async function frameDifference(firstPath, secondPath) {
  const [first, second] = await Promise.all([
    readRgba(firstPath), readRgba(secondPath),
  ]);
  if (
    first.info.width !== second.info.width
    || first.info.height !== second.info.height
  ) throw new Error("Frame dimensions differ.");
  let changed = 0;
  const pixels = first.info.width * first.info.height;
  for (let index = 0; index < first.data.length; index += 4) {
    const difference = (
      Math.abs(first.data[index] - second.data[index])
      + Math.abs(first.data[index + 1] - second.data[index + 1])
      + Math.abs(first.data[index + 2] - second.data[index + 2])
    ) / 3;
    if (difference >= FRAME_DIFF_THRESHOLD) changed += 1;
  }
  return Object.freeze({
    changedPixelPct: round(changed / pixels * 100),
    changedPixels: changed,
    pass: changed >= Math.max(256, Math.ceil(pixels * 0.001)),
    totalPixels: pixels,
  });
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

function estimateFlowShift(first, second, third, mask) {
  const width = first.info.width;
  const height = first.info.height;
  const delta = (from, to, x, y) => {
    const index = (y * width + x) * 4;
    return luma(to.data[index], to.data[index + 1], to.data[index + 2])
      - luma(from.data[index], from.data[index + 1], from.data[index + 2]);
  };
  let best = { dx: 0, dy: 0, score: Number.NEGATIVE_INFINITY };
  for (let dy = -6; dy <= 6; dy += 1) {
    for (let dx = -6; dx <= 6; dx += 1) {
      let numerator = 0;
      let firstEnergy = 0;
      let secondEnergy = 0;
      for (let y = 8; y < height - 8; y += 3) {
        for (let x = 8; x < width - 8; x += 3) {
          const shiftedX = x + dx;
          const shiftedY = y + dy;
          const maskIndex = (y * width + x) * 4;
          const shiftedMaskIndex = (shiftedY * width + shiftedX) * 4;
          if (
            mask.data[maskIndex + 3] < ALPHA_PRESENT
            || mask.data[shiftedMaskIndex + 3] < ALPHA_PRESENT
          ) continue;
          const firstDelta = delta(first, second, x, y);
          const secondDelta = delta(second, third, shiftedX, shiftedY);
          numerator += firstDelta * secondDelta;
          firstEnergy += firstDelta ** 2;
          secondEnergy += secondDelta ** 2;
        }
      }
      const denominator = Math.sqrt(firstEnergy * secondEnergy);
      const score = denominator === 0 ? -1 : numerator / denominator;
      if (score > best.score) best = { dx, dy, score };
    }
  }
  return Object.freeze({ ...best, score: round(best.score) });
}

async function auditMotionCapture(capture, evidenceDirectory, expectedDimensions) {
  const failures = [];
  if (!Array.isArray(capture.frames) || capture.frames.length < 3) {
    return { failures: ["needs_three_frames"], id: capture.id, pass: false };
  }
  if (!capture.maskPath) {
    return { failures: ["mask_missing"], id: capture.id, pass: false };
  }
  const framePaths = capture.frames.slice(0, 3).map((frame) => (
    resolveEvidencePath(evidenceDirectory, typeof frame === "string" ? frame : frame.imagePath)
  ));
  const maskPath = resolveEvidencePath(evidenceDirectory, capture.maskPath);
  const directionMaskPath = capture.directionMaskPath
    ? resolveEvidencePath(evidenceDirectory, capture.directionMaskPath)
    : maskPath;
  const [first, second, third, mask, directionMask] = await Promise.all([
    readRgba(framePaths[0]), readRgba(framePaths[1]), readRgba(framePaths[2]), readRgba(maskPath),
    readRgba(directionMaskPath),
  ]);
  const dimensions = [first, second, third, mask, directionMask].map(({ info }) => (
    `${info.width}x${info.height}`
  ));
  if (new Set(dimensions).size !== 1) {
    return { failures: ["dimension_mismatch"], id: capture.id, pass: false };
  }
  if (
    first.info.width !== expectedDimensions?.width
    || first.info.height !== expectedDimensions?.height
  ) failures.push("declared_viewport_dimension_mismatch");

  let changedPixels = 0;
  let changedInsideMask = 0;
  let changedOutsideMask = 0;
  let alphaChangedPixels = 0;
  let maskPixels = 0;
  const totalPixels = first.info.width * first.info.height;
  for (let index = 0; index < first.data.length; index += 4) {
    const difference = (
      Math.abs(first.data[index] - third.data[index])
      + Math.abs(first.data[index + 1] - third.data[index + 1])
      + Math.abs(first.data[index + 2] - third.data[index + 2])
    ) / 3;
    const insideMask = mask.data[index + 3] >= ALPHA_PRESENT;
    if (insideMask) maskPixels += 1;
    if (first.data[index + 3] !== third.data[index + 3]) alphaChangedPixels += 1;
    if (difference < FRAME_DIFF_THRESHOLD) continue;
    changedPixels += 1;
    if (insideMask) changedInsideMask += 1;
    else changedOutsideMask += 1;
  }
  const confinement = changedPixels === 0 ? 0 : changedInsideMask / changedPixels;
  const maskCoverage = maskPixels / totalPixels;
  if (changedPixels === 0) failures.push("zero_frame_difference");
  if (maskPixels === 0) failures.push("motion_mask_empty");
  if (maskCoverage > MAX_MOTION_MASK_COVERAGE) failures.push("motion_mask_too_broad");
  if (confinement < 0.99) failures.push("motion_escapes_mask");
  if (alphaChangedPixels !== 0) failures.push("alpha_or_shoreline_changed");
  const flowVector = capture.flowVector;
  let direction = null;
  if (
    !Array.isArray(flowVector)
    || flowVector.length !== 2
    || !flowVector.some((value) => Math.abs(value) > 0)
  ) failures.push("directional_flow_vector_missing");
  else {
    const shift = estimateFlowShift(first, second, third, directionMask);
    const shiftLength = Math.hypot(shift.dx, shift.dy);
    const flowLength = Math.hypot(flowVector[0], flowVector[1]);
    const alignment = shiftLength === 0
      ? 0
      : (shift.dx * flowVector[0] + shift.dy * flowVector[1])
        / (shiftLength * flowLength);
    direction = Object.freeze({ ...shift, alignment: round(alignment) });
    if (
      shiftLength === 0
      || shift.score < MIN_FLOW_CORRELATION
      || alignment < 0.25
    ) failures.push("flow_direction_not_proven");
  }
  return Object.freeze({
    alphaChangedPixels,
    changedInsideMask,
    changedOutsideMask,
    changedPixelPct: round(changedPixels / totalPixels * 100),
    confinementPct: round(confinement * 100),
    direction,
    failures: Object.freeze(failures),
    id: capture.id,
    maskCoveragePct: round(maskCoverage * 100),
    pass: failures.length === 0,
  });
}

async function auditHydrologyAlphaFrames(
  capture,
  evidenceDirectory,
  expectedDimensions,
) {
  const failures = [];
  if (!Array.isArray(capture.alphaFrames) || capture.alphaFrames.length !== 3) {
    return Object.freeze({ failures: ["alpha_frames_missing"], pass: false });
  }
  const framePaths = capture.alphaFrames.map((frame) => (
    resolveEvidencePath(evidenceDirectory, frame)
  ));
  const maskPath = resolveEvidencePath(evidenceDirectory, capture.maskPath);
  const [first, second, third, mask] = await Promise.all([
    readRgba(framePaths[0]),
    readRgba(framePaths[1]),
    readRgba(framePaths[2]),
    readRgba(maskPath),
  ]);
  const dimensions = [first, second, third, mask].map(({ info }) => (
    `${info.width}x${info.height}`
  ));
  if (new Set(dimensions).size !== 1) {
    return Object.freeze({ failures: ["alpha_dimension_mismatch"], pass: false });
  }
  if (
    first.info.width !== expectedDimensions.width
    || first.info.height !== expectedDimensions.height
  ) failures.push("alpha_declared_viewport_dimension_mismatch");
  let alphaChangedPixels = 0;
  let alphaOutsideMaskPixels = 0;
  let internalLuminance = 0;
  let presentInsideMaskPixels = 0;
  for (let index = 0; index < first.data.length; index += 4) {
    const alphas = [
      first.data[index + 3],
      second.data[index + 3],
      third.data[index + 3],
    ];
    if (alphas[0] !== alphas[1] || alphas[1] !== alphas[2]) {
      alphaChangedPixels += 1;
    }
    const insideMask = mask.data[index + 3] >= ALPHA_PRESENT;
    if (!insideMask && alphas.some((alpha) => alpha > 0)) {
      alphaOutsideMaskPixels += 1;
    }
    if (insideMask && alphas[0] > 0) {
      presentInsideMaskPixels += 1;
      internalLuminance += luma(
        first.data[index],
        first.data[index + 1],
        first.data[index + 2],
      );
    }
  }
  const meanInternalLuminance = presentInsideMaskPixels > 0
    ? internalLuminance / presentInsideMaskPixels
    : 0;
  if (alphaChangedPixels !== 0) failures.push("alpha_boundary_changed");
  if (alphaOutsideMaskPixels !== 0) failures.push("alpha_outside_registered_mask");
  if (presentInsideMaskPixels === 0) failures.push("registered_alpha_missing");
  if (meanInternalLuminance <= 0) failures.push("internal_luminance_missing");
  return Object.freeze({
    alphaChangedPixels,
    alphaOutsideMaskPixels,
    failures: Object.freeze(failures),
    meanInternalLuminance: round(meanInternalLuminance),
    pass: failures.length === 0,
    presentInsideMaskPixels,
  });
}

export async function auditNinjaOneEnvironmentHydrologyBoundaryAlphaFrame({
  evidenceDirectory,
  frame,
  hydrologyManifest,
  referenceRoot,
}) {
  const failures = [];
  if (
    typeof frame?.imagePath !== "string"
    || typeof frame?.maskPath !== "string"
    || frame?.alphaBasis !== "regional-minus-zero-baseline"
    || !validCaptureClip(frame?.clip, {
      height: frame?.clip?.y + frame?.clip?.height,
      width: frame?.clip?.x + frame?.clip?.width,
    })
    || !Array.isArray(frame?.fieldResourceIds)
    || frame.fieldResourceIds.length < 1
    || frame.fieldResourceIds.length > 2
    || !new Set(["detail", "fallback"]).has(frame?.fieldTier)
    || !new Set(["fading-in", "fading-out", "stable", "zero"]).has(frame?.state)
    || !Number.isFinite(frame?.opacity)
    || frame.opacity < 0
    || frame.opacity > 1
    || (frame.state === "stable" && frame.opacity !== 1)
    || (frame.state === "zero" && frame.opacity !== 0)
  ) return Object.freeze({ failures: ["contract_invalid"], pass: false });
  const imagePath = resolveEvidencePath(evidenceDirectory, frame.imagePath);
  const maskPath = resolveEvidencePath(evidenceDirectory, frame.maskPath);
  const expected = await deriveNinjaOneHydrologyMotionContract({
    camera: frame.camera,
    clip: frame.clip,
    fieldResourceIds: frame.fieldResourceIds,
    fieldTier: frame.fieldTier,
    manifest: hydrologyManifest,
    root: referenceRoot,
  });
  const [image, mask, maskSha256] = await Promise.all([
    readRgba(imagePath),
    readRgba(maskPath),
    fileSha256(maskPath),
  ]);
  if (
    image.info.width !== frame.clip.width
    || image.info.height !== frame.clip.height
    || mask.info.width !== frame.clip.width
    || mask.info.height !== frame.clip.height
  ) failures.push("dimensions_mismatch");
  if (
    frame.maskSha256 !== expected.fullMaskSha256
    || maskSha256 !== expected.fullMaskSha256
    || frame.fieldTier !== expected.fieldTier
    || !sameStringSet(frame.fieldResourceIds, expected.fieldResourceIds)
  ) failures.push("manifest_binding_mismatch");
  let alphaOutsideMaskPixels = 0;
  let alphaAboveDeclaredOpacityPixels = 0;
  let maximumObservedAlpha = 0;
  let presentInsideMaskPixels = 0;
  const maximumDeclaredAlpha = Math.min(255, Math.ceil(frame.opacity * 255) + 1);
  for (let index = 0; index < image.data.length; index += 4) {
    const alpha = image.data[index + 3];
    const inside = mask.data[index + 3] >= ALPHA_PRESENT;
    maximumObservedAlpha = Math.max(maximumObservedAlpha, alpha);
    if (!inside && alpha > 0) alphaOutsideMaskPixels += 1;
    if (inside && alpha > 0) presentInsideMaskPixels += 1;
    if (alpha > maximumDeclaredAlpha) alphaAboveDeclaredOpacityPixels += 1;
  }
  if (alphaOutsideMaskPixels !== 0) failures.push("alpha_outside_registered_mask");
  if (frame.opacity === 0 && maximumObservedAlpha !== 0) {
    failures.push("alpha_present_at_zero_opacity");
  }
  if (alphaAboveDeclaredOpacityPixels !== 0) {
    failures.push("alpha_exceeds_declared_opacity");
  }
  if (frame.opacity > 0 && presentInsideMaskPixels === 0) {
    failures.push("registered_alpha_missing_at_nonzero_opacity");
  }
  return Object.freeze({
    alphaAboveDeclaredOpacityPixels,
    alphaOutsideMaskPixels,
    failures: Object.freeze(failures),
    id: frame.id,
    maximumDeclaredAlpha,
    maximumObservedAlpha,
    pass: failures.length === 0,
    presentInsideMaskPixels,
  });
}

function parsedFoliageTransform(value) {
  const match = /^rotate\((-?[\d.]+)deg\) skewX\((-?[\d.]+)deg\)$/.exec(
    value ?? "",
  );
  return match ? [Number(match[1]), Number(match[2])] : null;
}

export async function auditFoliageIsolationEvidence({
  coastManifest = null,
  evidence,
  evidencePath,
  foliageManifest,
  nativeManifest,
  referenceRoot = path.dirname(evidencePath),
  seamManifest,
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
    || producerUrl.searchParams.get("view") !== "ninjaone-environment"
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
      || evidence?.bindings?.cssBlock?.bytes !== 1086
      || bindings.cssBlock.sha256
        !== "24FD95F038A9535F0AB4E95C133F6C50B8B1F2A30600F5A4B9BEF428365164D6"
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
  const expectedCamera = NINJAONE_MVP_FIXED_CAMERAS.C2;
  if (!sameCamera(proof?.fixedCamera, expectedCamera)) {
    failures.push("foliage_isolation.camera_not_fixed_C2");
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
    || proof?.isolation?.wildlife !== "display:none!important"
    || proof?.isolation?.seams !== "visibility:hidden!important"
  ) failures.push("foliage_isolation.state_not_explicit");

  const expectedInstances = (foliageManifest?.instances ?? [])
    .filter(({ gridCell }) => gridCell === "C2")
    .slice()
    .sort((left, right) => left.id.localeCompare(right.id));
  const expectedInstanceIds = expectedInstances.map(({ id }) => id);
  const expectedResourceIds = (foliageManifest?.resources ?? [])
    .map(({ id }) => id)
    .sort();
  const expectedFoliageBytes = (foliageManifest?.resources ?? [])
    .reduce((total, resource) => total + resource.decodedBytes, 0);
  const runtime = proof?.runtime;
  const isolationCatalog = createNinjaOneEnvironmentMvpResourceCatalog({
    nativeManifest,
    supplementalManifests: [foliageManifest, seamManifest, coastManifest].filter(Boolean),
  });
  const expectedTerrainIds = expectedTerrainResourceIds(expectedCamera, isolationCatalog);
  const expectedTerrainBytes = catalogBytes(
    expectedTerrainIds,
    isolationCatalog,
    failures,
    "foliage_isolation.terrain",
  );
  const expectedSupplementalIds = expectedSupplementalResourceIds(
    expectedCamera,
    isolationCatalog,
    {
      terrainDecodedBytes: expectedTerrainBytes,
    },
  );
  const expectedApplicationOwnedIds = [
    ...expectedTerrainIds,
    ...expectedSupplementalIds,
  ];
  const expectedApplicationOwnedBytes = catalogBytes(
    expectedApplicationOwnedIds,
    isolationCatalog,
    failures,
    "foliage_isolation.application_owned",
  );
  const seamResourceIds = new Set((seamManifest?.resources ?? []).map(({ id }) => id));
  const expectedSeamIds = expectedSupplementalIds.filter((id) => seamResourceIds.has(id));
  const expectedSeamBytes = catalogBytes(
    expectedSeamIds,
    isolationCatalog,
    failures,
    "foliage_isolation.seams",
  );
  const expectedSeamNodeCount = expectedSeamIds.reduce(
    (total, id) => total + isolationCatalog[id].paintedNodeCount,
    0,
  );
  if (
    expectedInstances.length !== 2
    || expectedResourceIds.length !== 4
    || expectedFoliageBytes !== foliageManifest?.budgets?.foliageDecodedBytes
    || foliageManifest?.budgets?.combinedDecodedBytes
      !== expectedTerrainBytes + expectedFoliageBytes
    || runtime?.nativeState !== "ready"
    || runtime?.nativeVisible !== true
    || runtime?.terrainNodeCount !== 4
    || runtime?.terrainDecodedBytes !== 25_160_448
    || !sameStringSet(runtime?.terrainIds ?? [], expectedTerrainIds)
    || runtime?.foliageState !== "ready"
    || runtime?.foliageVisible !== true
    || runtime?.foliageInstanceCount !== 2
    || runtime?.foliageMountedNodeCount !== 4
    || runtime?.foliageSelectedNodeCount !== 4
    || runtime?.foliageSelectedDecodedBytes !== expectedFoliageBytes
    || !sameStringSet(runtime?.foliageMountedResourceIds ?? [], expectedResourceIds)
    || !sameStringSet(runtime?.foliageSelectedResourceIds ?? [], expectedResourceIds)
    || runtime?.legacyFoliageNodeCount !== 0
    || !sameStringSet(
      runtime?.applicationOwnedResourceIds ?? [],
      expectedApplicationOwnedIds,
    )
    || !sameStringSet(
      runtime?.selectedSupplementalResourceIds ?? [],
      expectedSupplementalIds,
    )
    || runtime?.seamDecodedBytes !== expectedSeamBytes
    || runtime?.seamNodeCount !== expectedSeamNodeCount
    || !sameStringSet(runtime?.seamResourceIds ?? [], expectedSeamIds)
    || !Number.isSafeInteger(runtime?.cohortEpoch)
    || runtime.cohortEpoch < 1
    || typeof runtime?.cohortKey !== "string"
    || runtime.cohortKey.length === 0
    || runtime?.applicationOwnedDecodedBytes !== expectedApplicationOwnedBytes
    || runtime.applicationOwnedDecodedBytes > NINJAONE_MVP_LIMITS.maximumDecodedBytes
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
    for (const [index, states] of proof.normalStates.entries()) {
      if (
        !Array.isArray(states)
        || !sameStringSet(states.map(({ instanceId }) => instanceId), expectedInstanceIds)
        || states.some((state) => (
          state.animation !== "ninjaone-native-canopy-sway"
          || state.opacity !== "1"
          || state.transform === "none"
        ))
      ) failures.push(`foliage_isolation.normal_state.${index}`);
    }
  }
  if (
    forcedStates.length !== 2
    || !sameStringSet(forcedStates.map(({ progress }) => String(progress)), ["0", "0.37"])
  ) failures.push("foliage_isolation.forced_state_sequence");
  for (const state of forcedStates) {
    const progress = state.progress;
    const nodes = Array.isArray(state.nodeStates) ? state.nodeStates : [];
    if (!sameStringSet(nodes.map(({ instanceId }) => instanceId), expectedInstanceIds)) {
      failures.push(`foliage_isolation.forced_${progress}.instances`);
      continue;
    }
    for (const node of nodes) {
      const instance = expectedInstances.find(({ id }) => id === node.instanceId);
      const expected = progress === 0
        ? [
            Number((-instance.bendDegrees * 0.52).toFixed(3)),
            Number((-instance.lagDegrees * 0.55).toFixed(3)),
          ]
        : [
            Number(instance.bendDegrees.toFixed(3)),
            Number(instance.lagDegrees.toFixed(3)),
          ];
      const declared = parsedFoliageTransform(node.expectedTransform);
      const applied = parsedFoliageTransform(node.appliedTransform);
      if (
        node.progress !== progress
        || node.animation !== "none"
        || node.opacity !== "1"
        || !/^matrix\(/.test(node.transform ?? "")
        || !declared
        || !applied
        || declared.some((value, axis) => Math.abs(value - expected[axis]) > 1e-6)
        || applied.some((value, axis) => Math.abs(value - expected[axis]) > 1e-6)
      ) failures.push(`foliage_isolation.forced_${progress}.${node.instanceId}`);
    }
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
    "normal-1", "normal-2", "normal-3", "forced-0", "forced-37",
  ];
  const extractionScriptPath = "scripts/extract-ninjaone-foliage-isolation-crops.mjs";
  if (
    companion?.schemaVersion !== 1
    || companion?.producer?.id !== "ninjaone-foliage-isolation-scene-crop-r1"
    || companion?.producer?.scriptPath !== extractionScriptPath
    || !sameCamera(companion?.fixedCamera, NINJAONE_MVP_FIXED_CAMERAS.C2)
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

export async function auditRuntimeCaptureEvidence({
  evidence,
  evidencePath,
  hydrologyManifest,
  referenceRoot = path.dirname(evidencePath),
  resourceCatalog,
}) {
  const failures = [];
  const evidenceDirectory = path.dirname(evidencePath);
  if (evidence?.schemaVersion !== 1) failures.push("schema_version_missing");
  let producerUrl = null;
  try {
    producerUrl = new URL(evidence?.producer?.url);
  } catch {
    // The producer contract failure below reports malformed URLs.
  }
  const localHostnames = new Set(["127.0.0.1", "localhost", "[::1]"]);
  if (
    evidence?.producer?.id !== NINJAONE_MVP_CAPTURE_PRODUCER_ID
    || evidence?.producer?.automation !== "browser-dom-screenshot"
    || !producerUrl
    || producerUrl.protocol !== "http:"
    || !localHostnames.has(producerUrl.hostname)
    || producerUrl.pathname !== "/"
    || producerUrl.searchParams.get("view") !== "ninjaone-environment"
    || !Number.isFinite(Date.parse(evidence?.producer?.capturedAt ?? ""))
    || !Number.isSafeInteger(evidence?.producer?.viewport?.width)
    || !Number.isSafeInteger(evidence?.producer?.viewport?.height)
    || evidence.producer.viewport.width < 800
    || evidence.producer.viewport.height < 600
  ) failures.push("capture_producer_contract_missing");
  const producerFile = path.resolve(referenceRoot, NINJAONE_MVP_CAPTURE_PRODUCER_PATH);
  let producerSha = null;
  try {
    producerSha = await fileSha256(producerFile);
  } catch {
    failures.push("capture_producer_file_missing");
  }
  if (
    evidence?.producer?.scriptPath !== NINJAONE_MVP_CAPTURE_PRODUCER_PATH
    || evidence?.producer?.scriptSha256 !== producerSha
  ) failures.push("capture_producer_sha_mismatch");
  let currentBindings = null;
  try {
    currentBindings = await createNinjaOneEnvironmentCaptureBindings(referenceRoot);
  } catch {
    failures.push("capture_binding_files_unreadable");
  }
  const bindingPaths = evidence?.bindings?.files
    && typeof evidence.bindings.files === "object"
    ? Object.keys(evidence.bindings.files)
    : [];
  const currentBindingPaths = currentBindings ? Object.keys(currentBindings.files) : [];
  if (
    !currentBindings
    || evidence?.bindings?.aggregateSha256 !== currentBindings.aggregateSha256
    || !sameStringSet(bindingPaths, currentBindingPaths)
  ) {
    failures.push("capture_binding_paths_mismatch");
  } else {
    for (const relativeFile of currentBindingPaths) {
      if (evidence.bindings.files[relativeFile] !== currentBindings.files[relativeFile]) {
        failures.push(`capture_binding_sha_mismatch.${relativeFile}`);
      }
    }
  }
  if (!resourceCatalog || Object.keys(resourceCatalog).length === 0) {
    failures.push("resource_catalog_missing");
  }
  const checkpointMetrics = [];
  for (const [id, expected] of Object.entries(NINJAONE_MVP_FIXED_CAMERAS)) {
    const checkpoint = evidence?.checkpoints?.[id];
    if (!checkpoint) {
      failures.push(`checkpoint.${id}.missing`);
      continue;
    }
    if (!sameCamera(checkpoint.camera, expected)) {
      failures.push(`checkpoint.${id}.camera_not_fixed`);
    }
    validateRuntimeSample(
      checkpoint.runtime, failures, `checkpoint.${id}`, resourceCatalog,
      checkpoint.camera,
    );
    if (
      checkpoint.runtime?.nativeVisible !== true
      || checkpoint.runtime?.nativeState !== "ready"
      || checkpoint.runtime?.cohortPhase !== "active"
      || checkpoint.runtime?.terrainTileCount !== 4
    ) failures.push(`checkpoint.${id}.native_ready_cohort_missing`);
    if (!checkpoint.imagePath) {
      failures.push(`checkpoint.${id}.image_missing`);
      continue;
    }
    const imagePath = resolveEvidencePath(evidenceDirectory, checkpoint.imagePath);
    const expectedReferencePath = path.resolve(
      referenceRoot, NINJAONE_MVP_CHECKPOINT_REFERENCES[id],
    );
    const referencePath = checkpoint.referencePath
      ? resolveEvidencePath(evidenceDirectory, checkpoint.referencePath)
      : null;
    if (!referencePath || path.normalize(referencePath) !== path.normalize(expectedReferencePath)) {
      failures.push(`checkpoint.${id}.native_original_reference_mismatch`);
    }
    try {
      await Promise.all([access(imagePath), access(expectedReferencePath)]);
      const [frame, referenceFrame, referenceSha256] = await Promise.all([
        imageFrameStats(imagePath), imageFrameStats(expectedReferencePath),
        fileSha256(expectedReferencePath),
      ]);
      if (
        !validCaptureClip(checkpoint.clip, evidence.producer.viewport)
        || !frameMatchesClip(frame, checkpoint.clip)
      ) failures.push(`checkpoint.${id}.capture_dimensions_mismatch`);
      if (!frame.pass) failures.push(`checkpoint.${id}.blank_or_flat_green`);
      if (
        referenceFrame.width !== 2896
        || referenceFrame.height !== 2172
        || !referenceFrame.pass
      ) failures.push(`checkpoint.${id}.native_original_reference_invalid`);
      if (checkpoint.referenceSha256 !== referenceSha256) {
        failures.push(`checkpoint.${id}.native_original_reference_sha_mismatch`);
      }
      checkpointMetrics.push({
        frame,
        id,
        imagePath,
        referenceFrame,
        referencePath: expectedReferencePath,
      });
    } catch {
      failures.push(`checkpoint.${id}.image_unreadable`);
    }
  }

  const transitionMetrics = [];
  const transitionFrames = evidence?.lodTransition?.frames;
  if (
    !Array.isArray(transitionFrames)
    || transitionFrames.length !== NINJAONE_MVP_LOD_SEQUENCE.length
  ) {
    failures.push("lod_transition.frames_missing");
  } else {
    let previousImagePath = null;
    for (let index = 0; index < transitionFrames.length; index += 1) {
      const frame = transitionFrames[index];
      const expectedFrame = NINJAONE_MVP_LOD_SEQUENCE[index];
      validateRuntimeSample(
        frame.runtime, failures, `lod_transition.${index}`, resourceCatalog,
        frame.camera,
      );
      if (frame.id !== expectedFrame.id) {
        failures.push(`lod_transition.${index}.id_mismatch`);
      }
      const expectedDemand = [false, true, true, true, false][index];
      if (frame.runtime?.nativeDemand !== expectedDemand) {
        failures.push(`lod_transition.${index}.hysteresis_mismatch`);
      }
      if (
        (index === 0 || index === 4)
        && (
          frame.runtime?.nativeVisible !== false
          || frame.runtime?.terrainTileCount !== 0
        )
      ) failures.push(`lod_transition.${index}.low_lod_native_present`);
      if (
        (index === 2 || index === 3)
        && (
          frame.runtime?.nativeVisible !== true
          || frame.runtime?.nativeState !== "ready"
          || frame.runtime?.cohortPhase !== "active"
        )
      ) failures.push(`lod_transition.${index}.ready_native_missing`);
      if (
        !Array.isArray(frame.camera?.span)
        || frame.camera.span.some((value) => Math.abs(value - expectedFrame.span) > 1e-9)
      ) failures.push(`lod_transition.${index}.span_mismatch`);
      const center = Array.isArray(frame.camera?.origin)
        && Array.isArray(frame.camera?.span)
        ? frame.camera.origin.map(
          (value, axis) => value + frame.camera.span[axis] * 0.5,
        )
        : null;
      if (
        !Array.isArray(center)
        || center.some((value, axis) => (
          Math.abs(value - NINJAONE_MVP_FIXED_CAMERAS.B2.center[axis]) > 1e-8
        ))
      ) failures.push(`lod_transition.${index}.center_not_fixed_B2`);
      if (!frame.imagePath || !frame.camera) {
        failures.push(`lod_transition.${index}.metric_evidence_missing`);
        continue;
      }
      const imagePath = resolveEvidencePath(evidenceDirectory, frame.imagePath);
      try {
        const frameStats = await imageFrameStats(imagePath);
        if (
          !validCaptureClip(frame.clip, evidence.producer.viewport)
          || !frameMatchesClip(frameStats, frame.clip)
        ) failures.push(`lod_transition.${index}.capture_dimensions_mismatch`);
        if (!frameStats.pass) failures.push(`lod_transition.${index}.blank_or_flat_green`);
        const difference = previousImagePath
          ? await frameDifference(previousImagePath, imagePath)
          : null;
        if (difference && !difference.pass) {
          failures.push(`lod_transition.${index}.stale_frame`);
        }
        transitionMetrics.push({ differenceFromPrevious: difference, frame: frameStats });
        previousImagePath = imagePath;
      } catch {
        failures.push(`lod_transition.${index}.image_unreadable`);
      }
    }
  }

  const residencySamples = evidence?.residencySamples;
  const residencyFrameMetrics = [];
  const requiredResidencySteps = [
    "world-low", "territory-low", "site-preload-off", "preload-enter",
    "close-ready", "pan-evicting", "pan-loading", "pan-first-promoted", "pan-ready",
    "reverse-hysteresis", "released",
  ];
  if (
    !Array.isArray(residencySamples)
    || residencySamples.length !== requiredResidencySteps.length
  ) {
    failures.push("residency_samples_missing");
  } else {
    const demandBySequence = new Map();
    const sampleByStep = new Map();
    residencySamples.forEach((sample, index) => {
      validateRuntimeSample(
        sample.runtime, failures, `residency.${index}`, resourceCatalog,
        sample.camera,
        {
          allowOptionalPostPromotionPending: sample.stepId === "pan-first-promoted",
        },
      );
      if (typeof sample.stepId !== "string" || sampleByStep.has(sample.stepId)) {
        failures.push(`residency.${index}.step_id_invalid`);
      } else {
        sampleByStep.set(sample.stepId, sample);
      }
      const sequence = sample.sequenceId ?? "default";
      const previousDemand = demandBySequence.get(sequence) ?? false;
      const span = Math.max(...(sample.camera?.span ?? [Number.POSITIVE_INFINITY]));
      const expectedDemand = sample.active === false
        ? false
        : previousDemand
          ? span <= NINJAONE_MVP_NATIVE_RELEASE_MAXIMUM_CAMERA_SPAN
          : span <= NINJAONE_MVP_CLOSE_ASSET_PRELOAD_MAXIMUM_CAMERA_SPAN;
      if (sample.runtime?.nativeDemand !== expectedDemand) {
        failures.push(`residency.${index}.hysteresis_mismatch`);
      }
      if (!expectedDemand && (sample.runtime?.terrainTileCount ?? 0) !== 0) {
        failures.push(`residency.${index}.mounted_outside_threshold`);
      }
      demandBySequence.set(sequence, expectedDemand);
    });
    for (const step of requiredResidencySteps) {
      if (!sampleByStep.has(step)) failures.push(`residency.step.${step}.missing`);
    }
    const residencyStepIndexes = requiredResidencySteps.map((step) => (
      residencySamples.findIndex((sample) => sample.stepId === step)
    ));
    if (residencyStepIndexes.some((value, index) => (
      value < 0 || (index > 0 && value <= residencyStepIndexes[index - 1])
    ))) failures.push("residency.step_order_invalid");
    const worldLow = sampleByStep.get("world-low");
    const territoryLow = sampleByStep.get("territory-low");
    const siteOff = sampleByStep.get("site-preload-off");
    const preloadEnter = sampleByStep.get("preload-enter");
    const reverse = sampleByStep.get("reverse-hysteresis");
    const released = sampleByStep.get("released");
    if (
      worldLow?.runtime?.lodTier !== "world"
      || worldLow?.runtime?.nativeDemand !== false
      || worldLow?.runtime?.mountedNodes?.length !== 0
      || territoryLow?.runtime?.lodTier !== "territory"
      || territoryLow?.runtime?.nativeDemand !== false
      || territoryLow?.runtime?.mountedNodes?.length !== 0
      || siteOff?.runtime?.nativeDemand !== false
      || preloadEnter?.runtime?.nativeDemand !== true
      || reverse?.runtime?.nativeDemand !== true
      || released?.runtime?.nativeDemand !== false
    ) failures.push("residency.lod_threshold_sequence_not_proven");
    const evicting = sampleByStep.get("pan-evicting");
    const loading = sampleByStep.get("pan-loading");
    const firstPromoted = sampleByStep.get("pan-first-promoted");
    const readyBefore = sampleByStep.get("close-ready");
    const readyAfter = sampleByStep.get("pan-ready");
    if (
      evicting?.runtime?.cohortPhase !== "evicting"
      || evicting?.runtime?.nativeVisible !== false
      || evicting?.runtime?.terrainTileCount !== 0
      || evicting?.runtime?.lowerDetailAvailable !== true
    ) failures.push("residency.pan_eviction_not_proven");
    if (
      evicting?.captureSynchronization !== "one-painted-frame-before-debugger"
      || evicting?.paintedFramesBeforeCapture !== 1
    ) failures.push("residency.pan_eviction_frame_not_painted");
    if (
      loading?.runtime?.cohortPhase !== "active"
      || loading?.runtime?.terrainState !== "ready"
      || loading?.runtime?.nativeState !== "loading"
      || loading?.runtime?.nativeVisible !== false
      || loading?.runtime?.requiredState !== "loading"
      || loading?.runtime?.requiredReady !== false
      || loading?.runtime?.requiredPreloadActive !== true
      || loading?.runtime?.requiredResourceIds?.length < 1
      || !Array.isArray(loading?.runtime?.requiredChildren)
      || loading.runtime.requiredChildren.filter(
        ({ selectedResourceIds }) => selectedResourceIds.length > 0,
      ).some((child) => (
        child.state !== "loading"
        || child.visible !== false
        || child.svgLoadedCount >= child.selectedResourceIds.length
        || child.hiddenPaintedFrames >= 2
      ))
    ) failures.push("residency.pan_late_decode_not_proven");
    const heldRequiredRequestPaths = uniqueStringArray(
      loading?.heldRequiredRequestPaths,
      failures,
      "residency.pan-loading.held_required_request_paths",
    );
    const expectedHeldRequiredRequestPaths = expectedRequiredSupplementalResourceIds(
      loading?.camera,
      resourceCatalog,
    ).map((id) => new URL(resourceCatalog[id].path, "http://localhost").pathname);
    if (
      loading?.captureSynchronization !== "required-image-request-gate"
      || !Number.isSafeInteger(loading?.heldRequiredRequestCount)
      || loading.heldRequiredRequestCount < expectedHeldRequiredRequestPaths.length
      || !sameStringSet(heldRequiredRequestPaths, expectedHeldRequiredRequestPaths)
    ) failures.push("residency.pan_required_request_gate_not_proven");
    if (
      firstPromoted?.captureSynchronization
        !== "one-painted-frame-after-required-promotion"
      || firstPromoted?.paintedFramesAfterPromotion !== 1
      || firstPromoted?.runtime?.nativeState !== "ready"
      || firstPromoted?.runtime?.nativeVisible !== true
      || firstPromoted?.runtime?.requiredState !== "ready"
      || firstPromoted?.runtime?.requiredReady !== true
      || firstPromoted?.runtime?.requiredChildren?.some((child) => (
        child.state !== "ready"
        || child.visible !== true
        || child.svgLoadedCount !== child.selectedResourceIds.length
        || child.hiddenPaintedFrames < 2
      ))
      || firstPromoted?.runtime?.cohortEpoch !== loading?.runtime?.cohortEpoch
      || firstPromoted?.runtime?.requiredCohortEpoch
        !== loading?.runtime?.requiredCohortEpoch
      || !sameCamera(firstPromoted?.camera, loading?.camera)
      || firstPromoted?.runtime?.requiredCohortKey
        !== loading?.runtime?.requiredCohortKey
      || !sameStringSet(
        firstPromoted?.runtime?.requiredResourceIds ?? [],
        loading?.runtime?.requiredResourceIds ?? [],
      )
      || !sameStringSet(
        firstPromoted?.runtime?.requiredResourceKeys ?? [],
        loading?.runtime?.requiredResourceKeys ?? [],
      )
    ) failures.push("residency.first_required_promotion_not_proven");
    const promotionTrace = firstPromoted?.promotionTrace;
    const firstPromotionTrace = promotionTrace?.firstPromotion;
    const tracedChildren = firstPromotionTrace?.children;
    const promotedChildren = firstPromoted?.runtime?.requiredChildren;
    if (
      promotionTrace?.invalidIntermediatePromotion !== false
      || promotionTrace?.observedPromotions !== 1
      || firstPromotionTrace?.nativeVisible !== true
      || firstPromotionTrace?.requiredReady !== true
      || firstPromotionTrace?.requiredState !== "ready"
      || !Array.isArray(tracedChildren)
      || !Array.isArray(promotedChildren)
      || new Set(tracedChildren.map(({ kind }) => kind)).size !== tracedChildren.length
      || tracedChildren.length !== promotedChildren.filter(
        ({ selectedResourceIds }) => selectedResourceIds.length > 0,
      ).length
      || tracedChildren.some((child) => {
        const promoted = promotedChildren.find(({ kind }) => kind === child.kind);
        return !promoted
          || child.state !== promoted.state
          || child.visible !== promoted.visible
          || child.hiddenPaintedFrames !== promoted.hiddenPaintedFrames
          || child.svgLoadedCount !== promoted.svgLoadedCount
          || child.mountedNodeCount !== promoted.mountedNodeCount
          || !sameStringSet(
            child.selectedResourceIds ?? [],
            promoted.selectedResourceIds,
          )
          || !sameStringSet(
            child.mountedResourceIds ?? [],
            promoted.mountedResourceIds,
          );
      })
    ) failures.push("residency.raw_terrain_intermediate_frame");
    if (
      readyAfter?.runtime?.nativeState !== "ready"
      || readyAfter?.runtime?.nativeVisible !== true
      || readyBefore?.runtime?.nativeState !== "ready"
      || readyBefore?.runtime?.nativeVisible !== true
      || !Number.isSafeInteger(readyBefore?.runtime?.cohortEpoch)
      || readyAfter?.runtime?.cohortEpoch <= readyBefore.runtime.cohortEpoch
    ) failures.push("residency.pan_promotion_not_proven");
    const readyBeforeSpan = readyBefore?.camera?.span;
    const readyAfterSpan = readyAfter?.camera?.span;
    const readyBeforeOrigin = readyBefore?.camera?.origin;
    const readyAfterOrigin = readyAfter?.camera?.origin;
    if (
      !Array.isArray(readyBeforeSpan)
      || readyBeforeSpan.some((value) => Math.abs(value - 0.04) > 1e-9)
      || !Array.isArray(readyAfterSpan)
      || readyAfterSpan.some((value) => Math.abs(value - 0.04) > 1e-9)
      || !Array.isArray(readyBeforeOrigin)
      || !Array.isArray(readyAfterOrigin)
      || readyBeforeOrigin.every(
        (value, axis) => Math.abs(value - readyAfterOrigin[axis]) <= 1e-9,
      )
    ) failures.push("residency.same_tier_pan_camera_missing");
    const criticalFrameSteps = [
      "close-ready", "pan-evicting", "pan-loading", "pan-first-promoted", "pan-ready",
    ];
    const criticalFramePaths = new Map();
    for (const step of criticalFrameSteps) {
      const sample = sampleByStep.get(step);
      if (!sameStringRecord(
        sample?.visualIsolation,
        NINJAONE_MVP_RESIDENCY_VISUAL_ISOLATION,
      )) failures.push(`residency.${step}.visual_isolation_missing`);
      if (typeof sample?.imagePath !== "string" || sample.imagePath.length === 0) {
        failures.push(`residency.${step}.image_missing`);
        continue;
      }
      const imagePath = resolveEvidencePath(evidenceDirectory, sample.imagePath);
      try {
        const frame = await imageFrameStats(imagePath);
        if (
          !validCaptureClip(sample.clip, evidence.producer.viewport)
          || !frameMatchesClip(frame, sample.clip)
        ) failures.push(`residency.${step}.capture_dimensions_mismatch`);
        if (!frame.pass) failures.push(`residency.${step}.blank_or_flat_green`);
        criticalFramePaths.set(step, imagePath);
        residencyFrameMetrics.push(Object.freeze({ frame, step }));
      } catch {
        failures.push(`residency.${step}.image_unreadable`);
      }
    }
    for (const [from, to, failure] of [
      ["close-ready", "pan-evicting", "pan_camera_frame_stale"],
      ["pan-loading", "pan-first-promoted", "pan_promotion_frame_stale"],
    ]) {
      const fromPath = criticalFramePaths.get(from);
      const toPath = criticalFramePaths.get(to);
      if (!fromPath || !toPath) continue;
      try {
        const difference = await frameDifference(fromPath, toPath);
        residencyFrameMetrics.push(Object.freeze({ difference, from, to }));
        if (!difference.pass) failures.push(`residency.${failure}`);
      } catch {
        failures.push(`residency.${failure}_unreadable`);
      }
    }
  }

  if (!Array.isArray(evidence?.consoleErrors)) failures.push("console_errors_missing");
  else if (evidence.consoleErrors.length > 0) failures.push("console_errors_present");
  if (!Array.isArray(evidence?.networkErrors)) failures.push("network_errors_missing");
  else if (evidence.networkErrors.length > 0) failures.push("network_errors_present");

  const hydrologyBoundary = auditNinjaOneEnvironmentHydrologyBoundaryTransition({
    capture: evidence?.hydrologyBoundaryTransition,
    resourceCatalog,
  });
  failures.push(...hydrologyBoundary.failures);
  const hydrologyBoundaryFrameMetrics = [];
  const hydrologyBoundaryAlphaMetrics = [];
  const hydrologyBoundarySamples = evidence?.hydrologyBoundaryTransition?.samples;
  if (Array.isArray(hydrologyBoundarySamples) && hydrologyBoundarySamples.length > 0) {
    for (const [id, sample] of [
      ["start", hydrologyBoundarySamples[0]],
      ["end", hydrologyBoundarySamples.at(-1)],
    ]) {
      validateRuntimeSample(
        sample?.runtime,
        failures,
        `hydrology_boundary.${id}.runtime`,
        resourceCatalog,
        sample?.camera,
      );
    }
  }
  const hydrologyBoundaryFrames = evidence?.hydrologyBoundaryTransition?.frames;
  if (Array.isArray(hydrologyBoundaryFrames)) {
    const framePaths = new Map();
    for (const frame of hydrologyBoundaryFrames) {
      if (typeof frame?.imagePath !== "string" || frame.imagePath.length === 0) {
        failures.push(`hydrology_boundary.frame_${frame?.id ?? "unknown"}.image_missing`);
        continue;
      }
      try {
        const imagePath = resolveEvidencePath(evidenceDirectory, frame.imagePath);
        const stats = await imageFrameStats(imagePath);
        if (
          !validCaptureClip(frame.clip, evidence?.producer?.viewport)
          || !frameMatchesClip(stats, frame.clip)
          || !stats.pass
        ) failures.push(`hydrology_boundary.frame_${frame.id}.image_invalid`);
        framePaths.set(frame.id, imagePath);
        hydrologyBoundaryFrameMetrics.push(Object.freeze({ id: frame.id, stats }));
      } catch {
        failures.push(`hydrology_boundary.frame_${frame?.id ?? "unknown"}.unreadable`);
      }
    }
    const beforePath = framePaths.get("stable-before");
    const afterPath = framePaths.get("stable-after");
    if (beforePath && afterPath) {
      try {
        const difference = await frameDifference(beforePath, afterPath);
        if (!difference.pass) failures.push("hydrology_boundary.camera_frame_stale");
        hydrologyBoundaryFrameMetrics.push(Object.freeze({
          difference,
          id: "stable-before-to-stable-after",
        }));
      } catch {
        failures.push("hydrology_boundary.camera_frame_diff_unreadable");
      }
    }
  }
  const hydrologyBoundaryAlphaFrames = evidence?.hydrologyBoundaryTransition?.alphaFrames;
  if (Array.isArray(hydrologyBoundaryAlphaFrames)) {
    for (const frame of hydrologyBoundaryAlphaFrames) {
      try {
        const audit = await auditNinjaOneEnvironmentHydrologyBoundaryAlphaFrame({
          evidenceDirectory,
          frame,
          hydrologyManifest,
          referenceRoot,
        });
        if (!audit.pass) failures.push(...audit.failures.map((failure) => (
          `hydrology_boundary.alpha_${frame?.id ?? "unknown"}.${failure}`
        )));
        hydrologyBoundaryAlphaMetrics.push(audit);
      } catch {
        failures.push(`hydrology_boundary.alpha_${frame?.id ?? "unknown"}.unreadable`);
      }
    }
  }

  const hydrologyOcclusionMetrics = [];
  const requiredOcclusionIds = ["hydrology-occlusion-C1", "hydrology-occlusion-C2"];
  if (
    !Array.isArray(evidence?.hydrologyOcclusionCaptures)
    || !sameStringSet(
      evidence.hydrologyOcclusionCaptures.map(({ id }) => id),
      requiredOcclusionIds,
    )
  ) {
    failures.push("hydrology_occlusion_capture_missing");
  } else {
    for (const capture of evidence.hydrologyOcclusionCaptures) {
      const checkpointId = capture.id.replace("hydrology-occlusion-", "");
      const expectedCamera = NINJAONE_MVP_FIXED_CAMERAS[checkpointId];
      validateRuntimeSample(
        capture.runtime,
        failures,
        `hydrology_occlusion.${checkpointId}.runtime`,
        resourceCatalog,
        capture.camera,
      );
      if (!expectedCamera || !sameCamera(capture.camera, expectedCamera)) {
        failures.push(`hydrology_occlusion.${checkpointId}.camera_mismatch`);
      }
      if (!sameStringRecord(
        capture.isolation,
        NINJAONE_MVP_HYDROLOGY_OCCLUSION_ISOLATION,
      )) failures.push(`hydrology_occlusion.${checkpointId}.isolation_mismatch`);
      if (!validCaptureClip(capture.clip, evidence.producer.viewport)) {
        failures.push(`hydrology_occlusion.${checkpointId}.clip_invalid`);
        continue;
      }
      try {
        const visiblePath = resolveEvidencePath(
          evidenceDirectory,
          capture.visibleImagePath,
        );
        const hiddenPath = resolveEvidencePath(
          evidenceDirectory,
          capture.hiddenImagePath,
        );
        const maskPath = resolveEvidencePath(evidenceDirectory, capture.maskPath);
        const [visible, hidden, difference] = await Promise.all([
          imageFrameStats(visiblePath),
          imageFrameStats(hiddenPath),
          registeredMaskedDifference(visiblePath, hiddenPath, maskPath),
        ]);
        hydrologyOcclusionMetrics.push(Object.freeze({
          difference,
          hidden,
          id: capture.id,
          visible,
        }));
        if (
          !frameMatchesClip(visible, capture.clip)
          || !frameMatchesClip(hidden, capture.clip)
          || !visible.pass
          || !hidden.pass
        ) failures.push(`hydrology_occlusion.${checkpointId}.frame_invalid`);
        if (!difference.pass) {
          failures.push(`hydrology_occlusion.${checkpointId}.not_registered_mask_confined`);
        }
      } catch {
        failures.push(`hydrology_occlusion.${checkpointId}.unreadable`);
      }
    }
  }

  const motionMetrics = [];
  const requiredMotionIds = ["hydrology-C1", "hydrology-C2"];
  if (
    !Array.isArray(evidence?.motionCaptures)
    || !sameStringSet(
      evidence.motionCaptures.map(({ id }) => id),
      requiredMotionIds,
    )
  ) {
    failures.push("motion_capture_missing");
  } else {
    for (const capture of evidence.motionCaptures) {
      try {
        const checkpointId = capture.id.replace(/^hydrology-/, "");
        const expectedCamera = NINJAONE_MVP_FIXED_CAMERAS[checkpointId];
        if (!expectedCamera || !sameCamera(capture.camera, expectedCamera)) {
          failures.push(`motion.${capture.id}.camera_not_fixed`);
        }
        validateRuntimeSample(
          capture.runtime,
          failures,
          `motion.${capture.id}.runtime`,
          resourceCatalog,
          capture.camera,
        );
        if (!validCaptureClip(capture.clip, evidence?.producer?.viewport)) {
          failures.push(`motion.${capture.id}.capture_dimensions_mismatch`);
        }
        const expectedContract = await deriveNinjaOneHydrologyMotionContract({
          camera: expectedCamera,
          clip: capture.clip,
          fieldTier: capture.runtime?.waterHydrologyAssetTier,
          fieldResourceIds: capture.runtime?.waterHydrologyAssetResourceIds,
          manifest: hydrologyManifest,
          root: referenceRoot,
        });
        const vectorMatches = Array.isArray(capture.flowVector)
          && capture.flowVector.length === 2
          && capture.flowVector.every((value, axis) => (
            Math.abs(value - expectedContract.flowVector[axis]) <= 1e-9
          ));
        const fieldVectorMatches = Array.isArray(capture.contract?.fieldFlowVector)
          && capture.contract.fieldFlowVector.length === 2
          && capture.contract.fieldFlowVector.every((value, axis) => (
            Math.abs(value - expectedContract.fieldFlowVector[axis]) <= 1e-9
          ));
        const contractMatches = capture.contract?.coveragePixels
            === expectedContract.coveragePixels
          && capture.contract?.fieldDecodedBytes
            === expectedContract.fieldDecodedBytes
          && sameStringSet(
            capture.contract?.fieldResourceIds ?? [],
            expectedContract.fieldResourceIds,
          )
          && sameStringSet(
            capture.contract?.fieldResourcePaths ?? [],
            expectedContract.fieldPaths,
          )
          && capture.contract?.fieldTier === expectedContract.fieldTier
          && sameStringSet(
            capture.contract?.fieldSha256s ?? [],
            expectedContract.fieldSha256s,
          )
          && capture.contract?.fullMaskSha256 === expectedContract.fullMaskSha256
          && capture.contract?.maskSha256 === expectedContract.maskSha256
          && capture.contract?.directionalPixels === expectedContract.directionalPixels
          && fieldVectorMatches
          && JSON.stringify(capture.contract?.sourceBounds)
            === JSON.stringify(expectedContract.sourceBounds)
          && sameStringRecord(capture.contract?.styleCounts, expectedContract.styleCounts)
          && vectorMatches;
        if (!contractMatches) {
          failures.push(`motion.${capture.id}.field_contract_mismatch`);
        }
        const requiredStyles = new Set(["C1", "C2"]).has(checkpointId)
          ? ["whitewater"]
          : [];
        if (requiredStyles.some((style) => !(capture.contract?.styleCounts?.[style] > 0))) {
          failures.push(`motion.${capture.id}.required_feature_style_missing`);
        }
        const maskPath = resolveEvidencePath(evidenceDirectory, capture.maskPath);
        if (await fileSha256(maskPath) !== expectedContract.maskSha256) {
          failures.push(`motion.${capture.id}.field_mask_mismatch`);
        }
        if (
          !new Set(["detail", "fallback"])
            .has(capture.runtime?.waterHydrologyAssetTier)
          || capture.runtime?.waterHydrologyAssetState
            !== (capture.runtime?.waterHydrologyAssetTier === "detail"
              ? "ready"
              : "fallback")
          || capture.runtime?.waterHydrologyAssetBytes
            !== expectedContract.fieldDecodedBytes
        ) failures.push(`motion.${capture.id}.hydrology_runtime_not_ready`);
        const metric = await auditMotionCapture(
          capture,
          evidenceDirectory,
          capture.clip,
        );
        motionMetrics.push(metric);
        if (!metric.pass) failures.push(...metric.failures.map((failure) => (
          `motion.${capture.id}.${failure}`
        )));
      } catch {
        failures.push(`motion.${capture.id}.unreadable`);
      }
    }
  }
  const hydrologyFeatureMetrics = [];
  const requiredFeatureIds = NINJAONE_MVP_HYDROLOGY_FEATURE_CAPTURES.map(({ id }) => id);
  if (
    !Array.isArray(evidence?.hydrologyFeatureCaptures)
    || !sameStringSet(
      evidence.hydrologyFeatureCaptures.map(({ id }) => id),
      requiredFeatureIds,
    )
  ) {
    failures.push("hydrology_feature_capture_missing");
  } else {
    for (const capture of evidence.hydrologyFeatureCaptures) {
      const feature = NINJAONE_MVP_HYDROLOGY_FEATURE_CAPTURES.find(
        ({ id }) => id === capture.id,
      );
      try {
        if (!feature || !sameCamera(capture.camera, feature.camera)) {
          failures.push(`hydrology_feature.${capture.id}.camera_not_fixed`);
        }
        if (!sameStringRecord(
          capture.isolation,
          NINJAONE_MVP_HYDROLOGY_FEATURE_ISOLATION,
        )) failures.push(`hydrology_feature.${capture.id}.isolation_mismatch`);
        if (!validCaptureClip(capture.clip, evidence?.producer?.viewport)) {
          failures.push(`hydrology_feature.${capture.id}.capture_dimensions_mismatch`);
        }
        validateRuntimeSample(
          capture.runtime,
          failures,
          `hydrology_feature.${capture.id}.runtime`,
          resourceCatalog,
          capture.camera,
        );
        const expectedContract = await deriveNinjaOneHydrologyMotionContract({
          camera: feature.camera,
          clip: capture.clip,
          fieldTier: capture.runtime?.waterHydrologyAssetTier,
          fieldResourceIds: capture.runtime?.waterHydrologyAssetResourceIds,
          manifest: hydrologyManifest,
          root: referenceRoot,
        });
        const vectorMatches = Array.isArray(capture.flowVector)
          && capture.flowVector.length === 2
          && capture.flowVector.every((value, axis) => (
            Math.abs(value - expectedContract.flowVector[axis]) <= 1e-9
          ));
        const fieldVectorMatches = Array.isArray(capture.contract?.fieldFlowVector)
          && capture.contract.fieldFlowVector.length === 2
          && capture.contract.fieldFlowVector.every((value, axis) => (
            Math.abs(value - expectedContract.fieldFlowVector[axis]) <= 1e-9
          ));
        const contractMatches = capture.contract?.coveragePixels
            === expectedContract.coveragePixels
          && capture.contract?.fieldDecodedBytes
            === expectedContract.fieldDecodedBytes
          && capture.contract?.directionalPixels === expectedContract.directionalPixels
          && sameStringSet(
            capture.contract?.fieldResourceIds ?? [],
            expectedContract.fieldResourceIds,
          )
          && sameStringSet(
            capture.contract?.fieldResourcePaths ?? [],
            expectedContract.fieldPaths,
          )
          && sameStringSet(
            capture.contract?.fieldSha256s ?? [],
            expectedContract.fieldSha256s,
          )
          && capture.contract?.fieldTier === expectedContract.fieldTier
          && capture.contract?.fullMaskSha256 === expectedContract.fullMaskSha256
          && capture.contract?.maskSha256 === expectedContract.maskSha256
          && fieldVectorMatches
          && JSON.stringify(capture.contract?.sourceBounds)
            === JSON.stringify(expectedContract.sourceBounds)
          && sameStringRecord(capture.contract?.styleCounts, expectedContract.styleCounts)
          && sameStringRecord(capture.contract?.styleCounts, feature.requiredStyleCounts)
          && vectorMatches;
        if (!contractMatches) {
          failures.push(`hydrology_feature.${capture.id}.field_contract_mismatch`);
        }
        const [fullMaskSha256, directionMaskSha256] = await Promise.all([
          fileSha256(resolveEvidencePath(evidenceDirectory, capture.maskPath)),
          fileSha256(resolveEvidencePath(evidenceDirectory, capture.directionMaskPath)),
        ]);
        if (fullMaskSha256 !== expectedContract.fullMaskSha256) {
          failures.push(`hydrology_feature.${capture.id}.full_mask_mismatch`);
        }
        if (directionMaskSha256 !== expectedContract.maskSha256) {
          failures.push(`hydrology_feature.${capture.id}.direction_mask_mismatch`);
        }
        if (
          !new Set(["detail", "fallback"])
            .has(capture.runtime?.waterHydrologyAssetTier)
          || capture.runtime?.waterHydrologyAssetState
            !== (capture.runtime?.waterHydrologyAssetTier === "detail"
              ? "ready"
              : "fallback")
          || capture.runtime?.waterHydrologyAssetBytes
            !== expectedContract.fieldDecodedBytes
          || capture.runtime?.nativeState !== "ready"
          || capture.runtime?.nativeVisible !== true
          || capture.runtime?.terrainTileCount !== feature.expectedTerrainTileCount
        ) failures.push(`hydrology_feature.${capture.id}.runtime_not_ready`);
        const [motion, alpha, frameStats] = await Promise.all([
          auditMotionCapture(capture, evidenceDirectory, capture.clip),
          auditHydrologyAlphaFrames(capture, evidenceDirectory, capture.clip),
          Promise.all(capture.frames.map((frame) => imageFrameStats(
            resolveEvidencePath(evidenceDirectory, frame),
          ))),
        ]);
        if (capture.frames.length !== 3 || frameStats.some((frame) => (
          !frameMatchesClip(frame, capture.clip) || !frame.pass
        ))) failures.push(`hydrology_feature.${capture.id}.full_composition_frame_invalid`);
        if (!motion.pass) failures.push(...motion.failures.map((failure) => (
          `hydrology_feature.${capture.id}.${failure}`
        )));
        if (!alpha.pass) failures.push(...alpha.failures.map((failure) => (
          `hydrology_feature.${capture.id}.${failure}`
        )));
        hydrologyFeatureMetrics.push(Object.freeze({
          alpha,
          frames: Object.freeze(frameStats),
          id: capture.id,
          motion,
        }));
      } catch {
        failures.push(`hydrology_feature.${capture.id}.unreadable`);
      }
    }
  }
  return Object.freeze({
    checkpoints: Object.freeze(checkpointMetrics),
    failures: Object.freeze([...new Set(failures)]),
    hydrologyBoundary: Object.freeze({
      ...hydrologyBoundary,
      alpha: Object.freeze(hydrologyBoundaryAlphaMetrics),
      frames: Object.freeze(hydrologyBoundaryFrameMetrics),
    }),
    hydrologyFeatures: Object.freeze(hydrologyFeatureMetrics),
    hydrologyOcclusion: Object.freeze(hydrologyOcclusionMetrics),
    lodTransition: Object.freeze(transitionMetrics),
    motion: Object.freeze(motionMetrics),
    residencyFrames: Object.freeze(residencyFrameMetrics),
    residencyPeakApplicationOwnedDecodedBytes: Array.isArray(residencySamples)
      ? Math.max(0, ...residencySamples.map(
        (sample) => (
          sample.runtime?.applicationOwnedDecodedBytes
            ?? Number.POSITIVE_INFINITY
        ),
      ))
      : null,
    residencyPeakNativeDecodedUnionBytes: Array.isArray(residencySamples)
      ? Math.max(0, ...residencySamples.map(
        (sample) => (
          sample.runtime?.nativeDecodedUnionBytes
            ?? Number.POSITIVE_INFINITY
        ),
      ))
      : null,
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
  hydrologyManifest,
  nativeManifest,
  seamInstances = [],
}) {
  if (
    hydrologyManifest?.schemaVersion !== 4
    || hydrologyManifest?.regionalFields?.cohortPolicy?.maximumMountedRegions !== 2
    || hydrologyManifest?.regionalFields?.cohortPolicy?.mixedTierAllowed !== false
  ) throw new TypeError("Regional hydrology budget contract is invalid.");
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
    ...(hydrologyManifest?.regionalFields?.regions ?? []).map((region) => ({
      artboardBounds: {
        origin: region.artboardBounds.slice(0, 2),
        span: [
          region.artboardBounds[2] - region.artboardBounds[0],
          region.artboardBounds[3] - region.artboardBounds[1],
        ],
      },
    })),
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
    const nodesFor = (instances) => instances.flatMap((instance) => (
      (instance.resources ?? [instance.resource]).flatMap((resource, resourceIndex) => (
        Array.from({ length: resourcePaintedNodeCount(resource) }, (_, paintedIndex) => ({
          id: `${instance.id}:${resourceIndex}:${resource.id}:${paintedIndex}`,
          resource,
        }))
      ))
    ));
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
    const hydrologyRegionIds = nativeVisible && ninjaOneHydrologyShouldBeResident(camera)
      ? hydrologyManifest.regionalFields.regions.filter(({ worldBounds }) => (
          camera.origin[0] < worldBounds.origin[0] + worldBounds.span[0]
          && camera.origin[0] + camera.span[0] > worldBounds.origin[0]
          && camera.origin[1] < worldBounds.origin[1] + worldBounds.span[1]
          && camera.origin[1] + camera.span[1] > worldBounds.origin[1]
        )).map(({ id: regionId }) => regionId).sort()
      : [];
    const hydrologyResourcesForTier = (tier) => hydrologyRegionIds.map((regionId) => {
      const matches = hydrologyManifest.regionalFields.tiers[tier].resources.filter(
        (resource) => resource.regionId === regionId,
      );
      if (matches.length !== 1) {
        throw new Error(`${tier} hydrology region ${regionId} is not unique.`);
      }
      return matches[0];
    });
    const fallbackHydrologyResources = hydrologyResourcesForTier("fallback");
    const fallbackHydrologyDecodedBytes = fallbackHydrologyResources.reduce(
      (total, resource) => total + resource.decodedBytes,
      0,
    );
    if (coastSupplementalNodes.length > 0) {
      const preCoastDecodedBytes = terrainBytes
        + seamDecodedBytes
        + fallbackHydrologyDecodedBytes;
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
    let hydrologySelectedTier = "none";
    let hydrologyResources = [];
    for (const tier of ["detail", "fallback"]) {
      const resources = hydrologyResourcesForTier(tier);
      const bytes = resources.reduce(
        (total, resource) => total + resource.decodedBytes,
        0,
      );
      if (
        resources.length === hydrologyRegionIds.length
        && nativeApplicationOwnedDecodedBytes + bytes
          <= NINJAONE_MVP_LIMITS.maximumDecodedBytes
      ) {
        hydrologySelectedTier = hydrologyRegionIds.length > 0 ? tier : "none";
        hydrologyResources = resources;
        break;
      }
    }
    const hydrologySelectedDecodedBytes = hydrologyResources.reduce(
      (total, resource) => total + resource.decodedBytes,
      0,
    );
    const hydrologyAdmissionBlocked = hydrologyRegionIds.length > 0
      && hydrologyResources.length !== hydrologyRegionIds.length;
    const sample = Object.freeze({
      camera,
      decodedBytes:
        nativeApplicationOwnedDecodedBytes + hydrologySelectedDecodedBytes,
      foliageGroupCount: admittedFoliageSupplements.length,
      fullyCovered: visibleTerrain.length <= NINJAONE_MVP_LIMITS.maximumTerrainTiles,
      hydrologyAdmissionBlocked,
      hydrologyRegionIds: Object.freeze(hydrologyRegionIds),
      hydrologyResourceIds: Object.freeze(
        hydrologyResources.map(({ id: resourceId }) => resourceId),
      ),
      hydrologySelectedDecodedBytes,
      hydrologySelectedTier,
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
      || sample.hydrologyAdmissionBlocked
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
