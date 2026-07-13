import type { EvidenceTrace, GraphNode } from "../model/evidence-data";

type SelectionTrayProps = {
  activeTrace: EvidenceTrace | null | undefined;
  selectedNodes: GraphNode[];
  selectionLimit: number;
  selectionLimitAttempts: number;
  copyLabel: string;
  queryOpen: boolean;
  onToggleNode: (nodeId: string) => void;
  onOpenQuery: () => void;
  onCloseTrace: () => void;
  onCopyView: () => void;
};

export function SelectionTray({
  activeTrace,
  selectedNodes,
  selectionLimit,
  selectionLimitAttempts,
  copyLabel,
  queryOpen,
  onToggleNode,
  onOpenQuery,
  onCloseTrace,
  onCopyView,
}: SelectionTrayProps) {
  if (!activeTrace && selectedNodes.length === 0) return null;

  return (
    <div className="selection-tray" aria-label="Current evidence query">
      <span className="selection-label">
        {activeTrace ? "Project" : `${selectedNodes.length} selected`}
      </span>
      <div className="selection-values">
        {activeTrace ? (
          <button type="button" onClick={onCloseTrace}>
            {activeTrace.title} <span aria-hidden="true">×</span>
          </button>
        ) : (
          <>
            {selectedNodes.map((node) => (
              <button
                type="button"
                key={node.id}
                aria-label={`Remove ${node.label} from selection`}
                onClick={() => onToggleNode(node.id)}
              >
                {node.label} <span aria-hidden="true">×</span>
              </button>
            ))}
            {selectedNodes.length >= selectionLimit ? (
              <em
                key={selectionLimitAttempts}
                role="status"
                aria-live="polite"
              >
                {selectionLimitAttempts > 0
                  ? "Limit reached — remove a node to add another"
                  : `${selectionLimit} selected — remove a node to add another`}
              </em>
            ) : null}
          </>
        )}
      </div>
      <div className="selection-actions">
        {!activeTrace && !queryOpen ? (
          <button className="open-query" type="button" onClick={onOpenQuery}>
            View evidence
          </button>
        ) : null}
        <button className="copy-view" type="button" onClick={onCopyView}>
          {copyLabel}
        </button>
      </div>
    </div>
  );
}
