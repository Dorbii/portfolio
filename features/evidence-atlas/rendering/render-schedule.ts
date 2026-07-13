export const MOTION_ACTIVE_FRAME_INTERVAL = 1000 / 30;
export const MOTION_IDLE_FRAME_INTERVAL = 1000 / 15;
export const POINTER_MOTION_ACTIVE_MS = 700;
const FRAME_INTERVAL_EARLY_TOLERANCE = 1;

export function motionFrameInterval(active: boolean) {
  return active
    ? MOTION_ACTIVE_FRAME_INTERVAL
    : MOTION_IDLE_FRAME_INTERVAL;
}

export function shouldPaintMotionFrame(elapsed: number, active: boolean) {
  return (
    elapsed >=
    motionFrameInterval(active) - FRAME_INTERVAL_EARLY_TOLERANCE
  );
}
