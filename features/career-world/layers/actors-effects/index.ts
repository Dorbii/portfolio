import type { LayerDescriptor } from "../../shared/layers";

export const ACTORS_EFFECTS_LAYER: LayerDescriptor = Object.freeze({
  id: "actors-effects",
  order: 7,
  status: "active",
  owns: Object.freeze([
    "actors",
    "weather",
    "particles",
    "authored crash and foam accents",
  ]),
});

export { ActorsEffectsLayer } from "./components/ActorsEffectsLayer";
export {
  PEDESTRIAN_DIRECTIONS,
  PEDESTRIAN_INSTANCES,
  PEDESTRIAN_NODE_POLICY,
  PEDESTRIAN_OWNER_KINDS,
  RENDERED_PEDESTRIAN_INSTANCES,
  type PedestrianAppearance,
  type PedestrianDirection,
  type PedestrianInstance,
  type PedestrianOwnerKind,
} from "./model/pedestrians";
