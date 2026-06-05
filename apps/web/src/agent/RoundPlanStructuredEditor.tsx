import type { RoundPlanEditorSectionProps } from './roundPlanEditorTypes'
import { RoundPlanBlueprintSection } from './RoundPlanBlueprintSection'
import { RoundPlanPurchaseSection } from './RoundPlanPurchaseSection'
import { RoundPlanRationaleSection } from './RoundPlanRationaleSection'
import { RoundPlanTurnPlanSection } from './RoundPlanTurnPlanSection'

export function RoundPlanStructuredEditor({
  setSubmissionDraft,
  submissionDraft,
}: RoundPlanEditorSectionProps) {
  return (
    <div className="plan-workbench-grid">
      <RoundPlanPurchaseSection
        setSubmissionDraft={setSubmissionDraft}
        submissionDraft={submissionDraft}
      />
      <RoundPlanBlueprintSection
        setSubmissionDraft={setSubmissionDraft}
        submissionDraft={submissionDraft}
      />
      <RoundPlanTurnPlanSection
        setSubmissionDraft={setSubmissionDraft}
        submissionDraft={submissionDraft}
      />
      <RoundPlanRationaleSection
        setSubmissionDraft={setSubmissionDraft}
        submissionDraft={submissionDraft}
      />
    </div>
  )
}
