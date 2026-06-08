import { PART_CATALOG } from '../../catalog/src/parts.js'
import type {
  MachineDesign,
  MachinePartInstance,
  OrientationBasis,
  PartDefinition,
  Transform3D,
  ValidationIssue,
  Vector3,
} from '../../schemas/src/index.js'
import {
  MACHINE_CORE_DEFINITION_ID,
  MACHINE_CORE_INSTANCE_ID,
} from './machineDesign.js'

type PhysicalPart = {
  instanceId: string
  definition: PartDefinition
  bounds: Bounds3D
}

type Bounds3D = {
  min: Vector3
  max: Vector3
}

export function validateMachinePhysicalLegality(
  design: MachineDesign,
  catalog: PartDefinition[] = PART_CATALOG,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const definitionsById = new Map(catalog.map((definition) => [definition.id, definition]))
  const physicalParts: PhysicalPart[] = []

  for (const part of design.parts) {
    const transformIssues = validateTransform(part.transform, `parts.${part.instanceId}.transform`)

    issues.push(...transformIssues)

    if (isSystemCore(part)) {
      continue
    }

    const definition = definitionsById.get(catalogPartId(part.definitionId))

    if (!definition) {
      issues.push(issue(
        'UNKNOWN_PART',
        `parts.${part.instanceId}.definitionId`,
        `${part.definitionId} is not in the catalog.`,
      ))
      continue
    }

    if (transformIssues.length === 0) {
      physicalParts.push({
        instanceId: part.instanceId,
        definition,
        bounds: boundsForPart(definition, part.transform),
      })
    }
  }

  issues.push(...validateHardCollisions(physicalParts, design))

  return issues
}

function validateTransform(transform: Transform3D, path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  validateVector(transform.position, `${path}.position`, issues)
  validateVector(transform.rotation, `${path}.rotation`, issues)

  if (transform.scale !== undefined) {
    validateVector(transform.scale, `${path}.scale`, issues)

    if (transform.scale.some((component) => Number.isFinite(component) && component <= 0)) {
      issues.push(issue('INVALID_TRANSFORM', `${path}.scale`, 'Machine part scale must be positive.'))
    }
  }

  if (transform.orientation !== undefined) {
    validateOrientationBasis(transform.orientation, `${path}.orientation`, issues)
  }

  return issues
}

function validateHardCollisions(parts: PhysicalPart[], design: MachineDesign): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  for (let leftIndex = 0; leftIndex < parts.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < parts.length; rightIndex += 1) {
      const left = parts[leftIndex]
      const right = parts[rightIndex]

      if (isDirectAttachment(design, left.instanceId, right.instanceId)) {
        continue
      }

      if (boundsOverlap(left.bounds, right.bounds)) {
        issues.push(issue(
          'HARD_PART_COLLISION',
          `parts.${left.instanceId}`,
          `${left.instanceId} overlaps ${right.instanceId}.`,
        ))
      }
    }
  }

  return issues
}

function boundsForPart(definition: PartDefinition, transform: Transform3D): Bounds3D {
  const scale = transform.scale ?? [1, 1, 1]
  const halfSize = definition.footprint.size.map((component, index) =>
    Math.abs(component * scale[index]) / 2,
  ) as Vector3

  return {
    min: [
      transform.position[0] - halfSize[0],
      transform.position[1] - halfSize[1],
      transform.position[2] - halfSize[2],
    ],
    max: [
      transform.position[0] + halfSize[0],
      transform.position[1] + halfSize[1],
      transform.position[2] + halfSize[2],
    ],
  }
}

function boundsOverlap(left: Bounds3D, right: Bounds3D): boolean {
  return axesOverlap(left, right, 0) &&
    axesOverlap(left, right, 1) &&
    axesOverlap(left, right, 2)
}

function axesOverlap(left: Bounds3D, right: Bounds3D, axis: number): boolean {
  return left.min[axis] < right.max[axis] && left.max[axis] > right.min[axis]
}

function validateVector(vector: Vector3, path: string, issues: ValidationIssue[]): void {
  if (!Array.isArray(vector) || vector.length !== 3) {
    issues.push(issue('INVALID_TRANSFORM', path, `${path} must be a three-component vector.`))
    return
  }

  vector.forEach((component, index) => {
    if (!Number.isFinite(component)) {
      issues.push(issue('INVALID_TRANSFORM', `${path}.${index}`, `${path}.${index} must be finite.`))
    }
  })
}

function validateOrientationBasis(
  orientation: OrientationBasis,
  path: string,
  issues: ValidationIssue[],
): void {
  validateVector(orientation.right, `${path}.right`, issues)
  validateVector(orientation.up, `${path}.up`, issues)
  validateVector(orientation.forward, `${path}.forward`, issues)
}

function isDirectAttachment(design: MachineDesign, leftId: string, rightId: string): boolean {
  return design.attachments.some((attachment) => (
    attachment.parentInstanceId === leftId && attachment.childInstanceId === rightId
  ) || (
    attachment.parentInstanceId === rightId && attachment.childInstanceId === leftId
  ))
}

function catalogPartId(definitionId: string): string {
  return definitionId.startsWith('catalog:')
    ? definitionId.slice('catalog:'.length)
    : definitionId
}

function isSystemCore(part: MachinePartInstance): boolean {
  return part.instanceId === MACHINE_CORE_INSTANCE_ID ||
    part.definitionId === MACHINE_CORE_DEFINITION_ID ||
    part.source === 'system_core'
}

function issue(code: string, path: string, message: string): ValidationIssue {
  return { code, path, message }
}
