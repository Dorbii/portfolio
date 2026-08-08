import manifest from "@/public/career-world/layers/infrastructure/manifests/ninjaone-project-towns-r1.json";
import type { Pair } from "../../../shared/camera";
import type { DetailNodePolicy } from "../../../shared/lod";
import {
  PROJECT_STRUCTURES,
  type ProjectStructure,
} from "../../structures/model/projects";
import { SKILL_STRUCTURE_INSTANCES } from "../../structures/model/skills";
import { SUPPORT_STRUCTURE_INSTANCES } from "../../structures/model/support";

export const PROJECT_TOWN_TERRAIN_PROFILES = [
  "ridge-foundry",
  "coastal-yard",
  "rock-observatory",
] as const;

export type ProjectTownTerrainProfile =
  typeof PROJECT_TOWN_TERRAIN_PROFILES[number];

export const TOWN_PLAN_BLOCK_KINDS = [
  "civic",
  "mixed-use",
  "skill-frontage",
  "service-edge",
] as const;

export type TownPlanBlockKind = typeof TOWN_PLAN_BLOCK_KINDS[number];

export const TOWN_PLAN_STREET_KINDS = [
  "arterial",
  "collector",
  "local",
  "service",
  "stairs",
] as const;

export type TownPlanStreetKind = typeof TOWN_PLAN_STREET_KINDS[number];

export const TOWN_PLAN_PLAZA_KINDS = [
  "capital-forecourt",
  "project-forecourt",
  "civic",
  "service-court",
] as const;

export type TownPlanPlazaKind = typeof TOWN_PLAN_PLAZA_KINDS[number];

export const TOWN_PLAN_TERRAIN_SEAM_KINDS = [
  "retaining-wall",
  "stairs",
  "drainage",
] as const;

export type TownPlanTerrainSeamKind =
  typeof TOWN_PLAN_TERRAIN_SEAM_KINDS[number];

export interface ProjectTownPalette {
  readonly earth: string;
  readonly stone: string;
  readonly edge: string;
  readonly highlight: string;
}

export interface TownPlanBlock {
  readonly id: string;
  readonly kind: TownPlanBlockKind;
  readonly points: readonly Pair[];
  readonly structureIds: readonly string[];
}

export interface TownPlanStreet {
  readonly id: string;
  readonly kind: TownPlanStreetKind;
  readonly waypoints: readonly Pair[];
}

export interface TownPlanPlaza {
  readonly id: string;
  readonly kind: TownPlanPlazaKind;
  readonly points: readonly Pair[];
}

export interface TownPlanTerrainSeam {
  readonly id: string;
  readonly kind: TownPlanTerrainSeamKind;
  readonly waypoints: readonly Pair[];
}

export interface TownPlanPedestrianLoop {
  readonly id: string;
  readonly waypoints: readonly Pair[];
}

export interface TownPlanEntrance {
  readonly structureId: string;
  readonly point: Pair;
  readonly loopId: string;
}

export interface TownPlan {
  readonly blocks: readonly TownPlanBlock[];
  readonly streets: readonly TownPlanStreet[];
  readonly plazas: readonly TownPlanPlaza[];
  readonly terrainSeams: readonly TownPlanTerrainSeam[];
  readonly pedestrianLoops: readonly TownPlanPedestrianLoop[];
  readonly entrances: readonly TownPlanEntrance[];
}

export interface ProjectTownInfrastructure {
  readonly id: string;
  readonly project: ProjectStructure;
  readonly terrainProfile: ProjectTownTerrainProfile;
  readonly plateOwnedStructureIds: readonly string[];
  readonly townPlan: TownPlan;
  readonly palette: ProjectTownPalette;
}

interface RawTownPlan {
  readonly blocks: readonly {
    readonly id: string;
    readonly kind: string;
    readonly points: readonly number[][];
    readonly structureIds: readonly string[];
  }[];
  readonly streets: readonly {
    readonly id: string;
    readonly kind: string;
    readonly waypoints: readonly number[][];
  }[];
  readonly plazas: readonly {
    readonly id: string;
    readonly kind: string;
    readonly points: readonly number[][];
  }[];
  readonly terrainSeams: readonly {
    readonly id: string;
    readonly kind: string;
    readonly waypoints: readonly number[][];
  }[];
  readonly pedestrianLoops: readonly {
    readonly id: string;
    readonly waypoints: readonly number[][];
  }[];
  readonly entrances: readonly {
    readonly structureId: string;
    readonly point: number[];
    readonly loopId: string;
  }[];
}

export const PROJECT_TOWN_INFRASTRUCTURE_POLICY: DetailNodePolicy =
  Object.freeze({
    minimumTier: "site",
  });

export const PROJECT_TOWN_SITE_POLICY: DetailNodePolicy = Object.freeze({
  minimumTier: "site",
});

function includes<const Value extends string>(
  values: readonly Value[],
  candidate: string,
): candidate is Value {
  return values.includes(candidate as Value);
}

function normalizedPair(values: readonly number[], label: string): Pair {
  if (
    values.length !== 2
    || values.some((value) => (
      !Number.isFinite(value) || value < 0 || value > 1
    ))
  ) {
    throw new TypeError(`${label} must contain two normalized numbers.`);
  }
  return Object.freeze([values[0], values[1]] as [number, number]);
}

function normalizedPoints(
  values: readonly number[][],
  label: string,
  minimumLength: number,
): readonly Pair[] {
  if (values.length < minimumLength) {
    throw new TypeError(
      `${label} needs at least ${minimumLength} authored points.`,
    );
  }
  return Object.freeze(values.map((value, index) => (
    normalizedPair(value, `${label} point ${index}`)
  )));
}

function paletteColor(value: string, label: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(value)) {
    throw new TypeError(`${label} must be a six-digit hex color.`);
  }
  return value;
}

function palette(
  values: {
    readonly earth: string;
    readonly stone: string;
    readonly edge: string;
    readonly highlight: string;
  },
  label: string,
): ProjectTownPalette {
  return Object.freeze({
    earth: paletteColor(values.earth, `${label} earth`),
    stone: paletteColor(values.stone, `${label} stone`),
    edge: paletteColor(values.edge, `${label} edge`),
    highlight: paletteColor(values.highlight, `${label} highlight`),
  });
}

function requireUniqueId(
  id: string,
  label: string,
  seenIds: Set<string>,
): string {
  if (id.trim().length === 0 || seenIds.has(id)) {
    throw new TypeError(`${label} must have a unique, non-empty ID.`);
  }
  seenIds.add(id);
  return id;
}

function samePoint(left: Pair, right: Pair): boolean {
  return left[0] === right[0] && left[1] === right[1];
}

function requireCompleteStructureCoverage(
  references: readonly string[],
  structureIds: ReadonlySet<string>,
  label: string,
): void {
  if (
    references.length !== structureIds.size
    || new Set(references).size !== references.length
    || references.some((id) => !structureIds.has(id))
    || [...structureIds].some((id) => !references.includes(id))
  ) {
    throw new TypeError(
      `${label} must reference every retained structure exactly once.`,
    );
  }
}

function parseTownPlan(
  config: RawTownPlan,
  label: string,
  retainedStructureIds: readonly string[],
  featureIds: Set<string>,
): TownPlan {
  const structureIds = new Set(retainedStructureIds);
  if (
    structureIds.size !== retainedStructureIds.length
    || retainedStructureIds.some((id) => id.trim().length === 0)
  ) {
    throw new TypeError(`${label} has invalid retained structure IDs.`);
  }
  if (
    config.blocks.length === 0
    || config.streets.length === 0
    || config.plazas.length === 0
    || config.terrainSeams.length === 0
    || config.pedestrianLoops.length === 0
    || config.entrances.length === 0
  ) {
    throw new TypeError(`${label} requires every authored town-plan array.`);
  }

  const blocks: readonly TownPlanBlock[] = Object.freeze(
    config.blocks.map((block) => {
      requireUniqueId(block.id, `${label} block`, featureIds);
      if (
        !includes(TOWN_PLAN_BLOCK_KINDS, block.kind)
        || block.structureIds.length === 0
      ) {
        throw new TypeError(`${block.id} has invalid block metadata.`);
      }
      return Object.freeze({
        id: block.id,
        kind: block.kind,
        points: normalizedPoints(
          block.points,
          `${block.id} block`,
          3,
        ),
        structureIds: Object.freeze([...block.structureIds]),
      });
    }),
  );

  const streets: readonly TownPlanStreet[] = Object.freeze(
    config.streets.map((street) => {
      requireUniqueId(street.id, `${label} street`, featureIds);
      if (!includes(TOWN_PLAN_STREET_KINDS, street.kind)) {
        throw new TypeError(`${street.id} has an invalid street kind.`);
      }
      return Object.freeze({
        id: street.id,
        kind: street.kind,
        waypoints: normalizedPoints(
          street.waypoints,
          `${street.id} street`,
          2,
        ),
      });
    }),
  );

  const plazas: readonly TownPlanPlaza[] = Object.freeze(
    config.plazas.map((plazaConfig) => {
      requireUniqueId(plazaConfig.id, `${label} plaza`, featureIds);
      if (!includes(TOWN_PLAN_PLAZA_KINDS, plazaConfig.kind)) {
        throw new TypeError(`${plazaConfig.id} has an invalid plaza kind.`);
      }
      return Object.freeze({
        id: plazaConfig.id,
        kind: plazaConfig.kind,
        points: normalizedPoints(
          plazaConfig.points,
          `${plazaConfig.id} plaza`,
          3,
        ),
      });
    }),
  );

  const terrainSeams: readonly TownPlanTerrainSeam[] = Object.freeze(
    config.terrainSeams.map((seam) => {
      requireUniqueId(seam.id, `${label} terrain seam`, featureIds);
      if (!includes(TOWN_PLAN_TERRAIN_SEAM_KINDS, seam.kind)) {
        throw new TypeError(`${seam.id} has an invalid terrain seam kind.`);
      }
      return Object.freeze({
        id: seam.id,
        kind: seam.kind,
        waypoints: normalizedPoints(
          seam.waypoints,
          `${seam.id} terrain seam`,
          2,
        ),
      });
    }),
  );

  const pedestrianLoops: readonly TownPlanPedestrianLoop[] = Object.freeze(
    config.pedestrianLoops.map((loop) => {
      requireUniqueId(loop.id, `${label} pedestrian loop`, featureIds);
      const waypoints = normalizedPoints(
        loop.waypoints,
        `${loop.id} pedestrian loop`,
        4,
      );
      if (!samePoint(waypoints[0], waypoints[waypoints.length - 1])) {
        throw new TypeError(`${loop.id} pedestrian loop must be closed.`);
      }
      return Object.freeze({
        id: loop.id,
        waypoints,
      });
    }),
  );

  const loopById = new Map(
    pedestrianLoops.map((loop) => [loop.id, loop]),
  );
  const entrances: readonly TownPlanEntrance[] = Object.freeze(
    config.entrances.map((entrance) => {
      const point = normalizedPair(
        entrance.point,
        `${entrance.structureId} entrance`,
      );
      const loop = loopById.get(entrance.loopId);
      if (
        !structureIds.has(entrance.structureId)
        || !loop
        || !loop.waypoints.some((waypoint) => samePoint(waypoint, point))
      ) {
        throw new TypeError(
          `${entrance.structureId} has an invalid town-plan entrance.`,
        );
      }
      return Object.freeze({
        structureId: entrance.structureId,
        point,
        loopId: entrance.loopId,
      });
    }),
  );

  requireCompleteStructureCoverage(
    blocks.flatMap(({ structureIds: ids }) => ids),
    structureIds,
    `${label} blocks`,
  );
  requireCompleteStructureCoverage(
    entrances.map(({ structureId }) => structureId),
    structureIds,
    `${label} entrances`,
  );

  return Object.freeze({
    blocks,
    streets,
    plazas,
    terrainSeams,
    pedestrianLoops,
    entrances,
  });
}

if (
  manifest.schemaVersion !== 3
  || manifest.coordinateSpace !== "normalized-world-top-left"
  || manifest.territoryId !== "ninjaone"
  || manifest.minimumTier
    !== PROJECT_TOWN_INFRASTRUCTURE_POLICY.minimumTier
  || manifest.siteMinimumTier !== PROJECT_TOWN_SITE_POLICY.minimumTier
) {
  throw new TypeError(
    "Project-town infrastructure violates the shared layer contract.",
  );
}

const featureIds = new Set<string>();
const townIds = new Set<string>();
const projectIds = new Set<string>();
const AUTHORED_FOUNDATION_PROJECT_IDS = new Set(["project-kaizen-agent"]);
const ninjaOneProjects = PROJECT_STRUCTURES.filter(
  ({ territory }) => territory.id === manifest.territoryId,
);

export const PROJECT_TOWN_INFRASTRUCTURE:
readonly ProjectTownInfrastructure[] = Object.freeze(
  manifest.towns.map((town) => {
    requireUniqueId(town.id, "Project town", townIds);
    const project = ninjaOneProjects.find(({ id }) => id === town.projectId);
    if (
      !project
      || projectIds.has(project.id)
      || !includes(PROJECT_TOWN_TERRAIN_PROFILES, town.terrainProfile)
    ) {
      throw new TypeError(`${town.id} has an invalid project or profile.`);
    }
    projectIds.add(project.id);

    const skills = SKILL_STRUCTURE_INSTANCES.filter((instance) => (
      instance.ownerKind === "project"
      && instance.ownerId === project.id
    ));
    const supports = SUPPORT_STRUCTURE_INSTANCES.filter((instance) => (
      instance.ownerKind === "project"
      && instance.ownerId === project.id
    ));
    const authoredFoundation = AUTHORED_FOUNDATION_PROJECT_IDS.has(project.id);
    const mountedStructureIds = new Set([
      project.id,
      ...skills.map(({ id }) => id),
      ...supports.map(({ id }) => id),
    ]);
    const plateOwnedStructureIds = authoredFoundation
      ? [...new Set(
        town.townPlan.blocks
          .flatMap(({ structureIds }) => structureIds)
          .filter((id) => !mountedStructureIds.has(id)),
      )]
      : [];
    if (
      skills.length === 0
      || (authoredFoundation
        ? supports.length > 0 || plateOwnedStructureIds.length === 0
        : supports.length === 0)
    ) {
      throw new TypeError(
        authoredFoundation
          ? `${town.id} requires plate-owned support semantics and no legacy support sprites.`
          : `${town.id} requires owned skill and support structures.`,
      );
    }

    return Object.freeze({
      id: town.id,
      project,
      terrainProfile: town.terrainProfile,
      plateOwnedStructureIds: Object.freeze(plateOwnedStructureIds),
      townPlan: parseTownPlan(
        town.townPlan,
        town.id,
        [
          project.id,
          ...skills.map(({ id }) => id),
          ...supports.map(({ id }) => id),
          ...plateOwnedStructureIds,
        ],
        featureIds,
      ),
      palette: palette(town.palette, town.id),
    });
  }),
);

if (
  projectIds.size !== ninjaOneProjects.length
  || ninjaOneProjects.some(({ id }) => !projectIds.has(id))
) {
  throw new TypeError(
    "Project-town infrastructure must cover every NinjaOne project once.",
  );
}
