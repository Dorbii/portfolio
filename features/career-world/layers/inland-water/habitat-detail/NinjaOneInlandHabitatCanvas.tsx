"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import type { CameraView } from "../../../shared/camera";
import type { DetailState } from "../../../shared/lod";
import { NinjaOneInlandHabitatRenderer } from "./NinjaOneInlandHabitatRenderer";

interface NinjaOneInlandHabitatCanvasProps {
  readonly camera: CameraView;
  readonly detailState: DetailState;
}

export function NinjaOneInlandHabitatCanvas({
  camera,
  detailState,
}: NinjaOneInlandHabitatCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<NinjaOneInlandHabitatRenderer | null>(null);
  const sceneRef = useRef({ camera, detailState });

  useEffect(() => {
    sceneRef.current = { camera, detailState };
  }, [camera, detailState]);

  useLayoutEffect(() => {
    rendererRef.current?.setView(camera, detailState);
  }, [camera, detailState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let localRenderer: NinjaOneInlandHabitatRenderer | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let resizeFrame = 0;
    canvas.dataset.renderState = "loading";

    void NinjaOneInlandHabitatRenderer.create(canvas)
      .then((renderer) => {
        if (cancelled) {
          renderer.destroy();
          return;
        }
        localRenderer = renderer;
        rendererRef.current = renderer;
        const scene = sceneRef.current;
        renderer.setView(scene.camera, scene.detailState);
        resizeObserver = typeof ResizeObserver === "undefined"
          ? null
          : new ResizeObserver(() => {
            renderer.requestResize();
            if (!resizeFrame) {
              resizeFrame = requestAnimationFrame(() => {
                resizeFrame = 0;
                renderer.render();
              });
            }
          });
        resizeObserver?.observe(canvas);
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
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      resizeObserver?.disconnect();
      localRenderer?.destroy();
      if (rendererRef.current === localRenderer) rendererRef.current = null;
    };
  }, []);

  return (
    <canvas
      aria-label="Submerged stones, wood, reeds, and freshwater vegetation"
      className="career-world__inland-habitat-canvas"
      data-authority-layer="L3_4"
      data-clipping-model="registered-inland-water-mask-r1"
      data-layer="ninjaone-inland-habitat-detail"
      data-lod-tier={detailState.tier.id}
      data-placement-model="deterministic-habitat-clusters-r2"
      data-render-state="loading"
      data-runtime-asset-resolution="256-square-maximum"
      data-shadow-pass="depth-and-lod-aware-bed-contact-r2"
      ref={canvasRef}
      role="img"
    />
  );
}
