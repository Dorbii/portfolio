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
uniform float u_foregroundHydrology;
uniform float u_detailScale;
uniform float u_territoryLod;
uniform float u_capitalLod;
uniform float u_siteLod;
uniform float u_closeAssetsReady;
uniform vec2 u_ninjaOneStreamOrigin;
uniform vec2 u_ninjaOneStreamSpan;
uniform vec2 u_ninjaOneStreamTexel;
uniform vec2 u_ninjaOneStreamArtboardDimensions;
uniform float u_ninjaOneHydrologyOpacity;
uniform float u_ninjaOneStreamSlotCount;
uniform vec4 u_ninjaOneStreamRegion0;
uniform vec4 u_ninjaOneStreamRegion1;
uniform vec4 u_ninjaOneTarnFeature;
uniform vec4 u_ninjaOneCascadeApproach0;
uniform vec4 u_ninjaOneCascadeApproach1;
uniform vec4 u_ninjaOneCascadeApproach2;
uniform vec4 u_ninjaOneCascadeApproach3;
uniform vec4 u_ninjaOneCascadeApproach4;
uniform vec4 u_ninjaOneCascadeApproach5;
uniform vec4 u_ninjaOneCascadeApproach6;
uniform vec4 u_ninjaOneCascadeApproach7;
uniform vec4 u_ninjaOneCascadeCrest0;
uniform vec4 u_ninjaOneCascadeCrest1;
uniform vec4 u_ninjaOneCascadeCrest2;
uniform vec4 u_ninjaOneCascadeCrest3;
uniform vec4 u_ninjaOneCascadeCrest4;
uniform vec4 u_ninjaOneCascadeCrest5;
uniform vec4 u_ninjaOneCascadeCrest6;
uniform vec4 u_ninjaOneCascadeCrest7;
uniform vec4 u_ninjaOneCascadeFall0;
uniform vec4 u_ninjaOneCascadeFall1;
uniform vec4 u_ninjaOneCascadeFall2;
uniform vec4 u_ninjaOneCascadeFall3;
uniform vec4 u_ninjaOneCascadeFall4;
uniform vec4 u_ninjaOneCascadeFall5;
uniform vec4 u_ninjaOneCascadeFall6;
uniform vec4 u_ninjaOneCascadeFall7;
uniform vec4 u_ninjaOneCascadeImpact0;
uniform vec4 u_ninjaOneCascadeImpact1;
uniform vec4 u_ninjaOneCascadeImpact2;
uniform vec4 u_ninjaOneCascadeImpact3;
uniform vec4 u_ninjaOneCascadeImpact4;
uniform vec4 u_ninjaOneCascadeImpact5;
uniform vec4 u_ninjaOneCascadeImpact6;
uniform vec4 u_ninjaOneCascadeImpact7;
uniform vec4 u_ninjaOneCascadeMist0;
uniform vec4 u_ninjaOneCascadeMist1;
uniform vec4 u_ninjaOneCascadeMist2;
uniform vec4 u_ninjaOneCascadeMist3;
uniform vec4 u_ninjaOneCascadeMist4;
uniform vec4 u_ninjaOneCascadeMist5;
uniform vec4 u_ninjaOneCascadeMist6;
uniform vec4 u_ninjaOneCascadeMist7;
uniform vec4 u_ninjaOneCascadePool0;
uniform vec4 u_ninjaOneCascadePool1;
uniform vec4 u_ninjaOneCascadePool2;
uniform vec4 u_ninjaOneCascadePool3;
uniform vec4 u_ninjaOneCascadePool4;
uniform vec4 u_ninjaOneCascadePool5;
uniform vec4 u_ninjaOneCascadePool6;
uniform vec4 u_ninjaOneCascadePool7;
uniform vec4 u_riverSurfaceProfile;
uniform vec4 u_riverInteractionProfile;
uniform vec4 u_waterfallSheetProfile;
uniform vec4 u_waterfallImpactProfile;
uniform vec4 u_mistProfile;
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
uniform sampler2D u_ninjaOneStreamFlow0;
uniform sampler2D u_ninjaOneStreamFlow1;

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
