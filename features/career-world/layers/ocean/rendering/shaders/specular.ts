type Vector2 = readonly [number, number];
type Vector3 = readonly [number, number, number];

export interface WaterSpecularInput {
  readonly analyticCrest: number;
  readonly chaosWeight: number;
  readonly coastActivity: number;
  readonly energyMask: number;
  readonly fieldWeight: number;
  readonly lightDirection: Vector3;
  readonly sparkle: number;
  readonly swellAmplitude: number;
  readonly swellGradient: Vector2;
  readonly lightScatter: number;
}

export interface WaterSpecularResult {
  readonly crestExtension: number;
  readonly glint: number;
  readonly grazing: number;
  readonly lightAlignment: number;
  readonly litFacet: number;
}

// This block is emitted into the fragment shader verbatim. The CPU evidence
// imports evaluateWaterSpecular below, so the policy coefficients have one
// source instead of a second hand-written approximation in a checker.
export const WATER_SPECULAR_GLSL = `
  vec3 viewDirection = normalize(vec3(0.0, 0.86, 0.51));
  vec3 halfVector = normalize(normalize(u_lightDirection) + viewDirection);
  vec3 facetNormal = normalize(vec3(
    -swellGradient * max(swellAmplitude, 0.05) * 7.2,
    1.0
  ));
  float litFacet = pow(saturate(dot(facetNormal, halfVector)), 18.0);
  vec2 lightPlane = normalize(u_lightDirection.xy + vec2(0.00001, 0.0));
  vec2 crestPlane = normalize(swellGradient + vec2(0.00001, 0.0));
  float lightAlignment = abs(dot(crestPlane, lightPlane));
  float grazing = smoother(0.06, 0.28, 1.0 - saturate(dot(facetNormal, viewDirection)));
  float crestExtension = 1.0 + min(0.10, grazing * lightAlignment * 0.10);
  float specularGlint = analyticCrest
    * litFacet
    * crestExtension
    * u_lightScatter
    * mix(0.45, 1.55, u_sparkle)
    * coastActivity
    * energyMask
    * fieldWeight
    * (0.16 + chaosWeight * 0.06);
`;

const LEGACY_EXTENSION_GAIN = 0.45;
const EXTENSION_CAP = 0.10;
const EXTENSION_GAIN = 0.10;
const VIEW_DIRECTION: Vector3 = [0, 0.86, 0.51];

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function smoother(edge0: number, edge1: number, value: number): number {
  const t = clamp((value - edge0) / Math.max(edge1 - edge0, 0.00001));
  return t * t * (3 - 2 * t);
}

function dot2(left: Vector2, right: Vector2): number {
  return left[0] * right[0] + left[1] * right[1];
}

function dot3(left: Vector3, right: Vector3): number {
  return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

function normalize2(value: Vector2): Vector2 {
  const length = Math.hypot(value[0], value[1]);
  return [value[0] / length, value[1] / length];
}

function normalize3(value: Vector3): Vector3 {
  const length = Math.hypot(value[0], value[1], value[2]);
  return [value[0] / length, value[1] / length, value[2] / length];
}

export function evaluateWaterSpecular(
  input: WaterSpecularInput,
  extensionGain = EXTENSION_GAIN,
  extensionCap = EXTENSION_CAP,
): WaterSpecularResult {
  const viewDirection = normalize3(VIEW_DIRECTION);
  const normalizedLight = normalize3(input.lightDirection);
  const halfVector = normalize3([
    normalizedLight[0] + viewDirection[0],
    normalizedLight[1] + viewDirection[1],
    normalizedLight[2] + viewDirection[2],
  ]);
  const facetNormal = normalize3([
    -input.swellGradient[0] * Math.max(input.swellAmplitude, 0.05) * 7.2,
    -input.swellGradient[1] * Math.max(input.swellAmplitude, 0.05) * 7.2,
    1,
  ]);
  const litFacet = Math.pow(clamp(dot3(facetNormal, halfVector)), 18);
  const lightPlane = normalize2([input.lightDirection[0] + 0.00001, input.lightDirection[1]]);
  const crestPlane = normalize2([input.swellGradient[0] + 0.00001, input.swellGradient[1]]);
  const lightAlignment = Math.abs(dot2(crestPlane, lightPlane));
  const grazing = smoother(0.06, 0.28, 1 - clamp(dot3(facetNormal, viewDirection)));
  const crestExtension = 1 + Math.min(extensionCap, grazing * lightAlignment * extensionGain);
  return Object.freeze({
    crestExtension,
    glint: input.analyticCrest
      * litFacet
      * crestExtension
      * input.lightScatter
      * (0.45 + (1.55 - 0.45) * input.sparkle)
      * input.coastActivity
      * input.energyMask
      * input.fieldWeight
      * (0.16 + input.chaosWeight * 0.06),
    grazing,
    lightAlignment,
    litFacet,
  });
}

export function evaluateLegacyWaterSpecular(input: WaterSpecularInput): WaterSpecularResult {
  return evaluateWaterSpecular(input, LEGACY_EXTENSION_GAIN, LEGACY_EXTENSION_GAIN);
}
