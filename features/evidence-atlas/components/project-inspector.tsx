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

  return (
    <aside
      className="evidence-inspector project-inspector"
      aria-labelledby="project-inspector-title"
    >
      <div className="inspector-toolbar">
        <strong>Project {project.index}</strong>
        <button type="button" onClick={onClose}>
          Return to map
        </button>
      </div>

      <header className="project-header">
        <p>{project.period}</p>
        <h2 id="project-inspector-title">{project.title}</h2>
        <span className={`proof-label proof-${project.evidenceClass}`}>
          {project.proofLabel}
        </span>
      </header>

      <p className="project-statement">{project.statement}</p>
      <p className="project-summary">{project.summary}</p>

      {hasReplay ? (
        <>
          <section className="project-player" aria-label="Project playback controls">
            <div>
              <span>Current step</span>
              <strong>
                {String(currentRecord.sequence).padStart(2, "0")} /{" "}
                {String(records.length).padStart(2, "0")}
              </strong>
            </div>
            <div>
              <button
                type="button"
                disabled={currentStep === 0}
                onClick={() => onProjectStepChange(currentStep - 1)}
              >
                Previous
              </button>
              <button
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
                disabled={currentStep === records.length - 1}
                onClick={() => onProjectStepChange(currentStep + 1)}
              >
                Next
              </button>
            </div>
          </section>

          <section className="project-flow" aria-label="Project steps">
            <div className="section-heading">
              <span>Project steps</span>
              <small>{records.length}</small>
            </div>
            {records.map((record, index) => (
              <button
                className={`project-step ${index === currentStep ? "is-current" : ""}`}
                key={record.id}
                type="button"
                aria-pressed={index === currentStep}
                onClick={() => onProjectStepChange(index)}
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
        </>
      ) : null}

      <section className="project-outcomes">
        <div className="section-heading">
          <span>Outcomes</span>
        </div>
        <ul>
          {project.outcomes.map((outcome) => (
            <li key={outcome}>{outcome}</li>
          ))}
        </ul>
      </section>

      <section className="project-limitations">
        <div className="section-heading">
          <span>Evidence boundary</span>
        </div>
        <ul>
          {project.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
      </section>

      {project.artifacts.length > 0 ? (
        <section className="project-artifacts">
          <div className="section-heading">
            <span>Artifacts</span>
          </div>
          {project.artifacts.map((artifact) => {
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
      ) : null}
    </aside>
  );
}
