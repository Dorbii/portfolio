import type { CameraView } from "../camera.ts";

export type DetailTierId =
  | "world"
  | "territory"
  | "capital"
  | "site"
  | "close";

const POLICY_CAMERA_MINIMUM_SPAN:
  typeof import("../camera.ts").CAMERA_MINIMUM_SPAN = 0.04;

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

export const DETAIL_TIER_DEPTH: Readonly<Record<DetailTierId, number>> =
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
    DETAIL_TIERS.find((candidate) => span <= candidate.maximumSpan)
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
