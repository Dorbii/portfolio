import { useEffect } from "react";
import { cameraViewBox, type CameraView } from "../../../shared/camera";
import { decodeImage, preloadImage } from "../../../shared/assets/decodeImage";
import type { DetailState } from "../../../shared/lod";
import { WORLD_PLANE } from "../../../shared/world";
import {
  NINJAONE_ENVIRONMENT_ARTBOARD,
  NINJAONE_ENVIRONMENT_GEOLOGY_SOURCES,
  NINJAONE_ENVIRONMENT_LOD_LAYERS,
  NINJAONE_ENVIRONMENT_WORLD_ORIGIN,
  NINJAONE_ENVIRONMENT_WORLD_SPAN,
  type NinjaOneEnvironmentPlateTier,
} from "../model/ninjaOneEnvironmentProof";

interface NinjaOneEnvironmentGeologyProps {
  readonly camera: CameraView;
  readonly detailState: DetailState;
  readonly onReadyChange?: (ready: boolean) => void;
  readonly proofMode: boolean;
}

const INLAND_TERRAIN_ERASE_MASK_PATH =
  "/career-world/layers/inland-water/authority/masks/ninjaone-inland-terrain-erase-r1.png";
const INLAND_TERRAIN_ERASE_MASK_CROP = Object.freeze([480, 168, 576, 912] as const);
const TERRAIN_CONTACT_MASK_PATH =
  "/career-world/capitals/ninjaone/environment/plates/geology/ninjaone-environment-geology-contact-r3.png";

/**
 * The sole authored L2 replacement for the NinjaOne terrain region.
 *
 * This is intentionally a separate SVG from foliage and structures. Its
 * stacking depth is terrain-owned, and the load callback lets the global
 * terrain compositor retire redundant close-detail sources only after this
 * replacement is paint-ready.
 */
export function NinjaOneEnvironmentGeology({
  camera,
  detailState,
  onReadyChange,
  proofMode,
}: NinjaOneEnvironmentGeologyProps) {
  const plateTier = detailState.tier.id === "world"
    ? null
    : detailState.tier.id as NinjaOneEnvironmentPlateTier;
  const visibleLayers = NINJAONE_ENVIRONMENT_LOD_LAYERS[detailState.tier.id];
  const currentSource = plateTier && visibleLayers.includes("terrain-geology")
    ? NINJAONE_ENVIRONMENT_GEOLOGY_SOURCES[plateTier]
    : null;
  const sourceLayers = !currentSource
    ? []
    : plateTier === "territory"
      ? [{ opacity: 1, source: currentSource, tier: plateTier }]
      : [
        {
          opacity: 1 - detailState.capitalToSite,
          source: NINJAONE_ENVIRONMENT_GEOLOGY_SOURCES.capital,
          tier: "capital" as const,
        },
        {
          opacity: detailState.capitalToSite * (1 - detailState.siteToClose),
          source: NINJAONE_ENVIRONMENT_GEOLOGY_SOURCES.site,
          tier: "site" as const,
        },
        {
          opacity: detailState.capitalToSite * detailState.siteToClose,
          source: NINJAONE_ENVIRONMENT_GEOLOGY_SOURCES.close,
          tier: "close" as const,
        },
      ].filter(({ opacity }) => opacity > 0);

  useEffect(() => {
    if (!currentSource) {
      onReadyChange?.(false);
      return;
    }

    let cancelled = false;
    void decodeImage(currentSource.path).then(
      () => {
        if (!cancelled) onReadyChange?.(true);
      },
      () => {
        if (!cancelled) onReadyChange?.(false);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [currentSource, onReadyChange]);

  useEffect(() => {
    const paths = [
      ...(detailState.shouldLoadSiteAssets
        ? [NINJAONE_ENVIRONMENT_GEOLOGY_SOURCES.site.path]
        : []),
      ...(detailState.shouldLoadCloseAssets
        ? [NINJAONE_ENVIRONMENT_GEOLOGY_SOURCES.close.path]
        : []),
    ];
    paths.forEach((path) => {
      void preloadImage(path).catch(() => undefined);
    });
  }, [detailState.shouldLoadCloseAssets, detailState.shouldLoadSiteAssets]);

  if (!currentSource) {
    return null;
  }

  const worldX = NINJAONE_ENVIRONMENT_WORLD_ORIGIN[0] * WORLD_PLANE.width;
  const worldY = NINJAONE_ENVIRONMENT_WORLD_ORIGIN[1] * WORLD_PLANE.height;
  const scaleX = NINJAONE_ENVIRONMENT_WORLD_SPAN[0] * WORLD_PLANE.width
    / NINJAONE_ENVIRONMENT_ARTBOARD[0];
  const scaleY = NINJAONE_ENVIRONMENT_WORLD_SPAN[1] * WORLD_PLANE.height
    / NINJAONE_ENVIRONMENT_ARTBOARD[1];
  return (
    <svg
      aria-label="NinjaOne authored L2 terrain geology"
      className="career-world__layer ninjaone-environment-geology"
      data-environment-authority="L2"
      data-environment-geology-source={sourceLayers.map(({ source }) => source.path).join(",")}
      data-environment-role={proofMode ? "isolated-proof-geology" : "production-geology"}
      data-lod-tier={detailState.tier.id}
      preserveAspectRatio="none"
      role="img"
      viewBox={cameraViewBox(camera, [WORLD_PLANE.width, WORLD_PLANE.height])}
    >
      <g transform={`translate(${worldX} ${worldY}) scale(${scaleX} ${scaleY})`}>
        <defs>
          <filter
            colorInterpolationFilters="sRGB"
            height="100%"
            id="ninjaone-environment-geology-terrain-erase-filter"
            width="100%"
            x="0"
            y="0"
          >
            <feColorMatrix
              type="matrix"
              values={[
                "0 0 0 0 0",
                "0 0 0 0 0",
                "0 0 0 0 0",
                "0 0 0 1 0",
              ].join(" ")}
            />
          </filter>
          <filter
            colorInterpolationFilters="sRGB"
            height="100%"
            id="ninjaone-environment-geology-source-alpha"
            width="100%"
            x="0"
            y="0"
          >
            <feComponentTransfer>
              <feFuncA intercept="0" slope="32" type="linear" />
            </feComponentTransfer>
          </filter>
          <mask
            height={NINJAONE_ENVIRONMENT_ARTBOARD[1]}
            id="ninjaone-environment-geology-contact"
            maskUnits="userSpaceOnUse"
            style={{ maskType: "luminance" }}
            width={NINJAONE_ENVIRONMENT_ARTBOARD[0]}
            x="0"
            y="0"
          >
            <image
              height={NINJAONE_ENVIRONMENT_ARTBOARD[1]}
              href={TERRAIN_CONTACT_MASK_PATH}
              width={NINJAONE_ENVIRONMENT_ARTBOARD[0]}
              x="0"
              y="0"
            />
          </mask>
          <mask
            height={NINJAONE_ENVIRONMENT_ARTBOARD[1]}
            id="ninjaone-environment-geology-water-cutout"
            maskUnits="userSpaceOnUse"
            style={{ maskType: "luminance" }}
            width={NINJAONE_ENVIRONMENT_ARTBOARD[0]}
            x="0"
            y="0"
          >
            <rect
              fill="white"
              height={NINJAONE_ENVIRONMENT_ARTBOARD[1]}
              width={NINJAONE_ENVIRONMENT_ARTBOARD[0]}
              x="0"
              y="0"
            />
            <image
              filter="url(#ninjaone-environment-geology-terrain-erase-filter)"
              height={INLAND_TERRAIN_ERASE_MASK_CROP[3]}
              href={INLAND_TERRAIN_ERASE_MASK_PATH}
              preserveAspectRatio="none"
              width={INLAND_TERRAIN_ERASE_MASK_CROP[2]}
              x={INLAND_TERRAIN_ERASE_MASK_CROP[0]}
              y={INLAND_TERRAIN_ERASE_MASK_CROP[1]}
            />
          </mask>
        </defs>
        <g
          mask="url(#ninjaone-environment-geology-contact)"
        >
          <g mask="url(#ninjaone-environment-geology-water-cutout)">
            {sourceLayers.map(({ opacity, source, tier }) => (
              <image
                data-environment-layer="terrain-geology"
                data-environment-source={source.path}
                data-environment-source-tier={tier}
                filter="url(#ninjaone-environment-geology-source-alpha)"
                height={NINJAONE_ENVIRONMENT_ARTBOARD[1]}
                href={source.path}
                key={tier}
                opacity={opacity}
                preserveAspectRatio="none"
                width={NINJAONE_ENVIRONMENT_ARTBOARD[0]}
                x="0"
                y="0"
              />
            ))}
          </g>
        </g>
      </g>
    </svg>
  );
}
