import {
  useMemo,
  useState,
} from 'react'
import {
  TEAM_LOGO_MARKS,
  type TeamIdentity,
  type TeamLogoMark,
} from '../../../../packages/schemas/src/index.js'
import type { AgentInvite } from '../shared/agentInvite.js'
import { capitalize } from '../shared/format'
import { DEFAULT_TEAM_IDENTITIES } from '../shared/teamVisuals'
import {
  Button,
  Panel,
} from '../shared/ui'
import { JsonScriptPanel, SectionTitle } from './AgentCockpitPanels'
import type { AgentCockpitWorkflow } from './agentCockpitViewState'
import type { useLiveAgentCockpitController } from './useLiveAgentCockpitController'

type AgentCockpitController = ReturnType<typeof useLiveAgentCockpitController>

const TEAM_COLOR_PATTERN = /^#[0-9a-f]{6}$/i

export function AgentCockpitHeader({
  controller,
  invite,
}: {
  controller: AgentCockpitController
  invite: AgentInvite
}) {
  const isObserverCockpit = Boolean(invite.observerToken && !invite.claimToken)
  const identitySeed = DEFAULT_TEAM_IDENTITIES[invite.role]
  const [agentName, setAgentName] = useState(`${invite.role}-agent`)
  const [teamName, setTeamName] = useState<string>(identitySeed.name)
  const [primaryColor, setPrimaryColor] = useState<string>(identitySeed.primaryColor)
  const [logoMark, setLogoMark] = useState<TeamLogoMark>('shield')
  const [logoInitials, setLogoInitials] = useState(capitalize(invite.role).slice(0, 1))
  const pendingTeamIdentity = useMemo(
    () => createPendingTeamIdentity({
      logoInitials,
      logoMark,
      primaryColor,
      teamName,
    }),
    [logoInitials, logoMark, primaryColor, teamName],
  )
  const connectedIdentity = controller.roleState?.identity ?? null
  const canSubmitIdentity = Boolean(pendingTeamIdentity)

  return (
    <header className="agent-live-header agent-command-header">
      <div className="agent-title-block">
        <span className="eyebrow">Agent Arena</span>
        <h1>{connectedIdentity?.name ?? `${capitalize(invite.role)} Agent Cockpit`}</h1>
      </div>
      {!isObserverCockpit ? (
        connectedIdentity ? (
          <div className="agent-identity-lock" aria-label="Connected team identity">
            <span>Team identity</span>
            <strong>{connectedIdentity.name}</strong>
            <small>{connectedIdentity.primaryColor}</small>
          </div>
        ) : (
          <div className="agent-identity-editor" aria-label="Team identity for first connect">
            <label>
              <span>Agent</span>
              <input
                value={agentName}
                onChange={(event) => setAgentName(event.target.value)}
                maxLength={80}
              />
            </label>
            <label>
              <span>Team</span>
              <input
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                maxLength={40}
              />
            </label>
            <label className="color-field">
              <span>Hex color</span>
              <input
                aria-label="Team color"
                type="color"
                value={TEAM_COLOR_PATTERN.test(primaryColor) ? primaryColor : identitySeed.primaryColor}
                onChange={(event) => setPrimaryColor(event.target.value)}
              />
            </label>
            <label>
              <span>Logo</span>
              <select
                value={logoMark}
                onChange={(event) => setLogoMark(event.target.value as TeamLogoMark)}
              >
                {TEAM_LOGO_MARKS.map((mark) => (
                  <option key={mark} value={mark}>
                    {capitalize(mark)}
                  </option>
                ))}
              </select>
            </label>
            <label className="initials-field">
              <span>Initials</span>
              <input
                value={logoInitials}
                onChange={(event) => setLogoInitials(event.target.value)}
                maxLength={4}
              />
            </label>
          </div>
        )
      ) : null}
      <div className="agent-command-actions">
        {!isObserverCockpit ? (
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              if (pendingTeamIdentity) {
                void controller.connectRole({
                  agentName,
                  teamIdentity: pendingTeamIdentity,
                })
              }
            }}
            disabled={!controller.canClaimRole || !canSubmitIdentity}
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

function createPendingTeamIdentity({
  logoInitials,
  logoMark,
  primaryColor,
  teamName,
}: {
  logoInitials: string
  logoMark: TeamLogoMark
  primaryColor: string
  teamName: string
}): TeamIdentity | null {
  const name = teamName.trim()
  const color = primaryColor.trim()
  const initials = logoInitials.trim().replace(/[^a-z0-9]/gi, '').slice(0, 4)

  if (!name || !TEAM_COLOR_PATTERN.test(color)) {
    return null
  }

  return {
    name,
    primaryColor: color,
    logo: {
      mark: logoMark,
      ...(initials ? { initials } : {}),
    },
  }
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
