import type { RoundPlanEditorSectionProps } from './roundPlanEditorTypes'

export function RoundPlanRationaleSection({
  setSubmissionDraft,
  submissionDraft,
}: RoundPlanEditorSectionProps) {
  return (
    <section className="plan-section rationale-panel" aria-labelledby="rationale-heading">
      <h3 id="rationale-heading">Rationale</h3>
      <label className="submission-editor">
        <span>Notes</span>
        <textarea
          spellCheck={false}
          value={submissionDraft.rationale}
          onChange={(event) =>
            setSubmissionDraft((draft) => ({
              ...draft,
              rationale: event.target.value,
            }))
          }
        />
      </label>
    </section>
  )
}
