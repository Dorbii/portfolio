import { useCallback, useEffect, useState } from 'react'
import type {
  RolePrivateState,
  RoleInvite,
} from '../agent/agentSessionTypes.js'
import type {
  TeamRole,
} from '../../../../packages/schemas/src/index.js'
import {
  loadRoleState,
  POLL_INTERVAL_MS,
  toUserMessage,
} from './refereeClient'

type SessionLoadState = 'idle' | 'busy'

// CODEX_INTENT: keep the referee page populated with private observer cockpit state while combat/replay progresses.
// CODEX_RISK: behavioral
// CODEX_CONFIDENCE: medium
// CODEX_REVIEW: pending
export function useRefereeRoleStates({
  activeSessionId,
  apiBase,
  invites,
  stateVersion,
}: {
  activeSessionId: string
  apiBase: string
  invites: RoleInvite[]
  stateVersion: string | undefined
}) {
  const [roleLoadState, setRoleLoadState] = useState<SessionLoadState>('idle')
  const [roleStateError, setRoleStateError] = useState('')
  const [roleStates, setRoleStates] = useState<Partial<Record<TeamRole, RolePrivateState>>>({})

  const loadStates = useCallback(
    async (options: { silent?: boolean } = {}) => {
      if (!activeSessionId || invites.length === 0) {
        setRoleStates({})
        setRoleStateError('')
        setRoleLoadState('idle')
        return
      }

      if (!options.silent) {
        setRoleLoadState('busy')
      }
      setRoleStateError('')

      try {
        const nextStates: Partial<Record<TeamRole, RolePrivateState>> = {}

        await Promise.all(invites.map(async (invite) => {
          nextStates[invite.role] = await loadRoleState(apiBase, activeSessionId, invite.observerToken)
        }))
        setRoleStates(nextStates)
      } catch (error) {
        setRoleStateError(toUserMessage(error))
      } finally {
        if (!options.silent) {
          setRoleLoadState('idle')
        }
      }
    },
    [activeSessionId, apiBase, invites],
  )

  useEffect(() => {
    void loadStates()
  }, [loadStates, stateVersion])

  useEffect(() => {
    if (!activeSessionId || invites.length === 0) {
      return undefined
    }

    const id = window.setInterval(() => {
      if (document.visibilityState === 'hidden') {
        return
      }

      void loadStates({ silent: true })
    }, POLL_INTERVAL_MS)

    return () => {
      window.clearInterval(id)
    }
  }, [activeSessionId, invites.length, loadStates])

  return {
    roleLoadState,
    roleStateError,
    roleStates,
  }
}
