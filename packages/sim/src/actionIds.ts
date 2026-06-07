import type {
  GameMasterActionKind,
  TeamRole,
} from '../../schemas/src/index.js'

export type CombatActionIdInput = {
  role: TeamRole
  round: number
  tick: number
  kind: GameMasterActionKind
  parts: readonly string[]
}

export function combatActionId(input: CombatActionIdInput): string {
  const suffix = input.parts
    .map((part) => sanitizeActionIdPart(part))
    .filter(Boolean)
    .join('.')

  return [
    'combat',
    input.role,
    `r${input.round}`,
    `t${input.tick}`,
    sanitizeActionIdPart(input.kind),
    suffix,
  ].filter(Boolean).join('.')
}

export function sanitizeActionIdPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}
