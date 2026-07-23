import type { LayerDescriptor } from "../../shared/layers";

export { TerritoryLandform } from "./components/TerritoryLandform";
export { TERRITORIES } from "./model/territories";

export const TERRITORY_LANDFORM_LAYER: LayerDescriptor = Object.freeze({
  id: "territory-landform",
  order: 3,
  status: "active",
  owns: Object.freeze([
    "land geography",
    "land material",
    "baked inner contact edge",
    "territory masks",
  ]),
});

