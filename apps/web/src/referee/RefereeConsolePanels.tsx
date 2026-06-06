import { useEffect, useMemo, useState } from 'react'
import type {
  PublicSessionState,
  TeamRole,
} from '../../../../packages/schemas/src/index.js'
import type { ReplayEvent } from '../../../../packages/replay/src/index.js'
import {
  capitalize,
  formatClockTime,
  formatDurationSeconds,
  formatLabel,
} from '../shared/format'
import {
  ActionGroup,
  Button,
  ProgressMeter,
  SectionHeading,
  StatusBadge,
} from '../shared/ui'
import type { ReplayPayload } from './refereeClient'

type TeamBannerHandoff = {
  agentBrief: string
  hasInvite: boolean
  inviteUrl: string
  onCopyBrief: () => Promise<void> | void
}

type ScoreboardSessionControl = {
  activeSessionId: string
  advanceHint?: string
  advanceLabel: string
  canAdvance: boolean
  canRefresh: boolean
  isBusy: boolean
  onAdvance: () => void
  onCreate: () => void
  onRefresh: () => void
  tokenStored: boolean
}

export function MatchScoreboard({
  phase,
  publicSession,
  replayPayload,
  roleHandoffs,
  sessionControl,
}: {
  phase: string
  publicSession: PublicSessionState | null
  replayPayload: ReplayPayload | null
  roleHandoffs: Record<TeamRole, TeamBannerHandoff>
  sessionControl: ScoreboardSessionControl
}) {
  const winsRequired = getWinsRequired(publicSession?.maxRounds)
  const decision = formatDecision(publicSession)

  return (
    <header className="match-scoreboard" aria-label="Match scoreboard">
      <ScoreboardTeam
        phase={phase}
        publicSession={publicSession}
        replayPayload={replayPayload}
        role="red"
        handoff={roleHandoffs.red}
        winsRequired={winsRequired}
      />
      <div className="scoreboard-core">
        <span>Session Control</span>
        <strong>{publicSession ? `R${publicSession.round}` : '--'}</strong>
        <small title={sessionControl.activeSessionId || undefined}>
          {publicSession
            ? `${formatReplayClock(replayPayload)} / ${decision}`
            : sessionControl.activeSessionId || 'Create session'}
        </small>
        <ScoreboardPlanTimer publicSession={publicSession} />
        <ActionGroup className="scoreboard-session-actions">
          <Button
            type="button"
            variant="secondary"
            disabled={!sessionControl.canAdvance}
            title={sessionControl.advanceHint}
            onClick={sessionControl.onAdvance}
          >
            {sessionControl.advanceLabel}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={!sessionControl.canRefresh}
            onClick={sessionControl.onRefresh}
            title={
              sessionControl.tokenStored
                ? 'Clear the stored referee and handoff tokens for this browser tab.'
                : 'Reload the public session state.'
            }
          >
            Refresh Session
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={sessionControl.onCreate}
            disabled={sessionControl.isBusy}
          >
            {sessionControl.isBusy ? 'Creating...' : 'New Session'}
          </Button>
        </ActionGroup>
      </div>
      <ScoreboardTeam
        phase={phase}
        publicSession={publicSession}
        replayPayload={replayPayload}
        role="blue"
        handoff={roleHandoffs.blue}
        winsRequired={winsRequired}
      />
    </header>
  )
}

function ScoreboardPlanTimer({ publicSession }: { publicSession: PublicSessionState | null }) {
  const roundPlan = publicSession?.phase === 'submission_phase'
    ? publicSession.roundPlan
    : undefined
  const deadlineAt = roundPlan?.deadlineAt
  const [nowMs, setNowMs] = useState(() => Date.now())
  const deadlineMs = useMemo(
    () => Date.parse(deadlineAt ?? ''),
    [deadlineAt],
  )
  const remainingMs = Number.isFinite(deadlineMs)
    ? Math.max(0, deadlineMs - nowMs)
    : 0
  const isExpired = Boolean(roundPlan && remainingMs <= 0)

  useEffect(() => {
    if (!deadlineAt) {
      return undefined
    }

    setNowMs(Date.now())
    const id = window.setInterval(() => setNowMs(Date.now()), 500)

    return () => window.clearInterval(id)
  }, [deadlineAt])

  if (!roundPlan) {
    return null
  }

  return (
    <div
      className={`scoreboard-plan-timer${isExpired ? ' is-expired' : ''}`}
      aria-label="Round plan timer"
      data-plan-timer-state={isExpired ? 'expired' : 'active'}
      data-plan-deadline-at={deadlineAt}
    >
      <span>Plan Timer</span>
      <strong>{formatCountdown(remainingMs)}</strong>
    </div>
  )
}

function ScoreboardTeam({
  handoff,
  phase,
  publicSession,
  replayPayload,
  role,
  winsRequired,
}: {
  handoff: TeamBannerHandoff
  phase: string
  publicSession: PublicSessionState | null
  replayPayload: ReplayPayload | null
  role: TeamRole
  winsRequired: number
}) {
  const team = getTeamDashboardData(role, publicSession, replayPayload)
  const opponentRole = role === 'red' ? 'blue' : 'red'
  const opponent = getTeamDashboardData(opponentRole, publicSession, replayPayload)
  const isWinner = publicSession?.lastResult?.winner === role

  return (
    <section className={`scoreboard-team-block ${role} ${isWinner ? 'winner' : ''}`}>
      <div className="scoreboard-team-mark" aria-hidden="true" />
      <div className="scoreboard-team-copy">
        <strong>{team.name}</strong>
        <span>
          Win {team.wins} - {opponent.wins}
        </span>
      </div>
      <div className="scoreboard-score">{team.wins}</div>
      <div className="scoreboard-pips" aria-label={`${capitalize(role)} round wins`}>
        {Array.from({ length: winsRequired }, (_, index) => (
          <span
            className={index < team.wins ? 'is-filled' : ''}
            key={`${role}-pip-${index}`}
          />
        ))}
      </div>
      <div className="scoreboard-team-status">
        <StatusBadge tone={team.claimed ? 'ok' : 'warning'}>
          {team.claimed ? 'Connected' : 'Not connected'}
        </StatusBadge>
        <StatusBadge tone={team.submitted ? 'ok' : 'neutral'}>
          {team.submitted ? 'Plan locked' : 'Plan pending'}
        </StatusBadge>
      </div>
      <div className="scoreboard-handoff">
        {handoff.hasInvite ? (
          <ActionGroup className="scoreboard-handoff-actions">
            {handoff.inviteUrl ? (
              <a
                className="ui-button ui-button-ghost"
                href={handoff.inviteUrl}
                rel="noreferrer"
                target="_blank"
              >
                View cockpit
              </a>
            ) : (
              <Button type="button" variant="ghost" disabled>
                View cockpit
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={handoff.onCopyBrief}
              disabled={!handoff.agentBrief}
            >
              Copy handoff
            </Button>
          </ActionGroup>
        ) : (
          <span>{team.claimed ? formatLabel(phase) : 'Create session for handoff'}</span>
        )}
      </div>
    </section>
  )
}

export function TeamStatusDashboard({
  publicSession,
  replayPayload,
}: {
  publicSession: PublicSessionState | null
  replayPayload: ReplayPayload | null
}) {
  const red = getTeamDashboardData('red', publicSession, replayPayload)
  const blue = getTeamDashboardData('blue', publicSession, replayPayload)
  const maxDamage = Math.max(red.damageTaken, blue.damageTaken, 1)
  const maxHits = Math.max(red.hitCount, blue.hitCount, 1)

  return (
    <div className="team-status-dashboard">
      {[red, blue].map((team) => (
        <section className={`team-status-column ${team.role}`} key={team.role}>
          <h3>{team.name}</h3>
          <div className="team-status-facts">
            <StatusFact
              label="Connection"
              tone={team.claimed ? 'ok' : 'warning'}
              value={team.claimed ? 'Connected' : 'Open'}
            />
            <StatusFact
              label="Plan"
              tone={team.submitted ? 'ok' : 'neutral'}
              value={team.submitted ? 'Locked' : 'Pending'}
            />
          </div>
          <ProgressMeter
            label="Health Left"
            tone={team.role}
            value={team.healthPercent}
            valueLabel={team.healthLabel}
          />
          <ProgressMeter
            label="Damage Taken"
            max={maxDamage}
            tone={team.role}
            value={team.damageTaken}
            valueLabel={`${team.damageTaken}`}
          />
          <ProgressMeter
            label="Weapon Hits"
            max={maxHits}
            tone={team.role}
            value={team.hitCount}
            valueLabel={`${team.hitCount}`}
          />
        </section>
      ))}
    </div>
  )
}

function StatusFact({
  label,
  tone,
  value,
}: {
  label: string
  tone: 'neutral' | 'ok' | 'warning'
  value: string
}) {
  return (
    <div className="team-status-fact">
      <span>{label}</span>
      <StatusBadge tone={tone}>{value}</StatusBadge>
    </div>
  )
}

export function KeyStatsDashboard({
  publicSession,
  replayPayload,
}: {
  publicSession: PublicSessionState | null
  replayPayload: ReplayPayload | null
}) {
  const red = getTeamDashboardData('red', publicSession, replayPayload)
  const blue = getTeamDashboardData('blue', publicSession, replayPayload)
  const replayEvents = replayPayload?.timeline.events.length ?? 0

  return (
    <div className="key-stats-dashboard" role="table" aria-label="Key match stats">
      <div className="key-stats-row key-stats-head" role="row">
        <span role="columnheader">Metric</span>
        <strong className="red" role="columnheader">{red.name}</strong>
        <strong className="blue" role="columnheader">{blue.name}</strong>
      </div>
      <DashboardStatRow label="Damage Taken" red={`${red.damageTaken}`} blue={`${blue.damageTaken}`} />
      <DashboardStatRow label="Weapon Hits" red={`${red.hitCount}`} blue={`${blue.hitCount}`} />
      <DashboardStatRow label="Health Left" red={red.healthLabel} blue={blue.healthLabel} />
      <DashboardStatRow label="Record" red={`${red.wins}-${red.losses}`} blue={`${blue.wins}-${blue.losses}`} />
      <DashboardStatRow label="Replay Events" red={`${replayEvents}`} blue={`${replayEvents}`} />
    </div>
  )
}

function DashboardStatRow({
  blue,
  label,
  red,
}: {
  blue: string
  label: string
  red: string
}) {
  return (
    <div className="key-stats-row" role="row">
      <span role="rowheader">{label}</span>
      <strong className="red" role="cell">{red}</strong>
      <strong className="blue" role="cell">{blue}</strong>
    </div>
  )
}

export function RoundSummaryDashboard({
  publicSession,
  replayPayload,
}: {
  publicSession: PublicSessionState | null
  replayPayload: ReplayPayload | null
}) {
  const red = getTeamDashboardData('red', publicSession, replayPayload)
  const blue = getTeamDashboardData('blue', publicSession, replayPayload)
  const result = publicSession?.lastResult

  return (
    <div className="round-summary-dashboard">
      <div className="dashboard-panel-tabs" aria-label="Round summary view">
        <span className="is-active">Round Summary</span>
        <span>Event Log</span>
      </div>
      <div className="round-summary-table">
        <DashboardStatRow label="Damage Taken" red={`${red.damageTaken}`} blue={`${blue.damageTaken}`} />
        <DashboardStatRow label="Effective Hits" red={`${red.hitCount}`} blue={`${blue.hitCount}`} />
        <DashboardStatRow label="Health Left" red={red.healthLabel} blue={blue.healthLabel} />
        <DashboardStatRow
          label="Submitted"
          red={red.submitted ? 'Yes' : 'No'}
          blue={blue.submitted ? 'Yes' : 'No'}
        />
        <DashboardStatRow
          label="Round Winner"
          red={result?.winner === 'red' ? 'Winner' : '-'}
          blue={result?.winner === 'blue' ? 'Winner' : '-'}
        />
      </div>
      <p>{result?.reason ?? 'Round outcome appears after combat resolves.'}</p>
    </div>
  )
}

export function SectionHeader({
  kicker,
  title,
  aside,
}: {
  kicker: string
  title: string
  aside?: string
}) {
  return (
    <SectionHeading
      aside={aside}
      className="section-header"
      kicker={kicker}
      title={title}
    />
  )
}

export function PublicChatLog({
  messages,
  emptyText,
}: {
  messages: PublicSessionState['chatLog']
  emptyText: string
}) {
  if (messages.length === 0) {
    return <p className="referee-empty">{emptyText}</p>
  }

  return (
    <ol className="chat-log">
      {messages.map((message) => (
        <li className={`chat-message ${message.role}`} key={message.id}>
          <div className="chat-message-header">
            <span className={`role-chip ${message.role}`}>{capitalize(message.role)}</span>
            <strong>{formatLabel(message.kind)}</strong>
            <time dateTime={message.at}>{formatClockTime(message.at)}</time>
          </div>
          <p>{message.message}</p>
          <small>
            Round {message.round} / {formatLabel(message.phase)}
            {message.agentName ? ` / ${message.agentName}` : ''}
          </small>
        </li>
      ))}
    </ol>
  )
}

type TeamDashboardData = {
  claimed: boolean
  damageTaken: number
  healthLabel: string
  healthPercent: number
  hitCount: number
  losses: number
  name: string
  role: TeamRole
  submitted: boolean
  wins: number
}

function getTeamDashboardData(
  role: TeamRole,
  publicSession: PublicSessionState | null,
  replayPayload: ReplayPayload | null,
): TeamDashboardData {
  const roleState = publicSession?.roles[role]
  const damageTaken = publicSession?.lastResult?.damage[role] ?? 0
  const remainingHealth = publicSession?.lastResult?.remainingHealth[role]
  const maxHealth = remainingHealth === undefined ? 100 : Math.max(remainingHealth + damageTaken, 1)
  const healthPercent = remainingHealth === undefined
    ? (roleState?.submitted ? 100 : 0)
    : Math.round((remainingHealth / maxHealth) * 100)

  return {
    claimed: roleState?.claimed ?? false,
    damageTaken,
    healthLabel: remainingHealth === undefined ? 'Pending' : `${Math.max(remainingHealth, 0)}`,
    healthPercent,
    hitCount: countImpactEvents(replayPayload?.timeline.events ?? [], role),
    losses: roleState?.losses ?? 0,
    name: replayPayload?.botBlueprints[role]?.name?.trim() || teamName(role),
    role,
    submitted: roleState?.submitted ?? false,
    wins: roleState?.wins ?? 0,
  }
}

function teamName(role: TeamRole): string {
  return `${capitalize(role)} Team`
}

function formatDecision(publicSession: PublicSessionState | null): string {
  const result = publicSession?.lastResult

  if (!publicSession) {
    return 'Create or load a session'
  }

  if (!result) {
    return formatLabel(publicSession.phase)
  }

  if (result.winner === 'draw') {
    return 'Draw'
  }

  return `${capitalize(result.winner)} wins`
}

function formatReplayClock(replayPayload: ReplayPayload | null): string {
  return replayPayload ? formatDurationSeconds(replayPayload.timeline.duration) : '--'
}

function formatCountdown(remainingMs: number): string {
  const totalSeconds = Math.ceil(remainingMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function getWinsRequired(maxRounds: number | undefined): number {
  if (!maxRounds || maxRounds < 1) {
    return 3
  }

  return Math.max(1, Math.floor(maxRounds / 2) + 1)
}

function countImpactEvents(events: ReplayEvent[], role: TeamRole): number {
  return events.filter((event) => event.type === 'impact' && event.attacker === role).length
}
