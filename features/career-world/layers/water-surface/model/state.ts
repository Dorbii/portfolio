import {
  DEFAULT_WORLD_WIND_STATE,
  wrapDegrees,
} from "../../../shared/weather.ts";

export { windVectorFromDegrees } from "../../../shared/weather.ts";

export interface WaterSurfaceState {
  readonly motion: number;
  readonly waveStrength: number;
  readonly waveDensity: number;
  readonly weather: number;
  readonly opacity: number;
  readonly detailScale: number;
  readonly windDirectionDegrees: number;
}

export const DEFAULT_WATER_SURFACE_STATE: WaterSurfaceState = Object.freeze({
  motion: DEFAULT_WORLD_WIND_STATE.motion,
  waveStrength: 0.7,
  waveDensity: 1,
  weather: 0.14,
  opacity: 1,
  detailScale: 0.58,
  windDirectionDegrees: DEFAULT_WORLD_WIND_STATE.directionDegrees,
});

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function finiteOr(value: unknown, fallback: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function normalizeWaterSurfaceState(
  input: Partial<WaterSurfaceState> = {},
): WaterSurfaceState {
  const candidate = { ...DEFAULT_WATER_SURFACE_STATE, ...input };

  return Object.freeze({
    motion: clamp(finiteOr(candidate.motion, 0.68), 0, 2),
    waveStrength: clamp(finiteOr(candidate.waveStrength, 0.7), 0, 2),
    waveDensity: clamp(finiteOr(candidate.waveDensity, 1), 0.5, 2),
    weather: clamp(finiteOr(candidate.weather, 0.14), 0, 1),
    opacity: clamp(finiteOr(candidate.opacity, 1), 0.2, 1),
    detailScale: clamp(finiteOr(candidate.detailScale, 0.58), 0, 1),
    windDirectionDegrees: wrapDegrees(
      finiteOr(candidate.windDirectionDegrees, 24),
    ),
  });
}
