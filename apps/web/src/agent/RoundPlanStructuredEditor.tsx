import type { RoundPlanEditorSectionProps } from './roundPlanEditorTypes'
import { RoundPlanBlueprintSection } from './RoundPlanBlueprintSection'
import { RoundPlanOpeningScriptSection } from './RoundPlanOpeningScriptSection'
import { RoundPlanPurchaseSection } from './RoundPlanPurchaseSection'
import { RoundPlanRationaleSection } from './RoundPlanRationaleSection'

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
      <RoundPlanOpeningScriptSection
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
