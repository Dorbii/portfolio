import type { AgentInvite } from '../shared/agentInvite.js'
import { formatLabel } from '../shared/format'
import {
  Panel,
  StatusBadge,
} from '../shared/ui'
import {
  AgentChatLog,
  ConnectionGuide,
  SectionTitle,
} from './AgentCockpitPanels'
import {
  opponentLabel,
} from './agentCockpitViewState'
import type { useLiveAgentCockpitController } from './useLiveAgentCockpitController'

type AgentCockpitController = ReturnType<typeof useLiveAgentCockpitController>

export function AgentCockpitSidebar({
  controller,
}: {
  controller: AgentCockpitController
  invite: AgentInvite
}) {
  const showComms = controller.roleHasChatLog || controller.roleHasPrivateChatLog

  return (
    <aside className="cockpit-secondary-stack" aria-label="Secondary cockpit data">
      <AgentStatePanel controller={controller} />
      {showComms ? <AgentCommsPanel controller={controller} /> : null}
    </aside>
  )
}
function AgentStatePanel({
  controller,
}: {
  controller: AgentCockpitController
}) {
  const {
    connectionGuidance,
    isBusy,
    publicState,
    roleState,
    status,
    workflow,
  } = controller
  const phaseLabel = roleState ? formatLabel(roleState.phase) : isBusy ? 'Loading' : 'Not loaded'
  const planLabel = roleState?.submitted ? 'Confirmed' : 'Pending'
  const planDetail = roleState?.ownLoadout?.blueprint.name ?? (roleState ? 'No confirmed loadout' : 'Awaiting state')
  const opponentStatus = roleState
    ? roleState.opponent.submitted
      ? 'Confirmed'
      : roleState.opponent.claimed
        ? 'Connected'
        : 'Open'
    : 'Unknown'
  const arenaStatus = publicState
    ? publicState.arena.activeHazards.length > 0
      ? `${publicState.arena.activeHazards.length} active`
      : 'Clear'
    : 'Unknown'

  return (
    <Panel className="agent-live-panel cockpit-secondary-panel" aria-labelledby="secondary-state-heading">
      <div className="secondary-panel-header">
        <SectionTitle id="secondary-state-heading" title="State" />
        <span>{workflow.stateLabel}</span>
      </div>

      <section aria-labelledby="connection-heading">
        <SectionTitle id="connection-heading" title="Connection" />
        <ConnectionGuide guidance={connectionGuidance} compact />
      </section>

      <div className="cockpit-signal-grid" aria-label="Role state summary">
        <SignalCard
          label="Phase"
          tone={roleState ? 'ok' : 'warning'}
          value={phaseLabel}
          detail={roleState ? `Round ${roleState.round}` : formatLabel(status)}
        />
        <SignalCard
          label="Loadout"
          tone={roleState?.submitted ? 'ok' : 'warning'}
          value={planLabel}
          detail={planDetail}
        />
        <SignalCard
          label="Opponent"
          tone={roleState?.opponent.submitted ? 'ok' : 'neutral'}
          value={opponentStatus}
          detail={roleState ? opponentLabel(roleState) : 'Loads with state'}
        />
        <SignalCard
          label="Arena"
          tone={publicState ? 'ok' : 'neutral'}
          value={arenaStatus}
          detail={publicState ? publicState.arena.name : 'Public state pending'}
        />
      </div>
    </Panel>
  )
}

function SignalCard({
  detail,
  label,
  tone,
  value,
}: {
  detail: string
  label: string
  tone: 'neutral' | 'ok' | 'warning'
  value: string
}) {
  return (
    <div className="cockpit-signal-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <StatusBadge tone={tone}>{detail}</StatusBadge>
    </div>
  )
}

function AgentCommsPanel({ controller }: { controller: AgentCockpitController }) {
  const {
    chatLog,
    privateChatLog,
    roleHasChatLog,
    roleHasPrivateChatLog,
  } = controller

  return (
    <Panel className="agent-live-panel cockpit-secondary-panel chat-panel" aria-labelledby="comms-heading">
      <div className="secondary-panel-header">
        <SectionTitle id="comms-heading" title="Comms" />
        <span>{chatLog.length + privateChatLog.length} messages</span>
      </div>

      {roleHasPrivateChatLog ? (
        <ReadOnlyChatSection
          countLabel={`${privateChatLog.length} role-only`}
          id="private-chat"
          messages={privateChatLog}
          title="Private Reflection"
        />
      ) : null}
      {roleHasChatLog ? (
        <ReadOnlyChatSection
          countLabel={`${chatLog.length} public`}
          id="chat"
          messages={chatLog}
          title="Public Chat"
        />
      ) : null}
    </Panel>
  )
}

function ReadOnlyChatSection({
  countLabel,
  id,
  messages,
  title,
}: {
  countLabel: string
  id: string
  messages: AgentCockpitController['chatLog']
  title: string
}) {
  return (
    <section aria-labelledby={`${id}-heading`}>
      <div className="plan-section-header">
        <SectionTitle id={`${id}-heading`} title={title} />
        <span className="chat-count">{countLabel}</span>
      </div>
      <AgentChatLog messages={messages} />
    </section>
  )
}
