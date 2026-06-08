import { Suspense, lazy } from 'react'
import { DEFAULT_ARENA_CONFIG } from '../../../../packages/schemas/src/index.js'
import {
  ArenaImpactDashboard,
  KeyStatsDashboard,
  MatchScoreboard,
  PublicChatLog,
  SectionHeader,
  SessionCompletionPanel,
} from './RefereeConsolePanels'
import {
  Panel,
} from '../shared/ui'
import { RefereeCockpitStrip } from './RefereeCockpitStrip'
import { useRefereeConsoleController } from './useRefereeConsoleController'

const ReplayViewer = lazy(() =>
  import('../replay/ReplayViewer').then((module) => ({ default: module.ReplayViewer })),
)
const ArenaPreviewScene = lazy(() =>
  import('../replay/arena/ArenaPreviewScene').then((module) => ({ default: module.ArenaPreviewScene })),
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
    completionControls,
    copyAgentBrief,
    createNewSession,
    error,
    hasInviteForRole,
    loadState,
    publicSession,
    redAgentBrief,
    redCockpitUrl,
    refreshStoredSession,
    replayError,
    replayLoadState,
    replayPayload,
    roleLoadState,
    roleStateError,
    roleStates,
    sessionChat,
    storedRefereeToken,
    submitRoundAdvance,
  } = useRefereeConsoleController()
  const chatSummary = sessionChat.length > 0
    ? `${sessionChat.length} message${sessionChat.length === 1 ? '' : 's'}`
    : activeSessionId
      ? 'No agent chat yet'
      : 'Create session first'
  const visibleArena = publicSession?.arena ?? DEFAULT_ARENA_CONFIG
  const shouldShowReplay = Boolean(publicSession?.replayAvailable && replayPayload)
  const shouldShowReplayStatus = Boolean(publicSession?.replayAvailable && !replayPayload)
  const shouldShowSessionCompletion = publicSession?.phase === 'session_complete'

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
                  machineDesigns={replayPayload.machineDesigns}
                  showDamageSchematic={false}
                  teamIdentities={replayPayload.teamIdentities}
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
          publicSession={publicSession}
          replayPayload={replayPayload}
          roleHandoffs={{
            red: {
              agentBrief: redAgentBrief,
              hasInvite: hasInviteForRole('red'),
              inviteUrl: redCockpitUrl,
              onCopyBrief: () => void copyAgentBrief(redAgentBrief),
            },
            blue: {
              agentBrief: blueAgentBrief,
              hasInvite: hasInviteForRole('blue'),
              inviteUrl: blueCockpitUrl,
              onCopyBrief: () => void copyAgentBrief(blueAgentBrief),
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

        <RefereeCockpitStrip
          loadState={roleLoadState}
          roleStates={roleStates}
          stateError={roleStateError}
        />

        <section className="match-dashboard-panels" aria-label="Match dashboard">
          <Panel className="panel dashboard-panel fight-comms-panel">
            <SectionHeader kicker="Agent chat" title="Fight Comms" aside={chatSummary} />
            <PublicChatLog
              messages={sessionChat}
              emptyText="No fight comms yet."
            />
          </Panel>

          {shouldShowSessionCompletion ? (
            <Panel className="panel dashboard-panel session-completion-dashboard-panel">
              <SectionHeader kicker="Session end" title="Shared Debrief" />
              <SessionCompletionPanel
                controls={completionControls}
                publicSession={publicSession}
              />
            </Panel>
          ) : null}

          <Panel className="panel dashboard-panel key-stats-panel">
            <SectionHeader kicker="Key stats" title="Key Stats" />
            <KeyStatsDashboard publicSession={publicSession} replayPayload={replayPayload} />
          </Panel>

          <Panel className="panel dashboard-panel arena-impact-panel" id="arena-impact">
            <SectionHeader kicker="Environment" title="Arena Impact" />
            <ArenaImpactDashboard publicSession={publicSession} replayPayload={replayPayload} />
          </Panel>
        </section>

        {error ? <p className="referee-error" role="alert">{error}</p> : null}
      </div>
    </main>
  )
}

