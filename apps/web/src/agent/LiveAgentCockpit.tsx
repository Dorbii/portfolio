import { useEffect, useState } from 'react'
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
import { RoundPlanWorkbench } from './RoundPlanWorkbench'
import { useLiveAgentCockpitController } from './useLiveAgentCockpitController'

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

  return (
    <main className="agent-live-app">
      <AgentCockpitHeader controller={cockpit} invite={invite} />

      <AgentTaskPanel notice={cockpit.notice} workflow={cockpit.workflow} />

      <div className="agent-cockpit-layout">
        <div className="cockpit-primary-column">
          <RoundPlanWorkbench
            canSubmitPlan={cockpit.canSubmitPlan}
            onSubmitRoundPlan={cockpit.submitRoundPlan}
            onSubmissionModeChange={cockpit.toggleSubmissionMode}
            role={invite.role}
            roleState={cockpit.roleState}
            hasLocalDraftEdits={cockpit.hasLocalDraftEdits}
            setSubmissionDraft={cockpit.setSubmissionDraft}
            setSubmissionText={cockpit.setSubmissionText}
            submissionDraft={cockpit.submissionDraft}
            submissionMode={cockpit.submissionMode}
            submissionText={cockpit.submissionText}
          />
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
