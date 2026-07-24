import type { CameraView, Pair } from "./camera";
import type { CareerWorldLayerId } from "./layers";

export type DetailTierId = "world" | "territory" | "capital";

export const DETAIL_POLICY = Object.freeze({
  phase3MinimumSpan: 0.29,
  territoryAssetPreloadSpan: 0.9,
  tierMaximumSpan: Object.freeze({
    world: 1,
    territory: 0.78,
    capital: 0.2,
  }),
  worldToTerritory: Object.freeze({
    startSpan: 0.86,
    endSpan: 0.64,
  }),
  territoryToCapital: Object.freeze({
    startSpan: 0.23,
    endSpan: 0.15,
  }),
  renderScale: Object.freeze({
    world: 1,
    territoryGain: 0.5,
    capitalGain: 0.5,
    maximumDevicePixelRatio: 2,
  }),
});

export const PHASE_3_MINIMUM_SPAN = DETAIL_POLICY.phase3MinimumSpan;

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
    id: "capital",
    label: "Capital tile required",
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

  return Object.freeze({
    tier,
    worldToTerritory,
    territoryToCapital,
    renderScale:
      DETAIL_POLICY.renderScale.world
      + worldToTerritory * DETAIL_POLICY.renderScale.territoryGain
      + territoryToCapital * DETAIL_POLICY.renderScale.capitalGain,
    shouldLoadTerritoryAssets:
      span <= DETAIL_POLICY.territoryAssetPreloadSpan,
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
