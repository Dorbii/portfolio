import type { LayerDescriptor } from "../../shared/layers";

export { TerritoryLandform } from "./components/TerritoryLandform";
export { TERRAIN_SITE_TILES } from "./model/siteTiles";
export { TERRITORIES } from "./model/territories";

export const TERRITORY_LANDFORM_LAYER: LayerDescriptor = Object.freeze({
  id: "territory-landform",
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
