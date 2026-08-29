"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import type { CameraView } from "../../../shared/camera";
import type { DetailState } from "../../../shared/lod";
import type { WorldLight } from "../../../shared/lighting";
import { WaterSurfaceController } from "../rendering/WaterSurfaceController";
import { WaterSurfaceRenderer } from "../rendering/WaterSurfaceRenderer";
import type { WaterSurfaceState } from "../model/state";

export type WaterRenderState = "loading" | "ready" | "fallback";

interface WaterSurfaceCanvasProps {
  readonly active: boolean;
  readonly camera: CameraView;
  readonly coastalAmbience: boolean;
  readonly detailState: DetailState;
  readonly light: WorldLight;
  readonly onRenderStateChange?: (state: WaterRenderState) => void;
  readonly tuning?: Pick<
    WaterSurfaceState,
    "weather" | "timeScale" | "opacity"
  >;
}

/**
 * Reduced motion stops the clock rather than stripping layers.
 *
 * The old water was a stack of additive effects and could be quietened by
 * turning several of them off. This one is a single simulation, and the terms
 * that read as movement are the same ones that give the sea its form, so there
 * is nothing to subtract: a still frame of it is a picture of water. Freezing
 * the clock is both the honest reading of the preference and the only one that
 * leaves the surface intact.
 */
function stillWaterForReducedMotion(
  tuning: WaterSurfaceCanvasProps["tuning"],
  reduceMotion: boolean,
): Partial<WaterSurfaceState> {
  if (!tuning || !reduceMotion) return tuning ?? {};
  return Object.freeze({ ...tuning, timeScale: 0 });
}

export function WaterSurfaceCanvas({
  active,
  camera,
  coastalAmbience,
  detailState,
  light,
  onRenderStateChange,
  tuning,
}: WaterSurfaceCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<WaterSurfaceController | null>(null);
  const statusCallbackRef = useRef(onRenderStateChange);
  const sceneRef = useRef({ active, camera, coastalAmbience, detailState, light });
  const tuningRef = useRef(tuning);
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    statusCallbackRef.current = onRenderStateChange;
  }, [onRenderStateChange]);

  useEffect(() => {
    sceneRef.current = { active, camera, coastalAmbience, detailState, light };
  }, [active, camera, coastalAmbience, detailState, light]);

  useEffect(() => {
    controllerRef.current?.setActive(active);
  }, [active]);

  useEffect(() => {
    controllerRef.current?.setCoastalAmbience(coastalAmbience);
  }, [coastalAmbience]);

  useEffect(() => {
    tuningRef.current = tuning;
    controllerRef.current?.setState(stillWaterForReducedMotion(
      tuning,
      reduceMotionRef.current,
    ));
  }, [tuning]);

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
        reduceMotionRef.current = reduceMotion;
        localController = new WaterSurfaceController(renderer, {
          reduceMotion,
        });
        controllerRef.current = localController;
        const scene = sceneRef.current;
        localController.setView(scene.camera, scene.detailState);
        localController.setLight(scene.light);
        localController.setCoastalAmbience(scene.coastalAmbience);
        localController.setState(stillWaterForReducedMotion(
          tuningRef.current,
          reduceMotion,
        ));
        localController.setActive(scene.active);
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
      data-authority-layer="L1"
      data-layer="ocean"
      data-motion-layer="L1_1"
      data-coastal-ambience-layer="L1_2"
      data-coastal-ambience={coastalAmbience}
      data-active={active}
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
