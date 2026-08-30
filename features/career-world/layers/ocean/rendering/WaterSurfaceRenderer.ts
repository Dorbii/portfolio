import type { CameraView } from "../../../shared/camera.ts";
import { DETAIL_POLICY, type DetailState } from "../../../shared/lod.ts";
import type { WorldLight } from "../../../shared/lighting.ts";
import {
  createTexture,
  linkProgram,
  loadImage,
} from "../../../shared/water/webgl.ts";
import { OCEAN_FIELD_ASSETS, OCEAN_FIELD_DIMENSIONS } from "../model/assets.ts";
import {
  OCEAN_FAMILIES,
  OCEAN_LOOP_SECONDS,
  OCEAN_SCROLL_LOOPS,
  OCEAN_PASS_STATES,
  OCEAN_PASS_UNIFORM_TYPES,
  OCEAN_SCREEN_TO_TUNED,
  OCEAN_TUNED_PER_WORLD,
  OCEAN_TUNED_TO_SCREEN,
  type OceanPassName,
  type OceanUniformValue,
} from "../model/generated/oceanStates.ts";
import {
  normalizeWaterSurfaceState,
  readWaterSurfaceUrlOverrides,
  type WaterSurfaceState,
} from "../model/state.ts";
import {
  OCEAN_COMPOSITE_SHADER,
  OCEAN_FOAM_SHADER,
  OCEAN_SPRAY_SHADER,
  OCEAN_VERTEX_SHADER,
  OCEAN_WAVE_SHADER,
} from "./shaders/generated/index.ts";

const PASS_ORDER = ["wave", "foam", "spray", "composite"] as const;

const PASS_SOURCE: Readonly<Record<OceanPassName, string>> = Object.freeze({
  wave: OCEAN_WAVE_SHADER,
  foam: OCEAN_FOAM_SHADER,
  spray: OCEAN_SPRAY_SHADER,
  composite: OCEAN_COMPOSITE_SHADER,
});

/**
 * Fixed texture units, so no pass has to negotiate for one. The four world
 * fields are bound once and never rebound; the render targets take the rest.
 * `texPrev` is unit 8 in the foam pass and unit 9 in the spray pass, which is
 * what keeps each ping-pong pair off the other's unit.
 */
export const OCEAN_SAMPLER_UNITS = Object.freeze({
  texPhase: 0,
  texFlowField: 1,
  texNoise: 2,
  texNoiseF: 3,
  texGeom: 4,
  texFlow: 5,
  texSwell: 6,
  texPath: 7,
  texFoam: 8,
  texSpray: 9,
});

/**
 * `texPrev` is each stateful pass's own previous frame, so it means a different
 * texture in each of them. Without this it would take sampler unit 0 by default
 * and the foam pass would advect the phase field instead of its own history.
 */
export const OCEAN_PASS_SAMPLERS: Partial<Record<OceanPassName, Record<string, number>>> =
  Object.freeze({
    foam: { texPrev: OCEAN_SAMPLER_UNITS.texFoam },
    spray: { texPrev: OCEAN_SAMPLER_UNITS.texSpray },
  });

/**
 * The water renders at the SAME pixel ratio as the land it sits beside.
 *
 * This was capped at two megapixels to bound the memory of eight float render
 * targets, and the cap bound hard: on a 1704 px viewport the land drew at ratio
 * 2.0 and the water at 1.107, so the water was upscaled 55% and every crisp
 * stroke in it turned to smear. Against sharp illustrated land that does not
 * read as soft water, it reads as a different and worse material -- and no
 * amount of tuning inside the shader can recover resolution that was never
 * rendered.
 *
 * The memory comes back from the two stateful passes instead. Foam and spray
 * are advected and diffused fields with no hard edges of their own -- the crisp
 * boundaries around them are drawn in the composite, at full resolution, by
 * contouring them -- so they cost a quarter of the pixels and lose nothing that
 * reaches the picture. The wave targets stay full-size and share one
 * framebuffer, which is also what forces them to: multiple render targets must
 * agree on size.
 */
// Four full-size RGBA16F targets, two full-size RGBA32F (the foam pair, which
// carries material coordinates -- see the target allocator) and two quarter-size
// RGBA32F is 72 bytes per pixel of viewport, so this ceiling is worth about
// 470 MB of GPU memory -- the same order as the painted plates it replaced,
// which decoded to well over 200 MB before the territory coast field was
// counted. It binds only on displays larger than roughly 1700 by 950 CSS pixels
// at ratio 2.
const SIM_MAX_PIXELS = 6_500_000;

/**
 * Linear scale of the SPRAY state. Spray is a ballistic plume with no crisp
 * edge of its own, so it costs a quarter of the pixels and loses nothing.
 *
 * Foam is not here on purpose. Whitewater is the crispest thing in the picture,
 * and the composite draws its edges by contouring the foam field on the foam's
 * own MATERIAL coordinates -- halve those and the lace, the wisps and the
 * eroded boundary all smear, which is most of what separated this from the
 * reference clip.
 */
/**
 * The period the clock wraps at: a whole number of wave loops, so the field is
 * exactly as periodic as before, but long enough for the large-scale scroll
 * fields to quantise onto their noise lattice instead of onto zero.
 */
const SCROLL_SECONDS = OCEAN_LOOP_SECONDS * OCEAN_SCROLL_LOOPS;

const STATE_SCALE = 0.5;

/** Wave-pass outputs, which are render targets one moment and inputs the next. */
const WAVE_TARGET_UNITS = ["texGeom", "texFlow", "texSwell", "texPath"] as const;

const TIMING_SAMPLE_LIMIT = 120;
const MAX_PENDING_TIMER_QUERIES = 8;

/** Picture-space gravity the presets were tuned at. See presets.py. */
const TUNED_G = 130.0;

const WORLD_WIDTH = OCEAN_FIELD_DIMENSIONS[0];

interface GpuTimerQueryExtension {
  readonly TIME_ELAPSED_EXT: GLenum;
  readonly GPU_DISJOINT_EXT: GLenum;
}

interface PassProgram {
  readonly program: WebGLProgram;
  readonly uniforms: Map<string, WebGLUniformLocation>;
}

/** Development switches, read from the query string: ?water.<name>. */
function hasWaterFlag(name: string): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has(`water.${name}`);
}

function percentile95(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
}

function normalize2(pair: readonly number[]): [number, number] {
  const length = Math.hypot(pair[0], pair[1]);
  if (length === 0) throw new Error("Wave family direction cannot be zero.");
  return [pair[0] / length, pair[1] / length];
}

const DIR_PRIMARY = normalize2(OCEAN_FAMILIES.primary.direction);
const DIR_SECONDARY = normalize2(OCEAN_FAMILIES.secondary.direction);

/**
 * Horizontal and vertical components of the sun the specular lobes were
 * calibrated against: `normalize(vec3(-0.62, -0.55, 0.56))`, 34 degrees above
 * the water plane.
 */
const TUNED_SUN_HORIZONTAL = Math.hypot(0.62, 0.55) / Math.hypot(0.62, 0.55, 0.56);
const TUNED_SUN_VERTICAL = 0.56 / Math.hypot(0.62, 0.55, 0.56);

/**
 * The world backdrop owns one light direction and every layer consumes it. The
 * ocean consumes its AZIMUTH and holds its own elevation, because the specular
 * calibration is a function of that elevation: the gloss lobe runs
 * `pow(dot(N,H), 34)` against a 34-degree view tilt, and moving the sun up or
 * down the sky moves every highlight off the facets it was tuned to sit on.
 * That calibration is what the whole of 2026-08-28 went into, so it is not
 * something to re-derive from a manifest at load time.
 *
 * Today the two elevations differ by about a degree, so this changes nothing;
 * it means the ocean follows if the world light is ever moved sideways.
 */
function oceanSunDirection(
  direction: readonly [number, number, number],
): Float32Array {
  const horizontal = Math.hypot(direction[0], direction[1]);
  if (horizontal === 0) {
    throw new Error("World light direction must have a horizontal component.");
  }
  return new Float32Array([
    (direction[0] / horizontal) * TUNED_SUN_HORIZONTAL,
    (direction[1] / horizontal) * TUNED_SUN_HORIZONTAL,
    TUNED_SUN_VERTICAL,
  ]);
}

/** Deep-water wavelength of a period, in tuned pixels. L0 = g T^2 / 2pi. */
function tunedWavelength(period: number): number {
  return TUNED_G * period * period / (2 * Math.PI);
}

/**
 * Angular frequency quantised to the loop exactly as the shaders do, so the
 * secondary stroke train in the composite runs at the frequency the wave pass
 * gave that train and the two do not drift apart.
 */
function loopOmega(period: number): number {
  const raw = (2 * Math.PI) / period;
  const n = Math.max(1, Math.floor((raw * OCEAN_LOOP_SECONDS) / (2 * Math.PI) + 0.5));
  return (2 * Math.PI * n) / OCEAN_LOOP_SECONDS;
}

function mix(low: number, high: number, t: number): number {
  return low + (high - low) * t;
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Weather walks calm -> windy -> heavy. Two segments rather than a blend of all
 * three, so 0.5 lands exactly on the state the world phase field was baked from.
 */
function weatherLerp(
  states: readonly Readonly<Record<string, OceanUniformValue>>[],
  name: string,
  weather: number,
  component: number,
): number {
  const low = weather < 0.5 ? 0 : 1;
  const t = weather < 0.5 ? weather * 2 : (weather - 0.5) * 2;
  const read = (index: number): number => {
    const value = states[index][name];
    return typeof value === "number" ? value : value[component];
  };
  return read(low) + (read(low + 1) - read(low)) * t;
}

export interface WaterRenderInfo {
  readonly width: number;
  readonly height: number;
  readonly devicePixelRatio: number;
  readonly textureCount: number;
  readonly renderer: string;
}

/**
 * The solved ocean, on the live coastline.
 *
 * Four passes per frame, mirroring the offline renderer one for one:
 *
 *   wave      surface height, gradient, breaking, flow, the clean wave form and
 *             the stroke path      (multiple render targets)
 *   foam      persistent whitewater: born at breaking crests, carried by the
 *             surface flow, aged, and only then faded   (ping-pong)
 *   spray     impact plumes at exposed headlands        (ping-pong)
 *   composite shading and colour, over the land art showing through from below
 *
 * The shaders are generated from `art-source/ocean-animation/src/shaders/` by
 * `export_web.py`; nothing in them is authored here. What IS authored here is
 * everything the offline renderer never had to answer: a camera, foam that has
 * to survive it, and a weather scalar in place of three switchable presets.
 */
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
      // Off by default: keeping the drawing buffer costs bandwidth on every
      // frame. On with ?water.capture, which is what makes the rendered water
      // MEASURABLE from the page -- drawImage of a discarded buffer returns
      // transparent, so without this the only way to judge the live layer is to
      // look at a screenshot, and looking is exactly what kept being wrong about
      // this water.
      preserveDrawingBuffer: hasWaterFlag("capture"),
      powerPreference: "high-performance",
    });

    if (!gl) {
      throw new Error("WebGL 2 is unavailable.");
    }
    // Half-float render targets are what the foam and spray state need: their
    // material coordinates run to five figures and 8-bit would quantise the
    // lace lookup into noise. Without this extension they are not renderable at
    // all, and there is no version of this water that works without them.
    if (!gl.getExtension("EXT_color_buffer_float")) {
      throw new Error(
        "Ocean water needs EXT_color_buffer_float for its float render targets.",
      );
    }

    const [phase, flow, noise, noiseFine] = await Promise.all([
      loadImage(OCEAN_FIELD_ASSETS.phase),
      loadImage(OCEAN_FIELD_ASSETS.flow),
      loadImage(OCEAN_FIELD_ASSETS.noise),
      loadImage(OCEAN_FIELD_ASSETS.noiseFine),
    ]);

    const renderer = new WaterSurfaceRenderer(canvas, gl, light, {
      // NEAREST is not an optimisation here, it is correctness: the red and
      // green channels are the high and low bytes of one 16-bit phase residual,
      // and hardware bilinear would interpolate them independently. The shader
      // decodes four texels and interpolates the decoded values.
      texPhase: createTexture(gl, phase, "clamp", "nearest"),
      texFlowField: createTexture(gl, flow, "clamp", "linear"),
      texNoise: createTexture(gl, noise, "repeat"),
      texNoiseF: createTexture(gl, noiseFine, "repeat"),
    });
    // ?water.probe -- hand the intermediate targets to whatever is measuring
    // from outside. Off by default: it reads the whole framebuffer back and
    // stalls the pipeline, which is fine for a measurement and not for a page.
    if (hasWaterFlag("probe")) {
      (window as unknown as { __oceanProbe?: () => unknown }).__oceanProbe =
        () => renderer.probeFields();
    }
    return renderer;
  }

  readonly canvas: HTMLCanvasElement;
  private readonly gl: WebGL2RenderingContext;
  private readonly passes = new Map<OceanPassName, PassProgram>();
  private readonly fields: Readonly<Record<string, WebGLTexture>>;
  private readonly buffer: WebGLBuffer;
  private readonly vao: WebGLVertexArrayObject;

  private targets: {
    geom: WebGLTexture;
    flow: WebGLTexture;
    swell: WebGLTexture;
    path: WebGLTexture;
    foam: [WebGLTexture, WebGLTexture];
    spray: [WebGLTexture, WebGLTexture];
  } | null = null;
  private framebuffers: {
    wave: WebGLFramebuffer;
    foam: [WebGLFramebuffer, WebGLFramebuffer];
    spray: [WebGLFramebuffer, WebGLFramebuffer];
  } | null = null;
  private current = 0;
  private stateSize: [number, number] = [1, 1];
  private firstStep = true;

  private camera: CameraView = { origin: [0, 0], span: [1, 1] };
  private previousCamera: CameraView = { origin: [0, 0], span: [1, 1] };
  private state: WaterSurfaceState = normalizeWaterSurfaceState(
    readWaterSurfaceUrlOverrides(),
  );
  private detailState: DetailState | null = null;
  private coastalAmbience = true;
  private lightDirection: Float32Array;
  private pixelRatio = 1;
  private renderScale = 1;
  private zc = 1;
  private openWaveVis = 1;
  /**
   * ?water.raw -- draw the sea with the LoD policy switched off.
   *
   * Everything below syncPresetUniforms' `fade` table is MINE, not the offline
   * renderer's, so it is the one part of the live layer that no offline render
   * can vouch for. With it bypassed the live shaders run on the preset values
   * the plate was tuned at, which makes a capture of the whole world directly
   * comparable, pixel for pixel, with the offline renderer on the same scene.
   * That is the only way to ask "is this the port, or is this my LoD policy?"
   * and get an answer rather than an opinion.
   */
  private readonly rawMode = hasWaterFlag("raw");
  /**
   * ?water.mat16 -- put the material coordinates back in half floats.
   *
   * Diagnostic only. Half floats were the default until a 45-second capture
   * showed what a 14-second one could not: the material offsets grow for as long
   * as a parcel of foam survives, half-float spacing grows with magnitude, and
   * the lace and the marks are CONTOURED from those coordinates. Past about a
   * thousand tuned pixels of drift the spacing exceeds the width of the strokes
   * being drawn, the contour quantises onto an axis-aligned lattice, and the
   * foam accumulating inside each cell saturates it. What that draws is a grey
   * rectangular slab lying on open water, with straight edges and square
   * corners, which grows the longer the page is left open -- the "random white
   * lines that seem wrong". Measuring this needs a page that has been running a
   * while, which is why it survived a short capture and why the flag is kept.
   */
  private readonly matHalf = hasWaterFlag("mat16");
  /** ?water.markScale=<0..1> -- how far drawn marks follow the water, not the screen. */
  private readonly markAnchor = (() => {
    if (typeof window === "undefined") return 0;
    const raw = new URLSearchParams(window.location.search).get("water.markScale");
    const value = raw === null ? 0 : Number(raw);
    return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
  })();
  private presetsDirty = true;

  private readonly timerExtension: GpuTimerQueryExtension | null;
  private readonly pendingQueries: Array<{
    readonly query: WebGLQuery;
    readonly wallMs: number;
  }> = [];
  private readonly renderSamples: number[] = [];
  private readonly frameIntervals: number[] = [];
  private lastPresentedAt = 0;
  private destroyed = false;
  private resizePending = true;

  private constructor(
    canvas: HTMLCanvasElement,
    gl: WebGL2RenderingContext,
    light: WorldLight,
    fields: Readonly<Record<string, WebGLTexture>>,
  ) {
    this.canvas = canvas;
    this.gl = gl;
    this.fields = fields;
    this.lightDirection = oceanSunDirection(light.direction);
    this.timerExtension = gl.getExtension(
      "EXT_disjoint_timer_query_webgl2",
    ) as GpuTimerQueryExtension | null;

    const buffer = gl.createBuffer();
    const vao = gl.createVertexArray();
    if (!buffer || !vao) {
      throw new Error("WebGL could not allocate the world-plane buffer.");
    }
    this.buffer = buffer;
    this.vao = vao;
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );

    for (const name of PASS_ORDER) {
      const program = linkProgram(gl, OCEAN_VERTEX_SHADER, PASS_SOURCE[name]);
      const position = gl.getAttribLocation(program, "a_position");
      if (position < 0) {
        throw new Error(`Ocean ${name} shader is missing a_position.`);
      }
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

      // Unused uniforms are stripped by the compiler and have no location. That
      // is expected -- several presets drive machinery that is shipped inert --
      // so a missing location is skipped rather than treated as a contract
      // break, exactly as the offline binder does.
      const uniforms = new Map<string, WebGLUniformLocation>();
      const record = (uniformName: string): void => {
        const location = gl.getUniformLocation(program, uniformName);
        if (location) uniforms.set(uniformName, location);
      };
      for (const uniformName of Object.keys(OCEAN_PASS_UNIFORM_TYPES[name])) {
        record(uniformName);
      }
      for (const uniformName of RUNTIME_UNIFORMS) record(uniformName);
      for (const uniformName of Object.keys(OCEAN_SAMPLER_UNITS)) record(uniformName);
      for (const uniformName of Object.keys(OCEAN_PASS_SAMPLERS[name] ?? {})) {
        record(uniformName);
      }

      // Every uniform the compiler KEPT must be written by someone. One that no
      // list mentions is not a harmless omission: the location is never looked
      // up, the write is silently skipped, and the shader runs on whatever the
      // default happens to be -- which is a term quietly missing from the
      // picture with nothing anywhere to say so.
      const active = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
      const orphaned: string[] = [];
      for (let i = 0; i < active; i += 1) {
        const info = gl.getActiveUniform(program, i);
        if (!info) continue;
        const base = info.name.replace(/\[\d+\]$/, "");
        if (!uniforms.has(base)) orphaned.push(base);
      }
      if (orphaned.length > 0) {
        throw new Error(
          `Ocean ${name} pass has uniforms nothing writes: ${orphaned.join(", ")}.`,
        );
      }
      this.passes.set(name, { program, uniforms });
    }
    gl.bindVertexArray(null);

    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);
    this.bindFields();
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
    this.lightDirection = oceanSunDirection(light.direction);
  }

  setCoastalAmbience(visible: boolean): void {
    if (this.coastalAmbience === visible) return;
    this.coastalAmbience = visible;
    // Spray is the only thing the ocean puts on land, so it is the only thing
    // coastal ambience gates. It rides on a preset uniform, not a runtime one.
    this.presetsDirty = true;
  }

  setState(state: Partial<WaterSurfaceState>): void {
    this.state = normalizeWaterSurfaceState({ ...this.state, ...state });
    this.presetsDirty = true;
  }

  render(elapsedSeconds: number, deltaSeconds = 0): void {
    if (!this.detailState) {
      throw new Error("Water view must be set before rendering.");
    }

    const gl = this.gl;
    if (this.resizePending) {
      this.resize();
      this.resizePending = false;
    }
    const targets = this.targets;
    const framebuffers = this.framebuffers;
    if (!targets || !framebuffers) return;

    this.pollTimerQueries();
    const now = performance.now();
    this.recordFrameInterval(now);
    const wallStart = now;
    // A delayed query must not grow without bound when the GPU is already
    // behind. The previous one-query-per-frame queue amplified a slow frame
    // into an ever-growing queue after texture replacement.
    const query = this.timerExtension
      && this.pendingQueries.length < MAX_PENDING_TIMER_QUERIES
      ? gl.createQuery()
      : null;
    if (query && this.timerExtension) {
      gl.beginQuery(this.timerExtension.TIME_ELAPSED_EXT, query);
    }

    const zc = this.cameraScale();
    if (Math.abs(zc - this.zc) > 1e-6) {
      this.zc = zc;
      this.presetsDirty = true;
    }
    if (this.presetsDirty) {
      this.syncPresetUniforms();
      this.presetsDirty = false;
    }

    // Every frequency in the field is an exact multiple of 2*pi/loop, so the
    // whole wave field is loop-periodic and the clock can be wrapped rather than
    // left to grow. Left growing, cos(S - w*t) loses a usable fraction of a
    // radian after a few hours on the page.
    //
    // Wrapped on SCROLL_LOOPS of them, not one. A multiple of an exact period is
    // an exact period, so the waves do not notice -- but the large-scale scroll
    // fields quantise their travel to the noise lattice over whatever period the
    // clock closes on, and over a single loop that lattice rounded fifteen of
    // the eighteen of them to no movement at all. See loopScroll in the
    // generated shaders for the measurement.
    const time = (elapsedSeconds * this.state.timeScale) % SCROLL_SECONDS;
    // The offline renderer takes two substeps per 24 fps frame. Here the clock
    // is whatever the browser gave us, clamped: a long stall must not advect
    // foam half a screen in one step.
    const dt = Math.min(0.06, Math.max(0, deltaSeconds * this.state.timeScale));

    gl.bindVertexArray(this.vao);
    const size: [number, number] = [this.canvas.width, this.canvas.height];

    // --- wave -------------------------------------------------------------
    // The four wave targets are still bound to their sampler units from last
    // frame, and rendering into a texture that is bound for reading is a
    // feedback loop: the draw is undefined and the context reports an error
    // rather than a picture. Unbind first, rebind once the pass has written.
    for (const name of WAVE_TARGET_UNITS) this.bindTarget(name, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers.wave);
    gl.drawBuffers([
      gl.COLOR_ATTACHMENT0,
      gl.COLOR_ATTACHMENT1,
      gl.COLOR_ATTACHMENT2,
      gl.COLOR_ATTACHMENT3,
    ]);
    this.usePass("wave", size, time);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    this.bindTarget("texGeom", targets.geom);
    this.bindTarget("texFlow", targets.flow);
    this.bindTarget("texSwell", targets.swell);
    this.bindTarget("texPath", targets.path);

    // --- foam -------------------------------------------------------------
    this.bindTarget("texFoam", targets.foam[this.current]);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers.foam[1 - this.current]);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    this.usePass("foam", size, time, dt);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // --- spray ------------------------------------------------------------
    this.bindTarget("texSpray", targets.spray[this.current]);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers.spray[1 - this.current]);
    this.usePass("spray", this.stateSize, time, dt);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    this.current = 1 - this.current;
    this.firstStep = false;

    // --- composite --------------------------------------------------------
    this.bindTarget("texFoam", targets.foam[this.current]);
    this.bindTarget("texSpray", targets.spray[this.current]);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.drawBuffers([gl.BACK]);
    this.usePass("composite", size, time);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);

    // Foam and spray are screen-space buffers, so the next step has to know
    // which viewport they were written in to reproject through the camera.
    this.previousCamera = this.camera;

    const wallMs = performance.now() - wallStart;
    if (query && this.timerExtension) {
      gl.endQuery(this.timerExtension.TIME_ELAPSED_EXT);
      this.pendingQueries.push({ query, wallMs });
    } else {
      this.recordTiming(wallMs);
    }
  }

  /**
   * Read the wave pass's own channels back off the GPU.
   *
   * Everything the foam pass injects from -- breaking, whitecap, the crest path
   * -- is an intermediate render target. None of it is in the composite, so no
   * screenshot can show it, and when the live layer makes a fifth of the offline
   * renderer's whitewater the picture cannot say whether the waves are failing
   * to BREAK or the foam is failing to SURVIVE. Those need opposite fixes.
   *
   * Statistics rather than pixels: the question is always "how much of this
   * field is above the threshold the next stage tests it against".
   */
  probeFields(): Record<string, Record<string, number>> {
    const gl = this.gl;
    const [w, h] = [this.canvas.width, this.canvas.height];
    const out: Record<string, Record<string, number>> = {};
    const pixels = new Float32Array(w * h * 4);
    const read = (
      framebuffer: WebGLFramebuffer,
      attachment: number,
      label: string,
      names: readonly string[],
    ): void => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.readBuffer(attachment);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.FLOAT, pixels);
      for (let c = 0; c < 4; c += 1) {
        const values: number[] = [];
        let sum = 0;
        let peak = 0;
        for (let i = c; i < pixels.length; i += 4 * 7) {
          const value = pixels[i];
          if (!Number.isFinite(value)) continue;
          values.push(value);
          sum += value;
          if (value > peak) peak = value;
        }
        values.sort((left, right) => left - right);
        const at = (q: number): number => values[Math.floor((values.length - 1) * q)] ?? 0;
        out[`${label}.${names[c]}`] = {
          mean: sum / Math.max(1, values.length),
          p50: at(0.5),
          p95: at(0.95),
          p99: at(0.99),
          max: peak,
          over01: values.filter((value) => value > 0.1).length / Math.max(1, values.length),
          over05: values.filter((value) => value > 0.5).length / Math.max(1, values.length),
        };
      }
    };
    const framebuffers = this.framebuffers;
    if (!framebuffers) return out;
    read(framebuffers.wave, gl.COLOR_ATTACHMENT0, "geom", ["hn", "dhdx", "dhdy", "breaking"]);
    // The SHADING is driven by the gradient, not the height. A field baked at
    // eleven samples a wave and magnified has interpolated gradients; one solved
    // at a hundred and fifteen does not. That costs contrast at every depth
    // while leaving hn's own distribution intact, so the height matching is not
    // evidence that the shading will.
    {
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers.wave);
      gl.readBuffer(gl.COLOR_ATTACHMENT0);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.FLOAT, pixels);
      const values: number[] = [];
      let sum = 0;
      let peak = 0;
      for (let i = 0; i < pixels.length; i += 4 * 7) {
        const value = Math.hypot(pixels[i + 1], pixels[i + 2]);
        if (!Number.isFinite(value)) continue;
        values.push(value);
        sum += value;
        if (value > peak) peak = value;
      }
      values.sort((left, right) => left - right);
      const at = (q: number): number => values[Math.floor((values.length - 1) * q)] ?? 0;
      out["geom.|grad h|"] = {
        mean: sum / Math.max(1, values.length),
        p50: at(0.5),
        p95: at(0.95),
        p99: at(0.99),
        max: peak,
        over01: values.filter((value) => value > 0.1).length / Math.max(1, values.length),
        over05: values.filter((value) => value > 0.5).length / Math.max(1, values.length),
      };
    }
    read(framebuffers.wave, gl.COLOR_ATTACHMENT1, "flow", ["vx", "vy", "hForm", "whitecap"]);
    read(framebuffers.wave, gl.COLOR_ATTACHMENT3, "path", ["hPath", "formEnv", "groupEnv", "rE"]);
    read(framebuffers.foam[this.current], gl.COLOR_ATTACHMENT0, "foam",
         ["fresh", "persist", "matX", "matY"]);
    // Spray is airborne whitewater and the other thing that can put white
    // offshore. It runs at STATE_SCALE, so it is read at its own size.
    {
      const [sw, sh] = this.stateSize;
      const spray = new Float32Array(sw * sh * 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers.spray[this.current]);
      gl.readBuffer(gl.COLOR_ATTACHMENT0);
      gl.readPixels(0, 0, sw, sh, gl.RGBA, gl.FLOAT, spray);
      const values: number[] = [];
      let sum = 0;
      let peak = 0;
      for (let i = 0; i < spray.length; i += 4) {
        const value = spray[i];
        if (!Number.isFinite(value)) continue;
        values.push(value);
        sum += value;
        if (value > peak) peak = value;
      }
      values.sort((left, right) => left - right);
      const at = (q: number): number => values[Math.floor((values.length - 1) * q)] ?? 0;
      out["spray.a"] = {
        mean: sum / Math.max(1, values.length),
        p50: at(0.5), p95: at(0.95), p99: at(0.99), max: peak,
        over01: values.filter((v) => v > 0.1).length / Math.max(1, values.length),
        over05: values.filter((v) => v > 0.5).length / Math.max(1, values.length),
      };
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return out;
  }

  getRenderInfo(): WaterRenderInfo {
    const gl = this.gl;
    return Object.freeze({
      width: this.canvas.width,
      height: this.canvas.height,
      devicePixelRatio: this.pixelRatio,
      textureCount: Object.keys(this.fields).length,
      renderer: gl.getParameter(gl.RENDERER) as string,
    });
  }

  requestResize(): void {
    this.resizePending = true;
  }

  destroy(): void {
    this.destroyed = true;
    const gl = this.gl;
    for (const { query } of this.pendingQueries) gl.deleteQuery(query);
    for (const texture of Object.values(this.fields)) gl.deleteTexture(texture);
    this.releaseTargets();
    for (const { program } of this.passes.values()) gl.deleteProgram(program);
    gl.deleteBuffer(this.buffer);
    gl.deleteVertexArray(this.vao);
  }

  // ------------------------------------------------------------------ setup
  private bindFields(): void {
    const gl = this.gl;
    for (const [name, texture] of Object.entries(this.fields)) {
      gl.activeTexture(gl.TEXTURE0 + OCEAN_SAMPLER_UNITS[name as keyof typeof OCEAN_SAMPLER_UNITS]);
      gl.bindTexture(gl.TEXTURE_2D, texture);
    }
    for (const [pass, { program, uniforms }] of this.passes.entries()) {
      gl.useProgram(program);
      for (const [name, unit] of Object.entries(OCEAN_SAMPLER_UNITS)) {
        const location = uniforms.get(name);
        if (location) gl.uniform1i(location, unit);
      }
      for (const [name, unit] of Object.entries(OCEAN_PASS_SAMPLERS[pass] ?? {})) {
        const location = uniforms.get(name);
        if (location) gl.uniform1i(location, unit);
      }
    }
  }

  private bindTarget(
    name: keyof typeof OCEAN_SAMPLER_UNITS,
    texture: WebGLTexture | null,
  ): void {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + OCEAN_SAMPLER_UNITS[name]);
    gl.bindTexture(gl.TEXTURE_2D, texture);
  }

  /**
   * Screen pixels per tuned plate pixel. The shaders evaluate in tuned pixels --
   * fixed to the world, so the sea is the same sea at every zoom -- and this is
   * the one number that converts between that and the picture being drawn.
   */
  private cameraScale(): number {
    const span = Math.max(this.camera.span[0], 1e-6);
    return this.canvas.width / (span * WORLD_WIDTH * OCEAN_TUNED_PER_WORLD);
  }

  /**
   * The whole preset table, interpolated to the current weather and converted
   * for the camera. Only re-uploaded when weather or the zoom changes; uniform
   * values live on the program object, so the per-frame path sets six things.
   */
  private syncPresetUniforms(): void {
    const gl = this.gl;
    const zc = this.zc;
    // Wavelengths of the three trains as drawn, in screen pixels. What a
    // sampled grid cannot resolve it should not be asked to draw: below a few
    // pixels per wave the short trains are aliasing rather than texture, and
    // they are also exactly the detail that a closer camera is meant to reveal.
    const lamP = tunedWavelength(OCEAN_FAMILIES.primary.period) * zc;
    const lamS = tunedWavelength(OCEAN_FAMILIES.secondary.period) * zc;
    const lamC = tunedWavelength(OCEAN_FAMILIES.chop.period) * zc;
    // How many stroke widths fit across one wave. This is the number that
    // decides whether the drawn line work is DRAWING or HATCHING: a crest stroke
    // is a mark on the picture and holds its ~4 px whatever the camera does, so
    // at world zoom, where the swell is five pixels from crest to crest, every
    // wave in the sea gets a solid white line through it and the water reads as
    // corduroy. Below about eight the marks have to go; the sea is still there,
    // carried by tone and shading, and the strokes come back as the camera
    // closes in. That is the LoD promise -- zoom reveals detail, it does not
    // change the physics -- applied to the drawing rather than to the waves.
    const strokesPerWave = lamP / weatherLerp(
      OCEAN_PASS_STATES.composite,
      "uCrestLineW",
      this.state.weather,
      0,
    );
    const line = smoothstep(4, 10, strokesPerWave);
    // Whether a crest is big enough to carry a drawn stroke.
    //
    // This was keyed on how many crests the viewport holds, which was wrong: at
    // one wavelength a wider monitor holds more of them, so a large display at
    // the TUNED scale had its stroke work stripped and went soft -- the drawing
    // stopped for a reason that has nothing to do with the water. The question
    // is only ever how big one wave is on screen. Below about fifty pixels a
    // line down every crest is corrugation; by a hundred, which is the scale the
    // presets were tuned at, it is surf.
    const boldCrest = smoothstep(50, 110, lamP);
    // Whether an individual wave is a thing the picture can show at all.
    //
    // At world zoom the swell is four or five screen pixels from crest to
    // crest. Shading each of those as a wave -- light on the front face, dark in
    // the trough -- puts a two-pixel light/dark pair on every one of them across
    // the whole sea, and what that draws is a woven fabric, not water. It is not
    // an aliasing artifact to be filtered away either; it is the correct picture
    // of a wave that is too small to be a picture.
    //
    // Sea seen from that height has no visible swell. It has colour by depth, a
    // slow large-scale mottle from wind and current, and surf as a thin line on
    // the shore. That is what is left when this reaches zero, and the waves come
    // back as the camera closes in -- revealed, not switched on.
    // The band is where it is because of what the swell is worth on screen at
    // each tier, not because of a number that felt right: below about twenty
    // pixels a crest is a stripe rather than a wave, and by fifty it carries the
    // tonal structure the whole treatment is built on. With the world baked at
    // twelve pixels a swell that puts the wide shot below the floor and the
    // territory approach across the ramp, which is where detail should arrive.
    const waveDetail = smoothstep(20, 45, lamP);
    this.openWaveVis = this.rawMode ? 1 : waveDetail;
    // The detail-wave family is a separate, shorter train drawn for shading
    // only, so it needs its own answer to the same question.
    const detailWave = smoothstep(
      20,
      45,
      weatherLerp(OCEAN_PASS_STATES.composite, "uDetailLam", this.state.weather, 0) * zc,
    );
    // The palette is the tuned one, at every zoom. There is deliberately no
    // cAbyss/cDeep/cMid/uSat entry in the table below.
    //
    // There used to be, and the argument for it was measured on captures of a
    // sea that had never run: the preview pane reports itself hidden, foam and
    // spray are INTEGRATED, so every frame behind that reasoning was water with
    // no surf in it. The luma range those numbers reported as evidence of a flat
    // blue was the flatness of a simulation that had not stepped. Darkening the
    // whole palette to fix it made the picture worse in the one way the
    // measurement could not see, and ?water.capture exists now so that class of
    // reasoning cannot be made again.
    const wideShot = 1 - waveDetail;
    // How much the drawn MARKS grow with the camera.
    //
    // Stroke and foam-line widths are screen-anchored: a crest line holds ~4 px
    // wherever it is drawn. That is right for a fixed render and wrong across a
    // 25x zoom range, because the WAVES grow and the marks do not, so the number
    // of marks per wave halves every time the camera doubles. Measured: rendering
    // the offline plate treatment at the live layer's pixel density, on the same
    // water, drops its own whitewater from 24.6% to 10.2% -- 2.4x, from
    // resolution alone. That is the picture going from surf to a wash as you
    // zoom in, and no amount of foam will fix it, because the foam is there and
    // is being drawn too thin.
    //
    // 0 leaves them screen-anchored, 1 pins them to the water so a wave carries
    // the same marks at every zoom. ?water.markScale sweeps it.
    const markScale = Math.pow(Math.max(zc, 1e-3), this.markAnchor);
    const fade: Readonly<Record<string, number>> = {
      uInjCrestW: markScale,
      uCrestLineW: markScale,
      uLaceLineW: markScale,
      uChopW: markScale,
      uStreakW: markScale,
      uWispW: markScale,
      // With the swell gone and the deep end dark, the open sea has one field
      // left that can vary it: the large-scale weather the wave pass already
      // carries, which decides where the sea is working and where it is glassy.
      // At close range it is a whisper under everything else; out here it is the
      // only thing between a dark ocean and a flat fill, so it is worth more.
      uRegionTone: 1 + 1.4 * wideShot,
      uAmpS: smoothstep(4, 8, lamS),
      uAmpC: smoothstep(4, 8, lamC),
      // The primary train is not faded by amplitude: it dominates the spectrum,
      // and the height field is normalised by its own RMS, so scaling it is a
      // silent no-op -- the same shape of trap as scaling the component
      // amplitudes to carry regional energy. The height field stays exactly as
      // solved; what fades is how much of it the shading is allowed to draw.
      uSprayGain: this.coastalAmbience ? 1 : 0,
      // Offshore whitecaps are the other half of the weave, and the worse half.
      // A whitecap is born on a crest and the composite deliberately
      // re-concentrates foam back onto the crest line it came from -- which is
      // right, and is most of what separates this from a cloud of dots -- but a
      // crest four pixels wide gets a two-pixel white stripe, and every wave in
      // the sea gets one. So the offshore source is cut rather than the drawing
      // masked: no injection, nothing to band, and the surf zone keeps its own
      // injection untouched because a breaking shoreline IS resolvable from
      // orbit and is the one piece of white the picture should have.
      uDetailShade: detailWave,
      uDetailSlope: detailWave,
      uDetailSky: detailWave,
      uDetailGloss: detailWave,
      uDetailTrough: detailWave,
      uCrestGain: line,
      uCrestLineFloor: line * boldCrest,
      // NOT boldCrest. The floor above is an unconditional stroke down every
      // crest, so it is exactly the corrugation boldCrest exists to hold back.
      // The cross train is the opposite term: a second contour at a different
      // angle and wavelength whose whole purpose, per the shader that draws it,
      // is to make the spacing of the strokes irregular -- two regular grids
      // interleave irregularly, one regular grid is corduroy. Gating it on the
      // same scalar switched the fix off wherever the symptom appears, and the
      // symptom is what Steve keeps seeing: below a hundred screen pixels a
      // wave, which is the whole world and territory range, the sea was drawn
      // with one train and read as parallel diagonal ribbing. `line` alone is
      // the honest question here -- is there room across a wave for the stroke.
      uCrossTrain: line,
      uLaceLineGain: line,
      uWispGain: line,
      uStreakGain: line,
      uChopCrest: line,
      uChopGlint: line,
      // The specular is the other half of the corrugated look: a tight lobe
      // running along every ridge of a regular surface is exactly how ribbed
      // glass is drawn. It keeps its tuned weight where the crest count is
      // low and comes down as the sea fills with repeats.
      uGlossGain: mix(0.45, 1, boldCrest),
      uSheen: mix(0.5, 1, boldCrest),
    };

    for (const name of PASS_ORDER) {
      const pass = this.passes.get(name);
      if (!pass) continue;
      const types = OCEAN_PASS_UNIFORM_TYPES[name];
      const states = OCEAN_PASS_STATES[name];
      gl.useProgram(pass.program);
      for (const [uniformName, type] of Object.entries(types)) {
        const location = pass.uniforms.get(uniformName);
        if (!location) continue;
        const components = type === "vec3" ? 3 : type === "vec2" ? 2 : 1;
        const scale = OCEAN_TUNED_TO_SCREEN.has(uniformName)
          ? zc
          : OCEAN_SCREEN_TO_TUNED.has(uniformName)
            ? 1 / zc
            : 1;
        const gain = this.rawMode ? 1 : (fade[uniformName] ?? 1);
        if (components === 1) {
          let value = weatherLerp(states, uniformName, this.state.weather, 0)
            * scale * gain;
          // The foam neighbourhood is a screen radius once converted, and below
          // half a pixel the blur silently becomes a no-op -- the mechanism that
          // breaks whitewater sheets into patches would just stop at world zoom.
          if (uniformName === "uDiffuse") value = Math.max(value, 0.75);
          gl.uniform1f(location, value);
          continue;
        }
        const values = new Float32Array(components);
        for (let i = 0; i < components; i += 1) {
          values[i] = weatherLerp(states, uniformName, this.state.weather, i)
            * scale * gain;
        }
        if (components === 2) gl.uniform2fv(location, values);
        else gl.uniform3fv(location, values);
      }
    }
  }

  private usePass(
    name: OceanPassName,
    size: readonly [number, number],
    time: number,
    dt = 0,
  ): void {
    const gl = this.gl;
    const pass = this.passes.get(name);
    if (!pass) return;
    gl.useProgram(pass.program);
    gl.viewport(0, 0, size[0], size[1]);

    const set1 = (uniform: string, value: number): void => {
      const location = pass.uniforms.get(uniform);
      if (location) gl.uniform1f(location, value);
    };
    const set2 = (uniform: string, value: readonly number[]): void => {
      const location = pass.uniforms.get(uniform);
      if (location) gl.uniform2f(location, value[0], value[1]);
    };

    set2("uRes", size);
    set1("uTime", time);
    set1("uLoop", OCEAN_LOOP_SECONDS);
    set1("uScrollLoop", SCROLL_SECONDS);
    set1("uG", TUNED_G);
    set1("uFlatOcean", 0);
    // Strips every drawn layer, leaving geometry and base colour: the ablation
    // switch the offline renderer uses to judge the water body on its own.
    set1("uBare", hasWaterFlag("bare") ? 1 : 0);
    // How much of the open-water wave field the picture can resolve. One lever,
    // applied inside the wave pass after the RMS normalisation, so every term
    // downstream of the height field quietens in step. See wave.frag.
    set1("uOpenWaveVis", this.openWaveVis);
    set2("uDirDeep", DIR_PRIMARY);
    set2("uDirSecond", DIR_SECONDARY);
    set1("uPeriodP", OCEAN_FAMILIES.primary.period);
    set1("uPeriodS", OCEAN_FAMILIES.secondary.period);
    set1("uPeriodC", OCEAN_FAMILIES.chop.period);
    set2("uCamOrigin", this.camera.origin);
    set2("uCamSpan", this.camera.span);
    set1("uZc", this.zc);
    set2("uPrevOrigin", this.previousCamera.origin);
    set2("uPrevSpan", this.previousCamera.span);
    set1("uDt", dt);
    set1("uFirst", this.firstStep ? 1 : 0);
    set1("uOmegaS", loopOmega(OCEAN_FAMILIES.secondary.period));
    set1("uOpacity", this.state.opacity);

    const location = pass.uniforms.get("uLightDirection");
    if (location) gl.uniform3fv(location, this.lightDirection);
  }

  // ------------------------------------------------------------------ targets
  private resize(): void {
    const bounds = this.canvas.getBoundingClientRect();
    // The same ceiling the land uses. Water drawn at a lower ratio than the art
    // it borders does not look like softer water, it looks like a lower-quality
    // layer, and the coastline is where the two meet on every frame.
    const requested = Math.min(
      (window.devicePixelRatio || 1) * this.renderScale,
      DETAIL_POLICY.renderScale.maximumDevicePixelRatio,
    );
    const cssWidth = Math.max(1, bounds.width);
    const cssHeight = Math.max(1, bounds.height);
    const capped = Math.min(
      requested,
      Math.sqrt(SIM_MAX_PIXELS / (cssWidth * cssHeight)),
    );

    this.pixelRatio = Math.max(0.5, capped);
    const width = Math.max(1, Math.round(cssWidth * this.pixelRatio));
    const height = Math.max(1, Math.round(cssHeight * this.pixelRatio));

    if (
      this.canvas.width !== width
      || this.canvas.height !== height
      || !this.targets
    ) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.allocateTargets(width, height);
      this.presetsDirty = true;
    }
  }

  private allocateTargets(width: number, height: number): void {
    const gl = this.gl;
    this.releaseTargets();

    const target = (w: number, h: number, full = false): WebGLTexture => {
      const texture = gl.createTexture();
      if (!texture) throw new Error("WebGL could not allocate a water target.");
      gl.bindTexture(gl.TEXTURE_2D, texture);
      // The foam and spray buffers carry MATERIAL COORDINATES in .ba, and the
      // lace, the wisps, the marks and the eroded boundary are all contoured
      // from them -- which is what turns a foam field into painted whitewater
      // rather than a wash. They are stored as offsets because the absolute
      // values reach five figures, but the offsets themselves grow for as long
      // as the parcel survives, and half-float spacing grows with magnitude:
      // one unit at 1024, two at 2048, four at 4096, against strokes a fraction
      // of a tuned pixel wide. That is not a subtle loss of quality. It puts a
      // grey rectangular slab on the open sea, and this comment used to end by
      // noting the offline renderer uses 32-bit floats throughout -- which was
      // the answer, sitting behind a flag that shipped off because the capture
      // that judged it was too short for the offsets to have grown.
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        full ? gl.RGBA32F : gl.RGBA16F,
        w,
        h,
        0,
        gl.RGBA,
        full ? gl.FLOAT : gl.HALF_FLOAT,
        null,
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      return texture;
    };

    const stateWidth = Math.max(1, Math.round(width * STATE_SCALE));
    const stateHeight = Math.max(1, Math.round(height * STATE_SCALE));
    this.stateSize = [stateWidth, stateHeight];
    const spray = (): WebGLTexture => target(stateWidth, stateHeight, !this.matHalf);
    const targets = {
      geom: target(width, height),
      flow: target(width, height),
      swell: target(width, height),
      path: target(width, height),
      foam: [target(width, height, !this.matHalf), target(width, height, !this.matHalf)] as
        [WebGLTexture, WebGLTexture],
      spray: [spray(), spray()] as [WebGLTexture, WebGLTexture],
    };

    const attach = (textures: readonly WebGLTexture[]): WebGLFramebuffer => {
      const framebuffer = gl.createFramebuffer();
      if (!framebuffer) {
        throw new Error("WebGL could not allocate a water framebuffer.");
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      textures.forEach((texture, index) => {
        gl.framebufferTexture2D(
          gl.FRAMEBUFFER,
          gl.COLOR_ATTACHMENT0 + index,
          gl.TEXTURE_2D,
          texture,
          0,
        );
      });
      gl.drawBuffers(
        textures.map((_texture, index) => gl.COLOR_ATTACHMENT0 + index),
      );
      const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      if (status !== gl.FRAMEBUFFER_COMPLETE) {
        throw new Error(`Water framebuffer is incomplete (0x${status.toString(16)}).`);
      }
      gl.clear(gl.COLOR_BUFFER_BIT);
      return framebuffer;
    };

    this.targets = targets;
    this.framebuffers = {
      wave: attach([targets.geom, targets.flow, targets.swell, targets.path]),
      foam: [attach([targets.foam[0]]), attach([targets.foam[1]])],
      spray: [attach([targets.spray[0]]), attach([targets.spray[1]])],
    };
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    // A resized buffer has no history to reproject, so the next step seeds
    // rather than advects.
    this.firstStep = true;
    this.current = 0;
  }

  private releaseTargets(): void {
    const gl = this.gl;
    if (this.framebuffers) {
      gl.deleteFramebuffer(this.framebuffers.wave);
      for (const framebuffer of this.framebuffers.foam) {
        gl.deleteFramebuffer(framebuffer);
      }
      for (const framebuffer of this.framebuffers.spray) {
        gl.deleteFramebuffer(framebuffer);
      }
      this.framebuffers = null;
    }
    if (this.targets) {
      const { geom, flow, swell, path, foam, spray } = this.targets;
      for (const texture of [geom, flow, swell, path, ...foam, ...spray]) {
        gl.deleteTexture(texture);
      }
      this.targets = null;
    }
  }

  // ------------------------------------------------------------------ timing
  private pollTimerQueries(): void {
    const extension = this.timerExtension;
    if (!extension) return;
    while (this.pendingQueries.length > 0) {
      const pending = this.pendingQueries[0];
      if (
        !this.gl.getQueryParameter(pending.query, this.gl.QUERY_RESULT_AVAILABLE)
      ) {
        break;
      }
      this.pendingQueries.shift();
      const disjoint = this.gl.getParameter(extension.GPU_DISJOINT_EXT) as boolean;
      const elapsedNs = this.gl.getQueryParameter(
        pending.query,
        this.gl.QUERY_RESULT,
      ) as number;
      this.gl.deleteQuery(pending.query);
      this.recordTiming(disjoint ? pending.wallMs : elapsedNs / 1_000_000);
    }
  }

  private recordFrameInterval(now: number): void {
    if (this.lastPresentedAt > 0) {
      this.frameIntervals.push(now - this.lastPresentedAt);
    }
    this.lastPresentedAt = now;
    if (this.frameIntervals.length > TIMING_SAMPLE_LIMIT) {
      this.frameIntervals.shift();
    }
  }

  private recordTiming(durationMs: number): void {
    if (this.destroyed) return;
    this.renderSamples.push(durationMs);
    if (this.renderSamples.length > TIMING_SAMPLE_LIMIT) {
      this.renderSamples.shift();
    }
    this.canvas.dataset.renderAverageMs = (
      this.renderSamples.reduce((sum, value) => sum + value, 0)
      / this.renderSamples.length
    ).toFixed(2);
    this.canvas.dataset.renderP95Ms = percentile95(this.renderSamples).toFixed(2);
    this.canvas.dataset.frameIntervalP95Ms = percentile95(this.frameIntervals)
      .toFixed(2);
  }
}

/** Set every frame by the renderer rather than by the generated preset table. */
export const RUNTIME_UNIFORMS = [
  "uRes",
  "uOpenWaveVis",
  "uTime",
  "uLoop",
  "uScrollLoop",
  "uDt",
  "uFirst",
  "uG",
  "uFlatOcean",
  "uBare",
  "uDirDeep",
  "uDirSecond",
  "uCamOrigin",
  "uCamSpan",
  "uPrevOrigin",
  "uPrevSpan",
  "uZc",
  "uOpacity",
  "uPeriodP",
  "uPeriodS",
  "uPeriodC",
  "uOmegaS",
  "uLightDirection",
] as const;
