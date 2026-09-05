import { WATER_LIGHTING_SHADER } from "../../../lighting/water/shader.ts";

export const EVENT_VERTEX = `#version 300 es
precision highp float;
uniform vec4 uCamera;
uniform vec2 uWorldMetres;
uniform vec4 uSites[8];
uniform vec4 uMotion[8];
uniform vec2 uStyle[8];
uniform float uPixelMetres;
out vec2 vUv;
out vec2 vWorld;
out float vAlpha;
float hash(float n) { return fract(sin(n*127.1)*43758.5453); }
vec2 corner(int n) {
  if(n==0||n==3) return vec2(0,0);
  if(n==1) return vec2(1,0);
  if(n==2||n==4) return vec2(1,1);
  return vec2(0,1);
}
void main() {
  int id=gl_InstanceID,particle=gl_VertexID/6;
  vec4 site=uSites[id],motion=uMotion[id];
  vec2 style=uStyle[id],direction=motion.xy,tangent=vec2(-direction.y,direction.x);
  float age=motion.z,impact=motion.w,seed=style.y+float(particle)*7.13;
  float r=hash(seed),r2=hash(seed+23.4),r3=hash(seed+48.1);
  float emission=mix(2.0+r*2.1,0.08+r*0.85,impact);
  float flight=age-emission;
  float vz=(7.0+10.0*r2)*sqrt(site.w/8.0);
  float initial=site.w*0.68*(1.0-impact);
  float z=initial+vz*flight-4.905*flight*flight;
  vec2 origin=site.xy+direction*(emission-4.0)*2.5*(1.0-impact);
  vec2 position=origin+tangent*(r3-0.5)*site.z;
  position+=(direction*mix(2.0+r2*3.0,-2.0+r2*4.0,impact)+tangent*(r-0.5)*3.0)*flight;
  float lifetime=(vz+sqrt(vz*vz+19.62*initial))/9.81;
  bool mist=particle<16;
  float radius=mist?(0.55+r2*0.8+flight*0.3):(0.08+r2*0.16+max(0.0,flight)*0.06);
  radius=max(radius,uPixelMetres*0.7);
  vUv=corner(gl_VertexID%6)*2.0-1.0;
  position+=vUv*radius;
  float alpha=style.x*smoothstep(0.0,0.1,flight)*(1.0-smoothstep(lifetime*0.55,lifetime,flight));
  alpha*=mist?0.12:0.7;
  if(flight<0.0||z<0.0) alpha=0.0;
  vWorld=position/uWorldMetres;
  vec2 raised=position-vec2(0,z*0.86);
  vec2 screen=(raised/uWorldMetres-uCamera.xy)/uCamera.zw;
  gl_Position=vec4(screen.x*2.0-1.0,1.0-screen.y*2.0,0,1);
  vAlpha=alpha;
  if(alpha<=0.0001) gl_Position=vec4(2,2,2,1);
}`;

export const EVENT_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vWorld;
in float vAlpha;
uniform float uOpacity;
out vec4 color;
${WATER_LIGHTING_SHADER}
void main() {
  float radius=dot(vUv,vUv);
  float alpha=vAlpha*uOpacity*exp(-radius*3.0)*(1.0-smoothstep(0.55,1.0,radius));
  if(alpha<0.002) discard;
  vec3 lit=illuminatedFoam(vWorld)+vec3(0.0,0.012,0.02);
  vec3 srgb=pow(max(lit,vec3(0)),vec3(1.0/2.2));
  color=vec4(srgb*alpha,alpha);
}`;
