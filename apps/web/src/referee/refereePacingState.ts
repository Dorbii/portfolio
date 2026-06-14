import type { TeamRole } from '../../../../packages/schemas/src/index.js'
import type {
  LiveCombatFeed,
  PublicSessionState,
  RolePrivateState,
} from '../agent/agentSessionTypes.js'
import type { LivePlaybackBufferSnapshot } from '../replay/arena/liveCombatTimeline'

const TEAM_ROLES: TeamRole[] = ['red', 'blue']

export type RefereePacingViewerState =
  | 'waiting_on_agents'
  | 'playing_confirmed_combat'
  | 'caught_up_next_decision_pending'
  | 'round_review'
  | 'session_complete'

export type RefereeRolePacingStatus =
  | 'complete'
  | 'submitted'
  | 'thinking'
  | 'unclaimed'
  | 'waiting'

export type RefereePacingRoleState = {
  label: string
  role: TeamRole
  status: RefereeRolePacingStatus
}

export type RefereeAutoAdvanceGate = {
  ready: boolean
  reason: string
}

export type RefereePacingState = {
  activeBlockerCode: string
  activeBlockerLabel: string
  autoAdvanceGate: RefereeAutoAdvanceGate
  metrics: {
    combatWatchedSeconds?: number
    combatWatchedWallRatioLabel: string
    combatWatchedVsWallLabel: string
    currentPhaseLabel: string
    lastCombatBurstLabel: string
    matchElapsedLabel: string
    roundLabel: string
  }
  roleStates: Record<TeamRole, RefereePacingRoleState>
  statusLine: string
  viewerState: RefereePacingViewerState
  viewerStateLabel: string
}

export type BuildRefereePacingStateInput = {
  liveCombatFeed?: LiveCombatFeed | null
  livePlaybackStatus?: LivePlaybackBufferSnapshot | null
  nowMs?: number
  publicSession: PublicSessionState | null
  roleStates: Partial<Record<TeamRole, RolePrivateState>>
}

export function buildRefereePacingState({
  liveCombatFeed,
  livePlaybackStatus,
  nowMs = Date.now(),
  publicSession,
  roleStates,
}: BuildRefereePacingStateInput): RefereePacingState {
  const viewerState = resolveViewerState(publicSession, livePlaybackStatus, nowMs)
  const pacingRoles = buildRolePacingStates(publicSession, roleStates, liveCombatFeed, nowMs)
  const blocker = resolveActiveBlocker(publicSession, pacingRoles, nowMs)
  const metrics = buildPacingMetrics(publicSession, livePlaybackStatus, nowMs)
  const viewerStateLabel = viewerStateLabelFor(viewerState)

  return {
    activeBlockerCode: blocker.code,
    activeBlockerLabel: blocker.label,
    autoAdvanceGate: resolveRefereeAutoAdvanceGate(publicSession, roleStates),
    metrics,
    roleStates: pacingRoles,
    statusLine: `${viewerStateLabel}: ${blocker.label}`,
    viewerState,
    viewerStateLabel,
  }
}

export function resolveRefereeAutoAdvanceGate(
  publicSession: PublicSessionState | null,
  roleStates: Partial<Record<TeamRole, RolePrivateState>>,
): RefereeAutoAdvanceGate {
  if (!publicSession) {
    return { ready: false, reason: 'No active session.' }
  }

  if (publicSession.phase !== 'round_review') {
    return { ready: false, reason: 'Round review is not active.' }
  }

  const latestFightId = latestCompletedFightId(publicSession)

  if (!latestFightId) {
    return { ready: false, reason: 'No completed fight is ready for review.' }
  }

  if (sharedDebriefCoversFight(publicSession, latestFightId)) {
    return { ready: true, reason: 'Shared debrief ready.' }
  }

  const pendingReflectionRoles = TEAM_ROLES.filter((role) => {
    const review = roleStates[role]?.agentPacket?.review

    return review?.fightId === latestFightId &&
      review.reflection.required &&
      !review.reflection.submitted
  })

  if (pendingReflectionRoles.length > 0) {
    return {
      ready: false,
      reason: `${formatRoleList(pendingReflectionRoles)} reflection pending.`,
    }
  }

  return { ready: false, reason: 'Waiting for shared debrief.' }
}

function resolveViewerState(
  publicSession: PublicSessionState | null,
  livePlaybackStatus: LivePlaybackBufferSnapshot | null | undefined,
  nowMs: number,
): RefereePacingViewerState {
  if (!publicSession) {
    return 'waiting_on_agents'
  }

  if (publicSession.phase === 'session_complete' || publicSession.phase === 'expired') {
    return 'session_complete'
  }

  if (publicSession.phase === 'round_review') {
    return 'round_review'
  }

  if (publicSession.phase === 'combat_turn') {
    if (
      livePlaybackStatus?.status === 'playing' ||
      livePlaybackStatus?.status === 'catching_up' ||
      livePlaybackStatus?.status === 'replaying_late_events'
    ) {
      return 'playing_confirmed_combat'
    }

    if (!isCombatDecisionOpen(publicSession, nowMs) || livePlaybackStatus?.status === 'drained') {
      return 'caught_up_next_decision_pending'
    }

    return 'waiting_on_agents'
  }

  if (publicSession.phase === 'combat_resolved' || publicSession.phase === 'replay_phase') {
    return 'playing_confirmed_combat'
  }

  return 'waiting_on_agents'
}

function buildRolePacingStates(
  publicSession: PublicSessionState | null,
  roleStates: Partial<Record<TeamRole, RolePrivateState>>,
  liveCombatFeed: LiveCombatFeed | null | undefined,
  nowMs: number,
): Record<TeamRole, RefereePacingRoleState> {
  return {
    red: buildRolePacingState('red', publicSession, roleStates, liveCombatFeed, nowMs),
    blue: buildRolePacingState('blue', publicSession, roleStates, liveCombatFeed, nowMs),
  }
}

function buildRolePacingState(
  role: TeamRole,
  publicSession: PublicSessionState | null,
  roleStates: Partial<Record<TeamRole, RolePrivateState>>,
  liveCombatFeed: LiveCombatFeed | null | undefined,
  nowMs: number,
): RefereePacingRoleState {
  if (!publicSession) {
    return rolePacingState(role, 'waiting')
  }

  const publicRole = publicSession.roles[role]

  if (!publicRole?.claimed) {
    return rolePacingState(role, 'unclaimed')
  }

  if (publicSession.phase === 'session_complete' || publicSession.phase === 'expired') {
    return rolePacingState(role, 'complete')
  }

  if (publicSession.phase === 'round_review') {
    return buildRoundReviewRolePacingState(role, publicSession, roleStates)
  }

  if (publicSession.phase === 'combat_turn') {
    if (!isCombatDecisionOpen(publicSession, nowMs)) {
      return rolePacingState(role, 'waiting')
    }

    const submitted = publicSession.combat?.submitted?.[role] ??
      liveCombatFeed?.combat?.submitted?.[role] ??
      false

    return rolePacingState(role, submitted ? 'submitted' : 'thinking')
  }

  if (publicSession.phase === 'submission_phase') {
    return rolePacingState(role, publicRole.submitted ? 'submitted' : 'thinking')
  }

  return rolePacingState(role, publicRole.submitted ? 'submitted' : 'waiting')
}

function buildRoundReviewRolePacingState(
  role: TeamRole,
  publicSession: PublicSessionState,
  roleStates: Partial<Record<TeamRole, RolePrivateState>>,
): RefereePacingRoleState {
  const latestFightId = latestCompletedFightId(publicSession)

  if (latestFightId && sharedDebriefCoversFight(publicSession, latestFightId)) {
    return rolePacingState(role, 'submitted')
  }

  const review = roleStates[role]?.agentPacket?.review

  if (!review || (latestFightId && review.fightId !== latestFightId)) {
    return rolePacingState(role, 'waiting')
  }

  if (review.reflection.submitted || review.debrief.available) {
    return rolePacingState(role, 'submitted')
  }

  if (review.reflection.required) {
    return rolePacingState(role, 'thinking')
  }

  return rolePacingState(role, 'waiting')
}

function rolePacingState(
  role: TeamRole,
  status: RefereeRolePacingStatus,
): RefereePacingRoleState {
  return {
    label: `${capitalize(role)} ${roleStatusLabel(status)}`,
    role,
    status,
  }
}

function resolveActiveBlocker(
  publicSession: PublicSessionState | null,
  roleStates: Record<TeamRole, RefereePacingRoleState>,
  nowMs: number,
): { code: string; label: string } {
  if (!publicSession) {
    return { code: 'no_session', label: 'Create or load a session' }
  }

  const unclaimed = rolesWithStatus(roleStates, 'unclaimed')

  if (unclaimed.length > 0) {
    return {
      code: `${unclaimed.join('_')}_unclaimed`,
      label: `${formatRoleList(unclaimed)} unclaimed`,
    }
  }

  if (publicSession.phase === 'session_complete') {
    return { code: 'session_complete', label: 'Session complete' }
  }

  if (publicSession.phase === 'expired') {
    return { code: 'session_expired', label: 'Session expired' }
  }

  if (publicSession.phase === 'round_review') {
    const latestFightId = latestCompletedFightId(publicSession)
    const thinking = rolesWithStatus(roleStates, 'thinking')

    if (latestFightId && sharedDebriefCoversFight(publicSession, latestFightId)) {
      return { code: 'referee_round_advance', label: 'Waiting for referee round advance' }
    }

    if (thinking.length > 0) {
      return {
        code: `${thinking.join('_')}_reflection_pending`,
        label: `${formatRoleList(thinking)} thinking`,
      }
    }

    return { code: 'shared_debrief_pending', label: 'Waiting for shared debrief' }
  }

  if (publicSession.phase === 'combat_turn') {
    if (!isCombatDecisionOpen(publicSession, nowMs)) {
      return { code: 'next_decision_pending', label: 'Next decision pending' }
    }

    const thinking = rolesWithStatus(roleStates, 'thinking')

    if (thinking.length > 0) {
      return {
        code: `${thinking.join('_')}_turn_pending`,
        label: `${formatRoleList(thinking)} thinking`,
      }
    }

    return { code: 'confirmed_combat_pending', label: 'Waiting for confirmed combat' }
  }

  if (publicSession.phase === 'submission_phase') {
    const thinking = rolesWithStatus(roleStates, 'thinking')

    if (thinking.length > 0) {
      return {
        code: `${thinking.join('_')}_loadout_pending`,
        label: `${formatRoleList(thinking)} thinking`,
      }
    }

    return { code: 'combat_start_pending', label: 'Waiting for combat start' }
  }

  return { code: publicSession.phase, label: formatLabel(publicSession.phase) }
}

function buildPacingMetrics(
  publicSession: PublicSessionState | null,
  livePlaybackStatus: LivePlaybackBufferSnapshot | null | undefined,
  nowMs: number,
): RefereePacingState['metrics'] {
  const startedAtMs = matchStartedAtMs(publicSession)
  const wallSeconds = startedAtMs === undefined
    ? undefined
    : Math.max(0, (nowMs - startedAtMs) / 1000)
  const archivedFightSeconds = publicSession?.continuation?.fightArchive
    ?.reduce((total, fight) => total + Math.max(0, fight.duration), 0) ?? 0
  const currentCombatSeconds = publicSession?.phase === 'combat_turn'
    ? Math.max(0, livePlaybackStatus?.maxCommittedEventTime ?? 0)
    : 0
  const combatWatchedSeconds = archivedFightSeconds + currentCombatSeconds
  const latestFight = publicSession?.continuation?.fightArchive?.at(-1)
  const lastCombatBurstSeconds = currentCombatSeconds > 0
    ? currentCombatSeconds
    : latestFight?.duration
  const wallRatio = wallSeconds && wallSeconds > 0
    ? combatWatchedSeconds / wallSeconds
    : undefined

  return {
    combatWatchedSeconds,
    combatWatchedWallRatioLabel: wallRatio === undefined ? '--' : `${wallRatio.toFixed(2)}x`,
    combatWatchedVsWallLabel: `${formatPacingDuration(combatWatchedSeconds)} / ${formatPacingDuration(wallSeconds)}`,
    currentPhaseLabel: publicSession ? formatLabel(publicSession.phase) : 'No Session',
    lastCombatBurstLabel: formatPacingDuration(lastCombatBurstSeconds),
    matchElapsedLabel: formatPacingDuration(wallSeconds),
    roundLabel: publicSession ? `R${publicSession.round}` : '--',
  }
}

function rolesWithStatus(
  roleStates: Record<TeamRole, RefereePacingRoleState>,
  status: RefereeRolePacingStatus,
): TeamRole[] {
  return TEAM_ROLES.filter((role) => roleStates[role].status === status)
}

function isCombatDecisionOpen(
  publicSession: PublicSessionState,
  nowMs: number,
): boolean {
  const openedAtMs = Date.parse(publicSession.combat?.openedAt ?? '')

  return Number.isNaN(openedAtMs) || nowMs >= openedAtMs
}

function latestCompletedFightId(publicSession: PublicSessionState): string | undefined {
  return publicSession.continuation?.fightArchive?.at(-1)?.fightId
}

function sharedDebriefCoversFight(
  publicSession: PublicSessionState,
  fightId: string,
): boolean {
  return publicSession.continuation?.sharedDebrief?.fightIds.includes(fightId) ?? false
}

function matchStartedAtMs(publicSession: PublicSessionState | null): number | undefined {
  const startedAt = publicSession?.eventLog?.find((event) => event.type === 'session_created')?.at ??
    publicSession?.eventLog?.[0]?.at ??
    publicSession?.combat?.fightStartedAt

  if (!startedAt) {
    return undefined
  }

  const parsed = Date.parse(startedAt)

  return Number.isNaN(parsed) ? undefined : parsed
}

function viewerStateLabelFor(state: RefereePacingViewerState): string {
  if (state === 'playing_confirmed_combat') {
    return 'Playing confirmed combat'
  }

  if (state === 'caught_up_next_decision_pending') {
    return 'Caught up; next decision pending'
  }

  if (state === 'round_review') {
    return 'Round review'
  }

  if (state === 'session_complete') {
    return 'Session complete'
  }

  return 'Waiting on agents'
}

function roleStatusLabel(status: RefereeRolePacingStatus): string {
  if (status === 'complete') {
    return 'complete'
  }

  if (status === 'submitted') {
    return 'submitted'
  }

  if (status === 'thinking') {
    return 'thinking'
  }

  if (status === 'unclaimed') {
    return 'unclaimed'
  }

  return 'waiting'
}

function formatRoleList(roles: TeamRole[]): string {
  if (roles.length === 2) {
    return 'Red and Blue'
  }

  return roles[0] ? capitalize(roles[0]) : 'Agents'
}

function formatPacingDuration(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) {
    return '--'
  }

  const safe = Math.max(0, value)

  if (safe < 10 && safe % 1 !== 0) {
    return `${(Math.round(safe * 10) / 10).toFixed(1)}s`
  }

  const seconds = Math.round(safe)

  if (seconds < 60) {
    return `${seconds}s`
  }

  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60

  return `${minutes}m ${String(remainder).padStart(2, '0')}s`
}

function formatLabel(value: string): string {
  return value
    .split('_')
    .map(capitalize)
    .join(' ')
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
