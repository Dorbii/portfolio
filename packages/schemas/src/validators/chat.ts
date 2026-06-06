import {
  AGENT_CHAT_MESSAGE_KINDS,
  PUBLIC_AGENT_CHAT_MESSAGE_KINDS,
  type ValidationIssue,
  type ValidationResult,
} from '../types.js'
import {
  MAX_AGENT_CHAT_MESSAGE_LENGTH,
  isRecord,
  issue,
  result,
} from './common.js'

type ChatVisibility = 'public' | 'private'

export function validateAgentChatMessageRequestShape(
  value: unknown,
  visibility: ChatVisibility = 'public',
): ValidationResult {
  return result(validateAgentChatMessageShape(value, 'chat', allowedKindsForVisibility(visibility)))
}

export function validateAgentChatMessageBatchShape(
  value: unknown,
  path: string,
  maxMessages: number,
  visibility: ChatVisibility = 'public',
): ValidationResult {
  const issues: ValidationIssue[] = []

  if (!Array.isArray(value)) {
    return {
      ok: false,
      issues: [issue('INVALID_CHAT', path, 'Expected chat message array.')],
    }
  }

  if (value.length > maxMessages) {
    issues.push(
      issue(
        'TOO_MANY_CHAT_MESSAGES',
        path,
        `Submit at most ${maxMessages} chat messages with a round plan.`,
      ),
    )
  }

  value.forEach((message, index) => {
    issues.push(...validateAgentChatMessageShape(
      message,
      `${path}.${index}`,
      allowedKindsForVisibility(visibility),
    ))
  })

  return result(issues)
}

function validateAgentChatMessageShape(
  value: unknown,
  path: string,
  allowedKinds: readonly string[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (!isRecord(value)) {
    return [issue('INVALID_CHAT_MESSAGE', path, 'Expected chat message object.')]
  }

  if (typeof value.message !== 'string' || value.message.trim().length === 0) {
    issues.push(issue('INVALID_CHAT_MESSAGE', `${path}.message`, 'Message must be non-empty text.'))
  } else if (value.message.length > MAX_AGENT_CHAT_MESSAGE_LENGTH) {
    issues.push(
      issue(
        'CHAT_MESSAGE_TOO_LONG',
        `${path}.message`,
        `Message max length is ${MAX_AGENT_CHAT_MESSAGE_LENGTH}.`,
      ),
    )
  }

  if (
    'kind' in value &&
    !allowedKinds.includes(value.kind as never)
  ) {
    issues.push(
      issue(
        'INVALID_CHAT_KIND',
        `${path}.kind`,
        `Chat kind must be one of ${allowedKinds.join(', ')}.`,
      ),
    )
  }

  return issues
}

function allowedKindsForVisibility(visibility: ChatVisibility): readonly string[] {
  return visibility === 'private'
    ? AGENT_CHAT_MESSAGE_KINDS
    : PUBLIC_AGENT_CHAT_MESSAGE_KINDS
}
