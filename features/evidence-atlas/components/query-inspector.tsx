import {
  nodeById,
  recordById,
  traceById,
  type EvidenceRecord,
} from "../model/evidence-data";
import { resolveEvidenceQuery } from "../model/evidence-query";
import { evidenceClassLabels } from "./evidence-class-labels";

type QueryInspectorProps = {
  selectedIds: string[];
  onClose: () => void;
  onOpenTrace: (traceId: string) => void;
};

function QueryRecord({ record }: { record: EvidenceRecord }) {
  return (
    <article>
      <div>
        <span>{record.source}</span>
        <span>{evidenceClassLabels[record.evidenceClass]}</span>
      </div>
      <h3>{record.title}</h3>
      <p>{record.detail}</p>
    </article>
  );
}

export function QueryInspector({
  selectedIds,
  onClose,
  onOpenTrace,
}: QueryInspectorProps) {
  const selectedNodes = selectedIds
    .map((nodeId) => nodeById.get(nodeId))
    .filter((node) => node !== undefined);
  const resolution = resolveEvidenceQuery(selectedIds);
  const matchingRecords = resolution.directRecords;
  const matchingTraceIds = resolution.relatedTraceIds;
  const visibleRecords = matchingRecords.slice(0, 4);
  const overflowRecords = matchingRecords.slice(4);

  if (selectedNodes.length === 0) return null;

  return (
    <aside
      className="evidence-inspector query-inspector"
      aria-labelledby="query-inspector-title"
    >
      <div className="inspector-toolbar">
        <strong>Evidence details</strong>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
      <header className="query-header">
        <h2 id="query-inspector-title">
          {selectedNodes.map((node) => node.label).join(" × ")}
        </h2>
        <p className="query-summary">
          {resolution.mode === "direct"
            ? `${matchingRecords.length} direct record${matchingRecords.length === 1 ? "" : "s"}`
            : resolution.pathSegments.length > 0
              ? `${resolution.pathSegments.length} documented hop${resolution.pathSegments.length === 1 ? "" : "s"}`
              : "No documented path"}
        </p>
      </header>

      {selectedNodes.length === 1 ? (
        <>
          <p className="node-description">{selectedNodes[0].description}</p>
          <div className="density-readout">
            <span>Supporting records</span>
            <b>{matchingRecords.length}</b>
          </div>
        </>
      ) : (
        <p className="node-description">{resolution.explanation}</p>
      )}

      {resolution.pathSegments.length > 0 ? (
        <section className="query-path" aria-label="Documented evidence path">
          <div className="section-heading">
            <span>Documented path</span>
            <small>
              {resolution.mode === "shared-trace"
                ? "Shared project"
                : "Cross-project bridge"}
            </small>
          </div>
          {resolution.pathSegments.map((segment, index) => {
            const record = recordById.get(segment.recordId);
            return (
              <article
                key={`${segment.fromId}-${segment.toId}-${segment.recordId}`}
              >
                <div className="path-hop">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div>
                  <h3>
                    {nodeById.get(segment.fromId)?.label}
                    <span aria-hidden="true"> → </span>
                    {nodeById.get(segment.toId)?.label}
                  </h3>
                  <p>{record?.title}</p>
                  <span>{record?.source}</span>
                </div>
              </article>
            );
          })}
          <p className="path-boundary">
            Each hop is backed by a shared evidence record. The complete chain
            explains a structural relationship; it is not a direct outcome claim.
          </p>
        </section>
      ) : null}

      {matchingRecords.length > 0 ? (
        <div className="query-records">
          {visibleRecords.map((record) => (
            <QueryRecord key={record.id} record={record} />
          ))}
          {overflowRecords.length > 0 ? (
            <details className="query-record-overflow">
              <summary>
                Show {overflowRecords.length} more evidence record
                {overflowRecords.length === 1 ? "" : "s"}
              </summary>
              <div>
                {overflowRecords.map((record) => (
                  <QueryRecord key={record.id} record={record} />
                ))}
              </div>
            </details>
          ) : null}
        </div>
      ) : resolution.mode === "disconnected" ? (
        <div className="no-intersection">
          <p>No documented relationship path.</p>
          <span>{resolution.explanation}</span>
        </div>
      ) : null}

      {matchingTraceIds.length > 0 ? (
        <div className="matching-traces">
          <div className="section-heading">
            <span>Related projects</span>
          </div>
          {matchingTraceIds.map((traceId) => {
            const relatedTrace = traceById.get(traceId)!;
            return (
              <button
                type="button"
                key={traceId}
                onClick={() => onOpenTrace(traceId)}
              >
                <span>{relatedTrace.index}</span>
                <strong>{relatedTrace.title}</strong>
              </button>
            );
          })}
        </div>
      ) : null}
    </aside>
  );
}
