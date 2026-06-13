import { PART_CATALOG } from '../../catalog/src/parts.js'
import type {
  MachineCapabilities,
  MachineCapabilityLocalAxis,
  MachineCapabilityOrientationSource,
  MachineDesign,
  MachineInactivePartCapability,
  MachineInactivePartReason,
  MachineMovementCapability,
  MachinePartInstance,
  MachineUtilityCapability,
  MachineWeaponCapability,
  OrientationBasis,
  PartDefinition,
  Vector3,
} from '../../schemas/src/index.js'
import { MACHINE_CORE_DEFINITION_ID, MACHINE_CORE_INSTANCE_ID } from './machineDesign.js'
import {
  addVectors,
  canonicalBasis,
  dotVectors,
  normalizeVector,
  scaleVector,
} from './transforms.js'

type ResolvedOrientation = {
  basis: OrientationBasis
  source: MachineCapabilityOrientationSource
  runtimeInfluenced: boolean
}

const CATALOG_DEFINITION_PREFIX = 'catalog:'

export function deriveMachineCapabilities(
  design: MachineDesign,
  catalog: PartDefinition[] = PART_CATALOG,
): MachineCapabilities {
  const catalogById = new Map(catalog.map((definition) => [definition.id, definition]))
  const orientationsByInstanceId = resolveMachineOrientations(design)
  const movement: MachineMovementCapability[] = []
  const weapons: MachineWeaponCapability[] = []
  const utility: MachineUtilityCapability[] = []
  const inactiveParts: MachineInactivePartCapability[] = []

  for (const part of design.parts) {
    if (isSystemCore(part)) {
      continue
    }

    const partId = catalogPartId(part.definitionId)
    const definition = catalogById.get(partId)

    if (!definition) {
      inactiveParts.push(inactivePart(part, 'missing_catalog_definition', partId))
      continue
    }

    const inactiveReason = runtimeInactiveReason(design, part.instanceId)

    if (inactiveReason) {
      inactiveParts.push(inactivePart(part, inactiveReason, definition.id))
      continue
    }

    const machineCapabilities = definition.machineCapabilities

    if (!machineCapabilities) {
      continue
    }

    const orientation = orientationsByInstanceId.get(part.instanceId)

    if (machineCapabilities.movement) {
      if (!orientation) {
        inactiveParts.push(inactivePart(part, 'missing_orientation_basis', definition.id))
      } else {
        movement.push(movementCapability(part, definition, machineCapabilities.movement, orientation))
      }
    }

    if (machineCapabilities.weapon) {
      if (!orientation) {
        inactiveParts.push(inactivePart(part, 'missing_orientation_basis', definition.id))
      } else if (definition.spec.kind === 'weapon') {
        weapons.push(weaponCapability(part, definition, machineCapabilities.weapon, orientation))
      }
    }

    if (machineCapabilities.utility) {
      utility.push(utilityCapability(part, definition))
    }
  }

  return {
    movement,
    weapons,
    utility,
    inactiveParts,
  }
}

function movementCapability(
  part: MachinePartInstance,
  definition: PartDefinition,
  movementDefinition: NonNullable<NonNullable<PartDefinition['machineCapabilities']>['movement']>,
  orientation: ResolvedOrientation,
): MachineMovementCapability {
  const driveAxis = localAxis(orientation.basis, movementDefinition.driveAxis)
  const lateralAxis = movementDefinition.lateralAxis
    ? localAxis(orientation.basis, movementDefinition.lateralAxis)
    : undefined
  const diagonalAxes = movementDefinition.mode === 'mecanum_wheel' && lateralAxis
    ? [
        normalizeVector(addVectors(driveAxis, lateralAxis)),
        normalizeVector(addVectors(driveAxis, scaleVector(lateralAxis, -1))),
      ]
    : undefined
  const spec = definition.spec.kind === 'mobility'
    ? definition.spec
    : undefined

  return {
    kind: movementDefinition.mode,
    partInstanceId: part.instanceId,
    partId: definition.id,
    driveAxis,
    ...(lateralAxis ? { lateralAxis } : {}),
    ...(diagonalAxes ? { diagonalAxes } : {}),
    moveBudget: spec?.moveBudget ?? Math.max(0, definition.stats.drive ?? 0),
    traction: spec?.traction ?? Math.max(0, definition.stats.traction ?? 0),
    stability: spec?.stability ?? Math.max(0, definition.stats.stability ?? 0),
    turnRate: spec?.turnRate ?? Math.max(1, definition.stats.control ?? 1),
    orientationSource: orientation.source,
  }
}

function weaponCapability(
  part: MachinePartInstance,
  definition: PartDefinition,
  weaponDefinition: NonNullable<NonNullable<PartDefinition['machineCapabilities']>['weapon']>,
  orientation: ResolvedOrientation,
): MachineWeaponCapability {
  if (definition.spec.kind !== 'weapon') {
    throw new Error(`${definition.id} declares a machine weapon capability without a weapon spec.`)
  }

  return {
    kind: weaponDefinition.mode,
    partInstanceId: part.instanceId,
    partId: definition.id,
    emitterAxis: localAxis(orientation.basis, weaponDefinition.emitterAxis),
    damage: definition.spec.damage,
    range: definition.spec.range,
    cooldownTurns: definition.spec.cooldownTurns,
    fireMode: definition.spec.fireMode,
    precision: definition.spec.precision,
    orientationSource: orientation.source,
  }
}

function utilityCapability(
  part: MachinePartInstance,
  definition: PartDefinition,
): MachineUtilityCapability {
  return {
    kind: 'activated_utility',
    partInstanceId: part.instanceId,
    partId: definition.id,
    control: definition.spec.kind === 'utility'
      ? definition.spec.control
      : Math.max(0, definition.stats.control ?? 0),
  }
}

function resolveMachineOrientations(design: MachineDesign): Map<string, ResolvedOrientation> {
  const partsById = new Map(design.parts.map((part) => [part.instanceId, part]))
  const parentByChild = new Map(design.attachments.map((attachment) => [
    attachment.childInstanceId,
    attachment.parentInstanceId,
  ]))
  const resolved = new Map<string, ResolvedOrientation>()
  const visiting = new Set<string>()

  const resolve = (instanceId: string): ResolvedOrientation | undefined => {
    const existing = resolved.get(instanceId)

    if (existing) {
      return existing
    }

    if (visiting.has(instanceId)) {
      return undefined
    }

    const part = partsById.get(instanceId)

    if (!part) {
      return undefined
    }

    visiting.add(instanceId)

    const runtimeOrientation = design.runtime?.orientationByInstanceId?.[instanceId]

    if (runtimeOrientation) {
      const orientation = resolvedOrientation(
        runtimeOrientation,
        'runtime_orientation',
        true,
      )

      visiting.delete(instanceId)
      resolved.set(instanceId, orientation)
      return orientation
    }

    const baseOrientation = part.transform.orientation

    if (!baseOrientation) {
      visiting.delete(instanceId)
      return undefined
    }

    const parentInstanceId = parentByChild.get(instanceId)
    const parentRuntimeOrientation = parentInstanceId ? resolve(parentInstanceId) : undefined
    const parentBaseOrientation = parentInstanceId
      ? partsById.get(parentInstanceId)?.transform.orientation
      : undefined

    if (parentRuntimeOrientation?.runtimeInfluenced && parentBaseOrientation) {
      const orientation = resolvedOrientation(
        inheritParentRuntimeOrientation(
          parentBaseOrientation,
          parentRuntimeOrientation.basis,
          baseOrientation,
        ),
        'inherited_runtime_orientation',
        true,
      )

      visiting.delete(instanceId)
      resolved.set(instanceId, orientation)
      return orientation
    }

    const orientation = resolvedOrientation(baseOrientation, 'transform_orientation', false)

    visiting.delete(instanceId)
    resolved.set(instanceId, orientation)
    return orientation
  }

  for (const part of design.parts) {
    resolve(part.instanceId)
  }

  return resolved
}

function inheritParentRuntimeOrientation(
  parentBaseOrientation: OrientationBasis,
  parentRuntimeOrientation: OrientationBasis,
  childBaseOrientation: OrientationBasis,
): OrientationBasis {
  return canonicalBasis({
    right: rebaseAxis(childBaseOrientation.right, parentBaseOrientation, parentRuntimeOrientation),
    up: rebaseAxis(childBaseOrientation.up, parentBaseOrientation, parentRuntimeOrientation),
    forward: rebaseAxis(childBaseOrientation.forward, parentBaseOrientation, parentRuntimeOrientation),
  })
}

function rebaseAxis(
  axis: Vector3,
  fromBasis: OrientationBasis,
  toBasis: OrientationBasis,
): Vector3 {
  return normalizeVector(addVectors(
    addVectors(
      scaleVector(toBasis.right, dotVectors(axis, fromBasis.right)),
      scaleVector(toBasis.up, dotVectors(axis, fromBasis.up)),
    ),
    scaleVector(toBasis.forward, dotVectors(axis, fromBasis.forward)),
  ))
}

function resolvedOrientation(
  basis: OrientationBasis,
  source: MachineCapabilityOrientationSource,
  runtimeInfluenced: boolean,
): ResolvedOrientation {
  return {
    basis: canonicalBasis(basis),
    source,
    runtimeInfluenced,
  }
}

function localAxis(
  basis: OrientationBasis,
  axis: MachineCapabilityLocalAxis,
): Vector3 {
  return basis[axis]
}

function runtimeInactiveReason(
  design: MachineDesign,
  instanceId: string,
): MachineInactivePartReason | undefined {
  const directReason = directRuntimeInactiveReason(design, instanceId)

  if (directReason) {
    return directReason
  }

  const parentByChild = new Map(design.attachments.map((attachment) => [
    attachment.childInstanceId,
    attachment.parentInstanceId,
  ]))
  const visited = new Set<string>()
  let parentInstanceId = parentByChild.get(instanceId)

  while (parentInstanceId) {
    if (visited.has(parentInstanceId)) {
      return undefined
    }

    visited.add(parentInstanceId)

    const parentReason = directRuntimeInactiveReason(design, parentInstanceId)

    if (parentReason === 'detached' || parentReason === 'destroyed') {
      return 'detached'
    }

    parentInstanceId = parentByChild.get(parentInstanceId)
  }

  return undefined
}

function directRuntimeInactiveReason(
  design: MachineDesign,
  instanceId: string,
): MachineInactivePartReason | undefined {
  if (design.runtime?.detachedInstanceIds?.includes(instanceId)) {
    return 'detached'
  }

  if (design.runtime?.disabledInstanceIds?.includes(instanceId)) {
    return 'disabled'
  }

  const health = design.runtime?.healthByInstanceId[instanceId]

  if (typeof health === 'number' && health <= 0) {
    return 'destroyed'
  }

  return undefined
}

function inactivePart(
  part: MachinePartInstance,
  reason: MachineInactivePartReason,
  partId?: string,
): MachineInactivePartCapability {
  return {
    partInstanceId: part.instanceId,
    definitionId: part.definitionId,
    ...(partId ? { partId } : {}),
    reason,
  }
}

function catalogPartId(definitionId: string): string {
  return definitionId.startsWith(CATALOG_DEFINITION_PREFIX)
    ? definitionId.slice(CATALOG_DEFINITION_PREFIX.length)
    : definitionId
}

function isSystemCore(part: MachinePartInstance): boolean {
  return part.instanceId === MACHINE_CORE_INSTANCE_ID ||
    part.definitionId === MACHINE_CORE_DEFINITION_ID ||
    part.source === 'system_core'
}
