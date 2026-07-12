"use client";

import { traceById } from "../model/evidence-data";
import { ProjectInspector } from "./project-inspector";
import { QueryInspector } from "./query-inspector";

type EvidenceInspectorProps = {
  activeTraceId: string | null;
  selectedIds: string[];
  onCloseQuery: () => void;
  onCloseTrace: () => void;
  onOpenTrace: (traceId: string) => void;
  traceStep: number;
  onTraceStepChange: (step: number) => void;
  isTracePlaying: boolean;
  onToggleTracePlayback: () => void;
};

export function EvidenceInspector({
  activeTraceId,
  selectedIds,
  onCloseQuery,
  onCloseTrace,
  onOpenTrace,
  traceStep,
  onTraceStepChange,
  isTracePlaying,
  onToggleTracePlayback,
}: EvidenceInspectorProps) {
  const trace = activeTraceId ? traceById.get(activeTraceId) : null;

  if (trace) {
    return (
      <ProjectInspector
        project={trace}
        projectStep={traceStep}
        isProjectPlaying={isTracePlaying}
        onClose={onCloseTrace}
        onProjectStepChange={onTraceStepChange}
        onToggleProjectPlayback={onToggleTracePlayback}
      />
    );
  }

  return (
    <QueryInspector
      selectedIds={selectedIds}
      onClose={onCloseQuery}
      onOpenTrace={onOpenTrace}
    />
  );
}
