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
  NINJAONE_CAPITAL_CITY_R3_PROGRESSIVE_WATER_EXCLUSION_MASK,
  NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS,
  NINJAONE_CAPITAL_CITY_R3_WATER_INTERACTION,
} from "../model/ninjaOneCapitalCityFoundationR3";
import { NINJAONE_CAPITAL_D05_CONCEPT } from "../model/ninjaOneCapitalD05Concept";
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
const CITY_BRIDGE_WATER_DETAIL_SOURCE_WINDOW =
  NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.WFX01.sourceWindow!;
const CITY_UPPER_REAR_RIDGE_UNDERLAY_REVIEW =
  NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.LFX06.asset.path;
const CITY_UPPER_REAR_RIDGE_UNDERLAY_SOURCE_WINDOW =
  NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.LFX06.sourceWindow!;
const CITY_CLOSE_FABRIC_DETAIL_REVIEW =
  NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.CFX01.asset.path;
const CITY_CLOSE_FABRIC_DETAIL_SOURCE_WINDOW =
  NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.CFX01.sourceWindow!;
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
  const d05Transform = `translate(${NINJAONE_CAPITAL_D05_CONCEPT.transform.offset.join(" ")}) scale(${NINJAONE_CAPITAL_D05_CONCEPT.transform.scale.join(" ")})`;
  // The shore plate's registered bounds overhang the city artboard (west coast,
  // south nature band), so the D05 mask regions must span the union of both.
  const d05MaskRegion = {
    x: Math.min(0, NINJAONE_CAPITAL_D05_CONCEPT.masterBounds[0]),
    y: Math.min(0, NINJAONE_CAPITAL_D05_CONCEPT.masterBounds[1]),
    width:
      Math.max(width, NINJAONE_CAPITAL_D05_CONCEPT.masterBounds[2])
      - Math.min(0, NINJAONE_CAPITAL_D05_CONCEPT.masterBounds[0]),
    height:
      Math.max(height, NINJAONE_CAPITAL_D05_CONCEPT.masterBounds[3])
      - Math.min(0, NINJAONE_CAPITAL_D05_CONCEPT.masterBounds[1]),
  };
  // T6a foliage wind-shimmer: a displaced copy of the plate, revealed only
  // through the derived canopy mask (1.7% coverage, 16px architecture standoff).
  const D05_FOLIAGE_SHIMMER_MASK_PATH =
    "/career-world/capitals/ninjaone/city-v2/plates/d05-foliage-shimmer-mask-r1.png";
  const D05_FOLIAGE_SHIMMER_MASK_DIMENSIONS: readonly [number, number] = [1305, 1205];
  // Owner-directed cutover (2026-08-23): the legacy dusk city art is unmounted
  // from the live view while its assets stay on disk until the bright rebuild
  // fully replaces it. Flip to true to restore the old composite for reference.
  const LEGACY_CITY_ART_VISIBLE = false;

  const waterInteractionVisible = LEGACY_CITY_ART_VISIBLE
    && isEnvironmentLayerEffectivelyVisible(
      visibility,
      "L4_0",
    );
  const waterDetailVisible = waterInteractionVisible && siteAssetsMounted;
  const landscapeVisible = LEGACY_CITY_ART_VISIBLE
    && isEnvironmentLayerEffectivelyVisible(
      visibility,
      "L4_1",
    );
  const transportationVisible = LEGACY_CITY_ART_VISIBLE
    && isEnvironmentLayerEffectivelyVisible(
      visibility,
      "L4_2",
    );
  const architectureVisible = LEGACY_CITY_ART_VISIBLE
    && isEnvironmentLayerEffectivelyVisible(
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
  const closeFabricVisible = LEGACY_CITY_ART_VISIBLE && siteAssetsMounted
    && !progressiveDistrictFocused
    && isEnvironmentLayerEffectivelyVisible(visibility, "L4_4");
  const centralArchitectureDetailVisible = LEGACY_CITY_ART_VISIBLE
    && closeAssetsMounted && progressiveDistrict === null
    && isEnvironmentLayerEffectivelyVisible(visibility, "L4_4");
  const nativeFoliageVisible = LEGACY_CITY_ART_VISIBLE
    && nativeFoliageFallback && closeAssetsMounted
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
          : registeredDetailVisible
            ? "url(#ninjaone-capital-city-r3-registered-detail-cutout)"
            : undefined;
  const d06StationBase = tier === "capital"
    ? D06_CAPITAL_REVIEW_BASE
    : D06_SITE_CLOSE_REVIEW_BASE;
  const d06StationSourceWindow = tier === "capital"
    ? null
    : NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.I24.sourceWindow!;
  return (
    <g
      data-city-r3-cohort={tier}
      data-city-r3-foliage-policy="reuse-L2-registered-trees-no-supplemental-urban-atlas"
      data-city-r3-representation={progressiveDistrict === "D05"
        ? "registered-context-with-d05-concept"
        : progressiveDistrictFocused
          ? `registered-context-with-d05-concept-plus-progressive-${progressiveDistrict}`
          : "registered-context-with-d05-concept-plus-atomic-D06"}
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
      <defs>
        <mask
          height={d05MaskRegion.height}
          id="ninjaone-capital-city-d05-concept-context-cutout"
          maskUnits="userSpaceOnUse"
          style={{ maskType: "luminance" }}
          width={d05MaskRegion.width}
          x={d05MaskRegion.x}
          y={d05MaskRegion.y}
        >
          <rect
            fill="#fff"
            height={d05MaskRegion.height}
            width={d05MaskRegion.width}
            x={d05MaskRegion.x}
            y={d05MaskRegion.y}
          />
          <image
            filter="url(#ninjaone-capital-city-r3-inverse-district-exclusion)"
            height={NINJAONE_CAPITAL_D05_CONCEPT.usableMask.dimensions[1]}
            href={NINJAONE_CAPITAL_D05_CONCEPT.usableMask.path}
            preserveAspectRatio="none"
            transform={d05Transform}
            width={NINJAONE_CAPITAL_D05_CONCEPT.usableMask.dimensions[0]}
            x={0}
            y={0}
          />
        </mask>
        <mask
          height={d05MaskRegion.height}
          id="ninjaone-capital-city-d05-concept-usable-mask"
          maskUnits="userSpaceOnUse"
          style={{ maskType: "luminance" }}
          width={d05MaskRegion.width}
          x={d05MaskRegion.x}
          y={d05MaskRegion.y}
        >
          <image
            height={NINJAONE_CAPITAL_D05_CONCEPT.usableMask.dimensions[1]}
            href={NINJAONE_CAPITAL_D05_CONCEPT.usableMask.path}
            preserveAspectRatio="none"
            transform={d05Transform}
            width={NINJAONE_CAPITAL_D05_CONCEPT.usableMask.dimensions[0]}
            x={0}
            y={0}
          />
        </mask>
        <filter
          height={d05MaskRegion.height}
          id="ninjaone-capital-city-d05-foliage-shimmer-filter"
          width={d05MaskRegion.width}
          x={d05MaskRegion.x}
          y={d05MaskRegion.y}
          filterUnits="userSpaceOnUse"
        >
          <feTurbulence
            baseFrequency="0.012 0.02"
            numOctaves={2}
            result="ninjaone-d05-shimmer-noise"
            seed={7}
            type="fractalNoise"
          />
          <feOffset in="ninjaone-d05-shimmer-noise" result="ninjaone-d05-shimmer-wind">
            <animate
              attributeName="dx"
              dur="11s"
              repeatCount="indefinite"
              values="0;10;0"
            />
            <animate
              attributeName="dy"
              dur="8s"
              repeatCount="indefinite"
              values="0;4;0"
            />
          </feOffset>
          <feDisplacementMap
            in="SourceGraphic"
            in2="ninjaone-d05-shimmer-wind"
            scale={4}
            xChannelSelector="R"
            yChannelSelector="G"
          >
            <animate
              attributeName="scale"
              dur="7s"
              repeatCount="indefinite"
              values="1.5;3.2;1.5"
            />
          </feDisplacementMap>
        </filter>
        <mask
          height={d05MaskRegion.height}
          id="ninjaone-capital-city-d05-foliage-shimmer-mask"
          maskUnits="userSpaceOnUse"
          style={{ maskType: "luminance" }}
          width={d05MaskRegion.width}
          x={d05MaskRegion.x}
          y={d05MaskRegion.y}
        >
          <image
            height={D05_FOLIAGE_SHIMMER_MASK_DIMENSIONS[1]}
            href={D05_FOLIAGE_SHIMMER_MASK_PATH}
            preserveAspectRatio="none"
            transform={d05Transform}
            width={D05_FOLIAGE_SHIMMER_MASK_DIMENSIONS[0]}
            x={0}
            y={0}
          />
        </mask>
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
          height={NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.WFX01.asset.dimensions[1]}
          href={CITY_BRIDGE_WATER_DETAIL_REVIEW}
          opacity={siteProgress * (0.68 + closeProgress * 0.32)}
          preserveAspectRatio="none"
          width={NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.WFX01.asset.dimensions[0]}
          x={CITY_BRIDGE_WATER_DETAIL_SOURCE_WINDOW.origin[0]}
          y={CITY_BRIDGE_WATER_DETAIL_SOURCE_WINDOW.origin[1]}
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
          height={NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.LFX06.asset.dimensions[1]}
          href={CITY_UPPER_REAR_RIDGE_UNDERLAY_REVIEW}
          preserveAspectRatio="none"
          width={NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.LFX06.asset.dimensions[0]}
          x={CITY_UPPER_REAR_RIDGE_UNDERLAY_SOURCE_WINDOW.origin[0]}
          y={CITY_UPPER_REAR_RIDGE_UNDERLAY_SOURCE_WINDOW.origin[1]}
        />
      ) : null}
      {LEGACY_CITY_ART_VISIBLE ? (
        <g mask="url(#ninjaone-capital-city-d05-concept-context-cutout)">
          <image
            className="ninjaone-capital-city__r3-image"
            data-city-cohort-ownership="L4-capital-composite"
            height={height}
            href={NINJAONE_CAPITAL_CITY_R3_CONTEXT.path}
            mask={contextCutoutMask}
            preserveAspectRatio="none"
            width={width}
          />
        </g>
      ) : null}
      {/* Positioned via x/y/width/height into the registered master rect rather than a
          transform: a transform on this element would shift the userSpaceOnUse mask's
          coordinate space, applying the registration transform to the mask twice. */}
      <image
        className="ninjaone-capital-city__d05-concept"
        data-city-concept-id={NINJAONE_CAPITAL_D05_CONCEPT.id}
        data-city-district="D05"
        data-city-representation-class="approved-concept-plate"
        height={
          NINJAONE_CAPITAL_D05_CONCEPT.masterBounds[3] - NINJAONE_CAPITAL_D05_CONCEPT.masterBounds[1]
        }
        href={NINJAONE_CAPITAL_D05_CONCEPT.plate.path}
        mask="url(#ninjaone-capital-city-d05-concept-usable-mask)"
        preserveAspectRatio="none"
        width={
          NINJAONE_CAPITAL_D05_CONCEPT.masterBounds[2] - NINJAONE_CAPITAL_D05_CONCEPT.masterBounds[0]
        }
        x={NINJAONE_CAPITAL_D05_CONCEPT.masterBounds[0]}
        y={NINJAONE_CAPITAL_D05_CONCEPT.masterBounds[1]}
      />
      <g mask="url(#ninjaone-capital-city-d05-concept-usable-mask)">
        <image
          className="ninjaone-capital-city__d05-foliage-shimmer"
          data-city-effect="foliage-wind-shimmer"
          height={
            NINJAONE_CAPITAL_D05_CONCEPT.masterBounds[3] - NINJAONE_CAPITAL_D05_CONCEPT.masterBounds[1]
          }
          href={NINJAONE_CAPITAL_D05_CONCEPT.plate.path}
          mask="url(#ninjaone-capital-city-d05-foliage-shimmer-mask)"
          preserveAspectRatio="none"
          width={
            NINJAONE_CAPITAL_D05_CONCEPT.masterBounds[2] - NINJAONE_CAPITAL_D05_CONCEPT.masterBounds[0]
          }
          x={NINJAONE_CAPITAL_D05_CONCEPT.masterBounds[0]}
          y={NINJAONE_CAPITAL_D05_CONCEPT.masterBounds[1]}
        />
      </g>
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
          height={NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.CFX01.asset.dimensions[1]}
          href={CITY_CLOSE_FABRIC_DETAIL_REVIEW}
          mask={registeredDetailVisible
            ? "url(#ninjaone-capital-city-r3-registered-detail-cutout)"
            : undefined}
          opacity={siteProgress * (0.48 + closeProgress * 0.52)}
          preserveAspectRatio="none"
          width={NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.CFX01.asset.dimensions[0]}
          x={CITY_CLOSE_FABRIC_DETAIL_SOURCE_WINDOW.origin[0]}
          y={CITY_CLOSE_FABRIC_DETAIL_SOURCE_WINDOW.origin[1]}
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
      {d06StationVisible ? d06StationSourceWindow ? (
        <svg
          height={d06StationBase.height}
          preserveAspectRatio="xMidYMid meet"
          viewBox={`0 0 ${d06StationSourceWindow.sourceDimensions.join(" ")}`}
          width={d06StationBase.width}
          x={d06StationBase.anchorX - d06StationBase.width * 0.5}
          y={1086 - d06StationBase.height}
        >
          <image
            className="ninjaone-capital-city__r3-image"
            data-city-asset-id={d06StationBase.assetId}
            data-city-asset-source-tier="site-close"
            data-city-child-layer="L4_2"
            data-city-runtime-scale={d06StationBase.scale}
            data-city-runtime-status="manifest-declared"
            height={NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.I24.asset.dimensions[1]}
            href={d06StationBase.path}
            preserveAspectRatio="none"
            width={NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS.I24.asset.dimensions[0]}
            x={d06StationSourceWindow.origin[0]}
            y={d06StationSourceWindow.origin[1]}
          />
        </svg>
      ) : (
        <image
          className="ninjaone-capital-city__r3-image"
          data-city-asset-id={d06StationBase.assetId}
          data-city-asset-source-tier="capital"
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
