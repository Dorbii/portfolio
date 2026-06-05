import type {
  AgentChatMessagePostRequest,
  AgentPrivateChatMessagePostRequest,
  SessionChatMessage,
  SessionLogEvent,
} from '../../../packages/schemas/src/index.js'
import type { CombatResult } from '../../../packages/sim/src/index.js'
import { createCombatChatter } from './combatChatter.js'
import {
  cloneJson,
  safeText,
} from './sessionSupport.js'
import type {
  StoredRoleState,
  StoredSessionState,
} from './sessionTypes.js'

export function appendSessionEvent(
  state: StoredSessionState,
  type: SessionLogEvent['type'],
  message: string,
  at: string,
): void {
  state.eventLog.push({ at, type, message })
}

export function appendRoleChatMessages(
  state: StoredSessionState,
  role: StoredRoleState,
  requests: AgentChatMessagePostRequest[],
  at: string,
): SessionChatMessage[] {
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
  requests: AgentPrivateChatMessagePostRequest[],
  at: string,
): SessionChatMessage[] {
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

export function appendCombatChatterMessages(
  state: StoredSessionState,
  result: CombatResult,
  at: string,
): boolean {
  const chatter = createCombatChatter(result)

  for (const message of chatter) {
    appendRoleChatMessages(state, state.roles[message.role], [message], at)
  }

  return chatter.length > 0
}
