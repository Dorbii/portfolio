export const CAREER_WORLD_LAYER_ORDER = [
  "world-backdrop",
  // Terrain paints the ground; the ocean paints the water ON it; everything that
  // STANDS in the world paints after both.
  //
  // The ocean used to be under the terrain, and the terrain's painted shoreline
  // reaches seaward of the waterline the ocean solves against -- so the surf was
  // drawn and then covered. Measured at the capital coast, on the pixels where
  // the water canvas is opaque and therefore where the registered mask says
  // water: 68.9% of the first twelve screen pixels from the waterline never
  // reached the screen, against 2.4% between thirty and seventy and 1.0% beyond.
  // That band is where breaking, foam, lace, swash and spray all live.
  //
  // Hiding the city changes the figure by nothing (68.9%) and hiding the inland
  // water too by nothing (68.7%), so this is the terrain layer alone. The city
  // stays above the ocean, where it has to be: cities design their own
  // coastlines and modify the land to do it.
  "terrain",
  "ocean",
  "infrastructure",
  "structures",
  "actors-effects",
  "interface",
] as const;

export type CareerWorldLayerId = typeof CAREER_WORLD_LAYER_ORDER[number];

export interface LayerDescriptor {
  readonly id: CareerWorldLayerId;
  readonly order: number;
  readonly status: "active" | "deferred";
  readonly owns: readonly string[];
}
