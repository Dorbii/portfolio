import type { LayerDescriptor } from "../../shared/layers";

export const INFRASTRUCTURE_LAYER: LayerDescriptor = Object.freeze({
  id: "infrastructure",
  order: 4,
  status: "deferred",
  owns: Object.freeze(["roads", "trails", "docks", "bridges", "plazas"]),
});

