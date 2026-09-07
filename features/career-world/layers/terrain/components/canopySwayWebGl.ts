// THE CANOPY SWAY PASS — the land's conifer crowns moving in the wind, drawn
// from the BAKED land pixels (owner 2026-09-07: the foliage animation before
// the city; the plan: "canopy sway from the crown masks … no regeneration, no
// sprites"). For every resident site-tier land tile the pass draws a quad
// over the tile's screen rectangle, and for each pixel reads the tile's SWAY
// FIELD (sway-field.mjs: R the weight up the crown, G the crown's height, B a
// phase per crown, A the coverage — the crown and a soft ring round it) and
// samples the land texture displaced downwind by that weight, so a crown's
// top swings while its foot stays rooted and the ground beside it barely
// stirs. Pixels outside the coverage are discarded: the static land shows
// through untouched. The pass never edits the terrain canvas; it rides over
// it with the same camera mapping.
import type { CameraView, Pair } from "../../../shared/camera";

export interface CanopySwayTile {
  readonly key: string;
  readonly image: HTMLImageElement;
  readonly swayPath: string;
  readonly worldBounds: CameraView;
}

export interface CanopySwayFrame {
  readonly tiles: readonly CanopySwayTile[];
  readonly opacity: number;
  readonly camera: CameraView;
  readonly wind: Pair;
  readonly motion: number;
  readonly timeSeconds: number;
}

const VERTEX_SHADER = `#version 300 es
precision highp float;
in vec2 a_position;
in vec2 a_uv;
out vec2 v_uv;
void main() {
  v_uv = a_uv;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_land;
uniform sampler2D u_sway;
uniform vec2 u_texel;      // one land texel in uv
uniform vec2 u_wind;       // unit vector, texture space (y down)
uniform float u_motion;    // the world's wind motion 0..1
uniform float u_time;      // seconds
uniform float u_opacity;
in vec2 v_uv;
out vec4 outColor;
void main() {
  vec4 field = texture(u_sway, v_uv);
  if (field.a < 0.01) discard;
  float weight = field.r;                 // 0 at the crown's foot, 1 at its top
  float height = field.g * 510.0;         // the crown's height in land texels
  float phase = field.b * 6.2831853;
  // a tall pine swings slowly, a sapling flutters
  float rate = 2.6 / (1.0 + height / 36.0);
  float swing = 0.65 * sin(u_time * rate + phase)
    + 0.35 * sin(u_time * rate * 2.31 + phase * 1.7 + v_uv.y * 9.0);
  // gusts roll across the tile, so neighbours do not all lean at once
  float gust = 0.5 + 0.5 * sin(u_time * 0.29 + phase * 0.4 + (v_uv.x * u_wind.x + v_uv.y * u_wind.y) * 5.0);
  float amplitude = clamp(0.05 * height, 0.8, 5.0) * u_motion;
  vec2 shift = u_wind * amplitude * weight * swing * (0.4 + 0.6 * gust);
  shift.y *= 0.35;
  vec4 land = texture(u_land, v_uv - shift * u_texel);
  float alpha = land.a * field.a * u_opacity;
  outColor = vec4(land.rgb * alpha, alpha);
}
`;

interface TileTextures {
  land: WebGLTexture;
  sway: WebGLTexture | null;
  swayState: "loading" | "ready" | "missing";
  swayImage: HTMLImageElement | null;
  lastUsedAt: number;
}

const EVICT_AFTER_MS = 4000;

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to allocate the canopy sway shader.");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? "Unknown shader compile error.";
    gl.deleteShader(shader);
    throw new Error(`Canopy sway shader failed to compile: ${message}`);
  }
  return shader;
}

function uploadImage(gl: WebGL2RenderingContext, image: HTMLImageElement): WebGLTexture {
  const texture = gl.createTexture();
  if (!texture) throw new Error("Unable to allocate a canopy sway texture.");
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
}

export interface CanopySwayRenderer {
  /** Draws one frame; returns the number of tiles drawn. */
  draw(frame: CanopySwayFrame, width: number, height: number): number;
  clear(): void;
  dispose(): void;
}

export function createCanopySwayRenderer(gl: WebGL2RenderingContext): CanopySwayRenderer {
  const program = gl.createProgram();
  if (!program) throw new Error("Unable to allocate the canopy sway program.");
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) ?? "Unknown link error.";
    throw new Error(`Canopy sway program failed to link: ${message}`);
  }
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  const attributes = {
    position: gl.getAttribLocation(program, "a_position"),
    uv: gl.getAttribLocation(program, "a_uv"),
  };
  const uniform = (name: string) => {
    const location = gl.getUniformLocation(program, name);
    if (!location) throw new Error(`Canopy sway uniform ${name} is missing.`);
    return location;
  };
  const uniforms = {
    land: uniform("u_land"),
    sway: uniform("u_sway"),
    texel: uniform("u_texel"),
    wind: uniform("u_wind"),
    motion: uniform("u_motion"),
    time: uniform("u_time"),
    opacity: uniform("u_opacity"),
  };
  const buffer = gl.createBuffer();
  const vao = gl.createVertexArray();
  if (!buffer || !vao) throw new Error("Unable to allocate the canopy sway geometry.");
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(attributes.position);
  gl.vertexAttribPointer(attributes.position, 2, gl.FLOAT, false, 16, 0);
  gl.enableVertexAttribArray(attributes.uv);
  gl.vertexAttribPointer(attributes.uv, 2, gl.FLOAT, false, 16, 8);
  gl.bindVertexArray(null);
  const quad = new Float32Array(6 * 4);
  const textures = new Map<string, TileTextures>();
  let disposed = false;

  const release = (entry: TileTextures) => {
    gl.deleteTexture(entry.land);
    if (entry.sway) gl.deleteTexture(entry.sway);
    if (entry.swayImage) {
      entry.swayImage.onload = null;
      entry.swayImage.onerror = null;
      entry.swayImage.src = "";
    }
  };

  const texturesFor = (tile: CanopySwayTile, now: number): TileTextures => {
    let entry = textures.get(tile.key);
    if (!entry) {
      const swayImage = new Image();
      swayImage.decoding = "async";
      const created: TileTextures = {
        land: uploadImage(gl, tile.image),
        sway: null,
        swayState: "loading",
        swayImage,
        lastUsedAt: now,
      };
      swayImage.onload = () => {
        if (disposed || textures.get(tile.key) !== created) return;
        created.sway = uploadImage(gl, swayImage);
        created.swayState = "ready";
      };
      swayImage.onerror = () => {
        if (textures.get(tile.key) !== created) return;
        created.swayState = "missing";   // a candidate preview, or a cell with no field yet: nothing to sway
      };
      swayImage.src = tile.swayPath;
      textures.set(tile.key, created);
      entry = created;
    }
    entry.lastUsedAt = now;
    return entry;
  };

  return {
    draw(frame, width, height) {
      if (disposed) return 0;
      const now = performance.now();
      gl.viewport(0, 0, width, height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      gl.uniform1i(uniforms.land, 0);
      gl.uniform1i(uniforms.sway, 1);
      gl.uniform2f(uniforms.wind, frame.wind[0], frame.wind[1]);
      gl.uniform1f(uniforms.motion, frame.motion);
      gl.uniform1f(uniforms.time, frame.timeSeconds);
      gl.uniform1f(uniforms.opacity, frame.opacity);
      let drawn = 0;
      const { camera } = frame;
      for (const tile of frame.tiles) {
        const entry = texturesFor(tile, now);
        if (entry.swayState !== "ready" || !entry.sway) continue;
        const { origin, span } = tile.worldBounds;
        // the tile's rectangle in clip space (y up), the same mapping the land canvas draws with
        const left = ((origin[0] - camera.origin[0]) / camera.span[0]) * 2 - 1;
        const right = ((origin[0] + span[0] - camera.origin[0]) / camera.span[0]) * 2 - 1;
        const top = 1 - ((origin[1] - camera.origin[1]) / camera.span[1]) * 2;
        const bottom = 1 - ((origin[1] + span[1] - camera.origin[1]) / camera.span[1]) * 2;
        if (right < -1 || left > 1 || top < -1 || bottom > 1) continue;
        quad.set([
          left, top, 0, 0,
          right, top, 1, 0,
          left, bottom, 0, 1,
          left, bottom, 0, 1,
          right, top, 1, 0,
          right, bottom, 1, 1,
        ]);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, quad, gl.DYNAMIC_DRAW);
        gl.uniform2f(uniforms.texel, 1 / tile.image.naturalWidth, 1 / tile.image.naturalHeight);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, entry.land);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, entry.sway);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        drawn += 1;
      }
      gl.bindVertexArray(null);
      // tiles the camera left are released after a grace period
      for (const [key, entry] of textures) {
        if (now - entry.lastUsedAt > EVICT_AFTER_MS) {
          release(entry);
          textures.delete(key);
        }
      }
      return drawn;
    },
    clear() {
      if (disposed) return;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const entry of textures.values()) release(entry);
      textures.clear();
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
    },
  };
}
