import type { CSSProperties } from 'react'
import { getPart } from '../../../../packages/catalog/src/index.js'
import type {
  BotBlueprint,
  PartCategory,
  TeamRole,
} from '../../../../packages/schemas/src/index.js'
import { capitalize } from '../shared/format'
import type { PartFrameState } from './replayMapping'

type PartCondition = 'attached' | 'damaged' | 'broken' | 'detached'
type SchematicCategory = PartCategory | 'unknown'

type PartSchematicItem = {
  blockId: string
  blockLabel: string
  category: SchematicCategory
  condition: PartCondition
  healthLabel: string
  hpPercent?: number
  partName: string
  statusLabel: string
  title: string
}

export function BotPartMap({
  blueprint,
  partStates,
  role,
}: {
  blueprint: BotBlueprint
  partStates: Record<string, PartFrameState>
  role: TeamRole
}) {
  const parts = buildPartSchematic(blueprint, partStates)

  return (
    <div className={`bot-part-map ${role}`} aria-label={`${capitalize(role)} part map`}>
      <div className="bot-part-map-label">
        <span>{capitalize(role)}</span>
        <strong title={blueprint.name}>{blueprint.name}</strong>
      </div>
      <div className="bot-part-grid">
        {parts.map((part) => {
          const healthStyle =
            part.hpPercent === undefined
              ? undefined
              : ({ '--part-health': `${part.hpPercent}%` } as CSSProperties)

          return (
            <div
              aria-label={part.title}
              className={`part-node part-node-${part.condition} part-category-${part.category}`}
              key={part.blockId}
              title={part.title}
            >
              <span className="part-block-label">{part.blockLabel}</span>
              <span className={`part-condition part-condition-${part.condition}`}>
                {part.statusLabel}
              </span>
              <strong>{part.partName}</strong>
              <span className="part-category-label">{part.category}</span>
              <span className="part-hp-label">{part.healthLabel}</span>
              <span
                className={`part-health-meter ${part.hpPercent === undefined ? 'unknown' : 'known'}`}
                style={healthStyle}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function buildPartSchematic(
  blueprint: BotBlueprint,
  partStates: Record<string, PartFrameState>,
): PartSchematicItem[] {
  return blueprint.blocks.map((block) => {
    const catalogPart = getPart(block.partId)
    const state = partStates[block.id]
    const category = catalogPart?.category ?? 'unknown'
    const health = state?.health
    const maxHealth = state?.maxHealth
    const condition = resolvePartCondition(state)
    const healthLabel = formatPartHealth(health, maxHealth)
    const hpPercent = resolveHpPercent(health, maxHealth)
    const partName = catalogPart?.displayName ?? block.partId
    const blockLabel = block.label ?? block.id
    const title = [
      `${blockLabel} block`,
      partName,
      `${category} category`,
      `${condition} state`,
      formatPartHealthTitle(healthLabel),
    ].join(', ')

    return {
      blockId: block.id,
      blockLabel,
      category,
      condition,
      healthLabel,
      hpPercent,
      partName,
      statusLabel: formatConditionLabel(condition),
      title,
    }
  })
}

function resolvePartCondition(state: PartFrameState | undefined): PartCondition {
  if (state?.status === 'detached') {
    return 'detached'
  }

  if (typeof state?.health !== 'number') {
    return 'attached'
  }

  if (state.health <= 0) {
    return 'broken'
  }

  if (typeof state.maxHealth === 'number' && state.maxHealth > 0) {
    return state.health < state.maxHealth ? 'damaged' : 'attached'
  }

  return 'damaged'
}

function formatConditionLabel(condition: PartCondition): string {
  if (condition === 'detached') {
    return 'Detached'
  }

  if (condition === 'broken') {
    return 'Broken'
  }

  if (condition === 'damaged') {
    return 'Damaged'
  }

  return 'Attached'
}

function formatPartHealth(health: number | undefined, maxHealth: number | undefined): string {
  if (typeof health !== 'number') {
    return 'HP --'
  }

  const safeHealth = Math.max(0, health)

  if (typeof maxHealth === 'number' && maxHealth > 0) {
    return `${formatHpNumber(safeHealth)}/${formatHpNumber(maxHealth)}`
  }

  return `${formatHpNumber(safeHealth)} HP`
}

function resolveHpPercent(health: number | undefined, maxHealth: number | undefined): number | undefined {
  if (typeof health !== 'number' || typeof maxHealth !== 'number' || maxHealth <= 0) {
    return undefined
  }

  return Math.min(100, Math.max(0, (health / maxHealth) * 100))
}

function formatPartHealthTitle(healthLabel: string): string {
  if (healthLabel === 'HP --') {
    return 'HP unknown at current time'
  }

  return healthLabel.includes('HP') ? healthLabel : `${healthLabel} HP`
}

function formatHpNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}
