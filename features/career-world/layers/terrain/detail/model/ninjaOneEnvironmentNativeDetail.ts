import manifest from "../../../../../../public/career-world/capitals/ninjaone/environment/manifests/native-detail-r2.json" with { type: "json" };
import type { CameraView, Pair } from "../../../../shared/camera";

export type NinjaOneEnvironmentNativeAnimation =
  | "canopy-sway"
  | "coast-foam"
  | "stream-flow"
  | "tarn-ripple"
  | "waterfall-flow";

export interface NinjaOneEnvironmentNativeResource {
  readonly dimensions: Pair;
  readonly id: string;
  readonly opaquePixels: number;
  readonly path: string;
}

export interface NinjaOneEnvironmentNativeInstance {
  readonly animation: NinjaOneEnvironmentNativeAnimation;
  readonly artboardBounds: CameraView;
  readonly flowVector?: Pair;
  readonly id: string;
  readonly phaseSeconds: number;
  readonly resource: NinjaOneEnvironmentNativeResource;
  readonly tileId: string;
}

export interface NinjaOneEnvironmentNativeTile {
  readonly artboardBounds: CameraView;
  readonly column: number;
  readonly decodedBytes: number;
  readonly decodedRgbSha256: string;
  readonly dimensions: Pair;
  readonly id: string;
  readonly path: string;
  readonly row: number;
  readonly sha256: string;
  readonly sourceCrop: readonly [number, number, number, number];
  readonly sourceDimensions: Pair;
  readonly sourcePath: string;
  readonly sourceSha256: string;
  readonly voidMask?: NinjaOneEnvironmentNativeVoidMask;
  readonly voidMaskId: string | null;
}

export interface NinjaOneEnvironmentNativeVoidMask {
  readonly boundaryPixels: number;
  readonly boundaryPixelsExceedingCompositeLuminanceDrop: 0;
  readonly boundaryPixelsExceedingRenderedColorDelta: 0;
  readonly contourCoveragePixelsByDistance: Pair;
  readonly dimensions: Pair;
  readonly falloffPixels: number;
  readonly falloffPixelsByDistance: Pair;
  readonly featheredPixels: number;
  readonly fullyOpaqueBoundaryPixels: 0;
  readonly fullyOpaqueFalloffPixelsByDistance: readonly [0, 0];
  readonly id: string;
  readonly interiorNearBlackPixels: number;
  readonly maximumAlphaByDistance: Pair;
  readonly maximumBoundaryCompositeLuminanceDrop256: number;
  readonly maximumContourCoverageAlphaByDistance: Pair;
  readonly maximumPartialAlpha: number;
  readonly maximumPartialCompositeLuminanceDrop256: number;
  readonly maximumRenderedChannelDeltaByDistance: Pair;
  readonly maximumRenderedOklabDeltaMilliByDistance: Pair;
  readonly minimumAlphaByDistance: Pair;
  readonly minimumContourCoverageAlphaByDistance: Pair;
  readonly minimumPartialAlpha: number;
  readonly path: string;
  readonly partialPixelsAtOrBelowNearBlackMaximumRgb: number;
  readonly partialContourCoveragePixelsByDistance: Pair;
  readonly runtimeDecodedBytes: 0;
  readonly runtimeMounted: false;
  readonly sha256: string;
  readonly sourceCrop: readonly [number, number, number, number];
  readonly sourceDimensions: Pair;
  readonly sourcePath: string;
  readonly sourceSha256: string;
  readonly storageFormat: "png-grayscale-8";
  readonly tileId: string;
  readonly transparentFalloffPixels: number;
  readonly voidPixels: number;
}

interface RawBounds {
  readonly origin: readonly number[];
  readonly span: readonly number[];
}

interface RawTile {
  readonly artboardBounds: RawBounds;
  readonly column: number;
  readonly decodedBytes: number;
  readonly decodedRgbSha256: string;
  readonly dimensions: readonly number[];
  readonly id: string;
  readonly path: string;
  readonly row: number;
  readonly sha256: string;
  readonly sourceCrop: readonly number[];
  readonly sourceDimensions: readonly number[];
  readonly sourcePath: string;
  readonly sourceSha256: string;
  readonly voidMaskId: string | null;
}

interface RawVoidMask {
  readonly boundaryPixels: number;
  readonly boundaryPixelsExceedingCompositeLuminanceDrop: number;
  readonly boundaryPixelsExceedingRenderedColorDelta: number;
  readonly contourCoveragePixelsByDistance: readonly number[];
  readonly dimensions: readonly number[];
  readonly falloffPixels: number;
  readonly falloffPixelsByDistance: readonly number[];
  readonly featheredPixels: number;
  readonly fullyOpaqueBoundaryPixels: number;
  readonly fullyOpaqueFalloffPixelsByDistance: readonly number[];
  readonly id: string;
  readonly interiorNearBlackPixels: number;
  readonly maximumAlphaByDistance: readonly number[];
  readonly maximumBoundaryCompositeLuminanceDrop256: number;
  readonly maximumContourCoverageAlphaByDistance: readonly number[];
  readonly maximumPartialAlpha: number;
  readonly maximumPartialCompositeLuminanceDrop256: number;
  readonly maximumRenderedChannelDeltaByDistance: readonly number[];
  readonly maximumRenderedOklabDeltaMilliByDistance: readonly number[];
  readonly minimumAlphaByDistance: readonly number[];
  readonly minimumContourCoverageAlphaByDistance: readonly number[];
  readonly minimumPartialAlpha: number;
  readonly path: string;
  readonly partialPixelsAtOrBelowNearBlackMaximumRgb: number;
  readonly partialContourCoveragePixelsByDistance: readonly number[];
  readonly runtimeDecodedBytes: number;
  readonly runtimeMounted: boolean;
  readonly sha256: string;
  readonly sourceCrop: readonly number[];
  readonly sourceDimensions: readonly number[];
  readonly sourcePath: string;
  readonly sourceSha256: string;
  readonly storageFormat: string;
  readonly tileId: string;
  readonly transparentFalloffPixels: number;
  readonly voidPixels: number;
}

const EXPECTED_ID = "career-world/capitals/ninjaone/native-detail@r2";
const EXPECTED_SOURCE_PREFIX =
  "/art-source/career-world/ninjaone-environment/production-r2/detail-tiles-r2/generated/";
const EXPECTED_SOURCE_DIMENSIONS = Object.freeze([1448, 1086] as Pair);
const EXPECTED_TILE_DECODED_BYTES = 1448 * 1086 * 4;
const EXPECTED_VOID_MASK_DISTANCE_ALPHA_CEILINGS = Object.freeze([192, 240] as Pair);
const EXPECTED_VOID_MASK_CHANNEL_DELTA_LIMITS = Object.freeze([12, 24] as Pair);
const EXPECTED_VOID_MASK_OKLAB_DELTA_MILLI_LIMITS = Object.freeze([25, 50] as Pair);
const EXPECTED_TILE_IDS = Object.freeze([
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
] as const);
const EXPECTED_VOID_MASK_TILE_IDS = Object.freeze([
  "r0-c2",
  "r0-c3",
  "r1-c2",
  "r1-c3",
] as const);
const ENVIRONMENT_WORLD_ORIGIN = Object.freeze([0.125, 0] as Pair);
const ENVIRONMENT_WORLD_SPAN = Object.freeze([0.125, 1 / 6] as Pair);

function finitePair(values: readonly number[], label: string): Pair {
  if (values.length !== 2 || values.some((value) => !Number.isFinite(value))) {
    throw new TypeError(`${label} must contain two finite values.`);
  }
  return Object.freeze([values[0], values[1]] as Pair);
}

function finiteIntegerPair(values: readonly number[], label: string): Pair {
  if (
    values.length !== 2
    || values.some((value) => !Number.isInteger(value))
  ) {
    throw new TypeError(`${label} must contain two finite integers.`);
  }
  return Object.freeze([values[0], values[1]] as Pair);
}

function finiteIntegerQuad(
  values: readonly number[],
  label: string,
): readonly [number, number, number, number] {
  if (
    values.length !== 4
    || values.some((value) => !Number.isInteger(value))
  ) {
    throw new TypeError(`${label} must contain four finite integers.`);
  }
  return Object.freeze([values[0], values[1], values[2], values[3]]);
}

function bounds(value: RawBounds, label: string): CameraView {
  const origin = finitePair(value.origin, `${label}.origin`);
  const span = finitePair(value.span, `${label}.span`);
  if (span.some((entry) => entry <= 0)) {
    throw new RangeError(`${label}.span must be positive.`);
  }
  return Object.freeze({ origin, span });
}

function isSha256(value: string): boolean {
  return /^[A-F0-9]{64}$/.test(value);
}

const registrationArtboard = finitePair(
  manifest.registration.artboard,
  "registration.artboard",
);
const registrationGrid = finitePair(manifest.registration.grid, "registration.grid");
const runtimeTileDimensions = finitePair(
  manifest.registration.runtimeTileDimensions,
  "registration.runtimeTileDimensions",
);
const tileArtboard = finitePair(
  manifest.registration.tileArtboard,
  "registration.tileArtboard",
);

if (
  manifest.schemaVersion !== 1
  || manifest.id !== EXPECTED_ID
  || manifest.status !== "accepted-close-detail"
  || manifest.layers.dynamicShadows.enabled
  || registrationArtboard.join(",") !== "1440,1080"
  || registrationGrid.join(",") !== "4,4"
  || runtimeTileDimensions.join(",") !== "1448,1086"
  || tileArtboard.join(",") !== "360,270"
  || manifest.budgets.maximumMountedTerrainTiles !== 4
  || manifest.budgets.maximumMountedVoidMasks !== 0
  || manifest.budgets.maximumAnimatedNodes !== 6
  || manifest.tiles.length !== EXPECTED_TILE_IDS.length
  || manifest.voidMasks.integration !== "baked-runtime-alpha"
  || manifest.voidMasks.derivation.alphaRamp
    !== "distance-graded-rendered-ocean-color-cap-v4"
  || manifest.voidMasks.derivation.connectivity !== 4
  || manifest.voidMasks.derivation.contourAntialiasing
    !== "tent-3x3-land-occupancy-alpha-downsample-v1"
  || manifest.voidMasks.derivation.contourKernel.join(",") !== "1,2,1"
  || manifest.voidMasks.derivation.distanceAlphaCeilings.join(",") !== "192,240"
  || manifest.voidMasks.derivation.landSideFalloffConnectivity !== 8
  || manifest.voidMasks.derivation.landSideFalloffWidthPixels !== 2
  || manifest.voidMasks.derivation.luminanceWeights256.join(",") !== "54,183,19"
  || manifest.voidMasks.derivation.maximumCompositeLuminanceDrop !== 4
  || manifest.voidMasks.derivation.maximumRenderedChannelDeltaByDistance.join(",")
    !== "12,24"
  || manifest.voidMasks.derivation.maximumRenderedOklabDeltaMilliByDistance.join(",")
    !== "25,50"
  || manifest.voidMasks.derivation.minimumLandSideAlpha !== 1
  || manifest.voidMasks.derivation.nearBlackMaximumRgb !== 16
  || manifest.voidMasks.derivation.opaqueAtMaximumRgb !== 64
  || manifest.voidMasks.derivation.perceptualColorSpace !== "oklab-euclidean"
  || manifest.voidMasks.derivation.representativeOceanRgb.join(",") !== "32,82,96"
  || manifest.voidMasks.derivation.seed !== "all-source-edges"
  || manifest.voidMasks.resources.length !== EXPECTED_VOID_MASK_TILE_IDS.length
) {
  throw new TypeError("NinjaOne native environment detail contract is invalid.");
}

export const NINJAONE_ENVIRONMENT_NATIVE_DETAIL_ID = EXPECTED_ID;
export const NINJAONE_ENVIRONMENT_NATIVE_MAX_ANIMATED_NODES =
  manifest.budgets.maximumAnimatedNodes;
export const NINJAONE_ENVIRONMENT_NATIVE_MAX_DECODED_BYTES =
  manifest.budgets.maximumDecodedBytes;
export const NINJAONE_ENVIRONMENT_NATIVE_MAX_MOUNTED_TILES =
  manifest.budgets.maximumMountedTerrainTiles;
export const NINJAONE_ENVIRONMENT_NATIVE_MAX_MOUNTED_VOID_MASKS =
  manifest.budgets.maximumMountedVoidMasks;

const voidMaskMap = new Map<string, NinjaOneEnvironmentNativeVoidMask>();
for (const value of manifest.voidMasks.resources as readonly RawVoidMask[]) {
  const dimensions = finitePair(
    value.dimensions,
    `voidMasks.resources.${value.id}.dimensions`,
  );
  const sourceCrop = finiteIntegerQuad(
    value.sourceCrop,
    `voidMasks.resources.${value.id}.sourceCrop`,
  );
  const sourceDimensions = finitePair(
    value.sourceDimensions,
    `voidMasks.resources.${value.id}.sourceDimensions`,
  );
  const contourCoveragePixelsByDistance = finiteIntegerPair(
    value.contourCoveragePixelsByDistance,
    `voidMasks.resources.${value.id}.contourCoveragePixelsByDistance`,
  );
  const falloffPixelsByDistance = finiteIntegerPair(
    value.falloffPixelsByDistance,
    `voidMasks.resources.${value.id}.falloffPixelsByDistance`,
  );
  const fullyOpaqueFalloffPixelsByDistance = finiteIntegerPair(
    value.fullyOpaqueFalloffPixelsByDistance,
    `voidMasks.resources.${value.id}.fullyOpaqueFalloffPixelsByDistance`,
  );
  const maximumAlphaByDistance = finiteIntegerPair(
    value.maximumAlphaByDistance,
    `voidMasks.resources.${value.id}.maximumAlphaByDistance`,
  );
  const maximumContourCoverageAlphaByDistance = finiteIntegerPair(
    value.maximumContourCoverageAlphaByDistance,
    `voidMasks.resources.${value.id}.maximumContourCoverageAlphaByDistance`,
  );
  const maximumRenderedChannelDeltaByDistance = finiteIntegerPair(
    value.maximumRenderedChannelDeltaByDistance,
    `voidMasks.resources.${value.id}.maximumRenderedChannelDeltaByDistance`,
  );
  const maximumRenderedOklabDeltaMilliByDistance = finiteIntegerPair(
    value.maximumRenderedOklabDeltaMilliByDistance,
    `voidMasks.resources.${value.id}.maximumRenderedOklabDeltaMilliByDistance`,
  );
  const minimumAlphaByDistance = finiteIntegerPair(
    value.minimumAlphaByDistance,
    `voidMasks.resources.${value.id}.minimumAlphaByDistance`,
  );
  const minimumContourCoverageAlphaByDistance = finiteIntegerPair(
    value.minimumContourCoverageAlphaByDistance,
    `voidMasks.resources.${value.id}.minimumContourCoverageAlphaByDistance`,
  );
  const partialContourCoveragePixelsByDistance = finiteIntegerPair(
    value.partialContourCoveragePixelsByDistance,
    `voidMasks.resources.${value.id}.partialContourCoveragePixelsByDistance`,
  );
  const expectedId = `${value.tileId}-void-mask`;
  const expectedSourcePath = `${EXPECTED_SOURCE_PREFIX}${value.tileId}-generated-r2.png`;
  if (
    value.id !== expectedId
    || voidMaskMap.has(value.id)
    || !EXPECTED_VOID_MASK_TILE_IDS.includes(
      value.tileId as typeof EXPECTED_VOID_MASK_TILE_IDS[number],
    )
    || dimensions.join(",") !== EXPECTED_SOURCE_DIMENSIONS.join(",")
    || sourceDimensions.join(",") !== EXPECTED_SOURCE_DIMENSIONS.join(",")
    || sourceCrop.join(",") !== "0,0,1448,1086"
    || value.sourcePath !== expectedSourcePath
    || !value.path.startsWith(
      `/career-world/capitals/ninjaone/environment/masks/void-native-r2/${value.tileId}-void-mask-r2.png?v=`,
    )
    || value.storageFormat !== "png-grayscale-8"
    || value.runtimeMounted !== false
    || value.runtimeDecodedBytes !== 0
    || !Number.isInteger(value.boundaryPixels)
    || value.boundaryPixels <= 0
    || value.boundaryPixelsExceedingCompositeLuminanceDrop !== 0
    || value.boundaryPixelsExceedingRenderedColorDelta !== 0
    || falloffPixelsByDistance.some((count) => count <= 0)
    || falloffPixelsByDistance[0] + falloffPixelsByDistance[1]
      !== value.boundaryPixels
    || contourCoveragePixelsByDistance.join(",")
      !== falloffPixelsByDistance.join(",")
    || partialContourCoveragePixelsByDistance.some((count, index) => (
      count < 0 || count > contourCoveragePixelsByDistance[index]
    ))
    || partialContourCoveragePixelsByDistance[0] <= 0
    || !Number.isInteger(value.falloffPixels)
    || value.falloffPixels <= 0
    || !Number.isInteger(value.voidPixels)
    || value.voidPixels <= 0
    || !Number.isInteger(value.featheredPixels)
    || value.featheredPixels <= 0
    || !Number.isInteger(value.fullyOpaqueBoundaryPixels)
    || value.fullyOpaqueBoundaryPixels !== 0
    || fullyOpaqueFalloffPixelsByDistance.join(",") !== "0,0"
    || value.boundaryPixels
      !== value.falloffPixels + value.fullyOpaqueBoundaryPixels
    || !Number.isInteger(value.transparentFalloffPixels)
    || value.transparentFalloffPixels < 0
    || value.falloffPixels
      !== value.featheredPixels + value.transparentFalloffPixels
    || maximumAlphaByDistance.some((alpha, index) => (
      alpha <= 0 || alpha > EXPECTED_VOID_MASK_DISTANCE_ALPHA_CEILINGS[index]
    ))
    || minimumAlphaByDistance.some((alpha, index) => (
      alpha <= 0 || alpha > maximumAlphaByDistance[index]
    ))
    || maximumContourCoverageAlphaByDistance.some((alpha) => (
      alpha <= 0 || alpha > 255
    ))
    || minimumContourCoverageAlphaByDistance.some((alpha, index) => (
      alpha <= 0 || alpha > maximumContourCoverageAlphaByDistance[index]
    ))
    || maximumRenderedChannelDeltaByDistance.some((delta, index) => (
      delta < 0 || delta > EXPECTED_VOID_MASK_CHANNEL_DELTA_LIMITS[index]
    ))
    || maximumRenderedOklabDeltaMilliByDistance.some((delta, index) => (
      delta < 0 || delta > EXPECTED_VOID_MASK_OKLAB_DELTA_MILLI_LIMITS[index]
    ))
    || !Number.isInteger(value.interiorNearBlackPixels)
    || value.interiorNearBlackPixels <= 0
    || !Number.isInteger(value.maximumBoundaryCompositeLuminanceDrop256)
    || value.maximumBoundaryCompositeLuminanceDrop256 > 4 * 256
    || !Number.isInteger(value.minimumPartialAlpha)
    || value.minimumPartialAlpha <= 0
    || !Number.isInteger(value.maximumPartialAlpha)
    || value.maximumPartialAlpha >= 255
    || value.minimumPartialAlpha > value.maximumPartialAlpha
    || !Number.isInteger(value.maximumPartialCompositeLuminanceDrop256)
    || value.maximumPartialCompositeLuminanceDrop256 > 4 * 256
    || !Number.isInteger(value.partialPixelsAtOrBelowNearBlackMaximumRgb)
    || value.partialPixelsAtOrBelowNearBlackMaximumRgb < 0
    || value.partialPixelsAtOrBelowNearBlackMaximumRgb > value.featheredPixels
    || !isSha256(value.sha256)
    || !isSha256(value.sourceSha256)
  ) {
    throw new TypeError(`voidMasks.resources.${value.id} is invalid.`);
  }
  voidMaskMap.set(value.id, Object.freeze({
    boundaryPixels: value.boundaryPixels,
    boundaryPixelsExceedingCompositeLuminanceDrop: 0,
    boundaryPixelsExceedingRenderedColorDelta: 0,
    contourCoveragePixelsByDistance,
    dimensions,
    falloffPixels: value.falloffPixels,
    falloffPixelsByDistance,
    featheredPixels: value.featheredPixels,
    fullyOpaqueBoundaryPixels: 0,
    fullyOpaqueFalloffPixelsByDistance: Object.freeze([0, 0] as const),
    id: value.id,
    interiorNearBlackPixels: value.interiorNearBlackPixels,
    maximumAlphaByDistance,
    maximumBoundaryCompositeLuminanceDrop256:
      value.maximumBoundaryCompositeLuminanceDrop256,
    maximumContourCoverageAlphaByDistance,
    maximumPartialAlpha: value.maximumPartialAlpha,
    maximumPartialCompositeLuminanceDrop256:
      value.maximumPartialCompositeLuminanceDrop256,
    maximumRenderedChannelDeltaByDistance,
    maximumRenderedOklabDeltaMilliByDistance,
    minimumAlphaByDistance,
    minimumContourCoverageAlphaByDistance,
    minimumPartialAlpha: value.minimumPartialAlpha,
    path: value.path,
    partialPixelsAtOrBelowNearBlackMaximumRgb:
      value.partialPixelsAtOrBelowNearBlackMaximumRgb,
    partialContourCoveragePixelsByDistance,
    runtimeDecodedBytes: 0,
    runtimeMounted: false,
    sha256: value.sha256,
    sourceCrop,
    sourceDimensions,
    sourcePath: value.sourcePath,
    sourceSha256: value.sourceSha256,
    storageFormat: "png-grayscale-8",
    tileId: value.tileId,
    transparentFalloffPixels: value.transparentFalloffPixels,
    voidPixels: value.voidPixels,
  }));
}

export const NINJAONE_ENVIRONMENT_NATIVE_VOID_MASKS = Object.freeze(
  [...voidMaskMap.values()],
);

if (
  NINJAONE_ENVIRONMENT_NATIVE_VOID_MASKS.map(({ tileId }) => tileId).join(",")
  !== EXPECTED_VOID_MASK_TILE_IDS.join(",")
) {
  throw new TypeError("NinjaOne native void-mask order is invalid.");
}

export const NINJAONE_ENVIRONMENT_NATIVE_TILES = Object.freeze(
  (manifest.tiles as readonly RawTile[]).map((value) => {
    const dimensions = finitePair(value.dimensions, `tiles.${value.id}.dimensions`);
    const sourceCrop = finiteIntegerQuad(
      value.sourceCrop,
      `tiles.${value.id}.sourceCrop`,
    );
    const sourceDimensions = finitePair(
      value.sourceDimensions,
      `tiles.${value.id}.sourceDimensions`,
    );
    const artboardBounds = bounds(
      value.artboardBounds,
      `tiles.${value.id}.artboardBounds`,
    );
    const expectedSourcePath = `${EXPECTED_SOURCE_PREFIX}${value.id}-generated-r2.png`;
    const expectedVoidMaskId = EXPECTED_VOID_MASK_TILE_IDS.includes(
      value.id as typeof EXPECTED_VOID_MASK_TILE_IDS[number],
    )
      ? `${value.id}-void-mask`
      : null;
    const voidMask = value.voidMaskId
      ? voidMaskMap.get(value.voidMaskId)
      : undefined;
    if (
      value.id !== `r${value.row}-c${value.column}`
      || !EXPECTED_TILE_IDS.includes(value.id as typeof EXPECTED_TILE_IDS[number])
      || dimensions.join(",") !== runtimeTileDimensions.join(",")
      || value.decodedBytes !== EXPECTED_TILE_DECODED_BYTES
      || sourceDimensions.join(",") !== EXPECTED_SOURCE_DIMENSIONS.join(",")
      || sourceCrop.join(",") !== "0,0,1448,1086"
      || artboardBounds.origin.join(",") !== [
        value.column * tileArtboard[0],
        value.row * tileArtboard[1],
      ].join(",")
      || artboardBounds.span.join(",") !== tileArtboard.join(",")
      || !value.path.startsWith(
        `/career-world/capitals/ninjaone/environment/tiles/close-native-r2/${value.id}-close-native-r2.png?v=`,
      )
      || value.sourcePath !== expectedSourcePath
      || value.voidMaskId !== expectedVoidMaskId
      || Boolean(voidMask) !== Boolean(expectedVoidMaskId)
      || (voidMask && (
        voidMask.sourcePath !== value.sourcePath
        || voidMask.sourceSha256 !== value.sourceSha256
      ))
      || (!voidMask && value.sha256 !== value.sourceSha256)
      || !isSha256(value.decodedRgbSha256)
      || !isSha256(value.sha256)
      || !isSha256(value.sourceSha256)
    ) {
      throw new TypeError(`tiles.${value.id} is invalid.`);
    }
    return Object.freeze({
      artboardBounds,
      column: value.column,
      decodedBytes: value.decodedBytes,
      decodedRgbSha256: value.decodedRgbSha256,
      dimensions,
      id: value.id,
      path: value.path,
      row: value.row,
      sha256: value.sha256,
      sourceCrop,
      sourceDimensions,
      sourcePath: value.sourcePath,
      sourceSha256: value.sourceSha256,
      ...(voidMask ? { voidMask } : {}),
      voidMaskId: value.voidMaskId,
    });
  }),
);

if (
  NINJAONE_ENVIRONMENT_NATIVE_TILES.map(({ id }) => id).join(",")
  !== EXPECTED_TILE_IDS.join(",")
) {
  throw new TypeError("NinjaOne native environment tile order is invalid.");
}

export function environmentCameraArtboardView(camera: CameraView): CameraView {
  return Object.freeze({
    origin: Object.freeze(camera.origin.map((value, index) => (
      (value - ENVIRONMENT_WORLD_ORIGIN[index])
      / ENVIRONMENT_WORLD_SPAN[index]
      * registrationArtboard[index]
    )) as [number, number]),
    span: Object.freeze(camera.span.map((value, index) => (
      value / ENVIRONMENT_WORLD_SPAN[index] * registrationArtboard[index]
    )) as [number, number]),
  });
}

function intersects(first: CameraView, second: CameraView): boolean {
  return first.origin[0] < second.origin[0] + second.span[0]
    && first.origin[0] + first.span[0] > second.origin[0]
    && first.origin[1] < second.origin[1] + second.span[1]
    && first.origin[1] + first.span[1] > second.origin[1];
}

export function selectNinjaOneEnvironmentNativeTiles(
  camera: CameraView,
): readonly NinjaOneEnvironmentNativeTile[] {
  return Object.freeze(
    selectNinjaOneEnvironmentNativeTileCandidates(camera)
      .slice(0, NINJAONE_ENVIRONMENT_NATIVE_MAX_MOUNTED_TILES),
  );
}

export function selectNinjaOneEnvironmentNativeTileCandidates(
  camera: CameraView,
): readonly NinjaOneEnvironmentNativeTile[] {
  const artboardView = environmentCameraArtboardView(camera);
  return Object.freeze(NINJAONE_ENVIRONMENT_NATIVE_TILES
    .filter((tile) => intersects(artboardView, tile.artboardBounds))
    .sort((left, right) => (
      distanceFromViewCenter(artboardView, left)
      - distanceFromViewCenter(artboardView, right)
      || left.id.localeCompare(right.id)
    )));
}

function distanceFromViewCenter(
  view: CameraView,
  instance: { readonly artboardBounds: CameraView },
): number {
  const viewCenterX = view.origin[0] + view.span[0] * 0.5;
  const viewCenterY = view.origin[1] + view.span[1] * 0.5;
  const instanceCenterX = instance.artboardBounds.origin[0]
    + instance.artboardBounds.span[0] * 0.5;
  const instanceCenterY = instance.artboardBounds.origin[1]
    + instance.artboardBounds.span[1] * 0.5;
  return (viewCenterX - instanceCenterX) ** 2
    + (viewCenterY - instanceCenterY) ** 2;
}

export function selectNinjaOneEnvironmentNativeInstances(
  camera: CameraView,
  values: readonly NinjaOneEnvironmentNativeInstance[],
): readonly NinjaOneEnvironmentNativeInstance[] {
  const artboardView = environmentCameraArtboardView(camera);
  const visible = values
    .filter((instance) => intersects(artboardView, instance.artboardBounds))
    .sort((left, right) => (
      distanceFromViewCenter(artboardView, left)
      - distanceFromViewCenter(artboardView, right)
      || left.id.localeCompare(right.id)
    ));
  return Object.freeze(
    visible.slice(0, NINJAONE_ENVIRONMENT_NATIVE_MAX_ANIMATED_NODES),
  );
}
