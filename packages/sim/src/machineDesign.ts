import type {
  MachineAttachment,
  MachineCoreDefinition,
  MachineDesign,
  MachinePartInstance,
  TeamRole,
  Transform3D,
  ValidationIssue,
} from '../../schemas/src/index.js'

export const MACHINE_CORE_INSTANCE_ID = 'core'
export const MACHINE_CORE_DEFINITION_ID = 'system:machine-core:v1'

export const SYSTEM_MACHINE_CORE_DEFINITION: MachineCoreDefinition = {
  id: MACHINE_CORE_DEFINITION_ID,
  displayName: 'Machine Core',
  cost: 0,
  systemOwned: true,
  inventoryItem: false,
  catalogPart: false,
  immutable: true,
  mountSurfaces: [
    {
      id: 'core_shell',
      kind: 'sphere',
      accepts: ['body', 'mobility', 'weapon', 'defense', 'utility', 'style'],
      center: [0, 0, 0],
      radius: 1,
    },
    {
      id: 'core_deck',
      kind: 'panel',
      accepts: ['weapon', 'defense', 'utility', 'style'],
      center: [0, 0.5, 0],
      size: [1.5, 1.5],
      normal: [0, 1, 0],
      uAxis: [1, 0, 0],
      vAxis: [0, 0, 1],
    },
  ],
}

export function createInitialMachineDesign(role: TeamRole): MachineDesign {
  return {
    name: `${role} machine`,
    rootInstanceId: MACHINE_CORE_INSTANCE_ID,
    parts: [createCoreInstance()],
    attachments: [],
  }
}

export function validateMachineTree(design: MachineDesign): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const parts = design.parts
  const attachments = design.attachments
  const byId = new Map<string, MachinePartInstance>()
  const idCounts = new Map<string, number>()

  for (const part of parts) {
    idCounts.set(part.instanceId, (idCounts.get(part.instanceId) ?? 0) + 1)
    byId.set(part.instanceId, part)
  }

  for (const [instanceId, count] of idCounts.entries()) {
    if (count > 1) {
      issues.push(issue('DUPLICATE_PART_INSTANCE', `parts.${instanceId}`, `${instanceId} appears ${count} times.`))
    }
  }

  const coreParts = parts.filter(isCorePart)

  if (coreParts.length === 0) {
    issues.push(issue('MISSING_CORE', 'parts', 'MachineDesign requires exactly one system-owned core instance.'))
  } else if (coreParts.length > 1) {
    issues.push(issue('DUPLICATE_CORE', 'parts', 'MachineDesign allows only one system-owned core instance.'))
  }

  const core = byId.get(MACHINE_CORE_INSTANCE_ID)

  if (core) {
    if (
      core.definitionId !== MACHINE_CORE_DEFINITION_ID ||
      core.source !== 'system_core' ||
      core.immutable !== true
    ) {
      issues.push(issue('CORE_NOT_SYSTEM_OWNED', 'parts.core', 'Core must use the immutable system core definition.'))
    }

    if (!isIdentityTransform(core.transform)) {
      issues.push(issue('CORE_MOVED', 'parts.core.transform', 'The system core transform is immutable.'))
    }
  }

  if (design.rootInstanceId !== MACHINE_CORE_INSTANCE_ID) {
    issues.push(issue('CORE_MOVED', 'rootInstanceId', 'The system core must remain the machine root.'))
  }

  const childrenByParent = new Map<string, string[]>()
  const parentByChild = new Map<string, string>()

  for (const attachment of attachments) {
    const parent = byId.get(attachment.parentInstanceId)
    const child = byId.get(attachment.childInstanceId)

    if (attachment.parentInstanceId === attachment.childInstanceId) {
      issues.push(issue('SELF_ATTACHMENT', attachmentPath(attachment), 'A part cannot attach to itself.'))
      continue
    }

    if (!parent) {
      issues.push(issue('UNKNOWN_ATTACHMENT_PARENT', attachmentPath(attachment), `${attachment.parentInstanceId} is not in the machine.`))
      continue
    }

    if (!child) {
      issues.push(issue('UNKNOWN_ATTACHMENT_CHILD', attachmentPath(attachment), `${attachment.childInstanceId} is not in the machine.`))
      continue
    }

    if (attachment.childInstanceId === MACHINE_CORE_INSTANCE_ID) {
      issues.push(issue('CORE_MOVED', attachmentPath(attachment), 'The system core cannot be attached under another part.'))
      continue
    }

    if (parentByChild.has(attachment.childInstanceId)) {
      issues.push(issue('MULTIPLE_PARENTS', attachmentPath(attachment), `${attachment.childInstanceId} has more than one parent.`))
      continue
    }

    parentByChild.set(attachment.childInstanceId, attachment.parentInstanceId)
    const children = childrenByParent.get(attachment.parentInstanceId) ?? []

    children.push(attachment.childInstanceId)
    childrenByParent.set(attachment.parentInstanceId, children)
  }

  pushCycleIssues([...byId.keys()], childrenByParent, issues)

  if (byId.has(MACHINE_CORE_INSTANCE_ID)) {
    const reachable = reachableFromCore(childrenByParent)

    for (const instanceId of byId.keys()) {
      if (!reachable.has(instanceId)) {
        issues.push(issue('DISCONNECTED_PART', `parts.${instanceId}`, `${instanceId} is not connected to the system core.`))
      }
    }
  }

  return issues
}

function createCoreInstance(): MachinePartInstance {
  return {
    instanceId: MACHINE_CORE_INSTANCE_ID,
    definitionId: MACHINE_CORE_DEFINITION_ID,
    source: 'system_core',
    transform: identityTransform(),
    immutable: true,
  }
}

function identityTransform(): Transform3D {
  return {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    orientation: {
      right: [1, 0, 0],
      up: [0, 1, 0],
      forward: [0, 0, 1],
    },
  }
}

function isIdentityTransform(transform: Transform3D): boolean {
  return vectorsEqual(transform.position, [0, 0, 0]) &&
    vectorsEqual(transform.rotation, [0, 0, 0]) &&
    (transform.scale === undefined || vectorsEqual(transform.scale, [1, 1, 1])) &&
    (transform.orientation === undefined || (
      vectorsEqual(transform.orientation.right, [1, 0, 0]) &&
      vectorsEqual(transform.orientation.up, [0, 1, 0]) &&
      vectorsEqual(transform.orientation.forward, [0, 0, 1])
    ))
}

function vectorsEqual(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function isCorePart(part: MachinePartInstance): boolean {
  return part.instanceId === MACHINE_CORE_INSTANCE_ID ||
    part.definitionId === MACHINE_CORE_DEFINITION_ID ||
    part.source === 'system_core'
}

function pushCycleIssues(
  instanceIds: string[],
  childrenByParent: Map<string, string[]>,
  issues: ValidationIssue[],
): void {
  const visited = new Set<string>()
  const visiting = new Set<string>()
  let reported = false

  const visit = (instanceId: string): void => {
    if (reported) {
      return
    }

    if (visiting.has(instanceId)) {
      reported = true
      issues.push(issue('MACHINE_TREE_CYCLE', `parts.${instanceId}`, 'Machine attachments must form an acyclic tree.'))
      return
    }

    if (visited.has(instanceId)) {
      return
    }

    visiting.add(instanceId)

    for (const childId of childrenByParent.get(instanceId) ?? []) {
      visit(childId)
    }

    visiting.delete(instanceId)
    visited.add(instanceId)
  }

  for (const instanceId of instanceIds) {
    visit(instanceId)
  }
}

function reachableFromCore(childrenByParent: Map<string, string[]>): Set<string> {
  const reachable = new Set<string>()
  const queue = [MACHINE_CORE_INSTANCE_ID]

  while (queue.length > 0) {
    const instanceId = queue.shift()

    if (!instanceId || reachable.has(instanceId)) {
      continue
    }

    reachable.add(instanceId)
    queue.push(...(childrenByParent.get(instanceId) ?? []))
  }

  return reachable
}

function attachmentPath(attachment: MachineAttachment): string {
  return `attachments.${attachment.parentInstanceId}.${attachment.childInstanceId}`
}

function issue(code: string, path: string, message: string): ValidationIssue {
  return { code, path, message }
}
