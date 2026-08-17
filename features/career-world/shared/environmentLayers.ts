export type EnvironmentLayerId =
  | "L1"
  | "L1_1"
  | "L1_2"
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
  | "L4_7";

export interface EnvironmentLayerDefinition {
  readonly available: boolean;
  readonly id: EnvironmentLayerId;
  readonly label: string;
  readonly parentId?: Extract<EnvironmentLayerId, "L1" | "L2" | "L3" | "L4">;
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
      label: "Ocean authority",
      owns: "registered open-water extent and coastline contact",
    }),
    Object.freeze({
      available: true,
      id: "L1_1",
      label: "Ocean motion",
      owns: "time-varying open-water surface",
      parentId: "L1",
    }),
    Object.freeze({
      available: true,
      id: "L1_2",
      label: "Coastal ambience",
      owns: "wet shoreline contact, swash, breakers, and foam",
      parentId: "L1",
    }),
    Object.freeze({
      available: true,
      id: "L2",
      label: "Land authority",
      owns: "frozen registered r2 terrain master",
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
      label: "Inland-water authority",
      owns: "registered rivers, lakes, rapids, and waterfall geometry",
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
      label: "Inland habitat detail",
      owns: "deterministic submerged stones, wood, reeds, and aquatic vegetation",
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
      owns: "provisional rail and transport nodes pending the registered D06 proof",
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
      owns: "provisional inferred fabric pending district-level registration",
      parentId: "L4",
    }),
    Object.freeze({
      available: true,
      id: "L4_5",
      label: "Street details",
      owns: "small civic and service props with inferred placement unless explicitly registered",
      parentId: "L4",
    }),
    Object.freeze({
      available: true,
      id: "L4_6",
      label: "Urban foliage",
      owns: "city vegetation with inferred placement unless explicitly registered above L2 foliage",
      parentId: "L4",
    }),
    Object.freeze({
      available: true,
      id: "L4_7",
      label: "City actors and effects",
      owns: "moving trains and restrained local temporal cues",
      parentId: "L4",
    }),
  ]);

export const DEFAULT_ENVIRONMENT_LAYER_VISIBILITY: EnvironmentLayerVisibility =
  Object.freeze({
    L1: true,
    L1_1: true,
    L1_2: true,
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
  return layer.parentId ? visibility[layer.parentId] : true;
}
