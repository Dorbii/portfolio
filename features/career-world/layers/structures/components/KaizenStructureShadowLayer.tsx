import type { Pair } from "../../../shared/camera";
import {
  KAIZEN_CITY_PIXEL_TO_WORLD,
} from "../../../shared/kaizenCityRegistration";
import type { WorldLight } from "../../../shared/lighting";
import { WORLD_PLANE } from "../../../shared/world";
import {
  KAIZEN_DECORATION_INSTANCES,
  resolveKaizenDecorationResource,
  type KaizenDecorationTier,
} from "../model/kaizenDecorations";
import { KAIZEN_SEMANTIC_STRUCTURE_ASSETS } from "../model/kaizenSemanticAssets";
import {
  KAIZEN_STRUCTURE_SHADOW_CONTRACT,
  KAIZEN_STRUCTURE_SHADOW_LIGHT_SOURCE,
  KAIZEN_STRUCTURE_SHADOW_PROJECTION,
} from "../model/kaizenStructureShadows";

interface KaizenStructureShadowLayerProps {
  readonly capitalVisibility: number;
  readonly closeVisibility: number;
  readonly light: WorldLight;
  readonly shouldRenderClose: boolean;
  readonly shouldRenderSite: boolean;
  readonly siteVisibility: number;
}

interface ShadowGeometry {
  readonly anchor: Pair;
  readonly family: "hero" | "support";
  readonly height: number;
  readonly id: string;
  readonly visibility: number;
  readonly width: number;
}

function worldPoint([x, y]: Pair): Pair {
  return Object.freeze([
    x * WORLD_PLANE.width,
    y * WORLD_PLANE.height,
  ] as Pair);
}

function visibilityForTier(
  tier: KaizenDecorationTier,
  capitalVisibility: number,
  siteVisibility: number,
  closeVisibility: number,
): number {
  if (tier === "close") return closeVisibility;
  if (tier === "site") return siteVisibility;
  return capitalVisibility;
}

function KaizenStructureShadow({
  castDirection,
  geometry,
  lightElevation,
  lightIntensity,
}: {
  readonly castDirection: Pair;
  readonly geometry: ShadowGeometry;
  readonly lightElevation: number;
  readonly lightIntensity: number;
}) {
  const projection = KAIZEN_STRUCTURE_SHADOW_PROJECTION;
  const [anchorX, anchorY] = worldPoint(geometry.anchor);
  const elevation = Math.max(
    projection.minimumElevation,
    Math.min(1, Math.abs(lightElevation)),
  );
  const lengthRatio = projection.baseLengthRatio
    + projection.lowSunLengthRatio * (1 - elevation);
  const shadowLength = geometry.height * lengthRatio;
  const [castX, castY] = castDirection;
  const perpendicularX = -castY;
  const perpendicularY = castX;
  const nearHalfWidth = geometry.width * projection.baseWidthRatio * 0.5;
  const farHalfWidth = geometry.width * projection.farWidthRatio * 0.5;
  const startX = anchorX + castX * Math.max(0.35, geometry.height * 0.012);
  const startY = anchorY + castY * Math.max(0.35, geometry.height * 0.012);
  const endX = anchorX + castX * shadowLength;
  const endY = anchorY + castY * shadowLength;
  const points = [
    [startX - perpendicularX * nearHalfWidth, startY - perpendicularY * nearHalfWidth],
    [startX + perpendicularX * nearHalfWidth, startY + perpendicularY * nearHalfWidth],
    [endX + perpendicularX * farHalfWidth, endY + perpendicularY * farHalfWidth],
    [endX - perpendicularX * farHalfWidth, endY - perpendicularY * farHalfWidth],
  ].map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).join(" ");
  const intensity = Math.max(0, Math.min(1.35, lightIntensity));
  const castOpacity = projection.maximumOpacity * intensity;
  const contactOpacity = projection.contactOpacity * intensity;

  return (
    <g
      data-kaizen-shadow-family={geometry.family}
      data-kaizen-shadow-id={geometry.id}
      opacity={geometry.visibility}
    >
      <polygon
        fill="#151715"
        fillOpacity={castOpacity}
        filter="url(#kaizen-structure-shadow-soften)"
        points={points}
      />
      <ellipse
        cx={anchorX + castX * 0.45}
        cy={anchorY + castY * 0.45}
        fill="#101210"
        fillOpacity={contactOpacity}
        rx={Math.max(0.65, nearHalfWidth * 0.88)}
        ry={Math.max(0.35, geometry.width * 0.025)}
        transform={`rotate(${Math.atan2(castY, castX) * 180 / Math.PI} ${anchorX} ${anchorY})`}
      />
    </g>
  );
}

export function KaizenStructureShadowLayer({
  capitalVisibility,
  closeVisibility,
  light,
  shouldRenderClose,
  shouldRenderSite,
  siteVisibility,
}: KaizenStructureShadowLayerProps) {
  const heroVisibility = Math.max(
    capitalVisibility,
    siteVisibility,
    closeVisibility,
  );
  const heroShadows: ShadowGeometry[] = KAIZEN_SEMANTIC_STRUCTURE_ASSETS.map(
    (asset) => ({
      anchor: asset.territoryAnchor,
      family: "hero",
      height: asset.footprintSpan[1] * WORLD_PLANE.height,
      id: asset.id,
      visibility: heroVisibility,
      width: asset.footprintSpan[0] * WORLD_PLANE.width,
    }),
  );
  const supportShadows: ShadowGeometry[] = KAIZEN_DECORATION_INSTANCES.flatMap(
    (instance) => {
      if (
        (instance.minimumTier === "site" && !shouldRenderSite)
        || (instance.minimumTier === "close" && !shouldRenderClose)
      ) {
        return [];
      }
      const resource = resolveKaizenDecorationResource(instance.resourceId);
      const [, , width, height] = resource.crop;
      return [{
        anchor: instance.anchor,
        family: "support" as const,
        height: height * instance.scale * KAIZEN_CITY_PIXEL_TO_WORLD[1],
        id: instance.id,
        visibility: visibilityForTier(
          instance.minimumTier,
          capitalVisibility,
          siteVisibility,
          closeVisibility,
        ),
        width: width * instance.scale * KAIZEN_CITY_PIXEL_TO_WORLD[0],
      }];
    },
  );
  const horizontalMagnitude = Math.hypot(
    light.direction[0],
    light.direction[1],
  );
  const castDirection = Object.freeze((horizontalMagnitude > 0.0001
    ? [
      -light.direction[0] / horizontalMagnitude,
      -light.direction[1] / horizontalMagnitude,
    ]
    : [0, 1]) as Pair);
  const shadowGeometries = [...heroShadows, ...supportShadows];

  return (
    <g
      aria-hidden="true"
      data-kaizen-shadow-contract={KAIZEN_STRUCTURE_SHADOW_CONTRACT}
      data-kaizen-shadow-count={shadowGeometries.length}
      data-kaizen-shadow-layer="dynamic-world-light"
      data-light-direction={light.direction.join(",")}
      data-light-source={KAIZEN_STRUCTURE_SHADOW_LIGHT_SOURCE}
      style={{ pointerEvents: "none" }}
    >
      <defs>
        <filter
          colorInterpolationFilters="sRGB"
          height="180%"
          id="kaizen-structure-shadow-soften"
          width="180%"
          x="-40%"
          y="-40%"
        >
          <feGaussianBlur stdDeviation="0.72" />
        </filter>
      </defs>
      {shadowGeometries.map((geometry) => (
        <KaizenStructureShadow
          castDirection={castDirection}
          geometry={geometry}
          key={`${geometry.family}-${geometry.id}`}
          lightElevation={light.direction[2]}
          lightIntensity={light.intensity}
        />
      ))}
    </g>
  );
}
