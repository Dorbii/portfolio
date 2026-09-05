import fieldManifest from "../../../../../../public/career-world/layers/water/fields-r1/manifest.json" with { type: "json" };
import type { WaterScene } from "../../WaterRenderer.ts";
import { linkProgram } from "../../../../shared/water/webgl.ts";
import { DEFAULT_WORLD_WIND_STATE } from "../../../../shared/weather.ts";
import { WaterLighting } from "../../../lighting/water/WaterLighting.ts";
import { GpuTimer } from "../../GpuTimer.ts";
import { createWaveEventCatalog, selectWaveEvents, type WaveSite, type WaveEvent } from "./model.ts";
import { EVENT_VERTEX, EVENT_FRAGMENT } from "./shader.ts";

const NAMES = ["uCamera", "uWorldMetres", "uSites[0]", "uMotion[0]", "uStyle[0]", "uPixelMetres", "uOpacity"] as const;
const WORLD_METRES = [fieldManifest.worldSize[0] * fieldManifest.metresPerWorldUnit, fieldManifest.worldSize[1] * fieldManifest.metresPerWorldUnit] as const;

// Spray alone crosses the land compositing plane. Large wave shape, material
// and foam are integrated into the ocean surface by the same event records.
export class WaveEventRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly canvas: HTMLCanvasElement;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly lighting: WaterLighting;
  private readonly timer: GpuTimer;
  private readonly image: HTMLImageElement;
  private readonly uniforms = {} as Record<typeof NAMES[number], WebGLUniformLocation | null>;
  private ready = false;
  private catalog: readonly WaveSite[] = [];
  private disposed = false;
  private readonly sites = new Float32Array(32);
  private readonly motion = new Float32Array(32);
  private readonly style = new Float32Array(16);

  constructor(canvas: HTMLCanvasElement, invalidate: () => void) {
    const gl = canvas.getContext("webgl2", { alpha: true, antialias: false, depth: false, premultipliedAlpha: true });
    if (!gl) throw new Error("Wave events require WebGL2.");
    this.canvas = canvas; this.gl = gl;
    this.program = linkProgram(gl, EVENT_VERTEX, EVENT_FRAGMENT);
    const vao = gl.createVertexArray();
    if (!vao) { gl.deleteProgram(this.program); throw new Error("Wave-event allocation failed."); }
    this.vao = vao;
    for (const name of NAMES) this.uniforms[name] = gl.getUniformLocation(this.program, name);
    this.timer = new GpuTimer(gl);
    try { this.lighting = new WaterLighting(gl, this.program, invalidate); }
    catch (error) { this.timer.destroy(); gl.deleteVertexArray(vao); gl.deleteProgram(this.program); throw error; }
    this.image = new Image();
    this.image.onload = () => {
      if (this.disposed) return;
      const source = document.createElement("canvas");
      source.width = this.image.naturalWidth; source.height = this.image.naturalHeight;
      const context = source.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      context.drawImage(this.image, 0, 0);
      this.catalog = createWaveEventCatalog({ width: source.width, height: source.height,
        rgba: context.getImageData(0, 0, source.width, source.height).data,
        worldMetres: WORLD_METRES, rangeMetres: fieldManifest.rangeMetres }, DEFAULT_WORLD_WIND_STATE.directionDegrees * Math.PI / 180);
      this.ready = true;
      canvas.dataset.eventSites = String(this.catalog.length);
      canvas.dataset.renderState = "ready";
      invalidate();
    };
    this.image.onerror = () => { if (!this.disposed) canvas.dataset.renderState = "unavailable"; };
    this.image.src = fieldManifest.levels.at(-1)!.tiles[0].path;
  }

  selectEvents(scene: WaterScene, seconds: number): readonly WaveEvent[] {
    return scene.oceanVisible && this.ready
      ? selectWaveEvents(this.catalog.filter((site) => site.kind !== "impact" || scene.coastalEffects), seconds, scene.state.weather, scene.camera, WORLD_METRES)
        .slice().sort((a, b) => a.center[1] - b.center[1]) : [];
  }

  render(scene: WaterScene, seconds: number, events: readonly WaveEvent[] = this.selectEvents(scene, seconds)) {
    const { gl, canvas, uniforms: u } = this;
    if (this.disposed || gl.isContextLost()) return;
    const rect = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = Math.max(1, Math.round(rect.width * dpr)), height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    gl.viewport(0, 0, width, height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    canvas.dataset.surfaceMode = "integrated-ocean";
    canvas.dataset.eventCount = String(events.length);
    canvas.dataset.eventTime = seconds.toFixed(3);
    canvas.dataset.eventKinds = events.map((event) => event.kind).join(" ");
    if (scene.probe) canvas.dataset.activeEvents = JSON.stringify(events.map(({ id, kind, center, age, height, strength }) => ({ id, kind, center, age, height, strength })));
    if (!events.length) return;
    this.timer.begin();
    events.forEach((event, i) => {
      this.sites.set([...event.center, event.length, event.height], i * 4);
      this.motion.set([...event.direction, event.age, Number(event.kind === "impact")], i * 4);
      // Keep shader noise seeds below the range where float32 loses the small
      // per-particle offsets; the catalog retains its full integer identity.
      this.style.set([event.strength, (event.seed % 100003) / 97], i * 2);
    });
    gl.useProgram(this.program); gl.bindVertexArray(this.vao);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform4f(u.uCamera, ...scene.camera.origin, ...scene.camera.span);
    gl.uniform2f(u.uWorldMetres, ...WORLD_METRES);
    gl.uniform4fv(u["uSites[0]"], this.sites); gl.uniform4fv(u["uMotion[0]"], this.motion); gl.uniform2fv(u["uStyle[0]"], this.style);
    gl.uniform1f(u.uPixelMetres, scene.camera.span[0] * WORLD_METRES[0] / width);
    gl.uniform1f(u.uOpacity, scene.state.opacity);
    this.lighting.bind(scene.light);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 160 * 6, events.length);
    this.timer.end(); this.timer.publish(canvas);
  }

  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    this.image.onload = null; this.image.onerror = null; this.image.src = "";
    this.lighting.destroy(); this.timer.destroy();
    this.gl.deleteVertexArray(this.vao); this.gl.deleteProgram(this.program);
  }
}
