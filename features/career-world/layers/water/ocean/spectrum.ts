export const SPECTRUM_SIZE = 128;
export const WAVE_CASCADES = [
  { length: 192, windLength: 4.8, shortest: 4, longest: 110, seed: 7301 },
  { length: 31, windLength: 0.45, shortest: 0.6, longest: 7, seed: 19423 },
] as const;

export interface SpectrumBand {
  readonly length: number; readonly windLength: number;
  readonly shortest: number; readonly longest: number; readonly seed: number;
}

// Phillips spectrum with directional spreading and band limits. Seed amplitudes
// normalize to unit expected height variance after the normalized inverse FFT.
// Weather scales this same realization, so changing weather never reseeds waves.
export function createWaveSpectrum(size: number, band: SpectrumBand, windAngle: number): Float32Array {
  const data = new Float32Array(size * size * 4);
  let state = band.seed >>> 0, energy = 0;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return (state + 0.5) / 4294967296; };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    const kx = (x < size / 2 ? x : x - size) * 2 * Math.PI / band.length;
    const ky = (y < size / 2 ? y : y - size) * 2 * Math.PI / band.length;
    const k = Math.hypot(kx, ky), wavelength = 2 * Math.PI / k;
    if (!k || x === size / 2 || y === size / 2 || wavelength < band.shortest || wavelength > band.longest) continue;
    const aligned = (kx * Math.cos(windAngle) + ky * Math.sin(windAngle)) / k;
    const spreading = (0.12 + 0.88 * aligned ** 2) * (aligned < 0 ? 0.06 : 1);
    const power = Math.exp(-1 / (k * band.windLength) ** 2) * spreading / k ** 4
      * Math.exp(-((k * band.shortest / (2 * Math.PI)) ** 4));
    const radius = Math.sqrt(-2 * Math.log(random()) * power), angle = random() * 2 * Math.PI;
    data[i] = radius * Math.cos(angle); data[i + 1] = radius * Math.sin(angle);
    data[i + 2] = kx; data[i + 3] = ky;
    energy += data[i] ** 2 + data[i + 1] ** 2;
  }
  const gain = energy ? size * size / Math.sqrt(2 * energy) : 0;
  for (let i = 0; i < data.length; i += 4) { data[i] *= gain; data[i + 1] *= gain; }
  return data;
}

export function waveHeights(weather: number): readonly [number, number] {
  return [0.06 + 0.75 * weather ** 1.35, 0.018 + 0.10 * weather];
}
