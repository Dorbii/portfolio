"use client";

import { useEffect, useRef } from "react";

import { ProjectDrawer } from "./project-drawer";
import { WorldHitTargets } from "./world-hit-targets";
import { WorldScene } from "./world-scene";
import { useCareerWorldState } from "../hooks/use-career-world-state";
import {
  employerById,
  projectById,
  type CareerProjectId,
  type EmployerId,
} from "../model/world-registry";
import { semanticLodForFocus, zoomCameraAt } from "../rendering/world-camera";

const SVG_VIEWPORT = { width: 1600, height: 900 };

export function CareerWorld() {
  const mainRef = useRef<HTMLElement>(null);
  const lastProjectControl = useRef<HTMLElement | null>(null);
  const state = useCareerWorldState();

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    if (state.drawerProjectId) main.setAttribute("inert", "");
    else main.removeAttribute("inert");
  }, [state.drawerProjectId]);

  const activeProjectId =
    state.focus.kind === "project" ? state.focus.projectId : null;
  const activeEmployerId: EmployerId | null =
    state.focus.kind === "employer"
      ? state.focus.employerId
      : state.focus.kind === "project"
        ? projectById.get(state.focus.projectId)?.employerId ?? null
        : null;
  const lod = semanticLodForFocus(
    state.camera.zoom,
    activeEmployerId !== null,
    activeProjectId !== null,
  );
  const activeProject = activeProjectId
    ? projectById.get(activeProjectId)
    : null;
  const focusLabel =
    state.focus.kind === "world"
      ? "Career World"
      : state.focus.kind === "employer"
        ? employerById.get(state.focus.employerId)?.label
        : projectById.get(state.focus.projectId)?.label;

  const openProject = (projectId: CareerProjectId, target?: HTMLElement) => {
    if (target) lastProjectControl.current = target;
    state.openProject(projectId);
  };

  return (
    <div
      className="career-world-app"
      data-reduced-motion={state.reducedMotion || undefined}
      data-lod={lod}
    >
      <main ref={mainRef}>
        <header className="career-world-header">
          <div>
            <p className="career-world-eyebrow">
              Steven Doris · engineering portfolio
            </p>
            <h1>Career World</h1>
          </div>
          <div className="career-world-header-status" aria-live="polite">
            <span>{lod} view</span>
            <span>{Math.round(state.camera.zoom * 100)}%</span>
          </div>
          <div
            className="career-world-resume-links"
            aria-label="Resume downloads"
          >
            <a href="/steven-doris-resume.pdf">Resume PDF</a>
            <a href="/steven-doris-resume.docx">Resume DOCX</a>
          </div>
        </header>

        <section className="career-world-map" aria-labelledby="career-world-map-title">
          <h2 id="career-world-map-title" className="sr-only">
            Illustrative Career World map
          </h2>

          <div className="career-world-navigation-region">
            <WorldHitTargets
              activeEmployerId={activeEmployerId}
              activeProjectId={activeProjectId}
              onEmployer={state.openEmployer}
              onProject={(projectId, target) => openProject(projectId, target)}
            />
          </div>

          <div className="career-world-canvas-region">
            <WorldScene
              camera={state.camera}
              focusEmployerId={activeEmployerId}
              focusProjectId={activeProjectId}
              reducedMotion={state.reducedMotion}
              onCameraChange={state.setCamera}
              onEmployer={state.openEmployer}
              onProject={openProject}
            />
            <div className="career-world-interaction-hint" aria-hidden="true">
              <span>Scroll to zoom</span>
              <span>Drag to pan</span>
              <span>Select a city or project</span>
            </div>
          </div>

          <div className="career-world-status-region">
            <p className="career-world-disclosure">
              Illustrative world — visual scale, motion, and activity are
              entertainment, not measured outcomes.
            </p>
            <div className="career-world-camera-controls" aria-label="Map controls">
              <span aria-live="polite">Viewing {focusLabel}</span>
              {activeProject?.evidenceStatus === "identity-only" ? (
                <span className="career-world-identity-status">
                  Resume identity · no linked evidence drawer
                </span>
              ) : null}
              <button
                type="button"
                onClick={state.goBack}
                disabled={state.focus.kind === "world"}
              >
                Back
              </button>
              <button
                type="button"
                onClick={() =>
                  state.setCamera(
                    zoomCameraAt(
                      state.camera,
                      { x: 800, y: 450 },
                      state.camera.zoom + 0.65,
                      SVG_VIEWPORT,
                    ),
                  )
                }
              >
                Zoom in
              </button>
              <button
                type="button"
                onClick={() =>
                  state.setCamera(
                    zoomCameraAt(
                      state.camera,
                      { x: 800, y: 450 },
                      state.camera.zoom - 0.65,
                      SVG_VIEWPORT,
                    ),
                  )
                }
              >
                Zoom out
              </button>
              <button type="button" onClick={state.reset}>
                Reset
              </button>
            </div>
          </div>
        </section>
      </main>

      {state.drawerProjectId ? (
        <ProjectDrawer
          projectId={state.drawerProjectId}
          onClose={() => {
            const projectId = state.drawerProjectId!;
            state.closeDrawer();
            mainRef.current?.removeAttribute("inert");
            const candidates = [
              lastProjectControl.current,
              ...document.querySelectorAll<HTMLElement>(
                `[data-project-control="${projectId}"], [data-project-index-control]`,
              ),
            ].filter((control): control is HTMLElement => control !== null);
            const target =
              candidates.find(
                (control) => control.getClientRects().length > 0,
              ) ?? candidates[0];
            target?.focus();
          }}
        />
      ) : null}
    </div>
  );
}
