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
import {
  ActionGroup,
  Button,
  FormField,
  MetricGrid,
  MetricRow,
  Panel,
} from '../shared/ui'
import { openExternalUrl } from '../shared/browser'
import { formatLabel, formatMsInterval } from '../shared/format'
import { useRefereeConsoleController } from './useRefereeConsoleController'

const ReplayViewer = lazy(() =>
  import('../replay/ReplayViewer').then((module) => ({ default: module.ReplayViewer })),
)

function ReplayFrameFallback() {
  return <p className="referee-empty replay-placeholder">Loading replay.</p>
}

export function RefereeConsole() {
  const {
    activeSessionId,
    advanceRoundHint,
    advanceRoundLabel,
    advanceState,
    blueAgentBrief,
    blueInviteUrl,
    canResetAgentClaim,
    canAdvanceRound,
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
    resetAgentClaim,
    replayError,
    replayLoadState,
    replayPayload,
    saveManualRefereeToken,
    sessionChat,
    sessionEvents,
    sessionInput,
    setActiveSession,
    setManualRefereeToken,
    setSessionInput,
    storedRefereeToken,
    submitRoundAdvance,
  } = useRefereeConsoleController()
  const roleAccessSummary = hasAnyInvite
    ? 'Cockpit handoffs stored'
    : activeSessionId
      ? 'Cockpit tokens unavailable'
      : 'No cockpit handoffs yet'

  return (
    <main className="arena-app match-console">
      <div className="director-workspace">
        <header className="score-header">
          <div className="director-brand console-title-block">
            <span className="brand-mark" aria-hidden="true">A</span>
            <div>
              <span className="eyebrow">Agent Arena</span>
              <h1>Referee Console</h1>
            </div>
          </div>
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
          <div className="referee-identity header-referee-identity">
            <span className="referee-avatar" aria-hidden="true">R</span>
            <div>
              <strong>{hasRefereeToken ? 'Referee token loaded' : 'No referee token'}</strong>
              <span>{roleAccessSummary}</span>
            </div>
          </div>
          <Button
            type="button"
            variant="primary"
            disabled={!canAdvanceRound}
            title={advanceRoundHint}
            onClick={() => void submitRoundAdvance()}
          >
            {advanceRoundLabel}
          </Button>
        </header>

        <section className="director-content" id="overview">
          <section className="director-main-column">
            <Panel className="panel arena-stage-card">
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
            </Panel>

            <Panel className="panel fight-comms-panel" id="chat">
              <SectionHeader
                kicker="Bot chat"
                title="Fight comms"
                aside={sessionChat.length > 0 ? `${sessionChat.length} public messages` : 'Public agent messages.'}
              />
              <PublicChatLog
                messages={sessionChat}
                emptyText="No bot chat yet. Combat resolution will add public trash talk, and agents can post taunts, observations, strategy notes, and reflections."
              />
            </Panel>

            <Panel className="panel round-review-dock" id="review">
              <SectionHeader
                kicker="Round review"
                title="Advance the match"
                aside={publicSession?.phase === 'round_review' ? 'Replay is ready.' : 'Available after combat.'}
              />
              <div className="round-review-stack">
                {publicSession?.lastResult ? (
                  <div className="round-review-summary">
                    <strong>{publicSession.lastResult.winner === 'draw' ? 'Draw' : `${formatLabel(publicSession.lastResult.winner)} wins`}</strong>
                    <span>{publicSession.lastResult.reason}</span>
                  </div>
                ) : (
                  <p className="referee-empty">Round outcome appears after combat resolves.</p>
                )}
                <div className="round-review-action-bar">
                  <span>{advanceRoundHint ?? 'Base income, interest, and any winner bonus apply automatically.'}</span>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={!canAdvanceRound}
                    title={advanceRoundHint}
                    onClick={() => void submitRoundAdvance()}
                  >
                    {advanceRoundLabel}
                  </Button>
                </div>
              </div>
            </Panel>
          </section>

          <aside className="director-right-rail">
            <ReplayOutcome
              publicSession={publicSession}
              replayPayload={replayPayload}
            />

            <Panel className="panel team-record-panel">
              <SectionHeader kicker="Team record" title="Public standings" />
              {publicSession ? (
                <div className="team-record-grid">
                  <TeamRecordCard role="red" roleState={publicSession.roles.red} />
                  <TeamRecordCard role="blue" roleState={publicSession.roles.blue} />
                </div>
              ) : (
                <p className="referee-empty">Load session for public team state.</p>
              )}
            </Panel>

            <Panel className="panel" id="session">
              <SectionHeader
                kicker="Session control"
                title="Create or load"
                aside={isActiveSession ? 'Public state by session id.' : 'No active session'}
              />
              <MetricGrid className="session-metrics">
                <Metric label="Session" value={activeSessionId || 'Not loaded'} />
                <Metric
                  label="Replay"
                  value={publicSession ? (publicSession.replayAvailable ? 'Ready' : 'Unavailable') : 'Unavailable'}
                />
              </MetricGrid>
              <div className="referee-form compact-form">
                <FormField label="Session ID">
                  <input
                    value={sessionInput}
                    maxLength={64}
                    onChange={(event) => setSessionInput(event.target.value)}
                    disabled={loadState === 'busy'}
                  />
                </FormField>
                <ActionGroup className="button-pair">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void setActiveSession(sessionInput)}
                    disabled={loadState === 'busy' || !sessionInput.trim()}
                  >
                    {loadState === 'busy' ? 'Loading...' : 'Load session'}
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => void createNewSession()}
                    disabled={loadState === 'busy'}
                  >
                    {loadState === 'busy' ? 'Creating...' : 'Create new'}
                  </Button>
                </ActionGroup>
                <FormField label="Referee capability token">
                  <input
                    type="password"
                    value={manualRefereeToken}
                    onChange={(event) => setManualRefereeToken(event.target.value)}
                    placeholder={
                      storedRefereeToken
                        ? 'Stored token loaded from this browser'
                        : 'Paste token to advance rounds'
                    }
                    disabled={advanceState === 'submitting'}
                  />
                </FormField>
                <ActionGroup className="button-pair">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={loadState === 'busy'}
                    onClick={saveManualRefereeToken}
                  >
                    Save token
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={clearStoredRefereeToken}
                    disabled={!storedRefereeToken}
                  >
                    Clear token
                  </Button>
                </ActionGroup>
              </div>
            </Panel>

            <Panel className="panel" id="agents">
              <SectionHeader
                kicker="Agent handoff"
                title="Agent handoffs"
                aside={hasAnyInvite ? 'Open roles show handoffs.' : 'Create session first.'}
              />
              {publicSession ? <PublicRoleStatus roles={publicSession.roles} /> : null}
              <InvitePanel
                role="red"
                inviteUrl={redInviteUrl}
                agentBrief={redAgentBrief}
                hasInvite={hasInviteForRole('red')}
                roleState={publicSession?.roles.red}
                onCopyBrief={() => void copyAgentBrief('red', redAgentBrief)}
                onOpen={() => openExternalUrl(redInviteUrl)}
                onResetClaim={() => void resetAgentClaim('red')}
                canResetClaim={canResetAgentClaim}
              />
              <InvitePanel
                role="blue"
                inviteUrl={blueInviteUrl}
                agentBrief={blueAgentBrief}
                hasInvite={hasInviteForRole('blue')}
                roleState={publicSession?.roles.blue}
                onCopyBrief={() => void copyAgentBrief('blue', blueAgentBrief)}
                onOpen={() => openExternalUrl(blueInviteUrl)}
                onResetClaim={() => void resetAgentClaim('blue')}
                canResetClaim={canResetAgentClaim}
              />
              {!hasAnyInvite ? (
                <p className="referee-empty">
                  Invite URLs are available only for sessions created in this console.
                </p>
              ) : null}
            </Panel>

            <Panel className="panel" id="match-log">
              <SectionHeader kicker="Match log" title="Public events" />
              <ol className="event-log">
                {sessionEvents.map((event) => (
                  <li key={`${event.at}-${event.type}-${event.message}`}>
                    <span>{event.at}</span>
                    <p>{event.message}</p>
                  </li>
                ))}
              </ol>
            </Panel>

            <Panel className="panel">
              <SectionHeader kicker="Status" title="Diagnostics" />
              <MetricGrid className="status-list">
                <MetricRow label="Token" value={hasRefereeToken ? 'Loaded' : 'Not loaded'} />
                <MetricRow
                  label="Polls"
                  value={
                    publicSession && !isTerminalPhase(publicSession.phase)
                      ? `Active (${formatMsInterval(POLL_INTERVAL_MS)})`
                      : 'Stopped'
                  }
                />
                <MetricRow label="Auth" value="Bearer referee token" />
              </MetricGrid>
            </Panel>
          </aside>
        </section>

        {message ? <p className="referee-message" role="status">{message}</p> : null}
        {error ? <p className="referee-error" role="alert">{error}</p> : null}
      </div>
    </main>
  )
}

