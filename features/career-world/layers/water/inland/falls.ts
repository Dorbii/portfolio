import fields from "../../../../../public/career-world/layers/water/fields-r1/manifest.json" with { type: "json" };
import { GORGE_FALL } from "./gorge/model.ts";

// Endpoints are derived by the field builder from source-bound fall paths.
// Effects color existing inland water only; coverage and land remain unchanged.
export const INLAND_FALL_ENDPOINTS = fields.features.filter(feature => feature.kind === "fall")
  .map(feature => ({ id: feature.id, point: feature.points[feature.points.length-1], path: feature.points,
    hasLanding:feature.id!=="gorge-lower-cascade"&&(!("hasLanding" in feature)||feature.hasLanding!==false) }));

export const INLAND_FALL_SEGMENTS=INLAND_FALL_ENDPOINTS.flatMap(fall=>{
  let arc=0;
  return fall.path.slice(1).map((end,index)=>{
    const start=fall.path[index];
    const length=Math.hypot(...end.map((n,axis)=>(n-start[axis])*fields.worldSize[axis]*fields.metresPerWorldUnit));
    const segment={fallId:fall.id,start,end,arc,length,terminal:index===fall.path.length-2};
    arc+=length;
    return segment;
  });
});

export const INLAND_FALL_SHADER = /* glsl */ `
float dedicatedGorgeFall(vec2 p){
  vec2 world=p/uWorldMetres;
  return step(${(Math.min(GORGE_FALL.lip[0],GORGE_FALL.foot[0])-8/GORGE_FALL.world[0]).toFixed(8)},world.x)
    *step(world.x,${(Math.max(GORGE_FALL.lip[0],GORGE_FALL.foot[0])+8/GORGE_FALL.world[0]).toFixed(8)})
    *step(${GORGE_FALL.lip[1].toFixed(8)},world.y)*step(world.y,${(GORGE_FALL.foot[1]+3/GORGE_FALL.world[1]).toFixed(8)});
}
vec3 inlandFallCoordinates(vec2 p) {
  float nearest=1e10;vec3 result=vec3(0);
  ${INLAND_FALL_SEGMENTS.filter(segment=>segment.fallId==="great-gorge-fall"||segment.fallId==="gorge-lower-cascade").map(segment=>`{
    vec2 a=vec2(${segment.start.map(n=>n.toFixed(8)).join(",")})*uWorldMetres;
    vec2 b=vec2(${segment.end.map(n=>n.toFixed(8)).join(",")})*uWorldMetres;
    vec2 segment=b-a;
    float rawT=dot(p-a,segment)/max(0.001,dot(segment,segment));
    float t=clamp(rawT,0.0,1.0);
    vec2 delta=p-a-segment*t;
    float distance=length(delta);
    if(distance<nearest){
      nearest=distance;
      vec2 normal=normalize(vec2(-segment.y,segment.x));
      float terminalFade=${segment.terminal ? "1.0-smoothstep(0.90,1.0,rawT)" : "1.0"};
      result=vec3(dot(delta,normal),${segment.arc.toFixed(8)}+t*${segment.length.toFixed(8)},(1.0-smoothstep(1.4,3.0,distance))*terminalFade);
    }
  }`).join("\n")}
  return result;
}
vec3 inlandFallCurtain(vec2 p,vec2 pathUv,float time,float weather,vec3 tint) {
  float travel=time*(5.0+weather*2.0);
  vec2 q=vec2(pathUv.x*1.6,pathUv.y*0.28-travel);
  q.x+=noise2(q*0.22)*0.3;
  float broad=noise2(q);
  float fine=noise2(q*vec2(3.2,1.1)+vec2(19.0,-travel*0.35));
  float breakup=noise2(q*vec2(0.6,2.1)+7.0);
  float sheet=pow(smoothstep(0.30,0.80,broad),1.5);
  float filaments=pow(smoothstep(0.35,0.83,fine),2.0)*smoothstep(0.22,0.65,breakup);
  float aeration=0.18+sheet*0.16+filaments*0.54;
  return mix(tint,illuminatedFoam(p/uWorldMetres),aeration);
}
float inlandFallImpact(vec2 p,float time) {
  float result=0.0;
  ${INLAND_FALL_ENDPOINTS.filter(fall=>fall.id==="great-gorge-fall").map(fall => `{
    vec2 center=vec2(${fall.point.map(n=>n.toFixed(8)).join(",")})*uWorldMetres;
    vec2 q=(p-center)/vec2(7.0,4.2);
    float r=length(q);
    vec2 bubbles=mat2(0.8,-0.6,0.6,0.8)*p*2.6;
    bubbles+=vec2(noise2(p*0.75+time*0.1),noise2(p*0.61-time*0.14))*2.1;
    bubbles-=vec2(time*0.4,time*0.65);
    float breakup=noise2(bubbles)*0.6+noise2(bubbles*1.73+12.0)*0.4;
    float churn=exp(-r*r*3.2)*(0.10+smoothstep(0.30,0.75,breakup)*0.65);
    float rings=pow(max(0.0,sin(r*17.0-time*3.2+noise2(p*0.22)*2.0)),5.0)
      *smoothstep(0.35,0.6,r)*(1.0-smoothstep(0.7,1.6,r))*0.28;
    rings*=smoothstep(0.2,0.72,noise2(p*0.45+time*0.04));
    result=max(result,${fall.id==="great-gorge-fall"?"0.0":"churn+rings"});
  }`).join("\n")}
  return clamp(result,0.0,0.88);
}
`;
