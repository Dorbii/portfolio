import manifest from "@/public/career-world/layers/structures/manifests/town-fabric-r1.json";
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

export const TOWN_FABRIC_OWNER_KINDS = [
  "capital",
  "project",
] as const;

export type TownFabricOwnerKind =
  typeof TOWN_FABRIC_OWNER_KINDS[number];

export interface TownFabricBounds {
  readonly origin: Pair;
  readonly span: Pair;
}

export interface TownFabricInstance {
  readonly id: string;
  readonly ownerKind: TownFabricOwnerKind;
  readonly ownerId: string;
  readonly project: ProjectStructure | null;
  readonly capital: CapitalStructure | null;
  readonly assetPath: string;
  readonly sourceDimensions: Pair;
  readonly worldBounds: TownFabricBounds;
  readonly blockIds: readonly string[];
}

interface RawTownFabricInstance {
  readonly id: string;
  readonly ownerKind: string;
  readonly ownerId: string;
  readonly assetPath: string;
  readonly sourceDimensions: number[];
  readonly worldBounds: {
    readonly origin: number[];
    readonly span: number[];
  };
  readonly blockIds: string[];
}

export const TOWN_FABRIC_NODE_POLICY: DetailNodePolicy = Object.freeze({
  minimumTier: "capital",
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

if (
  manifest.coordinateSpace !== "normalized-world-top-left"
  || manifest.territoryId !== "ninjaone"
  || manifest.minimumTier !== TOWN_FABRIC_NODE_POLICY.minimumTier
) {
  throw new TypeError("Town fabric violates the shared layer contract.");
}

const expectedOwnerIds = new Set([
  ...PROJECT_STRUCTURES
    .filter(({ territory, id }) => (
      territory.id === manifest.territoryId
      && id !== "project-kaizen-agent"
    ))
    .map(({ id }) => id),
  ...CAPITAL_STRUCTURES
    .filter(({ territory }) => territory.id === manifest.territoryId)
    .map(({ id }) => id),
]);
const instanceIds = new Set<string>();
const assetPaths = new Set<string>();
const ownerIds = new Set<string>();

export const TOWN_FABRIC_INSTANCES:
readonly TownFabricInstance[] = Object.freeze(
  (manifest.instances as readonly RawTownFabricInstance[]).map((instance) => {
    if (
      instance.id.trim().length === 0
      || instanceIds.has(instance.id)
      || assetPaths.has(instance.assetPath)
      || ownerIds.has(instance.ownerId)
      || !includes(TOWN_FABRIC_OWNER_KINDS, instance.ownerKind)
      || !instance.assetPath.startsWith(
        "/career-world/layers/structures/textures/town-fabric/",
      )
      || instance.blockIds.length === 0
      || new Set(instance.blockIds).size !== instance.blockIds.length
    ) {
      throw new TypeError(`${instance.id} has invalid town-fabric metadata.`);
    }

    const project = instance.ownerKind === "project"
      ? PROJECT_STRUCTURES.find(({ id }) => id === instance.ownerId) ?? null
      : null;
    const capital = instance.ownerKind === "capital"
      ? CAPITAL_STRUCTURES.find(({ id }) => id === instance.ownerId) ?? null
      : null;
    if (
      (!project && !capital)
      || (project?.territory.id ?? capital?.territory.id)
        !== manifest.territoryId
    ) {
      throw new TypeError(
        `${instance.id} has an invalid town-fabric owner.`,
      );
    }

    const origin = pair(
      instance.worldBounds.origin,
      `${instance.id} world origin`,
      { normalized: true },
    );
    const span = pair(
      instance.worldBounds.span,
      `${instance.id} world span`,
      { positive: true },
    );
    if (
      origin[0] + span[0] > 1
      || origin[1] + span[1] > 1
    ) {
      throw new TypeError(`${instance.id} exceeds the world plane.`);
    }

    instanceIds.add(instance.id);
    assetPaths.add(instance.assetPath);
    ownerIds.add(instance.ownerId);

    return Object.freeze({
      id: instance.id,
      ownerKind: instance.ownerKind,
      ownerId: instance.ownerId,
      project,
      capital,
      assetPath: instance.assetPath,
      sourceDimensions: pair(
        instance.sourceDimensions,
        `${instance.id} source dimensions`,
        { positive: true },
      ),
      worldBounds: Object.freeze({ origin, span }),
      blockIds: Object.freeze([...instance.blockIds]),
    });
  }),
);

if (
  ownerIds.size !== expectedOwnerIds.size
  || [...expectedOwnerIds].some((ownerId) => !ownerIds.has(ownerId))
) {
  throw new TypeError(
    "Town fabric requires exactly one instance per NinjaOne town owner.",
  );
}
