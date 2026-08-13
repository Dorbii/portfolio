import type { LayerDescriptor } from "../../shared/layers";

export {
  OCEAN_AUTHORITY_LAYER_ID,
  WaterSurfaceCanvas,
  type WaterRenderState,
} from "./authority";
export { OCEAN_SURFACE_MOTION_LAYER_ID } from "./surface-motion";
export { OCEAN_COASTAL_AMBIENCE_LAYER_ID } from "./coastal-ambience";

export const OCEAN_LAYER: LayerDescriptor = Object.freeze({
  id: "ocean",
  order: 2,
  status: "active",
  owns: Object.freeze([
    "open-water motion",
    "water-side shelf response",
    "base contact response",
  ]),
});
