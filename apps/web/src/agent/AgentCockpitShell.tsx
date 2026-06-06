import type { AgentInvite } from '../shared/agentInvite.js'
import { capitalize } from '../shared/format'
import {
  Button,
  Panel,
} from '../shared/ui'
import { JsonScriptPanel, SectionTitle } from './AgentCockpitPanels'
import type { AgentCockpitWorkflow } from './agentCockpitViewState'
import type { useLiveAgentCockpitController } from './useLiveAgentCockpitController'

type AgentCockpitController = ReturnType<typeof useLiveAgentCockpitController>

export function AgentCockpitHeader({
  controller,
  invite,
}: {
  controller: AgentCockpitController
  invite: AgentInvite
}) {
  const isObserverCockpit = Boolean(invite.observerToken && !invite.claimToken)

  return (
    <header className="agent-live-header agent-command-header">
      <div className="agent-title-block">
        <span className="eyebrow">Agent Arena</span>
        <h1>{capitalize(invite.role)} Agent Cockpit</h1>
      </div>
      <div className="agent-command-actions">
        {!isObserverCockpit ? (
          <Button
            type="button"
            variant="primary"
            onClick={() => void controller.connectRole({ agentName: `${invite.role}-agent` })}
            disabled={!controller.canClaimRole}
          >
            {controller.claimButtonLabel}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          onClick={() => void controller.loadState()}
          disabled={!controller.hasPlayerKey || controller.isBusy}
        >
          {controller.refreshButtonLabel}
        </Button>
        <Button
          type="button"
          variant="danger"
          onClick={() => void controller.clearRoleToken()}
          disabled={!controller.roleToken || controller.isBusy}
        >
          {controller.canMutateRole ? 'Clear player key' : 'Clear stored key'}
        </Button>
        <a className="agent-spec-link" href={`${invite.apiBase}/agent-spec.json`}>agent-spec.json</a>
      </div>
    </header>
  )
}
export function AgentTaskPanel({
  notice,
  workflow,
}: {
  notice: string | null
  workflow: AgentCockpitWorkflow
}) {
  return (
    <Panel className={`agent-live-panel agent-task-panel active-${workflow.activeTask}`} aria-labelledby="next-task-heading">
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
    </Panel>
  )
}

export function AgentCockpitScripts({
  externalAgentBriefScript,
  stateScript,
}: {
  externalAgentBriefScript: string
  stateScript: string
}) {
  return (
    <>
      <JsonScriptPanel id="agent-arena-state" json={stateScript} />
      <JsonScriptPanel id="agent-arena-brief" json={externalAgentBriefScript} />
    </>
  )
}
