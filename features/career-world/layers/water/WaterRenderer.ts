import fieldManifest from "../../../../public/career-world/layers/water/fields-r1/manifest.json" with { type: "json" };
import type { CameraView } from "../../shared/camera";
import type { WorldLight } from "../../shared/lighting";
import { DEFAULT_WORLD_WIND_STATE } from "../../shared/weather.ts";
import { linkProgram } from "../../shared/water/webgl.ts";
import { selectWaterFields, type WaterFieldLevel, type WaterFieldTile, type WaterState } from "./model.ts";
import { buildFieldPages } from "./fieldPages.ts";
import { WATER_FRAGMENT, WATER_VERTEX } from "./shader.ts";
import { WaterLighting } from "../lighting/water/WaterLighting.ts";
import { GpuTimer } from "./GpuTimer.ts";
import { SpectralOcean } from "./ocean/SpectralOcean.ts";
import type { WaveEvent } from "./ocean/events/model.ts";
import { SeabedTextures } from "./ocean/seabed/SeabedTextures.ts";

const LEVELS = fieldManifest.levels as unknown as readonly WaterFieldLevel[];
const MAX_TEXTURES = 64;
const MAX_LOADS = 4;
const UNIFORMS = ["uFields", "uPages", "uFieldSize", "uCamera", "uWorldMetres", "uRange", "uTime", "uWeather", "uWindAngle", "uPixelMetres", "uOpacity", "uCoast", "uInlandEffects", "uInlandBed", "uVisible", "uDebug"] as const;
type Uniform = typeof UNIFORMS[number];

export interface WaterScene {
  readonly camera: CameraView;
  readonly light: WorldLight;
  readonly state: WaterState;
  readonly oceanVisible: boolean;
  readonly inlandVisible: boolean;
  readonly coastalEffects: boolean;
  readonly inlandEffects: boolean;
  readonly inlandBedVisible?: boolean;
  readonly debug: boolean;
  readonly probe?: boolean;
  readonly seabedVisible?: boolean;
  readonly oceanDetailsVisible?: boolean;
  readonly aquaticLifeVisible?: boolean;
}

interface ResidentField {
  readonly tile: WaterFieldTile;
  readonly slot: number;
  used: number;
}

export class WaterRenderer {
  readonly canvas: HTMLCanvasElement;
  private readonly invalidate: () => void;
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly fieldArray: WebGLTexture;
  private readonly pages: WebGLTexture;
  private pagesDirty = true;
  private readonly lighting: WaterLighting;
  private readonly timer: GpuTimer;
  private readonly spectrum: SpectralOcean | null;
  private readonly seabed: SeabedTextures;
  private readonly detailCanvas?: HTMLCanvasElement;
  private readonly detailContext: CanvasRenderingContext2D | null;
  private readonly detailPass: WebGLUniformLocation | null;
  private readonly aquaticLife: WebGLUniformLocation | null;
  private readonly uniforms = {} as Record<Uniform, WebGLUniformLocation | null>;
  private readonly resident = new Map<string, ResidentField>();
  private readonly loading = new Map<string, HTMLImageElement>();
  private readonly timeouts = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly retry = new Map<string, number>();
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private requested: readonly WaterFieldTile[] = [];
  private scene: WaterScene;
  private disposed = false;
  private revision = 0;
  private frames = 0;
  private probing = false;
  private readonly eventSites = new Float32Array(32);
  private readonly eventMotion = new Float32Array(32);
  private readonly eventStyle = new Float32Array(16);
  private readonly eventUniforms = {} as Record<"count" | "sites" | "motion" | "style", WebGLUniformLocation | null>;
  private selectedLevel = LEVELS.length - 1;

  constructor(canvas: HTMLCanvasElement, scene: WaterScene, invalidate: () => void, detailCanvas?: HTMLCanvasElement) {
    this.canvas = canvas;
    this.detailCanvas = detailCanvas;
    this.detailContext = detailCanvas?.getContext("2d", { alpha: true }) ?? null;
    this.invalidate = invalidate;
    const gl = canvas.getContext("webgl2", { alpha: true, antialias: false, depth: false, premultipliedAlpha: false });
    if (!gl) throw new Error("WebGL2 is unavailable.");
    this.gl = gl;
    this.timer = new GpuTimer(gl);
    const graphicsInfo = gl.getExtension("WEBGL_debug_renderer_info");
    canvas.dataset.gpuRenderer = String(graphicsInfo ? gl.getParameter(graphicsInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    canvas.dataset.floatTargets = String(Boolean(gl.getExtension("EXT_color_buffer_float")));
    this.scene = scene;
    delete canvas.dataset.gpuStageError;
    canvas.dataset.surfaceRevision = "ocean-cutouts-life-r6";
    let program: WebGLProgram | null = null;
    let vao: WebGLVertexArrayObject | null = null;
    let texture: WebGLTexture | null = null;
    let pages: WebGLTexture | null = null;
    let lighting: WaterLighting | null = null;
    let spectrum: SpectralOcean | null = null;
    let seabed: SeabedTextures | null = null;
    try {
      program = linkProgram(gl, WATER_VERTEX, WATER_FRAGMENT);
      vao = gl.createVertexArray();
      texture = gl.createTexture(); pages = gl.createTexture();
      if (!vao || !texture || !pages) throw new Error("Water GPU allocation failed.");
      this.program = program;
      this.detailPass = gl.getUniformLocation(program, "uDetailPass");
      this.aquaticLife = gl.getUniformLocation(program, "uAquaticLife");
      this.vao = vao;
      this.fieldArray = texture; this.pages = pages;
      for (const name of UNIFORMS) this.uniforms[name] = gl.getUniformLocation(program, name);
      this.eventUniforms.count = gl.getUniformLocation(program, "uEventCount");
      this.eventUniforms.sites = gl.getUniformLocation(program, "uEventSites[0]");
      this.eventUniforms.motion = gl.getUniformLocation(program, "uEventMotion[0]");
      this.eventUniforms.style = gl.getUniformLocation(program, "uEventStyle[0]");
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
      gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, fieldManifest.tileSize, fieldManifest.tileSize, MAX_TEXTURES);
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindTexture(gl.TEXTURE_2D, pages);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      lighting = new WaterLighting(gl, program, invalidate);
      this.lighting = lighting;
      seabed = new SeabedTextures(gl, program, invalidate); this.seabed = seabed;
      if (gl.getExtension("EXT_color_buffer_float")) {
        try { spectrum = new SpectralOcean(gl, DEFAULT_WORLD_WIND_STATE.directionDegrees * Math.PI / 180); }
        catch (error) { canvas.dataset.waveError = error instanceof Error ? error.message : String(error); }
      }
      this.spectrum = spectrum;
      gl.useProgram(program);
      // The analytical path still needs valid, non-conflicting sampler units.
      gl.uniform1i(gl.getUniformLocation(program, "uSwell"), 2);
      gl.uniform1i(gl.getUniformLocation(program, "uRipples"), 2);
      gl.uniform1i(gl.getUniformLocation(program, "uSwellOffset"), 2);
      gl.uniform1i(gl.getUniformLocation(program, "uRippleOffset"), 2);
      canvas.dataset.waveModel = spectrum ? "spectral-2x128" : "analytic";
      canvas.dataset.fieldRevision = fieldManifest.inputHash;
      this.setScene(scene);
    } catch (error) {
      for (const timer of this.timeouts.values()) clearTimeout(timer);
      for (const image of this.loading.values()) { image.onload = null; image.onerror = null; image.src = ""; }
      lighting?.destroy(); spectrum?.destroy(); seabed?.destroy(); this.timer.destroy();
      if (pages) gl.deleteTexture(pages);
      if (texture) gl.deleteTexture(texture);
      if (vao) gl.deleteVertexArray(vao);
      if (program) gl.deleteProgram(program);
      throw error;
    }
  }

  setScene(scene: WaterScene) {
    this.scene = scene;
    const bounds = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const selection = selectWaterFields(LEVELS, scene.camera, [bounds.width * dpr, bounds.height * dpr]);
    if (this.selectedLevel !== selection.level) this.pagesDirty = true;
    this.selectedLevel = selection.level;
    this.requested = selection.tiles;
    const now = ++this.revision;
    for (const tile of this.requested) {
      const resident = this.resident.get(tile.id);
      if (resident) resident.used = now;
    }
    this.evict();
    this.pump();
  }

  private pump() {
    if (this.disposed) return;
    const wanted = new Set(this.requested.map((tile) => tile.id));
    for (const [id, image] of this.loading) {
      if (wanted.has(id)) continue;
      image.onload = null; image.onerror = null; image.src = "";
      clearTimeout(this.timeouts.get(id)); this.timeouts.delete(id);
      this.loading.delete(id);
    }
    for (const tile of this.requested) {
      if (this.loading.size >= MAX_LOADS) break;
      if (this.resident.has(tile.id) || this.loading.has(tile.id) || (this.retry.get(tile.id) ?? 0) > Date.now()) continue;
      const image = new Image();
      image.decoding = "async";
      this.loading.set(tile.id, image);
      image.onload = () => {
        if (this.disposed || this.loading.get(tile.id) !== image) return;
        clearTimeout(this.timeouts.get(tile.id)); this.timeouts.delete(tile.id);
        this.loading.delete(tile.id);
        this.evict(MAX_TEXTURES - 1);
        const occupied = new Set([...this.resident.values()].map((field) => field.slot));
        let slot = 0; while (occupied.has(slot)) slot++;
        const gl = this.gl;
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.fieldArray);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
        gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
        gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, slot, tile.dimensions[0], tile.dimensions[1], 1, gl.RGBA, gl.UNSIGNED_BYTE, image);
        this.resident.set(tile.id, { tile, slot, used: this.revision });
        this.pagesDirty = true;
        this.retry.delete(tile.id);
        this.evict();
        this.pump();
        this.invalidate();
      };
      const failed = () => {
        if (this.disposed || this.loading.get(tile.id) !== image) return;
        clearTimeout(this.timeouts.get(tile.id)); this.timeouts.delete(tile.id);
        this.loading.delete(tile.id);
        image.onload = null; image.onerror = null; image.src = "";
        this.retry.set(tile.id, Date.now() + 5000);
        this.canvas.dataset.fieldError = `Failed to load ${tile.path}`;
        this.pump(); this.invalidate();
      };
      image.onerror = failed;
      this.timeouts.set(tile.id, setTimeout(failed, 15000));
      image.src = tile.path;
    }
    if (this.retryTimer) clearTimeout(this.retryTimer);
    const next = Math.min(...this.requested.map((tile) => this.retry.get(tile.id) ?? Infinity).filter((at) => at > Date.now()));
    this.retryTimer = Number.isFinite(next) ? setTimeout(() => { this.retryTimer = null; this.pump(); }, Math.max(1, next - Date.now())) : null;
  }

  private evict(limit = MAX_TEXTURES) {
    if (this.resident.size <= limit) return;
    const wanted = new Set(this.requested.map((tile) => tile.id));
    const candidates = [...this.resident.values()].filter(({ tile }) => !wanted.has(tile.id)).sort((a, b) => a.used - b.used);
    for (const field of candidates) {
      if (this.resident.size <= limit) break;
      this.resident.delete(field.tile.id); this.pagesDirty = true;
    }
  }

  render(oceanSeconds: number, inlandSeconds: number, events: readonly WaveEvent[] = []) {
    if (this.disposed || this.gl.isContextLost()) return;
    const { gl, canvas, uniforms: u, scene } = this;
    const checkGpu = (stage: string) => {
      if (!scene.probe) return;
      const error = gl.getError();
      if (error) canvas.dataset.gpuStageError = `${stage}:${error}`;
    };
    checkGpu("before-frame");
    const cpuStart = performance.now();
    this.timer.begin();
    const simulationPasses = scene.oceanVisible ? this.spectrum?.update(oceanSeconds, scene.state.weather) ?? 0 : 0;
    checkGpu("simulation");
    const bounds = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = Math.max(1, Math.round(bounds.width * dpr)), height = Math.max(1, Math.round(bounds.height * dpr));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    gl.viewport(0, 0, width, height);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.disable(gl.SCISSOR_TEST);
    gl.useProgram(this.program); gl.bindVertexArray(this.vao);
    events.forEach((event, i) => {
      this.eventSites.set([...event.center, event.length, event.height], i * 4);
      this.eventMotion.set([...event.direction, event.age, Number(event.kind === "impact")], i * 4);
      this.eventStyle.set([event.strength, (event.seed % 100003) / 97], i * 2);
    });
    gl.uniform1i(this.eventUniforms.count, events.length);
    gl.uniform4fv(this.eventUniforms.sites, this.eventSites);
    gl.uniform4fv(this.eventUniforms.motion, this.eventMotion);
    gl.uniform2fv(this.eventUniforms.style, this.eventStyle);
    this.spectrum?.bindMaterial(this.program);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.fieldArray); gl.uniform1i(u.uFields, 0);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.pages); gl.uniform1i(u.uPages, 2);
    if (this.pagesDirty) {
      const [pw, ph] = fieldManifest.dimensions.map((n) => Math.ceil(n / fieldManifest.tileSize));
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, pw, ph, 0, gl.RGBA, gl.UNSIGNED_BYTE,
        buildFieldPages([...this.resident.values()], this.selectedLevel, pw, ph));
      this.pagesDirty = false;
    }
    gl.uniform3f(u.uFieldSize, fieldManifest.dimensions[0], fieldManifest.dimensions[1], fieldManifest.tileSize);
    gl.uniform4f(u.uCamera, ...scene.camera.origin, ...scene.camera.span);
    gl.uniform2f(u.uWorldMetres, fieldManifest.worldSize[0] * fieldManifest.metresPerWorldUnit, fieldManifest.worldSize[1] * fieldManifest.metresPerWorldUnit);
    gl.uniform1f(u.uRange, fieldManifest.rangeMetres);
    gl.uniform2f(u.uTime, oceanSeconds, inlandSeconds);
    gl.uniform1f(u.uWeather, scene.state.weather);
    gl.uniform1f(u.uOpacity, scene.state.opacity);
    gl.uniform1f(u.uPixelMetres, scene.camera.span[0] * fieldManifest.worldSize[0] * fieldManifest.metresPerWorldUnit / width);
    gl.uniform1f(u.uWindAngle, DEFAULT_WORLD_WIND_STATE.directionDegrees * Math.PI / 180);
    gl.uniform1f(u.uCoast, Number(scene.coastalEffects));
    gl.uniform1f(u.uInlandEffects, Number(scene.inlandEffects));
    gl.uniform1f(u.uInlandBed,Number(scene.inlandBedVisible!==false));
    gl.uniform2f(u.uVisible, Number(scene.oceanVisible), Number(scene.inlandVisible));
    this.lighting.bind(scene.light);
    const seabedState = this.seabed.bind(scene.seabedVisible !== false, scene.oceanDetailsVisible !== false && Boolean(this.detailContext));
    gl.uniform1f(this.aquaticLife, Number(scene.aquaticLifeVisible !== false));
    const overlayVisible=scene.oceanVisible && (scene.coastalEffects || scene.aquaticLifeVisible !== false || scene.oceanDetailsVisible !== false) && seabedState.floorReady && !scene.debug;
    gl.uniform1f(u.uDebug, Number(scene.debug));
    checkGpu("bindings");
    // Draw the ocean detail pass with the exact same wave/optics textures,
    // then transfer it to its own compositing layer above the land.
    if (this.detailCanvas && this.detailContext) {
      if (this.detailCanvas.width !== width || this.detailCanvas.height !== height) { this.detailCanvas.width = width; this.detailCanvas.height = height; }
      this.detailContext.clearRect(0, 0, width, height);
      if (overlayVisible) {
        gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform1f(this.detailPass, 1); gl.drawArrays(gl.TRIANGLES, 0, 3);
        checkGpu("details-draw");
        this.detailContext.drawImage(canvas, 0, 0);
        checkGpu("details-copy");
      }
      this.detailCanvas.dataset.renderState = seabedState.detailsReady ? "ready" : "loading";
    }
    gl.uniform1f(this.detailPass, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    checkGpu("base-draw");
    this.timer.end(); this.timer.publish(canvas);
    canvas.dataset.frameCount = String(++this.frames);
    canvas.dataset.waterTime = `${oceanSeconds.toFixed(3)},${inlandSeconds.toFixed(3)}`;
    canvas.dataset.fieldLevel = String(this.selectedLevel);
    canvas.dataset.fieldResident = String(this.resident.size);
    canvas.dataset.fieldPending = String(this.loading.size);
    canvas.dataset.fieldDecodedBytes = String(MAX_TEXTURES * fieldManifest.tileSize ** 2 * 4);
    canvas.dataset.lightDirection = scene.light.direction.join(",");
    canvas.dataset.weather = scene.state.weather.toFixed(3);
    canvas.dataset.seabedState = seabedState.floorReady ? "ready" : "loading";
    canvas.dataset.seabedError = this.seabed.error;
    canvas.dataset.cpuRenderMs = (performance.now() - cpuStart).toFixed(3);
    canvas.dataset.drawCalls = String(1 + simulationPasses + Number(Boolean(this.detailContext) && overlayVisible));
    if (scene.probe && this.spectrum && !this.probing) {
      this.probing = true;
      void this.spectrum.probe(DEFAULT_WORLD_WIND_STATE.directionDegrees * Math.PI / 180)
        .then((result) => { if (!this.disposed) canvas.dataset.spectrumProbe = JSON.stringify(result); })
        .catch((error: unknown) => { if (!this.disposed) canvas.dataset.probeError = String(error); });
    }
    this.pump();
  }

  destroy() {
    this.disposed = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    for (const timer of this.timeouts.values()) clearTimeout(timer);
    this.timeouts.clear();
    for (const image of this.loading.values()) { image.onload = null; image.onerror = null; image.src = ""; }
    this.loading.clear();
    this.resident.clear();
    this.lighting.destroy();
    this.seabed.destroy();
    if (this.detailContext && this.detailCanvas) this.detailContext.clearRect(0, 0, this.detailCanvas.width, this.detailCanvas.height);
    this.spectrum?.destroy();
    this.timer.destroy();
    this.gl.deleteTexture(this.fieldArray); this.gl.deleteTexture(this.pages);
    this.gl.deleteVertexArray(this.vao); this.gl.deleteProgram(this.program);
  }
}
