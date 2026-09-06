import layout from "../../../../../../public/career-world/layers/water/ocean/layout-textures-r1.json" with { type: "json" };
export const OCEAN_DETAILS_PATH=layout.outputs.details.path;

export const OCEAN_DETAILS_MATERIAL = /* glsl */ `
uniform sampler2D uOceanDetails;
uniform sampler2D uOceanDetailSurface;
uniform float uOceanDetailsEnabled;
uniform float uDetailPass;
float oceanDetailAlpha=0.0;
float reefGarden(vec2 world) {
  // Water-owned color provinces in the west coves, east lagoon and south shelf.
  // Existing marine/depth masks, not these ellipses, determine actual coverage.
  float west=length((world-vec2(0.151,0.285))/vec2(0.025,0.072));
  float east=length((world-vec2(0.550,0.268))/vec2(0.032,0.072));
  float south=length((world-vec2(0.448,0.953))/vec2(0.062,0.042));
  return 1.0-smoothstep(0.40,1.15,min(west,min(east,south)));
}
vec3 oceanDetailBottom(vec2 p,vec3 geography,float depth,vec3 fallback) {
  if(uOceanDetailsEnabled<0.5||uDetailPass<0.5||geography.g<0.98||depth>21.0)return fallback;
  vec4 detail=texture(uOceanDetails,p/${layout.outputs.details.metrePeriod.toFixed(1)});
  vec3 relief=texture(uOceanDetailSurface,p/${layout.outputs.details.metrePeriod.toFixed(1)}).rgb;
  vec2 xy=relief.rg*2.0-1.0;
  vec3 normal=normalize(vec3(xy,sqrt(max(0.01,1.0-dot(xy,xy)))));
  float shelf=(1.0-smoothstep(10.0,21.0,depth))*smoothstep(1.0,2.4,depth);
  float habitat=smoothstep(0.3,0.66,noise2(p*0.038+vec2(8,51)));
  float garden=reefGarden(p/uWorldMetres);
  habitat=mix(habitat,max(habitat,0.82),garden);
  oceanDetailAlpha=detail.a*smoothstep(0.98,1.0,geography.g)*shelf*habitat;
  vec3 artwork=pow(max(detail.rgb,vec3(0)),vec3(2.2));
  float colony=noise2(p*0.28+vec2(17,2));
  vec3 pigment=mix(vec3(0.10,0.72,0.57),vec3(0.52,0.20,0.82),smoothstep(0.32,0.68,colony));
  pigment=mix(pigment,vec3(0.85,0.48,0.13),smoothstep(0.72,0.86,colony));
  float reliefValue=dot(artwork,vec3(0.2126,0.7152,0.0722));
  vec3 vibrant=pigment*(0.30+reliefValue*3.0);
  artwork=mix(artwork,vibrant,garden*0.82);
  return submergedRelief(artwork,normal,p/uWorldMetres);
}
`;
