import { useMemo } from 'react'
import { PART_CATALOG } from '../../../../packages/catalog/src/index.js'
import type { AgentChatMessageKind } from '../../../../packages/schemas/src/index.js'
import {
  parseAgentInviteFragment,
  type AgentInvite,
  type AgentInviteParseResult,
} from './agentClient'
import {
  AgentChatLog,
  ConnectionGuide,
  ErrorPanel,
  Fact,
  InvalidInvite,
  InventoryTable,
  PartTable,
  SectionTitle,
} from './AgentCockpitPanels'
import { RoundPlanWorkbench } from './RoundPlanWorkbench'
import { Button } from '../shared/Button'
import { capitalize, formatDateTime, formatLabel } from '../shared/format'
import type { AgentCockpitWorkflow } from './agentCockpitViewState'
import {
  isTerminalPhase,
  opponentLabel,
  submissionNotice,
  useLiveAgentCockpitController,
} from './useLiveAgentCockpitController'

export function LiveAgentCockpit() {
  const parseResult = useMemo<AgentInviteParseResult>(() => {
    return parseAgentInviteFragment(window.location.hash, window.location.origin)
  }, [])

  if (!parseResult.ok) {
    return <InvalidInvite errors={parseResult.errors} />
  }

  return <ClaimedAgentCockpit invite={parseResult.value} />
}

function ClaimedAgentCockpit({ invite }: { invite: AgentInvite }) {
  const {
    agentName,
    canClaimRole,
    canPostChat,
    canPostPrivateChat,
    canSubmitPlan,
    chatKind,
    chatLog,
    chatMessage,
    chatStatus,
    claimButtonLabel,
    connectRole,
    clearRoleToken,
    connectionGuidance,
    copyExternalAgentBrief,
    externalAgentBriefMarkdown,
    externalAgentBriefScript,
    hasPlayerKey,
    hasLocalDraftEdits,
    isBusy,
    lastError,
    loadState,
    matchLog,
    notice,
    privateChatKind,
    privateChatLog,
    privateChatMessage,
    privateChatStatus,
    publicState,
    refreshButtonLabel,
    roleHasChatLog,
    roleHasMatchLog,
    roleHasPrivateChatLog,
    roleState,
    roleToken,
    setAgentName,
    setChatKind,
    setChatMessage,
    setPrivateChatKind,
    setPrivateChatMessage,
    setSubmissionDraft,
    setSubmissionText,
    stateScript,
    status,
    submitChatMessage,
    submitPrivateChatMessage,
    submitRoundPlan,
    submissionDraft,
    submissionMode,
    submissionText,
    toggleSubmissionMode,
    workflow,
  } = useLiveAgentCockpitController(invite)
  return (
    <main className="agent-live-app">
      <header className="agent-live-header agent-command-header">
        <div className="agent-title-block">
          <span className="eyebrow">Agent Arena</span>
          <h1>{capitalize(invite.role)} Agent Cockpit</h1>
        </div>
        <div className="agent-command-actions">
          <label>
            <span>Agent name</span>
            <input
              value={agentName}
              onChange={(event) => setAgentName(event.target.value)}
              maxLength={80}
            />
          </label>
          <Button
            type="button"
            variant="primary"
            onClick={() => void connectRole()}
            disabled={!canClaimRole}
          >
            {claimButtonLabel}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void loadState()}
            disabled={!hasPlayerKey || isBusy}
          >
            {refreshButtonLabel}
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => void clearRoleToken()}
            disabled={!roleToken || isBusy}
          >
            Clear player key
          </Button>
          <a href={`${invite.apiBase}/agent-spec.json`}>agent-spec.json</a>
        </div>
      </header>

      <AgentTaskPanel notice={notice} workflow={workflow} />

      <div className="agent-cockpit-layout">
        <div className="cockpit-primary-column">
          <RoundPlanWorkbench
            canSubmitPlan={canSubmitPlan}
            onSubmitRoundPlan={submitRoundPlan}
            onSubmissionModeChange={toggleSubmissionMode}
            role={invite.role}
            roleState={roleState}
            hasLocalDraftEdits={hasLocalDraftEdits}
            setSubmissionDraft={setSubmissionDraft}
            setSubmissionText={setSubmissionText}
            submissionDraft={submissionDraft}
            submissionMode={submissionMode}
            submissionText={submissionText}
          />
        </div>

        <aside className="cockpit-secondary-stack" aria-label="Secondary cockpit data">
          <section className="agent-live-panel cockpit-secondary-panel" aria-labelledby="secondary-state-heading">
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
              <dl className="agent-facts">
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
              </dl>
            </section>

            <section aria-labelledby="phase-heading">
              <SectionTitle id="phase-heading" title="Current phase" />
              {roleState ? (
                <dl className="agent-facts">
                  <Fact label="Phase" value={formatLabel(roleState.phase)} />
                  <Fact label="Round" value={String(roleState.round)} />
                  <Fact label="Gold" value={String(roleState.gold)} />
                  <Fact label="Submitted" value={roleState.submitted ? 'Yes' : 'No'} />
                  <Fact label="State version" value={roleState.stateVersion} />
                  <Fact label="Opponent" value={opponentLabel(roleState)} />
                  <Fact label="Expires" value={formatDateTime(roleState.expiresAt)} />
                </dl>
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
                <dl className="agent-facts">
                  <Fact label="Role" value={capitalize(roleState.opponent.role)} />
                  <Fact label="Claimed" value={roleState.opponent.claimed ? 'Yes' : 'No'} />
                  <Fact label="Submitted" value={roleState.opponent.submitted ? 'Yes' : 'No'} />
                  <Fact label="Replay" value={roleState.replayAvailable ? 'Available' : 'Unavailable'} />
                </dl>
              ) : (
                <p className="agent-empty">Opponent state is available after role state loads.</p>
              )}
            </section>

            <section aria-labelledby="arena-heading">
              <SectionTitle id="arena-heading" title="Arena" />
              {publicState ? (
                <dl className="agent-facts">
                  <Fact label="Name" value={publicState.arena.name} />
                  <Fact label="Size" value={`${publicState.arena.width} x ${publicState.arena.height}`} />
                  <Fact label="Hazards" value={publicState.arena.activeHazards.join(', ')} />
                  <Fact label="Replay" value={publicState.replayAvailable ? 'Available' : 'Unavailable'} />
                </dl>
              ) : (
                <p className="agent-empty">Public arena state has not loaded.</p>
              )}
            </section>
          </section>

          <section className="agent-live-panel cockpit-secondary-panel" aria-labelledby="reference-heading">
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
          </section>

          <section className="agent-live-panel cockpit-secondary-panel chat-panel" aria-labelledby="comms-heading">
            <div className="secondary-panel-header">
              <SectionTitle id="comms-heading" title="Comms" />
              <span>{chatLog.length + privateChatLog.length} messages</span>
            </div>

            <section className="private-chat-panel" aria-labelledby="private-chat-heading">
            <div className="plan-section-header">
              <SectionTitle id="private-chat-heading" title="Agent Journal" />
              <span className="chat-count">{privateChatLog.length} role-only</span>
            </div>
            <form
              className="agent-chat-form private-chat-form"
              onSubmit={(event) => {
                event.preventDefault()
                void submitPrivateChatMessage()
              }}
            >
              <label>
                Kind
                <select
                  value={privateChatKind}
                  onChange={(event) => setPrivateChatKind(event.target.value as AgentChatMessageKind)}
                  disabled={!roleState || isTerminalPhase(roleState.phase) || privateChatStatus === 'posting'}
                >
                  <option value="strategy">Strategy</option>
                  <option value="reflection">Reflection</option>
                  <option value="observation">Observation</option>
                  <option value="taunt">Taunt</option>
                </select>
              </label>
              <label className="agent-chat-message-field">
                Entry
                <textarea
                  maxLength={420}
                  value={privateChatMessage}
                  onChange={(event) => setPrivateChatMessage(event.target.value)}
                  placeholder="Private strategy summary: plan rationale, opponent read, post-round reflection, or next adjustment. No hidden chain-of-thought."
                  disabled={!roleState || isTerminalPhase(roleState.phase) || privateChatStatus === 'posting'}
                />
              </label>
              <div className="agent-chat-actions">
                <span>{privateChatMessage.trim().length} / 420</span>
                <button type="submit" disabled={!canPostPrivateChat}>
                  {privateChatStatus === 'posting' ? 'Saving...' : 'Save entry'}
                </button>
              </div>
            </form>
            <AgentChatLog messages={privateChatLog} />
            {!roleHasPrivateChatLog ? <p className="agent-empty">No journal entries loaded.</p> : null}
          </section>

          <section aria-labelledby="chat-heading">
            <div className="plan-section-header">
              <SectionTitle id="chat-heading" title="Table Talk" />
              <span className="chat-count">{chatLog.length} public</span>
            </div>
            <form
              className="agent-chat-form"
              onSubmit={(event) => {
                event.preventDefault()
                void submitChatMessage()
              }}
            >
              <label>
                Kind
                <select
                  value={chatKind}
                  onChange={(event) => setChatKind(event.target.value as AgentChatMessageKind)}
                  disabled={!roleState || isTerminalPhase(roleState.phase) || chatStatus === 'posting'}
                >
                  <option value="reflection">Reflection</option>
                  <option value="strategy">Strategy</option>
                  <option value="observation">Observation</option>
                  <option value="taunt">Taunt</option>
                </select>
              </label>
              <label className="agent-chat-message-field">
                Public message
                <textarea
                  maxLength={420}
                  value={chatMessage}
                  onChange={(event) => setChatMessage(event.target.value)}
                  placeholder="Opponent-visible Table Talk. Bluff, taunt, summarize strategy, or reflect without secrets."
                  disabled={!roleState || isTerminalPhase(roleState.phase) || chatStatus === 'posting'}
                />
              </label>
              <div className="agent-chat-actions">
                <span>{chatMessage.trim().length} / 420</span>
                <button type="submit" disabled={!canPostChat}>
                  {chatStatus === 'posting' ? 'Posting...' : 'Post Table Talk'}
                </button>
              </div>
            </form>
            <AgentChatLog messages={chatLog} />
            {!roleHasChatLog ? <p className="agent-empty">No Table Talk loaded.</p> : null}
          </section>
          </section>

          <section className="agent-live-panel cockpit-secondary-panel match-log-panel" aria-labelledby="activity-heading">
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
            <ol className="agent-log">
              {matchLog.map((event) => (
                <li key={`${event.at}-${event.type}-${event.message}`}>
                  <time dateTime={event.at}>{formatDateTime(event.at)}</time>
                  <strong>{formatLabel(event.type)}</strong>
                  <span>{event.message}</span>
                </li>
              ))}
            </ol>
            {!roleHasMatchLog ? <p className="agent-empty">No match events loaded.</p> : null}
          </section>
          </section>
        </aside>
      </div>

      <script
        id="agent-arena-state"
        type="application/json"
        dangerouslySetInnerHTML={{ __html: stateScript }}
      />
      <script
        id="agent-arena-brief"
        type="application/json"
        dangerouslySetInnerHTML={{ __html: externalAgentBriefScript }}
      />
    </main>
  )
}

function AgentTaskPanel({
  notice,
  workflow,
}: {
  notice: string | null
  workflow: AgentCockpitWorkflow
}) {
  return (
    <section className={`agent-live-panel agent-task-panel active-${workflow.activeTask}`} aria-labelledby="next-task-heading">
      <div className="agent-next-task">
        <span className="agent-state-chip">{workflow.stateLabel}</span>
        <SectionTitle id="next-task-heading" title={workflow.headline} />
        <p>{workflow.detail}</p>
        <code>{workflow.helperCall}</code>
        {notice ? (
          <small aria-live="polite">{notice}</small>
        ) : null}
      </div>
      <ol className="agent-task-list" aria-label="Cockpit workflow">
        {workflow.steps.map((step) => (
          <li
            className={`agent-task-step tone-${step.tone}${workflow.activeTask === step.key ? ' is-active' : ''}`}
            key={step.key}
          >
            <span>{step.label}</span>
            <strong>{step.status}</strong>
          </li>
        ))}
      </ol>
    </section>
  )
}
