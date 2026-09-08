import feature from "../../../../../public/career-world/layers/water/inland/submerged-groove-r9.json" with {type:"json"};
import {createTexture} from "../../../shared/water/webgl.ts";

// One small registered artwork layer, sampled as bed albedo before optics.
export class InlandBedFeatureTexture {
  private readonly gl: WebGL2RenderingContext;
  private texture: WebGLTexture;
  private readonly image: HTMLImageElement;
  private readonly sampler: WebGLUniformLocation | null;
  private readonly enabled: WebGLUniformLocation | null;
  private disposed=false;
  state="loading";
  constructor(gl:WebGL2RenderingContext,program:WebGLProgram,invalidate:()=>void){
    this.gl=gl;
    const texture=gl.createTexture();
    if(!texture)throw new Error("Inland bed texture allocation failed.");
    this.texture=texture;
    this.sampler=gl.getUniformLocation(program,"uInlandBedFeature");
    this.enabled=gl.getUniformLocation(program,"uInlandBedFeatureReady");
    gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(4));
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    this.image=new Image();
    this.image.onload=()=>{
      if(this.disposed)return;
      try{const next=createTexture(gl,this.image,"clamp","mipmapped");gl.deleteTexture(this.texture);this.texture=next;this.state="ready";}
      catch(error){this.state=String(error);}
      invalidate();
    };
    this.image.onerror=()=>{if(!this.disposed){this.state="unavailable";invalidate();}};
    this.image.src=feature.texture.path;
  }
  bind(){
    const gl=this.gl;gl.activeTexture(gl.TEXTURE0+12);gl.bindTexture(gl.TEXTURE_2D,this.texture);
    gl.uniform1i(this.sampler,12);gl.uniform1f(this.enabled,Number(this.state==="ready"));
  }
  destroy(){
    if(this.disposed)return;this.disposed=true;this.image.onload=null;this.image.onerror=null;this.image.src="";this.gl.deleteTexture(this.texture);
  }
}
