import manifest from "@/public/career-world/layers/structures/manifests/ambient-structures-r1.json";
import type { Pair } from "../../../shared/camera";
import type { DetailNodePolicy } from "../../../shared/lod";
import {
  CAPITAL_STRUCTURES,
  type CapitalStructure,
} from "./capitals";
import {
  PROJECT_STRUCTURES,
  type ProjectStructure,
} from "./projects";

export const AMBIENT_STRUCTURE_OWNER_KINDS = [
  "capital",
  "project",
] as const;

export type AmbientStructureOwnerKind =
  typeof AMBIENT_STRUCTURE_OWNER_KINDS[number];

export const AMBIENT_STRUCTURE_VISUAL_FAMILY =
  "career-world-fantasy-ambient-buildings@r1";

export interface AmbientStructureArchetype {
  readonly id: string;
  readonly label: string;
  readonly assetPath: string;
  readonly sourceDimensions: Pair;
  readonly groundAnchor: Pair;
  readonly footprintSpan: Pair;
}

export interface AmbientStructureInstance {
  readonly id: string;
  readonly ownerKind: AmbientStructureOwnerKind;
  readonly ownerId: string;
  readonly project: ProjectStructure | null;
  readonly capital: CapitalStructure | null;
  readonly blockId: string;
  readonly archetype: AmbientStructureArchetype;
  readonly territoryAnchor: Pair;
}

export const AMBIENT_NODE_POLICY: DetailNodePolicy = Object.freeze({
  minimumTier: "site",
});

function pair(
  values: number[],
  label: string,
  {
    normalized = false,
    positive = false,
  } = {},
): Pair {
  if (
    values.length !== 2
    || values.some((value) => (
      !Number.isFinite(value)
      || value < 0
      || (normalized && value > 1)
      || (positive && value === 0)
    ))
  ) {
    throw new TypeError(`${label} must contain two valid numbers.`);
  }
  return Object.freeze([values[0], values[1]] as [number, number]);
}

function includes<const Value extends string>(
  values: readonly Value[],
  candidate: string,
): candidate is Value {
  return values.includes(candidate as Value);
}

function requireUniqueId(
  id: string,
  label: string,
  seenIds: Set<string>,
): void {
  if (id.trim().length === 0 || seenIds.has(id)) {
    throw new TypeError(`${label} must have a unique, non-empty ID.`);
  }
  seenIds.add(id);
}

if (
  manifest.coordinateSpace !== "normalized-world-top-left"
  || manifest.territoryId !== "ninjaone"
  || manifest.minimumTier !== AMBIENT_NODE_POLICY.minimumTier
  || manifest.visualFamily !== AMBIENT_STRUCTURE_VISUAL_FAMILY
) {
  throw new TypeError("Ambient structures violate the shared layer contract.");
}

const archetypeIds = new Set<string>();

export const AMBIENT_STRUCTURE_ARCHETYPES:
readonly AmbientStructureArchetype[] = Object.freeze(
  manifest.archetypes.map((archetype) => {
    requireUniqueId(
      archetype.id,
      "Ambient archetype",
      archetypeIds,
    );
    if (
      !archetype.assetPath.startsWith(
        "/career-world/layers/structures/textures/ambient/",
      )
    ) {
      throw new TypeError(
        `${archetype.id} has invalid ambient metadata.`,
      );
    }
    return Object.freeze({
      ...archetype,
      sourceDimensions: pair(
        archetype.sourceDimensions,
        `${archetype.id} source dimensions`,
        { positive: true },
      ),
      groundAnchor: pair(
        archetype.groundAnchor,
        `${archetype.id} ground anchor`,
        { normalized: true },
      ),
      footprintSpan: pair(
        archetype.footprintSpan,
        `${archetype.id} footprint`,
        { positive: true },
      ),
    });
  }),
);

const instanceIds = new Set<string>();

export const AMBIENT_STRUCTURE_INSTANCES:
readonly AmbientStructureInstance[] = Object.freeze(
  manifest.instances.map((instance) => {
    requireUniqueId(
      instance.id,
      "Ambient instance",
      instanceIds,
    );
    if (
      !includes(AMBIENT_STRUCTURE_OWNER_KINDS, instance.ownerKind)
      || instance.blockId.trim().length === 0
      || [
        "evidenceId",
        "navigationTarget",
        "projectId",
        "skillId",
      ].some((field) => field in instance)
    ) {
      throw new TypeError(
        `Ambient instance ${instance.id} has invalid decorative metadata.`,
      );
    }

    const project = instance.ownerKind === "project"
      ? PROJECT_STRUCTURES.find(({ id }) => id === instance.ownerId) ?? null
      : null;
    const capital = instance.ownerKind === "capital"
      ? CAPITAL_STRUCTURES.find(({ id }) => id === instance.ownerId) ?? null
      : null;
    const archetype = AMBIENT_STRUCTURE_ARCHETYPES.find(
      ({ id }) => id === instance.archetypeId,
    );
    if (
      (!project && !capital)
      || !archetype
      || (project?.territory.id ?? capital?.territory.id)
        !== manifest.territoryId
    ) {
      throw new TypeError(
        `Ambient instance ${instance.id} has an invalid parent reference.`,
      );
    }

    const territoryAnchor = pair(
      instance.territoryAnchor,
      `${instance.id} territory anchor`,
      { normalized: true },
    );
    if (
      territoryAnchor[0]
        - archetype.footprintSpan[0] * archetype.groundAnchor[0] < 0
      || territoryAnchor[1]
        - archetype.footprintSpan[1] * archetype.groundAnchor[1] < 0
      || territoryAnchor[0]
        + archetype.footprintSpan[0] * (1 - archetype.groundAnchor[0]) > 1
      || territoryAnchor[1]
        + archetype.footprintSpan[1] * (1 - archetype.groundAnchor[1]) > 1
    ) {
      throw new TypeError(
        `Ambient instance ${instance.id} exceeds the world plane.`,
      );
    }

    return Object.freeze({
      id: instance.id,
      ownerKind: instance.ownerKind,
      ownerId: instance.ownerId,
      project,
      capital,
      blockId: instance.blockId,
      archetype,
      territoryAnchor,
    });
  }),
);

export function resolveAmbientAnchor(
  instance: AmbientStructureInstance,
): Pair {
  return instance.territoryAnchor;
}
