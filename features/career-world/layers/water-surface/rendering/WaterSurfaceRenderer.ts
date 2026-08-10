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
  ninjaOneEnvironmentNativeHydrologyCameraKey,
  type NinjaOneEnvironmentNativeHydrologyAdmissionSnapshot,
} from "../../../development/model/ninjaOneEnvironmentResidency";
import {
  NINJAONE_STREAM_REGISTRATION,
  type NinjaOneHydrologyRegionResource,
  WATER_ASSETS,
  WATER_RUNTIME_TEXTURE_BUDGET_BYTES,
  WATER_TERRITORY_DETAIL,
  WATER_TERRITORY_TEXTURE_DIMENSIONS,
} from "../model/assets";
import {
  SHELTERED_BASIN_STYLE,
  SMALL_INLAND_LAKE_STYLE,
} from "../model/bodies";
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
  advanceRegionalHydrologyVisibility,
  beginRegionalHydrologyFadeIn,
  beginRegionalHydrologyFadeOut,
  createRegionalHydrologyLoadState,
  createRegionalHydrologyVisibilityState,
  nativeHydrologyAdmissionSnapshotIsUsable,
  planRegionalHydrologyCohort,
  regionalHydrologyCohortChangeRequiresFade,
  regionalHydrologyDecodeCoordinator,
  regionalHydrologyLoadMaySettle,
  retargetRegionalHydrologyLoad,
  settleRegionalHydrologyLoad,
  type RegionalHydrologyCohortPlan,
  type RegionalHydrologyLoadState,
  type RegionalHydrologyLoadToken,
  type RegionalHydrologyVisibilityState,
  retainTextureTransientPeak,
  viewIntersectsHydrologyRegistration,
} from "./hydrology-runtime";
import {
  createTexture,
  linkProgram,
  loadImage,
  loadVerifiedImage,
  releaseDecodedImage,
} from "./webgl";

type UniformMap = Readonly<Record<string, WebGLUniformLocation>>;

interface TextureBinding {
  readonly texture: WebGLTexture;
  readonly unit: number;
}

interface HydrologyRegionBinding extends TextureBinding {
  readonly resource: NinjaOneHydrologyRegionResource;
}

export interface WaterRenderInfo {
  readonly width: number;
  readonly height: number;
  readonly devicePixelRatio: number;
  readonly textureCount: number;
  readonly textureBytes: number;
  readonly textureBudgetBytes: number;
  readonly maximumTextureSize: number;
  readonly renderer: string;
}

const TEXTURE_PATHS = [
  ["worldAlbedo", WATER_ASSETS.worldAlbedo, "clamp", true, false],
  // Height, mask, and material-classification channels are numeric fields.
  // Preserve their authored bytes; color conversion remains enabled for the
  // two actual albedo textures only.
  ["macroHeight", WATER_ASSETS.macroHeight, "mirror", true, true],
  ["microHeight", WATER_ASSETS.microHeight, "mirror", true, true],
  ["coastGeometry", WATER_ASSETS.coastGeometry.world, "clamp", true, true],
  ["coastMaterial", WATER_ASSETS.coastMaterial, "clamp", true, true],
  ["hydrology", WATER_ASSETS.hydrology, "clamp", true, true],
] as const;
const DIRECTIONAL_ALBEDO_UNIT = TEXTURE_PATHS.length;
const NINJAONE_HYDROLOGY_UNITS = Object.freeze([
  DIRECTIONAL_ALBEDO_UNIT + 1,
  DIRECTIONAL_ALBEDO_UNIT + 2,
] as const);

const SAMPLER_UNIFORMS = Object.freeze({
  worldAlbedo: "u_worldAlbedo",
  directionalAlbedo: "u_directionalAlbedo",
  macroHeight: "u_macroHeight",
  microHeight: "u_microHeight",
  coastGeometry: "u_coastGeometry",
  coastMaterial: "u_coastMaterial",
  hydrology: "u_hydrology",
});

const UNIFORM_NAMES = [
  "u_time",
  "u_resolution",
  "u_cameraOrigin",
  "u_cameraSpan",
  "u_wind",
  "u_coastTexel",
  "u_coastMaterialTexel",
  "u_motion",
  "u_waveStrength",
  "u_waveDensity",
  "u_weather",
  "u_opacity",
  "u_foregroundHydrology",
  "u_detailScale",
  "u_territoryLod",
  "u_capitalLod",
  "u_siteLod",
  "u_closeAssetsReady",
  "u_ninjaOneStreamOrigin",
  "u_ninjaOneStreamSpan",
  "u_ninjaOneStreamTexel",
  "u_ninjaOneStreamArtboardDimensions",
  "u_ninjaOneHydrologyOpacity",
  "u_ninjaOneStreamSlotCount",
  "u_ninjaOneStreamRegion0",
  "u_ninjaOneStreamRegion1",
  "u_microFrequency",
  "u_territoryLineStrength",
  "u_territoryNormalStrength",
  "u_lightDirection",
  "u_basinWorldAnchor",
  "u_basinTextureOrigin",
  "u_basinTextureScale",
  "u_basinTextureRotation",
  "u_basinRippleFrequency",
  "u_basinRippleMix",
  "u_basinTintMix",
  "u_lakeWorldAnchor",
  "u_lakeTextureOrigin",
  "u_lakeTextureScale",
  "u_lakeTextureRotation",
  "u_lakeRippleFrequency",
  "u_lakeRippleMix",
  "u_lakeTintMix",
  "u_deepColor",
  "u_bodyColor",
  "u_swellColor",
  "u_shallowColor",
  "u_substrateColor",
  "u_highlightColor",
  "u_foamColor",
  "u_stormColor",
  "u_ninjaOneStreamFlow0",
  "u_ninjaOneStreamFlow1",
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

function textureFootprintBytes(
  width: number,
  height: number,
  mipmaps = true,
): number {
  return Math.ceil(width * height * 4 * (mipmaps ? 4 / 3 : 1));
}

function textureFitsCapability(
  dimensions: readonly [number, number],
  maximumTextureSize: number,
): boolean {
  return dimensions.every((dimension) => dimension <= maximumTextureSize);
}

export class WaterSurfaceRenderer {
  static async create(
    canvas: HTMLCanvasElement,
    light: WorldLight,
    foregroundHydrology = false,
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
    const maximumTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    const unsupportedTextureIndex = images.findIndex((image) => (
      image.naturalWidth > maximumTextureSize
      || image.naturalHeight > maximumTextureSize
    ));
    if (unsupportedTextureIndex >= 0) {
      const [name] = TEXTURE_PATHS[unsupportedTextureIndex];
      const image = images[unsupportedTextureIndex];
      throw new Error(
        `${name} ${image.naturalWidth}x${image.naturalHeight} exceeds WebGL `
          + `MAX_TEXTURE_SIZE ${maximumTextureSize}.`,
      );
    }
    const coastImage = images[3];
    const coastMaterialImage = images[4];
    const initialTextureBytes = TEXTURE_PATHS.reduce(
      (total, [, , , mipmaps], index) => total + textureFootprintBytes(
        images[index].naturalWidth,
        images[index].naturalHeight,
        mipmaps,
      ),
      0,
    );
    if (initialTextureBytes > WATER_RUNTIME_TEXTURE_BUDGET_BYTES) {
      throw new Error(
        `Base water textures require ${initialTextureBytes} bytes; maximum is `
          + `${WATER_RUNTIME_TEXTURE_BUDGET_BYTES}.`,
      );
    }
    const textures = Object.fromEntries(
      TEXTURE_PATHS.map(([
        name,
        ,
        wrap,
        generateMipmaps,
        preserveDataBytes,
      ], index) => [
        name,
        {
          texture: createTexture(gl, images[index], wrap, {
            generateMipmaps,
            preserveDataBytes,
          }),
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
      maximumTextureSize,
      initialTextureBytes,
      textureFootprintBytes(
        coastImage.naturalWidth,
        coastImage.naturalHeight,
      ),
      light,
      foregroundHydrology,
    );
  }

  readonly canvas: HTMLCanvasElement;
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly buffer: WebGLBuffer;
  private readonly textures: Record<string, TextureBinding>;
  private readonly uniforms: UniformMap;
  private readonly maximumTextureSize: number;
  private readonly foregroundHydrology: boolean;
  private coastTexel: readonly [number, number];
  private hydrologyTexel: readonly [number, number];
  private hydrologyBindings: readonly HydrologyRegionBinding[] = Object.freeze([]);
  private hydrologyMountedPlan: RegionalHydrologyCohortPlan | null = null;
  private hydrologyRequestedPlan: RegionalHydrologyCohortPlan | null = null;
  private hydrologyLoadState: RegionalHydrologyLoadState =
    createRegionalHydrologyLoadState();
  private readonly hydrologyDecodeBarrier = regionalHydrologyDecodeCoordinator;
  private hydrologyDecodeUnsubscribe: (() => void) | null = null;
  private hydrologyLoadAbortController: AbortController | null = null;
  private hydrologyLoadToken: RegionalHydrologyLoadToken | null = null;
  private hydrologyVisibility: RegionalHydrologyVisibilityState =
    createRegionalHydrologyVisibilityState();
  private hydrologyBreakConstraint: string | null = null;
  private nativeHydrologyAdmission:
    NinjaOneEnvironmentNativeHydrologyAdmissionSnapshot | null = null;
  private minimumNativeHydrologyAdmissionEpoch = 0;
  private hasAcceptedNativeHydrologyAdmission = false;
  private acceptedNativeHydrologyCameraKey: string | null = null;
  private nativeHydrologyAdmissionGapOpen = false;
  private hydrologyNativeUnionTransitionPeakBytes = 0;
  private failedDetailTargetKey: string | null = null;
  private failedFallbackTargetKey: string | null = null;
  private coastTextureBytes: number;
  private readonly coastMaterialTexel: readonly [number, number];
  private textureBytes: number;
  private textureTransientPeakBytes: number;
  private territoryReplacementPeakBytes: number;
  private invalidationHandler: (() => void) | null = null;
  private camera: CameraView = {
    origin: [0, 0],
    span: [1, 1],
  };
  private state: WaterSurfaceState = normalizeWaterSurfaceState();
  private detailState: DetailState | null = null;
  private lightDirection: readonly [number, number, number];
  private pixelRatio = 1;
  private renderScale = 1;
  private lastRenderElapsedSeconds = 0;
  private lastAnimationTelemetryQuarter = -1;
  private reduceMotion = false;
  private territoryAssetsLoading: Promise<void> | null = null;
  private territoryAssetsFailed = false;
  private hydrologyAssetState: "disabled" | "error" | "idle" | "loading" | "ready" | "constrained" | "fallback" | "transitioning";
  private hydrologyShouldBeResident = false;
  private destroyed = false;

  private constructor(
    canvas: HTMLCanvasElement,
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
    textures: Record<string, TextureBinding>,
    coastTexel: readonly [number, number],
    coastMaterialTexel: readonly [number, number],
    maximumTextureSize: number,
    textureBytes: number,
    coastTextureBytes: number,
    light: WorldLight,
    foregroundHydrology: boolean,
  ) {
    this.canvas = canvas;
    this.gl = gl;
    this.program = program;
    this.textures = textures;
    this.coastTexel = coastTexel;
    this.hydrologyTexel = [
      1 / NINJAONE_STREAM_REGISTRATION.tiers.fallback.fullFieldDimensions[0],
      1 / NINJAONE_STREAM_REGISTRATION.tiers.fallback.fullFieldDimensions[1],
    ];
    this.coastTextureBytes = coastTextureBytes;
    this.coastMaterialTexel = coastMaterialTexel;
    this.maximumTextureSize = maximumTextureSize;
    this.textureBytes = textureBytes;
    this.textureTransientPeakBytes = textureBytes;
    this.territoryReplacementPeakBytes = textureBytes;
    this.foregroundHydrology = foregroundHydrology;
    this.hydrologyAssetState = foregroundHydrology ? "idle" : "disabled";
    this.lightDirection = normalize3(light.direction);
    this.canvas.dataset.maximumTextureSize = String(maximumTextureSize);
    this.canvas.dataset.textureBudgetBytes = String(
      WATER_RUNTIME_TEXTURE_BUDGET_BYTES,
    );
    this.canvas.dataset.textureBytes = String(textureBytes);
    this.canvas.dataset.textureTransientPeakBytes = String(
      this.textureTransientPeakBytes,
    );
    this.canvas.dataset.sharedWaterTextureBytes = String(textureBytes);
    this.canvas.dataset.sharedWaterTextureTransientPeakBytes = String(
      this.textureTransientPeakBytes,
    );
    this.canvas.dataset.foregroundWaterMode = foregroundHydrology
      ? "registered-overlay"
      : "global";
    this.canvas.dataset.waterLayerContract = "registered-body-and-effects";
    this.canvas.dataset.waterBodyPass = "channel-coverage";
    this.canvas.dataset.waterEffectsPass = "foam-falls-impacts-mist";
    this.canvas.dataset.hydrologyAssetState = this.hydrologyAssetState;
    this.canvas.dataset.hydrologyAssetBytes = "0";
    this.canvas.dataset.hydrologyAssetTier = "none";
    this.canvas.dataset.hydrologyBudgetOwner = foregroundHydrology
      ? "native-application-union"
      : "none";
    this.canvas.dataset.hydrologyNativeUnionMaximumBytes = String(
      NINJAONE_STREAM_REGISTRATION.nativeApplicationOwnedUnion.maximumDecodedBytes,
    );
    this.canvas.dataset.hydrologyNativeAdmissionEpoch = "none";
    this.canvas.dataset.hydrologyNativeUnionCurrentBytes = "0";
    this.canvas.dataset.hydrologyNativeUnionReservedBytes = "0";
    this.canvas.dataset.hydrologyNativeUnionPlannedBytes = "0";
    this.canvas.dataset.hydrologyNativeUnionTransitionPeakBytes = "0";
    this.canvas.dataset.hydrologyAssetRegionIds = "";
    this.canvas.dataset.hydrologyAssetResourceIds = "";
    this.canvas.dataset.hydrologyAssetResourcePaths = "";
    this.canvas.dataset.hydrologyRequestedRegionIds = "";
    this.canvas.dataset.hydrologyRequestedResourceIds = "";
    this.canvas.dataset.hydrologyRequestedResourcePaths = "";
    this.canvas.dataset.hydrologyRequestedTier = "none";
    this.canvas.dataset.hydrologySamplerSlotCount = "0";
    this.canvas.dataset.hydrologyTransitionOpacity = "1.000";
    this.canvas.dataset.hydrologyTransitionState = "stable";
    this.canvas.dataset.hydrologyDecodeState = "idle";
    this.canvas.dataset.hydrologyDecodeActiveBytes = "0";
    this.canvas.dataset.hydrologyDecodeActiveGeneration = "none";
    this.canvas.dataset.hydrologyDecodeActiveTargetKey = "";
    this.canvas.dataset.hydrologyDecodeActiveTier = "none";
    this.canvas.dataset.hydrologyDecodeActiveAdmissionUnionBytes = "0";
    this.canvas.dataset.hydrologyDecodeActiveResourceIds = "";
    this.canvas.dataset.hydrologyDecodeActiveResourcePaths = "";
    this.canvas.dataset.hydrologyDecodeActiveResourceSha256 = "";
    this.canvas.dataset.hydrologyDecodePendingBytes = "0";
    this.canvas.dataset.hydrologyDecodePendingGeneration = "none";
    this.canvas.dataset.hydrologyDecodePendingTargetKey = "";
    this.canvas.dataset.hydrologyDecodePendingTier = "none";
    this.canvas.dataset.hydrologyDecodePendingResourceIds = "";
    this.canvas.dataset.hydrologyDecodePendingResourcePaths = "";
    this.canvas.dataset.hydrologyDecodePendingResourceSha256 = "";
    this.canvas.dataset.hydrologyNativeUnionIncomingBytes = "0";
    if (foregroundHydrology) {
      this.hydrologyDecodeUnsubscribe = this.hydrologyDecodeBarrier.subscribe(() => {
        if (this.destroyed) return;
        this.updateHydrologyTelemetry();
        this.invalidationHandler?.();
      });
    }

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
    gl.uniform1i(
      this.uniforms.u_ninjaOneStreamFlow0,
      NINJAONE_HYDROLOGY_UNITS[0],
    );
    gl.uniform1i(
      this.uniforms.u_ninjaOneStreamFlow1,
      NINJAONE_HYDROLOGY_UNITS[1],
    );
  }

  setView(
    camera: CameraView,
    detailState: DetailState,
    nativeHydrologyAdmission:
      NinjaOneEnvironmentNativeHydrologyAdmissionSnapshot | null = null,
  ): void {
    const cameraKey = ninjaOneEnvironmentNativeHydrologyCameraKey(camera);
    const incomingAdmissionIsCurrent = nativeHydrologyAdmissionSnapshotIsUsable(
      nativeHydrologyAdmission,
      camera,
      this.minimumNativeHydrologyAdmissionEpoch,
    );
    const cameraChangedSinceAcceptance =
      this.hasAcceptedNativeHydrologyAdmission
      && cameraKey !== this.acceptedNativeHydrologyCameraKey;
    if (
      this.hasAcceptedNativeHydrologyAdmission
      && (cameraChangedSinceAcceptance || !incomingAdmissionIsCurrent)
      && !this.nativeHydrologyAdmissionGapOpen
    ) {
      this.minimumNativeHydrologyAdmissionEpoch += 1;
      this.nativeHydrologyAdmissionGapOpen = true;
    }
    this.camera = camera;
    this.detailState = detailState;
    this.nativeHydrologyAdmission = nativeHydrologyAdmission;
    this.renderScale = detailState.renderScale;
    if (detailState.shouldLoadTerritoryAssets) {
      this.loadTerritoryAssets();
    }
    this.hydrologyShouldBeResident = Boolean(
      this.foregroundHydrology
      && (detailState.tier.id === "site" || detailState.tier.id === "close")
      && viewIntersectsHydrologyRegistration(
        camera,
        NINJAONE_STREAM_REGISTRATION.worldOrigin,
        NINJAONE_STREAM_REGISTRATION.worldSpan,
      )
    );
    this.reconcileHydrologyAssets();
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

  setReduceMotion(reduceMotion: boolean): void {
    this.reduceMotion = reduceMotion;
    const advanced = advanceRegionalHydrologyVisibility(
      this.hydrologyVisibility,
      this.lastRenderElapsedSeconds,
      reduceMotion,
    );
    this.hydrologyVisibility = advanced.state;
    if (advanced.releaseResidentCohort && this.hydrologyBindings.length > 0) {
      this.releaseHydrologyAsset(
        "constrained",
        this.hydrologyBreakConstraint ?? "regional hydrology zero-field transition",
      );
      this.reconcileHydrologyAssets();
    }
    this.updateHydrologyTelemetry();
    this.invalidationHandler?.();
  }

  setInvalidationHandler(handler: (() => void) | null): void {
    this.invalidationHandler = handler;
  }

  render(elapsedSeconds: number): void {
    const detailState = this.detailState;
    if (!detailState) {
      throw new Error("Water view must be set before rendering.");
    }

    this.lastRenderElapsedSeconds = elapsedSeconds;
    const animationTelemetryQuarter = Math.floor(elapsedSeconds * 4);
    if (animationTelemetryQuarter !== this.lastAnimationTelemetryQuarter) {
      this.lastAnimationTelemetryQuarter = animationTelemetryQuarter;
      this.canvas.dataset.animationElapsedSeconds = elapsedSeconds.toFixed(3);
      this.canvas.dataset.animationMotion = this.state.motion.toFixed(3);
      this.canvas.dataset.animationReduceMotion = String(this.reduceMotion);
    }
    this.advanceHydrologyVisibility(elapsedSeconds);
    const gl = this.gl;
    this.resize();
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);

    for (const binding of Object.values(this.textures)) {
      gl.activeTexture(gl.TEXTURE0 + binding.unit);
      gl.bindTexture(gl.TEXTURE_2D, binding.texture);
    }
    for (let slot = 0; slot < NINJAONE_HYDROLOGY_UNITS.length; slot += 1) {
      gl.activeTexture(gl.TEXTURE0 + NINJAONE_HYDROLOGY_UNITS[slot]);
      gl.bindTexture(
        gl.TEXTURE_2D,
        this.hydrologyBindings[slot]?.texture ?? this.textures.hydrology.texture,
      );
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
    gl.uniform1f(this.uniforms.u_motion, this.state.motion);
    gl.uniform1f(this.uniforms.u_waveStrength, this.state.waveStrength);
    gl.uniform1f(this.uniforms.u_waveDensity, this.state.waveDensity);
    gl.uniform1f(this.uniforms.u_weather, this.state.weather);
    gl.uniform1f(this.uniforms.u_opacity, this.state.opacity);
    gl.uniform1f(
      this.uniforms.u_foregroundHydrology,
      this.foregroundHydrology ? 1 : 0,
    );
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
    gl.uniform1f(
      this.uniforms.u_closeAssetsReady,
      this.hydrologyBindings.length > 0
        && (
          this.hydrologyAssetState === "ready"
          || this.hydrologyAssetState === "fallback"
          || this.hydrologyAssetState === "loading"
          || this.hydrologyAssetState === "error"
        )
        ? 1
        : 0,
    );
    gl.uniform2fv(
      this.uniforms.u_ninjaOneStreamOrigin,
      NINJAONE_STREAM_REGISTRATION.worldOrigin,
    );
    gl.uniform2fv(
      this.uniforms.u_ninjaOneStreamSpan,
      NINJAONE_STREAM_REGISTRATION.worldSpan,
    );
    gl.uniform2f(
      this.uniforms.u_ninjaOneStreamTexel,
      this.hydrologyTexel[0],
      this.hydrologyTexel[1],
    );
    gl.uniform2fv(
      this.uniforms.u_ninjaOneStreamArtboardDimensions,
      NINJAONE_STREAM_REGISTRATION.artboardDimensions,
    );
    gl.uniform1f(
      this.uniforms.u_ninjaOneHydrologyOpacity,
      this.hydrologyVisibility.opacity,
    );
    gl.uniform1f(
      this.uniforms.u_ninjaOneStreamSlotCount,
      this.hydrologyBindings.length,
    );
    const regionUniforms = [
      this.uniforms.u_ninjaOneStreamRegion0,
      this.uniforms.u_ninjaOneStreamRegion1,
    ] as const;
    for (let slot = 0; slot < regionUniforms.length; slot += 1) {
      const sourceBounds = this.hydrologyBindings[slot]?.resource.sourceBounds;
      gl.uniform4f(
        regionUniforms[slot],
        sourceBounds?.[0] ?? 0,
        sourceBounds?.[1] ?? 0,
        sourceBounds ? sourceBounds[2] - sourceBounds[0] : 1,
        sourceBounds ? sourceBounds[3] - sourceBounds[1] : 1,
      );
    }
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
    const basinTexture = SHELTERED_BASIN_STYLE.texture;
    gl.uniform2fv(
      this.uniforms.u_basinWorldAnchor,
      basinTexture.worldAnchor,
    );
    gl.uniform2fv(
      this.uniforms.u_basinTextureOrigin,
      basinTexture.textureOrigin,
    );
    gl.uniform2fv(
      this.uniforms.u_basinTextureScale,
      basinTexture.textureScale,
    );
    gl.uniform1f(
      this.uniforms.u_basinTextureRotation,
      basinTexture.rotationRadians,
    );
    gl.uniform1f(
      this.uniforms.u_basinRippleFrequency,
      SHELTERED_BASIN_STYLE.rippleFrequency,
    );
    gl.uniform1f(
      this.uniforms.u_basinRippleMix,
      SHELTERED_BASIN_STYLE.rippleMix,
    );
    gl.uniform1f(
      this.uniforms.u_basinTintMix,
      SHELTERED_BASIN_STYLE.tintMix,
    );
    const lakeTexture = SMALL_INLAND_LAKE_STYLE.texture;
    gl.uniform2fv(
      this.uniforms.u_lakeWorldAnchor,
      lakeTexture.worldAnchor,
    );
    gl.uniform2fv(
      this.uniforms.u_lakeTextureOrigin,
      lakeTexture.textureOrigin,
    );
    gl.uniform2fv(
      this.uniforms.u_lakeTextureScale,
      lakeTexture.textureScale,
    );
    gl.uniform1f(
      this.uniforms.u_lakeTextureRotation,
      lakeTexture.rotationRadians,
    );
    gl.uniform1f(
      this.uniforms.u_lakeRippleFrequency,
      SMALL_INLAND_LAKE_STYLE.rippleFrequency,
    );
    gl.uniform1f(
      this.uniforms.u_lakeRippleMix,
      SMALL_INLAND_LAKE_STYLE.rippleMix,
    );
    gl.uniform1f(
      this.uniforms.u_lakeTintMix,
      SMALL_INLAND_LAKE_STYLE.tintMix,
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
      textureCount: Object.keys(this.textures).length
        + this.hydrologyBindings.length,
      textureBytes: this.textureBytes,
      textureBudgetBytes: WATER_RUNTIME_TEXTURE_BUDGET_BYTES,
      maximumTextureSize: this.maximumTextureSize,
      renderer: gl.getParameter(gl.RENDERER) as string,
    });
  }

  destroy(): void {
    this.destroyed = true;
    this.hydrologyLoadAbortController?.abort();
    this.hydrologyLoadAbortController = null;
    this.hydrologyLoadToken = null;
    this.hydrologyDecodeUnsubscribe?.();
    this.hydrologyDecodeUnsubscribe = null;
    this.invalidationHandler = null;
    for (const binding of this.hydrologyBindings) {
      this.gl.deleteTexture(binding.texture);
    }
    this.hydrologyBindings = Object.freeze([]);
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

  private recordTextureTransientPeak(...plannedOrObservedBytes: number[]): void {
    this.textureTransientPeakBytes = retainTextureTransientPeak(
      this.textureTransientPeakBytes,
      ...plannedOrObservedBytes,
    );
    this.canvas.dataset.textureTransientPeakBytes = String(
      this.textureTransientPeakBytes,
    );
    this.canvas.dataset.sharedWaterTextureTransientPeakBytes = String(
      this.textureTransientPeakBytes,
    );
  }

  private hydrologyResourceKey(
    resource: Pick<NinjaOneHydrologyRegionResource, "id" | "path" | "sha256">,
  ): string {
    return `${resource.id}\t${resource.path}#sha256=${resource.sha256}`;
  }

  private mountedHydrologyResources(): readonly NinjaOneHydrologyRegionResource[] {
    return Object.freeze(this.hydrologyBindings.map(({ resource }) => resource));
  }

  private hydrologyLoadIsCurrent(token: RegionalHydrologyLoadToken): boolean {
    return this.hydrologyLoadToken === token
      && regionalHydrologyLoadMaySettle(this.hydrologyLoadState, token);
  }

  private hydrologyResourcesMatch(
    plan: RegionalHydrologyCohortPlan,
  ): boolean {
    return !regionalHydrologyCohortChangeRequiresFade(
      this.mountedHydrologyResources(),
      plan.resources,
    ) && this.hydrologyBindings.length === plan.resources.length;
  }

  private updateHydrologyTelemetry(): void {
    const mountedResources = this.mountedHydrologyResources();
    const mountedResourceKeys = new Set(mountedResources.map((resource) => (
      this.hydrologyResourceKey(resource)
    )));
    const mountedBytes = mountedResources.reduce(
      (total, resource) => total + resource.decodedBytes,
      0,
    );
    const mountedTier = mountedResources[0]?.tier ?? "none";
    const mountedPaths = mountedResources.map(({ path }) => path);
    const requestedResources = this.hydrologyRequestedPlan?.resources ?? [];
    const decode = this.hydrologyDecodeBarrier.snapshot();
    const nativeUnionIncomingBytes = decode.activeResources.reduce(
      (total, resource) => total + (
        mountedResourceKeys.has(this.hydrologyResourceKey(resource))
          ? 0
          : resource.decodedBytes
      ),
      0,
    );
    const nativeAdmission = (
      this.hydrologyRequestedPlan || this.hydrologyMountedPlan
      || decode.activeDecodedBytes > 0
    )
      ? this.nativeHydrologyAdmission
      : null;
    const nativeCurrentBytes = nativeAdmission
      ? nativeAdmission.currentDecodedBytes + mountedBytes
        + nativeUnionIncomingBytes
      : mountedBytes + nativeUnionIncomingBytes;
    const nativePlannedBytes = Math.max(
      nativeCurrentBytes,
      this.hydrologyRequestedPlan?.nativeUnionTransitionBytes ?? 0,
    );
    this.hydrologyNativeUnionTransitionPeakBytes = Math.max(
      this.hydrologyNativeUnionTransitionPeakBytes,
      nativeCurrentBytes,
      nativePlannedBytes,
    );
    this.canvas.dataset.hydrologyAssetBytes = String(mountedBytes);
    this.canvas.dataset.hydrologyAssetTier = mountedTier;
    this.canvas.dataset.hydrologyAssetRegionIds = mountedResources
      .map(({ regionId }) => regionId).join(",");
    this.canvas.dataset.hydrologyAssetResourceIds = mountedResources
      .map(({ id }) => id).join(",");
    this.canvas.dataset.hydrologyAssetResourcePaths = mountedPaths.join(",");
    this.canvas.dataset.hydrologySamplerSlotCount = String(
      this.hydrologyBindings.length,
    );
    if (mountedPaths.length === 1) {
      this.canvas.dataset.hydrologyAssetResourcePath = mountedPaths[0];
    } else {
      delete this.canvas.dataset.hydrologyAssetResourcePath;
    }
    this.canvas.dataset.hydrologyRequestedRegionIds = requestedResources
      .map(({ regionId }) => regionId).join(",");
    this.canvas.dataset.hydrologyRequestedResourceIds = requestedResources
      .map(({ id }) => id).join(",");
    this.canvas.dataset.hydrologyRequestedResourcePaths = requestedResources
      .map(({ path }) => path).join(",");
    this.canvas.dataset.hydrologyRequestedTier =
      this.hydrologyRequestedPlan?.tier ?? "none";
    this.canvas.dataset.hydrologyNativeAdmissionEpoch = nativeAdmission
      ? String(nativeAdmission.epoch)
      : "none";
    this.canvas.dataset.hydrologyNativeUnionCurrentBytes = String(
      nativeCurrentBytes,
    );
    this.canvas.dataset.hydrologyNativeUnionReservedBytes = String(
      nativeAdmission?.reservedDecodedBytes ?? 0,
    );
    this.canvas.dataset.hydrologyNativeUnionPlannedBytes = String(
      nativePlannedBytes,
    );
    this.canvas.dataset.hydrologyNativeUnionTransitionPeakBytes = String(
      this.hydrologyNativeUnionTransitionPeakBytes,
    );
    this.canvas.dataset.hydrologyTransitionOpacity =
      this.hydrologyVisibility.opacity.toFixed(3);
    this.canvas.dataset.hydrologyTransitionState =
      this.hydrologyVisibility.phase;
    this.canvas.dataset.hydrologyDecodeState = decode.phase;
    this.canvas.dataset.hydrologyDecodeActiveBytes = String(
      decode.activeDecodedBytes,
    );
    this.canvas.dataset.hydrologyDecodeActiveGeneration =
      decode.activeGeneration === null ? "none" : String(decode.activeGeneration);
    this.canvas.dataset.hydrologyDecodeActiveTargetKey =
      decode.activeTargetKey ?? "";
    this.canvas.dataset.hydrologyDecodeActiveTier = decode.activeTier ?? "none";
    this.canvas.dataset.hydrologyDecodeActiveAdmissionUnionBytes = String(
      decode.activeNativeUnionBytes,
    );
    this.canvas.dataset.hydrologyDecodeActiveResourceIds = decode.activeResources
      .map(({ id }) => id).join(",");
    this.canvas.dataset.hydrologyDecodeActiveResourcePaths = decode.activeResources
      .map(({ path }) => path).join(",");
    this.canvas.dataset.hydrologyDecodeActiveResourceSha256 = decode.activeResources
      .map(({ sha256 }) => sha256).join(",");
    this.canvas.dataset.hydrologyDecodePendingBytes = String(
      decode.pendingDecodedBytes,
    );
    this.canvas.dataset.hydrologyDecodePendingGeneration =
      decode.pendingGeneration === null ? "none" : String(decode.pendingGeneration);
    this.canvas.dataset.hydrologyDecodePendingTargetKey =
      decode.pendingTargetKey ?? "";
    this.canvas.dataset.hydrologyDecodePendingTier = decode.pendingTier ?? "none";
    this.canvas.dataset.hydrologyDecodePendingResourceIds = decode.pendingResources
      .map(({ id }) => id).join(",");
    this.canvas.dataset.hydrologyDecodePendingResourcePaths = decode.pendingResources
      .map(({ path }) => path).join(",");
    this.canvas.dataset.hydrologyDecodePendingResourceSha256 = decode.pendingResources
      .map(({ sha256 }) => sha256).join(",");
    this.canvas.dataset.hydrologyNativeUnionIncomingBytes = String(
      nativeUnionIncomingBytes,
    );
    this.canvas.dataset.textureBytes = String(this.textureBytes);
  }

  private advanceHydrologyVisibility(elapsedSeconds: number): void {
    const advanced = advanceRegionalHydrologyVisibility(
      this.hydrologyVisibility,
      elapsedSeconds,
      this.reduceMotion,
    );
    if (advanced.state !== this.hydrologyVisibility) {
      this.hydrologyVisibility = advanced.state;
      this.updateHydrologyTelemetry();
    }
    if (!advanced.releaseResidentCohort || this.hydrologyBindings.length === 0) {
      return;
    }
    this.releaseHydrologyAsset(
      "constrained",
      this.hydrologyBreakConstraint ?? "regional hydrology zero-field transition",
    );
    this.reconcileHydrologyAssets();
  }

  private releaseHydrologyAsset(
    state: "constrained" | "idle" = "idle",
    constraint?: string,
  ): void {
    const hadBindings = this.hydrologyBindings.length > 0;
    this.hydrologyLoadAbortController?.abort();
    this.hydrologyDecodeBarrier.cancel();
    this.hydrologyLoadAbortController = null;
    this.hydrologyLoadToken = null;
    const retargeted = retargetRegionalHydrologyLoad(
      this.hydrologyLoadState,
      null,
    );
    this.hydrologyLoadState = retargeted.state;
    for (const binding of this.hydrologyBindings) {
      this.gl.deleteTexture(binding.texture);
    }
    this.hydrologyBindings = Object.freeze([]);
    this.hydrologyMountedPlan = null;
    this.hydrologyRequestedPlan = null;
    this.hydrologyAssetState = state;
    this.canvas.dataset.hydrologyAssetState = state;
    if (constraint) {
      this.canvas.dataset.hydrologyAssetConstraint = constraint;
    } else {
      delete this.canvas.dataset.hydrologyAssetConstraint;
    }
    delete this.canvas.dataset.hydrologyAssetError;
    this.updateHydrologyTelemetry();
    if (hadBindings) this.invalidationHandler?.();
  }

  private reconcileHydrologyAssets(): void {
    if (!this.foregroundHydrology) return;
    if (!this.hydrologyShouldBeResident) {
      this.releaseHydrologyAsset();
      this.hydrologyVisibility = createRegionalHydrologyVisibilityState();
      this.hydrologyBreakConstraint = null;
      this.updateHydrologyTelemetry();
      return;
    }
    const planInput = {
      camera: this.camera,
      currentResources: this.mountedHydrologyResources(),
      detailResources: NINJAONE_STREAM_REGISTRATION.tiers.detail.resources,
      fallbackResources: NINJAONE_STREAM_REGISTRATION.tiers.fallback.resources,
      maximumDecodedBytes:
        NINJAONE_STREAM_REGISTRATION.nativeApplicationOwnedUnion.maximumDecodedBytes,
      maximumMountedRegions: NINJAONE_STREAM_REGISTRATION.maximumMountedRegions,
      maximumTextureSize: this.maximumTextureSize,
      minimumSnapshotEpoch: this.minimumNativeHydrologyAdmissionEpoch,
      regions: NINJAONE_STREAM_REGISTRATION.regions,
      snapshot: this.nativeHydrologyAdmission,
    } as const;
    const preferredPlan = planRegionalHydrologyCohort(planInput);
    const plan = preferredPlan.tier === "detail"
      && preferredPlan.targetKey === this.failedDetailTargetKey
      ? planRegionalHydrologyCohort({ ...planInput, skipDetail: true })
      : preferredPlan;
    if (!plan.tier) {
      const retryAfterEviction = plan.reason === "native-union"
        && this.hydrologyBindings.length > 0;
      if (retryAfterEviction) {
        this.hydrologyBreakConstraint =
          `regional hydrology admission rejected: ${plan.reason}`;
        const transition = beginRegionalHydrologyFadeOut(
          this.hydrologyVisibility,
          this.lastRenderElapsedSeconds,
          this.reduceMotion,
        );
        this.hydrologyVisibility = transition.state;
        this.hydrologyAssetState = "transitioning";
        this.canvas.dataset.hydrologyAssetState = "transitioning";
        this.canvas.dataset.hydrologyAssetConstraint = this.hydrologyBreakConstraint;
        this.updateHydrologyTelemetry();
        if (transition.releaseResidentCohort) {
          this.releaseHydrologyAsset("constrained", this.hydrologyBreakConstraint);
          this.reconcileHydrologyAssets();
        } else {
          this.invalidationHandler?.();
        }
        return;
      }
      this.releaseHydrologyAsset(
        "constrained",
        `regional hydrology admission rejected: ${plan.reason ?? "unknown"}`,
      );
      return;
    }
    if (
      plan.tier === "fallback"
      && plan.targetKey === this.failedFallbackTargetKey
    ) {
      this.hydrologyRequestedPlan = plan;
      this.hydrologyAssetState = "error";
      this.canvas.dataset.hydrologyAssetState = "error";
      this.updateHydrologyTelemetry();
      return;
    }
    this.minimumNativeHydrologyAdmissionEpoch = Math.max(
      this.minimumNativeHydrologyAdmissionEpoch,
      plan.snapshotEpoch,
    );
    this.hasAcceptedNativeHydrologyAdmission = true;
    this.acceptedNativeHydrologyCameraKey =
      this.nativeHydrologyAdmission?.cameraKey ?? null;
    this.nativeHydrologyAdmissionGapOpen = false;
    this.hydrologyRequestedPlan = plan;
    this.hydrologyNativeUnionTransitionPeakBytes = Math.max(
      this.hydrologyNativeUnionTransitionPeakBytes,
      plan.nativeUnionTransitionBytes,
    );
    delete this.canvas.dataset.hydrologyAssetConstraint;
    delete this.canvas.dataset.hydrologyAssetError;

    if (this.hydrologyResourcesMatch(plan)) {
      if (this.hydrologyVisibility.phase === "fading-out") {
        this.hydrologyVisibility = beginRegionalHydrologyFadeIn(
          this.hydrologyVisibility,
          this.lastRenderElapsedSeconds,
          this.reduceMotion,
        );
      }
      this.hydrologyLoadAbortController?.abort();
      this.hydrologyDecodeBarrier.cancel();
      this.hydrologyLoadAbortController = null;
      this.hydrologyLoadToken = null;
      const retargeted = retargetRegionalHydrologyLoad(
        this.hydrologyLoadState,
        plan.targetKey,
      );
      this.hydrologyLoadState = retargeted.token
        ? settleRegionalHydrologyLoad(
            retargeted.state,
            retargeted.token,
            { ok: true },
          )
        : retargeted.state;
      this.hydrologyMountedPlan = plan;
      this.hydrologyAssetState = plan.tier === "detail" ? "ready" : "fallback";
      this.canvas.dataset.hydrologyAssetState = this.hydrologyAssetState;
      const fullDimensions = NINJAONE_STREAM_REGISTRATION.tiers[plan.tier]
        .fullFieldDimensions;
      this.hydrologyTexel = [
        1 / fullDimensions[0],
        1 / fullDimensions[1],
      ];
      this.hydrologyVisibility = beginRegionalHydrologyFadeIn(
        this.hydrologyVisibility,
        this.lastRenderElapsedSeconds,
        this.reduceMotion,
      );
      this.hydrologyBreakConstraint = null;
      this.updateHydrologyTelemetry();
      this.invalidationHandler?.();
      return;
    }

    if (regionalHydrologyCohortChangeRequiresFade(
      this.mountedHydrologyResources(),
      plan.resources,
    )) {
      this.hydrologyLoadAbortController?.abort();
      this.hydrologyDecodeBarrier.cancel();
      this.hydrologyLoadAbortController = null;
      this.hydrologyLoadToken = null;
      this.hydrologyBreakConstraint = "regional hydrology cohort identity transition";
      const transition = beginRegionalHydrologyFadeOut(
        this.hydrologyVisibility,
        this.lastRenderElapsedSeconds,
        this.reduceMotion,
      );
      this.hydrologyVisibility = transition.state;
      this.hydrologyAssetState = "transitioning";
      this.canvas.dataset.hydrologyAssetState = "transitioning";
      this.canvas.dataset.hydrologyAssetConstraint = this.hydrologyBreakConstraint;
      this.updateHydrologyTelemetry();
      if (transition.releaseResidentCohort) {
        this.releaseHydrologyAsset("constrained", this.hydrologyBreakConstraint);
        this.reconcileHydrologyAssets();
      } else {
        this.invalidationHandler?.();
      }
      return;
    }

    const retargeted = retargetRegionalHydrologyLoad(
      this.hydrologyLoadState,
      plan.targetKey,
    );
    this.hydrologyLoadState = retargeted.state;
    if (!retargeted.token) {
      this.updateHydrologyTelemetry();
      return;
    }
    this.hydrologyAssetState = "loading";
    this.canvas.dataset.hydrologyAssetState = "loading";
    this.updateHydrologyTelemetry();
    this.loadHydrologyCohort(plan, retargeted.token);
  }

  private loadHydrologyCohort(
    plan: RegionalHydrologyCohortPlan,
    token: RegionalHydrologyLoadToken,
  ): void {
    if (!plan.tier) {
      throw new Error("Cannot load a rejected regional hydrology cohort.");
    }
    this.hydrologyLoadAbortController?.abort();
    const abortController = new AbortController();
    this.hydrologyLoadAbortController = abortController;
    this.hydrologyLoadToken = token;
    const decodeKey = `${token.requestEpoch}|${token.targetKey}`;
    const scheduled = this.hydrologyDecodeBarrier.enqueue(
      Object.freeze({
        nativeUnionBytes: plan.nativeUnionTransitionBytes,
        resources: plan.resources,
        targetKey: decodeKey,
        tier: plan.tier,
      }),
      () => this.executeHydrologyCohortLoad(plan, token, abortController),
    );
    this.updateHydrologyTelemetry();
    void scheduled.then((outcome) => {
      if (
        outcome.status === "failed"
        && plan.tier === "detail"
        && this.failedDetailTargetKey === plan.targetKey
        && !this.destroyed
      ) {
        this.reconcileHydrologyAssets();
      }
    }).finally(() => {
      if (!this.destroyed) this.updateHydrologyTelemetry();
    });
  }

  private async executeHydrologyCohortLoad(
    plan: RegionalHydrologyCohortPlan,
    token: RegionalHydrologyLoadToken,
    abortController: AbortController,
  ): Promise<void> {
    const planTier = plan.tier;
    if (!planTier) {
      throw new Error("Cannot execute a rejected regional hydrology cohort.");
    }
    const loaded: Array<Readonly<{
      image: HTMLImageElement;
      resource: NinjaOneHydrologyRegionResource;
    }>> = [];
    try {
      abortController.signal.throwIfAborted();
      const existingByKey = new Map(this.hydrologyBindings.map((binding) => [
        this.hydrologyResourceKey(binding.resource),
        binding,
      ]));
      const missingResources = plan.resources.filter((resource) => (
        !existingByKey.has(this.hydrologyResourceKey(resource))
      ));
      const settled = await Promise.allSettled(missingResources.map(
        async (resource) => {
          let image: HTMLImageElement | null = null;
          try {
            image = await loadVerifiedImage(
              resource.path,
              resource.sha256,
              abortController.signal,
            );
            if (
              image.naturalWidth !== resource.dimensions[0]
              || image.naturalHeight !== resource.dimensions[1]
              || image.naturalWidth * image.naturalHeight * 4
                !== resource.decodedBytes
            ) {
              throw new Error(
                `${resource.id} decoded ${image.naturalWidth}x${image.naturalHeight}; `
                  + `expected ${resource.dimensions.join("x")}.`,
              );
            }
            return Object.freeze({ image, resource });
          } catch (error) {
            if (image) releaseDecodedImage(image);
            abortController.abort();
            throw error;
          }
        },
      ));
      for (const result of settled) {
        if (result.status === "fulfilled") loaded.push(result.value);
      }
      const failure = settled.find((result) => result.status === "rejected");
      if (failure?.status === "rejected") throw failure.reason;
      if (
        this.destroyed
        || !this.hydrologyShouldBeResident
        || !this.hydrologyLoadIsCurrent(token)
      ) {
        return;
      }
      const createdBindings: HydrologyRegionBinding[] = [];
      try {
        for (const { image, resource } of loaded) {
          createdBindings.push(Object.freeze({
            resource,
            texture: createTexture(this.gl, image, "clamp", {
              filter: "nearest",
              generateMipmaps: false,
              preserveDataBytes: true,
            }),
            unit: NINJAONE_HYDROLOGY_UNITS[0],
          }));
        }
        const createdByKey = new Map(createdBindings.map((binding) => [
          this.hydrologyResourceKey(binding.resource),
          binding,
        ]));
        const nextBindings = plan.resources.map((resource, slot) => {
          const key = this.hydrologyResourceKey(resource);
          const binding = existingByKey.get(key) ?? createdByKey.get(key);
          if (!binding) throw new Error(`${resource.id} did not produce a texture.`);
          return Object.freeze({
            resource: binding.resource,
            texture: binding.texture,
            unit: NINJAONE_HYDROLOGY_UNITS[slot],
          });
        });
        if (
          !this.hydrologyLoadIsCurrent(token)
        ) {
          for (const binding of createdBindings) {
            this.gl.deleteTexture(binding.texture);
          }
          return;
        }
        const retainedTextures = new Set(nextBindings.map(({ texture }) => texture));
        for (const binding of this.hydrologyBindings) {
          if (!retainedTextures.has(binding.texture)) {
            this.gl.deleteTexture(binding.texture);
          }
        }
        this.hydrologyBindings = Object.freeze(nextBindings);
      } catch (error) {
        for (const binding of createdBindings) {
          this.gl.deleteTexture(binding.texture);
        }
        throw error;
      }
      this.hydrologyMountedPlan = plan;
      this.hydrologyLoadState = settleRegionalHydrologyLoad(
        this.hydrologyLoadState,
        token,
        { ok: true },
      );
      if (planTier === "detail") {
        this.failedDetailTargetKey = null;
      }
      this.failedFallbackTargetKey = null;
      this.hydrologyAssetState = planTier === "detail" ? "ready" : "fallback";
      this.canvas.dataset.hydrologyAssetState = this.hydrologyAssetState;
      const fullDimensions = NINJAONE_STREAM_REGISTRATION.tiers[planTier]
        .fullFieldDimensions;
      this.hydrologyTexel = [
        1 / fullDimensions[0],
        1 / fullDimensions[1],
      ];
      this.hydrologyVisibility = beginRegionalHydrologyFadeIn(
        this.hydrologyVisibility,
        this.lastRenderElapsedSeconds,
        this.reduceMotion,
      );
      this.hydrologyBreakConstraint = null;
      delete this.canvas.dataset.hydrologyAssetError;
      this.updateHydrologyTelemetry();
      this.invalidationHandler?.();
    } catch (error: unknown) {
      if (
        this.destroyed
        || !this.hydrologyLoadIsCurrent(token)
      ) {
        return;
      }
      abortController.abort();
      const message = error instanceof Error ? error.message : String(error);
      this.hydrologyLoadState = settleRegionalHydrologyLoad(
        this.hydrologyLoadState,
        token,
        { error: message, ok: false },
      );
      this.hydrologyAssetState = "error";
      this.canvas.dataset.hydrologyAssetState = "error";
      this.canvas.dataset.hydrologyAssetError = message;
      if (planTier === "detail") {
        this.failedDetailTargetKey = plan.targetKey;
      } else {
        this.failedFallbackTargetKey = plan.targetKey;
      }
      this.updateHydrologyTelemetry();
      this.invalidationHandler?.();
      throw error;
    } finally {
      for (const { image } of loaded) releaseDecodedImage(image);
      if (
        this.hydrologyLoadIsCurrent(token)
      ) {
        this.hydrologyLoadAbortController = null;
        this.hydrologyLoadToken = null;
      }
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
    delete this.canvas.dataset.detailAssetConstraint;
    const directionalDimensions = WATER_TERRITORY_TEXTURE_DIMENSIONS.directionalAlbedo;
    if (!textureFitsCapability(directionalDimensions, this.maximumTextureSize)) {
      this.territoryAssetsFailed = true;
      this.canvas.dataset.detailAssetState = "fallback";
      this.canvas.dataset.detailAssetError =
        `Directional water detail ${directionalDimensions.join("x")} exceeds `
        + `MAX_TEXTURE_SIZE ${this.maximumTextureSize}.`;
      return;
    }
    const directionalBytes = textureFootprintBytes(...directionalDimensions);
    const directionalFitsBudget = this.textureBytes + directionalBytes
      <= WATER_RUNTIME_TEXTURE_BUDGET_BYTES;
    if (!directionalFitsBudget) {
      this.territoryAssetsFailed = true;
      this.canvas.dataset.detailAssetState = "fallback";
      this.canvas.dataset.detailAssetError =
        `Directional water detail would exceed ${WATER_RUNTIME_TEXTURE_BUDGET_BYTES} bytes.`;
      return;
    }
    const coastDimensions = WATER_TERRITORY_TEXTURE_DIMENSIONS.coastGeometry;
    const coastBytes = textureFootprintBytes(...coastDimensions);
    const projectedDetailBytes = this.textureBytes
      + directionalBytes
      + coastBytes
      - this.coastTextureBytes;
    // Both coast textures coexist until both new uploads succeed. Enforce the
    // peak allocation, not only the eventual post-swap footprint.
    const transientDetailBytes = this.textureBytes
      + directionalBytes
      + coastBytes;
    const coastFitsCapability = textureFitsCapability(
      coastDimensions,
      this.maximumTextureSize,
    );
    const coastFitsBudget = Math.max(
      projectedDetailBytes,
      transientDetailBytes,
    ) <= WATER_RUNTIME_TEXTURE_BUDGET_BYTES;
    const useDetailCoast = coastFitsCapability && coastFitsBudget;
    this.territoryReplacementPeakBytes = retainTextureTransientPeak(
      this.territoryReplacementPeakBytes,
      useDetailCoast
        ? transientDetailBytes
        : this.textureBytes + directionalBytes,
    );
    this.recordTextureTransientPeak(this.territoryReplacementPeakBytes);
    const constraint = !coastFitsCapability
      ? `coast ${coastDimensions.join("x")} exceeds MAX_TEXTURE_SIZE ${this.maximumTextureSize}`
      : !coastFitsBudget
        ? `projected ${projectedDetailBytes} / transient ${transientDetailBytes} bytes exceeds `
          + WATER_RUNTIME_TEXTURE_BUDGET_BYTES
        : null;
    this.canvas.dataset.textureBudgetBytes = String(
      WATER_RUNTIME_TEXTURE_BUDGET_BYTES,
    );
    this.territoryAssetsLoading = Promise.all([
      loadImage(WATER_ASSETS.directionalAlbedo),
      useDetailCoast
        ? loadImage(WATER_ASSETS.coastGeometry.territory)
        : Promise.resolve(null),
    ])
      .then(([directionalAlbedo, coastGeometry]) => {
        if (this.destroyed) {
          return;
        }
        const loadedDirectionalDimensions = [
          directionalAlbedo.naturalWidth,
          directionalAlbedo.naturalHeight,
        ] as const;
        if (!textureFitsCapability(
          loadedDirectionalDimensions,
          this.maximumTextureSize,
        )) {
          throw new Error(
            `Directional water detail ${loadedDirectionalDimensions.join("x")} exceeds `
              + `MAX_TEXTURE_SIZE ${this.maximumTextureSize}.`,
          );
        }
        const loadedDirectionalBytes = textureFootprintBytes(
          ...loadedDirectionalDimensions,
        );
        if (
          this.textureBytes + loadedDirectionalBytes
          > WATER_RUNTIME_TEXTURE_BUDGET_BYTES
        ) {
          throw new Error(
            `Loaded directional detail would exceed `
              + `${WATER_RUNTIME_TEXTURE_BUDGET_BYTES} bytes.`,
          );
        }
        let loadedCoastGeometry = coastGeometry;
        let loadedCoastBytes = 0;
        let loadedConstraint = constraint;
        let loadedTransientPeakBytes = this.textureBytes
          + loadedDirectionalBytes;
        if (loadedCoastGeometry) {
          const loadedCoastDimensions = [
            loadedCoastGeometry.naturalWidth,
            loadedCoastGeometry.naturalHeight,
          ] as const;
          loadedCoastBytes = textureFootprintBytes(...loadedCoastDimensions);
          const loadedProjectedBytes = this.textureBytes
            + loadedDirectionalBytes
            + loadedCoastBytes
            - this.coastTextureBytes;
          const loadedTransientBytes = this.textureBytes
            + loadedDirectionalBytes
            + loadedCoastBytes;
          loadedTransientPeakBytes = loadedTransientBytes;
          if (!textureFitsCapability(
            loadedCoastDimensions,
            this.maximumTextureSize,
          )) {
            loadedConstraint =
              `loaded coast ${loadedCoastDimensions.join("x")} exceeds `
              + `MAX_TEXTURE_SIZE ${this.maximumTextureSize}`;
            loadedCoastGeometry = null;
            loadedCoastBytes = 0;
            loadedTransientPeakBytes = this.textureBytes
              + loadedDirectionalBytes;
          } else if (
            Math.max(loadedProjectedBytes, loadedTransientBytes)
            > WATER_RUNTIME_TEXTURE_BUDGET_BYTES
          ) {
            loadedConstraint =
              `loaded projected ${loadedProjectedBytes} / transient `
              + `${loadedTransientBytes} bytes exceeds `
              + WATER_RUNTIME_TEXTURE_BUDGET_BYTES;
            loadedCoastGeometry = null;
            loadedCoastBytes = 0;
            loadedTransientPeakBytes = this.textureBytes
              + loadedDirectionalBytes;
          }
        }
        const previousCoast = this.textures.coastGeometry;
        let directionalTexture: WebGLTexture | null = null;
        let coastTexture: WebGLTexture | null = null;
        try {
          if (loadedCoastGeometry) {
            coastTexture = createTexture(this.gl, loadedCoastGeometry, "clamp", {
              preserveDataBytes: true,
            });
          }
          directionalTexture = createTexture(this.gl, directionalAlbedo, "clamp");
        } catch (error) {
          if (directionalTexture) this.gl.deleteTexture(directionalTexture);
          if (coastTexture) this.gl.deleteTexture(coastTexture);
          throw error;
        }
        this.textures.directionalAlbedo = {
          texture: directionalTexture,
          unit: DIRECTIONAL_ALBEDO_UNIT,
        };
        this.textureBytes += loadedDirectionalBytes;
        if (loadedCoastGeometry && coastTexture) {
          this.textures.coastGeometry = {
            texture: coastTexture,
            unit: previousCoast.unit,
          };
          this.coastTexel = [
            1 / loadedCoastGeometry.naturalWidth,
            1 / loadedCoastGeometry.naturalHeight,
          ];
          this.textureBytes += loadedCoastBytes - this.coastTextureBytes;
          this.coastTextureBytes = loadedCoastBytes;
          this.gl.deleteTexture(previousCoast.texture);
        }
        this.gl.useProgram(this.program);
        this.gl.uniform1i(
          this.uniforms.u_directionalAlbedo,
          DIRECTIONAL_ALBEDO_UNIT,
        );
        this.canvas.dataset.detailAssetState = loadedCoastGeometry
          ? "ready"
          : "constrained";
        this.canvas.dataset.textureBytes = String(this.textureBytes);
        this.canvas.dataset.sharedWaterTextureBytes = String(this.textureBytes);
        this.recordTextureTransientPeak(loadedTransientPeakBytes);
        if (loadedConstraint) {
          this.canvas.dataset.detailAssetConstraint = loadedConstraint;
        } else {
          delete this.canvas.dataset.detailAssetConstraint;
        }
        delete this.canvas.dataset.detailAssetError;
        // Reduced-motion mode intentionally has no RAF loop. Explicitly
        // invalidate after an async resource swap so its one frame cannot
        // remain stuck on the base coast textures.
        this.invalidationHandler?.();
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
