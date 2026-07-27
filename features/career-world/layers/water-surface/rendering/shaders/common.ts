export const WATER_SHADER_COMMON = `
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_cameraOrigin;
uniform vec2 u_cameraSpan;
uniform vec2 u_wind;
uniform vec2 u_coastTexel;
uniform vec2 u_coastMaterialTexel;
uniform float u_motion;
uniform float u_waveStrength;
uniform float u_waveDensity;
uniform float u_weather;
uniform float u_opacity;
uniform float u_detailScale;
uniform float u_territoryLod;
uniform float u_capitalLod;
uniform float u_siteLod;
uniform vec2 u_microFrequency;
uniform float u_territoryLineStrength;
uniform float u_territoryNormalStrength;
uniform vec3 u_lightDirection;
uniform vec2 u_basinWorldAnchor;
uniform vec2 u_basinTextureOrigin;
uniform vec2 u_basinTextureScale;
uniform float u_basinTextureRotation;
uniform float u_basinRippleFrequency;
uniform float u_basinRippleMix;
uniform float u_basinTintMix;
uniform vec2 u_lakeWorldAnchor;
uniform vec2 u_lakeTextureOrigin;
uniform vec2 u_lakeTextureScale;
uniform float u_lakeTextureRotation;
uniform float u_lakeRippleFrequency;
uniform float u_lakeRippleMix;
uniform float u_lakeTintMix;

uniform vec3 u_deepColor;
uniform vec3 u_bodyColor;
uniform vec3 u_swellColor;
uniform vec3 u_shallowColor;
uniform vec3 u_substrateColor;
uniform vec3 u_highlightColor;
uniform vec3 u_foamColor;
uniform vec3 u_stormColor;

uniform sampler2D u_worldAlbedo;
uniform sampler2D u_directionalAlbedo;
uniform sampler2D u_macroHeight;
uniform sampler2D u_microHeight;
uniform sampler2D u_coastGeometry;
uniform sampler2D u_coastMaterial;
uniform sampler2D u_hydrology;

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
`;
