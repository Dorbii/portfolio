import type { LayerDescriptor } from "../../shared/layers";

export const STRUCTURES_LAYER: LayerDescriptor = Object.freeze({
  id: "structures",
  order: 6,
  status: "deferred",
  owns: Object.freeze([
    "employer structures",
    "project structures",
    "skill structures",
    "landmarks",
  ]),
});

