import manifest from "../../../../public/career-world/capitals/ninjaone/environment/manifests/native-detail-r2.json" with { type: "json" };
import type { CameraView, Pair } from "../../shared/camera";

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
  readonly dimensions: Pair;
  readonly id: string;
  readonly path: string;
  readonly row: number;
  readonly sha256: string;
  readonly sourceDimensions: Pair;
  readonly sourcePath: string;
  readonly sourceSha256: string;
}

interface RawBounds {
  readonly origin: readonly number[];
  readonly span: readonly number[];
}

interface RawResource {
  readonly dimensions: readonly number[];
  readonly id: string;
  readonly opaquePixels: number;
  readonly path: string;
}

interface RawInstance {
  readonly animation: string;
  readonly artboardBounds: RawBounds;
  readonly flowVector?: readonly number[];
  readonly id: string;
  readonly phaseSeconds: number;
  readonly resourceId: string;
  readonly tileId: string;
}

interface RawTile {
  readonly artboardBounds: RawBounds;
  readonly column: number;
  readonly dimensions: readonly number[];
  readonly id: string;
  readonly path: string;
  readonly row: number;
  readonly sha256: string;
  readonly sourceDimensions: readonly number[];
  readonly sourcePath: string;
  readonly sourceSha256: string;
}

const EXPECTED_ID = "career-world/capitals/ninjaone/native-detail@r2";
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
const ALLOWED_INSTANCE_TILE_IDS = Object.freeze([
  ...EXPECTED_TILE_IDS,
] as const);
const ALLOWED_ANIMATIONS = new Set<NinjaOneEnvironmentNativeAnimation>([
  "canopy-sway",
  "coast-foam",
  "stream-flow",
  "tarn-ripple",
  "waterfall-flow",
]);
const ENVIRONMENT_WORLD_ORIGIN = Object.freeze([0.125, 0] as Pair);
const ENVIRONMENT_WORLD_SPAN = Object.freeze([0.25, 1 / 3] as Pair);

function finitePair(values: readonly number[], label: string): Pair {
  if (values.length !== 2 || values.some((value) => !Number.isFinite(value))) {
    throw new TypeError(`${label} must contain two finite values.`);
  }
  return Object.freeze([values[0], values[1]] as Pair);
}

function bounds(value: RawBounds, label: string): CameraView {
  const origin = finitePair(value.origin, `${label}.origin`);
  const span = finitePair(value.span, `${label}.span`);
  if (span.some((entry) => entry <= 0)) {
    throw new RangeError(`${label}.span must be positive.`);
  }
  return Object.freeze({ origin, span });
}

function resources(
  values: readonly RawResource[],
  prefix: string,
  label: string,
): ReadonlyMap<string, NinjaOneEnvironmentNativeResource> {
  const result = new Map<string, NinjaOneEnvironmentNativeResource>();
  for (const value of values) {
    const dimensions = finitePair(value.dimensions, `${label}.${value.id}.dimensions`);
    if (
      result.has(value.id)
      || !value.path.startsWith(prefix)
      || !Number.isInteger(value.opaquePixels)
      || value.opaquePixels <= 0
    ) {
      throw new TypeError(`${label}.${value.id} is invalid.`);
    }
    result.set(value.id, Object.freeze({
      dimensions,
      id: value.id,
      opaquePixels: value.opaquePixels,
      path: value.path,
    }));
  }
  return result;
}

function instances(
  values: readonly RawInstance[],
  resourceMap: ReadonlyMap<string, NinjaOneEnvironmentNativeResource>,
  label: string,
): readonly NinjaOneEnvironmentNativeInstance[] {
  return Object.freeze(values.map((value) => {
    const resource = resourceMap.get(value.resourceId);
    if (
      !resource
      || !ALLOWED_INSTANCE_TILE_IDS.includes(
        value.tileId as typeof ALLOWED_INSTANCE_TILE_IDS[number],
      )
      || !ALLOWED_ANIMATIONS.has(value.animation as NinjaOneEnvironmentNativeAnimation)
      || !Number.isFinite(value.phaseSeconds)
    ) {
      throw new TypeError(`${label}.${value.id} is invalid.`);
    }
    return Object.freeze({
      animation: value.animation as NinjaOneEnvironmentNativeAnimation,
      artboardBounds: bounds(value.artboardBounds, `${label}.${value.id}.artboardBounds`),
      ...(value.flowVector
        ? { flowVector: finitePair(value.flowVector, `${label}.${value.id}.flowVector`) }
        : {}),
      id: value.id,
      phaseSeconds: value.phaseSeconds,
      resource,
      tileId: value.tileId,
    });
  }));
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
  || runtimeTileDimensions.join(",") !== "1440,1080"
  || tileArtboard.join(",") !== "360,270"
  || manifest.budgets.maximumMountedTerrainTiles !== 4
  || manifest.budgets.maximumAnimatedNodes !== 6
  || manifest.tiles.length !== EXPECTED_TILE_IDS.length
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

export const NINJAONE_ENVIRONMENT_NATIVE_TILES = Object.freeze(
  (manifest.tiles as readonly RawTile[]).map((value) => {
    const dimensions = finitePair(value.dimensions, `tiles.${value.id}.dimensions`);
    const sourceDimensions = finitePair(
      value.sourceDimensions,
      `tiles.${value.id}.sourceDimensions`,
    );
    if (
      value.id !== `r${value.row}-c${value.column}`
      || !EXPECTED_TILE_IDS.includes(value.id as typeof EXPECTED_TILE_IDS[number])
      || dimensions.join(",") !== runtimeTileDimensions.join(",")
      || !value.path.startsWith(
        "/career-world/capitals/ninjaone/environment/tiles/close-native-r2/",
      )
      || ![
        "/art-source/career-world/ninjaone-environment/production-r2/detail-tiles-r2/generated/",
        "/art-source/career-world/ninjaone-environment/production-r2/detail-tiles-r3/generated/",
      ].some((prefix) => value.sourcePath.startsWith(prefix))
      || value.sha256.length !== 64
      || value.sourceSha256.length !== 64
    ) {
      throw new TypeError(`tiles.${value.id} is invalid.`);
    }
    return Object.freeze({
      artboardBounds: bounds(value.artboardBounds, `tiles.${value.id}.artboardBounds`),
      column: value.column,
      dimensions,
      id: value.id,
      path: value.path,
      row: value.row,
      sha256: value.sha256,
      sourceDimensions,
      sourcePath: value.sourcePath,
      sourceSha256: value.sourceSha256,
    });
  }),
);

if (
  NINJAONE_ENVIRONMENT_NATIVE_TILES.map(({ id }) => id).join(",")
  !== EXPECTED_TILE_IDS.join(",")
) {
  throw new TypeError("NinjaOne native environment tile order is invalid.");
}

const foliageResources = resources(
  manifest.layers.foliage.resources as readonly RawResource[],
  "/career-world/capitals/ninjaone/environment/shared/foliage-native-r2/",
  "layers.foliage.resources",
);
export const NINJAONE_ENVIRONMENT_NATIVE_FOLIAGE_RESOURCES = Object.freeze([
  ...foliageResources.values(),
]);
export const NINJAONE_ENVIRONMENT_NATIVE_FOLIAGE_INSTANCES = instances(
  manifest.layers.foliage.instances as readonly RawInstance[],
  foliageResources,
  "layers.foliage.instances",
);

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
  const artboardView = environmentCameraArtboardView(camera);
  return Object.freeze(NINJAONE_ENVIRONMENT_NATIVE_TILES
    .filter((tile) => intersects(artboardView, tile.artboardBounds))
    .slice(0, NINJAONE_ENVIRONMENT_NATIVE_MAX_MOUNTED_TILES));
}

function distanceFromViewCenter(
  view: CameraView,
  instance: NinjaOneEnvironmentNativeInstance,
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
    ));
  return Object.freeze(
    visible.slice(0, NINJAONE_ENVIRONMENT_NATIVE_MAX_ANIMATED_NODES),
  );
}
