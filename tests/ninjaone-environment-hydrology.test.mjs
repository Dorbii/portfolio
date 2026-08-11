import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import sharp from "sharp";
import {
  createNinjaOneEnvironmentNativeHydrologyAdmissionSnapshot,
} from "../features/career-world/development/model/ninjaOneEnvironmentResidency.ts";
import { WaterSurfaceController } from "../features/career-world/layers/water-surface/rendering/WaterSurfaceController.ts";
import {
  advanceRegionalHydrologyVisibility,
  beginRegionalHydrologyFadeIn,
  beginRegionalHydrologyFadeOut,
  createRegionalHydrologyLoadState,
  createRegionalHydrologyVisibilityState,
  nativeHydrologyAdmissionSnapshotIsUsable,
  planRegionalHydrologyCohort,
  RegionalHydrologyDecodeBarrier,
  regionalHydrologyCohortChangeRequiresFade,
  regionalHydrologyLoadMaySettle,
  retargetRegionalHydrologyLoad,
  retainTextureTransientPeak,
  selectRegionalHydrologyRegionIds,
  settleRegionalHydrologyLoad,
  viewIntersectsHydrologyRegistration,
} from "../features/career-world/layers/water-surface/rendering/hydrology-runtime.ts";
import { WATER_SHADER_NINJAONE_STREAMS } from "../features/career-world/layers/water-surface/rendering/shaders/ninjaone-streams.ts";
import {
  createTexture,
  loadImage,
  loadVerifiedImage,
  releaseDecodedImage,
} from "../features/career-world/layers/water-surface/rendering/webgl.ts";
import {
  WATER_SHADER_COMMON,
} from "../features/career-world/layers/water-surface/rendering/shaders/common.ts";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(
  root,
  "public/career-world/capitals/ninjaone/environment/manifests/"
    + "hydrology-native-r2.json",
);
const seamIntegrationManifestPath = path.join(
  root,
  "public/career-world/capitals/ninjaone/environment/manifests/"
    + "seam-integration-native-r2.json",
);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}

function publicAssetPath(versionedPath) {
  return path.join(root, "public", versionedPath.split("?")[0].replace(/^\//, ""));
}

async function readManifest() {
  return JSON.parse(await readFile(manifestPath, "utf8"));
}

async function readRegionalTier(manifest, tierId) {
  const tier = manifest.regionalFields.tiers[tierId];
  const [width, height] = tier.fullFieldDimensions;
  const field = Buffer.alloc(width * height * 4);
  const auxiliary = Buffer.alloc(width * height * 4);
  const owned = new Uint8Array(width * height);
  const decodedResources = [];
  for (const resource of tier.resources) {
    const pngBytes = await readFile(publicAssetPath(resource.path));
    assert.equal(sha256(pngBytes), resource.sha256, `${resource.id} PNG hash drifted`);
    const { data, info } = await sharp(pngBytes)
      .raw()
      .toBuffer({ resolveWithObject: true });
    assert.deepEqual(
      [info.width, info.height, info.channels],
      [...resource.dimensions, 4],
    );
    assert.equal(data.length, resource.decodedBytes);
    const [left, top, right, bottom] = resource.sourceBounds;
    const [fieldWidth, fieldHeight] = resource.fieldDimensions;
    assert.deepEqual([right - left, bottom - top], resource.fieldDimensions);
    assert.deepEqual(resource.dimensions, [fieldWidth * 2, fieldHeight]);
    const primaryData = Buffer.alloc(fieldWidth * fieldHeight * 4);
    const auxiliaryData = Buffer.alloc(fieldWidth * fieldHeight * 4);
    for (let row = 0; row < fieldHeight; row += 1) {
      const packedStart = row * info.width * 4;
      const logicalStart = row * fieldWidth * 4;
      data.copy(
        primaryData,
        logicalStart,
        packedStart,
        packedStart + fieldWidth * 4,
      );
      data.copy(
        auxiliaryData,
        logicalStart,
        packedStart + fieldWidth * 4,
        packedStart + fieldWidth * 8,
      );
      for (let column = 0; column < fieldWidth; column += 1) {
        const targetPixel = (top + row) * width + left + column;
        assert.equal(owned[targetPixel], 0, `${resource.id} overlaps another crop`);
        owned[targetPixel] = 1;
      }
      const sourceStart = row * fieldWidth * 4;
      const targetStart = ((top + row) * width + left) * 4;
      primaryData.copy(field, targetStart, sourceStart, sourceStart + fieldWidth * 4);
      auxiliaryData.copy(auxiliary, targetStart, sourceStart, sourceStart + fieldWidth * 4);
    }
    assert.equal(sha256(primaryData), resource.metrics.rawPrimaryRgbaSha256);
    assert.equal(sha256(auxiliaryData), resource.metrics.rawAuxiliaryRgbaSha256);
    decodedResources.push(Object.freeze({
      auxiliaryData,
      data: primaryData,
      info: Object.freeze({ channels: 4, height: fieldHeight, width: fieldWidth }),
      resource,
    }));
  }
  return Object.freeze({
    auxiliary,
    data: field,
    info: Object.freeze({ channels: 4, height, width }),
    owned,
    resources: Object.freeze(decodedResources),
  });
}

async function readRegisteredTerrainMaster(manifest, width, height) {
  const sourceBytes = await readFile(path.join(root, manifest.source.path.slice(1)));
  assert.equal(sha256(sourceBytes), manifest.source.sha256, "terrain-master authority drifted");
  const { data, info } = await sharp(sourceBytes)
    .resize(width, height, { fit: "fill", kernel: "lanczos3" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  assert.deepEqual([info.width, info.height, info.channels], [width, height, 4]);
  return data;
}

async function readGreyscaleIntentReference(manifest, filename, width, height) {
  const reference = manifest.source.intentReferences.find(({ path: sourcePath }) => (
    sourcePath.endsWith(`/${filename}`)
  ));
  assert.ok(reference, `${filename} is missing from the intent references`);
  const sourceBytes = await readFile(path.join(root, reference.path.slice(1)));
  assert.equal(sha256(sourceBytes), reference.sha256, `${filename} authority drifted`);
  const { data, info } = await sharp(sourceBytes)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  assert.deepEqual([info.width, info.height, info.channels], [width, height, 1]);
  return data;
}

function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function smoothstep(edge0, edge1, value) {
  const amount = clamp((value - edge0) / Math.max(edge1 - edge0, 1e-9));
  return amount * amount * (3 - 2 * amount);
}

function distanceToSegment(point, start, end) {
  const deltaX = end[0] - start[0];
  const deltaY = end[1] - start[1];
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;
  const amount = lengthSquared <= 1e-9
    ? 0
    : clamp(
      ((point[0] - start[0]) * deltaX + (point[1] - start[1]) * deltaY)
        / lengthSquared,
    );
  return Math.hypot(
    point[0] - (start[0] + deltaX * amount),
    point[1] - (start[1] + deltaY * amount),
  );
}

function pointWithinCascadeVfxEnvelope(point, cascade, tolerance = 0) {
  const crestCenter = cascade.crest.start.map((value, index) => (
    (value + cascade.crest.end[index]) * 0.5
  ));
  const direction = cascade.fall.direction;
  const cross = [-direction[1], direction[0]];
  const fallDelta = [point[0] - crestCenter[0], point[1] - crestCenter[1]];
  const fallAlong = fallDelta[0] * direction[0] + fallDelta[1] * direction[1];
  const fallAcross = fallDelta[0] * cross[0] + fallDelta[1] * cross[1];
  const insideCrest = distanceToSegment(
    point,
    cascade.crest.start,
    cascade.crest.end,
  ) <= cascade.crest.thicknessPixels * 1.2 + tolerance;
  const insideFall = (
    fallAlong >= -2 - tolerance
    && fallAlong <= cascade.fall.extentPixels + 2 + tolerance
    && Math.abs(fallAcross) <= cascade.fall.widthPixels * 0.55 + tolerance
  );
  const impactDelta = [
    point[0] - cascade.impact.center[0],
    point[1] - cascade.impact.center[1],
  ];
  const impactAlong = impactDelta[0] * direction[0] + impactDelta[1] * direction[1];
  const impactAcross = impactDelta[0] * cross[0] + impactDelta[1] * cross[1];
  const insideImpact = Math.hypot(
    impactAlong / (cascade.impact.radiiPixels[0] + tolerance),
    impactAcross / (cascade.impact.radiiPixels[1] + tolerance),
  ) <= 1.05;
  return insideCrest || insideFall || insideImpact;
}

function pointWithinCascadeMistEnvelope(point, cascade, tolerance = 0) {
  const mistCenter = cascade.impact.center.map((value, index) => (
    value + cascade.mist.driftVector[index] * cascade.mist.radiusPixels * 0.16
  ));
  return Math.hypot(
    point[0] - mistCenter[0],
    point[1] - mistCenter[1],
  ) <= cascade.mist.radiusPixels + tolerance;
}

function nativeWaterAuthorityEvidence(red, green, blue, alpha) {
  if (alpha < 24) return 0;
  const coolDark = Math.min(
    smoothstep(2, 22, blue - red),
    smoothstep(-1, 15, green - red),
    smoothstep(26, 82, blue),
  );
  const coolBright = Math.min(
    smoothstep(-2, 14, blue - red),
    smoothstep(-5, 12, green - red),
    smoothstep(78, 170, blue),
  );
  return clamp(Math.max(coolDark, coolBright) * smoothstep(24, 170, alpha));
}

function nativeTransparentChannelEvidence(alpha) {
  return 1 - smoothstep(12, 96, alpha);
}

function nativeFoamEvidence(red, green, blue, alpha) {
  if (alpha < 24) return 0;
  const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
  const coolNeutral = Math.min(
    smoothstep(-10, 8, blue - red),
    smoothstep(-14, 4, green - red),
  );
  return clamp(smoothstep(105, 210, luminance) * coolNeutral);
}

function connectedNativeEvidenceMask(source, width, height) {
  const pixelCount = width * height;
  const connected = new Uint8Array(pixelCount);
  const foamCandidate = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  let queueHead = 0;
  let queueLength = 0;
  let isolatedFoamCandidates = 0;
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const offset = pixel * 4;
    const rgba = source.subarray(offset, offset + 4);
    const water = nativeWaterAuthorityEvidence(...rgba);
    const foam = nativeFoamEvidence(...rgba);
    if (water >= 0.035) {
      connected[pixel] = 1;
      queue[queueLength] = pixel;
      queueLength += 1;
    } else if (foam >= 0.035) {
      foamCandidate[pixel] = 1;
      isolatedFoamCandidates += 1;
    }
  }
  while (queueHead < queueLength) {
    const pixel = queue[queueHead];
    queueHead += 1;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    for (let deltaY = -1; deltaY <= 1; deltaY += 1) {
      const neighborY = y + deltaY;
      if (neighborY < 0 || neighborY >= height) continue;
      for (let deltaX = -1; deltaX <= 1; deltaX += 1) {
        if (deltaX === 0 && deltaY === 0) continue;
        const neighborX = x + deltaX;
        if (neighborX < 0 || neighborX >= width) continue;
        const neighbor = neighborY * width + neighborX;
        if (foamCandidate[neighbor] === 0) continue;
        foamCandidate[neighbor] = 0;
        connected[neighbor] = 1;
        isolatedFoamCandidates -= 1;
        queue[queueLength] = neighbor;
        queueLength += 1;
      }
    }
  }
  return Object.freeze({ connected, isolatedFoamCandidates });
}

function hydraulicPixelCounts(field, auxiliary) {
  let water = 0;
  let directional = 0;
  let deep = 0;
  let whitewater = 0;
  let wake = 0;
  let mist = 0;
  let cascade = 0;
  for (let offset = 0; offset < field.length; offset += 4) {
    if (field[offset] === 0) continue;
    water += 1;
    if (field[offset + 3] >= 128) deep += 1;
    const flowX = (field[offset + 1] - 128) / 127;
    const flowY = (field[offset + 2] - 128) / 127;
    if (Math.hypot(flowX, flowY) > 0.1) directional += 1;
    if (auxiliary[offset] >= 32) whitewater += 1;
    if (auxiliary[offset + 1] > 0) wake += 1;
    if (auxiliary[offset + 2] > 0) mist += 1;
    if (auxiliary[offset + 3] > 0) cascade += 1;
  }
  return { cascade, deep, directional, mist, wake, water, whitewater };
}

function labelCoverageComponents(field, width, height) {
  const labels = new Int32Array(width * height);
  const queue = new Int32Array(width * height);
  const sizes = [0];
  let nextLabel = 0;
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    if (field[pixel * 4] === 0 || labels[pixel] !== 0) continue;
    const label = nextLabel + 1;
    nextLabel = label;
    labels[pixel] = label;
    let queueHead = 0;
    let queueLength = 1;
    let size = 0;
    queue[0] = pixel;
    while (queueHead < queueLength) {
      const current = queue[queueHead];
      queueHead += 1;
      size += 1;
      const x = current % width;
      const y = Math.floor(current / width);
      for (let deltaY = -1; deltaY <= 1; deltaY += 1) {
        const neighborY = y + deltaY;
        if (neighborY < 0 || neighborY >= height) continue;
        for (let deltaX = -1; deltaX <= 1; deltaX += 1) {
          if (deltaX === 0 && deltaY === 0) continue;
          const neighborX = x + deltaX;
          if (neighborX < 0 || neighborX >= width) continue;
          const neighbor = neighborY * width + neighborX;
          if (labels[neighbor] !== 0 || field[neighbor * 4] === 0) continue;
          labels[neighbor] = label;
          queue[queueLength] = neighbor;
          queueLength += 1;
        }
      }
    }
    sizes[label] = size;
  }
  return Object.freeze({ labels, sizes: Object.freeze(sizes) });
}

function nearestCoverageRegistration(
  decodedResource,
  components,
  artboardPoint,
  scale,
  maximumDistanceArtboard = 3,
) {
  const [left, top] = decodedResource.resource.sourceBounds;
  const targetX = artboardPoint[0] * scale - left;
  const targetY = artboardPoint[1] * scale - top;
  const radius = maximumDistanceArtboard * scale;
  let nearest = null;
  for (
    let y = Math.max(0, Math.floor(targetY - radius));
    y <= Math.min(decodedResource.info.height - 1, Math.ceil(targetY + radius));
    y += 1
  ) {
    for (
      let x = Math.max(0, Math.floor(targetX - radius));
      x <= Math.min(decodedResource.info.width - 1, Math.ceil(targetX + radius));
      x += 1
    ) {
      const pixel = y * decodedResource.info.width + x;
      if (decodedResource.data[pixel * 4] === 0) continue;
      const distanceArtboard = Math.hypot(
        x + 0.5 - targetX,
        y + 0.5 - targetY,
      ) / scale;
      if (
        distanceArtboard <= maximumDistanceArtboard
        && (!nearest || distanceArtboard < nearest.distanceArtboard)
      ) {
        const label = components.labels[pixel];
        nearest = Object.freeze({
          componentSize: components.sizes[label],
          distanceArtboard,
          label,
        });
      }
    }
  }
  return nearest;
}

function lineCoverageRatio(decodedResource, start, end, radiusArtboard, scale) {
  const [left, top] = decodedResource.resource.sourceBounds;
  const deltaX = end[0] - start[0];
  const deltaY = end[1] - start[1];
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;
  let covered = 0;
  let sampled = 0;
  const startFieldX = Math.floor((Math.min(start[0], end[0]) - radiusArtboard) * scale);
  const endFieldX = Math.ceil((Math.max(start[0], end[0]) + radiusArtboard) * scale);
  const startFieldY = Math.floor((Math.min(start[1], end[1]) - radiusArtboard) * scale);
  const endFieldY = Math.ceil((Math.max(start[1], end[1]) + radiusArtboard) * scale);
  for (let fieldY = startFieldY; fieldY < endFieldY; fieldY += 1) {
    for (let fieldX = startFieldX; fieldX < endFieldX; fieldX += 1) {
      const x = (fieldX + 0.5) / scale;
      const y = (fieldY + 0.5) / scale;
      const amount = lengthSquared <= 1e-9
        ? 0
        : clamp(
          ((x - start[0]) * deltaX + (y - start[1]) * deltaY) / lengthSquared,
        );
      const distance = Math.hypot(
        x - (start[0] + deltaX * amount),
        y - (start[1] + deltaY * amount),
      );
      if (distance > radiusArtboard) continue;
      sampled += 1;
      const localX = fieldX - left;
      const localY = fieldY - top;
      if (
        localX >= 0
        && localY >= 0
        && localX < decodedResource.info.width
        && localY < decodedResource.info.height
        && decodedResource.data[(localY * decodedResource.info.width + localX) * 4] > 0
      ) covered += 1;
    }
  }
  return sampled === 0 ? 0 : covered / sampled;
}

function impactCoverageRatio(decodedResource, cascade, scale) {
  const [left, top] = decodedResource.resource.sourceBounds;
  const [centerX, centerY] = cascade.impact.center;
  const [alongRadius, acrossRadius] = cascade.impact.radiiPixels;
  const direction = cascade.fall.direction;
  const cross = [-direction[1], direction[0]];
  const envelopeRadius = Math.max(alongRadius, acrossRadius);
  let covered = 0;
  let sampled = 0;
  for (
    let fieldY = Math.floor((centerY - envelopeRadius) * scale);
    fieldY < Math.ceil((centerY + envelopeRadius) * scale);
    fieldY += 1
  ) {
    for (
      let fieldX = Math.floor((centerX - envelopeRadius) * scale);
      fieldX < Math.ceil((centerX + envelopeRadius) * scale);
      fieldX += 1
    ) {
      const delta = [
        (fieldX + 0.5) / scale - centerX,
        (fieldY + 0.5) / scale - centerY,
      ];
      const normalizedDistance = Math.hypot(
        (delta[0] * direction[0] + delta[1] * direction[1]) / alongRadius,
        (delta[0] * cross[0] + delta[1] * cross[1]) / acrossRadius,
      );
      if (normalizedDistance > 1) continue;
      sampled += 1;
      const localX = fieldX - left;
      const localY = fieldY - top;
      if (
        localX >= 0
        && localY >= 0
        && localX < decodedResource.info.width
        && localY < decodedResource.info.height
        && decodedResource.data[(localY * decodedResource.info.width + localX) * 4] > 0
      ) covered += 1;
    }
  }
  return sampled === 0 ? 0 : covered / sampled;
}

function countChannelInArtboardDisc(
  field,
  width,
  height,
  center,
  radius,
  scale,
  channel = 0,
  minimum = 1,
) {
  let covered = 0;
  for (
    let fieldY = Math.max(0, Math.floor((center[1] - radius) * scale));
    fieldY < Math.min(height, Math.ceil((center[1] + radius) * scale));
    fieldY += 1
  ) {
    for (
      let fieldX = Math.max(0, Math.floor((center[0] - radius) * scale));
      fieldX < Math.min(width, Math.ceil((center[0] + radius) * scale));
      fieldX += 1
    ) {
      if (
        Math.hypot((fieldX + 0.5) / scale - center[0], (fieldY + 0.5) / scale - center[1])
          <= radius
        && field[(fieldY * width + fieldX) * 4 + channel] >= minimum
      ) covered += 1;
    }
  }
  return covered;
}

function sampleVirtualRegion(region, fullTexelCoordinate) {
  const [left, top] = region.sourceBounds;
  const [width, height] = region.dimensions;
  const localX = fullTexelCoordinate[0] - left;
  const localY = fullTexelCoordinate[1] - top;
  const lowerX = Math.floor(localX);
  const lowerY = Math.floor(localY);
  const blendX = localX - lowerX;
  const blendY = localY - lowerY;
  const fetch = (x, y, channel) => (
    x < 0 || y < 0 || x >= width || y >= height
      ? 0
      : region.data[(y * width + x) * 4 + channel]
  );
  return [0, 1, 2, 3].map((channel) => {
    const topValue = fetch(lowerX, lowerY, channel) * (1 - blendX)
      + fetch(lowerX + 1, lowerY, channel) * blendX;
    const bottomValue = fetch(lowerX, lowerY + 1, channel) * (1 - blendX)
      + fetch(lowerX + 1, lowerY + 1, channel) * blendX;
    return topValue * (1 - blendY) + bottomValue * blendY;
  });
}

function nativeResource(id, decodedBytes, phase = "mounted") {
  return Object.freeze({
    decodedBytes,
    id,
    nodeCount: 1,
    path: `/native/${id}.png`,
    phase,
    sha256: createHash("sha256").update(id).digest("hex").toUpperCase(),
  });
}

test("regional NinjaOne hydrology is registered to the accepted terrain master", async () => {
  const [manifest, seamManifestBytes, builderSource] = await Promise.all([
    readManifest(),
    readFile(seamIntegrationManifestPath),
    readFile(path.join(root, "scripts/build-ninjaone-environment-hydrology-r2.mjs"), "utf8"),
  ]);
  const seamManifest = JSON.parse(seamManifestBytes);
  assert.equal(manifest.schemaVersion, 4);
  assert.equal(manifest.id, "career-world/capitals/ninjaone/hydrology-native@r2");
  assert.equal(manifest.packingRevision, "regional-r4-field-driven");
  assert.equal(manifest.source.authority, "registered-terrain-master");
  assert.equal(
    manifest.source.depthPolicy,
    "offline bank distance inside exact registered coverage; terrain gaps or slope changes never imply waterfalls",
  );
  assert.equal(
    manifest.source.waterfallPolicy,
    "only explicit source-proven cascade descriptors may emit falling-water or impact VFX",
  );
  assert.deepEqual(
    manifest.source.intentReferences.map(({ dimensions, path, role }) => ({
      dimensions,
      path,
      role,
    })),
    [
      {
        dimensions: [1448, 1086],
        path: "/art-source/career-world/ninjaone-environment/production-r2/water-base-r1/neutral-water-reference-r1.png",
        role: "full-concept authority for watercourse direction and feature classification",
      },
      {
        dimensions: [2880, 2160],
        path: "/art-source/career-world/ninjaone-environment/production-r2/water-base-r1/declared-inland-water-corridor-r1.png",
        role: "declared inland-water topology corridor; not a waterfall-placement inference map",
      },
      {
        dimensions: [2880, 2160],
        path: "/art-source/career-world/ninjaone-environment/production-r2/water-base-r1/registered-inland-water-mask-r1.png",
        role: "registered inland-water body evidence inside the declared topology corridor",
      },
      {
        dimensions: [2880, 2160],
        path: "/art-source/career-world/ninjaone-environment/production-r2/water-base-r1/registered-water-effects-source-mask-r1.png",
        role: "source-registered rapid and foam placement; never body topology",
      },
    ],
  );
  assert.ok(manifest.source.intentReferences.every(({ sha256 }) => (
    /^[A-F0-9]{64}$/.test(sha256)
  )));
  assert.deepEqual(
    {
      dimensions: manifest.source.effectsEvidence.dimensions,
      path: manifest.source.effectsEvidence.path,
      role: manifest.source.effectsEvidence.role,
    },
    {
      dimensions: [2880, 2160],
      path: "/art-source/career-world/ninjaone-environment/production-r2/water-base-r1/registered-water-effects-source-mask-r1.png",
      role: "source-registered rapid and foam placement; never body topology",
    },
  );
  assert.match(manifest.source.effectsEvidence.sha256, /^[A-F0-9]{64}$/);
  assert.match(manifest.source.role, /accepted rendered topology/);
  assert.deepEqual(manifest.source.dimensions, [5760, 4320]);
  assert.match(manifest.source.path, /ninjaone-environment-terrain-master-detail-r2\.png$/);
  assert.doesNotMatch(manifest.source.path, /native-detail|runtime-close|quilt/i);
  assert.equal(
    sha256(await readFile(path.join(root, manifest.source.path.slice(1)))),
    manifest.source.sha256,
  );

  assert.deepEqual(manifest.registration.gridCells, ["B2", "C1", "C2"]);
  assert.deepEqual(manifest.registration.artboardDimensions, [1440, 1080]);
  assert.deepEqual(manifest.registration.maximumCloseCameraSpan, [0.075, 0.075]);
  assert.equal(manifest.registration.maximumMountedRegions, 2);
  assert.deepEqual(manifest.registration.worldOrigin, [0.125, 0]);
  assert.deepEqual(manifest.registration.worldSpan, [0.25, 1 / 3]);
  assert.equal(manifest.cascades.length, 1);
  assert.equal(new Set(manifest.cascades.map(({ id }) => id)).size, 1);
  assert.deepEqual(
    manifest.cascades
      .filter(({ regionId }) => regionId === "B2")
      .map(({ id }) => id),
    [],
  );
  assert.ok(manifest.cascades.every(({ id }) => !id.startsWith("b2-r3c1-")));
  assert.ok(manifest.segments.every(({ id }) => !id.startsWith("b2-r3c1-")));
  assert.doesNotMatch(builderSource, /b2-r3c1-(?:cascade|main-drop|downstream)/);
  assert.ok(manifest.cascades.every(({ regionId }) => regionId !== "C1"));
  assert.ok(manifest.segments.every(({ id }) => ![
    "c1-r1c2-waterfall-lip",
    "c1-r1c2-vertical-fall",
    "c1-r1c2-base-foam",
  ].includes(id)));
  assert.doesNotMatch(
    builderSource,
    /c1-r1c2-(?:main-drop|waterfall-lip|vertical-fall|base-foam)/,
  );
  const c2Cascade = manifest.cascades.find(({ regionId }) => regionId === "C2");
  assert.equal(c2Cascade?.id, "c2-gorge-main-drop");
  assert.deepEqual(c2Cascade?.impact.center, [771, 850]);
  assert.equal(c2Cascade?.fall.widthPixels, 11);
  assert.ok(manifest.segments.every(({ id }) => !(
    /^c2-r2c2-(?:waterfall-lip|vertical-fall|base-foam|lower-channel)$/.test(id)
      || /^c2-r3c2-(?:channel|turbulence)$/.test(id)
      || id === "c2-r3c3-channel"
  )));
  assert.doesNotMatch(
    builderSource,
    /c2-r2c2-(?:waterfall-lip|vertical-fall|base-foam|lower-channel)|c2-r3c2-(?:channel|turbulence)|c2-r3c3-channel/,
  );
  const b2OutletSegments = manifest.segments.filter(({ id }) => (
    id.startsWith("b2-tarn-outlet-")
  ));
  assert.deepEqual(b2OutletSegments.map(({ id }) => id), ["b2-tarn-outlet-run"]);
  assert.equal(b2OutletSegments[0].kind, "stream");
  assert.ok(b2OutletSegments[0].shape.points.length >= 10);
  assert.match(builderSource, /smoothstep\(7, 20, cascade\.fall\.extentPixels\)/);
  assert.match(builderSource, /smoothstep\(0\.88, 1, fallEnergy\)/);
  for (const cascade of manifest.cascades) {
    const crestMidpoint = cascade.crest.start.map((value, index) => (
      (value + cascade.crest.end[index]) * 0.5
    ));
    const downstreamOffset = cascade.impact.center.map((value, index) => (
      value - crestMidpoint[index]
    ));
    assert.ok(
      downstreamOffset[0] * cascade.fall.direction[0]
        + downstreamOffset[1] * cascade.fall.direction[1] > 0,
      `${cascade.id} impact must be downstream of its crest`,
    );
    assert.ok(Math.abs(Math.hypot(...cascade.fall.direction) - 1) < 0.01);
    assert.ok(Math.abs(Math.hypot(...cascade.mist.driftVector) - 1) < 0.01);
    assert.ok(cascade.crest.thicknessPixels > 0);
    assert.ok(cascade.approach.extentPixels > 0);
    assert.ok(cascade.approach.widthPixels > 0);
    assert.ok(cascade.fall.extentPixels > 0);
    assert.ok(cascade.fall.widthPixels > 0);
    assert.ok(cascade.impact.radiiPixels.every((value) => value > 0));
    assert.ok(cascade.mist.radiusPixels > 0);
    assert.ok(cascade.pool.radiiPixels.every((value) => value > 0));
    assert.ok(cascade.pool.outflowExtentPixels > 0);
    assert.match(cascade.maskPolicy, /registered water remains exact/);
    assert.match(cascade.maskPolicy, /descriptor-bounded/);
  }
  const b2CascadeImpactRows = manifest.cascades
    .filter(({ regionId }) => regionId === "B2")
    .map(({ impact }) => impact.center[1]);
  assert.deepEqual(b2CascadeImpactRows, [...b2CascadeImpactRows].sort((a, b) => a - b));
  assert.match(builderSource, /export const HYDROLOGY_CASCADES = Object\.freeze\(\[/);
  assert.match(builderSource, /cascades: HYDROLOGY_CASCADES/);
  assert.equal(manifest.obstacles.length, 2);
  assert.ok(manifest.obstacles.every(({ regionId }) => regionId === "B2"));
  assert.ok(manifest.obstacles.every(({ maskPolicy }) => (
    maskPolicy.includes("accepted registered water coverage")
  )));
  assert.match(builderSource, /obstacles: HYDROLOGY_OBSTACLES/);
  assert.match(manifest.regionalFields.channelEncoding.layout, /side-by-side/);
  assert.match(manifest.regionalFields.channelEncoding.primary.r, /exact registered water coverage/);
  assert.match(manifest.regionalFields.channelEncoding.primary.g, /velocity x with local magnitude/);
  assert.match(manifest.regionalFields.channelEncoding.primary.a, /bank-distance transform/);
  assert.match(manifest.regionalFields.channelEncoding.auxiliary.r, /whitewater potential/);
  assert.match(manifest.regionalFields.channelEncoding.auxiliary.g, /obstacle bow/);
  assert.match(manifest.regionalFields.channelEncoding.auxiliary.b, /mist potential/);
  assert.match(manifest.regionalFields.channelEncoding.auxiliary.a, /cascade stage support/);
  assert.match(manifest.regionalFields.channelEncoding.auxiliary.r, /descriptor-bounded/);
  assert.match(manifest.regionalFields.channelEncoding.auxiliary.b, /descriptor-bounded/);
  assert.match(manifest.regionalFields.channelEncoding.auxiliary.a, /descriptor-bounded/);
  assert.match(manifest.masks.auxiliaryVfx, /may extend beyond primary coverage only inside authored/);
  assert.match(manifest.masks.water, /auxiliary support never expands body coverage/);
  assert.deepEqual(manifest.regionalFields.cohortPolicy, {
    atomic: true,
    maximumMountedRegions: 2,
    mixedTierAllowed: false,
    sampling: "global-coordinate manual bilinear texelFetch with virtual-zero exterior",
    tierOrder: ["detail", "fallback"],
  });
  assert.deepEqual(
    manifest.regionalFields.possibleCohorts.map(({ regionIds }) => regionIds),
    [[], ["B2"], ["C1"], ["C2"], ["B2", "C1"], ["B2", "C2"], ["C1", "C2"]],
  );

  for (const tierId of ["detail", "fallback"]) {
    const tier = manifest.regionalFields.tiers[tierId];
    assert.equal(tier.resources.length, 3);
    assert.deepEqual(tier.resources.map(({ regionId }) => regionId), ["B2", "C1", "C2"]);
    assert.equal(
      tier.decodedBytes,
      tier.resources.reduce((sum, resource) => sum + resource.decodedBytes, 0),
    );
    for (const resource of tier.resources) {
      const [left, top, right, bottom] = resource.sourceBounds;
      assert.deepEqual(resource.fieldDimensions, [right - left, bottom - top]);
      assert.deepEqual(resource.dimensions, [
        resource.fieldDimensions[0] * 2,
        resource.fieldDimensions[1],
      ]);
      assert.equal(resource.decodedBytes, resource.dimensions[0] * resource.dimensions[1] * 4);
      assert.match(resource.sha256, /^[A-F0-9]{64}$/);
      assert.match(resource.metrics.rawPrimaryRgbaSha256, /^[A-F0-9]{64}$/);
      assert.match(resource.metrics.rawAuxiliaryRgbaSha256, /^[A-F0-9]{64}$/);
      assert.equal(resource.id, `ninjaone-hydrology-${resource.regionId.toLowerCase()}-${tierId}-r4`);
      assert.match(resource.path, new RegExp(
        `/career-world/layers/water-surface/fields/${resource.id}\\.png\\?v=`
          + resource.sha256.slice(0, 12).toLowerCase(),
      ));
      assert.equal(sha256(await readFile(publicAssetPath(resource.path))), resource.sha256);
    }
    assert.equal(
      tier.maximumSteadyCohortDecodedBytes,
      Math.max(...manifest.regionalFields.possibleCohorts.map(({ decodedBytes }) => (
        decodedBytes[tierId]
      ))),
    );
    assert.ok(tier.occupiedPixels <= manifest.metrics.waterPixels);
    assert.ok(
      tier.occupiedPixels * (2 / tier.scale) ** 2 / manifest.metrics.waterPixels >= 0.99,
      `${tierId} packing may omit only the impossible triple-overlap fringe`,
    );
  }
  assert.deepEqual(manifest.admission.sharedWaterTexturePool, {
    hydrologyDecodedBytes: 0,
    maximumDecodedBytes: 301_989_888,
    ownership: "excludes-native-hydrology",
    steadyDecodedBytes: 250_700_205,
    transientPeakDecodedBytes: 259_091_416,
  });
  assert.equal(manifest.admission.nativeApplicationOwnedUnion.maximumDecodedBytes, 33_554_432);
  assert.deepEqual(
    manifest.hydrologyTransitionHandoffs,
    seamManifest.hydrologyTransitionHandoffs,
  );
  assert.equal(manifest.hydrologyTransitionHandoffs.length, 3);
  for (const handoff of manifest.hydrologyTransitionHandoffs) {
    assert.equal(handoff.status, "requires-bounded-transition-field");
    assert.equal(handoff.topologyTreatment, "no synthetic water geometry in the seam asset");
    assert.ok(
      handoff.seamResourceId === "b2-c2-intercell-vertical-seam"
        || seamManifest.resources.some(({ id }) => id === handoff.seamResourceId),
      `${handoff.id} must resolve to its bounded regional field or a registered seam resource`,
    );
  }
  assert.deepEqual(
    [...new Set(manifest.segments.flatMap(({ cellIds }) => cellIds))].sort(),
    ["B2", "C1", "C2"],
  );
  for (const kind of ["tarn", "waterfall-lip", "waterfall", "impact", "coast"]) {
    assert.ok(manifest.segments.some((segment) => segment.kind === kind));
  }
  assert.ok(manifest.segments.every(({ id }) => manifest.metrics.segmentPixels[id] > 0));
  assert.ok(manifest.segments.every(({ maskPolicy }) => maskPolicy.includes("registered-master")));
});

test("regional fields reconstruct exact water masks and descriptor-bounded waterfall VFX", async () => {
  const manifest = await readManifest();
  const [detail, fallback] = await Promise.all([
    readRegionalTier(manifest, "detail"),
    readRegionalTier(manifest, "fallback"),
  ]);
  assert.deepEqual(
    [detail.info.width, detail.info.height, detail.info.channels],
    [2880, 2160, 4],
  );
  assert.deepEqual(
    [fallback.info.width, fallback.info.height, fallback.info.channels],
    [1440, 1080, 4],
  );
  const measured = hydraulicPixelCounts(detail.data, detail.auxiliary);
  assert.equal(measured.water, manifest.regionalFields.tiers.detail.occupiedPixels);
  assert.ok(
    measured.water / manifest.metrics.waterPixels >= 0.99,
    "the bounded two-region packing may omit only the impossible triple-overlap fringe",
  );
  const packedDirectionalPixels = detail.resources.reduce((sum, entry) => (
    sum + entry.resource.metrics.directionalPixels
  ), 0);
  assert.equal(measured.directional, packedDirectionalPixels);
  assert.equal(
    detail.resources.reduce((sum, entry) => (
      sum + entry.resource.metrics.coveragePixels
    ), 0),
    measured.water,
  );
  const registeredTerrainMaster = await readRegisteredTerrainMaster(
    manifest,
    detail.info.width,
    detail.info.height,
  );
  const [declaredCorridor, registeredInlandWater] = await Promise.all([
    readGreyscaleIntentReference(
      manifest,
      "declared-inland-water-corridor-r1.png",
      detail.info.width,
      detail.info.height,
    ),
    readGreyscaleIntentReference(
      manifest,
      "registered-inland-water-mask-r1.png",
      detail.info.width,
      detail.info.height,
    ),
  ]);
  const {
    connected: connectedNativeEvidence,
    isolatedFoamCandidates,
  } = connectedNativeEvidenceMask(
    registeredTerrainMaster,
    detail.info.width,
    detail.info.height,
  );
  assert.ok(
    isolatedFoamCandidates > 0,
    "the source fixture must contain isolated bright neutral pixels that hydrology rejects",
  );
  const directionalVectors = new Set();
  const velocityMagnitudes = new Set();
  let admittedConnectedFoamPixels = 0;
  let dryMistPixels = 0;
  let dryWaterfallVfxPixels = 0;
  const dryWaterfallLevels = new Set();
  const detailFieldScale = manifest.regionalFields.tiers.detail.scale;
  const envelopeTolerance = 1 / detailFieldScale;
  for (let offset = 0; offset < detail.data.length; offset += 4) {
    if (detail.data[offset] === 0) {
      assert.deepEqual(
        [...detail.data.subarray(offset, offset + 4)],
        [0, 0, 0, 0],
        "primary geometry must remain completely empty off registered water",
      );
      const auxiliary = detail.auxiliary.subarray(offset, offset + 4);
      assert.equal(auxiliary[1], 0, "obstacle wakes must remain clipped to registered water");
      if (auxiliary[0] > 0 || auxiliary[3] > 0) {
        const pixel = offset / 4;
        const point = [
          (pixel % detail.info.width + 0.5) / detailFieldScale,
          (Math.floor(pixel / detail.info.width) + 0.5) / detailFieldScale,
        ];
        assert.ok(
          manifest.cascades.some((cascade) => (
            pointWithinCascadeVfxEnvelope(point, cascade, envelopeTolerance)
          )),
          `dry waterfall VFX escaped every descriptor envelope at ${point.join(",")}`,
        );
        dryWaterfallVfxPixels += 1;
        if (auxiliary[0] > 0) dryWaterfallLevels.add(auxiliary[0]);
      }
      if (auxiliary[2] > 0) {
        const pixel = offset / 4;
        const point = [
          (pixel % detail.info.width + 0.5) / detailFieldScale,
          (Math.floor(pixel / detail.info.width) + 0.5) / detailFieldScale,
        ];
        assert.ok(
          manifest.cascades.some((cascade) => (
            pointWithinCascadeMistEnvelope(point, cascade, envelopeTolerance)
          )),
          `dry mist escaped every descriptor envelope at ${point.join(",")}`,
        );
        dryMistPixels += 1;
      }
      continue;
    }
    assert.equal(detail.data[offset], 255);
    assert.ok(detail.data[offset + 3] > 0, "occupied water needs offline visual depth");
    const sourceRgba = registeredTerrainMaster.subarray(offset, offset + 4);
    const waterAuthority = nativeWaterAuthorityEvidence(...sourceRgba);
    const transparentChannel = nativeTransparentChannelEvidence(sourceRgba[3]);
    const foamEvidence = nativeFoamEvidence(...sourceRgba);
    const registeredBodyEvidence = registeredInlandWater[offset / 4] >= 9;
    assert.ok(
      transparentChannel >= 0.035
        || connectedNativeEvidence[offset / 4] === 1
        || registeredBodyEvidence,
      "primary coverage requires transparent terrain, connected native water/foam, or registered body evidence",
    );
    if (
      registeredBodyEvidence
      && transparentChannel < 0.035
      && connectedNativeEvidence[offset / 4] !== 1
    ) {
      assert.ok(
        declaredCorridor[offset / 4] >= 9,
        "registered body completion must stay inside the declared inland-water corridor",
      );
    }
    if (waterAuthority < 0.035 && transparentChannel < 0.035) {
      assert.ok(
        registeredBodyEvidence || foamEvidence >= 0.035,
        "non-terrain primary coverage must be registered water or connected whitewater, never neutral rock",
      );
      if (!registeredBodyEvidence) admittedConnectedFoamPixels += 1;
    }
    const flowX = (detail.data[offset + 1] - 128) / 127;
    const flowY = (detail.data[offset + 2] - 128) / 127;
    const magnitude = Math.hypot(flowX, flowY);
    if (magnitude > 0.1) {
      directionalVectors.add(`${detail.data[offset + 1]}:${detail.data[offset + 2]}`);
      velocityMagnitudes.add(Math.round(magnitude * 100));
    }
  }
  assert.ok(directionalVectors.size > 40);
  assert.ok(admittedConnectedFoamPixels > 0, "real connected whitewater must remain hole-free");
  assert.ok(dryWaterfallVfxPixels > 0, "falling sheets must retain deterministic dry-cliff detail");
  assert.ok(
    dryWaterfallLevels.size >= 96,
    "dry-cliff waterfall detail must retain authored breakup rather than a flat alpha stamp",
  );
  assert.ok(dryMistPixels > 0, "major impacts must retain descriptor-bounded mist over land");
  assert.ok(velocityMagnitudes.size >= 5, "velocity field must preserve meaningful local magnitude");
  assert.ok(measured.deep > 5_000, "bank-distance field needs a deep interior population");
  assert.ok(measured.whitewater > 1_000);
  assert.ok(measured.whitewater < measured.water * 0.7, "whitewater support must remain localized");
  assert.ok(measured.wake > 0 && measured.wake < measured.water * 0.08);
  assert.ok(measured.mist > 0 && measured.mist < measured.water * 0.15);
  assert.ok(measured.cascade > 0 && measured.cascade < measured.water * 0.35);
  let maximumAdjacentFlowTurn = 0;
  let connectedDirectionalEdges = 0;
  for (let y = 0; y < detail.info.height; y += 1) {
    for (let x = 0; x < detail.info.width; x += 1) {
      const offset = (y * detail.info.width + x) * 4;
      if (detail.data[offset] === 0) continue;
      for (const [dx, dy] of [[1, 0], [0, 1]]) {
        const neighborX = x + dx;
        const neighborY = y + dy;
        if (neighborX >= detail.info.width || neighborY >= detail.info.height) continue;
        const neighborOffset = (neighborY * detail.info.width + neighborX) * 4;
        if (detail.data[neighborOffset] === 0) continue;
        const flow = [
          (detail.data[offset + 1] - 128) / 127,
          (detail.data[offset + 2] - 128) / 127,
        ];
        const neighborFlow = [
          (detail.data[neighborOffset + 1] - 128) / 127,
          (detail.data[neighborOffset + 2] - 128) / 127,
        ];
        const flowLength = Math.hypot(...flow);
        const neighborLength = Math.hypot(...neighborFlow);
        if (flowLength <= 0.1 || neighborLength <= 0.1) continue;
        connectedDirectionalEdges += 1;
        maximumAdjacentFlowTurn = Math.max(
          maximumAdjacentFlowTurn,
          Math.acos(clamp(
            (flow[0] * neighborFlow[0] + flow[1] * neighborFlow[1])
              / (flowLength * neighborLength),
            -1,
            1,
          )),
        );
      }
    }
  }
  assert.ok(
    connectedDirectionalEdges > packedDirectionalPixels,
    `${connectedDirectionalEdges} edges must connect ${packedDirectionalPixels} directional pixels`,
  );
  assert.ok(
    maximumAdjacentFlowTurn < 1.05,
    `adjacent local-flow turn ${maximumAdjacentFlowTurn} would tear phase continuity`,
  );
  for (const segment of manifest.segments.filter(({ shape }) => shape.type === "path")) {
    for (let index = 1; index < segment.shape.points.length; index += 1) {
      assert.ok(
        segment.shape.points[index][1] >= segment.shape.points[index - 1][1],
        `${segment.id} reverses against high-to-low artboard flow`,
      );
    }
  }

  let fallbackWaterPixels = 0;
  for (let y = 0; y < fallback.info.height; y += 1) {
    for (let x = 0; x < fallback.info.width; x += 1) {
      const fallbackOffset = (y * fallback.info.width + x) * 4;
      const detailOffset = ((y * 2 + 1) * detail.info.width + x * 2 + 1) * 4;
      assert.deepEqual(
        [...fallback.data.subarray(fallbackOffset, fallbackOffset + 4)],
        [...detail.data.subarray(detailOffset, detailOffset + 4)],
        `fallback texel ${x},${y} is not the deterministic nearest sample`,
      );
      assert.deepEqual(
        [...fallback.auxiliary.subarray(fallbackOffset, fallbackOffset + 4)],
        [...detail.auxiliary.subarray(detailOffset, detailOffset + 4)],
        `fallback auxiliary texel ${x},${y} is not the deterministic nearest sample`,
      );
      if (fallback.data[fallbackOffset] > 0) fallbackWaterPixels += 1;
    }
  }
  assert.equal(fallbackWaterPixels, manifest.regionalFields.tiers.fallback.occupiedPixels);

  const b2 = detail.resources.find(({ resource }) => resource.regionId === "B2");
  assert.ok(b2);
  const b2Measured = hydraulicPixelCounts(b2.data, b2.auxiliaryData);
  assert.ok(b2Measured.wake > 0, "B2 packed field must carry obstacle wakes");
  assert.equal(b2Measured.mist, 0, "B2 tarn is not a waterfall mist source");
  assert.equal(b2Measured.cascade, 0, "B2 tarn is not a staged cascade");
  assert.equal(
    manifest.cascades.filter(({ regionId }) => regionId === "B2").length,
    0,
    "B2 must not regain inferred waterfall descriptors",
  );
  const detailScale = manifest.regionalFields.tiers.detail.scale;
  assert.equal(
    countChannelInArtboardDisc(
      detail.data,
      detail.info.width,
      detail.info.height,
      [373, 906],
      16,
      detailScale,
    ),
    0,
    "the removed dry-rock B2 crest corridor must stay outside primary coverage",
  );
  assert.equal(
    countChannelInArtboardDisc(
      detail.data,
      detail.info.width,
      detail.info.height,
      [438, 953],
      28,
      detailScale,
    ),
    0,
    "the removed dry-rock B2 impact corridor must stay outside primary coverage",
  );

  const c2 = detail.resources.find(({ resource }) => resource.regionId === "C2");
  const c2Cascade = manifest.cascades.find(({ regionId }) => regionId === "C2");
  assert.ok(c2 && c2Cascade);
  const c2Components = labelCoverageComponents(
    c2.data,
    c2.info.width,
    c2.info.height,
  );
  const c2CrestMidpoint = c2Cascade.crest.start.map((value, index) => (
    (value + c2Cascade.crest.end[index]) * 0.5
  ));
  const c2CrestRegistration = nearestCoverageRegistration(
    c2,
    c2Components,
    c2CrestMidpoint,
    detailScale,
    4,
  );
  const c2ImpactRegistration = nearestCoverageRegistration(
    c2,
    c2Components,
    c2Cascade.impact.center,
    detailScale,
    4,
  );
  assert.ok(c2CrestRegistration, "C2 visible gorge crest misses primary water");
  assert.ok(c2ImpactRegistration, "C2 visible gorge impact misses primary water");
  assert.ok(
    c2CrestRegistration.componentSize >= 512,
    "C2 crest must register to material upstream water rather than isolated rock",
  );
  assert.ok(
    c2ImpactRegistration.componentSize >= 256,
    "C2 impact must register to a material plunge-pool component",
  );
  const c2CrestCoverage = lineCoverageRatio(
    c2,
    c2Cascade.crest.start,
    c2Cascade.crest.end,
    c2Cascade.crest.thicknessPixels * 1.2,
    detailScale,
  );
  assert.ok(
    c2CrestCoverage >= 0.05,
    `C2 authored crest coverage ${c2CrestCoverage} misses visible gorge water`,
  );
  const c2CenterlineCoverage = lineCoverageRatio(
    c2,
    c2CrestMidpoint,
    c2Cascade.impact.center,
    Math.min(2.5, c2Cascade.fall.widthPixels * 0.3),
    detailScale,
  );
  assert.ok(
    c2CenterlineCoverage >= 0.01,
    `C2 falling-sheet centerline coverage ${c2CenterlineCoverage} misses source whitewater`,
  );
  assert.ok(
    impactCoverageRatio(c2, c2Cascade, detailScale) >= 0.2,
    "C2 impact ellipse must register to its source plunge pool",
  );
  const c2RiverCheckpoints = [
    [752, 816],
    [771, 850],
    [820, 890],
    [850, 920],
    [900, 960],
    [950, 1005],
    [1000, 1030],
    [1020, 1060],
  ];
  for (const checkpoint of c2RiverCheckpoints) {
    assert.ok(
      countChannelInArtboardDisc(
        detail.data,
        detail.info.width,
        detail.info.height,
        checkpoint,
        6,
        detailScale,
      ) >= 16,
      `C2 downstream checkpoint ${checkpoint.join(",")} lacks material water coverage`,
    );
    assert.ok(
      nearestCoverageRegistration(
        c2,
        c2Components,
        checkpoint,
        detailScale,
        6,
      ),
      `C2 downstream checkpoint ${checkpoint.join(",")} is unregistered`,
    );
  }
  assert.equal(
    countChannelInArtboardDisc(
      detail.auxiliary,
      detail.info.width,
      detail.info.height,
      [733, 774],
      18,
      detailScale,
      3,
    ),
    0,
    "the removed C2 pool-side fake cascade must not retain stage support",
  );
  assert.ok(
    countChannelInArtboardDisc(
      detail.auxiliary,
      detail.info.width,
      detail.info.height,
      c2Cascade.impact.center,
      c2Cascade.mist.radiusPixels,
      detailScale,
      2,
      12,
    ) > 0,
    "the visible C2 gorge impact must retain localized mist potential",
  );
});

test("manual regional sampling has virtual-zero banks and tier-invariant phase coordinates", async () => {
  const manifest = await readManifest();
  const fallback = await readRegionalTier(manifest, "fallback");
  const b2 = fallback.resources.find(({ resource }) => resource.regionId === "B2");
  assert.ok(b2);
  const synthetic = Object.freeze({
    data: Buffer.from([255, 180, 190, 96]),
    dimensions: [1, 1],
    sourceBounds: [10, 20, 11, 21],
  });
  assert.deepEqual(sampleVirtualRegion(synthetic, [10, 20]), [255, 180, 190, 96]);
  assert.deepEqual(sampleVirtualRegion(synthetic, [11, 20]), [0, 0, 0, 0]);
  assert.deepEqual(
    sampleVirtualRegion(synthetic, [10.75, 20]).map(Math.round),
    [64, 45, 48, 24],
    "a crop edge must decay into transparent zero instead of clamping its last texel",
  );
  const [left, top, right, bottom] = b2.resource.sourceBounds;
  assert.deepEqual([right - left, bottom - top], b2.resource.fieldDimensions);
  const rightEdgeHasWater = Array.from({ length: b2.info.height }, (_, y) => (
    b2.data[(y * b2.info.width + b2.info.width - 1) * 4]
  )).some((coverage) => coverage > 0);
  assert.equal(rightEdgeHasWater, true, "fixture must exercise an occupied tight crop edge");

  const streamUv = [0.641, 0.777];
  const canonicalDetail = streamUv.map((value, index) => (
    value * manifest.registration.artboardDimensions[index]
  ));
  const canonicalFallback = streamUv.map((value, index) => (
    value * manifest.registration.artboardDimensions[index]
  ));
  assert.deepEqual(canonicalDetail, canonicalFallback);
  assert.match(
    WATER_SHADER_NINJAONE_STREAMS,
    /vec2 pixels = streamUv \* u_ninjaOneStreamArtboardDimensions;/,
  );
  assert.match(WATER_SHADER_NINJAONE_STREAMS, /texelFetch\(u_ninjaOneStreamFlow0/);
  assert.match(WATER_SHADER_NINJAONE_STREAMS, /texelFetch\(u_ninjaOneStreamFlow1/);
  assert.match(WATER_SHADER_NINJAONE_STREAMS, /return vec4\(0\.0\);/);
  assert.match(
    WATER_SHADER_NINJAONE_STREAMS,
    /ninjaOneBilinear0\(coordinate, false\)[\s\S]*ninjaOneBilinear1\(coordinate, false\)/,
  );
  assert.match(
    WATER_SHADER_NINJAONE_STREAMS,
    /coordinate \+ ivec2\(dimensions\.x, 0\)/,
    "the auxiliary half must be fetched from the packed logical-width offset",
  );
  assert.doesNotMatch(
    WATER_SHADER_NINJAONE_STREAMS,
    /texture\(u_ninjaOneStreamFlow[01]/,
    "cropped numeric fields must not use hardware CLAMP+LINEAR sampling",
  );
});

test("decoded local velocity preserves magnitude for advected transport", async () => {
  const manifest = await readManifest();
  const { data: field, info, resources } = await readRegionalTier(manifest, "detail");
  const c2Resource = resources.find(({ resource }) => resource.regionId === "C2")?.resource;
  assert.ok(c2Resource);
  const [left, top, right, bottom] = c2Resource.sourceBounds;
  const points = [];
  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      const offset = (y * info.width + x) * 4;
      if (field[offset] === 0) continue;
      const flowX = (field[offset + 1] - 128) / 127;
      const flowY = (field[offset + 2] - 128) / 127;
      const length = Math.hypot(flowX, flowY);
      if (length <= 0.1) continue;
      points.push({ flowX, flowY, length, x, y });
    }
  }
  assert.ok(points.length > 9_000);
  const magnitudes = points.map(({ length }) => length);
  assert.ok(Math.min(...magnitudes) < 0.35, "ordinary channel water must remain slower than falls");
  assert.ok(Math.max(...magnitudes) > 0.85, "fall water must retain a high velocity magnitude");
  assert.ok(new Set(magnitudes.map((value) => Math.round(value * 100))).size >= 5);
  assert.match(WATER_SHADER_NINJAONE_STREAMS, /float speed = length\(velocity\);/);
  assert.match(
    WATER_SHADER_NINJAONE_STREAMS,
    /mix\(0\.18, 1\.0, smoother\(0\.02, 0\.34, speed\)\)/,
    "transport must respond to velocity magnitude rather than normalize it away",
  );
  assert.match(WATER_SHADER_NINJAONE_STREAMS, /dot\(pixels, flowAxis\)/);
  assert.match(WATER_SHADER_NINJAONE_STREAMS, /ninjaOneAdvectedHeight\(/);
});

test("hydrology GLSL preserves the shared body and exposes registered effects only", async () => {
  const fragmentShader = await readFile(path.join(
    root,
    "features/career-world/layers/water-surface/rendering/shaders/fragment.ts",
  ), "utf8");
  assert.match(
    WATER_SHADER_NINJAONE_STREAMS,
    /struct NinjaOneStreamSample \{\s*vec3 effectsColor;\s*float effectsAlpha;\s*vec3 mistColor;\s*float mistAlpha;/,
  );
  assert.doesNotMatch(WATER_SHADER_NINJAONE_STREAMS, /result\.body|bodyAlpha/);
  assert.doesNotMatch(fragmentShader, /stream\.body|streamBody/);
  assert.match(
    fragmentShader,
    /sampleNinjaOneStreams\(worldUv, coast\.color\)/,
  );
  assert.match(WATER_SHADER_NINJAONE_STREAMS, /struct NinjaOneFieldSample/);
  assert.match(WATER_SHADER_NINJAONE_STREAMS, /result\.primary = ninjaOneBilinear0/);
  assert.match(WATER_SHADER_NINJAONE_STREAMS, /result\.auxiliary = ninjaOneBilinear0/);
  assert.doesNotMatch(
    WATER_SHADER_NINJAONE_STREAMS,
    /ninjaOneFetchVisual|ninjaOneBilinearVisual|result\.visual|vec4 visual/,
  );
  assert.match(WATER_SHADER_NINJAONE_STREAMS, /vec2 packed = encoded\.gb \/ max\(coverage/);
  assert.match(WATER_SHADER_NINJAONE_STREAMS, /float visualDepth = decodeNinjaOneScalar/);
  assert.match(WATER_SHADER_NINJAONE_STREAMS, /float bankContact = bodyCoverage/);
  assert.match(WATER_SHADER_NINJAONE_STREAMS, /float intermittentBank = bankContact/);
  assert.match(WATER_SHADER_NINJAONE_STREAMS, /float materialBreakup = smoother/);
  assert.match(WATER_SHADER_NINJAONE_STREAMS, /float channelMotionAuthority = smoother/);
  assert.match(WATER_SHADER_NINJAONE_STREAMS, /float runSurfaceAlpha = channelMotionAuthority/);
  assert.match(WATER_SHADER_NINJAONE_STREAMS, /float tarnSurfaceAlpha = tarn/);
  assert.match(WATER_SHADER_NINJAONE_STREAMS, /max\(runSurfaceAlpha, tarnSurfaceAlpha\)/);
  assert.match(WATER_SHADER_NINJAONE_STREAMS, /float riffleWaveletAuthority = runRegime/);
  assert.match(WATER_SHADER_NINJAONE_STREAMS, /smoother\(0\.04, 0\.28, whitewaterPotential\)/);
  assert.match(WATER_SHADER_NINJAONE_STREAMS, /float combinedEffectsAlpha = foamAlpha/);
  assert.match(WATER_SHADER_NINJAONE_STREAMS, /result\.effectsAlpha = combinedEffectsAlpha/);
  assert.match(WATER_SHADER_NINJAONE_STREAMS, /NinjaOneCascadeSample cascade = sampleNinjaOneCascades/);
  assert.match(WATER_SHADER_NINJAONE_STREAMS, /float analyticCascadeSupport = max/);
  assert.match(
    WATER_SHADER_NINJAONE_STREAMS,
    /bodyCoverage <= 0\.001 && analyticCascadeSupport <= 0\.001/,
  );
  assert.match(WATER_SHADER_NINJAONE_STREAMS, /float fallFilaments = cascade\.fall/);
  assert.match(
    WATER_SHADER_NINJAONE_STREAMS,
    /cascade\.fallCoordinates\.x \* 0\.058 - time \* 0\.42,\s*cascade\.fallCoordinates\.y \* 0\.086/,
    "C2 rapid breakup must travel along the registered fall axis",
  );
  assert.match(WATER_SHADER_NINJAONE_STREAMS, /float impactFroth = cascade\.impact/);
  assert.match(WATER_SHADER_NINJAONE_STREAMS, /float downstreamFroth = cascade\.wake/);
  assert.doesNotMatch(WATER_SHADER_NINJAONE_STREAMS, /impactRing|plungeRing|ringFrequency|ringSpeed/);
  assert.match(WATER_SHADER_NINJAONE_STREAMS, /vec2 recoveryAxis = speed > 0\.015 \? flowAxis/);
  assert.match(WATER_SHADER_NINJAONE_STREAMS, /cascade\.wake = recoverySupport/);
  assert.doesNotMatch(WATER_SHADER_NINJAONE_STREAMS, /downhillAxis|vec2\(0\.68, 0\.73\)/);
  assert.ok(
    WATER_SHADER_NINJAONE_STREAMS.indexOf("analyticCascadeSupport <= 0.001")
      < WATER_SHADER_NINJAONE_STREAMS.indexOf("float channelWarp"),
    "pixels outside registered water and C2 rapid VFX must return before material sampling",
  );
  assert.match(WATER_SHADER_NINJAONE_STREAMS, /float majorImpactMist = smoother/);
  assert.match(WATER_SHADER_NINJAONE_STREAMS, /min\(0\.052, mistVolume/);
  for (let slot = 0; slot < 8; slot += 1) {
    for (const field of ["Approach", "Crest", "Fall", "Impact", "Mist", "Pool"]) {
      assert.match(WATER_SHADER_COMMON, new RegExp(
        `uniform vec4 u_ninjaOneCascade${field}${slot};`,
      ));
      assert.match(WATER_SHADER_NINJAONE_STREAMS, new RegExp(
        `u_ninjaOneCascade${field}${slot}`,
      ));
    }
  }
});

test("foreground hydrology source-over composites shared water and regional effects", async () => {
  const fragmentShader = await readFile(path.join(
    root,
    "features/career-world/layers/water-surface/rendering/shaders/fragment.ts",
  ), "utf8");
  assert.match(WATER_SHADER_COMMON, /uniform float u_foregroundHydrology;/);
  assert.doesNotMatch(fragmentShader, /stream\.body|streamBody/);
  assert.match(
    fragmentShader,
    /float baseVisibility = mix\(\s*max\(waterVisibility, coast\.overlayAlpha\),\s*waterVisibility,\s*foregroundOverlay\s*\);/,
  );
  assert.match(fragmentShader, /stream\.effectsAlpha/);
  assert.match(fragmentShader, /stream\.effectsColor/);
  assert.match(fragmentShader, /stream\.mistAlpha/);
  assert.match(fragmentShader, /stream\.mistColor/);
  assert.match(
    fragmentShader,
    /float foregroundOverlay = u_foregroundHydrology\s*\* smoother\(0\.08, 0\.45, u_siteLod\);/,
  );
  assert.match(
    fragmentShader,
    /composite\.rgb = stream\.effectsColor \* streamEffectsAlpha\s*\+ composite\.rgb \* \(1\.0 - streamEffectsAlpha\);/,
  );
  assert.match(
    fragmentShader,
    /composite\.rgb = stream\.mistColor \* streamMistAlpha\s*\+ composite\.rgb \* \(1\.0 - streamMistAlpha\);/,
  );
  assert.match(fragmentShader, /vec3 color = composite\.rgb \/ max\(composite\.a, 0\.00001\);/);
  assert.match(fragmentShader, /u_opacity \* composite\.a/);
  assert.doesNotMatch(fragmentShader, /registeredStreamVisibility|streamBodyMix/);
});

test("regional admission uses exact native snapshots and the continuous max-two event bound", async () => {
  const manifest = await readManifest();
  const regions = manifest.regionalFields.regions;
  const detailResources = manifest.regionalFields.tiers.detail.resources;
  const fallbackResources = manifest.regionalFields.tiers.fallback.resources;
  const makeSnapshot = ({ camera, decodedBytes, epoch = 1, presentationReady = true }) => (
    createNinjaOneEnvironmentNativeHydrologyAdmissionSnapshot({
      camera,
      demand: true,
      epoch,
      optionalNodeCount: 0,
      presentationReady,
      registrationIntersects: true,
      requiredNodeCount: 1,
      resources: [nativeResource(`native-${decodedBytes}`, decodedBytes)],
      targetResources: [nativeResource(`native-${decodedBytes}`, decodedBytes)],
    })
  );
  const c1Camera = Object.freeze({
    origin: [0.2925, 1 / 12 - 0.02],
    span: [0.04, 0.04],
  });
  const c1Snapshot = makeSnapshot({ camera: c1Camera, decodedBytes: 25_000_000 });
  assert.equal(nativeHydrologyAdmissionSnapshotIsUsable(
    c1Snapshot,
    c1Camera,
    0,
  ), true);
  const c1Detail = planRegionalHydrologyCohort({
    camera: c1Camera,
    currentResources: [],
    detailResources,
    fallbackResources,
    maximumDecodedBytes: 33_554_432,
    maximumMountedRegions: 2,
    maximumTextureSize: 16_384,
    minimumSnapshotEpoch: 0,
    regions,
    snapshot: c1Snapshot,
  });
  assert.equal(c1Detail.tier, "detail");
  assert.deepEqual(c1Detail.regionIds, ["C1"]);
  const decodedBytesFor = (tierResources, regionIds) => tierResources
    .filter(({ regionId }) => regionIds.includes(regionId))
    .reduce((sum, { decodedBytes }) => sum + decodedBytes, 0);
  assert.equal(c1Detail.decodedBytes, decodedBytesFor(detailResources, ["C1"]));

  const denseCamera = Object.freeze({
    origin: [0.18151041666666667, 0.10987654320987653],
    span: [0.075, 0.075],
  });
  const denseSnapshot = makeSnapshot({
    camera: denseCamera,
    decodedBytes: 29_000_000,
    epoch: 2,
  });
  const denseFallback = planRegionalHydrologyCohort({
    camera: denseCamera,
    currentResources: [],
    detailResources,
    fallbackResources,
    maximumDecodedBytes: 33_554_432,
    maximumMountedRegions: 2,
    maximumTextureSize: 16_384,
    minimumSnapshotEpoch: 0,
    regions,
    snapshot: denseSnapshot,
  });
  assert.equal(denseFallback.tier, "fallback");
  assert.deepEqual(denseFallback.regionIds, ["B2", "C1"]);
  assert.equal(
    denseFallback.decodedBytes,
    decodedBytesFor(fallbackResources, ["B2", "C1"]),
  );
  assert.equal(
    denseFallback.nativeUnionSteadyBytes,
    29_000_000 + denseFallback.decodedBytes,
  );
  assert.ok(denseFallback.nativeUnionSteadyBytes <= 33_554_432);

  const capabilityFallback = planRegionalHydrologyCohort({
    camera: c1Camera,
    currentResources: [],
    detailResources,
    fallbackResources,
    maximumDecodedBytes: 33_554_432,
    maximumMountedRegions: 2,
    maximumTextureSize: 800,
    minimumSnapshotEpoch: 0,
    regions,
    snapshot: c1Snapshot,
  });
  assert.equal(capabilityFallback.tier, "fallback");
  assert.equal(capabilityFallback.decodedBytes, decodedBytesFor(fallbackResources, ["C1"]));

  const heldSnapshot = makeSnapshot({
    camera: c1Camera,
    decodedBytes: 25_000_000,
    presentationReady: false,
  });
  assert.equal(planRegionalHydrologyCohort({
    camera: c1Camera,
    currentResources: [],
    detailResources,
    fallbackResources,
    maximumDecodedBytes: 33_554_432,
    maximumMountedRegions: 2,
    maximumTextureSize: 16_384,
    minimumSnapshotEpoch: 0,
    regions,
    snapshot: heldSnapshot,
  }).reason, "stale-admission");
  const tamperedSnapshot = Object.freeze({
    ...c1Snapshot,
    reservedDecodedBytes: c1Snapshot.reservedDecodedBytes + 1,
  });
  assert.equal(nativeHydrologyAdmissionSnapshotIsUsable(
    tamperedSnapshot,
    c1Camera,
    0,
  ), false);
  const tamperedIdentitySnapshot = Object.freeze({
    ...c1Snapshot,
    resources: [Object.freeze({
      ...c1Snapshot.resources[0],
      sha256: c1Snapshot.resources[0].sha256.toLowerCase(),
    })],
  });
  assert.equal(nativeHydrologyAdmissionSnapshotIsUsable(
    tamperedIdentitySnapshot,
    c1Camera,
    0,
  ), false);

  const transitioningSnapshot = makeSnapshot({
    camera: denseCamera,
    decodedBytes: 26_000_000,
    epoch: 3,
  });
  const currentC1Detail = detailResources.filter(({ regionId }) => regionId === "C1");
  const transitionPlan = planRegionalHydrologyCohort({
    camera: denseCamera,
    currentResources: currentC1Detail,
    detailResources,
    fallbackResources,
    maximumDecodedBytes: 33_554_432,
    maximumMountedRegions: 2,
    maximumTextureSize: 16_384,
    minimumSnapshotEpoch: 0,
    regions,
    snapshot: transitioningSnapshot,
  });
  assert.equal(transitionPlan.tier, "detail");
  const incomingB2DetailBytes = decodedBytesFor(detailResources, ["B2"]);
  assert.equal(transitionPlan.incomingDecodedBytes, incomingB2DetailBytes);
  assert.equal(
    transitionPlan.nativeUnionTransitionBytes,
    26_000_000 + c1Detail.decodedBytes + incomingB2DetailBytes,
  );
  assert.ok(transitionPlan.nativeUnionTransitionBytes <= 33_554_432);

  const evictionSnapshot = makeSnapshot({
    camera: denseCamera,
    decodedBytes: 31_000_000,
    epoch: 4,
  });
  const blockedReplacement = planRegionalHydrologyCohort({
    camera: denseCamera,
    currentResources: currentC1Detail,
    detailResources,
    fallbackResources,
    maximumDecodedBytes: 33_554_432,
    maximumMountedRegions: 2,
    maximumTextureSize: 16_384,
    minimumSnapshotEpoch: 0,
    regions,
    snapshot: evictionSnapshot,
  });
  assert.equal(blockedReplacement.reason, "native-union");
  assert.equal(blockedReplacement.tier, null);
  const admittedAfterEviction = planRegionalHydrologyCohort({
    camera: denseCamera,
    currentResources: [],
    detailResources,
    fallbackResources,
    maximumDecodedBytes: 33_554_432,
    maximumMountedRegions: 2,
    maximumTextureSize: 16_384,
    minimumSnapshotEpoch: 0,
    regions,
    snapshot: evictionSnapshot,
  });
  assert.equal(admittedAfterEviction.tier, "fallback");
  assert.equal(
    admittedAfterEviction.nativeUnionSteadyBytes,
    31_000_000 + denseFallback.decodedBytes,
  );

  const artboardSpan = [432, 243];
  const xBoundaries = regions.flatMap(({ artboardBounds }) => (
    [artboardBounds[0] - artboardSpan[0], artboardBounds[2]]
  ));
  const yBoundaries = regions.flatMap(({ artboardBounds }) => (
    [artboardBounds[1] - artboardSpan[1], artboardBounds[3]]
  ));
  const axisWitnesses = (boundaries) => {
    const sorted = [...new Set([-600, ...boundaries, 1600])].sort((a, b) => a - b);
    return sorted.flatMap((value, index) => {
      const next = sorted[index + 1];
      return [value - 1e-6, value + 1e-6, next === undefined ? null : (value + next) / 2]
        .filter((candidate) => candidate !== null);
    });
  };
  const selectedSets = new Set();
  for (const artboardY of axisWitnesses(yBoundaries)) {
    for (const artboardX of axisWitnesses(xBoundaries)) {
      const camera = {
        origin: [
          0.125 + artboardX / 1440 * 0.25,
          artboardY / 1080 * (1 / 3),
        ],
        span: [0.075, 0.075],
      };
      selectedSets.add(selectRegionalHydrologyRegionIds(camera, regions, 2).join("+"));
    }
  }
  assert.deepEqual(
    [...selectedSets].sort(),
    ["", "B2", "B2+C1", "B2+C2", "C1", "C1+C2", "C2"],
  );
  assert.ok(
    [...selectedSets].every((selection) => selection === "" || selection.split("+").length <= 2),
    "regional admission must never select more than the two-resource runtime budget",
  );
  assert.equal(viewIntersectsHydrologyRegistration(
    denseCamera,
    [0.125, 0],
    [0.25, 1 / 3],
  ), true);

  const sharedWaterCurrent = 301_989_887;
  assert.ok(sharedWaterCurrent + denseFallback.decodedBytes > 301_989_888);
  assert.equal(
    denseFallback.reason,
    null,
    "shared-water bytes are a separate ledger and may not reject native hydrology",
  );
});

test("regional load epochs serialize delayed A-B-C and A-B-A decodes", async () => {
  let state = createRegionalHydrologyLoadState();
  const firstA = retargetRegionalHydrologyLoad(state, "A");
  assert.ok(firstA.token);
  state = settleRegionalHydrologyLoad(firstA.state, firstA.token, { ok: true });
  assert.equal(state.mountedKey, "A");
  const targetB = retargetRegionalHydrologyLoad(state, "B");
  assert.ok(targetB.token);
  const secondA = retargetRegionalHydrologyLoad(targetB.state, "A");
  assert.ok(secondA.token);
  assert.equal(regionalHydrologyLoadMaySettle(secondA.state, firstA.token), false);
  assert.equal(regionalHydrologyLoadMaySettle(secondA.state, targetB.token), false);
  assert.equal(
    settleRegionalHydrologyLoad(secondA.state, firstA.token, { ok: true }),
    secondA.state,
  );
  const failedA = settleRegionalHydrologyLoad(
    secondA.state,
    secondA.token,
    { error: "synthetic decode failure", ok: false },
  );
  assert.equal(failedA.phase, "failed");
  assert.equal(failedA.mountedKey, "A", "failure must retain the prior complete cohort");
  assert.equal(failedA.error, "synthetic decode failure");

  const cameraA = { origin: [0.21, 0.17], span: [0.04, 0.04] };
  const cameraB = { origin: [0.29, 0.23], span: [0.04, 0.04] };
  const snapshotA1 = createNinjaOneEnvironmentNativeHydrologyAdmissionSnapshot({
    camera: cameraA,
    demand: true,
    epoch: 1,
    optionalNodeCount: 0,
    presentationReady: true,
    registrationIntersects: true,
    requiredNodeCount: 1,
    resources: [nativeResource("A", 1_000_000)],
    targetResources: [nativeResource("A", 1_000_000)],
  });
  const snapshotB2 = createNinjaOneEnvironmentNativeHydrologyAdmissionSnapshot({
    camera: cameraB,
    demand: true,
    epoch: 2,
    optionalNodeCount: 0,
    presentationReady: true,
    registrationIntersects: true,
    requiredNodeCount: 1,
    resources: [nativeResource("B", 1_000_000)],
    targetResources: [nativeResource("B", 1_000_000)],
  });
  const snapshotA3 = createNinjaOneEnvironmentNativeHydrologyAdmissionSnapshot({
    camera: cameraA,
    demand: true,
    epoch: 3,
    optionalNodeCount: 0,
    presentationReady: true,
    registrationIntersects: true,
    requiredNodeCount: 1,
    resources: [nativeResource("A", 1_000_000)],
    targetResources: [nativeResource("A", 1_000_000)],
  });
  assert.equal(nativeHydrologyAdmissionSnapshotIsUsable(snapshotA1, cameraA, 0), true);
  assert.equal(nativeHydrologyAdmissionSnapshotIsUsable(snapshotB2, cameraA, 0), false);
  assert.equal(nativeHydrologyAdmissionSnapshotIsUsable(snapshotA1, cameraA, 3), false);
  assert.equal(nativeHydrologyAdmissionSnapshotIsUsable(snapshotA3, cameraA, 3), true);

  const deferred = () => {
    let resolve;
    let reject;
    const promise = new Promise((resolvePromise, rejectPromise) => {
      resolve = resolvePromise;
      reject = rejectPromise;
    });
    return { promise, reject, resolve };
  };
  const flushMicrotasks = async () => {
    await Promise.resolve();
    await Promise.resolve();
  };
  const maximumNativeUnionBytes = 33_554_432;
  const nativeReserveBytes = 27_000_000;
  const mountedC1DetailBytes = 4_256_240;
  const decodeRequest = (
    targetKey,
    decodedBytes,
    nativeUnionBytes = decodedBytes,
  ) => Object.freeze({
    nativeUnionBytes,
    resources: [Object.freeze({
      decodedBytes,
      id: `resource-${targetKey}`,
      path: `/hydrology/${targetKey}.png`,
      sha256: createHash("sha256").update(targetKey).digest("hex").toUpperCase(),
    })],
    targetKey,
    tier: "fallback",
  });
  const snapshots = [];
  const starts = [];
  const releases = [];
  const promotions = [];
  const barrier = new RegionalHydrologyDecodeBarrier();
  const unsubscribe = barrier.subscribe(() => snapshots.push(barrier.snapshot()));
  const gateA = deferred();
  const gateC = deferred();
  const delayedRun = (id, gate) => async () => {
    starts.push(id);
    try {
      await gate.promise;
    } finally {
      releases.push(id);
    }
  };
  const decodeA = barrier.enqueue(
    decodeRequest("A", 1_821_380, 33_077_620),
    delayedRun("A", gateA),
  );
  await flushMicrotasks();
  const decodeB = barrier.enqueue(decodeRequest("B", 1_059_080), async () => {
    starts.push("B");
  });
  const decodeC = barrier.enqueue(
    decodeRequest("C", 685_440, 31_941_680),
    delayedRun("C", gateC),
  );
  assert.deepEqual(starts, ["A"]);
  assert.equal(barrier.snapshot().pendingTargetKey, "C");
  assert.equal(
    nativeReserveBytes + mountedC1DetailBytes
      + barrier.snapshot().activeDecodedBytes,
    33_077_620,
  );
  assert.ok(
    nativeReserveBytes + mountedC1DetailBytes
      + barrier.snapshot().activeDecodedBytes <= maximumNativeUnionBytes,
  );
  gateA.resolve();
  const outcomeA = await decodeA;
  assert.equal(outcomeA.status, "stale-settled");
  assert.equal((await decodeB).status, "superseded-before-start");
  await flushMicrotasks();
  assert.deepEqual(starts, ["A", "C"]);
  assert.equal(barrier.snapshot().activeDecodedBytes, 685_440);
  assert.ok(
    nativeReserveBytes + mountedC1DetailBytes
      + barrier.snapshot().activeDecodedBytes <= maximumNativeUnionBytes,
  );
  gateC.resolve();
  const outcomeC = await decodeC;
  if (outcomeA.status === "completed") promotions.push("A");
  if (outcomeC.status === "completed") promotions.push("C");
  assert.deepEqual(promotions, ["C"]);
  assert.deepEqual(releases, ["A", "C"]);
  assert.equal(barrier.snapshot().phase, "idle");
  assert.ok(snapshots.every(({ activeDecodedBytes }) => (
    activeDecodedBytes === 0
    || activeDecodedBytes === 1_821_380
    || activeDecodedBytes === 685_440
  )));
  unsubscribe();

  const returnBarrier = new RegionalHydrologyDecodeBarrier();
  const firstAGate = deferred();
  const secondAGate = deferred();
  const returnStarts = [];
  const firstDecodeA = returnBarrier.enqueue(decodeRequest("A@1", 762_300), async () => {
    returnStarts.push("A@1");
    await firstAGate.promise;
  });
  await flushMicrotasks();
  const skippedDecodeB = returnBarrier.enqueue(decodeRequest("B@2", 1_059_080), async () => {
    returnStarts.push("B@2");
  });
  const secondDecodeA = returnBarrier.enqueue(decodeRequest("A@3", 762_300), async () => {
    returnStarts.push("A@3");
    await secondAGate.promise;
  });
  firstAGate.resolve();
  assert.equal((await firstDecodeA).status, "stale-settled");
  assert.equal((await skippedDecodeB).status, "superseded-before-start");
  await flushMicrotasks();
  assert.deepEqual(returnStarts, ["A@1", "A@3"]);
  secondAGate.resolve();
  assert.equal((await secondDecodeA).status, "completed");

  const failureBarrier = new RegionalHydrologyDecodeBarrier();
  let failureRuns = 0;
  assert.equal((await failureBarrier.enqueue(decodeRequest("failure", 10), async () => {
    failureRuns += 1;
    throw new Error("synthetic delayed decode failure");
  })).status, "failed");
  assert.equal(failureRuns, 1, "a failed decode must not self-retry");
  assert.equal((await failureBarrier.enqueue(
    decodeRequest("recovery", 20),
    async () => {},
  )).status, "completed");
  const releaseGate = deferred();
  let releaseCleanup = 0;
  const releasedDecode = failureBarrier.enqueue(decodeRequest("release", 30), async () => {
    try {
      await releaseGate.promise;
    } finally {
      releaseCleanup += 1;
    }
  });
  await flushMicrotasks();
  failureBarrier.cancel();
  releaseGate.resolve();
  assert.equal((await releasedDecode).status, "stale-settled");
  await failureBarrier.whenSettled();
  assert.equal(releaseCleanup, 1);
  assert.equal(failureBarrier.snapshot().phase, "idle");

  const remountBarrier = new RegionalHydrologyDecodeBarrier();
  const staleGate = deferred();
  const remountGate = deferred();
  const remountStarts = [];
  const remountReleases = [];
  const oldRendererDecode = remountBarrier.enqueue(
    decodeRequest("old-renderer", 1_821_380, 33_077_620),
    async () => {
      remountStarts.push("old-renderer");
      try {
        await staleGate.promise;
      } finally {
        remountReleases.push("old-renderer");
      }
    },
  );
  await flushMicrotasks();
  const remountSnapshots = [];
  const unsubscribeRemount = remountBarrier.subscribe(() => {
    remountSnapshots.push(remountBarrier.snapshot());
  });
  const remountedDecode = remountBarrier.enqueue(
    decodeRequest("remounted-c2", 685_440, 31_941_680),
    async () => {
      remountStarts.push("remounted-c2");
      try {
        await remountGate.promise;
      } finally {
        remountReleases.push("remounted-c2");
      }
    },
  );
  assert.deepEqual(remountStarts, ["old-renderer"]);
  assert.deepEqual(
    remountBarrier.snapshot().activeResources.map(({ id }) => id),
    ["resource-old-renderer"],
  );
  assert.equal(remountBarrier.snapshot().activeNativeUnionBytes, 33_077_620);
  staleGate.resolve();
  assert.equal((await oldRendererDecode).status, "stale-settled");
  await flushMicrotasks();
  assert.deepEqual(remountStarts, ["old-renderer", "remounted-c2"]);
  assert.deepEqual(remountReleases, ["old-renderer"]);
  assert.equal(remountBarrier.snapshot().activeNativeUnionBytes, 31_941_680);
  remountGate.resolve();
  assert.equal((await remountedDecode).status, "completed");
  assert.deepEqual(remountReleases, ["old-renderer", "remounted-c2"]);
  assert.ok(remountSnapshots.every(({ activeDecodedBytes }) => (
    activeDecodedBytes !== 2_506_820
  )), "destroy/remount must never overlap stale and newest decoded ownership");
  unsubscribeRemount();
});

test("every regional cohort identity change fades monotonically through zero", () => {
  const cohortResource = (id) => Object.freeze({
    id,
    path: `/hydrology/${id}.png`,
    sha256: createHash("sha256").update(id).digest("hex").toUpperCase(),
  });
  const b2 = cohortResource("B2");
  const c1 = cohortResource("C1");
  const c2 = cohortResource("C2");
  for (const [label, current, next] of [
    ["subset", [b2, c1], [b2]],
    ["superset", [b2], [b2, c1]],
    ["disjoint", [c1], [c2]],
  ]) {
    assert.equal(
      regionalHydrologyCohortChangeRequiresFade(current, next),
      true,
      `${label} identity change must fade`,
    );
    const started = beginRegionalHydrologyFadeOut(
      createRegionalHydrologyVisibilityState(),
      5,
      false,
    );
    const fadeOutSamples = [started.state.opacity];
    let sample = started;
    for (const elapsedSeconds of [5.03, 5.06, 5.09, 5.12]) {
      sample = advanceRegionalHydrologyVisibility(
        sample.state,
        elapsedSeconds,
        false,
      );
      fadeOutSamples.push(sample.state.opacity);
    }
    assert.ok(fadeOutSamples.every((opacity, index) => (
      index === 0 || opacity <= fadeOutSamples[index - 1]
    )), `${label} fade-out must be monotonic`);
    assert.equal(sample.releaseResidentCohort, true);
    assert.equal(sample.state.opacity, 0);

    let fadeIn = beginRegionalHydrologyFadeIn(sample.state, 8, false);
    const fadeInSamples = [fadeIn.opacity];
    for (const elapsedSeconds of [8.03, 8.06, 8.09, 8.12]) {
      fadeIn = advanceRegionalHydrologyVisibility(
        fadeIn,
        elapsedSeconds,
        false,
      ).state;
      fadeInSamples.push(fadeIn.opacity);
    }
    assert.ok(fadeInSamples.every((opacity, index) => (
      index === 0 || opacity >= fadeInSamples[index - 1]
    )), `${label} fade-in must be monotonic`);
    assert.ok(Math.abs(fadeIn.opacity - 1) < 1e-9);
  }
  assert.equal(
    regionalHydrologyCohortChangeRequiresFade([b2, c1], [c1, b2]),
    false,
    "slot ordering alone is not a resource identity change",
  );

  let visibility = createRegionalHydrologyVisibilityState();
  const fadeOut = beginRegionalHydrologyFadeOut(visibility, 5, false);
  assert.equal(fadeOut.releaseResidentCohort, false);
  assert.deepEqual(fadeOut.state, {
    fromOpacity: 1,
    opacity: 1,
    phase: "fading-out",
    startedAtSeconds: 5,
  });

  const halfwayOut = advanceRegionalHydrologyVisibility(
    fadeOut.state,
    5.06,
    false,
  );
  assert.equal(halfwayOut.releaseResidentCohort, false);
  assert.ok(Math.abs(halfwayOut.state.opacity - 0.5) < 1e-9);
  assert.equal(halfwayOut.state.phase, "fading-out");

  const residentZero = advanceRegionalHydrologyVisibility(
    halfwayOut.state,
    5.12,
    false,
  );
  assert.equal(residentZero.releaseResidentCohort, true);
  assert.equal(residentZero.state.phase, "zero");
  assert.equal(residentZero.state.opacity, 0);

  visibility = beginRegionalHydrologyFadeIn(residentZero.state, 8, false);
  assert.equal(visibility.phase, "fading-in");
  const halfwayIn = advanceRegionalHydrologyVisibility(visibility, 8.06, false);
  assert.ok(Math.abs(halfwayIn.state.opacity - 0.5) < 1e-9);
  assert.equal(halfwayIn.releaseResidentCohort, false);
  const stable = advanceRegionalHydrologyVisibility(
    halfwayIn.state,
    8.121,
    false,
  );
  assert.equal(stable.state.phase, "stable");
  assert.equal(stable.state.opacity, 1);

  const reducedMotion = beginRegionalHydrologyFadeOut(stable.state, 9, true);
  assert.equal(reducedMotion.releaseResidentCohort, true);
  assert.equal(reducedMotion.state.phase, "zero");
  assert.equal(reducedMotion.state.opacity, 0);
});

test("water runtime binds two verified regional slots without charging shared textures", async () => {
  const [component, controller, renderer, webgl, assets, hydrologyRuntime] = await Promise.all([
    readFile(path.join(root, "features/career-world/layers/water-surface/components/WaterSurfaceCanvas.tsx"), "utf8"),
    readFile(path.join(root, "features/career-world/layers/water-surface/rendering/WaterSurfaceController.ts"), "utf8"),
    readFile(path.join(root, "features/career-world/layers/water-surface/rendering/WaterSurfaceRenderer.ts"), "utf8"),
    readFile(path.join(root, "features/career-world/layers/water-surface/rendering/webgl.ts"), "utf8"),
    readFile(path.join(root, "features/career-world/layers/water-surface/model/assets.ts"), "utf8"),
    readFile(path.join(root, "features/career-world/layers/water-surface/rendering/hydrology-runtime.ts"), "utf8"),
  ]);
  assert.match(component, /nativeHydrologyAdmission\?:/);
  assert.match(component, /useLayoutEffect\(\(\) => \{\s*sceneRef\.current = \{/);
  assert.match(component, /controllerRef\.current\?\.setView\([\s\S]*nativeHydrologyAdmission/);
  assert.match(component, /motionPreference\.addEventListener\("change", handleMotionPreferenceChange\)/);
  assert.match(component, /motionPreference\.removeEventListener\([\s\S]*handleMotionPreferenceChange/);
  assert.match(controller, /setInvalidationHandler\(this\.handleRendererInvalidation\)/);
  assert.match(controller, /nativeHydrologyAdmission:[\s\S]*HydrologyAdmissionSnapshot \| null/);
  assert.match(renderer, /NINJAONE_HYDROLOGY_UNITS = Object\.freeze\(\[/);
  assert.match(renderer, /u_ninjaOneStreamFlow0/);
  assert.match(renderer, /u_ninjaOneStreamFlow1/);
  assert.match(renderer, /planRegionalHydrologyCohort\(/);
  assert.match(renderer, /nativeHydrologyAdmissionSnapshotIsUsable\(/);
  assert.match(hydrologyRuntime, /snapshot\.presentationReady/);
  assert.match(renderer, /ninjaOneEnvironmentNativeHydrologyCameraKey\(camera\)/);
  assert.match(renderer, /cameraChangedSinceAcceptance \|\| !incomingAdmissionIsCurrent/);
  assert.match(renderer, /minimumNativeHydrologyAdmissionEpoch \+= 1/);
  assert.match(renderer, /new AbortController\(\)/);
  assert.match(hydrologyRuntime, /export class RegionalHydrologyDecodeBarrier/);
  assert.match(hydrologyRuntime, /export const regionalHydrologyDecodeCoordinator/);
  assert.match(renderer, /hydrologyDecodeBarrier = regionalHydrologyDecodeCoordinator/);
  assert.match(renderer, /this\.hydrologyDecodeBarrier\.enqueue\(/);
  assert.match(renderer, /loadVerifiedImage\([\s\S]*resource\.sha256/);
  assert.match(renderer, /Promise\.allSettled\(missingResources\.map/);
  assert.match(renderer, /for \(const \{ image \} of loaded\) releaseDecodedImage\(image\)/);
  assert.match(renderer, /image\.naturalWidth \* image\.naturalHeight \* 4/);
  assert.match(renderer, /filter: "nearest"/);
  assert.match(renderer, /generateMipmaps: false/);
  assert.match(renderer, /preserveDataBytes: true/);
  assert.match(renderer, /this\.hydrologyLoadToken === token/);
  assert.match(renderer, /retainedTextures/);
  assert.match(renderer, /settleRegionalHydrologyLoad\([\s\S]*ok: false/);
  assert.match(renderer, /abortController\.abort\(\);\s*const message = error/);
  assert.match(renderer, /this\.failedDetailTargetKey = plan\.targetKey/);
  assert.match(
    renderer,
    /retryAfterEviction = plan\.reason === "native-union"[\s\S]*this\.reconcileHydrologyAssets\(\);/,
  );
  assert.match(
    renderer,
    /if \(planTier === "detail"\) \{\s*this\.failedDetailTargetKey = null;/,
  );
  assert.match(renderer, /dataset\.hydrologyAssetRegionIds/);
  assert.match(renderer, /dataset\.hydrologyAssetResourcePaths/);
  assert.match(renderer, /dataset\.hydrologyFieldPacking/);
  assert.match(renderer, /dataset\.hydrologySchemaVersion/);
  assert.match(renderer, /dataset\.hydrologyRequestedRegionIds/);
  assert.match(renderer, /dataset\.hydrologyNativeUnionCurrentBytes/);
  assert.match(renderer, /dataset\.hydrologyNativeUnionTransitionPeakBytes/);
  assert.match(renderer, /dataset\.hydrologyNativeUnionIncomingBytes/);
  assert.match(renderer, /dataset\.hydrologyDecodeActiveBytes/);
  assert.match(renderer, /dataset\.hydrologyDecodeActiveResourceIds/);
  assert.match(renderer, /dataset\.hydrologyDecodePendingResourcePaths/);
  assert.match(renderer, /regional hydrology cohort identity transition/);
  assert.match(renderer, /dataset\.hydrologySamplerSlotCount/);
  assert.match(renderer, /dataset\.hydrologyTransitionOpacity/);
  assert.match(renderer, /dataset\.hydrologyTransitionState/);
  assert.match(renderer, /beginRegionalHydrologyFadeOut\(/);
  assert.match(renderer, /beginRegionalHydrologyFadeIn\(/);
  assert.match(renderer, /advanceRegionalHydrologyVisibility\(/);
  assert.match(renderer, /u_ninjaOneHydrologyOpacity/);
  assert.match(renderer, /NINJAONE_WATER_FEATURES\.cascades/);
  assert.match(renderer, /NINJAONE_MAX_CASCADES/);
  assert.match(
    renderer,
    /CASCADE_UNIFORM_NAMES\.approach\[slot\][\s\S]*feature\?\.approach\.extentPixels[\s\S]*feature\?\.approach\.widthPixels/,
  );
  assert.match(
    renderer,
    /CASCADE_UNIFORM_NAMES\.pool\[slot\][\s\S]*feature\?\.pool\.radiiPixels\[0\][\s\S]*feature\?\.pool\.outflowExtentPixels/,
  );
  assert.match(renderer, /dataset\.waterCascadeCount/);
  assert.match(renderer, /dataset\.waterProfile = CAREER_WORLD_WATER_REALISM_PROFILE\.id/);
  assert.match(renderer, /dataset\.waterMistPass = "c2-impact-drift-envelope"/);
  assert.match(renderer, /u_riverSurfaceProfile/);
  assert.match(renderer, /u_riverInteractionProfile/);
  assert.match(renderer, /u_waterfallSheetProfile/);
  assert.match(renderer, /u_waterfallImpactProfile/);
  assert.match(renderer, /u_mistProfile/);
  assert.match(renderer, /dataset\.foregroundWaterMode = foregroundHydrology[\s\S]*registered-overlay/);
  assert.match(renderer, /dataset\.sharedWaterTextureBytes/);
  const cohortLoader = renderer.match(
    /private loadHydrologyCohort\([\s\S]*?\n  private loadTerritoryAssets/,
  );
  assert.ok(cohortLoader);
  assert.doesNotMatch(cohortLoader[0], /Promise\.all\(/);
  assert.doesNotMatch(cohortLoader[0], /this\.textureBytes\s*[+-]=/);
  assert.doesNotMatch(cohortLoader[0], /recordTextureTransientPeak\(/);
  assert.doesNotMatch(cohortLoader[0], /WATER_RUNTIME_TEXTURE_BUDGET_BYTES/);
  assert.match(renderer, /initialTextureBytes > WATER_RUNTIME_TEXTURE_BUDGET_BYTES/);
  assert.match(renderer, /recordTextureTransientPeak\(loadedTransientPeakBytes\)/);
  assert.match(renderer, /projectedDetailBytes[\s\S]*WATER_RUNTIME_TEXTURE_BUDGET_BYTES/);
  assert.match(renderer, /transientDetailBytes/);
  assert.match(webgl, /crypto\.subtle\.digest\("SHA-256", bytes\)/);
  assert.match(webgl, /actualSha256 !== expectedSha256\.toUpperCase\(\)/);
  assert.match(webgl, /loadImage\(objectUrl, signal\)/);
  assert.match(webgl, /signal\?\.addEventListener\("abort", handleAbort/);
  assert.match(webgl, /releaseDecodedImage\(image\);\s*cleanup\(\);\s*reject\(error\)/);
  assert.match(webgl, /gl\.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl\.NONE/);
  assert.match(webgl, /filter === "nearest" \? gl\.NEAREST : gl\.LINEAR/);
  for (const numericTexture of [
    "macroHeight",
    "microHeight",
    "coastGeometry",
    "coastMaterial",
    "hydrology",
  ]) {
    assert.match(renderer, new RegExp(`\\["${numericTexture}"[^\\n]+true\\]`));
  }
  assert.doesNotMatch(assets, /ninjaOneStreamFlowFallback|NINJAONE_STREAM_FLOW/);
  assert.match(assets, /WATER_RUNTIME_TEXTURE_BUDGET_BYTES = 288 \* 1024 \* 1024/);
  assert.match(assets, /maximumMountedRegions/);
});

test("regional hydrology has no legacy waterfall raster authority", async () => {
  const [
    assets,
    renderer,
    commonShader,
    streamShader,
    builder,
    packageJson,
    manifest,
  ] = await Promise.all([
    readFile(path.join(
      root,
      "features/career-world/layers/water-surface/model/assets.ts",
    ), "utf8"),
    readFile(path.join(
      root,
      "features/career-world/layers/water-surface/rendering/WaterSurfaceRenderer.ts",
    ), "utf8"),
    readFile(path.join(
      root,
      "features/career-world/layers/water-surface/rendering/shaders/common.ts",
    ), "utf8"),
    readFile(path.join(
      root,
      "features/career-world/layers/water-surface/rendering/shaders/ninjaone-streams.ts",
    ), "utf8"),
    readFile(path.join(
      root,
      "scripts/build-ninjaone-environment-hydrology-r2.mjs",
    ), "utf8"),
    readFile(path.join(root, "package.json"), "utf8").then(JSON.parse),
    readFile(path.join(
      root,
      "public/career-world/capitals/ninjaone/environment/manifests/hydrology-native-r2.json",
    ), "utf8").then(JSON.parse),
  ]);

  for (const source of [assets, renderer, commonShader, streamShader, builder]) {
    assert.doesNotMatch(
      source,
      /waterfall-vfx|waterfall-reference-template|u_waterfallVfx|waterfallVfx/,
    );
  }
  assert.equal(packageJson.scripts["build:waterfall-vfx"], undefined);
  assert.equal(manifest.visualReference, undefined);
  await assert.rejects(
    access(path.join(
      root,
      "public/career-world/layers/water-surface/fields/ninjaone-stream-flow-r1.png",
    )),
    /ENOENT/,
  );
});

test("numeric upload and decoded-image ownership clean every lifecycle", { concurrency: false }, async () => {
  const calls = [];
  const texture = Object.freeze({ id: "numeric-field" });
  let colorConversion = 91;
  const gl = {
    CLAMP_TO_EDGE: 8,
    LINEAR: 9,
    LINEAR_MIPMAP_LINEAR: 10,
    MIRRORED_REPEAT: 11,
    NEAREST: 12,
    NONE: 0,
    NO_ERROR: 0,
    REPEAT: 13,
    RGBA: 14,
    TEXTURE_2D: 15,
    TEXTURE_MAG_FILTER: 16,
    TEXTURE_MIN_FILTER: 17,
    TEXTURE_WRAP_S: 18,
    TEXTURE_WRAP_T: 19,
    UNPACK_COLORSPACE_CONVERSION_WEBGL: 20,
    UNPACK_FLIP_Y_WEBGL: 21,
    UNSIGNED_BYTE: 22,
    bindTexture: (...args) => calls.push(["bindTexture", ...args]),
    createTexture: () => texture,
    deleteTexture: (...args) => calls.push(["deleteTexture", ...args]),
    generateMipmap: (...args) => calls.push(["generateMipmap", ...args]),
    getError: () => 0,
    getParameter: (parameter) => {
      assert.equal(parameter, 20);
      return colorConversion;
    },
    pixelStorei: (parameter, value) => {
      calls.push(["pixelStorei", parameter, value]);
      if (parameter === 20) colorConversion = value;
    },
    texImage2D: (...args) => calls.push(["texImage2D", colorConversion, ...args]),
    texParameteri: (...args) => calls.push(["texParameteri", ...args]),
  };
  const image = Object.freeze({ naturalHeight: 2, naturalWidth: 2 });
  assert.equal(createTexture(gl, image, "clamp", {
    filter: "nearest",
    generateMipmaps: false,
    preserveDataBytes: true,
  }), texture);
  assert.equal(calls.find(([name]) => name === "texImage2D")[1], gl.NONE);
  assert.deepEqual(
    calls.filter(([, parameter]) => parameter === gl.UNPACK_COLORSPACE_CONVERSION_WEBGL),
    [
      ["pixelStorei", gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE],
      ["pixelStorei", gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, 91],
    ],
  );
  assert.equal(colorConversion, 91);
  assert.equal(calls.some(([name]) => name === "generateMipmap"), false);
  assert.ok(calls.some((call) => (
    call[0] === "texParameteri"
    && call[2] === gl.TEXTURE_MIN_FILTER
    && call[3] === gl.NEAREST
  )));
  assert.ok(calls.some((call) => (
    call[0] === "texParameteri"
    && call[2] === gl.TEXTURE_MAG_FILTER
    && call[3] === gl.NEAREST
  )));

  calls.length = 0;
  createTexture(gl, image, "clamp", { generateMipmaps: false });
  assert.equal(calls.find(([name]) => name === "texImage2D")[1], 91);
  assert.equal(
    calls.some(([, parameter]) => parameter === gl.UNPACK_COLORSPACE_CONVERSION_WEBGL),
    false,
  );
  calls.length = 0;
  gl.texImage2D = (...args) => {
    calls.push(["texImage2D", colorConversion, ...args]);
    throw new Error("synthetic upload failure");
  };
  assert.throws(() => createTexture(gl, image, "clamp", {
    filter: "nearest",
    generateMipmaps: false,
    preserveDataBytes: true,
  }), /synthetic upload failure/);
  assert.equal(colorConversion, 91);
  assert.ok(calls.some(([name, deletedTexture]) => (
    name === "deleteTexture" && deletedTexture === texture
  )));
  assert.equal(retainTextureTransientPeak(80_595_245, 259_091_416), 259_091_416);
  assert.equal(retainTextureTransientPeak(259_091_416, 250_700_205), 259_091_416);
  assert.throws(() => retainTextureTransientPeak(0, Number.NaN), /finite and non-negative/);
  const removedAttributes = [];
  releaseDecodedImage({
    removeAttribute: (name) => removedAttributes.push(name),
  });
  assert.deepEqual(removedAttributes, ["src"]);

  const priorImage = globalThis.Image;
  const priorFetch = globalThis.fetch;
  const priorCreateObjectUrl = URL.createObjectURL;
  const priorRevokeObjectUrl = URL.revokeObjectURL;
  const images = [];
  const revoked = [];
  class ControlledImage {
    constructor() {
      this.decoding = "auto";
      this.listeners = new Map();
      this.naturalHeight = 2;
      this.naturalWidth = 2;
      this.removed = [];
      this.source = "";
      images.push(this);
    }

    addEventListener(name, listener) {
      const listeners = this.listeners.get(name) ?? new Set();
      listeners.add(listener);
      this.listeners.set(name, listeners);
    }

    removeAttribute(name) {
      this.removed.push(name);
      if (name === "src") this.source = "";
    }

    removeEventListener(name, listener) {
      this.listeners.get(name)?.delete(listener);
    }

    set src(value) {
      this.source = value;
    }

    get src() {
      return this.source;
    }

    dispatch(name) {
      for (const listener of [...(this.listeners.get(name) ?? [])]) listener();
    }
  }
  try {
    globalThis.Image = ControlledImage;
    const pngBytes = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const expectedSha256 = sha256(pngBytes);
    globalThis.fetch = async () => ({
      arrayBuffer: async () => pngBytes.buffer.slice(0),
      headers: { get: () => "image/png" },
      ok: true,
      status: 200,
    });
    URL.createObjectURL = () => "blob:controlled-hydrology";
    URL.revokeObjectURL = (value) => revoked.push(value);
    const abortController = new AbortController();
    const verifiedLoad = loadVerifiedImage(
      "/hydrology/controlled.png",
      expectedSha256,
      abortController.signal,
    );
    for (let attempt = 0; attempt < 20 && images.length === 0; attempt += 1) {
      await new Promise((resolve) => setImmediate(resolve));
    }
    assert.equal(images.length, 1);
    assert.equal(images[0].src, "blob:controlled-hydrology");
    const aborted = assert.rejects(verifiedLoad, /abort/i);
    abortController.abort();
    await aborted;
    assert.deepEqual(images[0].removed, ["src"]);
    assert.deepEqual(revoked, ["blob:controlled-hydrology"]);

    const errorLoad = loadImage("blob:error");
    images.at(-1).dispatch("error");
    await assert.rejects(errorLoad, /Failed to load water asset/);
    assert.deepEqual(images.at(-1).removed, ["src"]);

    const successLoad = loadImage("blob:success");
    const successImage = images.at(-1);
    successImage.dispatch("load");
    assert.equal(await successLoad, successImage);
    releaseDecodedImage(successImage);
    assert.deepEqual(successImage.removed, ["src"]);
  } finally {
    if (priorImage === undefined) delete globalThis.Image;
    else globalThis.Image = priorImage;
    globalThis.fetch = priorFetch;
    URL.createObjectURL = priorCreateObjectUrl;
    URL.revokeObjectURL = priorRevokeObjectUrl;
  }
});

test("mounted water responds to reduced-motion preference changes", { concurrency: false }, () => {
  const priorDocument = globalThis.document;
  const priorRequestAnimationFrame = globalThis.requestAnimationFrame;
  const priorCancelAnimationFrame = globalThis.cancelAnimationFrame;
  const scheduled = [];
  const cancelled = [];
  let renders = 0;
  let destroyed = false;
  let invalidationHandler = null;
  globalThis.document = {
    addEventListener() {},
    hidden: false,
    removeEventListener() {},
  };
  globalThis.requestAnimationFrame = (callback) => {
    scheduled.push(callback);
    return scheduled.length;
  };
  globalThis.cancelAnimationFrame = (request) => cancelled.push(request);
  const renderer = {
    canvas: {},
    destroy: () => { destroyed = true; },
    render: () => { renders += 1; },
    setInvalidationHandler: (handler) => { invalidationHandler = handler; },
    setReduceMotion() {},
  };
  try {
    const controller = new WaterSurfaceController(renderer, { reduceMotion: true });
    controller.start();
    assert.equal(renders, 1);
    assert.equal(scheduled.length, 0);
    controller.setReduceMotion(false);
    assert.equal(scheduled.length, 1);
    controller.setReduceMotion(true);
    assert.deepEqual(cancelled, [1]);
    assert.equal(renders, 2);
    controller.destroy();
    assert.equal(destroyed, true);
    assert.equal(invalidationHandler, null);
  } finally {
    if (priorDocument === undefined) delete globalThis.document;
    else globalThis.document = priorDocument;
    if (priorRequestAnimationFrame === undefined) delete globalThis.requestAnimationFrame;
    else globalThis.requestAnimationFrame = priorRequestAnimationFrame;
    if (priorCancelAnimationFrame === undefined) delete globalThis.cancelAnimationFrame;
    else globalThis.cancelAnimationFrame = priorCancelAnimationFrame;
  }
});

test("the production hydrology builder is deterministic and monolith-free", async () => {
  const [packageJson, generator, beforeManifest] = await Promise.all([
    readFile(path.join(root, "package.json"), "utf8").then(JSON.parse),
    readFile(path.join(root, "scripts/build-ninjaone-environment-hydrology-r2.mjs"), "utf8"),
    readManifest(),
  ]);
  assert.equal(
    packageJson.scripts["build:environment-hydrology"],
    "node scripts/build-ninjaone-environment-hydrology-r2.mjs",
  );
  assert.doesNotMatch(generator, /Math\.random|Date\.now|new Date\s*\(/);
  assert.match(generator, /export async function buildNinjaOneEnvironmentHydrologyR2/);
  assert.match(generator, /ninjaone-environment-terrain-master-detail-r2\.png/);
  assert.match(generator, /const sourceDigest = sha256\(sourceBytes\)/);
  assert.match(generator, /buildRegionalTierAssets/);
  assert.match(generator, /tightOccupiedBounds/);
  assert.ok(
    generator.indexOf("await loadNativeUnionAdmission(")
      < generator.indexOf("await writeFile(outputPath, bytes)"),
    "authority validation must finish before any regional asset is replaced",
  );
  assert.doesNotMatch(generator, /runtime-close|quilt|native-detail-r2\.json/i);
  assert.doesNotMatch(generator, /ninjaone-hydrology-flow(?:-fallback)?-r2\.png/);
  const generatedPaths = [
    manifestPath,
    ...Object.values(beforeManifest.regionalFields.tiers)
      .flatMap(({ resources }) => resources.map(({ path: resourcePath }) => (
        publicAssetPath(resourcePath)
      ))),
  ];
  const beforeHashes = Object.fromEntries(await Promise.all(generatedPaths.map(async (file) => (
    [path.relative(root, file), sha256(await readFile(file))]
  ))));
  await execFileAsync(process.execPath, [
    path.join(root, "scripts/build-ninjaone-environment-hydrology-r2.mjs"),
  ], { cwd: root, windowsHide: true });
  const afterHashes = Object.fromEntries(await Promise.all(generatedPaths.map(async (file) => (
    [path.relative(root, file), sha256(await readFile(file))]
  ))));
  assert.deepEqual(afterHashes, beforeHashes);
  for (const legacyPath of [
    "public/career-world/layers/water-surface/fields/ninjaone-hydrology-flow-r2.png",
    "public/career-world/layers/water-surface/fields/ninjaone-hydrology-flow-fallback-r2.png",
  ]) {
    await assert.rejects(access(path.join(root, legacyPath)), { code: "ENOENT" });
  }
  const productionConsumers = await Promise.all([
    "features/career-world/layers/water-surface/model/assets.ts",
    "features/career-world/layers/water-surface/rendering/WaterSurfaceRenderer.ts",
    "features/career-world/layers/water-surface/rendering/shaders/common.ts",
    "features/career-world/layers/water-surface/rendering/shaders/ninjaone-streams.ts",
  ].map((file) => readFile(path.join(root, file), "utf8")));
  assert.doesNotMatch(
    productionConsumers.join("\n"),
    /ninjaone-hydrology-flow(?:-fallback)?-r2|fallbackField|manifest\.field/,
  );
});
