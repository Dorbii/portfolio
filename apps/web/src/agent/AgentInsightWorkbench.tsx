import type { TeamRole } from '../../../../packages/schemas/src/index.js'
import type { RolePrivateState } from './agentSessionTypes.js'
import { AgentInsightWorkbenchView } from './AgentInsightWorkbenchView'
import './AgentInsightWorkbench.css'

type AgentInsightWorkbenchProps = {
  role: TeamRole
  roleState: RolePrivateState | null
}

export function AgentInsightWorkbench(props: AgentInsightWorkbenchProps) {
  return <AgentInsightWorkbenchView {...props} />
}
