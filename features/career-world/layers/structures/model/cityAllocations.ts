import manifest from "@/public/career-world/layers/structures/manifests/ninjaone-city-allocations-r1.json";
import type { CameraView, Pair } from "../../../shared/camera";
import { CAPITAL_STRUCTURES } from "./capitals";
import { PROJECT_STRUCTURES } from "./projects";

export const CITY_ALLOCATION_OWNER_KINDS = [
  "capital",
  "project",
] as const;

export type CityAllocationOwnerKind =
  typeof CITY_ALLOCATION_OWNER_KINDS[number];

export interface CityAllocation {
  readonly id: string;
  readonly label: string;
  readonly ownerKind: CityAllocationOwnerKind;
  readonly ownerId: string;
  readonly bounds: CameraView;
  readonly color: string;
}

function includes<const Value extends string>(
  values: readonly Value[],
  candidate: string,
): candidate is Value {
  return values.includes(candidate as Value);
}

function normalizedPair(
  values: number[],
  label: string,
  allowZero = true,
): Pair {
  if (
    values.length !== 2
    || values.some((value) => (
      !Number.isFinite(value)
      || value < 0
      || value > 1
      || (!allowZero && value === 0)
    ))
  ) {
    throw new TypeError(`${label} must contain two normalized numbers.`);
  }
  return Object.freeze([values[0], values[1]] as [number, number]);
}

if (
  manifest.coordinateSpace !== "normalized-world-top-left"
  || manifest.territoryId !== "ninjaone"
  || manifest.verifiedLandCoverage < manifest.minimumVerifiedLandCoverage
  || manifest.verifiedLandCoverage > 1
) {
  throw new TypeError("NinjaOne city allocations violate the QA contract.");
}

export const NINJAONE_CITY_ALLOCATION_COVERAGE =
  manifest.verifiedLandCoverage;

export const NINJAONE_CITY_ALLOCATIONS: readonly CityAllocation[] =
  Object.freeze(manifest.allocations.map((allocation) => {
    if (
      !includes(CITY_ALLOCATION_OWNER_KINDS, allocation.ownerKind)
      || !/^#[0-9a-f]{6}$/i.test(allocation.color)
    ) {
      throw new TypeError(`${allocation.id} has invalid QA metadata.`);
    }

    const ownerExists = allocation.ownerKind === "project"
      ? PROJECT_STRUCTURES.some(({ id }) => id === allocation.ownerId)
      : CAPITAL_STRUCTURES.some(({ id }) => id === allocation.ownerId);
    if (!ownerExists) {
      throw new TypeError(`${allocation.id} references an invalid owner.`);
    }

    const origin = normalizedPair(
      allocation.bounds.origin,
      `${allocation.id} origin`,
    );
    const span = normalizedPair(
      allocation.bounds.span,
      `${allocation.id} span`,
      false,
    );
    if (origin[0] + span[0] > 1 || origin[1] + span[1] > 1) {
      throw new TypeError(`${allocation.id} exceeds the world plane.`);
    }

    return Object.freeze({
      ...allocation,
      ownerKind: allocation.ownerKind,
      bounds: Object.freeze({ origin, span }),
    });
  }));

export function cityAllocationContains(
  allocation: CityAllocation,
  point: Pair,
): boolean {
  const { origin, span } = allocation.bounds;
  return (
    point[0] >= origin[0]
    && point[0] <= origin[0] + span[0]
    && point[1] >= origin[1]
    && point[1] <= origin[1] + span[1]
  );
}
