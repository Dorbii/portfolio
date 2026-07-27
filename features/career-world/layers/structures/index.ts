import type { LayerDescriptor } from "../../shared/layers";

export const STRUCTURES_LAYER: LayerDescriptor = Object.freeze({
  id: "structures",
  order: 6,
  status: "active",
  owns: Object.freeze([
    "employer structures",
    "project structures",
    "skill structures",
    "utility structures",
    "landmarks",
  ]),
});

export { StructuresLayer } from "./components/StructuresLayer";
export {
  CAPITAL_NODE_POLICY,
  CAPITAL_STRUCTURES,
  type CapitalStructure,
} from "./model/capitals";
