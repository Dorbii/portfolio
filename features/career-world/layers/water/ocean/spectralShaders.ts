// Render-to-texture uses gl_FragCoord throughout: no image-plane Y flip enters
// frequency space. Complex pairs pack height, X displacement, Y displacement.
const HEADER = `#version 300 es
precision highp float;
precision highp int;
const float TAU = 6.28318530718;
vec2 cmul(vec2 a, vec2 b) { return vec2(a.x*b.x-a.y*b.y, a.x*b.y+a.y*b.x); }
`;

export const EVOLVE_SPECTRUM = HEADER + `
uniform sampler2D uSeed;
uniform float uSeconds;
uniform float uHeight;
layout(location=0) out vec4 outA;
layout(location=1) out vec4 outB;
void main() {
  ivec2 p=ivec2(gl_FragCoord.xy), size=textureSize(uSeed,0);
  vec4 seed=texelFetch(uSeed,p,0);
  vec2 opposite=texelFetch(uSeed,(size-p)%size,0).xy;
  float k=length(seed.zw);
  if (k<0.00001) { outA=vec4(0); outB=vec4(0); return; }
  float phase=sqrt(9.81*k)*uSeconds;
  vec2 rotation=vec2(cos(phase),sin(phase));
  vec2 h=(cmul(seed.xy,vec2(rotation.x,-rotation.y))+cmul(vec2(opposite.x,-opposite.y),rotation))*uHeight;
  vec2 d=vec2(-h.y,h.x);
  outA=vec4(h,d*seed.z/k); outB=vec4(d*seed.w/k,0,0);
}`;

// Radix-2 Stockham autosort inverse transform. Every stage normalizes by two;
// two dimensions therefore normalize by N squared. Two complex pairs per MRT.
export const INVERSE_FFT = HEADER + `
uniform sampler2D uA;
uniform sampler2D uB;
uniform int uStage;
uniform int uAxis;
layout(location=0) out vec4 outA;
layout(location=1) out vec4 outB;
vec4 butterfly(vec4 a, vec4 b, vec2 w) { return (a+vec4(cmul(b.xy,w),cmul(b.zw,w)))*0.5; }
void main() {
  ivec2 p=ivec2(gl_FragCoord.xy), size=textureSize(uA,0);
  int index=uAxis==0?p.x:p.y;
  int halfStage=uStage/2;
  int even=(index/uStage)*halfStage+index%halfStage;
  int odd=even+size.x/2;
  ivec2 pa=uAxis==0?ivec2(even,p.y):ivec2(p.x,even);
  ivec2 pb=uAxis==0?ivec2(odd,p.y):ivec2(p.x,odd);
  float phase=TAU*float(index)/float(uStage);
  vec2 w=vec2(cos(phase),sin(phase));
  outA=butterfly(texelFetch(uA,pa,0),texelFetch(uA,pb,0),w);
  outB=butterfly(texelFetch(uB,pa,0),texelFetch(uB,pb,0),w);
}`;

export const RESOLVE_SURFACE = HEADER + `
uniform sampler2D uA;
uniform sampler2D uB;
uniform sampler2D uPrevious;
uniform float uLength;
uniform float uChop;
uniform float uDelta;
uniform float uThreshold;
uniform float uHistory;
uniform vec2 uDrift;
layout(location=0) out vec4 surface;
layout(location=1) out vec4 offset;
vec3 displacement(ivec2 p) {
  ivec2 size=textureSize(uA,0); p=(p+size)%size;
  vec4 a=texelFetch(uA,p,0), b=texelFetch(uB,p,0);
  return vec3(a.x,a.z*uChop,b.x*uChop);
}
void main() {
  ivec2 p=ivec2(gl_FragCoord.xy), size=textureSize(uA,0);
  float derivative=float(size.x)/(2.0*uLength);
  vec3 dx=(displacement(p+ivec2(1,0))-displacement(p-ivec2(1,0)))*derivative;
  vec3 dy=(displacement(p+ivec2(0,1))-displacement(p-ivec2(0,1)))*derivative;
  float jacobian=(1.0+dx.y)*(1.0+dy.z)-dx.z*dy.y;
  vec2 slope=vec2((1.0+dy.z)*dx.x-dx.z*dy.x,(1.0+dx.y)*dy.x-dy.y*dx.x)/max(0.2,jacobian);
  float injection=1.0-smoothstep(0.10,uThreshold,jacobian);
  vec2 previousUv=(vec2(p)+0.5)/vec2(size)-uDrift*uDelta/uLength;
  float old=textureLod(uPrevious,previousUv,0.0).a*uHistory;
  // Brief residual aeration, not a long-lived patch carried behind every crest.
  float foam=max(injection,old*exp(-uDelta*1.6));
  surface=vec4(displacement(p).x,clamp(slope,vec2(-2),vec2(2)),foam);
  offset=vec4(displacement(p).yz,0,0);
}`;
