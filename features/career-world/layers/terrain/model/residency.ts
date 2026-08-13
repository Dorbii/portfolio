import type { CameraView, Pair } from "../../../shared/camera";

export type TerrainResidencyTier = "capital" | "site";

export interface TerrainResidencySource {
  readonly decodedBytes: number;
  readonly dimensions: Pair;
  readonly path: string;
}

export interface TerrainResidencyTile {
  readonly id: string;
  readonly sources: Readonly<Partial<Record<
    TerrainResidencyTier,
    TerrainResidencySource
  >>>;
  readonly worldBounds: CameraView;
}

export interface TerrainResidencyPolicy {
  readonly maximumLandLayerDecodedBytes: number;
  readonly maximumConcurrentLoads: number;
  readonly maximumResidentDecodedBytes: number;
  readonly prefetchMarginPixels: number;
  readonly retentionMarginPixels: number;
  readonly retryBaseDelayMs: number;
  readonly retryMaximumDelayMs: number;
  readonly requestTimeoutMs: number;
}

export interface TerrainResidencyPlan {
  readonly estimatedResidentDecodedBytes: number;
  readonly requestedTiles: readonly TerrainResidencyTile[];
  readonly retainedTiles: readonly TerrainResidencyTile[];
  readonly visibleOverBudget: boolean;
  readonly visibleTiles: readonly TerrainResidencyTile[];
}

export interface TerrainResidencyAdmission {
  readonly plan: TerrainResidencyPlan;
  readonly requestedTiers: readonly TerrainResidencyTier[];
}

interface PlanTerrainResidencyInput {
  readonly camera: CameraView;
  readonly pinnedSourceKeys?: ReadonlySet<string>;
  readonly policy: TerrainResidencyPolicy;
  readonly residentSourceKeys?: ReadonlySet<string>;
  readonly requestedTiers: readonly TerrainResidencyTier[];
  readonly tiles: readonly TerrainResidencyTile[];
  readonly viewportPixels: Pair;
}

interface PlanTerrainResidencyCandidatesInput extends Omit<
  PlanTerrainResidencyInput,
  "requestedTiers"
> {
  readonly requestedTierCandidates: readonly (
    readonly TerrainResidencyTier[]
  )[];
}

interface PlanVisibleLoadPreemptionInput {
  readonly activeSourceKeys: ReadonlySet<string>;
  readonly eligibleVisibleRequestCount: number;
  readonly maximumConcurrentLoads: number;
  readonly visibleSourceKeys: ReadonlySet<string>;
}

function assertViewport(viewportPixels: Pair): void {
  if (
    viewportPixels.some((value) => !Number.isFinite(value) || value <= 0)
  ) {
    throw new TypeError("Terrain viewport must have positive dimensions.");
  }
}

export function prefetchSourcesToPreempt({
  activeSourceKeys,
  eligibleVisibleRequestCount,
  maximumConcurrentLoads,
  visibleSourceKeys,
}: PlanVisibleLoadPreemptionInput): readonly string[] {
  if (
    !Number.isInteger(eligibleVisibleRequestCount)
    || eligibleVisibleRequestCount < 0
    || !Number.isInteger(maximumConcurrentLoads)
    || maximumConcurrentLoads <= 0
  ) {
    throw new TypeError(
      "Terrain load counts must be non-negative integers with positive capacity.",
    );
  }
  const activeKeys = [...activeSourceKeys];
  const activeVisibleRequestCount = activeKeys.filter(
    (key) => visibleSourceKeys.has(key),
  ).length;
  const availableLoadSlots = Math.max(
    0,
    maximumConcurrentLoads - activeKeys.length,
  );
  const visibleLoadSlotsNeeded = Math.min(
    eligibleVisibleRequestCount,
    Math.max(0, maximumConcurrentLoads - activeVisibleRequestCount),
  );
  const prefetchesToCancel = Math.max(
    0,
    visibleLoadSlotsNeeded - availableLoadSlots,
  );
  return Object.freeze(
    activeKeys
      .filter((key) => !visibleSourceKeys.has(key))
      .slice(0, prefetchesToCancel),
  );
}

export function cameraPaddingForPixels(
  camera: CameraView,
  viewportPixels: Pair,
  marginPixels: number,
): Pair {
  assertViewport(viewportPixels);
  if (!Number.isFinite(marginPixels) || marginPixels < 0) {
    throw new TypeError("Terrain margin must be a non-negative number.");
  }
  return Object.freeze([
    camera.span[0] * marginPixels / viewportPixels[0],
    camera.span[1] * marginPixels / viewportPixels[1],
  ]);
}

export function terrainTileIntersectsCamera(
  tile: { readonly worldBounds: CameraView },
  camera: CameraView,
  padding: Pair = [0, 0],
): boolean {
  const left = Math.max(0, camera.origin[0] - padding[0]);
  const top = Math.max(0, camera.origin[1] - padding[1]);
  const right = Math.min(
    1,
    camera.origin[0] + camera.span[0] + padding[0],
  );
  const bottom = Math.min(
    1,
    camera.origin[1] + camera.span[1] + padding[1],
  );
  const tileRight =
    tile.worldBounds.origin[0] + tile.worldBounds.span[0];
  const tileBottom =
    tile.worldBounds.origin[1] + tile.worldBounds.span[1];
  return (
    tile.worldBounds.origin[0] < right
    && tileRight > left
    && tile.worldBounds.origin[1] < bottom
    && tileBottom > top
  );
}

function distanceSquaredFromViewport(
  tile: TerrainResidencyTile,
  camera: CameraView,
): number {
  const tileCenter = [
    tile.worldBounds.origin[0] + tile.worldBounds.span[0] / 2,
    tile.worldBounds.origin[1] + tile.worldBounds.span[1] / 2,
  ] as const;
  const cameraRight = camera.origin[0] + camera.span[0];
  const cameraBottom = camera.origin[1] + camera.span[1];
  const dx = tileCenter[0] < camera.origin[0]
    ? camera.origin[0] - tileCenter[0]
    : tileCenter[0] > cameraRight
      ? tileCenter[0] - cameraRight
      : 0;
  const dy = tileCenter[1] < camera.origin[1]
    ? camera.origin[1] - tileCenter[1]
    : tileCenter[1] > cameraBottom
      ? tileCenter[1] - cameraBottom
      : 0;
  return (
    (dx / camera.span[0]) ** 2
    + (dy / camera.span[1]) ** 2
  );
}

function orderedTiles(
  tiles: readonly TerrainResidencyTile[],
  camera: CameraView,
  padding: Pair,
  preferredSourceKeys: ReadonlySet<string> = new Set(),
  requestedTiers: readonly TerrainResidencyTier[] = [],
): TerrainResidencyTile[] {
  const residentTierCount = (tile: TerrainResidencyTile) =>
    requestedTiers.reduce((count, tier) => (
      tile.sources[tier]
      && preferredSourceKeys.has(`${tier}:${tile.id}`)
        ? count + 1
        : count
    ), 0);
  return tiles
    .filter((tile) => (
      requestedTiers.some((tier) => tile.sources[tier])
      && terrainTileIntersectsCamera(tile, camera, padding)
    ))
    .sort((left, right) => (
      residentTierCount(right)
      - residentTierCount(left)
      || distanceSquaredFromViewport(left, camera)
      - distanceSquaredFromViewport(right, camera)
      || left.id.localeCompare(right.id)
    ));
}

function decodedBytesForTile(
  tile: TerrainResidencyTile,
  requestedTiers: readonly TerrainResidencyTier[],
  pinnedSourceKeys: ReadonlySet<string> = new Set(),
): number {
  return requestedTiers.reduce(
    (total, tier) =>
      total + (
        pinnedSourceKeys.has(`${tier}:${tile.id}`)
          ? 0
          : tile.sources[tier]?.decodedBytes ?? 0
      ),
    0,
  );
}

function decodedBytesForSourceKeys(
  tiles: readonly TerrainResidencyTile[],
  sourceKeys: ReadonlySet<string>,
): number {
  const decodedBytesByKey = new Map<string, number>();
  for (const tile of tiles) {
    for (const tier of ["capital", "site"] as const) {
      const source = tile.sources[tier];
      if (source) {
        decodedBytesByKey.set(`${tier}:${tile.id}`, source.decodedBytes);
      }
    }
  }
  return [...sourceKeys].reduce(
    (total, key) => total + (decodedBytesByKey.get(key) ?? 0),
    0,
  );
}

function fillWithinBudget(
  selected: TerrainResidencyTile[],
  candidates: readonly TerrainResidencyTile[],
  selectedIds: Set<string>,
  currentBytes: number,
  requestedTiers: readonly TerrainResidencyTier[],
  maximumBytes: number,
  pinnedSourceKeys: ReadonlySet<string>,
): number {
  for (const tile of candidates) {
    if (selectedIds.has(tile.id)) {
      continue;
    }
    const tileBytes = decodedBytesForTile(
      tile,
      requestedTiers,
      pinnedSourceKeys,
    );
    if (currentBytes + tileBytes > maximumBytes) {
      continue;
    }
    selected.push(tile);
    selectedIds.add(tile.id);
    currentBytes += tileBytes;
  }
  return currentBytes;
}

function emptyTerrainResidencyPlan(): TerrainResidencyPlan {
  return Object.freeze({
    estimatedResidentDecodedBytes: 0,
    requestedTiles: Object.freeze([]),
    retainedTiles: Object.freeze([]),
    visibleOverBudget: false,
    visibleTiles: Object.freeze([]),
  });
}

export function planTerrainResidency({
  camera,
  pinnedSourceKeys = new Set(),
  policy,
  residentSourceKeys = new Set(),
  requestedTiers,
  tiles,
  viewportPixels,
}: PlanTerrainResidencyInput): TerrainResidencyPlan {
  assertViewport(viewportPixels);
  const pinnedDecodedBytes = decodedBytesForSourceKeys(
    tiles,
    pinnedSourceKeys,
  );
  if (requestedTiers.length === 0) {
    return Object.freeze({
      estimatedResidentDecodedBytes: pinnedDecodedBytes,
      requestedTiles: Object.freeze([]),
      retainedTiles: Object.freeze([]),
      visibleOverBudget:
        pinnedDecodedBytes > policy.maximumResidentDecodedBytes,
      visibleTiles: Object.freeze([]),
    });
  }

  const visibleTiles = orderedTiles(
    tiles,
    camera,
    [0, 0],
    new Set(),
    requestedTiers,
  );
  const visibleBytes = pinnedDecodedBytes + visibleTiles.reduce(
    (total, tile) =>
      total + decodedBytesForTile(
        tile,
        requestedTiers,
        pinnedSourceKeys,
      ),
    0,
  );
  if (visibleBytes > policy.maximumResidentDecodedBytes) {
    return Object.freeze({
      estimatedResidentDecodedBytes: 0,
      requestedTiles: Object.freeze([]),
      retainedTiles: Object.freeze([]),
      visibleOverBudget: true,
      visibleTiles: Object.freeze(visibleTiles),
    });
  }
  const prefetchTiles = orderedTiles(
    tiles,
    camera,
    cameraPaddingForPixels(
      camera,
      viewportPixels,
      policy.prefetchMarginPixels,
    ),
    new Set(),
    requestedTiers,
  );
  const retentionTiles = orderedTiles(
    tiles,
    camera,
    cameraPaddingForPixels(
      camera,
      viewportPixels,
      policy.retentionMarginPixels,
    ),
    residentSourceKeys,
    requestedTiers,
  );
  const selectedIds = new Set(visibleTiles.map((tile) => tile.id));
  let selectedBytes = visibleBytes;
  const requestedTiles = [...visibleTiles];
  selectedBytes = fillWithinBudget(
    requestedTiles,
    prefetchTiles,
    selectedIds,
    selectedBytes,
    requestedTiers,
    policy.maximumResidentDecodedBytes,
    pinnedSourceKeys,
  );

  const retainedTiles = [...requestedTiles];
  selectedBytes = fillWithinBudget(
    retainedTiles,
    retentionTiles,
    selectedIds,
    selectedBytes,
    requestedTiers,
    policy.maximumResidentDecodedBytes,
    pinnedSourceKeys,
  );

  return Object.freeze({
    estimatedResidentDecodedBytes: selectedBytes,
    requestedTiles: Object.freeze(requestedTiles),
    retainedTiles: Object.freeze(retainedTiles),
    visibleOverBudget: false,
    visibleTiles: Object.freeze(visibleTiles),
  });
}

export function planTerrainResidencyWithTierFallback({
  requestedTierCandidates,
  ...input
}: PlanTerrainResidencyCandidatesInput): TerrainResidencyAdmission {
  for (const requestedTiers of requestedTierCandidates) {
    const plan = planTerrainResidency({
      ...input,
      requestedTiers,
    });
    if (!plan.visibleOverBudget) {
      return Object.freeze({
        plan,
        requestedTiers: Object.freeze([...requestedTiers]),
      });
    }
  }
  if (requestedTierCandidates.length === 0) {
    return Object.freeze({
      plan: planTerrainResidency({
        ...input,
        requestedTiers: Object.freeze([]),
      }),
      requestedTiers: Object.freeze([]),
    });
  }
  return Object.freeze({
    plan: emptyTerrainResidencyPlan(),
    requestedTiers: Object.freeze([]),
  });
}
