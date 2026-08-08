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

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(
  root,
  "public/career-world/capitals/ninjaone/environment/manifests/"
    + "hydrology-native-r2.json",
);
const nativeDetailManifestPath = path.join(
  root,
  "public/career-world/capitals/ninjaone/environment/manifests/"
    + "native-detail-r2.json",
);
const seamIntegrationManifestPath = path.join(
  root,
  "public/career-world/capitals/ninjaone/environment/manifests/"
    + "seam-integration-native-r2.json",
);

const RESOURCE_FIXTURES = Object.freeze({
  detail: Object.freeze({
    B2: Object.freeze({
      decodedBytes: 3_057_600,
      dimensions: [728, 1050],
      pngSha256: "7E5940636AABB41DF0A9399826678DC994AD1CB2AB9DDD49BBA8D032F7D08376",
      rawSha256: "F84DE3E2FBAEF89BB6347A50752BB01CDF85BA65F610F2A7422AD6148860A3F0",
      sourceBounds: [712, 1080, 1440, 2130],
    }),
    C1: Object.freeze({
      decodedBytes: 4_256_240,
      dimensions: [1282, 830],
      pngSha256: "F6414FA7E4766A5903846861CC0ACE6A80FABC211CF3DB1ADBB099E5294FAB06",
      rawSha256: "D14365A7BC9FACB52D955430AE6EBD107DF06E420CC3269CF0D46F5AF0ECB502",
      sourceBounds: [1440, 0, 2722, 830],
    }),
    C2: Object.freeze({
      decodedBytes: 2_741_760,
      dimensions: [1008, 680],
      pngSha256: "454D39955BFC82A6C9416AE98887E23DFEADED341659E41F6786026A2DDF4234",
      rawSha256: "CD87BB36E02FFEF1B98693BDBCDE0CC192B571AA45099002AA0521D638E47544",
      sourceBounds: [1440, 1480, 2448, 2160],
    }),
  }),
  fallback: Object.freeze({
    B2: Object.freeze({
      decodedBytes: 762_300,
      dimensions: [363, 525],
      pngSha256: "8024B0339ED78C48B62DEED6D4CEA44F0B845AEFC1C5AC98A40F7C5688C996B9",
      rawSha256: "0495C92F86F91A7DE0C5B1F4045D5426BF9470067D72BA7734B40F86234D8195",
      sourceBounds: [356, 540, 719, 1065],
    }),
    C1: Object.freeze({
      decodedBytes: 1_059_080,
      dimensions: [638, 415],
      pngSha256: "2127A85F4C4514D7082DEF3A607C43EB208F743CB125BD0063181351FFB5BACE",
      rawSha256: "41564F7F143B9AAE5F927E250C797B186759B6575520B8662D8B4FDCDE44CCCA",
      sourceBounds: [723, 0, 1361, 415],
    }),
    C2: Object.freeze({
      decodedBytes: 685_440,
      dimensions: [504, 340],
      pngSha256: "86104E1F833AE40AE13E21686932567D33C94BE72819ACB126291F7FB6A46A28",
      rawSha256: "D9B712F5A829F001F6BE52804A47B49BA68A4121252B043FA2E21714E7A7A2FC",
      sourceBounds: [720, 740, 1224, 1080],
    }),
  }),
});

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
    assert.equal(sha256(data), resource.metrics.rawRgbaSha256);
    const [left, top, right, bottom] = resource.sourceBounds;
    assert.deepEqual([right - left, bottom - top], resource.dimensions);
    for (let row = 0; row < info.height; row += 1) {
      for (let column = 0; column < info.width; column += 1) {
        const targetPixel = (top + row) * width + left + column;
        assert.equal(owned[targetPixel], 0, `${resource.id} overlaps another crop`);
        owned[targetPixel] = 1;
      }
      const sourceStart = row * info.width * 4;
      const targetStart = ((top + row) * width + left) * 4;
      data.copy(field, targetStart, sourceStart, sourceStart + info.width * 4);
    }
    decodedResources.push(Object.freeze({ data, info, resource }));
  }
  return Object.freeze({
    data: field,
    info: Object.freeze({ channels: 4, height, width }),
    owned,
    resources: Object.freeze(decodedResources),
  });
}

async function readRegisteredNativeSources(nativeManifest, width, height) {
  const registered = Buffer.alloc(width * height * 4);
  const scaleX = width / nativeManifest.registration.artboard[0];
  const scaleY = height / nativeManifest.registration.artboard[1];
  for (const tile of nativeManifest.tiles) {
    const sourceBytes = await readFile(path.join(root, tile.sourcePath.slice(1)));
    assert.equal(sha256(sourceBytes), tile.sourceSha256, `${tile.id} source hash drifted`);
    const tileWidth = Math.round(tile.artboardBounds.span[0] * scaleX);
    const tileHeight = Math.round(tile.artboardBounds.span[1] * scaleY);
    const originX = Math.round(tile.artboardBounds.origin[0] * scaleX);
    const originY = Math.round(tile.artboardBounds.origin[1] * scaleY);
    const { data, info } = await sharp(sourceBytes)
      .resize(tileWidth, tileHeight, { fit: "fill", kernel: "lanczos3" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    assert.deepEqual([info.width, info.height, info.channels], [tileWidth, tileHeight, 4]);
    for (let row = 0; row < tileHeight; row += 1) {
      const sourceStart = row * tileWidth * 4;
      const targetStart = ((originY + row) * width + originX) * 4;
      data.copy(registered, targetStart, sourceStart, sourceStart + tileWidth * 4);
    }
  }
  return registered;
}

function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function smoothstep(edge0, edge1, value) {
  const amount = clamp((value - edge0) / Math.max(edge1 - edge0, 1e-9));
  return amount * amount * (3 - 2 * amount);
}

function nativeWaterEvidence(red, green, blue, alpha) {
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
  const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
  const coolNeutral = Math.min(
    smoothstep(-10, 8, blue - red),
    smoothstep(-14, 4, green - red),
  );
  return Math.max(coolDark, coolBright, smoothstep(105, 210, luminance) * coolNeutral);
}

function stylePixelCounts(field, styleCodes) {
  const counts = Object.fromEntries(Object.keys(styleCodes).map((name) => [name, 0]));
  const names = new Map(Object.entries(styleCodes).map(([name, code]) => [code, name]));
  let water = 0;
  let directional = 0;
  for (let offset = 0; offset < field.length; offset += 4) {
    if (field[offset] === 0) continue;
    water += 1;
    const name = names.get(field[offset + 3]);
    assert.ok(name, `unknown style code ${field[offset + 3]}`);
    counts[name] += 1;
    const flowX = (field[offset + 1] - 128) / 127;
    const flowY = (field[offset + 2] - 128) / 127;
    if (Math.hypot(flowX, flowY) > 0.1) directional += 1;
  }
  return { counts, directional, water };
}

function measureCheckpoint(field, info, manifest, checkpoint) {
  const [originX, originY] = checkpoint.origin;
  const [spanX, spanY] = checkpoint.span;
  const left = Math.max(0, Math.floor((originX - 0.125) / 0.25 * info.width));
  const right = Math.min(info.width, Math.ceil((originX + spanX - 0.125) / 0.25 * info.width));
  const top = Math.max(0, Math.floor(originY / (1 / 3) * info.height));
  const bottom = Math.min(info.height, Math.ceil((originY + spanY) / (1 / 3) * info.height));
  const styleNameByCode = new Map(
    Object.entries(manifest.styleCodes).map(([name, code]) => [code, name]),
  );
  const styles = {};
  let waterPixels = 0;
  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      const offset = (y * info.width + x) * 4;
      if (field[offset] === 0) continue;
      waterPixels += 1;
      const styleName = styleNameByCode.get(field[offset + 3]);
      assert.ok(styleName);
      styles[styleName] = (styles[styleName] ?? 0) + 1;
    }
  }
  return { styles, waterPixels };
}

function pearsonCorrelation(pairs) {
  if (pairs.length < 200) return null;
  let sumA = 0;
  let sumB = 0;
  let sumAA = 0;
  let sumBB = 0;
  let sumAB = 0;
  for (const [a, b] of pairs) {
    sumA += a;
    sumB += b;
    sumAA += a * a;
    sumBB += b * b;
    sumAB += a * b;
  }
  const count = pairs.length;
  const covariance = sumAB - sumA * sumB / count;
  const varianceA = sumAA - sumA * sumA / count;
  const varianceB = sumBB - sumB * sumB / count;
  return covariance / Math.sqrt(varianceA * varianceB);
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

test("regional NinjaOne hydrology is losslessly packed from all native originals", async () => {
  const [manifest, nativeManifestBytes, seamManifestBytes] = await Promise.all([
    readManifest(),
    readFile(nativeDetailManifestPath),
    readFile(seamIntegrationManifestPath),
  ]);
  const nativeManifest = JSON.parse(nativeManifestBytes);
  const seamManifest = JSON.parse(seamManifestBytes);
  assert.equal(manifest.schemaVersion, 3);
  assert.equal(manifest.id, "career-world/capitals/ninjaone/hydrology-native@r2");
  assert.equal(manifest.packingRevision, "regional-r3");
  assert.equal(manifest.source.authority, "native-original-tiles");
  assert.equal(manifest.source.manifestSha256, sha256(nativeManifestBytes));
  assert.match(manifest.source.role, /static topology only/);
  assert.equal(manifest.source.tileCount, 12);
  assert.equal(nativeManifest.tiles.length, 12);
  assert.deepEqual(nativeManifest.registration.artboard, [1440, 1080]);
  assert.deepEqual(nativeManifest.registration.runtimeTileDimensions, [1448, 1086]);
  assert.deepEqual(nativeManifest.registration.tileArtboard, [360, 270]);
  const sourceById = new Map(manifest.source.tiles.map((tile) => [tile.id, tile]));
  for (const nativeTile of nativeManifest.tiles) {
    const source = sourceById.get(nativeTile.id);
    assert.ok(source, `${nativeTile.id} missing from hydrology provenance`);
    assert.deepEqual(source.artboardBounds, nativeTile.artboardBounds);
    assert.deepEqual(source.dimensions, nativeTile.sourceDimensions);
    assert.equal(source.path, nativeTile.sourcePath);
    assert.equal(source.sha256, nativeTile.sourceSha256);
    assert.match(source.path, /detail-tiles-r2\/generated\/r[0-3]-c[0-3]-generated-r2\.png$/);
    assert.doesNotMatch(source.path, /close-native|runtime-close|terrain-master|quilt/i);
    assert.equal(sha256(await readFile(path.join(root, source.path.slice(1)))), source.sha256);
  }

  assert.deepEqual(manifest.registration.gridCells, ["B2", "C1", "C2"]);
  assert.deepEqual(manifest.registration.artboardDimensions, [1440, 1080]);
  assert.deepEqual(manifest.registration.maximumCloseCameraSpan, [0.075, 0.075]);
  assert.equal(manifest.registration.maximumMountedRegions, 2);
  assert.deepEqual(manifest.registration.worldOrigin, [0.125, 0]);
  assert.deepEqual(manifest.registration.worldSpan, [0.25, 1 / 3]);
  assert.deepEqual(manifest.regionalFields.channelEncoding, {
    r: "time-invariant registered water coverage",
    g: "signed unit downhill flow x encoded as 128 + value * 127",
    b: "signed unit downhill flow y encoded as 128 + value * 127",
    a: "hydrology style code",
  });
  assert.deepEqual(manifest.regionalFields.cohortPolicy, {
    atomic: true,
    maximumMountedRegions: 2,
    mixedTierAllowed: false,
    sampling: "global-coordinate manual bilinear texelFetch with virtual-zero exterior",
    tierOrder: ["detail", "fallback"],
  });
  assert.deepEqual(
    manifest.regionalFields.possibleCohorts.map(({ regionIds }) => regionIds),
    [[], ["B2"], ["C1"], ["C2"], ["B2", "C1"], ["B2", "C2"]],
  );

  for (const tierId of ["detail", "fallback"]) {
    const tier = manifest.regionalFields.tiers[tierId];
    const fixtures = RESOURCE_FIXTURES[tierId];
    assert.equal(tier.resources.length, 3);
    assert.deepEqual(tier.resources.map(({ regionId }) => regionId), ["B2", "C1", "C2"]);
    assert.equal(
      tier.decodedBytes,
      Object.values(fixtures).reduce((sum, fixture) => sum + fixture.decodedBytes, 0),
    );
    for (const resource of tier.resources) {
      const fixture = fixtures[resource.regionId];
      assert.deepEqual(resource.dimensions, fixture.dimensions);
      assert.deepEqual(resource.sourceBounds, fixture.sourceBounds);
      assert.equal(resource.decodedBytes, fixture.decodedBytes);
      assert.equal(resource.sha256, fixture.pngSha256);
      assert.equal(resource.metrics.rawRgbaSha256, fixture.rawSha256);
      assert.equal(resource.id, `ninjaone-hydrology-${resource.regionId.toLowerCase()}-${tierId}-r3`);
      assert.match(resource.path, new RegExp(
        `/career-world/layers/water-surface/fields/${resource.id}\\.png\\?v=`
          + resource.sha256.slice(0, 12).toLowerCase(),
      ));
      assert.equal(sha256(await readFile(publicAssetPath(resource.path))), resource.sha256);
    }
  }
  assert.equal(
    manifest.regionalFields.tiers.detail.maximumSteadyCohortDecodedBytes,
    7_313_840,
  );
  assert.equal(
    manifest.regionalFields.tiers.fallback.maximumSteadyCohortDecodedBytes,
    1_821_380,
  );
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
    assert.ok(seamManifest.resources.some(({ id }) => id === handoff.seamResourceId));
  }
  assert.deepEqual(
    [...new Set(manifest.segments.flatMap(({ cellIds }) => cellIds))].sort(),
    ["B2", "C1", "C2"],
  );
  for (const kind of ["tarn", "waterfall-lip", "waterfall", "impact", "coast"]) {
    assert.ok(manifest.segments.some((segment) => segment.kind === kind));
  }
  assert.ok(manifest.segments.every(({ id }) => manifest.metrics.segmentPixels[id] > 0));
  assert.ok(manifest.segments.every(({ maskPolicy }) => maskPolicy.includes("native-original")));
});

test("regional fields reconstruct static source-clipped masks and checkpoint topology", async () => {
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
  const measured = stylePixelCounts(detail.data, manifest.styleCodes);
  assert.equal(measured.water, manifest.metrics.waterPixels);
  assert.equal(measured.directional, manifest.metrics.directionalPixels);
  assert.deepEqual(measured.counts, manifest.metrics.stylePixels);
  assert.equal(
    detail.resources.reduce((sum, entry) => (
      sum + entry.resource.metrics.coveragePixels
    ), 0),
    measured.water,
  );
  const nativeManifest = JSON.parse(await readFile(nativeDetailManifestPath, "utf8"));
  const nativeSources = await readRegisteredNativeSources(
    nativeManifest,
    detail.info.width,
    detail.info.height,
  );
  let tarnPixels = 0;
  const directionalVectors = new Set();
  for (let offset = 0; offset < detail.data.length; offset += 4) {
    if (detail.data[offset] === 0) continue;
    assert.equal(detail.data[offset], 255);
    assert.equal(nativeSources[offset + 3], 255, "field may not leave a native source tile");
    assert.ok(nativeWaterEvidence(
      nativeSources[offset],
      nativeSources[offset + 1],
      nativeSources[offset + 2],
      nativeSources[offset + 3],
    ) >= 0.035, "field may not animate pixels without native water/foam evidence");
    const flowX = (detail.data[offset + 1] - 128) / 127;
    const flowY = (detail.data[offset + 2] - 128) / 127;
    if (detail.data[offset + 3] === manifest.styleCodes.tarn) {
      tarnPixels += 1;
      assert.ok(Math.hypot(flowX, flowY) < 0.02);
    } else {
      assert.ok(Math.hypot(flowX, flowY) > 0.94);
      assert.ok(flowX >= 0);
      assert.ok(flowY > 0.05);
      directionalVectors.add(`${detail.data[offset + 1]}:${detail.data[offset + 2]}`);
    }
  }
  assert.equal(tarnPixels, manifest.metrics.stylePixels.tarn);
  assert.ok(directionalVectors.size > 40);
  let maximumAdjacentFlowTurn = 0;
  let sameStyleDirectionalEdges = 0;
  for (let y = 0; y < detail.info.height; y += 1) {
    for (let x = 0; x < detail.info.width; x += 1) {
      const offset = (y * detail.info.width + x) * 4;
      if (detail.data[offset] === 0) continue;
      for (const [dx, dy] of [[1, 0], [0, 1]]) {
        const neighborX = x + dx;
        const neighborY = y + dy;
        if (neighborX >= detail.info.width || neighborY >= detail.info.height) continue;
        const neighborOffset = (neighborY * detail.info.width + neighborX) * 4;
        if (
          detail.data[neighborOffset] === 0
          || detail.data[neighborOffset + 3] !== detail.data[offset + 3]
        ) continue;
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
        sameStyleDirectionalEdges += 1;
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
  assert.ok(sameStyleDirectionalEdges > 150_000);
  assert.ok(
    maximumAdjacentFlowTurn < 0.3,
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
      if (fallback.data[fallbackOffset] > 0) fallbackWaterPixels += 1;
    }
  }
  assert.equal(fallbackWaterPixels, manifest.regionalFields.tiers.fallback.occupiedPixels);

  const fixedCheckpoints = Object.freeze({
    B2: Object.freeze({ origin: [0.1675, 0.23], span: [0.04, 0.04] }),
    C1: Object.freeze({ origin: [0.2925, 1 / 12 - 0.02], span: [0.04, 0.04] }),
    C2: Object.freeze({ origin: [0.2925, 0.23], span: [0.04, 0.04] }),
  });
  assert.deepEqual(
    Object.fromEntries(Object.entries(fixedCheckpoints).map(([id, checkpoint]) => [
      id,
      measureCheckpoint(detail.data, detail.info, manifest, checkpoint),
    ])),
    {
      B2: { styles: {}, waterPixels: 0 },
      C1: { styles: { coast: 13479, stream: 128 }, waterPixels: 13607 },
      C2: { styles: { stream: 6, turbulence: 332 }, waterPixels: 338 },
    },
  );
  const featureCheckpoints = Object.freeze({
    B2_fall: Object.freeze({ origin: [0.2195833333, 0.1883333333], span: [0.025, 0.035] }),
    B2_tarn: Object.freeze({ origin: [0.2102083333, 0.1701234568], span: [0.04, 0.04] }),
    C1_coast: Object.freeze({ origin: [0.3168055556, 0.0355555556], span: [0.04, 0.04] }),
    C1_fall: Object.freeze({ origin: [0.2638541667, 0.092654321], span: [0.04, 0.04] }),
    C2_fall: Object.freeze({ origin: [0.2317361111, 0.2161111111], span: [0.025, 0.035] }),
    C2_stream: Object.freeze({ origin: [0.276875, 0.2500617284], span: [0.04, 0.04] }),
  });
  assert.deepEqual(
    Object.fromEntries(Object.entries(featureCheckpoints).map(([id, checkpoint]) => [
      id,
      measureCheckpoint(detail.data, detail.info, manifest, checkpoint),
    ])),
    {
      B2_fall: {
        styles: { impact: 1233, lip: 310, stream: 496, tarn: 6860, waterfall: 120 },
        waterPixels: 9019,
      },
      B2_tarn: {
        styles: { impact: 391, lip: 310, stream: 1119, tarn: 14148, waterfall: 120 },
        waterPixels: 16088,
      },
      C1_coast: { styles: { coast: 22320, stream: 94 }, waterPixels: 22414 },
      C1_fall: {
        styles: { coast: 4857, impact: 1940, lip: 769, waterfall: 676 },
        waterPixels: 8242,
      },
      C2_fall: {
        styles: { impact: 1292, lip: 258, stream: 1086, waterfall: 43 },
        waterPixels: 2679,
      },
      C2_stream: { styles: { stream: 1871, turbulence: 1010 }, waterPixels: 2881 },
    },
  );
  const observationalBaseline = Object.freeze({
    classification: "observational-only-superseded-source",
    changedPixelsAcross1p3Seconds: 0,
    origin: [0.28611056, 0.2189284007],
    span: [0.04, 0.04],
  });
  assert.notDeepEqual(observationalBaseline.origin, fixedCheckpoints.C2.origin);
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
  assert.deepEqual([right - left, bottom - top], b2.resource.dimensions);
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
    /vec2 streamPixels = streamUv \* u_ninjaOneStreamArtboardDimensions;/,
  );
  assert.match(WATER_SHADER_NINJAONE_STREAMS, /texelFetch\(u_ninjaOneStreamFlow0/);
  assert.match(WATER_SHADER_NINJAONE_STREAMS, /texelFetch\(u_ninjaOneStreamFlow1/);
  assert.match(WATER_SHADER_NINJAONE_STREAMS, /return vec4\(0\.0\);/);
  assert.match(
    WATER_SHADER_NINJAONE_STREAMS,
    /ninjaOneSampleRegion0\(fullTexelCoordinate\)[\s\S]*ninjaOneSampleRegion1\(fullTexelCoordinate\)/,
  );
  assert.doesNotMatch(
    WATER_SHADER_NINJAONE_STREAMS,
    /texture\(u_ninjaOneStreamFlow[01]/,
    "cropped numeric fields must not use hardware CLAMP+LINEAR sampling",
  );
});

test("decoded local flow produces directionally displaced C2 phase", async () => {
  const manifest = await readManifest();
  const { data: field, info } = await readRegionalTier(manifest, "detail");
  const points = [];
  for (let y = 1600; y < 1840; y += 1) {
    for (let x = 1820; x < 2110; x += 1) {
      const offset = (y * info.width + x) * 4;
      const style = field[offset + 3];
      if (
        field[offset] === 0
        || (style !== manifest.styleCodes.stream
          && style !== manifest.styleCodes.turbulence)
      ) continue;
      const flowX = (field[offset + 1] - 128) / 127;
      const flowY = (field[offset + 2] - 128) / 127;
      const length = Math.hypot(flowX, flowY);
      if (length <= 0.1) continue;
      points.push({ flowX: flowX / length, flowY: flowY / length, style, x, y });
    }
  }
  assert.ok(points.length > 1_500);
  const pointMap = new Map(points.map((point) => [point.y * info.width + point.x, point]));
  const fract = (value) => value - Math.floor(value);
  const mix = (start, end, amount) => start * (1 - amount) + end * amount;
  const pattern = (x, y) => (
    Math.sin(x * 6.1 + y * 3.7)
    + Math.sin(x * 2.9 - y * 5.3 + 1.2) * 0.61
    + Math.cos(x * 8.3 + y * 1.7) * 0.27
  );
  const signal = (point, elapsedSeconds) => {
    const turbulence = point.style === manifest.styleCodes.turbulence;
    const rate = turbulence ? 0.92 : 0.68;
    const advance = turbulence ? 0.38 : 0.26;
    const progress = elapsedSeconds * rate;
    const phaseA = fract(progress);
    const phaseB = fract(progress + 0.5);
    const blend = Math.abs(phaseA * 2 - 1);
    const baseX = point.x / 2 * 0.021;
    const baseY = point.y / 2 * 0.021;
    const sampleAt = (phase) => pattern(
      baseX - point.flowX * phase * advance,
      baseY - point.flowY * phase * advance,
    );
    return mix(sampleAt(phaseB), sampleAt(phaseA), blend);
  };
  for (const point of points) {
    const maximumAdvance = point.style === manifest.styleCodes.turbulence ? 0.38 : 0.26;
    assert.ok(Math.hypot(point.flowX, point.flowY) * maximumAdvance <= 0.381);
  }
  const correlationAt = (dx, dy) => {
    const pairs = [];
    for (const point of points) {
      const shifted = pointMap.get((point.y + dy) * info.width + point.x + dx);
      if (shifted) pairs.push([signal(point, 0), signal(shifted, 0.22)]);
    }
    return pearsonCorrelation(pairs);
  };
  const meanFlow = points.reduce((sum, point) => [
    sum[0] + point.flowX / points.length,
    sum[1] + point.flowY / points.length,
  ], [0, 0]);
  const zeroShift = correlationAt(0, 0);
  let best = { correlation: -1, dx: 0, dy: 0 };
  for (let dy = -12; dy <= 12; dy += 1) {
    for (let dx = -12; dx <= 12; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const length = Math.hypot(dx, dy);
      const alignment = (dx * meanFlow[0] + dy * meanFlow[1]) / length;
      if (alignment < 0.8) continue;
      const correlation = correlationAt(dx, dy);
      if (correlation !== null && correlation > best.correlation) {
        best = { correlation, dx, dy };
      }
    }
  }
  assert.ok(zeroShift !== null);
  assert.ok(best.dx * meanFlow[0] + best.dy * meanFlow[1] > 0);
  assert.ok(
    best.correlation > zeroShift + 0.2,
    `directional ${JSON.stringify(best)} did not beat zero shift ${zeroShift}`,
  );
});

test("hydrology GLSL keeps outer alpha static and implements every water stage", () => {
  assert.match(WATER_SHADER_NINJAONE_STREAMS, /vec2 encodedFlow = encoded\.gb \/ max\(coverage/);
  assert.match(WATER_SHADER_NINJAONE_STREAMS, /phaseBaseUv - flow \* flowPhaseA \* phaseAdvance/);
  assert.match(WATER_SHADER_NINJAONE_STREAMS, /materialBaseUv - flow \* flowPhaseA \* materialAdvance/);
  assert.match(WATER_SHADER_NINJAONE_STREAMS, /float flowPhaseBlend = abs\(flowPhaseA \* 2\.0 - 1\.0\)/);
  assert.doesNotMatch(WATER_SHADER_NINJAONE_STREAMS, /downhillAxis|vec2\(0\.68, 0\.73\)/);
  assert.doesNotMatch(WATER_SHADER_NINJAONE_STREAMS, /materialTime/);
  assert.equal(
    [...WATER_SHADER_NINJAONE_STREAMS.matchAll(
      /sampleWaterBodyAtTime\([\s\S]*?\n\s*0\.0\n\s*\)/g,
    )].length,
    2,
  );
  for (const stage of [
    "tarnPhase",
    "lipAcceleration",
    "fallingSheet",
    "impactFoam",
    "downstreamTurbulence",
    "coastalFoam",
  ]) assert.match(WATER_SHADER_NINJAONE_STREAMS, new RegExp(`float ${stage} =`));
  assert.match(WATER_SHADER_NINJAONE_STREAMS, /float mist = impact/);
  const alphaBlock = WATER_SHADER_NINJAONE_STREAMS.match(
    /result\.alpha = mask \* u_ninjaOneHydrologyOpacity \* \(([\s\S]*?)\);\s+return result;/,
  );
  assert.ok(alphaBlock);
  assert.doesNotMatch(alphaBlock[1], /time|sin|heightSample|foam|mist/);
});

test("foreground hydrology excludes global ocean alpha above native terrain", async () => {
  const [fragmentShader, commonShader] = await Promise.all([
    readFile(path.join(
      root,
      "features/career-world/layers/water-surface/rendering/shaders/fragment.ts",
    ), "utf8"),
    readFile(path.join(
      root,
      "features/career-world/layers/water-surface/rendering/shaders/common.ts",
    ), "utf8"),
  ]);
  assert.match(commonShader, /uniform float u_foregroundHydrology;/);
  assert.match(
    fragmentShader,
    /float registeredForegroundVisibility = max\(coast\.overlayAlpha, stream\.alpha\);/,
  );
  const visibilityBlock = fragmentShader.match(
    /float visibility = mix\(([\s\S]*?),\s*u_foregroundHydrology\s*\);/,
  );
  assert.ok(visibilityBlock);
  assert.match(visibilityBlock[1], /globalVisibility/);
  assert.match(visibilityBlock[1], /registeredForegroundVisibility/);
  const registeredVisibility = fragmentShader.match(
    /float registeredForegroundVisibility = ([^;]+);/,
  );
  assert.ok(registeredVisibility);
  assert.doesNotMatch(registeredVisibility[1], /waterVisibility|globalVisibility/);
  assert.match(fragmentShader, /u_opacity \* visibility/);
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
  assert.equal(c1Detail.decodedBytes, 4_256_240);

  const denseCamera = Object.freeze({
    origin: [0.18151041666666667, 0.10987654320987653],
    span: [0.075, 0.075],
  });
  const denseSnapshot = makeSnapshot({
    camera: denseCamera,
    decodedBytes: 28_000_000,
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
  assert.equal(denseFallback.decodedBytes, 1_821_380);
  assert.equal(denseFallback.nativeUnionSteadyBytes, 29_821_380);
  assert.ok(denseFallback.nativeUnionSteadyBytes <= 33_554_432);

  const capabilityFallback = planRegionalHydrologyCohort({
    camera: c1Camera,
    currentResources: [],
    detailResources,
    fallbackResources,
    maximumDecodedBytes: 33_554_432,
    maximumMountedRegions: 2,
    maximumTextureSize: 1_000,
    minimumSnapshotEpoch: 0,
    regions,
    snapshot: c1Snapshot,
  });
  assert.equal(capabilityFallback.tier, "fallback");
  assert.equal(capabilityFallback.decodedBytes, 1_059_080);

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
    decodedBytes: 27_000_000,
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
  assert.equal(transitionPlan.tier, "fallback");
  assert.equal(transitionPlan.incomingDecodedBytes, 1_821_380);
  assert.equal(
    transitionPlan.nativeUnionTransitionBytes,
    27_000_000 + 4_256_240 + 1_821_380,
  );
  assert.ok(transitionPlan.nativeUnionTransitionBytes <= 33_554_432);

  const evictionSnapshot = makeSnapshot({
    camera: denseCamera,
    decodedBytes: 30_000_000,
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
  assert.equal(admittedAfterEviction.nativeUnionSteadyBytes, 31_821_380);

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
      selectedSets.add(selectRegionalHydrologyRegionIds(camera, regions).join("+"));
    }
  }
  assert.deepEqual(
    [...selectedSets].sort(),
    ["", "B2", "B2+C1", "B2+C2", "C1", "C2"],
  );
  assert.ok(740 - 415 > artboardSpan[1], "C1/C2 vertical gap must exceed max view height");
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
  assert.match(renderer, /this\.hydrologyLoadToken\.requestEpoch !== token\.requestEpoch/);
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
  assert.match(generator, /native-detail-r2\.json/);
  assert.match(generator, /detail-tiles-r2\/generated/);
  assert.match(generator, /sourceDigest !== tile\.sourceSha256/);
  assert.match(generator, /buildRegionalTierAssets/);
  assert.match(generator, /tightOccupiedBounds/);
  assert.ok(
    generator.indexOf("await loadNativeUnionAdmission(")
      < generator.indexOf("await writeFile(outputPath, bytes)"),
    "authority validation must finish before any regional asset is replaced",
  );
  assert.doesNotMatch(generator, /terrain-master|runtime-close|quilt/i);
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
