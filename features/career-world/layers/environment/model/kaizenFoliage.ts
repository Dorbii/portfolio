import type { Pair } from "../../../shared/camera";

export interface FoliageResource {
  readonly crop: readonly [number, number, number, number];
  readonly id: string;
}

export interface FoliageInstance {
  readonly anchor: Pair;
  readonly durationSeconds: number;
  readonly id: string;
  readonly phaseSeconds: number;
  readonly resourceId: FoliageResource["id"];
  readonly scale: number;
}

export const NINJAONE_FOLIAGE_POOL_ID = "ninjaone-foliage-pool-r1";
export const NINJAONE_FOLIAGE_ATLAS_PATH =
  "/career-world/layers/environment/textures/ninjaone/ninjaone-foliage-atlas-r1.png";
export const NINJAONE_FOLIAGE_ATLAS_DIMENSIONS = [1254, 1254] as const;

export const NINJAONE_FOLIAGE_RESOURCES: readonly FoliageResource[] =
  Object.freeze([
    Object.freeze({
      crop: Object.freeze([192, 103, 314, 494] as const),
      id: "street-tree-planter",
    }),
    Object.freeze({
      crop: Object.freeze([676, 88, 485, 539] as const),
      id: "paired-street-trees",
    }),
    Object.freeze({
      crop: Object.freeze([130, 706, 406, 376] as const),
      id: "fern-cluster",
    }),
    Object.freeze({
      crop: Object.freeze([670, 627, 468, 513] as const),
      id: "flowering-hedge",
    }),
  ]);

const KAIZEN_PLATE_ORIGIN = [0.25925, 0.135737] as const;
const KAIZEN_PLATE_SPAN = [0.1065, 0.1893] as const;
const KAIZEN_PLATE_SIZE = 1254;

function kaizenPlateAnchor(x: number, y: number): Pair {
  return Object.freeze([
    KAIZEN_PLATE_ORIGIN[0] + (x / KAIZEN_PLATE_SIZE) * KAIZEN_PLATE_SPAN[0],
    KAIZEN_PLATE_ORIGIN[1] + (y / KAIZEN_PLATE_SIZE) * KAIZEN_PLATE_SPAN[1],
  ]);
}

export const KAIZEN_FOLIAGE_INSTANCES: readonly FoliageInstance[] =
  Object.freeze([
    {
      anchor: kaizenPlateAnchor(276, 342),
      durationSeconds: 6.4,
      id: "kaizen-tree-01",
      phaseSeconds: -1.1,
      resourceId: "street-tree-planter",
      scale: 0.025,
    },
    {
      anchor: kaizenPlateAnchor(1010, 385),
      durationSeconds: 6.9,
      id: "kaizen-tree-02",
      phaseSeconds: -4.2,
      resourceId: "street-tree-planter",
      scale: 0.023,
    },
    {
      anchor: kaizenPlateAnchor(302, 781),
      durationSeconds: 5.9,
      id: "kaizen-tree-03",
      phaseSeconds: -2.8,
      resourceId: "street-tree-planter",
      scale: 0.024,
    },
    {
      anchor: kaizenPlateAnchor(969, 864),
      durationSeconds: 6.7,
      id: "kaizen-tree-04",
      phaseSeconds: -5.4,
      resourceId: "street-tree-planter",
      scale: 0.022,
    },
    {
      anchor: kaizenPlateAnchor(535, 484),
      durationSeconds: 7.1,
      id: "kaizen-pair-01",
      phaseSeconds: -3.3,
      resourceId: "paired-street-trees",
      scale: 0.019,
    },
    {
      anchor: kaizenPlateAnchor(744, 675),
      durationSeconds: 6.2,
      id: "kaizen-pair-02",
      phaseSeconds: -0.7,
      resourceId: "paired-street-trees",
      scale: 0.018,
    },
    {
      anchor: kaizenPlateAnchor(190, 632),
      durationSeconds: 5.4,
      id: "kaizen-fern-01",
      phaseSeconds: -3.9,
      resourceId: "fern-cluster",
      scale: 0.02,
    },
    {
      anchor: kaizenPlateAnchor(1090, 692),
      durationSeconds: 5.8,
      id: "kaizen-fern-02",
      phaseSeconds: -1.8,
      resourceId: "fern-cluster",
      scale: 0.019,
    },
    {
      anchor: kaizenPlateAnchor(623, 1044),
      durationSeconds: 5.2,
      id: "kaizen-fern-03",
      phaseSeconds: -4.7,
      resourceId: "fern-cluster",
      scale: 0.018,
    },
    {
      anchor: kaizenPlateAnchor(421, 895),
      durationSeconds: 7.3,
      id: "kaizen-hedge-01",
      phaseSeconds: -2.1,
      resourceId: "flowering-hedge",
      scale: 0.019,
    },
    {
      anchor: kaizenPlateAnchor(850, 958),
      durationSeconds: 6.6,
      id: "kaizen-hedge-02",
      phaseSeconds: -5.6,
      resourceId: "flowering-hedge",
      scale: 0.018,
    },
    {
      anchor: kaizenPlateAnchor(740, 318),
      durationSeconds: 7,
      id: "kaizen-hedge-03",
      phaseSeconds: -0.4,
      resourceId: "flowering-hedge",
      scale: 0.017,
    },
  ].map((instance) => Object.freeze(instance)));

const RESOURCE_BY_ID = new Map(
  NINJAONE_FOLIAGE_RESOURCES.map((resource) => [resource.id, resource]),
);

export function resolveNinjaOneFoliageResource(
  id: FoliageResource["id"],
): FoliageResource {
  const resource = RESOURCE_BY_ID.get(id);
  if (!resource) {
    throw new Error(`Unknown NinjaOne foliage resource: ${id}`);
  }
  return resource;
}
