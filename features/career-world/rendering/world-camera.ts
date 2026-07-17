import type { WorldPoint } from "../model/world-registry";

export type WorldCamera = Readonly<{ center: WorldPoint; zoom: number }>;

export const MIN_WORLD_ZOOM = 1;
export const MAX_WORLD_ZOOM = 6;
export const WORLD_STAGE_WIDTH = 1600;
export const WORLD_STAGE_HEIGHT = 900;
export const WORLD_CAMERA: WorldCamera = Object.freeze({
  center: Object.freeze({ x: 800, y: 450 }),
  zoom: 1,
});

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export function constrainWorldCamera(camera: WorldCamera): WorldCamera {
  const zoom = clamp(camera.zoom, MIN_WORLD_ZOOM, MAX_WORLD_ZOOM);
  const halfWidth = WORLD_STAGE_WIDTH / (2 * zoom);
  const halfHeight = WORLD_STAGE_HEIGHT / (2 * zoom);

  return Object.freeze({
    center: Object.freeze({
      x: clamp(camera.center.x, halfWidth, WORLD_STAGE_WIDTH - halfWidth),
      y: clamp(camera.center.y, halfHeight, WORLD_STAGE_HEIGHT - halfHeight),
    }),
    zoom,
  });
}

export function cameraForPoint(point: WorldPoint, zoom: number): WorldCamera {
  return constrainWorldCamera({
    center: point,
    zoom,
  });
}

export function worldToScreen(
  point: WorldPoint,
  camera: WorldCamera,
  viewport: { width: number; height: number },
): WorldPoint {
  return {
    x: viewport.width / 2 + (point.x - camera.center.x) * camera.zoom,
    y: viewport.height / 2 + (point.y - camera.center.y) * camera.zoom,
  };
}

export function screenToWorld(
  point: WorldPoint,
  camera: WorldCamera,
  viewport: { width: number; height: number },
): WorldPoint {
  return {
    x: camera.center.x + (point.x - viewport.width / 2) / camera.zoom,
    y: camera.center.y + (point.y - viewport.height / 2) / camera.zoom,
  };
}

export function zoomCameraAt(
  camera: WorldCamera,
  anchor: WorldPoint,
  requestedZoom: number,
  viewport: { width: number; height: number },
): WorldCamera {
  const zoom = clamp(requestedZoom, MIN_WORLD_ZOOM, MAX_WORLD_ZOOM);
  const worldAnchor = screenToWorld(anchor, camera, viewport);
  return constrainWorldCamera({
    center: {
      x: worldAnchor.x - (anchor.x - viewport.width / 2) / zoom,
      y: worldAnchor.y - (anchor.y - viewport.height / 2) / zoom,
    },
    zoom,
  });
}

export function panCameraByScreenDelta(
  camera: WorldCamera,
  delta: WorldPoint,
): WorldCamera {
  return constrainWorldCamera({
    center: {
      x: camera.center.x - delta.x / camera.zoom,
      y: camera.center.y - delta.y / camera.zoom,
    },
    zoom: camera.zoom,
  });
}

export function lodForZoom(zoom: number) {
  if (zoom >= 4) return "project" as const;
  if (zoom >= 2) return "city" as const;
  return "world" as const;
}

export function semanticLodForFocus(
  zoom: number,
  hasEmployerFocus: boolean,
  hasProjectFocus: boolean,
): "world" | "city" | "project" {
  if (hasProjectFocus) return "project" as const;
  if (hasEmployerFocus) return "city" as const;
  return lodForZoom(zoom) === "world" ? "world" as const : "city" as const;
}

export function svgCameraTransform(camera: WorldCamera) {
  return `translate(${800 - camera.center.x * camera.zoom} ${450 - camera.center.y * camera.zoom}) scale(${camera.zoom})`;
}
