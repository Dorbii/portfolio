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
  | "L3_3";

export interface EnvironmentLayerDefinition {
  readonly available: boolean;
  readonly id: EnvironmentLayerId;
  readonly label: string;
  readonly parentId?: Extract<EnvironmentLayerId, "L1" | "L2" | "L3">;
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
      available: false,
      id: "L1_2",
      label: "Coastal ambience",
      owns: "future isolated foam, spray, and marine accents",
      parentId: "L1",
    }),
    Object.freeze({
      available: true,
      id: "L2",
      label: "NinjaOne terrain authority",
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
      label: "Terrain wildlife",
      owns: "LOD-gated habitat-registered wildlife accents",
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
      id: "L3_3",
      label: "Aquatic life",
      owns: "LOD-gated procedural fish silhouettes",
      parentId: "L3",
    }),
  ]);

export const DEFAULT_ENVIRONMENT_LAYER_VISIBILITY: EnvironmentLayerVisibility =
  Object.freeze({
    L1: true,
    L1_1: true,
    L1_2: false,
    L2: true,
    L2_1: true,
    L2_2: true,
    L2_3: false,
    L3: true,
    L3_1: true,
    L3_2: true,
    L3_3: true,
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
