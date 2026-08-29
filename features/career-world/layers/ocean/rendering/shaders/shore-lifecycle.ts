const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const smoother = (start: number, end: number, value: number) => {
  const normalized = clamp01((value - start) / Math.max(0.00001, end - start));
  return normalized * normalized * (3 - 2 * normalized);
};

/**
 * CPU parity executor for the named T34 shore lifecycle. It deliberately owns
 * only the scalar phase envelopes; the shader owns the sampled local texture
 * variation and colour application.
 */
export function evaluateWindyEnergeticShoreLifecycle(input: Readonly<{
  shelf: number;
  arrival: number;
  crest: number;
  exposure: number;
  zoom: number;
}>): Readonly<{
  approach: number;
  impact: number;
  turbulent: number;
  dissipation: number;
  spray: number;
}> {
  const shelf = clamp01(input.shelf);
  const arrival = clamp01(input.arrival);
  const crest = clamp01(input.crest);
  const exposure = clamp01(input.exposure);
  const nearTier = smoother(0.35, 0.98, input.zoom);
  const approach = smoother(0.18, 0.72, shelf)
    * (1 - smoother(0.83, 0.98, shelf))
    * smoother(0.46, 0.9, arrival)
    * crest;
  const impact = smoother(0.7, 0.92, shelf)
    * smoother(0.68, 0.96, arrival)
    * crest
    * (0.42 + exposure * 0.58);
  const dissipation = smoother(0.42, 0.88, shelf)
    * (1 - smoother(0.2, 0.66, arrival))
    * (0.28 + impact * 0.72);
  const turbulent = smoother(0.58, 0.96, shelf)
    * (0.3 + exposure * 0.7)
    * Math.max(impact, dissipation * 0.76);
  const spray = impact * nearTier * (0.5 + exposure * 0.5);
  return Object.freeze({ approach, impact, turbulent, dissipation, spray });
}

// Keep the phase-envelope formula in one named module. The evidence mirror
// imports the evaluator above; coast.ts interpolates this exact GLSL block.
export const WATER_WINDY_ENERGETIC_SHORE_GLSL = `
struct WindyEnergeticShoreLifecycle {
  float approach;
  float impact;
  float turbulent;
  float dissipation;
  float spray;
};

WindyEnergeticShoreLifecycle sampleWindyEnergeticShoreLifecycle(
  float shelf,
  float arrival,
  float crest,
  float exposure,
  float zoom
) {
  float nearTier = smoother(0.35, 0.98, zoom);
  float approach = smoother(0.18, 0.72, shelf)
    * (1.0 - smoother(0.83, 0.98, shelf))
    * smoother(0.46, 0.9, arrival)
    * crest;
  float impact = smoother(0.7, 0.92, shelf)
    * smoother(0.68, 0.96, arrival)
    * crest
    * (0.42 + exposure * 0.58);
  float dissipation = smoother(0.42, 0.88, shelf)
    * (1.0 - smoother(0.2, 0.66, arrival))
    * (0.28 + impact * 0.72);
  float turbulent = smoother(0.58, 0.96, shelf)
    * (0.3 + exposure * 0.7)
    * max(impact, dissipation * 0.76);
  float spray = impact * nearTier * (0.5 + exposure * 0.5);
  WindyEnergeticShoreLifecycle result;
  result.approach = approach;
  result.impact = impact;
  result.turbulent = turbulent;
  result.dissipation = dissipation;
  result.spray = spray;
  return result;
}
`;
