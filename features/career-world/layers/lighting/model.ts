import type { WorldLight } from "../../shared/lighting.ts";
import { WORLD_PLANE } from "../../shared/world.ts";

export interface SceneLighting extends WorldLight {
  readonly hour: number;
  readonly enabled: boolean;
  readonly landGain: readonly [number, number, number];
  readonly directFraction: readonly [number, number, number];
  readonly cloudStrength: number;
  readonly cloudOffset: readonly [number, number];
}

export const CLOUD_SHADOW_TEXTURE = "/career-world/layers/lighting/cloud-shadow-r1.png";
export const CLOUD_SHADOW_REPEAT_TEXTURE = "/career-world/layers/lighting/cloud-shadow-repeat-r1.png";

export function linearRgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
}

export function srgbByte(value: number): number {
  const v = Math.max(0, value);
  return Math.round(Math.min(1, v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055) * 255);
}

function mixColor(a: string, b: string, t: number): string {
  const left = linearRgb(a), right = linearRgb(b);
  return "#" + left.map((value, i) => srgbByte(value + (right[i] - value) * t).toString(16).padStart(2, "0")).join("");
}

export function lightingIrradiance(light: WorldLight) {
  const sun = linearRgb(light.color), ambient = linearRgb(light.ambientColor);
  const elevation = Math.max(0, light.direction[2] / (Math.hypot(...light.direction) || 1));
  const direct = sun.map((value) => value * light.intensity * elevation);
  const total = direct.map((value, i) => value + ambient[i] * 1.6);
  return { direct, total };
}

// Authored lighting keyframes, not an astronomical or terrain-shadow solver.
// The neutral daylight keyframe reproduces the existing world light exactly.
export function resolveSceneLighting(hour: number, weather: number, base: WorldLight): SceneLighting {
  const h = ((hour % 24) + 24) % 24;
  const night = { direction: [-0.45, -0.25, 0.85] as const, color: "#a3bddf", ambientColor: "#121a2b", intensity: 0.065 };
  const keys = [
    { hour: 0, ...night },
    { hour: 6, direction: [0.94, -0.25, 0.05], color: "#efb37e", ambientColor: "#36323b", intensity: 0.45 },
    { hour: 9, direction: [0.60, -0.35, 0.72], color: "#ded1b2", ambientColor: "#263236", intensity: 0.85 },
    { hour: 13, ...base },
    { hour: 18, direction: [-0.95, -0.20, 0.12], color: "#f0ad73", ambientColor: "#2a2737", intensity: 0.65 },
    { hour: 20, ...night }, { hour: 24, ...night },
  ];
  const upper = keys.findIndex((key) => key.hour > h);
  const a = keys[upper - 1], b = keys[upper];
  const t = (h - a.hour) / (b.hour - a.hour);
  const direction = a.direction.map((value, i) => value + (b.direction[i] - value) * t) as [number, number, number];
  const light: WorldLight = {
    id: base.id, direction, color: mixColor(a.color, b.color, t),
    ambientColor: mixColor(a.ambientColor, b.ambientColor, t), intensity: a.intensity + (b.intensity - a.intensity) * t,
  };
  const current = lightingIrradiance(light), neutral = lightingIrradiance(base);
  const cloudStrength = Math.max(0, Math.min(0.65, (weather - 0.5) * 1.3));
  const length = Math.hypot(...direction) || 1;
  const z = Math.max(0.18, direction[2] / length);
  const cloudOffset = [
    direction[0] / length / z * 0.035,
    direction[1] / length / z * 0.035 * WORLD_PLANE.width / WORLD_PLANE.height,
  ] as const;
  return Object.freeze({ ...light, hour: h, enabled: true,
    landGain: current.total.map((value, i) => value / Math.max(0.0001, neutral.total[i])) as [number, number, number],
    directFraction: current.direct.map((value, i) => value / Math.max(0.0001, current.total[i])) as [number, number, number],
    cloudStrength, cloudOffset,
  });
}

export function lightingEffects(light: WorldLight) {
  const scene = light as Partial<SceneLighting>;
  return { enabled: scene.enabled ?? true, cloudStrength: scene.cloudStrength ?? 0, cloudOffset: scene.cloudOffset ?? [0, 0] as const };
}

// Shared environment radiance follows the scene illumination. Materials never
// choose a private daylight, sun direction, or weather exposure.
export function lightingSky(light: WorldLight) {
  const { total } = lightingIrradiance(light);
  const strength = lightingEffects(light).cloudStrength;
  const zenith = [0.24, 0.39, 0.64].map((v, i) => (v * (1 - strength) + 0.46 * strength) * total[i]);
  const horizon = [0.78, 0.84, 0.88].map((v, i) => v * total[i]);
  return { zenith: zenith as [number, number, number], horizon: horizon as [number, number, number] };
}
