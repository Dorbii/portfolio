import manifest from "../../../../../public/career-world/capitals/ninjaone/manifests/city-foundation-r3.json" with { type: "json" };
import type { Pair } from "../../../shared/camera";
import {
  NINJAONE_ENVIRONMENT_WORLD_ORIGIN,
  NINJAONE_ENVIRONMENT_WORLD_SPAN,
} from "../../terrain/model/ninjaOneEnvironmentProof.ts";

export interface NinjaOneCapitalCityArtifact {
  readonly decodedBytes: number;
  readonly dimensions: Pair;
  readonly encodedBytes: number;
  readonly path: string;
  readonly sha256: string;
}

export type NinjaOneCapitalCityRuntimeAssetId =
  | "CFX01"
  | "CFX02"
  | "D01L02"
  | "D02L02"
  | "D03L02"
  | "D03L03"
  | "D03L04"
  | "D04L02"
  | "D04W02"
  | "D05L02"
  | "D05L03"
  | "D05L04"
  | "I20"
  | "I24"
  | "LFX06"
  | "S14D04"
  | "WFX01";

export interface NinjaOneCapitalCityRuntimeAsset {
  readonly asset: NinjaOneCapitalCityArtifact;
  readonly id: NinjaOneCapitalCityRuntimeAssetId;
  readonly layerId: "L4_0" | "L4_1" | "L4_2" | "L4_3" | "L4_4";
  readonly placement?: {
    readonly anchor: Pair;
    readonly baseSize: Pair;
    readonly scale: number;
  };
  readonly role: string;
  readonly sourceWindow?: {
    readonly origin: Pair;
    readonly sourceDimensions: Pair;
    readonly sourcePath: string;
    readonly sourceSha256: string;
  };
  readonly tiers: readonly ("capital" | "close" | "site")[];
}

interface FoundationLayer {
  readonly asset: NinjaOneCapitalCityArtifact;
  readonly id: "L4" | "L4_0";
  readonly role:
    | "capital-composite-context-with-D06-exclusion"
    | "city-water-interaction";
}

function pair(value: readonly number[], label: string): Pair {
  if (value.length !== 2 || value.some((coordinate) => !Number.isFinite(coordinate))) {
    throw new TypeError(`${label} must be a finite pair.`);
  }
  return Object.freeze([value[0], value[1]] as Pair);
}

function artifact(
  value: Omit<NinjaOneCapitalCityArtifact, "dimensions"> & { readonly dimensions: readonly number[] },
  label: string,
): NinjaOneCapitalCityArtifact {
  return Object.freeze({
    ...value,
    dimensions: pair(value.dimensions, `${label}.dimensions`),
  });
}

const rawLayers = manifest.layers as unknown as readonly FoundationLayer[];
const layerByRole = new Map(rawLayers.map((layer) => [layer.role, layer]));
const waterLayer = layerByRole.get("city-water-interaction");
const contextLayer = layerByRole.get("capital-composite-context-with-D06-exclusion");
const waterCoverage = manifest.verification.inlandWaterCoverageFraction;
const progressiveWaterExclusion = manifest.authority.progressiveDetailWaterExclusion;
const d01ContextExclusion = manifest.authority.progressiveDistrictContextExclusions.D01;
const d02ContextExclusion = manifest.authority.progressiveDistrictContextExclusions.D02;
const d03ContextExclusion = manifest.authority.progressiveDistrictContextExclusions.D03;
const d04ContextExclusion = manifest.authority.progressiveDistrictContextExclusions.D04;
const d05ContextExclusion = manifest.authority.progressiveDistrictContextExclusions.D05;
const rawRuntimeAssets = manifest.runtimeAssets as unknown as readonly (
  Omit<NinjaOneCapitalCityRuntimeAsset, "asset" | "placement" | "sourceWindow"> & {
    readonly asset: Omit<NinjaOneCapitalCityArtifact, "dimensions"> & {
      readonly dimensions: readonly number[];
    };
    readonly placement?: {
      readonly anchor: readonly number[];
      readonly baseSize: readonly number[];
      readonly scale: number;
    };
    readonly sourceWindow?: {
      readonly origin: readonly number[];
      readonly sourceDimensions: readonly number[];
      readonly sourcePath: string;
      readonly sourceSha256: string;
    };
  }
)[];
const runtimeAssets = Object.freeze(Object.fromEntries(rawRuntimeAssets.map((entry) => [
  entry.id,
  Object.freeze({
    ...entry,
    asset: artifact(entry.asset, `city-foundation-r3.runtimeAssets.${entry.id}`),
    placement: entry.placement
      ? Object.freeze({
        anchor: pair(entry.placement.anchor, `${entry.id}.placement.anchor`),
        baseSize: pair(entry.placement.baseSize, `${entry.id}.placement.baseSize`),
        scale: entry.placement.scale,
      })
      : undefined,
    sourceWindow: entry.sourceWindow
      ? Object.freeze({
        ...entry.sourceWindow,
        origin: pair(entry.sourceWindow.origin, `${entry.id}.sourceWindow.origin`),
        sourceDimensions: pair(
          entry.sourceWindow.sourceDimensions,
          `${entry.id}.sourceWindow.sourceDimensions`,
        ),
      })
      : undefined,
    tiers: Object.freeze([...entry.tiers]),
  }),
]))) as Readonly<Record<NinjaOneCapitalCityRuntimeAssetId, NinjaOneCapitalCityRuntimeAsset>>;
const expectedRuntimeAssetContract = Object.freeze({
  CFX01: Object.freeze({ layerId: "L4_4", tiers: "site,close" }),
  CFX02: Object.freeze({ layerId: "L4_4", tiers: "close" }),
  D01L02: Object.freeze({ layerId: "L4_1", tiers: "site,close" }),
  D02L02: Object.freeze({ layerId: "L4_1", tiers: "site,close" }),
  D03L02: Object.freeze({ layerId: "L4_1", tiers: "site,close" }),
  D03L03: Object.freeze({ layerId: "L4_1", tiers: "site,close" }),
  D03L04: Object.freeze({ layerId: "L4_1", tiers: "site,close" }),
  D04L02: Object.freeze({ layerId: "L4_1", tiers: "site,close" }),
  D04W02: Object.freeze({ layerId: "L4_0", tiers: "site,close" }),
  D05L02: Object.freeze({ layerId: "L4_1", tiers: "site,close" }),
  D05L03: Object.freeze({ layerId: "L4_1", tiers: "site,close" }),
  D05L04: Object.freeze({ layerId: "L4_1", tiers: "site,close" }),
  I20: Object.freeze({ layerId: "L4_2", tiers: "capital" }),
  I24: Object.freeze({ layerId: "L4_2", tiers: "site,close" }),
  LFX06: Object.freeze({ layerId: "L4_1", tiers: "capital,site,close" }),
  S14D04: Object.freeze({ layerId: "L4_3", tiers: "site,close" }),
  WFX01: Object.freeze({ layerId: "L4_0", tiers: "site,close" }),
} as const);
const expectedSourceWindowAssetIds = new Set<NinjaOneCapitalCityRuntimeAssetId>([
  "CFX01",
  "I24",
  "LFX06",
  "WFX01",
]);

if (
  manifest.schemaVersion !== 1
  || manifest.id !== "career-world/capitals/ninjaone/city-foundation@r3"
  || manifest.status !== "active-registered-foundation"
  || manifest.authority.artboard.join(",") !== "1448,1086"
  || manifest.authority.ownership.globalWater !== "L1-and-L3-immutable"
  || manifest.authority.ownership.globalLand !== "L2-immutable"
  || manifest.authority.ownership.cityWaterInteraction !== "L4_0-reversible"
  || manifest.authority.ownership.cityLandscapeModification !== "L4_1-reversible"
  || manifest.authority.ownership.cityTerrainIntegrationDetail !== "L4_1-reversible"
  || manifest.authority.waterRegistration.retainedComponentPixels.length !== 2
  || manifest.authority.waterRegistration.rejectedComponents?.length !== 1
  || manifest.authority.waterRegistration.rejectedComponents[0].reason
    !== "false-positive-city-shadow-pocket"
  || progressiveWaterExclusion.method !== "byte-exact-live-water-authority"
  || progressiveWaterExclusion.mask.dimensions.join(",") !== "1448,1086"
  || d01ContextExclusion.method
    !== "continuous-D01-context-exclusion-plus-city-owned-L4_1-grounding"
  || d01ContextExclusion.mask.dimensions.join(",") !== "1448,1086"
  || d01ContextExclusion.contactLayer.dimensions.join(",") !== "1448,1086"
  || d01ContextExclusion.hardRevealFraction < 0.95
  || d01ContextExclusion.hardRevealFraction > 0.99
  || d01ContextExclusion.contactFraction < 0.02
  || d01ContextExclusion.contactFraction > 0.06
  || d02ContextExclusion.method
    !== "continuous-D02-context-exclusion-plus-city-owned-L4_1-grounding"
  || d02ContextExclusion.mask.dimensions.join(",") !== "1448,1086"
  || d02ContextExclusion.contactLayer.dimensions.join(",") !== "1448,1086"
  || d02ContextExclusion.hardRevealFraction < 0.9
  || d02ContextExclusion.hardRevealFraction > 0.94
  || d02ContextExclusion.contactFraction < 0.02
  || d02ContextExclusion.contactFraction > 0.06
  || d02ContextExclusion.outsideDistrictContactPixels > 512
  || d03ContextExclusion.method
    !== "continuous-D03-context-exclusion-plus-city-owned-L4_1-grounding"
  || d03ContextExclusion.mask.dimensions.join(",") !== "1448,1086"
  || d03ContextExclusion.contactLayer.dimensions.join(",") !== "1448,1086"
  || d03ContextExclusion.terrainIntegrationLayer.dimensions.join(",") !== "1448,1086"
  || d03ContextExclusion.hardRevealFraction < 0.9
  || d03ContextExclusion.hardRevealFraction > 0.97
  || d03ContextExclusion.contactFraction < 0.02
  || d03ContextExclusion.contactFraction > 0.08
  || d03ContextExclusion.terrainIntegrationFraction < 0.02
  || d03ContextExclusion.terrainIntegrationFraction > 0.1
  || d04ContextExclusion.method
    !== "continuous-D04-context-exclusion-plus-city-owned-L4_0-L4_1-and-L4_3-detail"
  || d04ContextExclusion.mask.dimensions.join(",") !== "1448,1086"
  || d04ContextExclusion.contactLayer.dimensions.join(",") !== "1448,1086"
  || d04ContextExclusion.waterDetailLayer.dimensions.join(",") !== "1448,1086"
  || d04ContextExclusion.gatewayLayer.dimensions.join(",") !== "1318,1193"
  || d04ContextExclusion.hardRevealFraction < 0.9
  || d04ContextExclusion.hardRevealFraction > 0.94
  || d04ContextExclusion.contactFraction < 0.015
  || d04ContextExclusion.contactFraction > 0.06
  || d04ContextExclusion.outsideDistrictContactPixels > 256
  || d04ContextExclusion.waterDetailPixels < 50
  || d04ContextExclusion.waterDetailPixels > 200
  || d05ContextExclusion.method
    !== "continuous-D05-context-exclusion-plus-city-owned-L4_1-grounding"
  || d05ContextExclusion.mask.dimensions.join(",") !== "1448,1086"
  || d05ContextExclusion.contactLayer.dimensions.join(",") !== "1448,1086"
  || d05ContextExclusion.terrainIntegrationLayer.dimensions.join(",") !== "1448,1086"
  || d05ContextExclusion.terraceMassLayer.dimensions.join(",") !== "524,364"
  || d05ContextExclusion.terraceMassPlacement.anchor.join(",") !== "122,646"
  || d05ContextExclusion.terraceMassPlacement.baseSize.join(",") !== "524,364"
  || d05ContextExclusion.terraceMassPlacement.scale !== 1
  || d05ContextExclusion.hardRevealFraction < 0.96
  || d05ContextExclusion.hardRevealFraction > 0.99
  || d05ContextExclusion.contactFraction < 0.015
  || d05ContextExclusion.contactFraction > 0.05
  || d05ContextExclusion.terrainIntegrationFraction < 0.015
  || d05ContextExclusion.terrainIntegrationFraction > 0.06
  || d05ContextExclusion.terraceMassFraction < 0.04
  || d05ContextExclusion.terraceMassFraction > 0.1
  || !Number.isFinite(waterCoverage)
  || waterCoverage > manifest.verification.maximumInlandWaterCoverageFraction
  || waterLayer?.id !== "L4_0"
  || contextLayer?.id !== "L4"
  || Object.keys(runtimeAssets).length !== Object.keys(expectedRuntimeAssetContract).length
  || Object.entries(expectedRuntimeAssetContract).some(([id, expected]) => {
    const runtimeAsset = runtimeAssets[id as NinjaOneCapitalCityRuntimeAssetId];
    return runtimeAsset?.id !== id
      || runtimeAsset.layerId !== expected.layerId
      || runtimeAsset.tiers.join(",") !== expected.tiers
      || runtimeAsset.asset.path.includes("/_review/")
      || (
        id === "D03L04"
        || id === "D05L04"
        || id === "I20"
        || id === "I24"
        || id === "S14D04"
      )
        !== Boolean(runtimeAsset.placement)
      || (runtimeAsset.placement !== undefined && (
        !Number.isFinite(runtimeAsset.placement.scale)
        || runtimeAsset.placement.scale <= 0
      ))
      || expectedSourceWindowAssetIds.has(id as NinjaOneCapitalCityRuntimeAssetId)
        !== Boolean(runtimeAsset.sourceWindow)
      || (runtimeAsset.sourceWindow !== undefined && (
        runtimeAsset.sourceWindow.sourceDimensions.join(",") !== "1448,1086"
        || runtimeAsset.sourceWindow.origin.some((coordinate) => coordinate < 0)
        || runtimeAsset.sourceWindow.origin[0] + runtimeAsset.asset.dimensions[0]
          > runtimeAsset.sourceWindow.sourceDimensions[0]
        || runtimeAsset.sourceWindow.origin[1] + runtimeAsset.asset.dimensions[1]
          > runtimeAsset.sourceWindow.sourceDimensions[1]
        || runtimeAsset.sourceWindow.sourcePath.includes("/_review/")
        || !/^[0-9a-f]{64}$/.test(runtimeAsset.sourceWindow.sourceSha256)
      ));
  })
) {
  throw new TypeError("NinjaOne Capital r3 foundation violates its registered layer contract.");
}

export const NINJAONE_CAPITAL_CITY_R3_AUTHORITY_ID = manifest.id;
export const NINJAONE_CAPITAL_CITY_R3_ARTBOARD = pair(
  manifest.authority.artboard,
  "city-foundation-r3.authority.artboard",
);
export const NINJAONE_CAPITAL_CITY_R3_WORLD_ORIGIN = NINJAONE_ENVIRONMENT_WORLD_ORIGIN;
export const NINJAONE_CAPITAL_CITY_R3_WORLD_SPAN = NINJAONE_ENVIRONMENT_WORLD_SPAN;
export const NINJAONE_CAPITAL_CITY_R3_CONTEXT = artifact(
  contextLayer.asset,
  "city-foundation-r3.context",
);
export const NINJAONE_CAPITAL_CITY_R3_PROGRESSIVE_WATER_EXCLUSION_MASK = artifact(
  progressiveWaterExclusion.mask,
  "city-foundation-r3.progressiveDetailWaterExclusion.mask",
);
export const NINJAONE_CAPITAL_CITY_R3_D01_CONTEXT_EXCLUSION_MASK = artifact(
  d01ContextExclusion.mask,
  "city-foundation-r3.progressiveDistrictContextExclusions.D01.mask",
);
export const NINJAONE_CAPITAL_CITY_R3_D02_CONTEXT_EXCLUSION_MASK = artifact(
  d02ContextExclusion.mask,
  "city-foundation-r3.progressiveDistrictContextExclusions.D02.mask",
);
export const NINJAONE_CAPITAL_CITY_R3_D03_CONTEXT_EXCLUSION_MASK = artifact(
  d03ContextExclusion.mask,
  "city-foundation-r3.progressiveDistrictContextExclusions.D03.mask",
);
export const NINJAONE_CAPITAL_CITY_R3_D04_CONTEXT_EXCLUSION_MASK = artifact(
  d04ContextExclusion.mask,
  "city-foundation-r3.progressiveDistrictContextExclusions.D04.mask",
);
export const NINJAONE_CAPITAL_CITY_R3_D05_CONTEXT_EXCLUSION_MASK = artifact(
  d05ContextExclusion.mask,
  "city-foundation-r3.progressiveDistrictContextExclusions.D05.mask",
);
export const NINJAONE_CAPITAL_CITY_R3_TERRITORY = artifact(
  manifest.deliveries.territory,
  "city-foundation-r3.territory",
);
export const NINJAONE_CAPITAL_CITY_R3_WATER_INTERACTION = artifact(
  waterLayer.asset,
  "city-foundation-r3.waterInteraction",
);
export const NINJAONE_CAPITAL_CITY_R3_WATER_COVERAGE = waterCoverage;
export const NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS = runtimeAssets;
