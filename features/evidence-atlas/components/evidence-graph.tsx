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
import { graphNodes, traceById } from "../model/evidence-data";
import {
  nodeDomainById,
  nodeDomainCssColor,
} from "../model/node-domains";
import { resolveEvidenceQuery } from "../model/evidence-query";
import {
  PROJECT_ENTRY_DURATION_MS,
  PROJECT_EXIT_DURATION_MS,
  snapshotProjectViewport,
  type ProjectEntrySource,
  type ProjectReturnRequest,
  type ProjectTransitionRequest,
} from "../model/project-transition";
import {
  computeLayout,
  type Point,
  type Size,
} from "../rendering/graph-layout";
import {
  clampGraphViewport,
  DEFAULT_GRAPH_VIEWPORT,
  focusGraphViewportAt,
  graphPointToScreen,
  interpolateGraphViewport,
  MAX_GRAPH_SCALE,
  MIN_GRAPH_SCALE,
  screenPointToGraph,
  zoomGraphViewportAt,
  type GraphViewport,
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
import {
  computeProjectPortalLayout,
  projectPortalFootprint,
  PROJECT_PORTAL_ENTRY_SCALE,
  PROJECT_PORTAL_FOCUS_SCALE,
} from "../rendering/project-layout";
import { ProjectPortals } from "./project-portals";

const BASE_PIXEL_RATIO_LIMIT = 1.5;
const MOTION_PIXEL_RATIO_LIMIT = 1;
const PROJECT_HOVER_WAKE_DELAY_MS = 120;

type EvidenceGraphProps = {
  selectedIds: string[];
  activeProjectId: string | null;
  inspectorOpen: boolean;
  projectTransition: ProjectTransitionRequest | null;
  projectReturn: ProjectReturnRequest | null;
  projectStageActive: boolean;
  motionSuspended: boolean;
  onToggle: (id: string) => void;
  onPreloadProject: (projectId: string) => void;
  onOpenProject: (
    projectId: string,
    source: ProjectEntrySource,
    returnViewport: GraphViewport,
  ) => void;
  onProjectTransitionComplete: (request: ProjectTransitionRequest) => void;
  onProjectTransitionCancel: (requestId: number) => void;
  onProjectReturnComplete: (request: ProjectReturnRequest) => void;
};

export function EvidenceGraph({
  selectedIds,
  activeProjectId,
  inspectorOpen,
  projectTransition,
  projectReturn,
  projectStageActive,
  motionSuspended,
  onToggle,
  onPreloadProject,
  onOpenProject,
  onProjectTransitionComplete,
  onProjectTransitionCancel,
  onProjectReturnComplete,
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
  const projectHoverWakeTimerRef = useRef<number | null>(null);
  const lastProjectWakeRef = useRef<{
    projectId: string;
    startedAt: number;
  } | null>(null);
  const projectAnimationRef = useRef<number | null>(null);
  const projectRequestRef = useRef<number | null>(null);
  const projectReturnRequestRef = useRef<number | null>(null);
  const projectEntryLockRef = useRef<string | null>(null);
  const viewportRef = useRef(DEFAULT_GRAPH_VIEWPORT);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const [viewport, setViewport] = useState(DEFAULT_GRAPH_VIEWPORT);
  const [isPanning, setIsPanning] = useState(false);
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null);
  const [selectionWake, setSelectionWake] = useState<SelectionWake | null>(
    null,
  );
  const effectiveProjectId = projectTransition?.projectId ?? activeProjectId ?? null;
  const transitionNodeIds = useMemo(
    () =>
      new Set(
        projectTransition
          ? (traceById.get(projectTransition.projectId)?.nodeIds ?? [])
          : [],
      ),
    [projectTransition],
  );
  const viewportOcclusion = useMemo(
    () => ({
      right: inspectorOpen
        ? Math.min(520, Math.max(0, size.width - 32))
        : 0,
    }),
    [inspectorOpen, size.width],
  );
  const particleResolution = useMemo(
    () => resolveEvidenceQuery(selectedIds, effectiveProjectId),
    [effectiveProjectId, selectedIds],
  );

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

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

  useEffect(
    () => () => {
      if (projectHoverWakeTimerRef.current !== null) {
        window.clearTimeout(projectHoverWakeTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!projectTransition && !activeProjectId && !projectStageActive) return;
    if (projectHoverWakeTimerRef.current !== null) {
      window.clearTimeout(projectHoverWakeTimerRef.current);
      projectHoverWakeTimerRef.current = null;
    }
  }, [activeProjectId, projectStageActive, projectTransition]);

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

  const projectPositions = useMemo(
    () => computeProjectPortalLayout(size),
    [size],
  );
  const positions = useMemo(
    () => computeLayout(size, projectPositions),
    [projectPositions, size],
  );
  const transitionProjectPoint = projectTransition
    ? projectPositions[projectTransition.projectId]
    : null;
  const transitionScreenPoint = transitionProjectPoint
    ? graphPointToScreen(transitionProjectPoint, viewport)
    : { x: size.width / 2, y: size.height / 2 };
  const surfaceStyle = {
    "--graph-controls-right": `${viewportOcclusion.right + 20}px`,
    "--semantic-detail-opacity": semanticNodeTokenReveal(viewport.scale),
    "--project-warp-x": `${transitionScreenPoint.x}px`,
    "--project-warp-y": `${transitionScreenPoint.y}px`,
    "--project-entry-duration": `${PROJECT_ENTRY_DURATION_MS[projectTransition?.source ?? "activate"]}ms`,
    "--project-exit-duration": `${PROJECT_EXIT_DURATION_MS}ms`,
  } as CSSProperties;
  useEffect(() => {
    if (!projectTransition && !activeProjectId) {
      projectEntryLockRef.current = null;
    }
  }, [activeProjectId, projectTransition]);

  const cancelProjectTransition = useCallback(() => {
    if (projectAnimationRef.current !== null) {
      window.cancelAnimationFrame(projectAnimationRef.current);
      projectAnimationRef.current = null;
    }
    const requestId = projectRequestRef.current;
    projectRequestRef.current = null;
    if (requestId !== null) onProjectTransitionCancel(requestId);
  }, [onProjectTransitionCancel]);

  useEffect(() => {
    if (!projectTransition || size.width <= 0 || size.height <= 0) return;
    const projectPoint = projectPositions[projectTransition.projectId];
    if (!traceById.has(projectTransition.projectId) || !projectPoint) {
      onProjectTransitionCancel(projectTransition.requestId);
      return;
    }

    if (projectAnimationRef.current !== null) {
      window.cancelAnimationFrame(projectAnimationRef.current);
    }
    projectRequestRef.current = projectTransition.requestId;
    const from = viewportRef.current;
    const targetScale =
      projectTransition.source === "zoom"
        ? Math.max(from.scale, PROJECT_PORTAL_FOCUS_SCALE)
        : PROJECT_PORTAL_FOCUS_SCALE;
    const to = focusGraphViewportAt(
      projectPoint,
      size,
      targetScale,
      { right: 0 },
    );
    const duration = PROJECT_ENTRY_DURATION_MS[projectTransition.source];
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const finish = () => {
      if (projectRequestRef.current !== projectTransition.requestId) return;
      projectAnimationRef.current = null;
      projectRequestRef.current = null;
      viewportRef.current = to;
      setViewport(to);
      onProjectTransitionComplete(projectTransition);
    };

    if (reducedMotion) {
      finish();
      return;
    }

    const startedAt = performance.now();
    const animate = (now: number) => {
      if (projectRequestRef.current !== projectTransition.requestId) return;
      const progress = Math.min(
        1,
        Math.max(0, (now - startedAt) / duration),
      );
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = interpolateGraphViewport(from, to, eased);
      viewportRef.current = next;
      setViewport(next);
      if (progress >= 1) finish();
      else projectAnimationRef.current = window.requestAnimationFrame(animate);
    };
    projectAnimationRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (projectAnimationRef.current !== null) {
        window.cancelAnimationFrame(projectAnimationRef.current);
        projectAnimationRef.current = null;
      }
    };
  }, [
    onProjectTransitionCancel,
    onProjectTransitionComplete,
    projectPositions,
    projectTransition,
    size,
  ]);

  useEffect(() => {
    if (!projectReturn || size.width <= 0 || size.height <= 0) return;

    if (projectAnimationRef.current !== null) {
      window.cancelAnimationFrame(projectAnimationRef.current);
    }
    projectReturnRequestRef.current = projectReturn.requestId;
    const from = viewportRef.current;
    const to = snapshotProjectViewport(projectReturn.viewport);
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const finish = () => {
      if (projectReturnRequestRef.current !== projectReturn.requestId) return;
      projectAnimationRef.current = null;
      projectReturnRequestRef.current = null;
      viewportRef.current = to;
      setViewport(to);
      onProjectReturnComplete(projectReturn);
    };

    if (reducedMotion) {
      finish();
      return;
    }

    const startedAt = performance.now();
    const animate = (now: number) => {
      if (projectReturnRequestRef.current !== projectReturn.requestId) return;
      const progress = Math.min(
        1,
        Math.max(0, (now - startedAt) / PROJECT_EXIT_DURATION_MS),
      );
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = interpolateGraphViewport(from, to, eased);
      viewportRef.current = next;
      setViewport(next);
      if (progress >= 1) finish();
      else projectAnimationRef.current = window.requestAnimationFrame(animate);
    };
    projectAnimationRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (projectAnimationRef.current !== null) {
        window.cancelAnimationFrame(projectAnimationRef.current);
        projectAnimationRef.current = null;
      }
    };
  }, [onProjectReturnComplete, projectReturn, size.height, size.width]);

  useEffect(() => {
    if (!projectTransition || projectStageActive) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancelProjectTransition();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [cancelProjectTransition, projectStageActive, projectTransition]);

  useEffect(() => {
    const canvas = baseCanvasRef.current;
    if (!canvas || size.width <= 0 || size.height <= 0) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const pixelRatio = Math.min(
      window.devicePixelRatio || 1,
      BASE_PIXEL_RATIO_LIMIT,
    );
    const backingWidth = Math.floor(size.width * pixelRatio);
    const backingHeight = Math.floor(size.height * pixelRatio);
    if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
      canvas.width = backingWidth;
      canvas.height = backingHeight;
    }
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
      projectPositions,
    );
  }, [
    particleResolution,
    positions,
    projectPositions,
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
    const backingWidth = Math.floor(size.width * pixelRatio);
    const backingHeight = Math.floor(size.height * pixelRatio);
    if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
      canvas.width = backingWidth;
      canvas.height = backingHeight;
    }
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    if (motionSuspended) {
      context.clearRect(0, 0, size.width, size.height);
      return;
    }

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const hasSemanticActivity =
      selectedIds.length > 0 ||
      effectiveProjectId !== null ||
      selectionWake !== null;

    let animationFrame = 0;
    let previousFrame = -MOTION_ACTIVE_FRAME_INTERVAL;
    const paint = (time: number) => {
      const interaction = {
        viewport: viewportRef.current,
        cursor: cursorRef.current,
        motionEnabled: !reducedMotion,
        occludedRight: viewportOcclusion.right,
      };
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.globalCompositeOperation = "source-over";
      context.clearRect(0, 0, size.width, size.height);
      drawParticleFieldMotion(
        context,
        size,
        positions,
        particleResolution,
        effectiveProjectId,
        selectionWake,
        time,
        interaction,
        projectPositions,
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
    effectiveProjectId,
    isPanning,
    motionSuspended,
    positions,
    projectPositions,
    particleResolution,
    selectedIds.length,
    selectionWake,
    size,
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
      const next = zoomGraphViewportAt(
        viewportRef.current,
        size,
        zoomAnchor,
        scale,
        viewportOcclusion,
      );
      viewportRef.current = next;
      setViewport(next);
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
      if (projectTransition?.source === "zoom") return;
      if (projectTransition) cancelProjectTransition();
      lastPointerMotionAtRef.current = performance.now();
      const zoomFactor = Math.exp(-event.deltaY * 0.0012);
      const current = viewportRef.current;
      const next = zoomGraphViewportAt(
        current,
        size,
        anchor,
        current.scale * zoomFactor,
        viewportOcclusion,
      );
      viewportRef.current = next;
      setViewport(next);

      const target = event.target instanceof Element ? event.target : null;
      const projectButton = target?.closest<HTMLElement>("[data-project-id]");
      let projectId = projectButton?.dataset.projectId;
      if (!projectId) {
        const footprint = projectPortalFootprint(size.width);
        let nearestScore = Number.POSITIVE_INFINITY;
        for (const [candidateId, point] of Object.entries(projectPositions)) {
          const screenPoint = graphPointToScreen(point, current);
          const halfWidth = footprint.width / 2 + 24;
          const halfHeight = footprint.height / 2 + 24;
          const dx = Math.abs(screenPoint.x - anchor.x);
          const dy = Math.abs(screenPoint.y - anchor.y);
          if (dx > halfWidth || dy > halfHeight) continue;
          const score = Math.hypot(
            dx / halfWidth,
            dy / halfHeight,
          );
          if (score < nearestScore) {
            nearestScore = score;
            projectId = candidateId;
          }
        }
      }
      if (
        event.deltaY < 0 &&
        projectId &&
        next.scale >= PROJECT_PORTAL_ENTRY_SCALE &&
        !projectTransition &&
        !activeProjectId &&
        projectEntryLockRef.current === null
      ) {
        projectEntryLockRef.current = projectId;
        setHoveredProjectId(projectId);
        onOpenProject(projectId, "zoom", next);
      }
    };
    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [
    activeProjectId,
    cancelProjectTransition,
    localPoint,
    onOpenProject,
    projectPositions,
    projectTransition,
    size,
    viewportOcclusion,
  ]);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (
        event.button !== 0 ||
        (event.target as Element).closest("button, a")
      ) {
        return;
      }
      cancelProjectTransition();
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
    [cancelProjectTransition, viewport],
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
      const next = clampGraphViewport(
        {
          ...pan.viewport,
          x: pan.viewport.x + event.clientX - pan.clientX,
          y: pan.viewport.y + event.clientY - pan.clientY,
        },
        size,
        viewportOcclusion,
      );
      viewportRef.current = next;
      setViewport(next);
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

  const clearProjectHoverWakeTimer = useCallback(() => {
    if (projectHoverWakeTimerRef.current === null) return;
    window.clearTimeout(projectHoverWakeTimerRef.current);
    projectHoverWakeTimerRef.current = null;
  }, []);

  const triggerProjectWake = useCallback((projectId: string) => {
    const now = performance.now();
    const previous = lastProjectWakeRef.current;
    if (
      previous?.projectId === projectId &&
      now - previous.startedAt < SELECTION_WAKE_DURATION_MS
    ) {
      return;
    }
    lastProjectWakeRef.current = { projectId, startedAt: now };
    setSelectionWake({ sourceId: projectId, startedAt: now });
  }, []);

  const handleProjectHover = useCallback(
    (projectId: string | null, source: "pointer" | "keyboard") => {
      setHoveredProjectId(projectId);
      clearProjectHoverWakeTimer();
      if (
        !projectId ||
        projectTransition ||
        activeProjectId ||
        projectStageActive
      ) {
        return;
      }
      if (source === "keyboard") {
        triggerProjectWake(projectId);
        return;
      }
      projectHoverWakeTimerRef.current = window.setTimeout(() => {
        projectHoverWakeTimerRef.current = null;
        triggerProjectWake(projectId);
      }, PROJECT_HOVER_WAKE_DELAY_MS);
    },
    [
      activeProjectId,
      clearProjectHoverWakeTimer,
      projectStageActive,
      projectTransition,
      triggerProjectWake,
    ],
  );

  const handleProjectActivate = useCallback(
    (projectId: string) => {
      if (projectTransition) return;
      projectEntryLockRef.current = projectId;
      setHoveredProjectId(projectId);
      clearProjectHoverWakeTimer();
      onOpenProject(projectId, "activate", viewportRef.current);
    },
    [clearProjectHoverWakeTimer, onOpenProject, projectTransition],
  );

  return (
    <div
      className={`graph-surface ${isPanning ? "is-panning" : ""} ${projectTransition ? "is-project-transitioning" : ""} ${projectReturn ? "is-project-returning" : ""}`}
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
      <ProjectPortals
        positions={projectPositions}
        viewport={viewport}
        size={size}
        activeProjectId={effectiveProjectId}
        entryHintProjectId={
          viewport.scale >= 1.45 ? hoveredProjectId : null
        }
        onHoverProject={handleProjectHover}
        onPreloadProject={onPreloadProject}
        onOpenProject={handleProjectActivate}
      />
      <div className="node-layer">
        {graphNodes.map((node) => {
          const point = positions[node.id];
          if (!point) return null;
          const screenPoint = graphPointToScreen(point, viewport);
          const keyboardVisible =
            size.width === 0 ||
            (screenPoint.x >= 0 &&
              screenPoint.x <= size.width &&
              screenPoint.y >= 0 &&
              screenPoint.y <= size.height);
          const selected = selectedIds.includes(node.id);
          const projectFocused = transitionNodeIds.has(node.id);
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
              className={`graph-node domain-${node.primaryDomain} ${selected ? "is-selected" : ""} ${projectFocused ? "is-project-focus" : ""}`}
              style={style}
              aria-label={`${node.label}, ${domain.label}`}
              aria-pressed={selected}
              tabIndex={keyboardVisible ? 0 : -1}
              onClick={() => onToggle(node.id)}
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
          onClick={() => {
            cancelProjectTransition();
            zoomAt(viewport.scale - 0.25);
          }}
        >
          −
        </button>
        <button
          type="button"
          className="graph-viewport-reset"
          aria-label="Reset map view"
          onClick={() => {
            cancelProjectTransition();
            viewportRef.current = DEFAULT_GRAPH_VIEWPORT;
            setViewport(DEFAULT_GRAPH_VIEWPORT);
          }}
        >
          {Math.round(viewport.scale * 100)}%
        </button>
        <button
          type="button"
          aria-label="Zoom in"
          disabled={viewport.scale >= MAX_GRAPH_SCALE - 0.01}
          onClick={() => {
            cancelProjectTransition();
            zoomAt(viewport.scale + 0.25);
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}
