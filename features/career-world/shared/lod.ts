import type { CameraView, Pair } from "./camera";
import type { CareerWorldLayerId } from "./layers";

export type DetailTierId =
  | "world"
  | "territory"
  | "capital"
  | "site"
  | "close";

const POLICY_CAMERA_MINIMUM_SPAN:
  typeof import("./camera").CAMERA_MINIMUM_SPAN = 0.04;

export const DETAIL_POLICY = Object.freeze({
  cameraMinimumSpan: POLICY_CAMERA_MINIMUM_SPAN,
  territoryAssetPreloadSpan: 0.9,
  capitalAssetPreloadSpan: 0.26,
  siteAssetPreloadSpan: 0.16,
  closeAssetPreloadSpan: 0.075,
  tierMaximumSpan: Object.freeze({
    world: 1,
    territory: 0.78,
    capital: 0.2,
    site: 0.1,
    close: 0.05,
  }),
  worldToTerritory: Object.freeze({
    startSpan: 0.86,
    endSpan: 0.64,
  }),
  territoryToCapital: Object.freeze({
    startSpan: 0.23,
    endSpan: 0.15,
  }),
  capitalToSite: Object.freeze({
    startSpan: 0.15,
    endSpan: 0.1,
  }),
  siteToClose: Object.freeze({
    startSpan: 0.07,
    endSpan: 0.045,
  }),
  renderScale: Object.freeze({
    world: 1,
    territoryGain: 0.5,
    capitalGain: 0.5,
    siteGain: 0.25,
    closeGain: 0.25,
    maximumDevicePixelRatio: 2,
  }),
});

export interface DetailTier {
  readonly id: DetailTierId;
  readonly label: string;
  readonly maximumSpan: number;
  readonly requiresAuthoredTile: boolean;
}

export interface DetailState {
  readonly tier: DetailTier;
  readonly worldToTerritory: number;
  readonly territoryToCapital: number;
  readonly capitalToSite: number;
  readonly siteToClose: number;
  readonly renderScale: number;
  readonly shouldLoadTerritoryAssets: boolean;
  readonly shouldLoadCapitalAssets: boolean;
  readonly shouldLoadSiteAssets: boolean;
  readonly shouldLoadCloseAssets: boolean;
}

export interface DetailNodePolicy {
  readonly minimumTier: DetailTierId;
}

const DETAIL_TIER_DEPTH: Readonly<Record<DetailTierId, number>> =
  Object.freeze({
    world: 0,
    territory: 1,
    capital: 2,
    site: 3,
    close: 4,
  });

export const WORLD_DESTINATION_POLICY: DetailNodePolicy = Object.freeze({
  minimumTier: "world",
});

export const PROJECT_DESTINATION_POLICY: DetailNodePolicy = Object.freeze({
  minimumTier: "territory",
});

export const DESTINATION_MARKER_HANDOFF = Object.freeze({
  holdUntilSettlementVisibility: 0.42,
  hiddenAtSettlementVisibility: 0.9,
});

export interface LodPresentationFade {
  readonly value: number;
  readonly target: number;
  readonly lastUpdatedAt: number;
}

export interface LodCrossfadeTargets {
  readonly lower: number;
  readonly upper: number;
}

export interface LodCohortPresentation {
  readonly keys: readonly string[];
  readonly promotedAt: number;
  readonly signature: string;
}

export interface LodCohortTransition {
  readonly incoming: LodCohortPresentation;
  readonly outgoing: LodCohortPresentation;
  readonly promotedAt: number;
  readonly startingOpacities: Readonly<Record<string, number>>;
}

export interface LodPresentationResidency {
  readonly transition: LodCohortTransition;
  readonly value: number;
}

export const LOD_PRESENTATION_TRANSITION_MS = 180;
export const LOD_PRESENTATION_EPSILON = 0.001;
export const EMPTY_LOD_COHORT_PRESENTATION: LodCohortPresentation =
  Object.freeze({
    keys: Object.freeze([]),
    promotedAt: 0,
    signature: "",
  });
export const EMPTY_LOD_COHORT_TRANSITION: LodCohortTransition =
  Object.freeze({
    incoming: EMPTY_LOD_COHORT_PRESENTATION,
    outgoing: EMPTY_LOD_COHORT_PRESENTATION,
    promotedAt: 0,
    startingOpacities: Object.freeze({}),
  });

export function advanceLodPresentationFade(
  current: LodPresentationFade,
  target: number,
  now: number,
): LodPresentationFade {
  if (current.target !== target) {
    return {
      value: current.value,
      target,
      lastUpdatedAt: now,
    };
  }
  if (Math.abs(current.value - target) <= LOD_PRESENTATION_EPSILON) {
    return {
      value: target,
      target,
      lastUpdatedAt: now,
    };
  }
  const step = Math.max(0, now - current.lastUpdatedAt)
    / LOD_PRESENTATION_TRANSITION_MS;
  return {
    value: current.value < target
      ? Math.min(target, current.value + step)
      : Math.max(target, current.value - step),
    target,
    lastUpdatedAt: now,
  };
}

export function resolveLodSourceOpacity(
  decodedAt: number,
  now: number,
): number {
  const elapsed = Math.max(0, now - decodedAt);
  const amount = Math.min(1, elapsed / LOD_PRESENTATION_TRANSITION_MS);
  return amount * amount * (3 - 2 * amount);
}

export function isLodCohortReady(
  requiredKeys: readonly string[],
  decodedKeys: ReadonlySet<string>,
): boolean {
  return requiredKeys.every((key) => decodedKeys.has(key));
}

function normalizedLodCohort(
  requiredKeys: readonly string[],
  now: number,
): LodCohortPresentation {
  const keys = [...new Set(requiredKeys)].sort();
  return Object.freeze({
    keys: Object.freeze(keys),
    promotedAt: now,
    signature: keys.join("\u0000"),
  });
}

export function resolveLodCohortKeyOpacity(
  transition: LodCohortTransition,
  key: string,
  now: number,
): number {
  const isIncoming = transition.incoming.keys.includes(key);
  const isOutgoing = transition.outgoing.keys.includes(key);
  if (!isIncoming && !isOutgoing) {
    return 0;
  }
  const startingOpacity = transition.startingOpacities[key]
    ?? (isOutgoing ? 1 : 0);
  const targetOpacity = isIncoming ? 1 : 0;
  const progress = resolveLodSourceOpacity(transition.promotedAt, now);
  return (
    startingOpacity
    + (targetOpacity - startingOpacity) * progress
  );
}

export function isCurrentLodCohort(
  requiredKeys: readonly string[],
  transition: LodCohortTransition,
): boolean {
  return normalizedLodCohort(requiredKeys, transition.promotedAt).signature
    === transition.incoming.signature;
}

export function resolveLodCohortTransition(
  requiredKeys: readonly string[],
  decodedKeys: ReadonlySet<string>,
  current: LodCohortTransition,
  now: number,
): LodCohortTransition {
  const candidate = normalizedLodCohort(requiredKeys, now);
  if (candidate.signature === current.incoming.signature) {
    if (
      current.outgoing.keys.length > 0
      && resolveLodSourceOpacity(current.promotedAt, now)
        >= 1 - LOD_PRESENTATION_EPSILON
    ) {
      return Object.freeze({
        incoming: current.incoming,
        outgoing: EMPTY_LOD_COHORT_PRESENTATION,
        promotedAt: current.promotedAt,
        startingOpacities: Object.freeze(
          Object.fromEntries(
            current.incoming.keys.map((key) => [key, 1]),
          ),
        ),
      });
    }
    return current;
  }
  if (!isLodCohortReady(candidate.keys, decodedKeys)) {
    return current;
  }

  const previousKeys = [
    ...new Set([
      ...current.outgoing.keys,
      ...current.incoming.keys,
    ]),
  ].sort();
  const startingOpacities = Object.freeze(
    Object.fromEntries(
      [...new Set([...previousKeys, ...candidate.keys])].map((key) => [
        key,
        resolveLodCohortKeyOpacity(current, key, now),
      ]),
    ),
  );
  const outgoingKeys = previousKeys.filter(
    (key) => (startingOpacities[key] ?? 0) > LOD_PRESENTATION_EPSILON,
  );

  return Object.freeze({
    incoming: candidate,
    outgoing: outgoingKeys.length > 0
      ? Object.freeze({
        keys: Object.freeze(outgoingKeys),
        promotedAt: current.promotedAt,
        signature: outgoingKeys.join("\u0000"),
      })
      : EMPTY_LOD_COHORT_PRESENTATION,
    promotedAt: now,
    startingOpacities,
  });
}

export function removeLodCohortKey(
  transition: LodCohortTransition,
  key: string,
): LodCohortTransition {
  if (
    !transition.incoming.keys.includes(key)
    && !transition.outgoing.keys.includes(key)
  ) {
    return transition;
  }
  const incoming = normalizedLodCohort(
    transition.incoming.keys.filter((candidate) => candidate !== key),
    transition.incoming.promotedAt,
  );
  const outgoing = normalizedLodCohort(
    transition.outgoing.keys.filter((candidate) => candidate !== key),
    transition.outgoing.promotedAt,
  );
  return Object.freeze({
    incoming,
    outgoing,
    promotedAt: transition.promotedAt,
    startingOpacities: Object.freeze(
      Object.fromEntries(
        Object.entries(transition.startingOpacities).filter(
          ([candidate]) => candidate !== key,
        ),
      ),
    ),
  });
}

export function resolveLodCrossfadeTargets({
  currentLowerOpacity = 0,
  currentUpperOpacity = 0,
  lowerReady,
  lowerVisibility,
  upperReady,
  upperVisibility,
}: {
  readonly currentLowerOpacity?: number;
  readonly currentUpperOpacity?: number;
  readonly lowerReady: boolean;
  readonly lowerVisibility: number;
  readonly upperReady: boolean;
  readonly upperVisibility: number;
}): LodCrossfadeTargets {
  const upper = upperReady ? upperVisibility : 0;
  if (
    upper < currentUpperOpacity - LOD_PRESENTATION_EPSILON
    && !lowerReady
  ) {
    return Object.freeze({
      lower: currentLowerOpacity,
      upper: currentUpperOpacity,
    });
  }
  return Object.freeze({
    lower: lowerReady ? lowerVisibility * (1 - upper) : 0,
    upper,
  });
}

export function shouldRetainLodSource(
  shouldPreload: boolean,
  presentationValue: number,
): boolean {
  return (
    shouldPreload
    || presentationValue > LOD_PRESENTATION_EPSILON
  );
}

export function resolveRetainedLodPresentationKeys(
  presentations: readonly LodPresentationResidency[],
  decodedKeys: ReadonlySet<string>,
): readonly string[] {
  const retainedKeys = new Set<string>();
  for (const { transition, value } of presentations) {
    if (value <= LOD_PRESENTATION_EPSILON) {
      continue;
    }
    for (const key of [
      ...transition.incoming.keys,
      ...transition.outgoing.keys,
    ]) {
      if (decodedKeys.has(key)) {
        retainedKeys.add(key);
      }
    }
  }
  return Object.freeze([...retainedKeys].sort());
}

export interface RegisteredRasterDetailSource {
  readonly id: string;
  readonly kind: "registered-raster";
  readonly minimumTier: DetailTierId;
  readonly path: string;
  readonly dimensions: Pair;
  readonly worldBounds: CameraView;
}

export interface WorldProceduralDetailSource {
  readonly id: string;
  readonly kind: "world-procedural";
  readonly minimumTier: DetailTierId;
  readonly path: string;
  readonly fixedWorldFrequency: Pair;
}

export type LayerDetailSource =
  | RegisteredRasterDetailSource
  | WorldProceduralDetailSource;

export interface LayerDetailContract {
  readonly layer: CareerWorldLayerId;
  readonly sources: readonly LayerDetailSource[];
}

export function defineLayerDetailContract<
  const Contract extends LayerDetailContract,
>(contract: Contract): Contract {
  if (!contract.sources.some((source) => source.minimumTier === "world")) {
    throw new Error(`${contract.layer} detail contract needs a world source.`);
  }
  return Object.freeze({
    ...contract,
    sources: Object.freeze([...contract.sources]),
  }) as Contract;
}

const DETAIL_TIERS: readonly DetailTier[] = Object.freeze([
  Object.freeze({
    id: "close",
    label: "Close detail",
    maximumSpan: DETAIL_POLICY.tierMaximumSpan.close,
    requiresAuthoredTile: true,
  }),
  Object.freeze({
    id: "site",
    label: "Site detail",
    maximumSpan: DETAIL_POLICY.tierMaximumSpan.site,
    requiresAuthoredTile: true,
  }),
  Object.freeze({
    id: "capital",
    label: "Capital detail",
    maximumSpan: DETAIL_POLICY.tierMaximumSpan.capital,
    requiresAuthoredTile: true,
  }),
  Object.freeze({
    id: "territory",
    label: "Territory detail",
    maximumSpan: DETAIL_POLICY.tierMaximumSpan.territory,
    requiresAuthoredTile: false,
  }),
  Object.freeze({
    id: "world",
    label: "World detail",
    maximumSpan: DETAIL_POLICY.tierMaximumSpan.world,
    requiresAuthoredTile: false,
  }),
]);

function descendingSmoothstep(
  span: number,
  start: number,
  end: number,
): number {
  const amount = Math.min(
    1,
    Math.max(0, (start - span) / (start - end)),
  );
  return amount * amount * (3 - 2 * amount);
}

export function resolveDetailState(camera: CameraView): DetailState {
  const span = Math.max(...camera.span);
  const tier = (
    DETAIL_TIERS.find((tier) => span <= tier.maximumSpan)
    ?? DETAIL_TIERS[DETAIL_TIERS.length - 1]
  );
  const worldToTerritory = descendingSmoothstep(
    span,
    DETAIL_POLICY.worldToTerritory.startSpan,
    DETAIL_POLICY.worldToTerritory.endSpan,
  );
  const territoryToCapital = descendingSmoothstep(
    span,
    DETAIL_POLICY.territoryToCapital.startSpan,
    DETAIL_POLICY.territoryToCapital.endSpan,
  );
  const capitalToSite = descendingSmoothstep(
    span,
    DETAIL_POLICY.capitalToSite.startSpan,
    DETAIL_POLICY.capitalToSite.endSpan,
  );
  const siteToClose = descendingSmoothstep(
    span,
    DETAIL_POLICY.siteToClose.startSpan,
    DETAIL_POLICY.siteToClose.endSpan,
  );

  return Object.freeze({
    tier,
    worldToTerritory,
    territoryToCapital,
    capitalToSite,
    siteToClose,
    renderScale:
      DETAIL_POLICY.renderScale.world
      + worldToTerritory * DETAIL_POLICY.renderScale.territoryGain
      + territoryToCapital * DETAIL_POLICY.renderScale.capitalGain
      + capitalToSite * DETAIL_POLICY.renderScale.siteGain
      + siteToClose * DETAIL_POLICY.renderScale.closeGain,
    shouldLoadTerritoryAssets:
      span <= DETAIL_POLICY.territoryAssetPreloadSpan,
    shouldLoadCapitalAssets:
      span <= DETAIL_POLICY.capitalAssetPreloadSpan,
    shouldLoadSiteAssets:
      span <= DETAIL_POLICY.siteAssetPreloadSpan,
    shouldLoadCloseAssets:
      span <= DETAIL_POLICY.closeAssetPreloadSpan,
  });
}

export function resolveNodeVisibility(
  policy: DetailNodePolicy,
  state: DetailState,
): number {
  return policy.minimumTier === "world"
    ? 1
    : policy.minimumTier === "territory"
      ? state.worldToTerritory
      : policy.minimumTier === "capital"
        ? state.territoryToCapital
        : policy.minimumTier === "site"
          ? state.capitalToSite
          : state.siteToClose;
}

export function resolveAtomicTierVisibility(
  policy: DetailNodePolicy,
  state: DetailState,
): number {
  return (
    DETAIL_TIER_DEPTH[state.tier.id]
    >= DETAIL_TIER_DEPTH[policy.minimumTier]
  )
    ? 1
    : 0;
}

function resolveDestinationHandoffVisibility(
  state: DetailState,
): number {
  const handoffSpan = (
    DESTINATION_MARKER_HANDOFF.hiddenAtSettlementVisibility
    - DESTINATION_MARKER_HANDOFF.holdUntilSettlementVisibility
  );
  const handoffAmount = Math.min(
    1,
    Math.max(
      0,
      (
        state.territoryToCapital
        - DESTINATION_MARKER_HANDOFF.holdUntilSettlementVisibility
      ) / handoffSpan,
    ),
  );
  const settlementEstablished = (
    handoffAmount * handoffAmount * (3 - 2 * handoffAmount)
  );

  return 1 - settlementEstablished;
}

export function resolveWorldDestinationVisibility(
  state: DetailState,
): number {
  return Math.min(
    resolveNodeVisibility(WORLD_DESTINATION_POLICY, state),
    resolveDestinationHandoffVisibility(state),
  );
}

export function resolveProjectDestinationVisibility(
  state: DetailState,
): number {
  return Math.min(
    resolveNodeVisibility(PROJECT_DESTINATION_POLICY, state),
    resolveDestinationHandoffVisibility(state),
  );
}

export function resolveRegisteredRasterVisibility(
  policy: DetailNodePolicy,
  state: DetailState,
): number {
  // Preload flags govern IO only. Presentation follows the semantic LOD
  // weights so asset residency can never become a visible activation boundary.
  return resolveNodeVisibility(policy, state);
}
