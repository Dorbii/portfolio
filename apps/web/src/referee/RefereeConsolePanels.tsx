import type { CSSProperties } from 'react'
import type {
  TeamRole,
} from '../../../../packages/schemas/src/index.js'
import type { PublicSessionState } from '../agent/agentSessionTypes.js'
import type { ReplayEvent } from '../../../../packages/replay/src/index.js'
import {
  capitalize,
  formatClockTime,
  formatDurationSeconds,
  formatLabel,
} from '../shared/format'
import {
  resolveTeamIdentity,
  teamAccentRgb,
} from '../shared/teamVisuals'
import {
  ActionGroup,
  Button,
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

export type SessionCompletionControl = {
  canContinue: boolean
  canQuit: boolean
  canSave: boolean
  completedFightCount: number
  isBusy: boolean
  onContinue: () => void
  onQuit: () => void
  onSave: () => void
}

export function MatchScoreboard({
  publicSession,
  replayPayload,
  roleHandoffs,
  sessionControl,
}: {
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
        publicSession={publicSession}
        replayPayload={replayPayload}
        role="red"
        handoff={roleHandoffs.red}
        winsRequired={winsRequired}
      />
      <div className="scoreboard-core">
        <span className="scoreboard-core-kicker">Session Control</span>
        <strong className="scoreboard-core-round">{publicSession ? `R${publicSession.round}` : '--'}</strong>
        <small className="scoreboard-core-state" title={sessionControl.activeSessionId || undefined}>
          {publicSession
            ? `${formatReplayClock(replayPayload)} / ${decision}`
            : sessionControl.activeSessionId || 'Create session'}
        </small>
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
          <a className="ui-button ui-button-ghost" href={partCatalogHref()}>
            Part Catalog
          </a>
        </ActionGroup>
      </div>
      <ScoreboardTeam
        publicSession={publicSession}
        replayPayload={replayPayload}
        role="blue"
        handoff={roleHandoffs.blue}
        winsRequired={winsRequired}
      />
    </header>
  )
}

export function SessionCompletionPanel({
  controls,
  publicSession,
}: {
  controls: SessionCompletionControl
  publicSession: PublicSessionState | null
}) {
  const continuation = publicSession?.continuation
  const winner = publicSession?.lastResult?.winner
  const winnerName =
    winner === 'red' || winner === 'blue'
      ? publicSession?.roles[winner]?.identity?.name
      : undefined
  const winnerLabel = winner === 'red' || winner === 'blue'
    ? `${capitalize(winner)} / ${winnerName || 'Unclaimed team'}`
    : publicSession?.lastResult?.winner === 'draw'
      ? 'Draw'
      : 'Pending'
  const debriefSummary = continuation?.sharedDebrief?.summary.trim() || 'Shared debrief appears after a completed fight debrief is available.'
  const debriefState = continuation?.sharedDebrief ? 'Ready' : 'Pending'
  const championRecord = continuation?.championRecord
    ? `${continuation.championRecord.wins}-${continuation.championRecord.losses} / Streak ${continuation.championRecord.consecutiveWins}`
    : 'Pending'
  const challengerBonus = continuation?.challengerBonusGold ?? 0
  const saveStatus = continuation?.quit
    ? 'Quit'
    : continuation?.continuedSessionId
      ? 'Continued'
      : continuation?.saved
        ? 'Saved'
        : 'Not saved'

  return (
    <div
      className="session-completion-panel"
      data-can-continue={controls.canContinue ? 'true' : 'false'}
      data-can-quit={controls.canQuit ? 'true' : 'false'}
      data-can-save={controls.canSave ? 'true' : 'false'}
      data-completed-fight-count={controls.completedFightCount}
      data-has-shared-debrief={continuation?.sharedDebrief ? 'true' : 'false'}
    >
      <div className="session-completion-grid">
        <CompletionFact label="Winner" value={winnerLabel} />
        <CompletionFact label="Completed Fights" value={`${controls.completedFightCount}`} />
        <CompletionFact label="Champion Record" value={championRecord} />
        <CompletionFact label="Challenger Bonus" value={`${challengerBonus}`} />
        <CompletionFact label="Save Status" value={saveStatus} />
        <CompletionFact label="Shared Debrief" value={debriefState} />
      </div>
      <p className="session-completion-debrief">{debriefSummary}</p>
      <ActionGroup className="session-completion-actions">
        <Button
          type="button"
          variant="secondary"
          disabled={!controls.canSave}
          onClick={controls.onSave}
        >
          {controls.isBusy ? 'Saving...' : 'Save'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={!controls.canContinue}
          onClick={controls.onContinue}
        >
          Continue
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={!controls.canQuit}
          onClick={controls.onQuit}
        >
          Quit
        </Button>
      </ActionGroup>
    </div>
  )
}

function CompletionFact({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="session-completion-fact">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function partCatalogHref(): string {
  return `/part-catalog${window.location.search}`
}

function ScoreboardTeam({
  handoff,
  publicSession,
  replayPayload,
  role,
  winsRequired,
}: {
  handoff: TeamBannerHandoff
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
    <section
      className={`scoreboard-team-block ${role} ${isWinner ? 'winner' : ''}`}
      style={getScoreboardAccentStyle(team.accentRgb)}
    >
      <div className="scoreboard-team-mark" aria-hidden="true" />
      <div className="scoreboard-team-main">
        <div className="scoreboard-team-copy">
          <strong>{team.name}</strong>
          <span>
            Win {team.wins} - {opponent.wins}
          </span>
        </div>
        <div className="scoreboard-team-status">
          <StatusBadge tone={team.claimed ? 'ok' : 'warning'}>
            {team.claimed ? 'Connected' : 'Not connected'}
          </StatusBadge>
          <StatusBadge tone={team.submitted ? 'ok' : 'neutral'}>
            {team.submitted ? 'Loadout locked' : 'Loadout pending'}
          </StatusBadge>
        </div>
        {handoff.hasInvite ? (
          <div className="scoreboard-handoff">
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
          </div>
        ) : null}
      </div>
      <div className="scoreboard-team-result">
        <div className="scoreboard-score">{team.wins}</div>
        <div className="scoreboard-pips" aria-label={`${capitalize(role)} round wins`}>
          {Array.from({ length: winsRequired }, (_, index) => (
            <span
              className={index < team.wins ? 'is-filled' : ''}
              key={`${role}-pip-${index}`}
            />
          ))}
        </div>
      </div>
    </section>
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

export function ArenaImpactDashboard({
  publicSession,
  replayPayload,
}: {
  publicSession: PublicSessionState | null
  replayPayload: ReplayPayload | null
}) {
  const impact = summarizeArenaImpact(publicSession, replayPayload)

  return (
    <div className="arena-impact-dashboard">
      <div className="arena-impact-table">
        <DashboardStatRow label="Hazard Damage Taken" red={`${impact.damage.red}`} blue={`${impact.damage.blue}`} />
        <DashboardStatRow label="Hazard Triggers" red={`${impact.triggers.red}`} blue={`${impact.triggers.blue}`} />
        <DashboardStatRow label="Damaging Hits" red={`${impact.damagingHits.red}`} blue={`${impact.damagingHits.blue}`} />
      </div>
      <div className="arena-impact-summary">
        <span>Active hazards</span>
        <strong>{impact.activeHazards}</strong>
        <p>{impact.summary}</p>
      </div>
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
        <ChatMessageItem message={message} key={message.id} />
      ))}
    </ol>
  )
}

function ChatMessageItem({ message }: { message: PublicSessionState['chatLog'][number] }) {
  const body = message.message.trim()

  return (
    <li className={`chat-message ${message.role}`}>
      <div className="chat-message-header">
        <span className={`role-chip ${message.role}`}>{capitalize(message.role)}</span>
        <strong>{formatLabel(message.kind)}</strong>
        <time dateTime={message.at}>{formatClockTime(message.at)}</time>
      </div>
      <p className={body ? undefined : 'is-empty'}>{body || 'No message body supplied.'}</p>
      <small>
        Round {message.round} / {formatLabel(message.phase)}
        {message.agentName ? ` / ${message.agentName}` : ''}
      </small>
    </li>
  )
}

type TeamDashboardData = {
  accentRgb: string
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
  const blueprint = replayPayload?.botBlueprints[role]
  const damageTaken = publicSession?.lastResult?.damage[role] ?? 0
  const remainingHealth = publicSession?.lastResult?.remainingHealth[role]
  const maxHealth = remainingHealth === undefined ? 100 : Math.max(remainingHealth + damageTaken, 1)
  const identity = roleState?.identity ?? replayPayload?.teamIdentities[role]
  const displayIdentity = resolveTeamIdentity(role, identity)
  const healthPercent = remainingHealth === undefined
    ? (roleState?.submitted ? 100 : 0)
    : Math.round((remainingHealth / maxHealth) * 100)

  return {
    accentRgb: teamAccentRgb(role, identity),
    claimed: roleState?.claimed ?? false,
    damageTaken,
    healthLabel: remainingHealth === undefined ? 'Pending' : `${Math.max(remainingHealth, 0)}`,
    healthPercent,
    hitCount: countImpactEvents(replayPayload?.timeline.events ?? [], role),
    losses: roleState?.losses ?? 0,
    name: identity?.name.trim() || blueprint?.name?.trim() || displayIdentity.name,
    role,
    submitted: roleState?.submitted ?? false,
    wins: roleState?.wins ?? 0,
  }
}

type ScoreboardAccentStyle = CSSProperties & {
  '--scoreboard-accent': string
}

function getScoreboardAccentStyle(accentRgb: string): ScoreboardAccentStyle {
  return { '--scoreboard-accent': accentRgb }
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

function getWinsRequired(maxRounds: number | undefined): number {
  if (!maxRounds || maxRounds < 1) {
    return 3
  }

  return Math.max(1, Math.floor(maxRounds / 2) + 1)
}

function countImpactEvents(events: ReplayEvent[], role: TeamRole): number {
  return events.filter((event) => event.type === 'impact' && event.attacker === role).length
}

function summarizeArenaImpact(
  publicSession: PublicSessionState | null,
  replayPayload: ReplayPayload | null,
) {
  const hazardEvents = replayPayload?.timeline.events.filter((event) => event.type === 'hazard') ?? []
  const damage = {
    red: sumHazardDamage(hazardEvents, 'red'),
    blue: sumHazardDamage(hazardEvents, 'blue'),
  }
  const triggers = {
    red: countHazardTriggers(hazardEvents, 'red'),
    blue: countHazardTriggers(hazardEvents, 'blue'),
  }
  const damagingHits = {
    red: countDamagingHazardHits(hazardEvents, 'red'),
    blue: countDamagingHazardHits(hazardEvents, 'blue'),
  }
  const totalDamage = damage.red + damage.blue
  const activeHazards = publicSession?.arena.activeHazards.join(', ') || 'No hazards loaded'
  const topHazard = mostDamagingHazard(hazardEvents)
  const summary = !replayPayload
    ? 'Arena impact appears after combat replay data resolves.'
    : totalDamage > 0 && topHazard
      ? `${formatLabel(topHazard.hazard)} dealt ${topHazard.damage} of ${totalDamage} total environment damage.`
      : hazardEvents.length > 0
        ? 'Arena hazards triggered, but no environment damage was applied.'
        : 'No arena hazard events have resolved this round.'

  return {
    activeHazards,
    damage,
    damagingHits,
    summary,
    triggers,
  }
}

function sumHazardDamage(events: Extract<ReplayEvent, { type: 'hazard' }>[], role: TeamRole): number {
  return events
    .filter((event) => event.bot === role)
    .reduce((total, event) => total + event.damage, 0)
}

function countHazardTriggers(events: Extract<ReplayEvent, { type: 'hazard' }>[], role: TeamRole): number {
  return events.filter((event) => event.bot === role).length
}

function countDamagingHazardHits(events: Extract<ReplayEvent, { type: 'hazard' }>[], role: TeamRole): number {
  return events.filter((event) => event.bot === role && event.damage > 0).length
}

function mostDamagingHazard(events: Extract<ReplayEvent, { type: 'hazard' }>[]) {
  const hazards = new Map<string, number>()

  for (const event of events) {
    hazards.set(event.hazard, (hazards.get(event.hazard) ?? 0) + event.damage)
  }

  return [...hazards.entries()]
    .map(([hazard, damage]) => ({ hazard, damage }))
    .sort((left, right) => right.damage - left.damage)[0]
}
