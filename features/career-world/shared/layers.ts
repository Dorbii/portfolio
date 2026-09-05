export const CAREER_WORLD_LAYER_ORDER = [
  "world-backdrop",
  // Water fills beneath the land's authored alpha. Neither layer edits the
  // other's coverage; lighting is supplied by the shared lighting owner.
  "water",
  "terrain",
  "infrastructure",
  "structures",
  "actors-effects",
  "lighting",
  "interface",
] as const;

export type CareerWorldLayerId = typeof CAREER_WORLD_LAYER_ORDER[number];

export interface LayerDescriptor {
  readonly id: CareerWorldLayerId;
  readonly order: number;
  readonly status: "active" | "deferred";
  readonly owns: readonly string[];
}
