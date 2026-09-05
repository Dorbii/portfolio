export function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error("WebGL could not allocate a shader.");
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "Unknown shader compile error.";
    gl.deleteShader(shader);
    throw new Error(log);
  }
  return shader;
}

export function linkProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
): WebGLProgram {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  let fragment: WebGLShader | null = null;
  let program: WebGLProgram | null = null;
  try {
    fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    program = gl.createProgram();
    if (!program) throw new Error("WebGL could not allocate a shader program.");

    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) ?? "Unknown shader link error.");
    }
    return program;
  } catch (error) {
    if (program) gl.deleteProgram(program);
    throw error;
  } finally {
    gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
  }
}

export async function loadImage(path: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.addEventListener("load", () => resolve(image), { once: true });
    image.addEventListener(
      "error",
      () => reject(new Error(`Failed to load water asset: ${path}`)),
      { once: true },
    );
    image.src = path;
  });
}

/**
 * `mipmapped` is the default and is right for anything sampled at an arbitrary
 * scale. `linear` and `nearest` skip the mip chain, which matters for two kinds
 * of texture: one whose channels are not a colour (a packed 16-bit field cannot
 * be averaged — the low byte is a sawtooth and averaging it is meaningless), and
 * one that is never minified.
 */
export function createTexture(
  gl: WebGL2RenderingContext,
  image: HTMLImageElement,
  wrap: "clamp" | "repeat" | "mirror",
  filter: "mipmapped" | "linear" | "nearest" = "mipmapped",
): WebGLTexture {
  const texture = gl.createTexture();
  if (!texture) {
    throw new Error("WebGL could not allocate a texture.");
  }

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    image,
  );
  const wrapMode = wrap === "repeat"
    ? gl.REPEAT
    : wrap === "mirror"
      ? gl.MIRRORED_REPEAT
      : gl.CLAMP_TO_EDGE;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapMode);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapMode);
  const point = filter === "nearest";
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    point
      ? gl.NEAREST
      : filter === "linear"
        ? gl.LINEAR
        : gl.LINEAR_MIPMAP_LINEAR,
  );
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MAG_FILTER,
    point ? gl.NEAREST : gl.LINEAR,
  );
  if (filter === "mipmapped") {
    gl.generateMipmap(gl.TEXTURE_2D);
  }
  gl.bindTexture(gl.TEXTURE_2D, null);
  return texture;
}
