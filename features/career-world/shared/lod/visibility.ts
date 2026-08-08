import {
  DESTINATION_MARKER_HANDOFF,
  DETAIL_TIER_DEPTH,
  PROJECT_DESTINATION_POLICY,
  WORLD_DESTINATION_POLICY,
  type DetailNodePolicy,
  type DetailState,
} from "./policy.ts";

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
