import {
  DEFAULT_WATER_TUNING,
  readWaterTuningUrlOverrides,
} from "../../../shared/waterTuning.ts";
import { CAREER_WORLD_WATER_REALISM_PROFILE } from "./profiles.ts";

/**
 * Everything the ocean exposes at runtime.
 *
 * The old surface had thirty dials, one per hand-authored effect layer. There is
 * nothing left to dial that way: the sea is solved, and the three tuned states
 * carry ~170 uniforms between them that are generated from the offline presets
 * rather than typed in here. What is left is the art direction — where on the
 * calm/windy/heavy scale this world sits — plus the two knobs the composition
 * genuinely needs.
 */
export interface WaterSurfaceState {
  /** 0 calm swell, 0.5 windy rolling surf, 1 heavy crashing surf. */
  readonly weather: number;
  /** Multiplier on the wave clock; 1 is the rate the states were tuned at. */
  readonly timeScale: number;
  readonly opacity: number;
}

export const DEFAULT_WATER_SURFACE_STATE: WaterSurfaceState = Object.freeze({
  weather: CAREER_WORLD_WATER_REALISM_PROFILE.ocean.weather,
  timeScale: CAREER_WORLD_WATER_REALISM_PROFILE.ocean.timeScale,
  opacity: DEFAULT_WATER_TUNING.oceanOpacity,
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
  const fallback = DEFAULT_WATER_SURFACE_STATE;

  return Object.freeze({
    weather: clamp(finiteOr(candidate.weather, fallback.weather), 0, 1),
    timeScale: clamp(finiteOr(candidate.timeScale, fallback.timeScale), 0, 3),
    opacity: clamp(finiteOr(candidate.opacity, fallback.opacity), 0.2, 1),
  });
}

export function readWaterSurfaceUrlOverrides(
  search = typeof window === "undefined" ? "" : window.location.search,
): Partial<WaterSurfaceState> {
  const tuning = readWaterTuningUrlOverrides(search);
  return Object.fromEntries([
    ["weather", tuning.oceanWeather],
    ["timeScale", tuning.oceanTimeScale],
    ["opacity", tuning.oceanOpacity],
  ].filter(([, value]) => value !== undefined)) as Partial<WaterSurfaceState>;
}
