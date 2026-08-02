import manifest from "@/public/career-world/layers/environment/manifests/ninjaone-town-activity-r1.json";
import type { Pair } from "../../../shared/camera";
import type { DetailNodePolicy } from "../../../shared/lod";
import {
  CAPITAL_CAMPUS_INFRASTRUCTURE,
  PROJECT_TOWN_INFRASTRUCTURE,
  type TownPlan,
} from "../../infrastructure/model/projectTowns";

export const ACTIVITY_PROP_KINDS = [
  "lamp",
  "stall",
  "cart",
  "bench",
  "street-tree",
] as const;

export type ActivityPropKind = typeof ACTIVITY_PROP_KINDS[number];

export const ACTIVITY_PROP_OWNER_KINDS = [
  "project",
  "capital",
] as const;

export type ActivityPropOwnerKind =
  typeof ACTIVITY_PROP_OWNER_KINDS[number];

export interface ActivityPropInstance {
  readonly id: string;
  readonly kind: ActivityPropKind;
  readonly ownerKind: ActivityPropOwnerKind;
  readonly ownerId: string;
  readonly entranceStructureId: string;
  readonly offset: Pair;
  readonly headingDegrees: number;
  readonly anchor: Pair;
}

export const ACTIVITY_PROP_SITE_POLICY: DetailNodePolicy = Object.freeze({
  minimumTier: "site",
});

const MAX_NORMALIZED_OFFSET = 0.01;
const PROJECT_PROP_COUNT_RANGE = Object.freeze([4, 6] as const);
const KAIZEN_AGENT_PROP_COUNT_RANGE = Object.freeze([15, 20] as const);
const CAPITAL_PROP_COUNT_RANGE = Object.freeze([8, 12] as const);
const KAIZEN_AGENT_OWNER_ID = "project-kaizen-agent";
const CAPITAL_REQUIRED_PROP_KINDS = Object.freeze([
  "lamp",
  "stall",
  "cart",
  "bench",
] satisfies readonly ActivityPropKind[]);

function includes<const Value extends string>(
  values: readonly Value[],
  candidate: string,
): candidate is Value {
  return values.includes(candidate as Value);
}

function uniqueId(
  id: string,
  seenIds: Set<string>,
): string {
  if (id.trim().length === 0 || seenIds.has(id)) {
    throw new TypeError(
      "Town-activity prop IDs must be unique and non-empty.",
    );
  }
  seenIds.add(id);
  return id;
}

function normalizedOffset(
  values: readonly number[],
  label: string,
): Pair {
  if (
    values.length !== 2
    || values.some((value) => (
      !Number.isFinite(value)
      || Math.abs(value) > MAX_NORMALIZED_OFFSET
    ))
  ) {
    throw new TypeError(
      `${label} must be a bounded normalized world-space offset.`,
    );
  }
  return Object.freeze([values[0], values[1]] as [number, number]);
}

function heading(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0 || value >= 360) {
    throw new RangeError(`${label} must be in the range [0, 360).`);
  }
  return value;
}

function resolvedAnchor(
  entrance: Pair,
  offset: Pair,
  label: string,
): Pair {
  const anchor = [
    entrance[0] + offset[0],
    entrance[1] + offset[1],
  ] as [number, number];
  if (anchor.some((value) => value < 0 || value > 1)) {
    throw new RangeError(
      `${label} resolves outside normalized world space.`,
    );
  }
  return Object.freeze(anchor);
}

function townPlanForOwner(
  ownerKind: ActivityPropOwnerKind,
  ownerId: string,
): TownPlan | undefined {
  if (ownerKind === "capital") {
    return CAPITAL_CAMPUS_INFRASTRUCTURE.capital.id === ownerId
      ? CAPITAL_CAMPUS_INFRASTRUCTURE.townPlan
      : undefined;
  }
  return PROJECT_TOWN_INFRASTRUCTURE.find(
    ({ project }) => project.id === ownerId,
  )?.townPlan;
}

function countInRange(
  value: number,
  [minimum, maximum]: readonly [number, number],
): boolean {
  return value >= minimum && value <= maximum;
}

if (
  manifest.schemaVersion !== 1
  || manifest.coordinateSpace !== "normalized-world-top-left"
  || manifest.territoryId !== "ninjaone"
  || manifest.minimumTier !== ACTIVITY_PROP_SITE_POLICY.minimumTier
) {
  throw new TypeError(
    "Town-activity manifest violates the environment layer contract.",
  );
}

const instanceIds = new Set<string>();
const ownerCounts = new Map<string, number>();
const ownerKinds = new Map<string, Set<ActivityPropKind>>();

export const ACTIVITY_PROP_INSTANCES:
readonly ActivityPropInstance[] = Object.freeze(
  manifest.instances.map((config) => {
    if (
      !includes(ACTIVITY_PROP_KINDS, config.kind)
      || !includes(ACTIVITY_PROP_OWNER_KINDS, config.ownerKind)
    ) {
      throw new TypeError(
        `${config.id} has invalid town-activity metadata.`,
      );
    }

    const plan = townPlanForOwner(config.ownerKind, config.ownerId);
    const entrance = plan?.entrances.find(
      ({ structureId }) => structureId === config.entranceStructureId,
    );
    if (!plan || !entrance) {
      throw new TypeError(
        `${config.id} must reference an entrance owned by its town plan.`,
      );
    }

    const offset = normalizedOffset(
      config.offset,
      `${config.id} offset`,
    );
    const ownerKey = `${config.ownerKind}:${config.ownerId}`;
    ownerCounts.set(ownerKey, (ownerCounts.get(ownerKey) ?? 0) + 1);
    const kinds = ownerKinds.get(ownerKey) ?? new Set<ActivityPropKind>();
    kinds.add(config.kind);
    ownerKinds.set(ownerKey, kinds);

    return Object.freeze({
      id: uniqueId(config.id, instanceIds),
      kind: config.kind,
      ownerKind: config.ownerKind,
      ownerId: config.ownerId,
      entranceStructureId: config.entranceStructureId,
      offset,
      headingDegrees: heading(
        config.headingDegrees,
        `${config.id} heading`,
      ),
      anchor: resolvedAnchor(
        entrance.point,
        offset,
        `${config.id} anchor`,
      ),
    });
  }),
);

for (const { project } of PROJECT_TOWN_INFRASTRUCTURE) {
  const ownerKey = `project:${project.id}`;
  const countRange = project.id === KAIZEN_AGENT_OWNER_ID
    ? KAIZEN_AGENT_PROP_COUNT_RANGE
    : PROJECT_PROP_COUNT_RANGE;
  if (
    !countInRange(
      ownerCounts.get(ownerKey) ?? 0,
      countRange,
    )
    || (ownerKinds.get(ownerKey)?.size ?? 0) < 3
  ) {
    throw new TypeError(
      `${project.id} violates its differentiated activity-prop budget.`,
    );
  }
}

const capitalOwnerKey =
  `capital:${CAPITAL_CAMPUS_INFRASTRUCTURE.capital.id}`;
if (
  !countInRange(
    ownerCounts.get(capitalOwnerKey) ?? 0,
    CAPITAL_PROP_COUNT_RANGE,
  )
  || !CAPITAL_REQUIRED_PROP_KINDS.every(
    (kind) => ownerKinds.get(capitalOwnerKey)?.has(kind),
  )
) {
  throw new TypeError(
    "The NinjaOne capital requires eight to twelve differentiated props.",
  );
}

if (
  ownerCounts.size !== PROJECT_TOWN_INFRASTRUCTURE.length + 1
  || ACTIVITY_PROP_INSTANCES.length
    !== [...ownerCounts.values()].reduce((sum, count) => sum + count, 0)
) {
  throw new TypeError(
    "Town-activity props must belong only to authored NinjaOne towns.",
  );
}
