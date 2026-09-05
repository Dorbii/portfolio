interface TimerExtension { readonly TIME_ELAPSED_EXT: number; readonly GPU_DISJOINT_EXT: number }

export class GpuTimer {
  private readonly gl: WebGL2RenderingContext;
  private readonly extension: TimerExtension | null;
  private active: WebGLQuery | null = null;
  private readonly pending: WebGLQuery[] = [];
  private readonly samples: number[] = [];

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.extension = gl.getExtension("EXT_disjoint_timer_query_webgl2");
  }

  begin() {
    const { gl, extension } = this;
    if (!extension || this.active) return;
    if (gl.getParameter(extension.GPU_DISJOINT_EXT)) {
      for (const query of this.pending) gl.deleteQuery(query);
      this.pending.length = 0; this.samples.length = 0;
    }
    while (this.pending.length && gl.getQueryParameter(this.pending[0], gl.QUERY_RESULT_AVAILABLE)) {
      const query = this.pending.shift()!;
      this.samples.push(gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6);
      if (this.samples.length > 120) this.samples.shift();
      gl.deleteQuery(query);
    }
    if (this.pending.length >= 8) return;
    this.active = gl.createQuery();
    if (this.active) gl.beginQuery(extension.TIME_ELAPSED_EXT, this.active);
  }

  end() {
    if (!this.active || !this.extension) return;
    this.gl.endQuery(this.extension.TIME_ELAPSED_EXT);
    this.pending.push(this.active); this.active = null;
  }

  publish(canvas: HTMLCanvasElement) {
    canvas.dataset.gpuTimingAvailable = String(Boolean(this.extension));
    if (!this.samples.length) return;
    const sorted = [...this.samples].sort((a, b) => a - b);
    canvas.dataset.gpuP50Ms = sorted[Math.floor(sorted.length * 0.5)].toFixed(3);
    canvas.dataset.gpuP95Ms = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))].toFixed(3);
    canvas.dataset.gpuSamples = String(sorted.length);
  }

  destroy() {
    if (this.active && this.extension) {
      this.gl.endQuery(this.extension.TIME_ELAPSED_EXT); this.gl.deleteQuery(this.active);
    }
    for (const query of this.pending) this.gl.deleteQuery(query);
  }
}
