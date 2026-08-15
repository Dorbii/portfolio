import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { CameraView } from "../../../../shared/camera";
import type {
  NinjaOneEnvironmentFoliageInstance,
  NinjaOneEnvironmentFoliageResource,
} from "../model/ninjaOneEnvironmentFoliage";
import {
  loadNinjaOneEnvironmentFoliageAtlases,
  NinjaOneEnvironmentFoliageWebGl,
} from "./ninjaOneEnvironmentFoliageWebGl";

interface NinjaOneEnvironmentFoliageCanvasProps {
  readonly atlases: readonly NinjaOneEnvironmentFoliageResource[];
  readonly camera: CameraView;
  readonly instances: readonly NinjaOneEnvironmentFoliageInstance[];
  readonly motionEnabled: boolean;
  readonly onReadyChange: (ready: boolean) => void;
}

export function NinjaOneEnvironmentFoliageCanvas({
  atlases,
  camera,
  instances,
  motionEnabled,
  onReadyChange,
}: NinjaOneEnvironmentFoliageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<NinjaOneEnvironmentFoliageWebGl | null>(null);
  const atlasRef = useRef(atlases);
  const atlasesReadyRef = useRef(false);
  const sceneRef = useRef({ camera, instances });
  const motionEnabledRef = useRef(motionEnabled);
  const [ready, setReady] = useState(false);
  const [inDocumentViewport, setInDocumentViewport] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const atlasKey = atlases.map(({ id, sha256 }) => `${id}:${sha256}`).join("|");

  useEffect(() => {
    atlasRef.current = atlases;
  }, [atlases]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      setInDocumentViewport(entry?.isIntersecting ?? false);
    }, { threshold: 0.01 });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const updateVisibility = () => setPageVisible(document.visibilityState === "visible");
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    onReadyChange(false);
    let renderer: NinjaOneEnvironmentFoliageWebGl;
    try {
      renderer = new NinjaOneEnvironmentFoliageWebGl(canvas);
    } catch {
      onReadyChange(false);
      return undefined;
    }
    rendererRef.current = renderer;
    const resize = () => {
      if (!renderer.resize()) return;
      if (!atlasesReadyRef.current) return;
      const scene = sceneRef.current;
      renderer.setCamera(scene.camera);
      renderer.setScene(scene.instances);
      renderer.draw(performance.now() / 1000, false);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const ownerSvg = canvas.closest("svg");
    if (ownerSvg instanceof SVGSVGElement) resizeObserver.observe(ownerSvg);
    window.addEventListener("resize", resize);
    renderer.resize();
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", resize);
      renderer.destroy();
      rendererRef.current = null;
    };
  }, [onReadyChange]);

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return undefined;
    let cancelled = false;
    atlasesReadyRef.current = false;
    setReady(false);
    onReadyChange(false);
    loadNinjaOneEnvironmentFoliageAtlases(atlasRef.current).then((loadedAtlases) => {
      if (cancelled) return;
      renderer.setAtlases(loadedAtlases);
      atlasesReadyRef.current = true;
      renderer.resize();
      const scene = sceneRef.current;
      renderer.setCamera(scene.camera);
      renderer.setScene(scene.instances);
      renderer.draw(performance.now() / 1000, motionEnabledRef.current);
      setReady(true);
      onReadyChange(true);
    }).catch(() => {
      if (cancelled) return;
      atlasesReadyRef.current = false;
      setReady(false);
      onReadyChange(false);
    });
    return () => {
      cancelled = true;
    };
  }, [atlasKey, onReadyChange]);

  useLayoutEffect(() => {
    sceneRef.current = { camera, instances };
    motionEnabledRef.current = motionEnabled;
    const renderer = rendererRef.current;
    if (!renderer || !ready) return;
    renderer.resize();
    renderer.setCamera(camera);
    renderer.setScene(instances);
    renderer.draw(performance.now() / 1000, motionEnabled);
  }, [camera, instances, motionEnabled, ready]);

  const animationRunning = ready
    && motionEnabled
    && inDocumentViewport
    && pageVisible
    && instances.length > 0;
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer || !ready) return undefined;
    if (!animationRunning) {
      renderer.draw(performance.now() / 1000, false);
      return undefined;
    }
    let frame = 0;
    const draw = (now: number) => {
      const forcedTime = Number(canvasRef.current?.dataset.environmentFoliageCaptureTime);
      renderer.draw(Number.isFinite(forcedTime) ? forcedTime : now / 1000, true);
      frame = window.requestAnimationFrame(draw);
    };
    frame = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(frame);
  }, [animationRunning, ready]);

  return (
    <canvas
      aria-hidden="true"
      className="ninjaone-environment-native-detail__foliage-canvas"
      data-environment-foliage-animation-running={animationRunning}
      data-environment-foliage-canvas-instance-count={instances.length}
      data-environment-foliage-canvas-resource-count={atlases.length}
      data-environment-foliage-renderer={ready ? "webgl2-ready" : "static-fallback"}
      ref={canvasRef}
    />
  );
}
