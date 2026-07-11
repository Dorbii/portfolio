"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { graphNodes } from "../model/evidence-data";
import { resolveEvidenceQuery } from "../model/evidence-query";
import {
  computeLayout,
  type Size,
} from "../rendering/graph-layout";
import { drawParticleField } from "../rendering/particle-field";

type EvidenceGraphProps = {
  selectedIds: string[];
  previewId: string | null;
  onPreview: (id: string | null) => void;
  onToggle: (id: string) => void;
};

export function EvidenceGraph({
  selectedIds,
  previewId,
  onPreview,
  onToggle,
}: EvidenceGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const resolutionIds = useMemo(
    () => (selectedIds.length > 0 ? selectedIds : previewId ? [previewId] : []),
    [previewId, selectedIds],
  );
  const queryResolution = useMemo(
    () => resolveEvidenceQuery(resolutionIds),
    [resolutionIds],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const bounds = container.getBoundingClientRect();
      setSize({ width: bounds.width, height: bounds.height });
    };
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    updateSize();
    return () => observer.disconnect();
  }, []);

  const positions = useMemo(() => computeLayout(size), [size]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width <= 0 || size.height <= 0) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(size.width * pixelRatio);
    canvas.height = Math.floor(size.height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let animationFrame = 0;
    const render = (time: number) => {
      drawParticleField(
        context,
        size,
        positions,
        queryResolution,
        previewId,
        time,
      );
      if (!reducedMotion) {
        animationFrame = window.requestAnimationFrame(render);
      }
    };
    render(0);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [positions, previewId, queryResolution, size]);

  const relatedIds = useMemo(
    () => new Set(queryResolution.pathNodeIds),
    [queryResolution.pathNodeIds],
  );

  return (
    <div className="graph-surface" ref={containerRef}>
      <canvas ref={canvasRef} aria-hidden="true" />
      <div className="node-layer">
        {graphNodes.map((node) => {
          const point = positions[node.id];
          if (!point) return null;
          const selected = selectedIds.includes(node.id);
          const related = resolutionIds.length === 0 || relatedIds.has(node.id);
          const style = {
            "--node-x": `${point.x}px`,
            "--node-y": `${point.y}px`,
          } as CSSProperties;

          return (
            <button
              key={node.id}
              type="button"
              className={`graph-node tone-${node.tone} ${selected ? "is-selected" : ""} ${previewId === node.id ? "is-preview" : ""} ${related ? "" : "is-muted"}`}
              style={style}
              aria-pressed={selected}
              onMouseEnter={() => onPreview(node.id)}
              onMouseLeave={() => onPreview(null)}
              onFocus={() => onPreview(node.id)}
              onBlur={() => onPreview(null)}
              onClick={() => onToggle(node.id)}
            >
              <i aria-hidden="true" />
              <span>{node.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
