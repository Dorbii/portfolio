import type { CameraView } from "../../../shared/camera";
import type { DetailState } from "../../../shared/lod";
import type { WorldLight } from "../../../shared/lighting";
import type { WaterSurfaceState } from "../model/state";
import { WaterSurfaceRenderer } from "./WaterSurfaceRenderer";

/**
 * Keeps the clock running while the page reports itself hidden.
 *
 * Only for ?water.capture, whose purpose is measuring the live layer from
 * outside. Foam and spray are INTEGRATED over seconds, so a paused simulation
 * renders water that has never had any surf in it -- and a capture flag that
 * cannot capture a running simulation is worse than none, because it returns a
 * confident picture of the wrong thing. Headless preview panes report hidden
 * while still compositing, which is exactly where this bites.
 */
function capturesWhileHidden(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("water.capture");
}

const CAMERA_SETTLE_DURATION_MS = 180;
const OCEAN_FRAME_INTERVAL_MS = 1000 / 30;
const FRAME_INTERVAL_TOLERANCE_MS = 2;

export class WaterSurfaceController {
  private readonly renderer: WaterSurfaceRenderer;
  private readonly resizeObserver: ResizeObserver | null;
  private readonly reduceMotion: boolean;
  private frameRequest = 0;
  private resizeFrameRequest = 0;
  private cameraSettleTimer: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private elapsedSeconds = 0;
  private lastTimestamp = 0;
  private viewSignature = "";
  private readonly captureWhileHidden = capturesWhileHidden();

  constructor(
    renderer: WaterSurfaceRenderer,
    options: { readonly reduceMotion: boolean },
  ) {
    this.renderer = renderer;
    this.reduceMotion = options.reduceMotion;
    this.resizeObserver = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(() => {
        this.renderer.requestResize();
        if (!this.resizeFrameRequest) {
          this.resizeFrameRequest = requestAnimationFrame(() => {
            this.resizeFrameRequest = 0;
            this.renderOnce();
          });
        }
      });
    this.resizeObserver?.observe(renderer.canvas);
    document.addEventListener("visibilitychange", this.handleVisibility);
  }

  setView(camera: CameraView, detailState: DetailState): void {
    const viewSignature = [
      ...camera.origin,
      ...camera.span,
      detailState.renderScale,
      detailState.shouldLoadTerritoryAssets,
    ].join(",");
    // WorldScene can re-publish an equivalent DetailState while other scene
    // work settles. That is not camera motion: cancelling the rAF chain here
    // turns an otherwise cheap ocean into an intermittently rendered surface.
    if (viewSignature === this.viewSignature) return;
    this.viewSignature = viewSignature;
    this.renderer.setView(camera, detailState);
    this.suspendContinuousAnimationForCameraMotion();
    // Camera-dependent transparency sits above the DOM land plate. Render the
    // new view immediately so both layers reach the next paint atomically.
    this.renderOnce();
  }

  setLight(light: WorldLight): void {
    this.renderer.setLight(light);
    this.renderIfIdle();
  }

  setCoastalAmbience(visible: boolean): void {
    this.renderer.setCoastalAmbience(visible);
    this.renderIfIdle();
  }

  setState(state: Partial<WaterSurfaceState>): void {
    this.renderer.setState(state);
    this.renderIfIdle();
  }

  setActive(active: boolean): void {
    if (active) {
      this.start();
      return;
    }
    this.running = false;
    this.lastTimestamp = 0;
    this.clearCameraSettleTimer();
    if (this.frameRequest) {
      cancelAnimationFrame(this.frameRequest);
      this.frameRequest = 0;
    }
  }

  start(): void {
    this.renderOnce();
    if (this.reduceMotion || this.running) {
      return;
    }
    this.running = true;
    this.lastTimestamp = 0;
    this.schedule();
  }

  destroy(): void {
    this.running = false;
    this.clearCameraSettleTimer();
    if (this.frameRequest) {
      cancelAnimationFrame(this.frameRequest);
    }
    if (this.resizeFrameRequest) {
      cancelAnimationFrame(this.resizeFrameRequest);
    }
    this.resizeObserver?.disconnect();
    document.removeEventListener("visibilitychange", this.handleVisibility);
    this.renderer.destroy();
  }

  private readonly tick = (timestamp: number): void => {
    this.frameRequest = 0;
    if (!this.running || (document.hidden && !this.captureWhileHidden)) {
      return;
    }

    if (
      this.lastTimestamp > 0
      && timestamp - this.lastTimestamp
        < OCEAN_FRAME_INTERVAL_MS - FRAME_INTERVAL_TOLERANCE_MS
    ) {
      this.schedule();
      return;
    }

    // The wave field is a function of time, but foam and spray are integrated,
    // so the step needs the interval as well as the clock.
    let step = 0;
    if (this.lastTimestamp > 0) {
      const raw = (timestamp - this.lastTimestamp) / 1000;
      step = Math.min(this.captureWhileHidden ? 1.5 : 0.05, Math.max(0, raw));
      if (!this.captureWhileHidden || !document.hidden) this.elapsedSeconds += step;
    }
    this.lastTimestamp = timestamp;
    if (this.captureWhileHidden && document.hidden) {
      // Browsers clamp timers on a hidden page to one second, and the step is
      // capped at 50 ms so a long stall cannot advect foam half a screen. Those
      // two together advance the simulation twenty times slower than real time,
      // which is its own kind of lie: the capture would show a sea that has had
      // a quarter-second of surf in it. Catch up in whole frames instead.
      const frames = Math.min(45, Math.round(step / (OCEAN_FRAME_INTERVAL_MS / 1000)));
      for (let i = 0; i < frames; i += 1) {
        this.elapsedSeconds += OCEAN_FRAME_INTERVAL_MS / 1000;
        this.renderer.render(this.elapsedSeconds, OCEAN_FRAME_INTERVAL_MS / 1000);
      }
      this.schedule();
      return;
    }
    this.renderer.render(this.elapsedSeconds, step);
    this.schedule();
  };

  private readonly handleVisibility = (): void => {
    this.lastTimestamp = 0;
    if (document.hidden && !this.captureWhileHidden && this.frameRequest) {
      cancelAnimationFrame(this.frameRequest);
      this.frameRequest = 0;
    } else if (this.running) {
      this.schedule();
    }
  };

  private schedule(): void {
    if (this.frameRequest || !this.running) return;
    if (document.hidden) {
      if (!this.captureWhileHidden) return;
      // A hidden page gets no animation frames at all, so drive the clock off a
      // timer instead. Only reachable under ?water.capture.
      this.frameRequest = window.setTimeout(
        () => this.tick(performance.now()),
        OCEAN_FRAME_INTERVAL_MS,
      ) as unknown as number;
      return;
    }
    this.frameRequest = requestAnimationFrame(this.tick);
  }

  private suspendContinuousAnimationForCameraMotion(): void {
    if (!this.running || this.reduceMotion) {
      return;
    }
    if (this.frameRequest) {
      cancelAnimationFrame(this.frameRequest);
      this.frameRequest = 0;
    }
    this.lastTimestamp = 0;
    this.clearCameraSettleTimer();
    this.cameraSettleTimer = setTimeout(() => {
      this.cameraSettleTimer = null;
      this.schedule();
    }, CAMERA_SETTLE_DURATION_MS);
  }

  private clearCameraSettleTimer(): void {
    if (this.cameraSettleTimer !== null) {
      clearTimeout(this.cameraSettleTimer);
      this.cameraSettleTimer = null;
    }
  }

  // A still frame: the wave field is redrawn at the current clock, but foam and
  // spray are not advanced, so repainting for a resize or a camera nudge cannot
  // age the surf.
  private renderOnce(): void {
    this.renderer.render(this.elapsedSeconds, 0);
  }

  private renderIfIdle(): void {
    if (!this.running) {
      this.renderOnce();
    }
  }
}
