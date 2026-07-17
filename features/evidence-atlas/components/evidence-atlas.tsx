"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEvidenceAtlasState } from "../hooks/use-evidence-atlas-state";
import {
  type ProjectEntrySource,
  type ProjectTransitionRequest,
} from "../model/project-transition";
import { EvidenceGraph } from "./evidence-graph";
import { EvidenceInspector } from "./evidence-inspector";
import { SelectionTray } from "./selection-tray";
import { WorkspaceHeader } from "./workspace-header";

export function EvidenceAtlas() {
  const atlas = useEvidenceAtlasState();
  const projectRequestId = useRef(0);
  const [projectTransition, setProjectTransition] =
    useState<ProjectTransitionRequest | null>(null);
  const {
    activeTraceId,
    closeQuery,
    closeTrace,
    inspectorOpen,
    openQuery,
    openTrace,
    queryInspectorOpen,
    selectedIds,
    toggleNode,
  } = atlas;

  const focusElement = useCallback((selector: string) => {
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(selector)?.focus({
        preventScroll: true,
      });
    });
  }, []);

  const restoreNodeFocus = useCallback((nodeId: string | undefined) => {
    if (!nodeId) return;
    window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLButtonElement>(`[data-node-id="${nodeId}"]`)
        ?.focus({ preventScroll: true });
    });
  }, []);

  const closeEvidenceQuery = useCallback(() => {
    const focusId = selectedIds.at(-1);
    closeQuery();
    restoreNodeFocus(focusId);
  }, [closeQuery, restoreNodeFocus, selectedIds]);

  const openEvidenceQuery = useCallback(() => {
    openQuery();
    focusElement("#query-inspector-title");
  }, [focusElement, openQuery]);

  const openProject = useCallback(
    (
      projectId: string,
      source: ProjectEntrySource = "activate",
    ) => {
      if (activeTraceId) closeTrace();
      projectRequestId.current += 1;
      const request = {
        projectId,
        requestId: projectRequestId.current,
        source,
      } satisfies ProjectTransitionRequest;

      setProjectTransition(request);
    },
    [activeTraceId, closeTrace],
  );

  const completeProjectTransition = useCallback(
    (request: ProjectTransitionRequest) => {
      setProjectTransition((current) =>
        current?.requestId === request.requestId ? null : current,
      );
      openTrace(request.projectId);
      focusElement("#project-inspector-title");
    },
    [focusElement, openTrace],
  );

  const cancelProjectTransition = useCallback((requestId: number) => {
    setProjectTransition((current) =>
      current?.requestId === requestId ? null : current,
    );
  }, []);

  const portalProjectId =
    projectTransition?.projectId ?? atlas.activeTraceId;

  const closeProject = useCallback(() => {
    const projectId = activeTraceId;
    closeTrace();
    if (projectId) focusElement(`[data-project-id="${projectId}"]`);
  }, [activeTraceId, closeTrace, focusElement]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.key !== "Escape" ||
        !inspectorOpen ||
        projectTransition !== null
      ) {
        return;
      }
      const focusId = selectedIds.at(-1);
      if (activeTraceId) {
        const projectId = activeTraceId;
        closeTrace();
        focusElement(`[data-project-id="${projectId}"]`);
      } else {
        closeQuery();
        restoreNodeFocus(focusId);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [
    activeTraceId,
    closeQuery,
    closeTrace,
    focusElement,
    inspectorOpen,
    projectTransition,
    restoreNodeFocus,
    selectedIds,
  ]);

  return (
    <main
      className={`evidence-workspace ${atlas.activeTraceId ? "mode-project" : "mode-explore"}`}
    >
      <WorkspaceHeader />

      <div className="workspace-body">
        <section className="graph-panel" aria-label="Evidence relationship map">
          <EvidenceGraph
            selectedIds={atlas.selectedIds}
            activeProjectId={portalProjectId}
            inspectorOpen={atlas.inspectorOpen}
            projectTransition={projectTransition}
            onToggle={toggleNode}
            onOpenProject={openProject}
            onProjectTransitionComplete={completeProjectTransition}
            onProjectTransitionCancel={cancelProjectTransition}
          />

          <SelectionTray
            activeTrace={atlas.activeTrace}
            selectedNodes={atlas.selectedNodes}
            selectionLimit={atlas.selectionLimit}
            selectionLimitAttempts={atlas.selectionLimitAttempts}
            copyLabel={atlas.copyLabel}
            queryOpen={queryInspectorOpen}
            onToggleNode={toggleNode}
            onOpenQuery={openEvidenceQuery}
            onCloseTrace={closeProject}
            onCopyView={atlas.copyView}
          />
        </section>

        {atlas.inspectorOpen ? (
          <EvidenceInspector
            activeTraceId={atlas.activeTraceId}
            selectedIds={atlas.selectedIds}
            onCloseQuery={closeEvidenceQuery}
            onCloseTrace={closeProject}
            onOpenTrace={openProject}
            traceStep={atlas.activeTraceStep}
            onTraceStepChange={atlas.changeTraceStep}
            isTracePlaying={atlas.tracePlayback}
            onToggleTracePlayback={atlas.toggleTracePlayback}
          />
        ) : null}
      </div>
    </main>
  );
}
