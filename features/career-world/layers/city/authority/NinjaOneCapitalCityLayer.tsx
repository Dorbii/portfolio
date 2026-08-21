import { useEffect } from "react";
import { cameraViewBox, type CameraView } from "../../../shared/camera";
import { preloadImage } from "../../../shared/assets/decodeImage";
import type { DetailState } from "../../../shared/lod";
import type { WorldLight } from "../../../shared/lighting";
import {
  isEnvironmentLayerEffectivelyVisible,
  type EnvironmentLayerVisibility,
} from "../../../shared/environmentLayers";
import { WORLD_PLANE } from "../../../shared/world";
import {
  NINJAONE_CAPITAL_CITY_R3_ARTBOARD,
  NINJAONE_CAPITAL_CITY_R3_AUTHORITY_ID,
  NINJAONE_CAPITAL_CITY_R3_WORLD_ORIGIN,
  NINJAONE_CAPITAL_CITY_R3_WORLD_SPAN,
} from "../model/ninjaOneCapitalCityFoundationR3";
import type { NinjaOneCapitalCityDistrictId } from "../model/ninjaOneCapitalCityRepresentations";
import {
  ninjaOneCapitalCityAssetVariant,
  ninjaOneCapitalVisibleDistrictDetailNodes,
} from "../model/ninjaOneCapitalCityLayer";
import { NinjaOneCapitalCityR3 } from "../rendering/NinjaOneCapitalCityR3";
import { NinjaOneCapitalNativeFoliagePreloader } from "../rendering/NinjaOneCapitalNativeFoliage";

const CITY_CHILD_LAYER_ORDER = Object.freeze([
  "L4_0",
  "L4_1",
  "L4_2",
  "L4_3",
  "L4_4",
  "L4_5",
  "L4_6",
  "L4_7",
]);

export function NinjaOneCapitalCityLayer({
  camera,
  detailState,
  focusDistrict,
  light,
  nativeFoliageFallback,
  preloadDistrict,
  presentationOpacity = 1,
  visibility,
}: {
  readonly camera: CameraView;
  readonly detailState: DetailState;
  readonly focusDistrict?: NinjaOneCapitalCityDistrictId | null;
  readonly light: WorldLight;
  readonly nativeFoliageFallback: boolean;
  readonly preloadDistrict?: NinjaOneCapitalCityDistrictId | null;
  readonly presentationOpacity?: number;
  readonly visibility: EnvironmentLayerVisibility;
}) {
  useEffect(() => {
    if (!preloadDistrict) return;
    const tiers = [
      ...(detailState.shouldLoadSiteAssets ? ["site" as const] : []),
      ...(detailState.shouldLoadCloseAssets ? ["close" as const] : []),
    ];
    const paths = new Set(tiers.flatMap((tier) => (
      ninjaOneCapitalVisibleDistrictDetailNodes(
        camera,
        tier,
        ["L4_2", "L4_3"],
        preloadDistrict,
      ).map((node) => ninjaOneCapitalCityAssetVariant(node, tier).path)
    )));
    paths.forEach((path) => {
      void preloadImage(path).catch(() => undefined);
    });
  }, [camera, detailState.shouldLoadCloseAssets, detailState.shouldLoadSiteAssets, preloadDistrict]);

  if (
    detailState.tier.id === "world"
    || detailState.tier.id === "territory"
    || !isEnvironmentLayerEffectivelyVisible(visibility, "L4")
  ) {
    return null;
  }
  const worldX = NINJAONE_CAPITAL_CITY_R3_WORLD_ORIGIN[0] * WORLD_PLANE.width;
  const worldY = NINJAONE_CAPITAL_CITY_R3_WORLD_ORIGIN[1] * WORLD_PLANE.height;
  const scaleX = NINJAONE_CAPITAL_CITY_R3_WORLD_SPAN[0] * WORLD_PLANE.width
    / NINJAONE_CAPITAL_CITY_R3_ARTBOARD[0];
  const scaleY = NINJAONE_CAPITAL_CITY_R3_WORLD_SPAN[1] * WORLD_PLANE.height
    / NINJAONE_CAPITAL_CITY_R3_ARTBOARD[1];

  return (
    <>
      {nativeFoliageFallback && detailState.shouldLoadCloseAssets && preloadDistrict ? (
        <NinjaOneCapitalNativeFoliagePreloader
          camera={camera}
          focusDistrict={preloadDistrict}
        />
      ) : null}
      <svg
      aria-label="Registered progressive-LoD NinjaOne Capital city"
      className="career-world__layer ninjaone-capital-city"
      data-city-artboard={NINJAONE_CAPITAL_CITY_R3_ARTBOARD.join(",")}
      data-city-authority={NINJAONE_CAPITAL_CITY_R3_AUTHORITY_ID}
      data-city-authority-layer="L4"
      data-city-child-layer-order={CITY_CHILD_LAYER_ORDER.join(",")}
      data-city-focus-district={focusDistrict ?? "none"}
      data-city-foliage-source="L2-registered-tree-vocabulary"
      data-city-geography-ownership="immutable-L1-L3-plus-reversible-L4-modifications"
      data-city-lod-delivery="territory-cache-capital-context-atomic-D06-site-close-promotion"
      data-city-lod-tier={detailState.tier.id}
      data-city-light-direction={light.direction.join(",")}
      data-city-representation-authority={NINJAONE_CAPITAL_CITY_R3_AUTHORITY_ID}
      data-city-representation-mode="r3-registered-cohort"
      data-city-presentation-opacity={presentationOpacity.toFixed(3)}
      opacity={presentationOpacity}
      preserveAspectRatio="none"
      role="img"
      viewBox={cameraViewBox(camera, [WORLD_PLANE.width, WORLD_PLANE.height])}
    >
      <defs>
        <filter
          id="ninjaone-capital-city-contact-soften"
          x="-35%"
          y="-80%"
          width="170%"
          height="260%"
        >
          <feGaussianBlur stdDeviation="5.5 3" />
        </filter>
      </defs>
      <g transform={`translate(${worldX} ${worldY}) scale(${scaleX} ${scaleY})`}>
        <NinjaOneCapitalCityR3
          camera={camera}
          closeAssetsMounted={detailState.shouldLoadCloseAssets}
          closeProgress={detailState.siteToClose}
          focusDistrict={focusDistrict ?? null}
          light={light}
          nativeFoliageFallback={nativeFoliageFallback}
          preloadDistrict={preloadDistrict ?? null}
          siteAssetsMounted={detailState.shouldLoadSiteAssets}
          siteProgress={detailState.capitalToSite}
          tier={detailState.tier.id}
          visibility={visibility}
        />
      </g>
      </svg>
    </>
  );
}
