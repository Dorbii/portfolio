import {
  useEffect,
  useState,
  type CSSProperties,
} from 'react'
import {
  parseAgentInviteFragment,
  type AgentInvite,
  type AgentInviteParseResult,
} from './agentClient'
import { InvalidInvite } from './AgentCockpitPanels'
import {
  AgentCockpitHeader,
  AgentCockpitScripts,
  AgentTaskPanel,
} from './AgentCockpitShell'
import { AgentCockpitSidebar } from './AgentCockpitSidebar'
import { AgentInsightWorkbench } from './AgentInsightWorkbench'
import { useLiveAgentCockpitController } from './useLiveAgentCockpitController'
import {
  createTeamAccentCssVars,
  type TeamAccentCssVars,
} from '../shared/teamVisuals'

type AgentLiveAppStyle = CSSProperties & TeamAccentCssVars

export function LiveAgentCockpit() {
  const [parseResult, setParseResult] = useState<AgentInviteParseResult>(() =>
    parseAgentInviteFragment(window.location.hash, window.location.origin),
  )

  useEffect(() => {
    const updateInviteFromHash = () => {
      setParseResult(parseAgentInviteFragment(window.location.hash, window.location.origin))
    }

    window.addEventListener('hashchange', updateInviteFromHash)

    return () => {
      window.removeEventListener('hashchange', updateInviteFromHash)
    }
  }, [])

  if (!parseResult.ok) {
    return <InvalidInvite errors={parseResult.errors} />
  }

  return <ClaimedAgentCockpit invite={parseResult.value} key={`${parseResult.value.sessionId}:${parseResult.value.role}`} />
}

function ClaimedAgentCockpit({ invite }: { invite: AgentInvite }) {
  const cockpit = useLiveAgentCockpitController(invite)
  const teamStyle = createTeamAccentCssVars(invite.role, cockpit.roleState?.identity) as AgentLiveAppStyle

  return (
    <main className="agent-live-app" style={teamStyle}>
      <AgentCockpitHeader controller={cockpit} invite={invite} />

      <AgentTaskPanel notice={cockpit.notice} workflow={cockpit.workflow} />

      <div className="agent-cockpit-layout">
        <div className="cockpit-primary-column">
          <AgentInsightWorkbench role={invite.role} roleState={cockpit.roleState} />
        </div>

        <AgentCockpitSidebar controller={cockpit} invite={invite} />
      </div>

      <AgentCockpitScripts
        externalAgentBriefScript={cockpit.externalAgentBriefScript}
        stateScript={cockpit.stateScript}
      />
    </main>
  )
}
