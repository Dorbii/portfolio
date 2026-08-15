import type { CameraView } from "../../../../shared/camera";
import type {
  NinjaOneEnvironmentFoliageInstance,
  NinjaOneEnvironmentFoliageResource,
} from "../model/ninjaOneEnvironmentFoliage";

const GRID_COLUMNS = 13;
const GRID_ROWS = 25;
const FLOATS_PER_VERTEX = 10;
const TWO_PI = Math.PI * 2;

export const NINJAONE_FOLIAGE_VERTEX_SHADER = `#version 300 es
precision highp float;

in vec2 a_position;
in vec2 a_uv;
in vec2 a_local;
in float a_mainAmplitude;
in float a_detailAmplitude;
in float a_phase;
in float a_frequency;

uniform float u_aspect;
uniform float u_motionEnabled;
uniform float u_shadowPass;
uniform float u_time;

out float v_branchWeight;
out float v_detailWave;
out vec2 v_uv;

void main() {
  float height = 1.0 - a_local.y;
  float rootLock = smoothstep(0.1, 0.34, height);
  float lateral = abs(a_local.x - 0.5) * 2.0;
  float crown = smoothstep(0.58, 0.94, height);
  float branchWeight = rootLock * clamp(
    smoothstep(0.18, 0.72, lateral) + crown * 0.55,
    0.0,
    1.0
  );
  float mainWeight = rootLock * rootLock * mix(
    0.12,
    1.0,
    max(lateral, crown * 0.36)
  );

  float slowA = 0.5 + 0.5 * sin(u_time * a_frequency + a_phase);
  float slowB = 0.5 + 0.5 * sin(
    u_time * a_frequency * 0.43 + a_phase * 1.71 + 1.2
  );
  float gust = pow(clamp(slowA * 0.62 + slowB * 0.38, 0.0, 1.0), 1.75);
  float mainLoad = 0.22 + gust * 0.78;
  float detailWave = sin(
    u_time * a_frequency * 2.7
      + a_phase * 1.83
      + a_local.y * 8.1
      + a_local.x * 3.4
  ) + 0.42 * sin(
    u_time * a_frequency * 4.15
      + a_phase * 0.79
      + a_local.y * 13.4
      - a_local.x * 5.2
  );

  vec2 position = a_position;
  if (u_motionEnabled > 0.5) {
    position.x += a_mainAmplitude * mainLoad * mainWeight;
    position.x += a_detailAmplitude * detailWave * branchWeight;
    position.y += a_detailAmplitude * detailWave * 0.16 * branchWeight * u_aspect;
  } else {
    detailWave = 0.0;
  }
  if (u_shadowPass > 0.5) {
    position.x += a_mainAmplitude * 0.28;
    position.y -= a_mainAmplitude * 0.38 * u_aspect;
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
    0.99 + detailLight * 0.012,
    0.995 + detailLight * 0.021,
    0.985 + detailLight * 0.009
  );
  outColor = vec4(texel.rgb * tint, texel.a);
}
`;

interface ShaderLocations {
  readonly detailAmplitude: number;
  readonly frequency: number;
  readonly local: number;
  readonly mainAmplitude: number;
  readonly phase: number;
  readonly position: number;
  readonly uv: number;
  readonly aspect: WebGLUniformLocation;
  readonly atlas: WebGLUniformLocation;
  readonly motionEnabled: WebGLUniformLocation;
  readonly shadowPass: WebGLUniformLocation;
  readonly time: WebGLUniformLocation;
}

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
  readonly #texture: WebGLTexture;
  readonly #vertexBuffer: WebGLBuffer;
  readonly #indexBuffer: WebGLBuffer;
  readonly #locations: ShaderLocations;
  #indexCount = 0;

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
    const texture = gl.createTexture();
    const vertexBuffer = gl.createBuffer();
    const indexBuffer = gl.createBuffer();
    if (!texture || !vertexBuffer || !indexBuffer) {
      throw new Error("Unable to allocate native foliage GPU resources.");
    }
    this.#canvas = canvas;
    this.#gl = gl;
    this.#program = program;
    this.#texture = texture;
    this.#vertexBuffer = vertexBuffer;
    this.#indexBuffer = indexBuffer;
    this.#locations = {
      detailAmplitude: attribute(gl, program, "a_detailAmplitude"),
      frequency: attribute(gl, program, "a_frequency"),
      local: attribute(gl, program, "a_local"),
      mainAmplitude: attribute(gl, program, "a_mainAmplitude"),
      phase: attribute(gl, program, "a_phase"),
      position: attribute(gl, program, "a_position"),
      uv: attribute(gl, program, "a_uv"),
      aspect: uniform(gl, program, "u_aspect"),
      atlas: uniform(gl, program, "u_atlas"),
      motionEnabled: uniform(gl, program, "u_motionEnabled"),
      shadowPass: uniform(gl, program, "u_shadowPass"),
      time: uniform(gl, program, "u_time"),
    };
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  setAtlas(image: HTMLImageElement) {
    const gl = this.#gl;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.#texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
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

  setScene(
    camera: CameraView,
    instances: readonly NinjaOneEnvironmentFoliageInstance[],
    atlas: NinjaOneEnvironmentFoliageResource,
  ) {
    const vertices: number[] = [];
    const indices: number[] = [];
    const [atlasWidth, atlasHeight] = atlas.dimensions;
    for (const instance of instances) {
      const vertexOffset = vertices.length / FLOATS_PER_VERTEX;
      const [originX, originY] = instance.artboardBounds.origin;
      const [spanX, spanY] = instance.artboardBounds.span;
      const [frameX, frameY, frameWidth, frameHeight] = instance.canopyAtlasRect;
      const mainAmplitude = spanX / camera.span[0]
        * 2
        * (0.008 + instance.bendDegrees * 0.0035);
      const detailAmplitude = spanX / camera.span[0]
        * 2
        * (0.014 + instance.lagDegrees * 0.055);
      const frequency = TWO_PI / instance.durationSeconds;
      const phase = instance.phaseSeconds * frequency;
      for (let row = 0; row < GRID_ROWS; row += 1) {
        const localY = row / (GRID_ROWS - 1);
        const worldY = originY + spanY * localY;
        const clipY = 1 - (worldY - camera.origin[1]) / camera.span[1] * 2;
        const textureY = 1 - (frameY + frameHeight * localY) / atlasHeight;
        for (let column = 0; column < GRID_COLUMNS; column += 1) {
          const localX = column / (GRID_COLUMNS - 1);
          const worldX = originX + spanX * localX;
          const clipX = (worldX - camera.origin[0]) / camera.span[0] * 2 - 1;
          const textureX = (frameX + frameWidth * localX) / atlasWidth;
          vertices.push(
            clipX,
            clipY,
            textureX,
            textureY,
            localX,
            localY,
            mainAmplitude,
            detailAmplitude,
            phase,
            frequency,
          );
        }
      }
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
    const gl = this.#gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.#vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.#indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    this.#indexCount = indices.length;
  }

  draw(timeSeconds: number, motionEnabled: boolean) {
    const gl = this.#gl;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (this.#indexCount === 0) return;
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
    bindAttribute(this.#locations.detailAmplitude, 1, 7);
    bindAttribute(this.#locations.phase, 1, 8);
    bindAttribute(this.#locations.frequency, 1, 9);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.#texture);
    gl.uniform1i(this.#locations.atlas, 0);
    gl.uniform1f(this.#locations.aspect, this.#canvas.width / this.#canvas.height);
    gl.uniform1f(this.#locations.motionEnabled, motionEnabled ? 1 : 0);
    gl.uniform1f(this.#locations.time, timeSeconds);
    gl.uniform1f(this.#locations.shadowPass, 1);
    gl.drawElements(gl.TRIANGLES, this.#indexCount, gl.UNSIGNED_SHORT, 0);
    gl.uniform1f(this.#locations.shadowPass, 0);
    gl.drawElements(gl.TRIANGLES, this.#indexCount, gl.UNSIGNED_SHORT, 0);
  }

  destroy() {
    const gl = this.#gl;
    gl.deleteBuffer(this.#vertexBuffer);
    gl.deleteBuffer(this.#indexBuffer);
    gl.deleteTexture(this.#texture);
    gl.deleteProgram(this.#program);
  }
}

export function loadNinjaOneEnvironmentFoliageAtlas(
  resource: NinjaOneEnvironmentFoliageResource,
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load ${resource.path}.`));
    image.src = resource.path;
  });
}
