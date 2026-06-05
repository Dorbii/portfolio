import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
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
  createEmptySubmission,
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
  const draftSourceKeyRef = useRef(createDraftSourceKey(roleState))
  const [hasLocalDraftEdits, setHasLocalDraftEdits] = useState(false)
  const [submissionDraft, setSubmissionDraftState] = useState<RoundPlanDraft>(() =>
    createDraftFromSubmission(createSubmissionForRoleState(roleState, sampleSubmission)),
  )
  const [submissionText, setSubmissionTextState] = useState(() =>
    JSON.stringify(createSubmissionForRoleState(roleState, sampleSubmission), null, 2),
  )

  useEffect(() => {
    const nextSourceKey = createDraftSourceKey(roleState)

    if (draftSourceKeyRef.current === nextSourceKey) {
      return
    }

    if (hasLocalDraftEdits) {
      return
    }

    const nextSubmission = createSubmissionForRoleState(roleState, sampleSubmission)

    setSubmissionDraftState(createDraftFromSubmission(nextSubmission))
    setSubmissionTextState(JSON.stringify(nextSubmission, null, 2))
    setHasLocalDraftEdits(false)
    draftSourceKeyRef.current = nextSourceKey
  }, [hasLocalDraftEdits, roleState, sampleSubmission])

  const setSubmissionDraft = useCallback<Dispatch<SetStateAction<RoundPlanDraft>>>(
    (nextDraft) => {
      setHasLocalDraftEdits(true)
      setSubmissionDraftState(nextDraft)
    },
    [],
  )
  const setSubmissionText = useCallback<Dispatch<SetStateAction<string>>>(
    (nextText) => {
      setHasLocalDraftEdits(true)
      setSubmissionTextState(nextText)
    },
    [],
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
      setSubmissionTextState(JSON.stringify(submission, null, 2))
    }

    setStatus('loading')

    try {
      const result = await client.submitRoundPlan(submission)
      const acceptedSubmission = normalizeSubmissionForDraft(
        result.state.ownSubmission ?? submission,
      )

      setRoleState(result.state)
      setPublicState(result.publicState)
      setSubmissionDraftState(createDraftFromSubmission(acceptedSubmission))
      setSubmissionTextState(JSON.stringify(acceptedSubmission, null, 2))
      setHasLocalDraftEdits(false)
      draftSourceKeyRef.current = createDraftSourceKey(result.state)
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
      setSubmissionTextState(JSON.stringify(buildSubmissionFromDraft(submissionDraft), null, 2))
      setLastError(null)
      setSubmissionMode('json')
      return
    }

    try {
      setSubmissionDraftState(
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
    hasLocalDraftEdits,
    setSubmissionDraft,
    setSubmissionText,
    submissionDraft,
    submissionMode,
    submissionText,
    submitRoundPlan,
    toggleSubmissionMode,
  }
}

function createSubmissionForRoleState(
  roleState: RolePrivateState | null,
  sampleSubmission: RoundPlanSubmission,
): RoundPlanSubmission {
  if (roleState?.ownSubmission) {
    return normalizeSubmissionForDraft(roleState.ownSubmission)
  }

  if (roleState) {
    return createEmptySubmission()
  }

  return sampleSubmission
}

function createDraftSourceKey(roleState: RolePrivateState | null): string {
  if (!roleState) {
    return 'sample'
  }

  const source = roleState.ownSubmission ? 'submitted' : 'empty'

  return [
    roleState.sessionId,
    roleState.role,
    roleState.round,
    roleState.stateVersion,
    source,
  ].join(':')
}
