import { PART_CATALOG } from '../../catalog/src/index.js'
import type {
  ActiveActionSet,
  CanonicalGameAction,
  CatalogStoreView,
  CompactBotSummary,
  CompactBuildPacket,
  CompactBuildPartRow,
  CompactBuildStep,
  CompactStorePart,
  LoadoutBuildState,
  MachineDesign,
  PartDefinition,
  TeamRole,
  ValidationIssue,
} from '../../schemas/src/index.js'
import { compactPartAlias, compactSystemCoreAlias } from './compactPartAliases.js'
import { deriveMachineCapabilities } from './machineCapabilities.js'
import { MACHINE_CORE_INSTANCE_ID } from './machineDesign.js'
import { ensureLoadoutBuildState, LOADOUT_PART_LIMIT } from './loadoutActions.js'

const MACHINE_CORE_MAX_HEALTH = 20
const CATALOG_DEFINITION_PREFIX = 'catalog:'

export type BuildCompactBuildViewInput = {
  role: TeamRole
  round: number
  decisionVersion: number
  gold: number
  buildState: LoadoutBuildState
  store?: CatalogStoreView
  actionSet?: ActiveActionSet
  catalog?: PartDefinition[]
  mode?: 'new' | 'existing'
}

// Compact protocol rule: compact state in, compact intent out. This view is
// derived only from authoritative server state (build state + action set);
// it never exposes legal action menus, the full catalog, or store slots.
export function buildCompactBuildView(input: BuildCompactBuildViewInput): CompactBuildPacket {
  const catalog = input.catalog ?? PART_CATALOG
  const catalogById = new Map(catalog.map((part) => [part.id, part]))
  const buildState = ensureLoadoutBuildState(input.role, input.buildState)
  const compactStep = compactBuildStepFor(buildState)
  const purchasedParts = purchasedPartCount(buildState)
  const packet: CompactBuildPacket = {
    v: 1,
    phase: 'build',
    round: input.round,
    decisionVersion: input.decisionVersion,
    step: compactStep,
    budget: {
      gold: input.gold,
      parts: Math.max(0, LOADOUT_PART_LIMIT - purchasedParts),
    },
    bot: {
      mode: input.mode ?? (purchasedParts > 0 || input.round > 1 ? 'existing' : 'new'),
      summary: compactBotSummary(buildState, catalog, catalogById),
      partSchema: ['id', 'part', 'parent', 'hp', 'maxHp'],
      parts: compactBotPartRows(buildState, catalogById),
    },
    issues: [],
  }

  if (compactStep === 'choose_part') {
    const store = input.store ?? input.actionSet?.catalogStore

    if (store) {
      packet.store = compactStoreView(store, catalogById)
    }

    packet.edit = compactEditSurface(buildState, input.actionSet, catalogById)
    packet.requirements = compactRequirements(input.actionSet)
  }

  if (compactStep === 'choose_attach_target') {
    packet.selected = compactSelected(buildState, catalogById)
    packet.targets = compactTargets(input.actionSet)
  }

  if (compactStep === 'mount_part') {
    packet.selected = compactSelected(buildState, catalogById)
    packet.mountSchema = ['surface', 'u', 'v', 'yaw', 'roll']
    packet.mounts = compactMounts(input.actionSet)
  }

  packet.buildDigest = digestCompactBuildPacket(packet)

  return packet
}

function compactBuildStepFor(buildState: LoadoutBuildState): CompactBuildStep {
  switch (buildState.step) {
    case 'choose_attach_target':
      return 'choose_attach_target'
    case 'propose_mount_pose':
      return 'mount_part'
    case 'choose_mount':
    case 'choose_rotation':
      return buildState.currentDesign.version === 'machine:v1' ? 'mount_part' : 'choose_part'
    case 'choose_part':
    case 'ready_to_confirm':
    default:
      return 'choose_part'
  }
}

function purchasedPartCount(buildState: LoadoutBuildState): number {
  const currentDesign = buildState.currentDesign

  if (currentDesign.version === 'machine:v1') {
    return currentDesign.machine.parts.filter(
      (part) => part.source === 'catalog_part',
    ).length
  }

  const rootInstanceId = currentDesign.design.rootInstanceId

  return currentDesign.design.parts.filter(
    (part) => part.instanceId !== rootInstanceId,
  ).length
}

function catalogPartIdFromDefinitionId(definitionId: string): string {
  return definitionId.startsWith(CATALOG_DEFINITION_PREFIX)
    ? definitionId.slice(CATALOG_DEFINITION_PREFIX.length)
    : definitionId
}

function aliasForCatalogPartId(
  partId: string,
  catalogById: Map<string, PartDefinition>,
): string {
  const part = catalogById.get(partId)

  return part ? compactPartAlias(part) : partId
}

function compactBotPartRows(
  buildState: LoadoutBuildState,
  catalogById: Map<string, PartDefinition>,
): CompactBuildPartRow[] {
  if (buildState.currentDesign.version === 'machine:v1') {
    return machinePartRows(buildState.currentDesign.machine, catalogById)
  }

  const design = buildState.currentDesign.design
  const rootInstanceId = design.rootInstanceId ?? design.parts[0]?.instanceId

  return design.parts.map((part) => {
    const durability = Math.max(1, catalogById.get(part.partId)?.durability ?? 1)

    return [
      part.instanceId,
      aliasForCatalogPartId(part.partId, catalogById),
      part.instanceId === rootInstanceId ? null : part.parentInstanceId ?? rootInstanceId ?? null,
      durability,
      durability,
    ]
  })
}

function machinePartRows(
  machine: MachineDesign,
  catalogById: Map<string, PartDefinition>,
): CompactBuildPartRow[] {
  const parentByChild = new Map<string, string>()

  for (const attachment of machine.attachments) {
    parentByChild.set(attachment.childInstanceId, attachment.parentInstanceId)
  }

  return machine.parts.map((part) => {
    if (part.source === 'system_core' || part.instanceId === MACHINE_CORE_INSTANCE_ID) {
      return [
        part.instanceId,
        compactSystemCoreAlias(),
        null,
        MACHINE_CORE_MAX_HEALTH,
        MACHINE_CORE_MAX_HEALTH,
      ]
    }

    const catalogId = catalogPartIdFromDefinitionId(part.definitionId)
    // Shop view is always full-heal: hp = maxHp = catalog durability.
    const durability = Math.max(1, catalogById.get(catalogId)?.durability ?? 1)

    return [
      part.instanceId,
      aliasForCatalogPartId(catalogId, catalogById),
      parentByChild.get(part.instanceId) ?? machine.rootInstanceId,
      durability,
      durability,
    ]
  })
}

function compactBotSummary(
  buildState: LoadoutBuildState,
  catalog: PartDefinition[],
  catalogById: Map<string, PartDefinition>,
): CompactBotSummary {
  const summary: CompactBotSummary = {
    hp: 0,
    maxHp: 0,
    mass: 0,
    armor: 0,
    stability: 0,
    movement: {},
    weapons: [],
    utility: [],
  }

  if (buildState.currentDesign.version !== 'machine:v1') {
    for (const partSnapshot of buildState.currentDesign.design.parts) {
      const part = catalogById.get(partSnapshot.partId)

      if (!part) {
        continue
      }

      summary.maxHp += Math.max(1, part.durability)
      summary.mass += part.mass
      summary.armor += part.stats.armor ?? 0
      summary.stability += part.stats.stability ?? 0
    }

    summary.hp = summary.maxHp

    return summary
  }

  const machine = buildState.currentDesign.machine

  summary.maxHp = MACHINE_CORE_MAX_HEALTH

  for (const part of machine.parts) {
    if (part.source !== 'catalog_part') {
      continue
    }

    const definition = catalogById.get(catalogPartIdFromDefinitionId(part.definitionId))

    if (!definition) {
      continue
    }

    summary.maxHp += Math.max(1, definition.durability)
    summary.mass += definition.mass
    summary.armor += definition.stats.armor ?? 0
    summary.stability += definition.stats.stability ?? 0

    if (definition.spec.kind === 'armor') {
      summary.armor += definition.spec.armor
    }

    if (definition.spec.kind === 'mobility') {
      summary.stability += definition.spec.stability
    }
  }

  summary.hp = summary.maxHp

  const capabilities = deriveMachineCapabilities(machine, catalog)

  // Movement aggregation is intentionally approximate until compact combat
  // movement derivation is finalized: x/z take the strongest axis-dominant
  // drive budget, xz takes the strongest omni-style budget.
  for (const movement of capabilities.movement) {
    const omni =
      movement.kind === 'omni_wheel' ||
      movement.kind === 'mecanum_wheel' ||
      movement.kind === 'articulated_leg' ||
      (movement.diagonalAxes?.length ?? 0) > 0
    const axis: 'x' | 'z' | 'xz' = omni
      ? 'xz'
      : Math.abs(movement.driveAxis[0]) >= Math.abs(movement.driveAxis[2])
        ? 'x'
        : 'z'

    summary.movement[axis] = Math.max(summary.movement[axis] ?? 0, movement.moveBudget)
  }

  for (const weapon of capabilities.weapons) {
    summary.weapons.push({
      id: weapon.partInstanceId,
      part: aliasForCatalogPartId(weapon.partId, catalogById),
      fireMode: weapon.fireMode,
      range: weapon.range,
      damage: weapon.damage,
      cooldown: weapon.cooldownTurns,
    })
  }

  for (const utility of capabilities.utility) {
    const definition = catalogById.get(utility.partId)
    const effect = definition?.spec.kind === 'utility' ? definition.spec.effect : utility.kind

    summary.utility.push({
      id: utility.partInstanceId,
      part: aliasForCatalogPartId(utility.partId, catalogById),
      effect,
    })
  }

  return summary
}

function compactStorePartFor(
  partId: string,
  catalogById: Map<string, PartDefinition>,
): CompactStorePart | undefined {
  const part = catalogById.get(partId)

  if (!part) {
    return undefined
  }

  const compact: CompactStorePart = {
    part: compactPartAlias(part),
    cost: part.cost,
    mass: part.mass,
    hp: Math.max(1, part.durability),
  }

  if (part.spec.kind === 'weapon') {
    compact.weapon = {
      fireMode: part.spec.fireMode,
      range: part.spec.range,
      damage: part.spec.damage,
      ...(part.spec.cooldownTurns ? { cooldown: part.spec.cooldownTurns } : {}),
      ...(part.signatureEffect ? { effect: part.signatureEffect.id } : {}),
    }
  }

  if (part.spec.kind === 'mobility') {
    // Store mobility is intrinsic part data; mounted x/z/xz axes are combat
    // facts that depend on orientation and do not belong in the store.
    compact.mobility = {
      mode: part.machineCapabilities?.movement?.mode ?? 'mobility',
      moveBudget: part.spec.moveBudget,
      traction: part.spec.traction,
      stability: part.spec.stability,
    }
  }

  if (part.spec.kind === 'armor') {
    compact.armor = part.spec.armor
  }

  if (part.spec.kind === 'utility') {
    compact.utility = { effect: part.spec.effect }
  }

  if (part.category === 'style' || part.stats.style) {
    compact.style = part.stats.style ?? 0
  }

  return compact
}

function compactStoreView(
  store: CatalogStoreView,
  catalogById: Map<string, PartDefinition>,
): { foundation: CompactStorePart[]; offers: CompactStorePart[] } {
  const foundationIds = new Set(store.foundationPartIds)
  const foundation = store.foundationPartIds
    .map((partId) => compactStorePartFor(partId, catalogById))
    .filter((part): part is CompactStorePart => Boolean(part))
  const offers = store.slots
    .map((slot) => slot.partId)
    .filter((partId) => !foundationIds.has(partId))
    .map((partId) => compactStorePartFor(partId, catalogById))
    .filter((part): part is CompactStorePart => Boolean(part))

  return { foundation, offers }
}

type LoadoutActionPayloadView = {
  type?: string
  instanceId?: string
  rotation?: number
  targetInstanceId?: string
}

function loadoutActions(actionSet: ActiveActionSet | undefined): CanonicalGameAction[] {
  return actionSet ? Object.values(actionSet.actions) : []
}

function subtreeInstanceIds(machineOrNull: MachineDesign | null, rootId: string): string[] {
  if (!machineOrNull) {
    return [rootId]
  }

  const childrenByParent = new Map<string, string[]>()

  for (const attachment of machineOrNull.attachments) {
    const children = childrenByParent.get(attachment.parentInstanceId) ?? []

    children.push(attachment.childInstanceId)
    childrenByParent.set(attachment.parentInstanceId, children)
  }

  const collected: string[] = []
  const queue = [rootId]

  while (queue.length > 0) {
    const next = queue.shift()

    if (!next || collected.includes(next)) {
      continue
    }

    collected.push(next)
    queue.push(...(childrenByParent.get(next) ?? []))
  }

  return collected
}

function partCostForInstance(
  buildState: LoadoutBuildState,
  instanceId: string,
  catalogById: Map<string, PartDefinition>,
): number {
  if (buildState.currentDesign.version === 'machine:v1') {
    const part = buildState.currentDesign.machine.parts.find(
      (candidate) => candidate.instanceId === instanceId,
    )

    if (!part || part.source !== 'catalog_part') {
      return 0
    }

    return catalogById.get(catalogPartIdFromDefinitionId(part.definitionId))?.cost ?? 0
  }

  const snapshot = buildState.currentDesign.design.parts.find(
    (candidate) => candidate.instanceId === instanceId,
  )

  return snapshot ? catalogById.get(snapshot.partId)?.cost ?? 0 : 0
}

function compactEditSurface(
  buildState: LoadoutBuildState,
  actionSet: ActiveActionSet | undefined,
  catalogById: Map<string, PartDefinition>,
): NonNullable<CompactBuildPacket['edit']> {
  const edit: NonNullable<CompactBuildPacket['edit']> = {
    confirm: false,
    remove: [],
    removeSubtree: [],
    move: [],
    rotate: [],
  }
  const machine =
    buildState.currentDesign.version === 'machine:v1' ? buildState.currentDesign.machine : null
  const rotateById = new Map<string, number[]>()

  for (const action of loadoutActions(actionSet)) {
    const payload = action.payload as LoadoutActionPayloadView

    switch (action.kind) {
      case 'confirm_loadout':
        edit.confirm = true
        break
      case 'remove_part':
        if (payload.instanceId) {
          edit.remove.push({
            id: payload.instanceId,
            refund: partCostForInstance(buildState, payload.instanceId, catalogById),
          })
        }
        break
      case 'remove_subtree':
        if (payload.instanceId) {
          const subtree = subtreeInstanceIds(machine, payload.instanceId)

          edit.removeSubtree.push({
            id: payload.instanceId,
            refund: subtree.reduce(
              (total, instanceId) =>
                total + partCostForInstance(buildState, instanceId, catalogById),
              0,
            ),
            parts: subtree.length,
          })
        }
        break
      case 'move_part':
        if (payload.instanceId) {
          edit.move.push(payload.instanceId)
        }
        break
      case 'rotate_part':
        if (payload.instanceId && typeof payload.rotation === 'number') {
          const rotations = rotateById.get(payload.instanceId) ?? []

          rotations.push(payload.rotation)
          rotateById.set(payload.instanceId, rotations)
        }
        break
      default:
        break
    }
  }

  for (const [id, rot] of rotateById) {
    edit.rotate.push({ id, rot: [...rot].sort((a, b) => a - b) })
  }

  return edit
}

function compactRequirements(
  actionSet: ActiveActionSet | undefined,
): NonNullable<CompactBuildPacket['requirements']> {
  const confirmAvailable = loadoutActions(actionSet).some(
    (action) => action.kind === 'confirm_loadout',
  )
  const blockers = (actionSet?.blockedActions ?? []).filter(
    (blocked) => blocked.kind === 'confirm_loadout',
  )
  const issues: ValidationIssue[] = blockers.flatMap((blocked) => blocked.issues ?? [])

  return {
    confirm_loadout: {
      ok: confirmAvailable && issues.length === 0,
      missing: [...new Set(issues.map((issue) => issue.code))],
      issues,
    },
  }
}

function compactSelected(
  buildState: LoadoutBuildState,
  catalogById: Map<string, PartDefinition>,
): CompactBuildPacket['selected'] {
  const target = buildState.selectedAttachTargetId

  if (buildState.selectedMovingPartId) {
    const movingInstanceId = buildState.selectedMovingPartId
    const canonicalPartId =
      buildState.selectedPartId ??
      (buildState.currentDesign.version === 'machine:v1'
        ? catalogPartIdFromDefinitionId(
            buildState.currentDesign.machine.parts.find(
              (part) => part.instanceId === movingInstanceId,
            )?.definitionId ?? movingInstanceId,
          )
        : buildState.currentDesign.design.parts.find(
            (part) => part.instanceId === movingInstanceId,
          )?.partId ?? movingInstanceId)

    return {
      mode: 'moving_existing_part',
      id: movingInstanceId,
      part: aliasForCatalogPartId(canonicalPartId, catalogById),
      canonicalPartId,
      ...(target ? { target } : {}),
    }
  }

  if (buildState.selectedPartId) {
    return {
      mode: 'new_part',
      part: aliasForCatalogPartId(buildState.selectedPartId, catalogById),
      canonicalPartId: buildState.selectedPartId,
      ...(target ? { target } : {}),
    }
  }

  return undefined
}

function compactTargets(actionSet: ActiveActionSet | undefined): string[] {
  const targets: string[] = []

  for (const action of loadoutActions(actionSet)) {
    if (action.kind !== 'choose_attach_target') {
      continue
    }

    const payload = action.payload as LoadoutActionPayloadView

    if (payload.targetInstanceId && !targets.includes(payload.targetInstanceId)) {
      targets.push(payload.targetInstanceId)
    }
  }

  return targets
}

function compactMounts(
  actionSet: ActiveActionSet | undefined,
): NonNullable<CompactBuildPacket['mounts']> {
  const mounts: NonNullable<CompactBuildPacket['mounts']> = []
  const seen = new Set<string>()

  for (const action of loadoutActions(actionSet)) {
    if (action.kind !== 'propose_mount_pose') {
      continue
    }

    for (const example of action.parameterExamples ?? []) {
      const surface = example.mountSurfaceId
      const u = example.u
      const v = example.v

      if (typeof surface !== 'string' || typeof u !== 'number' || typeof v !== 'number') {
        continue
      }

      const yaw = typeof example.yawDegrees === 'number' ? example.yawDegrees : 0
      const roll = typeof example.rollDegrees === 'number' ? example.rollDegrees : 0
      const key = `${surface}:${u}:${v}:${yaw}:${roll}`

      if (seen.has(key)) {
        continue
      }

      seen.add(key)
      mounts.push([surface, u, v, yaw, roll])
    }
  }

  return mounts
}

export function digestCompactBuildPacket(packet: CompactBuildPacket): string {
  const rest: Record<string, unknown> = { ...packet }

  delete rest.buildDigest

  const serialized = JSON.stringify(rest)
  let hash = 5381

  for (let index = 0; index < serialized.length; index += 1) {
    hash = ((hash << 5) + hash + serialized.charCodeAt(index)) | 0
  }

  return `cbv1:${(hash >>> 0).toString(16)}`
}
