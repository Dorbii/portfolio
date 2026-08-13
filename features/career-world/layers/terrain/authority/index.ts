// Transitional implementation boundary: L2 owns registered terrain.
// The streaming canvas remains in territory-landform until its data model and
// renderer can move together without invalidating terrain registration.
export { TerritoryLandform } from "../../territory-landform/components/TerritoryLandform";

export const TERRAIN_AUTHORITY_LAYER_ID = "L2" as const;
