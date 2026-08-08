import manifest from "../../../public/career-world/cities/kaizen-agent/manifests/base-runtime-r1.json" with { type: "json" };
import type { Pair } from "./camera";
import { WORLD_PLANE } from "./world.ts";

if (
  manifest.schemaVersion !== 1
  || manifest.id !== "career-world/kaizen-agent/base-runtime@r1"
  || manifest.registration !== "kaizen-city-layout@r2"
  || manifest.ownerId !== "project-kaizen-agent"
  || manifest.coordinateSpace !== "normalized-world-top-left"
  || manifest.plate.dimensions.length !== 2
  || manifest.plate.anchor.length !== 2
  || manifest.plate.span.length !== 2
  || manifest.occlusion.contract
    !== "fully-opaque-city-plate-excludes-close-terrain"
  || manifest.occlusion.terrainRuntimeId
    !== "career-world/terrain-stream-runtime@r4"
  || !Array.isArray(manifest.occlusion.tileIds)
) {
  throw new TypeError("Kaizen city base registration is invalid.");
}

export const KAIZEN_CITY_REGISTRATION = manifest.registration;
export const KAIZEN_CITY_OWNER_ID = manifest.ownerId;
export const KAIZEN_CITY_PLATE_DIMENSIONS = Object.freeze([
  manifest.plate.dimensions[0],
  manifest.plate.dimensions[1],
] as Pair);
export const KAIZEN_CITY_PLATE_ANCHOR = Object.freeze([
  manifest.plate.anchor[0],
  manifest.plate.anchor[1],
] as Pair);
export const KAIZEN_CITY_PLATE_SPAN = Object.freeze([
  manifest.plate.span[0],
  manifest.plate.span[1],
] as Pair);
export const KAIZEN_CITY_PLATE_ALIGNMENT_Y = manifest.plate.alignmentY;
export const KAIZEN_CITY_OCCLUDED_TERRAIN_TILE_IDS = Object.freeze(
  new Set(manifest.occlusion.tileIds),
);
export const KAIZEN_CITY_PLATE_ORIGIN = Object.freeze([
  KAIZEN_CITY_PLATE_ANCHOR[0] - KAIZEN_CITY_PLATE_SPAN[0] * 0.5,
  KAIZEN_CITY_PLATE_ANCHOR[1]
    - KAIZEN_CITY_PLATE_SPAN[1] * KAIZEN_CITY_PLATE_ALIGNMENT_Y,
] as Pair);
export const KAIZEN_CITY_PIXEL_TO_WORLD = Object.freeze([
  KAIZEN_CITY_PLATE_SPAN[0] * WORLD_PLANE.width
    / KAIZEN_CITY_PLATE_DIMENSIONS[0],
  KAIZEN_CITY_PLATE_SPAN[1] * WORLD_PLANE.height
    / KAIZEN_CITY_PLATE_DIMENSIONS[1],
] as Pair);

export function kaizenRegistrationPointToWorld(
  [x, y]: Pair,
): Pair {
  return Object.freeze([
    KAIZEN_CITY_PLATE_ORIGIN[0]
      + x / KAIZEN_CITY_PLATE_DIMENSIONS[0] * KAIZEN_CITY_PLATE_SPAN[0],
    KAIZEN_CITY_PLATE_ORIGIN[1]
      + y / KAIZEN_CITY_PLATE_DIMENSIONS[1] * KAIZEN_CITY_PLATE_SPAN[1],
  ] as Pair);
}
