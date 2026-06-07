import type {
  BotBlueprint,
  BotDesignSnapshot,
  Vector3,
} from '../../schemas/src/index.js'

export function botDesignSnapshotToBlueprint(
  design: BotDesignSnapshot,
): BotBlueprint {
  return {
    name: design.name,
    blocks: design.parts.map((part) => ({
      id: part.instanceId,
      partId: part.partId,
      position: cellToVector(part.cell),
      rotation: rotationToVector(part.rotation),
      ...(part.parentInstanceId ? { parentInstanceId: part.parentInstanceId } : {}),
      ...(part.mountId ? { mountId: part.mountId } : {}),
      ...(part.mountKind ? { mountKind: part.mountKind } : {}),
      ...(part.mountMotion ? { mountMotion: part.mountMotion } : {}),
      ...(part.mountCollisionPolicy ? { mountCollisionPolicy: part.mountCollisionPolicy } : {}),
      ...(part.mountSector ? { mountSector: part.mountSector } : {}),
      ...(part.signatureEffectActive ? { signatureEffectActive: true } : {}),
    })),
  }
}

function cellToVector(cell: BotDesignSnapshot['parts'][number]['cell']): Vector3 {
  return [cell?.x ?? 0, 0, cell?.z ?? 0]
}

function rotationToVector(rotation: number | undefined): Vector3 {
  return [0, rotation ?? 0, 0]
}
