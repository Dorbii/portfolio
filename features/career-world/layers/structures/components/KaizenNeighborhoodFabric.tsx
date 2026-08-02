import { WORLD_PLANE } from "../../../shared/world";
import {
  KAIZEN_NEIGHBORHOOD_MODULES,
  type KaizenNeighborhoodModule,
} from "../model/kaizenNeighborhoodFabric";

function KaizenNeighborhoodModuleNode({
  module,
  visibility,
}: {
  readonly module: KaizenNeighborhoodModule;
  readonly visibility: number;
}) {
  const [atlasWidth, atlasHeight] = module.sourceDimensions;
  const [cropX, cropY, cropWidth, cropHeight] = module.crop;
  const width = module.span[0] * WORLD_PLANE.width;
  const height = module.span[1] * WORLD_PLANE.height;
  const x = module.anchor[0] * WORLD_PLANE.width - width * 0.5;
  const y = module.anchor[1] * WORLD_PLANE.height - height * 0.91;
  const isCloseFoundation = module.kind === "city-foundation-refinement";

  return (
    <g
      className="kaizen-neighborhood-fabric__module"
      data-block-id={module.blockId}
      data-neighborhood-lod={module.lod}
      data-neighborhood-module-id={module.id}
      data-neighborhood-module-kind={module.kind}
      style={{ opacity: visibility, transitionDuration: "0ms" }}
    >
      <svg
        aria-hidden="true"
        className="kaizen-neighborhood-fabric__crop"
        height={height}
        overflow="hidden"
        preserveAspectRatio="xMidYMid meet"
        viewBox={`${cropX} ${cropY} ${cropWidth} ${cropHeight}`}
        width={width}
        x={x}
        y={y}
      >
        <image
          className={[
            "kaizen-neighborhood-fabric__asset",
            isCloseFoundation
              ? "kaizen-neighborhood-fabric__asset--close"
              : "",
          ].filter(Boolean).join(" ")}
          height={atlasHeight}
          href={module.assetPath}
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
  closeVisibility,
  shouldRenderClose,
  siteVisibility,
}: {
  readonly closeVisibility: number;
  readonly shouldRenderClose: boolean;
  readonly siteVisibility: number;
}) {
  const siteFoundationVisibility = siteVisibility * (1 - closeVisibility);
  const closeFoundationVisibility = closeVisibility;
  const siteModules = siteFoundationVisibility > 0.001
    ? KAIZEN_NEIGHBORHOOD_MODULES.filter(({ lod }) => lod === "site")
    : [];
  const closeModules = shouldRenderClose
    ? KAIZEN_NEIGHBORHOOD_MODULES
      .filter(({ kind }) => kind === "city-foundation-refinement")
    : [];

  return (
    <g
      className="kaizen-neighborhood-fabric"
      data-neighborhood-close-module-count={closeModules.length}
      data-neighborhood-close-visibility={closeVisibility.toFixed(3)}
      data-neighborhood-close-foundation-visibility={
        closeFoundationVisibility.toFixed(3)
      }
      data-neighborhood-foundation-visibility={
        siteFoundationVisibility.toFixed(3)
      }
      data-neighborhood-refinement-contract="registered-city-foundation"
      data-neighborhood-renderer="registered-foundation-lod"
      data-neighborhood-site-module-count={siteModules.length}
      data-neighborhood-site-visibility={siteVisibility.toFixed(3)}
    >
      {siteModules.map((module) => (
        <KaizenNeighborhoodModuleNode
          key={module.id}
          module={module}
          visibility={siteFoundationVisibility}
        />
      ))}
      {closeModules.map((module) => (
        <KaizenNeighborhoodModuleNode
          key={module.id}
          module={module}
          visibility={closeFoundationVisibility}
        />
      ))}
    </g>
  );
}
