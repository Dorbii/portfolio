// The tree sprite canvas: the cut-out route's runtime half (treeSpritesWebGl.ts)
// over the land canvas. It reads the same registry the sway pass reads — the
// site-tier tiles TerritoryLandform drew this frame, the site opacity, the
// backing-store size — and runs its own animation frame while a tile with a
// sprite set is on screen. It draws nothing under reduced motion, while the
// page is hidden, when the site tier is not showing, or when the largest
// lean would move under a quarter of a screen pixel. A frame-time guard
// (owner 2026-09-07: "the end user experiencing lag") halves its rate when
// the page's frames run long and stops it when they run very long.
import { useEffect, useRef, useState, type MutableRefObject } from "react";
import type { CameraView } from "../../../shared/camera";
import {
  DEFAULT_WORLD_WIND_STATE,
  windVectorFromDegrees,
} from "../../../shared/weather";
import { usePrefersReducedMotion } from "./CanopySway";
import { createTreeMotionGuard } from "./treeMotionGuard";
import type { CanopySwayRegistry } from "./canopySwayWebGl";
import {
  createTreeSpritesRenderer,
  tileHasTreeSprites,
  type TreeSpritesRenderer,
} from "./treeSpritesWebGl";

interface TreeSpritesProps {
  readonly camera: CameraView;
  readonly registry: MutableRefObject<CanopySwayRegistry>;
}

export const TREE_SPRITES_ENABLED = true;
// the top of a crown leans this fraction of its height at a full gust: 0.1
// with every tree on its own beat read as waving (owner, 2026-09-08 first
// look), 0.05 under one shared wind as "a little too subtle ... had to really
// look for it" (second look); 0.08 with the shared wind is the third
const DEFAULT_AMPLITUDE = 0.08;
const WORLD_LAND_PX = 16 * 2048;
const TALLEST_SINGLE_TREE_PX = 150;
const MINIMUM_SCREEN_SWING = 0.25;
function tuning(name: string, fallback: number): number {
  if (typeof window === "undefined") return fallback;
  const value = Number(new URLSearchParams(window.location.search).get(name));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function TreeSprites({ camera, registry }: TreeSpritesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef(camera);
  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [motionState, setMotionState] = useState<"idle" | "animating">("idle");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || prefersReducedMotion || !TREE_SPRITES_ENABLED) {
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
    let renderer: TreeSpritesRenderer;
    try {
      renderer = createTreeSpritesRenderer(gl);
    } catch (error) {
      console.warn("Tree sprite pass disabled:", error);
      canvas.dataset.motionMode = "failed";
      return;
    }
    const wind = windVectorFromDegrees(DEFAULT_WORLD_WIND_STATE.directionDegrees);
    const motion = DEFAULT_WORLD_WIND_STATE.motion;
    const amplitude = tuning("trees.amplitude", DEFAULT_AMPLITUDE);
    const speed = tuning("trees.speed", 1);
    const branchSetting = new URLSearchParams(window.location.search).get("trees.branches");
    const branches = branchSetting === "0" ? 0 : tuning("trees.branches", 1);
    canvas.dataset.branchMotion = branches > 0 ? "articulated" : "off";
    const startedAt = performance.now();
    let frame = 0;
    let running = true;
    let hidden = document.visibilityState === "hidden";
    let wasDrawing = false;
    let cleared = true;
    const motionGuard = createTreeMotionGuard(startedAt);
    let parity = 0;

    const loop = (now: number) => {
      if (!running) return;
      frame = requestAnimationFrame(loop);
      if (hidden) return;
      const { mode: guard, frameMs } = motionGuard.update(now);
      canvas.dataset.motionGuard = guard;
      parity = 1 - parity;
      if (guard === "half" && parity) return;
      const state = registry.current;
      const view = cameraRef.current;
      const [width, height] = state.pixelSize;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        cleared = false;
      }
      const screenSwing = amplitude * TALLEST_SINGLE_TREE_PX * width / (view.span[0] * WORLD_LAND_PX);
      const worthAFrame = guard !== "stopped"
        && state.opacity > 0.02
        && screenSwing >= MINIMUM_SCREEN_SWING
        && state.tiles.some(tileHasTreeSprites);
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
        timeSeconds: ((now - startedAt) / 1000) * speed,
        amplitude,
        branches,
      }, width, height);
      cleared = false;
      const drawing = drawn > 0;
      if (drawing !== wasDrawing) {
        wasDrawing = drawing;
        setMotionState(drawing ? "animating" : "idle");
      }
      const health = renderer.health();
      canvas.dataset.treeTiles = String(health.tilesDrawn);
      canvas.dataset.treeSprites = String(health.spritesDrawn);
      canvas.dataset.treeSets = String(health.setsResident);
      canvas.dataset.treeLoadFailures = String(health.loadFailures);
      canvas.dataset.frameMs = frameMs.toFixed(1);
    };
    const onVisibility = () => {
      hidden = document.visibilityState === "hidden";
      motionGuard.resetTiming(performance.now());
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

  if (!TREE_SPRITES_ENABLED) {
    return null;
  }
  return (
    <canvas
      aria-hidden="true"
      className={
        "career-world__layer "
        + "career-world__land-layer "
        + "career-world__land-canvas "
        + "career-world__tree-sprites"
      }
      data-layer="terrain"
      data-terrain-pass="tree-sprites"
      data-motion-mode={prefersReducedMotion ? "reduced" : motionState}
      ref={canvasRef}
    />
  );
}
