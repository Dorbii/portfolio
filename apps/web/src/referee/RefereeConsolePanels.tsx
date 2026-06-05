import { useMemo } from 'react'
import type {
  PublicSessionState,
  RolePublicState,
  TeamRole,
} from '../../../../packages/schemas/src/index.js'
import type { ReplayEvent } from '../../../../packages/replay/src/index.js'
import {
  capitalize,
  formatClockTime,
  formatDurationSeconds,
  formatLabel,
} from '../shared/format'
import { Button } from '../shared/Button'
import type { ReplayPayload } from './refereeClient'
import { getInvitePanelMode } from './refereeInvitePanelState'

export function TeamScoreCard({
  role,
  roleState,
  winner,
}: {
  role: TeamRole
  roleState?: RolePublicState
  winner?: TeamRole | 'draw'
}) {
  const isWinner = winner === role

  return (
    <div className={`score-team ${role} ${isWinner ? 'winner' : ''}`}>
      <span>{teamName(role)}</span>
      <strong>{roleState?.wins ?? 0}</strong>
      <small>{roleStatus(roleState)}</small>
    </div>
  )
}

export function TeamRecordCard({
  role,
  roleState,
}: {
  role: TeamRole
  roleState: RolePublicState
}) {
  return (
    <article className={`team-record-card ${role}`}>
      <h3>{teamName(role)}</h3>
      <dl>
        <div>
          <dt>Wins</dt>
          <dd>{roleState.wins ?? 0}</dd>
        </div>
        <div>
          <dt>Losses</dt>
          <dd>{roleState.losses ?? 0}</dd>
        </div>
        <div>
          <dt>Streak</dt>
          <dd>{roleState.winStreak ?? 0}</dd>
        </div>
        <div>
          <dt>State</dt>
          <dd>{roleStatus(roleState)}</dd>
        </div>
      </dl>
    </article>
  )
}

export function ReplayOutcome({
  publicSession,
  replayPayload,
}: {
  publicSession: PublicSessionState | null
  replayPayload: ReplayPayload | null
}) {
  const result = publicSession?.lastResult
  const keyEvents = useMemo(
    () => getOutcomeEvents(replayPayload?.timeline.events ?? []),
    [replayPayload],
  )

  return (
    <aside className="replay-outcome">
      <SectionHeader kicker="Combat outcome" title="Result" />
      {result ? (
        <>
          <dl className="status-list">
            <div>
              <dt>Winner</dt>
              <dd>{formatWinner(result.winner)}</dd>
            </div>
            <div>
              <dt>Reason</dt>
              <dd>{result.reason}</dd>
            </div>
            <div>
              <dt>Damage</dt>
              <dd>{`Red ${result.damage.red} / Blue ${result.damage.blue}`}</dd>
            </div>
            <div>
              <dt>Health</dt>
              <dd>{`Red ${result.remainingHealth.red} / Blue ${result.remainingHealth.blue}`}</dd>
            </div>
          </dl>
          <h3>Key events</h3>
          {keyEvents.length > 0 ? (
            <ol className="key-event-list">
              {keyEvents.map((event, index) => (
                <li key={`${event.t}-${event.type}-${index}`}>
                  <span>{formatDurationSeconds(event.t)}</span>
                  <p>{formatReplayEvent(event)}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="referee-empty">Replay events load with the replay payload.</p>
          )}
        </>
      ) : (
        <p className="referee-empty">No combat result yet.</p>
      )}
    </aside>
  )
}

export function PublicRoleStatus({ roles }: { roles: PublicSessionState['roles'] }) {
  const roleEntries = useMemo(
    () => Object.entries(roles) as [TeamRole, RolePublicState][],
    [roles],
  )

  return (
    <div className="role-status-list">
      {roleEntries.map(([role, roleState]) => (
        <dl className="status-list" key={role}>
          <div>
            <dt>{capitalize(role)} claimed</dt>
            <dd>{roleState.claimed ? 'Yes' : 'No'}</dd>
          </div>
          <div>
            <dt>{capitalize(role)} submitted</dt>
            <dd>{roleState.submitted ? 'Yes' : 'No'}</dd>
          </div>
        </dl>
      ))}
    </div>
  )
}

export function InvitePanel({
  role,
  hasInvite,
  inviteUrl,
  roleState,
  agentBrief,
  onCopyBrief,
  onOpen,
  onResetClaim,
  canResetClaim,
}: {
  role: TeamRole
  hasInvite: boolean
  inviteUrl: string
  roleState?: RolePublicState
  agentBrief: string
  onCopyBrief: () => Promise<void> | void
  onOpen: () => void
  onResetClaim: () => Promise<void> | void
  canResetClaim: boolean
}) {
  const panelMode = getInvitePanelMode({ hasInvite, roleState })

  if (panelMode === 'claimed') {
    return (
      <div className="invite-panel invite-panel-claimed">
        <p>
          <strong>{capitalize(role)} agent claimed.</strong>
          <span>Normal handoff actions hidden.</span>
        </p>
        <div className="invite-reset-actions">
          <Button
            type="button"
            variant="danger"
            onClick={onResetClaim}
            disabled={!canResetClaim}
            title="Available only before combat resolves."
          >
            Reset agent claim
          </Button>
        </div>
      </div>
    )
  }

  if (panelMode === 'unavailable') {
    return (
      <div className="invite-panel">
        <p className="referee-empty">{capitalize(role)} invite unavailable.</p>
        <div className="invite-reset-actions">
          <Button
            type="button"
            variant="danger"
            onClick={onResetClaim}
            disabled={!canResetClaim}
            title="Available only before combat resolves."
          >
            Reset agent claim
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="invite-panel">
      <p>{capitalize(role)} agent handoff</p>
      <div className="invite-links">
        <Button
          type="button"
          variant="primary"
          onClick={onOpen}
          disabled={!inviteUrl}
        >
          Open cockpit
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onCopyBrief}
          disabled={!agentBrief}
        >
          Copy handoff
        </Button>
      </div>
      <div className="invite-reset-actions">
        <Button
          type="button"
          variant="danger"
          onClick={onResetClaim}
          disabled={!canResetClaim}
          title="Available only before combat resolves."
        >
          Reset agent claim
        </Button>
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
    <div className="section-header">
      <div>
        <span>{kicker}</span>
        <h2>{title}</h2>
      </div>
      {aside ? <p>{aside}</p> : null}
    </div>
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

export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function teamName(role: TeamRole): string {
  return `${capitalize(role)} Team`
}

function roleStatus(roleState: RolePublicState | undefined): string {
  if (!roleState) {
    return 'Waiting'
  }

  if (roleState.submitted) {
    return 'Submitted'
  }

  if (roleState.claimed) {
    return 'Claimed'
  }

  return 'Open'
}

function getOutcomeEvents(events: ReplayEvent[]): ReplayEvent[] {
  return events
    .filter((event) =>
      event.type === 'impact' ||
      event.type === 'damage' ||
      event.type === 'hazard' ||
      event.type === 'knockout',
    )
    .slice(0, 8)
}

function formatWinner(winner: TeamRole | 'draw'): string {
  return winner === 'draw' ? 'Draw' : `${capitalize(winner)} wins`
}

function formatReplayEvent(event: ReplayEvent): string {
  if (event.type === 'weapon_fire') {
    return `${capitalize(event.bot)} fired ${event.weaponSlot}.`
  }

  if (event.type === 'impact') {
    return `${capitalize(event.attacker)} hit ${capitalize(event.defender)} for ${event.damage}.`
  }

  if (event.type === 'damage') {
    return `${capitalize(event.bot)} took ${event.amount}; ${event.remainingHealth} health remains.`
  }

  if (event.type === 'hazard') {
    return `${capitalize(event.bot)} took ${event.damage} from ${event.hazard}.`
  }

  if (event.type === 'knockout') {
    return `${capitalize(event.bot)} knocked out by ${event.cause}.`
  }

  return formatLabel(event.type)
}
