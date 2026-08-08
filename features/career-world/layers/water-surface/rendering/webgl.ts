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
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();

  if (!program) {
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    throw new Error("WebGL could not allocate a shader program.");
  }

  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? "Unknown shader link error.";
    gl.deleteProgram(program);
    throw new Error(log);
  }
  return program;
}

export async function loadImage(
  path: string,
  signal?: AbortSignal,
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    let settled = false;
    function cleanup(): void {
      image.removeEventListener("load", handleLoad);
      image.removeEventListener("error", handleError);
      signal?.removeEventListener("abort", handleAbort);
    }
    function fail(error: unknown): void {
      if (settled) return;
      settled = true;
      releaseDecodedImage(image);
      cleanup();
      reject(error);
    }
    function handleLoad(): void {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(image);
    }
    function handleError(): void {
      fail(new Error(`Failed to load water asset: ${path}`));
    }
    function handleAbort(): void {
      fail(signal?.reason ?? new DOMException(
        `Water asset load aborted: ${path}`,
        "AbortError",
      ));
    }
    if (signal?.aborted) {
      handleAbort();
      return;
    }
    image.addEventListener("load", handleLoad, { once: true });
    image.addEventListener("error", handleError, { once: true });
    signal?.addEventListener("abort", handleAbort, { once: true });
    try {
      image.src = path;
    } catch (error) {
      fail(error);
    }
  });
}

function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Web Crypto is unavailable for hydrology integrity checks.");
  }
  return globalThis.crypto.subtle.digest("SHA-256", bytes).then((digest) => (
    [...new Uint8Array(digest)]
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  ));
}

export async function loadVerifiedImage(
  path: string,
  expectedSha256: string,
  signal?: AbortSignal,
): Promise<HTMLImageElement> {
  if (!/^[A-F\d]{64}$/i.test(expectedSha256)) {
    throw new TypeError(`Water asset ${path} has an invalid SHA-256 identity.`);
  }
  const response = await fetch(path, { cache: "force-cache", signal });
  if (!response.ok) {
    throw new Error(`Failed to fetch water asset ${path}: HTTP ${response.status}.`);
  }
  const bytes = await response.arrayBuffer();
  const actualSha256 = await sha256Hex(bytes);
  if (actualSha256 !== expectedSha256.toUpperCase()) {
    throw new Error(
      `Water asset ${path} SHA-256 ${actualSha256} does not match ${expectedSha256}.`,
    );
  }
  signal?.throwIfAborted();
  const objectUrl = URL.createObjectURL(new Blob([bytes], {
    type: response.headers.get("content-type") ?? "image/png",
  }));
  let image: HTMLImageElement | null = null;
  try {
    image = await loadImage(objectUrl, signal);
    signal?.throwIfAborted();
    return image;
  } catch (error) {
    if (image) releaseDecodedImage(image);
    throw error;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function releaseDecodedImage(image: HTMLImageElement): void {
  // Texture upload is synchronous. Once a verified decode has either uploaded
  // or become stale, drop the revoked Blob URL from the element so the browser
  // can release its decoded backing store before the next serialized cohort.
  image.removeAttribute("src");
}

export interface TextureUploadOptions {
  readonly filter?: "linear" | "nearest";
  readonly generateMipmaps?: boolean;
  readonly preserveDataBytes?: boolean;
}

export function createTexture(
  gl: WebGL2RenderingContext,
  image: HTMLImageElement,
  wrap: "clamp" | "repeat" | "mirror",
  options: TextureUploadOptions = {},
): WebGLTexture {
  const filter = options.filter ?? "linear";
  const generateMipmaps = options.generateMipmaps ?? true;
  const preserveDataBytes = options.preserveDataBytes ?? false;
  const texture = gl.createTexture();
  if (!texture) {
    throw new Error("WebGL could not allocate a texture.");
  }

  const pendingError = gl.getError();
  if (pendingError !== gl.NO_ERROR) {
    gl.deleteTexture(texture);
    throw new Error(`WebGL reported error ${pendingError} before texture upload.`);
  }

  try {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    const previousColorSpaceConversion = preserveDataBytes
      ? gl.getParameter(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL) as number
      : null;
    if (preserveDataBytes) {
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    }
    try {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        image,
      );
    } finally {
      if (previousColorSpaceConversion !== null) {
        gl.pixelStorei(
          gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,
          previousColorSpaceConversion,
        );
      }
    }
    const wrapMode = wrap === "repeat"
      ? gl.REPEAT
      : wrap === "mirror"
        ? gl.MIRRORED_REPEAT
        : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapMode);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapMode);
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      generateMipmaps
        ? gl.LINEAR_MIPMAP_LINEAR
        : filter === "nearest" ? gl.NEAREST : gl.LINEAR,
    );
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MAG_FILTER,
      filter === "nearest" ? gl.NEAREST : gl.LINEAR,
    );
    if (generateMipmaps) {
      gl.generateMipmap(gl.TEXTURE_2D);
    }
    const uploadError = gl.getError();
    if (uploadError !== gl.NO_ERROR) {
      throw new Error(`WebGL texture upload failed with error ${uploadError}.`);
    }
    gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;
  } catch (error) {
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.deleteTexture(texture);
    throw error;
  }
}
