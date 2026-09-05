import { GORGE_FALL } from "./model.ts";
const vector=(p:readonly number[])=>`vec2(${p.map(n=>n.toFixed(8)).join(",")})`;

// Material-only basin depth and outflow, anchored to existing water features.
// Land alpha still bounds the visible bank/outlet; no new opening is authored.
export const GORGE_POOL_SHADER=/* glsl */ `
vec2 gorgePoolFoot(){return ${vector(GORGE_FALL.foot)}*uWorldMetres;}
vec2 gorgePoolOutlet(){return ${vector(GORGE_FALL.outlet)}*uWorldMetres;}
float gorgePoolMask(vec2 p){
  vec2 center=mix(gorgePoolFoot(),gorgePoolOutlet(),0.34);
  return 1.0-smoothstep(0.65,1.15,length((p-center)/vec2(7.2,5.4)));
}
float gorgePoolDepth(vec2 p){
  vec2 foot=gorgePoolFoot(),outlet=gorgePoolOutlet();
  float lower=smoothstep(foot.y-1.0,outlet.y-1.5,p.y);
  float basin=gorgePoolMask(p)*(1.8+lower*3.2);
  vec2 lowerFoot=${vector(GORGE_FALL.lowerFoot)}*uWorldMetres;
  float bottom=1.0-smoothstep(0.45,1.05,length((p-lowerFoot-vec2(0,1.0))/vec2(4.0,3.8)));
  return max(basin,bottom*6.0);
}
float gorgeLowerDescent(vec2 p){
  vec2 start=gorgePoolOutlet(),end=${vector(GORGE_FALL.lowerFoot)}*uWorldMetres;
  vec2 axis=end-start;
  float t=dot(p-start,axis)/max(0.01,dot(axis,axis));
  float distance=length(p-start-axis*clamp(t,0.0,1.0));
  return (1.0-smoothstep(3.5,6.0,distance))*smoothstep(-0.08,0.92,t);
}
vec2 gorgePoolRipples(vec2 p,float time){
  vec2 delta=(p-gorgePoolFoot())/vec2(1.0,0.65);
  float r=length(delta);
  float phase=r*4.2-time*3.4+noise2(p*0.19)*0.7;
  float envelope=gorgePoolMask(p)*smoothstep(0.8,2.3,r)*exp(-r*0.18);
  return delta/max(r,0.1)*cos(phase)*envelope*0.11;
}
float gorgePoolFoam(vec2 p,float time){
  vec2 foot=gorgePoolFoot(),outlet=gorgePoolOutlet();
  float r=length((p-foot)/vec2(1.0,0.65));
  float ring=pow(max(0.0,sin(r*4.2-time*3.4+noise2(p*0.19)*0.7)),12.0);
  ring*=gorgePoolMask(p)*smoothstep(1.8,3.0,r)*exp(-r*0.16)*0.16;
  ring*=0.35+0.65*noise2(p*0.43);
  vec2 start=mix(foot,outlet,0.30),axis=outlet-start;
  float lengthAxis=length(axis);
  vec2 direction=axis/max(lengthAxis,0.01),side=vec2(-direction.y,direction.x);
  vec2 q=vec2(dot(p-start,side),dot(p-start,direction));
  float channel=exp(-q.x*q.x/1.15)*smoothstep(0.0,1.0,q.y)
    *(1.0-smoothstep(lengthAxis,lengthAxis+1.3,q.y));
  float streak=noise2(vec2(q.x*3.4,q.y*1.7-time*2.6));
  float outflow=channel*pow(smoothstep(0.40,0.80,streak),2.0)*0.13;
  return max(ring,outflow);
}
`;
