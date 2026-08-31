import { decodeImage } from "../../../shared/assets/decodeImage";
import { createTexture, linkProgram } from "../../../shared/water/webgl";
import type { NinjaOneCapitalD05WaterEffectTuning } from "../model/ninjaOneCapitalD05Concept";

const EFFECT_FRAME_INTERVAL_MS = 1000 / 15;
const TIMING_SAMPLE_LIMIT = 120;

export type NinjaOneCapitalD05WaterEffects = {
  readonly sourcePath: string;
  readonly waterMaskPath: string;
  readonly dimensions: readonly [number, number];
  readonly fieldDimensions: readonly [number, number];
  readonly sparkle: { readonly maskPath: string; readonly phaseFieldPath: string };
  readonly foam: { readonly maskPath: string; readonly shoreSdfPath: string };
  readonly crest: { readonly maskPath: string; readonly directionFieldPath: string; readonly pseudoNormalFieldPath: string; readonly rampLutPath: string; readonly wavePhaseFieldPath: string };
};

const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() { v_uv = a_position * 0.5 + 0.5; gl_Position = vec4(a_position, 0.0, 1.0); }`;

// A single whole-frame draw replaces the r4 canvas tiles. No partial upload or
// camera-dependent culling remains for a transformed SVG foreignObject to break.
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 out_color;
uniform sampler2D u_source, u_water, u_sparkle, u_sparkle_phase, u_foam, u_sdf, u_crest, u_direction, u_wave_phase, u_normal, u_ramp;
uniform float u_time, u_sparkle_amount, u_foam_amount, u_crest_amount, u_relight_amount, u_cycling_amount, u_swell_amount, u_zoom_weight, u_city_water_opacity, u_city_water_shore_ramp, u_mask_feather;
uniform vec2 u_source_uv_offset, u_source_uv_scale;
const float TAU = 6.28318530718;
float smoothBand(float edge0, float edge1, float value) { float t = clamp((value - edge0) / (edge1 - edge0), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
float hash21(vec2 point) { point = fract(point * vec2(123.34, 456.21)); point += dot(point, point + 45.32); return fract(point.x * point.y); }
// This is a filled, irregular ellipse rather than a distance-to-cell-edge band.
// Its center is hashed per cell; cell edges never contribute coverage.
float filledStamp(vec2 point, vec2 center, vec2 direction, vec2 radii, float seed) {
  vec2 delta = point - center;
  vec2 forward = normalize(direction + vec2(0.0001, 0.0001));
  vec2 side = vec2(-forward.y, forward.x);
  vec2 local = vec2(dot(delta, forward) / radii.x, dot(delta, side) / radii.y);
  float angle = atan(local.y, local.x);
  float irregularity = 0.075 * sin(angle * (3.0 + floor(seed * 3.0)) + seed * TAU);
  float radius = length(local) + irregularity;
  return 1.0 - smoothBand(0.58, 1.0, radius);
}
void main() {
  vec4 source = texture(u_source, u_source_uv_offset + v_uv * u_source_uv_scale);
  // Keep the composited result byte-identical outside the binary water field;
  // bilinear edge coverage is not permitted to spill an effect onto land.
  float waterField = texture(u_water, v_uv).r;
  float water = step(0.003, waterField);
  if (u_mask_feather > 0.5) {
    // The close effect field is lower resolution than the derived close
    // canon. Keep the exterior hard-zero, but feather inward by the sampled
    // footprint so a mask texel cannot become a visible rectangular alpha
    // block after the SVG scales the canvas.
    water = smoothBand(0.5, 0.5 + max(fwidth(waterField) * 1.5, 0.001), waterField);
  }
  if (water < 0.5) discard;
  vec3 sparklePhase = texture(u_sparkle_phase, v_uv).rgb;
  vec3 normal = texture(u_normal, v_uv).rgb;
  vec2 direction = texture(u_direction, v_uv).rg * 2.0 - 1.0;
  float phase = texture(u_wave_phase, v_uv).r + dot(direction, vec2(0.013, -0.009));
  float wave = sin(TAU * (phase - u_time / 6.5));
  float distance = (texture(u_sdf, v_uv).r * 255.0 - 128.0) * 0.5;
  float shoreWeight = 1.0 - smoothBand(8.0, 32.0, distance);
  // P2 keeps the conservative classifier mask as the hard no-land boundary.
  // The optional SDF ramp protects composed contact detail as paint fades seaward.
  float shoreRampWeight = 1.0 - smoothBand(6.0, mix(32.0, 192.0, u_city_water_shore_ramp), distance);
  float paintAlpha = mix(u_city_water_opacity, mix(u_city_water_opacity, 1.0, shoreRampWeight), u_city_water_shore_ramp);
  float shoreOwnerWeight = 1.0 - smoothBand(0.0, 18.0, distance);
  if (u_mask_feather > 0.5) {
    // fwidth supplies an analytic half-pixel transition over the bilinear
    // SDF, preserving the shore band while removing close-up block edges.
    float sdfFeather = max(fwidth(distance), 0.75);
    shoreOwnerWeight = 1.0 - smoothBand(-sdfFeather, 18.0 + sdfFeather, distance);
  }
  float carrier = max(texture(u_crest, v_uv).r * 0.62, normal.b * 0.74);
  float normalLight = 0.9 + 0.1 * ((normal.r * 2.0 - 1.0) * 0.7 - (normal.g * 2.0 - 1.0) * 0.3);
  float relight = carrier * shoreWeight * (0.14 + 0.15 * (wave + 1.0) * 0.5) * normalLight * u_relight_amount * u_crest_amount * u_zoom_weight;
  float sourceLuma = dot(source.rgb, vec3(0.2126, 0.7152, 0.0722));
  float rampIndex = clamp(sourceLuma + wave * 0.082 * shoreWeight * u_cycling_amount * u_zoom_weight, 0.0, 1.0);
  float cycleMix = carrier * shoreWeight * 0.88 * u_cycling_amount * u_zoom_weight;
  vec3 color = mix(source.rgb, texture(u_ramp, vec2(rampIndex, 0.5)).rgb, cycleMix) * (1.0 + relight);
  float sparkleLift = 0.0;
  float sparkleMask = texture(u_sparkle, v_uv).r;
  if (sparkleMask > 0.004) {
    float period = 1.13 + sparklePhase.g * 2.71;
    float duty = 0.30 + sparklePhase.b * 0.20;
    float sparkleTime = fract(u_time / period + sparklePhase.r);
    float life = sparkleTime < duty ? pow(sin(3.14159265359 * sparkleTime / duty), 1.7) * sparkleMask : 0.0;
    sparkleLift = life * 0.40 * u_sparkle_amount;
    color += vec3(sparkleLift);
  }
  // The canonical paint remains the sea. Travelling overlays are discrete,
  // filled stamps sampled from that paint -- never SDF contour bands or rings.
  float regionalPhase = texture(u_wave_phase, v_uv).r;
  float offshore = 1.0 - shoreWeight;
  float trainPeriod = mix(0.85 + regionalPhase * 0.45, 3.0 + regionalPhase * 1.2, offshore);
  vec2 crestGrid = mix(vec2(20.0, 14.0), vec2(16.0, 11.0), offshore);
  vec2 crestCell = floor(v_uv * crestGrid);
  float crestSeed = hash21(crestCell + 11.7);
  vec2 crestCenter = (crestCell + vec2(0.28 + hash21(crestCell + 2.1) * 0.44, 0.28 + hash21(crestCell + 6.4) * 0.44)) / crestGrid;
  crestCenter += normalize(direction + vec2(0.0001, 0.0001)) * (fract(u_time / trainPeriod + crestSeed) - 0.5) * 0.12 / crestGrid.x;
  float crestShape = filledStamp(v_uv, crestCenter, direction, vec2(0.42, 0.06) / crestGrid, crestSeed);
  vec2 crestMaterialUv = fract(crestCenter * vec2(1.713, 1.371) + vec2(crestSeed, hash21(crestCell + 19.2)) + (v_uv - crestCenter) * vec2(9.0, 3.0));
  float crestMaterial = max(max(texture(u_crest, crestMaterialUv + vec2(-0.003, 0.0)).r, texture(u_crest, crestMaterialUv).r), max(texture(u_crest, crestMaterialUv + vec2(0.003, 0.0)).r, max(texture(u_crest, crestMaterialUv + vec2(0.0, -0.003)).r, texture(u_crest, crestMaterialUv + vec2(0.0, 0.003)).r)));
  float sampledPaint = dot(texture(u_source, crestMaterialUv).rgb, vec3(0.2126, 0.7152, 0.0722));
  float crestStamp = crestShape * max(smoothBand(0.04, 0.22, crestMaterial), smoothBand(0.10, 0.50, sampledPaint) * 0.72);
  float fartherTierLift = 1.0 + (1.0 - u_zoom_weight) * 1.8;
  float swellCrest = crestStamp * (0.17 + offshore * 0.10) * u_swell_amount * fartherTierLift;
  color += vec3(swellCrest);
  vec2 foamGrid = vec2(30.0, 20.0);
  vec2 foamCell = floor(v_uv * foamGrid);
  float foamSeed = hash21(foamCell + 37.9);
  vec2 foamCenter = (foamCell + vec2(0.24 + hash21(foamCell + 4.8) * 0.52, 0.24 + hash21(foamCell + 8.3) * 0.52)) / foamGrid;
  foamCenter += normalize(direction + vec2(0.0001, 0.0001)) * (fract(u_time / (0.72 + foamSeed * 0.8) + foamSeed) - 0.5) * 0.10 / foamGrid.x;
  float foamShape = filledStamp(v_uv, foamCenter, direction, vec2(0.20, 0.10) / foamGrid, foamSeed);
  vec2 foamMaterialUv = fract(foamCenter * vec2(1.191, 1.827) + vec2(foamSeed, hash21(foamCell + 27.4)) + (v_uv - foamCenter) * vec2(6.0, 5.0));
  float foamMaterial = max(smoothBand(0.03, 0.17, texture(u_foam, foamMaterialUv).r), smoothBand(0.10, 0.50, dot(texture(u_source, foamMaterialUv).rgb, vec3(0.2126, 0.7152, 0.0722))) * 0.68);
  float foamStamp = foamShape * foamMaterial;
  float foamEnergy = max(foamStamp * shoreWeight * 0.84, crestStamp * shoreWeight * 0.26) * u_foam_amount * u_zoom_weight;
  float foam = min(0.95, foamEnergy);
  color = max(color, mix(color, vec3(0.831, 0.914, 0.945), foam));
  float energy = max(max(max(relight + cycleMix, sparkleLift), foamEnergy), swellCrest);
  // The painted carrier and shore-owned crash band are two separate alpha
  // layers. In r6b they shared one alpha, so partial carrier opacity leaked
  // source paint wherever an animated stamp was present. Premultiplied
  // composition makes the effect independent of the paint at every 0..1
  // setting; only the narrow SDF shore-owner band survives opacity zero.
  float shoreEffectAlpha = clamp(energy * 3.2, 0.0, 1.0) * shoreOwnerWeight;
  vec3 shoreEffectColor = mix(
    vec3(0.184, 0.408, 0.500) * (1.0 + relight * 1.8),
    vec3(0.831, 0.914, 0.945),
    foam
  );
  float combinedAlpha = paintAlpha + shoreEffectAlpha * (1.0 - paintAlpha);
  vec3 combinedColor = combinedAlpha > 0.0001
    ? (shoreEffectColor * shoreEffectAlpha + clamp(color, 0.0, 1.0) * paintAlpha * (1.0 - shoreEffectAlpha)) / combinedAlpha
    : vec3(0.0);
  out_color = vec4(combinedColor, water * combinedAlpha);
}`;

type SourceRegistration = {
  readonly maskFeather: number;
  readonly offset: readonly [number, number];
  readonly scale: readonly [number, number];
};

type TextureBinding = { readonly texture: WebGLTexture; readonly unit: number };
type SourceTextureBinding = TextureBinding & { readonly registration: SourceRegistration };
type TimerQuery = { readonly query: WebGLQuery; readonly wallMs: number };
type TimerQueryExtension = { readonly TIME_ELAPSED_EXT: number; readonly GPU_DISJOINT_EXT: number };

function percentile95(values: readonly number[]) {
  if (!values.length) return 0;
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.min(ordered.length - 1, Math.floor(ordered.length * 0.95))];
}

function sourceRegistration(
  image: HTMLImageElement,
  fieldDimensions: readonly [number, number],
): SourceRegistration {
  const [fieldWidth, fieldHeight] = fieldDimensions;
  // The canonical close derivative is 2621x2419 while its registered effect
  // field is 1305x1205. Its two-pixel pyramid margins must be center-cropped
  // before a field UV samples it; capital/site have zero offset and scale 1.
  const xScale = Math.max(1, Math.round(image.naturalWidth / fieldWidth));
  const yScale = Math.max(1, Math.round(image.naturalHeight / fieldHeight));
  const contentWidth = Math.min(image.naturalWidth, fieldWidth * xScale);
  const contentHeight = Math.min(image.naturalHeight, fieldHeight * yScale);
  return Object.freeze({
    maskFeather: xScale > 1 || yScale > 1 ? 1 : 0,
    offset: Object.freeze([
      (image.naturalWidth - contentWidth) / image.naturalWidth / 2,
      (image.naturalHeight - contentHeight) / image.naturalHeight / 2,
    ] as const),
    scale: Object.freeze([
      contentWidth / image.naturalWidth,
      contentHeight / image.naturalHeight,
    ] as const),
  });
}

export class NinjaOneCapitalD05WaterCompositeRenderer {
  static async create(canvas: HTMLCanvasElement, effects: NinjaOneCapitalD05WaterEffects) {
    const gl = canvas.getContext("webgl2", { alpha: true, antialias: false, depth: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: "high-performance" });
    if (!gl) throw new Error("WebGL2 is unavailable for the D05 water composite.");
    const program = linkProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
    const paths = [effects.sourcePath, effects.waterMaskPath, effects.sparkle.maskPath, effects.sparkle.phaseFieldPath, effects.foam.maskPath, effects.foam.shoreSdfPath, effects.crest.maskPath, effects.crest.directionFieldPath, effects.crest.wavePhaseFieldPath, effects.crest.pseudoNormalFieldPath, effects.crest.rampLutPath];
    const images = await Promise.all(paths.map(decodeImage));
    const textures = images.map((image, unit) => ({ texture: createTexture(gl, image, "clamp"), unit }));
    return new NinjaOneCapitalD05WaterCompositeRenderer(
      canvas,
      gl,
      program,
      textures,
      sourceRegistration(images[0], effects.fieldDimensions),
      effects.fieldDimensions,
    );
  }

  private readonly buffer: WebGLBuffer;
  private readonly uniforms: Record<string, WebGLUniformLocation>;
  private readonly timerExtension: TimerQueryExtension | null;
  private readonly pendingQueries: TimerQuery[] = [];
  private readonly renderSamples: number[] = [];
  private readonly frameIntervals: number[] = [];
  private pendingSourceTexture: SourceTextureBinding | null = null;
  private sourceRequest = 0;
  private animationFrame = 0;
  private lastRenderAt = -Infinity;
  private lastPresentedAt = 0;
  private epoch = performance.now();
  private active = false;
  private destroyed = false;
  private tuning: NinjaOneCapitalD05WaterEffectTuning | null = null;
  private motionEnabled = false;
  private reducedMotion = false;
  private zoomWeight = 1;
  private sourceRegistration: SourceRegistration;

  private constructor(private readonly canvas: HTMLCanvasElement, private readonly gl: WebGL2RenderingContext, private readonly program: WebGLProgram, private readonly textures: TextureBinding[], sourceRegistration: SourceRegistration, private readonly fieldDimensions: readonly [number, number]) {
    const buffer = gl.createBuffer();
    if (!buffer) throw new Error("WebGL could not allocate the D05 water quad.");
    this.buffer = buffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "a_position");
    if (position < 0) throw new Error("D05 water shader is missing a_position.");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const names = ["u_source", "u_water", "u_sparkle", "u_sparkle_phase", "u_foam", "u_sdf", "u_crest", "u_direction", "u_wave_phase", "u_normal", "u_ramp", "u_time", "u_sparkle_amount", "u_foam_amount", "u_crest_amount", "u_relight_amount", "u_cycling_amount", "u_swell_amount", "u_zoom_weight", "u_city_water_opacity", "u_city_water_shore_ramp", "u_mask_feather", "u_source_uv_offset", "u_source_uv_scale"];
    this.uniforms = Object.fromEntries(names.map((name) => { const location = gl.getUniformLocation(program, name); if (!location) throw new Error(`D05 water shader is missing ${name}.`); return [name, location]; }));
    this.timerExtension = gl.getExtension("EXT_disjoint_timer_query_webgl2") as TimerQueryExtension | null;
    this.sourceRegistration = sourceRegistration;
    this.publishSourceRegistration();
    canvas.dataset.effectFrameRateCap = "15";
    canvas.dataset.effectRenderBudgetMs = "2 avg / 6 p95";
    canvas.dataset.effectPassScope = "full-canon";
    canvas.dataset.effectDrawCount = "1";
    canvas.dataset.effectTextureCount = String(textures.length);
    canvas.dataset.effectTimingSource = this.timerExtension ? "gpu-timer-query" : "cpu-wall";
    canvas.dataset.effectTextureSwap = "staged-fresh-texture-at-draw-boundary";
  }

  async replaceSource(sourcePath: string) {
    const request = ++this.sourceRequest;
    const image = await decodeImage(sourcePath);
    const texture = createTexture(this.gl, image, "clamp");
    if (this.destroyed || request !== this.sourceRequest) {
      this.gl.deleteTexture(texture);
      return;
    }
    // Upload completes on a fresh object outside the draw function. The next
    // frame installs it before binding any sampler, never halfway through one.
    if (this.pendingSourceTexture) this.gl.deleteTexture(this.pendingSourceTexture.texture);
    this.pendingSourceTexture = {
      texture,
      unit: 0,
      registration: sourceRegistration(image, this.fieldDimensions),
    };
    this.canvas.dataset.effectSourceState = "staged";
  }

  setState({ motionEnabled, reducedMotion, tuning, zoomWeight }: { readonly motionEnabled: boolean; readonly reducedMotion: boolean; readonly tuning: NinjaOneCapitalD05WaterEffectTuning; readonly zoomWeight: number }) {
    this.motionEnabled = motionEnabled;
    this.reducedMotion = reducedMotion;
    this.tuning = tuning;
    this.zoomWeight = zoomWeight;
    if (!this.active || this.destroyed) return;
    this.render(performance.now());
    if (motionEnabled && !reducedMotion && zoomWeight > 0 && !this.animationFrame) {
      this.animationFrame = requestAnimationFrame(this.tick);
    }
  }

  start() {
    if (this.destroyed || this.active) return;
    this.active = true;
    this.epoch = performance.now();
    this.render(this.epoch);
    if (this.motionEnabled && !this.reducedMotion && this.zoomWeight > 0) {
      this.animationFrame = requestAnimationFrame(this.tick);
    }
  }

  stop() {
    this.active = false;
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    this.animationFrame = 0;
  }

  clear() {
    if (this.destroyed) return;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  destroy() {
    this.stop();
    this.destroyed = true;
    this.pendingQueries.forEach(({ query }) => this.gl.deleteQuery(query));
    if (this.pendingSourceTexture) this.gl.deleteTexture(this.pendingSourceTexture.texture);
    this.textures.forEach(({ texture }) => this.gl.deleteTexture(texture));
    this.gl.deleteBuffer(this.buffer);
    this.gl.deleteProgram(this.program);
  }

  private readonly tick = (now: number) => {
    this.animationFrame = 0;
    if (!this.active || this.destroyed || !this.motionEnabled || this.reducedMotion || this.zoomWeight <= 0) return;
    if (now - this.lastRenderAt >= EFFECT_FRAME_INTERVAL_MS) { this.lastRenderAt = now; this.render(now); }
    this.animationFrame = requestAnimationFrame(this.tick);
  };

  private render(now: number) {
    const tuning = this.tuning;
    if (!tuning || this.zoomWeight <= 0) { this.clear(); return; }
    const gl = this.gl;
    this.swapPreparedSourceTexture();
    this.pollTimerQueries();
    const wallStart = performance.now();
    let query: WebGLQuery | null = null;
    if (this.timerExtension) { query = gl.createQuery(); if (query) gl.beginQuery(this.timerExtension.TIME_ELAPSED_EXT, query); }
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    this.textures.forEach(({ texture, unit }) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, texture); });
    ["u_source", "u_water", "u_sparkle", "u_sparkle_phase", "u_foam", "u_sdf", "u_crest", "u_direction", "u_wave_phase", "u_normal", "u_ramp"].forEach((name, unit) => gl.uniform1i(this.uniforms[name], unit));
    const effectMotion = this.motionEnabled && !this.reducedMotion ? 1 : 0;
    gl.uniform1f(this.uniforms.u_time, effectMotion ? (now - this.epoch) / 1000 : 0);
    gl.uniform1f(this.uniforms.u_sparkle_amount, tuning.sparkle * effectMotion);
    gl.uniform1f(this.uniforms.u_foam_amount, tuning.foam * effectMotion);
    gl.uniform1f(this.uniforms.u_crest_amount, tuning.crest * effectMotion);
    gl.uniform1f(this.uniforms.u_relight_amount, tuning.relight * effectMotion);
    gl.uniform1f(this.uniforms.u_cycling_amount, tuning.cycling * effectMotion);
    gl.uniform1f(this.uniforms.u_swell_amount, tuning.swell * effectMotion);
    gl.uniform1f(this.uniforms.u_zoom_weight, this.zoomWeight);
    gl.uniform1f(this.uniforms.u_city_water_opacity, tuning.cityWaterOpacity);
    gl.uniform1f(this.uniforms.u_city_water_shore_ramp, tuning.cityWaterShoreRamp);
    gl.uniform1f(this.uniforms.u_mask_feather, this.sourceRegistration.maskFeather);
    gl.uniform2fv(this.uniforms.u_source_uv_offset, this.sourceRegistration.offset);
    gl.uniform2fv(this.uniforms.u_source_uv_scale, this.sourceRegistration.scale);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    const wallMs = performance.now() - wallStart;
    if (query && this.timerExtension) { gl.endQuery(this.timerExtension.TIME_ELAPSED_EXT); this.pendingQueries.push({ query, wallMs }); }
    else this.recordTiming(wallMs, now);
    this.canvas.dataset.effectRenderedTileCount = "0";
    this.canvas.dataset.effectRenderedPixelCount = String(this.canvas.width * this.canvas.height);
  }

  private swapPreparedSourceTexture() {
    if (!this.pendingSourceTexture) return;
    const previous = this.textures[0];
    this.textures[0] = this.pendingSourceTexture;
    this.sourceRegistration = this.pendingSourceTexture.registration;
    this.pendingSourceTexture = null;
    this.gl.deleteTexture(previous.texture);
    this.publishSourceRegistration();
    this.canvas.dataset.effectSourceState = "ready";
  }

  private publishSourceRegistration() {
    const { maskFeather, offset, scale } = this.sourceRegistration;
    this.canvas.dataset.effectSourceRegistration = [
      `offset:${offset.map((value) => value.toFixed(6)).join(",")}`,
      `scale:${scale.map((value) => value.toFixed(6)).join(",")}`,
      `maskFeather:${maskFeather}`,
    ].join(";");
  }

  private pollTimerQueries() {
    const gl = this.gl;
    const ext = this.timerExtension;
    if (!ext) return;
    while (this.pendingQueries.length) {
      const pending = this.pendingQueries[0];
      if (!(gl.getQueryParameter(pending.query, gl.QUERY_RESULT_AVAILABLE) as boolean)) break;
      this.pendingQueries.shift();
      const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT) as boolean;
      const elapsedNs = gl.getQueryParameter(pending.query, gl.QUERY_RESULT) as number;
      gl.deleteQuery(pending.query);
      this.recordTiming(disjoint ? pending.wallMs : elapsedNs / 1_000_000, performance.now());
    }
  }

  private recordTiming(durationMs: number, now: number) {
    this.renderSamples.push(durationMs);
    if (this.lastPresentedAt) this.frameIntervals.push(now - this.lastPresentedAt);
    this.lastPresentedAt = now;
    if (this.renderSamples.length > TIMING_SAMPLE_LIMIT) this.renderSamples.shift();
    if (this.frameIntervals.length > TIMING_SAMPLE_LIMIT) this.frameIntervals.shift();
    this.canvas.dataset.renderAverageMs = (this.renderSamples.reduce((sum, value) => sum + value, 0) / this.renderSamples.length).toFixed(2);
    this.canvas.dataset.renderP95Ms = percentile95(this.renderSamples).toFixed(2);
    this.canvas.dataset.frameIntervalP95Ms = percentile95(this.frameIntervals).toFixed(2);
  }
}
