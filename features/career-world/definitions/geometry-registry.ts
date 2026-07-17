import type { CareerAssetId, GeometryDefinition } from "../geometry/types";
import { AMBIENT_GEOMETRY_DEFINITIONS } from "./ambient";
import { PROJECT_GEOMETRY_DEFINITIONS_A } from "./projects-a";
import { PROJECT_GEOMETRY_DEFINITIONS_B } from "./projects-b";
import { SKILL_GEOMETRY_DEFINITIONS_A } from "./skills-a";
import { SKILL_GEOMETRY_DEFINITIONS_B } from "./skills-b";
import { SKILL_GEOMETRY_DEFINITIONS_C } from "./skills-c";
import { WORLD_CITY_GEOMETRY_DEFINITIONS } from "./world-cities";

export const CAREER_WORLD_GEOMETRY_DEFINITIONS: readonly GeometryDefinition[] =
  Object.freeze([
    ...WORLD_CITY_GEOMETRY_DEFINITIONS,
    ...PROJECT_GEOMETRY_DEFINITIONS_A,
    ...PROJECT_GEOMETRY_DEFINITIONS_B,
    ...SKILL_GEOMETRY_DEFINITIONS_A,
    ...SKILL_GEOMETRY_DEFINITIONS_B,
    ...SKILL_GEOMETRY_DEFINITIONS_C,
    ...AMBIENT_GEOMETRY_DEFINITIONS,
  ]);

export const geometryDefinitionByAssetId = new Map<
  CareerAssetId,
  GeometryDefinition
>();

for (const definition of CAREER_WORLD_GEOMETRY_DEFINITIONS) {
  if (geometryDefinitionByAssetId.has(definition.assetId)) {
    throw new Error(`Duplicate Career World geometry ${definition.assetId}`);
  }
  geometryDefinitionByAssetId.set(definition.assetId, definition);
}

export function geometryForAsset(assetId: string): GeometryDefinition {
  const definition = geometryDefinitionByAssetId.get(assetId as CareerAssetId);
  if (!definition) throw new Error(`Missing Career World geometry ${assetId}`);
  return definition;
}
