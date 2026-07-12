"use client";

import { useEvidenceAtlasState } from "../hooks/use-evidence-atlas-state";
import { EvidenceGraph } from "./evidence-graph";
import { EvidenceInspector } from "./evidence-inspector";
import { ProjectNav } from "./project-nav";
import { SelectionTray } from "./selection-tray";
import { WorkspaceHeader } from "./workspace-header";

export function EvidenceAtlas() {
  const atlas = useEvidenceAtlasState();

  return (
    <main
      className={`evidence-workspace ${atlas.activeTraceId ? "mode-project" : "mode-explore"}`}
    >
      <WorkspaceHeader />

      <div className="workspace-body">
        <section className="graph-panel" aria-label="Evidence relationship map">
          <ProjectNav
            activeProjectId={atlas.activeTraceId}
            onOpenProject={atlas.openTrace}
          />

          <EvidenceGraph
            selectedIds={atlas.selectedIds}
            previewId={atlas.previewId}
            activeProjectId={atlas.activeTraceId}
            inspectorOpen={atlas.inspectorOpen}
            onPreview={atlas.setPreviewId}
            onToggle={atlas.toggleNode}
          />

          <SelectionTray
            activeTrace={atlas.activeTrace}
            selectedNodes={atlas.selectedNodes}
            copyLabel={atlas.copyLabel}
            onToggleNode={atlas.toggleNode}
            onCloseTrace={atlas.closeTrace}
            onCopyView={atlas.copyView}
          />
        </section>

        {atlas.inspectorOpen ? (
          <EvidenceInspector
            activeTraceId={atlas.activeTraceId}
            selectedIds={atlas.selectedIds}
            onCloseQuery={atlas.clearQuery}
            onCloseTrace={atlas.closeTrace}
            onOpenTrace={atlas.openTrace}
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
