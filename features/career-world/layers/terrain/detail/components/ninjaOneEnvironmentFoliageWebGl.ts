import type { CameraView } from "../../../../shared/camera";
import type {
  NinjaOneEnvironmentFoliageInstance,
  NinjaOneEnvironmentFoliageResource,
} from "../model/ninjaOneEnvironmentFoliage";

const GRID_COLUMNS = 13;
const GRID_ROWS = 25;
const FLOATS_PER_VERTEX = 9;
const INDICES_PER_INSTANCE = (GRID_ROWS - 1) * (GRID_COLUMNS - 1) * 6;
const TWO_PI = Math.PI * 2;

export const NINJAONE_FOLIAGE_VERTEX_SHADER = `#version 300 es
precision highp float;

in vec2 a_position;
in vec2 a_uv;
in vec2 a_local;
in float a_mainAmplitude;
in float a_phase;
in float a_frequency;

uniform float u_aspect;
uniform vec2 u_cameraOrigin;
uniform vec2 u_cameraSpan;
uniform float u_motionEnabled;
uniform float u_shadowPass;
uniform float u_time;

out float v_branchWeight;
out float v_detailWave;
out vec2 v_uv;

void main() {
  float height = 1.0 - a_local.y;
  float rootLock = smoothstep(0.18, 0.52, height);
  float lateral = abs(a_local.x - 0.5) * 2.0;
  float crown = smoothstep(0.5, 0.94, height);
  float branchWeight = rootLock * smoothstep(0.34, 0.92, lateral)
    * mix(0.62, 1.0, crown);
  float trunkFlex = rootLock * rootLock * crown * crown * 0.12;
  float mainWeight = branchWeight * 0.88 + trunkFlex * 0.35;

  float slowA = 0.5 + 0.5 * sin(u_time * a_frequency + a_phase);
  float slowB = 0.5 + 0.5 * sin(
    u_time * a_frequency * 0.43 + a_phase * 1.71 + 1.2
  );
  float gust = smoothstep(0.18, 0.92, slowA * 0.64 + slowB * 0.36);
  float mainLoad = 0.14 + gust * 0.86;
  float branchLoad = (slowB - 0.5) * 2.0;
  float branchPulse = 0.5 + 0.5 * sin(
    u_time * a_frequency * 0.72
      + a_phase * 0.61
      + a_local.y * 0.38
      + a_local.x * 0.44
  );
  float detailWave = (branchPulse - 0.5) * 2.0;

  vec2 position = vec2(
    (a_position.x - u_cameraOrigin.x) / u_cameraSpan.x * 2.0 - 1.0,
    1.0 - (a_position.y - u_cameraOrigin.y) / u_cameraSpan.y * 2.0
  );
  float mainAmplitude = a_mainAmplitude / u_cameraSpan.x * 2.0;
  if (u_motionEnabled > 0.5) {
    position.x += mainAmplitude * mainLoad * mainWeight;
    position.x += mainAmplitude * branchLoad * branchWeight * 0.11;
    position.y -= mainAmplitude * branchLoad * branchWeight
      * (a_local.x - 0.5) * 0.08 * u_aspect;
  } else {
    detailWave = 0.0;
  }
  if (u_shadowPass > 0.5) {
    position.x += mainAmplitude * 0.28;
    position.y -= mainAmplitude * 0.38 * u_aspect;
  }

  gl_Position = vec4(position, 0.0, 1.0);
  v_branchWeight = branchWeight;
  v_detailWave = detailWave;
  v_uv = a_uv;
}
`;

export const NINJAONE_FOLIAGE_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform sampler2D u_atlas;
uniform float u_shadowPass;

in float v_branchWeight;
in float v_detailWave;
in vec2 v_uv;

out vec4 outColor;

void main() {
  vec4 texel = texture(u_atlas, v_uv);
  if (texel.a < 0.005) discard;
  if (u_shadowPass > 0.5) {
    outColor = vec4(0.008, 0.016, 0.01, texel.a * 0.14);
    return;
  }
  float detailLight = clamp(v_detailWave, -1.0, 1.0) * v_branchWeight;
  vec3 tint = vec3(
    0.995 + detailLight * 0.004,
    0.997 + detailLight * 0.007,
    0.993 + detailLight * 0.003
  );
  outColor = vec4(texel.rgb * tint, texel.a);
}
`;

interface ShaderLocations {
  readonly frequency: number;
  readonly local: number;
  readonly mainAmplitude: number;
  readonly phase: number;
  readonly position: number;
  readonly uv: number;
  readonly aspect: WebGLUniformLocation;
  readonly atlas: WebGLUniformLocation;
  readonly cameraOrigin: WebGLUniformLocation;
  readonly cameraSpan: WebGLUniformLocation;
  readonly motionEnabled: WebGLUniformLocation;
  readonly shadowPass: WebGLUniformLocation;
  readonly time: WebGLUniformLocation;
}

export interface LoadedNinjaOneEnvironmentFoliageAtlas {
  readonly image: HTMLImageElement;
  readonly resource: NinjaOneEnvironmentFoliageResource;
}

interface FoliageDrawBatch {
  readonly indexCount: number;
  readonly indexOffsetBytes: number;
  readonly resourceId: string;
}

const foliageAtlasLoadCache = new Map<
  string,
  Promise<LoadedNinjaOneEnvironmentFoliageAtlas>
>();

function compileShader(
  gl: WebGL2RenderingContext,
  source: string,
  type: number,
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to allocate the foliage shader.");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? "Unknown shader compile error.";
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function createProgram(gl: WebGL2RenderingContext): WebGLProgram {
  const vertex = compileShader(gl, NINJAONE_FOLIAGE_VERTEX_SHADER, gl.VERTEX_SHADER);
  const fragment = compileShader(gl, NINJAONE_FOLIAGE_FRAGMENT_SHADER, gl.FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (!program) throw new Error("Unable to allocate the foliage shader program.");
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) ?? "Unknown shader link error.";
    gl.deleteProgram(program);
    throw new Error(message);
  }
  return program;
}

function uniform(gl: WebGL2RenderingContext, program: WebGLProgram, name: string) {
  const location = gl.getUniformLocation(program, name);
  if (!location) throw new Error(`Missing foliage shader uniform ${name}.`);
  return location;
}

function attribute(gl: WebGL2RenderingContext, program: WebGLProgram, name: string) {
  const location = gl.getAttribLocation(program, name);
  if (location < 0) throw new Error(`Missing foliage shader attribute ${name}.`);
  return location;
}

export class NinjaOneEnvironmentFoliageWebGl {
  readonly #canvas: HTMLCanvasElement;
  readonly #gl: WebGL2RenderingContext;
  readonly #program: WebGLProgram;
  readonly #textures = new Map<string, WebGLTexture>();
  readonly #vertexBuffer: WebGLBuffer;
  readonly #indexBuffer: WebGLBuffer;
  readonly #locations: ShaderLocations;
  #cameraOrigin: CameraView["origin"] = Object.freeze([0, 0]);
  #cameraSpan: CameraView["span"] = Object.freeze([1, 1]);
  #drawBatches: readonly FoliageDrawBatch[] = Object.freeze([]);
  #indexInstanceCount = -1;
  #sceneInstances: readonly NinjaOneEnvironmentFoliageInstance[] | null = null;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: true,
      depth: false,
      powerPreference: "high-performance",
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) throw new Error("WebGL2 is unavailable for native foliage motion.");
    const program = createProgram(gl);
    const vertexBuffer = gl.createBuffer();
    const indexBuffer = gl.createBuffer();
    if (!vertexBuffer || !indexBuffer) {
      throw new Error("Unable to allocate native foliage GPU resources.");
    }
    this.#canvas = canvas;
    this.#gl = gl;
    this.#program = program;
    this.#vertexBuffer = vertexBuffer;
    this.#indexBuffer = indexBuffer;
    this.#locations = {
      frequency: attribute(gl, program, "a_frequency"),
      local: attribute(gl, program, "a_local"),
      mainAmplitude: attribute(gl, program, "a_mainAmplitude"),
      phase: attribute(gl, program, "a_phase"),
      position: attribute(gl, program, "a_position"),
      uv: attribute(gl, program, "a_uv"),
      aspect: uniform(gl, program, "u_aspect"),
      atlas: uniform(gl, program, "u_atlas"),
      cameraOrigin: uniform(gl, program, "u_cameraOrigin"),
      cameraSpan: uniform(gl, program, "u_cameraSpan"),
      motionEnabled: uniform(gl, program, "u_motionEnabled"),
      shadowPass: uniform(gl, program, "u_shadowPass"),
      time: uniform(gl, program, "u_time"),
    };
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  setAtlases(atlases: readonly LoadedNinjaOneEnvironmentFoliageAtlas[]) {
    const gl = this.#gl;
    const selectedIds = new Set(atlases.map(({ resource }) => resource.id));
    for (const [resourceId, texture] of this.#textures) {
      if (selectedIds.has(resourceId)) continue;
      gl.deleteTexture(texture);
      this.#textures.delete(resourceId);
    }
    gl.activeTexture(gl.TEXTURE0);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    for (const { image, resource } of atlases) {
      if (
        image.naturalWidth !== resource.dimensions[0]
        || image.naturalHeight !== resource.dimensions[1]
      ) throw new Error(`Foliage atlas ${resource.id} dimensions do not match its manifest.`);
      const existing = this.#textures.get(resource.id);
      if (existing) continue;
      const texture = gl.createTexture();
      if (!texture) throw new Error(`Unable to allocate foliage texture ${resource.id}.`);
      this.#textures.set(resource.id, texture);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        image,
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
  }

  resize(): boolean {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const bounds = this.#canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width * dpr));
    const height = Math.max(1, Math.round(bounds.height * dpr));
    if (this.#canvas.width === width && this.#canvas.height === height) return false;
    this.#canvas.width = width;
    this.#canvas.height = height;
    this.#gl.viewport(0, 0, width, height);
    return true;
  }

  setCamera(camera: CameraView) {
    this.#cameraOrigin = camera.origin;
    this.#cameraSpan = camera.span;
  }

  setScene(instances: readonly NinjaOneEnvironmentFoliageInstance[]) {
    const previousInstances = this.#sceneInstances;
    let sceneChanged = previousInstances?.length !== instances.length;
    if (previousInstances && !sceneChanged) {
      for (let index = 0; index < instances.length; index += 1) {
        if (previousInstances[index] === instances[index]) continue;
        sceneChanged = true;
        break;
      }
    }
    if (!sceneChanged) return;

    const vertices: number[] = [];
    const indices: number[] = [];
    const rebuildIndices = instances.length !== this.#indexInstanceCount;
    const batches: Array<{
      indexCount: number;
      indexOffset: number;
      resourceId: string;
    }> = [];
    let nextIndexOffset = 0;
    for (const instance of instances) {
      const [atlasWidth, atlasHeight] = instance.atlasResource.dimensions;
      const vertexOffset = vertices.length / FLOATS_PER_VERTEX;
      const [originX, originY] = instance.artboardBounds.origin;
      const [spanX, spanY] = instance.artboardBounds.span;
      const [frameX, frameY, frameWidth, frameHeight] = instance.canopyAtlasRect;
      const mainAmplitude = spanX * (0.05 + instance.bendDegrees * 0.012);
      const frequency = TWO_PI / instance.durationSeconds;
      const phase = instance.phaseSeconds * frequency;
      const previousBatch = batches.at(-1);
      const batch = previousBatch?.resourceId === instance.atlasResource.id
        ? previousBatch
        : {
            indexCount: 0,
            indexOffset: nextIndexOffset,
            resourceId: instance.atlasResource.id,
          };
      if (batch !== previousBatch) batches.push(batch);
      for (let row = 0; row < GRID_ROWS; row += 1) {
        const localY = row / (GRID_ROWS - 1);
        const worldY = originY + spanY * localY;
        const textureY = 1 - (frameY + frameHeight * localY) / atlasHeight;
        for (let column = 0; column < GRID_COLUMNS; column += 1) {
          const localX = column / (GRID_COLUMNS - 1);
          const worldX = originX + spanX * localX;
          const textureX = (frameX + frameWidth * localX) / atlasWidth;
          vertices.push(
            worldX,
            worldY,
            textureX,
            textureY,
            localX,
            localY,
            mainAmplitude,
            phase,
            frequency,
          );
        }
      }
      if (rebuildIndices) {
        for (let row = 0; row < GRID_ROWS - 1; row += 1) {
          for (let column = 0; column < GRID_COLUMNS - 1; column += 1) {
            const upperLeft = vertexOffset + row * GRID_COLUMNS + column;
            const lowerLeft = upperLeft + GRID_COLUMNS;
            indices.push(
              upperLeft,
              lowerLeft,
              upperLeft + 1,
              upperLeft + 1,
              lowerLeft,
              lowerLeft + 1,
            );
          }
        }
      }
      batch.indexCount += INDICES_PER_INSTANCE;
      nextIndexOffset += INDICES_PER_INSTANCE;
    }
    const gl = this.#gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.#vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    if (rebuildIndices) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.#indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
      this.#indexInstanceCount = instances.length;
    }
    this.#drawBatches = Object.freeze(batches.map((batch) => Object.freeze({
      indexCount: batch.indexCount,
      indexOffsetBytes: batch.indexOffset * Uint16Array.BYTES_PER_ELEMENT,
      resourceId: batch.resourceId,
    })));
    this.#sceneInstances = instances;
  }

  draw(timeSeconds: number, motionEnabled: boolean) {
    const gl = this.#gl;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (this.#drawBatches.length === 0) return;
    gl.useProgram(this.#program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.#vertexBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.#indexBuffer);
    const stride = FLOATS_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT;
    const bindAttribute = (location: number, size: number, offset: number) => {
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(
        location,
        size,
        gl.FLOAT,
        false,
        stride,
        offset * Float32Array.BYTES_PER_ELEMENT,
      );
    };
    bindAttribute(this.#locations.position, 2, 0);
    bindAttribute(this.#locations.uv, 2, 2);
    bindAttribute(this.#locations.local, 2, 4);
    bindAttribute(this.#locations.mainAmplitude, 1, 6);
    bindAttribute(this.#locations.phase, 1, 7);
    bindAttribute(this.#locations.frequency, 1, 8);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(this.#locations.atlas, 0);
    gl.uniform1f(this.#locations.aspect, this.#canvas.width / this.#canvas.height);
    gl.uniform2f(
      this.#locations.cameraOrigin,
      this.#cameraOrigin[0],
      this.#cameraOrigin[1],
    );
    gl.uniform2f(
      this.#locations.cameraSpan,
      this.#cameraSpan[0],
      this.#cameraSpan[1],
    );
    gl.uniform1f(this.#locations.motionEnabled, motionEnabled ? 1 : 0);
    gl.uniform1f(this.#locations.time, timeSeconds);
    const drawPass = (shadowPass: boolean) => {
      gl.uniform1f(this.#locations.shadowPass, shadowPass ? 1 : 0);
      for (const batch of this.#drawBatches) {
        const texture = this.#textures.get(batch.resourceId);
        if (!texture) continue;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.drawElements(
          gl.TRIANGLES,
          batch.indexCount,
          gl.UNSIGNED_SHORT,
          batch.indexOffsetBytes,
        );
      }
    };
    drawPass(true);
    drawPass(false);
  }

  destroy() {
    const gl = this.#gl;
    gl.deleteBuffer(this.#vertexBuffer);
    gl.deleteBuffer(this.#indexBuffer);
    for (const texture of this.#textures.values()) gl.deleteTexture(texture);
    this.#textures.clear();
    gl.deleteProgram(this.#program);
  }
}

function loadNinjaOneEnvironmentFoliageAtlas(
  resource: NinjaOneEnvironmentFoliageResource,
): Promise<LoadedNinjaOneEnvironmentFoliageAtlas> {
  const key = `${resource.id}:${resource.sha256}`;
  const cached = foliageAtlasLoadCache.get(key);
  if (cached) return cached;
  const pending = new Promise<LoadedNinjaOneEnvironmentFoliageAtlas>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve({ image, resource });
    image.onerror = () => reject(new Error(`Unable to load ${resource.path}.`));
    image.src = resource.path;
  });
  foliageAtlasLoadCache.set(key, pending);
  pending.catch(() => foliageAtlasLoadCache.delete(key));
  return pending;
}

export function loadNinjaOneEnvironmentFoliageAtlases(
  resources: readonly NinjaOneEnvironmentFoliageResource[],
): Promise<readonly LoadedNinjaOneEnvironmentFoliageAtlas[]> {
  return Promise.all(resources.map(loadNinjaOneEnvironmentFoliageAtlas));
}
