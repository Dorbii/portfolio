import manifest from "../../../../../../public/career-world/capitals/ninjaone/environment/manifests/foliage-native-r4.json" with { type: "json" };
import type { CameraView, Pair } from "../../../../shared/camera";

export type NinjaOneEnvironmentFoliageResourceKind =
  | "coherent-canopy"
  | "neutralization-underlay";

export interface NinjaOneEnvironmentFoliageResource {
  readonly alphaBounds: readonly [number, number, number, number];
  readonly alphaCoverage: number;
  readonly boundaryHighAlphaPixels: number;
  readonly decodedBytes: number;
  readonly dimensions: Pair;
  readonly highAlphaPixels: number;
  readonly id: string;
  readonly kind: NinjaOneEnvironmentFoliageResourceKind;
  readonly largestConnectedComponentRatio: number;
  readonly opaquePixels: number;
  readonly path: string;
  readonly sha256: string;
  readonly sourceCrop: readonly [number, number, number, number];
  readonly sourceMasterId: string;
}

export interface NinjaOneEnvironmentFoliageInstance {
  readonly animation: "canopy-bend";
  readonly artboardBounds: CameraView;
  readonly bendDegrees: number;
  readonly canopyResource: NinjaOneEnvironmentFoliageResource;
  readonly checkpoint: string;
  readonly durationSeconds: number;
  readonly gridCell: "B1" | "B2" | "C1" | "C2";
  readonly id: string;
  readonly lagDegrees: number;
  readonly neutralizationResource: NinjaOneEnvironmentFoliageResource;
  readonly phaseSeconds: number;
  readonly pivotYPercent: number;
  /** Compatibility alias for callers that account the animated canopy only. */
  readonly resource: NinjaOneEnvironmentFoliageResource;
  readonly resources: readonly NinjaOneEnvironmentFoliageResource[];
  readonly sourceMasterId: string;
}

export interface NinjaOneEnvironmentFoliageEligibilityInput {
  readonly active: boolean;
  readonly camera: CameraView;
  readonly previousEligible: boolean;
  readonly shouldLoadCloseAssets: boolean;
  readonly showFoliage: boolean;
}

interface RawBounds {
  readonly origin: readonly number[];
  readonly span: readonly number[];
}

interface RawResource {
  readonly alphaBounds: readonly number[];
  readonly alphaCoverage: number;
  readonly boundaryHighAlphaPixels: number;
  readonly decodedBytes: number;
  readonly dimensions: readonly number[];
  readonly highAlphaPixels: number;
  readonly id: string;
  readonly kind: string;
  readonly largestConnectedComponentRatio: number;
  readonly opaquePixels: number;
  readonly path: string;
  readonly sha256: string;
  readonly sourceCrop: readonly number[];
  readonly sourceMasterId: string;
}

interface RawInstance {
  readonly animation: string;
  readonly artboardBounds: RawBounds;
  readonly bendDegrees: number;
  readonly canopyResourceId: string;
  readonly checkpoint: string;
  readonly durationSeconds: number;
  readonly gridCell: string;
  readonly id: string;
  readonly lagDegrees: number;
  readonly neutralizationResourceId: string;
  readonly phaseSeconds: number;
  readonly pivotYPercent: number;
  readonly sourceMasterId: string;
}

const EXPECTED_ID = "career-world/capitals/ninjaone/foliage-native@r4";
const EXPECTED_SOURCE_MASTER_ID = "terrain-master-detail-r8";
const EXPECTED_SOURCE_MASTER_PATH =
  "/art-source/career-world/ninjaone-environment/production-r2/ninjaone-environment-terrain-master-detail-r8.png";
const RESOURCE_PATH_PREFIX = "/career-world/capitals/ninjaone/environment/shared/foliage-native-r4/";
const ENVIRONMENT_WORLD_ORIGIN = Object.freeze([0.125, 0] as Pair);
const ENVIRONMENT_WORLD_SPAN = Object.freeze([0.25, 1 / 3] as Pair);

function finitePair(values: readonly number[], label: string): Pair {
  if (values.length !== 2 || values.some((value) => !Number.isFinite(value))) {
    throw new TypeError(`${label} must contain two finite values.`);
  }
  return Object.freeze([values[0], values[1]] as Pair);
}

function finiteQuad(
  values: readonly number[],
  label: string,
): readonly [number, number, number, number] {
  if (values.length !== 4 || values.some((value) => !Number.isFinite(value))) {
    throw new TypeError(`${label} must contain four finite values.`);
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

const registrationArtboard = finitePair(
  manifest.registration.artboard,
  "registration.artboard",
);

if (
  manifest.schemaVersion !== 3
  || manifest.id !== EXPECTED_ID
  || manifest.status !== "active-master-native-canopy-with-neutralization"
  || manifest.sourceMaster.authority !== "active-r8-geology-master"
  || manifest.sourceMaster.id !== EXPECTED_SOURCE_MASTER_ID
  || manifest.sourceMaster.path !== EXPECTED_SOURCE_MASTER_PATH
  || manifest.sourceMaster.dimensions.join(",") !== "5760,4320"
  || manifest.sourceMaster.sha256.length !== 64
  || registrationArtboard.join(",") !== "1440,1080"
  || manifest.registration.boundingWorldView.origin.join(",") !== "0.125,0"
  || manifest.registration.boundingWorldView.span.join(",") !== `0.25,${1 / 3}`
  || manifest.registration.masterDimensions.join(",") !== "5760,4320"
  || manifest.registration.sourcePixelsPerArtboardUnit !== 4
  || manifest.eligibility.maxDetailEnterSpan !== 0.12
  || manifest.eligibility.maxDetailRetainSpan !== 0.14
  || manifest.eligibility.maxDetailRetainSpan
    <= manifest.eligibility.maxDetailEnterSpan
  || manifest.budgets.maximumSupplementalNodes !== 6
  || manifest.budgets.maximumSelectedGroups !== 3
  || manifest.budgets.nodesPerGroup !== 2
  || manifest.budgets.maximumDecodedBytes !== 32 * 1024 * 1024
  || manifest.budgets.maximumTerrainTiles !== 4
  || manifest.budgets.terrainDecodedBytes !== 4 * 1448 * 1086 * 4
  || manifest.budgets.poolGroups !== manifest.instances.length
  || manifest.budgets.mountedGroups
    !== Math.min(manifest.instances.length, manifest.budgets.maximumSelectedGroups)
  || manifest.budgets.mountedFoliageNodes
    !== manifest.budgets.mountedGroups * manifest.budgets.nodesPerGroup
  || manifest.budgets.mountedFoliageNodes > manifest.budgets.maximumSupplementalNodes
) {
  throw new TypeError("NinjaOne r4 foliage registration contract is invalid.");
}

const resourceMap = new Map<string, NinjaOneEnvironmentFoliageResource>();
for (const value of manifest.resources as readonly RawResource[]) {
  const dimensions = finitePair(value.dimensions, `resources.${value.id}.dimensions`);
  const alphaBounds = finiteQuad(value.alphaBounds, `resources.${value.id}.alphaBounds`);
  const sourceCrop = finiteQuad(value.sourceCrop, `resources.${value.id}.sourceCrop`);
  const kind = value.kind === "coherent-canopy"
    || value.kind === "neutralization-underlay"
    ? value.kind
    : null;
  if (
    !kind
    || resourceMap.has(value.id)
    || !value.path.startsWith(RESOURCE_PATH_PREFIX)
    || value.sha256.length !== 64
    || value.sourceMasterId !== EXPECTED_SOURCE_MASTER_ID
    || !Number.isInteger(value.decodedBytes)
    || value.decodedBytes !== dimensions[0] * dimensions[1] * 4
    || !Number.isInteger(value.opaquePixels)
    || value.opaquePixels <= 0
    || !Number.isInteger(value.highAlphaPixels)
    || value.highAlphaPixels <= 0
    || value.boundaryHighAlphaPixels !== 0
    || !Number.isFinite(value.alphaCoverage)
    || value.alphaCoverage <= 0
    || value.alphaCoverage >= 0.8
    || !Number.isFinite(value.largestConnectedComponentRatio)
    || (kind === "neutralization-underlay"
      && value.largestConnectedComponentRatio < 0.94)
    || (kind === "coherent-canopy"
      && value.largestConnectedComponentRatio < 0.9)
    || sourceCrop[0] < 0
    || sourceCrop[1] < 0
    || sourceCrop[0] + sourceCrop[2] > 5760
    || sourceCrop[1] + sourceCrop[3] > 4320
    || alphaBounds[0] < 0
    || alphaBounds[1] < 0
    || alphaBounds[2] >= dimensions[0]
    || alphaBounds[3] >= dimensions[1]
  ) {
    throw new TypeError(`resources.${value.id} is invalid.`);
  }
  resourceMap.set(value.id, Object.freeze({
    alphaBounds,
    alphaCoverage: value.alphaCoverage,
    boundaryHighAlphaPixels: value.boundaryHighAlphaPixels,
    decodedBytes: value.decodedBytes,
    dimensions,
    highAlphaPixels: value.highAlphaPixels,
    id: value.id,
    kind,
    largestConnectedComponentRatio: value.largestConnectedComponentRatio,
    opaquePixels: value.opaquePixels,
    path: value.path,
    sha256: value.sha256,
    sourceCrop,
    sourceMasterId: value.sourceMasterId,
  }));
}

export const NINJAONE_ENVIRONMENT_FOLIAGE_INSTANCES = Object.freeze(
  (manifest.instances as readonly RawInstance[]).map((value) => {
    const canopyResource = resourceMap.get(value.canopyResourceId);
    const neutralizationResource = resourceMap.get(value.neutralizationResourceId);
    const artboardBounds = bounds(
      value.artboardBounds,
      `instances.${value.id}.artboardBounds`,
    );
    const gridCell = `${
      artboardBounds.origin[0] + artboardBounds.span[0] * 0.5 < registrationArtboard[0] * 0.5
        ? "B"
        : "C"
    }${
      artboardBounds.origin[1] + artboardBounds.span[1] * 0.5 < registrationArtboard[1] * 0.5
        ? "1"
        : "2"
    }` as NinjaOneEnvironmentFoliageInstance["gridCell"];
    if (
      !canopyResource
      || canopyResource.kind !== "coherent-canopy"
      || !neutralizationResource
      || neutralizationResource.kind !== "neutralization-underlay"
      || canopyResource.sourceMasterId !== value.sourceMasterId
      || neutralizationResource.sourceMasterId !== value.sourceMasterId
      || canopyResource.sourceCrop.join(",") !== neutralizationResource.sourceCrop.join(",")
      || value.animation !== "canopy-bend"
      || value.gridCell !== gridCell
      || !value.checkpoint.startsWith(`${gridCell.toLowerCase()}-`)
      || !Number.isFinite(value.phaseSeconds)
      || !Number.isFinite(value.durationSeconds)
      || value.durationSeconds < 5
      || value.durationSeconds > 8
      || !Number.isFinite(value.bendDegrees)
      || value.bendDegrees <= 0
      || value.bendDegrees > 2.5
      || !Number.isFinite(value.lagDegrees)
      || value.lagDegrees < 0
      || value.lagDegrees > 0.15
      || value.pivotYPercent < 92
      || value.pivotYPercent > 98
      || artboardBounds.origin[0] < 0
      || artboardBounds.origin[1] < 0
      || artboardBounds.origin[0] + artboardBounds.span[0]
        > registrationArtboard[0]
      || artboardBounds.origin[1] + artboardBounds.span[1]
        > registrationArtboard[1]
    ) {
      throw new TypeError(`instances.${value.id} is invalid.`);
    }
    const resources = Object.freeze([neutralizationResource, canopyResource]);
    return Object.freeze({
      animation: "canopy-bend" as const,
      artboardBounds,
      bendDegrees: value.bendDegrees,
      canopyResource,
      checkpoint: value.checkpoint,
      durationSeconds: value.durationSeconds,
      gridCell,
      id: value.id,
      lagDegrees: value.lagDegrees,
      neutralizationResource,
      phaseSeconds: value.phaseSeconds,
      pivotYPercent: value.pivotYPercent,
      resource: canopyResource,
      resources,
      sourceMasterId: value.sourceMasterId,
    });
  }),
);

const decodedBytes = [...resourceMap.values()].reduce(
  (total, resource) => total + resource.decodedBytes,
  0,
);
if (
  decodedBytes !== manifest.budgets.foliageDecodedBytes
  || manifest.budgets.combinedDecodedBytes
    !== decodedBytes
      + manifest.budgets.terrainDecodedBytes
  || manifest.budgets.combinedDecodedBytes > manifest.budgets.maximumDecodedBytes
  || manifest.registration.coveredGridCells.join(",")
    !== [...new Set(NINJAONE_ENVIRONMENT_FOLIAGE_INSTANCES.map(({ gridCell }) => gridCell))]
      .sort()
      .join(",")
  || new Set(NINJAONE_ENVIRONMENT_FOLIAGE_INSTANCES.map(({ phaseSeconds }) => phaseSeconds)).size
    !== NINJAONE_ENVIRONMENT_FOLIAGE_INSTANCES.length
  || new Set(NINJAONE_ENVIRONMENT_FOLIAGE_INSTANCES.map(({ durationSeconds }) => durationSeconds)).size
    !== NINJAONE_ENVIRONMENT_FOLIAGE_INSTANCES.length
) {
  throw new TypeError("NinjaOne r4 foliage budget or phase contract is invalid.");
}

export const NINJAONE_ENVIRONMENT_FOLIAGE_ID = EXPECTED_ID;
export const NINJAONE_ENVIRONMENT_FOLIAGE_MAX_DETAIL_ENTER_SPAN =
  manifest.eligibility.maxDetailEnterSpan;
export const NINJAONE_ENVIRONMENT_FOLIAGE_MAX_DETAIL_RETAIN_SPAN =
  manifest.eligibility.maxDetailRetainSpan;
export const NINJAONE_ENVIRONMENT_FOLIAGE_MAX_SELECTED_GROUPS =
  manifest.budgets.maximumSelectedGroups;
export const NINJAONE_ENVIRONMENT_FOLIAGE_NODES_PER_GROUP =
  manifest.budgets.nodesPerGroup;
export const NINJAONE_ENVIRONMENT_FOLIAGE_MAX_MOUNTED_NODES =
  manifest.budgets.maximumSupplementalNodes;
export const NINJAONE_ENVIRONMENT_FOLIAGE_MAX_ANIMATED_NODES =
  manifest.budgets.maximumSelectedGroups;
export const NINJAONE_ENVIRONMENT_FOLIAGE_DECODED_BYTES = decodedBytes;
export const NINJAONE_ENVIRONMENT_FOLIAGE_COMBINED_DECODED_BYTES =
  manifest.budgets.combinedDecodedBytes;
export const NINJAONE_ENVIRONMENT_FOLIAGE_RESOURCES = Object.freeze([
  ...resourceMap.values(),
]);

export function environmentFoliageResourceCohort(
  resources: readonly NinjaOneEnvironmentFoliageResource[],
): string {
  return [...resources]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map(({ id, path }) => `${id}\t${path}`)
    .join("\n");
}

export function environmentFoliageCameraArtboardView(
  camera: CameraView,
): CameraView {
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

export function resolveNinjaOneEnvironmentFoliageEligibility({
  active,
  camera,
  previousEligible,
  shouldLoadCloseAssets,
  showFoliage,
}: NinjaOneEnvironmentFoliageEligibilityInput): boolean {
  if (!active || !showFoliage || !shouldLoadCloseAssets) return false;
  const maximumSpan = previousEligible
    ? NINJAONE_ENVIRONMENT_FOLIAGE_MAX_DETAIL_RETAIN_SPAN
    : NINJAONE_ENVIRONMENT_FOLIAGE_MAX_DETAIL_ENTER_SPAN;
  return Math.max(...camera.span) <= maximumSpan;
}

function intersects(first: CameraView, second: CameraView): boolean {
  return first.origin[0] < second.origin[0] + second.span[0]
    && first.origin[0] + first.span[0] > second.origin[0]
    && first.origin[1] < second.origin[1] + second.span[1]
    && first.origin[1] + first.span[1] > second.origin[1];
}

function distanceFromViewCenter(
  view: CameraView,
  instance: NinjaOneEnvironmentFoliageInstance,
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

export function selectNinjaOneEnvironmentFoliageInstances(
  camera: CameraView,
  maxDetailEligible = Math.max(...camera.span)
    <= NINJAONE_ENVIRONMENT_FOLIAGE_MAX_DETAIL_ENTER_SPAN,
  maximumGroups = NINJAONE_ENVIRONMENT_FOLIAGE_MAX_SELECTED_GROUPS,
): readonly NinjaOneEnvironmentFoliageInstance[] {
  const admittedGroups = Number.isInteger(maximumGroups)
    ? Math.max(
        0,
        Math.min(maximumGroups, NINJAONE_ENVIRONMENT_FOLIAGE_MAX_SELECTED_GROUPS),
      )
    : 0;
  if (
    !maxDetailEligible
    || admittedGroups === 0
    || Math.max(...camera.span)
      > NINJAONE_ENVIRONMENT_FOLIAGE_MAX_DETAIL_RETAIN_SPAN
  ) {
    return Object.freeze([]);
  }
  const artboardView = environmentFoliageCameraArtboardView(camera);
  return Object.freeze(NINJAONE_ENVIRONMENT_FOLIAGE_INSTANCES
    .filter((instance) => intersects(artboardView, instance.artboardBounds))
    .sort((left, right) => (
      distanceFromViewCenter(artboardView, left)
      - distanceFromViewCenter(artboardView, right)
    ))
    .slice(0, admittedGroups));
}
