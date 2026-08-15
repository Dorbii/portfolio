import { useEffect } from "react";
import { cameraViewBox, type CameraView } from "../../../shared/camera";
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
  const source = plateTier && visibleLayers.includes("terrain-geology")
    ? NINJAONE_ENVIRONMENT_GEOLOGY_SOURCES[plateTier]
    : null;

  useEffect(() => {
    onReadyChange?.(false);
    if (!source) return;

    let cancelled = false;
    const image = new Image();
    const publishReady = () => {
      if (!cancelled) onReadyChange?.(true);
    };
    const publishError = () => {
      if (!cancelled) onReadyChange?.(false);
    };
    const decode = () => {
      void image.decode().then(publishReady, () => {
        if (image.complete && image.naturalWidth > 0) {
          publishReady();
        } else {
          publishError();
        }
      });
    };

    image.decoding = "async";
    image.addEventListener("load", decode, { once: true });
    image.addEventListener("error", publishError, { once: true });
    image.src = source.path;
    if (image.complete && image.naturalWidth > 0) decode();

    return () => {
      cancelled = true;
      image.removeEventListener("load", decode);
      image.removeEventListener("error", publishError);
    };
  }, [onReadyChange, source]);

  if (!source) {
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
      data-environment-geology-source={source.path}
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
            <image
              data-environment-layer="terrain-geology"
              data-environment-source={source.path}
              filter="url(#ninjaone-environment-geology-source-alpha)"
              height={NINJAONE_ENVIRONMENT_ARTBOARD[1]}
              href={source.path}
              preserveAspectRatio="none"
              width={NINJAONE_ENVIRONMENT_ARTBOARD[0]}
              x="0"
              y="0"
            />
          </g>
        </g>
      </g>
    </svg>
  );
}
