import { useState, type KeyboardEvent } from 'react'
import type {
  BlueprintBlock,
  CompactBotSummary,
  CompactBuildPartRow,
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

const OBSERVED_PART_LIMIT_FALLBACK = 64
const SNAPSHOT_CATEGORY_ORDER = [
  'structure',
  'weapon',
  'defense',
  'mobility',
  'utility',
  'style',
  'other',
] as const

type SnapshotCategory = (typeof SNAPSHOT_CATEGORY_ORDER)[number]
type WorkbenchDetailTab = 'equipped' | 'store'

type AgentInsightWorkbenchProps = {
  role: TeamRole
  roleState: RolePrivateState | null
}

export function AgentInsightWorkbench({
  role,
  roleState,
}: AgentInsightWorkbenchProps) {
  const [activeDetailTab, setActiveDetailTab] = useState<WorkbenchDetailTab>('equipped')
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
  const buildSnapshot = createBuildSnapshot({
    foundationParts: foundationOffers,
    loadoutParts,
    roleState,
    storeOffers,
  })

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
        <PlanMetric
          label="Store"
          tone={buildSnapshot.storeOfferCount > 0 || buildSnapshot.foundationCount > 0 ? 'ok' : undefined}
          value={formatStoreMetric(buildSnapshot)}
        />
      </div>

      {!roleState ? (
        <NoRoleStatePanel />
      ) : null}

      {roleState ? (
        <div className="observer-cockpit-grid">
          {teamIdentity && loadout && hasBlueprint && blueprint ? (
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
          ) : (
            <AssemblyBayPlaceholder />
          )}
          <BuildSnapshotPanel snapshot={buildSnapshot} />
        </div>
      ) : null}

      {roleState ? (
        <WorkbenchDetailDrawer
          activeTab={activeDetailTab}
          foundationParts={foundationOffers}
          inventoryParts={inventoryParts}
          loadoutParts={loadoutParts}
          onTabChange={setActiveDetailTab}
          snapshot={buildSnapshot}
          storeOffers={storeOffers}
        />
      ) : null}
    </section>
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

type SnapshotCategoryReadout = {
  count: number
  key: SnapshotCategory
  label: string
  percent: number
}

type SnapshotPartDot = {
  category: SnapshotCategory
  id: string
}

type BuildSnapshotReadout = {
  cap: number
  categories: SnapshotCategoryReadout[]
  foundationCount: number
  partDots: SnapshotPartDot[]
  purchased: number
  remaining: number | null
  rows: number
  storeOfferCount: number
  summary?: CompactBotSummary
}

type BuildSnapshotInput = {
  foundationParts: CatalogPartReadout[]
  loadoutParts: LoadoutPartReadout[]
  roleState: RolePrivateState | null
  storeOffers: CatalogPartReadout[]
}

function AssemblyBayPlaceholder() {
  return (
    <section className="assembly-bay-panel assembly-bay-placeholder" aria-labelledby="assembly-placeholder-heading">
      <div className="plan-section-header">
        <SectionTitle id="assembly-placeholder-heading" title="Assembly bay" />
        <span className="assembly-state is-draft">Waiting</span>
      </div>
      <p className="assembly-empty">
        No confirmed loadout is available yet. Once the agent commits a bot, the assembly render stays here while the drawer carries equipped parts and store details.
      </p>
    </section>
  )
}

function BuildSnapshotPanel({ snapshot }: { snapshot: BuildSnapshotReadout }) {
  return (
    <aside className="build-snapshot-panel" aria-labelledby="build-snapshot-heading">
      <div className="snapshot-header">
        <div>
          <SectionTitle id="build-snapshot-heading" title="Build snapshot" />
          <p>Summary first. Store and row details live in the drawer.</p>
        </div>
        <span className="snapshot-chip">{snapshot.storeOfferCount > 0 ? 'Store active' : 'Store idle'}</span>
      </div>

      <div className="snapshot-stat-grid" aria-label="Build counts">
        <SnapshotStat
          detail={snapshot.remaining === null ? 'observed cap' : `${snapshot.remaining} open`}
          label="Purchased"
          value={`${snapshot.purchased}/${snapshot.cap}`}
        />
        <SnapshotStat label="Rows" value={String(snapshot.rows)} detail="including core" />
        <SnapshotStat label="Offers" value={String(snapshot.storeOfferCount)} detail="round store" />
      </div>

      <CategoryComposition categories={snapshot.categories} />
      <PartDensityMap cap={snapshot.cap} dots={snapshot.partDots} purchased={snapshot.purchased} />
      <SnapshotCapabilitySummary snapshot={snapshot} />
    </aside>
  )
}

function SnapshotStat({
  detail,
  label,
  value,
}: {
  detail?: string
  label: string
  value: string
}) {
  return (
    <div className="snapshot-stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </div>
  )
}

function CategoryComposition({ categories }: { categories: SnapshotCategoryReadout[] }) {
  if (categories.length === 0) {
    return (
      <section className="snapshot-category-block" aria-labelledby="snapshot-category-heading">
        <h3 id="snapshot-category-heading">Category composition</h3>
        <p className="agent-empty">No installed part categories are available.</p>
      </section>
    )
  }

  return (
    <section className="snapshot-category-block" aria-labelledby="snapshot-category-heading">
      <h3 id="snapshot-category-heading">Category composition</h3>
      <div className="snapshot-category-bar" aria-hidden="true">
        {categories.map((category) => (
          <span
            className={`snapshot-category-segment category-${category.key}`}
            key={category.key}
            style={{ width: `${category.percent}%` }}
          />
        ))}
      </div>
      <dl className="snapshot-category-legend">
        {categories.map((category) => (
          <div key={category.key}>
            <dt>{category.label}</dt>
            <dd>{category.count}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function PartDensityMap({
  cap,
  dots,
  purchased,
}: {
  cap: number
  dots: SnapshotPartDot[]
  purchased: number
}) {
  const cells = Array.from({ length: cap }, (_, index) => dots[index])

  return (
    <section className="snapshot-map-block" aria-labelledby="snapshot-map-heading">
      <div className="snapshot-section-heading">
        <h3 id="snapshot-map-heading">{cap}-part map</h3>
        <span>{purchased}/{cap}</span>
      </div>
      <div className="snapshot-part-map" aria-label={`${purchased} purchased parts installed out of ${cap}`}>
        {cells.map((cell, index) => (
          <span
            aria-hidden="true"
            className={`snapshot-map-cell${cell ? ` category-${cell.category}` : ''}`}
            key={cell?.id ?? `empty.${index}`}
          />
        ))}
      </div>
    </section>
  )
}

function SnapshotCapabilitySummary({ snapshot }: { snapshot: BuildSnapshotReadout }) {
  const summary = snapshot.summary
  const hp = summary ? `${summary.hp}/${summary.maxHp}` : 'Unavailable'
  const movement = formatMovementSummary(summary)
  const weapons = summary ? String(summary.weapons.length) : 'Unavailable'
  const utility = summary ? String(summary.utility.length) : 'Unavailable'

  return (
    <section className="snapshot-capability-block" aria-labelledby="snapshot-capability-heading">
      <h3 id="snapshot-capability-heading">Capability read</h3>
      <dl>
        <div>
          <dt>HP</dt>
          <dd>{hp}</dd>
        </div>
        <div>
          <dt>Mass</dt>
          <dd>{summary ? formatPartMass(summary.mass) : 'Unavailable'}</dd>
        </div>
        <div>
          <dt>Movement</dt>
          <dd>{movement}</dd>
        </div>
        <div>
          <dt>Weapons</dt>
          <dd>{weapons}</dd>
        </div>
        <div>
          <dt>Utility</dt>
          <dd>{utility}</dd>
        </div>
      </dl>
    </section>
  )
}

function WorkbenchDetailDrawer({
  activeTab,
  foundationParts,
  inventoryParts,
  loadoutParts,
  onTabChange,
  snapshot,
  storeOffers,
}: {
  activeTab: WorkbenchDetailTab
  foundationParts: CatalogPartReadout[]
  inventoryParts: CatalogPartReadout[]
  loadoutParts: LoadoutPartReadout[]
  onTabChange: (tab: WorkbenchDetailTab) => void
  snapshot: BuildSnapshotReadout
  storeOffers: CatalogPartReadout[]
}) {
  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, tab: WorkbenchDetailTab) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return
    }

    event.preventDefault()
    onTabChange(tab === 'equipped' ? 'store' : 'equipped')
  }

  return (
    <section className="plan-section loadout-detail-drawer" aria-labelledby="loadout-detail-heading">
      <div className="drawer-header">
        <div>
          <SectionTitle id="loadout-detail-heading" title="Build details" />
          <p>Equipped parts and the read-only store share one drawer.</p>
        </div>
        <div className="drawer-tabs" role="tablist" aria-label="Build detail views">
          <button
            aria-controls="equipped-parts-panel"
            aria-selected={activeTab === 'equipped'}
            className={`drawer-tab${activeTab === 'equipped' ? ' is-active' : ''}`}
            id="equipped-parts-tab"
            onClick={() => onTabChange('equipped')}
            onKeyDown={(event) => handleTabKeyDown(event, 'equipped')}
            role="tab"
            tabIndex={activeTab === 'equipped' ? 0 : -1}
            type="button"
          >
            Equipped parts <span>{snapshot.rows}</span>
          </button>
          <button
            aria-controls="store-packet-panel"
            aria-selected={activeTab === 'store'}
            className={`drawer-tab${activeTab === 'store' ? ' is-active' : ''}`}
            id="store-packet-tab"
            onClick={() => onTabChange('store')}
            onKeyDown={(event) => handleTabKeyDown(event, 'store')}
            role="tab"
            tabIndex={activeTab === 'store' ? 0 : -1}
            type="button"
          >
            Store <span>{foundationParts.length + storeOffers.length}</span>
          </button>
        </div>
      </div>

      {activeTab === 'equipped' ? (
        <div aria-labelledby="equipped-parts-tab" id="equipped-parts-panel" role="tabpanel">
          <LoadoutPartList parts={loadoutParts} />
        </div>
      ) : (
        <div aria-labelledby="store-packet-tab" id="store-packet-panel" role="tabpanel">
          <StoreReadoutTab
            equippedParts={loadoutParts}
            foundationParts={foundationParts}
            inventoryParts={inventoryParts}
            storeOffers={storeOffers}
          />
        </div>
      )}
    </section>
  )
}

function LoadoutPartList({ parts }: { parts: LoadoutPartReadout[] }) {
  return (
    <div className="loadout-parts-block">
      <div className="drawer-section-heading">
        <strong>Equipped parts</strong>
        <span>{parts.length} rows</span>
      </div>
      {parts.length > 0 ? (
        <ul className="loadout-part-list loadout-part-table">
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

function StoreReadoutTab({
  equippedParts,
  foundationParts,
  inventoryParts,
  storeOffers,
}: {
  equippedParts: LoadoutPartReadout[]
  foundationParts: CatalogPartReadout[]
  inventoryParts: CatalogPartReadout[]
  storeOffers: CatalogPartReadout[]
}) {
  return (
    <div className="store-readout-tab">
      <EquippedContextStrip parts={equippedParts} />
      <div className="store-readout-grid">
        <CatalogPartList
          emptyText="No always-available foundation templates are loaded."
          parts={foundationParts}
          title="Foundation templates"
        />
        <CatalogPartList
          emptyText="No active store packet is loaded for this role state."
          parts={storeOffers}
          title="Store offers"
        />
        <CatalogPartList
          emptyText="No owned catalog parts are in inventory."
          parts={inventoryParts}
          title="Owned parts"
        />
      </div>
    </div>
  )
}

function EquippedContextStrip({ parts }: { parts: LoadoutPartReadout[] }) {
  const highlights = equippedContextHighlights(parts)

  return (
    <div className="equipped-context-strip">
      <div>
        <strong>Current equipped context</strong>
        <span>{parts.length} rows installed</span>
      </div>
      {highlights.length > 0 ? (
        <ul>
          {highlights.map((part) => (
            <li key={part.instanceId}>
              <span>{part.category}</span>
              <strong>{part.name}</strong>
            </li>
          ))}
        </ul>
      ) : (
        <p>No installed context available.</p>
      )}
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
      <div className="drawer-section-heading">
        <strong>{title}</strong>
        <span>{parts.length}</span>
      </div>
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
  const canonicalPartId = canonicalPartIdFromCompact(storePart.part)

  return catalogPartReadout({
    catalogById,
    category: compactStorePartCategory(storePart),
    detail: formatCompactStorePartDetail(storePart),
    id,
    name: formatCatalogLabel(canonicalPartId),
    partId: canonicalPartId,
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
  category,
  detail,
  id,
  name,
  partId,
  quantity,
  status,
}: {
  catalogById: Map<string, PartDefinition>
  category?: string
  detail?: string
  id: string
  name?: string
  partId: string
  quantity?: number
  status: string
}): CatalogPartReadout {
  const definition = catalogById.get(partId)

  return {
    category: definition ? formatCatalogLabel(definition.category) : category ?? formatCatalogLabel(status),
    detail: detail ?? formatPartDetail(definition, undefined),
    id,
    name: definition?.displayName ?? name ?? formatCatalogLabel(partId),
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

function createBuildSnapshot({
  foundationParts,
  loadoutParts,
  roleState,
  storeOffers,
}: BuildSnapshotInput): BuildSnapshotReadout {
  const compactBuild = roleState?.gameMaster?.build
  const remaining = typeof compactBuild?.budget.parts === 'number'
    ? Math.max(0, Math.floor(compactBuild.budget.parts))
    : null
  const compactRows = compactBuild?.bot.parts
  const purchased = compactRows
    ? compactRows.filter((row) => !isCompactSystemPartRow(row)).length
    : loadoutParts.filter((part) => !isSystemPart(part)).length
  const cap = remaining === null
    ? Math.max(OBSERVED_PART_LIMIT_FALLBACK, purchased)
    : Math.max(purchased + remaining, purchased)
  const rows = compactRows?.length ?? loadoutParts.length
  const categories = compactRows
    ? compactCategoryComposition(compactRows)
    : categoryComposition(loadoutParts)
  const partDots = compactRows
    ? compactPartDots(compactRows, cap)
    : loadoutParts
      .filter((part) => !isSystemPart(part))
      .slice(0, cap)
      .map((part) => ({
        category: normalizeSnapshotCategory(part.category),
        id: part.instanceId,
      }))

  return {
    cap,
    categories,
    foundationCount: foundationParts.length,
    partDots,
    purchased,
    remaining,
    rows,
    storeOfferCount: storeOffers.length,
    summary: compactBuild?.bot.summary,
  }
}

function compactCategoryComposition(rows: CompactBuildPartRow[]): SnapshotCategoryReadout[] {
  const syntheticParts: LoadoutPartReadout[] = rows.map((row) => ({
    category: compactPartCategory(row[1]),
    detail: '',
    instanceId: row[0],
    name: row[1],
    source: isCompactSystemPartRow(row) ? 'System' : 'Catalog',
    stats: '',
    status: '',
    tone: 'neutral',
  }))

  return categoryComposition(syntheticParts)
}

function compactPartDots(rows: CompactBuildPartRow[], cap: number): SnapshotPartDot[] {
  return rows
    .filter((row) => !isCompactSystemPartRow(row))
    .slice(0, cap)
    .map((row) => ({
      category: normalizeSnapshotCategory(compactPartCategory(row[1])),
      id: row[0],
    }))
}

function categoryComposition(parts: LoadoutPartReadout[]): SnapshotCategoryReadout[] {
  const counts = new Map<SnapshotCategory, number>()

  for (const part of parts) {
    const key = normalizeSnapshotCategory(part.category)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const total = Math.max(1, Array.from(counts.values()).reduce((sum, count) => sum + count, 0))

  return SNAPSHOT_CATEGORY_ORDER
    .map((key) => ({
      count: counts.get(key) ?? 0,
      key,
      label: snapshotCategoryLabel(key),
      percent: ((counts.get(key) ?? 0) / total) * 100,
    }))
    .filter((category) => category.count > 0)
}

function normalizeSnapshotCategory(category: string): SnapshotCategory {
  const key = category.toLowerCase()

  if (key.includes('core') || key.includes('body') || key.includes('frame') || key.includes('structure')) {
    return 'structure'
  }

  if (key.includes('weapon')) {
    return 'weapon'
  }

  if (key.includes('defense') || key.includes('armor')) {
    return 'defense'
  }

  if (key.includes('mobility') || key.includes('wheel') || key.includes('tread')) {
    return 'mobility'
  }

  if (key.includes('utility')) {
    return 'utility'
  }

  if (key.includes('style')) {
    return 'style'
  }

  return 'other'
}

function snapshotCategoryLabel(category: SnapshotCategory): string {
  switch (category) {
    case 'structure':
      return 'Structure'
    case 'weapon':
      return 'Weapon'
    case 'defense':
      return 'Defense'
    case 'mobility':
      return 'Mobility'
    case 'utility':
      return 'Utility'
    case 'style':
      return 'Style'
    case 'other':
      return 'Other'
  }
}

function isSystemPart(part: LoadoutPartReadout): boolean {
  return part.source === 'System' || part.category.toLowerCase() === 'core'
}

function isCompactSystemPartRow(row: CompactBuildPartRow): boolean {
  return row[0] === 'core' || row[1].toLowerCase().includes('machine_core')
}

function compactPartCategory(partAlias: string): string {
  return partAlias.split('.')[0] ?? partAlias
}

function formatStoreMetric(snapshot: BuildSnapshotReadout): string {
  if (snapshot.storeOfferCount > 0) {
    return `${snapshot.storeOfferCount} offers`
  }

  if (snapshot.foundationCount > 0) {
    return `${snapshot.foundationCount} templates`
  }

  return 'No active store'
}

function formatMovementSummary(summary: CompactBotSummary | undefined): string {
  if (!summary) {
    return 'Unavailable'
  }

  const entries = Object.entries(summary.movement)
    .filter((entry): entry is [string, number] => typeof entry[1] === 'number')
    .map(([axis, value]) => `${axis.toUpperCase()} ${value}`)

  return entries.length > 0 ? entries.join(' / ') : 'None'
}

function equippedContextHighlights(parts: LoadoutPartReadout[]): LoadoutPartReadout[] {
  const wantedCategories: SnapshotCategory[] = ['structure', 'mobility', 'weapon', 'defense', 'utility']
  const picked = new Map<string, LoadoutPartReadout>()

  for (const category of wantedCategories) {
    const match = parts.find((part) => normalizeSnapshotCategory(part.category) === category)

    if (match) {
      picked.set(match.instanceId, match)
    }
  }

  for (const part of parts) {
    if (picked.size >= 6) {
      break
    }

    picked.set(part.instanceId, part)
  }

  return Array.from(picked.values())
}

function compactStorePartCategory(storePart: CompactStorePart): string {
  if (storePart.weapon) {
    return 'Weapon'
  }

  if (storePart.mobility) {
    return 'Mobility'
  }

  if (typeof storePart.armor === 'number') {
    return 'Defense'
  }

  if (storePart.utility) {
    return 'Utility'
  }

  if (typeof storePart.style === 'number') {
    return 'Style'
  }

  return formatCatalogLabel(storePart.part.split('.')[0] ?? 'part')
}

function formatCompactStorePartDetail(storePart: CompactStorePart): string {
  const details = [
    `${storePart.cost}g`,
    `${formatPartMass(storePart.mass)} mass`,
    `${storePart.hp} hp`,
  ]

  if (storePart.weapon) {
    details.push(`${storePart.weapon.damage} damage`, `${storePart.weapon.range} range`)
  }

  if (storePart.mobility) {
    details.push(`${storePart.mobility.moveBudget} move`)
  }

  if (typeof storePart.armor === 'number') {
    details.push(`${storePart.armor} armor`)
  }

  if (storePart.utility) {
    details.push(storePart.utility.effect)
  }

  if (typeof storePart.style === 'number') {
    details.push(`${storePart.style} style`)
  }

  return details.join(' / ')
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
