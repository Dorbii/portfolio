// Stationary river/pond substrate. Refraction changes the sampling location,
// while the actual sand and stone positions remain fixed in world space.
export const INLAND_BED_SHADER = /* glsl */ `
uniform float uInlandBed;
vec3 inlandBed(vec2 p,InlandPalette palette,vec2 world,float shore,float depth,float stream) {
  if(uInlandBed<0.5)return palette.deep;
  vec2 q=p*0.68;
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
  float angle=seed*6.2831853;
  local=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*local;
  float radius=mix(0.16,0.40,seed);
  float aa=max(0.025,uPixelMetres*0.68*0.6);
  float shape=max(abs(local.x)*0.94+abs(local.y)*0.42,abs(local.y)*0.95);
  float stone=1.0-smoothstep(radius*0.83,radius+aa,shape);
  float bank=1.0-smoothstep(0.65,2.7,shore);
  float clusters=smoothstep(0.37,0.70,noise2(p*0.12+16.0));
  float resolved=1.0-smoothstep(0.35,1.0,uPixelMetres);
  stone*=clusters*mix(0.12+stream*0.16,1.0,bank)*resolved*(1.0-smoothstep(1.5,3.8,depth));
  vec3 normal=normalize(vec3(local/radius,0.85));
  vec3 mineral=palette.stone*mix(0.82,1.10,seed);
  mineral=submergedRelief(mineral,normal,world);
  float bars=noise2(p*0.19+vec2(13,8))*0.7+noise2(p*0.47)*0.3;
  float grain=(noise2(p*2.1)-0.5)*0.07*(1.0-smoothstep(0.12,0.4,uPixelMetres));
  vec3 sand=palette.sand*(0.82+bars*0.30+grain);
  // Reuse the resident rock/sand artwork at a finer inland scale. This is a
  // read-only material input; the ocean's layout, shading and toggle stay intact.
  if(uSeabedEnabled>0.5){
    vec3 substrate=texture(uSeabedAlbedo,p/64.0).rgb;
    float relief=dot(substrate,vec3(0.2126,0.7152,0.0722));
    vec3 textured=palette.sand*(0.55+relief*1.8);
    sand=mix(sand,textured,0.72);
  }
  float contact=exp(-max(0.0,shore)/0.22)*(0.55+0.45*noise2(p*0.75));
  sand*=1.0-contact*0.18;
  return mix(sand,mineral,stone);
}
`;
