import { PART_CATALOG } from '../../catalog/src/parts.js'
import type {
  ActiveActionSet,
  BotDesignSnapshot,
  BotPartSnapshot,
  CanonicalGameAction,
  CatalogStoreSlotKind,
  CatalogStoreView,
  GameMasterLegalAction,
  GridCoord,
  InventoryItem,
  LoadoutBuildState,
  PartCollisionPolicy,
  PartDefinition,
  PartMount,
  PartMountKind,
  PartMountMotion,
  TeamRole,
  ValidationIssue,
} from '../../schemas/src/index.js'

export const LOADOUT_CATALOG_VERSION = 'part-catalog:v1'
export const LOADOUT_PART_LIMIT = 12
export const RARE_SIGNATURE_STORE_MAX_COST = 42

const LOADOUT_ACTION_SCOPE = 'loadout_builder'
const ROTATION_OPTIONS = [0, 90, 180, 270] as const
const STORE_SLOT_KINDS = [
  'weapon',
  'weapon',
  'utility',
  'utility',
  'armor',
  'armor',
  'advanced_mobility',
  'wildcard',
  'wildcard',
  'wildcard',
] as const satisfies readonly CatalogStoreSlotKind[]
const FOUNDATION_PART_IDS = new Set([
  'Body_Square_Small',
  'Body_Square_Medium',
  'Body_Light_Frame',
  'Frame_Strut',
  'Mount_Plate',
  'Spacer_Block',
  'Wheel_Small',
  'Wheel_Medium',
  'Wheel_Large',
  'Tread_Light',
  'Armor_Light',
  'Weapon_Spear',
])
const BASIC_MOBILITY_PART_IDS = new Set([
  'Wheel_Small',
  'Wheel_Medium',
  'Wheel_Large',
  'Tread_Light',
])

type LoadoutActionPayloadBase = {
  scope: typeof LOADOUT_ACTION_SCOPE
  label: string
  summary: string
  catalogDigest?: string
  catalogRefs?: string[]
  requirements?: string[]
}

type LoadoutActionPayload =
  | (LoadoutActionPayloadBase & {
      type: 'choose_part'
      partId: string
    })
  | (LoadoutActionPayloadBase & {
      type: 'choose_attach_target'
      targetInstanceId: string
    })
  | (LoadoutActionPayloadBase & {
      type: 'choose_mount'
      mount: string
      mountKind: PartMountKind
      mountMotion: PartMountMotion
      collisionPolicy: PartCollisionPolicy
      sector?: string
      attachCell: GridCoord
    })
  | (LoadoutActionPayloadBase & {
      type: 'place_part'
      rotation: number
      attachCell: GridCoord
    })
  | (LoadoutActionPayloadBase & {
      type: 'remove_part'
      instanceId: string
    })
  | (LoadoutActionPayloadBase & {
      type: 'remove_subtree'
      instanceId: string
    })
  | (LoadoutActionPayloadBase & {
      type: 'move_part'
      instanceId: string
    })
  | (LoadoutActionPayloadBase & {
      type: 'rotate_part'
      instanceId: string
      rotation: number
    })
  | (LoadoutActionPayloadBase & {
      type: 'confirm_loadout'
    })

type BuildLoadoutActionSetInput = {
  role: TeamRole
  round: number
  decisionVersion: number
  actionSetId: string
  createdAt: string
  arenaVersion: string
  gold: number
  buildState?: LoadoutBuildState
  expiresAt?: string
  catalog?: PartDefinition[]
  storeSeed?: string
}

export type ApplyLoadoutActionInput = {
  role: TeamRole
  gold: number
  inventory: InventoryItem[]
  buildState?: LoadoutBuildState
  action: CanonicalGameAction
  catalog?: PartDefinition[]
}

export type ApplyLoadoutActionResult =
  | {
      ok: true
      gold: number
      inventory: InventoryItem[]
      buildState: LoadoutBuildState
      placedPartId?: string
      confirmed?: boolean
    }
  | {
      ok: false
      issues: ValidationIssue[]
    }

export function createInitialLoadoutBuildState(
  role: TeamRole,
  catalogVersion = LOADOUT_CATALOG_VERSION,
): LoadoutBuildState {
  return {
    step: 'choose_part',
    catalogVersion,
    currentDesign: {
      name: `${role} loadout`,
      parts: [],
    },
  }
}

export function ensureLoadoutBuildState(
  role: TeamRole,
  buildState?: LoadoutBuildState,
): LoadoutBuildState {
  if (!buildState) {
    return createInitialLoadoutBuildState(role)
  }

  return {
    ...buildState,
    catalogVersion: buildState.catalogVersion || LOADOUT_CATALOG_VERSION,
    selectedAttachCell: buildState.selectedAttachCell ? { ...buildState.selectedAttachCell } : undefined,
    currentDesign: cloneDesign(buildState.currentDesign),
  }
}

export type BuildCatalogStoreInput = {
  catalog?: PartDefinition[]
  role: TeamRole
  round: number
  seed: string
  gold: number
}

export function buildCatalogStore(input: BuildCatalogStoreInput): CatalogStoreView {
  const catalog = input.catalog ?? PART_CATALOG
  const foundationPartIds = foundationPartIdsFor(catalog)
  const slots = chooseStoreSlots(catalog, input)
  const offeredPartIds = [...new Set([...foundationPartIds, ...slots.map((slot) => slot.partId)])]

  return {
    id: `store.${input.seed}.r${input.round}.${input.role}`,
    seed: `${input.seed}/round-${input.round}/${input.role}`,
    role: input.role,
    foundationPartIds,
    slots,
    offeredPartIds,
  }
}

export function buildLoadoutActionSet(input: BuildLoadoutActionSetInput): ActiveActionSet {
  const buildState = ensureLoadoutBuildState(input.role, input.buildState)
  const catalog = input.catalog ?? PART_CATALOG
  const catalogStore = input.storeSeed
    ? buildCatalogStore({
        catalog,
        role: input.role,
        round: input.round,
        seed: input.storeSeed,
        gold: input.gold,
      })
    : undefined
  const actions = createLoadoutActions({
    role: input.role,
    round: input.round,
    decisionVersion: input.decisionVersion,
    gold: input.gold,
    buildState,
    catalog,
    store: catalogStore,
  })
  const catalogDigest = catalogDigestForActions(buildState.catalogVersion, actions)
  const actionsWithDigest = actions.map((action) => ({
    ...action,
    payload: {
      ...action.payload,
      catalogDigest,
    },
  }))

  return {
    actionSetId: input.actionSetId,
    role: input.role,
    phase: 'choose_loadout',
    round: input.round,
    fightId: `fight_${input.round}`,
    decisionVersion: input.decisionVersion,
    catalogVersion: LOADOUT_CATALOG_VERSION,
    catalogDigest,
    arenaVersion: input.arenaVersion,
    ...(catalogStore ? { catalogStore } : {}),
    createdAt: input.createdAt,
    ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
    actions: Object.fromEntries(actionsWithDigest.map((action) => [action.id, action])),
  }
}

export function applyLoadoutAction(input: ApplyLoadoutActionInput): ApplyLoadoutActionResult {
  if (!isLoadoutBuilderAction(input.action)) {
    return {
      ok: false,
      issues: [issue('INVALID_ACTION_KIND', 'actionId', 'Action is not a loadout builder action.')],
    }
  }

  const catalog = input.catalog ?? PART_CATALOG
  const partsById = partMap(catalog)
  const buildState = ensureLoadoutBuildState(input.role, input.buildState)
  const payload = input.action.payload as LoadoutActionPayload

  switch (payload.type) {
    case 'choose_part':
      return choosePart(input, buildState, partsById, payload.partId)
    case 'choose_attach_target':
      return chooseAttachTarget(input, buildState, payload.targetInstanceId)
    case 'choose_mount':
      return chooseMount(input, buildState, partsById, payload)
    case 'place_part':
      return placePart(input, buildState, partsById, payload.rotation, payload.attachCell)
    case 'remove_part':
      return removePart(input, buildState, partsById, payload.instanceId)
    case 'remove_subtree':
      return removeSubtree(input, buildState, partsById, payload.instanceId)
    case 'move_part':
      return movePart(input, buildState, payload.instanceId)
    case 'rotate_part':
      return rotateExistingPart(input, buildState, partsById, payload.instanceId, payload.rotation)
    case 'confirm_loadout':
      return confirmLoadout(input, buildState, partsById)
  }
}

export function isLoadoutBuilderAction(action: CanonicalGameAction): boolean {
  return (action.payload as { scope?: unknown }).scope === LOADOUT_ACTION_SCOPE
}

export function loadoutLegalActionForPacket(action: CanonicalGameAction): GameMasterLegalAction {
  const payload = action.payload as {
    label?: unknown
    summary?: unknown
    catalogDigest?: unknown
    catalogRefs?: unknown
    requirements?: unknown
  }
  const catalogRefs = Array.isArray(payload.catalogRefs)
    ? payload.catalogRefs.filter((catalogRef): catalogRef is string => typeof catalogRef === 'string')
    : undefined
  const requirements = Array.isArray(payload.requirements)
    ? payload.requirements.filter((requirement): requirement is string => typeof requirement === 'string')
    : undefined

  return {
    id: action.id,
    kind: action.kind,
    label: typeof payload.label === 'string' ? payload.label : action.id,
    summary: typeof payload.summary === 'string'
      ? payload.summary
      : 'Server-authored loadout action.',
    ...(typeof payload.catalogDigest === 'string' ? { catalogDigest: payload.catalogDigest } : {}),
    ...(catalogRefs && catalogRefs.length > 0 ? { catalogRefs } : {}),
    ...(requirements && requirements.length > 0 ? { requirements } : {}),
  }
}

export function validateMinimumViableLoadout(
  design: BotDesignSnapshot,
  catalog: PartDefinition[] = PART_CATALOG,
): ValidationIssue[] {
  const partsById = partMap(catalog)
  let hasCore = false
  let hasMovement = false
  let hasGroundSupport = false
  let hasWeapon = false
  const issues: ValidationIssue[] = []

  for (const part of design.parts) {
    const definition = partsById.get(part.partId)

    if (!definition) {
      return [issue('UNKNOWN_PART', 'buildState.currentDesign.parts', `${part.partId} is not in the catalog.`)]
    }

    hasCore ||= isCoreBodyPart(definition)
    hasMovement ||= definition.spec.kind === 'mobility' && definition.spec.moveBudget > 0
    hasGroundSupport ||= definition.spec.kind === 'mobility' &&
      definition.spec.moveBudget > 0 &&
      definition.footprint.groundContact === 'required'
    hasWeapon ||= definition.spec.kind === 'weapon' && definition.spec.damage > 0

    if (definition.footprint.minY < 0) {
      issues.push(issue('PART_BELOW_FLOOR', 'buildState.currentDesign.parts', `${definition.displayName} has a below-floor footprint.`))
    }

    if (definition.spec.kind === 'weapon' && part.mountSector === 'below_floor') {
      issues.push(issue('WEAPON_EMITTER_BELOW_FLOOR', 'buildState.currentDesign.parts', `${definition.displayName} emitter is below the arena floor.`))
    }
  }

  issues.push(...validateActiveSignatureEffect(design, partsById))

  if (!hasCore) {
    issues.push(issue('MISSING_CORE', 'buildState.currentDesign.parts', 'Confirm requires a non-filler body/core.'))
  }

  if (!hasMovement) {
    issues.push(issue('MISSING_MOBILITY', 'buildState.currentDesign.parts', 'Confirm requires at least one mobility part.'))
  }

  if (hasMovement && !hasGroundSupport) {
    issues.push(issue('MISSING_GROUND_SUPPORT', 'buildState.currentDesign.parts', 'Confirm requires mobility with valid ground support.'))
  }

  if (!hasWeapon) {
    issues.push(issue('MISSING_WEAPON', 'buildState.currentDesign.parts', 'Confirm requires at least one weapon-capable part.'))
  }

  if (!isConnectedDesign(design)) {
    issues.push(issue('DISCONNECTED_DESIGN', 'buildState.currentDesign.parts', 'Confirm requires all parts to stay connected.'))
  }

  return issues
}

type CreateLoadoutActionsInput = {
  role: TeamRole
  round: number
  decisionVersion: number
  gold: number
  buildState: LoadoutBuildState
  catalog: PartDefinition[]
  store?: CatalogStoreView
}

function createLoadoutActions(input: CreateLoadoutActionsInput): CanonicalGameAction[] {
  switch (input.buildState.step) {
    case 'choose_part':
    case 'ready_to_confirm':
      return choosePartActions(input)
    case 'choose_attach_target':
      return attachTargetActions(input)
    case 'choose_mount':
      return mountActions(input)
    case 'choose_rotation':
      return rotationActions(input)
  }
}

function choosePartActions(input: CreateLoadoutActionsInput): CanonicalGameAction[] {
  const actions: CanonicalGameAction[] = []
  const minimumIssues = validateMinimumViableLoadout(input.buildState.currentDesign, input.catalog)

  if (minimumIssues.length === 0) {
    actions.push(loadoutAction(input, 'confirm_loadout', 'confirm_loadout', {
      scope: LOADOUT_ACTION_SCOPE,
      type: 'confirm_loadout',
      label: 'Confirm loadout',
      summary: 'Locks this server-built design for the fight.',
    }))
  }

  actions.push(...editExistingPartActions(input))

  const storePartIds = input.store ? new Set(input.store.offeredPartIds) : undefined
  const choices = input.catalog.filter((part) => {
    if (storePartIds && !storePartIds.has(part.id)) {
      return false
    }

    if (part.cost > input.gold) {
      return false
    }

    if (input.buildState.currentDesign.parts.length === 0) {
      return isCoreBodyPart(part)
    }

    return true
  })

  for (const part of choices) {
    actions.push(loadoutAction(input, 'choose_part', `choose_part.${part.id}`, {
      scope: LOADOUT_ACTION_SCOPE,
      type: 'choose_part',
      label: part.displayName,
      summary: catalogSummary(part),
      partId: part.id,
      catalogRefs: [part.id],
    }))
  }

  return actions
}

function editExistingPartActions(input: CreateLoadoutActionsInput): CanonicalGameAction[] {
  const partsById = partMap(input.catalog)
  const actions: CanonicalGameAction[] = []

  for (const part of input.buildState.currentDesign.parts) {
    const definition = partsById.get(part.partId)
    const children = childrenOf(input.buildState.currentDesign, part.instanceId)

    if (!definition) {
      continue
    }

    if (children.length === 0) {
      actions.push(loadoutAction(input, 'remove_part', `remove.${part.instanceId}`, {
        scope: LOADOUT_ACTION_SCOPE,
        type: 'remove_part',
        label: `Remove ${definition.displayName}`,
        summary: `Removes ${part.instanceId} from the unconfirmed draft and refunds ${definition.cost} gold.`,
        instanceId: part.instanceId,
        catalogRefs: [definition.id],
      }))

      if (part.instanceId !== input.buildState.currentDesign.rootInstanceId || input.buildState.currentDesign.parts.length === 1) {
        actions.push(loadoutAction(input, 'move_part', `move.${part.instanceId}`, {
          scope: LOADOUT_ACTION_SCOPE,
          type: 'move_part',
          label: `Remount ${definition.displayName}`,
          summary: `Lifts leaf part ${part.instanceId} back into the server-owned mount flow without refunding or repurchasing it.`,
          instanceId: part.instanceId,
          catalogRefs: [definition.id],
        }))
      }
    } else {
      const refund = subtreeParts(input.buildState.currentDesign, part.instanceId)
        .reduce((total, entry) => total + (partsById.get(entry.partId)?.cost ?? 0), 0)

      actions.push(loadoutAction(input, 'remove_subtree', `remove_subtree.${part.instanceId}`, {
        scope: LOADOUT_ACTION_SCOPE,
        type: 'remove_subtree',
        label: `Remove ${definition.displayName} subtree`,
        summary: `Removes ${part.instanceId} and ${children.length} attached descendant(s), refunding ${refund} gold in this draft.`,
        instanceId: part.instanceId,
        catalogRefs: subtreeParts(input.buildState.currentDesign, part.instanceId).map((entry) => entry.partId),
      }))
    }

    for (const rotation of rotationOptionsForExistingPart(part, input.buildState.currentDesign, partsById)) {
      if (rotation === (part.rotation ?? 0)) {
        continue
      }

      actions.push(loadoutAction(input, 'rotate_part', `rotate_existing.${part.instanceId}.${rotation}`, {
        scope: LOADOUT_ACTION_SCOPE,
        type: 'rotate_part',
        label: `Rotate ${definition.displayName} to ${rotation}`,
        summary: `Uses a server rotation action to rotate ${part.instanceId} to ${rotation} degrees.`,
        instanceId: part.instanceId,
        rotation,
        catalogRefs: [definition.id],
      }))
    }
  }

  return actions
}

function attachTargetActions(input: CreateLoadoutActionsInput): CanonicalGameAction[] {
  const part = selectedCatalogPart(input)

  if (!part) {
    return []
  }

  if (input.buildState.currentDesign.parts.length === 0) {
    return [
      loadoutAction(input, 'choose_attach_target', `attach.root.${part.id}`, {
        scope: LOADOUT_ACTION_SCOPE,
        type: 'choose_attach_target',
        label: 'Start new frame at root',
        summary: `Places ${part.displayName} as the server-created root part.`,
        targetInstanceId: 'root',
        requirements: ['Design is currently empty.'],
      }),
    ]
  }

  const partsById = partMap(input.catalog)

  return input.buildState.currentDesign.parts
    .filter((targetPart) => targetPart.instanceId !== input.buildState.selectedMovingPartId)
    .filter((targetPart) => targetAcceptsPart(targetPart, part, partsById))
    .map((targetPart) => loadoutAction(
      input,
      'choose_attach_target',
      `attach.${part.id}.to.${targetPart.instanceId}`,
      {
        scope: LOADOUT_ACTION_SCOPE,
        type: 'choose_attach_target',
        label: `Attach to ${partLabel(targetPart, input.catalog)}`,
        summary: `Uses ${targetPart.instanceId} as the attachment target. Legal mounts come from that part's catalog affordances.`,
        targetInstanceId: targetPart.instanceId,
      },
    ))
}

function mountActions(input: CreateLoadoutActionsInput): CanonicalGameAction[] {
  const part = selectedCatalogPart(input)
  const target = selectedTarget(input)
  const partsById = partMap(input.catalog)

  if (!part || !target) {
    return []
  }

  if (target === 'root') {
    return [
      loadoutAction(input, 'choose_mount', `mount.${part.id}.root.center`, {
        scope: LOADOUT_ACTION_SCOPE,
        type: 'choose_mount',
        label: 'Use root cell',
        summary: `Starts the design with ${part.displayName} at the root cell.`,
        mount: 'center',
        mountKind: 'internal_slot',
        mountMotion: 'static',
        collisionPolicy: 'internal_only',
        attachCell: { x: 0, z: 0 },
      }),
    ]
  }

  const targetDefinition = partsById.get(target.partId)

  if (!targetDefinition) {
    return []
  }

  return targetDefinition.mounts
    .filter((mount) => mount.accepts.includes(part.category))
    .flatMap((mount) => mountSectors(mount).flatMap((sector) => {
      const attachCell = cellForMount(target.cell, mount, sector)

      if (!isAttachCellAllowed(input.buildState.currentDesign, attachCell, mount.collisionPolicy)) {
        return []
      }

      return [
        loadoutAction(input, 'choose_mount', `mount.${part.id}.${target.instanceId}.${mount.id}.${sector ?? 'default'}`, {
          scope: LOADOUT_ACTION_SCOPE,
          type: 'choose_mount',
          label: `${mountLabel(mount, sector)} of ${partLabel(target, input.catalog)}`,
          summary: mountSummary(part, targetDefinition, mount, sector),
          mount: mount.id,
          mountKind: mount.kind,
          mountMotion: mount.motion,
          collisionPolicy: mount.collisionPolicy,
          ...(sector ? { sector } : {}),
          attachCell,
          catalogRefs: [part.id, targetDefinition.id],
        }),
      ]
    }))
}

function rotationActions(input: CreateLoadoutActionsInput): CanonicalGameAction[] {
  const part = selectedCatalogPart(input)

  if (!part || !input.buildState.selectedMount) {
    return []
  }

  const attachCell = input.buildState.selectedAttachCell

  if (!attachCell) {
    return []
  }

  const rotations = selectedRotationOptions(input)

  return rotations.map((rotation) => loadoutAction(
    input,
    'choose_rotation',
    `rotate.${part.id}.${rotation}`,
    {
      scope: LOADOUT_ACTION_SCOPE,
      type: 'place_part',
      label: `Rotate ${rotation} degrees`,
      summary: `Places ${part.displayName} at (${attachCell.x}, ${attachCell.z}) with ${rotation} degree server-owned rotation.`,
      rotation,
      attachCell,
      catalogRefs: [part.id],
    },
  ))
}

function choosePart(
  input: ApplyLoadoutActionInput,
  buildState: LoadoutBuildState,
  partsById: Map<string, PartDefinition>,
  partId: string,
): ApplyLoadoutActionResult {
  const part = partsById.get(partId)

  if (!part) {
    return fail('UNKNOWN_PART', 'actionId', `${partId} is not in the catalog.`)
  }

  if (part.cost > input.gold) {
    return fail('INSUFFICIENT_GOLD', 'resources.remainingGold', `${part.displayName} costs ${part.cost}, but only ${input.gold} gold is available.`)
  }

  return ok(input, {
    ...buildState,
    step: 'choose_attach_target',
    selectedPartId: part.id,
    selectedMovingPartId: undefined,
    selectedAttachTargetId: undefined,
    selectedMount: undefined,
    selectedMountKind: undefined,
    selectedMountMotion: undefined,
    selectedMountCollisionPolicy: undefined,
    selectedMountSector: undefined,
    selectedAttachCell: undefined,
    selectedRotation: undefined,
  })
}

function chooseAttachTarget(
  input: ApplyLoadoutActionInput,
  buildState: LoadoutBuildState,
  targetInstanceId: string,
): ApplyLoadoutActionResult {
  if (!buildState.selectedPartId) {
    return fail('MISSING_SELECTED_PART', 'buildState.selectedPartId', 'Choose a part before choosing an attachment target.')
  }

  if (
    targetInstanceId !== 'root' &&
    !buildState.currentDesign.parts.some((part) => part.instanceId === targetInstanceId)
  ) {
    return fail('INVALID_ATTACH_TARGET', 'actionId', `${targetInstanceId} is not in the current design.`)
  }

  return ok(input, {
    ...buildState,
    step: 'choose_mount',
    selectedAttachTargetId: targetInstanceId,
    selectedMount: undefined,
    selectedMountKind: undefined,
    selectedMountMotion: undefined,
    selectedMountCollisionPolicy: undefined,
    selectedMountSector: undefined,
    selectedAttachCell: undefined,
    selectedRotation: undefined,
  })
}

function chooseMount(
  input: ApplyLoadoutActionInput,
  buildState: LoadoutBuildState,
  partsById: Map<string, PartDefinition>,
  payload: Extract<LoadoutActionPayload, { type: 'choose_mount' }>,
): ApplyLoadoutActionResult {
  const placement = resolveMountPlacement(buildState, partsById, payload.mount, payload.attachCell, payload.sector)

  if (!placement.ok) {
    return { ok: false, issues: placement.issues }
  }

  return ok(input, {
    ...buildState,
    step: 'choose_rotation',
    selectedMount: placement.mountId,
    selectedMountKind: placement.mountKind,
    selectedMountMotion: placement.mountMotion,
    selectedMountCollisionPolicy: placement.collisionPolicy,
    selectedMountSector: placement.sector,
    selectedAttachCell: placement.attachCell,
    selectedRotation: undefined,
  })
}

function placePart(
  input: ApplyLoadoutActionInput,
  buildState: LoadoutBuildState,
  partsById: Map<string, PartDefinition>,
  rotation: number,
  attachCell: GridCoord,
): ApplyLoadoutActionResult {
  if (!buildState.selectedPartId || !buildState.selectedAttachTargetId || !buildState.selectedMount) {
    return fail('INCOMPLETE_PLACEMENT', 'buildState', 'Placement requires a part, target, mount, and rotation.')
  }

  const part = partsById.get(buildState.selectedPartId)
  const movingPartId = buildState.selectedMovingPartId

  if (!part) {
    return fail('UNKNOWN_PART', 'buildState.selectedPartId', `${buildState.selectedPartId} is not in the catalog.`)
  }

  const placement = resolveMountPlacement(buildState, partsById, buildState.selectedMount, attachCell, buildState.selectedMountSector)

  if (!placement.ok) {
    return { ok: false, issues: placement.issues }
  }

  if (!placement.rotationOptions.includes(rotation)) {
    return fail('INVALID_ROTATION', 'actionId', `${rotation} is not available for mount ${buildState.selectedMount}.`)
  }

  if (part.footprint.minY < 0) {
    return fail('PART_BELOW_FLOOR', 'actionId', `${part.displayName} would be below the arena floor.`)
  }

  if (!movingPartId && part.cost > input.gold) {
    return fail('INSUFFICIENT_GOLD', 'resources.remainingGold', `${part.displayName} costs ${part.cost}, but only ${input.gold} gold is available.`)
  }

  if (!movingPartId && buildState.currentDesign.parts.length >= LOADOUT_PART_LIMIT) {
    return fail('PART_LIMIT_REACHED', 'buildState.currentDesign.parts', `Loadouts are limited to ${LOADOUT_PART_LIMIT} parts.`)
  }

  if (!isAttachCellAllowed(buildState.currentDesign, attachCell, placement.collisionPolicy)) {
    return fail('OCCUPIED_ATTACH_CELL', 'actionId', `Attach cell ${attachCell.x},${attachCell.z} is already occupied.`)
  }

  const instanceId = movingPartId ?? nextInstanceId(buildState.currentDesign)
  const signatureEffectActive = part.signatureEffect !== undefined &&
    (movingPartId
      ? buildState.currentDesign.activeSignaturePartInstanceId === movingPartId
      : buildState.currentDesign.activeSignaturePartInstanceId === undefined)
  const placedPart: BotPartSnapshot = {
    instanceId,
    partId: part.id,
    cell: attachCell,
    rotation,
    ...(placement.parentInstanceId ? { parentInstanceId: placement.parentInstanceId } : {}),
    mountId: placement.mountId,
    mountKind: placement.mountKind,
    mountMotion: placement.mountMotion,
    mountCollisionPolicy: placement.collisionPolicy,
    ...(placement.sector ? { mountSector: placement.sector } : {}),
    ...(signatureEffectActive ? { signatureEffectActive: true } : {}),
    health: part.durability,
  }
  const nextDesign: BotDesignSnapshot = {
    ...buildState.currentDesign,
    rootInstanceId: buildState.currentDesign.rootInstanceId ?? instanceId,
    activeSignaturePartInstanceId: signatureEffectActive
      ? instanceId
      : buildState.currentDesign.activeSignaturePartInstanceId,
    parts: [...buildState.currentDesign.parts, placedPart],
  }

  return {
    ok: true,
    gold: movingPartId ? input.gold : input.gold - part.cost,
    inventory: movingPartId ? input.inventory : incrementInventory(input.inventory, part.id),
    placedPartId: part.id,
    buildState: {
      step: 'choose_part',
      catalogVersion: buildState.catalogVersion,
      currentDesign: nextDesign,
    },
  }
}

function removePart(
  input: ApplyLoadoutActionInput,
  buildState: LoadoutBuildState,
  partsById: Map<string, PartDefinition>,
  instanceId: string,
): ApplyLoadoutActionResult {
  if (childrenOf(buildState.currentDesign, instanceId).length > 0) {
    return fail('PART_HAS_DEPENDENTS', 'actionId', `${instanceId} has attached children; use remove_subtree.`)
  }

  return removePartInstances(input, buildState, partsById, new Set([instanceId]))
}

function removeSubtree(
  input: ApplyLoadoutActionInput,
  buildState: LoadoutBuildState,
  partsById: Map<string, PartDefinition>,
  instanceId: string,
): ApplyLoadoutActionResult {
  const ids = subtreeIds(buildState.currentDesign, instanceId)

  if (ids.size === 0) {
    return fail('UNKNOWN_PART_INSTANCE', 'actionId', `${instanceId} is not in the current design.`)
  }

  return removePartInstances(input, buildState, partsById, ids)
}

function movePart(
  input: ApplyLoadoutActionInput,
  buildState: LoadoutBuildState,
  instanceId: string,
): ApplyLoadoutActionResult {
  const movingPart = buildState.currentDesign.parts.find((part) => part.instanceId === instanceId)

  if (!movingPart) {
    return fail('UNKNOWN_PART_INSTANCE', 'actionId', `${instanceId} is not in the current design.`)
  }

  if (childrenOf(buildState.currentDesign, instanceId).length > 0) {
    return fail('PART_HAS_DEPENDENTS', 'actionId', `${instanceId} has attached children; move leaf parts or remove_subtree first.`)
  }

  if (instanceId === buildState.currentDesign.rootInstanceId && buildState.currentDesign.parts.length > 1) {
    return fail('CANNOT_MOVE_ROOT_WITH_DEPENDENTS', 'actionId', 'Move the root only after detaching the rest of the draft.')
  }

  const nextDesign = {
    ...buildState.currentDesign,
    parts: buildState.currentDesign.parts.filter((part) => part.instanceId !== instanceId),
  }

  return ok(input, {
    ...buildState,
    step: 'choose_attach_target',
    selectedPartId: movingPart.partId,
    selectedMovingPartId: movingPart.instanceId,
    selectedAttachTargetId: undefined,
    selectedMount: undefined,
    selectedMountKind: undefined,
    selectedMountMotion: undefined,
    selectedMountCollisionPolicy: undefined,
    selectedMountSector: undefined,
    selectedAttachCell: undefined,
    selectedRotation: undefined,
    currentDesign: {
      ...nextDesign,
      rootInstanceId: nextDesign.rootInstanceId === instanceId
        ? nextDesign.parts[0]?.instanceId
        : nextDesign.rootInstanceId,
    },
  })
}

function rotateExistingPart(
  input: ApplyLoadoutActionInput,
  buildState: LoadoutBuildState,
  partsById: Map<string, PartDefinition>,
  instanceId: string,
  rotation: number,
): ApplyLoadoutActionResult {
  const existing = buildState.currentDesign.parts.find((part) => part.instanceId === instanceId)

  if (!existing) {
    return fail('UNKNOWN_PART_INSTANCE', 'actionId', `${instanceId} is not in the current design.`)
  }

  const rotations = rotationOptionsForExistingPart(existing, buildState.currentDesign, partsById)

  if (!rotations.includes(rotation)) {
    return fail('INVALID_ROTATION', 'actionId', `${rotation} is not available for ${instanceId}.`)
  }

  return ok(input, {
    ...buildState,
    step: 'choose_part',
    selectedPartId: undefined,
    selectedMovingPartId: undefined,
    selectedAttachTargetId: undefined,
    selectedMount: undefined,
    selectedMountKind: undefined,
    selectedMountMotion: undefined,
    selectedMountCollisionPolicy: undefined,
    selectedMountSector: undefined,
    selectedAttachCell: undefined,
    selectedRotation: undefined,
    currentDesign: {
      ...buildState.currentDesign,
      parts: buildState.currentDesign.parts.map((part) => part.instanceId === instanceId
        ? { ...part, rotation }
        : part),
    },
  })
}

function confirmLoadout(
  input: ApplyLoadoutActionInput,
  buildState: LoadoutBuildState,
  partsById: Map<string, PartDefinition>,
): ApplyLoadoutActionResult {
  const issues = validateMinimumViableLoadout(buildState.currentDesign, [...partsById.values()])

  if (issues.length > 0) {
    return { ok: false, issues }
  }

  return {
    ok: true,
    gold: input.gold,
    inventory: input.inventory,
    buildState: {
      step: 'ready_to_confirm',
      catalogVersion: buildState.catalogVersion,
      currentDesign: cloneDesign(buildState.currentDesign),
    },
    confirmed: true,
  }
}

function loadoutAction(
  input: CreateLoadoutActionsInput,
  kind: CanonicalGameAction['kind'],
  suffix: string,
  payload: LoadoutActionPayload,
): CanonicalGameAction {
  return {
    id: `build.${input.role}.r${input.round}.v${input.decisionVersion}.${suffix}`,
    kind,
    role: input.role,
    payload: { ...payload },
  }
}

function selectedCatalogPart(input: CreateLoadoutActionsInput): PartDefinition | undefined {
  return input.catalog.find((part) => part.id === input.buildState.selectedPartId)
}

function selectedTarget(input: CreateLoadoutActionsInput): BotPartSnapshot | 'root' | undefined {
  if (input.buildState.selectedAttachTargetId === 'root') {
    return 'root'
  }

  return input.buildState.currentDesign.parts.find(
    (part) => part.instanceId === input.buildState.selectedAttachTargetId,
  )
}

type MountPlacement =
  | {
      ok: true
      mountId: string
      mountKind: PartMountKind
      mountMotion: PartMountMotion
      collisionPolicy: PartCollisionPolicy
      rotationOptions: number[]
      attachCell: GridCoord
      parentInstanceId?: string
      sector?: string
    }
  | {
      ok: false
      issues: ValidationIssue[]
    }

function targetAcceptsPart(
  targetPart: BotPartSnapshot,
  selectedPart: PartDefinition,
  partsById: Map<string, PartDefinition>,
): boolean {
  const targetDefinition = partsById.get(targetPart.partId)

  return Boolean(targetDefinition?.mounts.some((mount) => mount.accepts.includes(selectedPart.category)))
}

function mountSectors(mount: PartMount): (string | undefined)[] {
  return mount.sectors && mount.sectors.length > 0 ? mount.sectors : [undefined]
}

function cellForMount(cell: GridCoord | undefined, mount: PartMount, sector: string | undefined): GridCoord {
  const origin = cell ?? { x: 0, z: 0 }

  if (mount.kind !== 'side_socket') {
    return { ...origin }
  }

  switch (sector) {
    case 'front':
      return { x: origin.x, z: origin.z + 1 }
    case 'rear':
      return { x: origin.x, z: origin.z - 1 }
    case 'left':
      return { x: origin.x - 1, z: origin.z }
    case 'right':
    case 'outer':
      return { x: origin.x + 1, z: origin.z }
    default:
      return { ...origin }
  }
}

function isOccupied(design: BotDesignSnapshot, cell: GridCoord): boolean {
  return design.parts.some((part) => part.cell?.x === cell.x && part.cell.z === cell.z)
}

function isAttachCellAllowed(
  design: BotDesignSnapshot,
  cell: GridCoord,
  collisionPolicy: PartCollisionPolicy,
): boolean {
  if (collisionPolicy === 'allow_clip_v1' || collisionPolicy === 'internal_only') {
    return true
  }

  return !isOccupied(design, cell)
}

function selectedRotationOptions(input: CreateLoadoutActionsInput): number[] {
  const partsById = partMap(input.catalog)
  const placement = input.buildState.selectedMount
    ? resolveMountPlacement(
        input.buildState,
        partsById,
        input.buildState.selectedMount,
        input.buildState.selectedAttachCell ?? { x: 0, z: 0 },
        input.buildState.selectedMountSector,
      )
    : undefined

  return placement?.ok ? placement.rotationOptions : [...ROTATION_OPTIONS]
}

function resolveMountPlacement(
  buildState: LoadoutBuildState,
  partsById: Map<string, PartDefinition>,
  mountId: string,
  attachCell: GridCoord,
  sector: string | undefined,
): MountPlacement {
  if (!buildState.selectedPartId || !buildState.selectedAttachTargetId) {
    return failPlacement('INCOMPLETE_PLACEMENT', 'buildState', 'Choose a part and attachment target before choosing a mount.')
  }

  const selectedPart = partsById.get(buildState.selectedPartId)

  if (!selectedPart) {
    return failPlacement('UNKNOWN_PART', 'buildState.selectedPartId', `${buildState.selectedPartId} is not in the catalog.`)
  }

  if (buildState.selectedAttachTargetId === 'root') {
    if (buildState.currentDesign.parts.length > 0) {
      return failPlacement('INVALID_ATTACH_TARGET', 'buildState.selectedAttachTargetId', 'Root placement is only valid for an empty draft.')
    }

    if (mountId !== 'center' || !sameCell(attachCell, { x: 0, z: 0 })) {
      return failPlacement('INVALID_MOUNT', 'actionId', 'Root placement must use the server-owned center mount.')
    }

    return {
      ok: true,
      mountId: 'center',
      mountKind: 'internal_slot',
      mountMotion: 'static',
      collisionPolicy: 'internal_only',
      rotationOptions: [...ROTATION_OPTIONS],
      attachCell: { x: 0, z: 0 },
    }
  }

  const targetPart = buildState.currentDesign.parts.find(
    (part) => part.instanceId === buildState.selectedAttachTargetId,
  )
  const targetDefinition = targetPart ? partsById.get(targetPart.partId) : undefined

  if (!targetPart || !targetDefinition) {
    return failPlacement('INVALID_ATTACH_TARGET', 'buildState.selectedAttachTargetId', `${buildState.selectedAttachTargetId} is not in the current design.`)
  }

  const mount = targetDefinition.mounts.find((candidate) => candidate.id === mountId)

  if (!mount || !mount.accepts.includes(selectedPart.category)) {
    return failPlacement('INVALID_MOUNT', 'actionId', `${targetDefinition.displayName} does not expose mount ${mountId} for ${selectedPart.category}.`)
  }

  if (sector !== undefined && !mountSectors(mount).includes(sector)) {
    return failPlacement('INVALID_MOUNT_SECTOR', 'actionId', `${sector} is not a legal sector for mount ${mountId}.`)
  }

  const expectedCell = cellForMount(targetPart.cell, mount, sector)

  if (!sameCell(attachCell, expectedCell)) {
    return failPlacement('RAW_TRANSFORM_REJECTED', 'actionId', 'Placement cells are server-owned; raw transform payloads are not accepted.')
  }

  if (!isAttachCellAllowed(buildState.currentDesign, expectedCell, mount.collisionPolicy)) {
    return failPlacement('OCCUPIED_ATTACH_CELL', 'actionId', `Attach cell ${expectedCell.x},${expectedCell.z} is already occupied.`)
  }

  return {
    ok: true,
    mountId: mount.id,
    mountKind: mount.kind,
    mountMotion: mount.motion,
    collisionPolicy: mount.collisionPolicy,
    rotationOptions: mount.rotationOptions,
    attachCell: expectedCell,
    parentInstanceId: targetPart.instanceId,
    ...(sector ? { sector } : {}),
  }
}

function failPlacement(code: string, path: string, message: string): Extract<MountPlacement, { ok: false }> {
  return {
    ok: false,
    issues: [issue(code, path, message)],
  }
}

function sameCell(left: GridCoord, right: GridCoord): boolean {
  return left.x === right.x && left.z === right.z
}

function isConnectedDesign(design: BotDesignSnapshot): boolean {
  if (design.parts.length <= 1) {
    return true
  }

  if (design.parts.some((part) => part.parentInstanceId)) {
    return isConnectedGraphDesign(design)
  }

  const byId = new Map(design.parts.map((part) => [part.instanceId, part]))
  const rootId = design.rootInstanceId ?? design.parts[0]?.instanceId
  const root = rootId ? byId.get(rootId) : undefined

  if (!root?.cell) {
    return false
  }

  const visited = new Set<string>()
  const queue = [root]

  while (queue.length > 0) {
    const current = queue.shift()

    if (!current) {
      continue
    }

    visited.add(current.instanceId)

    for (const candidate of design.parts) {
      if (visited.has(candidate.instanceId) || !candidate.cell || !current.cell) {
        continue
      }

      if (gridDistance(current.cell, candidate.cell) === 1) {
        visited.add(candidate.instanceId)
        queue.push(candidate)
      }
    }
  }

  return visited.size === design.parts.length
}

function isConnectedGraphDesign(design: BotDesignSnapshot): boolean {
  const byId = new Map(design.parts.map((part) => [part.instanceId, part]))
  const rootId = design.rootInstanceId ?? design.parts[0]?.instanceId

  if (!rootId || !byId.has(rootId)) {
    return false
  }

  for (const part of design.parts) {
    if (part.instanceId !== rootId && (!part.parentInstanceId || !byId.has(part.parentInstanceId))) {
      return false
    }
  }

  const visited = new Set<string>()
  const queue = [rootId]

  while (queue.length > 0) {
    const currentId = queue.shift()

    if (!currentId || visited.has(currentId)) {
      continue
    }

    visited.add(currentId)

    for (const child of childrenOf(design, currentId)) {
      queue.push(child.instanceId)
    }
  }

  return visited.size === design.parts.length
}

function gridDistance(left: GridCoord, right: GridCoord): number {
  return Math.abs(left.x - right.x) + Math.abs(left.z - right.z)
}

function isCoreBodyPart(part: PartDefinition): boolean {
  return part.category === 'body' && !part.tags.includes('filler')
}

function validateActiveSignatureEffect(
  design: BotDesignSnapshot,
  partsById: Map<string, PartDefinition>,
): ValidationIssue[] {
  const activeParts = design.parts.filter((part) => part.signatureEffectActive)
  const issues: ValidationIssue[] = []

  if (activeParts.length > 1) {
    issues.push(issue('MULTIPLE_ACTIVE_SIGNATURE_EFFECTS', 'buildState.currentDesign.parts', 'V1 allows only one active style signature effect per bot.'))
  }

  if (
    design.activeSignaturePartInstanceId &&
    !activeParts.some((part) => part.instanceId === design.activeSignaturePartInstanceId)
  ) {
    issues.push(issue('ACTIVE_SIGNATURE_MISMATCH', 'buildState.currentDesign.activeSignaturePartInstanceId', 'Active signature marker must match the active style part.'))
  }

  for (const part of activeParts) {
    const definition = partsById.get(part.partId)

    if (!definition?.signatureEffect || definition.category !== 'style') {
      issues.push(issue('INVALID_ACTIVE_SIGNATURE_EFFECT', 'buildState.currentDesign.parts', `${part.instanceId} is not a style signature part.`))
    }
  }

  return issues
}

function catalogSummary(part: PartDefinition): string {
  const traits = [
    `${part.category} part`,
    `${part.rarity} rarity`,
    `${part.cost} gold`,
    `${part.mass} mass`,
    `${part.durability} durability`,
  ]

  if (part.controls?.movement) {
    traits.push('movement control')
  }

  if (part.controls?.weapon) {
    traits.push('weapon control')
  }

  if (part.controls?.utility) {
    traits.push('utility control')
  }

  return traits.join(', ')
}

function partLabel(part: BotPartSnapshot, catalog: PartDefinition[]): string {
  const definition = catalog.find((entry) => entry.id === part.partId)

  return `${definition?.displayName ?? part.partId} (${part.instanceId})`
}

function mountLabel(mount: PartMount, sector: string | undefined): string {
  const label = mount.id
    .split('_')
    .filter((part) => part.length > 0)
    .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
    .join(' ')

  return sector ? `${label} (${sector.replaceAll('_', ' ')})` : label
}

function mountSummary(
  part: PartDefinition,
  target: PartDefinition,
  mount: PartMount,
  sector: string | undefined,
): string {
  const motion = mount.motion === 'static'
    ? 'static mount'
    : mount.motion === 'inherits_parent_spin'
      ? 'inherits parent spin; weapon envelopes resolve as sweeps when applicable'
      : 'inherits parent swing'
  const clipping = mount.collisionPolicy === 'allow_clip_v1'
    ? 'part clipping is allowed for V1'
    : mount.collisionPolicy === 'internal_only'
      ? 'internal-only placement'
      : 'overlap is rejected'

  return `Attach ${part.displayName} to ${target.displayName} ${mount.kind}${sector ? ` sector ${sector}` : ''}; ${motion}; ${clipping}.`
}

function nextInstanceId(design: BotDesignSnapshot): string {
  let next = design.parts.length + 1
  const existing = new Set(design.parts.map((part) => part.instanceId))

  while (existing.has(`part_${next}`)) {
    next += 1
  }

  return `part_${next}`
}

function incrementInventory(inventory: InventoryItem[], partId: string): InventoryItem[] {
  const counts = new Map(inventory.map((item) => [item.partId, item.quantity]))

  counts.set(partId, (counts.get(partId) ?? 0) + 1)

  return inventoryFromCounts(counts)
}

function decrementInventory(inventory: InventoryItem[], partId: string, quantity = 1): InventoryItem[] {
  const counts = new Map(inventory.map((item) => [item.partId, item.quantity]))
  const nextQuantity = (counts.get(partId) ?? 0) - quantity

  if (nextQuantity > 0) {
    counts.set(partId, nextQuantity)
  } else {
    counts.delete(partId)
  }

  return inventoryFromCounts(counts)
}

function inventoryFromCounts(counts: Map<string, number>): InventoryItem[] {
  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([entryPartId, quantity]) => ({ partId: entryPartId, quantity }))
}

function removePartInstances(
  input: ApplyLoadoutActionInput,
  buildState: LoadoutBuildState,
  partsById: Map<string, PartDefinition>,
  instanceIds: Set<string>,
): ApplyLoadoutActionResult {
  const removedParts = buildState.currentDesign.parts.filter((part) => instanceIds.has(part.instanceId))

  if (removedParts.length === 0) {
    return fail('UNKNOWN_PART_INSTANCE', 'actionId', 'No selected part instances were present in the current design.')
  }

  const nextParts = buildState.currentDesign.parts.filter((part) => !instanceIds.has(part.instanceId))
  const nextRoot = instanceIds.has(buildState.currentDesign.rootInstanceId ?? '')
    ? nextParts[0]?.instanceId
    : buildState.currentDesign.rootInstanceId
  const nextActiveSignaturePartInstanceId = instanceIds.has(buildState.currentDesign.activeSignaturePartInstanceId ?? '')
    ? undefined
    : buildState.currentDesign.activeSignaturePartInstanceId
  const refundedGold = removedParts.reduce((total, part) => total + (partsById.get(part.partId)?.cost ?? 0), 0)
  const inventory = removedParts.reduce(
    (nextInventory, part) => decrementInventory(nextInventory, part.partId),
    input.inventory,
  )

  return {
    ok: true,
    gold: input.gold + refundedGold,
    inventory,
    buildState: {
      step: 'choose_part',
      catalogVersion: buildState.catalogVersion,
      currentDesign: {
        ...buildState.currentDesign,
        rootInstanceId: nextRoot,
        activeSignaturePartInstanceId: nextActiveSignaturePartInstanceId,
        parts: nextParts,
      },
    },
  }
}

function childrenOf(design: BotDesignSnapshot, instanceId: string): BotPartSnapshot[] {
  return design.parts.filter((part) => part.parentInstanceId === instanceId)
}

function subtreeIds(design: BotDesignSnapshot, instanceId: string): Set<string> {
  if (!design.parts.some((part) => part.instanceId === instanceId)) {
    return new Set()
  }

  const ids = new Set<string>()
  const queue = [instanceId]

  while (queue.length > 0) {
    const currentId = queue.shift()

    if (!currentId || ids.has(currentId)) {
      continue
    }

    ids.add(currentId)
    queue.push(...childrenOf(design, currentId).map((part) => part.instanceId))
  }

  return ids
}

function subtreeParts(design: BotDesignSnapshot, instanceId: string): BotPartSnapshot[] {
  const ids = subtreeIds(design, instanceId)

  return design.parts.filter((part) => ids.has(part.instanceId))
}

function rotationOptionsForExistingPart(
  part: BotPartSnapshot,
  design: BotDesignSnapshot,
  partsById: Map<string, PartDefinition>,
): number[] {
  if (part.mountId === 'center') {
    return [...ROTATION_OPTIONS]
  }

  const parent = part.parentInstanceId
    ? design.parts.find((candidate) => candidate.instanceId === part.parentInstanceId)
    : undefined
  const parentDefinition = parent ? partsById.get(parent.partId) : undefined
  const mount = parentDefinition?.mounts.find((candidate) => candidate.id === part.mountId)

  return mount?.rotationOptions ?? [...ROTATION_OPTIONS]
}

function catalogDigestForActions(catalogVersion: string, actions: CanonicalGameAction[]): string {
  const digestInput = [
    catalogVersion,
    ...actions.map((action) => {
      const payload = action.payload as LoadoutActionPayload
      const refs = payload.catalogRefs ?? []

      return `${action.kind}:${action.id}:${refs.join(',')}`
    }).sort(),
  ].join('|')

  return `choice:${fnv1a(digestInput)}`
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }

  return hash.toString(16).padStart(8, '0')
}

function foundationPartIdsFor(catalog: PartDefinition[]): string[] {
  return catalog
    .filter((part) => (
      FOUNDATION_PART_IDS.has(part.id) ||
      part.tags.includes('filler') ||
      (part.category === 'body' && part.cost <= 22) ||
      (part.category === 'mobility' && BASIC_MOBILITY_PART_IDS.has(part.id))
    ))
    .map((part) => part.id)
    .sort()
}

function chooseStoreSlots(
  catalog: PartDefinition[],
  input: BuildCatalogStoreInput,
): CatalogStoreView['slots'] {
  const rng = seededStoreRng(`${input.seed}:round:${input.round}:role:${input.role}`)
  const slots: CatalogStoreView['slots'] = []
  const used = new Set<string>()
  let rareSignatureCount = 0
  let rareSignatureCost = 0

  STORE_SLOT_KINDS.forEach((kind, index) => {
    const candidates = shuffled(
      rotatingCandidates(catalog, kind)
        .filter((part) => !used.has(part.id))
        .filter((part) => {
          if (!isRareSignaturePart(part)) {
            return true
          }

          return kind === 'wildcard' &&
            rareSignatureCount === 0 &&
            rareSignatureCost + part.cost <= RARE_SIGNATURE_STORE_MAX_COST
        }),
      rng,
    )
    const selected = candidates[0]

    if (!selected) {
      return
    }

    used.add(selected.id)
    if (isRareSignaturePart(selected)) {
      rareSignatureCount += 1
      rareSignatureCost += selected.cost
    }
    slots.push({
      id: `${kind}_${index + 1}`,
      kind,
      partId: selected.id,
    })
  })

  applyStoreViabilityRails(slots, catalog, input)

  return slots
}

function rotatingCandidates(
  catalog: PartDefinition[],
  kind: CatalogStoreSlotKind,
): PartDefinition[] {
  return catalog.filter((part) => {
    if (FOUNDATION_PART_IDS.has(part.id) || part.tags.includes('filler')) {
      return false
    }

    switch (kind) {
      case 'weapon':
        return part.category === 'weapon'
      case 'utility':
        return part.category === 'utility'
      case 'armor':
        return part.category === 'defense'
      case 'advanced_mobility':
        return part.category === 'mobility' && !BASIC_MOBILITY_PART_IDS.has(part.id)
      case 'wildcard':
        return true
    }
  })
}

function applyStoreViabilityRails(
  slots: CatalogStoreView['slots'],
  catalog: PartDefinition[],
  input: BuildCatalogStoreInput,
): void {
  const partsById = partMap(catalog)
  const offered = new Set([...foundationPartIdsFor(catalog), ...slots.map((slot) => slot.partId)])
  const hasAffordableWeapon = [...offered].some((partId) => {
    const part = partsById.get(partId)

    return part?.category === 'weapon' && part.cost <= input.gold
  })
  const hasAffordableMobility = [...offered].some((partId) => {
    const part = partsById.get(partId)

    return part?.category === 'mobility' && part.cost <= input.gold && part.spec.kind === 'mobility' && part.spec.moveBudget > 0
  })

  if (!hasAffordableWeapon) {
    replaceSlot(slots, 'weapon', cheapestPart(catalog, (part) => part.category === 'weapon' && part.cost <= input.gold))
  }

  if (!hasAffordableMobility) {
    replaceSlot(slots, 'advanced_mobility', cheapestPart(catalog, (part) =>
      part.category === 'mobility' &&
      part.cost <= input.gold &&
      part.spec.kind === 'mobility' &&
      part.spec.moveBudget > 0,
    ))
  }

  const rareSignatureSlots = slots.filter((slot) => {
    const part = partsById.get(slot.partId)

    return part ? isRareSignaturePart(part) : false
  })

  for (const extraSlot of rareSignatureSlots.slice(1)) {
    replaceSlot(slots, extraSlot.kind, cheapestPart(catalog, (part) =>
      !isRareSignaturePart(part) &&
      !FOUNDATION_PART_IDS.has(part.id) &&
      part.category !== 'style',
    ))
  }
}

function replaceSlot(
  slots: CatalogStoreView['slots'],
  kind: CatalogStoreSlotKind,
  part: PartDefinition | undefined,
): void {
  if (!part) {
    return
  }

  const index = slots.findIndex((slot) => slot.kind === kind)

  if (index >= 0) {
    slots[index] = { ...slots[index], partId: part.id }
  }
}

function cheapestPart(catalog: PartDefinition[], predicate: (part: PartDefinition) => boolean): PartDefinition | undefined {
  return catalog
    .filter(predicate)
    .sort((left, right) => left.cost - right.cost || left.id.localeCompare(right.id))[0]
}

function isRareSignaturePart(part: PartDefinition): boolean {
  return part.rarity !== 'normal' && part.signatureEffect !== undefined
}

function shuffled<T>(items: T[], rng: () => number): T[] {
  const next = [...items]

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1))
    const temp = next[index]
    next[index] = next[swapIndex]
    next[swapIndex] = temp
  }

  return next
}

function seededStoreRng(seed: string): () => number {
  let state = hashNumber(seed)

  return () => {
    state = Math.imul(1664525, state) + 1013904223 >>> 0

    return state / 0x100000000
  }
}

function hashNumber(value: string): number {
  let hash = 0x811c9dc5

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }

  return hash
}

function partMap(catalog: PartDefinition[]): Map<string, PartDefinition> {
  return new Map(catalog.map((part) => [part.id, part]))
}

function cloneDesign(design: BotDesignSnapshot): BotDesignSnapshot {
  return {
    ...design,
    parts: design.parts.map((part) => ({ ...part, cell: part.cell ? { ...part.cell } : undefined })),
  }
}

function ok(
  input: ApplyLoadoutActionInput,
  buildState: LoadoutBuildState,
): ApplyLoadoutActionResult {
  return {
    ok: true,
    gold: input.gold,
    inventory: input.inventory,
    buildState,
  }
}

function fail(code: string, path: string, message: string): ApplyLoadoutActionResult {
  return {
    ok: false,
    issues: [issue(code, path, message)],
  }
}

function issue(code: string, path: string, message: string): ValidationIssue {
  return { code, path, message }
}
