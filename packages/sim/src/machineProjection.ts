import type {
  BlueprintBlock,
  BotBlueprint,
  BotDesignSnapshot,
  BotPartSnapshot,
  MachineAttachment,
  MachineDesign,
  MachinePartInstance,
  Vector3,
} from '../../schemas/src/index.js'
import { MACHINE_CORE_INSTANCE_ID } from './machineDesign.js'

const CATALOG_DEFINITION_PREFIX = 'catalog:'

// CODEX_INTENT: expose one-way MachineDesign projections for legacy replay/session compatibility.
// CODEX_RISK: data_semantics
// CODEX_CONFIDENCE: medium
// CODEX_REVIEW: pending
/**
 * One-way lossy compatibility projection. Losses are intentional: system-core
 * authority, source/immutable flags, attachment transforms, transform scale,
 * runtime-only fields, and future machine mount parameters are not encoded in
 * legacy BotBlueprint.
 */
export function machineDesignToLegacyBotBlueprintProjection(
  machine: MachineDesign,
): BotBlueprint {
  const attachmentByChild = machineAttachmentByChildProjection(machine.attachments)

  return {
    name: machine.name,
    blocks: machine.parts
      .filter(isLegacyCatalogMachinePartProjectionCandidate)
      .map((part): BlueprintBlock => {
        const attachment = attachmentByChild.get(part.instanceId)
        const block: BlueprintBlock = {
          id: part.instanceId,
          partId: legacyCatalogPartIdProjection(part),
          position: legacyVectorProjection(part.transform.position),
          rotation: legacyVectorProjection(part.transform.rotation),
        }
        const parentInstanceId = legacyParentInstanceIdProjection(attachment)

        if (parentInstanceId) {
          block.parentInstanceId = parentInstanceId
        }
        if (attachment?.mountId) {
          block.mountId = attachment.mountId
        }

        return block
      }),
  }
}

/**
 * One-way lossy compatibility projection. BotDesignSnapshot collapses machine
 * transforms to legacy grid x/z plus yaw, and omits machine-only authority and
 * mount-pose metadata so the output cannot reconstruct MachineDesign truth.
 */
export function machineDesignToLegacyBotDesignSnapshotProjection(
  machine: MachineDesign,
): BotDesignSnapshot {
  const attachmentByChild = machineAttachmentByChildProjection(machine.attachments)
  const detachedInstanceIds = new Set(machine.runtime?.detachedInstanceIds ?? [])
  const parts = machine.parts
    .filter(isLegacyCatalogMachinePartProjectionCandidate)
    .map((part): BotPartSnapshot => {
      const attachment = attachmentByChild.get(part.instanceId)
      const legacyPart: BotPartSnapshot = {
        instanceId: part.instanceId,
        partId: legacyCatalogPartIdProjection(part),
        cell: {
          x: part.transform.position[0] ?? 0,
          z: part.transform.position[2] ?? 0,
        },
        rotation: part.transform.rotation[1] ?? 0,
      }
      const parentInstanceId = legacyParentInstanceIdProjection(attachment)
      const health = machine.runtime?.healthByInstanceId[part.instanceId]

      if (parentInstanceId) {
        legacyPart.parentInstanceId = parentInstanceId
      }
      if (attachment?.mountId) {
        legacyPart.mountId = attachment.mountId
      }
      if (typeof health === 'number') {
        legacyPart.health = health
      }
      if (detachedInstanceIds.has(part.instanceId)) {
        legacyPart.detached = true
      }

      return legacyPart
    })
  const legacyRootInstanceId = legacyRootInstanceIdProjection(machine, parts)

  return {
    name: machine.name,
    parts,
    ...(legacyRootInstanceId ? { rootInstanceId: legacyRootInstanceId } : {}),
  }
}

function machineAttachmentByChildProjection(
  attachments: MachineAttachment[],
): Map<string, MachineAttachment> {
  return new Map(attachments.map((attachment) => [attachment.childInstanceId, attachment]))
}

function isLegacyCatalogMachinePartProjectionCandidate(part: MachinePartInstance): boolean {
  return part.source === 'catalog_part'
}

function legacyCatalogPartIdProjection(part: MachinePartInstance): string {
  return part.definitionId.startsWith(CATALOG_DEFINITION_PREFIX)
    ? part.definitionId.slice(CATALOG_DEFINITION_PREFIX.length)
    : part.definitionId
}

function legacyVectorProjection(vector: Vector3): Vector3 {
  return [vector[0] ?? 0, vector[1] ?? 0, vector[2] ?? 0]
}

function legacyParentInstanceIdProjection(
  attachment: MachineAttachment | undefined,
): string | undefined {
  if (!attachment || attachment.parentInstanceId === MACHINE_CORE_INSTANCE_ID) {
    return undefined
  }

  return attachment.parentInstanceId
}

function legacyRootInstanceIdProjection(
  machine: MachineDesign,
  parts: BotPartSnapshot[],
): string | undefined {
  if (machine.rootInstanceId !== MACHINE_CORE_INSTANCE_ID) {
    const legacyRoot = parts.find((part) => part.instanceId === machine.rootInstanceId)

    if (legacyRoot) {
      return legacyRoot.instanceId
    }
  }

  return parts[0]?.instanceId
}
