import type { Pair } from "../../../shared/camera";

export interface WaterBodyTextureTransform {
  readonly worldAnchor: Pair;
  readonly textureOrigin: Pair;
  readonly textureScale: Pair;
  readonly rotationRadians: number;
}

export interface WaterBodyStyle {
  readonly id: string;
  readonly texture: WaterBodyTextureTransform;
  readonly rippleFrequency: number;
  readonly rippleMix: number;
  readonly tintMix: number;
}

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export const SHELTERED_BASIN_STYLE: WaterBodyStyle = Object.freeze({
  id: "mainland-inner-sea",
  texture: Object.freeze({
    worldAnchor: Object.freeze([0.445, 0.445] as const),
    textureOrigin: Object.freeze([0.69, 0.34] as const),
    textureScale: Object.freeze([0.92, 1.08] as const),
    rotationRadians: degreesToRadians(17),
  }),
  rippleFrequency: 175,
  rippleMix: 0.76,
  tintMix: 0.28,
});

export const SMALL_INLAND_LAKE_STYLE: WaterBodyStyle = Object.freeze({
  id: "mainland-southwest-lake",
  texture: Object.freeze({
    worldAnchor: Object.freeze([0.179, 0.547] as const),
    textureOrigin: Object.freeze([0.31, 0.7] as const),
    textureScale: Object.freeze([1.08, 0.94] as const),
    rotationRadians: degreesToRadians(-11),
  }),
  rippleFrequency: 430,
  rippleMix: 0.84,
  tintMix: 0.34,
});
