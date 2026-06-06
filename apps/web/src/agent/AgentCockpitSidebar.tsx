import { PART_CATALOG } from '../../../../packages/catalog/src/index.js'
import type { AgentChatMessageKind } from '../../../../packages/schemas/src/index.js'
import type { AgentInvite } from '../shared/agentInvite.js'
import { capitalize, formatDateTime, formatLabel } from '../shared/format'
import {
  ActionGroup,
  Button,
  MetricGrid,
  Panel,
} from '../shared/ui'
import {
  ActivityLog,
  AgentChatLog,
  ConnectionGuide,
  ErrorPanel,
  Fact,
  InventoryTable,
  PartTable,
  SectionTitle,
} from './AgentCockpitPanels'
import {
  isTerminalPhase,
  opponentLabel,
  submissionNotice,
} from './agentCockpitViewState'
import type { useLiveAgentCockpitController } from './useLiveAgentCockpitController'

type AgentCockpitController = ReturnType<typeof useLiveAgentCockpitController>

export function AgentCockpitSidebar({
  controller,
  invite,
}: {
  controller: AgentCockpitController
  invite: AgentInvite
}) {
  return (
    <aside className="cockpit-secondary-stack" aria-label="Secondary cockpit data">
      <AgentStatePanel controller={controller} invite={invite} />
      <AgentReferencePanel controller={controller} invite={invite} />
      <AgentCommsPanel controller={controller} />
      <AgentActivityPanel controller={controller} />
    </aside>
  )
}
function AgentStatePanel({
  controller,
  invite,
}: {
  controller: AgentCockpitController
  invite: AgentInvite
}) {
  const {
    connectionGuidance,
    hasPlayerKey,
    isBusy,
    publicState,
    roleState,
    roleToken,
    status,
    workflow,
  } = controller

  return (
    <Panel className="agent-live-panel cockpit-secondary-panel" aria-labelledby="secondary-state-heading">
      <div className="secondary-panel-header">
        <SectionTitle id="secondary-state-heading" title="State" />
        <span>{workflow.stateLabel}</span>
      </div>

      <section aria-labelledby="connection-heading">
        <SectionTitle id="connection-heading" title="Connection" />
        <ConnectionGuide guidance={connectionGuidance} />
      </section>

      <section aria-labelledby="role-summary-heading">
        <SectionTitle id="role-summary-heading" title="Role summary" />
        <MetricGrid className="agent-facts">
          <Fact label="Session" value={invite.sessionId} />
          <Fact label="Role" value={capitalize(invite.role)} />
          <Fact label="API" value={invite.apiBase} />
          <Fact label="Claim token" value={invite.claimToken ? 'Present' : 'Not in fragment'} />
          <Fact
            label="Player key"
            value={
              roleToken
                ? 'Stored in this tab'
                : invite.claimToken
                  ? 'Available from invite'
                  : 'Missing'
            }
          />
          <Fact label="Status" value={formatLabel(status)} />
        </MetricGrid>
      </section>

      <section aria-labelledby="phase-heading">
        <SectionTitle id="phase-heading" title="Current phase" />
        {roleState ? (
          <MetricGrid className="agent-facts">
            <Fact label="Phase" value={formatLabel(roleState.phase)} />
            <Fact label="Round" value={String(roleState.round)} />
            <Fact label="Gold" value={String(roleState.gold)} />
            <Fact label="Submitted" value={roleState.submitted ? 'Yes' : 'No'} />
            <Fact label="State version" value={roleState.stateVersion} />
            <Fact label="Opponent" value={opponentLabel(roleState)} />
            <Fact label="Expires" value={formatDateTime(roleState.expiresAt)} />
          </MetricGrid>
        ) : (
          <p className="agent-empty">
            {isBusy
              ? 'Loading role state from the API.'
              : hasPlayerKey
                ? 'Player key loaded. Use Refresh state if the previous load failed.'
                : 'Connect this role or reuse a stored player key to load private state.'}
          </p>
        )}
        {roleState?.submitted ? (
          <p className="agent-waiting">{submissionNotice(roleState)}</p>
        ) : null}
      </section>

      <section aria-labelledby="opponent-heading">
        <SectionTitle id="opponent-heading" title="Opponent" />
        {roleState ? (
          <MetricGrid className="agent-facts">
            <Fact label="Role" value={capitalize(roleState.opponent.role)} />
            <Fact label="Claimed" value={roleState.opponent.claimed ? 'Yes' : 'No'} />
            <Fact label="Submitted" value={roleState.opponent.submitted ? 'Yes' : 'No'} />
            <Fact label="Replay" value={roleState.replayAvailable ? 'Available' : 'Unavailable'} />
          </MetricGrid>
        ) : (
          <p className="agent-empty">Opponent state is available after role state loads.</p>
        )}
      </section>

      <section aria-labelledby="arena-heading">
        <SectionTitle id="arena-heading" title="Arena" />
        {publicState ? (
          <MetricGrid className="agent-facts">
            <Fact label="Name" value={publicState.arena.name} />
            <Fact label="Size" value={`${publicState.arena.width} x ${publicState.arena.height}`} />
            <Fact label="Hazards" value={publicState.arena.activeHazards.join(', ')} />
            <Fact label="Replay" value={publicState.replayAvailable ? 'Available' : 'Unavailable'} />
          </MetricGrid>
        ) : (
          <p className="agent-empty">Public arena state has not loaded.</p>
        )}
      </section>
    </Panel>
  )
}

function AgentReferencePanel({
  controller,
}: {
  controller: AgentCockpitController
  invite: AgentInvite
}) {
  const {
    copyExternalAgentBrief,
    externalAgentBriefMarkdown,
    roleState,
  } = controller

  return (
    <Panel className="agent-live-panel cockpit-secondary-panel" aria-labelledby="reference-heading">
      <div className="secondary-panel-header">
        <SectionTitle id="reference-heading" title="Reference" />
        <span>Brief / shop / inventory</span>
      </div>

      <section className="agent-handoff-panel" aria-labelledby="handoff-heading">
        <div className="plan-section-header">
          <SectionTitle id="handoff-heading" title="External agent brief" />
          <Button
            type="button"
            variant="ghost"
            onClick={() => void copyExternalAgentBrief()}
          >
            Copy brief
          </Button>
        </div>
        <textarea
          className="agent-brief-text"
          spellCheck={false}
          readOnly
          value={externalAgentBriefMarkdown}
          aria-label="External agent brief"
        />
      </section>

      <section aria-labelledby="inventory-heading">
        <SectionTitle id="inventory-heading" title="Inventory" />
        <div className="cockpit-secondary-scroll">
          <InventoryTable state={roleState} />
        </div>
      </section>

      <section aria-labelledby="shop-heading">
        <SectionTitle id="shop-heading" title="Shop offers" />
        <div className="cockpit-secondary-scroll">
          <PartTable parts={PART_CATALOG.slice(0, 20)} />
        </div>
      </section>
    </Panel>
  )
}

function AgentCommsPanel({ controller }: { controller: AgentCockpitController }) {
  const {
    canPostChat,
    canPostPrivateChat,
    chatKind,
    chatLog,
    chatMessage,
    chatStatus,
    privateChatKind,
    privateChatLog,
    privateChatMessage,
    privateChatStatus,
    roleHasChatLog,
    roleHasPrivateChatLog,
    roleState,
    setChatKind,
    setChatMessage,
    setPrivateChatKind,
    setPrivateChatMessage,
    submitChatMessage,
    submitPrivateChatMessage,
  } = controller

  return (
    <Panel className="agent-live-panel cockpit-secondary-panel chat-panel" aria-labelledby="comms-heading">
      <div className="secondary-panel-header">
        <SectionTitle id="comms-heading" title="Comms" />
        <span>{chatLog.length + privateChatLog.length} messages</span>
      </div>

      <AgentChatSection
        canPost={canPostPrivateChat}
        countLabel={`${privateChatLog.length} role-only`}
        emptyText="No journal entries loaded."
        formClassName="agent-chat-form private-chat-form"
        hasMessages={roleHasPrivateChatLog}
        id="private-chat"
        kind={privateChatKind}
        kindOptions={['strategy', 'reflection', 'observation', 'taunt']}
        message={privateChatMessage}
        messageLabel="Entry"
        messages={privateChatLog}
        onKindChange={setPrivateChatKind}
        onMessageChange={setPrivateChatMessage}
        onSubmit={submitPrivateChatMessage}
        placeholder="Private strategy summary: plan rationale, opponent read, post-round reflection, or next adjustment. No hidden chain-of-thought."
        sectionClassName="private-chat-panel"
        status={privateChatStatus}
        submitLabel="Save entry"
        submittingLabel="Saving..."
        title="Agent Journal"
        disabled={!roleState || isTerminalPhase(roleState.phase) || privateChatStatus === 'posting'}
      />

      <AgentChatSection
        canPost={canPostChat}
        countLabel={`${chatLog.length} public`}
        emptyText="No Table Talk loaded."
        formClassName="agent-chat-form"
        hasMessages={roleHasChatLog}
        id="chat"
        kind={chatKind}
        kindOptions={['reflection', 'strategy', 'observation', 'taunt']}
        message={chatMessage}
        messageLabel="Public message"
        messages={chatLog}
        onKindChange={setChatKind}
        onMessageChange={setChatMessage}
        onSubmit={submitChatMessage}
        placeholder="Opponent-visible Table Talk. Bluff, taunt, summarize strategy, or reflect without secrets."
        status={chatStatus}
        submitLabel="Post Table Talk"
        submittingLabel="Posting..."
        title="Table Talk"
        disabled={!roleState || isTerminalPhase(roleState.phase) || chatStatus === 'posting'}
      />
    </Panel>
  )
}

function AgentChatSection({
  canPost,
  countLabel,
  disabled,
  emptyText,
  formClassName,
  hasMessages,
  id,
  kind,
  kindOptions,
  message,
  messageLabel,
  messages,
  onKindChange,
  onMessageChange,
  onSubmit,
  placeholder,
  sectionClassName,
  status,
  submitLabel,
  submittingLabel,
  title,
}: {
  canPost: boolean
  countLabel: string
  disabled: boolean
  emptyText: string
  formClassName: string
  hasMessages: boolean
  id: string
  kind: AgentChatMessageKind
  kindOptions: AgentChatMessageKind[]
  message: string
  messageLabel: string
  messages: AgentCockpitController['chatLog']
  onKindChange: (kind: AgentChatMessageKind) => void
  onMessageChange: (message: string) => void
  onSubmit: () => Promise<void> | void
  placeholder: string
  sectionClassName?: string
  status: 'idle' | 'posting'
  submitLabel: string
  submittingLabel: string
  title: string
}) {
  return (
    <section className={sectionClassName} aria-labelledby={`${id}-heading`}>
      <div className="plan-section-header">
        <SectionTitle id={`${id}-heading`} title={title} />
        <span className="chat-count">{countLabel}</span>
      </div>
      <form
        className={formClassName}
        onSubmit={(event) => {
          event.preventDefault()
          void onSubmit()
        }}
      >
        <label>
          Kind
          <select
            value={kind}
            onChange={(event) => onKindChange(event.target.value as AgentChatMessageKind)}
            disabled={disabled}
          >
            {kindOptions.map((option) => (
              <option key={option} value={option}>
                {capitalize(option)}
              </option>
            ))}
          </select>
        </label>
        <label className="agent-chat-message-field">
          {messageLabel}
          <textarea
            maxLength={420}
            value={message}
            onChange={(event) => onMessageChange(event.target.value)}
            placeholder={placeholder}
            disabled={disabled}
          />
        </label>
        <ActionGroup className="agent-chat-actions">
          <span>{message.trim().length} / 420</span>
          <Button type="submit" variant="primary" disabled={!canPost}>
            {status === 'posting' ? submittingLabel : submitLabel}
          </Button>
        </ActionGroup>
      </form>
      <AgentChatLog messages={messages} />
      {!hasMessages ? <p className="agent-empty">{emptyText}</p> : null}
    </section>
  )
}

function AgentActivityPanel({ controller }: { controller: AgentCockpitController }) {
  const {
    lastError,
    matchLog,
    roleHasMatchLog,
  } = controller

  return (
    <Panel className="agent-live-panel cockpit-secondary-panel match-log-panel" aria-labelledby="activity-heading">
      <div className="secondary-panel-header">
        <SectionTitle id="activity-heading" title="Activity" />
        <span>{matchLog.length} events</span>
      </div>

      <section aria-labelledby="error-heading">
        <SectionTitle id="error-heading" title="Last validation error" />
        {lastError ? <ErrorPanel error={lastError} /> : <p className="agent-empty">No hard error from the last action.</p>}
      </section>

      <section aria-labelledby="match-log-heading">
        <SectionTitle id="match-log-heading" title="Match log" />
        <ActivityLog
          emptyText="No match events loaded."
          events={matchLog}
          hasEvents={roleHasMatchLog}
        />
      </section>
    </Panel>
  )
}
