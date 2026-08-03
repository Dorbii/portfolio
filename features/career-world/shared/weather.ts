import type { Pair } from "./camera";

export interface WorldWindState {
  readonly directionDegrees: number;
  readonly motion: number;
}

export const DEFAULT_WORLD_WIND_STATE: WorldWindState = Object.freeze({
  directionDegrees: 24,
  motion: 0.68,
});

export function wrapDegrees(value: number): number {
  const wrapped = value % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

export function windVectorFromDegrees(degrees: number): Pair {
  const radians = (wrapDegrees(degrees) * Math.PI) / 180;
  return Object.freeze([Math.cos(radians), Math.sin(radians)]);
}
