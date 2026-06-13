import type { CSSProperties } from 'react'
import type {
  TeamRole,
} from '../../../../packages/schemas/src/index.js'
import type {
  RolePrivateState,
  SessionChatMessage,
} from '../agent/agentSessionTypes.js'
import { BotAssemblyScene } from '../agent/BotAssemblyScene'
import { formatLabel } from '../shared/format'
import {
  createTeamAccentCssVars,
  resolveTeamIdentity,
  teamAccentRgb,
} from '../shared/teamVisuals'
import type { RefereeObserverLifecycle } from './refereeObserverView'

type RefereeCockpitStripProps = {
  forceVisible?: boolean
  loadState: 'busy' | 'idle'
  placement?: 'page' | 'stage'
  observerView: Pick<RefereeObserverLifecycle, 'stage' | 'decisionText'>
  roleStates: Partial<Record<TeamRole, RolePrivateState>>
  stateError: string
}

type RefereeCockpitStripStyle = CSSProperties & {
  '--cockpit-left-team': string
  '--cockpit-right-team': string
}

// CODEX_INTENT: surface both agents' garage previews inside the referee fight view.
// CODEX_RISK: behavioral
// CODEX_CONFIDENCE: medium
// CODEX_REVIEW: pending
export function RefereeCockpitStrip({
  forceVisible = false,
  loadState,
  placement = 'page',
  observerView,
  roleStates,
  stateError,
}: RefereeCockpitStripProps) {
  const hasAnyState = Boolean(roleStates.red || roleStates.blue)
  const isLiveCombat = observerView.stage === 'live_combat'

  if (!forceVisible && !hasAnyState && loadState !== 'busy' && !stateError && isLiveCombat) {
    return null
  }

  return (
    <section
      className={`referee-cockpit-strip is-${placement}`}
      aria-labelledby="referee-cockpit-strip-heading"
      style={createStripAccentCssVars(roleStates)}
    >
      <div className="referee-cockpit-strip-header">
        <div>
          <span>Agent Cockpits</span>
          <h2 id="referee-cockpit-strip-heading">Garage</h2>
        </div>
        <p role={stateError ? 'alert' : undefined}>
          {resolveStripStatusCopy(observerView, loadState, stateError)}
        </p>
      </div>
      <div className="referee-cockpit-grid">
        <RefereeCockpitPanel
          role="red"
          roleState={roleStates.red}
        />
        <RefereeCockpitPanel
          role="blue"
          roleState={roleStates.blue}
        />
      </div>
    </section>
  )
}

function createStripAccentCssVars(
  roleStates: Partial<Record<TeamRole, RolePrivateState>>,
): RefereeCockpitStripStyle {
  return {
    '--cockpit-left-team': teamAccentRgb('red', roleStates.red?.identity),
    '--cockpit-right-team': teamAccentRgb('blue', roleStates.blue?.identity),
  }
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
    <aside className="arena-monologue-overlay" aria-label="Agent role-only decision notes">
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
    </article>
  )
}

function resolveStripStatusCopy(
  observerView: RefereeCockpitStripProps['observerView'],
  loadState: 'busy' | 'idle',
  stateError: string,
): string {
  if (stateError) {
    return stateError
  }

  if (loadState === 'busy') {
    return 'Loading observer state.'
  }

  if (observerView.stage === 'resolved_replay') {
    return `Replay complete: ${observerView.decisionText}`
  }

  if (observerView.stage === 'loadout_window') {
    return 'Waiting for loadout submission.'
  }

  if (observerView.stage === 'round_review') {
    return 'Round review phase.'
  }

  if (observerView.stage === 'session_complete') {
    return 'Session complete.'
  }

  return 'Live observer state.'
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
