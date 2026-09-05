import { WATER_LIGHTING_SHADER } from "../../../lighting/water/shader.ts";
import { GORGE_FALL, gorgeFlight } from "./model.ts";

const vector=(p:readonly number[])=>`vec2(${p.map(n=>n.toFixed(8)).join(",")})`;
const flight=gorgeFlight();
const makeVertex=(mapped:boolean)=>`#version 300 es
precision highp float;
uniform vec4 uCamera;
uniform float uTime;
uniform float uPass;
uniform sampler2D uCliff;
out vec2 vUv;
out vec2 vWorld;
out float vTravel;
out float vRibbon;
out float vAcross;
const vec2 WORLD=${vector(GORGE_FALL.world)};
${mapped?`uniform vec4 uFall;
uniform vec2 uUpstream;
uniform vec2 uFlight;
uniform float uWidthScale;
uniform float uEffectScale;
#define LIP (uFall.xy*WORLD)
#define FOOT (uFall.zw*WORLD)
#define UPSTREAM (uUpstream*WORLD)`:`const vec2 LIP=${vector(GORGE_FALL.lip)}*WORLD;
const vec2 FOOT=${vector(GORGE_FALL.foot)}*WORLD;
const vec2 UPSTREAM=${vector(GORGE_FALL.upstream)}*WORLD;`}
vec2 corner(int n){if(n==0||n==3)return vec2(0,0);if(n==1)return vec2(1,0);if(n==2||n==4)return vec2(1,1);return vec2(0,1);}
void main(){
  vec2 c=corner(gl_VertexID%6),position;
  vUv=c;vTravel=0.0;vRibbon=float(gl_InstanceID);vAcross=0.0;
  if(uPass>2.5){
    float id=float(gl_InstanceID),side=id<2.0?-1.0:1.0;
    vec2 origin=FOOT+vec2(0,1.4+mod(id,2.0)*1.5);
    // Locate the actual side edge of this water opening in the canonical alpha.
    float edge=7.0;
    for(int i=1;i<=20;i++){
      vec2 probe=origin+vec2(side*float(i)*0.5,0);
      vec2 uv=(probe/WORLD-${vector(GORGE_FALL.tileBounds.origin)})/${vector(GORGE_FALL.tileBounds.span)};
      if(textureLod(uCliff,uv,0.0).a>0.5){edge=float(i)*0.5;break;}
    }
    origin.x+=side*(edge-0.35);
    float t=(float(gl_VertexID/6)+c.y)/12.0;
    position=origin+vec2(side*(t*0.8+t*t*0.55),t*0.8+t*t*3.4);
    position.x+=(c.x*2.0-1.0)*(0.16+0.10*sin(t*8.0-uTime*2.0+id));
    vUv=vec2(c.x,t);vTravel=t;
  }else if(uPass<0.5){
    position=mix(vec2(min(LIP.x,FOOT.x)-4.5*${mapped?"uWidthScale":"1.0"},LIP.y),vec2(max(LIP.x,FOOT.x)+4.5*${mapped?"uWidthScale":"1.0"},FOOT.y),c);
  }else if(uPass>1.5){
    position=FOOT+((c*2.0-1.0)*vec2(8.0,5.5)-vec2(0,1.2))*${mapped?"uEffectScale":"1.0"};
  }else{
    float s=(float(gl_VertexID/6)+c.y)/64.0;
    float along=max(0.0,(s-0.12)/0.88);
    float age=along*${mapped?"uFlight.x":flight.duration.toFixed(8)};
    vTravel=age;
    vec2 velocity=vec2(${mapped?"uFlight.y":flight.velocityX.toFixed(8)},${GORGE_FALL.entrySpeed.toFixed(8)});
    if(s<0.12){
      float t=s/0.12;
      vec2 a=UPSTREAM,b=UPSTREAM+(LIP-UPSTREAM)*0.55,d=LIP,e=LIP-velocity*0.45;
      position=pow(1.0-t,3.0)*a+3.0*(1.0-t)*(1.0-t)*t*b+3.0*(1.0-t)*t*t*e+t*t*t*d;
    }else position=LIP+velocity*age+vec2(0,0.5*${(GORGE_FALL.gravity*GORGE_FALL.verticalProjection).toFixed(8)}*age*age);
    float ribbon=vRibbon;
    float lane=ribbon<0.5?0.0:(ribbon-3.5)*0.39;
    float stretch=sqrt(1.5/(1.5+9.81*age));
    float pulse=0.35+0.65*pow(sin((age-uTime)*3.1+ribbon*4.7),2.0);
    float width=ribbon<0.5?1.95*mix(0.7,1.0,smoothstep(0.0,0.15,s))*mix(1.0,0.8,along):0.48*mix(1.0,stretch,0.6)*pulse;
    float spread=lane*(1.0+along*along*0.8);
    float flutter=sin(age*3.5-uTime*2.0+ribbon*3.7)*0.23*along;
    flutter+=sin(age*8.0-uTime*3.3+ribbon)*0.035*along;
    vAcross=(spread+flutter+(c.x*2.0-1.0)*width)*${mapped?"uWidthScale":"1.0"};
    position.x+=vAcross;
    vUv=vec2(c.x,s);
  }
  vWorld=position/WORLD;
  vec2 screen=(vWorld-uCamera.xy)/uCamera.zw;
  gl_Position=vec4(screen.x*2.0-1.0,1.0-screen.y*2.0,0,1);
}
`;

const makeFragment=(mapped:boolean)=>`#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vWorld;
in float vTravel;
in float vRibbon;
in float vAcross;
uniform float uTime;
uniform float uPass;
uniform float uOpacity;
uniform float uPixel;
uniform sampler2D uCliff;
${mapped?`uniform vec4 uContext;
uniform vec4 uAtlasRect;
uniform vec2 uBacking;
uniform vec4 uFall;
uniform float uWidthScale;`:""}
out vec4 color;
${WATER_LIGHTING_SHADER}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.0),f.x),f.y);}
vec2 tileUv(vec2 p){return ${mapped?"(p-uContext.xy)/uContext.zw":`(p-${vector(GORGE_FALL.tileBounds.origin)})/${vector(GORGE_FALL.tileBounds.span)}`};}
vec4 cliffSample(vec2 p){return texture(uCliff,${mapped?"uAtlasRect.xy+clamp(p,vec2(0.001),vec2(0.999))*uAtlasRect.zw":"p"});}
void main(){
  float alpha;vec3 linear;
  vec2 landUv=tileUv(vWorld);
  float land=cliffSample(landUv).a;
  if(uPass>2.5){
    float edge=1.0-smoothstep(0.3,1.0,abs(vUv.x*2.0-1.0));
    float moving=noise(vec2(vUv.x*2.4+vRibbon*6.1,(vTravel-uTime)*3.8));
    alpha=edge*(0.17+moving*0.25)*(1.0-smoothstep(0.45,1.0,vUv.y));
    alpha*=1.0-smoothstep(0.15,0.55,uPixel);
    linear=mix(waterOptics(vec3(0.018,0.075,0.10),vec3(0,0,1),0.23,vWorld),illuminatedFoam(vWorld),0.28+moving*0.25);
  }else if(uPass<0.5){
    vec4 rock=cliffSample(landUv+${mapped?"uBacking":"vec2(0.048,0)"});
    alpha=(1.0-land)*rock.a*smoothstep(0.0,0.025,vUv.y)*(1.0-smoothstep(0.89,1.0,vUv.y));
    ${mapped?`vec2 a=uFall.xy*${vector(GORGE_FALL.world)},b=uFall.zw*${vector(GORGE_FALL.world)};
    vec2 p=vWorld*${vector(GORGE_FALL.world)},axis=b-a;
    float t=clamp(dot(p-a,axis)/max(0.01,dot(axis,axis)),0.0,1.0);
    alpha*=1.0-smoothstep(1.6*uWidthScale,3.0*uWidthScale,length(p-a-axis*t));`:""}
    linear=pow(rock.rgb,vec3(2.2))*0.65;
    linear=illuminateWater(linear,vec3(0,0,1),60.0,vWorld);
  }else if(uPass>1.5){
    vec2 q=vUv*2.0-1.0;
    float warp=noise(q*4.0+vec2(uTime*0.23,-uTime*0.16));
    vec2 cloud=q+vec2(warp-0.5,noise(q*5.1-uTime*0.18)-0.5)*0.13;
    float core=exp(-dot(cloud*vec2(2.1,3.0),cloud*vec2(2.1,3.0)));
    float plume=exp(-cloud.x*cloud.x*4.0-pow(cloud.y+0.26,2.0)*15.0)*(0.45+warp*0.55);
    float grain=noise(q*vec2(28,17)+vec2(uTime*0.7,-uTime*1.2));
    alpha=core*(0.20+grain*0.45)*(1.0-land)+plume*0.25;
    linear=illuminatedFoam(vWorld);
  }else{
    float across=vUv.x*2.0-1.0;
    float edge=1.0-smoothstep(0.55,1.0,abs(across));
    // One coherent material across all strips: no repeated per-ribbon
    // highlights or six independent bright lanes down the whole drop.
    vec2 flowUv=vec2(vAcross*1.05,(vTravel-uTime)*3.4);
    flowUv+=vec2(noise(flowUv*0.53+8.1),noise(flowUv*0.47+31.7))*0.65;
    float body=noise(flowUv);
    float fragments=noise(flowUv*vec2(2.6,1.7)+13.0);
    float lower=smoothstep(0.40,0.93,vUv.y);
    float detail=1.0-smoothstep(0.16,0.65,uPixel);
    vec3 normal=normalize(vec3(vAcross*0.12+(body-0.5)*0.04,-0.25+0.80*exp(-vUv.y*16.0),1.0));
    linear=waterOptics(vec3(0.026,0.12,0.17),normal,0.18,vWorld);
    float aeration=0.21+lower*0.40+smoothstep(0.46,0.78,body*0.6+fragments*0.4)*(0.08+lower*0.20);
    aeration*=mix(0.70,1.0,detail);
    linear=mix(linear,illuminatedFoam(vWorld),aeration);
    alpha=edge*(vRibbon<0.5?0.82*(0.86+body*0.14):0.36*lower*smoothstep(0.53,0.78,fragments));
    if(vRibbon>0.5)alpha*=detail;
    alpha*=1.0-smoothstep(0.92,1.0,vUv.y);
    ${mapped?"if(vUv.y<0.12)alpha*=1.0-land;":""}
  }
  alpha*=uOpacity;
  if(alpha<0.001)discard;
  color=vec4(pow(max(linear,vec3(0)),vec3(1.0/2.2))*alpha,alpha);
}
`;

export const GORGE_VERTEX=makeVertex(false);
export const GORGE_FRAGMENT=makeFragment(false);
export const MAPPED_FALL_VERTEX=makeVertex(true);
export const MAPPED_FALL_FRAGMENT=makeFragment(true);
