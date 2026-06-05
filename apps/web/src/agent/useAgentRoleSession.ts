import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  PublicSessionState,
  RoleClaimResponse,
  RolePrivateState,
} from '../../../../packages/schemas/src/index.js'
import {
  AgentArenaApiError,
  AgentArenaClient,
  createAgentArenaRoleApi,
  createSafeAgentHash,
  clearStoredRoleToken,
  readStoredRoleToken,
  writeStoredRoleToken,
  type AgentInvite,
} from './agentClient'
import type { UiError } from './AgentCockpitPanels'
import {
  isTerminalPhase,
  toUiError,
  type LoadStatus,
} from './agentCockpitViewState'
import { capitalize } from '../shared/format'

export const ROLE_STATE_POLL_MS = 4_000

const autoClaimAttempts = new Set<string>()

export function useAgentRoleSession(invite: AgentInvite) {
  const [roleToken, setRoleToken] = useState(() => readStoredRoleToken(window.sessionStorage, invite) ?? '')
  const roleTokenRef = useRef(roleToken || undefined)
  const roleStateRef = useRef<RolePrivateState | null>(null)
  const [roleState, setRoleState] = useState<RolePrivateState | null>(null)
  const [publicState, setPublicState] = useState<PublicSessionState | null>(null)
  const [status, setStatus] = useState<LoadStatus>('idle')
  const [agentName, setAgentName] = useState('')
  const [lastError, setLastError] = useState<UiError | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const client = useMemo(
    () =>
      new AgentArenaClient({
        invite,
        getRoleToken: () => roleTokenRef.current,
      }),
    [invite],
  )

  useEffect(() => {
    roleTokenRef.current = roleToken || undefined
  }, [roleToken])

  useEffect(() => {
    roleStateRef.current = roleState
  }, [roleState])

  const loadState = useCallback(
    async (options: { quiet?: boolean } = {}) => {
      if (!roleTokenRef.current) {
        setLastError({
          title: 'No role token',
          message: 'Claim this role or reuse a stored token before loading state.',
        })
        return
      }

      if (!options.quiet) {
        setStatus('loading')
      }

      try {
        const [privateState, redactedState] = await Promise.all([
          client.getState(),
          client.getPublicState().catch(() => null),
        ])

        setRoleState(privateState)
        setPublicState(redactedState)
        setLastError(null)
      } catch (error) {
        setLastError(toUiError(error, 'State load failed'))
        setRoleState(null)
        setPublicState(null)
      } finally {
        setStatus('ready')
      }
    },
    [client],
  )

  useEffect(() => {
    if (roleToken) {
      void loadState()
    }
  }, [loadState, roleToken])

  useEffect(() => {
    if (!roleToken || isTerminalPhase(roleState?.phase)) {
      return
    }

    const intervalId = window.setInterval(() => {
      void loadState({ quiet: true })
    }, ROLE_STATE_POLL_MS)

    return () => window.clearInterval(intervalId)
  }, [loadState, roleState?.phase, roleToken])

  const claimRole = useCallback(async (
    input: { agentName?: string; throwOnError?: boolean } = {},
  ): Promise<RoleClaimResponse | null> => {
    if (!invite.claimToken) {
      const error = new AgentArenaApiError({
        status: 400,
        code: 'INVALID_TOKEN',
        message:
          'This invite can load a stored role token, but it cannot claim a new role.',
      })

      setLastError({
        title: 'Claim token missing',
        message: error.message,
        code: 'INVALID_INVITE',
      })

      if (input.throwOnError) {
        throw error
      }

      return null
    }

    setStatus('claiming')
    setLastError(null)
    setNotice(null)

    try {
      const submittedAgentName = input.agentName?.trim() ?? agentName
      const claim = await client.claimRole({
        claimToken: invite.claimToken,
        agentName: submittedAgentName,
      })

      if (submittedAgentName) {
        setAgentName(submittedAgentName)
      }

      writeStoredRoleToken(window.sessionStorage, invite, claim.roleToken)
      roleTokenRef.current = claim.roleToken
      setRoleToken(claim.roleToken)
      setRoleState(claim.state)
      setPublicState(await client.getPublicState().catch(() => null))
      setStatus('ready')
      setNotice(`${capitalize(invite.role)} role claimed.`)
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${window.location.search}${createSafeAgentHash(invite)}`,
      )
      return claim
    } catch (error) {
      setLastError(toUiError(error, 'Claim failed'))

      if (input.throwOnError) {
        throw error
      }

      return null
    } finally {
      setStatus('ready')
    }
  }, [agentName, client, invite])

  useEffect(() => {
    const api = createAgentArenaRoleApi(client, () => roleStateRef.current, {
      claimRole: async (input) => {
        const claim = await claimRole({
          ...input,
          throwOnError: true,
        })

        if (!claim) {
          throw new AgentArenaApiError({
            status: 409,
            message: 'Role claim did not complete.',
          })
        }

        return claim
      },
    })

    window.AgentArenaRole = api

    return () => {
      if (window.AgentArenaRole === api) {
        delete window.AgentArenaRole
      }
    }
  }, [claimRole, client])

  useEffect(() => {
    if (roleToken || !invite.claimToken) {
      return
    }

    const attemptKey = `${invite.apiBase}:${invite.sessionId}:${invite.role}:${invite.claimToken}`

    if (autoClaimAttempts.has(attemptKey)) {
      return
    }

    autoClaimAttempts.add(attemptKey)
    void claimRole()
  }, [claimRole, invite, roleToken])

  const clearRoleToken = useCallback(() => {
    clearStoredRoleToken(window.sessionStorage, invite)
    roleTokenRef.current = undefined
    setRoleToken('')
    setRoleState(null)
    setPublicState(null)
    setLastError(null)
    setNotice('Stored token removed. Claim this role again to continue.')
  }, [invite])

  return {
    agentName,
    claimRole,
    clearRoleToken,
    client,
    lastError,
    loadState,
    notice,
    publicState,
    roleState,
    roleToken,
    setAgentName,
    setLastError,
    setNotice,
    setPublicState,
    setRoleState,
    setStatus,
    status,
  }
}
