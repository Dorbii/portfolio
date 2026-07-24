import { defineLayerDetailContract } from "../../../shared/lod";

const WORLD_PLATE =
  "/career-world/layers/territory-landform/textures/world-land-plate-r10.png";
const TERRITORY_PLATE =
  "/career-world/layers/territory-landform/textures/world-land-plate-r10-detail-4x.png";

export const LAND_ASSETS = Object.freeze({
  plate: WORLD_PLATE,
  detailPlate: TERRITORY_PLATE,
  mask:
    "/career-world/layers/territory-landform/masks/world-land-mask-r2.png",
  topologyQa:
    "/career-world/layers/territory-landform/overlays/terrain-contours-r3-detail-4x.png",
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
  ],
});
