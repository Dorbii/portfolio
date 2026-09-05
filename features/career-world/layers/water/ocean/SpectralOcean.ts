import { linkProgram } from "../../../shared/water/webgl.ts";
import { WATER_VERTEX } from "../shader.ts";
import { createWaveSpectrum, SPECTRUM_SIZE, WAVE_CASCADES, waveHeights } from "./spectrum.ts";
import { EVOLVE_SPECTRUM, INVERSE_FFT, RESOLVE_SURFACE } from "./spectralShaders.ts";

interface Target { readonly textures: readonly WebGLTexture[]; readonly framebuffer: WebGLFramebuffer }
interface Cascade {
  readonly seed: WebGLTexture; readonly frequency: readonly [Target, Target];
  readonly surface: readonly [Target, Target]; readonly length: number;
  front: number;
}

// Two small periodic domains, independent of camera and output resolution.
// Only material maps are rendered; registered land/water coverage is untouched.
export class SpectralOcean {
  private readonly gl: WebGL2RenderingContext;
  private readonly windAngle: number;
  private readonly vao: WebGLVertexArrayObject;
  private readonly evolve: WebGLProgram;
  private readonly fft: WebGLProgram;
  private readonly resolve: WebGLProgram;
  private readonly locations = new Map<WebGLProgram, Map<string, WebGLUniformLocation | null>>();
  private readonly cascades: Cascade[] = [];
  private readonly textures: WebGLTexture[] = [];
  private readonly framebuffers: WebGLFramebuffer[] = [];
  private readonly programs: WebGLProgram[] = [];
  private disposed = false;
  private previousTime = -1;
  private previousWeather = -1;

  constructor(gl: WebGL2RenderingContext, windAngle: number) {
    this.gl = gl;
    this.windAngle = windAngle;
    const vao = gl.createVertexArray();
    if (!vao) throw new Error("Could not allocate the ocean vertex array.");
    this.vao = vao;
    try {
      const program = (fragment: string) => { const p = linkProgram(gl, WATER_VERTEX, fragment); this.programs.push(p); return p; };
      this.evolve = program(EVOLVE_SPECTRUM);
      this.fft = program(INVERSE_FFT);
      this.resolve = program(RESOLVE_SURFACE);
      for (const band of WAVE_CASCADES) {
        const seed = this.texture(gl.RGBA32F, false, createWaveSpectrum(SPECTRUM_SIZE, band, windAngle));
        this.cascades.push({ seed, length: band.length, front: 0,
          frequency: [this.target(2, false), this.target(2, false)],
          surface: [this.target(2, true), this.target(2, true)] });
      }
    } catch (error) { this.destroy(); throw error; }
    finally { gl.bindFramebuffer(gl.FRAMEBUFFER, null); }
  }

  private texture(format: number, filtered: boolean, data: Float32Array | null = null): WebGLTexture {
    const gl = this.gl, texture = gl.createTexture();
    if (!texture) throw new Error("Could not allocate an ocean texture.");
    this.textures.push(texture);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, format, SPECTRUM_SIZE, SPECTRUM_SIZE, 0, gl.RGBA, gl.FLOAT, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filtered ? gl.LINEAR_MIPMAP_LINEAR : gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filtered ? gl.LINEAR : gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    if (filtered) gl.generateMipmap(gl.TEXTURE_2D);
    return texture;
  }

  private target(count: number, filtered: boolean): Target {
    const gl = this.gl, framebuffer = gl.createFramebuffer();
    if (!framebuffer) throw new Error("Could not allocate an ocean framebuffer.");
    this.framebuffers.push(framebuffer);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    const textures = Array.from({ length: count }, (_, index) => {
      const texture = this.texture(filtered ? gl.RGBA16F : gl.RGBA32F, filtered);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + index, gl.TEXTURE_2D, texture, 0);
      return texture;
    });
    gl.drawBuffers(textures.map((_, i) => gl.COLOR_ATTACHMENT0 + i));
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error("Ocean float framebuffer is incomplete.");
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    return { framebuffer, textures };
  }

  private uniform(program: WebGLProgram, name: string) {
    let table = this.locations.get(program);
    if (!table) { table = new Map(); this.locations.set(program, table); }
    if (!table.has(name)) table.set(name, this.gl.getUniformLocation(program, name));
    return table.get(name)!;
  }

  private bind(program: WebGLProgram, name: string, texture: WebGLTexture, unit: number) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(this.uniform(program, name), unit);
  }

  private draw(target: Target) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer); gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  update(seconds: number, weather: number) {
    if (this.disposed || (seconds === this.previousTime && weather === this.previousWeather)) return 0;
    const gl = this.gl;
    const delta = this.previousTime < 0 ? 1 / 30 : Math.max(0, Math.min(0.2, seconds - this.previousTime));
    gl.viewport(0, 0, SPECTRUM_SIZE, SPECTRUM_SIZE); gl.bindVertexArray(this.vao);
    gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST); gl.disable(gl.SCISSOR_TEST);
    const heights = waveHeights(weather);
    for (const [index, cascade] of this.cascades.entries()) {
      gl.useProgram(this.evolve);
      this.bind(this.evolve, "uSeed", cascade.seed, 0);
      gl.uniform1f(this.uniform(this.evolve, "uSeconds"), seconds);
      gl.uniform1f(this.uniform(this.evolve, "uHeight"), heights[index]);
      this.draw(cascade.frequency[0]);
      let front = 0;
      gl.useProgram(this.fft);
      for (let axis = 0; axis < 2; axis++) for (let stage = 2; stage <= SPECTRUM_SIZE; stage *= 2) {
        this.bind(this.fft, "uA", cascade.frequency[front].textures[0], 0);
        this.bind(this.fft, "uB", cascade.frequency[front].textures[1], 1);
        gl.uniform1i(this.uniform(this.fft, "uStage"), stage);
        gl.uniform1i(this.uniform(this.fft, "uAxis"), axis);
        front = 1 - front; this.draw(cascade.frequency[front]);
      }
      gl.useProgram(this.resolve);
      this.bind(this.resolve, "uA", cascade.frequency[front].textures[0], 0);
      this.bind(this.resolve, "uB", cascade.frequency[front].textures[1], 1);
      this.bind(this.resolve, "uPrevious", cascade.surface[cascade.front].textures[0], 2);
      gl.uniform1f(this.uniform(this.resolve, "uLength"), cascade.length);
      gl.uniform1f(this.uniform(this.resolve, "uChop"), index === 0 ? 2.1 : 1.25);
      gl.uniform1f(this.uniform(this.resolve, "uDelta"), delta);
      gl.uniform1f(this.uniform(this.resolve, "uThreshold"), 0.40 + weather * 0.22);
      gl.uniform1f(this.uniform(this.resolve, "uHistory"), Number(this.previousTime >= 0 && seconds !== this.previousTime));
      gl.uniform2f(this.uniform(this.resolve, "uDrift"), Math.cos(this.windAngle) * (0.08 + weather * 0.25), Math.sin(this.windAngle) * (0.08 + weather * 0.25));
      cascade.front = 1 - cascade.front; this.draw(cascade.surface[cascade.front]);
      for (const texture of cascade.surface[cascade.front].textures) {
        gl.bindTexture(gl.TEXTURE_2D, texture); gl.generateMipmap(gl.TEXTURE_2D);
      }
    }
    this.previousTime = seconds; this.previousWeather = weather;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return this.cascades.length * (2 + 2 * Math.log2(SPECTRUM_SIZE));
  }

  bindMaterial(program: WebGLProgram) {
    for (const [index, cascade] of this.cascades.entries()) {
      this.bind(program, index === 0 ? "uSwell" : "uRipples", cascade.surface[cascade.front].textures[0], 3 + index);
      this.bind(program, index === 0 ? "uSwellOffset" : "uRippleOffset", cascade.surface[cascade.front].textures[1], 5 + index);
    }
    this.gl.uniform1f(this.uniform(program, "uSpectral"), 1);
  }

  async probe(windAngle: number) {
    const { referenceWaveSamples } = await import("./spectrumProbe.ts");
    if (this.disposed || this.gl.isContextLost()) return null;
    const gl = this.gl;
    const results = this.cascades.map((cascade, index) => {
      // Evolve + 14 butterfly stages leaves frequency target zero as spatial.
      const data = new Float32Array(SPECTRUM_SIZE ** 2 * 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, cascade.frequency[0].framebuffer);
      gl.readBuffer(gl.COLOR_ATTACHMENT0);
      gl.readPixels(0, 0, SPECTRUM_SIZE, SPECTRUM_SIZE, gl.RGBA, gl.FLOAT, data);
      let real = 0, imaginary = 0;
      for (let i = 0; i < data.length; i += 4) { real += data[i] ** 2; imaginary += data[i + 1] ** 2; }
      return { length: cascade.length, heightRms: Math.sqrt(real / SPECTRUM_SIZE ** 2), imaginaryRms: Math.sqrt(imaginary / SPECTRUM_SIZE ** 2),
        samples: referenceWaveSamples(index, this.previousTime, this.previousWeather, windAngle)
          .map((sample) => ({ ...sample, actual: data[(sample.y * SPECTRUM_SIZE + sample.x) * 4] })) };
    });
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return results;
  }

  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    const gl = this.gl;
    for (const texture of this.textures) gl.deleteTexture(texture);
    for (const framebuffer of this.framebuffers) gl.deleteFramebuffer(framebuffer);
    gl.deleteVertexArray(this.vao);
    for (const program of this.programs) gl.deleteProgram(program);
  }
}
