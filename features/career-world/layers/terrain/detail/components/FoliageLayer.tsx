import type { CSSProperties } from "react";
import {
  cameraViewBox,
  type CameraView,
  type Pair,
} from "../../../../shared/camera";
import {
  LOD_PRESENTATION_EPSILON,
  resolveAtomicTierVisibility,
  type DetailState,
} from "../../../../shared/lod";
import { WORLD_PLANE } from "../../../../shared/world";
import { KAIZEN_CITY_PIXEL_TO_WORLD } from "../../../../shared/kaizenCityRegistration";
import {
  DEFAULT_WORLD_WIND_STATE,
  windVectorFromDegrees,
} from "../../../../shared/weather";
import {
  KAIZEN_FOLIAGE_GROUP_INSTANCES,
  KAIZEN_FOLIAGE_GROUP_RESOURCES,
  KAIZEN_FOLIAGE_LAYOUT_ID,
  KAIZEN_FOLIAGE_PLACEMENT_BASIS,
  KAIZEN_FOLIAGE_SINGULAR_INSTANCES,
  KAIZEN_FOREST_GROUP_INSTANCES,
  NINJAONE_FOLIAGE_POOL_ID,
  NINJAONE_FOLIAGE_RESOURCES,
  resolveKaizenFoliageGroupResource,
  resolveNinjaOneFoliageResource,
  type FoliageGroupInstance,
  type FoliageInstance,
  type FoliageResource,
} from "../model/kaizenFoliage";

interface FoliageLayerProps {
  readonly camera: CameraView;
  readonly detailState: DetailState;
}

interface WindAnimatedDefinition {
  readonly durationSeconds: number;
  readonly motionScale: number;
  readonly phaseSeconds: number;
}

interface VisibleSingularInstance {
  readonly instance: FoliageInstance;
  readonly kind: "singular";
  readonly visibility: number;
}

interface VisibleGroupInstance {
  readonly instance: FoliageGroupInstance;
  readonly kind: "group";
  readonly visibility: number;
}

type VisibleFoliageInstance =
  | VisibleSingularInstance
  | VisibleGroupInstance;

function worldPoint([x, y]: Pair): Pair {
  return Object.freeze([
    x * WORLD_PLANE.width,
    y * WORLD_PLANE.height,
  ] as [number, number]);
}

function breezeStyle(
  definition: WindAnimatedDefinition,
  windVector: Pair,
  amplitude = 1,
): CSSProperties {
  const motion = DEFAULT_WORLD_WIND_STATE.motion;
  const motionScale = definition.motionScale * amplitude;
  const tilt = windVector[0] * motion * 0.72 * motionScale;
  return {
    "--foliage-breeze-drift-x":
      `${(windVector[0] * motion * 2.4 * motionScale).toFixed(3)}px`,
    "--foliage-breeze-drift-y":
      `${(windVector[1] * motion * 0.72 * motionScale).toFixed(3)}px`,
    "--foliage-breeze-tilt-start": `${(-tilt * 0.32).toFixed(3)}deg`,
    "--foliage-breeze-tilt-end": `${tilt.toFixed(3)}deg`,
    animationDelay: `${definition.phaseSeconds}s`,
    animationDuration: `${definition.durationSeconds}s`,
  } as CSSProperties;
}

function FoliageResourceDefinitions({
  resources,
  windVector,
}: {
  readonly resources: readonly FoliageResource[];
  readonly windVector: Pair;
}) {
  return (
    <defs data-foliage-resource-pool={NINJAONE_FOLIAGE_POOL_ID}>
      {resources.map((resource) => {
        const [atlasWidth, atlasHeight] = resource.atlasDimensions;
        const [x, y, width, height] = resource.crop;
        const canopyHeight = height * resource.canopySplit;
        const trunkHeight = height - canopyHeight;
        return (
          <symbol
            id={`career-world-foliage-${resource.id}`}
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
                x={0}
                y={0}
              />
            </svg>
            <g
              className="career-world__foliage-canopy"
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
                  x={0}
                  y={0}
                />
              </svg>
            </g>
          </symbol>
        );
      })}
    </defs>
  );
}

function FoliageSingularGlyph({
  instance,
  visibility,
}: {
  readonly instance: FoliageInstance;
  readonly visibility: number;
}) {
  const resource = resolveNinjaOneFoliageResource(instance.resourceId);
  const [, , width, height] = resource.crop;
  const [x, y] = worldPoint(instance.anchor);
  const scaleX = instance.scale * KAIZEN_CITY_PIXEL_TO_WORLD[0]
    * (instance.mirror ? -1 : 1);
  const scaleY = instance.scale * KAIZEN_CITY_PIXEL_TO_WORLD[1];

  return (
    <g
      data-foliage-instance-id={instance.id}
      data-foliage-instance-kind="singular"
      data-foliage-minimum-tier={instance.minimumTier}
      data-foliage-presentation={resource.presentation}
      data-foliage-resource-id={resource.id}
      style={{ opacity: visibility }}
      transform={`translate(${x} ${y}) scale(${scaleX} ${scaleY})`}
    >
      <use
        height={height}
        href={`#career-world-foliage-${resource.id}`}
        width={width}
        x={-width * 0.5}
        y={-height}
      />
    </g>
  );
}

function FoliageGroupGlyph({
  instance,
  visibility,
}: {
  readonly instance: FoliageGroupInstance;
  readonly visibility: number;
}) {
  const group = resolveKaizenFoliageGroupResource(instance.groupId);
  const resource = resolveNinjaOneFoliageResource(group.resourceId);
  const [, , width, height] = resource.crop;
  const [x, y] = worldPoint(instance.anchor);
  const scaleX = instance.scale * KAIZEN_CITY_PIXEL_TO_WORLD[0]
    * (instance.mirror ? -1 : 1);
  const scaleY = instance.scale * KAIZEN_CITY_PIXEL_TO_WORLD[1];

  return (
    <g
      data-foliage-group-id={group.id}
      data-foliage-instance-id={instance.id}
      data-foliage-instance-kind="group"
      data-foliage-minimum-tier={instance.minimumTier}
      data-foliage-presentation={group.presentation}
      data-foliage-resource-id={resource.id}
      data-foliage-visual-plant-count={group.visualPlantCount}
      style={{ opacity: visibility }}
      transform={`translate(${x} ${y}) scale(${scaleX} ${scaleY})`}
    >
      <use
        height={height}
        href={`#career-world-foliage-${resource.id}`}
        width={width}
        x={-width * 0.5}
        y={-height}
      />
    </g>
  );
}

function visibleAtDetailTier<T extends {
  readonly minimumTier: FoliageInstance["minimumTier"];
}>(
  instances: readonly T[],
  detailState: DetailState,
): readonly { readonly instance: T; readonly visibility: number }[] {
  return instances.flatMap((instance) => {
    const visibility = resolveAtomicTierVisibility(
      { minimumTier: instance.minimumTier },
      detailState,
    );
    return visibility > LOD_PRESENTATION_EPSILON
      ? [{ instance, visibility }]
      : [];
  });
}

export function FoliageLayer({
  camera,
  detailState,
}: FoliageLayerProps) {
  const visibleSingularInstances = visibleAtDetailTier(
    KAIZEN_FOLIAGE_SINGULAR_INSTANCES,
    detailState,
  );
  const allGroupInstances = [
    ...KAIZEN_FOLIAGE_GROUP_INSTANCES,
    ...KAIZEN_FOREST_GROUP_INSTANCES,
  ];
  const visibleGroupInstances = visibleAtDetailTier(
    allGroupInstances,
    detailState,
  );
  const visibleInstances: VisibleFoliageInstance[] = [
    ...visibleSingularInstances.map(({ instance, visibility }) => ({
      instance,
      kind: "singular" as const,
      visibility,
    })),
    ...visibleGroupInstances.map(({ instance, visibility }) => ({
      instance,
      kind: "group" as const,
      visibility,
    })),
  ].sort((left, right) => left.instance.anchor[1] - right.instance.anchor[1]);
  const visibleResourceIds = new Set([
    ...visibleSingularInstances.map(({ instance }) => instance.resourceId),
    ...visibleGroupInstances.map(({ instance }) => (
      resolveKaizenFoliageGroupResource(instance.groupId).resourceId
    )),
  ]);
  const visibleResources = NINJAONE_FOLIAGE_RESOURCES.filter(
    ({ id }) => visibleResourceIds.has(id),
  );
  const allInstances = [
    ...allGroupInstances,
    ...KAIZEN_FOLIAGE_SINGULAR_INSTANCES,
  ];
  const countAtTier = (tier: FoliageInstance["minimumTier"]) => (
    allInstances.filter(({ minimumTier }) => minimumTier === tier).length
  );
  const capitalInstanceCount = countAtTier("capital");
  const siteInstanceCount = countAtTier("site");
  const closeInstanceCount = countAtTier("close");
  const estimatedPlantCount = KAIZEN_FOLIAGE_SINGULAR_INSTANCES.length
    + allGroupInstances.reduce((total, instance) => (
      total
      + resolveKaizenFoliageGroupResource(instance.groupId).visualPlantCount
    ), 0);
  const mountedEstimatedPlantCount = visibleSingularInstances.length
    + visibleGroupInstances.reduce((total, { instance }) => (
      total
      + resolveKaizenFoliageGroupResource(instance.groupId).visualPlantCount
    ), 0);
  const windVector = windVectorFromDegrees(
    DEFAULT_WORLD_WIND_STATE.directionDegrees,
  );

  return (
    <svg
      aria-hidden="true"
      className="career-world__layer career-world__foliage-layer"
      data-foliage-animation="pooled-cohesive-group-canopy-wind"
      data-foliage-capital-instance-count={capitalInstanceCount}
      data-foliage-close-instance-count={closeInstanceCount}
      data-foliage-estimated-plant-count={estimatedPlantCount}
      data-foliage-forest-group-count={KAIZEN_FOREST_GROUP_INSTANCES.length}
      data-foliage-group-instance-count={allGroupInstances.length}
      data-foliage-group-resource-count={KAIZEN_FOLIAGE_GROUP_RESOURCES.length}
      data-foliage-instance-count={allInstances.length}
      data-foliage-layout={KAIZEN_FOLIAGE_LAYOUT_ID}
      data-foliage-mounted-group-count={visibleGroupInstances.length}
      data-foliage-mounted-instance-count={visibleInstances.length}
      data-foliage-mounted-resource-count={visibleResources.length}
      data-foliage-mounted-estimated-plant-count={
        mountedEstimatedPlantCount
      }
      data-foliage-placement-basis={KAIZEN_FOLIAGE_PLACEMENT_BASIS}
      data-foliage-resource-count={NINJAONE_FOLIAGE_RESOURCES.length}
      data-foliage-resource-pool={NINJAONE_FOLIAGE_POOL_ID}
      data-foliage-singular-instance-count={
        KAIZEN_FOLIAGE_SINGULAR_INSTANCES.length
      }
      data-foliage-site-instance-count={siteInstanceCount}
      data-layer="foliage"
      data-lod-tier={detailState.tier.id}
      data-world-wind-direction={DEFAULT_WORLD_WIND_STATE.directionDegrees}
      data-world-wind-motion={DEFAULT_WORLD_WIND_STATE.motion}
      focusable="false"
      height="100%"
      preserveAspectRatio="none"
      style={{ pointerEvents: "none" }}
      viewBox={cameraViewBox(
        camera,
        [WORLD_PLANE.width, WORLD_PLANE.height],
      )}
      width="100%"
    >
      {visibleResources.length > 0 ? (
        <FoliageResourceDefinitions
          resources={visibleResources}
          windVector={windVector}
        />
      ) : null}
      {visibleInstances.length > 0 ? (
        <g className="career-world__foliage-instances">
          {visibleInstances.map(({ instance, kind, visibility }) => (
            kind === "group" ? (
              <FoliageGroupGlyph
                instance={instance}
                key={instance.id}
                visibility={visibility}
              />
            ) : (
              <FoliageSingularGlyph
                instance={instance}
                key={instance.id}
                visibility={visibility}
              />
            )
          ))}
        </g>
      ) : null}
    </svg>
  );
}
