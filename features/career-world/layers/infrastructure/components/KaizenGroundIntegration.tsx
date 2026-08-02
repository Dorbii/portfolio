import type { Pair } from "../../../shared/camera";
import { WORLD_PLANE } from "../../../shared/world";

export type KaizenGroundIntegrationRole =
  | "ambient"
  | "project"
  | "skill"
  | "support";

interface GroundIntegrationAsset {
  readonly anchorRatioY: number;
  readonly aspectRatio: number;
  readonly extentScale: number;
  readonly path: string;
}

const SITE_ASSET_PREFIX =
  "/career-world/layers/infrastructure/textures/kaizen-agent/"
  + "integration/sites-r1/";

const GROUND_INTEGRATION_ASSETS = Object.freeze({
  "data-contracts": Object.freeze({
    anchorRatioY: 0.36,
    aspectRatio: 1.5,
    extentScale: 1.72,
    path: `${SITE_ASSET_PREFIX}data-contracts-apron-r1.png`,
  }),
  "fantasy-conservatory": Object.freeze({
    anchorRatioY: 0.44,
    aspectRatio: 1.5,
    extentScale: 1.65,
    path: `${SITE_ASSET_PREFIX}conservatory-apron-r1.png`,
  }),
  "fantasy-chapel": Object.freeze({
    anchorRatioY: 0.42,
    aspectRatio: 1.5,
    extentScale: 1.5,
    path: `${SITE_ASSET_PREFIX}inn-apron-r1.png`,
  }),
  "fantasy-guildhouse": Object.freeze({
    anchorRatioY: 0.42,
    aspectRatio: 1.5,
    extentScale: 1.52,
    path: `${SITE_ASSET_PREFIX}inn-apron-r1.png`,
  }),
  "fantasy-inn": Object.freeze({
    anchorRatioY: 0.42,
    aspectRatio: 1.5,
    extentScale: 1.55,
    path: `${SITE_ASSET_PREFIX}inn-apron-r1.png`,
  }),
  "fantasy-townhouse": Object.freeze({
    anchorRatioY: 0.4,
    aspectRatio: 1.5,
    extentScale: 1.46,
    path: `${SITE_ASSET_PREFIX}artisan-rowhouse-apron-r1.png`,
  }),
  "fantasy-watchtower": Object.freeze({
    anchorRatioY: 0.5,
    aspectRatio: 1.5,
    extentScale: 1.48,
    path: `${SITE_ASSET_PREFIX}corner-tenement-apron-r1.png`,
  }),
  "kaizen-artisan-rowhouse": Object.freeze({
    anchorRatioY: 0.31,
    aspectRatio: 1.5,
    extentScale: 1.55,
    path: `${SITE_ASSET_PREFIX}artisan-rowhouse-apron-r1.png`,
  }),
  "kaizen-carriage-warehouse": Object.freeze({
    anchorRatioY: 0.35,
    aspectRatio: 1.5,
    extentScale: 1.45,
    path: `${SITE_ASSET_PREFIX}carriage-warehouse-apron-r1.png`,
  }),
  "kaizen-corner-tenement": Object.freeze({
    anchorRatioY: 0.5,
    aspectRatio: 1.5,
    extentScale: 1.55,
    path: `${SITE_ASSET_PREFIX}corner-tenement-apron-r1.png`,
  }),
  "kaizen-guild-annex": Object.freeze({
    anchorRatioY: 0.38,
    aspectRatio: 1.5,
    extentScale: 1.55,
    path: `${SITE_ASSET_PREFIX}guild-annex-apron-r1.png`,
  }),
  "kaizen-machinist-workshop": Object.freeze({
    anchorRatioY: 0.32,
    aspectRatio: 1.5,
    extentScale: 1.45,
    path: `${SITE_ASSET_PREFIX}machinist-workshop-apron-r1.png`,
  }),
  "kaizen-municipal-pump-house": Object.freeze({
    anchorRatioY: 0.48,
    aspectRatio: 1.5,
    extentScale: 1.55,
    path: `${SITE_ASSET_PREFIX}municipal-pump-house-apron-r1.png`,
  }),
  "project-kaizen-agent": Object.freeze({
    anchorRatioY: 0.44,
    aspectRatio: 1.5,
    extentScale: 2.2,
    path: "/career-world/layers/infrastructure/textures/kaizen-agent/"
      + "integration/civic-foundation-apron-r1.png",
  }),
  "protocol-gateway": Object.freeze({
    anchorRatioY: 0.49,
    aspectRatio: 1.5,
    extentScale: 2.1,
    path: `${SITE_ASSET_PREFIX}protocol-gateway-apron-r1.png`,
  }),
  "safe-writes": Object.freeze({
    anchorRatioY: 0.32,
    aspectRatio: 1.5,
    extentScale: 1.75,
    path: `${SITE_ASSET_PREFIX}safe-writes-apron-r1.png`,
  }),
  "vendy-cargo-depot": Object.freeze({
    anchorRatioY: 0.38,
    aspectRatio: 1.5,
    extentScale: 1.8,
    path: `${SITE_ASSET_PREFIX}cargo-depot-apron-r1.png`,
  }),
  "vendy-maintenance-workshop": Object.freeze({
    anchorRatioY: 0.38,
    aspectRatio: 1.5,
    extentScale: 1.65,
    path: `${SITE_ASSET_PREFIX}maintenance-workshop-apron-r1.png`,
  }),
  "vendy-worker-housing": Object.freeze({
    anchorRatioY: 0.42,
    aspectRatio: 1.5,
    extentScale: 1.55,
    path: `${SITE_ASSET_PREFIX}worker-housing-apron-r1.png`,
  }),
} satisfies Readonly<Record<string, GroundIntegrationAsset>>);

export type KaizenGroundIntegrationAssetId =
  keyof typeof GROUND_INTEGRATION_ASSETS;

export function requireKaizenGroundIntegrationAssetId(
  assetId: string,
): KaizenGroundIntegrationAssetId {
  if (!(assetId in GROUND_INTEGRATION_ASSETS)) {
    throw new TypeError(
      `Kaizen structure ${assetId} is missing a ground-integration asset.`,
    );
  }
  return assetId as KaizenGroundIntegrationAssetId;
}

export interface KaizenGroundIntegrationSite {
  readonly anchor: Pair;
  readonly assetId: KaizenGroundIntegrationAssetId;
  readonly footprintSpan: Pair;
  readonly id: string;
  readonly presentationScale: number;
  readonly role: KaizenGroundIntegrationRole;
}

function worldPoint([x, y]: Pair): Pair {
  return Object.freeze([
    x * WORLD_PLANE.width,
    y * WORLD_PLANE.height,
  ] as [number, number]);
}

export function KaizenGroundIntegration({ sites }: {
  readonly sites: readonly KaizenGroundIntegrationSite[];
}) {
  return (
    <g
      className="kaizen-ground-integration"
      data-ground-integration="authored-archetype-aprons"
      data-ground-integration-count={sites.length}
      data-ground-integration-sizing="visible-building-width"
    >
      {sites.map((site) => {
        const asset = GROUND_INTEGRATION_ASSETS[site.assetId];
        const [centerX, anchorY] = worldPoint(site.anchor);
        const buildingWidth = site.footprintSpan[0]
          * WORLD_PLANE.width
          * site.presentationScale;
        const width = buildingWidth * asset.extentScale;
        const height = width / asset.aspectRatio;

        return (
          <g
            className={[
              "kaizen-ground-integration__site",
              `kaizen-ground-integration__site--${site.role}`,
            ].join(" ")}
            data-ground-integration-asset={asset.path}
            data-ground-integration-asset-id={site.assetId}
            data-ground-integration-presentation-scale={
              site.presentationScale
            }
            data-ground-integration-structure-id={site.id}
            data-ground-integration-structure-role={site.role}
            key={site.id}
          >
            <image
              className="kaizen-ground-integration__asset"
              height={height}
              href={asset.path}
              preserveAspectRatio="xMidYMid meet"
              width={width}
              x={centerX - width / 2}
              y={anchorY - height * asset.anchorRatioY}
            />
          </g>
        );
      })}
    </g>
  );
}
