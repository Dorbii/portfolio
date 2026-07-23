import type { LayerDescriptor } from "../../shared/layers";

export const ACTORS_EFFECTS_LAYER: LayerDescriptor = Object.freeze({
  id: "actors-effects",
  order: 7,
  status: "deferred",
  owns: Object.freeze([
    "actors",
    "weather",
    "particles",
    "authored crash and foam accents",
  ]),
});

