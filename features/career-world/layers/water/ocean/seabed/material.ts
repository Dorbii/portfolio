import layout from "../../../../../../public/career-world/layers/water/ocean/layout-textures-r1.json" with { type: "json" };

export const SEABED_ALBEDO_PATH = layout.outputs.floor.path;
export const SEABED_SURFACE_PATH = "/career-world/layers/water/ocean/seabed/seabed-surface-r1.png";

export const SEABED_MATERIAL = /* glsl */ `
uniform sampler2D uSeabedAlbedo;
uniform sampler2D uSeabedSurface;
uniform float uSeabedEnabled;
struct SeabedSample { vec3 albedo; vec3 normal; float depth; };
SeabedSample sampleOceanSeabed(vec2 p,float shore) {
  if(uSeabedEnabled<0.5)return SeabedSample(vec3(0.018,0.026,0.029),vec3(0,0,1),24.0);
  vec2 uv=p/${layout.outputs.floor.metrePeriod.toFixed(1)};
  vec3 encoded=texture(uSeabedSurface,uv).rgb;
  vec2 xy=encoded.rg*2.0-1.0;
  vec3 normal=normalize(vec3(xy,sqrt(max(0.01,1.0-dot(xy,xy)))));
  float distance=max(0.0,shore);
  float depth=clamp(0.55+distance*0.20+smoothstep(24.0,100.0,distance)*7.5-encoded.b*1.65,0.18,28.0);
  return SeabedSample(pow(texture(uSeabedAlbedo,uv).rgb,vec3(2.2)),normal,depth);
}
`;
