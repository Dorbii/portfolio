import layout from "../../../../../../public/career-world/layers/water/ocean/layout-textures-r1.json" with { type: "json" };
export const OCEAN_DETAILS_PATH=layout.outputs.details.path;

export const OCEAN_DETAILS_MATERIAL = /* glsl */ `
uniform sampler2D uOceanDetails;
uniform sampler2D uOceanDetailSurface;
uniform float uOceanDetailsEnabled;
uniform float uDetailPass;
float oceanDetailAlpha=0.0;
vec3 oceanDetailBottom(vec2 p,vec3 geography,float depth,vec3 fallback) {
  if(uOceanDetailsEnabled<0.5||uDetailPass<0.5||geography.g<0.98||depth>21.0)return fallback;
  vec4 detail=texture(uOceanDetails,p/${layout.outputs.details.metrePeriod.toFixed(1)});
  vec3 relief=texture(uOceanDetailSurface,p/${layout.outputs.details.metrePeriod.toFixed(1)}).rgb;
  vec2 xy=relief.rg*2.0-1.0;
  vec3 normal=normalize(vec3(xy,sqrt(max(0.01,1.0-dot(xy,xy)))));
  float shelf=(1.0-smoothstep(10.0,21.0,depth))*smoothstep(1.0,2.4,depth);
  float habitat=smoothstep(0.3,0.66,noise2(p*0.038+vec2(8,51)));
  oceanDetailAlpha=detail.a*smoothstep(0.98,1.0,geography.g)*shelf*habitat;
  return submergedRelief(pow(max(detail.rgb,vec3(0)),vec3(2.2)),normal,p/uWorldMetres);
}
`;
