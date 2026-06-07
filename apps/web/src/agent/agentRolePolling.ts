import type { RolePrivateState } from './agentSessionTypes.js'
import { TERMINAL_PHASES } from './agentPhases.js'

export const ROLE_STATE_POLL_MS = 4_000

export type AgentRolePollingSnapshot = {
  claimToken?: string
  roleToken?: string
  phase?: RolePrivateState['phase']
}

export type LoadAgentRoleState = (options?: { quiet?: boolean }) => Promise<void>

export function shouldPollAgentRoleState({
  claimToken,
  phase,
  roleToken,
}: AgentRolePollingSnapshot): boolean {
  if (!roleToken && !claimToken) {
    return false
  }

  return phase ? !TERMINAL_PHASES.has(phase) : true
}

export function startAgentRoleStatePolling(
  loadState: LoadAgentRoleState,
  pollMs = ROLE_STATE_POLL_MS,
): () => void {
  const intervalId = window.setInterval(() => {
    void loadState({ quiet: true })
  }, pollMs)

  return () => window.clearInterval(intervalId)
}
