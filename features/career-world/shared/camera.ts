export type Pair = readonly [number, number];

export interface CameraView {
  readonly origin: Pair;
  readonly span: Pair;
}

export const WORLD_CAMERA_VIEW: CameraView = Object.freeze({
  origin: Object.freeze([0, 0] as [number, number]),
  span: Object.freeze([1, 1] as [number, number]),
});

export const CAMERA_MINIMUM_SPAN = 0.02;

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
  minimumSpan = CAMERA_MINIMUM_SPAN,
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
  minimumSpan = CAMERA_MINIMUM_SPAN,
): CameraView {
  if (!Number.isFinite(scale) || scale <= 0) {
    throw new RangeError("Camera zoom scale must be positive.");
  }

  const normalized = normalizeCameraView(view, minimumSpan);
  const anchor = finitePair(viewportAnchor, "Camera zoom anchor").map((value) =>
    clamp(value, 0, 1)
  ) as [number, number];
  const minimumScale = Math.max(
    ...normalized.span.map((value) => minimumSpan / value),
  );
  const maximumScale = Math.min(
    ...normalized.span.map((value) => 1 / value),
  );
  const boundedScale = clamp(scale, minimumScale, maximumScale);
  const span = normalized.span.map((value) =>
    value * boundedScale
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

export function constrainCameraViewToBounds(
  view: CameraView,
  bounds: CameraView,
): CameraView {
  const normalized = normalizeCameraView(view);
  const boundsOrigin = finitePair(bounds.origin, "Camera bounds origin");
  const boundsSpan = finitePair(bounds.span, "Camera bounds span");
  if (
    boundsOrigin.some((value) => value < 0 || value > 1)
    || boundsSpan.some((value) => value <= 0 || value > 1)
    || boundsOrigin.some((value, index) => value + boundsSpan[index] > 1)
    || normalized.span.some((value, index) => value > boundsSpan[index])
  ) {
    throw new RangeError("Camera bounds must contain the normalized camera view.");
  }
  return Object.freeze({
    origin: Object.freeze(boundsOrigin.map((value, index) => (
      clamp(
        normalized.origin[index],
        value,
        value + boundsSpan[index] - normalized.span[index],
      )
    )) as [number, number]),
    span: normalized.span,
  });
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
  const scaleX = 1 / normalized.span[0];
  const scaleY = 1 / normalized.span[1];
  const translateX = -normalized.origin[0] * scaleX * 100;
  const translateY = -normalized.origin[1] * scaleY * 100;

  return {
    width: "100%",
    height: "100%",
    left: "0",
    top: "0",
    transformOrigin: "0 0",
    transform:
      `translate3d(${translateX}%, ${translateY}%, 0) `
      + `scale(${scaleX}, ${scaleY})`,
  };
}

export function cameraViewBox(view: CameraView, dimensions: Pair): string {
  const normalized = normalizeCameraView(view);
  const [width, height] = finitePair(
    dimensions,
    "Camera view-box dimensions",
  );
  if (width <= 0 || height <= 0) {
    throw new RangeError("Camera view-box dimensions must be positive.");
  }

  return [
    normalized.origin[0] * width,
    normalized.origin[1] * height,
    normalized.span[0] * width,
    normalized.span[1] * height,
  ].join(" ");
}

/**
 * Expand a camera span so its on-screen aspect matches the viewport.
 *
 * Layers render the camera region through an SVG viewBox with
 * `preserveAspectRatio="none"`, so any mismatch between the span's aspect and
 * the viewport's is drawn as a stretch. Spans are authored as constants (the
 * capital envelope is `[0.25, 1/3]`) and cannot be correct for every viewport,
 * and `normalizeCameraView` clamps each axis independently — so one axis can
 * saturate at 1 while the other keeps growing, skewing the world part-way
 * through a zoom or an LoD transition.
 *
 * Correcting here keeps the requested region visible and only ever reveals
 * more world, never crops.
 */
export function fitCameraViewToViewport(
  view: CameraView,
  viewportSize: Pair,
  planeSize: Pair,
  minimumSpan = CAMERA_MINIMUM_SPAN,
): CameraView {
  const normalized = normalizeCameraView(view, minimumSpan);
  const [viewportWidth, viewportHeight] = finitePair(
    viewportSize,
    "Camera viewport size",
  );
  const [planeWidth, planeHeight] = finitePair(planeSize, "Camera plane size");
  if (viewportWidth <= 0 || viewportHeight <= 0) {
    return normalized;
  }
  if (planeWidth <= 0 || planeHeight <= 0) {
    throw new RangeError("Camera plane dimensions must be positive.");
  }

  // Undistorted when spanY / spanX === (planeWidth / planeHeight) / (viewportWidth / viewportHeight).
  const targetRatio = (planeWidth / planeHeight)
    / (viewportWidth / viewportHeight);
  const [spanX, spanY] = normalized.span;
  let fittedX = spanX;
  let fittedY = spanY;
  if (spanY / spanX < targetRatio) {
    fittedY = spanX * targetRatio;
  } else {
    fittedX = spanY / targetRatio;
  }

  // Expansion can overrun the plane; give back the overrun on the other axis so
  // the ratio survives wherever the world is large enough to hold it.
  if (fittedY > 1) {
    fittedY = 1;
    fittedX = Math.min(1, fittedY / targetRatio);
  }
  if (fittedX > 1) {
    fittedX = 1;
    fittedY = Math.min(1, fittedX * targetRatio);
  }

  const center = normalized.origin.map(
    (value, index) => value + normalized.span[index] * 0.5,
  ) as [number, number];
  const span = [fittedX, fittedY] as [number, number];

  return normalizeCameraView({
    origin: center.map(
      (value, index) => value - span[index] * 0.5,
    ) as [number, number],
    span,
  }, minimumSpan);
}
