import type { CameraView, Pair } from "../../shared/camera.ts";

export interface WaterState {
  readonly weather: number;
  readonly timeScale: number;
  readonly opacity: number;
}

export const DEFAULT_WATER_STATE: WaterState = Object.freeze({ weather: 0.45, timeScale: 1, opacity: 1 });

export function normalizeWaterState(input: Partial<WaterState> = {}): WaterState {
  const finite = (value: number | undefined, fallback: number, min: number, max: number) =>
    Number.isFinite(value) ? Math.max(min, Math.min(max, value!)) : fallback;
  return Object.freeze({
    weather: finite(input.weather, DEFAULT_WATER_STATE.weather, 0, 1),
    timeScale: finite(input.timeScale, DEFAULT_WATER_STATE.timeScale, 0, 3),
    opacity: finite(input.opacity, DEFAULT_WATER_STATE.opacity, 0, 1),
  });
}

export interface WaterFieldTile {
  readonly id: string;
  readonly path: string;
  readonly origin: Pair;
  readonly span: Pair;
  readonly dimensions: Pair;
}

export interface WaterFieldLevel {
  readonly level: number;
  readonly dimensions: Pair;
  readonly tiles: readonly WaterFieldTile[];
}

export function intersectsField(tile: WaterFieldTile, camera: CameraView): boolean {
  return tile.origin[0] < camera.origin[0] + camera.span[0]
    && tile.origin[0] + tile.span[0] > camera.origin[0]
    && tile.origin[1] < camera.origin[1] + camera.span[1]
    && tile.origin[1] + tile.span[1] > camera.origin[1];
}

export function selectWaterFields(levels: readonly WaterFieldLevel[], camera: CameraView, viewport: Pair, maximumTiles = 56) {
  const texelsPerPixel = Math.max(
    levels[0].dimensions[0] * camera.span[0] / Math.max(1, viewport[0]),
    levels[0].dimensions[1] * camera.span[1] / Math.max(1, viewport[1]),
  );
  let level = Math.max(0, Math.min(levels.length - 1, Math.floor(Math.log2(texelsPerPixel))));
  // Request ancestors first: a cold pan always has a complete coarse source.
  let tiles = levels.slice(level).reverse().flatMap((entry) =>
    entry.tiles.filter((tile) => intersectsField(tile, camera)));
  while (tiles.length > maximumTiles && level + 1 < levels.length) {
    level++;
    tiles = levels.slice(level).reverse().flatMap((entry) => entry.tiles.filter((tile) => intersectsField(tile, camera)));
  }
  return { level, tiles };
}

export function waveAngularFrequency(wavelengthMetres: number, depthMetres = 30): number {
  const k = 2 * Math.PI / wavelengthMetres;
  return Math.sqrt(9.81 * k * Math.tanh(k * depthMetres));
}
