import type { CSSProperties } from 'react'
import type {
  TeamRole,
} from '../../../../packages/schemas/src/index.js'
import type {
  CombatDecisionBrief,
  RolePrivateState,
  SessionChatMessage,
} from '../agent/agentSessionTypes.js'
import { BotAssemblyScene } from '../agent/BotAssemblyScene'
import { formatLabel } from '../shared/format'
import {
  createTeamAccentCssVars,
  resolveTeamIdentity,
} from '../shared/teamVisuals'

type RefereeCockpitStripProps = {
  loadState: 'busy' | 'idle'
  roleStates: Partial<Record<TeamRole, RolePrivateState>>
  stateError: string
}

// CODEX_INTENT: surface both agents' garage previews and combat decisions inside the referee fight view.
// CODEX_RISK: behavioral
// CODEX_CONFIDENCE: medium
// CODEX_REVIEW: pending
export function RefereeCockpitStrip({
  loadState,
  roleStates,
  stateError,
}: RefereeCockpitStripProps) {
  const hasAnyState = Boolean(roleStates.red || roleStates.blue)

  if (!hasAnyState && loadState !== 'busy' && !stateError) {
    return null
  }

  return (
    <section className="referee-cockpit-strip" aria-labelledby="referee-cockpit-strip-heading">
      <div className="referee-cockpit-strip-header">
        <div>
          <span>Agent Cockpits</span>
          <h2 id="referee-cockpit-strip-heading">Garage and Combat Decisions</h2>
        </div>
        {stateError ? <p role="alert">{stateError}</p> : <p>{loadState === 'busy' ? 'Loading observer state.' : 'Live observer state.'}</p>}
      </div>
      <div className="referee-cockpit-grid">
        <RefereeCockpitPanel role="red" roleState={roleStates.red} />
        <RefereeCockpitPanel role="blue" roleState={roleStates.blue} />
      </div>
    </section>
  )
}

export function RefereeArenaMonologueOverlay({
  roleStates,
}: {
  roleStates: Partial<Record<TeamRole, RolePrivateState>>
}) {
  const hasMessages = Boolean(roleStates.red?.privateChatLog.length || roleStates.blue?.privateChatLog.length)

  if (!hasMessages) {
    return null
  }

  return (
    <aside className="arena-monologue-overlay" aria-label="Agent inner monologues">
      <ArenaMonologueCard role="red" roleState={roleStates.red} />
      <ArenaMonologueCard role="blue" roleState={roleStates.blue} />
    </aside>
  )
}

function RefereeCockpitPanel({
  role,
  roleState,
}: {
  role: TeamRole
  roleState?: RolePrivateState
}) {
  const identity = resolveTeamIdentity(role, roleState?.identity)
  const loadout = roleState?.ownLoadout
  const decision = roleState?.combat?.decision

  return (
    <article
      className={`referee-cockpit-card ${role}`}
      style={createTeamAccentCssVars(role, identity) as CSSProperties}
    >
      <header className="referee-cockpit-card-header">
        <div>
          <span>{role}</span>
          <strong>{identity.name}</strong>
        </div>
        <small>{loadout?.machineDesign ? 'machine:v1' : loadout ? 'legacy' : 'waiting'}</small>
      </header>
      {loadout ? (
        <div className="referee-garage-preview">
          <BotAssemblyScene
            blueprint={loadout.blueprint}
            identity={identity}
            machineDesign={loadout.machineDesign}
            role={role}
            submitted={roleState?.submitted ?? false}
          />
        </div>
      ) : (
        <p className="referee-cockpit-empty">No confirmed loadout visible to the referee observer yet.</p>
      )}
      <section className="referee-decision-preview" aria-label={`${identity.name} combat decision`}>
        <h3>Combat Decision</h3>
        {decision ? <DecisionSummary decision={decision} /> : (
          <p className="referee-cockpit-empty">No open combat-turn decision packet yet.</p>
        )}
      </section>
    </article>
  )
}

function DecisionSummary({
  decision,
}: {
  decision: CombatDecisionBrief
}) {
  return (
    <div className="referee-decision-stack">
      <div className="referee-decision-facts">
        <Fact label="Turn" value={String(decision.tick)} />
        <Fact label="Range" value={`${formatLabel(decision.range.band)} / ${decision.range.distance.toFixed(2)}m`} />
        <Fact label="Self" value={`${Math.round(decision.health.selfPct ?? 0)}%`} />
        <Fact label="Opponent" value={`${Math.round(decision.health.opponentPct ?? 0)}%`} />
      </div>
      <div className="referee-readiness-row">
        <Readiness label="A" ready={decision.actionReadiness.weaponA.canFire} reason={decision.actionReadiness.weaponA.reason} />
        {decision.actionReadiness.weaponB ? (
          <Readiness label="B" ready={decision.actionReadiness.weaponB.canFire} reason={decision.actionReadiness.weaponB.reason} />
        ) : null}
        {decision.actionReadiness.utility ? (
          <Readiness label="U" ready={decision.actionReadiness.utility.canActivate} reason={decision.actionReadiness.utility.reason} />
        ) : null}
      </div>
    </div>
  )
}

function Fact({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function Readiness({
  label,
  ready,
  reason,
}: {
  label: string
  ready: boolean
  reason: string
}) {
  return (
    <div className={`referee-readiness ${ready ? 'is-ready' : 'is-hold'}`} title={reason}>
      <span>{label}</span>
      <strong>{ready ? 'Ready' : 'Hold'}</strong>
    </div>
  )
}

function ArenaMonologueCard({
  role,
  roleState,
}: {
  role: TeamRole
  roleState?: RolePrivateState
}) {
  const identity = resolveTeamIdentity(role, roleState?.identity)
  const messages = roleState?.privateChatLog ?? []
  const visibleMessages = messages.slice(-4)

  return (
    <section
      className={`arena-monologue-card ${role}`}
      style={createTeamAccentCssVars(role, identity) as CSSProperties}
    >
      <header>
        <span>{role}</span>
        <strong>{identity.name}</strong>
      </header>
      {visibleMessages.length > 0 ? (
        <ol>
          {visibleMessages.map((message) => (
            <li key={message.id}>
              <p>{message.message}</p>
              <small>
                {formatMessageMeta(message)}
              </small>
            </li>
          ))}
        </ol>
      ) : (
        <p>No private agent notes yet.</p>
      )}
    </section>
  )
}

function formatMessageMeta(message: SessionChatMessage): string {
  return `${formatLabel(message.kind)} / round ${message.round}`
}
