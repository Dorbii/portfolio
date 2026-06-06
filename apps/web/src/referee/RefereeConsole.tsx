import { Suspense, lazy } from 'react'
import { DEFAULT_ARENA_CONFIG } from '../../../../packages/schemas/src/index.js'
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
const ArenaPreviewScene = lazy(() =>
  import('../replay/ArenaPreviewScene').then((module) => ({ default: module.ArenaPreviewScene })),
)

function ReplayFrameFallback() {
  return <p className="referee-empty replay-placeholder">Loading replay.</p>
}

function ReplayStatusOverlay({
  error,
  loadState,
}: {
  error: string
  loadState: 'busy' | 'idle'
}) {
  const status = error
    ? {
        detail: error,
        label: 'Replay unavailable',
        role: 'alert' as const,
        tone: 'error',
      }
    : loadState === 'busy'
      ? {
          detail: 'Fetching resolved combat timeline.',
          label: 'Loading replay',
          role: 'status' as const,
          tone: 'busy',
        }
      : {
          detail: 'Replay is flagged available; waiting for payload.',
          label: 'Replay pending',
          role: 'status' as const,
          tone: 'busy',
        }

  return (
    <div
      className={`replay-status-overlay is-${status.tone}`}
      role={status.role}
    >
      <strong>{status.label}</strong>
      <span>{status.detail}</span>
    </div>
  )
}

export function RefereeConsole() {
  const {
    activeSessionId,
    advanceRoundHint,
    advanceRoundLabel,
    blueAgentBrief,
    blueCockpitUrl,
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
    redCockpitUrl,
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
  const visibleArena = publicSession?.arena ?? DEFAULT_ARENA_CONFIG
  const shouldShowReplay = Boolean(publicSession?.replayAvailable && replayPayload)
  const shouldShowReplayStatus = Boolean(publicSession?.replayAvailable && !replayPayload)

  return (
    <main className="arena-app match-console">
      <div className="match-dashboard-shell">
        <section className="match-stage-card" id="dashboard" aria-label="Arena dashboard">
          <div className="match-stage-frame">
            {shouldShowReplay && replayPayload ? (
              <Suspense fallback={<ReplayFrameFallback />}>
                <ReplayViewer
                  arena={visibleArena}
                  botBlueprints={replayPayload.botBlueprints}
                  showDamageSchematic={false}
                  timeline={replayPayload.timeline}
                />
              </Suspense>
            ) : (
              <Suspense fallback={<ReplayFrameFallback />}>
                <ArenaPreviewScene arena={visibleArena} />
              </Suspense>
            )}
            {shouldShowReplayStatus ? (
              <ReplayStatusOverlay error={replayError} loadState={replayLoadState} />
            ) : null}
          </div>
        </section>

        <MatchScoreboard
          phase={phase}
          publicSession={publicSession}
          replayPayload={replayPayload}
          roleHandoffs={{
            red: {
              agentBrief: redAgentBrief,
              hasInvite: hasInviteForRole('red'),
              inviteUrl: redCockpitUrl,
              onCopyBrief: () => void copyAgentBrief('red', redAgentBrief),
              onOpen: () => openExternalUrl(redCockpitUrl),
            },
            blue: {
              agentBrief: blueAgentBrief,
              hasInvite: hasInviteForRole('blue'),
              inviteUrl: blueCockpitUrl,
              onCopyBrief: () => void copyAgentBrief('blue', blueAgentBrief),
              onOpen: () => openExternalUrl(blueCockpitUrl),
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
            <strong>{visibleArena.name}</strong>
            <small>{visibleArena.activeHazards.join(', ') || 'Hazards unavailable'}</small>
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

