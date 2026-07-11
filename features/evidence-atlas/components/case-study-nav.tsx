import { evidenceTraces } from "../model/evidence-data";

type CaseStudyNavProps = {
  activeTraceId: string | null;
  onOpenTrace: (traceId: string) => void;
};

export function CaseStudyNav({
  activeTraceId,
  onOpenTrace,
}: CaseStudyNavProps) {
  return (
    <div className="graph-toolbar">
      <div className="case-study-nav">
        <span>Case studies</span>
        <div role="group" aria-label="Open a case study">
          {evidenceTraces.map((trace) => (
            <button
              key={trace.id}
              type="button"
              className={activeTraceId === trace.id ? "is-active" : ""}
              aria-pressed={activeTraceId === trace.id}
              aria-label={`Open case study: ${trace.title}`}
              onClick={() => onOpenTrace(trace.id)}
            >
              {trace.shortTitle}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
