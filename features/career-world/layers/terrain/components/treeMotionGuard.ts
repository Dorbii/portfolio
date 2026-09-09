// The animation's frame-interval guard, separated from React so stall and
// recovery sequences can be checked with a deterministic clock.
const LONG_FRAME_MS = 60;
const VERY_LONG_FRAME_MS = 120;
const PATIENCE_MS = 1500;
const RETRY_MS = 10000;
const UNCOUNTED_GAP_MS = 500;
type GuardMode = "full" | "half" | "stopped";

export function createTreeMotionGuard(startedAt: number) {
  let lastFrameAt = startedAt;
  let frameMs = 16;
  let longSince = 0;
  let calmSince = 0;
  let mode: GuardMode = "full";
  let changedAt = startedAt;
  return {
    resetTiming(now: number) {
      lastFrameAt = now;
    },
    update(now: number): { mode: GuardMode; frameMs: number } {
      const gap = now - lastFrameAt;
      lastFrameAt = now;
      if (gap < UNCOUNTED_GAP_MS) frameMs += (gap - frameMs) * 0.1;
      if (mode === "stopped") {
        if (now - changedAt > RETRY_MS) {
          mode = "full";
          changedAt = now;
          frameMs = 16;
          longSince = calmSince = 0;
        }
        return { mode, frameMs };
      }
      // Loading can trip half rate. Restore full motion after sustained
      // headroom rather than keeping that penalty for the whole session.
      if (mode === "half" && frameMs < LONG_FRAME_MS * 0.75) {
        if (!calmSince) calmSince = now;
        if (now - calmSince > PATIENCE_MS) {
          mode = "full";
          changedAt = now;
          longSince = calmSince = 0;
        }
      } else {
        calmSince = 0;
      }
      const threshold = mode === "full" ? LONG_FRAME_MS : VERY_LONG_FRAME_MS;
      if (frameMs > threshold) {
        if (!longSince) longSince = now;
        if (now - longSince > PATIENCE_MS) {
          mode = mode === "full" ? "half" : "stopped";
          changedAt = now;
          longSince = 0;
        }
      } else {
        longSince = 0;
      }
      return { mode, frameMs };
    },
  };
}
