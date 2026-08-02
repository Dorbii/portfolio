import manifest from "@/public/career-world/layers/structures/manifests/skill-structures-r1.json";
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

export const SKILL_BUILDING_TYPES = [
  "guarded-vault",
  "contract-archive",
  "gateway-port",
  "gear-tower",
  "command-lodge",
  "cloud-depot",
  "twin-coil-laboratory",
  "lakehouse-forge",
] as const;

export type SkillBuildingType = typeof SKILL_BUILDING_TYPES[number];

export const SKILL_STRUCTURE_OWNER_KINDS = [
  "capital",
  "project",
] as const;

export type SkillStructureOwnerKind =
  typeof SKILL_STRUCTURE_OWNER_KINDS[number];

export const SKILL_STRUCTURE_VISUAL_FAMILY =
  "career-world-universal-skill-buildings@r2";

export const SKILL_STRUCTURE_VARIANT_POLICY =
  manifest.variantPolicy;

export interface SkillStructureArchetype {
  readonly id: string;
  readonly label: string;
  readonly buildingType: SkillBuildingType;
  readonly assetPath: string;
  readonly sourceDimensions: Pair;
  readonly groundAnchor: Pair;
  readonly footprintSpan: Pair;
}

export interface SkillStructureInstance {
  readonly id: string;
  readonly ownerKind: SkillStructureOwnerKind;
  readonly ownerId: string;
  readonly project: ProjectStructure | null;
  readonly capital: CapitalStructure | null;
  readonly archetype: SkillStructureArchetype;
  readonly territoryVariant: string;
  readonly territoryAnchor: Pair;
}

export const SKILL_NODE_POLICY: DetailNodePolicy = Object.freeze({
  minimumTier: "site",
});

function pair(
  values: number[],
  label: string,
  {
    allowNegative = false,
    normalized = false,
  } = {},
): Pair {
  if (
    values.length !== 2
    || values.some((value) => (
      !Number.isFinite(value)
      || (!allowNegative && value < 0)
      || (normalized && value > 1)
    ))
    || (
      !allowNegative
      && !normalized
      && values.some((value) => value === 0)
    )
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

if (
  manifest.definitionScope !== "universal"
  || manifest.minimumTier !== SKILL_NODE_POLICY.minimumTier
  || manifest.visualFamily !== SKILL_STRUCTURE_VISUAL_FAMILY
  || manifest.variantPolicy.trim().length === 0
) {
  throw new TypeError("Skill manifest violates the shared skill contract.");
}

export const SKILL_STRUCTURE_ARCHETYPES: readonly SkillStructureArchetype[] =
  Object.freeze(manifest.archetypes.map((archetype) => {
    if (!includes(SKILL_BUILDING_TYPES, archetype.buildingType)) {
      throw new TypeError(
        `Skill ${archetype.id} has an unknown building type.`,
      );
    }
    if (
      !archetype.assetPath.startsWith(
        "/career-world/layers/structures/textures/skills/",
      )
    ) {
      throw new TypeError(
        `Skill ${archetype.id} has an invalid asset path.`,
      );
    }
    return Object.freeze({
      ...archetype,
      buildingType: archetype.buildingType,
      sourceDimensions: pair(
        archetype.sourceDimensions,
        `${archetype.id} source dimensions`,
      ),
      groundAnchor: pair(
        archetype.groundAnchor,
        `${archetype.id} ground anchor`,
        { normalized: true },
      ),
      footprintSpan: pair(
        archetype.footprintSpan,
        `${archetype.id} footprint`,
      ),
    });
  }));

export const SKILL_STRUCTURE_INSTANCES: readonly SkillStructureInstance[] =
  Object.freeze(manifest.instances.map((instance) => {
    if (!includes(SKILL_STRUCTURE_OWNER_KINDS, instance.ownerKind)) {
      throw new TypeError(
        `Skill instance ${instance.id} has an invalid owner kind.`,
      );
    }
    const project = instance.ownerKind === "project"
      ? PROJECT_STRUCTURES.find(({ id }) => id === instance.ownerId) ?? null
      : null;
    const capital = instance.ownerKind === "capital"
      ? CAPITAL_STRUCTURES.find(({ id }) => id === instance.ownerId) ?? null
      : null;
    const archetype = SKILL_STRUCTURE_ARCHETYPES.find(
      ({ id }) => id === instance.archetypeId,
    );
    if ((!project && !capital) || !archetype) {
      throw new TypeError(
        `Skill instance ${instance.id} has an invalid parent reference.`,
      );
    }
    if (
      (
        project
        && !project.supportedSkillArchetypeIds.includes(archetype.id)
      )
      || (
        project
        && instance.territoryVariant !== project.territory.id
      )
      || (
        capital
        && instance.territoryVariant !== capital.territory.id
      )
    ) {
      throw new TypeError(
        `Skill instance ${instance.id} violates its owner contract.`,
      );
    }
    return Object.freeze({
      id: instance.id,
      ownerKind: instance.ownerKind,
      ownerId: instance.ownerId,
      project,
      capital,
      archetype,
      territoryVariant: instance.territoryVariant,
      territoryAnchor: pair(
        instance.territoryAnchor,
        `${instance.id} territory anchor`,
        { normalized: true },
      ),
    });
  }));

export function resolveSkillAnchor(
  instance: SkillStructureInstance,
): Pair {
  return instance.territoryAnchor;
}
