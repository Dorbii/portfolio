// THE TREE SPRITE PASS — the cut-out route (owner 2026-09-07 22:40: "why cant
// we just use the foliage mask and cut that from the art and then replace the
// gaps with the assets?"). For each site-tier land tile that has a sprite set
// (tree-sprites.mjs: the single crowns cut from the served tile as sprites OF
// THEMSELVES, the hole under each filled from the ground round it, both in
// one atlas) the pass draws, in painter's order, every tree's PATCH still and
// then its SPRITE bent about its foot in the vertex shader: the rows near the
// foot stay, the top leans downwind under a gust that rolls through the cell,
// and sways about that lean. At rest the sprite is the tile's own pixels over
// its own place, so the world with the pass off and the world with the pass
// at rest are the same picture. Silhouette-derived branch joints add crown
// articulation to the trunk bend. The mesh deforms around these joints;
// no fragment noise, animated UV sampling, or relighting is used.
//
// Like the sway pass, every image is loaded by path from the browser cache
// and every upload is checked. Tiles without a sprite set cost nothing: the
// world manifest lists the cells that have one, so there is no fetch to miss.
import type { CameraView } from "../../../shared/camera";
import type { CanopySwayTile } from "./canopySwayWebGl";
import treeSpriteCells from "@/public/career-world/layers/terrain/authority/manifests/terrain-tree-sprites-r1.json";

export const TREE_SPRITE_CELLS: ReadonlySet<string> = new Set(Object.keys(treeSpriteCells.cells));

/** "l2-tanium/c3-1" for a site tile path, or null when the path is not a site tile. */
export function treeSpriteCellKey(landPath: string): string | null {
  const match = /\/tiles\/(l2-[a-z]+)\/([a-z0-9]+-[0-9]+)-site\.webp$/.exec(landPath);
  return match ? `${match[1]}/${match[2]}` : null;
}

export function tileHasTreeSprites(tile: CanopySwayTile): boolean {
  const key = treeSpriteCellKey(tile.landPath);
  return key !== null && TREE_SPRITE_CELLS.has(key);
}

interface TreeSpriteRecord {
  readonly box: readonly [number, number, number, number];
  readonly foot: readonly [number, number];
  readonly height: number;
  readonly phase: number;
  readonly branches?: readonly [readonly number[], readonly number[]];
  readonly sprite: readonly [number, number];
  readonly patch: readonly [number, number];
}

interface TreeSpriteManifest {
  readonly format: string;
  readonly tilePx: number;
  readonly atlas: { readonly path: string; readonly size: readonly [number, number] };
  readonly trees: readonly TreeSpriteRecord[];
}

export interface TreeSpritesFrame {
  readonly tiles: readonly CanopySwayTile[];
  readonly opacity: number;
  readonly camera: CameraView;
  readonly wind: readonly [number, number];
  readonly motion: number;
  readonly timeSeconds: number;
  /** the top of a crown moves this fraction of the crown's height at a full lean */
  readonly amplitude: number;
  /** zero keeps the previous whole-tree-only motion for comparison */
  readonly branches?: number;
}

export interface TreeSpritesHealth {
  readonly tilesDrawn: number;
  readonly spritesDrawn: number;
  readonly setsResident: number;
  readonly loadFailures: number;
}

// Mesh density supports trunk bending and independently weighted branch tiers.
const ROWS = 24;
const COLUMNS = 12;
const GRID_VERTICES = ROWS * COLUMNS * 6;
const FLOATS_PER_INSTANCE = 24;
const EVICT_AFTER_MS = 4000;

const VERTEX_SHADER = `#version 300 es
precision highp float;
in vec2 a_grid;          // 0..1 across the crop, 0..1 down it (per vertex)
in vec4 a_box;           // left, top, width, height of the crop in tile texels
in vec2 a_foot;          // the tree's foot in tile texels
in vec4 a_spriteRect;    // atlas uv rect of the sprite crop
in vec4 a_patchRect;     // atlas uv rect of the patch crop
in vec2 a_tree;          // phase 0..1, crown height in texels
in vec4 a_branchesLeft;  // silhouette-derived joint heights, zero = unused
in vec4 a_branchesRight;
uniform vec4 u_tileClip; // the tile's left, top, right, bottom in clip space
uniform float u_tilePx;
uniform float u_pass;    // 0 the patch (still), 1 the sprite (bent)
uniform vec2 u_wind;     // unit vector, texture space (y down)
uniform float u_motion;
uniform float u_time;
uniform float u_amplitude;
uniform float u_branches;
out vec2 v_uv;

void main() {
  vec2 texel = a_box.xy + a_grid * a_box.zw;
  float H = max(a_tree.y, 8.0);
  // rows above the foot bend, the foot and the ground rim under it stay
  float above = clamp((a_foot.y - texel.y) / H, 0.0, 1.25);
  float bend = pow(above, 1.5);
  float phase = a_tree.x;
  // ONE wind the whole cell shares (owner 2026-09-08 on the first tuning:
  // "a bit too animated ... not consistent enough, they are kinda waving"):
  // a gust front every ~480 texels drifting downwind at ~80 texels/s (a
  // six-second cycle), a quick rise and a slower relax, so neighbours lean
  // together and let go together; a tree's own phase only nudges it. On the
  // second tuning ("a little too subtle ... had to really look for it") the
  // gusts came closer and the sway between them grew, with the lean itself
  // raised in TreeSprites.tsx
  float along = dot(a_foot, u_wind);
  float across = dot(a_foot, vec2(-u_wind.y, u_wind.x));
  float t = u_time * (0.6 + 0.8 * u_motion);
  float g = fract((along - t * 80.0) / 480.0 + across / 2400.0 + phase * 0.06);
  float front = smoothstep(0.0, 0.2, g) * (1.0 - smoothstep(0.2, 0.85, g));
  float env = 0.6 + 0.4 * sin((along - t * 30.0) / 1500.0 * 6.2831853 + across / 900.0);
  float gust = front * env;
  // a sway about the lean whose phase follows position, not the tree, so it
  // travels through a stand as one motion; pines slower than saplings
  float hz = 0.35 / (1.0 + H / 90.0);
  float osc = sin(6.2831853 * (hz * t) - along / 900.0 * 6.2831853 + phase * 0.5);
  float swing = 0.12 + 0.7 * gust + 0.18 * osc * (0.4 + 0.6 * gust);
  // the lean is sideways on screen; the wind's downward part barely nods the tops
  vec2 lean = vec2(u_wind.x, u_wind.y * 0.25);
  vec2 offset = lean * (u_amplitude * H * swing * bend);
  // Articulated crown detail: joints come from protruding tiers in the
  // source silhouette. Each side rotates about the trunk, with a delayed
  // response and a smaller needle-cluster flutter. The trunk and ground
  // rim have zero branch weight. UVs and illumination never animate.
  float dx = texel.x - a_foot.x;
  float side = dx < 0.0 ? -1.0 : 1.0;
  float halfWidth = max(side < 0.0 ? a_foot.x - a_box.x : a_box.x + a_box.z - a_foot.x, 1.0);
  float lateral = clamp(abs(dx) / halfWidth, 0.0, 1.0);
  float branchWeight = smoothstep(0.08, 0.65, lateral) * smoothstep(0.12, 0.22, above);
  vec4 joints = side < 0.0 ? a_branchesLeft : a_branchesRight;
  vec2 branchOffset = vec2(0.0);
  float totalWeight = 0.0;
  for (int i = 0; i < 4; i++) {
    float joint = joints[i];
    if (joint <= 0.0) continue;
    float distanceToJoint = (above - joint) / 0.11;
    float weight = exp(-distanceToJoint * distanceToJoint);
    float delayed = t - joint * 0.55;
    float branchPhase = joint * 9.0 + side * 0.8 + phase;
    float response = sin(delayed * (4.1 + joint) - along / 210.0 + branchPhase);
    float flutter = sin(delayed * 13.0 + branchPhase) * sin(delayed * 8.7 - branchPhase);
    float angle = u_amplitude * u_branches * u_wind.x
      * (0.65 * gust + 1.2 * response * (0.25 + 0.75 * gust)
         + 0.18 * flutter * gust * lateral);
    vec2 arm = vec2(dx, (joint - above) * H);
    float c = cos(angle), s = sin(angle);
    branchOffset += (vec2(c * arm.x - s * arm.y, s * arm.x + c * arm.y) - arm) * weight;
    totalWeight += weight;
  }
  offset += branchOffset / max(1.0, totalWeight) * branchWeight;
  offset *= u_pass;
  vec2 p = (texel + offset) / u_tilePx;
  gl_Position = vec4(mix(u_tileClip.x, u_tileClip.z, p.x), mix(u_tileClip.y, u_tileClip.w, p.y), 0.0, 1.0);
  vec4 rect = u_pass > 0.5 ? a_spriteRect : a_patchRect;
  v_uv = mix(rect.xy, rect.zw, a_grid);
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision mediump float;
uniform sampler2D u_atlas;
uniform float u_opacity;
in vec2 v_uv;
out vec4 outColor;
void main() {
  vec4 c = texture(u_atlas, v_uv);   // premultiplied at upload
  if (c.a < 0.004) discard;
  outColor = c * u_opacity;
}
`;

type SetState = "loading" | "ready" | "failed";

interface SpriteSet {
  state: SetState;
  atlas: WebGLTexture | null;
  instances: WebGLBuffer | null;
  vao: WebGLVertexArrayObject | null;
  count: number;
  image: HTMLImageElement | null;
  lastUsedAt: number;
}

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to allocate the tree sprite shader.");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? "Unknown shader compile error.";
    gl.deleteShader(shader);
    throw new Error(`Tree sprite shader failed to compile: ${message}`);
  }
  return shader;
}

function isManifest(value: unknown): value is TreeSpriteManifest {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<TreeSpriteManifest>;
  return candidate.format === "career-world/tree-sprites@r1"
    && typeof candidate.tilePx === "number"
    && !!candidate.atlas && Array.isArray(candidate.atlas.size)
    && Array.isArray(candidate.trees);
}

function instanceData(manifest: TreeSpriteManifest): Float32Array {
  const [atlasWidth, atlasHeight] = manifest.atlas.size;
  const data = new Float32Array(manifest.trees.length * FLOATS_PER_INSTANCE);
  manifest.trees.forEach((tree, index) => {
    const [left, top, width, height] = tree.box;
    const o = index * FLOATS_PER_INSTANCE;
    data[o] = left; data[o + 1] = top; data[o + 2] = width; data[o + 3] = height;
    data[o + 4] = tree.foot[0]; data[o + 5] = tree.foot[1];
    data[o + 6] = tree.sprite[0] / atlasWidth; data[o + 7] = tree.sprite[1] / atlasHeight;
    data[o + 8] = (tree.sprite[0] + width) / atlasWidth; data[o + 9] = (tree.sprite[1] + height) / atlasHeight;
    data[o + 10] = tree.patch[0] / atlasWidth; data[o + 11] = tree.patch[1] / atlasHeight;
    data[o + 12] = (tree.patch[0] + width) / atlasWidth; data[o + 13] = (tree.patch[1] + height) / atlasHeight;
    data[o + 14] = tree.phase; data[o + 15] = tree.height;
    data.set(tree.branches?.[0] ?? [0, 0, 0, 0], o + 16);
    data.set(tree.branches?.[1] ?? [0, 0, 0, 0], o + 20);
  });
  return data;
}

export interface TreeSpritesRenderer {
  /** Draws one frame; returns the number of sprites drawn. */
  draw(frame: TreeSpritesFrame, width: number, height: number): number;
  clear(): void;
  health(): TreeSpritesHealth;
  dispose(): void;
}

export function createTreeSpritesRenderer(gl: WebGL2RenderingContext): TreeSpritesRenderer {
  const program = gl.createProgram();
  if (!program) throw new Error("Unable to allocate the tree sprite program.");
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) ?? "Unknown link error.";
    throw new Error(`Tree sprite program failed to link: ${message}`);
  }
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  const attribute = (name: string) => {
    const location = gl.getAttribLocation(program, name);
    if (location < 0) throw new Error(`Tree sprite attribute ${name} is missing.`);
    return location;
  };
  const attributes = {
    grid: attribute("a_grid"),
    box: attribute("a_box"),
    foot: attribute("a_foot"),
    spriteRect: attribute("a_spriteRect"),
    patchRect: attribute("a_patchRect"),
    tree: attribute("a_tree"),
    branchesLeft: attribute("a_branchesLeft"),
    branchesRight: attribute("a_branchesRight"),
  };
  const uniform = (name: string, required = false) => {
    const location = gl.getUniformLocation(program, name);
    if (!location && required) throw new Error(`Tree sprite uniform ${name} is missing.`);
    return location;
  };
  const uniforms = {
    atlas: uniform("u_atlas", true),
    tileClip: uniform("u_tileClip"),
    tilePx: uniform("u_tilePx"),
    pass: uniform("u_pass"),
    wind: uniform("u_wind"),
    motion: uniform("u_motion"),
    time: uniform("u_time"),
    amplitude: uniform("u_amplitude"),
    branches: uniform("u_branches"),
    opacity: uniform("u_opacity"),
  };
  // A shared mesh allows each side of a branch to flex around a still
  // centreline. Patches use the same mesh with displacement disabled.
  const grid = new Float32Array(GRID_VERTICES * 2);
  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      const x0 = column / COLUMNS, x1 = (column + 1) / COLUMNS;
      const y0 = row / ROWS, y1 = (row + 1) / ROWS;
      grid.set([x0, y0, x1, y0, x0, y1, x0, y1, x1, y0, x1, y1], (row * COLUMNS + column) * 12);
    }
  }
  const gridBuffer = gl.createBuffer();
  if (!gridBuffer) throw new Error("Unable to allocate the tree sprite geometry.");
  gl.bindBuffer(gl.ARRAY_BUFFER, gridBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, grid, gl.STATIC_DRAW);
  const sets = new Map<string, SpriteSet>();
  let disposed = false;
  let tilesDrawn = 0;
  let spritesDrawn = 0;
  let loadFailures = 0;

  const buildVao = (set: SpriteSet) => {
    const vao = gl.createVertexArray();
    if (!vao || !set.instances) return null;
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gridBuffer);
    gl.enableVertexAttribArray(attributes.grid);
    gl.vertexAttribPointer(attributes.grid, 2, gl.FLOAT, false, 8, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, set.instances);
    const stride = FLOATS_PER_INSTANCE * 4;
    const perInstance: readonly [number, number, number][] = [
      [attributes.box, 4, 0],
      [attributes.foot, 2, 16],
      [attributes.spriteRect, 4, 24],
      [attributes.patchRect, 4, 40],
      [attributes.tree, 2, 56],
      [attributes.branchesLeft, 4, 64],
      [attributes.branchesRight, 4, 80],
    ];
    for (const [location, size, offset] of perInstance) {
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride, offset);
      gl.vertexAttribDivisor(location, 1);
    }
    gl.bindVertexArray(null);
    return vao;
  };

  const uploadAtlas = (image: HTMLImageElement): WebGLTexture | null => {
    if (image.naturalWidth === 0 || image.naturalHeight === 0) return null;
    const texture = gl.createTexture();
    if (!texture) return null;
    while (gl.getError() !== gl.NO_ERROR) { /* drain a stale error so the check is this upload's own */ }
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
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

  const fail = (set: SpriteSet) => {
    if (set.state === "failed") return;
    set.state = "failed";
    set.image = null;
    loadFailures += 1;
  };

  const load = (tile: CanopySwayTile, set: SpriteSet) => {
    const manifestPath = tile.landPath.replace(/-site\.webp$/, "-trees.json");
    fetch(manifestPath)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(`${response.status} for ${manifestPath}`))))
      .then((json: unknown) => {
        if (disposed || set.state !== "loading") return;
        if (!isManifest(json)) throw new Error(`${manifestPath} is not a tree sprite manifest.`);
        const data = instanceData(json);
        const buffer = gl.createBuffer();
        if (!buffer) throw new Error("Unable to allocate the tree sprite instances.");
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        set.instances = buffer;
        set.count = json.trees.length;
        set.vao = buildVao(set);
        if (!set.vao) throw new Error("Unable to allocate the tree sprite vertex array.");
        const image = new Image();
        image.decoding = "async";
        set.image = image;
        image.onload = () => {
          image.decode().then(() => {
            if (disposed || set.image !== image) return;
            const texture = uploadAtlas(image);
            if (!texture) { fail(set); return; }
            set.atlas = texture;
            set.image = null;
            set.state = "ready";
          }).catch(() => fail(set));
        };
        image.onerror = () => { if (set.image === image) fail(set); };
        image.src = json.atlas.path;
      })
      .catch((error: unknown) => {
        if (disposed) return;
        console.warn("Tree sprites: a sprite set failed to load.", error);
        fail(set);
      });
  };

  const release = (set: SpriteSet) => {
    if (set.atlas) gl.deleteTexture(set.atlas);
    if (set.vao) gl.deleteVertexArray(set.vao);
    if (set.instances) gl.deleteBuffer(set.instances);
    if (set.image) {
      set.image.onload = null;
      set.image.onerror = null;
      set.image.src = "";
    }
    set.atlas = null;
    set.vao = null;
    set.instances = null;
    set.image = null;
  };

  const setFor = (tile: CanopySwayTile, now: number): SpriteSet => {
    let set = sets.get(tile.key);
    if (!set) {
      set = { state: "loading", atlas: null, instances: null, vao: null, count: 0, image: null, lastUsedAt: now };
      sets.set(tile.key, set);
      load(tile, set);
    }
    set.lastUsedAt = now;
    return set;
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
      gl.uniform1i(uniforms.atlas, 0);
      gl.uniform2f(uniforms.wind, frame.wind[0], frame.wind[1]);
      gl.uniform1f(uniforms.motion, frame.motion);
      gl.uniform1f(uniforms.time, frame.timeSeconds);
      gl.uniform1f(uniforms.amplitude, frame.amplitude);
      gl.uniform1f(uniforms.branches, frame.branches ?? 1);
      gl.uniform1f(uniforms.opacity, frame.opacity);
      let tiles = 0;
      let sprites = 0;
      const { camera } = frame;
      for (const tile of frame.tiles) {
        if (!tileHasTreeSprites(tile)) continue;
        const set = setFor(tile, now);
        if (set.state !== "ready" || !set.atlas || !set.vao || set.count === 0) continue;
        const { origin, span } = tile.worldBounds;
        const left = ((origin[0] - camera.origin[0]) / camera.span[0]) * 2 - 1;
        const right = ((origin[0] + span[0] - camera.origin[0]) / camera.span[0]) * 2 - 1;
        const top = 1 - ((origin[1] - camera.origin[1]) / camera.span[1]) * 2;
        const bottom = 1 - ((origin[1] + span[1] - camera.origin[1]) / camera.span[1]) * 2;
        if (right < -1 || left > 1 || top < -1 || bottom > 1) continue;
        gl.uniform4f(uniforms.tileClip, left, top, right, bottom);
        gl.uniform1f(uniforms.tilePx, 2048);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, set.atlas);
        gl.bindVertexArray(set.vao);
        // every patch first, still; then every sprite, bent — both in painter's order
        gl.uniform1f(uniforms.pass, 0);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, GRID_VERTICES, set.count);
        gl.uniform1f(uniforms.pass, 1);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, GRID_VERTICES, set.count);
        gl.bindVertexArray(null);
        tiles += 1;
        sprites += set.count;
      }
      for (const [key, set] of sets) {
        if (now - set.lastUsedAt > EVICT_AFTER_MS) {
          release(set);
          sets.delete(key);
        }
      }
      tilesDrawn = tiles;
      spritesDrawn = sprites;
      return sprites;
    },
    clear() {
      if (disposed) return;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    },
    health() {
      return { tilesDrawn, spritesDrawn, setsResident: sets.size, loadFailures };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const set of sets.values()) release(set);
      sets.clear();
      gl.deleteBuffer(gridBuffer);
      gl.deleteProgram(program);
    },
  };
}
