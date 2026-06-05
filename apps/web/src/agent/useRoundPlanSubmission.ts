import { useMemo, useState } from 'react'
import type {
  PublicSessionState,
  RolePrivateState,
  RoundPlanSubmission,
} from '../../../../packages/schemas/src/index.js'
import type { AgentArenaClient } from './agentClient'
import type { UiError } from './AgentCockpitPanels'
import {
  submissionNotice,
  toUiError,
  type LoadStatus,
} from './agentCockpitViewState'
import {
  buildSubmissionFromDraft,
  createDraftFromSubmission,
  createSampleSubmission,
  normalizeSubmissionForDraft,
  parseSubmissionText,
  type RoundPlanDraft,
} from './roundPlanDraft'
import type { SubmissionMode } from './RoundPlanWorkbench'

type RoundPlanSubmissionInput = {
  client: AgentArenaClient
  roleState: RolePrivateState | null
  setLastError: (error: UiError | null) => void
  setNotice: (notice: string | null) => void
  setPublicState: (state: PublicSessionState | null) => void
  setRoleState: (state: RolePrivateState | null) => void
  setStatus: (status: LoadStatus) => void
}

export function useRoundPlanSubmission({
  client,
  roleState,
  setLastError,
  setNotice,
  setPublicState,
  setRoleState,
  setStatus,
}: RoundPlanSubmissionInput) {
  const [submissionMode, setSubmissionMode] = useState<SubmissionMode>('structured')
  const sampleSubmission = useMemo(() => createSampleSubmission(), [])
  const [submissionDraft, setSubmissionDraft] = useState<RoundPlanDraft>(() =>
    createDraftFromSubmission(sampleSubmission),
  )
  const [submissionText, setSubmissionText] = useState(() =>
    JSON.stringify(sampleSubmission, null, 2),
  )

  const submitRoundPlan = async () => {
    if (!roleState) {
      setLastError({
        title: 'Role state is missing',
        message: 'Load role state before submitting a round plan.',
        code: 'MISSING_ROLE_STATE',
      })
      return
    }

    setLastError(null)
    setNotice(null)

    let submission: RoundPlanSubmission

    if (submissionMode === 'json') {
      try {
        submission = parseSubmissionText(submissionText)
      } catch (error) {
        setLastError({
          title: 'Submission JSON is invalid',
          message:
            error instanceof Error
              ? error.message
              : 'The form body is not valid JSON.',
          code: 'BAD_JSON',
        })
        return
      }
    } else {
      submission = buildSubmissionFromDraft(submissionDraft)
      setSubmissionText(JSON.stringify(submission, null, 2))
    }

    setStatus('loading')

    try {
      const result = await client.submitRoundPlan(submission)

      setRoleState(result.state)
      setPublicState(result.publicState)
      setSubmissionDraft(createDraftFromSubmission(result.state.ownSubmission ?? submission))
      setNotice(submissionNotice(result.state))
    } catch (error) {
      setLastError(toUiError(error, 'Submission failed'))
    } finally {
      setStatus('ready')
    }
  }

  const toggleSubmissionMode = (next: SubmissionMode) => {
    if (next === submissionMode) {
      return
    }

    if (next === 'json') {
      setSubmissionText(JSON.stringify(buildSubmissionFromDraft(submissionDraft), null, 2))
      setLastError(null)
      setSubmissionMode('json')
      return
    }

    try {
      setSubmissionDraft(
        createDraftFromSubmission(
          normalizeSubmissionForDraft(parseSubmissionText(submissionText)),
        ),
      )
      setLastError(null)
      setSubmissionMode('structured')
    } catch (error) {
      setLastError({
        title: 'Submission JSON is invalid',
        message:
          error instanceof Error ? error.message : 'The form body is not valid JSON.',
        code: 'BAD_JSON',
      })
    }
  }

  return {
    setSubmissionDraft,
    setSubmissionText,
    submissionDraft,
    submissionMode,
    submissionText,
    submitRoundPlan,
    toggleSubmissionMode,
  }
}
