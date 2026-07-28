import { defineLayerDetailContract } from "../../../shared/lod";
import { TERRAIN_SITE_TILES } from "./siteTiles";
import { TERRAIN_STREAM_TILES } from "./streamTiles";

const WORLD_PLATE =
  "/career-world/layers/territory-landform/textures/terrain-relief-r6.png";
const TERRITORY_PLATE =
  "/career-world/layers/territory-landform/textures/terrain-relief-r6-detail-4x.png";

export const LAND_ASSETS = Object.freeze({
  plate: WORLD_PLATE,
  detailPlate: TERRITORY_PLATE,
  mask:
    "/career-world/layers/territory-landform/masks/world-land-mask-r3.png",
  topologyQa:
    "/career-world/layers/territory-landform/overlays/terrain-contours-r4-detail-4x.png",
  territoryQa:
    "/career-world/layers/territory-landform/masks/territory-segmentation-r4.svg",
});

export const LAND_DETAIL_CONTRACT = defineLayerDetailContract({
  layer: "territory-landform",
  sources: [
    {
      id: "world-land-plate",
      kind: "registered-raster",
      minimumTier: "world",
      path: WORLD_PLATE,
      dimensions: [1672, 941],
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
      dimensions: [6688, 3764],
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
