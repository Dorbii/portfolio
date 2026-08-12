import type { LayerDescriptor } from "../../shared/layers";

export { WaterSurfaceCanvas } from "./components/WaterSurfaceCanvas";
export { NinjaOneInlandWaterCanvas } from "./components/NinjaOneInlandWaterCanvas";
export type { WaterRenderState } from "./components/WaterSurfaceCanvas";

export const WATER_SURFACE_LAYER: LayerDescriptor = Object.freeze({
  id: "water-surface",
  order: 2,
  status: "active",
  owns: Object.freeze([
    "open-water motion",
    "water-side shelf response",
    "base contact response",
  ]),
});

