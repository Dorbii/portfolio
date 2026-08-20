import type { CameraView } from "../../../shared/camera";
import type { DetailTierId } from "../../../shared/lod";
import type { WorldLight } from "../../../shared/lighting";
import {
  isEnvironmentLayerEffectivelyVisible,
  type EnvironmentLayerVisibility,
} from "../../../shared/environmentLayers";
import {
  NINJAONE_CAPITAL_CITY_R3_ARTBOARD,
  NINJAONE_CAPITAL_CITY_R3_CONTEXT,
  NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS,
  NINJAONE_CAPITAL_CITY_R3_WATER_INTERACTION,
} from "../model/ninjaOneCapitalCityFoundationR3";
import {
  ninjaOneCapitalCityUsesFreeCameraDetailCohort,
  type NinjaOneCapitalCityDistrictId,
} from "../model/ninjaOneCapitalCityRepresentations";
import { NinjaOneCapitalAssetNodes } from "./NinjaOneCapitalAssetNodes";
import { NinjaOneCapitalNativeFoliage } from "./NinjaOneCapitalNativeFoliage";

const D06_CAPITAL_REVIEW_BASE = Object.freeze({
  anchorX: NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.I20.placement!.anchor[0],
  assetId: "I20",
  height: NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.I20.placement!.baseSize[1]
    * NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.I20.placement!.scale,
  path: NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.I20.asset.path,
  scale: NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.I20.placement!.scale,
  width: NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.I20.placement!.baseSize[0]
    * NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.I20.placement!.scale,
});
const D06_SITE_CLOSE_REVIEW_BASE = Object.freeze({
  anchorX: NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.I21.placement!.anchor[0],
  assetId: "I21",
  height: NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.I21.placement!.baseSize[1]
    * NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.I21.placement!.scale,
  path: NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.I21.asset.path,
  scale: NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.I21.placement!.scale,
  width: NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.I21.placement!.baseSize[0]
    * NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.I21.placement!.scale,
});
const D06_CLOSE_CONTEXT =
  "/career-world/capitals/ninjaone/city-nodes-r2/close/infrastructure/I17-station-close-civic-overlay-r1-alpha.png";
const CITY_BRIDGE_WATER_DETAIL_REVIEW =
  NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.WFX01.asset.path;
const CITY_UPPER_REAR_RIDGE_UNDERLAY_REVIEW =
  NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.LFX06.asset.path;
const CITY_CLOSE_FABRIC_DETAIL_REVIEW =
  NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.CFX01.asset.path;
const CITY_CENTRAL_ARCHITECTURE_DETAIL_REVIEW =
  NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.CFX02.asset.path;
const D06_STATION_REVIEW_SCALE =
  NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.I21.placement!.scale;
const D06_STATION_CLOSE_WIDTH = 846 * D06_STATION_REVIEW_SCALE;
const D06_STATION_CLOSE_HEIGHT = 564 * D06_STATION_REVIEW_SCALE;

export function NinjaOneCapitalCityR3({
  camera,
  focusDistrict,
  light,
  tier,
  visibility,
}: {
  readonly camera: CameraView;
  readonly focusDistrict: NinjaOneCapitalCityDistrictId | null;
  readonly light: WorldLight;
  readonly tier: DetailTierId;
  readonly visibility: EnvironmentLayerVisibility;
}) {
  const [width, height] = NINJAONE_CAPITAL_CITY_R3_ARTBOARD;
  if (tier === "world" || tier === "territory") return null;

  const waterInteractionVisible = isEnvironmentLayerEffectivelyVisible(
    visibility,
    "L4_0",
  );
  const waterDetailVisible = waterInteractionVisible
    && (tier === "site" || tier === "close");
  const landscapeVisible = isEnvironmentLayerEffectivelyVisible(
    visibility,
    "L4_1",
  );
  const transportationVisible = isEnvironmentLayerEffectivelyVisible(
    visibility,
    "L4_2",
  );
  const architectureVisible = isEnvironmentLayerEffectivelyVisible(
    visibility,
    "L4_3",
  );
  const closeContextVisible = tier === "close"
    && focusDistrict !== "D05"
    && isEnvironmentLayerEffectivelyVisible(visibility, "L4_4");
  const closeFabricVisible = (tier === "site" || tier === "close")
    && focusDistrict !== "D05"
    && isEnvironmentLayerEffectivelyVisible(visibility, "L4_4");
  const centralArchitectureDetailVisible = tier === "close" && focusDistrict === null
    && isEnvironmentLayerEffectivelyVisible(visibility, "L4_4");
  const nativeFoliageVisible = tier === "close"
    && isEnvironmentLayerEffectivelyVisible(visibility, "L4_6");
  const registeredDetailLayerIds = [
    ...(architectureVisible ? ["L4_3" as const] : []),
    ...(transportationVisible ? ["L4_2" as const] : []),
  ];
  const registeredDetailVisible = ninjaOneCapitalCityUsesFreeCameraDetailCohort(
    tier,
    focusDistrict,
  )
    && registeredDetailLayerIds.length > 0;
  const d05DistrictDetailVisible = (tier === "site" || tier === "close")
    && focusDistrict === "D05"
    && architectureVisible;
  const d06StationVisible = transportationVisible && focusDistrict !== "D05";
  const d06StationBase = tier === "capital"
    ? D06_CAPITAL_REVIEW_BASE
    : D06_SITE_CLOSE_REVIEW_BASE;
  return (
    <g
      data-city-r3-cohort={tier}
      data-city-r3-foliage-policy="reuse-L2-registered-trees-no-supplemental-urban-atlas"
      data-city-r3-representation={focusDistrict === "D05"
        ? "registered-context-plus-progressive-D05"
        : "registered-context-plus-atomic-D06"}
      data-city-r3-train-status="deferred-during-terrain-polish"
    >
      {registeredDetailVisible ? (
        <defs>
          <mask
            height={height}
            id="ninjaone-capital-city-r3-registered-detail-cutout"
            maskUnits="userSpaceOnUse"
            style={{ maskType: "luminance" }}
            width={width}
            x={0}
            y={0}
          >
            <rect fill="#fff" height={height} width={width} />
            <NinjaOneCapitalAssetNodes
              camera={camera}
              deliveryMode="registered-progressive-detail"
              focusedDistrict={null}
              layerIds={registeredDetailLayerIds}
              light={light}
              maskOnly
              tier={tier}
            />
          </mask>
        </defs>
      ) : null}
      {nativeFoliageVisible ? (
        <defs>
          <mask
            height={height}
            id="ninjaone-capital-city-r3-native-foliage-clip"
            maskUnits="userSpaceOnUse"
            style={{ maskType: "alpha" }}
            width={width}
            x={0}
            y={0}
          >
            <image
              height={height}
              href={NINJAONE_CAPITAL_CITY_R3_CONTEXT.path}
              preserveAspectRatio="none"
              width={width}
            />
          </mask>
        </defs>
      ) : null}
      {d05DistrictDetailVisible ? (
        <NinjaOneCapitalAssetNodes
          camera={camera}
          deliveryMode="focused-district-progressive-detail"
          focusedDistrict="D05"
          layerIds={["L4_3"]}
          light={light}
          tier={tier}
        />
      ) : null}
      {waterInteractionVisible ? (
        <image
          className="ninjaone-capital-city__r3-water-interaction"
          data-city-child-layer="L4_0"
          height={height}
          href={NINJAONE_CAPITAL_CITY_R3_WATER_INTERACTION.path}
          preserveAspectRatio="none"
          width={width}
        />
      ) : null}
      {waterDetailVisible ? (
        <image
          className="ninjaone-capital-city__r3-water-detail"
          data-city-asset-id="WFX01"
          data-city-child-layer="L4_0"
          data-city-runtime-status="manifest-declared"
          data-city-water-detail-tier={tier}
          height={height}
          href={CITY_BRIDGE_WATER_DETAIL_REVIEW}
          opacity={tier === "close" ? 1 : 0.68}
          preserveAspectRatio="none"
          width={width}
        />
      ) : null}
      {landscapeVisible ? (
        <image
          className="ninjaone-capital-city__r3-landscape-underlay"
          data-city-asset-id="LFX06"
          data-city-child-layer="L4_1"
          data-city-runtime-status="manifest-declared"
          height={height}
          href={CITY_UPPER_REAR_RIDGE_UNDERLAY_REVIEW}
          preserveAspectRatio="none"
          width={width}
        />
      ) : null}
      <image
        className="ninjaone-capital-city__r3-image"
        data-city-cohort-ownership="L4-capital-composite"
        height={height}
        href={NINJAONE_CAPITAL_CITY_R3_CONTEXT.path}
        mask={registeredDetailVisible
          ? "url(#ninjaone-capital-city-r3-registered-detail-cutout)"
          : undefined}
        preserveAspectRatio="none"
        width={width}
      />
      {closeFabricVisible ? (
        <image
          className="ninjaone-capital-city__r3-fabric-detail"
          data-city-asset-id="CFX01"
          data-city-child-layer="L4_4"
          data-city-runtime-status="manifest-declared"
          data-city-fabric-detail-tier={tier}
          height={height}
          href={CITY_CLOSE_FABRIC_DETAIL_REVIEW}
          mask={registeredDetailVisible
            ? "url(#ninjaone-capital-city-r3-registered-detail-cutout)"
            : undefined}
          opacity={tier === "close" ? 1 : 0.48}
          preserveAspectRatio="none"
          width={width}
        />
      ) : null}
      {centralArchitectureDetailVisible ? (
        <image
          className="ninjaone-capital-city__r3-architecture-detail"
          data-city-asset-id="CFX02"
          data-city-child-layer="L4_4"
          data-city-runtime-status="manifest-declared"
          height={height}
          href={CITY_CENTRAL_ARCHITECTURE_DETAIL_REVIEW}
          mask={registeredDetailVisible
            ? "url(#ninjaone-capital-city-r3-registered-detail-cutout)"
            : undefined}
          preserveAspectRatio="none"
          width={width}
        />
      ) : null}
      {nativeFoliageVisible ? (
        <g mask="url(#ninjaone-capital-city-r3-native-foliage-clip)">
          <NinjaOneCapitalNativeFoliage camera={camera} />
        </g>
      ) : null}
      {registeredDetailVisible ? (
        <NinjaOneCapitalAssetNodes
          camera={camera}
          deliveryMode="registered-progressive-detail"
          focusedDistrict={null}
          layerIds={registeredDetailLayerIds}
          light={light}
          tier={tier}
        />
      ) : null}
      {closeContextVisible ? (
        <image
          className="ninjaone-capital-city__r3-image"
          data-city-asset-id="I17"
          data-city-child-layer="L4_4"
          data-city-runtime-scale={D06_STATION_REVIEW_SCALE}
          height={D06_STATION_CLOSE_HEIGHT}
          href={D06_CLOSE_CONTEXT}
          preserveAspectRatio="xMidYMid meet"
          width={D06_STATION_CLOSE_WIDTH}
          x={1054 - D06_STATION_CLOSE_WIDTH * 0.5}
          y={1086 - D06_STATION_CLOSE_HEIGHT}
        />
      ) : null}
      {d06StationVisible ? (
        <image
          className="ninjaone-capital-city__r3-image"
          data-city-asset-id={d06StationBase.assetId}
          data-city-asset-source-tier={tier === "capital" ? "capital" : "site-close"}
          data-city-child-layer="L4_2"
          data-city-runtime-scale={d06StationBase.scale}
          data-city-runtime-status="manifest-declared"
          height={d06StationBase.height}
          href={d06StationBase.path}
          preserveAspectRatio="xMidYMid meet"
          width={d06StationBase.width}
          x={d06StationBase.anchorX - d06StationBase.width * 0.5}
          y={1086 - d06StationBase.height}
        />
      ) : null}
    </g>
  );
}
