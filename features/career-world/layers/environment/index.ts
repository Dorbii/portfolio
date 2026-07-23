import type { LayerDescriptor } from "../../shared/layers";

export const ENVIRONMENT_LAYER: LayerDescriptor = Object.freeze({
  id: "environment",
  order: 5,
  status: "deferred",
  owns: Object.freeze(["vegetation", "rocks", "logs", "signs"]),
});

