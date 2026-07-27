"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type WheelEvent,
} from "react";
import { WorldBackdrop } from "../layers/world-backdrop";
import {
  WaterSurfaceCanvas,
  type WaterRenderState,
} from "../layers/water-surface";
import {
  TERRITORIES,
  TerritoryLandform,
} from "../layers/territory-landform";
import { StructuresLayer } from "../layers/structures";
import { WorldInterface } from "../layers/interface";
import { DevelopmentOverlay } from "../development";
import {
  interpolateCameraView,
  normalizeCameraView,
  panCameraViewByPixels,
  WORLD_CAMERA_VIEW,
  zoomCameraViewAt,
  type CameraView,
} from "../shared/camera";
import { DETAIL_POLICY, resolveDetailState } from "../shared/lod";
import { WORLD_LIGHT } from "../shared/lighting";

interface WorldSceneProps {
  readonly enableDevelopmentTools: boolean;
  readonly initialInterfaceMode: "world" | "water";
}

interface DragState {
  readonly pointerId: number;
  readonly x: number;
  readonly y: number;
}

const FOCUS_DURATION_MS = 680;
const INTERACTIVE_TARGET_SELECTOR = [
  "button",
  "a",
  "input",
  "select",
  "textarea",
  "[role='button']",
].join(",");

export function WorldScene({
  enableDevelopmentTools,
  initialInterfaceMode,
}: WorldSceneProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<CameraView>(WORLD_CAMERA_VIEW);
  const cameraFrameRef = useRef(0);
  const dragRef = useRef<DragState | null>(null);
  const focusFrameRef = useRef(0);
  const [camera, setCamera] = useState<CameraView>(WORLD_CAMERA_VIEW);
  const [activeViewId, setActiveViewId] = useState("world");
  const [renderState, setRenderState] =
    useState<WaterRenderState>("loading");
  const [showTopography, setShowTopography] = useState(false);
  const [showTerritoryQa, setShowTerritoryQa] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const detailState = resolveDetailState(camera);

  const commitCamera = useCallback((next: CameraView) => {
    const normalized = normalizeCameraView(
      next,
      DETAIL_POLICY.cameraMinimumSpan,
    );
    if (cameraFrameRef.current) {
      cancelAnimationFrame(cameraFrameRef.current);
      cameraFrameRef.current = 0;
    }
    cameraRef.current = normalized;
    setCamera(normalized);
  }, []);

  const queueCamera = useCallback((next: CameraView) => {
    cameraRef.current = normalizeCameraView(
      next,
      DETAIL_POLICY.cameraMinimumSpan,
    );
    if (cameraFrameRef.current) {
      return;
    }

    cameraFrameRef.current = requestAnimationFrame(() => {
      cameraFrameRef.current = 0;
      setCamera(cameraRef.current);
    });
  }, []);

  const cancelFocusAnimation = useCallback(() => {
    if (focusFrameRef.current) {
      cancelAnimationFrame(focusFrameRef.current);
      focusFrameRef.current = 0;
    }
  }, []);

  useEffect(() => () => {
    cancelFocusAnimation();
    if (cameraFrameRef.current) {
      cancelAnimationFrame(cameraFrameRef.current);
    }
  }, [cancelFocusAnimation]);

  const animateTo = useCallback((target: CameraView, id: string) => {
    cancelFocusAnimation();
    const start = cameraRef.current;
    const startedAt = performance.now();
    setActiveViewId(id);

    const frame = (timestamp: number) => {
      const progress = Math.min(
        1,
        Math.max(0, (timestamp - startedAt) / FOCUS_DURATION_MS),
      );
      commitCamera(interpolateCameraView(start, target, progress));
      if (progress < 1) {
        focusFrameRef.current = requestAnimationFrame(frame);
      } else {
        focusFrameRef.current = 0;
      }
    };
    focusFrameRef.current = requestAnimationFrame(frame);
  }, [cancelFocusAnimation, commitCamera]);

  const handleFocus = useCallback((id: string) => {
    const territory = TERRITORIES.find((candidate) => candidate.id === id);
    if (territory) {
      animateTo(territory.focusView, territory.id);
    }
  }, [animateTo]);

  const handleWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    cancelFocusAnimation();
    const bounds = event.currentTarget.getBoundingClientRect();
    const anchor = [
      (event.clientX - bounds.left) / Math.max(bounds.width, 1),
      (event.clientY - bounds.top) / Math.max(bounds.height, 1),
    ] as const;
    const scale = Math.exp(event.deltaY * 0.00135);
    commitCamera(zoomCameraViewAt(
      cameraRef.current,
      anchor,
      scale,
      DETAIL_POLICY.cameraMinimumSpan,
    ));
    setActiveViewId("custom");
  }, [cancelFocusAnimation, commitCamera]);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        return;
      }
      const target = event.target;
      if (
        target instanceof Element
        && target.closest(INTERACTIVE_TARGET_SELECTOR)
      ) {
        return;
      }
      cancelFocusAnimation();
      event.currentTarget.setPointerCapture(event.pointerId);
      dragRef.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      };
      setActiveViewId("custom");
      event.currentTarget.dataset.dragging = "true";
    },
    [cancelFocusAnimation],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }

      queueCamera(panCameraViewByPixels(
        cameraRef.current,
        [event.clientX - drag.x, event.clientY - drag.y],
        [bounds.width, bounds.height],
      ));
      dragRef.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      };
    },
    [queueCamera],
  );

  const finishPointer = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) {
      return;
    }
    dragRef.current = null;
    delete event.currentTarget.dataset.dragging;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const pan = event.shiftKey ? 72 : 36;
      const viewport = viewportRef.current?.getBoundingClientRect();
      if (!viewport) {
        return;
      }

      const deltas: Partial<Record<string, readonly [number, number]>> = {
        ArrowLeft: [pan, 0],
        ArrowRight: [-pan, 0],
        ArrowUp: [0, pan],
        ArrowDown: [0, -pan],
      };
      if (event.key in deltas) {
        event.preventDefault();
        cancelFocusAnimation();
        commitCamera(panCameraViewByPixels(
          cameraRef.current,
          deltas[event.key]!,
          [viewport.width, viewport.height],
        ));
        setActiveViewId("custom");
      } else if (event.key === "+" || event.key === "=" || event.key === "-") {
        event.preventDefault();
        cancelFocusAnimation();
        commitCamera(zoomCameraViewAt(
          cameraRef.current,
          [0.5, 0.5],
          event.key === "-" ? 1.18 : 0.84,
          DETAIL_POLICY.cameraMinimumSpan,
        ));
        setActiveViewId("custom");
      }
    },
    [cancelFocusAnimation, commitCamera],
  );

  return (
    <div
      aria-label="Interactive Career World map"
      className="career-world__viewport"
      data-camera-origin={camera.origin.join(",")}
      data-camera-span={camera.span.join(",")}
      data-camera-minimum-span={DETAIL_POLICY.cameraMinimumSpan}
      data-capital-lod={detailState.territoryToCapital.toFixed(3)}
      data-detail-tier={detailState.tier.id}
      data-site-lod={detailState.capitalToSite.toFixed(3)}
      data-territory-lod={detailState.worldToTerritory.toFixed(3)}
      onKeyDown={handleKeyDown}
      onPointerCancel={finishPointer}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointer}
      onWheel={handleWheel}
      ref={viewportRef}
      role="application"
      tabIndex={0}
    >
      <WorldBackdrop light={WORLD_LIGHT} />
      <WaterSurfaceCanvas
        camera={camera}
        detailState={detailState}
        light={WORLD_LIGHT}
        onRenderStateChange={setRenderState}
      />
      <TerritoryLandform
        camera={camera}
        detailState={detailState}
      />
      <StructuresLayer
        camera={camera}
        detailState={detailState}
        light={WORLD_LIGHT}
      />
      {enableDevelopmentTools
          && (showGrid || showTopography || showTerritoryQa) ? (
        <DevelopmentOverlay
          camera={camera}
          showGrid={showGrid}
          showTopography={showTopography}
          showTerritories={showTerritoryQa}
          territories={TERRITORIES}
        />
      ) : null}
      <WorldInterface
        activeViewId={activeViewId}
        detailState={detailState}
        enableDevelopmentTools={enableDevelopmentTools}
        mode={initialInterfaceMode}
        onFocus={handleFocus}
        onReset={() => animateTo(WORLD_CAMERA_VIEW, "world")}
        onToggleGrid={() => setShowGrid((visible) => !visible)}
        onToggleTopography={() => setShowTopography((visible) => !visible)}
        onToggleTerritoryQa={() => setShowTerritoryQa((visible) => !visible)}
        renderState={renderState}
        showGrid={showGrid}
        showTopography={showTopography}
        showTerritoryQa={showTerritoryQa}
        territories={TERRITORIES}
      />
    </div>
  );
}
