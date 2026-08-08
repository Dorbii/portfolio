import manifest from "../../../../../public/career-world/cities/kaizen-agent/manifests/decorations-runtime-r1.json" with { type: "json" };
import type { Pair } from "../../../shared/camera";
import {
  KAIZEN_CITY_PLATE_DIMENSIONS,
  KAIZEN_CITY_REGISTRATION,
  kaizenRegistrationPointToWorld,
} from "../../../shared/kaizenCityRegistration.ts";

export type KaizenDecorationTier = "capital" | "site" | "close";

export interface KaizenDecorationResource {
  readonly atlasDimensions: Pair;
  readonly atlasPath: string;
  readonly crop: readonly [number, number, number, number];
  readonly groundAnchor: Pair;
  readonly id: string;
}

export interface KaizenDecorationInstance {
  readonly anchor: Pair;
  readonly id: string;
  readonly minimumTier: KaizenDecorationTier;
  readonly mirror: boolean;
  readonly resourceId: KaizenDecorationResource["id"];
  readonly scale: number;
}

if (
  manifest.schemaVersion !== 1
  || manifest.id !== "career-world/kaizen-agent/decorations-runtime@r1"
  || manifest.registrationRef !== KAIZEN_CITY_REGISTRATION
  || manifest.placementBasis !== "base-layout-r2-explicit-plot-anchor-plate"
) {
  throw new TypeError("Kaizen decoration runtime manifest is invalid.");
}

export const KAIZEN_DECORATION_RESOURCES:
readonly KaizenDecorationResource[] = Object.freeze(
  manifest.resources.map((resource) => Object.freeze({
    atlasDimensions: Object.freeze([
      resource.atlasDimensions[0],
      resource.atlasDimensions[1],
    ] as Pair),
    atlasPath: resource.atlasPath,
    crop: Object.freeze([
      resource.crop[0],
      resource.crop[1],
      resource.crop[2],
      resource.crop[3],
    ] as const),
    groundAnchor: Object.freeze([
      resource.groundAnchor[0],
      resource.groundAnchor[1],
    ] as Pair),
    id: resource.id,
  })),
);

const resourceIds = new Set(KAIZEN_DECORATION_RESOURCES.map(({ id }) => id));

export const KAIZEN_DECORATION_INSTANCES:
readonly KaizenDecorationInstance[] = Object.freeze(
  manifest.instances.map((instance) => {
    const tier = instance.minimumTier;
    if (
      !resourceIds.has(instance.resourceId)
      || (tier !== "capital" && tier !== "site" && tier !== "close")
      || instance.anchor.length !== 2
      || instance.anchor.some((value, axis) => (
        !Number.isFinite(value)
        || value < 0
        || value > KAIZEN_CITY_PLATE_DIMENSIONS[axis]
      ))
      || !Number.isFinite(instance.scale)
      || instance.scale <= 0
    ) {
      throw new TypeError(`Invalid Kaizen decoration instance ${instance.id}.`);
    }
    return Object.freeze({
      anchor: kaizenRegistrationPointToWorld([
        instance.anchor[0],
        instance.anchor[1],
      ]),
      id: instance.id,
      minimumTier: tier,
      mirror: instance.mirror,
      resourceId: instance.resourceId,
      scale: instance.scale,
    });
  }),
);

const resourceById = new Map(
  KAIZEN_DECORATION_RESOURCES.map((resource) => [resource.id, resource]),
);

export function resolveKaizenDecorationResource(
  id: string,
): KaizenDecorationResource {
  const resource = resourceById.get(id);
  if (!resource) {
    throw new Error(`Unknown Kaizen decoration resource: ${id}`);
  }
  return resource;
}
