import type { LayerDescriptor } from "../../shared/layers.ts";

export const WATER_LAYER: LayerDescriptor = Object.freeze({
  id: "water", order: 1, status: "active",
  owns: Object.freeze(["ocean and coastal water", "inland surfaces and flow", "water material response to shared lighting"]),
});
export const WATER_SUBLAYERS = Object.freeze([
  Object.freeze({ id: "ocean", parent: "water", authority: "L1_0" }),
  Object.freeze({ id: "inland", parent: "water", authority: "L3" }),
]);
