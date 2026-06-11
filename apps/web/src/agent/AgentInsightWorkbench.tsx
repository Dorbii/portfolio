import type {
  BlueprintBlock,
  CompactStorePart,
  MachineDesign,
  MachinePartInstance,
  PartDefinition,
  TeamRole,
} from '../../../../packages/schemas/src/index.js'
import { canonicalPartIdFromCompact } from '../../../../packages/sim/src/compactPartAliases.js'
import { formatCatalogLabel } from '../../../../packages/catalog/src/index.js'
import type {
  ConfirmedLoadoutView,
  RolePrivateState,
} from './agentSessionTypes.js'
import { formatLabel } from '../shared/format'
import { BotAssemblyScene } from './BotAssemblyScene'
import { resolveTeamIdentity } from '../shared/teamVisuals'
import {
  PlanMetric,
  SectionTitle,
} from './AgentCockpitPanels'

type AgentInsightWorkbenchProps = {
  role: TeamRole
  roleState: RolePrivateState | null
}

export function AgentInsightWorkbench({
  role,
  roleState,
}: AgentInsightWorkbenchProps) {
  const loadout = roleState?.ownLoadout ?? null
  const blueprint = loadout?.blueprint ?? null
  const legalActions = roleState?.gameMaster?.legalActions ?? []
  const combatPacket = roleState?.gameMaster?.combat
  const combatBoard = roleState?.gameMaster?.board
  const catalogById = createCatalogLookup(roleState)
  const loadoutParts = createLoadoutPartReadouts(roleState, loadout, catalogById)
  const storeOffers = createStoreOfferReadouts(roleState, catalogById)
  const foundationOffers = createFoundationPartReadouts(roleState, catalogById)
  const inventoryParts = createInventoryPartReadouts(roleState, catalogById)
  const hasBlueprint = Boolean(blueprint && blueprint.blocks.length > 0)
  const submissionLabel = roleState?.submitted ? 'Accepted' : 'Pending'
  const teamIdentity = roleState ? resolveTeamIdentity(role, roleState.identity) : null

  return (
    <section className="agent-live-panel cockpit-workbench agent-insight-workbench" aria-labelledby="agent-insight-heading">
      <div className="workbench-header">
        <div>
          <SectionTitle id="agent-insight-heading" title="Agent insight" />
          <strong>{createInsightSubtitle(roleState, loadout, teamIdentity)}</strong>
        </div>
        <span className={`assembly-state${roleState?.submitted ? '' : ' is-draft'}`}>
          {submissionLabel}
        </span>
      </div>

      <div className="plan-metric-strip" aria-label="Agent state summary">
        <PlanMetric label="Phase" value={formatLabel(roleState?.phase ?? 'not_loaded')} />
        <PlanMetric label="Loadout" tone={roleState?.submitted ? 'ok' : undefined} value={submissionLabel} />
        <PlanMetric label="Blueprint" value={blueprint ? `${blueprint.blocks.length} blocks` : 'No blueprint'} />
        <PlanMetric
          label={combatPacket ? 'Combat plan' : roleState?.phase === 'combat_turn' ? 'Board actions' : 'Actions'}
          tone={combatPacket && !combatPacket.submitted ? 'ok' : legalActions.length > 0 ? 'ok' : undefined}
          value={combatPacket ? formatCombatPlanMetric(combatPacket, combatBoard) : formatActionMetric(legalActions.length)}
        />
      </div>

      {!roleState ? (
        <NoRoleStatePanel />
      ) : null}

      {roleState && teamIdentity && loadout && hasBlueprint && blueprint ? (
        <section className="assembly-bay-panel" aria-labelledby="assembly-bay-heading">
          <div className="plan-section-header">
            <SectionTitle id="assembly-bay-heading" title="Assembly bay" />
            <div className="assembly-preview-meta">
              <span className="assembly-state">Confirmed bot</span>
              <strong>{blueprint.name}</strong>
              <span>{loadout.machineDesign ? 'Machine-authority loadout from role state' : 'Legacy loadout from role state'}</span>
            </div>
          </div>
          <BotAssemblyScene
            blueprint={blueprint}
            identity={teamIdentity}
            machineDesign={loadout.machineDesign}
            role={role}
            submitted
          />
        </section>
      ) : null}

      {roleState ? (
      <div className="insight-grid">
        <section className="plan-section insight-panel loadout-insight-panel" aria-labelledby="plan-read-heading">
          <SectionTitle id="plan-read-heading" title="Loadout read" />
          {loadout ? (
            <>
              <div className="insight-readout-grid">
                <ReadoutCard
                  label="Bot"
                  value={loadout.blueprint.name}
                  detail={`${loadout.blueprint.blocks.length} installed blocks`}
                />
                <ReadoutCard
                  label="Movement"
                  value={formatOptionalLabel(roleState.controls?.movement[0])}
                  detail={`${roleState.controls?.movement.length ?? 0} movement action choices`}
                />
                <ReadoutCard
                  label="Weapons"
                  value={formatWeaponSummary(roleState)}
                  detail={formatUtilitySummary(roleState)}
                />
              </div>
              <div className="loadout-workbench-grid">
                <LoadoutPartList parts={loadoutParts} />
                <LoadoutStorePanel
                  confirmedAt={loadout.confirmedAt}
                  foundationParts={foundationOffers}
                  inventoryParts={inventoryParts}
                  storeOffers={storeOffers}
                />
              </div>
            </>
          ) : (
            <>
              <p className="agent-empty">
                No confirmed loadout is available yet. That means this agent has not committed a bot for this round.
              </p>
              <div className="loadout-workbench-grid">
                {loadoutParts.length > 0 ? <LoadoutPartList parts={loadoutParts} /> : null}
                <LoadoutStorePanel
                  foundationParts={foundationOffers}
                  inventoryParts={inventoryParts}
                  storeOffers={storeOffers}
                />
              </div>
            </>
          )}
        </section>
      </div>
      ) : null}
    </section>
  )
}

function ReadoutCard({
  detail,
  label,
  value,
}: {
  detail: string
  label: string
  value: string
}) {
  return (
    <div className="insight-readout-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  )
}

type LoadoutPartReadout = {
  category: string
  detail: string
  instanceId: string
  name: string
  source: string
  stats: string
  status: string
  tone: 'neutral' | 'ok' | 'warning'
}

type CatalogPartReadout = {
  category: string
  detail: string
  id: string
  name: string
  quantity?: number
  status: string
}

function LoadoutPartList({ parts }: { parts: LoadoutPartReadout[] }) {
  return (
    <div className="loadout-parts-block">
      <strong>Equipped loadout</strong>
      {parts.length > 0 ? (
        <ul className="loadout-part-list">
          {parts.map((part) => (
            <li className={`loadout-part-card tone-${part.tone}`} key={part.instanceId}>
              <div className="loadout-part-main">
                <span>{part.category}</span>
                <strong>{part.name}</strong>
                <small>{part.instanceId}</small>
              </div>
              <div className="loadout-part-side">
                <span>{part.status}</span>
                <small>{part.source}</small>
              </div>
              <p>{part.detail}</p>
              <small className="loadout-part-stats">{part.stats}</small>
            </li>
          ))}
        </ul>
      ) : (
        <p className="agent-empty">No individual parts are available from role state.</p>
      )}
    </div>
  )
}

function LoadoutStorePanel({
  confirmedAt,
  foundationParts,
  inventoryParts,
  storeOffers,
}: {
  confirmedAt?: string
  foundationParts: CatalogPartReadout[]
  inventoryParts: CatalogPartReadout[]
  storeOffers: CatalogPartReadout[]
}) {
  return (
    <div className="loadout-store-panel">
      <div className="loadout-status-card">
        <span>Loadout status</span>
        <strong>{confirmedAt ? 'Confirmed' : 'Building'}</strong>
        <small>{confirmedAt ?? 'No confirmation timestamp yet'}</small>
      </div>
      <CatalogPartList
        emptyText="No active store packet is loaded for this role state."
        parts={storeOffers}
        title="Store offers"
      />
      {foundationParts.length > 0 ? (
        <CatalogPartList
          emptyText="No always-available store parts are loaded."
          parts={foundationParts}
          title="Always available"
        />
      ) : null}
      <CatalogPartList
        emptyText="No owned catalog parts are in inventory."
        parts={inventoryParts}
        title="Owned parts"
      />
    </div>
  )
}

function CatalogPartList({
  emptyText,
  parts,
  title,
}: {
  emptyText: string
  parts: CatalogPartReadout[]
  title: string
}) {
  return (
    <div className="catalog-part-block">
      <strong>{title}</strong>
      {parts.length > 0 ? (
        <ul className="catalog-part-list">
          {parts.map((part) => (
            <li key={part.id}>
              <div>
                <span>{part.category}</span>
                <strong>{part.name}</strong>
                <small>{part.detail}</small>
              </div>
              <em>{part.quantity ? `x${part.quantity}` : part.status}</em>
            </li>
          ))}
        </ul>
      ) : (
        <p className="agent-empty">{emptyText}</p>
      )}
    </div>
  )
}

function createInsightSubtitle(
  roleState: RolePrivateState | null,
  loadout: ConfirmedLoadoutView | null,
  identity: ReturnType<typeof resolveTeamIdentity> | null,
): string {
  if (!roleState) {
    return 'Load role state to inspect the agent.'
  }

  if (loadout) {
    return `${identity?.name ?? 'This role'} confirmed ${loadout.blueprint.name}.`
  }

  return `${identity?.name ?? 'This role'} has not confirmed a loadout.`
}

function NoRoleStatePanel() {
  return (
    <section className="insight-empty-state" aria-labelledby="empty-state-heading">
      <SectionTitle id="empty-state-heading" title="State not loaded" />
      <p>
        The cockpit has no private role state yet. Refresh with a valid observer or agent key; once state loads, this panel shows the confirmed loadout, store, and owned parts.
      </p>
    </section>
  )
}

function formatOptionalLabel(value: string | undefined): string {
  return value ? formatLabel(value) : 'Not set'
}

function formatWeaponSummary(state: RolePrivateState): string {
  const slots = [
    state.controls?.weaponA ? 'Weapon A' : '',
    state.controls?.weaponB ? 'Weapon B' : '',
  ].filter(Boolean)

  return slots.length > 0 ? slots.join(' / ') : 'No weapon command'
}

function formatUtilitySummary(state: RolePrivateState): string {
  return state.controls?.utility ? 'Utility command available' : 'No utility command'
}

function formatActionMetric(legalActionCount: number): string {
  return legalActionCount > 0 ? `${legalActionCount} legal` : 'No actions'
}

function formatCombatPlanMetric(
  combat: NonNullable<RolePrivateState['gameMaster']>['combat'],
  board: NonNullable<RolePrivateState['gameMaster']>['board'] | undefined,
): string {
  if (!combat) {
    return 'No combat packet'
  }

  if (combat.submitted) {
    return 'Plan submitted'
  }

  return `${combat.budget.movement} move / ${combat.budget.actionTime} time / ${board?.reachableCells?.length ?? 0} cells`
}

function createCatalogLookup(state: RolePrivateState | null): Map<string, PartDefinition> {
  const parts = state?.gameMaster?.catalog?.parts

  if (!Array.isArray(parts)) {
    return new Map()
  }

  return new Map(parts.filter(isPartDefinition).map((part) => [part.id, part]))
}

function createLoadoutPartReadouts(
  state: RolePrivateState | null,
  loadout: ConfirmedLoadoutView | null,
  catalogById: Map<string, PartDefinition>,
): LoadoutPartReadout[] {
  const buildState = state?.gameMaster?.buildState
  const currentMachine = buildState?.currentDesign.version === 'machine:v1'
    ? buildState.currentDesign.machine
    : undefined
  const machine = loadout?.machineDesign ?? currentMachine

  if (machine) {
    return machine.parts.map((part) => machinePartReadout(part, machine, state, catalogById))
  }

  return (loadout?.blueprint.blocks ?? []).map((block) => blueprintBlockReadout(block, state, catalogById))
}

function createStoreOfferReadouts(
  state: RolePrivateState | null,
  catalogById: Map<string, PartDefinition>,
): CatalogPartReadout[] {
  // Compact build packet is the primary protocol surface; legacy store slots
  // remain a migration fallback only.
  const compactOffers = state?.gameMaster?.build?.store?.offers

  if (compactOffers) {
    return compactOffers.map((offer, index) =>
      compactStorePartReadout(offer, `offer.${index}`, 'Offer', catalogById))
  }

  return (state?.gameMaster?.store?.slots ?? []).map((slot) =>
    catalogPartReadout({
      catalogById,
      id: slot.id,
      partId: slot.partId,
      status: formatCatalogLabel(slot.kind),
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

function createFoundationPartReadouts(
  state: RolePrivateState | null,
  catalogById: Map<string, PartDefinition>,
): CatalogPartReadout[] {
  const compactFoundation = state?.gameMaster?.build?.store?.foundation

  if (compactFoundation) {
    return compactFoundation.map((part, index) =>
      compactStorePartReadout(part, `foundation.${index}`, 'Foundation', catalogById))
  }

  return (state?.gameMaster?.store?.foundationPartIds ?? []).map((partId) =>
    catalogPartReadout({
      catalogById,
      id: `foundation.${partId}`,
      partId,
      status: 'Foundation',
    }))
}

function createInventoryPartReadouts(
  state: RolePrivateState | null,
  catalogById: Map<string, PartDefinition>,
): CatalogPartReadout[] {
  return (state?.inventory ?? [])
    .filter((item) => item.quantity > 0)
    .map((item) =>
      catalogPartReadout({
        catalogById,
        id: `inventory.${item.partId}`,
        partId: item.partId,
        quantity: item.quantity,
        status: 'Owned',
      }))
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
  const detached = machine.runtime?.detachedInstanceIds?.includes(part.instanceId)
  const disabled = machine.runtime?.disabledInstanceIds?.includes(part.instanceId)
  const status = formatPartStatus(part, health, Boolean(detached), Boolean(disabled))

  return {
    category: definition ? formatCatalogLabel(definition.category) : part.source === 'system_core' ? 'Core' : 'Unknown',
    detail: formatPartDetail(definition, health),
    instanceId: part.instanceId,
    name: definition?.displayName ?? (part.source === 'system_core' ? 'Machine Core' : formatCatalogLabel(part.definitionId)),
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
  if (!definition) {
    return 'Stats unavailable'
  }

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
): { label: string; tone: LoadoutPartReadout['tone'] } {
  if (detached) {
    return { label: 'Detached', tone: 'warning' }
  }

  if (disabled) {
    return { label: 'Disabled', tone: 'warning' }
  }

  if (typeof health === 'number' && health <= 0) {
    return { label: 'Destroyed', tone: 'warning' }
  }

  return part.source === 'system_core'
    ? { label: 'Core', tone: 'neutral' }
    : { label: 'Installed', tone: 'ok' }
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
