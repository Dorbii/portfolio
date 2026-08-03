import type { LayerDescriptor } from "../../shared/layers";

export const STRUCTURES_LAYER: LayerDescriptor = Object.freeze({
  id: "structures",
  order: 6,
  status: "active",
  owns: Object.freeze([
    "employer structures",
    "project structures",
    "skill structures",
    "utility structures",
    "landmarks",
  ]),
});

export { StructuresLayer } from "./components/StructuresLayer";
export {
  AMBIENT_NODE_POLICY,
  AMBIENT_STRUCTURE_ARCHETYPES,
  AMBIENT_STRUCTURE_INSTANCES,
  AMBIENT_STRUCTURE_OWNER_KINDS,
  AMBIENT_STRUCTURE_VISUAL_FAMILY,
  resolveAmbientAnchor,
  type AmbientStructureArchetype,
  type AmbientStructureInstance,
  type AmbientStructureOwnerKind,
} from "./model/ambient";
export {
  CAPITAL_NODE_POLICY,
  CAPITAL_STRUCTURES,
  type CapitalStructure,
} from "./model/capitals";
export {
  PROJECT_NODE_POLICY,
  PROJECT_STRUCTURE_VISUAL_FAMILY,
  PROJECT_STRUCTURES,
  resolveProjectAnchor,
  resolveProjectFocusView,
  type ProjectStructure,
} from "./model/projects";
export {
  SKILL_NODE_POLICY,
  SKILL_STRUCTURE_ARCHETYPES,
  SKILL_STRUCTURE_INSTANCES,
  SKILL_STRUCTURE_OWNER_KINDS,
  SKILL_STRUCTURE_VARIANT_POLICY,
  SKILL_STRUCTURE_VISUAL_FAMILY,
  resolveSkillAnchor,
  type SkillStructureArchetype,
  type SkillStructureInstance,
  type SkillStructureOwnerKind,
} from "./model/skills";
export {
  SUPPORT_NODE_POLICY,
  SUPPORT_STRUCTURE_ARCHETYPES,
  SUPPORT_STRUCTURE_INSTANCES,
  SUPPORT_STRUCTURE_ROLES,
  resolveSupportAnchor,
  type SupportStructureArchetype,
  type SupportStructureInstance,
  type SupportStructureRole,
} from "./model/support";
export {
  TOWN_FABRIC_INSTANCES,
  TOWN_FABRIC_NODE_POLICY,
  TOWN_FABRIC_OWNER_KINDS,
  type TownFabricBounds,
  type TownFabricInstance,
  type TownFabricOwnerKind,
} from "./model/townFabric";
export {
  CITY_ALLOCATION_OWNER_KINDS,
  NINJAONE_CITY_ALLOCATION_COVERAGE,
  NINJAONE_CITY_ALLOCATIONS,
  cityAllocationContains,
  type CityAllocation,
  type CityAllocationOwnerKind,
} from "./model/cityAllocations";
export {
  NINJAONE_CITY_ASSET_POOL,
  NINJAONE_CITY_ASSET_POOL_ID,
  NINJAONE_CITY_ASSET_ROLES,
  resolveNinjaOneCityAssetPath,
  resolveNinjaOneCityAssetResource,
  type NinjaOneCityAssetResource,
  type NinjaOneCityAssetRole,
} from "./model/ninjaOneCityAssets";
export {
  KAIZEN_SEMANTIC_ASSET_REGISTRATION,
  KAIZEN_SEMANTIC_STRUCTURE_ASSETS,
  resolveKaizenSemanticStructureAsset,
  type KaizenSemanticAssetRole,
  type KaizenSemanticStructureAsset,
} from "./model/kaizenSemanticAssets";
export {
  KAIZEN_NEIGHBORHOOD_ANCHOR,
  KAIZEN_NEIGHBORHOOD_PLATE_ALIGNMENT_Y,
  KAIZEN_NEIGHBORHOOD_SPAN,
} from "./model/kaizenNeighborhoodFabric";
export {
  resolveKaizenStructurePresentationAnchor,
  resolveKaizenStructurePresentationScale,
} from "./model/kaizenPresentation";
