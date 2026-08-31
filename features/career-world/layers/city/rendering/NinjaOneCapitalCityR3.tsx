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
import {
  NINJAONE_CAPITAL_D05_CONCEPT,
  ninjaOneCapitalD05WaterEffectTuning,
  ninjaOneCapitalD05ConceptTierForSpan,
  ninjaOneCapitalD05ConceptTierWeights,
  type NinjaOneCapitalD05WaterEffectTuning,
} from "../model/ninjaOneCapitalD05Concept";
import {
  NINJAONE_CAPITAL_CITY_DETAIL_POLICY,
  ninjaOneCapitalCitySemanticHandoffWeights,
  ninjaOneCapitalCityUsesFreeCameraDetailCohort,
  type NinjaOneCapitalCityDistrictId,
} from "../model/ninjaOneCapitalCityRepresentations";
import type { CityLayerId } from "../model/ninjaOneCapitalCityLayer";
import { NinjaOneCapitalAssetNodes } from "./NinjaOneCapitalAssetNodes";
import { NinjaOneCapitalNativeFoliage } from "./NinjaOneCapitalNativeFoliage";
import { NinjaOneCapitalD05WaterComposite } from "./NinjaOneCapitalD05WaterComposite";

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
  territoryProgress,
  tier,
  visibility,
  waterEffectTuning,
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
  readonly territoryProgress: number;
  readonly tier: DetailTierId;
  readonly visibility: EnvironmentLayerVisibility;
  readonly waterEffectTuning?: Pick<
    NinjaOneCapitalD05WaterEffectTuning,
    "cityWaterOpacity" | "cityWaterShoreRamp" | "sparkle" | "foam" | "crest" | "relight" | "cycling" | "swell"
  >;
}) {
  const [width, height] = NINJAONE_CAPITAL_CITY_R3_ARTBOARD;
  if (tier === "world" || territoryProgress <= 0) return null;
  const cameraSpan = Math.max(...camera.span);
  const d05Tier = ninjaOneCapitalD05ConceptTierForSpan(cameraSpan);
  const semanticHandoff = ninjaOneCapitalCitySemanticHandoffWeights(cameraSpan);
  const d05TierWeights = ninjaOneCapitalD05ConceptTierWeights({
    capitalToSite: siteProgress,
    siteToClose: closeProgress,
  });
  const d05WaterEffectTuning = {
    ...ninjaOneCapitalD05WaterEffectTuning(
      typeof window === "undefined" ? "" : window.location.search,
    ),
    ...waterEffectTuning,
  };
  const waterEffects = NINJAONE_CAPITAL_D05_CONCEPT.waterEffects;
  const waterSparkleFrames = waterEffects.sparkle.frames;
  const waterSparkleValues = [...waterSparkleFrames, waterSparkleFrames[0]].join(";");
  const waterSparkleKeyTimes = Array.from(
    { length: waterSparkleFrames.length + 1 },
    (_, index) => (index / waterSparkleFrames.length).toFixed(5),
  ).join(";");
  const waterCrestTravel = waterEffects.crest.travelDirection.map((value) => (
    Number((value * 12).toFixed(2))
  ));
  // Preserve tier weighting without reducing the capital/site carrier below
  // readable contrast at the registered display scale.
  const d05WaterZoomWeight = d05Tier.id === "close" ? 1 : d05Tier.id === "site" ? 0.98 : 0.9;
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
  return (
    <g
      data-city-r3-cohort={tier}
      data-city-r3-foliage-policy="reuse-L2-registered-trees-no-supplemental-urban-atlas"
      data-city-r3-representation={progressiveDistrict === "D05"
        ? "registered-context-with-d05-concept"
        : progressiveDistrictFocused
          ? `registered-context-with-d05-concept-plus-progressive-${progressiveDistrict}`
          : "registered-context-with-d05-concept"}
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
          id="ninjaone-capital-city-d05-concept-non-water-mask"
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
          <g mask="url(#ninjaone-capital-city-d05-concept-usable-mask)">
            <image
              filter="url(#ninjaone-capital-city-r3-inverse-water-mask)"
              height={waterEffects.fieldDimensions[1]}
              href={waterEffects.waterMaskPath}
              preserveAspectRatio="none"
              transform={d05Transform}
              width={waterEffects.fieldDimensions[0]}
              x={0}
              y={0}
            />
          </g>
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
            height={NINJAONE_CAPITAL_D05_CONCEPT.foliageShimmerMask.dimensions[1]}
            href={NINJAONE_CAPITAL_D05_CONCEPT.foliageShimmerMask.path}
            preserveAspectRatio="none"
            transform={d05Transform}
            width={NINJAONE_CAPITAL_D05_CONCEPT.foliageShimmerMask.dimensions[0]}
            x={0}
            y={0}
          />
        </mask>
        <filter
          height={d05MaskRegion.height}
          id="ninjaone-capital-city-d05-water-foam-filter"
          width={d05MaskRegion.width}
          x={d05MaskRegion.x}
          y={d05MaskRegion.y}
          filterUnits="userSpaceOnUse"
        >
          <feTurbulence
            baseFrequency="0.028 0.012"
            numOctaves={1}
            result="ninjaone-d05-water-foam-noise"
            seed={23}
            type="fractalNoise"
          />
          <feOffset in="ninjaone-d05-water-foam-noise" result="ninjaone-d05-water-foam-lap">
            <animate attributeName="dx" dur="9s" repeatCount="indefinite" values="0;5;0" />
            <animate attributeName="dy" dur="9s" repeatCount="indefinite" values="0;2;0" />
          </feOffset>
          <feColorMatrix
            in="ninjaone-d05-water-foam-lap"
            result="ninjaone-d05-water-foam-phase"
            type="matrix"
            values="0 0 0 0 0
              0 0 0 0 0
              0 0 0 0 0
              0.18 0.18 0.18 0 0"
          />
          <feFlood floodColor="#dceff5" result="ninjaone-d05-water-foam-light" />
          <feComposite
            in="ninjaone-d05-water-foam-light"
            in2="ninjaone-d05-water-foam-phase"
            operator="in"
            result="ninjaone-d05-water-foam-light-phase"
          />
          <feBlend in="SourceGraphic" in2="ninjaone-d05-water-foam-light-phase" mode="screen" />
        </filter>
        <filter
          height={d05MaskRegion.height}
          id="ninjaone-capital-city-d05-water-crest-filter"
          width={d05MaskRegion.width}
          x={d05MaskRegion.x}
          y={d05MaskRegion.y}
          filterUnits="userSpaceOnUse"
        >
          <feTurbulence
            baseFrequency="0.011 0.007"
            numOctaves={1}
            result="ninjaone-d05-water-crest-noise"
            seed={29}
            type="fractalNoise"
          />
          <feOffset in="ninjaone-d05-water-crest-noise" result="ninjaone-d05-water-crest-travel">
            <animate
              attributeName="dx"
              dur="11s"
              repeatCount="indefinite"
              values={`0;${waterCrestTravel[0]};0`}
            />
            <animate
              attributeName="dy"
              dur="11s"
              repeatCount="indefinite"
              values={`0;${waterCrestTravel[1]};0`}
            />
          </feOffset>
          <feColorMatrix
            in="ninjaone-d05-water-crest-travel"
            result="ninjaone-d05-water-crest-phase"
            type="matrix"
            values="0 0 0 0 0
              0 0 0 0 0
              0 0 0 0 0
              0.15 0.15 0.15 0 0"
          />
          <feFlood floodColor="#d6edf4" result="ninjaone-d05-water-crest-light" />
          <feComposite
            in="ninjaone-d05-water-crest-light"
            in2="ninjaone-d05-water-crest-phase"
            operator="in"
            result="ninjaone-d05-water-crest-light-phase"
          />
          <feBlend in="SourceGraphic" in2="ninjaone-d05-water-crest-light-phase" mode="screen" />
        </filter>
        <mask
          height={d05MaskRegion.height}
          id="ninjaone-capital-city-d05-water-sparkle-mask"
          maskUnits="userSpaceOnUse"
          style={{ maskType: "luminance" }}
          width={d05MaskRegion.width}
          x={d05MaskRegion.x}
          y={d05MaskRegion.y}
        >
          <image
            height={waterEffects.dimensions[1]}
            href={waterSparkleFrames[0]}
            preserveAspectRatio="none"
            transform={d05Transform}
            width={waterEffects.dimensions[0]}
            x={0}
            y={0}
          >
            <animate
              attributeName="href"
              calcMode="discrete"
              dur={`${waterEffects.sparkle.loopSeconds}s`}
              keyTimes={waterSparkleKeyTimes}
              repeatCount="indefinite"
              values={waterSparkleValues}
            />
          </image>
        </mask>
        <mask
          height={d05MaskRegion.height}
          id="ninjaone-capital-city-d05-water-foam-mask"
          maskUnits="userSpaceOnUse"
          style={{ maskType: "luminance" }}
          width={d05MaskRegion.width}
          x={d05MaskRegion.x}
          y={d05MaskRegion.y}
        >
          <image
            height={waterEffects.dimensions[1]}
            href={waterEffects.foamMaskPath}
            preserveAspectRatio="none"
            transform={d05Transform}
            width={waterEffects.dimensions[0]}
            x={0}
            y={0}
          />
        </mask>
        <mask
          height={d05MaskRegion.height}
          id="ninjaone-capital-city-d05-water-crest-mask"
          maskUnits="userSpaceOnUse"
          style={{ maskType: "luminance" }}
          width={d05MaskRegion.width}
          x={d05MaskRegion.x}
          y={d05MaskRegion.y}
        >
          <image
            height={waterEffects.dimensions[1]}
            href={waterEffects.crest.maskPath}
            preserveAspectRatio="none"
            transform={d05Transform}
            width={waterEffects.dimensions[0]}
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
      <image
        className="ninjaone-capital-city__d05-territory-register"
        data-city-district="D05"
        data-city-representation-class="symbolic-territory-register"
        data-city-spatial-contract="semantic-register-not-physical-scale"
        data-city-tier="territory-register"
        height={
          NINJAONE_CAPITAL_D05_CONCEPT.masterBounds[3] - NINJAONE_CAPITAL_D05_CONCEPT.masterBounds[1]
        }
        href={NINJAONE_CAPITAL_D05_CONCEPT.tiers.territoryRegister.path}
        mask="url(#ninjaone-capital-city-d05-concept-non-water-mask)"
        opacity={semanticHandoff.territoryRegisterOpacity}
        preserveAspectRatio="none"
        width={
          NINJAONE_CAPITAL_D05_CONCEPT.masterBounds[2] - NINJAONE_CAPITAL_D05_CONCEPT.masterBounds[0]
        }
        x={NINJAONE_CAPITAL_D05_CONCEPT.masterBounds[0]}
        y={NINJAONE_CAPITAL_D05_CONCEPT.masterBounds[1]}
      />
      <g
        data-city-canon-opacity={semanticHandoff.canonOpacity.toFixed(3)}
        data-city-canon-handoff="capital-detail-only"
        opacity={semanticHandoff.canonOpacity}
      >
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
      {d05TierWeights.map(({ opacity, tier: sourceTier }) => (
        <image
          key={sourceTier.id}
          className="ninjaone-capital-city__d05-concept"
          data-city-concept-id={NINJAONE_CAPITAL_D05_CONCEPT.id}
          data-city-district="D05"
          data-city-representation-class="approved-concept-plate"
          data-city-tier={sourceTier.id}
          height={
            NINJAONE_CAPITAL_D05_CONCEPT.masterBounds[3] - NINJAONE_CAPITAL_D05_CONCEPT.masterBounds[1]
          }
          href={sourceTier.path}
          mask="url(#ninjaone-capital-city-d05-concept-non-water-mask)"
          opacity={opacity}
          preserveAspectRatio="none"
          width={
            NINJAONE_CAPITAL_D05_CONCEPT.masterBounds[2] - NINJAONE_CAPITAL_D05_CONCEPT.masterBounds[0]
          }
          x={NINJAONE_CAPITAL_D05_CONCEPT.masterBounds[0]}
          y={NINJAONE_CAPITAL_D05_CONCEPT.masterBounds[1]}
        />
      ))}
      <g mask="url(#ninjaone-capital-city-d05-concept-usable-mask)">
        <image
          className="ninjaone-capital-city__d05-foliage-shimmer"
          data-city-effect="foliage-wind-shimmer"
          height={
            NINJAONE_CAPITAL_D05_CONCEPT.masterBounds[3] - NINJAONE_CAPITAL_D05_CONCEPT.masterBounds[1]
          }
          href={d05Tier.path}
          mask="url(#ninjaone-capital-city-d05-foliage-shimmer-mask)"
          preserveAspectRatio="none"
          width={
            NINJAONE_CAPITAL_D05_CONCEPT.masterBounds[2] - NINJAONE_CAPITAL_D05_CONCEPT.masterBounds[0]
          }
          x={NINJAONE_CAPITAL_D05_CONCEPT.masterBounds[0]}
          y={NINJAONE_CAPITAL_D05_CONCEPT.masterBounds[1]}
        />
      </g>
      <g
        data-city-effect="canon-water-effects"
        data-city-water-direction-field={waterEffects.crest.directionFieldPath}
        data-city-water-effects={`opacity:${d05WaterEffectTuning.cityWaterOpacity};shoreRamp:${d05WaterEffectTuning.cityWaterShoreRamp};sparkle:${d05WaterEffectTuning.sparkle};foam:${d05WaterEffectTuning.foam};crest:${d05WaterEffectTuning.crest};relight:${d05WaterEffectTuning.relight};cycling:${d05WaterEffectTuning.cycling};swell:${d05WaterEffectTuning.swell}`}
        mask="url(#ninjaone-capital-city-d05-concept-usable-mask)"
      >
        <g transform={d05Transform}>
          <foreignObject
            height={waterEffects.fieldDimensions[1]}
            pointerEvents="none"
            width={waterEffects.fieldDimensions[0]}
            x={0}
            y={0}
          >
            <NinjaOneCapitalD05WaterComposite
              effects={waterEffects}
              motionEnabled
              sourcePath={d05Tier.path}
              tuning={d05WaterEffectTuning}
              zoomWeight={d05WaterZoomWeight}
            />
          </foreignObject>
        </g>
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
    </g>
    </g>
  );
}
