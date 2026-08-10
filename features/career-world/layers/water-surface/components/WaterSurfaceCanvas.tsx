"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import type { CameraView } from "../../../shared/camera";
import type { DetailState } from "../../../shared/lod";
import type { WorldLight } from "../../../shared/lighting";
import type { NinjaOneEnvironmentNativeHydrologyAdmissionSnapshot } from "../../../development/model/ninjaOneEnvironmentResidency";
import { WaterSurfaceController } from "../rendering/WaterSurfaceController";
import { WaterSurfaceRenderer } from "../rendering/WaterSurfaceRenderer";

export type WaterRenderState = "loading" | "ready" | "fallback";

interface WaterSurfaceCanvasProps {
  readonly active: boolean;
  readonly camera: CameraView;
  readonly detailState: DetailState;
  readonly foregroundHydrology?: boolean;
  readonly light: WorldLight;
  readonly nativeHydrologyAdmission?:
    NinjaOneEnvironmentNativeHydrologyAdmissionSnapshot | null;
  readonly onRenderStateChange?: (state: WaterRenderState) => void;
}

export function WaterSurfaceCanvas({
  active,
  camera,
  detailState,
  foregroundHydrology = false,
  light,
  nativeHydrologyAdmission = null,
  onRenderStateChange,
}: WaterSurfaceCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<WaterSurfaceController | null>(null);
  const statusCallbackRef = useRef(onRenderStateChange);
  const sceneRef = useRef({
    active,
    camera,
    detailState,
    light,
    nativeHydrologyAdmission,
  });

  useEffect(() => {
    statusCallbackRef.current = onRenderStateChange;
  }, [onRenderStateChange]);

  useLayoutEffect(() => {
    sceneRef.current = {
      active,
      camera,
      detailState,
      light,
      nativeHydrologyAdmission,
    };
  }, [active, camera, detailState, light, nativeHydrologyAdmission]);

  useEffect(() => {
    controllerRef.current?.setActive(active);
  }, [active]);

  useLayoutEffect(() => {
    controllerRef.current?.setView(
      camera,
      detailState,
      nativeHydrologyAdmission,
    );
  }, [camera, detailState, nativeHydrologyAdmission]);

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
    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const handleMotionPreferenceChange = (event: MediaQueryListEvent) => {
      localController?.setReduceMotion(event.matches);
    };
    motionPreference.addEventListener("change", handleMotionPreferenceChange);
    canvas.dataset.renderState = "loading";
    statusCallbackRef.current?.("loading");

    void WaterSurfaceRenderer.create(canvas, light, foregroundHydrology)
      .then((renderer) => {
        if (cancelled) {
          renderer.destroy();
          return;
        }

        localController = new WaterSurfaceController(renderer, {
          reduceMotion: motionPreference.matches,
        });
        controllerRef.current = localController;
        const scene = sceneRef.current;
        localController.setActive(scene.active);
        localController.setView(
          scene.camera,
          scene.detailState,
          scene.nativeHydrologyAdmission,
        );
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
      motionPreference.removeEventListener(
        "change",
        handleMotionPreferenceChange,
      );
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
      aria-label="Animated ocean, river, and waterfall water surface"
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
