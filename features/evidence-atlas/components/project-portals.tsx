"use client";

import type { CSSProperties } from "react";
import { evidenceTraces } from "../model/evidence-data";
import type { Point, Size } from "../rendering/graph-layout";
import {
  graphPointToScreen,
  type GraphViewport,
} from "../rendering/graph-viewport";

type ProjectPortalsProps = {
  positions: Record<string, Point>;
  viewport: GraphViewport;
  size: Size;
  activeProjectId: string | null;
  entryHintProjectId: string | null;
  onHoverProject: (
    projectId: string | null,
    source: "pointer" | "keyboard",
  ) => void;
  onOpenProject: (projectId: string) => void;
};

export function ProjectPortals({
  positions,
  viewport,
  size,
  activeProjectId,
  entryHintProjectId,
  onHoverProject,
  onOpenProject,
}: ProjectPortalsProps) {
  return (
    <nav className="project-portals" aria-label="Project portals">
      {evidenceTraces.map((project) => {
        const point = positions[project.id];
        if (!point) return null;
        const screenPoint = graphPointToScreen(point, viewport);
        const keyboardVisible =
          size.width === 0 ||
          (screenPoint.x >= 0 &&
            screenPoint.x <= size.width &&
            screenPoint.y >= 0 &&
            screenPoint.y <= size.height);
        const active = activeProjectId === project.id;
        const entryHint = entryHintProjectId === project.id;
        const style = {
          "--project-x": `${screenPoint.x}px`,
          "--project-y": `${screenPoint.y}px`,
        } as CSSProperties;

        return (
          <button
            key={project.id}
            type="button"
            className={`project-portal-node ${active ? "is-active" : ""} ${entryHint ? "is-entry-ready" : ""}`}
            style={style}
            data-project-id={project.id}
            aria-pressed={active}
            aria-label={`Enter ${project.title} project`}
            tabIndex={keyboardVisible ? 0 : -1}
            onMouseEnter={() => onHoverProject(project.id, "pointer")}
            onMouseLeave={() => onHoverProject(null, "pointer")}
            onFocus={() => onHoverProject(project.id, "keyboard")}
            onBlur={() => onHoverProject(null, "keyboard")}
            onClick={() => onOpenProject(project.id)}
          >
            <i aria-hidden="true" />
            <span>{project.shortTitle}</span>
            {entryHint ? <small aria-hidden="true">Zoom to enter</small> : null}
          </button>
        );
      })}
    </nav>
  );
}
