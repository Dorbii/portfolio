// The canopy sway canvas: a WebGL pass over the land canvas that moves the
// conifer crowns in the wind from the baked land pixels (canopySwayWebGl.ts).
// TerritoryLandform publishes the site-tier tiles it has decoded and drawn,
// with their world bounds and the site tier's opacity, into a registry ref
// each render; this component runs its own animation frame while there is
// something to sway, mapping the same camera to the same canvas size. It
// draws nothing under reduced motion, while the page is hidden, when the
// site tier is not showing, or while the crowns are too small on screen to
// move a visible fraction of a pixel.
import { useEffect, useRef, useState, type MutableRefObject } from "react";
import type { CameraView } from "../../../shared/camera";
import {
  DEFAULT_WORLD_WIND_STATE,
  windVectorFromDegrees,
} from "../../../shared/weather";
import {
  createCanopySwayRenderer,
  type CanopySwayRegistry,
  type CanopySwayRenderer,
} from "./canopySwayWebGl";

interface CanopySwayProps {
  readonly camera: CameraView;
  readonly registry: MutableRefObject<CanopySwayRegistry>;
}

// OFF (owner 2026-09-07 23:45, on the wind-as-light pass: "yeah that looks
// super wrong. Idk if we can do it this way if this is the result"): neither
// a warp nor a light pass over painted crowns has read as wind — the warp as
// jelly, the light as flicker. The pass and its fields stay for a mock of the
// cut-out route on one cell, or for retirement; the world shows still trees.
export const CANOPY_PASS_ENABLED = false;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
// the world's land plane is 16 cells of 2048 px: a crown's largest swing (14 px
// at L0) must reach a quarter of a screen pixel before the pass is worth a frame
const WORLD_LAND_PX = 16 * 2048;
const MINIMUM_SCREEN_SWING = 0.25;
const LARGEST_SWING_PX = 14;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const query = window.matchMedia(REDUCED_MOTION_QUERY);
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

export function CanopySway({ camera, registry }: CanopySwayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef(camera);
  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [motionState, setMotionState] = useState<"idle" | "animating">("idle");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || prefersReducedMotion || !CANOPY_PASS_ENABLED) {
      return;
    }
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
    });
    if (!gl) {
      return;
    }
    let renderer: CanopySwayRenderer;
    try {
      renderer = createCanopySwayRenderer(gl);
    } catch (error) {
      // never silent: a pass that fails to build reads as "no motion" to the owner
      console.warn("Canopy sway pass disabled:", error);
      canvas.dataset.motionMode = "failed";
      return;
    }
    const wind = windVectorFromDegrees(DEFAULT_WORLD_WIND_STATE.directionDegrees);
    const motion = DEFAULT_WORLD_WIND_STATE.motion;
    const startedAt = performance.now();
    let frame = 0;
    let running = true;
    let hidden = document.visibilityState === "hidden";
    let wasDrawing = false;
    let cleared = true;

    const loop = (now: number) => {
      if (!running) return;
      frame = requestAnimationFrame(loop);
      if (hidden) return;
      const state = registry.current;
      const view = cameraRef.current;
      const [width, height] = state.pixelSize;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        cleared = false;
      }
      // the swing on screen: land texels per screen pixel follows the camera span
      const screenSwing = LARGEST_SWING_PX * width / (view.span[0] * WORLD_LAND_PX);
      const worthAFrame = state.opacity > 0.02 && state.tiles.length > 0 && screenSwing >= MINIMUM_SCREEN_SWING;
      if (!worthAFrame) {
        if (!cleared) {
          renderer.clear();
          cleared = true;
        }
        if (wasDrawing) {
          wasDrawing = false;
          setMotionState("idle");
        }
        return;
      }
      const drawn = renderer.draw({
        tiles: state.tiles,
        opacity: state.opacity,
        camera: view,
        wind: [wind[0], wind[1]],
        motion,
        timeSeconds: (now - startedAt) / 1000,
      }, width, height);
      cleared = false;
      const drawing = drawn > 0;
      if (drawing !== wasDrawing) {
        wasDrawing = drawing;
        setMotionState(drawing ? "animating" : "idle");
      }
      const health = renderer.health();
      canvas.dataset.swayTiles = String(health.tilesDrawn);
      canvas.dataset.swayTextures = String(health.texturesResident);
      canvas.dataset.swayUploadFailures = String(health.uploadFailures);
      canvas.dataset.swayLoadFailures = String(health.loadFailures);
    };
    const onVisibility = () => {
      hidden = document.visibilityState === "hidden";
    };
    document.addEventListener("visibilitychange", onVisibility);
    frame = requestAnimationFrame(loop);
    return () => {
      running = false;
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onVisibility);
      renderer.dispose();
    };
  }, [prefersReducedMotion, registry]);

  if (!CANOPY_PASS_ENABLED) {
    return null;
  }
  return (
    <canvas
      aria-hidden="true"
      className={
        "career-world__layer "
        + "career-world__land-layer "
        + "career-world__land-canvas "
        + "career-world__canopy-sway"
      }
      data-layer="terrain"
      data-terrain-pass="canopy-sway"
      data-motion-mode={prefersReducedMotion ? "reduced" : motionState}
      ref={canvasRef}
    />
  );
}
