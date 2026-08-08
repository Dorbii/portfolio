import type { CSSProperties } from "react";
import { cameraViewBox, type CameraView, type Pair } from "../shared/camera";
import {
  resolveAtomicTierVisibility,
  type DetailState,
} from "../shared/lod";
import type { WorldLight } from "../shared/lighting";
import {
  DEFAULT_WORLD_WIND_STATE,
  windVectorFromDegrees,
} from "../shared/weather";
import { WORLD_PLANE } from "../shared/world";
import {
  NINJAONE_CAPITAL_TOPOLOGY_ARTBOARD,
  NINJAONE_CAPITAL_TOPOLOGY_RAIL_CORRIDOR,
  NINJAONE_CAPITAL_TOPOLOGY_WORLD_ORIGIN,
  NINJAONE_CAPITAL_TOPOLOGY_WORLD_SPAN,
} from "./model/ninjaOneCapitalTopologyProof";
import {
  NINJAONE_CAPITAL_MVP_DISTRICTS,
  NINJAONE_CAPITAL_MVP_ESTIMATED_PLANT_COUNT,
  NINJAONE_CAPITAL_MVP_FOLIAGE_INSTANCES,
  NINJAONE_CAPITAL_MVP_FOLIAGE_RESOURCES,
  NINJAONE_CAPITAL_MVP_LAYER_ORDER,
  NINJAONE_CAPITAL_MVP_LOD_LAYERS,
  NINJAONE_CAPITAL_MVP_PLATES,
  NINJAONE_CAPITAL_MVP_STRUCTURE_INSTANCES,
  NINJAONE_CAPITAL_MVP_STRUCTURE_RESOURCES,
  type NinjaOneCapitalMvpFoliageInstance,
  type NinjaOneCapitalMvpFoliageResource,
  type NinjaOneCapitalMvpLayerId,
  type NinjaOneCapitalMvpStructureInstance,
} from "./model/ninjaOneCapitalMvp";

interface NinjaOneCapitalMvpProps {
  readonly camera: CameraView;
  readonly detailState: DetailState;
  readonly light: WorldLight;
}

const DISTRICT_VISUAL_BY_ID = new Map(
  NINJAONE_CAPITAL_MVP_DISTRICTS.map((district) => [district.id, district]),
);

function svgPoints(points: readonly Pair[]): string {
  return points.map(([x, y]) => `${x},${y}`).join(" ");
}

function layerVisible(
  layer: NinjaOneCapitalMvpLayerId,
  detailState: DetailState,
): boolean {
  return NINJAONE_CAPITAL_MVP_LOD_LAYERS[detailState.tier.id].includes(layer);
}

function breezeStyle(
  resource: NinjaOneCapitalMvpFoliageResource,
  windVector: Pair,
): CSSProperties {
  const motion = DEFAULT_WORLD_WIND_STATE.motion * resource.motionScale;
  const tilt = windVector[0] * motion * 0.68;
  return {
    "--ninjaone-capital-foliage-drift-x":
      `${(windVector[0] * motion * 2.2).toFixed(3)}px`,
    "--ninjaone-capital-foliage-drift-y":
      `${(windVector[1] * motion * 0.68).toFixed(3)}px`,
    "--ninjaone-capital-foliage-tilt-start": `${(-tilt * 0.3).toFixed(3)}deg`,
    "--ninjaone-capital-foliage-tilt-end": `${tilt.toFixed(3)}deg`,
    animationDelay: `${resource.phaseSeconds}s`,
    animationDuration: `${resource.durationSeconds}s`,
  } as CSSProperties;
}

function FoliageDefinitions({ windVector }: { readonly windVector: Pair }) {
  return (
    <defs data-shared-resource-pool="career-world/shared-foliage@r1">
      {NINJAONE_CAPITAL_MVP_FOLIAGE_RESOURCES.map((resource) => {
        const [atlasWidth, atlasHeight] = resource.atlasDimensions;
        const [x, y, width, height] = resource.crop;
        const canopyHeight = height * resource.canopySplit;
        const trunkHeight = height - canopyHeight;
        return (
          <symbol
            id={`ninjaone-capital-foliage-${resource.id}`}
            key={resource.id}
            preserveAspectRatio="xMidYMid meet"
            viewBox={`${x} ${y} ${width} ${height}`}
          >
            <svg
              height={trunkHeight}
              overflow="hidden"
              viewBox={`${x} ${y + canopyHeight} ${width} ${trunkHeight}`}
              width={width}
              x={x}
              y={y + canopyHeight}
            >
              <image
                height={atlasHeight}
                href={resource.atlasPath}
                width={atlasWidth}
              />
            </svg>
            <g
              className="ninjaone-capital-mvp__foliage-canopy"
              style={breezeStyle(resource, windVector)}
            >
              <svg
                height={canopyHeight}
                overflow="hidden"
                viewBox={`${x} ${y} ${width} ${canopyHeight}`}
                width={width}
                x={x}
                y={y}
              >
                <image
                  height={atlasHeight}
                  href={resource.atlasPath}
                  width={atlasWidth}
                />
              </svg>
            </g>
          </symbol>
        );
      })}
    </defs>
  );
}

function SharedFoliage({ instance }: {
  readonly instance: NinjaOneCapitalMvpFoliageInstance;
}) {
  const [,, cropWidth, cropHeight] = instance.resource.crop;
  const height = instance.displayWidth * cropHeight / cropWidth;
  const scaleX = instance.mirror ? -1 : 1;
  return (
    <g
      data-capital-foliage-id={instance.id}
      data-capital-foliage-resource={instance.resource.id}
      data-capital-foliage-visual-plant-count={instance.resource.visualPlantCount}
      data-shared-asset="foliage"
      transform={`translate(${instance.anchor[0]} ${instance.anchor[1]}) scale(${scaleX} 1)`}
    >
      <use
        height={height}
        href={`#ninjaone-capital-foliage-${instance.resource.id}`}
        width={instance.displayWidth}
        x={-instance.displayWidth * 0.5}
        y={-height}
      />
    </g>
  );
}

function StructureShadow({ instance, light }: {
  readonly instance: NinjaOneCapitalMvpStructureInstance;
  readonly light: WorldLight;
}) {
  const footprintWidth = instance.displayWidth * instance.resource.footprintFraction[0];
  const footprintDepth = instance.displayWidth * instance.resource.footprintFraction[1];
  const castX = -light.direction[0];
  const castY = -light.direction[1];
  const castLength = instance.resource.shadowHeight * 0.28;
  const endX = instance.anchor[0] + castX * castLength;
  const endY = instance.anchor[1] + castY * castLength;
  const halfWidth = footprintWidth * 0.45;
  return (
    <g
      data-capital-shadow={instance.id}
      data-light-source={light.id}
    >
      <path
        d={`M ${instance.anchor[0] - halfWidth} ${instance.anchor[1]}
          L ${instance.anchor[0] + halfWidth} ${instance.anchor[1]}
          L ${endX + halfWidth * 0.58} ${endY}
          L ${endX - halfWidth * 0.58} ${endY} Z`}
        fill="rgba(14, 18, 17, 0.24)"
        filter="url(#ninjaone-capital-shadow-soften)"
      />
      <ellipse
        cx={instance.anchor[0]}
        cy={instance.anchor[1]}
        fill="rgba(8, 12, 11, 0.32)"
        filter="url(#ninjaone-capital-contact-soften)"
        rx={footprintWidth * 0.43}
        ry={Math.max(4, footprintDepth * 0.48)}
      />
    </g>
  );
}

function SharedStructure({ instance }: {
  readonly instance: NinjaOneCapitalMvpStructureInstance;
}) {
  const height = instance.displayWidth
    * instance.resource.dimensions[1] / instance.resource.dimensions[0];
  const x = instance.anchor[0]
    - instance.displayWidth * instance.resource.groundAnchor[0];
  const y = instance.anchor[1]
    - height * instance.resource.groundAnchor[1];
  return (
    <g
      data-capital-layer-owner={instance.plot.layerOwner}
      data-capital-plot={instance.plot.id}
      data-capital-structure={instance.id}
      data-capital-structure-resource={instance.resource.id}
      data-shared-asset="structure"
      transform={instance.mirror
        ? `translate(${instance.anchor[0] * 2} 0) scale(-1 1)`
        : undefined}
    >
      <image
        height={height}
        href={instance.resource.path}
        preserveAspectRatio="xMidYMid meet"
        width={instance.displayWidth}
        x={x}
        y={y}
      />
    </g>
  );
}

function IntegrationDetails({ instances }: {
  readonly instances: readonly NinjaOneCapitalMvpStructureInstance[];
}) {
  return (
    <g data-integration-contract="additive-no-cast-shadow">
      {instances.map((instance) => {
        const visual = DISTRICT_VISUAL_BY_ID.get(instance.plot.districtId);
        const footprintWidth = instance.displayWidth
          * instance.resource.footprintFraction[0];
        return (
          <g data-integration-plot={instance.plot.id} key={instance.id}>
            <path
              d={`M ${instance.anchor[0] - footprintWidth * 0.45} ${instance.anchor[1] + 1}
                Q ${instance.anchor[0]} ${instance.anchor[1] + 8}
                ${instance.anchor[0] + footprintWidth * 0.45} ${instance.anchor[1] + 1}`}
              fill="none"
              stroke={visual?.accent ?? "#769b8b"}
              strokeOpacity="0.38"
              strokeWidth="3"
            />
            <path
              d={`M ${instance.anchor[0] - footprintWidth * 0.32} ${instance.anchor[1] + 4}
                Q ${instance.anchor[0]} ${instance.anchor[1] + 11}
                ${instance.anchor[0] + footprintWidth * 0.32} ${instance.anchor[1] + 4}`}
              fill="none"
              stroke="#d2c7aa"
              strokeOpacity="0.28"
              strokeWidth="1.5"
            />
          </g>
        );
      })}
    </g>
  );
}

function CloseLabels({ instances }: {
  readonly instances: readonly NinjaOneCapitalMvpStructureInstance[];
}) {
  return (
    <g data-label-contract="close-only-separate-from-art">
      {instances.map((instance) => {
        const shortLabel = instance.plot.label
          .replace("Go (Golang)", "GO")
          .split(/[ /()-]/)
          .filter(Boolean)
          .map((word) => word[0])
          .join("")
          .slice(0, 3)
          .toUpperCase();
        return (
          <g
            data-capital-label={instance.plot.id}
            key={instance.id}
            transform={`translate(${instance.anchor[0]} ${instance.anchor[1] - 22})`}
          >
            <circle r="15" />
            <text textAnchor="middle" y="4">{shortLabel}</text>
            <text className="ninjaone-capital-mvp__plot-name" textAnchor="middle" y="27">
              {instance.plot.label.toUpperCase()}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export function NinjaOneCapitalMvp({
  camera,
  detailState,
  light,
}: NinjaOneCapitalMvpProps) {
  const worldX = NINJAONE_CAPITAL_TOPOLOGY_WORLD_ORIGIN[0] * WORLD_PLANE.width;
  const worldY = NINJAONE_CAPITAL_TOPOLOGY_WORLD_ORIGIN[1] * WORLD_PLANE.height;
  const scaleX = NINJAONE_CAPITAL_TOPOLOGY_WORLD_SPAN[0] * WORLD_PLANE.width
    / NINJAONE_CAPITAL_TOPOLOGY_ARTBOARD[0];
  const scaleY = NINJAONE_CAPITAL_TOPOLOGY_WORLD_SPAN[1] * WORLD_PLANE.height
    / NINJAONE_CAPITAL_TOPOLOGY_ARTBOARD[1];
  const visibleLayers = NINJAONE_CAPITAL_MVP_LOD_LAYERS[detailState.tier.id];
  const basePlate = NINJAONE_CAPITAL_MVP_PLATES.base[detailState.tier.id];
  const staticEnvironmentPlate =
    NINJAONE_CAPITAL_MVP_PLATES.staticEnvironment[detailState.tier.id];
  const visibleStructures = NINJAONE_CAPITAL_MVP_STRUCTURE_INSTANCES.filter(
    (instance) => resolveAtomicTierVisibility(
      { minimumTier: instance.minimumTier },
      detailState,
    ) > 0,
  );
  const visibleFoliage = NINJAONE_CAPITAL_MVP_FOLIAGE_INSTANCES.filter(
    (instance) => resolveAtomicTierVisibility(
      { minimumTier: instance.minimumTier },
      detailState,
    ) > 0,
  );
  const visiblePlantCount = visibleFoliage.reduce(
    (total, { resource }) => total + resource.visualPlantCount,
    0,
  );
  const backgroundFoliage = visibleFoliage.filter(
    ({ depth }) => depth === "background",
  );
  const foregroundFoliage = visibleFoliage.filter(
    ({ depth }) => depth === "foreground",
  );
  const windVector = windVectorFromDegrees(
    DEFAULT_WORLD_WIND_STATE.directionDegrees,
  );

  return (
    <>
      <svg
        aria-label="Layered NinjaOne Capital production art pass"
        className="career-world__layer ninjaone-capital-mvp"
        data-capital-layer-order={NINJAONE_CAPITAL_MVP_LAYER_ORDER.join(",")}
        data-capital-loaded-layer-count={visibleLayers.length}
        data-capital-mvp="career-world/capitals/ninjaone/capital-mvp@r1"
        data-capital-shared-foliage-count={visibleFoliage.length}
        data-capital-shared-structure-count={visibleStructures.length}
        data-lod-tier={detailState.tier.id}
        preserveAspectRatio="none"
        role="img"
        viewBox={cameraViewBox(camera, [WORLD_PLANE.width, WORLD_PLANE.height])}
      >
        <defs>
          <filter height="180%" id="ninjaone-capital-shadow-soften" width="180%" x="-40%" y="-40%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
          <filter height="180%" id="ninjaone-capital-contact-soften" width="180%" x="-40%" y="-40%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>
        <FoliageDefinitions windVector={windVector} />

        <g transform={`translate(${worldX} ${worldY}) scale(${scaleX} ${scaleY})`}>
          <g data-capital-layer="base-surface">
            <image
              className="ninjaone-capital-mvp__authored-plate"
              data-capital-plate="base"
              data-capital-plate-source={basePlate.path}
              height={NINJAONE_CAPITAL_TOPOLOGY_ARTBOARD[1]}
              href={basePlate.path}
              preserveAspectRatio="none"
              width={NINJAONE_CAPITAL_TOPOLOGY_ARTBOARD[0]}
              x="0"
              y="0"
            />
          </g>

          {layerVisible("district-static-environment", detailState) ? (
            <g data-capital-layer="district-static-environment">
              <image
                className="ninjaone-capital-mvp__authored-plate ninjaone-capital-mvp__authored-plate--environment"
                data-capital-plate="static-environment"
                data-capital-plate-source={staticEnvironmentPlate.path}
                height={NINJAONE_CAPITAL_TOPOLOGY_ARTBOARD[1]}
                href={staticEnvironmentPlate.path}
                preserveAspectRatio="none"
                width={NINJAONE_CAPITAL_TOPOLOGY_ARTBOARD[0]}
                x="0"
                y="0"
              />
            </g>
          ) : null}

          {layerVisible("transportation-rails", detailState) ? (
            <g data-capital-layer="transportation-rails">
              <polyline
                className="ninjaone-capital-mvp__rail-bed"
                points={svgPoints(NINJAONE_CAPITAL_TOPOLOGY_RAIL_CORRIDOR.points)}
              />
              <polyline
                className="ninjaone-capital-mvp__rail-ties"
                points={svgPoints(NINJAONE_CAPITAL_TOPOLOGY_RAIL_CORRIDOR.points)}
              />
              <polyline
                className="ninjaone-capital-mvp__rail-steel"
                points={svgPoints(NINJAONE_CAPITAL_TOPOLOGY_RAIL_CORRIDOR.points)}
              />
              <polyline
                className="ninjaone-capital-mvp__rail-channel"
                points={svgPoints(NINJAONE_CAPITAL_TOPOLOGY_RAIL_CORRIDOR.points)}
              />
            </g>
          ) : null}

          {backgroundFoliage.length > 0 ? (
            <g data-capital-layer="shared-animated-foliage-background">
              {backgroundFoliage.map((instance) => (
                <SharedFoliage instance={instance} key={instance.id} />
              ))}
            </g>
          ) : null}

          {layerVisible("dynamic-world-light-shadows", detailState) ? (
            <g data-capital-layer="dynamic-world-light-shadows">
              {visibleStructures.map((instance) => (
                <StructureShadow instance={instance} key={instance.id} light={light} />
              ))}
            </g>
          ) : null}

          {visibleStructures.filter(({ plot }) => plot.role === "skill").length > 0 ? (
            <g data-capital-layer="skill-buildings">
              {visibleStructures
                .filter(({ plot }) => plot.role === "skill")
                .map((instance) => (
                  <SharedStructure instance={instance} key={instance.id} />
                ))}
            </g>
          ) : null}

          {visibleStructures.filter(({ plot }) => plot.role === "decoration").length > 0 ? (
            <g data-capital-layer="decoration-buildings">
              {visibleStructures
                .filter(({ plot }) => plot.role === "decoration")
                .map((instance) => (
                  <SharedStructure instance={instance} key={instance.id} />
                ))}
            </g>
          ) : null}

          {visibleStructures.filter(({ plot }) => plot.role === "station").map(
            (instance) => (
              <g data-capital-layer="transportation-station" key={instance.id}>
                <SharedStructure instance={instance} />
              </g>
            ),
          )}

          {foregroundFoliage.length > 0 ? (
            <g data-capital-layer="shared-animated-foliage">
              {foregroundFoliage.map((instance) => (
                <SharedFoliage instance={instance} key={instance.id} />
              ))}
            </g>
          ) : null}

          {layerVisible("integration-details", detailState) ? (
            <g data-capital-layer="integration-details">
              <IntegrationDetails instances={visibleStructures} />
            </g>
          ) : null}

          {layerVisible("close-labels", detailState) ? (
            <g data-capital-layer="close-labels">
              <CloseLabels instances={visibleStructures} />
            </g>
          ) : null}
        </g>
      </svg>

      <aside className="ninjaone-capital-mvp__hud" aria-label="Capital layer status">
        <p>NINJAONE CAPITAL · PRODUCTION ART R2</p>
        <strong>{detailState.tier.label}</strong>
        <span>{visibleLayers.length}/{NINJAONE_CAPITAL_MVP_LAYER_ORDER.length} layers mounted</span>
        <span>{visibleStructures.length} instances · {NINJAONE_CAPITAL_MVP_STRUCTURE_RESOURCES.length} shared structure resources</span>
        <span>{visibleFoliage.length} foliage nodes · {visiblePlantCount}/{NINJAONE_CAPITAL_MVP_ESTIMATED_PLANT_COUNT} represented plants</span>
        <span>Wheel to add/remove detail · drag to inspect</span>
      </aside>
    </>
  );
}
