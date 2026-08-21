import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const ROOT = process.cwd();
const WIDTH = 1448;
const HEIGHT = 1086;
const PIXELS = WIDTH * HEIGHT;
const HARD_WATER_THRESHOLD = 223;

const source = Object.freeze({
  master: path.join(
    ROOT,
    "art-source/career-world/ninjaone-capital/city-nodes-r2/master/ninjaone-capital-master-r1.png",
  ),
  liveLandMask: path.join(
    ROOT,
    "art-source/career-world/ninjaone-capital/city-r3/authority/live-land-authority-mask-r1.png",
  ),
  registeredParentLandMask: path.join(
    ROOT,
    "art-source/career-world/ninjaone-capital/city-r3/authority/registered-parent-land-mask-r1.png",
  ),
  liveWaterMask: path.join(
    ROOT,
    "art-source/career-world/ninjaone-capital/city-r3/authority/live-inland-water-authority-mask-r1.png",
  ),
  topOverhang: path.join(
    ROOT,
    "art-source/career-world/ninjaone-capital/city-r3/overlays/top-overhang-extension-r1-alpha.png",
  ),
  d01DistrictMask: path.join(
    ROOT,
    "art-source/career-world/ninjaone-capital/city-r3/districts/D01-upper-capital-mask.png",
  ),
  d01ContextExclusionMask: path.join(
    ROOT,
    "art-source/career-world/ninjaone-capital/city-r3/authority/D01M02-crown-full-context-exclusion-r1.png",
  ),
  d01GroundingAndCirculation: path.join(
    ROOT,
    "art-source/career-world/ninjaone-capital/city-r3/landscape/D01L02-crown-grounding-and-circulation-r1-alpha.png",
  ),
  d02DistrictMask: path.join(
    ROOT,
    "art-source/career-world/ninjaone-capital/city-r3/districts/D02-dojo-ridge-mask.png",
  ),
  d02ContextExclusionMask: path.join(
    ROOT,
    "art-source/career-world/ninjaone-capital/city-r3/authority/D02M02-dojo-ridge-full-context-exclusion-r1.png",
  ),
  d02GroundingAndCirculation: path.join(
    ROOT,
    "art-source/career-world/ninjaone-capital/city-r3/landscape/D02L02-dojo-ridge-grounding-and-circulation-r1-alpha.png",
  ),
  d03DistrictMask: path.join(
    ROOT,
    "art-source/career-world/ninjaone-capital/city-r3/districts/D03-eastern-industry-mask.png",
  ),
  d03ContextExclusionMask: path.join(
    ROOT,
    "art-source/career-world/ninjaone-capital/city-r3/authority/D03M02-city-full-context-exclusion-r1.png",
  ),
  d03GroundContact: path.join(
    ROOT,
    "art-source/career-world/ninjaone-capital/city-r3/landscape/D03L02-city-grounded-contact-platforms-r1-alpha.png",
  ),
  d03TerrainIntegrationDetail: path.join(
    ROOT,
    "art-source/career-world/ninjaone-capital/city-r3/detail/D03L03-city-terrain-integration-detail-r1-alpha.png",
  ),
  d03RetainingCirculationMass: path.join(
    ROOT,
    "art-source/career-world/ninjaone-capital/city-r3/landscape/D03L04-eastern-industry-retaining-circulation-mass-r1-alpha.png",
  ),
  d04DistrictMask: path.join(
    ROOT,
    "art-source/career-world/ninjaone-capital/city-r3/districts/D04-central-lake-terraces-mask.png",
  ),
  d04ContextExclusionMask: path.join(
    ROOT,
    "art-source/career-world/ninjaone-capital/city-r3/authority/D04M02-central-lake-full-context-exclusion-r1.png",
  ),
  d04GroundingAndCirculation: path.join(
    ROOT,
    "art-source/career-world/ninjaone-capital/city-r3/landscape/D04L02-central-lake-grounding-and-circulation-r1-alpha.png",
  ),
  d04BridgeWaterDetail: path.join(
    ROOT,
    "art-source/career-world/ninjaone-capital/city-r3/water-interaction/D04W02-S14-bridge-water-contact-detail-r1-alpha.png",
  ),
  d04CompactGateway: path.join(
    ROOT,
    "art-source/career-world/ninjaone-capital/city-r3/architecture/S14-D04-compact-water-gateway-r2-alpha.png",
  ),
  d05DistrictMask: path.join(
    ROOT,
    "art-source/career-world/ninjaone-capital/city-r3/districts/D05-western-skill-terraces-mask.png",
  ),
  d05ContextExclusionMask: path.join(
    ROOT,
    "art-source/career-world/ninjaone-capital/city-r3/authority/D05M02-western-skill-full-context-exclusion-r1.png",
  ),
  d05GroundIntegration: path.join(
    ROOT,
    "art-source/career-world/ninjaone-capital/city-r3/landscape/D05L02-western-skill-ground-integration-r1-alpha.png",
  ),
  d05TerrainIntegrationDetail: path.join(
    ROOT,
    "art-source/career-world/ninjaone-capital/city-r3/detail/D05L03-western-skill-terrain-integration-detail-r1-alpha.png",
  ),
  d05TerraceMass: path.join(
    ROOT,
    "art-source/career-world/ninjaone-capital/city-r3/landscape/D05L04-western-skill-terrace-mass-r1-alpha.png",
  ),
  d06DistrictMask: path.join(
    ROOT,
    "art-source/career-world/ninjaone-capital/city-r3/districts/D06-station-rail-mask.png",
  ),
  bridgeWaterDetail: path.join(
    ROOT,
    "public/career-world/capitals/ninjaone/city-r3/water-interaction/WFX01-city-bridge-water-detail-r1-alpha.png",
  ),
  rearRidgeUnderlay: path.join(
    ROOT,
    "public/career-world/capitals/ninjaone/city-r3/landscape/LFX06-upper-rear-native-ridge-underlay-r1-alpha.png",
  ),
  closeFabricDetail: path.join(
    ROOT,
    "public/career-world/capitals/ninjaone/city-r3/detail/CFX01-city-close-fabric-detail-r1-alpha.png",
  ),
  stationSiteClose: path.join(
    ROOT,
    "art-source/career-world/ninjaone-capital/city-r3/station/I24-station-cliff-registered-undercroft-r1-alpha.png",
  ),
  foliageManifest: path.join(
    ROOT,
    "public/career-world/capitals/ninjaone/environment/manifests/foliage-native-r4.json",
  ),
});

const outputRoot = path.join(
  ROOT,
  "public/career-world/capitals/ninjaone/city-r3",
);
const outputs = Object.freeze({
  landscape: path.join(outputRoot, "foundation/city-landscape-capital-r1-alpha.png"),
  overhang: path.join(outputRoot, "foundation/city-overhang-capital-r1-alpha.png"),
  composite: path.join(outputRoot, "foundation/city-foundation-composite-r1-alpha.png"),
  capitalContext: path.join(
    outputRoot,
    "foundation/city-context-capital-without-d06-r1-alpha.png",
  ),
  territory: path.join(outputRoot, "territory/city-foundation-territory-r1-alpha.png"),
  waterInteraction: path.join(
    outputRoot,
    "water-interaction/city-water-contact-r1-alpha.png",
  ),
  bridgeWaterDetail: path.join(
    outputRoot,
    "water-interaction/WFX01-city-bridge-water-detail-r1-alpha-crop.png",
  ),
  rearRidgeUnderlay: path.join(
    outputRoot,
    "landscape/LFX06-upper-rear-native-ridge-underlay-r1-alpha-crop.png",
  ),
  closeFabricDetail: path.join(
    outputRoot,
    "detail/CFX01-city-close-fabric-detail-r1-alpha-crop.png",
  ),
  centralArchitectureDetail: path.join(
    outputRoot,
    "detail/CFX02-city-central-architecture-detail-overlay-r1-alpha.png",
  ),
  stationCapital: path.join(
    outputRoot,
    "station/I20-station-capital-cluster-no-train-r1-alpha.png",
  ),
  stationSiteClose: path.join(
    outputRoot,
    "station/I24-station-cliff-registered-undercroft-r1-alpha-crop.png",
  ),
  waterRegistrationMask: path.join(
    outputRoot,
    "authority/city-water-registration-mask-r1.png",
  ),
  progressiveWaterExclusionMask: path.join(
    outputRoot,
    "authority/city-progressive-water-exclusion-mask-r1.png",
  ),
  d01ContextExclusionMask: path.join(
    outputRoot,
    "authority/D01M02-crown-full-context-exclusion-r1.png",
  ),
  d01GroundingAndCirculation: path.join(
    outputRoot,
    "landscape/D01L02-crown-grounding-and-circulation-r1-alpha.png",
  ),
  d02ContextExclusionMask: path.join(
    outputRoot,
    "authority/D02M02-dojo-ridge-full-context-exclusion-r1.png",
  ),
  d02GroundingAndCirculation: path.join(
    outputRoot,
    "landscape/D02L02-dojo-ridge-grounding-and-circulation-r1-alpha.png",
  ),
  d03ContextExclusionMask: path.join(
    outputRoot,
    "authority/D03M02-city-full-context-exclusion-r1.png",
  ),
  d03GroundContact: path.join(
    outputRoot,
    "landscape/D03L02-city-grounded-contact-platforms-r1-alpha.png",
  ),
  d03TerrainIntegrationDetail: path.join(
    outputRoot,
    "detail/D03L03-city-terrain-integration-detail-r1-alpha.png",
  ),
  d03RetainingCirculationMass: path.join(
    outputRoot,
    "landscape/D03L04-eastern-industry-retaining-circulation-mass-r1-alpha.png",
  ),
  d04ContextExclusionMask: path.join(
    outputRoot,
    "authority/D04M02-central-lake-full-context-exclusion-r1.png",
  ),
  d04GroundingAndCirculation: path.join(
    outputRoot,
    "landscape/D04L02-central-lake-grounding-and-circulation-r1-alpha.png",
  ),
  d04BridgeWaterDetail: path.join(
    outputRoot,
    "water-interaction/D04W02-S14-bridge-water-contact-detail-r1-alpha.png",
  ),
  d04CompactGateway: path.join(
    outputRoot,
    "architecture/S14-D04-compact-water-gateway-r2-alpha.png",
  ),
  d05ContextExclusionMask: path.join(
    outputRoot,
    "authority/D05M02-western-skill-full-context-exclusion-r1.png",
  ),
  d05GroundIntegration: path.join(
    outputRoot,
    "landscape/D05L02-western-skill-ground-integration-r1-alpha.png",
  ),
  d05TerrainIntegrationDetail: path.join(
    outputRoot,
    "detail/D05L03-western-skill-terrain-integration-detail-r1-alpha.png",
  ),
  d05TerraceMass: path.join(
    outputRoot,
    "landscape/D05L04-western-skill-terrace-mass-r1-alpha.png",
  ),
  nativeFoliageReuseManifest: path.join(
    outputRoot,
    "authority/city-native-foliage-reuse-r1.json",
  ),
  manifest: path.join(
    ROOT,
    "public/career-world/capitals/ninjaone/manifests/city-foundation-r3.json",
  ),
});

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function imageMetadata(file) {
  const bytes = await readFile(file);
  const metadata = await sharp(bytes).metadata();
  if (metadata.width !== WIDTH || metadata.height !== HEIGHT) {
    throw new TypeError(`${file} must be ${WIDTH}x${HEIGHT}.`);
  }
  return { bytes, metadata };
}

async function singleChannel(file) {
  const { bytes } = await imageMetadata(file);
  return sharp(bytes).greyscale().raw().toBuffer();
}

async function writePng(file, pipeline) {
  const encoded = await pipeline.png({ compressionLevel: 9, palette: false }).toBuffer();
  return writeBytesIfChanged(file, encoded);
}

async function writeBytesIfChanged(file, bytes) {
  await mkdir(path.dirname(file), { recursive: true });
  const existing = await readFile(file).catch(() => null);
  if (existing?.equals(bytes)) return;
  await writeFile(file, bytes);
}

async function artifact(file) {
  const bytes = await readFile(file);
  const metadata = await sharp(bytes).metadata();
  return Object.freeze({
    decodedBytes: metadata.width * metadata.height * (metadata.channels ?? 4),
    dimensions: Object.freeze([metadata.width, metadata.height]),
    encodedBytes: bytes.byteLength,
    path: `/${path.relative(path.join(ROOT, "public"), file).replaceAll("\\", "/")}`,
    sha256: sha256(bytes),
  });
}

async function writeRegisteredAlphaCrop(sourceFile, outputFile) {
  const { bytes, metadata } = await imageMetadata(sourceFile);
  const { data, info } = await sharp(bytes)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let left = info.width;
  let top = info.height;
  let right = -1;
  let bottom = -1;
  for (let index = 0; index < info.width * info.height; index += 1) {
    if (data[index * 4 + 3] === 0) continue;
    const x = index % info.width;
    const y = Math.floor(index / info.width);
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
  }
  if (right < left || bottom < top) {
    throw new TypeError(`${sourceFile} has no visible alpha to package.`);
  }
  const crop = Object.freeze({
    height: bottom - top + 1,
    left,
    top,
    width: right - left + 1,
  });
  await writePng(
    outputFile,
    sharp(bytes).ensureAlpha().extract(crop),
  );
  const outputMetadata = await sharp(await readFile(outputFile)).metadata();
  if (
    outputMetadata.width !== crop.width
    || outputMetadata.height !== crop.height
    || outputMetadata.channels !== 4
  ) {
    throw new TypeError(`${outputFile} does not match its registered alpha crop.`);
  }
  return Object.freeze({
    origin: Object.freeze([crop.left, crop.top]),
    sourceDimensions: Object.freeze([metadata.width, metadata.height]),
    sourcePath: path.relative(ROOT, sourceFile).replaceAll("\\", "/"),
    sourceSha256: sha256(bytes),
  });
}

async function analyzeNativeFoliageReuse(context, foliageManifest) {
  const thresholds = Object.freeze({
    contextAlphaFraction: 0.8,
    baseVegetationFraction: 0.6,
    maximumStructureFraction: 0.3,
    vegetationFraction: 0.65,
  });
  const atlasById = new Map(await Promise.all(
    foliageManifest.resources.map(async (resource) => {
      const atlasPath = path.join(
        ROOT,
        "public",
        resource.path.split("?")[0].replace(/^\//, ""),
      );
      const { data, info } = await sharp(await readFile(atlasPath))
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      return [resource.id, Object.freeze({ data, info })];
    }),
  ));
  const admitted = [];
  for (const instance of foliageManifest.instances) {
    const [originX, originY] = instance.artboardBounds.origin;
    const [spanX, spanY] = instance.artboardBounds.span;
    const [frameX, frameY, frameWidth, frameHeight] = instance.canopyAtlasRect;
    const atlas = atlasById.get(instance.atlasResourceId);
    if (!atlas) throw new TypeError(`Missing foliage atlas ${instance.atlasResourceId}.`);
    let baseCanopyPixels = 0;
    let baseVegetationPixels = 0;
    let canopyPixels = 0;
    let contextAlphaPixels = 0;
    let structurePixels = 0;
    let vegetationPixels = 0;
    for (
      let y = Math.max(0, Math.floor(originY));
      y < Math.min(HEIGHT, Math.ceil(originY + spanY));
      y += 1
    ) {
      for (
        let x = Math.max(0, Math.floor(originX));
        x < Math.min(WIDTH, Math.ceil(originX + spanX));
        x += 1
      ) {
        const u = (x + 0.5 - originX) / spanX;
        const v = (y + 0.5 - originY) / spanY;
        if (u < 0 || u >= 1 || v < 0 || v >= 1) continue;
        const atlasX = Math.min(
          atlas.info.width - 1,
          Math.floor(frameX + u * frameWidth),
        );
        const atlasY = Math.min(
          atlas.info.height - 1,
          Math.floor(frameY + v * frameHeight),
        );
        const atlasOffset = (atlasY * atlas.info.width + atlasX) * 4;
        if (atlas.data[atlasOffset + 3] <= 32) continue;
        canopyPixels += 1;
        if (v > 0.72) baseCanopyPixels += 1;
        const offset = (y * WIDTH + x) * 4;
        const red = context[offset];
        const green = context[offset + 1];
        const blue = context[offset + 2];
        const alpha = context[offset + 3];
        if (alpha <= 16) continue;
        contextAlphaPixels += 1;
        const vegetation = green > red * 1.08
          && green > blue * 1.03
          && green < 115;
        if (vegetation) vegetationPixels += 1;
        else structurePixels += 1;
        if (v > 0.72) {
          if (vegetation) baseVegetationPixels += 1;
        }
      }
    }
    const evidence = {
      baseVegetationFraction: baseVegetationPixels / Math.max(baseCanopyPixels, 1),
      canopyPixels,
      contextAlphaFraction: contextAlphaPixels / Math.max(canopyPixels, 1),
      structureFraction: structurePixels / Math.max(canopyPixels, 1),
      vegetationFraction: vegetationPixels / Math.max(canopyPixels, 1),
    };
    if (
      evidence.contextAlphaFraction < thresholds.contextAlphaFraction
      || evidence.baseVegetationFraction < thresholds.baseVegetationFraction
      || evidence.structureFraction > thresholds.maximumStructureFraction
      || evidence.vegetationFraction < thresholds.vegetationFraction
    ) continue;
    admitted.push({
      atlasResourceId: instance.atlasResourceId,
      evidence,
      id: instance.id,
    });
  }
  return Object.freeze({ admitted, thresholds });
}

async function cleanConnectedWaterMask(sourceMask) {
  const seen = new Uint8Array(PIXELS);
  const queue = new Int32Array(PIXELS);
  const components = [];
  for (let start = 0; start < PIXELS; start += 1) {
    if (seen[start] || sourceMask[start] <= 127) continue;
    let head = 0;
    let tail = 0;
    queue[tail] = start;
    tail += 1;
    seen[start] = 1;
    const pixels = [];
    while (head < tail) {
      const current = queue[head];
      head += 1;
      pixels.push(current);
      const x = current % WIDTH;
      const y = Math.floor(current / WIDTH);
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (offsetX === 0 && offsetY === 0) continue;
          const nextX = x + offsetX;
          const nextY = y + offsetY;
          if (nextX < 0 || nextY < 0 || nextX >= WIDTH || nextY >= HEIGHT) continue;
          const next = nextY * WIDTH + nextX;
          if (!seen[next] && sourceMask[next] > 127) {
            seen[next] = 1;
            queue[tail] = next;
            tail += 1;
          }
        }
      }
    }
    components.push(pixels);
  }
  const significant = components
    .filter((pixels) => pixels.length >= 5_000)
    .map((pixels) => {
      const bounds = pixels.reduce((current, pixel) => {
        const x = pixel % WIDTH;
        const y = Math.floor(pixel / WIDTH);
        return [
          Math.min(current[0], x),
          Math.min(current[1], y),
          Math.max(current[2], x),
          Math.max(current[3], y),
        ];
      }, [WIDTH, HEIGHT, 0, 0]);
      return Object.freeze({ bounds: Object.freeze(bounds), pixels });
    })
    .sort((left, right) => right.pixels.length - left.pixels.length);
  const acceptedBounds = new Set([
    "533,464,968,828",
    "792,858,1036,1077",
  ]);
  const retained = significant.filter(({ bounds }) => acceptedBounds.has(bounds.join(",")));
  const rejected = significant.filter(({ bounds }) => !acceptedBounds.has(bounds.join(",")));
  if (
    retained.length !== 2
    || rejected.length !== 1
    || rejected[0].bounds.join(",") !== "417,650,566,873"
  ) {
    throw new TypeError("Registered water component signatures changed; review the authority mask before rebuilding.");
  }
  const binary = Buffer.alloc(PIXELS);
  for (const { pixels } of retained) {
    for (const pixel of pixels) binary[pixel] = 255;
  }
  const mask = await sharp(binary, {
    raw: { width: WIDTH, height: HEIGHT, channels: 1 },
  }).blur(0.8).toColourspace("b-w").raw().toBuffer();
  return Object.freeze({
    componentCount: components.length,
    mask,
    rejectedComponents: Object.freeze(rejected.map(({ bounds, pixels }) => Object.freeze({
      bounds,
      pixels: pixels.length,
      reason: "false-positive-city-shadow-pocket",
    }))),
    retainedComponentPixels: Object.freeze(retained.map(({ pixels }) => pixels.length)),
  });
}

const [
  master,
  liveLand,
  registeredParentLand,
  rawLiveWater,
  topOverhang,
  d01DistrictMask,
  d01ContextExclusionMask,
  d01GroundingAndCirculation,
  d02DistrictMask,
  d02ContextExclusionMask,
  d02GroundingAndCirculation,
  d03DistrictMask,
  d03ContextExclusionMask,
  d03GroundContact,
  d03TerrainIntegrationDetail,
  d03RetainingCirculationMass,
  d04DistrictMask,
  d04ContextExclusionMask,
  d04GroundingAndCirculation,
  d04BridgeWaterDetail,
  d05DistrictMask,
  d05ContextExclusionMask,
  d05GroundIntegration,
  d05TerrainIntegrationDetail,
  d05TerraceMass,
  d06DistrictMask,
] =
  await Promise.all([
    imageMetadata(source.master),
    singleChannel(source.liveLandMask),
    singleChannel(source.registeredParentLandMask),
    singleChannel(source.liveWaterMask),
    imageMetadata(source.topOverhang),
    singleChannel(source.d01DistrictMask),
    singleChannel(source.d01ContextExclusionMask),
    imageMetadata(source.d01GroundingAndCirculation),
    singleChannel(source.d02DistrictMask),
    singleChannel(source.d02ContextExclusionMask),
    imageMetadata(source.d02GroundingAndCirculation),
    singleChannel(source.d03DistrictMask),
    singleChannel(source.d03ContextExclusionMask),
    imageMetadata(source.d03GroundContact),
    imageMetadata(source.d03TerrainIntegrationDetail),
    imageMetadata(source.d03RetainingCirculationMass),
    singleChannel(source.d04DistrictMask),
    singleChannel(source.d04ContextExclusionMask),
    imageMetadata(source.d04GroundingAndCirculation),
    imageMetadata(source.d04BridgeWaterDetail),
    singleChannel(source.d05DistrictMask),
    singleChannel(source.d05ContextExclusionMask),
    imageMetadata(source.d05GroundIntegration),
    imageMetadata(source.d05TerrainIntegrationDetail),
    imageMetadata(source.d05TerraceMass),
    singleChannel(source.d06DistrictMask),
  ]);
const d04CompactGatewayBytes = await readFile(source.d04CompactGateway);
const d04CompactGatewayMetadata = await sharp(d04CompactGatewayBytes).metadata();
const [
  bridgeWaterDetailSourceWindow,
  rearRidgeUnderlaySourceWindow,
  closeFabricDetailSourceWindow,
  stationSiteCloseSourceWindow,
] = await Promise.all([
  writeRegisteredAlphaCrop(source.bridgeWaterDetail, outputs.bridgeWaterDetail),
  writeRegisteredAlphaCrop(source.rearRidgeUnderlay, outputs.rearRidgeUnderlay),
  writeRegisteredAlphaCrop(source.closeFabricDetail, outputs.closeFabricDetail),
  writeRegisteredAlphaCrop(source.stationSiteClose, outputs.stationSiteClose),
]);
const cleanedWater = await cleanConnectedWaterMask(rawLiveWater);
const liveWater = cleanedWater.mask;
await writePng(outputs.waterRegistrationMask, sharp(liveWater, {
  raw: { width: WIDTH, height: HEIGHT, channels: 1 },
}).toColourspace("b-w"));
await copyFile(source.liveWaterMask, outputs.progressiveWaterExclusionMask);

let d01RegisteredPixels = 0;
let d01HardRevealPixels = 0;
let d01OutsideSupportPixels = 0;
for (let index = 0; index < PIXELS; index += 1) {
  if (d01DistrictMask[index] > 0) d01RegisteredPixels += 1;
  if (d01ContextExclusionMask[index] > 0 && d01DistrictMask[index] === 0) {
    d01OutsideSupportPixels += 1;
  }
  if (d01ContextExclusionMask[index] >= 240) d01HardRevealPixels += 1;
}
const d01HardRevealFraction = d01HardRevealPixels / d01RegisteredPixels;
if (
  d01OutsideSupportPixels !== 0
  || d01HardRevealFraction < 0.95
  || d01HardRevealFraction > 0.99
) {
  throw new TypeError("The accepted D01 land-first context exclusion violates its registered support.");
}
await copyFile(source.d01ContextExclusionMask, outputs.d01ContextExclusionMask);

const d01GroundingRgba = await sharp(d01GroundingAndCirculation.bytes)
  .ensureAlpha()
  .raw()
  .toBuffer();
let d01GroundingPixels = 0;
let d01GroundingMaximumAlpha = 0;
let d01GroundingOutsideSupportPixels = 0;
let d01GroundingOutsideLandPixels = 0;
let d01GroundingWaterPixels = 0;
for (let index = 0; index < PIXELS; index += 1) {
  const alpha = d01GroundingRgba[index * 4 + 3];
  if (alpha === 0) continue;
  d01GroundingPixels += 1;
  d01GroundingMaximumAlpha = Math.max(d01GroundingMaximumAlpha, alpha);
  if (d01DistrictMask[index] === 0) d01GroundingOutsideSupportPixels += 1;
  if (registeredParentLand[index] < 64) d01GroundingOutsideLandPixels += 1;
  if (rawLiveWater[index] >= 240) d01GroundingWaterPixels += 1;
}
const d01GroundingFraction = d01GroundingPixels / d01RegisteredPixels;
const d01GroundingCornerAlpha = [
  d01GroundingRgba[3],
  d01GroundingRgba[(WIDTH - 1) * 4 + 3],
  d01GroundingRgba[(PIXELS - WIDTH) * 4 + 3],
  d01GroundingRgba[(PIXELS - 1) * 4 + 3],
];
if (
  d01GroundingAndCirculation.metadata.channels !== 4
  || d01GroundingCornerAlpha.some((alpha) => alpha !== 0)
  || d01GroundingOutsideSupportPixels !== 0
  || d01GroundingOutsideLandPixels !== 0
  || d01GroundingWaterPixels !== 0
  || d01GroundingMaximumAlpha > 220
  || d01GroundingFraction < 0.02
  || d01GroundingFraction > 0.06
) {
  throw new TypeError("The accepted D01 grounding layer violates city/land ownership.");
}
await mkdir(path.dirname(outputs.d01GroundingAndCirculation), { recursive: true });
await copyFile(source.d01GroundingAndCirculation, outputs.d01GroundingAndCirculation);

let d02RegisteredPixels = 0;
let d02RegisteredLandPixels = 0;
let d02HardRevealPixels = 0;
let d02OutsideSupportPixels = 0;
for (let index = 0; index < PIXELS; index += 1) {
  if (d02DistrictMask[index] > 0) d02RegisteredPixels += 1;
  if (d02DistrictMask[index] > 0 && registeredParentLand[index] >= 64) {
    d02RegisteredLandPixels += 1;
  }
  if (d02ContextExclusionMask[index] > 0 && d02DistrictMask[index] === 0) {
    d02OutsideSupportPixels += 1;
  }
  if (d02ContextExclusionMask[index] >= 240) d02HardRevealPixels += 1;
}
const d02HardRevealFraction = d02HardRevealPixels / d02RegisteredPixels;
if (
  d02OutsideSupportPixels !== 0
  || d02HardRevealFraction < 0.9
  || d02HardRevealFraction > 0.94
) {
  throw new TypeError("The accepted D02 land-first context exclusion violates its registered support.");
}
await copyFile(source.d02ContextExclusionMask, outputs.d02ContextExclusionMask);

const d02GroundingRgba = await sharp(d02GroundingAndCirculation.bytes)
  .ensureAlpha()
  .raw()
  .toBuffer();
let d02GroundingPixels = 0;
let d02GroundingMaximumAlpha = 0;
let d02GroundingOutsideSupportPixels = 0;
let d02GroundingOutsideLandPixels = 0;
let d02GroundingWaterPixels = 0;
for (let index = 0; index < PIXELS; index += 1) {
  const alpha = d02GroundingRgba[index * 4 + 3];
  if (alpha === 0) continue;
  d02GroundingPixels += 1;
  d02GroundingMaximumAlpha = Math.max(d02GroundingMaximumAlpha, alpha);
  if (d02DistrictMask[index] === 0) d02GroundingOutsideSupportPixels += 1;
  if (registeredParentLand[index] < 64) d02GroundingOutsideLandPixels += 1;
  if (rawLiveWater[index] >= 240) d02GroundingWaterPixels += 1;
}
const d02GroundingFraction = d02GroundingPixels / d02RegisteredLandPixels;
const d02GroundingCornerAlpha = [
  d02GroundingRgba[3],
  d02GroundingRgba[(WIDTH - 1) * 4 + 3],
  d02GroundingRgba[(PIXELS - WIDTH) * 4 + 3],
  d02GroundingRgba[(PIXELS - 1) * 4 + 3],
];
if (
  d02GroundingAndCirculation.metadata.channels !== 4
  || d02GroundingCornerAlpha.some((alpha) => alpha !== 0)
  || d02GroundingOutsideSupportPixels > 512
  || d02GroundingOutsideLandPixels !== 0
  || d02GroundingWaterPixels !== 0
  || d02GroundingMaximumAlpha > 220
  || d02GroundingFraction < 0.02
  || d02GroundingFraction > 0.06
) {
  throw new TypeError("The accepted D02 grounding layer violates city/land ownership.");
}
await mkdir(path.dirname(outputs.d02GroundingAndCirculation), { recursive: true });
await copyFile(source.d02GroundingAndCirculation, outputs.d02GroundingAndCirculation);

let d03RegisteredPixels = 0;
let d03HardRevealPixels = 0;
let d03OutsideSupportPixels = 0;
for (let index = 0; index < PIXELS; index += 1) {
  if (d03DistrictMask[index] > 0) d03RegisteredPixels += 1;
  if (d03ContextExclusionMask[index] > 0 && d03DistrictMask[index] === 0) {
    d03OutsideSupportPixels += 1;
  }
  if (d03ContextExclusionMask[index] >= 240) d03HardRevealPixels += 1;
}
const d03HardRevealFraction = d03HardRevealPixels / d03RegisteredPixels;
if (
  d03OutsideSupportPixels !== 0
  || d03HardRevealFraction < 0.9
  || d03HardRevealFraction > 0.97
) {
  throw new TypeError("The accepted D03 land-first context exclusion violates its registered support.");
}
await copyFile(source.d03ContextExclusionMask, outputs.d03ContextExclusionMask);

const d03GroundContactRgba = await sharp(d03GroundContact.bytes)
  .ensureAlpha()
  .raw()
  .toBuffer();
let d03GroundContactPixels = 0;
let d03GroundContactOutsideSupportPixels = 0;
let d03GroundContactOutsideLandPixels = 0;
let d03GroundContactWaterPixels = 0;
for (let index = 0; index < PIXELS; index += 1) {
  const alpha = d03GroundContactRgba[index * 4 + 3];
  if (alpha === 0) continue;
  d03GroundContactPixels += 1;
  if (d03DistrictMask[index] === 0) d03GroundContactOutsideSupportPixels += 1;
  if (registeredParentLand[index] === 0) d03GroundContactOutsideLandPixels += 1;
  if (rawLiveWater[index] > HARD_WATER_THRESHOLD) d03GroundContactWaterPixels += 1;
}
const d03GroundContactFraction = d03GroundContactPixels / d03RegisteredPixels;
const d03GroundContactCornerAlpha = [
  d03GroundContactRgba[3],
  d03GroundContactRgba[(WIDTH - 1) * 4 + 3],
  d03GroundContactRgba[(PIXELS - WIDTH) * 4 + 3],
  d03GroundContactRgba[(PIXELS - 1) * 4 + 3],
];
if (
  d03GroundContact.metadata.channels !== 4
  || d03GroundContactCornerAlpha.some((alpha) => alpha !== 0)
  || d03GroundContactOutsideSupportPixels !== 0
  || d03GroundContactOutsideLandPixels !== 0
  || d03GroundContactWaterPixels !== 0
  || d03GroundContactFraction < 0.02
  || d03GroundContactFraction > 0.08
) {
  throw new TypeError("The accepted D03 ground-contact layer violates land/water ownership.");
}
await mkdir(path.dirname(outputs.d03GroundContact), { recursive: true });
await copyFile(source.d03GroundContact, outputs.d03GroundContact);

const d03TerrainIntegrationRgba = await sharp(d03TerrainIntegrationDetail.bytes)
  .ensureAlpha()
  .raw()
  .toBuffer();
let d03TerrainIntegrationPixels = 0;
let d03TerrainIntegrationMaximumAlpha = 0;
let d03TerrainIntegrationOutsideSupportPixels = 0;
let d03TerrainIntegrationOutsideLandPixels = 0;
let d03TerrainIntegrationWaterPixels = 0;
for (let index = 0; index < PIXELS; index += 1) {
  const alpha = d03TerrainIntegrationRgba[index * 4 + 3];
  if (alpha === 0) continue;
  d03TerrainIntegrationPixels += 1;
  d03TerrainIntegrationMaximumAlpha = Math.max(d03TerrainIntegrationMaximumAlpha, alpha);
  if (d03DistrictMask[index] === 0) d03TerrainIntegrationOutsideSupportPixels += 1;
  if (registeredParentLand[index] < 64) d03TerrainIntegrationOutsideLandPixels += 1;
  if (rawLiveWater[index] >= 240) d03TerrainIntegrationWaterPixels += 1;
}
const d03TerrainIntegrationFraction = d03TerrainIntegrationPixels / d03RegisteredPixels;
const d03TerrainIntegrationCornerAlpha = [
  d03TerrainIntegrationRgba[3],
  d03TerrainIntegrationRgba[(WIDTH - 1) * 4 + 3],
  d03TerrainIntegrationRgba[(PIXELS - WIDTH) * 4 + 3],
  d03TerrainIntegrationRgba[(PIXELS - 1) * 4 + 3],
];
if (
  d03TerrainIntegrationDetail.metadata.channels !== 4
  || d03TerrainIntegrationCornerAlpha.some((alpha) => alpha !== 0)
  || d03TerrainIntegrationOutsideSupportPixels !== 0
  || d03TerrainIntegrationOutsideLandPixels !== 0
  || d03TerrainIntegrationWaterPixels !== 0
  || d03TerrainIntegrationMaximumAlpha > 220
  || d03TerrainIntegrationFraction < 0.02
  || d03TerrainIntegrationFraction > 0.1
) {
  throw new TypeError("The accepted D03 terrain-integration detail violates city/land ownership.");
}
await mkdir(path.dirname(outputs.d03TerrainIntegrationDetail), { recursive: true });
await copyFile(source.d03TerrainIntegrationDetail, outputs.d03TerrainIntegrationDetail);

const d03RetainingCirculationMassRgba = await sharp(d03RetainingCirculationMass.bytes)
  .ensureAlpha()
  .raw()
  .toBuffer();
let d03RetainingCirculationMassPixels = 0;
let d03RetainingCirculationMassMaximumAlpha = 0;
let d03RetainingCirculationMassOutsideSupportPixels = 0;
let d03RetainingCirculationMassOutsideLandPixels = 0;
let d03RetainingCirculationMassWaterPixels = 0;
let d03RetainingCirculationMassLeft = WIDTH;
let d03RetainingCirculationMassTop = HEIGHT;
let d03RetainingCirculationMassRight = -1;
let d03RetainingCirculationMassBottom = -1;
for (let index = 0; index < PIXELS; index += 1) {
  const alpha = d03RetainingCirculationMassRgba[index * 4 + 3];
  if (alpha === 0) continue;
  const x = index % WIDTH;
  const y = Math.floor(index / WIDTH);
  d03RetainingCirculationMassPixels += 1;
  d03RetainingCirculationMassMaximumAlpha = Math.max(
    d03RetainingCirculationMassMaximumAlpha,
    alpha,
  );
  d03RetainingCirculationMassLeft = Math.min(d03RetainingCirculationMassLeft, x);
  d03RetainingCirculationMassTop = Math.min(d03RetainingCirculationMassTop, y);
  d03RetainingCirculationMassRight = Math.max(d03RetainingCirculationMassRight, x);
  d03RetainingCirculationMassBottom = Math.max(d03RetainingCirculationMassBottom, y);
  if (d03DistrictMask[index] === 0) d03RetainingCirculationMassOutsideSupportPixels += 1;
  if (registeredParentLand[index] < 64) d03RetainingCirculationMassOutsideLandPixels += 1;
  if (rawLiveWater[index] >= 240) d03RetainingCirculationMassWaterPixels += 1;
}
const d03RetainingCirculationMassFraction =
  d03RetainingCirculationMassPixels / d03RegisteredPixels;
const d03RetainingCirculationMassCrop = Object.freeze({
  left: 847,
  top: 521,
  width: 367,
  height: 266,
});
if (
  sha256(d03RetainingCirculationMass.bytes)
    !== "0f06fc17ea7c4291d440f0f0f54652ff33368d739c6334c4b0066cb59825bcc5"
  || d03RetainingCirculationMass.metadata.width !== WIDTH
  || d03RetainingCirculationMass.metadata.height !== HEIGHT
  || d03RetainingCirculationMass.metadata.channels !== 4
  || d03RetainingCirculationMassOutsideSupportPixels !== 0
  || d03RetainingCirculationMassOutsideLandPixels !== 0
  || d03RetainingCirculationMassWaterPixels !== 0
  || d03RetainingCirculationMassMaximumAlpha > 224
  || d03RetainingCirculationMassFraction < 0.04
  || d03RetainingCirculationMassFraction > 0.08
  || d03RetainingCirculationMassLeft !== d03RetainingCirculationMassCrop.left
  || d03RetainingCirculationMassTop !== d03RetainingCirculationMassCrop.top
  || d03RetainingCirculationMassRight
    !== d03RetainingCirculationMassCrop.left + d03RetainingCirculationMassCrop.width - 1
  || d03RetainingCirculationMassBottom
    !== d03RetainingCirculationMassCrop.top + d03RetainingCirculationMassCrop.height - 1
) {
  throw new TypeError(
    "The accepted D03 retaining/circulation mass violates city/land ownership or crop registration.",
  );
}
await writePng(
  outputs.d03RetainingCirculationMass,
  sharp(d03RetainingCirculationMass.bytes).extract(d03RetainingCirculationMassCrop),
);

let d04RegisteredPixels = 0;
let d04HardRevealPixels = 0;
let d04OutsideSupportPixels = 0;
for (let index = 0; index < PIXELS; index += 1) {
  if (d04DistrictMask[index] > 0) d04RegisteredPixels += 1;
  if (d04ContextExclusionMask[index] > 0 && d04DistrictMask[index] === 0) {
    d04OutsideSupportPixels += 1;
  }
  if (d04ContextExclusionMask[index] >= 240) d04HardRevealPixels += 1;
}
const d04HardRevealFraction = d04HardRevealPixels / d04RegisteredPixels;
if (
  d04OutsideSupportPixels !== 0
  || d04HardRevealFraction < 0.9
  || d04HardRevealFraction > 0.94
) {
  throw new TypeError("The accepted D04 land-first context exclusion violates its registered support.");
}
await copyFile(source.d04ContextExclusionMask, outputs.d04ContextExclusionMask);

const d04GroundingRgba = await sharp(d04GroundingAndCirculation.bytes)
  .ensureAlpha()
  .raw()
  .toBuffer();
let d04GroundingPixels = 0;
let d04GroundingMaximumAlpha = 0;
let d04GroundingOutsideSupportPixels = 0;
let d04GroundingOutsideLandPixels = 0;
let d04GroundingWaterPixels = 0;
for (let index = 0; index < PIXELS; index += 1) {
  const alpha = d04GroundingRgba[index * 4 + 3];
  if (alpha === 0) continue;
  d04GroundingPixels += 1;
  d04GroundingMaximumAlpha = Math.max(d04GroundingMaximumAlpha, alpha);
  if (d04DistrictMask[index] === 0) d04GroundingOutsideSupportPixels += 1;
  if (liveLand[index] < 64) d04GroundingOutsideLandPixels += 1;
  if (rawLiveWater[index] >= 240) d04GroundingWaterPixels += 1;
}
const d04GroundingFraction = d04GroundingPixels / d04RegisteredPixels;
const d04GroundingCornerAlpha = [
  d04GroundingRgba[3],
  d04GroundingRgba[(WIDTH - 1) * 4 + 3],
  d04GroundingRgba[(PIXELS - WIDTH) * 4 + 3],
  d04GroundingRgba[(PIXELS - 1) * 4 + 3],
];
if (
  d04GroundingAndCirculation.metadata.channels !== 4
  || d04GroundingCornerAlpha.some((alpha) => alpha !== 0)
  || d04GroundingOutsideSupportPixels > 256
  || d04GroundingOutsideLandPixels !== 0
  || d04GroundingWaterPixels !== 0
  || d04GroundingMaximumAlpha > 220
  || d04GroundingFraction < 0.015
  || d04GroundingFraction > 0.06
) {
  throw new TypeError("The accepted D04 grounding layer violates city/land ownership.");
}
await mkdir(path.dirname(outputs.d04GroundingAndCirculation), { recursive: true });
await copyFile(source.d04GroundingAndCirculation, outputs.d04GroundingAndCirculation);

const d04BridgeWaterRgba = await sharp(d04BridgeWaterDetail.bytes)
  .ensureAlpha()
  .raw()
  .toBuffer();
let d04BridgeWaterPixels = 0;
let d04BridgeWaterMaximumAlpha = 0;
let d04BridgeWaterOutsideSupportPixels = 0;
let d04BridgeWaterOutsideWaterPixels = 0;
for (let index = 0; index < PIXELS; index += 1) {
  const alpha = d04BridgeWaterRgba[index * 4 + 3];
  if (alpha === 0) continue;
  d04BridgeWaterPixels += 1;
  d04BridgeWaterMaximumAlpha = Math.max(d04BridgeWaterMaximumAlpha, alpha);
  if (d04DistrictMask[index] === 0) d04BridgeWaterOutsideSupportPixels += 1;
  if (rawLiveWater[index] < 128) d04BridgeWaterOutsideWaterPixels += 1;
}
const d04BridgeWaterCornerAlpha = [
  d04BridgeWaterRgba[3],
  d04BridgeWaterRgba[(WIDTH - 1) * 4 + 3],
  d04BridgeWaterRgba[(PIXELS - WIDTH) * 4 + 3],
  d04BridgeWaterRgba[(PIXELS - 1) * 4 + 3],
];
if (
  d04BridgeWaterDetail.metadata.channels !== 4
  || d04BridgeWaterCornerAlpha.some((alpha) => alpha !== 0)
  || d04BridgeWaterPixels < 50
  || d04BridgeWaterPixels > 200
  || d04BridgeWaterMaximumAlpha > 150
  || d04BridgeWaterOutsideSupportPixels !== 0
  || d04BridgeWaterOutsideWaterPixels !== 0
) {
  throw new TypeError("The accepted D04 bridge-water detail violates water ownership.");
}
await mkdir(path.dirname(outputs.d04BridgeWaterDetail), { recursive: true });
await copyFile(source.d04BridgeWaterDetail, outputs.d04BridgeWaterDetail);

const d04CompactGatewayRgba = await sharp(d04CompactGatewayBytes)
  .ensureAlpha()
  .raw()
  .toBuffer();
const d04CompactGatewayPixels = 1318 * 1193;
const d04CompactGatewayCornerAlpha = [
  d04CompactGatewayRgba[3],
  d04CompactGatewayRgba[(1318 - 1) * 4 + 3],
  d04CompactGatewayRgba[(d04CompactGatewayPixels - 1318) * 4 + 3],
  d04CompactGatewayRgba[(d04CompactGatewayPixels - 1) * 4 + 3],
];
if (
  d04CompactGatewayMetadata.width !== 1318
  || d04CompactGatewayMetadata.height !== 1193
  || d04CompactGatewayMetadata.channels !== 4
  || d04CompactGatewayCornerAlpha.some((alpha) => alpha !== 0)
) {
  throw new TypeError("The accepted D04 compact gateway violates its registered asset contract.");
}
await mkdir(path.dirname(outputs.d04CompactGateway), { recursive: true });
await copyFile(source.d04CompactGateway, outputs.d04CompactGateway);

let d05RegisteredPixels = 0;
let d05HardRevealPixels = 0;
let d05OutsideSupportPixels = 0;
for (let index = 0; index < PIXELS; index += 1) {
  if (d05DistrictMask[index] > 0) d05RegisteredPixels += 1;
  if (d05ContextExclusionMask[index] > 0 && d05DistrictMask[index] === 0) {
    d05OutsideSupportPixels += 1;
  }
  if (d05ContextExclusionMask[index] >= 240) d05HardRevealPixels += 1;
}
const d05HardRevealFraction = d05HardRevealPixels / d05RegisteredPixels;
if (
  d05OutsideSupportPixels !== 0
  || d05HardRevealFraction < 0.96
  || d05HardRevealFraction > 0.99
) {
  throw new TypeError("The accepted D05 land-first context exclusion violates its registered support.");
}
await copyFile(source.d05ContextExclusionMask, outputs.d05ContextExclusionMask);

const d05GroundIntegrationRgba = await sharp(d05GroundIntegration.bytes)
  .ensureAlpha()
  .raw()
  .toBuffer();
let d05GroundIntegrationPixels = 0;
let d05GroundIntegrationOutsideSupportPixels = 0;
let d05GroundIntegrationOutsideLandPixels = 0;
let d05GroundIntegrationWaterPixels = 0;
for (let index = 0; index < PIXELS; index += 1) {
  const alpha = d05GroundIntegrationRgba[index * 4 + 3];
  if (alpha === 0) continue;
  d05GroundIntegrationPixels += 1;
  if (d05DistrictMask[index] === 0) d05GroundIntegrationOutsideSupportPixels += 1;
  if (registeredParentLand[index] < 64) d05GroundIntegrationOutsideLandPixels += 1;
  if (rawLiveWater[index] >= 240) d05GroundIntegrationWaterPixels += 1;
}
const d05GroundIntegrationFraction = d05GroundIntegrationPixels / d05RegisteredPixels;
const d05GroundIntegrationCornerAlpha = [
  d05GroundIntegrationRgba[3],
  d05GroundIntegrationRgba[(WIDTH - 1) * 4 + 3],
  d05GroundIntegrationRgba[(PIXELS - WIDTH) * 4 + 3],
  d05GroundIntegrationRgba[(PIXELS - 1) * 4 + 3],
];
if (
  d05GroundIntegration.metadata.channels !== 4
  || d05GroundIntegrationCornerAlpha.some((alpha) => alpha !== 0)
  || d05GroundIntegrationOutsideSupportPixels !== 0
  || d05GroundIntegrationOutsideLandPixels !== 0
  || d05GroundIntegrationWaterPixels !== 0
  || d05GroundIntegrationFraction < 0.015
  || d05GroundIntegrationFraction > 0.05
) {
  throw new TypeError("The accepted D05 ground-integration layer violates land/water ownership.");
}
await mkdir(path.dirname(outputs.d05GroundIntegration), { recursive: true });
await copyFile(source.d05GroundIntegration, outputs.d05GroundIntegration);

const d05TerrainIntegrationRgba = await sharp(d05TerrainIntegrationDetail.bytes)
  .ensureAlpha()
  .raw()
  .toBuffer();
let d05TerrainIntegrationPixels = 0;
let d05TerrainIntegrationMaximumAlpha = 0;
let d05TerrainIntegrationOutsideSupportPixels = 0;
let d05TerrainIntegrationOutsideLandPixels = 0;
let d05TerrainIntegrationWaterPixels = 0;
for (let index = 0; index < PIXELS; index += 1) {
  const alpha = d05TerrainIntegrationRgba[index * 4 + 3];
  if (alpha === 0) continue;
  d05TerrainIntegrationPixels += 1;
  d05TerrainIntegrationMaximumAlpha = Math.max(d05TerrainIntegrationMaximumAlpha, alpha);
  if (d05DistrictMask[index] === 0) d05TerrainIntegrationOutsideSupportPixels += 1;
  if (registeredParentLand[index] < 64) d05TerrainIntegrationOutsideLandPixels += 1;
  if (rawLiveWater[index] >= 240) d05TerrainIntegrationWaterPixels += 1;
}
const d05TerrainIntegrationFraction = d05TerrainIntegrationPixels / d05RegisteredPixels;
const d05TerrainIntegrationCornerAlpha = [
  d05TerrainIntegrationRgba[3],
  d05TerrainIntegrationRgba[(WIDTH - 1) * 4 + 3],
  d05TerrainIntegrationRgba[(PIXELS - WIDTH) * 4 + 3],
  d05TerrainIntegrationRgba[(PIXELS - 1) * 4 + 3],
];
if (
  d05TerrainIntegrationDetail.metadata.channels !== 4
  || d05TerrainIntegrationCornerAlpha.some((alpha) => alpha !== 0)
  || d05TerrainIntegrationOutsideSupportPixels !== 0
  || d05TerrainIntegrationOutsideLandPixels !== 0
  || d05TerrainIntegrationWaterPixels !== 0
  || d05TerrainIntegrationMaximumAlpha > 220
  || d05TerrainIntegrationFraction < 0.015
  || d05TerrainIntegrationFraction > 0.06
) {
  throw new TypeError("The accepted D05 terrain-integration detail violates city/land ownership.");
}
await mkdir(path.dirname(outputs.d05TerrainIntegrationDetail), { recursive: true });
await copyFile(source.d05TerrainIntegrationDetail, outputs.d05TerrainIntegrationDetail);

const d05TerraceMassRgba = await sharp(d05TerraceMass.bytes)
  .ensureAlpha()
  .raw()
  .toBuffer();
let d05TerraceMassPixels = 0;
let d05TerraceMassMaximumAlpha = 0;
let d05TerraceMassOutsideSupportPixels = 0;
let d05TerraceMassOutsideLandPixels = 0;
let d05TerraceMassWaterPixels = 0;
let d05TerraceMassLeft = WIDTH;
let d05TerraceMassTop = HEIGHT;
let d05TerraceMassRight = -1;
let d05TerraceMassBottom = -1;
for (let index = 0; index < PIXELS; index += 1) {
  const alpha = d05TerraceMassRgba[index * 4 + 3];
  if (alpha === 0) continue;
  const x = index % WIDTH;
  const y = Math.floor(index / WIDTH);
  d05TerraceMassPixels += 1;
  d05TerraceMassMaximumAlpha = Math.max(d05TerraceMassMaximumAlpha, alpha);
  d05TerraceMassLeft = Math.min(d05TerraceMassLeft, x);
  d05TerraceMassTop = Math.min(d05TerraceMassTop, y);
  d05TerraceMassRight = Math.max(d05TerraceMassRight, x);
  d05TerraceMassBottom = Math.max(d05TerraceMassBottom, y);
  if (d05DistrictMask[index] === 0) d05TerraceMassOutsideSupportPixels += 1;
  if (registeredParentLand[index] < 64) d05TerraceMassOutsideLandPixels += 1;
  if (rawLiveWater[index] >= 240) d05TerraceMassWaterPixels += 1;
}
const d05TerraceMassFraction = d05TerraceMassPixels / d05RegisteredPixels;
const d05TerraceMassCrop = Object.freeze({
  left: 122,
  top: 646,
  width: 524,
  height: 364,
});
if (
  sha256(d05TerraceMass.bytes) !== "b69771147295cfcde77a85d6b30514b71236e193e52d013cd5978646fc21836c"
  || d05TerraceMass.metadata.channels !== 4
  || d05TerraceMassOutsideSupportPixels !== 0
  || d05TerraceMassOutsideLandPixels !== 0
  || d05TerraceMassWaterPixels !== 0
  || d05TerraceMassMaximumAlpha > 224
  || d05TerraceMassFraction < 0.04
  || d05TerraceMassFraction > 0.1
  || d05TerraceMassLeft !== d05TerraceMassCrop.left
  || d05TerraceMassTop !== d05TerraceMassCrop.top
  || d05TerraceMassRight !== d05TerraceMassCrop.left + d05TerraceMassCrop.width - 1
  || d05TerraceMassBottom !== d05TerraceMassCrop.top + d05TerraceMassCrop.height - 1
) {
  throw new TypeError("The accepted D05 terrace-mass layer violates city/land ownership or crop registration.");
}
await writePng(
  outputs.d05TerraceMass,
  sharp(d05TerraceMass.bytes).extract(d05TerraceMassCrop),
);

const registeredCityMaskRaw = Buffer.alloc(PIXELS);
for (let index = 0; index < PIXELS; index += 1) {
  registeredCityMaskRaw[index] = Math.round(
    liveLand[index] * registeredParentLand[index] / 255,
  );
}
const softenedRegisteredCityMask = await sharp(registeredCityMaskRaw, {
  raw: { width: WIDTH, height: HEIGHT, channels: 1 },
}).blur(0.6).toColourspace("b-w").raw().toBuffer();
const registeredCityMask = Buffer.alloc(PIXELS);
for (let index = 0; index < PIXELS; index += 1) {
  const waterExclusion = Math.min(255, Math.round(liveWater[index] * 2.5));
  registeredCityMask[index] = Math.round(
    softenedRegisteredCityMask[index] * (255 - waterExclusion) / 255,
  );
}

const masterRgb = await sharp(master.bytes).removeAlpha().raw().toBuffer();
const landscapeRgba = Buffer.alloc(PIXELS * 4);
for (let index = 0; index < PIXELS; index += 1) {
  const rgb = index * 3;
  const rgba = index * 4;
  landscapeRgba[rgba] = masterRgb[rgb];
  landscapeRgba[rgba + 1] = masterRgb[rgb + 1];
  landscapeRgba[rgba + 2] = masterRgb[rgb + 2];
  landscapeRgba[rgba + 3] = registeredCityMask[index];
}

await writePng(outputs.landscape, sharp(landscapeRgba, {
  raw: { width: WIDTH, height: HEIGHT, channels: 4 },
}));
await writePng(outputs.overhang, sharp(topOverhang.bytes).ensureAlpha());

const landscapeBytes = await readFile(outputs.landscape);
const overhangBytes = await readFile(outputs.overhang);
await writePng(outputs.composite, sharp({
  create: {
    width: WIDTH,
    height: HEIGHT,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
}).composite([
  { input: landscapeBytes, blend: "over" },
  { input: overhangBytes, blend: "over" },
]));
await writePng(
  outputs.territory,
  sharp(await readFile(outputs.composite)).resize(512, 384, {
    fit: "fill",
    kernel: sharp.kernel.lanczos3,
  }),
);

const [wideCityBlur, narrowCityBlur] = await Promise.all([
  sharp(registeredCityMask, {
    raw: { width: WIDTH, height: HEIGHT, channels: 1 },
  }).blur(7).toColourspace("b-w").raw().toBuffer(),
  sharp(registeredCityMask, {
    raw: { width: WIDTH, height: HEIGHT, channels: 1 },
  }).blur(2.2).toColourspace("b-w").raw().toBuffer(),
]);
const waterInteractionRgba = Buffer.alloc(PIXELS * 4);
for (let index = 0; index < PIXELS; index += 1) {
  const water = liveWater[index] / 255;
  const wide = Math.max(0, wideCityBlur[index] - registeredCityMask[index]) / 255 * water;
  const narrow = Math.max(0, narrowCityBlur[index] - registeredCityMask[index]) / 255 * water;
  const alpha = Math.min(72, Math.round(wide * 40 + narrow * 46));
  const lightMix = wide + narrow > 0 ? narrow / (wide + narrow) : 0;
  const rgba = index * 4;
  waterInteractionRgba[rgba] = Math.round(4 + lightMix * 44);
  waterInteractionRgba[rgba + 1] = Math.round(13 + lightMix * 92);
  waterInteractionRgba[rgba + 2] = Math.round(17 + lightMix * 104);
  waterInteractionRgba[rgba + 3] = alpha;
}
await writePng(outputs.waterInteraction, sharp(waterInteractionRgba, {
  raw: { width: WIDTH, height: HEIGHT, channels: 4 },
}));

const foundation = await sharp(await readFile(outputs.composite))
  .ensureAlpha()
  .raw()
  .toBuffer();
const softenedD06DistrictMask = await sharp(d06DistrictMask, {
  raw: { width: WIDTH, height: HEIGHT, channels: 1 },
}).blur(1.4).toColourspace("b-w").raw().toBuffer();
const capitalContext = Buffer.from(foundation);
for (let index = 0; index < PIXELS; index += 1) {
  const alphaOffset = index * 4 + 3;
  capitalContext[alphaOffset] = Math.round(
    capitalContext[alphaOffset] * (255 - softenedD06DistrictMask[index]) / 255,
  );
}
await writePng(outputs.capitalContext, sharp(capitalContext, {
  raw: { width: WIDTH, height: HEIGHT, channels: 4 },
}));
const foliageManifest = JSON.parse(await readFile(source.foliageManifest, "utf8"));
const nativeFoliageReuse = await analyzeNativeFoliageReuse(capitalContext, foliageManifest);
const d02RegisteredNativeFoliageInstanceIds = Object.freeze([
  "c1-native-conifer-031-instance",
  "c1-native-conifer-038-instance",
  "c1-native-conifer-041-instance",
  "c1-native-conifer-042-instance",
  "c1-native-conifer-053-instance",
  "c1-native-conifer-055-instance",
  "c1-native-conifer-060-instance",
  "c1-native-conifer-063-instance",
  "c1-native-conifer-064-instance",
]);
const d03RegisteredNativeFoliageInstanceIds = Object.freeze([
  "c1-native-conifer-044-instance",
  "c1-native-conifer-048-instance",
  "c1-native-conifer-049-instance",
  "c1-native-conifer-054-instance",
  "c1-native-conifer-056-instance",
  "c1-native-conifer-065-instance",
  "c1-native-conifer-067-instance",
  "c1-native-conifer-069-instance",
  "c1-native-conifer-070-instance",
  "c1-native-conifer-071-instance",
  "c2-native-conifer-074-instance",
  "c2-native-conifer-075-instance",
  "c2-native-conifer-083-instance",
  "c2-native-conifer-088-instance",
  "c2-native-conifer-093-instance",
  "c2-native-conifer-110-instance",
]);
await mkdir(path.dirname(outputs.nativeFoliageReuseManifest), { recursive: true });
await writeBytesIfChanged(outputs.nativeFoliageReuseManifest, Buffer.from(`${JSON.stringify({
  schemaVersion: 1,
  id: "career-world/capitals/ninjaone/city-native-foliage-reuse@r1",
  sourceContext: "/career-world/capitals/ninjaone/city-r3/foundation/city-context-capital-without-d06-r1-alpha.png",
  sourceFoliageManifestId: foliageManifest.id,
  admission: {
    method: "registered-L2-canopy-alpha-intersection-with-existing-city-vegetation-and-contact",
    thresholds: nativeFoliageReuse.thresholds,
  },
  instances: nativeFoliageReuse.admitted,
  districtInstances: {
    D02: {
      method: "existing-L2-tree-node-positions-registered-to-baked-D02-ridge-foliage",
      sourceContext: "/career-world/capitals/ninjaone/city-r3/foundation/city-context-capital-without-d06-r1-alpha.png",
      instances: d02RegisteredNativeFoliageInstanceIds.map((id) => ({ id })),
    },
    D03: {
      method: "existing-L2-tree-node-positions-registered-to-baked-D03-native-land-foliage",
      sourceContext: "/career-world/capitals/ninjaone/city-r3/foundation/city-context-capital-without-d06-r1-alpha.png",
      instances: d03RegisteredNativeFoliageInstanceIds.map((id) => ({ id })),
    },
  },
}, null, 2)}\n`, "utf8"));
let waterPixels = 0;
let coveredWaterPixels = 0;
let transparentPixels = 0;
for (let index = 0; index < PIXELS; index += 1) {
  const alpha = foundation[index * 4 + 3];
  if (alpha === 0) transparentPixels += 1;
  if (liveWater[index] > 127) {
    waterPixels += 1;
    if (alpha > 16) coveredWaterPixels += 1;
  }
}
const waterCoverage = coveredWaterPixels / waterPixels;
if (waterCoverage >= 0.18) {
  throw new TypeError(`City foundation covers ${(waterCoverage * 100).toFixed(2)}% of inland water.`);
}

const sourceHashes = Object.fromEntries(await Promise.all(
  Object.entries(source).map(async ([id, file]) => [id, sha256(await readFile(file))]),
));
const manifest = {
  schemaVersion: 1,
  id: "career-world/capitals/ninjaone/city-foundation@r3",
  status: "active-registered-foundation",
  authority: {
    artboard: [WIDTH, HEIGHT],
    sourceMasterSha256: sourceHashes.master,
    registration: {
      uniformScale: 0.98,
      translation: [20, 60],
      method: "registered-parent-land-intersection-plus-independent-top-overhang",
    },
    ownership: {
      globalWater: "L1-and-L3-immutable",
      globalLand: "L2-immutable",
      cityWaterInteraction: "L4_0-reversible",
      cityLandscapeModification: "L4_1-reversible",
      cityTerrainIntegrationDetail: "L4_1-reversible",
    },
    waterRegistration: {
      sourceComponentCount: cleanedWater.componentCount,
      rejectedComponents: cleanedWater.rejectedComponents,
      retainedComponentPixels: cleanedWater.retainedComponentPixels,
      mask: await artifact(outputs.waterRegistrationMask),
    },
    progressiveDetailWaterExclusion: {
      method: "byte-exact-live-water-authority",
      mask: await artifact(outputs.progressiveWaterExclusionMask),
    },
    progressiveDistrictContextExclusions: {
      D01: {
        method: "continuous-D01-context-exclusion-plus-city-owned-L4_1-grounding",
        hardRevealFraction: d01HardRevealFraction,
        mask: await artifact(outputs.d01ContextExclusionMask),
        contactFraction: d01GroundingFraction,
        contactLayer: await artifact(outputs.d01GroundingAndCirculation),
      },
      D02: {
        method: "continuous-D02-context-exclusion-plus-city-owned-L4_1-grounding",
        hardRevealFraction: d02HardRevealFraction,
        mask: await artifact(outputs.d02ContextExclusionMask),
        contactFraction: d02GroundingFraction,
        outsideDistrictContactPixels: d02GroundingOutsideSupportPixels,
        contactLayer: await artifact(outputs.d02GroundingAndCirculation),
      },
      D03: {
        method: "continuous-D03-context-exclusion-plus-city-owned-L4_1-grounding",
        hardRevealFraction: d03HardRevealFraction,
        mask: await artifact(outputs.d03ContextExclusionMask),
        contactFraction: d03GroundContactFraction,
        contactLayer: await artifact(outputs.d03GroundContact),
        terrainIntegrationFraction: d03TerrainIntegrationFraction,
        terrainIntegrationLayer: await artifact(outputs.d03TerrainIntegrationDetail),
        retainingCirculationMassFraction: d03RetainingCirculationMassFraction,
        retainingCirculationMassLayer: await artifact(outputs.d03RetainingCirculationMass),
        retainingCirculationMassPlacement: {
          anchor: [
            d03RetainingCirculationMassCrop.left,
            d03RetainingCirculationMassCrop.top,
          ],
          baseSize: [
            d03RetainingCirculationMassCrop.width,
            d03RetainingCirculationMassCrop.height,
          ],
          scale: 1,
        },
      },
      D04: {
        method: "continuous-D04-context-exclusion-plus-city-owned-L4_0-L4_1-and-L4_3-detail",
        hardRevealFraction: d04HardRevealFraction,
        mask: await artifact(outputs.d04ContextExclusionMask),
        contactFraction: d04GroundingFraction,
        outsideDistrictContactPixels: d04GroundingOutsideSupportPixels,
        contactLayer: await artifact(outputs.d04GroundingAndCirculation),
        waterDetailPixels: d04BridgeWaterPixels,
        waterDetailLayer: await artifact(outputs.d04BridgeWaterDetail),
        gatewayLayer: await artifact(outputs.d04CompactGateway),
      },
      D05: {
        method: "continuous-D05-context-exclusion-plus-city-owned-L4_1-grounding",
        hardRevealFraction: d05HardRevealFraction,
        mask: await artifact(outputs.d05ContextExclusionMask),
        contactFraction: d05GroundIntegrationFraction,
        contactLayer: await artifact(outputs.d05GroundIntegration),
        terrainIntegrationFraction: d05TerrainIntegrationFraction,
        terrainIntegrationLayer: await artifact(outputs.d05TerrainIntegrationDetail),
        terraceMassFraction: d05TerraceMassFraction,
        terraceMassLayer: await artifact(outputs.d05TerraceMass),
        terraceMassPlacement: {
          anchor: [d05TerraceMassCrop.left, d05TerraceMassCrop.top],
          baseSize: [d05TerraceMassCrop.width, d05TerraceMassCrop.height],
          scale: 1,
        },
      },
    },
  },
  lod: {
    world: "interface-marker-only",
    territory: "preload-cache-only-not-runtime-visible",
    capital: "registered-1448x1086-foundation-layers",
    site: "capital-foundation-plus-registered-district-cohort",
    close: "site-cohort-plus-registered-detail-and-actor-layers",
  },
  layers: [
    { id: "L4_0", role: "city-water-interaction", asset: await artifact(outputs.waterInteraction) },
    { id: "L4", role: "capital-composite-context-with-D06-exclusion", asset: await artifact(outputs.capitalContext) },
  ],
  runtimeAssets: [
    {
      id: "D01L02",
      layerId: "L4_1",
      role: "crown-grounding-and-circulation",
      tiers: ["site", "close"],
      asset: await artifact(outputs.d01GroundingAndCirculation),
    },
    {
      id: "D02L02",
      layerId: "L4_1",
      role: "dojo-ridge-grounding-and-circulation",
      tiers: ["site", "close"],
      asset: await artifact(outputs.d02GroundingAndCirculation),
    },
    {
      id: "D03L02",
      layerId: "L4_1",
      role: "eastern-industry-ground-contact-platforms",
      tiers: ["site", "close"],
      asset: await artifact(outputs.d03GroundContact),
    },
    {
      id: "D03L03",
      layerId: "L4_1",
      role: "eastern-industry-terrain-integration-detail",
      tiers: ["site", "close"],
      asset: await artifact(outputs.d03TerrainIntegrationDetail),
    },
    {
      id: "D03L04",
      layerId: "L4_1",
      role: "eastern-industry-retaining-circulation-mass",
      tiers: ["site", "close"],
      placement: {
        anchor: [
          d03RetainingCirculationMassCrop.left,
          d03RetainingCirculationMassCrop.top,
        ],
        baseSize: [
          d03RetainingCirculationMassCrop.width,
          d03RetainingCirculationMassCrop.height,
        ],
        scale: 1,
      },
      asset: await artifact(outputs.d03RetainingCirculationMass),
    },
    {
      id: "D04W02",
      layerId: "L4_0",
      role: "central-lake-bridge-water-contact-detail",
      tiers: ["site", "close"],
      asset: await artifact(outputs.d04BridgeWaterDetail),
    },
    {
      id: "D04L02",
      layerId: "L4_1",
      role: "central-lake-grounding-and-circulation",
      tiers: ["site", "close"],
      asset: await artifact(outputs.d04GroundingAndCirculation),
    },
    {
      id: "S14D04",
      layerId: "L4_3",
      role: "compact-central-lake-water-gateway",
      tiers: ["site", "close"],
      placement: { anchor: [794, 731], baseSize: [114, 114 * 1193 / 1318], scale: 1 },
      asset: await artifact(outputs.d04CompactGateway),
    },
    {
      id: "D05L02",
      layerId: "L4_1",
      role: "western-skill-ground-integration",
      tiers: ["site", "close"],
      asset: await artifact(outputs.d05GroundIntegration),
    },
    {
      id: "D05L03",
      layerId: "L4_1",
      role: "western-skill-terrain-integration-detail",
      tiers: ["site", "close"],
      asset: await artifact(outputs.d05TerrainIntegrationDetail),
    },
    {
      id: "D05L04",
      layerId: "L4_1",
      role: "western-skill-terrace-mass",
      tiers: ["site", "close"],
      placement: {
        anchor: [d05TerraceMassCrop.left, d05TerraceMassCrop.top],
        baseSize: [d05TerraceMassCrop.width, d05TerraceMassCrop.height],
        scale: 1,
      },
      asset: await artifact(outputs.d05TerraceMass),
    },
    {
      id: "WFX01",
      layerId: "L4_0",
      role: "support-localized-water-detail",
      tiers: ["site", "close"],
      sourceWindow: bridgeWaterDetailSourceWindow,
      asset: await artifact(outputs.bridgeWaterDetail),
    },
    {
      id: "LFX06",
      layerId: "L4_1",
      role: "upper-rear-native-ridge-underlay",
      tiers: ["capital", "site", "close"],
      sourceWindow: rearRidgeUnderlaySourceWindow,
      asset: await artifact(outputs.rearRidgeUnderlay),
    },
    {
      id: "CFX01",
      layerId: "L4_4",
      role: "parent-derived-fabric-detail",
      tiers: ["site", "close"],
      sourceWindow: closeFabricDetailSourceWindow,
      asset: await artifact(outputs.closeFabricDetail),
    },
    {
      id: "CFX02",
      layerId: "L4_4",
      role: "central-architecture-detail",
      tiers: ["close"],
      asset: await artifact(outputs.centralArchitectureDetail),
    },
    {
      id: "I20",
      layerId: "L4_2",
      role: "train-free-capital-station",
      tiers: ["capital"],
      placement: { anchor: [1005, 1086], baseSize: [610, 610 * 191 / 384], scale: 1 },
      asset: await artifact(outputs.stationCapital),
    },
    {
      id: "I24",
      layerId: "L4_2",
      role: "cliff-registered-undercroft-site-close-station",
      tiers: ["site", "close"],
      placement: { anchor: [1056.5, 1086], baseSize: [783, 587], scale: 0.72 },
      sourceWindow: stationSiteCloseSourceWindow,
      asset: await artifact(outputs.stationSiteClose),
    },
  ],
  deliveries: {
    composite: await artifact(outputs.composite),
    territory: await artifact(outputs.territory),
  },
  verification: {
    transparentPixels,
    transparentFraction: transparentPixels / PIXELS,
    inlandWaterPixels: waterPixels,
    coveredInlandWaterPixels: coveredWaterPixels,
    inlandWaterCoverageFraction: waterCoverage,
    maximumInlandWaterCoverageFraction: 0.18,
  },
  sourceHashes,
};
await mkdir(path.dirname(outputs.manifest), { recursive: true });
await writeBytesIfChanged(
  outputs.manifest,
  Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8"),
);

console.log(JSON.stringify({
  manifest: path.relative(ROOT, outputs.manifest).replaceAll("\\", "/"),
  transparentFraction: manifest.verification.transparentFraction,
  inlandWaterCoverageFraction: waterCoverage,
  outputs: Object.fromEntries(Object.entries(outputs).map(([id, file]) => [
    id,
    path.relative(ROOT, file).replaceAll("\\", "/"),
  ])),
}, null, 2));
