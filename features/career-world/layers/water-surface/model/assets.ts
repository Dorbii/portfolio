import nativeDetailManifest from "../../../../../public/career-world/capitals/ninjaone/environment/manifests/native-detail-r2.json" with { type: "json" };
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
  "/career-world/layers/water-surface/fields/coast-geometry-r5.png?v=ninjaone-coast-r2";
const COAST_GEOMETRY_TERRITORY =
  "/career-world/layers/water-surface/fields/coast-geometry-r5-4x.png?v=ninjaone-coast-r2";
const NINJAONE_STREAM_FLOW = nativeDetailManifest.layers.hydrology.flowField.path;
const [ninjaOneStreamWidth = 0, ninjaOneStreamHeight = 0] =
  nativeDetailManifest.layers.hydrology.flowField.dimensions;

if (ninjaOneStreamWidth <= 0 || ninjaOneStreamHeight <= 0) {
  throw new RangeError("NinjaOne stream flow texture dimensions are invalid.");
}

export const NINJAONE_STREAM_REGISTRATION = Object.freeze({
  textureDimensions: Object.freeze([
    ninjaOneStreamWidth,
    ninjaOneStreamHeight,
  ] as const),
  worldOrigin: Object.freeze([0.125, 0] as const),
  worldSpan: Object.freeze([0.25, 1 / 3] as const),
});

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
    "/career-world/layers/water-surface/fields/coast-material-field-r6.png?v=ninjaone-coast-r2",
  hydrology:
    "/career-world/layers/water-surface/fields/water-region-field-r3.png?v=ninjaone-coast-r2",
  ninjaOneStreamFlow: NINJAONE_STREAM_FLOW,
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
    {
      id: "ninjaone-stream-flow",
      kind: "registered-raster",
      minimumTier: "site",
      path: NINJAONE_STREAM_FLOW,
      dimensions: NINJAONE_STREAM_REGISTRATION.textureDimensions,
      worldBounds: {
        origin: NINJAONE_STREAM_REGISTRATION.worldOrigin,
        span: NINJAONE_STREAM_REGISTRATION.worldSpan,
      },
    },
  ],
});
