import { defineLayerDetailContract } from "../../../shared/lod";

const WORLD_ALBEDO =
  "/career-world/layers/water-surface/textures/water-surface-world-lod-r2-3840x2160.png";
const DIRECTIONAL_ALBEDO =
  "/career-world/layers/water-surface/textures/water-surface-reference-r2-3840x2160.png";
const MACRO_HEIGHT =
  "/career-world/layers/water-surface/fields/water-height-macro-r1-1024x1024.png";
const MICRO_HEIGHT =
  "/career-world/layers/water-surface/fields/water-height-micro-r1-1024x1024.png";
const COAST_GEOMETRY_WORLD =
  "/career-world/layers/water-surface/fields/coast-geometry-r5.png";
const COAST_GEOMETRY_TERRITORY =
  "/career-world/layers/water-surface/fields/coast-geometry-r5-4x.png";

export const WATER_TERRITORY_DETAIL = Object.freeze({
  fixedWorldFrequency: Object.freeze([12.5, 10.6] as const),
  lineStrength: 0.16,
  normalStrength: 5.4,
});

export const WATER_ASSETS = Object.freeze({
  worldAlbedo: WORLD_ALBEDO,
  directionalAlbedo: DIRECTIONAL_ALBEDO,
  macroHeight: MACRO_HEIGHT,
  microHeight: MICRO_HEIGHT,
  coastGeometry: Object.freeze({
    world: COAST_GEOMETRY_WORLD,
    territory: COAST_GEOMETRY_TERRITORY,
  }),
  coastMaterial:
    "/career-world/layers/water-surface/fields/coast-material-field-r6.png",
  hydrology:
    "/career-world/layers/water-surface/fields/water-region-field-r3.png",
});

export const WATER_DETAIL_CONTRACT = defineLayerDetailContract({
  layer: "water-surface",
  sources: [
    {
      id: "world-albedo",
      kind: "registered-raster",
      minimumTier: "world",
      path: WORLD_ALBEDO,
      dimensions: [3840, 2160],
      worldBounds: {
        origin: [0, 0],
        span: [1, 1],
      },
    },
    {
      id: "territory-line-field",
      kind: "world-procedural",
      minimumTier: "territory",
      path: MICRO_HEIGHT,
      fixedWorldFrequency: WATER_TERRITORY_DETAIL.fixedWorldFrequency,
    },
    {
      id: "territory-coast-geometry",
      kind: "registered-raster",
      minimumTier: "territory",
      path: COAST_GEOMETRY_TERRITORY,
      dimensions: [6688, 3764],
      worldBounds: {
        origin: [0, 0],
        span: [1, 1],
      },
    },
  ],
});
