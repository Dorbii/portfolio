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

if (
  manifest.schemaVersion !== 1
  || manifest.id !== "career-world/capitals/ninjaone/city-foundation@r3"
  || manifest.status !== "active-registered-foundation"
  || manifest.authority.artboard.join(",") !== "1448,1086"
  || manifest.authority.ownership.globalWater !== "L1-and-L3-immutable"
  || manifest.authority.ownership.globalLand !== "L2-immutable"
  || manifest.authority.ownership.cityWaterInteraction !== "L4_0-reversible"
  || manifest.authority.ownership.cityLandscapeModification !== "L4_1-reversible"
  || manifest.authority.waterRegistration.retainedComponentPixels.length !== 2
  || manifest.authority.waterRegistration.rejectedComponents?.length !== 1
  || manifest.authority.waterRegistration.rejectedComponents[0].reason
    !== "false-positive-city-shadow-pocket"
  || !Number.isFinite(waterCoverage)
  || waterCoverage > manifest.verification.maximumInlandWaterCoverageFraction
  || waterLayer?.id !== "L4_0"
  || contextLayer?.id !== "L4"
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
export const NINJAONE_CAPITAL_CITY_R3_TERRITORY = artifact(
  manifest.deliveries.territory,
  "city-foundation-r3.territory",
);
export const NINJAONE_CAPITAL_CITY_R3_WATER_INTERACTION = artifact(
  waterLayer.asset,
  "city-foundation-r3.waterInteraction",
);
export const NINJAONE_CAPITAL_CITY_R3_WATER_COVERAGE = waterCoverage;
