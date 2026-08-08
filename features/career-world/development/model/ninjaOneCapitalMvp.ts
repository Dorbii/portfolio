import mvpManifest from "../../../../public/career-world/capitals/ninjaone/manifests/capital-mvp-r1.json" with { type: "json" };
import foliagePoolManifest from "../../../../public/career-world/shared-assets/environment/foliage/foliage-pool-r1.json" with { type: "json" };
import structurePoolManifest from "../../../../public/career-world/shared-assets/structures/manifests/ninjaone-capital-structures-r1.json" with { type: "json" };
import type { CameraView, Pair } from "../../shared/camera";
import type { DetailTierId } from "../../shared/lod";
import {
  NINJAONE_CAPITAL_TOPOLOGY_ARTBOARD,
  NINJAONE_CAPITAL_TOPOLOGY_DISTRICTS,
  NINJAONE_CAPITAL_TOPOLOGY_PLOTS,
  NINJAONE_CAPITAL_TOPOLOGY_REGISTRATION_ID,
  NINJAONE_CAPITAL_TOPOLOGY_STATION_PLOT_ID,
  type NinjaOneCapitalSkillDistrictId,
  type NinjaOneCapitalTopologyPlot,
} from "./ninjaOneCapitalTopologyProof.ts";

export type NinjaOneCapitalMvpLayerId =
  | "base-surface"
  | "district-static-environment"
  | "transportation-rails"
  | "dynamic-world-light-shadows"
  | "skill-buildings"
  | "decoration-buildings"
  | "transportation-station"
  | "shared-animated-foliage"
  | "integration-details"
  | "close-labels";

export type NinjaOneCapitalMvpStructureKind =
  | "decoration-building"
  | "skill-building"
  | "transportation-building";

export interface NinjaOneCapitalMvpDistrictVisual {
  readonly accent: string;
  readonly id: NinjaOneCapitalSkillDistrictId;
  readonly staticFoliage: string;
  readonly stone: string;
  readonly stoneLight: string;
  readonly surface: string;
}

export type NinjaOneCapitalMvpPlateId = "base" | "staticEnvironment";

export interface NinjaOneCapitalMvpPlateSource {
  readonly dimensions: Pair;
  readonly path: string;
}

export interface NinjaOneCapitalMvpStructureResource {
  readonly defaultDisplayWidth: number;
  readonly dimensions: Pair;
  readonly footprintFraction: Pair;
  readonly groundAnchor: Pair;
  readonly id: string;
  readonly kind: NinjaOneCapitalMvpStructureKind;
  readonly path: string;
  readonly shadowHeight: number;
}

export interface NinjaOneCapitalMvpStructureInstance {
  readonly anchor: Pair;
  readonly displayWidth: number;
  readonly id: string;
  readonly minimumTier: Extract<DetailTierId, "capital" | "site">;
  readonly mirror: boolean;
  readonly plot: NinjaOneCapitalTopologyPlot;
  readonly resource: NinjaOneCapitalMvpStructureResource;
}

export interface NinjaOneCapitalMvpFoliageResource {
  readonly atlasDimensions: Pair;
  readonly atlasPath: string;
  readonly canopySplit: number;
  readonly crop: readonly [number, number, number, number];
  readonly durationSeconds: number;
  readonly id: string;
  readonly motionScale: number;
  readonly phaseSeconds: number;
  readonly presentation: "copse" | "ground-cover" | "hedge" | "tree";
  readonly visualPlantCount: number;
}

export interface NinjaOneCapitalMvpFoliageInstance {
  readonly anchor: Pair;
  readonly depth: "background" | "foreground";
  readonly displayWidth: number;
  readonly id: string;
  readonly minimumTier: Extract<DetailTierId, "capital" | "site" | "close">;
  readonly mirror: boolean;
  readonly resource: NinjaOneCapitalMvpFoliageResource;
}

const EXPECTED_LAYER_ORDER: readonly NinjaOneCapitalMvpLayerId[] = Object.freeze([
  "base-surface",
  "district-static-environment",
  "transportation-rails",
  "dynamic-world-light-shadows",
  "skill-buildings",
  "decoration-buildings",
  "transportation-station",
  "shared-animated-foliage",
  "integration-details",
  "close-labels",
]);

function finitePair(values: readonly number[], label: string): Pair {
  if (values.length !== 2 || values.some((value) => !Number.isFinite(value))) {
    throw new TypeError(`${label} must contain two finite values.`);
  }
  return Object.freeze([values[0], values[1]] as Pair);
}

function structureKind(
  value: string,
  label: string,
): NinjaOneCapitalMvpStructureKind {
  if (
    value !== "decoration-building"
    && value !== "skill-building"
    && value !== "transportation-building"
  ) {
    throw new TypeError(`${label} is not a supported shared structure kind.`);
  }
  return value;
}

function detailTier(
  value: string,
  label: string,
): NinjaOneCapitalMvpFoliageInstance["minimumTier"] {
  if (value !== "capital" && value !== "site" && value !== "close") {
    throw new TypeError(`${label} is not a supported capital MVP detail tier.`);
  }
  return value;
}

function foliagePresentation(
  value: string,
  label: string,
): NinjaOneCapitalMvpFoliageResource["presentation"] {
  if (
    value !== "copse"
    && value !== "ground-cover"
    && value !== "hedge"
    && value !== "tree"
  ) {
    throw new TypeError(`${label} is not a supported foliage presentation.`);
  }
  return value;
}

function plotWidth(plot: NinjaOneCapitalTopologyPlot): number {
  const xs = plot.polygon.map(([x]) => x);
  return Math.max(...xs) - Math.min(...xs);
}

if (
  mvpManifest.schemaVersion !== 1
  || mvpManifest.id !== "career-world/capitals/ninjaone/capital-mvp@r1"
  || mvpManifest.status !== "production-art-pass"
  || mvpManifest.topologyRef
    !== "career-world/capitals/ninjaone/topology-proof@r1"
  || mvpManifest.registrationRef !== NINJAONE_CAPITAL_TOPOLOGY_REGISTRATION_ID
  || mvpManifest.sharedStructurePoolRef !== structurePoolManifest.id
  || mvpManifest.sharedFoliagePoolRef !== foliagePoolManifest.id
  || mvpManifest.layerOrder.join(",") !== EXPECTED_LAYER_ORDER.join(",")
  || structurePoolManifest.schemaVersion !== 1
  || structurePoolManifest.status !== "mvp-shared-runtime-pool"
  || structurePoolManifest.shadowOwnership !== "capital/dynamic-world-light"
  || foliagePoolManifest.schemaVersion !== 1
  || foliagePoolManifest.id !== "career-world/shared-foliage@r1"
  || foliagePoolManifest.ownership !== "world-shared-assets/environment/foliage"
  || mvpManifest.artDirection.coordinateSpace !== "registered-plate-pixels"
  || mvpManifest.artDirection.shadowPolicy !== "dynamic-layer-only"
  || mvpManifest.artDirection.registrationPolicy !== "one-canvas-all-layers"
  || finitePair(mvpManifest.artDirection.plateCanvas, "artDirection.plateCanvas").join(",")
    !== NINJAONE_CAPITAL_TOPOLOGY_ARTBOARD.join(",")
) {
  throw new TypeError("NinjaOne Capital MVP layer identity is invalid.");
}

const DETAIL_TIERS: readonly DetailTierId[] = Object.freeze([
  "world",
  "territory",
  "capital",
  "site",
  "close",
]);

function plateSources(
  sources: Readonly<Record<string, { readonly dimensions: readonly number[]; readonly path: string }>>,
  label: string,
): Readonly<Record<DetailTierId, NinjaOneCapitalMvpPlateSource>> {
  const entries = DETAIL_TIERS.map((tier) => {
    const source = sources[tier];
    if (!source) {
      throw new TypeError(`${label} is missing its ${tier} source.`);
    }
    const parsed = Object.freeze({
      dimensions: finitePair(source.dimensions, `${label}.${tier}.dimensions`),
      path: source.path,
    });
    if (
      !parsed.path.startsWith("/career-world/capitals/ninjaone/plates/")
      || parsed.dimensions.some((value) => value <= 0)
    ) {
      throw new TypeError(`${label}.${tier} is not a registered capital plate.`);
    }
    return [tier, parsed] as const;
  });
  return Object.freeze(Object.fromEntries(entries)) as Readonly<
    Record<DetailTierId, NinjaOneCapitalMvpPlateSource>
  >;
}

export const NINJAONE_CAPITAL_MVP_PLATES: Readonly<
  Record<
    NinjaOneCapitalMvpPlateId,
    Readonly<Record<DetailTierId, NinjaOneCapitalMvpPlateSource>>
  >
> = Object.freeze({
  base: plateSources(mvpManifest.plates.base.sources, "plates.base"),
  staticEnvironment: plateSources(
    mvpManifest.plates.staticEnvironment.sources,
    "plates.staticEnvironment",
  ),
});

export const NINJAONE_CAPITAL_MVP_LAYER_ORDER = EXPECTED_LAYER_ORDER;
export const NINJAONE_CAPITAL_MVP_LOD_LAYERS = Object.freeze(
  Object.fromEntries(Object.entries(mvpManifest.lod).map(([tier, layers]) => [
    tier,
    Object.freeze([...layers] as NinjaOneCapitalMvpLayerId[]),
  ])) as Readonly<Record<DetailTierId, readonly NinjaOneCapitalMvpLayerId[]>>,
);

for (const [tier, layers] of Object.entries(NINJAONE_CAPITAL_MVP_LOD_LAYERS)) {
  if (
    layers.length === 0
    || layers.some((layer) => !EXPECTED_LAYER_ORDER.includes(layer))
    || layers.some((layer, index) => index > 0 && (
      EXPECTED_LAYER_ORDER.indexOf(layer)
      <= EXPECTED_LAYER_ORDER.indexOf(layers[index - 1])
    ))
  ) {
    throw new TypeError(`NinjaOne Capital ${tier} LOD layer order is invalid.`);
  }
}

export const NINJAONE_CAPITAL_MVP_DISTRICTS:
readonly NinjaOneCapitalMvpDistrictVisual[] = Object.freeze(
  mvpManifest.districts.map((district) => {
    const topologyDistrict = NINJAONE_CAPITAL_TOPOLOGY_DISTRICTS.find(
      ({ id }) => id === district.id,
    );
    if (!topologyDistrict) {
      throw new TypeError(`Unknown NinjaOne Capital MVP district ${district.id}.`);
    }
    return Object.freeze({
      accent: district.accent,
      id: topologyDistrict.id,
      staticFoliage: district.staticFoliage,
      stone: district.stone,
      stoneLight: district.stoneLight,
      surface: district.surface,
    });
  }),
);

export const NINJAONE_CAPITAL_MVP_STRUCTURE_RESOURCES:
readonly NinjaOneCapitalMvpStructureResource[] = Object.freeze(
  structurePoolManifest.resources.map((resource) => {
    const parsed = Object.freeze({
      defaultDisplayWidth: resource.defaultDisplayWidth,
      dimensions: finitePair(resource.dimensions, `${resource.id}.dimensions`),
      footprintFraction: finitePair(
        resource.footprintFraction,
        `${resource.id}.footprintFraction`,
      ),
      groundAnchor: finitePair(resource.groundAnchor, `${resource.id}.groundAnchor`),
      id: resource.id,
      kind: structureKind(resource.kind, `${resource.id}.kind`),
      path: resource.path,
      shadowHeight: resource.shadowHeight,
    });
    if (
      !parsed.path.startsWith("/career-world/shared-assets/")
      || parsed.defaultDisplayWidth <= 0
      || parsed.shadowHeight <= 0
      || parsed.dimensions.some((value) => value <= 0)
      || parsed.groundAnchor.some((value) => value < 0 || value > 1)
      || parsed.footprintFraction.some((value) => value <= 0 || value > 1)
    ) {
      throw new TypeError(`Invalid shared structure resource ${resource.id}.`);
    }
    return parsed;
  }),
);

const structureResourceById = new Map(
  NINJAONE_CAPITAL_MVP_STRUCTURE_RESOURCES.map((resource) => [resource.id, resource]),
);
const skillResourceByDistrict = new Map(
  Object.entries(mvpManifest.skillResources),
);
const decorationResourceByPlot = new Map(
  Object.entries(mvpManifest.decorationResources),
);
const structureLayoutByPlot = new Map(
  Object.entries(mvpManifest.structureLayout),
);

export const NINJAONE_CAPITAL_MVP_STRUCTURE_INSTANCES:
readonly NinjaOneCapitalMvpStructureInstance[] = Object.freeze(
  NINJAONE_CAPITAL_TOPOLOGY_PLOTS.map((plot) => {
    const resourceId = plot.role === "skill"
      ? skillResourceByDistrict.get(plot.districtId)
      : plot.role === "station"
        ? mvpManifest.stationResource
        : decorationResourceByPlot.get(plot.id);
    const resource = resourceId ? structureResourceById.get(resourceId) : undefined;
    if (!resource) {
      throw new TypeError(`Plot ${plot.id} has no shared structure resource.`);
    }
    const layout = structureLayoutByPlot.get(plot.id);
    if (!layout) {
      throw new TypeError(`Plot ${plot.id} has no art-derived structure anchor.`);
    }
    const expectedKind = plot.role === "skill"
      ? "skill-building"
      : plot.role === "station"
        ? "transportation-building"
        : "decoration-building";
    const anchor = finitePair(layout.anchor, `${plot.id}.structureLayout.anchor`);
    const displayWidth = layout.displayWidth;
    if (
      resource.kind !== expectedKind
      || displayWidth * resource.footprintFraction[0] > plotWidth(plot)
      || displayWidth <= 0
      || anchor[0] < 0
      || anchor[0] > NINJAONE_CAPITAL_TOPOLOGY_ARTBOARD[0]
      || anchor[1] < 0
      || anchor[1] > NINJAONE_CAPITAL_TOPOLOGY_ARTBOARD[1]
    ) {
      throw new RangeError(`${plot.id} shared structure does not fit its plot.`);
    }
    return Object.freeze({
      anchor,
      displayWidth,
      id: `capital-${plot.id}`,
      minimumTier: plot.role === "decoration" ? "site" as const : "capital" as const,
      mirror: layout.mirror,
      plot,
      resource,
    });
  }).sort((left, right) => left.anchor[1] - right.anchor[1]),
);

if (
  NINJAONE_CAPITAL_MVP_STRUCTURE_INSTANCES.length
    !== NINJAONE_CAPITAL_TOPOLOGY_PLOTS.length
  || structureLayoutByPlot.size !== NINJAONE_CAPITAL_TOPOLOGY_PLOTS.length
  || NINJAONE_CAPITAL_MVP_STRUCTURE_INSTANCES.filter(
    ({ plot }) => plot.role === "station",
  ).length !== 1
  || !NINJAONE_CAPITAL_MVP_STRUCTURE_INSTANCES.some(
    ({ plot }) => plot.id === NINJAONE_CAPITAL_TOPOLOGY_STATION_PLOT_ID,
  )
) {
  throw new TypeError("NinjaOne Capital MVP structure coverage is invalid.");
}

export const NINJAONE_CAPITAL_MVP_FOLIAGE_RESOURCES:
readonly NinjaOneCapitalMvpFoliageResource[] = Object.freeze(
  foliagePoolManifest.resources.map((resource) => Object.freeze({
    atlasDimensions: finitePair(
      resource.atlasDimensions,
      `${resource.id}.atlasDimensions`,
    ),
    atlasPath: resource.atlasPath,
    canopySplit: resource.canopySplit,
    crop: Object.freeze([
      resource.crop[0],
      resource.crop[1],
      resource.crop[2],
      resource.crop[3],
    ] as const),
    durationSeconds: resource.durationSeconds,
    id: resource.id,
    motionScale: resource.motionScale,
    phaseSeconds: resource.phaseSeconds,
    presentation: foliagePresentation(
      resource.presentation,
      `${resource.id}.presentation`,
    ),
    visualPlantCount: resource.visualPlantCount,
  })),
);
const foliageResourceById = new Map(
  NINJAONE_CAPITAL_MVP_FOLIAGE_RESOURCES.map((resource) => [resource.id, resource]),
);

export const NINJAONE_CAPITAL_MVP_FOLIAGE_INSTANCES:
readonly NinjaOneCapitalMvpFoliageInstance[] = Object.freeze(
  mvpManifest.foliageInstances.map((instance) => {
    const resource = foliageResourceById.get(instance.resourceId);
    const anchor = finitePair(instance.anchor, `${instance.id}.anchor`);
    if (
      !resource
      || !resource.atlasPath.startsWith(
        "/career-world/shared-assets/environment/foliage/",
      )
      || instance.displayWidth <= 0
      || anchor[0] < 0
      || anchor[0] > NINJAONE_CAPITAL_TOPOLOGY_ARTBOARD[0]
      || anchor[1] < 0
      || anchor[1] > NINJAONE_CAPITAL_TOPOLOGY_ARTBOARD[1]
      || (instance.depth !== "background" && instance.depth !== "foreground")
    ) {
      throw new TypeError(`Invalid capital foliage instance ${instance.id}.`);
    }
    return Object.freeze({
      anchor,
      depth: instance.depth as NinjaOneCapitalMvpFoliageInstance["depth"],
      displayWidth: instance.displayWidth,
      id: instance.id,
      minimumTier: detailTier(instance.minimumTier, `${instance.id}.minimumTier`),
      mirror: instance.mirror,
      resource,
    });
  }),
);

export const NINJAONE_CAPITAL_MVP_ESTIMATED_PLANT_COUNT =
  NINJAONE_CAPITAL_MVP_FOLIAGE_INSTANCES.reduce(
    (total, { resource }) => total + resource.visualPlantCount,
    0,
  );

export const NINJAONE_CAPITAL_MVP_CAMERA: CameraView = Object.freeze({
  origin: Object.freeze([0.1775, 0.116667] as Pair),
  span: Object.freeze([0.2, 0.2] as Pair),
});
