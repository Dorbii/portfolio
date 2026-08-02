import type { LayerDescriptor } from "../../shared/layers";

export const ENVIRONMENT_LAYER: LayerDescriptor = Object.freeze({
  id: "environment",
  order: 5,
  status: "active",
  owns: Object.freeze([
    "authored frontage activity props",
    "lamps",
    "stalls",
    "carts",
    "benches",
    "rural close-detail scenery",
    "empty easter-egg slots",
    "deferred terrain details",
  ]),
});

export { EnvironmentLayer } from "./components/EnvironmentLayer";
export {
  ACTIVITY_PROP_INSTANCES,
  ACTIVITY_PROP_KINDS,
  ACTIVITY_PROP_OWNER_KINDS,
  ACTIVITY_PROP_SITE_POLICY,
  type ActivityPropInstance,
  type ActivityPropKind,
  type ActivityPropOwnerKind,
} from "./model/activityProps";
export {
  EMPTY_EASTER_EGG_SLOTS,
  RURAL_OUTSKIRTS_CLOSE_POLICY,
  RURAL_SCENERY_INSTANCES,
  RURAL_SCENERY_KINDS,
  type EmptyEasterEggSlot,
  type RuralSceneryInstance,
  type RuralSceneryKind,
} from "./model/ruralOutskirts";
