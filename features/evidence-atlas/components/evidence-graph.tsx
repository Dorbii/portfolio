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
import {
  nodeDomainById,
  nodeDomainCssColor,
} from "../model/node-domains";
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
  semanticNodeTokenReveal,
  SELECTION_WAKE_DURATION_MS,
  type SelectionWake,
} from "../rendering/particle-field";
import {
  MOTION_ACTIVE_FRAME_INTERVAL,
  POINTER_MOTION_ACTIVE_MS,
  shouldPaintMotionFrame,
} from "../rendering/render-schedule";

const BASE_PIXEL_RATIO_LIMIT = 1.5;
const MOTION_PIXEL_RATIO_LIMIT = 1;
const SELECTION_WAKE_THROTTLE_MS = 520;

type EvidenceGraphProps = {
  selectedIds: string[];
  previewId: string | null;
  activeProjectId: string | null;
  inspectorOpen: boolean;
  selectionLimit: number;
  onPreview: (id: string | null) => void;
  onToggle: (id: string) => void;
};

export function EvidenceGraph({
  selectedIds,
  previewId,
  activeProjectId,
  inspectorOpen,
  selectionLimit,
  onPreview,
  onToggle,
}: EvidenceGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const motionCanvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<Point | null>(null);
  const lastPointerMotionAtRef = useRef(Number.NEGATIVE_INFINITY);
  const panRef = useRef<{
    pointerId: number;
    clientX: number;
    clientY: number;
    viewport: typeof DEFAULT_GRAPH_VIEWPORT;
  } | null>(null);
  const lastWakeAtRef = useRef(Number.NEGATIVE_INFINITY);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const [viewport, setViewport] = useState(DEFAULT_GRAPH_VIEWPORT);
  const [isPanning, setIsPanning] = useState(false);
  const [selectionWake, setSelectionWake] = useState<SelectionWake | null>(
    null,
  );
  const viewportOcclusion = useMemo(
    () => ({
      right: inspectorOpen
        ? Math.min(520, Math.max(0, size.width - 32))
        : 0,
    }),
    [inspectorOpen, size.width],
  );
  const surfaceStyle = {
    "--graph-controls-right": `${viewportOcclusion.right + 20}px`,
    "--semantic-detail-opacity": semanticNodeTokenReveal(viewport.scale),
  } as CSSProperties;
  const resolutionIds = useMemo(
    () => (selectedIds.length > 0 ? selectedIds : previewId ? [previewId] : []),
    [previewId, selectedIds],
  );
  const queryResolution = useMemo(
    () => resolveEvidenceQuery(resolutionIds, activeProjectId),
    [activeProjectId, resolutionIds],
  );
  const particleResolution = useMemo(
    () => resolveEvidenceQuery(selectedIds, activeProjectId),
    [activeProjectId, selectedIds],
  );

  useEffect(() => {
    if (!selectionWake) return;
    const wakeStartedAt = selectionWake.startedAt;
    const timeout = window.setTimeout(() => {
      setSelectionWake((current) =>
        current?.startedAt === wakeStartedAt ? null : current,
      );
    }, SELECTION_WAKE_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, [selectionWake]);

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
    const canvas = baseCanvasRef.current;
    if (!canvas || size.width <= 0 || size.height <= 0) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const pixelRatio = Math.min(
      window.devicePixelRatio || 1,
      BASE_PIXEL_RATIO_LIMIT,
    );
    canvas.width = Math.floor(size.width * pixelRatio);
    canvas.height = Math.floor(size.height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

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
      context,
      size,
      positions,
      particleResolution,
      interaction,
    );
  }, [
    particleResolution,
    positions,
    size,
    viewport,
    viewportOcclusion.right,
  ]);

  useEffect(() => {
    const canvas = motionCanvasRef.current;
    if (!canvas || size.width <= 0 || size.height <= 0) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const pixelRatio = Math.min(
      window.devicePixelRatio || 1,
      MOTION_PIXEL_RATIO_LIMIT,
    );
    canvas.width = Math.floor(size.width * pixelRatio);
    canvas.height = Math.floor(size.height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const interaction = {
      viewport,
      cursor: null,
      motionEnabled: !reducedMotion,
      occludedRight: viewportOcclusion.right,
    };
    const hasSemanticActivity =
      resolutionIds.length > 0 ||
      activeProjectId !== null ||
      selectionWake !== null;

    let animationFrame = 0;
    let previousFrame = -MOTION_ACTIVE_FRAME_INTERVAL;
    const paint = (time: number) => {
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.globalCompositeOperation = "source-over";
      context.clearRect(0, 0, size.width, size.height);
      drawParticleFieldMotion(
        context,
        size,
        positions,
        particleResolution,
        previewId,
        activeProjectId,
        selectionWake,
        time,
        {
          ...interaction,
          cursor: cursorRef.current,
        },
      );
    };

    const render = (time: number) => {
      const pointerActive =
        time - lastPointerMotionAtRef.current <= POINTER_MOTION_ACTIVE_MS;
      const activeMotion = hasSemanticActivity || pointerActive || isPanning;
      if (shouldPaintMotionFrame(time - previousFrame, activeMotion)) {
        paint(time);
        previousFrame = time;
      }
      animationFrame = window.requestAnimationFrame(render);
    };

    paint(performance.now());
    if (!reducedMotion) {
      animationFrame = window.requestAnimationFrame(render);
    }
    return () => window.cancelAnimationFrame(animationFrame);
  }, [
    activeProjectId,
    isPanning,
    positions,
    previewId,
    particleResolution,
    resolutionIds.length,
    selectionWake,
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
      lastPointerMotionAtRef.current = performance.now();
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
      lastPointerMotionAtRef.current = performance.now();
      event.currentTarget.setPointerCapture(event.pointerId);
      setIsPanning(true);
    },
    [viewport],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const local = localPoint(event.clientX, event.clientY);
      if (local) {
        cursorRef.current = screenPointToGraph(local, viewport);
        lastPointerMotionAtRef.current = performance.now();
      }
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

  const handleNodeToggle = useCallback(
    (nodeId: string, selected: boolean) => {
      const now = performance.now();
      if (
        !selected &&
        selectedIds.length < selectionLimit &&
        now - lastWakeAtRef.current >= SELECTION_WAKE_THROTTLE_MS
      ) {
        lastWakeAtRef.current = now;
        setSelectionWake({ nodeId, startedAt: now });
      }
      onToggle(nodeId);
    },
    [onToggle, selectedIds.length, selectionLimit],
  );

  return (
    <div
      className={`graph-surface ${isPanning ? "is-panning" : ""}`}
      style={surfaceStyle}
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopPanning}
      onPointerCancel={stopPanning}
      onPointerLeave={() => {
        if (!panRef.current) cursorRef.current = null;
      }}
    >
      <canvas
        ref={baseCanvasRef}
        className="graph-field-base"
        aria-hidden="true"
      />
      <canvas
        ref={motionCanvasRef}
        className="graph-field-motion"
        aria-hidden="true"
      />
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
            "--node-color": nodeDomainCssColor(node.primaryDomain),
          } as CSSProperties;
          const domain = nodeDomainById[node.primaryDomain];

          return (
            <button
              key={node.id}
              type="button"
              data-node-id={node.id}
              className={`graph-node domain-${node.primaryDomain} ${selected ? "is-selected" : ""} ${previewId === node.id ? "is-preview" : ""} ${related ? "" : "is-muted"}`}
              style={style}
              aria-label={`${node.label}, ${domain.label}`}
              aria-pressed={selected}
              onMouseEnter={() => onPreview(node.id)}
              onMouseLeave={() => onPreview(null)}
              onFocus={() => onPreview(node.id)}
              onBlur={() => onPreview(null)}
              onClick={() => handleNodeToggle(node.id, selected)}
            >
              <i aria-hidden="true" />
              <span>{node.label}</span>
              <small className="graph-node-domain" aria-hidden="true">
                {domain.label}
              </small>
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
