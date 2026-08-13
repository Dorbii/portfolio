import { defineLayerDetailContract } from "../../../shared/lod";
import { TERRAIN_SITE_TILES } from "./siteTiles";
import { TERRAIN_STREAM_TILES } from "./streamTiles";

const WORLD_PLATE =
  "/career-world/layers/terrain/authority/textures/terrain-relief-r6.png?v=ninjaone-b1-topology-r1";
const TERRITORY_PLATE =
  "/career-world/layers/terrain/authority/textures/terrain-relief-r6-detail-4x.png?v=ninjaone-b1-topology-r1";
const WORLD_PLATE_DIMENSIONS = [1672, 941] as const;
const TERRITORY_PLATE_DIMENSIONS = [6688, 3764] as const;

export const LAND_PLATE_DECODED_BYTES = Object.freeze({
  world:
    WORLD_PLATE_DIMENSIONS[0] * WORLD_PLATE_DIMENSIONS[1] * 4,
  territory:
    TERRITORY_PLATE_DIMENSIONS[0]
    * TERRITORY_PLATE_DIMENSIONS[1]
    * 4,
});

export const LAND_ASSETS = Object.freeze({
  plate: WORLD_PLATE,
  detailPlate: TERRITORY_PLATE,
  mask:
    "/career-world/layers/terrain/authority/masks/world-land-mask-r4.png",
  topologyQa:
    "/career-world/layers/terrain/authority/overlays/terrain-contours-r4-detail-4x.png",
  territoryQa:
    "/career-world/layers/terrain/authority/masks/territory-segmentation-r4.svg",
});

export const LAND_DETAIL_CONTRACT = defineLayerDetailContract({
  layer: "terrain",
  sources: [
    {
      id: "world-land-plate",
      kind: "registered-raster",
      minimumTier: "world",
      path: WORLD_PLATE,
      dimensions: WORLD_PLATE_DIMENSIONS,
      worldBounds: {
        origin: [0, 0],
        span: [1, 1],
      },
    },
    {
      id: "territory-land-plate",
      kind: "registered-raster",
      minimumTier: "territory",
      path: TERRITORY_PLATE,
      dimensions: TERRITORY_PLATE_DIMENSIONS,
      worldBounds: {
        origin: [0, 0],
        span: [1, 1],
      },
    },
    ...TERRAIN_SITE_TILES.map((tile) => ({
      id: tile.id,
      kind: "registered-raster" as const,
      minimumTier: tile.minimumTier,
      path: tile.path,
      dimensions: tile.dimensions,
      worldBounds: tile.worldBounds,
    })),
    ...TERRAIN_STREAM_TILES.flatMap((tile) => ([
      {
        id: `${tile.id}:capital`,
        kind: "registered-raster" as const,
        minimumTier: "capital" as const,
        path: tile.sources.capital.path,
        dimensions: tile.sources.capital.dimensions,
        worldBounds: tile.worldBounds,
      },
      {
        id: `${tile.id}:site`,
        kind: "registered-raster" as const,
        minimumTier: "site" as const,
        path: tile.sources.site.path,
        dimensions: tile.sources.site.dimensions,
        worldBounds: tile.worldBounds,
      },
    ])),
  ],
});
