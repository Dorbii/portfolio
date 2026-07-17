import type { Point, Size } from "./graph-layout";

export type GraphViewport = {
  scale: number;
  x: number;
  y: number;
};

export type GraphViewportOcclusion = {
  right: number;
};

export const MIN_GRAPH_SCALE = 0.88;
export const MAX_GRAPH_SCALE = 4.5;
export const DEFAULT_GRAPH_VIEWPORT: GraphViewport = {
  scale: 1,
  x: 0,
  y: 0,
};

export const PROJECT_FOCUS_SCALE = 1.9;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function clampGraphViewport(
  viewport: GraphViewport,
  size: Size,
  occlusion: GraphViewportOcclusion = { right: 0 },
): GraphViewport {
  const scale = clamp(viewport.scale, MIN_GRAPH_SCALE, MAX_GRAPH_SCALE);
  const edgeAllowance = Math.min(
    120,
    Math.max(64, Math.min(size.width, size.height) * 0.1),
  );
  const overflowX = Math.max(0, size.width * scale - size.width);
  const overflowY = Math.max(0, size.height * scale - size.height);
  const rightOcclusion = Math.max(0, occlusion.right);

  return {
    scale,
    x: clamp(
      viewport.x,
      -overflowX - rightOcclusion - edgeAllowance,
      edgeAllowance,
    ),
    y: clamp(viewport.y, -overflowY - edgeAllowance, edgeAllowance),
  };
}

export function zoomGraphViewportAt(
  viewport: GraphViewport,
  size: Size,
  anchor: Point,
  requestedScale: number,
  occlusion: GraphViewportOcclusion = { right: 0 },
): GraphViewport {
  const scale = clamp(requestedScale, MIN_GRAPH_SCALE, MAX_GRAPH_SCALE);
  const world = screenPointToGraph(anchor, viewport);

  return clampGraphViewport(
    {
      scale,
      x: anchor.x - world.x * scale,
      y: anchor.y - world.y * scale,
    },
    size,
    occlusion,
  );
}

export function focusGraphViewportAt(
  point: Point,
  size: Size,
  requestedScale = PROJECT_FOCUS_SCALE,
  occlusion: GraphViewportOcclusion = { right: 0 },
): GraphViewport {
  const scale = clamp(requestedScale, MIN_GRAPH_SCALE, MAX_GRAPH_SCALE);
  const visibleWidth = Math.max(1, size.width - Math.max(0, occlusion.right));
  const anchor = {
    x: visibleWidth / 2,
    y: size.height * 0.52,
  };

  return clampGraphViewport(
    {
      scale,
      x: anchor.x - point.x * scale,
      y: anchor.y - point.y * scale,
    },
    size,
    occlusion,
  );
}

export function interpolateGraphViewport(
  from: GraphViewport,
  to: GraphViewport,
  progress: number,
): GraphViewport {
  const amount = clamp(progress, 0, 1);
  return {
    scale: from.scale + (to.scale - from.scale) * amount,
    x: from.x + (to.x - from.x) * amount,
    y: from.y + (to.y - from.y) * amount,
  };
}

export function graphPointToScreen(
  point: Point,
  viewport: GraphViewport,
): Point {
  return {
    x: point.x * viewport.scale + viewport.x,
    y: point.y * viewport.scale + viewport.y,
  };
}

export function screenPointToGraph(
  point: Point,
  viewport: GraphViewport,
): Point {
  return {
    x: (point.x - viewport.x) / viewport.scale,
    y: (point.y - viewport.y) / viewport.scale,
  };
}
