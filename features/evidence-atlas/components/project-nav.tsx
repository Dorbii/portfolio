"use client";

import { useEffect, useRef, useState } from "react";
import { evidenceTraces } from "../model/evidence-data";

type ProjectNavProps = {
  activeProjectId: string | null;
  onOpenProject: (projectId: string) => void;
};

export function ProjectNav({
  activeProjectId,
  onOpenProject,
}: ProjectNavProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const activeProject = evidenceTraces.find(
    (project) => project.id === activeProjectId,
  );

  useEffect(() => {
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", closeOnOutsidePointer);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeOnOutsidePointer);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <div className="graph-toolbar">
      <div className="project-nav" ref={rootRef}>
        <button
          className="project-nav-trigger"
          type="button"
          aria-expanded={open}
          aria-controls="project-menu"
          onClick={() => setOpen((current) => !current)}
        >
          <span>Projects</span>
          <strong>{activeProject?.shortTitle ?? "Choose a project"}</strong>
          <i aria-hidden="true">{open ? "−" : "+"}</i>
        </button>

        {open ? (
          <div className="project-menu" id="project-menu">
            <header>
              <strong>Projects</strong>
              <span>{evidenceTraces.length}</span>
            </header>
            <div role="group" aria-label="Open a project">
              {evidenceTraces.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  className={activeProjectId === project.id ? "is-active" : ""}
                  aria-pressed={activeProjectId === project.id}
                  onClick={() => {
                    onOpenProject(project.id);
                    setOpen(false);
                  }}
                >
                  <span>
                    <strong>{project.title}</strong>
                    <small>{project.period}</small>
                  </span>
                  <em>
                    {project.replayStatus === "ready" ? "Replay" : "Overview"}
                  </em>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
