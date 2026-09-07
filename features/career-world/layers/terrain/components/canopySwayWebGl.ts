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
//
// The pass loads its OWN images by path (the land tile and its field), decodes
// them, and checks every upload: the first build uploaded the terrain layer's
// image objects, which that layer releases or replaces on its own schedule,
// and a failed upload left an incomplete texture that sampled BLACK — the
// owner's crop of black crowns, 2026-09-07 17:10. The bytes come from the
// browser cache the terrain layer already filled.
import type { CameraView, Pair } from "../../../shared/camera";

export interface CanopySwayTile {
  readonly key: string;
  readonly landPath: string;
  readonly swayPath: string;
  readonly worldBounds: CameraView;
}

// What TerritoryLandform publishes each render for the pass to read: the
// site-tier tiles it drew, the site tier's opacity, and its backing-store
// size so both canvases map the camera alike. (Kept here, not in the
// component module, so Vite can fast-refresh the component alone.)
export interface CanopySwayRegistry {
  tiles: readonly CanopySwayTile[];
  opacity: number;
  pixelSize: readonly [number, number];
}

export function createCanopySwayRegistry(): CanopySwayRegistry {
  return { tiles: [], opacity: 0, pixelSize: [1, 1] };
}

export interface CanopySwayFrame {
  readonly tiles: readonly CanopySwayTile[];
  readonly opacity: number;
  readonly camera: CameraView;
  readonly wind: Pair;
  readonly motion: number;
  readonly timeSeconds: number;
}

export interface CanopySwayHealth {
  readonly tilesDrawn: number;
  readonly texturesResident: number;
  readonly uploadFailures: number;
  readonly loadFailures: number;
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
  float weight = pow(field.r, 1.3);       // 0 at the crown's local foot, 1 a crown-height above it; feet stay planted
  float height = field.g * 510.0;         // the local crown height in land texels (capped at a tree by the field)
  float phase = field.b * 6.2831853;      // per tree, or a smooth noise across a dense stand
  // the wind's run across the tile, in land texels along the wind
  float along = (v_uv.x * u_wind.x + v_uv.y * u_wind.y) * 2048.0;
  // a tall pine swings slowly, a sapling flutters: periods of about 2.5-4.5 s
  float rate = 4.0 / (1.0 + height / 60.0);
  // the swing, with a wave travelling downwind through the canopy (one every 300 texels)
  float swing = 0.6 * sin(u_time * rate + phase - along * 0.021)
    + 0.4 * sin(u_time * rate * 2.31 + phase * 1.7 - along * 0.05 + v_uv.y * 9.0);
  // gusts roll across the tile (one every 600 texels), so neighbours do not all lean at once
  float gust = 0.5 + 0.5 * sin(u_time * 0.35 + phase * 0.4 - along * 0.0105);
  // a crown's top travels about a seventh of its height in the world's wind
  float amplitude = clamp(0.14 * height, 1.5, 14.0) * u_motion;
  vec2 shift = u_wind * amplitude * weight * swing * (0.4 + 0.6 * gust);
  shift.y *= 0.35;
  vec4 land = texture(u_land, v_uv - shift * u_texel);
  float alpha = land.a * field.a * u_opacity;
  outColor = vec4(land.rgb * alpha, alpha);
}
`;

type TextureState = "loading" | "ready" | "failed";

interface LoadedTexture {
  texture: WebGLTexture | null;
  state: TextureState;
  width: number;
  height: number;
  image: HTMLImageElement | null;
}

interface TileTextures {
  readonly land: LoadedTexture;
  readonly sway: LoadedTexture;
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

export interface CanopySwayRenderer {
  /** Draws one frame; returns the number of tiles drawn. */
  draw(frame: CanopySwayFrame, width: number, height: number): number;
  clear(): void;
  health(): CanopySwayHealth;
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
  if (attributes.position < 0 || attributes.uv < 0) {
    throw new Error("Canopy sway attributes are missing.");
  }
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
  let tilesDrawn = 0;
  let uploadFailures = 0;
  let loadFailures = 0;

  const upload = (image: HTMLImageElement): WebGLTexture | null => {
    if (image.naturalWidth === 0 || image.naturalHeight === 0) return null;
    const texture = gl.createTexture();
    if (!texture) return null;
    // clear any stale error so the check below is this upload's own
    while (gl.getError() !== gl.NO_ERROR) { /* drain */ }
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (gl.getError() !== gl.NO_ERROR) {
      gl.deleteTexture(texture);
      return null;
    }
    return texture;
  };

  const load = (path: string, owner: LoadedTexture) => {
    const image = new Image();
    image.decoding = "async";
    owner.image = image;
    const fail = () => {
      if (owner.image !== image) return;
      owner.state = "failed";
      owner.image = null;
      loadFailures += 1;
    };
    image.onload = () => {
      image.decode().then(() => {
        if (disposed || owner.image !== image) return;
        const texture = upload(image);
        if (!texture) {
          uploadFailures += 1;
          fail();
          return;
        }
        owner.texture = texture;
        owner.width = image.naturalWidth;
        owner.height = image.naturalHeight;
        owner.state = "ready";
        owner.image = null;   // the bytes live on the GPU now
      }).catch(fail);
    };
    image.onerror = fail;
    image.src = path;
  };

  const release = (entry: TileTextures) => {
    for (const part of [entry.land, entry.sway]) {
      if (part.texture) gl.deleteTexture(part.texture);
      if (part.image) {
        part.image.onload = null;
        part.image.onerror = null;
        part.image.src = "";
        part.image = null;
      }
    }
  };

  const texturesFor = (tile: CanopySwayTile, now: number): TileTextures => {
    let entry = textures.get(tile.key);
    if (!entry) {
      const land: LoadedTexture = { texture: null, state: "loading", width: 1, height: 1, image: null };
      const sway: LoadedTexture = { texture: null, state: "loading", width: 1, height: 1, image: null };
      entry = { land, sway, lastUsedAt: now };
      textures.set(tile.key, entry);
      load(tile.landPath, land);
      load(tile.swayPath, sway);
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
        if (entry.land.state !== "ready" || entry.sway.state !== "ready" || !entry.land.texture || !entry.sway.texture) continue;
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
        gl.uniform2f(uniforms.texel, 1 / entry.land.width, 1 / entry.land.height);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, entry.land.texture);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, entry.sway.texture);
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
      tilesDrawn = drawn;
      return drawn;
    },
    clear() {
      if (disposed) return;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    },
    health() {
      return { tilesDrawn, texturesResident: textures.size, uploadFailures, loadFailures };
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
