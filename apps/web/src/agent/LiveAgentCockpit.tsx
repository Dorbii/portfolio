import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PART_CATALOG, getPart } from '../../../../packages/catalog/src/index.js'
import type {
  PartDefinition,
  PublicSessionState,
  RolePrivateState,
  RoundPlanSubmission,
  ValidationIssue,
} from '../../../../packages/schemas/src/index.js'
import {
  AgentArenaApiError,
  AgentArenaClient,
  createAgentArenaRoleApi,
  createSafeAgentHash,
  getValidAgentActions,
  parseAgentInviteFragment,
  readStoredRoleToken,
  serializeJsonForScript,
  writeStoredRoleToken,
  type AgentInvite,
  type AgentInviteParseResult,
} from './agentClient'

type LoadStatus = 'idle' | 'claiming' | 'loading' | 'ready'

type UiError = {
  title: string
  message: string
  code?: string
  status?: number
  issues?: ValidationIssue[]
}

const POLL_MS = 4_000
const autoClaimAttempts = new Set<string>()

export function LiveAgentCockpit() {
  const parseResult = useMemo<AgentInviteParseResult>(
    () => parseAgentInviteFragment(window.location.hash, window.location.origin),
    [],
  )

  if (!parseResult.ok) {
    return <InvalidInvite errors={parseResult.errors} />
  }

  return <ClaimedAgentCockpit invite={parseResult.value} />
}

function ClaimedAgentCockpit({ invite }: { invite: AgentInvite }) {
  const [roleToken, setRoleToken] = useState(
    () => readStoredRoleToken(window.sessionStorage, invite) ?? '',
  )
  const roleTokenRef = useRef(roleToken || undefined)
  const roleStateRef = useRef<RolePrivateState | null>(null)
  const [roleState, setRoleState] = useState<RolePrivateState | null>(null)
  const [publicState, setPublicState] = useState<PublicSessionState | null>(null)
  const [status, setStatus] = useState<LoadStatus>('idle')
  const [agentName, setAgentName] = useState('')
  const [lastError, setLastError] = useState<UiError | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [submissionText, setSubmissionText] = useState(() =>
    JSON.stringify(createSampleSubmission(), null, 2),
  )

  const client = useMemo(
    () =>
      new AgentArenaClient({
        invite,
        getRoleToken: () => roleTokenRef.current,
      }),
    [invite],
  )

  useEffect(() => {
    roleTokenRef.current = roleToken || undefined
  }, [roleToken])

  useEffect(() => {
    roleStateRef.current = roleState
  }, [roleState])

  useEffect(() => {
    const api = createAgentArenaRoleApi(client, () => roleStateRef.current)

    window.AgentArenaRole = api

    return () => {
      if (window.AgentArenaRole === api) {
        delete window.AgentArenaRole
      }
    }
  }, [client])

  const loadState = useCallback(
    async (options: { quiet?: boolean } = {}) => {
      if (!roleTokenRef.current) {
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
        setStatus('ready')
      } catch (error) {
        setLastError(toUiError(error, 'State load failed'))
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
    }, POLL_MS)

    return () => window.clearInterval(intervalId)
  }, [loadState, roleState?.phase, roleToken])

  const claimRole = useCallback(async () => {
    if (!invite.claimToken) {
      setLastError({
        title: 'Claim token missing',
        message: 'This invite can load a stored role token, but it cannot claim a new role.',
        code: 'INVALID_INVITE',
      })
      return
    }

    setStatus('claiming')
    setLastError(null)
    setNotice(null)

    try {
      const claim = await client.claimRole({
        claimToken: invite.claimToken,
        agentName,
      })

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
    } catch (error) {
      setStatus('ready')
      setLastError(toUiError(error, 'Claim failed'))
    }
  }, [agentName, client, invite])

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

  const submitRoundPlan = async () => {
    setLastError(null)
    setNotice(null)

    let submission: RoundPlanSubmission

    try {
      submission = JSON.parse(submissionText) as RoundPlanSubmission
    } catch (error) {
      setLastError({
        title: 'Submission JSON is invalid',
        message: error instanceof Error ? error.message : 'The form body is not valid JSON.',
        code: 'BAD_JSON',
      })
      return
    }

    setStatus('loading')

    try {
      const result = await client.submitRoundPlan(submission)

      setRoleState(result.state)
      setPublicState(result.publicState)
      setStatus('ready')
      setNotice(submissionNotice(result.state))
    } catch (error) {
      setStatus('ready')
      setLastError(toUiError(error, 'Submission failed'))
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

  return (
    <main className="agent-live-app">
      <header className="agent-live-header">
        <div>
          <span className="eyebrow">Agent Arena</span>
          <h1>{capitalize(invite.role)} Agent Cockpit</h1>
        </div>
        <a href={`${invite.apiBase}/agent-spec.json`}>agent-spec.json</a>
      </header>

      <div className="agent-live-grid">
        <section className="agent-live-panel role-summary" aria-labelledby="role-summary-heading">
          <SectionTitle id="role-summary-heading" title="Role summary" />
          <dl className="agent-facts">
            <Fact label="Session" value={invite.sessionId} />
            <Fact label="Role" value={capitalize(invite.role)} />
            <Fact label="API" value={invite.apiBase} />
            <Fact label="Claim token" value={invite.claimToken ? 'Present' : 'Not in fragment'} />
            <Fact label="Bearer token" value={roleToken ? 'Stored in this tab' : 'Not claimed'} />
            <Fact label="Status" value={formatStatus(status)} />
          </dl>
          <div className="claim-controls">
            <label>
              Agent name
              <input
                value={agentName}
                onChange={(event) => setAgentName(event.target.value)}
                maxLength={80}
              />
            </label>
            <div className="agent-button-row">
              <button
                type="button"
                onClick={() => void claimRole()}
                disabled={status === 'claiming' || Boolean(roleToken)}
              >
                Claim role
              </button>
              <button
                type="button"
                onClick={() => void loadState()}
                disabled={!roleToken || status === 'loading'}
              >
                Refresh state
              </button>
            </div>
          </div>
          {notice ? (
            <p className="agent-notice" aria-live="polite">
              {notice}
            </p>
          ) : null}
        </section>

        <section className="agent-live-panel" aria-labelledby="phase-heading">
          <SectionTitle id="phase-heading" title="Current phase" />
          {roleState ? (
            <dl className="agent-facts">
              <Fact label="Phase" value={formatPhase(roleState.phase)} />
              <Fact label="Round" value={String(roleState.round)} />
              <Fact label="Gold" value={String(roleState.gold)} />
              <Fact label="Submitted" value={roleState.submitted ? 'Yes' : 'No'} />
              <Fact label="Opponent" value={opponentLabel(roleState)} />
              <Fact label="Expires" value={formatDateTime(roleState.expiresAt)} />
            </dl>
          ) : (
            <p className="agent-empty">Claim this role or reuse a stored bearer token to load private state.</p>
          )}
          {roleState?.submitted ? (
            <p className="agent-waiting">{submissionNotice(roleState)}</p>
          ) : null}
        </section>

        <section className="agent-live-panel" aria-labelledby="submission-heading">
          <SectionTitle id="submission-heading" title="Submission form" />
          <label className="submission-editor">
            Round plan JSON
            <textarea
              spellCheck={false}
              value={submissionText}
              onChange={(event) => setSubmissionText(event.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={() => void submitRoundPlan()}
            disabled={!roleToken || status === 'loading' || Boolean(roleState?.submitted)}
          >
            Submit round plan
          </button>
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

        <section className="agent-live-panel" aria-labelledby="arena-heading">
          <SectionTitle id="arena-heading" title="Current arena state" />
          {publicState ? (
            <dl className="agent-facts">
              <Fact label="Arena" value={publicState.arena.name} />
              <Fact label="Size" value={`${publicState.arena.width} x ${publicState.arena.height}`} />
              <Fact label="Hazards" value={publicState.arena.activeHazards.join(', ')} />
              <Fact label="Replay" value={publicState.replayAvailable ? 'Available' : 'Unavailable'} />
            </dl>
          ) : (
            <p className="agent-empty">Public arena state has not loaded.</p>
          )}
        </section>

        <section className="agent-live-panel" aria-labelledby="awards-heading">
          <SectionTitle id="awards-heading" title="Available award incentives" />
          <AwardIncentives state={roleState} publicState={publicState} />
        </section>

        <section className="agent-live-panel" aria-labelledby="opponent-heading">
          <SectionTitle id="opponent-heading" title="Opponent public history" />
          {roleState ? (
            <dl className="agent-facts">
              <Fact label="Opponent role" value={capitalize(roleState.opponent.role)} />
              <Fact label="Claimed" value={roleState.opponent.claimed ? 'Yes' : 'No'} />
              <Fact label="Submitted" value={roleState.opponent.submitted ? 'Yes' : 'No'} />
              <Fact label="Replay" value={roleState.replayAvailable ? 'Available' : 'Unavailable'} />
            </dl>
          ) : (
            <p className="agent-empty">Opponent state is available after role state loads.</p>
          )}
        </section>

        <section className="agent-live-panel match-log-panel" aria-labelledby="match-log-heading">
          <SectionTitle id="match-log-heading" title="Match log" />
          <ol className="agent-log">
            {(roleState?.eventLog ?? publicState?.eventLog ?? []).map((event) => (
              <li key={`${event.at}-${event.type}-${event.message}`}>
                <time dateTime={event.at}>{formatDateTime(event.at)}</time>
                <strong>{formatPhase(event.type)}</strong>
                <span>{event.message}</span>
              </li>
            ))}
          </ol>
          {!roleState && !publicState ? <p className="agent-empty">No match events loaded.</p> : null}
        </section>
      </div>

      <script
        id="agent-arena-state"
        type="application/json"
        dangerouslySetInnerHTML={{ __html: stateScript }}
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
        { tick: 1, move: 'forward', weaponA: 'hold' },
        { tick: 2, move: 'forward', weaponA: 'fire' },
        { tick: 3, move: 'turn_left', weaponA: 'hold' },
        { tick: 4, move: 'forward', weaponA: 'fire' },
        { tick: 5, move: 'brake', weaponA: 'hold' },
      ],
    },
  }
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
