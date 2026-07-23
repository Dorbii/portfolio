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
import { WorldInterface } from "../layers/interface";
import {
  interpolateCameraView,
  normalizeCameraView,
  panCameraViewByPixels,
  WORLD_CAMERA_VIEW,
  zoomCameraViewAt,
  type CameraView,
} from "../shared/camera";
import { resolveDetailState } from "../shared/lod";

interface WorldSceneProps {
  readonly initialInterfaceMode: "world" | "water";
}

interface DragState {
  readonly pointerId: number;
  readonly x: number;
  readonly y: number;
}

const FOCUS_DURATION_MS = 680;

export function WorldScene({ initialInterfaceMode }: WorldSceneProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<CameraView>(WORLD_CAMERA_VIEW);
  const dragRef = useRef<DragState | null>(null);
  const focusFrameRef = useRef(0);
  const [camera, setCamera] = useState<CameraView>(WORLD_CAMERA_VIEW);
  const [activeViewId, setActiveViewId] = useState("world");
  const [renderState, setRenderState] =
    useState<WaterRenderState>("loading");
  const [showTerritoryQa, setShowTerritoryQa] = useState(false);
  const detailState = resolveDetailState(camera);

  const commitCamera = useCallback((next: CameraView) => {
    const normalized = normalizeCameraView(next);
    cameraRef.current = normalized;
    setCamera(normalized);
  }, []);

  const cancelFocusAnimation = useCallback(() => {
    if (focusFrameRef.current) {
      cancelAnimationFrame(focusFrameRef.current);
      focusFrameRef.current = 0;
    }
  }, []);

  useEffect(() => cancelFocusAnimation, [cancelFocusAnimation]);

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
    commitCamera(zoomCameraViewAt(cameraRef.current, anchor, scale));
    setActiveViewId("custom");
  }, [cancelFocusAnimation, commitCamera]);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        return;
      }
      cancelFocusAnimation();
      event.currentTarget.setPointerCapture(event.pointerId);
      dragRef.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      };
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

      commitCamera(panCameraViewByPixels(
        cameraRef.current,
        [event.clientX - drag.x, event.clientY - drag.y],
        [bounds.width, bounds.height],
      ));
      dragRef.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      };
      setActiveViewId("custom");
    },
    [commitCamera],
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
      data-capital-lod={detailState.territoryToCapital.toFixed(3)}
      data-detail-tier={detailState.tier.id}
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
      <WorldBackdrop />
      <WaterSurfaceCanvas
        camera={camera}
        onRenderStateChange={setRenderState}
      />
      <TerritoryLandform
        camera={camera}
        detailState={detailState}
        showTerritoryQa={showTerritoryQa}
      />
      <WorldInterface
        activeViewId={activeViewId}
        detailState={detailState}
        mode={initialInterfaceMode}
        onFocus={handleFocus}
        onReset={() => animateTo(WORLD_CAMERA_VIEW, "world")}
        onToggleTerritoryQa={() => setShowTerritoryQa((visible) => !visible)}
        renderState={renderState}
        showTerritoryQa={showTerritoryQa}
        territories={TERRITORIES}
      />
    </div>
  );
}
