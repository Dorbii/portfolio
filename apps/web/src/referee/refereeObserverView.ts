import type { SessionPhase, TeamRole } from '../../../../packages/schemas/src/index.js'
import type { ReplayEvent } from '../../../../packages/replay/src/index.js'
import type { StatusTone } from '../shared/ui'
import { formatDurationSeconds, formatLabel } from '../shared/format.js'
import {
  resolveTeamIdentity,
  teamAccentRgb,
  teamLogoInitials,
} from '../shared/teamVisuals.js'
import type { PublicSessionState } from '../agent/agentSessionTypes.js'
import type { ReplayPayload } from './refereeClient'

export type RefereeObserverLifecycleStage =
  | 'loadout_window'
  | 'live_combat'
  | 'resolved_replay'
  | 'round_review'
  | 'session_complete'

export type RefereeObserverTeamView = {
  accentRgb: string
  claimed: boolean
  damageTaken: number
  healthLabel: string
  healthPercent: number
  hitCount: number
  isWinner: boolean
  lifecycle: {
    label: string
    tone: StatusTone
  }
  logoInitials: string
  logoMark: string
  losses: number
  name: string
  submitted: boolean
  wins: number
}

export type RefereeObserverLifecycle = {
  stage: RefereeObserverLifecycleStage
  canUseCurrentResult: boolean
  canUseReplayPayload: boolean
  replayClockLabel: string
  showReplay: boolean
  showReplayStatus: boolean
  showCockpitStrip: boolean
  decisionText: string
  replayEventCount: number
  teams: Record<TeamRole, RefereeObserverTeamView>
}

type RefereeObserverInput = {
  publicSession: PublicSessionState | null
  replayPayload: ReplayPayload | null
}

export function buildRefereeObserverView({
  publicSession,
  replayPayload,
}: RefereeObserverInput): RefereeObserverLifecycle {
  const stage = resolveObserverStage(publicSession)
  const canUseCurrentResult = shouldUseCurrentResult(publicSession)
  const canUseReplayPayload = shouldUseReplayPayload(publicSession)
  const replayClockLabel = getReplayClockLabel(replayPayload, canUseReplayPayload)
  const isReplayMetricsStage = stage !== 'live_combat' && stage !== 'loadout_window'
  const canUseResultMetrics = canUseCurrentResult && isReplayMetricsStage
  const isRenderingReplay = canUseReplayPayload && Boolean(replayPayload)

  return {
    stage,
    canUseCurrentResult,
    canUseReplayPayload,
    replayClockLabel,
    showReplay: isRenderingReplay,
    showReplayStatus: canUseReplayPayload && !Boolean(replayPayload),
    showCockpitStrip: stage !== 'live_combat' && !isRenderingReplay,
    decisionText: resolveDecisionText(publicSession, canUseResultMetrics),
    replayEventCount: canUseReplayPayload
      ? (replayPayload?.timeline.events.length ?? 0)
      : 0,
    teams: {
      red: buildTeamView({
        canUseResultMetrics,
        canUseReplayPayload,
        phase: publicSession?.phase,
        publicSession,
        replayPayload,
        role: 'red',
      }),
      blue: buildTeamView({
        canUseResultMetrics,
        canUseReplayPayload,
        phase: publicSession?.phase,
        publicSession,
        replayPayload,
        role: 'blue',
      }),
    },
  }
}

function resolveObserverStage(publicSession: PublicSessionState | null): RefereeObserverLifecycleStage {
  if (!publicSession) {
    return 'loadout_window'
  }

  if (publicSession.phase === 'session_complete' || publicSession.phase === 'expired') {
    return 'session_complete'
  }

  if (publicSession.phase === 'round_review') {
    if (isResolvedReplayState(publicSession.replayStatus)) {
      return 'resolved_replay'
    }

    return 'round_review'
  }

  if (publicSession.phase === 'combat_turn') {
    return 'live_combat'
  }

  if (publicSession.phase === 'combat_resolved' || publicSession.phase === 'replay_phase') {
    return 'resolved_replay'
  }

  return publicSession.replayStatus === 'resolved'
    ? 'resolved_replay'
    : 'loadout_window'
}

function getReplayClockLabel(
  replayPayload: ReplayPayload | null,
  canUseReplayPayload: boolean,
): string {
  return canUseReplayPayload && replayPayload
    ? formatDurationSeconds(replayPayload.timeline.duration)
    : '--'
}

function isResolvedReplayState(status: PublicSessionState['replayStatus'] | undefined): boolean {
  return status === 'resolved'
}

function shouldUseCurrentResult(publicSession: PublicSessionState | null): boolean {
  return Boolean(
    publicSession &&
      isResolvedReplayState(publicSession.replayStatus) &&
      publicSession.lastResult,
  )
}

function shouldUseReplayPayload(publicSession: PublicSessionState | null): boolean {
  return Boolean(
    publicSession &&
      isResolvedReplayState(publicSession.replayStatus) &&
      publicSession.replayAvailable,
  )
}

function resolveDecisionText(
  publicSession: PublicSessionState | null,
  canUseCurrentResult: boolean,
): string {
  if (!publicSession) {
    return 'Create or load a session'
  }

  if (canUseCurrentResult && publicSession.lastResult) {
    const winner = publicSession.lastResult.winner

    if (winner === 'draw') {
      return 'Draw'
    }

    if (winner === 'red' || winner === 'blue') {
      return `${winner[0].toUpperCase()}${winner.slice(1)} wins`
    }
  }

  return formatLabel(publicSession.phase)
}

function buildTeamView({
  canUseResultMetrics,
  canUseReplayPayload,
  phase,
  publicSession,
  replayPayload,
  role,
}: {
  canUseResultMetrics: boolean
  canUseReplayPayload: boolean
  phase: SessionPhase | undefined
  publicSession: PublicSessionState | null
  replayPayload: ReplayPayload | null
  role: TeamRole
}): RefereeObserverTeamView {
  const roleState = publicSession?.roles[role]
  const identity = roleState?.identity ?? replayPayload?.teamIdentities?.[role]
  const result = canUseResultMetrics ? publicSession?.lastResult : undefined
  const resolvedHealth = result?.remainingHealth?.[role]
  const resolvedDamage = result?.damage?.[role] ?? 0
  const submitted = roleState?.submitted ?? false
  const claimed = roleState?.claimed ?? false
  const healthPercent = resolvedHealth === undefined
    ? submitted ? 100 : 0
    : Math.max(0, Math.round((resolvedHealth / Math.max(resolvedHealth + resolvedDamage, 1)) * 100))
  const losses = roleState?.losses ?? 0
  const wins = roleState?.wins ?? 0
  const hitCount = canUseReplayPayload
    ? countImpactEvents(replayPayload?.timeline.events ?? [], role)
    : 0
  const teamIdentity = resolveTeamIdentity(role, identity)
  const isWinner = canUseResultMetrics && publicSession?.lastResult?.winner === role

  return {
    accentRgb: teamAccentRgb(role, identity),
    claimed,
    damageTaken: canUseResultMetrics ? resolvedDamage : 0,
    healthLabel: resolvedHealth === undefined ? 'Pending' : String(Math.max(resolvedHealth, 0)),
    healthPercent,
    hitCount,
    isWinner,
    lifecycle: teamLifecycleStatus({
      claimed,
      hasResult: canUseResultMetrics,
      phase,
      submitted,
    }),
    logoInitials: teamLogoInitials(role, identity),
    logoMark: teamIdentity.logo?.mark ?? 'shield',
    losses,
    name: (identity?.name ?? `Team ${role}`).trim() || teamIdentity.name,
    submitted,
    wins,
  }
}

function teamLifecycleStatus({
  claimed,
  hasResult,
  phase,
  submitted,
}: {
  claimed: boolean
  hasResult: boolean
  phase: SessionPhase | undefined
  submitted: boolean
}): { label: string; tone: StatusTone } {
  if (!claimed) {
    return { label: 'Not claimed', tone: 'warning' }
  }

  if (hasResult) {
    return { label: 'Done', tone: 'neutral' }
  }

  if (phase === 'combat_turn') {
    return { label: 'Combat live', tone: 'ok' }
  }

  if (submitted) {
    return { label: 'Ready', tone: 'ok' }
  }

  return { label: 'Building', tone: 'neutral' }
}

function countImpactEvents(events: ReplayEvent[], role: TeamRole): number {
  return events.filter(
    (event) => isImpactEvent(event) && event.attacker === role,
  ).length
}

function isImpactEvent(event: ReplayEvent): event is Extract<ReplayEvent, { type: 'impact' }> {
  return event.type === 'impact'
}
