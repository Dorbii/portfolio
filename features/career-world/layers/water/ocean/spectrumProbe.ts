import { createWaveSpectrum, SPECTRUM_SIZE, WAVE_CASCADES, waveHeights } from "./spectrum.ts";

// Development-only independent O(N²) Fourier sum at three spatial points.
// This verifies the GPU FFT against the definition, not another FFT routine.
export function referenceWaveSamples(index: number, time: number, weather: number, wind: number) {
  const n = SPECTRUM_SIZE, band = WAVE_CASCADES[index];
  const seed = createWaveSpectrum(n, band, wind), height = waveHeights(weather)[index];
  return [[0, 0], [17, 43], [71, 109]].map(([px, py]) => {
    let expected = 0;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 4, opposite = (((n - y) % n) * n + (n - x) % n) * 4;
      const k = Math.hypot(seed[i + 2], seed[i + 3]), phase = Math.sqrt(9.81 * k) * time;
      const c = Math.cos(phase), s = Math.sin(phase);
      const re = (seed[i] + seed[opposite]) * c + (seed[i + 1] + seed[opposite + 1]) * s;
      const im = (seed[i + 1] - seed[opposite + 1]) * c + (seed[opposite] - seed[i]) * s;
      const spatial = 2 * Math.PI * (x * px + y * py) / n;
      expected += re * Math.cos(spatial) - im * Math.sin(spatial);
    }
    return { x: px, y: py, expected: expected * height / (n * n) };
  });
}
