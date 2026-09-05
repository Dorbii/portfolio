import { OCEAN_MATERIAL } from "./ocean/material.ts";
import { INLAND_MATERIAL } from "./inland/material.ts";
import { WATER_LIGHTING_SHADER } from "../lighting/water/shader.ts";

export const WATER_VERTEX = `#version 300 es
precision highp float;
out vec2 uv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  uv = vec2(p.x, 1.0 - p.y);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

export const WATER_FRAGMENT = `#version 300 es
precision highp float;
precision highp sampler2DArray;
in vec2 uv;
out vec4 fragColor;
uniform sampler2DArray uFields;
uniform sampler2D uPages;
uniform vec3 uFieldSize;
uniform vec4 uCamera;
uniform vec2 uWorldMetres;
uniform float uRange;
uniform vec2 uTime;
uniform float uWeather;
uniform float uWindAngle;
uniform float uPixelMetres;
uniform float uOpacity;
uniform float uCoast;
uniform float uInlandEffects;
uniform vec2 uVisible;
uniform float uDebug;
const float TAU = 6.28318530718;
float hash11(float p) { return fract(sin(p * 127.1) * 43758.5453); }
float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise2(vec2 p) {
  vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),
             mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x),f.y);
}
${WATER_LIGHTING_SHADER}
${OCEAN_MATERIAL}
${INLAND_MATERIAL}
vec3 sampleField(vec2 world) {
  vec2 w = clamp(world, vec2(0.0), vec2(0.999999));
  vec2 page = floor(texture(uPages, w).rg * 255.0 + 0.5);
  if (page.r < 0.5) return vec3(1.0, 128.0/255.0, 128.0/255.0);
  vec2 size = ceil(uFieldSize.xy / exp2(page.g));
  vec2 pixel = w * size;
  vec2 tileOrigin = floor(pixel / uFieldSize.z) * uFieldSize.z;
  vec2 tileSize = min(vec2(uFieldSize.z), size - tileOrigin);
  vec2 local = clamp(pixel - tileOrigin, vec2(0.5), tileSize - 0.5) / uFieldSize.z;
  return texture(uFields, vec3(local, page.r - 1.0)).rgb;
}
void main() {
  vec2 world = uCamera.xy + uv * uCamera.zw;
  vec3 field = sampleField(world);
  float shore = (field.r - 0.5) * 2.0 * uRange;
  vec2 flow = field.gb * 2.0 - 1.0;
  float inland = smoothstep(0.045, 0.14, length(flow));
  float geographyCoast = 1.0 - smoothstep(0.008, 0.03, -flow.x);
  vec2 stepUv = max(vec2(uPixelMetres), uWorldMetres / uFieldSize.xy) / uWorldMetres;
  vec2 gradient = vec2(
    sampleField(world + vec2(stepUv.x, 0)).r - sampleField(world - vec2(stepUv.x, 0)).r,
    sampleField(world + vec2(0, stepUv.y)).r - sampleField(world - vec2(0, stepUv.y)).r);
  vec2 shoreNormal = length(gradient) > 0.0001 ? normalize(gradient) : vec2(0.0, 1.0);
  vec2 p = world * uWorldMetres;
  vec3 color;
  if (inland < 0.01) color = oceanMaterial(p, shore, shoreNormal, uTime.x, uWeather, geographyCoast);
  else if (inland > 0.99) color = inlandMaterial(p, shore, flow, uTime.y, uWeather);
  else color = mix(oceanMaterial(p, shore, shoreNormal, uTime.x, uWeather, geographyCoast),
    inlandMaterial(p, shore, flow, uTime.y, uWeather), inland);
  if (uDebug > 0.5) color = shore < 0.0 ? vec3(0.22, 0.14, 0.05) : mix(vec3(0.02,0.1,0.35), vec3(0.05,0.6,0.23), inland);
  float visible = mix(uVisible.x, uVisible.y, inland);
  float alpha=uOpacity*visible;
  if(uDetailPass>0.5) alpha*=oceanDetailAlpha*(1.0-inland);
  fragColor = vec4(pow(max(color, vec3(0.0)), vec3(1.0/2.2)), alpha);
}`;
