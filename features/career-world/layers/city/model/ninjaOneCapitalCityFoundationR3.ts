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
  | "D03L02"
  | "D03L03"
  | "D05L02"
  | "D05L03"
  | "I20"
  | "I21"
  | "LFX06"
  | "WFX01";

export interface NinjaOneCapitalCityRuntimeAsset {
  readonly asset: NinjaOneCapitalCityArtifact;
  readonly id: NinjaOneCapitalCityRuntimeAssetId;
  readonly layerId: "L4_0" | "L4_1" | "L4_2" | "L4_4";
  readonly placement?: {
    readonly anchor: Pair;
    readonly baseSize: Pair;
    readonly scale: number;
  };
  readonly role: string;
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
const d03ContextExclusion = manifest.authority.progressiveDistrictContextExclusions.D03;
const d05ContextExclusion = manifest.authority.progressiveDistrictContextExclusions.D05;
const rawRuntimeAssets = manifest.runtimeAssets as unknown as readonly (
  Omit<NinjaOneCapitalCityRuntimeAsset, "asset" | "placement"> & {
    readonly asset: Omit<NinjaOneCapitalCityArtifact, "dimensions"> & {
      readonly dimensions: readonly number[];
    };
    readonly placement?: {
      readonly anchor: readonly number[];
      readonly baseSize: readonly number[];
      readonly scale: number;
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
    tiers: Object.freeze([...entry.tiers]),
  }),
]))) as Readonly<Record<NinjaOneCapitalCityRuntimeAssetId, NinjaOneCapitalCityRuntimeAsset>>;
const expectedRuntimeAssetContract = Object.freeze({
  CFX01: Object.freeze({ layerId: "L4_4", tiers: "site,close" }),
  CFX02: Object.freeze({ layerId: "L4_4", tiers: "close" }),
  D01L02: Object.freeze({ layerId: "L4_1", tiers: "site,close" }),
  D03L02: Object.freeze({ layerId: "L4_1", tiers: "site,close" }),
  D03L03: Object.freeze({ layerId: "L4_1", tiers: "site,close" }),
  D05L02: Object.freeze({ layerId: "L4_1", tiers: "site,close" }),
  D05L03: Object.freeze({ layerId: "L4_1", tiers: "site,close" }),
  I20: Object.freeze({ layerId: "L4_2", tiers: "capital" }),
  I21: Object.freeze({ layerId: "L4_2", tiers: "site,close" }),
  LFX06: Object.freeze({ layerId: "L4_1", tiers: "capital,site,close" }),
  WFX01: Object.freeze({ layerId: "L4_0", tiers: "site,close" }),
} as const);

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
  || d05ContextExclusion.method
    !== "continuous-D05-context-exclusion-plus-city-owned-L4_1-grounding"
  || d05ContextExclusion.mask.dimensions.join(",") !== "1448,1086"
  || d05ContextExclusion.contactLayer.dimensions.join(",") !== "1448,1086"
  || d05ContextExclusion.terrainIntegrationLayer.dimensions.join(",") !== "1448,1086"
  || d05ContextExclusion.hardRevealFraction < 0.96
  || d05ContextExclusion.hardRevealFraction > 0.99
  || d05ContextExclusion.contactFraction < 0.015
  || d05ContextExclusion.contactFraction > 0.05
  || d05ContextExclusion.terrainIntegrationFraction < 0.015
  || d05ContextExclusion.terrainIntegrationFraction > 0.06
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
      || (id === "I20" || id === "I21") !== Boolean(runtimeAsset.placement)
      || (runtimeAsset.placement !== undefined && (
        !Number.isFinite(runtimeAsset.placement.scale)
        || runtimeAsset.placement.scale <= 0
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
export const NINJAONE_CAPITAL_CITY_R3_D03_CONTEXT_EXCLUSION_MASK = artifact(
  d03ContextExclusion.mask,
  "city-foundation-r3.progressiveDistrictContextExclusions.D03.mask",
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
