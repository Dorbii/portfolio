import manifest from "@/public/career-world/layers/environment/manifests/ninjaone-rural-outskirts-r1.json";
import allocationsManifest from "@/public/career-world/layers/structures/manifests/ninjaone-city-allocations-r1.json";
import townFabricManifest from "@/public/career-world/layers/structures/manifests/town-fabric-r1.json";
import type { Pair } from "../../../shared/camera";
import type { DetailNodePolicy } from "../../../shared/lod";

export const RURAL_SCENERY_KINDS = [
  "field-furrows",
  "hedgerow",
  "stone-wall",
  "grove",
  "clearing",
  "lookout",
  "camp",
] as const;

export type RuralSceneryKind = typeof RURAL_SCENERY_KINDS[number];

export interface RuralSceneryInstance {
  readonly id: string;
  readonly kind: RuralSceneryKind;
  readonly anchor: Pair;
  readonly footprintSpan: Pair;
  readonly headingDegrees: number;
  readonly scale: number;
}

export interface EmptyEasterEggSlot {
  readonly id: string;
  readonly anchor: Pair;
  readonly footprintSpan: Pair;
  readonly headingDegrees: number;
  readonly content: null;
}

export const RURAL_OUTSKIRTS_CLOSE_POLICY: DetailNodePolicy =
  Object.freeze({
    minimumTier: "close",
  });

interface Bounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

const MIN_FOOTPRINT_SPAN = 0.003;
const MAX_FOOTPRINT_SPAN = 0.03;
const MIN_SCENERY_SCALE = 0.65;
const MAX_SCENERY_SCALE = 1.4;

function includes<const Value extends string>(
  values: readonly Value[],
  candidate: string,
): candidate is Value {
  return values.includes(candidate as Value);
}

function uniqueId(id: string, seenIds: Set<string>): string {
  if (id.trim().length === 0 || seenIds.has(id)) {
    throw new TypeError(
      "Rural-outskirts IDs must be unique and non-empty.",
    );
  }
  seenIds.add(id);
  return id;
}

function normalizedPoint(
  values: readonly number[],
  label: string,
): Pair {
  if (
    values.length !== 2
    || values.some((value) => (
      !Number.isFinite(value)
      || value < 0
      || value > 1
    ))
  ) {
    throw new RangeError(
      `${label} must be a normalized world-space point.`,
    );
  }
  return Object.freeze([values[0], values[1]] as [number, number]);
}

function footprintSpan(
  values: readonly number[],
  label: string,
): Pair {
  if (
    values.length !== 2
    || values.some((value) => (
      !Number.isFinite(value)
      || value < MIN_FOOTPRINT_SPAN
      || value > MAX_FOOTPRINT_SPAN
    ))
  ) {
    throw new RangeError(
      `${label} must be a bounded normalized world-space span.`,
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

function sceneryScale(value: number, label: string): number {
  if (
    !Number.isFinite(value)
    || value < MIN_SCENERY_SCALE
    || value > MAX_SCENERY_SCALE
  ) {
    throw new RangeError(
      `${label} must remain within the rural-scenery scale range.`,
    );
  }
  return value;
}

function boundsFor(anchor: Pair, span: Pair): Bounds {
  return Object.freeze({
    left: anchor[0] - span[0] / 2,
    top: anchor[1] - span[1] / 2,
    right: anchor[0] + span[0] / 2,
    bottom: anchor[1] + span[1] / 2,
  });
}

function boundsFromOrigin(
  origin: readonly number[],
  span: readonly number[],
): Bounds {
  return Object.freeze({
    left: origin[0],
    top: origin[1],
    right: origin[0] + span[0],
    bottom: origin[1] + span[1],
  });
}

function containsBounds(outer: Bounds, inner: Bounds): boolean {
  return (
    inner.left >= outer.left
    && inner.top >= outer.top
    && inner.right <= outer.right
    && inner.bottom <= outer.bottom
  );
}

function intersects(left: Bounds, right: Bounds): boolean {
  return (
    left.left < right.right
    && left.right > right.left
    && left.top < right.bottom
    && left.bottom > right.top
  );
}

const allocationBounds = allocationsManifest.allocations.map(
  ({ bounds }) => boundsFromOrigin(bounds.origin, bounds.span),
);
const townFabricBounds = (townFabricManifest.instances as readonly {
  readonly worldBounds: {
    readonly origin: number[];
    readonly span: number[];
  };
}[]).map(
  ({ worldBounds }) => (
    boundsFromOrigin(worldBounds.origin, worldBounds.span)
  ),
);

function validateRuralFootprint(
  id: string,
  anchor: Pair,
  span: Pair,
): void {
  const bounds = boundsFor(anchor, span);
  if (!allocationBounds.some((allocation) => (
    containsBounds(allocation, bounds)
  ))) {
    throw new RangeError(
      `${id} must remain inside an accepted NinjaOne allocation.`,
    );
  }
  if (townFabricBounds.some((town) => intersects(town, bounds))) {
    throw new RangeError(
      `${id} must remain outside current town-fabric bounds.`,
    );
  }
}

if (
  manifest.schemaVersion !== 1
  || manifest.coordinateSpace !== "normalized-world-top-left"
  || manifest.territoryId !== "ninjaone"
  || manifest.minimumTier !== RURAL_OUTSKIRTS_CLOSE_POLICY.minimumTier
  || allocationsManifest.territoryId !== manifest.territoryId
  || townFabricManifest.territoryId !== manifest.territoryId
) {
  throw new TypeError(
    "Rural-outskirts manifest violates the environment layer contract.",
  );
}

const instanceIds = new Set<string>();

export const RURAL_SCENERY_INSTANCES:
readonly RuralSceneryInstance[] = Object.freeze(
  manifest.scenery.map((config) => {
    if (!includes(RURAL_SCENERY_KINDS, config.kind)) {
      throw new TypeError(
        `${config.id} has an invalid rural-scenery kind.`,
      );
    }
    const anchor = normalizedPoint(
      config.anchor,
      `${config.id} anchor`,
    );
    const span = footprintSpan(
      config.footprintSpan,
      `${config.id} footprint`,
    );
    validateRuralFootprint(config.id, anchor, span);
    return Object.freeze({
      id: uniqueId(config.id, instanceIds),
      kind: config.kind,
      anchor,
      footprintSpan: span,
      headingDegrees: heading(
        config.headingDegrees,
        `${config.id} heading`,
      ),
      scale: sceneryScale(config.scale, `${config.id} scale`),
    });
  }),
);

export const EMPTY_EASTER_EGG_SLOTS:
readonly EmptyEasterEggSlot[] = Object.freeze(
  manifest.easterEggSlots.map((config) => {
    if (config.content !== null) {
      throw new TypeError(
        `${config.id} must remain empty until content is authored.`,
      );
    }
    const anchor = normalizedPoint(
      config.anchor,
      `${config.id} anchor`,
    );
    const span = footprintSpan(
      config.footprintSpan,
      `${config.id} footprint`,
    );
    validateRuralFootprint(config.id, anchor, span);
    return Object.freeze({
      id: uniqueId(config.id, instanceIds),
      anchor,
      footprintSpan: span,
      headingDegrees: heading(
        config.headingDegrees,
        `${config.id} heading`,
      ),
      content: null,
    });
  }),
);
