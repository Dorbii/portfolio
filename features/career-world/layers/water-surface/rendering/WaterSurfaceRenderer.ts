import type { CameraView } from "../../../shared/camera";
import {
  CAREER_WORLD_THEME,
  hexToUnitRgb,
} from "../../../shared/theme";
import {
  DETAIL_POLICY,
  type DetailState,
} from "../../../shared/lod";
import type { WorldLight } from "../../../shared/lighting";
import {
  NINJAONE_INLAND_TERRAIN_ERASE_MASK,
  WATER_ASSETS,
  WATER_TERRITORY_DETAIL,
} from "../model/assets";
import {
  normalizeWaterSurfaceState,
  type WaterSurfaceState,
  windVectorFromDegrees,
} from "../model/state";
import {
  WATER_FRAGMENT_SHADER,
  WATER_VERTEX_SHADER,
} from "./shaders";
import {
  createTexture,
  linkProgram,
  loadImage,
} from "./webgl";

type UniformMap = Readonly<Record<string, WebGLUniformLocation>>;

interface TextureBinding {
  readonly texture: WebGLTexture;
  readonly unit: number;
}

export interface WaterRenderInfo {
  readonly width: number;
  readonly height: number;
  readonly devicePixelRatio: number;
  readonly textureCount: number;
  readonly renderer: string;
}

const TEXTURE_PATHS = [
  ["worldAlbedo", WATER_ASSETS.worldAlbedo, "clamp"],
  ["macroHeight", WATER_ASSETS.macroHeight, "mirror"],
  ["microHeight", WATER_ASSETS.microHeight, "mirror"],
  ["coastGeometry", WATER_ASSETS.coastGeometry.world, "clamp"],
  ["coastMaterial", WATER_ASSETS.coastMaterial, "clamp"],
  ["inlandWaterOverride", NINJAONE_INLAND_TERRAIN_ERASE_MASK.path, "clamp"],
] as const;
const DIRECTIONAL_ALBEDO_UNIT = TEXTURE_PATHS.length;

const SAMPLER_UNIFORMS = Object.freeze({
  worldAlbedo: "u_worldAlbedo",
  directionalAlbedo: "u_directionalAlbedo",
  macroHeight: "u_macroHeight",
  microHeight: "u_microHeight",
  coastGeometry: "u_coastGeometry",
  coastMaterial: "u_coastMaterial",
  inlandWaterOverride: "u_inlandWaterOverride",
});

const UNIFORM_NAMES = [
  "u_time",
  "u_resolution",
  "u_cameraOrigin",
  "u_cameraSpan",
  "u_wind",
  "u_coastTexel",
  "u_coastMaterialTexel",
  "u_inlandWaterOverrideOrigin",
  "u_inlandWaterOverrideSpan",
  "u_motion",
  "u_waveStrength",
  "u_waveDensity",
  "u_weather",
  "u_opacity",
  "u_detailScale",
  "u_territoryLod",
  "u_capitalLod",
  "u_siteLod",
  "u_microFrequency",
  "u_territoryLineStrength",
  "u_territoryNormalStrength",
  "u_lightDirection",
  "u_deepColor",
  "u_bodyColor",
  "u_swellColor",
  "u_shallowColor",
  "u_substrateColor",
  "u_highlightColor",
  "u_foamColor",
  "u_stormColor",
  ...Object.values(SAMPLER_UNIFORMS),
] as const;

function normalize3(
  values: readonly [number, number, number],
): readonly [number, number, number] {
  const length = Math.hypot(...values);
  if (length === 0) {
    throw new Error("World light direction cannot be zero.");
  }
  return values.map((value) => value / length) as [number, number, number];
}

export class WaterSurfaceRenderer {
  static async create(
    canvas: HTMLCanvasElement,
    light: WorldLight,
  ): Promise<WaterSurfaceRenderer> {
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: "high-performance",
    });

    if (!gl) {
      throw new Error("WebGL 2 is unavailable.");
    }

    const program = linkProgram(
      gl,
      WATER_VERTEX_SHADER,
      WATER_FRAGMENT_SHADER,
    );
    const images = await Promise.all(
      TEXTURE_PATHS.map(([, path]) => loadImage(path)),
    );
    const coastImage = images[3];
    const coastMaterialImage = images[4];
    const textures = Object.fromEntries(
      TEXTURE_PATHS.map(([name, , wrap], index) => [
        name,
        {
          texture: createTexture(gl, images[index], wrap),
          unit: index,
        },
      ]),
    ) as Record<string, TextureBinding>;

    return new WaterSurfaceRenderer(
      canvas,
      gl,
      program,
      textures,
      [1 / coastImage.naturalWidth, 1 / coastImage.naturalHeight],
      [
        1 / coastMaterialImage.naturalWidth,
        1 / coastMaterialImage.naturalHeight,
      ],
      light,
    );
  }

  readonly canvas: HTMLCanvasElement;
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly buffer: WebGLBuffer;
  private readonly textures: Record<string, TextureBinding>;
  private readonly uniforms: UniformMap;
  private coastTexel: readonly [number, number];
  private readonly coastMaterialTexel: readonly [number, number];
  private camera: CameraView = {
    origin: [0, 0],
    span: [1, 1],
  };
  private state: WaterSurfaceState = normalizeWaterSurfaceState();
  private detailState: DetailState | null = null;
  private lightDirection: readonly [number, number, number];
  private pixelRatio = 1;
  private renderScale = 1;
  private territoryAssetsLoading: Promise<void> | null = null;
  private territoryAssetsFailed = false;
  private destroyed = false;

  private constructor(
    canvas: HTMLCanvasElement,
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
    textures: Record<string, TextureBinding>,
    coastTexel: readonly [number, number],
    coastMaterialTexel: readonly [number, number],
    light: WorldLight,
  ) {
    this.canvas = canvas;
    this.gl = gl;
    this.program = program;
    this.textures = textures;
    this.coastTexel = coastTexel;
    this.coastMaterialTexel = coastMaterialTexel;
    this.lightDirection = normalize3(light.direction);

    const buffer = gl.createBuffer();
    if (!buffer) {
      throw new Error("WebGL could not allocate the world-plane buffer.");
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
      throw new Error("Water shader is missing a_position.");
    }
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    this.uniforms = Object.fromEntries(
      UNIFORM_NAMES.map((name) => {
        const location = gl.getUniformLocation(program, name);
        if (!location) {
          throw new Error(`Water shader is missing uniform ${name}.`);
        }
        return [name, location];
      }),
    );

    gl.useProgram(program);
    for (const [name, uniformName] of Object.entries(SAMPLER_UNIFORMS)) {
      const binding = textures[name] ?? textures.worldAlbedo;
      gl.uniform1i(this.uniforms[uniformName], binding.unit);
    }
  }

  setView(camera: CameraView, detailState: DetailState): void {
    this.camera = camera;
    this.detailState = detailState;
    this.renderScale = detailState.renderScale;
    if (detailState.shouldLoadTerritoryAssets) {
      this.loadTerritoryAssets();
    }
  }

  setLight(light: WorldLight): void {
    this.lightDirection = normalize3(light.direction);
  }

  setState(state: Partial<WaterSurfaceState>): void {
    this.state = normalizeWaterSurfaceState({
      ...this.state,
      ...state,
    });
  }

  render(elapsedSeconds: number): void {
    const detailState = this.detailState;
    if (!detailState) {
      throw new Error("Water view must be set before rendering.");
    }

    const gl = this.gl;
    this.resize();
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);

    for (const binding of Object.values(this.textures)) {
      gl.activeTexture(gl.TEXTURE0 + binding.unit);
      gl.bindTexture(gl.TEXTURE_2D, binding.texture);
    }

    const wind = windVectorFromDegrees(this.state.windDirectionDegrees);
    gl.uniform1f(this.uniforms.u_time, elapsedSeconds);
    gl.uniform2f(
      this.uniforms.u_resolution,
      this.canvas.width,
      this.canvas.height,
    );
    gl.uniform2fv(this.uniforms.u_cameraOrigin, this.camera.origin);
    gl.uniform2fv(this.uniforms.u_cameraSpan, this.camera.span);
    gl.uniform2fv(this.uniforms.u_wind, wind);
    gl.uniform2fv(this.uniforms.u_coastTexel, this.coastTexel);
    gl.uniform2fv(
      this.uniforms.u_coastMaterialTexel,
      this.coastMaterialTexel,
    );
    gl.uniform2fv(
      this.uniforms.u_inlandWaterOverrideOrigin,
      NINJAONE_INLAND_TERRAIN_ERASE_MASK.worldBounds.origin,
    );
    gl.uniform2fv(
      this.uniforms.u_inlandWaterOverrideSpan,
      NINJAONE_INLAND_TERRAIN_ERASE_MASK.worldBounds.span,
    );
    gl.uniform1f(this.uniforms.u_motion, this.state.motion);
    gl.uniform1f(this.uniforms.u_waveStrength, this.state.waveStrength);
    gl.uniform1f(this.uniforms.u_waveDensity, this.state.waveDensity);
    gl.uniform1f(this.uniforms.u_weather, this.state.weather);
    gl.uniform1f(this.uniforms.u_opacity, this.state.opacity);
    gl.uniform1f(this.uniforms.u_detailScale, this.state.detailScale);
    gl.uniform1f(
      this.uniforms.u_territoryLod,
      detailState.worldToTerritory,
    );
    gl.uniform1f(
      this.uniforms.u_capitalLod,
      detailState.territoryToCapital,
    );
    gl.uniform1f(
      this.uniforms.u_siteLod,
      detailState.capitalToSite,
    );
    gl.uniform2fv(
      this.uniforms.u_microFrequency,
      WATER_TERRITORY_DETAIL.fixedWorldFrequency,
    );
    gl.uniform1f(
      this.uniforms.u_territoryLineStrength,
      WATER_TERRITORY_DETAIL.lineStrength,
    );
    gl.uniform1f(
      this.uniforms.u_territoryNormalStrength,
      WATER_TERRITORY_DETAIL.normalStrength,
    );
    gl.uniform3fv(this.uniforms.u_lightDirection, this.lightDirection);
    const water = CAREER_WORLD_THEME.colors.water;
    gl.uniform3fv(this.uniforms.u_deepColor, hexToUnitRgb(water.deep));
    gl.uniform3fv(this.uniforms.u_bodyColor, hexToUnitRgb(water.body));
    gl.uniform3fv(this.uniforms.u_swellColor, hexToUnitRgb(water.swell));
    gl.uniform3fv(this.uniforms.u_shallowColor, hexToUnitRgb(water.shallow));
    gl.uniform3fv(
      this.uniforms.u_substrateColor,
      hexToUnitRgb(CAREER_WORLD_THEME.colors.land.body),
    );
    gl.uniform3fv(
      this.uniforms.u_highlightColor,
      hexToUnitRgb(water.highlight),
    );
    gl.uniform3fv(this.uniforms.u_foamColor, hexToUnitRgb(water.foam));
    gl.uniform3fv(this.uniforms.u_stormColor, hexToUnitRgb(water.storm));

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  getRenderInfo(): WaterRenderInfo {
    const gl = this.gl;
    return Object.freeze({
      width: this.canvas.width,
      height: this.canvas.height,
      devicePixelRatio: this.pixelRatio,
      textureCount: Object.keys(this.textures).length,
      renderer: gl.getParameter(gl.RENDERER) as string,
    });
  }

  destroy(): void {
    this.destroyed = true;
    for (const binding of Object.values(this.textures)) {
      this.gl.deleteTexture(binding.texture);
    }
    this.gl.deleteBuffer(this.buffer);
    this.gl.deleteProgram(this.program);
  }

  private resize(): void {
    const bounds = this.canvas.getBoundingClientRect();
    this.pixelRatio = Math.min(
      (window.devicePixelRatio || 1) * this.renderScale,
      DETAIL_POLICY.renderScale.maximumDevicePixelRatio,
    );
    const width = Math.max(1, Math.round(bounds.width * this.pixelRatio));
    const height = Math.max(1, Math.round(bounds.height * this.pixelRatio));

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  private loadTerritoryAssets(): void {
    if (
      this.territoryAssetsLoading
      || this.territoryAssetsFailed
      || this.textures.directionalAlbedo !== undefined
    ) {
      return;
    }

    this.canvas.dataset.detailAssetState = "loading";
    delete this.canvas.dataset.detailAssetError;
    this.territoryAssetsLoading = Promise.all([
      loadImage(WATER_ASSETS.directionalAlbedo),
      loadImage(WATER_ASSETS.coastGeometry.territory),
    ])
      .then(([directionalAlbedo, coastGeometry]) => {
        if (this.destroyed) {
          return;
        }
        const previousCoast = this.textures.coastGeometry;
        this.textures.directionalAlbedo = {
          texture: createTexture(this.gl, directionalAlbedo, "clamp"),
          unit: DIRECTIONAL_ALBEDO_UNIT,
        };
        this.textures.coastGeometry = {
          texture: createTexture(this.gl, coastGeometry, "clamp"),
          unit: previousCoast.unit,
        };
        this.coastTexel = [
          1 / coastGeometry.naturalWidth,
          1 / coastGeometry.naturalHeight,
        ];
        this.gl.useProgram(this.program);
        this.gl.uniform1i(
          this.uniforms.u_directionalAlbedo,
          DIRECTIONAL_ALBEDO_UNIT,
        );
        this.gl.deleteTexture(previousCoast.texture);
        this.canvas.dataset.detailAssetState = "ready";
        delete this.canvas.dataset.detailAssetError;
      })
      .catch((error: unknown) => {
        if (this.destroyed) {
          return;
        }
        this.territoryAssetsFailed = true;
        this.canvas.dataset.detailAssetState = "fallback";
        this.canvas.dataset.detailAssetError = error instanceof Error
          ? error.message
          : String(error);
      })
      .finally(() => {
        this.territoryAssetsLoading = null;
      });
  }
}
