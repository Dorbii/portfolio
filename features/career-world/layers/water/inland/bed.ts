import feature from "../../../../../public/career-world/layers/water/inland/submerged-groove-r9.json" with {type:"json"};

// Stationary river/pond substrate. Refraction changes the sampling location,
// while the actual sand and stone positions remain fixed in world space.
export const INLAND_BED_SHADER = /* glsl */ `
uniform float uInlandBed;
uniform sampler2D uInlandBedFeature;
uniform float uInlandBedFeatureReady;
vec3 inlandBed(vec2 p,InlandPalette palette,vec2 world,float shore,float depth,float stream) {
  if(uInlandBed<0.5)return palette.deep;
  float frequency=mix(0.24,1.10,palette.bed.x);
  vec2 q=p*frequency;
  vec2 cell=floor(q),fraction=fract(q);
  float nearest=10.0,second=10.0,seed=0.0;vec2 local=vec2(0);
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++) {
    vec2 offset=vec2(float(x),float(y));
    float h=hash21(cell+offset+7.1);
    vec2 site=offset+0.18+vec2(h,hash21(cell+offset+61.3))*0.64;
    vec2 delta=(fraction-site)*vec2(1.0,1.25);
    float squared=dot(delta,delta);
    if(squared<nearest){second=nearest;nearest=squared;local=delta;seed=h;}
    else second=min(second,squared);
  }
  float angle=seed*6.2831853;
  local=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*local;
  float radius=mix(0.16,0.40,seed);
  float aa=max(0.025,uPixelMetres*frequency*0.6);
  float shape=max(abs(local.x)*0.94+abs(local.y)*0.42,abs(local.y)*0.95);
  float stone=1.0-smoothstep(radius*0.83,radius+aa,shape);
  float bank=1.0-smoothstep(0.65,2.7,shore);
  float clusters=smoothstep(0.25,0.68,noise2(p*0.12+16.0));
  float resolved=1.0-smoothstep(0.35,1.0,uPixelMetres);
  stone*=clusters*mix(0.15+palette.bed.y*0.85,1.0,bank)*resolved*(1.0-smoothstep(3.0,7.0,depth));
  vec3 normal=normalize(vec3(local/radius,0.85));
  vec3 mineral=palette.stone*mix(0.82,1.10,seed);
  mineral=submergedRelief(mineral,normal,world);
  float bars=noise2(p*0.19+vec2(13,8))*0.7+noise2(p*0.47)*0.3;
  float grain=(noise2(p*2.1)-0.5)*0.07*(1.0-smoothstep(0.12,0.4,uPixelMetres));
  vec3 sand=palette.sand*(0.82+bars*0.30+grain);
  // Reuse the resident rock/sand artwork at a finer inland scale. This is a
  // read-only material input; the ocean's layout, shading and toggle stay intact.
  if(uSeabedEnabled>0.5){
    // Preserve the artwork's rock/sand contrast in linear light. A broad
    // luminance wash at the old scale hid the bed in narrow channels.
    vec2 bedUv=mat2(0.8,-0.6,0.6,0.8)*p/mix(14.0,42.0,palette.bed.z);
    vec3 substrate=pow(texture(uSeabedAlbedo,bedUv).rgb,vec3(2.2));
    vec3 tint=palette.sand/max(0.05,dot(palette.sand,vec3(0.2126,0.7152,0.0722)));
    sand=mix(sand*0.55,substrate*tint*0.45,mix(0.50,0.85,palette.bed.z));
  }
  float contact=exp(-max(0.0,shore)/0.22)*(0.55+0.45*noise2(p*0.75));
  sand*=1.0-contact*0.18;
  float fracture=1.0-smoothstep(0.025,0.10+aa,sqrt(second)-sqrt(nearest));
  vec3 bedrock=palette.stone*(0.33+0.35*seed)*(1.0-fracture*0.50);
  float outcrop=palette.bed.z*smoothstep(0.25,0.62,noise2(p*0.10+23.0));
  sand=mix(sand,bedrock,outcrop);
  vec3 result=mix(sand,mineral,stone);
  if(uInlandBedFeatureReady>0.5){
    vec2 uv=(p/uWorldMetres-vec2(${feature.origin.join(",")}))/vec2(${feature.span.join(",")});
    if(all(greaterThanEqual(uv,vec2(0)))&&all(lessThanEqual(uv,vec2(1)))){
      vec4 carving=texture(uInlandBedFeature,uv);
      result=mix(result,pow(carving.rgb,vec3(2.2))*0.85,carving.a);
    }
  }
  return result;
}
`;
