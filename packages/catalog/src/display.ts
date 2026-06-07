import type { PartDefinition } from '../../schemas/src/index.js'

export type PartCatalogDisplayRow = {
  id: string
  label: string
  value: string
}

export type PartCatalogDisplaySection = {
  id: string
  label: string
  rows: PartCatalogDisplayRow[]
}

export type PartCatalogDisplay = {
  partId: string
  summaryRows: PartCatalogDisplayRow[]
  sections: PartCatalogDisplaySection[]
  coveredKeys: string[]
}

const OMITTED_DISPLAY_KEYS = new Set<keyof PartDefinition>(['displayName', 'id'])

const SUMMARY_FIELD_ORDER = [
  'category',
  'rarity',
  'cost',
  'mass',
  'durability',
  'size',
] as const satisfies readonly (keyof PartDefinition)[]

const SECTION_FIELD_ORDER = [
  'spec',
  'stats',
  'footprint',
  'mounts',
  'signatureEffect',
  'mechanics',
  'visual',
  'behavior',
  'controls',
  'tags',
] as const satisfies readonly (keyof PartDefinition)[]

export function buildPartCatalogDisplay(part: PartDefinition): PartCatalogDisplay {
  const summaryRows = SUMMARY_FIELD_ORDER.flatMap((field) =>
    createDisplayRows(part[field], [field], formatCatalogLabel(field)),
  )
  const orderedSectionFields = orderedDisplayFields(part, SECTION_FIELD_ORDER)
  const sections = orderedSectionFields
    .map((field) => ({
      id: field,
      label: formatCatalogLabel(field),
      rows: createDisplayRows(part[field as keyof PartDefinition], [field], ''),
    }))
    .filter((section) => section.rows.length > 0)

  return {
    partId: part.id,
    summaryRows,
    sections,
    coveredKeys: [
      ...summaryRows.map((row) => row.id.split('.')[0]),
      ...sections.map((section) => section.id),
    ],
  }
}

function orderedDisplayFields(
  part: PartDefinition,
  preferredOrder: readonly (keyof PartDefinition)[],
): string[] {
  const preferred = preferredOrder.filter((field) => hasDisplayValue(part, field))
  const remaining = Object.keys(part)
    .filter((field) =>
      !OMITTED_DISPLAY_KEYS.has(field as keyof PartDefinition) &&
      !SUMMARY_FIELD_ORDER.includes(field as (typeof SUMMARY_FIELD_ORDER)[number]) &&
      !preferredOrder.includes(field as keyof PartDefinition),
    )
    .sort()

  return [...preferred, ...remaining]
}

function hasDisplayValue(part: PartDefinition, field: keyof PartDefinition): boolean {
  return Object.prototype.hasOwnProperty.call(part, field) && !OMITTED_DISPLAY_KEYS.has(field)
}

function createDisplayRows(value: unknown, path: string[], label: string): PartCatalogDisplayRow[] {
  if (value === null || value === undefined) {
    return []
  }

  if (isDisplayScalar(value)) {
    return [{
      id: path.join('.'),
      label: label || formatCatalogLabel(path[path.length - 1] ?? ''),
      value: formatDisplayValue(value),
    }]
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [{
        id: path.join('.'),
        label: label || formatCatalogLabel(path[path.length - 1] ?? ''),
        value: 'None',
      }]
    }

    if (value.every(isDisplayScalar)) {
      return [{
        id: path.join('.'),
        label: label || formatCatalogLabel(path[path.length - 1] ?? ''),
        value: value.map(formatDisplayValue).join(', '),
      }]
    }

    return value.flatMap((item, index) => {
      const itemLabel = displayObjectTitle(item, index)

      return createDisplayRows(item, [...path, String(index)], itemLabel)
    })
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value)

    if (entries.length === 0) {
      return [{
        id: path.join('.'),
        label: label || formatCatalogLabel(path[path.length - 1] ?? ''),
        value: 'None',
      }]
    }

    return entries.flatMap(([key, childValue]) => {
      const childLabel = label
        ? `${label} / ${formatCatalogLabel(key)}`
        : formatCatalogLabel(key)

      return createDisplayRows(childValue, [...path, key], childLabel)
    })
  }

  return []
}

function displayObjectTitle(value: unknown, index: number): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return `Entry ${index + 1}`
  }

  const record = value as Record<string, unknown>

  if (typeof record.id === 'string' && record.id.length > 0) {
    return formatCatalogLabel(record.id)
  }

  if (typeof record.kind === 'string' && record.kind.length > 0) {
    return `${formatCatalogLabel(record.kind)} ${index + 1}`
  }

  return `Entry ${index + 1}`
}

function isDisplayScalar(value: unknown): value is boolean | number | string {
  return typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string'
}

function formatDisplayValue(value: boolean | number | string): string {
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)))
  }

  return formatCatalogLabel(value)
}

export function formatCatalogLabel(value: string): string {
  return value
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ')
}
