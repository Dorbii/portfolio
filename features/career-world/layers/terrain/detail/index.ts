export const TERRAIN_DETAIL_LAYER_ID = "L2_1" as const;

export { NinjaOneEnvironmentNativeDetail } from "./components/NinjaOneEnvironmentNativeDetail";
export { TerrainDetailLayer } from "./components/TerrainDetailLayer";
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
