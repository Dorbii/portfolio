import type { Pair } from "../../../shared/camera";
import {
  KAIZEN_CITY_OWNER_ID,
  KAIZEN_CITY_PLATE_ALIGNMENT_Y,
  KAIZEN_CITY_PLATE_ANCHOR,
  KAIZEN_CITY_PLATE_SPAN,
  KAIZEN_CITY_REGISTRATION,
} from "../../../shared/kaizenCityRegistration.ts";
import type { DetailNodePolicy } from "../../../shared/lod";
import baseManifest from "../../../../../public/career-world/cities/kaizen-agent/manifests/base-runtime-r1.json" with { type: "json" };

if (
  baseManifest.registration !== KAIZEN_CITY_REGISTRATION
  || baseManifest.ownerId !== KAIZEN_CITY_OWNER_ID
  || baseManifest.lod.contract !== "persistent-base-progressive-resolution"
) {
  throw new TypeError("Kaizen neighborhood base manifest is invalid.");
}

export const KAIZEN_NEIGHBORHOOD_OWNER_ID = KAIZEN_CITY_OWNER_ID;

export const KAIZEN_NEIGHBORHOOD_OVERVIEW_POLICY: DetailNodePolicy =
  Object.freeze({
    minimumTier: "territory",
  });

export const KAIZEN_NEIGHBORHOOD_FOUNDATION_SRC =
  baseManifest.lod.base.path;
export const KAIZEN_NEIGHBORHOOD_SITE_FOUNDATION_SRC =
  baseManifest.lod.site.path;
export const KAIZEN_NEIGHBORHOOD_CLOSE_GRID_ROOT =
  baseManifest.lod.close.assetRoot;

export const KAIZEN_NEIGHBORHOOD_BASE_DIMENSIONS = Object.freeze([
  baseManifest.lod.base.dimensions[0],
  baseManifest.lod.base.dimensions[1],
] as Pair);
export const KAIZEN_NEIGHBORHOOD_SITE_DIMENSIONS = Object.freeze([
  baseManifest.lod.site.dimensions[0],
  baseManifest.lod.site.dimensions[1],
] as Pair);
export const KAIZEN_NEIGHBORHOOD_CLOSE_DIMENSIONS = Object.freeze([
  baseManifest.lod.close.dimensions[0],
  baseManifest.lod.close.dimensions[1],
] as Pair);
export const KAIZEN_NEIGHBORHOOD_CLOSE_TILE_DIMENSIONS = Object.freeze([
  baseManifest.lod.close.tileDimensions[0],
  baseManifest.lod.close.tileDimensions[1],
] as Pair);
export const KAIZEN_NEIGHBORHOOD_CLOSE_GRID_SIZE =
  baseManifest.lod.close.gridSize;

export type KaizenNeighborhoodModuleLod = "base" | "site" | "close";

export type KaizenNeighborhoodModuleKind =
  | "city-foundation-base"
  | "city-foundation-site"
  | "city-foundation-close-tile";

export interface KaizenNeighborhoodModule {
  readonly assetPath: string;
  readonly blockId: string;
  readonly crop: readonly [number, number, number, number];
  readonly gridColumn?: number;
  readonly gridRow?: number;
  readonly id: string;
  readonly kind: KaizenNeighborhoodModuleKind;
  readonly lod: KaizenNeighborhoodModuleLod;
  readonly region: readonly [number, number, number, number];
  readonly sourceDimensions: Pair;
}

export const KAIZEN_NEIGHBORHOOD_ANCHOR = Object.freeze([
  KAIZEN_CITY_PLATE_ANCHOR[0],
  KAIZEN_CITY_PLATE_ANCHOR[1],
] as Pair);
export const KAIZEN_NEIGHBORHOOD_SPAN = Object.freeze([
  KAIZEN_CITY_PLATE_SPAN[0],
  KAIZEN_CITY_PLATE_SPAN[1],
] as Pair);
export const KAIZEN_NEIGHBORHOOD_PLATE_ALIGNMENT_Y =
  KAIZEN_CITY_PLATE_ALIGNMENT_Y;
export const KAIZEN_NEIGHBORHOOD_DETAIL_CONTRACT =
  baseManifest.lod.contract;
const KAIZEN_NEIGHBORHOOD_BLOCK_ID = "kaizen-agent-city-foundation";

function fullPlateModule({
  assetPath,
  dimensions,
  id,
  kind,
  lod,
}: {
  readonly assetPath: string;
  readonly dimensions: Pair;
  readonly id: string;
  readonly kind: KaizenNeighborhoodModuleKind;
  readonly lod: KaizenNeighborhoodModuleLod;
}): KaizenNeighborhoodModule {
  return Object.freeze({
    assetPath,
    blockId: KAIZEN_NEIGHBORHOOD_BLOCK_ID,
    crop: Object.freeze([0, 0, dimensions[0], dimensions[1]] as const),
    id,
    kind,
    lod,
    region: Object.freeze([0, 0, 1, 1] as const),
    sourceDimensions: dimensions,
  });
}

function closeTilePath(row: number, column: number): string {
  const file = baseManifest.lod.close.assetPattern
    .replace("{row}", String(row + 1))
    .replace("{column}", String(column + 1));
  return `${KAIZEN_NEIGHBORHOOD_CLOSE_GRID_ROOT}/${file}`;
}

const CLOSE_MODULES = Array.from(
  { length: KAIZEN_NEIGHBORHOOD_CLOSE_GRID_SIZE },
  (_, row) => Array.from(
    { length: KAIZEN_NEIGHBORHOOD_CLOSE_GRID_SIZE },
    (_, column): KaizenNeighborhoodModule => Object.freeze({
      assetPath: closeTilePath(row, column),
      blockId: KAIZEN_NEIGHBORHOOD_BLOCK_ID,
      crop: Object.freeze([
        0,
        0,
        KAIZEN_NEIGHBORHOOD_CLOSE_TILE_DIMENSIONS[0],
        KAIZEN_NEIGHBORHOOD_CLOSE_TILE_DIMENSIONS[1],
      ] as const),
      gridColumn: column,
      gridRow: row,
      id: `kaizen-city-close-r${row + 1}-c${column + 1}`,
      kind: "city-foundation-close-tile",
      lod: "close",
      region: Object.freeze([
        column / KAIZEN_NEIGHBORHOOD_CLOSE_GRID_SIZE,
        row / KAIZEN_NEIGHBORHOOD_CLOSE_GRID_SIZE,
        1 / KAIZEN_NEIGHBORHOOD_CLOSE_GRID_SIZE,
        1 / KAIZEN_NEIGHBORHOOD_CLOSE_GRID_SIZE,
      ] as const),
      sourceDimensions: KAIZEN_NEIGHBORHOOD_CLOSE_TILE_DIMENSIONS,
    }),
  ),
).flat();

export const KAIZEN_NEIGHBORHOOD_MODULES:
readonly KaizenNeighborhoodModule[] = Object.freeze([
  fullPlateModule({
    assetPath: KAIZEN_NEIGHBORHOOD_FOUNDATION_SRC,
    dimensions: KAIZEN_NEIGHBORHOOD_BASE_DIMENSIONS,
    id: "kaizen-city-foundation-base",
    kind: "city-foundation-base",
    lod: "base",
  }),
  fullPlateModule({
    assetPath: KAIZEN_NEIGHBORHOOD_SITE_FOUNDATION_SRC,
    dimensions: KAIZEN_NEIGHBORHOOD_SITE_DIMENSIONS,
    id: "kaizen-city-foundation-site",
    kind: "city-foundation-site",
    lod: "site",
  }),
  ...CLOSE_MODULES,
]);
