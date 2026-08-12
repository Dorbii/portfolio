import type { CameraView } from "../../../shared/camera";
import type { DetailState } from "../../../shared/lod";
import type { WorldLight } from "../../../shared/lighting";
import { NinjaOneInlandWaterRenderer } from "./NinjaOneInlandWaterRenderer";

export class NinjaOneInlandWaterController {
  private readonly renderer: NinjaOneInlandWaterRenderer;
  private readonly resizeObserver: ResizeObserver | null;
  private readonly reduceMotion: boolean;
  private frameRequest = 0;
  private running = false;
  private elapsedSeconds = 0;
  private lastTimestamp = 0;

  constructor(
    renderer: NinjaOneInlandWaterRenderer,
    options: { readonly reduceMotion: boolean },
  ) {
    this.renderer = renderer;
    this.reduceMotion = options.reduceMotion;
    this.resizeObserver = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(() => this.renderOnce());
    this.resizeObserver?.observe(renderer.canvas);
    document.addEventListener("visibilitychange", this.handleVisibility);
  }

  setView(camera: CameraView, detailState: DetailState): void {
    this.renderer.setView(camera, detailState);
    this.renderOnce();
  }

  setLight(light: WorldLight): void {
    this.renderer.setLight(light);
    if (!this.running) this.renderOnce();
  }

  setActive(active: boolean): void {
    if (active) {
      this.start();
      return;
    }
    this.running = false;
    this.lastTimestamp = 0;
    if (this.frameRequest) {
      cancelAnimationFrame(this.frameRequest);
      this.frameRequest = 0;
    }
  }

  destroy(): void {
    this.running = false;
    if (this.frameRequest) cancelAnimationFrame(this.frameRequest);
    this.resizeObserver?.disconnect();
    document.removeEventListener("visibilitychange", this.handleVisibility);
    this.renderer.destroy();
  }

  private readonly tick = (timestamp: number): void => {
    this.frameRequest = 0;
    if (!this.running || document.hidden) return;
    if (this.lastTimestamp > 0) {
      this.elapsedSeconds += Math.min(
        0.05,
        Math.max(0, (timestamp - this.lastTimestamp) / 1000),
      );
    }
    this.lastTimestamp = timestamp;
    this.renderer.render(this.elapsedSeconds);
    this.schedule();
  };

  private readonly handleVisibility = (): void => {
    this.lastTimestamp = 0;
    if (document.hidden && this.frameRequest) {
      cancelAnimationFrame(this.frameRequest);
      this.frameRequest = 0;
    } else if (this.running) {
      this.schedule();
    }
  };

  private start(): void {
    this.renderOnce();
    if (this.reduceMotion || this.running) return;
    this.running = true;
    this.lastTimestamp = 0;
    this.schedule();
  }

  private schedule(): void {
    if (!this.frameRequest && this.running && !document.hidden) {
      this.frameRequest = requestAnimationFrame(this.tick);
    }
  }

  private renderOnce(): void {
    this.renderer.render(this.elapsedSeconds);
  }
}
