import type { Vector3 } from '../../schemas/src/index.js'
import {
  MACHINE_CORE_INSTANCE_ID,
} from './machineDesign.js'
import {
  refreshMachineCombatRuntime,
  type MachineCombatRuntime,
  type MachineRuntimePart,
} from './machineRuntime.js'

export type MachineDamageWreckage = {
  instanceId: string
  partId: string
  reason: 'destroyed' | 'detached'
  damageApplied: number
  remainingHealth: number
  maxHealth: number
  localPosition: Vector3
}

export type MachineDamageResult = {
  target: MachineDamageWreckage
  wreckage: MachineDamageWreckage[]
}

export function applyMachineDamage(
  runtime: MachineCombatRuntime,
  amount: number,
): MachineDamageResult | undefined {
  const target = selectMachineDamageTarget(runtime)

  if (!target) {
    return undefined
  }

  const before = target.health
  const applied = round(Math.min(before, Math.max(0, amount)))

  target.health = round(Math.max(0, before - applied))
  runtime.runtime.healthByInstanceId[target.instanceId] = target.health

  const targetWreckage: MachineDamageWreckage = {
    instanceId: target.instanceId,
    partId: target.partId,
    reason: 'destroyed',
    damageApplied: applied,
    remainingHealth: target.health,
    maxHealth: target.maxHealth,
    localPosition: [...target.position],
  }
  const wreckage = target.health <= 0
    ? [targetWreckage, ...detachMachineSubtree(runtime, target.instanceId)]
    : []

  refreshMachineCombatRuntime(runtime)

  return {
    target: targetWreckage,
    wreckage,
  }
}

function selectMachineDamageTarget(runtime: MachineCombatRuntime): MachineRuntimePart | undefined {
  const detached = new Set(runtime.runtime.detachedInstanceIds ?? [])
  const capable = capabilityPartIds(runtime)

  return runtime.parts
    .filter((part) => part.health > 0 && !detached.has(part.instanceId))
    .sort((left, right) =>
      damagePriority(left, capable) - damagePriority(right, capable) ||
      left.health - right.health ||
      left.instanceId.localeCompare(right.instanceId))
    [0]
}

function damagePriority(
  part: MachineRuntimePart,
  capable: Set<string>,
): number {
  if (part.instanceId === MACHINE_CORE_INSTANCE_ID) {
    return 3
  }

  return capable.has(part.instanceId) ? 1 : 2
}

function capabilityPartIds(runtime: MachineCombatRuntime): Set<string> {
  return new Set([
    ...runtime.capabilities.movement.map((capability) => capability.partInstanceId),
    ...runtime.capabilities.weapons.map((capability) => capability.partInstanceId),
    ...runtime.capabilities.utility.map((capability) => capability.partInstanceId),
  ])
}

function detachMachineSubtree(
  runtime: MachineCombatRuntime,
  rootInstanceId: string,
): MachineDamageWreckage[] {
  const childrenByParent = new Map<string, string[]>()

  for (const attachment of runtime.design.attachments) {
    const children = childrenByParent.get(attachment.parentInstanceId) ?? []

    children.push(attachment.childInstanceId)
    childrenByParent.set(attachment.parentInstanceId, children)
  }

  for (const children of childrenByParent.values()) {
    children.sort()
  }

  const existingDetached = new Set(runtime.runtime.detachedInstanceIds ?? [])
  const nextDetached = new Set(existingDetached)
  const wreckage: MachineDamageWreckage[] = []
  const visit = (instanceId: string): void => {
    for (const childInstanceId of childrenByParent.get(instanceId) ?? []) {
      const child = runtime.parts.find((part) => part.instanceId === childInstanceId)

      if (child && !existingDetached.has(childInstanceId)) {
        child.health = 0
        runtime.runtime.healthByInstanceId[childInstanceId] = 0
        nextDetached.add(childInstanceId)
        wreckage.push({
          instanceId: child.instanceId,
          partId: child.partId,
          reason: 'detached',
          damageApplied: 0,
          remainingHealth: 0,
          maxHealth: child.maxHealth,
          localPosition: [...child.position],
        })
      }

      visit(childInstanceId)
    }
  }

  visit(rootInstanceId)

  if (nextDetached.size > 0) {
    runtime.runtime.detachedInstanceIds = [...nextDetached].sort()
  }

  return wreckage
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
