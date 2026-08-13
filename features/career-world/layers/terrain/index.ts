import type { LayerDescriptor } from "../../shared/layers";

export {
  TERRAIN_AUTHORITY_LAYER_ID,
  TerritoryLandform,
} from "./authority";
export { NinjaOneEnvironmentProof } from "./components/NinjaOneEnvironmentProof";
export {
  NINJAONE_ENVIRONMENT_CAMERA,
  NINJAONE_ENVIRONMENT_PROOF_ID,
} from "./model/ninjaOneEnvironmentProof";
export { LAND_ASSETS } from "./model/assets";
export { TERRAIN_SITE_TILES } from "./model/siteTiles";
export { TERRITORIES } from "./model/territories";
export type { TerrainSiteTile } from "./model/siteTiles";
export type { Territory } from "./model/territories";
export {
  FoliageLayer,
  TERRAIN_DETAIL_LAYER_ID,
  TerrainDetailLayer,
} from "./detail";
export { TERRAIN_WILDLIFE_LAYER_ID } from "./wildlife";
export { TERRAIN_DYNAMIC_SHADOWS_LAYER_ID } from "./dynamic-shadows";

export const TERRAIN_LAYER: LayerDescriptor = Object.freeze({
  id: "terrain",
  order: 3,
  status: "active",
  owns: Object.freeze([
    "land geography",
    "macro elevation and slope",
    "registered terrain relief",
    "registered local terrain tiles",
    "territory masks",
  ]),
});
