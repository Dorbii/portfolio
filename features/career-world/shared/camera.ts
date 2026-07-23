export type Pair = readonly [number, number];

export interface CameraView {
  readonly origin: Pair;
  readonly span: Pair;
}

export const WORLD_CAMERA_VIEW: CameraView = Object.freeze({
  origin: Object.freeze([0, 0] as [number, number]),
  span: Object.freeze([1, 1] as [number, number]),
});

export const DEFAULT_MINIMUM_SPAN = 0.1;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function finitePair(value: Pair, label: string): Pair {
  if (
    !Array.isArray(value)
    || value.length !== 2
    || value.some((entry) => !Number.isFinite(entry))
  ) {
    throw new TypeError(`${label} must contain two finite numbers.`);
  }
  return value;
}

export function normalizeCameraView(
  view: CameraView,
  minimumSpan = DEFAULT_MINIMUM_SPAN,
): CameraView {
  if (!Number.isFinite(minimumSpan) || minimumSpan <= 0 || minimumSpan > 1) {
    throw new RangeError("Camera minimum span must be within (0, 1].");
  }

  const rawOrigin = finitePair(view.origin, "Camera origin");
  const span = finitePair(view.span, "Camera span").map((value) =>
    clamp(value, minimumSpan, 1)
  ) as [number, number];

  return Object.freeze({
    origin: Object.freeze(rawOrigin.map((value, index) =>
      clamp(value, 0, Math.max(0, 1 - span[index]))
    ) as [number, number]),
    span: Object.freeze(span),
  });
}

export function zoomCameraViewAt(
  view: CameraView,
  viewportAnchor: Pair,
  scale: number,
  minimumSpan = DEFAULT_MINIMUM_SPAN,
): CameraView {
  if (!Number.isFinite(scale) || scale <= 0) {
    throw new RangeError("Camera zoom scale must be positive.");
  }

  const normalized = normalizeCameraView(view, minimumSpan);
  const anchor = finitePair(viewportAnchor, "Camera zoom anchor").map((value) =>
    clamp(value, 0, 1)
  ) as [number, number];
  const span = normalized.span.map((value) =>
    clamp(value * scale, minimumSpan, 1)
  ) as [number, number];
  const worldAnchor = normalized.origin.map(
    (value, index) => value + anchor[index] * normalized.span[index],
  );

  return normalizeCameraView({
    origin: worldAnchor.map(
      (value, index) => value - anchor[index] * span[index],
    ) as [number, number],
    span,
  }, minimumSpan);
}

export function panCameraViewByPixels(
  view: CameraView,
  delta: Pair,
  viewportSize: Pair,
): CameraView {
  const normalized = normalizeCameraView(view);
  const [deltaX, deltaY] = finitePair(delta, "Camera pan delta");
  const [width, height] = finitePair(viewportSize, "Camera viewport size");

  if (width <= 0 || height <= 0) {
    throw new RangeError("Camera viewport dimensions must be positive.");
  }

  return normalizeCameraView({
    origin: [
      normalized.origin[0] - (deltaX / width) * normalized.span[0],
      normalized.origin[1] - (deltaY / height) * normalized.span[1],
    ],
    span: normalized.span,
  });
}

export function interpolateCameraView(
  from: CameraView,
  to: CameraView,
  progress: number,
): CameraView {
  const start = normalizeCameraView(from);
  const target = normalizeCameraView(to);
  const amount = clamp(progress, 0, 1);
  const eased = 1 - Math.pow(1 - amount, 3);
  const startCenter = start.origin.map(
    (value, index) => value + start.span[index] * 0.5,
  );
  const targetCenter = target.origin.map(
    (value, index) => value + target.span[index] * 0.5,
  );
  const span = start.span.map((value, index) =>
    Math.exp(
      Math.log(value)
      + (Math.log(target.span[index]) - Math.log(value)) * eased,
    )
  ) as [number, number];
  const center = startCenter.map(
    (value, index) =>
      value + (targetCenter[index] - value) * eased,
  );

  return normalizeCameraView({
    origin: center.map(
      (value, index) => value - span[index] * 0.5,
    ) as [number, number],
    span,
  });
}

export function cameraLayerStyle(view: CameraView) {
  const normalized = normalizeCameraView(view);
  return {
    width: `${100 / normalized.span[0]}%`,
    height: `${100 / normalized.span[1]}%`,
    left: `${(-normalized.origin[0] / normalized.span[0]) * 100}%`,
    top: `${(-normalized.origin[1] / normalized.span[1]) * 100}%`,
  };
}
