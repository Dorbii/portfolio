import { WATER_SURFACE_UNIFORM_DECLARATIONS } from "../uniform-contract";

export const WATER_SHADER_COMMON = `
precision highp float;

in vec2 v_uv;
out vec4 outColor;

${WATER_SURFACE_UNIFORM_DECLARATIONS}

float saturate(float value) {
  return clamp(value, 0.0, 1.0);
}

float smoother(float edge0, float edge1, float value) {
  float t = saturate((value - edge0) / max(edge1 - edge0, 0.00001));
  return t * t * (3.0 - 2.0 * t);
}

float heightSample(sampler2D source, vec2 coordinate) {
  return texture(source, coordinate).r;
}

vec2 heightGradient(
  sampler2D source,
  vec2 coordinate,
  vec2 texel
) {
  float left = heightSample(source, coordinate - vec2(texel.x, 0.0));
  float right = heightSample(source, coordinate + vec2(texel.x, 0.0));
  float up = heightSample(source, coordinate - vec2(0.0, texel.y));
  float down = heightSample(source, coordinate + vec2(0.0, texel.y));
  return vec2(right - left, down - up);
}

vec2 inlandWaterOverrideAt(vec2 worldUv) {
  vec2 overrideUv = (
    worldUv - u_inlandWaterOverrideOrigin
  ) / u_inlandWaterOverrideSpan;
  float insideOverride = step(0.0, overrideUv.x)
    * step(overrideUv.x, 1.0)
    * step(0.0, overrideUv.y)
    * step(overrideUv.y, 1.0);
  vec4 overrideSample = texture(
    u_inlandWaterOverride,
    clamp(overrideUv, vec2(0.0), vec2(1.0))
  );
  return vec2(
    min(overrideSample.r, overrideSample.a),
    overrideSample.a
  ) * insideOverride;
}
`;
