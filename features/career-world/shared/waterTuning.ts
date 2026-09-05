export const WATER_TUNING_DIALS = Object.freeze([
  Object.freeze({ defaultValue: 0.45, group: "water" as const, key: "oceanWeather" as const,
    maximum: 1, minimum: 0, queryKey: "water.weather", step: 0.01 }),
  Object.freeze({ defaultValue: 1, group: "water" as const, key: "oceanTimeScale" as const,
    maximum: 3, minimum: 0, queryKey: "water.timeScale", step: 0.05 }),
  Object.freeze({ defaultValue: 1, group: "water" as const, key: "oceanOpacity" as const,
    maximum: 1, minimum: 0, queryKey: "water.opacity", step: 0.01 }),
] as const);

export type WaterTuningDial = (typeof WATER_TUNING_DIALS)[number];
export type WaterTuningKey = WaterTuningDial["key"];
export type WaterTuning = Readonly<Record<WaterTuningKey, number>>;

export const DEFAULT_WATER_TUNING: WaterTuning = Object.freeze(
  Object.fromEntries(
    WATER_TUNING_DIALS.map((dial) => [dial.key, dial.defaultValue]),
  ) as Record<WaterTuningKey, number>,
);

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function normalizeWaterTuning(
  input: Partial<Record<WaterTuningKey, unknown>> = {},
): WaterTuning {
  return Object.freeze(Object.fromEntries(WATER_TUNING_DIALS.map((dial) => {
    const value = Number(input[dial.key]);
    return [
      dial.key,
      Number.isFinite(value)
        ? clamp(value, dial.minimum, dial.maximum)
        : dial.defaultValue,
    ];
  })) as Record<WaterTuningKey, number>);
}

export function readWaterTuningUrlOverrides(search = "") {
  const parameters = new URLSearchParams(search);
  const overrides: Partial<Record<WaterTuningKey, number>> = {};
  for (const dial of WATER_TUNING_DIALS) {
    const raw = parameters.get(dial.queryKey);
    if (raw === null || raw.trim() === "") continue;
    const value = Number(raw);
    if (Number.isFinite(value)) overrides[dial.key] = value;
  }
  return overrides;
}

export function serializeWaterTuning(tuning: WaterTuning): string {
  const parameters = new URLSearchParams();
  for (const dial of WATER_TUNING_DIALS) {
    parameters.set(dial.queryKey, String(tuning[dial.key]));
  }
  return `?${parameters.toString()}`;
}
