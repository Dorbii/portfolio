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
  NINJAONE_CAPITAL_CITY_R3_WATER_INTERACTION,
} from "../model/ninjaOneCapitalCityFoundationR3";
import {
  ninjaOneCapitalCityUsesFreeCameraDetailCohort,
  type NinjaOneCapitalCityDistrictId,
} from "../model/ninjaOneCapitalCityRepresentations";
import { NinjaOneCapitalAssetNodes } from "./NinjaOneCapitalAssetNodes";
import { NinjaOneCapitalNativeFoliage } from "./NinjaOneCapitalNativeFoliage";

const D06_REVIEW_BASE =
  "/career-world/capitals/ninjaone/city-r3/_review/I18-station-site-base-no-train-r1-alpha.png";
const D06_CLOSE_CONTEXT =
  "/career-world/capitals/ninjaone/city-nodes-r2/close/infrastructure/I17-station-close-civic-overlay-r1-alpha.png";
const UPPER_CAPITAL_REAR_CLIFF_REVIEW =
  "/career-world/capitals/ninjaone/city-r3/_review/LFX01-upper-capital-rear-cliff-transition-r1-alpha.png";
const D06_STATION_REVIEW_SCALE = 0.9;
const D06_STATION_BASE_WIDTH = 783 * D06_STATION_REVIEW_SCALE;
const D06_STATION_BASE_HEIGHT = 587 * D06_STATION_REVIEW_SCALE;
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
  const cityLandFixVisible = isEnvironmentLayerEffectivelyVisible(
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
  return (
    <g
      data-city-r3-cohort={tier}
      data-city-r3-foliage-policy="reuse-L2-registered-trees-no-supplemental-urban-atlas"
      data-city-r3-representation="registered-context-plus-atomic-D06"
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
      {cityLandFixVisible ? (
        <image
          className="ninjaone-capital-city__r3-image"
          data-city-asset-id="LFX01"
          data-city-child-layer="L4_1"
          data-city-runtime-status="director-review"
          height={height}
          href={UPPER_CAPITAL_REAR_CLIFF_REVIEW}
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
      {transportationVisible ? (
        <image
          className="ninjaone-capital-city__r3-image"
          data-city-asset-id="I18"
          data-city-child-layer="L4_2"
          data-city-runtime-scale={D06_STATION_REVIEW_SCALE}
          data-city-runtime-status="director-review"
          height={D06_STATION_BASE_HEIGHT}
          href={D06_REVIEW_BASE}
          preserveAspectRatio="xMidYMid meet"
          width={D06_STATION_BASE_WIDTH}
          x={1056.5 - D06_STATION_BASE_WIDTH * 0.5}
          y={1086 - D06_STATION_BASE_HEIGHT}
        />
      ) : null}
    </g>
  );
}
