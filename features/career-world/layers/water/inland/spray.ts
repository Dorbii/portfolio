import { INLAND_FALL_ENDPOINTS } from "./falls.ts";
import { GorgeWaterfallRenderer } from "./gorge/renderer.ts";
import {MappedFallsRenderer,MAPPED_FALLS} from "./mappedFalls.ts";
import type { WaterScene } from "../WaterRenderer.ts";
import { linkProgram } from "../../../shared/water/webgl.ts";
import { WaterLighting } from "../../lighting/water/WaterLighting.ts";
import { WATER_LIGHTING_SHADER } from "../../lighting/water/shader.ts";
import fields from "../../../../../public/career-world/layers/water/fields-r1/manifest.json" with { type: "json" };

const WORLD = fields.worldSize.map(n=>n*fields.metresPerWorldUnit);
const VERTEX = `#version 300 es
precision highp float;
uniform vec4 uCamera;
uniform vec2 uWorld;
uniform vec4 uFall;
uniform float uTime;
uniform float uSeed;
uniform float uPixel;
uniform float uSprayScale;
out vec2 vUv;
out vec2 vWorld;
out float vAlpha;
out float vMist;
float hash(float n){return fract(sin(n*127.1)*43758.5453);}
vec2 corner(int n){if(n==0||n==3)return vec2(0,0);if(n==1)return vec2(1,0);if(n==2||n==4)return vec2(1,1);return vec2(0,1);}
void main(){
  float id=float(gl_VertexID/6),seed=id*7.13+uSeed;
  float r=hash(seed),s=hash(seed+31.7),t=hash(seed+73.1);
  bool mist=id<40.0,curtain=id>=216.0;
  vec2 top=uFall.xy*uWorld,foot=uFall.zw*uWorld;
  vec2 down=normalize(foot-top),side=vec2(-down.y,down.x);
  float lifetime=mist?4.0+s*2.0:2.1+s*0.6;
  float age=fract(uTime/lifetime+r)*lifetime;
  float angle=t*6.2831853;
  vec2 radial=vec2(cos(angle),sin(angle)*0.55);
  vec2 position=foot+radial*(0.3+s*1.8)*uSprayScale;
  float z=0.0,alpha=0.0,radius=0.0;
  if(mist){
    position+=(radial*age*(0.7+s*0.8)+vec2(-0.55,0.12)*age)*uSprayScale;
    z=(0.7+age*(0.35+s*0.45))*uSprayScale;
    radius=(0.8+age*(0.35+s*0.25))*uSprayScale;
    alpha=0.065;
  }else{
    float vz=(7.0+s*5.2)*sqrt(uSprayScale);
    z=vz*age-4.905*age*age;
    position+=radial*(1.8+t*2.6)*age*uSprayScale;
    float physicalRadius=(0.045+s*0.11)*uSprayScale;
    radius=max(physicalRadius,uPixel*0.55);
    float coverage=min(1.0,physicalRadius*physicalRadius/(radius*radius));
    alpha=0.5*coverage;
    if(curtain){
      position=mix(top,foot,t)+side*(s-0.5)*2.4;
      position+=down*age*4.5+side*(r-0.5)*age*1.3;
      z=0.3+sin(age*2.0)*0.3;
      alpha=0.30*coverage;
    }
  }
  alpha*=smoothstep(0.0,0.13,age)*(1.0-smoothstep(lifetime*0.60,lifetime,age));
  if(z<0.0)alpha=0.0;
  vUv=corner(gl_VertexID%6)*2.0-1.0;
  vec2 shape=vec2(radius,radius*(mist?0.7:1.8));
  vWorld=position/uWorld;
  position-=vec2(0,z*0.86);
  position+=vUv*shape;
  vec2 screen=(position/uWorld-uCamera.xy)/uCamera.zw;
  gl_Position=vec4(screen.x*2.0-1.0,1.0-screen.y*2.0,0,1);
  vAlpha=alpha;vMist=mist?1.0:0.0;
}
`;
const FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vWorld;
in float vAlpha;
in float vMist;
uniform float uOpacity;
out vec4 color;
${WATER_LIGHTING_SHADER}
void main(){
  float r=dot(vUv,vUv);
  float shape=exp(-r*mix(2.0,2.8,vMist))*(1.0-smoothstep(0.55,1.0,r));
  float alpha=shape*vAlpha*uOpacity;
  if(alpha<0.001)discard;
  vec3 lit=pow(max(illuminatedFoam(vWorld),vec3(0)),vec3(1.0/2.2));
  color=vec4(lit*alpha,alpha);
}
`;

// Shares the existing spray context/canvas; owns only its program, VAO and
// lighting adapter. The caller clears the canvas and handles context recovery.
export class InlandSprayRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly lighting: WaterLighting;
  private readonly gorge:GorgeWaterfallRenderer;
  private readonly mapped:MappedFallsRenderer|null;
  private mappedError="";
  private readonly uniforms: Record<string, WebGLUniformLocation | null> = {};
  private disposed=false;

  constructor(gl: WebGL2RenderingContext,invalidate:()=>void){
    this.gl=gl;
    this.program=linkProgram(gl,VERTEX,FRAGMENT);
    const vao=gl.createVertexArray();
    if(!vao){gl.deleteProgram(this.program);throw new Error("Inland spray allocation failed.");}
    this.vao=vao;
    try{this.lighting=new WaterLighting(gl,this.program,invalidate);}
    catch(error){gl.deleteVertexArray(vao);gl.deleteProgram(this.program);throw error;}
    for(const name of ["uCamera","uWorld","uFall","uTime","uSeed","uPixel","uOpacity","uSprayScale"])
      this.uniforms[name]=gl.getUniformLocation(this.program,name);
    try{this.gorge=new GorgeWaterfallRenderer(gl,invalidate);}
    catch(error){this.lighting.destroy();gl.deleteVertexArray(vao);gl.deleteProgram(this.program);throw error;}
    try{this.mapped=new MappedFallsRenderer(gl,invalidate);}
    catch(error){this.mapped=null;this.mappedError=String(error);}
  }

  get gorgeState(){return this.gorge.state;}
  get mappedState(){return this.mapped?.state??this.mappedError;}

  render(scene:WaterScene,seconds:number):number{
    const gl=this.gl,u=this.uniforms;
    if(this.disposed||gl.isContextLost()||!scene.inlandVisible||!scene.inlandEffects||scene.debug)return 0;
    const gorgeDraws=this.gorge.render(scene,seconds)+(this.mapped?.render(scene,seconds)??0);
    gl.useProgram(this.program);gl.bindVertexArray(this.vao);
    gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform4f(u.uCamera,...scene.camera.origin,...scene.camera.span);
    gl.uniform2f(u.uWorld,WORLD[0],WORLD[1]);
    gl.uniform1f(u.uTime,seconds);gl.uniform1f(u.uOpacity,scene.state.opacity);
    gl.uniform1f(u.uPixel,scene.camera.span[0]*WORLD[0]/gl.drawingBufferWidth);
    this.lighting.bind(scene.light);
    let draws=gorgeDraws;
    INLAND_FALL_ENDPOINTS.forEach((fall,index)=>{
      const top=fall.path[0],foot=fall.point;
      const scale=MAPPED_FALLS.find(mapped=>mapped.id===fall.id)?.effectScale??1;
      if((foot[1]-top[1])*WORLD[1]/(scene.camera.span[0]*WORLD[0]/gl.drawingBufferWidth)<5)return;
      const margin=18;
      if(Math.max(top[0],foot[0])+margin/WORLD[0]<scene.camera.origin[0]
        ||Math.min(top[0],foot[0])-margin/WORLD[0]>scene.camera.origin[0]+scene.camera.span[0]
        ||Math.max(top[1],foot[1])+margin/WORLD[1]<scene.camera.origin[1]
        ||Math.min(top[1],foot[1])-margin/WORLD[1]>scene.camera.origin[1]+scene.camera.span[1])return;
      gl.uniform4f(u.uFall,top[0],top[1],foot[0],foot[1]);
      gl.uniform1f(u.uSeed,fall.id==="great-gorge-fall"?19.7:fall.id==="gorge-lower-cascade"?143.4:19.7+index*123.7);
      gl.uniform1f(u.uSprayScale,scale);
      // The lower cascade disappears into the gorge; it has no visible impact.
      gl.drawArrays(gl.TRIANGLES,fall.hasLanding?0:216*6,(fall.hasLanding?256:40)*6);draws++;
    });
    return draws;
  }

  destroy(){
    if(this.disposed)return;this.disposed=true;
    this.mapped?.destroy();this.gorge.destroy();this.lighting.destroy();this.gl.deleteVertexArray(this.vao);this.gl.deleteProgram(this.program);
  }
}
