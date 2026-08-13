import type { CameraView } from "../../../../shared/camera.ts";
import { DETAIL_POLICY } from "../../../../shared/lod/policy.ts";
import {
  NINJAONE_ENVIRONMENT_NATIVE_MAX_ANIMATED_NODES,
  NINJAONE_ENVIRONMENT_NATIVE_MAX_DECODED_BYTES,
  NINJAONE_ENVIRONMENT_NATIVE_MAX_MOUNTED_TILES,
  selectNinjaOneEnvironmentNativeInstances,
  selectNinjaOneEnvironmentNativeTileCandidates,
  type NinjaOneEnvironmentNativeInstance,
  type NinjaOneEnvironmentNativeResource,
  type NinjaOneEnvironmentNativeTile,
} from "./ninjaOneEnvironmentNativeDetail.ts";

export const NINJAONE_ENVIRONMENT_NATIVE_RELEASE_SPAN =
  DETAIL_POLICY.closeAssetPreloadSpan + 0.0125;

export interface NinjaOneEnvironmentNativeResidencyLimits {
  readonly maximumDecodedBytes: number;
  readonly maximumSupplementalNodes: number;
  readonly maximumTerrainTiles: number;
}

export interface NinjaOneEnvironmentNativeResidencyPlan {
  readonly admitted: boolean;
  readonly decodedBytes: number;
  readonly demand: boolean;
  readonly fullyCovered: boolean;
  readonly supplementalInstances:
    readonly NinjaOneEnvironmentNativeInstance[];
  readonly terrainTiles: readonly NinjaOneEnvironmentNativeTile[];
  readonly visibleTerrainTileCount: number;
}

export interface NinjaOneEnvironmentNativePresentation {
  readonly lowerDetailRequired: boolean;
  readonly noVisibleGap: boolean;
  readonly presentedSupplementalIds: readonly string[];
  readonly presentedTerrainIds: readonly string[];
  readonly state: "budget-blocked" | "idle" | "loading" | "ready";
  readonly visible: boolean;
}

export interface NinjaOneEnvironmentNativeDecodeCohort {
  readonly decodedKeys: ReadonlySet<string>;
  readonly epoch: number;
  readonly failedKeys: ReadonlySet<string>;
  readonly mountedDecodedBytes: number;
  readonly mountedKeys: readonly string[];
  readonly phase: "active" | "evicting";
  readonly retiringDecodedBytes: number;
  readonly retiringKeys: readonly string[];
  readonly targetDecodedBytes: number;
  readonly targetKey: string;
  readonly targetKeys: readonly string[];
}

export interface NinjaOneEnvironmentNativeDecodeTarget {
  readonly decodedBytes: number;
  readonly resourceKeys: readonly string[];
}

export type NinjaOneEnvironmentRequiredPresentationStatus =
  | "error"
  | "idle"
  | "loading"
  | "ready";

export interface NinjaOneEnvironmentRequiredPresentationCohort {
  readonly epoch: number;
  readonly failedKeys: ReadonlySet<string>;
  readonly readyKeys: ReadonlySet<string>;
  readonly requiredKeys: readonly string[];
  readonly targetKey: string;
}

export interface NinjaOneEnvironmentRequiredPresentationTarget {
  readonly requiredKeys: readonly string[];
  readonly terrainCohortKey: string;
}

export interface NinjaOneEnvironmentRequiredResourceIdentity {
  readonly path: string;
  readonly sha256: string;
}

export interface NinjaOneEnvironmentRequiredPresentation {
  readonly lowerDetailRequired: boolean;
  readonly noVisibleGap: boolean;
  readonly state: "budget-blocked" | "error" | "idle" | "loading" | "ready";
  readonly visible: boolean;
}

export interface NinjaOneEnvironmentFoliageResidencyObservation {
  readonly cohortKey: string;
  readonly epoch: number;
  readonly mountedDecodedBytes: number;
  readonly mountedImageNodeCount: number;
  readonly mountedResourceIds: readonly string[];
  readonly status: "error" | "idle" | "loading" | "ready";
}

export interface NinjaOneEnvironmentFoliageResidencyResolution {
  readonly decodedBytes: number;
  readonly mounted: boolean;
  readonly nodeCount: number;
  readonly phase: "error" | "idle" | "incoming" | "mounted";
  readonly resourceIds: readonly string[];
}

export interface NinjaOneEnvironmentFoliageDomResidencyState
  extends NinjaOneEnvironmentFoliageResidencyObservation {
  readonly selectedDecodedBytes: number;
  readonly selectedImageNodeCount: number;
  readonly selectedResourceIds: readonly string[];
}

export interface NinjaOneEnvironmentFoliageNodeLoadCohort {
  readonly epoch: number;
  readonly failedKeys: readonly string[];
  readonly hiddenPaintedFrames: number;
  readonly key: string;
  readonly loadedKeys: readonly string[];
  readonly status: "error" | "idle" | "loading" | "ready";
}

export const NINJAONE_ENVIRONMENT_NATIVE_RESIDENCY_LIMITS = Object.freeze({
  maximumDecodedBytes: NINJAONE_ENVIRONMENT_NATIVE_MAX_DECODED_BYTES,
  maximumSupplementalNodes: NINJAONE_ENVIRONMENT_NATIVE_MAX_ANIMATED_NODES,
  maximumTerrainTiles: NINJAONE_ENVIRONMENT_NATIVE_MAX_MOUNTED_TILES,
} satisfies NinjaOneEnvironmentNativeResidencyLimits);

export function resolveNinjaOneEnvironmentOptionalGroupCapacity({
  maximumGroups,
  maximumSupplementalNodes,
  nodesPerGroup,
  requiredSupplementalNodes,
}: {
  readonly maximumGroups: number;
  readonly maximumSupplementalNodes: number;
  readonly nodesPerGroup: number;
  readonly requiredSupplementalNodes: number;
}): number {
  if (
    !Number.isInteger(maximumGroups)
    || maximumGroups < 0
    || !Number.isInteger(maximumSupplementalNodes)
    || maximumSupplementalNodes < 0
    || !Number.isInteger(nodesPerGroup)
    || nodesPerGroup <= 0
    || !Number.isInteger(requiredSupplementalNodes)
    || requiredSupplementalNodes < 0
  ) {
    throw new TypeError("Native optional group capacity inputs are invalid.");
  }
  return Math.min(
    maximumGroups,
    Math.floor(
      Math.max(0, maximumSupplementalNodes - requiredSupplementalNodes)
        / nodesPerGroup,
    ),
  );
}

function validateNinjaOneEnvironmentFoliageResourceKeys(
  resourceKeys: readonly string[],
): void {
  if (
    resourceKeys.some((key) => typeof key !== "string" || key.length === 0)
    || new Set(resourceKeys).size !== resourceKeys.length
  ) throw new TypeError("Native foliage resource keys must be unique strings.");
}

export function createNinjaOneEnvironmentFoliageNodeLoadCohort(
): NinjaOneEnvironmentFoliageNodeLoadCohort {
  return Object.freeze({
    epoch: 0,
    failedKeys: Object.freeze([]),
    hiddenPaintedFrames: 0,
    key: "",
    loadedKeys: Object.freeze([]),
    status: "idle",
  });
}

export function retargetNinjaOneEnvironmentFoliageNodeLoadCohort(
  cohort: NinjaOneEnvironmentFoliageNodeLoadCohort,
  key: string,
): NinjaOneEnvironmentFoliageNodeLoadCohort {
  if (typeof key !== "string") throw new TypeError("Native foliage cohort key is invalid.");
  if (cohort.key === key) return cohort;
  return Object.freeze({
    epoch: cohort.epoch + 1,
    failedKeys: Object.freeze([]),
    hiddenPaintedFrames: 0,
    key,
    loadedKeys: Object.freeze([]),
    status: key ? "loading" : "idle",
  });
}

export function recordNinjaOneEnvironmentFoliageNodeLoadEvent({
  cohort,
  epoch,
  event,
  key,
  resourceKey,
  resourceKeys,
}: {
  readonly cohort: NinjaOneEnvironmentFoliageNodeLoadCohort;
  readonly epoch: number;
  readonly event: "error" | "load";
  readonly key: string;
  readonly resourceKey: string;
  readonly resourceKeys: readonly string[];
}): NinjaOneEnvironmentFoliageNodeLoadCohort {
  validateNinjaOneEnvironmentFoliageResourceKeys(resourceKeys);
  if (
    epoch !== cohort.epoch
    || key !== cohort.key
    || !resourceKeys.includes(resourceKey)
    || cohort.status === "error"
    || cohort.status === "idle"
  ) return cohort;
  if (event === "error") {
    return Object.freeze({
      ...cohort,
      failedKeys: Object.freeze([...new Set([...cohort.failedKeys, resourceKey])]),
      status: "error",
    });
  }
  return Object.freeze({
    ...cohort,
    hiddenPaintedFrames: 0,
    loadedKeys: Object.freeze([...new Set([...cohort.loadedKeys, resourceKey])]),
    status: "loading",
  });
}

export function advanceNinjaOneEnvironmentFoliageHiddenPaintBarrier({
  cohort,
  resourceKeys,
}: {
  readonly cohort: NinjaOneEnvironmentFoliageNodeLoadCohort;
  readonly resourceKeys: readonly string[];
}): NinjaOneEnvironmentFoliageNodeLoadCohort {
  validateNinjaOneEnvironmentFoliageResourceKeys(resourceKeys);
  if (
    cohort.status !== "loading"
    || cohort.failedKeys.length > 0
    || cohort.loadedKeys.length !== resourceKeys.length
    || !cohort.loadedKeys.every((key) => resourceKeys.includes(key))
  ) return cohort;
  const hiddenPaintedFrames = Math.min(2, cohort.hiddenPaintedFrames + 1);
  return Object.freeze({
    ...cohort,
    hiddenPaintedFrames,
    status: hiddenPaintedFrames === 2 ? "ready" : "loading",
  });
}

export function observeNinjaOneEnvironmentFoliageDomResidency({
  cohortKey,
  epoch,
  mountedResourceIds,
  selectedResources,
  status,
}: {
  readonly cohortKey: string;
  readonly epoch: number;
  readonly mountedResourceIds: readonly string[];
  readonly selectedResources: readonly {
    readonly decodedBytes: number;
    readonly id: string;
  }[];
  readonly status: NinjaOneEnvironmentFoliageResidencyObservation["status"];
}): NinjaOneEnvironmentFoliageDomResidencyState {
  const selectedById = new Map(selectedResources.map((resource) => (
    [resource.id, resource] as const
  )));
  const uniqueMountedResourceIds = [...new Set(mountedResourceIds)].sort();
  const selectedDecodedBytes = selectedResources.reduce(
    (total, resource) => total + resource.decodedBytes,
    0,
  );
  return Object.freeze({
    cohortKey,
    epoch,
    mountedDecodedBytes: uniqueMountedResourceIds.reduce(
      (total, id) => total + (selectedById.get(id)?.decodedBytes ?? 0),
      0,
    ),
    mountedImageNodeCount: mountedResourceIds.length,
    mountedResourceIds: Object.freeze(uniqueMountedResourceIds),
    selectedDecodedBytes,
    selectedImageNodeCount: selectedResources.length,
    selectedResourceIds: Object.freeze(selectedResources.map(({ id }) => id)),
    status,
  });
}

export function resolveNinjaOneEnvironmentFoliageResidency({
  candidateDecodedBytes,
  candidateNodeCount,
  candidateResourceIds,
  expectedCohortKey,
  expectedEpoch,
  observation,
}: {
  readonly candidateDecodedBytes: number;
  readonly candidateNodeCount: number;
  readonly candidateResourceIds: readonly string[];
  readonly expectedCohortKey: string;
  readonly expectedEpoch: number;
  readonly observation: NinjaOneEnvironmentFoliageResidencyObservation | null;
}): NinjaOneEnvironmentFoliageResidencyResolution {
  if (
    !Number.isSafeInteger(candidateDecodedBytes)
    || candidateDecodedBytes < 0
    || !Number.isSafeInteger(candidateNodeCount)
    || candidateNodeCount < 0
    || !Number.isSafeInteger(expectedEpoch)
    || expectedEpoch < 0
    || typeof expectedCohortKey !== "string"
    || candidateResourceIds.some((id) => typeof id !== "string" || id.length === 0)
    || new Set(candidateResourceIds).size !== candidateResourceIds.length
  ) throw new TypeError("Native foliage residency inputs are invalid.");
  const observationIsCurrent = observation !== null
    && observation.epoch === expectedEpoch
    && observation.cohortKey === expectedCohortKey;
  if (candidateResourceIds.length === 0) {
    return Object.freeze({
      decodedBytes: 0,
      mounted: false,
      nodeCount: 0,
      phase: observationIsCurrent && observation.status === "error" ? "error" : "idle",
      resourceIds: Object.freeze([]),
    });
  }
  if (observationIsCurrent && observation.status === "error") {
    return Object.freeze({
      decodedBytes: 0,
      mounted: false,
      nodeCount: 0,
      phase: "error",
      resourceIds: Object.freeze([]),
    });
  }
  const mounted = observationIsCurrent
    && observation.status === "ready"
    && observation.mountedDecodedBytes === candidateDecodedBytes
    && observation.mountedImageNodeCount === candidateNodeCount
    && observation.mountedResourceIds.length === candidateResourceIds.length
    && observation.mountedResourceIds.every((id) => candidateResourceIds.includes(id));
  return Object.freeze({
    decodedBytes: candidateDecodedBytes,
    mounted,
    nodeCount: candidateNodeCount,
    phase: mounted ? "mounted" : "incoming",
    resourceIds: Object.freeze([...candidateResourceIds]),
  });
}

function decodedBytes(
  value: NinjaOneEnvironmentNativeResource | NinjaOneEnvironmentNativeTile,
): number {
  const [width, height] = value.dimensions;
  const bytes = width * height * 4;
  if (!Number.isSafeInteger(bytes) || bytes <= 0) {
    throw new RangeError(`${value.id} has an invalid decoded size.`);
  }
  return bytes;
}

export function ninjaOneEnvironmentNativeTileKey(
  tile: NinjaOneEnvironmentNativeTile,
): string {
  return `terrain:${tile.id}`;
}

export function ninjaOneEnvironmentNativeSupplementKey(
  instance: NinjaOneEnvironmentNativeInstance,
): string {
  return `supplement:${instance.resource.path}`;
}

function canonicalResourceKeys(resourceKeys: readonly string[]): readonly string[] {
  if (
    resourceKeys.some((key) => typeof key !== "string" || key.length === 0)
    || new Set(resourceKeys).size !== resourceKeys.length
  ) {
    throw new TypeError("Native decode cohort resource keys must be unique strings.");
  }
  return Object.freeze([...resourceKeys].sort());
}

function validateTargetDecodedBytes(decodedBytesValue: number): void {
  if (!Number.isSafeInteger(decodedBytesValue) || decodedBytesValue < 0) {
    throw new TypeError("Native decode cohort bytes must be a safe non-negative integer.");
  }
}

function decodeTarget(
  target: NinjaOneEnvironmentNativeDecodeTarget,
): {
  readonly decodedBytes: number;
  readonly key: string;
  readonly resourceKeys: readonly string[];
} {
  validateTargetDecodedBytes(target.decodedBytes);
  const resourceKeys = canonicalResourceKeys(target.resourceKeys);
  return Object.freeze({
    decodedBytes: target.decodedBytes,
    key: resourceKeys.join("|"),
    resourceKeys,
  });
}

export function createNinjaOneEnvironmentNativeDecodeCohort(
  target: NinjaOneEnvironmentNativeDecodeTarget,
  epoch = 0,
): NinjaOneEnvironmentNativeDecodeCohort {
  if (!Number.isSafeInteger(epoch) || epoch < 0) {
    throw new TypeError("Native decode cohort epoch must be a safe non-negative integer.");
  }
  const normalized = decodeTarget(target);
  return Object.freeze({
    decodedKeys: new Set<string>(),
    epoch,
    failedKeys: new Set<string>(),
    mountedDecodedBytes: normalized.decodedBytes,
    mountedKeys: normalized.resourceKeys,
    phase: "active" as const,
    retiringDecodedBytes: 0,
    retiringKeys: Object.freeze([]),
    targetDecodedBytes: normalized.decodedBytes,
    targetKey: normalized.key,
    targetKeys: normalized.resourceKeys,
  });
}

export function retargetNinjaOneEnvironmentNativeDecodeCohort(
  current: NinjaOneEnvironmentNativeDecodeCohort,
  target: NinjaOneEnvironmentNativeDecodeTarget,
): NinjaOneEnvironmentNativeDecodeCohort {
  const normalized = decodeTarget(target);
  if (
    current.targetKey === normalized.key
    && current.targetDecodedBytes === normalized.decodedBytes
  ) {
    return current;
  }
  return Object.freeze({
    decodedKeys: new Set<string>(),
    epoch: current.epoch + 1,
    failedKeys: new Set<string>(),
    mountedDecodedBytes: 0,
    mountedKeys: Object.freeze([]),
    phase: "evicting" as const,
    retiringDecodedBytes: current.phase === "active"
      ? current.mountedDecodedBytes
      : current.retiringDecodedBytes,
    retiringKeys: current.phase === "active"
      ? current.mountedKeys
      : current.retiringKeys,
    targetDecodedBytes: normalized.decodedBytes,
    targetKey: normalized.key,
    targetKeys: normalized.resourceKeys,
  });
}

export function activateNinjaOneEnvironmentNativeDecodeCohort(
  current: NinjaOneEnvironmentNativeDecodeCohort,
  epoch: number,
): NinjaOneEnvironmentNativeDecodeCohort {
  if (current.epoch !== epoch || current.phase !== "evicting") {
    return current;
  }
  return Object.freeze({
    ...current,
    mountedDecodedBytes: current.targetDecodedBytes,
    mountedKeys: current.targetKeys,
    phase: "active" as const,
    retiringDecodedBytes: 0,
    retiringKeys: Object.freeze([]),
  });
}

export function recordNinjaOneEnvironmentNativeDecodeEvent(
  current: NinjaOneEnvironmentNativeDecodeCohort,
  event: {
    readonly epoch: number;
    readonly resourceKey: string;
    readonly status: "decoded" | "failed";
    readonly targetKey: string;
  },
): NinjaOneEnvironmentNativeDecodeCohort {
  if (
    current.phase !== "active"
    || current.epoch !== event.epoch
    || current.targetKey !== event.targetKey
    || !current.mountedKeys.includes(event.resourceKey)
  ) {
    return current;
  }
  const decodedKeys = new Set(current.decodedKeys);
  const failedKeys = new Set(current.failedKeys);
  if (event.status === "decoded") {
    decodedKeys.add(event.resourceKey);
    failedKeys.delete(event.resourceKey);
  } else {
    decodedKeys.delete(event.resourceKey);
    failedKeys.add(event.resourceKey);
  }
  if (
    decodedKeys.size === current.decodedKeys.size
    && failedKeys.size === current.failedKeys.size
  ) {
    return current;
  }
  return Object.freeze({ ...current, decodedKeys, failedKeys });
}

function requiredPresentationTarget(
  target: NinjaOneEnvironmentRequiredPresentationTarget,
): {
  readonly key: string;
  readonly requiredKeys: readonly string[];
} {
  if (
    typeof target.terrainCohortKey !== "string"
  ) {
    throw new TypeError("Required presentation terrain cohort key is invalid.");
  }
  const requiredKeys = canonicalResourceKeys(target.requiredKeys);
  return Object.freeze({
    key: [
      `terrain:${target.terrainCohortKey}`,
      ...requiredKeys.map((key) => `required:${key}`),
    ].join("|"),
    requiredKeys,
  });
}

export function ninjaOneEnvironmentRequiredPresentationKey(
  kind: "coast" | "seam",
  resources: readonly NinjaOneEnvironmentRequiredResourceIdentity[],
): string {
  if (resources.length === 0) {
    throw new TypeError("Required presentation resource identity cannot be empty.");
  }
  const identities = resources.map(({ path: resourcePath, sha256 }) => {
    if (
      typeof resourcePath !== "string"
      || resourcePath.length === 0
      || !/^[a-f\d]{64}$/i.test(sha256)
    ) {
      throw new TypeError("Required presentation resource identity is invalid.");
    }
    return Object.freeze({ path: resourcePath, sha256: sha256.toUpperCase() });
  }).sort((left, right) => (
    left.path.localeCompare(right.path) || left.sha256.localeCompare(right.sha256)
  ));
  if (new Set(identities.map(({ path, sha256 }) => `${path}\t${sha256}`)).size
    !== identities.length) {
    throw new TypeError("Required presentation resource identities must be unique.");
  }
  return `${kind}:${JSON.stringify(identities)}`;
}

export function createNinjaOneEnvironmentRequiredPresentationCohort(
  target: NinjaOneEnvironmentRequiredPresentationTarget,
  epoch = 0,
): NinjaOneEnvironmentRequiredPresentationCohort {
  if (!Number.isSafeInteger(epoch) || epoch < 0) {
    throw new TypeError(
      "Required presentation epoch must be a safe non-negative integer.",
    );
  }
  const normalized = requiredPresentationTarget(target);
  return Object.freeze({
    epoch,
    failedKeys: new Set<string>(),
    readyKeys: new Set<string>(),
    requiredKeys: normalized.requiredKeys,
    targetKey: normalized.key,
  });
}

export function retargetNinjaOneEnvironmentRequiredPresentationCohort(
  current: NinjaOneEnvironmentRequiredPresentationCohort,
  target: NinjaOneEnvironmentRequiredPresentationTarget,
): NinjaOneEnvironmentRequiredPresentationCohort {
  const normalized = requiredPresentationTarget(target);
  if (current.targetKey === normalized.key) return current;
  const readyKeys = new Set(normalized.requiredKeys.filter((key) => (
    current.requiredKeys.includes(key) && current.readyKeys.has(key)
  )));
  const failedKeys = new Set(normalized.requiredKeys.filter((key) => (
    current.requiredKeys.includes(key) && current.failedKeys.has(key)
  )));
  return Object.freeze({
    epoch: current.epoch + 1,
    failedKeys,
    readyKeys,
    requiredKeys: normalized.requiredKeys,
    targetKey: normalized.key,
  });
}

export function recordNinjaOneEnvironmentRequiredPresentationEvent(
  current: NinjaOneEnvironmentRequiredPresentationCohort,
  event: {
    readonly epoch: number;
    readonly requiredKey: string;
    readonly status: NinjaOneEnvironmentRequiredPresentationStatus;
    readonly targetKey: string;
  },
): NinjaOneEnvironmentRequiredPresentationCohort {
  if (
    current.epoch !== event.epoch
    || current.targetKey !== event.targetKey
    || !current.requiredKeys.includes(event.requiredKey)
  ) {
    return current;
  }
  const readyKeys = new Set(current.readyKeys);
  const failedKeys = new Set(current.failedKeys);
  if (event.status === "ready") {
    readyKeys.add(event.requiredKey);
    failedKeys.delete(event.requiredKey);
  } else if (event.status === "error") {
    readyKeys.delete(event.requiredKey);
    failedKeys.add(event.requiredKey);
  } else {
    readyKeys.delete(event.requiredKey);
    failedKeys.delete(event.requiredKey);
  }
  if (
    readyKeys.size === current.readyKeys.size
    && failedKeys.size === current.failedKeys.size
  ) return current;
  return Object.freeze({ ...current, failedKeys, readyKeys });
}

export function resolveNinjaOneEnvironmentRequiredPresentation({
  cohort,
  lowerDetailAvailable,
  terrainState,
}: {
  readonly cohort: NinjaOneEnvironmentRequiredPresentationCohort;
  readonly lowerDetailAvailable: boolean;
  readonly terrainState: NinjaOneEnvironmentNativePresentation["state"];
}): NinjaOneEnvironmentRequiredPresentation {
  const requiredFailed = cohort.requiredKeys.some((key) => cohort.failedKeys.has(key));
  const requiredReady = cohort.requiredKeys.every((key) => cohort.readyKeys.has(key));
  const visible = terrainState === "ready" && requiredReady && !requiredFailed;
  return Object.freeze({
    lowerDetailRequired: !visible,
    noVisibleGap: visible || lowerDetailAvailable,
    state: requiredFailed
      ? "error"
      : visible
        ? "ready"
        : terrainState === "budget-blocked"
          ? "budget-blocked"
          : terrainState === "idle"
            ? "idle"
            : "loading",
    visible,
  });
}

export function resolveNinjaOneEnvironmentNativeDemand({
  active,
  camera,
  previousDemand,
  shouldLoadCloseAssets,
}: {
  readonly active: boolean;
  readonly camera: CameraView;
  readonly previousDemand: boolean;
  readonly shouldLoadCloseAssets: boolean;
}): boolean {
  if (!active) {
    return false;
  }
  const span = Math.max(...camera.span);
  return previousDemand
    ? span <= NINJAONE_ENVIRONMENT_NATIVE_RELEASE_SPAN
    : shouldLoadCloseAssets
      && span <= DETAIL_POLICY.closeAssetPreloadSpan;
}

function emptyPlan(demand: boolean): NinjaOneEnvironmentNativeResidencyPlan {
  return Object.freeze({
    admitted: true,
    decodedBytes: 0,
    demand,
    fullyCovered: true,
    supplementalInstances: Object.freeze([]),
    terrainTiles: Object.freeze([]),
    visibleTerrainTileCount: 0,
  });
}

export function admitNinjaOneEnvironmentNativeCandidates({
  demand,
  limits = NINJAONE_ENVIRONMENT_NATIVE_RESIDENCY_LIMITS,
  supplementalInstances,
  terrainTiles,
  visibleTerrainTileCount = terrainTiles.length,
}: {
  readonly demand: boolean;
  readonly limits?: NinjaOneEnvironmentNativeResidencyLimits;
  readonly supplementalInstances:
    readonly NinjaOneEnvironmentNativeInstance[];
  readonly terrainTiles: readonly NinjaOneEnvironmentNativeTile[];
  readonly visibleTerrainTileCount?: number;
}): NinjaOneEnvironmentNativeResidencyPlan {
  if (!demand) {
    return emptyPlan(false);
  }
  if (
    !Number.isInteger(limits.maximumTerrainTiles)
    || limits.maximumTerrainTiles <= 0
    || !Number.isInteger(limits.maximumSupplementalNodes)
    || limits.maximumSupplementalNodes < 0
    || !Number.isSafeInteger(limits.maximumDecodedBytes)
    || limits.maximumDecodedBytes <= 0
  ) {
    throw new TypeError("NinjaOne native residency limits are invalid.");
  }

  const selectedTerrain = terrainTiles.slice(0, limits.maximumTerrainTiles);
  const terrainBytes = selectedTerrain.reduce(
    (total, tile) => total + decodedBytes(tile),
    0,
  );
  const fullyCovered = visibleTerrainTileCount <= limits.maximumTerrainTiles;
  if (terrainBytes > limits.maximumDecodedBytes) {
    return Object.freeze({
      admitted: false,
      decodedBytes: 0,
      demand: true,
      fullyCovered: false,
      supplementalInstances: Object.freeze([]),
      terrainTiles: Object.freeze([]),
      visibleTerrainTileCount,
    });
  }

  const selectedSupplements: NinjaOneEnvironmentNativeInstance[] = [];
  const admittedResourcePaths = new Set<string>();
  let admittedBytes = terrainBytes;
  for (const instance of supplementalInstances) {
    if (selectedSupplements.length >= limits.maximumSupplementalNodes) {
      break;
    }
    const resourceBytes = admittedResourcePaths.has(instance.resource.path)
      ? 0
      : decodedBytes(instance.resource);
    if (admittedBytes + resourceBytes > limits.maximumDecodedBytes) {
      continue;
    }
    selectedSupplements.push(instance);
    admittedBytes += resourceBytes;
    admittedResourcePaths.add(instance.resource.path);
  }

  return Object.freeze({
    admitted: true,
    decodedBytes: admittedBytes,
    demand: true,
    fullyCovered,
    supplementalInstances: Object.freeze(selectedSupplements),
    terrainTiles: Object.freeze(selectedTerrain),
    visibleTerrainTileCount,
  });
}

export function planNinjaOneEnvironmentNativeResidency({
  camera,
  demand,
  supplementalCandidates,
}: {
  readonly camera: CameraView;
  readonly demand: boolean;
  readonly supplementalCandidates:
    readonly NinjaOneEnvironmentNativeInstance[];
}): NinjaOneEnvironmentNativeResidencyPlan {
  if (!demand) {
    return emptyPlan(false);
  }
  const terrainCandidates = selectNinjaOneEnvironmentNativeTileCandidates(
    camera,
  );
  const terrainTileIds = new Set(terrainCandidates.map(({ id }) => id));
  const supplementalInstances = selectNinjaOneEnvironmentNativeInstances(
    camera,
    supplementalCandidates,
  ).filter(({ tileId }) => terrainTileIds.has(tileId));
  return admitNinjaOneEnvironmentNativeCandidates({
    demand,
    supplementalInstances,
    terrainTiles: terrainCandidates,
    visibleTerrainTileCount: terrainCandidates.length,
  });
}

export function resolveNinjaOneEnvironmentNativePresentation({
  decodedKeys,
  failedKeys = new Set(),
  lowerDetailAvailable,
  plan,
}: {
  readonly decodedKeys: ReadonlySet<string>;
  readonly failedKeys?: ReadonlySet<string>;
  readonly lowerDetailAvailable: boolean;
  readonly plan: NinjaOneEnvironmentNativeResidencyPlan;
}): NinjaOneEnvironmentNativePresentation {
  if (!plan.demand || plan.terrainTiles.length === 0) {
    const budgetBlocked = plan.demand && !plan.admitted;
    return Object.freeze({
      lowerDetailRequired: true,
      noVisibleGap: lowerDetailAvailable,
      presentedSupplementalIds: Object.freeze([]),
      presentedTerrainIds: Object.freeze([]),
      state: budgetBlocked ? "budget-blocked" : "idle",
      visible: false,
    });
  }

  const terrainKeys = plan.terrainTiles.map(
    ninjaOneEnvironmentNativeTileKey,
  );
  const terrainFailed = terrainKeys.some((key) => failedKeys.has(key));
  const terrainReady = plan.admitted
    && plan.fullyCovered
    && !terrainFailed
    && terrainKeys.every((key) => decodedKeys.has(key));
  const presentedSupplements = terrainReady
    ? plan.supplementalInstances.filter((instance) => (
      decodedKeys.has(ninjaOneEnvironmentNativeSupplementKey(instance))
      && !failedKeys.has(ninjaOneEnvironmentNativeSupplementKey(instance))
    ))
    : [];

  return Object.freeze({
    lowerDetailRequired: !terrainReady,
    noVisibleGap: terrainReady || lowerDetailAvailable,
    presentedSupplementalIds: Object.freeze(
      presentedSupplements.map(({ id }) => id),
    ),
    presentedTerrainIds: terrainReady
      ? Object.freeze(plan.terrainTiles.map(({ id }) => id))
      : Object.freeze([]),
    state: terrainReady ? "ready" : "loading",
    visible: terrainReady,
  });
}
