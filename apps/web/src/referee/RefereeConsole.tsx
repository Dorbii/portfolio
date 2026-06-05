import { Suspense, lazy } from 'react'
import {
  InvitePanel,
  Metric,
  PublicChatLog,
  PublicRoleStatus,
  ReplayOutcome,
  SectionHeader,
  TeamRecordCard,
  TeamScoreCard,
} from './RefereeConsolePanels'
import { isTerminalPhase, POLL_INTERVAL_MS } from './refereeClient'
import { openExternalUrl } from '../shared/browser'
import { formatLabel, formatMsInterval } from '../shared/format'
import {
  MAX_AWARDS_PER_ROUND,
  MAX_AWARDS_PER_TEAM,
  useRefereeConsoleController,
} from './useRefereeConsoleController'

const ReplayViewer = lazy(() =>
  import('../replay/ReplayViewer').then((module) => ({ default: module.ReplayViewer })),
)

function ReplayFrameFallback() {
  return <p className="referee-empty replay-placeholder">Loading replay.</p>
}

export function RefereeConsole() {
  const {
    activeSessionId,
    awardOptions,
    awardSubmitHint,
    awardSubmitLabel,
    blueAgentBrief,
    blueInviteUrl,
    canRefreshRoleClaim,
    canSubmitAwards,
    clearStoredRefereeToken,
    copyAgentBrief,
    createNewSession,
    error,
    hasAnyInvite,
    hasInviteForRole,
    hasRefereeToken,
    isActiveSession,
    loadState,
    manualRefereeToken,
    message,
    phase,
    publicSession,
    redAgentBrief,
    redInviteUrl,
    refreshRoleClaim,
    replayError,
    replayLoadState,
    replayPayload,
    saveManualRefereeToken,
    selectedAwards,
    selectedCount,
    selectedForTeam,
    sessionChat,
    sessionEvents,
    sessionInput,
    setActiveSession,
    setManualRefereeToken,
    setSessionInput,
    storedRefereeToken,
    submitAwards,
    submitState,
    toggleAwardSelection,
  } = useRefereeConsoleController()
  return (
    <main className="arena-app match-console">
      <aside className="director-sidebar" aria-label="Referee navigation">
        <div className="director-brand">
          <span className="brand-mark" aria-hidden="true">A</span>
          <div>
            <span className="eyebrow">Agent Arena</span>
            <h1>Referee Console</h1>
          </div>
        </div>
        <nav className="director-nav">
          <a className="active" href="#overview">Overview</a>
          <a href="#agents">Agents</a>
          <a href="#awards">Awards</a>
          <a href="#chat">Chat</a>
          <a href="#match-log">Match Log</a>
          <a href="#session">Session</a>
        </nav>
        <div className="referee-identity">
          <span className="referee-avatar" aria-hidden="true">R</span>
          <div>
            <strong>Referee</strong>
            <span>{hasRefereeToken ? 'Capability token loaded' : 'Token not loaded'}</span>
          </div>
        </div>
      </aside>

      <div className="director-workspace">
        <header className="score-header">
          <div className="round-block">
            <strong>{publicSession ? `Round ${publicSession.round} / ${publicSession.maxRounds}` : 'No Session'}</strong>
            <span>{publicSession ? `Best of ${publicSession.maxRounds}` : 'Create or load a session'}</span>
          </div>
          <div className="score-cluster" aria-live="polite">
            <TeamScoreCard
              role="red"
              roleState={publicSession?.roles.red}
              winner={publicSession?.lastResult?.winner}
            />
            <span className="versus">vs</span>
            <TeamScoreCard
              role="blue"
              roleState={publicSession?.roles.blue}
              winner={publicSession?.lastResult?.winner}
            />
          </div>
          <div className="phase-block">
            <span>Phase</span>
            <strong>{formatLabel(phase)}</strong>
          </div>
          <button
            type="button"
            className="header-action"
            disabled={!canSubmitAwards}
            title={awardSubmitHint}
            onClick={() => void submitAwards()}
          >
            {submitState === 'submitting' ? 'Submitting' : awardSubmitLabel}
          </button>
        </header>

        <section className="director-content" id="overview">
          <section className="director-main-column">
            <section className="panel arena-stage-card">
              <SectionHeader
                kicker="Arena replay"
                title={publicSession?.arena.name ?? 'Combat replay'}
                aside={
                  publicSession?.replayAvailable
                    ? replayPayload
                      ? 'Post-combat public blueprints.'
                      : 'Fetching replay payload.'
                    : 'Available after both agents submit.'
                }
              />
              <div className="referee-replay-frame">
                {publicSession?.replayAvailable && replayPayload ? (
                  <Suspense fallback={<ReplayFrameFallback />}>
                    <ReplayViewer
                      arena={publicSession.arena}
                      botBlueprints={replayPayload.botBlueprints}
                      timeline={replayPayload.timeline}
                    />
                  </Suspense>
                ) : publicSession?.replayAvailable ? (
                  <p className={replayError ? 'referee-error replay-inline-error' : 'referee-empty'}>
                    {replayError || (replayLoadState === 'busy' ? 'Loading replay data.' : 'Replay data is not loaded yet.')}
                  </p>
                ) : (
                  <p className="referee-empty replay-placeholder">Replay appears here after both role plans resolve.</p>
                )}
              </div>
            </section>

            <section className="panel fight-comms-panel" id="chat">
              <SectionHeader
                kicker="Bot chat"
                title="Fight comms"
                aside={sessionChat.length > 0 ? `${sessionChat.length} public messages` : 'Public agent messages.'}
              />
              <PublicChatLog
                messages={sessionChat}
                emptyText="No bot chat yet. Combat resolution will add public trash talk, and agents can post taunts, observations, strategy notes, and reflections."
              />
            </section>

            <section className="panel awards-dock" id="awards">
              <SectionHeader
                kicker="Referee awards"
                title="Pick round awards"
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
                            disabled={publicSession?.phase !== 'referee_awards'}
                          >
                            Red
                          </button>
                          <button
                            type="button"
                            className={`team-choice blue ${selectedTeam === 'blue' ? 'selected' : ''}`}
                            aria-pressed={selectedTeam === 'blue'}
                            onClick={() => toggleAwardSelection(option.id, 'blue')}
                            disabled={publicSession?.phase !== 'referee_awards'}
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
                      {awardSubmitHint ??
                        `Red ${selectedForTeam.red} / ${MAX_AWARDS_PER_TEAM}, Blue ${selectedForTeam.blue} / ${MAX_AWARDS_PER_TEAM}`}
                    </span>
                    <button
                      type="button"
                      disabled={!canSubmitAwards}
                      title={awardSubmitHint}
                      onClick={() => void submitAwards()}
                    >
                      {awardSubmitLabel}
                    </button>
                  </div>
                </div>
              )}
            </section>
          </section>

          <aside className="director-right-rail">
            <ReplayOutcome
              publicSession={publicSession}
              replayPayload={replayPayload}
            />

            <section className="panel team-record-panel">
              <SectionHeader kicker="Team record" title="Public standings" />
              {publicSession ? (
                <div className="team-record-grid">
                  <TeamRecordCard role="red" roleState={publicSession.roles.red} />
                  <TeamRecordCard role="blue" roleState={publicSession.roles.blue} />
                </div>
              ) : (
                <p className="referee-empty">Load session for public team state.</p>
              )}
            </section>

            <section className="panel" id="session">
              <SectionHeader
                kicker="Session control"
                title="Create or load"
                aside={isActiveSession ? 'Public state by session id.' : 'No active session'}
              />
              <div className="session-metrics">
                <Metric label="Session" value={activeSessionId || 'Not loaded'} />
                <Metric
                  label="Replay"
                  value={publicSession ? (publicSession.replayAvailable ? 'Ready' : 'Unavailable') : 'Unavailable'}
                />
              </div>
              <div className="referee-form compact-form">
                <label>
                  Session ID
                  <input
                    value={sessionInput}
                    maxLength={64}
                    onChange={(event) => setSessionInput(event.target.value)}
                    disabled={loadState === 'busy'}
                  />
                </label>
                <div className="button-pair">
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
                    {loadState === 'busy' ? 'Creating...' : 'Create new'}
                  </button>
                </div>
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
                <div className="button-pair">
                  <button
                    type="button"
                    disabled={loadState === 'busy'}
                    onClick={saveManualRefereeToken}
                  >
                    Save token
                  </button>
                  <button
                    type="button"
                    onClick={clearStoredRefereeToken}
                    disabled={!storedRefereeToken}
                  >
                    Clear token
                  </button>
                </div>
              </div>
            </section>

            <section className="panel" id="agents">
              <SectionHeader
                kicker="Agent handoff"
                title="Wake agents"
                aside={hasAnyInvite ? 'Invite URL included.' : 'Create session first.'}
              />
              {publicSession ? <PublicRoleStatus roles={publicSession.roles} /> : null}
              <InvitePanel
                role="red"
                inviteUrl={redInviteUrl}
                agentBrief={redAgentBrief}
                hasInvite={hasInviteForRole('red')}
                onCopyBrief={() => void copyAgentBrief('red', redAgentBrief)}
                onOpen={() => openExternalUrl(redInviteUrl)}
                onRefreshClaim={() => void refreshRoleClaim('red')}
                canRefreshClaim={canRefreshRoleClaim}
              />
              <InvitePanel
                role="blue"
                inviteUrl={blueInviteUrl}
                agentBrief={blueAgentBrief}
                hasInvite={hasInviteForRole('blue')}
                onCopyBrief={() => void copyAgentBrief('blue', blueAgentBrief)}
                onOpen={() => openExternalUrl(blueInviteUrl)}
                onRefreshClaim={() => void refreshRoleClaim('blue')}
                canRefreshClaim={canRefreshRoleClaim}
              />
              {!hasAnyInvite ? (
                <p className="referee-empty">
                  Invite URLs are available only for sessions created in this console.
                </p>
              ) : null}
            </section>

            <section className="panel" id="match-log">
              <SectionHeader kicker="Match log" title="Public events" />
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
              <SectionHeader kicker="Status" title="Diagnostics" />
              <dl className="status-list">
                <div>
                  <dt>Token</dt>
                  <dd>{hasRefereeToken ? 'Loaded' : 'Not loaded'}</dd>
                </div>
                <div>
                  <dt>Polls</dt>
                  <dd>
                    {publicSession && !isTerminalPhase(publicSession.phase)
                      ? `Active (${formatMsInterval(POLL_INTERVAL_MS)})`
                      : 'Stopped'}
                  </dd>
                </div>
                <div>
                  <dt>Auth</dt>
                  <dd>Bearer referee token</dd>
                </div>
              </dl>
            </section>
          </aside>
        </section>

        {message ? <p className="referee-message" role="status">{message}</p> : null}
        {error ? <p className="referee-error" role="alert">{error}</p> : null}
      </div>
    </main>
  )
}

