import { Suspense, lazy } from 'react'
import {
  KeyStatsDashboard,
  MatchScoreboard,
  PublicChatLog,
  RoundSummaryDashboard,
  SectionHeader,
  TeamStatusDashboard,
} from './RefereeConsolePanels'
import {
  Panel,
} from '../shared/ui'
import { openExternalUrl } from '../shared/browser'
import { formatLabel } from '../shared/format'
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
    blueAgentBrief,
    blueInviteUrl,
    canAdvanceRound,
    copyAgentBrief,
    createNewSession,
    error,
    hasAnyInvite,
    hasInviteForRole,
    hasRefereeToken,
    loadState,
    message,
    phase,
    publicSession,
    redAgentBrief,
    redInviteUrl,
    refreshStoredSession,
    replayError,
    replayLoadState,
    replayPayload,
    sessionChat,
    storedRefereeToken,
    submitRoundAdvance,
  } = useRefereeConsoleController()
  const roleAccessSummary = hasAnyInvite
    ? 'Cockpit handoffs stored'
    : activeSessionId
      ? 'Cockpit tokens unavailable'
      : 'No cockpit handoffs yet'
  const dockChat = sessionChat.slice(-2)

  return (
    <main className="arena-app match-console">
      <div className="match-dashboard-shell">
        <MatchScoreboard
          phase={phase}
          publicSession={publicSession}
          replayPayload={replayPayload}
          roleHandoffs={{
            red: {
              agentBrief: redAgentBrief,
              hasInvite: hasInviteForRole('red'),
              inviteUrl: redInviteUrl,
              onCopyBrief: () => void copyAgentBrief('red', redAgentBrief),
              onOpen: () => openExternalUrl(redInviteUrl),
            },
            blue: {
              agentBrief: blueAgentBrief,
              hasInvite: hasInviteForRole('blue'),
              inviteUrl: blueInviteUrl,
              onCopyBrief: () => void copyAgentBrief('blue', blueAgentBrief),
              onOpen: () => openExternalUrl(blueInviteUrl),
            },
          }}
          sessionControl={{
            activeSessionId,
            advanceHint: advanceRoundHint,
            advanceLabel: advanceRoundLabel,
            canAdvance: canAdvanceRound,
            canRefresh: Boolean(activeSessionId) && loadState !== 'busy',
            isBusy: loadState === 'busy',
            onAdvance: () => void submitRoundAdvance(),
            onCreate: () => void createNewSession(),
            onRefresh: refreshStoredSession,
            tokenStored: Boolean(storedRefereeToken),
          }}
        />

        <section className="match-stage-card" id="dashboard" aria-label="Arena replay dashboard">
          <div className="match-stage-frame">
            {publicSession?.replayAvailable && replayPayload ? (
              <Suspense fallback={<ReplayFrameFallback />}>
                <ReplayViewer
                  arena={publicSession.arena}
                  botBlueprints={replayPayload.botBlueprints}
                  initialTime={replayPayload.timeline.duration * 0.45}
                  proofMode
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

        <section className="match-dashboard-panels" aria-label="Match dashboard">
          <Panel className="panel dashboard-panel team-status-panel">
            <SectionHeader kicker="Team status" title="Team Status" />
            <TeamStatusDashboard publicSession={publicSession} replayPayload={replayPayload} />
          </Panel>

          <Panel className="panel dashboard-panel key-stats-panel">
            <SectionHeader kicker="Key stats" title="Key Stats" />
            <KeyStatsDashboard publicSession={publicSession} replayPayload={replayPayload} />
          </Panel>

          <Panel className="panel dashboard-panel round-summary-panel" id="review">
            <SectionHeader kicker="Round review" title="Round Review" />
            <RoundSummaryDashboard publicSession={publicSession} replayPayload={replayPayload} />
          </Panel>
        </section>

        <section className="match-ops-dock" aria-label="Referee operations">
          <div className="ops-cell arena-info">
            <span>Arena</span>
            <strong>{publicSession?.arena.name ?? 'No arena'}</strong>
            <small>{publicSession?.arena.activeHazards.join(', ') || 'Hazards unavailable'}</small>
          </div>
          <div className="ops-cell">
            <span>Match info</span>
            <strong>{publicSession ? `Best of ${publicSession.maxRounds}` : 'No session'}</strong>
            <small>{publicSession ? `Phase ${formatLabel(publicSession.phase)}` : 'Create or load'}</small>
          </div>
          <div className="ops-cell referee-notes">
            <span>Referee notes</span>
            <strong>{hasRefereeToken ? 'Token loaded' : 'No token'}</strong>
            <small>{roleAccessSummary}</small>
          </div>
          <div className="ops-cell fight-comms-panel">
            <span>Fight comms</span>
            <PublicChatLog
              messages={dockChat}
              emptyText="No fight comms yet."
            />
          </div>
        </section>

        {message ? <p className="referee-message" role="status">{message}</p> : null}
        {error ? <p className="referee-error" role="alert">{error}</p> : null}
      </div>
    </main>
  )
}

