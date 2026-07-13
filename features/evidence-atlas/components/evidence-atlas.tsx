"use client";

import { useCallback, useEffect } from "react";
import { useEvidenceAtlasState } from "../hooks/use-evidence-atlas-state";
import { DomainLegend } from "./domain-legend";
import { EvidenceGraph } from "./evidence-graph";
import { EvidenceInspector } from "./evidence-inspector";
import { ProjectNav } from "./project-nav";
import { SelectionTray } from "./selection-tray";
import { WorkspaceHeader } from "./workspace-header";

export function EvidenceAtlas() {
  const atlas = useEvidenceAtlasState();
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
      document.querySelector<HTMLElement>(selector)?.focus();
    });
  }, []);

  const restoreNodeFocus = useCallback((nodeId: string | undefined) => {
    if (!nodeId) return;
    window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLButtonElement>(`[data-node-id="${nodeId}"]`)
        ?.focus();
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
    (projectId: string) => {
      openTrace(projectId);
      focusElement("#project-inspector-title");
    },
    [focusElement, openTrace],
  );

  const closeProject = useCallback(() => {
    closeTrace();
    focusElement(".project-nav-trigger");
  }, [closeTrace, focusElement]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.key !== "Escape" || !inspectorOpen) {
        return;
      }
      const focusId = selectedIds.at(-1);
      if (activeTraceId) {
        closeTrace();
        focusElement(".project-nav-trigger");
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
          <div className="graph-toolbar">
            <ProjectNav
              activeProjectId={atlas.activeTraceId}
              onOpenProject={openProject}
            />
            <DomainLegend />
          </div>

          <EvidenceGraph
            selectedIds={atlas.selectedIds}
            previewId={atlas.previewId}
            activeProjectId={atlas.activeTraceId}
            inspectorOpen={atlas.inspectorOpen}
            selectionLimit={atlas.selectionLimit}
            onPreview={atlas.setPreviewId}
            onToggle={toggleNode}
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
