import type { Dispatch, SetStateAction } from 'react'
import type { RoundPlanDraft } from './roundPlanDraft'

export type RoundPlanEditorSectionProps = {
  setSubmissionDraft: Dispatch<SetStateAction<RoundPlanDraft>>
  submissionDraft: RoundPlanDraft
}
