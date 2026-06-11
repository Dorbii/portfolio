import { PART_CATALOG } from '../../catalog/src/parts.js'
import type {
  ActiveActionSet,
  BotDesignSnapshot,
  BotPartSnapshot,
  CanonicalGameAction,
  CatalogStoreSlotKind,
  CatalogStoreView,
  GameMasterActionParameterSchema,
  GameMasterActionParameters,
  GameMasterBlockedAction,
  GameMasterLegalAction,
  GridCoord,
  InventoryItem,
  LoadoutBuildState,
  MachineDesign,
  MachinePartInstance,
  MountSurface,
  PartCollisionPolicy,
  PartDefinition,
  PartMount,
  PartMountKind,
  PartMountMotion,
  ResolvedMountPose,
  StoredDesign,
  TeamRole,
  ValidationIssue,
} from '../../schemas/src/index.js'
import {
  createInitialMachineDesign,
  MACHINE_CORE_INSTANCE_ID,
  SYSTEM_MACHINE_CORE_DEFINITION,
  validateMachineTree,
} from './machineDesign.js'
import { validateMachinePhysicalLegality } from './machineLegality.js'
import {
  resolveMountPose,
  validateMountPoseInput,
} from './mountSurfaces.js'

export const LOADOUT_CATALOG_VERSION = 'part-catalog:v1'
export const LOADOUT_PART_LIMIT = 64
export const RARE_SIGNATURE_STORE_MAX_COST = 42
export const ALWAYS_AVAILABLE_FILLER_PART_IDS = [
  'Frame_Strut',
  'Frame_Angled_Strut',
  'Mount_Plate',
  'Mount_Weapon_Hardpoint',
  'Mount_Axle_Bracket',
  'Spacer_Block',
] as const

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
      storeSource?: 'foundation' | 'offer'
      offerSlotId?: string
    })
  | (LoadoutActionPayloadBase & {
      type: 'choose_attach_target'
      targetInstanceId: string
    })
  | (LoadoutActionPayloadBase & {
      type: 'propose_mount_pose'
      childPartId: string
      parentInstanceId: string
      parameters?: GameMasterActionParameters
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
  const legacyDraft = createEmptyLegacyDraft(role)

  return {
    step: 'choose_part',
    catalogVersion,
    currentDesign: {
      version: 'machine:v1',
      machine: createInitialMachineDesign(role),
    },
    legacyDraft,
  }
}

export function ensureLoadoutBuildState(
  role: TeamRole,
  buildState?: LoadoutBuildState,
): LoadoutBuildState {
  if (!buildState) {
    return createInitialLoadoutBuildState(role)
  }

  const currentDesign = normalizeStoredDesign(
    role,
    buildState.currentDesign as unknown,
    buildState.legacyDraft,
  )

  return {
    ...buildState,
    catalogVersion: buildState.catalogVersion || LOADOUT_CATALOG_VERSION,
    selectedAttachCell: buildState.selectedAttachCell ? { ...buildState.selectedAttachCell } : undefined,
    currentDesign,
    legacyDraft: cloneDesign(buildState.legacyDraft ?? legacyProjectionDraftFromStoredDesign(currentDesign)),
  }
}

export function createLoadoutBuildStateFromStoredDesign(
  role: TeamRole,
  storedDesign: StoredDesign,
  catalogVersion = LOADOUT_CATALOG_VERSION,
): LoadoutBuildState {
  const normalized = normalizeStoredDesign(role, storedDesign, undefined)
  const healed = healStoredDesignForShop(normalized)

  const legacyDraft = cloneDesign(legacyProjectionDraftFromStoredDesign(healed))

  // Keep the established legacy projection naming (`red loadout`) used by
  // replay blueprints and public views, instead of the machine design name.
  legacyDraft.name = `${role} loadout`

  return {
    step: 'choose_part',
    catalogVersion,
    currentDesign: healed,
    legacyDraft,
  }
}

// Shop healing rule: combat damage is fight-local. The next shop reopens the
// same blueprint healed to full, so runtime damage state must not carry over.
function healStoredDesignForShop(storedDesign: StoredDesign): StoredDesign {
  if (storedDesign.version !== 'machine:v1') {
    return cloneStoredDesign(storedDesign)
  }

  const machine = cloneMachineDesign(storedDesign.machine)

  machine.runtime = undefined

  return {
    version: 'machine:v1',
    machine,
  }
}

export function loadoutBuildStateLegacyDesign(buildState: LoadoutBuildState): BotDesignSnapshot {
  return cloneDesign(buildState.legacyDraft ?? legacyProjectionDraftFromStoredDesign(buildState.currentDesign))
}

export function loadoutBuildStateStoredDesign(buildState: LoadoutBuildState): StoredDesign {
  return cloneStoredDesign(buildState.currentDesign)
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
  const slots = chooseStoreSlots(catalog, input)
  const foundationPartIds = alwaysAvailableFillerPartIds(catalog)
  const offeredPartIds = [...new Set([
    ...slots.map((slot) => slot.partId),
    ...foundationPartIds,
  ])]

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
  const blockedActions = createBlockedLoadoutActions({
    role: input.role,
    round: input.round,
    decisionVersion: input.decisionVersion,
    gold: input.gold,
    buildState,
    catalog,
    store: catalogStore,
  })

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
    ...(blockedActions.length > 0 ? { blockedActions } : {}),
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
      return choosePart(input, buildState, partsById, payload)
    case 'choose_attach_target':
      return chooseAttachTarget(input, buildState, payload.targetInstanceId)
    case 'propose_mount_pose':
      return proposeMountPose(input, buildState, partsById, payload)
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
    ...(action.parameterSchema ? { parameterSchema: action.parameterSchema } : {}),
    ...(action.parameterExamples ? { parameterExamples: action.parameterExamples } : {}),
  }
}

// Legacy BotDesignSnapshot-only validator retained for legacy-bot-design:v1
// continuation. Machine:v1 confirm legality must use MachineDesign validators.
export function validateLegacyMinimumViableLoadout(
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
      return [issue('UNKNOWN_PART', 'buildState.legacyDraft.parts', `${part.partId} is not in the catalog.`)]
    }

    hasCore ||= isCoreBodyPart(definition)
    hasMovement ||= definition.spec.kind === 'mobility' && definition.spec.moveBudget > 0
    hasGroundSupport ||= definition.spec.kind === 'mobility' &&
      definition.spec.moveBudget > 0 &&
      definition.footprint.groundContact === 'required'
    hasWeapon ||= definition.spec.kind === 'weapon' && definition.spec.damage > 0

    if (definition.footprint.minY < 0) {
      issues.push(issue('PART_BELOW_FLOOR', 'buildState.legacyDraft.parts', `${definition.displayName} has a below-floor footprint.`))
    }

    if (definition.spec.kind === 'weapon' && part.mountSector === 'below_floor') {
      issues.push(issue('WEAPON_EMITTER_BELOW_FLOOR', 'buildState.legacyDraft.parts', `${definition.displayName} emitter is below the arena floor.`))
    }
  }

  issues.push(...validateActiveSignatureEffect(design, partsById))

  if (!hasCore) {
    issues.push(issue('MISSING_CORE', 'buildState.legacyDraft.parts', 'Confirm requires a non-filler body/core.'))
  }

  if (!hasMovement) {
    issues.push(issue('MISSING_MOBILITY', 'buildState.legacyDraft.parts', 'Confirm requires at least one mobility part.'))
  }

  if (hasMovement && !hasGroundSupport) {
    issues.push(issue('MISSING_GROUND_SUPPORT', 'buildState.legacyDraft.parts', 'Confirm requires mobility with valid ground support.'))
  }

  if (!hasWeapon) {
    issues.push(issue('MISSING_WEAPON', 'buildState.legacyDraft.parts', 'Confirm requires at least one weapon-capable part.'))
  }

  if (!isConnectedDesign(design)) {
    issues.push(issue('DISCONNECTED_DESIGN', 'buildState.legacyDraft.parts', 'Confirm requires all parts to stay connected.'))
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
    case 'propose_mount_pose':
      return mountPoseActions(input)
    case 'choose_mount':
      return isMachineDesignAuthority(input.buildState) ? mountPoseActions(input) : mountActions(input)
    case 'choose_rotation':
      return isMachineDesignAuthority(input.buildState) ? mountPoseActions(input) : rotationActions(input)
  }
}

function createBlockedLoadoutActions(input: CreateLoadoutActionsInput): GameMasterBlockedAction[] {
  if (input.buildState.step !== 'choose_part' && input.buildState.step !== 'ready_to_confirm') {
    return []
  }

  const confirmIssues = confirmLoadoutIssuesForBuildState(input.buildState, input.catalog)

  if (confirmIssues.length === 0) {
    return []
  }

  return [{
    kind: 'confirm_loadout',
    label: 'Confirm loadout unavailable',
    summary: 'The current machine cannot be submitted until these server validation issues are fixed.',
    issues: confirmIssues,
    requirements: confirmIssues.map((entry) => entry.message),
  }]
}

function choosePartActions(input: CreateLoadoutActionsInput): CanonicalGameAction[] {
  const actions: CanonicalGameAction[] = []
  const legacyDraft = legacyDraftFor(input.buildState)
  const confirmIssues = confirmLoadoutIssuesForBuildState(input.buildState, input.catalog)
  const confirmAction = confirmLoadoutCanonicalAction(input)
  const appendConfirmAfterChoices = isMachineDesignAuthority(input.buildState)

  if (!appendConfirmAfterChoices && confirmIssues.length === 0) {
    actions.push(confirmAction)
  }

  actions.push(...editExistingPartActions(input))

  const partRules = (part: PartDefinition): boolean => {
    if (part.cost > input.gold) {
      return false
    }

    if (requiresLegacyRootBody(input.buildState, legacyDraft)) {
      return isCoreBodyPart(part)
    }

    return true
  }
  const pushChoosePart = (
    part: PartDefinition,
    storeSource?: 'foundation' | 'offer',
    offerSlotId?: string,
  ) => {
    actions.push(loadoutAction(input, 'choose_part', `choose_part.${part.id}`, {
      scope: LOADOUT_ACTION_SCOPE,
      type: 'choose_part',
      label: part.displayName,
      summary: catalogSummary(part),
      partId: part.id,
      catalogRefs: [part.id],
      ...(storeSource ? { storeSource } : {}),
      ...(offerSlotId ? { offerSlotId } : {}),
    }))
  }

  if (input.store) {
    // Source-aware store rules: foundation parts are reusable templates and
    // offers are one-purchase rounds. Overlapping part IDs resolve to the
    // foundation source so the offer slot is never consumed by mistake.
    const foundationIds = new Set(input.store.foundationPartIds)
    const consumedSlots = new Set(input.buildState.consumedOfferSlotIds ?? [])
    const partsById = partMap(input.catalog)

    for (const partId of input.store.foundationPartIds) {
      const part = partsById.get(partId)

      if (part && partRules(part)) {
        pushChoosePart(part, 'foundation')
      }
    }

    const offeredSlotPartIds = new Set<string>()

    for (const slot of input.store.slots) {
      if (consumedSlots.has(slot.id) || foundationIds.has(slot.partId) || offeredSlotPartIds.has(slot.partId)) {
        continue
      }

      const part = partsById.get(slot.partId)

      if (part && partRules(part)) {
        offeredSlotPartIds.add(slot.partId)
        pushChoosePart(part, 'offer', slot.id)
      }
    }
  } else {
    for (const part of input.catalog.filter(partRules)) {
      pushChoosePart(part)
    }
  }

  if (appendConfirmAfterChoices && confirmIssues.length === 0) {
    actions.push(confirmAction)
  }

  return actions
}

function confirmLoadoutCanonicalAction(input: CreateLoadoutActionsInput): CanonicalGameAction {
  return loadoutAction(input, 'confirm_loadout', 'confirm_loadout', {
    scope: LOADOUT_ACTION_SCOPE,
    type: 'confirm_loadout',
    label: 'Confirm loadout',
    summary: 'Locks this server-built design for the fight.',
  })
}

function editExistingPartActions(input: CreateLoadoutActionsInput): CanonicalGameAction[] {
  const partsById = partMap(input.catalog)
  const actions: CanonicalGameAction[] = []
  const legacyDraft = legacyDraftFor(input.buildState)

  for (const part of legacyDraft.parts) {
    const definition = partsById.get(part.partId)
    const children = childrenOf(legacyDraft, part.instanceId)

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

      if (part.instanceId !== legacyDraft.rootInstanceId || legacyDraft.parts.length === 1) {
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
      const refund = subtreeParts(legacyDraft, part.instanceId)
        .reduce((total, entry) => total + (partsById.get(entry.partId)?.cost ?? 0), 0)

      actions.push(loadoutAction(input, 'remove_subtree', `remove_subtree.${part.instanceId}`, {
        scope: LOADOUT_ACTION_SCOPE,
        type: 'remove_subtree',
        label: `Remove ${definition.displayName} subtree`,
        summary: `Removes ${part.instanceId} and ${children.length} attached descendant(s), refunding ${refund} gold in this draft.`,
        instanceId: part.instanceId,
        catalogRefs: subtreeParts(legacyDraft, part.instanceId).map((entry) => entry.partId),
      }))
    }

    for (const rotation of rotationOptionsForExistingPart(part, legacyDraft, partsById)) {
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
  const legacyDraft = legacyDraftFor(input.buildState)
  const partsById = partMap(input.catalog)

  if (!part) {
    return []
  }

  if (isMachineDesignAuthority(input.buildState)) {
    return machineAttachTargetActions(input, part, partsById)
  }

  if (legacyDraft.parts.length === 0) {
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

  return legacyDraft.parts
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

function machineAttachTargetActions(
  input: CreateLoadoutActionsInput,
  childPart: PartDefinition,
  partsById: Map<string, PartDefinition>,
): CanonicalGameAction[] {
  const machine = input.buildState.currentDesign.version === 'machine:v1'
    ? input.buildState.currentDesign.machine
    : undefined

  if (!machine) {
    return []
  }

  return machineMountParentCandidates(machine)
    .filter((parent) => parent.instanceId !== input.buildState.selectedMovingPartId)
    .filter((parent) => !isDetachedMachinePart(machine, parent.instanceId))
    .filter((parent) => machineParentMountSurfaces(parent, partsById).some(
      (surface) => surface.accepts.includes(childPart.category),
    ))
    .map((parent) => {
      const isCore = parent.instanceId === MACHINE_CORE_INSTANCE_ID
      const targetDefinition = machineCatalogDefinition(parent, partsById)

      return loadoutAction(input, 'choose_attach_target', `attach.${childPart.id}.to.${parent.instanceId}`, {
        scope: LOADOUT_ACTION_SCOPE,
        type: 'choose_attach_target',
        label: isCore
          ? 'Attach to Machine Core'
          : `Attach to ${targetDefinition?.displayName ?? parent.instanceId}`,
        summary: isCore
          ? `Uses the immutable system core as the attachment root for ${childPart.displayName}.`
          : `Uses ${parent.instanceId} as the MachineDesign parent; pose validation resolves against its mount surfaces.`,
        targetInstanceId: parent.instanceId,
        ...(isCore
          ? { requirements: ['System core is free, immutable, and already installed.'] }
          : {}),
        catalogRefs: isCore ? [childPart.id] : [childPart.id, catalogPartIdFromMachinePart(parent)],
      })
    })
}

function mountPoseActions(input: CreateLoadoutActionsInput): CanonicalGameAction[] {
  if (!isMachineDesignAuthority(input.buildState)) {
    return []
  }

  const childPart = selectedCatalogPart(input)
  const parentInstanceId = input.buildState.selectedAttachTargetId

  if (!childPart || !parentInstanceId) {
    return []
  }

  const partsById = partMap(input.catalog)
  const parent = input.buildState.currentDesign.machine.parts.find(
    (part) => part.instanceId === parentInstanceId,
  )

  if (!parent || isDetachedMachinePart(input.buildState.currentDesign.machine, parent.instanceId)) {
    return []
  }

  const surfaces = machineParentMountSurfaces(parent, partsById)
  const acceptedSurfaces = surfacesAcceptingPart(childPart, surfaces)

  if (acceptedSurfaces.length === 0) {
    return []
  }

  const examples = mountPoseParameterExamples(
    childPart,
    parent.instanceId,
    acceptedSurfaces,
    input.buildState,
    partsById,
  )

  return [
    {
      ...loadoutAction(input, 'propose_mount_pose', `mount_pose.${childPart.id}.${parent.instanceId}`, {
        scope: LOADOUT_ACTION_SCOPE,
        type: 'propose_mount_pose',
        label: `Place ${childPart.displayName}`,
        summary: `Proposes a compact mount pose on ${parent.instanceId}; the server resolves the accepted surface parameters before mutating the design.`,
        childPartId: childPart.id,
        parentInstanceId: parent.instanceId,
        catalogRefs: parent.source === 'catalog_part'
          ? [childPart.id, catalogPartIdFromMachinePart(parent)]
          : [childPart.id],
        requirements: mountPoseRequirements(childPart, parent.instanceId, acceptedSurfaces),
      }),
      parameterSchema: mountPoseParameterSchema(childPart.id, parent.instanceId, acceptedSurfaces),
      parameterExamples: examples.length > 0 ? examples : undefined,
    },
  ]
}

// Legacy grid builder path retained for legacy-bot-design:v1 continuation only.
// Machine:v1 placement redirects to propose_mount_pose before this path.
function mountActions(input: CreateLoadoutActionsInput): CanonicalGameAction[] {
  if (isMachineDesignAuthority(input.buildState)) {
    return mountPoseActions(input)
  }

  const part = selectedCatalogPart(input)
  const target = selectedTarget(input)
  const partsById = partMap(input.catalog)
  const legacyDraft = legacyDraftFor(input.buildState)

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

  if (target === MACHINE_CORE_INSTANCE_ID) {
    return [
      loadoutAction(input, 'choose_mount', `mount.${part.id}.${MACHINE_CORE_INSTANCE_ID}.system_core_anchor`, {
        scope: LOADOUT_ACTION_SCOPE,
        type: 'choose_mount',
        label: 'Use core anchor',
        summary: `Attaches ${part.displayName} to the immutable system core. The core is not a catalog part and costs 0 gold.`,
        mount: 'system_core_anchor',
        mountKind: 'internal_slot',
        mountMotion: 'static',
        collisionPolicy: 'allow_clip_v1',
        attachCell: { x: 0, z: 0 },
        catalogRefs: [part.id],
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
      const attachCell = legacyGridAttachCellForMount(target.cell, mount, sector)

      if (!isAttachCellAllowed(legacyDraft, attachCell, mount.collisionPolicy)) {
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

// Legacy grid builder path retained for legacy-bot-design:v1 continuation only.
// Machine:v1 placement redirects to propose_mount_pose before this path.
function rotationActions(input: CreateLoadoutActionsInput): CanonicalGameAction[] {
  if (isMachineDesignAuthority(input.buildState)) {
    return mountPoseActions(input)
  }

  const part = selectedCatalogPart(input)

  if (!part || !input.buildState.selectedMount) {
    return []
  }

  const attachCell = input.buildState.selectedAttachCell

  if (!attachCell) {
    return []
  }

  const rotations = legacyRotationOptionsForSelectedMount(input)

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
  payload: Extract<LoadoutActionPayload, { type: 'choose_part' }>,
): ApplyLoadoutActionResult {
  const partId = payload.partId
  const part = partsById.get(partId)

  if (!part) {
    return fail('UNKNOWN_PART', 'actionId', `${partId} is not in the catalog.`)
  }

  if (part.cost > input.gold) {
    return fail('INSUFFICIENT_GOLD', 'resources.remainingGold', `${part.displayName} costs ${part.cost}, but only ${input.gold} gold is available.`)
  }

  if (
    payload.storeSource === 'offer' &&
    payload.offerSlotId &&
    (buildState.consumedOfferSlotIds ?? []).includes(payload.offerSlotId)
  ) {
    return fail('OFFER_CONSUMED', 'actionId', `${part.displayName} was already purchased from this round's store offer.`)
  }

  return ok(input, {
    ...buildState,
    step: 'choose_attach_target',
    selectedPartId: part.id,
    selectedPartSource: payload.storeSource,
    selectedOfferSlotId: payload.storeSource === 'offer' ? payload.offerSlotId : undefined,
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
  const legacyDraft = legacyDraftFor(buildState)

  if (!buildState.selectedPartId) {
    return fail('MISSING_SELECTED_PART', 'buildState.selectedPartId', 'Choose a part before choosing an attachment target.')
  }

  if (isMachineDesignAuthority(buildState)) {
    const machine = buildState.currentDesign.machine
    const target = machine.parts.find((part) => part.instanceId === targetInstanceId)

    if (!target) {
      return fail('INVALID_ATTACH_TARGET', 'actionId', `${targetInstanceId} is not in the current machine design.`)
    }

    if (isDetachedMachinePart(machine, targetInstanceId)) {
      return fail('DETACHED_ATTACH_TARGET', 'actionId', `${targetInstanceId} is detached from the current machine design.`)
    }

    return ok(input, {
      ...buildState,
      step: 'propose_mount_pose',
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

  if (
    targetInstanceId !== 'root' &&
    !isMachineCoreTarget(buildState, targetInstanceId) &&
    !legacyDraft.parts.some((part) => part.instanceId === targetInstanceId)
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

// Legacy grid builder apply path retained for legacy-bot-design:v1 continuation only.
// Machine:v1 submitters cannot reach this path from server-authored action sets.
function chooseMount(
  input: ApplyLoadoutActionInput,
  buildState: LoadoutBuildState,
  partsById: Map<string, PartDefinition>,
  payload: Extract<LoadoutActionPayload, { type: 'choose_mount' }>,
): ApplyLoadoutActionResult {
  if (isMachineDesignAuthority(buildState)) {
    return fail('LEGACY_GRID_ACTION_REJECTED', 'actionId', 'choose_mount is only valid for legacy-bot-design:v1 loadouts; machine:v1 placement uses propose_mount_pose.')
  }

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

function proposeMountPose(
  input: ApplyLoadoutActionInput,
  buildState: LoadoutBuildState,
  partsById: Map<string, PartDefinition>,
  payload: Extract<LoadoutActionPayload, { type: 'propose_mount_pose' }>,
): ApplyLoadoutActionResult {
  if (!isMachineDesignAuthority(buildState)) {
    return fail('INVALID_ACTION_KIND', 'actionId', 'propose_mount_pose is only valid for machine:v1 loadouts.')
  }

  const parameters = mountPoseParametersFromPayload(payload)

  if (!parameters.ok) {
    return { ok: false, issues: parameters.issues }
  }

  if (!buildState.selectedPartId || !buildState.selectedAttachTargetId) {
    return fail('INCOMPLETE_PLACEMENT', 'buildState', 'Placement requires a selected part and attachment target.')
  }

  if (
    parameters.value.childPartId !== buildState.selectedPartId ||
    payload.childPartId !== buildState.selectedPartId
  ) {
    return fail('RAW_PLACEMENT_REJECTED', 'actionId', 'Child part must match the server-selected loadout part.')
  }

  if (
    parameters.value.parentInstanceId !== buildState.selectedAttachTargetId ||
    payload.parentInstanceId !== buildState.selectedAttachTargetId
  ) {
    return fail('INVALID_ATTACH_TARGET', 'actionId', 'Parent instance must match the server-selected attachment target.')
  }

  const part = partsById.get(parameters.value.childPartId)

  if (!part) {
    return fail('UNKNOWN_PART', 'buildState.selectedPartId', `${parameters.value.childPartId} is not in the catalog.`)
  }

  const machine = buildState.currentDesign.machine
  const parent = machine.parts.find((entry) => entry.instanceId === parameters.value.parentInstanceId)

  if (!parent) {
    return fail('INVALID_ATTACH_TARGET', 'actionId', `${parameters.value.parentInstanceId} is not in the current machine design.`)
  }

  if (isDetachedMachinePart(machine, parent.instanceId)) {
    return fail('DETACHED_ATTACH_TARGET', 'actionId', `${parent.instanceId} is detached from the current machine design.`)
  }

  const surface = machineParentMountSurfaces(parent, partsById)
    .find((candidate) => candidate.id === parameters.value.mountSurfaceId)

  if (!surface) {
    return fail('INVALID_MOUNT_SURFACE', 'actionId', `${parameters.value.mountSurfaceId} is not exposed by ${parent.instanceId}.`)
  }

  const poseInput = {
    surface,
    partCategory: part.category,
    u: parameters.value.u,
    v: parameters.value.v,
    yawDegrees: parameters.value.yawDegrees,
    rollDegrees: parameters.value.rollDegrees,
  }
  const validation = validateMountPoseInput(poseInput)

  if (!validation.ok) {
    return { ok: false, issues: validation.issues }
  }

  const resolvedPose = resolveMountPose(poseInput)
  const movingPartId = buildState.selectedMovingPartId

  if (!movingPartId && part.cost > input.gold) {
    return fail('INSUFFICIENT_GOLD', 'resources.remainingGold', `${part.displayName} costs ${part.cost}, but only ${input.gold} gold is available.`)
  }

  if (!movingPartId && purchasedMachinePartCount(machine) >= LOADOUT_PART_LIMIT) {
    return fail('PART_LIMIT_REACHED', 'buildState.currentDesign.machine.parts', `Loadouts are limited to ${LOADOUT_PART_LIMIT} purchased parts.`)
  }

  const legacyDraft = legacyDraftFor(buildState)
  const instanceId = movingPartId ?? nextMachineCatalogInstanceId(machine)
  const signatureEffectActive = part.signatureEffect !== undefined &&
    (movingPartId
      ? legacyDraft.activeSignaturePartInstanceId === movingPartId
      : legacyDraft.activeSignaturePartInstanceId === undefined)
  const attachCell = cellFromResolvedPose(resolvedPose)
  const placedPart: BotPartSnapshot = {
    instanceId,
    partId: part.id,
    cell: attachCell,
    rotation: resolvedPose.parameters.yawDegrees,
    ...(parent.instanceId !== MACHINE_CORE_INSTANCE_ID ? { parentInstanceId: parent.instanceId } : {}),
    mountId: resolvedPose.surfaceId,
    mountKind: 'surface',
    mountMotion: 'static',
    mountCollisionPolicy: 'allow_clip_v1',
    ...(signatureEffectActive ? { signatureEffectActive: true } : {}),
    health: part.durability,
  }
  const nextDesign: BotDesignSnapshot = {
    ...legacyDraft,
    rootInstanceId: legacyDraft.rootInstanceId ?? instanceId,
    activeSignaturePartInstanceId: signatureEffectActive
      ? instanceId
      : legacyDraft.activeSignaturePartInstanceId,
    parts: [...legacyDraft.parts, placedPart],
  }
  const nextStoredDesign = placeStoredDesignPart(buildState, nextDesign, placedPart, {
    ok: true,
    mountId: resolvedPose.surfaceId,
    mountKind: 'surface',
    mountMotion: 'static',
    collisionPolicy: 'allow_clip_v1',
    rotationOptions: [resolvedPose.parameters.yawDegrees],
    attachCell,
    parentInstanceId: parent.instanceId,
    resolvedPose,
  })
  const physicalIssues = nextStoredDesign.version === 'machine:v1'
    ? validateMachinePhysicalLegality(nextStoredDesign.machine, Array.from(partsById.values()))
    : []

  if (physicalIssues.length > 0) {
    return { ok: false, issues: physicalIssues }
  }

  return {
    ok: true,
    gold: movingPartId ? input.gold : input.gold - part.cost,
    inventory: movingPartId ? input.inventory : incrementInventory(input.inventory, part.id),
    placedPartId: part.id,
    buildState: {
      ...buildState,
      step: 'choose_part',
      catalogVersion: buildState.catalogVersion,
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
      selectedPartSource: undefined,
      selectedOfferSlotId: undefined,
      consumedOfferSlotIds: consumeSelectedOfferSlot(buildState, movingPartId),
      currentDesign: nextStoredDesign,
      legacyDraft: nextDesign,
    },
  }
}

// Offer consumption rule: one-purchase offers are consumed only after a
// successful placement of a newly chosen part. Foundation parts and moved
// existing parts never consume an offer slot.
function consumeSelectedOfferSlot(
  buildState: LoadoutBuildState,
  movingPartId: string | undefined,
): string[] | undefined {
  if (movingPartId || buildState.selectedPartSource !== 'offer' || !buildState.selectedOfferSlotId) {
    return buildState.consumedOfferSlotIds
  }

  return [...new Set([...(buildState.consumedOfferSlotIds ?? []), buildState.selectedOfferSlotId])]
}

// Legacy grid builder apply path retained for legacy-bot-design:v1 continuation only.
// Machine:v1 placement uses proposeMountPose instead.
function placePart(
  input: ApplyLoadoutActionInput,
  buildState: LoadoutBuildState,
  partsById: Map<string, PartDefinition>,
  rotation: number,
  attachCell: GridCoord,
): ApplyLoadoutActionResult {
  if (isMachineDesignAuthority(buildState)) {
    return fail('LEGACY_GRID_ACTION_REJECTED', 'actionId', 'choose_rotation/place_part is only valid for legacy-bot-design:v1 loadouts; machine:v1 placement uses propose_mount_pose.')
  }

  if (!buildState.selectedPartId || !buildState.selectedAttachTargetId || !buildState.selectedMount) {
    return fail('INCOMPLETE_PLACEMENT', 'buildState', 'Placement requires a part, target, mount, and rotation.')
  }

  const legacyDraft = legacyDraftFor(buildState)
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

  if (!movingPartId && legacyDraft.parts.length >= LOADOUT_PART_LIMIT) {
    return fail('PART_LIMIT_REACHED', 'buildState.legacyDraft.parts', `Loadouts are limited to ${LOADOUT_PART_LIMIT} parts.`)
  }

  if (!isAttachCellAllowed(legacyDraft, attachCell, placement.collisionPolicy)) {
    return fail('OCCUPIED_ATTACH_CELL', 'actionId', `Attach cell ${attachCell.x},${attachCell.z} is already occupied.`)
  }

  const instanceId = movingPartId ?? nextInstanceId(legacyDraft)
  const signatureEffectActive = part.signatureEffect !== undefined &&
    (movingPartId
      ? legacyDraft.activeSignaturePartInstanceId === movingPartId
      : legacyDraft.activeSignaturePartInstanceId === undefined)
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
    ...legacyDraft,
    rootInstanceId: legacyDraft.rootInstanceId ?? instanceId,
    activeSignaturePartInstanceId: signatureEffectActive
      ? instanceId
      : legacyDraft.activeSignaturePartInstanceId,
    parts: [...legacyDraft.parts, placedPart],
  }
  const nextStoredDesign = placeStoredDesignPart(buildState, nextDesign, placedPart, placement)

  return {
    ok: true,
    gold: movingPartId ? input.gold : input.gold - part.cost,
    inventory: movingPartId ? input.inventory : incrementInventory(input.inventory, part.id),
    placedPartId: part.id,
    buildState: {
      ...buildState,
      step: 'choose_part',
      catalogVersion: buildState.catalogVersion,
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
      selectedPartSource: undefined,
      selectedOfferSlotId: undefined,
      consumedOfferSlotIds: consumeSelectedOfferSlot(buildState, movingPartId),
      currentDesign: nextStoredDesign,
      legacyDraft: nextDesign,
    },
  }
}

function removePart(
  input: ApplyLoadoutActionInput,
  buildState: LoadoutBuildState,
  partsById: Map<string, PartDefinition>,
  instanceId: string,
): ApplyLoadoutActionResult {
  const legacyDraft = legacyDraftFor(buildState)

  if (childrenOf(legacyDraft, instanceId).length > 0) {
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
  const ids = subtreeIds(legacyDraftFor(buildState), instanceId)

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
  const legacyDraft = legacyDraftFor(buildState)
  const movingPart = legacyDraft.parts.find((part) => part.instanceId === instanceId)

  if (!movingPart) {
    return fail('UNKNOWN_PART_INSTANCE', 'actionId', `${instanceId} is not in the current design.`)
  }

  if (childrenOf(legacyDraft, instanceId).length > 0) {
    return fail('PART_HAS_DEPENDENTS', 'actionId', `${instanceId} has attached children; move leaf parts or remove_subtree first.`)
  }

  if (instanceId === legacyDraft.rootInstanceId && legacyDraft.parts.length > 1) {
    return fail('CANNOT_MOVE_ROOT_WITH_DEPENDENTS', 'actionId', 'Move the root only after detaching the rest of the draft.')
  }

  const nextDesign = {
    ...legacyDraft,
    parts: legacyDraft.parts.filter((part) => part.instanceId !== instanceId),
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
    currentDesign: removeStoredDesignInstances(buildState.currentDesign, new Set([instanceId])),
    legacyDraft: {
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
  const legacyDraft = legacyDraftFor(buildState)
  const existing = legacyDraft.parts.find((part) => part.instanceId === instanceId)

  if (!existing) {
    return fail('UNKNOWN_PART_INSTANCE', 'actionId', `${instanceId} is not in the current design.`)
  }

  const rotations = rotationOptionsForExistingPart(existing, legacyDraft, partsById)

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
    currentDesign: rotateStoredDesignPart(buildState.currentDesign, instanceId, rotation),
    legacyDraft: {
      ...legacyDraft,
      parts: legacyDraft.parts.map((part) => part.instanceId === instanceId
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
  const legacyDraft = legacyDraftFor(buildState)
  const issues = confirmLoadoutIssuesForBuildState(buildState, [...partsById.values()])

  if (issues.length > 0) {
    return { ok: false, issues }
  }

  return {
    ok: true,
    gold: input.gold,
    inventory: input.inventory,
    buildState: {
      ...buildState,
      step: 'ready_to_confirm',
      catalogVersion: buildState.catalogVersion,
      currentDesign: cloneStoredDesign(buildState.currentDesign),
      legacyDraft: cloneDesign(legacyDraft),
    },
    confirmed: true,
  }
}

function confirmLoadoutIssuesForBuildState(
  buildState: LoadoutBuildState,
  catalog: PartDefinition[],
): ValidationIssue[] {
  if (buildState.currentDesign.version === 'machine:v1') {
    // CODEX_INTENT: keep machine:v1 confirm legality on MachineDesign authority only.
    // CODEX_RISK: data_semantics
    // CODEX_CONFIDENCE: medium
    // CODEX_REVIEW: pending
    return [
      ...validateMachineTree(buildState.currentDesign.machine),
      ...validateMachinePhysicalLegality(buildState.currentDesign.machine, catalog),
    ]
  }

  return validateLegacyMinimumViableLoadout(legacyDraftFor(buildState), catalog)
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

function selectedTarget(input: CreateLoadoutActionsInput): BotPartSnapshot | 'root' | typeof MACHINE_CORE_INSTANCE_ID | undefined {
  if (input.buildState.selectedAttachTargetId === 'root') {
    return 'root'
  }

  if (isMachineCoreTarget(input.buildState, input.buildState.selectedAttachTargetId)) {
    return MACHINE_CORE_INSTANCE_ID
  }

  return legacyDraftFor(input.buildState).parts.find(
    (part) => part.instanceId === input.buildState.selectedAttachTargetId,
  )
}

type MountPoseActionParameters = {
  childPartId: string
  parentInstanceId: string
  mountSurfaceId: string
  u: number
  v: number
  yawDegrees: number
  rollDegrees: number
}

function mountPoseParameterSchema(
  childPartId: string,
  parentInstanceId: string,
  surfaces: MountSurface[],
): GameMasterActionParameterSchema {
  return {
    type: 'object',
    required: [
      'childPartId',
      'parentInstanceId',
      'mountSurfaceId',
      'u',
      'v',
      'yawDegrees',
      'rollDegrees',
    ],
    properties: {
      childPartId: {
        type: 'string',
        label: 'Child part',
        summary: 'Catalog part chosen by the previous loadout step.',
        enum: [childPartId],
      },
      parentInstanceId: {
        type: 'string',
        label: 'Parent instance',
        summary: 'MachineDesign parent selected by the previous loadout step.',
        enum: [parentInstanceId],
      },
      mountSurfaceId: {
        type: 'string',
        label: 'Mount surface',
        summary: 'Surface id exposed by the selected parent instance.',
        enum: uniqueStrings(surfaces.map((surface) => surface.id)),
      },
      u: {
        type: 'number',
        label: 'U',
        summary: 'Normalized horizontal parameter on the selected mount surface.',
        minimum: 0,
        maximum: 1,
      },
      v: {
        type: 'number',
        label: 'V',
        summary: 'Normalized vertical parameter on the selected mount surface.',
        minimum: 0,
        maximum: 1,
      },
      yawDegrees: {
        type: 'number',
        label: 'Yaw degrees',
        summary: 'Yaw in degrees applied by the server pose resolver.',
        normalization: 'degrees',
      },
      rollDegrees: {
        type: 'number',
        label: 'Roll degrees',
        summary: 'Roll in degrees applied by the server pose resolver.',
        normalization: 'degrees',
      },
    },
  }
}

function mountPoseParameterExamples(
  childPart: PartDefinition,
  parentInstanceId: string,
  surfaces: MountSurface[],
  buildState: LoadoutBuildState & { currentDesign: { version: 'machine:v1'; machine: MachineDesign } },
  partsById: Map<string, PartDefinition>,
): GameMasterActionParameters[] {
  const examples: GameMasterActionParameters[] = []
  const seen = new Set<string>()

  for (const surface of surfaces) {
    for (const point of mountPoseSamplePoints(surface)) {
      const poseInput = {
        surface,
        partCategory: childPart.category,
        u: point.u,
        v: point.v,
        yawDegrees: 0,
        rollDegrees: 0,
      }
      const validation = validateMountPoseInput(poseInput)

      if (!validation.ok) {
        continue
      }

      const resolvedPose = resolveMountPose(poseInput)
      const candidateMachine = machineWithProposedPose(
        buildState,
        childPart,
        parentInstanceId,
        resolvedPose,
      )
      const physicalIssues = validateMachinePhysicalLegality(candidateMachine, Array.from(partsById.values()))

      if (physicalIssues.length > 0) {
        continue
      }

      const example = {
        childPartId: childPart.id,
        parentInstanceId,
        mountSurfaceId: surface.id,
        u: point.u,
        v: point.v,
        yawDegrees: 0,
        rollDegrees: 0,
      }
      const key = JSON.stringify(example)

      if (!seen.has(key)) {
        seen.add(key)
        examples.push(example)
      }

      if (examples.length >= 4) {
        return examples
      }
    }
  }

  return examples
}

type MountPoseSamplePoint = {
  u: number
  v: number
}

function mountPoseSamplePoints(surface: MountSurface): MountPoseSamplePoint[] {
  return surface.kind === 'sphere'
    ? [
        { u: 0.5, v: 0.5 },
        { u: 0, v: 0.5 },
        { u: 0.25, v: 0.5 },
        { u: 0.75, v: 0.5 },
        { u: 0.125, v: 0.5 },
        { u: 0.375, v: 0.5 },
        { u: 0.625, v: 0.5 },
        { u: 0.875, v: 0.5 },
        { u: 0.5, v: 0.25 },
        { u: 0.5, v: 0.75 },
      ]
    : [
        { u: 0.5, v: 0.5 },
        { u: 0.2, v: 0.2 },
        { u: 0.8, v: 0.2 },
        { u: 0.2, v: 0.8 },
        { u: 0.8, v: 0.8 },
        { u: 0.5, v: 0.2 },
        { u: 0.5, v: 0.8 },
        { u: 0.2, v: 0.5 },
        { u: 0.8, v: 0.5 },
      ]
}

function machineWithProposedPose(
  buildState: LoadoutBuildState & { currentDesign: { version: 'machine:v1'; machine: MachineDesign } },
  childPart: PartDefinition,
  parentInstanceId: string,
  resolvedPose: ResolvedMountPose,
): MachineDesign {
  const machine = cloneMachineDesign(buildState.currentDesign.machine)
  const instanceId = buildState.selectedMovingPartId ?? nextMachineCatalogInstanceId(machine)
  const transform = machineTransformFromResolvedPose(resolvedPose)

  machine.parts = [
    ...machine.parts.filter((part) => part.instanceId !== instanceId),
    {
      instanceId,
      definitionId: `catalog:${childPart.id}`,
      source: 'catalog_part',
      transform,
    },
  ]
  machine.attachments = [
    ...machine.attachments.filter((attachment) => attachment.childInstanceId !== instanceId),
    {
      parentInstanceId,
      childInstanceId: instanceId,
      mountId: resolvedPose.surfaceId,
      transform: cloneTransform(transform),
    },
  ]

  return machine
}

function mountPoseRequirements(
  childPart: PartDefinition,
  parentInstanceId: string,
  surfaces: MountSurface[],
): string[] {
  return [
    `parentInstanceId must be ${parentInstanceId}.`,
    `childPartId must be ${childPart.id}.`,
    `mountSurfaceId must be one of: ${uniqueStrings(surfaces.map((surface) => surface.id)).join(', ')}.`,
    'u and v must be numbers from 0 through 1 on the selected surface.',
    'yawDegrees and rollDegrees are degree values; the server normalizes them before placement.',
    'Proposed poses must not hard-collide with existing non-parent parts; rejected submissions return HARD_PART_COLLISION issues.',
  ]
}

function mountPoseParametersFromPayload(
  payload: Extract<LoadoutActionPayload, { type: 'propose_mount_pose' }>,
): { ok: true; value: MountPoseActionParameters } | { ok: false; issues: ValidationIssue[] } {
  const parameters = payload.parameters

  if (!isRecordValue(parameters)) {
    return {
      ok: false,
      issues: [issue('MISSING_PARAMETERS', 'action.parameters', 'propose_mount_pose requires normalized parameters.')],
    }
  }

  const issues: ValidationIssue[] = []
  const childPartId = stringParameter(parameters, 'childPartId', issues)
  const parentInstanceId = stringParameter(parameters, 'parentInstanceId', issues)
  const mountSurfaceId = stringParameter(parameters, 'mountSurfaceId', issues)
  const u = numberParameter(parameters, 'u', issues)
  const v = numberParameter(parameters, 'v', issues)
  const yawDegrees = numberParameter(parameters, 'yawDegrees', issues)
  const rollDegrees = numberParameter(parameters, 'rollDegrees', issues)

  return issues.length === 0
    ? {
        ok: true,
        value: {
          childPartId,
          parentInstanceId,
          mountSurfaceId,
          u,
          v,
          yawDegrees,
          rollDegrees,
        },
      }
    : { ok: false, issues }
}

function stringParameter(
  parameters: Record<string, unknown>,
  key: keyof MountPoseActionParameters,
  issues: ValidationIssue[],
): string {
  const value = parameters[key]

  if (typeof value !== 'string' || value.length === 0) {
    issues.push(issue('INVALID_MOUNT_PARAMETER', `action.parameters.${key}`, `${key} must be a non-empty string.`))
    return ''
  }

  return value
}

function numberParameter(
  parameters: Record<string, unknown>,
  key: keyof MountPoseActionParameters,
  issues: ValidationIssue[],
): number {
  const value = parameters[key]

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    issues.push(issue('INVALID_MOUNT_PARAMETER', `action.parameters.${key}`, `${key} must be a finite number.`))
    return 0
  }

  return value
}

function isRecordValue(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)]
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
      resolvedPose?: ResolvedMountPose
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

function machineMountParentCandidates(machine: MachineDesign): MachinePartInstance[] {
  const catalogParts = machine.parts.filter((part) => part.source === 'catalog_part')
  const coreParts = machine.parts.filter((part) => part.instanceId === MACHINE_CORE_INSTANCE_ID)

  return [...catalogParts, ...coreParts]
}

function machineParentMountSurfaces(
  parent: MachinePartInstance,
  partsById: Map<string, PartDefinition>,
): MountSurface[] {
  if (parent.instanceId === MACHINE_CORE_INSTANCE_ID || parent.source === 'system_core') {
    return SYSTEM_MACHINE_CORE_DEFINITION.mountSurfaces
  }

  return machineCatalogDefinition(parent, partsById)?.mountSurfaces ?? []
}

function surfacesAcceptingPart(
  childPart: PartDefinition,
  surfaces: MountSurface[],
): MountSurface[] {
  return surfaces.filter((surface) => surface.accepts.includes(childPart.category))
}

function machineCatalogDefinition(
  part: MachinePartInstance,
  partsById: Map<string, PartDefinition>,
): PartDefinition | undefined {
  return partsById.get(catalogPartIdFromMachinePart(part))
}

function isDetachedMachinePart(machine: MachineDesign, instanceId: string): boolean {
  return machine.runtime?.detachedInstanceIds?.includes(instanceId) ?? false
}

function purchasedMachinePartCount(machine: MachineDesign): number {
  return machine.parts.filter((part) => part.source === 'catalog_part').length
}

function nextMachineCatalogInstanceId(machine: MachineDesign): string {
  let next = purchasedMachinePartCount(machine) + 1
  const existing = new Set(machine.parts.map((part) => part.instanceId))

  while (existing.has(`part_${next}`)) {
    next += 1
  }

  return `part_${next}`
}

function cellFromResolvedPose(pose: ResolvedMountPose): GridCoord {
  return {
    x: pose.position[0] ?? 0,
    z: pose.position[2] ?? 0,
  }
}

function mountSectors(mount: PartMount): (string | undefined)[] {
  return mount.sectors && mount.sectors.length > 0 ? mount.sectors : [undefined]
}

function legacyGridAttachCellForMount(cell: GridCoord | undefined, mount: PartMount, sector: string | undefined): GridCoord {
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

function legacyRotationOptionsForSelectedMount(input: CreateLoadoutActionsInput): number[] {
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
    if (legacyDraftFor(buildState).parts.length > 0) {
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

  if (isMachineCoreTarget(buildState, buildState.selectedAttachTargetId)) {
    if (mountId !== 'system_core_anchor' || !sameCell(attachCell, { x: 0, z: 0 })) {
      return failPlacement('INVALID_MOUNT', 'actionId', 'System core placement must use the server-owned core anchor.')
    }

    return {
      ok: true,
      mountId: 'system_core_anchor',
      mountKind: 'internal_slot',
      mountMotion: 'static',
      collisionPolicy: 'allow_clip_v1',
      rotationOptions: [...ROTATION_OPTIONS],
      attachCell: { x: 0, z: 0 },
      parentInstanceId: MACHINE_CORE_INSTANCE_ID,
    }
  }

  const legacyDraft = legacyDraftFor(buildState)
  const targetPart = legacyDraft.parts.find(
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

  const expectedCell = legacyGridAttachCellForMount(targetPart.cell, mount, sector)

  if (!sameCell(attachCell, expectedCell)) {
    return failPlacement('RAW_TRANSFORM_REJECTED', 'actionId', 'Placement cells are server-owned; raw transform payloads are not accepted.')
  }

  if (!isAttachCellAllowed(legacyDraft, expectedCell, mount.collisionPolicy)) {
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
    issues.push(issue('MULTIPLE_ACTIVE_SIGNATURE_EFFECTS', 'buildState.legacyDraft.parts', 'V1 allows only one active style signature effect per bot.'))
  }

  if (
    design.activeSignaturePartInstanceId &&
    !activeParts.some((part) => part.instanceId === design.activeSignaturePartInstanceId)
  ) {
    issues.push(issue('ACTIVE_SIGNATURE_MISMATCH', 'buildState.legacyDraft.activeSignaturePartInstanceId', 'Active signature marker must match the active style part.'))
  }

  for (const part of activeParts) {
    const definition = partsById.get(part.partId)

    if (!definition?.signatureEffect || definition.category !== 'style') {
      issues.push(issue('INVALID_ACTIVE_SIGNATURE_EFFECT', 'buildState.legacyDraft.parts', `${part.instanceId} is not a style signature part.`))
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
  const legacyDraft = legacyDraftFor(buildState)
  const removedParts = legacyDraft.parts.filter((part) => instanceIds.has(part.instanceId))

  if (removedParts.length === 0) {
    return fail('UNKNOWN_PART_INSTANCE', 'actionId', 'No selected part instances were present in the current design.')
  }

  const nextParts = legacyDraft.parts.filter((part) => !instanceIds.has(part.instanceId))
  const nextRoot = instanceIds.has(legacyDraft.rootInstanceId ?? '')
    ? nextParts[0]?.instanceId
    : legacyDraft.rootInstanceId
  const nextActiveSignaturePartInstanceId = instanceIds.has(legacyDraft.activeSignaturePartInstanceId ?? '')
    ? undefined
    : legacyDraft.activeSignaturePartInstanceId
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
      ...buildState,
      step: 'choose_part',
      catalogVersion: buildState.catalogVersion,
      currentDesign: removeStoredDesignInstances(buildState.currentDesign, instanceIds),
      legacyDraft: {
        ...legacyDraft,
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

  return slots
}

function alwaysAvailableFillerPartIds(catalog: PartDefinition[]): string[] {
  const availableIds = new Set(catalog.map((part) => part.id))

  return ALWAYS_AVAILABLE_FILLER_PART_IDS.filter((partId) => availableIds.has(partId))
}

function rotatingCandidates(
  catalog: PartDefinition[],
  kind: CatalogStoreSlotKind,
): PartDefinition[] {
  return catalog.filter((part) => {
    switch (kind) {
      case 'weapon':
        return part.category === 'weapon'
      case 'utility':
        return part.category === 'utility'
      case 'armor':
        return part.category === 'defense'
      case 'advanced_mobility':
        return part.category === 'mobility'
      case 'wildcard':
        return true
    }
  })
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

function createEmptyLegacyDraft(role: TeamRole): BotDesignSnapshot {
  return {
    name: `${role} loadout`,
    parts: [],
  }
}

function normalizeStoredDesign(
  role: TeamRole,
  value: unknown,
  legacyDraft?: BotDesignSnapshot,
): StoredDesign {
  if (isStoredDesign(value)) {
    return cloneStoredDesign(value)
  }

  if (isBotDesignSnapshot(value)) {
    return {
      version: 'legacy-bot-design:v1',
      design: cloneDesign(value),
    }
  }

  if (legacyDraft) {
    return {
      version: 'legacy-bot-design:v1',
      design: cloneDesign(legacyDraft),
    }
  }

  return {
    version: 'machine:v1',
    machine: createInitialMachineDesign(role),
  }
}

function isStoredDesign(value: unknown): value is StoredDesign {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const candidate = value as Partial<StoredDesign>

  return (
    candidate.version === 'machine:v1' &&
    typeof candidate.machine === 'object' &&
    candidate.machine !== null
  ) || (
    candidate.version === 'legacy-bot-design:v1' &&
    typeof candidate.design === 'object' &&
    candidate.design !== null
  )
}

function isBotDesignSnapshot(value: unknown): value is BotDesignSnapshot {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const candidate = value as Partial<BotDesignSnapshot>

  return typeof candidate.name === 'string' && Array.isArray(candidate.parts)
}

function cloneStoredDesign(design: StoredDesign): StoredDesign {
  return design.version === 'machine:v1'
    ? { version: 'machine:v1', machine: cloneMachineDesign(design.machine) }
    : { version: 'legacy-bot-design:v1', design: cloneDesign(design.design) }
}

function cloneMachineDesign(design: MachineDesign): MachineDesign {
  return {
    ...design,
    parts: design.parts.map((part) => ({
      ...part,
      transform: cloneTransform(part.transform),
    })),
    attachments: design.attachments.map((attachment) => ({
      ...attachment,
      transform: cloneTransform(attachment.transform),
    })),
    runtime: design.runtime
      ? {
          healthByInstanceId: { ...design.runtime.healthByInstanceId },
          detachedInstanceIds: design.runtime.detachedInstanceIds
            ? [...design.runtime.detachedInstanceIds]
            : undefined,
          disabledInstanceIds: design.runtime.disabledInstanceIds
            ? [...design.runtime.disabledInstanceIds]
            : undefined,
          orientationByInstanceId: design.runtime.orientationByInstanceId
            ? cloneOrientationByInstanceId(design.runtime.orientationByInstanceId)
            : undefined,
        }
      : undefined,
  }
}

function cloneTransform(transform: MachinePartInstance['transform']): MachinePartInstance['transform'] {
  return {
    position: [...transform.position],
    rotation: [...transform.rotation],
    ...(transform.scale ? { scale: [...transform.scale] } : {}),
    ...(transform.orientation ? { orientation: cloneOrientationBasis(transform.orientation) } : {}),
  }
}

function cloneOrientationByInstanceId(
  orientationByInstanceId: NonNullable<MachineDesign['runtime']>['orientationByInstanceId'],
): NonNullable<MachineDesign['runtime']>['orientationByInstanceId'] {
  return Object.fromEntries(
    Object.entries(orientationByInstanceId ?? {}).map(([instanceId, orientation]) => [
      instanceId,
      cloneOrientationBasis(orientation),
    ]),
  )
}

function cloneOrientationBasis(
  orientation: NonNullable<MachinePartInstance['transform']['orientation']>,
): NonNullable<MachinePartInstance['transform']['orientation']> {
  return {
    right: [orientation.right[0], orientation.right[1], orientation.right[2]],
    up: [orientation.up[0], orientation.up[1], orientation.up[2]],
    forward: [orientation.forward[0], orientation.forward[1], orientation.forward[2]],
  }
}

function legacyDraftFor(buildState: LoadoutBuildState): BotDesignSnapshot {
  return buildState.legacyDraft ?? legacyProjectionDraftFromStoredDesign(buildState.currentDesign)
}

function legacyProjectionDraftFromStoredDesign(design: StoredDesign): BotDesignSnapshot {
  // CODEX_INTENT: expose only a legacy compatibility draft projection from StoredDesign.
  // CODEX_RISK: data_semantics
  // CODEX_CONFIDENCE: medium
  // CODEX_REVIEW: pending
  if (design.version === 'legacy-bot-design:v1') {
    return cloneDesign(design.design)
  }

  const parentByChild = new Map(
    design.machine.attachments.map((attachment) => [attachment.childInstanceId, attachment]),
  )
  const parts = design.machine.parts
    .filter((part) => part.source === 'catalog_part')
    .map((part): BotPartSnapshot => {
      const attachment = parentByChild.get(part.instanceId)

      return {
        instanceId: part.instanceId,
        partId: catalogPartIdFromMachinePart(part),
        cell: {
          x: part.transform.position[0] ?? 0,
          z: part.transform.position[2] ?? 0,
        },
        rotation: part.transform.rotation[1] ?? 0,
        ...(attachment?.parentInstanceId && attachment.parentInstanceId !== MACHINE_CORE_INSTANCE_ID
          ? { parentInstanceId: attachment.parentInstanceId }
          : {}),
        ...(attachment?.mountId ? { mountId: attachment.mountId } : {}),
      }
    })

  return {
    name: design.machine.name,
    parts,
    rootInstanceId: parts[0]?.instanceId,
  }
}

function catalogPartIdFromMachinePart(part: MachinePartInstance): string {
  return part.definitionId.startsWith('catalog:')
    ? part.definitionId.slice('catalog:'.length)
    : part.definitionId
}

function requiresLegacyRootBody(
  buildState: LoadoutBuildState,
  legacyDraft: BotDesignSnapshot,
): boolean {
  return buildState.currentDesign.version === 'legacy-bot-design:v1' && legacyDraft.parts.length === 0
}

function isMachineDesignAuthority(
  buildState: LoadoutBuildState,
): buildState is LoadoutBuildState & { currentDesign: { version: 'machine:v1'; machine: MachineDesign } } {
  return buildState.currentDesign.version === 'machine:v1'
}

function isMachineCoreTarget(buildState: LoadoutBuildState, targetInstanceId: string | undefined): boolean {
  return isMachineDesignAuthority(buildState) && targetInstanceId === MACHINE_CORE_INSTANCE_ID
}

function placeStoredDesignPart(
  buildState: LoadoutBuildState,
  nextLegacyDraft: BotDesignSnapshot,
  placedPart: BotPartSnapshot,
  placement: Extract<MountPlacement, { ok: true }>,
): StoredDesign {
  if (buildState.currentDesign.version === 'legacy-bot-design:v1') {
    return {
      version: 'legacy-bot-design:v1',
      design: cloneDesign(nextLegacyDraft),
    }
  }

  const machine = cloneMachineDesign(buildState.currentDesign.machine)
  const parentInstanceId = placement.parentInstanceId ?? MACHINE_CORE_INSTANCE_ID
  const transform = placement.resolvedPose
    ? machineTransformFromResolvedPose(placement.resolvedPose)
    : machineTransformFromPart(placedPart)

  machine.parts = [
    ...machine.parts.filter((part) => part.instanceId !== placedPart.instanceId),
    {
      instanceId: placedPart.instanceId,
      definitionId: `catalog:${placedPart.partId}`,
      source: 'catalog_part',
      transform,
    },
  ]
  machine.attachments = [
    ...machine.attachments.filter((attachment) => attachment.childInstanceId !== placedPart.instanceId),
    {
      parentInstanceId,
      childInstanceId: placedPart.instanceId,
      mountId: placement.mountId,
      transform: cloneTransform(transform),
    },
  ]

  return { version: 'machine:v1', machine }
}

function removeStoredDesignInstances(design: StoredDesign, instanceIds: Set<string>): StoredDesign {
  if (design.version === 'legacy-bot-design:v1') {
    return {
      version: 'legacy-bot-design:v1',
      design: {
        ...cloneDesign(design.design),
        parts: design.design.parts.filter((part) => !instanceIds.has(part.instanceId)),
      },
    }
  }

  const machine = cloneMachineDesign(design.machine)

  machine.parts = machine.parts.filter(
    (part) => part.source === 'system_core' || !instanceIds.has(part.instanceId),
  )
  machine.attachments = machine.attachments.filter(
    (attachment) =>
      !instanceIds.has(attachment.parentInstanceId) &&
      !instanceIds.has(attachment.childInstanceId),
  )

  return { version: 'machine:v1', machine }
}

function rotateStoredDesignPart(
  design: StoredDesign,
  instanceId: string,
  rotation: number,
): StoredDesign {
  if (design.version === 'legacy-bot-design:v1') {
    return {
      version: 'legacy-bot-design:v1',
      design: {
        ...cloneDesign(design.design),
        parts: design.design.parts.map((part) => part.instanceId === instanceId
          ? { ...part, rotation }
          : part),
      },
    }
  }

  const machine = cloneMachineDesign(design.machine)

  machine.parts = machine.parts.map((part) => part.instanceId === instanceId
    ? {
        ...part,
        transform: {
          ...part.transform,
          rotation: [0, rotation, 0],
        },
      }
    : part)

  return { version: 'machine:v1', machine }
}

function machineTransformFromPart(part: BotPartSnapshot): MachinePartInstance['transform'] {
  return {
    position: [part.cell?.x ?? 0, 0, part.cell?.z ?? 0],
    rotation: [0, part.rotation ?? 0, 0],
    scale: [1, 1, 1],
  }
}

function machineTransformFromResolvedPose(pose: ResolvedMountPose): MachinePartInstance['transform'] {
  return {
    position: [...pose.position],
    rotation: [0, pose.parameters.yawDegrees, pose.parameters.rollDegrees],
    scale: [1, 1, 1],
    orientation: cloneOrientationBasis(pose.orientation),
  }
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
