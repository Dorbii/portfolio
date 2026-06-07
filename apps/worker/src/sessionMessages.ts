import {
  cloneJson,
  safeText,
} from './sessionSupport.js'
import type {
  LegacyAgentChatMessagePostRequest,
  LegacyAgentPrivateChatMessagePostRequest,
  LegacySessionChatMessage,
  LegacySessionLogEvent,
} from './sessionLegacyContracts.js'
import type {
  StoredRoleState,
  StoredSessionState,
} from './sessionTypes.js'

export function appendSessionEvent(
  state: StoredSessionState,
  type: LegacySessionLogEvent['type'],
  message: string,
  at: string,
): void {
  state.eventLog.push({ at, type, message })
}

export function appendRoleChatMessages(
  state: StoredSessionState,
  role: StoredRoleState,
  requests: LegacyAgentChatMessagePostRequest[],
  at: string,
): LegacySessionChatMessage[] {
  const messages = requests.map((request, index) => {
    const message = safeText(request.message)!

    return {
      id: `${state.id}:chat:${state.chatLog.length + index + 1}`,
      at,
      round: state.round,
      phase: state.phase,
      role: role.role,
      ...(role.agentName ? { agentName: role.agentName } : {}),
      kind: request.kind ?? 'observation',
      message,
    }
  })

  state.chatLog.push(...messages)

  return cloneJson(messages)
}

export function appendPrivateRoleChatMessages(
  state: StoredSessionState,
  role: StoredRoleState,
  requests: LegacyAgentPrivateChatMessagePostRequest[],
  at: string,
): LegacySessionChatMessage[] {
  const messages = requests.map((request, index) => {
    const message = safeText(request.message)!

    return {
      id: `${state.id}:${role.role}:private-chat:${role.privateChatLog.length + index + 1}`,
      at,
      round: state.round,
      phase: state.phase,
      role: role.role,
      ...(role.agentName ? { agentName: role.agentName } : {}),
      kind: request.kind ?? 'observation',
      message,
    }
  })

  role.privateChatLog.push(...messages)

  return cloneJson(messages)
}
