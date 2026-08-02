import manifest from "@/public/career-world/layers/actors-effects/manifests/ninjaone-pedestrians-r1.json";
import type { Pair } from "../../../shared/camera";
import type { DetailNodePolicy } from "../../../shared/lod";
import {
  CAPITAL_CAMPUS_INFRASTRUCTURE,
  PROJECT_TOWN_INFRASTRUCTURE,
  type TownPlan,
  type TownPlanEntrance,
  type TownPlanPedestrianLoop,
} from "../../infrastructure";

export const PEDESTRIAN_OWNER_KINDS = ["project", "capital"] as const;
export type PedestrianOwnerKind = typeof PEDESTRIAN_OWNER_KINDS[number];

export const PEDESTRIAN_DIRECTIONS = [
  "clockwise",
  "counterclockwise",
] as const;
export type PedestrianDirection = typeof PEDESTRIAN_DIRECTIONS[number];

export interface PedestrianAppearance {
  readonly coat: string;
  readonly trousers: string;
  readonly skin: string;
  readonly hair: string;
}

export interface PedestrianInstance {
  readonly id: string;
  readonly ownerKind: PedestrianOwnerKind;
  readonly ownerId: string;
  readonly startEntranceStructureId: string;
  readonly direction: PedestrianDirection;
  readonly durationSeconds: number;
  readonly appearance: PedestrianAppearance;
  readonly entrance: TownPlanEntrance;
  readonly loop: TownPlanPedestrianLoop;
  readonly motionPath: readonly Pair[];
  readonly restPoint: Pair;
}

interface OwnerTownPlan {
  readonly ownerKind: PedestrianOwnerKind;
  readonly ownerId: string;
  readonly townPlan: TownPlan;
}

export const PEDESTRIAN_NODE_POLICY: DetailNodePolicy = Object.freeze({
  minimumTier: "close",
});

function includes<const Value extends string>(
  values: readonly Value[],
  candidate: string,
): candidate is Value {
  return values.includes(candidate as Value);
}

function color(value: string, label: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(value)) {
    throw new TypeError(`${label} must be a six-digit hex color.`);
  }
  return value;
}

function samePoint(left: Pair, right: Pair): boolean {
  return left[0] === right[0] && left[1] === right[1];
}

function signedScreenArea(points: readonly Pair[]): number {
  return points.reduce((area, point, index) => {
    const next = points[(index + 1) % points.length];
    return area + point[0] * next[1] - next[0] * point[1];
  }, 0);
}

function rotatedMotionPath(
  loop: TownPlanPedestrianLoop,
  entrance: TownPlanEntrance,
  direction: PedestrianDirection,
): readonly Pair[] {
  const openLoop = loop.waypoints.slice(0, -1);
  const startIndex = openLoop.findIndex((point) => (
    samePoint(point, entrance.point)
  ));
  if (startIndex < 0) {
    throw new TypeError(
      `${entrance.structureId} entrance is not on ${loop.id}.`,
    );
  }

  const rotated = [
    ...openLoop.slice(startIndex),
    ...openLoop.slice(0, startIndex),
  ];
  const area = signedScreenArea(rotated);
  if (area === 0) {
    throw new TypeError(`${loop.id} cannot define a directional path.`);
  }

  const authoredClockwise = area > 0;
  const requestedClockwise = direction === "clockwise";
  const directed = authoredClockwise === requestedClockwise
    ? rotated
    : [rotated[0], ...rotated.slice(1).reverse()];

  return Object.freeze([
    ...directed,
    directed[0],
  ]);
}

function motionPathUsesLoopGeometry(
  loop: TownPlanPedestrianLoop,
  path: readonly Pair[],
): boolean {
  if (
    path.length !== loop.waypoints.length
    || !samePoint(path[0], path[path.length - 1])
  ) {
    return false;
  }

  return path.slice(0, -1).every((point, index) => {
    const next = path[index + 1];
    return loop.waypoints.slice(0, -1).some((loopPoint, loopIndex) => {
      const loopNext = loop.waypoints[loopIndex + 1];
      return (
        samePoint(point, loopPoint)
        && samePoint(next, loopNext)
      ) || (
        samePoint(point, loopNext)
        && samePoint(next, loopPoint)
      );
    });
  });
}

function routeRestPoint(
  path: readonly Pair[],
  progress: number,
): Pair {
  const entrance = path[0];
  const next = path.slice(1).find((point) => (
    !samePoint(point, entrance)
  ));
  if (!next || progress <= 0 || progress >= 1) {
    throw new TypeError(
      "Pedestrian reduced-motion rest progress must lie inside a route segment.",
    );
  }

  return Object.freeze([
    entrance[0] + (next[0] - entrance[0]) * progress,
    entrance[1] + (next[1] - entrance[1]) * progress,
  ]);
}

const OWNER_TOWN_PLANS: readonly OwnerTownPlan[] = Object.freeze([
  ...PROJECT_TOWN_INFRASTRUCTURE.map(({ project, townPlan }) => (
    Object.freeze({
      ownerKind: "project" as const,
      ownerId: project.id,
      townPlan,
    })
  )),
  Object.freeze({
    ownerKind: "capital" as const,
    ownerId: CAPITAL_CAMPUS_INFRASTRUCTURE.capital.id,
    townPlan: CAPITAL_CAMPUS_INFRASTRUCTURE.townPlan,
  }),
]);

if (
  manifest.schemaVersion !== 1
  || manifest.coordinateSpace !== "normalized-world-top-left"
  || manifest.territoryId !== "ninjaone"
  || manifest.minimumTier !== PEDESTRIAN_NODE_POLICY.minimumTier
  || !Number.isFinite(manifest.reducedMotionRestProgress)
  || manifest.reducedMotionRestProgress <= 0
  || manifest.reducedMotionRestProgress >= 1
) {
  throw new TypeError(
    "NinjaOne pedestrians violate the actors-effects layer contract.",
  );
}

const instanceIds = new Set<string>();

export const PEDESTRIAN_INSTANCES: readonly PedestrianInstance[] =
  Object.freeze(
    manifest.pedestrians.map((config): PedestrianInstance => {
      if (
        config.id.trim().length === 0
        || instanceIds.has(config.id)
        || !includes(PEDESTRIAN_OWNER_KINDS, config.ownerKind)
        || !includes(PEDESTRIAN_DIRECTIONS, config.direction)
        || !Number.isFinite(config.durationSeconds)
        || config.durationSeconds <= 0
      ) {
        throw new TypeError(`${config.id} has invalid pedestrian metadata.`);
      }
      instanceIds.add(config.id);

      const owner = OWNER_TOWN_PLANS.find((candidate) => (
        candidate.ownerKind === config.ownerKind
        && candidate.ownerId === config.ownerId
      ));
      const entrance = owner?.townPlan.entrances.find((candidate) => (
        candidate.structureId === config.startEntranceStructureId
      ));
      const loop = owner?.townPlan.pedestrianLoops.find((candidate) => (
        candidate.id === entrance?.loopId
      ));
      if (!owner || !entrance || !loop) {
        throw new TypeError(
          `${config.id} has an invalid owner, entrance, or loop.`,
        );
      }

      const appearance = Object.freeze({
        coat: color(config.appearance.coat, `${config.id} coat`),
        trousers: color(
          config.appearance.trousers,
          `${config.id} trousers`,
        ),
        skin: color(config.appearance.skin, `${config.id} skin`),
        hair: color(config.appearance.hair, `${config.id} hair`),
      });
      const motionPath = rotatedMotionPath(
        loop,
        entrance,
        config.direction,
      );
      if (!motionPathUsesLoopGeometry(loop, motionPath)) {
        throw new TypeError(
          `${config.id} motion must use its rendered pedestrian loop.`,
        );
      }
      const restPoint = routeRestPoint(
        motionPath,
        manifest.reducedMotionRestProgress,
      );
      if (owner.townPlan.entrances.some((candidate) => (
        samePoint(candidate.point, restPoint)
      ))) {
        throw new TypeError(
          `${config.id} reduced-motion rest point cannot be an entrance.`,
        );
      }

      return Object.freeze({
        id: config.id,
        ownerKind: config.ownerKind,
        ownerId: config.ownerId,
        startEntranceStructureId: config.startEntranceStructureId,
        direction: config.direction,
        durationSeconds: config.durationSeconds,
        appearance,
        entrance,
        loop,
        motionPath,
        restPoint,
      });
    }),
  );

const DEFERRED_PEDESTRIAN_OWNER_IDS = new Set([
  "project-kaizen-agent",
]);

export const RENDERED_PEDESTRIAN_INSTANCES: readonly PedestrianInstance[] =
  Object.freeze(
    PEDESTRIAN_INSTANCES.filter((instance) => (
      !DEFERRED_PEDESTRIAN_OWNER_IDS.has(instance.ownerId)
    )),
  );

for (const owner of OWNER_TOWN_PLANS) {
  const count = PEDESTRIAN_INSTANCES.filter((instance) => (
    instance.ownerKind === owner.ownerKind
    && instance.ownerId === owner.ownerId
  )).length;
  const validCount = owner.ownerKind === "capital"
    ? count >= 6 && count <= 8
    : count >= 2 && count <= 4;
  if (!validCount) {
    throw new RangeError(
      `${owner.ownerId} has an invalid authored pedestrian count.`,
    );
  }
}
