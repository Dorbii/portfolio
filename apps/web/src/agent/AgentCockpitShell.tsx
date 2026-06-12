import type { AgentInvite } from '../shared/agentInvite.js'
import { capitalize } from '../shared/format'
import { teamLogoInitials } from '../shared/teamVisuals'
import {
  Button,
} from '../shared/ui'
import { JsonScriptPanel } from './AgentCockpitPanels'
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
  const connectedIdentity = controller.roleState?.identity ?? null
  const connectedLogo = connectedIdentity ? teamLogoInitials(invite.role, connectedIdentity) : null

  return (
    <header className="agent-live-header agent-command-header">
      <div className="agent-title-block">
        <span className="eyebrow">Agent Arena</span>
        <h1>{connectedIdentity?.name ?? `${capitalize(invite.role)} Agent Cockpit`}</h1>
      </div>
      {!isObserverCockpit ? (
        connectedIdentity ? (
          <div className="agent-identity-lock" aria-label="Connected team identity">
            <span className="agent-identity-logo" aria-hidden="true">{connectedLogo}</span>
            <span>Team identity</span>
            <strong>{connectedIdentity.name}</strong>
            <small>{connectedIdentity.primaryColor}</small>
          </div>
        ) : (
          <div className="agent-identity-lock is-pending" aria-label="Agent-authored team identity pending">
            <span className="agent-identity-logo" aria-hidden="true">{capitalize(invite.role).slice(0, 1)}</span>
            <span>Team identity</span>
            <strong>Awaiting agent bootstrap</strong>
            <small>Agent-authored</small>
          </div>
        )
      ) : null}
      <div className="agent-command-actions">
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
export function AgentCockpitScripts({
  stateScript,
}: {
  stateScript: string
}) {
  return (
    <JsonScriptPanel id="agent-arena-state" json={stateScript} />
  )
}
