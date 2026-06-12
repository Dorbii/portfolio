import {
  validateAgentBootstrapRequestShape,
  type ValidationIssue,
  type ValidationResult,
} from '../../../packages/schemas/src/index.js'

const MAX_AGENT_NAME_LENGTH = 80
const BOOTSTRAP_IDENTITY_VALIDATION_AGENT_NAME = 'bootstrap-identity-validation'

export function validateAgentBootstrapPatchRequestShape(value: unknown): ValidationResult {
  const issues: ValidationIssue[] = []

  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [
        {
          code: 'INVALID_BOOTSTRAP_REQUEST',
          path: 'bootstrap',
          message: 'Expected bootstrap object.',
        },
      ],
    }
  }

  if ('agentName' in value) {
    if (typeof value.agentName !== 'string') {
      issues.push({
        code: 'INVALID_AGENT_NAME',
        path: 'bootstrap.agentName',
        message: 'Agent name must be text.',
      })
    } else if (value.agentName.length > MAX_AGENT_NAME_LENGTH) {
      issues.push({
        code: 'AGENT_NAME_TOO_LONG',
        path: 'bootstrap.agentName',
        message: `Agent name max length is ${MAX_AGENT_NAME_LENGTH}.`,
      })
    }
  }

  if ('teamIdentity' in value) {
    const identityValidation = validateAgentBootstrapRequestShape({
      agentName: BOOTSTRAP_IDENTITY_VALIDATION_AGENT_NAME,
      teamIdentity: value.teamIdentity,
    })

    if (!identityValidation.ok) {
      issues.push(...identityValidation.issues)
    }
  }

  return issues.length === 0 ? { ok: true } : { ok: false, issues }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
