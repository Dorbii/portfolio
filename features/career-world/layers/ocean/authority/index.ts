// Transitional implementation boundary: L1 owns registered open water.
// Shared WebGL code remains in water-surface until extracted independently of
// the accepted renderer behavior.
export { WaterSurfaceCanvas } from "../../water-surface/components/WaterSurfaceCanvas";
export type { WaterRenderState } from "../../water-surface/components/WaterSurfaceCanvas";

export const OCEAN_AUTHORITY_LAYER_ID = "L1" as const;
