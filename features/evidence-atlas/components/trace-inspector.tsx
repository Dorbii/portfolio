import {
  nodeById,
  recordsForTrace,
  type EvidenceTrace,
} from "../model/evidence-data";
import { evidenceClassLabels } from "./evidence-class-labels";

type TraceInspectorProps = {
  trace: EvidenceTrace;
  traceStep: number;
  isTracePlaying: boolean;
  onClose: () => void;
  onTraceStepChange: (step: number) => void;
  onToggleTracePlayback: () => void;
};

export function TraceInspector({
  trace,
  traceStep,
  isTracePlaying,
  onClose,
  onTraceStepChange,
  onToggleTracePlayback,
}: TraceInspectorProps) {
  const records = recordsForTrace(trace.id);
  const currentStep = Math.min(Math.max(traceStep, 0), records.length - 1);
  const currentRecord = records[currentStep];

  return (
    <aside
      className="evidence-inspector trace-inspector"
      aria-labelledby="trace-inspector-title"
    >
      <div className="inspector-toolbar">
        <strong>Trace {trace.index}</strong>
        <button type="button" onClick={onClose}>
          Return to query
        </button>
      </div>

      <header className="trace-header">
        <p>{trace.period}</p>
        <h2 id="trace-inspector-title">{trace.title}</h2>
        <span className={`proof-label proof-${trace.evidenceClass}`}>
          {trace.proofLabel}
        </span>
      </header>

      <p className="trace-statement">{trace.statement}</p>
      <p className="trace-summary">{trace.summary}</p>

      <section className="trace-player" aria-label="Trace playback controls">
        <div>
          <span>Current record</span>
          <strong>
            {String(currentRecord.sequence).padStart(2, "0")} /{" "}
            {String(records.length).padStart(2, "0")}
          </strong>
        </div>
        <div>
          <button
            type="button"
            disabled={currentStep === 0}
            onClick={() => onTraceStepChange(currentStep - 1)}
          >
            Previous
          </button>
          <button
            type="button"
            aria-pressed={isTracePlaying}
            onClick={onToggleTracePlayback}
          >
            {isTracePlaying
              ? "Pause"
              : currentStep === records.length - 1
                ? "Replay"
                : "Play"}
          </button>
          <button
            type="button"
            disabled={currentStep === records.length - 1}
            onClick={() => onTraceStepChange(currentStep + 1)}
          >
            Next
          </button>
        </div>
      </section>

      <section className="trace-flow" aria-label="Evidence trace">
        <div className="section-heading">
          <span>Evidence path</span>
          <small>{records.length} records</small>
        </div>
        {records.map((record, index) => (
          <button
            className={`trace-step ${index === currentStep ? "is-current" : ""}`}
            key={record.id}
            type="button"
            aria-pressed={index === currentStep}
            onClick={() => onTraceStepChange(index)}
          >
            <div className="step-marker">
              {String(record.sequence).padStart(2, "0")}
            </div>
            <div>
              <p>
                <span>{record.source}</span>
                <span>{evidenceClassLabels[record.evidenceClass]}</span>
              </p>
              <h3>{record.title}</h3>
              <div className="step-detail">{record.detail}</div>
              <div className="step-nodes" aria-label="Connected concepts">
                {record.nodeIds.slice(0, 5).map((nodeId) => (
                  <span key={nodeId}>{nodeById.get(nodeId)?.label}</span>
                ))}
              </div>
            </div>
          </button>
        ))}
      </section>

      <section className="trace-outcomes">
        <div className="section-heading">
          <span>Observed outcome</span>
        </div>
        <ul>
          {trace.outcomes.map((outcome) => (
            <li key={outcome}>{outcome}</li>
          ))}
        </ul>
      </section>

      <section className="trace-limitations">
        <div className="section-heading">
          <span>Evidence boundary</span>
        </div>
        <ul>
          {trace.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
      </section>

      <section className="trace-artifacts">
        <div className="section-heading">
          <span>Artifacts</span>
        </div>
        {trace.artifacts.map((artifact) => {
          const content = (
            <>
              <strong>{artifact.label}</strong>
              <span>{artifact.detail}</span>
              <small>
                {artifact.access === "public"
                  ? "Open source"
                  : "Private source / public summary"}
              </small>
            </>
          );

          return artifact.href ? (
            <a
              key={artifact.label}
              href={artifact.href}
              target="_blank"
              rel="noreferrer"
            >
              {content}
            </a>
          ) : (
            <div key={artifact.label}>{content}</div>
          );
        })}
      </section>
    </aside>
  );
}
