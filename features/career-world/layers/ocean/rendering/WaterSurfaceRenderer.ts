import type { CameraView } from "../../../shared/camera";
import { DETAIL_POLICY, type DetailState } from "../../../shared/lod";
import type { WorldLight } from "../../../shared/lighting";
import {
  createTexture,
  linkProgram,
  loadImage,
} from "../../../shared/water/webgl";
import { OCEAN_FIELD_ASSETS, OCEAN_FIELD_DIMENSIONS } from "../model/assets";
import {
  OCEAN_FAMILIES,
  OCEAN_LOOP_SECONDS,
  OCEAN_PASS_STATES,
  OCEAN_PASS_UNIFORM_TYPES,
  OCEAN_SCREEN_TO_TUNED,
  OCEAN_TUNED_PER_WORLD,
  OCEAN_TUNED_TO_SCREEN,
  type OceanPassName,
  type OceanUniformValue,
} from "../model/generated/oceanStates";
import {
  normalizeWaterSurfaceState,
  readWaterSurfaceUrlOverrides,
  type WaterSurfaceState,
} from "../model/state";
import {
  OCEAN_COMPOSITE_SHADER,
  OCEAN_FOAM_SHADER,
  OCEAN_SPRAY_SHADER,
  OCEAN_VERTEX_SHADER,
  OCEAN_WAVE_SHADER,
} from "./shaders/generated";

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
const UNIT = Object.freeze({
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
const PASS_SAMPLERS: Partial<Record<OceanPassName, Record<string, number>>> =
  Object.freeze({
    foam: { texPrev: UNIT.texFoam },
    spray: { texPrev: UNIT.texSpray },
  });

/**
 * Ceiling on the simulation buffers. Eight RGBA16F targets at eight bytes a
 * pixel is 64 bytes per pixel of viewport, so an uncapped 4K canvas would ask
 * for over half a gigabyte. Capping the water's pixel ratio rather than
 * splitting the passes across two resolutions keeps `uv` meaning one thing
 * everywhere, which matters because the composite reads neighbouring texels of
 * the wave targets to band-limit its shading normals.
 */
const SIM_MAX_PIXELS = 2_000_000;

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
      preserveDrawingBuffer: false,
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

    return new WaterSurfaceRenderer(canvas, gl, light, {
      // NEAREST is not an optimisation here, it is correctness: the red and
      // green channels are the high and low bytes of one 16-bit phase residual,
      // and hardware bilinear would interpolate them independently. The shader
      // decodes four texels and interpolates the decoded values.
      texPhase: createTexture(gl, phase, "clamp", "nearest"),
      texFlowField: createTexture(gl, flow, "clamp", "linear"),
      texNoise: createTexture(gl, noise, "repeat"),
      texNoiseF: createTexture(gl, noiseFine, "repeat"),
    });
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
      for (const uniformName of Object.keys(UNIT)) record(uniformName);
      for (const uniformName of Object.keys(PASS_SAMPLERS[name] ?? {})) {
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
    const time = (elapsedSeconds * this.state.timeScale) % OCEAN_LOOP_SECONDS;
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
    this.usePass("spray", size, time, dt);
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
      gl.activeTexture(gl.TEXTURE0 + UNIT[name as keyof typeof UNIT]);
      gl.bindTexture(gl.TEXTURE_2D, texture);
    }
    for (const [pass, { program, uniforms }] of this.passes.entries()) {
      gl.useProgram(program);
      for (const [name, unit] of Object.entries(UNIT)) {
        const location = uniforms.get(name);
        if (location) gl.uniform1i(location, unit);
      }
      for (const [name, unit] of Object.entries(PASS_SAMPLERS[pass] ?? {})) {
        const location = uniforms.get(name);
        if (location) gl.uniform1i(location, unit);
      }
    }
  }

  private bindTarget(
    name: keyof typeof UNIT,
    texture: WebGLTexture | null,
  ): void {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + UNIT[name]);
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
    const waveDetail = smoothstep(8, 22, lamP);
    this.openWaveVis = waveDetail;
    // The detail-wave family is a separate, shorter train drawn for shading
    // only, so it needs its own answer to the same question.
    const detailWave = smoothstep(
      8,
      22,
      weatherLerp(OCEAN_PASS_STATES.composite, "uDetailLam", this.state.weather, 0) * zc,
    );
    const fade: Readonly<Record<string, number>> = {
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
      // The floor is what draws a stroke on every crest whether or not it is
      // doing anything, so it is the single biggest contributor to the hatching
      // and has to reach zero, not just fade.
      uCrestLineFloor: line * line,
      uCrossTrain: line,
      uLaceLineGain: line,
      uWispGain: line,
      uStreakGain: line,
      uChopCrest: line,
      uChopGlint: line,
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
        const gain = fade[uniformName] ?? 1;
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
    set1("uG", TUNED_G);
    set1("uFlatOcean", 0);
    set1("uBare", new URLSearchParams(window.location.search).has("water.bare") ? 1 : 0);
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
    const requested = Math.min(
      (window.devicePixelRatio || 1) * this.renderScale,
      DETAIL_POLICY.renderScale.maximumAnimatedWaterDevicePixelRatio,
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

    const target = (): WebGLTexture => {
      const texture = gl.createTexture();
      if (!texture) throw new Error("WebGL could not allocate a water target.");
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA16F,
        width,
        height,
        0,
        gl.RGBA,
        gl.HALF_FLOAT,
        null,
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      return texture;
    };

    const targets = {
      geom: target(),
      flow: target(),
      swell: target(),
      path: target(),
      foam: [target(), target()] as [WebGLTexture, WebGLTexture],
      spray: [target(), target()] as [WebGLTexture, WebGLTexture],
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
const RUNTIME_UNIFORMS = [
  "uRes",
  "uOpenWaveVis",
  "uTime",
  "uLoop",
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
