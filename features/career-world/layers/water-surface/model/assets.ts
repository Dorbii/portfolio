import hydrologyManifest from "../../../../../public/career-world/capitals/ninjaone/environment/manifests/hydrology-native-r2.json" with { type: "json" };
import coastGeometryManifest from "../../../../../public/career-world/layers/water-surface/manifests/coast-geometry-r5.json" with { type: "json" };
import coastMaterialManifest from "../../../../../public/career-world/layers/water-surface/manifests/coast-material-field-r6.json" with { type: "json" };
import waterRegionManifest from "../../../../../public/career-world/layers/water-surface/manifests/water-region-field-r3.json" with { type: "json" };
import { defineLayerDetailContract } from "../../../shared/lod.ts";

const WORLD_ALBEDO =
  "/career-world/layers/water-surface/textures/water-surface-world-lod-r2-3840x2160.png";
const DIRECTIONAL_ALBEDO =
  "/career-world/layers/water-surface/textures/water-surface-reference-r2-3840x2160.png";
const MACRO_HEIGHT =
  "/career-world/layers/water-surface/fields/water-height-macro-r1-1024x1024.png";
const MICRO_HEIGHT =
  "/career-world/layers/water-surface/fields/water-height-micro-r1-1024x1024.png";
const COAST_GEOMETRY_WORLD =
  `/career-world/layers/water-surface/fields/coast-geometry-r5.png?v=${coastGeometryManifest.texture.sha256.slice(0, 12).toLowerCase()}`;
const COAST_GEOMETRY_TERRITORY =
  `/career-world/layers/water-surface/fields/coast-geometry-r5-4x.png?v=${coastGeometryManifest.detailTexture.sha256.slice(0, 12).toLowerCase()}`;
export type NinjaOneHydrologyTierId = "detail" | "fallback";

export interface NinjaOneHydrologyRegionResource {
  readonly artboardBounds: readonly [number, number, number, number];
  readonly decodedBytes: number;
  readonly dimensions: readonly [number, number];
  readonly fieldDimensions: readonly [number, number];
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

export interface NinjaOneWaterFeature {
  readonly id: string;
  readonly origin: readonly [number, number];
  readonly radiusPixels: number;
  readonly regionId: string;
}

export interface NinjaOneCascadeFeature {
  readonly approach: Readonly<{
    readonly extentPixels: number;
    readonly widthPixels: number;
  }>;
  readonly crest: Readonly<{
    readonly end: readonly [number, number];
    readonly start: readonly [number, number];
    readonly thicknessPixels: number;
  }>;
  readonly fall: Readonly<{
    readonly direction: readonly [number, number];
    readonly extentPixels: number;
    readonly widthPixels: number;
  }>;
  readonly id: string;
  readonly impact: Readonly<{
    readonly origin: readonly [number, number];
    readonly radiiPixels: readonly [number, number];
  }>;
  readonly mist: Readonly<{
    readonly drift: readonly [number, number];
    readonly radiusPixels: number;
  }>;
  readonly pool: Readonly<{
    readonly outflowExtentPixels: number;
    readonly radiiPixels: readonly [number, number];
  }>;
  readonly regionId: string;
}

export interface NinjaOneObstacleFeature {
  readonly bowExtentPixels: number;
  readonly center: readonly [number, number];
  readonly flowDirection: readonly [number, number];
  readonly id: string;
  readonly intensity: number;
  readonly radiusPixels: number;
  readonly regionId: string;
  readonly wakeExtentPixels: number;
  readonly wakeWidthPixels: number;
}

export const NINJAONE_MAX_CASCADES = 8;

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
  const fieldDimensions = tuple2(resource.fieldDimensions);
  const sourceBounds = tuple4(resource.sourceBounds);
  const artboardBounds = tuple4(resource.artboardBounds);
  const worldOrigin = tuple2(resource.worldBounds.origin);
  const worldSpan = tuple2(resource.worldBounds.span);
  if (
    resource.tier !== tier
    || !/^[A-F\d]{64}$/.test(resource.sha256)
    || dimensions.some((value) => !Number.isSafeInteger(value) || value <= 0)
    || resource.decodedBytes !== dimensions[0] * dimensions[1] * 4
    || sourceBounds[2] - sourceBounds[0] !== fieldDimensions[0]
    || sourceBounds[3] - sourceBounds[1] !== fieldDimensions[1]
    || dimensions[0] !== fieldDimensions[0] * 2
    || dimensions[1] !== fieldDimensions[1]
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
    fieldDimensions,
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
const [hydrologyArtboardWidth = 0, hydrologyArtboardHeight = 0] =
  hydrologyManifest.registration.artboardDimensions;

function normalizeWaterFeature(
  segment: (typeof hydrologyManifest.segments)[number],
  originPixels: readonly [number, number],
  radiusPixels: number,
): NinjaOneWaterFeature {
  const [regionId] = segment.cellIds;
  const origin = Object.freeze([
    originPixels[0] / hydrologyArtboardWidth,
    originPixels[1] / hydrologyArtboardHeight,
  ] as const);
  if (
    segment.cellIds.length !== 1
    || !regionId
    || !origin.every((value) => Number.isFinite(value) && value >= 0 && value <= 1)
    || !Number.isFinite(radiusPixels)
    || radiusPixels <= 0
  ) {
    throw new RangeError(`NinjaOne water feature ${segment.id} is invalid.`);
  }
  return Object.freeze({
    id: segment.id,
    origin,
    radiusPixels,
    regionId,
  });
}

function normalizeArtboardPoint(
  values: readonly number[],
): readonly [number, number] {
  const [x, y] = tuple2(values);
  return Object.freeze([
    x / hydrologyArtboardWidth,
    y / hydrologyArtboardHeight,
  ] as const);
}

function normalizeCascadeFeature(
  cascade: (typeof hydrologyManifest.cascades)[number],
): NinjaOneCascadeFeature {
  const crestStart = normalizeArtboardPoint(cascade.crest.start);
  const crestEnd = normalizeArtboardPoint(cascade.crest.end);
  const impactOrigin = normalizeArtboardPoint(cascade.impact.center);
  const fallDirection = tuple2(cascade.fall.direction);
  const mistDrift = tuple2(cascade.mist.driftVector);
  const impactRadii = tuple2(cascade.impact.radiiPixels);
  const poolRadii = tuple2(cascade.pool.radiiPixels);
  const fallLength = Math.hypot(...fallDirection);
  const mistLength = Math.hypot(...mistDrift);
  if (
    !cascade.id
    || !expectedHydrologyRegionIds.includes(cascade.regionId)
    || [crestStart, crestEnd, impactOrigin].some((point) => (
      point.some((value) => !Number.isFinite(value) || value < 0 || value > 1)
    ))
    || Math.abs(fallLength - 1) > 0.01
    || Math.abs(mistLength - 1) > 0.01
    || [
      cascade.crest.thicknessPixels,
      cascade.approach.extentPixels,
      cascade.approach.widthPixels,
      cascade.fall.extentPixels,
      cascade.fall.widthPixels,
      cascade.mist.radiusPixels,
      cascade.pool.outflowExtentPixels,
      ...impactRadii,
      ...poolRadii,
    ].some((value) => !Number.isFinite(value) || value <= 0)
    || !cascade.maskPolicy.includes("registered water remains exact")
    || !cascade.maskPolicy.includes("descriptor-bounded")
  ) {
    throw new RangeError(`NinjaOne cascade ${cascade.id} is invalid.`);
  }
  return Object.freeze({
    approach: Object.freeze({
      extentPixels: cascade.approach.extentPixels,
      widthPixels: cascade.approach.widthPixels,
    }),
    crest: Object.freeze({
      end: crestEnd,
      start: crestStart,
      thicknessPixels: cascade.crest.thicknessPixels,
    }),
    fall: Object.freeze({
      direction: fallDirection,
      extentPixels: cascade.fall.extentPixels,
      widthPixels: cascade.fall.widthPixels,
    }),
    id: cascade.id,
    impact: Object.freeze({
      origin: impactOrigin,
      radiiPixels: impactRadii,
    }),
    mist: Object.freeze({
      drift: mistDrift,
      radiusPixels: cascade.mist.radiusPixels,
    }),
    pool: Object.freeze({
      outflowExtentPixels: cascade.pool.outflowExtentPixels,
      radiiPixels: poolRadii,
    }),
    regionId: cascade.regionId,
  });
}

function normalizeObstacleFeature(
  obstacle: (typeof hydrologyManifest.obstacles)[number],
): NinjaOneObstacleFeature {
  const center = normalizeArtboardPoint(obstacle.center);
  const flowDirection = tuple2(obstacle.flowDirection);
  const flowLength = Math.hypot(...flowDirection);
  if (
    !obstacle.id
    || !expectedHydrologyRegionIds.includes(obstacle.regionId)
    || center.some((value) => !Number.isFinite(value) || value < 0 || value > 1)
    || Math.abs(flowLength - 1) > 0.01
    || obstacle.intensity <= 0
    || obstacle.intensity > 1
    || [
      obstacle.bowExtentPixels,
      obstacle.radiusPixels,
      obstacle.wakeExtentPixels,
      obstacle.wakeWidthPixels,
    ].some((value) => !Number.isFinite(value) || value <= 0)
    || !obstacle.maskPolicy.includes("accepted registered water coverage")
  ) {
    throw new RangeError(`NinjaOne obstacle ${obstacle.id} is invalid.`);
  }
  return Object.freeze({
    bowExtentPixels: obstacle.bowExtentPixels,
    center,
    flowDirection,
    id: obstacle.id,
    intensity: obstacle.intensity,
    radiusPixels: obstacle.radiusPixels,
    regionId: obstacle.regionId,
    wakeExtentPixels: obstacle.wakeExtentPixels,
    wakeWidthPixels: obstacle.wakeWidthPixels,
  });
}

const cascadeFeatures = Object.freeze(
  hydrologyManifest.cascades.map(normalizeCascadeFeature),
);
const obstacleFeatures = Object.freeze(
  hydrologyManifest.obstacles.map(normalizeObstacleFeature),
);
const tarnSegment = hydrologyManifest.segments.find(
  (segment) => segment.kind === "tarn" && "rippleCenter" in segment,
);
const tarnFeature = tarnSegment
  && "rippleCenter" in tarnSegment
  && Array.isArray(tarnSegment.rippleCenter)
  ? normalizeWaterFeature(
    tarnSegment,
    tuple2(tarnSegment.rippleCenter),
    Math.max(
      tarnSegment.artboardBounds[2] - tarnSegment.artboardBounds[0],
      tarnSegment.artboardBounds[3] - tarnSegment.artboardBounds[1],
    ) * 0.5,
  )
  : null;

if (
  hydrologyManifest.schemaVersion !== 4
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
  || hydrologyArtboardWidth <= 0
  || hydrologyArtboardHeight <= 0
  || cascadeFeatures.length === 0
  || cascadeFeatures.length > NINJAONE_MAX_CASCADES
  || new Set(cascadeFeatures.map(({ id }) => id)).size
    !== cascadeFeatures.length
  || obstacleFeatures.length === 0
  || new Set(obstacleFeatures.map(({ id }) => id)).size
    !== obstacleFeatures.length
  || tarnFeature === null
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
  packingRevision: hydrologyManifest.packingRevision,
  schemaVersion: hydrologyManifest.schemaVersion,
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

export const NINJAONE_WATER_FEATURES = Object.freeze({
  cascades: cascadeFeatures,
  obstacles: obstacleFeatures,
  tarn: tarnFeature,
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
    `/career-world/layers/water-surface/fields/coast-material-field-r6.png?v=${coastMaterialManifest.texture.sha256.slice(0, 12).toLowerCase()}`,
  hydrology:
    `/career-world/layers/water-surface/fields/water-region-field-r3.png?v=${waterRegionManifest.texture.sha256.slice(0, 12).toLowerCase()}`,
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
