"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import type { CameraView } from "../../../shared/camera";
import type { DetailState } from "../../../shared/lod";
import type { WorldLight } from "../../../shared/lighting";
import { NinjaOneInlandWaterController } from "../rendering/NinjaOneInlandWaterController";
import { NinjaOneInlandWaterRenderer } from "../rendering/NinjaOneInlandWaterRenderer";

interface NinjaOneInlandWaterCanvasProps {
  readonly active: boolean;
  readonly camera: CameraView;
  readonly detailState: DetailState;
  readonly effectsEnabled: boolean;
  readonly light: WorldLight;
}

export function NinjaOneInlandWaterCanvas({
  active,
  camera,
  detailState,
  effectsEnabled,
  light,
}: NinjaOneInlandWaterCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<NinjaOneInlandWaterController | null>(null);
  const sceneRef = useRef({
    active,
    camera,
    detailState,
    effectsEnabled,
    light,
  });

  useEffect(() => {
    sceneRef.current = {
      active,
      camera,
      detailState,
      effectsEnabled,
      light,
    };
  }, [active, camera, detailState, effectsEnabled, light]);

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
    controllerRef.current?.setEffectsEnabled(effectsEnabled);
  }, [effectsEnabled]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let localController: NinjaOneInlandWaterController | null = null;
    canvas.dataset.renderState = "loading";

    void NinjaOneInlandWaterRenderer.create(canvas, light)
      .then((renderer) => {
        if (cancelled) {
          renderer.destroy();
          return;
        }
        localController = new NinjaOneInlandWaterController(renderer, {
          reduceMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        });
        controllerRef.current = localController;
        const scene = sceneRef.current;
        localController.setView(scene.camera, scene.detailState);
        localController.setLight(scene.light);
        localController.setEffectsEnabled(scene.effectsEnabled);
        localController.setActive(scene.active);
        canvas.dataset.renderState = "ready";
        delete canvas.dataset.renderError;
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        canvas.dataset.renderState = "fallback";
        canvas.dataset.renderError = error instanceof Error
          ? error.message
          : String(error);
      });

    return () => {
      cancelled = true;
      localController?.destroy();
      if (controllerRef.current === localController) controllerRef.current = null;
    };
    // Renderer creation is mount-only; view changes update the same material.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      aria-label="Flowing NinjaOne rivers, lakes, rapids, and waterfalls"
      className="career-world__inland-water-canvas"
      data-active={active}
      data-authority="ninjaone-inland-water-r1"
      data-authority-layer="L3"
      data-effects-enabled={effectsEnabled}
      data-effects-layer="L3_2"
      data-effects-model="localized-curl-compression-cascade-r2"
      data-frame-rate-cap="30"
      data-fragment-culling="field-and-impact-support-r1"
      data-layer="ninjaone-inland-water"
      data-lod-tier={detailState.tier.id}
      data-motion-model="flow-field-advected-multiscale-surface-r2"
      data-motion-layer="L3_1"
      data-render-state="loading"
      data-shadow-model="water-only-bank-occlusion-r1"
      ref={canvasRef}
      role="img"
    />
  );
}
