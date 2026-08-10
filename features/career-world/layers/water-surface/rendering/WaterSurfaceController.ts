import type { CameraView } from "../../../shared/camera";
import type { DetailState } from "../../../shared/lod";
import type { WorldLight } from "../../../shared/lighting";
import type { NinjaOneEnvironmentNativeHydrologyAdmissionSnapshot } from "../../../development/model/ninjaOneEnvironmentResidency";
import type { WaterSurfaceState } from "../model/state";
import type { WaterSurfaceRenderer } from "./WaterSurfaceRenderer";

export class WaterSurfaceController {
  private readonly renderer: WaterSurfaceRenderer;
  private readonly resizeObserver: ResizeObserver | null;
  private reduceMotion: boolean;
  private frameRequest = 0;
  private running = false;
  private started = false;
  private active = true;
  private elapsedSeconds = 0;
  private lastTimestamp = 0;

  constructor(
    renderer: WaterSurfaceRenderer,
    options: { readonly reduceMotion: boolean },
  ) {
    this.renderer = renderer;
    this.reduceMotion = options.reduceMotion;
    this.renderer.setReduceMotion(options.reduceMotion);
    this.renderer.setInvalidationHandler(this.handleRendererInvalidation);
    this.resizeObserver = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(() => this.renderOnce());
    this.resizeObserver?.observe(renderer.canvas);
    document.addEventListener("visibilitychange", this.handleVisibility);
  }

  setView(
    camera: CameraView,
    detailState: DetailState,
    nativeHydrologyAdmission:
      NinjaOneEnvironmentNativeHydrologyAdmissionSnapshot | null = null,
  ): void {
    this.renderer.setView(camera, detailState, nativeHydrologyAdmission);
    // Camera-dependent transparency sits above the DOM land plate. Render the
    // new view immediately so both layers reach the next paint atomically.
    this.renderOnce();
  }

  setActive(active: boolean): void {
    if (this.active === active) {
      return;
    }
    this.active = active;
    this.lastTimestamp = 0;
    if (!active && this.frameRequest) {
      cancelAnimationFrame(this.frameRequest);
      this.frameRequest = 0;
      return;
    }
    if (active) {
      this.renderOnce();
      this.schedule();
    }
  }

  setLight(light: WorldLight): void {
    this.renderer.setLight(light);
    this.renderIfIdle();
  }

  setState(state: Partial<WaterSurfaceState>): void {
    this.renderer.setState(state);
    this.renderIfIdle();
  }

  setReduceMotion(reduceMotion: boolean): void {
    if (this.reduceMotion === reduceMotion) {
      return;
    }
    this.reduceMotion = reduceMotion;
    this.renderer.setReduceMotion(reduceMotion);
    this.lastTimestamp = 0;
    if (reduceMotion) {
      this.running = false;
      if (this.frameRequest) {
        cancelAnimationFrame(this.frameRequest);
        this.frameRequest = 0;
      }
      this.renderOnce();
      return;
    }
    if (this.started) {
      this.running = true;
      this.schedule();
    }
  }

  start(): void {
    this.started = true;
    if (this.active) {
      this.renderOnce();
    }
    if (this.reduceMotion || this.running) {
      return;
    }
    this.running = true;
    this.lastTimestamp = 0;
    this.schedule();
  }

  destroy(): void {
    this.started = false;
    this.running = false;
    if (this.frameRequest) {
      cancelAnimationFrame(this.frameRequest);
    }
    this.resizeObserver?.disconnect();
    document.removeEventListener("visibilitychange", this.handleVisibility);
    this.renderer.setInvalidationHandler(null);
    this.renderer.destroy();
  }

  private readonly handleRendererInvalidation = (): void => {
    this.renderOnce();
  };

  private readonly tick = (timestamp: number): void => {
    this.frameRequest = 0;
    if (!this.running || !this.active || document.hidden) {
      return;
    }

    if (this.lastTimestamp > 0) {
      this.elapsedSeconds += Math.min(
        0.25,
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
    } else if (this.running && this.active) {
      this.schedule();
    }
  };

  private schedule(): void {
    if (!this.frameRequest && this.running && this.active && !document.hidden) {
      this.frameRequest = requestAnimationFrame(this.tick);
    }
  }

  private renderOnce(): void {
    if (this.active) {
      this.renderer.render(this.elapsedSeconds);
    }
  }

  private renderIfIdle(): void {
    if (this.active && !this.running) {
      this.renderOnce();
    }
  }
}
