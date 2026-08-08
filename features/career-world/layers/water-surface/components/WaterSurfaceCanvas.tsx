"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import type { CameraView } from "../../../shared/camera";
import type { DetailState } from "../../../shared/lod";
import type { WorldLight } from "../../../shared/lighting";
import { WaterSurfaceController } from "../rendering/WaterSurfaceController";
import { WaterSurfaceRenderer } from "../rendering/WaterSurfaceRenderer";

export type WaterRenderState = "loading" | "ready" | "fallback";

interface WaterSurfaceCanvasProps {
  readonly active: boolean;
  readonly camera: CameraView;
  readonly detailState: DetailState;
  readonly foregroundHydrology?: boolean;
  readonly light: WorldLight;
  readonly onRenderStateChange?: (state: WaterRenderState) => void;
}

export function WaterSurfaceCanvas({
  active,
  camera,
  detailState,
  foregroundHydrology = false,
  light,
  onRenderStateChange,
}: WaterSurfaceCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<WaterSurfaceController | null>(null);
  const statusCallbackRef = useRef(onRenderStateChange);
  const sceneRef = useRef({ active, camera, detailState, light });

  useEffect(() => {
    statusCallbackRef.current = onRenderStateChange;
  }, [onRenderStateChange]);

  useEffect(() => {
    sceneRef.current = { active, camera, detailState, light };
  }, [active, camera, detailState, light]);

  useEffect(() => {
    controllerRef.current?.setActive(active);
  }, [active]);

  useLayoutEffect(() => {
    controllerRef.current?.setView(camera, detailState);
  }, [camera, detailState]);

  useEffect(() => {
    controllerRef.current?.setLight(light);
  }, [light]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    let cancelled = false;
    let localController: WaterSurfaceController | null = null;
    canvas.dataset.renderState = "loading";
    statusCallbackRef.current?.("loading");

    void WaterSurfaceRenderer.create(canvas, light)
      .then((renderer) => {
        if (cancelled) {
          renderer.destroy();
          return;
        }

        const reduceMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        localController = new WaterSurfaceController(renderer, {
          reduceMotion,
        });
        controllerRef.current = localController;
        const scene = sceneRef.current;
        localController.setActive(scene.active);
        localController.setView(scene.camera, scene.detailState);
        localController.setLight(scene.light);
        localController.start();
        canvas.dataset.renderState = "ready";
        delete canvas.dataset.renderError;
        statusCallbackRef.current?.("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        const message = error instanceof Error ? error.message : String(error);
        canvas.dataset.renderState = "fallback";
        canvas.dataset.renderError = message;
        statusCallbackRef.current?.("fallback");
      });

    return () => {
      cancelled = true;
      localController?.destroy();
      if (controllerRef.current === localController) {
        controllerRef.current = null;
      }
    };
    // Renderer creation is intentionally mount-only. Scene updates have a
    // separate effect so changing focus never resets the water clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      aria-label="Animated dark-fantasy ocean surface"
      className="career-world__water-canvas"
      data-layer="water-surface"
      data-foreground-hydrology={foregroundHydrology}
      data-page-visible={active}
      data-capital-lod={detailState.territoryToCapital.toFixed(3)}
      data-lod-tier={detailState.tier.id}
      data-render-state="loading"
      data-site-lod={detailState.capitalToSite.toFixed(3)}
      data-territory-lod={detailState.worldToTerritory.toFixed(3)}
      ref={canvasRef}
      role="img"
    />
  );
}
