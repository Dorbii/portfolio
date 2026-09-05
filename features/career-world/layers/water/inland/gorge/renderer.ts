import type { WaterScene } from "../../WaterRenderer.ts";
import { createTexture,linkProgram } from "../../../../shared/water/webgl.ts";
import { WaterLighting } from "../../../lighting/water/WaterLighting.ts";
import { GORGE_FALL } from "./model.ts";
import { GORGE_VERTEX,GORGE_FRAGMENT } from "./shader.ts";

export class GorgeWaterfallRenderer {
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
    this.gl=gl;this.program=linkProgram(gl,GORGE_VERTEX,GORGE_FRAGMENT);
    const vao=gl.createVertexArray();
    if(!vao){gl.deleteProgram(this.program);throw new Error("Gorge geometry allocation failed.");}
    this.vao=vao;
    try{this.lighting=new WaterLighting(gl,this.program,invalidate);}
    catch(error){gl.deleteVertexArray(vao);gl.deleteProgram(this.program);throw error;}
    for(const name of ["uCamera","uTime","uPass","uOpacity","uCliff","uPixel"])
      this.uniforms[name]=gl.getUniformLocation(this.program,name);
    this.image=new Image();
    this.image.onload=()=>{
      if(this.disposed)return;
      try{this.texture=createTexture(gl,this.image,"clamp","mipmapped");this.state="ready";}
      catch(error){this.state=`unavailable: ${String(error)}`;}
      invalidate();
    };
    this.image.onerror=()=>{if(!this.disposed){this.state="unavailable: cliff source";invalidate();}};
    this.image.src=GORGE_FALL.cliffPath;
  }

  render(scene:WaterScene,seconds:number){
    if(this.disposed||!this.texture||!scene.inlandVisible||!scene.inlandEffects||scene.debug)return 0;
    const {camera}=scene,margin=12;
    if(GORGE_FALL.lip[0]+margin/GORGE_FALL.world[0]<camera.origin[0]
      ||GORGE_FALL.lip[0]-margin/GORGE_FALL.world[0]>camera.origin[0]+camera.span[0]
      ||GORGE_FALL.foot[1]+margin/GORGE_FALL.world[1]<camera.origin[1]
      ||GORGE_FALL.upstream[1]-margin/GORGE_FALL.world[1]>camera.origin[1]+camera.span[1])return 0;
    const gl=this.gl,u=this.uniforms;
    gl.useProgram(this.program);gl.bindVertexArray(this.vao);
    gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform4f(u.uCamera,...camera.origin,...camera.span);
    gl.uniform1f(u.uTime,seconds);gl.uniform1f(u.uOpacity,scene.state.opacity);
    gl.uniform1f(u.uPixel,camera.span[0]*GORGE_FALL.world[0]/gl.drawingBufferWidth);
    this.lighting.bind(scene.light);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.uniform1i(u.uCliff,0);
    gl.uniform1f(u.uPass,0);gl.drawArrays(gl.TRIANGLES,0,6);
    gl.uniform1f(u.uPass,1);gl.drawArraysInstanced(gl.TRIANGLES,0,64*6,7);
    gl.uniform1f(u.uPass,2);gl.drawArrays(gl.TRIANGLES,0,6);
    gl.uniform1f(u.uPass,3);gl.drawArraysInstanced(gl.TRIANGLES,0,12*6,4);
    return 4;
  }

  destroy(){
    if(this.disposed)return;this.disposed=true;
    this.image.onload=null;this.image.onerror=null;this.image.src="";
    if(this.texture)this.gl.deleteTexture(this.texture);
    this.lighting.destroy();this.gl.deleteVertexArray(this.vao);this.gl.deleteProgram(this.program);
  }
}
