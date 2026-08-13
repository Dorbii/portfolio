export const CAREER_WORLD_LAYER_ORDER = [
  "world-backdrop",
  "ocean",
  "terrain",
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
