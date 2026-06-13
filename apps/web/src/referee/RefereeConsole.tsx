import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_ARENA_CONFIG, type TeamRole } from '../../../../packages/schemas/src/index.js'
import type { PublicSessionState, RolePrivateState } from '../agent/agentSessionTypes.js'
import {
  ArenaImpactDashboard,
  FightArchiveDashboard,
  KeyStatsDashboard,
  MatchScoreboard,
  PublicChatLog,
  SectionHeader,
  SessionCompletionPanel,
} from './RefereeConsolePanels'
import {
  Panel,
} from '../shared/ui'
import {
  RefereeCockpitStrip,
} from './RefereeCockpitStrip'
import { buildRefereeObserverView } from './refereeObserverView'
import type { ReplayPayload } from './refereeClient'
import { createRefereeReplayProof, resolveRefereeReplayProofMode } from './refereeReplayProof'
import { useRefereeConsoleController } from './useRefereeConsoleController'
import { createLiveArenaStageState } from './liveArenaStage'

const ReplayViewer = lazy(() =>
  import('../replay/ReplayViewer').then((module) => ({ default: module.ReplayViewer })),
)
const ArenaPreviewScene = lazy(() =>
  import('../replay/arena/ArenaPreviewScene').then((module) => ({ default: module.ArenaPreviewScene })),
)

const FIGHT_RENDER_WARMUP_MS = 30_000
const EMPTY_ROLE_STATES: Partial<Record<TeamRole, RolePrivateState>> = {}

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

function getCombatWarmupKey(publicSession: PublicSessionState | null): string | null {
  if (!publicSession || !isFightRenderPhase(publicSession.phase)) {
    return null
  }

  return `${publicSession.sessionId}:${publicSession.round}`
}

function isFightRenderPhase(phase: PublicSessionState['phase']): boolean {
  return (
    phase === 'combat_turn' ||
    phase === 'combat_resolved' ||
    phase === 'replay_phase' ||
    phase === 'round_review'
  )
}

function getFightStartedAtMs(publicSession: PublicSessionState | null): number | null {
  const startedAt = publicSession && isFightRenderPhase(publicSession.phase)
    ? publicSession?.combat?.fightStartedAt
    : undefined

  if (!startedAt) {
    return null
  }

  const startedAtMs = Date.parse(startedAt)

  if (!Number.isFinite(startedAtMs) || startedAtMs > Date.now()) {
    return null
  }

  return startedAtMs
}

function useFightRenderWarmup(publicSession: PublicSessionState | null): boolean {
  const [, setWarmupTick] = useState(0)
  const localWarmupStartRef = useRef<{ key: string; startedAtMs: number } | null>(null)
  const combatWarmupKey = getCombatWarmupKey(publicSession)

  if (!combatWarmupKey) {
    localWarmupStartRef.current = null
  } else if (localWarmupStartRef.current?.key !== combatWarmupKey) {
    localWarmupStartRef.current = {
      key: combatWarmupKey,
      startedAtMs: Date.now(),
    }
  }

  const startedAtMs = getFightStartedAtMs(publicSession) ?? localWarmupStartRef.current?.startedAtMs
  const readyAtMs = startedAtMs === undefined ? null : startedAtMs + FIGHT_RENDER_WARMUP_MS

  useEffect(() => {
    if (readyAtMs === null) {
      return undefined
    }

    const remainingMs = readyAtMs - Date.now()

    if (remainingMs <= 0) {
      return undefined
    }

    const timeout = window.setTimeout(() => {
      setWarmupTick((tick) => tick + 1)
    }, remainingMs)

    return () => window.clearTimeout(timeout)
  }, [readyAtMs])

  return readyAtMs !== null && Date.now() < readyAtMs
}

export function RefereeConsole() {
  const {
    activeSessionId,
    advanceRoundHint,
    advanceRoundLabel,
    blueCockpitUrl,
    blueInviteUrl,
    canAdvanceRound,
    completionControls,
    copyInviteUrl,
    createNewSession,
    error,
    hasInviteForRole,
    loadState,
    liveCombatError,
    liveCombatFeed,
    loadFightReplay,
    publicSession,
    redCockpitUrl,
    redInviteUrl,
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
  const replayProofMode = useMemo(() => resolveRefereeReplayProofMode(window.location.search), [])
  const replayProof = useMemo(
    () => replayProofMode ? createRefereeReplayProof() : null,
    [replayProofMode],
  )
  const displayPublicSession = replayProof?.publicSession ?? publicSession
  const displayReplayPayload = replayProof?.replayPayload ?? replayPayload
  const displayRoleStates = replayProof ? EMPTY_ROLE_STATES : roleStates
  const displayLiveCombatFeed = replayProof ? null : liveCombatFeed
  const displayLiveCombatError = replayProof ? '' : liveCombatError
  const displaySessionChat = replayProof?.publicSession.chatLog ?? sessionChat
  const displayActiveSessionId = displayPublicSession?.sessionId ?? activeSessionId
  const fightArchive = displayPublicSession?.continuation.fightArchive ?? []
  const [archiveReplayPayload, setArchiveReplayPayload] = useState<ReplayPayload | null>(null)
  const [archiveSelectedFightId, setArchiveSelectedFightId] = useState('')
  const [archiveLoadState, setArchiveLoadState] = useState<'busy' | 'idle'>('idle')
  const [archiveError, setArchiveError] = useState('')
  const fightComms = [
    ...displaySessionChat.map((message) => ({ ...message, visibility: 'public' as const })),
    ...(['red', 'blue'] as const).flatMap((role) =>
      (displayRoleStates[role]?.privateChatLog ?? []).map((message) => ({
        ...message,
        visibility: 'role_only' as const,
      })),
    ),
  ].sort((left, right) => Date.parse(left.at) - Date.parse(right.at) || left.id.localeCompare(right.id))
  const chatSummary = fightComms.length > 0
    ? `${fightComms.length} message${fightComms.length === 1 ? '' : 's'}`
    : displayActiveSessionId
      ? 'No fight comms yet'
      : 'Create session first'
  const visibleArena = displayPublicSession?.arena ?? DEFAULT_ARENA_CONFIG
  const liveArenaStage = useMemo(
    () => createLiveArenaStageState(displayRoleStates, displayLiveCombatFeed),
    [displayLiveCombatFeed, displayRoleStates],
  )
  const liveArenaStateError = displayLiveCombatError || roleStateError
  const observerView = useMemo(
    () => buildRefereeObserverView({ publicSession: displayPublicSession, replayPayload: displayReplayPayload }),
    [displayPublicSession, displayReplayPayload],
  )
  const shouldDeferFightRender = useFightRenderWarmup(displayPublicSession)
  const reviewingArchivedReplay = archiveReplayPayload !== null
  const stageReplayPayload = archiveReplayPayload ?? displayReplayPayload
  const showRenderedReplay = Boolean(stageReplayPayload) &&
    (reviewingArchivedReplay || (observerView.showReplay && !shouldDeferFightRender))
  const renderedReplayPayload = showRenderedReplay ? stageReplayPayload : null
  const showFightCockpitStage = !reviewingArchivedReplay &&
    (shouldDeferFightRender || (observerView.stage === 'live_combat' && !liveArenaStage))
  const shouldShowSessionCompletion = displayPublicSession?.phase === 'session_complete'

  useEffect(() => {
    setArchiveReplayPayload(null)
    setArchiveSelectedFightId('')
    setArchiveError('')
  }, [displayActiveSessionId])

  const loadArchivedReplay = useCallback(
    async (fightId: string) => {
      if (replayProof?.replayPayload) {
        const proofFightId = replayProof.publicSession.continuation.fightArchive[0]?.fightId

        if (proofFightId === fightId) {
          return replayProof.replayPayload
        }
      }

      return loadFightReplay(fightId)
    },
    [loadFightReplay, replayProof],
  )

  const reviewArchivedFight = useCallback(
    async (fightId: string) => {
      setArchiveLoadState('busy')
      setArchiveError('')

      try {
        const payload = await loadArchivedReplay(fightId)

        setArchiveReplayPayload(payload)
        setArchiveSelectedFightId(fightId)
      } catch (errorValue) {
        setArchiveError(errorValue instanceof Error ? errorValue.message : 'Could not load archived replay.')
      } finally {
        setArchiveLoadState('idle')
      }
    },
    [loadArchivedReplay],
  )

  const downloadArchivedFight = useCallback(
    async (fightId: string) => {
      setArchiveLoadState('busy')
      setArchiveError('')

      try {
        const payload = archiveSelectedFightId === fightId && archiveReplayPayload
          ? archiveReplayPayload
          : await loadArchivedReplay(fightId)
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        const safeSessionId = (displayActiveSessionId || 'session').replace(/[^a-z0-9_-]/gi, '_')
        const safeFightId = fightId.replace(/[^a-z0-9_-]/gi, '_')

        link.href = url
        link.download = `${safeSessionId}-${safeFightId}-replay.json`
        link.click()
        URL.revokeObjectURL(url)
      } catch (errorValue) {
        setArchiveError(errorValue instanceof Error ? errorValue.message : 'Could not download archived replay.')
      } finally {
        setArchiveLoadState('idle')
      }
    },
    [archiveReplayPayload, archiveSelectedFightId, displayActiveSessionId, loadArchivedReplay],
  )

  const clearArchivedFight = useCallback(() => {
    setArchiveReplayPayload(null)
    setArchiveSelectedFightId('')
    setArchiveError('')
  }, [])

  return (
    <main className="arena-app match-console">
      <div className="match-dashboard-shell">
        <section className="match-stage-card" id="dashboard" aria-label="Arena dashboard">
          <div className="match-stage-frame">
            {renderedReplayPayload ? (
              <Suspense fallback={<ReplayFrameFallback />}>
                <ReplayViewer
                  autoPlay
                  arena={visibleArena}
                  botBlueprints={renderedReplayPayload.botBlueprints}
                  machineDesigns={renderedReplayPayload.machineDesigns}
                  showDamageSchematic={false}
                  teamIdentities={renderedReplayPayload.teamIdentities}
                  timeline={renderedReplayPayload.timeline}
                />
              </Suspense>
            ) : showFightCockpitStage ? (
              <RefereeCockpitStrip
                forceVisible
                loadState={roleLoadState}
                placement="stage"
                observerView={observerView}
                roleStates={displayRoleStates}
                stateError={liveArenaStateError}
              />
            ) : (
              <Suspense fallback={<ReplayFrameFallback />}>
                <ArenaPreviewScene arena={visibleArena} liveBots={liveArenaStage} />
              </Suspense>
            )}
            {observerView.showReplayStatus && !reviewingArchivedReplay ? (
              <ReplayStatusOverlay error={replayError} loadState={replayLoadState} />
            ) : null}
            {observerView.showCockpitStrip && !showFightCockpitStage ? (
              <RefereeCockpitStrip
                loadState={roleLoadState}
                placement="stage"
                observerView={observerView}
                roleStates={displayRoleStates}
                stateError={liveArenaStateError}
              />
            ) : null}
          </div>
        </section>

        <MatchScoreboard
          publicSession={displayPublicSession}
          replayPayload={displayReplayPayload}
          observerView={observerView}
          roleLinks={{
            red: {
              hasInvite: !replayProof && hasInviteForRole('red'),
              inviteCopyUrl: redInviteUrl,
              inviteUrl: redCockpitUrl,
              onCopyInvite: () => void copyInviteUrl(redInviteUrl),
            },
            blue: {
              hasInvite: !replayProof && hasInviteForRole('blue'),
              inviteCopyUrl: blueInviteUrl,
              inviteUrl: blueCockpitUrl,
              onCopyInvite: () => void copyInviteUrl(blueInviteUrl),
            },
          }}
          sessionControl={{
            activeSessionId: displayActiveSessionId,
            advanceHint: advanceRoundHint,
            advanceLabel: advanceRoundLabel,
            canAdvance: !replayProof && canAdvanceRound,
            canRefresh: !replayProof && Boolean(activeSessionId) && loadState !== 'busy',
            isBusy: loadState === 'busy',
            onAdvance: () => void submitRoundAdvance(),
            onCreate: () => void createNewSession(),
            onRefresh: refreshStoredSession,
            tokenStored: !replayProof && Boolean(storedRefereeToken),
          }}
        />

        <section className="match-dashboard-panels" aria-label="Match dashboard">
          <Panel className="panel dashboard-panel fight-comms-panel">
            <SectionHeader kicker="Agent comms" title="Fight Comms" aside={chatSummary} />
            <PublicChatLog
              messages={fightComms}
              emptyText="No fight comms yet."
            />
          </Panel>

          {shouldShowSessionCompletion ? (
            <Panel className="panel dashboard-panel session-completion-dashboard-panel">
              <SectionHeader kicker="Session end" title="Shared Debrief" />
              <SessionCompletionPanel
                controls={completionControls}
                publicSession={displayPublicSession}
              />
            </Panel>
          ) : null}

          {fightArchive.length > 0 ? (
            <Panel className="panel dashboard-panel fight-archive-panel">
              <SectionHeader
                kicker="Replay archive"
                title="Fight Archive"
                aside={archiveSelectedFightId || `${fightArchive.length} fight${fightArchive.length === 1 ? '' : 's'}`}
              />
              <FightArchiveDashboard
                entries={fightArchive}
                error={archiveError}
                loadState={archiveLoadState}
                onClear={clearArchivedFight}
                onDownload={(fightId) => void downloadArchivedFight(fightId)}
                onReview={(fightId) => void reviewArchivedFight(fightId)}
                selectedFightId={archiveSelectedFightId}
              />
            </Panel>
          ) : null}

          <Panel className="panel dashboard-panel key-stats-panel">
            <SectionHeader kicker="Key stats" title="Key Stats" />
            <KeyStatsDashboard
              replayPayload={displayReplayPayload}
              observerView={observerView}
            />
          </Panel>

          <Panel className="panel dashboard-panel arena-impact-panel" id="arena-impact">
            <SectionHeader kicker="Environment" title="Arena Impact" />
            <ArenaImpactDashboard
              publicSession={displayPublicSession}
              replayPayload={displayReplayPayload}
              observerView={observerView}
            />
          </Panel>
        </section>

        {error && !replayProof ? <p className="referee-error" role="alert">{error}</p> : null}
      </div>
    </main>
  )
}

