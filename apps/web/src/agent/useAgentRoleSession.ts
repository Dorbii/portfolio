import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  AgentBootstrapResponse,
  PublicSessionState,
  RoleClaimResponse,
  RolePrivateState,
  TeamIdentity,
} from '../../../../packages/schemas/src/index.js'
import {
  AgentArenaApiError,
  AgentArenaClient,
  createSafeAgentHash,
  clearStoredRoleToken,
  readStoredRoleToken,
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
import { capitalize, formatLabel } from '../shared/format'

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
      if (!roleTokenRef.current && !invite.claimToken && !invite.observerToken) {
        setLastError({
          title: 'No player key',
          message: 'Open an agent handoff or cockpit observer URL before loading state.',
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
    [client, invite.claimToken, invite.observerToken],
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
    setNotice(null)

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

      setRoleState(bootstrap.state)
      setPublicState(bootstrap.publicState)
      setStatus('ready')
      setNotice(
        `${capitalize(invite.role)} role connected. Next action: ${formatLabel(bootstrap.nextAction)}.`,
      )
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
  }, [client, invite])

  const waitForNextAction = useCallback(async (
    options?: AgentWaitOptions,
  ): Promise<AgentBootstrapResponse> => {
    setStatus('loading')
    setLastError(null)

    try {
      const bootstrap = await client.waitForNextAction(options)

      if (invite.claimToken) {
        writeStoredRoleToken(window.sessionStorage, invite, invite.claimToken)
        roleTokenRef.current = invite.claimToken
        setRoleToken(invite.claimToken)
      }

      setRoleState(bootstrap.state)
      setPublicState(bootstrap.publicState)
      setNotice(`Next action: ${formatLabel(bootstrap.nextAction)}.`)

      return bootstrap
    } catch (error) {
      setLastError(toUiError(error, 'Continuation wait failed'))
      throw error
    } finally {
      setStatus('ready')
    }
  }, [client, invite])

  const waitForStateChange = useCallback(async (
    previousStateVersion?: string,
    options?: AgentWaitOptions,
  ): Promise<RolePrivateState> => {
    setStatus('loading')
    setLastError(null)

    try {
      const state = await client.waitForStateChange(previousStateVersion, options)

      setRoleState(state)

      return state
    } catch (error) {
      setLastError(toUiError(error, 'Continuation wait failed'))
      throw error
    } finally {
      setStatus('ready')
    }
  }, [client])

  const waitForPhase = useCallback(async (
    phase: RolePrivateState['phase'],
    options?: AgentWaitOptions,
  ): Promise<RolePrivateState> => {
    setStatus('loading')
    setLastError(null)

    try {
      const state = await client.waitForPhase(phase, options)

      setRoleState(state)

      return state
    } catch (error) {
      setLastError(toUiError(error, 'Continuation wait failed'))
      throw error
    } finally {
      setStatus('ready')
    }
  }, [client])

  const waitForNextSubmissionWindow = useCallback(async (
    options?: AgentWaitOptions,
  ): Promise<RolePrivateState> => {
    setStatus('loading')
    setLastError(null)

    try {
      const state = await client.waitForNextSubmissionWindow(options)

      setRoleState(state)
      setNotice('Next submission window is open.')

      return state
    } catch (error) {
      setLastError(toUiError(error, 'Continuation wait failed'))
      throw error
    } finally {
      setStatus('ready')
    }
  }, [client])

  const claimRole = useCallback(async (
    input: { agentName?: string; teamIdentity?: TeamIdentity; throwOnError?: boolean } = {},
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
      const submittedAgentName = input.agentName?.trim() ?? ''
      const claim = await client.claimRole({
        claimToken: invite.claimToken,
        agentName: submittedAgentName,
        teamIdentity: input.teamIdentity,
      })

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
  }, [client, invite])

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
        waitForNextAction,
        waitForNextSubmissionWindow,
        waitForPhase,
        waitForStateChange,
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
      },
      setCurrentState: setRoleState,
      setRoleToken: (token) => {
        roleTokenRef.current = token
        setRoleToken(token)
      },
      storage: window.sessionStorage,
    })
  }, [
    claimRole,
    client,
    connectRole,
    invite,
    waitForNextAction,
    waitForNextSubmissionWindow,
    waitForPhase,
    waitForStateChange,
  ])

  const clearRoleToken = useCallback(() => {
    clearStoredRoleToken(window.sessionStorage, invite)
    roleTokenRef.current = invite.observerToken
    setRoleToken(invite.observerToken ?? '')
    setRoleState(null)
    setPublicState(null)
    setLastError(null)
    setNotice(
      invite.observerToken
        ? 'Stored player key removed. Observer access remains loaded from this URL.'
        : 'Stored player key removed.',
    )
  }, [invite])

  return {
    claimRole,
    connectRole,
    clearRoleToken,
    client,
    lastError,
    loadState,
    notice,
    publicState,
    roleState,
    roleToken,
    setLastError,
    setNotice,
    setPublicState,
    setRoleState,
    setStatus,
    status,
  }
}
