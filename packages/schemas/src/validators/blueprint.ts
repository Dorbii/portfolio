import type {
  BotBlueprint,
  ValidationIssue,
  ValidationResult,
} from '../types.js'
import {
  ID_PATTERN,
  MAX_BLUEPRINT_BYTES,
  isRecord,
  isVector3,
  issue,
  result,
} from './common.js'

export function validatePurchaseShape(value: unknown): ValidationResult {
  const issues: ValidationIssue[] = []

  if (!Array.isArray(value)) {
    return {
      ok: false,
      issues: [issue('INVALID_PURCHASES', 'purchases', 'Expected purchases array.')],
    }
  }

  value.forEach((purchase, index) => {
    const path = `purchases.${index}`

    if (!isRecord(purchase)) {
      issues.push(issue('INVALID_PURCHASE', path, 'Expected purchase object.'))
      return
    }

    if (typeof purchase.partId !== 'string' || purchase.partId.length === 0) {
      issues.push(issue('INVALID_PART_ID', `${path}.partId`, 'Expected part ID.'))
    }

    const quantity = purchase.quantity

    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1) {
      issues.push(
        issue(
          'INVALID_QUANTITY',
          `${path}.quantity`,
          'Quantity must be a positive integer.',
        ),
      )
    }
  })

  return result(issues)
}

export function validateBlueprintShape(
  value: unknown,
  options: { coordinateLimit?: number; maxBlocks?: number } = {},
): ValidationResult {
  const coordinateLimit = options.coordinateLimit ?? 8
  const maxBlocks = options.maxBlocks ?? 48
  const issues: ValidationIssue[] = []

  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [issue('INVALID_BLUEPRINT', 'blueprint', 'Expected blueprint object.')],
    }
  }

  const payloadBytes = JSON.stringify(value).length

  if (payloadBytes > MAX_BLUEPRINT_BYTES) {
    issues.push(
      issue(
        'BLUEPRINT_TOO_LARGE',
        'blueprint',
        `Blueprint payload is ${payloadBytes} bytes; max is ${MAX_BLUEPRINT_BYTES}.`,
      ),
    )
  }

  if (typeof value.name !== 'string' || value.name.trim().length === 0) {
    issues.push(issue('INVALID_NAME', 'blueprint.name', 'Blueprint needs a name.'))
  } else if (value.name.length > 80) {
    issues.push(
      issue('NAME_TOO_LONG', 'blueprint.name', 'Blueprint name max length is 80.'),
    )
  }

  if (!Array.isArray(value.blocks)) {
    issues.push(
      issue('INVALID_BLOCKS', 'blueprint.blocks', 'Expected blocks array.'),
    )
    return result(issues)
  }

  if (value.blocks.length === 0) {
    issues.push(
      issue('EMPTY_BLUEPRINT', 'blueprint.blocks', 'Blueprint needs at least one block.'),
    )
  }

  if (value.blocks.length > maxBlocks) {
    issues.push(
      issue(
        'TOO_MANY_BLOCKS',
        'blueprint.blocks',
        `Blueprint has ${value.blocks.length} blocks; max is ${maxBlocks}.`,
      ),
    )
  }

  const blockIds = new Set<string>()

  value.blocks.forEach((block, index) => {
    const path = `blueprint.blocks.${index}`

    if (!isRecord(block)) {
      issues.push(issue('INVALID_BLOCK', path, 'Expected block object.'))
      return
    }

    if (typeof block.id !== 'string' || !ID_PATTERN.test(block.id)) {
      issues.push(
        issue(
          'INVALID_BLOCK_ID',
          `${path}.id`,
          'Block ID must be stable and identifier-like.',
        ),
      )
    } else if (blockIds.has(block.id)) {
      issues.push(
        issue('DUPLICATE_BLOCK_ID', `${path}.id`, `Duplicate block ID ${block.id}.`),
      )
    } else {
      blockIds.add(block.id)
    }

    if (typeof block.partId !== 'string' || block.partId.length === 0) {
      issues.push(issue('INVALID_PART_ID', `${path}.partId`, 'Expected part ID.'))
    }

    issues.push(
      ...validateGridPosition(block.position, `${path}.position`, coordinateLimit),
    )
    issues.push(...validateRotation(block.rotation, `${path}.rotation`))

    if ('label' in block && typeof block.label !== 'string') {
      issues.push(issue('INVALID_LABEL', `${path}.label`, 'Label must be a string.'))
    }
  })

  return result(issues)
}

export function asBotBlueprint(value: unknown): BotBlueprint | null {
  return validateBlueprintShape(value).ok ? (value as BotBlueprint) : null
}

function validateGridPosition(
  value: unknown,
  path: string,
  coordinateLimit: number,
): ValidationIssue[] {
  if (!isVector3(value)) {
    return [issue('INVALID_VECTOR', path, 'Expected [x, y, z] numeric tuple.')]
  }

  return value.flatMap((entry, index) => {
    if (!Number.isInteger(entry)) {
      return [
        issue(
          'NON_GRID_COORDINATE',
          `${path}.${index}`,
          'Blueprint positions must use integer grid coordinates.',
        ),
      ]
    }

    if (Math.abs(entry) > coordinateLimit) {
      return [
        issue(
          'COORDINATE_OUT_OF_RANGE',
          `${path}.${index}`,
          `Coordinate must stay within +/-${coordinateLimit}.`,
        ),
      ]
    }

    return []
  })
}

function validateRotation(value: unknown, path: string): ValidationIssue[] {
  if (!isVector3(value)) {
    return [issue('INVALID_VECTOR', path, 'Expected [x, y, z] numeric tuple.')]
  }

  return value.flatMap((entry, index) => {
    if (!Number.isInteger(entry) || entry % 90 !== 0) {
      return [
        issue(
          'INVALID_ROTATION',
          `${path}.${index}`,
          'Rotations must be integer 90-degree increments.',
        ),
      ]
    }

    if (Math.abs(entry) > 360) {
      return [
        issue(
          'ROTATION_OUT_OF_RANGE',
          `${path}.${index}`,
          'Rotation values must stay within +/-360 degrees.',
        ),
      ]
    }

    return []
  })
}
