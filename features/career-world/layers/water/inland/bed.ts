// Stationary river/pond substrate. Refraction changes the sampling location,
// while the actual sand and stone positions remain fixed in world space.
export const INLAND_BED_SHADER = /* glsl */ `
uniform float uInlandBed;
vec3 inlandBed(vec2 p,InlandPalette palette,vec2 world) {
  if(uInlandBed<0.5)return palette.deep;
  vec2 q=p*1.55;
  vec2 cell=floor(q),fraction=fract(q);
  float nearest=10.0,seed=0.0;vec2 local=vec2(0);
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++) {
    vec2 offset=vec2(float(x),float(y));
    float h=hash21(cell+offset+7.1);
    vec2 site=offset+0.18+vec2(h,hash21(cell+offset+61.3))*0.64;
    vec2 delta=(fraction-site)*vec2(1.0,1.25);
    float squared=dot(delta,delta);
    if(squared<nearest){nearest=squared;local=delta;seed=h;}
  }
  float radius=mix(0.12,0.38,seed);
  float aa=max(0.035,uPixelMetres*1.55*0.65);
  float stone=1.0-smoothstep(radius*0.76,radius+aa,sqrt(nearest));
  stone*=smoothstep(0.18,0.55,noise2(p*0.21+16.0));
  float resolved=1.0-smoothstep(0.3,0.9,uPixelMetres);
  stone*=resolved;
  vec3 normal=normalize(vec3(local/radius,0.85));
  vec3 mineral=palette.stone*mix(0.58,1.15,seed);
  mineral=submergedRelief(mineral,normal,world);
  vec3 sand=palette.sand*(0.82+noise2(p*2.4)*0.24);
  return mix(sand,mineral,stone);
}
`;
