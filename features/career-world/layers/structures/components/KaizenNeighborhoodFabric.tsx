import { useCallback, useEffect, useMemo, useState } from "react";
import { LOD_PRESENTATION_EPSILON } from "../../../shared/lod";
import { WORLD_PLANE } from "../../../shared/world";
import { KAIZEN_CITY_PIXEL_TO_WORLD } from "../../../shared/kaizenCityRegistration";
import type { WorldLight } from "../../../shared/lighting";
import {
  KAIZEN_NEIGHBORHOOD_ANCHOR,
  KAIZEN_NEIGHBORHOOD_CLOSE_GRID_SIZE,
  KAIZEN_NEIGHBORHOOD_DETAIL_CONTRACT,
  KAIZEN_NEIGHBORHOOD_MODULES,
  KAIZEN_NEIGHBORHOOD_PLATE_ALIGNMENT_Y,
  KAIZEN_NEIGHBORHOOD_SPAN,
  type KaizenNeighborhoodModule,
} from "../model/kaizenNeighborhoodFabric";
import {
  KAIZEN_DECORATION_INSTANCES,
  KAIZEN_DECORATION_RESOURCES,
  resolveKaizenDecorationResource,
  type KaizenDecorationInstance,
} from "../model/kaizenDecorations";
import {
  KAIZEN_STATIC_ENVIRONMENT_SOURCES,
  type KaizenStaticEnvironmentSource,
} from "../model/kaizenStaticEnvironment";
import { KaizenStructureShadowLayer } from "./KaizenStructureShadowLayer";

function worldPoint([x, y]: readonly [number, number]) {
  return [x * WORLD_PLANE.width, y * WORLD_PLANE.height] as const;
}

function KaizenDecorationDefinitions() {
  return (
    <defs data-kaizen-decoration-resource-count={KAIZEN_DECORATION_RESOURCES.length}>
      {KAIZEN_DECORATION_RESOURCES.map((resource) => {
        const [atlasWidth, atlasHeight] = resource.atlasDimensions;
        const [x, y, width, height] = resource.crop;
        return (
          <symbol
            id={`kaizen-decoration-${resource.id}`}
            key={resource.id}
            preserveAspectRatio="xMidYMid meet"
            viewBox={`${x} ${y} ${width} ${height}`}
          >
            <image
              height={atlasHeight}
              href={resource.atlasPath}
              width={atlasWidth}
              x={0}
              y={0}
            />
          </symbol>
        );
      })}
    </defs>
  );
}

function KaizenDecorationNode({
  instance,
  visibility,
}: {
  readonly instance: KaizenDecorationInstance;
  readonly visibility: number;
}) {
  const resource = resolveKaizenDecorationResource(instance.resourceId);
  const [, , width, height] = resource.crop;
  const [x, y] = worldPoint(instance.anchor);
  const scaleX = instance.scale * KAIZEN_CITY_PIXEL_TO_WORLD[0]
    * (instance.mirror ? -1 : 1);
  const scaleY = instance.scale * KAIZEN_CITY_PIXEL_TO_WORLD[1];
  return (
    <g
      data-kaizen-decoration-id={instance.id}
      data-kaizen-decoration-resource-id={resource.id}
      data-kaizen-decoration-tier={instance.minimumTier}
      style={{ opacity: visibility }}
      transform={`translate(${x} ${y}) scale(${scaleX} ${scaleY})`}
    >
      <use
        height={height}
        href={`#kaizen-decoration-${resource.id}`}
        width={width}
        x={-width * resource.groundAnchor[0]}
        y={-height * resource.groundAnchor[1]}
      />
    </g>
  );
}

function KaizenStaticEnvironmentNode({
  decoded,
  onAssetError,
  onAssetLoad,
  source,
  tier,
  visibility,
}: {
  readonly decoded: boolean;
  readonly onAssetError: (assetPath: string) => void;
  readonly onAssetLoad: (assetPath: string) => void;
  readonly source: KaizenStaticEnvironmentSource;
  readonly tier: "capital" | "site";
  readonly visibility: number;
}) {
  const [sourceWidth, sourceHeight] = source.dimensions;
  const plateWidth = KAIZEN_NEIGHBORHOOD_SPAN[0] * WORLD_PLANE.width;
  const plateHeight = KAIZEN_NEIGHBORHOOD_SPAN[1] * WORLD_PLANE.height;
  const plateX = KAIZEN_NEIGHBORHOOD_ANCHOR[0] * WORLD_PLANE.width
    - plateWidth * 0.5;
  const plateY = KAIZEN_NEIGHBORHOOD_ANCHOR[1] * WORLD_PLANE.height
    - plateHeight * KAIZEN_NEIGHBORHOOD_PLATE_ALIGNMENT_Y;
  return (
    <g
      data-kaizen-static-environment-tier={tier}
      style={{ opacity: decoded ? visibility : 0 }}
    >
      <image
        height={plateHeight}
        href={source.path}
        onError={() => onAssetError(source.path)}
        onLoad={() => onAssetLoad(source.path)}
        preserveAspectRatio="none"
        width={plateWidth}
        x={plateX}
        y={plateY}
      />
    </g>
  );
}

function KaizenNeighborhoodModuleNode({
  decoded,
  module,
  onAssetError,
  onAssetLoad,
  visibility,
}: {
  readonly decoded: boolean;
  readonly module: KaizenNeighborhoodModule;
  readonly onAssetError: (assetPath: string) => void;
  readonly onAssetLoad: (assetPath: string) => void;
  readonly visibility: number;
}) {
  const [atlasWidth, atlasHeight] = module.sourceDimensions;
  const [cropX, cropY, cropWidth, cropHeight] = module.crop;
  const [regionX, regionY, regionWidth, regionHeight] = module.region;
  const plateWidth = KAIZEN_NEIGHBORHOOD_SPAN[0] * WORLD_PLANE.width;
  const plateHeight = KAIZEN_NEIGHBORHOOD_SPAN[1] * WORLD_PLANE.height;
  const plateX = (
    KAIZEN_NEIGHBORHOOD_ANCHOR[0] * WORLD_PLANE.width
    - plateWidth * 0.5
  );
  const plateY = (
    KAIZEN_NEIGHBORHOOD_ANCHOR[1] * WORLD_PLANE.height
    - plateHeight * KAIZEN_NEIGHBORHOOD_PLATE_ALIGNMENT_Y
  );
  const width = regionWidth * plateWidth;
  const height = regionHeight * plateHeight;
  const x = plateX + regionX * plateWidth;
  const y = plateY + regionY * plateHeight;

  return (
    <g
      className="kaizen-neighborhood-fabric__module"
      data-asset-decoded={decoded}
      data-block-id={module.blockId}
      data-neighborhood-grid-column={module.gridColumn}
      data-neighborhood-grid-row={module.gridRow}
      data-neighborhood-lod={module.lod}
      data-neighborhood-module-id={module.id}
      data-neighborhood-module-kind={module.kind}
      style={{ opacity: decoded ? visibility : 0 }}
    >
      <svg
        aria-hidden="true"
        className="kaizen-neighborhood-fabric__crop"
        height={height}
        overflow="hidden"
        preserveAspectRatio="none"
        viewBox={`${cropX} ${cropY} ${cropWidth} ${cropHeight}`}
        width={width}
        x={x}
        y={y}
      >
        <image
          className={[
            "kaizen-neighborhood-fabric__asset",
            `kaizen-neighborhood-fabric__asset--${module.lod}`,
          ].join(" ")}
          height={atlasHeight}
          href={module.assetPath}
          onError={() => onAssetError(module.assetPath)}
          onLoad={() => onAssetLoad(module.assetPath)}
          preserveAspectRatio="none"
          width={atlasWidth}
          x={0}
          y={0}
        />
      </svg>
    </g>
  );
}

export function KaizenNeighborhoodFabric({
  capitalVisibility,
  closeVisibility,
  light,
  onVisualReadyChange,
  overviewVisibility,
  shouldRenderCapital,
  shouldRenderClose,
  shouldRenderSite,
  siteVisibility,
}: {
  readonly capitalVisibility: number;
  readonly closeVisibility: number;
  readonly light: WorldLight;
  readonly onVisualReadyChange: (ready: boolean) => void;
  readonly overviewVisibility: number;
  readonly shouldRenderCapital: boolean;
  readonly shouldRenderClose: boolean;
  readonly shouldRenderSite: boolean;
  readonly siteVisibility: number;
}) {
  const [decodedAssetPaths, setDecodedAssetPaths] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const baseModule = KAIZEN_NEIGHBORHOOD_MODULES.find(
    ({ lod }) => lod === "base",
  );
  const siteModule = KAIZEN_NEIGHBORHOOD_MODULES.find(
    ({ lod }) => lod === "site",
  );
  const closeModules = useMemo(() => (
    KAIZEN_NEIGHBORHOOD_MODULES.filter(({ lod }) => lod === "close")
  ), []);
  const decorationAtlasPaths = useMemo(() => (
    [...new Set(KAIZEN_DECORATION_RESOURCES.map(({ atlasPath }) => atlasPath))]
  ), []);
  const shouldRetainCapitalDetails = (
    shouldRenderCapital || capitalVisibility > LOD_PRESENTATION_EPSILON
  );
  const shouldRetainSiteDetails = (
    shouldRenderSite || siteVisibility > LOD_PRESENTATION_EPSILON
  );
  const shouldRetainCloseDetails = (
    shouldRenderClose || closeVisibility > LOD_PRESENTATION_EPSILON
  );
  const onAssetLoad = useCallback((assetPath: string) => {
    setDecodedAssetPaths((current) => {
      if (current.has(assetPath)) {
        return current;
      }
      return new Set([...current, assetPath]);
    });
  }, []);
  const onAssetError = useCallback((assetPath: string) => {
    setDecodedAssetPaths((current) => {
      if (!current.has(assetPath)) {
        return current;
      }
      const next = new Set(current);
      next.delete(assetPath);
      return next;
    });
  }, []);
  const requestedAssetPaths = useMemo(() => [
    ...(baseModule ? [baseModule.assetPath] : []),
    ...(shouldRenderSite && siteModule ? [siteModule.assetPath] : []),
    ...(shouldRenderClose
      ? closeModules.map(({ assetPath }) => assetPath)
      : []),
    ...(shouldRetainCapitalDetails
      ? [KAIZEN_STATIC_ENVIRONMENT_SOURCES.capital.path]
      : []),
    ...(shouldRetainSiteDetails
      ? [KAIZEN_STATIC_ENVIRONMENT_SOURCES.site.path]
      : []),
    ...(shouldRetainCapitalDetails
      ? decorationAtlasPaths
      : []),
  ], [
    baseModule,
    closeModules,
    decorationAtlasPaths,
    shouldRetainCapitalDetails,
    shouldRetainCloseDetails,
    shouldRetainSiteDetails,
    shouldRenderClose,
    shouldRenderSite,
    siteModule,
  ]);
  const foundationVisibility = Math.max(
    overviewVisibility,
    siteVisibility,
    closeVisibility,
  );
  const siteDetailVisibility = Math.max(siteVisibility, closeVisibility);
  const baseReady = Boolean(
    baseModule && decodedAssetPaths.has(baseModule.assetPath),
  );
  const siteReady = Boolean(
    siteModule && decodedAssetPaths.has(siteModule.assetPath),
  );
  const decodedCloseCount = closeModules.filter(({ assetPath }) => (
    decodedAssetPaths.has(assetPath)
  )).length;
  const decorationsReady = decorationAtlasPaths.every((assetPath) => (
    decodedAssetPaths.has(assetPath)
  ));
  const capitalStaticSource = KAIZEN_STATIC_ENVIRONMENT_SOURCES.capital;
  const siteStaticSource = KAIZEN_STATIC_ENVIRONMENT_SOURCES.site;
  const capitalStaticVisibility = capitalVisibility * (1 - siteVisibility);

  useEffect(() => {
    const preloaders = requestedAssetPaths.map((assetPath) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => onAssetLoad(assetPath);
      image.onerror = () => onAssetError(assetPath);
      image.src = assetPath;
      if (image.complete && image.naturalWidth > 0) {
        onAssetLoad(assetPath);
      }
      return image;
    });

    return () => {
      for (const image of preloaders) {
        image.onload = null;
        image.onerror = null;
      }
    };
  }, [onAssetError, onAssetLoad, requestedAssetPaths]);

  useEffect(() => {
    onVisualReadyChange(baseReady);
  }, [baseReady, onVisualReadyChange]);

  useEffect(() => () => {
    onVisualReadyChange(false);
  }, [onVisualReadyChange]);

  if (!baseModule) {
    return null;
  }

  return (
    <g
      className="kaizen-neighborhood-fabric"
      data-neighborhood-base-module-count={1}
      data-neighborhood-base-ready={baseReady}
      data-neighborhood-capital-visibility={capitalVisibility.toFixed(3)}
      data-neighborhood-close-decoded-count={decodedCloseCount}
      data-neighborhood-close-module-count={
        shouldRenderClose ? closeModules.length : 0
      }
      data-neighborhood-close-visibility={closeVisibility.toFixed(3)}
      data-neighborhood-detail-grid={
        `${KAIZEN_NEIGHBORHOOD_CLOSE_GRID_SIZE}x`
        + KAIZEN_NEIGHBORHOOD_CLOSE_GRID_SIZE
      }
      data-neighborhood-foundation-visibility={
        foundationVisibility.toFixed(3)
      }
      data-neighborhood-decoration-count={KAIZEN_DECORATION_INSTANCES.length}
      data-neighborhood-decoration-ready={decorationsReady}
      data-neighborhood-overview-visibility={overviewVisibility.toFixed(3)}
      data-neighborhood-requested-asset-count={requestedAssetPaths.length}
      data-neighborhood-refinement-contract={KAIZEN_NEIGHBORHOOD_DETAIL_CONTRACT}
      data-neighborhood-renderer="persistent-base-progressive-detail-grid"
      data-neighborhood-site-module-count={shouldRenderSite ? 1 : 0}
      data-neighborhood-site-ready={siteReady}
      data-neighborhood-site-visibility={siteVisibility.toFixed(3)}
      data-neighborhood-visual-ready={baseReady}
    >
      <KaizenDecorationDefinitions />
      <KaizenNeighborhoodModuleNode
        decoded={baseReady}
        module={baseModule}
        onAssetError={onAssetError}
        onAssetLoad={onAssetLoad}
        visibility={foundationVisibility}
      />
      {shouldRenderSite && siteModule ? (
        <KaizenNeighborhoodModuleNode
          decoded={siteReady}
          module={siteModule}
          onAssetError={onAssetError}
          onAssetLoad={onAssetLoad}
          visibility={siteDetailVisibility}
        />
      ) : null}
      {shouldRenderClose ? closeModules.map((module) => (
        <KaizenNeighborhoodModuleNode
          decoded={decodedAssetPaths.has(module.assetPath)}
          key={module.id}
          module={module}
          onAssetError={onAssetError}
          onAssetLoad={onAssetLoad}
          visibility={closeVisibility}
        />
      )) : null}
      {shouldRetainCapitalDetails ? (
        <KaizenStaticEnvironmentNode
          decoded={decodedAssetPaths.has(capitalStaticSource.path)}
          onAssetError={onAssetError}
          onAssetLoad={onAssetLoad}
          source={capitalStaticSource}
          tier="capital"
          visibility={capitalStaticVisibility}
        />
      ) : null}
      {shouldRetainSiteDetails ? (
        <KaizenStaticEnvironmentNode
          decoded={decodedAssetPaths.has(siteStaticSource.path)}
          onAssetError={onAssetError}
          onAssetLoad={onAssetLoad}
          source={siteStaticSource}
          tier="site"
          visibility={Math.max(siteVisibility, closeVisibility)}
        />
      ) : null}
      {shouldRetainCapitalDetails ? (
        <KaizenStructureShadowLayer
          capitalVisibility={capitalVisibility}
          closeVisibility={closeVisibility}
          light={light}
          shouldRenderClose={shouldRetainCloseDetails}
          shouldRenderSite={shouldRetainSiteDetails}
          siteVisibility={siteVisibility}
        />
      ) : null}
      {shouldRetainCapitalDetails ? (
        <g
          data-kaizen-decoration-layer="shared-misc-building-pool"
          style={{ opacity: decorationsReady ? 1 : 0 }}
        >
          {KAIZEN_DECORATION_INSTANCES.map((instance) => {
            const visibility = instance.minimumTier === "capital"
              ? capitalVisibility
              : instance.minimumTier === "site"
                ? siteVisibility
                : closeVisibility;
            if (
              instance.minimumTier === "close"
              && !shouldRetainCloseDetails
            ) {
              return null;
            }
            if (
              instance.minimumTier === "site"
              && !shouldRetainSiteDetails
            ) {
              return null;
            }
            return (
              <KaizenDecorationNode
                instance={instance}
                key={instance.id}
                visibility={visibility}
              />
            );
          })}
        </g>
      ) : null}
    </g>
  );
}
