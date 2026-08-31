"use client";

import { useEffect, useRef, useState } from "react";
import type { NinjaOneCapitalD05WaterEffectTuning } from "../model/ninjaOneCapitalD05Concept";
import {
  NinjaOneCapitalD05WaterCompositeRenderer,
  type NinjaOneCapitalD05WaterEffects,
} from "./NinjaOneCapitalD05WaterCompositeRenderer";

export function NinjaOneCapitalD05WaterComposite({
  effects,
  motionEnabled,
  sourcePath,
  tuning,
  zoomWeight,
}: {
  readonly effects: NinjaOneCapitalD05WaterEffects;
  readonly motionEnabled: boolean;
  readonly sourcePath: string;
  readonly tuning: NinjaOneCapitalD05WaterEffectTuning;
  readonly zoomWeight: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<NinjaOneCapitalD05WaterCompositeRenderer | null>(null);
  const stateRef = useRef({ motionEnabled, reducedMotion: true, tuning, zoomWeight });
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    stateRef.current = { motionEnabled, reducedMotion, tuning, zoomWeight };
    rendererRef.current?.setState(stateRef.current);
  }, [motionEnabled, reducedMotion, tuning, zoomWeight]);

  useEffect(() => {
    void rendererRef.current?.replaceSource(sourcePath);
  }, [sourcePath]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let renderer: NinjaOneCapitalD05WaterCompositeRenderer | null = null;
    const create = () => {
      canvas.dataset.renderState = "loading";
      void NinjaOneCapitalD05WaterCompositeRenderer.create(canvas, effects).then((next) => {
        if (cancelled) { next.destroy(); return; }
        renderer = next;
        rendererRef.current = next;
        next.setState(stateRef.current);
        next.start();
        canvas.dataset.renderState = "ready";
        delete canvas.dataset.renderError;
      }).catch((error: unknown) => {
        if (cancelled) return;
        canvas.dataset.renderState = "fallback";
        canvas.dataset.renderError = error instanceof Error ? error.message : String(error);
      });
    };
    const lost = (event: Event) => {
      event.preventDefault();
      renderer?.stop();
      renderer = null;
      rendererRef.current = null;
      canvas.dataset.renderState = "context-lost";
    };
    const restored = () => { if (!cancelled) create(); };
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", restored);
    create();
    return () => {
      cancelled = true;
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("webglcontextrestored", restored);
      renderer?.destroy();
      if (rendererRef.current === renderer) rendererRef.current = null;
    };
  }, [effects]);

  return <canvas aria-hidden="true" className="ninjaone-capital-city__d05-water-composite" data-city-effect="canon-water-composite" data-city-water-loop="continuous-hash-phase-no-common-period" data-city-water-renderer="webgl2-full-canon-pass" height={effects.dimensions[1]} ref={canvasRef} width={effects.dimensions[0]} />;
}
