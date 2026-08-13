import manifest from "../../../../../../public/career-world/cities/kaizen-agent/manifests/environment-runtime-r1.json" with { type: "json" };
import type { Pair } from "../../../../shared/camera";
import {
  KAIZEN_CITY_PLATE_DIMENSIONS,
  KAIZEN_CITY_REGISTRATION,
  kaizenRegistrationPointToWorld,
} from "../../../../shared/kaizenCityRegistration.ts";
import type { DetailTierId } from "../../../../shared/lod";

type FoliageDetailTier = Extract<
  DetailTierId,
  "capital" | "site" | "close"
>;

export interface FoliageResource {
  readonly atlasDimensions: Pair;
  readonly atlasPath: string;
  readonly canopySplit: number;
  readonly crop: readonly [number, number, number, number];
  readonly durationSeconds: number;
  readonly id: string;
  readonly motionScale: number;
  readonly phaseSeconds: number;
  readonly presentation:
    | "tree"
    | "ground-cover"
    | "hedge"
    | "copse";
}

export interface FoliageInstance {
  readonly anchor: Pair;
  readonly id: string;
  readonly minimumTier: FoliageDetailTier;
  readonly mirror?: boolean;
  readonly resourceId: FoliageResource["id"];
  readonly scale: number;
}

export interface FoliageGroupResource {
  readonly id: string;
  readonly presentation:
    | "wall-border"
    | "understory"
    | "natural-copse";
  readonly resourceId: FoliageResource["id"];
  readonly visualPlantCount: number;
}

export interface FoliageGroupInstance {
  readonly anchor: Pair;
  readonly groupId: FoliageGroupResource["id"];
  readonly id: string;
  readonly minimumTier: FoliageDetailTier;
  readonly mirror?: boolean;
  readonly scale: number;
}

interface RawFoliageInstance {
  readonly id: string;
  readonly resourceId: string;
  readonly anchor: number[];
  readonly scale: number;
  readonly minimumTier: string;
  readonly mirror?: boolean;
}

if (
  manifest.schemaVersion !== 1
  || manifest.id !== "career-world/kaizen-agent/environment-runtime@r1"
  || manifest.registrationRef !== KAIZEN_CITY_REGISTRATION
  || manifest.placementBasis !== "base-layout-r2-curated-environment-anchor-plate"
) {
  throw new TypeError("Kaizen foliage placement manifest is invalid.");
}

export const NINJAONE_FOLIAGE_POOL_ID = manifest.poolId;
export const KAIZEN_FOLIAGE_LAYOUT_ID = manifest.id;
export const KAIZEN_FOLIAGE_PLACEMENT_BASIS = manifest.placementBasis;
export const NINJAONE_FOLIAGE_RESOURCES: readonly FoliageResource[] =
  Object.freeze(manifest.resources.map((definition) => {
    if (
      !definition.atlasPath.startsWith(
        "/career-world/shared-assets/environment/foliage/",
      )
      || definition.atlasDimensions.length !== 2
      || definition.crop.length !== 4
      || !["tree", "ground-cover", "hedge", "copse"].includes(
        definition.presentation,
      )
    ) {
      throw new TypeError(`Invalid shared foliage resource ${definition.id}.`);
    }
    return Object.freeze({
      atlasDimensions: Object.freeze([
        definition.atlasDimensions[0],
        definition.atlasDimensions[1],
      ] as Pair),
      atlasPath: definition.atlasPath,
      canopySplit: definition.canopySplit,
      crop: Object.freeze([
        definition.crop[0],
        definition.crop[1],
        definition.crop[2],
        definition.crop[3],
      ] as const),
      durationSeconds: definition.durationSeconds,
      id: definition.id,
      motionScale: definition.motionScale,
      phaseSeconds: definition.phaseSeconds,
      presentation: definition.presentation as FoliageResource["presentation"],
    });
  }));

export const KAIZEN_FOLIAGE_GROUP_RESOURCES:
readonly FoliageGroupResource[] = Object.freeze(
  manifest.groupResources.map((definition) => Object.freeze({
    id: definition.id,
    presentation: definition.presentation as FoliageGroupResource["presentation"],
    resourceId: definition.resourceId,
    visualPlantCount: definition.visualPlantCount,
  })),
);

const KAIZEN_PLATE_SIZE = KAIZEN_CITY_PLATE_DIMENSIONS[0];

if (KAIZEN_PLATE_SIZE !== KAIZEN_CITY_PLATE_DIMENSIONS[1]) {
  throw new TypeError("Kaizen foliage registration must stay square.");
}

function kaizenPlateAnchor(x: number, y: number): Pair {
  return kaizenRegistrationPointToWorld([x, y]);
}

function groupInstance(
  id: string,
  groupId: FoliageGroupResource["id"],
  x: number,
  y: number,
  scale: number,
  minimumTier: FoliageGroupInstance["minimumTier"],
  mirror = false,
): FoliageGroupInstance {
  return Object.freeze({
    anchor: kaizenPlateAnchor(x, y),
    groupId,
    id,
    minimumTier,
    mirror,
    scale,
  });
}

function singularInstance(
  id: string,
  resourceId: FoliageResource["id"],
  x: number,
  y: number,
  scale: number,
  minimumTier: FoliageInstance["minimumTier"],
  mirror = false,
): FoliageInstance {
  return Object.freeze({
    anchor: kaizenPlateAnchor(x, y),
    id,
    minimumTier,
    mirror,
    resourceId,
    scale,
  });
}

function foliageTier(value: string): FoliageDetailTier {
  if (value !== "capital" && value !== "site" && value !== "close") {
    throw new TypeError(`Unknown Kaizen foliage detail tier: ${value}`);
  }
  return value;
}

const authoredGroupInstances = Object.freeze(
  manifest.groupInstances.map((definition) => {
    if (
      !KAIZEN_FOLIAGE_GROUP_RESOURCES.some(({ id }) => (
        id === definition.groupId
      ))
      || definition.anchor.length !== 2
      || definition.anchor.some((value) => (
        !Number.isFinite(value) || value < 0 || value > KAIZEN_PLATE_SIZE
      ))
      || !Number.isFinite(definition.scale)
      || definition.scale <= 0
    ) {
      throw new TypeError(`Invalid Kaizen foliage group ${definition.id}.`);
    }
    return Object.freeze({
      forest: definition.forest,
      instance: groupInstance(
        definition.id,
        definition.groupId as FoliageGroupResource["id"],
        definition.anchor[0],
        definition.anchor[1],
        definition.scale,
        foliageTier(definition.minimumTier),
        definition.mirror,
      ),
    });
  }),
);

export const KAIZEN_FOLIAGE_GROUP_INSTANCES:
readonly FoliageGroupInstance[] = Object.freeze(
  authoredGroupInstances.flatMap(({ forest, instance }) => (
    forest ? [] : [instance]
  )),
);

export const KAIZEN_FOREST_GROUP_INSTANCES:
readonly FoliageGroupInstance[] = Object.freeze(
  authoredGroupInstances.flatMap(({ forest, instance }) => (
    forest ? [instance] : []
  )),
);

export const KAIZEN_FOLIAGE_SINGULAR_INSTANCES:
readonly FoliageInstance[] = Object.freeze(
  (manifest.singularInstances as readonly RawFoliageInstance[]).map(
    (definition) => {
    if (
      !NINJAONE_FOLIAGE_RESOURCES.some(({ id }) => (
        id === definition.resourceId
      ))
      || definition.anchor.length !== 2
      || definition.anchor.some((value) => (
        !Number.isFinite(value) || value < 0 || value > KAIZEN_PLATE_SIZE
      ))
      || !Number.isFinite(definition.scale)
      || definition.scale <= 0
    ) {
      throw new TypeError(`Invalid Kaizen singular foliage ${definition.id}.`);
    }
    return singularInstance(
      definition.id,
      definition.resourceId as FoliageResource["id"],
      definition.anchor[0],
      definition.anchor[1],
      definition.scale,
      foliageTier(definition.minimumTier),
      definition.mirror,
    );
    },
  ),
);

const RESOURCE_BY_ID = new Map(
  NINJAONE_FOLIAGE_RESOURCES.map((definition) => [definition.id, definition]),
);
const GROUP_RESOURCE_BY_ID = new Map(
  KAIZEN_FOLIAGE_GROUP_RESOURCES.map((definition) => [
    definition.id,
    definition,
  ]),
);

export function resolveNinjaOneFoliageResource(
  id: FoliageResource["id"],
): FoliageResource {
  const definition = RESOURCE_BY_ID.get(id);
  if (!definition) {
    throw new Error(`Unknown NinjaOne foliage resource: ${id}`);
  }
  return definition;
}

export function resolveKaizenFoliageGroupResource(
  id: FoliageGroupResource["id"],
): FoliageGroupResource {
  const definition = GROUP_RESOURCE_BY_ID.get(id);
  if (!definition) {
    throw new Error(`Unknown Kaizen foliage group resource: ${id}`);
  }
  return definition;
}
