import manifest from "@/public/career-world/layers/structures/manifests/capital-structures-r1.json";
import { TERRITORIES } from "../../territory-landform";
import type { Territory } from "../../territory-landform/model/territories";
import type { Pair } from "../../../shared/camera";
import type { DetailNodePolicy } from "../../../shared/lod";

export const CAPITAL_ARCHETYPES = [
  "command-citadel",
  "ridge-forum",
  "maker-court",
  "column-archive",
  "hardware-guildhall",
] as const;

export type CapitalArchetype = typeof CAPITAL_ARCHETYPES[number];

export interface CapitalStructure {
  readonly id: string;
  readonly territory: Territory;
  readonly archetype: CapitalArchetype;
  readonly assetPath: string;
  readonly groundAnchor: Pair;
  readonly footprintSpan: Pair;
}

export const CAPITAL_NODE_POLICY: DetailNodePolicy = Object.freeze({
  minimumTier: "territory",
});

function pair(values: number[], label: string): Pair {
  if (
    values.length !== 2
    || values.some((value) => !Number.isFinite(value) || value <= 0)
  ) {
    throw new TypeError(`${label} must contain two positive finite numbers.`);
  }
  return Object.freeze([values[0], values[1]] as [number, number]);
}

function normalizedPair(values: number[], label: string): Pair {
  if (
    values.length !== 2
    || values.some((value) => (
      !Number.isFinite(value)
      || value < 0
      || value > 1
    ))
  ) {
    throw new TypeError(`${label} must contain two normalized numbers.`);
  }
  return Object.freeze([values[0], values[1]] as [number, number]);
}

function includes<const Value extends string>(
  values: readonly Value[],
  candidate: string,
): candidate is Value {
  return values.includes(candidate as Value);
}

if (manifest.minimumTier !== CAPITAL_NODE_POLICY.minimumTier) {
  throw new TypeError("Capital manifest must use the shared territory tier.");
}

export const CAPITAL_STRUCTURES: readonly CapitalStructure[] = Object.freeze(
  manifest.nodes.map((node) => {
    const territory = TERRITORIES.find(({ id }) => id === node.territoryId);
    if (!territory) {
      throw new TypeError(
        `Capital ${node.id} references unknown territory ${node.territoryId}.`,
      );
    }
    if (!includes(CAPITAL_ARCHETYPES, node.archetype)) {
      throw new TypeError(`Capital ${node.id} has an unknown archetype.`);
    }
    if (
      typeof node.assetPath !== "string"
      || !node.assetPath.startsWith("/career-world/layers/structures/")
    ) {
      throw new TypeError(`Capital ${node.id} has an invalid asset path.`);
    }
    return Object.freeze({
      ...node,
      territory,
      archetype: node.archetype,
      groundAnchor: normalizedPair(
        node.groundAnchor,
        `${node.id} ground anchor`,
      ),
      footprintSpan: pair(node.footprintSpan, `${node.id} footprint`),
    });
  }),
);
