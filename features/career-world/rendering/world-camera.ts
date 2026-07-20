import type { WorldPoint } from "../model/world-registry";
import type {
  DetailTier,
  SceneNode,
  WorldRect,
} from "../model/scene-composition";

export type WorldCamera = Readonly<{ center: WorldPoint; zoom: number }>;

export const MIN_WORLD_ZOOM = 1;
export const MAX_WORLD_ZOOM = 4;
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

export function unionWorldRects(rects: readonly WorldRect[]): WorldRect {
  if (rects.length === 0) {
    return Object.freeze({ x: 0, y: 0, width: WORLD_STAGE_WIDTH, height: WORLD_STAGE_HEIGHT });
  }
  const left = Math.min(...rects.map((rect) => rect.x));
  const top = Math.min(...rects.map((rect) => rect.y));
  const right = Math.max(...rects.map((rect) => rect.x + rect.width));
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.height));
  return Object.freeze({ x: left, y: top, width: right - left, height: bottom - top });
}

export function cameraForWorldRect(
  bounds: WorldRect,
  maxZoom = MAX_WORLD_ZOOM,
  screenGutter = 0,
): WorldCamera {
  const usableWidth = Math.max(1, WORLD_STAGE_WIDTH - screenGutter * 2);
  const usableHeight = Math.max(1, WORLD_STAGE_HEIGHT - screenGutter * 2);
  const zoom = Math.min(
    maxZoom,
    usableWidth / Math.max(1, bounds.width),
    usableHeight / Math.max(1, bounds.height),
  );
  return constrainWorldCamera({
    center: {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    },
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

const DETAIL_RANK: Readonly<Record<DetailTier, number>> = Object.freeze({
  world: 0,
  territory: 1,
  district: 2,
  close: 3,
});

export function detailForZoom(zoom: number): DetailTier {
  if (zoom >= 3.5) return "close";
  if (zoom >= 2.55) return "district";
  if (zoom >= 1.45) return "territory";
  return "world";
}

export function detailIncludes(
  current: DetailTier,
  minimum: DetailTier,
): boolean {
  return DETAIL_RANK[current] >= DETAIL_RANK[minimum];
}

export function worldViewportRect(
  camera: WorldCamera,
  overscanScreenPixels = 0,
): WorldRect {
  const overscan = overscanScreenPixels / camera.zoom;
  const width = WORLD_STAGE_WIDTH / camera.zoom + overscan * 2;
  const height = WORLD_STAGE_HEIGHT / camera.zoom + overscan * 2;
  return Object.freeze({
    x: camera.center.x - width / 2,
    y: camera.center.y - height / 2,
    width,
    height,
  });
}

export function rectsIntersect(left: WorldRect, right: WorldRect): boolean {
  return !(
    left.x + left.width < right.x ||
    right.x + right.width < left.x ||
    left.y + left.height < right.y ||
    right.y + right.height < left.y
  );
}

export function sceneNodeBounds(node: SceneNode): WorldRect {
  const width = Math.max(node.footprint.width, node.visualWidth);
  const height = Math.max(node.footprint.depth, node.visualWidth * 1.45);
  return Object.freeze({
    x: node.position.x - width / 2,
    y: node.position.y - height,
    width,
    height: height + node.footprint.depth / 2,
  });
}

export function visibleSceneNodes(
  nodes: readonly SceneNode[],
  camera: WorldCamera,
  overscanScreenPixels = 260,
): readonly SceneNode[] {
  const detail = detailForZoom(camera.zoom);
  const viewport = worldViewportRect(camera, overscanScreenPixels);
  return nodes.filter(
    (node) =>
      detailIncludes(detail, node.minDetail) &&
      rectsIntersect(viewport, sceneNodeBounds(node)),
  );
}

export function svgCameraTransform(camera: WorldCamera) {
  return `translate(${800 - camera.center.x * camera.zoom} ${450 - camera.center.y * camera.zoom}) scale(${camera.zoom})`;
}
