import type { LayerDescriptor } from "../../shared/layers";

export {
  WorldInterface,
  type LandmarkLabel,
} from "./components/WorldInterface";

export const INTERFACE_LAYER: LayerDescriptor = Object.freeze({
  id: "interface",
  order: 8,
  status: "active",
  owns: Object.freeze([
    "focus controls",
    "selection state",
    "QA overlays",
    "render diagnostics",
  ]),
});
