/* eslint-disable @next/next/no-img-element -- Career World art is prebuilt and optimized WebP. */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";

import {
  sceneNodes,
  type SceneNode,
} from "../model/scene-composition";
import {
  careerWorldRegistry,
  employerById,
  projectById,
  type CareerProjectId,
  type EmployerId,
  type WorldPoint,
} from "../model/world-registry";
import {
  detailForZoom,
  detailIncludes,
  panCameraByScreenDelta,
  visibleSceneNodes,
  zoomCameraAt,
  type WorldCamera,
} from "../rendering/world-camera";
import { runtimeArtPath } from "../rendering/runtime-art";

type WorldSceneProps = {
  camera: WorldCamera;
  focusEmployerId: EmployerId | null;
  focusProjectId: CareerProjectId | null;
  reducedMotion: boolean;
  onCameraChange: (camera: WorldCamera) => void;
  onEmployer: (employerId: EmployerId) => void;
  onProject: (projectId: CareerProjectId, target?: HTMLElement) => void;
};

const SCENE_SIZE = Object.freeze({ width: 1600, height: 900 });
const CULL_OVERSCAN_SCREEN_PIXELS = 180;
const CULLING_REFRESH_SCREEN_PIXELS = 72;

const assetLabelById = new Map(
  careerWorldRegistry.assets.map((asset) => [asset.id, asset.label]),
);

type FrameMetrics = Readonly<{
  scale: number;
  left: number;
  top: number;
}>;

function frameMetrics(width: number, height: number): FrameMetrics {
  const safeWidth = Math.max(width, 1);
  const safeHeight = Math.max(height, 1);
  const scale = Math.min(
    safeWidth / SCENE_SIZE.width,
    safeHeight / SCENE_SIZE.height,
  );
  return Object.freeze({
    scale,
    left: (safeWidth - SCENE_SIZE.width * scale) / 2,
    top: (safeHeight - SCENE_SIZE.height * scale) / 2,
  });
}

function cameraTransform(camera: WorldCamera): string {
  return `translate(${SCENE_SIZE.width / 2 - camera.center.x * camera.zoom}px, ${
    SCENE_SIZE.height / 2 - camera.center.y * camera.zoom
  }px) scale(${camera.zoom})`;
}

function nodeLabel(node: SceneNode): string | null {
  if (node.kind === "ambient") return null;
  if (node.kind === "capital") {
    return employerById.get(node.employerId)?.label ?? null;
  }
  if (node.kind === "project" && node.projectId) {
    return projectById.get(node.projectId)?.label ?? null;
  }
  return assetLabelById.get(node.assetId) ?? null;
}

type SceneArtNodeProps = Readonly<{
  node: SceneNode;
  detail: ReturnType<typeof detailForZoom>;
  focusEmployerId: EmployerId | null;
  focusProjectId: CareerProjectId | null;
  linkedSkillInstanceIds: ReadonlySet<string>;
  onEmployer: (employerId: EmployerId) => void;
  onProject: (projectId: CareerProjectId, target?: HTMLElement) => void;
  activate: (action: () => void) => void;
}>;

function SceneArtNode({
  node,
  detail,
  focusEmployerId,
  focusProjectId,
  linkedSkillInstanceIds,
  onEmployer,
  onProject,
  activate,
}: SceneArtNodeProps) {
  const label = nodeLabel(node);
  const focused =
    (node.kind === "capital" &&
      focusEmployerId === node.employerId &&
      focusProjectId === null) ||
    (node.kind === "project" && node.projectId === focusProjectId);
  const linked =
    node.kind === "skill" && linkedSkillInstanceIds.has(node.instanceId);
  const contextual =
    detail !== "world" &&
    (focusProjectId
      ? !focused && !linked && node.employerId !== focusEmployerId
      : focusEmployerId !== null && node.employerId !== focusEmployerId);
  const labelInFocus =
    detail === "world" ||
    focusEmployerId === null ||
    node.employerId === focusEmployerId;
  const showLabel =
    label !== null &&
    labelInFocus &&
    node.labelDetail !== null &&
    detailIncludes(detail, node.labelDetail);
  const content = (
    <>
      <img
        className="career-world-scene-node-art"
        data-art-asset={node.assetId}
        src={runtimeArtPath(node.assetId, node.employerId)}
        alt=""
        loading={node.kind === "capital" ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
      />
      {showLabel ? (
        <span className="career-world-scene-node-label">{label}</span>
      ) : null}
    </>
  );
  const className = `career-world-scene-node is-${node.kind}${
    focused ? " is-focused" : ""
  }${linked ? " is-linked" : ""}${contextual ? " is-context" : ""}`;
  const style = {
    left: node.position.x,
    top: node.position.y,
    width: node.visualWidth,
    transform: `translate(${-node.groundAnchor.x * 100}%, ${
      -node.groundAnchor.y * 100
    }%)`,
    "--node-footprint-width": `${node.footprint.width}px`,
    "--node-footprint-depth": `${node.footprint.depth}px`,
  } as CSSProperties;
  const data = {
    "data-scene-layer": "scene-node",
    "data-instance-id": node.instanceId,
    "data-position-x": node.position.x,
    "data-position-y": node.position.y,
    "data-min-detail": node.minDetail,
    "data-palette": node.paletteId,
    "data-footprint": node.footprintClass,
  };

  if (node.kind === "capital") {
    return (
      <button
        type="button"
        className={className}
        style={style}
        aria-label={`Open ${label ?? node.employerId} city`}
        data-map-select="employer"
        {...data}
        onClick={(event) => {
          event.stopPropagation();
          activate(() => onEmployer(node.employerId));
        }}
      >
        {content}
      </button>
    );
  }

  if (node.kind === "project" && node.projectId) {
    return (
      <button
        type="button"
        className={className}
        style={style}
        aria-label={`Open ${label ?? node.projectId} project`}
        data-map-select="project"
        data-project-control={node.projectId}
        {...data}
        onClick={(event) => {
          event.stopPropagation();
          const target = event.currentTarget;
          activate(() => onProject(node.projectId!, target));
        }}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={className} style={style} aria-hidden="true" {...data}>
      {content}
    </div>
  );
}

export function WorldScene({
  camera,
  focusEmployerId,
  focusProjectId,
  reducedMotion,
  onCameraChange,
  onEmployer,
  onProject,
}: WorldSceneProps) {
  const detail = detailForZoom(camera.zoom);
  const sceneRef = useRef<HTMLDivElement>(null);
  const cameraLayerRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef(camera);
  const lastCullingCameraRef = useRef(camera);
  const onCameraChangeRef = useRef(onCameraChange);
  const [viewportSize, setViewportSize] = useState<{
    width: number;
    height: number;
  }>(SCENE_SIZE);
  const dragRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);
  const pendingDeltaRef = useRef<WorldPoint>({ x: 0, y: 0 });
  const frameRequestRef = useRef<number | null>(null);
  const wheelCommitRef = useRef<number | null>(null);
  const interactionReleaseRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    cameraRef.current = camera;
    lastCullingCameraRef.current = camera;
    if (cameraLayerRef.current) {
      cameraLayerRef.current.style.transform = cameraTransform(camera);
    }
  }, [camera]);

  useEffect(() => {
    onCameraChangeRef.current = onCameraChange;
  }, [onCameraChange]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || typeof ResizeObserver === "undefined") return;
    const updateSize = () => {
      const rect = scene.getBoundingClientRect();
      setViewportSize((current) =>
        Math.abs(current.width - rect.width) < 0.5 &&
        Math.abs(current.height - rect.height) < 0.5
          ? current
          : { width: rect.width, height: rect.height },
      );
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(scene);
    return () => observer.disconnect();
  }, []);

  useEffect(
    () => () => {
      if (frameRequestRef.current !== null) {
        cancelAnimationFrame(frameRequestRef.current);
      }
      if (wheelCommitRef.current !== null) {
        window.clearTimeout(wheelCommitRef.current);
      }
      if (interactionReleaseRef.current !== null) {
        cancelAnimationFrame(interactionReleaseRef.current);
      }
    },
    [],
  );

  const setInteracting = (interacting: boolean) => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (interacting) {
      if (interactionReleaseRef.current !== null) {
        cancelAnimationFrame(interactionReleaseRef.current);
        interactionReleaseRef.current = null;
      }
      scene.dataset.interacting = "true";
      return;
    }
    interactionReleaseRef.current = requestAnimationFrame(() => {
      interactionReleaseRef.current = null;
      delete scene.dataset.interacting;
    });
  };

  const refreshCullingWindow = (nextCamera: WorldCamera, force = false) => {
    const current = lastCullingCameraRef.current;
    const screenDelta = Math.max(
      Math.abs(nextCamera.center.x - current.center.x) * nextCamera.zoom,
      Math.abs(nextCamera.center.y - current.center.y) * nextCamera.zoom,
    );
    if (
      !force &&
      screenDelta < CULLING_REFRESH_SCREEN_PIXELS &&
      detailForZoom(current.zoom) === detailForZoom(nextCamera.zoom)
    ) {
      return;
    }
    lastCullingCameraRef.current = nextCamera;
    onCameraChangeRef.current(nextCamera);
  };

  const paintCamera = (nextCamera: WorldCamera) => {
    cameraRef.current = nextCamera;
    refreshCullingWindow(nextCamera);
    if (cameraLayerRef.current) {
      cameraLayerRef.current.style.transform = cameraTransform(nextCamera);
    }
  };

  const applyPendingPan = () => {
    const delta = pendingDeltaRef.current;
    pendingDeltaRef.current = { x: 0, y: 0 };
    if (delta.x === 0 && delta.y === 0) return;
    paintCamera(panCameraByScreenDelta(cameraRef.current, delta));
  };

  const schedulePan = () => {
    if (frameRequestRef.current !== null) return;
    frameRequestRef.current = requestAnimationFrame(() => {
      frameRequestRef.current = null;
      applyPendingPan();
    });
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if (
      event.target instanceof Element &&
      event.target.closest("[data-map-select]")
    ) {
      return;
    }
    if (wheelCommitRef.current !== null) {
      window.clearTimeout(wheelCommitRef.current);
      wheelCommitRef.current = null;
      onCameraChangeRef.current(cameraRef.current);
    }
    setInteracting(true);
    suppressClickRef.current = false;
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const metrics = frameMetrics(
      event.currentTarget.clientWidth,
      event.currentTarget.clientHeight,
    );
    const deltaX = (event.clientX - drag.x) / metrics.scale;
    const deltaY = (event.clientY - drag.y) / metrics.scale;
    if (Math.abs(deltaX) + Math.abs(deltaY) > 1) drag.moved = true;
    drag.x = event.clientX;
    drag.y = event.clientY;
    pendingDeltaRef.current = {
      x: pendingDeltaRef.current.x + deltaX,
      y: pendingDeltaRef.current.y + deltaY,
    };
    schedulePan();
  };

  const finishPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    suppressClickRef.current = event.type === "pointercancel" ? false : drag.moved;
    dragRef.current = null;
    if (frameRequestRef.current !== null) {
      cancelAnimationFrame(frameRequestRef.current);
      frameRequestRef.current = null;
    }
    applyPendingPan();
    refreshCullingWindow(cameraRef.current, true);
    setInteracting(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    setInteracting(true);
    const rect = event.currentTarget.getBoundingClientRect();
    const metrics = frameMetrics(rect.width, rect.height);
    const anchor = {
      x: (event.clientX - rect.left - metrics.left) / metrics.scale,
      y: (event.clientY - rect.top - metrics.top) / metrics.scale,
    };
    const zoomFactor = event.deltaY < 0 ? 1.16 : 1 / 1.16;
    paintCamera(
      zoomCameraAt(
        cameraRef.current,
        anchor,
        cameraRef.current.zoom * zoomFactor,
        SCENE_SIZE,
      ),
    );
    if (wheelCommitRef.current !== null) {
      window.clearTimeout(wheelCommitRef.current);
    }
    wheelCommitRef.current = window.setTimeout(() => {
      wheelCommitRef.current = null;
      refreshCullingWindow(cameraRef.current, true);
      setInteracting(false);
    }, 90);
  };

  const activate = (action: () => void) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    action();
  };

  const visibleNodes = useMemo(
    () =>
      [...visibleSceneNodes(
        sceneNodes,
        camera,
        CULL_OVERSCAN_SCREEN_PIXELS,
      )].sort((left, right) =>
        left.position.y === right.position.y
          ? left.position.x - right.position.x
          : left.position.y - right.position.y,
      ),
    [camera],
  );
  const renderedDetail = detail;
  const linkedSkillInstanceIds = useMemo(
    () =>
      new Set(
        focusProjectId
          ? careerWorldRegistry.projectSkillLinks
              .filter((link) => link.projectId === focusProjectId)
              .map((link) => link.skillInstanceId)
          : [],
      ),
    [focusProjectId],
  );
  const metrics = frameMetrics(viewportSize.width, viewportSize.height);

  return (
    <div
      ref={sceneRef}
      className="career-world-scene"
      data-lod={detail}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      role="region"
      aria-label="Interactive Career World map"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointer}
      onPointerCancel={finishPointer}
      onWheel={handleWheel}
      onClick={() => {
        if (suppressClickRef.current) suppressClickRef.current = false;
      }}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        touchAction: "none",
      }}
    >
      <div
        className="career-world-stage"
        data-scene-layer="stage"
        style={{
          position: "absolute",
          width: SCENE_SIZE.width,
          height: SCENE_SIZE.height,
          transformOrigin: "0 0",
          transform: `translate(${metrics.left}px, ${metrics.top}px) scale(${metrics.scale})`,
        }}
      >
        <div
          ref={cameraLayerRef}
          className={`career-world-camera career-world-detail-${detail}`}
          style={{
            position: "absolute",
            inset: 0,
            transformOrigin: "0 0",
            transform: cameraTransform(camera),
            transitionDuration: reducedMotion ? "0ms" : undefined,
          }}
        >
          <div
            className="career-world-world-layer"
            data-scene-layer="world-art"
            style={{ position: "absolute", inset: 0 }}
          >
            <img
              className="career-world-world-art"
              data-art-asset="world/career-world@v1"
              src={runtimeArtPath("world/career-world@v1")}
              alt=""
              loading="eager"
              decoding="async"
              fetchPriority="high"
              draggable={false}
            />
            {detail === "world" ? (
              <div
                className="career-world-coordinate-grid"
                data-scene-layer="coordinate-grid"
                data-grid-major-unit="100"
                data-grid-half-unit="50"
                data-grid-minor-unit="20"
                aria-hidden="true"
              />
            ) : null}
          </div>

          <div
            className="career-world-scene-nodes"
            data-scene-layer="scene-nodes"
            data-visible-node-count={visibleNodes.length}
            style={{ position: "absolute", inset: 0 }}
          >
            {visibleNodes.map((node) => (
              <SceneArtNode
                key={node.instanceId}
                node={node}
                detail={renderedDetail}
                focusEmployerId={focusEmployerId}
                focusProjectId={focusProjectId}
                linkedSkillInstanceIds={linkedSkillInstanceIds}
                onEmployer={onEmployer}
                onProject={onProject}
                activate={activate}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
