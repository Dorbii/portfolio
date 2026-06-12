import {
  Panel,
} from '../shared/ui'
import {
  AgentChatLog,
  SectionTitle,
} from './AgentCockpitPanels'
import type { useLiveAgentCockpitController } from './useLiveAgentCockpitController'

type AgentCockpitController = ReturnType<typeof useLiveAgentCockpitController>

export function AgentCockpitSidebar({
  controller,
}: {
  controller: AgentCockpitController
}) {
  const showComms = controller.roleHasChatLog || controller.roleHasPrivateChatLog
  if (!showComms) {
    return null
  }

  return (
    <aside className="cockpit-secondary-stack" aria-label="Secondary cockpit data">
      <AgentCommsPanel controller={controller} />
    </aside>
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
