import manifest from "../../../../../../public/career-world/layers/water/fields-r1/manifest.json" with { type: "json" };
import { createTexture } from "../../../../shared/water/webgl.ts";
import { SEABED_ALBEDO_PATH, SEABED_SURFACE_PATH } from "./material.ts";
import { OCEAN_DETAILS_PATH } from "../details/material.ts";

const MAPS = [
  ["uSeabedAlbedo", SEABED_ALBEDO_PATH, 7],
  ["uSeabedSurface", SEABED_SURFACE_PATH, 8],
  ["uSeabedGeography", manifest.seabedGeometry.path, 9],
  ["uOceanDetails", OCEAN_DETAILS_PATH, 10],
  ["uOceanDetailSurface", "/career-world/layers/water/ocean/details/ocean-details-surface-r1.png", 11],
] as const;

interface MapTexture { texture: WebGLTexture; image: HTMLImageElement; ready: boolean; unit: number; uniform: WebGLUniformLocation | null }

export class SeabedTextures {
  private readonly gl: WebGL2RenderingContext;
  private readonly maps: MapTexture[] = [];
  private readonly enabled: WebGLUniformLocation | null;
  private readonly shown: WebGLUniformLocation | null;
  private readonly details: WebGLUniformLocation | null;
  private readonly range: WebGLUniformLocation | null;
  private disposed = false;
  error = "";

  constructor(gl: WebGL2RenderingContext, program: WebGLProgram, invalidate: () => void) {
    this.gl = gl;
    this.enabled = gl.getUniformLocation(program, "uSeabedEnabled");
    this.shown = gl.getUniformLocation(program, "uBedShown");
    this.details = gl.getUniformLocation(program, "uOceanDetailsEnabled");
    this.range = gl.getUniformLocation(program, "uSeabedRange");
    try {
      for (const [name, path, unit] of MAPS) {
        const texture = gl.createTexture();
        if (!texture) throw new Error("Seabed texture allocation failed.");
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([128, 128, 0, 0]));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        const image = new Image();
        const item: MapTexture = { texture, image, unit, uniform: gl.getUniformLocation(program, name), ready: false };
        this.maps.push(item);
        image.onload = () => {
          if (this.disposed) return;
          const next = createTexture(gl, image, unit === 9 ? "clamp" : "mirror", unit === 9 ? "linear" : "mipmapped");
          gl.deleteTexture(item.texture); item.texture = next; item.ready = true;
          if (this.maps.every((map) => map.ready)) this.error = "";
          invalidate();
        };
        image.onerror = () => { if (!this.disposed) { this.error = `Seabed asset unavailable: ${path}`; invalidate(); } };
        image.src = path;
      }
    } catch (error) { this.destroy(); throw error; }
  }

  bind(bed: boolean, details: boolean) {
    const gl = this.gl;
    for (const item of this.maps) { gl.activeTexture(gl.TEXTURE0 + item.unit); gl.bindTexture(gl.TEXTURE_2D, item.texture); gl.uniform1i(item.uniform, item.unit); }
    const floorReady = this.maps.slice(0, 3).every((item) => item.ready);
    const detailsReady = floorReady && this.maps.slice(3).every((item) => item.ready);
    gl.uniform1f(this.enabled, Number(floorReady && (bed || details)));
    gl.uniform1f(this.shown, Number(bed && floorReady));
    gl.uniform1f(this.details, Number(details && detailsReady));
    gl.uniform1f(this.range, manifest.seabedGeometry.rangeMetres);
    return { floorReady, detailsReady };
  }

  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    for (const item of this.maps) { item.image.onload = null; item.image.onerror = null; item.image.src = ""; this.gl.deleteTexture(item.texture); }
  }
}
