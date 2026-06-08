import { PART_CATALOG } from '../../catalog/src/parts.js'
import type {
  MachineCapabilities,
  MachineDesign,
  MachineRuntimeState,
  OrientationBasis,
  PartCategory,
  PartDefinition,
  TeamRole,
  Transform3D,
  Vector3,
} from '../../schemas/src/index.js'
import { deriveMachineCapabilities } from './machineCapabilities.js'
import { MACHINE_CORE_DEFINITION_ID, MACHINE_CORE_INSTANCE_ID } from './machineDesign.js'
import type { BotStats } from './deriveStats.js'
import {
  canonicalBasis,
  rotateVectorAroundAxis,
} from './transforms.js'

export type MachineRuntimePart = {
  instanceId: string
  partId: string
  category: PartCategory
  position: Vector3
  health: number
  maxHealth: number
}

export type MachineCombatRuntime = {
  role: TeamRole
  design: MachineDesign
  runtime: MachineRuntimeState
  capabilities: MachineCapabilities
  parts: MachineRuntimePart[]
  stats: BotStats
}

const CATALOG_DEFINITION_PREFIX = 'catalog:'

// CODEX_INTENT: build deterministic machine combat runtime from MachineDesign and persisted runtime facts.
// CODEX_RISK: data_semantics
// CODEX_CONFIDENCE: medium
// CODEX_REVIEW: pending
export function createMachineCombatRuntime(
  role: TeamRole,
  design: MachineDesign,
): MachineCombatRuntime {
  const clonedDesign = cloneMachineDesign(design)
  const catalogById = new Map(PART_CATALOG.map((part) => [part.id, part]))
  const runtime = ensureMachineRuntime(clonedDesign, catalogById)
  const parts = createMachineRuntimeParts(clonedDesign, runtime, catalogById)

  clonedDesign.runtime = runtime

  return {
    role,
    design: clonedDesign,
    runtime,
    capabilities: deriveMachineCapabilities(clonedDesign),
    parts,
    stats: machineStats(parts, catalogById),
  }
}

export function refreshMachineCombatRuntime(runtime: MachineCombatRuntime): void {
  runtime.design.runtime = runtime.runtime
  runtime.capabilities = deriveMachineCapabilities(runtime.design)
  runtime.stats = machineStats(runtime.parts, new Map(PART_CATALOG.map((part) => [part.id, part])))
}

export function exportMachineRuntimeState(runtime: MachineCombatRuntime): MachineRuntimeState {
  return {
    healthByInstanceId: { ...runtime.runtime.healthByInstanceId },
    ...(runtime.runtime.detachedInstanceIds ? { detachedInstanceIds: [...runtime.runtime.detachedInstanceIds] } : {}),
    ...(runtime.runtime.disabledInstanceIds ? { disabledInstanceIds: [...runtime.runtime.disabledInstanceIds] } : {}),
    ...(runtime.runtime.orientationByInstanceId ? { orientationByInstanceId: cloneOrientations(runtime.runtime.orientationByInstanceId) } : {}),
  }
}

export function syncMachinePartHealth(runtime: MachineCombatRuntime): void {
  for (const part of runtime.parts) {
    runtime.runtime.healthByInstanceId[part.instanceId] = part.health
  }

  refreshMachineCombatRuntime(runtime)
}

export function syncMachinePartDamage(
  runtime: MachineCombatRuntime,
  instanceId: string,
  health: number,
): void {
  runtime.runtime.healthByInstanceId[instanceId] = health

  const part = runtime.parts.find((candidate) => candidate.instanceId === instanceId)

  if (part) {
    part.health = health
  }

  refreshMachineCombatRuntime(runtime)
}

export function rotateMachineRootOrientation(
  runtime: MachineCombatRuntime,
  direction: 'left' | 'right',
): void {
  const root = runtime.design.parts.find((part) => part.instanceId === runtime.design.rootInstanceId)

  if (!root) {
    return
  }

  const current = runtime.runtime.orientationByInstanceId?.[root.instanceId] ??
    root.transform.orientation

  if (!current) {
    return
  }

  const yawDegrees = direction === 'left' ? -90 : 90
  const orientation = canonicalBasis({
    right: rotateVectorAroundAxis(current.right, current.up, yawDegrees),
    up: current.up,
    forward: rotateVectorAroundAxis(current.forward, current.up, yawDegrees),
  })

  runtime.runtime.orientationByInstanceId = {
    ...(runtime.runtime.orientationByInstanceId ?? {}),
    [root.instanceId]: orientation,
  }
  runtime.design.runtime = runtime.runtime
  refreshMachineCombatRuntime(runtime)
}

function ensureMachineRuntime(
  design: MachineDesign,
  catalogById: Map<string, PartDefinition>,
): MachineRuntimeState {
  const existing = design.runtime
  const healthByInstanceId = { ...(existing?.healthByInstanceId ?? {}) }

  for (const part of design.parts) {
    if (healthByInstanceId[part.instanceId] !== undefined) {
      continue
    }

    healthByInstanceId[part.instanceId] = partMaxHealth(part.definitionId, catalogById)
  }

  return {
    healthByInstanceId,
    ...(existing?.detachedInstanceIds ? { detachedInstanceIds: [...existing.detachedInstanceIds] } : {}),
    ...(existing?.disabledInstanceIds ? { disabledInstanceIds: [...existing.disabledInstanceIds] } : {}),
    ...(existing?.orientationByInstanceId ? { orientationByInstanceId: cloneOrientations(existing.orientationByInstanceId) } : {}),
  }
}

function createMachineRuntimeParts(
  design: MachineDesign,
  runtime: MachineRuntimeState,
  catalogById: Map<string, PartDefinition>,
): MachineRuntimePart[] {
  return design.parts
    .map((part) => {
      const partId = catalogPartId(part.definitionId)
      const definition = catalogById.get(partId)
      const maxHealth = partMaxHealth(part.definitionId, catalogById)

      return {
        instanceId: part.instanceId,
        partId,
        category: definition?.category ?? 'body',
        position: [...part.transform.position],
        health: Math.max(0, runtime.healthByInstanceId[part.instanceId] ?? maxHealth),
        maxHealth,
      }
    })
}

function machineStats(
  parts: readonly MachineRuntimePart[],
  catalogById: Map<string, PartDefinition>,
): BotStats {
  const stats: BotStats = {
    armor: 0,
    chaos: 0,
    control: 0,
    durability: 0,
    footprint: Math.max(1, parts.length),
    mass: 0,
    mobility: 0,
    stability: 0,
    style: 0,
    traction: 0,
    weaponThreat: 0,
  }

  for (const runtimePart of parts) {
    const part = catalogById.get(runtimePart.partId)

    if (!part) {
      continue
    }

    stats.mass += part.mass
    stats.durability += runtimePart.maxHealth
    stats.armor += part.spec.kind === 'armor' ? part.spec.armor : part.stats.armor ?? 0
    stats.chaos += part.stats.chaos ?? 0
    stats.control += part.stats.control ?? 0
    stats.mobility += part.spec.kind === 'mobility' ? part.spec.moveBudget : part.stats.drive ?? 0
    stats.stability += part.spec.kind === 'mobility' ? part.spec.stability : part.stats.stability ?? 0
    stats.style += part.stats.style ?? 0
    stats.traction += part.spec.kind === 'mobility' ? part.spec.traction : part.stats.traction ?? 0
    stats.weaponThreat += part.spec.kind === 'weapon' ? part.spec.damage : part.stats.weapon ?? 0
  }

  stats.mobility = clamp(stats.mobility - stats.mass / 18, 0, 40)
  stats.stability = clamp(stats.stability + stats.traction / 3 - stats.chaos / 2 - stats.footprint / 6, 0, 40)
  stats.weaponThreat = clamp(stats.weaponThreat + stats.chaos / 3, 0, 45)
  stats.armor = clamp(stats.armor, 0, 45)
  stats.control = clamp(stats.control, 0, 40)
  stats.durability = Math.max(1, stats.durability + stats.armor * 3)

  return stats
}

function partMaxHealth(
  definitionId: string,
  catalogById: Map<string, PartDefinition>,
): number {
  if (definitionId === MACHINE_CORE_DEFINITION_ID || definitionId === MACHINE_CORE_INSTANCE_ID) {
    return 20
  }

  return Math.max(1, catalogById.get(catalogPartId(definitionId))?.durability ?? 1)
}

function catalogPartId(definitionId: string): string {
  return definitionId.startsWith(CATALOG_DEFINITION_PREFIX)
    ? definitionId.slice(CATALOG_DEFINITION_PREFIX.length)
    : definitionId
}

function cloneMachineDesign(design: MachineDesign): MachineDesign {
  return {
    name: design.name,
    rootInstanceId: design.rootInstanceId,
    parts: design.parts.map((part) => ({
      ...part,
      transform: cloneTransform(part.transform),
    })),
    attachments: design.attachments.map((attachment) => ({
      ...attachment,
      transform: cloneTransform(attachment.transform),
    })),
    ...(design.runtime ? { runtime: exportMachineRuntimeState({ runtime: design.runtime } as MachineCombatRuntime) } : {}),
  }
}

function cloneTransform(transform: Transform3D): Transform3D {
  return {
    position: [...transform.position],
    rotation: [...transform.rotation],
    ...(transform.scale ? { scale: [...transform.scale] } : {}),
    ...(transform.orientation ? { orientation: cloneBasis(transform.orientation) } : {}),
  }
}

function cloneOrientations(
  orientations: Record<string, OrientationBasis>,
): Record<string, OrientationBasis> {
  return Object.fromEntries(
    Object.entries(orientations).map(([instanceId, basis]) => [instanceId, cloneBasis(basis)]),
  )
}

function cloneBasis(basis: OrientationBasis): OrientationBasis {
  return {
    right: [...basis.right],
    up: [...basis.up],
    forward: [...basis.forward],
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
