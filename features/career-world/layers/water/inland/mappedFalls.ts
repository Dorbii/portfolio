import atlas from "../../../../../public/career-world/layers/water/inland/mapped-falls-r1.json" with {type:"json"};
import type {WaterScene} from "../WaterRenderer.ts";
import {createTexture,linkProgram} from "../../../shared/water/webgl.ts";
import {WaterLighting} from "../../lighting/water/WaterLighting.ts";
import {MAPPED_FALL_VERTEX,MAPPED_FALL_FRAGMENT} from "./gorge/shader.ts";

export const MAPPED_FALLS=atlas.falls;
const profiles=new Map(MAPPED_FALLS.map(fall=>[fall.id,new Float32Array(fall.profile)]));

// One shared shader/texture for the island's other falls. The reviewed main
// gorge keeps its dedicated renderer and is excluded from this atlas.
export class MappedFallsRenderer {
  private readonly gl:WebGL2RenderingContext;
  private readonly program:WebGLProgram;
  private readonly vao:WebGLVertexArrayObject;
  private readonly lighting:WaterLighting;
  private readonly image:HTMLImageElement;
  private readonly uniforms:Record<string,WebGLUniformLocation|null>={};
  private texture:WebGLTexture|null=null;
  private disposed=false;
  state="loading";
  constructor(gl:WebGL2RenderingContext,invalidate:()=>void){
    this.gl=gl;this.program=linkProgram(gl,MAPPED_FALL_VERTEX,MAPPED_FALL_FRAGMENT);
    const vao=gl.createVertexArray();
    if(!vao){gl.deleteProgram(this.program);throw new Error("Mapped fall allocation failed.");}
    this.vao=vao;
    try{this.lighting=new WaterLighting(gl,this.program,invalidate);}
    catch(error){gl.deleteVertexArray(vao);gl.deleteProgram(this.program);throw error;}
    for(const name of ["uCamera","uTime","uPass","uOpacity","uCliff","uPixel","uFall","uUpstream","uFlight","uWidthScale","uEffectScale","uContext","uAtlasRect","uBacking","uProfile[0]","uEdgeDirection","uCascade"])
      this.uniforms[name]=gl.getUniformLocation(this.program,name);
    this.image=new Image();
    this.image.onload=()=>{
      if(this.disposed)return;
      try{this.texture=createTexture(gl,this.image,"clamp","mipmapped");this.state="ready";}
      catch(error){this.state=String(error);}
      invalidate();
    };
    this.image.onerror=()=>{if(!this.disposed){this.state="unavailable";invalidate();}};
    this.image.src=atlas.texture.path;
  }
  render(scene:WaterScene,seconds:number){
    if(this.disposed||!this.texture||!scene.inlandVisible||!scene.inlandEffects||scene.debug)return 0;
    const gl=this.gl,u=this.uniforms,camera=scene.camera;
    const pixel=camera.span[0]*atlas.world[0]/gl.drawingBufferWidth;
    gl.useProgram(this.program);gl.bindVertexArray(this.vao);
    gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform4f(u.uCamera,...camera.origin,...camera.span);gl.uniform1f(u.uTime,seconds);gl.uniform1f(u.uPixel,pixel);
    this.lighting.bind(scene.light);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.uniform1i(u.uCliff,0);
    let draws=0;
    for(const fall of MAPPED_FALLS){
      const margin=10*fall.effectScale;
      if(Math.max(fall.lip[0],fall.foot[0])+margin/atlas.world[0]<camera.origin[0]
        ||Math.min(fall.lip[0],fall.foot[0])-margin/atlas.world[0]>camera.origin[0]+camera.span[0]
        ||fall.foot[1]+margin/atlas.world[1]<camera.origin[1]
        ||Math.min(fall.lip[1],fall.upstream[1])-margin/atlas.world[1]>camera.origin[1]+camera.span[1])continue;
      const screenHeight=(fall.foot[1]-fall.lip[1])*atlas.world[1]/pixel;
      const lod=Math.max(0,Math.min(1,(screenHeight-.7)/2.3));if(!lod)continue;
      gl.uniform4f(u.uFall,fall.lip[0],fall.lip[1],fall.foot[0],fall.foot[1]);
      gl.uniform2f(u.uUpstream,fall.upstream[0],fall.upstream[1]);gl.uniform2f(u.uFlight,fall.flight[0],fall.flight[1]);
      gl.uniform4fv(u["uProfile[0]"],profiles.get(fall.id)!);
      gl.uniform2f(u.uEdgeDirection,fall.edgeDirection[0],fall.edgeDirection[1]);
      gl.uniform1f(u.uCascade,Number(fall.style==="cascade"));
      gl.uniform1f(u.uWidthScale,fall.widthScale);gl.uniform1f(u.uEffectScale,fall.effectScale);gl.uniform1f(u.uOpacity,scene.state.opacity*lod);
      gl.uniform4f(u.uContext,fall.context.origin[0],fall.context.origin[1],fall.context.span[0],fall.context.span[1]);gl.uniform4f(u.uAtlasRect,fall.atlas[0],fall.atlas[1],fall.atlas[2],fall.atlas[3]);
      gl.uniform2f(u.uBacking,fall.backingOffset[0],fall.backingOffset[1]);
      gl.uniform1f(u.uPass,1);gl.drawArrays(gl.TRIANGLES,0,64*6);draws++;
      if(fall.style!=="cascade"&&fall.hasLanding&&screenHeight>5){gl.uniform1f(u.uPass,2);gl.drawArrays(gl.TRIANGLES,0,6);draws++;}
    }
    return draws;
  }
  destroy(){
    if(this.disposed)return;this.disposed=true;this.image.onload=null;this.image.onerror=null;this.image.src="";
    if(this.texture)this.gl.deleteTexture(this.texture);this.lighting.destroy();this.gl.deleteVertexArray(this.vao);this.gl.deleteProgram(this.program);
  }
}
