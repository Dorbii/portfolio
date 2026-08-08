import hydrologyManifest from "../../../../../public/career-world/capitals/ninjaone/environment/manifests/hydrology-native-r2.json" with { type: "json" };
import { defineLayerDetailContract } from "../../../shared/lod";

const WORLD_ALBEDO =
  "/career-world/layers/water-surface/textures/water-surface-world-lod-r2-3840x2160.png";
const DIRECTIONAL_ALBEDO =
  "/career-world/layers/water-surface/textures/water-surface-reference-r2-3840x2160.png";
const MACRO_HEIGHT =
  "/career-world/layers/water-surface/fields/water-height-macro-r1-1024x1024.png";
const MICRO_HEIGHT =
  "/career-world/layers/water-surface/fields/water-height-micro-r1-1024x1024.png";
const COAST_GEOMETRY_WORLD =
  "/career-world/layers/water-surface/fields/coast-geometry-r5.png?v=ninjaone-coast-r2";
const COAST_GEOMETRY_TERRITORY =
  "/career-world/layers/water-surface/fields/coast-geometry-r5-4x.png?v=ninjaone-coast-r2";
export type NinjaOneHydrologyTierId = "detail" | "fallback";

export interface NinjaOneHydrologyRegionResource {
  readonly artboardBounds: readonly [number, number, number, number];
  readonly decodedBytes: number;
  readonly dimensions: readonly [number, number];
  readonly id: string;
  readonly path: string;
  readonly regionId: string;
  readonly sha256: string;
  readonly sourceBounds: readonly [number, number, number, number];
  readonly tier: NinjaOneHydrologyTierId;
  readonly worldBounds: Readonly<{
    origin: readonly [number, number];
    span: readonly [number, number];
  }>;
}

function tuple2(values: readonly number[]): readonly [number, number] {
  return Object.freeze([values[0] ?? Number.NaN, values[1] ?? Number.NaN]);
}

function tuple4(
  values: readonly number[],
): readonly [number, number, number, number] {
  return Object.freeze([
    values[0] ?? Number.NaN,
    values[1] ?? Number.NaN,
    values[2] ?? Number.NaN,
    values[3] ?? Number.NaN,
  ]);
}

function normalizeHydrologyResource(
  resource: (typeof hydrologyManifest.regionalFields.tiers.detail.resources)[number]
    | (typeof hydrologyManifest.regionalFields.tiers.fallback.resources)[number],
  tier: NinjaOneHydrologyTierId,
): NinjaOneHydrologyRegionResource {
  const dimensions = tuple2(resource.dimensions);
  const sourceBounds = tuple4(resource.sourceBounds);
  const artboardBounds = tuple4(resource.artboardBounds);
  const worldOrigin = tuple2(resource.worldBounds.origin);
  const worldSpan = tuple2(resource.worldBounds.span);
  if (
    resource.tier !== tier
    || !/^[A-F\d]{64}$/.test(resource.sha256)
    || dimensions.some((value) => !Number.isSafeInteger(value) || value <= 0)
    || resource.decodedBytes !== dimensions[0] * dimensions[1] * 4
    || sourceBounds[2] - sourceBounds[0] !== dimensions[0]
    || sourceBounds[3] - sourceBounds[1] !== dimensions[1]
    || [...artboardBounds, ...worldOrigin, ...worldSpan].some(
      (value) => !Number.isFinite(value),
    )
    || worldSpan.some((value) => value <= 0)
  ) {
    throw new RangeError(`NinjaOne ${tier} hydrology resource is invalid.`);
  }
  return Object.freeze({
    artboardBounds,
    decodedBytes: resource.decodedBytes,
    dimensions,
    id: resource.id,
    path: resource.path,
    regionId: resource.regionId,
    sha256: resource.sha256,
    sourceBounds,
    tier,
    worldBounds: Object.freeze({ origin: worldOrigin, span: worldSpan }),
  });
}

const [ninjaOneOriginX = Number.NaN, ninjaOneOriginY = Number.NaN] =
  hydrologyManifest.registration.worldOrigin;
const [ninjaOneSpanX = 0, ninjaOneSpanY = 0] =
  hydrologyManifest.registration.worldSpan;
const nativeApplicationOwnedUnion =
  hydrologyManifest.admission.nativeApplicationOwnedUnion;
const detailHydrologyResources = Object.freeze(
  hydrologyManifest.regionalFields.tiers.detail.resources.map((resource) => (
    normalizeHydrologyResource(resource, "detail")
  )),
);
const fallbackHydrologyResources = Object.freeze(
  hydrologyManifest.regionalFields.tiers.fallback.resources.map((resource) => (
    normalizeHydrologyResource(resource, "fallback")
  )),
);
const hydrologyRegions = Object.freeze(
  hydrologyManifest.regionalFields.regions.map((region) => Object.freeze({
    artboardBounds: tuple4(region.artboardBounds),
    id: region.id,
    worldBounds: Object.freeze({
      origin: tuple2(region.worldBounds.origin),
      span: tuple2(region.worldBounds.span),
    }),
  })),
);
const expectedHydrologyRegionIds = ["B2", "C1", "C2"];
const resourceIdentities = [
  ...detailHydrologyResources,
  ...fallbackHydrologyResources,
];

if (
  hydrologyManifest.schemaVersion !== 3
  || hydrologyManifest.regionalFields.cohortPolicy.atomic !== true
  || hydrologyManifest.regionalFields.cohortPolicy.mixedTierAllowed !== false
  || hydrologyManifest.registration.maximumMountedRegions !== 2
  || detailHydrologyResources.length !== 3
  || fallbackHydrologyResources.length !== 3
  || detailHydrologyResources.map(({ regionId }) => regionId).join(",")
    !== expectedHydrologyRegionIds.join(",")
  || fallbackHydrologyResources.map(({ regionId }) => regionId).join(",")
    !== expectedHydrologyRegionIds.join(",")
  || hydrologyRegions.map(({ id }) => id).join(",")
    !== expectedHydrologyRegionIds.join(",")
  || new Set(resourceIdentities.map(({ id }) => id)).size
    !== resourceIdentities.length
  || new Set(resourceIdentities.map(({ path }) => path)).size
    !== resourceIdentities.length
  || !Number.isFinite(ninjaOneOriginX)
  || !Number.isFinite(ninjaOneOriginY)
  || ninjaOneSpanX <= 0
  || ninjaOneSpanY <= 0
  || nativeApplicationOwnedUnion.maximumDecodedBytes !== 32 * 1024 * 1024
) {
  throw new RangeError("NinjaOne regional hydrology manifest is invalid.");
}

export const NINJAONE_STREAM_REGISTRATION = Object.freeze({
  artboardDimensions: tuple2(hydrologyManifest.registration.artboardDimensions),
  maximumMountedRegions: hydrologyManifest.registration.maximumMountedRegions,
  nativeApplicationOwnedUnion: Object.freeze({
    maximumDecodedBytes: nativeApplicationOwnedUnion.maximumDecodedBytes,
  }),
  regions: hydrologyRegions,
  tiers: Object.freeze({
    detail: Object.freeze({
      fullFieldDimensions: tuple2(
        hydrologyManifest.regionalFields.tiers.detail.fullFieldDimensions,
      ),
      resources: detailHydrologyResources,
      scale: hydrologyManifest.regionalFields.tiers.detail.scale,
    }),
    fallback: Object.freeze({
      fullFieldDimensions: tuple2(
        hydrologyManifest.regionalFields.tiers.fallback.fullFieldDimensions,
      ),
      resources: fallbackHydrologyResources,
      scale: hydrologyManifest.regionalFields.tiers.fallback.scale,
    }),
  }),
  worldOrigin: Object.freeze([ninjaOneOriginX, ninjaOneOriginY] as const),
  worldSpan: Object.freeze([ninjaOneSpanX, ninjaOneSpanY] as const),
});

export const WATER_RUNTIME_TEXTURE_BUDGET_BYTES = 288 * 1024 * 1024;
export const WATER_TERRITORY_TEXTURE_DIMENSIONS = Object.freeze({
  coastGeometry: Object.freeze([6688, 3764] as const),
  directionalAlbedo: Object.freeze([3840, 2160] as const),
});

export const WATER_TERRITORY_DETAIL = Object.freeze({
  fixedWorldFrequency: Object.freeze([12.5, 10.6] as const),
  lineStrength: 0.16,
  normalStrength: 5.4,
});

export const WATER_ASSETS = Object.freeze({
  worldAlbedo: WORLD_ALBEDO,
  directionalAlbedo: DIRECTIONAL_ALBEDO,
  macroHeight: MACRO_HEIGHT,
  microHeight: MICRO_HEIGHT,
  coastGeometry: Object.freeze({
    world: COAST_GEOMETRY_WORLD,
    territory: COAST_GEOMETRY_TERRITORY,
  }),
  coastMaterial:
    "/career-world/layers/water-surface/fields/coast-material-field-r6.png?v=ninjaone-coast-r2",
  hydrology:
    "/career-world/layers/water-surface/fields/water-region-field-r3.png?v=ninjaone-coast-r2",
});

export const WATER_DETAIL_CONTRACT = defineLayerDetailContract({
  layer: "water-surface",
  sources: [
    {
      id: "world-albedo",
      kind: "registered-raster",
      minimumTier: "world",
      path: WORLD_ALBEDO,
      dimensions: [3840, 2160],
      worldBounds: {
        origin: [0, 0],
        span: [1, 1],
      },
    },
    {
      id: "territory-line-field",
      kind: "world-procedural",
      minimumTier: "territory",
      path: MICRO_HEIGHT,
      fixedWorldFrequency: WATER_TERRITORY_DETAIL.fixedWorldFrequency,
    },
    {
      id: "territory-coast-geometry",
      kind: "registered-raster",
      minimumTier: "territory",
      path: COAST_GEOMETRY_TERRITORY,
      dimensions: [6688, 3764],
      worldBounds: {
        origin: [0, 0],
        span: [1, 1],
      },
    },
    ...Object.values(NINJAONE_STREAM_REGISTRATION.tiers).flatMap(
      ({ resources }) => resources.map((resource) => ({
        id: resource.id,
        kind: "registered-raster" as const,
        minimumTier: "site" as const,
        path: resource.path,
        dimensions: resource.dimensions,
        worldBounds: resource.worldBounds,
      })),
    ),
  ],
});
