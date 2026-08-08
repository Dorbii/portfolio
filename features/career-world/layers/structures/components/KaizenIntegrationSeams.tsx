import { useEffect, useMemo, useState } from "react";
import { WORLD_PLANE } from "../../../shared/world";
import {
  KAIZEN_NEIGHBORHOOD_ANCHOR,
  KAIZEN_NEIGHBORHOOD_PLATE_ALIGNMENT_Y,
  KAIZEN_NEIGHBORHOOD_SPAN,
} from "../model/kaizenNeighborhoodFabric";
import {
  KAIZEN_FOREGROUND_INTEGRATION_SOURCES,
  KAIZEN_INTEGRATION_CONTRACT,
  type KaizenIntegrationTier,
} from "../model/kaizenIntegration";

interface KaizenIntegrationSeamsProps {
  readonly capitalVisibility: number;
  readonly closeVisibility: number;
  readonly shouldRenderCapital: boolean;
  readonly shouldRenderClose: boolean;
  readonly shouldRenderSite: boolean;
  readonly siteVisibility: number;
}

const TIERS: readonly KaizenIntegrationTier[] = [
  "capital",
  "site",
  "close",
];

export function KaizenIntegrationSeams({
  capitalVisibility,
  closeVisibility,
  shouldRenderCapital,
  shouldRenderClose,
  shouldRenderSite,
  siteVisibility,
}: KaizenIntegrationSeamsProps) {
  const [decodedAssetPaths, setDecodedAssetPaths] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const retained = {
    capital: shouldRenderCapital,
    close: shouldRenderClose,
    site: shouldRenderSite,
  } as const;
  const visibility = {
    capital: capitalVisibility,
    close: closeVisibility,
    site: siteVisibility,
  } as const;
  const requestedAssetPaths = useMemo(() => TIERS.flatMap((tier) => (
    retained[tier]
      ? [KAIZEN_FOREGROUND_INTEGRATION_SOURCES[tier].path]
      : []
  )), [shouldRenderCapital, shouldRenderClose, shouldRenderSite]);

  useEffect(() => {
    const preloaders = requestedAssetPaths.map((assetPath) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => setDecodedAssetPaths((current) => (
        current.has(assetPath)
          ? current
          : new Set([...current, assetPath])
      ));
      image.onerror = () => setDecodedAssetPaths((current) => {
        if (!current.has(assetPath)) return current;
        const next = new Set(current);
        next.delete(assetPath);
        return next;
      });
      image.src = assetPath;
      if (image.complete && image.naturalWidth > 0) image.onload?.(new Event("load"));
      return image;
    });
    return () => {
      for (const image of preloaders) {
        image.onload = null;
        image.onerror = null;
      }
    };
  }, [requestedAssetPaths]);

  const plateWidth = KAIZEN_NEIGHBORHOOD_SPAN[0] * WORLD_PLANE.width;
  const plateHeight = KAIZEN_NEIGHBORHOOD_SPAN[1] * WORLD_PLANE.height;
  const plateX = KAIZEN_NEIGHBORHOOD_ANCHOR[0] * WORLD_PLANE.width
    - plateWidth * 0.5;
  const plateY = KAIZEN_NEIGHBORHOOD_ANCHOR[1] * WORLD_PLANE.height
    - plateHeight * KAIZEN_NEIGHBORHOOD_PLATE_ALIGNMENT_Y;

  return (
    <g
      aria-hidden="true"
      data-kaizen-integration-contract={KAIZEN_INTEGRATION_CONTRACT}
      data-kaizen-integration-layer="foreground-seams"
      pointerEvents="none"
    >
      {TIERS.map((tier) => {
        if (!retained[tier]) return null;
        const source = KAIZEN_FOREGROUND_INTEGRATION_SOURCES[tier];
        const decoded = decodedAssetPaths.has(source.path);
        return (
          <image
            data-asset-decoded={decoded}
            data-kaizen-integration-placement-count={source.placementCount}
            data-kaizen-integration-tier={tier}
            height={plateHeight}
            href={source.path}
            key={tier}
            onError={() => setDecodedAssetPaths((current) => {
              if (!current.has(source.path)) return current;
              const next = new Set(current);
              next.delete(source.path);
              return next;
            })}
            onLoad={() => setDecodedAssetPaths((current) => (
              current.has(source.path)
                ? current
                : new Set([...current, source.path])
            ))}
            preserveAspectRatio="none"
            style={{ opacity: decoded ? visibility[tier] : 0 }}
            width={plateWidth}
            x={plateX}
            y={plateY}
          />
        );
      })}
    </g>
  );
}
