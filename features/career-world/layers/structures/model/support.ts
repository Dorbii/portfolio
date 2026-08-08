import manifest from "@/public/career-world/layers/structures/manifests/support-structures-r1.json";
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

export const SUPPORT_STRUCTURE_ROLES = [
  "housing",
  "workshop",
  "depot",
] as const;

export type SupportStructureRole = typeof SUPPORT_STRUCTURE_ROLES[number];

export const SUPPORT_STRUCTURE_OWNER_KINDS = [
  "capital",
  "project",
] as const;

export type SupportStructureOwnerKind =
  typeof SUPPORT_STRUCTURE_OWNER_KINDS[number];

export const SUPPORT_STRUCTURE_VISUAL_FAMILY =
  "career-world-fantasy-support-buildings@r2";

export interface SupportStructureArchetype {
  readonly id: string;
  readonly label: string;
  readonly role: SupportStructureRole;
  readonly assetPath: string;
  readonly sourceDimensions: Pair;
  readonly groundAnchor: Pair;
  readonly footprintSpan: Pair;
}

export interface SupportStructureInstance {
  readonly id: string;
  readonly ownerKind: SupportStructureOwnerKind;
  readonly ownerId: string;
  readonly project: ProjectStructure | null;
  readonly capital: CapitalStructure | null;
  readonly archetype: SupportStructureArchetype;
  readonly territoryAnchor: Pair;
}

interface RawSupportStructureArchetype {
  readonly id: string;
  readonly label: string;
  readonly role: string;
  readonly assetPath: string;
  readonly sourceDimensions: number[];
  readonly groundAnchor: number[];
  readonly footprintSpan: number[];
}

interface RawSupportStructureInstance {
  readonly id: string;
  readonly ownerKind: string;
  readonly ownerId: string;
  readonly archetypeId: string;
  readonly territoryAnchor: number[];
}

export const SUPPORT_NODE_POLICY: DetailNodePolicy = Object.freeze({
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
  || manifest.minimumTier !== SUPPORT_NODE_POLICY.minimumTier
  || manifest.visualFamily !== SUPPORT_STRUCTURE_VISUAL_FAMILY
) {
  throw new TypeError("Support structures violate the shared layer contract.");
}

const archetypeIds = new Set<string>();

export const SUPPORT_STRUCTURE_ARCHETYPES:
readonly SupportStructureArchetype[] = Object.freeze(
  (manifest.archetypes as readonly RawSupportStructureArchetype[]).map(
    (archetype) => {
    requireUniqueId(
      archetype.id,
      "Support archetype",
      archetypeIds,
    );
    if (
      !includes(SUPPORT_STRUCTURE_ROLES, archetype.role)
      || !archetype.assetPath.startsWith(
        "/career-world/layers/structures/textures/support/",
      )
    ) {
      throw new TypeError(`${archetype.id} has invalid support metadata.`);
    }
    return Object.freeze({
      ...archetype,
      role: archetype.role,
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
    },
  ),
);

const instanceIds = new Set<string>();

export const SUPPORT_STRUCTURE_INSTANCES:
readonly SupportStructureInstance[] = Object.freeze(
  (manifest.instances as readonly RawSupportStructureInstance[]).map(
    (instance) => {
    requireUniqueId(
      instance.id,
      "Support instance",
      instanceIds,
    );
    if (
      !includes(SUPPORT_STRUCTURE_OWNER_KINDS, instance.ownerKind)
    ) {
      throw new TypeError(
        `Support instance ${instance.id} has an invalid owner kind.`,
      );
    }

    const project = instance.ownerKind === "project"
      ? PROJECT_STRUCTURES.find(({ id }) => id === instance.ownerId) ?? null
      : null;
    const capital = instance.ownerKind === "capital"
      ? CAPITAL_STRUCTURES.find(({ id }) => id === instance.ownerId) ?? null
      : null;
    const archetype = SUPPORT_STRUCTURE_ARCHETYPES.find(
      ({ id }) => id === instance.archetypeId,
    );

    if (
      (!project && !capital)
      || !archetype
      || (project?.territory.id ?? capital?.territory.id)
        !== manifest.territoryId
    ) {
      throw new TypeError(
        `Support instance ${instance.id} has an invalid parent reference.`,
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
        `Support instance ${instance.id} exceeds the world plane.`,
      );
    }

    return Object.freeze({
      id: instance.id,
      ownerKind: instance.ownerKind,
      ownerId: instance.ownerId,
      project,
      capital,
      archetype,
      territoryAnchor,
    });
    },
  ),
);

export function resolveSupportAnchor(
  instance: SupportStructureInstance,
): Pair {
  return instance.territoryAnchor;
}
