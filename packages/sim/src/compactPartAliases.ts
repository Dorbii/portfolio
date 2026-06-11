import type { PartDefinition } from '../../schemas/src/index.js'

const CATEGORY_PREFIXES = new Set([
  'body',
  'mobility',
  'weapon',
  'defense',
  'utility',
  'style',
])

export function compactPartAlias(part: Pick<PartDefinition, 'id' | 'category'>): string {
  return `${part.category}.${part.id}`
}

export function compactSystemCoreAlias(): 'body.Machine_Core' {
  return 'body.Machine_Core'
}

export function canonicalPartIdFromCompact(value: string): string {
  const trimmed = value.trim()
  const separatorIndex = trimmed.indexOf('.')

  if (separatorIndex <= 0) {
    return trimmed
  }

  const prefix = trimmed.slice(0, separatorIndex)
  const rest = trimmed.slice(separatorIndex + 1)

  return CATEGORY_PREFIXES.has(prefix) && rest.length > 0 ? rest : trimmed
}
