import type { CameraView } from "./camera";

export type DetailTierId = "world" | "territory" | "capital";

export const PHASE_3_MINIMUM_SPAN = 0.29;

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
  readonly renderScale: number;
  readonly shouldLoadTerritoryAssets: boolean;
}

export interface DetailNodePolicy {
  readonly minimumTier: DetailTierId;
}

const DETAIL_TIERS: readonly DetailTier[] = Object.freeze([
  Object.freeze({
    id: "capital",
    label: "Capital tile required",
    maximumSpan: 0.2,
    requiresAuthoredTile: true,
  }),
  Object.freeze({
    id: "territory",
    label: "Territory detail",
    maximumSpan: 0.78,
    requiresAuthoredTile: false,
  }),
  Object.freeze({
    id: "world",
    label: "World detail",
    maximumSpan: 1,
    requiresAuthoredTile: false,
  }),
]);

const TERRITORY_ASSET_PRELOAD_SPAN = 0.9;
const WORLD_TO_TERRITORY_START = 0.86;
const WORLD_TO_TERRITORY_END = 0.64;
const TERRITORY_TO_CAPITAL_START = 0.23;
const TERRITORY_TO_CAPITAL_END = 0.15;

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
    WORLD_TO_TERRITORY_START,
    WORLD_TO_TERRITORY_END,
  );
  const territoryToCapital = descendingSmoothstep(
    span,
    TERRITORY_TO_CAPITAL_START,
    TERRITORY_TO_CAPITAL_END,
  );

  return Object.freeze({
    tier,
    worldToTerritory,
    territoryToCapital,
    renderScale:
      1
      + worldToTerritory * 0.5
      + territoryToCapital * 0.5,
    shouldLoadTerritoryAssets: span <= TERRITORY_ASSET_PRELOAD_SPAN,
  });
}

export function resolveNodeVisibility(
  policy: DetailNodePolicy,
  state: DetailState,
): number {
  if (policy.minimumTier === "world") {
    return 1;
  }
  return policy.minimumTier === "territory"
    ? state.worldToTerritory
    : state.territoryToCapital;
}
