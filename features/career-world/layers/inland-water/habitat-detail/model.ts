import type { DetailTierId } from "../../../shared/lod";

export type InlandHabitatAssetId =
  | "submerged-woody-cover"
  | "bank-reed-tuft"
  | "submerged-grass-clump";

export interface InlandHabitatAsset {
  readonly dimensions: readonly [number, number];
  readonly id: InlandHabitatAssetId;
  readonly path: string;
}

export interface InlandHabitatPlacement {
  readonly angle: number;
  readonly assetId: InlandHabitatAssetId;
  readonly depthFraction: number;
  readonly id: string;
  readonly localPosition: readonly [number, number];
  readonly minimumTier: Extract<DetailTierId, "capital" | "site" | "close">;
  readonly mirrorX: boolean;
  readonly opacity: number;
  readonly screenWidthCapPx: number;
  readonly widthPx: number;
}

const SPRITE_ROOT =
  "/career-world/layers/inland-water/habitat-detail/sprites";

export const NINJAONE_INLAND_HABITAT_ASSETS: Readonly<
  Record<InlandHabitatAssetId, InlandHabitatAsset>
> = Object.freeze({
  "submerged-woody-cover": Object.freeze({
    dimensions: Object.freeze([384, 192] as const),
    id: "submerged-woody-cover",
    path: `${SPRITE_ROOT}/submerged-woody-cover-cluster-topdown-r2.png`,
  }),
  "bank-reed-tuft": Object.freeze({
    dimensions: Object.freeze([256, 256] as const),
    id: "bank-reed-tuft",
    path: `${SPRITE_ROOT}/bank-reed-tuft-topdown-r1.png`,
  }),
  "submerged-grass-clump": Object.freeze({
    dimensions: Object.freeze([256, 256] as const),
    id: "submerged-grass-clump",
    path: `${SPRITE_ROOT}/submerged-grass-clump-topdown-r1.png`,
  }),
});

type HabitatPlacementTuple = readonly [
  id: string,
  assetId: InlandHabitatAssetId,
  x: number,
  y: number,
  widthPx: number,
  screenWidthCapPx: number,
  angle: number,
  depthFraction: number,
  opacity: number,
  minimumTier: Extract<DetailTierId, "capital" | "site" | "close">,
  mirrorX: boolean,
];

const HABITAT_PLACEMENT_DATA: readonly HabitatPlacementTuple[] = Object.freeze([
  // Deep pond: clustered cover follows margins and shelves, leaving open water.
  ["pond-wood-west", "submerged-woody-cover", 553, 603, 94, 38, 0.28, 0.62, 0.52, "site", false],
  ["pond-wood-north", "submerged-woody-cover", 607, 571, 78, 34, -0.16, 0.67, 0.46, "site", true],
  ["pond-wood-east", "submerged-woody-cover", 661, 595, 86, 36, -0.56, 0.66, 0.49, "site", true],
  ["pond-wood-south", "submerged-woody-cover", 613, 647, 74, 32, 0.10, 0.58, 0.42, "site", false],
  ["pond-reeds-west", "bank-reed-tuft", 550, 633, 38, 17, 0.12, 0.27, 0.58, "close", false],
  ["pond-reeds-north", "bank-reed-tuft", 626, 573, 36, 16, -0.52, 0.25, 0.56, "close", true],
  ["pond-reeds-east", "bank-reed-tuft", 667, 633, 40, 18, 0.58, 0.29, 0.60, "close", false],
  ["pond-reeds-south", "bank-reed-tuft", 627, 651, 38, 17, -0.08, 0.26, 0.57, "close", true],
  ["pond-grass-west", "submerged-grass-clump", 563, 616, 44, 19, -0.30, 0.47, 0.48, "site", false],
  ["pond-grass-north", "submerged-grass-clump", 596, 575, 42, 18, 0.50, 0.45, 0.46, "site", true],
  ["pond-grass-east", "submerged-grass-clump", 650, 603, 46, 20, -0.64, 0.48, 0.50, "site", false],
  ["pond-grass-south", "submerged-grass-clump", 599, 645, 44, 19, 0.18, 0.46, 0.47, "site", true],

  // Upper channel: boulder steps and lodged wood concentrate at constrictions.
  ["upper-wood-03", "submerged-woody-cover", 906, 464, 90, 36, 0.52, 0.64, 0.47, "site", true],
  ["upper-grass-05", "submerged-grass-clump", 887, 496, 44, 19, 0.56, 0.48, 0.49, "site", true],
  ["upper-wood-07", "submerged-woody-cover", 845, 542, 82, 34, -0.46, 0.62, 0.46, "site", false],
  ["upper-reeds-08", "bank-reed-tuft", 854, 570, 38, 18, -0.70, 0.28, 0.62, "site", true],
  ["upper-wood-09", "submerged-woody-cover", 824, 580, 74, 32, 0.34, 0.58, 0.50, "site", true],

  // Middle channel: alternating cover pockets preserve a readable flow lane.
  ["middle-wood-02", "submerged-woody-cover", 809, 659, 86, 35, 0.38, 0.68, 0.46, "site", false],
  ["middle-reeds-05", "bank-reed-tuft", 779, 726, 38, 18, -0.12, 0.27, 0.63, "site", false],
  ["middle-grass-06", "submerged-grass-clump", 748, 739, 46, 20, 0.60, 0.50, 0.49, "site", true],
  ["middle-wood-07", "submerged-woody-cover", 760, 775, 80, 33, -0.56, 0.66, 0.44, "site", true],

  // Lower channel: bank clusters follow the widening bend toward the handoff.
  ["lower-wood-02", "submerged-woody-cover", 780, 834, 88, 35, -0.44, 0.70, 0.45, "site", false],
  ["lower-wood-03", "submerged-woody-cover", 780, 875, 78, 33, 0.30, 0.62, 0.52, "site", false],
  ["lower-grass-05", "submerged-grass-clump", 824, 924, 48, 20, -0.62, 0.50, 0.49, "site", false],
  ["lower-wood-06", "submerged-woody-cover", 872, 922, 90, 36, 0.36, 0.68, 0.45, "site", true],
  ["lower-reeds-09", "bank-reed-tuft", 925, 1015, 40, 19, 0.32, 0.28, 0.62, "site", true],
  ["lower-grass-10", "submerged-grass-clump", 976, 1006, 48, 20, -0.46, 0.48, 0.48, "site", false],
]);

export const NINJAONE_INLAND_HABITAT_PLACEMENTS: readonly InlandHabitatPlacement[] =
  Object.freeze(HABITAT_PLACEMENT_DATA.map(([
    id,
    assetId,
    x,
    y,
    widthPx,
    screenWidthCapPx,
    angle,
    depthFraction,
    opacity,
    minimumTier,
    mirrorX,
  ]) => Object.freeze({
    angle,
    assetId,
    depthFraction,
    id,
    localPosition: Object.freeze([x, y] as const),
    minimumTier,
    mirrorX,
    opacity,
    screenWidthCapPx,
    widthPx,
  })));
