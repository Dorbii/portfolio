import type { CameraView, Pair } from "./camera";
import type { CareerWorldLayerId } from "./layers";

export type DetailTierId = "world" | "territory" | "capital" | "site";

const POLICY_CAMERA_MINIMUM_SPAN:
  typeof import("./camera").CAMERA_MINIMUM_SPAN = 0.055;

export const DETAIL_POLICY = Object.freeze({
  cameraMinimumSpan: POLICY_CAMERA_MINIMUM_SPAN,
  territoryAssetPreloadSpan: 0.9,
  capitalAssetPreloadSpan: 0.26,
  siteAssetPreloadSpan: 0.16,
  tierMaximumSpan: Object.freeze({
    world: 1,
    territory: 0.78,
    capital: 0.2,
    site: 0.1,
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
  renderScale: Object.freeze({
    world: 1,
    territoryGain: 0.5,
    capitalGain: 0.5,
    siteGain: 0.25,
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
  readonly renderScale: number;
  readonly shouldLoadTerritoryAssets: boolean;
  readonly shouldLoadCapitalAssets: boolean;
  readonly shouldLoadSiteAssets: boolean;
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

  return Object.freeze({
    tier,
    worldToTerritory,
    territoryToCapital,
    capitalToSite,
    renderScale:
      DETAIL_POLICY.renderScale.world
      + worldToTerritory * DETAIL_POLICY.renderScale.territoryGain
      + territoryToCapital * DETAIL_POLICY.renderScale.capitalGain
      + capitalToSite * DETAIL_POLICY.renderScale.siteGain,
    shouldLoadTerritoryAssets:
      span <= DETAIL_POLICY.territoryAssetPreloadSpan,
    shouldLoadCapitalAssets:
      span <= DETAIL_POLICY.capitalAssetPreloadSpan,
    shouldLoadSiteAssets:
      span <= DETAIL_POLICY.siteAssetPreloadSpan,
  });
}

export function resolveNodeVisibility(
  policy: DetailNodePolicy,
  state: DetailState,
): number {
  if (policy.minimumTier === "world") {
    return 1;
  }
  if (policy.minimumTier === "territory") {
    return state.worldToTerritory;
  }
  return policy.minimumTier === "capital"
    ? state.territoryToCapital
    : state.capitalToSite;
}

export function resolveRegisteredRasterVisibility(
  policy: DetailNodePolicy,
  state: DetailState,
): number {
  // Registered raster sets swap coherently once their complete visible set is
  // resident. Crossfading raster pixels over an enlarged lower tier creates a
  // false "blur transition"; the renderer owns readiness, while this shared
  // policy owns the activation boundary.
  if (policy.minimumTier === "world") {
    return 1;
  }
  if (policy.minimumTier === "territory") {
    return state.shouldLoadTerritoryAssets ? 1 : 0;
  }
  if (policy.minimumTier === "capital") {
    return state.shouldLoadCapitalAssets ? 1 : 0;
  }
  return state.shouldLoadSiteAssets ? 1 : 0;
}
