// Transitional implementation boundary: L3 owns inland-water registration.
// The renderer remains in water-surface until its shared WebGL utilities are
// extracted without changing the accepted geometry or animation behavior.
export { NinjaOneInlandWaterCanvas } from "../../water-surface/components/NinjaOneInlandWaterCanvas";

export const INLAND_WATER_AUTHORITY_LAYER_ID = "L3" as const;
