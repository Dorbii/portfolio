export const WATER_TUNING_DIALS = Object.freeze([
  // The ocean is solved, not authored. Its three tuned sea states carry ~170
  // uniforms between them, generated from the offline presets rather than typed
  // in here, so there is nothing left to dial one effect at a time. What is left
  // is where on the calm/windy/heavy scale this world sits.
  Object.freeze({
    defaultValue: 0.34,
    group: "ocean" as const,
    key: "oceanWeather" as const,
    maximum: 1,
    minimum: 0,
    queryKey: "water.weather",
    step: 0.01,
  }),
  Object.freeze({
    defaultValue: 1,
    group: "ocean" as const,
    key: "oceanTimeScale" as const,
    maximum: 3,
    minimum: 0,
    queryKey: "water.timeScale",
    step: 0.05,
  }),
  Object.freeze({
    defaultValue: 1,
    group: "ocean" as const,
    key: "oceanOpacity" as const,
    maximum: 1,
    minimum: 0.2,
    queryKey: "water.opacity",
    step: 0.01,
  }),
  Object.freeze({
    defaultValue: 0,
    group: "city" as const,
    key: "cityWaterOpacity" as const,
    maximum: 1,
    minimum: 0,
    queryKey: "city-water.opacity",
    step: 0.01,
  }),
  Object.freeze({
    defaultValue: 0,
    group: "city" as const,
    key: "cityWaterShoreRamp" as const,
    maximum: 1,
    minimum: 0,
    queryKey: "city-water.shoreRamp",
    step: 0.01,
  }),
  Object.freeze({
    defaultValue: 1,
    group: "effects" as const,
    key: "effectSparkle" as const,
    maximum: 2,
    minimum: 0,
    queryKey: "water-effects.sparkle",
    step: 0.05,
  }),
  Object.freeze({
    defaultValue: 1,
    group: "effects" as const,
    key: "foam" as const,
    maximum: 2,
    minimum: 0,
    queryKey: "water-effects.foam",
    step: 0.05,
  }),
  Object.freeze({
    defaultValue: 1,
    group: "effects" as const,
    key: "crest" as const,
    maximum: 2,
    minimum: 0,
    queryKey: "water-effects.crest",
    step: 0.05,
  }),
  Object.freeze({
    defaultValue: 1,
    group: "effects" as const,
    key: "relight" as const,
    maximum: 2,
    minimum: 0,
    queryKey: "water-effects.relight",
    step: 0.05,
  }),
  Object.freeze({
    defaultValue: 1,
    group: "effects" as const,
    key: "cycling" as const,
    maximum: 2,
    minimum: 0,
    queryKey: "water-effects.cycling",
    step: 0.05,
  }),
  Object.freeze({
    defaultValue: 1,
    group: "effects" as const,
    key: "swell" as const,
    maximum: 2,
    minimum: 0,
    queryKey: "water-effects.swell",
    step: 0.05,
  }),
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
