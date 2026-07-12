"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { graphNodes } from "../model/evidence-data";
import { resolveEvidenceQuery } from "../model/evidence-query";
import {
  computeLayout,
  type Point,
  type Size,
} from "../rendering/graph-layout";
import {
  clampGraphViewport,
  DEFAULT_GRAPH_VIEWPORT,
  graphPointToScreen,
  MAX_GRAPH_SCALE,
  MIN_GRAPH_SCALE,
  screenPointToGraph,
  zoomGraphViewportAt,
} from "../rendering/graph-viewport";
import {
  drawParticleFieldBase,
  drawParticleFieldMotion,
} from "../rendering/particle-field";

const PARTICLE_PIXEL_RATIO_LIMIT = 1.5;
const PARTICLE_FRAME_INTERVAL = 1000 / 30;

type EvidenceGraphProps = {
  selectedIds: string[];
  previewId: string | null;
  activeProjectId: string | null;
  inspectorOpen: boolean;
  onPreview: (id: string | null) => void;
  onToggle: (id: string) => void;
};

export function EvidenceGraph({
  selectedIds,
  previewId,
  activeProjectId,
  inspectorOpen,
  onPreview,
  onToggle,
}: EvidenceGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<Point | null>(null);
  const panRef = useRef<{
    pointerId: number;
    clientX: number;
    clientY: number;
    viewport: typeof DEFAULT_GRAPH_VIEWPORT;
  } | null>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const [viewport, setViewport] = useState(DEFAULT_GRAPH_VIEWPORT);
  const [isPanning, setIsPanning] = useState(false);
  const viewportOcclusion = useMemo(
    () => ({
      right: inspectorOpen
        ? Math.min(520, Math.max(0, size.width - 32))
        : 0,
    }),
    [inspectorOpen, size.width],
  );
  const resolutionIds = useMemo(
    () => (selectedIds.length > 0 ? selectedIds : previewId ? [previewId] : []),
    [previewId, selectedIds],
  );
  const queryResolution = useMemo(
    () => resolveEvidenceQuery(resolutionIds),
    [resolutionIds],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const bounds = container.getBoundingClientRect();
      setSize({ width: bounds.width, height: bounds.height });
    };
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    updateSize();
    return () => observer.disconnect();
  }, []);

  const positions = useMemo(() => computeLayout(size), [size]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width <= 0 || size.height <= 0) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const pixelRatio = Math.min(
      window.devicePixelRatio || 1,
      PARTICLE_PIXEL_RATIO_LIMIT,
    );
    canvas.width = Math.floor(size.width * pixelRatio);
    canvas.height = Math.floor(size.height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const baseCanvas = document.createElement("canvas");
    baseCanvas.width = canvas.width;
    baseCanvas.height = canvas.height;
    const baseContext = baseCanvas.getContext("2d");
    if (!baseContext) return;
    baseContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const interaction = {
      viewport,
      cursor: null,
      motionEnabled: !reducedMotion,
      occludedRight: viewportOcclusion.right,
    };
    drawParticleFieldBase(
      baseContext,
      size,
      positions,
      queryResolution,
      interaction,
    );

    let animationFrame = 0;
    let previousFrame = -PARTICLE_FRAME_INTERVAL;
    const paint = (time: number) => {
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.globalCompositeOperation = "source-over";
      context.clearRect(0, 0, size.width, size.height);
      context.drawImage(baseCanvas, 0, 0, size.width, size.height);
      drawParticleFieldMotion(
        context,
        size,
        positions,
        queryResolution,
        previewId,
        activeProjectId,
        time,
        {
          ...interaction,
          cursor: cursorRef.current,
        },
      );
    };

    const render = (time: number) => {
      if (time - previousFrame >= PARTICLE_FRAME_INTERVAL) {
        paint(time);
        previousFrame = time;
      }
      animationFrame = window.requestAnimationFrame(render);
    };

    paint(0);
    if (!reducedMotion) {
      animationFrame = window.requestAnimationFrame(render);
    }
    return () => window.cancelAnimationFrame(animationFrame);
  }, [
    activeProjectId,
    positions,
    previewId,
    queryResolution,
    size,
    viewport,
    viewportOcclusion.right,
  ]);

  const localPoint = useCallback((clientX: number, clientY: number) => {
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds) return null;
    return { x: clientX - bounds.left, y: clientY - bounds.top };
  }, []);

  const zoomAt = useCallback(
    (scale: number, anchor?: Point) => {
      const zoomAnchor = anchor ?? { x: size.width / 2, y: size.height / 2 };
      setViewport((current) =>
        zoomGraphViewportAt(
          current,
          size,
          zoomAnchor,
          scale,
          viewportOcclusion,
        ),
      );
    },
    [size, viewportOcclusion],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleWheel = (event: WheelEvent) => {
      const anchor = localPoint(event.clientX, event.clientY);
      if (!anchor) return;
      event.preventDefault();
      const zoomFactor = Math.exp(-event.deltaY * 0.0012);
      setViewport((current) =>
        zoomGraphViewportAt(
          current,
          size,
          anchor,
          current.scale * zoomFactor,
          viewportOcclusion,
        ),
      );
    };
    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [localPoint, size, viewportOcclusion]);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (
        event.button !== 0 ||
        (event.target as Element).closest("button, a")
      ) {
        return;
      }
      panRef.current = {
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
        viewport,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      setIsPanning(true);
    },
    [viewport],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const local = localPoint(event.clientX, event.clientY);
      if (local) cursorRef.current = screenPointToGraph(local, viewport);
      const pan = panRef.current;
      if (!pan || pan.pointerId !== event.pointerId) return;
      setViewport(
        clampGraphViewport(
          {
            ...pan.viewport,
            x: pan.viewport.x + event.clientX - pan.clientX,
            y: pan.viewport.y + event.clientY - pan.clientY,
          },
          size,
          viewportOcclusion,
        ),
      );
    },
    [localPoint, size, viewport, viewportOcclusion],
  );

  const stopPanning = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (panRef.current?.pointerId !== event.pointerId) return;
      panRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      setIsPanning(false);
    },
    [],
  );

  const relatedIds = useMemo(
    () => new Set(queryResolution.pathNodeIds),
    [queryResolution.pathNodeIds],
  );

  return (
    <div
      className={`graph-surface ${isPanning ? "is-panning" : ""}`}
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopPanning}
      onPointerCancel={stopPanning}
      onPointerLeave={() => {
        if (!panRef.current) cursorRef.current = null;
      }}
    >
      <canvas ref={canvasRef} aria-hidden="true" />
      <div className="node-layer">
        {graphNodes.map((node) => {
          const point = positions[node.id];
          if (!point) return null;
          const screenPoint = graphPointToScreen(point, viewport);
          const selected = selectedIds.includes(node.id);
          const related = resolutionIds.length === 0 || relatedIds.has(node.id);
          const style = {
            "--node-x": `${screenPoint.x}px`,
            "--node-y": `${screenPoint.y}px`,
          } as CSSProperties;

          return (
            <button
              key={node.id}
              type="button"
              className={`graph-node tone-${node.tone} ${selected ? "is-selected" : ""} ${previewId === node.id ? "is-preview" : ""} ${related ? "" : "is-muted"}`}
              style={style}
              aria-pressed={selected}
              onMouseEnter={() => onPreview(node.id)}
              onMouseLeave={() => onPreview(null)}
              onFocus={() => onPreview(node.id)}
              onBlur={() => onPreview(null)}
              onClick={() => onToggle(node.id)}
            >
              <i aria-hidden="true" />
              <span>{node.label}</span>
            </button>
          );
        })}
      </div>

      <div className="graph-viewport-controls" aria-label="Map view controls">
        <button
          type="button"
          aria-label="Zoom out"
          disabled={viewport.scale <= MIN_GRAPH_SCALE + 0.01}
          onClick={() => zoomAt(viewport.scale - 0.25)}
        >
          −
        </button>
        <button
          type="button"
          className="graph-viewport-reset"
          aria-label="Reset map view"
          onClick={() => setViewport(DEFAULT_GRAPH_VIEWPORT)}
        >
          {Math.round(viewport.scale * 100)}%
        </button>
        <button
          type="button"
          aria-label="Zoom in"
          disabled={viewport.scale >= MAX_GRAPH_SCALE - 0.01}
          onClick={() => zoomAt(viewport.scale + 0.25)}
        >
          +
        </button>
      </div>
    </div>
  );
}
