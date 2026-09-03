import type { CameraView } from "../../../shared/camera";
import { DETAIL_POLICY, type DetailState } from "../../../shared/lod";
import type { WorldLight } from "../../../shared/lighting";
import {
  INLAND_WATER_FRAGMENT_SHADER,
  INLAND_WATER_VERTEX_SHADER,
} from "./shaders/inland-water";
import { createTexture, linkProgram, loadImage } from "../../../shared/water/webgl";

const INLAND_FIELD_PATH =
  "/career-world/layers/inland-water/authority/fields/ninjaone-inland-water-field-r1.png";
const INLAND_DETAIL_PATH =
  "/career-world/layers/inland-water/surface-motion/textures/ninjaone-inland-water-detail-r1.png";
const INLAND_RIVERBED_PATH =
  "/career-world/layers/inland-water/surface-motion/textures/ninjaone-inland-riverbed-r1.png";
const INLAND_SURFACE_PATH =
  "/career-world/layers/inland-water/surface-motion/textures/ninjaone-inland-water-surface-r1.png";
const INLAND_OWNERSHIP_PATH =
  "/career-world/layers/inland-water/authority/masks/ninjaone-inland-terrain-erase-r1.png";
const ARTBOARD_DIMENSIONS = Object.freeze([1440, 1080] as const);
const FIELD_DIMENSIONS = Object.freeze([1728, 2736] as const);
const FIELD_CROP_ORIGIN = Object.freeze([480, 168] as const);
const FIELD_CROP_SPAN = Object.freeze([576, 912] as const);
const DETAIL_DIMENSIONS = Object.freeze([512, 512] as const);
const RIVERBED_DIMENSIONS = Object.freeze([512, 512] as const);
const SURFACE_DIMENSIONS = Object.freeze([1024, 512] as const);
const OWNERSHIP_DIMENSIONS = Object.freeze([576, 912] as const);
const REGION_ORIGIN = Object.freeze([0.125, 0] as const);
const REGION_SPAN = Object.freeze([0.125, 1 / 6] as const);

const UNIFORM_NAMES = [
  "u_time",
  "u_resolution",
  "u_cameraOrigin",
  "u_cameraSpan",
  "u_artboardDimensions",
  "u_fieldCropOrigin",
  "u_fieldCropSpan",
  "u_regionOrigin",
  "u_regionSpan",
  "u_territoryLod",
  "u_capitalLod",
  "u_siteLod",
  "u_effectsEnabled",
  "u_lightDirection",
  "u_inlandField",
  "u_inlandOwnership",
  "u_inlandDetail",
  "u_riverbedAlbedo",
  "u_surfaceAlbedo",
] as const;

type UniformMap = Readonly<Record<(typeof UNIFORM_NAMES)[number], WebGLUniformLocation>>;

function normalize3(
  values: readonly [number, number, number],
): readonly [number, number, number] {
  const length = Math.hypot(...values);
  if (length === 0) {
    throw new Error("World light direction cannot be zero.");
  }
  return values.map((value) => value / length) as [number, number, number];
}

export class NinjaOneInlandWaterRenderer {
  static async create(
    canvas: HTMLCanvasElement,
    light: WorldLight,
  ): Promise<NinjaOneInlandWaterRenderer> {
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: "high-performance",
    });
    if (!gl) {
      throw new Error("WebGL 2 is unavailable for inland water.");
    }

    const [
      program,
      fieldImage,
      detailImage,
      riverbedImage,
      surfaceImage,
      ownershipImage,
    ] = await Promise.all([
      Promise.resolve(linkProgram(
        gl,
        INLAND_WATER_VERTEX_SHADER,
        INLAND_WATER_FRAGMENT_SHADER,
      )),
      loadImage(INLAND_FIELD_PATH),
      loadImage(INLAND_DETAIL_PATH),
      loadImage(INLAND_RIVERBED_PATH),
      loadImage(INLAND_SURFACE_PATH),
      loadImage(INLAND_OWNERSHIP_PATH),
    ]);
    if (
      fieldImage.naturalWidth !== FIELD_DIMENSIONS[0]
      || fieldImage.naturalHeight !== FIELD_DIMENSIONS[1]
    ) {
      gl.deleteProgram(program);
      throw new Error(
        `Inland field dimensions ${fieldImage.naturalWidth}x${fieldImage.naturalHeight}`
          + ` do not match ${FIELD_DIMENSIONS.join("x")}.`,
      );
    }
    if (
      detailImage.naturalWidth !== DETAIL_DIMENSIONS[0]
      || detailImage.naturalHeight !== DETAIL_DIMENSIONS[1]
    ) {
      gl.deleteProgram(program);
      throw new Error(
        `Inland detail dimensions ${detailImage.naturalWidth}x${detailImage.naturalHeight}`
          + ` do not match ${DETAIL_DIMENSIONS.join("x")}.`,
      );
    }
    if (
      riverbedImage.naturalWidth !== RIVERBED_DIMENSIONS[0]
      || riverbedImage.naturalHeight !== RIVERBED_DIMENSIONS[1]
    ) {
      gl.deleteProgram(program);
      throw new Error(
        `Riverbed dimensions ${riverbedImage.naturalWidth}x${riverbedImage.naturalHeight}`
          + ` do not match ${RIVERBED_DIMENSIONS.join("x")}.`,
      );
    }
    if (
      surfaceImage.naturalWidth !== SURFACE_DIMENSIONS[0]
      || surfaceImage.naturalHeight !== SURFACE_DIMENSIONS[1]
    ) {
      gl.deleteProgram(program);
      throw new Error(
        `Surface dimensions ${surfaceImage.naturalWidth}x${surfaceImage.naturalHeight}`
          + ` do not match ${SURFACE_DIMENSIONS.join("x")}.`,
      );
    }
    if (
      ownershipImage.naturalWidth !== OWNERSHIP_DIMENSIONS[0]
      || ownershipImage.naturalHeight !== OWNERSHIP_DIMENSIONS[1]
    ) {
      gl.deleteProgram(program);
      throw new Error(
        `Inland ownership dimensions ${ownershipImage.naturalWidth}x${ownershipImage.naturalHeight}`
          + ` do not match ${OWNERSHIP_DIMENSIONS.join("x")}.`,
      );
    }
    return new NinjaOneInlandWaterRenderer(
      canvas,
      gl,
      program,
      createTexture(gl, fieldImage, "clamp"),
      createTexture(gl, detailImage, "repeat"),
      createTexture(gl, riverbedImage, "mirror"),
      createTexture(gl, surfaceImage, "mirror"),
      createTexture(gl, ownershipImage, "clamp"),
      light,
    );
  }

  readonly canvas: HTMLCanvasElement;
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly buffer: WebGLBuffer;
  private readonly fieldTexture: WebGLTexture;
  private readonly detailTexture: WebGLTexture;
  private readonly riverbedTexture: WebGLTexture;
  private readonly surfaceTexture: WebGLTexture;
  private readonly ownershipTexture: WebGLTexture;
  private readonly uniforms: UniformMap;
  private camera: CameraView = { origin: [0, 0], span: [1, 1] };
  private detailState: DetailState | null = null;
  private lightDirection: readonly [number, number, number];
  private pixelRatio = 1;
  private renderScale = 1;
  private resizePending = true;
  private effectsEnabled = true;

  private constructor(
    canvas: HTMLCanvasElement,
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
    fieldTexture: WebGLTexture,
    detailTexture: WebGLTexture,
    riverbedTexture: WebGLTexture,
    surfaceTexture: WebGLTexture,
    ownershipTexture: WebGLTexture,
    light: WorldLight,
  ) {
    this.canvas = canvas;
    this.gl = gl;
    this.program = program;
    this.fieldTexture = fieldTexture;
    this.detailTexture = detailTexture;
    this.riverbedTexture = riverbedTexture;
    this.surfaceTexture = surfaceTexture;
    this.ownershipTexture = ownershipTexture;
    this.lightDirection = normalize3(light.direction);

    const buffer = gl.createBuffer();
    if (!buffer) {
      throw new Error("WebGL could not allocate the inland-water plane.");
    }
    this.buffer = buffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const position = gl.getAttribLocation(program, "a_position");
    if (position < 0) {
      throw new Error("Inland-water shader is missing a_position.");
    }
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    this.uniforms = Object.fromEntries(
      UNIFORM_NAMES.map((name) => {
        const location = gl.getUniformLocation(program, name);
        if (location === null) {
          throw new Error(`Inland-water shader is missing uniform ${name}.`);
        }
        return [name, location];
      }),
    ) as UniformMap;
    gl.useProgram(program);
    gl.uniform1i(this.uniforms.u_inlandField, 0);
    gl.uniform1i(this.uniforms.u_inlandOwnership, 4);
    gl.uniform1i(this.uniforms.u_inlandDetail, 1);
    gl.uniform1i(this.uniforms.u_riverbedAlbedo, 2);
    gl.uniform1i(this.uniforms.u_surfaceAlbedo, 3);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
  }

  setView(camera: CameraView, detailState: DetailState): void {
    this.camera = camera;
    this.detailState = detailState;
    if (this.renderScale !== detailState.renderScale) {
      this.renderScale = detailState.renderScale;
      this.resizePending = true;
    }
  }

  setLight(light: WorldLight): void {
    this.lightDirection = normalize3(light.direction);
  }

  setEffectsEnabled(enabled: boolean): void {
    this.effectsEnabled = enabled;
  }

  render(elapsedSeconds: number): void {
    const detailState = this.detailState;
    if (!detailState) {
      throw new Error("Inland-water view must be set before rendering.");
    }
    const gl = this.gl;
    if (this.resizePending) {
      this.resize();
      this.resizePending = false;
    }
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.fieldTexture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.detailTexture);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.riverbedTexture);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.surfaceTexture);
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, this.ownershipTexture);
    gl.uniform1f(this.uniforms.u_time, elapsedSeconds);
    gl.uniform2f(this.uniforms.u_resolution, this.canvas.width, this.canvas.height);
    gl.uniform2fv(this.uniforms.u_cameraOrigin, this.camera.origin);
    gl.uniform2fv(this.uniforms.u_cameraSpan, this.camera.span);
    gl.uniform2fv(this.uniforms.u_artboardDimensions, ARTBOARD_DIMENSIONS);
    gl.uniform2fv(this.uniforms.u_fieldCropOrigin, FIELD_CROP_ORIGIN);
    gl.uniform2fv(this.uniforms.u_fieldCropSpan, FIELD_CROP_SPAN);
    gl.uniform2fv(this.uniforms.u_regionOrigin, REGION_ORIGIN);
    gl.uniform2fv(this.uniforms.u_regionSpan, REGION_SPAN);
    gl.uniform1f(this.uniforms.u_territoryLod, detailState.worldToTerritory);
    gl.uniform1f(this.uniforms.u_capitalLod, detailState.territoryToCapital);
    gl.uniform1f(this.uniforms.u_siteLod, detailState.capitalToSite);
    gl.uniform1f(this.uniforms.u_effectsEnabled, this.effectsEnabled ? 1 : 0);
    gl.uniform3fv(this.uniforms.u_lightDirection, this.lightDirection);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  destroy(): void {
    this.gl.deleteTexture(this.fieldTexture);
    this.gl.deleteTexture(this.detailTexture);
    this.gl.deleteTexture(this.riverbedTexture);
    this.gl.deleteTexture(this.surfaceTexture);
    this.gl.deleteTexture(this.ownershipTexture);
    this.gl.deleteBuffer(this.buffer);
    this.gl.deleteProgram(this.program);
  }

  requestResize(): void {
    this.resizePending = true;
  }

  private resize(): void {
    const bounds = this.canvas.getBoundingClientRect();
    this.pixelRatio = Math.min(
      (window.devicePixelRatio || 1) * this.renderScale,
      DETAIL_POLICY.renderScale.maximumAnimatedWaterDevicePixelRatio,
    );
    const width = Math.max(1, Math.round(bounds.width * this.pixelRatio));
    const height = Math.max(1, Math.round(bounds.height * this.pixelRatio));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }
}
