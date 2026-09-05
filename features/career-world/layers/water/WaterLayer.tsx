"use client";

import { useEffect, useLayoutEffect, useRef, type CSSProperties } from "react";
import type { CameraView } from "../../shared/camera";
import type { WorldLight } from "../../shared/lighting";
import type { SceneLighting } from "../lighting/model";
import { normalizeWaterState, type WaterState } from "./model";
import { WaterRenderer, type WaterScene } from "./WaterRenderer";
import { waterFallbackColor } from "../lighting/water/WaterLighting";
import { WaveEventRenderer } from "./ocean/events/WaveEventRenderer";

export type WaterRenderState = "loading" | "ready" | "fallback";

interface WaterLayerProps {
  readonly active: boolean;
  readonly camera: CameraView;
  readonly light: WorldLight | SceneLighting;
  readonly state?: Partial<WaterState>;
  readonly oceanVisible?: boolean;
  readonly inlandVisible?: boolean;
  readonly oceanMotion?: boolean;
  readonly inlandMotion?: boolean;
  readonly coastalEffects?: boolean;
  readonly inlandEffects?: boolean;
  readonly seabedVisible?: boolean;
  readonly oceanDetailsVisible?: boolean;
  readonly onRenderStateChange?: (state: WaterRenderState) => void;
}

export function WaterLayer(props: WaterLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const eventCanvasRef = useRef<HTMLCanvasElement>(null);
  const detailCanvasRef = useRef<HTMLCanvasElement>(null);
  const currentRef = useRef(props);
  const updateRef = useRef<() => void>(() => undefined);

  useLayoutEffect(() => {
    currentRef.current = props;
    updateRef.current();
  }, [props]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const eventCanvas = eventCanvasRef.current;
    if (!canvas || !eventCanvas) return;
    let renderer: WaterRenderer | null = null;
    let eventRenderer: WaveEventRenderer | null = null;
    const requestedTime = process.env.NODE_ENV !== "production"
      ? Number(new URLSearchParams(window.location.search).get("water.startTime") ?? 3) : 3;
    const initialTime = Number.isFinite(requestedTime) ? Math.max(0, Math.min(3600, requestedTime)) : 3;
    let frame = 0, resizeFrame = 0, last = 0, oceanTime = initialTime, inlandTime = initialTime;
    let disposed = false;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const scene = (): WaterScene => {
      const p = currentRef.current;
      return { camera: p.camera, light: p.light, state: normalizeWaterState(p.state),
        oceanVisible: p.oceanVisible ?? true, inlandVisible: p.inlandVisible ?? true,
        coastalEffects: p.coastalEffects ?? true, inlandEffects: p.inlandEffects ?? true,
        seabedVisible: p.seabedVisible ?? true, oceanDetailsVisible: p.oceanDetailsVisible ?? true,
        debug: new URLSearchParams(window.location.search).has("water.fields"),
        probe: process.env.NODE_ENV !== "production" && new URLSearchParams(window.location.search).has("water.probe") };
    };
    const moving = () => !disposed && !document.hidden && currentRef.current.active && !preference.matches
      && normalizeWaterState(currentRef.current.state).timeScale > 0
      && (((currentRef.current.oceanVisible ?? true) && (currentRef.current.oceanMotion ?? true))
        || ((currentRef.current.inlandVisible ?? true) && (currentRef.current.inlandMotion ?? true)));
    let currentScene = scene();
    const draw = () => {
      const events = eventRenderer?.selectEvents(currentScene, oceanTime) ?? [];
      renderer?.render(oceanTime, inlandTime, events);
      eventRenderer?.render(currentScene, oceanTime, events);
    };
    const tick = (now: number) => {
      frame = 0;
      if (!moving()) { last = 0; return; }
      if (!last || now - last >= 31) {
        const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
        const scale = normalizeWaterState(currentRef.current.state).timeScale;
        if (currentRef.current.oceanMotion ?? true) oceanTime += dt * scale;
        if (currentRef.current.inlandMotion ?? true) inlandTime += dt * scale;
        last = now; draw();
      }
      frame = requestAnimationFrame(tick);
    };
    const update = () => {
      currentScene = scene(); renderer?.setScene(currentScene); draw();
      if (moving() && !frame) { last = 0; frame = requestAnimationFrame(tick); }
      if (!moving() && frame) { cancelAnimationFrame(frame); frame = 0; last = 0; }
    };
    const initialize = () => {
      try {
        renderer = new WaterRenderer(canvas, scene(), draw, detailCanvasRef.current ?? undefined);
        canvas.dataset.renderState = "ready";
        delete canvas.dataset.renderError;
        currentRef.current.onRenderStateChange?.("ready");
        update();
      } catch (error) {
        canvas.dataset.renderState = "fallback";
        canvas.dataset.renderError = error instanceof Error ? error.message : String(error);
        currentRef.current.onRenderStateChange?.("fallback");
      }
    };
    const lost = (event: Event) => {
      event.preventDefault();
      if (frame) cancelAnimationFrame(frame);
      frame = 0; renderer?.destroy(); renderer = null;
      eventRenderer?.render({ ...currentScene, oceanVisible: false }, oceanTime);
      canvas.dataset.renderState = "fallback";
      currentRef.current.onRenderStateChange?.("fallback");
    };
    const restored = () => { if (!disposed) initialize(); };
    const initializeEvents = () => {
      if (disposed) return;
      try { eventRenderer = new WaveEventRenderer(eventCanvas, draw); delete eventCanvas.dataset.renderError; draw(); }
      catch (error) { eventCanvas.dataset.renderState = "unavailable"; eventCanvas.dataset.renderError = String(error); }
    };
    const eventsLost = (event: Event) => {
      event.preventDefault(); eventRenderer?.destroy(); eventRenderer = null;
      eventCanvas.dataset.renderState = "unavailable";
    };
    // Defer backing-store changes out of ResizeObserver's layout delivery.
    const resize = new ResizeObserver(() => {
      if (!resizeFrame) resizeFrame = requestAnimationFrame(() => { resizeFrame = 0; update(); });
    });
    resize.observe(canvas);
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", restored);
    eventCanvas.addEventListener("webglcontextlost", eventsLost);
    eventCanvas.addEventListener("webglcontextrestored", initializeEvents);
    document.addEventListener("visibilitychange", update);
    preference.addEventListener("change", update);
    updateRef.current = update;
    initialize();
    initializeEvents();
    return () => {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      resize.disconnect(); preference.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("webglcontextrestored", restored);
      eventCanvas.removeEventListener("webglcontextlost", eventsLost);
      eventCanvas.removeEventListener("webglcontextrestored", initializeEvents);
      renderer?.destroy();
      eventRenderer?.destroy();
      updateRef.current = () => undefined;
    };
  }, []);

  return <><canvas ref={canvasRef} className="career-world__unified-water" role="img"
    style={{ "--water-fallback": waterFallbackColor(props.light) } as CSSProperties}
    aria-label="Ocean, rivers and lakes on the shared world plane" data-layer="water"
    data-water-sublayers="ocean inland" data-render-state="loading" />
    <canvas ref={detailCanvasRef} className="career-world__ocean-details" aria-hidden="true"
      data-layer="ocean-details" data-render-state="loading" />
    <canvas ref={eventCanvasRef} className="career-world__wave-events" aria-hidden="true"
      data-layer="water-events" data-render-state="loading" />
  </>;
}
