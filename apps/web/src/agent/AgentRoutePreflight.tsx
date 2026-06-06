import { useEffect } from 'react'
import type {
  RolePrivateState,
} from '../../../../packages/schemas/src/index.js'
import {
  AgentArenaClient,
  parseAgentInviteFragment,
  readStoredRoleToken,
} from './agentClient'
import { installAgentArenaRoleApi } from './agentRoleApiInstaller'

export function AgentRoutePreflight() {
  useEffect(() => {
    const cleanup = installAgentRoutePreflight()

    return cleanup ?? undefined
  }, [])

  return null
}

function installAgentRoutePreflight(): (() => void) | null {
  const parseResult = parseAgentInviteFragment(window.location.hash, window.location.origin)

  if (!parseResult.ok) {
    return null
  }

  const invite = parseResult.value
  let playerKey = readStoredRoleToken(window.sessionStorage, invite)
  const client = new AgentArenaClient({
    invite,
    getRoleToken: () => playerKey,
  })
  let currentState: RolePrivateState | null = null

  return installAgentArenaRoleApi({
    client,
    getCurrentState: () => currentState,
    invite,
    setCurrentState: (state) => {
      currentState = state
    },
    setRoleToken: (token) => {
      playerKey = token
    },
    storage: window.sessionStorage,
  })
}
