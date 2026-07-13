"use client";

import { useEffect, useRef, useState } from "react";
import {
  evidenceTraces,
  recordsForTrace,
  type PortfolioGroup,
} from "../model/evidence-data";

type ProjectNavProps = {
  activeProjectId: string | null;
  onOpenProject: (projectId: string) => void;
};

const projectGroups = [
  { id: "current", label: "Current work" },
  { id: "prior", label: "Prior work" },
  { id: "personal", label: "Independent" },
] satisfies ReadonlyArray<{ id: PortfolioGroup; label: string }>;

export function ProjectNav({
  activeProjectId,
  onOpenProject,
}: ProjectNavProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const activeProject = evidenceTraces.find(
    (project) => project.id === activeProjectId,
  );

  useEffect(() => {
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => {
      window.removeEventListener("pointerdown", closeOnOutsidePointer);
    };
  }, []);

  const closeFromKeyboard = () => {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  return (
    <div
      className="project-nav"
      ref={rootRef}
      onBlur={(event) => {
        if (!open || rootRef.current?.contains(event.relatedTarget)) return;
        setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !open) return;
        event.preventDefault();
        event.stopPropagation();
        closeFromKeyboard();
      }}
    >
      <button
        ref={triggerRef}
        className="project-nav-trigger"
        type="button"
        aria-expanded={open}
        aria-controls="project-menu"
        onClick={() => setOpen((current) => !current)}
      >
        <span>Projects</span>
        <span className="project-nav-current">
          <strong>{activeProject?.shortTitle ?? "Choose a project"}</strong>
          <small>
            {activeProject?.period ?? "Trace the systems behind the map"}
          </small>
        </span>
        <i aria-hidden="true">{open ? "−" : "+"}</i>
      </button>

      {open ? (
        <nav className="project-menu" id="project-menu" aria-label="Project index">
          <header>
            <span>Project index</span>
            <small>Select a project to replay its evidence path.</small>
          </header>

          {projectGroups.map((group) => {
            const projects = evidenceTraces.filter(
              (project) => project.portfolioGroup === group.id,
            );

            return (
              <section key={group.id} aria-labelledby={`project-group-${group.id}`}>
                <h2 id={`project-group-${group.id}`}>
                  {group.label}
                  <span>{projects.length}</span>
                </h2>
                <div>
                  {projects.map((project) => {
                    const stepCount = recordsForTrace(project.id).length;
                    const hasReplay = project.replayStatus === "ready";

                    return (
                      <button
                        key={project.id}
                        type="button"
                        className={activeProjectId === project.id ? "is-active" : ""}
                        aria-pressed={activeProjectId === project.id}
                        aria-label={`Open ${project.title}${hasReplay ? `, ${stepCount}-step replay available` : ", project overview"}`}
                        onClick={() => {
                          onOpenProject(project.id);
                          setOpen(false);
                        }}
                      >
                        <span className="project-row-index">{project.index}</span>
                        <span className="project-row-copy">
                          <strong>{project.title}</strong>
                          <small>{project.period}</small>
                        </span>
                        <em>{hasReplay ? `${stepCount} steps` : "Brief"}</em>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
