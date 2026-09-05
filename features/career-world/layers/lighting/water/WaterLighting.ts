import type { WorldLight } from "../../../shared/lighting.ts";
import { createTexture } from "../../../shared/water/webgl.ts";
import { CLOUD_SHADOW_TEXTURE, lightingEffects, lightingIrradiance, lightingSky, linearRgb, srgbByte } from "../model.ts";

const NAMES = ["uLightDirection", "uLightColor", "uAmbientColor", "uLightIntensity", "uLightingCloud", "uLightingCloudOffset", "uLightingCloudStrength", "uLightingEnabled", "uSkyZenith", "uSkyHorizon"] as const;
type Name = typeof NAMES[number];

export function waterFallbackColor(light: WorldLight): string {
  const illumination = lightingEffects(light).enabled ? lightingIrradiance(light).total : [1, 1, 1];
  return `rgb(${[0.028, 0.065, 0.135].map((value, i) => srgbByte(value * illumination[i])).join(" ")})`;
}

export class WaterLighting {
  private readonly gl: WebGL2RenderingContext;
  private readonly uniforms = {} as Record<Name, WebGLUniformLocation | null>;
  private texture: WebGLTexture;
  private readonly image: HTMLImageElement;
  private ready = false;
  private disposed = false;

  constructor(gl: WebGL2RenderingContext, program: WebGLProgram, invalidate: () => void) {
    this.gl = gl;
    for (const name of NAMES) this.uniforms[name] = gl.getUniformLocation(program, name);
    const texture = gl.createTexture();
    if (!texture) throw new Error("Could not allocate the shared lighting texture.");
    this.texture = texture;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    this.image = new Image();
    this.image.onload = () => {
      if (this.disposed) return;
      gl.deleteTexture(this.texture);
      this.texture = createTexture(gl, this.image, "repeat", "linear");
      this.ready = true; invalidate();
    };
    this.image.onerror = () => { if (!this.disposed) invalidate(); };
    this.image.src = CLOUD_SHADOW_TEXTURE;
  }

  bind(light: WorldLight) {
    const { gl, uniforms: u } = this;
    const length = Math.hypot(...light.direction) || 1;
    gl.uniform3f(u.uLightDirection, ...light.direction.map((n) => n / length) as [number, number, number]);
    gl.uniform3f(u.uLightColor, ...linearRgb(light.color));
    gl.uniform3f(u.uAmbientColor, ...linearRgb(light.ambientColor));
    gl.uniform1f(u.uLightIntensity, light.intensity);
    const sky = lightingSky(light);
    gl.uniform3f(u.uSkyZenith, ...sky.zenith); gl.uniform3f(u.uSkyHorizon, ...sky.horizon);
    const effects = lightingEffects(light);
    gl.uniform1f(u.uLightingEnabled, Number(effects.enabled));
    gl.uniform1f(u.uLightingCloudStrength, this.ready ? effects.cloudStrength : 0);
    gl.uniform2f(u.uLightingCloudOffset, ...effects.cloudOffset);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(u.uLightingCloud, 1);
    gl.activeTexture(gl.TEXTURE0);
  }

  destroy() {
    this.disposed = true;
    this.image.onload = null; this.image.onerror = null; this.image.src = "";
    this.gl.deleteTexture(this.texture);
  }
}
