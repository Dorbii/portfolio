export type EnvironmentLayerId =
  | "L1"
  | "L1_0"
  | "L1_1"
  | "L1_2"
  | "L1_3"
  | "L1_4"
  | "L1_5"
  | "L2"
  | "L2_1"
  | "L2_2"
  | "L2_3"
  | "L3"
  | "L3_1"
  | "L3_2"
  | "L3_4"
  | "L4"
  | "L4_0"
  | "L4_1"
  | "L4_2"
  | "L4_3"
  | "L4_4"
  | "L4_5"
  | "L4_6"
  | "L4_7"
  | "L4_8"
  | "L5"
  | "L5_1"
  | "L5_2";
// Lighting owns land/water illumination; historical layer IDs remain stable.

export interface EnvironmentLayerDefinition {
  readonly available: boolean;
  readonly id: EnvironmentLayerId;
  readonly label: string;
  readonly parentId?: EnvironmentLayerId;
  readonly owns: string;
}

export type EnvironmentLayerVisibility = Readonly<
  Record<EnvironmentLayerId, boolean>
>;

export const ENVIRONMENT_LAYER_DEFINITIONS: readonly EnvironmentLayerDefinition[] =
  Object.freeze([
    Object.freeze({
      available: true,
      id: "L1",
      label: "Water authority",
      owns: "ocean and inland water, independently of terrain and shared lighting",
    }),
    Object.freeze({
      available: true,
      id: "L1_0",
      label: "Ocean",
      owns: "open-water surface and coastal response",
      parentId: "L1",
    }),
    Object.freeze({
      available: true,
      id: "L1_1",
      label: "Ocean motion",
      owns: "time-varying open-water surface",
      parentId: "L1_0",
    }),
    Object.freeze({
      available: true,
      id: "L1_2",
      label: "Coastal ambience",
      owns: "wet shoreline contact, swash, breakers, and foam",
      parentId: "L1_0",
    }),
    Object.freeze({
      available: true,
      id: "L1_3",
      label: "Ocean seabed",
      owns: "submerged shelves, rock and sand following the current island coastline",
      parentId: "L1_0",
    }),
    Object.freeze({
      available: true,
      id: "L1_4",
      label: "Ocean details",
      owns: "coral, reefs and marine growth above the land in compositing order, viewed through water optics",
      parentId: "L1_0",
    }),
    Object.freeze({
      available: true,
      id: "L1_5",
      label: "Aquatic life",
      owns: "submerged schools and rays under shared water optics; motion follows the ocean clock",
      parentId: "L1_0",
    }),
    Object.freeze({
      available: true,
      id: "L2",
      label: "Land authority",
      owns: "authored land grid and derived terrain pyramid",
    }),
    Object.freeze({
      available: true,
      id: "L2_1",
      label: "Terrain detail",
      owns: "independently toggleable relief, trails, rocks, and ecology",
      parentId: "L2",
    }),
    Object.freeze({
      available: true,
      id: "L2_2",
      label: "Tree and foliage motion",
      owns: "LOD-gated pooled canopy and foliage animation",
      parentId: "L2",
    }),
    Object.freeze({
      available: false,
      id: "L2_3",
      label: "Dynamic terrain shadows",
      owns: "future world-light-driven supplemental shadows",
      parentId: "L2",
    }),
    Object.freeze({
      available: true,
      id: "L3",
      label: "Inland water",
      owns: "registered rivers, lakes, rapids, and waterfall geometry",
      parentId: "L1",
    }),
    Object.freeze({
      available: true,
      id: "L3_1",
      label: "Inland-water motion",
      owns: "currents, ripples, waterfall flow, and reflections",
      parentId: "L3",
    }),
    Object.freeze({
      available: true,
      id: "L3_2",
      label: "Inland-water effects",
      owns: "foam, impact rings, mist, and spray",
      parentId: "L3",
    }),
    Object.freeze({
      available: true,
      id: "L3_4",
      label: "Inland bed",
      owns: "submerged sand and mineral stones; depth and surface optics remain independent",
      parentId: "L3",
    }),
    Object.freeze({
      available: true,
      id: "L4",
      label: "City authority",
      owns: "registered city cohorts and every reversible city-owned modification above immutable land and water authorities",
    }),
    Object.freeze({
      available: true,
      id: "L4_0",
      label: "City water interaction",
      owns: "local under-bridge darkening, waterfront contact, ripples, reflections, and flow deflection without replacing global water",
      parentId: "L4",
    }),
    Object.freeze({
      available: true,
      id: "L4_1",
      label: "City landscape and circulation",
      owns: "reversible registered terraces, retaining walls, ground transitions, roads, and pedestrian paths",
      parentId: "L4",
    }),
    Object.freeze({
      available: true,
      id: "L4_2",
      label: "City transportation",
      owns: "registered train-free station infrastructure; moving trains remain independent L4_7 actors",
      parentId: "L4",
    }),
    Object.freeze({
      available: true,
      id: "L4_3",
      label: "Primary city buildings",
      owns: "package-registered capital landmarks and skill buildings",
      parentId: "L4",
    }),
    Object.freeze({
      available: true,
      id: "L4_4",
      label: "Secondary city fabric",
      owns: "parent-derived and registered secondary fabric and detail overlays without replacing land or water",
      parentId: "L4",
    }),
    Object.freeze({
      available: true,
      id: "L4_5",
      label: "Street details",
      owns: "small civic and service props admitted only with registered placement",
      parentId: "L4",
    }),
    Object.freeze({
      available: true,
      id: "L4_6",
      label: "Urban foliage",
      owns: "registered reuse of existing L2 tree assets only; no generated city vegetation",
      parentId: "L4",
    }),
    Object.freeze({
      available: true,
      id: "L4_7",
      label: "City actors and effects",
      owns: "independent moving train and restrained local temporal cues; the train is currently deferred",
      parentId: "L4",
    }),
    Object.freeze({
      available: true,
      id: "L4_8",
      label: "City coast modification",
      owns: "registered city-owned extensions to the coastline, exported as the coast authority the ocean solve consumes",
      parentId: "L4",
    }),
    Object.freeze({ available: true, id: "L5", label: "Shared lighting", owns: "world light, daylight cycle and common cloud shadows" }),
    Object.freeze({ available: true, id: "L5_1", parentId: "L5", label: "Land lighting", owns: "land illumination and the shared cloud field; terrain alpha unchanged" }),
    Object.freeze({ available: true, id: "L5_2", parentId: "L5", label: "Water lighting", owns: "water material lighting and the same world-registered cloud field" }),
  ]);

export const DEFAULT_ENVIRONMENT_LAYER_VISIBILITY: EnvironmentLayerVisibility =
  Object.freeze({
    L1: true,
    L1_0: true,
    L1_1: true,
    // Owns "wet shoreline contact, swash, breakers, and foam" -- and it was off,
    // which is why the default view had none of them. The flag predates the
    // water: it was written when L1 drew a flat fill and there was no spray pass
    // to switch on. There is one now, it runs every frame either way (only its
    // gain is zeroed), so this costs nothing and is the difference between a sea
    // that meets the rock and a sea that stops at it.
  L1_2: true,
  L1_3: true,
  L1_4: true,
  L1_5: true,
    L2: true,
    L2_1: true,
    L2_2: true,
    L2_3: false,
    L3: true,
    L3_1: true,
    L3_2: true,
    L3_4: true,
    L4: true,
    L4_0: true,
    L4_1: true,
    L4_2: true,
    L4_3: true,
    L4_4: true,
    L4_5: true,
    L4_6: true,
    L4_7: true,
    L4_8: true,
    L5: true,
    L5_1: true,
    L5_2: true,
  });

const ENVIRONMENT_LAYER_BY_ID = new Map(
  ENVIRONMENT_LAYER_DEFINITIONS.map((layer) => [layer.id, layer]),
);

export function isEnvironmentLayerEffectivelyVisible(
  visibility: EnvironmentLayerVisibility,
  id: EnvironmentLayerId,
): boolean {
  const layer = ENVIRONMENT_LAYER_BY_ID.get(id);
  if (!layer?.available || !visibility[id]) {
    return false;
  }
  return layer.parentId ? isEnvironmentLayerEffectivelyVisible(visibility, layer.parentId) : true;
}
