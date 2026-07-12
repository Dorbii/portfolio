import type { EvidenceTrace, GraphNode } from "../model/evidence-data";

type SelectionTrayProps = {
  activeTrace: EvidenceTrace | null | undefined;
  selectedNodes: GraphNode[];
  copyLabel: string;
  onToggleNode: (nodeId: string) => void;
  onCloseTrace: () => void;
  onCopyView: () => void;
};

export function SelectionTray({
  activeTrace,
  selectedNodes,
  copyLabel,
  onToggleNode,
  onCloseTrace,
  onCopyView,
}: SelectionTrayProps) {
  return (
    <div className="selection-tray" aria-label="Current evidence query">
      <span className="selection-label">
        {activeTrace ? "Project" : "Selected"}
      </span>
      <div className="selection-values">
        {activeTrace ? (
          <button type="button" onClick={onCloseTrace}>
            {activeTrace.title} <span aria-hidden="true">×</span>
          </button>
        ) : selectedNodes.length > 0 ? (
          selectedNodes.map((node) => (
            <button
              type="button"
              key={node.id}
              onClick={() => onToggleNode(node.id)}
            >
              {node.label} <span aria-hidden="true">×</span>
            </button>
          ))
        ) : (
          <em>Select up to three nodes</em>
        )}
      </div>
      <button className="copy-view" type="button" onClick={onCopyView}>
        {copyLabel}
      </button>
    </div>
  );
}
