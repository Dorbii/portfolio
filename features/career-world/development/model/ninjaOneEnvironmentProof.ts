import manifest from "../../../../public/career-world/capitals/ninjaone/environment/manifests/environment-proof-r1.json" with { type: "json" };
import type { CameraView, Pair } from "../../shared/camera";
import type { DetailTierId } from "../../shared/lod";

export type NinjaOneEnvironmentLayerId =
  | "terrain-geology"
  | "secondary-relief"
  | "hydrology"
  | "static-foliage"
  | "tertiary-relief"
  | "trails"
  | "shared-rocks"
  | "shared-animated-foliage"
  | "surface-ecology"
  | "wildlife"
  | "dynamic-shadows";

export type NinjaOneEnvironmentPlateTier = Exclude<DetailTierId, "world">;
export type NinjaOneSemanticTier = Extract<
  DetailTierId,
  "capital" | "site" | "close"
>;

export interface NinjaOneEnvironmentPlateSource {
  readonly dimensions: Pair;
  readonly path: string;
}

export interface NinjaOneEnvironmentSharedResource {
  readonly dimensions: Pair;
  readonly id: string;
  readonly path: string;
}

export interface NinjaOneEnvironmentSharedInstance {
  readonly anchor: Pair;
  readonly id: string;
  readonly minimumTier: Extract<DetailTierId, "site" | "close">;
  readonly resource: NinjaOneEnvironmentSharedResource;
  readonly width: number;
}

export interface NinjaOneEnvironmentFoliageInstance
  extends NinjaOneEnvironmentSharedInstance {
  readonly phaseSeconds: number;
}

const EXPECTED_ID = "career-world/capitals/ninjaone/environment-proof@r1";
const EXPECTED_GRID_CELLS = Object.freeze(["B1", "B2", "C1", "C2"]);
const EXPECTED_LAYER_ORDER: readonly NinjaOneEnvironmentLayerId[] = Object.freeze([
  "terrain-geology",
  "secondary-relief",
  "hydrology",
  "static-foliage",
  "tertiary-relief",
  "trails",
  "shared-rocks",
  "shared-animated-foliage",
  "surface-ecology",
  "wildlife",
  "dynamic-shadows",
]);
const PLATE_TIERS: readonly NinjaOneEnvironmentPlateTier[] = Object.freeze([
  "territory",
  "capital",
  "site",
  "close",
]);
const EXPECTED_DIMENSIONS: Readonly<Record<NinjaOneEnvironmentPlateTier, Pair>> =
  Object.freeze({
    territory: Object.freeze([720, 540] as Pair),
    capital: Object.freeze([1440, 1080] as Pair),
    site: Object.freeze([2880, 2160] as Pair),
    close: Object.freeze([5760, 4320] as Pair),
  });
const EXPECTED_LOD_LAYERS: Readonly<
  Record<DetailTierId, readonly NinjaOneEnvironmentLayerId[]>
> = Object.freeze({
  world: Object.freeze([] as const),
  territory: Object.freeze([] as const),
  capital: Object.freeze(["terrain-geology"] as const),
  site: Object.freeze([
    "terrain-geology",
    "hydrology",
    "shared-animated-foliage",
  ] as const),
  close: Object.freeze([
    "terrain-geology",
    "hydrology",
    "shared-animated-foliage",
  ] as const),
});

interface RawPlateSource {
  readonly dimensions: readonly number[];
  readonly path: string;
}

interface RawResource {
  readonly dimensions: readonly number[];
  readonly id: string;
  readonly path: string;
}

interface RawInstance {
  readonly anchor: readonly number[];
  readonly id: string;
  readonly minimumTier: string;
  readonly resourceId: string;
  readonly width: number;
}

function finitePair(values: readonly number[], label: string): Pair {
  if (values.length !== 2 || values.some((value) => !Number.isFinite(value))) {
    throw new TypeError(`${label} must contain two finite values.`);
  }
  return Object.freeze([values[0], values[1]] as Pair);
}

function plateSources(
  values: Readonly<Record<string, RawPlateSource>>,
  label: string,
  tiers: readonly NinjaOneEnvironmentPlateTier[],
  expectedDimensions?: Readonly<Partial<Record<NinjaOneEnvironmentPlateTier, Pair>>>,
): Readonly<Partial<Record<NinjaOneEnvironmentPlateTier, NinjaOneEnvironmentPlateSource>>> {
  return Object.freeze(Object.fromEntries(tiers.map((tier) => {
    const source = values[tier];
    if (!source) {
      throw new TypeError(`${label}.${tier} is missing.`);
    }
    const dimensions = finitePair(source.dimensions, `${label}.${tier}.dimensions`);
    if (
      !source.path.startsWith("/career-world/capitals/ninjaone/environment/plates/")
      || (expectedDimensions?.[tier]
        && dimensions.join(",") !== expectedDimensions[tier].join(","))
      || dimensions[0] / dimensions[1] !== 4 / 3
    ) {
      throw new TypeError(`${label}.${tier} is not a registered 4:3 environment plate.`);
    }
    return [tier, Object.freeze({ dimensions, path: source.path })];
  }))) as Partial<Record<NinjaOneEnvironmentPlateTier, NinjaOneEnvironmentPlateSource>>;
}

function minimumTier(
  value: string,
  label: string,
): NinjaOneEnvironmentSharedInstance["minimumTier"] {
  if (value !== "site" && value !== "close") {
    throw new TypeError(`${label} must be site or close.`);
  }
  return value;
}

function sharedResources(
  values: readonly RawResource[],
  prefix: string,
  label: string,
): ReadonlyMap<string, NinjaOneEnvironmentSharedResource> {
  const resources = new Map<string, NinjaOneEnvironmentSharedResource>();
  for (const resource of values) {
    const dimensions = finitePair(resource.dimensions, `${label}.${resource.id}.dimensions`);
    if (resources.has(resource.id) || !resource.path.startsWith(prefix)) {
      throw new TypeError(`${label}.${resource.id} is invalid.`);
    }
    resources.set(resource.id, Object.freeze({
      dimensions,
      id: resource.id,
      path: resource.path,
    }));
  }
  return resources;
}

function sharedInstances(
  values: readonly RawInstance[],
  resources: ReadonlyMap<string, NinjaOneEnvironmentSharedResource>,
  label: string,
): readonly NinjaOneEnvironmentSharedInstance[] {
  return Object.freeze(values.map((instance) => {
    const resource = resources.get(instance.resourceId);
    if (!resource || !Number.isFinite(instance.width) || instance.width <= 0) {
      throw new TypeError(`${label}.${instance.id} is invalid.`);
    }
    return Object.freeze({
      anchor: finitePair(instance.anchor, `${label}.${instance.id}.anchor`),
      id: instance.id,
      minimumTier: minimumTier(instance.minimumTier, `${label}.${instance.id}.minimumTier`),
      resource,
      width: instance.width,
    });
  }));
}

if (
  manifest.schemaVersion !== 1
  || manifest.id !== EXPECTED_ID
  || manifest.status !== "environment-only-proof"
  || manifest.registration.gridCells.join(",") !== EXPECTED_GRID_CELLS.join(",")
  || manifest.layerOrder.join(",") !== EXPECTED_LAYER_ORDER.join(",")
  || manifest.layers.dynamicShadows.enabled
  || manifest.layerOrder.some((layer) => (
    /(?:^|-)(?:city|building|rail|road)(?:-|$)/.test(layer)
  ))
  || Object.entries(EXPECTED_LOD_LAYERS).some(([tier, layers]) => (
    manifest.lod[tier as DetailTierId].join(",") !== layers.join(",")
  ))
) {
  throw new TypeError("NinjaOne environment proof identity or ownership is invalid.");
}

export const NINJAONE_ENVIRONMENT_PROOF_ID = EXPECTED_ID;
export const NINJAONE_ENVIRONMENT_GRID_CELLS = EXPECTED_GRID_CELLS;
export const NINJAONE_ENVIRONMENT_ARTBOARD = finitePair(
  manifest.registration.artboard,
  "registration.artboard",
);
export const NINJAONE_ENVIRONMENT_WORLD_ORIGIN = finitePair(
  manifest.registration.boundingWorldView.origin,
  "registration.boundingWorldView.origin",
);
export const NINJAONE_ENVIRONMENT_WORLD_SPAN = finitePair(
  manifest.registration.boundingWorldView.span,
  "registration.boundingWorldView.span",
);
export const NINJAONE_ENVIRONMENT_CAMERA: CameraView = Object.freeze({
  origin: Object.freeze([0.095, 0] as Pair),
  span: Object.freeze([0.36, 0.36] as Pair),
});
export const NINJAONE_ENVIRONMENT_LAYER_ORDER = EXPECTED_LAYER_ORDER;
export const NINJAONE_ENVIRONMENT_LOD_LAYERS = EXPECTED_LOD_LAYERS;

export const NINJAONE_ENVIRONMENT_GEOLOGY_SOURCES = plateSources(
  manifest.layers.geology.sources,
  "layers.geology.sources",
  PLATE_TIERS,
  EXPECTED_DIMENSIONS,
) as Readonly<Record<NinjaOneEnvironmentPlateTier, NinjaOneEnvironmentPlateSource>>;
export const NINJAONE_ENVIRONMENT_SECONDARY_RELIEF_SOURCES = plateSources(
  manifest.layers.secondaryRelief.sources,
  "layers.secondaryRelief.sources",
  ["capital", "site", "close"],
);
export const NINJAONE_ENVIRONMENT_HYDROLOGY_SOURCES = plateSources(
  manifest.layers.hydrology.sources,
  "layers.hydrology.sources",
  ["capital", "site", "close"],
);
export const NINJAONE_ENVIRONMENT_STATIC_FOLIAGE_SOURCES = plateSources(
  manifest.layers.staticFoliage.sources,
  "layers.staticFoliage.sources",
  PLATE_TIERS,
) as Readonly<Record<NinjaOneEnvironmentPlateTier, NinjaOneEnvironmentPlateSource>>;
export const NINJAONE_ENVIRONMENT_TERTIARY_RELIEF_SOURCES = plateSources(
  manifest.layers.tertiaryRelief.sources,
  "layers.tertiaryRelief.sources",
  ["site", "close"],
);
export const NINJAONE_ENVIRONMENT_TRAIL_SOURCES = plateSources(
  manifest.layers.trails.sources,
  "layers.trails.sources",
  ["site", "close"],
);
export const NINJAONE_ENVIRONMENT_SURFACE_ECOLOGY_SOURCES = plateSources(
  manifest.layers.surfaceEcology.sources,
  "layers.surfaceEcology.sources",
  ["close"],
);
export const NINJAONE_ENVIRONMENT_STATIC_CLUSTER_COUNT =
  manifest.layers.staticFoliage.representedClusterCount;

const foliageResources = sharedResources(
  manifest.layers.sharedFoliage.resources,
  "/career-world/capitals/ninjaone/environment/shared/",
  "layers.sharedFoliage.resources",
);
const rockResources = sharedResources(
  manifest.layers.sharedRocks.resources,
  "/career-world/capitals/ninjaone/environment/shared/rocks/",
  "layers.sharedRocks.resources",
);
const wildlifeResources = sharedResources(
  manifest.layers.wildlife.resources,
  "/career-world/capitals/ninjaone/environment/shared/wildlife/",
  "layers.wildlife.resources",
);

export const NINJAONE_ENVIRONMENT_FOLIAGE_RESOURCES = Object.freeze(
  [...foliageResources.values()],
);
export const NINJAONE_ENVIRONMENT_FOLIAGE_INSTANCES = Object.freeze(
  (manifest.layers.sharedFoliage.instances as readonly (RawInstance & {
    readonly phaseSeconds: number;
  })[]).map((instance) => {
    const resource = foliageResources.get(instance.resourceId);
    if (!resource || !Number.isFinite(instance.phaseSeconds)) {
      throw new TypeError(`layers.sharedFoliage.${instance.id} is invalid.`);
    }
    return Object.freeze({
      anchor: finitePair(instance.anchor, `${instance.id}.anchor`),
      id: instance.id,
      minimumTier: minimumTier(instance.minimumTier, `${instance.id}.minimumTier`),
      phaseSeconds: instance.phaseSeconds,
      resource,
      width: instance.width,
    });
  }),
);
export const NINJAONE_ENVIRONMENT_ROCK_RESOURCES = Object.freeze(
  [...rockResources.values()],
);
export const NINJAONE_ENVIRONMENT_ROCK_INSTANCES = sharedInstances(
  manifest.layers.sharedRocks.instances,
  rockResources,
  "layers.sharedRocks.instances",
);
export const NINJAONE_ENVIRONMENT_WILDLIFE_RESOURCES = Object.freeze(
  [...wildlifeResources.values()],
);
export const NINJAONE_ENVIRONMENT_WILDLIFE_INSTANCES = sharedInstances(
  manifest.layers.wildlife.instances,
  wildlifeResources,
  "layers.wildlife.instances",
);
