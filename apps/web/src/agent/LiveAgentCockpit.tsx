import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PART_CATALOG, getPart } from '../../../../packages/catalog/src/index.js'
import { MOVEMENT_COMMANDS } from '../../../../packages/schemas/src/index.js'
import type {
  AgentChatMessageKind,
  MovementCommand,
  UtilityCommand,
  WeaponCommand,
  PartDefinition,
  PublicSessionState,
  RoleClaimResponse,
  RolePrivateState,
  RoundPlanSubmission,
  SessionChatMessage,
  ValidationIssue,
  TurnCommand,
} from '../../../../packages/schemas/src/index.js'
import {
  AgentArenaApiError,
  AgentArenaClient,
  createAgentArenaRoleApi,
  createAgentInviteUrl,
  createExternalAgentBrief,
  createExternalAgentBriefMarkdown,
  createSafeAgentHash,
  clearStoredRoleToken,
  getValidAgentActions,
  parseAgentInviteFragment,
  readStoredRoleToken,
  serializeJsonForScript,
  writeStoredRoleToken,
  type AgentInvite,
  type AgentInviteParseResult,
} from './agentClient'
import { BotAssemblyScene } from './BotAssemblyScene'

type LoadStatus = 'idle' | 'claiming' | 'loading' | 'ready'
type SubmissionMode = 'structured' | 'json'
type PurchaseDraft = {
  partId: string
  quantity: string
}
type BlueprintBlockDraft = {
  id: string
  partId: string
  positionX: string
  positionY: string
  positionZ: string
  rotationX: string
  rotationY: string
  rotationZ: string
  label: string
}
type TurnCommandDraft = {
  tick: string
  move: '' | MovementCommand
  weaponA: '' | WeaponCommand
  weaponB: '' | WeaponCommand
  utility: '' | UtilityCommand
}
type RoundPlanDraft = {
  purchases: PurchaseDraft[]
  blueprintName: string
  blueprintBlocks: BlueprintBlockDraft[]
  turnCommands: TurnCommandDraft[]
  rationale: string
}

type UiError = {
  title: string
  message: string
  code?: string
  status?: number
  issues?: ValidationIssue[]
}

const ROLE_STATE_POLL_MS = 4_000
const autoClaimAttempts = new Set<string>()

export function LiveAgentCockpit() {
  const parseResult = useMemo<AgentInviteParseResult>(() => {
    return parseAgentInviteFragment(window.location.hash, window.location.origin)
  }, [])

  if (!parseResult.ok) {
    return <InvalidInvite errors={parseResult.errors} />
  }

  return <ClaimedAgentCockpit invite={parseResult.value} />
}

function ClaimedAgentCockpit({ invite }: { invite: AgentInvite }) {
  const [roleToken, setRoleToken] = useState(() => readStoredRoleToken(window.sessionStorage, invite) ?? '')
  const roleTokenRef = useRef(roleToken || undefined)
  const roleStateRef = useRef<RolePrivateState | null>(null)
  const [roleState, setRoleState] = useState<RolePrivateState | null>(null)
  const [publicState, setPublicState] = useState<PublicSessionState | null>(null)
  const [status, setStatus] = useState<LoadStatus>('idle')
  const [agentName, setAgentName] = useState('')
  const [lastError, setLastError] = useState<UiError | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [submissionMode, setSubmissionMode] = useState<SubmissionMode>('structured')
  const [chatKind, setChatKind] = useState<AgentChatMessageKind>('reflection')
  const [chatMessage, setChatMessage] = useState('')
  const [chatStatus, setChatStatus] = useState<'idle' | 'posting'>('idle')
  const [privateChatKind, setPrivateChatKind] = useState<AgentChatMessageKind>('strategy')
  const [privateChatMessage, setPrivateChatMessage] = useState('')
  const [privateChatStatus, setPrivateChatStatus] = useState<'idle' | 'posting'>('idle')
  const sampleSubmission = useMemo(() => createSampleSubmission(), [])
  const [submissionDraft, setSubmissionDraft] = useState(() =>
    createDraftFromSubmission(sampleSubmission),
  )
  const [submissionText, setSubmissionText] = useState(() =>
    JSON.stringify(sampleSubmission, null, 2),
  )
  const agentInviteUrl = useMemo(
    () => createAgentInviteUrl(invite, window.location.origin),
    [invite],
  )

  const client = useMemo(
    () =>
      new AgentArenaClient({
        invite,
        getRoleToken: () => roleTokenRef.current,
      }),
    [invite],
  )

  const isBusy = status === 'claiming' || status === 'loading'

  useEffect(() => {
    roleTokenRef.current = roleToken || undefined
  }, [roleToken])

  useEffect(() => {
    roleStateRef.current = roleState
  }, [roleState])

  const loadState = useCallback(
    async (options: { quiet?: boolean } = {}) => {
      if (!roleTokenRef.current) {
        setLastError({
          title: 'No role token',
          message: 'Claim this role or reuse a stored token before loading state.',
        })
        return
      }

      if (!options.quiet) {
        setStatus('loading')
      }

      try {
        const [privateState, redactedState] = await Promise.all([
          client.getState(),
          client.getPublicState().catch(() => null),
        ])

        setRoleState(privateState)
        setPublicState(redactedState)
        setLastError(null)
      } catch (error) {
        setLastError(toUiError(error, 'State load failed'))
        setRoleState(null)
        setPublicState(null)
      } finally {
        setStatus('ready')
      }
    },
    [client],
  )

  useEffect(() => {
    if (roleToken) {
      void loadState()
    }
  }, [loadState, roleToken])

  useEffect(() => {
    if (!roleToken || isTerminalPhase(roleState?.phase)) {
      return
    }

    const intervalId = window.setInterval(() => {
      void loadState({ quiet: true })
    }, ROLE_STATE_POLL_MS)

    return () => window.clearInterval(intervalId)
  }, [loadState, roleState?.phase, roleToken])

  const claimRole = useCallback(async (
    input: { agentName?: string; throwOnError?: boolean } = {},
  ): Promise<RoleClaimResponse | null> => {
    if (!invite.claimToken) {
      const error = new AgentArenaApiError({
        status: 400,
        code: 'INVALID_TOKEN',
        message:
          'This invite can load a stored role token, but it cannot claim a new role.',
      })

      setLastError({
        title: 'Claim token missing',
        message: error.message,
        code: 'INVALID_INVITE',
      })

      if (input.throwOnError) {
        throw error
      }

      return null
    }

    setStatus('claiming')
    setLastError(null)
    setNotice(null)

    try {
      const submittedAgentName = input.agentName?.trim() ?? agentName
      const claim = await client.claimRole({
        claimToken: invite.claimToken,
        agentName: submittedAgentName,
      })

      if (submittedAgentName) {
        setAgentName(submittedAgentName)
      }

      writeStoredRoleToken(window.sessionStorage, invite, claim.roleToken)
      roleTokenRef.current = claim.roleToken
      setRoleToken(claim.roleToken)
      setRoleState(claim.state)
      setPublicState(await client.getPublicState().catch(() => null))
      setStatus('ready')
      setNotice(`${capitalize(invite.role)} role claimed.`)
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${window.location.search}${createSafeAgentHash(invite)}`,
      )
      return claim
    } catch (error) {
      setLastError(toUiError(error, 'Claim failed'))

      if (input.throwOnError) {
        throw error
      }

      return null
    } finally {
      setStatus('ready')
    }
  }, [agentName, client, invite])

  useEffect(() => {
    const api = createAgentArenaRoleApi(client, () => roleStateRef.current, {
      claimRole: async (input) => {
        const claim = await claimRole({
          ...input,
          throwOnError: true,
        })

        if (!claim) {
          throw new AgentArenaApiError({
            status: 409,
            message: 'Role claim did not complete.',
          })
        }

        return claim
      },
    })

    window.AgentArenaRole = api

    return () => {
      if (window.AgentArenaRole === api) {
        delete window.AgentArenaRole
      }
    }
  }, [claimRole, client])

  useEffect(() => {
    if (roleToken || !invite.claimToken) {
      return
    }

    const attemptKey = `${invite.apiBase}:${invite.sessionId}:${invite.role}:${invite.claimToken}`

    if (autoClaimAttempts.has(attemptKey)) {
      return
    }

    autoClaimAttempts.add(attemptKey)
    void claimRole()
  }, [claimRole, invite, roleToken])

  const clearRoleToken = useCallback(() => {
    clearStoredRoleToken(window.sessionStorage, invite)
    roleTokenRef.current = undefined
    setRoleToken('')
    setRoleState(null)
    setPublicState(null)
    setLastError(null)
    setNotice('Stored token removed. Claim this role again to continue.')
  }, [invite])

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

  const submitChatMessage = async () => {
    if (!roleState) {
      setLastError({
        title: 'Role state is missing',
        message: 'Load role state before posting chat.',
        code: 'MISSING_ROLE_STATE',
      })
      return
    }

    const trimmedMessage = chatMessage.trim()

    if (!trimmedMessage) {
      setLastError({
        title: 'Chat message is empty',
        message: 'Write a short public taunt, observation, strategy note, or reflection.',
        code: 'EMPTY_CHAT_MESSAGE',
      })
      return
    }

    setLastError(null)
    setNotice(null)
    setChatStatus('posting')

    try {
      const result = await client.submitChatMessage({
        kind: chatKind,
        message: trimmedMessage,
      })

      setRoleState(result.state)
      setPublicState(result.publicState)
      setChatMessage('')
      setNotice('Chat message posted.')
    } catch (error) {
      setLastError(toUiError(error, 'Chat post failed'))
    } finally {
      setChatStatus('idle')
    }
  }

  const submitPrivateChatMessage = async () => {
    if (!roleState) {
      setLastError({
        title: 'Role state is missing',
        message: 'Load role state before saving private notes.',
        code: 'MISSING_ROLE_STATE',
      })
      return
    }

    const trimmedMessage = privateChatMessage.trim()

    if (!trimmedMessage) {
      setLastError({
        title: 'Private note is empty',
        message: 'Write a short private note before saving it to this role.',
        code: 'EMPTY_PRIVATE_CHAT_MESSAGE',
      })
      return
    }

    setLastError(null)
    setNotice(null)
    setPrivateChatStatus('posting')

    try {
      const result = await client.submitPrivateChatMessage({
        kind: privateChatKind,
        message: trimmedMessage,
      })

      setRoleState(result.state)
      setPrivateChatMessage('')
      setNotice('Private note saved.')
    } catch (error) {
      setLastError(toUiError(error, 'Private note failed'))
    } finally {
      setPrivateChatStatus('idle')
    }
  }

  const stateScript = useMemo(
    () =>
      serializeJsonForScript({
        ok: Boolean(roleState),
        invite: {
          sessionId: invite.sessionId,
          role: invite.role,
          apiBase: invite.apiBase,
          claimTokenPresent: Boolean(invite.claimToken),
        },
        contractUrl: `${invite.apiBase}/agent-spec.json`,
        state: roleState,
        publicState,
        validActions: getValidAgentActions(roleState),
      }),
    [invite, publicState, roleState],
  )
  const externalAgentBrief = useMemo(
    () =>
      createExternalAgentBrief({
        invite,
        inviteUrl: agentInviteUrl,
        state: roleState,
        publicState,
      }),
    [agentInviteUrl, invite, publicState, roleState],
  )
  const externalAgentBriefMarkdown = useMemo(
    () =>
      createExternalAgentBriefMarkdown({
        invite,
        inviteUrl: agentInviteUrl,
        state: roleState,
        publicState,
      }),
    [agentInviteUrl, invite, publicState, roleState],
  )
  const externalAgentBriefScript = useMemo(
    () => serializeJsonForScript(externalAgentBrief),
    [externalAgentBrief],
  )
  const canClaimRole = !isBusy && (!roleToken || lastError?.code === 'INVALID_TOKEN')
  const claimButtonLabel = isBusy
    ? status === 'claiming'
      ? 'Claiming role...'
      : 'Loading...'
    : roleToken
      ? 'Role token loaded'
      : 'Claim role'
  const refreshButtonLabel = status === 'loading' ? 'Refreshing...' : 'Refresh state'
  const matchLog = roleState?.eventLog ?? publicState?.eventLog ?? []
  const chatLog = roleState?.chatLog ?? publicState?.chatLog ?? []
  const privateChatLog = roleState?.privateChatLog ?? []
  const roleHasMatchLog = matchLog.length > 0
  const roleHasChatLog = chatLog.length > 0
  const roleHasPrivateChatLog = privateChatLog.length > 0
  const draftSubmission = useMemo(
    () => buildSubmissionFromDraft(submissionDraft),
    [submissionDraft],
  )
  const draftSummary = useMemo(
    () => summarizeDraft(submissionDraft, roleState?.gold),
    [roleState?.gold, submissionDraft],
  )
  const canSubmitPlan = Boolean(roleToken) && !isBusy && !roleState?.submitted
  const canPostChat = Boolean(
    roleToken &&
      roleState &&
      !isBusy &&
      chatStatus !== 'posting' &&
      !isTerminalPhase(roleState.phase) &&
      chatMessage.trim().length > 0,
  )
  const canPostPrivateChat = Boolean(
    roleToken &&
      roleState &&
      !isBusy &&
      privateChatStatus !== 'posting' &&
      !isTerminalPhase(roleState.phase) &&
      privateChatMessage.trim().length > 0,
  )

  const copyExternalAgentBrief = useCallback(() => {
    return navigator.clipboard
      .writeText(externalAgentBriefMarkdown)
      .then(() => {
        setNotice('External agent brief copied.')
      })
      .catch(() => {
        setLastError({
          title: 'Clipboard copy blocked',
          message: 'Select and copy the external agent brief manually.',
        })
      })
  }, [externalAgentBriefMarkdown])

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
      setSubmissionDraft(createDraftFromSubmission(normalizeSubmissionForDraft(parseSubmissionText(submissionText))))
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

  return (
    <main className="agent-live-app">
      <header className="agent-live-header agent-command-header">
        <div className="agent-title-block">
          <span className="eyebrow">Agent Arena</span>
          <h1>{capitalize(invite.role)} Agent Cockpit</h1>
        </div>
        <div className="agent-command-actions">
          <label>
            <span>Agent name</span>
            <input
              value={agentName}
              onChange={(event) => setAgentName(event.target.value)}
              maxLength={80}
            />
          </label>
          <button type="button" onClick={() => void claimRole()} disabled={!canClaimRole}>
            {claimButtonLabel}
          </button>
          <button type="button" onClick={() => void loadState()} disabled={!roleToken || isBusy}>
            {refreshButtonLabel}
          </button>
          <button type="button" onClick={() => void clearRoleToken()} disabled={!roleToken || isBusy}>
            Clear role token
          </button>
          <a href={`${invite.apiBase}/agent-spec.json`}>agent-spec.json</a>
        </div>
      </header>

      <div className="agent-cockpit-layout">
        <aside className="agent-live-panel cockpit-rail" aria-labelledby="role-summary-heading">
          <section>
            <SectionTitle id="role-summary-heading" title="Role summary" />
            <dl className="agent-facts">
              <Fact label="Session" value={invite.sessionId} />
              <Fact label="Role" value={capitalize(invite.role)} />
              <Fact label="API" value={invite.apiBase} />
              <Fact label="Claim token" value={invite.claimToken ? 'Present' : 'Not in fragment'} />
              <Fact label="Bearer token" value={roleToken ? 'Stored in this tab' : 'Not claimed'} />
              <Fact label="Status" value={formatStatus(status)} />
            </dl>
            {notice ? (
              <p className="agent-notice" aria-live="polite">
                {notice}
              </p>
            ) : null}
          </section>

          <section aria-labelledby="phase-heading">
            <SectionTitle id="phase-heading" title="Current phase" />
            {roleState ? (
              <dl className="agent-facts">
                <Fact label="Phase" value={formatPhase(roleState.phase)} />
                <Fact label="Round" value={String(roleState.round)} />
                <Fact label="Gold" value={String(roleState.gold)} />
                <Fact label="Submitted" value={roleState.submitted ? 'Yes' : 'No'} />
                <Fact label="State version" value={roleState.stateVersion} />
                <Fact label="Opponent" value={opponentLabel(roleState)} />
                <Fact label="Expires" value={formatDateTime(roleState.expiresAt)} />
              </dl>
            ) : (
              <p className="agent-empty">
                {isBusy
                  ? 'Loading role state from the API.'
                  : roleToken
                    ? 'Role token loaded. Use Refresh state if the previous load failed.'
                    : 'Claim this role or reuse a stored bearer token to load private state.'}
              </p>
            )}
            {roleState?.submitted ? (
              <p className="agent-waiting">{submissionNotice(roleState)}</p>
            ) : null}
          </section>

          <section aria-labelledby="arena-heading">
            <SectionTitle id="arena-heading" title="Arena" />
            {publicState ? (
              <dl className="agent-facts">
                <Fact label="Name" value={publicState.arena.name} />
                <Fact label="Size" value={`${publicState.arena.width} x ${publicState.arena.height}`} />
                <Fact label="Hazards" value={publicState.arena.activeHazards.join(', ')} />
                <Fact label="Replay" value={publicState.replayAvailable ? 'Available' : 'Unavailable'} />
              </dl>
            ) : (
              <p className="agent-empty">Public arena state has not loaded.</p>
            )}
          </section>

          <section aria-labelledby="opponent-heading">
            <SectionTitle id="opponent-heading" title="Opponent" />
            {roleState ? (
              <dl className="agent-facts">
                <Fact label="Role" value={capitalize(roleState.opponent.role)} />
                <Fact label="Claimed" value={roleState.opponent.claimed ? 'Yes' : 'No'} />
                <Fact label="Submitted" value={roleState.opponent.submitted ? 'Yes' : 'No'} />
                <Fact label="Replay" value={roleState.replayAvailable ? 'Available' : 'Unavailable'} />
              </dl>
            ) : (
              <p className="agent-empty">Opponent state is available after role state loads.</p>
            )}
          </section>
        </aside>

        <section className="agent-live-panel cockpit-workbench" aria-labelledby="submission-heading">
          <div className="workbench-header">
            <div>
              <SectionTitle id="submission-heading" title="Round plan workbench" />
              <strong>{submissionDraft.blueprintName || draftSubmission.blueprint.name}</strong>
            </div>
            <div className="submission-mode-toggle" role="group" aria-label="Submission mode">
              <button
                type="button"
                className={submissionMode === 'structured' ? 'active' : ''}
                onClick={() => void toggleSubmissionMode('structured')}
              >
                Structured
              </button>
              <button
                type="button"
                className={submissionMode === 'json' ? 'active' : ''}
                onClick={() => void toggleSubmissionMode('json')}
              >
                Advanced JSON mode
              </button>
            </div>
          </div>

          <div className="plan-metric-strip" aria-label="Draft summary">
            <PlanMetric
              label="Budget"
              tone={draftSummary.remainingGold !== undefined && draftSummary.remainingGold < 0 ? 'danger' : 'ok'}
              value={
                draftSummary.remainingGold === undefined
                  ? `${draftSummary.purchaseCost}g`
                  : `${draftSummary.remainingGold}g left`
              }
            />
            <PlanMetric label="Blocks" value={String(draftSummary.blockCount)} />
            <PlanMetric label="Mobility" value={String(draftSummary.mobilityParts)} />
            <PlanMetric label="Weapons" value={String(draftSummary.weaponParts)} />
            <PlanMetric label="Commands" value={`${draftSummary.commandCount} / 5`} />
          </div>

          <section className="assembly-bay-panel" aria-labelledby="assembly-bay-heading">
            <div className="plan-section-header">
              <SectionTitle id="assembly-bay-heading" title="Assembly bay" />
              <span className="assembly-state">
                {roleState?.submitted ? 'Ready' : 'Building'}
              </span>
            </div>
            <BotAssemblyScene
              blueprint={draftSubmission.blueprint}
              role={invite.role}
              submitted={Boolean(roleState?.submitted)}
            />
          </section>

          {submissionMode === 'structured' ? (
            <div className="plan-workbench-grid">
              <section className="plan-section" aria-labelledby="purchases-heading">
                <div className="plan-section-header">
                  <h3 id="purchases-heading">Purchases</h3>
                  <button
                    type="button"
                    onClick={() =>
                      setSubmissionDraft((draft) => ({
                        ...draft,
                        purchases: [...draft.purchases, { partId: '', quantity: '1' }],
                      }))
                    }
                  >
                    Add purchase
                  </button>
                </div>
                <div className="purchase-list">
                  {submissionDraft.purchases.map((purchase, index) => (
                    <div className="purchase-row" key={`purchase-${index}`}>
                      <label>
                        <span>Part</span>
                        <select
                          value={purchase.partId}
                          onChange={(event) =>
                            setSubmissionDraft((draft) => ({
                              ...draft,
                              purchases: draft.purchases.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, partId: event.target.value } : item,
                              ),
                            }))
                          }
                        >
                          <option value="">Select part</option>
                          {PART_CATALOG.map((part) => (
                            <option key={part.id} value={part.id}>
                              {part.displayName}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>Qty</span>
                        <input
                          type="number"
                          min={0}
                          value={purchase.quantity}
                          onChange={(event) =>
                            setSubmissionDraft((draft) => ({
                              ...draft,
                              purchases: draft.purchases.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, quantity: event.target.value }
                                  : item,
                              ),
                            }))
                          }
                        />
                      </label>
                      <strong>{purchaseCostLabel(purchase)}</strong>
                      <button
                        type="button"
                        onClick={() =>
                          setSubmissionDraft((draft) => ({
                            ...draft,
                            purchases: draft.purchases.filter((_, itemIndex) => itemIndex !== index),
                          }))
                        }
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="plan-section blueprint-editor" aria-labelledby="blueprint-heading">
                <div className="plan-section-header">
                  <h3 id="blueprint-heading">Blueprint</h3>
                  <button
                    type="button"
                    onClick={() =>
                      setSubmissionDraft((draft) => ({
                        ...draft,
                        blueprintBlocks: [
                          ...draft.blueprintBlocks,
                          {
                            id: `block-${draft.blueprintBlocks.length + 1}`,
                            partId: '',
                            label: '',
                            positionX: '0',
                            positionY: '0',
                            positionZ: '0',
                            rotationX: '0',
                            rotationY: '0',
                            rotationZ: '0',
                          },
                        ],
                      }))
                    }
                  >
                    Add block
                  </button>
                </div>
                <label className="blueprint-name-field">
                  <span>Name</span>
                  <input
                    value={submissionDraft.blueprintName}
                    onChange={(event) =>
                      setSubmissionDraft((draft) => ({
                        ...draft,
                        blueprintName: event.target.value,
                      }))
                    }
                  />
                </label>
                <div className="blueprint-block-list">
                  {submissionDraft.blueprintBlocks.map((block, index) => (
                    <div className="blueprint-block-row" key={`block-${index}`}>
                      <label>
                        <span>Block ID</span>
                        <input
                          value={block.id}
                          onChange={(event) =>
                            setSubmissionDraft((draft) => ({
                              ...draft,
                              blueprintBlocks: draft.blueprintBlocks.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, id: event.target.value } : item,
                              ),
                            }))
                          }
                        />
                      </label>
                      <label>
                        <span>Part</span>
                        <select
                          value={block.partId}
                          onChange={(event) =>
                            setSubmissionDraft((draft) => ({
                              ...draft,
                              blueprintBlocks: draft.blueprintBlocks.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, partId: event.target.value }
                                  : item,
                              ),
                            }))
                          }
                        >
                          <option value="">Select part</option>
                          {PART_CATALOG.map((part) => (
                            <option key={part.id} value={part.id}>
                              {part.displayName}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>Label</span>
                        <input
                          value={block.label}
                          onChange={(event) =>
                            setSubmissionDraft((draft) => ({
                              ...draft,
                              blueprintBlocks: draft.blueprintBlocks.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, label: event.target.value } : item,
                              ),
                            }))
                          }
                        />
                      </label>
                      <fieldset>
                        <legend>Position</legend>
                        <input
                          aria-label={`${block.id || 'block'} position x`}
                          type="number"
                          step="0.25"
                          value={block.positionX}
                          onChange={(event) =>
                            setSubmissionDraft((draft) => ({
                              ...draft,
                              blueprintBlocks: draft.blueprintBlocks.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, positionX: event.target.value }
                                  : item,
                              ),
                            }))
                          }
                        />
                        <input
                          aria-label={`${block.id || 'block'} position y`}
                          type="number"
                          step="0.25"
                          value={block.positionY}
                          onChange={(event) =>
                            setSubmissionDraft((draft) => ({
                              ...draft,
                              blueprintBlocks: draft.blueprintBlocks.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, positionY: event.target.value }
                                  : item,
                              ),
                            }))
                          }
                        />
                        <input
                          aria-label={`${block.id || 'block'} position z`}
                          type="number"
                          step="0.25"
                          value={block.positionZ}
                          onChange={(event) =>
                            setSubmissionDraft((draft) => ({
                              ...draft,
                              blueprintBlocks: draft.blueprintBlocks.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, positionZ: event.target.value }
                                  : item,
                              ),
                            }))
                          }
                        />
                      </fieldset>
                      <fieldset>
                        <legend>Rotation</legend>
                        <input
                          aria-label={`${block.id || 'block'} rotation x`}
                          type="number"
                          step="0.25"
                          value={block.rotationX}
                          onChange={(event) =>
                            setSubmissionDraft((draft) => ({
                              ...draft,
                              blueprintBlocks: draft.blueprintBlocks.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, rotationX: event.target.value }
                                  : item,
                              ),
                            }))
                          }
                        />
                        <input
                          aria-label={`${block.id || 'block'} rotation y`}
                          type="number"
                          step="0.25"
                          value={block.rotationY}
                          onChange={(event) =>
                            setSubmissionDraft((draft) => ({
                              ...draft,
                              blueprintBlocks: draft.blueprintBlocks.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, rotationY: event.target.value }
                                  : item,
                              ),
                            }))
                          }
                        />
                        <input
                          aria-label={`${block.id || 'block'} rotation z`}
                          type="number"
                          step="0.25"
                          value={block.rotationZ}
                          onChange={(event) =>
                            setSubmissionDraft((draft) => ({
                              ...draft,
                              blueprintBlocks: draft.blueprintBlocks.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, rotationZ: event.target.value }
                                  : item,
                              ),
                            }))
                          }
                        />
                      </fieldset>
                      <button
                        type="button"
                        onClick={() =>
                          setSubmissionDraft((draft) => ({
                            ...draft,
                            blueprintBlocks: draft.blueprintBlocks.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          }))
                        }
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="plan-section turn-plan-editor" aria-labelledby="turn-plan-heading">
                <div className="plan-section-header">
                  <h3 id="turn-plan-heading">Turn plan commands</h3>
                  <button
                    type="button"
                    onClick={() =>
                      setSubmissionDraft((draft) => ({
                        ...draft,
                        turnCommands: [
                          ...draft.turnCommands,
                          {
                            tick: String(draft.turnCommands.length + 1),
                            move: '',
                            weaponA: '',
                            weaponB: '',
                            utility: '',
                          },
                        ],
                      }))
                    }
                  >
                    Add command
                  </button>
                </div>
                <div className="turn-command-list">
                  {submissionDraft.turnCommands.map((command, index) => (
                    <div className="turn-command-row" key={`command-${index}`}>
                      <label>
                        <span>Tick</span>
                        <input
                          type="number"
                          min={1}
                          value={command.tick}
                          onChange={(event) =>
                            setSubmissionDraft((draft) => ({
                              ...draft,
                              turnCommands: draft.turnCommands.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, tick: event.target.value } : item,
                              ),
                            }))
                          }
                        />
                      </label>
                      <label>
                        <span>Move</span>
                        <select
                          value={command.move}
                          onChange={(event) =>
                            setSubmissionDraft((draft) => ({
                              ...draft,
                              turnCommands: draft.turnCommands.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, move: event.target.value as '' | MovementCommand }
                                  : item,
                              ),
                            }))
                          }
                        >
                          <option value="">-</option>
                          {MOVEMENT_COMMANDS.map((move) => (
                            <option key={move} value={move}>
                              {move}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>Weapon A</span>
                        <select
                          value={command.weaponA}
                          onChange={(event) =>
                            setSubmissionDraft((draft) => ({
                              ...draft,
                              turnCommands: draft.turnCommands.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, weaponA: event.target.value as '' | WeaponCommand }
                                  : item,
                              ),
                            }))
                          }
                        >
                          <option value="">-</option>
                          <option value="fire">fire</option>
                          <option value="hold">hold</option>
                        </select>
                      </label>
                      <label>
                        <span>Weapon B</span>
                        <select
                          value={command.weaponB}
                          onChange={(event) =>
                            setSubmissionDraft((draft) => ({
                              ...draft,
                              turnCommands: draft.turnCommands.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, weaponB: event.target.value as '' | WeaponCommand }
                                  : item,
                              ),
                            }))
                          }
                        >
                          <option value="">-</option>
                          <option value="fire">fire</option>
                          <option value="hold">hold</option>
                        </select>
                      </label>
                      <label>
                        <span>Utility</span>
                        <select
                          value={command.utility}
                          onChange={(event) =>
                            setSubmissionDraft((draft) => ({
                              ...draft,
                              turnCommands: draft.turnCommands.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, utility: event.target.value as '' | UtilityCommand }
                                  : item,
                              ),
                            }))
                          }
                        >
                          <option value="">-</option>
                          <option value="activate">activate</option>
                          <option value="hold">hold</option>
                        </select>
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setSubmissionDraft((draft) => ({
                            ...draft,
                            turnCommands: draft.turnCommands.filter((_, itemIndex) => itemIndex !== index),
                          }))
                        }
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </section>

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
            </div>
          ) : (
            <label className="submission-editor json-editor">
              <span>Round plan JSON</span>
              <textarea
                spellCheck={false}
                value={submissionText}
                onChange={(event) => setSubmissionText(event.target.value)}
              />
            </label>
          )}

          <div className="submit-dock">
            <dl className="agent-facts">
              <Fact label="Action" value={roleState?.submitted ? 'Submitted' : 'Ready to submit'} />
              <Fact label="Blueprint" value={`${draftSubmission.blueprint.blocks.length} blocks`} />
              <Fact label="Plan" value={`${draftSubmission.turnPlan.commands.length} commands`} />
            </dl>
            <button type="button" onClick={() => void submitRoundPlan()} disabled={!canSubmitPlan}>
              Submit round plan
            </button>
          </div>
        </section>

        <aside className="cockpit-reference-stack">
          <section className="agent-live-panel agent-handoff-panel" aria-labelledby="handoff-heading">
            <div className="plan-section-header">
              <SectionTitle id="handoff-heading" title="External agent brief" />
              <button type="button" onClick={() => void copyExternalAgentBrief()}>
                Copy brief
              </button>
            </div>
            <textarea
              className="agent-brief-text"
              spellCheck={false}
              readOnly
              value={externalAgentBriefMarkdown}
              aria-label="External agent brief"
            />
          </section>

          <section className="agent-live-panel" aria-labelledby="error-heading">
            <SectionTitle id="error-heading" title="Last validation error" />
            {lastError ? <ErrorPanel error={lastError} /> : <p className="agent-empty">No hard error from the last action.</p>}
          </section>

          <section className="agent-live-panel" aria-labelledby="inventory-heading">
            <SectionTitle id="inventory-heading" title="Inventory" />
            <InventoryTable state={roleState} />
          </section>

          <section className="agent-live-panel" aria-labelledby="shop-heading">
            <SectionTitle id="shop-heading" title="Shop offers" />
            <PartTable parts={PART_CATALOG.slice(0, 20)} />
          </section>

          <section className="agent-live-panel" aria-labelledby="awards-heading">
            <SectionTitle id="awards-heading" title="Award incentives" />
            <AwardIncentives state={roleState} publicState={publicState} />
          </section>

          <section className="agent-live-panel chat-panel private-chat-panel" aria-labelledby="private-chat-heading">
            <div className="plan-section-header">
              <SectionTitle id="private-chat-heading" title="Private notes" />
              <span className="chat-count">{privateChatLog.length} role-only</span>
            </div>
            <form
              className="agent-chat-form private-chat-form"
              onSubmit={(event) => {
                event.preventDefault()
                void submitPrivateChatMessage()
              }}
            >
              <label>
                Kind
                <select
                  value={privateChatKind}
                  onChange={(event) => setPrivateChatKind(event.target.value as AgentChatMessageKind)}
                  disabled={!roleState || isTerminalPhase(roleState.phase) || privateChatStatus === 'posting'}
                >
                  <option value="strategy">Strategy</option>
                  <option value="reflection">Reflection</option>
                  <option value="observation">Observation</option>
                  <option value="taunt">Taunt</option>
                </select>
              </label>
              <label className="agent-chat-message-field">
                Note
                <textarea
                  maxLength={420}
                  value={privateChatMessage}
                  onChange={(event) => setPrivateChatMessage(event.target.value)}
                  placeholder="Role-private conclusions for the next build."
                  disabled={!roleState || isTerminalPhase(roleState.phase) || privateChatStatus === 'posting'}
                />
              </label>
              <div className="agent-chat-actions">
                <span>{privateChatMessage.trim().length} / 420</span>
                <button type="submit" disabled={!canPostPrivateChat}>
                  {privateChatStatus === 'posting' ? 'Saving...' : 'Save note'}
                </button>
              </div>
            </form>
            <AgentChatLog messages={privateChatLog} />
            {!roleHasPrivateChatLog ? <p className="agent-empty">No private notes loaded.</p> : null}
          </section>

          <section className="agent-live-panel chat-panel" aria-labelledby="chat-heading">
            <div className="plan-section-header">
              <SectionTitle id="chat-heading" title="Bot chat" />
              <span className="chat-count">{chatLog.length} public</span>
            </div>
            <form
              className="agent-chat-form"
              onSubmit={(event) => {
                event.preventDefault()
                void submitChatMessage()
              }}
            >
              <label>
                Kind
                <select
                  value={chatKind}
                  onChange={(event) => setChatKind(event.target.value as AgentChatMessageKind)}
                  disabled={!roleState || isTerminalPhase(roleState.phase) || chatStatus === 'posting'}
                >
                  <option value="reflection">Reflection</option>
                  <option value="strategy">Strategy</option>
                  <option value="observation">Observation</option>
                  <option value="taunt">Taunt</option>
                </select>
              </label>
              <label className="agent-chat-message-field">
                Message
                <textarea
                  maxLength={420}
                  value={chatMessage}
                  onChange={(event) => setChatMessage(event.target.value)}
                  placeholder="Public, concise, and useful. No secrets or hidden reasoning."
                  disabled={!roleState || isTerminalPhase(roleState.phase) || chatStatus === 'posting'}
                />
              </label>
              <div className="agent-chat-actions">
                <span>{chatMessage.trim().length} / 420</span>
                <button type="submit" disabled={!canPostChat}>
                  {chatStatus === 'posting' ? 'Posting...' : 'Post chat'}
                </button>
              </div>
            </form>
            <AgentChatLog messages={chatLog} />
            {!roleHasChatLog ? <p className="agent-empty">No bot chat loaded.</p> : null}
          </section>

          <section className="agent-live-panel match-log-panel" aria-labelledby="match-log-heading">
            <SectionTitle id="match-log-heading" title="Match log" />
            <ol className="agent-log">
              {matchLog.map((event) => (
                <li key={`${event.at}-${event.type}-${event.message}`}>
                  <time dateTime={event.at}>{formatDateTime(event.at)}</time>
                  <strong>{formatPhase(event.type)}</strong>
                  <span>{event.message}</span>
                </li>
              ))}
            </ol>
            {!roleHasMatchLog ? <p className="agent-empty">No match events loaded.</p> : null}
          </section>
        </aside>
      </div>

      <script
        id="agent-arena-state"
        type="application/json"
        dangerouslySetInnerHTML={{ __html: stateScript }}
      />
      <script
        id="agent-arena-brief"
        type="application/json"
        dangerouslySetInnerHTML={{ __html: externalAgentBriefScript }}
      />
    </main>
  )
}

function InvalidInvite({ errors }: { errors: string[] }) {
  const stateScript = serializeJsonForScript({ ok: false, errors })

  return (
    <main className="agent-live-app">
      <section className="agent-live-panel invalid-invite" aria-labelledby="invalid-invite-heading">
        <SectionTitle id="invalid-invite-heading" title="Invalid invite" />
        <ErrorPanel
          error={{
            title: 'Invite fragment cannot be used',
            message: 'The page needs a fragment with session, role, and api values.',
            code: 'INVALID_INVITE',
            issues: errors.map((message, index) => ({
              code: 'INVALID_INVITE_FRAGMENT',
              path: `fragment.${index}`,
              message,
            })),
          }}
        />
      </section>
      <script
        id="agent-arena-state"
        type="application/json"
        dangerouslySetInnerHTML={{ __html: stateScript }}
      />
    </main>
  )
}

function SectionTitle({ id, title }: { id: string; title: string }) {
  return <h2 id={id}>{title}</h2>
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function PlanMetric({
  label,
  tone,
  value,
}: {
  label: string
  tone?: 'danger' | 'ok'
  value: string
}) {
  return (
    <div className={`plan-metric ${tone ? `tone-${tone}` : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

type DraftSummary = {
  blockCount: number
  commandCount: number
  mobilityParts: number
  purchaseCost: number
  remainingGold?: number
  weaponParts: number
}

function summarizeDraft(draft: RoundPlanDraft, availableGold: number | undefined): DraftSummary {
  const purchaseCost = draft.purchases.reduce((total, purchase) => {
    const part = getPart(purchase.partId)
    const quantity = Math.max(0, Math.trunc(safeNumber(purchase.quantity, 0)))

    return total + (part?.cost ?? 0) * quantity
  }, 0)
  const blueprintParts = draft.blueprintBlocks
    .map((block) => getPart(block.partId))
    .filter((part): part is PartDefinition => Boolean(part))

  return {
    blockCount: draft.blueprintBlocks.filter((block) => block.partId.trim()).length,
    commandCount: draft.turnCommands.length,
    mobilityParts: blueprintParts.filter((part) => Boolean(part.controls?.movement)).length,
    purchaseCost,
    remainingGold: availableGold === undefined ? undefined : availableGold - purchaseCost,
    weaponParts: blueprintParts.filter((part) => Boolean(part.controls?.weapon)).length,
  }
}

function purchaseCostLabel(purchase: PurchaseDraft): string {
  const part = getPart(purchase.partId)
  const quantity = Math.max(0, Math.trunc(safeNumber(purchase.quantity, 0)))

  if (!part || quantity <= 0) {
    return '-'
  }

  return `${part.cost * quantity}g`
}

function AwardIncentives({
  state,
  publicState,
}: {
  state: RolePrivateState | null
  publicState: PublicSessionState | null
}) {
  const awards = state?.awardOptions ?? publicState?.awardOptions ?? []

  if (awards.length === 0) {
    return <p className="agent-empty">No referee award incentives are available for this phase.</p>
  }

  return (
    <ul className="agent-award-list">
      {awards.map((award) => (
        <li key={award.id}>
          <strong>{award.title}</strong>
          <span>+{award.gold}g next round</span>
          <p>{award.description}</p>
        </li>
      ))}
    </ul>
  )
}

function AgentChatLog({ messages }: { messages: SessionChatMessage[] }) {
  if (messages.length === 0) {
    return null
  }

  return (
    <ol className="chat-log agent-chat-log">
      {messages.map((message) => (
        <li className={`chat-message ${message.role}`} key={message.id}>
          <div className="chat-message-header">
            <span className={`role-chip ${message.role}`}>{capitalize(message.role)}</span>
            <strong>{formatPhase(message.kind)}</strong>
            <time dateTime={message.at}>{formatDateTime(message.at)}</time>
          </div>
          <p>{message.message}</p>
          <small>
            Round {message.round} / {formatPhase(message.phase)}
            {message.agentName ? ` / ${message.agentName}` : ''}
          </small>
        </li>
      ))}
    </ol>
  )
}

function InventoryTable({ state }: { state: RolePrivateState | null }) {
  const items = state?.inventory ?? []

  if (items.length === 0) {
    return <p className="agent-empty">No owned parts in current role state.</p>
  }

  return (
    <table className="agent-table">
      <thead>
        <tr>
          <th>Part</th>
          <th>Qty</th>
          <th>Category</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const part = getPart(item.partId)

          return (
            <tr key={item.partId}>
              <td>{part?.displayName ?? item.partId}</td>
              <td>{item.quantity}</td>
              <td>{part?.category ?? 'unknown'}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function PartTable({ parts }: { parts: PartDefinition[] }) {
  return (
    <table className="agent-table">
      <thead>
        <tr>
          <th>Part</th>
          <th>Type</th>
          <th>Cost</th>
          <th>Tags</th>
        </tr>
      </thead>
      <tbody>
        {parts.map((part) => (
          <tr key={part.id}>
            <td>{part.displayName}</td>
            <td>{part.category}</td>
            <td>{part.cost}</td>
            <td>{part.tags.length > 0 ? part.tags.join(', ') : 'none'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ErrorPanel({ error }: { error: UiError }) {
  return (
    <div className="agent-error" role="alert">
      <strong>{error.title}</strong>
      <p>{error.message}</p>
      <dl className="agent-facts">
        {error.code ? <Fact label="Code" value={error.code} /> : null}
        {error.status ? <Fact label="HTTP" value={String(error.status)} /> : null}
      </dl>
      {error.issues && error.issues.length > 0 ? (
        <ul>
          {error.issues.map((issue) => (
            <li key={`${issue.path}-${issue.code}-${issue.message}`}>
              <code>{issue.path}</code> {issue.code}: {issue.message}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function createSampleSubmission(): RoundPlanSubmission {
  return {
    action: 'submit_round_plan',
    purchases: [
      { partId: 'Body_Square_Medium', quantity: 1 },
      { partId: 'Wheel_Large', quantity: 2 },
      { partId: 'Weapon_Spinner_Small', quantity: 1 },
    ],
    blueprint: {
      name: 'Baseline Spinner',
      blocks: [
        { id: 'core', partId: 'Body_Square_Medium', position: [0, 0, 0], rotation: [0, 0, 0] },
        { id: 'leftWheel', partId: 'Wheel_Large', position: [-1, 0, 0], rotation: [0, 0, 90] },
        { id: 'rightWheel', partId: 'Wheel_Large', position: [1, 0, 0], rotation: [0, 0, 90] },
        { id: 'spinner', partId: 'Weapon_Spinner_Small', position: [0, 0, 1], rotation: [0, 0, 0] },
      ],
    },
    turnPlan: {
      commands: [
        { tick: 1, move: 'dash_forward', weaponA: 'hold' },
        { tick: 2, move: 'circle_left', weaponA: 'fire' },
        { tick: 3, move: 'strafe_right', weaponA: 'hold' },
        { tick: 4, move: 'dash_backward', weaponA: 'fire' },
        { tick: 5, move: 'circle_right', weaponA: 'hold' },
      ],
    },
    rationale: 'A compact baseline that keeps budget clear and produces repeatable timing.',
  }
}

function createDraftFromSubmission(submission: RoundPlanSubmission): RoundPlanDraft {
  return {
    purchases: submission.purchases.map((purchase) => ({
      partId: purchase.partId,
      quantity: String(purchase.quantity),
    })),
    blueprintName: submission.blueprint.name,
    blueprintBlocks: submission.blueprint.blocks.map((block) => ({
      id: block.id,
      partId: block.partId,
      positionX: String(block.position[0]),
      positionY: String(block.position[1]),
      positionZ: String(block.position[2]),
      rotationX: String(block.rotation[0]),
      rotationY: String(block.rotation[1]),
      rotationZ: String(block.rotation[2]),
      label: block.label ?? '',
    })),
    turnCommands: submission.turnPlan.commands.map((command) => ({
      tick: String(command.tick),
      move: command.move ?? '',
      weaponA: command.weaponA ?? '',
      weaponB: command.weaponB ?? '',
      utility: command.utility ?? '',
    })),
    rationale: submission.rationale ?? '',
  }
}

function parseSubmissionText(input: string): RoundPlanSubmission {
  const value = JSON.parse(input) as unknown

  if (!value || typeof value !== 'object') {
    throw new Error('Submission must be a JSON object.')
  }

  return value as RoundPlanSubmission
}

function normalizeSubmissionForDraft(submission: RoundPlanSubmission): RoundPlanSubmission {
  const value = submission as {
    purchases?: unknown
    blueprint?: unknown
    turnPlan?: unknown
    rationale?: unknown
  }
  const blueprint = normalizeBlueprint(value.blueprint)
  const turnPlan = normalizeTurnPlan(value.turnPlan)

  return {
    action: 'submit_round_plan',
    purchases: normalizePurchases(value.purchases),
    blueprint,
    turnPlan,
    rationale:
      typeof value.rationale === 'string' && value.rationale.trim().length > 0
        ? value.rationale.trim()
        : undefined,
  }
}

function buildSubmissionFromDraft(draft: RoundPlanDraft): RoundPlanSubmission {
  return {
    action: 'submit_round_plan',
    purchases: draft.purchases
      .map((purchase) => ({
        partId: purchase.partId.trim(),
        quantity: Math.max(0, Math.trunc(safeNumber(purchase.quantity, 0))),
      }))
      .filter((purchase) => purchase.partId && purchase.quantity > 0),
    blueprint: {
      name: draft.blueprintName.trim() || 'Blueprint',
      blocks: draft.blueprintBlocks
        .filter((block) => block.partId.trim())
        .map((block, index) => ({
          id: block.id.trim() || `block_${index + 1}`,
          partId: block.partId.trim(),
          position: [
            safeNumber(block.positionX, 0),
            safeNumber(block.positionY, 0),
            safeNumber(block.positionZ, 0),
          ],
          rotation: [
            safeNumber(block.rotationX, 0),
            safeNumber(block.rotationY, 0),
            safeNumber(block.rotationZ, 0),
          ],
          ...(block.label.trim() ? { label: block.label.trim() } : {}),
        })),
    },
    turnPlan: {
      commands: draft.turnCommands
        .map((command, index) => {
          const next: TurnCommand = {
            tick: Math.max(1, Math.trunc(safeNumber(command.tick, index + 1))),
          }

          if (command.move) {
            next.move = command.move
          }

          if (command.weaponA) {
            next.weaponA = command.weaponA
          }

          if (command.weaponB) {
            next.weaponB = command.weaponB
          }

          if (command.utility) {
            next.utility = command.utility
          }

          return next
        }),
    },
    ...(draft.rationale.trim() ? { rationale: draft.rationale.trim() } : {}),
  }
}

function normalizePurchases(value: unknown): RoundPlanSubmission['purchases'] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return undefined
      }

      const purchase = item as { partId?: unknown; quantity?: unknown }
      const partId = typeof purchase.partId === 'string' ? purchase.partId.trim() : ''
      const quantity = safeNumber(purchase.quantity, 0)

      if (!partId || quantity <= 0) {
        return undefined
      }

      return {
        partId,
        quantity,
      }
    })
    .filter((item): item is { partId: string; quantity: number } => item !== undefined)
}

function normalizeBlueprint(value: unknown): RoundPlanSubmission['blueprint'] {
  const raw = value && typeof value === 'object' ? (value as { name?: unknown; blocks?: unknown }) : {}
  const name =
    typeof raw.name === 'string' && raw.name.trim().length > 0 ? raw.name.trim() : 'Blueprint'

  const blocks = Array.isArray(raw.blocks)
    ? raw.blocks
        .map((item, index) => {
          if (!item || typeof item !== 'object') {
            return undefined
          }

          const partValue = item as { id?: unknown; partId?: unknown; label?: unknown; position?: unknown; rotation?: unknown }
          const partId = typeof partValue.partId === 'string' ? partValue.partId.trim() : ''
          const blockId =
            typeof partValue.id === 'string' && partValue.id.trim().length > 0
              ? partValue.id.trim()
              : `block_${index + 1}`
          const label =
            typeof partValue.label === 'string' && partValue.label.trim().length > 0
              ? partValue.label.trim()
              : undefined

          if (!partId) {
            return undefined
          }

          const positionValue =
            partValue.position && typeof partValue.position === 'object' && Array.isArray(partValue.position)
              ? partValue.position
              : []
          const rotationValue =
            partValue.rotation && typeof partValue.rotation === 'object' && Array.isArray(partValue.rotation)
              ? partValue.rotation
              : []

          const block = {
            id: blockId,
            partId,
            position: asVector3(positionValue),
            rotation: asVector3(rotationValue),
            ...(label ? { label } : {}),
          }

          return block
        })
        .filter(
          (
            item,
          ): item is {
            id: string
            partId: string
            position: [number, number, number]
            rotation: [number, number, number]
            label?: string
          } => item !== undefined,
        )
    : []

  return {
    name,
    blocks,
  }
}

function asVector3(value: unknown[]): [number, number, number] {
  return [
    safeNumber(value[0], 0),
    safeNumber(value[1], 0),
    safeNumber(value[2], 0),
  ]
}

function normalizeTurnPlan(value: unknown): RoundPlanSubmission['turnPlan'] {
  if (!value || typeof value !== 'object') {
    return { commands: [] }
  }

  const raw = value as { commands?: unknown }
  if (!Array.isArray(raw.commands)) {
    return { commands: [] }
  }

  return {
    commands: raw.commands
      .map((item, index) => {
        if (!item || typeof item !== 'object') {
          return undefined
        }

        const command = item as {
          tick?: unknown
          move?: unknown
          weaponA?: unknown
          weaponB?: unknown
          utility?: unknown
        }
        const next: TurnCommand = {
          tick: Math.max(1, Math.trunc(safeNumber(command.tick, index + 1))),
        }

        if (isMovementCommand(command.move)) {
          next.move = command.move
        }

        if (isWeaponCommand(command.weaponA)) {
          next.weaponA = command.weaponA
        }

        if (isWeaponCommand(command.weaponB)) {
          next.weaponB = command.weaponB
        }

        if (isUtilityCommand(command.utility)) {
          next.utility = command.utility
        }

        return next
      })
      .filter((item): item is TurnCommand => item !== undefined),
  }
}

function isMovementCommand(value: unknown): value is MovementCommand {
  return MOVEMENT_COMMANDS.includes(value as MovementCommand)
}

function isWeaponCommand(value: unknown): value is WeaponCommand {
  return value === 'fire' || value === 'hold'
}

function isUtilityCommand(value: unknown): value is UtilityCommand {
  return value === 'activate' || value === 'hold'
}

function safeNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)

    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return fallback
}

function toUiError(error: unknown, title: string): UiError {
  if (error instanceof AgentArenaApiError) {
    return {
      title,
      message: error.message,
      code: error.code,
      status: error.status,
      issues: error.issues,
    }
  }

  return {
    title,
    message: error instanceof Error ? error.message : 'Unknown error.',
  }
}

function submissionNotice(state: RolePrivateState): string {
  if (!state.submitted) {
    return 'No round plan has been accepted for this role.'
  }

  if (state.phase === 'submission_phase' && !state.opponent.submitted) {
    return `Plan accepted. Waiting for ${capitalize(state.opponent.role)}.`
  }

  if (state.phase === 'replay_phase') {
    return 'Both plans resolved. Replay data is available.'
  }

  return `Plan accepted. Current phase is ${formatPhase(state.phase)}.`
}

function opponentLabel(state: RolePrivateState): string {
  return `${capitalize(state.opponent.role)} ${state.opponent.submitted ? 'submitted' : 'waiting'}`
}

function isTerminalPhase(phase: RolePrivateState['phase'] | undefined): boolean {
  return phase === 'session_complete' || phase === 'expired'
}

function formatStatus(status: LoadStatus): string {
  return status
    .split('_')
    .map((word) => capitalize(word))
    .join(' ')
}

function formatPhase(value: string): string {
  return value
    .split('_')
    .map((word) => capitalize(word))
    .join(' ')
}

function formatDateTime(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
