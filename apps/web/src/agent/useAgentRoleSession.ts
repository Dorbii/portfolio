import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  AgentConnectionResponse,
  AgentBootstrapResponse,
  CompactCombatPlanSubmission,
  TeamIdentity,
} from '../../../../packages/schemas/src/index.js'
import type {
  PublicSessionState,
  RolePrivateState,
} from './agentSessionTypes.js'
import {
  AgentArenaApiError,
  AgentArenaClient,
  createSafeAgentHash,
  clearStoredTeamIdentity,
  clearStoredRoleToken,
  readStoredTeamIdentity,
  readStoredRoleToken,
  writeStoredTeamIdentity,
  writeStoredRoleToken,
  type AgentInvite,
  type AgentWaitOptions,
} from './agentClient'
import type { UiError } from './AgentCockpitPanels'
import {
  toUiError,
  type LoadStatus,
} from './agentCockpitViewState'
import { installAgentArenaRoleApi } from './agentRoleApiInstaller'
import {
  shouldPollAgentRoleState,
  startAgentRoleStatePolling,
} from './agentRolePolling'

export function useAgentRoleSession(invite: AgentInvite) {
  const [roleToken, setRoleToken] = useState(() =>
    invite.claimToken
      ? readStoredRoleToken(window.sessionStorage, invite) ?? ''
      : invite.observerToken ?? readStoredRoleToken(window.sessionStorage, invite) ?? '',
  )
  const roleTokenRef = useRef(roleToken || undefined)
  const roleStateRef = useRef<RolePrivateState | null>(null)
  const [roleState, setRoleState] = useState<RolePrivateState | null>(null)
  const [publicState, setPublicState] = useState<PublicSessionState | null>(null)
  const [status, setStatus] = useState<LoadStatus>('idle')
  const [lastError, setLastError] = useState<UiError | null>(null)

  const client = useMemo(
    () =>
      new AgentArenaClient({
        invite,
        getRoleToken: () => roleTokenRef.current,
      }),
    [invite],
  )

  const rememberTeamIdentity = useCallback(
    (state: RolePrivateState, requestedIdentity?: TeamIdentity): RolePrivateState => {
      if (state.identity) {
        const storedIdentity = writeStoredTeamIdentity(window.sessionStorage, invite, state.identity)

        return {
          ...state,
          identity: storedIdentity,
        }
      }

      if (requestedIdentity) {
        const storedIdentity = writeStoredTeamIdentity(window.sessionStorage, invite, requestedIdentity)

        return {
          ...state,
          identity: storedIdentity,
        }
      }

      const storedIdentity = readStoredTeamIdentity(window.sessionStorage, invite)

      return storedIdentity
        ? {
            ...state,
            identity: storedIdentity,
          }
        : state
    },
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
      if (!roleTokenRef.current && !invite.claimToken && !invite.observerToken) {
        setLastError({
          title: 'No player key',
          message: 'Open an agent invite or cockpit observer URL before loading state.',
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

        setRoleState(rememberTeamIdentity(privateState))
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
    [client, invite.claimToken, invite.observerToken, rememberTeamIdentity],
  )

  useEffect(() => {
    if (roleToken) {
      void loadState()
    }
  }, [loadState, roleToken])

  useEffect(() => {
    if (!shouldPollAgentRoleState({
      claimToken: invite.claimToken,
      phase: roleState?.phase,
      roleToken,
    })) {
      return
    }

    return startAgentRoleStatePolling(loadState)
  }, [invite.claimToken, loadState, roleState?.phase, roleToken])

  const connectRole = useCallback(async (
    input: { agentName?: string; teamIdentity?: TeamIdentity; throwOnError?: boolean } = {},
  ): Promise<AgentBootstrapResponse | null> => {
    if (!invite.claimToken && !roleTokenRef.current) {
      const error = new AgentArenaApiError({
        status: 401,
        code: 'INVALID_TOKEN',
        message: 'Player key is missing. Use an invite with claimToken or a stored role token.',
      })

      setLastError({
        title: 'Player key missing',
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

    try {
      const submittedAgentName = input.agentName?.trim() ?? ''
      const bootstrap = await client.bootstrapRole({
        agentName: submittedAgentName,
        teamIdentity: input.teamIdentity,
      })

      if (invite.claimToken) {
        writeStoredRoleToken(window.sessionStorage, invite, invite.claimToken)
        roleTokenRef.current = invite.claimToken
        setRoleToken(invite.claimToken)
      }

      const [privateState, redactedState] = await Promise.all([
        client.getState(),
        client.getPublicState().catch(() => null),
      ])
      const roleStateWithIdentity = rememberTeamIdentity({
        ...privateState,
        agentPacket: privateState.agentPacket ?? bootstrap,
      }, input.teamIdentity)

      setRoleState(roleStateWithIdentity)
      setPublicState(redactedState)
      setStatus('ready')
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${window.location.search}${createSafeAgentHash(invite)}`,
      )
      return bootstrap
    } catch (error) {
      setLastError(toUiError(error, 'Role connection failed'))

      if (input.throwOnError) {
        throw error
      }

      return null
    } finally {
      setStatus('ready')
    }
  }, [client, invite, rememberTeamIdentity])

  const waitForAgentPacket = useCallback(async (
    options?: AgentWaitOptions,
  ): Promise<AgentBootstrapResponse> => {
    setStatus('loading')
    setLastError(null)

    try {
      const packet = await client.waitForAgentPacket(options)

      if (invite.claimToken) {
        writeStoredRoleToken(window.sessionStorage, invite, invite.claimToken)
        roleTokenRef.current = invite.claimToken
        setRoleToken(invite.claimToken)
      }

      const [privateState, redactedState] = await Promise.all([
        client.getState(),
        client.getPublicState().catch(() => null),
      ])
      const roleStateWithIdentity = rememberTeamIdentity({
        ...privateState,
        agentPacket: privateState.agentPacket ?? packet,
      })

      setRoleState(roleStateWithIdentity)
      setPublicState(redactedState)

      return packet
    } catch (error) {
      setLastError(toUiError(error, 'Continuation wait failed'))
      throw error
    } finally {
      setStatus('ready')
    }
  }, [client, invite, rememberTeamIdentity])

  const submitCombatPlan = useCallback(async (
    submission: CompactCombatPlanSubmission,
  ): Promise<AgentConnectionResponse<PublicSessionState>> => {
    setStatus('loading')
    setLastError(null)

    try {
      const response = await client.submitCombatPlan(submission)
      const [privateState, redactedState] = await Promise.all([
        client.getState(),
        client.getPublicState().catch(() => null),
      ])

      setRoleState(rememberTeamIdentity({
        ...privateState,
        agentPacket: privateState.agentPacket ?? response.packet,
      }))
      setPublicState(redactedState)

      return response
    } catch (error) {
      setLastError(toUiError(error, 'Combat plan submit failed'))
      throw error
    } finally {
      setStatus('ready')
    }
  }, [client, rememberTeamIdentity])

  useEffect(() => {
    return installAgentArenaRoleApi({
      client,
      getCurrentState: () => roleStateRef.current,
      invite,
      overrides: {
        bootstrapRole: async (input) => {
          const bootstrap = await connectRole({
            ...input,
            throwOnError: true,
          })

          if (!bootstrap) {
            throw new AgentArenaApiError({
              status: 409,
              message: 'Role bootstrap did not complete.',
            })
          }

          return bootstrap
        },
        waitForAgentPacket,
      },
      setCurrentState: (state) => {
        setRoleState(rememberTeamIdentity(state))
      },
      setRoleToken: (token) => {
        roleTokenRef.current = token
        setRoleToken(token)
      },
      storage: window.sessionStorage,
    })
  }, [
    client,
    connectRole,
    invite,
    rememberTeamIdentity,
    submitCombatPlan,
    waitForAgentPacket,
  ])

  const clearRoleToken = useCallback(() => {
    clearStoredRoleToken(window.sessionStorage, invite)
    clearStoredTeamIdentity(window.sessionStorage, invite)
    roleTokenRef.current = invite.observerToken
    setRoleToken(invite.observerToken ?? '')
    setRoleState(null)
    setPublicState(null)
    setLastError(null)
  }, [invite])

  return {
    connectRole,
    clearRoleToken,
    client,
    lastError,
    loadState,
    publicState,
    roleState,
    submitCombatPlan,
    roleToken,
    setLastError,
    setPublicState,
    setRoleState,
    setStatus,
    status,
  }
}
