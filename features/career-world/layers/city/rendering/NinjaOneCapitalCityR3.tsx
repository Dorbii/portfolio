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
  NINJAONE_CAPITAL_CITY_R3_D01_CONTEXT_EXCLUSION_MASK,
  NINJAONE_CAPITAL_CITY_R3_D02_CONTEXT_EXCLUSION_MASK,
  NINJAONE_CAPITAL_CITY_R3_D03_CONTEXT_EXCLUSION_MASK,
  NINJAONE_CAPITAL_CITY_R3_D04_CONTEXT_EXCLUSION_MASK,
  NINJAONE_CAPITAL_CITY_R3_D05_CONTEXT_EXCLUSION_MASK,
  NINJAONE_CAPITAL_CITY_R3_PROGRESSIVE_WATER_EXCLUSION_MASK,
  NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS,
  NINJAONE_CAPITAL_CITY_R3_WATER_INTERACTION,
} from "../model/ninjaOneCapitalCityFoundationR3";
import {
  NINJAONE_CAPITAL_CITY_DETAIL_POLICY,
  ninjaOneCapitalCityUsesFreeCameraDetailCohort,
  type NinjaOneCapitalCityDistrictId,
} from "../model/ninjaOneCapitalCityRepresentations";
import type { CityLayerId } from "../model/ninjaOneCapitalCityLayer";
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
  anchorX: NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.I24.placement!.anchor[0],
  assetId: "I24",
  height: NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.I24.placement!.baseSize[1]
    * NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.I24.placement!.scale,
  path: NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.I24.asset.path,
  scale: NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.I24.placement!.scale,
  width: NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.I24.placement!.baseSize[0]
    * NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.I24.placement!.scale,
});
const CITY_BRIDGE_WATER_DETAIL_REVIEW =
  NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.WFX01.asset.path;
const CITY_UPPER_REAR_RIDGE_UNDERLAY_REVIEW =
  NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.LFX06.asset.path;
const CITY_CLOSE_FABRIC_DETAIL_REVIEW =
  NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.CFX01.asset.path;
const CITY_CENTRAL_ARCHITECTURE_DETAIL_REVIEW =
  NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.CFX02.asset.path;
const D01_CONTEXT_EXCLUSION_REVIEW =
  NINJAONE_CAPITAL_CITY_R3_D01_CONTEXT_EXCLUSION_MASK.path;
const D01_GROUNDING_AND_CIRCULATION_REVIEW =
  NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.D01L02.asset.path;
const D02_CONTEXT_EXCLUSION_REVIEW =
  NINJAONE_CAPITAL_CITY_R3_D02_CONTEXT_EXCLUSION_MASK.path;
const D02_GROUNDING_AND_CIRCULATION_REVIEW =
  NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.D02L02.asset.path;
const D03_GROUND_CONTACT_REVIEW =
  NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.D03L02.asset.path;
const D03_TERRAIN_INTEGRATION_DETAIL_REVIEW =
  NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.D03L03.asset.path;
const D03_RETAINING_CIRCULATION_MASS_REVIEW =
  NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.D03L04.asset.path;
const D03_RETAINING_CIRCULATION_MASS_PLACEMENT =
  NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.D03L04.placement!;
const D04_CONTEXT_EXCLUSION_REVIEW =
  NINJAONE_CAPITAL_CITY_R3_D04_CONTEXT_EXCLUSION_MASK.path;
const D04_GROUNDING_AND_CIRCULATION_REVIEW =
  NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.D04L02.asset.path;
const D04_S14_COMPACT_GATEWAY_REVIEW =
  NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.S14D04.asset.path;
const D04_S14_WATER_CONTACT_REVIEW =
  NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.D04W02.asset.path;
const D04_S14_REVIEW_WIDTH = NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.S14D04
  .placement!.baseSize[0] * NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.S14D04.placement!.scale;
const D04_S14_REVIEW_HEIGHT = NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.S14D04
  .placement!.baseSize[1] * NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.S14D04.placement!.scale;
const D04_S14_REVIEW_ANCHOR = NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.S14D04
  .placement!.anchor;
const D05_CONTEXT_EXCLUSION_REVIEW =
  NINJAONE_CAPITAL_CITY_R3_D05_CONTEXT_EXCLUSION_MASK.path;
const D05_GROUND_INTEGRATION_REVIEW =
  NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.D05L02.asset.path;
const D05_TERRAIN_INTEGRATION_DETAIL_REVIEW =
  NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.D05L03.asset.path;
const D05_TERRACE_MASS_REVIEW =
  NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.D05L04.asset.path;
const D05_TERRACE_MASS_PLACEMENT =
  NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.D05L04.placement!;

function ProgressiveDistrictAssetNodes({
  camera,
  closeMounted,
  closeOpacity,
  district,
  layerIds,
  light,
  siteMounted,
  siteOpacity,
}: {
  readonly camera: CameraView;
  readonly closeMounted: boolean;
  readonly closeOpacity: number;
  readonly district: NinjaOneCapitalCityDistrictId;
  readonly layerIds: readonly CityLayerId[];
  readonly light: WorldLight;
  readonly siteMounted: boolean;
  readonly siteOpacity: number;
}) {
  return (
    <>
      {siteMounted && siteOpacity > 0 ? (
        <g data-city-progressive-source-tier="site" opacity={siteOpacity}>
          <NinjaOneCapitalAssetNodes
            camera={camera}
            deliveryMode="focused-district-progressive-detail"
            focusedDistrict={district}
            layerIds={layerIds}
            light={light}
            tier="site"
          />
        </g>
      ) : null}
      {closeMounted && closeOpacity > 0 ? (
        <g data-city-progressive-source-tier="close" opacity={closeOpacity}>
          <NinjaOneCapitalAssetNodes
            camera={camera}
            deliveryMode="focused-district-progressive-detail"
            focusedDistrict={district}
            layerIds={layerIds}
            light={light}
            tier="close"
          />
        </g>
      ) : null}
    </>
  );
}

export function NinjaOneCapitalCityR3({
  camera,
  closeAssetsMounted,
  closeProgress,
  focusDistrict,
  light,
  nativeFoliageFallback,
  preloadDistrict,
  siteAssetsMounted,
  siteProgress,
  tier,
  visibility,
}: {
  readonly camera: CameraView;
  readonly closeAssetsMounted: boolean;
  readonly closeProgress: number;
  readonly focusDistrict: NinjaOneCapitalCityDistrictId | null;
  readonly light: WorldLight;
  readonly nativeFoliageFallback: boolean;
  readonly preloadDistrict: NinjaOneCapitalCityDistrictId | null;
  readonly siteAssetsMounted: boolean;
  readonly siteProgress: number;
  readonly tier: DetailTierId;
  readonly visibility: EnvironmentLayerVisibility;
}) {
  const [width, height] = NINJAONE_CAPITAL_CITY_R3_ARTBOARD;
  if (tier === "world" || tier === "territory") return null;

  const waterInteractionVisible = isEnvironmentLayerEffectivelyVisible(
    visibility,
    "L4_0",
  );
  const waterDetailVisible = waterInteractionVisible && siteAssetsMounted;
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
  const progressiveDistrict = focusDistrict ?? (siteAssetsMounted ? preloadDistrict : null);
  const progressiveDistrictFocused = progressiveDistrict === "D01"
    || progressiveDistrict === "D02"
    || progressiveDistrict === "D03"
    || progressiveDistrict === "D04"
    || progressiveDistrict === "D05";
  const siteNodeOpacity = siteProgress * (1 - closeProgress);
  const closeNodeOpacity = siteProgress * closeProgress;
  const closeFabricVisible = siteAssetsMounted
    && !progressiveDistrictFocused
    && isEnvironmentLayerEffectivelyVisible(visibility, "L4_4");
  const centralArchitectureDetailVisible = closeAssetsMounted && progressiveDistrict === null
    && isEnvironmentLayerEffectivelyVisible(visibility, "L4_4");
  const nativeFoliageVisible = nativeFoliageFallback && closeAssetsMounted
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
  const d01DistrictInFocus = siteAssetsMounted && progressiveDistrict === "D01";
  const d01DistrictLandscapeVisible = d01DistrictInFocus && landscapeVisible;
  const d01DistrictArchitectureVisible = d01DistrictInFocus && architectureVisible;
  const d05DistrictInFocus = siteAssetsMounted && progressiveDistrict === "D05";
  const d05DistrictLandscapeVisible = d05DistrictInFocus && landscapeVisible;
  const d05DistrictArchitectureVisible = d05DistrictInFocus && architectureVisible;
  const d02DistrictInFocus = siteAssetsMounted && progressiveDistrict === "D02";
  const d02DistrictLandscapeVisible = d02DistrictInFocus && landscapeVisible;
  const d02DistrictDetailLayerIds = [
    ...(architectureVisible ? ["L4_3" as const] : []),
    ...(transportationVisible ? ["L4_2" as const] : []),
  ];
  const d02DistrictDetailVisible = d02DistrictInFocus
    && d02DistrictDetailLayerIds.length > 0;
  const d03DistrictInFocus = siteAssetsMounted && progressiveDistrict === "D03";
  const d03DistrictLandscapeVisible = d03DistrictInFocus && landscapeVisible;
  const d03DistrictArchitectureVisible = d03DistrictInFocus && architectureVisible;
  const d04DistrictInFocus = siteAssetsMounted && progressiveDistrict === "D04";
  const d04DistrictLandscapeVisible = d04DistrictInFocus && landscapeVisible;
  const d04DistrictArchitectureVisible = d04DistrictInFocus && architectureVisible;
  const d04DistrictWaterDetailVisible = d04DistrictInFocus && waterDetailVisible;
  const d06StationVisible = transportationVisible
    && (focusDistrict === null || focusDistrict === "D06");
  const contextCutoutMask = d01DistrictLandscapeVisible
    ? "url(#ninjaone-capital-city-r3-d01-detail-cutout)"
    : d02DistrictLandscapeVisible
      ? "url(#ninjaone-capital-city-r3-d02-detail-cutout)"
      : d03DistrictLandscapeVisible
        ? "url(#ninjaone-capital-city-r3-d03-detail-cutout)"
        : d04DistrictLandscapeVisible
          ? "url(#ninjaone-capital-city-r3-d04-detail-cutout)"
          : d05DistrictLandscapeVisible
            ? "url(#ninjaone-capital-city-r3-d05-detail-cutout)"
            : registeredDetailVisible
              ? "url(#ninjaone-capital-city-r3-registered-detail-cutout)"
              : undefined;
  const d06StationBase = tier === "capital"
    ? D06_CAPITAL_REVIEW_BASE
    : D06_SITE_CLOSE_REVIEW_BASE;
  return (
    <g
      data-city-r3-cohort={tier}
      data-city-r3-foliage-policy="reuse-L2-registered-trees-no-supplemental-urban-atlas"
      data-city-r3-representation={progressiveDistrictFocused
        ? `registered-context-plus-progressive-${progressiveDistrict}`
        : "registered-context-plus-atomic-D06"}
      data-city-r3-train-status="deferred-during-terrain-polish"
    >
      <defs>
        <filter
          colorInterpolationFilters="sRGB"
          height="100%"
          id="ninjaone-capital-city-r3-detail-mask-black"
          width="100%"
          x="0%"
          y="0%"
        >
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0
              0 0 0 0 0
              0 0 0 0 0
              0 0 0 1 0"
          />
        </filter>
        <filter
          colorInterpolationFilters="sRGB"
          height="100%"
          id="ninjaone-capital-city-r3-inverse-district-exclusion"
          width="100%"
          x="0%"
          y="0%"
        >
          <feComponentTransfer>
            <feFuncR tableValues="1 0" type="table" />
            <feFuncG tableValues="1 0" type="table" />
            <feFuncB tableValues="1 0" type="table" />
          </feComponentTransfer>
        </filter>
        <filter
          colorInterpolationFilters="sRGB"
          height="100%"
          id="ninjaone-capital-city-r3-inverse-water-mask"
          width="100%"
          x="0%"
          y="0%"
        >
          <feComponentTransfer>
            <feFuncR tableValues="1 0" type="discrete" />
            <feFuncG tableValues="1 0" type="discrete" />
            <feFuncB tableValues="1 0" type="discrete" />
          </feComponentTransfer>
        </filter>
      </defs>
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
      {d01DistrictLandscapeVisible ? (
        <defs>
          <mask
            height={height}
            id="ninjaone-capital-city-r3-d01-detail-cutout"
            maskUnits="userSpaceOnUse"
            style={{ maskType: "luminance" }}
            width={width}
            x={0}
            y={0}
          >
            <rect fill="#fff" height={height} width={width} />
            <image
              filter="url(#ninjaone-capital-city-r3-inverse-district-exclusion)"
              height={height}
              href={D01_CONTEXT_EXCLUSION_REVIEW}
              opacity={siteProgress}
              preserveAspectRatio="none"
              width={width}
            />
          </mask>
          <mask
            height={height}
            id="ninjaone-capital-city-r3-d01-context-clip"
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
      {d02DistrictLandscapeVisible ? (
        <defs>
          <mask
            height={height}
            id="ninjaone-capital-city-r3-d02-detail-cutout"
            maskUnits="userSpaceOnUse"
            style={{ maskType: "luminance" }}
            width={width}
            x={0}
            y={0}
          >
            <rect fill="#fff" height={height} width={width} />
            <image
              filter="url(#ninjaone-capital-city-r3-inverse-district-exclusion)"
              height={height}
              href={D02_CONTEXT_EXCLUSION_REVIEW}
              opacity={siteProgress}
              preserveAspectRatio="none"
              width={width}
            />
          </mask>
        </defs>
      ) : null}
      {d03DistrictLandscapeVisible ? (
        <defs>
          <mask
            height={height}
            id="ninjaone-capital-city-r3-d03-detail-cutout"
            maskUnits="userSpaceOnUse"
            style={{ maskType: "luminance" }}
            width={width}
            x={0}
            y={0}
          >
            <rect fill="#fff" height={height} width={width} />
            <image
              filter="url(#ninjaone-capital-city-r3-inverse-district-exclusion)"
              height={height}
              href={NINJAONE_CAPITAL_CITY_R3_D03_CONTEXT_EXCLUSION_MASK.path}
              opacity={siteProgress}
              preserveAspectRatio="none"
              width={width}
            />
          </mask>
        </defs>
      ) : null}
      {d04DistrictLandscapeVisible ? (
        <defs>
          <mask
            height={height}
            id="ninjaone-capital-city-r3-d04-context-clip"
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
          <mask
            height={height}
            id="ninjaone-capital-city-r3-d04-dry-fabric-clip"
            maskUnits="userSpaceOnUse"
            style={{ maskType: "luminance" }}
            width={width}
            x={0}
            y={0}
          >
            <image
              filter="url(#ninjaone-capital-city-r3-inverse-water-mask)"
              height={height}
              href={NINJAONE_CAPITAL_CITY_R3_PROGRESSIVE_WATER_EXCLUSION_MASK.path}
              preserveAspectRatio="none"
              width={width}
            />
          </mask>
          <mask
            height={height}
            id="ninjaone-capital-city-r3-d04-detail-cutout"
            maskUnits="userSpaceOnUse"
            style={{ maskType: "luminance" }}
            width={width}
            x={0}
            y={0}
          >
            <rect fill="#fff" height={height} width={width} />
            <image
              filter="url(#ninjaone-capital-city-r3-inverse-district-exclusion)"
              height={height}
              href={D04_CONTEXT_EXCLUSION_REVIEW}
              opacity={siteProgress}
              preserveAspectRatio="none"
              width={width}
            />
          </mask>
        </defs>
      ) : null}
      {d05DistrictLandscapeVisible ? (
        <defs>
          <mask
            height={height}
            id="ninjaone-capital-city-r3-d05-detail-cutout"
            maskUnits="userSpaceOnUse"
            style={{ maskType: "luminance" }}
            width={width}
            x={0}
            y={0}
          >
            <rect fill="#fff" height={height} width={width} />
            <image
              filter="url(#ninjaone-capital-city-r3-inverse-district-exclusion)"
              height={height}
              href={D05_CONTEXT_EXCLUSION_REVIEW}
              opacity={siteProgress}
              preserveAspectRatio="none"
              width={width}
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
      {waterDetailVisible ? (
        <image
          className="ninjaone-capital-city__r3-water-detail"
          data-city-asset-id="WFX01"
          data-city-child-layer="L4_0"
          data-city-runtime-status="manifest-declared"
          data-city-water-detail-tier={tier}
          height={height}
          href={CITY_BRIDGE_WATER_DETAIL_REVIEW}
          opacity={siteProgress * (0.68 + closeProgress * 0.32)}
          preserveAspectRatio="none"
          width={width}
        />
      ) : null}
      {d04DistrictWaterDetailVisible ? (
        <image
          className="ninjaone-capital-city__r3-d04-water-contact"
          data-city-asset-id="D04W02"
          data-city-child-layer="L4_0"
          data-city-runtime-status="manifest-declared"
          height={height}
          href={D04_S14_WATER_CONTACT_REVIEW}
          opacity={siteProgress}
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
        mask={contextCutoutMask}
        preserveAspectRatio="none"
        width={width}
      />
      {d01DistrictLandscapeVisible ? (
        <image
          className="ninjaone-capital-city__r3-d01-grounding"
          data-city-asset-id="D01L02"
          data-city-child-layer="L4_1"
          data-city-runtime-status="manifest-declared"
          height={height}
          href={D01_GROUNDING_AND_CIRCULATION_REVIEW}
          opacity={siteProgress}
          preserveAspectRatio="none"
          width={width}
        />
      ) : null}
      {d02DistrictLandscapeVisible ? (
        <image
          className="ninjaone-capital-city__r3-d02-grounding"
          data-city-asset-id="D02L02"
          data-city-child-layer="L4_1"
          data-city-runtime-status="manifest-declared"
          height={height}
          href={D02_GROUNDING_AND_CIRCULATION_REVIEW}
          opacity={siteProgress}
          preserveAspectRatio="none"
          width={width}
        />
      ) : null}
      {d03DistrictLandscapeVisible ? (
        <image
          className="ninjaone-capital-city__r3-d03-ground-contact"
          data-city-asset-id="D03L02"
          data-city-child-layer="L4_1"
          data-city-runtime-status="manifest-declared"
          height={height}
          href={D03_GROUND_CONTACT_REVIEW}
          opacity={siteProgress * (0.12 + closeProgress * 0.02)}
          preserveAspectRatio="none"
          width={width}
        />
      ) : null}
      {d03DistrictLandscapeVisible ? (
        <image
          className="ninjaone-capital-city__r3-d03-terrain-integration"
          data-city-asset-id="D03L03"
          data-city-child-layer="L4_1"
          data-city-runtime-status="manifest-declared"
          height={height}
          href={D03_TERRAIN_INTEGRATION_DETAIL_REVIEW}
          opacity={siteProgress}
          preserveAspectRatio="none"
          width={width}
        />
      ) : null}
      {d03DistrictLandscapeVisible ? (
        <image
          className="ninjaone-capital-city__r3-d03-retaining-circulation-mass"
          data-city-asset-id="D03L04"
          data-city-child-layer="L4_1"
          data-city-runtime-status="manifest-declared"
          height={
            D03_RETAINING_CIRCULATION_MASS_PLACEMENT.baseSize[1]
              * D03_RETAINING_CIRCULATION_MASS_PLACEMENT.scale
          }
          href={D03_RETAINING_CIRCULATION_MASS_REVIEW}
          opacity={siteProgress}
          preserveAspectRatio="none"
          width={
            D03_RETAINING_CIRCULATION_MASS_PLACEMENT.baseSize[0]
              * D03_RETAINING_CIRCULATION_MASS_PLACEMENT.scale
          }
          x={D03_RETAINING_CIRCULATION_MASS_PLACEMENT.anchor[0]}
          y={D03_RETAINING_CIRCULATION_MASS_PLACEMENT.anchor[1]}
        />
      ) : null}
      {d04DistrictLandscapeVisible ? (
        <image
          className="ninjaone-capital-city__r3-d04-grounding"
          data-city-asset-id="D04L02"
          data-city-child-layer="L4_1"
          data-city-runtime-status="manifest-declared"
          height={height}
          href={D04_GROUNDING_AND_CIRCULATION_REVIEW}
          opacity={siteProgress}
          preserveAspectRatio="none"
          width={width}
        />
      ) : null}
      {d05DistrictLandscapeVisible ? (
        <image
          className="ninjaone-capital-city__r3-d05-ground-integration"
          data-city-asset-id="D05L02"
          data-city-child-layer="L4_1"
          data-city-runtime-status="manifest-declared"
          height={height}
          href={D05_GROUND_INTEGRATION_REVIEW}
          opacity={siteProgress}
          preserveAspectRatio="none"
          width={width}
        />
      ) : null}
      {d05DistrictLandscapeVisible ? (
        <image
          className="ninjaone-capital-city__r3-d05-terrain-integration"
          data-city-asset-id="D05L03"
          data-city-child-layer="L4_1"
          data-city-runtime-status="manifest-declared"
          height={height}
          href={D05_TERRAIN_INTEGRATION_DETAIL_REVIEW}
          opacity={siteProgress * (0.54 + closeProgress * 0.08)}
          preserveAspectRatio="none"
          width={width}
        />
      ) : null}
      {d05DistrictLandscapeVisible ? (
        <image
          className="ninjaone-capital-city__r3-d05-terrace-mass"
          data-city-asset-id="D05L04"
          data-city-child-layer="L4_1"
          data-city-runtime-status="manifest-declared"
          height={D05_TERRACE_MASS_PLACEMENT.baseSize[1] * D05_TERRACE_MASS_PLACEMENT.scale}
          href={D05_TERRACE_MASS_REVIEW}
          opacity={siteProgress}
          preserveAspectRatio="none"
          width={D05_TERRACE_MASS_PLACEMENT.baseSize[0] * D05_TERRACE_MASS_PLACEMENT.scale}
          x={D05_TERRACE_MASS_PLACEMENT.anchor[0]}
          y={D05_TERRACE_MASS_PLACEMENT.anchor[1]}
        />
      ) : null}
      {d01DistrictArchitectureVisible ? (
        <g mask="url(#ninjaone-capital-city-r3-d01-context-clip)">
          <ProgressiveDistrictAssetNodes
            camera={camera}
            closeMounted={closeAssetsMounted}
            closeOpacity={closeNodeOpacity}
            district="D01"
            layerIds={["L4_3"]}
            light={light}
            siteMounted={siteAssetsMounted}
            siteOpacity={siteNodeOpacity}
          />
        </g>
      ) : null}
      {d05DistrictArchitectureVisible ? (
        <ProgressiveDistrictAssetNodes
          camera={camera}
          closeMounted={closeAssetsMounted}
          closeOpacity={closeNodeOpacity}
          district="D05"
          layerIds={["L4_3"]}
          light={light}
          siteMounted={siteAssetsMounted}
          siteOpacity={siteNodeOpacity}
        />
      ) : null}
      {d02DistrictDetailVisible ? (
        <ProgressiveDistrictAssetNodes
          camera={camera}
          closeMounted={closeAssetsMounted}
          closeOpacity={closeNodeOpacity}
          district="D02"
          layerIds={d02DistrictDetailLayerIds}
          light={light}
          siteMounted={siteAssetsMounted}
          siteOpacity={siteNodeOpacity}
        />
      ) : null}
      {d03DistrictArchitectureVisible ? (
        <ProgressiveDistrictAssetNodes
          camera={camera}
          closeMounted={closeAssetsMounted}
          closeOpacity={closeNodeOpacity}
          district="D03"
          layerIds={["L4_3"]}
          light={light}
          siteMounted={siteAssetsMounted}
          siteOpacity={siteNodeOpacity}
        />
      ) : null}
      {d04DistrictArchitectureVisible ? (
        <g mask="url(#ninjaone-capital-city-r3-d04-dry-fabric-clip)">
          <g mask="url(#ninjaone-capital-city-r3-d04-context-clip)">
            <ProgressiveDistrictAssetNodes
              camera={camera}
              closeMounted={closeAssetsMounted}
              closeOpacity={closeNodeOpacity}
              district="D04"
              layerIds={["L4_3"]}
              light={light}
              siteMounted={siteAssetsMounted}
              siteOpacity={siteNodeOpacity}
            />
          </g>
        </g>
      ) : null}
      {d04DistrictArchitectureVisible ? (
        <image
          className="ninjaone-capital-city__r3-d04-s14-gateway"
          data-city-asset-id="S14"
          data-city-child-layer="L4_3"
          data-city-runtime-status="manifest-declared"
          height={D04_S14_REVIEW_HEIGHT}
          href={D04_S14_COMPACT_GATEWAY_REVIEW}
          opacity={siteProgress}
          preserveAspectRatio="xMidYMid meet"
          width={D04_S14_REVIEW_WIDTH}
          x={D04_S14_REVIEW_ANCHOR[0] - D04_S14_REVIEW_WIDTH * 0.5}
          y={D04_S14_REVIEW_ANCHOR[1] - D04_S14_REVIEW_HEIGHT}
        />
      ) : null}
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
          opacity={siteProgress * (0.48 + closeProgress * 0.52)}
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
          opacity={closeProgress}
          preserveAspectRatio="none"
          width={width}
        />
      ) : null}
      {nativeFoliageVisible ? (
        <g
          mask="url(#ninjaone-capital-city-r3-native-foliage-clip)"
          opacity={closeProgress}
        >
          <NinjaOneCapitalNativeFoliage
            camera={camera}
            focusDistrict={progressiveDistrict}
            maximumSpan={focusDistrict === null
              ? NINJAONE_CAPITAL_CITY_DETAIL_POLICY.closeAssetPreloadSpan
              : Math.max(...camera.span)}
          />
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
