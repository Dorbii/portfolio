import {
  nodeById,
  recordsForTrace,
  type EvidenceTrace,
} from "../model/evidence-data";
import { evidenceClassLabels } from "./evidence-class-labels";

type ProjectInspectorProps = {
  project: EvidenceTrace;
  projectStep: number;
  isProjectPlaying: boolean;
  onClose: () => void;
  onProjectStepChange: (step: number) => void;
  onToggleProjectPlayback: () => void;
};

export function ProjectInspector({
  project,
  projectStep,
  isProjectPlaying,
  onClose,
  onProjectStepChange,
  onToggleProjectPlayback,
}: ProjectInspectorProps) {
  const records = recordsForTrace(project.id);
  const hasReplay = project.replayStatus === "ready" && records.length > 1;
  const currentStep = hasReplay
    ? Math.min(Math.max(projectStep, 0), records.length - 1)
    : 0;
  const currentRecord = records[currentStep];
  const progress = hasReplay ? ((currentStep + 1) / records.length) * 100 : 100;

  return (
    <aside
      className="evidence-inspector project-inspector"
      aria-labelledby="project-inspector-title"
    >
      <div className="inspector-toolbar">
        <span>Project {project.index}</span>
        <button type="button" onClick={onClose} aria-label="Close project details">
          Close <i aria-hidden="true">×</i>
        </button>
      </div>

      <header className="project-header">
        <div className="project-meta">
          <p>{project.period}</p>
          <span className={`proof-label proof-${project.evidenceClass}`}>
            {project.proofLabel}
          </span>
        </div>
        <h2 id="project-inspector-title" tabIndex={-1}>
          {project.title}
        </h2>
        <p className="project-statement">{project.statement}</p>
        <p className="project-summary">{project.summary}</p>
      </header>

      {hasReplay ? (
        <section className="project-flow" aria-label="Project steps">
          <div className="section-heading">
            <h3>Project flow</h3>
            <span>{records.length} steps</span>
          </div>

          <div className="project-player" aria-label="Project playback controls">
            <div className="project-player-status">
              <span>Now tracing</span>
              <strong>{currentRecord.title}</strong>
            </div>
            <div className="project-progress" aria-hidden="true">
              <span style={{ width: `${progress}%` }} />
            </div>
            <div className="project-player-controls">
              <span className="project-step-count">
                {String(currentRecord.sequence).padStart(2, "0")} / {String(records.length).padStart(2, "0")}
              </span>
              <button
                type="button"
                aria-label="Previous project step"
                disabled={currentStep === 0}
                onClick={() => onProjectStepChange(currentStep - 1)}
              >
                ←
              </button>
              <button
                className="project-play-toggle"
                type="button"
                aria-pressed={isProjectPlaying}
                onClick={onToggleProjectPlayback}
              >
                {isProjectPlaying
                  ? "Pause"
                  : currentStep === records.length - 1
                    ? "Replay"
                    : "Play"}
              </button>
              <button
                type="button"
                aria-label="Next project step"
                disabled={currentStep === records.length - 1}
                onClick={() => onProjectStepChange(currentStep + 1)}
              >
                →
              </button>
            </div>
          </div>

          <div className="project-step-list">
            {records.map((record, index) => (
              <button
                className={`project-step ${index === currentStep ? "is-current" : ""}`}
                key={record.id}
                type="button"
                aria-current={index === currentStep ? "step" : undefined}
                aria-expanded={index === currentStep}
                onClick={() => onProjectStepChange(index)}
              >
                <span className="step-marker">
                  {String(record.sequence).padStart(2, "0")}
                </span>
                <span className="step-copy">
                  <span className="step-meta">
                    <span>{record.source}</span>
                    <span>{evidenceClassLabels[record.evidenceClass]}</span>
                  </span>
                  <strong>{record.title}</strong>
                  {index === currentStep ? (
                    <>
                      <span className="step-detail">{record.detail}</span>
                      <span className="step-nodes" aria-label="Connected concepts">
                        {record.nodeIds.slice(0, 5).map((nodeId) => (
                          <span key={nodeId}>{nodeById.get(nodeId)?.label}</span>
                        ))}
                      </span>
                    </>
                  ) : null}
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="project-outcomes" aria-labelledby="project-outcomes-title">
        <div className="section-heading">
          <h3 id="project-outcomes-title">Outcomes</h3>
          <span>{project.outcomes.length}</span>
        </div>
        <ol>
          {project.outcomes.map((outcome, index) => (
            <li key={outcome}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p>{outcome}</p>
            </li>
          ))}
        </ol>
      </section>

      {project.artifacts.length > 0 ? (
        <section className="project-artifacts" aria-labelledby="project-artifacts-title">
          <div className="section-heading">
            <h3 id="project-artifacts-title">Artifacts</h3>
            <span>{project.artifacts.length}</span>
          </div>
          {project.artifacts.map((artifact) => {
            const content = (
              <>
                <strong>{artifact.label}</strong>
                <span>{artifact.detail}</span>
                <small>
                  {artifact.access === "public"
                    ? "Open source"
                    : "Public summary"}
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
      ) : null}

      <details className="project-limitations">
        <summary>
          <span>Evidence boundary</span>
          <small>{project.limitations.length} notes</small>
        </summary>
        <ul>
          {project.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
      </details>
    </aside>
  );
}
