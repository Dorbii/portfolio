import type {
  BlueprintBlock,
  CompactStorePart,
  MachineDesign,
  MachinePartInstance,
  PartDefinition,
} from '../../../../packages/schemas/src/index.js'
import { canonicalPartIdFromCompact } from '../../../../packages/sim/src/compactPartAliases.js'
import { formatCatalogLabel } from '../../../../packages/catalog/src/index.js'
import type { ConfirmedLoadoutView, RolePrivateState } from './agentSessionTypes.js'

export type DrawerTab = 'equipped' | 'store' | 'tree'
export type CategoryKey = 'structure' | 'weapon' | 'defense' | 'mobility' | 'utility' | 'style' | 'other'
export type PartReadoutTone = 'neutral' | 'ok' | 'warning'

export type LoadoutPartReadout = {
  category: string
  detail: string
  instanceId: string
  name: string
  parentId?: string
  source: string
  stats: string
  status: string
  tone: PartReadoutTone
}

export type CatalogPartReadout = {
  category: string
  detail: string
  id: string
  name: string
  quantity?: number
  status: string
}

export type CategorySummary = {
  count: number
  key: CategoryKey
  label: string
}

export type BuildSnapshot = {
  armor: string
  categories: CategorySummary[]
  dominant?: CategorySummary
  foundationCount: number
  hp: string
  limit: number
  mapParts: LoadoutPartReadout[]
  mass: string
  purchased: number
  remaining?: number
  rows: number
  storeActive: boolean
  storeOffers: number
  utility: string
  weapons: string
}

const LOADOUT_PART_LIMIT = 64
const CATEGORY_ORDER: Array<{ key: CategoryKey; label: string }> = [
  { key: 'structure', label: 'Structure' },
  { key: 'weapon', label: 'Weapon' },
  { key: 'defense', label: 'Defense' },
  { key: 'mobility', label: 'Mobility' },
  { key: 'utility', label: 'Utility' },
  { key: 'style', label: 'Style' },
  { key: 'other', label: 'Other' },
]

export function createBuildSnapshot(
  state: RolePrivateState | null,
  parts: LoadoutPartReadout[],
  storeOffers: CatalogPartReadout[],
  foundationParts: CatalogPartReadout[],
): BuildSnapshot {
  const compactBuild = state?.gameMaster?.build
  const compactSummary = compactBuild?.bot.summary
  const remaining = readFiniteNumber(
    compactBuild?.budget.parts ?? state?.gameMaster?.resources?.partLimitRemaining,
  )
  const rowPurchased = parts.filter((part) => part.source !== 'System' && part.status !== 'Core').length
  const purchased = typeof remaining === 'number'
    ? Math.max(0, LOADOUT_PART_LIMIT - remaining)
    : rowPurchased
  const categories = createCategorySummary(parts)
  const dominant = categories
    .filter((category) => category.count > 0)
    .sort((left, right) => right.count - left.count)[0]
  const roundOfferCount = compactBuild?.store?.offers.length ?? storeOffers.length
  const foundationCount = compactBuild?.store?.foundation.length ?? foundationParts.length

  return {
    armor: compactSummary ? String(compactSummary.armor) : '—',
    categories,
    dominant,
    foundationCount,
    hp: compactSummary ? `${compactSummary.hp}/${compactSummary.maxHp}` : '—',
    limit: LOADOUT_PART_LIMIT,
    mapParts: parts.filter((part) => part.source !== 'System' && part.status !== 'Core'),
    mass: compactSummary ? formatPartMass(compactSummary.mass) : '—',
    purchased,
    remaining,
    rows: compactBuild?.bot.parts.length ?? parts.length,
    storeActive: roundOfferCount > 0 || foundationCount > 0,
    storeOffers: roundOfferCount,
    utility: compactSummary ? String(compactSummary.utility.length) : '—',
    weapons: compactSummary ? String(compactSummary.weapons.length) : '—',
  }
}

export function createCategorySummary(parts: LoadoutPartReadout[]): CategorySummary[] {
  const counts = new Map<CategoryKey, number>(CATEGORY_ORDER.map((category) => [category.key, 0]))

  for (const part of parts) {
    if (part.source === 'System' || part.status === 'Core') {
      continue
    }

    const key = normalizeCategory(part.category)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return CATEGORY_ORDER.map((category) => ({
    ...category,
    count: counts.get(category.key) ?? 0,
  }))
}

export function normalizeCategory(category: string): CategoryKey {
  const normalized = category.toLowerCase()
  if (normalized.includes('core') || normalized.includes('body') || normalized.includes('structure')) return 'structure'
  if (normalized.includes('weapon')) return 'weapon'
  if (normalized.includes('defense') || normalized.includes('armor')) return 'defense'
  if (normalized.includes('mobility')) return 'mobility'
  if (normalized.includes('utility')) return 'utility'
  if (normalized.includes('style')) return 'style'
  return 'other'
}

export function createCatalogLookup(state: RolePrivateState | null): Map<string, PartDefinition> {
  const parts = state?.gameMaster?.catalog?.parts
  return Array.isArray(parts)
    ? new Map(parts.filter(isPartDefinition).map((part) => [part.id, part]))
    : new Map()
}

export function createLoadoutPartReadouts(
  state: RolePrivateState | null,
  loadout: ConfirmedLoadoutView | null,
  catalogById: Map<string, PartDefinition>,
): LoadoutPartReadout[] {
  const currentMachine = state?.gameMaster?.buildState?.currentDesign.version === 'machine:v1'
    ? state.gameMaster.buildState.currentDesign.machine
    : undefined
  const machine = loadout?.machineDesign ?? currentMachine

  if (machine) {
    return machine.parts.map((part) => machinePartReadout(part, machine, state, catalogById))
  }

  return (loadout?.blueprint.blocks ?? []).map((block) => blueprintBlockReadout(block, state, catalogById))
}

export function createStoreOfferReadouts(
  state: RolePrivateState | null,
  catalogById: Map<string, PartDefinition>,
): CatalogPartReadout[] {
  const compactOffers = state?.gameMaster?.build?.store?.offers
  if (compactOffers) {
    return compactOffers.map((offer, index) =>
      compactStorePartReadout(offer, `offer.${index}`, 'Offer', catalogById))
  }

  return (state?.gameMaster?.store?.slots ?? []).map((slot) =>
    catalogPartReadout({ catalogById, id: slot.id, partId: slot.partId, status: formatCatalogLabel(slot.kind) }))
}

export function createFoundationPartReadouts(
  state: RolePrivateState | null,
  catalogById: Map<string, PartDefinition>,
): CatalogPartReadout[] {
  const compactFoundation = state?.gameMaster?.build?.store?.foundation
  if (compactFoundation) {
    return compactFoundation.map((part, index) =>
      compactStorePartReadout(part, `foundation.${index}`, 'Foundation', catalogById))
  }

  return (state?.gameMaster?.store?.foundationPartIds ?? []).map((partId) =>
    catalogPartReadout({ catalogById, id: `foundation.${partId}`, partId, status: 'Foundation' }))
}

export function createInventoryPartReadouts(
  state: RolePrivateState | null,
  catalogById: Map<string, PartDefinition>,
): CatalogPartReadout[] {
  return (state?.inventory ?? [])
    .filter((item) => item.quantity > 0)
    .map((item) => catalogPartReadout({
      catalogById,
      id: `inventory.${item.partId}`,
      partId: item.partId,
      quantity: item.quantity,
      status: 'Owned',
    }))
}

function compactStorePartReadout(
  storePart: CompactStorePart,
  id: string,
  status: string,
  catalogById: Map<string, PartDefinition>,
): CatalogPartReadout {
  return catalogPartReadout({
    catalogById,
    id,
    partId: canonicalPartIdFromCompact(storePart.part),
    status,
  })
}

function catalogPartReadout({
  catalogById,
  id,
  partId,
  quantity,
  status,
}: {
  catalogById: Map<string, PartDefinition>
  id: string
  partId: string
  quantity?: number
  status: string
}): CatalogPartReadout {
  const definition = catalogById.get(partId)
  return {
    category: definition ? formatCatalogLabel(definition.category) : formatCatalogLabel(status),
    detail: formatPartDetail(definition, undefined),
    id,
    name: definition?.displayName ?? formatCatalogLabel(partId),
    ...(quantity ? { quantity } : {}),
    status,
  }
}

function machinePartReadout(
  part: MachinePartInstance,
  machine: MachineDesign,
  state: RolePrivateState | null,
  catalogById: Map<string, PartDefinition>,
): LoadoutPartReadout {
  const partId = catalogPartIdFromDefinition(part.definitionId)
  const definition = partId ? catalogById.get(partId) : undefined
  const health = machine.runtime?.healthByInstanceId[part.instanceId] ?? state?.combat?.self.partHealth[part.instanceId]
  const status = formatPartStatus(
    part,
    health,
    Boolean(machine.runtime?.detachedInstanceIds?.includes(part.instanceId)),
    Boolean(machine.runtime?.disabledInstanceIds?.includes(part.instanceId)),
  )
  const parentId = machine.attachments.find((attachment) => attachment.childInstanceId === part.instanceId)?.parentInstanceId

  return {
    category: definition ? formatCatalogLabel(definition.category) : part.source === 'system_core' ? 'Core' : 'Unknown',
    detail: formatPartDetail(definition, health),
    instanceId: part.instanceId,
    name: definition?.displayName ?? (part.source === 'system_core' ? 'Machine Core' : formatCatalogLabel(part.definitionId)),
    ...(parentId ? { parentId } : {}),
    source: part.source === 'system_core' ? 'System' : 'Catalog',
    stats: formatPartStats(definition),
    status: status.label,
    tone: status.tone,
  }
}

function blueprintBlockReadout(
  block: BlueprintBlock,
  state: RolePrivateState | null,
  catalogById: Map<string, PartDefinition>,
): LoadoutPartReadout {
  const definition = catalogById.get(block.partId)
  const health = state?.combat?.self.partHealth[block.id]
  const status = formatPartStatus({ source: 'catalog_part' }, health, false, false)
  return {
    category: definition ? formatCatalogLabel(definition.category) : 'Unknown',
    detail: formatPartDetail(definition, health),
    instanceId: block.id,
    name: definition?.displayName ?? formatCatalogLabel(block.partId),
    ...(block.parentInstanceId ? { parentId: block.parentInstanceId } : {}),
    source: 'Blueprint',
    stats: formatPartStats(definition),
    status: status.label,
    tone: status.tone,
  }
}

function formatPartDetail(definition: PartDefinition | undefined, health: number | undefined): string {
  const details = [
    definition ? `${definition.cost}g` : '',
    definition ? `${formatPartMass(definition.mass)} mass` : '',
    definition ? `${definition.durability} durability` : '',
    typeof health === 'number' ? `${Math.max(0, Math.round(health))} health` : '',
  ].filter(Boolean)
  return details.length > 0 ? details.join(' / ') : 'No catalog detail available'
}

function formatPartStats(definition: PartDefinition | undefined): string {
  if (!definition) return 'Stats unavailable'
  const stats = Object.entries(definition.stats)
    .filter((entry): entry is [string, number] => typeof entry[1] === 'number' && entry[1] !== 0)
    .slice(0, 4)
    .map(([key, value]) => `${formatCatalogLabel(key)} ${value}`)
  return stats.length > 0 ? stats.join(' / ') : formatCatalogLabel(definition.spec.kind)
}

function formatPartStatus(
  part: Pick<MachinePartInstance, 'source'>,
  health: number | undefined,
  detached: boolean,
  disabled: boolean,
): { label: string; tone: PartReadoutTone } {
  if (detached) return { label: 'Detached', tone: 'warning' }
  if (disabled) return { label: 'Disabled', tone: 'warning' }
  if (typeof health === 'number' && health <= 0) return { label: 'Destroyed', tone: 'warning' }
  return part.source === 'system_core'
    ? { label: 'Core', tone: 'neutral' }
    : { label: 'Installed', tone: 'ok' }
}

function readFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function catalogPartIdFromDefinition(definitionId: string): string | undefined {
  const prefix = 'catalog:'
  return definitionId.startsWith(prefix) ? definitionId.slice(prefix.length) : undefined
}

function formatPartMass(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)))
}

function isPartDefinition(value: unknown): value is PartDefinition {
  return Boolean(
    value &&
    typeof value === 'object' &&
    typeof (value as PartDefinition).id === 'string' &&
    typeof (value as PartDefinition).displayName === 'string',
  )
}
