import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  PublicSessionState,
  RefereeAwardSelection,
  RefereeAwardOption,
  RoleInvite,
  RolePublicState,
  TeamRole,
} from '../../../packages/schemas/src/index.js'
import type { ReplayEvent } from '../../../packages/replay/src/index.js'
import { LiveAgentCockpit } from './agent/LiveAgentCockpit'
import { createExternalAgentBriefMarkdown } from './agent/agentClient'
import {
  buildInviteUrl,
  clearStoredSession,
  createSession,
  DEFAULT_ARENA_API_BASE,
  POLL_INTERVAL_MS,
  isTerminalPhase,
  isValidSessionId,
  loadPublicSession,
  loadReplayPayload,
  normalizeSessionId,
  parseSessionIdFromLocation,
  resetRoleClaim,
  readStoredSession,
  setSessionIdInUrl,
  submitRefereeAwards,
  toUserMessage,
  writeStoredSession,
  type ReplayPayload,
} from './referee/refereeClient'
import { ReplayViewer } from './replay/ReplayViewer'

type SessionLoadState = 'idle' | 'busy'
type AwardSelections = Partial<Record<string, TeamRole>>

const MAX_AWARDS_PER_ROUND = 2
const MAX_AWARDS_PER_TEAM = 1

export default function App() {
  const isAgentPath = isAgentPathname(window.location.pathname)

  if (isAgentPath) {
    return <LiveAgentCockpit />
  }

  return <RefereeConsole />
}

function RefereeConsole() {
  const [sessionInput, setSessionInput] = useState(() => parseSessionIdFromLocation())
  const [activeSessionId, setActiveSessionId] = useState(() => parseSessionIdFromLocation())
  const [publicSession, setPublicSession] = useState<PublicSessionState | null>(null)
  const [invites, setInvites] = useState<RoleInvite[]>([])
  const [storedRefereeToken, setStoredRefereeToken] = useState('')
  const [manualRefereeToken, setManualRefereeToken] = useState('')
  const [loadState, setLoadState] = useState<SessionLoadState>('idle')
  const [replayLoadState, setReplayLoadState] = useState<SessionLoadState>('idle')
  const [submitState, setSubmitState] = useState<'idle' | 'submitting'>('idle')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [replayError, setReplayError] = useState('')
  const [replayPayload, setReplayPayload] = useState<ReplayPayload | null>(null)
  const [selectedAwards, setSelectedAwards] = useState<AwardSelections>({})
  const sessionIdRef = useRef(activeSessionId)
  const skipNextActiveLoadRef = useRef(false)
  const apiBase = DEFAULT_ARENA_API_BASE

  const selectedCount = useMemo(
    () => Object.keys(selectedAwards).length,
    [selectedAwards],
  )
  const selectedForTeam = useMemo(() => {
    const totals: Record<TeamRole, number> = { red: 0, blue: 0 }

    Object.values(selectedAwards).forEach((team) => {
      if (team) {
        totals[team] += 1
      }
    })

    return totals
  }, [selectedAwards])
  const activeRefereeToken = manualRefereeToken.trim() || storedRefereeToken
  const hasRefereeToken = activeRefereeToken.length > 0
  const isActiveSession = activeSessionId.length > 0
  const canSubmitAwards =
    publicSession?.phase === 'referee_awards' &&
    selectedCount > 0 &&
    hasRefereeToken &&
    submitState !== 'submitting'
  const canRefreshRoleClaim =
    isActiveSession &&
    hasRefereeToken &&
    loadState !== 'busy' &&
    (publicSession?.phase === 'waiting_for_agents' || publicSession?.phase === 'submission_phase')

  const clearSessionState = useCallback(() => {
    setPublicSession(null)
    setInvites([])
    setStoredRefereeToken('')
    setReplayPayload(null)
    setReplayError('')
    setSelectedAwards({})
    setMessage('')
    setError('')
  }, [])

  const hydrateStoredSession = useCallback(
    (sessionId: string) => {
      const normalizedSessionId = normalizeSessionId(sessionId)

      if (!normalizedSessionId) {
        return
      }

      try {
        clearStoredSession(window.localStorage, apiBase, normalizedSessionId)
      } catch {
        // Browser privacy settings can disable localStorage; sessionStorage is the active store.
      }

      const stored = readStoredSession(window.sessionStorage, apiBase, normalizedSessionId)

      if (stored) {
        setStoredRefereeToken(stored.refereeToken)
        return
      }

      setStoredRefereeToken('')
      setInvites([])
    },
    [apiBase],
  )

  const loadPublicState = useCallback(
    async (sessionId: string, options: { silent?: boolean } = {}) => {
      const normalizedSessionId = normalizeSessionId(sessionId)

      if (!isValidSessionId(normalizedSessionId)) {
        setError('Invalid session id. It should look like s_xxxx.')
        setLoadState('idle')
        return
      }

      if (!options.silent) {
        setLoadState('busy')
      }
      setError('')

      try {
        const state = await loadPublicSession(apiBase, normalizedSessionId)

        setPublicSession(state)
        if (!options.silent) {
          setMessage('Public session state loaded.')
        }
      } catch (loadError) {
        setPublicSession(null)
        setError(toUserMessage(loadError))
      } finally {
        if (!options.silent) {
          setLoadState('idle')
        }
      }
    },
    [apiBase],
  )

  const setActiveSession = useCallback(
    (sessionId: string) => {
      const normalizedSessionId = normalizeSessionId(sessionId)

      if (!normalizedSessionId) {
        clearSessionState()
        setActiveSessionId('')
        setSessionInput('')
        return
      }

      if (!isValidSessionId(normalizedSessionId)) {
        setError('Invalid session id. It should look like s_xxxx.')
        return
      }

      setError('')
      setMessage('')
      setSessionInput(normalizedSessionId)
      setSessionIdInUrl(normalizedSessionId)
      setManualRefereeToken('')
      setSelectedAwards({})

      if (normalizedSessionId === activeSessionId) {
        hydrateStoredSession(normalizedSessionId)
        void loadPublicState(normalizedSessionId)
        return
      }

      setActiveSessionId(normalizedSessionId)
    },
    [activeSessionId, clearSessionState, hydrateStoredSession, loadPublicState],
  )

  useEffect(() => {
    sessionIdRef.current = activeSessionId
  }, [activeSessionId])

  useEffect(() => {
    if (!activeSessionId) {
      clearSessionState()
      return
    }

    hydrateStoredSession(activeSessionId)
    if (skipNextActiveLoadRef.current) {
      skipNextActiveLoadRef.current = false
      return
    }

    void loadPublicState(activeSessionId)
  }, [activeSessionId, clearSessionState, hydrateStoredSession, loadPublicState])

  useEffect(() => {
    if (!activeSessionId || isTerminalPhase(publicSession?.phase)) {
      return
    }

    const id = window.setInterval(() => {
      if (sessionIdRef.current === activeSessionId) {
        if (document.visibilityState === 'hidden') {
          return
        }

        void loadPublicState(activeSessionId, { silent: true })
      }
    }, POLL_INTERVAL_MS)

    return () => {
      window.clearInterval(id)
    }
  }, [activeSessionId, publicSession?.phase, loadPublicState])

  useEffect(() => {
    if (!activeSessionId || !publicSession?.replayAvailable) {
      setReplayPayload(null)
      setReplayError('')
      setReplayLoadState('idle')
      return
    }

    let canceled = false

    setReplayLoadState('busy')
    setReplayError('')

    void loadReplayPayload(apiBase, activeSessionId)
      .then((payload) => {
        if (canceled) {
          return
        }

        setReplayPayload(payload)
        setReplayLoadState('idle')
      })
      .catch((loadError) => {
        if (canceled) {
          return
        }

        setReplayPayload(null)
        setReplayLoadState('idle')
        setReplayError(toUserMessage(loadError))
      })

    return () => {
      canceled = true
    }
  }, [activeSessionId, apiBase, publicSession?.replayAvailable, publicSession?.round])

  const createNewSession = useCallback(async () => {
    setLoadState('busy')
    setError('')
    setMessage('')

    try {
      const response = await createSession(apiBase)

      skipNextActiveLoadRef.current = true
      setActiveSessionId(response.sessionId)
      setSessionInput(response.sessionId)
      setSessionIdInUrl(response.sessionId)
      setPublicSession(response.publicState)
      setInvites(response.invites)
      setStoredRefereeToken(response.refereeToken)
      setManualRefereeToken('')
      setReplayPayload(null)
      setReplayError('')
      setSelectedAwards({})
      setMessage('Session created. Keep this tab open to retain the referee capability token.')
      writeStoredSession(window.sessionStorage, apiBase, response.sessionId, {
        refereeToken: response.refereeToken,
        expiresAt: response.publicState.expiresAt,
      })
    } catch (createError) {
      setError(toUserMessage(createError))
    } finally {
      setLoadState('idle')
    }
  }, [apiBase])

  const submitAwards = useCallback(async () => {
    if (!activeSessionId) {
      setError('Load a session before submitting awards.')
      return
    }

    if (!hasRefereeToken) {
      setError('Referee token is required to submit awards.')
      return
    }

    if (publicSession?.phase !== 'referee_awards') {
      setError(`Awards can be submitted only during referee_awards. Current phase: ${publicSession?.phase ?? 'unknown'}.`)
      return
    }

    const payload = Object.entries(selectedAwards)
      .map(([awardId, targetTeam]) =>
        targetTeam === undefined ? null : ({ awardId, targetTeam } as RefereeAwardSelection),
      )
      .filter((selection): selection is RefereeAwardSelection => selection !== null)

    if (payload.length === 0) {
      setError('Select at least one award before submitting.')
      return
    }

    setSubmitState('submitting')
    setError('')
    setMessage('')

    try {
      const response = await submitRefereeAwards(
        apiBase,
        activeSessionId,
        activeRefereeToken,
        payload,
      )

      writeStoredSession(window.sessionStorage, apiBase, activeSessionId, {
        refereeToken: activeRefereeToken,
        expiresAt: response.publicState.expiresAt,
      })
      setPublicSession(response.publicState)
      setStoredRefereeToken(activeRefereeToken)
      setSelectedAwards({})
      setMessage('Referee awards submitted.')
    } catch (awardError) {
      setError(toUserMessage(awardError))
    } finally {
      setSubmitState('idle')
    }
  }, [activeRefereeToken, activeSessionId, apiBase, hasRefereeToken, publicSession?.phase, selectedAwards])

  const copyAgentBrief = useCallback((role: TeamRole, brief: string) => {
    return navigator.clipboard
      .writeText(brief)
      .then(() => {
        setMessage(`${capitalize(role)} wake brief copied.`)
      })
      .catch(() => {
        setError('Clipboard copy blocked. Select and copy manually.')
      })
  }, [])

  const refreshRoleClaim = useCallback(
    async (role: TeamRole) => {
      if (!activeSessionId) {
        setError('Load a session before refreshing a role claim.')
        return
      }

      if (!hasRefereeToken) {
        setError('Referee token is required to refresh role claims.')
        return
      }

      if (publicSession?.phase !== 'waiting_for_agents' && publicSession?.phase !== 'submission_phase') {
        setError(
          `Role claims can be refreshed only before combat resolves. Current phase: ${publicSession?.phase ?? 'unknown'}.`,
        )
        return
      }

      setLoadState('busy')
      setError('')
      setMessage('')

      try {
        const response = await resetRoleClaim(
          apiBase,
          activeSessionId,
          activeRefereeToken,
          role,
        )
        const nextInvites = replaceInvite(invites, response.invite)

        setInvites(nextInvites)
        setPublicSession(response.publicState)
        setStoredRefereeToken(activeRefereeToken)
        writeStoredSession(window.sessionStorage, apiBase, activeSessionId, {
          refereeToken: activeRefereeToken,
          expiresAt: response.publicState.expiresAt,
        })
        setSelectedAwards({})
        setReplayPayload(null)
        setReplayError('')
        setMessage(`${capitalize(role)} role reset. Share the refreshed invite.`)
      } catch (resetError) {
        setError(toUserMessage(resetError))
      } finally {
        setLoadState('idle')
      }
    },
    [
      activeRefereeToken,
      activeSessionId,
      apiBase,
      hasRefereeToken,
      invites,
      publicSession?.phase,
    ],
  )

  const toggleAwardSelection = useCallback(
    (awardId: string, team: TeamRole) => {
      setSelectedAwards((previous) => {
        const currentTeam = previous[awardId]
        const next = { ...previous }

        if (currentTeam === team) {
          delete next[awardId]
          return next
        }

        const nextCount = Object.keys(previous).length
        const currentTeamCount = selectedForTeam[team]

        if (!currentTeam && nextCount >= MAX_AWARDS_PER_ROUND) {
          return previous
        }

        if (currentTeam && currentTeam !== team && currentTeamCount >= MAX_AWARDS_PER_TEAM) {
          return previous
        }

        if (!currentTeam && currentTeamCount >= MAX_AWARDS_PER_TEAM) {
          return previous
        }

        next[awardId] = team
        return next
      })
    },
    [selectedForTeam],
  )

  const hasInviteForRole = useCallback(
    (role: TeamRole) => {
      return invites.some((invite) => invite.role === role && invite.claimToken.length > 0)
    },
    [invites],
  )

  const redInvite = invites.find((invite) => invite.role === 'red')
  const blueInvite = invites.find((invite) => invite.role === 'blue')
  const redInviteUrl = redInvite && activeSessionId
    ? buildInviteUrl({
        role: 'red',
        claimToken: redInvite.claimToken,
        sessionId: activeSessionId,
        apiBase,
      })
    : ''
  const blueInviteUrl = blueInvite && activeSessionId
    ? buildInviteUrl({
        role: 'blue',
        claimToken: blueInvite.claimToken,
        sessionId: activeSessionId,
        apiBase,
      })
    : ''
  const redAgentBrief = redInvite && redInviteUrl && activeSessionId
    ? createExternalAgentBriefMarkdown({
        invite: {
          sessionId: activeSessionId,
          role: 'red',
          apiBase,
          claimToken: redInvite.claimToken,
        },
        inviteUrl: redInviteUrl,
        publicState: publicSession,
      })
    : ''
  const blueAgentBrief = blueInvite && blueInviteUrl && activeSessionId
    ? createExternalAgentBriefMarkdown({
        invite: {
          sessionId: activeSessionId,
          role: 'blue',
          apiBase,
          claimToken: blueInvite.claimToken,
        },
        inviteUrl: blueInviteUrl,
        publicState: publicSession,
      })
    : ''

  const phase = publicSession?.phase ?? 'not_started'
  const awardOptions = publicSession?.awardOptions ?? ([] as RefereeAwardOption[])
  const sessionEvents = publicSession?.eventLog ?? ([] as PublicSessionState['eventLog'])

  return (
    <main className="arena-app">
      <header className="top-bar">
        <div className="brand-block">
          <span className="eyebrow">Agent Arena</span>
          <h1>Referee Console</h1>
        </div>
        <div className="session-strip" aria-live="polite">
          <Metric label="Session" value={activeSessionId || 'Not loaded'} />
          <Metric label="Phase" value={formatPhase(phase)} />
          <Metric label="Round" value={publicSession ? `${publicSession.round} / ${publicSession.maxRounds}` : '0 / 0'} />
          <Metric
            label="Replay"
            value={publicSession ? (publicSession.replayAvailable ? 'Ready' : 'Unavailable') : 'Unavailable'}
          />
        </div>
      </header>

      <section className="referee-grid">
        <section className="panel">
          <SectionHeader
            kicker="Session control"
            title="Create or load"
            aside={isActiveSession ? 'Session id controls public visibility.' : 'No active session'}
          />
          <div className="referee-form">
            <label>
              Session ID
              <input
                value={sessionInput}
                maxLength={64}
                onChange={(event) => setSessionInput(event.target.value)}
                disabled={loadState === 'busy'}
              />
            </label>
            <button
              type="button"
              onClick={() => void setActiveSession(sessionInput)}
              disabled={loadState === 'busy' || !sessionInput.trim()}
            >
              {loadState === 'busy' ? 'Loading...' : 'Load session'}
            </button>
            <button
              type="button"
              onClick={() => void createNewSession()}
              disabled={loadState === 'busy'}
            >
              {loadState === 'busy' ? 'Creating...' : 'Create new session'}
            </button>
            <label>
              Referee capability token
              <input
                type="password"
                value={manualRefereeToken}
                onChange={(event) => setManualRefereeToken(event.target.value)}
                placeholder={
                  storedRefereeToken
                    ? 'Stored token loaded from this browser'
                    : 'Paste token to submit awards'
                }
                disabled={submitState === 'submitting'}
              />
            </label>
            <button
              type="button"
              disabled={loadState === 'busy'}
              onClick={() => {
                if (!activeSessionId) {
                  setError('Load a session before saving token.')
                  return
                }

                if (!manualRefereeToken.trim()) {
                  setError('Referee token cannot be blank.')
                  return
                }

                if (!publicSession) {
                  setError('Load public session state before saving token.')
                  return
                }

                setStoredRefereeToken(manualRefereeToken.trim())
                writeStoredSession(window.sessionStorage, apiBase, activeSessionId, {
                  refereeToken: manualRefereeToken.trim(),
                  expiresAt: publicSession.expiresAt,
                })
                setError('')
                setMessage('Token saved for this session in this tab.')
              }}
            >
              Save manual token for this session
            </button>
            <button
              type="button"
              onClick={() => {
                if (!activeSessionId) {
                  setError('Load a session before clearing token.')
                  return
                }
                clearStoredSession(window.sessionStorage, apiBase, activeSessionId)
                setStoredRefereeToken('')
                setInvites([])
                setMessage('Stored referee token cleared for this tab.')
              }}
              disabled={!storedRefereeToken}
            >
              Clear stored token
            </button>
          </div>
        </section>

        <section className="panel">
          <SectionHeader kicker="Role visibility" title="Claimed / Submitted" />
          {publicSession ? <PublicRoleStatus roles={publicSession.roles} /> : <p className="referee-empty">Load session for role status.</p>}
        </section>

        <section className="panel">
          <SectionHeader
            kicker="Agent handoff"
            title="Wake agents"
            aside="Brief includes the invite URL."
          />
          <InvitePanel
            role="red"
            inviteUrl={redInviteUrl}
            agentBrief={redAgentBrief}
            hasInvite={hasInviteForRole('red')}
            onCopyBrief={() => void copyAgentBrief('red', redAgentBrief)}
            onOpen={() => window.open(redInviteUrl, '_blank')}
            onRefreshClaim={() => void refreshRoleClaim('red')}
            canRefreshClaim={canRefreshRoleClaim}
          />
          <InvitePanel
            role="blue"
            inviteUrl={blueInviteUrl}
            agentBrief={blueAgentBrief}
            hasInvite={hasInviteForRole('blue')}
            onCopyBrief={() => void copyAgentBrief('blue', blueAgentBrief)}
            onOpen={() => window.open(blueInviteUrl, '_blank')}
            onRefreshClaim={() => void refreshRoleClaim('blue')}
            canRefreshClaim={canRefreshRoleClaim}
          />
          {!hasInviteForRole('red') && !hasInviteForRole('blue') ? (
            <p className="referee-empty">
              Invite URLs are available only for sessions created in this console.
            </p>
          ) : null}
        </section>

        <section className="panel live-replay-panel">
          <SectionHeader
            kicker="Live replay"
            title="Combat replay"
            aside={
              publicSession?.replayAvailable
                ? replayPayload
                  ? 'Rendering post-combat public blueprints.'
                  : 'Fetching replay payload.'
                : 'Available after both agents submit.'
            }
          />
          <div className="referee-replay-layout">
            <div className="referee-replay-frame">
              {publicSession?.replayAvailable && replayPayload ? (
                <ReplayViewer
                  arena={publicSession.arena}
                  botBlueprints={replayPayload.botBlueprints}
                  timeline={replayPayload.timeline}
                />
              ) : publicSession?.replayAvailable ? (
                <p className={replayError ? 'referee-error replay-inline-error' : 'referee-empty'}>
                  {replayError || (replayLoadState === 'busy' ? 'Loading replay data.' : 'Replay data is not loaded yet.')}
                </p>
              ) : (
                <p className="referee-empty">Replay appears here after both role plans resolve.</p>
              )}
            </div>
            <ReplayOutcome
              publicSession={publicSession}
              replayPayload={replayPayload}
            />
          </div>
        </section>

        <section className="panel">
          <SectionHeader
            kicker="Awards"
            title="Referee award options"
            aside="Max 2 total, max 1 per team."
          />
          {(awardOptions.length === 0) ? (
            <p className="referee-empty">No award options in current phase.</p>
          ) : (
            <div className="award-stack">
              {awardOptions.map((option) => {
                const selectedTeam = selectedAwards[option.id]

                return (
                  <article className="award-card" key={option.id}>
                    <div className="award-card-header">
                      <h3>{option.title}</h3>
                      <strong>+{option.gold}g</strong>
                    </div>
                    <p>{option.description}</p>
                    <div className="award-team-actions">
                      <button
                        type="button"
                        className={`team-choice red ${selectedTeam === 'red' ? 'selected' : ''}`}
                        aria-pressed={selectedTeam === 'red'}
                        onClick={() => toggleAwardSelection(option.id, 'red')}
                        disabled={
                          publicSession?.phase !== 'referee_awards'
                        }
                      >
                        Red
                      </button>
                      <button
                        type="button"
                        className={`team-choice blue ${selectedTeam === 'blue' ? 'selected' : ''}`}
                        aria-pressed={selectedTeam === 'blue'}
                        onClick={() => toggleAwardSelection(option.id, 'blue')}
                        disabled={
                          publicSession?.phase !== 'referee_awards'
                        }
                      >
                        Blue
                      </button>
                    </div>
                  </article>
                )
              })}
              <div className="award-action-bar">
                <strong>
                  {selectedCount} / {MAX_AWARDS_PER_ROUND} selected
                </strong>
                <span>
                  Team split: red {selectedForTeam.red} / {MAX_AWARDS_PER_TEAM} , blue{' '}
                  {selectedForTeam.blue} / {MAX_AWARDS_PER_TEAM}
                </span>
                <button
                  type="button"
                  disabled={!canSubmitAwards}
                  onClick={() => void submitAwards()}
                >
                  {submitState === 'submitting' ? 'Submitting awards...' : 'Submit awards'}
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="panel">
          <SectionHeader kicker="Session log" title="Public events" />
          <ol className="event-log">
            {sessionEvents.map((event) => (
              <li key={`${event.at}-${event.type}-${event.message}`}>
                <span>{event.at}</span>
                <p>{event.message}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="panel">
          <SectionHeader kicker="Status" title="Session diagnostics" />
          <dl className="status-list">
            <div>
              <dt>Referee token</dt>
              <dd>{hasRefereeToken ? 'Loaded' : 'Not loaded'}</dd>
            </div>
            <div>
              <dt>Live polls</dt>
              <dd>
                {publicSession && !isTerminalPhase(publicSession.phase)
                  ? `Active (${formatPollInterval(POLL_INTERVAL_MS)})`
                  : 'Stopped'}
              </dd>
            </div>
            <div>
              <dt>Resume behavior</dt>
              <dd>Public state loads with session id only.</dd>
            </div>
            <div>
              <dt>Submit auth</dt>
              <dd>Bearer referee token required.</dd>
            </div>
            <div>
              <dt>Invite token field</dt>
              <dd>Uses claimToken for role invites.</dd>
            </div>
          </dl>
        </section>
      </section>

      {message ? <p className="referee-message" role="status">{message}</p> : null}
      {error ? <p className="referee-error" role="alert">{error}</p> : null}
    </main>
  )
}

function ReplayOutcome({
  publicSession,
  replayPayload,
}: {
  publicSession: PublicSessionState | null
  replayPayload: ReplayPayload | null
}) {
  const result = publicSession?.lastResult
  const keyEvents = useMemo(
    () => getOutcomeEvents(replayPayload?.timeline.events ?? []),
    [replayPayload],
  )

  return (
    <aside className="replay-outcome">
      <SectionHeader kicker="Combat outcome" title="Result" />
      {result ? (
        <>
          <dl className="status-list">
            <div>
              <dt>Winner</dt>
              <dd>{formatWinner(result.winner)}</dd>
            </div>
            <div>
              <dt>Reason</dt>
              <dd>{result.reason}</dd>
            </div>
            <div>
              <dt>Damage</dt>
              <dd>{`Red ${result.damage.red} / Blue ${result.damage.blue}`}</dd>
            </div>
            <div>
              <dt>Health</dt>
              <dd>{`Red ${result.remainingHealth.red} / Blue ${result.remainingHealth.blue}`}</dd>
            </div>
          </dl>
          <h3>Key events</h3>
          {keyEvents.length > 0 ? (
            <ol className="key-event-list">
              {keyEvents.map((event, index) => (
                <li key={`${event.t}-${event.type}-${index}`}>
                  <span>{formatReplayTime(event.t)}</span>
                  <p>{formatReplayEvent(event)}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="referee-empty">Replay events load with the replay payload.</p>
          )}
        </>
      ) : (
        <p className="referee-empty">No combat result yet.</p>
      )}
    </aside>
  )
}

function PublicRoleStatus({ roles }: { roles: PublicSessionState['roles'] }) {
  const roleEntries = useMemo(
    () => Object.entries(roles) as [TeamRole, RolePublicState][],
    [roles],
  )

  return (
    <div className="role-status-list">
      {roleEntries.map(([role, roleState]) => (
        <dl className="status-list" key={role}>
          <div>
            <dt>{capitalize(role)} claimed</dt>
            <dd>{roleState.claimed ? 'Yes' : 'No'}</dd>
          </div>
          <div>
            <dt>{capitalize(role)} submitted</dt>
            <dd>{roleState.submitted ? 'Yes' : 'No'}</dd>
          </div>
        </dl>
      ))}
    </div>
  )
}

function InvitePanel({
  role,
  hasInvite,
  inviteUrl,
  agentBrief,
  onCopyBrief,
  onOpen,
  onRefreshClaim,
  canRefreshClaim,
}: {
  role: TeamRole
  hasInvite: boolean
  inviteUrl: string
  agentBrief: string
  onCopyBrief: () => Promise<void> | void
  onOpen: () => void
  onRefreshClaim: () => Promise<void> | void
  canRefreshClaim: boolean
}) {
  if (!hasInvite) {
    return (
      <div className="invite-panel">
        <p className="referee-empty">{capitalize(role)} invite unavailable.</p>
        <button type="button" onClick={onRefreshClaim} disabled={!canRefreshClaim}>
          Refresh {capitalize(role)} claim
        </button>
      </div>
    )
  }

  return (
    <div className="invite-panel">
      <p>{capitalize(role)} agent handoff</p>
      <div className="invite-links">
        <button type="button" onClick={onOpen} disabled={!inviteUrl}>
          Open cockpit
        </button>
        <button type="button" onClick={onCopyBrief} disabled={!agentBrief}>
          Wake {role} agent
        </button>
        <button type="button" onClick={onRefreshClaim} disabled={!canRefreshClaim}>
          Refresh claim
        </button>
      </div>
    </div>
  )
}

function replaceInvite(invites: RoleInvite[], invite: RoleInvite): RoleInvite[] {
  const nextByRole = new Map(invites.map((entry) => [entry.role, entry]))

  nextByRole.set(invite.role, invite)

  return (['red', 'blue'] as TeamRole[])
    .map((role) => nextByRole.get(role))
    .filter((entry): entry is RoleInvite => entry !== undefined)
}

function SectionHeader({
  kicker,
  title,
  aside,
}: {
  kicker: string
  title: string
  aside?: string
}) {
  return (
    <div className="section-header">
      <div>
        <span>{kicker}</span>
        <h2>{title}</h2>
      </div>
      {aside ? <p>{aside}</p> : null}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function isAgentPathname(pathname: string) {
  const normalized = pathname.replace(/\/+$/, '')

  return normalized === '/agent' || normalized.endsWith('/agent')
}

function formatPhase(phase: string) {
  return phase
    .split('_')
    .map((word) => capitalize(word))
    .join(' ')
}

function formatPollInterval(intervalMs: number): string {
  if (intervalMs >= 1_000) {
    return `${intervalMs / 1_000}s`
  }

  return `${intervalMs}ms`
}

function getOutcomeEvents(events: ReplayEvent[]): ReplayEvent[] {
  return events
    .filter((event) =>
      event.type === 'weapon_fire' ||
      event.type === 'impact' ||
      event.type === 'damage' ||
      event.type === 'hazard' ||
      event.type === 'knockout',
    )
    .slice(0, 8)
}

function formatReplayTime(value: number): string {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}s`
}

function formatWinner(winner: TeamRole | 'draw'): string {
  return winner === 'draw' ? 'Draw' : `${capitalize(winner)} wins`
}

function formatReplayEvent(event: ReplayEvent): string {
  if (event.type === 'weapon_fire') {
    return `${capitalize(event.bot)} fired ${event.weaponSlot}.`
  }

  if (event.type === 'impact') {
    return `${capitalize(event.attacker)} hit ${capitalize(event.defender)} for ${event.damage}.`
  }

  if (event.type === 'damage') {
    return `${capitalize(event.bot)} took ${event.amount}; ${event.remainingHealth} health remains.`
  }

  if (event.type === 'hazard') {
    return `${capitalize(event.bot)} took ${event.damage} from ${event.hazard}.`
  }

  if (event.type === 'knockout') {
    return `${capitalize(event.bot)} knocked out by ${event.cause}.`
  }

  return formatPhase(event.type)
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
