import { useState } from 'react'
import type {
  AgentChatMessageKind,
  PublicSessionState,
  RolePrivateState,
} from '../../../../packages/schemas/src/index.js'
import type { AgentArenaClient } from './agentClient'
import type { UiError } from './AgentCockpitPanels'
import { toUiError } from './agentCockpitViewState'

type AgentChatFormsInput = {
  client: AgentArenaClient
  roleState: RolePrivateState | null
  setLastError: (error: UiError | null) => void
  setNotice: (notice: string | null) => void
  setPublicState: (state: PublicSessionState | null) => void
  setRoleState: (state: RolePrivateState | null) => void
}

export function useAgentChatForms({
  client,
  roleState,
  setLastError,
  setNotice,
  setPublicState,
  setRoleState,
}: AgentChatFormsInput) {
  const [chatKind, setChatKind] = useState<AgentChatMessageKind>('reflection')
  const [chatMessage, setChatMessage] = useState('')
  const [chatStatus, setChatStatus] = useState<'idle' | 'posting'>('idle')
  const [privateChatKind, setPrivateChatKind] = useState<AgentChatMessageKind>('strategy')
  const [privateChatMessage, setPrivateChatMessage] = useState('')
  const [privateChatStatus, setPrivateChatStatus] = useState<'idle' | 'posting'>('idle')

  const submitChatMessage = async () => {
    if (!roleState) {
      setLastError({
        title: 'Role state is missing',
        message: 'Load role state before posting chat.',
        code: 'MISSING_ROLE_STATE',
      })
      return
    }

    const trimmedMessage = chatMessage.trim()

    if (!trimmedMessage) {
      setLastError({
        title: 'Chat message is empty',
        message: 'Write a short public taunt, observation, strategy note, or reflection.',
        code: 'EMPTY_CHAT_MESSAGE',
      })
      return
    }

    setLastError(null)
    setNotice(null)
    setChatStatus('posting')

    try {
      const result = await client.submitChatMessage({
        kind: chatKind,
        message: trimmedMessage,
      })

      setRoleState(result.state)
      setPublicState(result.publicState)
      setChatMessage('')
      setNotice('Chat message posted.')
    } catch (error) {
      setLastError(toUiError(error, 'Chat post failed'))
    } finally {
      setChatStatus('idle')
    }
  }

  const submitPrivateChatMessage = async () => {
    if (!roleState) {
      setLastError({
        title: 'Role state is missing',
        message: 'Load role state before saving private notes.',
        code: 'MISSING_ROLE_STATE',
      })
      return
    }

    const trimmedMessage = privateChatMessage.trim()

    if (!trimmedMessage) {
      setLastError({
        title: 'Private note is empty',
        message: 'Write a short private note before saving it to this role.',
        code: 'EMPTY_PRIVATE_CHAT_MESSAGE',
      })
      return
    }

    setLastError(null)
    setNotice(null)
    setPrivateChatStatus('posting')

    try {
      const result = await client.submitPrivateChatMessage({
        kind: privateChatKind,
        message: trimmedMessage,
      })

      setRoleState(result.state)
      setPrivateChatMessage('')
      setNotice('Private note saved.')
    } catch (error) {
      setLastError(toUiError(error, 'Private note failed'))
    } finally {
      setPrivateChatStatus('idle')
    }
  }

  return {
    chatKind,
    chatMessage,
    chatStatus,
    privateChatKind,
    privateChatMessage,
    privateChatStatus,
    setChatKind,
    setChatMessage,
    setPrivateChatKind,
    setPrivateChatMessage,
    submitChatMessage,
    submitPrivateChatMessage,
  }
}
