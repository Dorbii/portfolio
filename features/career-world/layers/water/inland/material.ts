import { INLAND_PALETTE_SHADER } from "./palettes.ts";
import { INLAND_BED_SHADER } from "./bed.ts";
import { INLAND_FALL_SHADER } from "./falls.ts";
import { GORGE_POOL_SHADER } from "./gorge/pool.ts";

export const INLAND_MATERIAL = /* glsl */ `
${INLAND_PALETTE_SHADER}
${INLAND_BED_SHADER}
${INLAND_FALL_SHADER}
${GORGE_POOL_SHADER}
float inlandFlowNoise(vec2 q) {
  return noise2(q)*0.65+noise2(q*2.13+vec2(8.1,3.7))*0.35;
}
float inlandAdvectedNoise(vec2 p,vec2 direction,float speed,float time){
  float phase=fract(time/8.0),other=fract(phase+0.5);
  float a=inlandFlowNoise((p-direction*phase*8.0*speed)*1.4);
  float b=inlandFlowNoise((p-direction*other*8.0*speed)*1.4);
  return mix(a,b,abs(phase*2.0-1.0));
}
vec3 inlandMaterial(vec2 p, float shore, vec2 flow, float time, float weather) {
  float strength = length(flow);
  float stream = smoothstep(0.3, 0.5, strength);
  float fall = smoothstep(0.83, 0.98, strength);
  vec2 direction = strength > 0.01 ? flow / strength : vec2(0.0, 1.0);
  float distance=max(0.0,shore);
  float speed=mix(0.045+weather*0.04,0.8+weather*0.5,stream);
  speed=mix(speed,3.8+weather,fall);
  // Bounded two-phase advection avoids texture phase jumps at flow-direction
  // changes without restarting motion when the camera crosses a cell edge.
  float e=max(0.14,uPixelMetres*0.5);
  float n=inlandAdvectedNoise(p,direction,speed,time);
  vec2 grad=vec2(inlandAdvectedNoise(p+vec2(e,0),direction,speed,time)-n,
    inlandAdvectedNoise(p+vec2(0,e),direction,speed,time)-n)/e;
  float resolved=1.0-smoothstep(0.22,1.2,uPixelMetres);
  vec2 slope=grad*mix(0.045,0.24,stream);
  slope+=vec2(cos(p.x*0.8+p.y*0.31-time*0.9),sin(p.y*0.67-p.x*0.23-time*0.73))
    *(0.007+weather*0.012)*(1.0-stream);
  slope*=resolved*smoothstep(0.0,0.7,distance);
  slope+=gorgePoolRipples(p,time)*resolved*smoothstep(0.0,0.6,distance);
  vec3 normal=normalize(vec3(-slope,1.0));

  // Inland-owned stationary mineral bed. Depth is a bank-distance proxy;
  // the existing flow field supplies motion class without changing coverage.
  float bankWidth=mix(0.35,0.72,noise2(p*0.08+vec2(3,17)));
  float depth=mix(0.35+distance*0.68,0.35+distance*0.48,stream);
  depth*=smoothstep(0.0,bankWidth,distance)*(0.88+0.24*noise2(p*0.12+8.0));
  depth+=gorgePoolDepth(p)*smoothstep(0.15,1.0,distance);
  depth=min(depth,9.0);
  vec2 bottom=p+slope*min(depth,3.0)*0.6;
  InlandPalette palette=inlandPalette(p/uWorldMetres);
  vec3 bed=inlandBed(bottom,palette,p/uWorldMetres,distance,depth,stream);
  float focusing=1.0-smoothstep(0.015,0.095,abs(inlandFlowNoise(bottom*1.2+vec2(time*0.10,-time*0.07))-0.5));
  bed*=1.0+focusing*0.28*resolved*exp(-depth*0.45);
  float clarity=1.05+noise2(p*0.025+41.0)*0.40;
  vec3 deep=palette.deep;
  vec3 attenuation=exp(-vec3(0.85,0.42,0.27)*depth*clarity);
  vec3 transmission=mix(deep,bed,attenuation);
  vec3 color=waterOptics(transmission,normal,0.20+stream*0.08+weather*0.05,p/uWorldMetres);

  float bank=(1.0-smoothstep(0.15,0.9,distance))*smoothstep(0.02,0.2,distance);
  float eddy=smoothstep(0.69,0.86,n)*smoothstep(0.3,0.7,noise2(p*0.33-time*direction*0.3));
  float foam=(eddy*(0.3+bank*0.3)+smoothstep(0.56,0.78,n)*0.085)*stream*resolved;
  // Falling sheets have no river bed immediately beneath them. Dedicated
  // aeration travels down the curtain; mapped endpoints disturb landing pools.
  float impact=inlandFallImpact(p,time)*smoothstep(0.0,0.8,distance);
  vec3 fallCoordinates=inlandFallCoordinates(p);
  float curtain=fall*fallCoordinates.z*(1.0-smoothstep(0.12,0.5,impact))*(1.0-dedicatedGorgeFall(p));
  color=mix(color,inlandFallCurtain(p,fallCoordinates.xy,time,weather,palette.deep),curtain*uInlandEffects);
  foam=mix(foam,0.0,fall);
  foam=max(foam,impact);
  foam=max(foam,gorgePoolFoam(p,time)*resolved*smoothstep(0.0,0.4,distance));
  color=mix(color,illuminatedFoam(p/uWorldMetres),clamp(foam*uInlandEffects,0.0,0.88));
  color*=1.0-gorgePoolOcclusion(p)*0.48*uLightingEnabled;
  vec3 abyss=waterOptics(vec3(0.006,0.024,0.038),normal,0.32,p/uWorldMetres);
  return mix(color,abyss,gorgeLowerDescent(p)*0.88);
}
`;
