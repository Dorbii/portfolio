import manifest from "../../../../../public/career-world/cities/kaizen-agent/manifests/structure-shadows-runtime-r1.json" with { type: "json" };
import { KAIZEN_CITY_REGISTRATION } from "../../../shared/kaizenCityRegistration.ts";

export interface KaizenStructureShadowProjection {
  readonly baseLengthRatio: number;
  readonly baseWidthRatio: number;
  readonly contactOpacity: number;
  readonly farWidthRatio: number;
  readonly lowSunLengthRatio: number;
  readonly maximumOpacity: number;
  readonly minimumElevation: number;
}

const projectionValues = Object.values(manifest.projection);

if (
  manifest.schemaVersion !== 1
  || manifest.id
    !== "career-world/kaizen-agent/structure-shadows-runtime@r1"
  || manifest.registrationRef !== KAIZEN_CITY_REGISTRATION
  || manifest.coordinateSpace !== "registered-plate-pixels"
  || manifest.contract !== "anchor-derived-world-light-vectors"
  || manifest.lightSource !== "career-world/world-light@r1"
  || projectionValues.some((value) => !Number.isFinite(value) || value < 0)
) {
  throw new TypeError("Kaizen structure shadow runtime manifest is invalid.");
}

export const KAIZEN_STRUCTURE_SHADOW_CONTRACT = manifest.contract;
export const KAIZEN_STRUCTURE_SHADOW_LIGHT_SOURCE = manifest.lightSource;
export const KAIZEN_STRUCTURE_SHADOW_PROJECTION:
KaizenStructureShadowProjection = Object.freeze({
  baseLengthRatio: manifest.projection.baseLengthRatio,
  baseWidthRatio: manifest.projection.baseWidthRatio,
  contactOpacity: manifest.projection.contactOpacity,
  farWidthRatio: manifest.projection.farWidthRatio,
  lowSunLengthRatio: manifest.projection.lowSunLengthRatio,
  maximumOpacity: manifest.projection.maximumOpacity,
  minimumElevation: manifest.projection.minimumElevation,
});
