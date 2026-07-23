import manifest from "@/public/career-world/layers/world-backdrop/manifests/world-light-r1.json";

type Triple = readonly [number, number, number];

export interface WorldLight {
  readonly id: string;
  readonly direction: Triple;
  readonly color: string;
  readonly ambientColor: string;
  readonly intensity: number;
}

function triple(values: number[], label: string): Triple {
  if (
    values.length !== 3
    || values.some((value) => !Number.isFinite(value))
  ) {
    throw new TypeError(`${label} must contain three finite numbers.`);
  }
  return Object.freeze([values[0], values[1], values[2]]);
}

function color(value: string, label: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(value)) {
    throw new TypeError(`${label} must be a six-digit hex color.`);
  }
  return value;
}

function intensity(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError("World light intensity must be non-negative.");
  }
  return value;
}

export const WORLD_LIGHT: WorldLight = Object.freeze({
  id: manifest.id,
  direction: triple(manifest.direction, "World light direction"),
  color: color(manifest.color, "World light color"),
  ambientColor: color(manifest.ambientColor, "World ambient color"),
  intensity: intensity(manifest.intensity),
});
