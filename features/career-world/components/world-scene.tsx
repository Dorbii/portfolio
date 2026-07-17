/* eslint-disable @next/next/no-img-element -- The promoted Career World art is already cropped and optimized WebP. */

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";

import {
  scenePlacementsByEmployer,
  type ScenePlacement,
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
  panCameraByScreenDelta,
  semanticLodForFocus,
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
  onProject: (projectId: CareerProjectId) => void;
};

const SCENE_SIZE = Object.freeze({ width: 1600, height: 900 });

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

function nearestEmployer(point: WorldPoint): EmployerId {
  return careerWorldRegistry.employers.reduce((nearest, candidate) => {
    const nearestDistance =
      (nearest.anchor.x - point.x) ** 2 + (nearest.anchor.y - point.y) ** 2;
    const candidateDistance =
      (candidate.anchor.x - point.x) ** 2 +
      (candidate.anchor.y - point.y) ** 2;
    return candidateDistance < nearestDistance ? candidate : nearest;
  }).id;
}

function cameraTransform(camera: WorldCamera): string {
  return `translate(${SCENE_SIZE.width / 2 - camera.center.x * camera.zoom}px, ${
    SCENE_SIZE.height / 2 - camera.center.y * camera.zoom
  }px) scale(${camera.zoom})`;
}

function projectRoutePath(anchor: WorldPoint, placement: ScenePlacement): string {
  const bendY = Math.min(anchor.y, placement.position.y) - 22;
  return `M ${anchor.x} ${anchor.y} Q ${
    (anchor.x + placement.position.x) / 2
  } ${bendY} ${placement.position.x} ${placement.position.y}`;
}

function skillRoutePath(project: WorldPoint, skill: WorldPoint): string {
  const dx = skill.x - project.x;
  const dy = skill.y - project.y;
  const bend = Math.min(28, Math.hypot(dx, dy) * 0.14);
  return `M ${project.x} ${project.y} Q ${
    (project.x + skill.x) / 2 - Math.sign(dy || 1) * bend
  } ${(project.y + skill.y) / 2 + Math.sign(dx || 1) * bend} ${skill.x} ${
    skill.y
  }`;
}

const ART_ENVELOPES = Object.freeze({
  capital: Object.freeze({ width: 132, height: 96 }),
  project: Object.freeze({ width: 104, height: 90 }),
  skill: Object.freeze({ width: 76, height: 68 }),
});

function artEnvelope(kind: ScenePlacement["kind"]) {
  return ART_ENVELOPES[kind];
}

type ArtInstanceProps = Readonly<{
  placement: ScenePlacement;
  focused?: boolean;
  linked?: boolean;
  context?: boolean;
  onProject: (projectId: CareerProjectId) => void;
  activate: (action: () => void) => void;
}>;

function ArtInstance({
  placement,
  focused = false,
  linked = false,
  context = false,
  onProject,
  activate,
}: ArtInstanceProps) {
  const isProject = placement.kind === "project";
  const position = placement.position;
  const envelope = artEnvelope(placement.kind);
  const label = isProject
    ? projectById.get(placement.projectId!)?.label
    : assetLabelById.get(placement.assetId);
  const content = (
    <>
      <img
        className="career-world-art-image"
        data-art-asset={placement.assetId}
        src={runtimeArtPath(placement.assetId)}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
      />
      {label && <span className="career-world-art-label">{label}</span>}
    </>
  );

  return (
    <figure
      className={`career-world-art-instance is-${placement.kind}${
        focused ? " is-focused" : ""
      }${linked ? " is-linked" : ""}${context ? " is-context" : ""}`}
      data-scene-layer="instance-art"
      data-instance-id={placement.instanceId}
      data-position-x={position.x}
      data-position-y={position.y}
      style={
        {
          "--art-x": `${position.x}px`,
          "--art-y": `${position.y}px`,
          "--art-width": `${envelope.width}px`,
          "--art-height": `${envelope.height}px`,
          left: position.x,
          top: position.y,
          width: envelope.width,
          height: envelope.height,
          margin: 0,
          position: "absolute",
          transform: "translate(-50%, -50%)",
        } as CSSProperties
      }
    >
      {isProject ? (
        <button
          type="button"
          className="career-world-art-button career-world-art-card"
          data-map-select="project"
          tabIndex={-1}
          onClick={(event) => {
            event.stopPropagation();
            activate(() => onProject(placement.projectId!));
          }}
        >
          {content}
        </button>
      ) : (
        <div className="career-world-art-card">{content}</div>
      )}
    </figure>
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
  const lod = semanticLodForFocus(
    camera.zoom,
    focusEmployerId !== null,
    focusProjectId !== null,
  );
  const inferredEmployerId = nearestEmployer(camera.center);
  const activeEmployerId =
    focusEmployerId ?? (lod === "world" ? null : inferredEmployerId);
  const activeEmployer = activeEmployerId
    ? employerById.get(activeEmployerId) ?? null
    : null;
  const activePlacements = activeEmployerId
    ? scenePlacementsByEmployer.get(activeEmployerId) ?? []
    : [];
  const focusedProjectPlacement = focusProjectId
    ? activePlacements.find(
        (placement) => placement.projectId === focusProjectId,
      ) ?? null
    : null;
  const linkedSkillInstanceIds = new Set(
    focusProjectId
      ? careerWorldRegistry.projectSkillLinks
          .filter((link) => link.projectId === focusProjectId)
          .map((link) => link.skillInstanceId)
      : [],
  );
  const linkedSkillPlacements = activePlacements.filter(
    (placement) =>
      placement.kind === "skill" &&
      linkedSkillInstanceIds.has(placement.instanceId),
  );
  const sceneRef = useRef<HTMLDivElement>(null);
  const cameraLayerRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef(camera);
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

  const paintCamera = (nextCamera: WorldCamera) => {
    cameraRef.current = nextCamera;
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
    if (drag.moved) onCameraChangeRef.current(cameraRef.current);
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
    const nextCamera = zoomCameraAt(
      cameraRef.current,
      anchor,
      cameraRef.current.zoom * zoomFactor,
      SCENE_SIZE,
    );
    paintCamera(nextCamera);
    if (wheelCommitRef.current !== null) {
      window.clearTimeout(wheelCommitRef.current);
    }
    wheelCommitRef.current = window.setTimeout(() => {
      wheelCommitRef.current = null;
      onCameraChangeRef.current(cameraRef.current);
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

  const metrics = frameMetrics(viewportSize.width, viewportSize.height);
  const cityPlacements = activePlacements.filter(
    (placement) =>
      placement.kind === "capital" ||
      placement.kind === "project" ||
      placement.kind === "skill",
  );

  return (
    <div
      ref={sceneRef}
      className="career-world-scene"
      data-lod={lod}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      aria-hidden="true"
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
          className={`career-world-camera career-world-lod-${lod}`}
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
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>

          {lod === "world" && (
            <div
              className="career-world-world-cities"
              data-scene-layer="world-cities"
              style={{ position: "absolute", inset: 0 }}
            >
              {careerWorldRegistry.employers.map((employer) => {
                const position = employer.anchor;
                return (
                  <button
                    key={employer.id}
                    type="button"
                    className="career-world-city-pad"
                    data-map-select="employer"
                    tabIndex={-1}
                    onClick={(event) => {
                      event.stopPropagation();
                      activate(() => onEmployer(employer.id));
                    }}
                    style={{
                      position: "absolute",
                      left: position.x,
                      top: position.y,
                      width: 132,
                      height: 96,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <img
                      className="career-world-city-pad-art"
                      data-art-asset={employer.assetId}
                      src={runtimeArtPath(employer.assetId)}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                    />
                    <span className="career-world-city-pad-label">
                      {employer.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {lod !== "world" && activeEmployer && (
            <div
              className={`career-world-district-layer${
                focusedProjectPlacement ? " career-world-project-layer" : ""
              }`}
              data-scene-layer={
                focusedProjectPlacement ? "project-art" : "city-art"
              }
              style={{ position: "absolute", inset: 0 }}
            >
              <svg
                className={`career-world-route-overlay${
                  focusedProjectPlacement
                    ? " career-world-project-route-overlay"
                    : ""
                }`}
                data-scene-layer="routes"
                viewBox="0 0 1600 900"
                aria-hidden="true"
                style={{ position: "absolute", inset: 0 }}
              >
                {focusedProjectPlacement
                  ? linkedSkillPlacements.map((placement) => (
                    <path
                      key={placement.instanceId}
                      d={skillRoutePath(
                        focusedProjectPlacement.position,
                        placement.position,
                      )}
                    />
                  ))
                  : cityPlacements
                      .filter((placement) => placement.kind === "project")
                      .map((placement) => (
                        <path
                          key={placement.instanceId}
                          d={projectRoutePath(activeEmployer.anchor, placement)}
                        />
                      ))}
              </svg>
              {cityPlacements.map((placement) => {
                const focused = placement.projectId === focusProjectId;
                const linked = linkedSkillInstanceIds.has(placement.instanceId);
                return (
                  <ArtInstance
                    key={placement.instanceId}
                    placement={placement}
                    focused={focused}
                    linked={linked}
                    context={Boolean(focusProjectId) && !focused && !linked}
                    onProject={onProject}
                    activate={activate}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
