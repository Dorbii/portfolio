import type { CameraView } from "../../../shared/camera.ts";
import {
  ninjaOneEnvironmentNativeHydrologyAdmissionIsCurrent,
  ninjaOneEnvironmentNativeHydrologyResourceKey,
  type NinjaOneEnvironmentNativeHydrologyAdmissionResource,
  type NinjaOneEnvironmentNativeHydrologyAdmissionSnapshot,
} from "../../../development/model/ninjaOneEnvironmentResidency.ts";
import type {
  NinjaOneHydrologyRegionResource,
  NinjaOneHydrologyTierId,
} from "../model/assets.ts";

export function retainTextureTransientPeak(
  currentPeakBytes: number,
  ...plannedOrObservedBytes: readonly number[]
): number {
  const candidates = [currentPeakBytes, ...plannedOrObservedBytes];
  if (candidates.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new RangeError("Texture transient byte counts must be finite and non-negative.");
  }
  return Math.max(...candidates);
}

export function viewIntersectsHydrologyRegistration(
  camera: Readonly<{
    origin: readonly [number, number];
    span: readonly [number, number];
  }>,
  worldOrigin: readonly [number, number],
  worldSpan: readonly [number, number],
): boolean {
  const [left, top] = camera.origin;
  const [width, height] = camera.span;
  const [hydrologyLeft, hydrologyTop] = worldOrigin;
  const [hydrologyWidth, hydrologyHeight] = worldSpan;
  return left < hydrologyLeft + hydrologyWidth
    && left + width > hydrologyLeft
    && top < hydrologyTop + hydrologyHeight
    && top + height > hydrologyTop;
}

export interface RegionalHydrologySelectionRegion {
  readonly id: string;
  readonly worldBounds: Readonly<{
    origin: readonly [number, number];
    span: readonly [number, number];
  }>;
}

export type RegionalHydrologyPlanReason =
  | "capability"
  | "native-union"
  | "no-regions"
  | "region-limit"
  | "stale-admission";

export interface RegionalHydrologyCohortPlan {
  readonly decodedBytes: number;
  readonly incomingDecodedBytes: number;
  readonly nativeUnionSteadyBytes: number;
  readonly nativeUnionTransitionBytes: number;
  readonly reason: RegionalHydrologyPlanReason | null;
  readonly regionIds: readonly string[];
  readonly resources: readonly NinjaOneHydrologyRegionResource[];
  readonly snapshotEpoch: number;
  readonly targetKey: string;
  readonly tier: NinjaOneHydrologyTierId | null;
}

export interface RegionalHydrologyLoadState {
  readonly error: string | null;
  readonly mountedKey: string | null;
  readonly phase: "failed" | "idle" | "loading" | "ready";
  readonly requestEpoch: number;
  readonly targetKey: string | null;
}

export interface RegionalHydrologyLoadToken {
  readonly requestEpoch: number;
  readonly targetKey: string;
}

export type RegionalHydrologyVisibilityPhase =
  | "fading-in"
  | "fading-out"
  | "stable"
  | "zero";

export interface RegionalHydrologyVisibilityState {
  readonly fromOpacity: number;
  readonly opacity: number;
  readonly phase: RegionalHydrologyVisibilityPhase;
  readonly startedAtSeconds: number;
}

export interface RegionalHydrologyVisibilityStep {
  readonly releaseResidentCohort: boolean;
  readonly state: RegionalHydrologyVisibilityState;
}

export function regionalHydrologyCohortIdentity(
  resources: readonly NinjaOneHydrologyRegionResource[],
): string {
  return resources
    .map(hydrologyResourceIdentity)
    .sort()
    .join("\n");
}

export function regionalHydrologyCohortChangeRequiresFade(
  currentResources: readonly NinjaOneHydrologyRegionResource[],
  nextResources: readonly NinjaOneHydrologyRegionResource[],
): boolean {
  return currentResources.length > 0
    && regionalHydrologyCohortIdentity(currentResources)
      !== regionalHydrologyCohortIdentity(nextResources);
}

export interface RegionalHydrologyDecodeBarrierSnapshot {
  readonly activeDecodedBytes: number;
  readonly activeGeneration: number | null;
  readonly activeNativeUnionBytes: number;
  readonly activeResources: readonly RegionalHydrologyDecodeResource[];
  readonly activeTargetKey: string | null;
  readonly activeTier: NinjaOneHydrologyTierId | null;
  readonly latestGeneration: number;
  readonly pendingDecodedBytes: number;
  readonly pendingGeneration: number | null;
  readonly pendingNativeUnionBytes: number;
  readonly pendingResources: readonly RegionalHydrologyDecodeResource[];
  readonly pendingTargetKey: string | null;
  readonly pendingTier: NinjaOneHydrologyTierId | null;
  readonly phase: "decoding" | "idle" | "waiting";
}

export type RegionalHydrologyDecodeResource = Readonly<{
  decodedBytes: number;
  id: string;
  path: string;
  sha256: string;
}>;

export interface RegionalHydrologyDecodeRequestInput {
  readonly nativeUnionBytes: number;
  readonly resources: readonly RegionalHydrologyDecodeResource[];
  readonly targetKey: string;
  readonly tier: NinjaOneHydrologyTierId;
}

export type RegionalHydrologyDecodeOutcome = Readonly<{
  generation: number;
  status:
    | "completed"
    | "failed"
    | "stale-failed"
    | "stale-settled"
    | "superseded-before-start";
}>;

interface RegionalHydrologyDecodeRequest {
  readonly decodedBytes: number;
  readonly generation: number;
  readonly nativeUnionBytes: number;
  readonly resources: readonly RegionalHydrologyDecodeResource[];
  readonly targetKey: string;
  readonly tier: NinjaOneHydrologyTierId;
}

export const REGIONAL_HYDROLOGY_VISIBILITY_FADE_SECONDS = 0.12;

export class RegionalHydrologyDecodeBarrier {
  private activeRequest: RegionalHydrologyDecodeRequest | null = null;
  private latestGeneration = 0;
  private readonly listeners = new Set<() => void>();
  private pendingRequest: RegionalHydrologyDecodeRequest | null = null;
  private tail: Promise<void> = Promise.resolve();

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    listener();
    return () => this.listeners.delete(listener);
  }

  snapshot(): RegionalHydrologyDecodeBarrierSnapshot {
    return Object.freeze({
      activeDecodedBytes: this.activeRequest?.decodedBytes ?? 0,
      activeGeneration: this.activeRequest?.generation ?? null,
      activeNativeUnionBytes: this.activeRequest?.nativeUnionBytes ?? 0,
      activeResources: this.activeRequest?.resources ?? Object.freeze([]),
      activeTargetKey: this.activeRequest?.targetKey ?? null,
      activeTier: this.activeRequest?.tier ?? null,
      latestGeneration: this.latestGeneration,
      pendingDecodedBytes: this.pendingRequest?.decodedBytes ?? 0,
      pendingGeneration: this.pendingRequest?.generation ?? null,
      pendingNativeUnionBytes: this.pendingRequest?.nativeUnionBytes ?? 0,
      pendingResources: this.pendingRequest?.resources ?? Object.freeze([]),
      pendingTargetKey: this.pendingRequest?.targetKey ?? null,
      pendingTier: this.pendingRequest?.tier ?? null,
      phase: this.activeRequest
        ? "decoding"
        : this.pendingRequest ? "waiting" : "idle",
    });
  }

  enqueue(
    input: RegionalHydrologyDecodeRequestInput,
    run: () => Promise<void>,
  ): Promise<RegionalHydrologyDecodeOutcome> {
    const resources = Object.freeze(input.resources.map((resource) => Object.freeze({
      decodedBytes: resource.decodedBytes,
      id: resource.id,
      path: resource.path,
      sha256: resource.sha256,
    })));
    const decodedBytes = resources.reduce(
      (total, resource) => total + resource.decodedBytes,
      0,
    );
    const resourceKeys = resources.map((resource) => (
      `${resource.id}\t${resource.path}#sha256=${resource.sha256}`
    ));
    if (
      !input.targetKey
      || !safeByteCount(decodedBytes)
      || !safeByteCount(input.nativeUnionBytes)
      || input.nativeUnionBytes < decodedBytes
      || resources.length === 0
      || resources.some((resource) => (
        !resource.id
        || !resource.path
        || !/^[A-F\d]{64}$/.test(resource.sha256)
        || !safeByteCount(resource.decodedBytes)
        || resource.decodedBytes === 0
      ))
      || new Set(resourceKeys).size !== resourceKeys.length
    ) {
      throw new TypeError("Hydrology decode requests need exact unique resource ownership.");
    }
    const request = Object.freeze({
      decodedBytes,
      generation: this.latestGeneration + 1,
      nativeUnionBytes: input.nativeUnionBytes,
      resources,
      targetKey: input.targetKey,
      tier: input.tier,
    });
    this.latestGeneration = request.generation;
    this.pendingRequest = request;
    this.emit();

    const completion = this.tail.then(async () => {
      if (request.generation !== this.latestGeneration) {
        return Object.freeze({
          generation: request.generation,
          status: "superseded-before-start",
        }) as RegionalHydrologyDecodeOutcome;
      }
      if (this.pendingRequest?.generation === request.generation) {
        this.pendingRequest = null;
      }
      this.activeRequest = request;
      this.emit();
      try {
        await run();
        return Object.freeze({
          generation: request.generation,
          status: request.generation === this.latestGeneration
            ? "completed"
            : "stale-settled",
        }) as RegionalHydrologyDecodeOutcome;
      } catch {
        return Object.freeze({
          generation: request.generation,
          status: request.generation === this.latestGeneration
            ? "failed"
            : "stale-failed",
        }) as RegionalHydrologyDecodeOutcome;
      } finally {
        if (this.activeRequest?.generation === request.generation) {
          this.activeRequest = null;
        }
        this.emit();
      }
    });
    this.tail = completion.then(() => undefined);
    return completion;
  }

  cancel(): void {
    this.latestGeneration += 1;
    this.pendingRequest = null;
    this.emit();
  }

  whenSettled(): Promise<void> {
    return this.tail;
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

export const regionalHydrologyDecodeCoordinator =
  new RegionalHydrologyDecodeBarrier();

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function createRegionalHydrologyVisibilityState():
RegionalHydrologyVisibilityState {
  return Object.freeze({
    fromOpacity: 1,
    opacity: 1,
    phase: "stable",
    startedAtSeconds: 0,
  });
}

export function beginRegionalHydrologyFadeOut(
  state: RegionalHydrologyVisibilityState,
  elapsedSeconds: number,
  reduceMotion: boolean,
): RegionalHydrologyVisibilityStep {
  if (reduceMotion) {
    return Object.freeze({
      releaseResidentCohort: true,
      state: Object.freeze({
        fromOpacity: 0,
        opacity: 0,
        phase: "zero",
        startedAtSeconds: elapsedSeconds,
      }),
    });
  }
  if (state.phase === "fading-out" || state.phase === "zero") {
    return Object.freeze({ releaseResidentCohort: false, state });
  }
  return Object.freeze({
    releaseResidentCohort: false,
    state: Object.freeze({
      fromOpacity: state.opacity,
      opacity: state.opacity,
      phase: "fading-out",
      startedAtSeconds: elapsedSeconds,
    }),
  });
}

export function beginRegionalHydrologyFadeIn(
  state: RegionalHydrologyVisibilityState,
  elapsedSeconds: number,
  reduceMotion: boolean,
): RegionalHydrologyVisibilityState {
  if (reduceMotion || state.opacity >= 1) {
    return createRegionalHydrologyVisibilityState();
  }
  if (state.phase === "fading-in") return state;
  return Object.freeze({
    fromOpacity: state.opacity,
    opacity: state.opacity,
    phase: "fading-in",
    startedAtSeconds: elapsedSeconds,
  });
}

export function advanceRegionalHydrologyVisibility(
  state: RegionalHydrologyVisibilityState,
  elapsedSeconds: number,
  reduceMotion: boolean,
): RegionalHydrologyVisibilityStep {
  if (state.phase === "stable" || state.phase === "zero") {
    return Object.freeze({ releaseResidentCohort: false, state });
  }
  if (reduceMotion) {
    return state.phase === "fading-out"
      ? beginRegionalHydrologyFadeOut(state, elapsedSeconds, true)
      : Object.freeze({
          releaseResidentCohort: false,
          state: createRegionalHydrologyVisibilityState(),
        });
  }
  const progress = clampUnit(
    (elapsedSeconds - state.startedAtSeconds)
      / REGIONAL_HYDROLOGY_VISIBILITY_FADE_SECONDS,
  );
  if (state.phase === "fading-out") {
    if (progress >= 1) {
      return Object.freeze({
        releaseResidentCohort: true,
        state: Object.freeze({
          fromOpacity: 0,
          opacity: 0,
          phase: "zero",
          startedAtSeconds: elapsedSeconds,
        }),
      });
    }
    return Object.freeze({
      releaseResidentCohort: false,
      state: Object.freeze({
        ...state,
        opacity: state.fromOpacity * (1 - progress),
      }),
    });
  }
  if (progress >= 1) {
    return Object.freeze({
      releaseResidentCohort: false,
      state: createRegionalHydrologyVisibilityState(),
    });
  }
  return Object.freeze({
    releaseResidentCohort: false,
    state: Object.freeze({
      ...state,
      opacity: state.fromOpacity + (1 - state.fromOpacity) * progress,
    }),
  });
}

function safeByteCount(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function validAdmissionResource(
  resource: NinjaOneEnvironmentNativeHydrologyAdmissionResource,
): boolean {
  return typeof resource.id === "string"
    && resource.id.length > 0
    && typeof resource.path === "string"
    && resource.path.length > 0
    && /^[A-F\d]{64}$/.test(resource.sha256)
    && Number.isSafeInteger(resource.decodedBytes)
    && resource.decodedBytes > 0
    && Number.isSafeInteger(resource.nodeCount)
    && resource.nodeCount > 0
    && (
      resource.phase === "incoming"
      || resource.phase === "mounted"
      || resource.phase === "retiring"
    );
}

function hydrologyResourceIdentity(
  resource: NinjaOneHydrologyRegionResource,
): string {
  return `${resource.id}\t${resource.path}#sha256=${resource.sha256}`;
}

function sumAdmissionResources(
  resources: readonly NinjaOneEnvironmentNativeHydrologyAdmissionResource[],
): Readonly<{ decodedBytes: number; nodeCount: number }> {
  return Object.freeze(resources.reduce((totals, resource) => ({
    decodedBytes: totals.decodedBytes + resource.decodedBytes,
    nodeCount: totals.nodeCount + resource.nodeCount,
  }), { decodedBytes: 0, nodeCount: 0 }));
}

export function nativeHydrologyAdmissionSnapshotIsUsable(
  snapshot: NinjaOneEnvironmentNativeHydrologyAdmissionSnapshot | null,
  camera: CameraView,
  minimumEpoch: number,
): snapshot is NinjaOneEnvironmentNativeHydrologyAdmissionSnapshot {
  if (!ninjaOneEnvironmentNativeHydrologyAdmissionIsCurrent(
    snapshot,
    camera,
    minimumEpoch,
  )) {
    return false;
  }
  const current = sumAdmissionResources(snapshot.resources);
  const target = sumAdmissionResources(snapshot.targetResources);
  const resourceIds = snapshot.resources.map(({ id }) => id);
  const targetIds = snapshot.targetResources.map(({ id }) => id);
  const resourceIdentities = snapshot.resources.map(({ path, sha256 }) => (
    `${path}\t${sha256}`
  ));
  const targetIdentities = snapshot.targetResources.map(({ path, sha256 }) => (
    `${path}\t${sha256}`
  ));
  return snapshot.demand
    && snapshot.registrationIntersects
    && snapshot.presentationReady
    && Number.isSafeInteger(snapshot.epoch)
    && snapshot.epoch >= minimumEpoch
    && snapshot.resources.every(validAdmissionResource)
    && snapshot.targetResources.every(validAdmissionResource)
    && safeByteCount(snapshot.currentDecodedBytes)
    && safeByteCount(snapshot.targetDecodedBytes)
    && safeByteCount(snapshot.reservedDecodedBytes)
    && safeByteCount(snapshot.currentNodeCount)
    && safeByteCount(snapshot.targetNodeCount)
    && safeByteCount(snapshot.reservedNodeCount)
    && safeByteCount(snapshot.requiredNodeCount)
    && safeByteCount(snapshot.optionalNodeCount)
    && snapshot.currentDecodedBytes === current.decodedBytes
    && snapshot.targetDecodedBytes === target.decodedBytes
    && snapshot.currentNodeCount === current.nodeCount
    && snapshot.targetNodeCount === target.nodeCount
    && snapshot.requiredNodeCount + snapshot.optionalNodeCount
      === snapshot.targetNodeCount
    && snapshot.reservedDecodedBytes === Math.max(
      snapshot.currentDecodedBytes,
      snapshot.targetDecodedBytes,
    )
    && snapshot.reservedNodeCount === Math.max(
      snapshot.currentNodeCount,
      snapshot.targetNodeCount,
    )
    && new Set(resourceIds).size === resourceIds.length
    && new Set(targetIds).size === targetIds.length
    && new Set(resourceIdentities).size === resourceIdentities.length
    && new Set(targetIdentities).size === targetIdentities.length
    && snapshot.currentResourceKey
      === ninjaOneEnvironmentNativeHydrologyResourceKey(snapshot.resources)
    && snapshot.targetResourceKey
      === ninjaOneEnvironmentNativeHydrologyResourceKey(snapshot.targetResources);
}

export function selectRegionalHydrologyRegionIds(
  camera: CameraView,
  regions: readonly RegionalHydrologySelectionRegion[],
): readonly string[] {
  return Object.freeze(regions.filter(({ worldBounds }) => (
    viewIntersectsHydrologyRegistration(
      camera,
      worldBounds.origin,
      worldBounds.span,
    )
  )).map(({ id }) => id).sort());
}

function planRegionalHydrologyTier({
  currentResources,
  maximumDecodedBytes,
  maximumTextureSize,
  regionIds,
  resources,
  snapshot,
  tier,
}: {
  readonly currentResources: readonly NinjaOneHydrologyRegionResource[];
  readonly maximumDecodedBytes: number;
  readonly maximumTextureSize: number;
  readonly regionIds: readonly string[];
  readonly resources: readonly NinjaOneHydrologyRegionResource[];
  readonly snapshot: NinjaOneEnvironmentNativeHydrologyAdmissionSnapshot;
  readonly tier: NinjaOneHydrologyTierId;
}): RegionalHydrologyCohortPlan {
  const selectedResources = Object.freeze(regionIds.map((regionId) => {
    const matches = resources.filter((resource) => resource.regionId === regionId);
    if (matches.length !== 1) {
      throw new Error(`${tier} hydrology region ${regionId} is not unique.`);
    }
    return matches[0];
  }));
  const decodedBytes = selectedResources.reduce(
    (total, resource) => total + resource.decodedBytes,
    0,
  );
  const currentIdentities = new Set(currentResources.map(hydrologyResourceIdentity));
  const incomingDecodedBytes = selectedResources.reduce((total, resource) => (
    total + (currentIdentities.has(hydrologyResourceIdentity(resource))
      ? 0
      : resource.decodedBytes)
  ), 0);
  const currentDecodedBytes = currentResources.reduce(
    (total, resource) => total + resource.decodedBytes,
    0,
  );
  const nativeUnionSteadyBytes = snapshot.reservedDecodedBytes + decodedBytes;
  const nativeUnionTransitionBytes = snapshot.reservedDecodedBytes
    + currentDecodedBytes
    + incomingDecodedBytes;
  const capabilityBlocked = selectedResources.some(({ dimensions }) => (
    dimensions.some((dimension) => dimension > maximumTextureSize)
  ));
  const reason = capabilityBlocked
    ? "capability"
    : Math.max(nativeUnionSteadyBytes, nativeUnionTransitionBytes)
      > maximumDecodedBytes
      ? "native-union"
      : null;
  return Object.freeze({
    decodedBytes,
    incomingDecodedBytes,
    nativeUnionSteadyBytes,
    nativeUnionTransitionBytes,
    reason,
    regionIds,
    resources: selectedResources,
    snapshotEpoch: snapshot.epoch,
    targetKey: [
      snapshot.epoch,
      snapshot.targetResourceKey,
      tier,
      ...selectedResources.map(hydrologyResourceIdentity),
    ].join("|"),
    tier,
  });
}

export function planRegionalHydrologyCohort({
  camera,
  currentResources,
  detailResources,
  fallbackResources,
  maximumDecodedBytes,
  maximumMountedRegions,
  maximumTextureSize,
  minimumSnapshotEpoch,
  skipDetail = false,
  regions,
  snapshot,
}: {
  readonly camera: CameraView;
  readonly currentResources: readonly NinjaOneHydrologyRegionResource[];
  readonly detailResources: readonly NinjaOneHydrologyRegionResource[];
  readonly fallbackResources: readonly NinjaOneHydrologyRegionResource[];
  readonly maximumDecodedBytes: number;
  readonly maximumMountedRegions: number;
  readonly maximumTextureSize: number;
  readonly minimumSnapshotEpoch: number;
  readonly skipDetail?: boolean;
  readonly regions: readonly RegionalHydrologySelectionRegion[];
  readonly snapshot: NinjaOneEnvironmentNativeHydrologyAdmissionSnapshot | null;
}): RegionalHydrologyCohortPlan {
  const regionIds = selectRegionalHydrologyRegionIds(camera, regions);
  const rejected = (
    reason: RegionalHydrologyPlanReason,
  ): RegionalHydrologyCohortPlan => Object.freeze({
    decodedBytes: 0,
    incomingDecodedBytes: 0,
    nativeUnionSteadyBytes: snapshot?.reservedDecodedBytes ?? 0,
    nativeUnionTransitionBytes: snapshot?.reservedDecodedBytes ?? 0,
    reason,
    regionIds,
    resources: Object.freeze([]),
    snapshotEpoch: snapshot?.epoch ?? minimumSnapshotEpoch,
    targetKey: "",
    tier: null,
  });
  if (regionIds.length === 0) return rejected("no-regions");
  if (regionIds.length > maximumMountedRegions) return rejected("region-limit");
  if (!nativeHydrologyAdmissionSnapshotIsUsable(
    snapshot,
    camera,
    minimumSnapshotEpoch,
  )) {
    return rejected("stale-admission");
  }
  const detail = planRegionalHydrologyTier({
    currentResources,
    maximumDecodedBytes,
    maximumTextureSize,
    regionIds,
    resources: detailResources,
    snapshot,
    tier: "detail",
  });
  if (!skipDetail && detail.reason === null) return detail;
  const fallback = planRegionalHydrologyTier({
    currentResources,
    maximumDecodedBytes,
    maximumTextureSize,
    regionIds,
    resources: fallbackResources,
    snapshot,
    tier: "fallback",
  });
  return fallback.reason === null ? fallback : Object.freeze({
    ...fallback,
    reason: fallback.reason,
    targetKey: "",
    tier: null,
  });
}

export function createRegionalHydrologyLoadState(): RegionalHydrologyLoadState {
  return Object.freeze({
    error: null,
    mountedKey: null,
    phase: "idle",
    requestEpoch: 0,
    targetKey: null,
  });
}

export function retargetRegionalHydrologyLoad(
  state: RegionalHydrologyLoadState,
  targetKey: string | null,
): Readonly<{
  state: RegionalHydrologyLoadState;
  token: RegionalHydrologyLoadToken | null;
}> {
  if (targetKey === null) {
    return Object.freeze({
      state: Object.freeze({
        error: null,
        mountedKey: null,
        phase: "idle",
        requestEpoch: state.requestEpoch + 1,
        targetKey: null,
      }),
      token: null,
    });
  }
  if (targetKey === state.targetKey && state.phase !== "failed") {
    return Object.freeze({ state, token: null });
  }
  const token = Object.freeze({
    requestEpoch: state.requestEpoch + 1,
    targetKey,
  });
  return Object.freeze({
    state: Object.freeze({
      error: null,
      mountedKey: state.mountedKey,
      phase: "loading",
      requestEpoch: token.requestEpoch,
      targetKey,
    }),
    token,
  });
}

export function regionalHydrologyLoadMaySettle(
  state: RegionalHydrologyLoadState,
  token: RegionalHydrologyLoadToken,
): boolean {
  return state.requestEpoch === token.requestEpoch
    && state.targetKey === token.targetKey;
}

export function settleRegionalHydrologyLoad(
  state: RegionalHydrologyLoadState,
  token: RegionalHydrologyLoadToken,
  outcome: Readonly<{ ok: true }> | Readonly<{ error: string; ok: false }>,
): RegionalHydrologyLoadState {
  if (!regionalHydrologyLoadMaySettle(state, token)) return state;
  return outcome.ok
    ? Object.freeze({
        error: null,
        mountedKey: token.targetKey,
        phase: "ready",
        requestEpoch: state.requestEpoch,
        targetKey: token.targetKey,
      })
    : Object.freeze({
        error: outcome.error,
        mountedKey: state.mountedKey,
        phase: "failed",
        requestEpoch: state.requestEpoch,
        targetKey: token.targetKey,
      });
}
